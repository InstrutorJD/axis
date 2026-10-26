# Padrão de trilhas novas — layout de slides

> ✅ **STATUS: MOTOR PRONTO.** A teoria em `.md` roda pelo motor
> `shared/aula-md.js` (+ `shared/aula-md.css`) e as práticas usam o visual
> base (`shared/aula-base.css` + `shared/aula-base.js`, seção 8).
>
> **Trilha de referência (completa, teoria + 2 práticas):**
> `bd-nosql` em Sistemas → Banco de Dados
> (`turmas/sistemas/aulas/bd-nosql-teoria.md`,
> `turmas/sistemas/atividades/bd-nosql-teoria.html`,
> `bd-nosql-consultoria.html` e `bd-nosql-modelagem.html`).
>
> **Outras trilhas no layout novo:** as do **FinancApp** em Sistemas (trilha
> única `projeto-financapp`, no card "Projetos") e **Motor Phaser: Construa
> o Pacman** em Jogos (`cod-phaser`).
>
> **Semana 12–18/10/2026:** `mundo-profissoes` (Mundo do Trabalho,
> compartilhada: arquivos em `turmas/sistemas/`), `prog-comentarios`
> (Sistemas), `teste-bugs`, `fund-jogo2d` (prática com
> `js-challenge-engine.js` no visual base) e `cod-phaser-final` (Jogos).
>
> **Carga horária:** quando o professor manda a linha do plano de ensino
> ("Aula N - data", com um mínimo de horas), teoria + práticas precisam
> cobrir esse tempo. Anote a estimativa por módulo num comentário da trilha
> no `config.js`.

Este documento vale para **toda trilha criada daqui pra frente** nas turmas
Jogos Digitais (`turmas/jogos/`) e Desenvolvimento de Sistemas
(`turmas/sistemas/`).

- **Trilhas já construídas não mudam.** As 136 atividades existentes seguem o
  padrão antigo, documentado no `README.md` ("Diretrizes de conteúdo
  educacional"). Não migre, não "modernize" e não copie nenhuma delas como
  modelo para trilha nova.
- **O que muda é só o layout de apresentação.** Regras de nota, progresso,
  cadeado entre módulos, capacidade MSEP e qualidade das perguntas continuam
  exatamente como hoje.

---

## 1. Visão geral

| | Padrão antigo (não usar em trilha nova) | Padrão novo |
|---|---|---|
| Teoria | Um `*-teoria.html` inteiro por aula, com CSS próprio e `STEPS = [{ story, question }]` | Um arquivo **`.md`** com o conteúdo + uma casca HTML mínima que carrega o motor compartilhado |
| Visual da teoria | Cada arquivo com seu CSS (~110 linhas repetidas) | Visual de slides compartilhado: palco, transições, entrada animada, perguntas em cartões |
| Apresentação do professor | Botão "Gerar Slides" baixa um `.pptx` | Botão **▶ Apresentação**: o próprio `.md` vira slides interativos em tela cheia, no navegador |
| Prática | Tela própria por tipo | Mesma lógica de hoje, com o **visual base compartilhado** (`shared/aula-base.css`) |

A vantagem: **o mesmo `.md` serve para o aluno estudar (com nota) e para o
professor projetar**, e é escrito no mesmo formato do "Criar Material"
(`materiais/instrucoes-para-ia.md`).

---

## 2. Antes de começar (obrigatório)

1. **Capacidade real.** A capacidade da trilha é fornecida pelo professor (a
   mesma verificada pela MSEP do SENAI). Nunca invente. Sem capacidade, pergunte.
2. **Conteúdo embasado na capacidade.** Teoria e prática existem para
   desenvolver/verificar aquela capacidade, não conteúdo genérico.
3. **Estrutura:** 1 módulo de teoria + 1 ou mais módulos de prática, com a
   prática travada até a teoria ser concluída (`requires`).
4. **Não copie** nenhuma atividade de `turmas/*/atividades/` como ponto de
   partida — elas estão no padrão antigo.
5. **O mais simples possível: de preferência, nada fora do portal.** Se a
   prática precisa de ferramenta de fora, ela tem que ser **online,
   gratuita e sem login**: roda só no navegador (HTTPS), sem instalar
   programa, sem depender de porta (27017, 3306...) e **sem pedir conta**.
   - Conta só em plataforma que a turma **já usa sempre** (GitHub/Codespaces,
     Google, Canva). Nunca peça para criar conta numa plataforma que vai ser
     usada uma ou poucas vezes.
   - Se o plano de ensino citar uma ferramenta instalável ou com conta, use a
     alternativa sem login (ex.: MongoDB Atlas/Compass → Mongo Playground;
     CodePen → JSFiddle).
   - **Não achou alternativa sem login e sem instalar? Pare e avise o
     professor** antes de escrever a prática. Não decida sozinho.
6. **Tudo testado antes de dizer "pronto".** Ver a seção 11.

---

## 3. Arquivos de uma trilha nova

Para uma trilha de key `<trilha>` na turma `<turma>`:

```
turmas/<turma>/aulas/<trilha>-teoria.md          ← conteúdo da teoria (o que você escreve)
turmas/<turma>/atividades/<trilha>-teoria.html   ← casca mínima que carrega o motor (seção 5)
turmas/<turma>/atividades/<trilha>-<pratica>.html← prática(s), com o visual base (seção 8)
turmas/<turma>/config.js                         ← registro da trilha e dos módulos (seção 6)
```

---

## 4. Teoria: o arquivo `.md`

### 4.1 Sintaxe

A sintaxe dos slides é a mesma do "Criar Material" e está **inteira** em
`materiais/instrucoes-para-ia.md` (seções 2 a 4: separador `---`, títulos,
listas, `+` em etapas, código, tabela, destaque, QR Code, cronômetro e os
**limites de cada slide**). Leia esse arquivo antes de escrever — não repita
nem invente sintaxe aqui.

Diferenças da aula de trilha em relação a um material avulso:

- **Cabeçalho** (no topo do arquivo):

  ```
  ---
  titulo: Fundamentos de Redes
  turma: 2º DS
  ---
  ```

  Sem `aula:` nem `data:` — trilha não tem número/data de aula. A
  capacidade NÃO vai no `.md`: vem do `config.js` da trilha e o motor mostra
  sozinho no slide de abertura.

- **Perguntas valem nota.** Toda pergunta `- [ ]` / `- [x]` conta para a
  nota da aula. Formato de cada pergunta:

  ```
  ## Pergunta
  Você precisa rodar um comando Git sem sair do editor. O que usar?

  - [x] O terminal integrado do editor
  - [ ] A paleta de temas do editor
  - [ ] O salvamento automático de arquivos
  - [ ] O painel de extensões instaladas

  > Por quê: o terminal integrado roda comandos sem trocar de janela.
  ```

  - Exatamente **4 alternativas** e exatamente **uma** `[x]`.
  - Escreva a certa em qualquer posição — o motor embaralha as alternativas
    para o aluno.
  - A linha `> Por quê: ...` logo depois das alternativas é a **explicação**.
    O aluno só a vê quando ACERTA (no erro, nada revela a resposta — ver
    seção 7). Na apresentação do professor ela aparece depois de revelar a
    resposta.
  - **Uma pergunta por slide**, e nada além do enunciado, das alternativas e
    do `> Por quê:`.

- **Ritmo:** 1 ou 2 slides de conteúdo antes de cada pergunta. Uma aula
  típica tem **8 a 14 perguntas** (como as teorias atuais) e fecha com um
  slide `#` de encerramento chamando para a prática.

### 4.2 Qualidade das perguntas (mesmas regras de hoje)

Valem integralmente as regras do `README.md`, seção "Perguntas de múltipla
escolha (quiz de teoria)":

- **Comprimento:** as 4 alternativas com tamanho e nível de detalhe
  parecidos — a certa não pode ser a mais longa.
- **O conteúdo não entrega a resposta:** o slide antes da pergunta ensina o
  conceito; a pergunta pede para APLICAR a um cenário novo, não repetir uma
  frase que acabou de aparecer.
- **Distratores plausíveis:** erros de raciocínio reais do mesmo domínio,
  nunca opções absurdas.

### 4.3 Estrutura recomendada da teoria

1. `# Título da trilha` + 1 linha de subtítulo (o motor adiciona a capacidade).
2. "Nesta aula você vai..." com `+` (3 a 4 itens).
3. Blocos de **conteúdo (1–2 slides) → pergunta**, repetidos.
4. "O que vimos" com `+`.
5. `# Hora da prática!` + 1 linha dizendo qual módulo de prática abrir.

---

## 5. Teoria: a casca HTML

Um arquivo de poucas linhas, sem CSS próprio, que só carrega o motor
compartilhado e diz qual `.md` usar e qual a chave de progresso. Copie e
troque só o título, o `ACTIVITY_LOCATION` (duas vezes) e o caminho do `.md`
(modelo real: `turmas/sistemas/atividades/bd-nosql-teoria.html`):

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Fundamentos de Redes — Teoria</title>
<link rel="stylesheet" href="../../../shared/aula-md.css">
<script>
  window.ACTIVITY_LOCATION = 'redes_fundamentos_teoria';
</script>
<script src="../../../shared/supabase-config.js"></script>
<script src="../../../shared/session.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="../../../shared/clipboard-guard.js"></script>
<script src="../../../shared/activity-tracker.js"></script>
<script src="../../../shared/progress-sync.js"></script>
<script src="../../../shared/gabarito-generator.js"></script>
<script src="../../../shared/slides-md.js"></script>
<script src="../../../shared/aula-base.js"></script>
<script src="../../../shared/aula-md.js"></script>
</head>
<body>
<script>
  AulaMD.iniciar({
    md: '../aulas/redes-fundamentos-teoria.md',
    activityLocation: 'redes_fundamentos_teoria',
  });
</script>
<script src="../../../shared/vlibras-widget.js"></script>
</body>
</html>
```

- `window.ACTIVITY_LOCATION` precisa vir **antes** do `progress-sync.js`
  (é ele que espelha o progresso no Supabase).
- `slides-md.js` é o parser do Criar Material: a teoria usa o mesmo formato
  de `.md`. As bibliotecas pesadas da apresentação (realce de código, QR
  Code) só carregam quando o professor clica em ▶ Apresentação.
- O motor lê o `.md` de forma síncrona de propósito: a Gestão e o QuizRush
  abrem a página num `<iframe>` oculto e pedem o gabarito logo no `onload`.

O motor cuida de tudo que hoje cada `*-teoria.html` repetia: visual,
progresso, nota, embaralhar, gabarito para a Gestão e o QuizRush, a
capacidade no slide de abertura (lida do `config.js`) e o botão **▶
Apresentação** (só para professor: o `.md` vira os slides do Criar Material,
com o "Por quê" aparecendo só depois de revelar a resposta).

---

## 6. Registro no `config.js`

Igual ao de hoje (ver `README.md`, "Hierarquia Matéria → Trilha → Módulo"):

```js
{
  key: 'redes-fundamentos',
  label: 'Fundamentos de Redes',
  desc: 'Uma frase sobre a trilha.',
  capacidade: '<texto EXATO fornecido pelo professor>',
  modules: [
    {
      key: 'teoria', title: 'Teoria — Fundamentos de Redes',
      desc: 'O que a teoria cobre, em uma frase.',
      icon: '📖', src: 'atividades/redes-fundamentos-teoria.html', telaCheia: true,
      progressKey: 'redes_fundamentos_teoria_progress_', progressMode: 'flag',
      hasGabarito: true
    },
    {
      key: 'pratica', title: 'Prática — ...',
      desc: '...',
      icon: '🛠️', src: 'atividades/redes-fundamentos-pratica.html', telaCheia: true,
      progressKey: 'redes_fundamentos_pratica_progress_', progressTotal: 6,
      requires: 'teoria', hasGabarito: true
    }
  ]
}
```

- **`telaCheia: true` em TODO módulo do padrão novo** (teoria e prática): o módulo abre ocupando a tela inteira (sem margem, por cima até da barra do portal), só com a faixa "← Voltar" no topo — as telas dos alunos são pequenas. Módulos do padrão antigo não têm essa marca e continuam abrindo no modal de sempre.
- **`aula` e `dataAula`** (ex.: `aula: 32, dataAula: '2026-10-05'`): quando a
  trilha vem de uma linha do plano de ensino ("Aula 32 - 05/10/2026"),
  registre o número e a data. Aparecem no cabeçalho da trilha e na Gestão →
  "Liberação por Trilha" (com o botão "Usar DD/MM", que preenche o
  "Liberar em" com essa data). **Trilha com `dataAula` fica escondida do
  aluno (e fora das contagens) até o professor preencher o "Liberar em".**
- **Trilha compartilhada entre turmas** (mesma aula no plano das duas): crie os
  arquivos numa turma só (ex.: `turmas/sistemas/`) e, no `config.js` da outra,
  registre a mesma trilha com `src: '../sistemas/atividades/...'`. Ver
  `projetos-estrutura-banco` e `projetos-pre-textuais`.
- `progressKey` = `activityLocation` da casca + `_progress_`.
- Não use `hasSlides` em trilha nova: o `.pptx` é do padrão antigo; a
  apresentação agora é o botão ▶ Apresentação.
- Atribua a trilha a um bimestre em Gestão → "Liberação por Trilha" (senão
  ela fica sempre visível — ver "Virada de bimestre" no README).

---

## 7. Nota e progresso (iguais às teorias atuais)

- A aula conta como **concluída** (`progressMode: 'flag'`) quando o aluno
  chega ao fim com **80% ou mais** de acerto.
- **Errou:** não mostra qual era a certa, não escreve a resposta, não mostra
  a explicação — o aluno segue para a próxima.
- **Abaixo de 80% no fim:** pode reiniciar a aula inteira.
- **Sem "responder até acertar":** pergunta já respondida não volta a
  aparecer ao recarregar a página.
- Alternativas embaralhadas para cada aluno.

---

## 8. Prática: visual base

- A **lógica** segue os motores de hoje (ex.: `shared/js-challenge-engine.js`,
  `CHALLENGES` com `tests`, dicas que dão o norte e não a resposta — ver
  README, "Dicas (hints) nas atividades").
- **Todo desafio de código tem `solution`** (a resposta de referência, como o
  aluno escreveria). O `tests/solucoes-desafios.spec.js` acha sozinho toda
  prática com editor (`#codeInput` + `CHALLENGES`), digita a `solution` de
  cada desafio, clica em Executar e reprova se aparecer ❌ ou se faltar
  `solution` — o site não publica. Isso pega valor esperado errado e motor
  que compara errado (já aconteceu: um desafio que devolvia array nunca
  passava, nem com o código certo).
- O **visual** vem de `shared/aula-base.css` + `shared/aula-base.js`. A página
  da prática NÃO traz CSS de layout próprio — no máximo a cor de destaque da
  trilha e o que for específico daquele exercício.
- **Modelo de referência:** `turmas/jogos/atividades/cod-phaser-pratica.html`
  (roteiro em etapas com visto do professor).

### 8.1 Como usar

```html
<link rel="stylesheet" href="../../../shared/aula-base.css">
<style>:root{ --green:#c9a6ff; --green-dim:#7a58b3; --yellow:#e0b84a; }</style> <!-- opcional: cor da trilha -->
...
<script src="../../../shared/aula-base.js"></script>
```

Estrutura da página (os `id` são livres; as classes, não):

```html
<div class="ab-app">
  <header class="ab-topo">
    <div class="ab-topo-titulo">Matéria — Nome da prática</div>
    <div class="ab-topo-etapa">Etapa <span id="lblStepNum">1</span> de <span id="lblStepTotal">5</span></div>
  </header>
  <div class="ab-progresso"><div class="ab-progresso-fill" id="progressFill"></div></div>
  <main class="ab-palco" id="palco">
    <div class="ab-coluna" id="stepWrap">
      <article class="ab-cartao">
        <div class="ab-cartao-etapa">Etapa 1 de 5</div>
        <h2>Título da etapa</h2>
        <div class="ab-conteudo"> ...texto, listas, <pre>, tabelas... </div>
      </article>
      <div class="ab-nav"> <button class="btn btn-secondary">← Voltar</button> <span class="ab-nav-dica">use ← → do teclado</span> <button class="btn">Próximo →</button> </div>
    </div>
  </main>
</div>
```

- Depois de desenhar uma etapa: `AulaBase.decorar(stepWrap, { chaveChecklist: '<activityLocation>_check_' + user + '_' + etapa })`
  (código com Copiar — some sozinho quando o professor bloqueia "Copiar e
  Colar" — e checklist `li.md-check` clicável que lembra o que foi marcado)
  e `AulaBase.transicao(cartao, direcao)` (1 = avançou, -1 = voltou).
- Uma vez: `AulaBase.teclado({ proximo, anterior })` para ← → navegarem.
- Formulário/mensagens: `.ab-form` (label + input + botão) e `.ab-msg` (`.erro`/`.ok`).
- Cores só por variável (`--green`, `--ink`, `--panel`... e `--ab-acento` para
  texto/botão): assim a Personalização do aluno e o tema claro funcionam.

## 9. Desempenho (a internet da escola é fraca)

- Efeitos **só com CSS** (transições e animações). Nada de biblioteca de
  animação, vídeo de fundo ou imagem pesada.
- Nenhuma fonte nova para baixar nas páginas dos alunos.
- Imagens só se forem essenciais, e leves.
- O motor de slides do professor (e bibliotecas como o QR Code) só carrega
  quando o professor clica em ▶ Apresentação.

---

## 10. Checklist de uma trilha nova

- [ ] Capacidade real, fornecida pelo professor, no `config.js`.
- [ ] `turmas/<turma>/aulas/<trilha>-teoria.md` seguindo `materiais/instrucoes-para-ia.md` + seção 4 deste documento.
- [ ] Perguntas: 4 alternativas, uma `[x]`, `> Por quê:`, tamanhos parecidos, distratores plausíveis.
- [ ] Casca `turmas/<turma>/atividades/<trilha>-teoria.html` (seção 5), sem CSS próprio.
- [ ] Prática(s) com o visual base, `requires: 'teoria'`.
- [ ] Prática de código: `solution` em todo desafio (seção 8).
- [ ] Módulos registrados no `config.js` (seção 6), sem `hasSlides`.
- [ ] Ferramentas de fora: online, gratuitas e **sem login** (ou de uso frequente da turma); sem alternativa → professor avisado.
- [ ] **Seção 11 cumprida:** cada código, comando e ferramenta da aula executado de verdade, com o relatório do que foi testado.
- [ ] Testes: seguir o `CLAUDE.md` (quem roda é o GitHub; testes novos só se o usuário pedir).
- [ ] `README.md` atualizado se algum comportamento mudou.

---

## 11. Teste antes de entregar (obrigatório)

Uma aula **só está pronta depois de testada pelo agente**, do jeito que o
aluno vai fazer. Escrever "deve funcionar" não vale. A suíte do GitHub
(`npm test`) continua sendo do GitHub (ver `CLAUDE.md`); o que esta seção
pede é outra coisa: **rodar o conteúdo da aula**. Os scripts de teste ficam
na pasta temporária (scratchpad) do agente, não no repositório.

### 11.1 O que testar e como

| O que a aula pede | Como testar |
|---|---|
| **Ferramenta de fora** (site) | Abrir num navegador **com perfil limpo** (Playwright/Chromium, sem nenhum login) e fazer **o mesmo passo** que o aluno vai fazer: colar, clicar em executar, ver o resultado. Se aparecer tela de login/cadastro antes do passo, a ferramenta não serve. |
| **Nome de botão, menu, painel** | Conferir na página aberta (texto ou print). Se a interface tiver outro idioma, escreva o nome que aparece de verdade. |
| **Código que o aluno digita ou cola** (JS, SQL, Mongo, C++...) | Executar **exatamente o texto da página** (extraído dos `STEPS`/`.md`, não reescrito de memória) no ambiente que o aluno vai usar: JSFiddle, SQL Fiddle (SQLite), Mongo Playground, Wokwi... ou numa página local para JS de navegador. |
| **Etapa que altera um projeto de aula anterior** | Montar o projeto **etapa por etapa** a partir da prática anterior, aplicar as mudanças da nova e **usar** o resultado (ex.: jogar o Pacman: mover, colidir, perder, reiniciar, vencer). Testar também o que acontece **depois** do fim (Game Over, lista vazia, campo em branco). |
| **Prática com correção automática** (desafios, JSON, quiz) | Abrir a página como aluno (servidor local + `stubSupabaseFake` de `tests/helpers.js`) e resolver **até o fim** pela tela: a resposta certa passa, uma resposta certa **escrita de outro jeito** (outra ordem de chaves, outro nome de variável, espaço a mais) também passa, e uma resposta errada típica reprova. |
| **Entrada livre do aluno** (texto, Markdown, JSON) | Testar com texto de verdade e com casos estranhos (linha começando com `2.1`, `-`, `#`, campo vazio, texto enorme): a página não pode travar. |
| **Teoria (`.md`)** | Formato das perguntas (4 alternativas, 1 `[x]`, `> Por quê:`); a certa **não** pode ser sistematicamente a mais longa; todo código de exemplo roda e o valor dos comentários (`// 105`) confere. |
| **Toda página nova ou alterada** | Abrir como aluno e confirmar **zero erro de JavaScript** no console. |

### 11.2 Simplicidade (antes de testar, simplifique)

- Prefira fazer **dentro do portal** (editor, simulador, formulário próprio)
  a mandar o aluno para outro site.
- Uma ferramenta de fora por prática, no máximo, e com o menor número de
  passos. Se um passo não dá para testar (diálogo do sistema, "salvar
  como", instalação), troque por um que dê.
- Instrução que depende de algo que o aluno não tem (conta, programa,
  permissão de administrador) é instrução quebrada.

### 11.3 Como entregar

Só diga que a aula está pronta depois de tudo acima. Na resposta ao
professor, inclua um **relatório curto**:

- o que foi testado, **como** (ferramenta/ambiente) e o resultado;
- o que foi corrigido por causa do teste;
- o que **não** deu para testar e por quê (dito com todas as letras, nunca
  escondido).
