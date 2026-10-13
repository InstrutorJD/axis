// "▶ Apresentação" para as páginas de etapas escritas à mão (const STEPS =
// [{ titulo, corpo }], ex.: as fichas da Culminância). Faz o mesmo que o
// botão das teorias em .md (shared/aula-md.js): só pro professor, as etapas
// viram os slides do Criar Material (shared/slides-md.js) em tela cheia,
// com o passador de slides no celular (botão 📱 da apresentação).
//
// Uso (depois de aula-base.js):
//   ApresentacaoEtapas.ligar({ titulo: 'Culminância — ...', steps: STEPS, etapaAtual: () => currentIndex });
//   e, no AulaBase.teclado da página, ignorar as setas enquanto
//   ApresentacaoEtapas.ativa() — senão a ficha por trás anda junto.
//
// O corpo das etapas usa as marcações das fichas (¤código¤, §§§ blocos de
// código §§§, "- [ ]" checklist); aqui viram o formato do slides-md
// (`código`, ```, lista comum — "- [ ]" lá seria pergunta pra turma).
window.ApresentacaoEtapas = (function () {
  const MEU_SRC = (document.currentScript && document.currentScript.src) || '';
  let presenter = null, presenterRoot = null;

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

  function corpoParaMd(corpo) {
    return String(corpo || '').replace(/\r\n?/g, '\n').split('\n').map(linha => {
      const cod = linha.match(/^(\s*)§§§\s*([\w+#.-]*)\s*$/);
      if (cod) return `${cod[1]}\`\`\`${cod[2]}`;
      return linha
        .replace(/^(\s*[-*]\s+)\[( |x|X)\]\s*/, '$1')
        .replace(/¤([^¤]+)¤/g, '`$1`');
    }).join('\n');
  }

  function montarMd(titulo, steps) {
    const slides = [`# ${titulo}`];
    steps.forEach(s => slides.push(`## ${s.titulo}\n\n${corpoParaMd(s.corpo).trim()}`));
    return slides.join('\n\n---\n\n');
  }

  const ativa = () => !!(presenterRoot && !presenterRoot.hidden);

  async function apresentar(opts) {
    if (!presenter) {
      const base = MEU_SRC || location.href;
      await Promise.all([
        carregarCss(new URL('slides-md.css', base).href),
        carregarCss('https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/styles/github-dark.min.css'),
        carregarJs('https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/highlight.min.js'),
        carregarJs('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js'),
        window.SlidesMD ? null : carregarJs(new URL('slides-md.js', base).href),
      ]);
      if (!window.SlidesMD) return;
      presenterRoot = document.createElement('div');
      presenterRoot.className = 'sm-presenter';
      presenterRoot.hidden = true;
      document.body.appendChild(presenterRoot);
      presenter = window.SlidesMD.createPresenter(presenterRoot, {
        remoto: { client: () => window.PortalSession.client(), url: new URL('../professor/controle.html', base).href },
      });
    }
    const deck = window.SlidesMD.parse(montarMd(opts.titulo, opts.steps), location.href);
    // Slide 0 é a capa; a etapa i da ficha é o slide i + 1 (o visto, que
    // não tem slide, abre na capa).
    const i = opts.etapaAtual ? opts.etapaAtual() : -1;
    presenter.abrir(deck, i >= 0 && i < opts.steps.length ? i + 1 : 0);
  }

  function estilo() {
    if (document.getElementById('aeEstilo')) return;
    const st = document.createElement('style');
    st.id = 'aeEstilo';
    st.textContent = `
      .ae-topo-dir{ display:flex; align-items:center; gap:10px; flex-shrink:0; }
      .ae-btn-apresentar{
        font:inherit; font-size:12px; font-weight:800; cursor:pointer; padding:5px 14px; border-radius:999px;
        border:1px solid var(--green-dim); background:transparent; color:var(--ab-acento);
      }
      .ae-btn-apresentar:hover{ background:color-mix(in srgb, var(--green) 12%, transparent); }
      body:has(.sm-presenter:not([hidden])) #btnGenGabaritoFloat{ display:none; }
      @media (max-width:700px){ .ae-btn-apresentar{ display:none; } }
    `;
    document.head.appendChild(st);
  }

  async function ligar(opts) {
    if (!window.PortalSession) return;
    let user = null;
    try { user = await window.PortalSession.getUser(); } catch (e) { return; }
    if (!user || user.role !== 'professor') return;
    const etapa = document.querySelector('.ab-topo .ab-topo-etapa');
    if (!etapa) return;
    estilo();
    const dir = document.createElement('div');
    dir.className = 'ae-topo-dir';
    etapa.parentNode.insertBefore(dir, etapa);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ae-btn-apresentar';
    btn.id = 'btnApresentar';
    btn.textContent = '▶ Apresentação';
    btn.addEventListener('click', () => apresentar(opts));
    dir.appendChild(btn);
    dir.appendChild(etapa);
  }

  return { ligar, ativa };
})();
