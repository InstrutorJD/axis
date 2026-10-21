// @ts-check
// Aba "Perfil" (só do aluno): mostra o progresso geral, o progresso por
// matéria/trilha e a vitrine de insígnias do curso (turmas/jogos/config.js),
// progressivas por % geral de conclusão — sem tabela nova no Supabase, é
// tudo derivado de student_module_progress.
const { test, expect } = require('@playwright/test');
const { stubSupabaseFake, jogosAlunoProfiles } = require('./helpers');

const ALUNO_URL = '/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&turma=jogos';
const PROFESSOR_URL = '/turmas/jogos/plataforma.html?user=admin&ip=192.168.1.254&saldo=9999.00&role=professor&turma=jogos';

// Turma Jogos tem 73 módulos que contam (mesma base de cálculo usada em
// ranking.spec.js — 66 + o módulo novo "Prova Final — Turma Jogos
// Digitais", matéria "Prova", + os 4 módulos de grupo da trilha Cibersegurança
// do card Projetos; as simulações e o material do professor, semEntrega, não
// contam; as trilhas do plano de ensino, com dataAula no config.js, só
// contam depois do "Liberar em" — ver exigeLiberacao em
// shared/platform-core.js). A matéria "Fundamentos de Programação"
// sozinha tem 19: js/basico, js/intermediario, os 4 módulos da trilha
// csharp (teoria, comparação, prática simples, desafios) e os 5 da trilha
// gdscript (os mesmos 4 + 'cenarios', só dela), e mais 4 trilhas
// (teoria+prática cada) de fundamentos gerais de jogos. (Os outros 3
// módulos, das trilhas 'cod-godot' (prática sem trava + teoria, em cadeia)
// e 'cod-phaser' (só prática), ficam na matéria "Codificação de Jogos"; os
// módulos "Prova — Turma Jogos Digitais" e "Prova Final — Turma Jogos
// Digitais" ficam na matéria "Prova".)
const SEED = {
  profiles: jogosAlunoProfiles(),
  student_module_progress: [
    { student_email: 'edward.guzman', turma: 'jogos', trilha_key: 'js', module_key: 'basico', progress_current: 5, progress_total: 5, completed: true },
    { student_email: 'edward.guzman', turma: 'jogos', trilha_key: 'js', module_key: 'intermediario', progress_current: 7, progress_total: 7, completed: true },
  ],
};

async function openPerfil(page) {
  await page.click('#mainNavTabs .tab-btn[data-tab="perfil"]');
}

test.describe('Aba Perfil (só aluno)', () => {
  // O professor também vê o botão de perfil (ícone de avatar, antigo botão
  // de texto "Perfil 👤" que era só do aluno) — mas ele não tem
  // student_module_progress próprio, então o botão de perfil dele abre
  // direto a personalização (ou os alertas pendentes), sem os cards de
  // progresso/insígnias (ver tests/personalizacao.spec.js).
  test('professor vê o botão de perfil, mas sem os cards de progresso do aluno', async ({ page }) => {
    await stubSupabaseFake(page, {});
    await page.goto(PROFESSOR_URL);
    await expect(page.locator('#mainNavTabs .tab-btn[data-tab="perfil"]')).toHaveCount(1);
    await page.click('#mainNavTabs .tab-btn[data-tab="perfil"]');
    await expect(page.locator('.pf-perso-box')).toBeVisible();
    await expect(page.locator('#perfilProgressoWrap')).toBeHidden();
  });

  test('aluno sem nenhum progresso salvo vê 0%, e a vitrine de insígnias aparece toda travada', async ({ page }) => {
    await stubSupabaseFake(page, {});
    await page.goto(ALUNO_URL);
    await openPerfil(page);

    await expect(page.locator('#perfilResumo')).toContainText('0%');
    await expect(page.locator('#perfilBadgesGrid .badge-slot')).toHaveCount(6);
    await expect(page.locator('#perfilBadgesGrid')).toContainText('Iniciante');
    await expect(page.locator('#perfilBadgesGrid .badge-slot.unlocked')).toHaveCount(0);
  });

  test('mostra progresso geral, por matéria/trilha, a posição no ranking e desbloqueia insígnias por % de conclusão', async ({ page }) => {
    await stubSupabaseFake(page, SEED);
    // breno completa só js/basico (10/10) → 1 módulo concluído de 73 na turma
    // toda (1/73 = 1,37% geral, arredonda pra 1%), mas 5% dentro da matéria
    // Fundamentos (1 de 19 módulos: js básico+intermediário, os 4 módulos da
    // trilha csharp, os 5 módulos da trilha gdscript, e mais 4 trilhas
    // teoria+prática de fundamentos gerais de jogos).
    await page.addInitScript(() => {
      localStorage.setItem('js_basico_progress_breno.silva80', JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
    });
    await page.goto(ALUNO_URL);
    await openPerfil(page);

    const resumo = page.locator('#perfilResumo');
    await expect(resumo).toContainText('1%');
    await expect(resumo).toContainText('1/73');
    await expect(resumo).toContainText('2º'); // atrás só do edward, à frente do resto (0%)
    await expect(resumo).toContainText('Posição de 17');

    const materiaCard = page.locator('.perfil-materia-card', { hasText: 'Fundamentos de Programação' });
    await expect(materiaCard).toContainText('5%');
    await expect(materiaCard).toContainText('1/2'); // trilha JS: básico feito, intermediário não
    await expect(materiaCard).toContainText('0/2'); // trilhas fund-*: nada feito (teoria + prática)
    await expect(materiaCard).toContainText('0/4'); // trilha csharp: nada feito (teoria + comparação + prática simples + desafios)
    await expect(materiaCard).toContainText('0/5'); // trilha gdscript: nada feito (os mesmos 4 + cenários)

    // Progresso real: desbloqueia só "Iniciante" (minPct:0, exige progresso
    // real) — "Explorador" (minPct:20) ainda não.
    await expect(page.locator('#perfilBadgesGrid .badge-slot')).toHaveCount(6);
    await expect(page.locator('#perfilBadgesGrid .badge-slot.unlocked')).toHaveCount(1);
    const iniciante = page.locator('.badge-slot', { hasText: 'Iniciante' });
    await expect(iniciante).toHaveClass(/unlocked/);
    await expect(iniciante).toContainText('Deu o primeiro passo no mundo dos jogos!');
    const explorador = page.locator('.badge-slot', { hasText: 'Explorador' });
    await expect(explorador).not.toHaveClass(/unlocked/);
    const criador = page.locator('.badge-slot', { hasText: 'Criador' });
    await expect(criador).not.toHaveClass(/unlocked/);
    await expect(criador).toContainText('Alcance 40% de progresso');
  });

  test('trocar de aba pra Perfil não mexe no cadeado de Jogos', async ({ page }) => {
    await stubSupabaseFake(page, {});
    await page.goto(ALUNO_URL);
    await openPerfil(page);
    await expect(page.locator('#tabContentPerfil')).toBeVisible();
    await expect(page.locator('#tabBtnJogos')).toHaveClass(/disabled/);
  });
});

// O aluno vê a própria nota, matéria a matéria, sem precisar da Gestão —
// mesma fórmula (e mesmo bimestre "atual") que o professor usa em Gestão
// → Lançar Notas, pra nunca mostrar um número diferente do que o
// professor vê lá (ver tests/professor-chamada-notas.spec.js).
test.describe('Aba Perfil — NOTA por matéria', () => {
  test('mostra a nota do bimestre atual por matéria, igual à fórmula de Lançar Notas (Gestão)', async ({ page }) => {
    await stubSupabaseFake(page, {
      // Intervalo bem largo, sempre cobre "hoje" — não importa quando o teste
      // roda. notas_liberadas:true — sem isso a NOTA fica escondida (ver
      // "Mostrar Notas" em tests/professor-gestao-turma.spec.js).
      bimestre_dates: [{ turma: 'jogos', bimestre: 1, inicio: '2000-01-01', fim: '2999-12-31', notas_liberadas: true }],
      trilha_bimestre: [
        { turma: 'jogos', trilha_key: 'vida-autoconhecimento', bimestre: 1 },
        { turma: 'jogos', trilha_key: 'prova-diagnostica', bimestre: 1 },
        // Nota 3 ("Prova Final") também é automática pra turma Jogos, igual
        // já era pra Sistemas — precisa estar atribuída a este bimestre,
        // senão nota3EhDesteBimestre fica false e a coluna trava em 0
        // (mesmo mecanismo da coluna "Prova"/prova-diagnostica acima).
        { turma: 'jogos', trilha_key: 'prova-final', bimestre: 1 },
      ],
      student_module_progress: [
        { student_email: 'breno.silva80', turma: 'jogos', trilha_key: 'vida-autoconhecimento', module_key: 'teoria', progress_current: 1, progress_total: 1, completed: true },
        // prática só com 3 dos 5 pareceres — teoria 100% + prática 60% = 80% de conclusão da trilha.
        { student_email: 'breno.silva80', turma: 'jogos', trilha_key: 'vida-autoconhecimento', module_key: 'pratica', progress_current: 3, progress_total: 5 },
      ],
      student_activity_state: [
        { student_email: 'breno.silva80', progress_key: 'prova_jogos', state: { completed: true, correctCount: 16, total: 20, nota: 80 } },
        // Nota 3 (0-100, escalada pra 0-10) vem de state.nota, não mais de
        // grades.nota3 — ver nota3Auto em shared/platform-core.js.
        { student_email: 'breno.silva80', progress_key: 'prova_final_jogos', state: { completed: true, correctCount: 15, total: 25, nota: 60 } },
      ],
      grades: [
        { student_email: 'breno.silva80', student_name: 'Breno Silva', turma: 'jogos', bimestre: 1, nota4: 4 },
      ],
    });
    await page.goto(ALUNO_URL);
    await openPerfil(page);

    // Projeto de Vida: (80%*10=8,00 + Prova 8,00 + Nota3 6,00) / 3 = 7.33. Nota4
    // (4) não entra nessa conta — continua só digitável em Lançar Notas.
    const card = page.locator('.perfil-materia-card', { hasText: 'Projeto de Vida' });
    await expect(card).toContainText('NOTA:');
    await expect(card).toContainText('7.33');
    // >= 6,0 — selo verde "Aprovado" ao lado da nota.
    await expect(card.locator('.perfil-nota-status')).toHaveText('Aprovado');
    await expect(card.locator('.perfil-nota-status')).toHaveClass(/aprovado/);
  });

  test('Recuperação não afeta matéria que já está >= 6,0 — mudar ela não altera a NOTA na aba Perfil (Realtime só confirma que a tela reagiu, sem mudar o valor)', async ({ page }) => {
    await stubSupabaseFake(page, {
      bimestre_dates: [{ turma: 'jogos', bimestre: 1, inicio: '2000-01-01', fim: '2999-12-31', notas_liberadas: true }],
      trilha_bimestre: [
        { turma: 'jogos', trilha_key: 'vida-autoconhecimento', bimestre: 1 },
        { turma: 'jogos', trilha_key: 'prova-diagnostica', bimestre: 1 },
        { turma: 'jogos', trilha_key: 'prova-final', bimestre: 1 },
      ],
      student_module_progress: [
        { student_email: 'breno.silva80', turma: 'jogos', trilha_key: 'vida-autoconhecimento', module_key: 'teoria', progress_current: 1, progress_total: 1, completed: true },
        { student_email: 'breno.silva80', turma: 'jogos', trilha_key: 'vida-autoconhecimento', module_key: 'pratica', progress_current: 3, progress_total: 5 },
      ],
      student_activity_state: [
        { student_email: 'breno.silva80', progress_key: 'prova_jogos', state: { completed: true, correctCount: 16, total: 20, nota: 80 } },
        { student_email: 'breno.silva80', progress_key: 'prova_final_jogos', state: { completed: true, correctCount: 15, total: 25, nota: 60 } },
      ],
      grades: [
        { student_email: 'breno.silva80', student_name: 'Breno Silva', turma: 'jogos', bimestre: 1, nota4: 4 },
      ],
    });
    await page.goto(ALUNO_URL);
    await openPerfil(page);

    const card = page.locator('.perfil-materia-card', { hasText: 'Projeto de Vida' });
    await expect(card).toContainText('7.33'); // com nota4 = 4, como no teste acima

    // O professor (noutra sessão) salva a Nota 4 = 10 pra esse bimestre —
    // simula o Realtime chegando SEM o aluno recarregar a página.
    await page.evaluate(() => {
      const row = window.__FAKE_DB__.grades.find(g => g.student_email === 'breno.silva80' && g.bimestre === 1);
      row.nota4 = 10;
      window.__fireFakeRealtime('grades');
    });

    // Base já é >= 6,0 — Recuperação não entra, o valor continua 7.33
    // mesmo depois do Realtime disparar o recálculo.
    await expect(card).toContainText('7.33');
  });

  test('Recuperação abaixo de 6,0 vira a média com a nota base, e atualiza ao vivo na aba Perfil (Realtime)', async ({ page }) => {
    await stubSupabaseFake(page, {
      bimestre_dates: [{ turma: 'jogos', bimestre: 1, inicio: '2000-01-01', fim: '2999-12-31', notas_liberadas: true }],
      trilha_bimestre: [
        { turma: 'jogos', trilha_key: 'vida-autoconhecimento', bimestre: 1 },
        { turma: 'jogos', trilha_key: 'prova-diagnostica', bimestre: 1 },
        { turma: 'jogos', trilha_key: 'prova-final', bimestre: 1 },
      ],
      // Nenhum módulo concluído — trilha 0% de conclusão.
      student_module_progress: [],
      student_activity_state: [
        { student_email: 'breno.silva80', progress_key: 'prova_jogos', state: { completed: true, correctCount: 6, total: 20, nota: 30 } },
        { student_email: 'breno.silva80', progress_key: 'prova_final_jogos', state: { completed: true, correctCount: 6, total: 20, nota: 30 } },
      ],
      grades: [],
    });
    await page.goto(ALUNO_URL);
    await openPerfil(page);

    const card = page.locator('.perfil-materia-card', { hasText: 'Projeto de Vida' });
    // Base: (0%*10=0,00 + Prova 3,00 + Nota3 3,00) / 3 = 2.00 — sem
    // Recuperação lançada ainda, a nota exibida é a própria base.
    await expect(card).toContainText('2.00');
    // < 6,0 — selo amarelo "Recuperação" ao lado da nota.
    await expect(card.locator('.perfil-nota-status')).toHaveText('Recuperação');
    await expect(card.locator('.perfil-nota-status')).toHaveClass(/recuperacao/);

    // O professor lança a Recuperação = 10 pra esse bimestre — simula o
    // Realtime chegando SEM o aluno recarregar a página.
    await page.evaluate(() => {
      window.__FAKE_DB__.grades.push({ student_email: 'breno.silva80', student_name: 'Breno Silva', turma: 'jogos', bimestre: 1, nota4: 10 });
      window.__fireFakeRealtime('grades');
    });

    // Nota final = (2,00 + 10) / 2 = 6.00 — cruzou o corte, selo vira "Aprovado".
    await expect(card).toContainText('6.00');
    await expect(card.locator('.perfil-nota-status')).toHaveText('Aprovado');
  });

  test('sem calendário de bimestres cadastrado (fora do período letivo), mostra "NOTA: —"', async ({ page }) => {
    await stubSupabaseFake(page, { bimestre_dates: [] });
    await page.goto(ALUNO_URL);
    await openPerfil(page);

    const card = page.locator('.perfil-materia-card', { hasText: 'Projeto de Vida' });
    await expect(card).toContainText('NOTA: —');
    await expect(card).toContainText('fora do período letivo');

    // Card de resumo também mostra que está fora do período letivo, sem
    // bimestre nenhum pra indicar.
    const resumo = page.locator('#perfilResumo');
    await expect(resumo).toContainText('Fora do Período Letivo');
  });

  test('mostra o bimestre atual (hoje entre início e fim cadastrados) no card de resumo', async ({ page }) => {
    const hoje = new Date().toISOString().slice(0, 10);
    await stubSupabaseFake(page, {
      bimestre_dates: [
        // 1º já passou, 2º é "hoje" — cobre o dia todo (00:00 a 23:59, mesma
        // data em início e fim já basta pro filtro >= inicio && <= fim).
        { turma: 'jogos', bimestre: 1, inicio: '2000-01-01', fim: '2000-01-31' },
        { turma: 'jogos', bimestre: 2, inicio: hoje, fim: hoje },
      ],
    });
    await page.goto(ALUNO_URL);
    await openPerfil(page);

    const resumo = page.locator('#perfilResumo');
    await expect(resumo).toContainText('2º');
    await expect(resumo).toContainText('Bimestre Atual');
    await expect(resumo).not.toContainText('Fora do Período Letivo');
  });

  test('a matéria "Prova" não mostra campo de NOTA (ela já É a nota Prova)', async ({ page }) => {
    await stubSupabaseFake(page, {
      bimestre_dates: [{ turma: 'jogos', bimestre: 1, inicio: '2000-01-01', fim: '2999-12-31', notas_liberadas: true }],
    });
    await page.goto(ALUNO_URL);
    await openPerfil(page);

    const card = page.locator('.perfil-materia-card', { hasText: 'Prova' });
    await expect(card).not.toContainText('NOTA:');
  });
});

// "Mostrar Notas" (Gestão → Bloqueios e Liberações): o aluno só vê a
// NOTA/selo de cada matéria depois que o professor libera isso pra ESTE
// bimestre (bimestre_dates.notas_liberadas) — evita mostrar nota baixa de
// um bimestre ainda em andamento, com lançamento incompleto.
test.describe('Aba Perfil — "Mostrar Notas" (liberação por bimestre)', () => {
  const SEED_100PCT = {
    bimestre_dates: [{ turma: 'jogos', bimestre: 1, inicio: '2000-01-01', fim: '2999-12-31', notas_liberadas: false }],
    trilha_bimestre: [
      { turma: 'jogos', trilha_key: 'vida-autoconhecimento', bimestre: 1 },
      { turma: 'jogos', trilha_key: 'prova-diagnostica', bimestre: 1 },
      { turma: 'jogos', trilha_key: 'prova-final', bimestre: 1 },
    ],
    student_module_progress: [
      { student_email: 'breno.silva80', turma: 'jogos', trilha_key: 'vida-autoconhecimento', module_key: 'teoria', progress_current: 1, progress_total: 1, completed: true },
      { student_email: 'breno.silva80', turma: 'jogos', trilha_key: 'vida-autoconhecimento', module_key: 'pratica', progress_current: 5, progress_total: 5, completed: true },
    ],
    student_activity_state: [
      { student_email: 'breno.silva80', progress_key: 'prova_jogos', state: { completed: true, correctCount: 20, total: 20, nota: 100 } },
      { student_email: 'breno.silva80', progress_key: 'prova_final_jogos', state: { completed: true, correctCount: 20, total: 20, nota: 100 } },
    ],
  };

  test('bimestre ainda não liberado: esconde a NOTA e o selo, mesmo com tudo 100%', async ({ page }) => {
    await stubSupabaseFake(page, SEED_100PCT);
    await page.goto(ALUNO_URL);
    await openPerfil(page);

    const card = page.locator('.perfil-materia-card', { hasText: 'Projeto de Vida' });
    await expect(card).toContainText('NOTA: —');
    await expect(card).toContainText('o professor ainda não liberou as notas');
    await expect(card).not.toContainText('10.00'); // seria a nota real (100% + Prova 10 + Nota3 10)
    await expect(card.locator('.perfil-nota-status')).toHaveCount(0);
  });

  test('bimestre liberado: mostra a NOTA normal, com selo', async ({ page }) => {
    await stubSupabaseFake(page, {
      ...SEED_100PCT,
      bimestre_dates: [{ ...SEED_100PCT.bimestre_dates[0], notas_liberadas: true }],
    });
    await page.goto(ALUNO_URL);
    await openPerfil(page);

    const card = page.locator('.perfil-materia-card', { hasText: 'Projeto de Vida' });
    await expect(card).toContainText('10.00');
    await expect(card).not.toContainText('não liberou');
    await expect(card.locator('.perfil-nota-status')).toHaveText('Aprovado');
  });

  test('professor libera em outra aba: o aluno com o Perfil já aberto vê a NOTA aparecer sem recarregar (Realtime)', async ({ page }) => {
    await stubSupabaseFake(page, SEED_100PCT);
    await page.goto(ALUNO_URL);
    await openPerfil(page);

    const card = page.locator('.perfil-materia-card', { hasText: 'Projeto de Vida' });
    await expect(card).toContainText('NOTA: —');

    await page.evaluate(() => {
      const row = window.__FAKE_DB__.bimestre_dates.find(b => b.turma === 'jogos' && b.bimestre === 1);
      row.notas_liberadas = true;
      window.__fireFakeRealtime('bimestre_dates');
    });

    await expect(card).toContainText('10.00');
    await expect(card.locator('.perfil-nota-status')).toHaveText('Aprovado');
  });
});
