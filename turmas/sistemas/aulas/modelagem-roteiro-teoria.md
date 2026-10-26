---
titulo: Roteiro de Trabalho para Modelagem
turma: Desenvolvimento de Sistemas
---

# Roteiro de Trabalho para Modelagem
Do requisito levantado ao modelo, sem pular etapas

---

## Nesta aula você vai
+ Diferenciar regra de negócio de requisito
+ Reconhecer os defeitos mais comuns nas regras de negócio
+ Montar um roteiro de trabalho para modelar um sistema
+ Definir artefato, responsável, prazo e critério de pronto de cada etapa

---

## Aquecimento
A equipe recebeu o pedido de um sistema para uma clínica veterinária. No primeiro dia:

+ Ana já começou o banco de dados
+ Bruno está desenhando as telas
+ Ninguém leu direito a entrevista com a dona da clínica

> Na segunda semana, descobrem que "consulta de pet idoso dura mais". Quanta coisa vai ter que ser refeita?

---

## Regra de negócio
- É uma **política, restrição ou cálculo do negócio**, que existe mesmo sem sistema
- Vem de quem conhece o negócio: cliente, lei, norma da empresa
- Exemplo: *"Cancelamento até 24 horas antes não tem custo"*
- Recebe um identificador: **RN01**, **RN02**...

> Se a clínica atendesse com agenda de papel, a regra continuaria valendo. Por isso ela é **de negócio**, não de tecnologia.

---

## Regra de negócio × requisitos

| Tipo | Responde | Exemplo |
|---|---|---|
| Requisito funcional (RF) | O que o sistema **faz** | RF04 — Cancelar consulta |
| Requisito não funcional (RNF) | **Como** o sistema deve ser | Carregar a tela em até 2 s |
| Regra de negócio (RN) | Qual **política** vale | Após 24 h, cobra 50% do valor |

---

## Pergunta
Qual destas frases é uma **regra de negócio**?

- [ ] O sistema deve permitir cancelar uma consulta
- [ ] A tela de consultas deve funcionar no celular
- [x] Pet com mais de 10 anos tem consulta de 45 minutos
- [ ] O sistema deve usar o banco de dados PostgreSQL da clínica

> Por quê: a duração da consulta geriátrica é uma política da clínica. As outras descrevem funções ou características técnicas do sistema.

---

## Defeitos comuns nas regras
- **Ambígua**: usa termo vago ("razoável", "muito", "um tempo")
- **Composta**: junta duas regras numa frase só
- **Conflitante**: contradiz outra regra
- **Não é regra de negócio**: é decisão técnica ou requisito não funcional
- Cada defeito vira retrabalho quando chega na modelagem ou no código

---

## Pergunta
A regra diz: *"O tutor que falta muito fica bloqueado por um tempo."* Qual é o defeito?

- [ ] Composta, porque junta duas regras numa frase
- [x] Ambígua, porque "muito" e "um tempo" não dá para medir
- [ ] Não é regra de negócio, porque fala de bloqueio no sistema
- [ ] Conflitante, porque toda regra sobre faltas conflita

> Por quê: ninguém consegue testar "muito" nem "um tempo". A regra precisa de números: quantas faltas e quantos dias.

---

## Pergunta
*"O agendamento é de segunda a sábado e o lembrete da vacina sai 7 dias antes."* Qual é o problema dessa regra?

- [x] É composta: são duas regras diferentes numa só
- [ ] É ambígua: não diz o horário exato do lembrete
- [ ] É conflitante: sábado não pode ter lembrete
- [ ] Não tem problema: frases com "e" são permitidas

> Por quê: horário de agendamento e lembrete de vacina são assuntos independentes. Separadas, cada uma é testada e alterada sem mexer na outra.

---

## Pergunta
A frase *"A tela de agendamento deve carregar em até 2 segundos"* é:

- [ ] Uma regra de negócio da clínica veterinária
- [x] Um requisito não funcional de desempenho
- [ ] Um requisito funcional de agendamento
- [ ] O critério de pronto da etapa de dados

> Por quê: tempo de resposta é uma característica de qualidade do sistema (RNF). Sem sistema, essa frase nem faria sentido.

---

## O roteiro de trabalho
- É o **plano** de como a equipe vai sair dos requisitos e chegar aos modelos
- Lista as **etapas em sequência**, com o **artefato** que cada uma produz
- Cada etapa tem **responsável**, **prazo** e **critério de pronto**
- Evita começar pelo fim (banco e telas) sem entender o problema

---

## Pergunta
A equipe da clínica começou pelo banco de dados antes de ler a entrevista. Qual problema um roteiro de trabalho evita?

- [x] Modelar sem entender o problema e refazer depois
- [ ] Ter que escolher um banco de dados para o sistema
- [ ] Precisar de um cliente para validar o sistema
- [ ] Ter mais de uma pessoa trabalhando na equipe

> Por quê: o roteiro põe o entendimento do problema e das regras antes dos modelos, e isso evita retrabalho.

---

## Uma sequência típica
1. Entender o problema e o escopo
2. Revisar os requisitos levantados
3. Revisar as regras de negócio
4. Identificar atores e casos de uso
5. Identificar entidades, atributos e relacionamentos (DER)
6. Validar os modelos com o cliente
7. Ajustar e versionar a documentação

---

## Pergunta
Por que a revisão das regras de negócio vem **antes** do modelo de dados?

- [ ] Porque o modelo de dados é a etapa menos importante do roteiro
- [x] Porque as regras definem campos, limites e relações do modelo
- [ ] Porque o cliente só aceita ver o modelo depois de um mês
- [ ] Porque as regras de negócio não mudam nada no banco de dados

> Por quê: uma regra como "cada pet pertence a um único tutor" vira a cardinalidade do DER. Modelar antes de revisar gera retrabalho.

---

## Artefatos: o que cada etapa entrega

| Etapa | Artefato |
|---|---|
| Revisar as regras de negócio | Lista de regras revisada |
| Atores e casos de uso | Diagrama de casos de uso |
| Entidades e relacionamentos | Modelo conceitual (DER) |
| Validar com o cliente | Ata de validação |

> Sem artefato, não há como saber se a etapa terminou.

---

## Pergunta
Qual é o artefato da etapa **"Validar os modelos com o cliente"**?

- [ ] O diagrama de casos de uso, desenhado do zero
- [ ] O banco de dados já criado e preenchido com os dados
- [x] A ata de validação, com o que o cliente aprovou
- [ ] A lista de telas que a equipe achou bonitas

> Por quê: a ata registra o que foi apresentado, aprovado e pedido de mudança, com data e participantes.

---

## Critério de pronto
- Diz **quando a etapa está terminada**, de um jeito verificável
- Ruim: *"Revisar as regras direito"*
- Bom: *"Todas as RN numeradas, sem termos vagos, e cada uma ligada a um RF"*
- Junto com o **responsável** e o **prazo**, vira controle de verdade

---

## Pergunta
Qual é um bom **critério de pronto** para a etapa "Identificar entidades, atributos e relacionamentos"?

- [ ] Quando a equipe achar que o modelo já está bom o bastante
- [x] DER com todas as entidades, chaves e cardinalidades das RN
- [ ] Quando o professor não tiver mais nenhuma pergunta a fazer
- [ ] Depois de gastar pelo menos duas aulas inteiras na etapa

> Por quê: o critério bom pode ser conferido item por item. "Achar que está bom" não dá para verificar.

---

## O que vimos
+ Regra de negócio é política do negócio; requisito é o que o sistema faz ou como
+ Defeitos: ambígua, composta, conflitante e "não é regra de negócio"
+ Roteiro: etapas em sequência, cada uma com artefato
+ Responsável, prazo e critério de pronto tornam o roteiro controlável

---

# Hora da prática!
Abra o módulo "Prática — Roteiro de Trabalho: VetAgenda" e monte o roteiro da equipe
