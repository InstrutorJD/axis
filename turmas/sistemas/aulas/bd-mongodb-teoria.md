---
titulo: MongoDB na Prática
turma: Desenvolvimento de Sistemas
---

# MongoDB na Prática
Coleções e documentos sem esquema fixo

---

## Nesta aula você vai
+ Traduzir banco, tabela e linha para o jeito do MongoDB
+ Entender JSON, BSON e o campo `_id`
+ Inserir, consultar e atualizar documentos
+ Montar o catálogo da MegaShop num banco de verdade

---

## Aquecimento
Na aula passada você escreveu o catálogo da **MegaShop** em JSON, no editor do portal. Hoje esse JSON vai morar num **banco de verdade**.

+ Onde o MongoDB guarda cada produto?
+ Quem cria a "tabela" se não existe `CREATE TABLE`?
+ Como achar só os produtos com menos de R$ 100?

---

## Do SQL para o MongoDB

| Relacional | MongoDB |
|---|---|
| Banco de dados | Banco de dados (*database*) |
| Tabela | **Coleção** (*collection*) |
| Linha | **Documento** |
| Coluna | **Campo** |
| JOIN | Documento embutido (ou `$lookup`) |

> Uma coleção guarda **vários documentos**, e cada documento é um "objeto JSON".

---

## Pergunta
A tabela `clientes` do MySQL da MegaShop vai para o MongoDB. O que cada **linha** dessa tabela vira?

- [ ] Uma coleção separada para cada cliente
- [ ] Um campo dentro de um documento único
- [x] Um documento dentro da coleção clientes
- [ ] Um banco de dados próprio de cada cliente

> Por quê: a tabela vira uma coleção, e cada linha vira um documento dessa coleção.

---

## JSON × BSON
- Você **escreve** em JSON: é texto, fácil de ler
- O MongoDB **guarda** em **BSON**: *Binary JSON*, um formato binário
- O BSON tem **mais tipos** que o JSON: `ObjectId`, `Date`, inteiro, `Decimal128`
- Cada documento pode ter até **16 MB**

> Na tela você vê JSON; no disco, é BSON. Por isso as ferramentas do MongoDB mostram tipos como `ObjectId(...)` e `Date(...)`.

---

## Pergunta
Você digita um documento em JSON e manda o MongoDB inserir. Como o MongoDB guarda esse documento?

- [x] Em BSON, um formato binário com mais tipos que o JSON
- [ ] Em JSON puro, exatamente como foi digitado no editor
- [ ] Como linha de tabela, com colunas criadas na mesma hora
- [ ] Em XML, convertido automaticamente pelo servidor

> Por quê: o JSON é só o jeito de escrever. O banco converte para BSON, que é binário e tem tipos extras.

---

## O campo `_id`
Todo documento tem um `_id` **único** na coleção. Se você não informar, o MongoDB cria um **ObjectId**:

```json
{
  "_id": ObjectId("6710a1f2c3b4d5e6f7a8b9c0"),
  "nome": "Camiseta Básica",
  "preco": 59.9
}
```

O ObjectId tem **12 bytes**, e os 4 primeiros guardam a **data e hora** em que ele foi gerado.

---

## Pergunta
Você insere `{ "nome": "Boné" }` sem escrever nenhum `_id`. O que acontece?

- [ ] A inserção falha, porque todo documento exige um `_id`
- [x] O MongoDB cria sozinho um `_id` com um ObjectId único
- [ ] O documento fica sem `_id` até alguém editar o registro
- [ ] O MongoDB usa o próprio texto "Boné" como `_id` do registro

> Por quê: `_id` é obrigatório, mas você não precisa escrevê-lo. Sem ele, o MongoDB gera um ObjectId automaticamente.

---

## Sem esquema fixo
- Não existe `CREATE TABLE`: a coleção **nasce no primeiro insert**
- O banco também só passa a existir quando recebe dados
- Documentos da mesma coleção podem ter **campos diferentes**

```js
db.produtos.insertMany([
  { nome: "Camiseta Básica", preco: 59.9, tamanho: "M" },
  { nome: "Notebook Pro", preco: 4599, memoria: "16 GB" }
])
```

---

## Pergunta
A coleção `produtos` tem camisetas com o campo `tamanho`. Você insere um notebook com `memoria` e **sem** `tamanho`. O que acontece?

- [ ] Dá erro, porque o campo tamanho ficou faltando
- [ ] O MongoDB cria `tamanho: null` no notebook sozinho
- [ ] Todas as camisetas ganham o campo `memoria` vazio
- [x] Insere sem erro: cada documento tem seus campos

> Por quê: sem esquema fixo, cada documento carrega só os campos que tem. Nada é criado nos outros.

---

## Flexível não é bagunçado
- Use **sempre o mesmo nome** de campo: `preco`, nunca `Preco` ou `valor`
- Use **sempre o mesmo tipo**: `"preco": 59.9`, não `"preco": "59,90"`
- Texto entre aspas; número sem aspas e com **ponto** decimal
- Se precisar de regra, o MongoDB tem **validação de esquema** (opcional)

> O banco aceita quase tudo. Quem garante a organização é **você**.

---

## Pergunta
Metade dos produtos tem `"preco": 59.9` e a outra metade `"preco": "59,90"`. Qual é o problema?

- [x] Buscar preço menor que 100 ignora os preços em texto
- [ ] O MongoDB converte todos os preços para número sozinho
- [ ] Nenhum, porque sem esquema qualquer tipo serve igual
- [ ] O banco recusa o segundo formato já na hora de inserir

> Por quê: o banco aceita os dois, mas compara número com número. Os preços guardados como texto somem da busca `$lt: 100`.

---

## Inserir e consultar

```js
use megashop

db.produtos.insertOne({ nome: "Boné", preco: 39.9 })

db.produtos.find({ categoria: "roupa" })
db.produtos.find({ preco: { $lt: 100 } })
db.produtos.find({ memoria: { $exists: true } })
```

- `$lt` = menor que; `$gt` = maior que
- O **filtro** é o objeto dentro do `find`: `{ preco: { $lt: 100 } }`

---

## Pergunta
Qual filtro traz **só** os produtos que **têm** o campo `memoria`?

- [ ] `{ $exists: { memoria: true } }`
- [x] `{ memoria: { $exists: true } }`
- [ ] `{ memoria: { $eq: true } }`
- [ ] `{ memoria: true }`

> Por quê: `$exists` fica dentro do campo que você quer testar. `{ memoria: true }` só acharia quem tem memoria igual a true.

---

## Atualizar

```js
db.produtos.updateOne(
  { nome: "Notebook Pro" },
  { $set: { promocao: true, preco: 4299 } }
)
```

- O 1º objeto **acha** o documento; o 2º diz **o que mudar**
- `$set` altera ou cria **só os campos citados**; o resto fica igual
- `updateMany` muda todos os documentos que batem com o filtro

---

## Pergunta
O Notebook Pro entrou em promoção. Com `F = { nome: "Notebook Pro" }`, qual comando marca **só ele**, sem perder os outros campos?

- [ ] `replaceOne(F, { promocao: true })`
- [ ] `updateMany({}, { $set: { promocao: true } })`
- [x] `updateOne(F, { $set: { promocao: true } })`
- [ ] `insertOne({ nome: "Notebook Pro", promocao: true })`

> Por quê: `updateOne` com `$set` muda só o campo citado. `replaceOne` apagaria os outros campos, e `updateMany({})` marcaria todos os produtos.

---

## Onde você vai trabalhar: Mongo Playground
- Um **MongoDB de verdade** no navegador: [mongoplayground.net](https://mongoplayground.net)
- **Gratuito** e **sem criar conta**: não instala nada
- Painel **Database**: os documentos da coleção, em JSON
- Painel **Query**: o comando (`db.produtos.find(...)`); **▶ run** mostra o **Result**
- O site **não grava**: cada ▶ run recomeça do painel Database

> Lá, atualizar é `db.produtos.update(filtro, { $set: ... })`: o mesmo filtro e o mesmo `$set` do `updateOne`.

---

## Pergunta
No Mongo Playground, você roda um `update` que muda o preço do notebook e o Result mostra o preço novo. Depois roda `find` e o preço antigo volta. Por quê?

- [ ] O `update` só vale quando o filtro usa o `_id`
- [x] Cada ▶ run recomeça dos dados do painel Database
- [ ] O `find` sempre mostra a versão anterior do dado
- [ ] O `$set` desfaz a mudança depois de alguns segundos

> Por quê: o Playground não guarda nada entre uma execução e outra. Para a mudança ficar, você edita o documento no painel Database.

---

## O que vimos
+ Tabela vira coleção, linha vira documento, coluna vira campo
+ Você escreve JSON; o MongoDB guarda BSON, com `_id` sempre presente
+ A coleção nasce no primeiro insert e aceita campos diferentes
+ `insertOne`, `find` e `updateOne` com `$set` fazem o básico do dia a dia

---

# Hora da prática!
Abra o módulo "Prática — Catálogo da MegaShop no MongoDB" e siga o roteiro com o professor
