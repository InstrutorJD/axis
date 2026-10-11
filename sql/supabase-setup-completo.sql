-- ============================================================
-- SETUP COMPLETO — script único e idempotente com todas as tabelas/
-- policies/functions do projeto. É a fonte da verdade: os scripts que
-- criaram cada tabela/coluna isoladamente ao longo do tempo não ficam
-- mais no repositório à parte (histórico de cada mudança preservado
-- no git log deste arquivo).
--
-- Cobre: identidade via Supabase Auth (profiles, current_email(),
-- is_professor() — ver bloco 0), bloqueio de Ctrl+C/V por turma,
-- atividade em tempo real e liberação manual de jogos (painel do
-- professor), o jogo GitHack OS (IP de sessão, criptografia de
-- carteira, isolamento por turma no hack transfer), o cadastro de
-- rede da turma Sistemas, chamada / notas / progresso de trilha
-- (relatórios da aba Gestão), datas de início/prazo por trilha, o
-- placar competitivo dos minigames (Digitação, Campo Minado), a
-- liberação diária de atividades, o QuizRush, a sincronização de
-- progresso entre dispositivos e o token temporário de "Dar visto"/
-- "Pular etapa" do professor.
--
-- PRÉ-REQUISITO: as tabelas network_nodes, node_permissions e
-- node_shields precisam já existir no seu projeto Supabase (foram
-- criadas direto no painel, não por script — ver o bloco 4 abaixo).
-- Sem elas, os blocos 4-6 (jogo GitHack OS) falham. A tabela
-- auth.users (Supabase Auth) precisa ter os usuários já criados por
-- scripts/migrate-users-to-auth.mjs antes de rodar este script pela
-- primeira vez após a migração de identidade (bloco 0 referencia
-- auth.users via foreign key).
--
-- Este script é seguro de rodar mais de uma vez: toda tabela/coluna/
-- índice/função usa IF NOT EXISTS ou CREATE OR REPLACE, e as policies
-- e a inscrição no Realtime são recriadas via DROP/CHECK antes de
-- criar de novo, em vez de simplesmente falhar com "já existe".
--
-- Execute este script inteiro, de uma vez, no SQL Editor do Supabase.
-- ============================================================


-- ============================================================
-- BLOCO 0 — Identidade (Supabase Auth). Uma linha por usuário real
-- (aluno ou professor) em auth.users, espelhada aqui com o MESMO
-- e-mail/username que sempre foi usado como identidade em toda tabela
-- deste script (student_email/aluno_email/network_nodes.email) — só
-- o e-mail interno do Supabase Auth (ex: "breno.silva80@aluno.portal.local")
-- é novo, e nunca aparece fora da tela de login.
--
-- current_email()/is_professor() são o que toda policy abaixo passa a
-- usar em vez de "using (true)": cada policy passa a exigir que a
-- sessão (JWT) bata com o dono da linha, ou que quem chamou seja
-- professor — não é mais o cliente que decide quem ele é.
--
-- Popule/atualize esta tabela rodando scripts/migrate-users-to-auth.mjs
-- (fora do SQL Editor, precisa da service_role key) — não insira linha
-- aqui manualmente além do que o script já faz.
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  nome text not null,
  role text not null check (role in ('aluno', 'professor', 'substituto')),
  turma text not null,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- SECURITY DEFINER de propósito: uma policy comum não pode fazer
-- subselect recursivo na própria tabela que ela protege sem entrar em
-- loop de avaliação de RLS; a function roda com o dono (que enxerga
-- profiles sem RLS) e devolve só o escalar necessário.
create or replace function public.current_email()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select email from public.profiles where id = auth.uid();
$$;

-- 'admin' é tratado como equivalente a 'professor' aqui de propósito — os
-- guards do lado do cliente (shared/clipboard-guard.js,
-- shared/activity-tracker.js, shared/progress-sync.js, shared/
-- exam-proctor.js) já fazem `role === 'professor' || role === 'admin'`
-- desde antes desta função existir; sem essa mesma equivalência aqui, uma
-- conta com role 'admin' passa pelos guards do cliente mas todo RPC/RLS
-- gated por is_professor() (Dar Visto, Chamada, Notas, liberação de jogos,
-- datas de trilha, liberação diária, QuizRush — 40+ usos neste arquivo)
-- devolve 400 "Só o professor pode..." pra essa conta.
create or replace function public.is_professor()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('professor', 'admin'));
$$;

-- O ranking de progresso (computeRanking/renderRankingBadge em
-- platform-core.js) calcula a posição do aluno comparando o progresso de
-- TODA a turma — precisa ler o roster (profiles) e student_module_progress
-- de todo mundo da turma, não só a própria linha, mesmo que a TELA mostre
-- só a posição do próprio aluno (nunca nome/progresso alheio).
create or replace function public.current_turma()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select turma from public.profiles where id = auth.uid();
$$;

grant execute on function public.current_email() to authenticated;
grant execute on function public.is_professor() to authenticated;
grant execute on function public.current_turma() to authenticated;

drop policy if exists "profiles_select_self_or_professor" on public.profiles;
drop policy if exists "profiles_select_self_or_professor_or_same_turma" on public.profiles;
create policy "profiles_select_self_or_professor_or_same_turma"
  on public.profiles for select
  using (id = auth.uid() or public.is_professor() or turma = public.current_turma());

-- Sem policy de insert/update/delete pra authenticated: só quem tem a
-- service_role key (scripts/migrate-users-to-auth.mjs, rodado fora do
-- navegador) cria/atualiza linha em profiles diretamente — as duas
-- functions SECURITY DEFINER abaixo (arquivar_aluno/reativar_aluno) são a
-- única forma do PROFESSOR mudar uma linha de profiles pelo app.

-- Arquivamento de aluno (Gestão → Alunos, shared/platform-core.js): soft-
-- delete, não apaga nada. archived_at marcado tira o aluno de toda lista
-- ativa do portal — turmaStudents()/fetchTurmaStudents() passa a filtrar
-- "archived_at is null", e isso cascateia sozinho pra Gestão, Chamada,
-- Notas, Ranking e os relatórios, já que todos leem dali. Notas, chamada,
-- progresso e placares já lançados NÃO são apagados (continuam no banco,
-- é histórico) — reativar_aluno devolve o aluno pra tudo de novo.
alter table public.profiles add column if not exists archived_at timestamptz;

-- SECURITY DEFINER de propósito, igual current_email()/is_professor()
-- acima: profiles não tem policy de update pra 'authenticated' (comentário
-- acima), então só uma function rodando como o dono (que ignora RLS)
-- consegue gravar archived_at. Além de marcar o profile, bane a conta no
-- Supabase Auth (auth.users.banned_until) e derruba qualquer sessão já
-- aberta (auth.sessions) — sem isso, o aluno continuaria logado (ou
-- conseguiria logar de novo) até o access token expirar sozinho, ~1h
-- depois. Só arquiva conta com role='aluno' — nunca deixa arquivar um
-- professor por engano.
create or replace function public.arquivar_aluno(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_role text;
begin
  if not public.is_professor() then
    raise exception 'Só o professor pode arquivar um aluno.';
  end if;

  select id, role into v_id, v_role from public.profiles where email = p_email;
  if v_id is null then
    return jsonb_build_object('success', false, 'message', 'Aluno não encontrado.');
  end if;
  if v_role <> 'aluno' then
    return jsonb_build_object('success', false, 'message', 'Só é possível arquivar uma conta de aluno.');
  end if;

  update public.profiles set archived_at = now() where id = v_id;
  update auth.users set banned_until = 'infinity' where id = v_id;
  delete from auth.sessions where user_id = v_id;

  return jsonb_build_object('success', true);
end;
$$;

-- Reverte arquivar_aluno por completo: devolve o aluno pra Gestão,
-- Chamada, Notas, Ranking etc. (archived_at volta a null) e destrava o
-- login (banned_until volta a null). Não recria sessão nenhuma — o aluno
-- só precisa logar de novo normalmente.
create or replace function public.reativar_aluno(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_professor() then
    raise exception 'Só o professor pode reativar um aluno.';
  end if;

  select id into v_id from public.profiles where email = p_email and role = 'aluno';
  if v_id is null then
    return jsonb_build_object('success', false, 'message', 'Aluno não encontrado.');
  end if;

  update public.profiles set archived_at = null where id = v_id;
  update auth.users set banned_until = null where id = v_id;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.arquivar_aluno(text) to authenticated;
grant execute on function public.reativar_aluno(text) to authenticated;


-- ============================================================
-- BLOCO 1 — Configurações de sala de aula (bloqueio de Ctrl+C/V)
-- Uma linha por turma (id = 'jogos' | 'sistemas'); a linha 'global'
-- é mantida por compatibilidade, mas não é mais lida por nenhum
-- código (o controle passou a morar dentro do portal de cada turma).
-- ============================================================

create table if not exists public.classroom_settings (
  id text primary key,
  clipboard_blocked boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.classroom_settings (id, clipboard_blocked)
values ('global', false), ('jogos', false), ('sistemas', false)
on conflict (id) do nothing;

-- "Horário de Acesso" (Gestão → Bloqueios e Liberações, sql/horario-acesso.sql):
-- com acesso_restrito ligado, fora de acesso_inicio–acesso_fim o aluno vê o
-- portal fechado (shared/horario-acesso.js, hora do servidor via
-- quizrush_server_now). Desligado = livre; os horários ficam gravados.
alter table public.classroom_settings add column if not exists acesso_restrito boolean not null default false;
alter table public.classroom_settings add column if not exists acesso_inicio time;
alter table public.classroom_settings add column if not exists acesso_fim time;

alter table public.classroom_settings enable row level security;

drop policy if exists "classroom_settings_select_all" on public.classroom_settings;
create policy "classroom_settings_select_all"
  on public.classroom_settings for select
  using (true);

drop policy if exists "classroom_settings_insert_all" on public.classroom_settings;
drop policy if exists "classroom_settings_insert_professor" on public.classroom_settings;
create policy "classroom_settings_insert_professor"
  on public.classroom_settings for insert
  with check (public.is_professor());

drop policy if exists "classroom_settings_update_all" on public.classroom_settings;
drop policy if exists "classroom_settings_update_professor" on public.classroom_settings;
create policy "classroom_settings_update_professor"
  on public.classroom_settings for update
  using (public.is_professor())
  with check (public.is_professor());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'classroom_settings'
  ) then
    alter publication supabase_realtime add table public.classroom_settings;
  end if;
end $$;


-- ============================================================
-- BLOCO 2 — Atividade em tempo real dos alunos (painel do professor)
-- ============================================================

create table if not exists public.student_activity (
  id uuid primary key default gen_random_uuid(),

  -- identificação do aluno (mesma chave usada no login: USERS_JSON[].email)
  student_email text not null unique,
  student_name text,
  turma text,

  -- status calculado no cliente: 'active' | 'idle' | 'offline'
  status text not null default 'offline' check (status in ('active', 'idle', 'offline')),

  -- chave curta de localização (ex: 'js_basico', 'js_intermediario', 'csharp',
  -- 'jogos_hacker', 'jogos_digitacao', 'jogos_campo_minado', 'aulas', 'jogos', 'professor')
  location text not null default 'offline',

  -- texto amigável para exibir no painel (ex: "Duelo 3: Escudo Par/Ímpar")
  location_label text,

  -- dados extras estruturados (ex: {"challenge_id":3,"total":7,"progress":2})
  detail jsonb,

  -- último momento em que o aluno de fato interagiu (mouse/teclado/clique)
  last_interaction_at timestamptz not null default now(),

  -- último "heartbeat" enviado pelo cliente (usado para detectar quem ficou offline)
  updated_at timestamptz not null default now(),

  created_at timestamptz not null default now()
);

-- Acelera a checagem de "quem está com heartbeat desatualizado (offline)"
create index if not exists idx_student_activity_updated_at
  on public.student_activity (updated_at);

alter table public.student_activity enable row level security;

-- O aluno precisa enxergar (não só escrever) a PRÓPRIA linha aqui — sem
-- isso, o upsert do heartbeat (shared/activity-tracker.js, a cada 15s)
-- nunca localiza a linha em conflito pra atualizar (ON CONFLICT DO UPDATE
-- depende de conseguir "ver" a linha existente sob RLS), e a gravação
-- falha silenciosamente (best-effort, sem erro visível pra ninguém) desde
-- a migração pra Supabase Auth — é por isso que o painel "Atividade em
-- Tempo Real" parou de atualizar pra todo mundo bem nessa época.
drop policy if exists "student_activity_select_all" on public.student_activity;
drop policy if exists "student_activity_select_professor" on public.student_activity;
drop policy if exists "student_activity_select_self_or_professor" on public.student_activity;
create policy "student_activity_select_self_or_professor"
  on public.student_activity for select
  using (public.is_professor() or student_email = public.current_email());

drop policy if exists "student_activity_insert_all" on public.student_activity;
drop policy if exists "student_activity_insert_self" on public.student_activity;
create policy "student_activity_insert_self"
  on public.student_activity for insert
  with check (student_email = public.current_email());

drop policy if exists "student_activity_update_all" on public.student_activity;
drop policy if exists "student_activity_update_self" on public.student_activity;
create policy "student_activity_update_self"
  on public.student_activity for update
  using (student_email = public.current_email())
  with check (student_email = public.current_email());

-- Tempo logado hoje: acumula segundos ativos no dia, pra mostrar no
-- Relatório de Atividade do Dia (aba Gestão) quanto tempo cada aluno
-- ficou com o portal aberto hoje. Não existe log de sessão (login/
-- logout) — só o heartbeat de 15 em 15s de shared/activity-tracker.js
-- — então o gatilho abaixo estima o tempo somando o intervalo entre um
-- heartbeat e o anterior, contando só intervalos de até 60s (~4x o
-- heartbeat): um intervalo maior que isso significa aba fechada/
-- computador dormindo nesse meio tempo, não tempo logado de verdade.
-- Zera sozinho quando o dia muda (activity_date). Usa now() do banco
-- pro cálculo do intervalo, não o relógio do cliente, pelo mesmo motivo
-- da correção do QuizRush (relógio de dispositivo não é confiável).
alter table public.student_activity add column if not exists active_seconds_today int not null default 0;
alter table public.student_activity add column if not exists activity_date date not null default current_date;

-- Há quanto tempo o aluno está NESSA tela (coluna "Há quanto tempo" da
-- Atividade em Tempo Real) — diferente de updated_at (que muda a cada
-- heartbeat de 15s, mesmo ficando na mesma tela): location_started_at só
-- reseta quando `location` muda de verdade, então ele marca desde QUANDO
-- o aluno chegou na tela atual. Calculado aqui embaixo, no mesmo gatilho
-- que já corrige updated_at pra usar o relógio do banco (não do cliente)
-- — pelo mesmo motivo: se fosse o cliente quem mandasse esse timestamp,
-- um relógio de aluno desacertado bagunçaria a conta.
alter table public.student_activity add column if not exists location_started_at timestamptz not null default now();

create or replace function public.track_daily_active_seconds()
returns trigger
language plpgsql
as $$
declare
  v_gap_seconds numeric;
begin
  -- new.updated_at chega do cliente (shared/activity-tracker.js manda
  -- new Date().toISOString() do PRÓPRIO navegador do aluno) — em vez de
  -- confiar nesse valor, o gatilho sempre sobrescreve com now() do banco.
  -- Sem isso, um computador de laboratório com relógio desacertado (comum
  -- sem NTP) fazia o aluno aparecer sempre "Offline" no painel Atividade
  -- em Tempo Real (a aba Gestão compara updated_at contra o relógio do
  -- PROFESSOR — os dois relógios de cliente nunca precisavam bater antes
  -- dessa correção) e também corrompia o cálculo de v_gap_seconds abaixo,
  -- que já pretendia (mas não conseguia, por causa disso) usar só o
  -- relógio do servidor.
  new.updated_at := now();

  if tg_op = 'INSERT' then
    new.activity_date := current_date;
    new.active_seconds_today := 0;
    new.location_started_at := now();
    return new;
  end if;

  if old.activity_date is distinct from current_date then
    new.activity_date := current_date;
    new.active_seconds_today := 0;
  else
    v_gap_seconds := extract(epoch from (now() - old.updated_at));
    if v_gap_seconds > 0 and v_gap_seconds <= 60 then
      new.active_seconds_today := coalesce(old.active_seconds_today, 0) + round(v_gap_seconds)::int;
    else
      new.active_seconds_today := coalesce(old.active_seconds_today, 0);
    end if;
    new.activity_date := current_date;
  end if;

  -- location_started_at só reseta quando a localização muda de verdade —
  -- do contrário (heartbeat normal na mesma tela), preserva o valor
  -- antigo, que é justamente o que faz a coluna significar "desde quando"
  -- em vez de "última vez que o heartbeat chegou" (isso já é updated_at).
  if old.location is distinct from new.location then
    new.location_started_at := now();
  else
    new.location_started_at := old.location_started_at;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_student_activity_daily_seconds on public.student_activity;
create trigger trg_student_activity_daily_seconds
before insert or update on public.student_activity
for each row execute function public.track_daily_active_seconds();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'student_activity'
  ) then
    alter publication supabase_realtime add table public.student_activity;
  end if;
end $$;


-- ============================================================
-- BLOCO 2b — Histórico de tempo no portal, por aluno/dia/atividade
-- (Gestão → Relatórios → "Relatório por Aluno"). Também em
-- sql/student-time-log.sql.
-- ============================================================
-- active_seconds_today (acima) zera todo dia; esta tabela guarda o tempo
-- por aluno, por DIA (de Brasília) e por LOCAL (o `location` do
-- heartbeat — dentro de uma atividade é o ACTIVITY_LOCATION dela). Quem
-- preenche é o gatilho log_student_time, em cima do mesmo heartbeat de
-- 15s: soma o intervalo desde o anterior (até 60s) no local em que o aluno
-- estava, só se ele estava ATIVO (aba visível + interação nos últimos
-- 2 min). Nenhuma gravação nova no navegador. Sem histórico retroativo.

create table if not exists public.student_time_log (
  student_email text not null,
  turma text,
  dia date not null,
  location text not null,
  seconds int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (student_email, dia, location)
);

create index if not exists idx_student_time_log_turma_dia
  on public.student_time_log (turma, dia);

alter table public.student_time_log enable row level security;

-- Aluno lê só o próprio; professor lê tudo. Ninguém grava pelo navegador
-- (o gatilho é security definer — o aluno não consegue inflar o tempo).
drop policy if exists "student_time_log_select_self_or_professor" on public.student_time_log;
create policy "student_time_log_select_self_or_professor"
  on public.student_time_log for select
  using (public.is_professor() or student_email = public.current_email());

create or replace function public.log_student_time()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gap numeric;
begin
  -- new.updated_at já é o now() do banco (trg_student_activity_daily_seconds
  -- roda antes e sobrescreve o relógio do cliente).
  v_gap := extract(epoch from (new.updated_at - old.updated_at));
  if v_gap > 0 and v_gap <= 60 and old.status = 'active' then
    begin
      insert into public.student_time_log as l (student_email, turma, dia, location, seconds, updated_at)
      values (
        old.student_email,
        coalesce(new.turma, old.turma),
        (now() at time zone 'America/Sao_Paulo')::date,
        coalesce(nullif(old.location, ''), 'desconhecido'),
        round(v_gap)::int,
        now()
      )
      on conflict (student_email, dia, location)
      do update set seconds = l.seconds + excluded.seconds,
                    turma = coalesce(excluded.turma, l.turma),
                    updated_at = now();
    exception when others then
      -- Best-effort: o histórico nunca pode derrubar o heartbeat.
      null;
    end;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_student_activity_time_log on public.student_activity;
create trigger trg_student_activity_time_log
after update on public.student_activity
for each row execute function public.log_student_time();


-- ============================================================
-- BLOCO 3 — Liberação manual de jogos pelo professor
-- ============================================================

create table if not exists public.student_overrides (
  student_email text primary key,
  games_unlocked boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.student_overrides enable row level security;

drop policy if exists "student_overrides_select_all" on public.student_overrides;
drop policy if exists "student_overrides_select_self_or_professor" on public.student_overrides;
create policy "student_overrides_select_self_or_professor"
  on public.student_overrides for select
  using (public.is_professor() or student_email = public.current_email());

drop policy if exists "student_overrides_insert_all" on public.student_overrides;
drop policy if exists "student_overrides_insert_professor" on public.student_overrides;
create policy "student_overrides_insert_professor"
  on public.student_overrides for insert
  with check (public.is_professor());

drop policy if exists "student_overrides_update_all" on public.student_overrides;
drop policy if exists "student_overrides_update_professor" on public.student_overrides;
create policy "student_overrides_update_professor"
  on public.student_overrides for update
  using (public.is_professor())
  with check (public.is_professor());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'student_overrides'
  ) then
    alter publication supabase_realtime add table public.student_overrides;
  end if;
end $$;


-- ============================================================
-- BLOCO 4 — Jogo GitHack OS: IP de sessão rotativo e criptografia
-- temporária da carteira JDCoin.
--
-- Pressupõe que as tabelas network_nodes, node_permissions e
-- node_shields já existem (criadas direto no painel do Supabase).
-- ============================================================

-- IP de sessão rotativo: coluna separada da identidade (ip_address,
-- PK), então carteira, pastas e blindagem não precisam mudar de
-- chave. A cada "ip connect" o aluno recebe um endereço sorteado da
-- faixa 192.168.1.100-199 (fora da faixa de identidade .10-.26/.254),
-- liberado de volta ao pool no "ip disconnect".
alter table public.network_nodes add column if not exists current_ip text;

-- Garante que dois alunos online nunca fiquem com o mesmo endereço ao mesmo tempo.
create unique index if not exists network_nodes_current_ip_unique
  on public.network_nodes (current_ip)
  where current_ip is not null;

create or replace function public.assign_session_ip(p_ip_address text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidate text;
  v_attempt   int := 0;
begin
  if not exists (
    select 1 from network_nodes where ip_address = p_ip_address and email = public.current_email()
  ) then
    raise exception 'Nó % não pertence ao usuário autenticado.', p_ip_address;
  end if;

  loop
    v_attempt := v_attempt + 1;
    if v_attempt > 50 then
      raise exception 'Não há endereços de rede livres no momento.';
    end if;

    v_candidate := '192.168.1.' || (100 + floor(random() * 100)::int);

    begin
      update network_nodes
      set current_ip = v_candidate, is_online = true
      where ip_address = p_ip_address;

      if not found then
        raise exception 'Nó % não encontrado.', p_ip_address;
      end if;

      return v_candidate;
    exception when unique_violation then
      continue;
    end;
  end loop;
end;
$$;

create or replace function public.release_session_ip(p_ip_address text)
returns void
language sql
security definer
set search_path = public
as $$
  update network_nodes set current_ip = null, is_online = false
  where ip_address = p_ip_address and email = public.current_email();
$$;

grant execute on function public.assign_session_ip(text) to anon, authenticated;
grant execute on function public.release_session_ip(text) to anon, authenticated;

-- Criptografia temporária da carteira JDCoin: o aluno define uma
-- senha de 1 caractere (letra a-z/A-Z ou número 0-9, sem símbolos)
-- que protege /jdcoin e o "hack transfer" por 2min. A senha nunca é
-- exposta ao cliente: não existe policy de select em
-- node_wallet_locks, só as funções abaixo (security definer) leem/
-- comparam a senha.
create table if not exists public.node_wallet_locks (
  ip_address    text primary key,
  password_char text not null,
  expires_at    timestamptz not null
);

alter table public.node_wallet_locks enable row level security;

create or replace function public.set_wallet_password(p_ip_address text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_password is null or p_password !~ '^[A-Za-z0-9]$' then
    return jsonb_build_object('success', false, 'message', 'Senha inválida. Use exatamente 1 caractere: letra (a-z/A-Z) ou número (0-9), sem símbolos.');
  end if;

  if exists (
    select 1 from node_wallet_locks
    where ip_address = p_ip_address and expires_at > now()
  ) then
    return jsonb_build_object('success', false, 'message', 'A carteira já está criptografada.');
  end if;

  insert into node_wallet_locks (ip_address, password_char, expires_at)
  values (p_ip_address, p_password, now() + interval '2 minutes')
  on conflict (ip_address) do update
    set password_char = excluded.password_char,
        expires_at = excluded.expires_at;

  return jsonb_build_object('success', true, 'message', 'Carteira criptografada por 2 minutos.');
end;
$$;

create or replace function public.wallet_lock_status(p_ip_address text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expires timestamptz;
begin
  select expires_at into v_expires
  from node_wallet_locks
  where ip_address = p_ip_address and expires_at > now();

  if v_expires is null then
    return jsonb_build_object('locked', false);
  end if;

  return jsonb_build_object('locked', true, 'expires_at', v_expires);
end;
$$;

create or replace function public.attempt_wallet_bruteforce(p_ip_address text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_password text;
  v_expires  timestamptz;
  v_charset  text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  v_guesses  text[];
  v_cracked  boolean := false;
begin
  select password_char, expires_at into v_password, v_expires
  from node_wallet_locks
  where ip_address = p_ip_address
  for update;

  if v_password is null or v_expires <= now() then
    return jsonb_build_object('success', true, 'locked', false, 'cracked', false, 'message', 'A carteira do alvo não está criptografada no momento.');
  end if;

  select array_agg(c) into v_guesses
  from (
    select substr(v_charset, i, 1) as c
    from generate_series(1, length(v_charset)) i
    order by random()
    limit 10
  ) shuffled;

  v_cracked := v_password = any(v_guesses);

  if v_cracked then
    delete from node_wallet_locks where ip_address = p_ip_address;
  end if;

  return jsonb_build_object(
    'success', true,
    'locked', true,
    'cracked', v_cracked,
    'attempts', v_guesses,
    'message', case when v_cracked
      then 'Senha quebrada por força bruta! A criptografia da carteira caiu.'
      else 'Força bruta falhou: nenhuma das 10 tentativas bateu com a senha.'
    end
  );
end;
$$;

grant execute on function public.set_wallet_password(text, text) to anon, authenticated;
grant execute on function public.wallet_lock_status(text) to anon, authenticated;
grant execute on function public.attempt_wallet_bruteforce(text) to anon, authenticated;

-- network_nodes/node_permissions/node_shields foram criadas direto no
-- painel do Supabase (não por script), então nunca tiveram RLS
-- definido aqui — na prática ficavam tão abertas quanto tudo mais.
-- Leitura continua ampla (netscan precisa ver o estado de todo mundo
-- da rede pra desenhar a tela); a escrita passa a exigir ser dono do
-- próprio nó (ou professor). O saldo (jdcoin_balance) só muda via
-- execute_hack_transfer (abaixo, já validado) ou pelo professor —
-- update direto de saldo pelo cliente deixa de ser aceito.
alter table public.network_nodes enable row level security;

drop policy if exists "network_nodes_select_all" on public.network_nodes;
create policy "network_nodes_select_all"
  on public.network_nodes for select
  using (true);

drop policy if exists "network_nodes_update_professor" on public.network_nodes;
create policy "network_nodes_update_professor"
  on public.network_nodes for update
  using (public.is_professor())
  with check (public.is_professor());

alter table public.node_permissions enable row level security;

drop policy if exists "node_permissions_select_all" on public.node_permissions;
create policy "node_permissions_select_all"
  on public.node_permissions for select
  using (true);

drop policy if exists "node_permissions_write_own_or_professor" on public.node_permissions;
create policy "node_permissions_write_own_or_professor"
  on public.node_permissions for all
  using (
    public.is_professor()
    or ip_address in (select ip_address from network_nodes where email = public.current_email())
  )
  with check (
    public.is_professor()
    or ip_address in (select ip_address from network_nodes where email = public.current_email())
  );

alter table public.node_shields enable row level security;

drop policy if exists "node_shields_select_all" on public.node_shields;
create policy "node_shields_select_all"
  on public.node_shields for select
  using (true);

drop policy if exists "node_shields_write_own_or_professor" on public.node_shields;
create policy "node_shields_write_own_or_professor"
  on public.node_shields for all
  using (
    public.is_professor()
    or ip_address in (select ip_address from network_nodes where email = public.current_email())
  )
  with check (
    public.is_professor()
    or ip_address in (select ip_address from network_nodes where email = public.current_email())
  );


-- ============================================================
-- BLOCO 5 — Isolamento por turma no jogo GitHack OS: um aluno só
-- pode ver e atacar nós da PRÓPRIA turma (Jogos ou Sistemas).
--
-- games/jogo.html já filtra por turma no netscan/git clone (client-
-- side); este bloco reforça a mesma regra no banco, para que a
-- transferência de JDCoin não possa ser feita entre turmas mesmo que
-- alguém chame a função diretamente pelo console do navegador.
--
-- execute_hack_transfer é definida aqui já na versão final (com a
-- checagem de turma) — não precisa criar a versão antiga primeiro.
-- ============================================================

-- Nova coluna. Toda linha que já existia em network_nodes antes da
-- turma Sistemas existir é de aluno de Jogos, então o backfill abaixo é seguro.
alter table public.network_nodes add column if not exists turma text;
update public.network_nodes set turma = 'jogos' where turma is null;
alter table public.network_nodes alter column turma set default 'jogos';

-- Contador de ataques bem-sucedidos, pro ranking "hacker com mais
-- ataques" (comando `ranking` em games/jogo.html, placar genérico de
-- shared/game-leaderboard.js com game='hacker').
alter table public.network_nodes add column if not exists attack_count int not null default 0;

create or replace function public.execute_hack_transfer(attacker_ip text, target_ip text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_balance        numeric;
  v_attacker_balance      numeric;
  v_target_online         boolean;
  v_target_shielded       boolean;
  v_target_turma          text;
  v_attacker_turma        text;
  v_stolen                numeric;
  v_first_ip              text;
  v_second_ip             text;
  v_attacker_attack_count int;
begin
  if attacker_ip = target_ip then
    return jsonb_build_object('success', false, 'message', 'Não é possível atacar o próprio nó.');
  end if;

  if not exists (
    select 1 from network_nodes where ip_address = attacker_ip and email = public.current_email()
  ) then
    return jsonb_build_object('success', false, 'message', 'Falha no ataque: IP de origem não pertence à sua sessão.');
  end if;

  if attacker_ip < target_ip then
    v_first_ip := attacker_ip; v_second_ip := target_ip;
  else
    v_first_ip := target_ip; v_second_ip := attacker_ip;
  end if;

  perform 1 from network_nodes where ip_address = v_first_ip for update;
  perform 1 from network_nodes where ip_address = v_second_ip for update;

  select jdcoin_balance, is_online, turma into v_target_balance, v_target_online, v_target_turma
  from network_nodes where ip_address = target_ip;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Nó de destino não encontrado.');
  end if;

  select jdcoin_balance, turma into v_attacker_balance, v_attacker_turma
  from network_nodes where ip_address = attacker_ip;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Nó do atacante não encontrado.');
  end if;

  if v_attacker_turma is distinct from v_target_turma then
    return jsonb_build_object('success', false, 'message', 'Falha no ataque: nó fora da sua turma.');
  end if;

  if v_target_online is distinct from true then
    return jsonb_build_object('success', false, 'message', 'Host offline. IP inalcançável na rede.');
  end if;

  select exists (
    select 1 from node_shields
    where ip_address = target_ip
      and is_shielded = true
      and (expires_at is null or expires_at > now())
  ) into v_target_shielded;

  if v_target_shielded then
    return jsonb_build_object('success', false, 'message', 'Falha no ataque: O nó de destino ativou o Antivírus.');
  end if;

  if exists (
    select 1 from node_wallet_locks
    where ip_address = target_ip and expires_at > now()
  ) then
    return jsonb_build_object('success', false, 'message', 'Falha no ataque: A carteira do alvo está criptografada. Quebre a senha primeiro (hack crack).');
  end if;

  v_stolen := round(v_target_balance * 0.5, 2);

  update network_nodes set jdcoin_balance = jdcoin_balance - v_stolen where ip_address = target_ip;
  update network_nodes set jdcoin_balance = jdcoin_balance + v_stolen, attack_count = attack_count + 1
    where ip_address = attacker_ip
    returning attack_count into v_attacker_attack_count;

  return jsonb_build_object(
    'success', true,
    'message', 'Transferência concluída.',
    'target_balance', v_target_balance - v_stolen,
    'attacker_balance', v_attacker_balance + v_stolen,
    'stolen', v_stolen,
    'attacker_attack_count', v_attacker_attack_count
  );
end;
$$;

grant execute on function public.execute_hack_transfer(text, text) to anon, authenticated;


-- ============================================================
-- BLOCO 6 — Cadastra os nós de rede (jogo GitHack OS) para os 26
-- alunos da turma Sistemas. Sem isso, tentar hackear esses alunos
-- falha com "Nó de destino não encontrado", porque
-- execute_hack_transfer() só enxerga IPs que existem aqui.
-- ============================================================

insert into public.network_nodes (ip_address, email, jdcoin_balance, is_online, current_ip, turma, folders)
values
  ('192.168.2.1', 'alexandre.natal', 1183.50, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.2', 'amanda.silva32', 1367.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.3', 'ana.quevedo1', 1550.50, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.4', 'anne.karoline', 1734.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.6', 'bianca.bernardi', 2101.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.7', 'bruno.gomes1', 2211.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.8', 'douglas.silva16', 2394.50, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.9', 'emilly.oliveira75', 2578.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.10', 'enzo.lopes4', 2761.50, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.11', 'erasmo.prado', 2945.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.12', 'franciele.alencar', 3128.50, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.13', 'guilherme.almeida8', 3312.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.14', 'guilherme.lima119', 3422.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.15', 'gustavo.robson', 3605.50, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.16', 'hebert.eduardo', 3789.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.17', 'isabella.prado', 3972.50, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.18', 'joao.sousa73', 4156.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.19', 'jordanna.rocha', 1139.50, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.20', 'kaila.jesus', 1323.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.21', 'kauan.sousa60', 1433.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.23', 'lauan.souza', 1800.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.24', 'luana.victoria', 1983.50, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.25', 'moises.barros', 2167.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.26', 'nicole.santos21', 2350.50, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.27', 'vicente.ferreira', 2534.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.28', 'victor.teodoro', 2644.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb)
on conflict (ip_address) do nothing;


-- ============================================================
-- BLOCO 6b — Nó de rede do professor (usuário "admin"), um por turma.
-- ip_address é a chave e cada linha pertence a uma turma só, então o
-- professor precisa de um IP diferente em cada subnet pra aparecer no
-- netscan/git clone dos alunos daquela turma (ver professor/painel.html,
-- que já usa esses dois IPs pros links de "Jogos" e "Sistemas").
--
-- email também é único em network_nodes (constraint descoberta ao rodar
-- este script — a tabela não está em nenhum script deste repositório,
-- foi criada direto no painel do Supabase), por isso as duas linhas
-- usam e-mails diferentes mesmo sendo o mesmo professor. "on conflict
-- do nothing" sem coluna cobre tanto ip_address quanto email, pra não
-- quebrar se algum dos dois já existir de uma tentativa anterior.
-- ============================================================

insert into public.network_nodes (ip_address, email, jdcoin_balance, is_online, current_ip, turma, folders)
values
  ('192.168.1.254', 'admin', 9999.00, false, null, 'jogos', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.254', 'admin.sistemas', 9999.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb)
on conflict do nothing;


-- ============================================================
-- BLOCO 7 — Chamada (frequência), notas por bimestre e progresso de
-- trilha (usado no relatório de notas para mostrar % de desempenho).
-- ============================================================

-- Chamada: uma linha por (turma, data, aluno). O painel do professor
-- faz upsert de uma linha por aluno ao "Finalizar".
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  turma text not null,
  data date not null,
  student_email text not null,
  student_name text,
  presente boolean not null default true,
  finalizada_em timestamptz,
  updated_at timestamptz not null default now(),
  unique (turma, data, student_email)
);

create index if not exists idx_attendance_turma_data on public.attendance (turma, data);
create index if not exists idx_attendance_student on public.attendance (student_email);

alter table public.attendance enable row level security;

drop policy if exists "attendance_select_all" on public.attendance;
drop policy if exists "attendance_select_self_or_professor" on public.attendance;
create policy "attendance_select_self_or_professor"
  on public.attendance for select
  using (public.is_professor() or student_email = public.current_email());

drop policy if exists "attendance_insert_all" on public.attendance;
drop policy if exists "attendance_insert_professor" on public.attendance;
create policy "attendance_insert_professor"
  on public.attendance for insert
  with check (public.is_professor());

drop policy if exists "attendance_update_all" on public.attendance;
drop policy if exists "attendance_update_professor" on public.attendance;
create policy "attendance_update_professor"
  on public.attendance for update
  using (public.is_professor())
  with check (public.is_professor());

-- Notas: uma linha por (aluno, bimestre), com 4 campos de nota. A
-- média é uma coluna gerada (calculada pelo próprio banco). nota1
-- ("Portal", ver shared/platform-core.js) não é digitada pelo professor —
-- o front calcula sozinho, a partir da % de conclusão (student_module_
-- progress) das trilhas atribuídas àquele bimestre (trilha_bimestre), até
-- 5,0 pontos, e só grava o resultado aqui igual às outras notas.
create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  student_email text not null,
  student_name text,
  turma text not null,
  bimestre smallint not null check (bimestre between 1 and 4),
  nota1 numeric,
  nota2 numeric,
  nota3 numeric,
  nota4 numeric,
  media numeric generated always as (
    round((coalesce(nota1, 0) + coalesce(nota2, 0) + coalesce(nota3, 0) + coalesce(nota4, 0)) / 4.0, 2)
  ) stored,
  updated_at timestamptz not null default now(),
  unique (student_email, bimestre)
);

create index if not exists idx_grades_turma_bimestre on public.grades (turma, bimestre);

-- Notas manuais por matéria (Gestão → Lançar Notas, chave "Editar Notas
-- Manuais" em Bloqueios e Liberações): { "<materia_key>": nota } — substitui a nota
-- calculada daquela matéria. Ver sql/notas-manuais-materia.sql.
alter table public.grades add column if not exists notas_materia jsonb not null default '{}'::jsonb;

-- Notas congeladas ao "Fechar bimestre": { "<materia_key>": nota | null },
-- a nota FINAL de cada matéria no momento em que o professor fechou.
-- Ver sql/fechar-bimestre.sql.
alter table public.grades add column if not exists notas_congeladas jsonb;

alter table public.grades enable row level security;

drop policy if exists "grades_select_all" on public.grades;
drop policy if exists "grades_select_self_or_professor" on public.grades;
create policy "grades_select_self_or_professor"
  on public.grades for select
  using (public.is_professor() or student_email = public.current_email());

drop policy if exists "grades_insert_all" on public.grades;
drop policy if exists "grades_insert_professor" on public.grades;
create policy "grades_insert_professor"
  on public.grades for insert
  with check (public.is_professor());

drop policy if exists "grades_update_all" on public.grades;
drop policy if exists "grades_update_professor" on public.grades;
create policy "grades_update_professor"
  on public.grades for update
  using (public.is_professor())
  with check (public.is_professor());

-- Realtime: quando o professor clica em "Salvar" em Lançar Notas (Gestão),
-- o aluno que estiver com a aba Perfil aberta na hora vê a "NOTA" de cada
-- matéria atualizar sozinha, sem precisar recarregar (ver
-- shared/platform-core.js: watchGrades/renderPerfilTab).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'grades'
  ) then
    alter publication supabase_realtime add table public.grades;
  end if;
end $$;

-- Progresso de trilha, sincronizado pelo shared/platform-core.js (roda
-- no navegador do aluno) — permite o relatório de notas mostrar o
-- desempenho por trilha em %, algo que antes só existia espalhado
-- pelo localStorage de cada aluno.
create table if not exists public.student_module_progress (
  student_email text not null,
  student_name text,
  turma text not null,
  trilha_key text not null,
  module_key text not null,
  progress_current int not null default 0,
  progress_total int not null default 1,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (student_email, trilha_key, module_key)
);

create index if not exists idx_student_module_progress_turma on public.student_module_progress (turma);

alter table public.student_module_progress enable row level security;

-- select por turma inteira (não só a própria linha): o ranking de cada
-- aluno (computeRanking em platform-core.js) precisa comparar o progresso
-- de todo mundo da turma pra calcular a própria posição — a TELA nunca
-- mostra progresso/nome de outro aluno, só a leitura crua fica ampla.
drop policy if exists "student_module_progress_select_all" on public.student_module_progress;
drop policy if exists "student_module_progress_select_same_turma_or_professor" on public.student_module_progress;
create policy "student_module_progress_select_same_turma_or_professor"
  on public.student_module_progress for select
  using (public.is_professor() or turma = public.current_turma());

drop policy if exists "student_module_progress_insert_all" on public.student_module_progress;
drop policy if exists "student_module_progress_insert_self" on public.student_module_progress;
create policy "student_module_progress_insert_self"
  on public.student_module_progress for insert
  with check (student_email = public.current_email());

drop policy if exists "student_module_progress_update_all" on public.student_module_progress;
drop policy if exists "student_module_progress_update_self" on public.student_module_progress;
create policy "student_module_progress_update_self"
  on public.student_module_progress for update
  using (student_email = public.current_email())
  with check (student_email = public.current_email());

-- completed_at: quando o módulo foi concluído de VERDADE — não confundir
-- com updated_at, que muda toda vez que o portal carrega
-- (syncAllModulesProgress ressincroniza TODOS os módulos a cada login,
-- mesmo com progresso zero). Sem essa coluna, "Relatório de Atividade do
-- Dia" (aba Gestão) não teria como saber SE e QUANDO um aluno concluiu
-- algo, só a última vez que o navegador dele sincronizou. O trigger só
-- grava/atualiza completed_at no instante em que completed vira true
-- (preserva o valor em resyncs seguintes do mesmo módulo já concluído,
-- e limpa se for resetado).
alter table public.student_module_progress add column if not exists completed_at timestamptz;

create or replace function public.set_module_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.completed and (tg_op = 'INSERT' or old.completed is distinct from true) then
    new.completed_at := now();
  elsif new.completed and old.completed = true then
    new.completed_at := old.completed_at;
  elsif not new.completed then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_student_module_progress_completed_at on public.student_module_progress;
create trigger trg_student_module_progress_completed_at
before insert or update on public.student_module_progress
for each row execute function public.set_module_completed_at();

-- Backfill único: módulos que já estavam completed=true ANTES desta
-- coluna/trigger existir ficariam com completed_at nulo pra sempre (o
-- trigger só carimba na TRANSIÇÃO false→true, e um módulo já concluído
-- preserva o valor antigo em cada resync). Sem isso, quem concluiu algo
-- antes de rodar este script nunca apareceria como "ativo" no Relatório
-- de Atividade do Dia. Usa updated_at como aproximação — não é o
-- instante exato da conclusão, mas é a melhor informação disponível.
-- Idempotente: só afeta linhas com completed_at ainda nulo.
--
-- Desliga o próprio gatilho durante o UPDATE: como completed não muda
-- (continua true), o ramo "preserva o valor antigo" do gatilho
-- sobrescreveria completed_at de volta pro valor antigo (nulo) na hora,
-- anulando este backfill por completo se o gatilho ficasse ativo.
alter table public.student_module_progress disable trigger trg_student_module_progress_completed_at;

update public.student_module_progress
set completed_at = updated_at
where completed = true and completed_at is null;

alter table public.student_module_progress enable trigger trg_student_module_progress_completed_at;


-- ============================================================
-- BLOCO 8 — Calendário letivo por bimestre + liberação por trilha (aba
-- Gestão → "Bloqueios e Liberações"). Cada TRILHA é atribuída a um dos 4
-- bimestres (trilha_bimestre) — por trilha, não por matéria, porque a
-- mesma matéria costuma ter trilhas que se repetem/continuam em bimestres
-- diferentes ao longo do ano; o bimestre em si tem início/fim
-- (bimestre_dates). Antes do início, a trilha nem aparece pro aluno;
-- depois do fim, ela some da aba Aulas pra TODO MUNDO, inclusive o
-- professor — não muda a regra interna da trilha (um módulo que já
-- dependia de outro via `requires` continua dependendo dele).
--
-- Substitui tanto o antigo bloqueio manual liga/desliga de trilha inteira
-- (trilha_overrides) quanto o início/prazo por trilha em formato de data
-- solta (trilha_release_dates, ver git history) e a liberação diária/
-- semanal por módulo (daily_module_releases, ver git history) — um select
-- de bimestre por trilha substitui as três coisas.
-- ============================================================

drop table if exists public.trilha_overrides cascade;
drop table if exists public.trilha_release_dates cascade;
drop table if exists public.daily_module_releases cascade;
drop table if exists public.materia_bimestre cascade;
-- "Ocultar Jogos" (esconder um módulo/jogo específico enquanto ainda
-- estava em desenvolvimento) não é mais necessário — removido junto com a
-- tela de Bloqueios e Liberações antiga (ver shared/platform-core.js: não
-- existe mais isModuleHidden/hiddenModulesCache). Sem dado de aluno
-- nenhum aqui, só configuração do professor — seguro derrubar de vez.
drop table if exists public.hidden_modules cascade;

create table if not exists public.bimestre_dates (
  turma text not null,
  bimestre smallint not null check (bimestre between 1 and 4),
  inicio date,
  fim date,
  -- "Mostrar Notas" (Gestão → Bloqueios e Liberações): o aluno só vê a
  -- NOTA (e o selo Aprovado/Recuperação) de cada matéria depois que o
  -- professor liga isso PRA ESTE bimestre especificamente — evita mostrar
  -- nota baixa de um bimestre ainda em andamento, com lançamento
  -- incompleto. default false: todo bimestre nasce bloqueado, então o
  -- professor não precisa lembrar de bloquear de novo quando um bimestre
  -- novo começa (ver toggleNotasLiberadas em shared/platform-core.js).
  notas_liberadas boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (turma, bimestre)
);

alter table public.bimestre_dates add column if not exists notas_liberadas boolean not null default false;

-- "Fechar bimestre" (Gestão → Bloqueios e Liberações, coluna "Notas" da
-- tabela de bimestres): true = as notas desse bimestre estão congeladas em
-- grades.notas_congeladas e não são mais recalculadas. Ver
-- sql/fechar-bimestre.sql.
alter table public.bimestre_dates add column if not exists fechado boolean not null default false;

alter table public.bimestre_dates enable row level security;

drop policy if exists "bimestre_dates_select_all" on public.bimestre_dates;
create policy "bimestre_dates_select_all"
  on public.bimestre_dates for select
  using (true);

drop policy if exists "bimestre_dates_insert_professor" on public.bimestre_dates;
create policy "bimestre_dates_insert_professor"
  on public.bimestre_dates for insert
  with check (public.is_professor());

drop policy if exists "bimestre_dates_update_professor" on public.bimestre_dates;
create policy "bimestre_dates_update_professor"
  on public.bimestre_dates for update
  using (public.is_professor())
  with check (public.is_professor());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bimestre_dates'
  ) then
    alter publication supabase_realtime add table public.bimestre_dates;
  end if;
end $$;

-- bimestre nullable de propósito: ausência de linha OU bimestre = null
-- significam a mesma coisa ("Sem bimestre" na Gestão) — a trilha fica
-- sempre visível, sem período nenhum.
create table if not exists public.trilha_bimestre (
  turma text not null,
  trilha_key text not null,
  bimestre smallint check (bimestre between 1 and 4),
  updated_at timestamptz not null default now(),
  primary key (turma, trilha_key)
);

-- "Liberar em" (Gestão → Liberação por Trilha): data opcional, dentro do
-- bimestre, a partir da qual a trilha aparece pro aluno — pra não ficar
-- disponível o bimestre inteiro e o aluno adiantar atividade dos colegas.
-- null = libera junto com o início do bimestre, como antes. Ver
-- sql/trilha-liberar-em.sql.
alter table public.trilha_bimestre add column if not exists liberar_em date;

alter table public.trilha_bimestre enable row level security;

drop policy if exists "trilha_bimestre_select_all" on public.trilha_bimestre;
create policy "trilha_bimestre_select_all"
  on public.trilha_bimestre for select
  using (true);

drop policy if exists "trilha_bimestre_insert_professor" on public.trilha_bimestre;
create policy "trilha_bimestre_insert_professor"
  on public.trilha_bimestre for insert
  with check (public.is_professor());

drop policy if exists "trilha_bimestre_update_professor" on public.trilha_bimestre;
create policy "trilha_bimestre_update_professor"
  on public.trilha_bimestre for update
  using (public.is_professor())
  with check (public.is_professor());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trilha_bimestre'
  ) then
    alter publication supabase_realtime add table public.trilha_bimestre;
  end if;
end $$;

-- Peso de cada matéria na nota (Gestão → Lançar Notas: campo "Peso"
-- embaixo do nome da matéria) — quanto as ATIVIDADES dela valem contra
-- Prova Diagnóstica e Prova Final (peso 1 cada). Um por turma+matéria,
-- vale pra todos os bimestres; matéria sem linha vale 1. Ver
-- pesoMateria em shared/platform-core.js.
create table if not exists public.materia_pesos (
  turma text not null,
  materia_key text not null,
  peso numeric not null default 1 check (peso > 0),
  updated_at timestamptz not null default now(),
  primary key (turma, materia_key)
);

alter table public.materia_pesos enable row level security;

-- O aluno também lê: o Perfil dele calcula a nota com o mesmo peso.
drop policy if exists "materia_pesos_select_all" on public.materia_pesos;
create policy "materia_pesos_select_all"
  on public.materia_pesos for select
  using (true);

drop policy if exists "materia_pesos_insert_professor" on public.materia_pesos;
create policy "materia_pesos_insert_professor"
  on public.materia_pesos for insert
  with check (public.is_professor());

drop policy if exists "materia_pesos_update_professor" on public.materia_pesos;
create policy "materia_pesos_update_professor"
  on public.materia_pesos for update
  using (public.is_professor())
  with check (public.is_professor());

-- ============================================================
-- BLOCO 9 — Placar dos minigames (Digitação, Campo Minado) por turma.
-- Cada aluno guarda o MELHOR resultado dele em cada jogo; o jogo
-- mostra um top 10 da própria turma. Diferente do ranking de
-- progresso (student_module_progress, que só mostra a posição do
-- próprio aluno), aqui nomes e posições dos colegas aparecem de
-- propósito — é um placar de jogo, não dado acadêmico.
-- ============================================================

create table if not exists public.game_scores (
  student_email text not null,
  student_name text not null,
  turma text not null,
  game text not null,
  score numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (student_email, game, turma)
);

-- Corrige quem já rodou a versão antiga deste script (chave primária só
-- (student_email, game), sem turma): o professor usa o mesmo e-mail "admin"
-- pra entrar nas duas turmas, então jogar Digitação/Campo Minado numa turma
-- sobrescrevia o placar da OUTRA turma na mesma linha, ao invés de manter
-- uma linha por turma — sem isso, o placar de uma das turmas fica sempre
-- vazio ou "roubado" pela última partida jogada na outra. Idempotente: se
-- a chave primária já inclui turma, não faz nada.
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'game_scores' and constraint_name = 'game_scores_pkey'
  ) and not exists (
    select 1 from information_schema.key_column_usage
    where table_schema = 'public' and table_name = 'game_scores' and constraint_name = 'game_scores_pkey' and column_name = 'turma'
  ) then
    alter table public.game_scores drop constraint game_scores_pkey;
    alter table public.game_scores add constraint game_scores_pkey primary key (student_email, game, turma);
  end if;
end $$;

create index if not exists idx_game_scores_turma_game on public.game_scores (turma, game, score desc);

alter table public.game_scores enable row level security;

drop policy if exists "game_scores_select_all" on public.game_scores;
create policy "game_scores_select_all"
  on public.game_scores for select
  using (true);

drop policy if exists "game_scores_insert_all" on public.game_scores;
drop policy if exists "game_scores_insert_self" on public.game_scores;
create policy "game_scores_insert_self"
  on public.game_scores for insert
  with check (student_email = public.current_email());

drop policy if exists "game_scores_update_all" on public.game_scores;
drop policy if exists "game_scores_update_self" on public.game_scores;
create policy "game_scores_update_self"
  on public.game_scores for update
  using (student_email = public.current_email())
  with check (student_email = public.current_email());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game_scores'
  ) then
    alter publication supabase_realtime add table public.game_scores;
  end if;
end $$;

-- ============================================================
-- BLOCO 11 — QuizRush do portal (aba Jogos). O professor escolhe uma
-- trilha/módulo teórico (STEPS + quiz) e o motor de gabarito já
-- existente (shared/gabarito-generator.js) fornece as perguntas de
-- múltipla escolha prontas — sem precisar cadastrar pergunta nenhuma
-- de novo. O professor hospeda uma partida ao vivo pra turma, pergunta
-- por pergunta, com cronômetro; shared/quizrush-engine.js calcula o
-- placar (quem acerta mais rápido ganha mais pontos). Só existe UMA
-- sessão "corrente" por turma por vez — todo mundo lê a última linha
-- não encerrada.
-- ============================================================

create table if not exists public.quizrush_sessions (
  id uuid primary key default gen_random_uuid(),
  turma text not null,
  created_by text not null,
  trilha_label text,
  module_title text,
  questions jsonb not null,
  status text not null default 'lobby' check (status in ('lobby', 'question', 'reveal', 'podium', 'ended')),
  current_index int not null default 0,
  question_started_at timestamptz,
  question_duration_ms int not null default 25000,
  created_at timestamptz not null default now()
);

create index if not exists idx_quizrush_sessions_turma on public.quizrush_sessions (turma, created_at desc);

create table if not exists public.quizrush_players (
  session_id uuid not null references public.quizrush_sessions(id) on delete cascade,
  student_email text not null,
  student_name text not null,
  joined_at timestamptz not null default now(),
  primary key (session_id, student_email)
);

create table if not exists public.quizrush_answers (
  session_id uuid not null references public.quizrush_sessions(id) on delete cascade,
  student_email text not null,
  student_name text not null,
  question_index int not null,
  choice_index int not null,
  is_correct boolean not null,
  score int not null default 0,
  answered_at timestamptz not null default now(),
  primary key (session_id, student_email, question_index)
);

create index if not exists idx_quizrush_answers_session on public.quizrush_answers (session_id, question_index);

-- Quizz Prático (problemas de código no lugar de múltipla escolha): além do
-- acerto/pontuação de sempre, guarda quantas tentativas o aluno fez e o
-- último código enviado (o professor consegue conferir depois). choice_index
-- continua obrigatório — pra código vale 0 e é ignorado. Script avulso
-- equivalente: sql/quizrush-quizz-pratico.sql.
alter table public.quizrush_answers add column if not exists attempts int not null default 1;
alter table public.quizrush_answers add column if not exists answer_text text;

alter table public.quizrush_sessions enable row level security;
alter table public.quizrush_players enable row level security;
alter table public.quizrush_answers enable row level security;

-- select continua aberto nas 3 tabelas: o placar/podium mostra nome e
-- pontuação de TODO mundo pra TODO mundo de propósito (mesma lógica do
-- game_scores). quizrush_sessions.questions inclui o índice da
-- resposta certa e hoje qualquer jogador consegue ler antes de
-- responder — é um vazamento real, mas corrigi-lo direito exige
-- separar a pergunta pública da leitura do host (RPC nova) e mexe na
-- lógica de tempo real do jogo; fica documentado como follow-up, fora
-- desta migração de auth.
drop policy if exists "quizrush_sessions_select_all" on public.quizrush_sessions;
create policy "quizrush_sessions_select_all" on public.quizrush_sessions for select using (true);
drop policy if exists "quizrush_sessions_insert_all" on public.quizrush_sessions;
drop policy if exists "quizrush_sessions_insert_professor" on public.quizrush_sessions;
create policy "quizrush_sessions_insert_professor" on public.quizrush_sessions for insert with check (public.is_professor());
drop policy if exists "quizrush_sessions_update_all" on public.quizrush_sessions;
drop policy if exists "quizrush_sessions_update_professor" on public.quizrush_sessions;
create policy "quizrush_sessions_update_professor" on public.quizrush_sessions for update using (public.is_professor()) with check (public.is_professor());

drop policy if exists "quizrush_players_select_all" on public.quizrush_players;
create policy "quizrush_players_select_all" on public.quizrush_players for select using (true);
drop policy if exists "quizrush_players_insert_all" on public.quizrush_players;
drop policy if exists "quizrush_players_insert_self" on public.quizrush_players;
create policy "quizrush_players_insert_self" on public.quizrush_players for insert with check (student_email = public.current_email());
drop policy if exists "quizrush_players_update_all" on public.quizrush_players;
drop policy if exists "quizrush_players_update_self" on public.quizrush_players;
create policy "quizrush_players_update_self" on public.quizrush_players for update using (student_email = public.current_email()) with check (student_email = public.current_email());

drop policy if exists "quizrush_answers_select_all" on public.quizrush_answers;
create policy "quizrush_answers_select_all" on public.quizrush_answers for select using (true);
drop policy if exists "quizrush_answers_insert_all" on public.quizrush_answers;
drop policy if exists "quizrush_answers_insert_self" on public.quizrush_answers;
create policy "quizrush_answers_insert_self" on public.quizrush_answers for insert with check (student_email = public.current_email());
drop policy if exists "quizrush_answers_update_all" on public.quizrush_answers;
drop policy if exists "quizrush_answers_update_self" on public.quizrush_answers;
create policy "quizrush_answers_update_self" on public.quizrush_answers for update using (student_email = public.current_email()) with check (student_email = public.current_email());

-- question_started_at precisa vir do relógio do BANCO (now()), não do
-- computador de quem clica em "Iniciar"/"Próxima pergunta" — um relógio
-- local adiantado ou com data errada fazia o cronômetro já nascer
-- "expirado" pros alunos, mostrando "tempo esgotado" na hora. Ver
-- shared/quizrush-engine.js (startSession/nextQuestion chamam essas funções
-- em vez de gravar new Date().toISOString() direto).
create or replace function public.quizrush_start_session(p_session_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_started_at timestamptz;
begin
  if not public.is_professor() then
    raise exception 'Só o professor pode iniciar uma sessão do QuizRush.';
  end if;
  update quizrush_sessions
  set status = 'question', current_index = 0, question_started_at = now()
  where id = p_session_id
  returning question_started_at into v_started_at;
  return v_started_at;
end;
$$;

create or replace function public.quizrush_next_question(p_session_id uuid, p_index int)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_started_at timestamptz;
begin
  if not public.is_professor() then
    raise exception 'Só o professor pode avançar pergunta no QuizRush.';
  end if;
  update quizrush_sessions
  set status = 'question', current_index = p_index, question_started_at = now()
  where id = p_session_id
  returning question_started_at into v_started_at;
  return v_started_at;
end;
$$;

grant execute on function public.quizrush_start_session(uuid) to anon, authenticated;
grant execute on function public.quizrush_next_question(uuid, int) to anon, authenticated;

-- question_started_at vem do relógio do banco, mas o cronômetro (em
-- games/quizrush.html) compara esse valor com o relógio LOCAL de cada
-- aluno/professor pra saber quanto tempo falta — um dispositivo com hora
-- adiantada/atrasada ainda mostrava "tempo esgotado" cedo ou tarde demais,
-- mesmo com question_started_at correto. Esta função deixa cada cliente
-- medir a diferença entre o próprio relógio e o do banco uma vez, ao
-- carregar a página (ver getServerTimeMs em shared/quizrush-engine.js).
create or replace function public.quizrush_server_now()
returns timestamptz
language sql
security definer
set search_path = public
as $$
  select now();
$$;

grant execute on function public.quizrush_server_now() to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'quizrush_sessions'
  ) then
    alter publication supabase_realtime add table public.quizrush_sessions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'quizrush_players'
  ) then
    alter publication supabase_realtime add table public.quizrush_players;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'quizrush_answers'
  ) then
    alter publication supabase_realtime add table public.quizrush_answers;
  end if;
end $$;

-- "Pegar pontos" (opção que o professor liga ao criar a partida, ver
-- allow_steal abaixo) e a penalidade de sair da tela (sempre ativa, não é
-- opcional) — os dois mexem no placar além de quizrush_answers, então
-- shared/quizrush-engine.js soma os três (leaderboardFrom) pra chegar no
-- total de cada aluno. Script avulso equivalente:
-- sql/quizrush-roubar-e-saida.sql.
alter table public.quizrush_sessions add column if not exists allow_steal boolean not null default false;

-- Um aluno que ACERTOU a pergunta escolhe: 'roubar' (tira `amount` pontos de
-- target_email e soma nos próprios — mostrado na tela como "pegar", ver
-- games/quizrush.html) ou 'bonus' (soma `amount` só nos próprios, sem mexer
-- em mais ninguém). Uma linha por aluno por pergunta (chave primária) — o
-- poder só pode ser usado uma vez por pergunta. `amount` é decidido pelo
-- CLIENTE (shared/quizrush-code.js/quizrush.html), não por esta tabela —
-- mesmo nível de confiança que quizrush_answers.score já tem hoje
-- (comentário logo acima sobre o vazamento de correctIndex): um aluno
-- mexendo no DevTools já conseguiria inflar o próprio score de QUALQUER
-- jeito, isso não abre brecha nova.
create table if not exists public.quizrush_powers (
  session_id uuid not null references public.quizrush_sessions(id) on delete cascade,
  question_index int not null,
  student_email text not null,
  student_name text not null,
  action text not null check (action in ('roubar', 'bonus')),
  target_email text,
  target_name text,
  amount int not null,
  created_at timestamptz not null default now(),
  primary key (session_id, student_email, question_index)
);

create index if not exists idx_quizrush_powers_session on public.quizrush_powers (session_id, question_index);

alter table public.quizrush_powers enable row level security;
drop policy if exists "quizrush_powers_select_all" on public.quizrush_powers;
create policy "quizrush_powers_select_all" on public.quizrush_powers for select using (true);
drop policy if exists "quizrush_powers_insert_self" on public.quizrush_powers;
create policy "quizrush_powers_insert_self" on public.quizrush_powers for insert with check (student_email = public.current_email());

-- Saiu da tela (visibilitychange) durante uma pergunta ao vivo: perde
-- pontos na hora, mas continua logado/jogando normalmente — não é
-- opcional, vale em TODA sessão do QuizRush (quiz de múltipla escolha e
-- Quizz Prático). Uma linha por aluno por pergunta — sair várias vezes na
-- MESMA pergunta só penaliza uma vez; saindo de novo numa pergunta
-- DIFERENTE, penaliza de novo.
create table if not exists public.quizrush_penalties (
  session_id uuid not null references public.quizrush_sessions(id) on delete cascade,
  question_index int not null,
  student_email text not null,
  student_name text not null,
  amount int not null default 1000,
  created_at timestamptz not null default now(),
  primary key (session_id, student_email, question_index)
);

create index if not exists idx_quizrush_penalties_session on public.quizrush_penalties (session_id, question_index);

alter table public.quizrush_penalties enable row level security;
drop policy if exists "quizrush_penalties_select_all" on public.quizrush_penalties;
create policy "quizrush_penalties_select_all" on public.quizrush_penalties for select using (true);
drop policy if exists "quizrush_penalties_insert_self" on public.quizrush_penalties;
create policy "quizrush_penalties_insert_self" on public.quizrush_penalties for insert with check (student_email = public.current_email());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'quizrush_powers'
  ) then
    alter publication supabase_realtime add table public.quizrush_powers;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'quizrush_penalties'
  ) then
    alter publication supabase_realtime add table public.quizrush_penalties;
  end if;
end $$;

-- ============================================================
-- BLOCO 12 — Sincronização de progresso entre dispositivos
-- (shared/progress-sync.js). Uma linha por (aluno, atividade), com o
-- estado exato que também vai pro localStorage do navegador — permite
-- o aluno continuar de onde parou numa atividade mesmo trocando de
-- computador, em vez de depender só do localStorage.
-- ============================================================

create table if not exists public.student_activity_state (
  student_email text not null,
  progress_key text not null,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (student_email, progress_key)
);

create index if not exists idx_student_activity_state_student on public.student_activity_state (student_email);

alter table public.student_activity_state enable row level security;

-- O professor precisa ler o estado bruto de TODOS os alunos pra montar a
-- coluna "Nota da Prova" do Relatório de Notas (ver renderRelatorioNotas em
-- shared/platform-core.js) — a prova (turmas/*/atividades/prova-*.html)
-- guarda a nota final (0-100) dentro desse `state`, e student_module_progress
-- só sabe "concluído ou não" (progressMode 'flag'), sem o valor da nota.
-- Mesmo padrão já usado em student_activity (bloco 1) e nas demais tabelas
-- com leitura liberada pro professor.
drop policy if exists "student_activity_state_select_all" on public.student_activity_state;
drop policy if exists "student_activity_state_select_self" on public.student_activity_state;
drop policy if exists "student_activity_state_select_self_or_professor" on public.student_activity_state;
create policy "student_activity_state_select_self_or_professor"
  on public.student_activity_state for select
  using (public.is_professor() or student_email = public.current_email());

drop policy if exists "student_activity_state_insert_all" on public.student_activity_state;
drop policy if exists "student_activity_state_insert_self" on public.student_activity_state;
create policy "student_activity_state_insert_self"
  on public.student_activity_state for insert
  with check (student_email = public.current_email());

drop policy if exists "student_activity_state_update_all" on public.student_activity_state;
drop policy if exists "student_activity_state_update_self" on public.student_activity_state;
create policy "student_activity_state_update_self"
  on public.student_activity_state for update
  using (student_email = public.current_email())
  with check (student_email = public.current_email());

-- ============================================================
-- BLOCO 13 — Token temporário do professor pra "Dar visto"/"Pular etapa"
-- dentro de uma atividade (cobrinha-construcao.html, db-conexao-supabase-
-- pratica.html, js-basico-adaptado-engel.html — ver shared/professor-
-- visto.js). Substitui o fluxo antigo, que pedia usuário e senha REAIS do
-- professor numa tela que fisicamente é do aluno — foi assim que a senha
-- vazou uma vez (ver PENDENCIAS.md). Em vez disso, só o professor (via
-- gerar_professor_token(), chamado da aba Gestão) gera um código de 6
-- dígitos válido por 10 minutos; a tela do aluno só verifica esse código
-- (verificar_professor_token(), sem nunca saber a senha de verdade).
--
-- Sem policy nenhuma pra select/insert direto: nada aqui é lido/escrito
-- por fora das três functions abaixo, todas SECURITY DEFINER — mesmo
-- padrão de profiles (bloco 0), current_email()/is_professor() por trás.
-- ============================================================

create table if not exists public.professor_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null,
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_professor_tokens_token on public.professor_tokens (token);

alter table public.professor_tokens enable row level security;

-- Gera um token novo (6 dígitos, válido 10min) e invalida qualquer token
-- ainda válido antes de criar — só existe UM token "atual" por vez.
create or replace function public.gerar_professor_token()
returns table(token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_expires timestamptz;
begin
  if not public.is_professor() then
    raise exception 'Só o professor pode gerar um token.';
  end if;

  -- Qualificado com o nome da tabela de propósito: "expires_at" sem
  -- qualificador é AMBÍGUO aqui (erro 42702) — RETURNS TABLE(token text,
  -- expires_at timestamptz) cria um parâmetro de saída chamado
  -- "expires_at" que colide com a coluna public.professor_tokens.expires_at.
  delete from public.professor_tokens where public.professor_tokens.expires_at > now();

  -- lpad() só aceita texto (não numeric) como 1º argumento — sem o
  -- ::text explícito aqui, o Postgres não acha nenhuma sobrecarga da
  -- função que bata (erro 42883).
  v_token := lpad(floor(random() * 1000000)::int::text, 6, '0');
  v_expires := now() + interval '10 minutes';

  insert into public.professor_tokens (token, expires_at, created_by)
  values (v_token, v_expires, auth.uid());

  return query select v_token, v_expires;
end;
$$;

-- Devolve o token ainda válido (se houver), sem gerar um novo — pra
-- reabrir a aba Gestão (ou abrir em outro dispositivo) mostrar o mesmo
-- código que os alunos já podem estar digitando, em vez de trocar toda
-- vez que a tela é aberta.
create or replace function public.professor_token_atual()
returns table(token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_professor() then
    raise exception 'Só o professor pode ver o token atual.';
  end if;

  return query
    select pt.token, pt.expires_at
    from public.professor_tokens pt
    where pt.expires_at > now()
    order by pt.created_at desc
    limit 1;
end;
$$;

-- Chamada pela TELA DO ALUNO (qualquer papel, por isso o grant pra anon
-- também) — confere se o token digitado bate com o token válido atual, e
-- devolve o nome de quem gerou (pra manter o "Visto dado por Fulano" que
-- já existia). Nunca expõe a lista de tokens, só um sim/não + nome.
create or replace function public.verificar_professor_token(p_token text)
returns table(valido boolean, nome text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created_by uuid;
begin
  select pt.created_by into v_created_by
  from public.professor_tokens pt
  where pt.token = p_token and pt.expires_at > now()
  order by pt.created_at desc
  limit 1;

  if v_created_by is null then
    return query select false, null::text;
    return;
  end if;

  return query select true, p.nome from public.profiles p where p.id = v_created_by;
end;
$$;

grant execute on function public.gerar_professor_token() to authenticated;
grant execute on function public.professor_token_atual() to authenticated;
grant execute on function public.verificar_professor_token(text) to anon, authenticated;

-- Ficha de observação comportamental (avaliação qualitativa do professor
-- sobre uma atividade PRESENCIAL, ex.: o antigo "Laboratório de
-- Autonomia") e a própria trilha que dependia dela foram removidas —
-- ver git history.
drop table if exists public.behavioral_observations cascade;


-- ============================================================
-- BLOCO 14 — Sino de alertas do professor: aluno saiu de uma atividade/
-- prova que não podia sair e ficou bloqueado (a DETECÇÃO em si já existe
-- desde antes deste bloco — ver shared/exam-proctor.js, PortalExamGuard,
-- que conta 2 saídas de aba/janela e bloqueia a atividade). Este bloco só
-- acrescenta o AVISO em tempo real pro professor e a decisão dele:
-- Liberar (desbloqueia o aluno na hora, sem precisar do token físico) ou
-- Manter bloqueado (só marca como visto — o aluno segue preso até o
-- professor dar o token pessoalmente, do jeito que já funcionava antes).
-- ============================================================

create table if not exists public.exam_guard_events (
  id uuid primary key default gen_random_uuid(),
  student_email text not null,
  student_name text,
  turma text,
  activity_location text not null,
  warnings int not null default 0,
  resolved boolean not null default false,
  resolution text check (resolution in ('liberado', 'mantido')),
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- Acelera "alertas pendentes desta turma", que é a consulta que o sino do
-- professor roda toda vez que abre e a cada evento em tempo real.
create index if not exists idx_exam_guard_events_turma_resolved
  on public.exam_guard_events (turma, resolved);

alter table public.exam_guard_events enable row level security;

drop policy if exists "exam_guard_events_select_self_or_professor" on public.exam_guard_events;
create policy "exam_guard_events_select_self_or_professor"
  on public.exam_guard_events for select
  using (public.is_professor() or student_email = public.current_email());

-- O aluno grava a PRÓPRIA linha no exato instante em que fica bloqueado
-- (exam-proctor.js, arm()) — mesmo padrão de student_activity_state.
drop policy if exists "exam_guard_events_insert_self" on public.exam_guard_events;
create policy "exam_guard_events_insert_self"
  on public.exam_guard_events for insert
  with check (student_email = public.current_email());

-- O aluno também pode marcar a PRÓPRIA linha como resolvida, mas só no
-- único formato "liberado por mim mesmo" — acontece quando ele desbloqueia
-- do jeito antigo, digitando o token físico do professor direto na tela da
-- atividade (exam-proctor.js, unlock()), sem passar pelo sino. Sem isso, o
-- alerta ficaria pendente pro professor pra sempre mesmo depois de o aluno
-- já ter sido liberado na mão. O WITH CHECK trava o valor final da linha —
-- o aluno não consegue usar isso pra inventar um "mantido" ou reabrir um
-- alerta já resolvido por outra via.
drop policy if exists "exam_guard_events_update_self_via_token" on public.exam_guard_events;
create policy "exam_guard_events_update_self_via_token"
  on public.exam_guard_events for update
  using (student_email = public.current_email())
  with check (student_email = public.current_email() and resolved = true and resolution = 'liberado');

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'exam_guard_events'
  ) then
    alter publication supabase_realtime add table public.exam_guard_events;
  end if;
end $$;

-- Resolve o alerta a partir do clique do PROFESSOR no sino (nunca do
-- aluno — daí SECURITY DEFINER + checagem de is_professor(), em vez de
-- uma policy de update comum). 'liberado' não marca só o alerta: também
-- zera a linha __guard do aluno em student_activity_state (a mesma que
-- PortalExamGuard.create() lê pra decidir se a atividade abre bloqueada),
-- senão o professor "liberaria" a notificação e o aluno continuaria preso
-- na tela de bloqueio. 'mantido' só marca como visto, sem mexer no
-- bloqueio de verdade.
create or replace function public.resolver_exam_guard_event(p_event_id uuid, p_acao text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_email text;
  v_activity_location text;
begin
  if not public.is_professor() then
    raise exception 'Só o professor pode resolver este alerta.';
  end if;
  if p_acao not in ('liberado', 'mantido') then
    raise exception 'Ação inválida.';
  end if;

  select ege.student_email, ege.activity_location into v_student_email, v_activity_location
  from public.exam_guard_events ege
  where ege.id = p_event_id;

  if v_student_email is null then
    raise exception 'Alerta não encontrado.';
  end if;

  update public.exam_guard_events
  set resolved = true, resolution = p_acao, resolved_by = public.current_email(), resolved_at = now()
  where id = p_event_id;

  if p_acao = 'liberado' then
    insert into public.student_activity_state (student_email, progress_key, state, updated_at)
    values (
      v_student_email,
      v_activity_location || '__guard',
      jsonb_build_object('warnings', 0, 'blocked', false, 'updatedAt', now()),
      now()
    )
    on conflict (student_email, progress_key) do update
      set state = excluded.state, updated_at = excluded.updated_at;
  end if;
end;
$$;

grant execute on function public.resolver_exam_guard_event(uuid, text) to authenticated;

-- ============================================================
-- BLOCO 15 — Personalização do portal (fonte, cor de destaque, tema
-- claro/escuro, emoji de avatar, fundo decorativo, cursor do mouse) — uma
-- linha por usuário (aluno OU professor), lida/escrita direto pelo
-- cliente (sem RPC), mesmo padrão self-service de student_activity_state
-- (bloco 12) acima: cada um só enxerga/mexe na própria linha por email,
-- via RLS — não existe policy de "todo mundo lê todo mundo" aqui porque
-- preferência visual não tem motivo pra vazar entre alunos/professor,
-- diferente do progresso de atividade que o professor precisa auditar.
-- ============================================================

create table if not exists public.user_preferences (
  email text primary key,
  font_family text not null default 'pixel'
    check (font_family in ('pixel', 'traditional', 'rounded', 'serif')),
  accent_key text not null default 'padrao',
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  avatar_emoji text not null default '👤',
  bg_pattern boolean not null default false,
  cursor_key text not null default 'default',
  ambient_music boolean not null default false,
  click_sound boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ambient_music/click_sound (🎵 música ambiente sintetizada +🔊 som de
-- clique conforme o cursor, ver shared/portal-audio.js) chegaram depois da
-- criação original da tabela — alter aqui cobre quem já rodou este script
-- antes, sem exigir apagar/recriar user_preferences.
alter table public.user_preferences add column if not exists ambient_music boolean not null default false;
alter table public.user_preferences add column if not exists click_sound boolean not null default false;
-- Arrumação do painel do professor (ordem, largura e ocultos dos cartões),
-- shared/painel-layout.js — ver sql/painel-layout.sql.
alter table public.user_preferences add column if not exists painel_layout jsonb;

alter table public.user_preferences enable row level security;

drop policy if exists "user_preferences_select_self" on public.user_preferences;
drop policy if exists "user_preferences_select_self_or_professor" on public.user_preferences;
create policy "user_preferences_select_self_or_professor"
  on public.user_preferences for select
  using (public.is_professor() or email = public.current_email());

drop policy if exists "user_preferences_insert_self" on public.user_preferences;
create policy "user_preferences_insert_self"
  on public.user_preferences for insert
  with check (email = public.current_email());

drop policy if exists "user_preferences_update_self" on public.user_preferences;
create policy "user_preferences_update_self"
  on public.user_preferences for update
  using (email = public.current_email())
  with check (email = public.current_email());

-- ============================================================
-- BLOCO 16 — Corrida do Bug (games/corrida-do-bug.html): une o Fuga do
-- Bug (plataforma) com o QuizRush (quiz ao vivo) — a turma entra junta
-- numa corrida pela mesma fase; em cada CHECKPOINT (o Fuga do Bug já tem
-- esse conceito pronto, ver sim.cp/L.checks em games/fuga-do-bug-engine.js)
-- aparece uma pergunta tirada do banco de um módulo já existente (mesmo
-- mecanismo de shared/quizrush-engine.js, reaproveitado por chamada de
-- função, não duplicado). Acertou segue a corrida; errou volta pro
-- checkpoint anterior (sim.respawn() já faz isso sozinho); errou 2x
-- SEGUIDAS no mesmo checkpoint, perde pontos além de voltar.
--
-- Tabelas PRÓPRIAS (não reaproveita quizrush_*): aqui não é "todo mundo
-- responde a MESMA pergunta ao mesmo tempo" — cada aluno corre no seu
-- próprio ritmo e chega em cada checkpoint num momento diferente. Mesmo
-- molde de sessions/players do QuizRush, mais uma tabela de progresso ao
-- vivo (corridadobug_progress) no lugar de quizrush_answers.
-- ============================================================

create table if not exists public.corridadobug_sessions (
  id uuid primary key default gen_random_uuid(),
  turma text not null,
  created_by text not null,
  level_index int not null,
  trilha_label text,
  module_title text,
  questions jsonb not null,
  status text not null default 'lobby' check (status in ('lobby', 'racing', 'ended')),
  started_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_corridadobug_sessions_turma on public.corridadobug_sessions (turma, created_at desc);

create table if not exists public.corridadobug_players (
  session_id uuid not null references public.corridadobug_sessions(id) on delete cascade,
  student_email text not null,
  student_name text not null,
  joined_at timestamptz not null default now(),
  primary key (session_id, student_email)
);

-- Progresso ao vivo — uma linha por (sessão, aluno), atualizada a cada
-- checkpoint (não a cada frame: nenhum dado de física trafega pela rede,
-- só o índice do checkpoint + pontuação, leve o bastante pro Realtime).
create table if not exists public.corridadobug_progress (
  session_id uuid not null references public.corridadobug_sessions(id) on delete cascade,
  student_email text not null,
  student_name text not null,
  checkpoint int not null default 0,
  misses int not null default 0,
  score int not null default 0,
  finished boolean not null default false,
  finished_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (session_id, student_email)
);

alter table public.corridadobug_sessions enable row level security;
alter table public.corridadobug_players enable row level security;
alter table public.corridadobug_progress enable row level security;

-- select aberto pras 3 (mesmo "vazamento" já aceito/documentado em
-- quizrush_sessions/quizrush_players/quizrush_answers: o placar/sessão
-- ao vivo precisa ser visível pra turma toda, não só pra quem é dono da
-- linha) — insert/update travados por dono (professor cria/gerencia a
-- sessão; cada aluno só grava o PRÓPRIO progresso).
drop policy if exists "corridadobug_sessions_select_all" on public.corridadobug_sessions;
create policy "corridadobug_sessions_select_all"
  on public.corridadobug_sessions for select using (true);
drop policy if exists "corridadobug_sessions_insert_professor" on public.corridadobug_sessions;
create policy "corridadobug_sessions_insert_professor"
  on public.corridadobug_sessions for insert with check (public.is_professor());
drop policy if exists "corridadobug_sessions_update_professor" on public.corridadobug_sessions;
create policy "corridadobug_sessions_update_professor"
  on public.corridadobug_sessions for update
  using (public.is_professor()) with check (public.is_professor());

drop policy if exists "corridadobug_players_select_all" on public.corridadobug_players;
create policy "corridadobug_players_select_all"
  on public.corridadobug_players for select using (true);
drop policy if exists "corridadobug_players_insert_self" on public.corridadobug_players;
create policy "corridadobug_players_insert_self"
  on public.corridadobug_players for insert
  with check (student_email = public.current_email());

drop policy if exists "corridadobug_progress_select_all" on public.corridadobug_progress;
create policy "corridadobug_progress_select_all"
  on public.corridadobug_progress for select using (true);
drop policy if exists "corridadobug_progress_insert_self" on public.corridadobug_progress;
create policy "corridadobug_progress_insert_self"
  on public.corridadobug_progress for insert
  with check (student_email = public.current_email());
drop policy if exists "corridadobug_progress_update_self" on public.corridadobug_progress;
create policy "corridadobug_progress_update_self"
  on public.corridadobug_progress for update
  using (student_email = public.current_email())
  with check (student_email = public.current_email());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'corridadobug_sessions'
  ) then
    alter publication supabase_realtime add table public.corridadobug_sessions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'corridadobug_players'
  ) then
    alter publication supabase_realtime add table public.corridadobug_players;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'corridadobug_progress'
  ) then
    alter publication supabase_realtime add table public.corridadobug_progress;
  end if;
end $$;

-- ============================================================
-- Fim. Confira no painel do Supabase (Table Editor) se profiles,
-- attendance, grades, student_module_progress, classroom_settings,
-- student_activity, student_overrides, bimestre_dates, trilha_bimestre,
-- materia_pesos, game_scores, quizrush_sessions/quizrush_players/
-- quizrush_answers, student_activity_state, professor_tokens,
-- exam_guard_events, user_preferences e corridadobug_sessions/
-- corridadobug_players/corridadobug_progress foram criadas, se
-- network_nodes ganhou as network_nodes/node_permissions/node_shields
-- aparecem com RLS habilitado (ícone de cadeado no Table Editor). Se
-- profiles estiver vazia, rode scripts/migrate-users-to-auth.mjs antes de
-- testar login.
-- ============================================================

-- ============================================================
-- SUBSTITUTO — quem dá a aula quando o professor se ausenta. Pode: ligar/
-- desligar Copiar e Colar e Jogos, fazer a chamada, gerar o token de visto
-- e conduzir QuizRush/Corrida do Bug; só VÊ alunos, progresso, notas,
-- relatórios e alertas. Ver sql/usuario-substituto.sql (tem também o passo
-- a passo pra criar a conta) e shared/session.js.
-- ============================================================

-- 1) Papel novo em profiles.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('aluno', 'professor', 'substituto'));

-- 2) Quem é substituto (mesmo padrão de is_professor(): security definer
--    pra poder ler profiles de dentro de uma policy sem recursão de RLS).
create or replace function public.is_substituto()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'substituto');
$$;
grant execute on function public.is_substituto() to authenticated;

-- 3) Leitura (policies ADICIONAIS — somam com as que já existem, nenhuma
--    policy do professor é alterada).
drop policy if exists "profiles_select_substituto" on public.profiles;
create policy "profiles_select_substituto" on public.profiles
  for select using (public.is_substituto());

drop policy if exists "student_activity_select_substituto" on public.student_activity;
create policy "student_activity_select_substituto" on public.student_activity
  for select using (public.is_substituto());

drop policy if exists "student_overrides_select_substituto" on public.student_overrides;
create policy "student_overrides_select_substituto" on public.student_overrides
  for select using (public.is_substituto());

drop policy if exists "attendance_select_substituto" on public.attendance;
create policy "attendance_select_substituto" on public.attendance
  for select using (public.is_substituto());

drop policy if exists "grades_select_substituto" on public.grades;
create policy "grades_select_substituto" on public.grades
  for select using (public.is_substituto());

drop policy if exists "student_module_progress_select_substituto" on public.student_module_progress;
create policy "student_module_progress_select_substituto" on public.student_module_progress
  for select using (public.is_substituto());

drop policy if exists "student_activity_state_select_substituto" on public.student_activity_state;
create policy "student_activity_state_select_substituto" on public.student_activity_state
  for select using (public.is_substituto());

drop policy if exists "exam_guard_events_select_substituto" on public.exam_guard_events;
create policy "exam_guard_events_select_substituto" on public.exam_guard_events
  for select using (public.is_substituto());

-- 4) Escrita — SÓ o que o substituto pode fazer.
-- "Copiar e Colar" (Gestão → Bloqueios e Liberações).
drop policy if exists "classroom_settings_insert_substituto" on public.classroom_settings;
create policy "classroom_settings_insert_substituto" on public.classroom_settings
  for insert with check (public.is_substituto());
drop policy if exists "classroom_settings_update_substituto" on public.classroom_settings;
create policy "classroom_settings_update_substituto" on public.classroom_settings
  for update using (public.is_substituto()) with check (public.is_substituto());

-- "Jogos" (liberação dos jogos pra turma).
drop policy if exists "student_overrides_insert_substituto" on public.student_overrides;
create policy "student_overrides_insert_substituto" on public.student_overrides
  for insert with check (public.is_substituto());
drop policy if exists "student_overrides_update_substituto" on public.student_overrides;
create policy "student_overrides_update_substituto" on public.student_overrides
  for update using (public.is_substituto()) with check (public.is_substituto());

-- Chamada.
drop policy if exists "attendance_insert_substituto" on public.attendance;
create policy "attendance_insert_substituto" on public.attendance
  for insert with check (public.is_substituto());
drop policy if exists "attendance_update_substituto" on public.attendance;
create policy "attendance_update_substituto" on public.attendance
  for update using (public.is_substituto()) with check (public.is_substituto());

-- QuizRush e Corrida do Bug como anfitrião (conduzir a aula).
drop policy if exists "quizrush_sessions_insert_substituto" on public.quizrush_sessions;
create policy "quizrush_sessions_insert_substituto" on public.quizrush_sessions
  for insert with check (public.is_substituto());
drop policy if exists "quizrush_sessions_update_substituto" on public.quizrush_sessions;
create policy "quizrush_sessions_update_substituto" on public.quizrush_sessions
  for update using (public.is_substituto()) with check (public.is_substituto());
drop policy if exists "corridadobug_sessions_insert_substituto" on public.corridadobug_sessions;
create policy "corridadobug_sessions_insert_substituto" on public.corridadobug_sessions
  for insert with check (public.is_substituto());
drop policy if exists "corridadobug_sessions_update_substituto" on public.corridadobug_sessions;
create policy "corridadobug_sessions_update_substituto" on public.corridadobug_sessions
  for update using (public.is_substituto()) with check (public.is_substituto());

-- 5) Token de visto / pular etapa: professor OU substituto. O visto mostra
--    o nome de quem gerou o token ("Visto dado por ..."). Só existe um
--    token válido por vez — gerar um novo invalida o anterior, de quem for.
create or replace function public.gerar_professor_token()
returns table(token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_expires timestamptz;
begin
  if not (public.is_professor() or public.is_substituto()) then
    raise exception 'Só o professor (ou o substituto) pode gerar um token.';
  end if;

  delete from public.professor_tokens where public.professor_tokens.expires_at > now();

  v_token := lpad(floor(random() * 1000000)::int::text, 6, '0');
  v_expires := now() + interval '10 minutes';

  insert into public.professor_tokens (token, expires_at, created_by)
  values (v_token, v_expires, auth.uid());

  return query select v_token, v_expires;
end;
$$;

create or replace function public.professor_token_atual()
returns table(token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_professor() or public.is_substituto()) then
    raise exception 'Só o professor (ou o substituto) pode ver o token atual.';
  end if;

  return query
    select pt.token, pt.expires_at
    from public.professor_tokens pt
    where pt.expires_at > now()
    order by pt.created_at desc
    limit 1;
end;
$$;


-- ============================================================
-- AGENDA DO PROFESSOR — compromissos do calendário do painel
-- (shared/professor-agenda.js). Cada professor só vê os próprios.
-- Mesmo trecho de sql/professor-agenda.sql.
-- ============================================================

create table if not exists public.professor_compromissos (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo text not null default '',
  descricao text not null default '',
  dia date not null,
  dia_todo boolean not null default false,
  hora_inicio time,
  hora_fim time,
  cor text not null default 'azul',
  lembrete_min integer,
  lembrete_lido boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint professor_compromissos_cor_valida
    check (cor in ('azul', 'roxo', 'rosa', 'vermelho', 'laranja', 'amarelo', 'verde', 'cinza', 'marrom')),
  constraint professor_compromissos_horario_valido
    check (hora_inicio is null or hora_fim is null or hora_fim > hora_inicio),
  constraint professor_compromissos_lembrete_valido
    check (lembrete_min is null or lembrete_min >= 0)
);

create index if not exists idx_professor_compromissos_dono_dia
  on public.professor_compromissos (professor_id, dia);

alter table public.professor_compromissos enable row level security;

drop policy if exists "professor_compromissos_select_dono" on public.professor_compromissos;
create policy "professor_compromissos_select_dono"
  on public.professor_compromissos for select to authenticated
  using (professor_id = auth.uid());

drop policy if exists "professor_compromissos_insert_dono" on public.professor_compromissos;
create policy "professor_compromissos_insert_dono"
  on public.professor_compromissos for insert to authenticated
  with check (professor_id = auth.uid());

drop policy if exists "professor_compromissos_update_dono" on public.professor_compromissos;
create policy "professor_compromissos_update_dono"
  on public.professor_compromissos for update to authenticated
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid());

drop policy if exists "professor_compromissos_delete_dono" on public.professor_compromissos;
create policy "professor_compromissos_delete_dono"
  on public.professor_compromissos for delete to authenticated
  using (professor_id = auth.uid());

grant select, insert, update, delete on public.professor_compromissos to authenticated;

-- ============================================================
-- CONHECIMENTOS — notas do professor conectadas por [[links]]
-- (professor/conhecimentos.html). Só o professor, cada um as suas.
-- Mesmo trecho de sql/professor-notas.sql.
-- ============================================================

create table if not exists public.professor_notas (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo text not null default '',
  conteudo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_professor_notas_dono
  on public.professor_notas (professor_id, updated_at desc);

-- Título único por professor (sem diferenciar maiúscula/minúscula): é ele
-- que os [[links]] usam pra achar a nota. Nota nova nasce sem título, e
-- várias podem ficar assim, então a regra só vale pra título preenchido.
create unique index if not exists professor_notas_titulo_unico
  on public.professor_notas (professor_id, lower(titulo))
  where titulo <> '';

alter table public.professor_notas enable row level security;

drop policy if exists "professor_notas_select_dono" on public.professor_notas;
create policy "professor_notas_select_dono"
  on public.professor_notas for select to authenticated
  using (professor_id = auth.uid() and public.is_professor());

drop policy if exists "professor_notas_insert_dono" on public.professor_notas;
create policy "professor_notas_insert_dono"
  on public.professor_notas for insert to authenticated
  with check (professor_id = auth.uid() and public.is_professor());

drop policy if exists "professor_notas_update_dono" on public.professor_notas;
create policy "professor_notas_update_dono"
  on public.professor_notas for update to authenticated
  using (professor_id = auth.uid() and public.is_professor())
  with check (professor_id = auth.uid() and public.is_professor());

drop policy if exists "professor_notas_delete_dono" on public.professor_notas;
create policy "professor_notas_delete_dono"
  on public.professor_notas for delete to authenticated
  using (professor_id = auth.uid() and public.is_professor());

grant select, insert, update, delete on public.professor_notas to authenticated;

-- ============================================================
-- PROJETOS — caderno de projetos do professor (ideias, pesquisas,
-- links; fixar e arquivar). professor/projetos.html. Só o professor.
-- Mesmo trecho de sql/professor-projetos.sql.
-- ============================================================

create table if not exists public.professor_projetos (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo text not null default '',
  descricao text not null default '',
  cor text not null default 'azul',
  arquivado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint professor_projetos_cor_valida
    check (cor in ('azul', 'roxo', 'rosa', 'vermelho', 'laranja', 'amarelo', 'verde', 'ciano', 'cinza'))
);

create table if not exists public.professor_projeto_itens (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  projeto_id uuid not null references public.professor_projetos(id) on delete cascade,
  tipo text not null default 'ideia',
  texto text not null default '',
  url text,
  fixado boolean not null default false,
  arquivado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint professor_projeto_itens_tipo_valido check (tipo in ('ideia', 'pesquisa', 'link'))
);

create index if not exists idx_professor_projetos_dono
  on public.professor_projetos (professor_id, created_at desc);
create index if not exists idx_professor_projeto_itens_projeto
  on public.professor_projeto_itens (projeto_id, created_at desc);

alter table public.professor_projetos enable row level security;
alter table public.professor_projeto_itens enable row level security;

drop policy if exists "professor_projetos_select_dono" on public.professor_projetos;
create policy "professor_projetos_select_dono"
  on public.professor_projetos for select to authenticated
  using (professor_id = auth.uid() and public.is_professor());

drop policy if exists "professor_projetos_insert_dono" on public.professor_projetos;
create policy "professor_projetos_insert_dono"
  on public.professor_projetos for insert to authenticated
  with check (professor_id = auth.uid() and public.is_professor());

drop policy if exists "professor_projetos_update_dono" on public.professor_projetos;
create policy "professor_projetos_update_dono"
  on public.professor_projetos for update to authenticated
  using (professor_id = auth.uid() and public.is_professor())
  with check (professor_id = auth.uid() and public.is_professor());

drop policy if exists "professor_projetos_delete_dono" on public.professor_projetos;
create policy "professor_projetos_delete_dono"
  on public.professor_projetos for delete to authenticated
  using (professor_id = auth.uid() and public.is_professor());

-- Anotação: além de ser do professor, o projeto tem que ser dele também
-- (ninguém pendura anotação no projeto de outro).
drop policy if exists "professor_projeto_itens_select_dono" on public.professor_projeto_itens;
create policy "professor_projeto_itens_select_dono"
  on public.professor_projeto_itens for select to authenticated
  using (professor_id = auth.uid() and public.is_professor());

drop policy if exists "professor_projeto_itens_insert_dono" on public.professor_projeto_itens;
create policy "professor_projeto_itens_insert_dono"
  on public.professor_projeto_itens for insert to authenticated
  with check (
    professor_id = auth.uid() and public.is_professor()
    and exists (select 1 from public.professor_projetos p where p.id = projeto_id and p.professor_id = auth.uid())
  );

drop policy if exists "professor_projeto_itens_update_dono" on public.professor_projeto_itens;
create policy "professor_projeto_itens_update_dono"
  on public.professor_projeto_itens for update to authenticated
  using (professor_id = auth.uid() and public.is_professor())
  with check (
    professor_id = auth.uid() and public.is_professor()
    and exists (select 1 from public.professor_projetos p where p.id = projeto_id and p.professor_id = auth.uid())
  );

drop policy if exists "professor_projeto_itens_delete_dono" on public.professor_projeto_itens;
create policy "professor_projeto_itens_delete_dono"
  on public.professor_projeto_itens for delete to authenticated
  using (professor_id = auth.uid() and public.is_professor());

grant select, insert, update, delete on public.professor_projetos to authenticated;
grant select, insert, update, delete on public.professor_projeto_itens to authenticated;
