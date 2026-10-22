// Botão 🎨 Canva na barra de abas do portal (#btnCanvaLinks, montado em
// renderShell() de shared/platform-core.js, visível pra todo mundo).
//
//   • Aluno: modal pra colar o link do trabalho no Canva (e um título
//     opcional), pra apresentar no computador do professor sem precisar
//     mandar o link por mensagem.
//   • Professor/substituto: o mesmo botão abre a lista das apresentações
//     enviadas pelos alunos da turma aberta, com o link clicável e uma
//     caixinha pra marcar quem já apresentou (marcar_canva_apresentado()).
//
// É TEMPORÁRIO: o link vale 72 horas a partir do último "Salvar". Grava em
// public.student_canva_links (sql/canva-links.sql); a RLS esconde do
// professor o que passou de 72 h e limpar_canva_expirados() apaga de vez
// (chamada sempre que o modal abre). Reaproveita o visual do modal do
// GitHub (classes gh-* em shared/platform-core.css).
(function () {
  'use strict';

  const VALIDADE_MS = 72 * 60 * 60 * 1000;

  // Mesmas regras do CHECK em sql/canva-links.sql. Só endereços conhecidos
  // de apresentação (o link vira botão clicável na tela do professor):
  //   Canva — design, link curto canva.link ou site *.my.canva.site;
  //   Google Slides — docs.google.com/presentation/d/...;
  //   PowerPoint Online — 1drv.ms, onedrive.live.com ou *.sharepoint.com;
  //   Gamma — gamma.app/...
  const CANVA_RE = new RegExp('^https://(' + [
    '(www\\.)?canva\\.com/design/[a-z0-9_-]+(/\\S*)?',
    'canva\\.link/[a-z0-9_-]+/?',
    '[a-z0-9-]+\\.my\\.canva\\.site(/\\S*)?',
    'docs\\.google\\.com/presentation/d/[a-z0-9_-]+(/\\S*)?',
    '1drv\\.ms/\\S+',
    'onedrive\\.live\\.com/\\S+',
    '[a-z0-9-]+\\.sharepoint\\.com/\\S+',
    'gamma\\.app/\\S+',
  ].join('|') + ')$', 'i');

  // Aceita o que o aluno costuma colar: sem "https://" ou com "http://".
  function normalizar(valor) {
    let v = String(valor || '').trim();
    if (!v) return '';
    if (/^http:\/\//i.test(v)) v = 'https://' + v.slice(7);
    if (!/^https?:\/\//i.test(v) && /^((www\.)?canva\.com\/|canva\.link\/|[^/\s]+\.my\.canva\.site|docs\.google\.com\/|1drv\.ms\/|onedrive\.live\.com\/|[^/\s]+\.sharepoint\.com\/|gamma\.app\/)/i.test(v)) v = 'https://' + v;
    return v;
  }

  function validar(v) {
    if (!v) return 'Cole o link da apresentação.';
    return CANVA_RE.test(v) ? '' : 'Use o link de compartilhar do Canva, Google Slides, PowerPoint Online ou Gamma.';
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Só vira link clicável o que passou na validação — nada de javascript:
  // ou outro domínio vindo do banco.
  function linkHtml(url, texto) {
    if (!url || !CANVA_RE.test(url)) return '<span class="gh-vazio">—</span>';
    return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(texto || 'Abrir apresentação')}</a>`;
  }

  function expiraEm(enviadoEm) {
    return new Date(enviadoEm).getTime() + VALIDADE_MS;
  }

  // "some em 2 d 5 h" / "some em 3 h 10 min" / "expirou".
  function tempoRestante(enviadoEm) {
    const ms = expiraEm(enviadoEm) - Date.now();
    if (ms <= 0) return 'expirou';
    const min = Math.floor(ms / 60000);
    const d = Math.floor(min / 1440);
    const h = Math.floor((min % 1440) / 60);
    const m = min % 60;
    if (d) return `some em ${d} d ${h} h`;
    if (h) return `some em ${h} h ${m} min`;
    return `some em ${m} min`;
  }

  // Apaga de vez os links vencidos (de todo mundo). Falha silenciosa: a RLS
  // já esconde do professor o que venceu, a limpeza é só faxina.
  async function limpar(client) {
    try { await client.rpc('limpar_canva_expirados'); } catch (_) { /* ignora */ }
  }

  // Mesma caixa/comportamento do modal do GitHub (Escape e clique fora
  // fecham; removida do DOM ao fechar).
  function abrirOverlay(titulo, corpoHtml) {
    document.getElementById('canvaLinksOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'canvaLinksOverlay';
    overlay.className = 'pf-alert-overlay';
    overlay.innerHTML = `
      <div class="pf-alert-box pf-perso-box gh-box" role="dialog" aria-modal="true" aria-label="${esc(titulo)}">
        ${corpoHtml}
      </div>`;
    document.body.appendChild(overlay);
    function fechar() {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') fechar(); }
    overlay.addEventListener('click', (e) => { if (e.target === overlay) fechar(); });
    document.addEventListener('keydown', onKey);
    overlay.querySelectorAll('.gh-fechar').forEach(b => b.addEventListener('click', fechar));
    return overlay;
  }

  function cabecalho(titulo, sub) {
    return `
      <div class="pf-perso-head">
        <h3 class="pf-perso-titulo gh-titulo">🎨 ${esc(titulo)}</h3>
        <p class="pf-perso-sub">${sub}</p>
      </div>`;
  }

  // ---------- Aluno: enviar o próprio link ----------
  async function abrirAluno(client, user) {
    const overlay = abrirOverlay('Apresentação', `
      ${cabecalho('Apresentação', 'Cole o link do seu trabalho (Canva, Google Slides, PowerPoint Online ou Gamma) para o professor abrir no computador da sala. <b>O link some sozinho depois de 72 horas.</b>')}
      <form class="gh-form" id="cvForm" novalidate>
        <div class="pf-perso-section">
          <label class="pf-perso-label" for="cvUrl">Link da apresentação</label>
          <input type="text" inputmode="url" autocomplete="off" spellcheck="false" id="cvUrl" class="gh-input" placeholder="https://www.canva.com/design/... ou docs.google.com/presentation/...">
          <div class="gh-erro" id="cvErro" role="alert"></div>
        </div>
        <div class="pf-perso-section">
          <label class="pf-perso-label" for="cvTitulo">Título (opcional)</label>
          <input type="text" autocomplete="off" maxlength="80" id="cvTitulo" class="gh-input" placeholder="Ex.: Grupo 2 — Engenharia social">
          <div class="gh-abrir" id="cvAtual"></div>
        </div>
        <div class="pf-perso-pe">
          <span class="status-msg" id="cvStatus">Carregando...</span>
          <div class="gh-botoes">
            <button type="button" class="btn btn-secondary" id="cvRemover" style="display:none;">Remover</button>
            <button type="button" class="btn btn-secondary gh-fechar">Fechar</button>
            <button type="submit" class="btn" id="cvSalvar" disabled>Enviar</button>
          </div>
        </div>
      </form>`);

    const urlIn = overlay.querySelector('#cvUrl');
    const tituloIn = overlay.querySelector('#cvTitulo');
    const erro = overlay.querySelector('#cvErro');
    const status = overlay.querySelector('#cvStatus');
    const btnSalvar = overlay.querySelector('#cvSalvar');
    const btnRemover = overlay.querySelector('#cvRemover');

    function mostrarAtual(row) {
      overlay.querySelector('#cvAtual').innerHTML = row
        ? `Enviado: ${linkHtml(row.canva_url, row.titulo || 'abrir')} · ${esc(tempoRestante(row.enviado_em))}`
        : '';
      btnRemover.style.display = row ? '' : 'none';
    }

    urlIn.addEventListener('input', () => { erro.textContent = ''; urlIn.classList.remove('gh-invalido'); });

    if (client) {
      await limpar(client);
      const { data, error } = await client.from('student_canva_links')
        .select('canva_url, titulo, enviado_em').eq('email', user.email).maybeSingle();
      if (!overlay.isConnected) return;
      if (error) {
        status.textContent = 'Não foi possível carregar agora.';
      } else {
        // Vencido e ainda não limpo: trata como se não existisse.
        const ativo = data && expiraEm(data.enviado_em) > Date.now() ? data : null;
        urlIn.value = ativo?.canva_url || '';
        tituloIn.value = ativo?.titulo || '';
        mostrarAtual(ativo);
        status.textContent = '';
      }
    } else {
      status.textContent = '';
    }
    btnSalvar.disabled = false;
    urlIn.focus();

    overlay.querySelector('#cvForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const url = normalizar(urlIn.value);
      const titulo = tituloIn.value.trim().slice(0, 80);
      urlIn.value = url;
      const msg = validar(url);
      erro.textContent = msg;
      urlIn.classList.toggle('gh-invalido', !!msg);
      if (msg) { status.textContent = 'Confira o link.'; urlIn.focus(); return; }
      if (!client) { status.textContent = 'Sem conexão com o servidor.'; return; }
      btnSalvar.disabled = true;
      status.textContent = 'Enviando...';
      // Cada envio renova as 72 horas.
      const row = { email: user.email, canva_url: url, titulo: titulo || null, enviado_em: new Date().toISOString() };
      const { error } = await client.from('student_canva_links').upsert(row, { onConflict: 'email' });
      btnSalvar.disabled = false;
      if (error) { status.textContent = 'Não foi possível enviar — tente de novo.'; return; }
      mostrarAtual(row);
      status.textContent = 'Enviado ✓';
    });

    btnRemover.addEventListener('click', async () => {
      if (!client) return;
      btnRemover.disabled = true;
      const { error } = await client.from('student_canva_links').delete().eq('email', user.email);
      btnRemover.disabled = false;
      if (error) { status.textContent = 'Não foi possível remover — tente de novo.'; return; }
      urlIn.value = '';
      tituloIn.value = '';
      mostrarAtual(null);
      status.textContent = 'Removido ✓';
    });
  }

  // ---------- Professor/substituto: apresentações da turma ----------
  async function abrirProfessor(client, alunos, turmaLabel) {
    const overlay = abrirOverlay('Apresentações', `
      ${cabecalho('Apresentações', `Trabalhos enviados pelos alunos${turmaLabel ? ` de <b>${esc(turmaLabel)}</b>` : ''} nas últimas 72 horas. Os links abrem numa aba nova.`)}
      <div class="pf-perso-section" id="cvLista"><p class="status-msg">Carregando...</p></div>
      <div class="pf-perso-pe">
        <span class="status-msg" id="cvResumo"></span>
        <button type="button" class="btn btn-secondary gh-fechar">Fechar</button>
      </div>`);

    const lista = overlay.querySelector('#cvLista');
    if (!client) { lista.innerHTML = '<p class="status-msg">Sem conexão com o servidor.</p>'; return; }
    await limpar(client);
    // A RLS já filtra o que passou de 72 h; o recorte da turma vem do roster.
    // Sem a coluna apresentado_em (SQL novo ainda não rodado), a lista
    // aparece igual, só sem a caixinha de "apresentou".
    let comTick = true;
    let { data, error } = await client.from('student_canva_links').select('email, canva_url, titulo, enviado_em, apresentado_em');
    if (error) {
      comTick = false;
      ({ data, error } = await client.from('student_canva_links').select('email, canva_url, titulo, enviado_em'));
    }
    if (!overlay.isConnected) return;
    if (error) {
      lista.innerHTML = '<p class="status-msg">Não foi possível carregar. Confira se o script sql/canva-links.sql já foi rodado no Supabase.</p>';
      return;
    }
    const nomePorEmail = new Map(alunos.map(a => [a.email, a.nome || a.email]));
    const enviados = (data || [])
      .filter(r => nomePorEmail.has(r.email) && expiraEm(r.enviado_em) > Date.now())
      .sort((a, b) => new Date(b.enviado_em) - new Date(a.enviado_em));

    if (!enviados.length) {
      lista.innerHTML = '<p class="status-msg">Nenhuma apresentação enviada nas últimas 72 horas.</p>';
      return;
    }
    const linhas = enviados.map(r => {
      const feito = apresentou(r);
      const nome = nomePorEmail.get(r.email);
      const tick = comTick
        ? `<td class="cv-tick"><input type="checkbox" data-email="${esc(r.email)}" ${feito ? 'checked' : ''} aria-label="${esc(nome)} já apresentou" title="Já apresentou"></td>`
        : '';
      return `
      <tr class="${feito ? 'cv-apresentado' : ''}">
        ${tick}
        <td class="gh-nome">${esc(nome)}</td>
        <td>${linkHtml(r.canva_url, r.titulo || 'Abrir apresentação')}</td>
        <td class="gh-vazio">${esc(tempoRestante(r.enviado_em))}</td>
      </tr>`;
    }).join('');
    lista.innerHTML = `
      <div class="gh-tabela-wrap">
        <table class="gh-tabela">
          <thead><tr>${comTick ? '<th>✓</th>' : ''}<th>Aluno</th><th>Apresentação</th><th>Validade</th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>`;
    if (!comTick) lista.insertAdjacentHTML('beforeend', '<p class="status-msg">Para marcar quem já apresentou, rode o script sql/canva-links.sql no Supabase.</p>');

    const resumo = overlay.querySelector('#cvResumo');
    function atualizarResumo() {
      const feitos = lista.querySelectorAll('.cv-tick input:checked').length;
      resumo.textContent = comTick
        ? `${feitos} de ${enviados.length} já apresentaram.`
        : `${enviados.length} apresentação(ões) enviada(s).`;
    }
    atualizarResumo();

    lista.querySelectorAll('.cv-tick input').forEach(caixa => caixa.addEventListener('change', async () => {
      const marcado = caixa.checked;
      caixa.closest('tr').classList.toggle('cv-apresentado', marcado);
      atualizarResumo();
      caixa.disabled = true;
      const { error: erroTick } = await client.rpc('marcar_canva_apresentado', { p_email: caixa.dataset.email, p_apresentado: marcado });
      caixa.disabled = false;
      if (erroTick) {
        caixa.checked = !marcado;
        caixa.closest('tr').classList.toggle('cv-apresentado', !marcado);
        atualizarResumo();
        resumo.textContent = 'Não foi possível salvar — tente de novo.';
      }
    }));
  }

  // Apresentou se foi marcado DEPOIS do último envio: se o aluno mandar um
  // link novo (outro trabalho), a marcação cai sozinha.
  function apresentou(r) {
    return !!r.apresentado_em && new Date(r.apresentado_em) >= new Date(r.enviado_em);
  }

  // opts: { client, user, alunos, turmaLabel }
  function abrir(opts) {
    const { client, user, alunos = [], turmaLabel = '' } = opts || {};
    if (!user) return;
    if (user.role === 'professor' || user.role === 'admin') return abrirProfessor(client, alunos, turmaLabel);
    return abrirAluno(client, user);
  }

  window.PortalCanva = { abrir, normalizar, validar };
})();
