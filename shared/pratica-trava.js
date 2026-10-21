// "Sair da tela nas práticas" (Gestão → Bloqueios e Liberações,
// classroom_settings.trava_praticas, sql/pratica-trava.sql). Com a chave
// ligada, TODA prática da turma (`*-pratica.html`, `*-pratica-simples.html`)
// ganha a mesma trava das provas (shared/exam-proctor.js): trocar de aba,
// minimizar ou clicar em outra janela — inclusive com a TELA DIVIDIDA —
// conta advertência; na 2ª, a prática fica bloqueada até o professor liberar
// (token de 6 dígitos, shared/professor-visto.js, ou "Liberar" no sino de
// alertas da Gestão). Também bloqueia copiar/colar/arrastar.
//
// Carregado pelo shared/clipboard-guard.js (que já roda em toda prática) —
// por isso nenhuma prática precisa de <script> novo. exam-proctor.js e
// professor-visto.js são carregados daqui, só quando a chave está ligada.
// Telas no mesmo desenho do turmas/recuperacao/atividades/recuperacao-trava.js.
//
// Só vale pra aluno: professor (e a Gestão gerando gabarito) abre direto.
// Sem isenção de "prática concluída": cada prática guarda o progresso num
// formato diferente, então a trava vale enquanto a chave estiver ligada.
// Desligar a chave com a prática aberta solta a trava na hora; ligar vale
// a partir da próxima vez que a prática for aberta.
(async function () {
  // Práticas que ficam de fora mesmo com a chave ligada:
  const EXCECOES = new Set([
    'prog-depuracao-pratica',          // já tem a trava própria (exam-proctor)
    'projetos-pre-textuais-pratica',   // o aluno escreve no VS Code Web, em outra aba
    'db-conexao-supabase-pratica',     // o aluno cria o banco no site do Supabase / Codespaces
  ]);

  const arquivo = (location.pathname.split('/').pop() || '').replace(/\.html$/, '');
  if (!arquivo || EXCECOES.has(arquivo)) return;
  if (!window.PortalSession) return;

  const pasta = ((document.currentScript && document.currentScript.src) || '').replace(/pratica-trava\.js(\?.*)?$/, '');
  const activityLocation = arquivo.replace(/-/g, '_');

  // Os <script> da própria página rodam antes do DOMContentLoaded — só
  // depois dele dá pra saber se a página já trouxe o exam-proctor dela.
  if (document.readyState === 'loading') {
    await new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true }));
  }
  if (window.PortalExamGuard) return;

  let user;
  try { user = await window.PortalSession.getUser(); } catch (e) { return; }
  if (!user || user.role === 'professor' || user.role === 'admin' || !user.email) return;
  const sb = window.PortalSession.client();
  if (!sb) return;
  const turma = user.turma || 'global';

  // Sem a coluna no Supabase (SQL não rodado) o select dá erro: trava desligada.
  async function travaLigada() {
    try {
      const { data, error } = await sb.from('classroom_settings').select('trava_praticas').eq('id', turma).maybeSingle();
      return !error && !!(data && data.trava_praticas);
    } catch (e) {
      return false;
    }
  }

  if (!(await travaLigada())) return;

  function carregarScript(nome) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = pasta + nome;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  try {
    if (!window.PortalProfessorVisto) await carregarScript('professor-visto.js');
    await carregarScript('exam-proctor.js');
  } catch (e) {
    return;
  }

  let guard;
  try { guard = await window.PortalExamGuard.create(activityLocation); } catch (e) { return; }
  if (guard.disabled) return;

  let overlayEl = null;

  function fechar() {
    if (overlayEl) overlayEl.remove();
    overlayEl = null;
  }

  function abrir(html) {
    fechar();
    overlayEl = document.createElement('div');
    overlayEl.id = 'praticaTrava';
    overlayEl.setAttribute('role', 'dialog');
    overlayEl.setAttribute('aria-modal', 'true');
    overlayEl.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483000', 'display:flex', 'align-items:center',
      'justify-content:center', 'padding:16px', 'background:rgba(2,6,2,0.94)',
    ].join(';');
    overlayEl.innerHTML = `
      <div style="max-width:520px; width:100%; background:var(--panel,#10140f); border:1px solid var(--green-dim,#4a9a2a);
                  color:var(--ink,#d9e6d2); padding:20px 22px; text-align:center; font-size:13.5px; line-height:1.6;">
        ${html}
      </div>`;
    document.body.appendChild(overlayEl);
  }

  const btnStyle = 'font-family:inherit; font-weight:800; font-size:12px; letter-spacing:1px; text-transform:uppercase;'
    + ' background:var(--green,#7cff3f); color:#04220a; border:none; padding:10px 20px; cursor:pointer; border-radius:2px;';
  const tituloStyle = "font-family:var(--user-font-display,'VT323',monospace); font-size:26px; margin:6px 0 10px;";

  function ajustarFaixa() {
    const bar = document.getElementById('__examRulesBar');
    if (!bar) return;
    bar.innerHTML = '🔒 <b>Trava de tela ligada pelo professor:</b> copiar e colar estão bloqueados. '
      + 'Trocar de aba, minimizar ou clicar em outra janela (inclusive com a tela dividida) conta <b>advertência</b> — na 2ª, a prática é <b>bloqueada</b>.';
  }

  function telaInicio() {
    abrir(`
      <div style="font-size:44px;">🔒</div>
      <h2 style="${tituloStyle} color:var(--yellow,#d4c86a);">Antes de começar</h2>
      <p>O professor ligou a <b>trava de tela</b> nas práticas: faça esta prática sem sair desta tela.</p>
      <p>Trocar de aba, minimizar, abrir outro programa ou clicar em outra janela — <b>inclusive com a tela dividida</b> — conta <b>1 aviso</b>. No <b>2º aviso</b>, a prática fica bloqueada até o professor liberar.</p>
      <p>Copiar e colar também estão bloqueados.</p>
      <div style="margin-top:14px;"><button id="btnPraticaTravaComecar" style="${btnStyle}">▶ Começar</button></div>
    `);
    document.getElementById('btnPraticaTravaComecar').addEventListener('click', () => {
      fechar();
      window.PortalExamGuard.arm(guard, {
        onWarning: (n) => telaAviso(n),
        onBlocked: () => telaBloqueada(),
        isCompleted: () => false
      });
    });
  }

  function telaAviso(n) {
    abrir(`
      <div style="font-size:44px;">⚠️</div>
      <h2 style="${tituloStyle} color:var(--blood-bright,#ff3b30);">Aviso ${n}/2</h2>
      <p>Você saiu da tela da prática. Na <b>2ª vez</b>, a prática fica <b>bloqueada</b> até o professor liberar.</p>
      <div style="margin-top:14px;"><button id="btnPraticaTravaOk" style="${btnStyle}">Entendi</button></div>
    `);
    document.getElementById('btnPraticaTravaOk').addEventListener('click', fechar);
  }

  function telaBloqueada() {
    abrir(`
      <div style="font-size:44px;">🔒</div>
      <h2 style="${tituloStyle} color:var(--blood-bright,#ff3b30);">Prática bloqueada</h2>
      <p>Você saiu da tela 2 vezes. Chame o professor: ele libera com o token de "Dar visto" (Gestão → Token) ou pelo sino de alertas.</p>
      <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap; margin-top:12px;">
        <input type="text" id="praticaTravaToken" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="Token"
               style="font-family:inherit; font-size:15px; width:120px; text-align:center; background:#020402; color:var(--green,#7cff3f); border:1px solid var(--line,#223022); padding:8px;">
        <button id="btnPraticaTravaDesbloquear" style="${btnStyle}">Desbloquear</button>
      </div>
      <div id="praticaTravaMsg" style="display:none; margin-top:10px; color:var(--blood-bright,#ff3b30); font-size:12.5px;"></div>
    `);
    const btn = document.getElementById('btnPraticaTravaDesbloquear');
    const msg = document.getElementById('praticaTravaMsg');
    btn.addEventListener('click', async () => {
      msg.style.display = 'none';
      btn.disabled = true;
      const r = await window.PortalExamGuard.unlock(guard, document.getElementById('praticaTravaToken').value);
      btn.disabled = false;
      if (!r.ok) { msg.textContent = r.erro; msg.style.display = 'block'; return; }
      telaInicio();
    });
  }

  // Professor desligou a chave com a prática aberta: solta tudo na hora
  // (listeners, tela por cima, faixa e o bloqueio de copiar/colar do modo prova).
  async function conferirChave() {
    if (await travaLigada()) return;
    window.PortalExamGuard.disarm(guard);
    fechar();
    const bar = document.getElementById('__examRulesBar');
    if (bar) bar.remove();
    window.__PORTAL_EXAM_LOCK__ = false;
    window.dispatchEvent(new Event('portal-exam-lock'));
    sb.removeChannel(canal);
  }

  const canal = sb.channel('realtime_pratica_trava_' + turma)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'classroom_settings', filter: `id=eq.${turma}` }, conferirChave)
    .subscribe();

  ajustarFaixa();
  if (guard.blocked) telaBloqueada();
  else telaInicio();
})();
