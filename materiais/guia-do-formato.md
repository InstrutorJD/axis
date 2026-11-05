---
titulo: Guia do formato
descricao: Tudo que dá pra fazer num slide, com exemplos — comece por aqui.
icone: 🧭
---

# Guia do formato
Como escrever uma aula em Markdown para o **Criar Material**

---

## Como funciona
+ Você escreve a aula num arquivo **.md** (texto puro)
+ Cada `---` numa linha sozinha separa um slide do outro
+ O portal monta os slides na hora, com efeitos e interação
+ Avance com **→**, **espaço** ou um passador de slides

---

## Títulos
Um slide que começa com `#` vira **abertura**: grande e centralizado.

Um slide que começa com `##` é um slide comum, como este.

> Dica: use `#` para abrir a aula e cada parte dela.

---

## Texto e destaques
Escreva normalmente. Dá para usar **negrito**, *destaque colorido*, `código no meio do texto` e ==marca-texto==.

Links também funcionam: [MDN Web Docs](https://developer.mozilla.org/pt-BR/)

---

## Listas
- Uma lista com `-` aparece inteira
- Cada item com um marcador
- Boa para resumos

1. Lista numerada com `1.`
2. Boa para passo a passo

---

## Revelar em etapas
Com `+` no lugar de `-`, cada item aparece a cada avanço:

+ Primeiro você explica isto
+ Depois aparece isto
+ E por último, a conclusão

---

## Pergunta para a turma
Qual destas tags cria um link em HTML?

- [ ] `<link>`
- [x] `<a>`
- [ ] `<href>`
- [ ] `<url>`

---

## Como funciona a pergunta
- Escreva as alternativas com `- [ ]`
- Marque a certa com `- [x]`
- Clique numa alternativa: a errada treme, a certa solta confete 🎉
- Ou aperte **R** (ou avance) para revelar a resposta

---

## Código
```js
function saudacao(nome) {
  return `Olá, ${nome}! Bem-vindo à aula.`;
}

console.log(saudacao("turma"));
```

---

## Grade de 0 e 1
Um bloco de código com a linguagem `grade` vira um desenho de pixels. Avance: os **0** somem e o desenho aparece.

```grade
0 0 1 0 0
0 1 1 1 0
1 1 1 1 1
0 1 0 1 0
```

---

## Tabelas
| Linguagem  | Onde roda        | Usada para            |
|------------|------------------|-----------------------|
| HTML       | Navegador        | Estrutura da página   |
| CSS        | Navegador        | Visual                |
| JavaScript | Navegador/Node   | Comportamento         |

---

## Imagens
Use `![legenda](arquivo.png)` numa linha sozinha. O arquivo pode estar na pasta `materiais/` ou ser um link da internet.

> Aulas abertas direto do computador só mostram imagens por link (https://...).

---

## Mão na massa
Crie uma página com um título, um parágrafo e um link.

[cronômetro 15]

---

## QR Code
Quer que a turma abra um link no celular? Uma linha com `[qrcode link]`:

[qrcode https://developer.mozilla.org/pt-BR/ Documentação da MDN]

---

## Identificação da aula
O arquivo começa com um cabeçalho entre `---`:

```
---
aula: 3
data: 2026-09-30
titulo: Introdução a Redes
turma: 2º DS
---
```

- Vira o card da aula, com número e data
- E a etiqueta no slide de abertura
- Opcional: `fonte: grande` deixa tudo ~15% maior

---

## Aula concluída
+ No último slide aparece o botão **✅ Finalizar aula**
+ Só com esse clique a aula fica **Concluída** na lista
+ Data passou sem finalizar? O card mostra **Pendente**
+ Marcou sem querer? Clique em *desmarcar* no card

---

## Atalhos na apresentação
| Tecla | Faz |
|-------|-----|
| → ou espaço / ← | Avança / volta |
| O | Visão geral dos slides |
| T | Tema claro/escuro |
| F | Tela cheia |
| P | Imprime ou salva em PDF |
| R | Revela a resposta |
| Q | Amplia o QR Code |
| Esc | Sai |

---

# Bom trabalho!
Agora é só escrever a sua aula 🚀
