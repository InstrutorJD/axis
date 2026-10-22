// Motor compartilhado dos desafios de código GDScript (aluno escreve código
// de verdade num editor, sem múltipla escolha) — mesmo padrão de
// shared/csharp-challenge-engine.js (sidebar com progressão trancada,
// editor + botão Executar, console de resultado, dica e progresso em
// localStorage), só que "rodando" GDScript de verdade não dá pra fazer no
// navegador. Em vez disso, o código do aluno passa por um TRANSPILE: só
// reconhece um subconjunto restrito de sintaxe GDScript (o que é ensinado
// nesta trilha) e converte pra JavaScript equivalente, que aí sim roda de
// verdade contra casos de teste.
//
// Diferença chave pro motor de C#: GDScript não usa `;` nem `{ }` — blocos
// são delimitados por INDENTAÇÃO (igual Python), então este transpile
// também precisa rastrear o nível de indentação de cada linha pra saber
// quando abrir/fechar um bloco (`{`/`}` na saída JS). Não é um parser
// completo de indentação — é uma pilha simples: quando uma linha vem MAIS
// indentada que a anterior, empilha esse novo nível (o bloco continua
// aberto); quando vem MENOS indentada, desempilha e fecha `}` até bater
// com um nível já visto.
//
// Sintaxe GDScript reconhecida (uma linha por vez, SEM `;` no final):
//   var nome = expressão            (também tipada: var nome: int = 5, var nome := 5)
//   var nome                        (declara sem valor inicial, começa null)
//   const NOME = expressão
//   nome = expressão                (reatribuição; também +=, -=, *=, /=, %=)
//   print(expressão)
//   if condição:
//   elif condição:
//   else:
//   for i in range(fim):            → para i de 0 até fim-1
//   for i in range(inicio, fim):
//   func Nome(param1, param2):      (também tipada: func Nome(a: int) -> int:)
//   return expressão
// Nas expressões, `and`/`or`/`not` (o jeito GDScript) viram `&&`/`||`/`!`,
// e texto pode vir entre aspas duplas ou simples.
//
// `check.type`:
//   'variable' — o código deve criar uma variável chamada check.name;
//                cada teste informa `values` (givenVars) e o `expected`.
//   'console'  — o código deve chamar print(...);
//                cada teste informa `values` (givenVars) e `expected` é a
//                lista (array), na ordem, de tudo que foi exibido.
//
// HTML esperado na página (mesmos ids do motor de C# — ver
// turmas/jogos/atividades/gdscript-desafios-pratica.html):
//   #challengeList #challengeTitle #challengeDesc #explanationText
//   #givenVarsLabel #codeInput #btnRun #btnNext #btnHint #hintBox
//   #consoleOutput #lblProgress
(function () {
  // `(?::\s*TIPO\s*)?:?=` aceita `var x = 5`, `var x: int = 5` e `var x := 5`.
  const DECL_RE = /^var\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*[A-Za-z_][A-Za-z0-9_]*\s*)?:?=\s*(.+)$/;
  const DECL_NOINIT_RE = /^var\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*[A-Za-z_][A-Za-z0-9_]*)?$/;
  const CONST_RE = /^const\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*[A-Za-z_][A-Za-z0-9_]*\s*)?:?=\s*(.+)$/;
  const ASSIGN_RE = /^([A-Za-z_][A-Za-z0-9_]*)\s*([+\-*/%]?=)\s*(.+)$/;
  const PRINT_RE = /^print\(\s*(.+)\s*\)$/;
  const FUNC_HEADER_RE = /^func\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*(?:->\s*[A-Za-z_][A-Za-z0-9_]*\s*)?:$/;
  const RETURN_RE = /^return\s+(.+)$/;
  const IF_RE = /^if\s+(.+):$/;
  const ELIF_RE = /^elif\s+(.+):$/;
  const ELSE_RE = /^else:$/;
  const FOR_RANGE2_RE = /^for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+range\(\s*([^,]+?)\s*,\s*([^,)]+?)\s*\):$/;
  const FOR_RANGE1_RE = /^for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+range\(\s*([^,)]+?)\s*\):$/;

  // Comentário GDScript começa com # (naive, não respeita # dentro de
  // string — mesma simplificação já aceita em stripComment do motor C#).
  function stripComment(line) {
    const idx = line.indexOf('#');
    return idx === -1 ? line : line.slice(0, idx);
  }

  // Mesmo alfabeto seguro do motor C# (aritmética, comparação, lógico,
  // vírgula pra argumento de função, aspas pra string) — ver isSafeExpr em
  // shared/csharp-challenge-engine.js pro raciocínio completo.
  // GDScript aceita texto entre aspas duplas ou simples.
  function isSafeExpr(expr) {
    let aspa = null;
    for (const ch of expr) {
      if (aspa) { if (ch === aspa) aspa = null; continue; }
      if (ch === '"' || ch === "'") { aspa = ch; continue; }
      if (!/[A-Za-z0-9_+\-*/%().,\s<>=!&|]/.test(ch)) return false;
    }
    return !aspa;
  }

  // Confere a expressão e troca `and`/`or`/`not` (fora de texto) pelos
  // operadores do JS. `tipo` só muda a mensagem de erro.
  function jsExpr(expr, line, tipo = 'expressão') {
    expr = expr.trim();
    if (!isSafeExpr(expr)) throw new Error(`${tipo} não reconhecida em "${line}"`);
    return expr.split(/("[^"]*"|'[^']*')/).map((parte, i) => (i % 2 ? parte : parte
      .replace(/\band\b/g, '&&')
      .replace(/\bor\b/g, '||')
      .replace(/\bnot\b\s*/g, '!')
    )).join('');
  }

  function indentOf(line) {
    return line.match(/^[ \t]*/)[0].replace(/\t/g, '    ').length;
  }

  // Converte o GDScript restrito do aluno pra JS equivalente. Lança Error
  // (com mensagem amigável) na primeira linha que não reconhecer.
  function transpile(code) {
    const jsLines = [];
    const indentStack = [0];
    const rawLines = code.replace(/\t/g, '    ').split('\n');

    for (const rawLine of rawLines) {
      const withoutComment = stripComment(rawLine);
      if (withoutComment.trim() === '') continue;

      const indent = indentOf(withoutComment);
      const line = withoutComment.trim();

      if (indent > indentStack[indentStack.length - 1]) {
        indentStack.push(indent);
      } else {
        while (indent < indentStack[indentStack.length - 1]) {
          indentStack.pop();
          jsLines.push('}');
        }
      }

      const declMatch = line.match(DECL_RE);
      if (declMatch) {
        jsLines.push(`let ${declMatch[1]} = ${jsExpr(declMatch[2], line)};`);
        continue;
      }

      const declNoInitMatch = line.match(DECL_NOINIT_RE);
      if (declNoInitMatch) {
        jsLines.push(`let ${declNoInitMatch[1]};`);
        continue;
      }

      const constMatch = line.match(CONST_RE);
      if (constMatch) {
        jsLines.push(`const ${constMatch[1]} = ${jsExpr(constMatch[2], line)};`);
        continue;
      }

      const printMatch = line.match(PRINT_RE);
      if (printMatch) {
        jsLines.push(`console.log(${jsExpr(printMatch[1], line)});`);
        continue;
      }

      const funcMatch = line.match(FUNC_HEADER_RE);
      if (funcMatch) {
        const rawParams = funcMatch[2].trim();
        // Parâmetro tipado (`numero: int`) vale — o tipo é descartado.
        const paramNames = rawParams === '' ? [] : rawParams.split(',').map(p => p.trim().replace(/\s*:\s*[A-Za-z_][A-Za-z0-9_]*$/, ''));
        for (const p of paramNames) {
          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(p)) {
            throw new Error(`parâmetro não reconhecido em "${line}"`);
          }
        }
        jsLines.push(`function ${funcMatch[1]}(${paramNames.join(', ')}) {`);
        continue;
      }

      const returnMatch = line.match(RETURN_RE);
      if (returnMatch) {
        jsLines.push(`return ${jsExpr(returnMatch[1], line)};`);
        continue;
      }

      const ifMatch = line.match(IF_RE);
      if (ifMatch) {
        jsLines.push(`if (${jsExpr(ifMatch[1], line, 'condição')}) {`);
        continue;
      }

      const elifMatch = line.match(ELIF_RE);
      if (elifMatch) {
        // Igual ao else abaixo: o `}` do bloco anterior já saiu no dedent.
        jsLines.push(`else if (${jsExpr(elifMatch[1], line, 'condição')}) {`);
        continue;
      }

      if (ELSE_RE.test(line)) {
        // O `}` do fim do bloco if já foi emitido pela lógica de
        // indentação acima (dedent de volta pro nível do `if`) — aqui só
        // falta abrir o bloco do else.
        jsLines.push('else {');
        continue;
      }

      const forRange2Match = line.match(FOR_RANGE2_RE);
      if (forRange2Match) {
        const [, varName, start, limit] = forRange2Match;
        jsLines.push(`for (let ${varName} = ${jsExpr(start, line)}; ${varName} < ${jsExpr(limit, line)}; ${varName}++) {`);
        continue;
      }

      const forRange1Match = line.match(FOR_RANGE1_RE);
      if (forRange1Match) {
        const [, varName, limit] = forRange1Match;
        jsLines.push(`for (let ${varName} = 0; ${varName} < ${jsExpr(limit, line)}; ${varName}++) {`);
        continue;
      }

      const assignMatch = line.match(ASSIGN_RE);
      if (assignMatch) {
        jsLines.push(`${assignMatch[1]} ${assignMatch[2]} ${jsExpr(assignMatch[3], line)};`);
        continue;
      }

      throw new Error(
        `não reconheci o comando "${line}" — use uma declaração de variável ` +
        `(ex: var idade = 10), print(...), if/else, for ou uma função (func Nome(...):).`
      );
    }

    while (indentStack.length > 1) {
      indentStack.pop();
      jsLines.push('}');
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
    // das atividades para o professor" (mesmo padrão do motor de C#/JS).
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

    function buildFn(challenge, jsCode) {
      if (challenge.check.type === 'console') {
        return new Function(...challenge.givenVars, 'console', jsCode);
      }
      return new Function(
        ...challenge.givenVars, 'console',
        `${jsCode}\nreturn typeof ${challenge.check.name} !== 'undefined' ? ${challenge.check.name} : undefined;`
      );
    }

    function runOneTest(challenge, t, fn) {
      try {
        if (challenge.check.type === 'console') {
          const logs = [];
          const fakeConsole = { log: (...args) => logs.push(args.length === 1 ? args[0] : args.join(' ')) };
          const paramValues = [...challenge.givenVars.map(name => t.values[name]), fakeConsole];
          fn(...paramValues);
          if (logs.length === 0) return { errorMsg: 'nada foi exibido — use print(...)' };
          return { result: logs };
        }

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

  window.PortalGdscriptChallenges = { run: run, transpile: transpile };
})();
