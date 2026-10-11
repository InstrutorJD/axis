// Projetos (professor/projetos.html): caderno de projetos do professor —
// anotações rápidas pra não esquecer detalhes. Só o professor vê (a página
// barra aluno e substituto, e no banco cada linha é do próprio professor).
// - Projetos na lateral (só o nome e a cor); aba "Arquivados" com os
//   projetos arquivados (somem da lista normal).
// - Dentro do projeto: campo rápido no topo (Enter salva, Shift+Enter
//   quebra linha). Cada anotação é 💡 Ideia, 🔎 Pesquisa ou 🔗 Link; colar
//   só um link vira Link sozinho e mostra o site de onde veio.
// - Anotação: fixar no topo, editar, arquivar (vai pra aba "Arquivadas" do
//   projeto) e apagar. Filtro: Tudo · Ideias · Pesquisas · Links ·
//   Arquivadas.
// Sem Markdown de propósito: é pra anotar rápido (texto puro, links viram
// clicáveis). Textos maiores e conectados ficam no Conhecimentos.
//
// Dados: tabelas public.professor_projetos e public.professor_projeto_itens
// (sql/professor-projetos.sql). Sem as tabelas, salva só neste navegador
// (localStorage) e avisa. Estilos em shared/projetos.css.
//
// Uso: window.Projetos.montar(elemento, clienteSupabase)
window.Projetos = (function () {
  const T_PROJ = 'professor_projetos';
  const T_ITEM = 'professor_projeto_itens';
  const CHAVE_LOCAL = 'axis.projetos.v1';

  const CORES = [['azul', '#3b82f6'], ['roxo', '#8b5cf6'], ['rosa', '#ec4899'], ['vermelho', '#f43f5e'], ['laranja', '#f97316'],
    ['amarelo', '#eab308'], ['verde', '#10b981'], ['ciano', '#06b6d4'], ['cinza', '#6b7280']];
  const COR = Object.fromEntries(CORES);
  const TIPOS = {
    ideia: { nome: 'Ideia', plural: 'Ideias', emoji: '💡' },
    pesquisa: { nome: 'Pesquisa', plural: 'Pesquisas', emoji: '🔎' },
    link: { nome: 'Link', plural: 'Links', emoji: '🔗' },
  };

  const ICONES = {
    mais: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
    mais3: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    pino: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
    lapis: '<path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/>',
    arquivo: '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
    desarquivo: '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="m9.5 17 2.5-2.5 2.5 2.5"/><path d="M12 14.5V20"/>',
    lixo: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    externo: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    pasta: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  };
  const ico = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[n]}</svg>`;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const novoId = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
  const agoraISO = () => new Date().toISOString();

  // Link: o texto inteiro é um endereço só.
  const RE_URL = /https?:\/\/[^\s<>"']+/g;
  const soLink = t => /^https?:\/\/\S+$/.test(String(t || '').trim());
  const limparUrl = u => u.replace(/[.,;:!?)\]]+$/, '');
  function dominio(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url; }
  }
  // Texto puro com quebras de linha e links clicáveis.
  function textoComLinks(t) {
    let html = '';
    let ultimo = 0;
    const s = String(t || '');
    for (const m of s.matchAll(RE_URL)) {
      const url = limparUrl(m[0]);
      html += esc(s.slice(ultimo, m.index));
      html += `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(url.length > 60 ? `${url.slice(0, 57)}…` : url)}</a>`;
      ultimo = m.index + url.length;
    }
    html += esc(s.slice(ultimo));
    return html.replace(/\n/g, '<br>');
  }
  function quando(iso) {
    const d = new Date(iso);
    const hoje = new Date();
    const ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === hoje.toDateString()) return `hoje, ${hora}`;
    if (d.toDateString() === ontem.toDateString()) return `ontem, ${hora}`;
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: d.getFullYear() === hoje.getFullYear() ? undefined : 'numeric' });
  }

  // ---------- Estado ----------
  const st = {
    sb: null,
    modo: 'supabase',
    projetos: [],
    itens: [],
    atualId: null,
    abaLateral: 'ativos',       // 'ativos' | 'arquivados'
    filtro: 'tudo',             // 'tudo' | 'ideia' | 'pesquisa' | 'link' | 'arquivadas'
    tipoNovo: 'ideia',
    tipoAntesDoLink: null,      // tipo escolhido antes de colar um link (volta depois)
    editandoId: null,
  };
  let raiz = null;
  const $ = sel => raiz.querySelector(sel);
  const atual = () => st.projetos.find(p => p.id === st.atualId) || null;
  const itensDo = id => st.itens.filter(i => i.projeto_id === id);

  // ---------- Persistência ----------
  function lerLocal() {
    try { return JSON.parse(localStorage.getItem(CHAVE_LOCAL)) || { projetos: [], itens: [] }; } catch (e) { return { projetos: [], itens: [] }; }
  }
  function gravarLocal() {
    try { localStorage.setItem(CHAVE_LOCAL, JSON.stringify({ projetos: st.projetos, itens: st.itens })); } catch (e) { /* bloqueado */ }
  }
  async function carregar() {
    if (st.sb) {
      const [p, i] = await Promise.all([
        st.sb.from(T_PROJ).select('id, titulo, descricao, cor, arquivado, created_at, updated_at').order('created_at', { ascending: false }),
        st.sb.from(T_ITEM).select('id, projeto_id, tipo, texto, url, fixado, arquivado, created_at, updated_at').order('created_at', { ascending: false }),
      ]);
      if (!p.error && !i.error) { st.modo = 'supabase'; st.projetos = p.data || []; st.itens = i.data || []; return; }
      console.warn('[projetos] tabelas indisponíveis, salvando só neste navegador:', (p.error || i.error).message);
    }
    st.modo = 'local';
    const l = lerLocal();
    st.projetos = l.projetos || [];
    st.itens = l.itens || [];
  }
  async function salvar(tabela, linha) {
    linha.updated_at = agoraISO();
    if (st.modo === 'local') { gravarLocal(); return true; }
    const { error } = await st.sb.from(tabela).upsert(linha, { onConflict: 'id' });
    if (error) { aviso(`Não salvou: ${error.message}`); return false; }
    return true;
  }
  async function apagar(tabela, id) {
    if (st.modo === 'local') { gravarLocal(); return; }
    const { error } = await st.sb.from(tabela).delete().eq('id', id);
    if (error) aviso(`Não apagou: ${error.message}`);
  }

  // ---------- Ações ----------
  async function novoProjeto() {
    const p = { id: novoId(), titulo: '', descricao: '', cor: CORES[st.projetos.length % CORES.length][0], arquivado: false, created_at: agoraISO(), updated_at: agoraISO() };
    st.projetos.unshift(p);
    st.abaLateral = 'ativos';
    st.atualId = p.id;
    st.filtro = 'tudo';
    render();
    $('.pj-titulo').focus();
    await salvar(T_PROJ, p);
  }
  async function anotar() {
    const p = atual();
    const campo = $('.pj-novo-texto');
    const texto = campo.value.trim();
    if (!p || !texto) return;
    const link = soLink(texto);
    const tipo = link ? 'link' : st.tipoNovo;
    const it = {
      id: novoId(), projeto_id: p.id, tipo,
      texto: link ? '' : texto,
      url: link ? limparUrl(texto) : ((texto.match(RE_URL) || [])[0] ? limparUrl(texto.match(RE_URL)[0]) : null),
      fixado: false, arquivado: false, created_at: agoraISO(), updated_at: agoraISO(),
    };
    if (tipo !== 'link') it.url = null;
    st.itens.unshift(it);
    campo.value = '';
    ajustarAltura(campo);
    if (st.tipoAntesDoLink) { st.tipoNovo = st.tipoAntesDoLink; st.tipoAntesDoLink = null; renderTipos(); }
    if (st.filtro !== 'tudo' && st.filtro !== tipo) st.filtro = 'tudo';
    renderItens();
    renderFiltros();
    await salvar(T_ITEM, it);
  }
  async function mudarItem(id, mudancas) {
    const it = st.itens.find(i => i.id === id);
    if (!it) return;
    Object.assign(it, mudancas);
    renderItens();
    renderFiltros();
    await salvar(T_ITEM, it);
  }
  async function mudarProjeto(mudancas) {
    const p = atual();
    if (!p) return;
    Object.assign(p, mudancas);
    render();
    await salvar(T_PROJ, p);
  }

  // ---------- Tela ----------
  function montarTela() {
    raiz.innerHTML = `
      <aside class="pj-lado" aria-label="Projetos">
        <button type="button" class="btn pj-novo-projeto" data-acao="novo-projeto">${ico('mais')}<span>Novo projeto</span></button>
        <div class="pj-abas" role="tablist">
          <button type="button" role="tab" data-aba="ativos">Projetos</button>
          <button type="button" role="tab" data-aba="arquivados">Arquivados <span class="pj-n-arq"></span></button>
        </div>
        <nav class="pj-lista" aria-label="Lista de projetos"></nav>
        <p class="pj-local" hidden>Salvando só neste navegador. Rode <code>sql/professor-projetos.sql</code> no Supabase pra guardar na sua conta.</p>
      </aside>

      <main class="pj-centro">
        <button type="button" class="pj-icone-btn pj-so-estreito" data-acao="lado" aria-label="Mostrar projetos">${ico('menu')}</button>
        <div class="pj-conteudo">
          <div class="pj-arquivado-aviso" hidden>
            ${ico('arquivo')}<span>Este projeto está arquivado.</span>
            <button type="button" class="btn btn-secondary" data-acao="desarquivar-projeto">Desarquivar</button>
          </div>
          <header class="pj-cabeca">
            <button type="button" class="pj-cor" data-acao="menu-projeto" aria-label="Cor e opções do projeto"></button>
            <input class="pj-titulo" type="text" maxlength="120" placeholder="Projeto sem nome" aria-label="Nome do projeto" autocomplete="off">
            <button type="button" class="pj-icone-btn" data-acao="menu-projeto" aria-label="Opções do projeto">${ico('mais3')}</button>
          </header>
          <input class="pj-descricao" type="text" maxlength="240" placeholder="Descrição (opcional)" aria-label="Descrição do projeto" autocomplete="off">

          <div class="pj-novo">
            <textarea class="pj-novo-texto" rows="1" placeholder="Anote uma ideia, uma pesquisa ou cole um link…" aria-label="Nova anotação"></textarea>
            <div class="pj-novo-rodape">
              <div class="pj-tipos" role="radiogroup" aria-label="Tipo da anotação">
                ${Object.entries(TIPOS).map(([k, t]) => `<button type="button" role="radio" data-tipo-novo="${k}">${t.emoji} ${t.nome}</button>`).join('')}
              </div>
              <span class="pj-dica">Enter salva · Shift+Enter nova linha</span>
            </div>
          </div>

          <div class="pj-filtros" role="tablist" aria-label="Filtrar anotações"></div>
          <div class="pj-itens"></div>
        </div>

        <div class="pj-vazio" hidden>
          <div class="pj-vazio-icone">${ico('pasta')}</div>
          <h2>Seus projetos</h2>
          <p>Guarde ideias, pesquisas e links de referência pra não esquecer nenhum detalhe.</p>
          <button type="button" class="btn" data-acao="novo-projeto">${ico('mais')}Criar o primeiro projeto</button>
        </div>
      </main>
      <div class="pj-veu" data-acao="fechar-lado"></div>`;

    raiz.addEventListener('click', async e => {
      const abrir = e.target.closest('[data-abrir]');
      if (abrir) { st.atualId = abrir.dataset.abrir; st.filtro = 'tudo'; st.editandoId = null; raiz.classList.remove('pj-mostrar-lado'); render(); return; }
      const aba = e.target.closest('[data-aba]');
      if (aba) { st.abaLateral = aba.dataset.aba; renderLista(); return; }
      const tipo = e.target.closest('[data-tipo-novo]');
      if (tipo) { st.tipoNovo = tipo.dataset.tipoNovo; st.tipoAntesDoLink = null; renderTipos(); $('.pj-novo-texto').focus(); return; }
      const filtro = e.target.closest('[data-filtro]');
      if (filtro) { st.filtro = filtro.dataset.filtro; st.editandoId = null; renderFiltros(); renderItens(); return; }
      const b = e.target.closest('[data-acao]');
      if (!b) return;
      const a = b.dataset.acao;
      const id = b.closest('[data-item]') && b.closest('[data-item]').dataset.item;
      const it = id && st.itens.find(i => i.id === id);
      if (a === 'novo-projeto') novoProjeto();
      else if (a === 'lado') raiz.classList.toggle('pj-mostrar-lado');
      else if (a === 'fechar-lado') raiz.classList.remove('pj-mostrar-lado');
      else if (a === 'menu-projeto') abrirMenuProjeto(b);
      else if (a === 'desarquivar-projeto') { await mudarProjeto({ arquivado: false }); st.abaLateral = 'ativos'; renderLista(); }
      else if (a === 'fixar' && it) mudarItem(id, { fixado: !it.fixado });
      else if (a === 'arquivar' && it) { await mudarItem(id, { arquivado: true, fixado: false }); aviso('Anotação arquivada. Está na aba “Arquivadas”.'); }
      else if (a === 'desarquivar' && it) mudarItem(id, { arquivado: false });
      else if (a === 'editar' && it) { st.editandoId = id; renderItens(); const t = $('.pj-edicao textarea'); t.focus(); t.setSelectionRange(t.value.length, t.value.length); ajustarAltura(t); }
      else if (a === 'cancelar-edicao') { st.editandoId = null; renderItens(); }
      else if (a === 'salvar-edicao' && it) salvarEdicao(it);
      else if (a === 'apagar' && it) {
        if (!confirm('Apagar esta anotação? Não dá pra desfazer.')) return;
        st.itens = st.itens.filter(i => i.id !== id);
        renderItens(); renderFiltros();
        await apagar(T_ITEM, id);
      }
    });

    // Nome e descrição: salvam ao sair do campo (Enter também).
    [['.pj-titulo', 'titulo'], ['.pj-descricao', 'descricao']].forEach(([sel, campo]) => {
      const el = $(sel);
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); (campo === 'titulo' ? $('.pj-descricao') : $('.pj-novo-texto')).focus(); }
      });
      el.addEventListener('blur', () => {
        const p = atual();
        const v = el.value.trim();
        if (p && p[campo] !== v) mudarProjeto({ [campo]: v });
      });
    });

    // Campo rápido
    const novo = $('.pj-novo-texto');
    novo.addEventListener('input', () => {
      ajustarAltura(novo);
      // Colou um link sozinho: já marca como Link.
      if (soLink(novo.value) && st.tipoNovo !== 'link') {
        st.tipoAntesDoLink = st.tipoNovo;
        st.tipoNovo = 'link';
        renderTipos();
      } else if (!soLink(novo.value) && st.tipoAntesDoLink) {
        st.tipoNovo = st.tipoAntesDoLink;
        st.tipoAntesDoLink = null;
        renderTipos();
      }
    });
    novo.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); anotar(); }
    });

    // Edição de anotação: Enter salva, Esc cancela.
    raiz.addEventListener('keydown', e => {
      const t = e.target.closest('.pj-edicao textarea');
      if (!t) return;
      const it = st.itens.find(i => i.id === st.editandoId);
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (it) salvarEdicao(it); }
      else if (e.key === 'Escape') { e.preventDefault(); st.editandoId = null; renderItens(); }
    });
    raiz.addEventListener('input', e => { if (e.target.closest('.pj-edicao textarea')) ajustarAltura(e.target); });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { fecharMenu(); raiz.classList.remove('pj-mostrar-lado'); }
    });
  }

  function salvarEdicao(it) {
    const caixa = $('.pj-edicao');
    const texto = caixa.querySelector('textarea').value.trim();
    const tipo = caixa.querySelector('select').value;
    if (!texto) { aviso('A anotação ficou vazia. Use “Apagar” se quiser tirar.'); return; }
    st.editandoId = null;
    const link = tipo === 'link';
    const urls = texto.match(RE_URL) || [];
    mudarItem(it.id, {
      tipo,
      texto: link && soLink(texto) ? '' : texto,
      url: link ? (urls[0] ? limparUrl(urls[0]) : null) : null,
    });
  }

  function ajustarAltura(t) {
    t.style.height = 'auto';
    t.style.height = `${Math.min(t.scrollHeight, 320)}px`;
  }

  // Menu do projeto: cor, arquivar, apagar.
  let menu = null;
  function fecharMenu() { if (menu) { menu.remove(); menu = null; } }
  function abrirMenuProjeto(botao) {
    if (menu) { fecharMenu(); return; }
    const p = atual();
    if (!p) return;
    menu = document.createElement('div');
    menu.className = 'pj-menu';
    menu.innerHTML = `
      <div class="pj-menu-rotulo">Cor</div>
      <div class="pj-menu-cores">${CORES.map(([k, c]) => `<button type="button" class="pj-menu-cor${p.cor === k ? ' pj-sel' : ''}" data-cor="${k}" style="--c:${c}" aria-label="${k}"></button>`).join('')}</div>
      <div class="pj-menu-sep"></div>
      ${p.arquivado
        ? `<button type="button" class="pj-menu-item" data-m="desarquivar">${ico('desarquivo')}Desarquivar projeto</button>`
        : `<button type="button" class="pj-menu-item" data-m="arquivar">${ico('arquivo')}Arquivar projeto</button>`}
      <button type="button" class="pj-menu-item pj-perigo" data-m="apagar">${ico('lixo')}Apagar projeto</button>`;
    document.body.appendChild(menu);
    const r = botao.getBoundingClientRect();
    menu.style.top = `${r.bottom + 6}px`;
    menu.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - menu.offsetWidth - 8))}px`;
    menu.addEventListener('click', async e => {
      const cor = e.target.closest('[data-cor]');
      if (cor) { fecharMenu(); mudarProjeto({ cor: cor.dataset.cor }); return; }
      const m = e.target.closest('[data-m]');
      if (!m) return;
      fecharMenu();
      if (m.dataset.m === 'arquivar') {
        await mudarProjeto({ arquivado: true });
        aviso('Projeto arquivado. Está na aba “Arquivados”.');
        const proximo = st.projetos.find(x => !x.arquivado);
        st.atualId = proximo ? proximo.id : null;
        render();
      } else if (m.dataset.m === 'desarquivar') {
        await mudarProjeto({ arquivado: false });
        st.abaLateral = 'ativos';
        renderLista();
      } else if (m.dataset.m === 'apagar') {
        const n = itensDo(p.id).length;
        if (!confirm(`Apagar o projeto “${p.titulo || 'Projeto sem nome'}”${n ? ` e as ${n} anotações dele` : ''}? Não dá pra desfazer.`)) return;
        st.projetos = st.projetos.filter(x => x.id !== p.id);
        st.itens = st.itens.filter(i => i.projeto_id !== p.id);
        const proximo = st.projetos.find(x => !!x.arquivado === (st.abaLateral === 'arquivados')) || st.projetos.find(x => !x.arquivado);
        st.atualId = proximo ? proximo.id : null;
        render();
        await apagar(T_PROJ, p.id);   // as anotações vão junto (on delete cascade)
      }
    });
  }
  document.addEventListener('pointerdown', e => {
    if (menu && !menu.contains(e.target) && !e.target.closest('[data-acao="menu-projeto"]')) fecharMenu();
  });

  // ---------- Desenho ----------
  function render() {
    const p = atual();
    $('.pj-local').hidden = st.modo !== 'local';
    $('.pj-conteudo').hidden = !p;
    $('.pj-vazio').hidden = !!p;
    renderLista();
    if (!p) return;
    raiz.style.setProperty('--pj-cor', COR[p.cor] || COR.azul);
    $('.pj-arquivado-aviso').hidden = !p.arquivado;
    const titulo = $('.pj-titulo'), desc = $('.pj-descricao');
    if (document.activeElement !== titulo) titulo.value = p.titulo;
    if (document.activeElement !== desc) desc.value = p.descricao || '';
    renderTipos();
    renderFiltros();
    renderItens();
  }

  function renderLista() {
    const arq = st.abaLateral === 'arquivados';
    raiz.querySelectorAll('[data-aba]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.aba === st.abaLateral)));
    const nArq = st.projetos.filter(p => p.arquivado).length;
    $('.pj-n-arq').textContent = nArq || '';
    const lista = st.projetos.filter(p => !!p.arquivado === arq);
    $('.pj-lista').innerHTML = lista.length ? lista.map(p => `
      <button type="button" class="pj-item${p.id === st.atualId ? ' pj-ativo' : ''}" data-abrir="${esc(p.id)}"${p.id === st.atualId ? ' aria-current="page"' : ''}>
        <i style="background:${COR[p.cor] || COR.azul}"></i><span class="${p.titulo ? '' : 'pj-sem-nome'}">${esc(p.titulo || 'Projeto sem nome')}</span>
      </button>`).join('')
      : `<p class="pj-lista-vazia">${arq ? 'Nenhum projeto arquivado.' : 'Nenhum projeto ainda.'}</p>`;
  }

  function renderTipos() {
    raiz.querySelectorAll('[data-tipo-novo]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.tipoNovo === st.tipoNovo)));
  }

  function renderFiltros() {
    const p = atual();
    if (!p) return;
    const todos = itensDo(p.id);
    const ativos = todos.filter(i => !i.arquivado);
    const n = { tudo: ativos.length, arquivadas: todos.length - ativos.length };
    Object.keys(TIPOS).forEach(k => { n[k] = ativos.filter(i => i.tipo === k).length; });
    const abas = [['tudo', 'Tudo'], ...Object.entries(TIPOS).map(([k, t]) => [k, t.plural])];
    if (n.arquivadas || st.filtro === 'arquivadas') abas.push(['arquivadas', 'Arquivadas']);
    $('.pj-filtros').innerHTML = abas.map(([k, nome]) => `
      <button type="button" role="tab" data-filtro="${k}" aria-selected="${st.filtro === k}"${k === 'arquivadas' ? ' class="pj-filtro-arq"' : ''}>${nome}${n[k] ? `<small>${n[k]}</small>` : ''}</button>`).join('');
  }

  function htmlItem(it) {
    const t = TIPOS[it.tipo] || TIPOS.ideia;
    if (it.id === st.editandoId) {
      const valor = it.tipo === 'link' && !it.texto ? it.url : it.texto + (it.tipo === 'link' && it.url && !it.texto.includes(it.url) ? `\n${it.url}` : '');
      return `
        <article class="pj-cartao pj-edicao" data-item="${esc(it.id)}">
          <textarea rows="2" aria-label="Editar anotação">${esc(valor)}</textarea>
          <div class="pj-edicao-rodape">
            <select aria-label="Tipo">${Object.entries(TIPOS).map(([k, x]) => `<option value="${k}"${k === it.tipo ? ' selected' : ''}>${x.emoji} ${x.nome}</option>`).join('')}</select>
            <span class="pj-dica">Enter salva · Esc cancela</span>
            <button type="button" class="btn btn-secondary" data-acao="cancelar-edicao">Cancelar</button>
            <button type="button" class="btn" data-acao="salvar-edicao">Salvar</button>
          </div>
        </article>`;
    }
    let corpo = '';
    if (it.tipo === 'link' && it.url) {
      corpo = `
        ${it.texto ? `<div class="pj-texto">${textoComLinks(it.texto.replace(it.url, '').trim())}</div>` : ''}
        <a class="pj-link" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">
          <span class="pj-link-dominio">${esc(dominio(it.url))}</span>
          <span class="pj-link-url">${esc(it.url)}</span>
          ${ico('externo')}
        </a>`;
    } else corpo = `<div class="pj-texto">${textoComLinks(it.texto)}</div>`;
    const acoes = it.arquivado
      ? `<button type="button" class="pj-icone-btn" data-acao="desarquivar" title="Desarquivar">${ico('desarquivo')}</button>`
      : `<button type="button" class="pj-icone-btn${it.fixado ? ' pj-ligado' : ''}" data-acao="fixar" title="${it.fixado ? 'Desafixar' : 'Fixar no topo'}">${ico('pino')}</button>
         <button type="button" class="pj-icone-btn" data-acao="editar" title="Editar">${ico('lapis')}</button>
         <button type="button" class="pj-icone-btn" data-acao="arquivar" title="Arquivar">${ico('arquivo')}</button>`;
    return `
      <article class="pj-cartao pj-tipo-${esc(it.tipo)}${it.fixado ? ' pj-fixado' : ''}" data-item="${esc(it.id)}">
        <div class="pj-cartao-topo">
          <span class="pj-tipo">${t.emoji} ${t.nome}</span>
          ${it.fixado ? `<span class="pj-fixo">${ico('pino')}Fixada</span>` : ''}
          <span class="pj-data">${quando(it.created_at)}</span>
          <div class="pj-acoes">${acoes}
            <button type="button" class="pj-icone-btn pj-apagar" data-acao="apagar" title="Apagar">${ico('lixo')}</button>
          </div>
        </div>
        ${corpo}
      </article>`;
  }

  function renderItens() {
    const p = atual();
    if (!p) return;
    const todos = itensDo(p.id);
    let lista = st.filtro === 'arquivadas'
      ? todos.filter(i => i.arquivado)
      : todos.filter(i => !i.arquivado && (st.filtro === 'tudo' || i.tipo === st.filtro));
    lista = lista.sort((a, b) => (b.fixado - a.fixado) || String(b.created_at).localeCompare(String(a.created_at)));
    $('.pj-novo').hidden = st.filtro === 'arquivadas';
    const vazio = st.filtro === 'arquivadas' ? 'Nenhuma anotação arquivada.'
      : st.filtro === 'tudo' ? 'Nada anotado ainda. Escreva acima e aperte Enter.'
        : `Nenhuma anotação do tipo ${TIPOS[st.filtro].nome.toLowerCase()}.`;
    $('.pj-itens').innerHTML = lista.length ? lista.map(htmlItem).join('') : `<p class="pj-itens-vazio">${vazio}</p>`;
  }

  // ---------- Aviso ----------
  function aviso(texto) {
    const t = document.createElement('div');
    t.className = 'pj-aviso';
    t.setAttribute('role', 'status');
    t.textContent = texto;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('pj-saindo'), 2800);
    setTimeout(() => t.remove(), 3200);
  }

  async function montar(elemento, sbClient) {
    raiz = elemento;
    raiz.classList.add('pj-app');
    st.sb = sbClient || null;
    montarTela();
    await carregar();
    const primeiro = st.projetos.find(p => !p.arquivado);
    st.atualId = primeiro ? primeiro.id : null;
    render();
  }

  return { montar };
})();
