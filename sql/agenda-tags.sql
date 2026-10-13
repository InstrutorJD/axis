-- Tags da agenda do professor (shared/professor-agenda.js): cada
-- compromisso pode ter UMA tag — planejamento, lancamento, aula, pessoal ou
-- compromisso —, cada uma com a sua cor, e o calendário filtra por elas.
-- Rode UMA vez no SQL Editor do Supabase — é seguro rodar de novo
-- (idempotente). É o mesmo trecho que está em sql/professor-agenda.sql e em
-- sql/supabase-setup-completo.sql.
--
-- Antes de rodar isto, a agenda continua funcionando, mas salva os
-- compromissos sem a tag (e avisa).
alter table public.professor_compromissos add column if not exists tag text;
alter table public.professor_compromissos drop constraint if exists professor_compromissos_tag_valida;
alter table public.professor_compromissos add constraint professor_compromissos_tag_valida
  check (tag is null or tag in ('planejamento', 'lancamento', 'aula', 'pessoal', 'compromisso'));
