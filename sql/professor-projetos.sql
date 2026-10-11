-- Projetos (painel → cartão "Projetos", professor/projetos.html,
-- shared/projetos.js): caderno de projetos do professor, com anotações
-- rápidas (ideia, pesquisa, link), fixar e arquivar. Rode UMA vez no SQL
-- Editor do Supabase — é seguro rodar de novo (idempotente). É o mesmo
-- trecho que está em sql/supabase-setup-completo.sql.
--
-- SÓ O PROFESSOR: cada linha pertence a um professor (professor_id =
-- auth.uid(), preenchido sozinho) e só ele lê, cria, muda ou apaga — e
-- precisa ser professor de verdade (is_professor(); aluno e substituto
-- ficam de fora).
-- arquivado = true: o projeto vai pra aba "Arquivados" (a anotação, pra
-- aba "Arquivadas" do projeto); não aparece em mais lugar nenhum.
-- Apagar um projeto apaga as anotações dele junto (on delete cascade).
-- Antes de rodar isto, a página funciona, mas salvando só no navegador.
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
