# Como trabalhamos neste repositório

## ⚠️ Trilha nova? Leia `docs/padrao-trilhas.md` ANTES de tudo

Toda trilha criada daqui pra frente (Jogos e Sistemas) segue o **padrão
novo, com layout de slides**, descrito em `docs/padrao-trilhas.md`:

- Teoria = um arquivo **`.md`** (mesma sintaxe de `materiais/instrucoes-para-ia.md`)
  + uma casca HTML mínima que carrega o motor compartilhado.
- **Nunca** crie um `*-teoria.html` com `STEPS` nem copie uma atividade de
  `turmas/*/atividades/` como modelo — isso é o padrão antigo, só das trilhas
  já construídas (que **não** devem ser alteradas nem migradas).
- Regras de nota, progresso, capacidade MSEP e qualidade das perguntas não
  mudaram — estão no documento.
- **Ferramentas: o mais simples possível, online, gratuitas e sem login.**
  Nada de pedir conta em plataforma usada poucas vezes (GitHub, Google e
  Canva, de uso frequente, podem). Sem alternativa sem login → avise o
  professor antes de escrever.
- **Aula só fica "pronta" depois de testada** (seção 11 do documento): todo
  código e comando que o aluno vai digitar é executado de verdade, toda
  ferramenta de fora é aberta num navegador sem login, e a prática é
  resolvida até o fim. Ao entregar, diga o que foi testado, como, e o que
  não deu para testar.
- Se o documento ainda disser **"MOTOR EM CONSTRUÇÃO"**, não crie a trilha:
  avise o usuário e pergunte como seguir.

## Worktree só quando o usuário pedir um agente

Por padrão, trabalhe **direto neste checkout, na `main`**. Não crie worktree
por conta própria.

Só quando o usuário pedir para **criar um agente** (subagente que vai mexer
em arquivos), esse agente roda numa **git worktree** isolada
(`.claude/worktrees/<nome>`, branch `worktree-<nome>`), para não pisar no
trabalho do checkout principal. Nesse caso valem as regras extras marcadas
com *(agente em worktree)* abaixo.

## Testes: quem roda é o GitHub, não o agente

**Não rode a suíte de testes localmente**: nem `npx playwright test`, nem
`npm test`, nem um spec isolado. O usuário não quer gastar tokens com isso.

Isso **não** dispensa testar o **conteúdo de aula** que você criou ou
mudou (rodar o código que o aluno vai digitar, abrir a ferramenta de fora
sem login, resolver a prática até o fim): isso é obrigatório, com scripts
na pasta temporária, nunca no repositório — ver a seção 11 de
`docs/padrao-trilhas.md`.

Quem testa é o GitHub Actions (`.github/workflows/deploy.yml`): a cada push
na `main` ele roda a suíte completa (`npm test`) e **só publica o site se
todos os testes passarem**. Código quebrado pode chegar na `main`, mas não
chega no site dos alunos.

O que continua sendo responsabilidade do agente:

- **Mudou um comportamento de propósito? Atualize os testes que esperam o
  comportamento antigo.** Procure em `tests/` pelo texto, id ou seletor que
  você mudou (ex.: `grep -rn "btnExamGuardAlerts" tests/`). Se não fizer
  isso, o GitHub reprova e o deploy fica travado.
- **Testes novos só quando o usuário pedir.**
- Se o usuário avisar que o GitHub reprovou, aí sim leia o log da falha
  (aba Actions) e corrija.

## Fluxo de cada tarefa

1. Antes de começar, traga a `main` mais recente: `git pull --rebase`.
   *(agente em worktree)*: trabalhe só dentro da sua worktree, nunca no
   checkout principal nem em outra worktree; use `git fetch origin` e
   `git rebase origin/main`.
2. Quando o usuário pedir commit/push:
   - Commit com a mensagem neste formato:

     ```
     <resumo curto do que foi feito>

     O que mudou de comportamento (de propósito):
     - <ex.: o botão de perfil do professor agora abre a personalização>

     Testes ajustados: <specs alterados, ou "nenhum">
     SQL: <arquivo em sql/ que o usuário precisa rodar no Supabase, ou "nenhum">
     ```

   - `git pull --rebase` e `git push`.
     *(agente em worktree)*: `git fetch origin`, `git rebase origin/main` e
     `git push origin HEAD:main`.
   - Se o Git recusar o push (alguém enviou antes), repita o rebase e o
     push.
   - Se o rebase der conflito num trecho que você não entende, pare e
     pergunte ao usuário.
3. Depois do push, avise o usuário: o que foi enviado, se há SQL para rodar
   no Supabase, e que o GitHub vai testar e publicar em alguns minutos
   (aba **Actions** do repositório).

## Regras para todos

- Nunca use push forçado (`--force`) e nunca reescreva a `main`.
- *(agente em worktree)*: a pilha do `git stash` é **compartilhada** entre
  as worktrees — nunca use `git stash` / `git stash pop` puros; prefira um
  commit temporário. E evite mexer na mesma área que outro agente ao mesmo
  tempo, principalmente nos arquivos grandes e compartilhados
  (`shared/platform-core.js`, `README.md`, `sql/supabase-setup-completo.sql`).

## Convenções do projeto

- Tudo em português: interface, comentários, mensagens de commit.
- O `README.md` documenta como cada parte funciona; atualize a seção
  correspondente quando mudar um comportamento.
- Scripts em `sql/` são idempotentes (`if not exists`, `create or replace`).
  `sql/supabase-setup-completo.sql` é a fonte da verdade.
