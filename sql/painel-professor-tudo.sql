-- Tudo o que o painel do professor ganhou nesta leva, num arquivo só:
-- Agenda, painel personalizável, Conhecimentos e Projetos. Rode UMA vez no
-- SQL Editor do Supabase (cole tudo e clique em Run). É seguro rodar de
-- novo: tudo é idempotente (if not exists / drop policy if exists).
--
-- Precisa do banco já montado (public.is_professor() e
-- public.user_preferences, de sql/supabase-setup-completo.sql).
-- Os mesmos trechos estão nos arquivos separados e no setup completo:
--   sql/professor-agenda.sql, sql/painel-layout.sql,
--   sql/professor-notas.sql, sql/professor-projetos.sql

-- ============================================================
-- 1) AGENDA DO PROFESSOR — sql/professor-agenda.sql
-- ============================================================

-- Agenda do professor (painel → cartão "Agenda", shared/professor-agenda.js).
-- Rode UMA vez no SQL Editor do Supabase — é seguro rodar de novo
-- (idempotente). É o mesmo trecho que está em sql/supabase-setup-completo.sql.
--
-- Cada linha é um compromisso de UM professor: só o dono enxerga, cria,
-- muda ou apaga (professor_id = auth.uid(), preenchido sozinho no insert).
-- Antes de rodar isto, a agenda já funciona, mas salvando só no navegador.
--
-- dia_todo true (ou sem hora nenhuma) = compromisso de dia todo.
-- hora_inicio / hora_fim podem vir sozinhas (só início, ou só fim).
-- lembrete_min: minutos antes do início (null = sem lembrete); quando chega
-- a hora, vira notificação no sininho até lembrete_lido ficar true.
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
-- 2) PAINEL PERSONALIZÁVEL (arrumação dos cartões) — sql/painel-layout.sql
-- ============================================================

-- Painel do professor personalizável (botão "Personalizar" no topo do
-- painel, shared/painel-layout.js): guarda a posição, o tamanho e os cartões
-- ocultos na linha do professor em user_preferences, pra arrumação seguir
-- ele em qualquer computador. Rode UMA vez no SQL Editor do Supabase — é
-- seguro rodar de novo (idempotente). É o mesmo trecho que está em
-- sql/supabase-setup-completo.sql, logo depois de user_preferences.
--
-- Formato: { "v": 2, "itens": { "agenda": { "x": 6, "y": 0, "w": 6, "h": null, "oculto": false }, ... } }
-- (x/w em colunas de 12, y/h em linhas de 8 px; h null = altura do conteúdo).
-- As policies de user_preferences já valem (cada um só lê/grava a própria
-- linha). Sem esta coluna, o painel salva a arrumação só no navegador.
alter table public.user_preferences add column if not exists painel_layout jsonb;

-- ============================================================
-- 3) CONHECIMENTOS (notas conectadas) — sql/professor-notas.sql
-- ============================================================

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

-- ============================================================
-- 4) PROJETOS (caderno de projetos) — sql/professor-projetos.sql
-- ============================================================

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
