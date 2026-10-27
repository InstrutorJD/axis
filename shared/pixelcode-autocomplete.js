// Autocomplete do PixelCode (pixelcode.html), por cima do que o Monaco já
// faz sozinho (IntelliSense de JavaScript, tags de HTML, propriedades de CSS).
// Ele conhece o PROJETO INTEIRO, não só o arquivo aberto:
//
//   JS   getElementById("|")        → ids que existem nos .html
//        querySelector("#|" / ".|") → ids, classes e tags dos .html
//        classList.add("|")         → classes dos .html e dos .css
//        fetch("|")                 → arquivos do projeto (ex.: dados.json)
//        addEventListener("|")      → eventos, com explicação em português
//        localStorage.getItem("|")  → chaves já usadas no projeto
//        elemento.dataset.|         → atributos data-* dos .html
//        + atalhos (snippets) em português: log, for, se, evento, fetch…
//   HTML class="|" → classes dos .css · id="|" → ids que o JS procura
//        href/src="|" → arquivos do projeto (link→.css, script→.js, a→.html)
//   CSS  .| e #| no seletor → classes e ids usados nos .html e no JS
//
// Uso: PixelCodeAutocomplete.registrar(monaco, { arquivos: () => [{ nome, conteudo }] })
window.PixelCodeAutocomplete = (function () {
  const ext = nome => (String(nome).match(/\.([^.]+)$/) || [, ''])[1].toLowerCase();
  const camel = s => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

  // Lê todos os arquivos e devolve o que existe em cada um. É rápido (projetos
  // de aula são pequenos), então roda a cada pedido de sugestão: nada de cache
  // pra ficar desatualizado.
  function indexar(arquivos) {
    const ids = new Map();          // id → "<button> · index.html"
    const classes = new Map();      // classe → de onde veio
    const tags = new Set();
    const idsDoJs = new Map();      // ids que o JS/CSS procura → onde
    const chaves = new Set();       // chaves do localStorage
    const dados = new Set();        // data-* (já em camelCase)
    const add = (mapa, k, v) => { if (k && !mapa.has(k)) mapa.set(k, v); };

    for (const a of arquivos) {
      const t = a.conteudo || '';
      const e = ext(a.nome);
      if (e === 'html' || e === 'htm') {
        t.replace(/<!--[\s\S]*?-->/g, '').replace(/<([a-zA-Z][\w-]*)\b([^>]*)>/g, (m, tag, attrs) => {
          tag = tag.toLowerCase();
          tags.add(tag);
          const id = attrs.match(/\bid\s*=\s*["']([^"']+)["']/i);
          if (id) add(ids, id[1].trim(), `<${tag}> · ${a.nome}`);
          const cl = attrs.match(/\bclass\s*=\s*["']([^"']*)["']/i);
          if (cl) cl[1].split(/\s+/).forEach(c => add(classes, c, `<${tag}> · ${a.nome}`));
          attrs.replace(/\bdata-([\w-]+)/g, (_, d) => dados.add(camel(d)));
          return m;
        });
      } else if (e === 'css') {
        // Tira comentários e o miolo das regras ({ cor: ...; }) — sobram só os
        // seletores, então "0.5em" ou "#fff" não viram classe/id por engano.
        const sel = t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{[^{}]*\}/g, '{}');
        sel.replace(/\.(-?[_a-zA-Z][\w-]*)/g, (_, c) => add(classes, c, a.nome));
        sel.replace(/#(-?[_a-zA-Z][\w-]*)/g, (_, c) => add(idsDoJs, c, a.nome));
      } else if (e === 'js' || e === 'mjs') {
        t.replace(/classList\.(?:add|remove|toggle|contains|replace)\(([^)]*)\)/g, (_, args) =>
          args.replace(/["'`]([\w-]+)["'`]/g, (__, c) => add(classes, c, a.nome)));
        t.replace(/className\s*=\s*["'`]([^"'`]+)["'`]/g, (_, cs) => cs.split(/\s+/).forEach(c => add(classes, c, a.nome)));
        t.replace(/getElementById\(\s*["'`]([\w-]+)/g, (_, id) => add(idsDoJs, id, a.nome));
        t.replace(/querySelector(?:All)?\(\s*["'`]#([\w-]+)/g, (_, id) => add(idsDoJs, id, a.nome));
        t.replace(/localStorage\.(?:get|set|remove)Item\(\s*["'`]([^"'`]+)["'`]/g, (_, k) => chaves.add(k));
      }
    }
    return { ids, classes, tags, idsDoJs, chaves, dados };
  }

  const EVENTOS = [
    ['click', 'Clique do mouse (ou toque) no elemento.'],
    ['dblclick', 'Clique duplo.'],
    ['input', 'A cada letra digitada num campo (ou ao mexer num range).'],
    ['change', 'Quando o valor do campo muda e o aluno sai dele (select, checkbox, arquivo).'],
    ['submit', 'Envio de um <form>. Use evento.preventDefault() pra página não recarregar.'],
    ['keydown', 'Tecla apertada. evento.key diz qual ("Enter", "a", "ArrowUp").'],
    ['keyup', 'Tecla solta.'],
    ['mouseover', 'O mouse entrou em cima do elemento.'],
    ['mouseout', 'O mouse saiu de cima do elemento.'],
    ['mousemove', 'O mouse se mexeu (evento.clientX / clientY dão a posição).'],
    ['mousedown', 'Botão do mouse apertado.'],
    ['mouseup', 'Botão do mouse solto.'],
    ['focus', 'O campo ganhou o foco (o cursor entrou nele).'],
    ['blur', 'O campo perdeu o foco.'],
    ['load', 'A página (ou imagem) terminou de carregar.'],
    ['DOMContentLoaded', 'O HTML terminou de ser lido — dá pra usar os elementos.'],
    ['scroll', 'A página (ou o elemento) rolou.'],
    ['resize', 'A janela mudou de tamanho (use em window).'],
    ['contextmenu', 'Clique com o botão direito.'],
    ['touchstart', 'Dedo encostou na tela (celular).'],
    ['touchend', 'Dedo saiu da tela (celular).'],
  ];

  // [atalho, o que é, corpo do snippet]
  const SNIPPETS = [
    ['log', 'console.log(...) — mostra no console', 'console.log($1);'],
    ['se', 'if — só se a condição for verdadeira', 'if (${1:condicao}) {\n\t$0\n}'],
    ['senao', 'if / else — dois caminhos', 'if (${1:condicao}) {\n\t$2\n} else {\n\t$0\n}'],
    ['ifelse', 'if / else — dois caminhos', 'if (${1:condicao}) {\n\t$2\n} else {\n\t$0\n}'],
    ['for', 'for — repetir N vezes', 'for (let ${1:i} = 0; ${1:i} < ${2:10}; ${1:i}++) {\n\t$0\n}'],
    ['forof', 'for...of — passar por cada item da lista', 'for (const ${1:item} of ${2:lista}) {\n\t$0\n}'],
    ['forin', 'for...in — passar por cada chave do objeto', 'for (const ${1:chave} in ${2:objeto}) {\n\t$0\n}'],
    ['while', 'while — repetir enquanto for verdadeiro', 'while (${1:condicao}) {\n\t$0\n}'],
    ['foreach', 'lista.forEach — fazer algo com cada item', '${1:lista}.forEach((${2:item}) => {\n\t$0\n});'],
    ['map', 'lista.map — criar uma lista nova transformando cada item', 'const ${1:nova} = ${2:lista}.map((${3:item}) => ${0:item});'],
    ['filter', 'lista.filter — ficar só com os itens que passam no teste', 'const ${1:filtrados} = ${2:lista}.filter((${3:item}) => ${0:condicao});'],
    ['find', 'lista.find — achar o primeiro item que passa no teste', 'const ${1:achado} = ${2:lista}.find((${3:item}) => ${0:condicao});'],
    ['funcao', 'function — criar uma função', 'function ${1:nome}(${2}) {\n\t$0\n}'],
    ['arrow', 'arrow function — função curta numa constante', 'const ${1:nome} = (${2}) => {\n\t$0\n};'],
    ['evento', 'addEventListener — reagir a um clique, tecla...', '${1:elemento}.addEventListener("${2|click,input,change,submit,keydown|}", (${3:evento}) => {\n\t$0\n});'],
    ['pegar', 'document.getElementById — pegar um elemento pelo id', 'const ${2:elemento} = document.getElementById("$1");', true],
    ['qs', 'document.querySelector — pegar um elemento pelo seletor CSS', 'document.querySelector("$1")', true],
    ['qsa', 'document.querySelectorAll — pegar TODOS os elementos do seletor', 'document.querySelectorAll("$1")', true],
    ['criar', 'createElement — criar um elemento e pôr na página', 'const ${1:item} = document.createElement("${2:li}");\n${1:item}.textContent = ${3:"texto"};\n${4:lista}.appendChild(${1:item});'],
    ['fetch', 'fetch — buscar dados (JSON) de um arquivo ou API', 'fetch("${1:dados.json}")\n\t.then((resposta) => resposta.json())\n\t.then((dados) => {\n\t\t$0\n\t})\n\t.catch((erro) => console.error(erro));'],
    ['fetchasync', 'async/await — buscar dados esperando a resposta', 'async function ${1:carregar}() {\n\ttry {\n\t\tconst resposta = await fetch("${2:dados.json}");\n\t\tconst dados = await resposta.json();\n\t\t$0\n\t} catch (erro) {\n\t\tconsole.error(erro);\n\t}\n}'],
    ['timeout', 'setTimeout — fazer algo daqui a X milissegundos', 'setTimeout(() => {\n\t$0\n}, ${1:1000});'],
    ['interval', 'setInterval — repetir a cada X milissegundos', 'const ${1:timer} = setInterval(() => {\n\t$0\n}, ${2:1000});'],
    ['classe', 'class — molde para criar objetos', 'class ${1:Nome} {\n\tconstructor(${2:nome}) {\n\t\tthis.${2:nome} = ${2:nome};\n\t}\n\n\t${3:metodo}() {\n\t\t$0\n\t}\n}'],
    ['try', 'try / catch — tratar um erro sem travar', 'try {\n\t$1\n} catch (erro) {\n\tconsole.error(erro);\n}'],
    ['switch', 'switch — escolher entre vários casos', 'switch (${1:valor}) {\n\tcase ${2:1}:\n\t\t$3\n\t\tbreak;\n\tdefault:\n\t\t$0\n}'],
    ['salvar', 'localStorage — salvar um valor (lista/objeto) no navegador', 'localStorage.setItem("${1:chave}", JSON.stringify(${2:valor}));'],
    ['carregar', 'localStorage — ler o que foi salvo (ou um valor padrão)', 'const ${1:valor} = JSON.parse(localStorage.getItem("${2:chave}")) || ${3:[]};'],
    ['aleatorio', 'número sorteado de 1 a N', 'Math.floor(Math.random() * ${1:10}) + 1'],
    ['pergunta', 'prompt — pedir um número para o usuário', 'const ${1:numero} = Number(prompt("${2:Digite um número:}"));'],
  ];

  // Uma sugestão do Monaco. `range` = trecho que será trocado pelo texto.
  function item(monaco, label, kind, range, extra) {
    return Object.assign({ label, kind, insertText: label, range, filterText: label }, extra || {});
  }

  function registrar(monaco, { arquivos }) {
    const K = monaco.languages.CompletionItemKind;
    const R = (pos, len) => new monaco.Range(pos.lineNumber, pos.column - len, pos.lineNumber, pos.column);
    const naoAtual = (model) => arquivos().filter(a => !model.uri.path.endsWith('/' + a.nome));

    // Lista de nomes → sugestões (ignora o que já está escrito no campo).
    const deMapa = (mapa, kind, range, prefixo = '', pular = []) =>
      [...mapa].filter(([k]) => !pular.includes(k)).map(([k, origem]) =>
        item(monaco, prefixo + k, kind, range, { detail: origem, sortText: '0' + k }));

    const deArquivos = (lista, range) => lista.map(a => item(monaco, a.nome, K.File, range, {
      detail: /\.(png|jpe?g|gif|webp)$/i.test(a.nome) ? 'imagem do projeto' : `arquivo do projeto (${(a.conteudo || '').split('\n').length} linhas)`, sortText: '0' + a.nome,
    }));

    // ---------- JavaScript ----------
    monaco.languages.registerCompletionItemProvider('javascript', {
      triggerCharacters: ['"', "'", '`', '#', '.', ' ', ','],
      provideCompletionItems(model, pos) {
        const linha = model.getLineContent(pos.lineNumber).slice(0, pos.column - 1);
        let m;
        const idx = () => indexar(arquivos());

        if ((m = linha.match(/getElementById\(\s*["'`]([\w-]*)$/)))
          return { suggestions: deMapa(idx().ids, K.Reference, R(pos, m[1].length)) };

        if ((m = linha.match(/getElementsByClassName\(\s*["'`]([\w-]*)$/)))
          return { suggestions: deMapa(idx().classes, K.Value, R(pos, m[1].length)) };

        if ((m = linha.match(/classList\.(?:add|remove|toggle|contains|replace)\((?:\s*["'`][\w-]*["'`]\s*,)*\s*["'`]([\w-]*)$/)))
          return { suggestions: deMapa(idx().classes, K.Value, R(pos, m[1].length)) };

        if ((m = linha.match(/(?:querySelector(?:All)?|closest|matches)\(\s*["'`]([^"'`]*)$/))) {
          const tok = m[1].match(/([#.]?[\w-]*)$/)[1];
          const i = idx(), r = R(pos, tok.length);
          if (tok[0] === '#') return { suggestions: deMapa(i.ids, K.Reference, r, '#') };
          if (tok[0] === '.') return { suggestions: deMapa(i.classes, K.Value, r, '.') };
          return { suggestions: [
            ...deMapa(i.ids, K.Reference, r, '#'),
            ...deMapa(i.classes, K.Value, r, '.'),
            ...[...i.tags].map(t => item(monaco, t, K.Keyword, r, { detail: 'tag usada no HTML', sortText: '1' + t })),
          ] };
        }

        if ((m = linha.match(/\bfetch\(\s*["'`]([^"'`]*)$/)))
          return { suggestions: deArquivos(naoAtual(model), R(pos, m[1].length)) };

        if ((m = linha.match(/addEventListener\(\s*["'`](\w*)$/)))
          return { suggestions: EVENTOS.map(([ev, txt], n) => item(monaco, ev, K.Event, R(pos, m[1].length), {
            detail: txt, documentation: txt, sortText: String(n).padStart(2, '0'),
          })) };

        if ((m = linha.match(/localStorage\.(?:get|set|remove)Item\(\s*["'`]([^"'`]*)$/)))
          return { suggestions: [...idx().chaves].map(k => item(monaco, k, K.Constant, R(pos, m[1].length), { detail: 'chave já usada no projeto' })) };

        if ((m = linha.match(/\.dataset\.(\w*)$/)))
          return { suggestions: [...idx().dados].map(d => item(monaco, d, K.Property, R(pos, m[1].length), { detail: `atributo data-${d.replace(/[A-Z]/g, c => '-' + c.toLowerCase())} do HTML` })) };

        // Dentro de outro texto ou logo depois de um ponto: sem atalhos.
        const aspas = (linha.replace(/\\./g, '').match(/["'`]/g) || []).length;
        const palavra = linha.match(/[\w$]*$/)[0];
        if (aspas % 2 === 1 || /\.\s*$/.test(linha.slice(0, linha.length - palavra.length))) return { suggestions: [] };
        if (/^\s*\/\//.test(linha)) return { suggestions: [] };

        const r = R(pos, palavra.length);
        return { suggestions: SNIPPETS.map(([atalho, detalhe, corpo, reabrir]) => item(monaco, atalho, K.Snippet, r, {
          insertText: corpo,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '⚡ ' + detalhe,
          documentation: { value: '```js\n' + corpo.replace(/\$\{\d+(?::([^}|]*)|\|([^,}]*)[^}]*\|)\}/g, (_, a, b) => a || b || '').replace(/\$\d/g, '').replace(/\t/g, '  ') + '\n```' },
          sortText: '~' + atalho, // depois das sugestões do próprio JavaScript
          // Snippet que termina dentro de aspas (pegar, qs) já abre a lista de ids/classes.
          command: reabrir ? { id: 'editor.action.triggerSuggest', title: '' } : undefined,
        })) };
      },
    });

    // ---------- HTML ----------
    monaco.languages.registerCompletionItemProvider('html', {
      triggerCharacters: ['"', "'", ' '],
      provideCompletionItems(model, pos) {
        const ate = model.getValueInRange(new monaco.Range(Math.max(1, pos.lineNumber - 30), 1, pos.lineNumber, pos.column));
        const abre = ate.lastIndexOf('<');
        if (abre < 0 || abre < ate.lastIndexOf('>')) return { suggestions: [] };
        const dentro = ate.slice(abre);
        const tag = ((dentro.match(/^<([a-zA-Z][\w-]*)/) || [])[1] || '').toLowerCase();
        const m = dentro.match(/([\w-]+)\s*=\s*["']([^"']*)$/);
        if (!m) return { suggestions: [] };
        const attr = m[1].toLowerCase(), valor = m[2];
        const i = indexar(arquivos());

        if (attr === 'class') {
          const tok = valor.match(/[\w-]*$/)[0];
          return { suggestions: deMapa(i.classes, K.Value, R(pos, tok.length), '', valor.split(/\s+/)) };
        }
        if (attr === 'id') {
          // Ids que o JS/CSS procura mas que ainda não existem no HTML.
          const faltando = new Map([...i.idsDoJs].filter(([k]) => !i.ids.has(k)).map(([k, v]) => [k, 'usado em ' + v]));
          return { suggestions: deMapa(faltando, K.Reference, R(pos, valor.length)) };
        }
        if (attr === 'for') return { suggestions: deMapa(i.ids, K.Reference, R(pos, valor.length)) };
        if (['href', 'src', 'action', 'data'].includes(attr)) {
          const filtro = { link: ['css'], script: ['js', 'mjs'], a: ['html', 'htm'], iframe: ['html', 'htm'], form: ['html', 'htm'], img: ['svg', 'png', 'jpg', 'jpeg', 'gif', 'webp'] }[tag];
          const lista = naoAtual(model).filter(a => !filtro || filtro.includes(ext(a.nome)));
          return { suggestions: deArquivos(lista, R(pos, valor.length)) };
        }
        return { suggestions: [] };
      },
    });

    // ---------- CSS ----------
    monaco.languages.registerCompletionItemProvider('css', {
      triggerCharacters: ['.', '#'],
      provideCompletionItems(model, pos) {
        const ate = model.getValueInRange(new monaco.Range(1, 1, pos.lineNumber, pos.column)).replace(/\/\*[\s\S]*?\*\//g, '');
        // Está num seletor? (fora de { }, ou direto dentro de um @media)
        const pilha = []; let prelude = '';
        for (const ch of ate) {
          if (ch === '{') { pilha.push(prelude.trim()); prelude = ''; }
          else if (ch === '}') { pilha.pop(); prelude = ''; }
          else if (ch === ';') prelude = '';
          else prelude += ch;
        }
        const topo = pilha[pilha.length - 1];
        if (pilha.length && !/^@(media|supports|container|layer)\b/.test(topo)) return { suggestions: [] };
        const tok = prelude.match(/([.#]?[\w-]*)$/)[1];
        // O próprio CSS do Monaco já sugere os seletores deste arquivo: aqui entram os dos outros.
        const i = indexar(naoAtual(model)), r = R(pos, tok.length);
        if (tok[0] === '.') return { suggestions: deMapa(i.classes, K.Value, r, '.') };
        if (tok[0] === '#') return { suggestions: deMapa(new Map([...i.ids, ...i.idsDoJs]), K.Reference, r, '#') };
        if (!tok) return { suggestions: [] };
        return { suggestions: [...i.tags].map(t => item(monaco, t, K.Keyword, r, { detail: 'tag usada no HTML' })) };
      },
    });
  }

  return { registrar, indexar, SNIPPETS, EVENTOS };
})();
