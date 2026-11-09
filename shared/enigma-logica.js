// Motor das práticas com enigmas de dedução (padrão novo, docs/padrao-trilhas.md).
// Cada prática só declara os dados e chama EnigmaLogica.iniciar(DADOS).
//
// Dois tipos de etapa:
//  - tipo 'grade': tabela de eliminação. Cada pista traz o texto e uma função
//    `ok(s)`, em que `s` é { linha: coluna }. Ao conferir, a primeira pista
//    desrespeitada é apontada, sem revelar a resposta.
//  - tipo 'caso': uma resposta e, se houver `motivos`, também o motivo.
//  - tipo 'escrita': o aluno preenche os campos, e o texto fica salvo no navegador.
//  - tipo 'copiar': um texto curto para o aluno copiar no caderno; conta como
//    feito quando ele clica em "Já copiei" (usado no Aulão do DS).
//  - tipo 'visto': só abre com as outras etapas prontas e pede o token do professor.
//
// Opção `copiarAtividades: true` (em DADOS): cada 'grade' e 'caso' mostra o
// quadro "✍️ No caderno" e só deixa conferir/enviar depois que o aluno marca
// "Já copiei no caderno" (fica lembrado no navegador). Usado no Aulão do DS.
//
// Progresso: lista de ids das etapas resolvidas (progressTotal no config.js).
(function () {
  function iniciar(DADOS) {
    const LOC = DADOS.activityLocation;
    const user = new URLSearchParams(location.search).get('user') || 'anon';
    const PROGRESS_KEY = `${LOC}_progress_${user}`;
    const STEP_KEY = `${LOC}_step_${user}`;
    const ETAPAS = DADOS.etapas;
    const TOTAL = ETAPAS.length + 2; // abertura + etapas + fechamento
    const stepWrap = document.getElementById('stepWrap');
    let atual;
    let direcao = 1;

    function lerJson(chave, padrao) {
      try { const v = JSON.parse(localStorage.getItem(chave)); return v === null ? padrao : v; } catch (e) { return padrao; }
    }
    function gravar(chave, valor) {
      try { localStorage.setItem(chave, typeof valor === 'string' ? valor : JSON.stringify(valor)); } catch (e) {}
    }
    function lerResolvidos() {
      const a = lerJson(PROGRESS_KEY, []);
      return Array.isArray(a) ? a : [];
    }
    function marcarResolvido(id) {
      const feitos = lerResolvidos();
      if (!feitos.includes(id)) { feitos.push(id); gravar(PROGRESS_KEY, feitos); }
      atualizarBarra();
    }
    function atualizarBarra() {
      document.getElementById('progressFill').style.width = Math.round((lerResolvidos().length / ETAPAS.length) * 100) + '%';
    }
    function reportar(rotulo) {
      if (typeof window.reportActivity === 'function') {
        window.reportActivity(LOC, rotulo, { step: atual + 1, total: TOTAL, resolvidos: lerResolvidos().length });
      }
    }
    function lerEtapa() {
      try { const n = parseInt(localStorage.getItem(STEP_KEY), 10); return n >= 0 && n < TOTAL ? n : 0; } catch (e) { return 0; }
    }
    atual = lerEtapa();

    function nav(voltar, avancar) {
      return `
        <div class="ab-nav">
          ${voltar ? '<button class="btn btn-secondary" id="btnBack">← Voltar</button>' : '<span></span>'}
          <span class="ab-nav-dica">use ← → do teclado</span>
          ${avancar ? '<button class="btn" id="btnNext">Próximo →</button>' : '<span></span>'}
        </div>`;
    }
    function irPara(i) {
      direcao = i < atual ? -1 : 1;
      atual = Math.max(0, Math.min(i, TOTAL - 1));
      gravar(STEP_KEY, String(atual));
      render();
    }
    function ligarNav() {
      const b = document.getElementById('btnBack');
      if (b) b.addEventListener('click', () => irPara(atual - 1));
      const n = document.getElementById('btnNext');
      if (n) n.addEventListener('click', () => irPara(atual + 1));
      document.getElementById('palco').scrollTop = 0;
      window.AulaBase.decorar(stepWrap, {});
      window.AulaBase.transicao(stepWrap.querySelector('.ab-cartao'), direcao);
    }
    // ---- Copiar a atividade no caderno (opção copiarAtividades) ----
    function chaveCaderno(id) { return `${LOC}_caderno_${user}_${id}`; }
    function quadroCaderno(etapa, texto, resolvido) {
      if (!DADOS.copiarAtividades || resolvido) return '';
      const marcado = lerJson(chaveCaderno(etapa.id), false) === true;
      return `
        <div class="en-caderno">
          <div><b>✍️ No caderno:</b> ${texto}</div>
          <label class="en-caderno-check"><input type="checkbox" id="chkCaderno" ${marcado ? 'checked' : ''}> Já copiei no caderno</label>
        </div>`;
    }
    function ligarCaderno(etapa) {
      const chk = document.getElementById('chkCaderno');
      if (chk) chk.addEventListener('change', () => gravar(chaveCaderno(etapa.id), chk.checked));
    }
    // true = pode seguir; false = mostrou o aviso em `msg`.
    function cadernoOk(msg) {
      const chk = document.getElementById('chkCaderno');
      if (!chk || chk.checked) return true;
      msg.style.display = 'block';
      msg.className = 'ab-msg erro';
      msg.textContent = 'Primeiro copie a atividade no caderno, com a sua resposta, e marque "Já copiei no caderno".';
      return false;
    }

    function placar() {
      const feitos = lerResolvidos();
      return `<div class="en-placar">${ETAPAS.map((e, i) => {
        const ok = feitos.includes(e.id);
        return `<span class="${ok ? 'ok' : ''}">${ok ? '✔' : i + 1} ${e.icone || ''}</span>`;
      }).join('')}</div>`;
    }

    function render() {
      document.getElementById('lblStepNum').textContent = atual + 1;
      document.getElementById('lblStepTotal').textContent = TOTAL;
      atualizarBarra();
      if (atual === 0) return renderTexto(DADOS.abertura, false, true, 'Abertura');
      if (atual === TOTAL - 1) return renderFechamento();
      const etapa = ETAPAS[atual - 1];
      if (etapa.tipo === 'grade') renderGrade(etapa);
      else if (etapa.tipo === 'escrita') renderEscrita(etapa);
      else if (etapa.tipo === 'visto') renderVisto(etapa);
      else if (etapa.tipo === 'copiar') renderCopiar(etapa);
      else renderCaso(etapa);
    }

    function renderTexto(bloco, voltar, avancar, rotulo) {
      reportar(`${DADOS.nome} — ${rotulo}`);
      stepWrap.innerHTML = `
        <article class="ab-cartao">
          <div class="ab-cartao-etapa">Etapa ${atual + 1} de ${TOTAL}</div>
          <h2>${bloco.titulo}</h2>
          <div class="ab-conteudo">${bloco.html}</div>
          ${placar()}
        </article>
        ${nav(voltar, avancar)}`;
      ligarNav();
    }

    function renderFechamento() {
      const feitos = lerResolvidos().length;
      const pronto = feitos >= ETAPAS.length;
      reportar(`${DADOS.nome} — Fechamento (${feitos}/${ETAPAS.length})`);
      stepWrap.innerHTML = `
        <article class="ab-cartao ${pronto ? 'ab-concluida' : ''}">
          <div class="ab-cartao-etapa">Etapa ${TOTAL} de ${TOTAL}</div>
          <h2>${pronto ? DADOS.fechamento.titulo : 'Ainda faltam etapas'}</h2>
          <div class="ab-conteudo">
            ${pronto ? DADOS.fechamento.html : `<p>Você resolveu ${feitos} de ${ETAPAS.length}. Volte às etapas que ainda não têm ✔.</p>`}
          </div>
          ${placar()}
        </article>
        ${nav(true, false)}`;
      ligarNav();
    }

    // ---- Grade de eliminação ----
    function renderGrade(etapa) {
      const resolvido = lerResolvidos().includes(etapa.id);
      const chave = `${LOC}_grade_${user}_${etapa.id}`;
      // estado[l][c]: 0 = vazio, 1 = ✖, 2 = ✔
      let estado = lerJson(chave, null);
      const formatoValido = Array.isArray(estado) && estado.length === etapa.linhas.length;
      if (!formatoValido) estado = etapa.linhas.map(() => etapa.colunas.map(() => 0));
      if (resolvido) {
        estado = etapa.linhas.map(l => etapa.colunas.map(c => (etapa.solucao[l] === c ? 2 : 1)));
      }
      reportar(`${DADOS.nome} — ${etapa.titulo}${resolvido ? ' (resolvido)' : ''}`);
      const SIMBOLO = ['', '✖', '✔'];
      const ROTULO = ['vazio', 'não é', 'é'];
      stepWrap.innerHTML = `
        <article class="ab-cartao">
          <div class="ab-cartao-etapa">Etapa ${atual + 1} de ${TOTAL} · Enigma</div>
          <h2>${etapa.titulo}</h2>
          <div class="ab-conteudo">${etapa.intro}</div>
          ${quadroCaderno(etapa, 'copie as pistas, desenhe a tabela e resolva. Depois marque a sua resposta aqui.', resolvido)}
          <div class="en-enigma">
            <div class="en-pistas">
              <div class="en-grupo">Pistas</div>
              <ol>${etapa.pistas.map(p => `<li>${p.t}</li>`).join('')}</ol>
            </div>
            <div class="en-grade-area">
              <div class="en-grupo">Sua tabela: toque para marcar ✖ ou ✔</div>
              <div class="en-grade-rolagem">
                <table class="en-grade">
                  <thead><tr><th scope="col">${etapa.rotuloLinha || ''}</th>${etapa.colunas.map(c => `<th scope="col">${c}</th>`).join('')}</tr></thead>
                  <tbody>
                    ${etapa.linhas.map((l, li) => `<tr><th scope="row">${l}</th>${etapa.colunas.map((c, ci) => `
                      <td><button type="button" class="en-celula en-e${estado[li][ci]}" data-l="${li}" data-c="${ci}" aria-label="${l} e ${c}: ${ROTULO[estado[li][ci]]}" ${resolvido ? 'disabled' : ''}>${SIMBOLO[estado[li][ci]]}</button></td>`).join('')}</tr>`).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="en-acoes">
            <button class="btn" id="btnConferir" ${resolvido ? 'disabled' : ''}>${resolvido ? '✔ Resolvido' : 'Conferir'}</button>
            ${resolvido ? '' : '<button class="btn btn-secondary" id="btnLimpar">Limpar tabela</button>'}
            <div class="ab-msg" id="enMsg" style="display:none;"></div>
          </div>
          <div class="ab-conteudo en-resultado" id="enResultado" style="${resolvido ? '' : 'display:none;'}">${etapa.resultado}</div>
        </article>
        ${nav(true, true)}`;
      ligarNav();
      if (resolvido) return;
      ligarCaderno(etapa);

      const msg = document.getElementById('enMsg');
      stepWrap.querySelectorAll('.en-celula').forEach(btn => {
        btn.addEventListener('click', () => {
          const li = +btn.dataset.l;
          const ci = +btn.dataset.c;
          estado[li][ci] = (estado[li][ci] + 1) % 3;
          const v = estado[li][ci];
          btn.className = `en-celula en-e${v}`;
          btn.textContent = SIMBOLO[v];
          btn.setAttribute('aria-label', `${etapa.linhas[li]} e ${etapa.colunas[ci]}: ${ROTULO[v]}`);
          gravar(chave, estado);
          msg.style.display = 'none';
        });
      });
      document.getElementById('btnLimpar').addEventListener('click', () => {
        estado = etapa.linhas.map(() => etapa.colunas.map(() => 0));
        gravar(chave, estado);
        renderGrade(etapa);
      });
      document.getElementById('btnConferir').addEventListener('click', () => {
        if (!cadernoOk(msg)) return;
        msg.style.display = 'block';
        const porLinha = estado.map(linha => linha.filter(v => v === 2).length);
        const porColuna = etapa.colunas.map((_, ci) => estado.filter(linha => linha[ci] === 2).length);
        if (porLinha.some(n => n !== 1) || porColuna.some(n => n !== 1)) {
          msg.className = 'ab-msg erro';
          msg.textContent = 'Cada linha e cada coluna precisam ter exatamente um ✔. Continue eliminando com ✖.';
          return;
        }
        const s = {};
        etapa.linhas.forEach((l, li) => { s[l] = etapa.colunas[estado[li].indexOf(2)]; });
        const quebrada = etapa.pistas.findIndex(p => !p.ok(s));
        if (quebrada >= 0) {
          msg.className = 'ab-msg erro';
          msg.textContent = `❌ Sua tabela contradiz a pista ${quebrada + 1}. Releia essa pista e veja o que ela elimina.`;
          return;
        }
        marcarResolvido(etapa.id);
        reportar(`${DADOS.nome} — ${etapa.titulo} (resolvido)`);
        renderGrade(etapa);
        const m = document.getElementById('enMsg');
        m.style.display = 'block';
        m.className = 'ab-msg ok';
        m.textContent = '✅ Toda pista foi respeitada: esta é a única solução possível.';
      });
    }

    // ---- Caso: resposta + motivo ----
    function renderCaso(caso) {
      const resolvido = lerResolvidos().includes(caso.id);
      reportar(`${DADOS.nome} — ${caso.titulo}${resolvido ? ' (resolvido)' : ''}`);
      stepWrap.innerHTML = `
        <article class="ab-cartao">
          <div class="ab-cartao-etapa">Etapa ${atual + 1} de ${TOTAL} · Caso</div>
          <h2>${caso.titulo}</h2>
          <div class="ab-conteudo"><div class="en-caso"><div class="en-avatar">${caso.icone || ''}</div><div>${caso.cenario}</div></div></div>
          ${quadroCaderno(caso, caso.motivos
            ? 'copie a situação, as duas perguntas e as alternativas. Escreva a sua resposta e o porquê.'
            : 'copie a situação, a pergunta e as alternativas. Escreva a sua resposta.', resolvido)}
          <div class="en-grupo">${caso.motivos ? '1. ' : ''}${caso.pergunta1}</div>
          <div class="en-opcoes">
            ${caso.opcoes.map((o, i) => `<label class="en-op"><input type="radio" name="g1" value="${i}" ${resolvido && o.ok ? 'checked' : ''}>${o.t}</label>`).join('')}
          </div>
          ${caso.motivos ? `<div class="en-grupo">2. ${caso.pergunta2}</div>
          <div class="en-opcoes">
            ${caso.motivos.map((m, i) => `<label class="en-op"><input type="radio" name="g2" value="${i}" ${resolvido && m.ok ? 'checked' : ''}>${m.t}</label>`).join('')}
          </div>` : ''}
          <div class="en-acoes">
            <button class="btn" id="btnVerificar" ${resolvido ? 'disabled' : ''}>${resolvido ? '✔ Resolvido' : 'Enviar resposta'}</button>
            <div class="ab-msg" id="enMsg" style="display:none;"></div>
          </div>
          <div class="ab-conteudo en-resultado" id="enResultado" style="${resolvido ? '' : 'display:none;'}"><p>${caso.explica}</p></div>
        </article>
        ${nav(true, true)}`;
      ligarNav();
      if (resolvido) return;
      ligarCaderno(caso);
      const btn = document.getElementById('btnVerificar');
      const msg = document.getElementById('enMsg');
      btn.addEventListener('click', () => {
        if (!cadernoOk(msg)) return;
        const r1 = (stepWrap.querySelector('input[name="g1"]:checked') || {}).value;
        const r2 = (stepWrap.querySelector('input[name="g2"]:checked') || {}).value;
        msg.style.display = 'block';
        if (r1 === undefined || (caso.motivos && r2 === undefined)) {
          msg.className = 'ab-msg erro';
          msg.textContent = caso.motivos ? 'Responda as duas perguntas antes de enviar.' : 'Escolha uma resposta antes de enviar.';
          return;
        }
        const ok1 = !!caso.opcoes[+r1].ok;
        const ok2 = !caso.motivos || !!caso.motivos[+r2].ok;
        if (ok1 && ok2) {
          marcarResolvido(caso.id);
          reportar(`${DADOS.nome} — ${caso.titulo} (resolvido)`);
          msg.className = 'ab-msg ok';
          msg.textContent = '✅ Raciocínio certo!';
          btn.disabled = true;
          btn.textContent = '✔ Resolvido';
          document.getElementById('enResultado').style.display = '';
          return;
        }
        msg.className = 'ab-msg erro';
        msg.textContent = ok1
          ? '⚠️ A primeira escolha está certa, mas esse motivo não sustenta a conclusão. Releia o caso.'
          : `❌ Ainda não. Dica: ${caso.dica}`;
      });
    }

    // ---- Texto para copiar no caderno ----
    function renderCopiar(etapa) {
      const feito = lerResolvidos().includes(etapa.id);
      reportar(`${DADOS.nome} — ${etapa.titulo}`);
      stepWrap.innerHTML = `
        <article class="ab-cartao">
          <div class="ab-cartao-etapa">Etapa ${atual + 1} de ${TOTAL} · Copie no caderno</div>
          <h2>${etapa.titulo}</h2>
          <div class="ab-conteudo"><p>📝 Copie o texto abaixo no seu caderno. Ele é a base das atividades seguintes.</p></div>
          <div class="ab-conteudo en-copiar">${etapa.texto}</div>
          <div class="en-acoes">
            <button class="btn" id="btnCopiei" ${feito ? 'disabled' : ''}>${feito ? '✔ Copiado' : 'Já copiei no caderno'}</button>
          </div>
          ${placar()}
        </article>
        ${nav(true, true)}`;
      ligarNav();
      if (feito) return;
      const btn = document.getElementById('btnCopiei');
      btn.addEventListener('click', () => {
        marcarResolvido(etapa.id);
        reportar(`${DADOS.nome} — ${etapa.titulo} (copiado)`);
        btn.disabled = true;
        btn.textContent = '✔ Copiado';
      });
    }

    // ---- Escrita livre: o professor confere o texto na tela, na hora do visto ----
    function renderEscrita(etapa) {
      const chave = `${LOC}_escrita_${user}_${etapa.id}`;
      const salvos = lerJson(chave, {});
      reportar(`${DADOS.nome} — ${etapa.titulo}`);
      stepWrap.innerHTML = `
        <article class="ab-cartao">
          <div class="ab-cartao-etapa">Etapa ${atual + 1} de ${TOTAL} · Agora é com você</div>
          <h2>${etapa.titulo}</h2>
          <div class="ab-conteudo">${etapa.intro}</div>
          <div class="ab-form en-escrita">
            ${etapa.campos.map((c, i) => `<label>${c}<textarea rows="2" maxlength="500" data-i="${i}"></textarea></label>`).join('')}
            <button class="btn" id="btnSalvar">Salvar</button>
            <div class="ab-msg" id="enMsg" style="display:none;"></div>
          </div>
        </article>
        ${nav(true, true)}`;
      ligarNav();
      const areas = [...stepWrap.querySelectorAll('textarea')];
      // .value não interpreta HTML, então o texto do aluno nunca vira código.
      areas.forEach(a => { a.value = salvos[a.dataset.i] || ''; });
      document.getElementById('btnSalvar').addEventListener('click', () => {
        const msg = document.getElementById('enMsg');
        msg.style.display = 'block';
        const dados = {};
        areas.forEach(a => { dados[a.dataset.i] = a.value.trim(); });
        gravar(chave, dados);
        if (areas.some(a => a.value.trim().length < 5)) {
          msg.className = 'ab-msg erro';
          msg.textContent = 'Preencha todos os campos com pelo menos 5 letras.';
          return;
        }
        marcarResolvido(etapa.id);
        msg.className = 'ab-msg ok';
        msg.textContent = '✅ Texto salvo. Você pode ajustar antes de pedir o visto.';
      });
    }

    // ---- Visto do professor (token de Gestão → "Token — Dar Visto / Pular Etapa") ----
    function renderVisto(etapa) {
      const feitos = lerResolvidos();
      const faltam = ETAPAS.filter(e => e.id !== etapa.id && !feitos.includes(e.id)).length;
      const pronto = feitos.includes(etapa.id);
      reportar(`${DADOS.nome} — ${etapa.titulo}`);
      const corpo = pronto
        ? '<p>✅ Visto dado pelo professor.</p>'
        : (faltam
          ? `<p>Ainda faltam ${faltam} etapa(s). Volte às etapas sem ✔ antes de pedir o visto.</p>`
          : `${etapa.intro}<p>Chame o professor e digite o token que ele informar.</p>`);
      stepWrap.innerHTML = `
        <article class="ab-cartao">
          <div class="ab-cartao-etapa">Etapa ${atual + 1} de ${TOTAL} · Visto</div>
          <h2>${etapa.titulo}</h2>
          <div class="ab-conteudo">${corpo}</div>
          ${!pronto && !faltam ? `<div class="ab-form"><label>Token do professor <input type="text" id="vistoToken" inputmode="numeric" maxlength="6" autocomplete="off"></label>
            <button class="btn" id="btnDarVisto">Dar visto</button><div class="ab-msg" id="enMsg" style="display:none;"></div></div>` : ''}
          ${placar()}
        </article>
        ${nav(true, pronto)}`;
      ligarNav();
      const btn = document.getElementById('btnDarVisto');
      if (!btn) return;
      btn.addEventListener('click', async () => {
        const msg = document.getElementById('enMsg');
        const token = document.getElementById('vistoToken').value;
        const erro = texto => { msg.style.display = 'block'; msg.className = 'ab-msg erro'; msg.textContent = texto; };
        if (!token.trim()) { erro('Informe o token do professor.'); return; }
        btn.disabled = true;
        try {
          const r = window.PortalProfessorVisto
            ? await window.PortalProfessorVisto.verificarToken(token)
            : { ok: false, erro: 'Verificação indisponível. Avise o professor.' };
          if (!r.ok) { erro(r.erro || 'Token inválido.'); btn.disabled = false; return; }
          marcarResolvido(etapa.id);
          reportar(`${DADOS.nome} — ${etapa.titulo} (resolvido)`);
          renderVisto(etapa);
        } catch (e) {
          erro('Não foi possível verificar o token. Tente de novo.');
          btn.disabled = false;
        }
      });
    }

    window.generateGabaritoForGestao = function () {
      const limpar = t => String(t).replace(/<[^>]+>/g, '');
      return window.PortalGabarito.generate({
        title: DADOS.nome,
        subtitle: DADOS.subtitulo,
        items: ETAPAS.filter(e => e.tipo !== 'visto' && e.tipo !== 'copiar').map((e, i) => (e.tipo === 'escrita'
          ? { number: i + 1, title: e.titulo, prompt: limpar(e.intro), answer: e.gabarito }
          : e.tipo === 'grade'
          ? {
            number: i + 1,
            title: e.titulo,
            prompt: e.pistas.map((p, n) => `${n + 1}. ${limpar(p.t)}`).join(' '),
            answer: e.linhas.map(l => `${l}: ${e.solucao[l]}`).join('; '),
          }
          : {
            number: i + 1,
            title: e.titulo,
            prompt: `${limpar(e.cenario)} ${e.pergunta1}`,
            answer: e.motivos
              ? `${limpar(e.opcoes.find(o => o.ok).t)} — ${limpar(e.motivos.find(m => m.ok).t)}`
              : limpar(e.opcoes.find(o => o.ok).t),
          })),
        fileName: `${LOC.replace(/_/g, '-')}-gabarito.txt`,
      });
    };

    window.AulaBase.teclado({
      proximo: () => { const b = document.getElementById('btnNext'); if (b) b.click(); },
      anterior: () => { const b = document.getElementById('btnBack'); if (b) b.click(); },
    });

    render();
  }

  // `dados` fica exposto para os roteiros de conferência dos enigmas.
  window.EnigmaLogica = {
    iniciar(dados) { window.EnigmaLogica.dados = dados; iniciar(dados); },
  };
})();
