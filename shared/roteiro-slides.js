// Motor de ROTEIRO em etapas do padrão novo de trilhas (docs/padrao-trilhas.md,
// seção 8) — para práticas SEM correção automática, onde o "produto" vive
// fora do portal (um projeto no Codespace, uma apresentação, um jogo no
// JSFiddle) e quem marca como concluída é o professor, dando o visto na
// última etapa. É o mesmo comportamento das telas cod-phaser-pratica.html e
// cod-godot-pratica.html, extraído para cá para as telas novas não repetirem
// o motor inteiro: cada página só declara os STEPS e chama RoteiroSlides.iniciar.
//
// Uso (ver turmas/jogos/atividades/cyberseg-*.html):
//   RoteiroSlides.iniciar({
//     activityLocation: 'cyberseg_hacker_etico',   // = window.ACTIVITY_LOCATION
//     tituloTopo: 'Projetos — Hacker Ético',
//     steps: [ { titulo, corpo }, ... ],            // corpo em Markdown enxuto
//     gabarito: { title, subtitle, items },         // opcional (Gestão)
//     semVisto: false,                              // true = fecha na última etapa, sem token
//   });
//
// Markdown aceito no corpo: #..###### títulos, listas - e 1., tabelas |,
// > citação, código em cerca ``` (ou §§§), `código` inline, **negrito**,
// e "- [ ]" vira checklist clicável (lembra o que o aluno marcou).
//
// Inclua depois de: supabase-config.js, @supabase/supabase-js, session.js,
// clipboard-guard.js, activity-tracker.js, progress-sync.js,
// professor-visto.js, gabarito-generator.js, aula-base.js.
window.RoteiroSlides = (function () {
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function inline(s) {
    let t = escapeHtml(s);
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    t = t.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    t = t.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return t;
  }

  function mdToHtml(md) {
    const lines = String(md).replace(/\r\n/g, '\n').split('\n');
    let html = '';
    let i = 0;
    const isFence = l => l.startsWith('```') || l.startsWith('§§§');
    while (i < lines.length) {
      const line = lines[i].trim();
      if (line === '') { i++; continue; }

      if (isFence(line)) {
        i++;
        const codeLines = [];
        while (i < lines.length && !isFence(lines[i].trim())) { codeLines.push(lines[i]); i++; }
        i++;
        html += `<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`;
        continue;
      }

      const hm = line.match(/^(#{1,6})\s+(.*)$/);
      if (hm) {
        const level = Math.min(hm[1].length + 2, 6);
        html += `<h${level}>${inline(hm[2])}</h${level}>`;
        i++; continue;
      }

      if (line.startsWith('|') && lines[i + 1] && /^\s*\|[\s:|-]+\|/.test(lines[i + 1])) {
        const headerCells = line.slice(1, -1).split('|').map(s => s.trim());
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          rows.push(lines[i].trim().slice(1, -1).split('|').map(s => s.trim()));
          i++;
        }
        html += '<div class="md-table-wrap"><table class="md-table"><thead><tr>'
          + headerCells.map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>'
          + rows.map(r => '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('')
          + '</tbody></table></div>';
        continue;
      }

      if (/^\d+\.\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^\d+\.\s+/, '')); i++; }
        html += '<ol class="md-list">' + items.map(it => `<li>${inline(it)}</li>`).join('') + '</ol>';
        continue;
      }

      if (/^-\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^-\s+/.test(lines[i].trim())) { items.push(lines[i].trim()); i++; }
        html += '<ul class="md-list">' + items.map(it => {
          const cbm = it.match(/^-\s+\[( |x)\]\s*(.*)$/i);
          if (cbm) return `<li class="md-check">${inline(cbm[2])}</li>`;
          return `<li>${inline(it.replace(/^-\s+/, ''))}</li>`;
        }).join('') + '</ul>';
        continue;
      }

      if (line.startsWith('>')) {
        const q = [];
        while (i < lines.length && lines[i].trim().startsWith('>')) { q.push(lines[i].trim().replace(/^>\s?/, '')); i++; }
        html += `<blockquote>${inline(q.join(' '))}</blockquote>`;
        continue;
      }

      // A 1ª linha entra sempre: uma linha como "2.1 Requisitos" ou "-5 graus"
      // não é lista nem título, e sem isto o laço nunca avançava (página travada).
      const para = [line];
      i++;
      while (i < lines.length && lines[i].trim() !== '' && !/^(```|§§§|#|\||-|\d+\.|>)/.test(lines[i].trim())) {
        para.push(lines[i].trim());
        i++;
      }
      html += `<p>${inline(para.join(' '))}</p>`;
    }
    return html;
  }

  function iniciar(opts) {
    const STEPS = opts.steps || [];
    const activityLocation = opts.activityLocation;
    const semVisto = !!opts.semVisto;
    const username = new URLSearchParams(window.location.search).get('user') || 'anon';
    const PROGRESS_KEY = `${activityLocation}_progress_${username}`;
    const STEP_KEY = `${activityLocation}_step_${username}`;
    // Total de etapas: com visto, há uma etapa final a mais (a tela do token).
    const TOTAL = STEPS.length + (semVisto ? 0 : 1);

    const stepWrap = document.getElementById('stepWrap');
    const lblStepNum = document.getElementById('lblStepNum');
    const lblStepTotal = document.getElementById('lblStepTotal');
    const progressFill = document.getElementById('progressFill');
    if (lblStepTotal) lblStepTotal.textContent = TOTAL;

    function loadProgress() { try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null'); } catch (e) { return null; } }
    function saveProgress(data) { try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(data)); } catch (e) {} }
    function loadStepIndex() {
      try { const n = parseInt(localStorage.getItem(STEP_KEY), 10); return Number.isInteger(n) && n >= 0 && n <= STEPS.length ? n : 0; } catch (e) { return 0; }
    }
    function saveStepIndex(i) { try { localStorage.setItem(STEP_KEY, String(i)); } catch (e) {} }

    const savedProgress = loadProgress();
    let currentIndex = (savedProgress && savedProgress.completed) ? STEPS.length : loadStepIndex();
    let direcao = 1;

    function reportStep(label) {
      if (typeof window.reportActivity === 'function') {
        window.reportActivity(activityLocation, label, { step: currentIndex + 1, total: TOTAL });
      }
    }
    function renderNav(showBack, showNext) {
      return `
        <div class="ab-nav">
          ${showBack ? '<button class="btn btn-secondary" id="btnBack">← Voltar</button>' : '<span></span>'}
          <span class="ab-nav-dica">use ← → do teclado</span>
          ${showNext ? '<button class="btn" id="btnNext">Próximo →</button>' : '<span></span>'}
        </div>`;
    }
    function irPara(i) {
      direcao = i < currentIndex ? -1 : 1;
      currentIndex = Math.max(0, Math.min(i, STEPS.length));
      renderStep();
    }
    function mostrarEtapa() {
      const palco = document.getElementById('palco');
      if (palco) palco.scrollTop = 0;
      const cartao = stepWrap.querySelector('.ab-cartao');
      if (window.AulaBase) window.AulaBase.transicao(cartao, direcao);
    }
    if (window.AulaBase) {
      window.AulaBase.teclado({
        proximo: () => { const b = document.getElementById('btnNext'); if (b) b.click(); },
        anterior: () => { const b = document.getElementById('btnBack'); if (b) b.click(); },
      });
    }

    function renderStep() {
      if (currentIndex >= STEPS.length) {
        if (semVisto) { renderConcluir(); return; }
        renderVisto(); return;
      }
      saveStepIndex(currentIndex);
      const pct = Math.round((currentIndex / TOTAL) * 100);
      if (progressFill) progressFill.style.width = Math.min(pct, 100) + '%';
      if (lblStepNum) lblStepNum.textContent = currentIndex + 1;

      const step = STEPS[currentIndex];
      reportStep(`Roteiro — ${step.titulo}`);
      stepWrap.innerHTML = `
        <article class="ab-cartao">
          <div class="ab-cartao-etapa">Etapa ${currentIndex + 1} de ${TOTAL}</div>
          <h2>${escapeHtml(step.titulo)}</h2>
          <div class="ab-conteudo">${mdToHtml(step.corpo)}</div>
        </article>
        ${renderNav(currentIndex > 0, true)}
      `;
      if (window.AulaBase) window.AulaBase.decorar(stepWrap, { chaveChecklist: `${activityLocation}_check_${username}_${currentIndex}` });
      mostrarEtapa();
      const btnBack = document.getElementById('btnBack');
      if (btnBack) btnBack.addEventListener('click', () => irPara(currentIndex - 1));
      document.getElementById('btnNext').addEventListener('click', () => irPara(currentIndex + 1));
    }

    // Última etapa quando NÃO há visto (semVisto): marca como concluída ao
    // chegar no fim, sem token — para telas de leitura pura (ex.: orientações).
    function renderConcluir() {
      if (progressFill) progressFill.style.width = '100%';
      saveProgress({ completed: true, concluidoEm: new Date().toISOString() });
      reportStep('Roteiro — concluído');
      stepWrap.innerHTML = `
        <div class="ab-cartao ab-concluida">
          <h2>✅ Você chegou ao fim</h2>
          <p>Pode voltar e reler quando quiser.</p>
        </div>
        ${renderNav(true, false)}
      `;
      mostrarEtapa();
      document.getElementById('btnBack').addEventListener('click', () => irPara(STEPS.length - 1));
    }

    function renderVisto() {
      if (progressFill) progressFill.style.width = '100%';
      if (lblStepNum) lblStepNum.textContent = TOTAL;
      reportStep('Roteiro — Visto do professor');

      const already = loadProgress();
      if (already && already.completed) {
        const quando = already.vistoEm ? new Date(already.vistoEm).toLocaleString('pt-BR') : '';
        stepWrap.innerHTML = `
          <div class="ab-cartao ab-concluida">
            <h2>✅ Atividade concluída</h2>
            <p>Visto dado por <b>${escapeHtml(already.vistoPor || '')}</b>${quando ? ' em ' + escapeHtml(quando) : ''}.</p>
          </div>
          ${renderNav(true, false)}
        `;
        mostrarEtapa();
        document.getElementById('btnBack').addEventListener('click', () => irPara(STEPS.length - 1));
        return;
      }

      stepWrap.innerHTML = `
        <div class="ab-cartao">
          <div class="ab-cartao-etapa">Etapa ${TOTAL} de ${TOTAL}</div>
          <h2>🧑‍🏫 Etapa final — Visto do professor</h2>
          <div class="ab-conteudo">
            <p>${escapeHtml(opts.textoVisto || 'Terminou tudo o que a atividade pediu e mostrou o resultado pro professor?')}</p>
            <p>Chame o professor. Quando ele confirmar, peça o token de professor (Gestão → "Token — Dar Visto / Pular Etapa") e digite abaixo — é assim que a atividade fica marcada como concluída.</p>
          </div>
          <div class="ab-form">
            <label>Token do professor
              <input type="text" id="vistoToken" inputmode="numeric" maxlength="6" autocomplete="off">
            </label>
            <button class="btn" id="btnDarVisto">Dar visto</button>
            <div class="ab-msg" id="vistoMsg" style="display:none;"></div>
          </div>
        </div>
        ${renderNav(true, false)}
      `;
      mostrarEtapa();
      document.getElementById('btnBack').addEventListener('click', () => irPara(STEPS.length - 1));

      const btnDarVisto = document.getElementById('btnDarVisto');
      const vistoMsg = document.getElementById('vistoMsg');
      btnDarVisto.addEventListener('click', async () => {
        const t = document.getElementById('vistoToken').value;
        vistoMsg.style.display = 'none';
        if (!t) {
          vistoMsg.className = 'ab-msg erro';
          vistoMsg.textContent = 'Informe o token do professor.';
          vistoMsg.style.display = 'block';
          return;
        }
        btnDarVisto.disabled = true;
        btnDarVisto.textContent = 'Verificando...';
        try {
          const result = window.PortalProfessorVisto
            ? await window.PortalProfessorVisto.verificarToken(t)
            : { ok: false, erro: 'Verificação indisponível nesta tela.' };
          if (!result.ok) {
            vistoMsg.className = 'ab-msg erro';
            vistoMsg.textContent = result.erro;
            vistoMsg.style.display = 'block';
            btnDarVisto.disabled = false;
            btnDarVisto.textContent = 'Dar visto';
            return;
          }
          saveProgress({ completed: true, vistoPor: result.nome, vistoEm: new Date().toISOString() });
          renderVisto();
        } catch (e) {
          vistoMsg.className = 'ab-msg erro';
          vistoMsg.textContent = 'Erro inesperado ao verificar. Tente de novo.';
          vistoMsg.style.display = 'block';
          btnDarVisto.disabled = false;
          btnDarVisto.textContent = 'Dar visto';
        }
      });
    }

    if (opts.gabarito) {
      window.generateGabaritoForGestao = function () {
        return window.PortalGabarito.generate({
          title: opts.gabarito.title,
          subtitle: opts.gabarito.subtitle,
          items: opts.gabarito.items,
          fileName: opts.gabarito.fileName || `${activityLocation}-checklist.txt`,
        });
      };
    }

    renderStep();
  }

  return { iniciar, mdToHtml };
})();
