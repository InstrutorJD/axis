// Punho Lendário — desenho do mundo com o Phaser 3 (WebGL).
//
// A lógica do jogo continua em luta-jogo.js; este arquivo só desenha:
//   - cenários em 3 camadas (fundo, meio e chão) pintadas uma vez num canvas
//     e viradas textura, com profundidade (o fundo anda menos que o chão
//     quando a câmera mexe) e partes animadas por cima (mar, lanternas,
//     neon, vapor, chuva, relâmpago, antena);
//   - lutadores em vetor (Graphics do Phaser), redesenhados a cada quadro:
//     contorno, sombra em três tons, luz de recorte com a cor da fase,
//     punho fechado, rosto com íris e brilho, cabelo com mechas;
//   - brilhos somados (blend ADD), faíscas, estrelas de impacto, anéis,
//     poeira, câmera que acompanha a luta, fecha nos golpes fortes, no super
//     e no golpe final, e treme.
// Sem imagens: tudo é desenhado por código. O placar fica no canvas 2D de
// luta-jogo.js, por cima deste.
window.LutaVisual = (function () {
  'use strict';
  const RAD = Math.PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const hash = i => { const s = Math.sin(i * 12.9898) * 43758.5453; return s - Math.floor(s); };
  let W, H, CHAO, J, GOLPES, noChao;

  // ---------- Cores ----------
  const cacheCor = new Map();
  // '#rrggbb', 'rgb(...)' ou 'rgba(...)' → { n: 0xrrggbb, a }
  function cor(s) {
    let c = cacheCor.get(s);
    if (c) return c;
    if (s[0] === '#') { const h = s.length === 4 ? s.slice(1).split('').map(d => d + d).join('') : s.slice(1); c = { n: parseInt(h, 16), a: 1 }; }
    else { const v = s.match(/[\d.]+/g).map(Number); c = { n: (v[0] << 16) | (v[1] << 8) | v[2], a: v.length > 3 ? v[3] : 1 }; }
    cacheCor.set(s, c);
    return c;
  }
  function mistura(a, b, t) {
    const r = ((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * t;
    const g = ((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t;
    const z = (a & 255) + ((b & 255) - (a & 255)) * t;
    return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(z);
  }
  const CONTORNO = 0x15100d;
  const sombra = n => mistura(n, 0x1a1030, 0.3); // sombra fria, puxada para o roxo
  const luz = n => mistura(n, 0xffffff, 0.24);
  // Luz de recorte (vinda de trás do lutador) com a cor de cada fase.
  const RECORTES = [0xffa860, 0x5fe8ff, 0xaab8ff];
  let RECORTE = RECORTES[0];

  // ---------- Poses ----------
  // Ângulos de coxa/canela (pF, pT), braços (bF, bT), inclinação do tronco
  // (lean) e da cabeça (cab). F = membro da frente, T = de trás.
  const POSES = {
    soco: (f, P) => { if (f === 'prep') P.bF = [60, 95]; else { P.bF = [90, -2]; P.bT = [-20, 120]; P.lean = 8; P.pF = [26, -24]; P.pT = [-30, -8]; } },
    soco2: (f, P) => { if (f === 'prep') P.bT = [40, 100]; else { P.bT = [92, -2]; P.bF = [50, 110]; P.lean = 12; P.pF = [26, -24]; P.pT = [-30, -8]; } },
    gancho: (f, P) => { if (f === 'prep') { P.bF = [25, 50]; P.lean = 12; P.pF = [40, -60]; P.pT = [-20, -60]; } else { P.bF = [165, -8]; P.lean = -8; P.pF = [12, -6]; P.pT = [-16, -4]; } },
    socoBaixo: (f, P) => { Object.assign(P, AGACHADO()); if (f !== 'prep') P.bF = [80, 0]; },
    chute: (f, P) => { P.bF = [70, 120]; P.bT = [55, 125]; if (f === 'prep') P.pF = [62, -95]; else { P.pF = [98, -4]; P.pT = [-12, -6]; P.lean = -18; } },
    rasteira: (f, P) => { Object.assign(P, AGACHADO()); P.lean = 22; P.pF = f === 'prep' ? [70, -100] : [55, 38]; },
    voadora: (f, P) => { P.pF = [100, -8]; P.pT = [35, -115]; P.lean = -18; P.bF = [80, 110]; P.bT = [-30, 90]; },
    hadouken: (f, P) => { P.pF = [35, -25]; P.pT = [-35, -5]; if (f === 'prep') { P.bF = [-30, 120]; P.bT = [-40, 120]; P.lean = -10; } else { P.bF = [90, 0]; P.bT = [86, 6]; P.lean = 12; } },
    super: (f, P) => { P.pF = [35, -25]; P.pT = [-35, -5]; if (f === 'prep') { P.bF = [172, 0]; P.bT = [160, 0]; P.lean = -6; } else { P.bF = [90, 0]; P.bT = [86, 6]; P.lean = 14; } },
    arremesso: (f, P) => { if (f === 'prep') { P.bF = [-60, 120]; P.lean = -8; } else { P.bF = [100, 10]; P.lean = 10; } },
    socoForte: (f, P) => { if (f === 'prep') { P.bF = [-50, 100]; P.lean = -12; } else { P.bF = [92, 0]; P.lean = 18; P.pF = [30, -20]; P.pT = [-32, -6]; } },
    investida: (f, P) => {
      if (f === 'prep') { Object.assign(P, AGACHADO()); P.bF = [-20, 90]; P.lean = 25; return; }
      const ph = J.tick * 0.5;
      P.lean = 25; P.bF = [95, 0]; P.bT = [-40, 60];
      P.pF = [20 + 30 * Math.sin(ph), -30 - 30 * Math.max(0, Math.cos(ph))]; P.pT = [20 - 30 * Math.sin(ph), -30 - 30 * Math.max(0, -Math.cos(ph))];
    },
    pisao: (f, P, l) => { if (f === 'prep' || noChao(l)) Object.assign(P, AGACHADO()); else { P.pF = [60, -110]; P.pT = [30, -120]; P.bF = [160, 10]; P.bT = [150, 20]; } },
    agachado: (f, P) => Object.assign(P, AGACHADO()),
    chuteGiro: (f, P) => { P.bF = [70, 120]; P.bT = [-40, 90]; if (f === 'prep') { P.pF = [40, -110]; P.lean = 15; } else { P.pF = [92, 4]; P.pT = [-18, -4]; P.lean = -28; } },
    dragao: (f, P) => { if (f === 'prep') { Object.assign(P, AGACHADO()); P.bF = [20, 40]; } else { P.bF = [176, -4]; P.bT = [20, 100]; P.lean = -6; P.pF = [70, -100]; P.pT = [-6, -6]; } },
    furacao: (f, P) => { P.pF = [92, -2]; P.pT = [-30, -50]; P.bF = [100, 0]; P.bT = [-100, 0]; P.lean = 0; },
    // Agarrão: segura com os dois braços e depois joga para a frente, por cima.
    agarra: (f, P) => {
      if (f === 'prep') { P.bF = [88, 18]; P.bT = [82, 24]; P.lean = 8; P.pF = [22, -26]; P.pT = [-26, -10]; }
      else { P.bF = [150, -10]; P.bT = [140, -4]; P.lean = -12; P.pF = [30, -30]; P.pT = [-34, -6]; }
    },
    // Monge: estocada com o bastão e varrida rente ao chão (prepara puxando o bastão para trás).
    estocada: (f, P) => {
      if (f === 'prep') { P.bF = [50, 60]; P.bT = [30, 70]; P.lean = -6; }
      else { P.bF = [92, 0]; P.bT = [78, 8]; P.lean = 12; P.pF = [26, -24]; P.pT = [-30, -8]; }
    },
    varrida: (f, P) => {
      Object.assign(P, AGACHADO());
      if (f === 'prep') { P.bF = [-40, 60]; P.bT = [-60, 50]; P.lean = -6; } else { P.bF = [110, 10]; P.bT = [95, 15]; P.lean = 24; }
    },
  };
  function AGACHADO() { return { pF: [75, -115], pT: [-8, -122], lean: 10, bF: [55, 115], bT: [40, 120] }; }

  function faseDoGolpe(f) {
    const g = f.golpe;
    return f.gt <= g.ini ? 'prep' : f.gt <= g.ini + g.ativo ? 'ativo' : 'rec';
  }

  function poseDe(f) {
    const P = { lean: 0, cab: 0, bF: [40, 112], bT: [22, 125], pF: [18, -28], pT: [-22, -12] };
    const b = Math.sin(J.tick * 0.1 + f.id) * 3;
    switch (f.estado) {
      case 'parado':
        P.bF = [40 + b, 112]; P.bT = [22 + b, 125]; P.pF = [18, -28 + b]; P.pT = [-22, -12 + b];
        if (f.guarda) { P.bF = [72, 125]; P.bT = [62, 130]; P.lean = -6; }
        break;
      case 'andar': {
        const ph = f.passo;
        P.pF = [8 + 26 * Math.sin(ph), -18 - 30 * Math.max(0, Math.cos(ph))];
        P.pT = [8 - 26 * Math.sin(ph), -18 - 30 * Math.max(0, -Math.cos(ph))];
        P.bF = [40 + 8 * Math.sin(ph), 112]; P.lean = 5;
        if (f.guarda) { P.bF = [72, 125]; P.bT = [62, 130]; P.lean = -6; }
        break;
      }
      case 'guarda': P.bF = [75, 125]; P.bT = [65, 130]; P.lean = -8; P.pF = [22, -30]; P.pT = [-28, -10]; break;
      case 'agachar': Object.assign(P, AGACHADO()); if (f.guarda) { P.bF = [80, 125]; P.bT = [70, 130]; P.lean = -4; } break;
      case 'levantar': Object.assign(P, AGACHADO()); break;
      case 'pulo': P.pF = [60, -105]; P.pT = [20, -115]; P.bF = [60, 110]; P.bT = [40, 120]; break;
      case 'dor': P.lean = -22; P.cab = -15; P.bF = [30, 50]; P.bT = [-25, 40]; P.pF = [14, -12]; P.pT = [-28, -8]; break;
      case 'preso': { const o = Math.sin(f.et * 0.9) * 12; P.lean = -18; P.cab = -12; P.bF = [150 + o, 30]; P.bT = [130 - o, 40]; P.pF = [30 + o, -40]; P.pT = [-20 - o, -30]; break; }
      case 'caido': case 'ko': P.bF = [160, 10]; P.bT = [150, 20]; P.pF = [4, 0]; P.pT = [-4, 0]; P.cab = -10; break;
      case 'vitoria': P.bF = [178, -5]; P.bT = [25, 125]; P.lean = -4; break;
      case 'provoca': {
        const o = Math.sin(f.et * 0.7);
        if (f.prov === 'risada') { P.lean = -14 + o * 4; P.cab = -16; P.bF = [15, 75]; P.bT = [-10, 100]; } // mão na barriga, sacudindo
        else if (f.prov === 'carranca') { P.lean = 14 + o; P.cab = 12; P.bF = [-15, 30]; P.bT = [-25, 30]; } // peito estufado, punhos para trás
        else { P.lean = -4; P.bF = [85, 60 + o * 35]; P.bT = [22, 125]; } // braço esticado chamando com a mão
        break;
      }
      case 'golpe': {
        if (!f.golpe) break;
        POSES[f.golpe.pose](faseDoGolpe(f), P, f);
        break;
      }
    }
    return P;
  }

  // Movimento suave: a pose desenhada persegue a pose-alvo em vez de pular
  // direto para ela (golpe e dor perseguem mais rápido).
  function suavizar(f, P) {
    if (!f.pv) { f.pv = { lean: P.lean, cab: P.cab, bF: P.bF.slice(), bT: P.bT.slice(), pF: P.pF.slice(), pT: P.pT.slice() }; return f.pv; }
    const k = ['golpe', 'dor', 'preso'].includes(f.estado) ? 0.6 : 0.3, v = f.pv;
    v.lean += (P.lean - v.lean) * k; v.cab += (P.cab - v.cab) * k;
    ['bF', 'bT', 'pF', 'pT'].forEach(n => { v[n][0] += (P[n][0] - v[n][0]) * k; v[n][1] += (P[n][1] - v[n][1]) * k; });
    return v;
  }

  // Ângulo do bastão do monge (0 = para a frente, positivo = para baixo).
  function anguloBastao(f) {
    if (f.estado === 'golpe' && f.golpe) {
      const fase = faseDoGolpe(f);
      if (f.golpe.pose === 'estocada') return fase === 'prep' ? 8 : 0;
      if (f.golpe.pose === 'varrida') return fase === 'prep' ? 200 : 12;
    }
    if (f.estado === 'dor' || f.estado === 'preso') return -105;
    return -72;
  }

  // ---------- Pincel: formas em cima de um Graphics do Phaser ----------
  // G = Graphics atual; OY = deslocamento vertical da pose (o quadril fica
  // em y = 0 nos cálculos e o Graphics fica nos pés ou no eixo do giro).
  let G = null, OY = 0;
  const mv = p => ({ x: p.x, y: p.y + OY });
  function poli(lista, n, a) { G.fillStyle(n, a === undefined ? 1 : a); G.fillPoints(lista.map(mv), true); }
  // Círculo e elipse como polígono com poucos lados (o fillCircle do Phaser
  // gera centenas de pontos por círculo, caro demais para redesenhar a cada quadro).
  function oval(p, rx, ry, n, a) {
    const lados = clamp(Math.round(Math.max(rx, ry) * 1.3), 8, 28), pts = [];
    for (let i = 0; i < lados; i++) { const t = i / lados * Math.PI * 2; pts.push({ x: p.x + Math.cos(t) * rx, y: p.y + OY + Math.sin(t) * ry }); }
    G.fillStyle(n, a === undefined ? 1 : a); G.fillPoints(pts, true);
  }
  const bola = (p, r, n, a) => oval(p, r, r, n, a);
  // Contorno de uma cápsula afunilada (meio círculo em cada ponta), num polígono só.
  function casca(a, b, ra, rb) {
    const th = Math.atan2(b.y - a.y, b.x - a.x), out = [];
    const nb = clamp(Math.round(rb * 0.6), 4, 10), na = clamp(Math.round(ra * 0.6), 4, 10);
    for (let i = 0; i <= nb; i++) { const t = th - Math.PI / 2 + Math.PI * i / nb; out.push({ x: b.x + Math.cos(t) * rb, y: b.y + Math.sin(t) * rb }); }
    for (let i = 0; i <= na; i++) { const t = th + Math.PI / 2 + Math.PI * i / na; out.push({ x: a.x + Math.cos(t) * ra, y: a.y + Math.sin(t) * ra }); }
    return out;
  }
  const caps = (a, b, ra, rb, n, al) => poli(casca(a, b, ra, rb), n, al);
  // Linha grossa com pontas redondas (sequência de cápsulas).
  function traco(lista, w, n, a) { for (let i = 1; i < lista.length; i++) caps(lista[i - 1], lista[i], w / 2, w / 2, n, a); }
  function curva(p0, c, p1, n) {
    const out = [];
    n = n || 8;
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      out.push({ x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y });
    }
    return out;
  }
  const soma = (p, dx, dy) => ({ x: p.x + dx, y: p.y + dy });

  // ---------- Paleta de cada tipo de lutador ----------
  const cachePaleta = new Map();
  function paletaDe(f) {
    const chave = f.tipo + (f.branco > 0 ? '!' : '');
    let p = cachePaleta.get(chave);
    if (p) return p;
    const c = f.T.cores;
    p = {};
    Object.keys(c).forEach(k => {
      if (typeof c[k] !== 'string' || !/^#|^rgb/.test(c[k])) { p[k] = c[k]; return; }
      const v = cor(c[k]);
      p[k] = f.branco > 0 ? 0xfafaff : v.n;
      if (v.a < 1) p[k + 'A'] = v.a;
    });
    p.olho = f.branco > 0 ? 0xfafaff : ({ jogador: 0x3a2412, jogador2: 0x2c5a8c, ninja: 0x6b21a8, chefe: 0xc0392b, monge: 0x5a3a1a }[f.tipo] || 0x2a1a10);
    cachePaleta.set(chave, p);
    return p;
  }

  // Parte do corpo em três tons: contorno, sombra (embaixo e atrás), tom
  // base (para o lado da luz), brilho e uma lasca de luz de recorte atrás.
  let FC = 1; // para onde o lutador olha (1 = direita), usado na luz
  // Cada parte é desenhada em duas passadas: primeiro o contorno de todas as
  // partes de um membro, depois as cores — assim as juntas (cotovelo,
  // joelho) ficam emendadas, sem anel escuro no meio.
  function contornoParte(a, b, ra, rb, s) { caps(a, b, ra + 1.9 * s, rb + 1.9 * s, CONTORNO); }
  function corParte(a, b, ra, rb, n) {
    caps(a, b, ra, rb, sombra(n));
    const lx = FC * 0.12, ly = -0.12;
    caps(soma(a, ra * lx, ra * ly), soma(b, rb * lx, rb * ly), ra * 0.86, rb * 0.86, n);
    caps(soma(a, FC * ra * 0.34, -ra * 0.4), soma(b, FC * rb * 0.34, -rb * 0.4), ra * 0.24, rb * 0.24, luz(n), 0.7);
    caps(soma(a, -FC * ra * 0.74, -ra * 0.16), soma(b, -FC * rb * 0.74, -rb * 0.16), ra * 0.13, rb * 0.13, mistura(n, RECORTE, 0.45), 0.75);
  }
  function parte(a, b, ra, rb, n, s) { contornoParte(a, b, ra, rb, s); corParte(a, b, ra, rb, n); }
  function circulo(p, r, n, s) {
    bola(p, r + 1.9 * s, CONTORNO);
    bola(p, r, sombra(n));
    bola(soma(p, FC * r * 0.14, -r * 0.14), r * 0.82, n);
    bola(soma(p, FC * r * 0.34, -r * 0.38), r * 0.32, luz(n));
  }
  // Punho fechado: bloco arredondado na direção do antebraço, nós dos dedos e polegar.
  function punho(mao, cot, n, s) {
    const dx = mao.x - cot.x, dy = mao.y - cot.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    const nx = -uy * FC, ny = ux * FC; // "em cima" do punho
    const a = soma(mao, -ux * 2 * s, -uy * 2 * s), b = soma(mao, ux * 3.2 * s, uy * 3.2 * s);
    caps(a, b, 7.6 * s, 7 * s, CONTORNO);
    caps(a, b, 5.8 * s, 5.2 * s, sombra(n));
    caps(soma(a, -nx * s, -ny * s), soma(b, -nx * s, -ny * s), 4.8 * s, 4.2 * s, n);
    caps(soma(a, -nx * 2.6 * s, -ny * 2.6 * s), soma(b, -nx * 2.6 * s, -ny * 2.6 * s), 1.6 * s, 1.4 * s, luz(n));
    for (let i = -1; i <= 1; i++) { // vincos dos dedos
      const p = soma(mao, ux * 6.4 * s + nx * i * 2.6 * s, uy * 6.4 * s + ny * i * 2.6 * s);
      bola(p, 0.9 * s, sombra(sombra(n)));
    }
    caps(soma(mao, -nx * 4 * s, -ny * 4 * s), soma(mao, -nx * 4.2 * s + ux * 4 * s, -ny * 4.2 * s + uy * 4 * s), 2 * s, 1.8 * s, mistura(n, 0xffffff, 0.12)); // polegar
  }

  // ---------- Tronco (coordenadas t = altura 0..1, k = largura) ----------
  const qt = (a, c, b, n) => curva({ x: a[0], y: a[1] }, { x: c[0], y: c[1] }, { x: b[0], y: b[1] }, n).map(p => [p.x, p.y]);
  const FRENTE = qt([0, 12], [0.45, 10.5], [0.625, 13.25], 6).concat(qt([0.625, 13.25], [0.8, 16], [1, 11], 6).slice(1));
  const COSTAS = qt([1, -15], [0.8, -13], [0.625, -11.5], 6).concat(qt([0.625, -11.5], [0.45, -10], [0, -12], 6).slice(1));
  const CONTORNO_TRONCO = FRENTE.concat(COSTAS);
  function kNaBorda(borda, t) {
    for (let i = 1; i < borda.length; i++) {
      const [t0, k0] = borda[i - 1], [t1, k1] = borda[i];
      if ((t - t0) * (t - t1) <= 0) return t1 === t0 ? k0 : k0 + (k1 - k0) * (t - t0) / (t1 - t0);
    }
    return borda[t < 0.5 ? borda.length - 1 : 0][1];
  }
  // Faixa do tronco entre duas curvas k = kA(t) e k = kB(t), de t0 a t1.
  function faixaTronco(em, t0, t1, kA, kB) {
    const ida = [], volta = [];
    for (let i = 0; i <= 8; i++) { const t = t0 + (t1 - t0) * i / 8; ida.push(em(t, kA(t))); volta.push(em(t, kB(t))); }
    return ida.concat(volta.reverse());
  }

  // ---------- Lutador ----------
  function desenharLutador(f, g, gr) {
    const girando = f.estado === 'golpe' && f.golpe && f.golpe.flutua && f.gt > f.golpe.ini;
    const s = f.s, fc = girando && Math.floor(f.gt / 4) % 2 ? -f.face : f.face, P = suavizar(f, poseDe(f));
    const c = paletaDe(f);
    FC = fc;
    const L1 = 33 * s, L2 = 33 * s, TR = 48 * s, A1 = 25 * s, A2 = 25 * s, CAB = 13 * s;
    const pt = (o, ang, len) => ({ x: o.x + Math.sin(ang * RAD) * len * fc, y: o.y + Math.cos(ang * RAD) * len });
    const H0 = { x: 0, y: 0 };
    const jF = pt(H0, P.pF[0], L1), peF = pt(jF, P.pF[0] + P.pF[1], L2);
    const jT = pt(H0, P.pT[0], L1), peT = pt(jT, P.pT[0] + P.pT[1], L2);
    const baixo = Math.max(jF.y, peF.y, jT.y, peT.y) + 3 * s;
    const deitado = f.estado === 'caido' || f.estado === 'ko';

    // Posição do Graphics: nos pés (ou no eixo da cambalhota) e girado.
    let gx = f.x, gy = CHAO - f.z, rot = 0;
    OY = -baixo;
    if (f.giro > 0) { gy -= 70 * s; OY += 70 * s; rot = fc * Math.PI * 2 * (1 - f.giro / 24); }
    if (deitado) {
      const prog = noChao(f) ? 1 : clamp(1 - f.vz / 9, 0.2, 1);
      rot = -fc * Math.PI / 2 * prog; OY -= 12 * s * prog;
    }
    [g, gr].forEach(o => { o.clear(); o.setPosition(gx, gy); o.setRotation(rot); });
    let alfa = 1;
    if (f.invul > 0 && f.estado !== 'golpe' && J.tick % 6 < 3) alfa = 0.45;
    if (f.estado === 'ko' && f.et > 30 && !f.controle && J.tick % 4 < 2) alfa = 0.3;
    g.setAlpha(alfa); gr.setAlpha(alfa);
    G = g;
    const mundo = p => { const y = p.y + OY, cs = Math.cos(rot), sn = Math.sin(rot); return { x: gx + p.x * cs - y * sn, y: gy + p.x * sn + y * cs }; };

    // Eixo do tronco (u, para cima) e a "frente" do corpo (nf).
    const u = { x: Math.sin(P.lean * RAD) * fc, y: -Math.cos(P.lean * RAD) };
    const nf = { x: Math.cos(P.lean * RAD) * fc, y: Math.sin(P.lean * RAD) };
    const em = (t, k) => ({ x: u.x * TR * t + nf.x * k * s, y: u.y * TR * t + nf.y * k * s });
    const S = em(1, 0);
    const ac = P.lean + P.cab;
    const C = { x: S.x + Math.sin(ac * RAD) * (CAB + 9 * s) * fc, y: S.y - Math.cos(ac * RAD) * (CAB + 9 * s) };
    const cab = (fx, fy) => ({ x: C.x + fx * s * fc, y: C.y + fy * s }); // ponto no rosto (fx > 0 = para a frente)
    const oF = em(0.93, 2), oT = em(0.93, -5);
    const cT = pt(oT, P.bT[0], A1), mT = pt(cT, P.bT[0] + P.bT[1], A2);
    const cF = pt(oF, P.bF[0], A1), mF = pt(cF, P.bF[0] + P.bF[1], A2);

    function braco(o, cot, mao) {
      const sup = c.manga === 'nenhuma' ? c.pele : c.roupa;
      const ant = c.manga === 'longa' ? c.roupa : c.pele;
      bola(o, 7.8 * s + 1.9 * s, CONTORNO);
      contornoParte(o, cot, 7.4 * s, 6 * s, s);
      contornoParte(cot, mao, 6.4 * s, 4.8 * s, s);
      corParte(cot, mao, 6.4 * s, 4.8 * s, ant);
      corParte(o, cot, 7.4 * s, 6 * s, sup);
      bola(o, 7.8 * s, sup); bola(soma(o, fc * 2 * s, -2.4 * s), 3 * s, luz(sup), 0.6); // ombro
      if (c.manga === 'curta') { // barra da manga, um pouco mais escura
        const m = { x: o.x + (cot.x - o.x) * 0.8, y: o.y + (cot.y - o.y) * 0.8 };
        caps(m, cot, 6.4 * s, 5.8 * s, sombra(sup));
      }
      const dx = mao.x - cot.x, dy = mao.y - cot.y, d = Math.hypot(dx, dy) || 1;
      if (c.luva !== c.pele) { // faixa no pulso, da cor da luva
        const p1 = soma(mao, -dx / d * 9 * s, -dy / d * 9 * s), p2 = soma(mao, -dx / d * 4 * s, -dy / d * 4 * s);
        caps(p1, p2, 6.4 * s, 6 * s, CONTORNO); caps(p1, p2, 4.6 * s, 4.2 * s, c.luva);
        traco([soma(p1, 0, -1.2 * s), soma(p2, 0, -1.2 * s)], 1.2 * s, luz(c.luva));
      }
      if (c.ouro) { const p = soma(mao, -dx / d * 7 * s, -dy / d * 7 * s); bola(p, 6.4 * s, CONTORNO); bola(p, 5 * s, c.ouro); bola(soma(p, fc * s, -1.5 * s), 1.8 * s, luz(c.ouro)); }
      punho(mao, cot, c.luva, s);
    }
    function perna(joelho, pe) {
      const larga = c.calcaLarga;
      const dedo = { x: pe.x + fc * 12 * s, y: pe.y + 2 * s };
      const rj = larga ? 8.2 * s : 7.2 * s, rp = larga ? 8.8 * s : 5.2 * s;
      contornoParte(pe, dedo, 5 * s, 3.8 * s, s);
      contornoParte(H0, joelho, 10.8 * s, 8.2 * s, s);
      contornoParte(joelho, pe, rj, rp, s);
      corParte(pe, dedo, 5 * s, 3.8 * s, c.pes);
      corParte(joelho, pe, rj, rp, c.calca);
      corParte(H0, joelho, 10.8 * s, 8.2 * s, c.calca);
      // vinco do tecido no joelho
      traco([soma(joelho, -fc * 3 * s, -4 * s), soma(joelho, fc * 2 * s, 1 * s)], 1.3 * s, sombra(sombra(c.calca)));
      if (larga) { // barra da calça larga
        const b1 = { x: joelho.x + (pe.x - joelho.x) * 0.86, y: joelho.y + (pe.y - joelho.y) * 0.86 };
        caps(b1, pe, 8 * s, 8.6 * s, sombra(c.calca));
      }
    }

    // aura de fúria do chefe e brilho do super (desenhados como brilho somado)
    const peito = mundo(em(0.6, 0));
    if (f.furia) brilho(peito.x, peito.y, (95 + Math.sin(J.tick * 0.3) * 12) * s, 0xff2d2d, 0.55, 9);

    // capa do chefe (atrás de tudo)
    if (c.capa) {
      const bal = Math.sin(J.tick * 0.08) * 8 * s - f.vx * 2 * fc * s;
      const ponta = { x: -40 * s * fc + bal, y: 62 * s };
      const capa = [soma(S, 6 * s * fc, -3 * s), soma(S, -18 * s * fc, -3 * s)].concat(curva(soma(S, -18 * s * fc, -3 * s), { x: -48 * s * fc + bal, y: 18 * s }, ponta, 8).slice(1), [{ x: 4 * s * fc, y: 42 * s }]);
      poli(capa, CONTORNO);
      const dentro = [soma(S, 4 * s * fc, -1 * s), soma(S, -16 * s * fc, -1 * s)].concat(curva(soma(S, -16 * s * fc, -1 * s), { x: -45 * s * fc + bal, y: 18 * s }, soma(ponta, 3 * s * fc, -4 * s), 8).slice(1), [{ x: 4 * s * fc, y: 38 * s }]);
      poli(dentro, c.capa);
      poli([soma(S, -10 * s * fc, 0), soma(ponta, 8 * s * fc, -10 * s), { x: -2 * s * fc, y: 34 * s }], sombra(c.capa));
      traco(curva(soma(S, -16 * s * fc, -1 * s), { x: -45 * s * fc + bal, y: 18 * s }, soma(ponta, 3 * s * fc, -4 * s), 6), 1.6 * s, mistura(c.capa, RECORTE, 0.5));
    }

    // rastro do golpe (mão, pé ou ponta do bastão que está batendo)
    const g0 = f.estado === 'golpe' && f.golpe;
    const ativo = g0 && g0.dano && f.gt > g0.ini && f.gt <= g0.ini + g0.ativo + 2;
    const angB = anguloBastao(f);
    const dirB = { x: Math.cos(angB * RAD) * fc, y: Math.sin(angB * RAD) };
    const pontaB = soma(mF, dirB.x * 80 * s, dirB.y * 80 * s), caudaB = soma(mF, -dirB.x * 50 * s, -dirB.y * 50 * s);
    const ponta = !ativo ? null : f.T.bastao ? pontaB : ['chute', 'rasteira', 'voadora', 'chuteGiro'].includes(g0.pose) ? peF : g0.pose === 'soco2' ? mT : mF;
    if (ponta) { f.rastro = f.rastro || []; f.rastro.push({ x: ponta.x, y: ponta.y }); if (f.rastro.length > 7) f.rastro.shift(); } else f.rastro = [];

    braco(oT, cT, mT);
    if (c.ouro) circulo(oT, 8 * s, c.ouro, s);
    perna(jT, peT);

    // tronco
    const contornoT = CONTORNO_TRONCO.map(([t, k]) => em(t, k));
    traco(contornoT.concat([contornoT[0]]), 3.8 * s, CONTORNO);
    const base = c.colete ? c.pele : c.roupa;
    poli(contornoT, base);
    if (c.colete) { // colete aberto: músculos à mostra
      poli(faixaTronco(em, 0.02, 0.98, t => kNaBorda(COSTAS, t) + 0.4, t => -4 + 2 * t), c.roupa);
      poli(faixaTronco(em, 0.02, 0.98, t => Math.min(9 + 2.7 * t, kNaBorda(FRENTE, t) - 0.5), t => kNaBorda(FRENTE, t) - 0.4), c.roupa);
      const ln = sombra(c.pele);
      traco(curva(em(0.72, 2), em(0.6, 8), em(0.72, 13)), 1.6 * s, ln); // peitoral
      [0.3, 0.45].forEach(t => traco([em(t, 2.5), em(t, 10)], 1.4 * s, ln)); // abdômen
      traco([em(0.5, 6.2), em(0.12, 6.2)], 1.2 * s, ln);
    }
    // sombra nas costas e luz de recorte na borda de trás
    poli(faixaTronco(em, 0.02, 0.98, t => kNaBorda(COSTAS, t), t => kNaBorda(COSTAS, t) + 6.5), sombra(c.colete ? c.roupa : base));
    poli(faixaTronco(em, 0.06, 0.94, t => kNaBorda(COSTAS, t) + 0.2, t => kNaBorda(COSTAS, t) + 1.8), mistura(c.colete ? c.roupa : base, RECORTE, 0.55));
    if (c.gola) { // kimono: abertura em V no peito e lapelas
      poli([em(1, 9.5), em(1, -3), em(0.48, 6)], c.pele);
      poli([em(0.98, 1), em(0.62, 5.4), em(0.98, 3.4)], sombra(c.pele));
      const lap = sombra(sombra(c.roupa));
      traco([em(1, -3), em(0.48, 6), em(0.05, 4)], 2.6 * s, lap);
      traco([em(0.48, 6), em(1, 10)], 2.6 * s, lap);
      traco([em(0.8, -9), em(0.32, -3.5)], 1.2 * s, sombra(c.roupa)); // dobras do tecido
      traco([em(0.66, 12), em(0.22, 8.4)], 1.2 * s, sombra(c.roupa));
    }
    if (c.colar) { // contas do colar do monge
      for (let i = 0; i <= 8; i++) {
        const t = i / 8, p = t < 0.5 ? em(1 - t * 1.04, -3 + t * 18) : em(0.48 + (t - 0.5) * 1.04, 6 + (t - 0.5) * 8);
        bola(p, 2.6 * s, CONTORNO); bola(p, 1.9 * s, c.colar); bola(soma(p, fc * 0.5 * s, -0.6 * s), 0.7 * s, luz(c.colar));
      }
    }
    oval(em(0.72, 5.5), 5.5 * s, 9 * s, luz(base), 0.6);

    // faixa na cintura; nó e pontas balançando (pontasFaixa)
    const f1 = em(0.07, 13), f2 = em(0.07, -13), no = em(0.07, 10);
    traco([f1, f2], 8.8 * s, CONTORNO);
    traco([f1, f2], 5.4 * s, c.faixa);
    traco([soma(f1, 0, -1.4 * s), soma(f2, 0, -1.4 * s)], 1.3 * s, luz(c.faixa));
    if (c.pontasFaixa) {
      const bal = Math.sin(J.tick * 0.15 + f.id) * 3 * s - f.vx * 1.5 * fc * s;
      [[4, 17], [8, 15]].forEach(([dx, dy]) => {
        const cv = curva(no, { x: no.x + dx * s * fc, y: no.y + dy * 0.5 * s }, { x: no.x + dx * s * fc + bal, y: no.y + dy * s }, 6);
        traco(cv, 5.8 * s, CONTORNO); traco(cv, 3.2 * s, c.faixa);
      });
      circulo(no, 3.5 * s, c.faixa, s);
    }

    perna(jF, peF);

    // pescoço e cabeça
    parte(S, { x: S.x + (C.x - S.x) * 0.55, y: S.y + (C.y - S.y) * 0.55 }, 6.4 * s, 6 * s, c.pele, s);
    if (c.cabeloTipo === 'longo') {
      const bal = Math.sin(J.tick * 0.07 + f.id) * 4 * s;
      parte(cab(-6, -6), { x: C.x - 20 * s * fc + bal, y: C.y + 26 * s }, 10 * s, 5 * s, c.cabelo, s);
    }
    const queixo = cab(4.5, 9.5), mand = { x: C.x + 1 * s * fc, y: C.y + 2 * s };
    const corRosto = c.mascara ? c.roupa : c.pele;
    oval(C, 11.5 * s + 1.9 * s, 13.2 * s + 1.9 * s, CONTORNO); caps(mand, queixo, 9 * s + 1.9 * s, 6 * s + 1.9 * s, CONTORNO);
    oval(C, 11.5 * s, 13.2 * s, corRosto); caps(mand, queixo, 9 * s, 6 * s, corRosto);
    oval(cab(-4.6, 3), 6.6 * s, 9.6 * s, sombra(corRosto)); // lado de trás na sombra
    oval(cab(4, -6.5), 3.6 * s, 3 * s, luz(corRosto), 0.8); // testa iluminada
    oval(cab(-9.8, -1), 1.3 * s, 8 * s, mistura(corRosto, RECORTE, 0.55), 0.9); // recorte na nuca
    if (c.mascara) poli([cab(0, -4), cab(11.4, -4), cab(11.2, 3), cab(0, 3)], c.pele);
    const orelha = cab(-2.6, 1.6), corO = c.mascara ? c.roupa : c.pele; // orelha
    oval(orelha, 3 * s + 1.4 * s, 3.8 * s + 1.4 * s, CONTORNO); oval(orelha, 3 * s, 3.8 * s, corO);
    if (!c.mascara) traco(curva(cab(-3.6, -0.6), cab(-1.4, 1.4), cab(-3.2, 3.6), 4), 1 * s, sombra(c.pele));

    // cabelo
    if (c.cabeloTipo === 'espetado') {
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const ang = (150 + i * 17) * RAD, r = (i % 2 ? 19.5 : 12.5) * s, atras = i % 2 ? -4 * s : 0;
        pts.push({ x: C.x + (Math.cos(ang) * r + atras) * fc, y: C.y + Math.sin(ang) * r - 1 * s });
      }
      pts.push({ x: C.x + 6 * s * fc, y: C.y - 3 * s }, { x: C.x - 8 * s * fc, y: C.y + 6 * s });
      traco(pts.concat([pts[0]]), 3.2 * s, CONTORNO);
      poli(pts, c.cabelo);
      for (let i = 1; i <= 9; i += 2) { // mechas iluminadas
        const ang = (150 + i * 17) * RAD;
        const p1 = { x: C.x + (Math.cos(ang) * 16.5 * s - 3 * s) * fc, y: C.y + Math.sin(ang) * 16.5 * s - s };
        const p0 = { x: C.x + Math.cos(ang - 0.18) * 9 * s * fc, y: C.y + Math.sin(ang - 0.18) * 9 * s - s };
        traco([p0, p1], 1.6 * s, mistura(c.cabelo, 0xffffff, 0.22));
      }
      traco([cab(-8, -11), cab(-14, -2)], 1.4 * s, mistura(c.cabelo, RECORTE, 0.5));
    } else if (c.cabeloTipo === 'curto' || c.cabeloTipo === 'longo') {
      const pts = [cab(-12, 5)].concat(curva(cab(-12, 5), cab(-14, -15), cab(2, -15), 6).slice(1), curva(cab(2, -15), cab(12, -13), cab(11, -5), 5).slice(1), [cab(-4, -7), cab(-6, 5)]);
      traco(pts.concat([pts[0]]), 3 * s, CONTORNO);
      poli(pts, c.cabelo);
      traco(curva(cab(-8, -9), cab(-6, -13), cab(3, -13), 5), 1.6 * s, mistura(c.cabelo, 0xffffff, 0.22));
    } else if (c.cabeloTipo === 'careca') {
      oval(cab(1.5, -9.5), 4.2 * s, 2.2 * s, luz(luz(c.pele)), 0.8); // brilho da careca
    }
    if (c.barba) {
      const comprida = c.cabeloTipo === 'longo';
      caps(cab(0, 7), cab(5, 12 + (comprida ? 6 : 0)), 7 * s, 4.5 * s, c.barba, c.barbaA);
      if (comprida) traco([cab(2, 9), cab(5, 16)], 1.2 * s, sombra(c.barba));
    }

    // rosto: olho com íris e brilho, sobrancelha, nariz, boca
    const olho = cab(6.2, -1.5);
    oval(olho, 3 * s, 2.2 * s, 0xffffff);
    bola(soma(olho, 0.9 * s * fc, 0), 1.6 * s, c.olho);
    bola(soma(olho, 1.1 * s * fc, 0), 0.8 * s, 0x0b0b0b);
    bola(soma(olho, 1.5 * s * fc, -0.7 * s), 0.5 * s, 0xffffff);
    traco([cab(3.2, -3.2), cab(9.2, -3)], 1.1 * s, CONTORNO); // pálpebra
    const bravo = !f.controle || f.estado === 'golpe';
    const sb1 = cab(2.5, bravo ? -6.8 : -5.6), sb2 = cab(9.8, bravo ? -4 : -5.8);
    const grossa = (f.T.chefe || f.tipo === 'brutamontes' ? 1.5 : 1.15) * s;
    caps(sb1, sb2, grossa, grossa * 0.7, c.mascara ? c.roupa : (c.cabeloTipo === 'careca' ? sombra(sombra(c.pele)) : CONTORNO));
    if (!c.mascara) {
      traco([cab(10.5, -1), cab(13, 3.5), cab(10, 4.5)], 1.3 * s, sombra(c.pele));
      const grita = f.estado === 'dor' || f.estado === 'preso' || deitado || (g0 && f.gt > g0.ini - 3 && f.gt <= g0.ini + g0.ativo + 4);
      const boca = cab(8, 8.5);
      if (grita) { oval(boca, 2.5 * s, 2.9 * s, 0x3a0d0d); bola(soma(boca, 0, -1.4 * s), 1 * s, 0xffffff); }
      else traco([soma(boca, -2 * s * fc, 0), cab(11, 8)], 1.3 * s, CONTORNO);
    }
    if (f.tipo === 'brutamontes') traco([cab(3, -9), cab(8, 2)], 1.4 * s, 0xa0522d); // cicatriz

    // bandana / diadema
    if (c.bandana || c.ouro) {
      const b1 = cab(-12, -4), b2 = cab(11.5, -7.5), corB = c.ouro || c.bandana;
      traco([b1, b2], 7.6 * s, CONTORNO); traco([b1, b2], 4.6 * s, corB);
      traco([soma(b1, 0, -1.2 * s), soma(b2, 0, -1.2 * s)], 1.2 * s, luz(corB));
      if (c.ouro) {
        poli([cab(5, -8), cab(9, -18), cab(13, -8)], CONTORNO); poli([cab(6.2, -8.4), cab(9, -15.6), cab(11.8, -8.4)], c.ouro);
        bola(cab(9, -10.5), 1.4 * s, 0xff3b3b);
      } else {
        const onda = Math.sin(J.tick * 0.25 + f.id) * 5 * s - f.vx * 2 * s;
        [[18, 0], [15, 7]].forEach(([dx, dy]) => {
          const cv = curva(b1, { x: b1.x - dx * 0.5 * s * fc, y: b1.y + dy * 0.5 * s }, { x: b1.x - dx * s * fc, y: b1.y + dy * s + onda }, 6);
          traco(cv, 5.6 * s, CONTORNO); traco(cv, 3.2 * s, corB);
        });
      }
    }

    // bastão do monge (entre a cabeça e o braço da frente: a mão da frente o segura)
    if (f.T.bastao) {
      traco([caudaB, pontaB], 7.6 * s, CONTORNO);
      traco([caudaB, pontaB], 4.4 * s, 0x7a4a22);
      traco([soma(caudaB, 0, -1 * s), soma(pontaB, 0, -1 * s)], 1.2 * s, 0xb07a40);
      [[caudaB, -1], [pontaB, 1]].forEach(([p]) => {
        const q = { x: p.x + (mF.x - p.x) * 0.1, y: p.y + (mF.y - p.y) * 0.1 };
        traco([p, q], 5.6 * s, 0xd9c27a);
      });
      if (ativo) { const pm = mundo(pontaB); brilho(pm.x, pm.y, 26 * s, 0xffd27a, 0.5, 40); }
    }

    braco(oF, cF, mF);
    if (c.ouro) circulo(oF, 8.5 * s, c.ouro, s);

    // rastro do golpe, somado (blend ADD) em cima do lutador
    if (f.rastro && f.rastro.length > 1) {
      G = gr;
      const corR = f.controle === 2 ? 0xffb0b0 : f.controle ? 0xbfe9ff : 0xfff1c9;
      for (let i = 1; i < f.rastro.length; i++) {
        const k = i / f.rastro.length;
        caps(f.rastro[i - 1], f.rastro[i], k * 5 * s, k * 7 * s, corR, k * 0.45);
      }
      G = g;
    }
    // super carregando: brilho nas mãos
    if (g0 && g0.superGolpe && f.gt <= g0.ini) {
      const m = mundo({ x: (mF.x + mT.x) / 2, y: (mF.y + mT.y) / 2 });
      brilho(m.x, m.y, 30 + f.gt * 2.2, 0x7dd3fc, 0.8, 40);
    }
    return { cabeca: mundo(C), peito };
  }

  // ---------- Cenários: pintados uma vez num canvas e virados textura ----------
  const MARGEM = 48;
  function nuvem(ctx, cx, cy, w, h, corS, corL) {
    ctx.fillStyle = corS;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(cx + (i - 2) * w * 0.2, cy + Math.abs(i - 2) * h * 0.12, w * 0.32, h * (0.5 - Math.abs(i - 2) * 0.08), 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = corL;
    ctx.beginPath(); ctx.ellipse(cx, cy + h * 0.32, w * 0.55, h * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  }
  function gradV(ctx, y0, y1, paradas) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    paradas.forEach(([t, c]) => g.addColorStop(t, c));
    return g;
  }
  const ESQ = -MARGEM, LARG = 960 + MARGEM * 2;

  function conteiner(m, x, y, w, h, corC, rotulo) {
    m.fillStyle = corC; m.fillRect(x, y, w, h);
    m.fillStyle = 'rgba(0,0,0,.28)';
    for (let k = 0; k < Math.floor(w / 13); k++) m.fillRect(x + 6 + k * 13, y + 5, 4, h - 10);
    m.fillStyle = 'rgba(255,200,150,.22)'; m.fillRect(x, y, w, 4); // luz do sol na borda de cima
    m.fillStyle = 'rgba(0,0,0,.35)'; m.fillRect(x, y + h - 5, w, 5); m.fillRect(x, y, 4, h);
    m.fillStyle = 'rgba(255,170,110,.35)'; m.fillRect(x + w - 3, y, 3, h); // lado virado para o sol
    if (rotulo) { m.font = 'bold 13px "Arial Black", sans-serif'; m.fillStyle = 'rgba(255,255,255,.55)'; m.fillText(rotulo, x + 12, y + h / 2 + 5); }
    m.strokeStyle = 'rgba(0,0,0,.45)'; m.lineWidth = 2; m.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }
  function guindaste(m, x, d) {
    m.strokeStyle = '#22163a'; m.fillStyle = '#22163a';
    m.fillRect(x, 120, 9, 312); m.fillRect(x + 34, 120, 9, 312);
    m.lineWidth = 3;
    m.beginPath();
    for (let y = 130; y < 430; y += 34) { m.moveTo(x + 4, y); m.lineTo(x + 38, y + 34); m.moveTo(x + 38, y); m.lineTo(x + 4, y + 34); }
    m.stroke();
    m.fillRect(x - 8, 92, 60, 30); // cabine
    m.fillStyle = 'rgba(255,200,120,.75)'; m.fillRect(x + (d > 0 ? 30 : 0), 99, 16, 10);
    m.fillStyle = '#22163a';
    const x0 = d > 0 ? x - 70 : x + 43 + 70, x1 = d > 0 ? x + 240 : x - 197;
    m.fillRect(Math.min(x0, x1), 112, Math.abs(x1 - x0), 8);
    m.fillRect(Math.min(x0, x1), 136, Math.abs(x1 - x0), 5);
    m.lineWidth = 2; m.beginPath();
    for (let k = 0; k < 14; k++) { const a = x0 + (x1 - x0) * k / 14, b = x0 + (x1 - x0) * (k + 1) / 14; m.moveTo(a, 120); m.lineTo(b, 136); }
    m.stroke();
    const cx = x0 + (x1 - x0) * 0.78;
    m.lineWidth = 1.5; m.beginPath(); m.moveTo(cx, 140); m.lineTo(cx, 238); m.stroke();
    m.fillRect(cx - 7, 236, 14, 10);
    m.strokeStyle = 'rgba(255,160,110,.45)'; m.lineWidth = 2;
    m.beginPath(); m.moveTo(x + 43, 120); m.lineTo(x + 43, 432); m.moveTo(Math.min(x0, x1), 112); m.lineTo(Math.max(x0, x1), 112); m.stroke();
  }

  const PINTORES = [
    // Fase 1: porto ao entardecer
    (f, m, c) => {
      f.fillStyle = gradV(f, 0, 400, [[0, '#2b1450'], [0.35, '#6d2a6e'], [0.62, '#c2436b'], [0.85, '#ff9a5c'], [1, '#ffc477']]);
      f.fillRect(ESQ, 0, LARG, 432);
      let g = f.createRadialGradient(700, 300, 10, 700, 300, 340);
      g.addColorStop(0, 'rgba(255,220,150,.8)'); g.addColorStop(0.25, 'rgba(255,170,110,.32)'); g.addColorStop(1, 'rgba(255,140,100,0)');
      f.fillStyle = g; f.fillRect(ESQ, 0, LARG, 432);
      g = f.createRadialGradient(690, 286, 4, 700, 300, 66);
      g.addColorStop(0, '#fffbe6'); g.addColorStop(0.6, '#ffe08a'); g.addColorStop(1, '#ffb25c');
      f.fillStyle = g; f.beginPath(); f.arc(700, 300, 64, 0, Math.PI * 2); f.fill();
      [[150, 90, 260, 46], [520, 60, 300, 40], [860, 120, 240, 40], [330, 190, 220, 30], [760, 215, 200, 24]].forEach(([x, y, w, h]) =>
        nuvem(f, x, y, w, h, 'rgba(84,36,92,.78)', 'rgba(255,150,120,.45)'));
      f.fillStyle = '#5b2a58'; // cidade distante na linha do horizonte
      f.beginPath(); f.moveTo(ESQ, 300);
      for (let x = ESQ; x <= 960 + MARGEM; x += 24) f.lineTo(x, 300 - (hash(x) > 0.55 ? 10 + hash(x + 1) * 26 : 4 + hash(x + 2) * 6));
      f.lineTo(960 + MARGEM, 300); f.closePath(); f.fill();
      f.fillStyle = gradV(f, 298, 432, [[0, '#c45a74'], [0.25, '#6a3a7a'], [0.6, '#2c2c64'], [1, '#191c46']]);
      f.fillRect(ESQ, 298, LARG, 134);
      for (let i = 0; i < 26; i++) { // reflexo do sol no mar
        const y = 304 + i * 4.6, w = 150 - i * 4 + hash(i) * 20;
        f.fillStyle = `rgba(255,214,140,${0.55 - i * 0.018})`; f.fillRect(700 - w / 2 + (hash(i + 5) - 0.5) * 30, y, w, 1.6);
      }
      f.fillStyle = '#2a1838'; // navio ao longe
      f.beginPath(); f.moveTo(200, 296); f.lineTo(330, 296); f.lineTo(318, 308); f.lineTo(212, 308); f.closePath(); f.fill();
      f.fillRect(240, 282, 40, 14); f.fillRect(286, 276, 8, 20);

      guindaste(m, 110, 1); guindaste(m, 470, -1);
      const cores = ['#b5442f', '#2f6db5', '#3c8c4a', '#c9922c', '#7a3c8c'];
      [[-30, 0, 'AXIS'], [90, 1], [330, 2, 'PORTO'], [560, 3], [690, 4, 'LOG'], [840, 0]].forEach(([x, i, r], k) => {
        conteiner(m, x, 374, 112, 58, cores[i], r);
        if (k % 2 === 0) conteiner(m, x + 10, 318, 100, 56, cores[(i + 2) % 5]);
      });
      // cabeços de amarração e cordas
      [250, 520, 790].forEach(x => {
        m.fillStyle = '#2b2230'; m.fillRect(x - 9, 406, 18, 26); m.beginPath(); m.ellipse(x, 406, 13, 5, 0, 0, Math.PI * 2); m.fill();
        m.fillStyle = 'rgba(255,170,110,.4)'; m.fillRect(x + 5, 408, 3, 22);
        m.strokeStyle = '#8a6a44'; m.lineWidth = 3; m.beginPath(); m.moveTo(x, 412); m.quadraticCurveTo(x + 50, 440, x + 110, 418); m.stroke();
      });

      c.fillStyle = gradV(c, 432, 540, [[0, '#8a5c3a'], [0.4, '#6b4630'], [1, '#3a2418']]);
      c.fillRect(ESQ, 432, LARG, 108);
      for (let y = 438, r = 0; y < 540; y += 14 + r * 1.5, r++) {
        c.fillStyle = 'rgba(0,0,0,.32)'; c.fillRect(ESQ, y, LARG, 2);
        c.fillStyle = 'rgba(255,200,150,.12)'; c.fillRect(ESQ, y + 2, LARG, 1);
        for (let x = ESQ + ((r * 97) % 140); x < 960 + MARGEM; x += 140 + hash(r) * 40) {
          c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x, y - 12 - r, 2, 12 + r);
          c.fillStyle = 'rgba(30,20,10,.55)'; c.fillRect(x + 6, y - 6, 2, 2); c.fillRect(x - 8, y - 6, 2, 2); // pregos
        }
      }
      let gs = c.createRadialGradient(700, 450, 10, 700, 450, 260);
      gs.addColorStop(0, 'rgba(255,200,130,.35)'); gs.addColorStop(1, 'rgba(255,200,130,0)');
      c.fillStyle = gs; c.fillRect(ESQ, 432, LARG, 108);
      c.fillStyle = 'rgba(255,190,130,.45)'; c.fillRect(ESQ, 432, LARG, 2);
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(ESQ, 434, LARG, 4);
    },
    // Fase 2: mercado noturno
    (f, m, c) => {
      f.fillStyle = gradV(f, 0, 432, [[0, '#04061a'], [0.6, '#141040'], [1, '#2a1650']]);
      f.fillRect(ESQ, 0, LARG, 432);
      for (let i = 0; i < 90; i++) { f.fillStyle = `rgba(255,255,255,${0.25 + hash(i) * 0.6})`; const r = hash(i + 7) > 0.9 ? 2.4 : 1.4; f.fillRect(ESQ + hash(i + 3) * LARG, hash(i + 9) * 190, r, r); }
      let g = f.createRadialGradient(820, 70, 10, 820, 70, 140);
      g.addColorStop(0, 'rgba(200,210,255,.45)'); g.addColorStop(1, 'rgba(200,210,255,0)');
      f.fillStyle = g; f.fillRect(ESQ, 0, LARG, 260);
      f.fillStyle = '#eef0ff'; f.beginPath(); f.arc(820, 70, 30, 0, Math.PI * 2); f.fill();
      f.fillStyle = 'rgba(160,170,210,.35)'; f.beginPath(); f.arc(812, 64, 7, 0, Math.PI * 2); f.arc(830, 80, 5, 0, Math.PI * 2); f.fill();
      [[0.0, '#0d1230', 180, 0.5], [0.4, '#121839', 120, 0.62]].forEach(([sem, corB, base, luzJ], cam) => {
        for (let i = 0; i < 18; i++) {
          const x = ESQ + i * 62 + hash(i + cam * 40) * 20, h = base + hash(i + 20 + cam * 9) * 140, y = 432 - h;
          f.fillStyle = corB; f.fillRect(x, y, 56, h);
          for (let r = 0; r < h / 16; r++) for (let k = 0; k < 3; k++) if (hash(i * 50 + r * 7 + k + cam * 300) > 0.78) {
            f.fillStyle = hash(i + r + k) > 0.5 ? `rgba(255,210,122,${luzJ})` : `rgba(125,211,252,${luzJ})`;
            f.fillRect(x + 8 + k * 16, y + 10 + r * 16, 8, 9);
          }
        }
      });
      // fachadas da rua
      for (let i = 0; i < 8; i++) {
        const x = ESQ + i * 132, h = 210 + hash(i + 20) * 100, y = 432 - h;
        m.fillStyle = i % 2 ? '#171c40' : '#1d2350'; m.fillRect(x, y, 128, h);
        m.fillStyle = 'rgba(255,255,255,.06)'; m.fillRect(x, y, 128, 3);
        m.fillStyle = 'rgba(0,0,0,.35)'; m.fillRect(x + 124, y, 4, h);
        for (let r = 0; r < 6; r++) for (let k = 0; k < 4; k++) {
          const wx = x + 12 + k * 28, wy = y + 18 + r * 30;
          if (wy > 340) continue;
          m.fillStyle = '#0b0e24'; m.fillRect(wx - 2, wy - 2, 18, 20);
          if (hash(i * 50 + r * 7 + k) > 0.5) { m.fillStyle = hash(i + r + k) > 0.5 ? '#ffd27a' : '#7dd3fc'; m.fillRect(wx, wy, 14, 16); m.fillStyle = 'rgba(0,0,0,.25)'; m.fillRect(wx + 6, wy, 2, 16); }
        }
        m.fillStyle = '#2a2f45'; m.fillRect(x + 6, 372, 116, 60); // porta de aço da loja
        m.fillStyle = 'rgba(0,0,0,.35)'; for (let y2 = 376; y2 < 432; y2 += 6) m.fillRect(x + 6, y2, 116, 2);
      }
      // barracas
      ['#c0392b', '#2471a3', '#d68910', '#7d3c98'].forEach((corB, i) => {
        const x = 30 + i * 245;
        m.fillStyle = '#3a2618'; m.fillRect(x, 392, 160, 40);
        m.fillStyle = 'rgba(255,190,120,.25)'; m.fillRect(x, 392, 160, 3);
        m.fillStyle = '#1a120c'; m.fillRect(x + 4, 360, 6, 34); m.fillRect(x + 150, 360, 6, 34);
        for (let k = 0; k < 6; k++) { m.fillStyle = k % 2 ? corB : '#f4f4f4'; m.beginPath(); m.moveTo(x - 10 + k * 30, 348); m.lineTo(x + 20 + k * 30, 348); m.lineTo(x + 18 + k * 30, 372); m.lineTo(x - 8 + k * 30, 372); m.closePath(); m.fill(); }
        m.fillStyle = 'rgba(0,0,0,.25)'; m.fillRect(x - 10, 368, 180, 4);
        for (let k = 0; k < 4; k++) { m.fillStyle = ['#f2e6c9', '#d9534f', '#f0ad4e', '#5cb85c'][(k + i) % 4]; m.beginPath(); m.ellipse(x + 24 + k * 36, 390, 12, 5, 0, 0, Math.PI * 2); m.fill(); }
      });

      c.fillStyle = gradV(c, 432, 540, [[0, '#353b4d'], [1, '#191c25']]);
      c.fillRect(ESQ, 432, LARG, 108);
      for (let y = 446, r = 0; y < 540; y += 16 + r * 2, r++) {
        c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(ESQ, y, LARG, 2);
        for (let x = ESQ + (r % 2) * 34; x < 960 + MARGEM; x += 68) { c.fillRect(x, y - 14 - r * 2, 2, 14 + r * 2); c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(x + 3, y - 12, 28, 2); c.fillStyle = 'rgba(0,0,0,.35)'; }
      }
      // reflexo dos letreiros e lanternas no chão molhado
      [[160, '#ff4fa3'], [560, '#4fd1c5'], [840, '#ffd166'], [330, '#ff8a3c'], [700, '#ff5c5c']].forEach(([x, corR]) => {
        const gr = c.createLinearGradient(0, 434, 0, 540);
        gr.addColorStop(0, corR + '55'); gr.addColorStop(1, corR + '00');
        c.fillStyle = gr; c.fillRect(x - 26, 434, 52, 106);
      });
      c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(ESQ, 432, LARG, 4);
    },
    // Fase 3: telhado da torre, com chuva
    (f, m, c) => {
      f.fillStyle = gradV(f, 0, 432, [[0, '#05030f'], [0.55, '#1c0d33'], [1, '#2e1450']]);
      f.fillRect(ESQ, 0, LARG, 432);
      let g = f.createRadialGradient(160, 90, 10, 160, 90, 170);
      g.addColorStop(0, 'rgba(245,240,216,.5)'); g.addColorStop(1, 'rgba(245,240,216,0)');
      f.fillStyle = g; f.fillRect(ESQ, 0, LARG, 300);
      f.fillStyle = '#f5f0d8'; f.beginPath(); f.arc(160, 90, 40, 0, Math.PI * 2); f.fill();
      [[220, 110, 300, 40], [600, 70, 380, 50], [900, 150, 260, 36], [420, 200, 260, 30]].forEach(([x, y, w, h]) =>
        nuvem(f, x, y, w, h, 'rgba(22,12,40,.9)', 'rgba(150,130,210,.25)'));
      for (let i = 0; i < 18; i++) {
        const x = ESQ + i * 60, h = 90 + hash(i + 40) * 190;
        f.fillStyle = '#120b26'; f.fillRect(x, 432 - h, 56, h);
        for (let r = 0; r < h / 16; r++) for (let k = 0; k < 3; k++) if (hash(i * 31 + r * 3 + k) > 0.72) { f.fillStyle = 'rgba(255,210,120,.65)'; f.fillRect(x + 8 + k * 16, 442 - h + r * 16, 6, 8); }
      }
      f.fillStyle = '#0e0820'; f.fillRect(520, 60, 26, 372); f.fillRect(510, 120, 46, 8); // torre distante
      // parapeito, caixa d'água, antena, ar-condicionado e canos
      m.fillStyle = '#1a1430'; m.fillRect(ESQ, 396, LARG, 36);
      m.fillStyle = '#2a2244'; m.fillRect(ESQ, 392, LARG, 8);
      m.fillStyle = 'rgba(170,190,255,.18)'; m.fillRect(ESQ, 392, LARG, 2);
      m.fillStyle = '#0d0820';
      m.fillRect(770, 320, 10, 76); m.fillRect(860, 320, 10, 76); m.fillRect(812, 320, 10, 76);
      m.fillStyle = gradV(m, 230, 320, [[0, '#1c1436'], [1, '#100a24']]); m.fillRect(756, 236, 128, 86);
      m.fillStyle = '#0d0820'; m.beginPath(); m.moveTo(750, 238); m.lineTo(820, 206); m.lineTo(890, 238); m.closePath(); m.fill();
      m.fillStyle = 'rgba(0,0,0,.35)'; for (let k = 0; k < 4; k++) m.fillRect(756, 250 + k * 20, 128, 3);
      m.fillStyle = 'rgba(170,190,255,.22)'; m.fillRect(756, 236, 4, 86);
      m.strokeStyle = '#0d0820'; m.lineWidth = 4;
      m.beginPath(); m.moveTo(83, 396); m.lineTo(83, 196); m.stroke();
      m.lineWidth = 1.5; m.beginPath();
      for (let y = 210; y < 390; y += 22) { m.moveTo(70, y); m.lineTo(96, y + 22); m.moveTo(96, y); m.lineTo(70, y + 22); }
      m.moveTo(70, 396); m.lineTo(83, 200); m.lineTo(96, 396); m.stroke();
      [[300, 360, 70, 36], [400, 368, 50, 28]].forEach(([x, y, w, h]) => {
        m.fillStyle = '#231c3a'; m.fillRect(x, y, w, h);
        m.fillStyle = '#120d22'; m.beginPath(); m.arc(x + w * 0.4, y + h / 2, h * 0.32, 0, Math.PI * 2); m.fill();
        m.fillStyle = 'rgba(170,190,255,.18)'; m.fillRect(x, y, w, 2);
      });
      m.fillStyle = '#1e1834'; m.fillRect(560, 380, 200, 8); m.fillRect(752, 340, 8, 48);

      c.fillStyle = gradV(c, 432, 540, [[0, '#3f3b4f'], [1, '#1e1c27']]);
      c.fillRect(ESQ, 432, LARG, 108);
      c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 2; c.beginPath();
      for (let x = -400; x < 960 + 400; x += 80) { c.moveTo(480 + (x - 480) * 0.6, 432); c.lineTo(x, 540); }
      c.moveTo(ESQ, 452); c.lineTo(960 + MARGEM, 452); c.moveTo(ESQ, 486); c.lineTo(960 + MARGEM, 486);
      c.stroke();
      // poças refletindo o céu
      [[200, 470, 90, 9], [610, 500, 120, 11], [860, 462, 70, 7], [420, 524, 80, 8]].forEach(([x, y, w, h]) => {
        const gp = c.createLinearGradient(0, y - h, 0, y + h);
        gp.addColorStop(0, 'rgba(120,110,190,.45)'); gp.addColorStop(1, 'rgba(40,30,80,.35)');
        c.fillStyle = gp; c.beginPath(); c.ellipse(x, y, w, h, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(220,220,255,.25)'; c.fillRect(x - w * 0.5, y - h * 0.3, w * 0.6, 1.5);
      });
      c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(ESQ, 432, LARG, 4);
    },
  ];

  function pintarCenario(n, r) {
    const cw = Math.ceil(LARG * r), ch = Math.ceil(H * r);
    const camadas = ['fundo', 'meio', 'chao'].map(() => {
      const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
      const x = cv.getContext('2d'); x.setTransform(r, 0, 0, r, MARGEM * r, 0);
      return [cv, x];
    });
    PINTORES[n](camadas[0][1], camadas[1][1], camadas[2][1]);
    return camadas.map(c => c[0]);
  }

  // ---------- Brilhos (imagens somadas, reaproveitadas a cada quadro) ----------
  let brilho = () => {};

  // ---------- Criar o jogo do Phaser ----------
  function criar(jogo) {
    ({ W, H, CHAO, J, GOLPES, noChao } = jogo);
    let cena = null, cam = null, base = 1, pend = null;
    const vista = { zoom: 1, cx: W / 2, cy: H / 2 };

    const game = new Phaser.Game({
      type: Phaser.AUTO, parent: jogo.palco, width: W, height: H, backgroundColor: '#05060d',
      scale: { mode: Phaser.Scale.NONE }, banner: false, audio: { noAudio: true },
      input: { keyboard: false, mouse: false, touch: false, gamepad: false },
      render: { antialias: true, antialiasGL: true, powerPreference: 'high-performance' },
      scene: { create() { cena = this; montar(); }, update(t, dt) { quadro(dt); } },
    });

    function redimensionar(pxW, pxH, cssW, cssH) {
      pend = [pxW, pxH, cssW, cssH];
      if (!cena) return;
      game.scale.resize(pxW, pxH);
      game.canvas.style.width = cssW + 'px'; game.canvas.style.height = cssH + 'px';
      cam.setSize(pxW, pxH);
      base = pxW / W;
    }

    // ---- objetos do Phaser ----
    let camadas = [], decor, decorAdd, decorMeio, escuro, objsG, projG, partN, partA, fxN, fxA, chuvaG, neons = [];
    const lutadores = new Map(); // id → { g, gr, sombra, usado }
    const brilhos = []; let nBrilho = 0;
    let faseAtual = -1, exemplos = null;

    function textura(chave, tam, pintar) {
      const cv = document.createElement('canvas'); cv.width = cv.height = tam;
      pintar(cv.getContext('2d'), tam);
      cena.textures.addCanvas(chave, cv);
    }

    function montar() {
      cam = cena.cameras.main;
      textura('brilho', 128, (x, t) => {
        const g = x.createRadialGradient(t / 2, t / 2, 0, t / 2, t / 2, t / 2);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(0.6, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.fillRect(0, 0, t, t);
      });
      textura('sombra', 128, (x, t) => {
        const g = x.createRadialGradient(t / 2, t / 2, 0, t / 2, t / 2, t / 2);
        g.addColorStop(0, 'rgba(0,0,0,.75)'); g.addColorStop(0.55, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g; x.fillRect(0, 0, t, t);
      });
      const add = Phaser.BlendModes.ADD;
      decorMeio = cena.add.graphics().setDepth(1.5);
      decor = cena.add.graphics().setDepth(2.5);
      decorAdd = cena.add.graphics().setDepth(3).setBlendMode(add);
      escuro = cena.add.rectangle(-100, -100, W + 200, H + 200, 0x05061a, 0).setOrigin(0, 0).setDepth(5);
      objsG = cena.add.graphics().setDepth(7);
      projG = cena.add.graphics().setDepth(41);
      partN = cena.add.graphics().setDepth(44);
      partA = cena.add.graphics().setDepth(45).setBlendMode(add);
      fxN = cena.add.graphics().setDepth(49);
      fxA = cena.add.graphics().setDepth(50).setBlendMode(add);
      chuvaG = cena.add.graphics().setDepth(60);
      brilho = (x, y, r, n, a, prof) => {
        let b = brilhos[nBrilho++];
        if (!b) { b = cena.add.image(0, 0, 'brilho').setBlendMode(add); brilhos.push(b); }
        b.setPosition(x, y).setScale(r / 64).setTint(n).setAlpha(clamp(a, 0, 1)).setDepth(prof === undefined ? 45 : prof).setVisible(true);
      };
      if (pend) redimensionar(...pend);
    }

    function montarCenario(n) {
      faseAtual = n;
      RECORTE = RECORTES[n];
      camadas.forEach(i => i.destroy());
      neons.forEach(t => t.destroy()); neons = [];
      ['fundo', 'meio', 'chao'].forEach(k => { if (cena.textures.exists('cen_' + k)) cena.textures.remove('cen_' + k); });
      const r = 2;
      camadas = pintarCenario(n, r).map((cv, i) => {
        const k = 'cen_' + ['fundo', 'meio', 'chao'][i];
        cena.textures.addCanvas(k, cv);
        return cena.add.image(-MARGEM, 0, k).setOrigin(0, 0).setScale(1 / r).setDepth(i);
      });
      if (n === 1) { // letreiros de neon (texto do Phaser com brilho)
        [['RAMEN', 140, 214, '#ff4fa3'], ['DOJÔ', 520, 184, '#4fd1c5'], ['LUTA', 800, 224, '#ffd166']].forEach(([t, x, y, corN]) => {
          const tx = cena.add.text(x, y, t, { fontFamily: '"Arial Black", Impact, sans-serif', fontSize: '34px', color: '#fff8fb', stroke: corN, strokeThickness: 5 })
            .setShadow(0, 0, corN, 16, true, true).setResolution(2).setDepth(1.6);
          tx.cor = Phaser.Display.Color.HexStringToColor(corN).color; tx.x0 = x;
          neons.push(tx);
        });
      }
      amb.length = 0;
    }

    // ---- câmera ----
    let camZ = 1, camX = W / 2, camY = H / 2, socoZ = 0, foco = null, carga = null;
    function atualizarCamera(k) {
      let alvoZ = 1, alvoX = W / 2, alvoY = null, vel = 0.07;
      if (J.tela !== 'titulo') {
        const fs = [J.jog, ...J.inis].filter(f => f && !f.entrando && f.estado !== 'ko');
        if (fs.length) {
          let a = Infinity, b = -Infinity;
          fs.forEach(f => { a = Math.min(a, f.x); b = Math.max(b, f.x); });
          alvoZ = clamp(W / (b - a + 360), 1, 1.12); alvoX = (a + b) / 2;
        }
        const sup = J.superT > 0 && [J.jog, J.p2].find(p => p && p.golpe && p.golpe.superGolpe);
        if (sup) { alvoZ = 1.3; alvoX = sup.x; alvoY = CHAO - 100; vel = 0.2; }
        else if (foco && foco.t > 0) { foco.t -= k; alvoZ = 1.32; alvoX = foco.f.x; alvoY = CHAO - 90; vel = 0.12; }
      }
      const a = 1 - Math.pow(1 - vel, k);
      camZ += (alvoZ - camZ) * a; camX += (alvoX - camX) * a;
      const z = camZ + socoZ;
      socoZ *= Math.pow(0.86, k);
      const mx = W / (2 * z), my = H / (2 * z);
      const yAlvo = alvoY === null ? H - my : clamp(alvoY, my, H - my);
      camY += (yAlvo - camY) * a;
      let cx = clamp(camX, mx, W - mx), cy = clamp(camY, my, H - my);
      if (J.tremor) { cx += rnd(-J.tremor, J.tremor); cy += rnd(-J.tremor, J.tremor); }
      vista.zoom = base * z; vista.cx = cx; vista.cy = cy;
      cam.setZoom(base * z); cam.centerOn(cx, cy);
      return cx;
    }

    // ---- efeitos (só visuais, em tempo real) ----
    const efs = [];
    const amb = []; // partículas do ambiente (vapor, poeira, brasas, respingos)
    function fx(tipo, ...a) {
      if (!cena) return;
      switch (tipo) {
        case 'acerto': {
          const [x, y, pesado, dir] = a;
          efs.push({ tipo: 'estrela', x, y, t: 0, dur: pesado ? 10 : 7, r: pesado ? 46 : 30, ang: rnd(0, 1), cor: pesado ? 0xffd166 : 0xfff3b0 });
          efs.push({ tipo: 'anel', x, y, t: 0, dur: pesado ? 16 : 11, r0: 8, r1: pesado ? 80 : 46, cor: 0xffffff, w: pesado ? 5 : 3 });
          if (pesado) { socoZ = Math.min(0.06, socoZ + 0.035); efs.push({ tipo: 'riscos', x, y, t: 0, dur: 8, dir, cor: 0xffe8a0 }); }
          break;
        }
        case 'defesa': {
          const [x, y, lado] = a;
          efs.push({ tipo: 'escudo', x, y, lado, t: 0, dur: 12 });
          break;
        }
        case 'queda': {
          const [x, s, forte] = a;
          efs.push({ tipo: 'poeiraAnel', x, t: 0, dur: forte ? 26 : 18, w: (forte ? 120 : 70) * s });
          if (forte) socoZ = Math.min(0.06, socoZ + 0.025);
          break;
        }
        case 'ko': {
          const [f, fechar] = a;
          efs.push({ tipo: 'anel', x: f.x, y: CHAO - 90 * f.s, t: 0, dur: 24, r0: 20, r1: 220, cor: 0xffffff, w: 8 });
          efs.push({ tipo: 'linhas', x: f.x, y: CHAO - 90 * f.s, t: 0, dur: 30 });
          if (fechar) foco = { f, t: f.T.chefe ? 110 : 60 };
          break;
        }
        case 'disparo': { const [x, y, t] = a; efs.push({ tipo: 'clarao', x, y, t: 0, dur: 9, r: 60, cor: t === 'bola' ? 0xff7b3b : t === 'shuriken' ? 0xcfd8e3 : 0x7dd3fc }); break; }
        case 'explosao': {
          const [x, y, t] = a, n = t === 'bola' || t === 'onda' ? 0xff7b3b : t === 'shuriken' ? 0xcfd8e3 : t === 'choque' ? 0xffffff : 0x7dd3fc;
          efs.push({ tipo: 'clarao', x, y, t: 0, dur: 14, r: 110, cor: n });
          efs.push({ tipo: 'anel', x, y, t: 0, dur: 14, r0: 10, r1: 70, cor: n, w: 4 });
          for (let i = 0; i < 14; i++) { const an = rnd(0, Math.PI * 2), v = rnd(2, 7); J.parts.push({ x, y, vx: Math.cos(an) * v, vy: Math.sin(an) * v, vida: rnd(12, 22), cor: '#' + n.toString(16).padStart(6, '0'), tam: rnd(2, 5), risco: true }); }
          break;
        }
        case 'superInicio': carga = { f: a[0] }; break;
        case 'superSolta': {
          const f = a[0], y = CHAO - 100 * f.s;
          carga = null;
          efs.push({ tipo: 'anel', x: f.x, y, t: 0, dur: 30, r0: 30, r1: 900, cor: 0x7dd3fc, w: 16 });
          efs.push({ tipo: 'anel', x: f.x, y, t: -6, dur: 30, r0: 30, r1: 700, cor: 0xffffff, w: 8 });
          efs.push({ tipo: 'linhas', x: f.x, y, t: 0, dur: 36 });
          break;
        }
        case 'quebra': { const o = a[0]; efs.push({ tipo: 'poeiraAnel', x: o.x, t: 0, dur: 20, w: 90 }); efs.push({ tipo: 'clarao', x: o.x, y: CHAO - 30, t: 0, dur: 10, r: 70, cor: 0xffe2a8 }); break; }
        case 'item': { const it = a[0]; efs.push({ tipo: 'brilhoItem', x: it.x, t: 0, dur: 30, cor: it.tipo === 'frango' ? 0xffd166 : 0x7dd3fc }); break; }
        case 'arremesso': { socoZ = Math.min(0.06, socoZ + 0.03); break; }
      }
    }

    function desenharEfeitos(k) {
      fxA.clear(); fxN.clear();
      for (let i = efs.length - 1; i >= 0; i--) {
        const e = efs[i];
        e.t += k;
        if (e.t >= e.dur) { efs.splice(i, 1); continue; }
        if (e.t < 0) continue;
        const p = e.t / e.dur, q = 1 - p;
        G = fxA; OY = 0;
        switch (e.tipo) {
          case 'estrela': { // estrela de impacto com pontas
            const pts = [], n = 8, r = e.r * (0.6 + p * 0.6);
            for (let j = 0; j < n * 2; j++) { const an = e.ang + j * Math.PI / n, rr = j % 2 ? r * 0.28 : r * (j % 4 ? 0.7 : 1); pts.push({ x: e.x + Math.cos(an) * rr, y: e.y + Math.sin(an) * rr }); }
            poli(pts, e.cor, q);
            bola({ x: e.x, y: e.y }, r * 0.3, 0xffffff, q);
            brilho(e.x, e.y, e.r * 2.2, e.cor, q * 0.8, 50);
            break;
          }
          case 'anel': fxA.lineStyle(e.w * q + 1, e.cor, q * 0.9); fxA.strokeCircle(e.x, e.y, e.r0 + (e.r1 - e.r0) * (1 - q * q)); break;
          case 'riscos': for (let j = 0; j < 6; j++) {
            const an = (e.dir > 0 ? 0 : Math.PI) + (j - 2.5) * 0.28, r0 = 20 + p * 50, r1 = r0 + 40 * q;
            traco([{ x: e.x + Math.cos(an) * r0, y: e.y + Math.sin(an) * r0 }, { x: e.x + Math.cos(an) * r1, y: e.y + Math.sin(an) * r1 }], 3 * q + 1, e.cor, q);
          } break;
          case 'escudo': { // arco azul virado para quem bateu
            const a0 = (e.lado > 0 ? 0 : Math.PI) - 1.1, r = 34 + p * 14;
            fxA.lineStyle(6 * q + 1, 0x7dd3fc, q); fxA.beginPath(); fxA.arc(e.x, e.y, r, a0, a0 + 2.2); fxA.strokePath();
            fxA.lineStyle(2, 0xffffff, q); fxA.beginPath(); fxA.arc(e.x, e.y, r - 5, a0 + 0.3, a0 + 1.9); fxA.strokePath();
            brilho(e.x, e.y, 70, 0x38bdf8, q * 0.6, 50);
            break;
          }
          case 'poeiraAnel': G = fxN; oval({ x: e.x, y: CHAO + 2 }, e.w * (0.4 + p), 8 + p * 8, 0xd8c8a8, q * 0.35); oval({ x: e.x, y: CHAO + 1 }, e.w * (0.25 + p * 0.7), 4 + p * 4, 0xffffff, q * 0.18); break;
          case 'linhas': { // linhas de velocidade saindo do centro
            for (let j = 0; j < 22; j++) {
              const an = hash(j + e.x) * Math.PI * 2, r0 = 90 + hash(j) * 80 + p * 200, r1 = r0 + 120 * q;
              traco([{ x: e.x + Math.cos(an) * r0, y: e.y + Math.sin(an) * r0 }, { x: e.x + Math.cos(an) * r1, y: e.y + Math.sin(an) * r1 }], 3 * q + 0.5, 0xffffff, q * 0.6);
            }
            break;
          }
          case 'clarao': brilho(e.x, e.y, e.r * (0.7 + p * 0.5), e.cor, q, 50); break;
          case 'brilhoItem': {
            for (let j = 0; j < 8; j++) {
              const an = j * Math.PI / 4 + p * 2, r = 10 + p * 46;
              bola({ x: e.x + Math.cos(an) * r, y: CHAO - 24 - p * 50 + Math.sin(an) * r * 0.5 }, 3 * q + 1, e.cor, q);
            }
            brilho(e.x, CHAO - 30 - p * 40, 80, e.cor, q * 0.7, 50);
            break;
          }
        }
      }
      // super carregando: riscos de energia indo para o lutador
      if (carga && J.superT > 0) {
        const f = carga.f, y = CHAO - 100 * f.s;
        G = fxA;
        for (let j = 0; j < 10; j++) {
          const an = hash(j + J.tick * 0.37) * Math.PI * 2, r = 60 + ((J.tick * 7 + j * 37) % 160);
          traco([{ x: f.x + Math.cos(an) * r, y: y + Math.sin(an) * r }, { x: f.x + Math.cos(an) * (r - 30), y: y + Math.sin(an) * (r - 30) }], 2.5, 0x9be7ff, 0.7);
        }
      } else if (J.superT <= 0) carga = null;
    }

    // ---- partículas (as do jogo em J.parts e as do ambiente) ----
    function desenharParticulas(lista) {
      lista.forEach(p => {
        const a = clamp(p.vida / 20, 0, 1), c = cor(p.cor), n = c.n;
        if (p.fumaca && !p.brilha) { G = partN; bola(p, p.tam * (1.6 - a * 0.6), n, a * c.a * 0.6); return; }
        if (p.normal) { G = partN; if (p.lasca) caps(p, { x: p.x - p.vx * 1.2, y: p.y - p.vy * 1.2 }, p.tam * 0.5, p.tam * 0.4, n, a); else bola(p, p.tam, n, a); return; }
        G = partA;
        if (p.risco) traco([p, { x: p.x - p.vx * 2.2, y: p.y - p.vy * 2.2 }], p.tam * 0.7, n, a * c.a);
        else bola(p, p.tam, n, a * c.a);
      });
    }

    // ---- caixas, barris e itens ----
    function desenharObjetos() {
      G = objsG; OY = 0; objsG.clear();
      J.objs.forEach(o => {
        const x = o.x + (o.treme > 0 ? Math.sin(o.treme * 2.4) * o.treme * 0.5 : 0), y = CHAO;
        oval({ x: o.x, y: y + 3 }, o.larg * 0.62, 6, 0x000000, 0.35);
        if (o.tipo === 'caixa') {
          const w = o.larg, h = o.alt, x0 = x - w / 2, y0 = y - h;
          poli([{ x: x0 - 2, y: y0 - 2 }, { x: x0 + w + 2, y: y0 - 2 }, { x: x0 + w + 2, y: y + 1 }, { x: x0 - 2, y: y + 1 }], CONTORNO);
          poli([{ x: x0, y: y0 }, { x: x0 + w, y: y0 }, { x: x0 + w, y }, { x: x0, y }], 0xa8743a);
          for (let i = 1; i < 4; i++) traco([{ x: x0 + 2, y: y0 + i * h / 4 }, { x: x0 + w - 2, y: y0 + i * h / 4 }], 1.4, 0x6b4320);
          traco([{ x: x0 + 5, y: y - 5 }, { x: x0 + w - 5, y: y0 + 5 }], 6, 0x6b4320);
          traco([{ x: x0 + 5, y: y - 6 }, { x: x0 + w - 5, y: y0 + 4 }], 3, 0xc58c4c);
          [[x0, y0], [x0 + w - 8, y0], [x0, y - 8], [x0 + w - 8, y - 8]].forEach(([a, b]) => poli([{ x: a, y: b }, { x: a + 8, y: b }, { x: a + 8, y: b + 8 }, { x: a, y: b + 8 }], 0x55555f));
          traco([{ x: x0 + 2, y: y0 + 2 }, { x: x0 + w - 2, y: y0 + 2 }], 2, 0xd9a566);
          poli([{ x: x0 + w - 6, y: y0 + 8 }, { x: x0 + w, y: y0 + 8 }, { x: x0 + w, y: y - 8 }, { x: x0 + w - 6, y: y - 8 }], 0x6b4320, 0.6);
        } else {
          const w = o.larg, h = o.alt, x0 = x - w / 2, y0 = y - h;
          caps({ x, y: y0 + 8 }, { x, y: y - 8 }, w / 2 + 2, w / 2 + 2, CONTORNO);
          caps({ x, y: y0 + 8 }, { x, y: y - 8 }, w / 2, w / 2, 0x8a4b22);
          caps({ x: x - w * 0.12, y: y0 + 9 }, { x: x - w * 0.12, y: y - 9 }, w * 0.28, w * 0.28, 0xa65d2c);
          caps({ x: x - w * 0.22, y: y0 + 10 }, { x: x - w * 0.22, y: y - 10 }, w * 0.07, w * 0.07, 0xd08a4e);
          for (let i = -1; i <= 1; i += 2) traco([{ x: x + i * w * 0.18, y: y0 + 4 }, { x: x + i * w * 0.18, y: y - 4 }], 1.2, 0x5a2e12);
          [0.2, 0.8].forEach(t => traco([{ x: x0 + 1, y: y0 + h * t }, { x: x0 + w - 1, y: y0 + h * t }], 4.5, 0x4a4a55));
          [0.2, 0.8].forEach(t => traco([{ x: x0 + 4, y: y0 + h * t - 1 }, { x: x0 + w * 0.5, y: y0 + h * t - 1 }], 1.2, 0x9aa0b0));
          oval({ x, y: y0 + 4 }, w / 2 - 3, 4, 0x5a2e12);
        }
      });
      J.itens.forEach(it => {
        if (it.vida < 120 && Math.floor(it.vida / 6) % 2) return; // pisca antes de sumir
        const bob = it.z > 0 ? 0 : Math.sin(it.t * 0.12) * 3, y = CHAO - it.z - 16 - bob;
        oval({ x: it.x, y: CHAO + 2 }, 18, 4, 0x000000, 0.35);
        if (it.tipo === 'frango') {
          brilho(it.x, y, 46, 0xffc04d, 0.35 + Math.sin(it.t * 0.15) * 0.1, 8);
          caps({ x: it.x + 4, y: y + 2 }, { x: it.x + 16, y: y - 8 }, 3.6, 3, CONTORNO); caps({ x: it.x + 4, y: y + 2 }, { x: it.x + 16, y: y - 8 }, 2.2, 1.8, 0xf3ead7);
          bola({ x: it.x + 17, y: y - 11 }, 4.4, CONTORNO); bola({ x: it.x + 19, y: y - 8 }, 4.4, CONTORNO);
          bola({ x: it.x + 17, y: y - 11 }, 3, 0xf3ead7); bola({ x: it.x + 19, y: y - 8 }, 3, 0xf3ead7);
          caps({ x: it.x - 8, y: y + 6 }, { x: it.x + 3, y: y + 1 }, 13, 9, CONTORNO);
          caps({ x: it.x - 8, y: y + 6 }, { x: it.x + 3, y: y + 1 }, 11, 7.4, 0xa8551e);
          caps({ x: it.x - 9, y: y + 4 }, { x: it.x + 2, y: y }, 8.5, 5.5, 0xd2782f);
          oval({ x: it.x - 11, y: y }, 3.2, 2, 0xffd59a, 0.9);
        } else {
          brilho(it.x, y, 52, 0x7dd3fc, 0.5 + Math.sin(it.t * 0.2) * 0.15, 8);
          const pts = [[-4, -18], [8, -18], [2, -4], [10, -4], [-6, 18], [-1, 2], [-9, 2]].map(([a, b]) => ({ x: it.x + a, y: y + b }));
          traco(pts.concat([pts[0]]), 3.4, CONTORNO); poli(pts, 0xffe14d);
          poli([[-2, -15], [5, -15], [0, -5], [4, -5]].map(([a, b]) => ({ x: it.x + a, y: y + b })), 0xffffff, 0.8);
        }
      });
    }

    // ---- projéteis ----
    function desenharProjeteis() {
      G = projG; OY = 0; projG.clear();
      J.proj.forEach(pr => {
        const y = CHAO - pr.z, d = Math.sign(pr.vx) || 1;
        if (pr.tipo === 'shuriken') {
          const pts = [];
          for (let i = 0; i < 8; i++) { const r = i % 2 ? 4 : 13, a = i * Math.PI / 4 + pr.t * 0.5; pts.push({ x: pr.x + Math.cos(a) * r, y: y + Math.sin(a) * r }); }
          poli(pts.map(p => ({ x: pr.x + (p.x - pr.x) * 1.25, y: y + (p.y - y) * 1.25 })), CONTORNO);
          poli(pts, 0xcfd8e3); bola({ x: pr.x, y }, 2.5, 0x3a3f4a);
          brilho(pr.x - d * 10, y, 30, 0xcfd8e3, 0.3, 40);
        } else if (pr.tipo === 'onda') {
          const h = 28 + Math.sin(pr.t * 0.6) * 6;
          brilho(pr.x, CHAO - 14, 70, 0xff5c00, 0.8, 40);
          poli(curva({ x: pr.x - 20, y: CHAO }, { x: pr.x - d * 6, y: CHAO - h * 2 }, { x: pr.x + 20, y: CHAO }, 10), 0xff9a3c, 0.9);
          poli(curva({ x: pr.x - 11, y: CHAO }, { x: pr.x - d * 4, y: CHAO - h * 1.2 }, { x: pr.x + 11, y: CHAO }, 8), 0xffe0a0, 0.9);
        } else {
          const azul = pr.tipo === 'fogo', r = pr.raio + Math.sin(pr.t * 0.8) * 2;
          const corE = azul ? 0x38bdf8 : 0xff3b00, corM = azul ? 0x7dd3fc : 0xff7b3b;
          brilho(pr.x, y, r * 4, corE, 0.9, 40);
          brilho(pr.x - d * r, y, r * 2.6, corM, 0.7, 40);
          // chamas para trás
          for (let i = 0; i < 3; i++) {
            const w = Math.sin(pr.t * 0.9 + i * 2) * r * 0.35;
            poli([{ x: pr.x, y: y - r * 0.8 + i * r * 0.8 }, { x: pr.x - d * r * (2.2 + i * 0.3), y: y - r * 0.5 + i * r * 0.5 + w }, { x: pr.x, y: y - r * 0.2 + i * r * 0.5 }], corM, 0.75);
          }
          bola({ x: pr.x, y }, r, corM);
          bola({ x: pr.x, y }, r * 0.62, azul ? 0xd6f3ff : 0xffd27a);
          bola({ x: pr.x + d * r * 0.15, y: y - r * 0.15 }, r * 0.32, 0xffffff);
          for (let i = 0; i < 3; i++) { const a = pr.t * 0.35 + i * 2.1; bola({ x: pr.x + Math.cos(a) * r * 1.25, y: y + Math.sin(a) * r * 1.25 }, 2.4, 0xffffff, 0.85); }
        }
      });
    }

    // ---- partes animadas de cada cenário ----
    let raioX = 0, raioAntes = 0, piscaNeon = 1;
    function desenharDecor(n, k, offMeio) {
      decor.clear(); decorAdd.clear(); decorMeio.clear(); chuvaG.clear();
      decorMeio.x = offMeio;
      const t = J.tick;
      if (n === 0) {
        G = decorAdd; OY = 0;
        for (let i = 0; i < 16; i++) { // brilho do sol dançando no mar
          const y = 312 + i * 7, x = 700 + Math.sin(t * 0.03 + i * 1.7) * (30 + i * 3), w = 40 + hash(i) * 50 - i;
          traco([{ x: x - w / 2 + offMeio * 0.4, y }, { x: x + w / 2 + offMeio * 0.4, y }], 1.6, 0xffd68c, 0.25 + 0.25 * Math.sin(t * 0.08 + i));
        }
        brilho(700 + offMeio * 0.4, 300, 200 + Math.sin(t * 0.02) * 10, 0xffb060, 0.22, 0.5);
        G = decor;
        for (let i = 0; i < 3; i++) { // gaivotas
          const x = ((t * (0.5 + i * 0.15) + i * 330) % (W + 200)) - 100, y = 120 + i * 34 + Math.sin(t * 0.03 + i) * 8, bat = Math.sin(t * 0.25 + i * 2) * 5;
          traco(curva({ x: x - 9, y: y - bat }, { x: x - 4, y: y - 4 }, { x, y }, 4).concat(curva({ x, y }, { x: x + 4, y: y - 4 }, { x: x + 9, y: y - bat }, 4).slice(1)), 1.8, 0x2a1838);
        }
        if (t % 9 === 0 && amb.length < 40) amb.push({ x: rnd(0, W), y: rnd(200, 430), vx: rnd(-0.2, 0.2), vy: rnd(-0.3, -0.1), vida: 160, cor: '#ffd9a0', tam: rnd(1, 2), fumaca: true, brilha: true, lento: true });
      } else if (n === 1) {
        piscaNeon = 1;
        neons.forEach((tx, i) => {
          const a = Math.sin(t * 0.07 + i * 3) > -0.85 ? 1 : 0.25;
          tx.setAlpha(a); tx.x = tx.x0 + offMeio;
          brilho(tx.x + tx.width / 2, tx.y + tx.height / 2, tx.width * 1.1, tx.cor, 0.35 * a, 1.55);
          brilho(tx.x + tx.width / 2, CHAO + 30, 60, tx.cor, 0.18 * a, 3);
        });
        G = decorMeio; OY = 0;
        const fio = curva({ x: -20, y: 296 }, { x: W / 2, y: 356 }, { x: W + 20, y: 296 }, 16);
        traco(fio, 1.6, 0x2a2a35);
        for (let i = 0; i < 10; i++) {
          const x = 40 + i * 96, y0 = 296 + Math.sin((x / W) * Math.PI) * 30, ang = Math.sin(t * 0.04 + i) * 0.12;
          const cx = x + Math.sin(ang) * 14, cy = y0 + 14 + Math.cos(ang) * 4, corL = i % 2 ? 0xff5c5c : 0xffb347;
          traco([{ x, y: y0 }, { x: cx, y: cy - 12 }], 1.2, 0x2a2a35);
          oval({ x: cx, y: cy }, 12, 15, CONTORNO); oval({ x: cx, y: cy }, 10.5, 13.5, corL);
          oval({ x: cx - 3, y: cy - 2 }, 4, 8, luz(corL), 0.8);
          [-6, 0, 6].forEach(dy => traco([{ x: cx - 9, y: cy + dy }, { x: cx + 9, y: cy + dy }], 1, sombra(corL), 0.6));
          poli([{ x: cx - 6, y: cy - 15 }, { x: cx + 6, y: cy - 15 }, { x: cx + 5, y: cy - 12 }, { x: cx - 5, y: cy - 12 }], 0x2a1a10);
          poli([{ x: cx - 5, y: cy + 12 }, { x: cx + 5, y: cy + 12 }, { x: cx + 6, y: cy + 15 }, { x: cx - 6, y: cy + 15 }], 0x2a1a10);
          brilho(cx + offMeio, cy, 46 + Math.sin(t * 0.1 + i) * 4, corL, 0.45, 1.6);
        }
        if (t % 5 === 0) amb.push({ x: 300 + rnd(-30, 30), y: 380, vx: rnd(-0.3, 0.3), vy: rnd(-1.2, -0.6), vida: 70, cor: 'rgba(230,230,240,.5)', tam: rnd(5, 9), fumaca: true });
      } else {
        // antena piscando
        brilho(83 + offMeio, 198, 26, 0xff3b3b, t % 60 < 30 ? 0.9 : 0.15, 1.6);
        // relâmpago (J.raio é ligado pela lógica)
        if (J.raio > raioAntes + 0.3) raioX = rnd(200, W - 200);
        raioAntes = J.raio;
        if (J.raio > 0.4) {
          G = decorAdd; OY = 0;
          let p = { x: raioX, y: 0 };
          const pts = [p];
          for (let i = 0; i < 9; i++) { p = { x: p.x + rnd(-30, 30), y: p.y + 40 }; pts.push(p); }
          traco(pts, 6, 0x8f9cff, J.raio * 0.5); traco(pts, 2, 0xffffff, J.raio);
          brilho(raioX, 120, 300, 0xb0b8ff, J.raio * 0.4, 3);
        }
        // chuva com vento, e respingos no chão
        chuvaG.lineStyle(1.3, 0xaabfff, 0.38);
        for (let i = 0; i < 120; i++) {
          const x = (hash(i) * (W + 100) + t * 3.2) % (W + 100) - 50, y = (hash(i + 99) * H + t * 15 * (0.8 + hash(i + 5) * 0.4)) % H;
          chuvaG.lineBetween(x, y, x - 4, y + 15);
        }
        if (t % 2 === 0) for (let i = 0; i < 2; i++) efs.push({ tipo: 'respingo', x: rnd(0, W), y: rnd(CHAO - 30, H - 10), t: 0, dur: 10 });
        G = chuvaG; OY = 0;
        for (let i = efs.length - 1; i >= 0; i--) {
          const e = efs[i];
          if (e.tipo !== 'respingo') continue;
          const q = 1 - e.t / e.dur;
          chuvaG.lineStyle(1, 0xc8d4ff, q * 0.6); chuvaG.strokeEllipse(e.x, e.y, 10 * (1 - q) + 3, 3 * (1 - q) + 1);
        }
        // brasas do chefe em fúria
        const ch = J.chefe;
        if (ch && ch.furia && ch.estado !== 'ko' && t % 2 === 0) J.parts.push({ x: ch.x + rnd(-34, 34), y: CHAO - rnd(20, 190) * ch.s, vx: rnd(-0.6, 0.6), vy: rnd(-2.6, -1.2), vida: 30, cor: '#ff7a2a', tam: rnd(1.5, 3.5), fumaca: true, brilha: true });
      }
    }

    // ---- quadro ----
    function quadro(dt) {
      jogo.quadro(dt);
      const k = clamp(dt / (1000 / 60), 0.25, 4); // quadros de 60 por segundo
      nBrilho = 0;
      const n = J.tela === 'titulo' ? 1 : J.fase;
      if (n !== faseAtual) montarCenario(n);
      const cx = atualizarCamera(k);
      const offFundo = (cx - W / 2) * 0.7, offMeio = (cx - W / 2) * 0.35;
      camadas[0].x = -MARGEM + offFundo; camadas[1].x = -MARGEM + offMeio; camadas[2].x = -MARGEM;
      desenharDecor(n, k, offMeio);
      escuro.setAlpha(J.tela === 'titulo' ? 0.55 : J.superT > 0 ? 0.65 : 0);

      // lutadores: inimigos atrás, quem tem controle na frente
      let lista;
      if (J.tela === 'titulo') {
        if (!exemplos) {
          exemplos = [jogo.novoLutador('jogador', 140, 1), jogo.novoLutador('chefe', 760, -1)];
          exemplos[0].id = 1001; exemplos[1].id = 1002; exemplos[1].furia = true;
        }
        const ex = exemplos[0];
        ex.estado = J.tick % 160 < 30 ? 'golpe' : 'parado';
        if (ex.estado === 'golpe') { ex.golpe = GOLPES.hadouken; ex.gt = J.tick % 160 < 12 ? 5 : 20; } else ex.golpe = null;
        lista = exemplos;
      } else lista = [...J.inis, J.jog].filter(Boolean).sort((a, b) => (a.controle ? 1 : 0) - (b.controle ? 1 : 0));
      lutadores.forEach(v => { v.usado = false; });
      lista.forEach((f, i) => {
        let v = lutadores.get(f.id);
        if (!v) {
          v = { g: cena.add.graphics(), gr: cena.add.graphics().setBlendMode(Phaser.BlendModes.ADD), sombra: cena.add.image(0, 0, 'sombra') };
          lutadores.set(f.id, v);
        }
        v.usado = true;
        v.g.setDepth(10 + i * 2); v.gr.setDepth(11 + i * 2); v.sombra.setDepth(6);
        const deitado = f.estado === 'caido' || f.estado === 'ko';
        v.sombra.setPosition(f.x, CHAO + 3).setScale((deitado ? 1.3 : 0.7) * f.s * clamp(1 - f.z / 400, 0.5, 1), 0.16 * f.s).setAlpha(clamp(0.9 - f.z / 300, 0.3, 0.9));
        desenharLutador(f, v.g, v.gr);
      });
      lutadores.forEach((v, id) => { if (!v.usado) { v.g.destroy(); v.gr.destroy(); v.sombra.destroy(); lutadores.delete(id); } });

      desenharObjetos();
      desenharProjeteis();
      partN.clear(); partA.clear(); OY = 0;
      // partículas do ambiente (andam aqui; as do jogo andam na lógica)
      for (let i = amb.length - 1; i >= 0; i--) {
        const p = amb[i];
        p.x += p.vx * k; p.y += p.vy * k; p.vida -= k * (p.lento ? 0.5 : 1);
        if (p.vida <= 0) amb.splice(i, 1);
      }
      desenharParticulas(amb);
      if (J.tela !== 'titulo') desenharParticulas(J.parts);
      desenharEfeitos(k);
      for (let i = nBrilho; i < brilhos.length; i++) brilhos[i].setVisible(false);
      jogo.aoDesenhar();
    }

    return { fx, redimensionar, vista: () => vista, game };
  }

  return { criar };
})();
