// Vila Pixel — motor do protótipo (Phaser 3).
//
// O mundo é dividido em BLOCOS (Bloco A, B e C), como as áreas do Stardew
// Valley: só o bloco onde o jogador está fica montado na tela. Os dados de
// cada bloco moram num arquivo próprio (vila-pixel/blocos/<id>.js) e só são
// baixados quando o jogador entra nele pela primeira vez — ver carregarBloco().
//
// Formato de um bloco (VilaPixel.registrarBloco):
//   id, nome, subtitulo
//   mapa:   lista de linhas de texto, 1 caractere = 1 tile (legenda abaixo)
//   inicio: { x, y }            onde o jogador nasce (só no bloco inicial)
//   saidas: [{ x, y, w, h, para, chegada: { x, y, dir } }]  em tiles
//   npcs:   [{ id, nome, cores, x, y, raio, conversas: [[fala, ...], ...] }]
//           opcionais: fixo (não passeia), alcance (px para conversar),
//           abre (id de um portão que ele abre ao conversar).
//           Nas falas, {nome} vira o primeiro nome do aluno (?name= da URL).
//   portoes: [{ id, x, y }]  portão de grade de 2 tiles, começa fechado
window.VilaPixel = (function () {
  const T = 16;
  const LARGURA = 384, ALTURA = 216;           // resolução interna (16:9)
  const VEL_JOGADOR = 80, VEL_CORRENDO = 130, VEL_NPC = 28;
  const DIST_CONVERSA = 22;                    // px entre os pés

  // Legenda do mapa → nome do tile (ver VilaArte.TILES).
  const LEGENDA = {
    '.': 'grama', ',': 'gramaAlta', '"': 'flores', '=': 'caminho', '#': 'arvore',
    '~': 'agua', 'F': 'cerca', 'r': 'pedra', 'R': 'telhado', 'W': 'parede',
    'w': 'janela', 'D': 'porta', 'p': 'piso', 'o': 'fonte', 'b': 'banco',
    'a': 'areia', 'x': 'ponte', 'M': 'muro', 'P': 'pilar', 'G': 'trilho',
    'c': 'calcada', 'e': 'asfalto', 'k': 'bicicletaVermelha', 'K': 'bicicletaAzul'
  };
  const SOLIDOS = ['arvore', 'agua', 'cerca', 'pedra', 'telhado', 'parede', 'janela', 'porta',
    'banco', 'fonteTL', 'fonteTR', 'fonteBL', 'fonteBR', 'muro', 'pilar',
    'bicicletaVermelha', 'bicicletaAzul'];

  // Primeiro nome do aluno (o portal abre o jogo com ?name=...); vira {nome} nas falas.
  const NOME_ALUNO = (new URLSearchParams(location.search).get('name') || '').trim().split(/\s+/)[0] || 'aluno';
  const preencher = fala => fala.replace(/\{nome\}/g, NOME_ALUNO);

  const blocos = {};          // dados já carregados, por id
  const memoria = {};         // o que muda enquanto se joga (posição dos NPCs, conversas)
  const idx = nome => VilaArte.TILES.indexOf(nome);

  function registrarBloco(dados) { blocos[dados.id] = dados; }

  function carregarBloco(id) {
    if (blocos[id]) return Promise.resolve(blocos[id]);
    console.log('[VilaPixel] carregando dados do ' + id + '...');
    return new Promise((ok, falha) => {
      const s = document.createElement('script');
      s.src = 'vila-pixel/blocos/' + id + '.js';
      s.onload = () => blocos[id] ? ok(blocos[id]) : falha(new Error('O arquivo de ' + id + ' não registrou o bloco.'));
      s.onerror = () => falha(new Error('Não deu para carregar ' + s.src));
      document.head.appendChild(s);
    });
  }

  // Converte o mapa de texto em índices do tileset.
  function montarDados(mapa) {
    const alt = mapa.length, larg = Math.max(...mapa.map(l => l.length));
    const ch = (x, y) => (mapa[y] || '')[x] || '.';
    const dados = [];
    for (let y = 0; y < alt; y++) {
      const linha = [];
      for (let x = 0; x < larg; x++) {
        let nome = LEGENDA[ch(x, y)] || 'grama';
        if (nome === 'grama') nome = 'grama' + (1 + ((x * 7 + y * 13 + x * y) % 3));
        if (nome === 'fonte') nome = 'fonte' + (ch(x, y - 1) === 'o' ? 'B' : 'T') + (ch(x - 1, y) === 'o' ? 'R' : 'L');
        linha.push(idx(nome));
      }
      dados.push(linha);
    }
    return dados;
  }

  // ---------- telas HTML por cima do jogo (diálogo, nome do bloco) ----------
  const ui = {};
  function prepararUI() {
    ['dialogo', 'dialogoNome', 'dialogoTexto', 'dialogoRetrato', 'dialogoSeta',
      'faixaBloco', 'faixaNome', 'faixaSub', 'hudBloco', 'carregando', 'carregandoTitulo',
      'carregandoFrase', 'carregandoDica'].forEach(id => ui[id] = document.getElementById(id));
  }
  function mostrarFaixa(bloco) {
    ui.faixaNome.textContent = bloco.nome;
    ui.faixaSub.textContent = bloco.subtitulo || '';
    ui.hudBloco.textContent = bloco.nome;
    ui.faixaBloco.classList.remove('ativa'); void ui.faixaBloco.offsetWidth; ui.faixaBloco.classList.add('ativa');
  }

  // ---------- tela de carregamento com "Você sabia?" ----------
  // Fica pelo menos TEMPO_CURIOSIDADE na tela, para dar tempo de ler a frase
  // (lista em vila-pixel/curiosidades.js), e espera o bloco terminar de baixar.
  const TEMPO_CURIOSIDADE = 2500;
  let ultimaFrase = -1;
  function sortearCuriosidade() {
    const lista = window.VILA_CURIOSIDADES || [];
    if (!lista.length) return '';
    let i = Math.floor(Math.random() * lista.length);
    if (lista.length > 1 && i === ultimaFrase) i = (i + 1) % lista.length;
    ultimaFrase = i;
    return lista[i];
  }
  function telaCarregando(id) {
    const frase = sortearCuriosidade();
    ui.carregandoTitulo.textContent = 'Carregando ' + id.replace(/^bloco-(\w+)$/, (m, l) => 'Bloco ' + l.toUpperCase()) + '...';
    ui.carregandoFrase.textContent = frase;
    ui.carregandoDica.hidden = !frase;
    ui.carregando.hidden = false;
    return Promise.all([carregarBloco(id), new Promise(r => setTimeout(r, TEMPO_CURIOSIDADE))])
      .then(([b]) => { ui.carregando.hidden = true; return b; });
  }

  // ---------- cena inicial: gera a arte e carrega o Bloco A ----------
  class Inicio extends Phaser.Scene {
    constructor() { super('Inicio'); }
    create() {
      this.textures.addCanvas('tiles', VilaArte.gerarTileset());
      this.textures.addCanvas('balao', VilaArte.gerarBalao());
      this.textures.addCanvas('seta', VilaArte.gerarSeta());
      this.textures.addCanvas('grade', VilaArte.gerarGrade());
      const primeiro = window.VILA_BLOCO_INICIAL || 'bloco-a';
      telaCarregando(primeiro).then(b => this.scene.start('Mundo', { bloco: b.id, chegada: b.inicio }));
    }
  }

  // Cria (uma vez) a textura e as animações de um personagem.
  function prepararPersonagem(cena, chave, cores) {
    if (cena.textures.exists(chave)) return;
    const tex = cena.textures.addCanvas(chave, VilaArte.gerarPersonagem(cores));
    for (let i = 0; i < 12; i++) tex.add(i, 0, (i % 3) * T, Math.floor(i / 3) * T, T, T);
    VilaArte.DIRECOES.forEach((dir, linha) => {
      const b = linha * 3;
      cena.anims.create({ key: chave + '-andar-' + dir, frameRate: 8, repeat: -1,
        frames: [b + 1, b, b + 2, b].map(f => ({ key: chave, frame: f })) });
    });
  }
  const quadroParado = dir => VilaArte.DIRECOES.indexOf(dir) * 3;

  function corpoNosPes(sprite) {
    sprite.body.setSize(10, 6).setOffset(3, 9);
    sprite.body.setCollideWorldBounds(true);
  }
  const pes = s => ({ x: s.x, y: s.y + 4 });
  function direcaoPara(dx, dy) {
    return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'esquerda' : 'direita') : (dy < 0 ? 'cima' : 'baixo');
  }
  const VETOR = { baixo: [0, 1], cima: [0, -1], esquerda: [-1, 0], direita: [1, 0] };

  // ---------- cena do mundo: monta UM bloco por vez ----------
  class Mundo extends Phaser.Scene {
    constructor() { super('Mundo'); }

    init(dados) {
      this.bloco = blocos[dados.bloco];
      this.chegada = dados.chegada || this.bloco.inicio || { x: 2, y: 2 };
      this.trocando = false;
      this.conversa = null;
      this.ocupado = false;     // true enquanto o portão abre (ninguém se mexe)
    }

    create() {
      const b = this.bloco;
      const dados = montarDados(b.mapa);
      const mapa = this.make.tilemap({ data: dados, tileWidth: T, tileHeight: T });
      const tileset = mapa.addTilesetImage('tiles', 'tiles', T, T, 0, 0);
      this.camada = mapa.createLayer(0, tileset, 0, 0);
      this.camada.setCollision(SOLIDOS.map(idx));
      const largPx = mapa.widthInPixels, altPx = mapa.heightInPixels;
      this.physics.world.setBounds(0, 0, largPx, altPx);

      // jogador
      prepararPersonagem(this, 'jogador', { pele: '#f2c19b', cabelo: '#4a2c1a', camisa: '#3b82c4', calca: '#2c3e6b' });
      const c = this.chegada;
      this.jogador = this.physics.add.sprite(c.x * T + 8, c.y * T + 4, 'jogador', quadroParado(c.dir || 'baixo'));
      this.jogador.direcao = c.dir || 'baixo';
      corpoNosPes(this.jogador);
      this.physics.add.collider(this.jogador, this.camada);

      // NPCs (voltam onde estavam se o jogador já passou por este bloco)
      const mem = memoria[b.id] = memoria[b.id] || { npcs: {} };
      this.npcs = this.physics.add.group();
      (b.npcs || []).forEach(d => {
        prepararPersonagem(this, 'npc-' + d.id, d.cores);
        const salvo = mem.npcs[d.id];
        const n = this.npcs.create(salvo ? salvo.x : d.x * T + 8, salvo ? salvo.y : d.y * T + 4, 'npc-' + d.id, quadroParado('baixo'));
        n.dados = d;
        n.casa = { x: d.x * T + 8, y: d.y * T + 4 };
        n.direcao = salvo ? salvo.direcao : 'baixo';
        n.ia = { estado: 'parado', ate: this.time.now + Phaser.Math.Between(300, 2000) };
        corpoNosPes(n);
        n.body.pushable = false;
        n.setFrame(quadroParado(n.direcao));
      });
      this.physics.add.collider(this.npcs, this.camada);
      this.physics.add.collider(this.npcs, this.npcs);
      this.physics.add.collider(this.jogador, this.npcs);

      // portões de grade: a folha é uma imagem com corpo físico que bloqueia
      // a passagem enquanto está fechada; ao abrir, desliza para o lado (sobre
      // o muro) e o corpo é desligado. Um portão aberto continua aberto.
      mem.portoes = mem.portoes || {};
      this.portoes = {};
      (b.portoes || []).forEach(p => {
        const aberto = !!mem.portoes[p.id];
        const x = p.x * T + 16, y = p.y * T + 8;
        const folha = this.physics.add.staticImage(x + (aberto ? 32 : 0), y, 'grade').setDepth(y + 4);
        folha.body.enable = !aberto;
        this.physics.add.collider(this.jogador, folha);
        this.physics.add.collider(this.npcs, folha);
        this.portoes[p.id] = { dados: p, folha, aberto };
      });

      // letreiros pintados no muro (ex.: o nome da escola).
      // x = centro (em tiles), y = linha do tile de muro onde fica a pintura.
      (b.letreiros || []).forEach((l, i) => {
        const chave = 'letreiro-' + b.id + '-' + i;
        if (!this.textures.exists(chave)) this.textures.addCanvas(chave, VilaArte.gerarLetreiro(l.texto, l.cor || '#1f4f8f'));
        const larg = this.textures.get(chave).getSourceImage().width;
        this.add.image(Math.round(l.x * T - larg / 2), l.y * T + 1, chave).setOrigin(0, 0).setDepth(l.y * T + 15);
      });

      // setas nas saídas
      (b.saidas || []).forEach(s => {
        const leste = s.x * T >= largPx / 2;
        const seta = this.add.image((s.x + s.w / 2) * T + (leste ? -10 : 10), (s.y + s.h / 2) * T, 'seta').setFlipX(!leste).setDepth(9999);
        this.tweens.add({ targets: seta, x: seta.x + (leste ? 3 : -3), duration: 450, yoyo: true, repeat: -1 });
      });

      this.balao = this.add.image(0, 0, 'balao').setOrigin(0.5, 1).setDepth(10000).setVisible(false);
      this.tweens.add({ targets: this.balao, scaleY: 0.85, duration: 380, yoyo: true, repeat: -1 });

      const cam = this.cameras.main;
      cam.setBounds(0, 0, largPx, altPx);
      // Sem "atraso suave" (lerp): com lerp a câmera para entre um pixel e
      // outro e o cenário treme em relação ao personagem.
      cam.startFollow(this.jogador, true, 1, 1);
      cam.setRoundPixels(true);
      cam.fadeIn(250, 0, 0, 0);

      this.teclas = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,E,SPACE,ENTER');
      this.input.keyboard.on('keydown-E', () => this.apertouE());
      this.input.keyboard.on('keydown-SPACE', () => { if (this.conversa) this.apertouE(); });
      this.input.keyboard.on('keydown-ENTER', () => { if (this.conversa) this.apertouE(); });
      ui.dialogo.onclick = () => { if (this.conversa) this.apertouE(); };
      this.events.once('shutdown', () => { ui.dialogo.onclick = null; this.fecharDialogo(); });

      mostrarFaixa(b);
    }

    update(tempo) {
      if (this.trocando) return;
      this.moverJogador();
      this.npcs.getChildren().forEach(n => this.moverNpc(n, tempo));
      [this.jogador, ...this.npcs.getChildren()].forEach(s => s.setDepth(s.y));
      this.atualizarBalao();
      this.conferirSaidas();
    }

    moverJogador() {
      const j = this.jogador, k = this.teclas;
      let vx = 0, vy = 0;
      if (!this.conversa && !this.ocupado) {
        if (k.A.isDown || k.LEFT.isDown) vx -= 1;
        if (k.D.isDown || k.RIGHT.isDown) vx += 1;
        if (k.W.isDown || k.UP.isDown) vy -= 1;
        if (k.S.isDown || k.DOWN.isDown) vy += 1;
      }
      const vel = k.SHIFT.isDown ? VEL_CORRENDO : VEL_JOGADOR;
      const v = new Phaser.Math.Vector2(vx, vy).normalize().scale(vel);
      j.setVelocity(v.x, v.y);
      if (vx || vy) {
        j.direcao = vx ? (vx < 0 ? 'esquerda' : 'direita') : (vy < 0 ? 'cima' : 'baixo');
        j.anims.play('jogador-andar-' + j.direcao, true);
        j.anims.timeScale = vel / VEL_JOGADOR;
      } else {
        j.anims.stop();
        j.setFrame(quadroParado(j.direcao));
      }
    }

    // NPC: fica parado um tempo, escolhe uma direção, anda um pouco, para de novo.
    // Se já se afastou demais de casa (raio, em tiles), tende a voltar.
    moverNpc(n, tempo) {
      const ia = n.ia;
      if (n.animando) return;   // está numa cena (ex.: abrindo o portão)
      // NPC "fixo" (ex.: o porteiro) fica no posto; só se vira para conversar.
      if (n.dados.fixo || n === (this.conversa && this.conversa.npc)) {
        n.setVelocity(0, 0); n.anims.stop(); n.setFrame(quadroParado(n.direcao));
        return;
      }
      const bloqueado = n.body.blocked.left || n.body.blocked.right || n.body.blocked.up || n.body.blocked.down ||
        n.body.touching.left || n.body.touching.right || n.body.touching.up || n.body.touching.down;
      if (ia.estado === 'andando' && (tempo > ia.ate || bloqueado)) {
        ia.estado = 'parado';
        ia.ate = tempo + Phaser.Math.Between(800, 2800);
      } else if (ia.estado === 'parado' && tempo > ia.ate) {
        const raio = (n.dados.raio || 6) * T;
        const dx = n.casa.x - n.x, dy = n.casa.y - n.y;
        n.direcao = Math.hypot(dx, dy) > raio && Math.random() < 0.8
          ? direcaoPara(dx, dy)
          : Phaser.Utils.Array.GetRandom(['baixo', 'cima', 'esquerda', 'direita']);
        ia.estado = 'andando';
        ia.ate = tempo + Phaser.Math.Between(400, 1500);
      }
      if (ia.estado === 'andando') {
        const [x, y] = VETOR[n.direcao];
        n.setVelocity(x * VEL_NPC, y * VEL_NPC);
        n.anims.play('npc-' + n.dados.id + '-andar-' + n.direcao, true);
        n.anims.timeScale = 0.7;
      } else {
        n.setVelocity(0, 0);
        n.anims.stop();
        n.setFrame(quadroParado(n.direcao));
      }
    }

    npcPerto() {
      const p = pes(this.jogador);
      // `alcance` (px) deixa falar de mais longe — o porteiro fala por trás do portão.
      let melhor = null, menor = Infinity;
      this.npcs.getChildren().forEach(n => {
        const q = pes(n), d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < (n.dados.alcance || DIST_CONVERSA) && d < menor) { menor = d; melhor = n; }
      });
      return melhor;
    }

    atualizarBalao() {
      const n = this.conversa || this.ocupado ? null : this.npcPerto();
      this.balao.setVisible(!!n);
      if (n) this.balao.setPosition(n.x, n.y - 9);
    }

    // ---------- diálogo ----------
    apertouE() {
      if (this.trocando || this.ocupado) return;
      if (this.conversa) return this.avancarDialogo();
      const n = this.npcPerto();
      if (!n) return;
      // Quem cuida de um portão fechado: fala `antesDeAbrir`, vai até o
      // portão, abre com as mãos e, de volta ao posto, fala `depoisDeAbrir`.
      const portao = n.dados.abre && this.portoes[n.dados.abre];
      if (portao && !portao.aberto) {
        this.abrirDialogo(n, n.dados.antesDeAbrir || [], () =>
          this.abrirPortao(portao, n, () => this.abrirDialogo(n, n.dados.depoisDeAbrir || [])));
      } else this.abrirDialogo(n);
    }

    // Anda até (x, y) em linha reta: primeiro na vertical, depois na horizontal.
    andarAte(n, x, y, pronto) {
      const passos = [];
      if (Math.round(n.y) !== Math.round(y)) passos.push({ y, dir: y < n.y ? 'cima' : 'baixo', d: Math.abs(y - n.y) });
      if (Math.round(n.x) !== Math.round(x)) passos.push({ x, dir: x < n.x ? 'esquerda' : 'direita', d: Math.abs(x - n.x) });
      const proximo = () => {
        const p = passos.shift();
        if (!p) { n.anims.stop(); n.setFrame(quadroParado(n.direcao)); return pronto(); }
        n.direcao = p.dir;
        n.anims.play('npc-' + n.dados.id + '-andar-' + p.dir, true);
        n.anims.timeScale = 0.8;
        const alvo = p.x !== undefined ? { x: p.x } : { y: p.y };
        this.tweens.add({ targets: n, ...alvo, duration: p.d / 40 * 1000, onComplete: proximo });
      };
      proximo();
    }

    // O porteiro vai até a grade, segura o trinco e anda puxando o portão
    // até ele correr por cima do muro; depois volta ao posto.
    abrirPortao(portao, n, pronto) {
      const f = portao.folha;
      this.ocupado = true;
      this.jogador.setVelocity(0, 0);
      n.animando = true;
      n.setVelocity(0, 0);
      n.body.enable = false;
      const posto = { x: n.x, y: n.y };
      const trinco = { x: f.x + 10, y: f.y - 12 };   // logo atrás da grade, no trinco
      this.andarAte(n, trinco.x, trinco.y, () => {
        n.direcao = 'baixo'; n.setFrame(quadroParado('baixo'));
        this.time.delayedCall(350, () => {           // destrava...
          this.cameras.main.shake(80, 0.0015);
          n.anims.play('npc-' + n.dados.id + '-andar-direita', true);
          n.anims.timeScale = 0.5;
          n.direcao = 'direita';
          this.tweens.add({ targets: [f, n], x: '+=32', duration: 1500, ease: 'Sine.easeInOut',   // ...e puxa
            onComplete: () => {
              f.body.enable = false;
              portao.aberto = true;
              memoria[this.bloco.id].portoes[portao.dados.id] = true;
              n.anims.stop(); n.setFrame(quadroParado('direita'));
              this.time.delayedCall(300, () => this.andarAte(n, posto.x, posto.y, () => {
                n.body.reset(n.x, n.y);
                n.body.enable = true;
                n.animando = false;
                this.ocupado = false;
                pronto();
              }));
            } });
        });
      });
    }

    // falas/aoFim são opcionais: sem elas, usa a próxima lista de `conversas`.
    abrirDialogo(n, falas, aoFim) {
      if (!falas) {
        const mem = memoria[this.bloco.id];
        mem.conversas = mem.conversas || {};
        const vez = mem.conversas[n.dados.id] || 0;
        mem.conversas[n.dados.id] = vez + 1;
        const lista = n.dados.conversas;
        falas = lista[vez % lista.length];
      }
      if (!falas.length) return aoFim && aoFim();
      this.conversa = { npc: n, falas, i: 0, aoFim };

      // o NPC para e olha para o jogador; o jogador olha para o NPC
      n.direcao = direcaoPara(this.jogador.x - n.x, this.jogador.y - n.y);
      this.jogador.direcao = direcaoPara(n.x - this.jogador.x, n.y - this.jogador.y);

      ui.dialogoNome.textContent = n.dados.nome;
      const r = ui.dialogoRetrato, ctx = r.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, r.width, r.height);
      ctx.drawImage(this.textures.get('npc-' + n.dados.id).getSourceImage(), 0, 0, T, T, 0, 0, r.width, r.height);
      ui.dialogo.hidden = false;
      this.escreverFala();
    }

    escreverFala() {
      const conv = this.conversa, texto = preencher(conv.falas[conv.i]);
      let n = 0;
      conv.escrevendo = true;
      ui.dialogoSeta.hidden = true;
      ui.dialogoTexto.textContent = '';
      if (this.maquina) this.maquina.remove();
      this.maquina = this.time.addEvent({
        delay: 28, repeat: texto.length - 1, callback: () => {
          n++;
          ui.dialogoTexto.textContent = texto.slice(0, n);
          if (n >= texto.length) this.terminouFala();
        }
      });
    }
    terminouFala() {
      if (this.maquina) this.maquina.remove();
      this.conversa.escrevendo = false;
      ui.dialogoTexto.textContent = preencher(this.conversa.falas[this.conversa.i]);
      ui.dialogoSeta.hidden = false;
    }
    avancarDialogo() {
      const conv = this.conversa;
      if (conv.escrevendo) return this.terminouFala();
      conv.i++;
      if (conv.i >= conv.falas.length) return this.fecharDialogo();
      this.escreverFala();
    }
    fecharDialogo() {
      if (this.maquina) this.maquina.remove();
      const conv = this.conversa;
      if (conv) {
        conv.npc.ia.estado = 'parado';
        conv.npc.ia.ate = this.time.now + 1500;   // fica um pouquinho parado antes de voltar a andar
      }
      this.conversa = null;
      ui.dialogo.hidden = true;
      // aoFim só quando a conversa termina de verdade (não na troca de bloco)
      if (conv && conv.aoFim && !this.trocando) conv.aoFim();
    }

    // ---------- troca de bloco ----------
    conferirSaidas() {
      const p = pes(this.jogador), tx = p.x / T, ty = p.y / T;
      const s = (this.bloco.saidas || []).find(s => tx >= s.x && tx < s.x + s.w && ty >= s.y && ty < s.y + s.h);
      if (s) this.irPara(s);
    }

    irPara(saida) {
      this.trocando = true;
      this.fecharDialogo();
      this.jogador.setVelocity(0, 0);
      this.npcs.getChildren().forEach(n => n.setVelocity(0, 0));
      // guarda onde cada NPC estava, para ele continuar lá na volta
      const mem = memoria[this.bloco.id];
      this.npcs.getChildren().forEach(n => { mem.npcs[n.dados.id] = { x: n.x, y: n.y, direcao: n.direcao }; });

      const cam = this.cameras.main;
      cam.fadeOut(250, 0, 0, 0);
      cam.once('camerafadeoutcomplete', () => {
        telaCarregando(saida.para)
          .then(() => this.scene.restart({ bloco: saida.para, chegada: saida.chegada }))
          .catch(err => { ui.carregandoTitulo.textContent = '⚠ ' + err.message; console.error(err); });
      });
    }
  }

  // Ampliação sempre inteira (2x, 3x, 4x...): com ampliação quebrada (ex.: 2,9x)
  // uns pixels viram 2 pixels da tela e outros 3, e tudo tremeluz ao andar.
  function zoomInteiro() {
    return Math.max(1, Math.floor(Math.min(innerWidth / LARGURA, innerHeight / ALTURA)));
  }

  function iniciar(elemento) {
    prepararUI();
    const jogo = new Phaser.Game({
      type: Phaser.AUTO,
      parent: elemento,
      width: LARGURA,
      height: ALTURA,
      pixelArt: true,
      roundPixels: true,
      backgroundColor: '#000000',
      physics: { default: 'arcade', arcade: { debug: false } },
      scale: { mode: Phaser.Scale.NONE, zoom: zoomInteiro() },
      scene: [Inicio, Mundo]
    });
    addEventListener('resize', () => jogo.scale.setZoom(zoomInteiro()));
    return jogo;
  }

  return { registrarBloco, carregarBloco, iniciar, zoomInteiro, blocos, memoria };
})();
