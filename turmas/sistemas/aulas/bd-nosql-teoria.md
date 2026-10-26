---
titulo: Bancos de Dados Não Relacionais (NoSQL)
turma: Desenvolvimento de Sistemas
---

# Bancos de Dados Não Relacionais
Quando a tabela não é a melhor resposta

---

## Nesta aula você vai
+ Ver onde o modelo relacional começa a sofrer
+ Conhecer as 4 famílias de bancos NoSQL
+ Entender o teorema CAP e a ideia de BASE
+ Escolher a arquitetura certa para cada aplicação

---

## Aquecimento
Seu app de fotos viralizou: **50 mil cadastros por hora** e cada usuário tem um perfil diferente.

+ O servidor do banco está no limite. Comprar um maior resolve para sempre?
+ Cada usuário quer campos novos no perfil. Dá para mudar a tabela toda hora?
+ O "sugerir amigos" ficou lento. Por quê?

> Guarde suas respostas: vamos voltar a elas no fim da aula.

---

## Relembrando o modelo relacional
- Dados em **tabelas** com linhas e colunas
- **Esquema fixo**: toda linha tem as mesmas colunas
- Tabelas ligadas por **chaves** e consultadas com **JOIN**
- Transações **ACID**: Atomicidade, Consistência, Isolamento, Durabilidade

> É o modelo certo para muita coisa: bancos, notas fiscais, estoque. A pergunta de hoje é **quando ele deixa de ser**.

---

## Pergunta
O sistema debita R$ 100 da conta A e cai antes de creditar na conta B. Qual propriedade ACID impede que o dinheiro suma?

- [x] Atomicidade: as duas operações acontecem, ou nenhuma delas
- [ ] Isolamento: outras transações não enxergam o saldo parcial
- [ ] Durabilidade: o débito fica gravado mesmo depois da queda
- [ ] Consistência: o saldo da conta nunca pode ficar negativo

> Por quê: a atomicidade trata a transação como uma unidade só. Se ela falha no meio, tudo é desfeito (rollback) e o débito não fica sozinho.

---

## Onde o relacional começa a sofrer
+ **Volume gigante**: um único servidor tem limite de CPU, memória e disco
+ **Esquema rígido**: `ALTER TABLE` em milhões de linhas é lento e arriscado
+ **Dados sem formato fixo**: perfis, catálogos, logs, eventos
+ **JOINs entre servidores**: juntar dados espalhados custa caro
+ **Relações profundas**: "amigos dos amigos dos amigos" vira JOIN em cima de JOIN

---

## Escalar para cima × escalar para os lados

| | Vertical (para cima) | Horizontal (para os lados) |
|---|---|---|
| Como | Máquina maior | Mais máquinas |
| Limite | O maior servidor que existe | Quase sem teto |
| Se uma cair | Tudo para | As outras continuam |
| Custo | Sobe muito no topo | Máquinas comuns |

Bancos NoSQL nasceram pensando em **escalar na horizontal**, dividindo os dados entre vários servidores (*sharding*).

---

## Pergunta
Uma rede social já roda no maior servidor que o provedor oferece, e os acessos continuam dobrando. Qual caminho ainda sobra?

- [ ] Escalar na vertical, trocando por um processador mais rápido
- [x] Escalar na horizontal, dividindo os dados em vários servidores
- [ ] Criar mais índices nas tabelas para acelerar todas as consultas
- [ ] Aumentar a memória RAM do servidor que já está no limite

> Por quê: se já está na maior máquina, a vertical acabou. Escalar na horizontal espalha dados e acessos entre várias máquinas.

---

## O que é NoSQL
- Significa **Not only SQL**: "não só SQL"
- Termo popularizado em **2009**, com o crescimento da web em grande escala
- **Não** é um banco só: é um guarda-chuva de modelos diferentes
- Troca parte da rigidez do relacional por **flexibilidade e escala**

> NoSQL **não substitui** o relacional. Cada um tem seu lugar, e muitos sistemas usam os dois.

---

## A taxonomia NoSQL: 4 famílias

| Família | Como guarda | Exemplos |
|---|---|---|
| Chave-valor | Uma chave aponta para um valor | Redis, DynamoDB |
| Documento | Documentos JSON com campos livres | MongoDB, Firestore |
| Colunar | Linhas agrupadas por partição | Cassandra, HBase |
| Grafo | Nós ligados por relações | Neo4j |

---

## Chave-valor
O modelo mais simples: um **dicionário gigante**. Você guarda e busca **sempre pela chave**.

```bash
SET sessao:8f3a "usuario=42"
EXPIRE sessao:8f3a 1800
GET sessao:8f3a
```

- Muito rápido (costuma ficar em memória)
- Ótimo para **sessão, cache, carrinho, ranking**
- Não serve para "buscar todos os usuários de Recife"

---

## Pergunta
Um app guarda o token de login de cada usuário, busca sempre pelo id da sessão e apaga o token após 30 minutos. Qual família encaixa melhor?

- [ ] Grafo, ligando cada sessão ao usuário por uma aresta
- [ ] Colunar, guardando as sessões numa família de colunas
- [x] Chave-valor, com a sessão como chave e prazo de expiração
- [ ] Documento, com uma coleção de sessões filtrada por campos

> Por quê: acesso sempre pela chave e prazo de validade é o caso clássico do chave-valor (no Redis, `EXPIRE` apaga sozinho).

---

## Documento
Cada registro é um **documento** (parecido com JSON). Documentos da mesma coleção **podem ter campos diferentes**.

```json
{
  "_id": "pedido-1001",
  "cliente": { "nome": "Ana", "cidade": "Recife" },
  "itens": [
    { "produto": "Mouse", "qtd": 2, "preco": 49.9 },
    { "produto": "Teclado", "qtd": 1, "preco": 129.9 }
  ],
  "total": 229.7
}
```

---

## Embutir ou referenciar?
- **Embutir**: guardar os dados *dentro* do documento (itens dentro do pedido)
- **Referenciar**: guardar só o id e buscar em outra coleção
- Regra prática: **o que é lido junto, fica junto**
- Embute quando a parte pertence ao todo e não cresce sem fim
- Referencia quando o dado é compartilhado ou cresce muito

> No relacional, os itens iriam para outra tabela e voltariam com JOIN. No documento, vêm numa leitura só.

---

## Pergunta
Numa loja, o pedido é sempre exibido com seus itens e com o endereço de entrega daquele dia. Como modelar no MongoDB?

- [ ] Separar os itens em outra coleção e buscar com `$lookup` sempre
- [ ] Guardar cada item como uma chave separada num banco chave-valor
- [ ] Salvar o pedido como texto e montar os itens no front-end
- [x] Embutir os itens e o endereço dentro do documento do pedido

> Por quê: o que é lido junto fica junto. Embutir evita uma segunda busca e guarda o endereço como ele era no momento da compra.

---

## Colunar (famílias de colunas)
Feito para **muita escrita, espalhada em muitos servidores**. Os dados são divididos por uma **chave de partição**.

```sql
CREATE TABLE leituras (
  sensor_id text,
  momento timestamp,
  temperatura double,
  PRIMARY KEY (sensor_id, momento)
);
SELECT * FROM leituras
WHERE sensor_id = 'S-17' AND momento >= '2026-10-05';
```

Parece SQL, mas é CQL (Cassandra): **sem JOIN**, e a consulta precisa informar a partição.

---

## Pergunta
Uma frota de 50 mil caminhões envia o GPS a cada 10 segundos. A consulta é sempre "posições do caminhão X no dia Y". Qual família atende melhor?

- [ ] Grafo, criando uma aresta entre cada par de posições seguidas
- [x] Colunar, particionando por caminhão e ordenando pelo horário
- [ ] Documento, com um documento que cresce para cada caminhão
- [ ] Chave-valor, com uma única chave guardando a frota inteira

> Por quê: é escrita massiva com leitura por partição e tempo, o forte do colunar. Um documento que cresce sem parar esbarra no limite de tamanho (16 MB no MongoDB).

---

## Grafo
Guarda **nós** (pessoas, produtos) e **arestas** (SEGUE, COMPROU, CURTIU). A relação é um dado de primeira classe.

```cypher
MATCH (eu:Pessoa {nome: 'Ana'})
      -[:SEGUE]->()-[:SEGUE]->(sugestao)
WHERE NOT (eu)-[:SEGUE]->(sugestao)
  AND sugestao <> eu
RETURN DISTINCT sugestao.nome
```

"Quem os amigos da Ana seguem e ela ainda não segue?" Ideal para **redes sociais, recomendação e fraude**.

---

## Pergunta
Um app quer sugerir "pessoas com amigos e interesses em comum, até 3 níveis de distância". Qual família faz isso de forma natural?

- [x] Grafo, percorrendo as ligações entre pessoas e interesses
- [ ] Relacional, repetindo JOIN na tabela de amizades a cada nível
- [ ] Chave-valor, guardando a lista de amigos de cada pessoa
- [ ] Colunar, com uma coluna nova para cada amigo da pessoa

> Por quê: no grafo, ir de um nó ao vizinho é direto em qualquer nível. No relacional, cada nível é mais um JOIN, e o custo cresce rápido.

---

## Teorema CAP
Num sistema **distribuído**, só dá para garantir **duas** destas três ao mesmo tempo:

- **C**onsistência: todos leem o dado mais recente
- **D**isponibilidade (*Availability*): toda requisição recebe resposta
- Tolerância a **P**artição: o sistema segue mesmo com a rede cortada

> Proposto por Eric Brewer (2000) e provado por Gilbert e Lynch (2002). Como a rede **pode** cair, na prática a escolha é entre **C** e **A** quando ela cai.

---

## Pergunta
O cabo entre dois datacenters se rompe. O sistema de saldo bancário prefere recusar operações a mostrar saldo desatualizado. Que escolha é essa?

- [ ] Disponibilidade acima de consistência durante a partição (AP)
- [ ] Abrir mão da tolerância a partição para manter C e A (CA)
- [x] Consistência acima de disponibilidade durante a partição (CP)
- [ ] Nenhuma, porque o CAP só vale para bancos não relacionais

> Por quê: com a rede partida, ou responde com dado talvez velho (A) ou recusa até sincronizar (C). O banco escolheu consistência.

---

## ACID × BASE

| | ACID (relacional) | BASE (muitos NoSQL) |
|---|---|---|
| Ideia | Tudo certo, sempre | Disponível primeiro |
| Leitura | Sempre o dado atual | Pode vir um pouco atrasada |
| Réplicas | Sincronizadas na hora | Convergem com o tempo |
| Bom para | Dinheiro, estoque | Curtidas, feed, logs |

**BASE** = *Basically Available, Soft state, Eventually consistent* (consistência **eventual**).

---

## Pergunta
O contador de curtidas de um vídeo mostra 10.482 para você e 10.479 para um amigo, e segundos depois os dois veem o mesmo número. Isso é:

- [ ] Uma falha de atomicidade, típica de sistemas ACID
- [ ] Perda de dados causada pela falta de durabilidade
- [x] Consistência eventual, típica de sistemas BASE
- [ ] Um erro de esquema causado por documentos diferentes

> Por quê: em BASE as réplicas podem divergir por pouco tempo e depois convergem. Para curtidas, isso é aceitável; para saldo bancário, não.

---

## Cuidado com os mitos
- "Relacional não escala": escala sim, com **réplicas de leitura e particionamento**
- "NoSQL não tem transação": o MongoDB tem transações **ACID** entre documentos desde a versão **4.0** (2018)
- "NoSQL é sempre mais rápido": só no tipo de acesso para o qual foi desenhado
- **Persistência poliglota**: um mesmo sistema usa cada banco onde ele é melhor

---

## Pergunta
Uma equipe diz: "vamos migrar tudo para NoSQL, porque relacional não escala". Qual é a resposta mais correta?

- [x] Depende do dado: é comum usar os dois no mesmo sistema
- [ ] Correto: bancos relacionais não conseguem ter réplicas
- [ ] Correto: NoSQL é sempre mais rápido em qualquer consulta
- [ ] Errado: bancos NoSQL não aguentam grande volume de dados

> Por quê: o relacional também escala, e cada NoSQL troca garantias por flexibilidade. A escolha é pelo tipo de dado e de acesso, não pela moda.

---

## Como escolher

| Se a aplicação precisa de... | Pense em |
|---|---|
| Transações e relatórios com JOIN | Relacional |
| Busca rápida por uma chave, com expiração | Chave-valor |
| Registros com campos variáveis, lidos inteiros | Documento |
| Escrita massiva por partição e tempo | Colunar |
| Relações em vários níveis | Grafo |

---

## Pergunta
Num jogo online, o perfil do jogador (inventário, conquistas, configurações) varia muito entre jogadores e é carregado inteiro ao entrar. Qual modelo se destaca?

- [ ] Colunar, com uma coluna fixa para cada item do inventário
- [ ] Grafo, com uma aresta entre o jogador e cada configuração
- [ ] Relacional, com uma tabela única com todos os campos possíveis
- [x] Documento, com o perfil inteiro guardado num só registro

> Por quê: campos que variam de jogador para jogador e leitura do perfil inteiro de uma vez é exatamente o ponto forte do banco de documentos.

---

## O que vimos
+ O relacional sofre com volume gigante, esquema rígido e relações profundas
+ NoSQL tem 4 famílias: chave-valor, documento, colunar e grafo
+ No CAP, quando a rede cai, escolhe-se entre consistência e disponibilidade
+ A arquitetura certa depende da **aplicação**, e dá para combinar modelos

---

# Hora da prática!
Abra o módulo "Prática — Consultoria de Arquitetura" e escolha o banco certo para cada cliente
