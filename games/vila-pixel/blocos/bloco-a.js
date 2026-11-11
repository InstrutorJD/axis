// Bloco A — a Vila (onde o jogo começa).
// Legenda do mapa: . grama  , grama alta  " flores  = caminho  # árvore
// ~ água  F cerca  r pedra  R telhado  W parede  w janela  D porta
// p piso  o fonte (2x2)  b banco  a areia  x ponte
// M muro  P pilar  G trilho do portão (vão de 2 tiles)  c calçada  e rua
// k bicicleta vermelha  K bicicleta azul
VilaPixel.registrarBloco({
  id: 'bloco-a',
  nome: 'Bloco A',
  subtitulo: 'A Vila',
  // o aluno chega pela calçada, do lado de fora do portão da escola
  inicio: { x: 16.5, y: 22, dir: 'cima' },
  // portão de grade (começa fechado): x/y = primeiro tile do vão (G G).
  // Quem abre é o NPC com `abre: '<id do portão>'`.
  portoes: [
    { id: 'portao-escola', x: 16, y: 21 }
  ],
  // nome da escola pintado no muro, à esquerda do portão (x = centro, em tiles)
  letreiros: [
    { x: 11.8, y: 21, texto: 'CEPI JOÃO ROBERTO MOREIRA' }
  ],
  mapa: [
    '########################################',
    '###....................................#',
    '###.RRRRR...RRRRR...RRRRR....RRRRR.....#',
    '###.RRRRR...RRRRR...RRRRR....RRRRR.....#',
    '#...WwDwW...WwDwW...WwDwW....WwDwW.....#',
    '#.....=..."...=..."...=...."...=.......#',
    '#.....=.......=..#....=........=....#..#',
    '#.....=.,,....=.......=...#....=.......#',
    '#..#..=.......=.......=........=.."....#',
    '#.....=.......=.......=..,,....=...,...#',
    '#.....=.......=.......=........=.......#',
    '#.======================================',
    '#.======================================',
    '#........=......==.....................#',
    '#........=......==...............#.....#',
    '#.,..FFFF.FFFF..==.,.pppppppppp........#',
    '#....F"""""""F..==...pkKkKkKkKp........#',
    '#....F"""""""F..==...pppppppppp........#',
    '#....F"""""""F.MpppM.pKkKkKkKkp....#####',
    '####.FFFFFFFFF.MpppM.pppppppppp....#####',
    '####...........MpppM...............#####',
    'MMMMMMMMMMMMMMMPGGMMMMMMMMMMMMMMMMMMMMMM',
    'cccccccccccccccccccccccccccccccccccccccc',
    'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
  ],
  saidas: [
    { x: 39, y: 11, w: 1, h: 2, para: 'bloco-b', chegada: { x: 1, y: 11.5, dir: 'direita' } }
  ],
  npcs: [
    {
      // fixo: não passeia, fica no posto ao lado do portão.
      // alcance: dá para falar com ele por trás da grade.
      // abre: com o portão fechado, ele fala `antesDeAbrir`, vai até a grade,
      // abre com as mãos, volta ao posto e fala `depoisDeAbrir`.
      id: 'porteiro', nome: 'Seu Bento, o porteiro', x: 18, y: 19, fixo: true, alcance: 60,
      abre: 'portao-escola',
      cores: { pele: '#b07a4f', cabelo: '#3b2a20', boina: '#1b2a4a', camisa: '#2c4a7a', calca: '#1f2a3a', sapato: '#111111' },
      antesDeAbrir: ['Bom dia! Só um instante, que eu já abro o portão.'],
      depoisDeAbrir: ['Seja bem-vindo à escola, {nome}!', 'Pode entrar. A vila fica logo ali em cima.'],
      conversas: [
        ['Bom estudo, {nome}! Qualquer coisa, estou aqui no portão.'],
        ['As bicicletas ficam ali no bicicletário. Pode deixar que eu fico de olho.'],
        ['A boina? É o charme do uniforme, ué.']
      ]
    },
    {
      id: 'cida', nome: 'Dona Cida', x: 8, y: 17, raio: 3,
      cores: { pele: '#d9a066', cabelo: '#dcdcdc', cabeloLongo: true, camisa: '#7cb342', calca: '#5d4037' },
      conversas: [
        ['Bom dia! Você é novo por aqui, né?', 'Eu cuido desta horta faz trinta anos. Cada flor tem um nome.', 'Siga a rua para o leste e você chega no Bloco B.'],
        ['As flores gostam de conversa. Sério!', 'Pelo menos é o que eu digo para elas.'],
        ['Já foi ao lago do Bloco C? O Seu Zé passa o dia pescando lá.']
      ]
    },
    {
      id: 'teo', nome: 'Téo', x: 16, y: 9, raio: 7,
      cores: { pele: '#8d5524', cabelo: '#1b1b1b', camisa: '#e53935', calca: '#1e3a8a' },
      conversas: [
        ['Ei! Aposto que eu corro mais rápido que você!', '...Segura o SHIFT e tenta me alcançar.'],
        ['Minha mãe disse que lá na praça tem uma fonte enorme.', 'Um dia eu vou jogar uma moeda nela e pedir um videogame.'],
        ['Você sabia que dá para andar na diagonal? Eu descobri sozinho!']
      ]
    }
  ]
});
