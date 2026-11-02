// Motor da "Corrida do Bug" (games/corrida-do-bug.html), que une o Fuga do
// Bug (plataforma, games/fuga-do-bug-engine.js) com o QuizRush (quiz ao
// vivo, shared/quizrush-engine.js). Mesmo espírito de quizrush-engine.js —
// cuida só do que NÃO é tela: sessão/progresso no Supabase (tabelas
// PRÓPRIAS, ver o bloco 16 de
// sql/supabase-setup-completo.sql) e a pontuação por checkpoint.
//
// Diferença de fundo pro QuizRush: lá é "todo mundo responde a MESMA
// pergunta ao mesmo tempo" (um cronômetro do servidor, sincronizado). Aqui
// cada aluno corre no seu próprio ritmo pela fase do Fuga do Bug (motor
// 100% local, sem rede) e só manda um upsert de progresso quando passa por
// um checkpoint — não há "pergunta atual da sessão", cada jogador está em
// checkpoints diferentes o tempo todo.
//
// A fonte das perguntas é o QuizRushEngine (window.QuizRushEngine, já
// carregado antes deste arquivo em games/corrida-do-bug.html) —
// listGabaritoModules()/fetchModuleQuestions() são reaproveitados direto,
// sem duplicar a lógica de ler o gabarito de um módulo já existente.
window.CorridaDoBugEngine = (function () {
  const sb = window.PortalSession ? window.PortalSession.client() : null;

  // ---------- Sessão ----------

  async function getLatestSession(turma) {
    if (!sb || !turma) return null;
    const { data, error } = await sb.from('corridadobug_sessions').select('*')
      .eq('turma', turma).order('created_at', { ascending: false }).limit(1);
    if (error) { console.error('[CorridaDoBugEngine] falha ao buscar sessão:', error); return null; }
    return (data && data[0]) || null;
  }

  async function createSession({ turma, email, levelIndex, trilhaLabel, moduleTitle, questions }) {
    const id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const row = {
      id, turma, created_by: email, level_index: levelIndex,
      trilha_label: trilhaLabel, module_title: moduleTitle, questions,
      status: 'lobby', started_at: null, created_at: new Date().toISOString()
    };
    const { error } = await sb.from('corridadobug_sessions').upsert(row, { onConflict: 'id' });
    if (error) { console.error('[CorridaDoBugEngine] falha ao criar sessão:', error); return null; }
    return row;
  }

  function updateSession(id, patch) {
    return sb.from('corridadobug_sessions').update(patch).eq('id', id);
  }

  // started_at vem do relógio do dispositivo do professor (diferente do
  // QuizRush, não precisa ser o relógio do banco — cada aluno mede o
  // PRÓPRIO tempo de prova localmente, comparado só contra si mesmo pra
  // pontuar cada checkpoint, nunca contra o relógio de outro jogador).
  async function startRace(id) {
    const startedAt = new Date().toISOString();
    const { error } = await updateSession(id, { status: 'racing', started_at: startedAt });
    if (error) { console.error('[CorridaDoBugEngine] falha ao iniciar a corrida:', error); return null; }
    return startedAt;
  }
  const endRace = (id) => updateSession(id, { status: 'ended' });

  async function joinSession(sessionId, email, name) {
    if (!sb || !sessionId || !email) return;
    const { error } = await sb.from('corridadobug_players').upsert(
      { session_id: sessionId, student_email: email, student_name: name || email },
      { onConflict: 'session_id,student_email' }
    );
    if (error) console.error('[CorridaDoBugEngine] falha ao entrar na corrida:', error);
  }

  async function fetchPlayers(sessionId) {
    if (!sb || !sessionId) return [];
    const { data, error } = await sb.from('corridadobug_players').select('*').eq('session_id', sessionId);
    if (error) { console.error('[CorridaDoBugEngine] falha ao listar jogadores:', error); return []; }
    return data || [];
  }

  // ---------- Progresso ao vivo ----------

  async function fetchProgress(sessionId) {
    if (!sb || !sessionId) return [];
    const { data, error } = await sb.from('corridadobug_progress').select('*').eq('session_id', sessionId);
    if (error) { console.error('[CorridaDoBugEngine] falha ao listar progresso:', error); return []; }
    return data || [];
  }

  async function upsertProgress({ sessionId, email, name, checkpoint, misses, score, finished }) {
    if (!sb || !sessionId || !email) return;
    const row = {
      session_id: sessionId, student_email: email, student_name: name || email,
      checkpoint, misses, score, finished: !!finished,
      updated_at: new Date().toISOString()
    };
    if (finished) row.finished_at = new Date().toISOString();
    const { error } = await sb.from('corridadobug_progress').upsert(row, { onConflict: 'session_id,student_email' });
    if (error) console.error('[CorridaDoBugEngine] falha ao gravar progresso:', error);
  }

  // Ordena por: chegou primeiro (finished) > mais checkpoints > mais
  // pontos > mais rápido a atualizar por último (desempate estável) —
  // mesma leitura de "quem está na frente" que o placar ao vivo do
  // professor usa.
  function sortProgress(rows) {
    return rows.slice().sort((a, b) => {
      if (!!a.finished !== !!b.finished) return a.finished ? -1 : 1;
      if (a.finished && b.finished) return new Date(a.finished_at) - new Date(b.finished_at);
      if (a.checkpoint !== b.checkpoint) return b.checkpoint - a.checkpoint;
      if (a.score !== b.score) return b.score - a.score;
      return a.student_email.localeCompare(b.student_email);
    });
  }

  // ---------- Pontuação por checkpoint ----------
  // Mesma fórmula de shared/quizrush-engine.js scoreFor: só pontua se
  // acertou, e quanto mais rápido (dentro de uma janela de referência),
  // mais pontos (500 a 1000) — aqui elapsedMs/durationMs são medidos
  // LOCALMENTE por cada aluno (tempo parado na pergunta daquele
  // checkpoint), não por um cronômetro compartilhado.
  function scoreForCheckpoint(isCorrect, elapsedMs, durationMs) {
    if (!isCorrect) return 0;
    const ratio = Math.max(0, Math.min(1, elapsedMs / (durationMs || 1)));
    return Math.round(500 + 500 * (1 - ratio));
  }
  // Desconto na 2ª errada SEGUIDA no mesmo checkpoint (a 1ª errada só manda
  // de volta pro checkpoint anterior, sem desconto — só a repetição perde
  // ponto, a pedido do professor).
  const MISS_PENALTY = 200;
  // Janela de referência pra "respondeu rápido" (ms) — sem tempo real de
  // sessão como o QuizRush tem (aqui não há um "tempo da pergunta"
  // configurado pelo professor, cada checkpoint é respondido no ritmo de
  // cada um), usa um valor fixo generoso.
  const CHECKPOINT_REF_MS = 15000;

  // ---------- Realtime ----------

  function watchTable(table, filterCol, filterVal, onChange) {
    if (!sb) return () => {};
    const channel = sb.channel(`realtime_${table}_${filterVal}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: `${filterCol}=eq.${filterVal}` }, onChange)
      .subscribe();
    return () => { try { sb.removeChannel(channel); } catch (e) {} };
  }
  const watchSession = (id, cb) => watchTable('corridadobug_sessions', 'id', id, cb);
  const watchPlayers = (id, cb) => watchTable('corridadobug_players', 'session_id', id, cb);
  const watchProgress = (id, cb) => watchTable('corridadobug_progress', 'session_id', id, cb);
  // Mesmo uso de shared/quizrush-engine.js watchNewSessions: um aluno com a
  // aba Jogos já aberta é puxado direto pra sala assim que o professor cria
  // uma corrida nova, sem precisar recarregar a página.
  const watchNewSessions = (turma, cb) => watchTable('corridadobug_sessions', 'turma', turma, cb);

  return {
    enabled: !!sb,
    getLatestSession, createSession, startRace, endRace,
    joinSession, fetchPlayers,
    fetchProgress, upsertProgress, sortProgress,
    scoreForCheckpoint, MISS_PENALTY, CHECKPOINT_REF_MS,
    watchSession, watchPlayers, watchProgress, watchNewSessions,
  };
})();
