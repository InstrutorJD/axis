// @ts-check
// Botão de perfil (ícone circular na barra de navegação, antigo "Perfil 👤"
// de texto) → modal "🎨 Personalizar": fonte, cor de destaque, tema, emoji
// de avatar, fundo decorativo e cursor. Tudo aplica na hora e é salvo em
// user_preferences (Supabase) a cada troca — ver openPersonalizacao/
// saveUserPreferences em shared/platform-core.js.
const { test, expect } = require('@playwright/test');
const { stubSupabaseFake } = require('./helpers');

const ALUNO_URL = '/turmas/sistemas/plataforma.html?user=alexandre.natal&ip=192.168.2.1&saldo=1183.50&role=aluno';
const PROFESSOR_URL = '/turmas/jogos/plataforma.html?user=admin&ip=192.168.1.254&saldo=9999.00&role=professor&turma=jogos';

test.describe('Personalização do portal (botão de perfil)', () => {
  test.beforeEach(async ({ page }) => {
    await stubSupabaseFake(page, {});
  });

  test('aluno: abre a modal pelo ícone de perfil e troca fonte, cor, tema, emoji, fundo e cursor', async ({ page }) => {
    await page.goto(ALUNO_URL);
    await page.click('#btnPerfilTab');
    await expect(page.locator('#perfilTituloPrincipal')).toHaveText('Meu Progresso');

    await page.click('#btnAbrirPersonalizacao');
    await expect(page.locator('.pf-perso-box')).toBeVisible();

    await page.click('[data-font-key="rounded"]');
    await expect(page.locator('body')).toHaveCSS('font-family', /Quicksand/);

    await page.click('[data-accent-key="azul"]');
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--green').trim())).toBe('#2f6fed');

    await page.click('[data-theme-key="light"]');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.click('[data-avatar-emoji="🚀"]');
    await expect(page.locator('#perfilTabEmoji')).toHaveText('🚀');

    await page.check('#psBgPattern');
    await expect(page.locator('#pfBgEmojiLayer')).toBeAttached();
    await page.uncheck('#psBgPattern');
    await expect(page.locator('#pfBgEmojiLayer')).toHaveCount(0);

    await page.click('[data-cursor-key="mira"]');
    const cursorCss = await page.evaluate(() => document.getElementById('pfCursorOverride')?.textContent || '');
    expect(cursorCss).toContain('crosshair');
  });

  test('Escape e clique fora fecham a modal', async ({ page }) => {
    await page.goto(ALUNO_URL);
    await page.click('#btnPerfilTab');
    await page.click('#btnAbrirPersonalizacao');
    await expect(page.locator('.pf-perso-box')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.pf-perso-box')).toHaveCount(0);

    await page.click('#btnAbrirPersonalizacao');
    await page.locator('#pfPersoOverlay').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('.pf-perso-box')).toHaveCount(0);
  });

  test('preferências são salvas em user_preferences e voltam aplicadas numa sessão nova', async ({ page }) => {
    await page.goto(ALUNO_URL);
    await page.click('#btnPerfilTab');
    await page.click('#btnAbrirPersonalizacao');
    await page.click('[data-accent-key="roxo"]');
    await page.click('[data-theme-key="light"]');
    await page.click('[data-avatar-emoji="🐱"]');
    await expect(page.locator('#personalizacaoStatus')).toHaveText('Salvo ✓');

    const savedDb = await page.evaluate(() => window.__FAKE_DB__);
    expect(savedDb.user_preferences).toHaveLength(1);
    expect(savedDb.user_preferences[0]).toMatchObject({
      email: 'alexandre.natal', accent_key: 'roxo', theme: 'light', avatar_emoji: '🐱',
    });

    // Simula reabrir o portal (nova navegação) já com essa linha salva —
    // window.__FAKE_DB__ é reinjetado do zero a cada documento (ver
    // tests/helpers.js), então precisa re-semear com o que "o banco" tinha.
    await stubSupabaseFake(page, savedDb);
    await page.goto(ALUNO_URL);
    await expect(page.locator('#perfilTabEmoji')).toHaveText('🐱');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--green').trim())).toBe('#8b5cf6');
  });

  test('cor de destaque e tema salvos aparecem também dentro do iframe de um módulo aberto depois', async ({ page }) => {
    await page.goto(ALUNO_URL);
    await page.click('#btnPerfilTab');
    await page.click('#btnAbrirPersonalizacao');
    await page.click('[data-accent-key="esmeralda"]');
    await page.click('[data-theme-key="light"]');
    await page.locator('.pf-perso-close').click();

    await page.click('[data-tab="aulas"]');
    await page.click('.game-card:has-text("Banco de Dados")');
    await page.click('#moduleSelector_sql .game-card:has-text("Teoria")');
    await expect(page.frameLocator('#moduleFrame_sql').locator('#storyWrap')).toBeVisible();

    const frame = page.locator('#moduleFrame_sql');
    const accent = await frame.evaluate(f => f.contentDocument.documentElement.style.getPropertyValue('--green').trim());
    expect(accent).toBe('#16a34a');
    const theme = await frame.evaluate(f => f.contentDocument.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('light');
  });

  test('professor sem alerta pendente: botão de perfil abre direto a personalização', async ({ page }) => {
    await page.goto(PROFESSOR_URL);
    await page.click('#btnPerfilTab');
    await expect(page.locator('.pf-perso-box')).toBeVisible();
    await expect(page.locator('#tabContentPerfil')).toBeHidden();
  });

  test('professor vendo o Perfil de um aluno (via Gestão) não mostra o botão Personalizar', async ({ page }) => {
    await page.goto(PROFESSOR_URL);
    await page.evaluate(() => window.PortalCore.openStudentPerfil('algum.aluno'));
    await expect(page.locator('#perfilTituloPrincipal')).toContainText('Progresso de');
    await expect(page.locator('#btnAbrirPersonalizacao')).toBeHidden();
    await expect(page.locator('#perfilProgressoWrap')).toBeVisible();
  });
});

// Som de clique (shared/portal-audio.js) — sintetizado
// na hora via Web Audio API, sem nenhum arquivo/CDN de áudio. Os testes
// substituem window.PortalAudio.* por espiões (não dá pra "ouvir" som num
// teste automatizado) pra confirmar SÓ a integração: o toggle certo chama
// a função certa, no momento certo, e o relé de clique de dentro de um
// <iframe> de atividade chega até o documento pai.
test.describe('Personalização do portal — som', () => {
  test.beforeEach(async ({ page }) => {
    await stubSupabaseFake(page, {});
  });

  test('ligar "Som de clique" toca uma prévia com o cursor já escolhido, e passa a tocar em qualquer clique do portal', async ({ page }) => {
    await page.goto(ALUNO_URL);
    await page.evaluate(() => {
      window.__clicks = [];
      window.PortalAudio.playClick = (key) => { window.__clicks.push(key); };
    });
    await page.click('#btnPerfilTab');
    await page.click('#btnAbrirPersonalizacao');
    await page.click('[data-cursor-key="espada"]');
    await page.check('#psClickSound'); // a própria marcação já toca uma prévia
    await expect.poll(() => page.evaluate(() => window.__clicks.at(-1))).toBe('espada');

    const beforeShellClick = await page.evaluate(() => window.__clicks.length);
    await page.locator('.pf-perso-close').click();
    await page.click('[data-tab="aulas"]');

    await expect.poll(() => page.evaluate(() => window.__clicks.length)).toBeGreaterThan(beforeShellClick);
  });

  test('sem "Som de clique" ligado, clicar no portal não chama PortalAudio.playClick', async ({ page }) => {
    await page.goto(ALUNO_URL);
    await page.evaluate(() => {
      window.__clicks = 0;
      window.PortalAudio.playClick = () => { window.__clicks++; };
    });
    await page.click('[data-tab="aulas"]');
    expect(await page.evaluate(() => window.__clicks)).toBe(0);
  });

  test('clique DENTRO de um iframe de atividade também dispara o som (relé por postMessage)', async ({ page }) => {
    await page.goto(ALUNO_URL);
    await page.evaluate(() => {
      window.__clicks = 0;
      window.PortalAudio.playClick = () => { window.__clicks++; };
    });
    await page.click('#btnPerfilTab');
    await page.click('#btnAbrirPersonalizacao');
    await page.check('#psClickSound');
    await page.locator('.pf-perso-close').click();
    const before = await page.evaluate(() => window.__clicks);

    await page.click('[data-tab="aulas"]');
    await page.click('.game-card:has-text("Banco de Dados")');
    await page.click('#moduleSelector_sql .game-card:has-text("Teoria")');
    const frame = page.frameLocator('#moduleFrame_sql');
    await expect(frame.locator('#storyWrap')).toBeVisible();
    await frame.locator('body').click();

    await expect.poll(() => page.evaluate(() => window.__clicks)).toBeGreaterThan(before);
  });
});
