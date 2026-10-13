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

-- tag (opcional): planejamento, lancamento, aula, pessoal ou compromisso —
-- cada uma com a sua cor; o calendário filtra por elas (sql/agenda-tags.sql).
alter table public.professor_compromissos add column if not exists tag text;
alter table public.professor_compromissos drop constraint if exists professor_compromissos_tag_valida;
alter table public.professor_compromissos add constraint professor_compromissos_tag_valida
  check (tag is null or tag in ('planejamento', 'lancamento', 'aula', 'pessoal', 'compromisso'));

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
