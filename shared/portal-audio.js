// Som do portal (shared/platform-core.js, 🎨 Personalizar → Som): som de
// clique combinando com o cursor escolhido. Tudo
// SINTETIZADO na hora via Web Audio API (osciladores/ruído gerados por
// código) — sem nenhum arquivo de áudio/CDN externo, mesmo espírito do
// beep()/playCorrect()/playWrong() já usados em games/quizrush.html, só
// que reaproveitável pelo portal inteiro (e por dentro de qualquer
// <iframe> de atividade, via o "relé" de clique que
// shared/platform-core.js injeta — ver applyA11yToIframe/pfClickRelay).
//
// Autoplay: navegador só deixa criar/tocar áudio depois de um gesto real
// do usuário (clique/tecla). playClick() nunca tem esse problema: só é
// chamado DENTRO de um clique, que já é o gesto exigido.
window.PortalAudio = (function () {
  let ctx = null;
  let masterGain = null;

  function ensureCtx() {
    if (!ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.35;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  // ---------- Som de clique — um "timbre" por cursor (CURSOR_PRESETS em
  // shared/platform-core.js), combinando com o tema de cada um ----------
  // Tudo agendado no relógio do próprio AudioContext (opção `at`, em
  // segundos a partir de agora) em vez de setTimeout — as notas de um
  // arpejo saem no tempo certo mesmo com a página ocupada.

  // Uma nota. opts:
  //   type    — forma de onda (sine/square/triangle/sawtooth)
  //   gain    — volume de pico
  //   at      — atraso em segundos
  //   to      — frequência final (deslize/"glide" exponencial até ela)
  //   attack  — tempo de subida do volume
  //   vibrato — { rate, depth } em Hz (tremido na afinação, ex. fantasma)
  //   lowpass — corte de um filtro passa-baixa (deixa o som mais "abafado")
  function tone(freq, dur, opts = {}) {
    const c = ensureCtx();
    if (!c) return;
    const t0 = c.currentTime + (opts.at || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
    if (opts.vibrato) {
      const lfo = c.createOscillator();
      const lfoGain = c.createGain();
      lfo.frequency.value = opts.vibrato.rate;
      lfoGain.gain.value = opts.vibrato.depth;
      lfo.connect(lfoGain).connect(osc.frequency);
      lfo.start(t0);
      lfo.stop(t0 + dur + 0.05);
    }
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(opts.gain || 0.14, t0 + (opts.attack || 0.006));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let out = gain;
    if (opts.lowpass) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.lowpass;
      gain.connect(f);
      out = f;
    }
    osc.connect(gain);
    out.connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // Ruído filtrado (chiado, estalo, "whoosh", metal raspando) — sem
  // arquivo de amostra. opts:
  //   filter — tipo do filtro (bandpass/highpass/lowpass)
  //   freq   — frequência do filtro; `to` = frequência final (varredura)
  //   q      — estreiteza do filtro (bandpass)
  //   gain, at, attack — como em tone()
  function noise(dur, opts = {}) {
    const c = ensureCtx();
    if (!c) return;
    const t0 = c.currentTime + (opts.at || 0);
    const size = Math.max(1, Math.floor(c.sampleRate * dur));
    const buffer = c.createBuffer(1, size, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = opts.filter || 'bandpass';
    filter.frequency.setValueAtTime(opts.freq || 2000, t0);
    if (opts.to) filter.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
    filter.Q.value = opts.q || 1;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(opts.gain || 0.14, t0 + (opts.attack || 0.004));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(masterGain);
    src.start(t0);
  }

  const CLICK_SOUNDS = {
    // Padrão: "tic" discreto de interface.
    default: () => { tone(1300, 0.045, { to: 900, gain: 0.1 }); noise(0.015, { filter: 'highpass', freq: 5000, gain: 0.04 }); },
    // Seta Neon: blip digital subindo, com um brilho em cima.
    seta: () => { tone(880, 0.07, { type: 'square', to: 1760, gain: 0.07, lowpass: 3500 }); tone(2640, 0.05, { gain: 0.04, at: 0.02 }); },
    // Mira de Jogo: "pew" de tiro laser — estalo + queda rápida de frequência.
    mira: () => { noise(0.04, { filter: 'bandpass', freq: 2500, q: 2, gain: 0.12 }); tone(1600, 0.12, { type: 'square', to: 180, gain: 0.08, lowpass: 4000 }); },
    // Espada Pixel: "shing" de lâmina — metal raspando + ressonância inarmônica.
    espada: () => {
      noise(0.16, { filter: 'highpass', freq: 3000, to: 9000, gain: 0.09 });
      tone(2350, 0.35, { type: 'triangle', gain: 0.05 });
      tone(3530, 0.28, { type: 'sine', gain: 0.035 });
    },
    // Estrela Mágica: arpejo brilhante Dó–Mi–Sol–Dó.
    estrela: () => [1046.5, 1318.5, 1568, 2093].forEach((f, i) => tone(f, 0.16, { gain: 0.07, at: i * 0.045 })),
    // Pata: "pof" macio de patinha + um guincho curtinho de brinquedo.
    pata: () => { tone(260, 0.1, { to: 120, gain: 0.16 }); noise(0.05, { filter: 'lowpass', freq: 500, gain: 0.08 }); tone(1400, 0.07, { to: 1900, gain: 0.035, at: 0.05 }); },
    // Caveira: nota grave sombria + ossinhos batendo (3 estalos secos).
    caveira: () => {
      tone(150, 0.3, { type: 'sawtooth', to: 95, gain: 0.08, lowpass: 700 });
      [0, 0.05, 0.11].forEach(at => noise(0.025, { filter: 'bandpass', freq: 2200, q: 6, gain: 0.13, at }));
    },
    // Fantasma: "uuuu" tremido, subindo e descendo.
    fantasma: () => tone(420, 0.45, { to: 620, gain: 0.07, attack: 0.08, vibrato: { rate: 7, depth: 18 } }),
    // Raio: zap elétrico — serra despencando + estalos de faísca.
    raio: () => { tone(2200, 0.14, { type: 'sawtooth', to: 70, gain: 0.07, lowpass: 5000 }); noise(0.1, { filter: 'highpass', freq: 4000, gain: 0.08 }); },
    // Pizza: "nhac" — mordida crocante em duas partes + grave de mastigar.
    pizza: () => {
      noise(0.05, { filter: 'bandpass', freq: 1400, q: 1.5, gain: 0.13 });
      noise(0.06, { filter: 'bandpass', freq: 1000, q: 1.5, gain: 0.11, at: 0.07 });
      tone(180, 0.08, { to: 120, gain: 0.08 });
    },
    // Foguete: decolagem — "whoosh" varrendo pra cima + motor subindo.
    foguete: () => { noise(0.3, { filter: 'bandpass', freq: 300, to: 3000, q: 1.2, gain: 0.12, attack: 0.03 }); tone(160, 0.3, { type: 'sawtooth', to: 520, gain: 0.04, lowpass: 1200 }); },
    // Varinha Mágica: cascata de sininhos (pentatônica) com brilho.
    varinha: () => {
      [1568, 1760, 2093, 2349, 2637, 3136].forEach((f, i) => tone(f, 0.22, { gain: 0.05, at: i * 0.035 }));
      noise(0.25, { filter: 'highpass', freq: 7000, gain: 0.025, attack: 0.02 });
    },
    // Cometa Arco-íris: glissando subindo + acorde cintilante no fim.
    cometa: () => {
      tone(500, 0.18, { type: 'triangle', to: 2000, gain: 0.07 });
      [1318.5, 1661, 1976].forEach(f => tone(f, 0.25, { gain: 0.04, at: 0.15 }));
    },
    // Sabre de Luz: "vuuum" — zumbido grave desafinado, com varredura no filtro.
    sabre: () => {
      tone(110, 0.38, { type: 'sawtooth', to: 150, gain: 0.08, lowpass: 900, attack: 0.03 });
      tone(112.5, 0.38, { type: 'sawtooth', to: 145, gain: 0.06, lowpass: 1200, attack: 0.03 });
      noise(0.3, { filter: 'bandpass', freq: 600, to: 1600, q: 3, gain: 0.03, attack: 0.05 });
    },
    // Carretel de Linha: "toc" do carretel de madeira + linha sendo puxada.
    carretel: () => {
      tone(950, 0.04, { type: 'triangle', gain: 0.12 });
      tone(620, 0.05, { type: 'sine', gain: 0.06 });
      noise(0.14, { filter: 'bandpass', freq: 2500, to: 5500, q: 4, gain: 0.06, at: 0.03, attack: 0.02 });
    },
  };

  function playClick(cursorKey) {
    const fn = CLICK_SOUNDS[cursorKey] || CLICK_SOUNDS.default;
    try { fn(); } catch (e) { /* best-effort, nunca trava a UI por causa de som */ }
  }

  return { ensureCtx, playClick };
})();
