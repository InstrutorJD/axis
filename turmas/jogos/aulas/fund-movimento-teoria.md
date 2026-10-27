---
titulo: Movimento e Limites de Tela no Phaser
turma: 2º JD
---

# Movimento e Limites de Tela
Seu personagem, desenhado por você, andando no jogo

---

## Nesta aula você vai
+ Transformar um desenho do Piskel num sprite do Phaser
+ Carregar a imagem do personagem no código
+ Mover o personagem com as setas do teclado
+ Limitar até onde o personagem pode andar

---

## O caminho até o jogo
1. Desenhar o personagem no **Piskel** e exportar em PNG
2. Importar o PNG no **PixelCode**
3. Carregar a imagem no `preCarregar()`
4. Criar o sprite no `criar()`
5. Mover com o teclado no `atualizar()`
6. Limitar a área onde ele anda

> A prática segue exatamente esses 6 passos.

---

## A arte: pixel art em PNG
- O Piskel já abre com uma tela de **32×32 pixels**
- Cada quadradinho que você pinta é **um pixel** da imagem
- Exportando em **PNG**, o que não foi pintado fica **transparente**
- No jogo, só o desenho aparece, sem fundo em volta

---

## Pergunta
Um colega pintou o fundo do desenho de branco. O que vai aparecer no jogo?

- [ ] Só o personagem, porque o Phaser apaga o branco
- [x] O personagem dentro de um quadrado branco
- [ ] Uma tela branca no lugar do jogo inteiro
- [ ] Um erro no Console dizendo que a cor é inválida

> Por quê: o PNG guarda exatamente o que foi pintado. Fundo pintado de branco vira parte da imagem e aparece em volta do personagem.

---

## Os três momentos de uma cena
| Função | Quando roda | Para quê |
|---|---|---|
| `preCarregar()` | Uma vez, antes de tudo | Carregar imagens e sons |
| `criar()` | Uma vez, no início | Montar o que aparece na tela |
| `atualizar()` | Cerca de 60 vezes por segundo | Ler o teclado e mover |

---

## Pergunta
Você quer que o personagem **apareça uma vez**, quando o jogo começa. Em qual função fica o código que cria o sprite?

- [ ] No `preCarregar()`, junto com a imagem dele
- [x] No `criar()`, que monta a tela uma única vez
- [ ] No `atualizar()`, para ele sempre estar na tela
- [ ] Fora das funções, depois do `new Phaser.Game`

> Por quê: o `criar()` roda uma vez, quando a imagem já está carregada. No `atualizar()` ele criaria um personagem novo a cada frame.

---

## Carregando a imagem
```js
function preCarregar() {
  this.load.image('heroi', 'personagem.png');
}
```

- `'heroi'` é a **chave**: o apelido da imagem dentro do jogo
- `'personagem.png'` é o **nome do arquivo** no projeto
- Depois, o código só usa a chave `'heroi'`

---

## Pergunta
O PNG foi importado como `New-Piskel.png`, mas o código carrega `'personagem.png'`. O que acontece?

- [ ] O Phaser usa a única imagem que existe no projeto
- [ ] O jogo nem abre e a tela fica totalmente preta
- [x] Aparece a marca de imagem faltando no lugar
- [ ] O personagem aparece, mas não consegue se mexer

> Por quê: o nome no código precisa ser idêntico ao do arquivo. Sem achar o arquivo, o Phaser desenha um quadrado de "imagem faltando" no lugar.

---

## Criando o sprite
```js
heroi = this.physics.add.sprite(320, 180, 'heroi');
heroi.setScale(3);
```

- `physics.add.sprite` cria o personagem **com corpo físico**: ele pode ter velocidade
- `(320, 180)` é a posição do **centro** do personagem
- `setScale(3)` deixa o desenho 3 vezes maior

---

## Pergunta
O desenho tem 32×32 pixels e o código usa `setScale(4)`. Que tamanho o personagem terá na tela?

- [ ] 36×36 pixels, porque soma 4 em cada lado
- [ ] 32×32 pixels, porque a escala só muda a nitidez
- [ ] 8×8 pixels, porque divide o tamanho por 4
- [x] 128×128 pixels, porque multiplica por 4

> Por quê: a escala multiplica a largura e a altura. 32 × 4 = 128.

---

## Lendo o teclado
```js
// no criar(): pega as 4 setas
teclas = this.input.keyboard.createCursorKeys();

// no atualizar(): a seta está apertada AGORA?
if (teclas.left.isDown) { ... }
```

- `isDown` é `true` enquanto a tecla está pressionada
- Como o `atualizar()` roda o tempo todo, a resposta muda na hora

---

## Movimento pela velocidade
```js
function atualizar() {
  heroi.setVelocity(0);

  if (teclas.left.isDown) {
    heroi.setVelocityX(-VELOCIDADE);
  } else if (teclas.right.isDown) {
    heroi.setVelocityX(VELOCIDADE);
  }
}
```

> Velocidade em pixels por segundo. Negativo vai para a esquerda (ou para cima, no eixo y).

---

## Pergunta
Um aluno apagou a linha `heroi.setVelocity(0);`. O que muda ao jogar?

- [ ] O personagem não anda mais com nenhuma tecla
- [x] Ao soltar a seta, ele continua andando sozinho
- [ ] Ele passa a andar duas vezes mais rápido
- [ ] Ele volta para o centro da tela ao soltar a seta

> Por quê: a velocidade fica guardada no corpo físico. Sem zerar a cada frame, a última velocidade continua valendo mesmo sem tecla apertada.

---

## Pergunta
Com o personagem parado, o jogador segura a seta **para cima**. Que velocidade o código deve aplicar?

- [x] `setVelocityY(-VELOCIDADE)`, porque subir diminui o y
- [ ] `setVelocityY(VELOCIDADE)`, porque subir aumenta o y
- [ ] `setVelocityX(-VELOCIDADE)`, porque cima é o eixo x
- [ ] `setVelocityX(VELOCIDADE)`, porque o x aponta para cima

> Por quê: na tela, o eixo y cresce para baixo. Para subir, a velocidade em y é negativa.

---

## O problema: sair da tela
- A tela tem **640×360**: x vai de 0 a 640 e y de 0 a 360
- Sem limite, o personagem segue andando e **some** pela borda
- A posição `(x, y)` é o **centro** do sprite
- Por isso, metade do personagem já sai antes do centro chegar na borda

---

## Limite pronto do Phaser
```js
heroi.setCollideWorldBounds(true);
```

- O "mundo" da física tem, por padrão, o tamanho da tela
- Com essa linha, o **corpo** do personagem bate nas bordas e para
- Uma linha no `criar()` resolve as 4 bordas

---

## Pergunta
O personagem já tem `setCollideWorldBounds(true)` e o jogador segura a seta para a direita até o fim. O que acontece?

- [ ] Ele sai pela direita e reaparece pela esquerda
- [ ] Ele quica na borda e volta andando para a esquerda
- [x] Ele para encostado na borda direita da tela
- [ ] Ele para quando o centro dele chega na borda

> Por quê: o corpo inteiro do personagem bate na borda do mundo. Ele fica encostado, sem passar e sem voltar.

---

## A lógica por trás do limite
```js
const metade = heroi.displayWidth / 2;
heroi.x = Phaser.Math.Clamp(heroi.x, metade, 640 - metade);
```

- `Clamp(valor, mínimo, máximo)` devolve o valor **preso** no intervalo
- Abaixo do mínimo, vira o mínimo; acima do máximo, vira o máximo
- O mínimo é **metade da largura**, porque o x marca o centro

---

## Pergunta
O personagem tem 96 pixels de largura e a tela, 640. Qual o **menor** x para ele aparecer inteiro?

- [ ] 0, porque é onde a tela começa
- [x] 48, metade da largura do personagem
- [ ] 96, a largura inteira do personagem
- [ ] 544, que é a tela menos o personagem

> Por quê: o x é o centro do sprite. Com o centro em 48, a borda esquerda dele fica em 48 - 48 = 0, encostada no início da tela.

---

## Área de andar menor que a tela
```js
// só o chão: começa em y = 200 e tem 160 de altura
this.physics.world.setBounds(0, 200, 640, 160);
```

- `setBounds(x, y, largura, altura)` muda o tamanho do mundo da física
- Junto com `setCollideWorldBounds(true)`, o personagem fica **preso** nessa área
- Bom para jogos em que só se anda no chão, numa arena ou numa pista

---

## Pergunta
O mundo foi definido com `setBounds(0, 200, 640, 160)`. Entre quais valores de y o personagem pode andar?

- [ ] Entre 0 e 160, a altura que foi informada
- [ ] Entre 160 e 360, contando de baixo para cima
- [ ] Entre 0 e 200, acima da linha que foi marcada
- [x] Entre 200 e 360, que é 200 mais a altura 160

> Por quê: o mundo começa em y = 200 e tem 160 de altura, então termina em 200 + 160 = 360.

---

## O que vimos
+ Pixel art em PNG vira sprite no `preCarregar()`
+ O nome no código precisa ser igual ao nome do arquivo
+ Velocidade zerada a cada frame + setas = movimento
+ `setCollideWorldBounds` e `setBounds` limitam onde o personagem anda

---

# Hora da prática!
Abra o módulo **Prática — Meu Personagem em Movimento**
