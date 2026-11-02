// "Horário de Acesso" (Gestão → Bloqueios e Liberações): o professor define
// um horário de início e fim, por turma (classroom_settings.acesso_restrito/
// acesso_inicio/acesso_fim, sql/supabase-setup-completo.sql), e fora dele o ALUNO vê
// o portal fechado — uma tela cheia por cima de tudo, sem dar pra clicar nem
// digitar em nada por baixo. Quando o horário abre de novo, a tela some
// sozinha (confere a cada 20s e na hora em que o professor muda a regra).
//
// Carregado pelo shared/clipboard-guard.js, que já roda em toda página do
// portal (plataforma de cada turma e cada atividade/jogo) — assim uma
// atividade aberta direto pela URL também fica fechada. Dentro de um iframe
// não faz nada: a página de cima (plataforma) já cobre a tela inteira.
//
// A hora vem do SERVIDOR (rpc quizrush_server_now), não do relógio do
// computador do aluno — adiantar/atrasar o relógio não abre o portal. Sem
// resposta do servidor, usa o relógio local. Compara sempre no fuso de
// Brasília. Horário que vira a noite (ex.: 19:00 às 01:00) também vale.
//
// Mesmo aviso do clipboard-guard: é uma trava pedagógica, não segurança de
// verdade (quem desativa o JavaScript passa por ela).
(async function () {
  if (window.top !== window.self) return;
  if (!window.PortalSession) return;
  const user = await window.PortalSession.getUser();
  if (!user || user.role === 'professor' || user.role === 'admin') return;
  const sb = window.PortalSession.client();
  if (!sb) return;
  const turma = user.turma || 'global';

  let regra = null;        // { inicio: 'HH:MM', fim: 'HH:MM' } ou null (sem restrição)
  let offsetServidor = 0;  // hora do servidor − hora local, em ms

  const hhmm = v => (v ? String(v).slice(0, 5) : '');
  const FMT = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

  function agoraHHMM() {
    return FMT.format(new Date(Date.now() + offsetServidor));
  }

  function dentroDoHorario(agora, inicio, fim) {
    if (inicio === fim) return true;
    return inicio < fim ? (agora >= inicio && agora < fim) : (agora >= inicio || agora < fim);
  }

  function mostrarBloqueio() {
    let tela = document.getElementById('__horarioAcessoTela');
    if (!tela) {
      tela = document.createElement('div');
      tela.id = '__horarioAcessoTela';
      tela.setAttribute('role', 'alertdialog');
      tela.setAttribute('aria-modal', 'true');
      tela.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:2147483647', 'display:flex',
        'align-items:center', 'justify-content:center', 'padding:16px',
        'background:#0b0d0b', 'color:#f5f5f5', 'font-family:system-ui,sans-serif', 'text-align:center',
      ].join(';');
      tela.innerHTML = `
        <div style="max-width:420px">
          <div style="font-size:48px; margin-bottom:12px">🔒</div>
          <h2 style="margin:0 0 10px; font-size:22px">Portal fechado agora</h2>
          <p id="__horarioAcessoTexto" style="margin:0 0 20px; font-size:15px; line-height:1.5; color:#cfd6cf"></p>
          <button id="__horarioAcessoSair" style="padding:10px 22px; font-size:14px; font-weight:700; border:none; border-radius:999px; background:#2f6fd6; color:#fff; cursor:pointer">Sair</button>
        </div>`;
      document.body.appendChild(tela);
      tela.querySelector('#__horarioAcessoSair').addEventListener('click', async () => {
        try { await window.PortalSession.signOut(); } catch (e) { /* segue pro login mesmo assim */ }
        const raiz = (document.querySelector('script[src*="shared/session.js"]') || {}).src || '';
        location.href = raiz ? raiz.replace(/shared\/session\.js.*$/, 'index.html') : '/index.html';
      });
    }
    tela.querySelector('#__horarioAcessoTexto').textContent =
      `O professor liberou o acesso só das ${regra.inicio} às ${regra.fim}. Volte no horário da aula.`;
    // Tira o foco e trava o resto da página (inclusive um iframe de
    // atividade que estava com o cursor dentro).
    Array.from(document.body.children).forEach(el => { if (el !== tela) el.inert = true; });
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  }

  function esconderBloqueio() {
    const tela = document.getElementById('__horarioAcessoTela');
    if (!tela) return;
    tela.remove();
    Array.from(document.body.children).forEach(el => { el.inert = false; });
  }

  function aplicar() {
    const fechado = !!regra && !dentroDoHorario(agoraHHMM(), regra.inicio, regra.fim);
    document.documentElement.toggleAttribute('data-portal-fechado', fechado);
    if (fechado) mostrarBloqueio(); else esconderBloqueio();
  }

  async function buscarRegra() {
    const { data, error } = await sb.from('classroom_settings')
      .select('acesso_restrito, acesso_inicio, acesso_fim').eq('id', turma).maybeSingle();
    // Erro (ex.: colunas ainda não criadas no Supabase) = sem restrição.
    regra = !error && data && data.acesso_restrito && data.acesso_inicio && data.acesso_fim
      ? { inicio: hhmm(data.acesso_inicio), fim: hhmm(data.acesso_fim) }
      : null;
    aplicar();
  }

  async function sincronizarRelogio() {
    try {
      const antes = Date.now();
      const { data, error } = await sb.rpc('quizrush_server_now');
      if (error || !data) return;
      const servidor = new Date(data).getTime();
      if (!isNaN(servidor)) offsetServidor = servidor - (antes + (Date.now() - antes) / 2);
    } catch (e) { /* sem hora do servidor: fica o relógio local */ }
  }

  if (document.readyState === 'loading') {
    await new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true }));
  }
  await Promise.all([sincronizarRelogio(), buscarRegra()]);
  aplicar();
  setInterval(aplicar, 20000);
  sb.channel('realtime_horario_acesso_' + turma)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'classroom_settings', filter: `id=eq.${turma}` }, buscarRegra)
    .subscribe();
})();
