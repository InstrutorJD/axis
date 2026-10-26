---
titulo: Impasse Técnico na Equipe
turma: Desenvolvimento de Sistemas
---

# Impasse Técnico na Equipe
Como decidir junto sem perder o foco do software

---

## Nesta aula você vai
+ Ligar cada decisão da equipe ao escopo e aos objetivos do projeto
+ Controlar as atividades com um quadro simples
+ Reconhecer os impasses técnicos mais comuns
+ Mediar um conflito de forma ética e criativa

---

## Aquecimento
Sua equipe tem **3 semanas** para entregar o app. Na primeira reunião:

+ Ana quer usar um framework novo "porque todo mundo usa"
+ Bruno quer HTML e JavaScript puro "porque a equipe já sabe"
+ A discussão dura 40 minutos e ninguém escreve nada

> Pense: o que faltou nessa reunião? Guarde a resposta para o fim da aula.

---

## Escopo: o que o software precisa entregar
- **Escopo** = o que está dentro (e fora) do projeto
- **Objetivo do software** = o problema que ele resolve para o usuário
- Toda decisão técnica deve responder: *isso ajuda a cumprir o objetivo no prazo?*
- Ideia boa **fora do escopo** vai para uma lista de "depois", não some

> Quando a equipe discorda, o escopo é o **juiz neutro**: ele não tem lado.

---

## Pergunta
No meio do projeto de um app de agendamento, um colega sugere incluir um chat com vídeo. O prazo é curto. O que fazer primeiro?

- [ ] Começar o chat na hora, porque ideia nova sempre agrega
- [ ] Recusar sem conversa, porque o projeto já estava todo definido
- [x] Comparar com o escopo e, se ficar fora, anotar para depois
- [ ] Deixar cada membro decidir sozinho se vai fazer ou não

> Por quê: o escopo é o critério. Se a ideia não cabe no objetivo e no prazo, ela vai para a lista de "depois", sem desprezar quem sugeriu.

---

## Metodologia: organizar o trabalho
- **Scrum**: trabalho em ciclos curtos (*sprints*), com lista priorizada de tarefas (*backlog*)
- **Kanban**: quadro visual, com um limite de tarefas "em andamento" ao mesmo tempo
- As duas pedem **transparência**: todo mundo vê o que está sendo feito
- Escolha pelo **escopo**: prazo, tamanho da equipe e quanto o projeto muda

---

## Pergunta
No quadro Kanban, a Bia está com 5 cartões em "Fazendo" ao mesmo tempo e nenhum termina. O que o Kanban sugere?

- [ ] Criar uma coluna nova só para as tarefas atrasadas da Bia
- [x] Limitar o que está em andamento e terminar antes de pegar outro
- [ ] Mover os cartões para "Feito" para o quadro ficar em dia
- [ ] Dividir cada um dos cartões em dois cartões menores e novos

> Por quê: o Kanban limita o trabalho em andamento. Terminar o que já começou entrega mais do que começar muitas coisas ao mesmo tempo.

---

## Controle de atividades: o quadro

| A fazer | Fazendo | Revisão | Feito |
|---|---|---|---|
| Tela de login (Bia, sex.) | API de tarefas (Caio) | Cadastro (Duda) | Modelo de dados |
| Relatório (?, ?) | | | |

- Cada cartão tem **responsável** e **prazo**
- Cartão sem dono é tarefa que ninguém vai fazer
- Olhar o quadro todo dia evita surpresas no fim

---

## Pergunta
No quadro da equipe, o cartão "Relatório" está em "A fazer" há duas semanas, sem responsável nem prazo. Qual é o problema principal?

- [ ] O quadro tem colunas demais e confunde a equipe toda
- [x] Tarefa sem dono e sem prazo tende a ficar sem ser feita
- [ ] O relatório deveria estar na coluna "Feito" desde o início
- [ ] Cartões antigos atrapalham e devem ser apagados do quadro

> Por quê: o controle de atividades só funciona quando cada tarefa tem alguém responsável e uma data combinada.

---

## Impasses técnicos comuns
- **Tecnologia**: framework novo × o que a equipe já domina
- **Prazo × qualidade**: entregar agora ou testar mais
- **Escopo crescendo**: pedidos novos no meio do projeto
- **Código que quebra o do colega**: conflito ao juntar as partes
- **Arquitetura**: banco relacional ou NoSQL, web ou app

> Impasse é normal. O problema é resolvê-lo **no grito**, na **pressa** ou **não resolver**.

---

## Pergunta
Duas pessoas discutem há 30 minutos se usam SQL ou NoSQL, e cada uma repete a própria opinião. O que ajuda mais a destravar?

- [ ] Fazer uma votação rápida e seguir o que a maioria decidir
- [ ] Deixar a pessoa com mais experiência decidir por todo mundo
- [x] Listar critérios do projeto e comparar as opções por eles
- [ ] Adiar a decisão até que alguém mude de ideia por conta própria

> Por quê: critérios ligados ao projeto (dados, prazo, o que a equipe sabe) tiram a discussão do "eu acho" e a levam para o "o projeto precisa".

---

## Mediar com ética
+ **Ouvir** os dois lados sem interromper, e repetir o que entendeu
+ **Separar a pessoa do problema**: criticar ideias, nunca colegas
+ **Ser transparente**: não esconder dado, erro ou prazo
+ **Decidir por critérios**, não por popularidade ou hierarquia
+ **Dar crédito** a quem teve a ideia, mesmo que ela não seja a escolhida

---

## Pergunta
Ao juntar o código, a parte do Caio quebrou a tela da Duda. No grupo, alguém escreve: "de novo o Caio estragando tudo". Qual atitude de mediação é ética?

- [ ] Concordar com a mensagem, já que o erro foi mesmo no código dele
- [ ] Ficar quieto para não se envolver no conflito
- [x] Focar no erro, sem culpar, e combinar juntos a correção
- [ ] Refazer a parte do Caio sem avisar ninguém

> Por quê: mediar com ética é tratar o problema técnico, proteger o respeito entre colegas e decidir junto quem corrige e como evitar de novo.

---

## Ferramentas para decidir
- **Prioridade MoSCoW**: *Must* (tem que ter), *Should* (deveria), *Could* (poderia), *Won't* (agora não)
- **Impacto × esforço**: primeiro o que ajuda muito e custa pouco
- **Tempo limite** para a discussão (ex.: 10 minutos)
- **Teste rápido** (prova de conceito) quando ninguém tem certeza
- **Registro da decisão**: o que foi decidido, por quê e quem faz

---

## Pergunta
A equipe tem 4 ideias e só dá tempo para 2. Usando MoSCoW, qual ideia entra primeiro?

- [ ] Um tema escuro que a equipe achou bonito (Could)
- [x] O login, sem o qual o app nem funciona (Must)
- [ ] Um relatório que o cliente pediu para a versão 2 (Won't)
- [ ] Uma animação na tela inicial para chamar atenção (Could)

> Por quê: *Must* é o que o software precisa para cumprir o objetivo. Sem login, o resto não serve.

---

## Criatividade: sair do "ou isso ou aquilo"
- Procure uma **terceira opção**: dá para juntar o melhor das duas?
- Faça um **teste rápido** das duas e decida pelo resultado
- **Divida o problema**: uma parte agora, outra na próxima entrega
- Troque de lugar: defenda por 2 minutos a ideia do colega

> Mediar não é escolher um vencedor: é achar a solução que **serve ao software**.

---

## Pergunta
Metade da equipe quer um framework novo e metade quer JavaScript puro. O prazo é de 3 semanas. Qual saída é mais criativa e alinhada ao objetivo?

- [ ] Sortear uma das opções para acabar logo com a discussão
- [x] Fazer um teste de um dia com as duas e decidir pelo resultado
- [ ] Cada metade faz o app do seu jeito e no fim a equipe escolhe um
- [ ] Usar o framework novo, porque é o que o mercado usa hoje

> Por quê: um teste curto e combinado traz dados para a decisão, respeita os dois lados e cabe no prazo.

---

## Registro da decisão
Depois de decidir, escreva (no quadro ou num papel):

1. **Contexto**: qual era o impasse
2. **Opções** que a equipe considerou
3. **Critérios** usados (escopo, prazo, usuário...)
4. **Decisão** e o motivo
5. **Próximos passos**: tarefas no quadro, com responsável e prazo

---

## Pergunta
Uma semana depois, alguém pergunta: "por que a gente não usou o framework novo?". O que evita reabrir a discussão do zero?

- [x] O registro da decisão, com as opções, os critérios e o motivo
- [ ] A lembrança de quem estava presente na reunião naquele dia específico
- [ ] Uma nova votação, porque a opinião da equipe pode ter mudado
- [ ] O histórico de mensagens do grupo, com a conversa inteira lá

> Por quê: o registro guarda o raciocínio. Dá para rever a decisão com dados novos, sem repetir a mesma briga.

---

## O que vimos
+ O escopo e o objetivo do software são o juiz neutro das decisões
+ Quadro de atividades com dono e prazo em cada tarefa
+ Mediar com ética: ouvir, respeitar, ser transparente e decidir por critérios
+ Criatividade e registro transformam impasse em decisão

---

# Hora da dinâmica!
Abra o módulo "Prática — Dinâmica do Impasse Técnico" e forme sua equipe
