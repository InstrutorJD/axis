// Punho Lendário — jogo de luta do professor (professor/luta.html).
//
// Estilo Street Fighter: o lutador (Kaito) enfrenta ondas de inimigos em 3
// fases e, no fim da fase 3, o chefão (Imperador Vulcano). Lógica a 60
// passos por segundo com passo fixo. O mundo (cenários, lutadores, brilhos,
// partículas e câmera) é desenhado pelo Phaser em luta-visual.js (WebGL,
// sem imagens); o placar, os menus e os textos ficam num canvas 2D por cima
// (canvas 'hud'), desenhados aqui.
//
// Controles:
//   - celular como joystick (professor/joystick.html), pareado por QR Code:
//     canal de broadcast do Supabase Realtime 'luta_<sala>', sem tabela e
//     sem SQL. O celular manda 'j' ({ x, y } de -1 a 1), 'b' ({ b: 'soco' |
//     'chute' | 'esp' | 'pulo' | 'pausa' | 'risada' | 'carranca' |
//     'chamar' }) e 'ola'; o jogo responde
//     'estado' (vida, energia, fase) e 'vib' (vibrar quando apanha).
//   - teclado: setas/WASD, Z soco, X chute, C especial, espaço pulo,
//     Enter começa, P pausa, R reinicia, M som, F tela cheia,
//     Q/E/V provocações (risadinha, cara feia, "vem!").
//
// Modo X1 (um aluno contra o outro): melhor de 3 rounds de 99 s, Kaito
// (jogador 1, azul) contra Raiju (jogador 2, vermelho). Cada celular manda
// um id próprio; o 1º celular a falar vira o jogador 1 e o 2º, o jogador 2
// (no modo de 1 jogador, qualquer celular controla o Kaito). No teclado:
// jogador 1 = WASD + Z/X/C/espaço, jogador 2 = setas + K/L/Ç/0 (ou 1/2/3/0
// do teclado numérico). Provocações: J1 = Q/E/V, J2 = U/I/O (ou 7/8/9).
window.LutaJogo = (function () {
  'use strict';
  const W = 960, H = 540, CHAO = 478, GRAV = 0.75, RAD = Math.PI / 180;
  let hud, ctx, escala = 1, Visual = null;
  // Avisos para o desenho (luta-visual.js): acerto, defesa, queda, ko,
  // disparo, explosao, superInicio, superSolta, quebra, item, arremesso.
  let Fx = () => {};

  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hash = i => { const s = Math.sin(i * 12.9898) * 43758.5453; return s - Math.floor(s); };

  // ---------- Som (sintetizado, sem arquivos) ----------
  // O navegador só libera o áudio depois de um clique ou tecla NESTE
  // computador — comando que chega do celular não conta. Por isso iniciar()
  // destrava o som em qualquer clique/tecla (o botão "Jogar" do QR já serve)
  // e o HUD avisa enquanto ele estiver mudo.
  const Som = (function () {
    let ac = null, efeitos = null, eco = null, musVol = null, ligado = true, ruidoBuf = null;
    function a() {
      if (!ac) {
        try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
        const comp = ac.createDynamicsCompressor();
        comp.connect(ac.destination);
        const mestre = ac.createGain(); mestre.gain.value = 0.9; mestre.connect(comp);
        efeitos = ac.createGain(); efeitos.connect(mestre);
        musVol = ac.createGain(); musVol.gain.value = 0.55; musVol.connect(mestre);
        // Reverberação curta (ruído que decai): dá "corpo" de sala aos golpes.
        eco = ac.createConvolver();
        const n = Math.floor(ac.sampleRate * 0.9), ir = ac.createBuffer(2, n, ac.sampleRate);
        for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); }
        eco.buffer = ir;
        const ecoVol = ac.createGain(); ecoVol.gain.value = 0.22;
        eco.connect(ecoVol).connect(mestre);
        ruidoBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
        const d = ruidoBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    }
    const pronto = () => ligado && ac && ac.state === 'running';
    function saida(no, o) { no.connect(o.musica ? musVol : efeitos); if (o.eco) no.connect(eco); }
    function envelope(g, t, vol, ataque, dur) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + ataque);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    }
    // o: { tipo, ate (freq. final), vol, ataque, eco, musica, em (hora exata), atraso, corte (passa-baixa) }
    function tom(freq, dur, o = {}) {
      if (!pronto()) return;
      const t = o.em || ac.currentTime + (o.atraso || 0);
      const osc = ac.createOscillator(), g = ac.createGain();
      osc.type = o.tipo || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (o.ate) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.ate), t + dur);
      envelope(g, t, o.vol || 0.2, o.ataque || 0.004, dur);
      if (o.corte) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.corte; osc.connect(f).connect(g); } else osc.connect(g);
      saida(g, o);
      osc.start(t); osc.stop(t + dur + 0.03);
    }
    // o: { filtro, freq, ate (varre o filtro), q, vol, ataque, eco, musica, em, atraso }
    function ruido(dur, o = {}) {
      if (!pronto()) return;
      const t = o.em || ac.currentTime + (o.atraso || 0);
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = ruidoBuf; s.loop = true;
      f.type = o.filtro || 'lowpass'; f.Q.value = o.q || 0.7;
      f.frequency.setValueAtTime(o.freq || 1500, t);
      if (o.ate) f.frequency.exponentialRampToValueAtTime(o.ate, t + dur);
      envelope(g, t, o.vol || 0.3, o.ataque || 0.003, dur);
      s.connect(f).connect(g); saida(g, o);
      s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.03);
    }

    // ---------- Música: bateria + baixo + melodia em loop ----------
    // Cada faixa tem 32 semicolcheias (2 compassos). baixo/mel: 16 notas em
    // colcheias, em semitons acima da raiz (null = pausa).
    const FAIXAS = [
      { bpm: 128, raiz: 45, baixo: [0, 0, 12, 0, 0, 0, 10, 12, 5, 5, 17, 5, 7, 7, 19, 7], mel: [12, null, 15, 17, null, 19, 17, 15, 12, null, 10, null, 7, 10, 12, null], bumbo: [0, 6, 8, 16, 22, 24] },
      { bpm: 136, raiz: 43, baixo: [0, 12, 0, 12, 3, 15, 3, 15, 5, 17, 5, 17, 7, 19, 10, 22], mel: [19, 17, 15, null, 15, 17, 19, 22, 24, null, 22, 19, 17, null, 15, null], bumbo: [0, 8, 10, 16, 24, 26] },
      { bpm: 144, raiz: 40, baixo: [0, 0, 0, 12, 1, 1, 1, 13, 0, 0, 0, 12, 3, 3, 5, 7], mel: [12, 13, 12, null, 15, null, 13, 12, 10, null, 12, 13, 15, 17, 15, null], bumbo: [0, 4, 8, 12, 16, 20, 24, 28] },
      { bpm: 160, raiz: 38, baixo: [0, 0, 12, 0, 1, 1, 13, 1, 0, 0, 12, 0, 6, 6, 7, 7], mel: [24, null, 25, 24, 22, null, 19, 18, 19, null, 22, 24, 25, null, 30, 31], bumbo: [0, 3, 6, 8, 11, 14, 16, 19, 22, 24, 27, 30] },
    ];
    const hz = m => 440 * Math.pow(2, (m - 69) / 12);
    let faixa = null, passoMus = 0, proxNota = 0, relogio = 0;
    function agendar() {
      if (!faixa || !pronto()) return;
      const semi = 60 / faixa.bpm / 4;
      if (proxNota < ac.currentTime) proxNota = ac.currentTime + 0.05;
      while (proxNota < ac.currentTime + 0.15) {
        const p = passoMus % 32, em = proxNota, M = { musica: true, em };
        if (faixa.bumbo.includes(p)) tom(140, 0.16, Object.assign({ ate: 42, vol: 0.55 }, M));
        if (p % 8 === 4) { ruido(0.14, Object.assign({ filtro: 'highpass', freq: 1600, vol: 0.22 }, M)); tom(190, 0.08, Object.assign({ tipo: 'triangle', vol: 0.1 }, M)); }
        if (p % 2 === 0) ruido(0.035, Object.assign({ filtro: 'highpass', freq: 7500, vol: p % 4 === 2 ? 0.07 : 0.04 }, M));
        if (p % 2 === 0) {
          const b = faixa.baixo[(p / 2) % 16];
          if (b !== null) tom(hz(faixa.raiz + b - 12), semi * 1.8, Object.assign({ tipo: 'sawtooth', corte: 520, vol: 0.2 }, M));
          const n = faixa.mel[(p / 2) % 16];
          if (n !== null) {
            tom(hz(faixa.raiz + n), semi * 1.7, Object.assign({ tipo: 'square', corte: 2600, vol: 0.05, eco: true }, M));
            tom(hz(faixa.raiz + n) * 1.005, semi * 1.7, Object.assign({ tipo: 'sawtooth', corte: 1800, vol: 0.03 }, M));
          }
        }
        passoMus++;
        proxNota += semi;
      }
    }

    return {
      destravar() { a(); if (!relogio) relogio = setInterval(agendar, 25); },
      ativo: () => !!(ac && ac.state === 'running'),
      ligado: () => ligado,
      alternar() {
        ligado = !ligado;
        return ligado;
      },
      musica(n) { const nova = n === null || n === undefined ? null : FAIXAS[n]; if (nova !== faixa) { faixa = nova; passoMus = 0; proxNota = 0; } },
      vento() { ruido(0.14, { filtro: 'bandpass', freq: 500, ate: 2600, q: 1.2, vol: 0.18 }); },
      passo() { ruido(0.05, { freq: 380, vol: 0.12 }); },
      soco() {
        tom(170, 0.1, { ate: 55, vol: 0.7 });
        ruido(0.05, { filtro: 'bandpass', freq: 2600, q: 1.2, vol: 0.5 });
        ruido(0.12, { freq: 900, vol: 0.28, eco: true });
      },
      chute() {
        tom(125, 0.18, { ate: 38, vol: 0.85 });
        ruido(0.07, { filtro: 'bandpass', freq: 1700, q: 1, vol: 0.5 });
        ruido(0.22, { freq: 550, vol: 0.35, eco: true });
      },
      defesa() {
        tom(1650, 0.09, { tipo: 'square', vol: 0.05 });
        tom(2470, 0.12, { tipo: 'triangle', vol: 0.09, eco: true });
        ruido(0.06, { filtro: 'highpass', freq: 3800, vol: 0.18 });
        tom(150, 0.06, { ate: 80, vol: 0.3 });
      },
      queda() { tom(95, 0.3, { ate: 32, vol: 0.8, eco: true }); ruido(0.32, { freq: 320, vol: 0.45, eco: true }); },
      fogo() { ruido(0.55, { filtro: 'bandpass', freq: 350, ate: 3200, q: 2, vol: 0.4, eco: true }); tom(110, 0.45, { tipo: 'sawtooth', ate: 520, vol: 0.12, corte: 1400 }); },
      super() {
        tom(55, 1.0, { tipo: 'sawtooth', ate: 880, vol: 0.14, corte: 2200, eco: true });
        ruido(1.0, { filtro: 'bandpass', freq: 200, ate: 4500, q: 1.5, vol: 0.35 });
        tom(90, 0.8, { ate: 28, vol: 0.9, atraso: 0.55, eco: true });
        ruido(0.6, { freq: 700, vol: 0.5, atraso: 0.55, eco: true });
      },
      ko() { tom(110, 0.8, { ate: 28, vol: 0.95, eco: true }); ruido(0.7, { freq: 650, vol: 0.55, eco: true }); },
      // Provocações: só efeitos (nada de voz, pedido do professor).
      provoca(tipo) {
        if (tipo === 'risada') [0, 1, 2, 3].forEach(i => tom(720 + i * 70, 0.07, { tipo: 'square', vol: 0.05, atraso: i * 0.09 }));
        else if (tipo === 'carranca') tom(130, 0.4, { tipo: 'sawtooth', vol: 0.07, ate: 75, corte: 900 });
        else { tom(600, 0.12, { vol: 0.09, ate: 1200 }); tom(800, 0.16, { vol: 0.09, ate: 1500, atraso: 0.16 }); }
      },
      madeira() { tom(230, 0.09, { tipo: 'triangle', ate: 110, vol: 0.35 }); ruido(0.08, { filtro: 'bandpass', freq: 1100, q: 2, vol: 0.4 }); },
      quebra() {
        tom(160, 0.2, { tipo: 'triangle', ate: 60, vol: 0.5, eco: true });
        [0, 0.05, 0.11].forEach(a => ruido(0.1, { filtro: 'bandpass', freq: 1400 - a * 4000, q: 1.5, vol: 0.4, atraso: a }));
      },
      item() { [784, 988, 1319].forEach((f, i) => tom(f, 0.12, { tipo: 'triangle', vol: 0.12, atraso: i * 0.07, eco: true })); },
      agarra() { tom(140, 0.12, { ate: 70, vol: 0.5 }); ruido(0.08, { freq: 700, vol: 0.3 }); },
      menu() { tom(880, 0.08, { tipo: 'square', vol: 0.07 }); tom(1320, 0.12, { tipo: 'square', vol: 0.07, atraso: 0.07 }); },
      fase() { [523, 659, 784, 1047].forEach((f, i) => tom(f, 0.16, { tipo: 'square', vol: 0.08, atraso: i * 0.11, eco: true })); },
    };
  })();

  // ---------- Entrada: teclado + celular ----------
  // Uma entrada por jogador (E[0] = jogador 1, E[1] = jogador 2 do X1). O
  // mapa do teclado muda com o modo: sozinho, setas OU WASD movem o Kaito;
  // no X1 cada jogador tem a sua metade do teclado.
  const Tecla = {};
  const MAPA_SOLO = { esq: ['ArrowLeft', 'KeyA'], dir: ['ArrowRight', 'KeyD'], cima: ['ArrowUp', 'KeyW'], baixo: ['ArrowDown', 'KeyS'],
    botoes: { KeyZ: 'soco', KeyJ: 'soco', KeyX: 'chute', KeyK: 'chute', KeyC: 'esp', KeyL: 'esp', Space: 'pulo', KeyQ: 'risada', KeyE: 'carranca', KeyV: 'chamar' } };
  const MAPAS_X1 = [
    { esq: ['KeyA'], dir: ['KeyD'], cima: ['KeyW'], baixo: ['KeyS'], botoes: { KeyZ: 'soco', KeyX: 'chute', KeyC: 'esp', Space: 'pulo', KeyQ: 'risada', KeyE: 'carranca', KeyV: 'chamar' } },
    { esq: ['ArrowLeft'], dir: ['ArrowRight'], cima: ['ArrowUp'], baixo: ['ArrowDown'],
      botoes: { KeyK: 'soco', Numpad1: 'soco', KeyL: 'chute', Numpad2: 'chute', Semicolon: 'esp', Numpad3: 'esp', Numpad0: 'pulo',
        KeyU: 'risada', Numpad7: 'risada', KeyI: 'carranca', Numpad8: 'carranca', KeyO: 'chamar', Numpad9: 'chamar' } },
  ];
  const TECLAS_GERAIS = { KeyR: 'reiniciar', Enter: 'start', NumpadEnter: 'start', KeyP: 'pausa', Escape: 'pausa', Digit1: 'modo1', Digit2: 'modo2' };
  const algum = cods => cods.some(c => Tecla[c]);
  function novaEntrada(n) {
    return {
      cel: { x: 0, y: 0, visto: 0 }, fila: [],
      get mapa() { return J.modo === 'x1' ? MAPAS_X1[n] : (n === 0 ? MAPA_SOLO : null); },
      eixo(menos, mais, c) {
        const m = this.mapa;
        const k = m ? (algum(m[mais]) ? 1 : 0) - (algum(m[menos]) ? 1 : 0) : 0;
        return clamp(k + (performance.now() - this.cel.visto < 3500 ? this.cel[c] : 0), -1, 1);
      },
      get x() { return this.eixo('esq', 'dir', 'x'); },
      get y() { return this.eixo('cima', 'baixo', 'y'); },
      apertar(b) { Som.destravar(); this.fila.push({ b, t: J.tick }); },
      // Consome o primeiro botão da lista apertado nos últimos 8 quadros
      // (um "buffer": apertar um pouco antes da hora ainda vale).
      pegar(...bs) {
        const i = this.fila.findIndex(e => bs.includes(e.b) && e.t >= J.tick - 8);
        if (i < 0) return null;
        return this.fila.splice(i, 1)[0].b;
      },
      limpar() { this.fila = this.fila.filter(e => e.t >= J.tick - 8); },
    };
  }
  const E = [novaEntrada(0), novaEntrada(1)];
  // Botões que valem para qualquer jogador (começar, pausar, reiniciar, menu).
  const pegarGeral = (...bs) => E[0].pegar(...bs) || E[1].pegar(...bs);

  // ---------- Personagens ----------
  const TIPOS = {
    jogador: { nome: 'KAITO', hp: 130, esc: 1, cores: { pele: '#e8b48a', roupa: '#2f5fd0', calca: '#2f5fd0', faixa: '#141414', cabelo: '#1c1410', bandana: '#d62839', luva: '#c1121f', pes: '#e8b48a', manga: 'curta', gola: true, calcaLarga: true, cabeloTipo: 'espetado', pontasFaixa: true } },
    jogador2: { nome: 'RAIJU', hp: 130, esc: 1, cores: { pele: '#f3d3bd', roupa: '#c62828', calca: '#c62828', faixa: '#141414', cabelo: '#5a2d0c', bandana: '#f5f5f5', luva: '#f5f5f5', pes: '#f3d3bd', manga: 'curta', gola: true, calcaLarga: true, cabeloTipo: 'espetado', pontasFaixa: true } },
    capanga: { nome: 'Capanga', hp: 28, vel: 1.7, alcance: 62, cd: [70, 120], bloq: 0, pontos: 100, golpes: ['eSoco'],
      cores: { pele: '#f3d3bd', roupa: '#6b4f3a', calca: '#2b3a67', faixa: '#2a2a2a', cabelo: '#111111', luva: '#f3d3bd', pes: '#1f1f1f', manga: 'longa', cabeloTipo: 'curto', barba: 'rgba(40,25,15,.45)' } },
    brigao: { nome: 'Brigão', hp: 42, vel: 2.0, alcance: 78, cd: [55, 95], bloq: 0.25, pontos: 150, golpes: ['eSoco', 'eChute'],
      cores: { pele: '#f0cdb2', roupa: '#2a9d8f', calca: '#333333', faixa: '#222222', cabelo: '#000000', bandana: '#f4a261', luva: '#f4a261', pes: '#222222', manga: 'nenhuma', cabeloTipo: 'curto' } },
    ninja: { nome: 'Ninja', hp: 32, vel: 3.0, alcance: 78, cd: [50, 90], bloq: 0.15, pontos: 200, golpes: ['eChute', 'eVoadora'], atira: true,
      cores: { pele: '#f6dcc8', roupa: '#1b1b2f', calca: '#1b1b2f', faixa: '#7b2cbf', cabelo: '#1b1b2f', bandana: '#7b2cbf', luva: '#2a2a40', pes: '#111111', manga: 'longa', mascara: true } },
    // Monge do bastão: alcance longo e varrida baixa (só se defende agachado ou pulando).
    monge: { nome: 'Monge', hp: 38, vel: 1.9, alcance: 118, cd: [65, 105], bloq: 0.3, pontos: 250, golpes: ['bGolpe', 'bVarrida'], bastao: true,
      cores: { pele: '#d9a066', roupa: '#e07a1f', calca: '#c4621a', faixa: '#7a2e0b', cabelo: '#d9a066', luva: '#d9a066', pes: '#3b2a1a', manga: 'curta', gola: true, calcaLarga: true, cabeloTipo: 'careca', colar: '#5a2d0c' } },
    brutamontes: { nome: 'Brutamontes', hp: 85, vel: 1.25, esc: 1.25, alcance: 74, cd: [70, 110], bloq: 0, pontos: 300, golpes: ['socoForte'], armadura: 2,
      cores: { pele: '#f4d2bc', roupa: '#e76f51', calca: '#264653', faixa: '#1d3557', cabelo: '#f4d2bc', luva: '#444444', pes: '#222222', manga: 'nenhuma', colete: true, barba: '#5a3b1e' } },
    chefe: { nome: 'IMPERADOR VULCANO', hp: 440, vel: 2.0, esc: 1.35, alcance: 82, cd: [38, 72], bloq: 0.35, pontos: 5000, chefe: true,
      cores: { pele: '#f1d4c0', roupa: '#7a0f1f', calca: '#2b0a10', faixa: '#e9b949', cabelo: '#ededed', luva: '#f1d4c0', capa: '#3d0a12', pes: '#2b1a0a', manga: 'longa', gola: true, calcaLarga: true, cabeloTipo: 'longo', barba: '#ededed', ouro: '#e9b949' } },
  };

  // Golpes: quadros de preparação (ini), ativos e de recuperação (rec);
  // alcance horizontal (alc) e faixa de altura (y0..y1, a partir dos pés).
  const GOLPES = {
    // prox: golpe que sai se apertar SOCO de novo acertando; proxChute: idem com CHUTE.
    soco1: { ini: 3, ativo: 3, rec: 8, dano: 5, alc: 64, y0: 95, y1: 132, kb: 2.5, pose: 'soco', prox: 'soco2', proxChute: 'chute', som: 'soco' },
    soco2: { ini: 3, ativo: 3, rec: 9, dano: 6, alc: 64, y0: 95, y1: 132, kb: 2.5, pose: 'soco2', prox: 'soco3', proxChute: 'chuteGiro', som: 'soco' },
    chuteGiro: { ini: 6, ativo: 5, rec: 18, dano: 12, alc: 94, y0: 60, y1: 135, kb: 8, derruba: true, pesado: true, pose: 'chuteGiro', som: 'chute', nomeTela: 'CHUTE GIRATÓRIO!' },
    // Especiais por comando (ver COMANDOS):
    dragao: { ini: 3, ativo: 12, rec: 0, dano: 15, alc: 62, y0: 60, y1: 180, kb: 5, derruba: true, pesado: true, aereo: true, salto: [12.5, 2], invul: 9, pouso: 'pousoCurto', pose: 'dragao', som: 'chute', nomeTela: 'PUNHO DO DRAGÃO!' },
    furacao: { ini: 5, ativo: 36, rec: 0, dano: 6, alc: 70, y0: 40, y1: 120, kb: 3, aereo: true, flutua: 5.5, multi: 12, pouso: 'pousoCurto', pose: 'furacao', som: 'chute', nomeTela: 'FURACÃO!' },
    bolaComando: { ini: 10, ativo: 1, rec: 20, pose: 'hadouken', disparo: { z: 105, vel: 8.5, raio: 18, dano: 12, kb: 6, tipo: 'fogo' }, nomeTela: 'BOLA DE ENERGIA!' },
    pousoCurto: { ini: 0, ativo: 0, rec: 14, pose: 'agachado' },
    soco3: { ini: 5, ativo: 4, rec: 16, dano: 10, alc: 66, y0: 90, y1: 155, kb: 6, derruba: true, pesado: true, pose: 'gancho', som: 'chute' },
    socoBaixo: { ini: 3, ativo: 3, rec: 8, dano: 4, alc: 62, y0: 55, y1: 90, kb: 2, pose: 'socoBaixo', som: 'soco' },
    chute: { ini: 6, ativo: 4, rec: 14, dano: 9, alc: 88, y0: 70, y1: 122, kb: 5.5, pose: 'chute', som: 'chute' },
    rasteira: { ini: 6, ativo: 5, rec: 16, dano: 7, alc: 92, y0: 0, y1: 30, kb: 4, derruba: true, baixo: true, pose: 'rasteira', som: 'chute' },
    voadora: { ini: 3, ativo: 14, rec: 0, dano: 10, alc: 72, y0: 15, y1: 85, kb: 5, derruba: true, aereo: true, pose: 'voadora', som: 'chute' },
    hadouken: { ini: 12, ativo: 1, rec: 22, pose: 'hadouken', disparo: { z: 105, vel: 8.5, raio: 18, dano: 14, kb: 6, tipo: 'fogo' } },
    super: { ini: 34, ativo: 1, rec: 30, pose: 'super', superGolpe: true },

    eSoco: { ini: 12, ativo: 4, rec: 18, dano: 6, alc: 62, y0: 95, y1: 132, kb: 3, pose: 'soco', som: 'soco' },
    eChute: { ini: 14, ativo: 5, rec: 20, dano: 9, alc: 84, y0: 70, y1: 122, kb: 5, pose: 'chute', som: 'chute' },
    eVoadora: { ini: 10, ativo: 30, rec: 0, dano: 10, alc: 70, y0: 15, y1: 85, kb: 5, derruba: true, aereo: true, salto: [10, 6], pose: 'voadora', som: 'chute' },
    shuriken: { ini: 16, ativo: 1, rec: 20, pose: 'arremesso', disparo: { z: 112, vel: 7, raio: 10, dano: 6, kb: 3, tipo: 'shuriken' } },
    // Agarrão (frente + Soco colado no inimigo): segura (ini) e arremessa para a frente.
    agarrao: { ini: 14, ativo: 1, rec: 16, pose: 'agarra', agarra: true, nomeTela: 'AGARRÃO!' },
    bGolpe: { ini: 14, ativo: 5, rec: 20, dano: 8, alc: 125, y0: 80, y1: 135, kb: 5, pose: 'estocada', som: 'soco' },
    bVarrida: { ini: 18, ativo: 6, rec: 22, dano: 7, alc: 122, y0: 0, y1: 32, kb: 4, derruba: true, baixo: true, pose: 'varrida', som: 'chute' },
    socoForte: { ini: 20, ativo: 5, rec: 26, dano: 15, alc: 76, y0: 80, y1: 140, kb: 8, derruba: true, pesado: true, armado: true, pose: 'socoForte', som: 'chute' },

    bCombo: { ini: 10, ativo: 4, rec: 6, dano: 8, alc: 72, y0: 90, y1: 145, kb: 3, pose: 'soco', prox: 'bCombo2', sempre: true, som: 'soco' },
    bCombo2: { ini: 7, ativo: 5, rec: 24, dano: 11, alc: 82, y0: 85, y1: 160, kb: 8, derruba: true, pesado: true, pose: 'gancho', som: 'chute' },
    investida: { ini: 24, ativo: 28, rec: 24, dano: 16, alc: 64, y0: 40, y1: 150, kb: 9, derruba: true, pesado: true, armado: true, corre: 11, pose: 'investida', som: 'chute' },
    pisao: { ini: 14, ativo: 60, rec: 0, dano: 0, aereo: true, armado: true, pisao: true, pose: 'pisao' },
    pouso: { ini: 0, ativo: 0, rec: 28, armado: true, pose: 'agachado' },
    bolaFogo: { ini: 20, ativo: 1, rec: 26, pose: 'hadouken', disparo: { z: 70, vel: 7.5, raio: 24, dano: 14, kb: 7, tipo: 'bola', derruba: true } },
    bolaFogo3: { ini: 18, ativo: 33, rec: 22, pose: 'hadouken', rajada: [0, 16, 32], disparo: { z: 70, vel: 8, raio: 22, dano: 12, kb: 7, tipo: 'bola', derruba: true } },
  };
  Object.keys(GOLPES).forEach(k => { GOLPES[k].nome = k; });

  // objetos[i]: caixas e barris que aparecem no começo da onda i
  // ([tipo, o que solta, x]). Só no modo de 1 jogador.
  const FASES = [
    { nome: 'PORTO AO ENTARDECER', ondas: [['capanga', 'capanga'], ['capanga', 'capanga', 'capanga'], ['capanga', 'brigao', 'capanga', 'capanga']],
      objetos: [[], [['caixa', 'frango', 720]], [['barril', 'raio', 330]]] },
    { nome: 'MERCADO NOTURNO', ondas: [['brigao', 'ninja'], ['capanga', 'monge', 'ninja', 'brigao'], ['ninja', 'monge', 'brigao', 'brigao', 'capanga']],
      objetos: [[['barril', 'raio', 700]], [['caixa', 'frango', 300]], [['caixa', 'frango', 640]]] },
    { nome: 'TELHADO DA TORRE', ondas: [['brutamontes', 'ninja', 'capanga'], ['brutamontes', 'monge', 'ninja', 'ninja', 'brigao'], ['chefe']],
      objetos: [[['caixa', 'raio', 680]], [['barril', 'frango', 320]], [['caixa', 'frango', 160], ['barril', 'raio', 820]]] },
  ];

  // Caixas e barris: quebram com 2 golpes (qualquer altura) e soltam o item.
  const OBJETOS = { caixa: { hp: 2, larg: 54, alt: 50 }, barril: { hp: 2, larg: 44, alt: 60 } };
  const ITENS = {
    frango: { txt: '+35 VIDA', cor: '#ffd166', pegar: p => { p.hp = Math.min(p.T.hp, p.hp + 35); } },
    raio: { txt: '+50 ENERGIA', cor: '#7dd3fc', pegar: p => { p.en = Math.min(100, p.en + 50); } },
  };

  // Provocações (botões pequenos do celular, ou Q/E/V e U/I/O no teclado):
  // pose curta + balão em cima da cabeça. Só saem com o lutador parado no
  // chão e deixam ele aberto por ~0,75 s: provocar tem risco.
  const PROVOCACOES = {
    risada: { emoji: '😂', fala: 'HAHA!' },
    carranca: { emoji: '😠', fala: 'GRRR!' },
    chamar: { emoji: '👋', fala: 'VEM!' },
  };
  const PROVOCA_QUADROS = 45, BALAO_QUADROS = 80;

  // ---------- Estado do jogo ----------
  const J = {
    tela: 'titulo', tick: 0, tt: 0, fase: 0, onda: 0, fila: [], inis: [], proj: [], parts: [], textos: [],
    jog: null, pontos: 0, pontosFase: 0, congelar: 0, tremor: 0, lento: 0, flash: 0, superT: 0,
    aviso: null, travado: 0, trans: 0, chefe: null, recorde: 0, seq: 0, raio: 0,
    mortes: 0, voltaFase1: false, confirma: -999, objs: [], itens: [], dica: null, vistoMonge: false,
    modo: 'solo', menu: 0, menuDir: 0, p2: null, vit: [0, 0], round: 0, tempo: 0, campeao: 0,
  };
  try { J.recorde = Number(localStorage.getItem('luta_recorde')) || 0; } catch (e) {}

  function novoLutador(tipo, x, face) {
    const T = TIPOS[tipo];
    return {
      tipo, T, x, z: 0, vx: 0, vz: 0, face, hp: T.hp, hpVisto: T.hp, s: T.esc || 1,
      estado: 'parado', et: 0, atord: 0, golpe: null, gt: 0, acertou: new Set(), encadear: null,
      passo: 0, guarda: false, invul: 0, branco: 0, cd: T.cd ? rnd(T.cd[0], T.cd[1]) : 0,
      armadura: T.armadura || 0, semApanhar: 0, combo: 0, comboT: 0, en: 0, id: ++J.seq,
      controle: 0, entrando: false, engajado: false, slot: 0, guardaT: 0, decidiu: false, cimaAntes: false, puloGolpe: false,
    };
  }

  function novoJogo() {
    J.modo = 'solo';
    J.pontos = 0;
    J.mortes = 0;
    J.vistoMonge = false;
    J.jog = novoLutador('jogador', 200, 1);
    J.jog.controle = 1;
    J.p2 = null;
    comecarFase(0);
  }
  let seqObj = 0;
  function colocarObjetos(fase, onda) {
    (FASES[fase].objetos[onda] || []).forEach(([tipo, item, x]) => {
      J.objs.push(Object.assign({ id: 'o' + (++seqObj), tipo, item, x, treme: 0 }, { hp: OBJETOS[tipo].hp, larg: OBJETOS[tipo].larg, alt: OBJETOS[tipo].alt }));
    });
  }
  function comecarFase(n) {
    J.fase = n; J.onda = 0; J.inis = []; J.proj = []; J.parts = []; J.textos = []; J.chefe = null;
    J.objs = []; J.itens = []; J.dica = null;
    colocarObjetos(n, 0);
    J.pontosFase = J.pontos;
    const p = J.jog;
    Object.assign(p, { x: 200, z: 0, vx: 0, vz: 0, face: 1, estado: 'parado', golpe: null, invul: 0, combo: 0 });
    J.fila = FASES[n].ondas[0].slice();
    J.tela = 'jogo';
    J.travado = 150;
    J.aviso = { txt: `FASE ${n + 1}`, sub: FASES[n].nome, t: 150, lute: true };
    Som.fase();
    Som.musica(n);
  }
  function reiniciarFase() {
    const p = J.jog;
    p.hp = p.T.hp; p.hpVisto = p.hp; p.en = 0;
    J.pontos = J.pontosFase;
    comecarFase(J.fase);
  }

  // ---------- Combate ----------
  const livre = f => ['parado', 'andar', 'agachar', 'guarda'].includes(f.estado);
  const noChao = f => f.z <= 0 && f.vz <= 0;
  // Agachar só deixa os INIMIGOS mais baixos: o Kaito agachado continua
  // apanhando (para escapar, só defendendo ou pulando).
  function altura(f) {
    if (f.estado === 'caido' || f.estado === 'ko') return 25;
    if (!f.controle && (f.estado === 'agachar' || f.estado === 'levantar' || (f.golpe && ['rasteira', 'socoBaixo', 'varrida'].includes(f.golpe.pose)))) return 88 * f.s;
    return 148 * f.s;
  }
  const intocavel = f => f.invul > 0 || ['caido', 'levantar', 'ko', 'preso'].includes(f.estado);


  function iniciarGolpe(f, nome) {
    const g = GOLPES[nome];
    f.estado = 'golpe'; f.golpe = g; f.gt = 0; f.acertou = new Set(); f.encadear = null;
    if (!g.aereo) f.vx = 0;
    if (g.som || g.disparo) Som.vento();
    if (g.superGolpe) { J.superT = g.ini; f.invul = g.ini + g.rec + 10; Som.super(); Fx('superInicio', f); }
    if (g.invul) f.invul = Math.max(f.invul, g.invul);
    if (g.nomeTela && f.controle) texto(f.x, CHAO - 175, g.nomeTela, f.controle === 2 ? '#ff8f8f' : '#7dd3fc', 22);
  }

  function atualizarGolpe(f) {
    const g = f.golpe; f.gt++;
    const fimAtivo = g.ini + g.ativo;
    if (g.agarra && f.gt === g.ini + 1) arremessar(f);
    if (g.salto && f.gt === g.ini) { f.vz = g.salto[0]; f.z = 1; f.vx = f.face * g.salto[1]; }
    if (g.flutua) { // Furacão: gira no ar, avançando, e depois cai
      if (f.gt === g.ini) { f.z = Math.max(f.z, 1); f.vz = 6; }
      if (f.gt > g.ini && f.gt <= fimAtivo) { f.vx = f.face * g.flutua; if (f.z >= 26 || f.vz <= 0.75) { f.z = Math.min(f.z, 26); f.vz = 0.75; } } // 0,75 anula a gravidade: paira
      if (f.gt === fimAtivo) f.vx *= 0.4;
      if (g.multi && f.gt > g.ini && (f.gt - g.ini) % g.multi === 0) f.acertou = new Set();
    }
    if (g.pisao && f.gt === g.ini) {
      // Salta para cair em cima de onde o jogador está agora.
      f.vz = 15; f.z = 1;
      f.vx = clamp((J.jog.x - f.x) / 40, -9, 9);
    }
    if (g.corre) {
      if (f.gt > g.ini && f.gt <= fimAtivo) {
        f.vx = f.face * g.corre;
        if (f.gt % 3 === 0) poeira(f.x - f.face * 20, CHAO, 1);
      } else if (f.gt > fimAtivo) f.vx *= 0.8;
    }
    if (g.disparo) {
      const momentos = g.rajada ? g.rajada.map(o => g.ini + 1 + o) : [g.ini + 1];
      momentos.forEach((m, i) => {
        if (f.gt !== m) return;
        const d = Object.assign({}, g.disparo);
        if (g.rajada && i % 2 === 1) d.z = 128;
        disparar(f, d);
      });
    }
    if (g.superGolpe && f.gt === g.ini + 1) soltarSuper(f);
    if (g.dano && f.gt > g.ini && f.gt <= fimAtivo) testarAcerto(f, g);
    if (f.encadear && f.gt >= fimAtivo && (g.sempre || f.acertou.size)) { iniciarGolpe(f, f.encadear); return; }
    if (g.sempre && g.prox && f.gt === fimAtivo) f.encadear = g.prox;
    if (!g.aereo && f.gt >= fimAtivo + g.rec) { f.estado = 'parado'; f.golpe = null; f.encadear = null; }
  }

  function alvosDe(f) { return f === J.jog ? J.inis : [J.jog]; }

  function testarAcerto(f, g) {
    for (const t of alvosDe(f)) {
      if (f.acertou.has(t.id) || intocavel(t)) continue;
      const dx = (t.x - f.x) * f.face, meia = 22 * t.s;
      if (dx < -meia || dx > g.alc * f.s + meia) continue;
      const lo = f.z + g.y0 * f.s, hi = f.z + g.y1 * f.s;
      if (hi < t.z || lo > t.z + altura(t)) continue;
      f.acertou.add(t.id);
      acertar(t, { x: f.x, atk: f, g, altura: (lo + hi) / 2 });
    }
    // Caixas e barris: qualquer golpe do lutador controlado, em qualquer altura.
    if (!f.controle || f.z > 120) return;
    for (const o of J.objs) {
      if (f.acertou.has(o.id)) continue;
      const dx = (o.x - f.x) * f.face;
      if (dx < -o.larg / 2 || dx > g.alc * f.s + o.larg / 2) continue;
      f.acertou.add(o.id);
      baterObjeto(o, f.x);
    }
  }

  function baterObjeto(o, deX) {
    o.hp--; o.treme = 10;
    J.congelar = Math.max(J.congelar, 2);
    for (let i = 0; i < 6; i++) J.parts.push({ x: o.x + rnd(-10, 10), y: CHAO - o.alt * 0.6, vx: rnd(-4, 4) + Math.sign(o.x - deX) * 2, vy: rnd(-7, -2), vida: rnd(20, 32), cor: '#b07a40', tam: rnd(2, 4), normal: true, lasca: true });
    if (o.hp > 0) { Som.madeira(); return; }
    Som.quebra();
    J.objs = J.objs.filter(x => x !== o);
    for (let i = 0; i < 16; i++) J.parts.push({ x: o.x + rnd(-20, 20), y: CHAO - rnd(5, o.alt), vx: rnd(-6, 6), vy: rnd(-9, -2), vida: rnd(26, 44), cor: i % 3 ? '#a86b34' : '#6b4320', tam: rnd(3, 6), normal: true, lasca: true });
    poeira(o.x, CHAO, 6);
    J.itens.push({ tipo: o.item, x: o.x, z: 6, vz: 7, vida: 12 * 60, t: 0 });
    Fx('quebra', o);
  }

  // fonte: { x, atk (quem bateu), g (dano, kb, derruba, baixo, pesado), altura }
  function acertar(alvo, fonte) {
    const g = fonte.g;
    const dir = Math.sign(alvo.x - fonte.x) || 1;
    const daFrente = (fonte.x - alvo.x) * alvo.face > 0;
    const jogDefende = alvo.controle && alvo.guarda && noChao(alvo) && ['parado', 'andar', 'agachar'].includes(alvo.estado)
      && (!g.baixo || alvo.estado === 'agachar');
    const iniDefende = !alvo.controle && alvo.estado === 'guarda' && !g.baixo;
    const yFx = CHAO - (fonte.altura || 100);
    if (daFrente && !g.ignoraDefesa && (jogDefende || iniDefende)) {
      const lasca = g.tipo ? 1 : 0;
      alvo.hp = Math.max(1, alvo.hp - lasca);
      alvo.vx = dir * 3.5;
      faiscas(alvo.x - dir * 16 * alvo.s, yFx, '#7dd3fc', 6);
      J.congelar = 3;
      Som.defesa();
      Fx('defesa', alvo.x - dir * 22 * alvo.s, yFx, -dir);
      if (alvo.controle) alvo.en = Math.min(100, alvo.en + 2);
      return;
    }
    alvo.hp -= g.dano;
    alvo.branco = 5;
    alvo.semApanhar = 0;
    faiscas(alvo.x - dir * 14 * alvo.s, yFx, g.pesado ? '#ffd166' : '#fff3b0', g.pesado ? 14 : 9);
    J.congelar = g.pesado ? 7 : 4;
    J.tremor = Math.max(J.tremor, g.pesado ? 7 : 3);
    (g.pesado ? Som.chute : Som.soco)();
    Fx('acerto', alvo.x - dir * 14 * alvo.s, yFx, !!g.pesado, dir);
    const atk = fonte.atk;
    if (atk && atk.controle) {
      atk.en = Math.min(100, atk.en + 5);
      if (J.modo !== 'x1') J.pontos += g.dano * 10;
      atk.combo++; atk.comboT = 70;
    }
    if (alvo.controle) {
      alvo.en = Math.min(100, alvo.en + 3);
      alvo.combo = 0;
      Rede.vibrar(alvo.controle, g.pesado ? 160 : 70);
    }
    if (alvo.hp <= 0) { nocaute(alvo, dir); return; }
    // Armadura: o Brutamontes aguenta 2 golpes sem se abalar; o chefe não
    // para no meio da investida nem do pisão.
    const armado = (alvo.golpe && alvo.golpe.armado && alvo.estado === 'golpe') || (alvo.armadura > 0 && !g.derruba);
    if (armado) {
      if (alvo.armadura > 0 && !(alvo.golpe && alvo.golpe.armado)) alvo.armadura--;
      return;
    }
    if (g.derruba || !noChao(alvo)) { derrubar(alvo, dir, g.kb); return; }
    alvo.estado = 'dor'; alvo.et = 0; alvo.atord = g.pesado ? 22 : 16;
    alvo.golpe = null; alvo.vx = dir * g.kb;
  }

  function derrubar(f, dir, kb) {
    f.estado = 'caido'; f.et = 0; f.golpe = null; f.giro = 0;
    f.vz = 7; f.z = Math.max(f.z, 1); f.vx = dir * Math.max(kb, 4);
  }

  function nocaute(f, dir) {
    f.hp = 0;
    f.estado = 'ko'; f.et = 0; f.golpe = null; f.giro = 0;
    f.vz = 9; f.z = Math.max(f.z, 1); f.vx = dir * 6.5;
    J.congelar = 10; J.tremor = 10;
    Som.ko();
    // A câmera fecha no golpe final: do lutador, do chefe ou do último inimigo da fase.
    const ultimo = !f.controle && !J.fila.length && !J.inis.some(e => e !== f && e.estado !== 'ko');
    Fx('ko', f, !!(f.controle || f.T.chefe || (ultimo && J.onda === FASES[J.fase].ondas.length - 1)));
    if (f.controle) { J.lento = 50; Rede.vibrar(f.controle, 400); return; }
    J.pontos += f.T.pontos;
    texto(f.x, CHAO - 160 * f.s, `+${f.T.pontos}`, '#ffd166', 26);
    if (f.T.chefe) { J.lento = 120; J.flash = 1; Som.musica(null); }
  }

  function disparar(f, d) {
    J.proj.push({
      x: f.x + f.face * 50 * f.s, z: d.z * (f.T.chefe ? 1 : f.s), vx: f.face * d.vel, raio: d.raio, dano: d.dano, kb: d.kb,
      tipo: d.tipo, derruba: !!d.derruba, dono: f, vida: d.vida || 170, t: 0,
    });
    if (d.tipo !== 'shuriken') Som.fogo(); else Som.vento();
    Fx('disparo', f.x + f.face * 50 * f.s, CHAO - d.z * (f.T.chefe ? 1 : f.s), d.tipo);
  }

  // Agarrão: só no chão, colado e de frente; não pega o chefe nem quem está no ar ou caído.
  function agarravel(p) {
    const a = maisProximo(p);
    if (!a || a.T.chefe || a.entrando || intocavel(a) || !noChao(a)) return null;
    const dx = (a.x - p.x) * p.face;
    if (dx < 0 || dx > 50 + 22 * a.s) return null;
    if (!(livre(a) || a.estado === 'dor' || a.estado === 'provoca' || (a.estado === 'golpe' && a.gt <= a.golpe.ini))) return null;
    return a;
  }
  function agarrar(p, a) {
    iniciarGolpe(p, 'agarrao');
    p.preso = a; p.invul = Math.max(p.invul, GOLPES.agarrao.ini + 6);
    Object.assign(a, { estado: 'preso', presoPor: p, golpe: null, vx: 0, vz: 0, et: 0 });
    Som.agarra();
  }
  function arremessar(f) {
    const t = f.preso; f.preso = null;
    if (!t || t.estado !== 'preso') return;
    t.estado = 'parado'; t.presoPor = null;
    acertar(t, { x: f.x - f.face * 10, atk: f, altura: 90, g: { dano: 12, kb: 9, derruba: true, pesado: true, ignoraDefesa: true } });
    // Voa mais alto e mais longe que uma queda comum e derruba quem estiver no caminho.
    if (t.estado === 'caido') { t.vz = 9; t.vx = f.face * 8.5; }
    t.arremesso = f; t.atingidos = new Set();
    J.tremor = Math.max(J.tremor, 9);
    Fx('arremesso', t);
  }

  function soltarSuper(f) {
    J.flash = 1; J.tremor = 16; J.congelar = 8;
    Fx('superSolta', f);
    alvosDe(f).forEach(e => {
      if (intocavel(e) || e.entrando) return;
      acertar(e, { x: f.x, atk: f, altura: 110, g: { dano: e.T.chefe ? 48 : 34, kb: 8, derruba: true, pesado: true, ignoraDefesa: true } });
      for (let i = 0; i < 18; i++) J.parts.push({ x: e.x, y: CHAO - 80 * e.s, vx: rnd(-7, 7), vy: rnd(-9, 3), vida: 40, cor: i % 2 ? '#7dd3fc' : '#fff', tam: rnd(3, 7) });
    });
  }

  function especial(p) {
    if (p.en >= 100) { p.en = 0; iniciarGolpe(p, 'super'); texto(p.x, CHAO - 190, 'TEMPESTADE DO DRAGÃO!', '#7dd3fc', 30); return; }
    if (p.en >= 25) { p.en -= 25; iniciarGolpe(p, 'hadouken'); return; }
    texto(p.x, CHAO - 170, 'Sem energia!', '#9aa6ba', 18);
  }

  // ---------- Física comum ----------
  function atualizarCorpo(f) {
    if (f.invul > 0) f.invul--;
    if (f.branco > 0) f.branco--;
    if (f.balao && --f.balao.vida <= 0) f.balao = null;
    if (f.armadura < (f.T.armadura || 0) && ++f.semApanhar > 120) f.armadura = f.T.armadura;
    if (f.estado === 'preso') {
      // Segurado pelo agarrão: vai junto, um pouco erguido, até ser arremessado.
      const h = f.presoPor;
      if (!h || h.estado !== 'golpe' || !h.golpe || !h.golpe.agarra) { f.estado = 'parado'; f.presoPor = null; f.z = 0; f.vz = 0; return; }
      f.x = h.x + h.face * 44 * h.s; f.z = Math.min(22, h.gt * 2); f.vx = 0; f.vz = 0; f.face = -h.face; f.et++;
      return;
    }
    if (f.arremesso && !noChao(f)) {
      for (const o of alvosDe(f.arremesso)) {
        if (o === f || f.atingidos.has(o.id) || intocavel(o) || o.entrando) continue;
        if (Math.abs(o.x - f.x) > 22 * o.s + 28 || f.z > altura(o)) continue;
        f.atingidos.add(o.id);
        acertar(o, { x: f.x - f.vx, atk: f.arremesso, altura: f.z + 40, g: { dano: 10, kb: 6, derruba: true, pesado: true } });
      }
    }
    if (f.z > 0 || f.vz > 0) {
      f.vz -= GRAV; f.z += f.vz;
      if (f.z <= 0) { f.z = 0; f.vz = 0; aterrissar(f); }
    }
    f.x += f.vx;
    switch (f.estado) {
      case 'dor': f.vx *= 0.8; if (++f.et >= f.atord) f.estado = 'parado'; break;
      case 'caido': if (noChao(f)) { f.vx *= 0.75; if (++f.et >= 45) { f.estado = 'levantar'; f.et = 0; } } break;
      case 'levantar': f.vx = 0; if (++f.et >= 18) { f.estado = 'parado'; f.invul = f.controle ? 45 : 10; } break;
      case 'ko': if (noChao(f)) { f.vx *= 0.8; f.et++; } break;
      case 'golpe': atualizarGolpe(f); break;
      case 'provoca': f.vx = 0; if (++f.et >= PROVOCA_QUADROS) f.estado = 'parado'; break;
    }
  }

  function aterrissar(f) {
    if (f.estado === 'pulo') { f.estado = 'parado'; f.vx = 0; poeira(f.x, CHAO, 3); return; }
    if (f.estado === 'golpe' && f.golpe && f.golpe.aereo) {
      if (f.golpe.pisao) impactoPisao(f);
      else if (f.golpe.pouso) { f.vx = 0; poeira(f.x, CHAO, 4); iniciarGolpe(f, f.golpe.pouso); }
      else { f.estado = 'parado'; f.golpe = null; f.vx = 0; }
      return;
    }
    if (f.estado === 'caido' || f.estado === 'ko') {
      f.et = 0; poeira(f.x, CHAO, 8); Som.queda(); J.tremor = Math.max(J.tremor, f.arremesso ? 8 : 3);
      Fx('queda', f.x, f.s, !!f.arremesso);
      f.arremesso = null;
    }
  }

  function impactoPisao(f) {
    f.vx = 0;
    J.tremor = 14;
    poeira(f.x, CHAO, 16);
    Som.queda(); Som.chute();
    Fx('queda', f.x, 2, true);
    const p = J.jog;
    if (!intocavel(p) && Math.abs(p.x - f.x) < 75 && p.z < 40) {
      acertar(p, { x: f.x, atk: f, altura: 60, g: { dano: 18, kb: 8, derruba: true, pesado: true } });
    }
    [-1, 1].forEach(d => J.proj.push({ x: f.x + d * 40, z: 12, vx: d * 7, raio: 16, dano: 12, kb: 6, tipo: 'onda', derruba: true, dono: f, vida: 80, t: 0 }));
    iniciarGolpe(f, 'pouso');
  }

  // ---------- Jogador ----------
  function maisProximo(p) {
    let melhor = null, dm = Infinity;
    alvosDe(p).forEach(e => {
      if (e.estado === 'ko') return;
      const d = Math.abs(e.x - p.x);
      if (d < dm) { dm = d; melhor = e; }
    });
    return melhor;
  }

  // ---------- Comandos (combinação de direções + botão) ----------
  // Direções em "teclado numérico", sempre relativas a para onde o lutador
  // olha: 6 = para a frente, 4 = para trás, 2 = baixo, 3 = baixo-frente,
  // 1 = baixo-trás, 5 = parado. Guarda as últimas mudanças de direção e,
  // quando um botão é apertado, procura a sequência nos últimos ~0,4 s.
  const COMANDOS = [
    { seq: [6, 2, 3], botao: 'soco', golpe: 'dragao' },  // → ↓ ↘ + Soco: Punho do Dragão
    { seq: [2, 6], botao: 'soco', golpe: 'bolaComando' }, // ↓ ↘ → + Soco: Bola de Energia (o ↘ é opcional)
    { seq: [2, 4], botao: 'chute', golpe: 'furacao' },    // ↓ ↙ ← + Chute: Furacão
  ];
  function direcaoNum(p, dx, dy) {
    const x = Math.abs(dx) > 0.4 ? Math.sign(dx) * p.face : 0;
    const y = dy > 0.5 ? -1 : dy < -0.5 ? 1 : 0;
    return 5 + x + y * 3;
  }
  function registrarDirecao(p, dx, dy) {
    const n = direcaoNum(p, dx, dy);
    p.hist = p.hist || [];
    const ult = p.hist[p.hist.length - 1];
    if (!ult || ult.n !== n) { p.hist.push({ n, t: J.tick }); if (p.hist.length > 12) p.hist.shift(); }
  }
  // A sequência precisa aparecer em ordem (pode ter direções no meio), a
  // primeira há no máximo 26 quadros e a última há no máximo 10.
  function fezComando(p, seq) {
    const h = p.hist || [];
    let k = seq.length - 1, ultimaT = null;
    for (let i = h.length - 1; i >= 0 && k >= 0; i--) {
      if (J.tick - h[i].t > 26) break;
      if (h[i].n === seq[k]) { if (ultimaT === null) ultimaT = h[i].t; k--; }
    }
    return k < 0 && J.tick - ultimaT <= 10;
  }
  function comandoDe(p, botao) {
    for (const c of COMANDOS) {
      if (c.botao !== botao || !fezComando(p, c.seq)) continue;
      // Uma bola de energia de cada vez na tela.
      if (c.golpe === 'bolaComando' && J.proj.some(pr => pr.dono === p && pr.tipo === 'fogo')) continue;
      p.hist = [];
      return c.golpe;
    }
    return null;
  }

  // p = lutador controlado (Kaito, ou Raiju no X1); en = a entrada dele.
  function atualizarJogador(p, en) {
    if (p.comboT > 0 && --p.comboT === 0) p.combo = 0;
    const dx = en.x, dy = en.y;
    const cima = dy < -0.5, puloBorda = cima && !p.cimaAntes;
    p.cimaAntes = cima;
    registrarDirecao(p, dx, dy);
    atualizarCorpo(p);
    p.x = clamp(p.x, 30, W - 30);
    if (p.estado === 'golpe' && !p.golpe.sempre) {
      if (p.golpe.prox && en.pegar('soco')) p.encadear = p.golpe.prox;
      else if (p.golpe.proxChute && en.pegar('chute')) p.encadear = p.golpe.proxChute;
    }
    if (J.travado > 0) { if (livre(p)) { p.estado = 'parado'; p.vx = 0; } return; }
    if (p.giro > 0) p.giro--;
    if (p.estado === 'pulo') {
      // Pulo duplo: apertar pular de novo no ar (uma vez), com cambalhota.
      if (!p.puloDuplo && (en.pegar('pulo') || puloBorda)) {
        p.puloDuplo = true; p.vz = 12; p.vx = dx * 3.8; p.giro = 24;
        faiscas(p.x, CHAO - p.z, 'rgba(255,255,255,.8)', 8);
        Som.vento();
        return;
      }
      if (!p.puloGolpe && en.pegar('soco', 'chute')) { p.puloGolpe = true; p.giro = 0; iniciarGolpe(p, 'voadora'); }
      return;
    }
    if (!livre(p) || !noChao(p)) return;
    const alvo = maisProximo(p);
    if (alvo) p.face = alvo.x >= p.x ? 1 : -1;
    else if (Math.abs(dx) > 0.2) p.face = Math.sign(dx);
    p.guarda = dx * p.face < -0.3;
    const b = en.pegar('soco', 'chute', 'esp', 'pulo');
    if (b === 'pulo' || puloBorda) {
      p.estado = 'pulo'; p.vz = 13.5; p.z = 1; p.vx = dx * 3.8; p.puloGolpe = false; p.puloDuplo = false; Som.vento(); return;
    }
    if (b === 'esp') { especial(p); return; }
    const cmd = (b === 'soco' || b === 'chute') && comandoDe(p, b);
    if (cmd) { iniciarGolpe(p, cmd); return; }
    if (b === 'soco' && dx * p.face > 0.5 && Math.abs(dy) <= 0.5) {
      const a = agarravel(p);
      if (a) { agarrar(p, a); return; }
    }
    if (b === 'soco') { iniciarGolpe(p, dy > 0.5 ? 'socoBaixo' : 'soco1'); return; }
    if (b === 'chute') { iniciarGolpe(p, dy > 0.5 ? 'rasteira' : 'chute'); return; }
    const prov = en.pegar('risada', 'carranca', 'chamar');
    if (prov) { provocar(p, prov); return; }
    if (dy > 0.5) { p.estado = 'agachar'; p.vx = 0; return; }
    if (Math.abs(dx) > 0.2) {
      p.estado = 'andar';
      p.vx = dx * (p.guarda ? 2.3 : 3.5);
      const antes = Math.floor(p.passo / Math.PI);
      p.passo += Math.abs(p.vx) * 0.09;
      if (Math.floor(p.passo / Math.PI) !== antes) Som.passo();
    } else { p.estado = 'parado'; p.vx = 0; }
  }

  function provocar(p, tipo) {
    p.estado = 'provoca'; p.prov = tipo; p.et = 0; p.vx = 0; p.guarda = false;
    p.balao = { tipo, vida: BALAO_QUADROS };
    Som.provoca(tipo);
  }

  // ---------- Inimigos ----------
  function engajar() {
    const p = J.jog;
    const vivos = J.inis.filter(e => e.estado !== 'ko' && !e.entrando)
      .sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x));
    const limite = J.chefe && J.chefe.estado !== 'ko' ? 1 : 2;
    let n = 0, slot = 0;
    vivos.forEach(e => {
      if (e.T.chefe) { e.engajado = true; return; }
      if (n < limite) { e.engajado = true; n++; } else { e.engajado = false; e.slot = slot++; }
    });
  }

  function surgir(tipo) {
    const lado = J.tick % 2 ? -1 : 1;
    const e = novoLutador(tipo, lado < 0 ? -60 : W + 60, -lado);
    e.entrando = true;
    J.inis.push(e);
    if (tipo === 'monge' && !J.vistoMonge) {
      J.vistoMonge = true;
      J.dica = { txt: 'NOVO INIMIGO: MONGE DO BASTÃO', sub: 'A varrida dele é baixa: defenda AGACHADO (↓ + trás) ou pule', t: 330 };
    }
    if (e.T.chefe) {
      J.chefe = e;
      e.x = W + 80; e.face = -1; e.cd = 150;
      J.aviso = { txt: 'CHEFÃO', sub: e.T.nome, t: 170, chefe: true };
      Som.fase();
      Som.musica(3);
    }
  }

  function andarAte(e, alvoX, vel) {
    const diff = alvoX - e.x;
    if (Math.abs(diff) > 10) {
      e.estado = 'andar';
      const v = vel * (Math.sign(diff) === e.face ? 1 : 0.7);
      e.vx = Math.sign(diff) * v;
      e.passo += v * 0.09;
    } else { e.estado = 'parado'; e.vx = 0; }
  }

  function atualizarInimigo(e) {
    atualizarCorpo(e);
    const p = J.jog;
    if (e.estado === 'ko') return;
    if (e.entrando) {
      e.face = e.x < W / 2 ? 1 : -1;
      e.estado = 'andar'; e.vx = e.face * e.T.vel * 1.3; e.passo += 0.2;
      if (e.x > 40 && e.x < W - 40) e.entrando = false;
      return;
    }
    e.x = clamp(e.x, 20, W - 20);
    if (e.cd > 0) e.cd--;
    if (e.estado === 'guarda') { if (--e.guardaT <= 0) e.estado = 'parado'; return; }
    if (!livre(e) || !noChao(e)) return;
    const dx = p.x - e.x, dist = Math.abs(dx);
    e.face = dx >= 0 ? 1 : -1;
    if (p.estado === 'ko') { e.estado = 'parado'; e.vx = 0; return; }
    // Defesa: decide uma vez por golpe do jogador se vai se defender.
    if (p.estado === 'golpe' && dist < 150) {
      if (!e.decidiu) {
        e.decidiu = true;
        if (Math.random() < e.T.bloq) { e.estado = 'guarda'; e.guardaT = 24; e.vx = 0; return; }
      }
    } else e.decidiu = false;

    if (e.T.chefe) { iaChefe(e, dist); return; }

    const alc = e.T.alcance * e.s;
    const pAlvo = !intocavel(p);
    if (e.T.atira && e.cd <= 0 && dist > 220 && Math.random() < 0.02) {
      iniciarGolpe(e, 'shuriken'); e.cd = rnd(e.T.cd[0], e.T.cd[1]); return;
    }
    if (e.engajado && e.cd <= 0 && pAlvo) {
      if (dist <= alc + 12) {
        const g = e.T.golpes.filter(n => n !== 'eVoadora');
        iniciarGolpe(e, g[Math.floor(Math.random() * g.length)]);
        e.cd = rnd(e.T.cd[0], e.T.cd[1]);
        return;
      }
      if (e.T.golpes.includes('eVoadora') && dist > 130 && dist < 230 && Math.random() < 0.03) {
        iniciarGolpe(e, 'eVoadora'); e.cd = rnd(e.T.cd[0], e.T.cd[1]); return;
      }
    }
    const lado = e.x < p.x ? -1 : 1;
    const d = e.engajado ? alc * 0.8 : 220 + e.slot * 55;
    andarAte(e, clamp(p.x + lado * d, 30, W - 30), e.T.vel);
  }

  function iaChefe(e, dist) {
    const T = e.T;
    if (!e.invocou && e.hp < T.hp * 0.55) {
      e.invocou = true;
      J.fila.push('ninja', 'ninja');
      texto(e.x, CHAO - 210, 'Guardas, ataquem!', '#ff8fa3', 22);
    }
    if (!e.furia && e.hp < T.hp * 0.35) {
      e.furia = true;
      texto(e.x, CHAO - 230, 'FÚRIA!', '#ff3b3b', 34);
      J.tremor = 10; Som.super();
    }
    const vel = T.vel * (e.furia ? 1.3 : 1);
    if (e.cd <= 0 && !intocavel(J.jog)) {
      const r = Math.random();
      let g;
      if (dist < 120) g = r < 0.55 ? 'bCombo' : r < 0.8 ? 'pisao' : 'investida';
      else if (dist < 320) g = r < 0.4 ? 'investida' : r < 0.7 ? 'pisao' : 'bolaFogo';
      else g = r < 0.5 ? 'bolaFogo' : r < 0.8 ? 'investida' : 'pisao';
      if (g === 'bolaFogo' && e.furia) g = 'bolaFogo3';
      iniciarGolpe(e, g);
      e.cd = rnd(T.cd[0], T.cd[1]) * (e.furia ? 0.6 : 1);
      return;
    }
    const lado = e.x < J.jog.x ? -1 : 1;
    andarAte(e, clamp(J.jog.x + lado * 95, 40, W - 40), vel);
  }

  // Corpos não se atravessam (empurrão suave).
  function empurrar() {
    const todos = [J.jog, ...J.inis].filter(f => noChao(f) && !['caido', 'ko', 'levantar', 'preso'].includes(f.estado) && !f.entrando && !f.preso);
    for (let i = 0; i < todos.length; i++) {
      for (let k = i + 1; k < todos.length; k++) {
        const a = todos[i], b = todos[k];
        const min = 22 * a.s + 22 * b.s, d = b.x - a.x;
        if (Math.abs(d) >= min) continue;
        const sobra = (min - Math.abs(d)) / 2, s = Math.sign(d) || 1;
        if (b.T.chefe && a === J.jog) { a.x -= s * sobra * 2; continue; }
        if (a.T.chefe && b === J.jog) { b.x += s * sobra * 2; continue; }
        a.x -= s * sobra; b.x += s * sobra;
      }
    }
    J.jog.x = clamp(J.jog.x, 30, W - 30);
  }

  // ---------- Projéteis e efeitos ----------
  function atualizarProjeteis() {
    J.proj.forEach(pr => {
      pr.x += pr.vx; pr.t++; pr.vida--;
      if (pr.tipo === 'fogo' || pr.tipo === 'bola') {
        J.parts.push({ x: pr.x - Math.sign(pr.vx) * pr.raio, y: CHAO - pr.z + rnd(-6, 6), vx: -pr.vx * 0.2, vy: rnd(-1, 1), vida: 14, cor: pr.tipo === 'fogo' ? '#7dd3fc' : '#ff7b3b', tam: rnd(3, 6) });
      }
      const alvos = alvosDe(pr.dono);
      for (const t of alvos) {
        if (pr.vida <= 0 || intocavel(t) || t.entrando) continue;
        if (Math.abs(t.x - pr.x) > 22 * t.s + pr.raio) continue;
        if (pr.z + pr.raio < t.z || pr.z - pr.raio > t.z + altura(t)) continue;
        acertar(t, { x: pr.x - pr.vx, atk: pr.dono, altura: pr.z, g: { dano: pr.dano, kb: pr.kb, derruba: pr.derruba, tipo: pr.tipo, pesado: pr.tipo !== 'shuriken' } });
        pr.vida = 0;
        Fx('explosao', pr.x, CHAO - pr.z, pr.tipo);
      }
      // A bola de energia do lutador também quebra caixa e barril.
      if (pr.vida > 0 && pr.dono.controle) {
        const o = J.objs.find(o => Math.abs(o.x - pr.x) < o.larg / 2 + pr.raio && pr.z - pr.raio < o.alt);
        if (o) { baterObjeto(o, pr.x - pr.vx); pr.vida = 0; Fx('explosao', pr.x, CHAO - pr.z, pr.tipo); }
      }
    });
    // Bola de energia de um lutador com controle anula a do adversário.
    J.proj.forEach(a => J.proj.forEach(b => {
      if (a.vida > 0 && b.vida > 0 && a.dono !== b.dono && a.dono.controle && b.tipo !== 'onda' && Math.abs(a.x - b.x) < a.raio + b.raio && Math.abs(a.z - b.z) < a.raio + b.raio) {
        a.vida = 0; b.vida = 0; faiscas(a.x, CHAO - a.z, '#fff', 14); Som.defesa(); Fx('explosao', (a.x + b.x) / 2, CHAO - a.z, 'choque');
      }
    }));
    J.proj = J.proj.filter(pr => pr.vida > 0 && pr.x > -80 && pr.x < W + 80);
  }

  function faiscas(x, y, cor, n) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2), v = rnd(2, 7);
      J.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: rnd(10, 20), cor, tam: rnd(2, 5), risco: true });
    }
  }
  function poeira(x, y, n) {
    for (let i = 0; i < n; i++) J.parts.push({ x: x + rnd(-20, 20), y: y - rnd(0, 6), vx: rnd(-2, 2), vy: rnd(-1.5, -0.3), vida: rnd(18, 30), cor: 'rgba(200,190,170,.7)', tam: rnd(4, 9), fumaca: true });
  }
  function texto(x, y, txt, cor, tam) { J.textos.push({ x, y, txt, cor, tam: tam || 22, vida: 70 }); }

  function atualizarEfeitos() {
    J.parts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += p.fumaca ? -0.02 : 0.25; p.vx *= 0.95; p.vida--;
      if (p.lasca && p.y > CHAO) { p.y = CHAO; p.vy *= -0.35; p.vx *= 0.6; } // lasca de madeira quica no chão
    });
    J.objs.forEach(o => { if (o.treme > 0) o.treme--; });
    if (J.dica && --J.dica.t <= 0) J.dica = null;
    J.parts = J.parts.filter(p => p.vida > 0);
    J.textos.forEach(t => { t.y -= 0.7; t.vida--; });
    J.textos = J.textos.filter(t => t.vida > 0);
    if (J.tremor > 0.3) J.tremor *= 0.85; else J.tremor = 0;
    if (J.flash > 0) J.flash = Math.max(0, J.flash - 0.05);
    if (J.superT > 0) J.superT--;
    if (J.aviso && --J.aviso.t <= 0) J.aviso = null;
    [J.jog, ...J.inis].forEach(f => { if (f) f.hpVisto += (f.hp - f.hpVisto) * 0.06; });
  }

  // ---------- Passo do jogo (60 por segundo) ----------
  // Reiniciar (tecla R ou botão ↺ do celular): pede confirmação — apertar
  // de novo em até 3 s volta para a tela inicial, pronta para outro aluno.
  function voltarAoTitulo() {
    J.tela = 'titulo'; J.confirma = -999; J.mortes = 0; J.voltaFase1 = false;
    J.inis = []; J.proj = []; J.chefe = null; J.p2 = null; J.objs = []; J.itens = []; J.dica = null;
    Som.musica(null);
    Som.menu();
  }

  function passo() {
    J.tick++;
    Rede.enviarEstado(false);
    if (pegarGeral('reiniciar') && J.tela !== 'titulo') {
      if (J.tick - J.confirma < 180) voltarAoTitulo();
      else { J.confirma = J.tick; Som.menu(); }
    }
    switch (J.tela) {
      case 'titulo': {
        // Menu: para cima/esquerda = 1 jogador, para baixo/direita = X1
        // (ou teclas 1 e 2); soco/Enter começa.
        const mx = E[0].x + E[1].x, my = E[0].y + E[1].y;
        const d = Math.abs(my) > 0.5 ? Math.sign(my) : Math.abs(mx) > 0.5 ? Math.sign(mx) : 0;
        if (d && d !== J.menuDir) { J.menu = d > 0 ? 1 : 0; Som.menu(); }
        J.menuDir = d;
        const atalho = pegarGeral('modo1', 'modo2');
        if (atalho) J.menu = atalho === 'modo1' ? 0 : 1;
        if (atalho || pegarGeral('soco', 'start', 'chute', 'esp')) { Som.menu(); if (J.menu === 1) novoX1(); else novoJogo(); }
        break;
      }
      case 'pausa':
        if (pegarGeral('pausa', 'start')) J.tela = 'jogo';
        break;
      case 'derrota':
        atualizarEfeitos();
        // 2ª derrota seguida: volta sozinho para a fase 1.
        if (J.voltaFase1) { if (--J.tt <= 0) { J.voltaFase1 = false; novoJogo(); } break; }
        if (--J.tt <= 0) voltarAoTitulo();
        else if (J.tt < 560 && pegarGeral('soco', 'start')) { Som.menu(); reiniciarFase(); }
        break;
      case 'vitoria':
        atualizarEfeitos();
        if (J.tt > 0) J.tt--;
        else if (pegarGeral('soco', 'start')) voltarAoTitulo();
        if (J.tick % 20 === 0) faiscas(rnd(100, W - 100), rnd(80, 260), ['#ffd166', '#7dd3fc', '#ff8fa3'][J.tick % 3], 16);
        break;
      case 'vitoriaX1':
        atualizarEfeitos();
        if (J.tt > 0) J.tt--;
        else if (pegarGeral('soco', 'start')) { Som.menu(); novoX1(); }
        else if (pegarGeral('esp', 'chute')) voltarAoTitulo();
        if (J.tick % 20 === 0) faiscas(rnd(100, W - 100), rnd(80, 260), ['#ffd166', '#7dd3fc', '#ff8fa3'][J.tick % 3], 16);
        break;
      default: if (J.modo === 'x1') atualizarX1(); else atualizarJogo();
    }
    E.forEach(en => en.limpar());
  }

  function atualizarJogo() {
    if (pegarGeral('pausa')) { J.tela = 'pausa'; return; }
    if (J.congelar > 0) { J.congelar--; atualizarEfeitos(); return; }
    // Super: o tempo para (só o Kaito carrega o golpe).
    if (J.superT > 0) { atualizarSuper(); return; }
    if (J.lento > 0) { J.lento--; if (J.tick % 3) { atualizarEfeitos(); return; } }
    if (J.travado > 0) J.travado--;

    // Surgem até 3 inimigos de cada vez (na luta do chefe, só os guardas).
    const vivos = J.inis.filter(e => e.estado !== 'ko').length;
    if (J.fila.length && vivos < 3 && J.travado < 60 && J.tick % 40 === 0) surgir(J.fila.shift());

    engajar();
    atualizarJogador(J.jog, E[0]);
    J.inis.forEach(atualizarInimigo);
    atualizarProjeteis();
    empurrar();
    atualizarEfeitos();
    atualizarItens();
    J.inis = J.inis.filter(e => !(e.estado === 'ko' && e.et > 60));

    const p = J.jog;
    if (p.estado === 'ko' && p.et > 70) {
      J.tela = 'derrota';
      J.mortes++;
      Som.musica(null);
      if (J.mortes >= 2) {
        J.voltaFase1 = true; J.tt = 300;
      } else J.tt = 600;
      return;
    }
    if (p.estado === 'ko') return;

    if (J.trans > 0) {
      if (--J.trans === 0) {
        if (J.fase < FASES.length - 1) {
          p.hp = Math.min(p.T.hp, p.hp + 45);
          comecarFase(J.fase + 1);
        } else vencer();
      }
      return;
    }
    if (!J.fila.length && !J.inis.length) {
      const ondas = FASES[J.fase].ondas;
      if (J.onda < ondas.length - 1) {
        J.onda++;
        J.fila = ondas[J.onda].slice();
        colocarObjetos(J.fase, J.onda);
        J.aviso = { txt: `ONDA ${J.onda + 1}`, t: 80 };
      } else if (J.fase < FASES.length - 1) {
        J.trans = 170;
        J.pontos += p.hp * 10;
        J.aviso = { txt: 'FASE CONCLUÍDA!', sub: `Bônus de vida: ${p.hp * 10} · +45 de vida`, t: 170 };
        p.estado = 'vitoria'; p.vx = 0;
        J.mortes = 0;
        Som.fase();
      } else {
        J.trans = 160;
        J.aviso = { txt: 'K.O.!', sub: 'O Imperador caiu!', t: 160 };
        p.estado = 'vitoria'; p.vx = 0;
      }
    }
  }

  // Itens que saem das caixas: pulam, ficam 12 s no chão (piscam no fim) e
  // valem quando o lutador passa por cima, no chão.
  function atualizarItens() {
    const p = J.jog;
    J.itens.forEach(it => {
      it.t++; it.vida--;
      if (it.z > 0 || it.vz > 0) { it.vz -= GRAV; it.z = Math.max(0, it.z + it.vz); if (it.z === 0) it.vz = 0; }
      if (it.z > 0 || p.estado === 'ko' || !noChao(p) || Math.abs(p.x - it.x) > 34) return;
      const I = ITENS[it.tipo];
      I.pegar(p);
      it.vida = 0;
      texto(it.x, CHAO - 120, I.txt, I.cor, 22);
      Som.item();
      Fx('item', it);
    });
    J.itens = J.itens.filter(it => it.vida > 0);
  }

  // Super: o tempo para (só quem soltou o golpe se mexe).
  function atualizarSuper() {
    atualizarEfeitos();
    [J.jog, J.p2].forEach(p => { if (p && p.estado === 'golpe' && p.golpe.superGolpe) atualizarGolpe(p); });
  }

  // ---------- X1: um aluno contra o outro ----------
  let aoPedirCelular = null;
  function novoX1() {
    J.modo = 'x1';
    J.pontos = 0; J.vit = [0, 0]; J.round = 0; J.mortes = 0;
    J.jog = novoLutador('jogador', 260, 1); J.jog.controle = 1;
    J.p2 = novoLutador('jogador2', 700, -1); J.p2.controle = 2;
    comecarRound();
    if (!Rede.conectado(2) && aoPedirCelular) aoPedirCelular();
  }
  function comecarRound() {
    J.round++;
    J.fase = (J.round - 1) % FASES.length;
    J.inis = [J.p2]; J.proj = []; J.parts = []; J.textos = []; J.chefe = null; J.fila = []; J.objs = []; J.itens = []; J.dica = null;
    [J.jog, J.p2].forEach((p, i) => Object.assign(p, {
      x: i ? 700 : 260, z: 0, vx: 0, vz: 0, face: i ? -1 : 1, estado: 'parado', golpe: null,
      invul: 0, combo: 0, comboT: 0, hp: p.T.hp, hpVisto: p.T.hp, giro: 0, pv: null,
    }));
    J.tela = 'jogo'; J.travado = 150; J.trans = 0; J.tempo = 99 * 60;
    const decisivo = J.vit[0] === 1 && J.vit[1] === 1;
    J.aviso = { txt: `ROUND ${J.round}`, sub: decisivo ? 'ROUND DECISIVO!' : FASES[J.fase].nome, t: 150, lute: true };
    Som.fase();
    Som.musica(decisivo ? 3 : J.fase);
  }
  function atualizarX1() {
    if (pegarGeral('pausa')) { J.tela = 'pausa'; return; }
    if (J.congelar > 0) { J.congelar--; atualizarEfeitos(); return; }
    if (J.superT > 0) { atualizarSuper(); return; }
    if (J.lento > 0) { J.lento--; if (J.tick % 3) { atualizarEfeitos(); return; } }
    if (J.travado > 0) J.travado--;
    atualizarJogador(J.jog, E[0]);
    atualizarJogador(J.p2, E[1]);
    atualizarProjeteis();
    empurrar();
    atualizarEfeitos();
    if (J.trans > 0) { if (--J.trans === 0) fimDoRound(); return; }
    if (J.travado <= 0 && J.tempo > 0) J.tempo--;
    const ko1 = J.jog.estado === 'ko', ko2 = J.p2.estado === 'ko';
    if (!ko1 && !ko2 && J.tempo > 0) return;
    // Fim do round: K.O. ou tempo esgotado (vence quem tem mais vida).
    let venc = -1;
    if (ko1 !== ko2) venc = ko1 ? 1 : 0;
    else if (!ko1) {
      const a = J.jog.hp / J.jog.T.hp, b = J.p2.hp / J.p2.T.hp;
      venc = a > b ? 0 : b > a ? 1 : -1;
    }
    if (venc >= 0) {
      J.vit[venc]++;
      const w = venc ? J.p2 : J.jog;
      if (w.estado !== 'ko') { w.estado = 'vitoria'; w.vx = 0; w.golpe = null; }
    }
    J.aviso = { txt: !ko1 && !ko2 ? 'TEMPO!' : 'K.O.!', sub: venc < 0 ? 'Empate!' : `${(venc ? J.p2 : J.jog).T.nome} venceu o round`, t: 170 };
    J.trans = 180; J.travado = 200;
  }
  function fimDoRound() {
    if (J.vit[0] >= 2 || J.vit[1] >= 2) {
      J.campeao = J.vit[0] >= 2 ? 0 : 1;
      J.tela = 'vitoriaX1'; J.tt = 90;
      Som.musica(null); Som.fase();
      return;
    }
    comecarRound();
  }

  function vencer() {
    J.pontos += J.jog.hp * 20;
    J.tela = 'vitoria'; J.tt = 120;
    if (J.pontos > J.recorde) { J.recorde = J.pontos; J.novoRecorde = true; try { localStorage.setItem('luta_recorde', String(J.recorde)); } catch (e) {} }
    else J.novoRecorde = false;
    Som.fase();
  }

  // ---------- Camada 2D por cima do Phaser (placar, menus e textos) ----------
  const CONTORNO = '#15100d';

  // Presos ao mundo (seguem a câmera): textos que sobem, vida dos inimigos
  // comuns (o chefe tem a barra grande), item piscando e balões.
  function desenharSobreMundo() {
    J.inis.forEach(f => {
      if (f.controle || f.T.chefe || f.estado === 'ko' || f.hp >= f.T.hp) return;
      const w = 46, y = CHAO - f.z - 178 * f.s;
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(f.x - w / 2 - 1, y - 1, w + 2, 6);
      ctx.fillStyle = '#ff5c5c'; ctx.fillRect(f.x - w / 2, y, w * f.hp / f.T.hp, 4);
    });
    J.textos.forEach(t => {
      const idade = 70 - t.vida, k = idade < 6 ? 0.6 + idade * 0.1 : 1; // estoura ao aparecer
      ctx.save();
      ctx.globalAlpha = clamp(t.vida / 25, 0, 1);
      ctx.translate(t.x, t.y); ctx.scale(k, k);
      txt(t.txt, 0, 0, t.tam, t.cor, 'center');
      ctx.restore();
    });
    [...J.inis, J.jog].forEach(f => f && desenharBalao(f));
  }

  // Balão da provocação: estoura ao aparecer e some aos poucos.
  function desenharBalao(f) {
    if (!f.balao) return;
    const P = PROVOCACOES[f.balao.tipo], idade = BALAO_QUADROS - f.balao.vida;
    const k = 0.6 + 0.4 * clamp(idade / 6, 0, 1);
    ctx.save();
    ctx.globalAlpha = clamp(f.balao.vida / 15, 0, 1);
    ctx.translate(f.x, CHAO - f.z - 215 * f.s - Math.min(idade, 20) * 0.4);
    ctx.scale(k, k);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = CONTORNO; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-10, 20); ctx.lineTo(0, 38); ctx.lineTo(10, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-66, -28, 132, 52, 20); ctx.fill(); ctx.stroke();
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.font = '30px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.fillText(P.emoji, -36, 0);
    ctx.font = '900 22px "Arial Black", Impact, sans-serif';
    ctx.fillStyle = CONTORNO; ctx.fillText(P.fala, 18, 1);
    ctx.restore();
  }

  function txt(s, x, y, tam, cor, alinha, borda) {
    ctx.font = `900 ${tam}px "Arial Black", Impact, sans-serif`;
    ctx.textAlign = alinha || 'left'; ctx.textBaseline = 'middle';
    ctx.lineWidth = borda || Math.max(3, tam / 7); ctx.strokeStyle = '#000';
    ctx.strokeText(s, x, y);
    ctx.fillStyle = cor; ctx.fillText(s, x, y);
  }

  function barra(x, y, w, h, frac, vista, cor, invertida) {
    ctx.fillStyle = '#000'; ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = '#4a0d0d'; ctx.fillRect(x, y, w, h);
    const wv = w * clamp(vista, 0, 1), wf = w * clamp(frac, 0, 1);
    ctx.fillStyle = '#ff6b3d'; ctx.fillRect(invertida ? x + w - wv : x, y, wv, h);
    ctx.fillStyle = cor; ctx.fillRect(invertida ? x + w - wf : x, y, wf, h);
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(x, y, w, h / 3);
  }

  // Energia em 4 partes (25 cada); cheia = super. x0 = canto esquerdo.
  function energia(p, x0, y) {
    for (let i = 0; i < 4; i++) {
      const x = x0 + i * 62, cheio = clamp((p.en - i * 25) / 25, 0, 1);
      ctx.fillStyle = '#000'; ctx.fillRect(x - 2, y - 2, 60, 14);
      ctx.fillStyle = '#123'; ctx.fillRect(x, y, 56, 10);
      ctx.fillStyle = p.en >= 100 ? (J.tick % 10 < 5 ? '#fff' : '#7dd3fc') : '#38bdf8';
      ctx.fillRect(x, y, 56 * cheio, 10);
    }
  }

  function desenharHud() {
    const p = J.jog;
    txt(p.T.nome, 24, 22, 20, '#ffd166');
    barra(24, 38, 360, 22, p.hp / p.T.hp, p.hpVisto / p.T.hp, p.hp / p.T.hp < 0.3 ? '#ff3b3b' : '#ffe14d');
    energia(p, 24, 70);
    txt(p.en >= 100 ? 'SUPER PRONTO! (ESPECIAL)' : 'ESPECIAL', 280, 76, 13, p.en >= 100 ? '#7dd3fc' : '#9fb3c8');
    txt(`FASE ${J.fase + 1} · ONDA ${J.onda + 1}/${FASES[J.fase].ondas.length}`, W / 2, 22, 18, '#fff', 'center');
    txt(String(J.pontos).padStart(7, '0'), W - 24, 26, 26, '#fff', 'right');
    txt(`RECORDE ${J.recorde}`, W - 24, 54, 13, '#9fb3c8', 'right');
    txt(Rede.conectado() ? '📱 conectado' : '⌨ teclado', W - 24, 76, 13, Rede.conectado() ? '#4fd1c5' : '#9fb3c8', 'right');
    textoCombo(p, 24, 120, 30, '#ffd166');
    const ch = J.chefe;
    if (ch && ch.estado !== 'ko' && !ch.entrando) {
      txt(ch.T.nome, W / 2, H - 52, 18, '#ff8fa3', 'center');
      barra(W / 2 - 300, H - 36, 600, 18, ch.hp / ch.T.hp, ch.hpVisto / ch.T.hp, ch.furia ? '#ff2d2d' : '#c81d4e', true);
    }
  }

  // HUD do X1: barras espelhadas (esvaziam para fora, como no fliperama),
  // relógio no meio e as vitórias de cada um.
  function desenharHudX1() {
    const a = J.jog, b = J.p2, w = 370;
    barra(24, 30, w, 22, a.hp / a.T.hp, a.hpVisto / a.T.hp, a.hp / a.T.hp < 0.3 ? '#ff3b3b' : '#ffe14d', true);
    barra(W - 24 - w, 30, w, 22, b.hp / b.T.hp, b.hpVisto / b.T.hp, b.hp / b.T.hp < 0.3 ? '#ff3b3b' : '#ffe14d');
    txt(`J1 · ${a.T.nome}`, 24, 70, 20, '#7db4ff');
    txt(`${b.T.nome} · J2`, W - 24, 70, 20, '#ff8f8f', 'right');
    const t = Math.ceil(J.tempo / 60);
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 46, 14, 92, 56);
    txt(String(t).padStart(2, '0'), W / 2, 44, 44, t <= 10 && J.tick % 30 < 15 ? '#ff5c5c' : '#fff', 'center');
    for (let i = 0; i < 2; i++) {
      [[W / 2 - 64 - i * 22, J.vit[0] > i], [W / 2 + 64 + i * 22, J.vit[1] > i]].forEach(([x, ok]) => {
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x, 82, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = ok ? '#ffd166' : '#333'; ctx.beginPath(); ctx.arc(x, 82, 7, 0, Math.PI * 2); ctx.fill();
      });
    }
    energia(a, 24, 92);
    energia(b, W - 24 - 246, 92);
    textoCombo(a, 24, 132, 26, '#7db4ff');
    textoCombo(b, W - 24, 132, 26, '#ff8f8f', 'right');
    const c1 = Rede.conectado(1), c2 = Rede.conectado(2);
    txt(`${c1 ? '📱' : '⌨ WASD + Z/X/C'}`, 24, H - 18, 13, c1 ? '#4fd1c5' : '#9fb3c8');
    txt(`${c2 ? '📱' : '⌨ setas + K/L/Ç'}`, W - 24, H - 18, 13, c2 ? '#4fd1c5' : '#9fb3c8', 'right');
  }

  function desenharAviso() {
    const a = J.aviso;
    if (!a) return;
    const k = clamp(Math.min(a.t, 30) / 30, 0, 1);
    ctx.globalAlpha = k;
    if (a.chefe) { ctx.fillStyle = 'rgba(120,0,0,.35)'; ctx.fillRect(0, H / 2 - 80, W, 160); }
    if (a.lute && a.t < 50) txt('LUTE!', W / 2, H / 2 - 10, 92, '#ff3b3b', 'center', 10);
    else {
      txt(a.txt, W / 2, H / 2 - 30, a.chefe ? 84 : 64, a.chefe ? '#ff3b3b' : '#ffd166', 'center', 9);
      if (a.sub) txt(a.sub, W / 2, H / 2 + 36, 28, '#fff', 'center');
    }
    ctx.globalAlpha = 1;
  }

  // Título: o cenário, o Kaito e o Vulcano são desenhados pelo Phaser; aqui só os textos.
  function desenharTitulo() {
    ctx.save();
    ctx.shadowColor = '#ff5c00'; ctx.shadowBlur = 30;
    txt('PUNHO', W / 2, 110, 92, '#ffd166', 'center', 12);
    txt('LENDÁRIO', W / 2, 200, 92, '#ff6b3d', 'center', 12);
    ctx.restore();
    ['1 JOGADOR · 3 fases e o chefão', 'X1 · um aluno contra o outro'].forEach((o, i) => {
      const sel = J.menu === i, y = 270 + i * 44;
      if (sel) { ctx.fillStyle = 'rgba(125,211,252,.16)'; ctx.fillRect(W / 2 - 230, y - 19, 460, 38); }
      txt((sel ? '▶ ' : '') + o, W / 2, y, sel ? 26 : 20, sel ? '#7dd3fc' : '#cbd5e1', 'center');
    });
    if (J.tick % 60 < 40) txt('Escolha com o analógico ou as setas (ou 1 / 2) · SOCO ou ENTER começa', W / 2, 352, 15, '#ffd166', 'center');
    const linhas = [
      '⌨ Setas: mover · ↑ ou ESPAÇO: pular (2x = pulo duplo) · ↓: agachar · trás defende (agachado: golpe baixo)',
      'Z soco (3x = combo) · X chute · ↓ + X rasteira · → + Z colado = AGARRÃO · C especial · cheia = SUPER',
      'Combos: ↓↘→ + Soco = bola · →↓↘ + Soco = Punho do Dragão · ↓↙← + Chute = Furacão · Soco, Soco, Chute',
      'X1 no teclado: J1 = WASD + Z/X/C/espaço · J2 = setas + K/L/Ç/0 · provocar: Q/E/V e U/I/O',
      'Quebre caixas e barris: 🍗 = vida, ⚡ = energia · 📱 QR · P: pausa · R: reiniciar · M: som · F: tela cheia',
    ];
    linhas.forEach((l, i) => txt(l, W / 2, 396 + i * 24, 14, '#cbd5e1', 'center'));
    if (J.recorde) txt(`RECORDE ${J.recorde}`, W - 20, 24, 14, '#ffd166', 'right');
    avisoSom(522);
  }

  // "N GOLPES!": cresce a cada acerto e volta ao tamanho normal.
  function textoCombo(p, x, y, tam, cor, alinha) {
    if (p.combo < 2) return;
    const k = 1 + Math.max(0, p.comboT - 62) * 0.06;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    txt(`${p.combo} GOLPES!`, 0, 0, tam, cor, alinha);
    ctx.restore();
  }

  // Aviso do inimigo novo (aparece uma vez por partida).
  function desenharDica() {
    const d = J.dica;
    if (!d || J.aviso) return;
    ctx.globalAlpha = clamp(Math.min(d.t, 330 - d.t) / 20, 0, 1);
    ctx.fillStyle = 'rgba(10,8,4,.72)'; ctx.fillRect(W / 2 - 330, 104, 660, 64);
    ctx.fillStyle = '#e07a1f'; ctx.fillRect(W / 2 - 330, 104, 6, 64);
    txt(d.txt, W / 2, 124, 22, '#ffb347', 'center');
    txt(d.sub, W / 2, 152, 16, '#fff', 'center');
    ctx.globalAlpha = 1;
  }

  // O navegador deixa o jogo mudo até alguém clicar NESTE computador.
  function avisoSom(y) {
    if (Som.ativo() || !Som.ligado()) return;
    txt('🔇 Clique na tela do computador para ligar o som', W / 2, y, 15, J.tick % 60 < 40 ? '#ffd166' : '#9aa6ba', 'center');
  }

  // Escurece os cantos da tela (vinheta), feita uma vez e reaproveitada.
  let vinheta = null;
  function desenharVinheta() {
    if (!vinheta) {
      vinheta = document.createElement('canvas'); vinheta.width = 480; vinheta.height = 270;
      const v = vinheta.getContext('2d'), g = v.createRadialGradient(240, 135, 90, 240, 135, 290);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
      v.fillStyle = g; v.fillRect(0, 0, 480, 270);
    }
    ctx.drawImage(vinheta, 0, 0, W, H);
  }

  function desenhar() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, hud.width, hud.height);
    if (!Visual) { // sem Phaser não há mundo para desenhar
      ctx.setTransform(escala, 0, 0, escala, 0, 0);
      ctx.fillStyle = '#05060d'; ctx.fillRect(0, 0, W, H);
      txt('Não deu para carregar o Phaser (o motor gráfico).', W / 2, H / 2 - 20, 26, '#ffd166', 'center');
      txt('Confira a internet do computador e recarregue a página (F5).', W / 2, H / 2 + 20, 18, '#fff', 'center');
      return;
    }
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    desenharVinheta();
    if (J.tela === 'titulo') { desenharTitulo(); return; }
    const v = Visual.vista(); // mesma câmera do Phaser (zoom e tremida)
    ctx.setTransform(v.zoom, 0, 0, v.zoom, hud.width / 2 - v.cx * v.zoom, hud.height / 2 - v.cy * v.zoom);
    desenharSobreMundo();
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    if (J.raio > 0) { ctx.fillStyle = `rgba(230,230,255,${J.raio * 0.6})`; ctx.fillRect(0, 0, W, H); J.raio = Math.max(0, J.raio - 0.08); }
    if (J.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${J.flash})`; ctx.fillRect(0, 0, W, H); }
    if (J.modo === 'x1') desenharHudX1(); else desenharHud();
    desenharDica();
    desenharAviso();
    avisoSom(H - 70);
    if (J.tick - J.confirma < 180) {
      ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(0, H / 2 - 50, W, 100);
      txt('REINICIAR O JOGO?', W / 2, H / 2 - 14, 40, '#ffd166', 'center');
      txt('Aperte ↺ (celular) ou R de novo para voltar à tela inicial', W / 2, H / 2 + 26, 18, '#fff', 'center');
    }
    if (J.tela === 'pausa') {
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, W, H);
      txt('PAUSA', W / 2, H / 2 - 90, 72, '#fff', 'center');
      txt('Aperte P (ou ⏸ no celular) para continuar', W / 2, H / 2 + 30, 20, '#cbd5e1', 'center');
      txt('R (ou ↺ no celular) reinicia o jogo', W / 2, H / 2 + 72, 16, '#9aa6ba', 'center');
      ['COMBINAÇÕES (de frente para o adversário)', '↓ ↘ → + Soco: Bola de Energia (de graça, 1 por vez)', '→ ↓ ↘ + Soco: Punho do Dragão',
        '↓ ↙ ← + Chute: Furacão (até 3 acertos) · → + Soco colado: Agarrão', 'Soco, Soco, Chute: Chute Giratório · Soco, Soco, Soco: Gancho']
        .forEach((l, i) => txt(l, W / 2, H / 2 + 116 + i * 22, i ? 15 : 16, i ? '#e2e8f0' : '#ffd166', 'center'));
    }
    if (J.tela === 'derrota') {
      ctx.fillStyle = 'rgba(40,0,0,.6)'; ctx.fillRect(0, 0, W, H);
      txt('K.O.', W / 2, H / 2 - 70, 110, '#ff3b3b', 'center', 12);
      if (J.voltaFase1) {
        txt('DUAS DERROTAS SEGUIDAS', W / 2, H / 2 + 30, 38, '#ffd166', 'center');
        txt(`Voltando para a FASE 1 em ${Math.ceil(J.tt / 60)}…`, W / 2, H / 2 + 80, 22, '#fff', 'center');
      } else if (J.tt < 560) {
        txt(`CONTINUAR? ${Math.ceil(J.tt / 60)}`, W / 2, H / 2 + 30, 44, '#ffd166', 'center');
        txt('Aperte SOCO ou ENTER para tentar a fase de novo', W / 2, H / 2 + 80, 20, '#fff', 'center');
        txt('Atenção: perder de novo volta para a FASE 1', W / 2, H / 2 + 112, 16, '#ff8fa3', 'center');
      }
    }
    if (J.tela === 'vitoria') {
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, W, H);
      txt('VOCÊ VENCEU!', W / 2, 150, 80, '#ffd166', 'center', 10);
      txt('O Imperador Vulcano foi derrotado', W / 2, 220, 24, '#fff', 'center');
      txt(`PONTOS: ${J.pontos}`, W / 2, 290, 40, '#7dd3fc', 'center');
      if (J.novoRecorde) txt('NOVO RECORDE!', W / 2, 340, 30, '#ff8fa3', 'center');
      if (!J.tt) txt('Aperte SOCO ou ENTER', W / 2, 410, 22, '#cbd5e1', 'center');
    }
    if (J.tela === 'vitoriaX1') {
      const w = J.campeao ? J.p2 : J.jog;
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, W, H);
      txt(`${w.T.nome} VENCEU!`, W / 2, 160, 80, J.campeao ? '#ff8f8f' : '#7db4ff', 'center', 10);
      txt(`JOGADOR ${J.campeao + 1} · ${J.vit[0]} x ${J.vit[1]}`, W / 2, 235, 32, '#fff', 'center');
      if (!J.tt) {
        txt('SOCO ou ENTER: revanche', W / 2, 320, 26, '#ffd166', 'center');
        txt('ESPECIAL ou CHUTE: voltar ao menu', W / 2, 360, 20, '#cbd5e1', 'center');
      }
    }
  }

  // ---------- Celular (Supabase Realtime) ----------
  const Rede = (function () {
    const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', CHAVE = 'luta_sala';
    let canal = null, pronto = false, ultimo = '', enviadoEm = 0, aoConectar = null;
    // id do celular → { slot (1 ou 2), visto }. O 1º celular a falar vira o
    // jogador 1, o 2º vira o jogador 2; vaga sem sinal há 10 s é liberada.
    const slots = new Map();
    function sala() {
      let s = '';
      try { s = sessionStorage.getItem(CHAVE) || ''; } catch (e) {}
      if (!/^[A-HJ-NP-Z2-9]{8}$/.test(s)) {
        const r = new Uint8Array(8); crypto.getRandomValues(r);
        s = Array.from(r, n => LETRAS[n % LETRAS.length]).join('');
        try { sessionStorage.setItem(CHAVE, s); } catch (e) {}
      }
      return s;
    }
    function slotDe(id) {
      id = String(id || 'sem-id').slice(0, 24);
      const agora = performance.now();
      let s = slots.get(id);
      if (!s) {
        const ocupados = [...slots.values()].filter(v => agora - v.visto < 10000).map(v => v.slot);
        const vaga = [1, 2].find(n => !ocupados.includes(n));
        if (!vaga) return 0; // já há 2 celulares: o 3º fica de fora
        for (const [k, v] of slots) if (v.slot === vaga) slots.delete(k);
        s = { slot: vaga, visto: 0 };
        slots.set(id, s);
      }
      const novo = agora - s.visto > 7000;
      s.visto = agora;
      if (novo && aoConectar) aoConectar(s.slot);
      return s.slot;
    }
    // No modo de 1 jogador, qualquer celular controla o Kaito.
    const entradaDe = slot => (J.modo === 'x1' ? E[slot - 1] : E[0]);
    function conectado(slot) {
      const agora = performance.now();
      return [...slots.values()].some(v => (!slot || v.slot === slot) && agora - v.visto < 7000);
    }
    function enviar(evento, payload) {
      if (canal && pronto) canal.send({ type: 'broadcast', event: evento, payload }).catch(() => {});
    }
    function ligar(cb) {
      aoConectar = cb;
      let sb = null;
      try { sb = window.PortalSession && window.PortalSession.client(); } catch (e) {}
      if (!sb || typeof sb.channel !== 'function') return false;
      canal = sb.channel('luta_' + sala(), { config: { broadcast: { self: false } } });
      canal
        .on('broadcast', { event: 'j' }, ({ payload }) => {
          const slot = slotDe(payload && payload.id);
          if (!slot) return;
          const cel = entradaDe(slot).cel;
          cel.x = clamp(Number(payload.x) || 0, -1, 1);
          cel.y = clamp(Number(payload.y) || 0, -1, 1);
          cel.visto = performance.now();
        })
        .on('broadcast', { event: 'b' }, ({ payload }) => {
          const slot = slotDe(payload && payload.id);
          const b = payload && payload.b;
          if (slot && ['soco', 'chute', 'esp', 'pulo', 'pausa', 'reiniciar', 'risada', 'carranca', 'chamar'].includes(b)) entradaDe(slot).apertar(b);
        })
        .on('broadcast', { event: 'ola' }, ({ payload }) => { slotDe(payload && payload.id); enviarEstado(true); })
        .subscribe(st => { pronto = st === 'SUBSCRIBED'; });
      return true;
    }
    function enviarEstado(forcar) {
      if (!canal || !pronto) return;
      const jg = p => (p ? { hp: Math.max(0, Math.round(p.hp)), hpMax: p.T.hp, en: Math.floor(p.en), nome: p.T.nome } : null);
      const ids = {};
      slots.forEach((v, k) => { ids[k] = v.slot; });
      const e = { tela: J.tela, modo: J.modo, fase: J.fase + 1, round: J.round, j: [jg(J.jog), J.modo === 'x1' ? jg(J.p2) : null], ids, pontos: J.pontos };
      const t = JSON.stringify(e), agora = performance.now();
      if (!forcar && (t === ultimo || agora - enviadoEm < 250)) return;
      ultimo = t; enviadoEm = agora;
      enviar('estado', e);
    }
    // vibrar(1 ou 2, ms): no modo de 1 jogador vibra qualquer celular (slot 0).
    const vibrar = (slot, ms) => enviar('vib', { ms, slot: J.modo === 'x1' ? slot : 0 });
    return { sala, ligar, conectado, enviarEstado, vibrar, get ligado() { return !!canal; } };
  })();

  // ---------- Início ----------
  // O canvas do Phaser e o do placar têm o mesmo tamanho em pixels: o mundo
  // (960×540) escala para a janela, com até 2 pixels por ponto em tela fina.
  function ajustar() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const esc = Math.min(innerWidth / W, innerHeight / H);
    const cssW = Math.floor(W * esc), cssH = Math.floor(H * esc);
    hud.style.width = cssW + 'px'; hud.style.height = cssH + 'px';
    hud.parentElement.style.width = cssW + 'px'; hud.parentElement.style.height = cssH + 'px';
    hud.width = Math.floor(cssW * dpr); hud.height = Math.floor(cssH * dpr);
    escala = hud.width / W;
    if (Visual) Visual.redimensionar(hud.width, hud.height, cssW, cssH);
  }

  // Um quadro da tela: avança a lógica em passos fixos de 1/60 s.
  let acc = 0;
  function quadro(dt) {
    acc += Math.min(100, dt);
    while (acc >= 1000 / 60) { passo(); acc -= 1000 / 60; }
  }

  // palco: elemento onde o Phaser cria o canvas dele; placar: canvas 2D por cima.
  // aoConectarCelular(slot): um celular começou a falar; aoPedirCelular():
  // o X1 começou e o jogador 2 ainda não tem celular (a página mostra o QR).
  function iniciar({ palco, placar, aoConectarCelular, aoPedirCelular: pedir }) {
    aoPedirCelular = pedir || null;
    hud = placar; ctx = hud.getContext('2d');
    if (window.Phaser && window.LutaVisual) {
      try {
        Visual = window.LutaVisual.criar({
          palco, W, H, CHAO, J, GOLPES, FASES, OBJETOS, noChao, novoLutador,
          // chamado pelo Phaser a cada quadro: lógica, depois o mundo, depois o placar
          quadro, aoDesenhar: desenhar,
        });
        Fx = Visual.fx;
      } catch (e) { console.error(e); Visual = null; }
    }
    ajustar();
    window.addEventListener('resize', ajustar);
    ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => Som.destravar(), true));
    document.addEventListener('keydown', e => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.code === 'KeyM') { const on = Som.alternar(); texto(W / 2, 120, on ? 'Som ligado' : 'Som desligado', '#fff', 20); return; }
      if (e.code === 'KeyF') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); return; }
      if (/^Arrow|^Space$/.test(e.code)) e.preventDefault();
      if (!e.repeat) {
        if (TECLAS_GERAIS[e.code]) E[0].apertar(TECLAS_GERAIS[e.code]);
        E.forEach(en => { const m = en.mapa; if (m && m.botoes[e.code]) en.apertar(m.botoes[e.code]); });
      }
      Tecla[e.code] = true;
    });
    document.addEventListener('keyup', e => { Tecla[e.code] = false; });
    window.addEventListener('blur', () => { Object.keys(Tecla).forEach(k => { Tecla[k] = false; }); if (J.tela === 'jogo') J.tela = 'pausa'; });
    const ligou = Rede.ligar(aoConectarCelular);
    // Sem Phaser, a lógica roda sozinha só para mostrar o aviso.
    if (!Visual) {
      let ult = performance.now();
      (function loop(agora) { quadro(agora - ult); ult = agora; desenhar(); requestAnimationFrame(loop); })(ult);
    }
    return { sala: Rede.sala(), ligou, conectado: Rede.conectado, modo: () => J.modo };
  }

  return { iniciar };
})();
