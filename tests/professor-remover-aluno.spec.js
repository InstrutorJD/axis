// @ts-check
// "Remover aluno" (Gestão → Alunos, shared/platform-core.js) — soft-delete
// (arquivar), não apaga nada: profiles.archived_at some da lista ativa em
// TODA tela que lê turmaStudents() (Gestão, Chamada, Notas, Ranking,
// relatórios), mas notas/chamada/progresso/placares já lançados continuam no
// banco. Login também é bloqueado (RPC arquivar_aluno, sql/supabase-setup-completo.sql
// — bane a conta e derruba a sessão no Supabase de verdade; o fake client só
// simula o lado profiles.archived_at, ver tests/fixtures/fake-supabase-client.js).
const { test, expect } = require('@playwright/test');
const { stubSupabaseFake, sistemasAlunoProfiles } = require('./helpers');

const SISTEMAS_URL = '/turmas/sistemas/plataforma.html?user=admin&ip=192.168.1.254&saldo=9999.00&role=professor&turma=sistemas';
const ALUNO_URL = '/turmas/sistemas/plataforma.html?user=alexandre.natal&role=aluno&name=Alexandre%20Natal&turma=sistemas';

async function openGestao(page, seed) {
  await stubSupabaseFake(page, { ...seed, profiles: [...(seed.profiles || []), ...sistemasAlunoProfiles()] });
  await page.goto(SISTEMAS_URL);
  await page.click('#mainNavTabs .tab-btn[data-tab="gestao"]');
  await page.locator('.collapsible-card .collapsible-head', { hasText: 'Alunos' }).click();
}

test.describe('Gestão → Alunos (arquivar/reativar) — dentro do portal da turma', () => {
  test('lista os 26 alunos ativos da turma, cada um com um botão Arquivar', async ({ page }) => {
    await openGestao(page, {});
    const rows = page.locator('#tblGestaoAlunosBody tr');
    await expect(rows).toHaveCount(26);
    await expect(rows.filter({ hasText: 'Alexandre Natal' })).toContainText('Arquivar');
    await expect(page.locator('#tblGestaoAlunosArquivadosBody')).toContainText('Nenhum aluno arquivado');
  });

  test('clicar em "Arquivar" pede o nome do aluno, e o botão só destrava com o nome certo', async ({ page }) => {
    await openGestao(page, {});
    await page.locator('#tblGestaoAlunosBody tr', { hasText: 'Alexandre Natal' }).getByRole('button', { name: 'Arquivar' }).click();

    const overlay = page.locator('#pfArchiveOverlay');
    await expect(overlay).toBeVisible();
    const confirmBtn = overlay.locator('.pf-archive-ok');
    await expect(confirmBtn).toBeDisabled();

    await overlay.locator('.pf-archive-input').fill('nome errado');
    await expect(confirmBtn).toBeDisabled();

    // maiúsculas/minúsculas e espaço nas pontas não importam
    await overlay.locator('.pf-archive-input').fill('  alexandre natal  ');
    await expect(confirmBtn).toBeEnabled();
  });

  test('"Cancelar" fecha sem arquivar ninguém', async ({ page }) => {
    await openGestao(page, {});
    await page.locator('#tblGestaoAlunosBody tr', { hasText: 'Alexandre Natal' }).getByRole('button', { name: 'Arquivar' }).click();
    await page.locator('.pf-archive-cancel').click();
    await expect(page.locator('#pfArchiveOverlay')).toHaveCount(0);
    await expect(page.locator('#tblGestaoAlunosBody')).toContainText('Alexandre Natal');
    const profiles = await page.evaluate(() => window.__FAKE_DB__.profiles);
    expect(profiles.find(p => p.email === 'alexandre.natal').archived_at).toBeFalsy();
  });

  test('confirmar arquivamento move o aluno da lista ativa pra "Alunos arquivados"', async ({ page }) => {
    await openGestao(page, {});
    await page.locator('#tblGestaoAlunosBody tr', { hasText: 'Alexandre Natal' }).getByRole('button', { name: 'Arquivar' }).click();
    await page.locator('.pf-archive-input').fill('Alexandre Natal');
    await page.locator('.pf-archive-ok').click();

    await expect(page.locator('#pfArchiveOverlay')).toHaveCount(0);
    await expect(page.locator('#tblGestaoAlunosBody')).not.toContainText('Alexandre Natal');
    await expect(page.locator('#tblGestaoAlunosBody tr')).toHaveCount(25);
    const archRow = page.locator('#tblGestaoAlunosArquivadosBody tr', { hasText: 'Alexandre Natal' });
    await expect(archRow).toBeVisible();
    await expect(archRow).toContainText('alexandre.natal');
    await expect(archRow.getByRole('button', { name: 'Reativar' })).toBeVisible();

    const profiles = await page.evaluate(() => window.__FAKE_DB__.profiles);
    expect(profiles.find(p => p.email === 'alexandre.natal').archived_at).toBeTruthy();
  });

  test('"Reativar" devolve o aluno pra lista ativa e limpa archived_at', async ({ page }) => {
    // openGestao() sempre ANEXA o roster padrão (sistemasAlunoProfiles()) —
    // pra simular um aluno JÁ arquivado sem duplicar a linha dele, monta o
    // roster completo à mão aqui em vez de usar o helper.
    const profiles = sistemasAlunoProfiles().map(p => p.email === 'alexandre.natal' ? { ...p, archived_at: new Date().toISOString() } : p);
    await stubSupabaseFake(page, { profiles });
    await page.goto(SISTEMAS_URL);
    await page.click('#mainNavTabs .tab-btn[data-tab="gestao"]');
    await page.locator('.collapsible-card .collapsible-head', { hasText: 'Alunos' }).click();

    await expect(page.locator('#tblGestaoAlunosBody')).not.toContainText('Alexandre Natal');
    const archRow = page.locator('#tblGestaoAlunosArquivadosBody tr', { hasText: 'Alexandre Natal' });
    await expect(archRow).toBeVisible();

    await archRow.getByRole('button', { name: 'Reativar' }).click();

    await expect(page.locator('#tblGestaoAlunosArquivadosBody')).toContainText('Nenhum aluno arquivado');
    await expect(page.locator('#tblGestaoAlunosBody')).toContainText('Alexandre Natal');
    const profilesAfter = await page.evaluate(() => window.__FAKE_DB__.profiles);
    expect(profilesAfter.find(p => p.email === 'alexandre.natal').archived_at).toBeFalsy();
  });

  // O RPC arquivar_aluno (sql/supabase-setup-completo.sql) só deixa arquivar
  // role='aluno' — nunca um professor, mesmo que alguém chame na mão via
  // console. Esta tela nem mostra o botão pra professor, mas a regra
  // também vale no lado do "servidor" (RPC), então testamos o RPC direto.
  test('o RPC arquivar_aluno recusa arquivar uma conta de professor', async ({ page }) => {
    await openGestao(page, {});
    const result = await page.evaluate(() =>
      window.PortalSession.client().rpc('arquivar_aluno', { p_email: 'admin' })
    );
    expect(result.data).toMatchObject({ success: false });
    const profiles = await page.evaluate(() => window.__FAKE_DB__.profiles);
    expect(profiles.find(p => p.email === 'admin').archived_at).toBeFalsy();
  });

  test('aluno não vê a aba Gestão (mesmo isolamento de sempre — nada novo aqui, só reconfirma o guard)', async ({ page }) => {
    await stubSupabaseFake(page, { profiles: sistemasAlunoProfiles() });
    await page.goto(ALUNO_URL);
    await expect(page.locator('#mainNavTabs .tab-btn[data-tab="gestao"]')).toHaveCount(0);
  });
});

test.describe('Arquivar aluno — efeito em cascata nas outras telas da turma', () => {
  test('aluno arquivado some da Chamada, das Notas e do total de alunos usado no Ranking', async ({ page }) => {
    await openGestao(page, {});
    await page.locator('#tblGestaoAlunosBody tr', { hasText: 'Alexandre Natal' }).getByRole('button', { name: 'Arquivar' }).click();
    await page.locator('.pf-archive-input').fill('Alexandre Natal');
    await page.locator('.pf-archive-ok').click();
    await expect(page.locator('#tblGestaoAlunosBody tr')).toHaveCount(25);

    await page.locator('.collapsible-card .collapsible-head', { hasText: 'Chamada e Notas' }).click();
    await expect(page.locator('#chamadaBody')).not.toContainText('Alexandre Natal');
    await expect(page.locator('#chamadaBody tr')).toHaveCount(25);
    await expect(page.locator('#notasBody')).not.toContainText('Alexandre Natal');
  });

  test('aluno arquivado não consegue mais navegar no portal (requireUser bloqueia e manda pro login com aviso)', async ({ page }) => {
    await stubSupabaseFake(page, {
      profiles: [
        ...sistemasAlunoProfiles(),
        // sobrescreve o profile do alexandre com archived_at já marcado
      ].map(p => p.email === 'alexandre.natal' ? { ...p, archived_at: new Date().toISOString() } : p),
    });
    await page.goto(ALUNO_URL);
    await expect(page).toHaveURL(/index\.html\?arquivado=1$/);
    await expect(page.locator('#errMsg')).toBeVisible();
    await expect(page.locator('#errMsg')).toContainText('desativada');
  });

  test('a mensagem "?arquivado=1" some numa visita normal (sem o parâmetro)', async ({ page }) => {
    await stubSupabaseFake(page, {});
    await page.goto('/index.html');
    await expect(page.locator('#errMsg')).toBeHidden();
  });
});
