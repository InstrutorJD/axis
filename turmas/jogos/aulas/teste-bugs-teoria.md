---
titulo: Caçando Bugs com Testes
turma: 2º JD
---

# Caçando Bugs com Testes
Aplicar o teste é o jeito de enxergar o problema

---

## Nesta aula você vai
+ Executar um caso de teste e comparar esperado com obtido
+ Separar erro, defeito e falha
+ Classificar o tipo e a gravidade de um bug
+ Escrever um relatório de bug que o time consegue usar

---

## Aquecimento
No Pacman da turma, um colega diz: **"o jogo bugou"**.

+ Bugou como? O que ele estava fazendo?
+ Acontece sempre ou só às vezes?
+ Dá para o programador consertar só com essa frase?

> Hoje você aprende a transformar "bugou" em informação útil.

---

## O caso de teste
| Campo | Exemplo |
|---|---|
| Pré-condição | Fase 1 aberta, 3 vidas |
| Passos | Andar até a moeda e encostar nela |
| Resultado esperado | Moeda some e placar soma 10 |
| Resultado obtido | O que aconteceu de verdade |

> O teste é **aprovado** quando o obtido é igual ao esperado. Se for diferente, você achou um problema.

---

## Pergunta
Esperado: "placar soma 10". Obtido: "a moeda some, mas o placar continua em 0". Qual o resultado do teste?

- [ ] Aprovado, porque a moeda sumiu como deveria sumir
- [x] Reprovado, porque o obtido é diferente do esperado
- [ ] Inconclusivo, porque só uma parte do esperado falhou
- [ ] Aprovado, porque o jogo não travou durante o teste

> Por quê: o teste compara o resultado inteiro. Se qualquer parte do esperado não aconteceu, o teste é reprovado.

---

## Erro, defeito e falha
+ **Erro**: o engano da pessoa (escreveu `+ 1` em vez de `+ 10`)
+ **Defeito** (o *bug*): o problema que ficou no código
+ **Falha**: o que o jogador vê dando errado na tela

> O testador encontra **falhas**. A partir delas, o programador acha o **defeito** e entende o **erro**.

---

## Pergunta
O jogador vê o personagem atravessar a parede da fase 3. O que ele observou?

- [ ] O erro, porque viu o engano que a programadora cometeu
- [ ] O defeito, porque enxergou a linha errada no código
- [x] A falha, porque viu o comportamento errado na tela
- [ ] O caso de teste, porque seguiu os passos planejados

> Por quê: quem joga só enxerga o efeito do problema, que é a falha. O defeito está no código e o erro foi da pessoa que o escreveu.

---

## Tipos de bug
| Tipo | Exemplo no jogo |
|---|---|
| Funcional | Moeda não soma ponto |
| Visual | Sprite do fantasma aparece cortado |
| Desempenho | Jogo cai para 15 FPS na fase 4 |
| Usabilidade | Ninguém entende como pausar |
| Compatibilidade | Só funciona no Chrome |

---

## Pergunta
No celular, o jogo abre, mas os botões ficam fora da tela e não dá para tocar neles. No computador funciona. Que tipo de bug é esse?

- [ ] Desempenho, porque o jogo fica lento no aparelho
- [x] Compatibilidade, porque depende do aparelho usado
- [ ] Funcional, porque a regra da moeda está errada
- [ ] Visual, porque a cor dos botões está diferente

> Por quê: o mesmo jogo funciona num aparelho e falha em outro. Quando o problema depende do ambiente, é compatibilidade.

---

## Pergunta
Toda vez que aparecem mais de 20 inimigos, o jogo fica travando e o personagem anda aos trancos. As regras continuam certas. Que tipo de bug é?

- [ ] Funcional, porque o personagem não anda do jeito certo
- [ ] Visual, porque a imagem do jogo fica feia na tela
- [x] Desempenho, porque o jogo fica lento com muitos objetos
- [ ] Usabilidade, porque o jogador não sabe para onde ir

> Por quê: as regras funcionam, mas o jogo não aguenta a carga e perde velocidade. Quando o problema é lentidão, é desempenho.
---

## Gravidade: quanto o bug atrapalha
+ **Crítica**: impede de jogar (trava, fecha, perde o save)
+ **Alta**: quebra uma regra importante, sem saída fácil
+ **Média**: atrapalha, mas dá para contornar
+ **Baixa**: detalhe que quase ninguém percebe

> Gravidade é o **impacto** no jogo. Quem decide o que corrigir primeiro olha também a **prioridade**.

---

## Pergunta
Ao apertar R para reiniciar, o jogo fecha sozinho e o jogador perde a partida. Qual a gravidade?

- [x] Crítica, porque impede de continuar jogando
- [ ] Baixa, porque só acontece ao apertar uma tecla
- [ ] Média, porque o jogador pode abrir o jogo de novo
- [ ] Alta, porque a tecla R é pouco usada no jogo

> Por quê: o jogo fechar e perder a partida impede o uso. Isso é gravidade crítica, mesmo que aconteça numa ação específica.

---

## Pergunta
Na tela de créditos, o nome de um artista está com uma letra trocada. O resto do jogo funciona normalmente. Qual a gravidade?

- [ ] Crítica, porque o erro aparece para todos os jogadores
- [ ] Alta, porque é o nome de uma pessoa da equipe
- [ ] Média, porque o jogador precisa contornar o problema
- [x] Baixa, porque é um detalhe que não afeta o jogo

> Por quê: o problema não atrapalha jogar nem quebra regra nenhuma. Merece correção, mas a gravidade é baixa.
---

## Reproduzir antes de relatar
1. Volte ao **mesmo ponto** de partida
2. Repita os **mesmos passos**, um por vez
3. Anote se acontece **sempre** ou **às vezes** (ex.: 3 de 10)
4. Anote o **ambiente**: navegador, aparelho, versão

> Bug que o programador não consegue repetir quase nunca é corrigido.

---

## Pergunta
Você viu o fantasma travar uma vez e nunca mais. Qual é o melhor próximo passo?

- [ ] Relatar como crítico na hora, para garantir que seja visto
- [ ] Ignorar, porque bug que some sozinho não precisa de relato
- [x] Repetir os mesmos passos várias vezes e anotar a frequência
- [ ] Reiniciar o computador e testar outra fase do jogo

> Por quê: antes de relatar, tente reproduzir. Saber os passos e a frequência é o que permite ao programador achar o defeito.

---

## O relatório de bug
| Campo | Exemplo |
|---|---|
| Título | Placar não soma ao pegar moeda na fase 1 |
| Passos | 1. Abrir fase 1 2. Encostar numa moeda |
| Esperado × obtido | Soma 10 × continua em 0 |
| Frequência e ambiente | 10 de 10 · Chrome · v1.2 |
| Gravidade | Alta |

---

## Pergunta
Qual título de bug ajuda mais o programador?

- [ ] "O jogo está com bug na parte das moedas"
- [ ] "URGENTE!!! Moeda não funciona, corrijam rápido"
- [x] "Placar não soma ao pegar moeda após morrer uma vez"
- [ ] "Testei o jogo e achei vários problemas na fase"

> Por quê: um bom título diz o que falha e em que situação, sem opinião nem exagero. Dá para entender o problema só lendo a frase.

---

## Teste de regressão
+ Corrigiram o bug? Teste **de novo** o mesmo caso
+ E teste também o que estava **perto** dele
+ Uma correção pode **quebrar outra coisa**: isso é uma regressão

---

## Pergunta
Corrigiram a moeda que não somava. Agora as moedas somam, mas o fantasma ficou parado. Como se chama isso?

- [ ] Falha de compatibilidade, porque mudou o aparelho
- [x] Regressão, porque a correção quebrou algo que funcionava
- [ ] Bug de desempenho, porque o fantasma ficou mais lento
- [ ] Teste aprovado, porque o bug relatado foi corrigido

> Por quê: o fantasma funcionava antes da correção. Quando consertar uma coisa quebra outra, é uma regressão, e por isso se retesta o entorno.

---

## O que vimos
+ Caso de teste compara **esperado** com **obtido**
+ Testador vê a **falha**; o defeito está no código
+ Bug tem **tipo** e **gravidade**
+ Reproduza, relate com clareza e faça o **teste de regressão**

---

# Hora da prática!
Abra **"Prática — Sessão de Testes"** e teste o jogo Coin Runner
