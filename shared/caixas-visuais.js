// Motor das práticas visuais de programação (padrão novo, docs/padrao-trilhas.md)
// para quem lê com dificuldade. A variável é uma CAIXA, o nome é a etiqueta e o
// valor é o objeto (imagem): `let gato = "🐱";` é JavaScript de verdade.
//
// Nada depende de som: todo retorno é imagem, animação e ✅/❌.
// A correção roda o código montado (new Function), não compara texto.
//
// Tipos de etapa:
//  - 'ver': demonstração. Cada toque em ▶ executa uma linha e atualiza as caixas.
//  - 'montar': toca nas peças para preencher as lacunas do `molde` ({{}}).
//    Pode tentar de novo. `testes`: [{ se, antes, espera: { caixa: valor } }];
//    valor em array = aceita qualquer um deles; '$nome' = escolha feita em 'livre'.
//  - 'escolher': lê o `codigo` e escolhe o que fica na caixa `pergunta`. A resposta
//    certa vem de rodar o código. 1 tentativa, e o erro não revela a certa.
//  - 'digitar': digita a lacuna do `molde`, com o `modelo` na tela.
//  - 'livre': escolha pessoal, sem certo ou errado. Vira `let nome = "valor";`.
//
// Progresso: lista de ids das etapas feitas (progressTotal no config.js).
(function () {
  function esc(t) {
    return String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
  function embaralhar(lista) {
    const a = lista.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  // Roda o código de verdade e devolve o conteúdo das caixas pedidas.
  function rodar(codigo, nomes) {
    try {
      const leitura = nomes.map(n => `${JSON.stringify(n)}: typeof ${n} !== 'undefined' ? ${n} : undefined`).join(', ');
      return { caixas: new Function(`${codigo}\nreturn { ${leitura} };`)() };
    } catch (e) {
      return { erro: true, caixas: {} };
    }
  }
  function colorir(linha) {
    return esc(linha).replace(/(&quot;.*?&quot;)|\b(let|const|var|if|else)\b|\b([a-zA-Z_]\w*)\b/g, (m, texto, chave, nome) => {
      if (texto) return `<span class="cx-c-valor">${texto}</span>`;
      if (chave) return `<span class="cx-c-chave">${chave}</span>`;
      return `<span class="cx-c-nome">${nome}</span>`;
    });
  }
  function caixa(nome, valor, classe) {
    const vazio = valor === undefined || valor === null;
    return `<div class="cx-caixa ${classe || ''}" data-caixa="${esc(nome)}">
      <span class="cx-etiqueta">${esc(nome)}</span>
      <span class="cx-obj">${vazio ? '' : esc(valor)}</span>
    </div>`;
  }

  function iniciar(DADOS) {
    const LOC = DADOS.activityLocation;
    const user = new URLSearchParams(location.search).get('user') || 'anon';
    const PROGRESS_KEY = `${LOC}_progress_${user}`;
    const STEP_KEY = `${LOC}_step_${user}`;
    const ACERTOS_KEY = `${LOC}_acertos_${user}`;
    const ESCOLHAS_KEY = `${LOC}_escolhas_${user}`;
    const ETAPAS = DADOS.etapas;
    const TOTAL = ETAPAS.length + 1; // etapas + fechamento
    const PALAVRAS = DADOS.palavras || {};
    const stepWrap = document.getElementById('stepWrap');
    let isProfessor = false;
    let direcao = 1;

    function ler(chave, padrao) {
      try { const v = JSON.parse(localStorage.getItem(chave)); return v === null ? padrao : v; } catch (e) { return padrao; }
    }
    function gravar(chave, valor) {
      try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) {}
    }
    function feitas() { const a = ler(PROGRESS_KEY, []); return Array.isArray(a) ? a : []; }
    function acertos() { return ler(ACERTOS_KEY, {}) || {}; }
    function escolhas() { return ler(ESCOLHAS_KEY, {}) || {}; }
    function reportar(rotulo) {
      if (typeof window.reportActivity === 'function') {
        window.reportActivity(LOC, `${DADOS.nome} — ${rotulo}`, { step: atual + 1, total: TOTAL, resolvidos: feitas().length });
      }
    }
    function marcar(etapa, resultado) {
      const lista = feitas();
      if (!lista.includes(etapa.id)) { lista.push(etapa.id); gravar(PROGRESS_KEY, lista); }
      const a = acertos();
      a[etapa.id] = resultado;
      gravar(ACERTOS_KEY, a);
      reportar(`${etapa.titulo} (${resultado})`);
      atualizarBarra();
    }
    function atualizarBarra() {
      document.getElementById('progressFill').style.width = Math.round((feitas().length / ETAPAS.length) * 100) + '%';
    }

    let atual = (function () {
      // Sem etapa salva (ex.: trocou de computador), continua na primeira pendente.
      const salvo = parseInt(ler(STEP_KEY, null), 10);
      const primeiraPendente = ETAPAS.findIndex(e => !feitas().includes(e.id));
      const limite = primeiraPendente === -1 ? TOTAL - 1 : primeiraPendente;
      return salvo >= 0 && salvo <= limite ? salvo : limite;
    })();

    // Escolhas de 'livre' viram linhas de código e valores para as outras etapas.
    function valorDeLivre(etapa) {
      const v = escolhas()[etapa.nome];
      return v !== undefined ? v : etapa.opcoes[0].v;
    }
    function preludio() {
      return ETAPAS.filter(e => e.tipo === 'livre').map(e => `let ${e.nome} = ${JSON.stringify(valorDeLivre(e))};`).join('\n');
    }
    function resolver(v) {
      if (typeof v !== 'string' || v[0] !== '$') return v;
      const etapa = ETAPAS.find(e => e.tipo === 'livre' && e.nome === v.slice(1));
      return etapa ? valorDeLivre(etapa) : v;
    }
    function confere(valor, esperado) {
      return Array.isArray(esperado) ? esperado.map(resolver).includes(valor) : valor === resolver(esperado);
    }
    function palavra(v) { return PALAVRAS[v] || ''; }
    function pecaTexto(p) {
      const m = /^"(.*)"$/.exec(p);
      const v = m ? m[1] : p;
      return { principal: v, palavra: m || /^\d+$/.test(p) ? palavra(v) : '', valor: !!m };
    }
    function pecaHtml(p) {
      const t = pecaTexto(p);
      return `<span class="cx-p-principal ${t.valor ? 'cx-p-img' : ''}">${esc(t.principal)}</span>${t.palavra ? `<span class="cx-p-palavra">${esc(t.palavra)}</span>` : ''}`;
    }
    function rodarTeste(etapa, codigo, t) {
      const nomes = Object.keys(t.espera);
      const inicio = (etapa.usaEscolhas ? preludio() + '\n' : '') + (t.antes ? t.antes + '\n' : '');
      const r = rodar(inicio + codigo, nomes);
      const ok = !r.erro && nomes.every(n => confere(r.caixas[n], t.espera[n]));
      return { ok, caixas: r.caixas, nomes };
    }

    // ---- Moldura comum ----
    function placar() {
      const lista = feitas();
      const a = acertos();
      return `<div class="cx-placar">${ETAPAS.map((e, i) => {
        const feito = lista.includes(e.id);
        const errou = feito && a[e.id] === 'errou';
        return `<span class="${feito ? (errou ? 'errou' : 'ok') : ''} ${i === atual ? 'agora' : ''}">${feito ? (errou ? '❌' : '✅') : e.icone}</span>`;
      }).join('')}</div>`;
    }
    function moldura(etapa, corpo) {
      const feito = feitas().includes(etapa.id);
      stepWrap.innerHTML = `
        <article class="ab-cartao cx-cartao">
          <div class="ab-cartao-etapa">Etapa ${atual + 1} de ${TOTAL}</div>
          <h2><span aria-hidden="true">${etapa.icone}</span> ${esc(etapa.titulo)}</h2>
          <div class="ab-conteudo">${corpo}</div>
          ${placar()}
          ${!feito && !isProfessor ? `<details class="cx-pular"><summary>⏭️ Pular (professor)</summary>
            <div class="ab-form"><label>Token do professor <input type="text" id="skipToken" inputmode="numeric" maxlength="6" autocomplete="off"></label>
            <button class="btn" id="btnConfirmSkip">Confirmar e pular</button><div class="ab-msg" id="skipMsg" style="display:none;"></div></div></details>` : ''}
        </article>
        <div class="ab-nav">
          ${atual > 0 ? '<button class="btn btn-secondary" id="btnBack" aria-label="Voltar">⬅️</button>' : '<span></span>'}
          <button class="btn cx-btn-prox" id="btnNext" aria-label="Próximo" ${feito || isProfessor ? '' : 'hidden'}>➡️</button>
        </div>`;
      const b = document.getElementById('btnBack');
      if (b) b.addEventListener('click', () => irPara(atual - 1));
      document.getElementById('btnNext').addEventListener('click', () => irPara(atual + 1));
      ligarPular(etapa);
      document.getElementById('palco').scrollTop = 0;
      window.AulaBase.transicao(stepWrap.querySelector('.ab-cartao'), direcao);
    }
    // O retorno é só visual: precisa aparecer na tela, mesmo em telas pequenas.
    function mostrar(el) {
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    function liberarProximo() {
      const b = document.getElementById('btnNext');
      b.hidden = false;
      mostrar(b);
    }
    function retorno(el, ok) {
      el.className = `cx-retorno ${ok ? 'ok' : 'erro'}`;
      el.textContent = ok ? '✅' : '❌';
      el.setAttribute('role', 'status');
      mostrar(el);
    }
    function ligarPular(etapa) {
      const btn = document.getElementById('btnConfirmSkip');
      if (!btn) return;
      btn.addEventListener('click', async () => {
        const msg = document.getElementById('skipMsg');
        const erro = texto => { msg.style.display = 'block'; msg.className = 'ab-msg erro'; msg.textContent = texto; };
        const token = document.getElementById('skipToken').value;
        if (!token.trim()) { erro('Informe o token do professor.'); return; }
        btn.disabled = true;
        try {
          const r = window.PortalProfessorVisto
            ? await window.PortalProfessorVisto.verificarToken(token)
            : { ok: false, erro: 'Verificação indisponível nesta tela.' };
          if (!r.ok) { erro(r.erro || 'Token inválido.'); btn.disabled = false; return; }
          marcar(etapa, 'pulou');
          render();
        } catch (e) {
          erro('Não foi possível verificar o token. Tente de novo.');
          btn.disabled = false;
        }
      });
    }

    // ---- ver ----
    function renderVer(etapa) {
      let passo = 0;
      const estado = {};
      moldura(etapa, `
        <div class="cx-demo">
          <div class="cx-codigo" id="cxCodigo">${etapa.linhas.map((l, i) => `<div class="cx-linha" data-i="${i}">${colorir(l.c)}</div>`).join('')}</div>
          <div class="cx-balao" id="cxBalao" hidden></div>
          <div class="cx-caixas" id="cxCaixas">${etapa.caixas.map(n => caixa(n)).join('')}</div>
        </div>
        <div class="cx-acoes"><button class="btn cx-btn-rodar" id="btnPasso" aria-label="Rodar a próxima linha">▶</button></div>`);
      const btn = document.getElementById('btnPasso');
      btn.addEventListener('click', () => {
        const linha = etapa.linhas[passo];
        const el = stepWrap.querySelector(`.cx-linha[data-i="${passo}"]`);
        stepWrap.querySelectorAll('.cx-linha').forEach(x => x.classList.remove('cx-agora'));
        el.classList.add(linha.pula ? 'cx-pulada' : 'cx-agora');
        const balao = document.getElementById('cxBalao');
        balao.hidden = !linha.mostra;
        balao.textContent = linha.mostra || '';
        Object.entries(linha.faz || {}).forEach(([nome, valor]) => {
          estado[nome] = valor;
          const c = stepWrap.querySelector(`.cx-caixa[data-caixa="${nome}"]`);
          c.querySelector('.cx-obj').textContent = valor;
          c.classList.remove('cx-enche');
          void c.offsetWidth;
          c.classList.add('cx-enche');
        });
        passo++;
        if (passo >= etapa.linhas.length) {
          btn.hidden = true;
          if (!feitas().includes(etapa.id)) marcar(etapa, 'viu');
          liberarProximo();
        }
      });
    }

    // ---- montar ----
    function renderMontar(etapa) {
      const feito = feitas().includes(etapa.id);
      const total = (etapa.molde.match(/\{\{\}\}/g) || []).length;
      const slots = new Array(total).fill(null);
      const pecas = embaralhar(etapa.pecas);

      function moldeHtml() {
        let n = 0;
        return etapa.molde.split('\n').map(l => `<div class="cx-linha">${l.split('{{}}').map(parte => colorir(parte)).reduce((html, parte, i) => {
          if (i === 0) return parte;
          const idx = n++;
          const p = slots[idx];
          return `${html}<button type="button" class="cx-slot ${p === null ? '' : 'cheio'}" data-slot="${idx}" aria-label="Lacuna ${idx + 1}">${p === null ? '' : pecaHtml(pecas[p])}</button>${parte}`;
        }, '')}</div>`).join('');
      }
      function objetivoHtml() {
        const comSe = etapa.testes.some(t => t.se);
        if (comSe) {
          return `<div class="cx-regras">${etapa.testes.map(t => {
            const nomes = Object.keys(t.espera);
            return `<div class="cx-regra"><span class="cx-regra-se">${esc(t.se)}</span><span class="cx-seta">➡️</span>${nomes.map(n => caixa(n, etapa.ocultar ? '❓' : resolver(t.espera[n]))).join('')}</div>`;
          }).join('')}</div>`;
        }
        const nomes = Object.keys(etapa.testes[0].espera);
        return `<div class="cx-caixas">${nomes.map(n => {
          const v = etapa.testes[0].espera[n];
          return caixa(n, etapa.ocultar || Array.isArray(v) ? '❓' : resolver(v));
        }).join('')}</div>`;
      }
      function resolvidoCodigo() {
        let i = 0;
        return etapa.molde.replace(/\{\{\}\}/g, () => etapa.solucao[i++]);
      }

      if (feito) {
        moldura(etapa, `
          ${etapa.figura ? `<div class="cx-figura">${esc(etapa.figura)}</div>` : ''}
          ${objetivoHtml()}
          <div class="cx-codigo">${resolvidoCodigo().split('\n').map(l => `<div class="cx-linha">${colorir(l)}</div>`).join('')}</div>
          <div class="cx-retorno ok">✅</div>`);
        return;
      }

      moldura(etapa, `
        <div class="cx-montar">
          <div class="cx-montar-lado">
            ${etapa.figura ? `<div class="cx-figura">${esc(etapa.figura)}</div>` : ''}
            ${objetivoHtml()}
            <div class="cx-codigo cx-molde" id="cxMolde"></div>
          </div>
          <div class="cx-montar-lado">
            <div class="cx-instrucao"><span aria-hidden="true">👆</span> ${esc(DADOS.textoPecas || 'Toque nas peças')}</div>
            <div class="cx-pecas" id="cxPecas"></div>
            <div class="cx-acoes"><button class="btn cx-btn-rodar" id="btnRodar" aria-label="Rodar o código" disabled>▶</button></div>
            <div id="cxResultado"></div>
            <div class="cx-retorno" id="cxRetorno"></div>
          </div>
        </div>`);
      const elMolde = document.getElementById('cxMolde');
      const elPecas = document.getElementById('cxPecas');
      const btnRodar = document.getElementById('btnRodar');
      const elRetorno = document.getElementById('cxRetorno');
      const elResultado = document.getElementById('cxResultado');

      function limparRetorno() {
        elRetorno.className = 'cx-retorno';
        elRetorno.textContent = '';
        elResultado.innerHTML = '';
      }
      function desenhar() {
        elMolde.innerHTML = moldeHtml();
        elPecas.innerHTML = pecas.map((p, i) => `<button type="button" class="cx-peca" data-peca="${i}" ${slots.includes(i) ? 'disabled' : ''}>${pecaHtml(p)}</button>`).join('');
        btnRodar.disabled = slots.includes(null);
        elMolde.querySelectorAll('.cx-slot').forEach(b => b.addEventListener('click', () => {
          slots[Number(b.dataset.slot)] = null;
          limparRetorno();
          desenhar();
        }));
        elPecas.querySelectorAll('.cx-peca').forEach(b => b.addEventListener('click', () => {
          const livre = slots.indexOf(null);
          if (livre === -1) return;
          slots[livre] = Number(b.dataset.peca);
          limparRetorno();
          desenhar();
        }));
      }
      btnRodar.addEventListener('click', () => {
        let i = 0;
        const codigo = etapa.molde.replace(/\{\{\}\}/g, () => pecas[slots[i++]]);
        const resultados = etapa.testes.map(t => ({ t, r: rodarTeste(etapa, codigo, t) }));
        const ok = resultados.every(x => x.r.ok);
        elResultado.innerHTML = `<div class="cx-regras">${resultados.map(({ t, r }) => `<div class="cx-regra ${r.ok ? 'cx-regra-ok' : 'cx-regra-erro'}">
          ${t.se ? `<span class="cx-regra-se">${esc(t.se)}</span><span class="cx-seta">➡️</span>` : ''}
          ${r.nomes.map(n => caixa(n, r.caixas[n] === undefined ? '💥' : r.caixas[n], 'cx-enche')).join('')}
          <span class="cx-regra-marca">${r.ok ? '✅' : '❌'}</span></div>`).join('')}</div>`;
        retorno(elRetorno, ok);
        if (ok) {
          marcar(etapa, 'acertou');
          stepWrap.querySelector('.cx-placar').outerHTML = placar();
          elPecas.querySelectorAll('button').forEach(b => { b.disabled = true; });
          elMolde.querySelectorAll('button').forEach(b => { b.disabled = true; });
          btnRodar.hidden = true;
          const pular = stepWrap.querySelector('.cx-pular');
          if (pular) pular.remove();
          liberarProximo();
        } else {
          elRetorno.classList.add('cx-treme');
        }
      });
      desenhar();
    }

    // ---- escolher ----
    function renderEscolher(etapa) {
      const codigo = etapa.codigo.join('\n');
      const certa = rodar(codigo, [etapa.pergunta]).caixas[etapa.pergunta];
      const feito = feitas().includes(etapa.id);
      const resultado = acertos()[etapa.id];
      const opcoes = embaralhar(etapa.opcoes);
      moldura(etapa, `
        <div class="cx-demo">
          <div class="cx-codigo">${etapa.codigo.map(l => `<div class="cx-linha">${colorir(l)}</div>`).join('')}</div>
          <div class="cx-caixas" id="cxCaixas">${caixa(etapa.pergunta, feito && resultado !== 'errou' ? certa : '❓')}</div>
        </div>
        <div class="cx-opcoes" id="cxOpcoes">${opcoes.map(v => `<button type="button" class="cx-opcao" data-v="${esc(v)}" ${feito ? 'disabled' : ''}><span class="cx-p-principal cx-p-img">${esc(v)}</span>${palavra(v) ? `<span class="cx-p-palavra">${esc(palavra(v))}</span>` : ''}</button>`).join('')}</div>
        <div class="cx-retorno ${feito ? (resultado === 'errou' ? 'erro' : 'ok') : ''}" id="cxRetorno">${feito ? (resultado === 'errou' ? '❌' : '✅') : ''}</div>`);
      if (feito) return;
      stepWrap.querySelectorAll('.cx-opcao').forEach(b => b.addEventListener('click', () => {
        const ok = b.dataset.v === String(certa);
        stepWrap.querySelectorAll('.cx-opcao').forEach(x => { x.disabled = true; });
        b.classList.add(ok ? 'cx-opcao-ok' : 'cx-opcao-erro');
        const elRetorno = document.getElementById('cxRetorno');
        retorno(elRetorno, ok);
        if (ok) {
          const c = stepWrap.querySelector(`.cx-caixa[data-caixa="${etapa.pergunta}"]`);
          c.querySelector('.cx-obj').textContent = certa;
          c.classList.add('cx-enche');
        } else {
          elRetorno.classList.add('cx-treme');
        }
        marcar(etapa, ok ? 'acertou' : 'errou');
        stepWrap.querySelector('.cx-placar').outerHTML = placar();
        const pular = stepWrap.querySelector('.cx-pular');
        if (pular) pular.remove();
        liberarProximo();
      }));
    }

    // ---- digitar ----
    function renderDigitar(etapa) {
      const feito = feitas().includes(etapa.id);
      const [antes, depois] = etapa.molde.split('{{}}');
      const nomes = Object.keys(etapa.testes[0].espera);
      moldura(etapa, `
        <div class="cx-caixas">${nomes.map(n => caixa(n, resolver(etapa.testes[0].espera[n]))).join('')}</div>
        <div class="cx-modelo"><span aria-hidden="true">👀</span> <code>${colorir(etapa.modelo)}</code></div>
        <div class="cx-instrucao"><span aria-hidden="true">⌨️</span> ${esc(DADOS.textoDigitar || 'Digite igual')}</div>
        <div class="cx-codigo cx-molde">
          <div class="cx-linha">${colorir(antes)}<input type="text" id="cxTexto" class="cx-digita" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Digite o código" ${feito ? 'disabled' : ''} value="${feito ? esc(etapa.modelo) : ''}">${colorir(depois)}</div>
        </div>
        <div class="cx-acoes"><button class="btn cx-btn-rodar" id="btnRodar" aria-label="Rodar o código" ${feito ? 'hidden' : ''}>▶</button></div>
        <div class="cx-retorno ${feito ? 'ok' : ''}" id="cxRetorno">${feito ? '✅' : ''}</div>`);
      if (feito) return;
      const input = document.getElementById('cxTexto');
      const btn = document.getElementById('btnRodar');
      function testar() {
        const elRetorno = document.getElementById('cxRetorno');
        const codigo = `${antes}${input.value}${depois}`;
        const ok = input.value.trim() !== '' && etapa.testes.every(t => rodarTeste(etapa, codigo, t).ok);
        retorno(elRetorno, ok);
        if (ok) {
          marcar(etapa, 'acertou');
          stepWrap.querySelector('.cx-placar').outerHTML = placar();
          input.disabled = true;
          btn.hidden = true;
          const pular = stepWrap.querySelector('.cx-pular');
          if (pular) pular.remove();
          liberarProximo();
        } else {
          elRetorno.classList.add('cx-treme');
        }
      }
      btn.addEventListener('click', testar);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') testar(); });
      input.focus();
    }

    // ---- livre ----
    function renderLivre(etapa) {
      const salvo = escolhas()[etapa.nome];
      moldura(etapa, `
        <div class="cx-demo">
          <div class="cx-codigo"><div class="cx-linha" id="cxLinha">${colorir(`let ${etapa.nome} = ${salvo !== undefined ? JSON.stringify(salvo) : '❓'};`)}</div></div>
          <div class="cx-caixas">${caixa(etapa.nome, salvo !== undefined ? salvo : '❓')}</div>
        </div>
        <div class="cx-opcoes" id="cxOpcoes">${etapa.opcoes.map(o => `<button type="button" class="cx-opcao ${o.v === salvo ? 'cx-opcao-ok' : ''}" data-v="${esc(o.v)}"><span class="cx-p-principal cx-p-img">${esc(o.v)}</span><span class="cx-p-palavra">${esc(o.p)}</span></button>`).join('')}</div>`);
      stepWrap.querySelectorAll('.cx-opcao').forEach(b => b.addEventListener('click', () => {
        const atuais = escolhas();
        atuais[etapa.nome] = b.dataset.v;
        gravar(ESCOLHAS_KEY, atuais);
        stepWrap.querySelectorAll('.cx-opcao').forEach(x => x.classList.toggle('cx-opcao-ok', x === b));
        document.getElementById('cxLinha').innerHTML = colorir(`let ${etapa.nome} = ${JSON.stringify(b.dataset.v)};`);
        const c = stepWrap.querySelector(`.cx-caixa[data-caixa="${etapa.nome}"]`);
        c.querySelector('.cx-obj').textContent = b.dataset.v;
        c.classList.remove('cx-enche');
        void c.offsetWidth;
        c.classList.add('cx-enche');
        if (!feitas().includes(etapa.id)) {
          marcar(etapa, 'escolheu');
          stepWrap.querySelector('.cx-placar').outerHTML = placar();
          const pular = stepWrap.querySelector('.cx-pular');
          if (pular) pular.remove();
        }
        liberarProximo();
      }));
    }

    // ---- fechamento ----
    function renderFim() {
      const lista = feitas();
      const pronto = lista.length >= ETAPAS.length;
      const a = acertos();
      const corrigidas = ETAPAS.filter(e => a[e.id] === 'acertou' || a[e.id] === 'errou');
      const certas = corrigidas.filter(e => a[e.id] === 'acertou').length;
      const livres = ETAPAS.filter(e => e.tipo === 'livre');
      reportar(`Fechamento (${lista.length}/${ETAPAS.length})`);
      stepWrap.innerHTML = `
        <article class="ab-cartao cx-cartao ${pronto ? 'ab-concluida' : ''}">
          <div class="ab-cartao-etapa">Etapa ${TOTAL} de ${TOTAL}</div>
          <h2>${pronto ? `🏆 ${esc(DADOS.fechamento)}` : '⏳'}</h2>
          <div class="ab-conteudo">
            ${pronto && livres.length ? `
              <div class="cx-caixas">${livres.map(e => caixa(e.nome, valorDeLivre(e))).join('')}</div>
              <div class="cx-codigo">${livres.map(e => `<div class="cx-linha">${colorir(`let ${e.nome} = ${JSON.stringify(valorDeLivre(e))};`)}</div>`).join('')}</div>` : ''}
            ${pronto && corrigidas.length ? `<div class="cx-pontos">✅ ${certas} / ${corrigidas.length}</div>` : ''}
          </div>
          ${placar()}
        </article>
        <div class="ab-nav"><button class="btn btn-secondary" id="btnBack" aria-label="Voltar">⬅️</button><span></span></div>`;
      document.getElementById('btnBack').addEventListener('click', () => irPara(atual - 1));
      window.AulaBase.transicao(stepWrap.querySelector('.ab-cartao'), direcao);
    }

    function irPara(i) {
      if (i < 0 || i > TOTAL - 1) return;
      if (i > atual && atual < ETAPAS.length && !isProfessor && !feitas().includes(ETAPAS[atual].id)) return;
      direcao = i < atual ? -1 : 1;
      atual = i;
      gravar(STEP_KEY, atual);
      render();
    }
    function render() {
      document.getElementById('lblStepNum').textContent = atual + 1;
      document.getElementById('lblStepTotal').textContent = TOTAL;
      atualizarBarra();
      if (atual === TOTAL - 1) return renderFim();
      const etapa = ETAPAS[atual];
      reportar(etapa.titulo);
      if (etapa.tipo === 'ver') renderVer(etapa);
      else if (etapa.tipo === 'montar') renderMontar(etapa);
      else if (etapa.tipo === 'escolher') renderEscolher(etapa);
      else if (etapa.tipo === 'digitar') renderDigitar(etapa);
      else renderLivre(etapa);
    }

    window.generateGabaritoForGestao = function () {
      return window.PortalGabarito.generate({
        title: DADOS.nome,
        subtitle: DADOS.subtitulo,
        items: ETAPAS.map((e, i) => {
          let resposta;
          if (e.tipo === 'ver') resposta = `Demonstração:\n${e.linhas.map(l => l.c).join('\n')}`;
          else if (e.tipo === 'livre') resposta = `Escolha pessoal: let ${e.nome} = ...`;
          else if (e.tipo === 'escolher') resposta = `${e.codigo.join('\n')}\n\n${e.pergunta} = ${rodar(e.codigo.join('\n'), [e.pergunta]).caixas[e.pergunta]}`;
          else if (e.tipo === 'digitar') resposta = e.molde.replace('{{}}', e.modelo);
          else { let n = 0; resposta = e.molde.replace(/\{\{\}\}/g, () => e.solucao[n++]); }
          return { number: i + 1, title: e.titulo, prompt: e.figura || e.titulo, answer: resposta };
        }),
        fileName: `${LOC.replace(/_/g, '-')}-gabarito.txt`,
      });
    };

    window.AulaBase.teclado({
      proximo: () => { const b = document.getElementById('btnNext'); if (b && !b.hidden) b.click(); },
      anterior: () => { const b = document.getElementById('btnBack'); if (b) b.click(); },
    });

    render();

    (async function () {
      const u = window.PortalSession ? await window.PortalSession.getUser() : null;
      if (u && (u.role === 'professor' || u.role === 'admin')) {
        isProfessor = true;
        render();
      }
    })();
  }

  // `dados` e `rodar` ficam expostos para os roteiros de conferência.
  window.CaixasVisuais = {
    rodar,
    iniciar(dados) { window.CaixasVisuais.dados = dados; iniciar(dados); },
  };
})();
