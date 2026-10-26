---
titulo: Lógica de Jogo 2D em JavaScript
turma: 2º JD
---

# Lógica de Jogo 2D em JavaScript
As funções que fazem um jogo andar

---

## Nesta aula você vai
+ Entender coordenadas e movimento numa tela 2D
+ Escrever funções que recebem dados e devolvem resultado
+ Detectar colisão entre dois retângulos
+ Fazer um inimigo decidir para onde ir

---

## Aquecimento
No Pacman que vocês estão construindo, o Phaser faz muita coisa sozinho.

+ Como ele sabe que o Pacman **encostou** na moeda?
+ Como ele impede de **sair da tela**?
+ Como um fantasma poderia **perseguir** o jogador?

> Hoje você escreve essas regras com as próprias mãos, em JavaScript puro.

---

## A tela é um plano cartesiano
- `x` cresce para a **direita**
- `y` cresce para **baixo** (diferente da matemática da escola)
- O canto **superior esquerdo** é `(0, 0)`
- Numa tela 640×480, o canto inferior direito é `(640, 480)`

---

## Pergunta
Um personagem está em `(100, 200)` e o jogador aperta para **cima**. Qual valor muda e como?

- [ ] O `x` aumenta, porque cima é o sentido positivo
- [ ] O `y` aumenta, porque o personagem sobe na tela
- [x] O `y` diminui, porque o eixo y cresce para baixo
- [ ] O `x` diminui, porque a tela começa na esquerda

> Por quê: nas telas o eixo y aponta para baixo. Subir é andar no sentido contrário, então o y diminui.

---

## Movimento = posição + velocidade
```js
function mover(x, velocidade) {
  return x + velocidade;
}

mover(100, 5);   // 105: andou para a direita
mover(100, -5);  // 95: andou para a esquerda
```

> A cada quadro (frame), o jogo soma a velocidade na posição. Velocidade negativa anda para trás.

---

## Pergunta
O inimigo está em `x = 300` com velocidade `-4`. Depois de **3 frames**, onde ele estará?

- [ ] Em 312, porque ele soma 4 a cada frame
- [x] Em 288, porque perde 4 a cada um dos 3 frames
- [ ] Em 296, porque a velocidade é aplicada uma vez só
- [ ] Em 304, porque velocidade negativa vira positiva

> Por quê: cada frame soma -4. Três frames somam -12, e 300 - 12 = 288.

---

## Pergunta
O personagem está em `y = 200` e cai com velocidade `+6` por frame. Depois de 5 frames, em que `y` ele está e para onde foi?

- [ ] Em 170, porque ele subiu 6 a cada frame na tela
- [x] Em 230, porque desceu 6 a cada frame (y cresce para baixo)
- [ ] Em 206, porque a velocidade só é somada no primeiro frame
- [ ] Em 194, porque cair significa diminuir o valor de y

> Por quê: 5 frames de +6 somam 30, então y vai de 200 para 230. Como y cresce para baixo, o personagem desceu.
---

## Não deixar sair da tela
```js
function limitar(valor, minimo, maximo) {
  if (valor < minimo) return minimo;
  if (valor > maximo) return maximo;
  return valor;
}

limitar(-20, 0, 608); // 0
limitar(700, 0, 608); // 608
```

> Numa tela de 640 de largura e personagem de 32, o x máximo é 640 - 32 = 608.

---

## Pergunta
A tela tem 480 de altura e o personagem tem 40 de altura. Qual é o maior `y` permitido para ele não sair por baixo?

- [ ] 480, que é a altura total da tela onde o jogo roda
- [ ] 520, somando a altura do personagem à altura da tela
- [x] 440, que é a altura da tela menos a do personagem
- [ ] 40, que é exatamente a mesma altura do personagem

> Por quê: o y marca o topo do personagem. Para ele caber inteiro, o topo pode ir no máximo até 480 - 40 = 440.

---

## Colisão entre retângulos (AABB)
Dois retângulos `a` e `b` (com `x`, `y`, `w`, `h`) **colidem** quando se sobrepõem nos dois eixos:

```js
function colidiu(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}
```

> É assim que o `overlap` do Phaser decide se o Pacman pegou a moeda.

---

## Pergunta
Pacman em `x 0` com largura 32; moeda em `x 40` com largura 10, na mesma altura. Eles colidem?

- [ ] Sim, porque estão na mesma altura e bem perto um do outro
- [ ] Sim, porque a moeda é menor e cabe dentro do Pacman
- [x] Não, porque o Pacman termina em 32 e a moeda começa em 40
- [ ] Não, porque a colisão só vale quando os x são iguais

> Por quê: o Pacman ocupa de 0 a 32 no eixo x e a moeda começa em 40. Sem sobreposição no x, não há colisão, mesmo na mesma altura.

---

## Pergunta
Jogador em `y 100` com altura 32 e moeda em `y 140`, no mesmo `x`. Pela regra dos retângulos, eles colidem?

- [ ] Sim, porque estão alinhados no mesmo x e bem próximos na tela
- [x] Não, porque o jogador termina em 132 e a moeda começa em 140
- [ ] Sim, porque a diferença de 40 é pequena perto do tamanho da tela
- [ ] Não, porque a colisão só é testada no eixo x, e não no y

> Por quê: no eixo y o jogador vai de 100 a 132 e a moeda começa em 140. Sem sobreposição em um dos eixos, não há colisão.
---

## Funções com decisão
```js
function pontosDoItem(tipo) {
  if (tipo === 'moeda') return 10;
  if (tipo === 'fruta') return 50;
  return 0;
}
```

- A função **recebe** um dado, **decide** e **devolve** um resultado
- O jogo chama `pontuacao += pontosDoItem(tipo)` quando o jogador pega algo

---

## Pergunta
Com essa função, o jogador pega uma moeda, uma fruta e uma pedra. Quanto a pontuação aumenta?

- [ ] 10, porque só a primeira chamada é contada
- [ ] 70, porque a pedra também vale 10 pontos
- [x] 60, somando 10 da moeda, 50 da fruta e 0 da pedra
- [ ] 50, porque a fruta substitui o valor da moeda

> Por quê: cada chamada devolve um valor. Moeda 10, fruta 50 e qualquer outro tipo 0: 10 + 50 + 0 = 60.

---

## O inimigo que persegue
```js
function direcaoParaAlvo(ix, iy, jx, jy) {
  const dx = jx - ix, dy = jy - iy;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'direita' : 'esquerda';
  }
  return dy > 0 ? 'baixo' : 'cima';
}
```

> O inimigo compara a distância em x e em y e anda no eixo em que está **mais longe**.

---

## Pergunta
Fantasma em `(100, 100)` e jogador em `(120, 300)`. Para onde a função manda o fantasma?

- [ ] Para a direita, porque o jogador está à direita
- [x] Para baixo, porque a diferença em y é a maior
- [ ] Para cima, porque o y do jogador é maior
- [ ] Para a esquerda, porque o x do fantasma é menor

> Por quê: dx = 20 e dy = 200. A diferença maior está no y, e como dy é positivo (y cresce para baixo), ele vai para baixo.

---

## O que vimos
+ Na tela, y cresce **para baixo**
+ Movimento é posição + velocidade, a cada frame
+ `limitar` segura o personagem na tela; `colidiu` detecta o encontro
+ Funções recebem dados, decidem e devolvem resultado

---

# Hora da prática!
Abra **"Prática — Desafios de Lógica 2D"** e escreva as funções do motor
