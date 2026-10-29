// Painel do professor com arrumação livre (professor/painel.html): o
// relógio e todos os cartões ficam numa área da largura da tela, e o
// professor coloca cada um onde quiser.
// - A área é uma grade invisível de 12 colunas (largura) e linhas de 8 px
//   (altura): o cartão solto "encaixa" no ponto mais próximo, então tudo
//   fica alinhado, mas pode ficar em qualquer lugar, com espaço vazio em
//   volta se o professor quiser.
// - Cartão que cair em cima de outro empurra o de baixo pra baixo (nunca
//   ficam um sobre o outro).
// - Altura: no mínimo a do conteúdo; dá pra deixar mais alto esticando pelo
//   canto (dois cliques no canto voltam à altura do conteúdo).
// Arrastar funciona sempre (cartão: clicar e arrastar; Agenda: pelo
// cabeçalho; clique simples continua abrindo). O botão "Personalizar" mostra
// as guias das colunas, a alça de esticar no canto, ocultar e "Restaurar
// padrão". Teclado no Personalizar: setas movem, Shift+setas esticam,
// Delete oculta. No celular a arrumação é outra (4 colunas, cartões menores),
// guardada à parte; lá arrasta-se pela etiqueta do nome (no Personalizar) e
// tocar no resto do cartão continua rolando a página. Ocultar vale nos dois.
//
// A arrumação fica no localStorage (abre já arrumado) e na conta do
// professor (user_preferences.painel_layout, sql/painel-layout.sql). Sem a
// coluna, salva só no navegador e avisa na barra. Estilos em
// shared/painel-layout.css.
//
// Uso: window.PainelLayout.montar({ grade, botao, client, email })
window.PainelLayout = (function () {
  const CHAVE_LOCAL = 'axis.painel.layout.v2';
  const LINHA = 8;          // px de cada linha da grade
  const TELA_LARGA = 720;   // abaixo disso (px de área) vale a arrumação do celular
  // Computador e celular têm arrumações separadas (layout.itens e
  // layout.celular): 12 colunas no computador, 4 no celular.
  const MODOS = { itens: { colunas: 12, gap: 16 }, celular: { colunas: 4, gap: 12 } };
  const PASSO_TECLADO = 4;  // linhas por seta

  const ICONES = {
    pegador: '<circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>',
    ocultar: '<path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="M2 2l20 20"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>',
    mostrar: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    restaurar: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  };
  const ico = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[n]}</svg>`;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
  const copiar = o => JSON.parse(JSON.stringify(o));

  let grade, botao, sb, email;
  let padrao, layout;       // layout = { v: 2, itens: {...}, celular: {...} }, cada um { id: { x, y, w, h, oculto } }
  let editando = false;
  let barra = null;
  let soLocal = false;
  let arrastando = null;
  // Painel sem rolagem: tudo encolhe por igual até caber na altura da
  // janela (1 = tamanho normal; nunca aumenta). Abaixo de ESCALA_MIN fica
  // pequeno demais pra ler, então para ali e a página volta a rolar.
  let escala = 1;
  const ESCALA_MIN = 0.4;
  const natural = new Map(); // id -> altura do conteúdo, em linhas

  const blocos = () => Array.from(grade.querySelectorAll(':scope > .pr-bloco'));
  const porId = id => grade.querySelector(`:scope > .pr-bloco[data-bloco="${id}"]`);
  const ids = () => blocos().map(b => b.dataset.bloco);
  // Largura que se vê (a da seção em volta). A grade é arrumada mais larga
  // (largura / escala) e encolhida com transform pra caber na tela.
  const larguraVisivel = () => grade.parentElement.clientWidth;
  const modo = () => (larguraVisivel() >= TELA_LARGA ? 'itens' : 'celular');
  const COLUNAS_DE = m => MODOS[m].colunas;
  const cols = () => COLUNAS_DE(modo());
  const gap = () => MODOS[modo()].gap;
  const L = () => layout[modo()];            // arrumação da tela atual
  // Largura mínima: data-min (computador) e data-min-celular (celular).
  const larguraMin = (id, m = modo()) => {
    const b = porId(id);
    const v = m === 'celular' ? Number(b && b.dataset.minCelular) || 2 : Number(b && b.dataset.min) || 2;
    return limitar(v, 1, COLUNAS_DE(m));
  };
  const conteudo = b => b.querySelector(':scope > :not(.pr-bloco-barra):not(.pr-bloco-redim)');
  const larguraColuna = () => (larguraVisivel() / escala + gap()) / cols();
  const altura = id => Math.max(L()[id].h || 0, natural.get(id) || 1);
  const visiveis = () => ids().filter(id => !L()[id].oculto);

  // ---------- Arrumação ----------
  // Computador: data-x/data-w do HTML. Celular: data-w-celular (padrão 2,
  // ou seja, dois cartões por linha), um ao lado do outro na ordem do HTML.
  function padraoDoHtml() {
    const itens = {}, celular = {};
    let cursor = 0;
    blocos().forEach(b => {
      const id = b.dataset.bloco;
      const w = limitar(Number(b.dataset.w) || 3, larguraMin(id, 'itens'), 12);
      itens[id] = { x: limitar(Number(b.dataset.x) || 0, 0, 12 - w), y: 0, w, h: null, oculto: false };
      const wc = limitar(Number(b.dataset.wCelular) || 2, larguraMin(id, 'celular'), 4);
      if (cursor + wc > 4) cursor = 0;
      celular[id] = { x: cursor, y: 0, w: wc, h: null, oculto: false };
      cursor = (cursor + wc) % 4;
    });
    return { v: 2, itens, celular };
  }

  // Junta o salvo com o padrão: cartão novo entra embaixo de tudo; cartão
  // que sumiu do HTML é ignorado; valores fora do permitido são corrigidos.
  function mesclar(salvo) {
    const res = copiar(padrao);
    if (!salvo || salvo.v !== 2) return res;
    ['itens', 'celular'].forEach(m => {
      const s = salvo[m];
      if (!s) return;
      const colunas = COLUNAS_DE(m);
      const novos = [];
      Object.keys(res[m]).forEach(id => {
        const v = s[id];
        if (!v) { novos.push(id); return; }
        const w = limitar(Math.round(Number(v.w)) || res[m][id].w, larguraMin(id, m), colunas);
        res[m][id] = {
          x: limitar(Math.round(Number(v.x)) || 0, 0, colunas - w),
          y: Math.max(0, Math.round(Number(v.y)) || 0),
          w,
          h: v.h ? Math.max(1, Math.round(Number(v.h))) : null,
          oculto: !!v.oculto,
        };
      });
      if (novos.length) {
        let fundo = 0;
        Object.keys(res[m]).forEach(id => { if (!novos.includes(id)) fundo = Math.max(fundo, res[m][id].y + 30); });
        novos.forEach(id => { res[m][id].y = fundo; });
      }
    });
    // Ocultar vale nas duas telas (arrumação antiga só tinha a do computador).
    Object.keys(res.itens).forEach(id => { if (res.itens[id].oculto) res.celular[id].oculto = true; });
    return res;
  }
  function definirOculto(id, oculto) {
    layout.itens[id].oculto = oculto;
    layout.celular[id].oculto = oculto;
  }

  const sobrepoe = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  // Ninguém fica em cima de ninguém: o cartão com prioridade (o que está
  // sendo arrastado/esticado) fica onde está e quem bater nele desce. Os
  // outros só descem, nunca sobem — espaço vazio que o professor deixou
  // continua vazio.
  function resolver(prioridade) {
    const ordemHtml = ids();
    const lista = visiveis().sort((a, b) => {
      if (a === prioridade) return -1;
      if (b === prioridade) return 1;
      return L()[a].y - L()[b].y || ordemHtml.indexOf(a) - ordemHtml.indexOf(b);
    });
    const postos = [];
    lista.forEach(id => {
      const it = L()[id];
      const r = { x: it.x, y: it.y, w: it.w, h: altura(id) };
      for (let bate = postos.find(p => sobrepoe(p, r)); bate; bate = postos.find(p => sobrepoe(p, r))) r.y = bate.y + bate.h;
      it.y = r.y;
      postos.push(r);
    });
  }

  // Mede a altura do conteúdo de cada cartão na largura em que ele está.
  // Devolve true se alguma mudou.
  function medir() {
    let mudou = false;
    blocos().forEach(b => {
      if (b.hidden) return;
      const c = conteudo(b);
      if (!c) return;
      const antes = c.style.height;
      c.style.height = 'auto';
      const linhas = Math.ceil((c.offsetHeight + gap()) / LINHA);
      c.style.height = antes;
      if (natural.get(b.dataset.bloco) !== linhas) { natural.set(b.dataset.bloco, linhas); mudou = true; }
    });
    return mudou;
  }

  // Altura da janela que sobra pro painel (abaixo da barra do topo, menos o
  // respiro de baixo do <main>).
  function alturaDisponivel() {
    const secao = grade.parentElement;
    const topo = secao.getBoundingClientRect().top + window.scrollY;
    const main = secao.closest('.pr-main');
    const baixo = main ? parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0;
    return Math.max(160, window.innerHeight - topo - baixo - 1);
  }

  // Desenha tudo e encolhe pra caber na tela. `prioridade`: quem não pode
  // sair do lugar ao resolver. `pular`: cartão que está grudado no mouse (não
  // reposiciona). Arrastando, a escala fica parada (senão tudo treme); ao
  // soltar, ela é recalculada.
  function render(prioridade, pular) {
    // Personalizando, sobra espaço embaixo pra soltar cartão lá.
    const folga = editando ? 160 : 0;
    let fundo = desenhar(prioridade, pular);
    if (!arrastando) {
      const disp = alturaDisponivel();
      // A largura muda com a escala e a altura dos cartões muda com a
      // largura (o calendário da Agenda cresce quando fica mais largo):
      // algumas voltas até acertar.
      for (let i = 0; i < 10; i++) {
        const nova = limitar(disp / (fundo + folga), ESCALA_MIN, 1);
        // Só cresce de novo se for pra valer: a frase troca a cada 15 s e
        // mexe um pouco na altura, e o painel não deve ficar "respirando".
        if (nova > escala - 0.002 && nova - escala < 0.03) break;
        // Encolhendo, vai um pouquinho além, pra não ficar correndo atrás
        // da Agenda que cresce junto.
        escala = nova < escala ? Math.max(ESCALA_MIN, nova * 0.99) : nova;
        fundo = desenhar(prioridade, pular);
      }
    }
    const total = fundo + folga;
    grade.style.width = `${larguraVisivel() / escala}px`;
    grade.style.height = `${total}px`;
    grade.style.transform = escala < 1 ? `scale(${escala})` : '';
    // O transform não muda o espaço ocupado: quem guarda a altura que se vê é a seção.
    grade.parentElement.style.height = `${Math.ceil(total * escala)}px`;
    document.documentElement.classList.toggle('pr-painel-cabe', escala > ESCALA_MIN);
    if (barra) renderBarra();
  }

  function desenhar(prioridade, pular) {
    const itens = L();
    const G = gap();
    blocos().forEach(b => { b.hidden = !!itens[b.dataset.bloco].oculto; });
    grade.classList.toggle('pr-modo-celular', modo() === 'celular');
    const cw = larguraColuna();
    grade.style.setProperty('--coluna', `${cw}px`);
    grade.style.setProperty('--linha', `${LINHA}px`);
    blocos().forEach(b => {
      const it = itens[b.dataset.bloco];
      if (b.hidden || b === pular) return;
      b.style.left = `${it.x * cw}px`;
      b.style.width = `${it.w * cw - G}px`;
    });
    medir();
    resolver(prioridade);
    let fundo = 0;
    blocos().forEach(b => {
      if (b.hidden) return;
      const id = b.dataset.bloco;
      const h = altura(id);
      fundo = Math.max(fundo, (itens[id].y + h) * LINHA);
      if (b === pular) return;
      b.style.top = `${itens[id].y * LINHA}px`;
      b.style.height = `${h * LINHA - G}px`;
    });
    return fundo;
  }

  // ---------- Salvar ----------
  function lerLocal() {
    try { return JSON.parse(localStorage.getItem(CHAVE_LOCAL)); } catch (e) { return null; }
  }
  let timerNuvem = null;
  function salvar() {
    try { localStorage.setItem(CHAVE_LOCAL, JSON.stringify(layout)); } catch (e) { /* bloqueado */ }
    clearTimeout(timerNuvem);
    timerNuvem = setTimeout(salvarNuvem, 600);
  }
  async function salvarNuvem() {
    if (!sb || !email || soLocal) return;
    const { error } = await sb.from('user_preferences')
      .upsert({ email, painel_layout: layout, updated_at: new Date().toISOString() }, { onConflict: 'email' });
    if (error) marcarSoLocal(error);
  }
  async function carregarNuvem() {
    if (!sb || !email) return;
    const { data, error } = await sb.from('user_preferences').select('painel_layout').eq('email', email).maybeSingle();
    if (error) { marcarSoLocal(error); return; }
    if (data && data.painel_layout && data.painel_layout.v === 2) {
      layout = mesclar(data.painel_layout);
      try { localStorage.setItem(CHAVE_LOCAL, JSON.stringify(layout)); } catch (e) { /* bloqueado */ }
      if (!arrastando) render();
    }
  }
  function marcarSoLocal(error) {
    soLocal = true;
    console.warn('[painel] arrumação salva só neste navegador:', error && error.message);
    if (barra) renderBarra();
  }

  // ---------- Modo Personalizar ----------
  function entrar() {
    editando = true;
    grade.classList.add('pr-editando');
    document.body.classList.add('pr-personalizando');
    botao.setAttribute('aria-pressed', 'true');
    blocos().forEach(b => {
      b.tabIndex = 0;
      b.setAttribute('aria-roledescription', 'cartão móvel');
      b.setAttribute('aria-label', `${b.dataset.nome}. Setas movem, Shift e setas esticam, Delete oculta.`);
      const el = document.createElement('div');
      el.className = 'pr-bloco-barra';
      el.innerHTML = `
        <span class="pr-bloco-pegador" title="Arraste pra qualquer lugar">${ico('pegador')}</span>
        <span class="pr-bloco-nome">${esc(b.dataset.nome)}</span>
        <button type="button" class="pr-bloco-ocultar" data-ocultar aria-label="Ocultar ${esc(b.dataset.nome)}" title="Ocultar">${ico('ocultar')}</button>`;
      b.appendChild(el);
      const alca = document.createElement('div');
      alca.className = 'pr-bloco-redim';
      alca.title = 'Arraste pra mudar o tamanho (dois cliques: altura do conteúdo)';
      b.appendChild(alca);
    });
    montarBarra();
    render();
  }
  function sair() {
    editando = false;
    grade.classList.remove('pr-editando');
    document.body.classList.remove('pr-personalizando');
    botao.setAttribute('aria-pressed', 'false');
    blocos().forEach(b => {
      b.removeAttribute('tabindex');
      b.removeAttribute('aria-roledescription');
      b.removeAttribute('aria-label');
      b.querySelectorAll(':scope > .pr-bloco-barra, :scope > .pr-bloco-redim').forEach(x => x.remove());
    });
    if (barra) { barra.remove(); barra = null; }
    render();
  }

  function montarBarra() {
    barra = document.createElement('div');
    barra.className = 'pr-personalizar-barra';
    barra.setAttribute('role', 'toolbar');
    barra.setAttribute('aria-label', 'Personalizar painel');
    document.body.appendChild(barra);
    barra.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.mostrar) {
        const id = b.dataset.mostrar;
        definirOculto(id, false);
        render(id);
        salvar();
        const bloco = porId(id);
        bloco.classList.add('pr-bloco-chegou');
        setTimeout(() => bloco.classList.remove('pr-bloco-chegou'), 900);
        bloco.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else if (b.dataset.acao === 'restaurar') {
        layout = copiar(padrao);
        render();
        salvar();
      } else if (b.dataset.acao === 'concluir') sair();
    });
    renderBarra();
  }
  function renderBarra() {
    if (!barra) return;
    const ocultos = ids().filter(id => L()[id].oculto).map(porId);
    barra.innerHTML = `
      <span class="pr-pb-texto">Arraste pra qualquer lugar · estique pelo canto</span>
      ${ocultos.length ? `<span class="pr-pb-sep"></span><span class="pr-pb-rotulo">Ocultos:</span>${ocultos.map(b => `
        <button type="button" class="pr-pb-oculto" data-mostrar="${esc(b.dataset.bloco)}" title="Mostrar de novo">${ico('mostrar')}${esc(b.dataset.nome)}</button>`).join('')}` : ''}
      <span class="pr-pb-sep"></span>
      <button type="button" class="btn btn-ghost pr-pb-restaurar" data-acao="restaurar">${ico('restaurar')}<span>Restaurar padrão</span></button>
      <button type="button" class="btn" data-acao="concluir">Concluir</button>
      ${soLocal ? '<span class="pr-pb-aviso" title="Rode sql/painel-layout.sql no Supabase pra guardar na sua conta">Salvo só neste navegador</span>' : ''}`;
  }

  function ocultar(b) {
    definirOculto(b.dataset.bloco, true);
    render();
    salvar();
  }
  function moverTeclado(b, dx, dy, esticar) {
    const id = b.dataset.bloco;
    const it = L()[id];
    if (esticar) {
      it.w = limitar(it.w + dx, larguraMin(id), cols() - it.x);
      if (dy) it.h = Math.max(natural.get(id) || 1, altura(id) + dy * PASSO_TECLADO);
    } else {
      it.x = limitar(it.x + dx, 0, cols() - it.w);
      it.y = Math.max(0, it.y + dy * PASSO_TECLADO);
    }
    render(id);
    salvar();
  }

  // ---------- Arrastar e esticar ----------
  // Fora do Personalizar também dá pra arrastar: o cartão (clique simples
  // continua abrindo) ou a Agenda pelo cabeçalho (o resto dela tem os
  // próprios cliques e arrastes).
  function podeArrastarSemEditar(e) {
    if (e.target.closest('.pr-card')) return true;
    const topo = e.target.closest('.ag-cartao-topo');
    return !!topo && !e.target.closest('button');
  }
  function aoApertar(e) {
    if (e.button !== 0) return;
    if (e.target.closest('.pr-bloco-ocultar')) return;
    const redim = !!e.target.closest('.pr-bloco-redim');
    // No toque (celular), arrastar só no Personalizar e pela etiqueta do
    // nome ou pela alça — tocar no resto do cartão continua rolando a página.
    if (e.pointerType === 'touch' && !(editando && e.target.closest('.pr-bloco-barra, .pr-bloco-redim'))) return;
    if (!editando && !podeArrastarSemEditar(e)) return;
    const b = e.target.closest('.pr-bloco');
    if (!b || b.parentElement !== grade) return;
    e.preventDefault();
    const id = b.dataset.bloco;
    const r = b.getBoundingClientRect();
    const d = {
      b, id, redim, base: copiar(layout), modo: modo(), x0: e.clientX, y0: e.clientY,
      // Medidas do mouse ficam no tamanho da tela; as da grade, no tamanho
      // antes de encolher — daí as divisões por `escala`.
      dx: (e.clientX - r.left) / escala, dy: (e.clientY - r.top) / escala, ativo: false, vaga: null, ultimoMov: e, chave: '',
    };

    const mover = m => {
      d.ultimoMov = m;
      if (!d.ativo) {
        if (Math.hypot(m.clientX - d.x0, m.clientY - d.y0) < 5) return;
        d.ativo = true;
        arrastando = d;
        document.body.classList.add(d.redim ? 'pr-esticando-cartao' : 'pr-arrastando-cartao');
        grade.classList.add('pr-grade-ativa');
        if (!d.redim) {
          b.classList.add('pr-bloco-solto');
          d.vaga = document.createElement('div');
          d.vaga.className = 'pr-vaga';
          grade.appendChild(d.vaga);
        } else b.classList.add('pr-bloco-esticando');
      }
      const g = grade.getBoundingClientRect();
      const cw = larguraColuna();
      const it0 = d.base[d.modo][id];
      let x, y, w, h;
      if (d.redim) {
        x = it0.x; y = it0.y;
        w = limitar(Math.round(((m.clientX - g.left) / escala - x * cw + gap()) / cw), larguraMin(id), cols() - x);
        h = Math.max(1, Math.round(((m.clientY - g.top) / escala - y * LINHA + gap()) / LINHA));
      } else {
        w = it0.w; h = it0.h;
        const px = (m.clientX - g.left) / escala - d.dx;
        const py = (m.clientY - g.top) / escala - d.dy;
        x = limitar(Math.round(px / cw), 0, cols() - w);
        y = Math.max(0, Math.round(py / LINHA));
        // O cartão acompanha o mouse livremente; a vaga mostra onde encaixa.
        b.style.left = `${px}px`;
        b.style.top = `${Math.max(-40, py)}px`;
      }
      const chave = `${x},${y},${w},${h}`;
      if (chave !== d.chave) {
        d.chave = chave;
        layout = copiar(d.base);
        Object.assign(L()[id], { x, y, w, h });
        render(id, d.redim ? null : b);
        // Esticou pra menos que o conteúdo: volta pra "altura do conteúdo".
        if (d.redim && h <= (natural.get(id) || 0)) L()[id].h = null;
        if (d.vaga) {
          const it = L()[id];
          d.vaga.style.left = `${it.x * cw}px`;
          d.vaga.style.top = `${it.y * LINHA}px`;
          d.vaga.style.width = `${it.w * cw - gap()}px`;
          d.vaga.style.height = `${altura(id) * LINHA - gap()}px`;
        }
      }
      rolarPerto(m.clientY, () => mover(d.ultimoMov));
    };

    const soltar = u => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
      pararRolagem();
      if (!d.ativo) { if (editando) b.focus(); return; }
      arrastando = null;
      document.body.classList.remove('pr-arrastando-cartao', 'pr-esticando-cartao');
      grade.classList.remove('pr-grade-ativa');
      b.classList.remove('pr-bloco-solto', 'pr-bloco-esticando');
      if (d.vaga) d.vaga.remove();
      // O "click" que o navegador manda ao soltar não pode abrir o cartão.
      const engolir = c => { c.preventDefault(); c.stopPropagation(); };
      window.addEventListener('click', engolir, true);
      setTimeout(() => window.removeEventListener('click', engolir, true), 60);
      if (u.type === 'pointercancel') layout = d.base;
      render();
      salvar();
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
  }

  // Arrastando perto da borda de cima/baixo da janela, a página rola.
  let rolagem = null;
  function rolarPerto(y, aoRolar) {
    const margem = 70;
    const v = y < margem ? -(margem - y) / 4 : y > window.innerHeight - margem ? (y - (window.innerHeight - margem)) / 4 : 0;
    if (!v) { pararRolagem(); return; }
    if (rolagem) { rolagem.v = v; rolagem.aoRolar = aoRolar; return; }
    rolagem = { v, aoRolar };
    const passo = () => {
      if (!rolagem) return;
      window.scrollBy(0, rolagem.v);
      const cb = rolagem.aoRolar;
      rolagem.raf = requestAnimationFrame(passo);
      cb();
    };
    rolagem.raf = requestAnimationFrame(passo);
  }
  function pararRolagem() {
    if (rolagem) { cancelAnimationFrame(rolagem.raf); rolagem = null; }
  }

  function montar(opcoes) {
    grade = opcoes.grade;
    botao = opcoes.botao;
    sb = opcoes.client || null;
    email = opcoes.email || null;
    padrao = padraoDoHtml();
    layout = mesclar(lerLocal());
    grade.classList.add('pr-painel-livre');
    render();
    // As animações de posição só depois do 1º desenho (senão tudo "voa" ao abrir).
    requestAnimationFrame(() => grade.classList.add('pr-painel-pronto'));

    botao.addEventListener('click', () => (editando ? sair() : entrar()));
    grade.addEventListener('pointerdown', aoApertar);
    grade.addEventListener('dblclick', e => {
      if (!e.target.closest('.pr-bloco-redim')) return;
      const id = e.target.closest('.pr-bloco').dataset.bloco;
      L()[id].h = null;
      render(id);
      salvar();
    });
    // Personalizando, clicar num cartão não abre nada (captura: chega antes
    // do onclick do próprio cartão).
    grade.addEventListener('click', e => {
      if (!editando) return;
      const ocu = e.target.closest('[data-ocultar]');
      const b = e.target.closest('.pr-bloco');
      e.preventDefault();
      e.stopPropagation();
      if (ocu && b) ocultar(b);
    }, true);
    grade.addEventListener('keydown', e => {
      if (!editando) return;
      const b = e.target.closest('.pr-bloco');
      if (!b || e.target !== b) return;
      const setas = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (setas[e.key]) { e.preventDefault(); moverTeclado(b, setas[e.key][0], setas[e.key][1], e.shiftKey); }
      else if (e.key === 'Delete') { e.preventDefault(); ocultar(b); }
    });
    document.addEventListener('keydown', e => {
      // Esc encerra a personalização (se a agenda não estiver com algo aberto).
      if (e.key === 'Escape' && editando && !document.querySelector('.ag-full.ag-aberta, .ag-modal-fundo, .ag-pop, .ag-lista')) sair();
    });

    // O conteúdo muda de altura (agenda com mais compromissos, frase maior)
    // ou a janela muda de largura: redesenha. O relógio muda o texto a todo
    // segundo, então só redesenha se alguma altura mudou de verdade.
    let pendente = null;
    // Altura da janela também conta: é ela que decide o quanto o painel encolhe.
    let telaAntes = '';
    const conferir = () => {
      if (arrastando) return;
      cancelAnimationFrame(pendente);
      pendente = requestAnimationFrame(() => {
        const tela = `${larguraVisivel()}x${Math.round(alturaDisponivel())}`;
        if (tela !== telaAntes || medir()) { telaAntes = tela; render(); }
      });
    };
    window.addEventListener('resize', conferir);
    // A barra do topo muda de altura depois de abrir (logo do Axis, música,
    // fonte): o painel desce e precisa encolher de novo.
    if (window.ResizeObserver) new ResizeObserver(conferir).observe(document.body);
    new MutationObserver(conferir).observe(grade, { childList: true, subtree: true, characterData: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => render());
    carregarNuvem();
  }

  return { montar };
})();
