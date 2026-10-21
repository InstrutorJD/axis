---
titulo: Testando o Meu Próprio Jogo
turma: 2º JD
---

# Testando o Meu Próprio Jogo
Um roteiro de testes e um relatório que qualquer pessoa entende

---

## Nesta aula você vai
+ Montar um roteiro de testes em camadas para o seu jogo
+ Fazer teste exploratório com missão e tempo marcado
+ Usar smoke, limites, compatibilidade, usabilidade e regressão
+ Escrever o relatório de testes, seção por seção

---

## Aquecimento: testar o que eu mesmo fiz
+ Você sabe **onde não ir**, então nunca vai lá
+ Você joga **do jeito certo**, porque sabe como foi feito
+ Você **desculpa** o que conhece: "ah, isso é normal"

> Essa é a **cegueira do autor**. Hoje você aprende técnicas para enxergar o seu jogo como um estranho.

---

## O roteiro em camadas
| Ordem | Teste | Pergunta que responde |
|---|---|---|
| 1 | Smoke | O jogo abre e dá para jogar? |
| 2 | Casos de teste | Cada regra funciona como planejei? |
| 3 | Exploratório | O que acontece fora do caminho feliz? |
| 4 | Limites, compatibilidade, usabilidade | Aguenta extremos, outros aparelhos e gente nova? |
| 5 | Regressão | A correção não quebrou outra coisa? |

---

## Smoke test: o jogo respira?
Um teste **rápido e raso**, feito antes de todos os outros.

+ O jogo abre sem erro?
+ Dá para começar uma partida?
+ Os controles respondem?
+ Dá para ganhar ou perder?
+ Dá para reiniciar?

> Se o smoke falha, pare e corrija. Não adianta testar detalhe num jogo que nem começa.

---

## Pergunta
Seu jogo abre, mas o personagem não responde a nenhuma tecla. Você tinha 10 casos de teste planejados. O que fazer?

- [ ] Rodar os 10 casos e marcar todos como reprovados
- [x] Parar, registrar a falha no smoke e corrigir antes
- [ ] Pular para o teste exploratório e procurar outros bugs
- [ ] Testar em outro navegador para ver se o erro some

> Por quê: com o smoke reprovado, os outros testes não têm como rodar. O certo é registrar, corrigir e repetir o smoke antes de seguir.

---

## Casos de teste: o roteiro planejado
Um caso para cada **regra** do seu jogo.

| ID | Passos | Esperado |
|---|---|---|
| CT-01 | Encostar numa moeda | Moeda some e placar soma 10 |
| CT-02 | Encostar num fantasma com 1 vida | Aparece "Game Over" |
| CT-03 | Comer a última moeda | Aparece "Você venceu!" |

> Depois de executar, anote o **obtido** e o status: **aprovado** ou **reprovado**.

---

## Pergunta
Qual destes é um bom caso de teste para o seu jogo?

- [ ] "Jogar uma partida e ver se está tudo funcionando"
- [ ] "Testar os fantasmas para ver se tem algum bug neles"
- [x] "Pular no espinho com 3 vidas: vidas caem para 2"
- [ ] "Conferir se o jogo ficou divertido para a turma"

> Por quê: um caso de teste tem uma ação clara e um resultado esperado que dá para conferir. As outras opções não dizem o que fazer nem o que deveria acontecer.

---

## Teste exploratório
Você **aprende, planeja e testa ao mesmo tempo**: o próximo passo depende do que acabou de ver.

+ Não tem roteiro fixo, mas tem **missão**
+ Tem **tempo marcado** (ex.: 15 minutos)
+ Você **anota tudo** enquanto joga

> Exploratório não é "jogar à toa". Sem missão e sem anotação, é só jogar.

---

## A missão (charter)
**Explorar** *o quê* **usando** *qual estratégia* **para descobrir** *qual risco*.

- Explorar **o pulo** usando **teclas apertadas juntas** para descobrir **travamentos**
- Explorar **as bordas do mapa** usando **corrida rápida** para descobrir **onde dá para atravessar**
- Explorar **o placar** usando **muitas moedas seguidas** para descobrir **erros de soma**

---

## Pergunta
Qual é a melhor missão para uma sessão exploratória de 15 minutos?

- [ ] Jogar o jogo inteiro várias vezes e ver se aparece algum bug
- [x] Explorar o reinício apertando R em vários momentos para achar travas
- [ ] Executar os casos CT-01 a CT-05 na ordem em que foram escritos
- [ ] Mostrar o jogo para um colega e perguntar se ele gostou dele

> Por quê: a missão diz o que explorar, com que estratégia e qual risco procurar. Jogar à toa não tem foco, e seguir os casos é teste roteirizado.

---

## Ideias para explorar (heurísticas)
- **Faça o contrário**: ande para trás, pule no lugar errado
- **Aperte tudo junto**: duas setas, pular e atirar ao mesmo tempo
- **Vá para as bordas**: cantos do mapa, beirada da tela
- **Interrompa**: troque de aba, redimensione a janela, pause
- **Repita rápido**: aperte a mesma tecla 20 vezes seguidas

---

## Pergunta
Numa sessão exploratória, você aperta pular e trocar de aba ao mesmo tempo, e o personagem volta flutuando. O que fazer agora?

- [ ] Encerrar a sessão, porque o bug já foi encontrado
- [ ] Voltar para os casos de teste, porque o exploratório acabou
- [x] Anotar e tentar repetir para descobrir os passos exatos
- [ ] Ignorar, porque trocar de aba não é coisa de jogador

> Por quê: no exploratório, o que você descobre guia o próximo passo. Anote o que aconteceu e tente reproduzir para conseguir relatar com passos claros.

---

## Valores-limite: teste os extremos
Bugs adoram morar nas **bordas**.

- **Zero**: 0 vidas, 0 moedas, tempo esgotado
- **O último**: a última moeda, a última fase
- **O máximo**: placar muito alto, muitos inimigos na tela
- **A beirada**: o pixel exato da parede ou do fim do mapa

---

## Pergunta
Seu jogo dá uma vida extra a cada 100 pontos. Que valores fazem o melhor teste de limite?

- [ ] 10, 50 e 70 pontos, para ver o placar subindo
- [x] 99, 100 e 101 pontos, em volta do ponto da regra
- [ ] 500, 1.000 e 5.000 pontos, para testar um placar alto
- [ ] 0, 20 e 40 pontos, que aparecem no começo do jogo

> Por quê: o defeito costuma estar exatamente na fronteira da regra, como trocar `>` por `>=`. Testar logo antes, no ponto e logo depois pega esse tipo de erro.

---

## Compatibilidade e desempenho
- **Outro navegador**: Chrome, Edge, Firefox
- **Outro aparelho**: celular, tela menor, zoom do navegador
- **Desempenho**: o jogo trava com muitos objetos? Fica lento depois de 5 minutos?

> Anote sempre o **ambiente**: navegador, aparelho e sistema. O mesmo jogo pode passar num e falhar no outro.

---

## Usabilidade: o olhar de quem nunca jogou
1. Peça a um colega para jogar **sem explicar nada**
2. Observe por 3 minutos, **sem ajudar**
3. Anote onde ele **travou, errou ou perguntou**

> O colega só joga. O relatório continua sendo **seu**: você observa e escreve.

---

## Pergunta
Seu colega jogou por 3 minutos e não descobriu como atirar. No controle está escrito "Z atira". O que registrar?

- [ ] Nada, porque a informação está escrita na tela de controles
- [ ] Um bug funcional, porque o tiro não aconteceu na partida
- [ ] Um bug de compatibilidade, porque o teclado dele é outro
- [x] Um problema de usabilidade, porque o jogador não achou o comando

> Por quê: a função existe e funciona, mas quem joga pela primeira vez não encontrou. Isso é usabilidade, e vale registrar como melhoria.

---

## Regressão: corrigiu? Teste de novo
+ Repita o caso que **falhou** antes da correção
+ Repita também o que fica **perto** do código mexido
+ Rode o **smoke** de novo

> Se algo que funcionava parou de funcionar, é uma **regressão**.

---

## Pergunta
Você corrigiu o pulo duplo. Quais testes rodar depois da correção?

- [ ] Só o caso do pulo duplo, que era o que estava com defeito
- [x] O caso do pulo, os testes de movimento perto dele e o smoke
- [ ] Nenhum, porque o código novo já foi conferido ao escrever
- [ ] Todos os testes de outro jogo, para comparar os resultados

> Por quê: a correção pode quebrar algo vizinho. Por isso se retesta o caso corrigido, o entorno dele e o básico do jogo.

---

# O relatório de testes
O documento que você vai entregar

---

## As seções do relatório
| Seção | O que vai nela |
|---|---|
| 1. Identificação | Jogo, versão, data, ambiente e escopo |
| 2. Smoke | Os 5 itens básicos: passou ou falhou |
| 3. Casos de teste | Mínimo 5, com esperado, obtido e status |
| 4. Exploratório | Mínimo 2 sessões: missão, tempo, anotações |
| 5. Outros testes | Limites, compatibilidade, usabilidade ou desempenho |
| 6. Bugs, regressão e conclusão | Tudo o que achou e a sua conclusão |

---

## Exemplo: identificação
| Campo | Exemplo |
|---|---|
| Jogo | Pac-Ana (Pacman no Phaser) |
| Versão e data | v1.0 · 21/10/2026 |
| Ambiente | Chrome 130 · notebook da escola · Windows 11 |
| Escopo | Fase 1 inteira. Fora: som (ainda não tem) |

> **Escopo** diz o que foi testado e o que ficou de fora. Assim ninguém acha que você esqueceu.

---

## Exemplo: caso de teste
| Campo | CT-02 |
|---|---|
| Pré-condição | Fase 1 aberta, 1 vida |
| Passos | 1. Andar até o fantasma 2. Encostar nele |
| Esperado | Aparece "Game Over" e o jogo para |
| Obtido | Aparece "Game Over", mas o fantasma continua andando |
| Status | **Reprovado** |

---

## Exemplo: sessão exploratória
- **Missão**: explorar o reinício apertando R em vários momentos para achar travas
- **Duração**: 15 minutos
- **Anotações**: R no meio da partida não faz nada (ok). R logo após vencer: o placar volta a zero, mas as moedas não reaparecem
- **Descobertas**: 1 bug (BUG-02)

---

## Exemplo: bug registrado
| Campo | BUG-02 |
|---|---|
| Título | Moedas não reaparecem ao reiniciar após vencer |
| Passos | 1. Comer todas as moedas 2. Apertar R |
| Esperado × obtido | Fase nova com moedas × fase vazia, placar 0 |
| Tipo · gravidade · frequência | Funcional · Alta · 5 de 5 |
| Onde achei | Sessão exploratória 1 |

---

## Exemplo: conclusão
- **Resumo**: 6 casos (4 aprovados), 2 sessões, 3 bugs e 1 melhoria
- **Pronto para publicar?** Ainda não: BUG-02 impede jogar de novo
- **Próximos passos**: corrigir BUG-02 e rodar a regressão
- **O que aprendi**: eu nunca apertava R depois de vencer

> A conclusão responde: **dá para entregar o jogo para um jogador hoje?**

---

## Pergunta
Qual conclusão de relatório é mais útil?

- [ ] "Testei bastante e o jogo está bom, só tem uns bugs pequenos"
- [ ] "O jogo tem bugs, mas no geral eu gostei muito do resultado"
- [x] "Não publicar: BUG-02 é alto e impede jogar uma 2ª partida"
- [ ] "Todos os testes foram feitos conforme o que o professor pediu"

> Por quê: a conclusão útil toma uma decisão e diz o motivo, citando o registro. As outras opções são opinião ou não dizem nada sobre o estado do jogo.

---

## O que vimos
+ Comece pelo **smoke** e siga com os **casos de teste**
+ **Exploratório** tem missão, tempo marcado e anotações
+ Teste **limites**, **outros aparelhos** e **quem nunca jogou**
+ Corrigiu? Faça a **regressão** e registre tudo no **relatório**

---

# Hora da prática!
Abra **"Relatório — Testando o Meu Jogo"** e teste o jogo que você criou
