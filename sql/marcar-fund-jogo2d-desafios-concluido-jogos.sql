-- Marca como CONCLUÍDA a prática "Desafios de Lógica 2D" da trilha
-- "Lógica de Jogo 2D em JavaScript" (matéria Fundamentos de Programação de
-- Jogos, trilha fund-jogo2d, módulo desafios — ver turmas/jogos/config.js)
-- pra TODOS os alunos ativos (não arquivados) da turma Jogos. A teoria da
-- trilha não é mexida.
--
-- ATENÇÃO — isso ESCREVE em produção pra todo mundo da turma de uma vez,
-- sem volta fácil (não existe backup automático do valor anterior). Revise
-- antes de rodar; se quiser testar num aluno só primeiro, troque a cláusula
-- "where p.role = 'aluno' and p.turma = 'jogos' and p.archived_at is null"
-- por "where p.email = 'ALGUM_USERNAME'" nas duas consultas abaixo.
--
-- Grava nas DUAS tabelas de propósito — uma só não basta:
--   1) public.student_module_progress: o que o professor vê no ranking e
--      nos relatórios de conclusão.
--   2) public.student_activity_state: a fonte real do "concluído ✅" que
--      aparece na TELA do próprio aluno (shared/platform-core.js,
--      hydrateLocalProgressFromRemote).
--
-- progressTotal = 8 (config.js). O estado da prática é o array com os ids
-- dos desafios resolvidos — o shared/js-challenge-engine.js guarda o `id`
-- de cada desafio (1..8 em turmas/jogos/atividades/fund-jogo2d-desafios.html),
-- não o índice. Se o número de desafios mudar, atualize os valores abaixo.

-- 1) student_module_progress
insert into public.student_module_progress
  (student_email, student_name, turma, trilha_key, module_key, progress_current, progress_total, completed)
select p.email, p.nome, 'jogos', 'fund-jogo2d', 'desafios', 8, 8, true
from public.profiles p
where p.role = 'aluno' and p.turma = 'jogos' and p.archived_at is null
on conflict (student_email, trilha_key, module_key) do update
  set progress_current = excluded.progress_current,
      progress_total = excluded.progress_total,
      completed = true,
      updated_at = now();

-- 2) student_activity_state — progress_key = ACTIVITY_LOCATION da página.
insert into public.student_activity_state (student_email, progress_key, state)
select p.email, 'fund_jogo2d_desafios', '[1,2,3,4,5,6,7,8]'::jsonb
from public.profiles p
where p.role = 'aluno' and p.turma = 'jogos' and p.archived_at is null
on conflict (student_email, progress_key) do update
  set state = excluded.state, updated_at = now();

-- 3) conferência — deve mostrar 1 linha, com a contagem igual ao número de
--    alunos ativos de Jogos.
select trilha_key, module_key, count(*) as alunos_marcados
from public.student_module_progress
where turma = 'jogos' and trilha_key = 'fund-jogo2d' and module_key = 'desafios' and completed = true
group by trilha_key, module_key;
