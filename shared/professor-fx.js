// Efeitos visuais das telas do professor (estilos em shared/professor.css):
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

  function montarChuva() {
    const chuva = document.createElement('div');
    chuva.className = 'pr-chuva';
    chuva.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < QTD; i++) {
      const s = document.createElement('span');
      s.textContent = EMOJIS[i % EMOJIS.length];
      const dur = sorteio(16, 32);
      s.style.setProperty('--x', `${sorteio(0, 97).toFixed(1)}vw`);
      s.style.setProperty('--tam', `${Math.round(sorteio(18, 38))}px`);
      s.style.setProperty('--op', sorteio(0.07, 0.16).toFixed(2));
      s.style.setProperty('--dur', `${dur.toFixed(1)}s`);
      // Atraso negativo: já começa com emojis espalhados pela tela, em vez
      // de todos surgirem juntos lá em cima.
      s.style.setProperty('--atraso', `${(-sorteio(0, dur)).toFixed(1)}s`);
      s.style.setProperty('--deriva', `${Math.round(sorteio(-60, 60))}px`);
      s.style.setProperty('--giro', `${Math.round(sorteio(-180, 180))}deg`);
      chuva.appendChild(s);
    }
    document.body.prepend(chuva);
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
