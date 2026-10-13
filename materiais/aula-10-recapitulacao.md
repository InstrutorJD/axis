---
aula: 10
data: 2026-10-13
titulo: Recapitulando: da web ao banco de dados
turma: IA
descricao: Revisão das aulas 1 a 9 (web, requisitos, GitHub, lógica, ciclo do Git e Supabase) e o tutor de IA para continuar estudando
---

# Recapitulando
Da web ao banco de dados: tudo o que você já construiu

---

## Hoje você vai
+ Relembrar o caminho do curso até aqui
+ Conhecer os agentes de código: Codex e Claude Code
+ Montar o seu tutor de IA para continuar estudando

---

## O caminho até aqui

| Aula | Tema |
|---|---|
| 1 | Do bit à IA: como uma aplicação funciona |
| 2 | HTTP, JSON, requisitos e GitHub |
| 3 | Codespace, terminal, Git e webhook |
| 4 | Lógica, leitura de código e o checklist no ar |
| 5 | Issue, branch, commit e pull request |
| 9 | Banco de dados, SQL e Supabase |

---

# Aula 1
Do bit à IA

---

## Do bit à IA
- O computador só entende **0 e 1**: tudo vira número
- **Algoritmo** é uma receita: passos claros e na ordem
- Linguagem **compilada** traduz antes; **interpretada**, enquanto roda
- A IA aprende com **exemplos** e prevê a próxima palavra (**tokens**)
- **Alucinação**: a IA erra com confiança, então revise tudo

---

# Aulas 2 e 3
A inspeção vira dado e ganha uma casa

---

## Web, dados e requisitos
- O navegador faz uma **requisição HTTP** e o servidor **responde**
- **JSON** organiza dados em chave e valor
- `fetch` faz a requisição pelo JavaScript
- **RF** diz o que o sistema faz; **RNF** diz como ele deve ser

> "O sistema deve abrir em até 2 segundos" é RNF: fala de desempenho, não de função.

---

## GitHub, Codespace e terminal
- **GitHub** guarda o projeto na nuvem: é o seu currículo
- **Codespace** é o VS Code rodando no navegador
- **Git** é a máquina do tempo: cada `commit` é uma foto
- **Webhook**: o servidor avisa quando algo acontece, sem você perguntar

```bash
git add .
git commit -m "Adiciona a lista de itens"
git push
```

---

# Aulas 4 e 5
Lógica e o ciclo de uma mudança

---

## As 5 peças da lógica
| Peça | Exemplo |
|---|---|
| Variável | `let horimetro = 1200;` |
| Condição | `if (nivel < 20) { ... }` |
| Lista e laço | `for (const item of itens)` |
| E / OU | `ok && critico` |
| Evento | `botao.addEventListener('click', ...)` |

`&&` é o **E** (as duas condições); `||` é o **OU** (basta uma).

---

## O ciclo de uma mudança
+ **Issue**: o pedido de mudança
+ **Branch**: o rascunho, sem mexer no oficial
+ **Commit**: cada ajuste, com o motivo
+ **Pull request**: o pedido de revisão
+ **Merge**: a mudança vira oficial

---

# Aula 9
O sistema ganha memória

---

## Banco de dados e Supabase
- Tabela: **linhas** (registros) e **colunas** (campos com tipo)
- **Chave primária** identifica cada linha; **estrangeira** liga tabelas
- SQL em 4 verbos: `insert`, `select`, `update`, `delete`
- **Supabase**: um PostgreSQL na nuvem, com plano grátis
- **RLS**: cada linha só para quem tem permissão

---

## Novidade: agentes de código
- **Copilot** sugere código enquanto você digita
- **Codex** (OpenAI) e **Claude Code** (Anthropic) são **agentes**
- Agente lê o projeto, edita arquivos e roda comandos sozinho
- Você continua responsável: **revise tudo** que ele mudou

> Assistente responde. Agente executa. Os dois erram.

---

## O que vimos
+ A web é pedido e resposta, e os dados viajam em JSON
+ Requisitos guiam o que construir
+ Git e GitHub guardam cada mudança, com revisão
+ O banco dá memória ao sistema, e o RLS protege os dados

---

# Continue estudando
Um tutor de IA só seu

---

## O seu tutor de estudos
+ Um prompt pronto que transforma o ChatGPT ou o Claude em **tutor**
+ Explica **VS Code, GitHub, Supabase, Codex e Claude Code**
+ Uma ideia por vez, com palavras simples
+ Você escolhe: respostas **curtas, médias ou detalhadas**
+ E escolhe se quer **dicas** para chegar na solução ou a **resposta explicada**

---

## Pegue o seu tutor
[qrcode https://instrutorjd.github.io/axis/materiais/tutor-estudos/ instrutorjd.github.io/axis/materiais/tutor-estudos]

Toque em **Copiar prompt** e cole numa conversa nova. Para ficar salvo, cole nas instruções de um **Projeto**.

---

# Até a próxima aula!
Estudar um pouco todo dia vale mais que muito de uma vez
