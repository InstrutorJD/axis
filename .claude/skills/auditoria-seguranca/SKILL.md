---
name: auditoria-seguranca
description: Auditoria de segurança do Axis (portal de aulas) — RLS e funções do Supabase em sql/, checagens que só existem no navegador, XSS, tokens de visto e de prova, isolamento do PixelCode, credenciais e dados pessoais no repositório. Usar quando o usuário pedir auditoria, revisão ou verificação de segurança do projeto inteiro ou de uma parte (ex.: "/auditoria-seguranca sql"). Só lê e relata; não corrige nada.
---

# Auditoria de segurança do Axis

Auditoria **somente leitura** do projeto inteiro (ou da área passada como
argumento: `sql`, `shared`, `professor`, `turmas`, `games`, `materiais`).
Para revisar só as mudanças pendentes de um branch, use `/security-review`.

## Contexto que muda o que é risco aqui

- Site **estático** no GitHub Pages (repositório público
  `InstrutorJD/axis`). Todo arquivo do repositório é público, inclusive
  `sql/`, `materiais/` e `professor/`.
- Banco no **Supabase**. O navegador usa a chave `anon`, que é pública por
  definição: a segurança de verdade está nas **policies de RLS** e nas
  **funções** do banco. Esconder algo no JavaScript não protege nada.
- `shared/supabase-config.js` no repositório só tem os marcadores
  `__SUPABASE_URL__` / `__SUPABASE_ANON_KEY__`; o deploy
  (`.github/workflows/deploy.yml`) injeta os valores dos Secrets.
- Papéis em `public.profiles.role`: `aluno`, `professor`, `substituto`
  (e `admin` aceito por `is_professor()`). Alunos são adolescentes de duas
  turmas (`jogos`, `sistemas`); um aluno **não** pode ver dado de outro
  aluno nem da outra turma, e o substituto não vê o que é só do professor.
- `sql/supabase-setup-completo.sql` é a fonte da verdade do banco; os
  outros `.sql` são trechos dele ou scripts avulsos (diagnóstico, reset).

## Regras

- **Não altere nenhum arquivo** e não faça commit. O resultado é um
  relatório; o usuário decide o que corrigir.
- **Não rode testes** (regra do CLAUDE.md) nem acesse o Supabase de
  produção. Tudo é análise do código.
- Não mande código ou dados do projeto para serviços externos.
- Só relate o que tiver **evidência no código** (arquivo e linha). Se for
  suspeita sem confirmação, marque como "a confirmar" e diga o que
  conferir.

## Roteiro

Faça as verificações na ordem. Para cada uma, leia o código de verdade
(não basta o grep) e anote achados com arquivo:linha.

### 1. Banco: RLS e policies (`sql/`)
- Toda `create table` em `public` tem `enable row level security`?
  Compare a lista de tabelas com a lista de `enable row level security`
  em `sql/supabase-setup-completo.sql` e nos `.sql` avulsos.
- Policies `using (true)` / `with check (true)`, ou para `anon`: quem
  consegue ler ou escrever o quê? Leitura aberta de tabela com dado de
  aluno (notas, chamada, progresso, tempo, e-mail) é **crítico**.
- Policy de `select` de aluno filtra por `auth.uid()` **e** pela turma
  (`current_turma()`)? Policy de `update` tem `with check` (senão o aluno
  muda a linha pra outro dono)?
- O aluno consegue escrever direto em coluna que deveria ser só do
  professor (nota manual, visto, `archived_at`, `role`, `turma`)? Veja
  policies de `update` em `profiles` e nas tabelas de progresso.
- `grant` amplo (`to anon`, `all on all tables`).

### 2. Banco: funções (`create or replace function`)
Hoje existem, entre outras: `is_professor`, `is_substituto`,
`current_email`, `current_turma`, `arquivar_aluno`, `reativar_aluno`,
`gerar_professor_token`, `professor_token_atual`,
`verificar_professor_token`, `resolver_exam_guard_event`,
`set_module_completed_at`, `log_student_time`,
`track_daily_active_seconds`, `quizrush_*`, `set_wallet_password`,
`attempt_wallet_bruteforce`, `execute_hack_transfer`,
`assign_session_ip`, `release_session_ip`.
Para cada função `security definer`:
- Tem `set search_path = public` (ou vazio)? Sem isso é sequestrável.
- Confere quem chama (`is_professor()`, `auth.uid()`) **antes** de agir?
  Função de professor chamável por aluno é **crítico**.
- Confia em parâmetro que o cliente controla (ex.: `p_user_id`,
  `p_turma`, segundos de tempo, `completed_at`) sem validar?
- `grant execute ... to anon` em função que não deveria ser pública.

### 3. Tokens: visto do professor e bloqueio de prova
Arquivos: `shared/professor-visto.js`, `shared/exam-proctor.js`,
`shared/platform-core.js` (token rápido 🔑) e as funções do item 2.
- O token é validado **no banco** (`verificar_professor_token`) ou só no
  navegador? Dá pra marcar visto/concluído chamando o Supabase direto do
  console, sem token?
- Tamanho e aleatoriedade do token, tempo de validade, limite de
  tentativas (dá pra testar 000000–999999?).
- O token aparece em algum lugar que o aluno enxerga (HTML, localStorage
  do aluno, resposta de RPC)?
- Bloqueio de prova: o aluno consegue se desbloquear limpando
  localStorage ou editando estado local?

### 4. Checagens só no navegador
- Páginas que escondem conteúdo pelo papel no JavaScript
  (`currentUser.role`, `substituto`, `requireUser`) mas cujo conteúdo
  está no próprio HTML/JS público. Ex. conhecido: material do professor
  de cibersegurança (`cyberseg-material-professor.html`) e
  `professor/*.html`. Avalie o dano: é só material de aula (baixo) ou
  dado/gabarito (alto)?
- **Gabaritos e respostas** de provas e atividades
  (`turmas/*/atividades/prova-*.html`, `config.js`, perguntas do
  QuizRush) estão no código entregue ao aluno? Isso é o achado mais
  provável e mais relevante pra uma escola.
- Progresso, nota, desbloqueio de jogos e ranking calculados no cliente
  e gravados direto pelo aluno.

### 5. XSS (texto do banco ou do usuário virando HTML)
- `innerHTML`, `insertAdjacentHTML`, `outerHTML`, `document.write` com
  dado vindo do Supabase, da URL (`location.hash`/`search`) ou digitado:
  nome de aluno, notas de Conhecimentos, anotações de Projetos, títulos,
  respostas, mensagens. Confira se passa por escape (`esc()` e similares).
- Renderizadores de Markdown (`shared/conhecimentos.js`,
  `shared/slides-md.js`, `shared/aula-md.js`, `shared/roteiro-slides.js`):
  links `javascript:`, atributos, HTML cru no texto.
- `postMessage`: quem recebe confere `event.origin`? Quem envia usa
  origem específica (não `'*'`) quando o dado é sensível?

### 6. PixelCode e iframes
- `pixelcode.html`: o `<iframe sandbox>` continua **sem**
  `allow-same-origin`? O código do aluno não pode alcançar a sessão,
  o localStorage nem o portal.
- Outros iframes de módulos/atividades: `sandbox`/`allow` coerentes?
- Scripts de CDN (`cdn.jsdelivr.net` etc.) sem versão fixa: risco de
  supply chain (médio/baixo).

### 7. Segredos e dados pessoais no repositório
- Chaves, senhas, `service_role`, tokens de API em qualquer arquivo
  (`git grep -n -i "service_role\|secret\|password\|senha\|eyJ"`).
- Senha padrão de aluno/professor escrita em código ou SQL
  (ex.: `sql/trocar-senha-professor.sql`).
- **Dados pessoais de alunos** em arquivos públicos: nomes, e-mails,
  notas em `sql/diagnostico-*.sql`, `professor/data/`, CSVs, materiais.
  Repositório público + dado de menor de idade = **alto** (LGPD).
- Arquivos que não deveriam estar públicos (PDF/DOCX de rascunho,
  planilhas).

### 8. Sessão e autenticação
`shared/session.js` e `index.html`:
- "Permanecer logado": onde fica a sessão e por quanto tempo.
- Aluno arquivado é derrubado de fato (`archived_at`, ban no Auth)?
- `?arquivado=1` e outros parâmetros de URL não liberam nada.
- Redirecionamentos depois do login só pra páginas do próprio site
  (sem open redirect via parâmetro).

## Gravidade

| Nível | Quando |
|---|---|
| **Crítico** | Aluno lê/altera dado de outro aluno, vira professor, ou acessa função de professor; segredo de verdade exposto |
| **Alto** | Dado pessoal de aluno público; gabarito acessível; nota/visto forjável |
| **Médio** | XSS que exige o próprio aluno digitar algo; token fraco mas com limite; checagem só no cliente de conteúdo pouco sensível |
| **Baixo** | Boas práticas (versão de CDN, `search_path`, cabeçalhos) sem caminho de ataque claro |

## Relatório

Responda em português, direto, neste formato:

```
## Auditoria de segurança — <data> — <escopo>

Resumo: X críticos, Y altos, Z médios, W baixos.

### Crítico
1. **<título curto>** — `arquivo:linha`
   - O que acontece: <o ataque, em uma frase, como um aluno faria>
   - Por que: <a causa no código>
   - Como corrigir: <sugestão objetiva; SQL ou trecho se for curto>

### Alto
...

### O que está bem
- <proteções conferidas que funcionam, pra não reabrir depois>

### A confirmar
- <suspeitas que dependem do banco real; o que rodar/olhar no Supabase>
```

No fim, pergunte se o usuário quer que algum item seja corrigido (a
correção segue o fluxo normal do CLAUDE.md: worktree, commit, push).
Se o relatório for longo ou o usuário for compartilhar, ofereça
publicá-lo como página.
