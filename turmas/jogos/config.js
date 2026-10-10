// Matérias/trilhas/módulos da turma Jogos Digitais (8 matérias no total,
// sendo "Comunicação (Engel)" visível só pro aluno adaptado — 7 aparecem
// pro resto da turma).
// Consumido por plataforma.html (via window.TURMA_CONFIG) — inclusive pela
// aba "Gestão" do próprio portal (shared/platform-core.js), que lê isso
// pra montar as colunas de desempenho por trilha do relatório de notas e a
// lista de aulas com geração de slides (campo hasSlides).
//
// Só dentro de uma matéria é que as trilhas aparecem (ver renderMaterias/
// openMateria em shared/platform-core.js). Fundamentos de Programação e
// Introdução ao Desenvolvimento de Projetos já têm conteúdo de verdade —
// as demais são placeholders prontos pra receber trilhas quando o
// currículo de cada uma for definido.
window.TURMA_CONFIG_JOGOS = {
  id: 'jogos',
  label: 'Jogos Digitais',
  // Código oficial da turma no SIAP/SENAI. É o valor da coluna `turma` em
  // professor/data/conteudos.csv (e entra no cálculo da `chave`), então
  // precisa bater letra por letra com o CSV — ver shared/lancamento.js.
  codigoTurma: '2º JD',
  // Rótulo da coluna "Nota 3" em Lançar Notas (shared/platform-core.js) —
  // mesmo mecanismo já usado pela turma Sistemas (ver turmas/sistemas/
  // config.js): com os três campos abaixo, a coluna "Prova Final" passa a
  // ser AUTOMÁTICA e travada pro professor (mesmo padrão da coluna
  // "Prova"/Prova Diagnóstica), lida direto de student_activity_state
  // (state.nota, 0-100, salvo por finishExam() em
  // atividades/prova-final-jogos.html) e escalada pra 0-10, só contando no
  // bimestre em que a trilha 'prova-final' estiver atribuída ("Liberação
  // por Trilha") — ver loadNotas/renderPerfilTab em shared/platform-core.js.
  nota3Label: 'Prova Final',
  nota3TrilhaKey: 'prova-final',
  nota3ActivityLocation: 'prova_final_jogos',
  // Aluno cujas provas são adaptadas (ver "Prova Diagnóstica (Engel)"/
  // "Prova Final (Engel)" abaixo, dentro da matéria "prova") — elas gravam
  // a nota num progress_key próprio (prova_jogos_engel/
  // prova_final_jogos_engel), diferente do padrão da turma acima
  // (prova_jogos/prova_final_jogos), então os lookups automáticos de
  // "Prova"/"Nota 3" (shared/platform-core.js) nunca encontram a nota
  // dele. Pra quem está nesta lista, as duas colunas viram <input> comum
  // (igual "Recuperação" sempre foi) e o professor lança a nota direto,
  // com base no gabarito da prova adaptada — a % de Atividades continua
  // automática, calculada só a partir das trilhas adaptadas dele.
  notasManuaisFor: ['engel.fraga'],
  materias: [
    {
      key: 'projeto-vida', label: 'Projeto de Vida',
      trilhas: [
        {
          key: 'vida-autoconhecimento',
          label: 'Autoconhecimento e Valores Pessoais',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre motivadores, talentos, habilidades, competências, aptidões e valores pessoais.',
          capacidade: 'Identificar características pessoais próprias tendo em vista o autoconhecimento.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Autoconhecimento e Valores Pessoais',
              desc: 'Motivadores pessoais/profissionais, valores e crenças, talento x habilidade x competência, aptidões, forças/oportunidades de desenvolvimento e correlação entre valores e sucesso profissional.',
              icon: '🦉', src: 'atividades/vida-autoconhecimento-teoria.html',
              progressKey: 'vida_autoconhecimento_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central do Projeto de Vida: Autoconhecimento',
              desc: 'Resolva pareceres identificando motivadores, talentos, habilidades, competências e aptidões em cada cenário.',
              icon: '🔥', src: 'atividades/vida-autoconhecimento-pratica.html',
              progressKey: 'vida_autoconhecimento_pratica_progress_', progressTotal: 5,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'vida-cidadania',
          label: 'Cidadania e Convivência Social',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre urbanidade, direitos e deveres individuais/coletivos e valores na tomada de decisão.',
          capacidade: 'Identificar normas e valores sociais relevantes à convivência cidadã.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Cidadania e Convivência Social',
              desc: 'Urbanidade, direitos e deveres individuais e coletivos, respeito à diversidade de valores/crenças e sua influência na tomada de decisão.',
              icon: '🦉', src: 'atividades/vida-cidadania-teoria.html',
              progressKey: 'vida_cidadania_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central do Projeto de Vida: Cidadania',
              desc: 'Resolva pareceres identificando urbanidade, direitos/deveres individuais e coletivos em cada cenário.',
              icon: '🚌', src: 'atividades/vida-cidadania-pratica.html',
              progressKey: 'vida_cidadania_pratica_progress_', progressTotal: 5,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'vida-emocional',
          label: 'Inteligência Emocional e Relacionamentos',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre autocontrole, adaptabilidade, empatia, feedback e networking.',
          capacidade: 'Identificar as habilidades socioemocionais que impactam nos relacionamentos interpessoais / Avaliar o impacto de atitudes e comportamentos próprios com relação às demais pessoas.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Inteligência Emocional e Relacionamentos',
              desc: 'Autocontrole, adaptabilidade/flexibilidade emocional, empatia e comportamento, feedback com inteligência emocional e redes de relacionamento (networking).',
              icon: '🦉', src: 'atividades/vida-emocional-teoria.html',
              progressKey: 'vida_emocional_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central do Projeto de Vida: Inteligência Emocional',
              desc: 'Resolva pareceres identificando autocontrole, adaptabilidade, empatia, feedback e networking em cada cenário.',
              icon: '😤', src: 'atividades/vida-emocional-pratica.html',
              progressKey: 'vida_emocional_pratica_progress_', progressTotal: 5,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'vida-equipe',
          label: 'Colaboração e Compromisso em Equipe',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre colaboração, definição de papéis, compromisso com metas, comunicação e integração do trabalho em equipe.',
          capacidade: 'Reconhecer as características do trabalho em equipe de forma colaborativa.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Colaboração e Compromisso em Equipe',
              desc: 'Colaboração e cooperação, definição de papéis, compromisso com objetivos e metas, comunicação em equipe e integração do trabalho colaborativo.',
              icon: '🦉', src: 'atividades/vida-equipe-teoria.html',
              progressKey: 'vida_equipe_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central do Projeto de Vida: Colaboração em Equipe',
              desc: 'Resolva pareceres identificando papéis, compromisso, comunicação e integração do trabalho em equipe em cada cenário.',
              icon: '🎪', src: 'atividades/vida-equipe-pratica.html',
              progressKey: 'vida_equipe_pratica_progress_', progressTotal: 5,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'vida-metas-carreira',
          label: 'Metas e Objetivos de Carreira',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre como definir metas de desenvolvimento pessoal e profissional, inclusive usando IA para estruturar um plano de estudos.',
          capacidade: 'Definir metas claras de desenvolvimento pessoal e profissional.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Metas e Objetivos de Carreira',
              desc: 'Metas e objetivos pessoais, e como usar uma ferramenta de IA (como o GitHub Copilot) para estruturar um plano de estudos de novas linguagens baseado nos seus objetivos.',
              icon: '🦉', src: 'atividades/vida-metas-carreira-teoria.html',
              progressKey: 'vida_metas_carreira_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central do Projeto de Vida: Metas e Carreira',
              desc: 'Resolva pareceres identificando se uma meta de desenvolvimento foi definida com clareza, inclusive com apoio de IA para estruturar o plano de estudos.',
              icon: '🎯', src: 'atividades/vida-metas-carreira-pratica.html',
              progressKey: 'vida_metas_carreira_pratica_progress_', progressTotal: 1,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        // As duas trilhas abaixo são COMPARTILHADAS entre Sistemas e Jogos
        // (mesmas aulas 32 e 33 do plano de ensino). Os arquivos ficam em
        // turmas/sistemas/ e o config.js de Jogos aponta para eles.
        {
          // Padrão novo (docs/padrao-trilhas.md). Plano de ensino: Aula 32
          // (06/10/2026), 1h — teoria ~15 min + sprint de foco ~40 min, tudo
          // numa tela só (o editor e os testes ficam no portal).
          key: 'vida-foco-autocontrole',
          label: 'Autocontrole e Foco',
          aula: 32, dataAula: '2026-10-06',
          desc: 'Foco, distrações e autocontrole num sprint de programação de lógica, respeitando as normas de convivência do laboratório.',
          capacidade: 'Identificar normas e valores sociais relevantes à convivência cidadã.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Autocontrole e Foco',
              desc: 'Foco × multitarefa, distrações externas e internas, autocontrole diante do erro, Pomodoro e normas de convivência que protegem o foco da turma.',
              icon: '📖', src: '../sistemas/atividades/vida-foco-autocontrole-teoria.html', telaCheia: true,
              progressKey: 'vida_foco_autocontrole_teoria_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Sprint de Foco',
              desc: 'Dois desafios de lógica com testes automáticos num sprint cronometrado, com contagem de saídas da tela e autoavaliação. Checklist de entrega de código e visto do professor.',
              icon: '⏱️', src: '../sistemas/atividades/vida-foco-autocontrole-pratica.html', telaCheia: true,
              progressKey: 'vida_foco_autocontrole_pratica_progress_', progressMode: 'flag',
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          // Padrão novo. Plano de ensino: Aula 33 (13/10/2026), 1h — teoria
          // ~20 min + fórum simulado ~35 min (postagem informativa conferida
          // no portal + moderação de comentários + visto).
          key: 'vida-cidadania-digital',
          label: 'Urbanidade e Cidadania Digital',
          aula: 33, dataAula: '2026-10-13',
          desc: 'Urbanidade na internet, LGPD e práticas de cidadania digital: crie uma postagem informativa sobre proteção de dados e modere um fórum simulado.',
          capacidade: 'Identificar normas e valores sociais relevantes à convivência cidadã.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Urbanidade e Cidadania Digital',
              desc: 'Netiqueta, Marco Civil da Internet, dados pessoais e sensíveis (LGPD), direitos do titular, proteção de dados, cyberbullying (Lei 14.811/2024) e checagem de informações.',
              icon: '📖', src: '../sistemas/atividades/vida-cidadania-digital-teoria.html', telaCheia: true,
              progressKey: 'vida_cidadania_digital_teoria_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Fórum de Cidadania Digital',
              desc: 'Escreva uma postagem informativa (sem dados pessoais, com dicas e fonte) e modere comentários de forma ética num fórum simulado. Na última etapa, o professor dá o visto.',
              icon: '💬', src: '../sistemas/atividades/vida-cidadania-digital-pratica.html', telaCheia: true,
              progressKey: 'vida_cidadania_digital_pratica_progress_', progressMode: 'flag',
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          // Trilha individual, adaptada — só aparece pro aluno listado em
          // visibleFor (professor sempre vê, pra acompanhar). Ver
          // trilhaStatus() em shared/platform-core.js. Versão reduzida do
          // jogo "Ponto de Virada" (removido do portal a pedido do
          // professor — esta versão adaptada não dependia do arquivo
          // original e continua valendo por conta própria): 6 cenas,
          // 2 escolhas por cena (em vez de 3), pouco texto e emoji grande
          // por escolha.
          key: 'ponto-de-virada-engel',
          label: 'Ponto de Virada (Engel)',
          desc: 'Escolha um módulo para começar.',
          visibleFor: ['engel.fraga'],
          modules: [
            {
              key: 'jogo', title: 'Ponto de Virada — Adaptado',
              desc: '6 cenas curtas da vida do Lucas, cada uma com 2 escolhas (emoji grande + palavra curta). Sem certo ou errado.',
              icon: '🎭', src: 'atividades/ponto-de-virada-engel.html',
              progressKey: 'ponto_de_virada_engel_progress_', progressMode: 'flag'
            }
          ]
        },
        {
          // Trilha individual, adaptada — só aparece pro aluno listado em
          // visibleFor (professor sempre vê, pra acompanhar). Ver
          // trilhaStatus() em shared/platform-core.js. Unifica os temas das
          // 5 trilhas de "Projeto de Vida" + as 4 de "Mundo do Trabalho"
          // numa trilha só, no mesmo formato/motor de "Ponto de Virada"
          // acima (continua o mesmo personagem, Lucas): 9 cenas — uma por
          // trilha original —, 2 escolhas por cena, emoji grande, pouco
          // texto, sem certo ou errado.
          key: 'vida-trabalho-engel',
          label: 'Projeto de Vida & Mundo do Trabalho (Engel)',
          desc: 'Escolha um módulo para começar.',
          visibleFor: ['engel.fraga'],
          modules: [
            {
              key: 'jogo', title: 'A Jornada do Lucas — Adaptado',
              desc: '9 cenas curtas da vida do Lucas (escola → primeiro estágio), cobrindo autoconhecimento, cidadania, inteligência emocional, equipe, metas, indústria 4.0, inovação, equipe no trabalho e comprometimento. 2 escolhas por cena, emoji grande. Sem certo ou errado.',
              icon: '🧭', src: 'atividades/vida-trabalho-engel.html',
              progressKey: 'vida_trabalho_engel_progress_', progressMode: 'flag'
            }
          ]
        }
      ]
    },
    {
      key: 'mundo-trabalho', label: 'Mundo do Trabalho',
      trilhas: [
        {
          key: 'mundo-revolucao',
          label: 'Revoluções Industriais e Indústria 4.0',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre as quatro revoluções industriais e as tecnologias habilitadoras da Indústria 4.0.',
          capacidade: 'Reconhecer os marcos que alavancaram as revoluções industriais e seus impactos nas atividades de produção e no desenvolvimento do indivíduo / Reconhecer as tecnologias habilitadoras para indústria 4.0.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Revoluções Industriais e Indústria 4.0',
              desc: '1ª, 2ª, 3ª e 4ª Revolução Industrial, impactos econômicos/sociais e tecnologias habilitadoras: nuvem, IoT, manufatura digital/aditiva, robótica, big data, segurança digital e integração de sistemas.',
              icon: '🤖', src: 'atividades/mundo-revolucao-teoria.html',
              progressKey: 'mundo_revolucao_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central do Mundo do Trabalho: Revoluções Industriais',
              desc: 'Resolva pareceres identificando a revolução industrial ou a tecnologia habilitadora certa em cada cenário.',
              icon: '⚙️', src: 'atividades/mundo-revolucao-pratica.html',
              progressKey: 'mundo_revolucao_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'mundo-inovacao',
          label: 'Inovação e Resolução de Problemas',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre inovação, melhoria contínua, raciocínio lógico e resolução criativa de problemas do cotidiano.',
          capacidade: 'Reconhecer a inovação como ferramenta de melhoria / Resolver problemas do cotidiano de forma criativa e inovadora.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Inovação e Resolução de Problemas',
              desc: 'O que é inovação de verdade, melhoria contínua, raciocínio indutivo/dedutivo aplicado ao cotidiano, lógica de programação com Arduino e raciocínio hipotético/inferencial no debugging.',
              icon: '🤖', src: 'atividades/mundo-inovacao-teoria.html',
              progressKey: 'mundo_inovacao_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central do Mundo do Trabalho: Inovação',
              desc: 'Resolva pareceres identificando inovação, melhoria contínua e o raciocínio certo pra cada problema do cotidiano.',
              icon: '💡', src: 'atividades/mundo-inovacao-pratica.html',
              progressKey: 'mundo_inovacao_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'mundo-equipe',
          label: 'Trabalho em Equipe e Colaboração',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre colaboração, liderança, gestão de conflitos, empatia e flexibilidade.',
          capacidade: 'Atuar em equipes de forma colaborativa.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Trabalho em Equipe e Colaboração',
              desc: 'Colaboração e cooperação, liderança que apoia o time, gestão de conflitos construtiva, empatia com escuta ativa e flexibilidade diante de mudanças.',
              icon: '🤖', src: 'atividades/mundo-equipe-teoria.html',
              progressKey: 'mundo_equipe_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central do Mundo do Trabalho: Trabalho em Equipe',
              desc: 'Resolva pareceres identificando a atitude certa de colaboração, liderança e gestão de conflitos em cada cenário.',
              icon: '🤝', src: 'atividades/mundo-equipe-pratica.html',
              progressKey: 'mundo_equipe_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'mundo-comprometimento',
          label: 'Comprometimento e Autocontrole no Trabalho',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre comprometimento com metas e prazos, mesmo sob pressão de tempo.',
          capacidade: 'Demonstrar conduta de comprometimento com metas e prazos.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Comprometimento e Autocontrole no Trabalho',
              desc: 'Compromisso com metas e prazos, e autocontrole diante de pressão de tempo.',
              icon: '🤖', src: 'atividades/mundo-comprometimento-teoria.html',
              progressKey: 'mundo_comprometimento_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central do Mundo do Trabalho: Comprometimento',
              desc: 'Resolva pareceres identificando comprometimento com metas e prazos sob pressão de tempo.',
              icon: '⏱️', src: 'atividades/mundo-comprometimento-pratica.html',
              progressKey: 'mundo_comprometimento_pratica_progress_', progressTotal: 1,
              requires: 'teoria', hasGabarito: true
            }
          ]
        }
      ]
    },
    {
      key: 'intro-dev-projetos', label: 'Introdução ao Desenvolvimento de Projetos',
      trilhas: [
        {
          key: 'projetos-metodos',
          label: 'Métodos e Estratégias de Desenvolvimento',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre métodos indutivo/dedutivo, hipotético-dedutivo, dialético e postura investigativa.',
          capacidade: 'Reconhecer diferentes métodos aplicados ao desenvolvimento do projeto.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Métodos e Estratégias de Desenvolvimento',
              desc: 'Métodos indutivo/dedutivo, hipotético-dedutivo e dialético, estratégias de resolução de problema, IA como apoio e postura investigativa/diagnóstico.',
              icon: '🦈', src: 'atividades/projetos-metodos-teoria.html',
              progressKey: 'projetos_metodos_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Projetos: Métodos e Estratégias',
              desc: 'Resolva pareceres identificando o método ou estratégia aplicada em cada cenário.',
              icon: '🧭', src: 'atividades/projetos-metodos-pratica.html',
              progressKey: 'projetos_metodos_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'projetos-fases',
          label: 'Fases de Elaboração de um Projeto',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre concepção, pesquisa de anterioridade, planejamento, viabilidade e execução de projetos.',
          capacidade: 'Reconhecer as diferentes fases pertinentes à elaboração de um projeto.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Fases de Elaboração de um Projeto',
              desc: 'Concepção/ideação, pesquisa de anterioridade, registros e patentes, fundamentação e planejamento, viabilidade técnica/financeira e execução.',
              icon: '🦈', src: 'atividades/projetos-fases-teoria.html',
              progressKey: 'projetos_fases_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Projetos: Fases de um Projeto',
              desc: 'Resolva pareceres identificando a fase certa do projeto em cada cenário.',
              icon: '📌', src: 'atividades/projetos-fases-pratica.html',
              progressKey: 'projetos_fases_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        // As duas trilhas abaixo são COMPARTILHADAS com a turma Sistemas
        // (mesmas aulas 32 e 33 do plano de ensino). Os arquivos ficam em
        // turmas/sistemas/ — ver o comentário na matéria intro-dev-projetos
        // de turmas/sistemas/config.js — e aqui só apontam para lá.
        {
          key: 'projetos-estrutura-banco',
          label: 'Estrutura da Base de Dados do Projeto',
          aula: 32, dataAula: '2026-10-05',
          desc: 'Padrões de modelagem relacional e resolução de problemas de estrutura: monte e valide o script SQL do banco do projeto final no SQL Fiddle.',
          capacidade: 'Reconhecer os padrões de estrutura estabelecidos para a elaboração de projetos.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Estrutura da Base de Dados',
              desc: 'Tabela por entidade, PK e FK, snake_case, 1FN/2FN/3FN, relacionamentos 1:N e N:N, restrições e o método para resolver problemas de estrutura.',
              icon: '📖', src: '../sistemas/atividades/projetos-estrutura-banco-teoria.html', telaCheia: true,
              progressKey: 'projetos_estrutura_banco_teoria_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Base de Dados no SQL Fiddle',
              desc: 'Clínica de estrutura com 3 casos, modelagem do projeto final, script no SQL Fiddle (SQLite) e validação automática do script no portal.',
              icon: '🗄️', src: '../sistemas/atividades/projetos-estrutura-banco-pratica.html', telaCheia: true,
              progressKey: 'projetos_estrutura_banco_pratica_progress_', progressMode: 'flag',
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'projetos-pre-textuais',
          label: 'Elementos Pré-textuais do Projeto',
          aula: 33, dataAula: '2026-10-19',
          desc: 'Escrita técnica: folha de rosto, resumo, abstract, lista de ilustrações e sumário do documento do projeto, no VS Code Web.',
          capacidade: 'Reconhecer os padrões de estrutura estabelecidos para a elaboração de projetos.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Elementos Pré-textuais',
              desc: 'Ordem da NBR 14724, obrigatórios e opcionais, resumo e palavras-chave (NBR 6028), lista de ilustrações, sumário (NBR 6027) e Markdown no VS Code Web.',
              icon: '📖', src: '../sistemas/atividades/projetos-pre-textuais-teoria.html', telaCheia: true,
              progressKey: 'projetos_pre_textuais_teoria_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Draft dos Pré-textuais',
              desc: 'Escreva no VS Code Web a folha de rosto, o resumo, o abstract, a lista de ilustrações e o sumário, confira a estrutura no portal e peça o visto do professor.',
              icon: '📝', src: '../sistemas/atividades/projetos-pre-textuais-pratica.html', telaCheia: true,
              progressKey: 'projetos_pre_textuais_pratica_progress_', progressMode: 'flag',
              requires: 'teoria', hasGabarito: true
            }
          ]
        }
      ]
    },
    {
      key: 'codificacao-jogos', label: 'Codificação de Jogos',
      trilhas: [
        {
          key: 'cod-ide',
          label: 'Instalação e Configuração da IDE',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre o que é uma IDE, instalação, variáveis de ambiente, extensões e o teste "Hello World".',
          capacidade: 'Reconhecer os procedimentos de instalação e configuração do ambiente de desenvolvimento (IDE) / Executar instalação e configuração da IDE (VSCode).',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Instalação e Configuração da IDE',
              desc: 'O que é uma IDE, instalação do VSCode, variáveis de ambiente (PATH), extensões e o teste básico "Hello World".',
              icon: '🐞', src: 'atividades/cod-ide-teoria.html',
              progressKey: 'cod_ide_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Codificação: Instalação e Configuração da IDE',
              desc: 'Resolva pareceres sobre IDE, instalação, variáveis de ambiente, extensões e o teste inicial.',
              icon: '🧰', src: 'atividades/cod-ide-pratica.html',
              progressKey: 'cod_ide_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'cod-linguagens',
          label: 'Linguagens, Dados e GDD',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre C#/GDScript/C++, formatos de dados, GDD e pipeline de renderização.',
          capacidade: 'Reconhecer as linguagens de programação utilizadas no desenvolvimento de jogos / Reconhecer diferentes tipos e formatos de dados e arquivos / Reconhecer especificações técnicas definidas no projeto (GDD) / Reconhecer o processo de renderização de elementos multimídia.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Linguagens, Dados e GDD',
              desc: 'C#, GDScript e C++, formatos de dados (JSON/XML/binário), requisitos funcionais/não funcionais do GDD, pré-produção/produção e pipeline de renderização.',
              icon: '🐞', src: 'atividades/cod-linguagens-teoria.html',
              progressKey: 'cod_linguagens_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Codificação: Linguagens, Dados e GDD',
              desc: 'Escreva código de verdade: manipule dados JSON, valide requisitos do GDD e calcule orçamento de assets do pipeline de renderização.',
              icon: '🐍', src: 'atividades/cod-linguagens-pratica.html',
              progressKey: 'cod_linguagens_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'cod-seguranca-debug',
          label: 'Segurança da Informação e Debugging',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre os pilares CID, permissões de acesso, Watch/Call Stack e manipulação de dados externos.',
          capacidade: 'Reconhecer os pilares e os níveis hierárquicos de segurança da informação / Reconhecer e aplicar processos de depuração (debugging) e tratamento de erros / Aplicar técnicas de conversão e manipulação de dados e arquivos externos.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Segurança da Informação e Debugging',
              desc: 'Pilares CID (Confidencialidade, Integridade, Disponibilidade), permissões de acesso, ferramentas Watch e Call Stack do debugger, e manipulação de dados externos sem recompilar.',
              icon: '🐞', src: 'atividades/cod-seguranca-debug-teoria.html',
              progressKey: 'cod_seguranca_debug_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Codificação: Segurança e Debugging',
              desc: 'Escreva código de verdade: valide permissões, trate erros com segurança e manipule dados externos sem quebrar o jogo.',
              icon: '🔐', src: 'atividades/cod-seguranca-debug-pratica.html',
              progressKey: 'cod_seguranca_debug_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'cod-poo',
          label: 'POO, Componentes e Multimídia',
          desc: 'Aprenda a teoria e depois escreva código de verdade sobre classes/instâncias, encapsulamento, componentes desacoplados, frameworks e triggers.',
          capacidade: 'Aplicar técnicas e métodos de desenvolvimento utilizando Programação Orientada a Objetos (POO) e Programação Orientada a Componentes / Aplicar linguagem de programação no uso de frameworks e integração multimídia.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — POO, Componentes e Multimídia',
              desc: 'Classes e instâncias, encapsulamento, Programação Orientada a Componentes, frameworks/documentação técnica e triggers de integração multimídia.',
              icon: '🐞', src: 'atividades/cod-poo-teoria.html',
              progressKey: 'cod_poo_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Codificação: POO, Componentes e Multimídia',
              desc: 'Escreva funções e classes JS de verdade, rodando contra casos de teste: instâncias, encapsulamento, componentes, herança e triggers.',
              icon: '👾', src: 'atividades/cod-poo-pratica.html',
              progressKey: 'cod_poo_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'cod-agil-clean',
          label: 'Metodologia Ágil e Clean Code',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre Kanban, live coding, DRY, refatoração/modularização e documentação técnica.',
          capacidade: 'Aplicar metodologias ágeis e resolução de problemas técnicos / Aplicar boas práticas de desenvolvimento (Clean Code) e documentação de projetos com rastreabilidade.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Metodologia Ágil e Clean Code',
              desc: 'Sprint e quadro Kanban, live coding colaborativo, princípio DRY, refatoração/modularização e docstrings de documentação técnica.',
              icon: '🐞', src: 'atividades/cod-agil-clean-teoria.html',
              progressKey: 'cod_agil_clean_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Codificação: Metodologia Ágil e Clean Code',
              desc: 'Escreva código de verdade aplicando Clean Code: elimine repetição (DRY), nomeie constantes e refatore sem quebrar o comportamento.',
              icon: '📋', src: 'atividades/cod-agil-clean-pratica.html',
              progressKey: 'cod_agil_clean_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'cod-seguranca-ia',
          label: 'Segurança no Código e IA com Grafos',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre validação de inputs, grafos de waypoints, algoritmos de busca, árvores de decisão e máquinas de estado.',
          capacidade: 'Aplicar boas práticas de segurança da informação no código / Aplicar estruturas de dados avançadas (Grafos e Árvores de Decisão) para lógica e IA.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Segurança no Código e IA com Grafos',
              desc: 'Validação de inputs contra injeções maliciosas, grafos de waypoints, algoritmos de busca em grafos, árvores de decisão e máquinas de estado pra IA de NPCs.',
              icon: '🐞', src: 'atividades/cod-seguranca-ia-teoria.html',
              progressKey: 'cod_seguranca_ia_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Codificação: Segurança no Código e IA com Grafos',
              desc: 'Escreva código de verdade: valide inputs, navegue grafos de waypoints e programe a decisão/estado de um NPC.',
              icon: '🕸️', src: 'atividades/cod-seguranca-ia-pratica.html',
              progressKey: 'cod_seguranca_ia_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'cod-godot',
          label: 'Motor Godot: Construa o Pacman',
          desc: 'Construa um Pacman completo dentro do editor da Godot — do projeto vazio ao jogo rodando, sem nenhum sprite pronto, tudo desenhado por código — e só depois responda perguntas sobre as decisões técnicas por trás do que você mesmo construiu.',
          capacidade: 'Estruturar um projeto completo em Godot 4 (nós, cenas, Autoload/singleton, GDScript) pra implementar um jogo funcional, aplicando movimentação em grade, detecção de colisão por célula, máquina de estados simples (perseguir/assustado) e organização de projeto em várias cenas e scripts.',
          // Trilha reformulada em cima de um roteiro único (pacman-godot-completo.md,
          // na raiz do repositório): a prática vem primeiro, sem trava — o aluno
          // constrói o jogo de verdade fora do portal, na Godot — e só o visto do
          // professor libera a teoria (requires), que revisa as decisões técnicas
          // do próprio projeto que ele construiu.
          modules: [
            {
              key: 'pratica', title: 'Prática — Construa o Pacman no Godot',
              desc: 'Mão na massa de verdade: monte o projeto do zero no editor da Godot — 5 scripts, Autoload, montagem da cena — até o jogo completo rodando, com labirinto, pastilhas, power pellets e fantasmas — depois peça o visto do professor.',
              icon: '🎮', src: 'atividades/cod-godot-pratica.html',
              progressKey: 'cod_godot_pratica_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'teoria', title: 'Teoria — Motor Godot: o Pacman por trás do código',
              desc: 'Autoload/singleton, _draw() e queue_redraw(), movimento em grade sem colisão física, ordem de _ready() entre pai e filhos, trava de delta, máquina de estado dos fantasmas e organização da árvore de nós — tudo revisado a partir do jogo que você acabou de construir.',
              icon: '🐞', src: 'atividades/cod-godot-teoria.html',
              progressKey: 'cod_godot_teoria_progress_', progressMode: 'flag',
              requires: 'pratica', hasSlides: true, hasGabarito: true
            }
          ]
        },
        {
          key: 'cod-phaser',
          label: 'Motor Phaser: Construa o Pacman',
          desc: 'Construa um Pacman completo com a biblioteca Phaser — HTML, JavaScript e sprites desenhados por você no Piskel, rodando de verdade no navegador a partir do seu Codespace.',
          capacidade: 'Estruturar um projeto completo com uma biblioteca de jogos (Phaser 3) e JavaScript pra implementar um jogo funcional, aplicando spritesheets e animações, física arcade (colisão e overlap), grupos de objetos e eventos de teclado, além de produzir a arte do jogo numa ferramenta de pixel art (Piskel) e rodar o projeto num ambiente de desenvolvimento em nuvem (Codespaces).',
          // Trilha em paralelo à 'cod-godot': mesmo jogo (Pacman), mesmo
          // formato de roteiro prático com visto do professor (sem trava,
          // sem teoria separada — ver pacman-phaser-completo.md, na raiz
          // do repositório, pro roteiro de referência em sincronia com
          // atividades/cod-phaser-pratica.html), mas em Phaser 3/JavaScript
          // em vez de Godot/GDScript, com sprites de verdade desenhados
          // pelo aluno no Piskel em vez de tudo desenhado por código.
          modules: [
            {
              key: 'pratica', title: 'Prática — Construa o Pacman no Phaser',
              desc: 'Mão na massa de verdade: monte os arquivos do zero no Codespace, ligue a biblioteca Phaser, desenhe o Pacman e o fantasma no Piskel, cole o código em blocos explicados até o jogo completo rodando no navegador — depois peça o visto do professor.',
              icon: '👻', src: 'atividades/cod-phaser-pratica.html', telaCheia: true,
              progressKey: 'cod_phaser_pratica_progress_', progressMode: 'flag',
              hasGabarito: true
            }
          ]
        },
        {
          key: 'projeto-cobrinha',
          label: 'Projeto: Construa seu Jogo',
          desc: 'Saia do zero e construa, peça por peça, um jogo de Cobrinha de verdade — direto aqui no portal.',
          capacidade: 'Aplicar, de forma integrada, lógica de programação, estruturas de dados e eventos de teclado na construção de um jogo completo em JavaScript.',
          modules: [
            {
              key: 'construcao', title: 'Construa seu Jogo: Cobrinha',
              desc: 'A PixelForge Studios te contratou! Cada desafio resolvido entra ao vivo no seu jogo. No final, apresente o jogo pronto pro professor.',
              icon: '🐍', src: 'atividades/cobrinha-construcao.html',
              progressKey: 'cobrinha_construcao_progress_', progressMode: 'flag',
              hasGabarito: true
            }
          ]
        }
      ]
    },
    {
      key: 'fundamentos-programacao',
      label: 'Fundamentos de Programação de Jogos',
      trilhas: [
        {
          key: 'fund-ambiente',
          label: 'Ambiente e Ferramentas de Desenvolvimento',
          desc: 'Aprenda a teoria e depois resolva chamados sobre instalação, engines, editor/compilador e bibliotecas.',
          capacidade: 'Reconhecer os procedimentos de preparação de ambiente de programação / Reconhecer as diferentes linguagens de programação utilizadas conforme a plataforma do jogo a ser produzido.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Ambiente e Ferramentas de Desenvolvimento',
              desc: 'O que compõe um jogo 2D, instalação do ambiente, engines, editor x compilador, linguagem por plataforma e bibliotecas de apoio.',
              icon: '🦈', src: 'atividades/fund-ambiente-teoria.html',
              progressKey: 'fund_ambiente_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Suporte: Ambiente e Ferramentas',
              desc: 'Resolva chamados escolhendo a plataforma, ferramenta ou biblioteca certa pra cada cenário.',
              icon: '🛠️', src: 'atividades/fund-ambiente-pratica.html',
              progressKey: 'fund_ambiente_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'fund-logica',
          label: 'Lógica e Algoritmos para Jogos 2D',
          desc: 'Aprenda a teoria e depois resolva chamados sobre game loop, coordenadas, cenário, cores e física básica.',
          capacidade: 'Reconhecer técnicas e algoritmos utilizados na programação de elementos em jogos.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Lógica e Algoritmos para Jogos 2D',
              desc: 'Game loop, sistema de coordenadas 2D, cenário como matriz de tiles, sistema de cores (RGBA) e física básica (gravidade, colisão).',
              icon: '🦈', src: 'atividades/fund-logica-teoria.html',
              progressKey: 'fund_logica_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Suporte: Lógica e Algoritmos',
              desc: 'Escreva código de verdade: coordenadas, matriz de cenário, mistura de cor e física básica de jogo.',
              icon: '🧮', src: 'atividades/fund-logica-pratica.html',
              progressKey: 'fund_logica_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'fund-prog2d',
          label: 'Programação de Jogos 2D na Prática',
          desc: 'Aprenda a teoria e depois resolva chamados sobre movimentação, colisão, eventos e ciclo de vida de objetos.',
          capacidade: 'Utilizar linguagem de programação para desenvolvimento de jogos digitais 2D.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Programação de Jogos 2D na Prática',
              desc: 'Movimentação com teclado e mouse, colisores, fluxo de eventos, estrutura do código e criação/atualização/remoção de objetos.',
              icon: '🦈', src: 'atividades/fund-prog2d-teoria.html',
              progressKey: 'fund_prog2d_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Suporte: Programação de Jogos 2D',
              desc: 'Escreva código de verdade: movimentação, colisão, eventos e controle de objetos do jogo.',
              icon: '🕹️', src: 'atividades/fund-prog2d-pratica.html',
              progressKey: 'fund_prog2d_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'fund-multimidia',
          label: 'Multimídia e Versionamento',
          desc: 'Aprenda a teoria e depois resolva chamados sobre sprites, assets, áudio e versionamento de código.',
          capacidade: 'Reconhecer os processos de integração de elementos de multimídia / Reconhecer métodos de versionamento aplicados na produção de jogos.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Multimídia e Versionamento',
              desc: 'Inserção de sprites, organização de assets gráficos, integração de áudio e versionamento de código com Git.',
              icon: '🦈', src: 'atividades/fund-multimidia-teoria.html',
              progressKey: 'fund_multimidia_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Suporte: Multimídia e Versionamento',
              desc: 'Resolva chamados de sprites, organização de assets, áudio e versionamento com Git.',
              icon: '🎬', src: 'atividades/fund-multimidia-pratica.html',
              progressKey: 'fund_multimidia_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'js',
          label: 'JavaScript',
          desc: 'Escolha um módulo de desafios para praticar.',
          modules: [
            {
              key: 'basico', title: 'Básico — Desafios de JavaScript',
              desc: 'Vença cada adversário em ordem para avançar. Derrotar um duelo libera o próximo.',
              icon: '🟨', src: 'atividades/js-basico.html',
              progressKey: 'js_basico_progress_', progressTotal: 10,
              hasGabarito: true
            },
            {
              key: 'intermediario', title: 'Intermediário — Desafios de JavaScript',
              desc: 'Vença cada adversário em ordem para avançar. Derrotar um duelo libera o próximo.',
              icon: '🟧', src: 'atividades/js-intermediario.html',
              progressKey: 'js_intermediario_progress_', progressTotal: 18,
              hasGabarito: true
            }
          ]
        },
        {
          key: 'csharp',
          label: 'C#',
          desc: 'Aprenda a história do C#, compare a sintaxe dele com o JavaScript que você já viu e pratique escrevendo código C# de verdade.',
          capacidade: 'Reconhecer a origem, o propósito e o contexto de uso da linguagem C# no desenvolvimento de jogos, comparando sua sintaxe básica (variáveis, constantes, funções, condicionais e laços) com a do JavaScript.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Introdução ao C#',
              desc: 'História do C#, por que foi criado, por que é tão usado em jogos (Unity), principais pontos positivos/negativos e jogos famosos feitos com ele.',
              icon: '🐞', src: 'atividades/csharp-teoria.html',
              progressKey: 'csharp_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'comparacao', title: 'Comparação — JavaScript vs C#',
              desc: 'Compare a sintaxe de variável, constante, função, if/else e laço entre JS e C#, um conceito por vez.',
              icon: '🔀', src: 'atividades/csharp-comparacao.html',
              progressKey: 'csharp_comparacao_progress_', progressMode: 'flag',
              requires: 'teoria'
            },
            {
              key: 'pratica-simples', title: 'Prática — JavaScript vs C#',
              desc: 'Escreva C# de verdade: criar variável, texto, as 4 operações básicas, resto da divisão, valor oposto e combinar operações.',
              icon: '🟢', src: 'atividades/csharp-pratica-simples.html',
              progressKey: 'csharp_pratica_simples_progress_', progressTotal: 9,
              requires: 'comparacao', hasGabarito: true
            },
            {
              key: 'desafios', title: 'Prática — Desafios de C#',
              desc: 'Vença cada desafio em ordem para avançar: variável, Console.WriteLine, constante, função, if/else e for.',
              icon: '🟣', src: 'atividades/csharp-desafios-pratica.html',
              progressKey: 'csharp_desafios_progress_', progressTotal: 14,
              requires: 'pratica-simples', hasGabarito: true
            }
          ]
        },
        {
          key: 'gdscript',
          label: 'GDScript',
          desc: 'Aprenda a história do GDScript, compare a sintaxe dele com o JavaScript/C# que você já viu e pratique escrevendo código GDScript de verdade.',
          capacidade: 'Reconhecer a origem, o propósito e o contexto de uso da linguagem GDScript no desenvolvimento de jogos, comparando sua sintaxe básica (variáveis, constantes, funções, condicionais e laços) com a do JavaScript e do C#.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Introdução ao GDScript',
              desc: 'História do GDScript, por que foi criado (integração nativa com a Godot), principais pontos positivos/negativos e jogos famosos feitos com ele.',
              icon: '🤖', src: 'atividades/gdscript-teoria.html',
              progressKey: 'gdscript_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'comparacao', title: 'Comparação — JS/C# vs GDScript',
              desc: 'Compare a sintaxe de variável, constante, função, if/else e laço entre JavaScript, C# e GDScript, um conceito por vez.',
              icon: '🔀', src: 'atividades/gdscript-comparacao.html',
              progressKey: 'gdscript_comparacao_progress_', progressMode: 'flag',
              requires: 'teoria'
            },
            {
              key: 'pratica-simples', title: 'Prática — GDScript Simples',
              desc: 'Escreva GDScript de verdade: criar variável, texto, as 4 operações básicas, resto da divisão, valor oposto e combinar operações.',
              icon: '🟢', src: 'atividades/gdscript-pratica-simples.html',
              progressKey: 'gdscript_pratica_simples_progress_', progressTotal: 9,
              requires: 'comparacao', hasGabarito: true
            },
            {
              key: 'desafios', title: 'Prática — Desafios de GDScript',
              desc: 'Vença cada desafio em ordem para avançar: variável, print, constante, função, if/else e for.',
              icon: '🟣', src: 'atividades/gdscript-desafios-pratica.html',
              progressKey: 'gdscript_desafios_progress_', progressTotal: 14,
              requires: 'pratica-simples', hasGabarito: true
            },
            {
              key: 'cenarios', title: 'Prática — Cenários de Jogo (GDScript)',
              desc: 'Aplique variável, if/else e função em situações reais de jogo: movimento, colisão, ataque e defesa — 15 desafios, do mais simples ao mais completo.',
              icon: '🎮', src: 'atividades/gdscript-cenarios-pratica.html',
              progressKey: 'gdscript_cenarios_progress_', progressTotal: 15,
              requires: 'desafios', hasGabarito: true
            }
          ]
        },
        {
          // Trilha individual, adaptada — só aparece pro aluno listado em
          // visibleFor (professor sempre vê, pra acompanhar/gerar gabarito).
          // Ver trilhaStatus() em shared/platform-core.js.
          key: 'js-adaptado-engel',
          label: 'JavaScript Básico (Engel)',
          desc: 'Escolha um módulo para começar.',
          visibleFor: ['engel.fraga'],
          modules: [
            {
              key: 'basico', title: 'JavaScript Básico — Adaptado',
              desc: '15 passos curtos, com palavras que ele já conhece (gato, cachorro, moto, carro...): guardar número, somar, subtrair, comparar, decidir, multiplicar, dividir, sobra, juntar, decidir de novo, menor, igual, maior ou igual, nomes iguais, entrada certa.',
              icon: '🟢', src: 'atividades/js-basico-adaptado-engel.html',
              progressKey: 'js_basico_adaptado_engel_progress_', progressTotal: 15,
              hasGabarito: true
            }
          ]
        },
        {
          key: 'csharp-adaptado-engel',
          label: 'C# Básico (Engel)',
          desc: 'Escolha um módulo para começar.',
          visibleFor: ['engel.fraga'],
          modules: [
            {
              key: 'basico', title: 'C# Básico — Adaptado',
              desc: '5 passos curtos, mesma ideia da trilha C# principal só que com "caixa" no lugar de variável e "objeto dentro da caixa" no lugar de valor: guardar número, somar, subtrair, multiplicar, dividir — com as mesmas palavras conhecidas (gato, cachorro, moto, carro...).',
              icon: '🔵', src: 'atividades/csharp-basico-adaptado-engel.html',
              progressKey: 'csharp_basico_adaptado_engel_progress_', progressTotal: 5,
              hasGabarito: true
            }
          ]
        },
        {
          // Trilha individual, adaptada — versão do Engel pra "Lógica e
          // Algoritmos para Jogos 2D" (fund-logica, mesma matéria). Em vez
          // de conceitos abstratos de programação (game loop, delta time),
          // trabalha raciocínio lógico com jogos de correlação visual —
          // "dados 3 itens que seguem um padrão, qual é o próximo?" — a
          // pedido do professor. Mesmo motor/estilo das outras atividades
          // adaptadas dele (emoji grande, clique único, sem trava de
          // digitação, sempre com a PALAVRA junto do emoji nas opções pra
          // reforçar leitura, não só reconhecimento visual).
          key: 'logica-adaptado-engel',
          label: 'Lógica (Engel)',
          desc: 'Escolha um módulo para começar.',
          visibleFor: ['engel.fraga'],
          modules: [
            {
              key: 'jogo', title: 'Lógica — Qual é o Próximo? — Adaptado',
              desc: '15 quebra-cabeças de correlação (3 itens em emoji + palavra, escolha entre 4 opções qual continua o padrão) — nível 1: mesmo grupo (frutas, animais...); nível 2: sequência que aumenta (1, 2, 3 → 4); nível 3: regra dupla, mesmo grupo E mesma letra inicial (ex.: Basquete, Bicicleta, Barco → Beisebol).',
              icon: '🧠', src: 'atividades/logica-engel.html',
              progressKey: 'logica_engel_progress_', progressTotal: 15,
              hasGabarito: true
            }
          ]
        }
      ]
    },
    {
      key: 'testes-jogos', label: 'Testes de Jogos Digitais',
      trilhas: [
        {
          key: 'teste-fundamentos',
          label: 'Fundamentos e Níveis de Teste',
          desc: 'Aprenda a teoria e depois resolva chamados sobre tipos de teste, técnicas caixa-preta/caixa-branca e níveis de Unidade a Aceitação.',
          capacidade: 'Identificar tipos, função, ferramentas de teste de acordo com o sistema de jogos digitais / Reconhecer normas, métodos e técnicas de testes para correção de falhas de sistema.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Fundamentos e Níveis de Teste',
              desc: 'Conceito de teste de jogos, processo fundamental, tipos (Funcionalidade, Confiabilidade, Desempenho, Manutenibilidade), técnicas caixa-preta/caixa-branca, níveis (Unidade, Integração, Sistema, Aceitação) e comunicação não violenta ao reportar bugs.',
              icon: '🔍', src: 'atividades/teste-fundamentos-teoria.html',
              progressKey: 'teste_fundamentos_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de QA: Fundamentos e Níveis de Teste',
              desc: 'Resolva chamados classificando tipo, técnica e nível de teste em cada cenário.',
              icon: '🧪', src: 'atividades/teste-fundamentos-pratica.html',
              progressKey: 'teste_fundamentos_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'teste-planejamento',
          label: 'Planejamento de Testes',
          desc: 'Aprenda a teoria e depois resolva chamados sobre escopo, critérios de aceite, casos de teste, cronograma, teste de mesa, priorização e rastreabilidade.',
          capacidade: 'Analisar documentação de teste para planejamento da rotina / Reconhecer os elementos de um plano de testes.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Planejamento de Testes',
              desc: 'Escopo, critérios de aceite, casos de teste, cronograma e responsáveis, teste de mesa, priorização, rastreabilidade, comunicação não violenta e plano de testes como documento vivo.',
              icon: '🔍', src: 'atividades/teste-planejamento-teoria.html',
              progressKey: 'teste_planejamento_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de QA: Planejamento de Testes',
              desc: 'Resolva chamados identificando qual peça do plano de testes está faltando em cada cenário da PixelForge.',
              icon: '📋', src: 'atividades/teste-planejamento-pratica.html',
              progressKey: 'teste_planejamento_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'teste-execucao',
          label: 'Execução de Testes por Versão',
          desc: 'Aprenda a teoria e depois resolva chamados sobre o ciclo Alfa/Beta/Release Candidate/Gold, frameworks de teste, ambiente de testes, roteiro de execução e critério de avanço.',
          capacidade: 'Desenvolver plano de testes / Organizar o ambiente para o desenvolvimento das rotinas de testes / Definir roteiro de teste para execução, conforme recomendações técnicas.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Execução de Testes por Versão',
              desc: 'Ciclo Alfa → Beta → Release Candidate → Gold, frameworks de teste, ambiente de testes separado da produção, roteiro de execução reproduzível, reteste e critério de avanço entre fases.',
              icon: '🔍', src: 'atividades/teste-execucao-teoria.html',
              progressKey: 'teste_execucao_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de QA: Execução de Testes por Versão',
              desc: 'Resolva chamados identificando a fase do ciclo de versão, frameworks de teste, roteiro de execução, reteste e critério de avanço em cada cenário.',
              icon: '🚀', src: 'atividades/teste-execucao-pratica.html',
              progressKey: 'teste_execucao_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          // Trilha "pesquisa e entrega pro professor" — mesmo padrão de
          // turmas/sistemas/config.js (trilha 'modelagem-dados-requisitos'):
          // o "trabalho" não tem correção automática (o produto é um PDF
          // enviado por e-mail, confirmado com o visto do professor) e só
          // libera o "questionário" (com trava anti-cola de
          // shared/exam-proctor.js) depois desse visto.
          key: 'teste-roteiros-avancados',
          label: 'Roteiros de Teste: Certificação, Plataforma e Publicação',
          desc: 'Pesquise sobre certificação técnica, testes de plataforma, Smoke Test, teste exploratório, teste de regressão e teste de performance, monte slides explicando cada um e entregue pro professor por e-mail antes de responder o questionário.',
          capacidade: 'Definir roteiro de teste para execução, conforme recomendações técnicas / Identificar problemas de sistemas por meio de aplicação de teste.',
          modules: [
            {
              key: 'trabalho', title: 'Trabalho — Roteiros de Teste (Certificação, Plataforma e Publicação)',
              desc: 'Pesquise sobre os 6 tipos de teste (certificação de console, plataforma/resolução, Smoke Test, teste exploratório, teste de regressão e teste de performance) e monte slides explicando nome, onde se aplica e por quê de cada um — entregue por e-mail pro professor.',
              icon: '🖼️', src: 'atividades/teste-roteiros-trabalho.html',
              progressKey: 'teste_roteiros_trabalho_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'questionario', title: 'Questionário — Roteiros de Teste',
              desc: '19 perguntas sobre os 6 tipos de teste — incluindo 4 bugs reais mostrados na gameplay de GTA 6, pra você relacionar qual teste pegaria cada um antes do lançamento. Só libera depois do visto do trabalho.',
              icon: '📝', src: 'atividades/teste-roteiros-questionario.html',
              progressKey: 'teste_roteiros_questionario_progress_', progressMode: 'flag',
              requires: 'trabalho', hasSlides: true, hasGabarito: true
            }
          ]
        },
        {
          // Trilha individual, adaptada — só aparece pro aluno listado em
          // visibleFor (professor sempre vê, pra acompanhar/gerar gabarito).
          // Ver trilhaStatus() em shared/platform-core.js.
          //
          // 2ª versão, mais fácil ainda (a pedido do professor): a 1ª pedia
          // pro Engel testar o Campo Minado e escrever os próprios
          // resultados — ainda exigia decidir o que escrever. Aqui o
          // "assunto" de cada slide (título + cor + texto) já vem PRONTO —
          // a habilidade sendo treinada vira só a MECÂNICA de montar slide
          // no Canva (criar título, criar texto, pintar a fonte do título
          // numa cor, uma cor por slide). Não pede mais pra testar nada:
          // só ler e digitar (sem copiar/colar — ver bloqueio próprio no
          // fim de atividades/teste-roteiros-trabalho-engel.html). A
          // capacidade MSEP da trilha regular equivalente
          // ('teste-roteiros-avancados') fica só como pano de fundo do
          // conteúdo dos slides (nomeia os 2 tipos de teste); o foco real
          // da adaptação é a habilidade de criar slides. Ver estrutura.txt,
          // seção 7.
          key: 'teste-roteiros-engel',
          label: 'Roteiros de Teste (Engel)',
          desc: 'Escolha um módulo para começar.',
          visibleFor: ['engel.fraga'],
          modules: [
            {
              key: 'trabalho', title: 'Criar Slides no Canva (Adaptado)',
              desc: '10 slides (capa + os 4 tipos de teste do trabalho regular, 2 slides cada + encerramento) com título, cor da fonte e texto já prontos — você só digita (sem copiar/colar) e entrega pro professor.',
              icon: '🖼️', src: 'atividades/teste-roteiros-trabalho-engel.html',
              progressKey: 'teste_roteiros_trabalho_engel_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              // Questionário simples de cor→título, usando as mesmas 8
              // cores/títulos dos slides de "trabalho" acima (só os 4 tipos
              // de teste, 2 slides cada — capa/encerramento ficam de fora
              // porque repetem a cor Verde-água com título diferente). Sem
              // trava anti-cola nem visto do professor: conclui sozinho ao
              // fim das 8 perguntas.
              key: 'questionario', title: 'Questionário — Cor e Título (Adaptado)',
              desc: '8 perguntas: você vê uma cor (igual às dos slides que você criou) e escolhe, entre 4 opções, qual título usa essa cor. Só libera depois do visto do trabalho.',
              icon: '🎨', src: 'atividades/teste-roteiros-questionario-engel.html',
              progressKey: 'teste_roteiros_questionario_engel_progress_', progressMode: 'flag',
              requires: 'trabalho', hasGabarito: true
            }
          ]
        }
      ]
    },
    {
      // Matéria dedicada, inteira restrita a um único aluno (materia.
      // visibleFor — ver isMateriaVisibleToEmail em shared/platform-core.js).
      // Diferente das outras trilhas individuais do Engel (que ficam DENTRO
      // de uma matéria compartilhada, ex.: 'js-adaptado-engel' dentro de
      // "Fundamentos de Programação"), esta matéria não corresponde a
      // nenhum conteúdo regular da turma — por isso o card dela também
      // precisa ficar escondido pros outros alunos (só a trilha não bastava,
      // deixaria o CARD "Em breve" vazando o nome/existência da adaptação
      // pra turma toda). O professor sempre vê, pra acompanhar/gerar
      // gabarito.
      key: 'comunicacao-engel', label: 'Comunicação (Engel)', visibleFor: ['engel.fraga'],
      trilhas: [
        {
          key: 'frases-engel',
          label: 'Formar Frases',
          desc: 'Escolha um módulo para começar.',
          visibleFor: ['engel.fraga'],
          modules: [
            {
              key: 'jogo', title: 'Formar Frases — Associação de Palavras',
              desc: '15 frases (clicando, sem digitar) pra completar com a palavra certa, sempre com emoji grande de pista — começa com 2 palavras e vai crescendo até 4.',
              icon: '🧩', src: 'atividades/frases-engel.html',
              progressKey: 'frases_engel_progress_', progressTotal: 15,
              hasGabarito: true
            },
            {
              key: 'jogo-avancado', title: 'Formar Frases — Avançado',
              desc: '15 frases mais difíceis: agora falta mais de 1 palavra por frase (até 3, na ordem certa), e a pista de cada uma só aparece quando chega a vez dela.',
              icon: '🧠', src: 'atividades/frases-avancado-engel.html',
              progressKey: 'frases_engel_avancado_progress_', progressTotal: 15,
              requires: 'jogo', hasGabarito: true
            },
            {
              key: 'jogo-nivel3', title: 'Formar Frases — Nível 3',
              desc: '15 frases no nível mais difícil: até 5 palavras faltando por frase (na ordem certa) e mais opções erradas misturadas no meio, pra descartar antes de achar a certa.',
              icon: '🔥', src: 'atividades/frases-nivel3-engel.html',
              progressKey: 'frases_engel_nivel3_progress_', progressTotal: 15,
              requires: 'jogo-avancado', hasGabarito: true
            },
            {
              key: 'jogo-digitar', title: 'Formar Frases — Digitando',
              desc: '15 frases pra digitar (não clicar) a palavra que falta, sempre com emoji grande de pista e botão de Dica (mostra a 1ª letra) — começa fácil, com 1 palavra por frase, e vai crescendo até 4.',
              icon: '⌨️', src: 'atividades/frases-digitar-engel.html',
              progressKey: 'frases_engel_digitar_progress_', progressTotal: 15,
              requires: 'jogo-nivel3', hasGabarito: true
            }
          ]
        },
        {
          // Versão adaptada, SOLO (sem sessão/multiplayer nenhum — nada de
          // Supabase além do progresso local de sempre), da "Corrida do
          // Bug" (games/corrida-do-bug.html): mesmo motor de plataforma do
          // Fuga do Bug, agora com as 10 fases em sequência (31 checkpoints
          // ao todo), mas cada checkpoint pede pra completar uma frase
          // (mesmo mecanismo/conteúdo de "Formar Frases" acima, repetido em
          // ciclo) em vez de responder um quiz — a pedido do professor, pra
          // manter a versão dele mais simples que a da turma toda.
          key: 'corrida-do-bug-engel',
          label: 'Corrida do Bug (Engel)',
          desc: 'Escolha um módulo para começar.',
          visibleFor: ['engel.fraga'],
          modules: [
            {
              key: 'jogo', title: 'Corrida do Bug — Adaptado',
              desc: 'Corra pelas 10 fases do Fuga do Bug até a bandeira final — em cada checkpoint, complete a frase certa (clicando, sem digitar) pra continuar. Errou? Volta pro checkpoint anterior.',
              icon: '🏁', src: 'atividades/corrida-do-bug-engel.html',
              progressKey: 'corrida_do_bug_engel_progress_', progressMode: 'flag',
              hasGabarito: true
            }
          ]
        }
      ]
    },
    {
      // Card "Projetos": projetos integradores em grupo. Mesmo padrão do
      // card Projetos da turma Sistemas — notaSoManual: true, sem nota
      // calculada. Em Lançar Notas o professor vê quanto cada aluno entregou
      // (módulos com visto) e digita a nota à mão. Ver README, "Matéria só
      // com nota manual". Trilhas novas seguem docs/padrao-trilhas.md (motor
      // de roteiro compartilhado shared/roteiro-slides.js, visto do professor).
      key: 'projetos', label: 'Projetos', icon: '🚀', notaSoManual: true,
      trilhas: [
        {
          // Projeto de Cibersegurança: a turma se divide em 4 grupos, cada um
          // com um tema. Cada grupo pesquisa, monta uma "explicação para
          // leigos" com exemplos reais e cria um joguinho no JSFiddle (gerado
          // com IA e revisado por eles) sobre o tema. Cada tema é um módulo
          // (card). Sem correção automática — visto do professor em cada um.
          key: 'cyberseguranca',
          label: 'Cibersegurança',
          desc: 'Projeto em grupo: cada grupo vira especialista em um tema de segurança digital, explica para leigos com exemplos reais e cria um joguinho no JSFiddle sobre o tema.',
          // TODO(professor): capacidade PROVISÓRIA — troque pelo texto exato
          // da capacidade MSEP antes de liberar pra turma (ver README, seção
          // "Trilha por capacidade (MSEP)": a capacidade não pode ser inventada).
          capacidade: 'Pesquisar e comunicar, de forma acessível, conceitos de segurança da informação, aplicando-os na construção de um pequeno artefato interativo com apoio de IA.',
          modules: [
            {
              key: 'hacker-etico', title: 'Grupo 1 — Hacker Ético',
              desc: 'Pentest, bug bounty e a diferença entre hacker ético e criminoso. Explicação para leigos + jogo "Ético ou Crime?" no JSFiddle.',
              icon: '🛡️', src: 'atividades/cyberseg-hacker-etico.html', telaCheia: true,
              progressKey: 'cyberseg_hacker_etico_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'engenharia-social', title: 'Grupo 2 — Engenharia Social',
              desc: 'Phishing, golpe do WhatsApp e os sinais de alerta de um golpe. Explicação para leigos + jogo "Golpe ou Confiável?" no JSFiddle.',
              icon: '🎭', src: 'atividades/cyberseg-engenharia-social.html', telaCheia: true,
              progressKey: 'cyberseg_engenharia_social_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'senhas-autenticacao', title: 'Grupo 3 — Senhas e Autenticação',
              desc: 'Senhas fortes, vazamentos e verificação em duas etapas. Explicação para leigos + medidor de força de senha no JSFiddle.',
              icon: '🔑', src: 'atividades/cyberseg-senhas-autenticacao.html', telaCheia: true,
              progressKey: 'cyberseg_senhas_autenticacao_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'malware-golpes', title: 'Grupo 4 — Malware e Golpes Digitais',
              desc: 'Vírus, ransomware e golpes do Pix. Explicação para leigos + jogo "Clico ou não clico?" no JSFiddle.',
              icon: '🐛', src: 'atividades/cyberseg-malware-golpes.html', telaCheia: true,
              progressKey: 'cyberseg_malware_golpes_progress_', progressMode: 'flag',
              hasGabarito: true
            }
          ]
        },
        {
          // Simulações de engenharia social (feitas em sala, no papel, com
          // dados fictícios) e o material do professor pra imprimir. Não são
          // entrega de nota do aluno, por isso semEntrega:true (não contam no
          // "fez tudo/parte/nada" — ver statusEntregaMateria em
          // shared/platform-core.js). As duas simulações são visíveis pra
          // turma (os participantes leem as regras); o material de impressão
          // só aparece pro professor (a própria página confere o papel).
          key: 'cyberseg-simulacoes',
          label: 'Simulações e material do professor',
          desc: 'Duas simulações de engenharia social feitas em sala (no papel, com dados fictícios) e o material do professor para imprimir.',
          capacidade: 'Reconhecer, na prática, táticas de engenharia social e desenvolver o hábito de confirmar antes de entregar dados ou credenciais.',
          semEntrega: true,
          modules: [
            {
              key: 'brincadeira-senha', title: 'Simulação — A Senha do Brinde',
              desc: 'Regras, limites e a conversa final da simulação em que um pedido "em nome do professor" tenta recolher os códigos fictícios do brinde.',
              icon: '🎟️', src: 'atividades/cyberseg-brincadeira-senha.html', telaCheia: true,
              progressKey: 'cyberseg_brincadeira_senha_progress_', progressMode: 'flag',
              semEntrega: true
            },
            {
              key: 'brincadeira-dados', title: 'Simulação — Os Dados da Ficha',
              desc: 'Regras, limites e a conversa final da simulação em que um pedido "oficial" tenta recolher os dados fictícios das fichas de personagem.',
              icon: '🪪', src: 'atividades/cyberseg-brincadeira-dados.html', telaCheia: true,
              progressKey: 'cyberseg_brincadeira_dados_progress_', progressMode: 'flag',
              semEntrega: true
            },
            {
              key: 'material-professor', title: 'Material do professor — Fichas para imprimir',
              desc: 'Só para o professor: gera 40 fichas fictícias (20 meninas e 20 meninos; nome, e-mail, CPF e nome da mãe inventados) e 40 códigos únicos do brinde, com impressão em paisagem.',
              icon: '🖨️', src: 'atividades/cyberseg-material-professor.html', telaCheia: true,
              progressKey: 'cyberseg_material_professor_progress_', progressMode: 'flag',
              semEntrega: true
            }
          ]
        }
      ]
    },
    {
      key: 'prova', label: 'Prova',
      trilhas: [
        {
          key: 'prova-diagnostica',
          label: 'Prova Diagnóstica',
          desc: 'Diagnóstico do conhecimento dos alunos em todas as matérias trabalhadas na turma — 20 questões sorteadas de um banco de 80 (teoria e prática), com 5 alternativas embaralhadas e trava anti-saída durante a prova.',
          // TODO(professor): capacidade PROVISÓRIA — esta prova é diagnóstica
          // (cobre várias capacidades de várias matérias ao mesmo tempo, pra
          // identificar o que a turma já domina e onde ainda falta reforço),
          // não uma única capacidade MSEP específica. Ajuste esse texto se
          // a coordenação pedir um enquadramento formal diferente.
          capacidade: 'Diagnóstico do conjunto de capacidades trabalhadas nas matérias do curso, pra identificar o que os alunos já dominam e onde ainda precisam de reforço.',
          modules: [
            {
              // Mesmo mecanismo de turmas/sistemas/atividades/prova-sistemas.html:
              // uma única tentativa oficial (sem "tentar de novo"), pontuação
              // final registrada pro professor conferir/lançar nota na
              // Gestão, e trava "sair da tela = advertência, saiu de novo =
              // bloqueio" via shared/exam-proctor.js. Desbloqueio: token de
              // 6 dígitos do professor (shared/professor-visto.js).
              key: 'prova', title: 'Prova Diagnóstica — Turma Jogos Digitais',
              desc: '20 questões (sorteadas de um banco de 80) cobrindo Projeto de Vida, Mundo do Trabalho, Introdução ao Desenvolvimento de Projetos, Codificação de Jogos, Fundamentos de Programação de Jogos e Testes de Jogos Digitais.',
              icon: '📋', src: 'atividades/prova-jogos.html',
              progressKey: 'prova_jogos_progress_', progressMode: 'flag',
              hasGabarito: true
            }
          ]
        },
        {
          // Atividade SEPARADA da Prova Diagnóstica acima — mesmo padrão já
          // usado pela turma Sistemas (ver turmas/sistemas/config.js):
          // preenche automaticamente a coluna "Prova Final" (nota3Label/
          // nota3TrilhaKey/nota3ActivityLocation no topo deste arquivo),
          // travada pro professor, em vez da coluna "Prova" (nota2, que
          // continua sendo só a Prova Diagnóstica, trilhas[0] desta matéria
          // — ver provaTrilhaKey() em shared/platform-core.js).
          key: 'prova-final',
          label: 'Prova Final',
          desc: 'Prova final teórica e prática cobrindo todas as matérias trabalhadas na turma — 30 questões sorteadas de um banco de 92 (sempre 20 teóricas e 10 práticas por aluno), com trava anti-saída.',
          capacidade: 'Avaliação final do conjunto de capacidades trabalhadas nas matérias do curso, incluindo a escrita de código de verdade (criar variável, somar valores, corrigir erros).',
          modules: [
            {
              // Mesmo mecanismo de bloqueio "sair da aba = advertência, saiu
              // de novo = bloqueio" (shared/exam-proctor.js) e mesmo token de
              // desbloqueio (shared/professor-visto.js) da Prova Diagnóstica.
              // A parte prática (JavaScript) usa o mesmo motor de sandbox
              // (`new Function`) da Prova Final da turma Sistemas, embutido
              // no fluxo sequencial de perguntas.
              key: 'prova-final', title: 'Prova Final — Turma Jogos Digitais',
              desc: '30 questões (sorteadas de um banco de 92): 20 teóricas cobrindo todas as matérias já trabalhadas, e 10 práticas — criar variável, fazer contas, comparar valores, mexer em listas e corrigir trechos de código com erro, direto no editor.',
              icon: '📝', src: 'atividades/prova-final-jogos.html',
              progressKey: 'prova_final_jogos_progress_', progressMode: 'flag',
              hasGabarito: true
            }
          ]
        },
        {
          // Trilha individual, adaptada — visível só pro Engel (e sempre pro
          // professor). Não reaproveita o motor da prova padrão (banco
          // grande, sorteio, 5 alternativas, trava anti-saída de aba): usa
          // o mesmo motor leve das outras atividades adaptadas dele (ver
          // teste-roteiros-questionario-engel.html) — lista curta e fixa de
          // 15 perguntas, 3 alternativas cada, sem trava nenhuma, conclui
          // sozinha. Cobre só as 3 trilhas dele que têm resposta certa/
          // errada de verdade (JavaScript Básico, Roteiros de Teste e
          // Formar Frases) — "Ponto de Virada"/"A Jornada do Lucas" ficam de
          // fora por serem narrativas sem certo ou errado.
          key: 'prova-diagnostica-engel',
          label: 'Prova Diagnóstica (Engel)',
          desc: 'Revisão adaptada do que o Engel já aprendeu: JavaScript Básico, Roteiros de Teste e Formar Frases — 15 perguntas curtas, 3 alternativas cada, com trava anti-saída de tela.',
          visibleFor: ['engel.fraga'],
          capacidade: 'Diagnóstico adaptado do conjunto de capacidades trabalhadas nas trilhas individuais do Engel, pra identificar o que ele já domina e onde ainda precisa de reforço.',
          modules: [
            {
              key: 'prova', title: 'Prova Diagnóstica (Engel)',
              desc: '15 perguntas (3 alternativas cada, com trava anti-saída de tela) cobrindo JavaScript Básico, Roteiros de Teste e Formar Frases.',
              icon: '📋', src: 'atividades/prova-jogos-engel.html',
              progressKey: 'prova_jogos_engel_progress_', progressMode: 'flag',
              hasGabarito: true
            }
          ]
        },
        {
          // Trilha individual, adaptada — visível só pro Engel (e sempre pro
          // professor). "Prova Final" pra ele: as trilhas narrativas dele
          // ("Ponto de Virada"/"A Jornada do Lucas") não têm certo ou
          // errado, e o conteúdo técnico das trilhas que têm (JS Básico,
          // Roteiros de Teste, Formar Frases) já foi coberto na Prova
          // Diagnóstica (Engel) acima — então essa avaliação final é
          // PURAMENTE de raciocínio lógico (sequências de palavras — mesma
          // letra, categoria, rima ou ordem —, relacionar cores, posição
          // de objetos, e variável/constante como metáfora visual — a
          // caixa 📦 que troca de valor e o cofre 🔒 que trava o valor pra
          // sempre, nunca código de verdade), sem repetir conteúdo técnico.
          // Mesmo motor/trava leve da Prova Diagnóstica (Engel) — ver
          // atividades/prova-final-engel.html. Diferente da Prova Final da
          // turma toda, NÃO alimenta a coluna "Prova Final" (nota3)
          // automaticamente — cfg.nota3ActivityLocation aponta só pro
          // progress_key da prova padrão (prova_final_jogos); o professor
          // lança a nota dele manualmente com base no gabarito, mesmo
          // esquema que já vale pra "Prova" (nota2) da Prova Diagnóstica
          // (Engel), que também não é automática.
          key: 'prova-final-engel',
          label: 'Prova Final (Engel)',
          desc: 'Avaliação final adaptada, só de raciocínio lógico: sequências de palavras (mesma letra, categoria, rima ou ordem), relacionar cores, posição de objetos, variáveis (a caixa 📦 que troca de valor) e constante (o cofre 🔒 que trava o valor) — 27 desafios, nível subindo aos poucos, 3 alternativas cada, com trava anti-saída de tela.',
          visibleFor: ['engel.fraga'],
          capacidade: 'Avaliação final adaptada do raciocínio lógico (indução de padrão em sequências, associação de cores, relações espaciais/posição, e o conceito de variável/constante — guardar, substituir ou travar um valor), no lugar do conteúdo técnico já coberto nas outras trilhas dele.',
          modules: [
            {
              key: 'prova', title: 'Prova Final (Engel)',
              desc: '27 desafios de lógica, dificuldade subindo aos poucos (3 alternativas cada, com trava anti-saída de tela) — sequências de palavras, cores, posição de objetos, variáveis (📦) e constante (🔒).',
              icon: '🧩', src: 'atividades/prova-final-engel.html',
              progressKey: 'prova_final_jogos_engel_progress_', progressMode: 'flag',
              hasGabarito: true
            }
          ]
        }
      ]
    }
  ],

  // Insígnias da trilha "Curso de Jogos Digitais" (ver aba Perfil, só
  // aluno). Progressivas por % geral de conclusão (student_module_progress)
  // — minPct:0 é tratada à parte em platform-core.js (exige progresso real,
  // não só "0% arredondado"). Sem tabela nova no Supabase: é só uma leitura
  // derivada do progresso que já é sincronizado.
  insignias: [
    { key: 'iniciante', label: 'Iniciante', desc: 'Deu o primeiro passo no mundo dos jogos!', icon: '🚀', minPct: 0 },
    { key: 'explorador', label: 'Explorador', desc: 'Explorou novas ferramentas e mecânicas!', icon: '💚', minPct: 20 },
    { key: 'criador', label: 'Criador', desc: 'Criou seu primeiro jogo do começo ao fim!', icon: '🎮', minPct: 40 },
    { key: 'desafiador', label: 'Desafiador', desc: 'Superou desafios e levou suas habilidades além!', icon: '🏆', minPct: 60 },
    { key: 'mestre-dos-jogos', label: 'Mestre dos Jogos', desc: 'Domina as mecânicas e pensa como um Game Designer!', icon: '⚔️', minPct: 80 },
    { key: 'lendario', label: 'Lendário', desc: 'Criatividade, técnica e paixão pelos jogos em outro nível!', icon: '🐉', minPct: 100 }
  ]
};
