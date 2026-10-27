// Efeitos visuais das telas do professor (estilos em shared/professor.css)
// — a chuva de emojis também roda no portal das turmas, pros alunos
// (turmas/*/plataforma.html, estilo em shared/platform-core.css):
// - emojis de tecnologia caindo no fundo, bem transparentes;
// - nos cartões .pr-card, inclinação 3D leve seguindo o mouse e um brilho
//   que acompanha o cursor.
// Quem pediu menos animação no sistema (prefers-reduced-motion) não vê nada
// disso. Basta incluir o script na página — ele se monta sozinho.
(function () {
  const EMOJIS = ['💻', '🖥️', '⌨️', '🖱️', '📱', '🤖', '🧠', '💾', '📡', '🛰️', '🔌', '⚙️', '🧩', '🎮', '🕹️', '☁️', '🔒', '📊', '🚀', '💡'];
  const QTD = 22;

  const semAnimacao = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sorteio = (min, max) => min + Math.random() * (max - min);

  // A queda usa element.animate() só com transform: roda na placa de vídeo,
  // sem trabalho nenhum do JavaScript por quadro. A versão anterior mexia no
  // style de cada emoji 60 vezes por segundo (requestAnimationFrame) e, nos
  // Chromebooks dos alunos, isso sozinho ocupava a CPU e travava o portal.
  // Pra não repetir o problema antigo dos @keyframes (emojis congelados no
  // meio da tela depois do PC bloquear/dormir), as animações são recriadas
  // a partir do relógio quando a aba volta a aparecer e quando a janela muda
  // de tamanho, então nunca ficam presas.
  function montarChuva() {
    const chuva = document.createElement('div');
    chuva.className = 'pr-chuva';
    chuva.setAttribute('aria-hidden', 'true');
    const gotas = [];
    for (let i = 0; i < QTD; i++) {
      const s = document.createElement('span');
      s.textContent = EMOJIS[i % EMOJIS.length];
      s.style.left = `${sorteio(0, 97).toFixed(1)}vw`;
      s.style.fontSize = `${Math.round(sorteio(18, 38))}px`;
      s.style.opacity = sorteio(0.07, 0.16).toFixed(2);
      chuva.appendChild(s);
      gotas.push({
        el: s,
        dur: sorteio(16, 32) * 1000,
        // Fase sorteada: já começa com emojis espalhados pela tela, em vez
        // de todos surgirem juntos lá em cima.
        fase: Math.random(),
        deriva: sorteio(-60, 60),
        giro: sorteio(-180, 180),
      });
    }
    document.body.prepend(chuva);

    function animar() {
      const altura = Math.round(window.innerHeight * 1.2);
      const agora = performance.now();
      for (const g of gotas) {
        if (g.anim) g.anim.cancel();
        g.anim = g.el.animate([
          { transform: 'translate(0px, 0px) rotate(0deg)' },
          { transform: `translate(${g.deriva.toFixed(1)}px, ${altura}px) rotate(${g.giro.toFixed(1)}deg)` },
        ], { duration: g.dur, iterations: Infinity, easing: 'linear' });
        g.anim.currentTime = ((agora / g.dur + g.fase) % 1) * g.dur;
      }
    }
    animar();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) gotas.forEach(g => g.anim && g.anim.pause());
      else animar();
    });
    let espera = null;
    window.addEventListener('resize', () => { clearTimeout(espera); espera = setTimeout(animar, 300); });
  }

  function ligarCartoes() {
    const INCLINACAO = 6; // graus, no máximo
    document.addEventListener('pointermove', e => {
      const card = e.target.closest && e.target.closest('.pr-card');
      if (!card || e.pointerType === 'touch') return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      card.style.setProperty('--ry', `${((px - 0.5) * 2 * INCLINACAO).toFixed(2)}deg`);
      card.style.setProperty('--rx', `${((0.5 - py) * 2 * INCLINACAO).toFixed(2)}deg`);
    });
    document.addEventListener('pointerout', e => {
      const card = e.target.closest && e.target.closest('.pr-card');
      if (!card || card.contains(e.relatedTarget)) return;
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  }

  function iniciar() {
    if (semAnimacao) return;
    montarChuva();
    ligarCartoes();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
