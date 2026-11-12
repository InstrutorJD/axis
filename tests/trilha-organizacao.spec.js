// @ts-check
// Organização das trilhas por status (shared/platform-core.js: trilhaStatus/
// visibleTrilhas/visibleTrilhasOrdered) — sem isso, o currículo de vários
// bimestres somados lotaria a tela do aluno com tudo junto, misturado.
//
// "Futura"/"encerrada" agora é sempre no nível da TRILHA (bimestre_dates +
// trilha_bimestre, ver tests/bimestre-dates.spec.js pra cobertura
// detalhada) — não existe mais início/prazo por trilha em data solta nem
// grupo "Em atraso" (ver git history). Este arquivo cobre só a ordenação/
// agrupamento dentro de uma matéria já visível (aberta vs. concluída).
const { test, expect } = require('@playwright/test');
const { stubSupabaseFake } = require('./helpers');

test.describe('Organização das trilhas (em aberto / concluídas)', () => {
  test.beforeEach(async ({ page }) => {
    await stubSupabaseFake(page, {});
  });

  test('trilha 100% concluída entra no grupo recolhido "Concluídas", sem sumir da lista', async ({ page }) => {
    await page.addInitScript(user => {
      localStorage.setItem(`vida_equipe_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`vida_equipe_pratica_progress_${user}`, JSON.stringify([0, 1, 2, 3, 4]));
    }, 'breno.silva80');
    await page.goto('/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&turma=jogos');
    await page.click('.game-card:has-text("Projeto de Vida")');

    const select = page.locator('#trilhaSelect');
    await expect(select.locator('optgroup[label="✅ Concluídas"] option')).toHaveText(['Colaboração e Compromisso em Equipe']);
    // grupo "aberta" continua com as outras 5 trilhas não concluídas
    // (incluindo a Aulão Missão 2, vida-enigma-equipe, sempre visível por
    // exigeLiberacao: false). Não aparecem: as 2 do plano de ensino ainda sem "Liberar em"
    // (vida-foco-autocontrole e vida-cidadania-digital, ver exigeLiberacao) e
    // as 2 individuais/visibleFor do Engel.
    await expect(select.locator('optgroup[label="🟢 Em aberto"] option')).toHaveCount(5);

    await select.selectOption('vida-equipe');
    await expect(page.locator('#moduleSelector_vida-equipe h2')).toContainText('Concluída');
  });

  test('matéria com TODAS as trilhas num bimestre ainda não iniciado ganha o selo "Em breve"', async ({ page }) => {
    await stubSupabaseFake(page, {
      bimestre_dates: [{ turma: 'jogos', bimestre: 1, inicio: '2999-01-01', fim: '2999-03-31' }],
      // As 5 trilhas da matéria (as 2 próprias de Jogos, a Aulão Missão 3 e as
      // 2 compartilhadas com Sistemas: projetos-estrutura-banco e projetos-pre-textuais).
      trilha_bimestre: [
        { turma: 'jogos', trilha_key: 'projetos-metodos', bimestre: 1 },
        { turma: 'jogos', trilha_key: 'projetos-fases', bimestre: 1 },
        { turma: 'jogos', trilha_key: 'projetos-enigma-documento', bimestre: 1 },
        { turma: 'jogos', trilha_key: 'projetos-estrutura-banco', bimestre: 1 },
        { turma: 'jogos', trilha_key: 'projetos-pre-textuais', bimestre: 1 },
      ],
    });
    await page.goto('/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&turma=jogos');

    const card = page.locator('.game-card:has-text("Introdução ao Desenvolvimento de Projetos")');
    await expect(card).toContainText('Em breve');

    // Continua clicável — só avisa que ainda não tem nada disponível, não trava.
    await card.click();
    await expect(page.locator('#aulasSubTabPages')).toContainText('Nenhuma trilha disponível nesta matéria no momento');
  });

  // Motivo de ser por TRILHA e não por matéria: a mesma matéria pode ter
  // trilhas em bimestres diferentes — uma pode estar num bimestre futuro
  // enquanto outra, sem bimestre atribuído, já fica disponível.
  test('matéria com parte das trilhas num bimestre futuro continua acessível pela que sobrou', async ({ page }) => {
    await stubSupabaseFake(page, {
      bimestre_dates: [{ turma: 'jogos', bimestre: 1, inicio: '2999-01-01', fim: '2999-03-31' }],
      // projetos-fases fica sem bimestre (sempre visível); as outras 4 trilhas
      // da matéria (incluindo a Aulão Missão 3 e as 2 compartilhadas com
      // Sistemas) vão pro futuro.
      trilha_bimestre: [
        { turma: 'jogos', trilha_key: 'projetos-metodos', bimestre: 1 },
        { turma: 'jogos', trilha_key: 'projetos-enigma-documento', bimestre: 1 },
        { turma: 'jogos', trilha_key: 'projetos-estrutura-banco', bimestre: 1 },
        { turma: 'jogos', trilha_key: 'projetos-pre-textuais', bimestre: 1 },
      ],
    });
    await page.goto('/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&turma=jogos');

    const card = page.locator('.game-card:has-text("Introdução ao Desenvolvimento de Projetos")');
    await expect(card).not.toContainText('Em breve');
    await card.click();

    // Só sobrou 1 trilha visível ("Fases de Elaboração de um Projeto") —
    // com uma trilha só o <select> nem existe, a matéria abre direto nela.
    await expect(page.locator('#trilhaSelect')).toHaveCount(0);
    await expect(page.locator('#moduleSelector_projetos-fases')).toBeVisible();
    await expect(page.locator('#moduleSelector_projetos-metodos')).toHaveCount(0);
  });
});
