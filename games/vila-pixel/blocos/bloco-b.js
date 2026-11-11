// Bloco B — a Praça. Só é baixado quando o jogador entra nele.
// Legenda do mapa: ver blocos/bloco-a.js.
VilaPixel.registrarBloco({
  id: 'bloco-b',
  nome: 'Bloco B',
  subtitulo: 'A Praça',
  mapa: [
    '########################################',
    '#.............RRRRRRRRRRRR.............#',
    '#.####........RRRRRRRRRRRR.......#####.#',
    '#.####.....,..WwWwWDDWwWwW...,...#####.#',
    '#.####...".........pp........."..#####.#',
    '#..................pp..................#',
    '#...RRRRR...""pppppppppppp""...RRRRR...#',
    '#...RRRRR...pppppppppppppppp...RRRRR...#',
    '#...WwDwW...pppbbppppppbbppp...WwDwW...#',
    '#.....=.....pppppppppppppppp.....=.....#',
    '#.....=.....pppppppppppppppp.....=.....#',
    '============pppppppooppppppp============',
    '============pppppppooppppppp============',
    '#...........pppppppppppppppp........"..#',
    '#.."........pppppppppppppppp..#........#',
    '#....,..#...pppbbppppppbbppp......,....#',
    '#........#..pppppppppppppppp........,..#',
    '#...........""pppppppppppp""...........#',
    '#.#####.........................######.#',
    '#.#####.........................######.#',
    '#.#####,..#..................#..######.#',
    '#.#####.........................######.#',
    '#......................................#',
    '########################################'
  ],
  saidas: [
    { x: 0, y: 11, w: 1, h: 2, para: 'bloco-a', chegada: { x: 38, y: 11.5, dir: 'esquerda' } },
    { x: 39, y: 11, w: 1, h: 2, para: 'bloco-c', chegada: { x: 1, y: 11.5, dir: 'direita' } }
  ],
  npcs: [
    {
      id: 'bit', nome: 'Mestre Bit', x: 17, y: 10, raio: 5,
      cores: { pele: '#f1c27d', cabelo: '#6d4c41', camisa: '#263238', calca: '#37474f' },
      conversas: [
        ['Olá, viajante. Eu sou o Mestre Bit.', 'Sabia que este mundo inteiro é feito de quadradinhos de 16 pixels?', 'Cada letra de um mapa de texto vira um tile. Mágico, não?'],
        ['Um bug é só uma surpresa que ninguém pediu.'],
        ['O prédio grande ali em cima ainda está fechado.', 'Dizem que um dia vai dar para entrar...']
      ]
    },
    {
      id: 'lia', nome: 'Lia', x: 24, y: 14, raio: 5,
      cores: { pele: '#e0ac69', cabelo: '#c2185b', cabeloLongo: true, camisa: '#ffb300', calca: '#4527a0' },
      conversas: [
        ['Oi! Estou desenhando a fonte da praça.', 'O difícil é desenhar a água com tão poucos pixels.'],
        ['Para o leste fica o Bloco C, com um bosque e um lago lindo.', 'Eu vou lá quando preciso de inspiração.'],
        ['Você tem cara de quem gosta de pixel art. Acertei?']
      ]
    }
  ]
});
