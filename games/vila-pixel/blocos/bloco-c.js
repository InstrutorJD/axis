// Bloco C — o Bosque e o Lago. Só é baixado quando o jogador entra nele.
// Legenda do mapa: ver blocos/bloco-a.js.
VilaPixel.registrarBloco({
  id: 'bloco-c',
  nome: 'Bloco C',
  subtitulo: 'O Bosque e o Lago',
  mapa: [
    '########################################',
    '###############........................#',
    '###############........................#',
    '#########...........aaa~~~~~~~~~~~~~ar~#',
    '#########..........raa~~~~~~~~~~~~~~~~~#',
    '#........"......#...aa~~~~~~~~~~~~~~~~~#',
    '#...........#.......a~~~~~~~~~~~~~~~~~~#',
    '#....#............".a~~~~~~~~~~~~~~~~~~#',
    '#.........,...#.....a~~~~~~~~~aaaaaa~~~#',
    '#..#.......,........a~~~~~~~~~a....a~~~#',
    '#............"..,...a~~~~~~~~~a..#.a~~~#',
    '====================axxxxxxxxxa....a~~~#',
    '====================axxxxxxxxxa....a~~~#',
    '#.....,.............a~~~~~~~~~a.#..a~~~#',
    '#......#.......,....a~~~~~~~~~a..."a~~~#',
    '#...,........#......a~~~~~~~~~aaaaaa~~~#',
    '#......."........#..a~~~~~~~~~~~~~~~~~~#',
    '##########.#........a~~~~~~~~~~~~~~~~~~#',
    '##########..........aa~~~~~~~~~~~~~~~~~#',
    '##########..........ra~~~~~~~~~~~~~~~~~#',
    '##################..aaa~~~~~~~~~~~~~aa~#',
    '##################.....................#',
    '##################.....................#',
    '########################################'
  ],
  saidas: [
    { x: 0, y: 11, w: 1, h: 2, para: 'bloco-b', chegada: { x: 38, y: 11.5, dir: 'esquerda' } }
  ],
  npcs: [
    {
      id: 'ze', nome: 'Seu Zé', x: 32, y: 11, raio: 2,
      cores: { pele: '#c68642', cabelo: '#9e9e9e', camisa: '#1565c0', calca: '#4e342e' },
      conversas: [
        ['Psiu... fala baixo, senão espanta os peixes.', 'Atravessou a ponte só para me ver? Que gentileza.', 'Esta ilha é o meu lugar favorito do mundo inteiro.'],
        ['Hoje não pegou nada. Ontem também não.', 'Mas amanhã... amanhã eu sinto que vai.'],
        ['A Dona Cida, lá do Bloco A, me manda flores toda semana.']
      ]
    },
    {
      id: 'nina', nome: 'Nina', x: 8, y: 11, raio: 6,
      cores: { pele: '#ffdbac', cabelo: '#ff8f00', cabeloLongo: true, camisa: '#2e7d32', calca: '#795548' },
      conversas: [
        ['Shhh! Achei uma trilha nova no meio das árvores.', 'Brincadeira. Mas um dia esse bosque vai ter segredos, eu sinto.'],
        ['Já contou quantas árvores tem aqui? Eu parei no 47.'],
        ['Se você atravessar a ponte, vai encontrar o Seu Zé pescando.']
      ]
    }
  ]
});
