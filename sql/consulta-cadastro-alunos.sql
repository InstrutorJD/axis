-- Consulta do cadastro dos alunos (somente leitura: não altera nada).
-- Rode no SQL Editor do Supabase. Selecione só a consulta que quiser executar.
-- A coluna "email" guarda o usuário de login do aluno.

-- 1) Alunos ativos, por turma e nome.
select
  p.nome,
  p.email,
  p.turma,
  u.created_at as cadastrado_em,
  u.last_sign_in_at as ultimo_login,
  p.updated_at as atualizado_em
from public.profiles p
left join auth.users u on u.id = p.id
where p.role = 'aluno'
  and p.archived_at is null
order by p.turma, p.nome;

-- 2) Alunos de uma turma, incluindo os arquivados.
-- Troque 'jogos' pela turma desejada (ex.: 'sistemas').
select
  p.nome,
  p.email,
  p.turma,
  case when p.archived_at is null then 'ativo' else 'arquivado' end as situacao,
  p.archived_at as arquivado_em,
  u.last_sign_in_at as ultimo_login
from public.profiles p
left join auth.users u on u.id = p.id
where p.role = 'aluno'
  and p.turma = 'jogos'
order by situacao, p.nome;

-- 3) Buscar um aluno por parte do nome ou do usuário de login.
-- Troque 'silva' pelo que quiser procurar (maiúsculas não importam).
select
  p.id,
  p.nome,
  p.email,
  p.turma,
  case when p.archived_at is null then 'ativo' else 'arquivado' end as situacao,
  u.last_sign_in_at as ultimo_login
from public.profiles p
left join auth.users u on u.id = p.id
where p.role = 'aluno'
  and (p.nome ilike '%silva%' or p.email ilike '%silva%')
order by p.nome;

-- 4) Quantidade de alunos por turma.
select
  turma,
  count(*) filter (where archived_at is null) as ativos,
  count(*) filter (where archived_at is not null) as arquivados,
  count(*) as total
from public.profiles
where role = 'aluno'
group by turma
order by turma;
