---
titulo: Relatório Técnico de Armazenamento
turma: Desenvolvimento de Sistemas
---

# Relatório Técnico de Armazenamento
Local, em rede e em nuvem: comparar, sintetizar e recomendar

---

## Nesta aula você vai
+ Revisar as três tecnologias de armazenamento estudadas
+ Comparar velocidade, custo, acesso e segurança com dados
+ Aprender a estrutura de um relatório técnico
+ Escrever o seu relatório de fechamento do bloco

---

## Aquecimento
Uma loja com **8 computadores** guarda tudo no HD de um único PC. Numa segunda-feira, o HD queima.

+ O que a loja perdeu?
+ Um NAS teria evitado o problema sozinho?
+ E se os arquivos estivessem só na nuvem e a internet caísse?

> Não existe tecnologia perfeita: existe a **certa para o cenário**. É isso que o relatório vai mostrar.

---

## As três tecnologias

| | Local | Em rede (NAS) | Em nuvem |
|---|---|---|---|
| Onde fica | No próprio computador | Num servidor da rede local | Em datacenters na internet |
| Como acessa | Direto (SATA, NVMe, USB) | Pasta compartilhada (SMB, NFS) | Pela internet (HTTPS) |
| Precisa de internet? | Não | Não (só da rede local) | Sim |
| Exemplo | SSD, HD, pendrive | NAS da escola | Google Drive, OneDrive |

---

## Pergunta
Uma equipe precisa que **todos os 8 computadores** da loja abram os mesmos arquivos, mesmo **sem internet**. Qual tecnologia atende?

- [ ] Armazenamento local no computador de cada funcionário
- [x] Armazenamento em rede, num NAS dentro da própria loja
- [ ] Armazenamento em nuvem, acessado por um site na internet
- [ ] Um pendrive que passa de mão em mão entre os funcionários

> Por quê: o NAS compartilha arquivos pela rede local, sem depender da internet. A nuvem precisaria de conexão.

---

## Velocidade: cuidado com as unidades
- Link e internet em **bits** por segundo (Mbps, Gbps); arquivos em **bytes** (MB, GB)
- **1 byte = 8 bits**: divida os Mbps por 8 para ter o máximo em MB/s
- Rede local de **1 Gbps** ≈ até **125 MB/s**; internet de **100 Mbps** ≈ até **12,5 MB/s**
- Um SSD local costuma ser **mais rápido** que as duas

> No relatório, sempre diga a **unidade**. "É rápido" não é dado técnico; "até 125 MB/s" é.

---

## Pergunta
Um arquivo de **1 GB** (1.000 MB) vai ser baixado da nuvem com uma internet de **100 Mbps**. Qual é o tempo **mínimo** aproximado?

- [ ] Cerca de 10 segundos, porque é só fazer a conta 1.000 ÷ 100 = 10
- [x] Cerca de 80 segundos, porque a internet faz 12,5 MB/s
- [ ] Cerca de 1 segundo, porque 1 GB é pouca coisa hoje
- [ ] Cerca de 8 minutos, porque cada byte leva 8 segundos

> Por quê: 100 Mbps ÷ 8 = 12,5 MB/s, e 1.000 MB ÷ 12,5 MB/s = 80 segundos (na prática, um pouco mais).

---

## Custo, capacidade e escala
- **Local**: paga uma vez pelo disco; cresce trocando ou comprando disco
- **NAS**: compra o equipamento e os discos; atende vários usuários; precisa de alguém para manter
- **Nuvem**: paga por mês (ou usa o plano grátis limitado); cresce na hora, sem comprar equipamento
- Compare sempre o custo **ao longo do tempo**, não só o preço de hoje

---

## Pergunta
A escola precisa de **2 TB a mais** no mês que vem e não quer comprar equipamento agora. Qual tecnologia cresce mais rápido nesse caso?

- [ ] Local, trocando o SSD de cada computador da escola
- [x] Nuvem, ampliando o plano que já está contratado
- [ ] NAS, que aumenta de tamanho sozinho com o tempo
- [ ] Nenhuma, porque o armazenamento não pode aumentar

> Por quê: na nuvem, mais espaço é uma mudança de plano, sem comprar nem instalar nada. Local e NAS exigem comprar discos.

---

## Segurança e backup
- **Redundância** (RAID no NAS) protege contra a falha de **um disco**, mas **não é backup**
- **Regra 3-2-1**: 3 cópias, em 2 mídias diferentes, 1 fora do local
- **Controle de acesso** e **criptografia** valem para as três tecnologias
- Nuvem guarda cópias fora do local, mas depende da **conta** e da **senha** do usuário

---

## Pergunta
A loja comprou um NAS com **RAID 1** (dois discos espelhados). O dono diz: *"agora não preciso mais de backup"*. Ele está certo?

- [ ] Sim, porque o espelho já guarda duas cópias de cada um dos arquivos
- [ ] Sim, porque o NAS fica dentro da loja e ninguém tem acesso
- [x] Não: o RAID não protege de arquivo apagado, vírus ou incêndio
- [ ] Não, porque o RAID 1 só funciona com computadores novos

> Por quê: RAID protege contra a falha de um disco. Apagar um arquivo, um vírus ou um incêndio afetam os dois discos juntos. Backup 3-2-1 continua necessário.

---

## Nos modelos de rede
- **Local**: fora do modelo, o dado não viaja pela rede
- **NAS**: protocolo de **aplicação** (SMB/NFS) sobre TCP/IP, dentro da rede local
- **Nuvem**: protocolo de **aplicação** (HTTPS) sobre TCP/IP, atravessando a internet
- Por isso a velocidade do NAS depende da **rede local**, e a da nuvem, da **internet**

---

## Pergunta
Os downloads da nuvem ficaram lentos, mas os arquivos do NAS continuam rápidos. Onde é mais provável que esteja o gargalo?

- [x] Na conexão com a internet, que só a nuvem usa
- [ ] No SSD do computador, que os dois acessos usam
- [ ] No cabo de rede do PC, que só o NAS usa
- [ ] No protocolo SMB, que só a nuvem usa

> Por quê: o NAS e a nuvem usam a rede local, mas só a nuvem depende da internet. Se só ela ficou lenta, o gargalo está no link externo.

---

## O que é um relatório técnico
1. **Identificação**: título, autor, turma, data
2. **Objetivo**: o que o relatório compara e por quê
3. **Desenvolvimento**: a comparação, critério por critério, com dados
4. **Síntese**: o que as tecnologias têm de forte e de fraco
5. **Recomendação**: a escolha para um cenário concreto, com justificativa
6. **Referências**: de onde vieram as informações

---

## Pergunta
Em qual parte do relatório entra a frase *"Para a loja, recomendo NAS com backup semanal na nuvem, porque..."*?

- [ ] Na identificação, junto com o título e o autor
- [ ] No objetivo, antes de fazer qualquer comparação
- [x] Na recomendação, depois da comparação e da síntese
- [ ] Nas referências, no fim, junto com os links usados

> Por quê: a recomendação vem por último e se apoia no que a comparação e a síntese mostraram.

---

## Escrever como técnico
- Troque **adjetivos** por **dados**: "até 125 MB/s na rede de 1 Gbps", não "muito rápido"
- Use o **mesmo critério** para as três tecnologias (senão não é comparação)
- Diga **quando** cada uma é a melhor, e não só qual é a "melhor"
- Frases curtas, termos corretos (Mbps ≠ MB/s), sem gírias

---

## Pergunta
Qual frase está escrita no estilo de um relatório técnico?

- [ ] "A nuvem é a melhor opção de todas, sem dúvida nenhuma"
- [ ] "O NAS é bem mais rápido e muito mais legal que a nuvem"
- [ ] "Armazenamento local é coisa muito antiga e ninguém mais usa ele hoje"
- [x] "Na rede de 1 Gbps, o NAS transfere até 125 MB/s, sem internet"

> Por quê: a frase técnica traz dado, unidade correta e condição. As outras são opiniões sem critério.

---

## Tendências futuras
- **Armazenamento híbrido**: local ou NAS para o dia a dia + nuvem para o backup fora do local
- **SSD NVMe** cada vez mais barato no armazenamento local
- **Edge computing**: guardar e processar perto de quem usa, para responder mais rápido
- Redes mais rápidas (Wi-Fi 7, 5G) aproximam a nuvem da velocidade da rede local

---

## Pergunta
Para a loja do aquecimento, qual proposta junta melhor **velocidade**, **acesso sem internet** e **backup fora do local**?

- [ ] Só a nuvem, porque ela já guarda cópias em outros lugares
- [ ] Só o NAS com RAID, porque os discos espelhados já bastam
- [x] NAS na loja no dia a dia, com cópia automática na nuvem
- [ ] Um HD externo em cada computador, trocado toda sexta-feira

> Por quê: a solução híbrida usa o NAS para trabalhar rápido e sem internet, e a nuvem como a cópia fora do local da regra 3-2-1.

---

## O que vimos
+ Local, NAS e nuvem: onde ficam, como se acessa e o que exigem
+ Bits × bytes: divida os Mbps por 8 para ter MB/s
+ RAID não é backup; a regra 3-2-1 continua valendo
+ Relatório técnico: comparar com critérios, sintetizar e recomendar

---

# Hora do relatório!
Abra o módulo "Prática — Relatório Técnico Final" e escreva o seu
