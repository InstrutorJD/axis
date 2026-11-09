// @ts-check
// Valida o novo módulo de SQL da turma Sistemas: o motor SQLite via
// WebAssembly (sql.js) carrega de verdade, roda consultas reais, e a
// progressão (localStorage) funciona igual aos duelos de JS.
const { test, expect } = require('@playwright/test');
const { stubSupabaseFake } = require('./helpers');

const URL = '/turmas/sistemas/atividades/sql-basico.html?user=alexandre.natal&role=aluno&name=Alexandre%20Natal&turma=sistemas';

test.describe('turmas/sistemas/atividades/sql-basico.html', () => {
  test.beforeEach(async ({ page }) => {
    await stubSupabaseFake(page, {});
  });

  test('carrega o motor SQL (WASM) e libera o botão Executar', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#btnRun')).toBeEnabled({ timeout: 15000 });
    await expect(page.locator('#codeInput')).toBeEnabled();
  });

  test('consulta certa resolve o chamado 1 e mostra os dados numa tabela', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#btnRun')).toBeEnabled({ timeout: 15000 });

    await page.fill('#codeInput', 'SELECT * FROM funcionarios;');
    await page.click('#btnRun');

    await expect(page.locator('#consoleOutput')).toContainText('Chamado resolvido');
    await expect(page.locator('#resultPanel table tbody tr')).toHaveCount(5); // 5 funcionários seedados
    await expect(page.locator('#ticketStatus')).toHaveText('RESOLVIDO');
  });

  test('consulta errada não avança e mostra erro amigável', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#btnRun')).toBeEnabled({ timeout: 15000 });

    // SQL com erro de sintaxe de propósito
    await page.fill('#codeInput', 'SELCT * FROM funcionarios;');
    await page.click('#btnRun');
    await expect(page.locator('#consoleOutput')).toContainText('Erro ao executar sua consulta');

    // SQL válido mas com resultado errado pro chamado 1 (só 1 coluna, não *)
    await page.fill('#codeInput', 'SELECT nome FROM funcionarios;');
    await page.click('#btnRun');
    await expect(page.locator('#consoleOutput')).toContainText('não bateu com o esperado');
    await expect(page.locator('#ticketStatus')).toHaveText('PENDENTE');
  });

  test('resolve os 8 chamados em sequência e conclui o módulo', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#btnRun')).toBeEnabled({ timeout: 15000 });

    const solutions = [
      'SELECT * FROM funcionarios;',
      'SELECT nome, cargo FROM funcionarios;',
      'SELECT * FROM funcionarios WHERE departamento_id = 1;',
      'SELECT nome, salario FROM funcionarios WHERE salario > 3000;',
      'SELECT nome, salario FROM funcionarios ORDER BY salario DESC;',
      "INSERT INTO funcionarios (id, nome, cargo, departamento_id, salario) VALUES (6, 'Bruno Martins', 'Suporte Júnior', 2, 2100);",
      'UPDATE funcionarios SET salario = 2600 WHERE id = 5;',
      'DELETE FROM funcionarios WHERE id = 2;',
    ];

    for (let i = 0; i < solutions.length; i++) {
      await page.fill('#codeInput', solutions[i]);
      await page.click('#btnRun');
      await expect(page.locator('#ticketStatus')).toHaveText('RESOLVIDO');
      if (i < solutions.length - 1) {
        await page.click('#btnNext');
      }
    }

    await expect(page.locator('#lblProgress')).toHaveText('8/8');
    await expect(page.locator('#consoleOutput')).toContainText('concluiu todos os chamados');

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('sql_basico_progress_alexandre.natal')));
    expect(stored.sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

test.describe('turmas/sistemas/plataforma.html — trilha SQL desbloqueia jogos', () => {
  test('completar todos os módulos das matérias com conteúdo libera a aba Jogos', async ({ page }) => {
    await stubSupabaseFake(page, {});
    await page.addInitScript(user => {
      localStorage.setItem(`sql_basico_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8]));
      localStorage.setItem(`sql_basico_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`sql_join_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5]));
      localStorage.setItem(`sql_agregacao_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5]));
      localStorage.setItem(`sql_comentarios_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`db_conexao_supabase_pratica_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`bd_nosql_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`bd_nosql_consultoria_progress_${user}`, JSON.stringify(['sessao', 'banco', 'catalogo', 'amigos', 'sensores', 'rh', 'blog', 'fraude']));
      localStorage.setItem(`bd_nosql_modelagem_progress_${user}`, JSON.stringify(['pedido', 'catalogo', 'carrinho', 'grafo']));
      localStorage.setItem(`bd_mongodb_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`bd_mongodb_pratica_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`devsis_apis_frameworks_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`devsis_apis_frameworks_pratica_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5]));
      localStorage.setItem(`devsis_requisitos_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`devsis_requisitos_pratica_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5]));
      localStorage.setItem(`modelagem_dados_requisitos_trabalho_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`modelagem_dados_requisitos_questionario_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`modelagem_roteiro_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`modelagem_roteiro_pratica_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`modelagem_revisao_rn_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`modelagem_revisao_rn_pratica_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`devsis_linguagem_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`devsis_linguagem_pratica_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5]));
      localStorage.setItem(`devsis_impasse_tecnico_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`devsis_impasse_tecnico_pratica_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`devsis_pitch_inovacao_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`devsis_pitch_inovacao_pratica_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`js_fundamentos_basico_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
      localStorage.setItem(`js_fundamentos_intermediario_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]));
      localStorage.setItem(`redes_conexao_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`redes_conexao_pratica_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5]));
      localStorage.setItem(`redes_resolucao_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`redes_resolucao_pratica_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5]));
      localStorage.setItem(`redes_servicos_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`redes_servicos_pratica_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5]));
      localStorage.setItem(`redes_armazenamento_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`redes_armazenamento_pratica_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5]));
      localStorage.setItem(`redes_modelos_referencia_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`redes_modelos_referencia_pratica_progress_${user}`, JSON.stringify(['ativos', 'unidades', 'interfaces', 'armazenamento']));
      localStorage.setItem(`redes_relatorio_armazenamento_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`redes_relatorio_armazenamento_pratica_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`iot_conectividade_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`iot_conectividade_pratica_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
      localStorage.setItem(`iot_opc_integracao_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`iot_opc_integracao_pratica_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`iot_mqtt_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`iot_mqtt_laboratorio_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`projetos_estrutura_banco_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`projetos_estrutura_banco_pratica_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`projetos_pre_textuais_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`projetos_pre_textuais_pratica_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`projeto_financapp_kickoff_trabalho_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`projeto_financapp_modelagem_trabalho_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`projeto_financapp_banco_dados_trabalho_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`redes_servicos_financapp_pratica_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`projeto_financapp_app_trabalho_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`prog_conexao_segura_trabalho_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`prova_sistemas_progress_${user}`, JSON.stringify({ completed: true, correctCount: 20, total: 20 }));
      localStorage.setItem(`prova_final_sistemas_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`projeto_app_empreendedor_trabalho_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`vida_autoconhecimento_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`vida_autoconhecimento_pratica_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5]));
      localStorage.setItem(`vida_cidadania_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`vida_cidadania_pratica_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5]));
      localStorage.setItem(`vida_emocional_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`vida_emocional_pratica_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5]));
      localStorage.setItem(`vida_equipe_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`vida_equipe_pratica_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5]));
      localStorage.setItem(`vida_foco_autocontrole_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`vida_foco_autocontrole_pratica_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`vida_cidadania_digital_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`vida_cidadania_digital_pratica_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`mundo_revolucao_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`mundo_revolucao_pratica_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
      localStorage.setItem(`mundo_inovacao_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`mundo_inovacao_pratica_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
      localStorage.setItem(`mundo_equipe_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`mundo_equipe_pratica_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
      // Aulão do DS (mundo-aulao-ds): ids das etapas de cada bloco (progressTotal 7, 6, 5, 5, 5, 5).
      localStorage.setItem(`aulao_ds_bloco1_progress_${user}`, JSON.stringify(['copiar', 'grade-equipe', 'caso-cracha', 'caso-vaga', 'copiar-2', 'caso-se-funcionou', 'caso-se-falhou']));
      localStorage.setItem(`aulao_ds_bloco2_progress_${user}`, JSON.stringify(['copiar', 'grade-contratos', 'caso-estagio', 'copiar-2', 'caso-conselho', 'caso-engenheiro']));
      localStorage.setItem(`aulao_ds_bloco3_progress_${user}`, JSON.stringify(['copiar', 'grade-tarefas', 'copiar-2', 'caso-dados', 'caso-prazo']));
      localStorage.setItem(`aulao_ds_bloco4_progress_${user}`, JSON.stringify(['copiar', 'caso-davi', 'copiar-2', 'caso-revisao', 'caso-menu']));
      localStorage.setItem(`aulao_ds_bloco5_progress_${user}`, JSON.stringify(['copiar', 'grade-trechos', 'caso-introducao', 'copiar-2', 'caso-dado-novo']));
      localStorage.setItem(`aulao_ds_bloco6_progress_${user}`, JSON.stringify(['copiar', 'grade-materiais', 'copiar-2', 'caso-citacao', 'caso-ordem']));
      localStorage.setItem(`prog_depuracao_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`prog_depuracao_pratica_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]));
      localStorage.setItem(`prog_projetos_pixelcode_progress_${user}`, JSON.stringify([1, 2, 3, 4]));
      localStorage.setItem(`clipzone_construcao_progress_${user}`, JSON.stringify({ completed: true }));
    }, 'alexandre.natal');

    await page.goto('/turmas/sistemas/plataforma.html?user=alexandre.natal&ip=192.168.2.1&saldo=1183.50&role=aluno');

    // A trilha SQL fica dentro de Banco de Dados; com as 5 trilhas da matéria completas, elas ficam empatadas
    // em status "concluída" e a ordem original do config.js prevalece — sql continua sendo a primeira mostrada.
    await page.click('.game-card:has-text("Banco de Dados")');
    await expect(page.locator('#moduleSelector_sql')).toBeVisible();
    const tabJogos = page.locator('#tabBtnJogos');
    await expect(tabJogos).not.toHaveClass(/disabled/);
    await expect(tabJogos).toContainText('🎮');
  });
});
