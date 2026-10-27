-- TEMPORÁRIO: a turma Sistemas visita o Arcade da turma de Jogos Digitais
-- (arcade.html) só pra JOGAR e CURTIR. Rode UMA vez no SQL Editor do
-- Supabase, DEPOIS de sql/arcade-turma.sql e sql/arcade-curtidas.sql — é
-- seguro rodar de novo (idempotente).
--
-- Fica de fora de sql/supabase-setup-completo.sql de propósito: é uma
-- abertura passageira. Pra ENCERRAR, rode o trecho "FECHAR" no fim deste
-- arquivo e desligue o interruptor no código (arcadeConvidada em
-- turmas/sistemas/config.js e TURMAS_CONVIDADAS em arcade.html).
--
-- O que libera pro aluno de Sistemas (nada de gravar em tabela da outra
-- turma, e casos de teste continuam só de Jogos):
-- 1. ler nome/email dos alunos de Jogos (o card mostra o autor do jogo);
-- 2. ler os links do GitHub Pages dos alunos de Jogos (os jogos em si);
-- 3. ver as curtidas e curtir/descurtir jogos de alunos de Jogos.
-- As telas que listam a própria turma filtram por turma (.eq('turma', ...)),
-- então os alunos de Jogos não aparecem em ranking/chamada de Sistemas.

drop policy if exists "profiles_select_arcade_sistemas" on public.profiles;
create policy "profiles_select_arcade_sistemas"
  on public.profiles for select to authenticated
  using (public.current_turma() = 'sistemas' and turma = 'jogos');

drop policy if exists "student_github_links_select_arcade_sistemas" on public.student_github_links;
create policy "student_github_links_select_arcade_sistemas"
  on public.student_github_links for select to authenticated
  using (public.current_turma() = 'sistemas' and exists (
    select 1 from public.profiles p
    where p.email = student_github_links.email and p.turma = 'jogos'
  ));

drop policy if exists "arcade_likes_select_sistemas" on public.arcade_likes;
create policy "arcade_likes_select_sistemas"
  on public.arcade_likes for select to authenticated
  using (public.current_turma() = 'sistemas');

drop policy if exists "arcade_likes_insert_sistemas" on public.arcade_likes;
create policy "arcade_likes_insert_sistemas"
  on public.arcade_likes for insert to authenticated
  with check (
    liker_email = public.current_email()
    and public.current_turma() = 'sistemas'
    and exists (select 1 from public.profiles p where p.email = arcade_likes.game_email and p.turma = 'jogos')
  );

-- ===================== FECHAR (quando acabar a visita) =====================
-- Descomente e rode as 4 linhas abaixo. As curtidas que a turma Sistemas deu
-- continuam contando; pra apagá-las também, rode a última linha.
--
-- drop policy if exists "profiles_select_arcade_sistemas" on public.profiles;
-- drop policy if exists "student_github_links_select_arcade_sistemas" on public.student_github_links;
-- drop policy if exists "arcade_likes_select_sistemas" on public.arcade_likes;
-- drop policy if exists "arcade_likes_insert_sistemas" on public.arcade_likes;
--
-- delete from public.arcade_likes l using public.profiles p where p.email = l.liker_email and p.turma = 'sistemas';
