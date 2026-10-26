---
titulo: Revisão Técnica das Regras de Negócio
turma: Desenvolvimento de Sistemas
---

# Revisão Técnica das Regras de Negócio
Corrigir as regras e amarrá-las ao roteiro de trabalho

---

## Nesta aula você vai
+ Aplicar uma revisão técnica com checklist
+ Reescrever regras ambíguas, compostas e conflitantes
+ Ligar cada regra a um requisito e a uma etapa do roteiro
+ Registrar o que mudou, com versão

---

## Aquecimento
Na aula passada, sua equipe marcou os defeitos das regras da **VetAgenda**. Marcar não basta:

+ Quem vai programar o cancelamento: o que ele faz com *"antecedência razoável"*?
+ Se a RN05 diz "30 minutos, sem exceção", o pet idoso fica com consulta curta?
+ Daqui a um mês, como saber **por que** uma regra mudou?

---

## Por que revisar cedo
- Um erro de regra encontrado na **modelagem** custa uma conversa e uma correção no texto
- O mesmo erro encontrado depois do **código pronto** custa refazer tela, banco e testes
- A revisão técnica é uma **leitura sistemática**, com critérios, não uma "olhada rápida"
- Quem revisa não é quem escreveu: **outro olhar** acha mais problemas

---

## Pergunta
Quando é mais barato descobrir que a regra de cancelamento estava errada?

- [x] Na revisão das regras, antes de modelar o sistema
- [ ] Depois do app publicado, quando o cliente reclamar
- [ ] Durante os testes finais, com o sistema quase pronto
- [ ] Nunca, porque regra de negócio não precisa de revisão

> Por quê: antes de modelar, corrigir é só reescrever a regra. Depois, o erro já se espalhou por banco, telas e código.

---

## Checklist de revisão de uma regra
| Critério | Pergunta |
|---|---|
| Clara | Tem algum termo vago ("razoável", "muito", "um tempo")? |
| Atômica | Trata de um assunto só? |
| Verificável | Dá para escrever um teste com certo × errado? |
| Consistente | Contradiz alguma outra regra? |
| De negócio | Vale mesmo sem sistema? |
| Rastreável | Tem fonte e requisito ligado? |

---

## Pergunta
A RN03 original (*agendamento de segunda a sábado **e** lembrete de vacina*) reprova em qual critério da checklist?

- [x] Atômica: trata de dois assuntos numa regra só
- [ ] Clara: usa um termo vago no lugar de um número
- [ ] De negócio: é uma decisão de tecnologia
- [ ] Consistente: contradiz a regra de cancelamento

> Por quê: horário de agendamento e lembrete de vacina são dois assuntos. A regra precisa ser dividida.

---

## Reescrever uma regra ambígua
- Troque o **adjetivo** por **número, condição ou lista**
- Busque o valor na **fonte**: entrevista, contrato, lei
- Antes: *"O cancelamento deve ser feito com antecedência razoável."*
- Depois: *"RN02 — Cancelamento até 24 horas antes da consulta não tem custo; depois disso, cobra-se 50% do valor."*

---

## Pergunta
Qual reescrita da RN07 (*"O tutor que falta muito fica bloqueado por um tempo"*) passa na revisão?

- [ ] O tutor que falta demais fica bloqueado por vários dias
- [ ] O sistema bloqueia os tutores que faltam, sempre a critério da clínica
- [x] Após 2 faltas sem aviso, o tutor fica 30 dias sem agendar online
- [ ] O tutor com faltas deve ser tratado de forma adequada e justa

> Por quê: só a reescrita certa tem números vindos da entrevista (2 faltas, 30 dias) e pode ser testada.

---

## Dividir, resolver conflito, mover
- **Composta** → vira duas regras, cada uma com o seu código (RN03a, RN03b)
- **Conflitante** → deixe a exceção **explícita** ou pergunte ao cliente qual vale
- **Não é regra de negócio** → vai para os **requisitos não funcionais** (RNF), não some
- Tudo o que mudou fica **registrado**: o que, por quê e quem pediu

---

## Pergunta
A RN05 diz *"toda consulta dura 30 minutos, sem exceção"* e a RN06 diz *"pets com mais de 10 anos: 45 minutos"*. Como resolver?

- [ ] Apagar a RN06, porque a RN05 foi escrita primeiro
- [ ] Manter as duas e deixar o programador escolher uma
- [x] Reescrever a RN05 com a exceção explícita da RN06
- [ ] Apagar as duas e decidir o tempo de cada consulta depois

> Por quê: a entrevista confirma as duas coisas. A RN05 fica "30 minutos, exceto nos casos da RN06", e o conflito some.

---

## Pergunta
A RN04 diz *"O sistema deve usar o banco de dados PostgreSQL"*. O que fazer com ela na revisão?

- [ ] Manter como regra de negócio, porque o cliente pediu
- [ ] Apagar de vez, porque não é assunto da documentação
- [x] Mover para os requisitos não funcionais (restrição técnica)
- [ ] Juntar com a RN01, que também fala sobre o cadastro de dados do tutor

> Por quê: é uma decisão de tecnologia, não uma política da clínica. Ela continua documentada, mas no lugar certo.

---

## Rastreabilidade
Cada regra precisa estar ligada ao **requisito** que ela afeta e à **etapa do roteiro** em que vai ser modelada:

| Regra | Requisito | Onde entra no roteiro |
|---|---|---|
| RN02 (cancelamento 24 h) | RF04 Cancelar consulta | Casos de uso |
| RN08 (tutor × pets) | RF02 Cadastrar pet | Modelo de dados (DER) |
| RN06 (consulta de 45 min) | RF03 Agendar consulta | Casos de uso e DER |

---

## Pergunta
A regra *"cada pet pertence a um único tutor"* vai aparecer principalmente em qual artefato do roteiro?

- [ ] Na ata de validação, como assunto para discutir
- [x] No modelo de dados, como cardinalidade 1 para N
- [ ] No diagrama de casos de uso, como um novo ator
- [ ] Na descrição do escopo, como objetivo do projeto

> Por quê: a relação entre tutor e pet vira a cardinalidade no DER: um tutor tem N pets, cada pet tem 1 tutor.

---

## Integrar ao roteiro
- A etapa "Revisar as regras de negócio" ganha um **critério de pronto** baseado na checklist
- As regras revisadas viram **entrada** das etapas de casos de uso e de modelo de dados
- A **validação com o cliente** confirma as regras que mudaram
- O roteiro registra a **versão** da lista de regras usada em cada modelo

---

## Pergunta
Depois da revisão, o que muda no **critério de pronto** da etapa *Revisar as regras de negócio*?

- [x] Passa a exigir a checklist completa em todas as regras
- [ ] Deixa de existir, porque a revisão já foi feita uma vez
- [ ] Passa a depender só da opinião do cliente na reunião
- [ ] Fica igual, porque critério de pronto nunca pode mudar

> Por quê: a checklist vira o critério verificável da etapa: toda regra clara, atômica, verificável, consistente, de negócio e rastreável.

---

## Histórico de versões
| Versão | Data | O que mudou | Autor |
|---|---|---|---|
| 1.0 | 06/10 | Primeira interpretação das regras | Equipe |
| 1.1 | 13/10 | RN02 e RN07 com valores; RN03 dividida; RN05 com exceção; RN04 e RN09 viraram RNF | Equipe |

---

## Pergunta
Um mês depois, o cliente pergunta por que a RN03 virou duas regras. Onde a equipe encontra a resposta?

- [ ] Na memória de quem estava na aula daquele dia
- [x] No histórico de versões da lista de regras
- [ ] No código-fonte, procurando o que foi alterado
- [ ] No diagrama de casos de uso, na lista de atores

> Por quê: o histórico de versões registra o que mudou, quando, por quê e quem fez. É a memória do projeto.

---

## O que vimos
+ Revisão técnica: leitura sistemática com checklist, feita cedo
+ Ambígua ganha números; composta divide; conflito vira exceção explícita
+ O que não é regra de negócio vai para os RNF
+ Rastreabilidade e histórico ligam as regras ao roteiro

---

# Hora do laboratório!
Abra o módulo "Prática — Laboratório de Revisão das Regras" e corrija as regras da VetAgenda
