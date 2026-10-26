---
titulo: Estrutura da Base de Dados do Projeto
turma: Desenvolvimento de Sistemas e Jogos Digitais
---

# Estrutura da Base de Dados do Projeto
Padrões de modelagem relacional para o projeto final

---

## Nesta aula você vai
+ Aplicar os padrões de estrutura de um banco relacional
+ Usar a normalização para achar e resolver problemas de estrutura
+ Seguir um método para resolver problemas na modelagem
+ Montar e validar o script SQL do seu projeto final no SQL Fiddle

---

## Aquecimento
A equipe guardou os dados do projeto numa planilha assim:

| jogador | email | item1 | item2 | item3 |
|---|---|---|---|---|
| Ana | ana@x.com | espada | escudo | |
| Ana | ana@x.com | poção | | |

+ O que acontece se a Ana tiver 4 itens?
+ E se ela trocar de e-mail?
+ Como saber quem tem "espada"?

---

## Os padrões de estrutura
- Cada **entidade** do projeto vira uma **tabela** (usuário, produto, fase, pontuação)
- Cada **atributo** vira uma **coluna**, com tipo definido
- Toda tabela tem **chave primária** (`id`)
- Tabelas se ligam por **chave estrangeira** (`usuario_id`)
- Nomes em minúsculas, sem acento e sem espaço: `snake_case`

> Padrão não é enfeite: é o que deixa o projeto fácil de entender, consultar e corrigir.

---

## Pergunta
No banco do projeto, qual nome de coluna segue o padrão combinado?

- [ ] `Data de Nascimento`
- [ ] `DataNascimentoDoUsuario`
- [x] `data_nascimento`
- [ ] `dt nasc.`

> Por quê: `snake_case` usa minúsculas, sem acento, sem espaço e sem pontuação, com palavras separadas por `_`.

---

## 1FN: um valor por célula
- Cada coluna guarda **um valor só** (nada de "espada, escudo")
- Nada de **grupos repetidos** (`item1`, `item2`, `item3`)
- Se algo se repete, é outra **tabela**: `item` com o `jogador_id`

> Sintoma: coluna com número no fim ou com lista separada por vírgula.

---

## Pergunta
A tabela `jogador` tem as colunas `telefone1`, `telefone2` e `telefone3`. Como resolver o problema?

- [ ] Criar a coluna `telefone4` para os próximos casos
- [ ] Juntar os três numa coluna só, separados por vírgula
- [x] Criar a tabela `telefone` com o `jogador_id` de cada um
- [ ] Apagar os telefones extras e guardar só o primeiro

> Por quê: grupo repetido fere a 1FN. Uma tabela nova aceita quantos telefones forem, cada um numa linha.

---

## 2FN e 3FN: cada dado no seu lugar
- Um dado deve depender **só da chave** da tabela onde ele está
- Se o nome do cliente se repete em cada pedido, ele pertence à tabela **cliente**
- Na tabela `pedido`, fica só o `cliente_id`
- Resultado: mudar o e-mail do cliente é mudar **uma linha**, não cem

---

## Pergunta
A tabela `partida` guarda `jogador_id`, `pontos` e também o `email_do_jogador`. Qual é o problema?

- [x] O e-mail depende do jogador, não da partida: fica repetido
- [ ] Nenhum, porque guardar o e-mail ali deixa a consulta rápida
- [ ] O problema é só o nome da coluna, que está comprido demais
- [ ] O certo seria tirar o `jogador_id` e deixar só o e-mail

> Por quê: o e-mail é do jogador. Guardado em cada partida, ele se repete e pode ficar diferente de uma linha para outra.

---

## Relacionamentos
- **1 para N**: um usuário tem várias tarefas → `tarefa.usuario_id`
- A chave estrangeira fica **sempre do lado N**
- **N para N**: um aluno faz vários cursos e um curso tem vários alunos → tabela **associativa** `matricula (aluno_id, curso_id)`
- A associativa pode ter dados próprios: data, nota, quantidade

---

## Pergunta
Um usuário tem várias transações, e cada transação é de um só usuário. Onde fica a chave estrangeira?

- [x] Em `transacao`, na coluna `usuario_id`
- [ ] Em `usuario`, numa coluna `transacao_id`
- [ ] Nas duas tabelas, uma apontando para a outra
- [ ] Numa tabela nova só com os dois ids

> Por quê: em 1 para N, a chave estrangeira fica do lado N. Cada transação aponta para o seu usuário.

---

## Pergunta
No jogo, cada jogador pode ter várias conquistas, e cada conquista pode ser de vários jogadores. Como estruturar?

- [ ] Colocar `conquista_id` na tabela `jogador`
- [ ] Colocar `jogador_id` na tabela `conquista`
- [x] Criar `jogador_conquista` com as duas chaves
- [ ] Criar uma coluna de texto com todas as conquistas

> Por quê: é um relacionamento N para N. Só uma tabela associativa, com as duas chaves estrangeiras, representa isso sem repetir dados.

---

## Restrições no CREATE TABLE

```sql
CREATE TABLE usuario (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);
CREATE TABLE tarefa (
  id INTEGER PRIMARY KEY,
  titulo TEXT NOT NULL,
  prioridade INTEGER CHECK (prioridade BETWEEN 1 AND 3),
  usuario_id INTEGER NOT NULL REFERENCES usuario(id)
);
```

---

## Pergunta
Dois usuários foram cadastrados com o **mesmo e-mail**, e o login ficou confuso. Qual restrição evita isso na estrutura?

- [ ] `NOT NULL` na coluna `email`
- [x] `UNIQUE` na coluna `email`
- [ ] `CHECK` no tamanho do nome
- [ ] `PRIMARY KEY` na coluna `nome`

> Por quê: `UNIQUE` impede valores repetidos na coluna. `NOT NULL` só impede que ela fique vazia.

---

## Resolver problemas de estrutura: o método
1. **Sintoma**: o que está estranho? (dado repetido, coluna com lista, muito vazio)
2. **Causa**: qual entidade está "escondida" dentro da tabela?
3. **Hipótese**: separar em tabela nova, mover coluna, criar associativa
4. **Teste**: rodar o script no SQL Fiddle com dados de exemplo
5. **Validação**: uma consulta com `JOIN` traz a resposta certa?

---

## Pergunta
O relatório mostra o mesmo produto com **dois preços diferentes** em pedidos do mesmo dia. Qual é o primeiro passo do método?

- [ ] Apagar o relatório e fazer um outro relatório sem a coluna de preço
- [x] Descrever o sintoma e achar em que tabela o preço se repete
- [ ] Trocar o banco de dados por outro mais rápido e moderno
- [ ] Pedir para os usuários não cadastrarem mais os produtos

> Por quê: resolver começa por entender o sintoma e localizar a causa na estrutura, antes de mudar qualquer coisa.

---

## SQL Fiddle: o laboratório online
- Grátis, no navegador, **sem instalar** e sem login: [sqlfiddle.com](https://sqlfiddle.com)
- Escolha o banco **SQLite** (o mesmo que o portal usa para validar)
- Painel do **esquema**: `CREATE TABLE` e `INSERT`
- Painel da **consulta**: `SELECT` para testar
- Rodou sem erro e a consulta trouxe o esperado? Estrutura validada

---

## Pergunta
O script rodou sem erro no SQL Fiddle. O que ainda falta para dizer que a estrutura está **validada**?

- [x] Uma consulta com JOIN que traga a resposta esperada
- [ ] Nada, porque rodar sem erro já garante que está tudo certo
- [ ] Apagar os INSERT para o banco ficar mais leve e rápido
- [ ] Trocar o SQLite por outro banco com mais recursos

> Por quê: rodar sem erro só prova que a sintaxe está certa. A consulta com dados de exemplo mostra que a estrutura responde às perguntas do projeto.

---

## O que vimos
+ Tabela por entidade, `id` como chave primária, chaves estrangeiras e `snake_case`
+ 1FN, 2FN e 3FN revelam grupos repetidos e dados fora do lugar
+ N para N sempre vira tabela associativa
+ Sintoma → causa → hipótese → teste → validação

---

# Hora da prática!
Abra o módulo "Prática — Base de Dados no SQL Fiddle" e estruture o banco do seu projeto
