---
titulo: Integração Industrial com OPC UA
turma: Desenvolvimento de Sistemas
---

# Integração Industrial com OPC UA
Uma língua comum para as máquinas da fábrica

---

## Nesta aula você vai
+ Entender por que integrar máquinas diferentes é difícil
+ Conhecer o modelo cliente-servidor do OPC UA
+ Planejar a coleta automática de dados com qualidade e segurança
+ Preparar o seminário com um fluxo de coleta via OPC

---

## Aquecimento
Uma fábrica tem **3 máquinas de fabricantes diferentes**. Cada uma "fala" um protocolo. O supervisor quer ver **tudo numa tela só**, em tempo real.

+ Quantos "tradutores" seriam precisos se cada software tivesse que falar com cada máquina?
+ E se amanhã chegar uma quarta máquina?
+ Como saber se um número na tela é **confiável**?

---

## O problema da integração
- Sensores e CLPs de fabricantes diferentes usam protocolos diferentes
- Sem padrão, cada software (supervisório, MES, app) precisa de um **driver** para cada máquina
- Mais máquinas e mais softwares = muitos drivers para manter
- O **OPC** cria um jeito **padrão** de expor e ler os dados da fábrica

> OPC = *Open Platform Communications*, mantido pela **OPC Foundation**.

---

## OPC Classic × OPC UA
- **OPC Classic** (ex.: OPC DA): o primeiro padrão, dependente do Windows (COM/DCOM)
- **OPC UA** (*Unified Architecture*): o padrão atual, **multiplataforma**
- Roda em Windows, Linux, CLP e dispositivos embarcados
- Tem **segurança embutida** e um **modelo de informação** rico
- É norma internacional: **IEC 62541**

---

## Pergunta
Uma empresa quer coletar dados de máquinas e enviar para um servidor **Linux**, com criptografia. Qual padrão atende?

- [ ] OPC Classic, porque foi o primeiro padrão criado
- [ ] Nenhum padrão OPC, só drivers próprios de cada máquina
- [x] OPC UA, que é multiplataforma e tem segurança embutida
- [ ] OPC Classic com DCOM, que roda igual em qualquer sistema

> Por quê: o OPC Classic depende da tecnologia COM/DCOM do Windows. O OPC UA roda em qualquer plataforma e já traz criptografia.

---

## Cliente e servidor
- **Servidor OPC UA**: fica perto das máquinas (no CLP ou num computador da linha) e **expõe** os dados
- **Cliente OPC UA**: supervisório (SCADA), MES, app ou dashboard que **lê e escreve** esses dados
- Um servidor atende **vários clientes** ao mesmo tempo
- Endereço típico: `opc.tcp://servidor-linha1:4840` (4840 é a porta padrão)

---

## Pergunta
O supervisório da sala de controle precisa **ler** a temperatura de um forno que tem servidor OPC UA embutido. Qual é o papel do supervisório?

- [x] Cliente OPC UA, que se conecta ao servidor do forno
- [ ] Servidor OPC UA, que expõe os dados do próprio forno
- [ ] Sensor, que mede a temperatura direto dentro do forno
- [ ] CLP, que controla a resistência que aquece o forno

> Por quê: quem expõe os dados é o servidor (no forno). Quem se conecta para ler é o cliente, no caso o supervisório.

---

## Espaço de endereçamento: as tags
Cada dado da máquina é um **nó** (a "tag"), com identificador e atributos:

| Atributo | Exemplo |
|---|---|
| NodeId | `ns=2;s=Forno1.Temperatura` |
| Valor e tipo | 182,5 (Double) |
| Unidade | °C |
| Timestamp | 2026-10-06 08:15:02 |
| StatusCode | Good |

---

## Pergunta
No NodeId `ns=2;s=Forno1.Temperatura`, o que a parte `s=Forno1.Temperatura` representa?

- [ ] A senha que o cliente usa para acessar o servidor OPC UA do forno
- [ ] O endereço IP e a porta do servidor OPC UA
- [x] O identificador (em texto) da tag dentro do servidor
- [ ] A unidade de medida em que o valor foi registrado

> Por quê: o NodeId identifica o nó. `ns` é o espaço de nomes e `s=` indica um identificador em texto, como o nome da tag.

---

## Coleta automática: assinatura
- **Consulta repetida** (*polling*): o cliente pergunta o valor o tempo todo, mesmo sem mudança
- **Assinatura** (*Subscription*): o cliente registra os nós que quer monitorar (*MonitoredItems*)
- O servidor **amostra** o valor e **avisa** o cliente quando ele muda
- Configura-se o **intervalo de amostragem** e quanto o valor precisa mudar para avisar

> Menos tráfego na rede e dado novo assim que ele existe.

---

## Pergunta
Um painel precisa mostrar a pressão de 200 tags quase em tempo real, sem sobrecarregar a rede. Qual forma de coleta é a melhor?

- [ ] Ler as 200 tags a cada 100 ms, mesmo quando nada muda
- [x] Assinar as tags e receber aviso quando o valor mudar
- [ ] Pedir ao operador que digite os valores de hora em hora
- [ ] Copiar um arquivo da máquina para o painel no fim do dia

> Por quê: a assinatura faz o servidor avisar só quando há mudança. É automática e não ocupa a rede com leituras repetidas.

---

## Qualidade do dado
- Todo valor vem com **StatusCode**: **Good** (confiável), **Uncertain** (duvidoso) ou **Bad** (não usar)
- O **timestamp de origem** diz quando o valor foi medido, não quando chegou
- Dado **Bad** não pode virar relatório nem acionar decisão sem tratamento
- Princípios de qualidade: **rastreabilidade**, **calibração** dos sensores, **registro** e melhoria contínua (PDCA)

---

## Pergunta
O sensor de um tanque foi desconectado e o servidor passou a enviar o valor com StatusCode **Bad**. O que o sistema de coleta deve fazer?

- [ ] Gravar normalmente, porque o número ainda está chegando
- [x] Marcar o dado como inválido e avisar a manutenção
- [ ] Trocar o valor por zero para o gráfico não ficar vazio
- [ ] Repetir o último valor bom até o fim do turno de trabalho

> Por quê: Bad significa que o valor não é confiável. Registrar isso e acionar quem resolve é aplicar qualidade à coleta, em vez de esconder o problema.

---

## Segurança no OPC UA
- **Modos de segurança**: *None* (sem proteção), *Sign* (assinado) e *SignAndEncrypt* (assinado e criptografado)
- **Certificados** identificam servidor e cliente
- **Usuário e senha** (ou certificado) definem quem pode ler e quem pode escrever
- Em produção, prefira **SignAndEncrypt** e só dê escrita a quem precisa

---

## Pergunta
Os dados de produção vão circular pela rede da fábrica e ninguém pode **ler** nem **alterar** as mensagens no caminho. Qual modo de segurança usar?

- [ ] None, porque a rede da fábrica já é interna e fechada
- [ ] Sign, que só impede que a mensagem seja alterada
- [x] SignAndEncrypt, que impede alterar e também ler
- [ ] Nenhum modo, basta desligar o Wi-Fi da fábrica toda

> Por quê: Sign garante que ninguém alterou a mensagem. Para que ninguém a leia, é preciso também criptografar: SignAndEncrypt.

---

## O fluxo de coleta automática
1. **Sensor** mede (temperatura, pressão, vazão...)
2. **CLP** lê o sensor e controla a máquina
3. **Servidor OPC UA** expõe as tags com valor, timestamp e StatusCode
4. **Cliente** (supervisório, MES) assina as tags
5. **Histórico** (banco de dados) grava os valores bons
6. **Dashboard, relatórios e alarmes** usam os dados

---

## Pergunta
Qual sequência representa um fluxo de coleta automática via OPC UA?

- [ ] Dashboard → banco histórico → sensor → cliente → servidor OPC UA
- [x] Sensor → CLP → servidor OPC UA → cliente → banco → dashboard
- [ ] Cliente → sensor → dashboard → servidor OPC UA → banco
- [ ] Servidor OPC UA → sensor → dashboard → CLP → cliente

> Por quê: o dado nasce no sensor, passa pelo CLP, é exposto pelo servidor OPC UA, coletado pelo cliente e só então guardado e exibido.

---

## Planejar a integração (seu seminário)
- **Cenário**: qual processo e quais máquinas
- **Tags**: NodeId, tipo, unidade, faixa válida e intervalo de amostragem
- **Coleta**: quem assina, com que frequência, onde grava
- **Qualidade**: o que fazer com Uncertain e Bad, calibração, rastreabilidade
- **Segurança**: modo, usuários e quem pode escrever

> Na próxima aula: **MQTT**, outro jeito de levar esses dados até a nuvem e os apps.

---

## Pergunta
Na tabela de tags da câmara fria, qual informação permite transformar um valor em **alerta de qualidade**?

- [ ] A cor que a tag vai ter no painel do supervisório
- [x] A faixa válida da tag, como 0 a 8 °C
- [ ] O nome do fabricante do sensor que foi instalado
- [ ] O número de série do computador que roda o servidor

> Por quê: com a faixa válida definida, o sistema sabe quando um valor está fora do esperado e dispara o alerta.

---

## O que vimos
+ OPC UA é o padrão multiplataforma para integrar máquinas diferentes
+ Servidor expõe tags; clientes assinam e recebem as mudanças
+ Cada valor traz timestamp e StatusCode: qualidade é parte da coleta
+ Segurança com SignAndEncrypt, certificados e usuários

---

# Hora do seminário!
Abra o módulo "Prática — Seminário de Integração OPC UA" e monte o fluxo com a sua equipe
