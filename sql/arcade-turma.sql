-- Arcade da Turma (arcade.html na raiz do site): vitrine dos jogos que os
-- alunos publicaram no GitHub Pages. Rode UMA vez no SQL Editor do Supabase,
-- DEPOIS de sql/github-links.sql — é seguro rodar de novo (idempotente). É o
-- mesmo trecho que está no fim de sql/supabase-setup-completo.sql.

-- Arcade da Turma (arcade.html): cada aluno também lê os links dos colegas
-- da MESMA turma (os jogos publicados no GitHub Pages). Continua gravando só
-- a própria linha. A subconsulta em profiles passa pela RLS de profiles, que
-- já deixa o aluno ver a própria turma.
drop policy if exists "student_github_links_select_same_turma" on public.student_github_links;
create policy "student_github_links_select_same_turma"
  on public.student_github_links for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.email = student_github_links.email and p.turma = public.current_turma()
  ));
