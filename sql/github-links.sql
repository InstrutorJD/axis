-- Links do GitHub de cada aluno (repositório + GitHub Pages) — ícone do
-- GitHub na barra de abas do portal (shared/github-links.js). Rode UMA vez
-- no SQL Editor do Supabase — é seguro rodar de novo (idempotente). É o
-- mesmo trecho que está no fim de sql/supabase-setup-completo.sql, pra quem
-- já tem o banco montado e não quer rodar o script completo de novo.
--
-- O que isso cria:
--   • student_github_links — uma linha por email com o link do repositório
--     (https://github.com/<usuario>/<repo>) e o do GitHub Pages
--     (https://<usuario>.github.io/...). Campo vazio = null.
--     Self-service via RLS, mesmo padrão de user_preferences: cada um só
--     lê/grava a PRÓPRIA linha (email = current_email()); professor e
--     substituto leem todas (lista da turma no mesmo ícone).
--     Os CHECKs repetem a validação da tela (shared/github-links.js), pra
--     ninguém gravar outro tipo de link chamando a API direto.

create table if not exists public.student_github_links (
  email text primary key,
  repo_url text,
  pages_url text,
  updated_at timestamptz not null default now()
);

alter table public.student_github_links drop constraint if exists student_github_links_repo_valido;
alter table public.student_github_links add constraint student_github_links_repo_valido
  check (repo_url is null or repo_url ~* '^https://github\.com/[a-z0-9](-?[a-z0-9]){0,38}/[a-z0-9._-]{1,100}/?$');

alter table public.student_github_links drop constraint if exists student_github_links_pages_valido;
alter table public.student_github_links add constraint student_github_links_pages_valido
  check (pages_url is null or pages_url ~* '^https://[a-z0-9](-?[a-z0-9]){0,38}\.github\.io(/[^[:space:]]*)?$');

alter table public.student_github_links enable row level security;

drop policy if exists "student_github_links_select_self_or_professor" on public.student_github_links;
create policy "student_github_links_select_self_or_professor"
  on public.student_github_links for select to authenticated
  using (public.is_professor() or email = public.current_email());

drop policy if exists "student_github_links_insert_self" on public.student_github_links;
create policy "student_github_links_insert_self"
  on public.student_github_links for insert to authenticated
  with check (email = public.current_email());

drop policy if exists "student_github_links_update_self" on public.student_github_links;
create policy "student_github_links_update_self"
  on public.student_github_links for update to authenticated
  using (email = public.current_email())
  with check (email = public.current_email());

-- Substituto (sql/usuario-substituto.sql) só lê, igual às outras tabelas.
-- O "do $$" evita erro em banco que ainda não rodou o script do substituto
-- (a função is_substituto() não existiria).
do $$
begin
  if exists (select 1 from pg_proc where proname = 'is_substituto' and pronamespace = 'public'::regnamespace) then
    execute 'drop policy if exists "student_github_links_select_substituto" on public.student_github_links';
    execute 'create policy "student_github_links_select_substituto" on public.student_github_links for select to authenticated using (public.is_substituto())';
  end if;
end $$;

grant select, insert, update on public.student_github_links to authenticated;
