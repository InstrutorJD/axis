// Efeitos visuais das telas do professor (estilos em shared/professor.css):
// nos cartões .pr-card, inclinação 3D leve seguindo o mouse e um brilho
// que acompanha o cursor. Quem pediu menos animação no sistema
// (prefers-reduced-motion) não vê isso. Basta incluir o script na página —
// ele se monta sozinho.
(function () {
  const semAnimacao = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    ligarCartoes();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
