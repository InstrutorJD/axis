-- Notas de Conhecimentos sobre TI (professor/conhecimentos.html): um mapa
-- geral da área ligado às notas de IA (sql/conhecimentos-ia.sql).
-- Programação, web, dados, infraestrutura, redes, segurança, jogos,
-- engenharia de software, IoT e carreira. Rode no SQL Editor do Supabase.
--
-- O SQL Editor não tem usuário logado (auth.uid() é nulo), então o dono
-- das notas é achado em profiles: o único perfil com role 'professor'.
-- Se houver mais de um, preencha v_email com o e-mail do seu login.
--
-- NÃO SOBRESCREVE SUAS NOTAS: uma nota sua com o mesmo título (sem
-- diferenciar maiúsculas), escrita do zero, fica como está. O script só
-- cria as que faltam e atualiza as que vieram dele mesmo (reconhecidas
-- pelo começo do texto) — assim, rodar de novo traz o conteúdo ampliado.
-- Também troca as 2 notas de exemplo que o Conhecimentos cria na 1ª vez
-- ("Banco de Dados" e "SQL Básico"), se ainda tiverem o texto original.
-- Atenção: edições feitas no portal numa nota que veio daqui se perdem
-- ao rodar de novo.

do $do$
declare
  v_email text := '';   -- opcional: e-mail do login do professor
  v_prof uuid;
  v_qtd int;
  v_criadas int;
begin
  if v_email <> '' then
    select id into v_prof from public.profiles where lower(email) = lower(v_email);
  else
    select count(*) into v_qtd from public.profiles where role = 'professor';
    if v_qtd <> 1 then
      raise exception 'Há % professores em profiles. Preencha v_email no topo do script.', v_qtd;
    end if;
    select id into v_prof from public.profiles where role = 'professor';
  end if;
  if v_prof is null then
    raise exception 'Professor não encontrado. Confira v_email.';
  end if;

  insert into public.professor_notas (professor_id, titulo, conteudo)
  select v_prof, n.titulo, n.conteudo
  from (values

-- ================================================================== MAPA
('Mapa de TI', $md$Ponto de partida: as grandes áreas da TI e por onde começar em cada uma.

## Fundamentos
- [[Lógica de Programação]] → [[Estruturas de Dados]] → [[Complexidade de Algoritmos]]
- [[Programação Orientada a Objetos]]
- [[Terminal]] e [[Git]]

## Desenvolvimento web
[[Como a Web Funciona]] · [[HTML]] · [[CSS]] · [[JavaScript]] · [[HTTP]] · [[API REST]] · [[JSON]]

## Dados
[[Banco de Dados]] · [[SQL Básico]] · [[Chave Primária]] · [[Modelagem de Dados]] · [[Supabase]]

## Infraestrutura
[[Redes de Computadores]] · [[Linux]] · [[Computação em Nuvem]] · [[Docker]]

## Segurança
[[Cibersegurança]] · [[Senhas e Autenticação]] · [[Engenharia Social]] · [[LGPD]]

## Jogos
[[Game Loop]] · [[Godot]] · [[Phaser]]

## Engenharia de software
[[Metodologias Ágeis]] · [[Testes de Software]] · [[Clean Code]] · [[UX e UI]]

## Hardware
[[IoT]] · [[ESP32]]

## IA
[[IA]] · [[LLM]] · [[Prompt]] · [[Agentes de IA]] · [[RAG]] · [[Alucinação]] · [[Ética e Vieses na IA]] · [[IA na Sala de Aula]]

## Carreira
[[Carreira em TI]]

---
## Trilha sugerida de estudo
| Etapa | Estude | Projeto pra fixar |
|---|---|---|
| 1 | [[Lógica de Programação]], [[Terminal]] | calculadora de média no console |
| 2 | [[HTML]], [[CSS]] | página pessoal / currículo |
| 3 | [[JavaScript]] | quiz ou jogo da velha no navegador |
| 4 | [[Git]], [[GitHub]] | publicar tudo no GitHub Pages |
| 5 | [[SQL Básico]], [[Modelagem de Dados]] | modelar o banco de uma biblioteca |
| 6 | [[API REST]], [[Supabase]] | lista de tarefas com login |
| 7 | [[Game Loop]] + [[Phaser]] ou [[Godot]] | jogo curto com 1 fase |
| 8 | [[Testes de Software]], [[Clean Code]] | refatorar e testar um projeto antigo |

## Como estudar TI
- **Faça, não só assista**: 20 min de vídeo pedem 1 h de prática
- **Projeto pequeno e terminado** vale mais que projeto grande pela metade
- **Leia a mensagem de erro inteira** antes de pedir ajuda
- **Documentação oficial** primeiro (MDN, docs do Godot, docs do Supabase)
- **Ensine alguém**: se não consegue explicar, ainda não entendeu
- **Use [[IA]] como tutor** (ver [[IA na Sala de Aula]]), não como copiador

## Glossário rápido
| Termo | Significa |
|---|---|
| Deploy | colocar o sistema no ar |
| Bug | defeito; **debug** = caçar o defeito |
| Framework | estrutura pronta que dita como organizar o código (React, Phaser) |
| Biblioteca | código pronto que você chama quando quer |
| Stack | conjunto de tecnologias de um projeto |
| Open source | código aberto, qualquer um pode ver e contribuir |
| Legado | sistema antigo que ainda precisa funcionar |

#mapa$md$),

-- ================================================================== FUNDAMENTOS
('Lógica de Programação', $md$Pensar o passo a passo antes do código. Todo programa é feito de 3 coisas:

| Estrutura | O que faz | Exemplo |
|---|---|---|
| **Sequência** | um passo depois do outro | ler, calcular, mostrar |
| **Decisão** | escolhe um caminho | `if / else`, `switch` |
| **Repetição** | repete até uma condição | `for`, `while` |

## Peças básicas
- **Variável**: caixa com nome que guarda um valor
- **Tipos**: número, texto (string), booleano, lista, objeto
- **Operadores**: `+ - * / %`, comparação `== != > <`, lógicos `&& || !`
- **Função**: bloco com nome que recebe entrada e devolve saída

## Como resolver um problema
1. Entender a entrada e a saída esperada
2. Resolver **um exemplo à mão**
3. Escrever em português (pseudocódigo)
4. Traduzir pra linguagem
5. Testar com casos de borda (zero, vazio, negativo)

> [!dica] Teste de mesa
> Anote o valor de cada variável a cada linha. Acha bug sem rodar nada.

Próximo passo: [[Estruturas de Dados]]. Na prática: [[JavaScript]].

---
## Aprofundando

### Pseudocódigo → código
```text
leia nota1, nota2
media ← (nota1 + nota2) / 2
se media >= 7 então escreva "Aprovado"
senão se media >= 5 então escreva "Recuperação"
senão escreva "Reprovado"
```
```js
const media = (nota1 + nota2) / 2;
if (media >= 7) console.log('Aprovado');
else if (media >= 5) console.log('Recuperação');
else console.log('Reprovado');
```

### Laços
```js
for (let i = 1; i <= 10; i++) console.log(i);        // sei quantas vezes
let vidas = 3;
while (vidas > 0) { vidas--; }                        // repete enquanto a condição for verdadeira
for (const aluno of alunos) console.log(aluno.nome);  // percorre uma lista
```

### Tabela-verdade
| A | B | A E B (`&&`) | A OU B | NÃO A (`!`) |
|---|---|---|---|---|
| V | V | V | V | F |
| V | F | F | V | F |
| F | V | F | V | V |
| F | F | F | F | V |

### Erros clássicos de iniciante
- `=` (atribuir) no lugar de `===` (comparar)
- Laço que nunca termina (esqueceu de mudar a variável da condição)
- Índice começando em 1 (listas começam em **0**)
- Somar texto com número: `'5' + 3` dá `'53'`
- Variável usada antes de receber valor

### Exercícios pra treinar
1. Ler 3 números e mostrar o maior
2. Tabuada de um número de 1 a 10
3. Somar os números pares de 1 a 100
4. Dizer se um ano é bissexto
5. Contar quantas vogais tem uma palavra
6. Jogo de adivinhar número (com "maior" / "menor")

> [!dica] Fluxograma
> Losango = decisão, retângulo = ação, setas = caminho. Desenhar antes ajuda quem trava no código.

#dev #conceito$md$),

('Estruturas de Dados', $md$Jeitos de organizar dados na memória. Escolher a certa deixa o programa simples e rápido.

| Estrutura | Ideia | Bom pra |
|---|---|---|
| **Array / lista** | itens em ordem, por índice | percorrer, acessar pela posição |
| **Objeto / dicionário (hash map)** | chave → valor | buscar por nome/id em O(1) |
| **Pilha (stack)** | último que entra, primeiro que sai | desfazer (Ctrl+Z), chamadas de função |
| **Fila (queue)** | primeiro que entra, primeiro que sai | atendimento, tarefas em ordem |
| **Conjunto (set)** | sem repetidos | tirar duplicados, "já vi isso?" |
| **Árvore** | hierarquia pai → filhos | pastas, DOM do [[HTML]], cenas do [[Godot]] |
| **Grafo** | nós ligados por arestas | mapas, redes sociais, este grafo de notas |

## Em JavaScript
```js
const lista = [3, 1, 2];            // array
const aluno = { nome: 'Ana' };      // objeto
const vistos = new Set();           // conjunto
const notas = new Map();            // dicionário
```

Custo de cada operação: [[Complexidade de Algoritmos]].

---
## Aprofundando

### Métodos de array que mais aparecem
| Método | Faz | Exemplo |
|---|---|---|
| `push` / `pop` | põe / tira no fim | pilha |
| `shift` / `unshift` | tira / põe no começo | fila |
| `map` | transforma cada item | `notas.map(n => n * 10)` |
| `filter` | mantém os que passam | `alunos.filter(a => a.nota >= 7)` |
| `find` | primeiro que passa | `alunos.find(a => a.id === 3)` |
| `reduce` | junta tudo num valor | `notas.reduce((s, n) => s + n, 0)` |
| `sort` | ordena | `notas.sort((a, b) => a - b)` |
| `includes` | tem ou não | `tags.includes('ia')` |

### Pilha e fila na prática
```js
const historico = [];          // pilha: desfazer
historico.push('digitou A');
historico.pop();               // desfaz o último

const fila = ['Ana', 'Bia'];   // fila: atendimento
fila.push('Caio');             // chega no fim
fila.shift();                  // atende o primeiro (Ana)
```

### Matriz (lista de listas)
Tabuleiro, mapa de tiles, planilha:
```js
const mapa = [
  [1, 1, 1],
  [1, 0, 1],   // 0 = caminho, 1 = parede
  [1, 1, 1],
];
mapa[1][1];    // linha 1, coluna 1 → 0
```

### Árvore e grafo
- **Percorrer em profundidade (DFS)**: vai até o fim de um galho antes de voltar — achar saída de labirinto
- **Percorrer em largura (BFS)**: visita vizinhos por camadas — menor caminho em grade (fantasma perseguindo no Pacman)

### Qual escolher?
| Preciso… | Use |
|---|---|
| manter ordem e percorrer | array |
| achar rápido por chave | objeto / `Map` |
| saber se já existe | `Set` |
| desfazer / voltar | pilha |
| processar na ordem de chegada | fila |

#dev #conceito$md$),

('Complexidade de Algoritmos', $md$**Big O**: como o tempo cresce quando a entrada cresce. Não mede segundos, mede **tendência**.

| Notação | Nome | Exemplo |
|---|---|---|
| O(1) | constante | pegar `lista[5]`, buscar em `Map` |
| O(log n) | logarítmica | busca binária em lista ordenada |
| O(n) | linear | percorrer a lista uma vez |
| O(n log n) | — | ordenar bem (`sort`) |
| O(n²) | quadrática | laço dentro de laço |
| O(2ⁿ) | exponencial | testar todas as combinações |

> [!dica] Regra prática
> Laço dentro de laço sobre a mesma lista grande? Provavelmente dá pra trocar por um `Set` ou `Map` e virar O(n).

Ver [[Estruturas de Dados]].

---
## Aprofundando

### Na prática: buscar um aluno
```js
// O(n): olha um por um
const a = alunos.find(a => a.matricula === m);

// O(1): monta o índice uma vez e consulta direto
const porMatricula = new Map(alunos.map(a => [a.matricula, a]));
porMatricula.get(m);
```

### Busca binária (O(log n))
Só funciona em lista **ordenada**: olha o meio, descarta metade, repete.
```js
function buscaBinaria(lista, alvo) {
  let ini = 0, fim = lista.length - 1;
  while (ini <= fim) {
    const meio = Math.floor((ini + fim) / 2);
    if (lista[meio] === alvo) return meio;
    if (lista[meio] < alvo) ini = meio + 1; else fim = meio - 1;
  }
  return -1;
}
```
1 milhão de itens → no máximo **20** comparações.

### Quanto isso importa
| n | O(n) | O(n log n) | O(n²) |
|---|---|---|---|
| 10 | 10 | ~33 | 100 |
| 1.000 | 1.000 | ~10 mil | 1 milhão |
| 1.000.000 | 1 milhão | ~20 milhões | 1 trilhão 😱 |

### Algoritmos de ordenação
| Algoritmo | Complexidade | Nota |
|---|---|---|
| Bubble sort | O(n²) | didático, lento |
| Selection / Insertion | O(n²) | insertion é bom pra lista quase ordenada |
| Merge sort | O(n log n) | estável, usa memória extra |
| Quick sort | O(n log n) em média | muito usado |

### Memória também conta
Complexidade de **espaço**: um `Map` de índice gasta memória pra ganhar tempo. Quase sempre é uma troca.

> [!info] Em jogos
> Testar colisão de todos contra todos é O(n²). Engines dividem o mapa em regiões pra comparar só quem está perto.

#dev #conceito$md$),

('Programação Orientada a Objetos', $md$**POO**: organizar o código em **objetos** que juntam dados (atributos) e comportamentos (métodos).

## 4 pilares
| Pilar | Ideia |
|---|---|
| **Encapsulamento** | esconde o detalhe interno, expõe só o necessário |
| **Herança** | classe filha reaproveita a mãe (`Inimigo` → `Fantasma`) |
| **Polimorfismo** | mesmo método, comportamento diferente em cada classe |
| **Abstração** | modela só o que importa pro problema |

```js
class Personagem {
  constructor(nome, vida) { this.nome = nome; this.vida = vida; }
  levarDano(qtd) { this.vida = Math.max(0, this.vida - qtd); }
}
class Chefe extends Personagem {
  levarDano(qtd) { super.levarDano(qtd / 2); } // chefe aguenta mais
}
```

> [!info] Composição > herança
> Muitas vezes é melhor "ter" um componente do que "ser" uma subclasse. O [[Godot]] usa muito isso com nós.

Ver [[Clean Code]].

---
## Aprofundando

### Classe × objeto
- **Classe**: a forma (molde do biscoito)
- **Objeto / instância**: cada biscoito feito com ela
```js
const p1 = new Personagem('Pac', 3);
const p2 = new Personagem('Ms. Pac', 3);   // mesma classe, objetos diferentes
```

### Encapsulamento de verdade
```js
class Conta {
  #saldo = 0;                          // privado: só a classe mexe
  depositar(v) { if (v > 0) this.#saldo += v; }
  get saldo() { return this.#saldo; }  // leitura controlada
}
```

### Polimorfismo
```js
const inimigos = [new Fantasma(), new Morcego(), new Chefe()];
inimigos.forEach(i => i.mover());   // cada um se move do seu jeito
```

### Composição
```js
class Jogador {
  constructor() {
    this.vida = new Vida(3);
    this.inventario = new Inventario();
  }
}
```
"O jogador **tem** vida e inventário" — mais flexível que uma herança comprida (`Jogador extends Vivo extends Entidade…`).

### Princípios SOLID (resumo)
| Letra | Ideia |
|---|---|
| **S** | cada classe com uma responsabilidade |
| **O** | aberta pra extensão, fechada pra modificação |
| **L** | a filha pode substituir a mãe sem quebrar nada |
| **I** | interfaces pequenas e específicas |
| **D** | dependa de abstrações, não de detalhes |

### Em outras linguagens
- **C#** (Unity): `public class Inimigo : MonoBehaviour`
- **GDScript** ([[Godot]]): `extends CharacterBody2D` + `class_name Inimigo`
- **Java**: tudo é classe; `interface` e `extends`

#dev #conceito$md$),

('Terminal', $md$Controlar o computador digitando comandos. Mais rápido, automatizável e é onde rodam [[Git]], Node, [[Docker]] e os [[Agentes de IA]].

| Faz | Linux/macOS (bash) | Windows (PowerShell) |
|---|---|---|
| Onde estou | `pwd` | `pwd` |
| Listar | `ls -la` | `ls` |
| Entrar na pasta | `cd pasta` | `cd pasta` |
| Voltar | `cd ..` | `cd ..` |
| Criar pasta | `mkdir nome` | `mkdir nome` |
| Ver arquivo | `cat arq.txt` | `cat arq.txt` |
| Apagar | `rm arq` | `Remove-Item arq` |
| Limpar tela | `clear` | `cls` |

## Atalhos
- **Tab**: completa nome · **↑**: comando anterior · **Ctrl+C**: interrompe
- `comando --help`: ajuda de quase tudo

> [!atencao] `rm -rf`
> Apaga sem lixeira e sem perguntar. Confira o caminho duas vezes.

Ver [[Linux]].

---
## Aprofundando

### Caminhos
- **Absoluto**: desde a raiz — `C:\Users\ana\projeto` ou `/home/ana/projeto`
- **Relativo**: a partir de onde você está — `./src`, `../imagens`
- `~` = sua pasta pessoal · `.` = aqui · `..` = pasta de cima

### Mais comandos úteis
| Faz | bash | PowerShell |
|---|---|---|
| Copiar | `cp a.txt b.txt` | `Copy-Item a.txt b.txt` |
| Mover / renomear | `mv a.txt pasta/` | `Move-Item a.txt pasta\` |
| Criar arquivo vazio | `touch nota.md` | `New-Item nota.md` |
| Procurar texto | `grep "erro" log.txt` | `Select-String "erro" log.txt` |
| Ver começo / fim | `head` / `tail` | `Get-Content -Head 10` / `-Tail 10` |
| Histórico | `history` | `Get-History` |

### Encadear e redirecionar
```bash
npm install && npm start      # só roda o segundo se o primeiro der certo
ls > lista.txt                # salva a saída num arquivo
cat log.txt | grep erro       # pipe: saída de um vira entrada do outro
```

### Variáveis de ambiente
Configurações que os programas leem: `PATH` (onde procurar programas), chaves de API.
```bash
echo $PATH                    # bash
echo $env:PATH                # PowerShell
```
Erro "comando não encontrado" quase sempre é programa fora do `PATH`.

### Ferramentas que você vai rodar aqui
`node` / `npm` · `git` · `python` · `docker` · `ssh usuario@servidor` · agentes de IA ([[Claude Code]], [[Codex]])

> [!dica] Terminal no VS Code
> Ctrl+' abre um terminal já na pasta do projeto.

#ferramenta #infra$md$),

-- ================================================================== GIT
('Git', $md$Controle de versão: guarda o histórico do projeto em "fotos" (**commits**). Dá pra voltar, comparar e trabalhar em paralelo.

## Fluxo do dia a dia
```bash
git status                    # o que mudou
git add arquivo               # prepara (ou: git add .)
git commit -m "mensagem"      # salva a foto
git pull --rebase             # traz o que os outros enviaram
git push                      # envia pro GitHub
```

## Branches
```bash
git switch -c minha-feature   # cria e entra num branch
git switch main               # volta
git merge minha-feature       # junta no branch atual
```

## Desfazer
| Situação | Comando |
|---|---|
| Descartar mudança num arquivo | `git restore arquivo` |
| Tirar do `add` | `git restore --staged arquivo` |
| Arrumar a última mensagem | `git commit --amend` (antes do push) |
| Desfazer um commit já enviado | `git revert <hash>` |

> [!atencao] Nunca `push --force` na main
> Reescreve o histórico de todo mundo.

Hospedagem: [[GitHub]]. Ver [[Terminal]].

---
## Aprofundando

### Os 3 lugares
```text
pasta de trabalho  --git add-->  área de preparo (stage)  --git commit-->  repositório
```
`git push` manda o repositório local pro remoto ([[GitHub]]); `git pull` traz.

### Começar um projeto
```bash
git init                                  # projeto novo
git clone https://github.com/user/repo    # baixar um existente
git config --global user.name "Seu Nome"
git config --global user.email "voce@email.com"
```

### Ver o histórico
```bash
git log --oneline --graph     # histórico resumido com os branches
git diff                      # o que mudou e ainda não foi pro stage
git show <hash>               # o que um commit mudou
git blame arquivo             # quem mudou cada linha
```

### `.gitignore`
Arquivo com o que o Git deve **ignorar**:
```text
node_modules/
.env
*.log
.DS_Store
```

### Conflito de merge
Acontece quando duas pessoas mudam a mesma linha:
```text
<<<<<<< HEAD
cor = "azul"
=======
cor = "verde"
>>>>>>> outro-branch
```
Escolha (ou junte) as versões, apague as marcas, `git add` e `git commit`.

### Boas mensagens de commit
- Verbo + o que mudou: "Adiciona tela de login", "Corrige soma do carrinho"
- Um assunto por commit
- Commit pequeno e frequente

> [!atencao] Segredos no histórico
> Senha commitada continua no histórico mesmo depois de apagada. Troque a senha.

#ferramenta #dev$md$),

('GitHub', $md$Site que hospeda repositórios [[Git]] e junta ferramentas de equipe.

## Principais recursos
- **Repositório**: o projeto com todo o histórico
- **Pull Request (PR)**: proposta de mudança com revisão antes de juntar
- **Issues**: lista de tarefas e bugs
- **Actions**: automação (CI/CD): roda [[Testes de Software]] e publica a cada push
- **Pages**: hospeda site estático de graça (`usuario.github.io/repo`)
- **Codespaces**: VS Code na nuvem, sem instalar nada
- **Copilot**: [[IA]] que sugere código

## Publicar no Pages
Settings → Pages → Source: branch `main`, pasta `/root` → espera 1-2 min.

> [!dica] README
> O `README.md` é a vitrine do projeto: o que é, como rodar, prints.

---
## Aprofundando

### Fluxo de Pull Request
1. Cria um branch: `git switch -c corrige-menu`
2. Commita e dá push: `git push -u origin corrige-menu`
3. No GitHub: **Compare & pull request**
4. Alguém revisa, comenta, aprova
5. **Merge** → a mudança entra na `main`

### Fork × clone
- **Clone**: cópia na sua máquina
- **Fork**: cópia na **sua conta** do GitHub de um repositório de outra pessoa (pra propor mudanças em projeto alheio)

### GitHub Actions (exemplo)
`.github/workflows/testes.yml`:
```yaml
on: push
jobs:
  testar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test
```

### Markdown no README
```markdown
# Nome do Projeto
Jogo de nave feito em Phaser.
![print](print.png)
## Como rodar
1. Abra com o Live Server
```

### Perfil que chama atenção
- Repositório com o seu usuário (`usuario/usuario`) vira a **página de perfil**
- **Fixe** os 6 melhores projetos
- Descrição curta + link do site em cada repositório

### Recursos pra estudante
**GitHub Student Developer Pack** (education.github.com): Copilot, domínio e ferramentas pagas de graça com e-mail de escola.

#ferramenta #dev$md$),

-- ================================================================== WEB
('Como a Web Funciona', $md$O que acontece ao digitar um endereço e apertar Enter:

1. **DNS** traduz `site.com` → IP (ver [[Redes de Computadores]])
2. O navegador abre conexão **TCP** + **TLS** (o cadeado do HTTPS)
3. Envia um pedido [[HTTP]]: `GET /`
4. O **servidor** responde com [[HTML]]
5. O navegador baixa [[CSS]], [[JavaScript]] e imagens
6. Monta a página (DOM), aplica estilo e roda os scripts

## Front-end × Back-end
| Front-end | Back-end |
|---|---|
| roda no navegador | roda no servidor |
| HTML, CSS, JS | Node, Python, Java, C#, PHP |
| o que o usuário vê | regras, [[Banco de Dados]], segurança |

Comunicação entre eles: [[API REST]] com [[JSON]]. Back-end pronto: [[Supabase]].

> [!info] F12
> As DevTools mostram tudo isso: aba Network (pedidos), Console (erros), Elements (DOM).

---
## Aprofundando

### Anatomia de uma URL
```text
https://www.loja.com:443/produtos/tenis?cor=azul&p=2#avaliacoes
protocolo: https
domínio:   www.loja.com
porta:     443
caminho:   /produtos/tenis
query:     ?cor=azul&p=2
âncora:    #avaliacoes
```

### Site estático × dinâmico
| Estático | Dinâmico |
|---|---|
| arquivos prontos (HTML/CSS/JS) | página montada na hora pelo servidor |
| hospedagem grátis (GitHub Pages) | precisa de servidor/back-end |
| portfólio, landing page | loja, rede social, sistema com login |

### Renderização
- **Client-side**: o navegador recebe JS e monta a tela (React, apps)
- **Server-side**: o servidor manda o HTML pronto (melhor pro Google achar)

### Cookies, localStorage e sessão
| | Onde fica | Pra quê |
|---|---|---|
| **Cookie** | navegador, vai junto em todo pedido | manter login |
| **localStorage** | navegador, só o JS lê | preferências (tema escuro) |
| **sessionStorage** | some ao fechar a aba | dados temporários |

### Desempenho
- Imagens otimizadas (WebP, tamanho certo)
- **Cache**: o navegador guarda arquivos pra não baixar de novo
- **CDN**: cópias do site espalhadas pelo mundo, mais perto do usuário
- Lighthouse (F12 → Lighthouse) dá nota de desempenho e acessibilidade

### Navegadores e motores
Chrome / Edge / Opera (Blink) · Firefox (Gecko) · Safari (WebKit). Teste em mais de um.

#web #conceito$md$),

('HTML', $md$Linguagem de **marcação**: a estrutura e o conteúdo da página. Não é linguagem de programação.

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Minha página</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Olá</h1>
  <script src="app.js"></script>
</body>
</html>
```

## Tags semânticas
`header` · `nav` · `main` · `section` · `article` · `aside` · `footer`
Ajudam leitor de tela, Google e quem lê o código.

> [!dica] Acessibilidade
> Toda `<img>` com `alt`, todo `<input>` com `<label>`, botão é `<button>` (não `<div>`).

Estilo: [[CSS]]. Comportamento: [[JavaScript]].

---
## Aprofundando

### Tags essenciais
| Tag | Pra quê |
|---|---|
| `h1`…`h6` | títulos (um `h1` por página) |
| `p` | parágrafo |
| `a href` | link |
| `img src alt` | imagem |
| `ul` / `ol` + `li` | lista sem / com número |
| `div` / `span` | caixa genérica de bloco / de linha |
| `button` | botão |
| `table`, `tr`, `th`, `td` | tabela de dados |

### Formulário
```html
<form>
  <label for="email">E-mail</label>
  <input id="email" type="email" required>

  <label for="curso">Curso</label>
  <select id="curso">
    <option>Jogos Digitais</option>
    <option>Desenvolvimento de Sistemas</option>
  </select>

  <button type="submit">Enviar</button>
</form>
```
Tipos de `input`: `text`, `email`, `password`, `number`, `date`, `checkbox`, `radio`, `file`, `range`, `color`.

### Atributos importantes
- `id` (único na página) × `class` (pode repetir)
- `alt` (texto da imagem), `title` (dica ao passar o mouse)
- `target="_blank" rel="noopener"` (abrir em nova aba com segurança)
- `data-*` (guardar dado pro JS: `data-id="42"`)

### Mídia
```html
<video src="trailer.mp4" controls width="640"></video>
<audio src="musica.mp3" controls></audio>
<iframe src="https://www.youtube.com/embed/ID"></iframe>
```

### Erros comuns
- Fechar tag errada (`<b><i>texto</b></i>`)
- Esquecer `<meta name="viewport">` (site fica minúsculo no celular)
- Usar `<br>` pra dar espaço (isso é papel do [[CSS]])
- Título só com tamanho de fonte, sem `h1`/`h2`

> [!dica] Validador
> validator.w3.org aponta erros de HTML.

#web$md$),

('CSS', $md$Linguagem de **estilo**: cor, fonte, espaçamento e layout do [[HTML]].

## Box model
Todo elemento é uma caixa: **conteúdo → padding → border → margin**.
Use `* { box-sizing: border-box; }` pra largura incluir padding e borda.

## Layout
| Ferramenta | Pra quê |
|---|---|
| **Flexbox** | alinhar numa linha OU coluna (menus, cards lado a lado) |
| **Grid** | linhas E colunas ao mesmo tempo (layout da página) |

```css
.cards { display: flex; gap: 16px; justify-content: center; }
.pagina { display: grid; grid-template-columns: 200px 1fr; }
@media (max-width: 600px) { .pagina { grid-template-columns: 1fr; } }
```

## Prioridade (especificidade)
`style=""` > `#id` > `.classe` > `tag`. Empate: vence o que vem por último.

> [!dica] Variáveis
> `:root { --cor: #6c5ce7; }` e depois `color: var(--cor);` — muda o tema num lugar só.

---
## Aprofundando

### Seletores
| Seletor | Pega |
|---|---|
| `p` | todo parágrafo |
| `.card` | classe |
| `#menu` | id |
| `nav a` | `a` dentro de `nav` |
| `.card > h2` | `h2` filho direto |
| `a:hover` | ao passar o mouse |
| `li:nth-child(2)` | o 2º item |
| `input[type="email"]` | por atributo |

### Unidades
| Unidade | Relativa a |
|---|---|
| `px` | fixa |
| `%` | elemento pai |
| `rem` | fonte da raiz (1rem ≈ 16px) — use pra texto |
| `vw` / `vh` | largura / altura da tela |
| `fr` | fração do espaço livre no Grid |

### Posicionamento
- `static` (padrão) · `relative` (ponto de referência) · `absolute` (solto, em relação ao pai `relative`) · `fixed` (preso na tela) · `sticky` (gruda ao rolar)

### Flexbox de bolso
```css
.linha {
  display: flex;
  justify-content: space-between;  /* eixo principal */
  align-items: center;             /* eixo cruzado */
  flex-wrap: wrap;                 /* quebra linha no celular */
}
```

### Transição e animação
```css
.botao { transition: transform .2s; }
.botao:hover { transform: scale(1.05); }

@keyframes pisca { 50% { opacity: 0; } }
.alerta { animation: pisca 1s infinite; }
```

### Mobile first
Escreva primeiro pro celular e use `@media (min-width: 768px)` pra telas maiores.

### Pra praticar
**Flexbox Froggy** e **Grid Garden** (jogos) · CSS Diner (seletores).

#web$md$),

('JavaScript', $md$A linguagem que roda no navegador (e no servidor, com **Node.js**). Dá comportamento ao [[HTML]].

## Essencial
```js
const nome = 'Ana';                  // não muda
let pontos = 0;                      // muda
const dobro = n => n * 2;            // arrow function
const lista = [1, 2, 3].map(dobro);  // [2, 4, 6]
console.log(`Olá, ${nome}!`);        // template string
```

## DOM e eventos
```js
const btn = document.querySelector('#btn');
btn.addEventListener('click', () => { btn.textContent = 'Clicou!'; });
```

## Assíncrono
```js
const resp = await fetch('https://api.exemplo.com/itens');
const dados = await resp.json();
```
Ver [[HTTP]], [[API REST]] e [[JSON]].

> [!atencao] `==` × `===`
> Use sempre `===`. O `==` converte tipos: `'0' == 0` é `true`.

Base: [[Lógica de Programação]]. Jogos: [[Phaser]].

---
## Aprofundando

### Tipos
`string` · `number` · `boolean` · `null` · `undefined` · `object` (inclui arrays) · `bigint` · `symbol`
```js
typeof 'oi'       // 'string'
Array.isArray([]) // true
```

### Objetos e desestruturação
```js
const aluno = { nome: 'Ana', notas: [8, 9] };
const { nome, notas } = aluno;              // tira as propriedades
const copia = { ...aluno, turma: 'Jogos' }; // espalha e acrescenta
```

### Funções
```js
function soma(a, b = 0) { return a + b; }   // parâmetro com valor padrão
const media = (...ns) => ns.reduce((s, n) => s + n, 0) / ns.length;
```

### Escopo
- `let`/`const`: vale só dentro do `{ }` onde nasceu
- Evite `var` (escopo confuso)

### Tratamento de erro
```js
try {
  const dados = JSON.parse(texto);
} catch (erro) {
  console.error('JSON inválido:', erro.message);
}
```

### Promise e async/await
```js
async function carregar() {
  try {
    const resp = await fetch('/api/alunos');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
  } catch (e) {
    mostrarErro('Não deu pra carregar');
  }
}
```

### Módulos
```js
// util.js
export function dobro(n) { return n * 2; }
// app.js
import { dobro } from './util.js';
```
No HTML: `<script type="module" src="app.js"></script>`.

### Depurar
- `console.log`, `console.table(lista)`
- `debugger;` pausa o código com o F12 aberto
- Aba **Sources** do F12: ponto de parada, ver variáveis

### Ecossistema
Node.js (servidor) · npm (pacotes) · TypeScript (JS com tipos) · React / Vue (interfaces)

#web #dev$md$),

('HTTP', $md$Protocolo de conversa entre navegador (cliente) e servidor: **pedido → resposta**.

## Métodos
| Método | Pra quê |
|---|---|
| `GET` | buscar |
| `POST` | criar |
| `PUT` / `PATCH` | atualizar (tudo / parte) |
| `DELETE` | apagar |

## Códigos de status
| Faixa | Significa | Exemplos |
|---|---|---|
| 2xx | deu certo | 200 OK · 201 Created · 204 No Content |
| 3xx | redirecionamento | 301 · 304 Not Modified |
| 4xx | erro de quem pediu | 400 · 401 sem login · 403 proibido · 404 · 429 muitas requisições |
| 5xx | erro do servidor | 500 · 502 · 503 |

**HTTPS** = HTTP + criptografia (TLS). Sem ele, quem está na mesma rede lê tudo.

**CORS**: regra do navegador que bloqueia um site de ler resposta de outro domínio, a não ser que o servidor libere.

Ver [[Como a Web Funciona]] e [[API REST]].

---
## Aprofundando

### Como é um pedido de verdade
```http
POST /api/alunos HTTP/1.1
Host: escola.com
Content-Type: application/json
Authorization: Bearer eyJhbGci...

{"nome": "Ana"}
```
E a resposta:
```http
HTTP/1.1 201 Created
Content-Type: application/json

{"id": 42, "nome": "Ana"}
```

### Cabeçalhos (headers) comuns
| Header | Pra quê |
|---|---|
| `Content-Type` | formato do corpo (`application/json`, `text/html`) |
| `Authorization` | quem é você (token) |
| `Accept` | formato que eu aceito |
| `Cache-Control` | por quanto tempo guardar |
| `Set-Cookie` / `Cookie` | sessão |

### Idempotente?
Repetir o pedido dá o mesmo resultado?
- `GET`, `PUT`, `DELETE`: sim
- `POST`: não (dois cliques = dois pedidos criados — por isso desabilite o botão ao enviar)

### Sem estado (stateless)
Cada pedido é independente: o servidor não "lembra" de você. Por isso o login vai num **cookie** ou **token** em todo pedido.

### Ver na prática
- F12 → **Network**: cada pedido, status, tempo, cabeçalhos
- Terminal: `curl -i https://api.github.com`
- Apps: **Postman**, **Insomnia**, extensão **Thunder Client** (VS Code)

### Versões
HTTP/1.1 (um pedido por vez por conexão) → HTTP/2 (vários ao mesmo tempo) → HTTP/3 (sobre UDP, mais rápido em rede ruim).

#web #redes$md$),

('API REST', $md$**API**: o "cardápio" que um sistema oferece pra outros usarem. **REST**: estilo de API sobre [[HTTP]], com recursos em URLs.

| Ação | Método + URL |
|---|---|
| listar alunos | `GET /alunos` |
| ver um | `GET /alunos/42` |
| criar | `POST /alunos` + corpo em [[JSON]] |
| atualizar | `PATCH /alunos/42` |
| apagar | `DELETE /alunos/42` |

```js
const resp = await fetch('/alunos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nome: 'Ana' }),
});
if (!resp.ok) throw new Error(resp.status);
```

## Pra treinar
- **JSONPlaceholder** (`jsonplaceholder.typicode.com`): API falsa de posts/usuários
- **PokéAPI**, **ViaCEP**: APIs públicas e gratuitas

> [!atencao] Chave de API
> Nunca no front-end nem no GitHub. Fica no servidor ou em variável de ambiente.

Ver [[Supabase]].

---
## Aprofundando

### Boas práticas de URL
- Substantivo no plural: `/alunos`, não `/pegarAlunos`
- Hierarquia: `/turmas/3/alunos`
- Filtros na query: `/alunos?turma=jogos&ordem=nome`
- Paginação: `/alunos?pagina=2&limite=20`
- Versão: `/v1/alunos`

### Respostas consistentes
```json
{ "erro": "Nome é obrigatório", "campo": "nome" }
```
Com o status certo: `400` (dado inválido), `401` (sem login), `404` (não existe), `409` (já existe).

### Autenticação
| Jeito | Como |
|---|---|
| **API key** | chave fixa no header (`x-api-key`) — serviços entre servidores |
| **Token (JWT)** | depois do login, mandado em `Authorization: Bearer ...` |
| **OAuth** | "Entrar com Google" — outro serviço confirma quem você é |

### Exemplo com ViaCEP
```js
const resp = await fetch('https://viacep.com.br/ws/01001000/json/');
const end = await resp.json();
console.log(end.logradouro, end.localidade);
```

### Exemplo com PokéAPI
```js
const p = await (await fetch('https://pokeapi.co/api/v2/pokemon/pikachu')).json();
img.src = p.sprites.front_default;
```

### Outros estilos de API
- **GraphQL**: o cliente diz exatamente quais campos quer, num endpoint só
- **WebSocket**: conexão aberta nos dois sentidos (chat, jogo online)
- **Webhook**: o servidor **te chama** quando algo acontece (pagamento aprovado)

### Limites
**Rate limit**: máximo de pedidos por minuto. Passou → `429 Too Many Requests`. Guarde em cache o que não muda.

#web #conceito$md$),

('JSON', $md$**JavaScript Object Notation**: formato de texto pra trocar dados. Padrão das [[API REST]].

```json
{
  "nome": "Ana",
  "idade": 16,
  "ativo": true,
  "notas": [8.5, 9],
  "turma": { "id": 3, "curso": "Jogos" },
  "apelido": null
}
```

## Regras (onde mais se erra)
- Chaves **sempre** com aspas duplas
- Sem vírgula depois do último item
- Sem comentários
- Tipos: texto, número, booleano, `null`, lista, objeto (não tem data nem função)

```js
JSON.stringify(obj)   // objeto → texto
JSON.parse(texto)     // texto → objeto
```

Ver [[JavaScript]].

---
## Aprofundando

### Lendo dados aninhados
```js
const dados = {
  turma: 'Jogos',
  alunos: [
    { nome: 'Ana', notas: [8, 9] },
    { nome: 'Bia', notas: [7, 10] },
  ],
};
dados.alunos[1].notas[0];          // 7
dados.alunos.map(a => a.nome);     // ['Ana', 'Bia']
```

### Formatar bonito
```js
JSON.stringify(obj, null, 2);      // com indentação de 2 espaços
```

### Erros comuns
| Erro | Causa |
|---|---|
| `Unexpected token '` | usou aspas simples |
| `Unexpected token }` | vírgula sobrando no fim |
| `Unexpected token <` | a API devolveu HTML (página de erro), não JSON |
| `[object Object]` na tela | mostrou o objeto direto; use `JSON.stringify` |

### Salvar no navegador
```js
localStorage.setItem('save', JSON.stringify({ fase: 3, pontos: 1200 }));
const save = JSON.parse(localStorage.getItem('save') || '{}');
```
Ótimo pra **save de jogo** simples.

### Onde mais aparece
- `package.json` (configuração de projeto Node)
- `manifest.json` (app instalável)
- Configuração do VS Code (`settings.json`)
- Colunas `jsonb` no PostgreSQL / [[Supabase]]

### Parentes
- **YAML**: mais legível, usado em configuração (GitHub Actions, Docker Compose)
- **CSV**: tabela simples, abre no Excel
- **XML**: mais antigo, com tags

> [!dica] Visualizar
> Cole o JSON em jsonformatter.org ou abra a URL da API no Firefox: ele mostra em árvore.

#web #dados$md$),

-- ================================================================== DADOS
('Banco de Dados', $md$Lugar organizado pra **gravar, buscar e alterar** dados com segurança, mesmo com milhões de registros e muita gente usando ao mesmo tempo. No curso, o FinancApp usa o [[Supabase]], que roda um **PostgreSQL**.

## Banco × planilha
| Planilha | Banco de dados |
|---|---|
| uma pessoa por vez | muitos usuários ao mesmo tempo |
| qualquer valor em qualquer célula | tipo e regra por coluna (número, data, obrigatório) |
| "procurar" manual | consulta em [[SQL Básico]], rápida com índice |
| sem relação entre abas | tabelas ligadas por [[Chave Primária]] e estrangeira |

## Tipos
| Tipo | Como guarda | Exemplos |
|---|---|---|
| **Relacional (SQL)** | tabelas com linhas e colunas, ligadas por chaves | PostgreSQL, MySQL, SQLite, SQL Server |
| **Documento (NoSQL)** | documentos tipo [[JSON]] | MongoDB, Firestore |
| **Chave-valor** | chave → valor, muito rápido | Redis |
| **Grafo** | nós e ligações | Neo4j |

## Termos
- **SGBD**: o programa que gerencia o banco
- **Tabela / linha / coluna**: entidade / registro / atributo
- **Índice**: "sumário" que acelera a busca
- **Transação**: tudo ou nada (transferência: tira de um E põe no outro)
- **Backup**: sem ele, um `delete` errado é pra sempre

## Onde aparece nas aulas
1. Projeto FinancApp: a tabela de transações no Supabase
2. Modelagem de dados: o DER vem antes de criar as tabelas
3. Culminância: dados do sensor de umidade (ver [[IoT]])

## Pra revisar com a turma
- [x] Diferença entre banco de dados e planilha
- [ ] [[Chave Primária]] e chave estrangeira
- [ ] Normalização (1FN, 2FN e 3FN) — ver [[Modelagem de Dados]]
- [ ] `select` com `where`, `order by` e `join`

Linguagem: [[SQL Básico]]. Planejar: [[Modelagem de Dados]]. Pronto na nuvem: [[Supabase]].

---
## Aprofundando

### ACID (por que confiar no banco)
| Letra | Garante |
|---|---|
| **A**tomicidade | a transação acontece inteira ou nada |
| **C**onsistência | as regras (tipos, chaves) nunca são quebradas |
| **I**solamento | transações ao mesmo tempo não se atrapalham |
| **D**urabilidade | depois de confirmado, não se perde nem se a luz cair |

```sql
begin;
update contas set saldo = saldo - 100 where id = 1;
update contas set saldo = saldo + 100 where id = 2;
commit;   -- ou rollback; pra desfazer tudo
```

### Tipos de dados mais usados (PostgreSQL)
| Tipo | Guarda |
|---|---|
| `integer` / `bigint` | número inteiro |
| `numeric(10,2)` | dinheiro (nunca use `float` pra dinheiro) |
| `text` / `varchar(n)` | texto |
| `boolean` | verdadeiro/falso |
| `date` / `timestamptz` | data / data e hora com fuso |
| `uuid` | identificador único aleatório |
| `jsonb` | [[JSON]] |

### Restrições (constraints)
- `not null`: obrigatório
- `unique`: não repete
- `check (nota between 0 and 10)`: regra
- `default now()`: valor automático
- `references`: chave estrangeira (ver [[Chave Primária]])

### Índice
```sql
create index idx_alunos_turma on alunos (turma);
```
Acelera busca e ordenação por essa coluna; deixa insert um pouco mais lento. Crie nas colunas usadas em `where` e `join`.

### Quem trabalha com isso
**DBA** (administra o banco) · **analista de dados** · **engenheiro de dados** · todo **back-end**.

#banco-de-dados #dados #aula$md$),

('Chave Primária', $md$Coluna (ou conjunto de colunas) que **identifica cada linha** de uma tabela sem repetir. É o "CPF" da linha.

## Regras
- **Única**: duas linhas nunca têm o mesmo valor
- **Nunca vazia** (`not null`)
- **Não muda**: se mudar, quebra quem aponta pra ela

## Chave estrangeira (FK)
Coluna que **aponta** pra chave primária de outra tabela. É o que liga as tabelas.

```sql
create table categorias (
  id bigint generated always as identity primary key,
  nome text not null
);

create table transacoes (
  id bigint generated always as identity primary key,
  descricao text not null,
  valor numeric(10,2) not null,
  categoria_id bigint references categorias(id)   -- FK
);
```

## Natural × artificial
| Natural | Artificial (substituta) |
|---|---|
| já existe no mundo: CPF, e-mail, matrícula | criada só pra isso: `id` numérico ou UUID |
| pode mudar (e-mail) ou vazar (CPF) | nunca muda, não diz nada sobre a pessoa |

> [!dica] Na dúvida
> Use `id` artificial como chave primária e marque o natural como `unique`.

> [!atencao] Apagar quem é apontado
> Apagar uma categoria usada em transações dá erro (ou apaga junto, com `on delete cascade`). Decida de propósito.

Ver [[Modelagem de Dados]] e [[SQL Básico]].

---
## Aprofundando

### Chave composta
Quando **duas colunas juntas** identificam a linha:
```sql
create table entregas (
  aluno_id bigint references alunos(id),
  atividade_id bigint references atividades(id),
  nota numeric(4,2),
  primary key (aluno_id, atividade_id)   -- um aluno entrega cada atividade uma vez
);
```

### Ações ao apagar/atualizar
| Opção | Ao apagar a linha "mãe" |
|---|---|
| `on delete restrict` (padrão) | dá erro se alguém aponta pra ela |
| `on delete cascade` | apaga as "filhas" junto |
| `on delete set null` | as filhas ficam com a FK vazia |

```sql
categoria_id bigint references categorias(id) on delete set null
```

### Integer × UUID
| `id` numérico | UUID |
|---|---|
| `1, 2, 3…` curto e legível | `3f2a9c1e-…` longo |
| dá pra adivinhar o próximo | impossível de adivinhar |
| bom pra uso interno | bom pra URL pública e sistemas distribuídos |

### Erros que aparecem
- `duplicate key value violates unique constraint` → tentou repetir a PK
- `violates foreign key constraint` → apontou pra um id que não existe, ou apagou quem era apontado
- `null value in column "id"` → esqueceu do `generated` / `default`

### No diagrama (DER)
PK sublinhada ou com 🔑; FK com seta apontando pra tabela de origem. Ver [[Modelagem de Dados]].

#banco-de-dados #dados$md$),

('SQL Básico', $md$**SQL** (Structured Query Language): a linguagem pra conversar com um [[Banco de Dados]] relacional.

## Os quatro comandos do dia a dia (CRUD)
| Comando | Pra quê | Exemplo no FinancApp |
|---|---|---|
| `SELECT` | ler | listar as transações |
| `INSERT` | criar | lançar uma despesa |
| `UPDATE` | alterar | corrigir um valor |
| `DELETE` | apagar | remover um lançamento |

```sql
select descricao, valor from transacoes where tipo = 'despesa' order by valor desc;
select nome, nota from alunos where nota >= 7 order by nota desc;
insert into alunos (nome, turma) values ('Ana', 'Jogos');
update alunos set nota = 9 where id = 42;
delete from alunos where id = 42;
```

## Juntar e resumir
```sql
select t.nome, count(*) as qtd, avg(a.nota) as media
from alunos a
join turmas t on t.id = a.turma_id
group by t.nome
having avg(a.nota) > 6;
```

| JOIN | Traz |
|---|---|
| `inner join` | só o que combina dos dois lados |
| `left join` | tudo da esquerda, mesmo sem par |

## Filtros úteis
```sql
where nome ilike '%ana%'            -- contém, sem ligar pra maiúsculas
where valor between 10 and 50
where categoria in ('lazer', 'comida')
where apelido is null               -- nunca "= null"
limit 10                            -- só os 10 primeiros
```

> [!atencao] `update`/`delete` sem `where`
> Altera a tabela INTEIRA. Rode o `select` com o mesmo `where` antes.

Chaves e ligações: [[Chave Primária]]. Ver [[Modelagem de Dados]].

---
## Aprofundando

### Funções de agregação
```sql
select count(*)        from transacoes;              -- quantas linhas
select sum(valor)      from transacoes where tipo = 'despesa';
select avg(nota)       from alunos;
select min(valor), max(valor) from transacoes;
```

### `group by` passo a passo
```sql
select categoria, sum(valor) as total
from transacoes
where tipo = 'despesa'          -- 1. filtra linhas
group by categoria              -- 2. agrupa
having sum(valor) > 100         -- 3. filtra grupos
order by total desc;            -- 4. ordena
```
`where` filtra **antes** de agrupar; `having` filtra **depois**.

### Criar e alterar tabelas (DDL)
```sql
create table if not exists alunos (
  id bigint generated always as identity primary key,
  nome text not null,
  turma text,
  criado_em timestamptz default now()
);
alter table alunos add column email text unique;
drop table if exists temporaria;
```

### Subconsulta
```sql
select nome from alunos
where nota > (select avg(nota) from alunos);   -- acima da média
```

### Funções úteis
| Função | Exemplo |
|---|---|
| `upper`, `lower` | `upper(nome)` |
| `concat` | `concat(nome, ' - ', turma)` |
| `coalesce` | `coalesce(apelido, nome)` (primeiro não nulo) |
| `round` | `round(avg(nota), 1)` |
| `now()`, `current_date` | data atual |
| `extract` | `extract(month from data)` |

### Ordem de execução (o banco pensa assim)
`from` → `join` → `where` → `group by` → `having` → `select` → `order by` → `limit`

### SQL Injection
Nunca monte SQL juntando texto do usuário:
```js
// ❌ "select * from alunos where nome = '" + nome + "'"
// ✅ use parâmetros / a biblioteca: .eq('nome', nome)
```
Ver [[Cibersegurança]].

### Pra praticar
**SQLBolt**, **SQL Murder Mystery** (resolver um crime com SQL), **sql-practice.com**.

#sql #banco-de-dados$md$),

('Modelagem de Dados', $md$Planejar as tabelas antes de criar. Erro aqui custa caro depois.

## Etapas
1. **Conceitual**: entidades e relações (diagrama ER) — Aluno *faz* Atividade
2. **Lógico**: tabelas, colunas, chaves
3. **Físico**: o `create table` de verdade em [[SQL Básico]]

## Chaves
- **Primária (PK)**: identifica a linha (`id`)
- **Estrangeira (FK)**: aponta pra PK de outra tabela
Detalhes: [[Chave Primária]].

## Cardinalidade
| Tipo | Exemplo | Como fica |
|---|---|---|
| 1:1 | aluno – perfil | FK única |
| 1:N | turma – alunos | FK no lado N (`alunos.turma_id`) |
| N:N | alunos – atividades | tabela do meio (`entregas`) |

## Normalização
| Forma | Regra | Errado → certo |
|---|---|---|
| **1FN** | cada célula, um valor só | `telefones = "9999, 8888"` → tabela `telefones` |
| **2FN** | 1FN + tudo depende da chave **inteira** | em `(aluno_id, atividade_id, nome_aluno)`, o nome vai pra `alunos` |
| **3FN** | 2FN + nada depende de outra coluna que não é chave | `cidade` e `uf` repetidas → `cep` aponta pra `ceps` |

Resumo: **não repetir dado**. Se precisa mudar a mesma informação em dois lugares, a modelagem está errada.

---
## Aprofundando

### Exemplo completo: biblioteca da escola
```text
ALUNOS (id PK, nome, turma)
LIVROS (id PK, titulo, autor, ano)
EMPRESTIMOS (id PK, aluno_id FK→ALUNOS, livro_id FK→LIVROS, data_retirada, data_devolucao)
```
- Um aluno faz **vários** empréstimos (1:N)
- Um livro aparece em **vários** empréstimos ao longo do tempo (1:N)
- Aluno × livro é **N:N**, resolvido pela tabela `emprestimos`

### Como achar as entidades
1. Escreva o problema em texto
2. **Substantivos** viram candidatos a tabela (aluno, livro)
3. **Verbos** viram relacionamentos (aluno *pega* livro)
4. **Adjetivos/detalhes** viram colunas (título, data)

### Notação no DER
| Símbolo | Significa |
|---|---|
| retângulo | entidade (tabela) |
| losango | relacionamento |
| elipse | atributo |
| pé de galinha (crow's foot) | lado "muitos" |

### Ferramentas
**dbdiagram.io** (escreve texto, gera o diagrama) · **draw.io** · **brModelo** (muito usado em curso técnico) · editor de tabelas do [[Supabase]].

### Erros comuns de modelagem
- Guardar lista numa coluna (`"8, 9, 7"`)
- Guardar o **nome** em vez do **id** da outra tabela
- Coluna calculada que pode ficar desatualizada (`idade` → guarde `data_nascimento`)
- Tabela `dados` com tudo misturado
- Esquecer as datas (`criado_em`, `atualizado_em`)

### Exercício
Modele uma **loja de jogos**: clientes, jogos, plataformas, pedidos e itens do pedido. Quais são os N:N?

#dados #conceito$md$),

('Supabase', $md$Back-end pronto, open source, em cima do **PostgreSQL**. Dá [[Banco de Dados]], login, arquivos e tempo real sem montar servidor.

## Recursos
| Recurso | Pra quê |
|---|---|
| **Database** | Postgres com editor de tabelas e [[SQL Básico]] |
| **Auth** | login por e-mail, Google, GitHub… |
| **Storage** | guardar imagens e arquivos |
| **Realtime** | a tela atualiza quando o banco muda |
| **Edge Functions** | código no servidor |

```js
const { data, error } = await supabase
  .from('alunos').select('nome, nota').eq('turma', 'jogos');
```

## RLS (Row Level Security)
Regras **no banco** dizendo quem lê/grava cada linha. É o que deixa usar a chave pública (`anon`) no front-end com segurança.

> [!atencao] Tabela sem RLS
> Com a chave pública, qualquer um lê e apaga tudo. Ative RLS sempre.
> A chave `service_role` **nunca** vai pro front-end.

Ver [[API REST]] e [[Cibersegurança]].

---
## Aprofundando

### Começar
1. Crie o projeto em supabase.com
2. Crie as tabelas (Table Editor ou SQL Editor)
3. Ative **RLS** e crie as policies
4. Pegue a **URL** e a chave **anon** em Project Settings → API
5. No front-end:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  const supabase = window.supabase.createClient(URL, ANON_KEY);
</script>
```

### CRUD com a biblioteca
```js
await supabase.from('tarefas').insert({ titulo: 'Estudar SQL' });
await supabase.from('tarefas').select('*').order('criado_em', { ascending: false });
await supabase.from('tarefas').update({ feita: true }).eq('id', 7);
await supabase.from('tarefas').delete().eq('id', 7);
```
Sempre confira o `error` que volta.

### Login
```js
await supabase.auth.signUp({ email, password });
await supabase.auth.signInWithPassword({ email, password });
const { data: { user } } = await supabase.auth.getUser();
await supabase.auth.signOut();
```

### Policy de exemplo: cada um vê só o seu
```sql
alter table tarefas enable row level security;
create policy "dono lê" on tarefas for select
  using (auth.uid() = user_id);
create policy "dono grava" on tarefas for insert
  with check (auth.uid() = user_id);
```

### Tempo real
```js
supabase.channel('placar')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'placar' },
      payload => atualizarTela(payload.new))
  .subscribe();
```
Ótimo pra ranking e placar ao vivo.

### Plano grátis
Bom pra projeto de aula. Projeto **pausa** depois de um tempo sem uso — é só reativar no painel.

### Alternativas
Firebase (Google, NoSQL) · Appwrite · PocketBase (roda num arquivo só).

#dados #ferramenta$md$),

-- ================================================================== INFRA
('Redes de Computadores', $md$Como os computadores conversam.

## Endereços
- **IP**: endereço do dispositivo na rede (`192.168.0.10`). IPv4 está acabando → **IPv6**
- **IP privado** (casa/escola) × **IP público** (internet) — o roteador traduz (**NAT**)
- **MAC**: endereço físico da placa de rede
- **Porta**: qual programa recebe (80 HTTP, 443 HTTPS, 22 SSH, 5432 Postgres)
- **DNS**: nome → IP (`google.com` → `142.250…`)
- **DHCP**: entrega IP automático pra quem conecta

## Modelo TCP/IP
| Camada | Exemplos |
|---|---|
| Aplicação | [[HTTP]], DNS, SMTP |
| Transporte | **TCP** (confiável, em ordem) · **UDP** (rápido, pode perder — jogos online, chamada de vídeo) |
| Internet | IP, roteamento |
| Acesso à rede | Wi-Fi, cabo Ethernet |

## Comandos úteis
`ping site.com` · `ipconfig` (Windows) / `ip a` (Linux) · `tracert` / `traceroute` · `nslookup site.com`

Ver [[Como a Web Funciona]] e [[Cibersegurança]].

---
## Aprofundando

### Tipos de rede
| Sigla | Alcance | Exemplo |
|---|---|---|
| **PAN** | pessoal | fone Bluetooth |
| **LAN** | local | laboratório da escola |
| **WLAN** | local sem fio | Wi-Fi |
| **MAN** | cidade | rede de uma prefeitura |
| **WAN** | longa distância | a internet |

### Equipamentos
| Equipamento | Faz |
|---|---|
| **Switch** | liga os computadores da mesma rede (pelo MAC) |
| **Roteador** | liga redes diferentes (a sua à internet) |
| **Access point** | dá Wi-Fi a uma rede cabeada |
| **Modem** | converte o sinal da operadora (fibra, cabo) |
| **Firewall** | filtra o que entra e sai |

### Máscara de sub-rede
`192.168.0.10/24` → os 3 primeiros números são a **rede**, o último é o **dispositivo**. A rede comporta 254 dispositivos (`.1` a `.254`).

### Faixas de IP privado
`10.0.0.0/8` · `172.16.0.0/12` · `192.168.0.0/16`. Não aparecem na internet.

### Modelo OSI (7 camadas)
| # | Camada | Exemplo |
|---|---|---|
| 7 | Aplicação | HTTP, DNS |
| 6 | Apresentação | criptografia, compressão |
| 5 | Sessão | manter a conversa |
| 4 | Transporte | TCP, UDP |
| 3 | Rede | IP, roteador |
| 2 | Enlace | MAC, switch |
| 1 | Física | cabo, sinal de rádio |

### Cabeamento
Cabo de par trançado **Cat5e/Cat6** com conector **RJ45**; padrões de crimpagem **T568A** e **T568B**. Fibra óptica pra longas distâncias.

### Wi-Fi
Faixa **2,4 GHz** (alcança mais, mais lenta, mais interferência) × **5 GHz** (mais rápida, alcança menos). Segurança: **WPA2** ou **WPA3** (nunca rede aberta pra dados sensíveis).

### Diagnóstico ("a internet caiu")
1. Outros aparelhos funcionam? (problema no seu ou na rede)
2. `ping 8.8.8.8` responde? (há internet)
3. `ping google.com` responde? (o DNS funciona)
4. `ipconfig` mostra IP `169.254…`? (não pegou IP do DHCP)

### Simulador
**Cisco Packet Tracer** (gratuito com conta na Cisco Networking Academy): monta e testa redes inteiras.

#redes #conceito$md$),

('Linux', $md$Sistema operacional livre. Roda na maioria dos servidores, na nuvem, no Android e em [[Docker]].

## Distribuições
**Ubuntu** (começar) · Debian · Fedora · Mint · Arch. No Windows: **WSL** (`wsl --install`).

## Estrutura
| Pasta | O que tem |
|---|---|
| `/home/usuario` | seus arquivos (`~`) |
| `/etc` | configurações |
| `/var/log` | logs |
| `/usr/bin` | programas |

## Permissões
`ls -l` → `-rwxr-xr--` = dono · grupo · outros (ler, escrever, executar)
```bash
chmod +x script.sh     # torna executável
sudo apt update && sudo apt install git   # instalar (Ubuntu/Debian)
```

> [!atencao] `sudo`
> Roda como administrador. Só com comando que você entende.

Ver [[Terminal]].

---
## Aprofundando

### Comandos do dia a dia
```bash
ls -la                 # lista tudo, com detalhes
cd /var/log            # muda de pasta
cp -r origem destino   # copia pasta
mv antigo novo         # move/renomeia
rm -r pasta            # apaga pasta
find . -name "*.js"    # procura arquivos
grep -rn "erro" .      # procura texto
du -sh *               # tamanho de cada pasta
df -h                  # espaço em disco
```

### Processos e sistema
```bash
top                    # o que está usando CPU e memória (htop é mais bonito)
ps aux | grep node     # achar um processo
kill 1234              # encerrar processo pelo número
free -h                # memória
uname -a               # versão do sistema
```

### Gerenciadores de pacotes
| Distro | Comando |
|---|---|
| Ubuntu / Debian | `apt install` |
| Fedora | `dnf install` |
| Arch | `pacman -S` |
| Universal | `snap`, `flatpak` |

### Permissões em número
`r = 4`, `w = 2`, `x = 1` — some por grupo:
- `chmod 755 script.sh` → dono tudo (7), grupo e outros ler+executar (5)
- `chmod 644 arquivo` → dono ler+escrever, resto só ler

### Editar arquivo no terminal
- **nano**: simples (Ctrl+O salva, Ctrl+X sai)
- **vim**: poderoso (`i` escreve, `Esc` depois `:wq` salva e sai, `:q!` sai sem salvar)

### Acesso remoto
```bash
ssh usuario@192.168.0.50          # entrar em outro computador
scp arquivo.txt usuario@ip:/tmp   # copiar arquivo pra lá
```

### Serviços (systemd)
```bash
sudo systemctl status nginx
sudo systemctl restart nginx
```

### Pra praticar
**OverTheWire: Bandit** — jogo de desafios no terminal Linux (ótimo pra aula de segurança também).

#infra$md$),

('Computação em Nuvem', $md$Usar servidores de outra empresa pela internet e pagar pelo uso, em vez de comprar máquina.

## Modelos
| Modelo | Você cuida de | Exemplos |
|---|---|---|
| **IaaS** | sistema, app, dados | AWS EC2, Azure VM, Google Compute |
| **PaaS** | só app e dados | Vercel, Render, Heroku |
| **SaaS** | só usar | Gmail, Canva, Google Docs |
| **BaaS** | só o front-end | [[Supabase]], Firebase |

## Grandes provedores
**AWS** (Amazon) · **Azure** (Microsoft) · **Google Cloud**

## Pra hospedar projeto de aluno de graça
[[GitHub]] Pages (site estático) · Vercel / Netlify · [[Supabase]] (banco)

> [!atencao] Cartão cadastrado
> Serviço esquecido ligado gera cobrança. Configure alerta de gastos.

Ver [[Docker]].

---
## Aprofundando

### Vantagens
- **Elasticidade**: aumenta e diminui máquinas conforme o acesso
- **Paga pelo uso**: sem comprar servidor
- **Alcance global**: servidores em vários países
- **Gerenciado**: backup, atualização e segurança pela empresa

### Desvantagens
- Custo pode **explodir** sem controle
- Dependência do fornecedor (**vendor lock-in**)
- Precisa de internet
- Dados fora do seu controle físico (ver [[LGPD]])

### Nuvem pública, privada e híbrida
| Tipo | Ideia |
|---|---|
| **Pública** | infraestrutura compartilhada da AWS/Azure/Google |
| **Privada** | só da empresa (no próprio data center) |
| **Híbrida** | parte em cada |

### Serviços equivalentes
| Pra quê | AWS | Azure | Google Cloud |
|---|---|---|---|
| máquina virtual | EC2 | Virtual Machines | Compute Engine |
| guardar arquivos | S3 | Blob Storage | Cloud Storage |
| banco gerenciado | RDS | Azure SQL | Cloud SQL |
| função sem servidor | Lambda | Functions | Cloud Functions |

### Serverless
Você escreve só a **função**; a nuvem roda quando chamada e cobra por execução. Ex.: Edge Functions do [[Supabase]], Vercel Functions.

### Responsabilidade compartilhada
A nuvem protege a infraestrutura; **você** protege suas senhas, configurações e dados. Bucket configurado como público é a causa de muitos vazamentos.

### Certificações de entrada
AWS Cloud Practitioner · Azure Fundamentals (AZ-900) · Google Cloud Digital Leader.

#infra #conceito$md$),

('Docker', $md$Empacota o app com tudo que ele precisa (sistema, bibliotecas, versão certa) num **contêiner**. Acaba com o "na minha máquina funciona".

## Termos
- **Imagem**: a receita pronta (só leitura)
- **Contêiner**: a imagem rodando
- **Dockerfile**: arquivo que monta a imagem
- **Docker Hub**: loja de imagens prontas

```dockerfile
FROM node:20
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start"]
```
```bash
docker build -t meu-app .
docker run -p 3000:3000 meu-app
docker ps                      # o que está rodando
```

**Docker Compose**: sobe vários contêineres juntos (app + banco) com um `docker-compose.yml`.

Ver [[Linux]] e [[Computação em Nuvem]].

---
## Aprofundando

### Contêiner × máquina virtual
| Máquina virtual | Contêiner |
|---|---|
| sistema operacional inteiro | divide o núcleo do sistema hospedeiro |
| GBs, sobe em minutos | MBs, sobe em segundos |
| isolamento total | isolamento leve |

### Comandos úteis
```bash
docker images                  # imagens baixadas
docker ps -a                   # todos os contêineres (até parados)
docker logs -f nome            # ver a saída
docker exec -it nome bash      # entrar no contêiner
docker stop nome && docker rm nome
docker system prune            # limpa o que não está em uso
```

### Volumes (dados que sobrevivem)
Contêiner apagado perde o que estava dentro. Pra guardar:
```bash
docker run -v dados_pg:/var/lib/postgresql/data postgres
```

### Docker Compose (exemplo)
```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    depends_on: [db]
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: segredo
    volumes: ["dados:/var/lib/postgresql/data"]
volumes:
  dados:
```
`docker compose up -d` sobe tudo; `docker compose down` derruba.

### `.dockerignore`
Igual ao `.gitignore`: `node_modules`, `.env`, `.git` — imagem menor e sem segredo.

### Onde roda
Docker Desktop (Windows/macOS, usa WSL no Windows) · servidores Linux · nuvem. **Kubernetes** gerencia muitos contêineres em vários servidores.

#infra #ferramenta$md$),

-- ================================================================== SEGURANÇA
('Cibersegurança', $md$Proteger sistemas, redes e dados contra ataque, roubo e dano.

## Tríade CIA
| Pilar | Ideia | Ameaça |
|---|---|---|
| **Confidencialidade** | só quem pode, vê | vazamento |
| **Integridade** | ninguém altera sem permissão | adulteração |
| **Disponibilidade** | funciona quando precisa | ataque DDoS, ransomware |

## Ataques comuns
- **Phishing** e [[Engenharia Social]]: enganar a pessoa
- **Malware / ransomware**: programa malicioso; ransomware sequestra arquivos
- **Força bruta**: testar senhas (ver [[Senhas e Autenticação]])
- **SQL Injection**: texto do usuário vira comando [[SQL Básico]]
- **XSS**: script injetado na página

## Pro desenvolvedor
- Nunca confie no que vem do usuário: valide no servidor
- Consultas parametrizadas (nada de juntar texto em SQL)
- Segredos fora do código e do [[GitHub]]
- Menor privilégio: cada um acessa só o que precisa
- Atualize dependências

Carreira: pentest (hacker ético), SOC, perícia forense. Lei: [[LGPD]].

---
## Aprofundando

### Tipos de malware
| Tipo | Faz |
|---|---|
| **Vírus** | se anexa a arquivos e se espalha quando executado |
| **Worm** | se espalha sozinho pela rede |
| **Trojan** | parece programa útil, esconde algo malicioso |
| **Ransomware** | criptografa arquivos e pede resgate |
| **Spyware / keylogger** | espiona e grava o que você digita |
| **Adware** | enche de propaganda |
| **Botnet** | transforma o PC em "zumbi" pra ataques em massa |

### Hacker ético × criminoso
| Chapéu | Quem é |
|---|---|
| **Branco** | autorizado, acha falhas pra corrigir (pentest, bug bounty) |
| **Cinza** | invade sem permissão, mas avisa |
| **Preto** | criminoso |

Invadir sem autorização é **crime** no Brasil (Lei 12.737/2012, "Lei Carolina Dieckmann").

### Exemplo de SQL Injection
Campo de login com `' or '1'='1` faz a consulta virar sempre verdadeira se o SQL for montado com texto. Solução: consultas parametrizadas (ver [[SQL Básico]]).

### Exemplo de XSS
Comentário com `<script>roubarCookie()</script>` exibido com `innerHTML` roda no navegador de todo mundo. Solução: mostrar com `textContent` ou escapar o HTML.

### Backup 3-2-1
**3** cópias, em **2** mídias diferentes, **1** fora do local (nuvem). É a melhor defesa contra ransomware.

### Higiene digital
- Atualizações automáticas ligadas
- Senhas únicas + 2FA (ver [[Senhas e Autenticação]])
- Desconfiar de anexo e link (ver [[Engenharia Social]])
- Wi-Fi público só com HTTPS (ou VPN)
- Bloqueio de tela no celular e no PC

### Pra treinar (legalmente)
**TryHackMe** · **Hack The Box** · **PicoCTF** (competição pra estudantes) · **OverTheWire**.

### OWASP Top 10
Lista das falhas mais comuns em aplicações web (owasp.org): controle de acesso quebrado, falhas de criptografia, injeção, configuração insegura…

#seguranca #conceito$md$),

('Senhas e Autenticação', $md$**Autenticação**: provar quem você é. **Autorização**: o que você pode fazer depois.

## Fatores
1. Algo que você **sabe**: senha, PIN
2. Algo que você **tem**: celular, chave física
3. Algo que você **é**: digital, rosto

**2FA/MFA** = dois ou mais fatores. Mesmo com a senha vazada, o invasor para.

## Senha boa
- **Longa** vence complicada: frase-senha (`cavalo-azul-pula-muro-7`)
- Uma senha **diferente** por site
- **Gerenciador de senhas** (Bitwarden, 1Password, o do navegador)
- **Passkeys**: login sem senha, pelo celular/digital — o futuro

## Pro desenvolvedor
- Nunca guarde senha em texto puro: **hash** com bcrypt/argon2 (+ salt)
- Limite tentativas de login
- Prefira um serviço pronto (ex.: Auth do [[Supabase]])

Confira vazamentos: haveibeenpwned.com. Ver [[Cibersegurança]].

---
## Aprofundando

### Por que senha longa vence
| Senha | Tempo pra quebrar por força bruta (estimativa) |
|---|---|
| `abc123` | instantâneo (está em toda lista de senhas vazadas) |
| `P@ssw0rd` | instantâneo (troca de letra por símbolo é previsível) |
| `Tr3m#9q` (7 caracteres) | minutos a horas |
| `cavalo-azul-pula-muro-7` | séculos |

Cada caractere a mais **multiplica** as combinações.

### Tipos de 2FA (do mais fraco ao mais forte)
1. **SMS**: melhor que nada, mas vulnerável a clonagem de chip
2. **App autenticador** (Google Authenticator, Authy, Microsoft Authenticator): código que muda a cada 30 s
3. **Notificação no app** (confirmar no celular)
4. **Chave física** (YubiKey) ou **passkey**: resistente a phishing

### Como funciona o hash
```text
senha "gato123" → bcrypt → $2b$12$Kix...   (não dá pra voltar)
login: aplica o hash no que foi digitado e compara os resultados
```
**Salt**: valor aleatório misturado a cada senha, pra duas senhas iguais terem hashes diferentes.

### Ataques
- **Força bruta**: testa tudo
- **Dicionário**: testa senhas comuns
- **Credential stuffing**: usa senha vazada de um site em outros (por isso uma senha por site)
- **Phishing**: a pessoa digita a senha num site falso

### Sessão e token
Depois do login, o servidor entrega um **token** (ex.: JWT) que vai em cada pedido. Token tem **validade**; ao sair, ele é descartado.

### Códigos de recuperação
Ao ativar 2FA, o site mostra códigos de backup. **Guarde-os** (impressos ou no gerenciador): perder o celular sem eles = perder a conta.

#seguranca$md$),

('Engenharia Social', $md$Ataque que explora a **pessoa**, não o sistema. É a porta de entrada da maioria das invasões.

## Técnicas
| Técnica | Como é |
|---|---|
| **Phishing** | e-mail/site falso imitando banco, escola, loja |
| **Smishing / vishing** | o mesmo por SMS / ligação |
| **Pretexting** | inventa uma história ("sou do suporte, preciso da sua senha") |
| **Baiting** | isca: pendrive "perdido", brinde, prêmio |
| **Tailgating** | entra atrás de alguém numa área restrita |
| **Golpe do WhatsApp** | "troquei de número, me faz um Pix" |

## Gatilhos usados
**Urgência** ("sua conta será bloqueada hoje") · **autoridade** · **medo** · **ganância** · **curiosidade**

## Defesa
- Desconfie da pressa
- Confira por **outro canal** (ligue pro número oficial)
- Passe o mouse no link antes de clicar
- Ninguém sério pede senha ou código de verificação

Ver [[Cibersegurança]] e [[Senhas e Autenticação]].

---
## Aprofundando

### Como identificar um phishing
- Remetente estranho: `suporte@bradesco-seguranca.xyz`
- Saudação genérica: "Prezado cliente"
- Erros de português
- Link que não bate com o texto (passe o mouse e leia o endereço real)
- Anexo inesperado (`.zip`, `.exe`, `.html`, `.docm`)
- Pedido de senha, código ou pagamento
- Prazo apertado e ameaça

### Golpes comuns no Brasil
| Golpe | Como é |
|---|---|
| **Falso parente no WhatsApp** | foto do parente, número novo, pede Pix urgente |
| **Falsa central do banco** | liga dizendo que houve compra suspeita, pede pra "confirmar" dados |
| **Boleto falso** | código de barras trocado, dinheiro vai pra outra conta |
| **Falso leilão / loja** | site com preço impossível |
| **Código do WhatsApp** | "te mandei um código por engano, me passa?" → roubam a conta |
| **Falso emprego / prêmio** | pede taxa pra liberar |

### Os 6 princípios da persuasão (Cialdini)
**Reciprocidade** (te dou algo, você me deve) · **compromisso** · **prova social** ("todos já atualizaram") · **autoridade** · **afinidade** · **escassez** ("só hoje").

### Plano se cair num golpe
1. Troque a senha e ative 2FA
2. Avise o banco (contestação / MED do Pix)
3. Avise contatos se a conta foi clonada
4. Registre boletim de ocorrência (pode ser online)
5. Guarde prints de tudo

### Atividade de aula
Mostrar 5 mensagens (algumas reais, algumas golpe) e a turma vota **golpe ou não**, justificando pelo sinal de alerta.

#seguranca$md$),

('LGPD', $md$**Lei Geral de Proteção de Dados** (Lei 13.709/2018): regras pra coletar e usar dados pessoais no Brasil. Fiscalizada pela **ANPD**.

## Conceitos
- **Dado pessoal**: identifica alguém (nome, CPF, e-mail, foto)
- **Dado sensível**: saúde, religião, biometria, orientação sexual… — mais proteção
- **Titular**: a pessoa dona dos dados
- **Controlador**: quem decide o uso · **Operador**: quem processa por ele

## Princípios (os mais cobrados)
**Finalidade** (dizer pra quê) · **necessidade** (só o mínimo) · **transparência** · **segurança**

## Direitos do titular
Saber o que tem · corrigir · apagar · levar pra outro serviço · revogar consentimento

> [!info] Menores de idade
> Dados de criança e adolescente exigem o melhor interesse deles e, pra criança, consentimento dos pais.

> [!dica] Em projeto de aluno
> Use dados fictícios. Colete só o necessário e proteja com RLS (ver [[Supabase]]).

Ver [[Cibersegurança]].

---
## Aprofundando

### As 10 bases legais (quando pode tratar dados)
Consentimento · cumprir obrigação legal · políticas públicas · pesquisa · execução de contrato · exercício de direitos em processo · proteção da vida · tutela da saúde · **legítimo interesse** · proteção do crédito.
Consentimento não é a única — e nem sempre a melhor.

### Os 10 princípios (art. 6º)
Finalidade · adequação · necessidade · livre acesso · qualidade dos dados · transparência · segurança · prevenção · não discriminação · responsabilização e prestação de contas.

### Papéis
- **Encarregado (DPO)**: canal entre empresa, titulares e ANPD
- **ANPD**: fiscaliza e aplica sanções

### Sanções
Advertência · multa de até **2% do faturamento** (limite de R$ 50 milhões por infração) · publicização da infração · bloqueio ou eliminação dos dados.

### Incidente de segurança
Vazou dado? A empresa deve avisar a **ANPD** e os **titulares** quando houver risco relevante.

### Anonimização × pseudonimização
- **Anonimizado**: impossível voltar à pessoa → deixa de ser dado pessoal
- **Pseudonimizado**: trocou nome por código, mas dá pra reverter com a chave → continua sendo dado pessoal

### Na escola
- Notas, frequência, laudos e fotos de alunos são dados pessoais (laudo de saúde é sensível)
- Foto de aluno em rede social da escola: precisa de autorização
- Planilha de notas não vai para grupo de WhatsApp
- Ferramenta de [[IA]]: não colar dado identificável (ver [[Ética e Vieses na IA]])

### Leis parentes
**Marco Civil da Internet** (Lei 12.965/2014) · **GDPR** (Europa, inspirou a LGPD) · **ECA Digital** (proteção de crianças e adolescentes no ambiente digital).

#seguranca #lei$md$),

-- ================================================================== JOGOS
('Game Loop', $md$O coração de todo jogo: um laço que roda dezenas de vezes por segundo.

```text
enquanto o jogo roda:
    ler entrada   (teclado, mouse, toque)
    atualizar     (física, IA dos inimigos, colisões, pontos)
    desenhar      (limpar a tela e redesenhar tudo)
```

## Delta time
Cada quadro leva um tempo diferente. Multiplique o movimento por **delta** (segundos desde o último quadro) pra velocidade ser igual em PC rápido e lento.
```js
x += velocidade * delta;
```

## Conceitos de jogo
- **FPS**: quadros por segundo (60 é o padrão)
- **Sprite**: imagem do personagem/objeto · **spritesheet**: várias numa imagem
- **Colisão**: caixas (AABB) ou círculos se encostando
- **Máquina de estados**: parado → andando → pulando → caindo
- **Tilemap**: cenário montado com blocos

Engines: [[Godot]] (`_process(delta)`) · [[Phaser]] (`update(time, delta)`).

---
## Aprofundando

### Game loop "na mão" em JavaScript
```js
let ultimo = performance.now();
function loop(agora) {
  const delta = (agora - ultimo) / 1000;   // em segundos
  ultimo = agora;
  atualizar(delta);
  desenhar();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
```

### Colisão AABB (caixas alinhadas)
```js
function colide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}
```

### Física básica
```js
vel.y += GRAVIDADE * delta;      // gravidade puxa pra baixo
pos.x += vel.x * delta;
pos.y += vel.y * delta;
if (noChao && apertouPulo) vel.y = -FORCA_PULO;
```

### Máquina de estados
```js
switch (estado) {
  case 'parado':  if (andando) estado = 'andando'; break;
  case 'andando': if (pulou) estado = 'pulando'; break;
  case 'pulando': if (noChao) estado = 'parado'; break;
}
```
Cada estado tem sua animação e suas regras. Inimigos usam o mesmo: patrulhar → perseguir → fugir (fantasmas do Pacman).

### Passo fixo × variável
- **Variável** (`delta` real): simples, bom pra maioria dos jogos
- **Fixo** (física sempre a 60 passos/s): física estável, igual em toda máquina — é o `_physics_process` do [[Godot]]

### Game feel ("suco")
Pequenos detalhes que deixam o jogo gostoso: tremida de câmera, partículas, som em cada ação, flash no dano, pequena pausa no impacto, *coyote time* (pular logo depois de sair da plataforma).

### Partes de um jogo além do loop
Tela inicial · pausa · HUD (vida, pontos) · game over · salvar progresso · menu de opções · créditos.

### Game design
- **Mecânica**: o que o jogador faz (pular, atirar)
- **Dinâmica**: o que surge do uso (correr pra pegar o power-up)
- **Estética**: o que o jogador sente (tensão, diversão)

Curva de dificuldade: ensinar → testar → desafiar.

#jogos #conceito$md$),

('Godot', $md$Engine de jogos **gratuita e open source** (2D e 3D). Linguagem principal: **GDScript** (parecida com Python); também aceita C#.

## Ideia central: cenas e nós
- Tudo é **nó** (`Node`): sprite, colisão, som, câmera…
- Nós formam uma **árvore**; uma árvore salva é uma **cena** (`.tscn`)
- Cena pode ser usada dentro de outra (personagem dentro da fase)

## Nós 2D mais usados
`CharacterBody2D` (personagem) · `Sprite2D` / `AnimatedSprite2D` · `CollisionShape2D` · `Area2D` (detectar contato) · `TileMapLayer` · `Camera2D`

```gdscript
extends CharacterBody2D

const VELOCIDADE := 200.0

func _physics_process(delta: float) -> void:
    var direcao := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
    velocity = direcao * VELOCIDADE
    move_and_slide()
```

## Sinais
Avisos entre nós sem um conhecer o outro: `body_entered`, `timeout`, `pressed`…

Ver [[Game Loop]] e [[Programação Orientada a Objetos]]. Alternativa web: [[Phaser]].

---
## Aprofundando

### Instalar
godotengine.org → baixar (é um executável só, sem instalar). A versão **.NET** é pra quem quer C#.

### Interface
- **Cena** (árvore de nós) à esquerda · **Inspetor** (propriedades) à direita
- **Sistema de arquivos** embaixo · viewport 2D/3D no meio
- **F5** roda o jogo · **F6** roda a cena atual

### GDScript essencial
```gdscript
extends Node2D

@export var velocidade := 200.0       # aparece no Inspetor
@onready var sprite := $Sprite2D      # pega o nó filho quando a cena carrega
var pontos := 0

func _ready() -> void:                # roda uma vez, ao entrar na cena
    print("Começou!")

func _process(delta: float) -> void:  # todo quadro
    if Input.is_action_just_pressed("ui_accept"):
        pontos += 1
```

### Sinais na prática
```gdscript
signal morreu

func levar_dano():
    vida -= 1
    if vida <= 0:
        morreu.emit()

# em outro script
jogador.morreu.connect(_on_jogador_morreu)
```

### Input Map
Projeto → Configurações do Projeto → **Mapa de Entrada**: crie ações ("pular", "atirar") e ligue teclas/controle. No código use o nome da ação, não a tecla.

### Grupos
```gdscript
add_to_group("inimigos")
get_tree().call_group("inimigos", "congelar")
```

### Trocar de cena
```gdscript
get_tree().change_scene_to_file("res://cenas/fase2.tscn")
```

### Autoload (singleton)
Script global (Projeto → Configurações do Projeto → Globais): placar, save, música que continua entre fases.

### Exportar
Projeto → Exportar → baixar os *templates* → Windows, Linux, Android ou **Web** (HTML5, dá pra publicar no itch.io).

### Onde aprender
Documentação oficial (tem tutorial "Seu primeiro jogo 2D") · GDQuest · comunidade no Discord e Reddit.

#jogos #ferramenta$md$),

('Phaser', $md$Framework de jogos 2D em [[JavaScript]], roda no navegador. Publica fácil no [[GitHub]] Pages.

## Estrutura de uma cena
```js
class Fase extends Phaser.Scene {
  preload() { this.load.image('heroi', 'heroi.png'); }   // carregar
  create()  {                                            // montar
    this.heroi = this.physics.add.sprite(100, 100, 'heroi');
    this.teclas = this.input.keyboard.createCursorKeys();
  }
  update()  {                                            // a cada quadro
    this.heroi.setVelocityX(this.teclas.left.isDown ? -200 : this.teclas.right.isDown ? 200 : 0);
  }
}
new Phaser.Game({ width: 800, height: 600, physics: { default: 'arcade' }, scene: Fase });
```

## Recursos
Física **Arcade** (simples) e Matter (realista) · animação por spritesheet · tilemaps do **Tiled** · som · câmera.

> [!dica] Servidor local
> Abrir o `index.html` direto dá erro ao carregar imagem. Use a extensão **Live Server** do VS Code.

Ver [[Game Loop]] e [[Godot]].

---
## Aprofundando

### Estrutura de arquivos
```text
meu-jogo/
├── index.html      ← carrega o Phaser e o main.js
├── main.js         ← config + cenas
└── assets/         ← imagens, sons, mapas
```
```html
<script src="https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.min.js"></script>
<script src="main.js"></script>
```

### Spritesheet e animação
```js
preload() {
  this.load.spritesheet('heroi', 'assets/heroi.png', { frameWidth: 32, frameHeight: 48 });
}
create() {
  this.anims.create({
    key: 'andar',
    frames: this.anims.generateFrameNumbers('heroi', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1,
  });
  this.heroi.play('andar');
}
```

### Colisão e sobreposição
```js
this.physics.add.collider(this.heroi, this.plataformas);                   // bate e para
this.physics.add.overlap(this.heroi, this.moedas, pegarMoeda, null, this); // encosta e dispara função

function pegarMoeda(heroi, moeda) {
  moeda.disableBody(true, true);
  this.pontos += 10;
  this.textoPontos.setText('Pontos: ' + this.pontos);
}
```

### Grupos
```js
this.moedas = this.physics.add.group({ key: 'moeda', repeat: 9, setXY: { x: 20, y: 0, stepX: 70 } });
```

### Várias cenas
```js
scene: [Menu, Fase1, GameOver]
this.scene.start('Fase1');                              // troca de cena
this.scene.start('GameOver', { pontos: this.pontos });  // passa dados
```

### Texto, som e câmera
```js
this.add.text(16, 16, 'Pontos: 0', { fontSize: '24px', fill: '#fff' });
this.sound.play('pulo');
this.cameras.main.startFollow(this.heroi);
this.cameras.main.shake(200, 0.01);
```

### Mapas do Tiled
Monte a fase no **Tiled** (editor de mapas grátis), exporte em JSON e carregue com `this.load.tilemapTiledJSON`.

### Recursos
Exemplos oficiais em phaser.io/examples (centenas, com código) · assets grátis em **kenney.nl** e **itch.io**.

#jogos #ferramenta$md$),

-- ================================================================== ENGENHARIA DE SOFTWARE
('Metodologias Ágeis', $md$Entregar em **ciclos curtos**, mostrar cedo e ajustar com o retorno de quem usa.

## Scrum
| Peça | O que é |
|---|---|
| **Product Owner** | decide o que é mais importante |
| **Scrum Master** | tira os impedimentos do time |
| **Time** | faz |
| **Sprint** | ciclo de 1 a 4 semanas |
| **Backlog** | lista priorizada do que fazer |
| **Daily** | 15 min: o que fiz, o que farei, o que me trava |
| **Review / Retro** | mostrar o resultado / melhorar o processo |

## Kanban
Quadro **A fazer → Fazendo → Feito**, com limite de tarefas em "Fazendo". Ferramentas: Trello, GitHub Projects.

## História de usuário
"Como **aluno**, quero **ver minhas notas** para **saber se preciso de recuperação**."

> [!dica] MVP
> Produto mínimo que já resolve o problema. Faça funcionar, depois melhore.

Ver [[Testes de Software]].

---
## Aprofundando

### Manifesto Ágil (2001) — valoriza mais
- **Indivíduos e interações** do que processos e ferramentas
- **Software funcionando** do que documentação extensa
- **Colaboração com o cliente** do que negociação de contrato
- **Responder a mudanças** do que seguir um plano

### Cascata × ágil
| Cascata | Ágil |
|---|---|
| todas as fases em sequência (requisitos → projeto → código → teste) | ciclos curtos com tudo um pouco |
| cliente vê no fim | cliente vê a cada sprint |
| mudança custa caro | mudança é esperada |

### Artefatos do Scrum
- **Product Backlog**: tudo que o produto precisa, priorizado
- **Sprint Backlog**: o que o time se compromete a fazer nesta sprint
- **Incremento**: o que ficou pronto e funciona

### Definição de pronto (DoD)
Lista combinada do que "pronto" significa: código revisado, testado, publicado, documentado.

### Estimativa
**Planning poker**: cada um mostra uma carta (1, 2, 3, 5, 8, 13…) com o esforço; diferenças grandes viram conversa.

### Critérios de aceitação
"Dado que estou logado, quando clico em Sair, então volto pra tela de login."

### Quadro Kanban do projeto de aula
| A fazer | Fazendo (máx. 3) | Revisão | Feito |
|---|---|---|---|
| tela de ranking | login | menu | modelagem do banco |

### Outros
**XP** (programação em par, testes primeiro) · **Lean** (eliminar desperdício) · **SAFe** (ágil em empresa grande).

#engenharia$md$),

('Testes de Software', $md$Código que confere se o código funciona. Pega bug antes do usuário e dá coragem pra mudar.

## Pirâmide de testes
| Tipo | Testa | Quantidade |
|---|---|---|
| **Unitário** | uma função isolada | muitos, rápidos |
| **Integração** | partes juntas (app + banco) | alguns |
| **Ponta a ponta (E2E)** | o sistema como o usuário usa | poucos, lentos |

```js
// unitário (Jest/Vitest)
test('soma', () => { expect(soma(2, 3)).toBe(5); });

// E2E (Playwright)
await page.goto('/');
await page.click('text=Entrar');
await expect(page.locator('h1')).toHaveText('Painel');
```

## CI
Rodar os testes automaticamente a cada push (GitHub Actions) e só publicar se passar.

> [!dica] Caso de borda
> Teste vazio, zero, negativo, texto enorme, acento. É onde o bug mora.

Ver [[Clean Code]] e [[GitHub]].

---
## Aprofundando

### Anatomia de um teste (AAA)
```js
test('aplica 10% de desconto acima de R$ 100', () => {
  // Arrange (prepara)
  const carrinho = { total: 200 };
  // Act (age)
  const final = aplicarDesconto(carrinho);
  // Assert (confere)
  expect(final).toBe(180);
});
```

### TDD (desenvolvimento guiado por testes)
1. 🔴 Escreve o teste — ele **falha**
2. 🟢 Escreve o mínimo de código pra **passar**
3. 🔵 **Refatora** com segurança

### Teste manual × automatizado
| Manual | Automatizado |
|---|---|
| alguém clica e confere | código confere |
| bom pra explorar e usabilidade | bom pra repetir sempre |
| lento, sujeito a esquecer | rápido, roda a cada push |

### Caixa-preta × caixa-branca
- **Caixa-preta**: testa pelas entradas e saídas, sem ver o código
- **Caixa-branca**: conhece o código e testa cada caminho (`if`/`else`)

### Mock
Substituto falso de algo externo (API, banco) pra o teste ser rápido e previsível.

### Cobertura
Porcentagem do código executada pelos testes. 100% não garante ausência de bugs; testar os **casos importantes** vale mais que o número.

### Ferramentas
| Linguagem | Ferramenta |
|---|---|
| JavaScript | Jest, Vitest, Playwright, Cypress |
| Python | pytest |
| C# | xUnit, NUnit |
| GDScript | GUT, gdUnit4 |

### Relatório de bug bem feito
1. **Título** claro ("Pontos zeram ao trocar de fase")
2. **Passos** pra reproduzir
3. **Esperado** × **obtido**
4. Print / vídeo, navegador e dispositivo

#engenharia #dev$md$),

('Clean Code', $md$Código é lido muito mais vezes do que escrito. Escreva pro próximo que vai ler (provavelmente você).

## Regras práticas
- **Nomes que explicam**: `alunosAprovados`, não `lista2`
- **Funções pequenas**, que fazem uma coisa só
- **Sem número mágico**: `const NOTA_MINIMA = 7`
- **Retorno cedo** em vez de `if` dentro de `if`
- **Comentário diz o porquê**, o código diz o quê
- **DRY**: não repita — mas só junte quando repetir de verdade
- **KISS**: a solução mais simples que funciona

```js
// antes
if (u) { if (u.a) { if (u.n >= 7) { ok(); } } }

// depois
if (!usuario?.ativo) return;
if (usuario.nota >= NOTA_MINIMA) aprovar();
```

## Ferramentas
**Prettier** (formata) · **ESLint** (aponta problema)

Ver [[Programação Orientada a Objetos]] e [[Testes de Software]].

---
## Aprofundando

### Nomes
| Ruim | Bom |
|---|---|
| `d` | `diasAteEntrega` |
| `getData()` | `buscarAlunosDaTurma()` |
| `flag` | `jogoPausado` |
| `lista`, `dados`, `info` | o que **são**: `notasDoBimestre` |

Booleano começa com `eh`, `tem`, `pode`, `esta`: `ehAdmin`, `temVida`.

### Funções
- Recebe poucos parâmetros (até 3); mais que isso, passe um objeto
- Não faz coisa escondida (função `calcularTotal` não deve salvar no banco)
- Um nível de abstração por função

### Code smells (sinais de problema)
- Função com mais de uma tela
- Código duplicado em vários lugares
- Comentário explicando código confuso (melhor reescrever)
- Muitos `if/else` aninhados
- Variável global mudando em todo lugar
- Classe "Deus" que faz tudo

### Refatorar
Melhorar a estrutura **sem mudar o comportamento**. Com testes ([[Testes de Software]]), dá pra refatorar sem medo.
- Extrair função
- Renomear
- Trocar `if` encadeado por objeto/mapa:
```js
const PRECO = { pequeno: 10, medio: 15, grande: 20 };
const preco = PRECO[tamanho];
```

### Revisão de código (code review)
Outra pessoa lê antes de juntar: pega bug, espalha conhecimento, mantém o padrão. Critique o código, não a pessoa.

### Regra do escoteiro
"Deixe o código um pouco melhor do que encontrou."

### Leitura
*Código Limpo* (Robert C. Martin) · *O Programador Pragmático* (Hunt e Thomas).

#engenharia #dev$md$),

('UX e UI', $md$**UX** (experiência): o produto é fácil e útil? **UI** (interface): como ele parece — cor, fonte, botão.

## Heurísticas de Nielsen (as mais úteis)
1. Mostre o que está acontecendo (carregando, salvo ✓)
2. Fale a língua do usuário
3. Deixe desfazer
4. Seja consistente
5. Evite o erro antes de avisar dele
6. Mostre as opções em vez de exigir que lembre

## Princípios visuais
- **Contraste** e **hierarquia**: o importante salta aos olhos
- **Espaço em branco** organiza
- **Alinhamento** e grade
- Até **2 fontes** e uma paleta pequena

## Ferramentas
**Figma** (protótipo) · Canva · coolors.co (paletas) · Google Fonts

> [!info] Acessibilidade é UX
> Contraste suficiente, texto alternativo, navegar pelo teclado. Ver [[HTML]].

---
## Aprofundando

### Processo de UX (Design Thinking)
1. **Empatizar**: conversar e observar quem vai usar
2. **Definir**: qual é o problema de verdade
3. **Idear**: muitas ideias, sem julgar
4. **Prototipar**: papel, wireframe, Figma
5. **Testar** com usuários reais e voltar ao passo que precisar

### Fidelidade do protótipo
| Tipo | Como | Pra quê |
|---|---|---|
| **Rascunho** | papel e caneta | ideias rápidas |
| **Wireframe** | caixas cinza, sem cor | organização da tela |
| **Mockup** | visual final, parado | aprovar o visual |
| **Protótipo** | clicável (Figma) | testar o fluxo |

### Persona
Usuário fictício baseado em pesquisa: "Lucas, 16 anos, joga no celular, pouca paciência com tutorial longo."

### Teste de usabilidade (simples)
Dê uma tarefa ("crie uma conta e jogue a fase 1"), **observe sem ajudar**, anote onde a pessoa travou. 5 pessoas já acham a maioria dos problemas.

### Lei de Fitts e outras
- **Fitts**: alvo grande e perto é mais fácil de acertar (botão principal grande; no celular, ao alcance do polegar — mín. ~44 px)
- **Hick**: mais opções = decisão mais lenta
- **Jakob**: o usuário espera que seu site funcione como os outros que ele já usa

### Cores
- Regra **60-30-10**: 60% cor base, 30% secundária, 10% destaque
- Contraste mínimo **4,5:1** pra texto (WCAG)
- Não use só cor pra informar (vermelho/verde): acrescente ícone ou texto

### UX em jogos
Onboarding (ensinar jogando), feedback claro de dano/acerto, HUD legível, menus acessíveis por controle e teclado.

#design$md$),

-- ================================================================== HARDWARE / IOT
('IoT', $md$**Internet das Coisas**: objetos com sensores e internet que medem, mandam dados e agem sozinhos.

## Peças
| Peça | Exemplos |
|---|---|
| **Microcontrolador** | [[ESP32]], Arduino, Raspberry Pi Pico |
| **Sensores** (lê) | umidade do solo, temperatura (DHT22), presença (PIR), distância (ultrassônico) |
| **Atuadores** (age) | relé, motor, bomba, LED, buzzer |
| **Nuvem** | guardar e mostrar os dados ([[Supabase]], MQTT) |

## Exemplos
Irrigação automática · casa inteligente · monitorar sala de aula · contador de pessoas

## Protocolos
**Wi-Fi** + [[HTTP]] (simples) · **MQTT** (leve, publica/assina) · Bluetooth

> [!atencao] Segurança
> Dispositivo IoT com senha padrão é alvo fácil. Ver [[Cibersegurança]].

---
## Aprofundando

### Arquitetura em camadas
```text
sensor → microcontrolador → rede (Wi-Fi) → nuvem/banco → app/painel
                 ↓
           atuador (relé, bomba)
```

### Sensores comuns e o que medem
| Sensor | Mede | Saída |
|---|---|---|
| DHT11 / DHT22 | temperatura e umidade do ar | digital |
| Umidade do solo (capacitivo) | água na terra | analógica |
| LDR | luz | analógica |
| HC-SR04 | distância (ultrassom) | digital (tempo do eco) |
| PIR | presença/movimento | digital |
| MQ-2 | gás/fumaça | analógica |

### Analógico × digital
- **Digital**: só 0 ou 1 (ligado/desligado)
- **Analógico**: faixa de valores (no [[ESP32]], 0 a 4095)

### MQTT em 1 minuto
- **Broker**: o "carteiro" central (Mosquitto, HiveMQ)
- **Tópico**: endereço da mensagem (`escola/horta/umidade`)
- **Publish**: o sensor publica no tópico
- **Subscribe**: o app assina e recebe

### Onde o IoT aparece
Agro (irrigação, clima) · indústria 4.0 (máquinas monitoradas) · saúde (pulseiras) · cidades inteligentes (semáforos, iluminação) · casa (lâmpadas, assistentes de voz).

### Simulador
**Wokwi** (wokwi.com): simula ESP32 e Arduino com sensores no navegador — dá pra testar o código sem a placa.

### Cuidados no projeto
- Fonte de energia adequada (bomba e relé precisam de fonte própria)
- Proteger da água o que é eletrônico
- Calibrar sensor (medir seco e molhado pra achar os limites)
- Enviar dados a cada X segundos, não a cada `loop` (economiza rede e banco)

#hardware #iot$md$),

('ESP32', $md$Microcontrolador barato com **Wi-Fi e Bluetooth** embutidos. O queridinho de projetos [[IoT]].

## Por que usar
- Wi-Fi nativo (Arduino Uno não tem)
- Programa na **Arduino IDE** (C++) ou MicroPython
- Muitos pinos: digitais, analógicos (ADC), PWM

## Primeiros passos (Arduino IDE)
1. Preferences → URL de placas: o pacote **esp32** da Espressif
2. Boards Manager → instalar "esp32"
3. Escolher a placa (ex.: ESP32 Dev Module) e a porta COM
4. Upload (se travar, segure o botão **BOOT**)

```cpp
const int SENSOR = 34, RELE = 26;
void setup() { pinMode(RELE, OUTPUT); Serial.begin(115200); }
void loop() {
  int umidade = analogRead(SENSOR);        // 0 a 4095
  digitalWrite(RELE, umidade > 3000 ? HIGH : LOW);  // seco → liga a bomba
  Serial.println(umidade);
  delay(2000);
}
```

> [!atencao] 3,3 V
> Os pinos do ESP32 são de 3,3 V. Ligar 5 V direto pode queimar.

Ver [[IoT]].

---
## Aprofundando

### Conectar no Wi-Fi
```cpp
#include <WiFi.h>
const char* SSID = "rede";
const char* SENHA = "senha";

void setup() {
  Serial.begin(115200);
  WiFi.begin(SSID, SENHA);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println(WiFi.localIP());
}
```

### Enviar leitura pro Supabase (REST)
```cpp
#include <HTTPClient.h>
void enviar(int umidade) {
  HTTPClient http;
  http.begin("https://SEU-PROJETO.supabase.co/rest/v1/leituras");
  http.addHeader("apikey", ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + ANON_KEY);
  http.addHeader("Content-Type", "application/json");
  int status = http.POST("{\"umidade\":" + String(umidade) + "}");
  Serial.println(status);   // 201 = gravou
  http.end();
}
```
A tabela precisa de policy de `insert` pra chave anon (ver [[Supabase]]).

### Pinos: o que saber
| Pino | Observação |
|---|---|
| GPIO 34–39 | **só entrada** (bons pra sensor analógico) |
| ADC2 (ex.: 0, 2, 4, 12–15, 25–27) | não lê analógico com o Wi-Fi ligado — prefira ADC1 (32–39) |
| GPIO 0, 2, 12, 15 | influenciam o boot — evite usar se der problema ao ligar |
| 6–11 | ligados à memória flash, não use |

### Relé com bomba
- O relé é a "chave" que o ESP32 aciona; a bomba usa **fonte própria**
- Muitos módulos de relé acionam com `LOW` (lógica invertida) — teste
- Coloque um tempo máximo de bomba ligada (segurança contra alagar)

### Não travar o loop
Troque `delay()` longo por `millis()`:
```cpp
unsigned long ultimo = 0;
void loop() {
  if (millis() - ultimo > 10000) { ultimo = millis(); enviar(analogRead(34)); }
}
```

### Problemas comuns
| Sintoma | Causa provável |
|---|---|
| porta COM não aparece | cabo só de carga ou falta driver (CP210x / CH340) |
| `Failed to connect` no upload | segure BOOT ao começar o upload |
| reinicia sozinho | fonte fraca (bomba/relé na mesma alimentação) |
| leitura sempre 4095 ou 0 | fio solto ou pino errado |

#hardware #iot$md$),

-- ================================================================== CARREIRA
('Carreira em TI', $md$Áreas, por onde começar e como mostrar o que sabe.

## Áreas
| Área | Faz | Base pra começar |
|---|---|---|
| **Front-end** | interfaces web | [[HTML]], [[CSS]], [[JavaScript]] |
| **Back-end** | servidor, regras, banco | [[API REST]], [[SQL Básico]] |
| **Mobile** | apps de celular | Flutter, React Native, Kotlin |
| **Dados** | análise, BI, ciência de dados | [[SQL Básico]], Python, Power BI |
| **Infra / DevOps** | servidores, nuvem, deploy | [[Linux]], [[Docker]], [[Computação em Nuvem]] |
| **Segurança** | proteger sistemas | [[Redes de Computadores]], [[Cibersegurança]] |
| **Jogos** | games | [[Godot]], Unity, [[Phaser]] |
| **QA** | qualidade e testes | [[Testes de Software]] |
| **Suporte / redes** | manter tudo rodando | [[Redes de Computadores]] |
| **IA** | aplicar e integrar IA | [[IA]], Python, APIs |

## Níveis
Estágio → Júnior → Pleno → Sênior → Especialista / Tech Lead

## Portfólio
- [[GitHub]] com projetos de verdade e README caprichado
- Site publicado (GitHub Pages) com os melhores trabalhos
- LinkedIn atualizado

## Estudar de graça
freeCodeCamp · CS50 (Harvard) · MDN (documentação da web) · Curso em Vídeo · Roadmap.sh (trilhas por área)

> [!dica] Soft skills
> Comunicação, trabalho em equipe e saber pesquisar pesam tanto quanto o código.

Ver [[Mapa de TI]].

---
## Aprofundando

### Formação
| Caminho | Duração | Pra quê |
|---|---|---|
| **Curso técnico** | 1,5–2 anos | entrar rápido no mercado (estágio, suporte, dev júnior) |
| **Tecnólogo** | 2–3 anos | graduação focada (ADS, Redes, Jogos Digitais) |
| **Bacharelado** | 4–5 anos | Ciência da Computação, Engenharia de Software, Sistemas de Informação |
| **Cursos livres e certificações** | semanas | habilidade específica (nuvem, redes, segurança) |

### Certificações que ajudam no começo
Cisco **CCNA** (redes) · **CompTIA A+ / Security+** · AWS Cloud Practitioner · Microsoft AZ-900 · **ISC2 CC** (segurança, tem versão gratuita).

### Currículo de quem está começando
- Objetivo claro ("Estágio em desenvolvimento web")
- **Projetos** com link (GitHub, site publicado) — mais importante que lista de tecnologias
- Cursos e certificações
- Atividades: hackathon, monitoria, olimpíada (OBI), voluntariado
- 1 página, sem foto obrigatória, sem erro de português

### Entrevista técnica
- Explique seu raciocínio em voz alta
- "Não sei, mas eu pesquisaria assim…" é melhor que inventar
- Conte um projeto: problema → o que você fez → resultado
- Tenha uma pergunta pra fazer à empresa

### Onde achar vagas
LinkedIn · Gupy · CIEE / IEL (estágio) · programas de estágio e trainee de empresas · comunidades no Discord.

### Freelance e jogos
- Freelance: Workana, 99Freelas — comece com projetos pequenos
- Jogos: publique no **itch.io**, participe de **game jams** (Global Game Jam, Ludum Dare) — é portfólio e networking

### Competições e eventos pra estudantes
**OBI** (Olimpíada Brasileira de Informática) · **Hackathons** · **Campus Party** · **PicoCTF** (segurança) · **Global Game Jam**.

### Rotina de quem cresce
Estudar um pouco **todo dia**, construir em público (postar o que aprendeu), pedir feedback e ajudar quem está começando.

#carreira$md$)

  ) as n(titulo, conteudo)
  on conflict (professor_id, lower(titulo)) where titulo <> ''
  do update set conteudo = excluded.conteudo, updated_at = now()
  -- Só atualiza notas que vieram deste script (começam igual à versão
  -- daqui: rodar de novo traz o conteúdo novo) e as 2 notas de exemplo
  -- (shared/conhecimentos.js) enquanto ainda têm o texto original.
  -- Uma nota sua com o mesmo título, escrita do zero, fica igual.
  where left(public.professor_notas.conteudo, 60) = left(excluded.conteudo, 60)
     or (lower(excluded.titulo) = 'banco de dados' and public.professor_notas.conteudo like '%Como ler esta nota%')
     or (lower(excluded.titulo) = 'sql básico' and public.professor_notas.conteudo like '%Exemplo no FinancApp%' and public.professor_notas.conteudo like '%Conecta com: [[Chave Primária]]%');

  get diagnostics v_criadas = row_count;
  raise notice '% nota(s) de TI criada(s)/atualizada(s) para o professor % (as suas que já existiam ficaram como estavam).', v_criadas, v_prof;
end
$do$;
