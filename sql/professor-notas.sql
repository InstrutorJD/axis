-- Conhecimentos (painel → cartão "Conhecimentos", professor/conhecimentos.html,
-- shared/conhecimentos.js): notas do professor em Markdown, conectadas por
-- [[links]]. Rode UMA vez no SQL Editor do Supabase — é seguro rodar de
-- novo (idempotente). É o mesmo trecho que está em
-- sql/supabase-setup-completo.sql.
--
-- SÓ O PROFESSOR: cada linha pertence a um professor (professor_id =
-- auth.uid(), preenchido sozinho) e só ele lê, cria, muda ou apaga — e
-- precisa ser professor de verdade (is_professor(); aluno e substituto
-- ficam de fora). As conexões, backlinks e tags saem do próprio texto, não
-- precisam de tabela.
-- Antes de rodar isto, a página funciona, mas salvando só no navegador.
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
