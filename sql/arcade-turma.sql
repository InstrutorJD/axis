-- Arcade da Turma (arcade.html na raiz do site): vitrine dos jogos que os
-- alunos publicaram no GitHub Pages. Rode UMA vez no SQL Editor do Supabase,
-- DEPOIS de sql/github-links.sql — é seguro rodar de novo (idempotente). É o
-- mesmo trecho que está no fim de sql/supabase-setup-completo.sql.

-- Arcade da Turma (arcade.html): o aluno de Jogos Digitais também lê os
-- links dos colegas da turma (os jogos publicados no GitHub Pages). Só a
-- turma 'jogos' — Sistemas não tem Arcade, lá cada um continua lendo só a
-- própria linha. Gravar continua sendo só a própria linha. A subconsulta em
-- profiles passa pela RLS de profiles, que já deixa o aluno ver a própria
-- turma.
drop policy if exists "student_github_links_select_same_turma" on public.student_github_links;
create policy "student_github_links_select_same_turma"
  on public.student_github_links for select to authenticated
  using (public.current_turma() = 'jogos' and exists (
    select 1 from public.profiles p
    where p.email = student_github_links.email and p.turma = 'jogos'
  ));
