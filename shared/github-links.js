// Ícone do GitHub na barra de abas do portal (#btnGithubLinks, montado em
// renderShell() de shared/platform-core.js, visível pra todo mundo).
//
//   • Aluno: modal pra cadastrar o link do repositório
//     (https://github.com/<usuario>/<repo>) e do GitHub Pages
//     (https://<usuario>.github.io/...). Campo vazio vale (apaga o link).
//   • Professor/substituto: o mesmo ícone abre a lista dos links de todos
//     os alunos da turma aberta (roster de fetchTurmaStudents()), com os
//     links clicáveis.
//
// Grava em public.student_github_links (sql/github-links.sql), uma linha por
// email, self-service via RLS — mesmo modelo de user_preferences. Os CHECKs
// da tabela repetem as regras de validação daqui.
(function () {
  'use strict';

  // Mesmas regras dos CHECKs em sql/github-links.sql. Usuário do GitHub:
  // letras/números e hífen simples no meio, até 39 caracteres.
  const USUARIO = '[a-z0-9](?:-?[a-z0-9]){0,38}';
  const REPO_RE = new RegExp(`^https://github\\.com/${USUARIO}/[a-z0-9._-]{1,100}/?$`, 'i');
  const PAGES_RE = new RegExp(`^https://${USUARIO}\\.github\\.io(/\\S*)?$`, 'i');

  const SVG_GITHUB = '<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>';

  // Aceita o que o aluno costuma colar: sem "https://" ou com "http://".
  function normalizar(valor) {
    let v = String(valor || '').trim();
    if (!v) return '';
    if (/^http:\/\//i.test(v)) v = 'https://' + v.slice(7);
    if (!/^https?:\/\//i.test(v) && /^(github\.com\/|[^/\s]+\.github\.io)/i.test(v)) v = 'https://' + v;
    return v;
  }

  // Devolve a mensagem de erro, ou '' se estiver ok (vazio também é ok).
  function validarRepo(v) {
    if (!v) return '';
    return REPO_RE.test(v) ? '' : 'Use o formato https://github.com/seu-usuario/nome-do-repositorio';
  }
  function validarPages(v) {
    if (!v) return '';
    return PAGES_RE.test(v) ? '' : 'Use o formato https://seu-usuario.github.io/nome-do-repositorio';
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Só vira link clicável o que passou na validação (https do GitHub) —
  // nada de javascript: ou outro domínio vindo do banco.
  function linkHtml(url, re) {
    if (!url || !re.test(url)) return '<span class="gh-vazio">—</span>';
    const texto = url.replace(/^https:\/\//i, '').replace(/\/$/, '');
    return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(texto)}</a>`;
  }

  // Mesma caixa/comportamento da modal de personalização (Escape e clique
  // fora fecham; removida do DOM ao fechar).
  function abrirOverlay(titulo, corpoHtml) {
    document.getElementById('ghLinksOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'ghLinksOverlay';
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
        <h3 class="pf-perso-titulo gh-titulo">${SVG_GITHUB} ${esc(titulo)}</h3>
        <p class="pf-perso-sub">${sub}</p>
      </div>`;
  }

  // ---------- Aluno: cadastrar os próprios links ----------
  async function abrirAluno(client, user) {
    const overlay = abrirOverlay('Meu GitHub', `
      ${cabecalho('Meu GitHub', 'Cadastre o link do seu repositório e do site publicado no GitHub Pages. O professor vê esses links.')}
      <form class="gh-form" id="ghForm" novalidate>
        <div class="pf-perso-section">
          <label class="pf-perso-label" for="ghRepoUrl">Repositório</label>
          <input type="text" inputmode="url" autocomplete="off" spellcheck="false" id="ghRepoUrl" class="gh-input" placeholder="https://github.com/seu-usuario/nome-do-repositorio">
          <div class="gh-erro" id="ghRepoErro" role="alert"></div>
          <div class="gh-abrir" id="ghRepoAbrir"></div>
        </div>
        <div class="pf-perso-section">
          <label class="pf-perso-label" for="ghPagesUrl">GitHub Pages</label>
          <input type="text" inputmode="url" autocomplete="off" spellcheck="false" id="ghPagesUrl" class="gh-input" placeholder="https://seu-usuario.github.io/nome-do-repositorio">
          <div class="gh-erro" id="ghPagesErro" role="alert"></div>
          <div class="gh-abrir" id="ghPagesAbrir"></div>
        </div>
        <div class="pf-perso-pe">
          <span class="status-msg" id="ghStatus">Carregando...</span>
          <div class="gh-botoes">
            <button type="button" class="btn btn-secondary gh-fechar">Fechar</button>
            <button type="submit" class="btn" id="ghSalvar" disabled>Salvar</button>
          </div>
        </div>
      </form>`);

    const repoIn = overlay.querySelector('#ghRepoUrl');
    const pagesIn = overlay.querySelector('#ghPagesUrl');
    const status = overlay.querySelector('#ghStatus');
    const btnSalvar = overlay.querySelector('#ghSalvar');

    function mostrarAbrir(repo, pages) {
      overlay.querySelector('#ghRepoAbrir').innerHTML = repo ? `Abrir: ${linkHtml(repo, REPO_RE)}` : '';
      overlay.querySelector('#ghPagesAbrir').innerHTML = pages ? `Abrir: ${linkHtml(pages, PAGES_RE)}` : '';
    }

    // Some com o erro assim que o aluno volta a digitar.
    repoIn.addEventListener('input', () => { overlay.querySelector('#ghRepoErro').textContent = ''; repoIn.classList.remove('gh-invalido'); });
    pagesIn.addEventListener('input', () => { overlay.querySelector('#ghPagesErro').textContent = ''; pagesIn.classList.remove('gh-invalido'); });

    if (client) {
      const { data, error } = await client.from('student_github_links')
        .select('repo_url, pages_url').eq('email', user.email).maybeSingle();
      if (!overlay.isConnected) return;
      if (error) {
        status.textContent = 'Não foi possível carregar seus links agora.';
      } else {
        repoIn.value = data?.repo_url || '';
        pagesIn.value = data?.pages_url || '';
        mostrarAbrir(data?.repo_url, data?.pages_url);
        status.textContent = '';
      }
    } else {
      status.textContent = '';
    }
    btnSalvar.disabled = false;
    repoIn.focus();

    overlay.querySelector('#ghForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const repo = normalizar(repoIn.value);
      const pages = normalizar(pagesIn.value);
      repoIn.value = repo;
      pagesIn.value = pages;
      const erroRepo = validarRepo(repo);
      const erroPages = validarPages(pages);
      overlay.querySelector('#ghRepoErro').textContent = erroRepo;
      overlay.querySelector('#ghPagesErro').textContent = erroPages;
      repoIn.classList.toggle('gh-invalido', !!erroRepo);
      pagesIn.classList.toggle('gh-invalido', !!erroPages);
      if (erroRepo || erroPages) {
        status.textContent = 'Confira o link destacado.';
        (erroRepo ? repoIn : pagesIn).focus();
        return;
      }
      if (!client) { status.textContent = 'Sem conexão com o servidor.'; return; }
      btnSalvar.disabled = true;
      status.textContent = 'Salvando...';
      const { error } = await client.from('student_github_links').upsert({
        email: user.email,
        repo_url: repo || null,
        pages_url: pages || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });
      btnSalvar.disabled = false;
      if (error) {
        status.textContent = 'Não foi possível salvar — tente de novo.';
        return;
      }
      mostrarAbrir(repo, pages);
      status.textContent = 'Salvo ✓';
    });
  }

  // ---------- Professor/substituto: lista da turma ----------
  async function abrirProfessor(client, alunos, turmaLabel) {
    const overlay = abrirOverlay('GitHub da turma', `
      ${cabecalho('GitHub da turma', `Repositórios e sites publicados pelos alunos${turmaLabel ? ` de <b>${esc(turmaLabel)}</b>` : ''}. Os links abrem numa aba nova.`)}
      <div class="pf-perso-section" id="ghLista"><p class="status-msg">Carregando...</p></div>
      <div class="pf-perso-pe">
        <span class="status-msg" id="ghResumo"></span>
        <button type="button" class="btn btn-secondary gh-fechar">Fechar</button>
      </div>`);

    const lista = overlay.querySelector('#ghLista');
    if (!alunos.length) {
      lista.innerHTML = '<p class="status-msg">Nenhum aluno nesta turma.</p>';
      return;
    }
    let porEmail = new Map();
    if (client) {
      // Sem filtro por turma no banco: a RLS já deixa o professor ler tudo e
      // o recorte da turma vem do roster (alunos), igual às outras telas.
      const { data, error } = await client.from('student_github_links').select('email, repo_url, pages_url');
      if (!overlay.isConnected) return;
      if (error) {
        lista.innerHTML = '<p class="status-msg">Não foi possível carregar os links. Confira se o script sql/github-links.sql já foi rodado no Supabase.</p>';
        return;
      }
      porEmail = new Map((data || []).map(r => [r.email, r]));
    }

    let comLink = 0;
    const linhas = alunos.map(a => {
      const r = porEmail.get(a.email) || {};
      if (r.repo_url || r.pages_url) comLink++;
      return `
        <tr>
          <td class="gh-nome">${esc(a.nome || a.email)}</td>
          <td>${linkHtml(r.repo_url, REPO_RE)}</td>
          <td>${linkHtml(r.pages_url, PAGES_RE)}</td>
        </tr>`;
    }).join('');
    lista.innerHTML = `
      <div class="gh-tabela-wrap">
        <table class="gh-tabela">
          <thead><tr><th>Aluno</th><th>Repositório</th><th>GitHub Pages</th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>`;
    overlay.querySelector('#ghResumo').textContent = `${comLink} de ${alunos.length} aluno(s) cadastraram link.`;
  }

  // opts: { client, user, alunos, turmaLabel }
  function abrir(opts) {
    const { client, user, alunos = [], turmaLabel = '' } = opts || {};
    if (!user) return;
    if (user.role === 'professor' || user.role === 'admin') return abrirProfessor(client, alunos, turmaLabel);
    return abrirAluno(client, user);
  }

  window.PortalGithub = { abrir, normalizar, validarRepo, validarPages, SVG: SVG_GITHUB };
})();
