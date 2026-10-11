// Identidade via Supabase Auth — substitui a leitura de ?user=/?role=/
// ?turma= da URL que existia antes desta migração. Como a sessão do
// Supabase fica no localStorage do domínio, qualquer página/iframe do
// mesmo site já enxerga quem está logado sem precisar receber nada por
// parâmetro — e ninguém consegue mais "virar professor" só editando a
// URL, porque quem decide o papel agora é a linha em public.profiles
// associada à sessão autenticada, não uma string que o cliente escreveu.
//
// Inclua depois de supabase-config.js e da lib @supabase/supabase-js,
// e antes de qualquer script que precise saber quem está logado.
window.PortalSession = (function () {
  // Domínio interno do e-mail que o Supabase Auth exige por baixo dos
  // panos — nunca aparece pro aluno; a tela de login continua pedindo
  // só o username de sempre. Mesma constante usada em
  // scripts/migrate-users-to-auth.mjs.
  const EMAIL_DOMAIN = 'aluno.portal.local';

  let sbClient = null;
  function client() {
    if (sbClient) return sbClient;
    const SUPABASE_URL = window.SUPABASE_URL;
    const SUPABASE_KEY = window.SUPABASE_ANON_KEY;
    if (!window.supabase || !SUPABASE_URL || !SUPABASE_KEY) return null;
    sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return sbClient;
  }

  function authEmailFromUsername(username) {
    return `${username}@${EMAIL_DOMAIN}`;
  }

  // "Permanecer logado" (caixa na tela de login). A sessão do Supabase fica
  // sempre no localStorage; o que muda é quanto tempo ela vale:
  // - marcado ('1'): até clicar em Sair — o login entra direto;
  // - desmarcado ('0'): só enquanto o navegador estiver aberto. Um cookie
  //   de sessão (sem data de validade, vale em todas as abas e o navegador
  //   apaga ao fechar) marca que a sessão é "desta vez"; sem ele, a sessão
  //   guardada é encerrada na próxima página. Bom pros computadores do
  //   laboratório.
  // Sem escolha gravada (quem logou antes desta opção existir), continua
  // como era: a sessão vale até Sair.
  const CHAVE_LEMBRAR = 'axis.lembrar';
  const COOKIE_SESSAO = 'axis_sessao';
  function lembrarLogin() {
    try { return localStorage.getItem(CHAVE_LEMBRAR) !== '0'; } catch (e) { return true; }
  }
  function definirLembrar(sim) {
    try { localStorage.setItem(CHAVE_LEMBRAR, sim ? '1' : '0'); } catch (e) { /* bloqueado */ }
    document.cookie = sim
      ? `${COOKIE_SESSAO}=; path=/; max-age=0; SameSite=Lax`
      : `${COOKIE_SESSAO}=1; path=/; SameSite=Lax`;
  }
  const sessaoDestaVez = () => document.cookie.split(';').some(c => c.trim() === `${COOKIE_SESSAO}=1`);
  // Desmarcou "Permanecer logado" e o navegador foi fechado desde então.
  const sessaoVencida = () => !lembrarLogin() && !sessaoDestaVez();

  // Cache em memória: dura a vida da página (cada iframe tem a sua),
  // evita reconsultar profiles em toda chamada dentro da mesma página.
  let cachedUser = null;
  let pendingLookup = null;

  async function getUser() {
    if (cachedUser) return cachedUser;
    if (pendingLookup) return pendingLookup;

    pendingLookup = (async () => {
      const sb = client();
      if (!sb) return null;
      if (sessaoVencida()) { await sb.auth.signOut(); return null; }

      const { data: authData, error: authError } = await sb.auth.getUser();
      if (authError || !authData || !authData.user) return null;

      const { data: profile, error: profileError } = await sb
        .from('profiles')
        .select('email, nome, role, turma, archived_at')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError || !profile) return null;

      cachedUser = { ...profile };
      // Substituto (sql/usuario-substituto.sql): na TELA ele se comporta
      // como professor em todo o portal — aulas destravadas, gabarito,
      // sem bloqueio de copiar, sem contar como aluno, anfitrião dos jogos
      // — sem precisar mexer nas dezenas de páginas que testam
      // role === 'professor'. A marca `substituto` é o que a aba Gestão
      // (shared/platform-core.js) usa pra esconder o que ele não pode usar.
      // A segurança de verdade continua no banco: lá o papel é
      // 'substituto' e is_professor() é falso pra ele.
      if (profile.role === 'substituto') {
        cachedUser = { ...profile, role: 'professor', papel: 'substituto', substituto: true };
      }
      return cachedUser;
    })();

    const result = await pendingLookup;
    pendingLookup = null;
    return result;
  }

  // loginPath: caminho relativo até index.html a partir da página atual
  // (ex.: '../index.html', '../../../index.html') — cada chamador sabe
  // a própria profundidade, igual já era feito nos redirects manuais.
  //
  // Aluno arquivado (profiles.archived_at, ver arquivar_aluno() no
  // Supabase) já não consegue mais LOGAR de novo — o RPC bane a conta
  // (auth.users.banned_until) e derruba a sessão. Mas o access token de
  // uma aba que já estava aberta continua válido até expirar sozinho
  // (~1h) mesmo depois disso, já que verificação de JWT é stateless — este
  // check aqui é a segunda linha de defesa: qualquer navegação (troca de
  // aba/iframe/reload) dentro do portal já derruba essa sessão na hora,
  // sem esperar o token vencer.
  async function requireUser(loginPath) {
    const user = await getUser();
    if (user && user.archived_at) {
      await signOut();
      window.location.href = loginPath + (loginPath.includes('?') ? '&' : '?') + 'arquivado=1';
      return null;
    }
    if (!user) {
      window.location.href = loginPath;
      return null;
    }
    return user;
  }

  // lembrar: a caixa "Permanecer logado" (ver lembrarLogin()).
  async function signIn(username, senha, lembrar) {
    const sb = client();
    if (!sb) return { data: null, error: { message: 'Supabase não configurado.' } };
    if (lembrar !== undefined) definirLembrar(!!lembrar);
    return sb.auth.signInWithPassword({
      email: authEmailFromUsername((username || '').trim().toLowerCase()),
      password: senha,
    });
  }

  async function signOut() {
    const sb = client();
    cachedUser = null;
    document.cookie = `${COOKIE_SESSAO}=; path=/; max-age=0; SameSite=Lax`;
    if (sb) await sb.auth.signOut();
  }

  // App instalado (manifest.json): roda numa janela própria, sem abas. Lá
  // dentro, "abrir em nova aba" vira uma janela à parte com a barra de
  // endereço (no Android, o Chrome por cima do app), então as páginas do
  // próprio Axis abrem na mesma janela. No navegador comum, nova aba.
  function appInstalado() {
    return (window.matchMedia && (window.matchMedia('(display-mode: standalone)').matches
      || window.matchMedia('(display-mode: window-controls-overlay)').matches))
      || window.navigator.standalone === true;
  }
  function abrirPagina(url) {
    if (appInstalado()) window.location.href = url;
    else window.open(url, '_blank');
  }

  return { client, getUser, requireUser, signIn, signOut, authEmailFromUsername, lembrarLogin, appInstalado, abrirPagina };
})();
