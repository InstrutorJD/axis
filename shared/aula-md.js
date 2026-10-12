// Motor das TEORIAS do padrão novo de trilhas (docs/padrao-trilhas.md,
// seções 4, 5 e 7). Lê um arquivo .md no MESMO formato do "Criar Material"
// (materiais/instrucoes-para-ia.md) e monta:
//   - pro ALUNO: a aula em cartões, um slide por etapa, com as perguntas
//     valendo nota (80% pra concluir, alternativas embaralhadas, erro não
//     revela a certa, pergunta respondida não volta a aparecer);
//   - pro PROFESSOR: o mesmo percurso sem precisar responder, o botão
//     "▶ Apresentação" (o .md vira os slides do Criar Material em tela
//     cheia) e o "Gerar Gabarito" (gabarito-generator.js).
//
// Uso (casca turmas/<turma>/atividades/<trilha>-teoria.html, seção 5 do doc):
//   AulaMD.iniciar({ md: '../aulas/<trilha>-teoria.md', activityLocation: '<trilha>_teoria' });
//
// Pergunta no .md: um slide com as alternativas "- [ ]"/"- [x]" (4, uma
// certa) e, logo depois, "> Por quê: ..." (explicação, só aparece no acerto).
//
// Progresso em localStorage (espelhado no Supabase por progress-sync.js):
//   `${activityLocation}_progress_${user}` =
//     { lastStepIndex, correctCount, completed, respostas: { [etapa]: 1|0 } }
// progressMode 'flag' no config.js (completed = acertou 80% ou mais).
//
// O .md é lido de forma SÍNCRONA de propósito: o QuizRush e o gabarito da
// Gestão abrem esta página num <iframe> oculto e chamam
// generateGabaritoForGestao() logo no onload — com leitura assíncrona, as
// perguntas ainda não existiriam nessa hora.
//
// Depende de: slides-md.js (parser), aula-base.css/js (visual e teclado),
// gabarito-generator.js, session.js, activity-tracker.js, progress-sync.js.
window.AulaMD = (function () {
  const MEU_SRC = (document.currentScript && document.currentScript.src) || '';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const RE_PORQUE = /^\s*Por qu[eê]:\s*/i;

  function lerArquivo(url) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send();
    if (xhr.status && xhr.status !== 200) throw new Error(`HTTP ${xhr.status}`);
    return xhr.responseText;
  }

  function embaralhar(n) {
    const a = Array.from({ length: n }, (_, i) => i);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Capacidade da trilha: vem do config.js (nunca do .md). O portal é dono
  // do <iframe> e tem o config em window.TURMA_CONFIG — acha o módulo cujo
  // src aponta pra esta página.
  function capacidadeDoPortal() {
    try {
      const cfg = window.parent && window.parent !== window && window.parent.TURMA_CONFIG;
      if (!cfg) return '';
      const arquivo = location.pathname.split('/').pop();
      for (const m of cfg.materias || []) {
        for (const t of m.trilhas || []) {
          if ((t.modules || []).some(mod => String(mod.src || '').split('/').pop() === arquivo)) return t.capacidade || '';
        }
      }
    } catch (e) {}
    return '';
  }

  // Um slide do .md → uma etapa: 'capa' (# título), 'pergunta' (tem
  // alternativas) ou 'conteudo'. Cronômetro e QR Code são coisa da
  // apresentação em sala: na tela do aluno o cronômetro some e o QR vira link.
  function montarEtapa(blocks) {
    const SM = window.SlidesMD;
    const b = blocks.filter(x => x.t !== 'timer').map(x => x.t === 'qr'
      ? { t: 'p', html: `${x.legenda ? `<strong>${esc(x.legenda)}:</strong> ` : ''}<a href="${esc(x.texto)}" target="_blank" rel="noopener">${esc(x.texto)}</a>` }
      : x);
    const primeiro = b[0];
    if (primeiro && primeiro.t === 'h' && primeiro.level === 1) {
      return { tipo: 'capa', titulo: primeiro.html, html: SM.renderBlocks(b.slice(1)) };
    }
    const titulo = primeiro && primeiro.t === 'h' && primeiro.level === 2 ? primeiro.html : '';
    const resto = titulo ? b.slice(1) : b;
    const iQuiz = resto.findIndex(x => x.t === 'quiz');
    if (iQuiz < 0) return { tipo: 'conteudo', titulo, html: SM.renderBlocks(resto) };

    const quiz = resto[iQuiz];
    const iPorque = resto.findIndex((x, i) => i > iQuiz && x.t === 'quote' && RE_PORQUE.test(x.html));
    const porque = iPorque >= 0 ? resto[iPorque].html.replace(RE_PORQUE, '') : '';
    const enunciado = resto.filter((x, i) => i !== iQuiz && i !== iPorque);
    const certas = quiz.opts.filter(o => o.ok).length;
    if (quiz.opts.length !== 4 || certas !== 1) {
      console.warn(`[AulaMD] pergunta "${enunciado.map(x => x.html || '').join(' ').slice(0, 60)}" deveria ter 4 alternativas e 1 certa (tem ${quiz.opts.length} e ${certas}).`);
    }
    return {
      tipo: 'pergunta',
      titulo: titulo || 'Pergunta',
      html: SM.renderBlocks(enunciado),
      opcoes: quiz.opts.map(o => o.html),
      certa: quiz.opts.findIndex(o => o.ok),
      porque,
    };
  }

  function carregarCss(href) {
    return new Promise(resolve => {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      l.onload = resolve;
      l.onerror = resolve;
      document.head.appendChild(l);
    });
  }
  function carregarJs(src) {
    return new Promise(resolve => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = resolve;
      document.head.appendChild(s);
    });
  }

  function iniciar(opts) {
    const SM = window.SlidesMD;
    const activityLocation = opts.activityLocation;
    const username = new URLSearchParams(location.search).get('user') || 'anon';
    const PROGRESS_KEY = `${activityLocation}_progress_${username}`;
    const ORDEM_KEY = `${activityLocation}_order_${username}`;
    const mdUrl = new URL(opts.md, location.href).href;

    document.body.innerHTML = `
      <div class="ab-app am-app">
        <header class="ab-topo">
          <div class="ab-topo-titulo" id="amTitulo"></div>
          <div class="am-topo-dir">
            <button type="button" class="am-btn-apresentar" id="btnApresentar" hidden>▶ Apresentação</button>
            <div class="ab-topo-etapa">Etapa <span id="lblStepNum">1</span> de <span id="lblStepTotal">1</span></div>
          </div>
        </header>
        <div class="ab-progresso"><div class="ab-progresso-fill" id="progressFill"></div></div>
        <main class="ab-palco" id="palco"><div class="ab-coluna" id="stepWrap"></div></main>
      </div>`;
    const stepWrap = document.getElementById('stepWrap');

    let texto;
    try {
      texto = lerArquivo(mdUrl);
    } catch (e) {
      stepWrap.innerHTML = `<div class="ab-cartao"><h2>Não foi possível abrir a aula</h2><p>Recarregue a página. Se continuar, avise o professor.</p></div>`;
      return;
    }

    const { meta, corpo } = SM.lerMeta(texto);
    const tituloAula = meta.titulo || (corpo.match(/^#\s+(.+)$/m) || [])[1] || document.title;
    const capacidade = opts.capacidade || capacidadeDoPortal();
    const etapas = SM.splitSlides(corpo).map(lines => montarEtapa(SM.parseBlocks(lines, mdUrl)));
    const perguntas = etapas.map((e, i) => (e.tipo === 'pergunta' ? i : -1)).filter(i => i >= 0);
    const TOTAL = etapas.length;

    document.getElementById('amTitulo').textContent = tituloAula;
    document.getElementById('lblStepTotal').textContent = TOTAL;
    document.title = `${tituloAula} — Teoria`;

    // ---------- Gabarito (Gestão e QuizRush) ----------
    window.generateGabaritoForGestao = function () {
      return window.PortalGabarito.generate({
        title: tituloAula,
        subtitle: `Aula Teórica${capacidade ? ' · Capacidade: ' + capacidade : ''}`,
        items: perguntas.map((i, n) => ({
          number: n + 1,
          prompt: etapas[i].html,
          options: etapas[i].opcoes,
          correctIndex: etapas[i].certa,
          answer: window.PortalGabarito.stripHtml(etapas[i].opcoes[etapas[i].certa] || ''),
        })),
        fileName: `${activityLocation.replace(/_/g, '-')}-gabarito.txt`,
      });
    };

    // ---------- Progresso ----------
    function lerJson(chave, padrao) {
      try { return JSON.parse(localStorage.getItem(chave) || 'null') || padrao; } catch (e) { return padrao; }
    }
    function estadoVazio() { return { lastStepIndex: 0, correctCount: 0, completed: false, respostas: {} }; }
    let estado = Object.assign(estadoVazio(), lerJson(PROGRESS_KEY, {}));
    if (!estado.respostas || typeof estado.respostas !== 'object') estado.respostas = {};
    let ordens = lerJson(ORDEM_KEY, {});

    function salvar() {
      estado.correctCount = Object.values(estado.respostas).filter(v => v === 1).length;
      try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(estado)); } catch (e) {}
    }
    function ordemDa(i) {
      const n = etapas[i].opcoes.length;
      const o = ordens[i];
      if (Array.isArray(o) && o.length === n && o.every(x => Number.isInteger(x) && x >= 0 && x < n)) return o;
      ordens[i] = embaralhar(n);
      try { localStorage.setItem(ORDEM_KEY, JSON.stringify(ordens)); } catch (e) {}
      return ordens[i];
    }
    function reportar(rotulo) {
      if (typeof window.reportActivity === 'function') {
        window.reportActivity(activityLocation, rotulo, { step: Math.min(atual + 1, TOTAL), total: TOTAL, correctCount: estado.correctCount });
      }
    }

    let isProfessor = false;
    let revisao = !!estado.completed; // já concluiu: navega livre, sem mexer na nota
    let atual = estado.completed ? TOTAL : Math.min(estado.lastStepIndex || 0, TOTAL);
    let direcao = 1;

    const podeAvancar = i => isProfessor || revisao || etapas[i].tipo !== 'pergunta' || estado.respostas[i] !== undefined;

    function nav(voltar, avancar, rotuloAvancar) {
      return `
        <div class="ab-nav">
          ${voltar ? '<button class="btn btn-secondary" id="btnBack">← Voltar</button>' : '<span></span>'}
          <span class="ab-nav-dica">use ← → do teclado</span>
          ${avancar ? `<button class="btn" id="btnNext">${rotuloAvancar || 'Próximo →'}</button>` : '<span></span>'}
        </div>`;
    }

    function irPara(i) {
      if (i > atual && atual < TOTAL && !podeAvancar(atual)) return;
      direcao = i < atual ? -1 : 1;
      atual = Math.max(0, Math.min(i, TOTAL));
      if (!revisao && atual > (estado.lastStepIndex || 0) && atual < TOTAL) {
        estado.lastStepIndex = atual;
        salvar();
      }
      render();
    }

    function mostrar() {
      const palco = document.getElementById('palco');
      if (palco) palco.scrollTop = 0;
      if (window.AulaBase) window.AulaBase.transicao(stepWrap.querySelector('.ab-cartao'), direcao);
      const back = document.getElementById('btnBack');
      if (back) back.addEventListener('click', () => irPara(atual - 1));
      const next = document.getElementById('btnNext');
      if (next) next.addEventListener('click', () => irPara(atual + 1));
    }

    function render() {
      if (atual >= TOTAL) { renderFim(); return; }
      const e = etapas[atual];
      const pct = Math.round((atual / TOTAL) * 100);
      document.getElementById('progressFill').style.width = pct + '%';
      document.getElementById('lblStepNum').textContent = atual + 1;
      const etiqueta = `<div class="ab-cartao-etapa">Etapa ${atual + 1} de ${TOTAL}</div>`;
      const ultimo = atual === TOTAL - 1;
      const rotuloFim = ultimo ? (revisao ? 'Ver resultado →' : 'Concluir →') : '';

      if (e.tipo === 'capa') {
        reportar(`${tituloAula} — Abertura`);
        stepWrap.innerHTML = `
          <article class="ab-cartao am-capa">
            ${etiqueta}
            <h1>${e.titulo}</h1>
            <div class="ab-conteudo">${e.html}</div>
            ${atual === 0 && capacidade ? `<div class="am-capacidade"><span>Capacidade</span>${esc(capacidade)}</div>` : ''}
          </article>
          ${nav(atual > 0, true, rotuloFim)}`;
      } else if (e.tipo === 'conteudo') {
        reportar(`${tituloAula} — Etapa ${atual + 1}/${TOTAL}`);
        stepWrap.innerHTML = `
          <article class="ab-cartao">
            ${etiqueta}
            ${e.titulo ? `<h2>${e.titulo}</h2>` : ''}
            <div class="ab-conteudo">${e.html}</div>
          </article>
          ${nav(atual > 0, true, rotuloFim)}`;
      } else {
        renderPergunta(e, etiqueta, rotuloFim);
        return;
      }
      mostrar();
    }

    function renderPergunta(e, etiqueta, rotuloFim) {
      const i = atual;
      const numero = perguntas.indexOf(i) + 1;
      const resposta = estado.respostas[i];
      reportar(`${tituloAula} — Pergunta ${numero}/${perguntas.length}${resposta !== undefined ? ' (respondida)' : ''}`);
      const ordem = ordemDa(i);
      const bloqueada = resposta !== undefined || revisao;
      stepWrap.innerHTML = `
        <article class="ab-cartao am-pergunta">
          ${etiqueta}
          <h2>❓ ${e.titulo} <span class="am-num">${numero} de ${perguntas.length}</span></h2>
          <div class="ab-conteudo">${e.html}</div>
          <div class="am-opcoes">
            ${ordem.map((orig, pos) => `<button type="button" class="am-opcao" data-orig="${orig}" ${bloqueada ? 'disabled' : ''}><span class="am-letra">${'ABCD'[pos] || '?'}</span><span>${e.opcoes[orig]}</span></button>`).join('')}
          </div>
          <div id="amFeedback">${resposta !== undefined ? feedbackHtml(e, resposta === 1, true) : ''}</div>
        </article>
        ${nav(i > 0, podeAvancar(i), rotuloFim)}`;
      if (!bloqueada) {
        stepWrap.querySelectorAll('.am-opcao').forEach(btn => btn.addEventListener('click', () => responder(e, i, btn)));
      }
      mostrar();
    }

    // No erro: não marca a certa, não escreve a resposta, não mostra o "Por quê".
    function feedbackHtml(e, acertou, jaRespondida) {
      if (acertou) return `<div class="am-feedback am-ok">✅ ${jaRespondida ? 'Você acertou esta pergunta.' : 'Correto!'} ${e.porque}</div>`;
      return `<div class="am-feedback am-erro">❌ ${jaRespondida ? 'Você errou esta pergunta.' : 'Não foi dessa vez.'} Siga para a próxima.</div>`;
    }

    function responder(e, i, btn) {
      if (estado.respostas[i] !== undefined) return;
      const acertou = parseInt(btn.dataset.orig, 10) === e.certa;
      estado.respostas[i] = acertou ? 1 : 0;
      estado.lastStepIndex = Math.max(estado.lastStepIndex || 0, i);
      salvar();
      reportar(`${tituloAula} — Pergunta ${perguntas.indexOf(i) + 1}/${perguntas.length} (respondida)`);
      stepWrap.querySelectorAll('.am-opcao').forEach(b => { b.disabled = true; });
      btn.classList.add(acertou ? 'am-certa' : 'am-errada');
      document.getElementById('amFeedback').innerHTML = feedbackHtml(e, acertou, false);
      const navEl = stepWrap.querySelector('.ab-nav');
      const rotuloFim = i === TOTAL - 1 ? 'Concluir →' : '';
      navEl.outerHTML = nav(i > 0, true, rotuloFim);
      const back = document.getElementById('btnBack');
      if (back) back.addEventListener('click', () => irPara(atual - 1));
      document.getElementById('btnNext').addEventListener('click', () => irPara(atual + 1));
    }

    function renderFim() {
      document.getElementById('progressFill').style.width = '100%';
      document.getElementById('lblStepNum').textContent = TOTAL;
      const total = perguntas.length;
      const acertos = perguntas.filter(i => estado.respostas[i] === 1).length;
      const faltam = perguntas.filter(i => estado.respostas[i] === undefined).length;
      const pct = total ? Math.min(Math.round((acertos / total) * 100), 100) : 100;

      // Professor pulou perguntas: só revisão, não grava nada.
      if (!revisao && faltam > 0) {
        stepWrap.innerHTML = `
          <div class="ab-cartao am-fim">
            <div class="am-trofeu">🧑‍🏫</div>
            <h2>Fim da aula (revisão)</h2>
            <p>Faltaram ${faltam} pergunta(s) sem resposta — nada foi registrado.</p>
          </div>
          ${nav(true, false)}`;
        mostrar();
        return;
      }

      if (!revisao) {
        estado.lastStepIndex = TOTAL;
        estado.completed = pct >= 80;
        salvar();
        reportar(`${tituloAula} — ${estado.completed ? 'Concluída' : 'Não concluída'} (${acertos}/${total})`);
        if (estado.completed) revisao = true;
      }

      if (estado.completed) {
        stepWrap.innerHTML = `
          <div class="ab-cartao am-fim ab-concluida">
            <div class="am-trofeu">🏆</div>
            <h2>Aula concluída!</h2>
            <div class="am-placar">Você acertou ${acertos} de ${total} perguntas (${pct}%).</div>
            <p>Agora volte à trilha e abra o módulo de prática.</p>
            <div class="am-fim-botoes"><button class="btn btn-secondary" id="btnRever">📖 Rever a aula</button></div>
          </div>`;
        mostrar();
        document.getElementById('btnRever').addEventListener('click', () => { direcao = -1; atual = 0; render(); });
        return;
      }

      stepWrap.innerHTML = `
        <div class="ab-cartao am-fim">
          <div class="am-trofeu">📚</div>
          <h2>Quase lá!</h2>
          <p>Você acertou ${acertos} de ${total} perguntas (${pct}%) — é preciso pelo menos 80% de acerto para concluir esta aula.</p>
          <div class="am-fim-botoes"><button class="btn" id="btnRestart">🔁 Tentar novamente</button></div>
        </div>`;
      mostrar();
      document.getElementById('btnRestart').addEventListener('click', () => {
        estado = estadoVazio();
        ordens = {};
        try { localStorage.setItem(ORDEM_KEY, '{}'); } catch (e) {}
        salvar();
        direcao = -1;
        atual = 0;
        render();
      });
    }

    // Código com "Copiar" (renderBlocks do slides-md) — o botão some quando o
    // professor bloqueia "Copiar e Colar" (ver aula-md.css).
    stepWrap.addEventListener('click', ev => {
      const copy = ev.target.closest('.sm-copy');
      if (!copy || document.documentElement.classList.contains('clipboard-guard-blocked')) return;
      const code = copy.closest('.sm-code').querySelector('code').innerText;
      (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => {
        copy.textContent = '✔ Copiado';
        setTimeout(() => { copy.textContent = 'Copiar'; }, 1400);
      }).catch(() => {});
    });

    // ---------- ▶ Apresentação (só professor) ----------
    let presenter = null, presenterRoot = null;
    const apresentando = () => presenterRoot && !presenterRoot.hidden;
    async function apresentar() {
      if (!presenter) {
        const base = MEU_SRC || location.href;
        await Promise.all([
          carregarCss(new URL('slides-md.css', base).href),
          carregarCss('https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/styles/github-dark.min.css'),
          carregarJs('https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/highlight.min.js'),
          carregarJs('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js'),
        ]);
        presenterRoot = document.createElement('div');
        presenterRoot.className = 'sm-presenter';
        presenterRoot.hidden = true;
        document.body.appendChild(presenterRoot);
        presenter = SM.createPresenter(presenterRoot, {
          remoto: { client: () => window.PortalSession.client(), url: new URL('../professor/controle.html', base).href },
        });
      }
      const deck = SM.parse(texto, mdUrl);
      if (capacidade && deck.slides[0]) {
        deck.slides[0].html += `<p class="sm-anim sm-capacidade" style="--d:9"><strong>Capacidade:</strong> ${esc(capacidade)}</p>`;
      }
      presenter.abrir(deck, atual < TOTAL ? atual : 0);
    }

    if (window.AulaBase) {
      window.AulaBase.teclado({
        proximo: () => { if (apresentando()) return; const b = document.getElementById('btnNext'); if (b) b.click(); },
        anterior: () => { if (apresentando()) return; const b = document.getElementById('btnBack'); if (b) b.click(); },
      });
    }

    (async function () {
      const user = window.PortalSession ? await window.PortalSession.getUser().catch(() => null) : null;
      if (!user || user.role !== 'professor') return;
      isProfessor = true;
      const btn = document.getElementById('btnApresentar');
      btn.hidden = false;
      btn.addEventListener('click', apresentar);
      // Libera o "Próximo" da pergunta que já estava na tela.
      if (atual < TOTAL && etapas[atual].tipo === 'pergunta' && estado.respostas[atual] === undefined) render();
    })();

    render();
  }

  return { iniciar };
})();
