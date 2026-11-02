// Motor do QuizRush do portal (games/quizrush.html), reaproveitado tanto pela
// visão do professor (host) quanto pela do aluno (jogador). Cuida de 3
// coisas que não são "tela":
//
// 1) Buscar as perguntas de múltipla escolha de um módulo já existente —
//    sem cadastrar NADA novo, ver fetchModuleQuestions() abaixo, que
//    reaproveita o gabarito (shared/gabarito-generator.js) que cada
//    atividade teórica (formato STEPS + quiz) já expõe via
//    window.generateGabaritoForGestao().
// 2) Ler o TURMA_CONFIG da turma atual (o próprio games/quizrush.html não
//    tem acesso a ele — só o plataforma.html de cada turma carrega esse
//    arquivo hoje) e listar os módulos candidatos.
// 3) Persistir/observar a sessão ao vivo no Supabase (quizrush_sessions/
//    quizrush_players/quizrush_answers — ver sql/supabase-setup-completo.sql, bloco 11),
//    incluindo o cálculo de pontuação (acerto + velocidade).
// 4) Montar e gravar o "Quizz Prático" — partida de problemas de código em vez
//    de múltipla escolha (banco em shared/quizrush-code-bank.js, correção em
//    shared/quizrush-code.js).
// 5) Montar a "Revisão das provas": uma partida com perguntas de múltipla
//    escolha E problemas de código tirados do gabarito das provas (matéria
//    'prova' do config da turma) — ver fetchExamItems()/buildExamReview().
// 6) "Pegar pontos" (opcional, allow_steal — quizrush_powers) e a
//    penalidade de sair da tela durante uma pergunta (sempre ativa —
//    quizrush_penalties). leaderboardFrom() soma as duas com
//    quizrush_answers pra chegar no placar de cada aluno.
window.QuizRushEngine = (function () {
  const sb = window.PortalSession ? window.PortalSession.client() : null;

  // ---------- TURMA_CONFIG + módulos candidatos ----------

  const loadedConfigs = {};

  // games/quizrush.html não é carregado dentro do plataforma.html de uma
  // turma (é só mais um jogo, num <iframe> igual aos outros) — então
  // window.TURMA_CONFIG nunca chega até aqui sozinho. Carregamos o mesmo
  // config.js que o plataforma.html da turma usaria, na mão.
  function loadTurmaConfig(turma) {
    if (loadedConfigs[turma]) return Promise.resolve(loadedConfigs[turma]);
    const globalName = 'TURMA_CONFIG_' + String(turma || '').toUpperCase();
    if (window[globalName]) {
      loadedConfigs[turma] = window[globalName];
      return Promise.resolve(window[globalName]);
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `../turmas/${turma}/config.js`;
      script.onload = () => {
        const cfg = window[globalName];
        if (cfg) { loadedConfigs[turma] = cfg; resolve(cfg); }
        else reject(new Error('config.js carregou mas não definiu ' + globalName));
      };
      script.onerror = () => reject(new Error('Não foi possível carregar ' + script.src));
      document.head.appendChild(script);
    });
  }

  // Trilhas que NÃO são do bimestre atual (mesma regra de
  // trilhaNoPeriodoAtual em shared/platform-core.js): atribuídas em
  // "Liberação por Trilha" a um bimestre cuja janela não contém hoje —
  // já encerrado, ainda não começou, ou entre um bimestre e outro — ou com
  // "Liberar em" ainda no futuro. Trilha
  // sem bimestre atribuído (ou bimestre sem datas) nunca entra aqui. O
  // QuizRush e a Corrida do Bug só oferecem módulos das trilhas atuais.
  //
  // `fora.liberadas` guarda as trilhas com "Liberar em" preenchido: trilha
  // do plano de ensino (dataAula no config.js) sem essa data ainda não foi
  // liberada pelo professor e também fica de fora (ver foraDoPeriodoTem).
  async function trilhasForaDoPeriodo(turma) {
    const fora = new Set();
    if (!sb || !turma) return fora;
    try {
      const [datasRes, atribRes] = await Promise.all([
        sb.from('bimestre_dates').select('*').eq('turma', turma),
        sb.from('trilha_bimestre').select('*').eq('turma', turma),
      ]);
      const d = new Date();
      const hoje = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const datas = {};
      (datasRes.data || []).forEach(r => { datas[r.bimestre] = r; });
      fora.liberadas = new Set((atribRes.data || []).filter(r => r.liberar_em).map(r => r.trilha_key));
      (atribRes.data || []).forEach(r => {
        const b = datas[r.bimestre];
        if (b && ((b.inicio && b.inicio > hoje) || (b.fim && b.fim < hoje))) fora.add(r.trilha_key);
        // "Liberar em": a trilha ainda não foi liberada dentro do bimestre.
        if (r.liberar_em && r.liberar_em > hoje) fora.add(r.trilha_key);
      });
    } catch (e) { /* sem calendário legível: oferece tudo, como antes */ }
    return fora;
  }

  // Achata materias[].trilhas[].modules[] (mesma hierarquia usada no
  // resto do portal — ver README, "Hierarquia Matéria → Trilha →
  // Módulo") numa lista só, mantendo só os módulos com gabarito (só eles
  // expõem window.generateGabaritoForGestao, ver fetchModuleQuestions).
  // foraDoPeriodo (opcional, ver trilhasForaDoPeriodo): trilhas a pular.
  // Mesma regra de exigeLiberacao() em shared/platform-core.js.
  function foraDoPeriodoTem(foraDoPeriodo, trilha) {
    if (!foraDoPeriodo) return false;
    if (foraDoPeriodo.has(trilha.key)) return true;
    const exige = trilha.exigeLiberacao === true || (trilha.dataAula && trilha.exigeLiberacao !== false);
    return !!(exige && foraDoPeriodo.liberadas && !foraDoPeriodo.liberadas.has(trilha.key));
  }
  function listGabaritoModules(cfgTurma, foraDoPeriodo) {
    const out = [];
    (cfgTurma.materias || []).forEach(materia => {
      (materia.trilhas || []).forEach(trilha => {
        if (foraDoPeriodoTem(foraDoPeriodo, trilha)) return;
        (trilha.modules || []).forEach(mod => {
          if (mod.hasGabarito) {
            out.push({
              trilhaKey: trilha.key,
              trilhaLabel: trilha.label,
              moduleKey: mod.key,
              moduleTitle: mod.title,
              mod
            });
          }
        });
      });
    });
    return out;
  }

  // Carrega o módulo num iframe escondido (mesmo esquema do botão
  // flutuante de shared/gabarito-generator.js) e chama a função de
  // gabarito que ele já expõe — só que aqui a gente
  // INTERCEPTA window.PortalGabarito.generate antes de chamar, pra
  // capturar a lista `items` estruturada (prompt/options/correctIndex)
  // em vez de baixar o .txt. Zero mudança em qualquer atividade
  // existente: a interceptação troca só a referência dentro do iframe
  // isolado, nunca o arquivo real.
  // No array-fonte de cada atividade a resposta certa costuma cair sempre
  // em correctIndex 0 — as telas de teoria/prática de cada trilha já
  // embaralham a ordem na hora de exibir (ver commit "corrige resposta
  // sempre em A nas atividades práticas"), mas o QuizRush lê esse array
  // direto do gabarito, sem passar por aquele embaralhamento. Sem isso, a
  // resposta certa caía sempre no primeiro tile (vermelho) da roleta de
  // cores do Kahoot-like, entregando de graça em toda pergunta.
  function shuffleQuestionOptions(q) {
    const order = q.options.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return {
      prompt: q.prompt,
      options: order.map(i => q.options[i]),
      correctIndex: order.indexOf(q.correctIndex)
    };
  }

  // Carrega o módulo e devolve os `items` crus do gabarito (ou [] se der
  // timeout/erro). Base de fetchModuleQuestions (só múltipla escolha) e de
  // fetchExamItems (múltipla escolha + questões práticas das provas).
  function captureGabaritoItems({ turma, mod, email }) {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:absolute; width:0; height:0; border:0; visibility:hidden;';
      // Sem "role=" na URL: o módulo carregado aqui dentro resolve o papel
      // sozinho via sessão do Supabase Auth (mesmo localStorage do mesmo
      // domínio) — como só o professor chama isto, a sessão já é a dele.
      iframe.src = `../turmas/${turma}/${mod.src}?user=${encodeURIComponent(email || '')}&turma=${encodeURIComponent(turma)}`;

      let settled = false;
      const finish = (items) => {
        if (settled) return;
        settled = true;
        iframe.remove();
        resolve(items);
      };

      // Best-effort: um módulo mal-configurado não pode travar a tela do
      // professor pra sempre esperando um onload que nunca resolve.
      const timeout = setTimeout(() => finish([]), 8000);

      iframe.onload = () => {
        try {
          const win = iframe.contentWindow;
          let captured = null;
          if (win && win.PortalGabarito) {
            win.PortalGabarito.generate = (config) => { captured = config; return { items: config.items || [] }; };
          }
          if (win && typeof win.generateGabaritoForGestao === 'function') {
            win.generateGabaritoForGestao();
          }
          clearTimeout(timeout);
          finish((captured && captured.items) || []);
        } catch (e) {
          clearTimeout(timeout);
          finish([]);
        }
      };
      iframe.onerror = () => { clearTimeout(timeout); finish([]); };
      document.body.appendChild(iframe);
    });
  }

  // Só perguntas de múltipla escolha de verdade servem pro QuizRush comum
  // (atividades práticas de código têm gabarito por caso de teste, sem
  // `options`/`correctIndex` — ver formato em shared/gabarito-generator.js).
  const isChoiceItem = it => Array.isArray(it.options) && it.options.length >= 2 && typeof it.correctIndex === 'number';
  const toChoiceQuestion = it => shuffleQuestionOptions({ prompt: it.prompt, options: it.options, correctIndex: it.correctIndex });

  async function fetchModuleQuestions(args) {
    const items = await captureGabaritoItems(args);
    return items.filter(isChoiceItem).map(toChoiceQuestion);
  }

  // ---------- Sessão (Supabase) ----------

  async function getLatestSession(turma) {
    if (!sb || !turma) return null;
    const { data, error } = await sb.from('quizrush_sessions').select('*')
      .eq('turma', turma).order('created_at', { ascending: false }).limit(1);
    if (error) { console.error('[QuizRushEngine] falha ao buscar sessão:', error); return null; }
    return (data && data[0]) || null;
  }

  async function createSession({ turma, email, trilhaLabel, moduleTitle, questions, durationMs, allowSteal }) {
    const id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const row = {
      id, turma, created_by: email, trilha_label: trilhaLabel, module_title: moduleTitle,
      questions, status: 'lobby', current_index: 0, question_started_at: null,
      question_duration_ms: durationMs || 25000, allow_steal: !!allowSteal, created_at: new Date().toISOString()
    };
    let { error } = await sb.from('quizrush_sessions').upsert(row, { onConflict: 'id' });
    if (error && !allowSteal) { console.error('[QuizRushEngine] falha ao criar sessão:', error); return null; }
    if (error) {
      // allow_steal é coluna nova (sql/supabase-setup-completo.sql) — se a
      // migração ainda não rodou, tenta de novo sem ela em vez de deixar o
      // professor sem conseguir criar NENHUMA partida por causa de uma
      // opção que ele nem usou de propósito (a tela só oferece o checkbox,
      // não é obrigatório marcar).
      console.warn('[QuizRushEngine] criando sessão sem allow_steal (rode sql/supabase-setup-completo.sql para habilitar "pegar pontos"):', error);
      const { allow_steal, ...rowSemSteal } = row;
      ({ error } = await sb.from('quizrush_sessions').upsert(rowSemSteal, { onConflict: 'id' }));
      if (error) { console.error('[QuizRushEngine] falha ao criar sessão:', error); return null; }
      return rowSemSteal;
    }
    return row;
  }

  function updateSession(id, patch) {
    return sb.from('quizrush_sessions').update(patch).eq('id', id);
  }

  // question_started_at vem do relógio do BANCO (RPC com now()), não do
  // dispositivo de quem clica — um relógio local adiantado/errado fazia o
  // cronômetro já nascer "expirado" pros alunos ("tempo esgotado" na hora).
  async function startSession(id) {
    const { data, error } = await sb.rpc('quizrush_start_session', { p_session_id: id });
    if (error) { console.error('[QuizRushEngine] falha ao iniciar sessão:', error); return null; }
    return data;
  }
  async function nextQuestion(id, index) {
    const { data, error } = await sb.rpc('quizrush_next_question', { p_session_id: id, p_index: index });
    if (error) { console.error('[QuizRushEngine] falha ao avançar pergunta:', error); return null; }
    return data;
  }

  // question_started_at vem do relógio do banco, mas o cronômetro na tela
  // ainda precisa comparar isso com Date.now() do próprio dispositivo pra
  // saber quanto tempo falta — um relógio local errado voltava a causar
  // "tempo esgotado" cedo/tarde demais mesmo com a hora de início certa.
  // Mede a diferença uma vez (localMid - metade do round-trip ~= quando o
  // banco respondeu "agora") pra somar em todo Date.now() usado no timer.
  async function getServerTimeMs() {
    if (!sb) return 0;
    const before = Date.now();
    const { data, error } = await sb.rpc('quizrush_server_now');
    const after = Date.now();
    if (error || !data) { console.error('[QuizRushEngine] falha ao medir relógio do servidor:', error); return 0; }
    const roundTrip = after - before;
    const localMid = before + roundTrip / 2;
    return new Date(data).getTime() - localMid;
  }
  const reveal = (id) => updateSession(id, { status: 'reveal' });
  const showPodium = (id) => updateSession(id, { status: 'podium' });
  const endSession = (id) => updateSession(id, { status: 'ended' });

  async function joinSession(sessionId, email, name) {
    if (!sb || !sessionId || !email) return;
    const { error } = await sb.from('quizrush_players').upsert(
      { session_id: sessionId, student_email: email, student_name: name || email },
      { onConflict: 'session_id,student_email' }
    );
    if (error) console.error('[QuizRushEngine] falha ao entrar na partida:', error);
  }

  async function fetchPlayers(sessionId) {
    if (!sb || !sessionId) return [];
    const { data, error } = await sb.from('quizrush_players').select('*').eq('session_id', sessionId);
    if (error) { console.error('[QuizRushEngine] falha ao listar jogadores:', error); return []; }
    return data || [];
  }

  async function fetchAnswers(sessionId) {
    if (!sb || !sessionId) return [];
    const { data, error } = await sb.from('quizrush_answers').select('*').eq('session_id', sessionId);
    if (error) { console.error('[QuizRushEngine] falha ao listar respostas:', error); return []; }
    return data || [];
  }

  // Clássico do QuizRush: só pontua se acertou, e quanto mais rápido dentro
  // do tempo, mais pontos (500 a 1000) — por isso "mais rápido" E "mais
  // acertos" andam juntos numa única soma, sem precisar de critério de
  // desempate separado.
  function scoreFor(isCorrect, elapsedMs, durationMs) {
    if (!isCorrect) return 0;
    const ratio = Math.max(0, Math.min(1, elapsedMs / (durationMs || 1)));
    return Math.round(500 + 500 * (1 - ratio));
  }

  async function submitAnswer({ sessionId, email, name, questionIndex, choiceIndex, correctIndex, elapsedMs, durationMs }) {
    if (!sb || !sessionId || !email) return null;
    const isCorrect = choiceIndex === correctIndex;
    const score = scoreFor(isCorrect, elapsedMs, durationMs);
    const { error } = await sb.from('quizrush_answers').upsert({
      session_id: sessionId, student_email: email, student_name: name || email,
      question_index: questionIndex, choice_index: choiceIndex, is_correct: isCorrect, score
    }, { onConflict: 'session_id,student_email,question_index' });
    if (error) { console.error('[QuizRushEngine] falha ao enviar resposta:', error); return null; }
    return { isCorrect, score };
  }

  // ---------- Quizz Prático (problemas de código) ----------
  // Uma partida de código é uma sessão comum cujas `questions` são itens com
  // type:'code' (ver shared/quizrush-code-bank.js) em vez de
  // prompt/options/correctIndex — o resto (lobby, cronômetro, revelação,
  // pódio, placar) é o mesmo fluxo. A correção acontece no aparelho do aluno
  // (shared/quizrush-code.js); aqui só se monta a partida e se grava o resultado.

  const isCodeQuestion = q => !!q && q.type === 'code';
  const isCodeSession = s => !!(s && Array.isArray(s.questions) && s.questions.length && isCodeQuestion(s.questions[0]));

  function listCodeTopics() {
    const bank = window.QuizRushCodeBank;
    if (!bank) return [];
    return bank.topics.map(t => ({ key: t.key, lang: t.lang, label: t.label, count: t.problems.length }));
  }

  function buildCodeQuestions(topicKeys, count) {
    const bank = window.QuizRushCodeBank;
    return bank ? bank.pickProblems(topicKeys, count) : [];
  }

  // Cada tentativa do aluno é gravada (a errada com score 0, pra o professor
  // ver quem está "tentando"); o acerto sobrescreve a mesma linha com a
  // pontuação. `attempts` e `answer_text` são colunas novas (sql/supabase-setup-completo.sql):
  // se a migração ainda não rodou, o banco recusa o upsert inteiro — nesse
  // caso tenta de novo só com as colunas antigas, pra o aluno NÃO perder o
  // ponto por causa de um script que faltou rodar, e avisa no console.
  async function submitCodeAnswer({ sessionId, email, name, questionIndex, isCorrect, score, attempts, answerText }) {
    if (!sb || !sessionId || !email) return null;
    const base = {
      session_id: sessionId, student_email: email, student_name: name || email,
      question_index: questionIndex, choice_index: 0, is_correct: !!isCorrect, score: score || 0
    };
    const opts = { onConflict: 'session_id,student_email,question_index' };
    let { error } = await sb.from('quizrush_answers').upsert(
      { ...base, attempts: attempts || 1, answer_text: String(answerText || '').slice(0, 4000) }, opts
    );
    if (error) {
      console.warn('[QuizRushEngine] gravando a resposta de código sem attempts/answer_text (rode sql/supabase-setup-completo.sql):', error);
      ({ error } = await sb.from('quizrush_answers').upsert(base, opts));
    }
    if (error) { console.error('[QuizRushEngine] falha ao enviar resposta de código:', error); return null; }
    return { isCorrect: !!isCorrect, score: score || 0 };
  }

  // ---------- Revisão das provas ----------
  // As provas (matéria 'prova' do config da turma) já expõem o banco inteiro no
  // gabarito. A revisão sorteia dali perguntas de múltipla escolha e as
  // questões PRÁTICAS (o aluno escreve/corrige código), que viram problemas do
  // Quizz Prático — nada é cadastrado à parte.

  // A matéria 'prova' também abriga trabalhos (ex.: projeto-app-empreendedor),
  // que não têm banco de questões pra revisar — só as trilhas 'prova-*' entram.
  function listExamModules(cfgTurma, foraDoPeriodo) {
    return listGabaritoModules(cfgTurma, foraDoPeriodo).filter(c =>
      (cfgTurma.materias || []).some(m => m.key === 'prova' && (m.trilhas || []).some(t => t.key === c.trilhaKey && /^prova-/.test(t.key)))
    );
  }

  // Questão prática da prova → problema de código. O gabarito da prova só diz
  // "o que deve aparecer no console", então a correção compara o que o código
  // exibiu (como texto) com esse valor. Com código inicial = "corrija o bug";
  // sem código inicial = "escreva do zero".
  function examPracticeToQuestion(practice, examTitle) {
    const fix = !!String(practice.starterCode || '').trim();
    const explanation = String(practice.bugExplanation || '');
    return {
      type: 'code', lang: 'js', topic: 'Revisão — ' + examTitle, givenVars: [],
      id: 'exam-' + String(practice.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      level: 2, mode: fix ? 'fix' : 'write', title: practice.title,
      prompt: practice.desc + `<br><small>Resultado esperado no console: <code>${escapeHtml(practice.expectedOutput)}</code></small>`,
      starter: fix ? practice.starterCode : '// escreva seu código aqui\n',
      check: { type: 'console', text: true },
      tests: [{ values: {}, expected: [String(practice.expectedOutput).trim()] }],
      solution: practice.solution,
      explanation,
      hint: fix ? 'Compare o que o código mostra hoje com o resultado esperado — o erro está numa linha só.' : 'Use <code>console.log(...)</code> para mostrar o resultado.'
    };
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Carrega uma prova e separa o que ela tem de teoria e de prática.
  async function fetchExamItems({ turma, mod, email, examTitle }) {
    const items = await captureGabaritoItems({ turma, mod, email });
    return {
      theory: items.filter(isChoiceItem).map(toChoiceQuestion),
      practical: items.filter(it => it.practice && it.practice.expectedOutput != null).map(it => examPracticeToQuestion(it.practice, examTitle || mod.title))
    };
  }

  function shuffled(list, random) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  // Monta a partida: `theoryCount` perguntas + `codeCount` problemas (o que
  // faltar no banco simplesmente não entra). Teoria primeiro, código no fim —
  // é o mais demorado, então fecha a partida. Enunciados repetidos entre duas
  // provas (a Final reaproveita o banco da Diagnóstica) entram uma vez só.
  // Cada problema de código leva o próprio tempo (durationMs); as perguntas
  // de múltipla escolha usam o tempo da sessão.
  function buildExamReview({ theory, practical, theoryCount, codeCount, codeSeconds }, rand) {
    const random = rand || Math.random;
    const seen = new Set();
    const uniqueTheory = theory.filter(q => {
      const key = String(q.prompt).replace(/\s+/g, ' ').trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const seenCode = new Set();
    const uniqueCode = practical.filter(q => {
      if (seenCode.has(q.id)) return false;
      seenCode.add(q.id);
      return true;
    });
    const pickedTheory = shuffled(uniqueTheory, random).slice(0, Math.max(0, theoryCount));
    const pickedCode = shuffled(uniqueCode, random).slice(0, Math.max(0, codeCount))
      .map(q => Object.assign({}, q, { durationMs: (codeSeconds || 120) * 1000 }));
    return pickedTheory.concat(pickedCode);
  }

  // powers/penalties são opcionais (default []) só pra não quebrar quem já
  // chamava leaderboardFrom(answers) sozinho antes desses dois recursos
  // existirem.
  function leaderboardFrom(answers, powers, penalties) {
    const byStudent = {};
    const ensure = (email, name) => {
      if (!byStudent[email]) byStudent[email] = { email, name, score: 0, correct: 0, answered: 0, stolen: 0 };
      return byStudent[email];
    };
    answers.forEach(a => {
      const s = ensure(a.student_email, a.student_name);
      s.score += Number(a.score) || 0;
      s.answered += 1;
      if (a.is_correct) s.correct += 1;
    });
    (powers || []).forEach(p => {
      const actor = ensure(p.student_email, p.student_name);
      actor.score += Number(p.amount) || 0;
      if (p.action === 'roubar' && p.target_email) {
        // stolen = total que ESTE aluno pegou dos colegas na partida inteira
        // (mostrado no pódio, ver games/quizrush.html renderPodium) — soma
        // só quando ele é quem pegou, nunca quando é o alvo.
        actor.stolen += Number(p.amount) || 0;
        const target = ensure(p.target_email, p.target_name);
        target.score -= Number(p.amount) || 0;
      }
    });
    (penalties || []).forEach(pen => {
      const s = ensure(pen.student_email, pen.student_name);
      s.score -= Number(pen.amount) || 0;
    });
    // Nunca mostra placar negativo — perder pontos (ponto pego por outro ou saída
    // de tela) reduz até zero, não menos.
    Object.values(byStudent).forEach(s => { s.score = Math.max(0, s.score); });
    return Object.values(byStudent).sort((a, b) => b.score - a.score);
  }

  // ---------- "Pegar pontos" (opcional, allow_steal na sessão) ----------
  // Só quem ACERTOU a pergunta pode usar (a tela é quem garante isso, ver
  // renderReveal em games/quizrush.html) — a policy de insert só confere
  // que quem está gravando é quem diz ser, não se ele acertou; mesmo nível
  // de confiança que já existe em submitAnswer/submitCodeAnswer.
  const STEAL_BONUS_AMOUNT = 300;

  async function submitPower({ sessionId, questionIndex, email, name, action, targetEmail, targetName, amount }) {
    if (!sb || !sessionId || !email) return null;
    const { error } = await sb.from('quizrush_powers').insert({
      session_id: sessionId, question_index: questionIndex, student_email: email, student_name: name || email,
      action, target_email: targetEmail || null, target_name: targetName || null, amount
    });
    // Conflito de chave (já usou o poder nesta pergunta) é o caso comum de
    // um clique duplo/re-render — não é erro de verdade pra quem chamou.
    if (error) { console.warn('[QuizRushEngine] não usou o poder (talvez já tenha usado nesta pergunta):', error); return { ok: false }; }
    return { ok: true };
  }

  async function fetchPowers(sessionId) {
    if (!sb || !sessionId) return [];
    const { data, error } = await sb.from('quizrush_powers').select('*').eq('session_id', sessionId);
    if (error) { console.error('[QuizRushEngine] falha ao listar poderes usados:', error); return []; }
    return data || [];
  }

  // ---------- Penalidade de sair da tela (sempre ativa) ----------
  // Troca de aba/minimiza durante uma pergunta ao vivo (games/quizrush.html,
  // via 'visibilitychange' — NÃO 'blur', mesmo motivo documentado em
  // shared/exam-proctor.js: o jogo roda dentro de um <iframe> da
  // plataforma, e 'blur' dispararia até clicando em qualquer canto do
  // PORTAL fora do iframe). O aluno continua logado/jogando — só perde
  // pontos e vê um aviso na própria tela.
  const LEAVE_PENALTY_AMOUNT = 1000;

  async function submitPenalty({ sessionId, questionIndex, email, name, amount }) {
    if (!sb || !sessionId || !email) return null;
    const { error } = await sb.from('quizrush_penalties').insert({
      session_id: sessionId, question_index: questionIndex, student_email: email, student_name: name || email,
      amount: amount || LEAVE_PENALTY_AMOUNT
    });
    // Conflito de chave = já penalizado nesta pergunta (reload no meio,
    // segundo disparo do evento etc.) — não repete a punição nem o aviso.
    if (error) return { ok: false, alreadyPenalized: true };
    return { ok: true };
  }

  async function fetchPenalties(sessionId) {
    if (!sb || !sessionId) return [];
    const { data, error } = await sb.from('quizrush_penalties').select('*').eq('session_id', sessionId);
    if (error) { console.error('[QuizRushEngine] falha ao listar penalidades:', error); return []; }
    return data || [];
  }

  function watchTable(table, filterCol, filterVal, onChange) {
    if (!sb) return () => {};
    const channel = sb.channel(`realtime_${table}_${filterVal}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: `${filterCol}=eq.${filterVal}` }, onChange)
      .subscribe();
    return () => { try { sb.removeChannel(channel); } catch (e) {} };
  }

  const watchSession = (id, cb) => watchTable('quizrush_sessions', 'id', id, cb);
  const watchPlayers = (id, cb) => watchTable('quizrush_players', 'session_id', id, cb);
  const watchAnswers = (id, cb) => watchTable('quizrush_answers', 'session_id', id, cb);
  const watchPowers = (id, cb) => watchTable('quizrush_powers', 'session_id', id, cb);
  const watchPenalties = (id, cb) => watchTable('quizrush_penalties', 'session_id', id, cb);

  // Pra o aluno detectar uma sessão nova nascendo sem precisar recarregar
  // a página — assim que o professor clica em "Criar QuizRush", quem já
  // está com a aba de Jogos aberta é puxado direto pra tela de entrada.
  const watchNewSessions = (turma, cb) => watchTable('quizrush_sessions', 'turma', turma, cb);

  return {
    enabled: !!sb,
    loadTurmaConfig, trilhasForaDoPeriodo, listGabaritoModules, fetchModuleQuestions,
    listExamModules, fetchExamItems, buildExamReview, examPracticeToQuestion,
    getLatestSession, createSession, startSession, nextQuestion, getServerTimeMs, reveal, showPodium, endSession,
    joinSession, fetchPlayers, fetchAnswers, submitAnswer, scoreFor, leaderboardFrom,
    isCodeQuestion, isCodeSession, listCodeTopics, buildCodeQuestions, submitCodeAnswer,
    STEAL_BONUS_AMOUNT, submitPower, fetchPowers, watchPowers,
    LEAVE_PENALTY_AMOUNT, submitPenalty, fetchPenalties, watchPenalties,
    watchSession, watchPlayers, watchAnswers, watchNewSessions
  };
})();
