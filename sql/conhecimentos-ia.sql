-- Notas de Conhecimentos sobre IA (professor/conhecimentos.html):
-- IA, LLM, Prompt, Agentes de IA, MCP, Arquivos de instrução, ChatGPT,
-- Claude, Codex e Claude Code. Rode no SQL Editor do Supabase.
--
-- O SQL Editor não tem usuário logado (auth.uid() é nulo), então o dono
-- das notas é achado em profiles: o único perfil com role 'professor'.
-- Se houver mais de um, preencha v_email com o e-mail do seu login.
--
-- Idempotente: nota que já existe com o mesmo título (sem diferenciar
-- maiúsculas) tem o conteúdo SUBSTITUÍDO; as demais são criadas. Notas
-- com outros títulos não são tocadas.

do $do$
declare
  v_email text := '';   -- opcional: e-mail do login do professor
  v_prof uuid;
  v_qtd int;
begin
  if v_email <> '' then
    select id into v_prof from public.profiles where lower(email) = lower(v_email);
  else
    select count(*) into v_qtd from public.profiles where role = 'professor';
    if v_qtd <> 1 then
      raise exception 'Há % professores em profiles. Preencha v_email no topo do script.', v_qtd;
    end if;
    select id into v_prof from public.profiles where role = 'professor';
  end if;
  if v_prof is null then
    raise exception 'Professor não encontrado. Confira v_email.';
  end if;

  insert into public.professor_notas (professor_id, titulo, conteudo)
  select v_prof, n.titulo, n.conteudo
  from (values

-- ------------------------------------------------------------------ IA
('IA', $md$**Inteligência Artificial**: sistemas que fazem tarefas que pediriam inteligência humana: entender texto, ver imagens, decidir, gerar conteúdo.

## Camadas
IA ⊃ Machine Learning ⊃ Deep Learning ⊃ [[LLM]]

## IA generativa
Cria texto, código, imagem, áudio e vídeo a partir de um [[Prompt]].

## Ferramentas
- [[ChatGPT]]: OpenAI
- [[Claude]]: Anthropic
- [[Codex]] e [[Claude Code]]: IA que programa no terminal

## Conceitos-chave
- [[LLM]]: o modelo por trás dos chats
- [[Agentes de IA]]: IA que age, não só responde
- [[MCP]]: liga a IA a outras ferramentas

> [!atencao] Alucinação
> A IA pode inventar fatos com toda a confiança. Sempre confira o que é importante.

#ia #conceito$md$),

-- ------------------------------------------------------------------ LLM
('LLM', $md$**Large Language Model**: modelo treinado com muito texto pra prever a próxima palavra. É o "motor" do [[ChatGPT]] e do [[Claude]].

## Termos
| Termo | O que é |
|---|---|
| Token | Pedaço de palavra. A cobrança e os limites são em tokens |
| Contexto | Quanto texto o modelo enxerga de uma vez (conversa + arquivos) |
| Treino | Até quando o modelo aprendeu (data de corte) |
| Multimodal | Entende imagem, áudio e arquivo, não só texto |
| Raciocínio | Modo que "pensa" antes de responder: mais lento, mais preciso |

> [!dica] Contexto cheio
> Conversa muito longa piora a resposta. Comece outra quando mudar de assunto.

Ver [[IA]] e [[Prompt]].

#ia #conceito$md$),

-- ------------------------------------------------------------------ Prompt
('Prompt', $md$O pedido que você faz para a [[IA]]. Quanto mais claro, melhor a resposta.

## Estrutura que funciona
1. **Papel**: "Você é professor de banco de dados…"
2. **Contexto**: pra quem, sobre o quê, o que já existe
3. **Tarefa**: o que fazer, em verbo ("crie", "revise", "explique")
4. **Formato**: lista, tabela, código, tamanho
5. **Exemplo** do resultado esperado (se tiver)

## Dicas
- Uma tarefa por vez
- Diga o que **não** quer
- Peça pra perguntar antes se faltar informação
- Itere: ajuste o pedido em vez de começar do zero

No [[Claude Code]] e no [[Codex]], instruções fixas vão nos [[Arquivos de instrução]].

#ia #conceito$md$),

-- ------------------------------------------------------------------ Agentes
('Agentes de IA', $md$Uma [[IA]] que **age**: planeja, usa ferramentas (ler arquivo, rodar comando, pesquisar), confere o resultado e repete até terminar.

## Chat × Agente
| Chat | Agente |
|---|---|
| Responde | Executa |
| Você copia e cola | Ele edita os arquivos |
| Uma resposta | Várias etapas |

## Exemplos
- [[Claude Code]] e [[Codex]]: agentes de programação
- Modo agente do [[ChatGPT]]: navega e faz tarefas na web
- [[Claude]] no Chrome: usa o navegador

> [!atencao] Permissões
> Agente mexe em coisa de verdade. Revise o que ele pode fazer sozinho.

Ferramentas externas chegam pelo [[MCP]].

#ia #conceito$md$),

-- ------------------------------------------------------------------ MCP
('MCP', $md$**Model Context Protocol**: padrão aberto (criado pela Anthropic) pra ligar a [[IA]] a ferramentas e dados: GitHub, Google Drive, banco de dados, navegador…

Funciona como uma "tomada universal": um servidor MCP serve pro [[Claude]], [[Claude Code]], [[Codex]], [[ChatGPT]] e outros.

## Adicionar
```bash
# Claude Code
claude mcp add --transport http nome https://servidor/mcp
claude mcp add nome -- npx -y pacote-do-servidor

# Codex
codex mcp add nome -- npx -y pacote-do-servidor
```

> [!atencao] Só servidores confiáveis
> O servidor MCP vê e faz o que a ferramenta permitir.

Ver [[Agentes de IA]].

#ia #conceito$md$),

-- ------------------------------------------------------------------ Instrução
('Arquivos de instrução', $md$Arquivo em Markdown na raiz do projeto que o agente lê sozinho, todo começo de conversa: regras, comandos, padrões.

| Ferramenta | Arquivo |
|---|---|
| [[Claude Code]] | `CLAUDE.md` |
| [[Codex]] | `AGENTS.md` |

## O que colocar
- Como rodar, testar e publicar
- Padrões de código e idioma
- O que **nunca** fazer

## Criar
`/init` nas duas ferramentas: analisa o projeto e gera o arquivo.

> [!dica] Curto e direto
> Ele entra em toda conversa e gasta contexto. Só o essencial.

Ver [[Prompt]].

#ia #conceito$md$),

-- ------------------------------------------------------------------ ChatGPT
('ChatGPT', $md$Chat de [[IA]] da **OpenAI**. Site: chatgpt.com · app pra celular e computador.

## Principais funções
- **Conversa** com texto, voz, imagem e arquivos
- **Pesquisa na web** com fontes
- **Deep Research**: pesquisa longa que vira relatório
- **Imagens**: gera e edita
- **Análise de dados**: lê planilha, roda Python, faz gráfico
- **Canvas**: edita texto e código lado a lado
- **Projetos**: agrupa conversas e arquivos por assunto
- **Memória**: lembra suas preferências entre conversas
- **GPTs**: versões personalizadas com instruções próprias
- **Modo agente**: executa tarefas no navegador (ver [[Agentes de IA]])
- **Conectores**: Drive, Gmail, GitHub… (ver [[MCP]])

## Planos
Free · Plus · Pro · Business · Enterprise

Para programar no terminal: [[Codex]]. Concorrente: [[Claude]].

#ia #ferramenta$md$),

-- ------------------------------------------------------------------ Claude
('Claude', $md$[[IA]] da **Anthropic**. Site: claude.ai · app pra celular e computador · API.

## Modelos
- **Opus**: o mais capaz, pra tarefa difícil
- **Sonnet**: equilíbrio entre qualidade e velocidade
- **Haiku**: rápido e barato

## Principais funções
- **Projetos**: conversas com arquivos e instruções fixas
- **Artifacts**: gera páginas, apps, documentos e gráficos ao lado do chat
- **Pesquisa na web** e **Research** (pesquisa longa)
- **Raciocínio estendido**: pensa antes de responder
- **Arquivos**: lê PDF, planilha, imagem; cria Word, Excel, PowerPoint
- **Memória** entre conversas
- **Conectores** via [[MCP]]: Drive, Gmail, GitHub…
- **Claude no Chrome**: age no navegador (ver [[Agentes de IA]])

## Planos
Free · Pro · Max · Team · Enterprise

Para programar: [[Claude Code]]. Concorrente: [[ChatGPT]].

#ia #ferramenta$md$),

-- ------------------------------------------------------------------ Codex
('Codex', $md$Agente de programação da **OpenAI** (ver [[Agentes de IA]]). Lê o projeto, edita arquivos e roda comandos. Usa a conta do [[ChatGPT]].

Onde roda: **terminal (CLI)** · extensão do VS Code · nuvem (chatgpt.com/codex) · revisão de PR no GitHub.

## Instalar
```bash
npm install -g @openai/codex     # precisa de Node.js
brew install --cask codex        # macOS
```
No Windows funciona melhor dentro do **WSL**.

## Entrar e usar
```bash
codex login                      # conta do ChatGPT (ou OPENAI_API_KEY)
codex                            # abre na pasta atual
codex "explique este projeto"    # já começa com um pedido
codex exec "rode os testes"      # sem interação (scripts/CI)
codex resume                     # retoma uma sessão
```

## Configurar: `~/.codex/config.toml`
```toml
approval_policy = "on-request"     # untrusted | on-request | never
sandbox_mode = "workspace-write"   # read-only | workspace-write | danger-full-access

[mcp_servers.exemplo]
command = "npx"
args = ["-y", "pacote-do-servidor"]
```

## Comandos na sessão
| Comando | Pra quê |
|---|---|
| `/model` | trocar modelo e esforço de raciocínio |
| `/approvals` | o que ele faz sem pedir |
| `/init` | criar o `AGENTS.md` ([[Arquivos de instrução]]) |
| `/review` | revisar as mudanças |
| `/diff` | ver o que mudou |
| `/compact` | resumir a conversa (libera contexto) |
| `/new` | conversa nova |
| `/mcp` | ver servidores [[MCP]] |
| `/status` | conta, modelo e limites |
| `/skills` | ver e usar as skills |

## Skills
Pasta com um `SKILL.md` (instruções + scripts) que ensina uma tarefa ao Codex. Ele usa sozinho quando o pedido combina, ou você chama com `$nome`.

| Skill | Pra quê |
|---|---|
| `$skill-installer` | instala skills prontas do catálogo da OpenAI (github.com/openai/skills) |
| `$skill-creator` | cria uma skill nova com você |

```text
$skill-installer nome-da-skill     # instalar do catálogo
```
Onde ficam: `~/.codex/skills/` (suas) · `.codex/skills/` (do projeto). Reinicie o Codex depois de instalar.

Atualizar: `npm install -g @openai/codex@latest`. Equivalente da Anthropic: [[Claude Code]].

#ia #ferramenta$md$),

-- ------------------------------------------------------------------ Claude Code
('Claude Code', $md$Agente de programação da **Anthropic** (ver [[Agentes de IA]]). Lê o projeto, edita arquivos, roda comandos e faz commit. Usa a conta do [[Claude]] (Pro/Max) ou a API.

Onde roda: **terminal** · app de desktop · VS Code e JetBrains · web (claude.ai/code).

## Instalar
```bash
# macOS, Linux, WSL
curl -fsSL https://claude.ai/install.sh | bash
```
```powershell
# Windows (PowerShell) — precisa do Git for Windows
irm https://claude.ai/install.ps1 | iex
```
```bash
# Alternativa com Node.js
npm install -g @anthropic-ai/claude-code
```

## Usar
```bash
claude                      # abre na pasta atual (pede login na 1ª vez)
claude "explique o projeto" # já começa com um pedido
claude -c                   # continua a última conversa
claude -r                   # escolhe uma conversa antiga
claude -p "resuma o README" # sem interação (scripts/CI)
claude update               # atualiza
claude doctor               # diagnostica a instalação
```

## Comandos na sessão
| Comando | Pra quê |
|---|---|
| `/init` | criar o `CLAUDE.md` ([[Arquivos de instrução]]) |
| `/model` | Opus, Sonnet ou Haiku |
| `/permissions` | o que ele faz sem pedir |
| `/mcp` | servidores [[MCP]] |
| `/agents` | subagentes especializados |
| `/hooks` | rodar comandos automáticos em eventos |
| `/memory` | editar o `CLAUDE.md` |
| `/compact` | resumir a conversa (libera contexto) |
| `/clear` | conversa nova |
| `/resume` | voltar a uma conversa |
| `/config` | tema e preferências |
| `/login` | trocar de conta |
| `/plugin` | instalar plugins e skills de um marketplace |

## Skills
Pasta com um `SKILL.md` (instruções + scripts) que ensina uma tarefa ao Claude Code. Ele usa sozinho quando o pedido combina, ou você chama com `/nome`.

**Já vêm instaladas**
| Skill | Pra quê |
|---|---|
| `/code-review` | revisa as mudanças procurando bugs |
| `/security-review` | revisa as mudanças procurando falhas de segurança |
| `/simplify` | limpa e simplifica o código alterado |
| `/loop` | repete um comando de tempos em tempos |
| `/schedule` | agenda tarefas na nuvem |

**Oficiais da Anthropic** (github.com/anthropics/skills)
| Skill | Pra quê |
|---|---|
| `docx` · `xlsx` · `pptx` · `pdf` | criar e editar Word, Excel, PowerPoint e PDF |
| `frontend-design` | telas com visual caprichado |
| `webapp-testing` | testar site no navegador (Playwright) |
| `mcp-builder` | criar servidor [[MCP]] |
| `skill-creator` | criar uma skill nova |

```text
/plugin marketplace add anthropics/skills
/plugin install document-skills@anthropic-agent-skills
```
Onde ficam: `~/.claude/skills/<nome>/SKILL.md` (suas) · `.claude/skills/` (do projeto).

## Atalhos
- **Shift+Tab**: alterna modo normal → aceitar edições → **plano** (só planeja)
- **Esc**: interrompe · **Esc Esc**: volta numa mensagem anterior
- **@arquivo**: cita um arquivo · **!comando**: roda no terminal

## Configurar: `.claude/settings.json`
```json
{
  "permissions": {
    "allow": ["Bash(npm run lint)"],
    "deny": ["Read(./.env)"]
  }
}
```
Do usuário: `~/.claude/settings.json` · do projeto: `.claude/settings.json` · só seu: `.claude/settings.local.json`.

Equivalente da OpenAI: [[Codex]].

#ia #ferramenta$md$)

  ) as n(titulo, conteudo)
  on conflict (professor_id, lower(titulo)) where titulo <> ''
  do update set conteudo = excluded.conteudo, updated_at = now();

  raise notice 'Notas de IA gravadas para o professor %.', v_prof;
end
$do$;
