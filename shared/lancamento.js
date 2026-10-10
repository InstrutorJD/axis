// "Gerar arquivo de lançamento" (professor/painel.html): cruza a base de
// conteúdos do ano (professor/data/conteudos.csv, gerada fora do Axis a
// partir dos FOs) com a chamada registrada no Axis (tabela attendance) e
// gera UM CSV por período, lido pelo agente que lança no SIAP/SEDUC-GO e no
// Portal do Docente SENAI. Especificação completa no README, seção
// "Arquivo de lançamento".
//
// Regra de ouro: a capacidade de uma data/UC NUNCA pode ir parar em outra
// data/UC. Por isso:
// - cada linha da base vira um objeto congelado (Object.freeze) e a linha
//   de saída copia data/curso/uc/turma/capacidade/chave do MESMO objeto;
// - a busca é só pela chave composta exata data + uc + turma — nada de
//   índice, posição, "linha anterior/próxima", data aproximada ou fallback;
//   achou 0 ou mais de 1 → erro, não gera;
// - a `chave` (16 primeiros hex do SHA-256 de "data|uc|turma|capacidade")
//   é recalculada ao ler a base E de novo no arquivo gerado, antes de
//   liberar o download. Qualquer divergência bloqueia.
//
// Depende de: PortalSession (shared/session.js) pro cliente do Supabase e
// das turmas passadas por quem chama (id do Axis + codigoTurma do config.js).
window.Lancamento = (function () {
  const CABECALHO_BASE = ['data', 'curso', 'uc', 'turma', 'capacidade', 'chave'];
  const CABECALHO_SAIDA = [...CABECALHO_BASE, 'chamada', 'faltosos'];
  const MAX_ERROS_NA_TELA = 40;

  // ---------- CSV ----------

  // Leitor de CSV que respeita aspas ("" dentro de campo entre aspas,
  // vírgula e quebra de linha dentro das aspas). NÃO aplica trim: a chave
  // foi calculada sobre o texto exato. Devolve cada registro com o número
  // da linha do arquivo onde ele começa (cabeçalho = linha 1), pra mostrar
  // ao professor. Linhas totalmente em branco são ignoradas.
  function lerCsv(texto) {
    const registros = [];
    let campos = [];
    let campo = '';
    let entreAspas = false;
    let campoTeveAspas = false;
    let registroTeveAspas = false;
    let linhaAtual = 1;
    let linhaInicio = 1;
    let i = 0;

    function fecharCampo() {
      campos.push(campo);
      campo = '';
      campoTeveAspas = false;
    }
    function fecharRegistro() {
      fecharCampo();
      const emBranco = campos.length === 1 && campos[0] === '' && !registroTeveAspas;
      if (!emBranco) registros.push({ linha: linhaInicio, campos });
      campos = [];
      registroTeveAspas = false;
    }

    while (i < texto.length) {
      const c = texto[i];
      if (entreAspas) {
        if (c === '"') {
          if (texto[i + 1] === '"') { campo += '"'; i += 2; continue; }
          entreAspas = false;
          i++;
          const prox = texto[i];
          if (prox !== undefined && prox !== ',' && prox !== '\n' && prox !== '\r') {
            throw new Error(`Linha ${linhaAtual}: texto depois de fechar as aspas de um campo.`);
          }
          continue;
        }
        if (c === '\n') linhaAtual++;
        campo += c;
        i++;
        continue;
      }
      if (c === '"') {
        if (campo !== '' || campoTeveAspas) {
          throw new Error(`Linha ${linhaAtual}: aspas no meio de um campo sem aspas.`);
        }
        entreAspas = true;
        campoTeveAspas = true;
        registroTeveAspas = true;
        i++;
        continue;
      }
      if (c === ',') { fecharCampo(); i++; continue; }
      if (c === '\r' || c === '\n') {
        fecharRegistro();
        if (c === '\r' && texto[i + 1] === '\n') i++;
        i++;
        linhaAtual++;
        linhaInicio = linhaAtual;
        continue;
      }
      campo += c;
      i++;
    }
    if (entreAspas) throw new Error(`Linha ${linhaInicio}: aspas abertas e nunca fechadas.`);
    if (campo !== '' || campos.length > 0 || registroTeveAspas) fecharRegistro();
    return registros;
  }

  function campoCsv(valor) {
    return '"' + String(valor).replace(/"/g, '""') + '"';
  }

  function montarCsv(cabecalho, linhas) {
    const corpo = linhas.map(l => cabecalho.map(col => campoCsv(l[col])).join(','));
    return [cabecalho.map(campoCsv).join(','), ...corpo].join('\n') + '\n';
  }

  // ---------- Datas (sempre no fuso do computador, igual todayStr() em platform-core.js) ----------

  function ymd(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function dataDeYmd(s) {
    const [a, m, d] = s.split('-').map(Number);
    return new Date(a, m - 1, d);
  }

  function dataValida(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    return ymd(dataDeYmd(s)) === s;
  }

  function somarDias(d, n) {
    const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    r.setDate(r.getDate() + n);
    return r;
  }

  // Segunda-feira da semana (segunda a domingo) que contém `d`.
  function segundaDaSemana(d) {
    const diaSemana = (d.getDay() + 6) % 7; // segunda = 0 ... domingo = 6
    return somarDias(d, -diaSemana);
  }

  function dataBr(s) {
    const [a, m, d] = s.split('-');
    return `${d}/${m}/${a}`;
  }

  // ---------- Chave ----------

  async function calcularChave(data, uc, turma, capacidade) {
    const bytes = new TextEncoder().encode(`${data}|${uc}|${turma}|${capacidade}`);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  }

  function chaveComposta(data, uc, turma) {
    return JSON.stringify([data, uc, turma]);
  }

  // ---------- Base de conteúdos ----------

  // Valida o texto do conteudos.csv. Devolve { erros, linhas, indice }:
  // com qualquer erro, `linhas`/`indice` vêm vazios e a geração fica
  // bloqueada — nunca se gera arquivo a partir de base inválida.
  async function validarBase(texto) {
    const vazio = { linhas: [], indice: new Map() };
    let registros;
    try {
      registros = lerCsv(texto);
    } catch (e) {
      return { erros: [e.message], ...vazio };
    }
    if (registros.length === 0) return { erros: ['O arquivo está vazio.'], ...vazio };

    const cab = registros[0].campos;
    if (cab.length !== CABECALHO_BASE.length || cab.some((c, i) => c !== CABECALHO_BASE[i])) {
      return {
        erros: [`Cabeçalho diferente do esperado. Esperado: ${CABECALHO_BASE.join(',')} — encontrado: ${cab.join(',')}`],
        ...vazio,
      };
    }

    const erros = [];
    const candidatas = [];
    for (const reg of registros.slice(1)) {
      if (reg.campos.length !== CABECALHO_BASE.length) {
        erros.push(`Linha ${reg.linha}: tem ${reg.campos.length} colunas, o esperado é ${CABECALHO_BASE.length}.`);
        continue;
      }
      const obj = { linha: reg.linha };
      CABECALHO_BASE.forEach((col, i) => { obj[col] = reg.campos[i]; });
      const vazios = CABECALHO_BASE.filter(col => obj[col].trim() === '');
      if (vazios.length > 0) {
        erros.push(`Linha ${reg.linha}: campo vazio (${vazios.join(', ')}).`);
        continue;
      }
      if (!dataValida(obj.data)) {
        erros.push(`Linha ${reg.linha}: data inválida "${obj.data}" (formato AAAA-MM-DD, data real).`);
        continue;
      }
      candidatas.push(obj);
    }

    const recalculadas = await Promise.all(
      candidatas.map(o => calcularChave(o.data, o.uc, o.turma, o.capacidade))
    );
    candidatas.forEach((o, i) => {
      if (recalculadas[i] !== o.chave) {
        erros.push(`Linha ${o.linha}: a chave não confere com data + uc + turma + capacidade (algum desses campos foi alterado depois da conversão).`);
      }
    });

    const porChave = new Map();
    for (const o of candidatas) {
      const k = chaveComposta(o.data, o.uc, o.turma);
      if (!porChave.has(k)) porChave.set(k, []);
      porChave.get(k).push(o);
    }
    for (const grupo of porChave.values()) {
      if (grupo.length > 1) {
        const o = grupo[0];
        erros.push(`Linhas ${grupo.map(g => g.linha).join(', ')}: duplicadas (${o.data}, ${o.uc}, ${o.turma}).`);
      }
    }

    if (erros.length > 0) return { erros, ...vazio };

    const linhas = candidatas.map(o => Object.freeze(o));
    const indice = new Map();
    for (const o of linhas) indice.set(chaveComposta(o.data, o.uc, o.turma), Object.freeze([o]));
    return { erros: [], linhas: Object.freeze(linhas), indice };
  }

  async function carregarBase(url) {
    let resp;
    try {
      resp = await fetch(url, { cache: 'no-store' });
    } catch (e) {
      return { erros: [`Não foi possível baixar a base de conteúdos (${url}).`], linhas: [], indice: new Map() };
    }
    if (!resp.ok) {
      return { erros: [`Base de conteúdos não encontrada (${url}, HTTP ${resp.status}).`], linhas: [], indice: new Map() };
    }
    return validarBase(await resp.text());
  }

  // Busca exata por data + uc + turma. Sempre devolve um array (0, 1 ou
  // mais) — quem chama trata qualquer coisa diferente de 1 como erro.
  function buscarExata(base, data, uc, turma) {
    return base.indice.get(chaveComposta(data, uc, turma)) || [];
  }

  // ---------- Geração ----------

  function compararSaida(a, b) {
    return a.turma.localeCompare(b.turma, 'pt-BR')
      || (a.data < b.data ? -1 : a.data > b.data ? 1 : 0)
      || a.uc.localeCompare(b.uc, 'pt-BR');
  }

  // turmas: [{ id: 'jogos', codigo: '2º JD', label }] — `id` é o da tabela
  // attendance/profiles no Axis; `codigo` é a coluna turma da base.
  async function gerar({ base, turmas, segunda, hoje, sb }) {
    const datas = Array.from({ length: 7 }, (_, i) => ymd(somarDias(segunda, i)));
    const erros = [];
    const saida = [];
    const avisos = { semConteudo: [], pendentes: [], futuras: [] };

    for (const t of turmas) {
      const [chamadaRes, alunosRes] = await Promise.all([
        sb.from('attendance').select('data, student_email, presente')
          .eq('turma', t.id).gte('data', datas[0]).lte('data', datas[6]),
        sb.from('profiles').select('email, nome')
          .eq('turma', t.id).eq('role', 'aluno').is('archived_at', null),
      ]);
      if (chamadaRes.error) throw new Error(`Erro ao ler a chamada de ${t.codigo}: ${chamadaRes.error.message}`);
      if (alunosRes.error) throw new Error(`Erro ao ler os alunos de ${t.codigo}: ${alunosRes.error.message}`);

      // Só alunos ativos: arquivado/transferido nunca entra em faltosos.
      const nomeAtivo = new Map((alunosRes.data || []).map(a => [a.email, a.nome]));
      const chamadaPorData = new Map();
      for (const r of chamadaRes.data || []) {
        if (!chamadaPorData.has(r.data)) chamadaPorData.set(r.data, []);
        chamadaPorData.get(r.data).push(r);
      }

      for (const data of datas) {
        // UCs com conteúdo nesse dia pra essa turma: filtro exato por data +
        // turma; cada UC depois é buscada de novo pela chave composta.
        const ucs = [...new Set(base.linhas.filter(l => l.data === data && l.turma === t.codigo).map(l => l.uc))];

        if (data > hoje) {
          if (ucs.length > 0) avisos.futuras.push(`${dataBr(data)} — ${t.codigo}`);
          continue;
        }
        const registros = chamadaPorData.get(data) || [];
        if (ucs.length === 0) {
          if (registros.length > 0) avisos.semConteudo.push(`${dataBr(data)} — ${t.codigo}`);
          continue;
        }

        // Sem registro de chamada NÃO é "todos presentes": é pendente.
        const chamada = registros.length > 0 ? 'feita' : 'pendente';
        let faltosos = '';
        if (chamada === 'feita') {
          const nomes = registros
            .filter(r => r.presente === false && nomeAtivo.has(r.student_email))
            .map(r => nomeAtivo.get(r.student_email));
          const invalido = nomes.find(n => !n || n.includes(';'));
          if (invalido !== undefined) {
            erros.push(`${t.codigo} ${dataBr(data)}: nome de aluno vazio ou com ";" ("${invalido || ''}").`);
            continue;
          }
          faltosos = nomes.sort((a, b) => a.localeCompare(b, 'pt-BR')).join(';');
        }

        for (const uc of ucs) {
          const achados = buscarExata(base, data, uc, t.codigo);
          if (achados.length !== 1) {
            erros.push(`${t.codigo} ${dataBr(data)} ${uc}: a busca exata achou ${achados.length} linhas na base (esperado 1).`);
            continue;
          }
          const o = achados[0];
          saida.push(Object.freeze({
            data: o.data, curso: o.curso, uc: o.uc, turma: o.turma,
            capacidade: o.capacidade, chave: o.chave,
            chamada, faltosos,
          }));
          if (chamada === 'pendente') avisos.pendentes.push(`${dataBr(o.data)} — ${o.turma} — ${o.uc}`);
        }
      }
    }

    saida.sort(compararSaida);
    const csv = montarCsv(CABECALHO_SAIDA, saida);
    if (erros.length === 0) erros.push(...await conferirArquivo(csv, base, saida));

    const codigos = [...turmas].map(t => t.codigo).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const nomeArquivo = `lancamento_${codigos.map(c => c.replace(/\s+/g, '')).join('+')}_${datas[0]}_a_${datas[6]}.csv`;
    return { linhas: saida, csv, avisos, erros, nomeArquivo };
  }

  // Relê o arquivo JÁ GERADO (o texto que vai ser baixado), recalcula a
  // chave de cada linha e confere com a coluna chave e com a base pela
  // busca exata. Qualquer divergência → lista de erros e o download fica
  // bloqueado.
  async function conferirArquivo(csv, base, esperado) {
    const erros = [];
    let registros;
    try {
      registros = lerCsv(csv);
    } catch (e) {
      return [`Arquivo gerado ilegível: ${e.message}`];
    }
    const cab = registros[0] ? registros[0].campos : [];
    if (cab.join(',') !== CABECALHO_SAIDA.join(',')) return ['Arquivo gerado com cabeçalho errado.'];
    const corpo = registros.slice(1);
    if (corpo.length !== esperado.length) {
      return [`Arquivo gerado com ${corpo.length} linhas, o esperado era ${esperado.length}.`];
    }

    for (let i = 0; i < corpo.length; i++) {
      const reg = corpo[i];
      const rotulo = `Arquivo gerado, linha ${reg.linha}`;
      if (reg.campos.length !== CABECALHO_SAIDA.length) { erros.push(`${rotulo}: número de colunas errado.`); continue; }
      const l = {};
      CABECALHO_SAIDA.forEach((col, j) => { l[col] = reg.campos[j]; });

      const recalculada = await calcularChave(l.data, l.uc, l.turma, l.capacidade);
      if (recalculada !== l.chave) { erros.push(`${rotulo}: chave recalculada não bate com a coluna chave.`); continue; }

      const achados = buscarExata(base, l.data, l.uc, l.turma);
      if (achados.length !== 1) { erros.push(`${rotulo}: não existe exatamente 1 linha na base para ${l.data} + ${l.uc} + ${l.turma}.`); continue; }
      const o = achados[0];
      if (o.chave !== l.chave || o.curso !== l.curso || o.capacidade !== l.capacidade) {
        erros.push(`${rotulo}: diverge da base (${l.data}, ${l.uc}, ${l.turma}).`);
        continue;
      }
      if (l.chamada !== 'feita' && l.chamada !== 'pendente') { erros.push(`${rotulo}: chamada inválida "${l.chamada}".`); continue; }
      if (l.chamada === 'pendente' && l.faltosos !== '') { erros.push(`${rotulo}: chamada pendente com faltosos preenchido.`); continue; }
      // Confere a serialização: o que foi relido é idêntico ao que foi montado.
      if (CABECALHO_SAIDA.some(col => esperado[i][col] !== l[col])) {
        erros.push(`${rotulo}: conteúdo relido diferente do gerado.`);
      }
    }
    return erros;
  }

  // ---------- Tela (modal) ----------

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function listaHtml(itens) {
    const visiveis = itens.slice(0, MAX_ERROS_NA_TELA).map(i => `<li>${esc(i)}</li>`).join('');
    const resto = itens.length > MAX_ERROS_NA_TELA ? `<li>… e mais ${itens.length - MAX_ERROS_NA_TELA}.</li>` : '';
    return `<ul class="lanc-lista">${visiveis}${resto}</ul>`;
  }

  // opcoes: { urlBase, turmas: [{ id, codigo, label }] }
  function abrir({ urlBase, turmas }) {
    document.getElementById('lancOverlay')?.remove();
    const sb = window.PortalSession && window.PortalSession.client();
    let base = null;
    let resultado = null;
    let segunda = segundaDaSemana(new Date());

    const overlay = document.createElement('div');
    overlay.id = 'lancOverlay';
    overlay.className = 'pf-alert-overlay';
    overlay.innerHTML = `
      <div class="pf-alert-box pf-perso-box lanc-box" role="dialog" aria-modal="true" aria-labelledby="lancTitulo">
        <h3 id="lancTitulo" class="lanc-titulo">Arquivo de lançamento</h3>
        <div id="lancBase" class="status-msg">Carregando a base de conteúdos…</div>

        <div class="pf-perso-section">
          <div class="pf-perso-label">Semana</div>
          <div class="lanc-semana">
            <button type="button" class="btn btn-secondary" id="lancSemanaAnt" aria-label="Semana anterior">‹</button>
            <input type="date" id="lancSemanaData" aria-label="Escolher semana">
            <button type="button" class="btn btn-secondary" id="lancSemanaProx" aria-label="Semana seguinte">›</button>
          </div>
          <div id="lancIntervalo" class="lanc-intervalo"></div>
        </div>

        <div class="pf-perso-section">
          <div class="pf-perso-label">Turmas</div>
          <div class="lanc-turmas">
            ${turmas.map(t => `
              <label class="lanc-turma"><input type="checkbox" value="${esc(t.id)}"> ${esc(t.codigo)} <span class="status-msg">${esc(t.label)}</span></label>
            `).join('')}
          </div>
        </div>

        <div class="lanc-acoes">
          <button type="button" class="btn btn-secondary" id="lancFechar">Fechar</button>
          <button type="button" class="btn" id="lancGerar" disabled>Gerar</button>
        </div>
        <div id="lancResultado"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const el = id => overlay.querySelector('#' + id);
    const checkboxes = [...overlay.querySelectorAll('.lanc-turma input')];

    function turmasMarcadas() {
      const ids = new Set(checkboxes.filter(c => c.checked).map(c => c.value));
      return turmas.filter(t => ids.has(t.id));
    }

    function atualizarBotao() {
      el('lancGerar').disabled = !(base && base.erros.length === 0 && sb && turmasMarcadas().length > 0);
    }

    function limparResultado() {
      resultado = null;
      el('lancResultado').innerHTML = '';
      atualizarBotao();
    }

    function mostrarSemana() {
      const ini = ymd(segunda);
      const fim = ymd(somarDias(segunda, 6));
      el('lancSemanaData').value = ini;
      el('lancIntervalo').textContent = `${dataBr(ini)} a ${dataBr(fim)}`;
      limparResultado();
    }

    function fechar() {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') fechar(); }
    document.addEventListener('keydown', onKey);

    el('lancFechar').addEventListener('click', fechar);
    el('lancSemanaAnt').addEventListener('click', () => { segunda = somarDias(segunda, -7); mostrarSemana(); });
    el('lancSemanaProx').addEventListener('click', () => { segunda = somarDias(segunda, 7); mostrarSemana(); });
    el('lancSemanaData').addEventListener('change', e => {
      if (dataValida(e.target.value)) segunda = segundaDaSemana(dataDeYmd(e.target.value));
      mostrarSemana();
    });
    checkboxes.forEach(c => c.addEventListener('change', limparResultado));

    el('lancGerar').addEventListener('click', async () => {
      const marcadas = turmasMarcadas();
      if (!base || base.erros.length > 0 || marcadas.length === 0) return;
      el('lancGerar').disabled = true;
      el('lancResultado').innerHTML = '<p class="status-msg">Gerando e conferindo…</p>';
      try {
        resultado = await gerar({ base, turmas: marcadas, segunda, hoje: ymd(new Date()), sb });
      } catch (e) {
        resultado = null;
        el('lancResultado').innerHTML = `<div class="lanc-erro"><b>Não foi possível gerar.</b>${listaHtml([e.message])}</div>`;
        atualizarBotao();
        return;
      }
      renderResultado();
      atualizarBotao();
    });

    function renderResultado() {
      const r = resultado;
      if (r.erros.length > 0) {
        el('lancResultado').innerHTML = `<div class="lanc-erro"><b>Arquivo bloqueado: o download não foi liberado.</b>${listaHtml(r.erros)}</div>`;
        return;
      }
      const avisos = [];
      if (r.avisos.pendentes.length) avisos.push(`<p><b>⚠️ Chamada pendente</b> (sai com chamada = "pendente"):</p>${listaHtml(r.avisos.pendentes)}`);
      if (r.avisos.semConteudo.length) avisos.push(`<p><b>⚠️ Chamada registrada, mas sem conteúdo na base</b> (não gera linha):</p>${listaHtml(r.avisos.semConteudo)}`);
      if (r.avisos.futuras.length) avisos.push(`<p><b>⚠️ Datas futuras</b> (não geram linha):</p>${listaHtml(r.avisos.futuras)}`);

      const tabela = r.linhas.length === 0 ? '' : `
        <table class="audit-table">
          <thead><tr><th>Turma</th><th>Data</th><th>UC</th><th>Chamada</th><th>Faltas</th></tr></thead>
          <tbody>${r.linhas.map(l => `
            <tr><td>${esc(l.turma)}</td><td>${esc(dataBr(l.data))}</td><td>${esc(l.uc)}</td><td>${esc(l.chamada)}</td><td>${l.faltosos ? l.faltosos.split(';').length : 0}</td></tr>
          `).join('')}</tbody>
        </table>`;

      el('lancResultado').innerHTML = `
        <div class="lanc-resumo">
          <p><b>${r.linhas.length}</b> ${r.linhas.length === 1 ? 'linha gerada' : 'linhas geradas'} · chaves conferidas ✔</p>
          ${tabela}
          ${avisos.join('')}
          <div class="lanc-acoes">
            <span class="status-msg">${esc(r.nomeArquivo)}</span>
            <button type="button" class="btn" id="lancBaixar" ${r.linhas.length === 0 ? 'disabled' : ''}>Baixar</button>
          </div>
        </div>
      `;
      el('lancBaixar').addEventListener('click', () => {
        // UTF-8 sem BOM: o Blob grava a string como está, sem acrescentar nada.
        const blob = new Blob([r.csv], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = r.nomeArquivo;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      });
    }

    mostrarSemana();

    if (!sb) {
      el('lancBase').innerHTML = '<span class="lanc-erro-texto">Configure o Supabase (shared/supabase-config.js) para usar esta tela.</span>';
      return;
    }
    carregarBase(urlBase).then(b => {
      if (!overlay.isConnected) return;
      base = b;
      if (b.erros.length > 0) {
        el('lancBase').innerHTML = `<div class="lanc-erro"><b>Base de conteúdos inválida: a geração está bloqueada.</b>${listaHtml(b.erros)}</div>`;
      } else {
        el('lancBase').textContent = `Base de conteúdos OK: ${b.linhas.length} linhas válidas.`;
      }
      atualizarBotao();
    });
  }

  return {
    abrir,
    // Expostos pra teste/depuração no console.
    lerCsv, validarBase, calcularChave, gerar, conferirArquivo, segundaDaSemana, ymd,
  };
})();
