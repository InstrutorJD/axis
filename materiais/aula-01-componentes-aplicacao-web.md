---
aula: 1
data: 2026-09-30
titulo: Do bit à IA: como uma aplicação web funciona
turma: IA
descricao: Boas-vindas, curiosidades do mercado, história, binário, linguagens, como a IA pensa, usos da IA na mineração e o caminho de uma inspeção
---

# Do bit à IA
Aula 1: como a tecnologia conversa, e onde a IA (inteligência artificial) entra nisso

---

## Você sabia? A loja de apps encolheu
| Ano | Apps na Google Play |
|---|---|
| 2020 | cerca de **3 milhões** |
| 2026 | cerca de **1,7 milhão** |

Caiu! O Google passou a tirar da loja os apps de baixa qualidade. Não basta publicar: **tem que ser bom**.

---

## A IA já escreve código de verdade
+ No Google, em 2024: mais de **25%** do código novo era gerado com IA
+ Em abril de 2025: mais de **30%**
+ Em abril de 2026: **75%** do código novo
+ E quem revisa tudo isso? **Pessoas** que sabem programar

> Fonte: Sundar Pichai, presidente do Google (2024, 2025 e 2026).

---

## E os programadores, confiam?
+ **84%** usam ou vão usar IA para programar
+ Mas **46%** não confiam na precisão do que ela entrega
+ Motivo: a IA erra, e quem responde pelo código é o programador

> Fonte: pesquisa Stack Overflow com desenvolvedores, 2025.

---

## Onde estão as vagas
+ Até 2030: **170 milhões** de empregos novos e **92 milhões** que somem no mundo
+ Crescem mais: especialistas em **IA**, **dados** e **desenvolvedores de software**
+ No Brasil, o mercado pede **159 mil** pessoas de TI (tecnologia da informação) por ano
+ E o país forma só **53 mil** por ano

> Fontes: Fórum Econômico Mundial, 2025; Brasscom (associação das empresas de tecnologia do Brasil).

---

## Quem lidera a corrida da IA
| País | Modelos de IA de destaque em 2024 |
|---|---|
| Estados Unidos | **40** |
| China | **15** |
| Europa (todos da França) | **3** |

Fonte: Stanford AI Index 2025. No relatório de 2026, a China já quase empatou com os Estados Unidos em desempenho.

---

## Quem sou eu
### Jairon
+ Docente do **SENAI** (Serviço Nacional de Aprendizagem Industrial)
+ Professor de 2 cursos técnicos: **Desenvolvimento de Sistemas** e **Jogos Digitais**

---

# Aquecimento
O que você já sabe? Sem nota, só para a gente se conhecer

---

## Pergunta 1 de 3
Como o computador guarda tudo o que você vê na tela?

- [ ] Em letras e números, como a gente escreve
- [x] Em 0 e 1
- [ ] Em imagens pequenas
- [ ] Depende do programa

---

## Pergunta 2 de 3
Qual destes é um exemplo de **frontend**?

- [x] A tela de login de um app
- [ ] O servidor que confere a senha
- [ ] A tabela que guarda os usuários
- [ ] O cabo de rede do servidor

---

## Pergunta 3 de 3
Uma IA como o ChatGPT **sempre** acerta quando responde com segurança?

- [ ] Sim, ela busca a resposta num banco de verdades
- [ ] Sim, se a pergunta for bem escrita
- [x] Não, ela pode inventar com toda a confiança
- [ ] Não, ela só erra em matemática

---

## Placar da turma
Anote no quadro quantos acertaram cada pergunta.

---

## O que você vai aprender no curso
### Desenvolver sistemas **com** a IA como parceira
+ Pedir código à IA com **instruções claras** (os prompts)
+ **Entender e revisar** o que ela entrega: HTML, CSS, JavaScript e SQL
+ **Testar**, achar o erro e corrigir junto com ela
+ Saber como a web funciona por dentro, para **conferir** a IA

> A IA escreve rápido. Quem decide, revisa e responde pelo código é você.

---

## Por que web, e não app ou programa?
+ **Tempo**: o curso é curto demais para criar um programa instalado
+ **Tudo já roda no navegador**: WhatsApp Web, Google Docs, Canva, Office
+ **Não depende do aparelho**: Windows, Mac, Linux, Android ou iPhone
+ **Nada para instalar**: abriu o link, já está usando
+ Para conferir o que a IA faz na web: HTTP e **requisições**

---

## Programa, app ou web?
| | Programa instalado | App de loja | Web |
|---|---|---|---|
| Precisa instalar? | Sim | Sim | Não |
| Roda em qualquer aparelho? | Não, um por sistema | Não, Android e iPhone à parte | Sim, basta o navegador |
| Como atualizar | Máquina por máquina | Celular por celular | Uma vez, no servidor |
| Cabe no nosso curso? | Não | Não | **Sim** ✅ |

Até os apps de celular buscam os dados na web, com pedidos HTTP.

---

## Nossas ferramentas
| Ferramenta | Para quê |
|---|---|
| Navegador | Ver e testar o que a gente cria |
| Editor de código | Escrever HTML, CSS, JavaScript e SQL |
| GitHub Copilot | Assistente que sugere código enquanto você digita |
| Codex | Agente que executa tarefas inteiras de desenvolvimento |

---

## Projeto integrador: Checklist Digital de Inspeção
Antes de cada turno, o operador inspeciona o equipamento numa folha de papel.

+ A folha **molha, suja e se perde** no caminho até a manutenção
+ A **letra ilegível** esconde um freio reprovado
+ Ninguém vê a **tendência**: qual equipamento falha mais?
+ Ao longo do curso, **você e a IA** vão construir o sistema que resolve isso

---

## O que o sistema vai ter
| Parte | O que faz |
|---|---|
| Checklist no celular | O operador marca cada item em campo |
| Regras de aprovação | Item crítico reprovado **bloqueia** o equipamento |
| Histórico | Toda inspeção fica registrada |
| Dashboard | Gráficos: equipamentos liberados, bloqueados e falhas mais comuns |

---

## Roteiro de hoje (3h)
1. Boas-vindas, curiosidades, por que web e o binário (36 min)
2. Linguagens de programação e o algoritmo da inspeção (23 min)
3. A IA: de onde veio, onde está e como "pensa" (34 min)
4. ☕ Intervalo (20 min)
5. 🚨 Jogos Invasão Hacker e Rodada Relâmpago, usos da IA e o futuro (32 min)
6. A inspeção na web, criar sem código e segurança (35 min)

---

# Como tudo começou
Das máquinas de calcular aos computadores

---

## Das contas às máquinas
| Ano | O que aconteceu |
|---|---|
| 1642 | Pascal cria a **Pascaline**: soma e subtrai com engrenagens |
| 1703 | Leibniz publica a aritmética **binária**: tudo com 0 e 1 |
| 1837 | Babbage projeta a **máquina analítica**, um computador mecânico |
| 1843 | Ada Lovelace escreve o **primeiro algoritmo** para essa máquina |
| 1946 | **ENIAC** (Computador e Integrador Numérico Eletrônico): 30 toneladas, 18 mil válvulas, programado por seis mulheres |

---

## A máquina de 1837 já tinha as 4 partes
| Na máquina de Babbage | Hoje | Função |
|---|---|---|
| Leitor de cartões | Teclado, mouse, toque | **Entrada** |
| Moinho (*mill*) | Processador (CPU, unidade central de processamento) | **Processamento** |
| Armazém (*store*) | Memória RAM (de acesso aleatório) e disco | **Memória** |
| Impressora | Tela, som, impressora | **Saída** |

---

## Entrada, processamento, memória e saída
O operador toca em "Pneus: OK" no checklist do celular. Esse toque é...

- [x] Entrada
- [ ] Processamento
- [ ] Memória
- [ ] Saída

---

## Por que 0 e 1?
+ Um processador tem **bilhões de transistores**
+ Cada transistor é um interruptor: **ligado ou desligado**
+ Ligado = **1**, desligado = **0**
+ Com interruptores suficientes, dá para representar **qualquer coisa**

---

## Desafio: o que está escrito aqui?
### `01001111 01001001`

+ Cada 0 ou 1 é um **bit**
+ 8 bits formam um **byte**
+ Cada byte desta mensagem é uma **letra**
+ A mensagem é: **OI** 👋

---

## Como o computador lê um byte
Cada posição vale o dobro da anterior. Some as posições com 1:

```
posição:  128  64  32  16   8   4   2   1
bits:       0   1   0   0   1   1   1   1

64 + 8 + 4 + 2 + 1 = 79  →  letra "O"
```

---

## Sua vez
Quanto vale o byte `00000101`?

- [ ] 3
- [x] 5
- [ ] 6
- [ ] 101

---

## Letras viram números
| Letra | Posição no alfabeto | Número | Byte |
|---|---|---|---|
| A | 1 | 65 | `01000001` |
| I | 9 | 73 | `01001001` |
| O | 15 | 79 | `01001111` |

Letra maiúscula = **64 + posição no alfabeto**. Esse código se chama **ASCII** (Código Padrão Americano para Troca de Informações).

---

## Do transistor à web
| Ano | O que aconteceu |
|---|---|
| 1947 | **Transistor**: o interruptor minúsculo que substitui a válvula |
| 1969 | **ARPANET** (rede da Agência de Projetos de Pesquisa Avançada dos EUA), avó da internet |
| 1989 | Tim Berners-Lee propõe a **web** no CERN (Organização Europeia para a Pesquisa Nuclear) |
| 1990 | Nascem **HTML**, **HTTP** e **URL**, e o primeiro servidor |
| 1995 | **JavaScript** deixa as páginas interativas |

---

## Sopa de letrinhas da web
| Sigla | Significa | Na prática |
|---|---|---|
| HTML | Linguagem de Marcação de Hipertexto | A estrutura da página |
| CSS | Folhas de Estilo em Cascata | A aparência da página |
| HTTP | Protocolo de Transferência de Hipertexto | As regras do pedido e da resposta |
| URL | Localizador Uniforme de Recursos | O endereço de uma página |
| SQL | Linguagem de Consulta Estruturada | Guardar e buscar dados no banco |

---

## Curiosidade
Qual foi a primeira mensagem enviada pela ARPANET, em 1969?

- [ ] "HELLO"
- [x] "LO"
- [ ] "OI"
- [ ] "TESTE"

---

## "LO" de LOGIN
+ Iam digitar **LOGIN** de um computador para o outro
+ Chegaram o **L** e o **O**... e o sistema travou
+ Uma hora depois, o LOGIN completo funcionou
+ Primeira lição da rede: **nem todo pedido chega** 😅

---

## O primeiro site ainda está no ar
+ O primeiro servidor web da história ficava no **CERN**
+ O endereço `info.cern.ch` funciona até hoje
+ É só texto e links: sem imagem, sem vídeo, sem login

---

# Linguagens de programação
Como a gente conversa com a máquina

---

## Algoritmo é uma receita
1. Ferva 500 ml de água
2. Coloque o macarrão
3. Espere 3 minutos
4. Misture o tempero
5. Sirva

> **Algoritmo**: passos claros, em ordem, que resolvem um problema.

---

## Qual passo está ruim?
Qual destes **não** serve como passo de um algoritmo?

- [ ] Ferva 500 ml de água
- [ ] Espere 3 minutos
- [x] Cozinhe até ficar bom
- [ ] Desligue o fogo

---

## Mão na massa: o algoritmo da inspeção
1. No bloco de notas do celular, escreva os passos da inspeção
2. No máximo 8 passos, em ordem, sem passo vago
3. Voluntários leem os seus; a turma caça o passo ambíguo

[cronômetro 6]

---

## O que vocês acharam?
+ "Confira o caminhão" é vago: conferir **o quê**?
+ "Verifique se os 4 pneus estão calibrados" é claro
+ Se um passo confunde uma pessoa, confunde o computador
+ Programar é escrever passos **sem ambiguidade**

---

## Baixo nível x alto nível
| Nível | Exemplo | Quem entende |
|---|---|---|
| Linguagem de máquina | `10110000 01100001` | Só o processador |
| Assembly | `MOV AL, 61h` | Especialistas |
| Alto nível | `total = preco * quantidade` | Pessoas |

Quanto mais alto o nível, mais perto da nossa língua.

---

## Do código-fonte à máquina
+ Você escreve o **código-fonte**: texto que pessoas leem
+ O processador só entende **linguagem de máquina**: 0 e 1
+ Alguém precisa **traduzir** um no outro
+ Existem dois jeitos: **compilar** ou **interpretar**

---

## Compilação x interpretação
| Compilação | Interpretação |
|---|---|
| Traduz tudo **antes** de rodar | Traduz **enquanto** roda |
| Gera um programa pronto (executável) | Precisa do interpretador junto |
| Como um livro traduzido inteiro | Como um intérprete ao vivo |
| Ex.: C, Go, Rust | Ex.: Python, JavaScript no navegador |

---

## As linguagens do curso
| Linguagem | Para quê | No Checklist de Inspeção |
|---|---|---|
| HTML | Estrutura da página | O formulário do checklist |
| CSS | Aparência | Botões grandes, legíveis em campo |
| JavaScript | Comportamento | Validar itens, enviar, gráficos |
| SQL | Consultar e guardar dados | O histórico de inspeções |

> HTML é marcação e CSS é estilo: não são linguagens de programação, mas são essenciais.

---

## Um algoritmo de verdade
Contar os itens reprovados da inspeção, em JavaScript:

```js
const itens = [
  { nome: "Pneus", ok: true },
  { nome: "Freios", ok: false },
];
let reprovados = 0;
for (const item of itens) {
  if (!item.ok) reprovados = reprovados + 1;
}

console.log("Reprovados: " + reprovados); // Reprovados: 1
```

---

## Compilado ou interpretado?
O navegador lê o seu JavaScript e executa na hora. Isso é...

- [ ] Compilação
- [x] Interpretação
- [ ] Linguagem de máquina
- [ ] Assembly

---

# Como uma IA "pensa"
Spoiler: não é do jeito que a gente pensa

---

## A IA não nasceu ontem
| Ano | O que aconteceu |
|---|---|
| 1950 | Alan Turing pergunta: "as máquinas podem pensar?" |
| 1956 | Nasce o nome **inteligência artificial**, em Dartmouth (Estados Unidos) |
| 1966 | **ELIZA**, o primeiro chatbot, imita um terapeuta |
| 1997 | **Deep Blue** vence o campeão mundial de xadrez |
| 2016 | **AlphaGo** vence o campeão de Go, um jogo bem mais difícil |

---

## A virada: das regras aos exemplos
+ Antes: pessoas escreviam **as regras**, uma por uma
+ De 2012 em diante: redes neurais aprendem com **milhões de exemplos**
+ 2017: o Google cria o **Transformer**, a base dos chatbots de hoje
+ 2022: o **ChatGPT** chega a 100 milhões de usuários em 2 meses

> Fonte do número: banco suíço UBS, fevereiro de 2023.

---

## Onde a IA está hoje
+ Escreve texto e **código**, cria imagem, vídeo e voz
+ **Agentes** fazem tarefas inteiras: pesquisam, programam e testam
+ Em 2024, dois **Prêmios Nobel** foram para pesquisas com IA
+ Na mina de Brucutu, em Minas Gerais, da Vale, os caminhões são **autônomos** desde 2019
+ Mas ainda **erra com confiança**: já já você vai ver

---

## Aprender com exemplos
+ Um programa comum segue **regras escritas por pessoas**
+ Uma IA **descobre as regras** sozinha, a partir de exemplos
+ Milhares de fotos de gato → ela reconhece um gato
+ Modelos de linguagem aprenderam com **quantidades enormes de texto**

---

## Complete a frase
### "Batatinha quando nasce..."

+ Você completou sem pensar
+ Porque já viu esse **padrão** muitas vezes
+ A IA faz a mesma coisa, em escala gigante
+ Ela reconhece **padrões**, não "sabe" as coisas como a gente

---

## Tokens: a IA lê em pedaços
Nem letra por letra, nem palavra por palavra: **tokens**, pedaços de texto. Em inglês, 1 token ≈ 4 letras.

```
"O operador inspecionou o caminhão"
→ [O] [ oper] [ador] [ insp] [ecion] [ou] [ o] [ caminh] [ão]
  (divisão ilustrativa)
```

---

## Prever a próxima palavra
### "Antes de ligar o caminhão, o operador confere os..."

| Próximo token | Chance |
|---|---|
| pneus | 45% |
| freios | 30% |
| retrovisores | 20% |
| guarda-chuvas | 0,01% |

Chances ilustrativas. A IA escolhe um dos mais prováveis e repete, token por token.

---

## Mão na massa: o seu teclado também prevê
1. No bloco de notas, digite: *Antes de ligar o caminhão, o operador*
2. Toque 10 vezes na sugestão do meio, em cima do teclado
3. Leia a frase: faz sentido? O teclado "sabe" o que escreveu?

[cronômetro 5]

---

## A frase mais estranha ganha
+ Leia a sua frase em voz alta: a turma vota na mais estranha
+ Cada celular escreveu uma frase diferente: aprendeu com **o seu** jeito de digitar
+ O teclado só junta palavras **prováveis**, sem entender nada
+ Um modelo de linguagem faz o mesmo, em escala gigante

---

## Como a IA monta a resposta?
Como um modelo de linguagem gera o texto de uma resposta?

- [ ] Busca a resposta pronta num banco de dados
- [x] Prevê o próximo token, várias vezes seguidas
- [ ] Entende a pergunta como um humano
- [ ] Copia o primeiro resultado do Google

---

## Alucinação
+ A IA gera o texto **mais provável**, não o **verdadeiro**
+ Muitas vezes, em vez de dizer "não sei", ela **inventa**
+ E inventa **com a mesma confiança** de quando acerta
+ Isso se chama **alucinação**

---

## Alucinação em código
```js
// Pedido à IA: "conte os itens reprovados"
const reprovados = itens.contarReprovados();
```

Parece certo, mas `contarReprovados()` **não existe** no JavaScript. O código quebra.

---

## Regra de ouro: revise tudo
1. **Leia** o que a IA gerou
2. **Teste** de verdade
3. **Confira** na documentação oficial
4. Só então **use**

> A IA é assistente. A responsabilidade continua sendo sua.

---

## Caça à alucinação
Use o que você viu hoje: quais destas respostas de uma IA estão **erradas**?

1. "O ENIAC, de 1946, pesava 3 toneladas."
2. "Tim Berners-Lee propôs a web no CERN, em 1989."
3. "Ada Lovelace programou o ENIAC."
4. "Em JavaScript, `itens.length()` conta os itens da lista."

---

## Gabarito da caça
+ 1. **Errada**: o ENIAC pesava **30** toneladas
+ 2. **Certa**: foi em 1989, no CERN
+ 3. **Errada**: Ada morreu em 1852; o ENIAC teve **seis programadoras**
+ 4. **Errada**: é `itens.length`, sem parênteses
+ Todas soavam confiantes. Só a conferência separa o certo do errado

---

## E agora?
A IA respondeu com segurança e o código parece certo. O que você faz?

- [ ] Usa direto: ela parece ter certeza
- [ ] Pergunta para a própria IA se está certo
- [x] Testa e confere antes de usar
- [ ] Desiste de usar IA

---

## ☕ Intervalo
Na volta: um hacker vai tentar invadir o seu celular. 😈

[cronômetro 20]

---

## 🚨 Alerta: invasão!
Aponte a câmera e defenda o seu celular antes que o hacker chegue a **100%**.

[qrcode https://instrutorjd.github.io/axis/games/invasao-hacker.html?p=aula-01 Defenda o seu celular]

---

## Quem se defendeu melhor?
+ Levante a mão quem viu **ACESSO NEGADO** 🛡️
+ Menor tempo vence; empate: quem errou menos
+ Errou alguma? Era conteúdo de hoje: linguagens e IA
+ Na vida real, a melhor defesa também é **saber como funciona**

---

# Usos da IA
Cada problema pede uma ferramenta

---

## Como a IA é classificada
Pelo que ela **consegue** fazer, a IA se divide em três grupos:

| Grupo | O que é | Já existe? |
|---|---|---|
| IA estreita (ou fraca) | Faz muito bem **uma** tarefa específica | Sim: é toda IA de hoje |
| IA geral (ou forte) | Faria qualquer tarefa, como uma pessoa | Ainda não |
| Superinteligência | Iria além da inteligência humana | Só em teoria |

---

## Os 5 usos da IA estreita hoje
Todos são **IA estreita**. Assistente e agente são IA generativa aplicada ao código.

| Uso | O que faz | Exemplo na mina |
|---|---|---|
| Preditiva | Prevê o futuro a partir do histórico | Prever a falha de um equipamento |
| Visão computacional | Enxerga e analisa imagens | Achar desgaste na foto de um pneu |
| Generativa | Cria conteúdo novo | Redigir o relatório de turno |
| Assistente de código | Sugere código enquanto você digita | GitHub Copilot |
| Agente de desenvolvimento | Executa uma tarefa inteira, em etapas | Codex |

---

## Assistente x agente
+ **Assistente** (Copilot): sugere a próxima linha, você decide cada passo
+ **Agente** (Codex): recebe uma tarefa, lê o projeto, altera arquivos e roda testes
+ O agente trabalha mais sozinho, mas **mostra o que mudou** para você aprovar
+ Nos dois casos: **você revisa** antes de aceitar

---


## Aquecimento
A mina quer saber quantas horas o caminhão ainda roda antes da próxima troca de óleo.

- [x] IA preditiva
- [ ] IA generativa
- [ ] Assistente de código
- [ ] Agente de desenvolvimento

---

## Jogo: enxergue como a IA
+ Para a IA de **visão**, uma imagem é uma grade de **pixels**
+ Cada pixel vira número: **1** aceso, **0** apagado
+ Nos próximos slides, ache o desenho escondido nos números
+ Quem falar primeiro e acertar ganha **1 ponto**

---

## Desafio da grade 1 de 2
```grade
0 0 0 1 0 0 0
0 0 1 1 1 0 0
0 1 1 1 1 1 0
1 1 1 1 1 1 1
0 1 0 0 0 1 0
0 1 1 1 1 1 0
```

---

## Desafio da grade 2 de 2
```grade
0 1 1 1 1 1 0
1 0 0 0 0 0 1
1 0 1 0 1 0 1
1 0 0 0 0 0 1
1 0 1 1 1 0 1
0 1 1 1 1 1 0
```

---

## Respostas da grade
+ 1. Uma **casa**: telhado em cima, porta embaixo 🏠
+ 2. Um **rosto sorrindo** 🙂
+ Quem fez os 2 pontos?

---

## Como a IA enxerga?
+ Você achou **padrões**: telhado, curvas, olhos
+ A IA faz o mesmo, depois de ver **milhões de exemplos**
+ Uma foto de verdade tem **milhões** de pixels, não 42
+ Imagem muito diferente dos exemplos? A IA erra

---

## ⚡ Rodada relâmpago
Qual uso da IA resolve cada problema da mina? 10 segundos por cenário: rápido vale mais!

[qrcode https://instrutorjd.github.io/axis/games/rodada-relampago.html?p=aula-01 Rodada relâmpago]

---

## Como acertar sempre
+ Vai **prever** o que vai acontecer? → **preditiva**
+ Precisa **olhar** uma foto ou câmera? → **visão computacional**
+ Vai **criar** um texto ou imagem novo? → **generativa**
+ **Sugere** enquanto você digita? → **assistente de código**
+ Faz a **tarefa inteira** sozinho? → **agente**
+ Quem fez mais pontos? 🏆

---

## Para onde a IA pode ir?
+ Agentes mais **independentes**, trabalhando junto com as pessoas
+ IA dentro de **tudo**: celular, carro, máquina da mina
+ Robôs que enxergam e **agem** no mundo físico
+ Ninguém sabe o limite: nem os especialistas concordam

---

## Os desafios do caminho
+ **Empregos** mudam: tarefas repetitivas passam para a máquina
+ **Deepfakes** e desinformação ficam mais fáceis de fazer
+ Muita **energia** e água para treinar e rodar os modelos
+ As **leis** sobre IA ainda estão sendo escritas

---

## Debate rápido
Levante a mão: a IA vai **tirar** ou **mudar** o seu futuro emprego? Por quê?

[cronômetro 3]

---

# O caminho de uma inspeção
Cliente x Servidor, com HTTP no meio

---

## Cliente x Servidor
+ **Cliente**: quem pede. Na web, é o seu navegador ou app
+ **Servidor**: quem atende. Um computador que responde pedidos
+ O cliente **sempre começa** a conversa
+ O servidor **responde** e volta a esperar o próximo pedido

---

## As peças de uma aplicação web
| Na web | Na inspeção | Papel |
|---|---|---|
| Frontend | Checklist no celular do operador | O que o usuário vê e toca |
| API (interface de programação de aplicações) | O envio dos dados | Leva pedidos e traz respostas |
| Backend | Regras de aprovação | Aplica as regras e processa |
| Banco de dados | Registro histórico | Guarda os dados com segurança |

---

## HTTP: a língua do pedido
Toda conversa é um par: o cliente envia uma **requisição** e o servidor devolve uma **resposta**.

```http
POST /api/inspecoes HTTP/1.1
Host: checklist.exemplo.com
Content-Type: application/json

{ "equipamento": "CAM-07", "pneus": "ok", "freios": "reprovado" }
```

---

## Métodos: o que o cliente quer
| Método | Serve para | No checklist |
|---|---|---|
| `GET` | Buscar dados | Ver a lista de equipamentos |
| `POST` | Criar algo novo | Enviar uma inspeção |
| `PUT` / `PATCH` | Alterar algo | Corrigir um item marcado errado |
| `DELETE` | Remover | Apagar uma inspeção de teste |

---

## Status: como foi o atendimento
| Faixa | Significa | Exemplo |
|---|---|---|
| `2xx` | Deu certo | `200` OK, `201` inspeção registrada |
| `3xx` | Procure em outro lugar | `301` o endereço mudou |
| `4xx` | Erro de quem pediu | `404` equipamento não existe |
| `5xx` | Erro de quem atende | `500` o servidor falhou |

---

## Qual é o status?
O operador envia a inspeção do caminhão CAM-99, que não está cadastrado.

- [ ] `200`
- [ ] `201`
- [x] `404`
- [ ] `500`

---

## O site de exemplo da aula
Uma prévia do **Checklist Digital de Inspeção**, o projeto do curso. Aponte a câmera:

[qrcode https://instrutorjd.github.io/axis/materiais/checklist/ Site de exemplo]

---

## Mão na massa: veja os pedidos
1. Palpite: quantos pedidos o site de exemplo faz?
2. No site, toque em **🔍 Ver os pedidos desta página**
3. O palpite mais perto do total ganha

[cronômetro 6]

---

## O que vocês encontraram?
+ Até uma página simples faz **vários** pedidos
+ Página, estilo (CSS), script, ícone e os dados: um pedido cada
+ Os dados vêm em **JSON** (Notação de Objetos JavaScript), um texto organizado
+ Cada linha da lista é **um pedido HTTP**, com método e status
+ Um site grande faz dezenas: a mediana é de **71 pedidos** (Web Almanac 2024)

---

## Mão na massa: ache um 404
1. No site, toque em **🧪 Pedir uma página que não existe**
2. Qual **status** o servidor respondeu?
3. E qual foi o **método** do pedido: GET ou POST?

[cronômetro 5]

---

## O que o site mostrou?
Na página que não existe, qual status e qual método apareceram?

- [ ] `200` e `POST`
- [ ] `500` e `GET`
- [x] `404` e `GET`
- [ ] `404` e `POST`

---

## No quadro: o fluxo de uma inspeção
1. O operador preenche o checklist no celular (**frontend**)
2. O app envia `POST /api/inspecoes` pela **API**
3. O **backend** aplica as regras: freio reprovado = bloqueado
4. O **banco de dados** grava a inspeção no histórico
5. A resposta `201` volta: a tela mostra **Liberado** ou **Bloqueado**

---

## Onde fica a regra?
Em qual componente deve ficar a regra que bloqueia o equipamento com freio reprovado?

- [ ] Frontend, para aparecer mais rápido
- [x] Backend, onde a regra é confiável
- [ ] Banco de dados, junto com o pedido
- [ ] API, porque ela transporta a inspeção

---

## E a IA com isso?
Para pedir código à IA, **você** precisa dizer onde ele entra.

- Vago: *"faz um sistema de inspeção"*
- Preciso: *"crie no backend uma rota `POST /api/inspecoes` que bloqueie o equipamento se um item crítico for reprovado e salve a inspeção no banco"*

> Quem conhece as peças faz pedidos melhores para a IA e confere o que ela entregou.

---

## Já dá para criar sem escrever código
| Tipo | Exemplos | Como funciona |
|---|---|---|
| Criador de site | Wix, WordPress, Canva | Arrastar e soltar blocos |
| App sem código (*no-code*) | Bubble, Glide, FlutterFlow | Monta telas e banco clicando |
| IA que cria o app inteiro | Lovable, Bolt, v0, Replit | Você descreve, ela gera o código |

---

## Por que isso é bom
+ A ideia sai do papel em **horas**, não em meses
+ Qualquer pessoa testa uma ideia sem contratar programador
+ Ótimo para **protótipo**: mostrar, testar e jogar fora
+ Sobra tempo para pensar no **problema**, não na vírgula do código

---

## Vibe coding: programar "na vibe"
+ Termo de Andrej Karpathy (2025): pedir à IA e **nem ler** o código
+ Funciona... até dar erro e ninguém entender o porquê
+ Você fica **preso** à ferramenta e ao que ela decidiu por você
+ Quem sabe um pouco de código **lê, testa e corrige**; quem não sabe, torce 🤞

---

## Os buracos de segurança mais comuns
| Buraco | O que pode acontecer |
|---|---|
| Senha ou chave escrita no código | Qualquer um copia e usa a sua conta |
| Banco sem regra de acesso | Um estranho lê ou apaga os dados de todos |
| Regra só no frontend | Basta mandar o pedido HTTP direto para burlar |
| Não conferir o que o usuário digita | Invasão por injeção de código (SQL ou script) |
| Pacote que a IA inventou | Um golpista publica um pacote falso com esse nome |

---

## Aconteceu de verdade, em 2025
+ **Mais de 170 apps** feitos no Lovable vazaram dados: banco sem regra de acesso
+ Um agente de IA do Replit **apagou o banco** de uma empresa, mesmo proibido
+ Estudo da Veracode: **45%** do código gerado por IA tinha falha de segurança
+ Vazou dado pessoal? No Brasil, a **LGPD** (Lei Geral de Proteção de Dados Pessoais) cobra

> Fontes: CVE-2025-48757, registro público de falhas de segurança (Lovable); The Register, jul. 2025 (Replit); Veracode, 2025.

---

## Qual é o buraco?
A IA fez o app de inspeção e pôs a regra "freio reprovado bloqueia" só na tela do celular.

- [ ] O app fica lento no celular do operador
- [x] Alguém manda o pedido HTTP direto e burla a regra
- [ ] O banco de dados enche mais rápido
- [ ] Nenhum, porque a tela já bloqueia o envio

---

## Revisão rápida
Em qual peça fica guardado o histórico de todas as inspeções?

- [ ] Frontend
- [ ] API
- [ ] Backend
- [x] Banco de dados

---

## O que vimos hoje
+ O computador trabalha com **0 e 1**: bits e bytes
+ Todo computador tem entrada, processamento, memória e saída
+ Código-fonte vira linguagem de máquina: **compilação ou interpretação**
+ A IA **prevê tokens** e pode alucinar: revise sempre
+ Cada problema pede um **uso da IA**: preditiva, visão, generativa, assistente, agente
+ Frontend, API, backend e banco: o **caminho de uma inspeção**

---

# Todo clique é um pedido
E agora você sabe quem atende cada um deles
