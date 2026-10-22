// Motor compartilhado dos desafios de código C# (aluno escreve código de
// verdade num editor, sem múltipla escolha) — mesma barra lateral com
// progressão trancada, editor + botão Executar, console de resultado, dica
// e progresso em localStorage do motor JS (shared/js-challenge-engine.js),
// só que "rodando" C# de verdade não dá pra fazer no navegador (não existe
// compilador/interpretador de C# rodando em JS puro aqui). Em vez disso, o
// código do aluno passa por um TRANSPILE: só reconhece um subconjunto restrito
// de sintaxe C# (o que é ensinado nesta trilha) e converte pra JavaScript
// equivalente, que aí sim roda de verdade contra casos de teste — igual o
// motor JS. Qualquer linha que não bater com um desses formatos reconhecidos
// vira erro de sintaxe (não vira JS "passando direto"), senão o aluno
// digitando `let x = 5;` (JS, não C#) passaria no teste sem nunca ter escrito
// C# de verdade.
//
// Sintaxe C# reconhecida (uma "linha lógica" por vez — declarações e
// Console.WriteLine terminam em `;`; blocos abrem com `{` e fecham com `}`
// sozinho numa linha):
//   TIPO nome = expressão;         → int/double/float/string/bool/char/var
//   const TIPO nome = expressão;
//   TIPO nome;                      (declara sem valor inicial)
//   nome = expressão;               (reatribui uma variável já existente)
//   nome += expressão;              (também -=, *=, /=, %=)
//   nome++;  nome--;
//   Console.WriteLine(expressão);
//   if (condição) {
//   } else {
//   } else if (condição) {
//   for (int i = inicio; i OP limite; i++) {
//   static TIPO Nome(TIPO param1, TIPO param2) {   (`static` opcional)
//   return expressão;
//   }
// A chave `{` sozinha na linha de baixo (estilo que o Visual Studio usa ao
// formatar) e o `else` numa linha separada do `}` também valem: antes de
// reconhecer, juntaLinhas() cola esses pedaços na linha de cima. Expressões
// aceitam o ternário (`cond ? a : b`).
// Como C# e JS já compartilham a sintaxe de if/else, for e chaves, essas
// linhas passam quase direto pro JS (só troca `int` do cabeçalho do for por
// `let`, e a assinatura da função vira `function Nome(param1, param2) {`) —
// não tem parser recursivo aqui, é reconhecimento linha a linha; o
// aninhamento de blocos funciona sozinho porque as chaves emitidas são as
// mesmas do código do aluno, e quem interpreta de verdade é o `new
// Function` do JS lá na frente.
//
// Detalhe de fidelidade com C# de verdade: se o tipo declarado for `int`, o
// resultado da expressão é truncado (Math.trunc) — em C#, `int / int` corta
// a parte decimal (diferente de JavaScript, que sempre devolve fração). Um
// desafio que espera resultado com vírgula precisa que o aluno declare
// `double`, não `int` — isso é ensinado explicitamente na Prática de
// comparação JS vs C#.
//
// `check.type`:
//   'variable' — o código deve criar uma variável chamada check.name;
//                cada teste informa `values` (givenVars) e o `expected`.
//   'console'  — o código deve chamar Console.WriteLine(...);
//                cada teste informa `values` (givenVars) e `expected` é a
//                lista (array), na ordem, de tudo que foi exibido.
//
// HTML esperado na página (mesmos ids do motor JS — ver
// turmas/jogos/atividades/csharp-desafios-pratica.html):
//   #challengeList #challengeTitle #challengeDesc #explanationText
//   #givenVarsLabel #codeInput #btnRun #btnNext #btnHint #hintBox
//   #consoleOutput #lblProgress
(function () {
  const TYPE_KEYWORDS = ['int', 'double', 'float', 'string', 'bool', 'char', 'var'];
  const FUNC_TYPE_KEYWORDS = TYPE_KEYWORDS.filter(t => t !== 'var');
  const DECL_RE = new RegExp(`^(const\\s+)?(${TYPE_KEYWORDS.join('|')})\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*(.+);$`);
  const DECL_NOINIT_RE = new RegExp(`^(${TYPE_KEYWORDS.join('|')})\\s+([A-Za-z_][A-Za-z0-9_]*);$`);
  const ASSIGN_RE = /^([A-Za-z_][A-Za-z0-9_]*)\s*([+\-*/%]?=)\s*(.+);$/;
  const INCDEC_RE = /^([A-Za-z_][A-Za-z0-9_]*)\s*(\+\+|--);$/;
  const WRITE_RE = /^Console\.WriteLine\(\s*(.+)\s*\);$/;
  const FUNC_HEADER_RE = new RegExp(`^(?:static\\s+)?(${FUNC_TYPE_KEYWORDS.join('|')})\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*\\(([^)]*)\\)\\s*\\{$`);
  const PARAM_RE = new RegExp(`^(${FUNC_TYPE_KEYWORDS.join('|')})\\s+([A-Za-z_][A-Za-z0-9_]*)$`);
  const RETURN_RE = /^return\s+(.+);$/;
  const IF_RE = /^if\s*\((.+)\)\s*\{$/;
  const ELSE_RE = /^\}\s*else\s*\{$/;
  const ELSE_IF_RE = /^\}\s*else\s+if\s*\((.+)\)\s*\{$/;
  const FOR_RE = /^for\s*\(int\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^;]+);\s*\1\s*(<=|>=|<|>)\s*([^;]+);\s*\1\+\+\)\s*\{$/;
  const CLOSE_RE = /^\}$/;

  function stripComment(line) {
    const idx = line.indexOf('//');
    return idx === -1 ? line : line.slice(0, idx);
  }

  // Letras/números/identificadores, operadores aritméticos e de comparação/
  // lógicos, parênteses, vírgula (argumentos de função), ponto (decimal) e
  // aspas duplas (abre/fecha string) FORA de string — barra qualquer coisa
  // que não seja uma expressão/condição simples (`;` escondido, acesso a
  // propriedade além de Console.WriteLine já tratado à parte etc). DENTRO de
  // uma string literal, qualquer caractere vale (acento, pontuação,
  // vírgula...) — é conteúdo do aluno pra exibir, não código; só a aspa que
  // fecha a string continua sendo especial.
  function isSafeExpr(expr) {
    let inString = false;
    for (const ch of expr) {
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (!/[A-Za-z0-9_+\-*/%().,\s<>=!&|?:]/.test(ch)) return false;
    }
    return !inString;
  }

  // Cola na linha de cima a `{` que veio sozinha na linha de baixo e o
  // `else` que veio numa linha separada do `}` — assim o reconhecimento
  // linha a linha só precisa conhecer o formato "if (...) {" / "} else {".
  function juntaLinhas(code) {
    const linhas = [];
    for (const rawLine of code.split('\n')) {
      const line = stripComment(rawLine).trim();
      if (line === '') continue;
      const anterior = linhas.length - 1;
      if (line === '{' && anterior >= 0) {
        linhas[anterior] += ' {';
      } else if (/^else\b/.test(line) && anterior >= 0 && linhas[anterior] === '}') {
        linhas[anterior] = '} ' + line;
      } else {
        linhas.push(line);
      }
    }
    return linhas;
  }

  // Converte o C# restrito do aluno pra JS equivalente. Lança Error (com
  // mensagem amigável) na primeira linha que não reconhecer. Reconhecimento
  // é linha a linha (ver comentário no topo do arquivo) — blocos (if/else,
  // for, função) só precisam que CADA linha bata com um padrão conhecido;
  // quem garante que as chaves abrem/fecham direito é o `new Function` do
  // JS que roda o resultado depois, não este transpile.
  function transpile(code) {
    const jsLines = [];

    for (const line of juntaLinhas(code)) {
      const declMatch = line.match(DECL_RE);
      if (declMatch) {
        const isConst = !!declMatch[1];
        const type = declMatch[2];
        const name = declMatch[3];
        const expr = declMatch[4].trim();
        if (!isSafeExpr(expr)) {
          throw new Error(`expressão não reconhecida em "${line}"`);
        }
        const value = type === 'int' ? `Math.trunc(${expr})` : expr;
        jsLines.push(`${isConst ? 'const' : 'let'} ${name} = ${value};`);
        continue;
      }

      const declNoInitMatch = line.match(DECL_NOINIT_RE);
      if (declNoInitMatch) {
        jsLines.push(`let ${declNoInitMatch[2]};`);
        continue;
      }

      const writeMatch = line.match(WRITE_RE);
      if (writeMatch) {
        const expr = writeMatch[1].trim();
        if (!isSafeExpr(expr)) {
          throw new Error(`expressão não reconhecida em "${line}"`);
        }
        jsLines.push(`console.log(${expr});`);
        continue;
      }

      const funcMatch = line.match(FUNC_HEADER_RE);
      if (funcMatch) {
        const name = funcMatch[2];
        const rawParams = funcMatch[3].trim();
        const paramNames = [];
        if (rawParams !== '') {
          for (const p of rawParams.split(',')) {
            const paramMatch = p.trim().match(PARAM_RE);
            if (!paramMatch) {
              throw new Error(`parâmetro não reconhecido em "${line}"`);
            }
            paramNames.push(paramMatch[2]);
          }
        }
        jsLines.push(`function ${name}(${paramNames.join(', ')}) {`);
        continue;
      }

      const returnMatch = line.match(RETURN_RE);
      if (returnMatch) {
        const expr = returnMatch[1].trim();
        if (!isSafeExpr(expr)) {
          throw new Error(`expressão não reconhecida em "${line}"`);
        }
        jsLines.push(`return ${expr};`);
        continue;
      }

      const ifMatch = line.match(IF_RE);
      if (ifMatch) {
        const cond = ifMatch[1].trim();
        if (!isSafeExpr(cond)) {
          throw new Error(`condição não reconhecida em "${line}"`);
        }
        jsLines.push(`if (${cond}) {`);
        continue;
      }

      if (ELSE_RE.test(line)) {
        jsLines.push('} else {');
        continue;
      }

      const elseIfMatch = line.match(ELSE_IF_RE);
      if (elseIfMatch) {
        const cond = elseIfMatch[1].trim();
        if (!isSafeExpr(cond)) {
          throw new Error(`condição não reconhecida em "${line}"`);
        }
        jsLines.push(`} else if (${cond}) {`);
        continue;
      }

      const forMatch = line.match(FOR_RE);
      if (forMatch) {
        const varName = forMatch[1];
        const start = forMatch[2].trim();
        const op = forMatch[3];
        const limit = forMatch[4].trim();
        if (!isSafeExpr(start) || !isSafeExpr(limit)) {
          throw new Error(`expressão não reconhecida em "${line}"`);
        }
        jsLines.push(`for (let ${varName} = ${start}; ${varName} ${op} ${limit}; ${varName}++) {`);
        continue;
      }

      if (CLOSE_RE.test(line)) {
        jsLines.push('}');
        continue;
      }

      const assignMatch = line.match(ASSIGN_RE);
      if (assignMatch) {
        const name = assignMatch[1];
        const op = assignMatch[2];
        const expr = assignMatch[3].trim();
        if (!isSafeExpr(expr)) {
          throw new Error(`expressão não reconhecida em "${line}"`);
        }
        jsLines.push(`${name} ${op} ${expr};`);
        continue;
      }

      const incDecMatch = line.match(INCDEC_RE);
      if (incDecMatch) {
        jsLines.push(`${incDecMatch[1]}${incDecMatch[2]};`);
        continue;
      }

      throw new Error(
        `não reconheci o comando "${line}" — use uma declaração de variável ` +
        `(ex: int idade = 10;), Console.WriteLine(...), if/else, for ou uma ` +
        `função (static TIPO Nome(...) { ... });`
      );
    }

    return jsLines.join('\n');
  }

  function run(config) {
    const { activityLocation, challenges, reportLabel } = config;

    const username = new URLSearchParams(window.location.search).get('user') || 'anon';
    const PROGRESS_KEY = `${activityLocation}_progress_${username}`;

    const challengeListEl = document.getElementById('challengeList');
    const challengeTitleEl = document.getElementById('challengeTitle');
    const challengeDescEl = document.getElementById('challengeDesc');
    const explanationTextEl = document.getElementById('explanationText');
    const givenVarsLabelEl = document.getElementById('givenVarsLabel');
    const codeInput = document.getElementById('codeInput');
    const btnRun = document.getElementById('btnRun');
    const btnNext = document.getElementById('btnNext');
    const btnHint = document.getElementById('btnHint');
    const hintBox = document.getElementById('hintBox');
    const consoleOutput = document.getElementById('consoleOutput');
    const lblProgress = document.getElementById('lblProgress');

    function getCompleted() {
      try {
        return new Set(JSON.parse(localStorage.getItem(PROGRESS_KEY) || '[]'));
      } catch (e) {
        return new Set();
      }
    }

    function saveCompleted(set) {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify([...set]));
    }

    let completed = getCompleted();
    let selectedId = challenges.find(c => !completed.has(c.id))?.id || challenges[0].id;

    // Bypass pro professor: ver PENDENCIAS.md, "Desbloquear todas as etapas
    // das atividades para o professor" (mesmo padrão do motor JS).
    let isProfessor = false;
    (async function () {
      const user = window.PortalSession ? await window.PortalSession.getUser() : null;
      isProfessor = !!(user && user.role === 'professor');
      if (isProfessor) renderSidebar();
    })();

    function isUnlocked(challenge) {
      if (isProfessor) return true;
      const idx = challenges.findIndex(c => c.id === challenge.id);
      if (idx === 0) return true;
      return completed.has(challenges[idx - 1].id);
    }

    function renderSidebar() {
      challengeListEl.innerHTML = '';
      challenges.forEach(c => {
        const unlocked = isUnlocked(c);
        const isDone = completed.has(c.id);
        const item = document.createElement('div');
        item.className = 'challenge-item' + (c.id === selectedId ? ' active' : '') + (isDone ? ' completed' : '') + (!unlocked ? ' locked' : '');
        const statusIcon = isDone ? '✅' : (unlocked ? '▶️' : '🔒');
        item.innerHTML = `<span class="status">${statusIcon}</span><span class="name">${c.id}. ${c.title}</span>`;
        if (unlocked) {
          item.addEventListener('click', () => selectChallenge(c.id));
        }
        challengeListEl.appendChild(item);
      });
      lblProgress.textContent = `${completed.size}/${challenges.length}`;
    }

    function selectChallenge(id) {
      const challenge = challenges.find(c => c.id === id);
      if (!challenge || !isUnlocked(challenge)) return;
      selectedId = id;

      challengeTitleEl.textContent = `Desafio ${challenge.id}: ${challenge.title}`;
      explanationTextEl.innerHTML = challenge.explanation;
      challengeDescEl.innerHTML = challenge.desc;
      codeInput.value = challenge.starter;
      btnNext.style.display = 'none';

      if (challenge.givenVars.length > 0) {
        givenVarsLabelEl.innerHTML = `Variáveis disponíveis: <b>${challenge.givenVars.join(', ')}</b>`;
        givenVarsLabelEl.style.display = 'block';
      } else {
        givenVarsLabelEl.style.display = 'none';
      }

      hintBox.innerHTML = challenge.hint || '';
      hintBox.classList.remove('show');
      btnHint.textContent = '💡 Ver dica';

      clearConsole();
      if (completed.has(id)) {
        logConsole('Você já concluiu este desafio. Pode refazer pra treinar.', 'info');
      }
      renderSidebar();

      if (typeof window.reportActivity === 'function') {
        window.reportActivity(
          activityLocation,
          `${reportLabel} — Desafio ${challenge.id}: ${challenge.title}`,
          { challengeId: challenge.id, total: challenges.length, completed: completed.size }
        );
      }
    }

    function clearConsole() {
      consoleOutput.innerHTML = '';
    }

    function logConsole(msg, type) {
      const line = document.createElement('div');
      line.className = 'line ' + (type || 'info');
      line.textContent = msg;
      consoleOutput.appendChild(line);
      consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    function describeInputs(challenge, t) {
      const entries = Object.entries(t.values || {});
      if (entries.length === 0) return 'sem variáveis de entrada';
      return entries.map(([k, v]) => `${k} = ${JSON.stringify(v)}`).join(', ');
    }

    // Constrói a função JS já transpilada pro desafio (uma vez só — os
    // vários testes do mesmo desafio reusam a mesma função, cada chamada
    // cria seu próprio escopo de `let`/`const`).
    function buildFn(challenge, jsCode) {
      if (challenge.check.type === 'console') {
        return new Function(...challenge.givenVars, 'console', jsCode);
      }
      return new Function(
        ...challenge.givenVars, 'console',
        `${jsCode}\nreturn typeof ${challenge.check.name} !== 'undefined' ? ${challenge.check.name} : undefined;`
      );
    }

    // Nunca deixa uma exceção do código do aluno escapar pra fora — vira
    // errorMsg.
    function runOneTest(challenge, t, fn) {
      try {
        if (challenge.check.type === 'console') {
          const logs = [];
          const fakeConsole = { log: (...args) => logs.push(args.length === 1 ? args[0] : args.join(' ')) };
          const paramValues = [...challenge.givenVars.map(name => t.values[name]), fakeConsole];
          fn(...paramValues);
          if (logs.length === 0) return { errorMsg: 'nada foi exibido — use Console.WriteLine(...);' };
          return { result: logs };
        }

        // 'variable'
        const fakeConsole = { log: () => {} };
        const paramValues = [...challenge.givenVars.map(name => t.values[name]), fakeConsole];
        const result = fn(...paramValues);
        if (result === undefined) return { errorMsg: `a variável '${challenge.check.name}' não foi criada` };
        return { result };
      } catch (err) {
        return { errorMsg: err.message };
      }
    }

    function testPassed(challenge, result, expected) {
      return challenge.check.type === 'console'
        ? JSON.stringify(result) === JSON.stringify(expected)
        : result === expected;
    }

    function runChallenge() {
      const challenge = challenges.find(c => c.id === selectedId);
      if (!challenge) return;
      clearConsole();

      let jsCode, fn;
      try {
        jsCode = transpile(codeInput.value);
        fn = buildFn(challenge, jsCode);
      } catch (err) {
        logConsole(`❌ ${err.message}`, 'fail');
        return;
      }

      let allPass = true;
      const resultLabel = challenge.check.type === 'console'
        ? 'foi exibido'
        : `${challenge.check.name} =`;

      challenge.tests.forEach((t, i) => {
        const { result, errorMsg } = runOneTest(challenge, t, fn);
        const pass = !errorMsg && testPassed(challenge, result, t.expected);
        if (!pass) allPass = false;

        const prefix = `[Teste ${i + 1}] ${describeInputs(challenge, t)} → `;

        if (pass) {
          logConsole(`${prefix}${resultLabel} ${JSON.stringify(result)} ✅`, 'pass');
        } else if (errorMsg) {
          logConsole(`${prefix}${errorMsg} ❌`, 'fail');
        } else {
          logConsole(`${prefix}${resultLabel} ${JSON.stringify(result)} (esperado ${JSON.stringify(t.expected)}) ❌`, 'fail');
        }
      });

      if (allPass) {
        completed.add(challenge.id);
        saveCompleted(completed);

        const isLast = challenges[challenges.length - 1].id === challenge.id;
        if (isLast) {
          logConsole('🏆 Você concluiu todos os desafios deste módulo!', 'success');
        } else {
          logConsole('✅ Desafio concluído! Próximo desafio liberado.', 'success');
          btnNext.style.display = 'inline-block';
        }
        renderSidebar();

        if (typeof window.reportActivity === 'function') {
          window.reportActivity(
            activityLocation,
            `${reportLabel} — Desafio ${challenge.id}: ${challenge.title} (concluído)`,
            { challengeId: challenge.id, total: challenges.length, completed: completed.size }
          );
        }
      } else {
        logConsole('❌ Ainda não! Ajuste o código e tente de novo.', 'warn');
      }
    }

    btnHint.addEventListener('click', () => {
      const showing = hintBox.classList.toggle('show');
      btnHint.textContent = showing ? '💡 Ocultar dica' : '💡 Ver dica';
    });

    btnRun.addEventListener('click', runChallenge);
    btnNext.addEventListener('click', () => {
      const idx = challenges.findIndex(c => c.id === selectedId);
      const next = challenges[idx + 1];
      if (next) selectChallenge(next.id);
    });

    selectChallenge(selectedId);
  }

  window.PortalCsharpChallenges = { run: run, transpile: transpile };
})();
