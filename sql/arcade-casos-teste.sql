-- Casos de teste do Arcade da Turma (arcade.html). Rode UMA vez no SQL
-- Editor do Supabase — é seguro rodar de novo (idempotente). É o mesmo
-- trecho que está no fim de sql/supabase-setup-completo.sql.

-- Casos de teste do Arcade da Turma (arcade.html, sql/arcade-casos-teste.sql).
-- Enquanto joga um jogo do Arcade, o aluno registra um caso de teste:
-- título, passos, resultado esperado, resultado obtido, se passou ou
-- falhou e, quando falha, o bug encontrado. game_email = dono do jogo
-- (o aluno do link do GitHub Pages),
-- autor_email = quem escreveu o caso. Vale testar o jogo de um colega ou o
-- próprio. Só a turma de Jogos Digitais (e o professor) vê e cria; cada um
-- apaga só os PRÓPRIOS casos, e o professor pode apagar qualquer um.
-- CHECKs repetem os limites da tela.
create table if not exists public.arcade_test_cases (
  id uuid primary key default gen_random_uuid(),
  game_email text not null,
  autor_email text not null,
  titulo text not null,
  passos text not null,
  esperado text not null,
  obtido text not null default '',
  status text not null,
  created_at timestamptz not null default now(),
  constraint arcade_test_cases_titulo check (char_length(btrim(titulo)) between 3 and 100),
  constraint arcade_test_cases_passos check (char_length(btrim(passos)) between 5 and 1500),
  constraint arcade_test_cases_esperado check (char_length(btrim(esperado)) between 3 and 600),
  constraint arcade_test_cases_obtido check (char_length(obtido) <= 600),
  constraint arcade_test_cases_status check (status in ('passou', 'falhou'))
);

-- Bug encontrado (texto livre; a tela exige quando o teste falhou).
alter table public.arcade_test_cases add column if not exists bug text not null default '';
alter table public.arcade_test_cases drop constraint if exists arcade_test_cases_bug;
alter table public.arcade_test_cases add constraint arcade_test_cases_bug check (char_length(bug) <= 800);

-- Gravidade do bug: true = crítico (trava, fecha ou impede de jogar/terminar),
-- false = não crítico. Fica nulo quando o teste passou.
alter table public.arcade_test_cases add column if not exists critico boolean;
alter table public.arcade_test_cases drop constraint if exists arcade_test_cases_critico;
alter table public.arcade_test_cases add constraint arcade_test_cases_critico check (status = 'falhou' or critico is null);

create index if not exists arcade_test_cases_game_idx on public.arcade_test_cases (game_email, created_at desc);

alter table public.arcade_test_cases enable row level security;

drop policy if exists "arcade_test_cases_select_jogos" on public.arcade_test_cases;
create policy "arcade_test_cases_select_jogos"
  on public.arcade_test_cases for select to authenticated
  using (public.is_professor() or public.current_turma() = 'jogos');

drop policy if exists "arcade_test_cases_insert_self" on public.arcade_test_cases;
create policy "arcade_test_cases_insert_self"
  on public.arcade_test_cases for insert to authenticated
  with check (
    autor_email = public.current_email()
    and (public.is_professor() or public.current_turma() = 'jogos')
    and exists (select 1 from public.profiles p where p.email = arcade_test_cases.game_email and p.turma = 'jogos')
  );

drop policy if exists "arcade_test_cases_delete_self" on public.arcade_test_cases;
create policy "arcade_test_cases_delete_self"
  on public.arcade_test_cases for delete to authenticated
  using (autor_email = public.current_email() or public.is_professor());

grant select, insert, delete on public.arcade_test_cases to authenticated;
