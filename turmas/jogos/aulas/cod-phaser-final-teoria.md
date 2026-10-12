---
titulo: Phaser — Técnicas por Trás do Pacman
turma: 2º JD
---

# Técnicas por Trás do Pacman
Entender o código que você colou para conseguir terminar o jogo

---

## Nesta aula você vai
+ Entender o ciclo de vida de uma cena do Phaser
+ Diferenciar `collider` de `overlap`
+ Ver como funções de evento e estado controlam o jogo
+ Usar o Console para achar o que falta no seu Pacman

---

## Aquecimento
Abra o seu Pacman (ou lembre de onde parou no roteiro).

+ O jogo abre? Aparece o labirinto?
+ O Pacman anda e para nas paredes?
+ Comer todas as moedas termina o jogo?

> Hoje o objetivo é um só: **todo mundo com o Pacman completo** até o fim da aula.

---

## O ciclo de vida da cena
| Função | Quando roda | No Pacman |
|---|---|---|
| `preCarregar` (preload) | 1 vez, antes de tudo | carrega os sprites do Piskel |
| `criar` (create) | 1 vez, ao começar | monta labirinto, moedas e fantasmas |
| `atualizar` (update) | ~60 vezes por segundo | lê o teclado e move todo mundo |

> Quem chama essas funções é o **Phaser**, não você. Por isso elas vão no objeto `configuracao`.

---

## Pergunta
Você colocou o código que lê as setas do teclado dentro de `criar()`. O que acontece?

- [ ] O Pacman anda normalmente, porque criar roda sempre
- [x] O teclado é lido uma vez só, no início, e o Pacman não anda
- [ ] O jogo trava, porque criar não aceita ler o teclado
- [ ] O Pacman anda mais rápido, porque criar roda primeiro

> Por quê: `criar` roda uma única vez ao começar. Ler as setas precisa acontecer a cada frame, e isso é papel do `atualizar`.

---

## Pergunta
O Pacman aparece como um quadrado com borda verde em vez do sprite do Piskel. Em que função está o problema mais provável?

- [x] Em `preCarregar`, onde o PNG é carregado com nome e caminho
- [ ] Em `atualizar`, onde o sprite é movido a cada frame
- [ ] Em `encerrarJogo`, que troca o sprite quando o jogo acaba
- [ ] Em `coletarMoeda`, que destrói o sprite do jogador

> Por quê: o Phaser mostra esse quadrado quando a imagem pedida não foi carregada. Quem carrega as imagens é o `preCarregar`, então confira ali o nome e o caminho do PNG.
---

## Game loop: o que muda a cada frame
```js
function atualizar() {
  if (jogoTerminou) return;
  jogador.setVelocity(0);
  if (teclas.left.isDown) {
    jogador.setVelocityX(-velocidade);
  }
  // ...
}
```

- A velocidade é **zerada** e recalculada todo frame
- Por isso o Pacman **para** quando você solta a tecla
- O `return` no início congela tudo depois do fim de jogo

---

## Pergunta
Um colega apagou a linha `jogador.setVelocity(0);`. Que comportamento ele vai ver?

- [ ] O Pacman não sai do lugar em nenhuma direção
- [ ] O Pacman atravessa as paredes do labirinto
- [x] O Pacman continua andando depois que a tecla é solta
- [ ] O placar para de somar quando come uma moeda

> Por quê: sem zerar a velocidade a cada frame, o último valor fica valendo. Soltar a tecla não muda nada e o Pacman segue andando.

---

## collider × overlap
```js
this.physics.add.collider(jogador, paredes);
this.physics.add.overlap(jogador, moedas, coletarMoeda);
```

- `collider`: os objetos **batem** e não se atravessam
- `overlap`: os objetos **se atravessam**, mas o Phaser avisa chamando uma função

> Parede bloqueia (collider). Moeda e fantasma só precisam ser **detectados** (overlap).

---

## Pergunta
O Pacman come a moeda, mas antes ela "empurra" o Pacman para trás como se fosse uma parede. O que provavelmente está errado?

- [ ] A moeda foi criada no grupo de inimigos do jogo
- [x] Usaram `collider` entre jogador e moedas, em vez de `overlap`
- [ ] Faltou chamar `moeda.destroy()` dentro de `coletarMoeda`
- [ ] A velocidade do jogador está alta demais para a moeda

> Por quê: `collider` faz os objetos baterem. Para só detectar o encontro e chamar a função, sem empurrar, o certo é `overlap`.

---

## Pergunta
Os fantasmas atravessam as paredes, mas o Pacman não. Qual linha está faltando no `criar()`?

- [ ] `this.physics.add.overlap(inimigos, paredes);`
- [x] `this.physics.add.collider(inimigos, paredes);`
- [ ] `this.physics.add.collider(jogador, inimigos);`
- [ ] `this.physics.add.overlap(jogador, paredes);`

> Por quê: para os fantasmas baterem nas paredes, é preciso um `collider` entre o grupo de inimigos e o de paredes. `overlap` só detectaria o encontro, sem bloquear.
---

## Funções de evento (callbacks)
```js
function coletarMoeda(jogador, moeda) {
  moeda.destroy();
  pontuacao += 10;
  textoPontuacao.setText('Pontos: ' + pontuacao);
}
```

- Você **não chama** `coletarMoeda` em lugar nenhum
- Você **entrega** a função para o `overlap`, e o Phaser chama quando acontece
- O Phaser já passa os dois objetos que se encontraram

---

## Pergunta
O placar soma, mas a moeda continua na tela e soma de novo a cada frame encostado. O que falta na função de evento?

- [ ] Aumentar o valor de 10 para 100 pontos por moeda
- [ ] Trocar o `overlap` das moedas por um `collider`
- [ ] Chamar `coletarMoeda()` também dentro de `atualizar()`
- [x] Remover a moeda com `moeda.destroy()` antes de somar

> Por quê: enquanto a moeda existir encostada no Pacman, o overlap dispara de novo. Destruí-la garante que cada moeda conte uma única vez.

---

## Estado do jogo: a variável de controle
```js
function encerrarJogo(cena, mensagem) {
  if (jogoTerminou) return;
  jogoTerminou = true;
  // para todo mundo e mostra a mensagem
}
```

- `jogoTerminou` guarda **em que situação** o jogo está
- Várias funções consultam essa variável antes de agir
- Evita mostrar "Game Over" duas vezes se dois fantasmas encostarem juntos

---

## Pergunta
Depois do "Game Over", o Pacman ainda anda pelo labirinto vazio. Qual linha está faltando?

- [x] `if (jogoTerminou) return;` no começo do `atualizar()`
- [ ] `jogoTerminou = false;` dentro do `encerrarJogo()`
- [ ] `this.scene.restart();` no final do `criar()`
- [ ] `pontuacao = 0;` no começo do `atualizar()`

> Por quê: o `atualizar` continua sendo chamado depois do fim. Sem sair logo no início quando o jogo terminou, ele segue lendo o teclado.

---

## Depurando com o Console (F12)
| Sintoma | Causa provável |
|---|---|
| Tela preta | Erro de digitação: veja a mensagem vermelha |
| Quadrado verde no lugar do sprite | Nome do PNG diferente do `load` |
| Atravessa parede | Faltou o `collider` com as paredes |
| R não reinicia | `jogoTerminou` não volta ou falta o `restart` |

> A mensagem vermelha do Console diz o **arquivo** e a **linha**. Comece sempre por ela.

---

## Pergunta
O jogo abre com uma tela preta e o Console mostra `preCarregar is not defined`. Qual é a causa mais provável?

- [ ] O arquivo `pacman_sheet.png` está com o nome errado
- [ ] Faltou o `collider` entre o jogador e as paredes
- [x] A função `preCarregar` não existe ou foi escrita diferente
- [ ] O navegador não tem suporte à biblioteca Phaser

> Por quê: "is not defined" quer dizer que o nome usado na `configuracao` não existe no código. Confira se a função foi colada e se o nome é idêntico.

---

## O que vimos
+ `preCarregar` e `criar` rodam uma vez; `atualizar` roda a cada frame
+ `collider` bloqueia; `overlap` detecta e chama uma função de evento
+ Uma variável de estado (`jogoTerminou`) controla o que pode acontecer
+ O Console (F12) aponta arquivo e linha do problema

---

# Hora de terminar o Pacman!
Abra **"Prática — Pacman: Reta Final"** e feche o jogo com o visto do professor
