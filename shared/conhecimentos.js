// Conhecimentos (professor/conhecimentos.html): base de notas do professor
// no estilo do Obsidian. Só o professor vê (a página barra aluno e
// substituto, e no banco cada linha é do próprio professor).
// - Notas em Markdown, com modo Editar | Visualizar (Ctrl+E);
// - conexões com [[Nome da nota]] (ou [[Nome|texto]]): ao digitar "[[" abre
//   a lista de notas; link pra nota que ainda não existe fica tracejado e
//   clicar nele cria a nota;
// - "Mencionada em" (backlinks) e "Links desta nota" na coluna da direita;
// - grafo: geral (botão Grafo, Ctrl+G) e local (vizinhos da nota aberta),
//   com física, arrastar, zoom e clique pra abrir;
// - #tags filtram a lista; renomear uma nota atualiza os [[links]] das
//   outras.
// Markdown aceito: títulos, **negrito**, *itálico*, ~~riscado~~,
// ==destaque==, `código`, blocos ```, listas (com - [ ] tarefas, que dá pra
// marcar na visualização), citações, callouts (> [!dica] Título), tabelas,
// links [texto](https://...) e linha ---.
//
// Dados: tabela public.professor_notas (sql/professor-notas.sql). Sem a
// tabela, salva só neste navegador (localStorage) e avisa. Na 1ª vez, cria
// duas notas de exemplo (só uma vez por navegador; pode apagar).
// Estilos em shared/conhecimentos.css.
//
// Uso: window.Conhecimentos.montar(elemento, clienteSupabase)
window.Conhecimentos = (function () {
  const TABELA = 'professor_notas';
  const CHAVE_LOCAL = 'axis.notas.v1';
  const CHAVE_EXEMPLOS = 'axis.notas.exemplos';
  const CHAVE_MODO = 'axis.notas.modo';
  const CHAVE_FANTASMAS = 'axis.notas.fantasmas';

  const ICONES = {
    mais: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    busca: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    nota: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    grafo: '<circle cx="6" cy="6" r="3"/><circle cx="18" cy="8" r="3"/><circle cx="9" cy="18" r="3"/><path d="m8.5 7.5 6.6.9"/><path d="m7 9 1.4 6"/><path d="m16 10.5-5 5.5"/>',
    lixo: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    fechar: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
    conexoes: '<path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><path d="M8 12h8"/>',
    centro: '<circle cx="12" cy="12" r="3"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="M12 3v3"/><path d="M12 18v3"/>',
  };
  const ico = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[n]}</svg>`;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const chave = t => String(t || '').trim().toLowerCase();
  const semAcento = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const novoId = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
  const lerLS = (k, padrao) => { try { const v = localStorage.getItem(k); return v == null ? padrao : JSON.parse(v); } catch (e) { return padrao; } };
  const gravarLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bloqueado */ } };

  // ---------- Estado ----------
  const st = {
    sb: null,
    modo: 'supabase',
    notas: [],
    atualId: null,
    vista: 'nota',                       // 'nota' | 'grafo'
    editando: lerLS(CHAVE_MODO, 'ver') === 'editar',
    busca: '',
    tag: null,
    mostrarFantasmas: lerLS(CHAVE_FANTASMAS, true),
    // índices (recalculados a cada mudança)
    porTitulo: new Map(),                // chave(titulo) -> nota
    saidas: new Map(),                   // id -> [{ alvo, texto }]
    entradas: new Map(),                 // chave(titulo) -> Set(id)
    tags: new Map(),                     // tag -> Set(id)
    tagsDaNota: new Map(),               // id -> [tag]
    corTag: new Map(),                   // tag -> cor (grafo e #tags no texto)
  };
  let raiz = null;
  const $ = sel => raiz.querySelector(sel);
  const atual = () => st.notas.find(n => n.id === st.atualId) || null;

  // ---------- Leitura do texto (links e tags) ----------
  // Código não conta: tira blocos ``` e trechos `...` antes de procurar.
  const semCodigo = t => String(t || '').replace(/```[\s\S]*?(```|$)/g, ' ').replace(/`[^`\n]*`/g, ' ');
  const RE_LINK = /\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g;
  const RE_TAG = /(^|\s)#([\p{L}\p{N}_\-/]*[\p{L}_\-/][\p{L}\p{N}_\-/]*)/gu;

  function indexar() {
    st.porTitulo = new Map(st.notas.filter(n => chave(n.titulo)).map(n => [chave(n.titulo), n]));
    st.saidas = new Map();
    st.entradas = new Map();
    st.tags = new Map();
    st.tagsDaNota = new Map();
    st.notas.forEach(n => {
      const texto = semCodigo(n.conteudo);
      const links = [];
      const vistos = new Set();
      for (const m of texto.matchAll(RE_LINK)) {
        const alvo = m[1].trim();
        const k = chave(alvo);
        if (!k || vistos.has(k)) continue;
        vistos.add(k);
        links.push({ alvo, texto: (m[2] || alvo).trim() });
        if (!st.entradas.has(k)) st.entradas.set(k, new Set());
        st.entradas.get(k).add(n.id);
      }
      st.saidas.set(n.id, links);
      const tags = [];
      for (const m of texto.matchAll(RE_TAG)) {
        const t = m[2].toLowerCase();
        if (tags.includes(t)) continue;
        tags.push(t);
        if (!st.tags.has(t)) st.tags.set(t, new Set());
        st.tags.get(t).add(n.id);
      }
      st.tagsDaNota.set(n.id, tags);
    });
    st.corTag = coresDasTags();
  }

  // ---------- Markdown ----------
  function inline(s) {
    const guardados = [];
    const guardar = html => `\u0000${guardados.push(html) - 1}\u0000`;
    s = s.replace(/`([^`]+)`/g, (_, c) => guardar(`<code>${esc(c)}</code>`));
    s = s.replace(RE_LINK, (_, alvo, texto) => {
      const existe = st.porTitulo.has(chave(alvo));
      return guardar(`<a href="#" class="cn-wikilink${existe ? '' : ' cn-fantasma'}" data-alvo="${esc(alvo.trim())}" title="${existe ? 'Abrir' : 'Criar'} “${esc(alvo.trim())}”">${esc((texto || alvo).trim())}</a>`);
    });
    s = s.replace(/\[([^\]\n]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g, (_, t, url) =>
      guardar(`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="cn-link-externo">${esc(t)}</a>`));
    s = esc(s);
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(/==(.+?)==/g, '<mark>$1</mark>');
    s = s.replace(RE_TAG, (_, antes, tag) => {
      const cor = st.corTag.get(tag.toLowerCase());
      return `${antes}<a href="#" class="cn-tag" data-tag="${tag.toLowerCase()}"${cor ? ` style="--tag:${cor}"` : ''}>#${tag}</a>`;
    });
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => guardados[Number(i)]);
  }

  const CALLOUTS = { dica: 'Dica', atencao: 'Atenção', 'atenção': 'Atenção', aviso: 'Aviso', info: 'Info', nota: 'Nota', importante: 'Importante', exemplo: 'Exemplo', pergunta: 'Pergunta' };
  const RE_LISTA = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
  const RE_INICIO_BLOCO = /^(```|#{1,6}\s|>|\s*([-*+]|\d+[.)])\s+|\|.*\|\s*$|(-{3,}|\*{3,}|_{3,})\s*$)/;

  // `contador` numera as tarefas (- [ ]) na ordem do texto, pra marcar na
  // visualização e achar a linha certa no texto.
  function markdown(texto, contador = { tarefa: 0 }) {
    const linhas = String(texto || '').replace(/\r/g, '').split('\n');
    let html = '';
    let i = 0;
    while (i < linhas.length) {
      const l = linhas[i];
      if (/^\s*$/.test(l)) { i++; continue; }
      let m;
      if ((m = l.match(/^```\s*([\w+-]*)/))) {
        const corpo = [];
        i++;
        while (i < linhas.length && !/^```/.test(linhas[i])) corpo.push(linhas[i++]);
        i++;
        html += `<pre class="cn-codigo"${m[1] ? ` data-lang="${esc(m[1])}"` : ''}><code>${esc(corpo.join('\n'))}</code></pre>`;
        continue;
      }
      if ((m = l.match(/^(#{1,6})\s+(.*)$/))) {
        html += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`;
        i++;
        continue;
      }
      if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(l)) { html += '<hr>'; i++; continue; }
      if (/^>/.test(l)) {
        const corpo = [];
        while (i < linhas.length && /^>/.test(linhas[i])) corpo.push(linhas[i++].replace(/^>\s?/, ''));
        const c = corpo[0] && corpo[0].match(/^\[!([^\]]+)\]\s*(.*)$/);
        if (c) {
          const tipo = semAcento(c[1]).trim();
          const titulo = c[2] || CALLOUTS[tipo] || c[1];
          html += `<div class="cn-callout cn-callout-${esc(tipo)}"><div class="cn-callout-titulo">${inline(titulo)}</div>${markdown(corpo.slice(1).join('\n'), contador)}</div>`;
        } else html += `<blockquote>${markdown(corpo.join('\n'), contador)}</blockquote>`;
        continue;
      }
      if (/^\|.*\|\s*$/.test(l) && i + 1 < linhas.length && /^\|?\s*:?-{2,}/.test(linhas[i + 1])) {
        const celulas = r => r.trim().replace(/^\||\|$/g, '').split('|').map(x => x.trim());
        const cab = celulas(l);
        i += 2;
        let corpo = '';
        while (i < linhas.length && /^\|.*\|\s*$/.test(linhas[i])) {
          corpo += `<tr>${celulas(linhas[i++]).map(c => `<td>${inline(c)}</td>`).join('')}</tr>`;
        }
        html += `<div class="cn-tabela"><table><thead><tr>${cab.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${corpo}</tbody></table></div>`;
        continue;
      }
      if (RE_LISTA.test(l)) {
        const itens = [];
        while (i < linhas.length && (RE_LISTA.test(linhas[i]) || (/^\s{2,}\S/.test(linhas[i]) && itens.length))) {
          const lm = linhas[i].match(RE_LISTA);
          if (lm) itens.push({ nivel: Math.floor(lm[1].replace(/\t/g, '  ').length / 2), ord: /\d/.test(lm[2]), texto: lm[3] });
          else itens[itens.length - 1].texto += ' ' + linhas[i].trim();
          i++;
        }
        html += lista(itens, contador);
        continue;
      }
      const par = [];
      while (i < linhas.length && !/^\s*$/.test(linhas[i]) && !(par.length && RE_INICIO_BLOCO.test(linhas[i]))) par.push(linhas[i++]);
      html += `<p>${par.map(inline).join('<br>')}</p>`;
    }
    return html;
  }

  function lista(itens, contador) {
    let html = '';
    const pilha = [];
    itens.forEach(it => {
      while (pilha.length && pilha[pilha.length - 1].nivel > it.nivel) html += `</li></${pilha.pop().tag}>`;
      const topo = pilha[pilha.length - 1];
      if (!topo || topo.nivel < it.nivel) {
        const tag = it.ord ? 'ol' : 'ul';
        pilha.push({ nivel: it.nivel, tag });
        html += `<${tag}>`;
      } else html += '</li>';
      const t = it.texto.match(/^\[([ xX])\]\s+(.*)$/);
      if (t) {
        const n = contador.tarefa++;
        html += `<li class="cn-tarefa${t[1] !== ' ' ? ' cn-feita' : ''}"><label><input type="checkbox" data-tarefa="${n}"${t[1] !== ' ' ? ' checked' : ''}><span>${inline(t[2])}</span></label>`;
      } else html += `<li>${inline(it.texto)}`;
    });
    while (pilha.length) html += `</li></${pilha.pop().tag}>`;
    return html;
  }

  // ---------- Persistência ----------
  function normalizar(r) {
    return { id: r.id, titulo: r.titulo || '', conteudo: r.conteudo || '', created_at: r.created_at || new Date().toISOString(), updated_at: r.updated_at || r.created_at || new Date().toISOString() };
  }
  async function carregar() {
    if (st.sb) {
      const { data, error } = await st.sb.from(TABELA).select('id, titulo, conteudo, created_at, updated_at').order('updated_at', { ascending: false });
      if (!error) { st.modo = 'supabase'; st.notas = (data || []).map(normalizar); return; }
      console.warn('[conhecimentos] tabela indisponível, salvando só neste navegador:', error.message);
    }
    st.modo = 'local';
    st.notas = (lerLS(CHAVE_LOCAL, []) || []).map(normalizar);
  }
  // Texto discreto na barra: só aparece enquanto salva ou se der erro.
  function status(texto, tipo) {
    const el = $('.cn-status');
    if (!el) return;
    el.textContent = texto;
    el.dataset.tipo = tipo || '';
  }
  let timerStatus = null;
  async function gravar(notas) {
    notas.forEach(n => { n.updated_at = new Date().toISOString(); });
    if (st.modo === 'local') { gravarLS(CHAVE_LOCAL, st.notas); return true; }
    status('Salvando…');
    const { error } = await st.sb.from(TABELA).upsert(notas.map(n => ({ id: n.id, titulo: n.titulo, conteudo: n.conteudo, updated_at: n.updated_at })), { onConflict: 'id' });
    if (error) { status(`Não salvou: ${error.message}`, 'erro'); return false; }
    status('Salvo');
    clearTimeout(timerStatus);
    timerStatus = setTimeout(() => { if ($('.cn-status').textContent === 'Salvo') status(''); }, 1500);
    return true;
  }
  const timers = new Map();
  function salvarDepois(nota) {
    clearTimeout(timers.get(nota.id));
    timers.set(nota.id, setTimeout(() => { timers.delete(nota.id); gravar([nota]); }, 700));
  }
  async function apagar(nota) {
    st.notas = st.notas.filter(n => n.id !== nota.id);
    if (st.modo === 'local') { gravarLS(CHAVE_LOCAL, st.notas); return; }
    const { error } = await st.sb.from(TABELA).delete().eq('id', nota.id);
    if (error) { st.notas.push(nota); aviso(`Não deu pra apagar: ${error.message}`); renderTudo(); }
  }

  // ---------- Notas ----------
  async function criarNota(titulo, conteudo) {
    const agora = new Date().toISOString();
    const nota = { id: novoId(), titulo: (titulo || '').trim(), conteudo: conteudo || '', created_at: agora, updated_at: agora };
    st.notas.unshift(nota);
    indexar();
    await gravar([nota]);
    return nota;
  }
  async function novaNotaEditando(titulo) {
    const nota = await criarNota(titulo);
    st.editando = true;
    abrir(nota.id);
    (titulo ? $('.cn-editor') : $('.cn-titulo')).focus();
  }

  // Renomear: os [[links]] das outras notas passam a apontar pro nome novo.
  async function renomear(nota, novo) {
    novo = novo.trim().replace(/[[\]|#^]/g, '');
    const antigo = nota.titulo;
    $('.cn-titulo').value = novo;
    if (novo === antigo) return;
    const dono = novo && st.porTitulo.get(chave(novo));
    if (dono && dono.id !== nota.id) {
      aviso(`Já existe uma nota chamada “${dono.titulo}”.`);
      $('.cn-titulo').value = antigo;
      return;
    }
    nota.titulo = novo;
    if (!antigo || !novo) {
      indexar();
      await gravar([nota]);
      renderTudo();
      return;
    }
    const re = new RegExp(`\\[\\[\\s*${antigo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(\\|[^\\]\\n]*)?\\]\\]`, 'gi');
    const mudadas = [nota];
    let links = 0;
    st.notas.forEach(n => {
      if (n === nota) return;
      const trocado = n.conteudo.replace(re, (_, alias) => { links++; return `[[${novo}${alias || ''}]]`; });
      if (trocado !== n.conteudo) { n.conteudo = trocado; mudadas.push(n); }
    });
    indexar();
    await gravar(mudadas);
    if (links) aviso(`${links} link${links > 1 ? 's' : ''} atualizado${links > 1 ? 's' : ''} pra “${novo}”.`);
    renderTudo();
  }

  // Clique num [[link]]: abre; se não existe, cria com esse nome.
  async function seguirLink(alvo) {
    const n = st.porTitulo.get(chave(alvo));
    if (n) { abrir(n.id); return; }
    await novaNotaEditando(alvo.trim());
  }

  function abrir(id) {
    st.atualId = id;
    st.vista = 'nota';
    raiz.classList.remove('cn-mostrar-lado');
    renderTudo();
    const nota = atual();
    if (nota) history.replaceState(null, '', nota.titulo ? `#${encodeURIComponent(nota.titulo)}` : location.pathname);
  }

  // ---------- Montagem ----------
  function montarTela() {
    raiz.innerHTML = `
      <aside class="cn-lado" aria-label="Notas">
        <div class="cn-lado-topo">
          <button type="button" class="btn cn-nova" data-acao="nova" title="Nova nota (Alt+N)">${ico('mais')}<span>Nova nota</span></button>
        </div>
        <label class="cn-busca">${ico('busca')}<input type="search" placeholder="Buscar notas (Ctrl+K)" autocomplete="off"></label>
        <div class="cn-filtro" hidden></div>
        <nav class="cn-lista" aria-label="Lista de notas"></nav>
        <p class="cn-local" hidden>Salvando só neste navegador. Rode <code>sql/professor-notas.sql</code> no Supabase pra guardar na sua conta.</p>
      </aside>

      <main class="cn-centro">
        <div class="cn-barra">
          <button type="button" class="cn-icone-btn cn-so-estreito" data-acao="lado" aria-label="Mostrar notas">${ico('menu')}</button>
          <div class="cn-seg" role="tablist" aria-label="Vista">
            <button type="button" role="tab" data-vista="nota">${ico('nota')}<span>Nota</span></button>
            <button type="button" role="tab" data-vista="grafo" title="Grafo (Ctrl+G)">${ico('grafo')}<span>Grafo</span></button>
          </div>
          <div class="cn-seg cn-seg-modo" role="tablist" aria-label="Modo">
            <button type="button" role="tab" data-modo="editar" title="Editar (Ctrl+E)">Editar</button>
            <button type="button" role="tab" data-modo="ver" title="Visualizar (Ctrl+E)">Visualizar</button>
          </div>
          <span class="cn-status" aria-live="polite"></span>
          <label class="cn-check cn-so-grafo"><input type="checkbox" data-acao="fantasmas"> Notas que ainda não existem</label>
          <button type="button" class="cn-icone-btn cn-so-grafo" data-acao="centralizar" title="Centralizar o grafo">${ico('centro')}</button>
          <button type="button" class="cn-icone-btn cn-excluir cn-so-nota" data-acao="excluir" title="Apagar nota">${ico('lixo')}</button>
          <button type="button" class="cn-icone-btn cn-so-medio" data-acao="dir" aria-label="Mostrar conexões">${ico('conexoes')}</button>
        </div>

        <section class="cn-nota">
          <input class="cn-titulo" type="text" maxlength="160" placeholder="Sem título" aria-label="Título da nota" autocomplete="off" spellcheck="false">
          <textarea class="cn-editor" spellcheck="true" aria-label="Texto da nota (Markdown)" placeholder="Escreva em Markdown. Digite [[ pra conectar com outra nota e # pra criar uma tag."></textarea>
          <article class="cn-preview" tabindex="0"></article>
        </section>

        <section class="cn-grafo-vista" hidden>
          <canvas class="cn-canvas-geral" aria-label="Grafo das notas"></canvas>
          <div class="cn-legenda" aria-label="Cores por tag"></div>
        </section>

        <div class="cn-vazio" hidden>
          <div class="cn-vazio-icone">${ico('grafo')}</div>
          <h2>Sua base de conhecimento</h2>
          <p>Crie notas e conecte os assuntos com <code>[[Nome da nota]]</code>.</p>
          <button type="button" class="btn" data-acao="nova">${ico('mais')}Criar a primeira nota</button>
        </div>
      </main>

      <aside class="cn-dir" aria-label="Conexões">
        <div class="cn-painel">
          <div class="cn-secao-titulo">Grafo local</div>
          <canvas class="cn-canvas-local" aria-label="Notas ligadas à nota aberta"></canvas>
        </div>
        <div class="cn-painel">
          <div class="cn-secao-titulo">Mencionada em <span class="cn-contagem cn-n-entradas"></span></div>
          <div class="cn-entradas"></div>
        </div>
      </aside>
      <div class="cn-veu" data-acao="fechar-gavetas"></div>`;

    // Cliques
    raiz.addEventListener('click', async e => {
      const wl = e.target.closest('.cn-wikilink, [data-abrir-titulo]');
      if (wl) { e.preventDefault(); seguirLink(wl.dataset.alvo || wl.dataset.abrirTitulo); return; }
      const tag = e.target.closest('[data-tag]');
      if (tag) { e.preventDefault(); filtrarTag(tag.dataset.tag); return; }
      const item = e.target.closest('[data-abrir]');
      if (item) { abrir(item.dataset.abrir); return; }
      const vista = e.target.closest('[data-vista]');
      if (vista) { mudarVista(vista.dataset.vista); return; }
      const modo = e.target.closest('[data-modo]');
      if (modo) { mudarModo(modo.dataset.modo === 'editar'); return; }
      const b = e.target.closest('[data-acao]');
      if (!b) return;
      const a = b.dataset.acao;
      if (a === 'nova') novaNotaEditando();
      else if (a === 'excluir') {
        const n = atual();
        if (n && confirm(n.titulo ? `Apagar a nota “${n.titulo}”? Os links pra ela ficam tracejados.` : 'Apagar esta nota sem título?')) {
          await apagar(n);
          indexar();
          st.atualId = st.notas[0] ? st.notas[0].id : null;
          renderTudo();
        }
      } else if (a === 'limpar-tag') filtrarTag(null);
      else if (a === 'centralizar') grafoGeral && grafoGeral.centralizar();
      else if (a === 'lado') raiz.classList.toggle('cn-mostrar-lado');
      else if (a === 'dir') raiz.classList.toggle('cn-mostrar-dir');
      else if (a === 'fechar-gavetas') raiz.classList.remove('cn-mostrar-lado', 'cn-mostrar-dir');
    });
    $('[data-acao="fantasmas"]').addEventListener('change', e => {
      st.mostrarFantasmas = e.target.checked;
      gravarLS(CHAVE_FANTASMAS, st.mostrarFantasmas);
      atualizarGrafos();
    });

    // Tarefas marcadas na visualização mudam o texto.
    $('.cn-preview').addEventListener('change', e => {
      const cb = e.target.closest('[data-tarefa]');
      const nota = atual();
      if (!cb || !nota) return;
      let n = -1, dentroCodigo = false;
      const alvo = Number(cb.dataset.tarefa);
      nota.conteudo = nota.conteudo.split('\n').map(l => {
        if (/^```/.test(l.replace(/^>\s?/, ''))) dentroCodigo = !dentroCodigo;
        if (dentroCodigo) return l;
        return l.replace(/^((?:>\s?)*\s*(?:[-*+]|\d+[.)])\s+)\[([ xX])\]/, (m0, pre, marca) => {
          n++;
          return n === alvo ? `${pre}[${marca === ' ' ? 'x' : ' '}]` : m0;
        });
      }).join('\n');
      indexar();
      salvarDepois(nota);
      renderPreview();
      renderLista();
    });

    // Busca
    $('.cn-busca input').addEventListener('input', e => { st.busca = e.target.value; renderLista(); });

    // Título: renomeia ao sair do campo (ou Enter).
    const titulo = $('.cn-titulo');
    titulo.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); $('.cn-editor').focus(); }
    });
    titulo.addEventListener('blur', () => { const n = atual(); if (n) renomear(n, titulo.value); });

    // Editor
    const ed = $('.cn-editor');
    ed.addEventListener('input', () => {
      const n = atual();
      if (!n) return;
      n.conteudo = ed.value;
      indexar();
      salvarDepois(n);
      renderLista();
      renderPaineis();
      atualizarGrafos();
      verificarSugestao();
    });
    ed.addEventListener('keydown', e => {
      if (sugestao && tratarTeclaSugestao(e)) return;
      if (e.key === 'Tab' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const ini = ed.selectionStart, fim = ed.selectionEnd;
        ed.setRangeText('  ', ini, fim, 'end');
        ed.dispatchEvent(new Event('input'));
      }
    });
    ed.addEventListener('blur', () => setTimeout(fecharSugestao, 120));
    ed.addEventListener('click', verificarSugestao);

    // Atalhos
    document.addEventListener('keydown', e => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === 'e') { e.preventDefault(); if (atual()) mudarModo(!st.editando); }
      else if (ctrl && e.key.toLowerCase() === 'g') { e.preventDefault(); mudarVista(st.vista === 'grafo' ? 'nota' : 'grafo'); }
      else if (ctrl && e.key.toLowerCase() === 'k') { e.preventDefault(); raiz.classList.add('cn-mostrar-lado'); $('.cn-busca input').focus(); }
      else if (e.altKey && e.key.toLowerCase() === 'n') { e.preventDefault(); novaNotaEditando(); }
      else if (e.key === 'Escape') { fecharSugestao(); raiz.classList.remove('cn-mostrar-lado', 'cn-mostrar-dir'); }
    });
    window.addEventListener('beforeunload', e => {
      if (timers.size) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  function mudarModo(editar) {
    st.editando = editar;
    gravarLS(CHAVE_MODO, editar ? 'editar' : 'ver');
    renderNota();
    if (editar) $('.cn-editor').focus();
  }
  function mudarVista(v) {
    st.vista = v;
    renderTudo();
  }
  function filtrarTag(tag) {
    st.tag = tag && st.tag !== tag ? tag : null;
    raiz.classList.add('cn-mostrar-lado');
    renderLista();
    atualizarGrafos();
  }

  // ---------- Desenho ----------
  function renderTudo() {
    raiz.classList.toggle('cn-sem-notas', st.notas.length === 0);
    raiz.dataset.cnVista = st.vista;
    $('.cn-local').hidden = st.modo !== 'local';
    $('[data-acao="fantasmas"]').checked = st.mostrarFantasmas;
    raiz.querySelectorAll('[data-vista]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.vista === st.vista)));
    $('.cn-vazio').hidden = st.notas.length > 0 || st.vista === 'grafo';
    $('.cn-nota').hidden = st.vista !== 'nota' || !atual();
    $('.cn-grafo-vista').hidden = st.vista !== 'grafo';
    renderLista();
    renderNota();
    renderPaineis();
    atualizarGrafos();
    if (st.vista === 'grafo' && grafoGeral) grafoGeral.redimensionar();
  }

  function notasFiltradas() {
    const q = semAcento(st.busca.trim());
    return st.notas
      .filter(n => !st.tag || (st.tagsDaNota.get(n.id) || []).includes(st.tag))
      .filter(n => !q || semAcento(n.titulo).includes(q) || semAcento(n.conteudo).includes(q))
      .sort((a, b) => {
        if (q) {
          const ta = semAcento(a.titulo).includes(q), tb = semAcento(b.titulo).includes(q);
          if (ta !== tb) return ta ? -1 : 1;
        }
        return String(b.updated_at).localeCompare(String(a.updated_at));
      });
  }
  function renderLista() {
    const lista = notasFiltradas();
    const filtro = $('.cn-filtro');
    filtro.hidden = !st.tag;
    filtro.innerHTML = st.tag ? `Filtrando por <span class="cn-tag-chip">#${esc(st.tag)}</span><button type="button" class="cn-icone-btn cn-pequeno" data-acao="limpar-tag" aria-label="Tirar filtro">${ico('fechar')}</button>` : '';
    $('.cn-lista').innerHTML = lista.length ? lista.map(n => `
      <button type="button" class="cn-item${n.id === st.atualId ? ' cn-ativo' : ''}" data-abrir="${esc(n.id)}"${n.id === st.atualId ? ' aria-current="page"' : ''}>
        ${ico('nota')}<span class="cn-item-titulo${n.titulo ? '' : ' cn-sem-titulo'}">${esc(n.titulo || 'Sem título')}</span>
      </button>`).join('') : `<p class="cn-lista-vazia">${st.notas.length ? 'Nenhuma nota encontrada.' : 'Nenhuma nota ainda.'}</p>`;
  }
  function renderNota() {
    const n = atual();
    raiz.querySelectorAll('[data-modo]').forEach(b => b.setAttribute('aria-selected', String((b.dataset.modo === 'editar') === st.editando)));
    raiz.classList.toggle('cn-editando', st.editando);
    if (!n) return;
    const titulo = $('.cn-titulo');
    if (document.activeElement !== titulo) titulo.value = n.titulo;
    const ed = $('.cn-editor');
    if (ed.value !== n.conteudo) ed.value = n.conteudo;
    ed.hidden = !st.editando;
    $('.cn-preview').hidden = st.editando;
    if (!st.editando) renderPreview();
  }
  function renderPreview() {
    const n = atual();
    if (!n) return;
    $('.cn-preview').innerHTML = n.conteudo.trim()
      ? markdown(n.conteudo)
      : '<p class="cn-dica-vazia">Nota vazia. Clique em <b>Editar</b> (ou Ctrl+E) pra escrever.</p>';
  }

  function renderPaineis() {
    const n = atual();
    const entradasEl = $('.cn-entradas');
    if (!n) { entradasEl.innerHTML = ''; $('.cn-n-entradas').textContent = ''; return; }
    const ids = [...(st.entradas.get(chave(n.titulo)) || [])].filter(id => id !== n.id);
    const quem = ids.map(id => st.notas.find(x => x.id === id)).filter(Boolean);
    $('.cn-n-entradas').textContent = quem.length || '';
    entradasEl.innerHTML = quem.length ? quem.map(o => `
      <button type="button" class="cn-saida" data-abrir="${esc(o.id)}">${ico('nota')}${esc(o.titulo || 'Sem título')}</button>`).join('')
      : '<p class="cn-painel-vazio">Nenhuma nota aponta pra esta.</p>';
  }

  // ---------- Sugestões ao digitar [[ ----------
  let sugestao = null;   // { el, ini, itens, sel }
  function coordenadasCursor(ta, pos) {
    const espelho = document.createElement('div');
    const cs = getComputedStyle(ta);
    ['boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderLeftWidth',
      'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'tabSize', 'textTransform', 'wordSpacing']
      .forEach(p => { espelho.style[p] = cs[p]; });
    Object.assign(espelho.style, { position: 'absolute', visibility: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', top: '0', left: '-9999px' });
    espelho.textContent = ta.value.slice(0, pos);
    const marca = document.createElement('span');
    marca.textContent = '​';
    espelho.appendChild(marca);
    document.body.appendChild(espelho);
    const r = { x: marca.offsetLeft, y: marca.offsetTop - ta.scrollTop, h: parseFloat(cs.lineHeight) || 24 };
    espelho.remove();
    return r;
  }
  function verificarSugestao() {
    const ed = $('.cn-editor');
    const pos = ed.selectionStart;
    if (pos !== ed.selectionEnd) { fecharSugestao(); return; }
    const antes = ed.value.slice(0, pos);
    const m = antes.match(/\[\[([^\]\n|]*)$/);
    if (!m) { fecharSugestao(); return; }
    const q = semAcento(m[1].trim());
    const atualN = atual();
    let itens = st.notas.filter(n => n !== atualN && (!q || semAcento(n.titulo).includes(q)))
      .sort((a, b) => (semAcento(b.titulo).startsWith(q) - semAcento(a.titulo).startsWith(q)) || a.titulo.localeCompare(b.titulo))
      .slice(0, 8).map(n => ({ titulo: n.titulo, novo: false }));
    if (q && !st.porTitulo.has(chave(m[1]))) itens.push({ titulo: m[1].trim(), novo: true });
    if (!itens.length) { fecharSugestao(); return; }
    if (!sugestao) {
      const el = document.createElement('div');
      el.className = 'cn-sugestoes';
      el.setAttribute('role', 'listbox');
      el.addEventListener('pointerdown', e => e.preventDefault());
      el.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) escolherSugestao(Number(b.dataset.i)); });
      document.body.appendChild(el);
      sugestao = { el, sel: 0 };
    }
    sugestao.ini = pos - m[1].length;
    sugestao.itens = itens;
    sugestao.sel = Math.min(sugestao.sel, itens.length - 1);
    desenharSugestao();
    const c = coordenadasCursor(ed, pos);
    const r = ed.getBoundingClientRect();
    const larg = sugestao.el.offsetWidth, alt = sugestao.el.offsetHeight;
    let top = r.top + c.y + c.h + 4;
    if (top + alt > window.innerHeight - 8) top = r.top + c.y - alt - 4;
    sugestao.el.style.top = `${top}px`;
    sugestao.el.style.left = `${Math.min(r.left + c.x, window.innerWidth - larg - 8)}px`;
  }
  function desenharSugestao() {
    sugestao.el.innerHTML = sugestao.itens.map((it, i) => `
      <button type="button" class="cn-sug${i === sugestao.sel ? ' cn-sel' : ''}" data-i="${i}" role="option" aria-selected="${i === sugestao.sel}">
        ${it.novo ? `${ico('mais')}<span>Criar link pra “${esc(it.titulo)}”</span>` : `${ico('nota')}<span>${esc(it.titulo)}</span>`}
      </button>`).join('') + '<div class="cn-sug-dica">↑↓ escolher · Enter inserir · Esc fechar</div>';
  }
  function tratarTeclaSugestao(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = sugestao.itens.length;
      sugestao.sel = (sugestao.sel + (e.key === 'ArrowDown' ? 1 : n - 1)) % n;
      desenharSugestao();
      return true;
    }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); escolherSugestao(sugestao.sel); return true; }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fecharSugestao(); return true; }
    return false;
  }
  function escolherSugestao(i) {
    const it = sugestao.itens[i];
    const ed = $('.cn-editor');
    const fim = ed.selectionStart;
    const fecha = ed.value.slice(fim, fim + 2) === ']]' ? '' : ']]';
    ed.setRangeText(`${it.titulo}${fecha}`, sugestao.ini, fim, 'end');
    if (!fecha) ed.selectionStart = ed.selectionEnd = ed.selectionStart + 2;
    fecharSugestao();
    ed.focus();
    ed.dispatchEvent(new Event('input'));
  }
  function fecharSugestao() {
    if (sugestao) { sugestao.el.remove(); sugestao = null; }
  }

  // ---------- Grafo ----------
  // Simulação de forças simples (repulsão entre todas as notas, mola em
  // cada conexão, puxão leve pro centro) desenhada num <canvas>. Esfria
  // sozinha e para de calcular quando assenta; mexer reaquece.
  function criarGrafo(canvas, opcoes) {
    const ctx = canvas.getContext('2d');
    let nos = [], arestas = [], vizinhos = new Map();
    let foco = null, hover = null;
    let vista = { x: 0, y: 0, k: opcoes.zoom || 1 };
    let alpha = 1, rodando = false, arrasto = null;
    let largura = 0, altura = 0, dpr = 1;
    const posicoes = new Map();

    const cor = nome => getComputedStyle(raiz).getPropertyValue(nome).trim() || '#888';
    const raio = n => (n.fantasma ? 4 : 5) + Math.sqrt(n.grau) * (opcoes.local ? 2 : 2.4);
    const tela = n => ({ x: largura / 2 + vista.x + n.x * vista.k, y: altura / 2 + vista.y + n.y * vista.k });

    let assinatura = '';
    function definir(dados, focoId) {
      // Mesmas notas e mesmas conexões: só redesenha (rótulo/destaque podem
      // ter mudado), sem mexer na física.
      const nova = `${focoId}|${dados.nos.map(n => n.id).join(',')}|${dados.arestas.map(a => `${a.de}>${a.para}`).join(',')}`;
      if (nova === assinatura) {
        const porId = new Map(dados.nos.map(d => [d.id, d]));
        nos.forEach(n => { const d = porId.get(n.id); Object.assign(n, { rotulo: d.rotulo, cor: d.cor, foraDoFiltro: d.foraDoFiltro }); });
        if (!rodando) desenhar();
        return;
      }
      assinatura = nova;
      foco = focoId || null;
      const antigos = new Map(nos.map(n => [n.id, n]));
      nos = dados.nos.map((d, i) => {
        const v = antigos.get(d.id) || posicoes.get(d.id);
        const ang = i * 2.399963;
        const dist = 30 * Math.sqrt(i + 1);
        return { ...d, x: v ? v.x : Math.cos(ang) * dist, y: v ? v.y : Math.sin(ang) * dist, vx: 0, vy: 0, fixo: false };
      });
      const porId = new Map(nos.map(n => [n.id, n]));
      arestas = dados.arestas.map(a => ({ a: porId.get(a.de), b: porId.get(a.para) })).filter(a => a.a && a.b);
      vizinhos = new Map(nos.map(n => [n, new Set()]));
      arestas.forEach(({ a, b }) => { vizinhos.get(a).add(b); vizinhos.get(b).add(a); });
      nos.forEach(n => { n.grau = vizinhos.get(n).size; });
      if (opcoes.local && foco) { const f = porId.get(foco); if (f) { f.x = 0; f.y = 0; } }
      reaquecer(antigos.size ? 0.5 : 1);
    }
    function reaquecer(a) {
      alpha = Math.max(alpha, a);
      if (!rodando) { rodando = true; requestAnimationFrame(passo); }
    }
    function simular() {
      const REP = opcoes.local ? 900 : 1600, MOLA = 0.06, COMP = opcoes.local ? 60 : 80, CENTRO = 0.012;
      for (let i = 0; i < nos.length; i++) {
        const a = nos[i];
        for (let j = i + 1; j < nos.length; j++) {
          const b = nos[j];
          let dx = a.x - b.x, dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 0.5; }
          if (d2 > 250000) continue;
          const d = Math.sqrt(d2), f = REP * alpha / d2;
          const fx = dx / d * f, fy = dy / d * f;
          a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
        }
      }
      arestas.forEach(({ a, b }) => {
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - COMP) / d * MOLA * alpha;
        a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
      });
      nos.forEach(n => {
        n.vx -= n.x * CENTRO * alpha; n.vy -= n.y * CENTRO * alpha;
        if (n.fixo) { n.vx = n.vy = 0; return; }
        n.vx *= 0.6; n.vy *= 0.6;
        n.x += n.vx; n.y += n.vy;
      });
      alpha *= 0.985;
    }
    function desenhar() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, largura, altura);
      if (!nos.length) {
        ctx.fillStyle = cor('--pr-text-3');
        ctx.font = '13px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(opcoes.local ? 'Sem conexões ainda' : 'Nenhuma nota pra mostrar', largura / 2, altura / 2);
        return;
      }
      // Cada nota tem a sua cor (n.cor, da tag principal). Passar o mouse
      // apaga quem não é vizinho; filtro por tag apaga quem não tem a tag.
      const destaque = hover;
      const perto = destaque ? vizinhos.get(destaque) : null;
      const escuro = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const cTexto = cor('--pr-text'), cTexto3 = cor('--pr-text-3'), cFundo = cor('--pr-bg');
      const apagado = n => (destaque ? n !== destaque && !perto.has(n) : !!n.foraDoFiltro);
      arestas.forEach(({ a, b }) => {
        const pa = tela(a), pb = tela(b);
        const liga = destaque && (a === destaque || b === destaque);
        const grad = ctx.createLinearGradient(pa.x, pa.y, pb.x, pb.y);
        grad.addColorStop(0, a.cor);
        grad.addColorStop(1, b.cor);
        ctx.strokeStyle = grad;
        ctx.globalAlpha = liga ? 0.95 : (apagado(a) || apagado(b) ? 0.1 : (escuro ? 0.5 : 0.45));
        ctx.lineWidth = liga ? 2.6 : 1.6;
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      nos.forEach(n => {
        const p = tela(n);
        const r = raio(n) * Math.max(0.7, Math.min(1.4, vista.k));
        const ehFoco = n.id === foco;
        const sumido = apagado(n);
        ctx.globalAlpha = sumido ? 0.2 : 1;
        if (ehFoco) {
          // Nota aberta: anel na cor dela em volta.
          ctx.beginPath();
          ctx.arc(p.x, p.y, r + 5, 0, Math.PI * 2);
          ctx.strokeStyle = n.cor; ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        if (n.fantasma) {
          ctx.fillStyle = cFundo; ctx.fill();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = n.cor; ctx.lineWidth = 1.6; ctx.stroke();
          ctx.setLineDash([]);
        } else {
          ctx.save();
          if (!sumido) { ctx.shadowColor = n.cor; ctx.shadowBlur = (escuro ? 14 : 8) + (n === hover || ehFoco ? 8 : 0); }
          ctx.fillStyle = n.cor;
          ctx.fill();
          ctx.restore();
          // Brilho de cima, pra bolinha parecer "acesa".
          const luz = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.4, 0, p.x, p.y, r);
          luz.addColorStop(0, 'rgba(255,255,255,.55)');
          luz.addColorStop(0.6, 'rgba(255,255,255,0)');
          ctx.fillStyle = luz;
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
        }
        const mostrarRotulo = opcoes.local || vista.k > 0.75 || n === hover || ehFoco || (perto && perto.has(n));
        if (mostrarRotulo) {
          ctx.font = `${ehFoco || n === hover ? 600 : 500} 12px Inter, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillStyle = n.fantasma ? cTexto3 : cTexto;
          ctx.fillText(n.rotulo.length > 28 ? `${n.rotulo.slice(0, 27)}…` : n.rotulo, p.x, p.y + r + 14);
        }
      });
      ctx.globalAlpha = 1;
    }
    function passo() {
      if (alpha > 0.02 || arrasto) simular();
      desenhar();
      if (alpha > 0.02 || arrasto) requestAnimationFrame(passo);
      else rodando = false;
    }
    function redimensionar() {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      dpr = window.devicePixelRatio || 1;
      largura = r.width; altura = r.height;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      desenhar();
    }
    function noEm(x, y) {
      let melhor = null, dist = Infinity;
      nos.forEach(n => {
        const p = tela(n);
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < raio(n) * Math.max(0.7, vista.k) + 6 && d < dist) { dist = d; melhor = n; }
      });
      return melhor;
    }
    function ponto(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

    canvas.addEventListener('pointerdown', e => {
      const p = ponto(e);
      const n = noEm(p.x, p.y);
      canvas.setPointerCapture(e.pointerId);
      arrasto = { n, x0: p.x, y0: p.y, vx: vista.x, vy: vista.y, moveu: false };
      if (n) { n.fixo = true; reaquecer(0.3); }
    });
    canvas.addEventListener('pointermove', e => {
      const p = ponto(e);
      if (!arrasto) {
        const n = noEm(p.x, p.y);
        if (n !== hover) { hover = n; canvas.style.cursor = n ? 'pointer' : 'grab'; if (!rodando) desenhar(); }
        return;
      }
      if (Math.hypot(p.x - arrasto.x0, p.y - arrasto.y0) > 3) arrasto.moveu = true;
      if (arrasto.n) {
        arrasto.n.x = (p.x - largura / 2 - vista.x) / vista.k;
        arrasto.n.y = (p.y - altura / 2 - vista.y) / vista.k;
        reaquecer(0.3);
      } else {
        vista.x = arrasto.vx + p.x - arrasto.x0;
        vista.y = arrasto.vy + p.y - arrasto.y0;
        canvas.style.cursor = 'grabbing';
        if (!rodando) desenhar();
      }
    });
    const soltar = () => {
      if (!arrasto) return;
      const a = arrasto;
      arrasto = null;
      if (a.n) a.n.fixo = false;
      canvas.style.cursor = hover ? 'pointer' : 'grab';
      if (a.n && !a.moveu) opcoes.aoClicar(a.n);
    };
    canvas.addEventListener('pointerup', soltar);
    canvas.addEventListener('pointercancel', soltar);
    canvas.addEventListener('pointerleave', () => { if (!arrasto && hover) { hover = null; if (!rodando) desenhar(); } });
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const p = ponto(e);
      const k = Math.max(0.2, Math.min(4, vista.k * Math.exp(-e.deltaY * 0.0015)));
      const wx = (p.x - largura / 2 - vista.x) / vista.k, wy = (p.y - altura / 2 - vista.y) / vista.k;
      vista.k = k;
      vista.x = p.x - largura / 2 - wx * k;
      vista.y = p.y - altura / 2 - wy * k;
      if (!rodando) desenhar();
    }, { passive: false });
    canvas.addEventListener('dblclick', e => { const p = ponto(e); if (!noEm(p.x, p.y)) centralizar(); });

    function centralizar() {
      if (!nos.length) return;
      const xs = nos.map(n => n.x), ys = nos.map(n => n.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      const k = Math.min(2, Math.max(0.3, Math.min((largura - 80) / (maxX - minX || 1), (altura - 80) / (maxY - minY || 1))));
      vista = { k, x: -((minX + maxX) / 2) * k, y: -((minY + maxY) / 2) * k };
      desenhar();
    }
    new ResizeObserver(redimensionar).observe(canvas);
    return { definir, redimensionar, centralizar, reaquecer };
  }

  // Cores do grafo: cada tag tem uma cor fixa da paleta (sai do nome da
  // tag, então não muda de um dia pro outro; duas tags não dividem cor
  // enquanto houver cor livre). A nota pega a cor da 1ª tag dela; sem tag,
  // uma cor tirada do título. Nota que ainda não existe pega a cor de quem
  // aponta pra ela.
  const PALETA = ['#f43f5e', '#f97316', '#eab308', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'];
  const hash = t => { let h = 0; for (const c of String(t)) h = (h * 31 + c.codePointAt(0)) >>> 0; return h; };
  function coresDasTags() {
    const cores = new Map();
    const usadas = new Set();
    [...st.tags.keys()].sort().forEach(t => {
      let i = hash(t) % PALETA.length;
      for (let n = 0; n < PALETA.length && usadas.has(i); n++) i = (i + 1) % PALETA.length;
      usadas.add(i);
      cores.set(t, PALETA[i]);
    });
    return cores;
  }
  function corDaNota(n) {
    const tag = (st.tagsDaNota.get(n.id) || [])[0];
    return tag ? st.corTag.get(tag) : PALETA[hash(n.titulo || n.id) % PALETA.length];
  }

  // Dados do grafo: notas + (opcional) notas que ainda não existem.
  function dadosGrafo(fantasmas) {
    const nos = st.notas.map(n => ({
      id: n.id, rotulo: n.titulo || 'Sem título', fantasma: false, cor: corDaNota(n),
      foraDoFiltro: !!st.tag && !(st.tagsDaNota.get(n.id) || []).includes(st.tag),
    }));
    const arestas = [];
    const vistos = new Set();
    const fantasmasIds = new Map();
    st.notas.forEach(n => (st.saidas.get(n.id) || []).forEach(l => {
      let para = st.porTitulo.get(chave(l.alvo));
      let paraId = para && para.id;
      if (!para) {
        if (!fantasmas) return;
        paraId = `fantasma:${chave(l.alvo)}`;
        if (!fantasmasIds.has(paraId)) { fantasmasIds.set(paraId, l.alvo); nos.push({ id: paraId, rotulo: l.alvo, fantasma: true, cor: corDaNota(n), foraDoFiltro: !!st.tag }); }
      }
      if (paraId === n.id) return;
      const k = [n.id, paraId].sort().join('→');
      if (vistos.has(k)) return;
      vistos.add(k);
      arestas.push({ de: n.id, para: paraId });
    }));
    return { nos, arestas };
  }
  function dadosLocais() {
    const n = atual();
    if (!n) return { nos: [], arestas: [] };
    const tudo = dadosGrafo(true);
    const ligados = new Set([n.id]);
    tudo.arestas.forEach(a => { if (a.de === n.id) ligados.add(a.para); if (a.para === n.id) ligados.add(a.de); });
    return {
      nos: tudo.nos.filter(x => ligados.has(x.id)),
      arestas: tudo.arestas.filter(a => ligados.has(a.de) && ligados.has(a.para) && (a.de === n.id || a.para === n.id)),
    };
  }

  let grafoGeral = null, grafoLocal = null;
  function clicouNo(no) {
    if (no.fantasma) seguirLink(no.rotulo);
    else abrir(no.id);
  }
  function atualizarGrafos() {
    if (!grafoLocal) return;
    grafoLocal.definir(dadosLocais(), st.atualId);
    if (st.vista === 'grafo') {
      grafoGeral.definir(dadosGrafo(st.mostrarFantasmas), st.atualId);
      // Legenda: a cor de cada tag (clicar filtra, como a #tag no texto).
      const tags = [...st.tags.entries()].sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0])).slice(0, 12);
      const leg = $('.cn-legenda');
      leg.hidden = !tags.length;
      leg.innerHTML = tags.map(([t]) => `<button type="button" class="cn-leg${st.tag === t ? ' cn-ativo' : ''}${st.tag && st.tag !== t ? ' cn-apagado' : ''}" data-tag="${esc(t)}"><i style="background:${st.corTag.get(t)}"></i>#${esc(t)}</button>`).join('');
    }
  }

  // ---------- Avisos ----------
  function aviso(texto) {
    const t = document.createElement('div');
    t.className = 'cn-aviso';
    t.setAttribute('role', 'status');
    t.textContent = texto;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('cn-saindo'), 3200);
    setTimeout(() => t.remove(), 3600);
  }

  // ---------- Exemplos (1ª vez) ----------
  const EXEMPLOS = [
    {
      titulo: 'Banco de Dados',
      conteudo: `Um **banco de dados** guarda informações de forma organizada, pra que um sistema consiga **gravar, buscar e alterar** dados com segurança. No curso, o FinancApp usa o Supabase, que roda um banco **PostgreSQL**.

> [!dica] Como ler esta nota
> As palavras entre colchetes duplos, como [[SQL Básico]], são **conexões**: clique pra abrir a nota. As tracejadas, como [[NoSQL]], ainda não existem; clique pra criar.

## Dois grandes tipos
- **Relacional**: tabelas com linhas e colunas, ligadas por chaves. Consulta com [[SQL Básico|SQL]].
- **Não relacional**: documentos, chave-valor, grafos... Ver [[NoSQL]].

## Onde aparece nas aulas
1. Projeto FinancApp: a tabela de transações no Supabase
2. Trilha de [[Modelagem de Dados]]: o DER vem antes de criar as tabelas

## Pra revisar com a turma
- [x] Diferença entre banco de dados e planilha
- [ ] Chave primária e chave estrangeira
- [ ] Normalização (1FN, 2FN e 3FN)

#banco-de-dados #aula`,
    },
    {
      titulo: 'SQL Básico',
      conteudo: `**SQL** (Structured Query Language) é a linguagem pra conversar com um [[Banco de Dados]] relacional.

## Os quatro comandos do dia a dia
| Comando | Pra quê | Exemplo no FinancApp |
|---|---|---|
| \`SELECT\` | ler | listar as transações |
| \`INSERT\` | criar | lançar uma despesa |
| \`UPDATE\` | alterar | corrigir um valor |
| \`DELETE\` | apagar | remover um lançamento |

## Exemplo
\`\`\`sql
select descricao, valor
from transacoes
where tipo = 'despesa'
order by valor desc;
\`\`\`

> [!atencao] Cuidado
> \`DELETE\` sem \`WHERE\` apaga **todas** as linhas da tabela.

Conecta com: [[Chave Primária]] e [[Modelagem de Dados]].

#sql #banco-de-dados`,
    },
  ];
  async function criarExemplosSePreciso() {
    if (st.notas.length || lerLS(CHAVE_EXEMPLOS, false)) return;
    gravarLS(CHAVE_EXEMPLOS, true);
    const agora = Date.now();
    const notas = EXEMPLOS.map((e, i) => ({ id: novoId(), titulo: e.titulo, conteudo: e.conteudo, created_at: new Date(agora - i * 1000).toISOString(), updated_at: new Date(agora - i * 1000).toISOString() }));
    st.notas = notas;
    if (st.modo === 'local') gravarLS(CHAVE_LOCAL, st.notas);
    else {
      const { error } = await st.sb.from(TABELA).insert(notas.map(n => ({ id: n.id, titulo: n.titulo, conteudo: n.conteudo })));
      if (error) console.warn('[conhecimentos] exemplos não salvos:', error.message);
    }
  }

  async function montar(elemento, sbClient) {
    raiz = elemento;
    raiz.classList.add('cn-app');
    st.sb = sbClient || null;
    montarTela();
    status('Carregando…');
    await carregar();
    await criarExemplosSePreciso();
    indexar();
    grafoLocal = criarGrafo($('.cn-canvas-local'), { local: true, zoom: 1, aoClicar: clicouNo });
    grafoGeral = criarGrafo($('.cn-canvas-geral'), { local: false, zoom: 1, aoClicar: clicouNo });
    // Abre a nota do endereço (#Título), senão a mais recente.
    const doEndereco = decodeURIComponent(location.hash.slice(1));
    const inicial = (doEndereco && st.porTitulo.get(chave(doEndereco))) || notasFiltradas()[0];
    st.atualId = inicial ? inicial.id : null;
    status('');
    renderTudo();
  }

  return { montar, _markdown: markdown };
})();
