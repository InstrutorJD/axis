// Bloqueio de Ctrl+A/C/V/X ligado pelo professor, por turma (aba "Gestão"
// dentro de turmas/<turma>/plataforma.html). Quando ligado, também bloqueia
// clique/seleção em áreas de LEITURA (texto de instrução/enunciado e código
// de exemplo) — o aluno só interage com botões, campos de digitação (Central
// de Dados, desafios de JavaScript etc.) e outros controles reais. Ctrl+A
// selecionava a página inteira (inclusive código de exemplo) e dava pra
// arrastar/copiar o conteúdo mesmo com a página protegida contra clique —
// por isso o atalho de "selecionar tudo" é cortado junto com copiar/colar,
// não só o clique+arrasto nas áreas de leitura.
//
// IMPORTANTE — isso é um desincentivo pedagógico, não segurança de verdade:
// só intercepta copiar/colar DENTRO das páginas do portal. Um aluno pode
// contornar abrindo o DevTools, desativando JS, ou colando em outra janela.
// Não existe forma de um site impedir isso de verdade fora de si mesmo.
//
// Arrastar e soltar texto também é bloqueado junto: com a tela dividida
// (ChatGPT de um lado, portal do outro), dava pra selecionar a resposta na
// outra janela e ARRASTAR até o campo da atividade — isso não passa pelo
// evento 'paste', então escapava do bloqueio de colar.
//
// Provas/atividades avaliativas (as que usam shared/exam-proctor.js) ficam
// SEMPRE bloqueadas, mesmo com "Copiar e Colar" liberado na Gestão —
// PortalExamGuard.create() liga window.__PORTAL_EXAM_LOCK__ e dispara o
// evento 'portal-exam-lock' (ver isBlocked/applyBlockedClass abaixo).
//
// Roda em toda página que o incluir (plataforma de cada turma + cada jogo/
// atividade, já que iframes são documentos separados e não herdam listeners
// do documento pai). Não afeta o professor.
//
// Por rodar em toda página, também é quem carrega o shared/horario-acesso.js
// (portal fechado fora do "Horário de Acesso" da Gestão) — sem precisar pôr
// mais um <script> em cada atividade.
(function () {
  const eu = document.currentScript && document.currentScript.src;
  if (!eu) return;
  const s = document.createElement('script');
  s.src = eu.replace(/clipboard-guard\.js(\?.*)?$/, 'horario-acesso.js');
  (document.head || document.documentElement).appendChild(s);
})();

(async function () {
  if (!window.PortalSession) return;

  // Os bloqueios entram NA HORA, antes de saber quem é o usuário e o que a
  // Gestão diz: conferir o login e consultar o Supabase leva de décimos de
  // segundo a vários segundos (internet da escola), e nesse intervalo dava
  // pra colar. Enquanto não chega a resposta, vale o último estado que este
  // navegador viu pra turma (CHAVE_ESTADO); se a consulta falhar, ele
  // continua valendo (antes, um erro deixava tudo liberado até recarregar).
  const CHAVE_ESTADO = 'axis.clipboard.estado'; // { turma, bloqueado }
  function lerEstado() {
    try { return JSON.parse(localStorage.getItem(CHAVE_ESTADO) || 'null'); } catch (e) { return null; }
  }
  function gravarEstado(turma, bloqueado) {
    try { localStorage.setItem(CHAVE_ESTADO, JSON.stringify({ turma, bloqueado })); } catch (e) { /* bloqueado */ }
  }

  let ativo = true; // vira false pra professor/admin e pra quem não está logado
  let settingBlocked = !!(lerEstado() || {}).bloqueado; // chave "Copiar e Colar" da Gestão
  let toastTimer = null;

  function isBlocked() {
    return ativo && (settingBlocked || window.__PORTAL_EXAM_LOCK__ === true);
  }

  function applyBlockedClass() {
    document.documentElement.classList.toggle('clipboard-guard-blocked', isBlocked());
  }

  // Tags usadas SÓ pra conteúdo de leitura (texto de instrução/enunciado e
  // código de exemplo mostrado como referência) em todo o portal — nunca
  // pra controles interativos, que são sempre <button>, <input>/<textarea>
  // (onde o aluno digita código de verdade: Central de Dados, desafios de
  // JavaScript etc.) ou <div>/<span> com onclick próprio (cards de módulo,
  // alternativas de quiz). Por isso dá pra bloquear clique/seleção nessas
  // tags sem checar seletor específico de cada tipo de atividade.
  const READONLY_SELECTOR = 'p, pre, code, li, td, th, blockquote, dt, dd, h1, h2, h3, h4, h5, h6';
  const INTERACTIVE_SELECTOR = 'button, a, input, textarea, select, label, [contenteditable], [onclick]';

  function isReadOnlyTarget(el) {
    if (!el || typeof el.closest !== 'function') return false;
    if (el.closest(INTERACTIVE_SELECTOR)) return false;
    return !!el.closest(READONLY_SELECTOR);
  }

  // user-select:none é a 1ª linha de defesa (impede até seleção por
  // teclado/mobile); os handlers de mousedown/click abaixo cobrem o que o
  // CSS sozinho não pega e dão o mesmo aviso visual do copiar/colar.
  function injectReadOnlyStyle() {
    if (document.getElementById('__clipboardGuardStyle')) return;
    const style = document.createElement('style');
    style.id = '__clipboardGuardStyle';
    style.textContent = `html.clipboard-guard-blocked :is(${READONLY_SELECTOR}) { user-select: none; -webkit-user-select: none; }`;
    document.head.appendChild(style);
  }

  function onMousedownReadOnly(e) {
    if (!isBlocked() || !isReadOnlyTarget(e.target)) return;
    e.preventDefault(); // corta a seleção por clique+arrasto antes de começar
  }

  function onClickReadOnly(e) {
    if (!isBlocked() || !isReadOnlyTarget(e.target)) return;
    e.preventDefault();
    showToast();
  }

  function showToast() {
    let toast = document.getElementById('__clipboardGuardToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = '__clipboardGuardToast';
      toast.textContent = window.__PORTAL_EXAM_LOCK__ === true
        ? 'Modo prova: copiar, colar, arrastar texto e selecionar tudo estão bloqueados.'
        : 'Copiar/colar, arrastar texto e selecionar tudo desabilitados pelo professor.';
      toast.style.cssText = [
        'position:fixed', 'left:50%', 'bottom:18px', 'transform:translateX(-50%)',
        'background:#1a1a1a', 'color:#f5f5f5', 'font:600 12px system-ui,sans-serif',
        'padding:8px 16px', 'border-radius:4px', 'z-index:2147483647',
        'box-shadow:0 2px 10px rgba(0,0,0,.4)', 'pointer-events:none',
        'opacity:0', 'transition:opacity .15s ease',
      ].join(';');
      document.body.appendChild(toast);
    }
    toast.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 1600);
  }

  function onKeydown(e) {
    if (!isBlocked()) return;
    const key = (e.key || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && (key === 'c' || key === 'v' || key === 'x' || key === 'a')) {
      e.preventDefault();
      e.stopPropagation();
      showToast();
      // Ctrl+A pode ter selecionado algo por outro caminho antes do
      // preventDefault (ex.: repetição de tecla) — limpa a seleção do
      // documento pra garantir que nada fica selecionável pra arrastar.
      if (key === 'a' && window.getSelection) {
        window.getSelection().removeAllRanges();
      }
    }
  }

  // stopPropagation: editores que tratam o colar por conta própria (o
  // Monaco das provas finais, ver shared/code-editor-widget.js) escutam o
  // evento no próprio elemento; sem parar a propagação aqui, na captura do
  // documento, eles ainda recebiam o texto.
  function onClipboardEvent(e) {
    if (!isBlocked()) return;
    e.preventDefault();
    e.stopPropagation();
    showToast();
  }

  // "Pesquisar no Google por…" do menu de botão direito não passa pelo
  // evento 'copy' (é uma ação nativa do navegador que lê a seleção direto)
  // — sem bloquear o menu em si, o aluno contornava o Ctrl+C selecionando
  // o código e pesquisando: o texto selecionado vai inteiro pra barra de
  // busca do Google numa aba nova, sem clipboard-guard nenhum rodando lá,
  // e dá pra copiar dali à vontade.
  // stopPropagation: o Monaco (editor das provas finais) tem um menu de
  // botão direito PRÓPRIO, com "Colar" que lê a área de transferência sem
  // passar pelo evento 'paste' — preventDefault só fechava o menu do
  // navegador, e o do editor abria e colava normalmente.
  function onContextMenu(e) {
    if (!isBlocked()) return;
    e.preventDefault();
    e.stopPropagation();
    showToast();
  }

  // Arrastar texto de OUTRA janela (tela dividida) ou de dentro da própria
  // página até um campo — 'dragover' precisa de preventDefault também, senão
  // alguns navegadores já mostram o cursor de "soltar" e inserem o texto.
  function onDragEvent(e) {
    if (!isBlocked()) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';
    if (e.type === 'drop' || e.type === 'dragstart') showToast();
  }

  document.addEventListener('keydown', onKeydown, true);
  document.addEventListener('dragstart', onDragEvent, true);
  document.addEventListener('dragover', onDragEvent, true);
  document.addEventListener('drop', onDragEvent, true);
  window.addEventListener('portal-exam-lock', applyBlockedClass);
  document.addEventListener('copy', onClipboardEvent, true);
  document.addEventListener('cut', onClipboardEvent, true);
  document.addEventListener('paste', onClipboardEvent, true);
  document.addEventListener('contextmenu', onContextMenu, true);
  document.addEventListener('mousedown', onMousedownReadOnly, true);
  document.addEventListener('click', onClickReadOnly, true);
  injectReadOnlyStyle();
  applyBlockedClass();

  const user = await window.PortalSession.getUser();
  if (!user || user.role === 'professor' || user.role === 'admin') {
    ativo = false;
    applyBlockedClass();
    return;
  }

  // O bloqueio agora é ligado por turma (dentro do portal de cada uma), não mais global.
  const turma = user.turma || 'global';
  const salvo = lerEstado();
  if (!salvo || salvo.turma !== turma) { settingBlocked = false; applyBlockedClass(); } // estado de outra turma (PC compartilhado)

  const sb = window.PortalSession.client();
  if (!sb) return;

  async function fetchState() {
    try {
      const { data, error } = await sb
        .from('classroom_settings')
        .select('clipboard_blocked')
        .eq('id', turma)
        .maybeSingle();
      if (error) return; // sem resposta: mantém o último estado conhecido
      settingBlocked = !!(data && data.clipboard_blocked);
      gravarEstado(turma, settingBlocked);
    } catch (e) {
      return;
    }
    applyBlockedClass();
  }

  function setupRealtime() {
    sb.channel('realtime_classroom_settings_' + turma)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classroom_settings', filter: `id=eq.${turma}` }, fetchState)
      .subscribe();
  }

  fetchState();
  setupRealtime();
})();
