---
aula: 3
data: 2026-10-02
titulo: Do papel para a tela: HTML, CSS e JavaScript
turma: IA
descricao: Fim da Aula 2 (git e webhook), o primeiro contato com JavaScript no PixelCode e a tela do checklist com o Copilot
fonte: grande
---

# Do papel para a tela
Aula 3: o checklist ganha estrutura, aparência e comportamento

---

## Que tela é esta?
+ O operador escolhe o **CAM-07**
+ Marca cada item: **Conforme** ou **Não conforme**
+ Os **Freios** ficaram não conforme
+ Ele toca em **Finalizar**...
+ ... e a tela responde: ⛔ **INAPTO**. Quem decidiu isso?

---

## A resposta de hoje
+ Por trás dessa tela, existem **três linguagens** trabalhando juntas
+ Uma diz **o que existe** na tela, outra diz **como parece**
+ E a terceira **decide** e **reage** ao clique
+ Hoje você escreve o seu **primeiro programa** e depois monta a tela com o **Copilot**

---

## Roteiro de hoje (1/2)
- **Abertura**: a tela do checklist (5 min)
- **Parte 1**: o nosso repositório: Codespace, terminal e git (30 min)
- **Parte 2**: além do pedido e resposta: webhook, upload, streaming (10 min)
- **Parte 3**: JavaScript no PixelCode, um tema por vez + desafio final (75 min)
- ☕ **Intervalo** (20 min)

As Partes 1 e 2 são o que ficou da **Aula 2**.

---

## Roteiro de hoje (2/2)
- **Parte 4**: o checklist no Codespace e a tela com o Copilot (90 min)
- **Fechamento**: revisão (10 min)

JavaScript no **PixelCode** (só o navegador); depois, tudo vai para o **Codespace**.

---

# Parte 1 — O nosso repositório
Conta, Codespace, terminal e git

---

## Criando conta e repositório
1. Crie a sua conta em **github.com** (use um e-mail que você acessa)
2. Clique em **New repository**
3. Nome: `checklist-inspecao`, marque **Public**
4. Marque **Add a README file** e clique em **Create repository**

---

## O que é o Codespace?
+ Um **computador Linux na nuvem**, criado a partir do seu repositório
+ Abre no **navegador**: editor (o VS Code), terminal e arquivos
+ Nada é instalado no seu PC: ele só **mostra a tela** do computador lá longe
+ Os arquivos ficam na nuvem; quem leva para o GitHub é o **push**
+ Desligou? Ele **dorme** e guarda os arquivos até você voltar

---

## Vantagens x desvantagens
| Vantagens | Desvantagens |
|---|---|
| Zero instalação: qualquer PC com navegador | Precisa de **internet** o tempo todo |
| Mesmo ambiente para a turma toda | Grátis tem **limite**: 60 h por mês |
| Abre de qualquer lugar, até de casa | Parado **30 dias** sem uso, é apagado |
| Já vem com git, Python e Node | Sem **push**, o trabalho fica só nele |

---

## Quando usar (e quando não)
| Cenário | Codespace? |
|---|---|
| Laboratório onde não dá para instalar nada | ✅ Ideal |
| Estudar em casa, num PC fraco ou emprestado | ✅ Sim |
| Projeto grande, usado o dia inteiro | ⚠️ Gasta as horas grátis rápido |
| Sem internet, ou internet muito ruim | ❌ Instale o VS Code no PC |

Na mina: o técnico corrige o sistema de **qualquer** computador, sem instalar nada.

---

## Abrindo o Codespace
1. No repositório, clique no botão verde **Code**
2. Abra a aba **Codespaces**
3. Clique em **Create codespace on main**
4. Espere: um editor completo abre no navegador

> Grátis: até **60 horas por mês**. Ele desliga sozinho após **30 min** parado.

---

## Economizando as horas grátis
1. Terminou? **commit** e **push** antes de tudo
2. Depois, em **github.com/codespaces**: **⋯** → **Stop codespace**
3. Esqueceu? Ele para sozinho depois de **30 min** sem uso
4. Para voltar: **Code** → **Codespaces** → clique no seu codespace

> Parado, ele **não gasta horas**, só um pouco do espaço grátis (15 GB por mês).

---

## Terminal: pastas e arquivos
```bash
pwd              # em qual pasta estou?
ls               # o que tem aqui?
mkdir docs       # cria a pasta docs
cd docs          # entra nela / cd .. volta uma
touch teste.txt  # cria um arquivo vazio
rm teste.txt     # apaga o arquivo
rm -r docs       # apaga a pasta e tudo que tem nela
```

O terminal fica embaixo, no Codespace. **Cuidado:** `rm` não tem lixeira, apagou, sumiu.

---

## Mão na massa: terminal
1. Descubra em qual pasta você está com `pwd`
2. Liste os arquivos com `ls`: o `README.md` está aí?
3. Crie a pasta `docs`, entre nela e volte com `cd ..`
4. Crie `teste.txt` com `touch`, veja com `ls` e apague com `rm`
5. Apague a pasta com `rm -r docs`: o `ls` ainda mostra ela?

> Dica: a tecla **↑** repete o último comando. **Tab** completa o nome.

---

## Git: a máquina do tempo
+ **commit**: tira uma "foto" do projeto, com uma mensagem
+ **push**: envia as suas fotos para o GitHub
+ **pull**: traz do GitHub o que mudou lá
+ Cada commit fica no histórico, igual ao que você viu na Aula 2

---

## Os comandos do dia a dia
```bash
git status                 # o que mudou?
git add README.md          # escolhe o que vai
git commit -m "Requisitos" # tira a foto
git push                   # envia para o GitHub
```

Sem `git add`, o arquivo **não entra** no commit.

---

## Markdown em 1 minuto
```markdown
# Checklist de Inspeção
## Requisitos
| ID | Requisito | Prioridade |
|---|---|---|
| RF01 | O sistema deve registrar... | Alta |
**negrito** e `código`
```

O **README.md** é a vitrine: é o que aparece primeiro no GitHub.

---

## Modelo do README.md
```markdown
# Checklist de Inspeção
## Mapa do sistema
Celular (frontend) → API → Backend → Banco de dados
## Requisitos
(cole aqui a tabela que o ChatGPT devolveu)
```

O **mapa** são as 4 peças da Aula 1, na ordem em que a inspeção passa.

---

## Mão na massa: primeiro commit
1. No ChatGPT, abra o projeto da Aula 2 e **copie** a tabela de requisitos
2. Monte o `README.md` como no **modelo**: o mapa e, embaixo, a tabela
3. Salve com `Ctrl + S` e rode `git status`
4. `git add README.md` e `git commit -m "Requisitos"`
5. `git push` e veja a **tabela** pronta no GitHub

> Apareceu lá? Abra os **commits** e ache a sua foto.

---

## Mão na massa: o caminho de volta
1. No **site** do GitHub, abra o `README.md` e clique no **lápis** ✏️
2. Acrescente a linha `Equipe: <seu nome>` e clique em **Commit changes**
3. Volte ao Codespace: o README ainda **não** mudou
4. Rode `git pull`: agora mudou!

---

## Push recusado?
Se o GitHub tem algo que o Codespace ainda não tem, o `git push` é **recusado**.

1. Rode `git pull --rebase` para trazer o que falta
2. Rode `git push` de novo

> Regra de ouro: **pull antes de push**.

---

## Qual comando?
Você mudou o README no Codespace e quer que a mudança apareça no GitHub.

- [ ] `git pull`
- [ ] `git status`
- [x] `git add`, `git commit` e `git push`
- [ ] `ls`

---

# Parte 2 — Além do pedido e resposta
Webhook, upload e streaming

---

## Quando o servidor precisa avisar
+ Até agora, **você** sempre perguntou e o servidor respondeu
+ Mas e quando um freio é reprovado às 3h da manhã?
+ A manutenção precisa saber **na hora**, sem ficar perguntando
+ Dois jeitos de resolver: **polling** ou **webhook**

---

## Polling x webhook
| | Polling | Webhook |
|---|---|---|
| Quem pergunta? | A manutenção, toda hora | Ninguém: o sistema avisa |
| Pedidos | Muitos, quase todos "nada novo" | Um só, quando acontece |
| Atraso | Até a próxima pergunta | Na hora |
| No dia a dia | Ligar toda hora: "chegou?" | O entregador toca a campainha |

---

## Por dentro de um webhook
+ É só um **POST**, o método de enviar dados da Aula 1
+ Quem **envia**: o sistema onde algo aconteceu (o checklist)
+ Quem **recebe**: o sistema que precisa saber (o da manutenção)
+ A manutenção cadastra o endereço dela **uma vez** no checklist
+ O corpo é um **JSON** contando o que aconteceu

---

## O aviso do freio reprovado
```json
{
  "evento": "item_reprovado",
  "equipamento": "CAM-07",
  "item": "Freios",
  "operador": "Ana",
  "hora": "2026-10-01T03:12:00"
}
```

O checklist faz um **POST** com isso para o endereço da manutenção.

---

## Webhook de verdade: o GitHub
+ Todo repositório pode cadastrar webhooks em **Settings → Webhooks**
+ A cada `git push`, o GitHub faz um **POST** para o endereço cadastrado
+ O cabeçalho `X-GitHub-Event` diz o que aconteceu: `push`, `ping`...
+ O corpo em **JSON** traz o repositório, quem fez o push e os commits
+ É assim que robôs de teste e de publicação sabem que o código mudou

---

## Qual recurso?
A manutenção precisa ser avisada na hora em que um freio é reprovado.

- [ ] Upload de arquivo
- [ ] Streaming
- [x] Webhook
- [ ] Polling

---

## Upload: enviando um arquivo
+ Foto de avaria não é texto: vai como **arquivo**
+ O formato muda: `multipart/form-data`, os dados em **partes**
+ Na página, é o `<input type="file">`; no `curl`, a opção `-F`
+ O servidor guarda a foto e devolve o **endereço** dela

---

## Qual recurso?
O operador quer anexar à inspeção a foto de uma mangueira rachada.

- [x] Upload de arquivo
- [ ] Streaming
- [ ] Webhook
- [ ] `DELETE`

---

## Streaming: a resposta em pedaços
+ Normal: o servidor **monta tudo** e só depois envia
+ Streaming: ele envia **aos poucos**, enquanto ainda está gerando
+ Vídeo e música tocam enquanto ainda estão baixando
+ O ChatGPT da Aula 2 escreve palavra por palavra: é streaming

---

## Qual recurso?
O relatório de turno aparece palavra por palavra enquanto a IA escreve.

- [ ] Upload de arquivo
- [ ] Webhook
- [x] Streaming
- [ ] Polling

---

# Parte 3 — JavaScript: a lógica da inspeção
O seu primeiro contato com programação

---

## Uma tela, três linguagens
| Linguagem | Papel | No checklist |
|---|---|---|
| **HTML** | Estrutura: **o que existe** | Itens e o botão Finalizar |
| **CSS** | Apresentação: **como parece** | Letra grande, verde e vermelho |
| **JavaScript** | Comportamento: **o que faz** | Clicou → apto ou inapto |

Hoje o foco é o **JavaScript**. HTML e CSS: só o básico para reconhecer.

---

## A tela sem roupa
1. Abra o checklist da Aula 1 e aperte **F12**
2. Aba **Elementos**: apague a linha `<link rel="stylesheet">`
3. O que sobrou? A estrutura **sem roupa**
4. Dê **F5**: tudo volta, porque o arquivo não mudou

[Abrir o checklist da Aula 1](https://instrutorjd.github.io/axis/materiais/checklist/)

---

## Qual camada?
O botão **Finalizar** ficou grande e laranja, fácil de tocar com luva. Quem fez isso?

- [ ] HTML
- [x] CSS
- [ ] JavaScript
- [ ] O servidor

---

## HTML e CSS em 1 minuto
+ **HTML**: as peças: `<select>`, `<input>`, `<button>`
+ O `id` é o **nome** que o JavaScript usa para achar a peça
+ **CSS**: cor, tamanho e espaço; o `@media` ajeita o celular
+ Na Parte 4, a IA escreve os dois: você só **reconhece**
+ Quem decide **apto ou inapto** é o JavaScript

---

## Como os 3 arquivos se ligam
```html
<head>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  ... a tela ...
  <script src="script.js"></script>
</body>
```

O script fica no **fim**: só roda depois que a tela existe.

---

## O que é programar?
+ Lembra do **algoritmo** da Aula 1? Passos claros, em ordem
+ Programar é escrever esses passos numa **linguagem** que o computador entende
+ O JavaScript roda no **navegador**, sem instalar nada
+ Hoje: a regra da inspeção, **um tema por vez**, no PixelCode
+ Errar faz parte: o computador **avisa** onde errou

---

## Seu laboratório: o PixelCode
[qrcode https://tinyurl.com/pixelcode-jd tinyurl.com/pixelcode-jd]

---

## Um arquivo por tema
1. No topo, clique em **Só JavaScript**
2. Em **Arquivos**, clique no **＋**, digite o nome e **Enter**
3. Digite o exemplo do slide; as **sugestões** ajudam
4. **Ctrl + Enter** (ou **▶ Executar**) roda o arquivo aberto
5. O resultado aparece no **Console**, à direita

> Cada exemplo diz o nome do arquivo. Tudo salva **sozinho**.

---

## console.log: o programa fala
+ `console.log(...)` mostra no **Console** o que está entre parênteses
+ **Texto** vai entre aspas: `'CAM-07'`
+ **Número** vai sem aspas, e dá para fazer conta: `3 + 2`
+ Cada `console.log` vira **uma linha** no Console

---

## Exemplo: console.log
```js
console.log('Inspeção iniciada')
console.log('CAM-07')
console.log(3 + 2)
```

Arquivo `saida.js`. Rode e confira: saíram **3 linhas**?

---

## 🎯 Desafio: o cabeçalho
Contexto: toda folha de inspeção começa com um cabeçalho.

1. Embaixo, mostre `Checklist de Inspeção`
2. Mostre a data de hoje, entre aspas
3. Mostre o total de itens: **3** críticos **+ 2** comuns

---

## Variável: uma caixa com nome
+ Guarda um valor para usar depois, pelo **nome**
+ `const`: o valor **não muda** · `let`: o valor **pode mudar**
+ O `=` **guarda** o valor na caixa
+ O `+` **junta** textos e variáveis

---

## Os tipos de valor
| Tipo | Exemplo | Na inspeção |
|---|---|---|
| Texto | `const operador = 'Ana'` | O nome de quem inspeciona |
| Número | `let horimetro = 1250` | As horas do caminhão |
| Booleano | `const critico = true` | O item é crítico? |

Lembra do JSON? `'7'` com aspas é **texto**; `7` sem aspas é **número**.

---

## Exemplo: variáveis
```js
const equipamento = 'CAM-07'
const operador = 'Ana'
let resultado = 'APTO'
resultado = 'INAPTO'
console.log(operador + ' inspecionou o ' + equipamento)
console.log(resultado)
```

Arquivo `variaveis.js`. O `resultado` mudou porque é `let`.

---

## 🎯 Desafio: a ficha do turno
Contexto: o supervisor quer saber o **turno** e as **horas** do caminhão.

1. Crie `const turno = 'A'`, logo abaixo do `operador`
2. Mude a frase para: `Ana inspecionou o CAM-07 no turno A`
3. No fim, crie `let horimetro = 1250`
4. Some as 8 horas: `horimetro = horimetro + 8` e mostre

---

## Qual declaração?
O resultado começa **APTO** e pode virar **INAPTO** durante a avaliação.

- [ ] `const resultado = 'APTO'`
- [x] `let resultado = 'APTO'`
- [ ] `resultado === 'APTO'`
- [ ] `'resultado' = 'APTO'`

---

## Condição: se... senão
```js
if (condição) {
  // roda se for verdade
} else {
  // roda se for mentira
}
```

O `else` é opcional. As chaves `{ }` marcam o que pertence a cada caminho.

---

## Comparando valores
| Sinal | Pergunta | Exemplo |
|---|---|---|
| `===` | É igual? | `freios === 'conforme'` |
| `!==` | É diferente? | `freios !== 'conforme'` |
| `<` e `>` | É menor? É maior? | `combustivel < 25` |

> `=` **guarda**, `===` **compara**. Trocar um pelo outro é o erro nº 1.

---

## Exemplo: condição
```js
const freios = 'não conforme'
if (freios === 'não conforme') {
  console.log('INAPTO: não pode operar')
} else {
  console.log('APTO para o turno')
}
```

Arquivo `condicao.js`. Troque para `'conforme'` e rode de novo.

---

## 🎯 Desafio: o tanque
Contexto: caminhão com pouco diesel **não começa** o turno.

1. Embaixo, crie `let combustivel = 18`
2. Se `combustivel < 25`, mostre `Abastecer antes do turno`
3. Senão, mostre `Combustível ok`
4. Teste com **18** e com **90**

---

## E e OU: duas condições
+ `&&` = **e**: as **duas** precisam ser verdade
+ `||` = **ou**: basta **uma** ser verdade
+ Item crítico **e** não conforme → INAPTO
+ Noite **ou** neblina → conferir os faróis

---

## Tabela verdade do `&&`
| Item crítico? | Não conforme? | `critico && naoConforme` |
|---|---|---|
| `true` | `true` | `true` → ⛔ **INAPTO** |
| `true` | `false` | `false` → APTO |
| `false` | `true` | `false` → APTO |
| `false` | `false` | `false` → APTO |

O `&&` só dá `true` numa linha: as **duas** verdadeiras.

---

## Exemplo: E e OU
```js
const critico = true
const conforme = false
if (critico && conforme === false) {
  console.log('INAPTO')
} else {
  console.log('APTO')
}
```

Arquivo `e-ou.js`. Troque `critico` para `false`: virou APTO?

---

## 🎯 Desafio: os faróis
Contexto: à noite **ou** com neblina, os faróis precisam ser conferidos.

1. Embaixo, crie `const noite = true` e `const neblina = false`
2. Se `noite || neblina`, mostre `Conferir faróis`
3. Troque os dois para `false`: a mensagem sumiu?

---

## Apto ou inapto?
Freios e Pneus conformes, **Limpeza da cabine** não conforme. Qual o resultado?

- [x] APTO: limpeza não é item crítico
- [ ] INAPTO: um item ficou não conforme
- [ ] Nenhum: o botão não foi clicado
- [ ] INAPTO: todos precisam estar conformes

---

## Lista: vários valores juntos
+ Entre **colchetes**, separados por vírgula: `['Freios', 'Pneus']`
+ `itens[0]`: o **1º** item (a contagem começa em **0**)
+ `itens.length`: **quantos** itens a lista tem
+ `itens.push('Extintor')`: acrescenta no **fim**

---

## Exemplo: lista
```js
const itens = ['Freios', 'Pneus', 'Cinto']
console.log(itens[0])
console.log(itens.length)
itens.push('Extintor')
console.log(itens.length)
```

Arquivo `listas.js`. Antes do `push`, 3 itens; depois, 4.

---

## 🎯 Desafio: a lista do caminhão
Contexto: o checklist do CAM-07 tem **5** itens.

1. Troque a lista por: Freios, Pneus, Cinto, Limpeza e Combustível
2. Apague as linhas do `push`
3. Mostre o último item: `itens[4]`

---

## Laço for...of: um por um
```js
for (const item of lista) {
  // roda uma vez para cada item
}
```

3 itens = **3 voltas**. A cada volta, `item` é o item da vez.

---

## Exemplo: laço
```js
const itens = ['Freios', 'Pneus', 'Cinto']
for (const item of itens) {
  console.log('Conferir: ' + item)
}
```

Arquivo `laco.js`. Saíram 3 linhas, uma por item?

---

## 🎯 Desafio: conferido!
Contexto: depois de conferir, o operador marca **OK** em cada item.

1. Troque a lista pelos **5** itens do CAM-07
2. Em vez de `'Conferir: '`, mostre `'OK '` na frente
3. Rode: saíram **5** linhas?

---

## Objeto: o item com detalhes
+ As chaves `{ }` juntam vários dados de **uma** coisa
+ Como no JSON da Aula 2: `nome: valor`
+ `item.nome`, `item.critico`: pega um dado pelo **ponto**
+ Uma lista de objetos é o **checklist inteiro**

---

## Exemplo: lista de objetos
```js
const itens = [
  { nome: 'Freios', critico: true, conforme: true },
  { nome: 'Limpeza', critico: false, conforme: false },
]
for (const item of itens) {
  console.log(item.nome + ': ' + item.conforme)
}
```

Arquivo `objetos.js`.

---

## 🎯 Desafio: só os críticos
Contexto: o supervisor quer ver primeiro o que pode **parar** o caminhão.

1. Acrescente os **Pneus** na lista: crítico e conforme
2. Dentro do `for`, ponha a linha do `console.log` dentro de um `if (item.critico)`
3. Rode: só Freios e Pneus aparecem?

---

## Função: a receita com nome
```js
function nome(oQueRecebe) {
  // faz o trabalho
  return oQueDevolve
}
```

Cria **uma vez** e chama quantas vezes quiser: `nome(valor)`.

---

## Exemplo: função (1/2)
```js
function avaliarInspecao(itens) {
  for (const item of itens) {
    if (item.critico && item.conforme === false) {
      return 'INAPTO'
    }
  }
  return 'APTO'
}
```

---

## Exemplo: função (2/2)
```js
const itens = [
  { nome: 'Freios', critico: true, conforme: false },
  { nome: 'Limpeza', critico: false, conforme: true },
]
console.log(avaliarInspecao(itens))
```

Arquivo `funcao.js`: os dois slides, nesta ordem. Deu INAPTO?

---

## Entendendo a função
| Linha | O que faz |
|---|---|
| `for (const item of itens)` | Passa por **cada** item da lista |
| `if (item.critico && ...)` | É crítico **e** não está conforme? |
| `return 'INAPTO'` | Achou um: devolve e **para** |
| `return 'APTO'` | Passou por todos e nenhum falhou |

---

## 🎯 Desafio: a mensagem
Contexto: o operador quer uma **frase clara**, não só "INAPTO".

1. Embaixo, crie `function mensagem(resultado) { }`
2. Dentro: se `resultado === 'APTO'`, `return 'Liberado para o turno'`
3. Senão, `return 'Procure a manutenção'`
4. Mostre: `console.log(mensagem(avaliarInspecao(itens)))`

---

## Evento: quando o operador toca
+ `document.querySelector('#finalizar')`: acha na tela a peça com esse `id`
+ `addEventListener('click', ...)`: "**quando clicar**, faça isto"
+ `saida.textContent = ...`: escreve no parágrafo
+ Sem clique, **nada** acontece: o código fica esperando
+ No PixelCode, é o modo **Página web**

---

## Exemplo: evento (1/2)
```html
<h1>Inspeção do CAM-07</h1>
<button id="finalizar">Finalizar</button>
<p id="resultado"></p>
```

Modo **Página web**, `index.html`: troque o miolo do `<body>` por isto.

---

## Exemplo: evento (2/2)
```js
const botao = document.querySelector('#finalizar')
const saida = document.querySelector('#resultado')
botao.addEventListener('click', () => {
  saida.textContent = 'Inspeção finalizada!'
})
```

No `script.js`: apague tudo e digite isto. Clique em **Finalizar**.

---

## 🎯 Desafio: o botão Limpar
Contexto: o operador errou e quer **recomeçar**.

1. No `index.html`, crie `<button id="limpar">Limpar</button>`
2. No `script.js`, pegue o botão: `querySelector('#limpar')`
3. No clique dele, escreva `''` (nada) na `saida`
4. Teste: Finalizar escreve, Limpar apaga?

---

## Qual peça?
O que faz o código rodar quando o operador **toca** em Finalizar?

- [ ] A variável `resultado`
- [ ] A lista `itens`
- [x] O evento de clique no Finalizar
- [ ] O `@media` do CSS

---

## Quando dá erro
| O Console diz | O que aconteceu |
|---|---|
| `resultdo is not defined` | Nome escrito **diferente** |
| `Assignment to constant variable` | Tentou mudar uma `const` |
| `Unexpected end of input` | Faltou fechar uma `}` ou `)` |
| `Invalid or unexpected token` | Faltou uma aspa |
| `Cannot read properties of null` | O `id` não existe no HTML |

O erro mostra **(arquivo, linha)**: clique nele e o PixelCode leva até lá.

---

## Comentários no código
```text
<!-- HTML: a lista de itens da inspeção -->
/* CSS: botão largo para tocar com luva */
// JS: confere cada item da lista
```

O computador **ignora** os comentários: eles são para **pessoas**.

---

## Comentário bom x ruim
- ✗ `// função` (só repete o que já está escrito)
- ✗ `// isso aqui faz coisas`
- ✓ `// se um item crítico falhar, o equipamento não sai`
- ✓ `// botão largo: o operador usa luva`

> Bom comentário diz **para que serve** e **por quê**, com as **suas** palavras.

---

## As 5 peças da lógica
| Peça | No checklist |
|---|---|
| **Variável** | `resultado`: guarda APTO ou INAPTO |
| **Lista** | `itens`: os itens do checklist |
| **Condição** | Item crítico não conforme → **INAPTO** |
| **Função** | `avaliarInspecao()`: avalia a inspeção |

E a 5ª: o **evento**, o clique em **Finalizar** que põe tudo para rodar.

---

## 🏁 Desafio final: o checklist
Contexto: tudo num programa só, no arquivo `checklist.js`.

1. Monte a lista `itens` com os 5 itens (3 críticos)
2. Com o `for`, mostre `OK` ou `FALHOU` antes de cada nome
3. Crie a função `avaliarInspecao(itens)`
4. Crie `equipamento` e `operador` e mostre o resultado
5. Teste: tudo ok, Limpeza falhando, Freios falhando

> Por fim, **comente** cada parte com as suas palavras.

---

## 🧩 Referência: final (1/4)
```js
const itens = [
  { nome: 'Freios', critico: true, conforme: true },
  { nome: 'Pneus', critico: true, conforme: true },
  { nome: 'Cinto', critico: true, conforme: true },
  { nome: 'Limpeza', critico: false, conforme: false },
  { nome: 'Combustível', critico: false, conforme: true },
]
```

Só a **Limpeza** está falhando. Depois, faça os Freios falharem.

---

## 🧩 Referência: final (2/4)
```js
for (const item of itens) {
  if (item.conforme) {
    console.log('OK ' + item.nome)
  } else {
    console.log('FALHOU ' + item.nome)
  }
}
```

---

## 🧩 Referência: final (3/4)
```js
function avaliarInspecao(itens) {
  for (const item of itens) {
    if (item.critico && item.conforme === false) {
      return 'INAPTO'
    }
  }
  return 'APTO'
}
```

---

## 🧩 Referência: final (4/4)
```js
const equipamento = 'CAM-07'
const operador = 'Ana'
const resultado = avaliarInspecao(itens)
console.log(operador + ' inspecionou o ' + equipamento)
console.log('Resultado: ' + resultado)
```

Limpeza falhando: **APTO**. Freios falhando: **INAPTO**.

---

# ☕ Intervalo: 20 min
Na volta: o checklist vai para o **Codespace** e ganha tela com o **Copilot**

---

# Parte 4 — A tela do checklist
Com o Copilot, um arquivo por vez

---

## Do PixelCode para o Codespace
1. No PixelCode, no `checklist.js`: **Ctrl + A** e **Ctrl + C**
2. No Codespace: **Novo arquivo** (📄+) → `checklist.js`
3. Cole com **Ctrl + V** e salve com **Ctrl + S**
4. No terminal: `node checklist.js`. Mesma saída?
5. `git add checklist.js`, commit e push

> O PixelCode guarda só **neste navegador**; o GitHub guarda de verdade.

---

## O que vai ser observado
+ A sua tela calcula **certo** o APTO e o INAPTO?
+ Você **explicou**, em comentários, o código que a IA gerou?
+ Não é sobre a tela mais bonita: é sobre **funcionar** e **entender**

---

## O plano: um arquivo por vez
1. `index.html`: pede, revisa, abre no navegador
2. `style.css`: pede, revisa, testa no modo celular
3. `script.js`: pede, revisa, testa apto e inapto
4. Comenta os 3 arquivos com as **suas** palavras
5. Commit e push a cada arquivo pronto

> Tudo de uma vez = um monte de código que ninguém revisou.

---

## Copilot Free: o que você tem
+ **Sugestões** enquanto você digita: 2.000 por mês
+ **Chat** para pedir e perguntar: **50 mensagens por mês**
+ Hoje: **3** mensagens para os arquivos e o resto para correções
+ Um bom prompt economiza mensagens

---

## Ativando o Copilot
1. No Codespace, abra **Extensões** na barra lateral
2. Procure **GitHub Copilot** e instale, se ainda não estiver
3. Entre com a sua conta do GitHub quando ele pedir
4. Abra o **chat do Copilot** pelo ícone dele no topo

---

## Prompt claro: 3 partes
| Parte | Pergunta | Exemplo |
|---|---|---|
| **Contexto** | Onde estou? | Checklist de inspeção, no celular |
| **Tarefa** | O que eu quero? | Crie **só** o `index.html` |
| **Formato** | Como quero? | Sem comentários: eu comento |

No chat, `#index.html` mostra ao Copilot o arquivo que já existe.

---

## Copie os prompts
[qrcode https://instrutorjd.github.io/axis/materiais/prompts-checklist/ instrutorjd.github.io/axis/materiais/prompts-checklist]

Abra **no computador**, numa aba ao lado do Codespace. Cada prompt tem o seu botão **Copiar**.

---

## Mão na massa: index.html
1. Cole o **prompt 1** no chat do Copilot
2. Repare: a resposta aparece **aos poucos**. É o **streaming** da Parte 2!
3. Leia o arquivo antes de clicar em **Manter** (*Keep*)
4. Ache o `select`, os rádios e o `id` do botão e do resultado
5. Os `name` estão **sem acento**? Tem o link do CSS e do JS?

---

## Rodando no Codespace
```bash
python3 -m http.server 8000
```

+ Aparece um aviso: clique em **Abrir no navegador** (*Open in Browser*)
+ Perdeu o aviso? Aba **Portas** (*Ports*), porta `8000`, ícone 🌐
+ Mudou o código? Salve e dê **F5** na página
+ **Ctrl + C** no terminal desliga o servidor

---

## Mão na massa: style.css
1. Cole o **prompt 2** no chat e revise antes de **Manter**
2. Dê **F5** na página: ela ganhou roupa?
3. **F12** → **Ctrl + Shift + M**: escolha um celular
4. Dá para tocar nas opções sem errar? A letra está legível?
5. Ficou bom? `git add .`, `git commit -m "Tela e estilo"` e `git push`

---

## Mão na massa: script.js
1. Cole o **prompt 3** no chat e revise antes de **Manter**
2. Ache as **5 peças**: variável, lista, função, condição e evento
3. Compare com o **seu** `checklist.js`: o que ficou parecido? O que é novo?
4. Os nomes da lista batem com os `name` dos rádios do HTML?
5. **F5**, **F12** → **Console** aberto, e faça os testes do próximo slide

---

## Testes: a tela calcula certo?
| Você marca | A tela deve mostrar |
|---|---|
| Tudo conforme | ✅ **APTO** |
| Só a Limpeza não conforme | ✅ **APTO** |
| Freios não conforme | ⛔ **INAPTO** |
| Faltou um item ou o equipamento | Um **aviso** para completar |

Errou algum? Ainda não está pronto.

---

## Lendo o Console
| Erro (em vermelho) | Causa provável |
|---|---|
| `... is not defined` | Nome escrito diferente, ou não existe |
| `Cannot read properties of null` | O `id` não existe no HTML |
| `404` no `script.js` | Nome do arquivo errado no HTML |

À direita do erro: **arquivo:linha**. Clique e ele mostra **onde** está.

---

## Pedindo a correção ao Copilot
1. Leia o erro e clique em **arquivo:linha**
2. Tente entender **sozinho** primeiro: é nome? É `id`?
3. Não achou? Use o **prompt de correção** da página
4. Cole a frase **exata** do erro e diga o que você fez
5. Revise a mudança: ele mexeu **só** no necessário?

---

## Mão na massa: comente o código
1. `index.html`: um comentário por **bloco** (equipamento, itens, botão)
2. `style.css`: diga **por que** cada regra importante existe
3. `script.js`: comente as **5 peças** com as suas palavras
4. Travou numa linha? Pergunte ao Copilot, mas **escreva você**
5. `git add .`, `git commit -m "Checklist comentado"` e `git push`

---

## GitHub Pages: no celular de verdade
+ O GitHub **publica de graça** os arquivos de um repositório público
+ Ele abre o `index.html` da raiz: por isso o nome importa
+ Endereço: `seu-usuario.github.io/checklist-inspecao`
+ Cada `git push` **atualiza** o site em cerca de 1 minuto

---

## Ativando o Pages
1. No site do GitHub, abra o repositório e clique em **Settings**
2. No menu da esquerda, clique em **Pages**
3. Em **Source**, escolha **Deploy from a branch**
4. Em **Branch**, escolha `main` e a pasta `/ (root)` → **Save**
5. Espere ~1 min e atualize: o endereço aparece no topo (**Visit site**)

---

## Mão na massa: teste no celular
1. Abra o endereço do Pages no **seu celular**
2. Refaça os **4 testes**: o resultado é o mesmo do PC?
3. Troque de celular com um colega e teste a tela **dele**
4. Achou um problema na tela do colega? Mostre **onde** está

---

## Revise tudo o que a IA fez
- ✅ Os **4 testes** de apto e inapto passam
- ✅ O Console não mostra **nenhum** erro vermelho
- ✅ No modo celular, dá para tocar em tudo sem errar
- ✅ Você sabe apontar as **5 peças** no `script.js`

> A IA é assistente. Quem assina o trabalho é você.

---

## Antes de entregar
Abra o seu repositório **no site do GitHub** e confira:

- ✅ `README.md` com o mapa e os requisitos
- ✅ `index.html`, `style.css` e `script.js` **comentados**
- ✅ A tela no ar pelo **GitHub Pages**

---

## Revisão
Qual arquivo decide se o equipamento está apto ou inapto?

- [ ] `index.html`
- [ ] `style.css`
- [x] `script.js`
- [ ] `README.md`

---

## Revisão
O Console mostra `Cannot read properties of null`. O que você confere primeiro?

- [ ] Se a internet caiu
- [x] Se o `id` usado no JS existe no HTML
- [ ] Se o CSS tem `@media`
- [ ] Se fez `git push`

---

## Revisão
Qual linha **compara** se os freios estão conformes?

- [ ] `freios = 'conforme'`
- [x] `freios === 'conforme'`
- [ ] `'freios' + 'conforme'`
- [ ] `const freios = 'conforme'`

---

## Tudo o que vimos até aqui
![Aulas 1, 2 e 3: os temas em volta do projeto](mapa-do-curso.svg)

---

## O caminho da inspeção
![Como as Aulas 1, 2 e 3 se encaixam no sistema](aula-03-mapa-inspecao.svg)

---

## O que vimos hoje
+ GitHub guarda, Codespace roda, git leva e o **Pages** publica
+ **Webhook** é um POST que avisa sozinho, na hora
+ **HTML** estrutura, **CSS** apresenta, **JavaScript** dá comportamento
+ Variável, lista, função, condição e evento: a lógica do **apto ou inapto**
+ O **Console** mostra o erro; o comentário mostra que você **entendeu**

---

# A inspeção virou tela
E quem decide se o equipamento sai é um código que você entende
