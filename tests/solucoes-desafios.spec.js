// @ts-check
// Rede de segurança de TODAS as práticas de código (aluno escreve código num
// editor e a página roda testes automáticos): pra cada desafio, digita a
// `solution` de referência no editor, clica em Executar e exige ✅/🏆 sem
// nenhum ❌ — usando o motor e a comparação de verdade da página.
//
// Por que existe: um desafio chegou aos alunos impossível de resolver (o
// "próximo passo na grade" de fund-jogo2d-desafios.html devolvia um array e
// o motor comparava com `===`, que nunca dá true pra dois arrays). O valor
// esperado estava certo; ninguém tinha rodado a solução contra ele.
//
// As páginas são achadas sozinhas (editor #codeInput + `const CHALLENGES`),
// então prática nova já entra aqui — e TODO desafio precisa ter `solution`
// (o teste reprova se faltar). Ficam de fora as de SQL (`solutionSql`, já
// cobertas por sql-basico.spec.js e sql-join-agregacao.spec.js) e a de
// Depuração (editor Monaco, sem #codeInput).
const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { stubSupabaseFake } = require('./helpers');

const RAIZ = path.join(__dirname, '..');

function praticasDeCodigo() {
  const paginas = [];
  for (const turma of fs.readdirSync(path.join(RAIZ, 'turmas'))) {
    const dir = path.join(RAIZ, 'turmas', turma, 'atividades');
    if (!fs.existsSync(dir)) continue;
    for (const arquivo of fs.readdirSync(dir)) {
      if (!arquivo.endsWith('.html')) continue;
      const html = fs.readFileSync(path.join(dir, arquivo), 'utf8');
      if (html.includes('id="codeInput"') && html.includes('const CHALLENGES = [') && !html.includes('solutionSql')) {
        paginas.push({ turma, arquivo });
      }
    }
  }
  return paginas;
}

const PAGINAS = praticasDeCodigo();

test('acha as práticas de código (se a busca quebrar, os testes abaixo somem calados)', () => {
  expect(PAGINAS.length).toBeGreaterThanOrEqual(19);
});

for (const { turma, arquivo } of PAGINAS) {
  test(`${turma}/${arquivo}: a solução de cada desafio passa nos testes da página`, async ({ page }) => {
    test.setTimeout(90_000);
    await stubSupabaseFake(page, {});
    await page.goto(`/turmas/${turma}/atividades/${arquivo}?user=teste.solucoes&role=aluno&name=Teste%20Solucoes&turma=${turma}`);

    // `const CHALLENGES` no topo do <script> da página é visível daqui.
    const desafios = await page.evaluate(() =>
      CHALLENGES.map(c => ({ id: c.id, title: c.title, solution: c.solution || '' }))
    );
    const semSolucao = desafios.filter(d => !d.solution).map(d => `#${d.id} ${d.title}`);
    expect(semSolucao, 'todo desafio de código precisa de `solution` (a resposta de referência)').toEqual([]);

    for (let i = 0; i < desafios.length; i++) {
      const d = desafios[i];
      const onde = `desafio #${d.id} "${d.title}"`;
      await page.fill('#codeInput', d.solution);
      await page.click('#btnRun');
      await expect(page.locator('#consoleOutput'), `${onde}: a solução não passou`).toContainText(/✅|🏆/);
      await expect(page.locator('#consoleOutput'), `${onde}: algum teste reprovou a solução`).not.toContainText('❌');
      if (i < desafios.length - 1) {
        await expect(page.locator('#btnNext'), `${onde}: o botão Próximo não apareceu`).toBeVisible();
        await page.click('#btnNext');
      }
    }
  });
}
