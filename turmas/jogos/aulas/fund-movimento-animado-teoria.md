---
titulo: Movimentação Animada no Phaser
turma: 2º JD
---

# Movimentação Animada
Seu personagem anda de verdade: mexe as pernas, vira e corre pelo teclado

---

## Nesta aula você vai
+ Desenhar os quadros do passo do personagem no Piskel
+ Carregar uma folha de quadros (spritesheet) no Phaser
+ Tocar a animação de andar só quando ele se move
+ Virar o personagem, usar WASD e acertar a diagonal

---

## Onde paramos
- O personagem já anda pelas **setas** com `setVelocity`
- Ele fica preso no **chão** com `setCollideWorldBounds` e `setBounds`
- Mas ele **desliza**: é sempre o mesmo desenho, parado ou andando
- Hoje ele ganha **pernas que se mexem**

---

## Animação é uma sequência de quadros
- Cada desenho é um **quadro** (em inglês, *frame*)
- Trocando os quadros rápido, o olho vê **movimento**, como num flipbook
- A velocidade da troca é medida em **quadros por segundo** (FPS)
- Um passo simples: **2 quadros** se alternando, um com cada perna à frente

---

## Pergunta
A animação de andar tem **3 quadros** e roda a **6 quadros por segundo**. Quanto tempo leva uma volta completa?

- [ ] 2 segundos, porque divide 6 por 3
- [ ] 18 segundos, porque multiplica 3 por 6
- [x] 0,5 segundo, porque 3 × 1/6 de segundo
- [ ] 3 segundos, um segundo para cada quadro

> Por quê: a 6 quadros por segundo, cada quadro fica 1/6 de segundo na tela. Três quadros: 3 × 1/6 = 0,5 segundo.

---

## A folha de quadros (spritesheet)
- Em vez de um arquivo por quadro, vai **um PNG só**, com os quadros **lado a lado**
- No Piskel: exportar em **PNG** com **3 colunas** e **1 linha**
- Cada quadro tem 32×32, então a folha tem **96×32** pixels
- O Phaser recorta a folha em pedaços do tamanho de um quadro

---

## Pergunta
Uma folha exportada do Piskel tem **128×32 pixels** e cada quadro é **32×32**. Quantos quadros ela tem?

- [ ] 3 quadros, um para cada parte do corpo
- [ ] 32 quadros, um para cada linha de pixels
- [ ] 1 quadro, porque é um arquivo só
- [x] 4 quadros, porque 128 dividido por 32

> Por quê: os quadros estão lado a lado. 128 de largura dividido por 32 de cada quadro dá 4 quadros, numa linha só.

---

## Carregando a folha no Phaser
```js
function preCarregar() {
  this.load.spritesheet('heroi', 'andando.png', {
    frameWidth: 32,
    frameHeight: 32
  });
}
```

- `load.spritesheet` em vez de `load.image`
- `frameWidth` e `frameHeight`: o tamanho de **um quadro**, não da folha
- O sprite começa mostrando o **quadro 0**

---

## Pergunta
Um aluno trocou o arquivo para `andando.png`, mas deixou `this.load.image('heroi', 'andando.png')`. O que aparece no jogo?

- [ ] Só o primeiro quadro, porque o Phaser recorta sozinho
- [x] Os três desenhos lado a lado, como se fossem um só
- [ ] A marca de imagem faltando no lugar do personagem
- [ ] O personagem invisível, mas andando pelas setas

> Por quê: `load.image` não recorta nada: a folha inteira de 96×32 vira uma imagem só. Quem recorta em quadros é o `load.spritesheet`, com o `frameWidth`.

---

## Os quadros são numerados a partir do 0
| Quadro na folha | 1º | 2º | 3º |
|---|---|---|---|
| Número no Phaser | 0 | 1 | 2 |
| No nosso desenho | parado | passo A | passo B |

- A contagem vai da **esquerda para a direita**
- O primeiro quadro é o **0**, não o 1

---

## Criando a animação
```js
// no criar()
this.anims.create({
  key: 'andar',
  frames: this.anims.generateFrameNumbers('heroi', { start: 1, end: 2 }),
  frameRate: 8,
  repeat: -1
});
```

- `key`: o nome da animação, usado depois para tocar
- `generateFrameNumbers`: pega os quadros do `start` até o `end`
- `frameRate`: quadros por segundo
- `repeat: -1`: repete **sem parar**

---

## Pergunta
A folha tem 4 quadros: **parado**, **passo A**, **passo B** e **pulo**. Que `start` e `end` montam a animação de andar?

- [ ] `start: 1, end: 3`, contando do primeiro desenho
- [x] `start: 1, end: 2`, os dois passos da folha
- [ ] `start: 0, end: 2`, porque começa sempre no zero
- [ ] `start: 2, end: 3`, o segundo e o terceiro desenho

> Por quê: a contagem começa no 0. Parado é o 0, passo A é o 1, passo B é o 2 e pulo é o 3. Os passos vão do 1 ao 2.

---

## Pergunta
A animação de andar está com `frameRate: 8`. Você quer que as pernas se mexam **duas vezes mais rápido**. O que muda?

- [ ] `repeat: 16`, para repetir mais vezes
- [x] `frameRate: 16`, mais quadros por segundo
- [ ] `end: 4`, para ter mais quadros no passo
- [ ] `VELOCIDADE = 400`, para andar mais rápido

> Por quê: o `frameRate` diz quantos quadros aparecem por segundo. De 8 para 16, cada quadro fica metade do tempo na tela. A `VELOCIDADE` muda o deslocamento, não o ritmo das pernas.

---

## Tocar e parar
```js
// no fim do atualizar()
if (heroi.body.velocity.length() > 0) {
  heroi.anims.play('andar', true);
} else {
  heroi.anims.stop();
  heroi.setFrame(0);
}
```

- `length()` é o tamanho da velocidade: maior que 0, ele está andando
- O `true` diz: **se já está tocando, deixa continuar**
- Parou? Para a animação e mostra o **quadro 0** (parado)

---

## Pergunta
Um aluno escreveu `heroi.anims.play('andar')`, **sem** o `true`. Como o personagem fica ao segurar a seta?

- [x] Desliza com as pernas presas no primeiro passo
- [ ] Anda normal, porque o `true` é opcional
- [ ] Mexe as pernas duas vezes mais rápido
- [ ] Fica parado no lugar, sem conseguir andar

> Por quê: o `atualizar()` roda 60 vezes por segundo. Sem o `true`, cada chamada recomeça a animação do início e ela nunca passa do primeiro quadro.

---

## Pergunta
Um colega apagou a linha `heroi.setFrame(0);`. O que muda quando o jogador solta a seta?

- [ ] Ele continua andando sozinho pela tela
- [ ] As pernas continuam se mexendo, mesmo parado
- [ ] Ele volta para o centro do chão
- [x] Ele para no meio do passo, de perna aberta

> Por quê: o `stop()` congela a animação no quadro em que ela estava. É o `setFrame(0)` que troca para o desenho parado.

---

## Virando para o lado
```js
if (teclas.left.isDown) {
  heroi.setVelocityX(-VELOCIDADE);
  heroi.setFlipX(true);   // espelha: olha para a esquerda
} else if (teclas.right.isDown) {
  heroi.setVelocityX(VELOCIDADE);
  heroi.setFlipX(false);  // desenho original
}
```

- `setFlipX(true)` mostra o desenho **espelhado**
- Esse código vale para quem desenhou o personagem **olhando para a direita**

---

## Pergunta
Uma aluna desenhou o personagem **olhando para a esquerda** e usou o código acima. O que acontece no jogo?

- [ ] Ele vira certinho para os dois lados
- [x] Ele anda de costas, olhando para o lado oposto
- [ ] Ele não vira, porque o flip só funciona na direita
- [ ] Ele aparece de cabeça para baixo ao andar

> Por quê: o desenho original olha para a esquerda, então andar para a direita com `setFlipX(false)` o deixa olhando para trás. É só trocar o `true` e o `false`.

---

## WASD junto com as setas
```js
// no criar()
wasd = this.input.keyboard.addKeys('W,A,S,D');

// no atualizar()
if (teclas.left.isDown || wasd.A.isDown) { ... }
```

- Muitos jogos de PC usam **W A S D** com a mão esquerda
- `addKeys` devolve um objeto com uma tecla para cada letra
- `||` quer dizer **OU**: basta uma das duas estar apertada

---

## Pergunta
O jogador deve subir com a seta **para cima** ou com a tecla **W**. Qual condição faz isso?

- [ ] `teclas.up.isDown && wasd.W.isDown`
- [x] `teclas.up.isDown || wasd.W.isDown`
- [ ] `teclas.up.isDown || wasd.S.isDown`
- [ ] `teclas.W.isDown || wasd.up.isDown`

> Por quê: `||` (OU) aceita qualquer uma das duas. Com `&&` (E), o jogador teria que apertar as duas teclas ao mesmo tempo.

---

## O problema da diagonal
- Segurando **direita + baixo**: 200 em x e 200 em y ao mesmo tempo
- O caminho de verdade é a **hipotenusa** do triângulo (Pitágoras)
- √(200² + 200²) ≈ **283** pixels por segundo
- Na diagonal, o personagem fica **41% mais rápido**

---

## Pergunta
Sem nenhuma correção, a `VELOCIDADE` é **100**. Que velocidade real o personagem tem andando na diagonal?

- [ ] 100, porque a constante é a mesma nas duas setas
- [ ] 200, porque soma 100 do x com 100 do y
- [ ] 50, porque divide a velocidade entre os dois eixos
- [x] Cerca de 141, a raiz de 100² + 100²

> Por quê: x e y andam 100 ao mesmo tempo, e o caminho é a diagonal do quadrado: √(100² + 100²) = √20000 ≈ 141.

---

## A correção: normalizar
```js
// depois dos if do x e do y
heroi.body.velocity.normalize().scale(VELOCIDADE);
```

- `normalize()` mantém a **direção** e deixa o tamanho em 1
- `scale(VELOCIDADE)` multiplica até a velocidade certa
- Resultado: **200** em qualquer direção, reta ou diagonal
- Parado, a velocidade é zero e continua zero

---

## Pergunta
Com a linha do `normalize().scale(200)`, o jogador anda na diagonal. Quanto ele anda, **por segundo**, só no eixo x?

- [ ] 200, porque o x mantém a velocidade toda
- [x] Cerca de 141, o 200 dividido entre x e y
- [ ] 100, metade exata para cada um dos eixos
- [ ] 283, porque a diagonal soma os dois eixos

> Por quê: o total na diagonal passa a ser 200. Dividido igualmente entre x e y: 200 ÷ √2 ≈ 141 em cada eixo, e √(141² + 141²) ≈ 200.

---

## O que vimos
+ Animação é uma sequência de quadros, medida em FPS
+ `load.spritesheet` recorta a folha; os quadros contam do 0
+ `anims.create` + `play('andar', true)` + `setFrame(0)` ao parar
+ `setFlipX`, WASD com `||` e `normalize()` na diagonal

---

# Hora da prática!
Abra o módulo **Prática — Meu Personagem Animado**
