// Motor compartilhado dos desafios de código JavaScript (aluno escreve
// código de verdade num editor, sem múltipla escolha) — barra lateral com
// progressão trancada (resolver destrava o próximo), editor + botão
// Executar, console de resultado, dica, progresso em localStorage.
//
// Cada item de `challenges` é testado de um jeito diferente conforme
// `check.type`:
//   'variable' — o código deve criar uma variável chamada check.name;
//                cada teste informa `values` (atribuídas às givenVars) e
//                o `expected` daquela variável.
//   'console'  — o código deve chamar console.log(...) e/ou alert(...);
//                cada teste informa `values` (givenVars) e `expected` é a
//                lista (array), na ordem, de tudo que foi exibido.
//   'function' — o código deve declarar uma função chamada check.name;
//                cada teste informa `args` (passados na chamada) e o
//                `expected` é o retorno dela.
//
// HTML esperado na página (mesmos ids em qualquer arquivo que usar este
// motor — ver turmas/sistemas/atividades/js-fundamentos-basico.html):
//   #challengeList #challengeTitle #challengeDesc #explanationText
//   #givenVarsLabel #codeInput #btnRun #btnNext #btnHint #hintBox
//   #consoleOutput #lblProgress
(function () {
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

    // Bypass pro professor: ele quer ver/preparar todos os desafios sem
    // precisar resolver cada um em ordem (ver PENDENCIAS.md, "Desbloquear
    // todas as etapas das atividades para o professor"). A checagem é
    // assíncrona, então a sidebar é re-renderizada assim que ela resolver.
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

    // Descreve as entradas de um teste, adaptado ao tipo de checagem — só
    // pra deixar as linhas do console legíveis (não afeta a correção).
    function describeInputs(challenge, t) {
      if (challenge.check.type === 'function') {
        return `${challenge.check.name}(${t.args.map(a => JSON.stringify(a)).join(', ')})`;
      }
      const entries = Object.entries(t.values || {});
      if (entries.length === 0) return 'sem variáveis de entrada';
      return entries.map(([k, v]) => `${k} = ${JSON.stringify(v)}`).join(', ');
    }

    // Roda o código do aluno pro tipo de checagem do desafio e devolve
    // { result, errorMsg }. Nunca deixa uma exceção do código do aluno
    // escapar pra fora — vira errorMsg.
    function runOneTest(challenge, t) {
      try {
        if (challenge.check.type === 'console') {
          const logs = [];
          const fakeConsole = { log: (...args) => logs.push(args.length === 1 ? args[0] : args.join(' ')) };
          const fakeAlert = (msg) => logs.push(msg);
          const paramNames = [...challenge.givenVars, 'console', 'alert'];
          const paramValues = [...challenge.givenVars.map(name => t.values[name]), fakeConsole, fakeAlert];
          const fn = new Function(...paramNames, codeInput.value);
          fn(...paramValues);
          if (logs.length === 0) return { errorMsg: 'nada foi exibido — use console.log(...) ou alert(...)' };
          return { result: logs };
        }

        if (challenge.check.type === 'function') {
          const fnFactory = new Function(
            `${codeInput.value}\nreturn typeof ${challenge.check.name} === 'function' ? ${challenge.check.name} : undefined;`
          );
          const fn = fnFactory();
          if (typeof fn !== 'function') return { errorMsg: `a função '${challenge.check.name}' não foi criada` };
          return { result: fn(...t.args) };
        }

        // 'variable'
        const fnFactory = new Function(
          ...challenge.givenVars,
          `${codeInput.value}\nreturn typeof ${challenge.check.name} !== 'undefined' ? ${challenge.check.name} : undefined;`
        );
        const paramValues = challenge.givenVars.map(name => t.values[name]);
        const result = fnFactory(...paramValues);
        if (result === undefined) return { errorMsg: `a variável '${challenge.check.name}' não foi criada` };
        return { result };
      } catch (err) {
        return { errorMsg: err.message };
      }
    }

    // Array/objeto compara pelo conteúdo — com `===`, `[40, 0] === [40, 0]`
    // é sempre false e um desafio que devolve array (ex.: [novoX, novoY])
    // nunca passava, nem com o código certo.
    function deepEqual(a, b) {
      if (Array.isArray(a) && Array.isArray(b)) {
        return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
      }
      if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
        const keysA = Object.keys(a), keysB = Object.keys(b);
        return keysA.length === keysB.length && keysA.every(k => deepEqual(a[k], b[k]));
      }
      return a === b;
    }

    function testPassed(challenge, result, expected) {
      return challenge.check.type === 'console'
        ? JSON.stringify(result) === JSON.stringify(expected)
        : deepEqual(result, expected);
    }

    function runChallenge() {
      const challenge = challenges.find(c => c.id === selectedId);
      if (!challenge) return;
      clearConsole();

      let allPass = true;
      const resultLabel = challenge.check.type === 'console'
        ? 'foi exibido'
        : challenge.check.type === 'function'
          ? `${challenge.check.name}(...) retornou`
          : `${challenge.check.name} =`;

      challenge.tests.forEach((t, i) => {
        const { result, errorMsg } = runOneTest(challenge, t);
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

  window.PortalJsChallenges = { run: run };
})();
