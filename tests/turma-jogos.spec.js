// @ts-check
const { test, expect } = require('@playwright/test');
const { stubSupabaseFake } = require('./helpers');

const URL = '/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&name=Breno%20Silva&turma=jogos';

// As trilhas de verdade (JS/C#) ficam dentro de Fundamentos de Programação,
// junto com as trilhas fund-*.
async function openMateria1(page) {
  await page.click('.game-card:has-text("Fundamentos de Programação")');
}

// Marca via localStorage todas as trilhas com conteúdo real de Jogos
// Digitais como concluídas, pra allModulesComplete() (checkGamesUnlock)
// destravar os jogos só pelo progresso, sem depender de override/professor.
function seedAllModulesComplete(user) {
  // Trilhas teoria+prática (10 perguntas cada) de todas as matérias com
  // conteúdo, exceto Projeto de Vida (5 perguntas — ver [[project_jogos_5_perguntas_pratica]]).
  const dez = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const cinco = [1, 2, 3, 4, 5];
  const dezoito = Array.from({ length: 18 }, (_, i) => i + 1);
  const teoriaFlag = [
    'vida_autoconhecimento_teoria', 'vida_cidadania_teoria', 'vida_emocional_teoria', 'vida_equipe_teoria',
    'vida_metas_carreira_teoria',
        'vida_foco_autocontrole_teoria', 'vida_foco_autocontrole_pratica', 'vida_cidadania_digital_teoria', 'vida_cidadania_digital_pratica',
    'mundo_revolucao_teoria', 'mundo_inovacao_teoria', 'mundo_equipe_teoria', 'mundo_comprometimento_teoria',
    'projetos_metodos_teoria', 'projetos_fases_teoria',
        'projetos_estrutura_banco_teoria', 'projetos_estrutura_banco_pratica', 'projetos_pre_textuais_teoria', 'projetos_pre_textuais_pratica',
    'cod_ide_teoria', 'cod_linguagens_teoria', 'cod_seguranca_debug_teoria', 'cod_poo_teoria', 'cod_agil_clean_teoria', 'cod_seguranca_ia_teoria', 'cod_godot_teoria', 'cod_godot_pratica', 'cod_phaser_pratica',
    'fund_ambiente_teoria', 'fund_logica_teoria', 'fund_prog2d_teoria', 'fund_multimidia_teoria',
    'csharp_teoria', 'csharp_comparacao', 'gdscript_teoria', 'gdscript_comparacao',
    'teste_fundamentos_teoria', 'teste_planejamento_teoria', 'teste_execucao_teoria',
    'teste_roteiros_trabalho', 'teste_roteiros_questionario',
    'teste_meu_jogo_teoria', 'teste_meu_jogo_relatorio',
        'fund_movimento_teoria', 'fund_movimento_pratica'
  ];
  teoriaFlag.forEach(k => localStorage.setItem(`${k}_progress_${user}`, JSON.stringify({ completed: true })));
  localStorage.setItem(`cobrinha_construcao_progress_${user}`, JSON.stringify({ completed: true }));
  // Card Projetos: os 4 grupos da trilha Cibersegurança (flag). As simulações e
  // o material do professor são semEntrega e não contam pro desbloqueio.
  ['cyberseg_hacker_etico', 'cyberseg_engenharia_social', 'cyberseg_senhas_autenticacao', 'cyberseg_malware_golpes']
    .forEach(k => localStorage.setItem(`${k}_progress_${user}`, JSON.stringify({ completed: true })));

  const praticaDez = [
    'mundo_revolucao_pratica', 'mundo_inovacao_pratica', 'mundo_equipe_pratica',
    'projetos_metodos_pratica', 'projetos_fases_pratica',
    'cod_ide_pratica', 'cod_linguagens_pratica', 'cod_seguranca_debug_pratica', 'cod_poo_pratica', 'cod_agil_clean_pratica', 'cod_seguranca_ia_pratica',
    'fund_ambiente_pratica', 'fund_logica_pratica', 'fund_prog2d_pratica', 'fund_multimidia_pratica',
    'teste_fundamentos_pratica', 'teste_planejamento_pratica', 'teste_execucao_pratica'
  ];
  praticaDez.forEach(k => localStorage.setItem(`${k}_progress_${user}`, JSON.stringify(dez)));
  localStorage.setItem(`js_basico_progress_${user}`, JSON.stringify(dez));
  localStorage.setItem(`js_intermediario_progress_${user}`, JSON.stringify(dezoito));
  // csharp_pratica_simples e gdscript_pratica_simples têm 9 desafios cada
  // (progressTotal:9), csharp_desafios/gdscript_desafios têm 14
  // (progressTotal:14), e gdscript_cenarios (só existe pro GDScript, sem
  // equivalente em C#) tem 15 (progressTotal:15) — todos diferentes do
  // padrão de 10 usado pelas outras trilhas de prática.
  const nove = Array.from({ length: 9 }, (_, i) => i + 1);
  const catorze = Array.from({ length: 14 }, (_, i) => i + 1);
  const quinze = Array.from({ length: 15 }, (_, i) => i + 1);
  localStorage.setItem(`csharp_pratica_simples_progress_${user}`, JSON.stringify(nove));
  localStorage.setItem(`gdscript_pratica_simples_progress_${user}`, JSON.stringify(nove));
  localStorage.setItem(`csharp_desafios_progress_${user}`, JSON.stringify(catorze));
  localStorage.setItem(`gdscript_desafios_progress_${user}`, JSON.stringify(catorze));
  localStorage.setItem(`gdscript_cenarios_progress_${user}`, JSON.stringify(quinze));

  const praticaCinco = ['vida_autoconhecimento_pratica', 'vida_cidadania_pratica', 'vida_emocional_pratica', 'vida_equipe_pratica'];
  praticaCinco.forEach(k => localStorage.setItem(`${k}_progress_${user}`, JSON.stringify(cinco)));

  localStorage.setItem(`vida_metas_carreira_pratica_progress_${user}`, JSON.stringify([1]));
  localStorage.setItem(`mundo_comprometimento_pratica_progress_${user}`, JSON.stringify([1]));
  localStorage.setItem(`prova_jogos_progress_${user}`, JSON.stringify({ completed: true, correctCount: 20, total: 20 }));
  localStorage.setItem(`prova_final_jogos_progress_${user}`, JSON.stringify({ completed: true, correctCount: 20, total: 25, nota: 80 }));
}

test.describe('turmas/jogos/plataforma.html', () => {
  test.beforeEach(async ({ page }) => {
    await stubSupabaseFake(page, {});
  });

  test('mostra os cards das 8 matérias de Jogos Digitais (inclui o card Projetos)', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#materiaCardGrid .game-card')).toHaveCount(8);
    await expect(page.locator('#materiaCardGrid')).toContainText('Fundamentos de Programação');
    await expect(page.locator('#materiaCardGrid')).toContainText('Testes de Jogos Digitais');
    await expect(page.locator('#materiaCardGrid')).toContainText('Projetos');
    await expect(page.locator('#materiaCardGrid')).toContainText('Prova');
  });

  test('carrega tema, usuário e trilhas dentro de Fundamentos de Programação', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#txtUserNom')).toHaveText('Breno Silva');
    await expect(page.locator('#txtWelcome')).toHaveText('Bem-vindo(a), Breno Silva');

    await openMateria1(page);

    // 7 trilhas nessa matéria (4 fundamentos genéricos + JS + C# + GDScript)
    // — vira um <select> só, começando na primeira trilha cadastrada.
    await expect(page.locator('#trilhaSelect')).toHaveValue('fund-ambiente');
    await expect(page.locator('#trilhaSelect option[value="js"]')).toHaveCount(1);
    await expect(page.locator('#trilhaSelect option[value="csharp"]')).toHaveCount(1);
    await expect(page.locator('#trilhaSelect option[value="gdscript"]')).toHaveCount(1);

    // tema "hacker": --green deve ser o verde original, não o azul de Sistemas
    const green = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--green').trim());
    expect(green).toBe('#7cff3f');
  });

  test('aba Jogos começa bloqueada quando os módulos não foram concluídos', async ({ page }) => {
    await page.goto(URL);
    const tabJogos = page.locator('#tabBtnJogos');
    await expect(tabJogos).toHaveClass(/disabled/);
    await expect(tabJogos).toContainText('🔒');
    await expect(tabJogos).toHaveAttribute('title', /Bloqueado/);

    // clicar numa aba bloqueada não deve abrir os jogos
    page.once('dialog', d => d.accept());
    await tabJogos.click();
    await expect(page.locator('#tabContentJogos')).toBeHidden();
  });

  test('abrir e fechar um módulo de trilha troca a área visível', async ({ page }) => {
    await page.goto(URL);
    await openMateria1(page);
    await page.selectOption('#trilhaSelect', 'fund-multimidia');
    await expect(page.locator('#subTabContent_fund-multimidia')).toBeVisible();

    await page.click('#moduleSelector_fund-multimidia .game-card');
    await expect(page.locator('#moduleFrameArea_fund-multimidia')).toBeVisible();
    await expect(page.locator('#moduleSelector_fund-multimidia')).toBeHidden();
    await expect(page.locator('#moduleFrame_fund-multimidia')).toHaveAttribute(
      'src', /atividades\/fund-multimidia-teoria\.html\?user=breno\.silva80/
    );

    await page.click('#moduleFrameArea_fund-multimidia .btn-secondary');
    await expect(page.locator('#moduleFrameArea_fund-multimidia')).toBeHidden();
    await expect(page.locator('#moduleSelector_fund-multimidia')).toBeVisible();
  });

  test('aba Jogos desbloqueia quando todos os módulos já foram concluídos', async ({ page }) => {
    await page.addInitScript(seedAllModulesComplete, 'breno.silva80');

    await page.goto(URL);
    const tabJogos = page.locator('#tabBtnJogos');
    await expect(tabJogos).not.toHaveClass(/disabled/);
    await expect(tabJogos).toContainText('🎮');

    await tabJogos.click();
    await expect(page.locator('#tabContentJogos')).toBeVisible();
    await expect(page.locator('#gameCardGrid .game-card')).toHaveCount(7);
  });

});

test.describe('turmas/jogos/plataforma.html — revogação de acesso em tempo real', () => {
  test('professor revoga o acesso enquanto o aluno já está num jogo — fecha o jogo e avisa', async ({ page }) => {
    await stubSupabaseFake(page, {
      student_overrides: [{ student_email: 'breno.silva80', games_unlocked: true }],
    });
    await page.goto(URL);

    const tabJogos = page.locator('#tabBtnJogos');
    await expect(tabJogos).not.toHaveClass(/disabled/); // desbloqueado só pelo override, sem progresso completo
    await tabJogos.click();

    await page.click('.game-card:has-text("Digitação")');
    await expect(page.locator('#gameFrameArea')).toBeVisible();
    await expect(page.locator('#gameSelector')).toBeHidden();

    // Professor revoga o acesso (botão "Revogar"/bloqueio da turma, aba
    // Gestão): grava no banco e dispara o realtime que o aluno já está
    // inscrito (setupOverrideRealtime → fetchTeacherOverride → checkGamesUnlock).
    await page.evaluate(() => {
      window.__FAKE_DB__.student_overrides.find(r => r.student_email === 'breno.silva80').games_unlocked = false;
      window.__fireFakeRealtime('student_overrides');
    });

    await expect(page.locator('#gameFrameArea')).toBeHidden();
    await expect(page.locator('#gameFrame')).toHaveAttribute('src', 'about:blank');
    await expect(tabJogos).toHaveClass(/disabled/);

    // Não basta fechar o jogo específico — o aluno não pode continuar na
    // aba Jogos livre pra escolher outro da lista (#gameSelector também
    // mora lá dentro). Precisa ser tirado da aba inteira, de volta pra Aulas.
    await expect(page.locator('#tabContentJogos')).toBeHidden();
    await expect(page.locator('#gameSelector')).toBeHidden();
    await expect(page.locator('#tabContentAulas')).toBeVisible();

    const toast = page.locator('.pf-toast');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Jogos bloqueados');
    await expect(toast).toContainText('retirado do jogo em andamento');
  });

  test('revogar o acesso sem nenhum jogo aberto só atualiza o cadeado, sem toast', async ({ page }) => {
    await stubSupabaseFake(page, {
      student_overrides: [{ student_email: 'breno.silva80', games_unlocked: true }],
    });
    await page.goto(URL);
    await expect(page.locator('#tabBtnJogos')).not.toHaveClass(/disabled/);

    await page.evaluate(() => {
      window.__FAKE_DB__.student_overrides.find(r => r.student_email === 'breno.silva80').games_unlocked = false;
      window.__fireFakeRealtime('student_overrides');
    });

    await expect(page.locator('#tabBtnJogos')).toHaveClass(/disabled/);
    await expect(page.locator('.pf-toast')).toHaveCount(0);
  });

  test('revogar só o override não fecha o jogo de quem já tem progresso completo (outro critério de desbloqueio)', async ({ page }) => {
    await stubSupabaseFake(page, {
      student_overrides: [{ student_email: 'breno.silva80', games_unlocked: true }],
    });
    await page.addInitScript(seedAllModulesComplete, 'breno.silva80');
    await page.goto(URL);

    const tabJogos = page.locator('#tabBtnJogos');
    await expect(tabJogos).not.toHaveClass(/disabled/);
    await tabJogos.click();
    await page.click('.game-card:has-text("Digitação")');
    await expect(page.locator('#gameFrameArea')).toBeVisible();

    await page.evaluate(() => {
      window.__FAKE_DB__.student_overrides.find(r => r.student_email === 'breno.silva80').games_unlocked = false;
      window.__fireFakeRealtime('student_overrides');
    });

    // progressUnlocked continua true (não depende do override) — o jogo
    // não deve ser fechado à força.
    await expect(page.locator('#gameFrameArea')).toBeVisible();
    await expect(tabJogos).not.toHaveClass(/disabled/);
  });
});

test.describe('turmas/jogos/plataforma.html — sincronização de progresso pro Supabase', () => {
  test('fechar um módulo manda o progresso pra student_module_progress', async ({ page }) => {
    await stubSupabaseFake(page, { student_module_progress: [] });
    await page.addInitScript(user => {
      localStorage.setItem(`fund_multimidia_teoria_progress_${user}`, JSON.stringify({ completed: true }));
    }, 'breno.silva80');

    await page.goto(URL);
    await openMateria1(page);
    await page.selectOption('#trilhaSelect', 'fund-multimidia');
    await page.click('#moduleSelector_fund-multimidia .game-card');
    await expect(page.locator('#moduleFrameArea_fund-multimidia')).toBeVisible();

    await page.click('#moduleFrameArea_fund-multimidia .btn-secondary');
    await expect(page.locator('#moduleSelector_fund-multimidia')).toBeVisible();

    const rows = await page.evaluate(() => window.__FAKE_DB__.student_module_progress || []);
    const multimidiaRow = rows.find(r => r.trilha_key === 'fund-multimidia' && r.module_key === 'teoria');
    expect(multimidiaRow).toMatchObject({
      student_email: 'breno.silva80',
      turma: 'jogos',
      progress_current: 1,
      progress_total: 1,
      completed: true
    });

    // js básico/intermediário nunca foram abertos, mas o sync do carregamento
    // inicial (init()) já deve ter mandado o estado 0/N deles também.
    const jsRow = rows.find(r => r.trilha_key === 'js' && r.module_key === 'basico');
    expect(jsRow).toMatchObject({ progress_current: 0, progress_total: 10, completed: false });
  });

  // Regressão: aluno loga num navegador/dispositivo sem o localStorage de
  // antes (troca de máquina, cache limpo, primeira vez com login real pós-
  // migração pro Supabase Auth) — o progresso local chega "zerado", mas o
  // fund-multimidia/teoria dele já estava concluído de verdade no Supabase.
  // O sync automático do carregamento (syncAllModulesProgress) não pode
  // sobrescrever esse progresso remoto com o zero local.
  test('login num dispositivo sem progresso local não apaga o que já estava concluído no Supabase', async ({ page }) => {
    await stubSupabaseFake(page, {
      student_module_progress: [
        { student_email: 'breno.silva80', turma: 'jogos', trilha_key: 'fund-multimidia', module_key: 'teoria', progress_current: 1, progress_total: 1, completed: true },
      ],
    });
    // Sem addInitScript nenhum — localStorage chega vazio, como um
    // dispositivo novo.
    await page.goto(URL);

    await expect.poll(async () => {
      const rows = await page.evaluate(() => window.__FAKE_DB__.student_module_progress || []);
      return rows.find(r => r.trilha_key === 'fund-multimidia' && r.module_key === 'teoria');
    }).toMatchObject({ progress_current: 1, progress_total: 1, completed: true });
  });
});
