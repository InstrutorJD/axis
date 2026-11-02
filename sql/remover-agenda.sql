-- Remove a tabela da agenda do professor, que saiu do painel. Rode UMA vez no
-- SQL Editor do Supabase — é seguro rodar de novo (idempotente).
--
-- ATENÇÃO: apaga de vez todos os compromissos gravados. Quem quiser guardar
-- uma cópia deve exportar a tabela antes de rodar. As policies e o índice
-- saem junto com a tabela.
drop table if exists public.professor_compromissos;
