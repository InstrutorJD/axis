---
titulo: Comentários e Documentação do Código
turma: 2º DS
---

# Comentários e Documentação
Código que você (e o time) entende daqui a seis meses

---

## Nesta aula você vai
+ Escrever comentários de linha e de bloco em JavaScript
+ Separar comentário útil de comentário inútil
+ Documentar funções com JSDoc
+ Usar marcadores como `TODO` e `FIXME`

---

## Aquecimento
Você abre um código do FinancApp escrito por outra pessoa e encontra isto:

```js
const t = v * 0.0035 * d;
```

+ O que é `t`? E `v` e `d`?
+ De onde veio esse `0.0035`?
+ Quanto tempo você perderia para descobrir?

---

## Os dois tipos de comentário
```js
// comentário de linha: vai até o fim da linha
let saldo = 0;

/*
  comentário de bloco:
  pode ocupar várias linhas
*/
```

> O JavaScript **ignora** tudo que está comentado. O comentário é escrito para **pessoas**, não para o computador.

---

## Pergunta
Você quer desativar por um momento a linha `enviarEmail(cliente);` para testar o resto. Qual forma faz isso?

- [ ] `<!-- enviarEmail(cliente); -->`, que é o comentário do JavaScript
- [x] `// enviarEmail(cliente);`, transformando a linha em comentário
- [ ] `# enviarEmail(cliente);`, que é o comentário usado no navegador
- [ ] `-- enviarEmail(cliente);`, que é o comentário de uma linha em JS

> Por quê: em JavaScript, `//` comenta até o fim da linha. `<!-- -->` é do HTML, `#` é de Python e `--` é de SQL.

---

## Pergunta
Você quer deixar no topo do arquivo um aviso de cinco linhas sobre como configurar o Supabase. Qual forma é a mais adequada?

- [ ] Cinco linhas `//` seguidas, uma para cada frase do aviso
- [x] Um comentário de bloco `/* ... */` envolvendo as cinco linhas
- [ ] Um `<!-- ... -->`, porque o aviso é longo demais para o JS
- [ ] Um texto solto sem marcação, que o JavaScript ignora sozinho

> Por quê: texto de várias linhas cabe num comentário de bloco. As `//` também funcionam, mas `/* */` agrupa o aviso. Texto sem marcação vira erro de sintaxe.
---

## O comentário certo explica o **porquê**
```js
// ruim: repete o código
// soma 1 no contador
contador = contador + 1;

// bom: explica a decisão
// o Supabase devolve a página 0 como a primeira,
// mas a tela mostra a partir da página 1
pagina = pagina + 1;
```

> O código já diz **o que** faz. O comentário vale quando conta **por que** foi feito assim.

---

## Pergunta
Qual destes comentários vale a pena manter no código?

- [ ] `// declara a variável total e começa ela com o valor zero`
- [ ] `// chama a função calcular passando o valor da transação`
- [x] `// arredonda pra cima: o banco cobra fração como dia inteiro`
- [ ] `// percorre o array de transações, uma de cada vez, com o forEach`

> Por quê: os outros três só repetem o que o código já mostra. O terceiro explica uma regra de negócio que ninguém adivinharia lendo o código.

---

## Comentário perigoso: o desatualizado
```js
// desconto de 10% para clientes novos
const desconto = valor * 0.15;
```

+ O código mudou, o comentário ficou para trás
+ Agora ele **mente** para quem lê
+ Mudou o código? Atualize ou apague o comentário

---

## Pergunta
Na revisão, você acha `// limite: 3 tentativas` logo acima de `const LIMITE = 5;`. O que fazer?

- [ ] Manter os dois, porque o comentário guarda o valor antigo
- [ ] Trocar o 5 por 3, porque o comentário sempre está certo
- [x] Descobrir a regra correta e deixar código e comentário iguais
- [ ] Apagar a constante e usar o número direto no código

> Por quê: código e comentário discordando é um bug esperando para acontecer. Confirme a regra e alinhe os dois.

---

## Nome bom diminui comentário
```js
// antes: precisa de comentário
const t = v * 0.0035 * d; // taxa diária vezes dias

// depois: o nome explica sozinho
const TAXA_DIARIA = 0.0035;
const juros = valor * TAXA_DIARIA * dias;
```

> Antes de comentar um código confuso, tente **deixá-lo claro**: nomes descritivos e constantes com nome.

---

## Pergunta
Uma função tem a linha `if (x > 18)` e um comentário `// maior de idade`. Qual a melhor melhoria?

- [ ] Aumentar o comentário explicando o que é maior de idade
- [ ] Trocar o comentário de linha por um comentário de bloco
- [x] Criar `const IDADE_MINIMA = 18` e usar nomes claros no `if`
- [ ] Apagar o comentário, porque comentário é sempre ruim

> Por quê: com constante e nome claro, o código explica a si mesmo. Comentário não é ruim, mas não deve tapar um código confuso.

---

## JSDoc: documentando funções
```js
/**
 * Calcula o saldo a partir das transações.
 * @param {Array} transacoes - lista com valor e tipo
 * @returns {number} saldo final em reais
 */
function calcularSaldo(transacoes) {
  // ...
}
```

- Começa com `/**` e fica **logo acima** da função
- `@param`: cada parâmetro, com tipo e descrição
- `@returns`: o que a função devolve

---

## Pergunta
O VS Code mostra a descrição da sua função quando alguém passa o mouse sobre ela. O que você escreveu?

- [ ] Um comentário `//` dentro do corpo da função
- [x] Um bloco `/** ... */` com JSDoc logo acima da função
- [ ] Um comentário de bloco `/* ... */` no final do arquivo
- [ ] Um arquivo README.md na pasta do projeto

> Por quê: editores leem o JSDoc que fica logo acima da função e mostram a descrição, os parâmetros e o retorno.

---

## Pergunta
A função `buscarTransacoes(mes, ano)` devolve uma lista. Qual JSDoc descreve isso direito?

- [ ] `@param {Array} mes`, `@param {Array} ano` e `@returns {number}`
- [ ] `@returns {number} mes`, `@returns {number} ano` e `@param {Array}`
- [x] `@param {number} mes`, `@param {number} ano` e `@returns {Array}`
- [ ] `@param {Array} lista`, `@param {number} mes` e `@returns {number}`

> Por quê: cada entrada vira um `@param` com seu tipo, e o que sai da função vira um único `@returns`, aqui uma lista (Array).

---

## Marcadores: TODO e FIXME
```js
// TODO: mostrar o total por categoria
// FIXME: dá erro quando a lista está vazia
```

- `TODO`: algo que **ainda falta fazer**
- `FIXME`: algo que **está quebrado** e precisa de correção
- Muitos editores listam todos os marcadores do projeto

---

## Pergunta
Você notou que o gráfico do FinancApp quebra com valores negativos, mas não dá tempo de corrigir hoje. O que deixar no código?

- [ ] `// TODO: criar o gráfico de despesas do mês`
- [x] `// FIXME: gráfico quebra com valores negativos`
- [ ] `// gráfico de despesas e receitas do usuário`
- [ ] `/** @returns {Array} valores do gráfico */`

> Por quê: é um defeito conhecido, então o marcador certo é `FIXME`, descrevendo o que quebra. `TODO` é para algo que ainda nem foi feito.

---

## Pergunta
O cliente pediu exportar as transações em PDF, mas isso fica para a próxima semana. O que deixar no lugar onde a função vai entrar?

- [x] `// TODO: exportar transações em PDF (pedido do cliente)`
- [ ] `// FIXME: exportar transações em PDF está quebrado no app`
- [ ] `/** @returns {PDF} arquivo com as transações do mês */`
- [ ] `// exporta as transações do usuário para um arquivo PDF`

> Por quê: é algo que ainda não existe, então o marcador é `TODO`. `FIXME` indicaria um defeito, e as outras opções descrevem uma função que não foi escrita.
---

## O que vimos
+ `//` comenta uma linha; `/* */` comenta um bloco
+ Bom comentário explica o **porquê**, não repete o código
+ Comentário desatualizado é pior que nenhum
+ JSDoc documenta funções; `TODO` e `FIXME` marcam pendências

---

# Hora da prática!
Abra **"Prática — Revisão de Comentários"** e revise o código do FinancApp
