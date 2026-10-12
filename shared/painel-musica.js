// Música do painel do professor (professor/painel.html): toca uma playlist
// do YouTube com só play/pause e volume, no topo do painel. Começa parada
// (nada toca sozinho). O player do YouTube só é carregado no 1º play.
//
// Toca o link padrão (PADRAO, abaixo) ou o que o professor colar no ⋯:
// playlist (…?list=…) ou um vídeo só (watch?v=… / youtu.be/…), que fica
// repetindo. Precisa ser público ou não listado (privado não toca
// incorporado). O link escolhido e o volume ficam NESTE navegador
// (localStorage).
//
// A música para se a página do painel for trocada (no app instalado, os
// cartões abrem na mesma janela).
//
// Uso: PainelMusica.montar(elementoOndeEntraOControle)
window.PainelMusica = (function () {
  const CHAVE_LISTA = 'axis.musica.fonte';
  // Música padrão (vídeo longo, repete sem parar).
  const PADRAO = 'https://www.youtube.com/watch?v=oXcce4M_VmY';
  const CHAVE_VOLUME = 'axis.musica.volume';
  const ler = (k, padrao) => { try { const v = localStorage.getItem(k); return v == null ? padrao : v; } catch (e) { return padrao; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* bloqueado */ } };

  const ICONE = {
    play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/>',
    nota: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    som: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>',
    mudo: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/>',
    mais: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  };
  const svg = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONE[n]}</svg>`;

  // Link → { tipo: 'lista' | 'video', id }. Playlist tem prioridade (um
  // watch?v=…&list=… toca a lista inteira).
  function lerLink(texto) {
    const t = String(texto || '').trim();
    let m = t.match(/[?&]list=([A-Za-z0-9_-]+)/);
    if (m) return { tipo: 'lista', id: m[1] };
    m = t.match(/(?:[?&]v=|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
    if (m) return { tipo: 'video', id: m[1] };
    if (/^[A-Za-z0-9_-]{11}$/.test(t)) return { tipo: 'video', id: t };
    if (/^[A-Za-z0-9_-]{12,}$/.test(t)) return { tipo: 'lista', id: t };
    return null;
  }

  let api = null;
  function carregarApi() {
    if (api) return api;
    api = new Promise(resolve => {
      if (window.YT && window.YT.Player) { resolve(window.YT); return; }
      const anterior = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (anterior) anterior(); resolve(window.YT); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    });
    return api;
  }

  function montar(alvo) {
    if (!alvo) return;
    const raiz = document.createElement('div');
    raiz.className = 'pm';
    raiz.innerHTML = `
      <button type="button" class="pm-btn pm-play" aria-label="Tocar a música" title="Tocar a música">${svg('nota')}<span class="pm-estado">${svg('play')}</span></button>
      <div class="pm-extra">
        <label class="pm-volume" title="Volume">
          <span class="pm-ico-vol">${svg('som')}</span>
          <input type="range" min="0" max="100" step="1" aria-label="Volume da música">
        </label>
        <button type="button" class="pm-btn pm-trocar" aria-label="Trocar a música" title="Trocar a música (link do YouTube)">${svg('mais')}</button>
      </div>
      <form class="pm-pop" hidden>
        <label>Link do YouTube (playlist ou vídeo)
          <input type="url" placeholder="https://www.youtube.com/watch?v=…" autocomplete="off" required>
        </label>
        <p class="pm-dica">Precisa ser público ou não listado. Vídeo único fica repetindo.</p>
        <p class="pm-erro" hidden></p>
        <div class="pm-pop-acoes">
          <button type="button" class="btn btn-ghost pm-cancelar">Cancelar</button>
          <button type="submit" class="btn">Salvar</button>
        </div>
      </form>
      <div class="pm-player" aria-hidden="true"><div></div></div>`;
    alvo.prepend(raiz);

    const btnPlay = raiz.querySelector('.pm-play');
    const estado = raiz.querySelector('.pm-estado');
    const vol = raiz.querySelector('.pm-volume input');
    const icoVol = raiz.querySelector('.pm-ico-vol');
    const pop = raiz.querySelector('.pm-pop');
    const campo = pop.querySelector('input');
    const erro = pop.querySelector('.pm-erro');

    let player = null, pronto = false, tocando = false, querTocar = false;
    let fonte = lerLink(ler(CHAVE_LISTA, PADRAO)) || lerLink(PADRAO);

    vol.value = ler(CHAVE_VOLUME, '40');
    const mostrarVolume = () => {
      icoVol.innerHTML = Number(vol.value) === 0 ? svg('mudo') : svg('som');
      vol.style.setProperty('--pm-v', `${vol.value}%`);
    };
    mostrarVolume();

    function mostrarEstado() {
      estado.innerHTML = tocando ? svg('pause') : svg('play');
      const txt = tocando ? 'Pausar a música' : 'Tocar a música';
      btnPlay.setAttribute('aria-label', txt);
      btnPlay.title = txt;
      raiz.classList.toggle('pm-tocando', tocando);
    }

    function abrirPop(msg) {
      campo.value = fonte.tipo === 'lista' ? `https://www.youtube.com/playlist?list=${fonte.id}` : `https://www.youtube.com/watch?v=${fonte.id}`;
      erro.hidden = !msg;
      erro.textContent = msg || '';
      pop.hidden = false;
      campo.focus();
      campo.select();
    }
    const fecharPop = () => { pop.hidden = true; };

    async function criarPlayer() {
      const YT = await carregarApi();
      if (player) { player.destroy(); player = null; pronto = false; }
      raiz.querySelector('.pm-player').innerHTML = '<div></div>';
      player = new YT.Player(raiz.querySelector('.pm-player > div'), {
        width: 200, height: 200,
        ...(fonte.tipo === 'video' ? { videoId: fonte.id } : {}),
        playerVars: {
          controls: 0, playsinline: 1, rel: 0, loop: 1,
          // Vídeo único só repete se ele mesmo for a "playlist".
          ...(fonte.tipo === 'lista' ? { listType: 'playlist', list: fonte.id } : { playlist: fonte.id }),
        },
        events: {
          onReady: () => {
            pronto = true;
            player.setVolume(Number(vol.value));
            if (querTocar) player.playVideo();
          },
          onStateChange: e => {
            tocando = e.data === YT.PlayerState.PLAYING || e.data === YT.PlayerState.BUFFERING;
            mostrarEstado();
          },
          onError: () => {
            // Vídeo removido/bloqueado no meio da lista: pula; lista inválida: avisa.
            if (player && player.getPlaylist && (player.getPlaylist() || []).length > 1) { player.nextVideo(); return; }
            tocando = false; querTocar = false; mostrarEstado();
            abrirPop('Não deu pra tocar esse link. Confira se ele é público ou não listado e se permite ser incorporado.');
          },
        },
      });
    }

    btnPlay.addEventListener('click', async () => {
      if (tocando) { querTocar = false; if (pronto) player.pauseVideo(); return; }
      querTocar = true;
      tocando = true; mostrarEstado(); // resposta imediata enquanto carrega
      if (!player) await criarPlayer();
      else if (pronto) player.playVideo();
    });

    vol.addEventListener('input', () => {
      gravar(CHAVE_VOLUME, vol.value);
      mostrarVolume();
      if (pronto) player.setVolume(Number(vol.value));
    });

    raiz.querySelector('.pm-trocar').addEventListener('click', () => (pop.hidden ? abrirPop() : fecharPop()));
    pop.querySelector('.pm-cancelar').addEventListener('click', fecharPop);
    pop.addEventListener('submit', async e => {
      e.preventDefault();
      const nova = lerLink(campo.value);
      if (!nova) { erro.hidden = false; erro.textContent = 'Não reconheci esse link do YouTube.'; return; }
      const mudou = nova.tipo !== fonte.tipo || nova.id !== fonte.id;
      fonte = nova;
      gravar(CHAVE_LISTA, campo.value.trim());
      fecharPop();
      if (mudou && player) { querTocar = tocando; await criarPlayer(); }
      else if (!player) { querTocar = true; tocando = true; mostrarEstado(); await criarPlayer(); }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) fecharPop(); });
    document.addEventListener('click', e => { if (!pop.hidden && !raiz.contains(e.target)) fecharPop(); });

    mostrarEstado();
  }

  return { montar, lerLink };
})();
