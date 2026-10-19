-- Notas de Conhecimentos sobre TI (professor/conhecimentos.html): um mapa
-- geral da área ligado às notas de IA (sql/conhecimentos-ia.sql).
-- Programação, web, dados, infraestrutura, redes, segurança, jogos,
-- engenharia de software, IoT e carreira. Rode no SQL Editor do Supabase.
--
-- O SQL Editor não tem usuário logado (auth.uid() é nulo), então o dono
-- das notas é achado em profiles: o único perfil com role 'professor'.
-- Se houver mais de um, preencha v_email com o e-mail do seu login.
--
-- NÃO SOBRESCREVE SUAS NOTAS: nota que já existe com o mesmo título (sem
-- diferenciar maiúsculas) fica como está; só as que faltam são criadas.
-- Única exceção: as 2 notas de exemplo que o Conhecimentos cria na 1ª vez
-- ("Banco de Dados" e "SQL Básico") são trocadas pela versão completa,
-- mas só se ainda estiverem com o texto original de exemplo.
-- Pode rodar de novo sem medo.

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

#carreira$md$)

  ) as n(titulo, conteudo)
  on conflict (professor_id, lower(titulo)) where titulo <> ''
  do update set conteudo = excluded.conteudo, updated_at = now()
  -- Só troca as 2 notas de exemplo (shared/conhecimentos.js) enquanto
  -- ainda têm o texto original; qualquer outra nota existente fica igual.
  where (lower(excluded.titulo) = 'banco de dados' and public.professor_notas.conteudo like '%Como ler esta nota%')
     or (lower(excluded.titulo) = 'sql básico' and public.professor_notas.conteudo like '%Exemplo no FinancApp%' and public.professor_notas.conteudo like '%Conecta com: [[Chave Primária]]%');

  get diagnostics v_criadas = row_count;
  raise notice '% nota(s) de TI criada(s)/atualizada(s) para o professor % (as suas que já existiam ficaram como estavam).', v_criadas, v_prof;
end
$do$;
