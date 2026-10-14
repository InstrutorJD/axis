-- Curtidas do Arcade da Turma (arcade.html). Rode UMA vez no SQL Editor do
-- Supabase — é seguro rodar de novo (idempotente). É o mesmo trecho que está
-- no fim de sql/supabase-setup-completo.sql.

-- Uma linha por curtida: quem curtiu (liker_email) o jogo de qual aluno
-- (game_email, o dono do link do GitHub Pages em student_github_links).
-- Uma curtida por pessoa por jogo (chave primária) e ninguém curte o
-- próprio jogo (CHECK). Só a turma de Jogos Digitais (e o professor) vê e
-- curte; cada um só cria/apaga a PRÓPRIA curtida.
create table if not exists public.arcade_likes (
  game_email text not null,
  liker_email text not null,
  created_at timestamptz not null default now(),
  primary key (game_email, liker_email),
  constraint arcade_likes_nao_propria check (game_email <> liker_email)
);

alter table public.arcade_likes enable row level security;

drop policy if exists "arcade_likes_select_jogos" on public.arcade_likes;
create policy "arcade_likes_select_jogos"
  on public.arcade_likes for select to authenticated
  using (public.is_professor() or public.current_turma() = 'jogos');

drop policy if exists "arcade_likes_insert_self" on public.arcade_likes;
create policy "arcade_likes_insert_self"
  on public.arcade_likes for insert to authenticated
  with check (
    liker_email = public.current_email()
    and (public.is_professor() or public.current_turma() = 'jogos')
    and exists (select 1 from public.profiles p where p.email = arcade_likes.game_email and p.turma = 'jogos')
  );

drop policy if exists "arcade_likes_delete_self" on public.arcade_likes;
create policy "arcade_likes_delete_self"
  on public.arcade_likes for delete to authenticated
  using (liker_email = public.current_email());

grant select, insert, delete on public.arcade_likes to authenticated;
