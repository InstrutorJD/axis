---
titulo: MQTT na Coleta Automática de Dados
turma: Desenvolvimento de Sistemas
---

# MQTT na Coleta Automática de Dados
Publicar, assinar e configurar o broker

---

## Nesta aula você vai
+ Entender o modelo publicar/assinar e o papel do broker
+ Organizar tópicos e usar os curingas `+` e `#`
+ Escolher QoS, retain e last will para cada dado
+ Configurar um broker com autenticação e permissões

---

## Aquecimento
O sensor da **câmara fria** mede a temperatura a cada 5 segundos. Três sistemas querem esse dado: o **painel**, o **banco histórico** e o **alarme**.

+ O sensor precisa conhecer o endereço dos três?
+ E se amanhã chegar um quarto sistema?
+ Se o painel abrir agora, ele espera 5 segundos para mostrar algo?

---

## Publicar e assinar
- **Publicador** (*publisher*): envia mensagens para um **tópico**
- **Assinante** (*subscriber*): recebe as mensagens dos tópicos que assinou
- **Broker**: o servidor no meio, que recebe tudo e entrega a quem assinou
- Publicador e assinante **não se conhecem**: os dois só falam com o broker

> Leve e simples, o MQTT é muito usado em IoT. É norma **OASIS** (versões 3.1.1 e 5.0).

---

## Pergunta
Um quarto sistema quer receber a temperatura da câmara fria. O que precisa mudar no **sensor**?

- [ ] O sensor precisa receber o endereço IP do novo sistema
- [ ] O sensor precisa enviar a mesma mensagem mais uma vez
- [x] Nada: o novo sistema só assina o tópico no broker
- [ ] O sensor precisa trocar de tópico para o novo sistema

> Por quê: no modelo publicar/assinar, o broker entrega a mensagem a todos os assinantes. O publicador nem sabe quantos são.

---

## Tópicos
- Organizados em **níveis** separados por `/`: `fabrica/camara1/temperatura`
- Do mais geral para o mais específico: local → equipamento → medida
- Diferenciam **maiúsculas e minúsculas**: `Fabrica` ≠ `fabrica`
- Evite espaços e acentos; combine um **padrão** com a equipe

---

## Pergunta
Qual tópico segue as boas práticas para a umidade da estufa 2?

- [ ] `Umidade da Estufa Numero 2`
- [ ] `/UMIDADE/estufa2/`
- [x] `fazenda/estufa2/umidade`
- [ ] `estufa2 umidade atual`

> Por quê: níveis separados por `/`, do geral para o específico, em minúsculas e sem espaços.

---

## Curingas na assinatura
- **`+`** substitui **um** nível: `fabrica/+/temperatura` recebe a temperatura de **todas** as câmaras
- **`#`** substitui **todos os níveis seguintes** e só pode ficar no fim: `fabrica/camara1/#` recebe **tudo** da câmara 1
- Curingas servem para **assinar**, nunca para **publicar**

| Assinatura | `fabrica/camara1/temperatura` | `fabrica/camara2/porta` |
|---|---|---|
| `fabrica/+/temperatura` | Recebe | Não recebe |
| `fabrica/camara1/#` | Recebe | Não recebe |
| `fabrica/#` | Recebe | Recebe |

---

## Pergunta
O banco histórico precisa gravar a **temperatura de todas as câmaras**, e nada além disso. Qual assinatura usar?

- [ ] `fabrica/#`
- [x] `fabrica/+/temperatura`
- [ ] `fabrica/camara1/#`
- [ ] `fabrica/#/temperatura/todas`

> Por quê: `+` troca só o nível da câmara. `fabrica/#` traria tudo (porta, consumo...) e `#` não pode ficar no meio do tópico.

---

## QoS: garantia de entrega
| QoS | Garantia | Uso típico |
|---|---|---|
| 0 | No máximo uma vez (pode perder) | Leitura que se repete a cada segundo |
| 1 | Pelo menos uma vez (pode duplicar) | Leituras que não podem se perder |
| 2 | Exatamente uma vez (mais lento) | Comandos e registros críticos |

> Quanto maior o QoS, mais trocas de mensagem entre cliente e broker.

---

## Pergunta
As leituras da câmara fria vão para um laudo da vigilância sanitária e **nenhuma pode se perder**. Duplicar uma leitura não é problema. Qual QoS?

- [ ] QoS 0, porque é o mais leve para a rede
- [x] QoS 1, que garante a entrega pelo menos uma vez
- [ ] QoS 0, desde que o sensor fique ligado o dia inteiro
- [ ] Nenhum, o MQTT não garante entrega de nada

> Por quê: QoS 1 garante que a mensagem chega (podendo duplicar, o que o banco trata). QoS 2 também serviria, mas é mais pesado sem necessidade.

---

## Retain e last will
- **Retain**: o broker guarda a **última** mensagem do tópico e entrega na hora a quem assinar depois
- **Last will** (*último desejo*): mensagem que o broker publica se o cliente **cair sem avisar**
- Exemplo: o sensor registra o last will `offline` em `fabrica/camara1/status`
- Juntos, eles deixam o painel sempre com o **último valor** e sabendo se o sensor **caiu**

---

## Pergunta
O painel é aberto às 10h e a última leitura foi às 9h59. O que faz ele mostrar a temperatura **na hora**, sem esperar a próxima leitura?

- [ ] QoS 2 na assinatura do painel
- [ ] Last will configurado na conexão do painel
- [x] Retain ligado nas leituras do sensor
- [ ] Um tópico com o curinga `#` no fim

> Por quê: com retain, o broker guarda a última leitura e a entrega assim que o painel assina.

---

## Configurar o broker
- **Porta**: 1883 (MQTT) ou **8883** (MQTT com TLS, criptografado)
- **Sem acesso anônimo**: cada cliente entra com **usuário e senha**
- **ACL** (lista de controle de acesso): quem pode **publicar** e quem pode **assinar** em cada tópico
- **Persistência**: guardar mensagens retidas e sessões se o broker reiniciar

> Princípio de qualidade e segurança: cada cliente só faz **o mínimo** que precisa.

---

## Pergunta
Qual regra de ACL é a mais segura para o usuário do **sensor** da câmara 1?

- [ ] Publicar e assinar em `#`, para ele nunca ficar bloqueado por engano
- [ ] Assinar em `fabrica/#`, para ele ver os outros sensores
- [x] Só publicar em `fabrica/camara1/#`, onde ficam os dados dele
- [ ] Nenhuma regra, pois o broker está dentro da rede local

> Por quê: o sensor só precisa publicar os próprios dados. Dar mais do que isso abre espaço para erro ou ataque.

---

## A mensagem (payload)
Um bom payload traz o **valor**, a **unidade** e **quando** foi medido:

```json
{
  "valor": 4.7,
  "unidade": "°C",
  "timestamp": "2026-10-13T08:15:02Z",
  "sensor": "camara1-t01"
}
```

> Mesma ideia do OPC UA: sem unidade e sem horário, o dado não serve para rastrear nem para laudo.

---

## Pergunta
Qual payload permite **rastrear** cada leitura no laudo da vigilância sanitária?

- [ ] `{"valor": "quatro vírgula sete graus Celsius agora"}`
- [x] `{"valor": 4.7, "unidade": "°C", "timestamp": "08:15Z"}`
- [ ] `{"valor": 4.7, "unidade": "°C", "local": "câmara fria 1"}`
- [ ] `{"temperatura": "4,7", "observacao": "leitura normal ok"}`

> Por quê: rastrear exige saber o valor, a unidade e **quando** foi medido. Sem timestamp, não dá para provar o horário de cada leitura.

---

## MQTT × OPC UA
- **OPC UA**: modelo de informação rico, cliente-servidor, forte **dentro** da fábrica
- **MQTT**: mensagens leves, publicar/assinar, ótimo para **muitos dispositivos** e para a nuvem
- Eles se **complementam**: o OPC UA tem um modo PubSub que pode usar MQTT
- Arquitetura comum: máquinas → OPC UA → gateway → MQTT → nuvem e apps

---

## Pergunta
Uma empresa tem **500 sensores** simples espalhados em fazendas, com internet fraca, mandando leituras para a nuvem. Qual protocolo se encaixa melhor?

- [ ] OPC Classic, porque foi feito para Windows
- [ ] OPC UA cliente-servidor em cada um dos sensores
- [x] MQTT, leve e no modelo publicar/assinar
- [ ] Nenhum, os sensores gravam num pendrive

> Por quê: MQTT foi pensado para dispositivos simples e redes instáveis: mensagens pequenas e um broker que distribui para todos.

---

## O que vimos
+ Publicador → broker → assinantes, sem que eles se conheçam
+ Tópicos em níveis e curingas `+` (um nível) e `#` (o resto)
+ QoS 0/1/2, retain para o último valor, last will para queda
+ Broker configurado com usuários, ACL, porta e persistência

---

# Hora do laboratório!
Abra o módulo "Prática — Laboratório MQTT" e configure a coleta da câmara fria
