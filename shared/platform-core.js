// Motor genérico da plataforma de ensino — compartilhado por TODAS as turmas.
//
// Cada turmas/<turma>/plataforma.html só precisa:
//   1) definir o tema (cores) num <style>,
//   2) definir window.TURMA_CONFIG com o rótulo da turma e suas trilhas/módulos,
//   3) incluir, nessa ordem: supabase-js, shared/supabase-config.js,
//      shared/session.js, shared/platform-core.css, o TURMA_CONFIG e por
//      fim este arquivo.
//
// Para criar uma tela/trilha nova numa turma, edite APENAS o TURMA_CONFIG
// daquela turma — este arquivo e as outras turmas não são tocados.
(function () {
  const cfg = window.TURMA_CONFIG;
  if (!cfg) {
    console.error('TURMA_CONFIG não definido — defina-o antes de carregar platform-core.js');
    return;
  }

  // Identidade real vem da sessão do Supabase Auth (ver shared/session.js),
  // não mais de "?user=" na URL — resolvida de forma assíncrona dentro de
  // init(), abaixo, antes de qualquer coisa que dependa dela rodar.
  // currentUser/paramUser continuam existindo como variáveis desta closure
  // (por isso toda função abaixo pode seguir lendo currentUser.role/nome/
  // turma e paramUser como já fazia) — só a ORIGEM da identidade mudou.
  let currentUser = null;
  let paramUser = '';

  const sbClient = window.PortalSession.client();

  let teacherUnlockOverride = false;
  let turmaStudentsCache = []; // alunos ATIVOS da turma (profiles, archived_at is null) — ver turmaStudents()
  let turmaArchivedCache = []; // alunos arquivados da turma (só usado pela seção "Alunos" da Gestão)
  let bimestreDatesCache = {}; // bimestre (1-4) -> {inicio, fim, notas_liberadas} do calendário letivo, definidos pelo professor na Gestão (bimestre_dates), ver trilhaWindow()
  let materiaPesoCache = {}; // materiaKey -> peso das atividades na nota, digitado pelo professor em Gestão → Lançar Notas (materia_pesos), ver pesoMateria()
  let trilhaBimestreCache = {}; // trilhaKey -> bimestre (1-4) atribuído pelo professor na Gestão (trilha_bimestre), ver trilhaWindow() — por TRILHA, não por matéria: a mesma matéria pode ter trilhas em bimestres diferentes
  let trilhaLiberarEmCache = {}; // trilhaKey -> 'YYYY-MM-DD' ("Liberar em" da Gestão, trilha_bimestre.liberar_em): a trilha só aparece pro aluno a partir desse dia, mesmo com o bimestre já em andamento, ver trilhaWindow()
  let openMateriaKey = null; // matéria atualmente aberta na aba Aulas, pra saber o que re-renderizar quando bimestreDatesCache/trilhaBimestreCache muda ao vivo
  // fontMode saiu daqui — a fonte agora é controlada por prefs.fontFamily
  // (4 opções, ver FONT_PRESETS), persistida no banco junto com o resto da
  // personalização. fontScale continua só local (não tem por quê
  // ir pro banco — atalho de acessibilidade rápido, não "identidade visual").
  let a11y = { fontScale: 1 };
  let librasLoadFailed = false; // ver setupVLibras — script de terceiro (vlibras.gov.br) pode ser bloqueado pelo navegador
  let currentGameKey = null;
  const openModuleFrame = {}; // trilhaKey -> bool (módulo aberto)
  let alunoEmRecuperacao = false; // aluno com alguma matéria abaixo de 6,0 no bimestre atual — mostra o card "Recuperação" (ver refreshRecuperacaoStatus)
  let viewingStudentEmail = null; // não-nulo quando o PROFESSOR abriu o Perfil de um aluno (ver openStudentPerfil) — nunca setado pro aluno vendo o próprio
  let examGuardEvents = []; // alertas pendentes (aluno saiu da tela numa atividade/prova protegida — advertência ou bloqueio), um por aluno+atividade — só professor, ver setupExamGuardAlerts()
  let examGuardRealtimeStarted = false;

  // ---------- Personalização do portal (botão de perfil → 🎨 Personalizar)
  // ----------
  // Uma linha por usuário em user_preferences (Supabase), self-service via
  // RLS (ver sql/user-preferences.sql) — carregada uma vez em init() e
  // reaplicada a cada mudança de controle na modal (ver openPersonalizacao).
  let prefs = { fontFamily: 'pixel', accentKey: 'padrao', theme: 'dark', avatarEmoji: '👤', bgPattern: false, cursorKey: 'default', ambientMusic: false, clickSound: false };

  const FONT_PRESETS = {
    pixel:       { label: 'Pixel/Terminal', body: "'JetBrains Mono', monospace", display: "'VT323', monospace" },
    traditional: { label: 'Clássica',       body: "system-ui, -apple-system, sans-serif", display: "system-ui, -apple-system, sans-serif" },
    rounded:     { label: 'Arredondada',    body: "'Quicksand', sans-serif", display: "'Quicksand', sans-serif" },
    serif:       { label: 'Livro',          body: "'Bitter', serif", display: "'Bitter', serif" },
  };
  const FONT_ORDER = ['pixel', 'traditional', 'rounded', 'serif']; // ordem que o botão 🔤 da a11y-bar cicla

  // accent:null = "não sobrescreve nada", mantém a cor original da turma
  // (--green/--green-dim definidos no <style> de cada plataforma.html).
  const ACCENT_PRESETS = {
    padrao:    { label: 'Padrão da turma', accent: null, accentDim: null },
    azul:      { label: 'Azul Elétrico',    accent: '#2f6fed', accentDim: '#1f4fb0' },
    roxo:      { label: 'Roxo Ametista',    accent: '#8b5cf6', accentDim: '#6d3fd1' },
    esmeralda: { label: 'Verde Esmeralda',  accent: '#16a34a', accentDim: '#0f7a37' },
    laranja:   { label: 'Laranja Terracota', accent: '#ea580c', accentDim: '#b8450a' },
    rosa:      { label: 'Rosa Framboesa',   accent: '#db2777', accentDim: '#a81d5c' },
    ciano:     { label: 'Ciano Petróleo',   accent: '#0891b2', accentDim: '#066a85' },
    // fx:'neon' = cor bem saturada + brilho (box/text-shadow) nos botões e
    // títulos do shell, ver :root[data-accent-fx="neon"] no CSS.
    neonVerde: { label: 'Neon Verde',       accent: '#39ff14', accentDim: '#1fae0a', fx: 'neon' },
    neonRosa:  { label: 'Neon Rosa',        accent: '#ff2bd6', accentDim: '#b01a93', fx: 'neon' },
    neonCiano: { label: 'Neon Ciano',       accent: '#00f0ff', accentDim: '#00a6b3', fx: 'neon' },
    neonRoxo:  { label: 'Neon Roxo',        accent: '#b026ff', accentDim: '#7a12b8', fx: 'neon' },
    // anim: a cor vai mudando sozinha (ver syncAccentAnim) — accent fica
    // null porque o valor é calculado a cada passo, não fixo.
    arcoiris:  { label: 'Arco-íris (vai trocando de cor)', accent: null, accentDim: null, fx: 'neon', anim: 'arcoiris',
                 swatch: 'conic-gradient(#ff3b30, #ffb000, #39ff14, #00f0ff, #2f6fed, #b026ff, #ff2bd6, #ff3b30)' },
    aurora:    { label: 'Aurora (verde, azul e roxo)', accent: null, accentDim: null, fx: 'neon', anim: 'aurora',
                 swatch: 'linear-gradient(135deg, #39ff14, #00f0ff, #b026ff)' },
  };

  // Paleta clara única (não varia por turma) — só troca os tokens neutros
  // (fundo/painel/linha/tinta); a cor de destaque continua vindo de
  // ACCENT_PRESETS, escuro ou claro.
  const LIGHT_THEME_VARS = {
    '--bg': '#f5f6f4', '--panel': '#ffffff', '--panel2': '#eef0ec',
    '--line': '#d8dcd3', '--ink': '#1c2418', '--ink-dim': '#5b6b53',
  };

  // Cursores customizados — SVGs pequenos embutidos como data URI (sem
  // arquivo novo, sem CDN), aplicados via <style>*{cursor:...!important}
  // injetado (cobre até elementos que já têm cursor:pointer no CSS deles).
  // trail: o cursor deixa um rastro animado ao mover (ver applyCursorTrail).
  const CURSOR_PRESETS = {
    default: { label: 'Padrão', css: 'auto' },
    seta: {
      label: 'Seta Neon',
      css: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><polygon points='4,2 4,26 11,20 15,28 19,26 15,18 24,18' fill='%237cff3f' stroke='%23052e00' stroke-width='1.5'/></svg>") 4 2, auto`,
    },
    mira: {
      label: 'Mira de Jogo',
      css: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><circle cx='16' cy='16' r='10' fill='none' stroke='%23ff3b30' stroke-width='2.5'/><line x1='16' y1='0' x2='16' y2='9' stroke='%23ff3b30' stroke-width='2.5'/><line x1='16' y1='23' x2='16' y2='32' stroke='%23ff3b30' stroke-width='2.5'/><line x1='0' y1='16' x2='9' y2='16' stroke='%23ff3b30' stroke-width='2.5'/><line x1='23' y1='16' x2='32' y2='16' stroke='%23ff3b30' stroke-width='2.5'/></svg>") 16 16, crosshair`,
    },
    espada: {
      label: 'Espada Pixel',
      css: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><rect x='14' y='2' width='4' height='18' fill='%23d4c86a'/><rect x='10' y='18' width='12' height='4' fill='%236f8368'/><rect x='13' y='22' width='6' height='8' fill='%234a9a2a'/></svg>") 2 2, auto`,
    },
    estrela: {
      label: 'Estrela Mágica',
      css: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><polygon points='16,1 20,12 31,12 22,19 25,30 16,23 7,30 10,19 1,12 12,12' fill='%23d4c86a' stroke='%23a8860a' stroke-width='1'/></svg>") 4 4, auto`,
    },
    pata: {
      label: 'Pata',
      css: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><ellipse cx='16' cy='22' rx='9' ry='7' fill='%237cff3f'/><ellipse cx='7' cy='10' rx='4' ry='5' fill='%237cff3f'/><ellipse cx='16' cy='6' rx='4' ry='5' fill='%237cff3f'/><ellipse cx='25' cy='10' rx='4' ry='5' fill='%237cff3f'/></svg>") 4 4, auto`,
    },
    caveira: {
      label: 'Caveira',
      css: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><ellipse cx='16' cy='13' rx='11' ry='10' fill='%23d9e6d2'/><rect x='8' y='20' width='16' height='8' fill='%23d9e6d2'/><circle cx='11' cy='13' r='3' fill='%2304220a'/><circle cx='21' cy='13' r='3' fill='%2304220a'/><polygon points='16,16 14,20 18,20' fill='%2304220a'/></svg>") 4 4, auto`,
    },
    fantasma: {
      label: 'Fantasma',
      css: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><path d='M4 14 C 4 6, 10 2, 16 2 C 22 2, 28 6, 28 14 L 28 29 L 24 26 L 20 29 L 16 26 L 12 29 L 8 26 L 4 29 Z' fill='%23f4f6fb' stroke='%23555566' stroke-width='1'/><circle cx='12' cy='13' r='2.5' fill='%23222222'/><circle cx='20' cy='13' r='2.5' fill='%23222222'/><ellipse cx='16' cy='20' rx='2' ry='3' fill='%23222222'/></svg>") 4 4, auto`,
    },
    raio: {
      label: 'Raio',
      css: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><polygon points='18,1 5,18 14,18 10,31 27,11 17,11 22,1' fill='%23ffe14d' stroke='%23ff9500' stroke-width='1.2'/></svg>") 18 1, auto`,
    },
    pizza: {
      label: 'Pizza',
      css: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><polygon points='3,3 29,10 10,29' fill='%23ffc94d' stroke='%23c77d1a' stroke-width='2'/><path d='M29 10 L 10 29' stroke='%23c77d1a' stroke-width='4' stroke-linecap='round'/><circle cx='12' cy='12' r='2.5' fill='%23d62828'/><circle cx='19' cy='15' r='2.3' fill='%23d62828'/><circle cx='13' cy='20' r='2.2' fill='%23d62828'/></svg>") 3 3, auto`,
    },
    foguete: {
      label: 'Foguete ✨', trail: 'fogo',
      css: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><g transform='rotate(-45 16 16)'><path d='M16 2 C 22 8, 22 18, 20 22 L 12 22 C 10 18, 10 8, 16 2 Z' fill='%23e8eef5' stroke='%23334455' stroke-width='1'/><circle cx='16' cy='12' r='2.5' fill='%2300c2ff'/><path d='M12 17 L 8 24 L 12 22 Z M20 17 L 24 24 L 20 22 Z' fill='%23ff3b30'/><path d='M13 22 L 16 30 L 19 22 Z' fill='%23ffb000'/></g></svg>") 6 6, auto`,
    },
    varinha: {
      label: 'Varinha Mágica ✨', trail: 'faiscas',
      css: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><line x1='10' y1='10' x2='29' y2='29' stroke='%23352a1a' stroke-width='4' stroke-linecap='round'/><line x1='25' y1='25' x2='29' y2='29' stroke='%23ffffff' stroke-width='4' stroke-linecap='round'/><polygon points='8,0 10,6 16,8 10,10 8,16 6,10 0,8 6,6' fill='%23ffe14d' stroke='%23b8860b' stroke-width='0.8'/></svg>") 8 8, auto`,
    },
    cometa: {
      label: 'Cometa Arco-íris ✨', trail: 'arcoiris',
      css: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><circle cx='8' cy='8' r='6' fill='%23ffffff' stroke='%23ff2bd6' stroke-width='2'/></svg>") 8 8, auto`,
    },
    sabre: {
      label: 'Sabre de Luz ✨', trail: 'luz',
      css: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><line x1='4' y1='4' x2='22' y2='22' stroke='%2300f0ff' stroke-width='6' stroke-linecap='round' opacity='0.45'/><line x1='4' y1='4' x2='22' y2='22' stroke='%23e9ffff' stroke-width='2.5' stroke-linecap='round'/><line x1='22' y1='22' x2='29' y2='29' stroke='%23555555' stroke-width='5' stroke-linecap='round'/><line x1='21' y1='25' x2='25' y2='21' stroke='%23999999' stroke-width='2'/></svg>") 3 3, auto`,
    },
    carretel: {
      label: 'Carretel de Linha 🧵', trail: 'linha',
      css: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><rect x='8' y='7' width='14' height='18' fill='%23d62828'/><path d='M8 10 L22 12 M8 14 L22 16 M8 18 L22 20 M8 22 L22 24' stroke='%238e1414' stroke-width='1'/><rect x='5' y='2' width='20' height='5' rx='1.5' fill='%23c8914f' stroke='%236b4423' stroke-width='1'/><rect x='5' y='25' width='20' height='5' rx='1.5' fill='%23c8914f' stroke='%236b4423' stroke-width='1'/><ellipse cx='15' cy='4.5' rx='2.5' ry='1' fill='%236b4423'/></svg>") 5 2, auto`,
    },
  };
  const CURSOR_ORDER = ['default', 'seta', 'mira', 'espada', 'estrela', 'pata', 'caveira', 'fantasma', 'raio', 'pizza', 'foguete', 'varinha', 'cometa', 'sabre', 'carretel'];

  const AVATAR_EMOJIS = ['👤','🧑‍💻','🎮','🐱','🐶','🦊','🐼','🐸','🦄','🤖','👾','🎲','🏆','⭐','🔥','💎','🌟','🎯','🚀','🛸','👽','🧙','🥷','🎃','😎','🤠','🥸','🐧','🦉','🦖','🍀'];
  const BG_PATTERN_EMOJIS = ['🎮','💻','🕹️','📚','✨','🚀','🎲','🧩','⭐','🔧'];
  let bgEmojiLayoutCache = null; // posições/tamanhos sorteados uma vez por sessão — não recalcula a cada toggle, pra não "piscar"/mudar layout

  // ---------- Alerta estilizado (substitui window.alert nativo, que sai feio
  // e fora do tema) ----------
  function showAlert(message) {
    document.getElementById('pfAlertOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'pfAlertOverlay';
    overlay.className = 'pf-alert-overlay';
    overlay.innerHTML = `
      <div class="pf-alert-box" role="alertdialog" aria-modal="true">
        <p class="pf-alert-msg"></p>
        <button class="btn pf-alert-ok">OK</button>
      </div>
    `;
    overlay.querySelector('.pf-alert-msg').textContent = message;
    document.body.appendChild(overlay);

    function close() {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) {
      if (e.key === 'Escape') close();
    }
    overlay.querySelector('.pf-alert-ok').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    overlay.querySelector('.pf-alert-ok').focus();
  }

  // ---------- Confirmação de arquivar aluno (digitar o nome pra destravar
  // o botão) — arquivar bloqueia o login do aluno até reativar (ver
  // arquivar_aluno() no Supabase), então um clique errado numa lista longa
  // não pode bastar. onConfirm só roda depois do nome bater (comparação
  // sem diferenciar maiúsculas/espaço nas pontas). ----------
  function showArchiveConfirm(nome, onConfirm) {
    document.getElementById('pfArchiveOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'pfArchiveOverlay';
    overlay.className = 'pf-alert-overlay';
    overlay.innerHTML = `
      <div class="pf-alert-box" role="alertdialog" aria-modal="true" style="border-color:var(--blood-bright);">
        <p class="pf-alert-msg">Arquivar <b>${nome}</b>? O login dele para de funcionar e ele some das listas e relatórios da turma. Notas, chamada e progresso já lançados continuam guardados — dá pra reativar depois.</p>
        <p class="pf-alert-msg">Pra confirmar, digite o nome exatamente como aparece: <b>${nome}</b></p>
        <input type="text" class="pf-archive-input" autocomplete="off" spellcheck="false">
        <div style="display:flex; gap:10px; justify-content:flex-end;">
          <button class="btn btn-secondary pf-archive-cancel">Cancelar</button>
          <button class="btn btn-danger pf-archive-ok" disabled>Arquivar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('.pf-archive-input');
    const okBtn = overlay.querySelector('.pf-archive-ok');
    const bate = () => input.value.trim().toLowerCase() === nome.trim().toLowerCase();
    input.addEventListener('input', () => { okBtn.disabled = !bate(); });

    function close() {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    overlay.querySelector('.pf-archive-cancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    okBtn.addEventListener('click', () => {
      if (!bate()) return;
      close();
      onConfirm();
    });
    input.focus();
  }

  // ---------- Notificação leve (toast, não bloqueia a tela) — usada pra
  // avisar o aluno que o professor liberou uma atividade nova, sem
  // interromper o que ele estava fazendo (diferente do showAlert). ----------
  function showToast(title, message) {
    let stack = document.getElementById('pfToastStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'pfToastStack';
      stack.className = 'pf-toast-stack';
      document.body.appendChild(stack);
    }
    const toast = document.createElement('div');
    toast.className = 'pf-toast';
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
      <button class="pf-toast-close" aria-label="Fechar aviso">✕</button>
      <b class="pf-toast-title"></b>
      <span class="pf-toast-msg"></span>
    `;
    toast.querySelector('.pf-toast-title').textContent = title;
    toast.querySelector('.pf-toast-msg').textContent = message;
    stack.appendChild(toast);

    const remove = () => toast.remove();
    toast.querySelector('.pf-toast-close').addEventListener('click', remove);
    setTimeout(remove, 9000);
  }

  // ---------- Shell HTML ----------
  function renderShell() {
    const mount = document.getElementById('app');
    mount.innerHTML = `
      <div class="a11y-bar">
        <div>
          <button id="btnFontStyle" title="Alternar estilo da fonte" aria-label="Alternar estilo da fonte">🔤</button>
          <button id="btnFontSmaller" title="Diminuir fonte" aria-label="Diminuir fonte">A−</button>
          <button id="btnFontBigger" title="Aumentar fonte" aria-label="Aumentar fonte">A+</button>
          <button id="btnLibras" title="Abrir o tradutor de Libras (VLibras)" aria-label="Abrir o tradutor de Libras">🤟</button>
        </div>
        <div id="sessionControl">
          ${currentUser.role === 'professor' && window.PortalSession.appInstalado() ? `<a href="../../professor/painel.html" id="btnVoltarPainel" class="btn-voltar-painel" title="Voltar ao painel do professor">← Painel</a>` : ''}
          <span class="welcome-msg" id="txtWelcome">Bem-vindo(a), <b id="txtUserNom">--</b></span>
          <span class="ranking-badge" id="rankingBadge" style="display:none;"></span>
          <button id="btnLogout" class="btn-danger" style="padding:4px 8px; font-size:10px;">Sair</button>
        </div>
      </div>

      <div class="app-container">
        <div class="tabs" id="mainNavTabs">
          <button class="tab-btn active" data-tab="aulas">Aulas & Atividades</button>
          <button class="tab-btn disabled" id="tabBtnJogos" data-tab="jogos">Jogos 🔒</button>
          <button class="quick-action-btn" id="btnOpenPixelCode" title="Abrir o PixelCode (editor de HTML, CSS e JavaScript, com navegador) numa aba nova">💻 PixelCode</button>
          ${currentUser.role === 'professor' ? `<button class="tab-btn" data-tab="gestao">Gestão 🛠️</button>` : ''}
          <div class="nav-right-group">
            ${currentUser.role === 'professor' ? `<button class="quick-token-btn" id="btnQuickToken" title="Ver/gerar o token de Dar Visto e Pular Etapa">🔑</button>` : ''}
            <button class="tab-btn profile-tab-btn" data-tab="perfil" id="btnPerfilTab" title="Meu perfil e personalização do portal">
              <span id="perfilTabEmoji">${prefs.avatarEmoji || '👤'}</span>
              ${currentUser.role === 'professor' ? `<span class="profile-notif-badge" id="examGuardBadge" style="display:none;"></span>` : ''}
            </button>
          </div>
        </div>

        ${currentUser.role === 'professor' ? `
        <div id="professorTokenOverlay" class="pf-alert-overlay" style="display:none;">
          <div class="pf-alert-box" style="border-color:var(--green-dim); max-width:240px; text-align:center; position:relative; padding-top:28px;">
            <button class="pf-toast-close" id="btnFecharProfessorToken" title="Fechar">✕</button>
            <div id="professorTokenValue" style="font-family:'JetBrains Mono', monospace; font-size:36px; font-weight:800; letter-spacing:6px; margin-bottom:6px;">------</div>
            <div class="status-msg" id="professorTokenStatus"></div>
            <button class="btn btn-secondary" id="btnRenovarProfessorToken" style="margin-top:10px; font-size:12px;" title="Gera um token novo na hora; o anterior deixa de valer">🔄 Renovar token</button>
          </div>
        </div>

        <div id="examGuardOverlay" class="pf-alert-overlay" style="display:none;">
          <div class="pf-alert-box" style="border-color:var(--blood-bright); max-width:480px;">
            <h3 style="margin:0 0 4px; font-size:14px;">🚨 Alertas de saída bloqueada</h3>
            <p style="font-size:11px; color:var(--ink-dim); margin:0 0 14px;">
              O aluno saiu de uma atividade/prova que não podia sair e ficou bloqueado (2ª troca de aba/janela). Decida: libera na hora ou mantém bloqueado até dar o token pessoalmente.
            </p>
            <div id="examGuardList"></div>
            <div style="display:flex; justify-content:flex-end; margin-top:14px;">
              <button class="btn btn-secondary" id="btnFecharExamGuard">Fechar</button>
            </div>
          </div>
        </div>
        ` : ''}

        <div class="viewport-content">
          <div id="tabContentAulas" class="tab-page">
            <div id="materiaSelectorArea">
              <div class="card">
                <div class="aulas-visao" id="aulasVisao" hidden>
                  <button type="button" class="aulas-visao-btn ativo" data-visao="materias" onclick="PortalCore.mudarVisaoAulas('materias')">📚 Matérias</button>
                  <button type="button" class="aulas-visao-btn" data-visao="pendentes" onclick="PortalCore.mudarVisaoAulas('pendentes')">📋 Pendentes <span class="aulas-visao-num" id="pendentesNum"></span></button>
                </div>
                <div id="visaoMaterias">
                  <h2 style="margin:0 0 4px;">Matérias</h2>
                  <p style="font-size:11px; color:var(--ink-dim); margin:0 0 16px;">Escolha uma matéria para ver as trilhas dela.</p>
                  <div class="card-grid" id="materiaCardGrid"></div>
                </div>
                <div id="visaoPendentes" hidden>
                  <h2 style="margin:0 0 4px;">Atividades pendentes</h2>
                  <p style="font-size:11px; color:var(--ink-dim); margin:0 0 16px;">O que ainda falta fazer, em todas as matérias. Clique numa atividade para abrir.</p>
                  <div id="pendentesList"></div>
                </div>
              </div>
            </div>

            <div id="materiaDetailArea" style="display:none;">
              <div class="card module-frame-header">
                <div>
                  <h2 id="materiaDetailTitle" style="margin:0; font-size:18px;">--</h2>
                </div>
                <button class="btn btn-secondary" onclick="PortalCore.closeMateria()">← Voltar</button>
              </div>
              <div class="subtabs" id="aulasSubTabs"><span class="subtab-label">Trilha:</span></div>
              <div id="aulasSubTabPages"></div>
            </div>
          </div>

          <div id="tabContentJogos" class="tab-page" style="display:none;">
            <div id="gameSelector" class="card" style="padding:16px;">
              <h2 style="margin:0 0 4px;">Escolha um Jogo</h2>
              <p style="font-size:11px; color:var(--ink-dim); margin:0 0 16px;">Selecione uma atividade para praticar.</p>
              <div class="card-grid" id="gameCardGrid"></div>
            </div>
            <div id="gameFrameArea" style="display:none; height:100%; flex-direction:column;">
              <div class="card module-frame-header" style="flex-shrink:0;">
                <div>
                  <h2 id="gameFrameTitle" style="margin:0; font-size:18px;">--</h2>
                  <p id="gameFrameDesc" style="font-size:11px; color:var(--ink-dim); margin:4px 0 0 0;"></p>
                </div>
                <button class="btn btn-secondary" onclick="PortalCore.closeGame()">← Voltar</button>
              </div>
              <div class="game-frame-wrapper" style="flex:1; min-height:0; border:1px solid var(--green-dim);">
                <iframe id="gameFrame" src="about:blank"></iframe>
              </div>
            </div>
          </div>

          <div id="tabContentPerfil" class="tab-page" style="display:none;">
            <div class="card">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
                <div>
                  <h2 id="perfilTituloPrincipal" style="margin:0 0 4px;">Meu Progresso</h2>
                  <p id="perfilSubtitulo" style="font-size:11px; color:var(--ink-dim); margin:0 0 16px;">Acompanhe sua jornada em ${cfg.label}.</p>
                </div>
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                  <button class="btn btn-secondary" id="btnAbrirPersonalizacao" title="Personalizar fonte, cores, tema, avatar, fundo e cursor">🎨 Personalizar</button>
                  <button class="btn btn-secondary" id="btnVoltarPerfilAluno" style="display:none;" onclick="PortalCore.closeStudentPerfil()">← Voltar à Gestão</button>
                </div>
              </div>
              <div class="perfil-stats-row" id="perfilResumo"></div>
            </div>

            <div id="perfilProgressoWrap">
              <div class="card">
                <h2 style="margin:0 0 4px;">Progresso por Matéria</h2>
                <p style="font-size:11px; color:var(--ink-dim); margin:0 0 16px;">O quanto você já concluiu em cada matéria e trilha.</p>
                <div id="perfilMaterias"></div>
              </div>

              <div class="card">
                <h2 style="margin:0 0 4px;">Insígnias</h2>
                <p style="font-size:11px; color:var(--ink-dim); margin:0 0 16px;">
                  Cada insígnia é desbloqueada automaticamente conforme seu progresso geral avança — continue concluindo atividades para liberar as próximas.
                </p>
                <div class="badge-grid" id="perfilBadgesGrid"></div>
              </div>
            </div>
          </div>

          <div id="tabContentGestao" class="tab-page" style="display:none;">
            <!-- Substituto (shared/session.js, sql/usuario-substituto.sql): vê a
                 Gestão com as seções .so-professor escondidas (CSS por
                 html[data-substituto], ver platform-core.css). -->
            <div class="card so-substituto substituto-aviso">
              <b>Modo substituto.</b> Você pode liberar/bloquear Copiar e Colar e Jogos, fazer a chamada, dar visto (🔑) e acompanhar os relatórios. As notas aparecem só para consulta.
            </div>
            <div class="card collapsible-card so-professor">
              <div class="collapsible-head" onclick="PortalCore.toggleGestaoSection(this)">
                <h2>Alunos</h2>
                <span class="collapsible-arrow">▶</span>
              </div>
              <div class="collapsible-body">
                <h3 class="gestao-subhead">Alunos da turma</h3>
                <table class="audit-table">
                  <thead><tr><th>Aluno</th><th>E-mail</th><th></th></tr></thead>
                  <tbody id="tblGestaoAlunosBody"></tbody>
                </table>

                <h3 class="gestao-subhead">Alunos arquivados</h3>
                <table class="audit-table">
                  <thead><tr><th>Aluno</th><th>E-mail</th><th>Arquivado em</th><th></th></tr></thead>
                  <tbody id="tblGestaoAlunosArquivadosBody"></tbody>
                </table>
              </div>
            </div>

            <div class="card collapsible-card">
              <div class="collapsible-head" onclick="PortalCore.toggleGestaoSection(this)">
                <h2>Bloqueios e Liberações</h2>
                <span class="collapsible-arrow">▶</span>
              </div>
              <div class="collapsible-body">
                <div class="toggle-row-list">
                  <div class="toggle-row">
                    <div>
                      <div class="toggle-row-label">Copiar e Colar</div>
                      <div class="toggle-row-desc" id="toggleClipboardDesc"></div>
                    </div>
                    <button class="toggle-switch" id="toggleClipboard" role="switch" aria-checked="false"><span class="toggle-switch-knob"></span></button>
                  </div>
                  <div class="toggle-row">
                    <div>
                      <div class="toggle-row-label">Horário de Acesso</div>
                      <div class="toggle-row-desc" id="toggleHorarioDesc"></div>
                      <div class="horario-acesso-campos">
                        <label>das <input type="time" id="horarioAcessoInicio"></label>
                        <label>às <input type="time" id="horarioAcessoFim"></label>
                        <button class="btn" id="btnSalvarHorarioAcesso">Salvar horário</button>
                        <span class="status-msg" id="horarioAcessoStatus"></span>
                      </div>
                    </div>
                    <button class="toggle-switch" id="toggleHorario" role="switch" aria-checked="false" title="Verde = acesso livre a qualquer hora. Vermelho = aluno só entra no horário."><span class="toggle-switch-knob"></span></button>
                  </div>
                  <div class="toggle-row">
                    <div>
                      <div class="toggle-row-label">Jogos</div>
                      <div class="toggle-row-desc" id="toggleJogosDesc"></div>
                    </div>
                    <button class="toggle-switch" id="toggleJogos" role="switch" aria-checked="false"><span class="toggle-switch-knob"></span></button>
                  </div>
                  <div class="toggle-row so-professor">
                    <div>
                      <div class="toggle-row-label">Mostrar Notas</div>
                      <div class="toggle-row-desc" id="toggleNotasDesc"></div>
                    </div>
                    <button class="toggle-switch" id="toggleNotas" role="switch" aria-checked="false"><span class="toggle-switch-knob"></span></button>
                  </div>
                  <div class="toggle-row so-professor">
                    <div>
                      <div class="toggle-row-label">Editar Notas Manuais</div>
                      <div class="toggle-row-desc" id="toggleNotasManuaisDesc">Travado — as notas de matéria em Lançar Notas não podem ser editadas.</div>
                    </div>
                    <button class="toggle-switch" id="toggleNotasManuais" role="switch" aria-checked="false"><span class="toggle-switch-knob"></span></button>
                  </div>
                </div>

                <div class="so-professor">
                <h3 class="gestao-subhead">Bimestres — Início e Fim</h3>
                <table class="audit-table">
                  <thead><tr><th>Bimestre</th><th>Início</th><th>Fim</th><th>Notas</th></tr></thead>
                  <tbody id="tblGestaoBimestresBody"></tbody>
                </table>
                <div style="display:flex; align-items:center; gap:12px; margin:10px 0 16px;">
                  <button class="btn" id="btnSalvarBimestreDatas">Salvar Bimestres</button>
                  <span class="status-msg" id="bimestreDatasStatus"></span>
                </div>

                <h3 class="gestao-subhead">Liberação por Trilha</h3>
                <table class="audit-table">
                  <thead><tr><th>Matéria</th><th>Trilha</th><th>Bimestre</th><th title="Opcional: dia, dentro do bimestre, em que a trilha aparece pro aluno. Vazio = libera no início do bimestre.">Liberar em</th></tr></thead>
                  <tbody id="tblGestaoTrilhasBody"></tbody>
                </table>
                <p style="color:var(--ink-dim); font-size:11px; margin:6px 0 0;">"Liberar em" é opcional: a trilha só aparece pro aluno a partir desse dia, mesmo com o bimestre em andamento. Vazio = libera no início do bimestre.</p>
                <div style="display:flex; align-items:center; gap:12px; margin:10px 0 4px;">
                  <button class="btn" id="btnSalvarTrilhaBimestre">Salvar</button>
                  <span class="status-msg" id="trilhaBimestreStatus"></span>
                </div>
                </div>
              </div>
            </div>

            <div class="card collapsible-card">
              <div class="collapsible-head" onclick="PortalCore.toggleGestaoSection(this)">
                <h2>Chamada e Notas</h2>
                <span class="collapsible-arrow">▶</span>
              </div>
              <div class="collapsible-body">
                <h3 class="gestao-subhead">Chamada</h3>
                <div class="field-row">
                  <div>
                    <label class="field-label" for="chamadaData">Data</label>
                    <input type="date" id="chamadaData">
                  </div>
                </div>
                <table class="audit-table">
                  <thead><tr><th>Aluno</th><th style="width:130px; text-align:center;">Faltou</th></tr></thead>
                  <tbody id="chamadaBody"></tbody>
                </table>
                <div class="chamada-acoes">
                  <button class="btn btn-chamada btn-chamada-finalizar" id="btnFinalizarChamada">✅ Finalizar chamada</button>
                  <span class="status-msg" id="chamadaStatus"></span>
                </div>
                <div id="chamadaResumoBox" class="chamada-resumo-box" style="display:none;">
                  <label class="field-label" for="chamadaResumoTexto">📝 Resumo (copiar e colar)</label>
                  <textarea id="chamadaResumoTexto" class="chamada-resumo-texto" readonly rows="4"></textarea>
                  <div class="chamada-acoes">
                    <button class="btn btn-chamada btn-chamada-copiar" id="btnCopiarResumoChamada">📋 Copiar resumo</button>
                    <span class="status-msg" id="chamadaResumoStatus"></span>
                  </div>
                </div>

                <h3 class="gestao-subhead">Lançar Notas</h3>
                <div class="field-row">
                  <div>
                    <label class="field-label" for="notasBimestre">Bimestre</label>
                    <select id="notasBimestre">
                      <option value="1">1º Bimestre</option>
                      <option value="2">2º Bimestre</option>
                      <option value="3">3º Bimestre</option>
                      <option value="4">4º Bimestre</option>
                    </select>
                  </div>
                </div>
                <div class="toggle-row" style="max-width:420px; border-bottom:none;">
                  <div>
                    <div class="toggle-row-label">Destacar notas abaixo de 6,0</div>
                    <div class="toggle-row-desc">Pinta de vermelho as notas baixas desta tabela.</div>
                  </div>
                  <button class="toggle-switch" id="toggleNotasBaixas" role="switch" aria-checked="false"><span class="toggle-switch-knob"></span></button>
                </div>
                <div class="toggle-row" style="max-width:420px; border-bottom:none;">
                  <div>
                    <div class="toggle-row-label">Destacar notas acima de 8,0</div>
                    <div class="toggle-row-desc">Pinta de verde as notas altas desta tabela.</div>
                  </div>
                  <button class="toggle-switch" id="toggleNotasAltas" role="switch" aria-checked="false"><span class="toggle-switch-knob"></span></button>
                </div>
                <div style="overflow-x:auto;">
                  <table class="audit-table" id="notasTabela">
                    <thead><tr id="notasHead"></tr></thead>
                    <tbody id="notasBody"></tbody>
                  </table>
                </div>
                <div style="display:flex; align-items:center; gap:12px; margin-top:14px;">
                  <button class="btn so-professor" id="btnSalvarNotas">Salvar</button>
                  <span class="status-msg" id="notasStatus"></span>
                </div>
              </div>
            </div>

            <div class="card collapsible-card">
              <div class="collapsible-head" onclick="PortalCore.toggleGestaoSection(this)">
                <h2>Relatórios</h2>
                <span class="collapsible-arrow">▶</span>
              </div>
              <div class="collapsible-body">
                <h3 class="gestao-subhead">Relatório de Presença</h3>
                <div style="display:flex; align-items:flex-end; gap:12px; margin-bottom:10px; flex-wrap:wrap;">
                  <div>
                    <label class="field-label" for="presencaPdfMes">Mês (para o PDF)</label>
                    <input type="month" id="presencaPdfMes">
                  </div>
                  <button class="btn btn-secondary" id="btnGerarPdfPresenca">🖨️ Gerar PDF do Mês</button>
                </div>
                <p style="font-size:11px; color:var(--ink-dim); margin:-4px 0 8px;">Frequência abaixo de 75% no mês:</p>
                <table class="audit-table">
                  <thead><tr><th>Aluno</th><th>Faltas (mês)</th><th>% Presença (mês)</th></tr></thead>
                  <tbody id="presencaBody"></tbody>
                </table>

                <h3 class="gestao-subhead">Relatório de Notas</h3>
                <p style="font-size:11px; color:var(--ink-dim); margin:-4px 0 8px;">Pior desempenho:</p>
                <table class="audit-table">
                  <thead><tr><th>Aluno</th><th>Progresso Geral</th><th>Matérias abaixo de 50%</th></tr></thead>
                  <tbody id="relatorioNotasBody"></tbody>
                </table>
                <div style="display:flex; align-items:center; gap:12px; margin-top:10px;">
                  <button class="btn btn-secondary" id="btnGerarRelatorioNotas">📊 Gerar Relatório Completo</button>
                </div>

                <h3 class="gestao-subhead">Atividade e Inatividade</h3>
                <p style="font-size:11px; color:var(--ink-dim); margin:-4px 0 4px;" id="inatividadeResumo"></p>
                <table class="audit-table">
                  <thead><tr><th>Aluno</th><th>Situação</th><th>Onde está agora</th><th>Há quanto tempo</th><th>Última atualização</th></tr></thead>
                  <tbody id="inatividadeBody"></tbody>
                </table>

                <h3 class="gestao-subhead">Relatório de Atividade do Dia</h3>
                <button class="btn btn-secondary" id="btnGerarAtividadeDia" style="margin-bottom:10px;">📋 Gerar Relatório do Dia</button>
                <div id="atividadeDiaResultado"></div>

                <h3 class="gestao-subhead">Ranking da Turma</h3>
                <button class="btn btn-secondary" id="btnGerarRankingTurma" style="margin-bottom:10px;">🏆 Gerar Ranking da Turma</button>
                <div id="rankingTurmaResultado"></div>

                <div class="so-professor">
                  <h3 class="gestao-subhead">Relatório por Aluno</h3>
                  <p style="font-size:11px; color:var(--ink-dim); margin:-4px 0 8px;">Tempo no portal nos últimos 15 dias e atividades liberadas que ficaram por fazer.</p>
                  <div class="field-row" style="margin-bottom:10px;">
                    <div class="relatorio-aluno-campo">
                      <label class="field-label" for="relatorioAlunoSelect">Aluno</label>
                      <select id="relatorioAlunoSelect"><option value="">— escolha o aluno —</option></select>
                    </div>
                    <button class="btn btn-secondary" id="btnGerarRelatorioAluno">🔎 Gerar Relatório do Aluno</button>
                    <button class="btn btn-secondary" id="btnImprimirRelatorioAluno" disabled>🖨️ Imprimir / PDF</button>
                  </div>
                  <div id="relatorioAlunoResultado"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div vw class="enabled">
        <div vw-access-button class="active"></div>
        <div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>
      </div>
    `;
  }

  // Lista achatada de todas as trilhas da turma, não importa em qual matéria
  // estejam — usada por tudo que não é a navegação em si (progresso, gate
  // de jogos, abrir/fechar módulo, relatório de notas, geração de slides).
  // Trilha keys são únicas na turma inteira, então isso equivale ao antigo
  // cfg.trilhas de antes de existir o nível de matéria.
  function allTrilhas() {
    return (cfg.materias || []).flatMap(m => m.trilhas || []);
  }

  // Matéria "Recuperação" (shared/recuperacao-config.js) — compartilhada
  // pelas turmas e mantida FORA de cfg.materias de propósito: tudo que
  // percorre cfg.materias/allTrilhas() (notas, ranking, Liberação por
  // Trilha, desbloqueio dos jogos) continua ignorando ela. Só a navegação
  // (abrir matéria/módulo, cards, progresso local) usa navTrilhas().
  const recuperacaoMateria = window.RECUPERACAO_MATERIA || null;

  function isRecuperacaoTrilha(trilha) {
    return !!(recuperacaoMateria && (recuperacaoMateria.trilhas || []).includes(trilha));
  }

  function navTrilhas() {
    return allTrilhas().concat(recuperacaoMateria ? (recuperacaoMateria.trilhas || []) : []);
  }

  function findMateria(key) {
    if (recuperacaoMateria && key === recuperacaoMateria.key) return recuperacaoMateria;
    return (cfg.materias || []).find(m => m.key === key) || null;
  }

  // Igual allTrilhas, mas preservando o rótulo da matéria dona — usada pra
  // exibição agrupada ("Liberação por Trilha" em Gestão).
  function allTrilhasComMateria() {
    return (cfg.materias || []).flatMap(m => (m.trilhas || []).map(t => ({ materiaLabel: m.label, trilha: t })));
  }

  // Trilha restrita (trilha.visibleFor) visível pra ESSE e-mail específico —
  // independe de quem está navegando agora (diferente do bypass de professor
  // em trilhaStatus/visibleTrilhas). Usado nos cálculos de %/contagem que
  // percorrem o progresso de um aluno que pode não ser quem está logado
  // (ranking, relatório de notas, Perfil de outro aluno) — sem isso, uma
  // trilha individual conta no denominador de TODO MUNDO, mesmo de quem
  // nunca vai poder vê-la nem completá-la.
  function isTrilhaVisibleToEmail(trilha, email) {
    return !Array.isArray(trilha.visibleFor) || trilha.visibleFor.includes(email);
  }

  // Dentro de UMA matéria, quando esse aluno tem alguma trilha individual
  // (visibleFor) — ex.: "Ponto de Virada (Engel)" dentro de "Projeto de
  // Vida" —, ele deve ser cobrado só pelas trilhas ADAPTADAS pra ele, não
  // pelas trilhas padrão da matéria (que ele nunca vai fazer, por serem
  // conteúdo não-adaptado). Sem isso, o % de conclusão dele nessa matéria
  // ficava diluído pra sempre pelas trilhas padrão (ex.: 2 trilhas
  // adaptadas 100% completas + 5 trilhas padrão 0% = só 28% no total, em
  // vez de 100%). Aluno sem nenhuma trilha individual nessa matéria
  // continua vendo/contando as trilhas compartilhadas normalmente.
  function trilhasParaAluno(trilhas, email) {
    const individuais = trilhas.filter(t => Array.isArray(t.visibleFor) && t.visibleFor.includes(email));
    if (individuais.length > 0) return individuais;
    return trilhas.filter(t => isTrilhaVisibleToEmail(t, email));
  }

  // Mesma ideia, em nível de MATÉRIA (materia.visibleFor) — pra matéria
  // dedicada inteira a um único aluno (ex.: "Comunicação (Engel)"), não só
  // uma trilha dentro de uma matéria compartilhada. Sem isso, o card da
  // matéria (renderMaterias) e o card dela no Perfil (renderPerfilTab)
  // apareceriam — vazios, "Em breve" — pra TODO MUNDO, vazando o nome da
  // matéria (e a existência da adaptação) pros outros alunos da turma.
  function isMateriaVisibleToEmail(materia, email) {
    return !Array.isArray(materia.visibleFor) || materia.visibleFor.includes(email);
  }

  function renderMaterias() {
    const grid = document.getElementById('materiaCardGrid');
    // Igual ao bypass de trilhaStatus: professor sempre vê todas as
    // matérias (pra gerenciar/revisar conteúdo individual), aluno só vê as
    // que não são restritas a outro colega.
    const materias = (cfg.materias || []).filter(m => currentUser.role !== 'aluno' || isMateriaVisibleToEmail(m, paramUser));
    if (materias.length === 0) {
      grid.innerHTML = `<div class="empty-state">Nenhuma matéria cadastrada ainda para esta turma.</div>`;
      return;
    }
    grid.innerHTML = materias.map(m => {
      // "Em breve" também cobre matéria cujas trilhas existem mas ainda não
      // chegaram na data de início — mesmo selo, mesma ideia (nada pra
      // fazer aqui ainda), sem precisar de um rótulo novo.
      const vazia = visibleTrilhas(m.trilhas || []).length === 0;
      return `
        <div class="game-card" onclick="PortalCore.openMateria('${m.key}')">
          <div class="icon">${m.icon || '📚'}</div>
          <h3>${m.label}</h3>
          ${vazia ? '<div class="card-status">Em breve</div>' : ''}
        </div>`;
    }).join('') + recuperacaoCardHtml();
    renderPendentes();
  }

  // Card "Recuperação" no fim do grid de matérias: pro aluno, só quando ele
  // tem 1+ matéria em recuperação (alunoEmRecuperacao); o professor sempre
  // vê, pra revisar o conteúdo.
  function recuperacaoCardHtml() {
    if (!recuperacaoMateria) return '';
    if (currentUser.role === 'aluno' && !alunoEmRecuperacao) return '';
    return `
        <div class="game-card recuperacao-card" id="materiaCardRecuperacao" onclick="PortalCore.openMateria('${recuperacaoMateria.key}')">
          <div class="icon">🛟</div>
          <h3>${recuperacaoMateria.label}</h3>
          ${currentUser.role === 'aluno' ? '' : '<div class="card-status">Só pra quem está em recuperação</div>'}
        </div>`;
  }

  // ---------- Atividades pendentes (só aluno) ----------
  // Visão "📋 Pendentes" da tela de matérias: todo módulo que o aluno ainda
  // não concluiu, de todas as matérias e trilhas que ele enxerga na
  // navegação (mesmos filtros de renderMaterias/renderTrilhasFor, então
  // todo item da lista é alcançável). Com trilha individual (visibleFor),
  // vale trilhasParaAluno: só entra o que é cobrado DELE. Módulo bloqueado
  // por pré-requisito aparece com o cadeado e o nome do que falta, sem
  // clique. A lista fica fora de #materiaCardGrid de propósito (a grade
  // de matérias continua igual).
  function listarPendentes() {
    const materias = (cfg.materias || []).filter(m => isMateriaVisibleToEmail(m, paramUser));
    if (recuperacaoMateria && alunoEmRecuperacao) materias.push(recuperacaoMateria);
    return materias.flatMap(materia =>
      trilhasParaAluno(visibleTrilhas(materia.trilhas || []), paramUser)
        .map(trilha => ({ materia, trilha, modulos: modulosDeEntrega(trilha).filter(m => !isModuleComplete(m)) }))
        .filter(g => g.modulos.length > 0));
  }

  function renderPendentes() {
    const barra = document.getElementById('aulasVisao');
    if (!barra) return;
    if (currentUser.role !== 'aluno') { barra.hidden = true; return; }
    barra.hidden = false;
    const grupos = listarPendentes();
    const total = grupos.reduce((n, g) => n + g.modulos.length, 0);
    document.getElementById('pendentesNum').textContent = total ? `(${total})` : '';
    const lista = document.getElementById('pendentesList');
    if (!total) {
      lista.innerHTML = '<div class="empty-state">🎉 Nenhuma atividade pendente. Você está em dia!</div>';
      return;
    }
    lista.innerHTML = grupos.map(({ materia, trilha, modulos }) => `
      <div class="pendentes-grupo">
        <div class="pendentes-grupo-titulo">${materia.label} › ${trilha.label}</div>
        ${modulos.map(m => {
          const locked = isModuleLocked(trilha, m);
          const anterior = locked ? (trilha.modules || []).find(x => x.key === m.requires) : null;
          const { current, total: passos } = getModuleProgress(m);
          const detalhe = locked ? `🔒 Conclua “${anterior ? anterior.title : 'a atividade anterior'}” antes`
            : current > 0 ? `Em andamento · ${current}/${passos}` : 'Não iniciada';
          const click = locked ? 'disabled' : `onclick="PortalCore.abrirPendente('${materia.key}','${trilha.key}','${m.key}')"`;
          return `
            <button type="button" class="pendente-item${locked ? ' locked' : ''}" ${click}>
              <span class="pendente-icone">${m.icon || '📘'}</span>
              <span class="pendente-texto"><b>${m.title}</b><small>${detalhe}</small></span>
              ${locked ? '' : '<span class="pendente-seta">▶</span>'}
            </button>`;
        }).join('')}
      </div>`).join('');
  }

  function mudarVisaoAulas(visao) {
    document.getElementById('visaoMaterias').hidden = visao !== 'materias';
    document.getElementById('visaoPendentes').hidden = visao !== 'pendentes';
    document.querySelectorAll('.aulas-visao-btn').forEach(b => b.classList.toggle('ativo', b.dataset.visao === visao));
    if (visao === 'pendentes') renderPendentes();
  }

  // Atalho da lista de pendentes: o mesmo caminho que o aluno faria à mão
  // (matéria → trilha → módulo), então "← Voltar" funciona como sempre.
  function abrirPendente(materiaKey, trilhaKey, modKey) {
    openMateria(materiaKey);
    switchAulasSubTab(trilhaKey);
    openModule(trilhaKey, modKey);
  }

  // Mesmo corte do selo "Recuperação" do Perfil (nota < 6,0 numa matéria
  // com trilha no bimestre atual) e só depois que o professor liga "Mostrar
  // Notas" pra esse bimestre — antes disso a nota ainda está sendo lançada
  // e quase todo mundo apareceria "em recuperação" no meio do bimestre.
  async function refreshRecuperacaoStatus() {
    if (!recuperacaoMateria || !sbClient || currentUser.role !== 'aluno') return;
    await Promise.all([fetchBimestreDates(), fetchTrilhaBimestre(), fetchMateriaPesos()]);
    const bimestreAtual = currentBimestreNum();
    let emRecuperacao = false;
    if (bimestreAtual && (bimestreDatesCache[bimestreAtual] || {}).notas_liberadas) {
      const { data } = await sbClient.from('student_module_progress').select('*').eq('turma', cfg.id).eq('student_email', paramUser);
      const materias = (cfg.materias || []).filter(m => (m.trilhas || []).length > 0 && isMateriaVisibleToEmail(m, paramUser));
      const notas = await calcNotasPorMateria(paramUser, bimestreAtual, data || [], materias);
      emRecuperacao = Object.values(notas).some(info => !info.semTrilha && info.nota < 6);
    }
    if (emRecuperacao !== alunoEmRecuperacao) {
      alunoEmRecuperacao = emRecuperacao;
      renderMaterias();
    }
  }

  // Efeito de zoom ao abrir/fechar uma tela (matéria/módulo/jogo — ver
  // openMateria/closeMateria, openModule/closeModule, openGame/closeGame
  // logo abaixo). Três variantes porque a estrutura de cada uma é
  // diferente:
  //  - zoomInScreen: mostra `el` com zoom-in — usado sempre que uma tela
  //    ABRE, nas três (não precisa esperar nada, o el que estava visível
  //    antes já sumiu na hora, igual sempre foi).
  //  - zoomOutOverlay: fecha uma tela que é um OVERLAY por cima do resto
  //    (position:fixed — ver .module-frame-modal), então a tela de baixo
  //    já pode voltar a aparecer na hora; o zoom-out só acontece por cima
  //    dela até sumir de vez.
  //  - zoomOutThenShow: fecha uma tela que troca de LUGAR com outra, sem
  //    ser overlay (matéria: grid <-> detalhe; jogo: grid <-> player) —
  //    aqui as duas são elementos normais (sem position:fixed), então
  //    mostrar a próxima achado da hora faria as duas aparecerem juntas,
  //    empurrando o layout. Só troca depois do zoom-out terminar.
  // offsetWidth força reflow depois de tirar a classe antiga — sem isso,
  // abrir a MESMA tela duas vezes seguidas não reanima (o browser não
  // percebe a classe como "nova" se ela nunca chegou a sair do elemento).
  function zoomInScreen(el, display) {
    el.classList.remove('screen-zoom-out');
    el.style.display = display;
    void el.offsetWidth;
    el.classList.add('screen-zoom-in');
    el.addEventListener('animationend', () => el.classList.remove('screen-zoom-in'), { once: true });
  }

  function zoomOutOverlay(el) {
    el.classList.remove('screen-zoom-in');
    el.classList.add('screen-zoom-out');
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.style.display = 'none';
      el.classList.remove('screen-zoom-out');
    };
    el.addEventListener('animationend', finish, { once: true });
    // Rede de segurança: se a animação nunca disparar de verdade (ex.:
    // prefers-reduced-motion zera a duração pra 0s e alguns navegadores
    // não emitem animationend pra isso), garante que a tela fecha do
    // mesmo jeito depois do tempo esperado.
    setTimeout(finish, 260);
  }

  function zoomOutThenShow(el, nextEl, nextDisplay) {
    el.classList.remove('screen-zoom-in');
    el.classList.add('screen-zoom-out');
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.style.display = 'none';
      el.classList.remove('screen-zoom-out');
      if (nextEl) zoomInScreen(nextEl, nextDisplay);
    };
    el.addEventListener('animationend', finish, { once: true });
    setTimeout(finish, 260);
  }

  function openMateria(key) {
    const materia = findMateria(key);
    if (!materia) return;
    document.getElementById('materiaSelectorArea').style.display = 'none';
    zoomInScreen(document.getElementById('materiaDetailArea'), 'block');
    document.getElementById('materiaDetailTitle').textContent = materia.label;
    openMateriaKey = key;
    const trilhas = renderTrilhasFor(materia);
    if (trilhas.length > 0) switchAulasSubTab(trilhas[0].key);
  }

  function closeMateria() {
    zoomOutThenShow(document.getElementById('materiaDetailArea'), document.getElementById('materiaSelectorArea'), 'block');
    openMateriaKey = null;
    renderPendentes();
    if (typeof window.resumeActivityHeartbeat === 'function') {
      window.resumeActivityHeartbeat('aulas_materias', 'Aulas & Atividades — Escolhendo matéria');
    }
  }

  function renderTrilhasFor(materia) {
    const tabsEl = document.getElementById('aulasSubTabs');
    const pagesEl = document.getElementById('aulasSubTabPages');
    const todasTrilhas = materia.trilhas || [];
    pagesEl.innerHTML = '';
    tabsEl.querySelectorAll('select').forEach(s => s.remove());

    // Trilha futura (inicio ainda não chegou) nem entra aqui pro aluno — é
    // isso que evita a tela lotar conforme o currículo de vários bimestres
    // vai sendo cadastrado adiantado (ver trilhaStatus/visibleTrilhas).
    const trilhas = visibleTrilhasOrdered(materia);

    if (trilhas.length === 0) {
      tabsEl.style.display = 'none';
      const msg = todasTrilhas.length === 0
        ? 'Nenhuma trilha cadastrada ainda nesta matéria.'
        : 'Nenhuma trilha disponível nesta matéria no momento — volte mais perto da data de início.';
      pagesEl.innerHTML = `<div class="empty-state">${msg}</div>`;
      return trilhas;
    }

    // Só faz sentido pedir pra escolher quando há mais de uma trilha. Com 2+,
    // um <select> é mais conciso que uma fileira de botões (1 linha, tátil
    // no celular) — sem precisar de sidebar/hambúrguer pra 2-4 itens. Pro
    // aluno, os <optgroup> (Em atraso / Em aberto / Concluídas) organizam a
    // lista sem precisar de nenhuma tela nova.
    if (trilhas.length > 1) {
      tabsEl.style.display = '';
      const select = document.createElement('select');
      select.id = 'trilhaSelect';
      select.innerHTML = buildTrilhaOptionsHtml(trilhas);
      select.addEventListener('change', () => switchAulasSubTab(select.value));
      tabsEl.appendChild(select);
    } else {
      tabsEl.style.display = 'none';
    }

    trilhas.forEach((trilha, idx) => {
      const page = document.createElement('div');
      page.className = 'subtab-page';
      page.id = `subTabContent_${trilha.key}`;
      page.style.display = idx === 0 ? 'block' : 'none';

      // Selo só quando diz algo além do óbvio: "aberta" é o estado neutro
      // de sempre, não precisa gritar; concluída sim, vale destaque mesmo
      // com o <select> já agrupando por status.
      const status = currentUser.role === 'aluno' ? trilhaStatus(trilha) : 'aberta';
      const statusBadge = status === 'concluida' ? '<span style="color:var(--green);"> · ✅ Concluída</span>' : '';

      // Sem o parágrafo com trilha.desc: os alunos não liam, e ele
      // empurrava os cards dos módulos pra baixo. O campo desc continua no
      // config.js (documenta a trilha pra quem mantém o portal).
      page.innerHTML = `
        <div id="moduleSelector_${trilha.key}" class="card" style="padding:16px;">
          <h2 style="margin:0 0 4px;">Trilha ${trilha.label}${statusBadge}</h2>
          ${rotuloAulaPlano(trilha) ? `<p style="font-size:12px; color:var(--ink-dim); margin:0 0 4px;">📅 ${rotuloAulaPlano(trilha)}</p>` : ''}
          ${trilha.capacidade ? `<p style="font-size:14px; color:var(--yellow); margin:0 0 4px;"><b>Capacidade:</b> ${trilha.capacidade}</p>` : ''}
          <div class="card-grid" style="margin-top:12px;">${buildModuleCardsHtml(trilha)}</div>
        </div>
        <div id="moduleFrameArea_${trilha.key}" class="module-frame-modal" style="display:none;">
          <div class="module-frame-modal-box">
            <div id="moduleFrameHeader_${trilha.key}" class="card module-frame-header">
              <div id="moduleFrameInfo_${trilha.key}">
                <h2 id="moduleFrameTitle_${trilha.key}" style="margin:0; font-size:18px;">--</h2>
                <p id="moduleFrameDesc_${trilha.key}" style="font-size:11px; color:var(--ink-dim); margin:4px 0 0 0;"></p>
              </div>
              <button class="btn btn-secondary" onclick="PortalCore.closeModule('${trilha.key}')">← Voltar</button>
            </div>
            <div id="moduleFrameWrapper_${trilha.key}" class="game-frame-wrapper" style="border:1px solid var(--green-dim);">
              <iframe id="moduleFrame_${trilha.key}" src="about:blank" allow="fullscreen"></iframe>
            </div>
          </div>
        </div>
      `;
      pagesEl.appendChild(page);
    });

    return trilhas;
  }

  function switchAulasSubTab(key) {
    const select = document.getElementById('trilhaSelect');
    if (select && select.value !== key) select.value = key;
    document.querySelectorAll('#aulasSubTabPages .subtab-page').forEach(p => {
      p.style.display = (p.id === `subTabContent_${key}`) ? 'block' : 'none';
    });

    const trilha = navTrilhas().find(t => t.key === key);
    if (trilha && !openModuleFrame[key] && typeof window.reportActivity === 'function') {
      window.reportActivity(`aulas_${key}`, `${trilha.label} — Escolhendo módulo`);
    }
  }

  // ---------- Progresso / desbloqueio de jogos ----------
  function findModule(trilhaKey, modKey) {
    const trilha = navTrilhas().find(t => t.key === trilhaKey);
    return trilha ? (trilha.modules || []).find(m => m.key === modKey) : null;
  }

  // { current, total, completed } — mesma leitura de localStorage usada tanto
  // pro cadeado/card de conclusão quanto pra sincronizar com o Supabase.
  function getModuleProgress(mod) {
    try {
      if (mod.progressMode === 'flag') {
        const data = JSON.parse(localStorage.getItem(`${mod.progressKey}${paramUser}`) || 'null');
        const completed = !!(data && data.completed);
        return { current: completed ? 1 : 0, total: 1, completed };
      }
      const data = JSON.parse(localStorage.getItem(`${mod.progressKey}${paramUser}`) || '[]');
      const current = Array.isArray(data) ? data.length : 0;
      const total = mod.progressTotal || 1;
      return { current, total, completed: current >= total };
    } catch (e) {
      return { current: 0, total: mod.progressTotal || 1, completed: false };
    }
  }

  function isModuleComplete(mod) {
    return getModuleProgress(mod).completed;
  }

  const BIMESTRE_NUMS = [1, 2, 3, 4];
  const BIMESTRE_LABELS = { 1: '1º Bimestre', 2: '2º Bimestre', 3: '3º Bimestre', 4: '4º Bimestre' };

  // A matéria dona de uma trilha — trilha keys são únicas na turma inteira
  // (ver allTrilhas), então a busca é sempre inequívoca. Usada só pra
  // exibição (coluna "Matéria" da tabela de Gestão), não pra decidir
  // visibilidade — isso é por TRILHA (ver trilhaWindow abaixo), já que a
  // mesma matéria pode ter trilhas em bimestres diferentes.
  function materiaOfTrilha(trilhaKey) {
    return (cfg.materias || []).find(m => (m.trilhas || []).some(t => t.key === trilhaKey)) || null;
  }

  // Janela [inicio, fim] em que uma trilha fica visível/liberada: o
  // bimestre atribuído a ELA (Gestão → Bloqueios e Liberações →
  // "Liberação por Trilha", trilhaBimestreCache) cruzado com o calendário
  // de bimestres (bimestreDatesCache). Trilha sem bimestre atribuído (ou
  // bimestre sem datas cadastradas) não tem janela — fica sempre
  // visível/aberta, mesma filosofia de "sem período = sempre visível" de
  // antes. Por trilha, não por matéria: duas trilhas da mesma matéria podem
  // pertencer a bimestres diferentes (currículo que se repete/continua).
  // "Liberar em" (trilhaLiberarEmCache) adia o INÍCIO pra um dia dentro do
  // bimestre — vale a data mais tarde entre as duas, então a trilha não
  // fica disponível o bimestre inteiro e o aluno não adianta os colegas.
  //
  // Trilha vinda do plano de ensino (tem `dataAula` no config.js, ou
  // `exigeLiberacao: true`) é diferente: ela NÃO nasce visível. Enquanto o
  // professor não preencher o "Liberar em" dela, a janela começa em
  // AGUARDANDO_LIBERACAO (um dia que nunca chega) — fica "futura": o aluno
  // não vê, não conta em %/ranking/Perfil/desbloqueio dos jogos, e o
  // professor continua vendo para revisar.
  const AGUARDANDO_LIBERACAO = '9999-12-31';
  function exigeLiberacao(trilha) {
    return !!(trilha && (trilha.exigeLiberacao === true || (trilha.dataAula && trilha.exigeLiberacao !== false)));
  }
  function trilhaWindow(trilha) {
    const bimestreNum = trilhaBimestreCache[trilha.key];
    const b = bimestreNum && bimestreDatesCache[bimestreNum];
    const inicioBimestre = (b && b.inicio) || null;
    const liberarEm = trilhaLiberarEmCache[trilha.key] || (exigeLiberacao(trilha) ? AGUARDANDO_LIBERACAO : null);
    const inicio = [inicioBimestre, liberarEm].filter(Boolean).sort().pop() || null;
    return { inicio, fim: (b && b.fim) || null };
  }

  // Passou do FIM DO BIMESTRE da matéria dona da trilha — a trilha inteira
  // desaparece da aba Aulas pra TODO MUNDO (ver visibleTrilhas), inclusive
  // o professor: o bimestre em si já fechou, não faz mais sentido nem
  // revisar o conteúdo por lá.
  function isTrilhaBimestreEncerrado(trilha) {
    const { fim } = trilhaWindow(trilha);
    return !!(fim && fim < todayStr());
  }

  // Trilha do bimestre ATUAL: a janela dela (trilhaWindow) contém hoje.
  // Trilha sem bimestre atribuído (ou bimestre sem datas) conta sempre,
  // mesma filosofia de "sem período = sempre visível". É a base do
  // "recomeça do zero a cada bimestre": % de matéria e Progresso Geral do
  // Perfil, insígnias, ranking da turma e desbloqueio dos jogos só olham
  // estas trilhas — as de bimestres passados (ou futuros) não entram.
  // Entre um bimestre e outro, nenhuma trilha com bimestre fica "atual".
  function trilhaNoPeriodoAtual(trilha) {
    const { inicio, fim } = trilhaWindow(trilha);
    const hoje = todayStr();
    return !(inicio && inicio > hoje) && !(fim && fim < hoje);
  }

  // trilhasParaAluno (individuais × padrão) só entre as trilhas do bimestre
  // atual — filtra o período ANTES, pra uma trilha individual de um
  // bimestre passado não esconder as trilhas padrão do bimestre de agora.
  function trilhasAtuaisParaAluno(trilhas, email) {
    return trilhasParaAluno(trilhas.filter(trilhaNoPeriodoAtual), email);
  }

  // Busca inicial do calendário (bimestre_dates + trilha_bimestre, ver
  // setupRBAC). Quem calcula algo "do bimestre atual" logo no carregamento
  // (ranking, Perfil, relatórios) espera por ela — sem isso, com o cache
  // ainda vazio, toda trilha pareceria "sem bimestre" e as de bimestres
  // passados entrariam na conta.
  let calendarioCarregado = Promise.resolve();

  // Classifica uma trilha pra organizar a tela do aluno conforme o currículo
  // cresce (bimestre a bimestre) sem precisar de um "bimestre ativo"
  // configurado à parte — só usa a janela da matéria dona (trilhaWindow)
  // contra o dia de hoje:
  //  'futura'    -> o bimestre (ou o "Liberar em") da trilha ainda não chegou (nem aparece pro aluno)
  //  'concluida' -> todos os módulos já foram concluídos (some pro grupo recolhido)
  //  'aberta'    -> o normal (matéria sem bimestre atribuído, ou dentro da janela)
  // Trilha cuja matéria não tem bimestre atribuído sempre cai em 'aberta'
  // (ou 'concluida' se já terminada) — mesmo comportamento de antes dessas
  // datas existirem. O FIM da janela não entra aqui: passado o fim, a trilha
  // já nem chega a ser avaliada (ver isTrilhaBimestreEncerrado/visibleTrilhas).
  function trilhaStatus(trilha) {
    const hoje = todayStr();
    // Trilha restrita a alunos específicos (trilha.visibleFor, array de
    // e-mails/usernames) — pra atividade individual (ex.: material
    // adaptado pra um aluno) sem criar mecanismo novo: reaproveita o
    // status 'futura' (esconde do aluno de fora da lista, sempre visível
    // pro professor, e já sai de fora do gate de allModulesComplete()
    // pra não travar o resto da turma por algo que não pode nem ver).
    if (currentUser.role === 'aluno' && Array.isArray(trilha.visibleFor) && !trilha.visibleFor.includes(paramUser)) {
      return 'futura';
    }
    const { inicio } = trilhaWindow(trilha);
    if (inicio && inicio > hoje) return 'futura';
    const modules = trilha.modules || [];
    if (modules.length > 0 && modules.every(isModuleComplete)) return 'concluida';
    return 'aberta';
  }

  // Trilha com o BIMESTRE encerrado some pra TODO MUNDO, sem exceção pro
  // professor (diferente do filtro de 'futura' logo abaixo) — ver
  // isTrilhaBimestreEncerrado. Só depois disso é que entra o filtro de
  // 'futura', esse sim só pro aluno — o professor sempre vê trilha 'futura',
  // pra poder revisar/gerenciar conteúdo já cadastrado antes da data de
  // início (mesma lógica de bypass que já vale pra cadeado de pré-requisito).
  function visibleTrilhas(trilhas) {
    const emBimestre = trilhas.filter(t => !isTrilhaBimestreEncerrado(t));
    if (currentUser.role !== 'aluno') return emBimestre;
    return emBimestre.filter(t => trilhaStatus(t) !== 'futura');
  }

  // Ordena as trilhas visíveis (concluída por último) só pro aluno — o
  // professor continua vendo na ordem original do config.js, já que
  // "concluída" aqui reflete o progresso de QUEM ESTÁ LOGADO, e não faria
  // sentido pro professor.
  function visibleTrilhasOrdered(materia) {
    const trilhas = visibleTrilhas(materia.trilhas || []);
    if (currentUser.role !== 'aluno') return trilhas;
    const ordem = { aberta: 0, concluida: 1 };
    return trilhas.slice().sort((a, b) => ordem[trilhaStatus(a)] - ordem[trilhaStatus(b)]);
  }

  const TRILHA_GROUP_LABEL = { aberta: '🟢 Em aberto', concluida: '✅ Concluídas' };

  // <select> agrupado por status (<optgroup>) só pro aluno — nativo, então
  // continua leve/tátil no celular mesmo com o currículo de vários
  // bimestres somado. Professor vê a lista simples de sempre.
  function buildTrilhaOptionsHtml(trilhas) {
    if (currentUser.role !== 'aluno') {
      return trilhas.map(t => `<option value="${t.key}">${t.label}</option>`).join('');
    }
    const grupos = { aberta: [], concluida: [] };
    trilhas.forEach(t => grupos[trilhaStatus(t)].push(t));
    return ['aberta', 'concluida']
      .filter(status => grupos[status].length > 0)
      .map(status => `<optgroup label="${TRILHA_GROUP_LABEL[status]}">${
        grupos[status].map(t => `<option value="${t.key}">${t.label}</option>`).join('')
      }</optgroup>`)
      .join('');
  }

  // Todo o progresso já salvo no Supabase pro aluno logado, pra
  // syncAllModulesProgress saber se o localStorage local está desatualizado
  // ANTES de sincronizar — ver isLocalBehindRemote logo abaixo.
  async function fetchRemoteModuleProgress() {
    if (!sbClient || currentUser.role !== 'aluno' || !paramUser) return {};
    try {
      const { data } = await sbClient.from('student_module_progress')
        .select('trilha_key, module_key, progress_current, completed')
        .eq('turma', cfg.id).eq('student_email', paramUser);
      const map = {};
      (data || []).forEach(r => { map[`${r.trilha_key}::${r.module_key}`] = r; });
      return map;
    } catch (e) {
      return {};
    }
  }

  // O remoto só pode estar "na frente" do local quando o navegador chega
  // com o localStorage zerado/desatualizado (troca de máquina, cache
  // limpo, primeiro login da conta real pós-migração pro Supabase Auth) —
  // nesse caso o remoto já reflete um progresso de verdade que o aluno
  // fez em outro momento/dispositivo. Sem essa checagem, syncModuleProgress
  // sobrescrevia esse progresso remoto com o zero local, apagando conclusões
  // reais (foi exatamente o que aconteceu com alguns alunos na migração).
  function isLocalBehindRemote(local, remote) {
    if (!remote) return false;
    if (remote.completed && !local.completed) return true;
    return (remote.progress_current || 0) > local.current;
  }

  // Manda o progresso local (localStorage) pro Supabase, pra o painel do
  // professor conseguir calcular % de desempenho por trilha nos relatórios
  // — sem isso, esse dado nunca sai do navegador do aluno. remoteMap
  // (opcional, ver syncAllModulesProgress) evita regredir um progresso
  // remoto mais avançado; sem ele (chamada avulsa ao fechar UM módulo, onde
  // o local É a ação que acabou de acontecer) sincroniza direto, como antes.
  async function syncModuleProgress(trilha, mod, remoteMap) {
    if (!sbClient || currentUser.role !== 'aluno' || !paramUser) return;
    // Recuperação fica fora de student_module_progress (que alimenta
    // ranking/relatórios/% por matéria) — o estado dela já sobe pra
    // student_activity_state via shared/progress-sync.js, o que basta pra
    // não perder progresso trocando de computador.
    if (isRecuperacaoTrilha(trilha)) return;
    const { current, total, completed } = getModuleProgress(mod);
    if (remoteMap && isLocalBehindRemote({ current, completed }, remoteMap[`${trilha.key}::${mod.key}`])) return;
    try {
      await sbClient.from('student_module_progress').upsert({
        student_email: paramUser,
        student_name: currentUser.nome,
        turma: cfg.id,
        trilha_key: trilha.key,
        module_key: mod.key,
        progress_current: current,
        progress_total: total,
        completed,
        updated_at: new Date().toISOString()
      }, { onConflict: 'student_email,trilha_key,module_key' });
    } catch (e) {
      // progresso sincronizado é best-effort: nunca deve travar a experiência do aluno
    }
  }

  // Devolve a Promise de cada upsert (não só dispara e esquece) — quem
  // chama (syncAllModulesProgressSafely) precisa poder esperar isso
  // terminar de verdade antes de reler o ranking, senão o badge acaba lendo
  // student_module_progress ANTES do fetchRemoteModuleProgress()+upserts
  // acima completarem (a corrida existia mesmo antes desta função ganhar o
  // fetch extra, mas ele deixou a janela grande o bastante pra aparecer).
  async function syncAllModulesProgress() {
    const remoteMap = await fetchRemoteModuleProgress();
    const syncs = [];
    allTrilhas().forEach(trilha => {
      (trilha.modules || []).forEach(mod => syncs.push(syncModuleProgress(trilha, mod, remoteMap)));
    });
    await Promise.all(syncs);
  }

  // Mesma comparação de shared/progress-sync.js (isRemoteFurtherAlong lá) —
  // cobre os dois formatos de estado usados pelas atividades: objeto
  // {lastStepIndex, correctCount, completed} (teoria) e array de ids
  // concluídos (prática).
  function isRemoteProgressFurtherAlong(remote, localRaw) {
    if (remote == null) return false;
    let local = null;
    try { local = localRaw ? JSON.parse(localRaw) : null; } catch (e) {}
    if (Array.isArray(remote)) {
      const localLen = Array.isArray(local) ? local.length : 0;
      return remote.length > localLen;
    }
    if (typeof remote === 'object') {
      if (local == null) return true;
      if (!!remote.completed !== !!local.completed) return !!remote.completed;
      return (remote.lastStepIndex || 0) > (local.lastStepIndex || 0);
    }
    return false;
  }

  // Antes de mandar o progresso local pro Supabase (syncAllModulesProgress),
  // busca o estado bruto de cada atividade (student_activity_state, já
  // mantido ao vivo por shared/progress-sync.js dentro de cada módulo) e
  // adota o remoto sempre que ele estiver MAIS avançado que o local. Sem
  // isso, abrir o portal num navegador/dispositivo sem esse progresso local
  // (aluno trocou de máquina, cache limpo, sessão nova) sobrescrevia a
  // conclusão já salva no servidor com "não concluído" — só corrigia depois
  // que o aluno abria aquele módulo específico e clicava "Voltar" de novo.
  async function hydrateLocalProgressFromRemote() {
    if (!sbClient || currentUser.role !== 'aluno' || !paramUser) return;
    const modules = navTrilhas().flatMap(t => t.modules || []);
    if (!modules.length) return;
    try {
      const { data } = await sbClient.from('student_activity_state').select('progress_key, state').eq('student_email', paramUser);
      if (!data || !data.length) return;
      const remoteByKey = {};
      data.forEach(r => { remoteByKey[r.progress_key] = r.state; });
      modules.forEach(mod => {
        const activityLocation = (mod.progressKey || '').replace(/_progress_$/, '');
        if (!(activityLocation in remoteByKey)) return;
        const localKey = `${mod.progressKey}${paramUser}`;
        if (isRemoteProgressFurtherAlong(remoteByKey[activityLocation], localStorage.getItem(localKey))) {
          localStorage.setItem(localKey, JSON.stringify(remoteByKey[activityLocation]));
        }
      });
    } catch (e) {
      // hidratação é best-effort: se falhar, segue com o que já tinha localmente
    }
  }

  async function syncAllModulesProgressSafely() {
    await hydrateLocalProgressFromRemote();
    refreshAllModuleCards();
    checkGamesUnlock();
    await syncAllModulesProgress();
  }

  // Por que um módulo está travado (ou null, se não estiver) — motivo
  // separado do boolean isModuleLocked() abaixo pra dar pra mostrar uma
  // mensagem diferente pra cada caso (buildModuleCardsHtml) sem duplicar a
  // regra em dois lugares.
  //  'requires' -> o módulo pré-requisito (mod.requires) ainda não foi
  //                concluído.
  function moduleLockReason(trilha, mod) {
    if (currentUser.role === 'professor') return null;
    if (!mod.requires) return null;
    const requiredMod = (trilha.modules || []).find(m => m.key === mod.requires);
    return (requiredMod && !isModuleComplete(requiredMod)) ? 'requires' : null;
  }

  function isModuleLocked(trilha, mod) {
    return moduleLockReason(trilha, mod) !== null;
  }

  function buildModuleCardsHtml(trilha) {
    const modules = trilha.modules || [];
    if (!modules.length) return `<div class="empty-state">Nenhum módulo cadastrado ainda em "${trilha.label}".</div>`;

    return modules.map(m => {
      const locked = isModuleLocked(trilha, m);
      const done = isModuleComplete(m);
      const statusLabel = locked ? '🔒 Bloqueado' : done ? '✅ Concluído' : '';
      const classes = 'game-card' + (locked ? ' locked' : '') + (done ? ' completed' : '');
      const click = locked ? '' : `onclick="PortalCore.openModule('${trilha.key}','${m.key}')"`;
      // Descrição do módulo não aparece mais aqui (poluía a grade de
      // seleção) — continua disponível assim que o módulo abre, em
      // #moduleFrameDesc_<trilha> (ver openModule), então nenhuma
      // informação se perde, só sai da tela de escolha.
      return `
        <div class="${classes}" ${click}>
          <div class="icon">${m.icon || '📘'}</div>
          <h3>${m.title}</h3>
          ${statusLabel ? `<div class="card-status">${statusLabel}</div>` : ''}
        </div>`;
    }).join('');
  }

  // Só exige o que é do bimestre ATUAL — trilha 'futura' (bimestre seguinte,
  // ainda não começou) não pode travar o desbloqueio dos jogos por algo que
  // o aluno nem tem como ter feito ainda, e trilha de bimestre já
  // encerrado (sumiu da aba Aulas) também não: a cada bimestre, recomeça.
  // Módulos de uma trilha que contam como tarefa do aluno. Trilha/módulo com
  // semEntrega:true (ex.: simulações feitas em sala e o material do
  // professor no card Projetos da turma Jogos) continua aparecendo na aba
  // Aulas, mas fica fora de TODA conta: desbloqueio dos jogos, % de
  // progresso, ranking, Perfil e "fez tudo/parte/nada". Sem isso, o
  // material só do professor (que aluno nem consegue concluir) travava a
  // aba Jogos da turma inteira.
  function modulosDeEntrega(t) {
    if (t.semEntrega) return [];
    return (t.modules || []).filter(m => !m.semEntrega);
  }

  function allModulesComplete() {
    const modules = allTrilhas()
      .filter(t => trilhaNoPeriodoAtual(t) && trilhaStatus(t) !== 'futura')
      .flatMap(modulosDeEntrega);
    if (modules.length === 0) return false;
    return modules.every(isModuleComplete);
  }

  // Entre um bimestre e outro (calendário cadastrado, mas hoje fora de
  // qualquer bimestre — férias, recesso): não há trilha nenhuma pra
  // concluir, então os jogos ficam abertos pra todo mundo.
  function entreBimestres() {
    const temCalendario = BIMESTRE_NUMS.some(n => (bimestreDatesCache[n] || {}).inicio);
    return temCalendario && currentBimestreNum() === null;
  }

  function checkGamesUnlock() {
    const isUnlocked = allModulesComplete() || entreBimestres() || teacherUnlockOverride || currentUser.role === 'professor';
    const btnJogos = document.getElementById('tabBtnJogos');

    if (isUnlocked) {
      btnJogos.classList.remove('disabled');
      btnJogos.textContent = 'Jogos 🎮';
      btnJogos.removeAttribute('title');
    } else {
      btnJogos.classList.add('disabled');
      btnJogos.textContent = 'Jogos 🔒';
      // não depende só do cadeado/opacidade pra passar a mensagem — leitor de tela também explica o porquê.
      btnJogos.title = 'Bloqueado: conclua as atividades ou aguarde a liberação do professor.';
    }

    // O cadeado do botão já reage sozinho (acima), mas se o aluno JÁ ESTIVER
    // dentro de um jogo (currentGameKey setado — inclusive QuizRush, é só
    // mais um valor desse mesmo estado) quando o acesso é revogado em tempo
    // real (override do professor, ou uma nova liberação diária que passa a
    // exigir um módulo ainda não concluído), o jogo continuava rodando até o
    // aluno fechar/recarregar sozinho. Centralizado aqui (não só em
    // fetchTeacherOverride) porque qualquer chamada de checkGamesUnlock()
    // pode ser a que descobre a virada unlocked→locked.
    if (!isUnlocked && currentGameKey) {
      closeGame();
      showToast('🔒 Jogos bloqueados', 'O professor bloqueou o acesso aos jogos e você foi retirado do jogo em andamento.');
      // closeGame() só troca a TELA (jogo → seletor de jogos) — sozinho,
      // isso deixaria o aluno ainda DENTRO da aba Jogos, livre pra escolher
      // outro jogo da lista. switchTab('aulas') tira ele da aba de vez; é
      // seguro chamar aqui porque switchTab() chama checkGamesUnlock() nesse
      // meio-tempo (currentGameKey já está null pelo closeGame() acima), então
      // a chamada aninhada não re-entra nesse mesmo bloco.
      switchTab('aulas');
    }

    return isUnlocked;
  }

  async function fetchTeacherOverride() {
    if (!sbClient) return;
    const { data } = await sbClient
      .from('student_overrides')
      .select('games_unlocked')
      .eq('student_email', paramUser)
      .maybeSingle();
    teacherUnlockOverride = !!(data && data.games_unlocked);
    checkGamesUnlock();
  }

  function setupOverrideRealtime() {
    if (!sbClient) return;
    sbClient.channel('realtime_student_override_' + paramUser)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_overrides', filter: `student_email=eq.${paramUser}` }, () => fetchTeacherOverride())
      .subscribe();
  }

  // Quando o professor clica em "Salvar" em Lançar Notas (Gestão), o
  // aluno que estiver com a aba Perfil aberta vê a "NOTA" de cada matéria
  // atualizar na hora, sem precisar recarregar — renderPerfilTab() já lê
  // nota3/nota4 de `grades` (ver comentário ali), só faltava reagir a uma
  // mudança que chega depois da tela já estar aberta. Filtra pelo PRÓPRIO
  // e-mail (mesma ideia de setupOverrideRealtime) — só interessa a MINHA
  // linha de notas, não a da turma inteira.
  function setupGradesRealtime() {
    if (!sbClient) return;
    sbClient.channel('realtime_grades_' + paramUser)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grades', filter: `student_email=eq.${paramUser}` }, () => {
        renderPerfilTab();
        refreshRecuperacaoStatus();
      })
      .subscribe();
  }

  // Refaz os cards de módulo de qualquer trilha que já esteja renderizada
  // na tela — usado depois que o cadeado de uma trilha muda ou uma
  // liberação diária chega, pra refletir sem precisar recarregar a página.
  function refreshAllModuleCards() {
    navTrilhas().forEach(trilha => {
      const grid = document.querySelector(`#moduleSelector_${trilha.key} .card-grid`);
      if (grid) grid.innerHTML = buildModuleCardsHtml(trilha);
    });
    renderPendentes();
  }

  // Refaz tudo que depende de bimestreDatesCache/trilhaBimestreCache pra
  // refletir uma mudança ao vivo (o professor editou datas/atribuições em
  // outra aba, ou o próprio salvamento local) — compartilhado por
  // fetchBimestreDates() e fetchTrilhaBimestre() abaixo, já que os dois
  // afetam a mesma coisa (quais trilhas aparecem, e com qual status).
  function refreshTrilhaVisibilityUI() {
    refreshAllModuleCards();
    renderMaterias();
    checkGamesUnlock();
    // Refaz o <select> de trilha da matéria que o aluno tem aberta agora,
    // preservando a trilha selecionada quando ela continua visível — sem
    // isso, o card de módulos ficaria com o status desatualizado até a
    // próxima vez que a matéria fosse reaberta.
    if (openMateriaKey) {
      const materia = findMateria(openMateriaKey);
      if (materia) {
        const selecionadaAntes = document.getElementById('trilhaSelect')?.value;
        const trilhas = renderTrilhasFor(materia);
        if (selecionadaAntes && trilhas.some(t => t.key === selecionadaAntes)) switchAulasSubTab(selecionadaAntes);
      }
    }
  }

  async function fetchBimestreDates() {
    if (!sbClient) return;
    const { data } = await sbClient.from('bimestre_dates').select('*').eq('turma', cfg.id);
    bimestreDatesCache = {};
    (data || []).forEach(r => { bimestreDatesCache[r.bimestre] = { inicio: r.inicio, fim: r.fim, notas_liberadas: !!r.notas_liberadas, fechado: !!r.fechado }; });
    refreshTrilhaVisibilityUI();
  }

  function setupBimestreDatesRealtime() {
    if (!sbClient) return;
    sbClient.channel('realtime_bimestre_dates_' + cfg.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bimestre_dates', filter: `turma=eq.${cfg.id}` }, () => {
        fetchBimestreDates();
        // "Mostrar Notas" (notas_liberadas) mora nessa mesma tabela — quando
        // o professor liga/desliga em outra aba, o aluno com o Perfil já
        // aberto precisa ver a NOTA aparecer/sumir sem recarregar (mesma
        // ideia de setupGradesRealtime). Só chamado aqui, no handler do
        // Realtime — nunca dentro de fetchBimestreDates() em si, senão a
        // própria renderPerfilTab() (que já chama fetchBimestreDates() pra
        // ler o bimestre atual) entraria num loop chamando a si mesma.
        if (currentUser.role === 'aluno') {
          renderPerfilTab();
          refreshRecuperacaoStatus();
        }
      })
      .subscribe();
  }

  async function fetchTrilhaBimestre() {
    if (!sbClient) return;
    const { data } = await sbClient.from('trilha_bimestre').select('*').eq('turma', cfg.id);
    trilhaBimestreCache = {};
    trilhaLiberarEmCache = {};
    (data || []).forEach(r => {
      trilhaBimestreCache[r.trilha_key] = r.bimestre;
      if (r.liberar_em) trilhaLiberarEmCache[r.trilha_key] = r.liberar_em;
    });
    refreshTrilhaVisibilityUI();
  }

  function setupTrilhaBimestreRealtime() {
    if (!sbClient) return;
    sbClient.channel('realtime_trilha_bimestre_' + cfg.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trilha_bimestre', filter: `turma=eq.${cfg.id}` }, () => fetchTrilhaBimestre())
      .subscribe();
  }

  // ---------- Gestão da turma (só professor) ----------
  // Mesma coisa que professor/painel.html fazia antes num painel central
  // misturando as duas turmas — agora cada turma cuida só dos seus alunos.
  let gestaoOverridesCache = {};
  let gestaoClipboardBlocked = false;
  let gestaoHorarioAcesso = { restrito: false, inicio: '', fim: '' };
  let gestaoActivityRealtimeStarted = false;
  let gestaoActivityPollStarted = false;

  function turmaStudents() {
    return turmaStudentsCache;
  }

  function turmaStudentByEmail(email) {
    return turmaStudentsCache.find(u => u.email === email) || null;
  }

  async function fetchTurmaStudents() {
    if (!sbClient) { turmaStudentsCache = []; return; }
    // archived_at is null: aluno arquivado (ver arquivar_aluno() no
    // Supabase) some de TODA lista/relatório que lê turmaStudents() —
    // Gestão, Chamada, Notas, Ranking, Relatório do Dia/Inatividade —
    // filtrado num lugar só, aqui.
    const { data } = await sbClient
      .from('profiles')
      .select('email, nome, role, turma')
      .eq('turma', cfg.id)
      .eq('role', 'aluno')
      .is('archived_at', null);
    turmaStudentsCache = (data || []).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  // Só pra seção "Alunos" da Gestão (Reativar) — em todo o resto do
  // portal um aluno arquivado precisa continuar invisível.
  async function fetchTurmaArchivedStudents() {
    if (!sbClient) { turmaArchivedCache = []; return; }
    const { data } = await sbClient
      .from('profiles')
      .select('email, nome, role, turma, archived_at')
      .eq('turma', cfg.id)
      .eq('role', 'aluno')
      .not('archived_at', 'is', null);
    turmaArchivedCache = (data || []).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  // Arquivar/reativar rodam como RPC (SECURITY DEFINER no Supabase) —
  // profiles não tem policy de update pro professor, então só a function
  // consegue gravar archived_at (e, no arquivar, banir a conta/derrubar a
  // sessão — ver sql/supabase-setup-completo.sql). Best-effort: se a
  // migração (sql/arquivar-aluno.sql) ainda não rodou, a function nem
  // existe no banco e o RPC volta com erro — a tela avisa em vez de falhar
  // em silêncio.
  async function arquivarAluno(email) {
    if (!sbClient) return;
    const { data, error } = await sbClient.rpc('arquivar_aluno', { p_email: email });
    if (error) {
      showAlert('Não foi possível arquivar este aluno agora (falha ao falar com o Supabase — rode sql/arquivar-aluno.sql se ainda não rodou). Veja o console (F12) para detalhes.');
      console.error('[Gestão] arquivar_aluno:', error);
      return;
    }
    if (data && data.success === false) { showAlert(data.message || 'Não foi possível arquivar este aluno.'); return; }
    // Não só a seção "Alunos": Chamada, Notas e os relatórios já podem
    // estar renderizados na tela (Gestão inteira carrega de uma vez ao
    // abrir a aba) com o roster de ANTES de arquivar — sem refazer tudo
    // aqui, o aluno recém-arquivado continuaria aparecendo neles até o
    // professor sair e voltar pra aba Gestão. O await é obrigatório: várias
    // dessas seções (ex.: loadChamada) leem turmaStudents() de forma
    // SÍNCRONA logo no início da própria função — sem esperar o fetch
    // terminar antes de renderGestaoTab(), elas correriam o risco real de
    // ler o cache ainda desatualizado.
    await fetchTurmaStudents();
    renderGestaoTab();
  }

  async function reativarAluno(email) {
    if (!sbClient) return;
    const { data, error } = await sbClient.rpc('reativar_aluno', { p_email: email });
    if (error) {
      showAlert('Não foi possível reativar este aluno agora (falha ao falar com o Supabase — rode sql/arquivar-aluno.sql se ainda não rodou). Veja o console (F12) para detalhes.');
      console.error('[Gestão] reativar_aluno:', error);
      return;
    }
    if (data && data.success === false) { showAlert(data.message || 'Não foi possível reativar este aluno.'); return; }
    await fetchTurmaStudents(); // mesmo motivo do arquivarAluno acima (evita a corrida com loadChamada e afins)
    renderGestaoTab();
  }

  // Refaz os dois papéis (ativos/arquivados) toda vez que abre — pega
  // arquivamentos feitos por outra sessão de professor desde a última vez.
  async function renderGestaoAlunos() {
    const activeBody = document.getElementById('tblGestaoAlunosBody');
    if (!activeBody) return;
    await Promise.all([fetchTurmaStudents(), fetchTurmaArchivedStudents()]);

    activeBody.innerHTML = turmaStudents().map(u => `
      <tr>
        <td>${u.nome}</td>
        <td>${u.email}</td>
        <td><button class="btn btn-danger" data-arquivar-email="${u.email}" data-arquivar-nome="${u.nome}">Arquivar</button></td>
      </tr>
    `).join('') || noStudentsRow(3);
    activeBody.querySelectorAll('[data-arquivar-email]').forEach(btn => {
      btn.addEventListener('click', () => {
        const email = btn.getAttribute('data-arquivar-email');
        const nome = btn.getAttribute('data-arquivar-nome');
        showArchiveConfirm(nome, () => arquivarAluno(email));
      });
    });

    const archBody = document.getElementById('tblGestaoAlunosArquivadosBody');
    archBody.innerHTML = turmaArchivedCache.map(u => `
      <tr>
        <td>${u.nome}</td>
        <td>${u.email}</td>
        <td>${new Date(u.archived_at).toLocaleDateString('pt-BR')}</td>
        <td><button class="btn btn-secondary" data-reativar-email="${u.email}">Reativar</button></td>
      </tr>
    `).join('') || '<tr><td colspan="4" class="empty-state">Nenhum aluno arquivado.</td></tr>';
    archBody.querySelectorAll('[data-reativar-email]').forEach(btn => {
      btn.addEventListener('click', () => reativarAluno(btn.getAttribute('data-reativar-email')));
    });
  }

  // Estado agregado da turma inteira (não mais por aluno — ver
  // PENDENCIAS.md): student_overrides continua sendo uma linha por aluno
  // por baixo dos panos — só a TELA parou de expor controle individual
  // (ver renderGestaoToggles, que decide "liberado" só quando TODOS estão
  // com games_unlocked true).
  async function fetchGestaoOverrides() {
    if (!sbClient) return;
    const { data } = await sbClient.from('student_overrides').select('*');
    gestaoOverridesCache = {};
    (data || []).forEach(r => { gestaoOverridesCache[r.student_email] = r.games_unlocked; });
  }

  async function renderGestaoBimestres() {
    await fetchBimestreDates();
    const tbody = document.getElementById('tblGestaoBimestresBody');
    if (!tbody) return;
    tbody.innerHTML = BIMESTRE_NUMS.map(num => {
      const saved = bimestreDatesCache[num] || {};
      const acaoNotas = saved.fechado
        ? `<span class="bimestre-fechado-tag">🔒 Fechado</span> <button type="button" class="btn btn-secondary btn-bimestre-notas" data-bimestre-acao="reabrir" data-num="${num}">Reabrir</button>`
        : `<button type="button" class="btn btn-danger btn-bimestre-notas" data-bimestre-acao="fechar" data-num="${num}">🔒 Fechar bimestre</button>`;
      return `
        <tr data-bimestre="${num}">
          <td>${BIMESTRE_LABELS[num]}</td>
          <td><input type="date" class="bimestre-data-input" data-campo="inicio" value="${saved.inicio || ''}"></td>
          <td><input type="date" class="bimestre-data-input" data-campo="fim" value="${saved.fim || ''}"></td>
          <td>${acaoNotas}</td>
        </tr>
      `;
    }).join('');
  }

  // ---------- Fechar bimestre (Gestão → Bloqueios e Liberações, coluna
  // "Notas" da tabela de bimestres) ----------
  // A nota de cada matéria não é guardada em lugar nenhum — é recalculada
  // toda vez a partir das trilhas do config.js e do progresso dos alunos.
  // Fechar CONGELA o resultado: calcula tudo como Lançar Notas mostra
  // (calcNotasBimestreTurma), grava em grades (nota1–nota4 +
  // notas_congeladas, uma nota final por matéria) e marca
  // bimestre_dates.fechado. Daí em diante Lançar Notas, Perfil e Relatório
  // leem o congelado (bimestreFechado) — o professor pode apagar trilhas,
  // atividades e progresso daquele bimestre sem mudar nenhuma nota.
  // Reabrir só desmarca: volta a recalcular (se o conteúdo já foi apagado,
  // as notas recalculadas mudam — por isso o aviso na confirmação).
  function bimestreFechado(num) {
    return !!(num && (bimestreDatesCache[num] || {}).fechado);
  }

  function showConfirm(mensagemHtml, okLabel, onConfirm) {
    document.getElementById('pfConfirmOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'pfConfirmOverlay';
    overlay.className = 'pf-alert-overlay';
    overlay.innerHTML = `
      <div class="pf-alert-box" role="alertdialog" aria-modal="true">
        <p class="pf-alert-msg">${mensagemHtml}</p>
        <div style="display:flex; gap:10px; justify-content:flex-end;">
          <button class="btn btn-secondary pf-confirm-cancel">Cancelar</button>
          <button class="btn pf-confirm-ok">${okLabel}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    function close() {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    overlay.querySelector('.pf-confirm-cancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    overlay.querySelector('.pf-confirm-ok').addEventListener('click', () => { close(); onConfirm(); });
    overlay.querySelector('.pf-confirm-ok').focus();
  }

  async function fecharBimestre(num) {
    if (!sbClient) return;
    const status = document.getElementById('bimestreDatasStatus');
    if (status) status.textContent = `Fechando o ${BIMESTRE_LABELS[num]}...`;
    const { porAluno } = await calcNotasBimestreTurma(num);
    const now = new Date().toISOString();
    const numOuNull = v => (v === '' || v === null || v === undefined || isNaN(v)) ? null : parseFloat(v);
    const rows = turmaStudents().map(u => {
      const a = porAluno[u.email];
      return {
        student_email: u.email, student_name: u.nome, turma: cfg.id, bimestre: num,
        nota1: a.nota1, nota2: numOuNull(a.nota2), nota3: numOuNull(a.nota3), nota4: numOuNull(a.nota4),
        notas_congeladas: a.notasMateria,
        updated_at: now,
      };
    });
    if (rows.length) {
      const { error } = await sbClient.from('grades').upsert(rows, { onConflict: 'student_email,bimestre' });
      if (error) {
        if (status) status.textContent = /notas_congeladas/.test(error.message || '')
          ? 'Não foi possível fechar: rode sql/fechar-bimestre.sql no Supabase.'
          : 'Não foi possível fechar o bimestre (erro ao gravar as notas).';
        return;
      }
    }
    const { error: errFechar } = await sbClient.from('bimestre_dates').upsert(
      { turma: cfg.id, bimestre: num, fechado: true, updated_at: now }, { onConflict: 'turma,bimestre' });
    if (errFechar) {
      if (status) status.textContent = 'Não foi possível fechar: rode sql/fechar-bimestre.sql no Supabase.';
      return;
    }
    if (status) status.textContent = `${BIMESTRE_LABELS[num]} fechado — notas congeladas às ${new Date().toLocaleTimeString('pt-BR')}.`;
    await renderGestaoBimestres();
    loadNotas();
  }

  async function reabrirBimestre(num) {
    if (!sbClient) return;
    await sbClient.from('bimestre_dates').upsert(
      { turma: cfg.id, bimestre: num, fechado: false, updated_at: new Date().toISOString() }, { onConflict: 'turma,bimestre' });
    const status = document.getElementById('bimestreDatasStatus');
    if (status) status.textContent = `${BIMESTRE_LABELS[num]} reaberto — as notas voltam a ser calculadas.`;
    await renderGestaoBimestres();
    loadNotas();
  }

  function onAcaoBimestreNotas(e) {
    const btn = e.target.closest('[data-bimestre-acao]');
    if (!btn) return;
    const num = parseInt(btn.dataset.num, 10);
    if (btn.dataset.bimestreAcao === 'fechar') {
      showConfirm(
        `Fechar o <b>${BIMESTRE_LABELS[num]}</b>? As notas de todos os alunos em todas as matérias ficam <b>congeladas</b> como estão agora em Lançar Notas. Depois disso você pode apagar as trilhas e o progresso desse bimestre sem mudar nenhuma nota.`,
        '🔒 Fechar bimestre', () => fecharBimestre(num));
    } else {
      showConfirm(
        `Reabrir o <b>${BIMESTRE_LABELS[num]}</b>? As notas voltam a ser <b>recalculadas</b> a partir das trilhas e do progresso. Se você já apagou o conteúdo desse bimestre, as notas vão mudar.`,
        'Reabrir', () => reabrirBimestre(num));
    }
  }

  // Mesmo padrão de salvarTrilhaBimestre: as 4 linhas (sempre fixas, 1º a
  // 4º bimestre) salvam de uma vez só.
  async function salvarBimestreDatas() {
    if (!sbClient) return;
    const now = new Date().toISOString();
    const rows = Array.from(document.querySelectorAll('#tblGestaoBimestresBody tr[data-bimestre]')).map(tr => {
      const get = campo => {
        const inp = tr.querySelector(`.bimestre-data-input[data-campo="${campo}"]`);
        return inp && inp.value ? inp.value : null;
      };
      return { turma: cfg.id, bimestre: parseInt(tr.getAttribute('data-bimestre'), 10), inicio: get('inicio'), fim: get('fim'), updated_at: now };
    });
    if (rows.length === 0) return;
    await sbClient.from('bimestre_dates').upsert(rows, { onConflict: 'turma,bimestre' });
    const status = document.getElementById('bimestreDatasStatus');
    if (status) status.textContent = `Bimestres salvos às ${new Date().toLocaleTimeString('pt-BR')}.`;
    renderGestaoBimestres();
    // A coluna de status da tabela de trilhas depende das datas que
    // acabaram de mudar — sem isso ela só atualizaria na próxima vez que a
    // aba Gestão fosse reaberta.
    renderGestaoTrilhaBimestre();
  }

  // Rótulo pro professor na Gestão: recebe o NÚMERO do bimestre (não a
  // trilha_key), pra dar pra recalcular ao vivo com uma escolha ainda não
  // salva (ver renderTrilhaBimestreTable) — nunca olha o progresso de um
  // aluno específico (não faria sentido "concluída" aqui — conclusão é por
  // aluno; quem vê isso é o trilhaStatus() que cada aluno usa pra si).
  // liberarEm ("Liberar em", opcional) adia o início pra um dia dentro do
  // bimestre — mesma regra de trilhaWindow().
  function trilhaBimestreStatusLabel(num, liberarEm, trilha) {
    const hoje = todayStr();
    // Trilha do plano de ensino sem "Liberar em": escondida do aluno (ver trilhaWindow).
    if (!liberarEm && exigeLiberacao(trilha)) return { text: '⏸ Aguardando data de liberação (aluno não vê)', color: 'var(--yellow)' };
    if (!num && !liberarEm) return { text: 'Sempre visível', color: 'var(--ink-dim)' };
    const b = (num && bimestreDatesCache[num]) || {};
    if (b.fim && b.fim < hoje) return { text: 'Encerrada — sumiu da Aulas', color: 'var(--blood-bright)' };
    if (liberarEm && b.fim && liberarEm > b.fim) return { text: '⚠️ Data depois do fim do bimestre', color: 'var(--blood-bright)' };
    if (liberarEm && b.inicio && liberarEm < b.inicio) return { text: '⚠️ Data antes do início do bimestre', color: 'var(--blood-bright)' };
    if (b.inicio && b.inicio > hoje && !(liberarEm && liberarEm > b.inicio)) return { text: 'Ainda não iniciada', color: 'var(--ink-dim)' };
    if (liberarEm && liberarEm > hoje) return { text: `Libera em ${dataCurtaBR(liberarEm)}`, color: 'var(--ink-dim)' };
    return { text: 'Em andamento', color: 'var(--green)' };
  }

  // 'YYYY-MM-DD' -> 'DD/MM' (rótulo curto da Gestão).
  function dataCurtaBR(iso) {
    const [, m, d] = String(iso).split('-');
    return `${d}/${m}`;
  }

  // Nº e data da aula no plano de ensino (campos opcionais `aula` e
  // `dataAula` da trilha no config.js): "Aula 32 · 05/10/2026". Serve pro
  // professor saber em que bimestre/"Liberar em" encaixar cada trilha.
  function rotuloAulaPlano(trilha) {
    if (!trilha || trilha.aula === undefined || trilha.aula === null) return '';
    const [a, m, d] = String(trilha.dataAula || '').split('-');
    return `Aula ${trilha.aula}${a && m && d ? ` · ${d}/${m}/${a}` : ''}`;
  }

  function trilhaBimestreRowHtml({ materiaLabel, trilha }, selected, liberarEm) {
    const status = trilhaBimestreStatusLabel(selected, liberarEm, trilha);
    const aulaPlano = rotuloAulaPlano(trilha);
    // "Usar DD/MM" preenche o "Liberar em" com a data da aula do plano.
    const usarData = trilha.dataAula && trilha.dataAula !== liberarEm
      ? `<button type="button" class="btn btn-secondary trilha-usar-data" data-data="${trilha.dataAula}" style="padding:3px 8px; font-size:10px; margin-left:6px;" title="Preencher com a data da aula no plano de ensino">Usar ${dataCurtaBR(trilha.dataAula)}</button>`
      : '';
    const options = ['<option value="">Sem bimestre</option>'].concat(
      BIMESTRE_NUMS.map(num => `<option value="${num}" ${String(selected) === String(num) ? 'selected' : ''}>${BIMESTRE_LABELS[num]}</option>`)
    );
    // min/max = janela do bimestre escolhido: o calendário do navegador já
    // sugere só dias dentro do bimestre.
    const b = (selected && bimestreDatesCache[selected]) || {};
    const minMax = `${b.inicio ? `min="${b.inicio}"` : ''} ${b.fim ? `max="${b.fim}"` : ''}`;
    return `
      <tr data-trilha="${trilha.key}">
        <td>${materiaLabel}</td>
        <td>${trilha.label}${aulaPlano ? `<div class="trilha-aula-plano" style="color:var(--yellow); font-size:11px; margin-top:2px;">📅 ${aulaPlano}</div>` : ''}</td>
        <td><select class="trilha-bimestre-input">${options.join('')}</select></td>
        <td>
          <input type="date" class="trilha-liberar-input" value="${liberarEm || ''}" ${minMax}>${usarData}
          <span class="trilha-bimestre-status" style="color:${status.color}; margin-left:8px; font-size:11px;">${status.text}</span>
        </td>
      </tr>
    `;
  }

  // Agrupa as trilhas por bimestre (sem bimestre primeiro, à parte, depois
  // 1º a 4º — só os grupos com pelo menos 1 trilha aparecem) e desenha a
  // tabela. selecaoAtual(trilhaKey) decide o bimestre de cada trilha: no
  // primeiro carregamento vem do banco (trilhaBimestreCache); ao trocar
  // qualquer <select> da tabela (ver wireGestaoTrilhasRegroup), vem do
  // valor ainda não salvo escolhido na tela — é isso que faz o
  // agrupamento reagir na hora, sem precisar clicar em "Salvar" antes.
  // liberarAtual(trilhaKey) é o mesmo esquema pra data "Liberar em".
  function renderTrilhaBimestreTable(pares, selecaoAtual, liberarAtual) {
    const tbody = document.getElementById('tblGestaoTrilhasBody');
    if (!tbody) return;
    if (pares.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="color:var(--ink-dim); text-align:center; padding:14px;">Nenhuma trilha cadastrada ainda nesta turma.</td></tr>`;
      return;
    }

    const semBimestre = [];
    const porBimestre = { 1: [], 2: [], 3: [], 4: [] };
    pares.forEach(par => {
      const num = selecaoAtual(par.trilha.key);
      (num && porBimestre[num] ? porBimestre[num] : semBimestre).push(par);
    });

    const groupHeaderHtml = label => `<tr class="trilha-bimestre-group"><td colspan="4" style="background:var(--panel2); color:var(--green); font-weight:700; text-transform:uppercase; letter-spacing:0.5px; font-size:11px;">${label}</td></tr>`;

    let html = '';
    if (semBimestre.length > 0) {
      html += groupHeaderHtml('Sem bimestre');
      html += semBimestre.map(par => trilhaBimestreRowHtml(par, '', liberarAtual(par.trilha.key))).join('');
    }
    BIMESTRE_NUMS.forEach(num => {
      if (porBimestre[num].length === 0) return;
      html += groupHeaderHtml(BIMESTRE_LABELS[num]);
      html += porBimestre[num].map(par => trilhaBimestreRowHtml(par, num, liberarAtual(par.trilha.key))).join('');
    });
    tbody.innerHTML = html;

    wireGestaoTrilhasRegroup(pares);
  }

  // Reagrupa ao vivo sempre que QUALQUER <select> de bimestre da tabela
  // muda — refaz a tabela inteira lendo o valor atual de cada <select>
  // e de cada "Liberar em" (não o que está salvo no banco), preservando o
  // que o professor já escolheu nas outras linhas. Precisa ser rechamada
  // depois de cada innerHTML novo, já que ele destrói os <select> (e os
  // listeners) antigos. Mudar só a data não reagrupa nada — só atualiza o
  // rótulo de status da própria linha, sem redesenhar (o campo de data
  // perderia o foco no meio da digitação).
  function wireGestaoTrilhasRegroup(pares) {
    const tbody = document.getElementById('tblGestaoTrilhasBody');
    if (!tbody) return;
    tbody.querySelectorAll('.trilha-bimestre-input').forEach(sel => {
      sel.addEventListener('change', () => {
        const valores = {};
        const datas = {};
        tbody.querySelectorAll('tr[data-trilha]').forEach(tr => {
          const s = tr.querySelector('.trilha-bimestre-input');
          const d = tr.querySelector('.trilha-liberar-input');
          valores[tr.getAttribute('data-trilha')] = s ? s.value : '';
          datas[tr.getAttribute('data-trilha')] = d ? d.value : '';
        });
        renderTrilhaBimestreTable(pares,
          key => (valores[key] ? parseInt(valores[key], 10) : null),
          key => datas[key] || null);
      });
    });
    tbody.querySelectorAll('.trilha-liberar-input').forEach(inp => {
      inp.addEventListener('change', () => {
        const tr = inp.closest('tr');
        const sel = tr.querySelector('.trilha-bimestre-input');
        const num = sel && sel.value ? parseInt(sel.value, 10) : null;
        const trilhaDaLinha = (pares.find(p => p.trilha.key === tr.getAttribute('data-trilha')) || {}).trilha;
        const status = trilhaBimestreStatusLabel(num, inp.value || null, trilhaDaLinha);
        const span = tr.querySelector('.trilha-bimestre-status');
        if (span) { span.textContent = status.text; span.style.color = status.color; }
      });
    });
    // "Usar DD/MM": copia a data da aula do plano pro "Liberar em" (ainda
    // sem salvar — o professor confere e clica em Salvar, como o resto).
    tbody.querySelectorAll('.trilha-usar-data').forEach(btn => {
      btn.addEventListener('click', () => {
        const inp = btn.closest('tr').querySelector('.trilha-liberar-input');
        if (!inp) return;
        inp.value = btn.getAttribute('data-data');
        inp.dispatchEvent(new Event('change'));
      });
    });
  }

  // Uma linha por TRILHA (não por matéria) — a mesma matéria pode ter
  // trilhas em bimestres diferentes (currículo que se repete/continua ao
  // longo do ano), então o bimestre precisa ser escolhido trilha a trilha.
  async function renderGestaoTrilhaBimestre() {
    await Promise.all([fetchBimestreDates(), fetchTrilhaBimestre()]);
    const pares = allTrilhasComMateria();
    renderTrilhaBimestreTable(pares,
      trilhaKey => trilhaBimestreCache[trilhaKey] || null,
      trilhaKey => trilhaLiberarEmCache[trilhaKey] || null);
  }

  // Salva TODAS as linhas de uma vez (igual salvarBimestreDatas/salvarNotas).
  // "Liberar em" fora da janela do bimestre escolhido não salva nada: antes
  // do início não teria efeito (o bimestre já segura a trilha) e depois do
  // fim a trilha nunca apareceria pro aluno.
  async function salvarTrilhaBimestre() {
    if (!sbClient) return;
    const now = new Date().toISOString();
    const status = document.getElementById('trilhaBimestreStatus');
    const foraDoBimestre = [];
    const rows = Array.from(document.querySelectorAll('#tblGestaoTrilhasBody tr[data-trilha]')).map(tr => {
      const sel = tr.querySelector('.trilha-bimestre-input');
      const bimestre = sel && sel.value ? parseInt(sel.value, 10) : null;
      const data = tr.querySelector('.trilha-liberar-input');
      const liberarEm = data && data.value ? data.value : null;
      const b = (bimestre && bimestreDatesCache[bimestre]) || {};
      if (liberarEm && ((b.inicio && liberarEm < b.inicio) || (b.fim && liberarEm > b.fim))) {
        foraDoBimestre.push(tr.children[1] ? tr.children[1].textContent.trim() : tr.getAttribute('data-trilha'));
      }
      return { turma: cfg.id, trilha_key: tr.getAttribute('data-trilha'), bimestre, liberar_em: liberarEm, updated_at: now };
    });
    if (rows.length === 0) return;
    if (foraDoBimestre.length > 0) {
      if (status) status.textContent = `⚠️ "Liberar em" fora do bimestre em: ${foraDoBimestre.join(', ')}. Nada foi salvo.`;
      return;
    }
    const { error } = await sbClient.from('trilha_bimestre').upsert(rows, { onConflict: 'turma,trilha_key' });
    if (error) {
      // Coluna liberar_em ainda não criada no Supabase (sql/trilha-liberar-em.sql).
      if (status) status.textContent = `Erro ao salvar: ${error.message}`;
      return;
    }
    if (status) status.textContent = `Salvo às ${new Date().toLocaleTimeString('pt-BR')}.`;
    renderGestaoTrilhaBimestre();
  }

  // Handler único do toggle de Ctrl+C/V — grava e atualiza o cache; quem
  // chama decide quando re-renderizar (ver renderGestaoToggles).
  async function toggleClipboardBlock() {
    if (!sbClient) return;
    const newValue = !gestaoClipboardBlocked;
    const { error } = await sbClient.from('classroom_settings').upsert({
      id: cfg.id, clipboard_blocked: newValue, updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (error) {
      showAlert('Não foi possível salvar o bloqueio de copiar/colar: ' + error.message);
      return;
    }
    gestaoClipboardBlocked = newValue;
  }

  async function fetchClipboardStateGestao() {
    if (!sbClient) return;
    const { data } = await sbClient.from('classroom_settings').select('clipboard_blocked').eq('id', cfg.id).maybeSingle();
    gestaoClipboardBlocked = !!(data && data.clipboard_blocked);
  }

  // "Horário de Acesso" (Gestão → Bloqueios e Liberações): fora do horário
  // o aluno vê o portal fechado (shared/horario-acesso.js). Busca separada
  // da do Copiar e Colar: sem as colunas no Supabase (sql/horario-acesso.sql)
  // o select dá erro, e não pode levar a chave do Copiar e Colar junto.
  async function fetchHorarioAcessoGestao() {
    if (!sbClient) return;
    const { data, error } = await sbClient.from('classroom_settings')
      .select('acesso_restrito, acesso_inicio, acesso_fim').eq('id', cfg.id).maybeSingle();
    gestaoHorarioAcesso = error || !data
      ? { restrito: false, inicio: '', fim: '' }
      : { restrito: !!data.acesso_restrito, inicio: (data.acesso_inicio || '').slice(0, 5), fim: (data.acesso_fim || '').slice(0, 5) };
  }

  // restrito: true = aluno só entra no horário; false = livre (os horários
  // continuam gravados, pra religar depois sem digitar de novo).
  async function salvarHorarioAcesso(restrito) {
    const status = document.getElementById('horarioAcessoStatus');
    const inicio = document.getElementById('horarioAcessoInicio').value;
    const fim = document.getElementById('horarioAcessoFim').value;
    if (!sbClient) return false;
    if (restrito && (!inicio || !fim)) {
      status.textContent = '⚠️ Preencha o início e o fim antes de restringir.';
      return false;
    }
    if (inicio && fim && inicio === fim) {
      status.textContent = '⚠️ Início e fim não podem ser iguais.';
      return false;
    }
    const { error } = await sbClient.from('classroom_settings').upsert({
      id: cfg.id, acesso_restrito: restrito, acesso_inicio: inicio || null, acesso_fim: fim || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (error) {
      status.textContent = `Erro ao salvar (rodou o sql/horario-acesso.sql no Supabase?): ${error.message}`;
      return false;
    }
    status.textContent = `Salvo às ${new Date().toLocaleTimeString('pt-BR')}.`;
    return true;
  }

  // "Mostrar Notas" (Gestão → Bloqueios e Liberações): liga/desliga a
  // visibilidade da NOTA (e do selo Aprovado/Recuperação) pro aluno, só no
  // bimestre ATUAL (currentBimestreNum) — ver notasVisiveis em
  // renderPerfilTab. Cada bimestre nasce bloqueado (default false em
  // bimestre_dates.notas_liberadas), então o professor não precisa lembrar
  // de bloquear de novo quando o bimestre seguinte começar. Sem bimestre
  // atual configurado (fora do período letivo), não tem o que ligar — o
  // botão fica desabilitado (ver renderGestaoToggles).
  async function toggleNotasLiberadas() {
    if (!sbClient) return;
    const bimestreAtual = currentBimestreNum();
    if (!bimestreAtual) return;
    const atual = !!(bimestreDatesCache[bimestreAtual] || {}).notas_liberadas;
    await sbClient.from('bimestre_dates').upsert({
      turma: cfg.id, bimestre: bimestreAtual, notas_liberadas: !atual, updated_at: new Date().toISOString()
    }, { onConflict: 'turma,bimestre' });
    await fetchBimestreDates();
  }

  // Liga/desliga visual de uma "chave" (ver .toggle-switch no CSS).
  function setToggleState(id, on) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
  }

  // Os 3 "liga/desliga" simples da turma (Gestão → Bloqueios e
  // Liberações) — Copiar e Colar, Jogos e Mostrar Notas. Cada um lê de uma
  // fonte diferente por baixo (classroom_settings, student_overrides
  // agregado, bimestre_dates do bimestre atual), mas a UI trata os três do
  // mesmo jeito: uma chave verde (liberado) ou vermelha (bloqueado).
  async function renderGestaoToggles() {
    await Promise.all([fetchClipboardStateGestao(), fetchHorarioAcessoGestao(), fetchGestaoOverrides(), fetchBimestreDates()]);

    setToggleState('toggleClipboard', !gestaoClipboardBlocked);

    setToggleState('toggleHorario', !gestaoHorarioAcesso.restrito);
    const inpInicio = document.getElementById('horarioAcessoInicio');
    const inpFim = document.getElementById('horarioAcessoFim');
    // Não sobrescreve o que o professor está digitando agora.
    if (inpInicio && document.activeElement !== inpInicio) inpInicio.value = gestaoHorarioAcesso.inicio;
    if (inpFim && document.activeElement !== inpFim) inpFim.value = gestaoHorarioAcesso.fim;
    const horarioDesc = document.getElementById('toggleHorarioDesc');
    if (horarioDesc) {
      horarioDesc.textContent = gestaoHorarioAcesso.restrito
        ? `Restrito — aluno só acessa das ${gestaoHorarioAcesso.inicio} às ${gestaoHorarioAcesso.fim} (fora disso vê o portal fechado).`
        : 'Livre — aluno acessa a qualquer hora.';
    }

    const students = turmaStudents();
    const jogosLiberados = students.length > 0 && students.every(u => !!gestaoOverridesCache[u.email]);
    setToggleState('toggleJogos', jogosLiberados);
    const jogosDesc = document.getElementById('toggleJogosDesc');
    if (jogosDesc) {
      if (students.length === 0) {
        jogosDesc.textContent = '';
      } else {
        const liberados = students.filter(u => !!gestaoOverridesCache[u.email]).length;
        jogosDesc.textContent = liberados === 0
          ? 'Bloqueado para todos.'
          : liberados === students.length
            ? 'Liberado para todos.'
            : `Parcial — ${liberados} de ${students.length} liberados.`;
      }
    }

    const bimestreAtual = currentBimestreNum();
    const notasLiberadas = bimestreAtual ? !!(bimestreDatesCache[bimestreAtual] || {}).notas_liberadas : false;
    setToggleState('toggleNotas', notasLiberadas);
    const toggleNotasBtn = document.getElementById('toggleNotas');
    if (toggleNotasBtn) toggleNotasBtn.disabled = !bimestreAtual;
    const notasDesc = document.getElementById('toggleNotasDesc');
    if (notasDesc) {
      notasDesc.textContent = !bimestreAtual
        ? 'Nenhum bimestre em andamento.'
        : `${BIMESTRE_LABELS[bimestreAtual]} — ${notasLiberadas ? 'aluno já vê a nota' : 'aluno ainda não vê a nota'}.`;
    }
  }

  // ---------- Sino de alertas: aluno saiu da tela numa atividade/prova
  // que não podia sair (detecção em shared/exam-proctor.js,
  // PortalExamGuard) — só professor. Chega um alerta a CADA saída: a 1ª
  // é advertência (warnings 1), a 2ª bloqueia (warnings 2). ----------
  function humanizeActivityKey(key) {
    return (key || '').split('_').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  // Nome e atividade vêm da linha que o PRÓPRIO aluno grava em
  // exam_guard_events: escapa antes de virar HTML na tela do professor.
  function escExamGuard(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function renderExamGuardBadge() {
    const badge = document.getElementById('examGuardBadge');
    if (!badge) return;
    const n = examGuardEvents.length;
    badge.textContent = String(n);
    badge.style.display = n > 0 ? 'flex' : 'none';
  }

  function renderExamGuardList() {
    const box = document.getElementById('examGuardList');
    if (!box) return;
    if (examGuardEvents.length === 0) {
      box.innerHTML = '<p class="exam-guard-empty">Nenhum alerta pendente. 🎉</p>';
      return;
    }
    // Bloqueado: "Liberar" destrava a atividade na hora. Advertência:
    // "Liberar" zera a advertência (a próxima saída volta a ser a 1ª).
    box.innerHTML = examGuardEvents.map(ev => {
      const bloqueado = (ev.warnings || 0) >= 2;
      const atividade = escExamGuard(humanizeActivityKey(ev.activity_location));
      const meta = bloqueado
        ? `Saiu de "${atividade}" pela 2ª vez e foi bloqueado há ${formatDurationSince(ev.created_at)}.`
        : `Saiu da tela em "${atividade}" há ${formatDurationSince(ev.created_at)} (advertência ${Number(ev.warnings) || 1}/2).`;
      return `
      <div class="exam-guard-item" data-event-ids="${escExamGuard(ev.ids.join(','))}">
        <b>${bloqueado ? '🚨' : '⚠️'} ${escExamGuard(ev.student_name || ev.student_email)}</b>
        <div class="exam-guard-meta">${meta}</div>
        <div class="exam-guard-actions">
          <button class="btn" data-acao="liberado">Liberar</button>
          <button class="btn btn-danger" data-acao="mantido">${bloqueado ? 'Manter bloqueado' : 'Ciente'}</button>
        </div>
      </div>
    `;
    }).join('');

    box.querySelectorAll('.exam-guard-item').forEach(item => {
      const eventIds = item.getAttribute('data-event-ids').split(',');
      item.querySelectorAll('button[data-acao]').forEach(btn => {
        btn.addEventListener('click', () => resolverExamGuardEvento(eventIds, btn.getAttribute('data-acao'), item));
      });
    });
  }

  // Só toca o toast pra alerta que chegou DEPOIS da primeira busca (aluno
  // saiu agora, com o professor na tela) — sem essa guarda, todo boot com
  // alerta(s) já pendente(s) de antes disparava um toast por alerta, só por
  // causa da primeira consulta. Alertas antigos ainda aparecem, só que
  // silenciosamente, no selo/lista.
  let examGuardFirstFetchDone = false;

  async function fetchExamGuardEvents() {
    if (!sbClient) return;
    const previousIds = new Set(examGuardEvents.allIds || []);
    const { data } = await sbClient.from('exam_guard_events')
      .select('*')
      .eq('turma', cfg.id)
      .eq('resolved', false)
      .order('created_at', { ascending: false });
    const rows = data || [];
    if (examGuardFirstFetchDone) {
      rows.filter(ev => !previousIds.has(ev.id)).forEach(ev => {
        if ((ev.warnings || 0) >= 2) {
          showToast('🚨 Aluno bloqueado', `${ev.student_name || ev.student_email} saiu de "${humanizeActivityKey(ev.activity_location)}" e foi bloqueado.`);
        } else {
          showToast('⚠️ Aluno saiu da tela', `${ev.student_name || ev.student_email} saiu da tela em "${humanizeActivityKey(ev.activity_location)}" (advertência ${ev.warnings || 1}/2).`);
        }
      });
    }
    examGuardFirstFetchDone = true;
    // Um card por aluno+atividade: a advertência e o bloqueio da mesma
    // prova viram um card só, com o estado mais recente (rows já vêm do
    // mais novo pro mais antigo). `ids` guarda todos, pra resolver juntos.
    const grupos = new Map();
    rows.forEach(ev => {
      const chave = ev.student_email + '|' + ev.activity_location;
      const g = grupos.get(chave);
      if (g) {
        g.ids.push(ev.id);
        if ((ev.warnings || 0) > (g.warnings || 0)) g.warnings = ev.warnings;
      } else {
        grupos.set(chave, Object.assign({}, ev, { ids: [ev.id] }));
      }
    });
    examGuardEvents = Array.from(grupos.values());
    // previousIds precisa de TODOS os ids, não só do card.
    examGuardEvents.allIds = rows.map(ev => ev.id);
    renderExamGuardBadge();
    renderExamGuardList();
  }

  async function resolverExamGuardEvento(eventIds, acao, itemEl) {
    if (!sbClient) return;
    itemEl.querySelectorAll('button').forEach(b => { b.disabled = true; });
    for (const eventId of eventIds) {
      const { error } = await sbClient.rpc('resolver_exam_guard_event', { p_event_id: eventId, p_acao: acao });
      if (error) {
        showAlert('Não foi possível resolver o alerta: ' + error.message);
        itemEl.querySelectorAll('button').forEach(b => { b.disabled = false; });
        return;
      }
    }
    const allIds = (examGuardEvents.allIds || []).filter(id => !eventIds.includes(id));
    examGuardEvents = examGuardEvents.filter(ev => !ev.ids.some(id => eventIds.includes(id)));
    examGuardEvents.allIds = allIds;
    renderExamGuardBadge();
    renderExamGuardList();
  }

  function setupExamGuardAlerts() {
    // Sem botão próprio pra abrir — o selo de notificação vive no ícone de
    // Perfil (.profile-notif-badge, ver renderExamGuardBadge), e é o
    // listener de #mainNavTabs .tab-btn (mais abaixo) que abre este card
    // em vez de navegar pra aba Perfil quando há alerta pendente.
    document.getElementById('btnFecharExamGuard').addEventListener('click', () => {
      document.getElementById('examGuardOverlay').style.display = 'none';
    });

    fetchExamGuardEvents();

    if (!sbClient || examGuardRealtimeStarted) return;
    examGuardRealtimeStarted = true;
    // Um evento por turma cobre tanto o INSERT do bloqueio quanto o UPDATE
    // de resolução (ex.: o próprio aluno se liberou com o token físico, sem
    // passar pelo sino) — os dois só re-buscam a lista; é fetchExamGuardEvents
    // que decide se algum alerta é novo o bastante pra merecer um toast.
    sbClient.channel('realtime_exam_guard_' + cfg.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_guard_events', filter: `turma=eq.${cfg.id}` }, () => fetchExamGuardEvents())
      .subscribe();
  }

  function computeGestaoDisplayStatus(row) {
    const updatedAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
    if (!updatedAt || (Date.now() - updatedAt) > 45000) return 'offline';
    return row.status || 'offline';
  }

  // "Há quanto tempo" (Atividade e Inatividade) — location_started_at é
  // mantido pelo gatilho track_daily_active_seconds() no banco (só reseta
  // quando `location` muda de verdade, ao contrário de updated_at, que
  // muda a cada heartbeat de 15s mesmo na mesma tela). Formata a diferença
  // pro relógio do PROFESSOR (só exibição — não é gravado em lugar nenhum,
  // então não tem o problema de relógio de cliente que updated_at tinha).
  function formatDurationSince(iso) {
    if (!iso) return '--';
    const ms = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(ms) || ms < 0) return '--';
    const totalMin = Math.floor(ms / 60000);
    if (totalMin < 1) return '<1min';
    const h = Math.floor(totalMin / 60);
    const min = totalMin % 60;
    return h > 0 ? `${h}h${String(min).padStart(2, '0')}min` : `${min}min`;
  }

  // ---------- Chamada / Notas (dentro da aba Gestão, já sabe a turma) ----------
  // Data de hoje no fuso do computador do usuário (AAAA-MM-DD). Não usa
  // toISOString(): ela é em UTC, e depois das 21h no horário de Brasília
  // já devolveria o dia seguinte.
  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function noSupabaseRow(colspan) {
    return `<tr><td colspan="${colspan}" style="color:var(--ink-dim); text-align:center; padding:14px;">Configure o Supabase (shared/supabase-config.js) para usar esta tela.</td></tr>`;
  }

  function noStudentsRow(colspan) {
    return `<tr><td colspan="${colspan}" style="color:var(--ink-dim); text-align:center; padding:14px;">Nenhum aluno cadastrado nessa turma.</td></tr>`;
  }

  async function loadChamada() {
    const tbody = document.getElementById('chamadaBody');
    const dataInput = document.getElementById('chamadaData');
    if (!dataInput.value) dataInput.value = todayStr();
    if (!sbClient) { tbody.innerHTML = noSupabaseRow(2); return; }

    const students = turmaStudents();
    if (students.length === 0) { tbody.innerHTML = noStudentsRow(2); return; }

    const { data: rows } = await sbClient.from('attendance').select('*').eq('turma', cfg.id).eq('data', dataInput.value);
    const existing = {};
    (rows || []).forEach(r => { existing[r.student_email] = r; });

    tbody.innerHTML = students.map(u => {
      const row = existing[u.email];
      const faltou = row ? !row.presente : false;
      return `
        <tr>
          <td>${u.nome}</td>
          <td style="text-align:center;"><label class="falta-pill" title="Marque se o aluno faltou"><input type="checkbox" data-email="${u.email}" ${faltou ? 'checked' : ''}><span class="falta-pill-texto"></span></label></td>
        </tr>
      `;
    }).join('');
    document.getElementById('chamadaStatus').textContent = '';
  }

  async function finalizarChamada() {
    if (!sbClient) return;
    const data = document.getElementById('chamadaData').value || todayStr();
    const students = turmaStudents();
    const now = new Date().toISOString();

    const rows = students.map(u => {
      const checkbox = document.querySelector(`#chamadaBody input[data-email="${u.email}"]`);
      const faltou = !!(checkbox && checkbox.checked);
      return {
        turma: cfg.id, data,
        student_email: u.email,
        student_name: u.nome,
        presente: !faltou,
        finalizada_em: now,
        updated_at: now
      };
    });

    if (rows.length === 0) return;
    await sbClient.from('attendance').upsert(rows, { onConflict: 'turma,data,student_email' });
    document.getElementById('chamadaStatus').textContent = `Chamada registrada às ${new Date().toLocaleTimeString('pt-BR')}.`;
    renderRelatorioPresenca();
    exibirResumoChamada(data, rows);
  }

  // Abreviação usada no texto de resumo da chamada, pra copiar/colar num
  // grupo/relatório fora do portal sem precisar digitar o nome da turma toda.
  function turmaAbrev() {
    return cfg.id === 'sistemas' ? '2º DS' : '2º JD';
  }

  function formatDataBr(isoDate) {
    const [ano, mes, dia] = isoDate.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  function exibirResumoChamada(data, rows) {
    const ausentes = rows.filter(r => !r.presente).map(r => r.student_name);
    const presentesCount = rows.length - ausentes.length;
    // Uma informação por linha (cola certinho no WhatsApp/e-mail).
    const texto = [
      `Turma: ${turmaAbrev()}`,
      `Data: ${formatDataBr(data)}`,
      `Alunos presentes: ${presentesCount}`,
      `Ausentes: ${ausentes.length ? ausentes.join(', ') : 'Nenhum'}`,
    ].join('\n');

    document.getElementById('chamadaResumoTexto').value = texto;
    document.getElementById('chamadaResumoBox').style.display = 'block';
    document.getElementById('chamadaResumoStatus').textContent = '';
  }

  // Não mostra mais a grade completa (todo mundo, o tempo todo) — só um
  // alerta com quem está com frequência baixa NESTE MÊS, pra chamar
  // atenção sem lotar a tela. O histórico completo/outros meses continua
  // disponível pelo PDF (ver gerarPdfChamadaMes, mesInput separado).
  async function renderRelatorioPresenca() {
    const mesInput = document.getElementById('presencaPdfMes');
    if (mesInput && !mesInput.value) mesInput.value = new Date().toISOString().slice(0, 7);

    const tbody = document.getElementById('presencaBody');
    if (!sbClient) { tbody.innerHTML = noSupabaseRow(3); return; }

    const students = turmaStudents();
    if (students.length === 0) { tbody.innerHTML = noStudentsRow(3); return; }

    const mesAtual = new Date().toISOString().slice(0, 7); // 'YYYY-MM' — sempre o mês corrente, independente do mês escolhido pro PDF
    const { data: rows } = await sbClient.from('attendance').select('*').eq('turma', cfg.id);
    const byStudent = {};
    (rows || []).filter(r => r.data && r.data.startsWith(mesAtual)).forEach(r => {
      byStudent[r.student_email] = byStudent[r.student_email] || { dias: 0, faltas: 0 };
      byStudent[r.student_email].dias += 1;
      if (!r.presente) byStudent[r.student_email].faltas += 1;
    });

    const comFaltaAlta = students
      .map(u => {
        const s = byStudent[u.email] || { dias: 0, faltas: 0 };
        const pct = s.dias > 0 ? Math.round(((s.dias - s.faltas) / s.dias) * 100) : null;
        return { nome: u.nome, faltas: s.faltas, pct };
      })
      // Sem nenhuma chamada este mês ainda (pct null) não é "falta" — só
      // entra quem já tem pelo menos 1 dia registrado e ficou abaixo de 75%.
      .filter(r => r.pct !== null && r.pct < 75)
      .sort((a, b) => a.pct - b.pct);

    tbody.innerHTML = comFaltaAlta.length === 0
      ? `<tr><td colspan="3" style="color:var(--ink-dim); text-align:center; padding:14px;">Nenhum aluno com frequência abaixo de 75% este mês.</td></tr>`
      : comFaltaAlta.map(r => `<tr><td>${r.nome}</td><td>${r.faltas}</td><td style="color:var(--blood-bright); font-weight:700;">${r.pct}%</td></tr>`).join('');
  }

  const MESES_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  // 'YYYY-MM' -> primeiro/último dia do mês, já formatados 'YYYY-MM-DD'
  // (pro filtro de attendance) e o número de dias do mês (pras colunas da
  // tabela) — considera ano bissexto de graça via new Date(ano, mes, 0).
  function monthBounds(mesStr) {
    const [ano, mes] = mesStr.split('-').map(Number);
    const ultimoDia = new Date(ano, mes, 0).getDate();
    return { ano, mes, ultimoDia };
  }

  // Abre uma aba só com a tabela aluno×dia do mês (reaproveita a mesma
  // consulta de attendance filtrada por turma — sem filtro de data no
  // Supabase, igual renderRelatorioPresenca, filtra o mês em JS) e aciona a
  // impressão do navegador — sem depender de nenhuma lib de PDF, o
  // professor escolhe "Salvar como PDF" no diálogo de impressão.
  async function gerarPdfChamadaMes() {
    if (!sbClient) return;
    // Abre a aba já aqui, síncrono dentro do handler de clique — se
    // window.open() só rodar depois do await na consulta abaixo, o
    // navegador não associa mais a abertura ao gesto do usuário e bloqueia
    // o popup silenciosamente.
    const printWin = window.open('', '_blank');
    const mesInput = document.getElementById('presencaPdfMes');
    if (!mesInput.value) mesInput.value = new Date().toISOString().slice(0, 7);
    const { ano, mes, ultimoDia } = monthBounds(mesInput.value);
    const mesPrefix = mesInput.value; // 'YYYY-MM' — 'data' é sempre 'YYYY-MM-DD'

    const students = turmaStudents();
    const { data: rows } = await sbClient.from('attendance').select('*').eq('turma', cfg.id);

    const byStudent = {};
    (rows || []).filter(r => r.data && r.data.startsWith(mesPrefix)).forEach(r => {
      byStudent[r.student_email] = byStudent[r.student_email] || {};
      byStudent[r.student_email][r.data] = r.presente;
    });

    const pad = n => String(n).padStart(2, '0');
    const dias = Array.from({ length: ultimoDia }, (_, i) => i + 1);

    const linhas = students.map(u => {
      const registros = byStudent[u.email] || {};
      let diasComChamada = 0, faltas = 0;
      const celulas = dias.map(d => {
        const dataStr = `${ano}-${pad(mes)}-${pad(d)}`;
        if (!(dataStr in registros)) return '<td>–</td>';
        diasComChamada++;
        const presente = registros[dataStr];
        if (!presente) faltas++;
        return `<td class="${presente ? 'presente' : 'falta'}">${presente ? 'P' : 'F'}</td>`;
      }).join('');
      const pct = diasComChamada > 0 ? Math.round(((diasComChamada - faltas) / diasComChamada) * 100) : null;
      return `<tr><td class="aluno">${u.nome}</td>${celulas}<td class="pct">${pct === null ? '—' : pct + '%'}</td></tr>`;
    }).join('');

    const cabecalhoDias = dias.map(d => `<th>${d}</th>`).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Chamada — ${MESES_PT[mes - 1]} de ${ano}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  p.sub { font-size: 11px; color: #555; margin: 0 0 14px; }
  table { border-collapse: collapse; width: 100%; font-size: 9px; }
  th, td { border: 1px solid #999; padding: 2px 3px; text-align: center; }
  th.aluno, td.aluno { text-align: left; white-space: nowrap; }
  td.presente { color: #1a7a1a; }
  td.falta { color: #b3261e; font-weight: bold; }
  td.pct { font-weight: bold; }
  p.legenda { margin-top: 10px; font-size: 10px; color: #555; }
</style></head>
<body>
  <h1>Chamada — ${cfg.label} — ${MESES_PT[mes - 1]} de ${ano}</h1>
  <p class="sub">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
  <table>
    <thead><tr><th class="aluno">Aluno</th>${cabecalhoDias}<th>% Presença</th></tr></thead>
    <tbody>${linhas}</tbody>
  </table>
  <p class="legenda">P = presente · F = falta · – = sem chamada registrada nesse dia</p>
</body></html>`;

    if (!printWin) return;
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  }

  // Nota BASE da matéria = média PONDERADA de 3 termos, todos 0-10: a %
  // de conclusão das trilhas DAQUELA matéria neste bimestre (n1, já
  // escalada 0-10 por quem chama, ver os "* 10" nos pontos que montam
  // mn1), com o peso da matéria (ver pesoMateria), mais Prova
  // (diagnóstica) e Nota 3 (2ª prova, auto ou digitada), peso 1 cada:
  //   (peso × atividades + Prova + Nota 3) / (peso + 2)
  // As duas provas são as mesmas pra todas as matérias do aluno — sem o
  // peso, quem concluía tudo tirava a MESMA nota em todas as matérias.
  // Peso 1 = média simples. A Recuperação (grades.nota4) não
  // entra aqui — ela só se aplica DEPOIS, ver aplicarRecuperacao, e só
  // quando a nota base fica abaixo de 6,0.
  function calcMedia(n1, n2, n3, peso = 1) {
    const vals = [n1, n2, n3].map(v => (v === '' || v === null || v === undefined || isNaN(v)) ? 0 : parseFloat(v));
    return Math.round(((peso * vals[0] + vals[1] + vals[2]) / (peso + 2)) * 100) / 100;
  }

  // Peso das ATIVIDADES de uma matéria na nota — digitado pelo professor
  // no campo embaixo do nome da matéria em Gestão → Lançar Notas (tabela
  // materia_pesos, um por turma+matéria, vale pra todos os bimestres).
  // Matéria sem peso salvo (ou inválido) vale 1.
  function pesoMateria(materia) {
    const p = parseFloat(materia && materiaPesoCache[materia.key]);
    return p > 0 ? p : 1;
  }

  async function fetchMateriaPesos() {
    if (!sbClient) return;
    const { data } = await sbClient.from('materia_pesos').select('*').eq('turma', cfg.id);
    materiaPesoCache = {};
    (data || []).forEach(r => { materiaPesoCache[r.materia_key] = r.peso; });
  }

  // Recuperação (grades.nota4, rótulo "Recuperação" na tela): um valor só
  // por aluno/bimestre, o mesmo pra todas as matérias — o professor lança
  // manualmente depois de aplicar uma prova de recuperação. Só entra na
  // conta de uma matéria específica se a nota BASE dela (calcMedia, sem a
  // Recuperação) ficou abaixo de 6,0; nesse caso a nota final vira a MÉDIA
  // entre a nota base e a Recuperação (nunca substitui de vez — o que o
  // aluno já tinha feito antes de recuperar continua pesando). Matéria que
  // já estava com nota base >= 6,0 nunca é afetada, mesmo que o professor
  // tenha lançado uma Recuperação naquele bimestre (ela é pras outras).
  function aplicarRecuperacao(notaBase, nota4) {
    const n4 = (nota4 === '' || nota4 === null || nota4 === undefined || isNaN(nota4)) ? null : parseFloat(nota4);
    if (n4 === null || notaBase >= 6) return notaBase;
    return Math.round(((notaBase + n4) / 2) * 100) / 100;
  }

  // Nota de matéria digitada à mão pelo professor (Gestão → Lançar Notas,
  // com a chave "Editar Notas Manuais" ligada): fica em grades.notas_materia
  // ({ [materiaKey]: nota }, sql/notas-manuais-materia.sql) e SUBSTITUI a
  // nota final daquela matéria — sem fórmula, sem Recuperação por cima,
  // mesmo em matéria sem trilha no bimestre. null = sem nota manual, vale
  // a calculada. Usada por Lançar Notas, Perfil do aluno e Relatório.
  function notaManualMateria(gradeRow, materiaKey) {
    return parseNotaManual(gradeRow && gradeRow.notas_materia ? gradeRow.notas_materia[materiaKey] : null);
  }
  function parseNotaManual(v) {
    const n = (v === '' || v === null || v === undefined) ? NaN : parseFloat(v);
    return isNaN(n) ? null : n;
  }

  // Chave "Editar Notas Manuais" (Gestão → Bloqueios e Liberações):
  // desligada = notas de matéria em Lançar Notas travadas, só leitura;
  // ligada = cada célula de matéria vira um campo pra digitar a nota
  // manual. Só visual (os campos existem sempre no DOM, ocultos) —
  // "Salvar" grava o que estiver neles nos dois estados. Não vai pro
  // Supabase: volta a travar ao recarregar a página, por segurança.
  let edicaoNotasManuais = false;
  function setEdicaoNotasManuais(on) {
    edicaoNotasManuais = on;
    setToggleState('toggleNotasManuais', on);
    const tabela = document.getElementById('notasTabela');
    if (tabela) tabela.classList.toggle('notas-editando', on);
    const desc = document.getElementById('toggleNotasManuaisDesc');
    if (desc) {
      desc.textContent = on
        ? 'Liberado — em Lançar Notas, digite a nota de uma matéria à mão (substitui a calculada; campo vazio volta para a calculada).'
        : 'Travado — as notas de matéria em Lançar Notas não podem ser editadas.';
    }
  }

  // % de conclusão (teoria + prática, crédito parcial por módulo) de um
  // conjunto de trilhas JÁ FILTRADO pra esse aluno (ver trilhasParaAluno —
  // quem chama decide QUAIS trilhas entram, matéria por matéria; esta
  // função só soma), contando só as atribuídas a ESTE bimestre
  // (trilha_bimestre, ver "Liberação por Trilha"). Base de
  // bimestrePortalPercentForStudent e bimestreMateriaPercentForStudent,
  // abaixo — a única diferença entre as duas é QUAIS trilhas entram.
  // Trilha sem bimestre atribuído nunca entra aqui (não é "do bimestre
  // nenhum"). null quando nenhuma das trilhas passadas está atribuída a
  // esse bimestre ainda — nada pra calcular.
  function bimestreModulesPercent(trilhas, bimestreNum, progressRows, studentEmail) {
    const modules = trilhas
      .filter(t => trilhaBimestreCache[t.key] === bimestreNum)
      .flatMap(t => modulosDeEntrega(t).map(m => ({ trilhaKey: t.key, mod: m })));
    if (modules.length === 0) return null;
    let sum = 0;
    modules.forEach(({ trilhaKey, mod }) => {
      const row = progressRows.find(r => r.trilha_key === trilhaKey && r.module_key === mod.key);
      if (!row) return;
      const total = row.progress_total || 1;
      sum += Math.min((row.progress_current || 0) / total, 1);
    });
    return Math.round((sum / modules.length) * 100);
  }

  // % geral (todas as matérias juntas, exceto a prova) — usado só
  // internamente pra manter nota1 (grades.media, ver Relatório de Notas)
  // preenchido; não aparece mais como coluna própria em Lançar Notas,
  // que agora mostra uma nota por MATÉRIA (ver bimestreMateriaPercentForStudent).
  // trilhasParaAluno roda POR MATÉRIA antes de achatar tudo — se achatasse
  // primeiro (allTrilhas()) e só depois filtrasse, uma trilha individual
  // numa matéria excluiria as trilhas compartilhadas de OUTRAS matérias
  // também, o que não faz sentido (a regra "só conta o que é dele" vale
  // dentro da matéria onde a adaptação existe, não pra turma inteira).
  function bimestrePortalPercentForStudent(bimestreNum, progressRows, studentEmail) {
    const provaKey = provaTrilhaKey();
    const trilhas = (cfg.materias || [])
      .filter(m => !m.notaSoManual)
      .flatMap(m => trilhasParaAluno(m.trilhas || [], studentEmail))
      .filter(t => t.key !== provaKey);
    return bimestreModulesPercent(trilhas, bimestreNum, progressRows, studentEmail);
  }

  // % de conclusão só das trilhas de UMA matéria — é isso que faz a nota
  // de cada matéria em Lançar Notas ser diferente da nota das outras
  // (mesma Prova/Nota 3, mas essa % muda conforme a matéria).
  function bimestreMateriaPercentForStudent(materia, bimestreNum, progressRows, studentEmail) {
    return bimestreModulesPercent(trilhasParaAluno(materia.trilhas || [], studentEmail), bimestreNum, progressRows, studentEmail);
  }

  // Matéria com notaSoManual (ex.: "Projetos" em Sistemas): o professor
  // lança a nota à mão e só precisa saber quanto o aluno entregou —
  // módulos concluídos (com visto) de todas as trilhas dela, sem olhar
  // bimestre. 'tudo' | 'parte' | 'nada'.
  function statusEntregaMateria(materia, progressRows, studentEmail) {
    // Trilha/módulo com semEntrega:true não é entrega do aluno (ver modulosDeEntrega).
    const modules = trilhasParaAluno(materia.trilhas || [], studentEmail)
      .flatMap(t => modulosDeEntrega(t).map(m => ({ trilhaKey: t.key, mod: m })));
    const feitos = modules.filter(({ trilhaKey, mod }) =>
      progressRows.some(r => r.trilha_key === trilhaKey && r.module_key === mod.key && r.completed)
    ).length;
    const total = modules.length;
    const status = total > 0 && feitos === total ? 'tudo' : feitos > 0 ? 'parte' : 'nada';
    return { feitos, total, status };
  }

  const STATUS_ENTREGA_LABEL = { tudo: '✅ Fez tudo', parte: '◐ Fez parte', nada: '✗ Não fez' };

  // Chave da trilha da prova diagnóstica ("Prova" na Gestão): a matéria
  // 'prova' tem uma única trilha (prova-diagnostica, ver turmas/*/
  // config.js) — buscada pela estrutura em vez de hardcoded, pra não
  // quebrar se o key da trilha mudar. Usado só pra achar o bimestre
  // atribuído a ela em trilhaBimestreCache (ver loadNotas), já que a
  // prova é "só mais uma trilha" pro mesmo mecanismo de bimestre.
  function provaTrilhaKey() {
    const materiaProva = (cfg.materias || []).find(m => m.key === 'prova');
    const trilha = materiaProva && (materiaProva.trilhas || [])[0];
    return trilha ? trilha.key : null;
  }

  // Em qual bimestre "estamos" hoje, segundo o calendário cadastrado em
  // bimestre_dates (Gestão → "Bimestres — Início e Fim") — usado pro
  // aluno ver a nota atual de cada matéria no Perfil (ver renderPerfilTab)
  // sem precisar escolher um bimestre, como o professor faz em Lançar
  // Notas. null fora de qualquer intervalo cadastrado (calendário não
  // preenchido, ou entre um bimestre e outro) — sem bimestre "atual", não
  // tem nota pra mostrar ainda.
  function currentBimestreNum() {
    const hoje = todayStr();
    for (const num of BIMESTRE_NUMS) {
      const b = bimestreDatesCache[num];
      if (b && b.inicio && b.fim && hoje >= b.inicio && hoje <= b.fim) return num;
    }
    return null;
  }

  // Lançar Notas já abre no bimestre de hoje (currentBimestreNum, pela data
  // do computador do professor). Fora de qualquer bimestre (férias entre um
  // e outro), cai no último que já começou. Sem calendário cadastrado, fica
  // como está (1º). Só até o professor trocar o <select> na mão — depois
  // disso a escolha dele vale, mesmo que a Gestão seja aberta de novo.
  let notasBimestreEscolhidoManual = false;
  function preSelecionarBimestreNotas() {
    if (notasBimestreEscolhidoManual) return;
    const hoje = todayStr();
    let num = currentBimestreNum();
    if (!num) {
      const jaComecaram = BIMESTRE_NUMS.filter(n => {
        const b = bimestreDatesCache[n];
        return b && b.inicio && b.inicio <= hoje;
      });
      num = jaComecaram.length ? jaComecaram[jaComecaram.length - 1] : null;
    }
    if (num) document.getElementById('notasBimestre').value = String(num);
  }

  // Matérias que ganham coluna própria em Lançar Notas — todas, menos
  // "Prova" (ela já é a coluna "Prova" em si, não faz sentido também ter
  // uma nota "matéria" pra ela mesma).
  function materiasParaNotas() {
    return (cfg.materias || []).filter(m => m.key !== 'prova');
  }

  // "Destacar notas abaixo de 6,0" (chave em Gestão → Lançar Notas): só
  // visual, pro professor bater o olho nas notas baixas. Preferência deste
  // navegador (localStorage), ligada por padrão — não vai pro Supabase
  // porque não muda nada pro aluno. 6,0 é o mesmo corte de
  // aplicarRecuperacao/selo "Recuperação".
  const NOTAS_BAIXAS_KEY = 'pf_destacar_notas_baixas';
  function destacarNotasBaixasOn() {
    try { return localStorage.getItem(NOTAS_BAIXAS_KEY) !== '0'; } catch (e) { return true; }
  }
  // "Destacar notas acima de 8,0": o mesmo, do outro lado — pro professor
  // achar rápido quem está indo bem. Também ligada por padrão.
  const NOTAS_ALTAS_KEY = 'pf_destacar_notas_altas';
  function destacarNotasAltasOn() {
    try { return localStorage.getItem(NOTAS_ALTAS_KEY) !== '0'; } catch (e) { return true; }
  }

  // Pinta (ou despinta) cada nota da tabela: matérias, Prova/Nota 3
  // automáticas e os campos digitáveis. Ignora célula sem nota de verdade
  // (matéria "sem trilha", prova que não é deste bimestre/não feita, campo
  // vazio) — ali o 0/— não é nota baixa, é falta de nota.
  function pintarNotasBaixas() {
    const on = destacarNotasBaixasOn();
    const onAltas = destacarNotasAltasOn();
    setToggleState('toggleNotasBaixas', on);
    setToggleState('toggleNotasAltas', onAltas);
    document.querySelectorAll('#notasBody .materia-grade-cell, #notasBody .prova-cell, #notasBody .nota3-cell, #notasBody .nota-input').forEach(el => {
      let v = NaN;
      if (el.classList.contains('nota-input')) {
        v = el.value.trim() === '' ? NaN : parseFloat(el.value);
      } else if (el.classList.contains('materia-grade-cell')) {
        // "—" (sem trilha e sem nota manual) vira NaN sozinho; célula ainda
        // não preenchida pelo recalc de loadNotas não tem o valor.
        const valorEl = el.querySelector('.materia-grade-value');
        if (valorEl) v = parseFloat(valorEl.textContent);
      } else if (!el.querySelector('span')) {
        v = parseFloat(el.dataset.nota2 ?? el.dataset.nota3);
      }
      el.classList.toggle('nota-baixa', on && v < 6);
      el.classList.toggle('nota-alta', onAltas && v > 8);
    });
  }

  async function loadNotas() {
    const tbody = document.getElementById('notasBody');
    const theadRow = document.getElementById('notasHead');
    const materias = materiasParaNotas();
    const totalCols = 4 + materias.length; // Aluno, Prova, Nota 3 (rótulo configurável via cfg.nota3Label), Recuperação + 1 por matéria

    const renderHead = () => {
      // Matéria notaSoManual não tem nota calculada, então peso não faz sentido.
      theadRow.innerHTML = `<th>Aluno</th><th>Prova</th><th>${cfg.nota3Label || 'Nota 3'}</th><th>Recuperação</th>${materias.map(m => m.notaSoManual
        ? `<th>${m.label}<span class="peso-materia-field">nota manual</span></th>`
        : `<th>${m.label}<label class="peso-materia-field">Peso <input type="number" step="0.5" min="0.5" max="10" class="peso-materia-input" data-materia="${m.key}" value="${pesoMateria(m)}"></label></th>`).join('')}`;
      // Substituto só consulta: peso das matérias também travado.
      if (currentUser.substituto) theadRow.querySelectorAll('.peso-materia-input').forEach(inp => { inp.disabled = true; });
    };
    renderHead();

    if (!sbClient) { tbody.innerHTML = noSupabaseRow(totalCols); return; }
    // Antes de qualquer return: "Salvar" grava os pesos que estão nos
    // campos, então eles precisam mostrar o que já está salvo.
    await fetchMateriaPesos();
    renderHead();

    await Promise.all([fetchBimestreDates(), fetchTrilhaBimestre()]);
    preSelecionarBimestreNotas();

    const bimestre = parseInt(document.getElementById('notasBimestre').value, 10);
    const students = turmaStudents();
    if (students.length === 0) { tbody.innerHTML = noStudentsRow(totalCols); return; }

    // Bimestre fechado (ver fecharBimestre): só leitura, direto do que foi
    // congelado — nada é recalculado nem pode ser salvo por cima.
    const fechado = bimestreFechado(bimestre);
    document.getElementById('btnSalvarNotas').disabled = fechado;
    theadRow.querySelectorAll('.peso-materia-input').forEach(inp => { inp.disabled = fechado; });
    if (fechado) {
      const { data } = await sbClient.from('grades').select('*').eq('turma', cfg.id).eq('bimestre', bimestre);
      const byEmail = {};
      (data || []).forEach(r => { byEmail[r.student_email] = r; });
      const fmt = v => { const n = parseNotaManual(v); return n === null ? '—' : n.toFixed(2); };
      tbody.innerHTML = students.map(u => {
        const g = byEmail[u.email] || {};
        const congeladas = g.notas_congeladas || {};
        return `
          <tr>
            <td>${u.nome}</td>
            <td>${fmt(g.nota2)}</td>
            <td>${fmt(g.nota3)}</td>
            <td>${fmt(g.nota4)}</td>
            ${materias.map(m => `<td class="materia-grade-cell" data-materia="${m.key}"><span class="materia-grade-value">${fmt(congeladas[m.key])}</span></td>`).join('')}
          </tr>
        `;
      }).join('');
      pintarNotasBaixas();
      document.getElementById('notasStatus').textContent = `🔒 ${BIMESTRE_LABELS[bimestre]} fechado — notas congeladas. Para alterar, reabra em Bloqueios e Liberações.`;
      return;
    }

    const nota3Auto = !!cfg.nota3ActivityLocation;

    const [gradesRes, progressRes, notaProvaByStudent, nota3AutoByStudent] = await Promise.all([
      sbClient.from('grades').select('*').eq('turma', cfg.id).eq('bimestre', bimestre),
      fetchTurmaProgressRows(),
      fetchNotaProvaByStudent(),
      nota3Auto ? fetchNota3AutoByStudent() : Promise.resolve({}),
    ]);
    const byStudent = {};
    (gradesRes.data || []).forEach(r => { byStudent[r.student_email] = r; });
    const progressByStudent = {};
    (progressRes.data || []).forEach(r => {
      progressByStudent[r.student_email] = progressByStudent[r.student_email] || [];
      progressByStudent[r.student_email].push(r);
    });

    // "Prova" (nota2) só conta no bimestre a que a trilha da prova foi
    // atribuída (mesma "Liberação por Trilha") — trilha sem bimestre, ou
    // atribuída a outro bimestre, não conta em nenhum/nesse bimestre
    // selecionado.
    const provaKey = provaTrilhaKey();
    const provaEhDesteBimestre = provaKey && trilhaBimestreCache[provaKey] === bimestre;

    // Mesma regra pra "Nota 3" quando ela é automática (cfg.nota3TrilhaKey) —
    // só conta a nota da Prova Final no bimestre em que aquela trilha foi
    // atribuída.
    const nota3TrilhaKey = cfg.nota3TrilhaKey || null;
    const nota3EhDesteBimestre = nota3TrilhaKey && trilhaBimestreCache[nota3TrilhaKey] === bimestre;

    tbody.innerHTML = students.map(u => {
      const pRows = progressByStudent[u.email] || [];

      // nota1 não aparece mais como coluna própria — continua sendo
      // calculada e salva por baixo dos panos só pra grades.media (Média
      // B1-B4 no Relatório de Notas) não regredir.
      const pctGeral = bimestrePortalPercentForStudent(bimestre, pRows, u.email);
      const n1 = pctGeral === null ? 0 : Math.round((pctGeral / 100) * 5 * 100) / 100;

      const g = byStudent[u.email] || {};
      const n4 = g.nota4 ?? '';

      // Aluno com conteúdo adaptado (ex.: Engel — ver cfg.notasManuaisFor em
      // turmas/jogos/config.js): as provas dele são outras atividades, que
      // gravam a nota num progress_key diferente do padrão da turma
      // (prova_jogos/prova_final_jogos) — os lookups automáticos de
      // Prova/Nota 3 abaixo NUNCA encontram a nota dele, então ficam
      // digitáveis à mão, igual Nota 4/Recuperação sempre foi.
      const notaManual = (cfg.notasManuaisFor || []).includes(u.email);

      let n2, provaTdHtml;
      if (notaManual) {
        n2 = g.nota2 ?? '';
        provaTdHtml = `<td><input type="number" step="0.1" min="0" max="10" class="nota-input" data-campo="nota2" value="${n2}"></td>`;
      } else {
        const notaProva = notaProvaByStudent[u.email];
        n2 = (provaEhDesteBimestre && notaProva !== undefined) ? Math.round((notaProva / 10) * 100) / 100 : 0;
        const semProva = !provaEhDesteBimestre
          ? ' <span style="color:var(--ink-dim); font-size:10px;">(prova não é deste bimestre)</span>'
          : (notaProva === undefined ? ' <span style="color:var(--ink-dim); font-size:10px;">(não fez a prova)</span>' : '');
        provaTdHtml = `<td class="prova-cell" data-nota2="${n2}">${n2.toFixed(2)}${semProva}</td>`;
      }

      let n3, nota3TdHtml;
      if (notaManual) {
        n3 = g.nota3 ?? '';
        nota3TdHtml = `<td><input type="number" step="0.1" min="0" max="10" class="nota-input" data-campo="nota3" value="${n3}"></td>`;
      } else if (nota3Auto) {
        const notaAuto = nota3AutoByStudent[u.email];
        n3 = (nota3EhDesteBimestre && notaAuto !== undefined) ? Math.round((notaAuto / 10) * 100) / 100 : 0;
        const semNota3 = !nota3EhDesteBimestre
          ? ` <span style="color:var(--ink-dim); font-size:10px;">(${cfg.nota3Label || 'Nota 3'} não é deste bimestre)</span>`
          : (notaAuto === undefined ? ` <span style="color:var(--ink-dim); font-size:10px;">(não fez a ${cfg.nota3Label || 'prova'})</span>` : '');
        nota3TdHtml = `<td class="nota3-cell" data-nota3="${n3}">${n3.toFixed(2)}${semNota3}</td>`;
      } else {
        n3 = g.nota3 ?? '';
        nota3TdHtml = `<td><input type="number" step="0.1" min="0" max="10" class="nota-input" data-campo="nota3" value="${n3}"></td>`;
      }

      // Só o esqueleto: o número (calculado ou manual) é preenchido pelo
      // recalc logo abaixo, a mesma função que atualiza ao vivo. O campo
      // .nota-manual-input fica oculto até o professor destravar a edição
      // (ver setEdicaoNotasManuais).
      const materiaCellsHtml = materias.map(m => {
        const manual = notaManualMateria(g, m.key);
        // Matéria só com nota manual (ex.: Projetos): mostra o quanto o aluno
        // entregou e deixa o campo de nota SEMPRE aberto (não depende da
        // chave "Editar Notas Manuais", que protege as notas calculadas).
        if (m.notaSoManual) {
          const e = statusEntregaMateria(m, pRows, u.email);
          return `<td class="materia-grade-cell materia-so-manual" data-so-manual="1" data-materia="${m.key}">`
            + `<div class="entrega-status entrega-${e.status}" title="Módulos concluídos (com visto) de ${m.label}">${STATUS_ENTREGA_LABEL[e.status]} (${e.feitos}/${e.total})</div>`
            + `<input type="number" step="0.1" min="0" max="10" class="nota-manual-input" data-materia="${m.key}" value="${manual ?? ''}" placeholder="nota" title="Nota de ${m.label}, lançada à mão">`
            + `<span class="materia-grade-view"></span></td>`;
        }
        const pctMateria = bimestreMateriaPercentForStudent(m, bimestre, pRows, u.email);
        const campoManual = `<input type="number" step="0.1" min="0" max="10" class="nota-manual-input" data-materia="${m.key}" value="${manual ?? ''}" title="Nota manual — deixe vazio para usar a nota calculada">`;
        // Matéria sem trilha atribuída a ESTE bimestre não tem nota nenhuma
        // pra calcular — mostrar "0" ali faria a média cair só em n2/n3
        // (compartilhadas por TODAS as matérias do aluno), então toda
        // matéria "Em breve" do mesmo aluno saía com o mesmo número por
        // coincidência de fórmula, não porque o desempenho fosse igual.
        if (pctMateria === null) {
          return `<td class="materia-grade-cell" data-sem-trilha="1" data-materia="${m.key}"><span class="materia-grade-view"></span>${campoManual}</td>`;
        }
        const mn1 = Math.round((pctMateria / 100) * 10 * 100) / 100;
        return `<td class="materia-grade-cell" data-materia-n1="${mn1}" data-materia="${m.key}"><span class="materia-grade-view"></span>${campoManual}</td>`;
      }).join('');

      return `
        <tr data-email="${u.email}" data-nota1="${n1}">
          <td>${u.nome}</td>
          ${provaTdHtml}
          ${nota3TdHtml}
          <td><input type="number" step="0.1" min="0" max="10" class="nota-input" data-campo="nota4" value="${n4}"></td>
          ${materiaCellsHtml}
        </tr>
      `;
    }).join('');

    // Nota 3 (ou Prova/Nota 3 inteiras, pra aluno com nota manual — ver
    // notaManual acima) e Recuperação mudam a nota de TODAS as matérias ao
    // mesmo tempo (são compartilhadas entre elas) — recalcula as células
    // de matéria ao vivo. O peso de uma matéria (campo no cabeçalho) muda
    // a coluna dela em todas as linhas. Prova/Nota 3 podem ser uma célula travada (auto)
    // em vez de <input>, por isso lê o valor atual pelo seletor certo em
    // cada recálculo, em vez de assumir a ordem dos <input>.
    tbody.querySelectorAll('tr[data-email]').forEach(tr => {
      const materiaCells = tr.querySelectorAll('.materia-grade-cell');
      // pintar=false no preenchimento inicial: pintarNotasBaixas roda uma
      // vez só no fim, com a tabela inteira já preenchida.
      const recalc = (pintar = true) => {
        const n2Input = tr.querySelector('.nota-input[data-campo="nota2"]');
        const n2 = n2Input ? n2Input.value : parseFloat(tr.querySelector('.prova-cell').dataset.nota2);
        const n3Input = tr.querySelector('.nota-input[data-campo="nota3"]');
        const n3 = n3Input ? n3Input.value : parseFloat(tr.querySelector('.nota3-cell').dataset.nota3);
        const n4 = tr.querySelector('.nota-input[data-campo="nota4"]').value;
        materiaCells.forEach(cell => {
          if (cell.dataset.soManual) {
            // Só o valor (escondido) pra pintarNotasBaixas; o campo já é a nota.
            const manual = parseNotaManual(cell.querySelector('.nota-manual-input').value.trim());
            cell.querySelector('.materia-grade-view').innerHTML = manual === null ? '' : `<span class="materia-grade-value" hidden>${manual.toFixed(2)}</span>`;
            return;
          }
          let calculada = null;
          if (!cell.dataset.semTrilha) {
            const mn1 = parseFloat(cell.dataset.materiaN1);
            const pesoInput = theadRow.querySelector(`.peso-materia-input[data-materia="${cell.dataset.materia}"]`);
            const peso = parseFloat(pesoInput && pesoInput.value);
            calculada = aplicarRecuperacao(calcMedia(mn1, n2, n3, peso > 0 ? peso : 1), n4);
          }
          // Nota manual (se digitada) substitui a calculada — ver notaManualMateria.
          const manualInput = cell.querySelector('.nota-manual-input');
          const manual = parseNotaManual(manualInput.value.trim());
          manualInput.placeholder = calculada === null ? '—' : calculada.toFixed(2);
          const view = cell.querySelector('.materia-grade-view');
          if (manual !== null) {
            const calcTxt = calculada === null ? 'sem trilha' : `calculada: ${calculada.toFixed(2)}`;
            view.innerHTML = `<span class="materia-grade-value">${manual.toFixed(2)}</span> <span class="nota-manual-tag" title="Nota lançada manualmente pelo professor (${calcTxt})">✎ manual</span>`;
          } else if (calculada === null) {
            view.innerHTML = `<span class="materia-grade-value">—</span> <span style="color:var(--ink-dim); font-size:10px;">(sem trilha)</span>`;
          } else {
            view.innerHTML = `<span class="materia-grade-value">${calculada.toFixed(2)}</span>`;
          }
        });
        if (pintar) pintarNotasBaixas();
      };
      tr.querySelectorAll('.nota-input, .nota-manual-input').forEach(inp => inp.addEventListener('input', () => recalc()));
      tr._recalcNotas = recalc;
      recalc(false);
    });
    theadRow.querySelectorAll('.peso-materia-input').forEach(inp => inp.addEventListener('input', () => {
      tbody.querySelectorAll('tr[data-email]').forEach(tr => tr._recalcNotas && tr._recalcNotas());
    }));

    pintarNotasBaixas();
    document.getElementById('notasStatus').textContent = '';
    // Substituto só consulta: nenhum campo da tabela (notas, pesos) editável.
    if (currentUser.substituto) {
      document.querySelectorAll('#notasBody input, #notasHead input').forEach(inp => { inp.disabled = true; });
      document.getElementById('notasStatus').textContent = 'Modo substituto: notas só para consulta.';
    }
  }

  async function salvarNotas() {
    if (!sbClient) return;
    const bimestre = parseInt(document.getElementById('notasBimestre').value, 10);
    if (bimestreFechado(bimestre)) return; // congelado — ver fecharBimestre
    if (currentUser.substituto) return; // substituto só consulta as notas
    const now = new Date().toISOString();

    // Prova/Nota 3 podem ser <input> (manual — turma inteira pra Nota 3
    // quando não é automática, ou só um aluno específico pra Prova/Nota 3
    // juntas, ver notaManual/cfg.notasManuaisFor) ou uma célula travada
    // (auto, valor calculado direto no dataset) — lê pelo que existir no
    // DOM em vez de repetir a mesma condição de quando a linha foi montada.
    const rows = Array.from(document.querySelectorAll('#notasBody tr[data-email]')).map(tr => {
      const email = tr.getAttribute('data-email');
      const u = turmaStudentByEmail(email);
      const nota1 = parseFloat(tr.dataset.nota1);
      const get = campo => {
        const inp = tr.querySelector(`.nota-input[data-campo="${campo}"]`);
        const v = inp ? inp.value : '';
        return v === '' ? null : parseFloat(v);
      };
      const n2Input = tr.querySelector('.nota-input[data-campo="nota2"]');
      const nota2 = n2Input ? get('nota2') : parseFloat(tr.querySelector('.prova-cell').dataset.nota2);
      const n3Input = tr.querySelector('.nota-input[data-campo="nota3"]');
      const nota3 = n3Input ? get('nota3') : parseFloat(tr.querySelector('.nota3-cell').dataset.nota3);
      // Notas manuais por matéria (ver notaManualMateria) — só as
      // preenchidas; campo apagado some do objeto e a matéria volta pra
      // nota calculada. Limitada a 0–10.
      const notas_materia = {};
      tr.querySelectorAll('.nota-manual-input').forEach(inp => {
        const v = parseNotaManual(inp.value.trim());
        if (v !== null) notas_materia[inp.dataset.materia] = Math.min(10, Math.max(0, v));
      });
      return {
        student_email: email,
        student_name: u ? u.nome : email,
        turma: cfg.id, bimestre,
        nota1, nota2, nota3, nota4: get('nota4'),
        notas_materia,
        updated_at: now
      };
    });

    // Pesos das matérias (campos do cabeçalho) — salvos junto, mesmo sem
    // aluno nenhum na turma. Campo vazio/inválido vira 1 (ver pesoMateria).
    const pesoRows = Array.from(document.querySelectorAll('#notasHead .peso-materia-input')).map(inp => {
      const p = parseFloat(inp.value);
      return { turma: cfg.id, materia_key: inp.dataset.materia, peso: p > 0 ? p : 1, updated_at: now };
    });
    if (pesoRows.length) {
      await sbClient.from('materia_pesos').upsert(pesoRows, { onConflict: 'turma,materia_key' });
      pesoRows.forEach(r => { materiaPesoCache[r.materia_key] = r.peso; });
    }

    if (rows.length === 0) return;
    const { error } = await sbClient.from('grades').upsert(rows, { onConflict: 'student_email,bimestre' });
    // Banco sem a coluna notas_materia ainda (sql/notas-manuais-materia.sql
    // não rodado): salva o resto normalmente e avisa que as manuais ficaram de fora.
    if (error && /notas_materia/.test(error.message || '')) {
      await sbClient.from('grades').upsert(rows.map(({ notas_materia, ...r }) => r), { onConflict: 'student_email,bimestre' });
      document.getElementById('notasStatus').textContent = 'Notas salvas, MENOS as notas manuais de matéria — rode sql/notas-manuais-materia.sql no Supabase.';
      renderRelatorioNotas();
      return;
    }
    document.getElementById('notasStatus').textContent = `Notas salvas às ${new Date().toLocaleTimeString('pt-BR')}.`;
    renderRelatorioNotas();
  }

  // student_module_progress da turma INTEIRA. O PostgREST corta cada resposta
  // em max_rows (1000 no Supabase) em silêncio, sem erro — e a turma já passa
  // disso (alunos × ~66 módulos), então um `select('*').eq('turma', ...)` puro
  // perdia linhas de alunos arbitrários e o ranking/relatórios os mostravam
  // com % menor do que o real. Pagina em blocos de 1000 com ordem estável
  // (sem order, o corte seguia a ordem física da tabela, que muda a cada upsert).
  async function fetchTurmaProgressRows(columns) {
    const PAGE = 1000;
    const all = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await sbClient.from('student_module_progress')
        .select(columns || '*').eq('turma', cfg.id)
        .order('student_email').order('trilha_key').order('module_key')
        .range(from, from + PAGE - 1);
      if (error) return { data: all.length ? all : null, error };
      all.push(...(data || []));
      if (!data || data.length < PAGE) return { data: all, error: null };
    }
  }

  // % de desempenho de uma MATÉRIA pro aluno: média das frações de conclusão
  // de TODOS os módulos das trilhas dela DO BIMESTRE ATUAL (crédito parcial,
  // não só 0%/100% — ver trilhaNoPeriodoAtual: recomeça do zero a cada
  // bimestre). Lê direto de cfg.materias, então recalcula sozinho sempre que
  // o professor adiciona uma trilha/módulo novo — nenhuma tabela guarda o %,
  // só o progresso bruto por módulo (student_module_progress).
  function materiaPercentForStudent(materia, progressRows, studentEmail) {
    const modules = trilhasAtuaisParaAluno(materia.trilhas || [], studentEmail)
      .flatMap(t => modulosDeEntrega(t).map(m => ({ trilhaKey: t.key, mod: m })));
    if (modules.length === 0) return null;
    let sum = 0;
    modules.forEach(({ trilhaKey, mod }) => {
      const row = progressRows.find(r => r.trilha_key === trilhaKey && r.module_key === mod.key);
      if (!row) return;
      const total = row.progress_total || 1;
      sum += Math.min((row.progress_current || 0) / total, 1);
    });
    return Math.round((sum / modules.length) * 100);
  }

  // Mesma conta do materiaPercentForStudent acima, só que achatada pra TODAS
  // as trilhas da turma (não uma matéria por vez) — dá um % geral de
  // conclusão por aluno, usado só pra calcular o ranking (ver renderRankingBadge).
  // trilhasParaAluno roda por matéria (ver comentário em
  // bimestrePortalPercentForStudent) antes de achatar tudo. Só as trilhas
  // do bimestre atual (trilhasAtuaisParaAluno): o ranking zera a cada bimestre.
  function overallProgressForStudent(progressRows, studentEmail) {
    const modules = (cfg.materias || [])
      .flatMap(m => trilhasAtuaisParaAluno(m.trilhas || [], studentEmail))
      .flatMap(t => modulosDeEntrega(t).map(m => ({ trilhaKey: t.key, mod: m })));
    if (modules.length === 0) return null;
    let sum = 0;
    modules.forEach(({ trilhaKey, mod }) => {
      const row = progressRows.find(r => r.trilha_key === trilhaKey && r.module_key === mod.key);
      if (!row) return;
      const total = row.progress_total || 1;
      sum += Math.min((row.progress_current || 0) / total, 1);
    });
    return (sum / modules.length) * 100;
  }

  // Ranking do aluno dentro da própria turma, pelo % geral de conclusão
  // (student_module_progress). Calcula a posição de TODOS pra saber onde o
  // aluno alvo cai, mas só devolve a dele — nome/posição de colegas nunca
  // chegam a aparecer na tela (só entram como chave de desempate no sort).
  // Sem targetEmail, usa o usuário logado (paramUser) — é assim que o badge
  // do topo, ao lado do Sair (renderRankingBadge) e a própria aba Perfil do aluno usam.
  // Com targetEmail explícito, calcula a posição de QUALQUER aluno da turma
  // — é o que a Gestão usa pra abrir o Perfil de um aluno específico
  // (openStudentPerfil). Não precisa mais checar `role === 'aluno'` aqui:
  // paramUser de um professor nunca aparece em turmaStudents() (só
  // role='aluno'), então o find abaixo já devolve null sozinho pra ele.
  async function computeRanking(targetEmail) {
    const email = targetEmail || paramUser;
    const scored = await computeTurmaRankingList();
    if (!scored) return null;

    const idx = scored.findIndex(s => s.email === email);
    if (idx === -1) return null;

    return { posicao: scored[idx].rank, total: scored.length, pct: scored[idx].pctRounded };
  }

  // A lista COMPLETA do ranking, já ordenada, com posição/% e a contagem de
  // atividades concluídas × disponíveis de cada aluno (mesma conta do Perfil).
  // computeRanking (só a posição de UM aluno, pra tela dele) e o relatório
  // "Ranking da Turma" da Gestão (professor, lista toda) usam esta — assim as
  // duas telas nunca discordam da ordem.
  async function computeTurmaRankingList() {
    if (!sbClient) return null;

    const students = turmaStudents();
    if (students.length === 0) return null;

    await calendarioCarregado;
    const { data } = await fetchTurmaProgressRows();
    const rows = data || [];
    const byStudent = {};
    rows.forEach(r => { (byStudent[r.student_email] = byStudent[r.student_email] || []).push(r); });

    const scored = students
      .map(u => {
        const studentRows = byStudent[u.email] || [];
        const pct = overallProgressForStudent(studentRows, u.email);
        if (pct === null) return null;
        // Só conta como "disponível/concluída" o que ainda existe no config
        // (trilha visível pra esse aluno, já filtrada por trilhasParaAluno —
        // ver comentário em bimestrePortalPercentForStudent) — linha órfã de
        // módulo removido não pode inflar o numerador acima do total.
        const modules = (cfg.materias || [])
          .flatMap(m => trilhasAtuaisParaAluno(m.trilhas || [], u.email))
          .flatMap(t => modulosDeEntrega(t).map(m => ({ trilhaKey: t.key, mod: m })));
        const concluidas = modules.filter(({ trilhaKey, mod }) =>
          studentRows.some(r => r.trilha_key === trilhaKey && r.module_key === mod.key && r.completed)
        ).length;
        return { email: u.email, nome: u.nome, pct, pctRounded: Math.round(pct), concluidas, disponiveis: modules.length };
      })
      .filter(Boolean)
      // pct BRUTO (não arredondado) decide a ordem — dois alunos só empatam de
      // verdade quando a fração exata é idêntica (ex: os dois em 100%). E-mail
      // é o desempate final, só pra garantir uma ordem determinística nesse
      // caso raríssimo — nunca decide a posição sozinho.
      .sort((a, b) => b.pct - a.pct || a.email.localeCompare(b.email));

    // Cada aluno numa posição ÚNICA (1º, 2º, 3º, ...) — precisa dar pra
    // diferenciar quem está de verdade na frente de quem, mesmo quando vários
    // alunos arredondam pro mesmo % na tela (ex: 3+ alunos em "100%"). Um
    // ranking de competição (1, 2, 2, 4, ...) já foi usado aqui, mas juntava
    // alunos com desempenho diferente na mesma posição.
    scored.forEach((s, i) => { s.rank = i + 1; });
    return scored;
  }

  // Relatório "Ranking da Turma" (Gestão → Relatórios, só professor): a turma
  // toda ordenada pela posição, com atividades concluídas/disponíveis. Sob
  // demanda (botão), igual ao Relatório do Dia — não vem preenchido sozinho.
  async function gerarRelatorioRanking() {
    const container = document.getElementById('rankingTurmaResultado');
    const btn = document.getElementById('btnGerarRankingTurma');
    if (!sbClient) { container.innerHTML = `<p style="color:var(--ink-dim); font-size:12px;">Configure o Supabase (shared/supabase-config.js) para usar este relatório.</p>`; return; }
    if (turmaStudents().length === 0) { container.innerHTML = `<p style="color:var(--ink-dim); font-size:12px;">Nenhum aluno cadastrado nesta turma.</p>`; return; }

    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ Gerando...';
    let scored;
    try {
      scored = await computeTurmaRankingList();
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
    if (!scored || scored.length === 0) { container.innerHTML = `<p style="color:var(--ink-dim); font-size:12px;">Nenhum aluno com trilhas disponíveis nesta turma.</p>`; return; }

    container.innerHTML = `
      <table class="audit-table">
        <thead><tr><th>Posição</th><th>Aluno</th><th>Atividades concluídas</th><th>Progresso Geral</th></tr></thead>
        <tbody>
          ${scored.map(s => `<tr><td>${s.rank}º</td><td>${s.nome}</td><td>${s.concluidas}/${s.disponiveis}</td><td>${s.pctRounded}%</td></tr>`).join('')}
        </tbody>
      </table>
    `;
  }

  async function renderRankingBadge() {
    const badge = document.getElementById('rankingBadge');
    if (!badge) return;
    const ranking = await computeRanking();
    if (!ranking) return;
    badge.textContent = `🏆 ${ranking.posicao}º`;
    badge.title = `Sua posição na turma: ${ranking.posicao}º de ${ranking.total} (${ranking.pct}% concluído)`;
    badge.style.display = '';
  }

  // ---------- Perfil do aluno (progresso + insígnias, aba só do aluno) ----------
  // Insígnias são progressivas por % geral de conclusão — cada turma define
  // as suas em cfg.insignias (ver turmas/<turma>/config.js), com ícone,
  // nome, descrição e o minPct necessário pra desbloquear. Não existe tabela
  // no Supabase pra isso: é só uma leitura derivada do progresso que já é
  // sincronizado em student_module_progress, então nunca "dessincroniza".
  function isBadgeUnlocked(insignia, overallPct, completedModules) {
    // minPct:0 (a primeira insígnia, "Iniciante") exige progresso real, não
    // só "0% arredondado" — senão todo aluno já entraria com ela liberada.
    if (insignia.minPct === 0) return completedModules > 0;
    return overallPct >= insignia.minPct;
  }

  function renderPerfilBadges(overallPct, completedModules) {
    const grid = document.getElementById('perfilBadgesGrid');
    if (!grid) return;
    const insignias = cfg.insignias || [];
    if (insignias.length === 0) {
      grid.innerHTML = `<div class="empty-state">Nenhuma insígnia cadastrada ainda para esta turma.</div>`;
      return;
    }
    grid.innerHTML = insignias.map(b => {
      const unlocked = isBadgeUnlocked(b, overallPct, completedModules);
      return `
        <div class="badge-slot${unlocked ? ' unlocked' : ''}">
          <div class="icon">${unlocked ? b.icon : '🔒'}</div>
          <div class="label">${b.label}</div>
          <div class="badge-desc">${unlocked ? b.desc : (b.minPct === 0 ? 'Comece uma atividade para desbloquear' : `Alcance ${b.minPct}% de progresso`)}</div>
        </div>
      `;
    }).join('');
  }

  // Nota de cada matéria (menos "Prova") de UM aluno no bimestre passado —
  // mesma fórmula que o professor vê em Gestão → Lançar Notas. Usada pelo
  // Perfil (nota + selo Aprovado/Recuperação) e pelo card "Recuperação" da
  // aba Aulas (ver isAlunoEmRecuperacao). { [materiaKey]: { nota, semTrilha } }
  async function calcNotasPorMateria(targetEmail, bimestreAtual, rows, materias) {
    const notaPorMateria = {};
    const nota3Auto = !!cfg.nota3ActivityLocation;
    // Aluno com nota manual (ver notaManual em loadNotas) — Prova e
    // Nota 3 são digitadas direto em `grades`, os lookups automáticos
    // abaixo nunca encontram a nota dele.
    const notaManual = (cfg.notasManuaisFor || []).includes(targetEmail);
    const [gradeRes, notaProvaByStudent, nota3AutoByStudent] = await Promise.all([
      // '*' e não uma lista de colunas: notas_materia só existe depois de
      // rodar sql/notas-manuais-materia.sql, e pedir uma coluna que não
      // existe derrubaria a consulta inteira.
      sbClient.from('grades').select('*').eq('turma', cfg.id).eq('student_email', targetEmail).eq('bimestre', bimestreAtual).maybeSingle(),
      notaManual ? Promise.resolve({}) : fetchNotaProvaByStudent(),
      (!notaManual && nota3Auto) ? fetchNota3AutoByStudent() : Promise.resolve({}),
    ]);
    const g = gradeRes.data || {};
    const n4 = g.nota4 ?? '';

    // Bimestre fechado: a nota de cada matéria é a congelada (ver fecharBimestre).
    if (bimestreFechado(bimestreAtual)) {
      const congeladas = g.notas_congeladas || {};
      materias.filter(m => m.key !== 'prova').forEach(m => {
        const nota = parseNotaManual(congeladas[m.key]);
        notaPorMateria[m.key] = nota === null ? { nota: 0, semTrilha: true } : { nota, semTrilha: false };
      });
      return notaPorMateria;
    }

    let n3;
    if (notaManual) {
      n3 = g.nota3 ?? 0;
    } else if (nota3Auto) {
      const nota3TrilhaKey = cfg.nota3TrilhaKey || null;
      const nota3EhDesteBimestre = nota3TrilhaKey && trilhaBimestreCache[nota3TrilhaKey] === bimestreAtual;
      const notaAuto = nota3AutoByStudent[targetEmail];
      n3 = (nota3EhDesteBimestre && notaAuto !== undefined) ? Math.round((notaAuto / 10) * 100) / 100 : 0;
    } else {
      n3 = g.nota3 ?? 0;
    }

    let n2;
    if (notaManual) {
      n2 = g.nota2 ?? 0;
    } else {
      const provaKey = provaTrilhaKey();
      const provaEhDesteBimestre = provaKey && trilhaBimestreCache[provaKey] === bimestreAtual;
      const notaProva = notaProvaByStudent[targetEmail];
      n2 = (provaEhDesteBimestre && notaProva !== undefined) ? Math.round((notaProva / 10) * 100) / 100 : 0;
    }

    materias.filter(m => m.key !== 'prova').forEach(m => {
      const pctMateria = bimestreMateriaPercentForStudent(m, bimestreAtual, rows, targetEmail);
      const mn1 = pctMateria === null ? 0 : Math.round((pctMateria / 100) * 10 * 100) / 100;
      const manual = notaManualMateria(g, m.key);
      if (manual !== null) {
        notaPorMateria[m.key] = { nota: manual, semTrilha: false };
        return;
      }
      // Só nota manual e ela ainda não foi lançada: fica sem nota ("—"),
      // igual matéria sem trilha — não conta pra média nem pra Recuperação.
      if (m.notaSoManual) {
        notaPorMateria[m.key] = { nota: 0, semTrilha: true };
        return;
      }
      const nota = pctMateria === null ? calcMedia(mn1, n2, n3, pesoMateria(m)) : aplicarRecuperacao(calcMedia(mn1, n2, n3, pesoMateria(m)), n4);
      notaPorMateria[m.key] = { nota, semTrilha: pctMateria === null };
    });
    return notaPorMateria;
  }

  async function renderPerfilTab() {
    const summaryEl = document.getElementById('perfilResumo');
    const materiasEl = document.getElementById('perfilMaterias');
    if (!summaryEl || !materiasEl) return;

    // Fora do modo "professor vendo o Perfil de um aluno" (viewingStudentEmail
    // null), é sempre o próprio usuário logado — mesmo comportamento de antes.
    const targetEmail = viewingStudentEmail || paramUser;
    const tituloEl = document.getElementById('perfilTituloPrincipal');
    const subtituloEl = document.getElementById('perfilSubtitulo');
    const btnVoltar = document.getElementById('btnVoltarPerfilAluno');
    const btnPersonalizar = document.getElementById('btnAbrirPersonalizacao');
    const progressoWrap = document.getElementById('perfilProgressoWrap');
    if (btnVoltar) btnVoltar.style.display = viewingStudentEmail ? '' : 'none';
    // Botão de personalização só faz sentido pro dono da conta olhando o
    // PRÓPRIO perfil — não some quando o professor está inspecionando o
    // Perfil de UM ALUNO pela Gestão (editaria as prefs do professor por
    // engano dentro da tela do aluno).
    if (btnPersonalizar) btnPersonalizar.style.display = viewingStudentEmail ? 'none' : '';

    // Professor vendo o PRÓPRIO perfil (não veio da Gestão): não existe
    // student_module_progress/ranking pra ele — só a personalização.
    if (currentUser.role === 'professor' && !viewingStudentEmail) {
      if (tituloEl) tituloEl.textContent = 'Meu Perfil';
      if (subtituloEl) subtituloEl.textContent = 'Personalize sua experiência no portal.';
      if (progressoWrap) progressoWrap.style.display = 'none';
      summaryEl.innerHTML = '';
      return;
    }
    if (progressoWrap) progressoWrap.style.display = '';

    if (tituloEl && subtituloEl) {
      if (viewingStudentEmail) {
        const aluno = turmaStudentByEmail(viewingStudentEmail);
        tituloEl.textContent = `Progresso de ${aluno ? aluno.nome : viewingStudentEmail}`;
        subtituloEl.textContent = `O que ${aluno ? aluno.nome.split(' ')[0] : 'o aluno'} já concluiu em ${cfg.label}, e o que ainda falta.`;
      } else {
        tituloEl.textContent = 'Meu Progresso';
        subtituloEl.textContent = `Acompanhe sua jornada em ${cfg.label}.`;
      }
    }

    if (!sbClient) {
      summaryEl.innerHTML = `<div class="empty-state">Configure o Supabase (shared/supabase-config.js) para ver ${viewingStudentEmail ? 'o progresso do aluno' : 'seu progresso'} aqui.</div>`;
      materiasEl.innerHTML = '';
      renderPerfilBadges(0, 0);
      return;
    }

    // Calendário antes de tudo: % geral, insígnias, ranking e a lista de
    // trilhas abaixo são só do bimestre atual (trilhaNoPeriodoAtual).
    await Promise.all([fetchBimestreDates(), fetchTrilhaBimestre(), fetchMateriaPesos()]);
    const [{ data: myRows }, ranking] = await Promise.all([
      sbClient.from('student_module_progress').select('*').eq('turma', cfg.id).eq('student_email', targetEmail),
      computeRanking(targetEmail)
    ]);
    const rows = myRows || [];

    const overallPct = Math.round(overallProgressForStudent(rows, targetEmail) || 0);
    const modulosAtuais = (cfg.materias || [])
      .flatMap(m => trilhasAtuaisParaAluno(m.trilhas || [], targetEmail))
      .flatMap(t => modulosDeEntrega(t).map(mod => ({ trilhaKey: t.key, mod })));
    const totalModules = modulosAtuais.length;
    // Só conta módulo concluído de trilha do bimestre atual — progresso de
    // bimestres passados não vale mais pra insígnia/resumo.
    const completedModules = modulosAtuais.filter(({ trilhaKey, mod }) =>
      rows.some(r => r.trilha_key === trilhaKey && r.module_key === mod.key && r.completed)
    ).length;

    renderPerfilBadges(overallPct, completedModules);

    // Bimestre ATUAL (ver currentBimestreNum): hoje entre o início e o fim
    // cadastrados em Gestão → "Bimestres — Início e Fim". Buscado aqui, antes
    // de montar o resumo, pra já aparecer pro aluno mesmo que a turma ainda
    // não tenha matéria/trilha cadastrada (ver o "return" mais abaixo). Só
    // mostra o bimestre atual por enquanto — não dá pra escolher ver um
    // bimestre anterior ainda (ver notaPorMateria logo abaixo, que reusa o
    // mesmo bimestreAtual pra não buscar de novo). O calendário já foi
    // buscado lá em cima, antes do % geral.
    const bimestreAtual = currentBimestreNum();
    // "Mostrar Notas" (Gestão → Bloqueios e Liberações): o aluno só vê a
    // NOTA/selo de cada matéria depois que o professor liga isso PRA ESTE
    // bimestre especificamente (bimestre_dates.notas_liberadas) — evita
    // mostrar nota baixa de um bimestre ainda em andamento, com
    // lançamento incompleto. Professor nunca é afetado, nem vendo o
    // próprio Perfil nem o de um aluno via Relatório de Inatividade.
    const notasVisiveis = currentUser.role !== 'aluno' || !!(bimestreDatesCache[bimestreAtual] || {}).notas_liberadas;

    summaryEl.innerHTML = `
      <div class="perfil-stat">
        <div class="perfil-stat-value">${overallPct}%</div>
        <div class="perfil-stat-label">Progresso Geral</div>
      </div>
      <div class="perfil-stat">
        <div class="perfil-stat-value">${completedModules}/${totalModules}</div>
        <div class="perfil-stat-label">Atividades Concluídas</div>
      </div>
      <div class="perfil-stat">
        <div class="perfil-stat-value">${ranking ? `${ranking.posicao}º` : '—'}</div>
        <div class="perfil-stat-label">${ranking ? `Posição de ${ranking.total}` : 'Posição na Turma'}</div>
      </div>
      <div class="perfil-stat">
        <div class="perfil-stat-value">${bimestreAtual ? `${bimestreAtual}º` : '—'}</div>
        <div class="perfil-stat-label">${bimestreAtual ? 'Bimestre Atual' : 'Fora do Período Letivo'}</div>
      </div>
    `;

    const materias = (cfg.materias || []).filter(m => (m.trilhas || []).length > 0 && isMateriaVisibleToEmail(m, targetEmail));
    if (materias.length === 0) {
      materiasEl.innerHTML = `<div class="empty-state">Nenhuma matéria cadastrada ainda.</div>`;
      return;
    }

    // Nota de cada matéria no bimestre ATUAL (bimestreAtual já buscado
    // acima, pro card de resumo) — mesma fórmula que o professor vê em
    // Gestão → Lançar Notas: nota base = (peso da matéria × % de conclusão
    // só das trilhas DAQUELA matéria neste bimestre, escalada até 10,0 +
    // Prova + Nota 3) / (peso + 2), ver calcMedia; se a base ficar abaixo de 6,0 e o
    // professor já lançou a Recuperação, a nota final vira a média entre a
    // base e a Recuperação (ver aplicarRecuperacao). A matéria "Prova" fica
    // de fora (ela É a nota "Prova", não faz sentido ter nota de si mesma).
    // notasVisiveis: sem isso, nem vale a pena buscar Prova/Nota3/grades —
    // o aluno não vai ver o número mesmo (ver notaHtml mais abaixo).
    const notaPorMateria = (bimestreAtual && notasVisiveis)
      ? await calcNotasPorMateria(targetEmail, bimestreAtual, rows, materias)
      : {};

    materiasEl.innerHTML = materias.map(m => {
      const pct = materiaPercentForStudent(m, rows, targetEmail);
      const pctDisplay = pct === null ? 0 : pct;
      // Só as trilhas do bimestre atual — as de bimestres passados não
      // aparecem mais pro aluno (nem aqui, nem na aba Aulas).
      // Trilha semEntrega (ver modulosDeEntrega) não é tarefa do aluno — fora da lista.
      const trilhasAtuais = trilhasAtuaisParaAluno(m.trilhas || [], targetEmail).filter(t => modulosDeEntrega(t).length > 0);
      const trilhasHtml = trilhasAtuais.length === 0
        ? `<div class="perfil-trilha-row" style="color:var(--ink-dim);"><span>Nenhuma trilha neste bimestre.</span></div>`
        : trilhasAtuais.map(t => {
          const mods = modulosDeEntrega(t);
          const doneCount = mods.filter(mod => {
            const r = rows.find(rr => rr.trilha_key === t.key && rr.module_key === mod.key);
            return !!(r && r.completed);
          }).length;
          return `<div class="perfil-trilha-row"><span>${t.label}</span><span>${doneCount}/${mods.length}</span></div>`;
        }).join('');

      let notaHtml = '';
      if (m.key !== 'prova') {
        const info = notaPorMateria[m.key];
        if (bimestreAtual && !notasVisiveis) {
          notaHtml = `<div class="perfil-materia-nota" style="color:var(--ink-dim);">NOTA: — <span style="font-size:11px;">(o professor ainda não liberou as notas deste bimestre)</span></div>`;
        } else {
          // Matéria sem trilha atribuída a este bimestre não tem nota real —
          // mostrar o número calculado (com n1=0) faria toda matéria "Em
          // breve" do aluno exibir a mesma nota por coincidência de fórmula
          // (Prova/Nota3/Nota4 são as mesmas pra todas as matérias dele).
          // >= 6,0 é o mesmo corte que decide se a Recuperação entra na
          // conta (ver aplicarRecuperacao) — abaixo disso o selo mostra
          // "Recuperação" mesmo se o professor já tiver lançado a nota de
          // recuperação e ela não ter sido suficiente pra passar de 6,0.
          const statusHtml = info && !info.semTrilha
            ? (info.nota >= 6
                ? ` <span class="perfil-nota-status aprovado">Aprovado</span>`
                : ` <span class="perfil-nota-status recuperacao">Recuperação</span>`)
            : '';
          notaHtml = !info
            ? `<div class="perfil-materia-nota" style="color:var(--ink-dim);">NOTA: — <span style="font-size:11px;">(fora do período letivo)</span></div>`
            : info.semTrilha
              ? `<div class="perfil-materia-nota" style="color:var(--ink-dim);">NOTA: — <span style="font-size:11px;">(${m.notaSoManual ? 'o professor ainda não lançou a nota' : 'sem trilha neste bimestre'})</span></div>`
              : `<div class="perfil-materia-nota">NOTA: <b>${info.nota.toFixed(2)}</b>${statusHtml}</div>`;
        }
      }

      return `
        <div class="perfil-materia-card">
          <div class="perfil-materia-head">
            <h3>${m.label}</h3>
            <span>${pctDisplay}%</span>
          </div>
          <div class="perfil-progress-bar"><div class="perfil-progress-fill" style="width:${pctDisplay}%;"></div></div>
          ${notaHtml}
          <div class="perfil-trilhas-list">${trilhasHtml}</div>
        </div>
      `;
    }).join('');
  }

  // Abre o Perfil do aluno clicado (Gestão → Relatório de Inatividade) na
  // MESMA tela que o aluno vê ao clicar em "Perfil" — reaproveita
  // #tabContentPerfil/renderPerfilTab() por inteiro, só trocando de quem é
  // o progresso mostrado (ver viewingStudentEmail em renderPerfilTab).
  // Não existe botão "Perfil" pro professor na barra de abas, então essa é
  // a única porta de entrada; closeStudentPerfil() é a saída (botão
  // "← Voltar à Gestão" que só aparece nesse modo).
  function openStudentPerfil(email) {
    if (currentUser.substituto) return; // substituto não abre o Perfil dos alunos
    viewingStudentEmail = email;
    switchTab('perfil');
  }

  function closeStudentPerfil() {
    viewingStudentEmail = null;
    switchTab('gestao');
  }

  // Nota da prova diagnóstica (0 a 100), por aluno — não vem de
  // student_module_progress (que só sabe "concluiu ou não" pro módulo
  // progressMode:'flag' da prova, sem o valor da nota) e sim direto de
  // student_activity_state, a mesma tabela que shared/progress-sync.js já
  // mantém atualizada com o `state` completo de cada atividade. A prova
  // (turmas/*/atividades/prova-*.html) salva `state.nota` (0 a 100 pontos)
  // ao concluir — ver finishExam() lá. progress_key segue o mesmo
  // ACTIVITY_LOCATION da prova: `prova_<turma>`. Usado tanto pelo
  // Relatório de Notas ("Nota da Prova") quanto por Lançar Notas (coluna
  // "Prova", que escala pra 0-10 — ver loadNotas).
  async function fetchNotaProvaByStudent() {
    const { data } = await sbClient.from('student_activity_state').select('student_email, state').eq('progress_key', `prova_${cfg.id}`);
    const map = {};
    (data || []).forEach(r => {
      if (r.state && typeof r.state.nota === 'number') map[r.student_email] = r.state.nota;
    });
    return map;
  }

  // Mesma ideia de fetchNotaProvaByStudent(), mas pra alimentar a coluna
  // "Nota 3" automaticamente quando a turma define cfg.nota3ActivityLocation
  // (só a turma Sistemas define isso hoje, pra Prova Final — ver
  // turmas/sistemas/config.js). Sem esse campo, a coluna volta a ser o
  // <input> manual de sempre (ver loadNotas/renderPerfilTab).
  async function fetchNota3AutoByStudent() {
    if (!cfg.nota3ActivityLocation) return {};
    const { data } = await sbClient.from('student_activity_state').select('student_email, state').eq('progress_key', cfg.nota3ActivityLocation);
    const map = {};
    (data || []).forEach(r => {
      if (r.state && typeof r.state.nota === 'number') map[r.student_email] = r.state.nota;
    });
    return map;
  }

  // "Pior desempenho": praticamente não fez nenhuma atividade (progresso
  // médio entre as matérias quase zero) OU a maioria das matérias está
  // abaixo de 50% de conclusão — usado tanto pro alerta sempre visível
  // (renderRelatorioNotas) quanto pro destaque dentro do relatório
  // completo (gerarRelatorioNotasCompleto). Ignora a matéria "Prova" (não
  // é "atividade" no sentido de progresso de trilha) e matéria sem
  // nenhuma trilha visível pro aluno (materiaPercentForStudent null).
  function piorDesempenhoInfo(materias, progressRows, studentEmail) {
    const pcts = materias
      .filter(m => m.key !== 'prova')
      .map(m => materiaPercentForStudent(m, progressRows, studentEmail))
      .filter(p => p !== null);
    if (pcts.length === 0) return { overallPct: 0, abaixoDe50: 0, total: 0, isPior: false };
    const overallPct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
    const abaixoDe50 = pcts.filter(p => p < 50).length;
    const praticamenteNada = overallPct < 5;
    const maioriaAbaixoDe50 = abaixoDe50 > pcts.length / 2;
    return { overallPct, abaixoDe50, total: pcts.length, isPior: praticamenteNada || maioriaAbaixoDe50 };
  }

  // Não mostra mais a tabela completa (todo mundo, todas as colunas) —
  // só um alerta com quem está com pior desempenho, pra chamar atenção
  // sem lotar a tela. A tabela completa continua disponível pelo botão
  // "Gerar Relatório Completo" (ver gerarRelatorioNotasCompleto).
  async function renderRelatorioNotas() {
    const materias = cfg.materias || [];
    const students = turmaStudents();
    const tbody = document.getElementById('relatorioNotasBody');

    if (!sbClient) { tbody.innerHTML = noSupabaseRow(3); return; }
    if (students.length === 0) { tbody.innerHTML = noStudentsRow(3); return; }

    await calendarioCarregado; // % por matéria = só o bimestre atual (materiaPercentForStudent)
    const { data: progressRows } = await fetchTurmaProgressRows();
    const progressByStudent = {};
    (progressRows || []).forEach(r => {
      progressByStudent[r.student_email] = progressByStudent[r.student_email] || [];
      progressByStudent[r.student_email].push(r);
    });

    const piores = students
      .map(u => ({ u, info: piorDesempenhoInfo(materias, progressByStudent[u.email] || [], u.email) }))
      .filter(r => r.info.isPior)
      .sort((a, b) => a.info.overallPct - b.info.overallPct);

    tbody.innerHTML = piores.length === 0
      ? `<tr><td colspan="3" style="color:var(--ink-dim); text-align:center; padding:14px;">Nenhum aluno com desempenho abaixo do esperado.</td></tr>`
      : piores.map(({ u, info }) => `<tr><td>${u.nome}</td><td style="color:var(--blood-bright); font-weight:700;">${info.overallPct}%</td><td>${info.abaixoDe50}/${info.total}</td></tr>`).join('');
  }

  // Abre uma aba só com a tabela completa (todo mundo, todas as colunas —
  // o mesmo conteúdo que o antigo Relatório de Notas mostrava direto na
  // tela) e aciona a impressão, igual gerarPdfChamadaMes — os alunos com
  // pior desempenho (ver piorDesempenhoInfo) saem destacados em vermelho.
  // A nota por MATÉRIA é a mesma fórmula/bimestre de "Lançar Notas" (lê o
  // mesmo #notasBimestre selecionado ali) — antes essa coluna só mostrava
  // % de conclusão (sem separar por bimestre); as 4 colunas "Média B1-B4"
  // (a média antiga de 4 campos, sem distinção por matéria) saem de cena.
  // Notas de UM bimestre pra turma inteira, aluno por aluno — mesma conta
  // de Lançar Notas (nota1 geral, Prova/Nota 3 automáticas ou digitadas,
  // Recuperação, nota final por matéria com peso e nota manual). Base do
  // Relatório Completo e do "Fechar bimestre" (que grava exatamente isto).
  // Bimestre já fechado devolve o que foi congelado em grades, sem
  // recalcular nada — as trilhas/progresso dele podem nem existir mais.
  // porAluno[email] = { g, pRows, nota1, nota2, nota3, nota4, notaProva
  // (0–100, só exibição), notasMateria: { [materiaKey]: nota | null } }.
  async function calcNotasBimestreTurma(bimestre) {
    const materias = materiasParaNotas();
    const nota3Auto = !!cfg.nota3ActivityLocation;
    await Promise.all([fetchBimestreDates(), fetchTrilhaBimestre(), fetchMateriaPesos()]);
    const fechado = bimestreFechado(bimestre);

    const [gradesRes, progressRes, notaProvaByStudent, nota3AutoByStudent] = await Promise.all([
      sbClient.from('grades').select('*').eq('turma', cfg.id).eq('bimestre', bimestre),
      fechado ? Promise.resolve({ data: [] }) : fetchTurmaProgressRows(),
      fechado ? Promise.resolve({}) : fetchNotaProvaByStudent(),
      (!fechado && nota3Auto) ? fetchNota3AutoByStudent() : Promise.resolve({}),
    ]);

    const gradesByStudent = {};
    (gradesRes.data || []).forEach(r => { gradesByStudent[r.student_email] = r; });
    const progressByStudent = {};
    (progressRes.data || []).forEach(r => {
      progressByStudent[r.student_email] = progressByStudent[r.student_email] || [];
      progressByStudent[r.student_email].push(r);
    });

    // Mesma regra de "Lançar Notas": Prova/Nota 3 só contam se a trilha
    // delas foi atribuída a ESTE bimestre.
    const provaKey = provaTrilhaKey();
    const provaEhDesteBimestre = provaKey && trilhaBimestreCache[provaKey] === bimestre;
    const nota3TrilhaKey = cfg.nota3TrilhaKey || null;
    const nota3EhDesteBimestre = nota3TrilhaKey && trilhaBimestreCache[nota3TrilhaKey] === bimestre;

    const porAluno = {};
    turmaStudents().forEach(u => {
      const pRows = progressByStudent[u.email] || [];
      const g = gradesByStudent[u.email] || {};

      if (fechado) {
        const congeladas = g.notas_congeladas || {};
        porAluno[u.email] = {
          g, pRows,
          nota1: g.nota1 ?? 0, nota2: g.nota2 ?? null, nota3: g.nota3 ?? null, nota4: g.nota4 ?? null,
          notaProva: (g.nota2 === null || g.nota2 === undefined) ? undefined : Math.round(g.nota2 * 10),
          notasMateria: Object.fromEntries(materias.map(m => [m.key, parseNotaManual(congeladas[m.key])])),
        };
        return;
      }

      // nota1 (não aparece como coluna): % geral do bimestre até 5,0 — ver loadNotas.
      const pctGeral = bimestrePortalPercentForStudent(bimestre, pRows, u.email);
      const nota1 = pctGeral === null ? 0 : Math.round((pctGeral / 100) * 5 * 100) / 100;

      // Aluno com conteúdo adaptado (cfg.notasManuaisFor, ex. Engel) — ver
      // notaManual em loadNotas: Prova/Nota 3 vêm direto de `grades`, não
      // dos lookups automáticos abaixo.
      const notaManual = (cfg.notasManuaisFor || []).includes(u.email);
      const notaProva = notaProvaByStudent[u.email];

      let n2, n3;
      if (notaManual) {
        n2 = g.nota2 ?? 0;
        n3 = g.nota3 ?? 0;
      } else {
        n2 = (provaEhDesteBimestre && notaProva !== undefined) ? Math.round((notaProva / 10) * 100) / 100 : 0;
        if (nota3Auto) {
          const notaAuto = nota3AutoByStudent[u.email];
          n3 = (nota3EhDesteBimestre && notaAuto !== undefined) ? Math.round((notaAuto / 10) * 100) / 100 : 0;
        } else {
          n3 = g.nota3 ?? 0;
        }
      }
      const n4 = g.nota4 ?? '';

      const notasMateria = {};
      materias.forEach(m => {
        const manual = notaManualMateria(g, m.key);
        if (manual !== null) { notasMateria[m.key] = manual; return; }
        if (m.notaSoManual) { notasMateria[m.key] = null; return; } // sem nota lançada ainda
        const pctMateria = bimestreMateriaPercentForStudent(m, bimestre, pRows, u.email);
        if (pctMateria === null) { notasMateria[m.key] = null; return; }
        const mn1 = Math.round((pctMateria / 100) * 10 * 100) / 100;
        notasMateria[m.key] = aplicarRecuperacao(calcMedia(mn1, n2, n3, pesoMateria(m)), n4);
      });

      porAluno[u.email] = { g, pRows, nota1, nota2: n2, nota3: n3, nota4: n4, notaProva, notasMateria };
    });

    return { materias, fechado, porAluno };
  }

  async function gerarRelatorioNotasCompleto() {
    if (!sbClient) return;
    // Mesmo motivo de gerarPdfChamadaMes: abre a aba já aqui, síncrono
    // dentro do clique, senão o navegador bloqueia o popup.
    const printWin = window.open('', '_blank');
    const students = turmaStudents();
    const bimestre = parseInt(document.getElementById('notasBimestre').value, 10);

    const { materias, fechado, porAluno } = await calcNotasBimestreTurma(bimestre);

    const linhas = students.map(u => {
      const a = porAluno[u.email];
      const notaProvaCell = `<td>${a.notaProva === undefined ? '—' : a.notaProva + '/100'}</td>`;

      const notasMateria = materias.map(m => a.notasMateria[m.key]);
      const materiaCells = notasMateria.map(nota => `<td>${nota === null ? '—' : nota.toFixed(2)}</td>`).join('');

      const notasValidas = notasMateria.filter(nota => nota !== null);
      const mediaGeral = notasValidas.length
        ? (notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length).toFixed(2)
        : '—';

      // Destaque de pior desempenho olha o progresso do bimestre ATUAL — não
      // faz sentido num bimestre já fechado (o conteúdo pode nem existir mais).
      const info = fechado ? { isPior: false } : piorDesempenhoInfo(materias, a.pRows, u.email);
      const linhaClasse = info.isPior ? ' class="pior"' : '';
      const aviso = info.isPior ? ' ⚠️' : '';

      return `<tr${linhaClasse}><td class="aluno">${u.nome}${aviso}</td>${notaProvaCell}${materiaCells}<td class="media">${mediaGeral}</td></tr>`;
    }).join('');

    const materiaHead = materias.map(m => `<th>${m.label}</th>`).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relatório de Notas — ${cfg.label} — ${BIMESTRE_LABELS[bimestre]}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  p.sub { font-size: 11px; color: #555; margin: 0 0 14px; }
  table { border-collapse: collapse; width: 100%; font-size: 9px; }
  th, td { border: 1px solid #999; padding: 3px 4px; text-align: center; }
  th.aluno, td.aluno { text-align: left; white-space: nowrap; }
  td.media { font-weight: bold; }
  tr.pior { background: #fdecea; }
  tr.pior td.aluno { color: #b3261e; font-weight: bold; }
  p.legenda { margin-top: 10px; font-size: 10px; color: #555; }
</style></head>
<body>
  <h1>Relatório de Notas — ${cfg.label}</h1>
  <p class="sub">${BIMESTRE_LABELS[bimestre]} — Gerado em ${new Date().toLocaleString('pt-BR')}</p>
  <table>
    <thead><tr><th class="aluno">Aluno</th><th>Nota da Prova</th>${materiaHead}<th>Média Geral</th></tr></thead>
    <tbody>${linhas}</tbody>
  </table>
  <p class="legenda">⚠️ = pior desempenho (quase nenhuma atividade feita, ou a maioria das matérias abaixo de 50%)</p>
</body></html>`;

    if (!printWin) return;
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  }

  // "Acessou o portal" é aproximado pela existência de uma linha em
  // student_activity: o heartbeat (shared/activity-tracker.js) grava/atualiza
  // essa linha assim que a plataforma carrega pro aluno, então sua ausência
  // significa que o aluno nunca abriu o portal. "Fez alguma atividade" olha
  // student_module_progress, mas não basta ter linha lá — o sync roda pra
  // TODO módulo a cada carregamento (mesmo com progresso zero), então só
  // conta como atividade de fato quando algum módulo tem progress_current > 0
  // ou completed = true.
  function hasRealProgress(rows) {
    return (rows || []).some(r => (r.progress_current || 0) > 0 || r.completed);
  }

  // Junta o que antes eram dois relatórios separados ("Atividade em Tempo
  // Real" e "Relatório de Inatividade") num só: a classificação de
  // inatividade (nunca acessou / acessou sem fazer nada) continua
  // decidindo a ordem — quem precisa de atenção sobe pro topo — mas quem
  // JÁ tem progresso real agora mostra o status AO VIVO (Ativo/Inativo/
  // Offline) mais onde está e há quanto tempo, em vez de um "ATIVO" genérico.
  const LIVE_STATUS_META = {
    active: { label: '🟢 Ativo', color: 'var(--green)' },
    idle: { label: '🟡 Inativo', color: 'var(--yellow)' },
    offline: { label: '⚫ Offline', color: 'var(--ink-dim)' },
  };

  async function renderRelatorioInatividade() {
    const tbody = document.getElementById('inatividadeBody');
    const resumo = document.getElementById('inatividadeResumo');
    if (!sbClient) { tbody.innerHTML = noSupabaseRow(5); return; }

    const students = turmaStudents();
    if (students.length === 0) { tbody.innerHTML = noStudentsRow(5); return; }

    const [activityRes, progressRes] = await Promise.all([
      sbClient.from('student_activity').select('*').eq('turma', cfg.id),
      fetchTurmaProgressRows()
    ]);

    const activityByStudent = {};
    (activityRes.data || []).forEach(r => { activityByStudent[r.student_email] = r; });

    const progressByStudent = {};
    (progressRes.data || []).forEach(r => {
      progressByStudent[r.student_email] = progressByStudent[r.student_email] || [];
      progressByStudent[r.student_email].push(r);
    });

    const linhas = students.map(u => {
      const activity = activityByStudent[u.email];
      const temProgresso = hasRealProgress(progressByStudent[u.email]);

      let rank, label, color;
      if (!activity) {
        rank = 0; label = 'NUNCA ACESSOU'; color = 'var(--blood-bright)';
      } else if (!temProgresso) {
        rank = 1; label = 'SEM ATIVIDADE'; color = 'var(--yellow)';
      } else {
        const meta = LIVE_STATUS_META[computeGestaoDisplayStatus(activity)] || LIVE_STATUS_META.offline;
        rank = 2; label = meta.label; color = meta.color;
      }

      const ultimaVez = activity && (activity.updated_at || activity.last_interaction_at)
        ? new Date(activity.updated_at || activity.last_interaction_at).toLocaleString('pt-BR')
        : '—';
      const ondeEsta = activity ? (activity.location_label || activity.location || '--') : '—';
      const haQuanto = activity ? formatDurationSince(activity.location_started_at) : '—';

      return { email: u.email, nome: u.nome, rank, label, color, ondeEsta, haQuanto, ultimaVez };
    });

    // Quem precisa de atenção (nunca acessou / acessou sem fazer nada) sobe
    // pro topo — o professor não deveria ter que rolar a turma toda pra achar.
    linhas.sort((a, b) => a.rank - b.rank || a.nome.localeCompare(b.nome, 'pt-BR'));

    const nuncaCount = linhas.filter(l => l.rank === 0).length;
    const semAtividadeCount = linhas.filter(l => l.rank === 1).length;
    if (resumo) {
      resumo.textContent = `${nuncaCount} de ${students.length} aluno(s) nunca acessaram o portal; ${semAtividadeCount} acessaram mas não fizeram nenhuma atividade ainda.`;
    }

    tbody.innerHTML = linhas.map(l => `
      <tr>
        <td><button class="aluno-nome-link" data-perfil-email="${l.email}" title="Ver o Perfil (progresso completo) deste aluno">${l.nome}</button></td>
        <td><span style="color:${l.color}; font-weight:800;">${l.label}</span></td>
        <td>${l.ondeEsta}</td>
        <td>${l.haQuanto}</td>
        <td>${l.ultimaVez}</td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-perfil-email]').forEach(btn => {
      btn.addEventListener('click', () => openStudentPerfil(btn.getAttribute('data-perfil-email')));
    });
  }

  // "Concluiu alguma atividade hoje" olha completed_at (quando o módulo
  // virou completed=true de verdade), NÃO updated_at — updated_at muda
  // toda vez que o portal carrega, mesmo sem progresso nenhum (ver
  // syncAllModulesProgress), então usá-lo aqui marcaria como "ativo hoje"
  // qualquer aluno que só abriu o portal. Gerado sob demanda (botão), não
  // em tempo real, porque é um retrato do dia, não um placar ao vivo.
  async function gerarRelatorioAtividadeDia() {
    const container = document.getElementById('atividadeDiaResultado');
    const btn = document.getElementById('btnGerarAtividadeDia');
    if (!sbClient) { container.innerHTML = `<p style="color:var(--ink-dim); font-size:12px;">Configure o Supabase (shared/supabase-config.js) para usar este relatório.</p>`; return; }

    const students = turmaStudents();
    if (students.length === 0) { container.innerHTML = `<p style="color:var(--ink-dim); font-size:12px;">Nenhum aluno cadastrado nesta turma.</p>`; return; }

    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ Gerando...';

    const today = todayStr();
    const [progressRes, attendanceRes, activityRes] = await Promise.all([
      sbClient.from('student_module_progress').select('student_email, completed_at').eq('turma', cfg.id).eq('completed', true),
      sbClient.from('attendance').select('student_email, presente').eq('turma', cfg.id).eq('data', today),
      sbClient.from('student_activity').select('student_email, active_seconds_today, activity_date').eq('turma', cfg.id)
    ]);

    btn.disabled = false;
    btn.textContent = original;

    const concluiuHoje = new Set(
      (progressRes.data || [])
        .filter(r => r.completed_at && new Date(r.completed_at).toISOString().slice(0, 10) === today)
        .map(r => r.student_email)
    );
    const ausentesHoje = new Set(
      (attendanceRes.data || []).filter(r => r.presente === false).map(r => r.student_email)
    );

    // activity_date vem como 'YYYY-MM-DD' (coluna date do Postgres) — compara
    // string direto com todayStr(), sem passar por new Date() (evita timezone).
    const segundosHojeByStudent = {};
    (activityRes.data || []).forEach(r => {
      segundosHojeByStudent[r.student_email] = (r.activity_date === today) ? (r.active_seconds_today || 0) : 0;
    });

    const semAtividade = students
      .filter(u => !concluiuHoje.has(u.email) && !ausentesHoje.has(u.email))
      .map(u => ({ nome: u.nome, segundos: segundosHojeByStudent[u.email] || 0 }));

    if (semAtividade.length === 0) {
      container.innerHTML = `<p style="color:var(--green); font-size:12px;">🎉 Todos os alunos presentes hoje já concluíram alguma atividade.</p>`;
      return;
    }

    // Quem ficou menos tempo logado aparece primeiro — é quem mais precisa de atenção.
    semAtividade.sort((a, b) => a.segundos - b.segundos || a.nome.localeCompare(b.nome, 'pt-BR'));

    container.innerHTML = `
      <p style="font-size:11px; color:var(--ink-dim); margin:0 0 8px;">${semAtividade.length} de ${students.length} aluno(s) sem nenhuma atividade concluída hoje:</p>
      <table class="audit-table">
        <thead><tr><th>Aluno</th><th>Tempo logado hoje</th></tr></thead>
        <tbody>
          ${semAtividade.map(s => `<tr><td>${s.nome}</td><td>${formatTempoLogado(s.segundos)}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
  }

  // Aproximação de "tempo com o portal aberto hoje" — soma de intervalos entre
  // heartbeats de shared/activity-tracker.js (ver trigger track_daily_active_seconds
  // em sql/supabase-student-activity.sql). Não é um cronômetro de sessão exato.
  function formatTempoLogado(segundos) {
    if (!segundos) return '—';
    const h = Math.floor(segundos / 3600);
    const m = Math.round((segundos % 3600) / 60);
    if (h > 0) return `${h}h ${m}min`;
    if (m > 0) return `${m}min`;
    return '< 1min';
  }

  // ---------- Relatório por Aluno (Gestão → Relatórios, só professor) ----------
  // Duas partes, pra UM aluno escolhido no <select>:
  //  1. tempo no portal nos últimos 15 dias (total + por dia), com a média
  //     da turma no mesmo período;
  //  2. atividades LIBERADAS que ele não concluiu — só as trilhas do
  //     bimestre atual que já chegaram no "Liberar em" (trilhasAtuaisParaAluno);
  //     trilha futura não é pendência.
  // (O "tempo em cada atividade × colegas" foi tirado a pedido do professor:
  // deixava o relatório grande demais. student_time_log continua guardando
  // o tempo por local, se um dia voltar.)
  // O tempo vem de student_time_log (sql/student-time-log.sql): um gatilho
  // no banco soma, a cada heartbeat de shared/activity-tracker.js, os
  // segundos em que o aluno estava ATIVO em cada local, por dia. Sem
  // histórico antes desse SQL rodar.
  const RELATORIO_ALUNO_DIAS = 15;
  let relatorioAlunoUltimo = null; // { nome, html } — usado pelo botão Imprimir / PDF

  function escRelAluno(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // 'YYYY-MM-DD' de `offset` dias atrás, no fuso local (igual todayStr).
  function diaStrAtras(offset) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function mediana(nums) {
    if (!nums.length) return 0;
    const s = nums.slice().sort((a, b) => a - b);
    const meio = Math.floor(s.length / 2);
    return s.length % 2 ? s[meio] : (s[meio - 1] + s[meio]) / 2;
  }

  function popularSelectRelatorioAluno() {
    const sel = document.getElementById('relatorioAlunoSelect');
    if (!sel) return;
    const atual = sel.value;
    sel.innerHTML = `<option value="">— escolha o aluno —</option>` +
      turmaStudents().map(u => `<option value="${escRelAluno(u.email)}">${escRelAluno(u.nome)}</option>`).join('');
    if (atual && turmaStudents().some(u => u.email === atual)) sel.value = atual;
  }

  // Linhas de student_time_log da turma (paginado, igual
  // fetchTurmaProgressRows). Tabela ausente (SQL ainda não rodado) volta
  // com `error` — o relatório mostra um aviso em vez de travar.
  async function fetchTurmaTimeLog(desde) {
    const PAGE = 1000;
    const all = [];
    for (let from = 0; ; from += PAGE) {
      let q = sbClient.from('student_time_log').select('student_email, dia, location, seconds').eq('turma', cfg.id);
      if (desde) q = q.gte('dia', desde);
      const { data, error } = await q.order('student_email').order('dia').order('location').range(from, from + PAGE - 1);
      if (error) return { data: all, error };
      all.push(...(data || []));
      if (!data || data.length < PAGE) return { data: all, error: null };
    }
  }

  // Atividades (módulos de entrega) que o aluno já deveria ter disponíveis
  // agora, agrupadas por matéria → trilha. Recuperação fica de fora (não
  // está em cfg.materias, mesma regra de notas/ranking).
  function atividadesLiberadasParaAluno(email) {
    const grupos = [];
    (cfg.materias || []).filter(m => isMateriaVisibleToEmail(m, email)).forEach(m => {
      trilhasAtuaisParaAluno(m.trilhas || [], email).forEach(t => {
        const mods = modulosDeEntrega(t);
        if (mods.length) grupos.push({ materia: m, trilha: t, mods });
      });
    });
    return grupos;
  }

  function situacaoModulo(row) {
    if (!row) return { feito: false, texto: 'Não começou' };
    const total = row.progress_total || 1;
    const atual = row.progress_current || 0;
    if (row.completed || atual >= total) return { feito: true, texto: 'Concluída' };
    if (atual > 0) return { feito: false, texto: `Em andamento (${atual}/${total})` };
    return { feito: false, texto: 'Não começou' };
  }

  function formatDiaCurto(diaStr) {
    const [a, mth, d] = diaStr.split('-').map(Number);
    const semana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][new Date(a, mth - 1, d).getDay()];
    return `${semana} ${String(d).padStart(2, '0')}/${String(mth).padStart(2, '0')}`;
  }

  async function gerarRelatorioAluno() {
    const container = document.getElementById('relatorioAlunoResultado');
    const btn = document.getElementById('btnGerarRelatorioAluno');
    const btnPrint = document.getElementById('btnImprimirRelatorioAluno');
    const msg = t => `<p style="color:var(--ink-dim); font-size:12px;">${t}</p>`;
    if (!sbClient) { container.innerHTML = msg('Configure o Supabase (shared/supabase-config.js) para usar este relatório.'); return; }
    popularSelectRelatorioAluno();
    const email = document.getElementById('relatorioAlunoSelect').value;
    const aluno = turmaStudentByEmail(email);
    if (!aluno) { container.innerHTML = msg('Escolha um aluno na lista.'); return; }

    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ Gerando...';
    relatorioAlunoUltimo = null;
    btnPrint.disabled = true;

    try {
      await calendarioCarregado;
      const hoje = todayStr();
      const desde15 = diaStrAtras(RELATORIO_ALUNO_DIAS - 1);
      const grupos = atividadesLiberadasParaAluno(email);

      const [progressRes, timeRes] = await Promise.all([fetchTurmaProgressRows(), fetchTurmaTimeLog(desde15)]);
      const progressRows = progressRes.data || [];
      const timeRows = timeRes.data || [];
      const tempoIndisponivel = !!timeRes.error;

      // ---- 1. Tempo nos últimos 15 dias ----
      const dias = Array.from({ length: RELATORIO_ALUNO_DIAS }, (_, i) => diaStrAtras(RELATORIO_ALUNO_DIAS - 1 - i));
      const porDia = Object.fromEntries(dias.map(d => [d, 0]));
      const total15PorAluno = {};
      turmaStudents().forEach(u => { total15PorAluno[u.email] = 0; });
      timeRows.forEach(r => {
        if (r.dia < desde15 || r.dia > hoje) return;
        if (r.student_email in total15PorAluno) total15PorAluno[r.student_email] += r.seconds || 0;
        if (r.student_email === email && r.dia in porDia) porDia[r.dia] += r.seconds || 0;
      });
      const total15 = total15PorAluno[email] || 0;
      const totaisTurma = Object.values(total15PorAluno);
      const mediaTurma15 = totaisTurma.length ? totaisTurma.reduce((a, b) => a + b, 0) / totaisTurma.length : 0;
      const diasComAcesso = dias.filter(d => porDia[d] > 0).length;
      const maxDia = Math.max(1, ...dias.map(d => porDia[d]));

      const diasHtml = dias.slice().reverse().map(d => {
        const s = porDia[d];
        const pct = Math.round((s / maxDia) * 100);
        return `<div class="rel-aluno-dia" title="${formatDiaCurto(d)}: ${formatTempoLogado(s)}">
          <span class="rel-aluno-dia-label">${formatDiaCurto(d)}</span>
          <span class="rel-aluno-barra"><span style="width:${s ? Math.max(pct, 2) : 0}%"></span></span>
          <span class="rel-aluno-dia-valor">${formatTempoLogado(s)}</span>
        </div>`;
      }).join('');

      const avisoTempo = tempoIndisponivel
        ? `<p class="rel-aluno-aviso">⚠️ O registro de tempo ainda não está disponível no Supabase (rode <code>sql/student-time-log.sql</code>). As pendências abaixo continuam valendo.</p>`
        : `<p class="rel-aluno-nota">Tempo ativo = aba do portal aberta e visível, com o aluno mexendo no mouse/teclado nos últimos 2 minutos. O registro começou quando o recurso foi instalado — antes disso não há histórico.</p>`;

      const parte1 = `
        <h4 class="rel-aluno-titulo">⏱️ Tempo no portal — últimos ${RELATORIO_ALUNO_DIAS} dias</h4>
        ${avisoTempo}
        ${tempoIndisponivel ? '' : `
        <div class="rel-aluno-resumo">
          <div><strong>${formatTempoLogado(total15)}</strong><span>total do aluno</span></div>
          <div><strong>${diasComAcesso}/${RELATORIO_ALUNO_DIAS}</strong><span>dias com acesso</span></div>
          <div><strong>${formatTempoLogado(Math.round(mediaTurma15))}</strong><span>média da turma</span></div>
          <div><strong>${formatTempoLogado(Math.round(mediana(totaisTurma)))}</strong><span>mediana da turma</span></div>
        </div>
        <div class="rel-aluno-dias">${diasHtml}</div>`}`;

      // ---- 2. Atividades liberadas e não concluídas ----
      const rowDe = (trilhaKey, modKey) => progressRows.find(r => r.student_email === email && r.trilha_key === trilhaKey && r.module_key === modKey);
      let totalAtividades = 0, totalPendentes = 0;
      const porMateria = new Map();
      grupos.forEach(g => {
        g.mods.forEach(mod => {
          totalAtividades++;
          const sit = situacaoModulo(rowDe(g.trilha.key, mod.key));
          if (sit.feito) return;
          totalPendentes++;
          if (!porMateria.has(g.materia.key)) porMateria.set(g.materia.key, { materia: g.materia, trilhas: new Map() });
          const pm = porMateria.get(g.materia.key);
          if (!pm.trilhas.has(g.trilha.key)) pm.trilhas.set(g.trilha.key, { trilha: g.trilha, itens: [] });
          pm.trilhas.get(g.trilha.key).itens.push({ mod, sit });
        });
      });

      const pendenciasHtml = totalPendentes === 0
        ? `<p style="color:var(--green); font-size:12px;">🎉 Nenhuma pendência: o aluno concluiu todas as ${totalAtividades} atividade(s) liberadas neste bimestre.</p>`
        : [...porMateria.values()].map(pm => `
          <div class="rel-aluno-materia">
            <div class="rel-aluno-materia-nome">${escRelAluno(pm.materia.icon || '📚')} ${escRelAluno(pm.materia.label)}</div>
            ${[...pm.trilhas.values()].map(pt => {
              const ini = trilhaWindow(pt.trilha).inicio;
              const liberada = ini ? ` <span class="rel-aluno-dim">(liberada em ${ini.split('-').reverse().join('/')})</span>` : '';
              return `<div class="rel-aluno-trilha">${escRelAluno(pt.trilha.label)}${liberada}</div>
                <ul class="rel-aluno-lista">${pt.itens.map(it => `<li>${escRelAluno(it.mod.title || it.mod.key)} — <span class="${it.sit.texto === 'Não começou' ? 'rel-aluno-ruim' : 'rel-aluno-meio'}">${it.sit.texto}</span></li>`).join('')}</ul>`;
            }).join('')}
          </div>`).join('');

      const parte2 = `
        <h4 class="rel-aluno-titulo">📌 Atividades que ficaram por fazer</h4>
        <p class="rel-aluno-nota">${totalPendentes} de ${totalAtividades} atividade(s) já liberadas neste bimestre não foram concluídas. Trilhas que ainda não foram liberadas não entram.</p>
        ${pendenciasHtml}`;

      const cabecalho = `<p class="rel-aluno-cabecalho"><strong>${escRelAluno(aluno.nome)}</strong> · ${escRelAluno(cfg.label)} · gerado em ${new Date().toLocaleString('pt-BR')}</p>`;
      const html = `<div class="rel-aluno">${cabecalho}${parte1}${parte2}</div>`;
      container.innerHTML = html;
      relatorioAlunoUltimo = { nome: aluno.nome, html };
      btnPrint.disabled = false;
    } catch (err) {
      console.error('[relatorio-aluno] falha ao gerar:', err);
      container.innerHTML = msg('Não foi possível gerar o relatório agora. Tente de novo em instantes.');
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  }

  // Mesmo esquema do PDF da Presença: abre a aba síncrona no clique (senão
  // o navegador bloqueia o popup) e chama a impressão — "Salvar como PDF".
  function imprimirRelatorioAluno() {
    if (!relatorioAlunoUltimo) return;
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    printWin.document.write(`<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relatório do Aluno — ${escRelAluno(relatorioAlunoUltimo.nome)}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 11px; }
  h4 { font-size: 13px; margin: 16px 0 4px; }
  .rel-aluno-cabecalho { font-size: 14px; margin: 0 0 8px; }
  .rel-aluno-nota, .rel-aluno-aviso { color: #555; margin: 0 0 6px; }
  .rel-aluno-resumo { display: flex; gap: 16px; margin: 6px 0 10px; }
  .rel-aluno-resumo div { border: 1px solid #999; padding: 4px 8px; }
  .rel-aluno-resumo strong { display: block; font-size: 13px; }
  .rel-aluno-dia { display: grid; grid-template-columns: 70px 1fr 60px; gap: 6px; align-items: center; margin: 1px 0; }
  .rel-aluno-barra { display: block; height: 8px; border: 1px solid #bbb; }
  .rel-aluno-barra span { display: block; height: 100%; background: #555; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .rel-aluno-materia-nome { font-weight: bold; margin-top: 6px; }
  .rel-aluno-trilha { margin: 2px 0 0 8px; }
  .rel-aluno-lista { margin: 2px 0 4px 8px; }
  .rel-aluno-dim { color: #666; font-size: 10px; }
  .rel-aluno-ruim { color: #b3261e; font-weight: bold; }
</style></head>
<body>${relatorioAlunoUltimo.html}</body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  }

  function toggleGestaoSection(headEl) {
    headEl.closest('.collapsible-card').classList.toggle('expanded');
  }

  // Token temporário do professor pra "Dar visto"/"Pular etapa" dentro de
  // uma atividade (shared/professor-visto.js) — substitui digitar a senha
  // real numa tela que fisicamente é do aluno. gerar_professor_token()/
  // professor_token_atual() (sql/supabase-setup-completo.sql, bloco 13) só
  // funcionam pra quem é professor.
  let professorTokenCountdownInterval = null;
  let professorTokenExpiresAtMs = null;

  function formatMMSS(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function showProfessorToken(token, expiresAt) {
    const valueEl = document.getElementById('professorTokenValue');
    const statusEl = document.getElementById('professorTokenStatus');
    if (!valueEl || !statusEl) return;

    if (professorTokenCountdownInterval) clearInterval(professorTokenCountdownInterval);
    professorTokenExpiresAtMs = expiresAt ? new Date(expiresAt).getTime() : null;
    valueEl.textContent = token || '------';

    if (!token || !professorTokenExpiresAtMs) {
      statusEl.textContent = '';
      return;
    }

    const tick = () => {
      const restante = professorTokenExpiresAtMs - Date.now();
      if (restante <= 0) {
        statusEl.textContent = 'Expirado — gere um novo.';
        valueEl.textContent = '------';
        clearInterval(professorTokenCountdownInterval);
        return;
      }
      statusEl.textContent = `Expira em ${formatMMSS(restante)}`;
    };
    tick();
    professorTokenCountdownInterval = setInterval(tick, 1000);
  }

  async function renderProfessorTokenBox() {
    if (!sbClient || currentUser.role !== 'professor') return;
    const { data, error } = await sbClient.rpc('professor_token_atual');
    if (error) return;
    const row = Array.isArray(data) ? data[0] : data;
    showProfessorToken(row ? row.token : null, row ? row.expires_at : null);
  }

  async function gerarProfessorToken() {
    if (!sbClient) return;
    const statusEl = document.getElementById('professorTokenStatus');
    const { data, error } = await sbClient.rpc('gerar_professor_token');
    if (error) {
      if (statusEl) statusEl.textContent = 'Não foi possível gerar o token.';
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    showProfessorToken(row ? row.token : null, row ? row.expires_at : null);
  }

  function renderGestaoTab() {
    renderGestaoAlunos();
    renderGestaoToggles();
    renderGestaoBimestres();
    renderGestaoTrilhaBimestre();
    loadChamada();
    renderRelatorioPresenca();
    loadNotas();
    renderRelatorioNotas();
    renderRelatorioInatividade();
    popularSelectRelatorioAluno();

    if (!sbClient) return;
    // "Atividade e Inatividade" junta os dois relatórios antigos — usa a
    // cadência mais rápida (realtime + 15s) do antigo "Atividade em Tempo
    // Real", já que agora essa mesma tabela também carrega o status ao vivo.
    if (!gestaoActivityRealtimeStarted) {
      gestaoActivityRealtimeStarted = true;
      sbClient.channel('realtime_gestao_activity_' + cfg.id)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'student_activity', filter: `turma=eq.${cfg.id}` }, () => renderRelatorioInatividade())
        .subscribe();
    }
    if (!gestaoActivityPollStarted) {
      gestaoActivityPollStarted = true;
      setInterval(renderRelatorioInatividade, 15000);
    }
  }

  // Grava games_unlocked pra TODOS os alunos da turma de uma vez — usado
  // pela chave "Jogos" de dentro da Gestão. Não existe controle por aluno
  // individual (ver renderGestaoToggles).
  async function setGamesUnlockedForTurma(unlocked) {
    if (!sbClient) return;
    const rows = turmaStudents().map(u => ({ student_email: u.email, games_unlocked: unlocked, updated_at: new Date().toISOString() }));
    if (rows.length) await sbClient.from('student_overrides').upsert(rows, { onConflict: 'student_email' });
  }

  function setupGestaoButtons() {
    document.getElementById('toggleClipboard').addEventListener('click', async () => {
      await toggleClipboardBlock();
      renderGestaoToggles();
    });
    // Chave verde (livre) → vermelha (só no horário) e vice-versa; "Salvar
    // horário" grava os horários mantendo a chave como está.
    document.getElementById('toggleHorario').addEventListener('click', async () => {
      if (await salvarHorarioAcesso(!gestaoHorarioAcesso.restrito)) renderGestaoToggles();
    });
    document.getElementById('btnSalvarHorarioAcesso').addEventListener('click', async () => {
      if (await salvarHorarioAcesso(gestaoHorarioAcesso.restrito)) renderGestaoToggles();
    });
    document.getElementById('toggleJogos').addEventListener('click', async () => {
      const ligar = !document.getElementById('toggleJogos').classList.contains('on');
      await setGamesUnlockedForTurma(ligar);
      renderGestaoToggles();
    });
    document.getElementById('toggleNotas').addEventListener('click', async () => {
      await toggleNotasLiberadas();
      renderGestaoToggles();
    });

    // Chave 🔑 (ao lado do Perfil, só professor): abre o card mínimo
    // (número + tempo restante) e gera um token novo sozinho se o atual já
    // expirou (ou nunca existiu), ver showProfessorToken/gerarProfessorToken.
    // "🔄 Renovar token" gera um novo antes da hora: gerar_professor_token()
    // apaga o token vigente, então o número antigo para de valer na hora.
    document.getElementById('btnQuickToken').addEventListener('click', async () => {
      document.getElementById('professorTokenOverlay').style.display = 'flex';
      if (!professorTokenExpiresAtMs || professorTokenExpiresAtMs <= Date.now()) {
        await gerarProfessorToken();
      }
    });
    document.getElementById('btnRenovarProfessorToken').addEventListener('click', async () => {
      const btn = document.getElementById('btnRenovarProfessorToken');
      btn.disabled = true;
      try { await gerarProfessorToken(); } finally { btn.disabled = false; }
    });
    document.getElementById('btnFecharProfessorToken').addEventListener('click', () => {
      document.getElementById('professorTokenOverlay').style.display = 'none';
    });

    document.getElementById('chamadaData').addEventListener('change', () => {
      document.getElementById('chamadaResumoBox').style.display = 'none';
      loadChamada();
    });
    document.getElementById('btnFinalizarChamada').addEventListener('click', finalizarChamada);
    document.getElementById('btnCopiarResumoChamada').addEventListener('click', async () => {
      const texto = document.getElementById('chamadaResumoTexto').value;
      const statusEl = document.getElementById('chamadaResumoStatus');
      try {
        await navigator.clipboard.writeText(texto);
        statusEl.textContent = 'Copiado!';
        const btn = document.getElementById('btnCopiarResumoChamada');
        btn.classList.add('copiado');
        btn.textContent = '✔ Copiado';
        setTimeout(() => { btn.classList.remove('copiado'); btn.textContent = '📋 Copiar resumo'; }, 1600);
      } catch (e) {
        statusEl.textContent = 'Não foi possível copiar automaticamente — selecione e copie manualmente.';
      }
    });
    document.getElementById('btnGerarPdfPresenca').addEventListener('click', gerarPdfChamadaMes);
    document.getElementById('btnGerarRelatorioNotas').addEventListener('click', gerarRelatorioNotasCompleto);
    document.getElementById('notasBimestre').addEventListener('change', () => {
      notasBimestreEscolhidoManual = true;
      loadNotas();
    });
    setToggleState('toggleNotasBaixas', destacarNotasBaixasOn());
    document.getElementById('toggleNotasBaixas').addEventListener('click', () => {
      try { localStorage.setItem(NOTAS_BAIXAS_KEY, destacarNotasBaixasOn() ? '0' : '1'); } catch (e) {}
      pintarNotasBaixas();
    });
    document.getElementById('toggleNotasAltas').addEventListener('click', () => {
      try { localStorage.setItem(NOTAS_ALTAS_KEY, destacarNotasAltasOn() ? '0' : '1'); } catch (e) {}
      pintarNotasBaixas();
    });
    document.getElementById('toggleNotasManuais').addEventListener('click', () => setEdicaoNotasManuais(!edicaoNotasManuais));
    document.getElementById('btnSalvarNotas').addEventListener('click', salvarNotas);
    document.getElementById('btnSalvarBimestreDatas').addEventListener('click', salvarBimestreDatas);
    document.getElementById('tblGestaoBimestresBody').addEventListener('click', onAcaoBimestreNotas);
    document.getElementById('btnSalvarTrilhaBimestre').addEventListener('click', salvarTrilhaBimestre);
    document.getElementById('btnGerarAtividadeDia').addEventListener('click', gerarRelatorioAtividadeDia);
    document.getElementById('btnGerarRankingTurma').addEventListener('click', gerarRelatorioRanking);
    document.getElementById('btnGerarRelatorioAluno').addEventListener('click', gerarRelatorioAluno);
    document.getElementById('btnImprimirRelatorioAluno').addEventListener('click', imprimirRelatorioAluno);
    document.getElementById('relatorioAlunoSelect').addEventListener('focus', popularSelectRelatorioAluno);
  }

  // ---------- Tabs principais ----------
  function switchTab(tabName) {
    checkGamesUnlock();

    document.querySelectorAll('#mainNavTabs .tab-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tabName);
    });
    document.getElementById('tabContentAulas').style.display = (tabName === 'aulas') ? 'block' : 'none';
    document.getElementById('tabContentJogos').style.display = (tabName === 'jogos') ? 'block' : 'none';
    const tabContentPerfil = document.getElementById('tabContentPerfil');
    if (tabContentPerfil) tabContentPerfil.style.display = (tabName === 'perfil') ? 'block' : 'none';
    document.getElementById('tabContentGestao').style.display = (tabName === 'gestao') ? 'block' : 'none';

    if (tabName === 'gestao') renderGestaoTab();

    if (tabName === 'perfil') {
      renderPerfilTab();
      if (typeof window.resumeActivityHeartbeat === 'function') {
        window.resumeActivityHeartbeat('perfil', 'Perfil — Vendo progresso');
      }
    }

    if (tabName === 'jogos') {
      document.getElementById('gameSelector').style.display = currentGameKey ? 'none' : 'block';
      document.getElementById('gameFrameArea').style.display = currentGameKey ? 'flex' : 'none';
      if (!currentGameKey && typeof window.resumeActivityHeartbeat === 'function') {
        window.resumeActivityHeartbeat('jogos_selecao', 'Jogos — Escolhendo um jogo');
      }
    }

    if (tabName === 'aulas') {
      const materiaAberta = document.getElementById('materiaDetailArea').style.display !== 'none';
      if (!materiaAberta) {
        if (typeof window.resumeActivityHeartbeat === 'function') {
          window.resumeActivityHeartbeat('aulas_materias', 'Aulas & Atividades — Escolhendo matéria');
        }
      } else {
        const select = document.getElementById('trilhaSelect');
        const activeSub = select ? select.value : document.querySelector('#aulasSubTabPages .subtab-page')?.id.replace('subTabContent_', '');
        const trilha = navTrilhas().find(t => t.key === activeSub);
        if (trilha && !openModuleFrame[activeSub] && typeof window.resumeActivityHeartbeat === 'function') {
          window.resumeActivityHeartbeat(`aulas_${activeSub}`, `${trilha.label} — Escolhendo módulo`);
        }
      }
    }
  }

  // ---------- Jogos (compartilhados por todas as turmas) ----------
  // Função, não const: o texto do QuizRush depende de currentUser.role, que
  // só existe depois que init() resolve a sessão — um objeto literal aqui
  // seria avaliado no parse do script, antes disso.
  function buildGames() {
    return {
    hacker: {
      title: 'GitHack OS — Terminal de Cibersegurança',
      desc: 'Ambiente de simulação sandbox. Conecte-se à subnet para realizar ataques e defesas.',
      icon: '🕹️',
      src: '../../games/jogo.html'
    },
    digitacao: {
      title: 'Digitação — Treino de Velocidade',
      desc: 'Pratique velocidade e precisão de digitação.',
      icon: '⌨️',
      src: '../../games/digitacao.html'
    },
    campominado: {
      title: 'Campo Minado — Lógica com JavaScript',
      desc: 'Programe o robô em JavaScript para desviar das minas e chegar à bandeira.',
      icon: '💣',
      src: '../../games/campo-minado.html'
    },
    quizrush: {
      title: 'QuizRush da Turma',
      desc: currentUser.role === 'professor'
        ? 'Hospede uma partida ao vivo pra turma: um quiz de múltipla escolha (perguntas do gabarito de uma aula) ou um Quizz Prático, com problemas curtos de código em JavaScript e SQL.'
        : 'Entre na partida ao vivo criada pelo professor — quiz ou Quizz Prático, onde você escreve o código. Quem acerta mais rápido, marca mais pontos!',
      icon: '🎉',
      src: '../../games/quizrush.html'
    },
    fugadobug: {
      title: 'Fuga do Bug — Plataforma de Armadilhas',
      desc: 'Fuja da branch antes do rebase te apagar: 10 fases, da mais tranquila à mais cruel, com plataformas falsas, serras, blocos que caem, molas e chão que desmorona. Morrer faz parte — memorize o padrão e chegue na bandeira.',
      icon: '🩹',
      src: '../../games/fuga-do-bug.html'
    },
    corridadobug: {
      title: 'Corrida do Bug — QuizRush ao Vivo',
      desc: currentUser.role === 'professor'
        ? 'Hospede uma corrida ao vivo: a turma inteira joga a mesma fase do Fuga do Bug, mas cada checkpoint é uma pergunta (do gabarito de uma aula) — acertou segue a corrida, errou volta pro checkpoint anterior, errar 2x seguidas no mesmo checkpoint custa pontos.'
        : 'Entre na corrida ao vivo criada pelo professor: mesma fase do Fuga do Bug pra todo mundo, mas cada checkpoint tem uma pergunta — acertar rápido rende mais pontos, errar 2x seguidas no mesmo checkpoint custa pontos.',
      icon: '🏁',
      src: '../../games/corrida-do-bug.html'
    },
    torredocodigo: {
      title: 'Torre do Código — A Escalada do Programador',
      desc: 'Suba os 13 andares da torre programando em JavaScript: cada terminal pede um código (do primeiro let até listas, laços, switch e objetos) que vira poder do herói na batalha, até o Rei Bug no topo. Vale ranking da turma, não vale nota.',
      icon: '🗼',
      src: '../../games/torre-do-codigo.html'
    },
    // Só professor: o jogo exige login de professor (é ele quem projeta, os
    // alunos jogam pelo celular de controle, professor/joystick.html, sem
    // login). Abre em nova aba em vez do iframe — precisa de tela cheia,
    // teclado e áudio liberados na própria página.
    ...(currentUser.role === 'professor' ? {
      punholendario: {
        title: 'Punho Lendário — Luta com o Celular de Controle',
        desc: 'Jogo de luta para projetar na sala: os alunos jogam usando o celular como controle.',
        icon: '🥋',
        src: '../../professor/luta.html',
        novaAba: true
      }
    } : {})
    };
  }

  function renderGameCards() {
    const GAMES = buildGames();
    const grid = document.getElementById('gameCardGrid');
    // Descrição não aparece mais no card (poluía a grade) — continua
    // disponível assim que o jogo abre, em #gameFrameDesc (ver openGame).
    grid.innerHTML = Object.keys(GAMES).map(key => {
      const g = GAMES[key];
      return `
        <div class="game-card" onclick="PortalCore.openGame('${key}')">
          <div class="icon">${g.icon}</div>
          <h3>${g.title.split(' — ')[0]}</h3>
        </div>`;
    }).join('');
  }

  function openGame(key) {
    const game = buildGames()[key];
    if (!game) return;
    if (game.novaAba) { window.open(game.src, '_blank'); return; }

    currentGameKey = key;
    document.getElementById('gameSelector').style.display = 'none';
    zoomInScreen(document.getElementById('gameFrameArea'), 'flex');
    document.getElementById('gameFrameTitle').textContent = game.title;
    document.getElementById('gameFrameDesc').textContent = game.desc;

    const frame = document.getElementById('gameFrame');
    frame.onload = () => applyA11yToIframe(frame);
    frame.src = `${game.src}?user=${encodeURIComponent(paramUser)}&name=${encodeURIComponent(currentUser.nome)}&turma=${encodeURIComponent(cfg.id)}`;

    if (typeof window.pauseActivityHeartbeat === 'function') window.pauseActivityHeartbeat();
  }

  function closeGame() {
    currentGameKey = null;
    zoomOutThenShow(document.getElementById('gameFrameArea'), document.getElementById('gameSelector'), 'block');
    document.getElementById('gameFrame').src = 'about:blank';
    if (typeof window.resumeActivityHeartbeat === 'function') {
      window.resumeActivityHeartbeat('jogos_selecao', 'Jogos — Escolhendo um jogo');
    }
  }

  // ---------- Módulos de trilha (Aulas & Atividades) ----------
  function openModule(trilhaKey, modKey) {
    const trilha = navTrilhas().find(t => t.key === trilhaKey);
    const mod = findModule(trilhaKey, modKey);
    if (!mod || (trilha && isModuleLocked(trilha, mod))) return;

    document.getElementById(`moduleSelector_${trilhaKey}`).style.display = 'none';
    // 'flex' (não 'block') — .module-frame-modal centraliza o box do modal
    // via flexbox (ver shared/platform-core.css).
    // Módulo do layout novo (telaCheia: true no config.js — docs/padrao-trilhas.md):
    // ocupa a tela inteira, por cima até da barra do portal, só com a faixa
    // "← Voltar" no topo — as telas dos alunos são pequenas. Os demais abrem
    // no modal de sempre.
    document.getElementById(`moduleFrameArea_${trilhaKey}`).classList.toggle('module-frame-modal--cheia', !!mod.telaCheia);
    zoomInScreen(document.getElementById(`moduleFrameArea_${trilhaKey}`), 'flex');
    document.getElementById(`moduleFrameTitle_${trilhaKey}`).textContent = mod.title;
    document.getElementById(`moduleFrameDesc_${trilhaKey}`).textContent = mod.desc || '';

    const frame = document.getElementById(`moduleFrame_${trilhaKey}`);
    frame.onload = () => applyA11yToIframe(frame);
    frame.src = `${mod.src}?user=${encodeURIComponent(paramUser)}&name=${encodeURIComponent(currentUser.nome)}&turma=${encodeURIComponent(cfg.id)}`;

    openModuleFrame[trilhaKey] = modKey;
    if (typeof window.pauseActivityHeartbeat === 'function') window.pauseActivityHeartbeat();
  }

  function closeModule(trilhaKey) {
    const closedModKey = openModuleFrame[trilhaKey];
    zoomOutOverlay(document.getElementById(`moduleFrameArea_${trilhaKey}`));
    document.getElementById(`moduleSelector_${trilhaKey}`).style.display = 'block';
    document.getElementById(`moduleFrame_${trilhaKey}`).src = 'about:blank';
    openModuleFrame[trilhaKey] = false;
    checkGamesUnlock();

    const trilha = navTrilhas().find(t => t.key === trilhaKey);
    if (trilha) {
      const grid = document.querySelector(`#moduleSelector_${trilhaKey} .card-grid`);
      if (grid) grid.innerHTML = buildModuleCardsHtml(trilha);

      const closedMod = closedModKey && findModule(trilhaKey, closedModKey);
      if (closedMod) syncModuleProgress(trilha, closedMod).then(renderRankingBadge);
    }
    if (trilha && typeof window.resumeActivityHeartbeat === 'function') {
      window.resumeActivityHeartbeat(`aulas_${trilhaKey}`, `${trilha.label} — Escolhendo módulo`);
    }
  }

  // Escuta o aviso que shared/progress-sync.js manda do <iframe> do módulo
  // toda vez que o progresso local muda — inclusive no exato momento em que
  // um desafio/pergunta é concluído. Sem isso, card/cadeado/ranking só
  // refletiam a conclusão quando o aluno clicava "← Voltar" (closeModule);
  // qualquer outra forma de sair (fechar a aba, deslogar, trocar de tela)
  // deixava o progresso "preso" só no localStorage, sem nunca subir pro
  // student_module_progress — dando a sensação de que nada foi salvo.
  function setupProgressSyncListener() {
    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data) return;
      // Relé de som de clique (ver applyClickRelay) — quem decide se toca
      // e com qual timbre é sempre o documento pai, nunca o iframe (é aqui
      // que prefs.clickSound/prefs.cursorKey vivem de verdade).
      if (data.pfClickSound) {
        if (prefs.clickSound && window.PortalAudio) window.PortalAudio.playClick(prefs.cursorKey);
        return;
      }
      if (!data.pfProgressSync || !data.activityLocation) return;
      navTrilhas().forEach(trilha => {
        (trilha.modules || []).forEach(mod => {
          if ((mod.progressKey || '').replace(/_progress_$/, '') !== data.activityLocation) return;
          const grid = document.querySelector(`#moduleSelector_${trilha.key} .card-grid`);
          if (grid) grid.innerHTML = buildModuleCardsHtml(trilha);
          checkGamesUnlock();
          syncModuleProgress(trilha, mod).then(renderRankingBadge);
        });
      });
    });
  }

  // ---------- Acessibilidade ----------
  // Módulos/jogos abrem em <iframe> com documento próprio — as variáveis de
  // fonte/cor/tema do documento pai não "vazam" pra dentro sozinhas. Aplica
  // as mesmas variáveis no <html> do iframe (mesma origem, então
  // contentDocument é acessível) sempre que ele carrega e sempre que o
  // professor/aluno troca alguma preferência com um módulo já aberto. Essa
  // função hoje cobre tanto os 2 controles de acessibilidade (fontScale,
  // libras é tratado à parte) quanto a personalização de verdade (fonte,
  // cor de destaque, tema, cursor) — um único ponto de propagação pro
  // iframe em vez de dois, já que as ~58 telas de atividade consomem as
  // MESMAS variáveis CSS (--user-font*, --green*, --bg/--panel/...) que o
  // shell.
  function applyA11yToIframe(frame) {
    if (!frame || !frame.src || frame.src === 'about:blank') return;
    try {
      const doc = frame.contentDocument;
      const root = doc && doc.documentElement;
      if (!root) return;
      const fontPreset = FONT_PRESETS[prefs.fontFamily] || FONT_PRESETS.pixel;
      root.style.setProperty('--user-font', fontPreset.body);
      root.style.setProperty('--user-font-display', fontPreset.display);
      root.style.setProperty('--user-font-scale', a11y.fontScale);
      applyAccentVars(root, prefs.accentKey);
      applyThemeVars(root, prefs.theme);
      applyCursorVars(doc, prefs.cursorKey);
      applyClickRelay(doc);
    } catch (e) {
      // iframe ainda não carregou o document, ou é de outra origem — ignora
    }
  }

  // Clique DENTRO de um <iframe> de atividade não borbulha pro documento
  // pai (são dois documentos separados) — sem isso, o som de clique
  // (shared/portal-audio.js) só tocaria fora de qualquer atividade, que é
  // onde o aluno passa a MENOR parte do tempo. Injeta um listener leve, uma
  // vez só por iframe (guarda por id, igual o <style> do cursor), que só
  // avisa o pai por postMessage — quem decide se toca o som (prefs.clickSound
  // já pode ter mudado depois da injeção) e com qual timbre é sempre o pai.
  function applyClickRelay(doc) {
    if (doc.getElementById('pfClickRelay')) return;
    const tag = doc.createElement('script');
    tag.id = 'pfClickRelay';
    tag.textContent = `
      document.addEventListener('click', function () {
        try { window.parent.postMessage({ pfClickSound: true }, window.location.origin); } catch (e) {}
      }, true);
    `;
    doc.head.appendChild(tag);
  }

  function applyA11yToOpenIframes() {
    applyA11yToIframe(document.getElementById('gameFrame'));
    document.querySelectorAll('iframe[id^="moduleFrame_"]').forEach(applyA11yToIframe);
  }

  function applyA11y() {
    const root = document.documentElement;
    const btnFontStyle = document.getElementById('btnFontStyle');
    const fontPreset = FONT_PRESETS[prefs.fontFamily] || FONT_PRESETS.pixel;
    root.style.setProperty('--user-font', fontPreset.body);
    root.style.setProperty('--user-font-display', fontPreset.display);
    if (btnFontStyle) {
      btnFontStyle.classList.toggle('on', prefs.fontFamily !== 'pixel');
      btnFontStyle.title = `Fonte: ${fontPreset.label} — clique para trocar (ou use 🎨 Personalizar no Perfil)`;
    }
    root.style.setProperty('--user-font-scale', a11y.fontScale);
    applyA11yToOpenIframes();
  }

  // ---------- Personalização do portal (cor, tema, avatar, fundo, cursor) ----------
  // (fonte fica em applyA11y()/applyA11yToIframe() acima, junto com
  // fontScale — um controle só pra tudo que é "--user-font*")
  function applyAccentVars(root, accentKey) {
    const preset = ACCENT_PRESETS[accentKey] || ACCENT_PRESETS.padrao;
    if (preset.fx) root.setAttribute('data-accent-fx', preset.fx);
    else root.removeAttribute('data-accent-fx');
    if (preset.anim) {
      const c = accentAnimColors(preset.anim);
      root.style.setProperty('--green', c.accent);
      root.style.setProperty('--green-dim', c.accentDim);
    } else if (preset.accent) {
      root.style.setProperty('--green', preset.accent);
      root.style.setProperty('--green-dim', preset.accentDim);
    } else {
      root.style.removeProperty('--green');
      root.style.removeProperty('--green-dim');
    }
  }

  // Cores animadas (Arco-íris/Aurora): a cor do momento sai do relógio, então
  // o shell e qualquer atividade aberta num iframe mostram sempre a MESMA cor.
  // Com "reduzir movimento" do sistema ligado, fica parada numa cor só.
  const reduzMovimento = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function accentAnimColors(anim) {
    const t = reduzMovimento() ? 0 : performance.now() / 1000;
    const hue = anim === 'aurora'
      ? 200 + 80 * Math.sin(t * 0.6)   // 120 (verde) ↔ 280 (roxo)
      : (t * 40) % 360;                // volta inteira no círculo a cada 9s
    return { accent: `hsl(${hue.toFixed(0)} 100% 58%)`, accentDim: `hsl(${hue.toFixed(0)} 75% 38%)` };
  }

  let accentAnimTimer = null;
  function syncAccentAnim() {
    const preset = ACCENT_PRESETS[prefs.accentKey] || ACCENT_PRESETS.padrao;
    if (!preset.anim || reduzMovimento()) {
      clearInterval(accentAnimTimer);
      accentAnimTimer = null;
      return;
    }
    if (accentAnimTimer) return;
    accentAnimTimer = setInterval(() => {
      const atual = ACCENT_PRESETS[prefs.accentKey] || ACCENT_PRESETS.padrao;
      if (!atual.anim) return;
      const c = accentAnimColors(atual.anim);
      const roots = [document.documentElement];
      const frames = [document.getElementById('gameFrame'), ...document.querySelectorAll('iframe[id^="moduleFrame_"]')];
      frames.forEach(f => {
        try { if (f && f.contentDocument && f.contentDocument.documentElement) roots.push(f.contentDocument.documentElement); } catch (e) {}
      });
      roots.forEach(r => {
        r.style.setProperty('--green', c.accent);
        r.style.setProperty('--green-dim', c.accentDim);
      });
    }, 120);
  }

  function applyThemeVars(root, theme) {
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
      Object.entries(LIGHT_THEME_VARS).forEach(([k, v]) => root.style.setProperty(k, v));
    } else {
      root.removeAttribute('data-theme');
      Object.keys(LIGHT_THEME_VARS).forEach(k => root.style.removeProperty(k));
    }
  }

  function applyCursorVars(doc, cursorKey) {
    const preset = CURSOR_PRESETS[cursorKey] || CURSOR_PRESETS.default;
    let tag = doc.getElementById('pfCursorOverride');
    if (cursorKey && cursorKey !== 'default') {
      if (!tag) {
        tag = doc.createElement('style');
        tag.id = 'pfCursorOverride';
        doc.head.appendChild(tag);
      }
      tag.textContent = `*{ cursor:${preset.css} !important; }`;
    } else if (tag) {
      tag.remove();
    }
    applyCursorTrail(doc, preset.trail);
  }

  // Rastro do cursor (foguete, varinha, cometa, sabre): a cada movimento
  // solta uma partícula no ponto do mouse que some sozinha (Web Animations
  // API, sem CSS extra — funciona igual no shell e dentro do iframe da
  // atividade, que não carrega este CSS). Um handler por documento, trocado
  // a cada chamada; sem rastro com "reduzir movimento" ligado.
  const TRAILS = {
    faiscas: (p) => {
      p.textContent = Math.random() < 0.5 ? '✦' : '✧';
      Object.assign(p.style, { color: '#ffe14d', fontSize: `${10 + Math.random() * 10}px`, textShadow: '0 0 6px #ffb000' });
      return { dx: (Math.random() - 0.5) * 40, dy: 10 + Math.random() * 30, ms: 800 };
    },
    arcoiris: (p, n) => {
      const cor = `hsl(${(n * 12) % 360} 100% 60%)`;
      Object.assign(p.style, { width: '10px', height: '10px', borderRadius: '50%', background: cor, boxShadow: `0 0 8px ${cor}` });
      return { dx: 0, dy: 0, ms: 600 };
    },
    fogo: (p) => {
      const s = 6 + Math.random() * 8;
      Object.assign(p.style, { width: `${s}px`, height: `${s}px`, borderRadius: '50%', background: 'radial-gradient(circle, #fff3b0, #ff9500 55%, #ff3b30)' });
      return { dx: (Math.random() - 0.5) * 16, dy: 18 + Math.random() * 18, ms: 500 };
    },
    luz: (p) => {
      Object.assign(p.style, { width: '6px', height: '6px', borderRadius: '50%', background: '#e9ffff', boxShadow: '0 0 6px #00f0ff, 0 0 14px #00f0ff' });
      return { dx: 0, dy: 0, ms: 450 };
    },
  };
  function applyCursorTrail(doc, kind) {
    if (!reduzMovimento() && kind && doc.__pfTrailStop && doc.__pfTrailKind === kind) return;
    if (doc.__pfTrailStop) {
      doc.__pfTrailStop();
      doc.__pfTrailStop = null;
    }
    doc.__pfTrailKind = kind;
    if (!kind || reduzMovimento()) return;
    if (kind === 'linha') {
      doc.__pfTrailStop = iniciarLinhaPendurada(doc);
      return;
    }
    if (!TRAILS[kind]) return;
    let ultimo = 0, n = 0;
    const handler = (ev) => {
      const agora = performance.now();
      if (agora - ultimo < 28 || !doc.body) return;
      ultimo = agora;
      const p = doc.createElement('span');
      p.setAttribute('aria-hidden', 'true');
      Object.assign(p.style, { position: 'fixed', left: `${ev.clientX}px`, top: `${ev.clientY}px`, pointerEvents: 'none', zIndex: '2147483647', lineHeight: '1' });
      const { dx, dy, ms } = TRAILS[kind](p, n++);
      doc.body.appendChild(p);
      const anim = p.animate([
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.2)`, opacity: 0 },
      ], { duration: ms, easing: 'ease-out' });
      anim.onfinish = () => p.remove();
    };
    doc.addEventListener('pointermove', handler, { passive: true });
    doc.__pfTrailStop = () => doc.removeEventListener('pointermove', handler);
  }

  // Cursor Carretel: uma linha de costura sai do carretel e fica pendurada,
  // balançando com o movimento do mouse. É uma corda de Verlet (pontos
  // ligados por distância fixa, com gravidade) desenhada num <canvas> fixo
  // por cima da página, sem capturar cliques. O laço de animação para
  // sozinho quando a linha sossega e volta no próximo movimento. Ao sair do
  // documento (ou entrar no iframe da atividade, que tem a própria linha) a
  // linha some. Devolve a função que desliga tudo.
  function iniciarLinhaPendurada(doc) {
    const win = doc.defaultView;
    if (!win || !doc.body) return () => {};
    const canvas = doc.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, { position: 'fixed', left: '0', top: '0', width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: '2147483647' });
    doc.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const N = 26, SEG = 6, GRAVIDADE = 0.35, AMORTECE = 0.985, PASSO_MS = 1000 / 60;
    // Ponto do SVG do carretel de onde a linha sai, relativo ao hotspot (5,2).
    const SAIDA_X = 17, SAIDA_Y = 15;
    const ancora = { x: 0, y: 0 };
    let pts = null, raf = 0, parado = 0, acumulado = 0, ultimoQuadro = 0;

    function redimensionar() {
      const dpr = win.devicePixelRatio || 1;
      canvas.width = Math.round(win.innerWidth * dpr);
      canvas.height = Math.round(win.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function soltar() {
      pts = Array.from({ length: N }, (_, i) => ({ x: ancora.x, y: ancora.y + i * SEG, px: ancora.x, py: ancora.y + i * SEG }));
    }
    // Um passo fixo de física; devolve o maior deslocamento do passo.
    function passo() {
      const chao = win.innerHeight - 2;
      for (let i = 1; i < N; i++) {
        const p = pts[i];
        const vx = (p.x - p.px) * AMORTECE, vy = (p.y - p.py) * AMORTECE;
        p.px = p.x; p.py = p.y;
        p.x += vx; p.y += vy + GRAVIDADE;
      }
      pts[0].x = pts[0].px = ancora.x;
      pts[0].y = pts[0].py = ancora.y;
      for (let k = 0; k < 12; k++) {
        for (let i = 0; i < N - 1; i++) {
          const a = pts[i], b = pts[i + 1];
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 0.0001;
          const corr = (d - SEG) / d;
          if (i === 0) { b.x -= dx * corr; b.y -= dy * corr; }
          else { a.x += dx * corr / 2; a.y += dy * corr / 2; b.x -= dx * corr / 2; b.y -= dy * corr / 2; }
        }
        for (let i = 1; i < N; i++) {
          const p = pts[i];
          if (p.y > chao) { p.y = chao; p.px = p.x - (p.x - p.px) * 0.6; }
        }
      }
      let mov = 0;
      for (let i = 1; i < N; i++) mov = Math.max(mov, Math.abs(pts[i].x - pts[i].px) + Math.abs(pts[i].y - pts[i].py));
      return mov;
    }
    function desenhar() {
      ctx.clearRect(0, 0, win.innerWidth, win.innerHeight);
      if (!pts) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < N - 1; i++) {
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2);
      }
      ctx.lineTo(pts[N - 1].x, pts[N - 1].y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#8e1414'; ctx.lineWidth = 3.2; ctx.stroke();
      ctx.strokeStyle = '#e0413a'; ctx.lineWidth = 1.8; ctx.stroke();
      // Tracejado claro por cima dá a textura de fio torcido.
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.setLineDash([]);
      // Nózinho na ponta.
      ctx.beginPath();
      ctx.arc(pts[N - 1].x, pts[N - 1].y, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = '#8e1414'; ctx.fill();
    }
    function quadro(agora) {
      raf = 0;
      if (!pts) return;
      acumulado += Math.min(agora - (ultimoQuadro || agora), 100);
      ultimoQuadro = agora;
      let mov = 0;
      while (acumulado >= PASSO_MS) { mov = Math.max(mov, passo()); acumulado -= PASSO_MS; }
      desenhar();
      parado = mov < 0.02 ? parado + 1 : 0;
      if (parado < 30) raf = win.requestAnimationFrame(quadro);
    }
    function acordar() {
      parado = 0;
      if (!raf) { ultimoQuadro = 0; acumulado = PASSO_MS; raf = win.requestAnimationFrame(quadro); }
    }
    function esconder() {
      if (raf) win.cancelAnimationFrame(raf);
      raf = 0;
      pts = null;
      desenhar();
    }

    const mover = (ev) => {
      if (ev.pointerType && ev.pointerType !== 'mouse') return;
      ancora.x = ev.clientX + SAIDA_X;
      ancora.y = ev.clientY + SAIDA_Y;
      if (!pts) soltar();
      acordar();
    };
    const sair = (ev) => {
      const destino = ev.relatedTarget;
      if (!destino || destino.tagName === 'IFRAME') esconder();
    };
    const aoRedimensionar = () => { redimensionar(); if (pts) acordar(); };

    redimensionar();
    doc.addEventListener('pointermove', mover, { passive: true });
    doc.addEventListener('pointerout', sair, { passive: true });
    win.addEventListener('resize', aoRedimensionar);
    return () => {
      esconder();
      doc.removeEventListener('pointermove', mover);
      doc.removeEventListener('pointerout', sair);
      win.removeEventListener('resize', aoRedimensionar);
      canvas.remove();
    };
  }

  // Fundo decorativo de emojis, atrás de TUDO (z-index negativo) — só
  // "aparece" nas bordas/áreas vazias da tela, porque .card/.panel têm
  // fundo sólido por cima. Posições/tamanhos sorteados uma vez só (mesma
  // sessão), pra não mudar layout/"piscar" a cada re-render.
  function toggleBgEmojiLayer(on) {
    let layer = document.getElementById('pfBgEmojiLayer');
    if (!on) {
      if (layer) layer.remove();
      return;
    }
    if (layer) return;
    if (!bgEmojiLayoutCache) {
      bgEmojiLayoutCache = Array.from({ length: 18 }, (_, i) => ({
        emoji: BG_PATTERN_EMOJIS[i % BG_PATTERN_EMOJIS.length],
        top: Math.round(Math.random() * 100),
        left: Math.round(Math.random() * 100),
        size: 20 + Math.round(Math.random() * 44),
        opacity: (0.04 + Math.random() * 0.08).toFixed(2),
        rotate: Math.round(Math.random() * 40 - 20),
      }));
    }
    layer = document.createElement('div');
    layer.id = 'pfBgEmojiLayer';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = bgEmojiLayoutCache.map(item => `<span style="position:absolute; top:${item.top}%; left:${item.left}%; font-size:${item.size}px; opacity:${item.opacity}; transform:rotate(${item.rotate}deg);">${item.emoji}</span>`).join('');
    document.body.insertBefore(layer, document.body.firstChild);
  }

  // Aplica tudo que NÃO é fonte (isso já é feito por applyA11y): cor de
  // destaque, tema, emoji do botão de perfil, fundo decorativo e cursor —
  // no documento principal e, via applyA11yToOpenIframes(), em qualquer
  // atividade já aberta.
  function applyPrefsVisuals() {
    const root = document.documentElement;
    applyAccentVars(root, prefs.accentKey);
    applyThemeVars(root, prefs.theme);
    applyCursorVars(document, prefs.cursorKey);
    syncAccentAnim();
    const emojiSpan = document.getElementById('perfilTabEmoji');
    if (emojiSpan) emojiSpan.textContent = prefs.avatarEmoji || '👤';
    toggleBgEmojiLayer(prefs.bgPattern);
    applyA11yToOpenIframes();
  }

  // Som do portal (shared/portal-audio.js) — chamado uma vez em init().
  // Dois cuidados por causa da política de autoplay do navegador (só deixa
  // criar/tocar áudio depois de um gesto real do usuário):
  //   1) Clique no documento PRINCIPAL toca o som na hora (o próprio clique
  //      já É o gesto) — cobre toda a barra/abas/cards fora de um iframe.
  //   2) Se a preferência de música ambiente já vinha LIGADA (carregada do
  //      banco em fetchUserPreferences, antes de renderShell), só começa a
  //      tocar de verdade no 1º clique/tecla da sessão — chamar
  //      startAmbient() direto aqui em init() falharia silenciosamente
  //      (nenhum gesto ainda aconteceu nesta página).
  function setupPortalAudio() {
    if (!window.PortalAudio) return;
    document.addEventListener('click', () => {
      if (prefs.clickSound) window.PortalAudio.playClick(prefs.cursorKey);
    });
    if (prefs.ambientMusic) {
      const unlock = () => { window.PortalAudio.startAmbient(); };
      document.addEventListener('click', unlock, { once: true });
      document.addEventListener('keydown', unlock, { once: true });
    }
  }

  // Busca a linha salva do usuário (se existir) uma vez, em init() — antes
  // de renderShell(), pra já nascer com o emoji/tema certos sem "flash" do
  // default. Sem linha ainda (1ª vez do usuário): mantém os defaults de
  // `prefs` (ver declaração no topo) — só é criada no banco no 1º save.
  async function fetchUserPreferences() {
    if (!sbClient) return;
    const { data } = await sbClient.from('user_preferences').select('*').eq('email', paramUser).maybeSingle();
    if (data) {
      prefs = {
        fontFamily: data.font_family || 'pixel',
        accentKey: data.accent_key || 'padrao',
        theme: data.theme || 'dark',
        avatarEmoji: data.avatar_emoji || '👤',
        bgPattern: !!data.bg_pattern,
        cursorKey: data.cursor_key || 'default',
        ambientMusic: !!data.ambient_music,
        clickSound: !!data.click_sound,
      };
    }
  }

  // Upsert direto (sem RPC) na própria linha — mesmo modelo self-service de
  // student_activity_state (ver sql/user-preferences.sql). Chamada a cada
  // controle trocado na modal de personalização, sem debounce: são cliques
  // discretos, não algo contínuo tipo arrastar um slider.
  async function saveUserPreferences() {
    if (!sbClient) return;
    // Duas buscas por getElementById (não um elemento cacheado numa const)
    // de propósito: cada controle troca prefs.* e IMEDIATAMENTE re-renderiza
    // o corpo da modal (rerender(), síncrono) antes desta função sequer
    // terminar o 1º await — um elemento capturado antes do await ficaria
    // "órfão" (fora do DOM) quando a Promise resolvesse, e o "Salvo ✓" nunca
    // apareceria de verdade pro usuário.
    const statusBefore = document.getElementById('personalizacaoStatus');
    if (statusBefore) statusBefore.textContent = 'Salvando...';
    const { error } = await sbClient.from('user_preferences').upsert({
      email: paramUser,
      font_family: prefs.fontFamily,
      accent_key: prefs.accentKey,
      theme: prefs.theme,
      avatar_emoji: prefs.avatarEmoji,
      bg_pattern: prefs.bgPattern,
      cursor_key: prefs.cursorKey,
      ambient_music: prefs.ambientMusic,
      click_sound: prefs.clickSound,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' });
    const statusEl = document.getElementById('personalizacaoStatus');
    if (statusEl) statusEl.textContent = error ? 'Não foi possível salvar — tente de novo.' : 'Salvo ✓';
  }

  // Modal de personalização — criada dinamicamente (mesmo padrão de
  // showAlert/showArchiveConfirm: Escape + clique fora fecham, removida do
  // DOM ao fechar), aberta pelo botão "🎨 Personalizar" da aba Perfil.
  function renderPersonalizacaoBody() {
    const fontButtons = Object.entries(FONT_PRESETS).map(([key, f]) => `
      <button type="button" class="pf-swatch-btn ${prefs.fontFamily === key ? 'active' : ''}" data-font-key="${key}" style="font-family:${f.body};">
        ${f.label}
      </button>
    `).join('');

    const accentButtons = Object.entries(ACCENT_PRESETS).map(([key, a]) => `
      <button type="button" class="pf-color-swatch ${prefs.accentKey === key ? 'active' : ''}${a.fx === 'neon' ? ' neon' : ''}" data-accent-key="${key}" title="${a.label}" aria-label="${a.label}" style="background:${a.swatch || a.accent || 'var(--green)'};${a.fx === 'neon' && a.accent ? ` --swatch-glow:${a.accent};` : ''}"></button>
    `).join('');

    const avatarButtons = AVATAR_EMOJIS.map(emoji => `
      <button type="button" class="pf-emoji-btn ${prefs.avatarEmoji === emoji ? 'active' : ''}" data-avatar-emoji="${emoji}">${emoji}</button>
    `).join('');

    const cursorButtons = CURSOR_ORDER.map(key => {
      const c = CURSOR_PRESETS[key];
      const cssAttr = c.css.replace(/"/g, '&quot;');
      return `<button type="button" class="pf-cursor-btn ${prefs.cursorKey === key ? 'active' : ''}" data-cursor-key="${key}" style="cursor:${cssAttr};"${c.trail === 'linha' ? ' title="Uma linha fica pendurada no carretel e balança ao mover o mouse"' : c.trail ? ' title="Deixa um rastro ao mover o mouse"' : ''}>${c.label}</button>`;
    }).join('');

    return `
      <div class="pf-perso-head">
        <h3 class="pf-perso-titulo">🎨 Personalizar portal</h3>
        <p class="pf-perso-sub">Suas escolhas ficam salvas na sua conta e aparecem em qualquer computador.</p>
      </div>

      <div class="pf-perso-section">
        <div class="pf-perso-label">Fonte</div>
        <div class="pf-swatch-row pf-grid-2" id="psFontRow">${fontButtons}</div>
      </div>

      <div class="pf-perso-section">
        <div class="pf-perso-label">Cor de destaque</div>
        <div class="pf-swatch-row pf-cores" id="psAccentRow">${accentButtons}</div>
      </div>

      <div class="pf-perso-section">
        <div class="pf-perso-label">Tema</div>
        <div class="pf-swatch-row pf-grid-2" id="psThemeRow">
          <button type="button" class="pf-swatch-btn ${prefs.theme === 'dark' ? 'active' : ''}" data-theme-key="dark">🌙 Escuro</button>
          <button type="button" class="pf-swatch-btn ${prefs.theme === 'light' ? 'active' : ''}" data-theme-key="light">☀️ Claro</button>
        </div>
      </div>

      <div class="pf-perso-section">
        <div class="pf-perso-label">Emoji de perfil</div>
        <div class="pf-swatch-row pf-emoji-grid" id="psAvatarRow">${avatarButtons}</div>
      </div>

      <div class="pf-perso-section">
        <div class="pf-perso-label">Cursor do mouse</div>
        <div class="pf-swatch-row pf-cursor-grid" id="psCursorRow">${cursorButtons}</div>
      </div>

      <div class="pf-perso-section">
        <div class="pf-perso-label">Fundo e som</div>
        <div class="pf-perso-opcoes">
          <label class="pf-perso-opcao">
            <span><b>✨ Fundo com emojis</b><small>Discreto, aparece mais nas bordas da tela.</small></span>
            <input type="checkbox" id="psBgPattern" ${prefs.bgPattern ? 'checked' : ''}>
          </label>
          <label class="pf-perso-opcao">
            <span><b>🎵 Música ambiente</b><small>Baixinha e sintetizada, sem baixar nada.</small></span>
            <input type="checkbox" id="psAmbientMusic" ${prefs.ambientMusic ? 'checked' : ''}>
          </label>
          <label class="pf-perso-opcao">
            <span><b>🔊 Som de clique</b><small>O timbre muda de acordo com o cursor escolhido.</small></span>
            <input type="checkbox" id="psClickSound" ${prefs.clickSound ? 'checked' : ''}>
          </label>
        </div>
      </div>

      <div class="pf-perso-pe">
        <span class="status-msg" id="personalizacaoStatus"></span>
        <button class="btn btn-secondary pf-perso-close">Fechar</button>
      </div>
    `;
  }

  function openPersonalizacao() {
    document.getElementById('pfPersoOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'pfPersoOverlay';
    overlay.className = 'pf-alert-overlay';
    document.body.appendChild(overlay);

    function close() {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);

    // Cada controle: aplica na hora (applyA11y/applyPrefsVisuals), salva no
    // banco (saveUserPreferences) e re-renderiza o corpo da modal (pra
    // destacar a opção recém-escolhida) — um único caminho de wiring, tanto
    // pra 1ª pintura quanto pras seguintes, já que innerHTML troca os nós e
    // descarta os listeners antigos junto.
    function wireControls() {
      const closeBtn = overlay.querySelector('.pf-perso-close');
      if (closeBtn) closeBtn.addEventListener('click', close);
      overlay.querySelectorAll('[data-font-key]').forEach(btn => btn.addEventListener('click', () => {
        prefs.fontFamily = btn.getAttribute('data-font-key');
        applyA11y();
        saveUserPreferences();
        rerender();
      }));
      overlay.querySelectorAll('[data-accent-key]').forEach(btn => btn.addEventListener('click', () => {
        prefs.accentKey = btn.getAttribute('data-accent-key');
        applyPrefsVisuals();
        saveUserPreferences();
        rerender();
      }));
      overlay.querySelectorAll('[data-theme-key]').forEach(btn => btn.addEventListener('click', () => {
        prefs.theme = btn.getAttribute('data-theme-key');
        applyPrefsVisuals();
        saveUserPreferences();
        rerender();
      }));
      overlay.querySelectorAll('[data-avatar-emoji]').forEach(btn => btn.addEventListener('click', () => {
        prefs.avatarEmoji = btn.getAttribute('data-avatar-emoji');
        applyPrefsVisuals();
        saveUserPreferences();
        rerender();
      }));
      overlay.querySelectorAll('[data-cursor-key]').forEach(btn => btn.addEventListener('click', () => {
        prefs.cursorKey = btn.getAttribute('data-cursor-key');
        applyPrefsVisuals();
        saveUserPreferences();
        rerender();
      }));
      const bgCb = overlay.querySelector('#psBgPattern');
      if (bgCb) bgCb.addEventListener('change', () => {
        prefs.bgPattern = bgCb.checked;
        applyPrefsVisuals();
        saveUserPreferences();
      });
      // Ligar aqui dentro é um clique de verdade — o gesto que o navegador
      // exige pra deixar criar/tocar áudio (ver shared/portal-audio.js).
      // Só startAmbient/stopAmbient ao vivo; NÃO é assim que o áudio começa
      // a tocar de novo num carregamento de página com a preferência já
      // ligada — isso é o listener de "1º clique/tecla da sessão" (ver
      // setupAmbientAudioUnlock, chamado em init()).
      const ambientCb = overlay.querySelector('#psAmbientMusic');
      if (ambientCb) ambientCb.addEventListener('change', () => {
        prefs.ambientMusic = ambientCb.checked;
        if (window.PortalAudio) { ambientCb.checked ? window.PortalAudio.startAmbient() : window.PortalAudio.stopAmbient(); }
        saveUserPreferences();
      });
      const clickCb = overlay.querySelector('#psClickSound');
      if (clickCb) clickCb.addEventListener('change', () => {
        prefs.clickSound = clickCb.checked;
        if (clickCb.checked && window.PortalAudio) window.PortalAudio.playClick(prefs.cursorKey); // prévia + já destrava o áudio
        saveUserPreferences();
      });
    }

    function rerender() {
      overlay.querySelector('.pf-alert-box').innerHTML = renderPersonalizacaoBody();
      wireControls();
    }

    overlay.innerHTML = `<div class="pf-alert-box pf-perso-box" role="dialog" aria-modal="true" aria-label="Personalizar portal">${renderPersonalizacaoBody()}</div>`;
    wireControls();
  }

  function setupVLibras() {
    const script = document.createElement('script');
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
    script.onload = () => {
      try {
        if (window.VLibras) new window.VLibras.Widget('https://vlibras.gov.br/app');
      } catch (e) { librasLoadFailed = true; }
      // O widget carrega recursos de cdn.jsdelivr.net por baixo dos panos, de
      // forma assíncrona — navegador com bloqueio de rastreamento mais estrito
      // (ex: "Tracking Prevention" do Edge) pode deixar isso travado sem
      // disparar script.onerror nenhum (o <script> em si carregou normal, só
      // o que ele tenta buscar depois é que falha). Sem checar se o widget
      // realmente terminou de se montar, clicar em 🤟 simplesmente não fazia
      // nada, sem nenhuma pista do motivo.
      // O plugin 7.x ignora o <div vw> e monta o próprio botão em
      // #vlibras-access-wrapper (shadow DOM) — é ele que diz se montou.
      setTimeout(() => { if (!document.getElementById('vlibras-access-wrapper')) librasLoadFailed = true; }, 4000);
    };
    script.onerror = () => { librasLoadFailed = true; };
    document.body.appendChild(script);
    // Atividade/jogo aberto num <iframe> tem o próprio VLibras (shared/
    // vlibras-widget.js). O da plataforma não traduz o que está dentro do
    // iframe (clique lá dentro não chega neste documento) — deixá-lo na
    // tela só dava dois botões azuis iguais, um deles inútil. Checagem
    // periódica porque o iframe também some/aparece trocando de aba.
    atualizarLibrasDaPlataforma();
    setInterval(atualizarLibrasDaPlataforma, 800);
  }

  // Iframe de atividade/jogo que está aberto E visível agora (ou null).
  function frameDeAtividadeVisivel() {
    const frames = [document.getElementById('gameFrame'), ...document.querySelectorAll('iframe[id^="moduleFrame_"]')];
    return frames.find(f => f && f.src && f.src !== 'about:blank' && f.getClientRects().length > 0) || null;
  }

  function atualizarLibrasDaPlataforma() {
    let style = document.getElementById('pfLibrasOculto');
    if (!style) {
      style = document.createElement('style');
      style.id = 'pfLibrasOculto';
      document.head.appendChild(style);
    }
    const css = frameDeAtividadeVisivel()
      ? '#vlibras-access-wrapper, #vlibras-app-root { display: none !important; }'
      : '';
    if (style.textContent !== css) style.textContent = css;
  }

  // 🤟 da barra de acessibilidade: abre o tradutor direto (antes só
  // mostrava/escondia o <div vw>, que o plugin 7.x nem usa mais — o botão
  // azul ficava sempre na tela e o 🤟 não fazia nada). Com atividade aberta,
  // abre o VLibras DE DENTRO do iframe, que é o que traduz o conteúdo dela.
  function abrirLibras() {
    const frame = frameDeAtividadeVisivel();
    let alvo = window;
    if (frame) {
      alvo = null;
      try {
        const w = frame.contentWindow;
        if (w && w.VLibrasWidget && typeof w.VLibrasWidget.open === 'function' && w.document.getElementById('vlibras-access-wrapper')) alvo = w;
      } catch (e) { /* iframe de outra origem */ }
    } else if (librasLoadFailed || !window.VLibrasWidget || typeof window.VLibrasWidget.open !== 'function' || !document.getElementById('vlibras-access-wrapper')) {
      alvo = null;
    }
    if (!alvo) {
      showToast('Libras indisponível', 'O tradutor VLibras não carregou nesta tela — pode estar sendo bloqueado pelo navegador (ex: "Rastreamento" no Edge) ou por um bloqueador de anúncios. Tente de novo em alguns segundos, outro navegador, ou libere vlibras.gov.br e cdn.jsdelivr.net nas configurações de privacidade.');
      return;
    }
    alvo.VLibrasWidget.open();
    // O app do tradutor (avatar) só é baixado agora, ao abrir; se o
    // navegador bloquear esse download, o plugin não avisa nada.
    setTimeout(() => {
      try { if (alvo.document.getElementById('vlibras-app-root')) return; } catch (e) { return; }
      showToast('Libras não abriu', 'O tradutor VLibras demorou demais para abrir — a internet pode estar lenta ou o navegador está bloqueando vlibras.gov.br / cdn.jsdelivr.net. Tente de novo em alguns segundos.');
    }, 20000);
  }

  // ---------- Bootstrap ----------
  function setupRBAC() {
    document.getElementById('txtUserNom').textContent = currentUser.nome;

    // Bimestres/trilha-bimestre valem pros dois papéis: o aluno depende
    // deles pra saber o que está visível, e agora o professor também —
    // trilha com bimestre encerrado some pra ele igual (ver
    // isTrilhaBimestreEncerrado/visibleTrilhas), não só depois de abrir a
    // aba Gestão (que já buscava essas mesmas datas por conta própria).
    calendarioCarregado = Promise.all([fetchBimestreDates(), fetchTrilhaBimestre()]);
    setupBimestreDatesRealtime();
    setupTrilhaBimestreRealtime();

    if (currentUser.role === 'aluno') {
      fetchTeacherOverride();
      setupOverrideRealtime();
      renderRankingBadge();
      setupGradesRealtime();
    }

    if (currentUser.role === 'professor') {
      // Estado inicial das chaves de Bloqueios e Liberações — sem isso,
      // elas só mostrariam o estado certo depois da primeira vez que a aba
      // Gestão fosse aberta (é lá que essas mesmas buscas já rodavam).
      renderGestaoToggles();
      renderProfessorTokenBox();
    }

    checkGamesUnlock();
    switchTab('aulas');
    // Tela padrão da aba Aulas agora é o grid de matérias (renderMaterias,
    // chamado em init()) — nenhuma trilha é aberta sozinha no carregamento.
  }

  async function init() {
    currentUser = await window.PortalSession.requireUser('../../index.html');
    if (!currentUser) return;
    paramUser = currentUser.email;
    // Antes de renderShell(): já nasce com o emoji/fonte/tema certos no
    // 1º HTML gerado, sem "flash" do default (ver botão de perfil, que
    // embute prefs.avatarEmoji direto no template).
    await fetchUserPreferences();

    // Marca o documento pro CSS esconder o que o substituto não usa (.so-professor).
    document.documentElement.toggleAttribute('data-substituto', !!currentUser.substituto);
    // Visual moderno das telas do professor (shared/professor-portal.css);
    // o aluno continua com o tema da turma.
    document.documentElement.toggleAttribute('data-visual-professor', currentUser.role === 'professor');
    renderShell();
    renderMaterias();
    renderGameCards();
    setupVLibras();
    setupProgressSyncListener();
    // setupRBAC() já chama renderRankingBadge() de cara (abaixo), com o que
    // o Supabase tinha ANTES desta hidratação/sync — pra não atrasar a
    // primeira pintura da tela nisso. Essa segunda chamada, só depois que a
    // hidratação+sync termina de verdade, corrige o badge caso a primeira
    // tenha renderizado com a % desatualizada (a linha do PRÓPRIO aluno
    // ainda não tinha chegado no student_module_progress).
    // Roster da turma (profiles) — precisa estar pronto antes de setupRBAC()
    // (abaixo): ranking (computeRanking, só aluno) e a aba Gestão (só
    // professor) usam os dois turmaStudents().
    await fetchTurmaStudents();

    syncAllModulesProgressSafely().then(() => {
      if (currentUser.role === 'aluno') renderRankingBadge();
    });
    refreshRecuperacaoStatus();
    if (currentUser.role === 'professor') {
      setupGestaoButtons();
      setupExamGuardAlerts();
    }

    document.querySelectorAll('#mainNavTabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // e.currentTarget (não e.target): o botão de perfil tem um <span>
        // de emoji dentro — clicar nele faz e.target ser o <span>, que não
        // tem data-tab nenhum.
        const tabTarget = e.currentTarget.getAttribute('data-tab');
        if (tabTarget === 'jogos' && e.currentTarget.classList.contains('disabled')) {
          showAlert('A aba de jogos está bloqueada! Conclua 100% das suas tarefas do dia ou aguarde a liberação do professor.');
          return;
        }
        // Professor não tem aba Perfil: o ícone abre os alertas pendentes
        // (contador em #examGuardBadge) ou, sem alerta, a personalização.
        if (tabTarget === 'perfil' && currentUser.role === 'professor') {
          if (examGuardEvents.length > 0) {
            renderExamGuardList();
            document.getElementById('examGuardOverlay').style.display = 'flex';
          } else {
            openPersonalizacao();
          }
          return;
        }
        switchTab(tabTarget);
      });
    });

    document.getElementById('btnOpenPixelCode').addEventListener('click', () => {
      window.open('../../pixelcode.html', '_blank');
    });

    document.getElementById('btnLogout').addEventListener('click', async () => {
      // Garante que o progresso feito até agora chegue no Supabase ANTES
      // de sair. Sem isso, um upsert best-effort ainda em voo (disparado
      // por shared/progress-sync.js dentro do <iframe> do módulo, ou pelo
      // próprio syncModuleProgress) podia ser interrompido pela navegação
      // pra index.html — o aluno já tinha terminado a atividade, só não
      // deu tempo de sincronizar, e o progresso ficava só na máquina dele
      // (foi reportado como inconsistência entre o que o aluno via e o
      // que o relatório do professor mostrava). localStorage é do mesmo
      // domínio pro <iframe> e pra esta página, então a escrita mais
      // recente do módulo já está visível aqui — só falta mandar pro
      // Supabase de novo, desta vez esperando terminar.
      //
      // Timeout de segurança: nunca trava o logout esperando a rede —
      // pior caso (rede fora do ar), sai sem confirmar sincronização,
      // igual já acontecia antes desta garantia existir.
      if (currentUser.role === 'aluno' && sbClient) {
        const btnLogout = document.getElementById('btnLogout');
        const textoOriginal = btnLogout.textContent;
        btnLogout.disabled = true;
        btnLogout.textContent = 'Saindo...';
        await Promise.race([
          syncAllModulesProgress(),
          new Promise(resolve => setTimeout(resolve, 4000))
        ]).catch(() => {});
        btnLogout.disabled = false;
        btnLogout.textContent = textoOriginal;
      }

      // Gancho só pra teste (window.__testAfterLogoutSync, ver
      // tests/logout-sync-progresso.spec.js) — inexistente em produção, é
      // um no-op ali. Sem ele, não dá pra inspecionar o resultado do sync
      // acima: o Chromium desmonta o documento atual assim que
      // window.location.href é atribuído, ANTES da navegação terminar de
      // verdade, então nenhum page.evaluate() depois do clique consegue
      // mais ler nada daqui.
      if (typeof window.__testAfterLogoutSync === 'function') {
        await window.__testAfterLogoutSync();
      }

      sessionStorage.clear();
      window.location.href = '../../index.html';
    });

    document.getElementById('btnFontStyle').addEventListener('click', () => {
      const idx = FONT_ORDER.indexOf(prefs.fontFamily);
      prefs.fontFamily = FONT_ORDER[(idx + 1) % FONT_ORDER.length];
      applyA11y();
      saveUserPreferences();
    });
    document.getElementById('btnAbrirPersonalizacao')?.addEventListener('click', openPersonalizacao);
    document.getElementById('btnFontBigger').addEventListener('click', () => {
      a11y.fontScale = Math.min(1.6, Math.round((a11y.fontScale + 0.1) * 10) / 10);
      applyA11y();
    });
    document.getElementById('btnFontSmaller').addEventListener('click', () => {
      a11y.fontScale = Math.max(0.85, Math.round((a11y.fontScale - 0.1) * 10) / 10);
      applyA11y();
    });
    document.getElementById('btnLibras').addEventListener('click', abrirLibras);

    setupRBAC();
    applyA11y();
    applyPrefsVisuals();
    setupPortalAudio();

    window.ACTIVITY_STUDENT_NAME = currentUser.nome;
    window.ACTIVITY_STUDENT_EMAIL = currentUser.email;
    window.ACTIVITY_STUDENT_TURMA = currentUser.turma;
    window.ACTIVITY_STUDENT_ROLE = currentUser.role;
    window.ACTIVITY_LOCATION = 'aulas_materias';
    window.ACTIVITY_LABEL = 'Aulas & Atividades — Escolhendo matéria';

    const tracker = document.createElement('script');
    tracker.src = '../../shared/activity-tracker.js';
    document.body.appendChild(tracker);
  }

  // API usada pelos onclick="" gerados dinamicamente
  window.PortalCore = { openGame, closeGame, openModule, closeModule, openMateria, closeMateria, toggleGestaoSection, openStudentPerfil, closeStudentPerfil, mudarVisaoAulas, abrirPendente };

  document.addEventListener('DOMContentLoaded', init);
})();
