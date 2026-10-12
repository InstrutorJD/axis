// Agenda do professor (professor/painel.html), no estilo do Notion Calendar:
// - mini calendário no painel, com a lista do dia escolhido ao lado;
// - botão de expandir abre a agenda em tela cheia, com visão de Mês e de
//   Semana (grade de horários);
// - compromisso com hora de início e/ou fim, ou dia todo, e cor do cartão;
// - arrastar o cartão pra outro dia (mini calendário, Mês e Semana) e, na
//   Semana, arrastar pra outro horário ou esticar pela borda de cima/baixo
//   pra mudar início/fim (de 15 em 15 min);
// - lembrete por compromisso: quando chega a hora, vira notificação (aviso
//   na tela, aviso do navegador se permitido) e conta no sininho até ser
//   marcada como lida.
//
// Dados: tabela public.professor_compromissos (sql/professor-agenda.sql),
// cada professor só enxerga os próprios. Se a tabela ainda não existir no
// Supabase, a agenda funciona salvando só neste navegador (localStorage) e
// avisa isso no rodapé. Estilos em shared/professor-agenda.css.
//
// Uso: window.ProfessorAgenda.montar(elementoDaSecao, clienteSupabase)
window.ProfessorAgenda = (function () {
  const TABELA = 'professor_compromissos';
  const CHAVE_LOCAL = 'axis.agenda.v1';
  const CHAVE_VISTA = 'axis.agenda.vista';
  const PX_HORA = 48;      // altura de 1 hora na grade da Semana
  const PASSO = 15;        // arrastar/esticar anda de 15 em 15 minutos
  const MAX_NO_MES = 3;    // cartões visíveis por dia na visão Mês

  const CORES = [
    ['azul', 'Azul'], ['roxo', 'Roxo'], ['rosa', 'Rosa'], ['vermelho', 'Vermelho'], ['laranja', 'Laranja'],
    ['amarelo', 'Amarelo'], ['verde', 'Verde'], ['cinza', 'Cinza'], ['marrom', 'Marrom'],
  ];
  const LEMBRETES = [
    ['', 'Sem lembrete'], ['0', 'Na hora'], ['5', '5 minutos antes'], ['10', '10 minutos antes'],
    ['15', '15 minutos antes'], ['30', '30 minutos antes'], ['60', '1 hora antes'], ['1440', '1 dia antes'],
  ];
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const DIAS_LETRA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const ICONES = {
    sino: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    expandir: '<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/>',
    esq: '<path d="m15 18-6-6 6-6"/>',
    dir: '<path d="m9 18 6-6-6-6"/>',
    mais: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    fechar: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    calendario: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    copiar: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    baixo: '<path d="m6 9 6 6 6-6"/>',
    relogio: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    certo: '<path d="M20 6 9 17l-5-5"/>',
    lixo: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  };
  const ico = nome => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome]}</svg>`;

  // ---------- Datas e horas (sempre no fuso local) ----------
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const deYmd = s => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d); };
  const somarDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const hoje = () => ymd(new Date());
  const hhmm = s => (s ? String(s).slice(0, 5) : null);
  const minDe = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const deMin = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const arredondar = m => Math.round(m / PASSO) * PASSO;
  const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
  const inicioDaSemana = d => somarDias(d, -d.getDay());

  function dataCurta(dia) {
    if (dia === hoje()) return 'Hoje';
    if (dia === ymd(somarDias(new Date(), 1))) return 'Amanhã';
    if (dia === ymd(somarDias(new Date(), -1))) return 'Ontem';
    const d = deYmd(dia);
    return `${d.getDate()} ${MESES_CURTOS[d.getMonth()]}`;
  }
  function dataLonga(dia) {
    const t = deYmd(dia).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const novoId = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));

  // ---------- Compromisso ----------
  // Sem hora nenhuma também conta como dia todo.
  const ehDiaTodo = ev => ev.dia_todo || (!ev.hora_inicio && !ev.hora_fim);

  // Faixa [início, fim] em minutos pra desenhar na Semana. Quem só tem
  // início (ou só fim) aparece com 1 h, com a ponta que falta tracejada.
  function faixa(ev) {
    let i = ev.hora_inicio ? minDe(ev.hora_inicio) : null;
    let f = ev.hora_fim ? minDe(ev.hora_fim) : null;
    if (i == null) i = Math.max(0, f - 60);
    if (f == null || f <= i) f = Math.min(1440, i + 60);
    return [i, f];
  }
  function rotuloHora(ev) {
    if (ehDiaTodo(ev)) return 'Dia todo';
    if (ev.hora_inicio && ev.hora_fim) return `${ev.hora_inicio} – ${ev.hora_fim}`;
    if (ev.hora_inicio) return ev.hora_inicio;
    return `até ${ev.hora_fim}`;
  }
  function ordenar(a, b) {
    const ta = ehDiaTodo(a), tb = ehDiaTodo(b);
    if (ta !== tb) return ta ? -1 : 1;
    if (!ta) { const d = faixa(a)[0] - faixa(b)[0]; if (d) return d; }
    return (a.titulo || '').localeCompare(b.titulo || '');
  }
  const doDia = dia => st.eventos.filter(e => e.dia === dia).sort(ordenar);

  // Lembrete: conta a partir do início (ou do fim, se só tiver fim); dia
  // todo conta a partir das 8h do dia.
  function momentoAviso(ev) {
    if (ev.lembrete_min == null) return null;
    const ref = ehDiaTodo(ev) ? 8 * 60 : (ev.hora_inicio ? minDe(ev.hora_inicio) : minDe(ev.hora_fim));
    const d = deYmd(ev.dia);
    d.setMinutes(ref - ev.lembrete_min);
    return d;
  }
  function momentoFim(ev) {
    const d = deYmd(ev.dia);
    d.setMinutes(ehDiaTodo(ev) ? 1440 : faixa(ev)[1]);
    return d;
  }
  // Notificação = lembrete que já chegou e não foi lido. Some sozinha 12 h
  // depois que o compromisso acabou.
  function notificacoes() {
    const agora = Date.now();
    return st.eventos.filter(e => {
      if (e.lembrete_lido) return false;
      const a = momentoAviso(e);
      return a && a.getTime() <= agora && momentoFim(e).getTime() > agora - 12 * 3600e3;
    }).sort((a, b) => momentoAviso(b) - momentoAviso(a));
  }
  // Mudou o horário pra frente? O lembrete volta a valer.
  function revalidarLembrete(ev) {
    const a = momentoAviso(ev);
    if (a && a.getTime() > Date.now()) { ev.lembrete_lido = false; st.avisados.delete(ev.id); }
    return ev;
  }

  // ---------- Estado ----------
  const st = {
    sb: null,
    modo: 'supabase',       // 'supabase' | 'local'
    eventos: [],
    sel: hoje(),            // dia escolhido no mini calendário
    mesMini: null,          // 1º dia do mês mostrado no mini calendário
    full: { aberto: false, vista: 'mes', ref: hoje() },
    avisados: new Set(),    // ids que já deram aviso nesta aba
    ignorarCliqueAte: 0,    // depois de arrastar, o "click" que vem junto não abre nada
    tituloPagina: document.title,
  };
  let raiz = null;          // seção do painel
  let telaCheia = null;     // overlay da tela cheia

  // ---------- Persistência ----------
  function normalizar(r) {
    return {
      id: r.id,
      titulo: r.titulo || '',
      descricao: r.descricao || '',
      dia: String(r.dia).slice(0, 10),
      dia_todo: !!r.dia_todo,
      hora_inicio: hhmm(r.hora_inicio),
      hora_fim: hhmm(r.hora_fim),
      cor: r.cor || 'azul',
      lembrete_min: r.lembrete_min == null || r.lembrete_min === '' ? null : Number(r.lembrete_min),
      lembrete_lido: !!r.lembrete_lido,
    };
  }
  function lerLocal() {
    try { return (JSON.parse(localStorage.getItem(CHAVE_LOCAL)) || []).map(normalizar); } catch (e) { return []; }
  }
  function gravarLocal() {
    try { localStorage.setItem(CHAVE_LOCAL, JSON.stringify(st.eventos)); } catch (e) { /* sem espaço/bloqueado */ }
  }

  async function carregar() {
    if (st.sb) {
      const { data, error } = await st.sb.from(TABELA).select('*').order('dia', { ascending: true });
      if (!error) { st.modo = 'supabase'; st.eventos = (data || []).map(normalizar); return; }
      console.warn('[agenda] tabela indisponível, salvando só neste navegador:', error.message);
    }
    st.modo = 'local';
    st.eventos = lerLocal();
  }

  async function salvar(ev) {
    const i = st.eventos.findIndex(e => e.id === ev.id);
    const antes = i >= 0 ? st.eventos[i] : null;
    if (i >= 0) st.eventos[i] = ev; else st.eventos.push(ev);
    renderTudo();
    if (st.modo === 'local') { gravarLocal(); return; }
    const { error } = await st.sb.from(TABELA).upsert({ ...ev, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    if (error) {
      const j = st.eventos.findIndex(e => e.id === ev.id);
      if (antes) st.eventos[j] = antes; else st.eventos.splice(j, 1);
      renderTudo();
      aviso(`Não deu pra salvar: ${error.message}`, 'erro');
    }
  }

  async function excluir(id) {
    const i = st.eventos.findIndex(e => e.id === id);
    if (i < 0) return;
    const [antes] = st.eventos.splice(i, 1);
    renderTudo();
    if (st.modo === 'local') { gravarLocal(); return; }
    const { error } = await st.sb.from(TABELA).delete().eq('id', id);
    if (error) { st.eventos.push(antes); renderTudo(); aviso(`Não deu pra excluir: ${error.message}`, 'erro'); }
  }

  // ---------- Cartões (iguais no mini, no Mês e na Semana) ----------
  function cartaoChip(ev, comHora) {
    const hora = comHora && !ehDiaTodo(ev) ? `<span class="ag-chip-hora">${esc(ev.hora_inicio || `até ${ev.hora_fim}`)}</span>` : '';
    return `<div class="ag-chip ag-cor-${esc(ev.cor)}${ehDiaTodo(ev) ? ' ag-chip-todo' : ''}" data-id="${esc(ev.id)}" title="${esc(`${ev.titulo || 'Sem título'} · ${rotuloHora(ev)}`)}">${hora}<span class="ag-chip-titulo">${esc(ev.titulo || 'Sem título')}</span></div>`;
  }

  function botaoSino() {
    return `<button type="button" class="ag-icone-btn ag-sino" data-acao="sino" aria-label="Notificações" title="Notificações">${ico('sino')}<span class="ag-badge" hidden>0</span></button>`;
  }

  // ---------- Mini calendário ----------
  const ultimoClique = { dia: null, em: 0 };
  function montarMini() {
    raiz.innerHTML = `
      <div class="ag-cartao">
        <div class="ag-cartao-topo">
          <span class="ag-cartao-titulo">${ico('calendario')}Agenda</span>
          <div class="ag-cartao-acoes">
            ${botaoSino()}
            <button type="button" class="ag-icone-btn" data-acao="expandir" aria-label="Abrir agenda em tela cheia" title="Expandir">${ico('expandir')}</button>
          </div>
        </div>
        <div class="ag-mini">
          <div class="ag-mini-cal">
            <div class="ag-mini-nav">
              <button type="button" class="ag-mini-mes" data-acao="mini-hoje" title="Voltar pra hoje"></button>
              <div>
                <button type="button" class="ag-icone-btn ag-pequeno" data-acao="mini-ant" aria-label="Mês anterior">${ico('esq')}</button>
                <button type="button" class="ag-icone-btn ag-pequeno" data-acao="mini-prox" aria-label="Próximo mês">${ico('dir')}</button>
              </div>
            </div>
            <div class="ag-mini-semana">${DIAS_LETRA.map(l => `<span>${l}</span>`).join('')}</div>
            <div class="ag-mini-grade" role="grid"></div>
          </div>
          <div class="ag-mini-dia">
            <div class="ag-mini-dia-topo">
              <div><strong class="ag-mini-dia-nome"></strong><span class="ag-mini-dia-data"></span></div>
              <button type="button" class="ag-icone-btn" data-acao="novo-sel" aria-label="Novo compromisso" title="Novo compromisso">${ico('mais')}</button>
            </div>
            <div class="ag-mini-lista"></div>
          </div>
        </div>
        <p class="ag-local" hidden>Salvando só neste navegador. Rode <code>sql/professor-agenda.sql</code> no Supabase pra guardar na nuvem.</p>
      </div>`;

    raiz.addEventListener('click', e => {
      const b = e.target.closest('[data-acao]');
      if (b) {
        const a = b.dataset.acao;
        if (a === 'expandir') abrirTelaCheia();
        else if (a === 'sino') abrirNotificacoes(b);
        else if (a === 'mini-ant' || a === 'mini-prox') { const m = st.mesMini; st.mesMini = new Date(m.getFullYear(), m.getMonth() + (a === 'mini-ant' ? -1 : 1), 1); renderMini(); }
        else if (a === 'mini-hoje') { st.sel = hoje(); st.mesMini = null; renderMini(); }
        else if (a === 'novo-sel') abrirEditor(novoEvento(st.sel));
        return;
      }
      if (Date.now() < st.ignorarCliqueAte || e.target.closest('[data-id]')) return;
      const cel = e.target.closest('.ag-mini-cel');
      if (!cel) return;
      // Dois cliques no mesmo dia = novo compromisso (feito na mão porque o
      // 1º clique redesenha a grade e o dblclick do navegador se perderia).
      const dia = cel.dataset.dia;
      if (ultimoClique.dia === dia && Date.now() - ultimoClique.em < 400) {
        ultimoClique.dia = null;
        abrirEditor(novoEvento(dia));
        return;
      }
      ultimoClique.dia = dia; ultimoClique.em = Date.now();
      if (st.sel !== dia) { st.sel = dia; renderMini(); }
    });
    ligarArraste(raiz);
  }

  function renderMini() {
    if (!raiz) return;
    if (!st.mesMini) { const s = deYmd(st.sel); st.mesMini = new Date(s.getFullYear(), s.getMonth(), 1); }
    const m = st.mesMini;
    raiz.querySelector('.ag-mini-mes').textContent = `${MESES[m.getMonth()]} ${m.getFullYear()}`;

    const inicio = inicioDaSemana(m);
    const hj = hoje();
    let html = '';
    for (let i = 0; i < 42; i++) {
      const d = somarDias(inicio, i);
      const dia = ymd(d);
      const evs = doDia(dia);
      const cls = ['ag-mini-cel'];
      if (d.getMonth() !== m.getMonth()) cls.push('ag-fora');
      if (dia === hj) cls.push('ag-hoje');
      if (dia === st.sel) cls.push('ag-sel');
      const pontos = evs.slice(0, 3).map(e => `<i class="ag-cor-${esc(e.cor)}"></i>`).join('');
      html += `<button type="button" class="${cls.join(' ')}" data-dia="${dia}" aria-label="${esc(dataLonga(dia))}${evs.length ? `, ${evs.length} compromisso(s)` : ''}"><span>${d.getDate()}</span><span class="ag-pontos">${pontos}</span></button>`;
    }
    raiz.querySelector('.ag-mini-grade').innerHTML = html;

    raiz.querySelector('.ag-mini-dia-nome').textContent = dataCurta(st.sel);
    raiz.querySelector('.ag-mini-dia-data').textContent = dataLonga(st.sel);
    const evs = doDia(st.sel);
    raiz.querySelector('.ag-mini-lista').innerHTML = evs.length
      ? evs.map(ev => `
          <div class="ag-item ag-cor-${esc(ev.cor)}" data-id="${esc(ev.id)}" tabindex="0">
            <span class="ag-item-hora">${esc(rotuloHora(ev))}</span>
            <span class="ag-item-titulo">${esc(ev.titulo || 'Sem título')}</span>
          </div>`).join('')
      : '<p class="ag-vazio">Nada marcado. Dê dois cliques num dia ou use o <b>+</b>.</p>';
    raiz.querySelector('.ag-local').hidden = st.modo !== 'local';
  }

  // ---------- Tela cheia ----------
  function montarTelaCheia() {
    telaCheia = document.createElement('div');
    telaCheia.className = 'ag-full';
    telaCheia.setAttribute('role', 'dialog');
    telaCheia.setAttribute('aria-modal', 'true');
    telaCheia.setAttribute('aria-label', 'Agenda');
    telaCheia.innerHTML = `
      <header class="ag-full-topo">
        <div class="ag-full-esq">
          <h2 class="ag-full-titulo"></h2>
          <div class="ag-full-nav">
            <button type="button" class="ag-icone-btn" data-acao="ant" aria-label="Anterior">${ico('esq')}</button>
            <button type="button" class="btn btn-secondary ag-btn-hoje" data-acao="hoje">Hoje</button>
            <button type="button" class="ag-icone-btn" data-acao="prox" aria-label="Próximo">${ico('dir')}</button>
          </div>
        </div>
        <div class="ag-full-dir">
          <div class="ag-seg" role="tablist">
            <button type="button" data-acao="vista" data-vista="mes" role="tab">Mês</button>
            <button type="button" data-acao="vista" data-vista="semana" role="tab">Semana</button>
          </div>
          <button type="button" class="btn" data-acao="novo">${ico('mais')}<span>Novo</span></button>
          ${botaoSino()}
          <button type="button" class="ag-icone-btn" data-acao="fechar" aria-label="Fechar agenda" title="Fechar (Esc)">${ico('fechar')}</button>
        </div>
      </header>
      <div class="ag-full-corpo"></div>`;
    document.body.appendChild(telaCheia);

    telaCheia.addEventListener('click', e => {
      const b = e.target.closest('[data-acao]');
      const f = st.full;
      if (b) {
        const a = b.dataset.acao;
        if (a === 'fechar') fecharTelaCheia();
        else if (a === 'sino') abrirNotificacoes(b);
        else if (a === 'novo') abrirEditor(novoEvento(f.ref));
        else if (a === 'hoje') { f.ref = hoje(); renderFull(); }
        else if (a === 'ant' || a === 'prox') {
          const s = a === 'ant' ? -1 : 1;
          const r = deYmd(f.ref);
          f.ref = f.vista === 'mes' ? ymd(new Date(r.getFullYear(), r.getMonth() + s, 1)) : ymd(somarDias(r, 7 * s));
          renderFull();
        } else if (a === 'vista') {
          f.vista = b.dataset.vista;
          try { localStorage.setItem(CHAVE_VISTA, f.vista); } catch (err) { /* ignore */ }
          renderFull(true);
        } else if (a === 'ver-dia') { f.ref = b.dataset.dia; f.vista = 'semana'; renderFull(true); }
        else if (a === 'novo-dia') abrirEditor(novoEvento(b.dataset.dia));
        return;
      }
      if (Date.now() < st.ignorarCliqueAte || e.target.closest('[data-id]')) return;
      // Clique no vazio: Mês → compromisso de dia todo naquele dia;
      // Semana → compromisso de 1 h começando na meia hora clicada.
      const col = e.target.closest('.ag-col');
      if (col) {
        const ini = limitar(Math.floor(minutoEm(col, e.clientY) / 30) * 30, 0, 1440 - 60);
        abrirEditor(novoEvento(col.dataset.dia, deMin(ini), deMin(ini + 60)));
        return;
      }
      const cel = e.target.closest('.ag-mes-cel, .ag-sem-todo-cel');
      if (cel) abrirEditor(novoEvento(cel.dataset.dia));
    });
    ligarArraste(telaCheia);
  }

  function abrirTelaCheia() {
    if (!telaCheia) montarTelaCheia();
    let vista = 'mes';
    try { vista = localStorage.getItem(CHAVE_VISTA) || 'mes'; } catch (e) { /* ignore */ }
    st.full = { aberto: true, vista, ref: st.sel };
    telaCheia.classList.add('ag-aberta');
    document.body.classList.add('ag-travar-rolagem');
    renderFull(true);
    renderSinos();
  }
  function fecharTelaCheia() {
    if (!telaCheia) return;
    st.full.aberto = false;
    telaCheia.classList.remove('ag-aberta');
    document.body.classList.remove('ag-travar-rolagem');
  }

  function renderFull(rolarPraManha) {
    if (!telaCheia || !st.full.aberto) return;
    const f = st.full;
    const r = deYmd(f.ref);
    telaCheia.querySelectorAll('[data-vista]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.vista === f.vista)));
    const corpo = telaCheia.querySelector('.ag-full-corpo');
    if (f.vista === 'mes') {
      telaCheia.querySelector('.ag-full-titulo').textContent = `${MESES[r.getMonth()]} ${r.getFullYear()}`;
      corpo.innerHTML = htmlMes(r);
    } else {
      const ini = inicioDaSemana(r), fim = somarDias(ini, 6);
      telaCheia.querySelector('.ag-full-titulo').textContent = ini.getMonth() === fim.getMonth()
        ? `${MESES[ini.getMonth()]} ${ini.getFullYear()}`
        : `${MESES_CURTOS[ini.getMonth()]} – ${MESES_CURTOS[fim.getMonth()]} ${fim.getFullYear()}`;
      const rolagem = corpo.querySelector('.ag-sem-rolagem');
      const topoAntes = rolagem ? rolagem.scrollTop : null;
      corpo.innerHTML = htmlSemana(ini);
      const nova = corpo.querySelector('.ag-sem-rolagem');
      if (rolarPraManha || topoAntes == null) {
        const primeiro = Math.min(7 * 60, ...Array.from({ length: 7 }, (_, i) => doDia(ymd(somarDias(ini, i))))
          .flat().filter(e => !ehDiaTodo(e)).map(e => faixa(e)[0]));
        nova.scrollTop = Math.max(0, (primeiro / 60 - 0.5) * PX_HORA);
      } else nova.scrollTop = topoAntes;
      atualizarLinhaAgora();
    }
  }

  function htmlMes(r) {
    const primeiro = new Date(r.getFullYear(), r.getMonth(), 1);
    const inicio = inicioDaSemana(primeiro);
    const ultimo = new Date(r.getFullYear(), r.getMonth() + 1, 0);
    const semanas = Math.ceil((primeiro.getDay() + ultimo.getDate()) / 7);
    const hj = hoje();
    let celulas = '';
    for (let i = 0; i < semanas * 7; i++) {
      const d = somarDias(inicio, i);
      const dia = ymd(d);
      const evs = doDia(dia);
      const visiveis = evs.length > MAX_NO_MES ? evs.slice(0, MAX_NO_MES - 1) : evs;
      const resto = evs.length - visiveis.length;
      const cls = ['ag-mes-cel'];
      if (d.getMonth() !== r.getMonth()) cls.push('ag-fora');
      if (dia === hj) cls.push('ag-hoje');
      celulas += `
        <div class="${cls.join(' ')}" data-dia="${dia}">
          <div class="ag-mes-cab">
            <button type="button" class="ag-mes-mais" data-acao="novo-dia" data-dia="${dia}" aria-label="Novo compromisso em ${esc(dataLonga(dia))}">${ico('mais')}</button>
            <button type="button" class="ag-mes-num" data-acao="ver-dia" data-dia="${dia}" title="Ver a semana">${d.getDate() === 1 ? `${d.getDate()} ${MESES_CURTOS[d.getMonth()]}` : d.getDate()}</button>
          </div>
          <div class="ag-mes-eventos">
            ${visiveis.map(ev => cartaoChip(ev, true)).join('')}
            ${resto > 0 ? `<button type="button" class="ag-mes-resto" data-acao="ver-dia" data-dia="${dia}">+${resto} mais</button>` : ''}
          </div>
        </div>`;
    }
    return `
      <div class="ag-mes" style="--semanas:${semanas}">
        <div class="ag-mes-semana">${DIAS_CURTOS.map(d => `<span>${d}</span>`).join('')}</div>
        <div class="ag-mes-grade">${celulas}</div>
      </div>`;
  }

  // Compromissos com horário que se sobrepõem dividem a largura da coluna.
  function distribuir(evs) {
    const itens = evs.map(e => ({ e, r: faixa(e) })).sort((a, b) => a.r[0] - b.r[0] || b.r[1] - a.r[1]);
    const saida = [];
    let grupo = [], fimGrupo = -1;
    const fechar = () => {
      const trilhas = [];
      grupo.forEach(it => {
        let t = trilhas.findIndex(f => f <= it.r[0]);
        if (t < 0) { t = trilhas.length; trilhas.push(0); }
        trilhas[t] = it.r[1];
        it.trilha = t;
      });
      grupo.forEach(it => { it.n = trilhas.length; });
      saida.push(...grupo);
      grupo = [];
    };
    itens.forEach(it => {
      if (grupo.length && it.r[0] >= fimGrupo) { fechar(); fimGrupo = -1; }
      grupo.push(it);
      fimGrupo = Math.max(fimGrupo, it.r[1]);
    });
    if (grupo.length) fechar();
    return saida;
  }

  function htmlBloco(it) {
    const ev = it.e;
    const [i, f] = it.r;
    const pontas = `${ev.hora_inicio ? '' : ' ag-sem-inicio'}${ev.hora_fim ? '' : ' ag-sem-fim'}`;
    const curto = f - i < 45 ? ' ag-curto' : '';
    return `
      <div class="ag-bloco ag-cor-${esc(ev.cor)}${pontas}${curto}" data-id="${esc(ev.id)}"
           style="top:${i * PX_HORA / 60}px;height:${Math.max(18, (f - i) * PX_HORA / 60 - 2)}px;left:calc(${it.trilha / it.n * 100}% + 2px);width:calc(${100 / it.n}% - 4px)"
           title="${esc(`${ev.titulo || 'Sem título'} · ${rotuloHora(ev)}`)}">
        <div class="ag-alca ag-alca-topo" data-alca="topo"></div>
        <span class="ag-bloco-titulo">${esc(ev.titulo || 'Sem título')}</span>
        <span class="ag-bloco-hora">${esc(rotuloHora(ev))}</span>
        <div class="ag-alca ag-alca-base" data-alca="base"></div>
      </div>`;
  }

  function htmlSemana(ini) {
    const hj = hoje();
    const dias = Array.from({ length: 7 }, (_, i) => ymd(somarDias(ini, i)));
    const cab = dias.map((dia, i) => `
      <button type="button" class="ag-sem-dia${dia === hj ? ' ag-hoje' : ''}" data-acao="novo-dia" data-dia="${dia}" title="Novo compromisso">
        <span>${DIAS_CURTOS[i]}</span><b>${deYmd(dia).getDate()}</b>
      </button>`).join('');
    const todo = dias.map(dia => `<div class="ag-sem-todo-cel" data-dia="${dia}">${doDia(dia).filter(ehDiaTodo).map(ev => cartaoChip(ev, false)).join('')}</div>`).join('');
    const horas = Array.from({ length: 24 }, (_, h) => `<span style="top:${h * PX_HORA}px">${h ? `${pad(h)}:00` : ''}</span>`).join('');
    const colunas = dias.map(dia => `
      <div class="ag-col${dia === hj ? ' ag-hoje' : ''}" data-dia="${dia}">
        ${distribuir(doDia(dia).filter(e => !ehDiaTodo(e))).map(htmlBloco).join('')}
      </div>`).join('');
    return `
      <div class="ag-sem" style="--px-hora:${PX_HORA}px">
        <div class="ag-sem-cab"><span class="ag-sem-calha"></span>${cab}</div>
        <div class="ag-sem-todo"><span class="ag-sem-calha">dia todo</span>${todo}</div>
        <div class="ag-sem-rolagem">
          <div class="ag-sem-grade">
            <div class="ag-sem-horas ag-sem-calha">${horas}</div>
            ${colunas}
          </div>
        </div>
      </div>`;
  }

  function atualizarLinhaAgora() {
    if (!telaCheia || !st.full.aberto || st.full.vista !== 'semana') return;
    const col = telaCheia.querySelector(`.ag-col[data-dia="${hoje()}"]`);
    telaCheia.querySelectorAll('.ag-agora').forEach(l => l.remove());
    if (!col) return;
    const agora = new Date();
    const linha = document.createElement('div');
    linha.className = 'ag-agora';
    linha.style.top = `${(agora.getHours() * 60 + agora.getMinutes()) * PX_HORA / 60}px`;
    col.appendChild(linha);
  }

  // ---------- Arrastar ----------
  // Um único tratador pra tudo:
  // - .ag-chip / .ag-item (mini, Mês, linha "dia todo"): leva pra outro
  //   dia; solto numa coluna de horário da Semana, vira compromisso com
  //   hora a partir dali;
  // - .ag-bloco (Semana): pelo meio muda dia e horário mantendo a duração;
  //   pelas alças de cima/baixo muda só o início/fim.
  // Com Ctrl (⌘ no Mac) apertado ao começar a arrastar, o original fica onde
  // está e uma CÓPIA vai pro lugar onde soltar.
  // Sem passar de 4 px é clique: abre o editor.
  const DESTINOS = '.ag-mini-cel, .ag-mes-cel, .ag-sem-todo-cel, .ag-sem-dia, .ag-col';
  function minutoEm(col, y) {
    return (y - col.getBoundingClientRect().top) / PX_HORA * 60;
  }

  function ligarArraste(container) {
    container.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      let alvo = e.target.closest('[data-id]');
      if (!alvo || !container.contains(alvo)) return;
      const ev = st.eventos.find(x => x.id === alvo.dataset.id);
      if (!ev) return;
      e.preventDefault();

      const alca = e.target.closest('[data-alca]');
      const bloco = alvo.classList.contains('ag-bloco');
      const d = {
        tipo: bloco ? (alca ? alca.dataset.alca : 'mover') : 'dia',
        x0: e.clientX, y0: e.clientY, ativo: false, fantasma: null, destino: null,
      };
      // Esticar pela alça nunca copia, só o arrastar pelo meio.
      d.copiar = (e.ctrlKey || e.metaKey) && (d.tipo === 'mover' || d.tipo === 'dia');
      if (bloco) {
        const [i, f] = faixa(ev);
        d.ini = i; d.fim = f; d.dur = f - i; d.dia = ev.dia;
        d.pega = minutoEm(alvo.closest('.ag-col'), e.clientY) - i;
      }

      const mover = m => {
        if (!d.ativo) {
          if (Math.hypot(m.clientX - d.x0, m.clientY - d.y0) < 4) return;
          d.ativo = true;
          document.body.classList.add('ag-arrastando-agora');
          if (d.copiar) {
            document.body.classList.add('ag-copiando');
            // Na Semana quem anda é um clone do bloco; o original não sai do lugar.
            if (bloco) { const clone = alvo.cloneNode(true); alvo.parentElement.appendChild(clone); alvo = clone; }
          }
          if (!d.copiar || bloco) alvo.classList.add('ag-arrastando');
          if (d.copiar) alvo.classList.add('ag-copia');
          if (!bloco) {
            d.fantasma = alvo.cloneNode(true);
            d.fantasma.classList.add('ag-fantasma');
            d.fantasma.style.width = `${alvo.getBoundingClientRect().width}px`;
            document.body.appendChild(d.fantasma);
          }
        }
        const sob = document.elementFromPoint(m.clientX, m.clientY);
        if (!bloco) {
          d.fantasma.style.transform = `translate(${m.clientX + 8}px, ${m.clientY + 8}px)`;
          const destino = sob && sob.closest(DESTINOS);
          if (d.destino !== destino) {
            if (d.destino) d.destino.classList.remove('ag-alvo');
            d.destino = destino;
            if (destino) destino.classList.add('ag-alvo');
          }
          if (destino && destino.classList.contains('ag-col')) d.minuto = limitar(Math.floor(minutoEm(destino, m.clientY) / PASSO) * PASSO, 0, 1440 - 60);
          return;
        }
        const col = sob && sob.closest('.ag-col');
        if (d.tipo === 'mover') {
          if (col) {
            if (col !== alvo.parentElement) col.appendChild(alvo);
            d.dia = col.dataset.dia;
            d.ini = limitar(arredondar(minutoEm(col, m.clientY) - d.pega), 0, 1440 - d.dur);
            d.fim = d.ini + d.dur;
          }
          alvo.style.left = '2px';
          alvo.style.width = 'calc(100% - 4px)';
        } else {
          const c = alvo.parentElement;
          const minuto = arredondar(minutoEm(c, m.clientY));
          if (d.tipo === 'topo') d.ini = limitar(minuto, 0, d.fim - PASSO);
          else d.fim = limitar(minuto, d.ini + PASSO, 1440);
        }
        alvo.style.top = `${d.ini * PX_HORA / 60}px`;
        alvo.style.height = `${Math.max(18, (d.fim - d.ini) * PX_HORA / 60 - 2)}px`;
        const hora = alvo.querySelector('.ag-bloco-hora');
        if (hora) hora.textContent = `${deMin(d.ini)} – ${deMin(d.fim)}`;
      };

      const soltar = u => {
        window.removeEventListener('pointermove', mover);
        window.removeEventListener('pointerup', soltar);
        window.removeEventListener('pointercancel', soltar);
        document.body.classList.remove('ag-arrastando-agora', 'ag-copiando');
        alvo.classList.remove('ag-arrastando', 'ag-copia');
        if (d.copiar && bloco && d.ativo) alvo.remove();
        if (d.fantasma) d.fantasma.remove();
        if (d.destino) d.destino.classList.remove('ag-alvo');

        if (!d.ativo) {
          if (u.type === 'pointerup') abrirEditor({ ...ev });
          return;
        }
        st.ignorarCliqueAte = Date.now() + 300;
        if (u.type === 'pointercancel') { renderTudo(); return; }

        let novo = null;
        if (!bloco) {
          const destino = d.destino;
          if (destino && destino.classList.contains('ag-col')) {
            const dur = ehDiaTodo(ev) ? 60 : faixa(ev)[1] - faixa(ev)[0];
            const fim = Math.min(1440, d.minuto + dur);
            novo = { ...ev, dia: destino.dataset.dia, dia_todo: false, hora_inicio: deMin(d.minuto), hora_fim: deMin(fim) };
          } else if (destino && (d.copiar || destino.dataset.dia !== ev.dia)) {
            novo = { ...ev, dia: destino.dataset.dia };
          }
        } else if (d.tipo === 'mover') {
          novo = { ...ev, dia: d.dia };
          // Mantém o "jeito" do compromisso: quem só tinha início continua
          // só com início (e vice-versa).
          if (ev.hora_inicio) novo.hora_inicio = deMin(d.ini);
          if (ev.hora_fim) novo.hora_fim = deMin(d.fim);
        } else {
          novo = { ...ev, hora_inicio: deMin(d.ini), hora_fim: deMin(d.fim) };
        }

        if (novo && d.copiar) {
          if (raiz && !st.full.aberto) st.sel = novo.dia;
          salvar(revalidarLembrete({ ...novo, id: novoId(), lembrete_lido: false }));
          aviso(`Cópia criada: ${dataCurta(novo.dia)}, ${rotuloHora(novo)}`, 'ok', novo.cor);
          return;
        }
        const mudou = novo && ['dia', 'dia_todo', 'hora_inicio', 'hora_fim'].some(k => novo[k] !== ev[k]);
        if (mudou) {
          if (novo.dia !== ev.dia && raiz && !st.full.aberto) st.sel = novo.dia;
          salvar(revalidarLembrete(novo));
        } else renderTudo();
      };

      window.addEventListener('pointermove', mover);
      window.addEventListener('pointerup', soltar);
      window.addEventListener('pointercancel', soltar);
    });

    // Teclado: Enter/Espaço num cartão abre o editor.
    container.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const alvo = e.target.closest('[data-id]');
      const ev = alvo && st.eventos.find(x => x.id === alvo.dataset.id);
      if (ev) { e.preventDefault(); abrirEditor({ ...ev }); }
    });
  }

  // ---------- Listas suspensas do editor ----------
  // Data, horários e lembrete abrem listas próprias (no visual da agenda)
  // em vez do calendário/lista nativos do navegador, que não seguem o tema.
  let lista = null;
  function fecharLista() {
    if (!lista) return;
    if (lista.dono) lista.dono.setAttribute('aria-expanded', 'false');
    lista.remove();
    lista = null;
  }
  function posicionarLista() {
    if (!lista) return;
    const r = lista.dono.getBoundingClientRect();
    if (!lista.classList.contains('ag-lista-data')) lista.style.minWidth = `${r.width}px`;
    const larg = lista.offsetWidth, alt = lista.offsetHeight;
    let top = r.bottom + 6;
    if (top + alt > window.innerHeight - 8 && r.top - alt - 6 > 8) top = r.top - alt - 6;
    lista.style.top = `${top}px`;
    if (!lista.classList.contains('ag-lista-data')) {
      lista.style.minWidth = `${r.width}px`;
      lista.style.maxHeight = `${Math.min(304, Math.max(160, window.innerHeight - top - 8))}px`;
    }
    lista.style.left = `${limitar(r.left, 8, window.innerWidth - larg - 8)}px`;
  }
  function abrirLista(dono, classe, aoClicar) {
    fecharLista();
    lista = document.createElement('div');
    lista.className = `ag-lista ${classe}`;
    lista.dono = dono;
    dono.setAttribute('aria-expanded', 'true');
    // Clicar na lista não tira o foco do campo de hora que está sendo digitado.
    lista.addEventListener('pointerdown', e => e.preventDefault());
    lista.addEventListener('click', aoClicar);
    document.body.appendChild(lista);
    return lista;
  }

  // Calendário de escolher a data (mesmo desenho do mini calendário, com as
  // bolinhas dos compromissos de cada dia).
  function htmlSeletorData(mes, valor) {
    const inicio = inicioDaSemana(mes);
    const hj = hoje();
    let dias = '';
    for (let i = 0; i < 42; i++) {
      const d = somarDias(inicio, i);
      const dia = ymd(d);
      const cls = ['ag-mini-cel'];
      if (d.getMonth() !== mes.getMonth()) cls.push('ag-fora');
      if (dia === hj) cls.push('ag-hoje');
      if (dia === valor) cls.push('ag-sel');
      const pontos = doDia(dia).slice(0, 3).map(e => `<i class="ag-cor-${esc(e.cor)}"></i>`).join('');
      dias += `<button type="button" class="${cls.join(' ')}" data-escolher="${dia}" aria-label="${esc(dataLonga(dia))}"${dia === valor ? ' aria-current="date"' : ''}><span>${d.getDate()}</span><span class="ag-pontos">${pontos}</span></button>`;
    }
    return `
      <div class="ag-mini-nav">
        <span class="ag-lista-mes">${MESES[mes.getMonth()]} ${mes.getFullYear()}</span>
        <div>
          <button type="button" class="ag-icone-btn ag-pequeno" data-mes="-1" aria-label="Mês anterior">${ico('esq')}</button>
          <button type="button" class="ag-icone-btn ag-pequeno" data-mes="1" aria-label="Próximo mês">${ico('dir')}</button>
        </div>
      </div>
      <div class="ag-mini-semana">${DIAS_LETRA.map(l => `<span>${l}</span>`).join('')}</div>
      <div class="ag-mini-grade">${dias}</div>
      <div class="ag-lista-atalhos">
        <button type="button" data-escolher="${hj}">Hoje</button>
        <button type="button" data-escolher="${ymd(somarDias(new Date(), 1))}">Amanhã</button>
        <button type="button" data-escolher="${ymd(somarDias(new Date(), 7))}">Daqui a 1 semana</button>
      </div>`;
  }
  function abrirSeletorData(botao, input, aoEscolher) {
    const v = deYmd(input.value || hoje());
    let mes = new Date(v.getFullYear(), v.getMonth(), 1);
    const el = abrirLista(botao, 'ag-lista-data', e => {
      const nav = e.target.closest('[data-mes]');
      if (nav) { mes = new Date(mes.getFullYear(), mes.getMonth() + Number(nav.dataset.mes), 1); desenhar(); return; }
      const dia = e.target.closest('[data-escolher]');
      if (dia) { input.value = dia.dataset.escolher; aoEscolher(); fecharLista(); botao.focus(); }
    });
    const desenhar = () => { el.innerHTML = htmlSeletorData(mes, input.value); posicionarLista(); };
    desenhar();
    const sel = el.querySelector('.ag-sel') || el.querySelector('.ag-hoje');
    if (sel) sel.focus();
  }

  // Lista de opções (lembrete): a escolhida ganha o ✓.
  function abrirSeletorOpcoes(botao, input, opcoes, aoEscolher) {
    const el = abrirLista(botao, 'ag-lista-opcoes', e => {
      const op = e.target.closest('[data-valor]');
      if (!op) return;
      input.value = op.dataset.valor;
      aoEscolher();
      fecharLista();
      botao.focus();
    });
    el.setAttribute('role', 'listbox');
    el.innerHTML = opcoes.map(([v, t]) => `
      <button type="button" class="ag-opcao${v === input.value ? ' ag-opcao-sel' : ''}" role="option" aria-selected="${v === input.value}" data-valor="${esc(v)}">
        <span>${esc(t)}</span>${v === input.value ? ico('certo') : ''}
      </button>`).join('');
    posicionarLista();
    (el.querySelector('.ag-opcao-sel') || el.querySelector('.ag-opcao')).focus();
  }

  // Horário digitado: aceita "9", "930", "9:30", "9h30", "09:30".
  function lerHora(txt) {
    const t = String(txt || '').trim().toLowerCase().replace('h', ':');
    if (!t) return null;
    let h, m;
    if (t.includes(':')) [h, m] = t.split(':').map(x => Number(x || 0));
    else if (/^\d{1,2}$/.test(t)) { h = Number(t); m = 0; }
    else if (/^\d{3,4}$/.test(t)) { h = Number(t.slice(0, -2)); m = Number(t.slice(-2)); }
    else return undefined;
    if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || m < 0 || m > 59 || h > 24 || (h === 24 && m > 0)) return undefined;
    return deMin(h * 60 + m);
  }
  function duracao(min) {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60), m = min % 60;
    return m ? `${h} h ${m}` : `${h} h`;
  }
  // Lista de horários de 15 em 15 min. A do fim começa depois do início e
  // mostra quanto tempo dá ("1 h 30").
  function abrirSeletorHora(input, inicio, aoEscolher) {
    const el = abrirLista(input, 'ag-lista-opcoes ag-lista-horas', e => {
      const op = e.target.closest('[data-valor]');
      if (!op) return;
      input.value = op.dataset.valor;
      aoEscolher();
      fecharLista();
    });
    el.setAttribute('role', 'listbox');
    const base = inicio ? minDe(inicio) : null;
    const de = base != null ? base + PASSO : 0;
    const atual = lerHora(input.value);
    let html = `<button type="button" class="ag-opcao ag-opcao-limpar" data-valor="" tabindex="-1"><span>Sem horário</span></button>`;
    for (let m = de; m <= (base != null ? 1440 : 1440 - PASSO); m += PASSO) {
      const v = deMin(m);
      const sel = v === atual;
      html += `<button type="button" class="ag-opcao${sel ? ' ag-opcao-sel' : ''}" role="option" aria-selected="${sel}" data-valor="${v}" tabindex="-1">
        <span>${v}${base != null ? ` <small>${duracao(m - base)}</small>` : ''}</span>${sel ? ico('certo') : ''}</button>`;
    }
    el.innerHTML = html;
    posicionarLista();
    rolarHoraPara(input.value);
  }
  // Rola a lista de horários até o mais perto do que está digitado (ou 8h).
  function rolarHoraPara(txt) {
    if (!lista || !lista.classList.contains('ag-lista-horas')) return;
    const v = lerHora(txt);
    const alvo = v ? minDe(v) : 8 * 60;
    let melhor = null, dist = Infinity;
    lista.querySelectorAll('[data-valor]:not([data-valor=""])').forEach(b => {
      const dd = Math.abs(minDe(b.dataset.valor) - alvo);
      b.classList.toggle('ag-opcao-perto', !!v && dd === 0);
      if (dd < dist) { dist = dd; melhor = b; }
    });
    if (melhor) lista.scrollTop = melhor.offsetTop - lista.clientHeight / 2 + melhor.offsetHeight / 2;
  }

  // ---------- Editor ----------
  function novoEvento(dia, inicio, fim) {
    return {
      id: null, titulo: '', descricao: '', dia,
      dia_todo: !inicio, hora_inicio: inicio || null, hora_fim: fim || null,
      cor: 'azul', lembrete_min: null, lembrete_lido: false,
    };
  }

  let editorAberto = null;
  function abrirEditor(ev) {
    fecharEditor();
    fecharNotificacoes();
    const novo = !ev.id;
    const lembreteAtual = ev.lembrete_min == null ? '' : String(ev.lembrete_min);
    const fundo = document.createElement('div');
    fundo.className = 'ag-modal-fundo';
    fundo.innerHTML = `
      <form class="ag-modal" role="dialog" aria-modal="true" aria-label="${novo ? 'Novo compromisso' : 'Editar compromisso'}" novalidate>
        <input class="ag-campo-titulo" name="titulo" type="text" placeholder="Sem título" maxlength="200" value="${esc(ev.titulo)}" autocomplete="off">
        <div class="ag-linha">
          <span class="ag-rotulo">Data</span>
          <input type="hidden" name="dia" value="${esc(ev.dia)}">
          <button type="button" class="ag-campo-btn" data-campo="dia" aria-haspopup="dialog" aria-expanded="false">
            ${ico('calendario')}<span class="ag-campo-valor"></span>${ico('baixo')}
          </button>
        </div>
        <div class="ag-linha">
          <span class="ag-rotulo">Dia todo</span>
          <label class="ag-chave"><input name="dia_todo" type="checkbox"${ehDiaTodo(ev) ? ' checked' : ''}><span></span></label>
        </div>
        <div class="ag-linha ag-linha-horas">
          <span class="ag-rotulo">Horário</span>
          <div class="ag-horas">
            <label class="ag-campo-hora">${ico('relogio')}<input name="hora_inicio" type="text" inputmode="numeric" maxlength="5" placeholder="Início" autocomplete="off" value="${esc(ev.hora_inicio || '')}" aria-label="Início" aria-haspopup="listbox" aria-expanded="false"></label>
            <span>–</span>
            <label class="ag-campo-hora">${ico('relogio')}<input name="hora_fim" type="text" inputmode="numeric" maxlength="5" placeholder="Fim" autocomplete="off" value="${esc(ev.hora_fim || '')}" aria-label="Fim" aria-haspopup="listbox" aria-expanded="false"></label>
          </div>
        </div>
        <p class="ag-dica ag-linha-horas">Pode deixar só o início ou só o fim.</p>
        <div class="ag-linha ag-linha-topo">
          <span class="ag-rotulo">Cor</span>
          <div class="ag-cores" role="radiogroup" aria-label="Cor do cartão">
            ${CORES.map(([id, nome]) => `
              <label class="ag-cor ag-cor-${id}" title="${nome}">
                <input type="radio" name="cor" value="${id}"${ev.cor === id ? ' checked' : ''} aria-label="${nome}"><span></span>
              </label>`).join('')}
          </div>
        </div>
        <div class="ag-linha">
          <span class="ag-rotulo">Lembrete</span>
          <input type="hidden" name="lembrete" value="${esc(lembreteAtual)}">
          <button type="button" class="ag-campo-btn" data-campo="lembrete" aria-haspopup="listbox" aria-expanded="false">
            ${ico('sino')}<span class="ag-campo-valor"></span>${ico('baixo')}
          </button>
        </div>
        <textarea name="descricao" rows="3" placeholder="Anotações (opcional)" maxlength="2000">${esc(ev.descricao)}</textarea>
        <p class="ag-erro" role="alert" hidden></p>
        <div class="ag-modal-acoes">
          ${novo ? '' : `<button type="button" class="btn btn-ghost ag-btn-excluir" data-acao="excluir" title="Excluir">${ico('lixo')}<span>Excluir</span></button>
          <button type="button" class="btn btn-ghost ag-btn-duplicar" data-acao="duplicar" title="Duplicar (ou Ctrl + arrastar o cartão)">${ico('copiar')}<span>Duplicar</span></button>`}
          <button type="button" class="btn btn-secondary" data-acao="cancelar">Cancelar</button>
          <button type="submit" class="btn">Salvar</button>
        </div>
      </form>`;
    document.body.appendChild(fundo);
    editorAberto = fundo;

    const form = fundo.querySelector('form');
    const f = form.elements;
    const btnDia = form.querySelector('[data-campo="dia"]');
    const btnLembrete = form.querySelector('[data-campo="lembrete"]');
    const mostrarDia = () => { btnDia.querySelector('.ag-campo-valor').textContent = `${dataLonga(f.dia.value)} de ${deYmd(f.dia.value).getFullYear()}`; };
    const mostrarLembrete = () => {
      const op = LEMBRETES.find(([v]) => v === f.lembrete.value);
      btnLembrete.querySelector('.ag-campo-valor').textContent = op ? op[1] : 'Sem lembrete';
      btnLembrete.classList.toggle('ag-campo-vazio', f.lembrete.value === '');
    };
    mostrarDia();
    mostrarLembrete();

    let inicioAntes = lerHora(f.hora_inicio.value) || null;
    const todo = f.dia_todo;
    const mostrarHoras = () => fundo.querySelectorAll('.ag-linha-horas').forEach(x => { x.hidden = todo.checked; });
    todo.addEventListener('change', () => {
      if (!todo.checked && !f.hora_inicio.value && !f.hora_fim.value) {
        f.hora_inicio.value = '09:00';
        f.hora_fim.value = '10:00';
        inicioAntes = '09:00';
      }
      mostrarHoras();
    });
    mostrarHoras();

    btnDia.addEventListener('click', () => {
      if (lista && lista.dono === btnDia) { fecharLista(); return; }
      abrirSeletorData(btnDia, f.dia, mostrarDia);
    });
    btnLembrete.addEventListener('click', () => {
      if (lista && lista.dono === btnLembrete) { fecharLista(); return; }
      abrirSeletorOpcoes(btnLembrete, f.lembrete, LEMBRETES, mostrarLembrete);
    });

    // Horários: lista ao focar, aceita digitar. Mudar o início leva o fim
    // junto, mantendo a duração (igual ao Notion Calendar).
    const aplicarInicio = () => {
      const novoIni = lerHora(f.hora_inicio.value);
      if (novoIni === undefined) return;
      const fim = lerHora(f.hora_fim.value);
      if (novoIni && inicioAntes && fim) {
        const dur = minDe(fim) - minDe(inicioAntes);
        if (dur > 0) f.hora_fim.value = deMin(Math.min(1440, minDe(novoIni) + dur));
      }
      f.hora_inicio.value = novoIni || '';
      inicioAntes = novoIni;
    };
    [f.hora_inicio, f.hora_fim].forEach(input => {
      const ehInicio = input === f.hora_inicio;
      const abrir = () => {
        if (lista && lista.dono === input) return;
        abrirSeletorHora(input, ehInicio ? null : lerHora(f.hora_inicio.value), () => {
          if (ehInicio) aplicarInicio();
          input.classList.remove('ag-invalido');
        });
      };
      input.addEventListener('focus', abrir);
      input.addEventListener('click', abrir);
      input.addEventListener('input', () => rolarHoraPara(input.value));
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && lista && lista.dono === input) {
          // Enter escolhe o horário destacado (ou o que foi digitado).
          e.preventDefault();
          fecharLista();
          input.blur();
        } else if (e.key === 'Tab') fecharLista();
      });
      input.addEventListener('blur', () => {
        if (lista && lista.dono === input) fecharLista();
        const v = lerHora(input.value);
        input.classList.toggle('ag-invalido', v === undefined);
        if (v === undefined) return;
        if (ehInicio) aplicarInicio(); else input.value = v || '';
      });
    });

    fundo.addEventListener('pointerdown', e => { if (e.target === fundo) fecharEditor(); });
    fundo.addEventListener('click', e => {
      const b = e.target.closest('[data-acao]');
      if (!b) return;
      if (b.dataset.acao === 'cancelar') fecharEditor();
      else if (b.dataset.acao === 'duplicar') {
        fecharEditor();
        const copia = revalidarLembrete({ ...st.eventos.find(x => x.id === ev.id), id: novoId(), lembrete_lido: false });
        salvar(copia);
        aviso('Compromisso duplicado. Arraste a cópia pra onde quiser.', 'ok', copia.cor);
      } else if (b.dataset.acao === 'excluir') {
        if (window.confirm(`Excluir "${ev.titulo || 'Sem título'}"?`)) { fecharEditor(); excluir(ev.id); }
      }
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (lista) fecharLista();
      const erro = fundo.querySelector('.ag-erro');
      const ini = lerHora(f.hora_inicio.value);
      const fim = lerHora(f.hora_fim.value);
      const diaTodo = f.dia_todo.checked || (!ini && !fim);
      const falha = msg => { erro.textContent = msg; erro.hidden = false; };
      if (!f.dia.value) return falha('Escolha a data.');
      if (!diaTodo && (ini === undefined || fim === undefined)) return falha('Horário inválido. Use o formato 09:30.');
      if (!diaTodo && ini && fim && minDe(fim) <= minDe(ini)) return falha('O fim precisa ser depois do início.');
      const lembrete = f.lembrete.value === '' ? null : Number(f.lembrete.value);
      const salvo = {
        id: ev.id || novoId(),
        titulo: f.titulo.value.trim(),
        descricao: f.descricao.value.trim(),
        dia: f.dia.value,
        dia_todo: diaTodo,
        hora_inicio: diaTodo ? null : ini,
        hora_fim: diaTodo ? null : fim,
        cor: (form.querySelector('input[name="cor"]:checked') || {}).value || 'azul',
        lembrete_min: lembrete,
        lembrete_lido: ev.lembrete_lido && lembrete === ev.lembrete_min,
      };
      fecharEditor();
      if (raiz && !st.full.aberto) { st.sel = salvo.dia; st.mesMini = null; }
      salvar(revalidarLembrete(salvo));
    });
    setTimeout(() => f.titulo.focus(), 0);
  }
  function fecharEditor() {
    fecharLista();
    if (editorAberto) { editorAberto.remove(); editorAberto = null; }
  }

  // ---------- Notificações ----------
  function renderSinos() {
    const n = notificacoes().length;
    document.querySelectorAll('.ag-sino').forEach(s => {
      const b = s.querySelector('.ag-badge');
      b.hidden = n === 0;
      b.textContent = n > 9 ? '9+' : String(n);
      s.classList.toggle('ag-tem', n > 0);
      s.setAttribute('aria-label', n ? `Notificações: ${n} não lida(s)` : 'Notificações');
    });
    document.title = n ? `(${n}) ${st.tituloPagina}` : st.tituloPagina;
  }

  let popover = null;
  function fecharNotificacoes() {
    if (popover) { popover.remove(); popover = null; }
  }
  function abrirNotificacoes(botao) {
    const mesmo = popover && popover.botao === botao;
    fecharNotificacoes();
    if (mesmo) return;
    const lista = notificacoes();
    const proximos = doDia(hoje()).filter(e => !ehDiaTodo(e) && momentoFim(e).getTime() > Date.now() && !lista.includes(e));
    const linha = ev => `
      <button type="button" class="ag-notif" data-abrir="${esc(ev.id)}">
        <i class="ag-ponto ag-cor-${esc(ev.cor)}"></i>
        <span><b>${esc(ev.titulo || 'Sem título')}</b><small>${esc(`${dataCurta(ev.dia)} · ${rotuloHora(ev)}`)}</small></span>
      </button>`;
    popover = document.createElement('div');
    popover.className = 'ag-pop';
    popover.innerHTML = `
      <div class="ag-pop-topo">
        <strong>Notificações</strong>
        ${lista.length ? '<button type="button" class="ag-link" data-acao="ler-todas">Marcar todas como lidas</button>' : ''}
      </div>
      ${lista.length ? lista.map(linha).join('') : '<p class="ag-vazio">Nenhuma notificação.</p>'}
      ${proximos.length ? `<div class="ag-pop-sub">Ainda hoje</div>${proximos.map(linha).join('')}` : ''}
      ${'Notification' in window && Notification.permission === 'default'
        ? '<button type="button" class="ag-link ag-pop-permissao" data-acao="permissao">Avisar também pelo navegador</button>' : ''}`;
    popover.botao = botao;
    document.body.appendChild(popover);
    const r = botao.getBoundingClientRect();
    const larg = popover.offsetWidth;
    popover.style.top = `${r.bottom + 8}px`;
    popover.style.left = `${limitar(r.right - larg, 8, window.innerWidth - larg - 8)}px`;

    popover.addEventListener('click', async e => {
      const abrir = e.target.closest('[data-abrir]');
      if (abrir) {
        const ev = st.eventos.find(x => x.id === abrir.dataset.abrir);
        fecharNotificacoes();
        if (!ev) return;
        if (lista.includes(ev)) await salvar({ ...ev, lembrete_lido: true });
        abrirEditor({ ...st.eventos.find(x => x.id === ev.id) });
        return;
      }
      const b = e.target.closest('[data-acao]');
      if (!b) return;
      if (b.dataset.acao === 'ler-todas') {
        fecharNotificacoes();
        for (const ev of lista) await salvar({ ...ev, lembrete_lido: true });
      } else if (b.dataset.acao === 'permissao') {
        await Notification.requestPermission();
        b.remove();
      }
    });
  }

  function checarLembretes(silencioso) {
    notificacoes().forEach(ev => {
      if (st.avisados.has(ev.id)) return;
      st.avisados.add(ev.id);
      if (silencioso) return;
      const texto = `${ev.titulo || 'Sem título'} · ${dataCurta(ev.dia)}, ${rotuloHora(ev)}`;
      aviso(texto, 'lembrete', ev.cor);
      if ('Notification' in window && Notification.permission === 'granted') {
        try { new Notification('Agenda — lembrete', { body: texto, tag: `agenda-${ev.id}` }); } catch (e) { /* ignore */ }
      }
    });
    renderSinos();
  }

  // Aviso que some sozinho, no canto da tela.
  function aviso(texto, tipo, cor) {
    let pilha = document.querySelector('.ag-avisos');
    if (!pilha) {
      pilha = document.createElement('div');
      pilha.className = 'ag-avisos';
      pilha.setAttribute('aria-live', 'polite');
      document.body.appendChild(pilha);
    }
    const t = document.createElement('div');
    t.className = `ag-aviso ag-aviso-${tipo}${cor ? ` ag-cor-${cor}` : ''}`;
    t.innerHTML = `${tipo === 'lembrete' ? ico('sino') : tipo === 'ok' ? ico('copiar') : ''}<span>${esc(texto)}</span>`;
    pilha.appendChild(t);
    setTimeout(() => { t.classList.add('ag-saindo'); setTimeout(() => t.remove(), 300); }, tipo === 'lembrete' ? 8000 : 5000);
  }

  // ---------- Geral ----------
  function renderTudo() {
    renderMini();
    renderFull();
    renderSinos();
  }

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (lista) { const dono = lista.dono; fecharLista(); if (dono && dono.focus) dono.focus(); }
    else if (editorAberto) fecharEditor();
    else if (popover) fecharNotificacoes();
    else if (st.full.aberto) fecharTelaCheia();
  });
  document.addEventListener('pointerdown', e => {
    if (popover && !popover.contains(e.target) && !e.target.closest('.ag-sino')) fecharNotificacoes();
    if (lista && !lista.contains(e.target) && !lista.dono.contains(e.target)) fecharLista();
  });

  async function montar(secao, sbClient) {
    raiz = secao;
    st.sb = sbClient || null;
    montarMini();
    renderMini();
    await carregar();
    renderTudo();
    // Lembretes que já estavam vencidos ao abrir só contam no sininho,
    // sem pipocar aviso na tela.
    checarLembretes(true);
    setInterval(() => { checarLembretes(false); atualizarLinhaAgora(); }, 30000);
    // Virou o dia com o painel aberto: "hoje" muda de lugar.
    let diaAtual = hoje();
    setInterval(() => { if (hoje() !== diaAtual) { diaAtual = hoje(); renderTudo(); } }, 60000);
  }

  return { montar };
})();
