// @ts-check
// Dois recursos do QuizRush (games/quizrush.html + shared/quizrush-engine.js):
//
// 1) "Pegar pontos" (opcional, checkbox na criação — quizrush_sessions.
//    allow_steal): só quem ACERTA a pergunta ganha, na revelação, a escolha
//    entre pegar pontos de um colega ou ficar com um bônus pra si. O valor
//    interno gravado em quizrush_powers.action continua 'roubar' (nunca
//    aparece pro aluno) — só o texto na tela virou "pegar". A VÍTIMA recebe
//    um aviso privado (mesmo banner de sair da tela, ver checkForNewSteals
//    em games/quizrush.html) assim que alguém pega pontos dela, e o pódio
//    final mostra quanto cada aluno pegou de colegas no total (campo
//    `stolen` de leaderboardFrom, shared/quizrush-engine.js). Não existe
//    mais um ranking ao vivo na tela de revelação (era possível "planejar"
//    pegar de quem estava no topo só de olhar) — o placar só aparece de
//    novo no pódio, no fim da partida.
// 2) Sair da tela durante uma pergunta ao vivo (sempre ativo, não é
//    opcional): perde pontos na hora, mas continua logado/jogando — recebe
//    um aviso PRIVADO (só ele vê) na própria tela.
//
// sql/supabase-setup-completo.sql (schema real). Aqui o fake client simula
// as duas tabelas novas (quizrush_powers/quizrush_penalties) via .insert()
// com conflito de chave primária — ver tests/fixtures/fake-supabase-client.js.
const { test, expect } = require('@playwright/test');
const { stubSupabaseFake } = require('./helpers');

const HOST_URL = '/games/quizrush.html?user=admin&role=professor&name=Professor&turma=jogos';
const ALUNO_URL = '/games/quizrush.html?user=breno.silva80&role=aluno&name=Breno%20Silva&turma=jogos';
const OUTRO_URL = '/games/quizrush.html?user=edward.guzman&role=aluno&name=Edward%20Guzman&turma=jogos';

const baseQuestion = { prompt: 'Quanto é 2 + 2?', options: ['3', '4', '5', '6'], correctIndex: 1 };
function session(extra = {}) {
  return {
    id: 'sess1', turma: 'jogos', created_by: 'admin', trilha_label: 'C#', module_title: 'Básico',
    questions: [baseQuestion, { prompt: 'Quanto é 3 + 3?', options: ['5', '6', '7', '8'], correctIndex: 1 }],
    current_index: 0, status: 'question', question_duration_ms: 20000, question_started_at: new Date().toISOString(),
    allow_steal: true, ...extra,
  };
}
const players2 = [
  { session_id: 'sess1', student_email: 'breno.silva80', student_name: 'Breno Silva' },
  { session_id: 'sess1', student_email: 'edward.guzman', student_name: 'Edward Guzman' },
];

test.describe('Criar QuizRush — opção "pegar pontos"', () => {
  test('checkbox desmarcada por padrão nos dois modos, e vai pra quizrush_sessions.allow_steal', async ({ page }) => {
    await stubSupabaseFake(page, {});
    await page.goto(HOST_URL);
    await expect(page.locator('#chkAllowSteal')).not.toBeChecked();

    await page.selectOption('#selModule', { label: 'Teoria — Multimídia e Versionamento' });
    await page.click('#btnFetchQuestions');
    await page.check('#chkAllowSteal');
    await page.click('#btnCreateSession');

    const sessions = await page.evaluate(() => window.__FAKE_DB__.quizrush_sessions);
    expect(sessions[0].allow_steal).toBe(true);
  });

  test('sem marcar a opção, allow_steal fica false', async ({ page }) => {
    await stubSupabaseFake(page, {});
    await page.goto(HOST_URL);
    await page.selectOption('#selModule', { label: 'Teoria — Multimídia e Versionamento' });
    await page.click('#btnFetchQuestions');
    await page.click('#btnCreateSession');
    const sessions = await page.evaluate(() => window.__FAKE_DB__.quizrush_sessions);
    expect(sessions[0].allow_steal).toBe(false);
  });

  test('Quizz Prático (código) também tem a opção, com o próprio checkbox', async ({ page }) => {
    await stubSupabaseFake(page, {});
    await page.goto(HOST_URL);
    await page.click('#tabModeCode');
    await expect(page.locator('#chkAllowStealCode')).not.toBeChecked();
    await page.check('#chkAllowStealCode');
    await page.click('#btnCreateCodeSession');
    const sessions = await page.evaluate(() => window.__FAKE_DB__.quizrush_sessions);
    expect(sessions[0].allow_steal).toBe(true);
  });
});

test.describe('Pegar pontos — revelação (allow_steal ativado)', () => {
  test('quem ACERTA vê a escolha: bônus ou pegar de um colega', async ({ page }) => {
    await stubSupabaseFake(page, {
      quizrush_sessions: [session({ status: 'reveal' })], quizrush_players: players2,
      quizrush_answers: [
        { session_id: 'sess1', student_email: 'breno.silva80', student_name: 'Breno Silva', question_index: 0, choice_index: 1, is_correct: true, score: 900 },
        { session_id: 'sess1', student_email: 'edward.guzman', student_name: 'Edward Guzman', question_index: 0, choice_index: 1, is_correct: true, score: 700 },
      ],
    });
    await page.goto(ALUNO_URL);
    const box = page.locator('#revealPowerBox');
    await expect(box).toBeVisible();
    await expect(box).toContainText('Você acertou! Escolha um poder');
    await expect(box.locator('#btnPowerBonus')).toContainText('+300');
    await expect(box.locator('[data-steal-email="edward.guzman"]')).toContainText('Pegar 300');
  });

  test('quem ERRA não vê a escolha (só a mensagem de que precisa acertar)', async ({ page }) => {
    await stubSupabaseFake(page, {
      quizrush_sessions: [session({ status: 'reveal' })], quizrush_players: players2,
      quizrush_answers: [
        { session_id: 'sess1', student_email: 'breno.silva80', student_name: 'Breno Silva', question_index: 0, choice_index: 0, is_correct: false, score: 0 },
      ],
    });
    await page.goto(ALUNO_URL);
    const box = page.locator('#revealPowerBox');
    await expect(box).toBeVisible();
    await expect(box).not.toContainText('Escolha um poder');
    await expect(box.locator('#btnPowerBonus')).toHaveCount(0);
  });

  test('sem allow_steal, a caixa de poder nem aparece (comportamento de sempre)', async ({ page }) => {
    await stubSupabaseFake(page, {
      quizrush_sessions: [session({ status: 'reveal', allow_steal: false })], quizrush_players: players2,
      quizrush_answers: [{ session_id: 'sess1', student_email: 'breno.silva80', student_name: 'Breno Silva', question_index: 0, choice_index: 1, is_correct: true, score: 900 }],
    });
    await page.goto(ALUNO_URL);
    await expect(page.locator('#revealPowerBox')).toBeHidden();
  });

  test('escolher "ficar com bônus" soma +300 no próprio placar e trava a escolha', async ({ page }) => {
    await stubSupabaseFake(page, {
      quizrush_sessions: [session({ status: 'reveal' })], quizrush_players: players2,
      quizrush_answers: [
        { session_id: 'sess1', student_email: 'breno.silva80', student_name: 'Breno Silva', question_index: 0, choice_index: 1, is_correct: true, score: 900 },
      ],
    });
    await page.goto(ALUNO_URL);
    await page.click('#btnPowerBonus');

    await expect(page.locator('#revealPowerBox')).toContainText('Você ficou com +300 pontos de bônus!');
    const board = await page.evaluate(() => currentLeaderboard());
    expect(board.find(r => r.email === 'breno.silva80')).toMatchObject({ score: 1200 }); // 900 + 300

    const powers = await page.evaluate(() => window.__FAKE_DB__.quizrush_powers);
    expect(powers).toHaveLength(1);
    expect(powers[0]).toMatchObject({ student_email: 'breno.silva80', action: 'bonus', amount: 300, target_email: null });
  });

  test('escolher "pegar" tira 300 do alvo e soma no próprio placar', async ({ page }) => {
    await stubSupabaseFake(page, {
      quizrush_sessions: [session({ status: 'reveal' })], quizrush_players: players2,
      quizrush_answers: [
        { session_id: 'sess1', student_email: 'breno.silva80', student_name: 'Breno Silva', question_index: 0, choice_index: 1, is_correct: true, score: 500 },
        { session_id: 'sess1', student_email: 'edward.guzman', student_name: 'Edward Guzman', question_index: 0, choice_index: 1, is_correct: true, score: 700 },
      ],
    });
    await page.goto(ALUNO_URL);
    await page.locator('[data-steal-email="edward.guzman"]').click();

    await expect(page.locator('#revealPowerBox')).toContainText('Você pegou 300 pontos de Edward Guzman!');
    const board = await page.evaluate(() => currentLeaderboard());
    expect(board.find(r => r.email === 'breno.silva80')).toMatchObject({ score: 800 }); // 500 + 300
    expect(board.find(r => r.email === 'edward.guzman')).toMatchObject({ score: 400 }); // 700 - 300

    const powers = await page.evaluate(() => window.__FAKE_DB__.quizrush_powers);
    expect(powers[0]).toMatchObject({ action: 'roubar', target_email: 'edward.guzman', amount: 300 });
  });

  test('pegar de alguém com menos de 300 pontos pega só o que a pessoa tem (nunca fica negativo)', async ({ page }) => {
    await stubSupabaseFake(page, {
      quizrush_sessions: [session({ status: 'reveal' })], quizrush_players: players2,
      quizrush_answers: [
        { session_id: 'sess1', student_email: 'breno.silva80', student_name: 'Breno Silva', question_index: 0, choice_index: 1, is_correct: true, score: 900 },
        { session_id: 'sess1', student_email: 'edward.guzman', student_name: 'Edward Guzman', question_index: 0, choice_index: 1, is_correct: true, score: 120 },
      ],
    });
    await page.goto(ALUNO_URL);
    await expect(page.locator('[data-steal-email="edward.guzman"]')).toContainText('Pegar 120');
    await page.locator('[data-steal-email="edward.guzman"]').click();

    await expect(page.locator('#revealPowerBox')).toContainText('Você pegou 120 pontos de Edward Guzman!');
    const board = await page.evaluate(() => currentLeaderboard());
    expect(board.find(r => r.email === 'edward.guzman')).toMatchObject({ score: 0 });
  });

  test('quem já usou o poder nesta pergunta não pode usar de novo', async ({ page }) => {
    await stubSupabaseFake(page, {
      quizrush_sessions: [session({ status: 'reveal' })], quizrush_players: players2,
      quizrush_answers: [{ session_id: 'sess1', student_email: 'breno.silva80', student_name: 'Breno Silva', question_index: 0, choice_index: 1, is_correct: true, score: 900 }],
      quizrush_powers: [{ session_id: 'sess1', question_index: 0, student_email: 'breno.silva80', student_name: 'Breno Silva', action: 'bonus', amount: 300 }],
    });
    await page.goto(ALUNO_URL);
    await expect(page.locator('#revealPowerBox')).toContainText('Você ficou com +300 pontos de bônus!');
    await expect(page.locator('#btnPowerBonus')).toHaveCount(0);
  });

  test('o log de "pegou"/bônus aparece pra todo mundo, inclusive o professor', async ({ page }) => {
    await stubSupabaseFake(page, {
      quizrush_sessions: [session({ status: 'reveal' })], quizrush_players: players2,
      quizrush_answers: [{ session_id: 'sess1', student_email: 'edward.guzman', student_name: 'Edward Guzman', question_index: 0, choice_index: 1, is_correct: true, score: 900 }],
      quizrush_powers: [{ session_id: 'sess1', question_index: 0, student_email: 'edward.guzman', student_name: 'Edward Guzman', action: 'roubar', target_email: 'breno.silva80', target_name: 'Breno Silva', amount: 250 }],
    });
    await page.goto(HOST_URL);
    await expect(page.locator('#revealPowerBox')).toContainText('Edward Guzman');
    await expect(page.locator('#revealPowerBox')).toContainText('pegou');
    await expect(page.locator('#revealPowerBox')).toContainText('250');
    await expect(page.locator('#revealPowerBox')).toContainText('Breno Silva');
  });

  test('poderes usados também valem no pódio final', async ({ page }) => {
    await stubSupabaseFake(page, {
      quizrush_sessions: [session({ status: 'podium' })], quizrush_players: players2,
      quizrush_answers: [{ session_id: 'sess1', student_email: 'breno.silva80', student_name: 'Breno Silva', question_index: 0, choice_index: 1, is_correct: true, score: 900 }],
      quizrush_powers: [{ session_id: 'sess1', question_index: 0, student_email: 'breno.silva80', student_name: 'Breno Silva', action: 'bonus', amount: 300 }],
    });
    await page.goto(HOST_URL);
    await expect(page.locator('#podiumFullList')).toContainText('1200 pts');
  });

  test('a vítima recebe um aviso privado assim que um colega pega pontos dela', async ({ page }) => {
    await stubSupabaseFake(page, {
      quizrush_sessions: [session({ status: 'reveal' })], quizrush_players: players2,
      quizrush_answers: [
        { session_id: 'sess1', student_email: 'breno.silva80', student_name: 'Breno Silva', question_index: 0, choice_index: 0, is_correct: false, score: 0 },
        { session_id: 'sess1', student_email: 'edward.guzman', student_name: 'Edward Guzman', question_index: 0, choice_index: 1, is_correct: true, score: 900 },
      ],
    });
    await page.goto(ALUNO_URL); // breno.silva80 (a vítima) já está na tela de revelação
    await expect(page.locator('#leaveBanner')).toHaveCount(0);

    // Edward usa "pegar" contra o Breno, chegando via Realtime.
    await page.evaluate(() => {
      window.__FAKE_DB__.quizrush_powers.push({
        session_id: 'sess1', question_index: 0, student_email: 'edward.guzman', student_name: 'Edward Guzman',
        action: 'roubar', target_email: 'breno.silva80', target_name: 'Breno Silva', amount: 300,
      });
      window.__fireFakeRealtime('quizrush_powers');
    });

    await expect(page.locator('#leaveBanner')).toBeVisible();
    await expect(page.locator('#leaveBanner')).toContainText('Edward Guzman');
    await expect(page.locator('#leaveBanner')).toContainText('300');
  });

  test('quem entra numa revelação onde já foi roubado ANTES não recebe aviso retroativo', async ({ page }) => {
    await stubSupabaseFake(page, {
      quizrush_sessions: [session({ status: 'reveal' })], quizrush_players: players2,
      quizrush_answers: [{ session_id: 'sess1', student_email: 'breno.silva80', student_name: 'Breno Silva', question_index: 0, choice_index: 0, is_correct: false, score: 0 }],
      quizrush_powers: [{ session_id: 'sess1', question_index: 0, student_email: 'edward.guzman', student_name: 'Edward Guzman', action: 'roubar', target_email: 'breno.silva80', target_name: 'Breno Silva', amount: 300 }],
    });
    await page.goto(ALUNO_URL);
    await page.waitForTimeout(300);
    await expect(page.locator('#leaveBanner')).toHaveCount(0);
  });

  test('pódio mostra quantos pontos cada aluno pegou de colegas na partida', async ({ page }) => {
    await stubSupabaseFake(page, {
      quizrush_sessions: [session({ status: 'podium' })], quizrush_players: players2,
      quizrush_answers: [
        { session_id: 'sess1', student_email: 'breno.silva80', student_name: 'Breno Silva', question_index: 0, choice_index: 1, is_correct: true, score: 500 },
        { session_id: 'sess1', student_email: 'edward.guzman', student_name: 'Edward Guzman', question_index: 0, choice_index: 1, is_correct: true, score: 700 },
        { session_id: 'sess1', student_email: 'breno.silva80', student_name: 'Breno Silva', question_index: 1, choice_index: 1, is_correct: true, score: 600 },
      ],
      quizrush_powers: [
        { session_id: 'sess1', question_index: 0, student_email: 'breno.silva80', student_name: 'Breno Silva', action: 'roubar', target_email: 'edward.guzman', target_name: 'Edward Guzman', amount: 300 },
        { session_id: 'sess1', question_index: 1, student_email: 'breno.silva80', student_name: 'Breno Silva', action: 'roubar', target_email: 'edward.guzman', target_name: 'Edward Guzman', amount: 100 },
      ],
    });
    // Visão da própria Breno Silva: soma os 2 roubos (300 + 100 = 400).
    await page.goto(ALUNO_URL);
    await expect(page.locator('#podiumFullList li').filter({ hasText: 'Breno Silva' })).toContainText('400 pegos de colegas');
    await expect(page.locator('#podiumFullList li').filter({ hasText: 'Edward Guzman' })).not.toContainText('pegos de colegas');
    await expect(page.locator('#podiumPersonalText')).toContainText('Você pegou');
    await expect(page.locator('#podiumPersonalText')).toContainText('400 pontos');
  });
});

test.describe('Sair da tela durante uma pergunta — perde pontos (sempre ativo)', () => {
  test('trocar de aba durante uma pergunta ao vivo perde 1000 pontos e mostra aviso privado', async ({ page }) => {
    await stubSupabaseFake(page, { quizrush_sessions: [session({ allow_steal: false })], quizrush_players: players2 });
    await page.goto(ALUNO_URL);
    await expect(page.locator('#scrQuestion')).toBeVisible();

    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await expect(page.locator('#leaveBanner')).toBeVisible();
    await expect(page.locator('#leaveBanner')).toContainText('perdeu 1000 pontos');

    const penalties = await page.evaluate(() => window.__FAKE_DB__.quizrush_penalties);
    expect(penalties).toHaveLength(1);
    expect(penalties[0]).toMatchObject({ student_email: 'breno.silva80', question_index: 0, amount: 1000 });
  });

  test('a penalidade é DESCONTADA do placar por baixo dos panos, mas o aviso só aparece pra quem saiu', async ({ page }) => {
    await stubSupabaseFake(page, {
      quizrush_sessions: [session({ status: 'reveal', allow_steal: false })], quizrush_players: players2,
      quizrush_answers: [{ session_id: 'sess1', student_email: 'breno.silva80', student_name: 'Breno Silva', question_index: 0, choice_index: 1, is_correct: true, score: 900 }],
      quizrush_penalties: [{ session_id: 'sess1', question_index: 0, student_email: 'breno.silva80', student_name: 'Breno Silva', amount: 1000 }],
    });
    // Ninguém saiu de verdade nesta passagem — só confere que o placar reflete a penalidade já registrada.
    await page.goto(HOST_URL);
    const board = await page.evaluate(() => currentLeaderboard());
    expect(board.find(r => r.email === 'breno.silva80')).toMatchObject({ score: 0 }); // 900 - 1000, nunca negativo
    await expect(page.locator('#leaveBanner')).toHaveCount(0); // o professor nunca vê o aviso de ninguém
  });

  test('sair de novo NA MESMA pergunta não penaliza duas vezes', async ({ page }) => {
    await stubSupabaseFake(page, { quizrush_sessions: [session({ allow_steal: false })], quizrush_players: players2 });
    await page.goto(ALUNO_URL);

    const trigger = () => page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await trigger();
    await expect(page.locator('#leaveBanner')).toBeVisible();
    await trigger();
    await page.waitForTimeout(300);

    const penalties = await page.evaluate(() => window.__FAKE_DB__.quizrush_penalties);
    expect(penalties).toHaveLength(1);
  });

  test('voltar pra tela (ficar visível) não penaliza — só sair conta', async ({ page }) => {
    await stubSupabaseFake(page, { quizrush_sessions: [session({ allow_steal: false })], quizrush_players: players2 });
    await page.goto(ALUNO_URL);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.locator('#leaveBanner')).toHaveCount(0);
    const penalties = await page.evaluate(() => window.__FAKE_DB__.quizrush_penalties || []);
    expect(penalties).toHaveLength(0);
  });

  test('sair durante o lobby/revelação não penaliza — só durante uma pergunta ao vivo', async ({ page }) => {
    await stubSupabaseFake(page, { quizrush_sessions: [session({ status: 'lobby', allow_steal: false, question_started_at: null })], quizrush_players: players2 });
    await page.goto(ALUNO_URL);
    await expect(page.locator('#scrLobby')).toBeVisible();

    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(200);
    const penalties = await page.evaluate(() => window.__FAKE_DB__.quizrush_penalties || []);
    expect(penalties).toHaveLength(0);
  });

  test('o professor nunca é penalizado por sair da tela', async ({ page }) => {
    await stubSupabaseFake(page, { quizrush_sessions: [session({ allow_steal: false })], quizrush_players: players2 });
    await page.goto(HOST_URL);
    await expect(page.locator('#scrQuestion')).toBeVisible();

    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(200);
    const penalties = await page.evaluate(() => window.__FAKE_DB__.quizrush_penalties || []);
    expect(penalties).toHaveLength(0);
  });

  test('sair em duas perguntas diferentes penaliza as duas vezes (2000 no total)', async ({ page }) => {
    const leaveNow = () => page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Pergunta 1: sai da tela, é penalizado.
    await stubSupabaseFake(page, { quizrush_sessions: [session({ allow_steal: false })], quizrush_players: players2 });
    await page.goto(ALUNO_URL);
    await leaveNow();
    await expect(page.locator('#leaveBanner')).toBeVisible();
    let penalties = await page.evaluate(() => window.__FAKE_DB__.quizrush_penalties);
    expect(penalties).toHaveLength(1);

    // Pergunta 2 (nova carga de página, já com a penalidade da 1ª pergunta
    // semeada — o professor avançar a pergunta de verdade é coberto por
    // outros testes de condução da partida; aqui o foco é só a penalidade
    // por pergunta, não repetir por engano na mesma).
    await stubSupabaseFake(page, {
      quizrush_sessions: [session({ allow_steal: false, current_index: 1 })], quizrush_players: players2,
      quizrush_penalties: penalties,
    });
    await page.goto(ALUNO_URL);
    await expect(page.locator('#qMeta')).toContainText('Pergunta 2 de 2');
    await leaveNow();
    await expect(page.locator('#leaveBanner')).toBeVisible();

    penalties = await page.evaluate(() => window.__FAKE_DB__.quizrush_penalties);
    expect(penalties).toHaveLength(2);
    expect(penalties.reduce((sum, p) => sum + p.amount, 0)).toBe(2000);
  });
});
