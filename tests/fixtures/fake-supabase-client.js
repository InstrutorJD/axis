// Cliente Supabase falso, em memória, só com o suficiente pra exercitar o
// mesmo código que a app roda de verdade (from/select/eq/upsert/update/
// delete/channel/rpc). Os dados vêm de window.__FAKE_DB__, que cada teste
// injeta via page.addInitScript antes de navegar.
(function () {
  function db() {
    window.__FAKE_DB__ = window.__FAKE_DB__ || {};
    return window.__FAKE_DB__;
  }

  function table(name) {
    const d = db();
    d[name] = d[name] || [];
    return d[name];
  }

  // Opt-in: window.__FAKE_DB__.__errors = { game_scores: 'relation "game_scores" does not exist' }
  // simula uma tabela/policy ausente no Supabase de verdade, pra testar como
  // a app reage a um erro de consulta (não só a "tabela vazia").
  function forcedError(name) {
    const err = db().__errors && db().__errors[name];
    return err ? { message: err } : null;
  }

  function matches(row, filters) {
    return filters.every(([col, val]) => row[col] === val);
  }

  // .insert() (diferente de .upsert()) precisa FALHAR numa linha
  // duplicada, não sobrescrever — é assim que shared/quizrush-engine.js
  // detecta "esse aluno já usou o poder/já foi penalizado nesta pergunta"
  // (ver submitPower/submitPenalty). Só as tabelas com essa checagem real
  // precisam entrar aqui; toda outra tabela usa .upsert() no código de
  // verdade, então nunca passa por aqui.
  const PRIMARY_KEYS = {
    quizrush_powers: ['session_id', 'student_email', 'question_index'],
    quizrush_penalties: ['session_id', 'student_email', 'question_index'],
  };

  // .is()/.not(col,'is',val): comparação "solta" (?? null) de propósito —
  // um seed de teste que nunca setou a coluna (ex.: profiles sem
  // archived_at) tem undefined em JS, mas seria NULL de verdade no
  // Postgres; sem isso, `.is('archived_at', null)` não bateria com quase
  // nenhum profile seedado pelos testes existentes.
  function matchesLoose(row, col, val) {
    return (row[col] ?? null) === val;
  }

  function makeQuery(name) {
    const filters = [];
    const orderBys = [];
    const isFilters = []; // .is(col, val) — comparação solta, ver matchesLoose()
    const notFilters = []; // .not(col, 'is', val) — negação da mesma comparação solta
    const gteFilters = []; // .gte(col, val) — NULL/ausente nunca passa, igual ao Postgres
    let limitN = null;
    let rangeFrom = null;
    let rangeTo = null;
    const api = {
      select() { return api; },
      eq(col, val) { filters.push([col, val]); return api; },
      is(col, val) { isFilters.push([col, val]); return api; },
      not(col, _op, val) { notFilters.push([col, val]); return api; },
      gte(col, val) { gteFilters.push([col, val]); return api; },
      order(col, opts) { orderBys.push({ col, ascending: !(opts && opts.ascending === false) }); return api; },
      limit(n) { limitN = n; return api; },
      range(from, to) { rangeFrom = from; rangeTo = to; return api; },
      maybeSingle() {
        const error = forcedError(name);
        return Promise.resolve({
          data: error ? null : (table(name).filter(r => matches(r, filters))[0] || null),
          error,
        });
      },
      insert(payload) {
        // id/created_at default (a maioria das tabelas usados por .insert()
        // não passa isso explícito, igual o Postgres preenche sozinho).
        // PRIMARY_KEYS: diferente de .upsert(), .insert() precisa FALHAR
        // numa linha duplicada em vez de sobrescrever — é assim que
        // shared/quizrush-engine.js detecta "esse aluno já usou o poder/já
        // foi penalizado nesta pergunta" (submitPower/submitPenalty). Só as
        // tabelas com essa checagem real entram no mapa; toda outra tabela
        // (ex.: exam_guard_events) não tem chave composta pra checar aqui.
        const rows = (Array.isArray(payload) ? payload : [payload]).map(row =>
          Object.assign({ id: 'fake-' + Math.random().toString(36).slice(2), created_at: new Date().toISOString() }, row)
        );
        const t = table(name);
        const pk = PRIMARY_KEYS[name];
        if (pk) {
          const dup = rows.find(row => t.some(r => pk.every(c => r[c] === row[c])));
          if (dup) return Promise.resolve({ data: null, error: { message: `duplicate key value violates unique constraint ("${name}" — fake client)` } });
        }
        t.push(...rows);
        return Promise.resolve({ data: rows, error: null });
      },
      upsert(payload, opts) {
        const rows = Array.isArray(payload) ? payload : [payload];
        const t = table(name);
        // onConflict pode ser uma coluna só ("id") ou composta ("turma,data,student_email"),
        // igual ao Supabase de verdade — nesse caso a linha só é a "mesma" se TODAS baterem.
        const conflictCols = ((opts && opts.onConflict) || (rows[0] && (rows[0].id !== undefined ? 'id' : rows[0].ip_address !== undefined ? 'ip_address' : rows[0].student_email !== undefined ? 'student_email' : null)) || '')
          .split(',').map(c => c.trim()).filter(Boolean);
        rows.forEach(row => {
          const idx = conflictCols.length ? t.findIndex(r => conflictCols.every(c => r[c] === row[c])) : -1;
          if (idx >= 0) t[idx] = Object.assign({}, t[idx], row);
          else t.push(row);
        });
        return Promise.resolve({ data: rows, error: null });
      },
      update(payload) {
        // Encadeia quantos .eq() o chamador quiser (igual ao Supabase de
        // verdade) e só aplica a mutação quando a query é de fato aguardada
        // — sem isso, `.update(x).eq(a).eq(b)` quebrava no 2º .eq() (a
        // versão antiga já devolvia uma Promise no 1º .eq(), que não tem
        // método .eq()).
        const updFilters = [];
        const updApi = {
          eq(col, val) { updFilters.push([col, val]); return updApi; },
          then(resolve, reject) {
            table(name).forEach(r => { if (matches(r, updFilters)) Object.assign(r, payload); });
            return Promise.resolve({ data: null, error: null }).then(resolve, reject);
          },
        };
        return updApi;
      },
      delete() {
        return {
          eq(col, val) {
            const t = table(name);
            db()[name] = t.filter(r => r[col] !== val);
            return Promise.resolve({ data: null, error: null });
          },
        };
      },
      then(resolve, reject) {
        const error = forcedError(name);
        if (error) return Promise.resolve({ data: null, error }).then(resolve, reject);
        let rows = table(name).filter(r =>
          matches(r, filters) &&
          isFilters.every(([col, val]) => matchesLoose(r, col, val)) &&
          notFilters.every(([col, val]) => !matchesLoose(r, col, val)) &&
          gteFilters.every(([col, val]) => r[col] != null && r[col] >= val)
        );
        if (orderBys.length) {
          rows = rows.slice().sort((a, b) => {
            for (const { col, ascending } of orderBys) {
              const av = a[col], bv = b[col];
              if (av === bv) continue;
              return (av > bv ? 1 : -1) * (ascending ? 1 : -1);
            }
            return 0;
          });
        }
        if (limitN != null) rows = rows.slice(0, limitN);
        if (rangeFrom != null) rows = rows.slice(rangeFrom, rangeTo + 1);
        // Teto de linhas por resposta do PostgREST (max_rows, 1000 no Supabase
        // por padrão) — um teste liga isso pra reproduzir leitura truncada.
        const maxRows = window.__FAKE_MAX_ROWS__;
        if (maxRows) rows = rows.slice(0, maxRows);
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
      },
    };
    return api;
  }

  // ---------- Auth fake ----------
  //
  // window.PortalSession.getUser() (shared/session.js) chama
  // auth.getUser() e depois consulta a tabela profiles pelo id — os dois
  // precisam bater pra qualquer página autenticada renderizar no teste.
  //
  // "Estar logado" precisa sobreviver a uma navegação de verdade (ex.:
  // index.html faz login e redireciona pra plataforma.html) — window.__FAKE_DB__
  // é reinjetado do zero a cada documento (addInitScript roda de novo em
  // toda página/iframe), então a sessão em si mora no localStorage (que o
  // navegador de verdade preserva entre navegações do mesmo site), não no
  // objeto __FAKE_DB__.
  const AUTH_STORAGE_KEY = '__fake_supabase_session';

  function getStoredAuthUser() {
    try {
      const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function setStoredAuthUser(user) {
    try {
      if (user) window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      else window.localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) { /* ignore */ }
  }

  // Modo 1 (explícito): o teste chama auth.signInWithPassword (ver
  // login.spec.js) ou seta window.__FAKE_DB__.__authUser antes de navegar
  // (ver helpers.js `loginAs`) — persiste em localStorage, sobrevive a
  // redirects de verdade.
  //
  // Modo 2 (auto, default): sem sessão explícita, sintetiza a identidade a
  // partir de "?user=...&role=...&turma=...&name=..." na própria URL da
  // página — o mesmo padrão que a suíte já usava pra montar URLs de teste
  // antes da migração pra Supabase Auth, então a maioria dos testes não
  // precisa mudar nada. Garante também a linha correspondente em
  // `profiles`, senão PortalSession.getUser() não encontra ninguém.
  function resolveFakeAuthUser() {
    const d = db();
    if (d.__authUser === null) { setStoredAuthUser(null); return null; } // teste pediu "deslogado" explicitamente
    if (d.__authUser) { setStoredAuthUser(d.__authUser); return d.__authUser; }

    // A URL da própria página manda, quando presente — cobre o padrão que
    // a suíte já usava (navegar direto pra "?user=X&role=Y") e permite um
    // mesmo teste trocar de usuário entre navegações. Só cai pro que foi
    // persistido (login.spec.js) quando a URL não traz identidade nenhuma.
    const params = new URLSearchParams(window.location.search);
    const email = params.get('user');
    if (email) {
      const id = 'fake-' + email;
      const authUser = { id, email: email + '@aluno.portal.local' };
      const profiles = table('profiles');
      if (!profiles.some(p => p.id === id)) {
        profiles.push({
          id,
          email,
          nome: params.get('name') || email,
          role: params.get('role') || 'aluno',
          turma: params.get('turma') || '',
        });
      }
      setStoredAuthUser(authUser);
      return authUser;
    }

    return getStoredAuthUser();
  }

  // persistSession:false (usado pelo helper de "Dar visto" — ver
  // shared/professor-visto.js) precisa de um client de verdade ISOLADO da
  // sessão principal: no Supabase real, essa opção mantém a sessão só na
  // memória desse client, nunca no localStorage compartilhado — sem isso
  // aqui, um professor validando credenciais nesse fluxo "roubaria" a
  // sessão do aluno logado na mesma aba/origem. memorySession simula
  // exatamente esse isolamento pros testes conseguirem provar isso.
  function createClient(_url, _key, options) {
    const persist = !(options && options.auth && options.auth.persistSession === false);
    let memorySession = null;

    return {
      from(name) { return makeQuery(name); },
      auth: {
        getUser() {
          const user = persist ? resolveFakeAuthUser() : memorySession;
          return Promise.resolve({
            data: { user },
            error: user ? null : { message: 'not authenticated' },
          });
        },
        signInWithPassword({ email, password }) {
          const creds = db().__authCredentials || [];
          const match = creds.find(c => c.email === email && c.password === password);
          if (!match) {
            return Promise.resolve({ data: { user: null, session: null }, error: { message: 'Invalid login credentials' } });
          }
          const authUser = { id: match.id, email };
          if (persist) setStoredAuthUser(authUser); else memorySession = authUser;
          return Promise.resolve({ data: { user: authUser, session: { user: authUser } }, error: null });
        },
        signOut() {
          if (persist) setStoredAuthUser(null); else memorySession = null;
          return Promise.resolve({ error: null });
        },
      },
      channel() {
        const chan = {
          on(_event, filterConfig, callback) {
            const d = db();
            d.__realtimeCallbacks = d.__realtimeCallbacks || {};
            const t = filterConfig && filterConfig.table;
            if (t) (d.__realtimeCallbacks[t] = d.__realtimeCallbacks[t] || []).push(callback);
            return chan;
          },
          subscribe() { return chan; },
        };
        return chan;
      },
      removeChannel() {},
      // Casos especiais que espelham as funções reais do Supabase (ver
      // sql/supabase-setup-completo.sql, bloco 11): mutam a linha e devolvem question_started_at
      // como o now() do "banco" faria, em vez do relógio de quem chamou.
      rpc(name, params) {
        if (name === 'quizrush_start_session' || name === 'quizrush_next_question') {
          const row = table('quizrush_sessions').find(r => r.id === params.p_session_id);
          if (!row) return Promise.resolve({ data: null, error: null });
          const now = new Date().toISOString();
          row.status = 'question';
          row.current_index = name === 'quizrush_next_question' ? params.p_index : 0;
          row.question_started_at = now;
          return Promise.resolve({ data: now, error: null });
        }
        if (name === 'quizrush_server_now') {
          return Promise.resolve({ data: new Date().toISOString(), error: null });
        }
        // Token temporário do professor pra "Dar visto"/"Pular etapa" —
        // ver sql/supabase-setup-completo.sql bloco 13 e
        // shared/professor-visto.js. gerar_professor_token/
        // professor_token_atual só funcionam pro professor (mesma
        // checagem de role que is_professor() faz de verdade);
        // verificar_professor_token é público, qualquer papel pode
        // chamar (é o que a tela do aluno usa).
        if (name === 'gerar_professor_token' || name === 'professor_token_atual') {
          const authUser = resolveFakeAuthUser();
          const profile = authUser && table('profiles').find(p => p.id === authUser.id);
          if (!profile || profile.role !== 'professor') {
            return Promise.resolve({ data: null, error: { message: 'Só o professor pode gerenciar o token.' } });
          }
          const now = Date.now();
          if (name === 'gerar_professor_token') {
            db().professor_tokens = table('professor_tokens').filter(r => new Date(r.expires_at).getTime() <= now);
            const token = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
            const expiresAt = new Date(now + 10 * 60 * 1000).toISOString();
            table('professor_tokens').push({ token, expires_at: expiresAt, created_by: authUser.id, created_at: new Date(now).toISOString() });
            return Promise.resolve({ data: [{ token, expires_at: expiresAt }], error: null });
          }
          const validRows = table('professor_tokens')
            .filter(r => new Date(r.expires_at).getTime() > now)
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
          const current = validRows[0];
          return Promise.resolve({ data: current ? [{ token: current.token, expires_at: current.expires_at }] : [], error: null });
        }
        // Arquivar/reativar aluno (ver sql/supabase-setup-completo.sql e "Alunos" na
        // Gestão) — mesma checagem de role que is_professor() faz de
        // verdade. Não simula o banimento no Supabase Auth em si (o fake
        // não tem auth.users/auth.sessions) — só o profiles.archived_at,
        // que é o que dirige a UI (turmaStudents() filtra por ele). O
        // bloqueio de LOGIN em si é coberto à parte, testando
        // PortalSession.requireUser() diretamente.
        if (name === 'arquivar_aluno' || name === 'reativar_aluno') {
          const authUser = resolveFakeAuthUser();
          const caller = authUser && table('profiles').find(p => p.id === authUser.id);
          if (!caller || !(caller.role === 'professor' || caller.role === 'admin')) {
            return Promise.resolve({ data: null, error: { message: 'Só o professor pode gerenciar alunos.' } });
          }
          const target = table('profiles').find(p => p.email === params.p_email);
          if (!target || target.role !== 'aluno') {
            return Promise.resolve({ data: { success: false, message: 'Aluno não encontrado.' }, error: null });
          }
          target.archived_at = name === 'arquivar_aluno' ? new Date().toISOString() : null;
          return Promise.resolve({ data: { success: true }, error: null });
        }
        if (name === 'verificar_professor_token') {
          const now = Date.now();
          const row = table('professor_tokens').find(r => r.token === params.p_token && new Date(r.expires_at).getTime() > now);
          if (!row) return Promise.resolve({ data: [{ valido: false, nome: null }], error: null });
          const profile = table('profiles').find(p => p.id === row.created_by);
          return Promise.resolve({ data: [{ valido: true, nome: profile ? profile.nome : null }], error: null });
        }
        // Sino de alertas do professor (ver sql/supabase-setup-completo.sql,
        // bloco 14, e shared/platform-core.js, resolverExamGuardEvento):
        // 'liberado' também zera a linha __guard de student_activity_state,
        // igual a RPC real faz — sem isso um teste que clica "Liberar" não
        // consegue provar que o aluno de fato voltou a acessar a atividade.
        if (name === 'resolver_exam_guard_event') {
          const authUser = resolveFakeAuthUser();
          const profile = authUser && table('profiles').find(p => p.id === authUser.id);
          if (!profile || profile.role !== 'professor') {
            return Promise.resolve({ data: null, error: { message: 'Só o professor pode resolver este alerta.' } });
          }
          const row = table('exam_guard_events').find(r => r.id === params.p_event_id);
          if (!row) return Promise.resolve({ data: null, error: { message: 'Alerta não encontrado.' } });
          row.resolved = true;
          row.resolution = params.p_acao;
          row.resolved_by = profile.email;
          row.resolved_at = new Date().toISOString();
          if (params.p_acao === 'liberado') {
            const key = row.activity_location + '__guard';
            const newState = { warnings: 0, blocked: false, updatedAt: new Date().toISOString() };
            const existing = table('student_activity_state').find(r => r.student_email === row.student_email && r.progress_key === key);
            if (existing) Object.assign(existing, { state: newState, updated_at: new Date().toISOString() });
            else table('student_activity_state').push({ student_email: row.student_email, progress_key: key, state: newState, updated_at: new Date().toISOString() });
          }
          return Promise.resolve({ data: null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
    };
  }

  window.supabase = { createClient };

  // Ajuda os testes a simular uma atualização em tempo real (o mock acima
  // não entrega eventos sozinho): modifique window.__FAKE_DB__.<tabela>
  // primeiro, depois chame isto pra disparar os callbacks inscritos nela —
  // exercita o caminho de verdade (subscribe → callback → refetch), não só
  // uma função interna chamada direto pelo teste.
  window.__fireFakeRealtime = function (table) {
    ((db().__realtimeCallbacks && db().__realtimeCallbacks[table]) || []).forEach(cb => cb());
  };
})();
