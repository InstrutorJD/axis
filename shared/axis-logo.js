// Marca "Axis" (a mesma palavra em rabisco da tela de login, index.html)
// pras telas do professor. Uso: <span data-axis-logo></span> — o script
// troca pelo SVG. Estilos em shared/professor.css (.axis-logo).
// Comportamento igual ao do login: acompanha o mouse inclinando de leve e,
// com o mouse em cima, para e o traço vira o gradiente ciano → violeta →
// rosa (camada .camada-grad, cópia dos mesmos traços por cima).
// Se mudar o desenho no login, copie os <path> de #axisRiscos pra cá.
(function () {
  const TRACOS =
    '<path class="risco risco-forte" d="M12 90 C 17 78, 22 67, 28 55"/>' +
    '<path class="risco risco-forte" d="M33 47 C 37 36, 41 26, 46 15"/>' +
    '<path class="risco risco-forte" d="M57 4 C 61 16, 65 29, 70 42"/>' +
    '<path class="risco risco-forte" d="M75 57 C 79 68, 83 79, 89 92"/>' +
    '<path class="risco risco-forte" d="M6 66 C 20 62, 34 60, 52 59"/>' +
    '<path class="risco risco-fino" d="M62 58 C 66 58, 70 58, 73 59"/>' +
    '<path class="risco risco-fino" d="M44 9 C 47 6, 50 5, 53 7"/>' +
    '<path class="risco risco-fino" d="M64 20 C 68 32, 72 44, 78 60"/>' +
    '<path class="risco risco-fino" d="M18 84 C 21 77, 23 72, 25 68"/>' +
    '<path class="risco risco-forte" d="M103 43 C 114 55, 126 67, 151 92"/>' +
    '<path class="risco risco-forte" d="M150 42 C 144 49, 138 56, 131 63"/>' +
    '<path class="risco risco-forte" d="M123 72 C 117 79, 111 86, 105 93"/>' +
    '<path class="risco risco-fino" d="M110 47 C 120 57, 130 67, 141 79"/>' +
    '<path class="risco risco-fino" d="M146 38 C 149 36, 152 37, 155 40"/>' +
    '<path class="risco risco-forte" d="M169 46 C 170 56, 170 64, 169 72"/>' +
    '<path class="risco risco-forte" d="M171 79 C 172 84, 172 88, 174 93"/>' +
    '<path class="risco risco-forte" d="M172 24 C 175 21, 179 20, 183 21"/>' +
    '<path class="risco risco-fino" d="M176 50 C 177 59, 177 67, 176 74"/>' +
    '<path class="risco risco-fino" d="M163 30 C 165 29, 167 29, 169 30"/>' +
    '<path class="risco risco-forte" d="M230 49 C 222 40, 201 40, 197 52 C 195 60, 204 64, 212 66"/>' +
    '<path class="risco risco-forte" d="M219 71 C 229 74, 235 81, 231 88 C 226 96, 205 97, 191 87"/>' +
    '<path class="risco risco-fino" d="M232 44 C 234 47, 234 50, 232 53"/>' +
    '<path class="risco risco-fino" d="M201 58 C 207 64, 217 67, 227 74"/>' +
    '<path class="risco risco-fino" d="M195 91 C 192 93, 189 93, 186 91"/>' +
    '';

  const SVG =
    '<svg class="axis-logo" viewBox="0 0 240 96" role="img" aria-label="Axis" focusable="false">' +
      '<defs><linearGradient id="axisLogoGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="240" y2="96">' +
        '<stop offset="0" stop-color="#5ee7ff"/><stop offset="0.5" stop-color="#a78bfa"/><stop offset="1" stop-color="#ff4fd8"/>' +
        '<animateTransform attributeName="gradientTransform" type="rotate" from="0 120 48" to="360 120 48" dur="6s" repeatCount="indefinite"/>' +
      '</linearGradient></defs>' +
      '<rect x="0" y="0" width="240" height="96" fill="transparent"/>' +
      '<g>' + TRACOS + '</g>' +
      '<g class="camada-grad">' + TRACOS + '</g>' +
    '</svg>';

  const semMovimento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function montar(alvo) {
    alvo.outerHTML = SVG;
  }

  function animarLogo(letra) {
    let alvoX = 0, alvoY = 0, atualX = 0, atualY = 0;
    let parada = false, animando = false;

    letra.addEventListener('pointerenter', () => {
      parada = true; alvoX = 0; alvoY = 0;
      letra.classList.add('acesa');
      animar();
    });
    letra.addEventListener('pointerleave', () => {
      parada = false;
      letra.classList.remove('acesa');
    });
    if (semMovimento) return;

    document.addEventListener('pointermove', ev => {
      if (parada) return;
      const r = letra.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      alvoX = Math.max(-1, Math.min(1, (ev.clientX - cx) / (window.innerWidth / 2)));
      alvoY = Math.max(-1, Math.min(1, (ev.clientY - cy) / (window.innerHeight / 2)));
      animar();
    });
    document.documentElement.addEventListener('pointerleave', () => {
      alvoX = 0; alvoY = 0; animar();
    });

    function animar() {
      if (animando || semMovimento) return;
      animando = true;
      requestAnimationFrame(passo);
    }
    function passo() {
      atualX += (alvoX - atualX) * 0.12;
      atualY += (alvoY - atualY) * 0.12;
      letra.style.transform =
        `perspective(400px) translate(${(atualX * 3).toFixed(2)}px, ${(atualY * 2).toFixed(2)}px) ` +
        `rotateY(${(atualX * 16).toFixed(2)}deg) rotateX(${(-atualY * 12).toFixed(2)}deg)`;
      if (Math.abs(alvoX - atualX) > 0.001 || Math.abs(alvoY - atualY) > 0.001) {
        requestAnimationFrame(passo);
      } else {
        animando = false;
      }
    }
  }

  function iniciar() {
    document.querySelectorAll('[data-axis-logo]').forEach(montar);
    document.querySelectorAll('.axis-logo').forEach(animarLogo);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
