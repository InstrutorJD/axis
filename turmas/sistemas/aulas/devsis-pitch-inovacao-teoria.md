---
titulo: Pitch de Inovação Profissional
turma: Desenvolvimento de Sistemas
---

# Pitch de Inovação Profissional
Uma funcionalidade sua, com meta e resultado

---

## Nesta aula você vai
+ Montar um pitch curto e convincente
+ Criar uma funcionalidade original para o projeto da equipe
+ Mostrar como ela integra plataformas diferentes
+ Transformar a ideia em meta e em tarefas com prazo

---

## Aquecimento
Você entra no elevador com a gerente de uma empresa de software. Ela pergunta: *"E aí, no que você está trabalhando?"*. Você tem **30 segundos**.

+ Você começaria pelo código ou pelo problema que ele resolve?
+ Qual número mostraria que sua ideia funciona?
+ O que você pediria a ela no fim da conversa?

---

## O que é um pitch
- Apresentação **curta** (3 a 5 minutos) para convencer alguém de uma ideia
- Foco em **quem ganha** com ela, não em quanto código ela tem
- Usado para conseguir apoio: tempo da equipe, verba, uma vaga, um cliente
- Termina com um **pedido** claro ("preciso de 1 semana e de mais uma pessoa")

---

## A estrutura do pitch
1. **Problema**: qual dor o usuário tem hoje
2. **Solução**: a funcionalidade que você propõe
3. **Como funciona**: as plataformas e os dados envolvidos
4. **Diferencial**: o resultado que ninguém mais entrega
5. **Meta e plano**: o que vai medir, e as tarefas com prazo
6. **Pedido**: o que você precisa para fazer acontecer

---

## Pergunta
O Rafa abre o pitch mostrando o código da funcionalidade por 3 minutos, e a turma se perde. O que ele deveria ter mostrado primeiro?

- [ ] A lista completa de tecnologias usadas no projeto inteiro
- [x] O problema do usuário que a funcionalidade resolve
- [ ] O cronograma de todas as entregas da equipe
- [ ] Os erros que apareceram enquanto ele programava

> Por quê: o pitch começa pela dor do usuário. Sem entender o problema, ninguém percebe o valor da solução.

---

## Funcionalidade original
- Parte de um **problema real** do usuário do projeto, não de "seria legal ter"
- Pode ser nova no projeto mesmo que exista em outros apps: o original é **como ela resolve o seu caso**
- Ideias: lembrete no celular, login com conta Google, mapa, compartilhar, modo offline, consulta a outro sistema
- Pergunte: *isso muda algo de verdade para quem usa?*

---

## Pergunta
Qual proposta de funcionalidade é mais bem fundamentada para um app de academia?

- [ ] Um tema roxo novo, porque a equipe achou mais bonito
- [ ] Um chat com inteligência artificial, porque é a tecnologia do momento
- [x] Aviso quando o treino atrasa, porque alunos esquecem de ir
- [ ] Uma tela de créditos com o nome de toda a equipe

> Por quê: a proposta parte de um problema observado no usuário (esquecer o treino) e tem um resultado claro (mais presença).

---

## Integrar plataformas
Um mesmo sistema costuma ter **site**, **app de celular** e conversar com **outros sistemas**.

- Todos falam com uma **API**: um endereço na internet que recebe pedidos (HTTP)
- As respostas vêm em **JSON**, que qualquer linguagem entende
- O **banco de dados** fica atrás da API, em um lugar só

> Site ⟶ API ⟶ Banco ⟵ API ⟵ App de celular: os dados são os mesmos, só a tela muda.

---

## Integrando com código
Exemplo: buscar um endereço pelo CEP no ViaCEP, um serviço público e gratuito.

```js
const cep = '01001000';
const url = `https://viacep.com.br/ws/${cep}/json/`;

const resposta = await fetch(url);
const endereco = await resposta.json();

console.log(endereco.logradouro, endereco.localidade);
```

O mesmo pedido funciona num site, num app de celular ou num servidor: é **HTTP + JSON**.

---

## Pergunta
O app de celular e o site da sua equipe precisam mostrar **as mesmas tarefas** do usuário. Qual arquitetura resolve?

- [ ] Um banco de dados separado dentro de cada aplicativo
- [ ] Copiar os dados do site para o app automaticamente toda semana
- [x] Uma API única, com o banco, consultada pelos dois em JSON
- [ ] Salvar as tarefas no navegador de cada pessoa que usa

> Por quê: com uma API e um banco centrais, site e app leem e gravam os mesmos dados, cada um com a sua tela.

---

## Pergunta
Por que o JSON é tão usado para integrar sistemas feitos em linguagens diferentes?

- [x] É texto num formato simples que qualquer linguagem sabe ler
- [ ] É um formato binário que só o JavaScript consegue abrir e entender
- [ ] Ele já traz as telas prontas para o site e para o app
- [ ] Ele criptografa os dados para que ninguém consiga ler

> Por quê: JSON é texto padronizado (objetos, listas, números, textos). Python, Java, C#, JavaScript e outras linguagens leem e escrevem JSON.

---

## Metas SMART
Uma meta boa é:

| Letra | Significa | Exemplo |
|---|---|---|
| **S** | Específica | Aviso de treino atrasado no app |
| **M** | Mensurável | 80% dos avisos abertos |
| **A** | Atingível | Cabe na equipe e no prazo |
| **R** | Relevante | Ajuda o aluno a ir treinar |
| **T** | Temporal | Pronto até 30/11 |

---

## Pergunta
Qual destas é uma meta **SMART** para a funcionalidade de lembrete?

- [ ] Fazer o melhor lembrete de treino que já existiu
- [ ] Melhorar bastante a frequência dos alunos no ano
- [x] Até 30/11, lembrete ativo e 70% dos alunos usando
- [ ] Terminar o lembrete quando a equipe tiver tempo livre

> Por quê: a meta certa é específica, tem número para medir e data. As outras não dizem quando nem quanto.

---

## Comportamento proativo e focado em resultados
+ **Antecipa problemas**: "e se o usuário estiver sem internet?"
+ **Propõe antes de ser cobrado**: traz a ideia com um plano junto
+ **Mede o resultado**: define como vai saber se deu certo
+ **Transforma meta em tarefas** e acompanha no quadro da equipe

---

## Pergunta
Durante o pitch, alguém pergunta: *"E se a API do CEP sair do ar?"*. Qual resposta mostra comportamento proativo?

- [ ] "Isso não vai acontecer, é um serviço muito usado"
- [ ] "Aí não é problema meu, é da empresa da API"
- [x] "Já pensei: o usuário digita o endereço à mão"
- [ ] "Depois eu vejo isso, se acontecer com alguém"

> Por quê: ser proativo é antecipar o risco e já ter um plano para ele, sem esperar o problema aparecer.

---

## Da ideia às tarefas

| Tarefa | Responsável | Prazo |
|---|---|---|
| Tela de configuração do lembrete | Bia | 10/11 |
| Rota na API para salvar o horário | Caio | 14/11 |
| Envio do aviso no celular | Duda | 21/11 |
| Teste com 5 usuários e medição | Equipe | 28/11 |

> A meta vira cartões no **controle de atividades**. Sem isso, o pitch fica só na promessa.

---

## Pergunta
A equipe gostou do pitch, mas duas semanas depois nada foi feito. O que faltou?

- [ ] Um pitch mais longo, com muito mais detalhes sobre a ideia
- [x] Quebrar a meta em tarefas com responsável e prazo
- [ ] Trocar a funcionalidade por outra mais simples
- [ ] Apresentar o pitch de novo para toda a turma

> Por quê: foco em resultado é transformar a meta em tarefas e acompanhar. Sem dono e prazo, a ideia não sai do papel.

---

## Resultado diferenciado
- Diga **o que muda** para o usuário, com número: tempo, cliques, erros, frequência
- Compare com o **antes**: "hoje leva 5 minutos, com a função leva 1"
- Se puder, **mostre**: um protótipo simples, uma tela, um teste funcionando
- Ensaie com cronômetro: **3 a 5 minutos** e 1 ideia por slide

---

## Pergunta
Qual frase mostra melhor um **resultado diferenciado** no pitch?

- [ ] "Nossa funcionalidade é muito inovadora, moderna e diferente"
- [ ] "Usamos as tecnologias mais novas do mercado"
- [ ] "Todos da equipe gostaram muito da nossa ideia"
- [x] "O cadastro caiu de 5 para 1 minuto no nosso teste"

> Por quê: resultado diferenciado é mostrado com dado comparável (antes e depois), não com adjetivos.

---

## O que vimos
+ Pitch: problema, solução, como funciona, diferencial, meta e pedido
+ Integração multiplataforma: site e app falam com a mesma API em JSON
+ Metas SMART e comportamento proativo, que antecipa riscos
+ A meta vira tarefas com dono e prazo no controle de atividades

---

# Hora de preparar o pitch!
Abra o módulo "Prática — Pitch de Inovação" e monte o seu com a equipe
