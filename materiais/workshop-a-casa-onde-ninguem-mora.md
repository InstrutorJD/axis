---
aula: 1
data: 2026-11-06
titulo: Engenharia de Prompts na vida profissional: A arte de Perguntar à IA e usar ferramentas
turma: Workshop
tipo: workshop
tela: tv
descricao: Prompts, agentes e Skills no celular, no plano grátis (17:30 às 19:30)
instrutor: Jairon Douglas
---

# Engenharia de Prompts na vida profissional
A arte de perguntar à IA e usar ferramentas

---

# Só um pedido
Bem vago, de propósito.

---

## Você tem 30 segundos
**Desenhe uma casa.** Aponte a câmera, desenhe com o dedo e não pense muito.

[qrcode https://instrutorjd.github.io/axis/materiais/desenhe-uma-casa/ Abra no celular]

---

## Eu sei o que você desenhou

```grade
0 0 0 0 0 1 0 0 0 0 0
0 0 0 0 1 1 1 0 0 0 0
0 0 0 1 1 1 1 1 0 0 0
0 0 1 1 1 1 1 1 1 0 0
0 1 1 1 1 1 1 1 1 1 0
0 0 1 0 1 1 1 1 1 0 0
0 0 1 1 1 1 0 0 1 0 0
0 0 1 1 1 1 0 0 1 0 0
```

---

## Levante o celular
+ Telhado em triângulo?
+ Uma porta e uma janela?
+ Alguém desenhou chaminé? Em Jataí?
+ Agora me diga: **quem aqui mora nessa casa?**

---

# A casa onde ninguém mora
É assim que a IA responde quando ninguém diz quem você é

---

## O que você leva daqui, de graça
+ Uma IA que fala do jeito que **você** mandar
+ Um assistente configurado para o **seu** trabalho
+ Uma **Skill**: uma tarefa que ela aprende e repete
+ Tudo no plano **Free**. Sem pagar nada

---

# Agora, fale com a IA
Celular na mão, e a bagunça é permitida

---

## Abra uma das duas
- **ChatGPT:** app ou chatgpt.com
- **Claude:** app ou claude.ai
- Entre com a sua conta. Sem conta? Crie agora
- Travou? Faça dupla com quem está do lado

> Vale qualquer uma. Quem tiver as duas compara as respostas.

---

## Primeiro: a pergunta sem graça
Copie e envie. Sem mudar nada.

```text
Me explique por que a segunda-feira existe.
```

Guarde essa resposta. Parece a casa do desenho?

---

## Agora, a mesma pergunta com personagem
```text
Você é o Mestre Yoda.
Me explique por que a segunda-feira existe.
Até 4 linhas.
```

Leia a resposta em voz alta para quem está do lado.

---

## Agora, um cantor
```text
Você é um cantor sertanejo de Goiás, bem dramático.
Me explique por que a segunda-feira existe.
Até 4 linhas. Invente tudo, sem usar letra de música real.
```

---

## Sua vez: escolha o personagem
1. Escolha um personagem de cinema ou um cantor
2. Pergunte algo do seu dia a dia
3. Peça até 4 linhas

> A melhor resposta vai para o telão.

[cronômetro 5]

---

## A IA que achava que era uma ponte
+ Pesquisadores acharam a região ligada à ponte Golden Gate
+ Aumentaram a força dela dentro do Claude
+ Toda resposta passou a voltar para a ponte
+ Personalidade muda a resposta. A sua mudou com uma frase

Fonte: [Anthropic, Golden Gate Claude, 2024](https://www.anthropic.com/news/golden-gate-claude)

---

## Agora a brincadeira vira trabalho
```text
Você é o cliente mais difícil que eu já tive:
desconfiado, sem tempo, acha tudo caro.
Vou vender [o que você vende ou faz].
Me diga 3 motivos para você NÃO comprar.
Sem elogios.
```

> Mesmo truque do Yoda. Agora ele vale dinheiro.

[cronômetro 4]

---

## O problema de tudo isso
+ Abriu uma conversa nova? Ela esqueceu quem era
+ Você teria de colar o personagem toda vez
+ E se ela já começasse sabendo?

---

# Agentes de IA
Um funcionário que já chega sabendo o serviço

---

## Palavra da moda, sem enrolação
+ **Agente de verdade:** usa ferramentas e executa tarefas por você
+ **No plano grátis:** você monta um assistente com instruções fixas
+ É o primeiro passo, e é o que dá para fazer hoje

> Aqui, "agente" é um projeto com instruções. Sem mágica.

---

## Deram uma lojinha para um agente
+ O Claude cuidou do estoque e dos preços de uma loja
+ Mandou clientes pagarem numa conta que não existia
+ Comprou cubos de metal e vendeu abaixo do custo
+ Resultado: a loja não deu lucro. Instruções importam

Fonte: [Anthropic, Project Vend, 2025](https://www.anthropic.com/research/project-vend-1)

---

## Até onde cada coisa vale
| Recurso | Vale para | Exemplo |
|---|---|---|
| Prompt | Uma conversa | Yoda |
| Instruções gerais | Todas as conversas | "Responda curto" |
| Projeto | Um assunto | Assistente da loja |
| Skill | Uma tarefa, quando precisa | Responder cliente |

---

## Onde configurar, no plano Free
| Recurso | ChatGPT | Claude |
|---|---|---|
| Instruções gerais | Até 1.500 caracteres | Disponível |
| Projetos | Sem limite | Até 5 |
| Arquivos no projeto | Até 5 | Disponível |

Fontes: ajuda do [ChatGPT](https://help.openai.com/en/articles/10169521-using-projects-in-chatgpt) e do [Claude](https://support.claude.com/en/articles/9519177-how-can-i-create-and-manage-projects)

---

## "Mas e os GPTs?"
+ Conta pessoal não cria mais GPT novo, nem paga
+ A OpenAI vai aposentar os GPTs personalizados
+ Data prevista: **11 de dezembro de 2026**
+ Por isso hoje vamos de **Projeto**

Fonte: [OpenAI, Creating and editing GPTs](https://help.openai.com/en/articles/8554397-creating-a-gpt)

---

## Qual linguagem a IA entende melhor?
Para escrever as instruções do seu assistente:

- [ ] HTML, porque é linguagem da internet
- [ ] JSON, porque é linguagem de programação
- [x] Markdown: títulos e listas em texto simples
- [ ] Só funciona em inglês

---

## O veredito
| Formato | Quando usar |
|---|---|
| Texto comum | Pedido curto, do dia a dia |
| **Markdown** | Instruções do assistente: comece por aqui |
| XML | Separar blocos: regras, exemplos, documentos |
| HTML | Não precisa, a não ser para criar página |

Fontes: [OpenAI](https://developers.openai.com/api/docs/guides/prompt-engineering) e [Anthropic](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags)

---

## Markdown: `#` é título, `-` é item
```markdown
# Papel
Você é assistente da Pamonharia da Zefa.

# Contexto
Ralamos o milho às 5h e acaba antes das 11h.
Atendemos pelo WhatsApp.

# Regras
- Responda em até 4 linhas
- Se não souber o preço, diga que vai confirmar
- Nunca invente horário
```

---

## XML: etiquetas que abrem e fecham
```xml
<regras>
Responda em até 4 linhas.
Nunca invente horário.
</regras>

<exemplo>
Cliente: Tem pamonha agora?
Resposta: Tem até as 11h. Quantas separo?
</exemplo>
```

> O nome da etiqueta é você quem escolhe. Só use sempre o mesmo.

---

## Não sabe escrever? Ela escreve
```text
Quero um assistente para [seu trabalho].
Me entreviste: uma pergunta por vez, no máximo 5.
Depois escreva as instruções dele em Markdown,
com Papel, Contexto, Regras e Formato.
Até 1.500 caracteres, em um bloco para copiar.
```

[cronômetro 6]

---

## Cole no ChatGPT
1. Abra o menu lateral e toque em **Novo projeto**
2. Dê um nome ao projeto
3. Toque em **•••** e depois em **Configurações do projeto**
4. Cole o texto em **Instruções** e salve

> Atalho no celular: Configurações > Personalizar o ChatGPT. Vale para todas as conversas.

---

## Cole no Claude
1. Abra **Projetos** e crie um **Novo projeto**
2. Dê um nome ao projeto
3. Toque em **Definir instruções do projeto**
4. Cole o texto e salve

> Não achou no app? Abra claude.ai no navegador do celular ou no computador.

---

## Mão na massa: seu assistente
1. Crie o projeto na plataforma que você escolheu
2. Cole as instruções da entrevista
3. Abra uma conversa **dentro do projeto** e faça um pedido real

Ele já chegou sabendo o serviço?

[cronômetro 10]

---

## Celular ou computador?
| Tarefa | Celular | Computador |
|---|---|---|
| Testar prompts | Ótimo | Ótimo |
| Usar o assistente | Ótimo | Ótimo |
| Escrever instruções longas | Dá, mas cansa | Melhor |
| Enviar o ZIP de uma Skill | Depende do app | Melhor |

---

## Intervalo
Café e conversa. Mostre o seu assistente para alguém que você não conhece.

[cronômetro 10]

---

# Skills
Ensine uma vez. Ela repete sempre.

---

## Como isso surgiu
+ As instruções ficavam enormes e pesavam em toda conversa
+ **Outubro de 2025:** a Anthropic lança as Skills no Claude
+ **Dezembro de 2025:** o formato vira um padrão aberto
+ Depois, a OpenAI também passa a ter Skills no ChatGPT

Fonte: [Anthropic, Skills](https://claude.com/blog/skills)

---

## O que é uma Skill
+ Uma pasta com um arquivo principal: `SKILL.md`
+ Dentro dele, uma receita em Markdown
+ A IA lê primeiro só o nome e a descrição
+ Abre o resto **só quando a tarefa pede**

> Projeto é a sala de trabalho. Skill é a receita guardada na gaveta.

---

## Você precisa responder clientes toda semana
Onde essa tarefa fica melhor?

- [ ] Em um prompt colado toda vez
- [ ] Em um GPT novo, criado na conta grátis
- [x] Em uma Skill, usada só quando precisar
- [ ] Em uma conversa que nunca é fechada

---

## Uma Skill em ação: antes e depois
```text
Arrume esta planilha de vendas:
- junte os produtos escritos de jeitos diferentes
- apague as linhas repetidas
- coloque as datas no formato dd/mm/aaaa
- transforme os valores em números e refaça o total
Liste o que mudou e o que ficou em dúvida.
```

Vídeo gravado, com a espera cortada. Dados inventados.

---

## Sua vez: as Skills prontas do Claude
1. Abra as configurações e entre em **Recursos**
2. Ligue **Criar e editar arquivos**
3. Agora é só pedir. Ela escolhe a Skill sozinha

```text
Crie uma planilha Excel de orçamento para uma festa
de 50 pessoas, com total automático.
```

---

## Usar: e no ChatGPT Free?
+ Os planos listam **Skills** e **descobrir e usar plugins** no Free
+ Procure **Plugins** no menu lateral
+ Um plugin pode trazer Skills dentro dele
+ O que aparece varia por conta e por região

Fonte: [OpenAI, Plugins](https://help.openai.com/en/articles/20001256-plugins-in-chatgpt-and-codex) e [Preços](https://chatgpt.com/pricing)

---

## Por dentro de um SKILL.md
```markdown
---
name: responder-cliente
description: Transforma rascunho em mensagem de WhatsApp.
---

# Responder cliente
- Educada e direta
- Até 4 linhas, sem emoji
- Termine com o próximo passo
```

> A **descrição** decide quando a Skill entra em ação. Capriche nela.

---

## Criar no Claude: peça a Skill
```text
Crie uma Skill chamada responder-cliente.
Ela transforma meu rascunho em mensagem de WhatsApp
para cliente: educada, direta, até 4 linhas, sem emoji,
terminando com o próximo passo.
Siga o formato padrão das Skills e me entregue
o arquivo compactado pronto para instalar.
```

Troque a tarefa pela sua e baixe o arquivo.

---

## Criar no Claude: instale e teste
1. Abra **Personalização** e depois **Skills**
2. Toque em **Adicionar** e envie o ZIP
3. Confira se a Skill está ligada
4. Numa conversa nova, mande um rascunho bagunçado

> Pelo computador é mais fácil. Em casa, repita com calma.

---

## Criar no ChatGPT Free: o caminho possível
+ A OpenAI diz que Skills pessoais são para planos empresariais
+ Criar plugins também não aparece no plano Free
+ Solução: o mesmo texto vira as **instruções de um Projeto**
+ Não é Skill oficial, mas faz o trabalho

Fonte: [OpenAI, Skills in ChatGPT](https://help.openai.com/en/articles/20001066-skills-in-chatgpt)

---

## No ChatGPT: a mesma receita, em um Projeto
```text
Escreva as instruções de uma Skill para: [sua tarefa].
Diga quando usar e os passos, em Markdown.
Até 1.500 caracteres, em um bloco para copiar.
```

Cole o resultado nas instruções de um **projeto novo**, só para essa tarefa.

---

## Mão na massa: sua Skill
1. Escolha uma tarefa que você repete toda semana
2. **Claude:** peça a Skill e guarde o ZIP
3. **ChatGPT:** crie o projeto só dessa tarefa
4. Teste com um pedido real

[cronômetro 12]

---

## O grátis tem limite, mas não é fraco
| O Free limita | O Free já faz |
|---|---|
| Arquivos, imagens e voz | Escrever, resumir e revisar textos |
| Uso: às vezes é preciso esperar | Ensaiar conversas difíceis |
| Até 5 projetos no Claude | Assistente para o seu trabalho |
| Skill própria só no Claude | Receita repetida nas duas plataformas |

> Limite não é fraqueza: para o dia a dia, o Free já resolve muito.

---

## Antes de sair instalando
+ Skill pode trazer instruções e até código
+ Só instale de quem você confia. Leia antes
+ Nunca coloque senha, CPF ou dados de clientes
+ Ela erra com calma: confira nome, valor e data

> A assinatura no final é sua, não da IA.

---

# A próxima fase da IA
Você pede menos. Ela faz mais sozinha.

---

## O que está mudando
+ **Até hoje:** você pede, ela responde e para
+ **Agora:** ela segue trabalhando depois que você sai
+ Usa os seus apps, acompanha o que muda e avisa você
+ Três gigantes lançaram isso em menos de dois meses

---

## Os três nomes do momento
| Agente | Empresa | Lançamento | Foco |
|---|---|---|---|
| Muse | Meta | 08/09/2026 | Vida pessoal |
| dots | OpenAI | 29/09/2026 | Trabalho e dia a dia |
| Duet | Anthropic | 21/10/2026 | Trabalho e pequenos negócios |

Fontes: [Muse](https://techcrunch.com/2026/09/08/meta-debuts-its-muse-ai-agent-will-consumers-trust-it/), [dots](https://techcrunch.com/2026/09/29/openai-launches-dots-its-bubbly-agentic-avatar/) e [Duet](https://claude.com/resources/articles/claude-duet)

---

## O que cada um promete
- **Muse:** reserva viagem, preenche formulário e faz compras
- **dots:** persegue um objetivo em segundo plano, sem parar
- **Duet:** acompanha seus apps, aponta o que é urgente e adianta o trabalho

> É o que as empresas anunciam. Só o uso vai dizer o quanto funciona.

---

## Dá para usar aqui, hoje?
| Agente | Plano | No Brasil |
|---|---|---|
| Muse | Tem grátis, com cartão | Sem lançamento oficial |
| dots | Pro ou Business Premium | Confira na sua conta |
| Duet | Pro, Max ou Ultra | Ainda não: só EUA, com fila |

> Situação em novembro de 2026. O que fizemos hoje segue no Free.

---

## Quem fica com a chave da casa?
+ Para agir, ele pede e-mail, agenda e pagamentos
+ O Duet pede aprovação antes de enviar, pagar ou apagar
+ A própria Anthropic avisa: ele pode errar o que é urgente
+ A Meta promete isolamento, mas falta verificação independente

> Lembra da lojinha? Agora imagine com o seu cartão.

---

## Vamos conversar
Para qual destas tarefas você daria acesso a um agente?

- Responder clientes
- Organizar a agenda
- Fazer compras
- Pagar contas

[cronômetro 3]

---

## O que você fez hoje já serve para isso
+ Agente também precisa de instruções claras
+ A Skill ensina uma tarefa que ele pode repetir
+ E continua valendo: quem confere é você

---

## O que você leva para casa
+ **Prompt:** personagem, tarefa e limite
+ **Assistente:** um projeto com instruções em Markdown
+ **Skill:** uma receita para uma tarefa repetida
+ **Conferência:** quem assina é você

---

# Agora a casa tem dono
Obrigado pela presença!
