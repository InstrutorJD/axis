-- Apresentações do Canva dos alunos — botão 🎨 Canva na barra de abas do
-- portal (shared/canva-links.js). Rode UMA vez no SQL Editor do Supabase —
-- é seguro rodar de novo (idempotente). É o mesmo trecho que está no fim de
-- sql/supabase-setup-completo.sql.
--
-- O que isso cria:
--   • student_canva_links — uma linha por email com o link do trabalho no
--     Canva e um título opcional. É TEMPORÁRIO: o link vale 72 horas a
--     partir do último "Salvar" (enviado_em). Depois disso:
--       - o professor não vê mais (a policy de leitura dele filtra);
--       - a função limpar_canva_expirados() apaga a linha de vez. A tela
--         chama essa função sempre que alguém abre o botão do Canva.
--     Self-service via RLS, igual a student_github_links: o aluno lê/grava/
--     apaga só a PRÓPRIA linha; professor e substituto leem as da turma
--     (o recorte da turma vem do roster, na tela).
--     Os CHECKs repetem a validação da tela, pra ninguém gravar outro tipo
--     de link chamando a API direto.

create table if not exists public.student_canva_links (
  email text primary key,
  canva_url text not null,
  titulo text,
  enviado_em timestamptz not null default now()
);

alter table public.student_canva_links drop constraint if exists student_canva_links_url_valida;
alter table public.student_canva_links add constraint student_canva_links_url_valida
  check (
    canva_url ~* '^https://(www\.)?canva\.com/design/[a-z0-9_-]+(/[^[:space:]]*)?$'
    or canva_url ~* '^https://canva\.link/[a-z0-9_-]+/?$'
    or canva_url ~* '^https://[a-z0-9-]+\.my\.canva\.site(/[^[:space:]]*)?$'
  );

alter table public.student_canva_links drop constraint if exists student_canva_links_titulo_curto;
alter table public.student_canva_links add constraint student_canva_links_titulo_curto
  check (titulo is null or char_length(titulo) <= 80);

alter table public.student_canva_links enable row level security;

drop policy if exists "student_canva_links_select_self_or_professor" on public.student_canva_links;
create policy "student_canva_links_select_self_or_professor"
  on public.student_canva_links for select to authenticated
  using (
    email = public.current_email()
    or (public.is_professor() and enviado_em > now() - interval '72 hours')
  );

drop policy if exists "student_canva_links_insert_self" on public.student_canva_links;
create policy "student_canva_links_insert_self"
  on public.student_canva_links for insert to authenticated
  with check (email = public.current_email());

drop policy if exists "student_canva_links_update_self" on public.student_canva_links;
create policy "student_canva_links_update_self"
  on public.student_canva_links for update to authenticated
  using (email = public.current_email())
  with check (email = public.current_email());

drop policy if exists "student_canva_links_delete_self" on public.student_canva_links;
create policy "student_canva_links_delete_self"
  on public.student_canva_links for delete to authenticated
  using (email = public.current_email());

-- Substituto (sql/usuario-substituto.sql) só lê, igual às outras tabelas.
do $$
begin
  if exists (select 1 from pg_proc where proname = 'is_substituto' and pronamespace = 'public'::regnamespace) then
    execute 'drop policy if exists "student_canva_links_select_substituto" on public.student_canva_links';
    execute 'create policy "student_canva_links_select_substituto" on public.student_canva_links for select to authenticated using (public.is_substituto() and enviado_em > now() - interval ''72 hours'')';
  end if;
end $$;

grant select, insert, update, delete on public.student_canva_links to authenticated;

-- Apaga de vez os links com mais de 72 horas (de todo mundo). security
-- definer porque o aluno não tem permissão de apagar a linha dos outros;
-- a função só apaga o que já expirou, então não dá pra abusar dela.
create or replace function public.limpar_canva_expirados()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.student_canva_links where enviado_em <= now() - interval '72 hours';
$$;

revoke all on function public.limpar_canva_expirados() from public;
grant execute on function public.limpar_canva_expirados() to authenticated;
