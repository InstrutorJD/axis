// @ts-check
// Valida o bloqueio de Ctrl+A/C/V/X ligado pelo professor: o toggle na aba
// "Gestão" do portal de cada turma grava em classroom_settings (id = turma),
// e shared/clipboard-guard.js (incluído nas páginas do aluno) passa a
// cancelar o atalho quando o valor daquela turma é true. O toggle em si é
// coberto por tests/professor-gestao-turma.spec.js — aqui só o guard.
const { test, expect } = require('@playwright/test');
const { stubSupabaseFake } = require('./helpers');

async function ctrlKeyPrevented(page, key) {
  return page.evaluate((k) => {
    const ev = new KeyboardEvent('keydown', { key: k, ctrlKey: true, bubbles: true, cancelable: true });
    document.dispatchEvent(ev);
    return ev.defaultPrevented;
  }, key);
}

async function ctrlVPrevented(page) {
  return ctrlKeyPrevented(page, 'v');
}

async function contextMenuPrevented(page) {
  return page.evaluate(() => {
    const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    document.dispatchEvent(ev);
    return ev.defaultPrevented;
  });
}

async function mousedownPrevented(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
    return ev.defaultPrevented;
  }, selector);
}

test.describe('shared/clipboard-guard.js', () => {
  test('bloqueia Ctrl+V na plataforma do aluno quando clipboard_blocked=true pra turma dele', async ({ page }) => {
    await stubSupabaseFake(page, {
      classroom_settings: [{ id: 'jogos', clipboard_blocked: true }],
    });
    await page.goto('/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&turma=jogos');

    await expect.poll(() => ctrlVPrevented(page)).toBe(true);
    await expect(page.locator('#__clipboardGuardToast')).toBeVisible();
  });

  // Tela dividida: arrastar a resposta de outra janela até o campo não
  // passa pelo evento 'paste' — precisa ser bloqueado à parte.
  test('bloqueia arrastar e soltar texto quando clipboard_blocked=true, e libera quando false', async ({ page }) => {
    const dropPrevented = () => page.evaluate(() => {
      const ev = new Event('drop', { bubbles: true, cancelable: true });
      document.dispatchEvent(ev);
      return ev.defaultPrevented;
    });
    const URL = '/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&turma=jogos';

    await stubSupabaseFake(page, { classroom_settings: [{ id: 'jogos', clipboard_blocked: true }] });
    await page.goto(URL);
    await expect.poll(dropPrevented).toBe(true);

    await stubSupabaseFake(page, { classroom_settings: [{ id: 'jogos', clipboard_blocked: false }] });
    await page.goto(URL);
    // A 2ª visita começa com o último estado salvo neste navegador (bloqueado)
    // e só libera quando a Gestão responde — por isso espera, em vez de
    // conferir na hora.
    await expect.poll(dropPrevented).toBe(false);
  });

  test('não bloqueia quando clipboard_blocked=false', async ({ page }) => {
    await stubSupabaseFake(page, {
      classroom_settings: [{ id: 'jogos', clipboard_blocked: false }],
    });
    await page.goto('/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&turma=jogos');
    await page.waitForTimeout(100); // dá tempo do fetchState (que já resolve false) rodar

    expect(await ctrlVPrevented(page)).toBe(false);
  });

  // Reforço pedido pelo professor: aluno selecionava a página inteira com
  // Ctrl+A (inclusive código de exemplo protegido contra clique+arrasto) e
  // arrastava o conteúdo pra fora — cortar o atalho fecha essa brecha.
  test('bloqueia Ctrl+A (selecionar tudo) quando clipboard_blocked=true', async ({ page }) => {
    await stubSupabaseFake(page, {
      classroom_settings: [{ id: 'jogos', clipboard_blocked: true }],
    });
    await page.goto('/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&turma=jogos');

    await expect.poll(() => ctrlKeyPrevented(page, 'a')).toBe(true);
    await expect(page.locator('#__clipboardGuardToast')).toBeVisible();
  });

  test('não bloqueia Ctrl+A quando clipboard_blocked=false', async ({ page }) => {
    await stubSupabaseFake(page, {
      classroom_settings: [{ id: 'jogos', clipboard_blocked: false }],
    });
    await page.goto('/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&turma=jogos');
    await page.waitForTimeout(100);

    expect(await ctrlKeyPrevented(page, 'a')).toBe(false);
  });

  test('bloqueio de uma turma não afeta a outra', async ({ page }) => {
    await stubSupabaseFake(page, {
      classroom_settings: [{ id: 'jogos', clipboard_blocked: true }, { id: 'sistemas', clipboard_blocked: false }],
    });
    await page.goto('/turmas/sistemas/plataforma.html?user=alexandre.natal&ip=192.168.2.1&saldo=1183.50&role=aluno&turma=sistemas');
    await page.waitForTimeout(100);

    expect(await ctrlVPrevented(page)).toBe(false);
  });

  test('nunca bloqueia o professor, mesmo com clipboard_blocked=true', async ({ page }) => {
    await stubSupabaseFake(page, {
      classroom_settings: [{ id: 'jogos', clipboard_blocked: true }],
    });
    await page.goto('/turmas/jogos/plataforma.html?user=admin&ip=192.168.1.254&saldo=9999.00&role=professor&turma=jogos');
    await page.waitForTimeout(100);

    expect(await ctrlVPrevented(page)).toBe(false);
    // idem pro menu de botão direito — o guard nem chega a registrar o
    // listener de contextmenu pro professor (retorna antes disso).
    expect(await contextMenuPrevented(page)).toBe(false);
  });

  test('funciona também dentro de um jogo (documento separado em iframe)', async ({ page }) => {
    await stubSupabaseFake(page, {
      classroom_settings: [{ id: 'jogos', clipboard_blocked: true }],
    });
    await page.addInitScript(() => sessionStorage.setItem('githack_authenticated', 'true'));
    await page.goto('/games/digitacao.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&name=Breno&turma=jogos');

    await expect.poll(() => ctrlVPrevented(page)).toBe(true);
  });

  // A atividade de Conexão com Supabase depende MUITO de o aluno digitar o
  // código na mão (não copiar/colar) — ver turmas/sistemas/atividades/
  // db-conexao-supabase-pratica.html. Confirma que o guard também está de
  // pé nela especificamente, não só nas páginas mais antigas.
  test('bloqueia também na atividade de Conexão com Supabase', async ({ page }) => {
    await stubSupabaseFake(page, {
      classroom_settings: [{ id: 'sistemas', clipboard_blocked: true }],
    });
    await page.goto('/turmas/sistemas/atividades/db-conexao-supabase-pratica.html?user=alexandre.natal&role=aluno&turma=sistemas');

    await expect.poll(() => ctrlVPrevented(page)).toBe(true);
    await expect(page.locator('#__clipboardGuardToast')).toBeVisible();
  });

  // "Pesquisar no Google por…" do botão direito não passa pelo evento
  // 'copy' — o aluno selecionava o código, clicava com o botão direito,
  // pesquisava e copiava o texto de volta na aba do Google, sem passar
  // pelo Ctrl+C/V nenhuma vez. Bloquear o menu de contexto fecha essa
  // brecha (também tira o "Copiar" nativo do próprio menu).
  test('bloqueia o menu de botão direito (evita "Pesquisar no Google por…") quando clipboard_blocked=true', async ({ page }) => {
    await stubSupabaseFake(page, {
      classroom_settings: [{ id: 'jogos', clipboard_blocked: true }],
    });
    await page.goto('/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&turma=jogos');

    await expect.poll(() => contextMenuPrevented(page)).toBe(true);
    await expect(page.locator('#__clipboardGuardToast')).toBeVisible();
  });

  test('não bloqueia o menu de botão direito quando clipboard_blocked=false', async ({ page }) => {
    await stubSupabaseFake(page, {
      classroom_settings: [{ id: 'jogos', clipboard_blocked: false }],
    });
    await page.goto('/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&turma=jogos');
    await page.waitForTimeout(100);

    expect(await contextMenuPrevented(page)).toBe(false);
  });

  // Reforço pedido pelo professor: com o bloqueio ligado, nem dá pra
  // clicar/selecionar o texto de instrução ou o código de exemplo — só
  // clicar em botões e digitar nos campos onde o aluno escreve o próprio
  // código (Central de Dados, PixelCode, desafios de JavaScript etc.).
  test.describe('bloqueio de clique/seleção em áreas de leitura (texto e código de exemplo)', () => {
    const ACTIVITY_URL = '/turmas/sistemas/atividades/projeto-financapp-kickoff-trabalho.html?user=alexandre.natal&role=aluno&turma=sistemas';

    test('bloqueia clique+arrasto num <p> de texto de instrução quando clipboard_blocked=true', async ({ page }) => {
      await stubSupabaseFake(page, {
        classroom_settings: [{ id: 'sistemas', clipboard_blocked: true }],
      });
      await page.goto(ACTIVITY_URL);

      await expect.poll(() => mousedownPrevented(page, '.md-body p')).toBe(true);
    });

    test('não bloqueia clique+arrasto num <p> quando clipboard_blocked=false', async ({ page }) => {
      await stubSupabaseFake(page, {
        classroom_settings: [{ id: 'sistemas', clipboard_blocked: false }],
      });
      await page.goto(ACTIVITY_URL);
      await page.waitForTimeout(100);

      expect(await mousedownPrevented(page, '.md-body p')).toBe(false);
    });

    test('não bloqueia botões de navegação (Próximo →) mesmo com clipboard_blocked=true', async ({ page }) => {
      await stubSupabaseFake(page, {
        classroom_settings: [{ id: 'sistemas', clipboard_blocked: true }],
      });
      await page.goto(ACTIVITY_URL);
      await expect.poll(() => mousedownPrevented(page, '.md-body p')).toBe(true); // confirma que o guard já está ativo

      await expect(page.locator('.card h2')).toHaveText('Apresentação');
      await page.click('#btnNext');
      await expect(page.locator('.card h2')).toHaveText('Fases de um projeto, agora na prática');
    });

    test('não bloqueia clique/digitação no campo onde o aluno escreve o próprio código (textarea)', async ({ page }) => {
      await stubSupabaseFake(page, {
        classroom_settings: [{ id: 'sistemas', clipboard_blocked: true }],
      });
      await page.goto('/turmas/sistemas/atividades/sql-basico.html?user=alexandre.natal&role=aluno&turma=sistemas');
      await expect.poll(() => mousedownPrevented(page, '#challengeDesc')).toBe(true); // guard ativo na descrição do chamado

      expect(await mousedownPrevented(page, '#codeInput')).toBe(false);
    });
  });
});
