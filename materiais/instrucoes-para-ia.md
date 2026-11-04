# Instruções para gerar uma aula em slides (formato "Criar Material")

Você vai escrever UM arquivo Markdown (.md) que um sistema transforma automaticamente em slides para o professor projetar na sala. Os alunos só assistem à projeção. As aulas são majoritariamente práticas: os slides servem para ABRIR a aula (contexto e objetivos), APOIAR a parte prática (instruções e tempo) e FECHAR a aula (revisão e conclusão).

Responda SOMENTE com o conteúdo do arquivo .md, sem comentários antes ou depois e sem colocar o arquivo inteiro dentro de um bloco de código.

---

## 1. Cabeçalho obrigatório (identificação da aula)

O arquivo DEVE começar exatamente assim, na primeira linha, sem nada antes:

```
---
aula: 3
data: 2026-09-30
titulo: Introdução a Redes de Computadores
turma: 2º DS
descricao: IP, máscara de rede e gateway na prática
---
```

- `aula`: número da aula (só o número).
- `data`: data da aula no formato AAAA-MM-DD (ou DD/MM/AAAA).
- `titulo`: título curto da aula (até ~50 caracteres).
- `turma`: opcional. Nome ou sigla da turma.
- `descricao`: opcional. Uma linha resumindo a aula (aparece no card da aula).
- `instrutor`: opcional. Nome no rodapé do slide de abertura ("Inst.: …"). Sem ele, aparece "Inst.: Jairon".
- `fonte`: opcional. Só use se o professor pedir letra maior: `fonte: grande` aumenta tudo em ~15%. Aí cada slide comporta menos: no máximo **5 itens de lista**, **8 linhas de código** (~55 caracteres) e **5 linhas de tabela**.
- `tipo`: opcional. Use quando o encontro não for uma aula (ex.: `tipo: workshop`): a abertura deixa de mostrar "Aula 01" e o botão do último slide vira "Finalizar".
- `tela`: opcional. Só use se o professor pedir para ocupar uma TV grande: `tela: tv` aumenta letra, tabela e código e põe cronômetro e QR Code ao lado do texto. Aí cada slide comporta menos: no máximo **4 itens de lista**, **9 linhas de código** e **4 linhas de tabela**.
- Cada linha é `chave: valor`. Não use aspas, listas ou linhas em branco dentro do cabeçalho.

---

## 2. Separando os slides

- Uma linha contendo apenas `---` separa um slide do próximo.
- Deixe uma linha em branco antes e depois do `---`.
- Nunca use `---` para outra coisa (nada de linha horizontal decorativa).

---

## 3. O que cada slide pode ter

Use SOMENTE os elementos abaixo. Qualquer outra sintaxe de Markdown (HTML, listas aninhadas, notas de rodapé, títulos `####`, emojis de atalho como `:smile:`) não é suportada e aparece como texto cru.

| Escreva | Vira |
|---|---|
| `# Título` | Slide de ABERTURA/SEÇÃO: título enorme e centralizado. Use no 1º slide, para dividir partes da aula e no slide final. |
| `## Título` | Título de um slide comum. Todo slide comum começa com um. |
| `### Subtítulo` | Subtítulo menor, colorido, dentro de um slide. |
| Texto solto | Parágrafo. Linhas seguidas viram um parágrafo só; linha em branco separa parágrafos. |
| `- item` | Lista com marcadores, aparece inteira. |
| `1. item` | Lista numerada (passo a passo). |
| `+ item` | Lista REVELADA EM ETAPAS: cada item aparece quando o professor avança. Use para construir um raciocínio ou fazer suspense. |
| `- [ ] errada` / `- [x] certa` | PERGUNTA PARA A TURMA: alternativas em cartões (A, B, C, D). O professor revela a certa. Exatamente uma `[x]`. De 2 a 4 alternativas. |
| `> texto` | Caixa de destaque (dica, atenção, definição). |
| Bloco com três crases e a linguagem (ex.: ` ```js `) | Código com cores e botão Copiar. Linguagens: `js`, `html`, `css`, `python`, `sql`, `java`, `csharp`, `bash`, `json` etc. |
| `![legenda](https://...)` | Imagem centralizada com legenda. Só use URL completa de imagem que você tenha certeza que existe; na dúvida, não use imagem. |
| Tabela com `\|` | Tabela; a 1ª linha é o cabeçalho, a 2ª é `\|---\|---\|`. |
| `[cronômetro 15]` | Cronômetro grande de 15 minutos (troque o número). Use nos slides de prática. |
| Bloco de código com a linguagem `grade` (só `0`, `1` e espaços) | Desenho de pixels: ao avançar, os `0` somem e os `1` acendem, revelando a figura. No máximo 8 linhas. |
| `[qrcode https://link Legenda]` | QR Code grande para os alunos abrirem o link no celular. A legenda é opcional. |

Formatação dentro do texto: `**negrito**`, `*destaque*` (fica colorido), `` `código` ``, `==marca-texto==`, `[texto do link](https://...)`.

---

## 4. Limites de cada slide (MUITO IMPORTANTE)

O slide é uma tela fixa 16:9 SEM rolagem. O que passar do limite fica cortado na projeção. Por slide:

- 1 título (`##`) + no máximo **6 itens de lista** OU **2 parágrafos curtos**.
- Frases curtas: até ~12 palavras por item de lista. Slide não é apostila.
- Código: no máximo **14 linhas** e ~60 caracteres por linha.
- Tabela: no máximo **6 linhas** e **4 colunas**.
- Pergunta: enunciado de 1 linha + até 4 alternativas curtas.
- Slide com código, tabela, imagem ou QR Code: no máximo 1 parágrafo curto além dele.
- Cronômetro: título + 1 frase ou lista curta (até 3 itens) + o cronômetro.
- Uma ideia por slide. Se não couber, divida em dois slides.

---

## 5. Estrutura recomendada de uma aula (aula prática)

1. **Abertura** (`# Título da aula` + 1 linha de subtítulo).
2. **Objetivos**: "Hoje você vai..." com 3 a 4 itens (`+` para revelar um a um).
3. **Aquecimento**: 1 pergunta para a turma (`- [ ]`/`- [x]`) sobre o que já sabem.
4. **Conceito**: 2 a 4 slides curtos com o essencial para começar a prática (listas, destaque, um código de exemplo).
5. **Mão na massa**: slide com a tarefa em passos numerados + `[cronômetro N]`. Se a prática tiver etapas, um slide por etapa, cada um com seu cronômetro.
6. **Link/material**: se os alunos precisarem acessar algo, um slide com `[qrcode ...]`.
7. **Revisão**: 1 ou 2 perguntas para a turma sobre o que foi praticado.
8. **Conclusão**: "O que vimos hoje" com `+` (3 a 4 itens) e, se houver, o que vem na próxima aula.
9. **Encerramento**: `# Mensagem final curta` + 1 linha.

Total típico: 12 a 20 slides.

---

## 6. Regras de escrita

- Português do Brasil, linguagem direta, falando com o aluno ("você").
- Nada de parágrafos longos: prefira listas curtas.
- Exemplos de código devem funcionar de verdade e estar no nível da turma.
- Nas perguntas, as alternativas erradas devem ser plausíveis (erros comuns), não absurdas.
- Não invente links nem imagens. Use apenas links que o professor informar ou links oficiais de documentação.

---

## 7. Exemplo completo e válido

````markdown
---
aula: 1
data: 2026-10-05
titulo: Primeira página HTML
turma: 1º DS
descricao: Estrutura básica, títulos, parágrafos e links
---

# Primeira página HTML
Do zero ao navegador em uma aula

---

## Hoje você vai
+ Entender o que é HTML
+ Criar a estrutura básica de uma página
+ Usar títulos, parágrafos e links
+ Abrir sua página no navegador

---

## Aquecimento
O que o navegador faz com um arquivo `.html`?

- [ ] Compila e gera um programa
- [x] Lê as tags e desenha a página
- [ ] Envia o arquivo para um servidor
- [ ] Converte o texto em imagem

---

## Estrutura básica
```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <title>Minha página</title>
  </head>
  <body>
    <h1>Olá, mundo!</h1>
  </body>
</html>
```

---

## Mão na massa
1. Crie o arquivo `index.html`
2. Escreva a estrutura básica
3. Adicione um título, um parágrafo e um link
4. Abra o arquivo no navegador

[cronômetro 20]

---

## Revisão
Qual tag cria um link?

- [ ] `<link>`
- [x] `<a>`
- [ ] `<href>`

---

## O que vimos hoje
+ HTML descreve a estrutura da página
+ Toda página tem `head` e `body`
+ Títulos, parágrafos e links são tags

---

# Até a próxima aula!
Na próxima: CSS e cores
````
