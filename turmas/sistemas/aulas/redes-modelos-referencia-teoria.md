---
titulo: Workshop Modelos de Referência
turma: Desenvolvimento de Sistemas
---

# Workshop Modelos de Referência
Cada coisa da rede no seu lugar: camadas OSI e TCP/IP

---

## Nesta aula você vai
+ Revisar as camadas dos modelos OSI e TCP/IP
+ Ligar cada unidade de dado e de medida à sua camada
+ Associar ativos e interfaces de rede às camadas
+ Encaixar o armazenamento local, em rede e em nuvem nos modelos

---

## Aquecimento
O vídeo da aula não carrega no laboratório. Três colegas dão palpites:

+ "O cabo do computador está solto"
+ "O roteador da escola não acha o caminho para a internet"
+ "O site do vídeo está fora do ar"

> Cada palpite aponta para um **andar** diferente da rede. Hoje você vai aprender a dizer qual é qual.

---

## OSI × TCP/IP

| OSI (7 camadas) | TCP/IP (4 camadas) | Exemplo |
|---|---|---|
| 7 Aplicação · 6 Apresentação · 5 Sessão | Aplicação | HTTP, DNS, SMB |
| 4 Transporte | Transporte | TCP, UDP (portas) |
| 3 Rede | Internet | IP, roteamento |
| 2 Enlace · 1 Física | Acesso à rede | Ethernet, Wi-Fi, MAC |

> O **OSI** é o modelo de referência para estudar e diagnosticar. O **TCP/IP** é o que a internet usa na prática.

---

## Pergunta
No modelo TCP/IP, o que acontece com as camadas de Sessão, Apresentação e Aplicação do OSI?

- [ ] Viram parte da camada de Transporte do TCP/IP
- [x] Ficam juntas numa só camada, a de Aplicação
- [ ] Viram parte da camada de Internet do TCP/IP
- [ ] Continuam separadas, do mesmo jeito que no OSI

> Por quê: o TCP/IP é mais enxuto: tudo o que o OSI divide em 5, 6 e 7 fica na camada de Aplicação.

---

## Cada camada tem sua unidade

| Camada OSI | Nome da unidade | O que ela carrega |
|---|---|---|
| 7 Aplicação | Dados (mensagem) | A página, o e-mail, o arquivo |
| 4 Transporte | Segmento | Portas de origem e destino |
| 3 Rede | Pacote | Endereços IP |
| 2 Enlace | Quadro (*frame*) | Endereços MAC |
| 1 Física | Bit | Sinal elétrico, luz ou rádio |

---

## Pergunta
O técnico diz: *"o pacote saiu com o IP de destino errado"*. Em qual camada OSI está o problema?

- [ ] Camada 2, Enlace, que trabalha com o MAC
- [ ] Camada 4, Transporte, que trabalha com portas
- [x] Camada 3, Rede, que trabalha com o IP
- [ ] Camada 7, Aplicação, que trabalha com dados

> Por quê: pacote e endereço IP são coisas da camada de Rede (a camada de Internet, no TCP/IP).

---

## Unidades de medida nas camadas
- **Bit** e **bps** (bits por segundo): a velocidade do **meio físico** (camada 1)
- Um plano de **300 Mbps** fala da camada física e de enlace: é quanto o link transmite
- **Byte**, **MB**, **GB**: o **tamanho dos dados** (arquivo, foto, vídeo), na camada de Aplicação
- Lembre: **1 byte = 8 bits**, então 100 Mbps ≈ 12,5 MB/s no máximo

---

## Pergunta
O link de fibra do laboratório é de **1 Gbps**. Essa medida descreve principalmente qual camada?

- [ ] A camada de Aplicação, onde fica o tamanho dos arquivos
- [ ] A camada de Transporte, onde ficam as portas TCP e UDP
- [ ] A camada de Sessão, onde a conexão é aberta e fechada
- [x] A camada Física, onde os bits viram sinal no meio

> Por quê: bps mede quantos bits o meio transmite por segundo. É a camada física (e o enlace que a controla).

---

## Ativos de rede e suas camadas

| Ativo | Camada OSI | O que ele "enxerga" |
|---|---|---|
| Cabo, hub, repetidor | 1 Física | Só sinal (bits) |
| Placa de rede, switch, access point | 2 Enlace | Endereço MAC (quadro) |
| Roteador | 3 Rede | Endereço IP (pacote) |
| Firewall de pacotes | 3 e 4 | IP e porta |
| Proxy web | 7 Aplicação | O conteúdo (ex.: o site pedido) |

---

## Pergunta
No laboratório, o equipamento entrega cada quadro **só** na porta do computador de destino, olhando o endereço MAC. Ele é um:

- [ ] Hub, que trabalha na camada 1 e repete o sinal para todos
- [x] Switch, que trabalha na camada 2 e lê o endereço MAC
- [ ] Roteador, que trabalha na camada 3 e lê o endereço IP
- [ ] Repetidor, que trabalha na camada 1 e só amplifica o sinal

> Por quê: ler o MAC e encaminhar só para a porta certa é o trabalho do switch, na camada de Enlace.

---

## Pergunta
Qual ativo decide o caminho entre a rede da escola e a internet, lendo o **endereço IP** de cada pacote?

- [ ] O access point, na camada 2
- [ ] O switch, na camada 2
- [x] O roteador, na camada 3
- [ ] O hub, na camada 1

> Por quê: escolher caminhos entre redes diferentes pelo IP é roteamento, função da camada de Rede.

---

## Interfaces de rede
- **Ethernet** (IEEE 802.3): cabo, com endereço MAC. Camadas **1 e 2**
- **Wi-Fi** (IEEE 802.11): rádio, também com MAC. Camadas **1 e 2**
- **Bluetooth**: rádio de curto alcance, para periféricos. Também começa na **1 e 2**
- Tudo o que vem acima (IP, TCP, HTTP) é **igual** no cabo e no Wi-Fi

> Trocar o cabo pelo Wi-Fi muda só as camadas de baixo. O site continua sendo pedido do mesmo jeito.

---

## Armazenamento nos modelos

| Tipo | Como se acessa | Onde entra no modelo |
|---|---|---|
| **Local** (SSD, HD, pendrive) | Direto pelo computador | Não passa pelas camadas de rede |
| **Em rede** (NAS) | Pasta compartilhada (SMB, NFS) na rede local | Protocolo na Aplicação, sobre TCP/IP |
| **Em nuvem** (Drive, OneDrive) | Pela internet (HTTPS) | Aplicação, atravessando a internet |

---

## Pergunta
Os alunos abrem uma pasta compartilhada no **NAS** da escola pelo protocolo **SMB**. Em que camada OSI está esse protocolo?

- [x] Aplicação (7), usando TCP/IP por baixo
- [ ] Transporte (4), no lugar do TCP e do UDP
- [ ] Rede (3), no lugar do endereço IP
- [ ] Física (1), no lugar do cabo de rede

> Por quê: SMB e NFS são protocolos de aplicação. Eles usam TCP/IP para levar os arquivos pela rede.

---

## Pergunta
Um SSD instalado **dentro** do notebook guarda seus arquivos. Qual afirmação é correta?

- [ ] Os dados viram pacotes IP antes de chegar ao SSD
- [ ] O SSD trabalha na camada de Enlace, como um switch
- [x] O acesso não passa pelas camadas do modelo de rede
- [ ] O SSD precisa de internet para gravar os arquivos

> Por quê: armazenamento local é ligado direto ao computador. Os modelos OSI e TCP/IP só entram quando o dado viaja pela rede.

---

## Tendências futuras
- **IPv6**: endereços de 128 bits, muito mais do que o IPv4 comporta (camada 3)
- **Wi-Fi 7** (IEEE 802.11be) e **5G**: mais velocidade nas camadas 1 e 2
- **Edge computing**: processar e guardar dados perto de quem usa
- **Armazenamento híbrido**: local + nuvem, com backup automático

> As tecnologias mudam, mas **as camadas continuam**: é por isso que o modelo serve de referência.

---

## Pergunta
A escola vai trocar os access points por modelos **Wi-Fi 7**. Em quais camadas OSI esse padrão atua?

- [ ] Rede e Transporte (3 e 4), trocando o IP e o TCP
- [x] Física e Enlace (1 e 2), no rádio e no acesso ao meio
- [ ] Aplicação (7), mudando os sites que podem ser abertos
- [ ] Sessão e Apresentação (5 e 6), mudando a criptografia

> Por quê: padrões Wi-Fi (IEEE 802.11) definem o rádio e o acesso ao meio. IP, TCP e aplicações continuam iguais.

---

## O que vimos
+ OSI tem 7 camadas; TCP/IP junta tudo em 4
+ Bit, quadro, pacote, segmento e dados: cada camada com sua unidade
+ Hub na 1, switch e access point na 2, roteador na 3
+ Local fica fora do modelo; NAS e nuvem usam protocolos de aplicação

---

# Hora do workshop!
Abra o módulo "Prática — Ficha de Correlação Técnica" e encaixe cada item na sua camada
