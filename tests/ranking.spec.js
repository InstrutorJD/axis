// @ts-check
// Ranking: o aluno vê a própria posição na turma (calculada a partir do %
// geral de conclusão em student_module_progress), mas nunca o nome ou a
// posição de outro colega — só o número da própria colocação e o total de
// alunos. O professor não vê o badge (não faz sentido pra ele).
const { test, expect } = require('@playwright/test');
const { stubSupabaseFake, jogosAlunoProfiles } = require('./helpers');

// Turma Jogos tem 75 módulos que contam (teoria+prática de todas as trilhas de
// todas as matérias com conteúdo, incluindo os 4 módulos da trilha 'csharp'
// (teoria/comparacao/pratica-simples/desafios), os 5 da trilha 'gdscript'
// (os mesmos 4 + 'cenarios', só dela), os 2 da trilha 'cod-godot' (prática
// sem trava + teoria, em cadeia), o módulo da trilha 'cod-phaser' (só
// prática), o módulo "Prova Diagnóstica — Turma Jogos Digitais" e o módulo
// "Prova Final — Turma Jogos Digitais" e os 4 módulos de grupo da trilha
// Cibersegurança (card Projetos; simulações e material do professor são
// semEntrega e não contam) — usados como base do % geral. As trilhas do
// plano de ensino (dataAula no config.js: as de Projetos e de Projeto de
// Vida compartilhadas com Sistemas) NÃO entram aqui: só contam depois que o
// professor preenche o "Liberar em" (ver exigeLiberacao em
// shared/platform-core.js), e este seed não tem nenhuma. O %
// de cada aluno é a MÉDIA da fração current/total de cada um dos 75
// módulos, não uma simples contagem de módulos concluídos.
//
// O progresso do PRÓPRIO aluno logado é lido do localStorage do navegador
// (syncAllModulesProgress roda no load e reescreve student_module_progress
// com isso) — por isso o progresso dele é semeado via localStorage abaixo,
// não na tabela. Só o progresso de OUTROS alunos (que nunca abrem essa
// sessão de navegador) fica estável vindo direto do seed do Supabase.
const SEED = {
  profiles: jogosAlunoProfiles(),
  student_module_progress: [
    // edward.guzman: completa 2 módulos pré-existentes (js/basico,
    // js/intermediario) → soma 2 frações de 1.0 / 75 módulos = 2,67% → arredonda 3%.
    { student_email: 'edward.guzman', turma: 'jogos', trilha_key: 'js', module_key: 'basico', progress_current: 5, progress_total: 5, completed: true },
    { student_email: 'edward.guzman', turma: 'jogos', trilha_key: 'js', module_key: 'intermediario', progress_current: 7, progress_total: 7, completed: true },
  ],
};

// breno.silva80 completa os 10 desafios de js/basico (progressTotal:10) e
// nada mais → 1 fração de 1.0 / 75 módulos da turma = 1,33% → arredonda 1%.
async function seedBrenoLocalProgress(page) {
  await page.addInitScript(() => {
    localStorage.setItem('js_basico_progress_breno.silva80', JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
  });
}

test.describe('Ranking do aluno na turma', () => {
  test('aluno vê a própria posição, sem nome/posição de colegas na tela', async ({ page }) => {
    await stubSupabaseFake(page, SEED);
    await seedBrenoLocalProgress(page);
    await page.goto('/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&turma=jogos');

    const badge = page.locator('#rankingBadge');
    await expect(badge).toBeVisible();
    // edward (3%) na frente, breno (1%) em 2º de 17 alunos da turma Jogos.
    // O texto é só o essencial (troféu + posição); o detalhe completo vira title/tooltip.
    await expect(badge).toHaveText('🏆 2º');
    await expect(badge).toHaveAttribute('title', 'Sua posição na turma: 2º de 17 (1% concluído)');

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('Edward');
    expect(bodyText).not.toContain('edward.guzman');
  });

  // O PostgREST corta cada resposta em 1000 linhas (max_rows) sem avisar. Com a
  // turma inteira em student_module_progress passando disso, ler tudo numa
  // query só perdia as linhas dos alunos que ficavam no fim da ordem — o
  // ranking deles despencava mesmo tendo feito as atividades.
  test('turma com mais de 1000 linhas de progresso: ranking lê tudo, não só a 1ª página', async ({ page }) => {
    const padding = Array.from({ length: 1100 }, (_, i) => ({
      student_email: 'aaa.padding', turma: 'jogos', trilha_key: 'padding', module_key: `m${i}`,
      progress_current: 0, progress_total: 1, completed: false,
    }));
    await stubSupabaseFake(page, { ...SEED, student_module_progress: [...padding, ...SEED.student_module_progress] });
    await page.addInitScript(() => { window.__FAKE_MAX_ROWS__ = 1000; });
    await page.goto('/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&turma=jogos');

    // edward (3%, linhas depois das 1000 primeiras) continua na frente de breno.
    await expect(page.locator('#rankingBadge')).toHaveText('🏆 2º');
  });

  // Relatório "Ranking da Turma" (Gestão → Relatórios): só sob demanda (botão),
  // turma toda na ordem do ranking, com atividades concluídas × disponíveis.
  test('professor gera o Ranking da Turma por botão, ordenado, com concluídas/disponíveis', async ({ page }) => {
    await stubSupabaseFake(page, SEED);
    await page.goto('/turmas/jogos/plataforma.html?user=admin&ip=192.168.1.254&saldo=9999.00&role=professor&turma=jogos');
    await page.click('#mainNavTabs .tab-btn[data-tab="gestao"]');
    await page.locator('.collapsible-card .collapsible-head', { hasText: 'Relatórios' }).click();

    const resultado = page.locator('#rankingTurmaResultado');
    // Não vem preenchido antes do clique.
    await expect(resultado).toBeEmpty();

    await page.click('#btnGerarRankingTurma');

    const linhas = resultado.locator('tbody tr');
    await expect(linhas).toHaveCount(17);
    // edward (2 módulos concluídos) em 1º; o resto zerado, desempate por e-mail.
    await expect(linhas.nth(0)).toContainText('1º');
    await expect(linhas.nth(0)).toContainText('Edward Guzman');
    await expect(linhas.nth(0)).toContainText('2/75');
    await expect(linhas.nth(0)).toContainText('3%');
    await expect(linhas.nth(1)).toContainText('2º');
    await expect(linhas.nth(1)).toContainText('Breno Silva');
    await expect(linhas.nth(1)).toContainText('0/75');
  });

  test('professor não vê o badge de ranking', async ({ page }) => {
    await stubSupabaseFake(page, SEED);
    await page.goto('/turmas/jogos/plataforma.html?user=admin&ip=192.168.1.254&saldo=9999.00&role=professor&turma=jogos');

    await expect(page.locator('#rankingBadge')).toBeHidden();
  });

  test('aluno no topo da turma vê a própria posição em 1º', async ({ page }) => {
    // Aqui é o edward.guzman quem está logado, então é o localStorage dele
    // (não a linha semeada no SEED, que syncAllModulesProgress reescreveria)
    // que decide o % geral, e ele é o único aluno com progresso > 0% → 1º
    // lugar, mesmo sem ser 100%.
    await stubSupabaseFake(page, SEED);
    await page.addInitScript(() => {
      localStorage.setItem('js_basico_progress_edward.guzman', JSON.stringify([0, 1, 2, 3, 4]));
      localStorage.setItem('js_intermediario_progress_edward.guzman', JSON.stringify([0, 1, 2, 3, 4, 5, 6]));
    });
    await page.goto('/turmas/jogos/plataforma.html?user=edward.guzman&ip=192.168.1.11&saldo=1580.11&role=aluno&turma=jogos');

    await expect(page.locator('#rankingBadge')).toHaveText('🏆 1º');
  });

  // Cada aluno numa posição ÚNICA, mesmo quando o % ARREDONDADO (o número
  // mostrado na tela) empata entre vários — o desempate por e-mail garante
  // que a posição nunca se repete (já aconteceu de 3+ alunos aparecerem
  // como "1º" ao mesmo tempo, com o ranking "de competição" antigo).
  test('% arredondado igual entre vários alunos: cada um fica numa posição diferente', async ({ page }) => {
    // SEED só dá progresso pro edward — breno e o resto da turma (16 outros
    // alunos) ficam exatamente em 0%, um empate de verdade (não só de
    // arredondamento). O e-mail decide a ordem entre eles.
    await stubSupabaseFake(page, SEED);
    await page.goto('/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&turma=jogos');

    // "breno.silva80" é o 1º em ordem alfabética entre os 16 zerados.
    await expect(page.locator('#rankingBadge')).toHaveText('🏆 2º');
    await expect(page.locator('#rankingBadge')).toHaveAttribute('title', 'Sua posição na turma: 2º de 17 (0% concluído)');
  });

  // Empate EXATO no % (não só no arredondado): dois alunos com o mesmíssimo
  // progresso ainda assim precisam ficar em posições diferentes — só o
  // e-mail como desempate final garante isso.
  test('dois alunos com o mesmo % exato ficam em posições diferentes, nunca empatadas', async ({ page }) => {
    // edward sempre acima dos dois (mais um módulo concluído que eles).
    const baseSeed = {
      student_module_progress: [
        { student_email: 'edward.guzman', turma: 'jogos', trilha_key: 'js', module_key: 'basico', progress_current: 10, progress_total: 10, completed: true },
        { student_email: 'edward.guzman', turma: 'jogos', trilha_key: 'js', module_key: 'intermediario', progress_current: 10, progress_total: 10, completed: true },
      ],
    };

    // Caso A: gabriella tem o mesmo módulo concluído (via SEED, ela não está
    // logada nesta passagem) e breno.silva80 loga com o MESMO progresso
    // exato semeado no localStorage dela — mesmo % exato dos dois.
    // (Não usa "engel.fraga" de propósito: esse usuário tem uma trilha
    // individual extra em turmas/jogos/config.js — visibleFor —, que muda o
    // denominador só dele e quebraria a paridade exata que este teste
    // depende. Ver shared/platform-core.js, isTrilhaVisibleToEmail.)
    await stubSupabaseFake(page, {
      profiles: jogosAlunoProfiles(),
      student_module_progress: [
        ...baseSeed.student_module_progress,
        { student_email: 'gabriella.borges5', turma: 'jogos', trilha_key: 'js', module_key: 'basico', progress_current: 10, progress_total: 10, completed: true },
      ],
    });
    await page.addInitScript(user => {
      localStorage.setItem(`js_basico_progress_${user}`, JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
    }, 'breno.silva80');
    await page.goto('/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.12&saldo=2100.12&role=aluno&turma=jogos');
    // "breno.silva80" vem antes de "gabriella.borges5" em ordem alfabética.
    await expect(page.locator('#rankingBadge')).toHaveText('🏆 2º');
  });

  test('o outro lado do mesmo empate exato: quem perde no desempate fica numa posição atrás', async ({ page }) => {
    const baseSeed = {
      student_module_progress: [
        { student_email: 'edward.guzman', turma: 'jogos', trilha_key: 'js', module_key: 'basico', progress_current: 10, progress_total: 10, completed: true },
        { student_email: 'edward.guzman', turma: 'jogos', trilha_key: 'js', module_key: 'intermediario', progress_current: 10, progress_total: 10, completed: true },
      ],
    };

    // Caso B: agora quem loga é gabriella.borges5, com o mesmo % exato de
    // breno.silva80 (que fica pelo SEED, sem logar nesta passagem). Mesmo
    // motivo do teste anterior pra não usar "engel.fraga" aqui: ele tem uma
    // trilha individual extra (visibleFor) que mudaria só o denominador dele.
    await stubSupabaseFake(page, {
      profiles: jogosAlunoProfiles(),
      student_module_progress: [
        ...baseSeed.student_module_progress,
        { student_email: 'breno.silva80', turma: 'jogos', trilha_key: 'js', module_key: 'basico', progress_current: 10, progress_total: 10, completed: true },
      ],
    });
    await page.addInitScript(user => {
      localStorage.setItem(`js_basico_progress_${user}`, JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
    }, 'gabriella.borges5');
    await page.goto('/turmas/jogos/plataforma.html?user=gabriella.borges5&ip=192.168.1.13&saldo=1420.13&role=aluno&turma=jogos');
    // Mesmo % exato de breno, mas "gabriella.borges5" perde o desempate
    // alfabético — fica uma posição atrás dele (3º), nunca empatada em 2º.
    await expect(page.locator('#rankingBadge')).toHaveText('🏆 3º');
  });
});
