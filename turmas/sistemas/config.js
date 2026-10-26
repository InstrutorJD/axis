// Matérias/trilhas/módulos da turma Sistemas (11 matérias no total, contando o card "Projetos").
// Consumido por plataforma.html (via window.TURMA_CONFIG) — inclusive pela
// aba "Gestão" do próprio portal (shared/platform-core.js), que lê isso
// pra montar as colunas de desempenho por trilha do relatório de notas e a
// lista de aulas com geração de slides (campo hasSlides).
//
// Só dentro de uma matéria é que as trilhas aparecem (ver renderMaterias/
// openMateria em shared/platform-core.js). Por enquanto só Banco de Dados tem
// conteúdo de verdade — as demais são placeholders prontos pra receber
// trilhas quando o currículo de cada uma for definido.
//
// Pra adicionar uma trilha nova numa matéria, edite o array `trilhas` dela
// (mesmo formato usado em turmas/jogos/config.js) — nenhum outro arquivo
// precisa mudar.
window.TURMA_CONFIG_SISTEMAS = {
  id: 'sistemas',
  label: 'Sistemas',
  // Código oficial da turma no SIAP/SENAI. É o valor da coluna `turma` em
  // professor/data/conteudos.csv (e entra no cálculo da `chave`), então
  // precisa bater letra por letra com o CSV — ver shared/lancamento.js.
  codigoTurma: '2º DS',
  // Rótulo da coluna "Nota 3" em Lançar Notas (shared/platform-core.js) —
  // só a turma Sistemas usa essa coluna exclusivamente pra Prova Final,
  // por isso o rótulo customizado; turma Jogos não define isso e continua
  // vendo o "Nota 3" genérico. Por causa disso, Nota 4 (não Nota 3) é a
  // coluna reservada pro Projeto Empreendedor (ver comentário na trilha
  // 'projeto-app-empreendedor' abaixo).
  nota3Label: 'Prova Final',
  // Com os dois campos abaixo, a coluna "Prova Final" passa a ser
  // AUTOMÁTICA e travada pro professor (mesmo padrão da coluna "Prova"/
  // Prova Diagnóstica, nota2, em vez de um <input> digitável): lida direto
  // de student_activity_state (state.nota, 0-100, salvo por finishExam()
  // em prova-final-sistemas.html) e escalada pra 0-10 (85/100 -> 8.5), só
  // contando no bimestre em que a trilha 'prova-final' estiver atribuída
  // ("Liberação por Trilha") — ver loadNotas/renderPerfilTab em
  // shared/platform-core.js. Sem esses campos (caso da turma Jogos), a
  // coluna volta a ser o <input> manual de sempre.
  nota3TrilhaKey: 'prova-final',
  nota3ActivityLocation: 'prova_final_sistemas',
  materias: [
    {
      key: 'banco-dados',
      label: 'Banco de Dados',
      trilhas: [
        {
          key: 'sql',
          label: 'SQL',
          desc: 'Aprenda a teoria e depois pratique resolvendo chamados de verdade.',
          capacidade: 'Aplicar linguagem para consulta, manipulação e controle do banco de dados.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Fundamentos de SQL e PL/SQL',
              desc: 'Tabelas, colunas, chave primária, SELECT/WHERE/ORDER BY/INSERT/UPDATE/DELETE, JOIN entre tabelas, agregação com GROUP BY e os fundamentos de PL/SQL.',
              icon: '📖', src: 'atividades/sql-basico-teoria.html',
              progressKey: 'sql_basico_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'basico', title: 'Prática — Central de Dados',
              desc: 'Resolva chamados escrevendo consultas SQL de verdade contra um banco de exemplo, direto no navegador.',
              icon: '🗄️', src: 'atividades/sql-basico.html',
              progressKey: 'sql_basico_progress_', progressTotal: 8,
              requires: 'teoria', hasGabarito: true
            },
            {
              key: 'join', title: 'Prática — Central de Dados: Relatórios (JOIN)',
              desc: 'Cruze dados de funcionários e departamentos com JOIN pra montar relatórios de verdade.',
              icon: '🔗', src: 'atividades/sql-join.html',
              progressKey: 'sql_join_progress_', progressTotal: 5,
              requires: 'basico', hasGabarito: true
            },
            {
              key: 'agregacao', title: 'Prática — Central de Dados: Estatísticas (GROUP BY)',
              desc: 'Some, conte e tire médias com funções de agregação e GROUP BY.',
              icon: '📊', src: 'atividades/sql-agregacao.html',
              progressKey: 'sql_agregacao_progress_', progressTotal: 5,
              requires: 'join', hasGabarito: true
            }
          ]
        },
        {
          key: 'sql-comentarios',
          label: 'Documentação de Código',
          desc: 'Aprenda a documentar consultas e blocos PL/SQL com comentários claros.',
          capacidade: 'Empregar comentários para documentação do código fonte.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Comentários em SQL e PL/SQL',
              desc: 'Sintaxe de comentários de uma linha e de bloco, e onde/por que comentar código SQL e PL/SQL.',
              icon: '📝', src: 'atividades/sql-comentarios-teoria.html',
              progressKey: 'sql_comentarios_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            }
          ]
        },
        {
          key: 'db-conexao-supabase',
          label: 'Conexão com Supabase',
          desc: 'Projeto integrador: monte a tela de cadastro de usuários do TikTak (rede social fictícia), do zero até a segurança com RLS, conectado a um banco de dados real no Supabase.',
          capacidade: 'Aplicar procedimentos de segurança e backup no SGBD.',
          modules: [
            {
              // Atividade não corrigível automaticamente pelo portal (usa
              // GitHub Codespaces + um projeto Supabase próprio do aluno) —
              // por isso progressMode 'flag' sem nenhum teste/quiz: o aluno
              // só navega pelas etapas, e quem marca como concluída é o
              // professor, dando "visto" com a própria credencial na etapa
              // final (ver shared/professor-visto.js).
              key: 'pratica', title: 'Prática — Sistema Web com HTML, JavaScript e Supabase',
              desc: 'Cadastro de usuários do TikTak de ponta a ponta: GitHub Codespaces, HTML/JS, criação do banco no Supabase, conexão via Data API, INSERT/SELECT e políticas de RLS. O portal não corrige essa atividade sozinho — na última etapa, chame o professor pra dar o visto.',
              icon: '🔌', src: 'atividades/db-conexao-supabase-pratica.html',
              progressKey: 'db_conexao_supabase_pratica_progress_', progressMode: 'flag',
              hasGabarito: true
            }
          ]
        },
        {
          // Padrão novo de trilhas (docs/padrao-trilhas.md): teoria em .md
          // (turmas/sistemas/aulas/bd-nosql-teoria.md) + práticas com o
          // visual base. Plano de ensino: Aula 32 (05/10/2026), mínimo 1h —
          // teoria ~30 min + consultoria ~20 min + modelagem ~25 min.
          key: 'bd-nosql',
          label: 'Bancos de Dados Não Relacionais (NoSQL)',
          aula: 32, dataAula: '2026-10-05',
          desc: 'Quando o relacional sofre para escalar, as 4 famílias NoSQL, o teorema CAP e como escolher a arquitetura certa para cada aplicação.',
          capacidade: 'Distinguir arquitetura de banco de dados de acordo com aplicação.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Bancos de Dados Não Relacionais',
              desc: 'Limites do relacional, escala vertical × horizontal, chave-valor, documento, colunar, grafo, CAP e ACID × BASE.',
              icon: '📖', src: 'atividades/bd-nosql-teoria.html', telaCheia: true,
              progressKey: 'bd_nosql_teoria_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'consultoria', title: 'Prática — Consultoria de Arquitetura',
              desc: 'Oito empresas pedem ajuda: escolha o banco certo (relacional ou uma família NoSQL) e o motivo técnico para cada uma.',
              icon: '🧭', src: 'atividades/bd-nosql-consultoria.html', telaCheia: true,
              progressKey: 'bd_nosql_consultoria_progress_', progressTotal: 8,
              requires: 'teoria', hasGabarito: true
            },
            {
              key: 'modelagem', title: 'Prática — Do Relacional ao Documento',
              desc: 'Modele em JSON um pedido, um catálogo flexível, um carrinho chave-valor e um grafo de seguidores, com correção automática.',
              icon: '🧩', src: 'atividades/bd-nosql-modelagem.html', telaCheia: true,
              progressKey: 'bd_nosql_modelagem_progress_', progressTotal: 4,
              requires: 'consultoria', hasGabarito: true
            }
          ]
        },
        {
          // Plano de ensino: Aula 33 (19/10/2026), 1h, atividade prática no
          // MongoDB (o plano cita Atlas/Compass; usamos o Mongo Playground,
          // pelo navegador e sem criar conta — o Atlas exige conta) —
          // teoria curta ~15 min + roteiro ~45 min.
          // A prática acontece fora do portal: checklist de desempenho
          // prático + visto do professor (RoteiroSlides, professor-visto.js).
          key: 'bd-mongodb',
          label: 'MongoDB na Prática: Coleções e Documentos',
          aula: 33, dataAula: '2026-10-19',
          desc: 'Crie coleções e insira documentos JSON sem esquema fixo num banco MongoDB de verdade, no Mongo Playground (gratuito, pelo navegador, sem conta).',
          capacidade: 'Distinguir arquitetura de banco de dados de acordo com aplicação.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — MongoDB na Prática',
              desc: 'Coleção e documento, JSON × BSON, _id/ObjectId, esquema flexível, insertOne, find e updateOne com $set.',
              icon: '📖', src: 'atividades/bd-mongodb-teoria.html', telaCheia: true,
              progressKey: 'bd_mongodb_teoria_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Catálogo da MegaShop no MongoDB',
              desc: 'Roteiro no Mongo Playground (navegador, sem conta): coleção produtos, documentos com campos diferentes, buscas e atualização. Na última etapa, o professor confere o checklist e dá o visto.',
              icon: '🍃', src: 'atividades/bd-mongodb-pratica.html', telaCheia: true,
              progressKey: 'bd_mongodb_pratica_progress_', progressMode: 'flag',
              requires: 'teoria', hasGabarito: true
            }
          ]
        }
        // A peça "FinancApp — Banco de Dados e RLS" ficava aqui; agora está
        // na trilha única do FinancApp, card "Projetos" (fim deste arquivo).
      ]
    },
    {
      key: 'dev-sistemas-1',
      label: 'Desenvolvimento de Sistemas 1',
      trilhas: [
        {
          key: 'devsis-apis-frameworks',
          label: 'APIs, Bibliotecas e Frameworks',
          desc: 'Aprenda a teoria e depois resolva chamados sobre ferramentas, boas práticas, APIs e frameworks.',
          capacidade: 'Aplicar linguagem de programação por meio de apis, bibliotecas, frameworks na construção de rotinas de software.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Ferramentas, APIs e Frameworks',
              desc: 'VS Code, Git local, compilação x interpretação, debugging, convenções de nomenclatura, peer review, consumo de APIs/JSON, bibliotecas, frameworks, CLI scaffold, componentes e rotas.',
              icon: '🧑‍💻', src: 'atividades/devsis-apis-frameworks-teoria.html',
              progressKey: 'devsis_apis_frameworks_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Sistemas: Ferramentas e APIs',
              desc: 'Resolva chamados escolhendo a ferramenta, convenção ou tecnologia certa pra cada cenário.',
              icon: '🛠️', src: 'atividades/devsis-apis-frameworks-pratica.html',
              progressKey: 'devsis_apis_frameworks_pratica_progress_', progressTotal: 5,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'devsis-requisitos-tecnologias',
          label: 'Tecnologias e Requisitos',
          desc: 'Aprenda a teoria e depois pratique escolhendo tecnologias de acordo com requisitos funcionais e não funcionais.',
          capacidade: 'Definir tecnologias de acordo com os requisitos não funcionais / funcionais.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Requisitos Funcionais e Não Funcionais',
              desc: 'Diferença entre requisito funcional e não funcional, e como escolher APIs, bibliotecas e frameworks a partir deles.',
              icon: '📋', src: 'atividades/devsis-requisitos-teoria.html',
              progressKey: 'devsis_requisitos_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Sistemas: Requisitos',
              desc: 'Resolva chamados classificando requisitos e escolhendo tecnologias de acordo com eles.',
              icon: '📐', src: 'atividades/devsis-requisitos-pratica.html',
              progressKey: 'devsis_requisitos_pratica_progress_', progressTotal: 5,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'devsis-linguagem-plataforma',
          label: 'Linguagem e Plataforma',
          desc: 'Aprenda a teoria e depois pratique escolhendo a linguagem e a plataforma certas pra cada projeto.',
          capacidade: 'Selecionar linguagem de programação de acordo com os requisitos.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Linguagens e Plataformas',
              desc: 'Linguagens dominantes para Web, Desktop e Mobile, responsividade multiplataforma, testes de compatibilidade e build/empacotamento.',
              icon: '🖥️', src: 'atividades/devsis-linguagem-teoria.html',
              progressKey: 'devsis_linguagem_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Sistemas: Linguagem e Plataforma',
              desc: 'Resolva chamados escolhendo a linguagem e a plataforma certas pra cada cenário de projeto.',
              icon: '📱', src: 'atividades/devsis-linguagem-pratica.html',
              progressKey: 'devsis_linguagem_pratica_progress_', progressTotal: 5,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'js-fundamentos',
          label: 'JavaScript',
          desc: 'Desafios práticos pra treinar a base da lógica de programação em JavaScript: variáveis, console/alert, funções, decisões e laços.',
          capacidade: 'Aplicar lógica de programação usando a linguagem JavaScript.',
          modules: [
            {
              // Sem módulo de teoria separado, de propósito — cada desafio já
              // traz uma mini-explicação embutida (ver CHALLENGES no próprio
              // arquivo). Mesmo formato (e mesmos nomes de módulo) de
              // turmas/jogos/atividades/js-basico.html/js-intermediario.html
              // — os dois usam shared/js-challenge-engine.js por baixo.
              key: 'basico', title: 'Básico — Desafios de JavaScript',
              desc: 'Variáveis (declarar, somar, dividir, atualizar) e Console/Alert (mostrar valores, textos e resultados na tela).',
              icon: '🟨', src: 'atividades/js-fundamentos-basico.html',
              progressKey: 'js_fundamentos_basico_progress_', progressTotal: 10,
              hasGabarito: true
            },
            {
              key: 'intermediario', title: 'Intermediário — Desafios de JavaScript',
              desc: 'Funções (criar e retornar valores), If/Else (decisões) e Laços (repetir com for).',
              icon: '🟧', src: 'atividades/js-fundamentos-intermediario.html',
              progressKey: 'js_fundamentos_intermediario_progress_', progressTotal: 15,
              hasGabarito: true
            }
          ]
        },
        {
          // Padrão novo (docs/padrao-trilhas.md). Plano de ensino: Aula 33
          // (05/10/2026), 2h — teoria ~30 min + dinâmica ~90 min. Sobre o
          // projeto que a equipe estiver desenvolvendo; sem ferramenta
          // externa (papel e quadro). Avaliação: ficha de observação + visto.
          key: 'devsis-impasse-tecnico',
          label: 'Impasse Técnico na Equipe',
          aula: 33, dataAula: '2026-10-05',
          desc: 'Organização do trabalho e controle de atividades: mediar um impasse técnico de forma ética e criativa, com foco nos objetivos do software.',
          capacidade: 'Aplicar metodologia de desenvolvimento de acordo com o escopo do projeto.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Impasse Técnico na Equipe',
              desc: 'Escopo e objetivos do software, Scrum e Kanban, quadro de atividades, impasses comuns, mediação ética, MoSCoW e registro de decisão.',
              icon: '📖', src: 'atividades/devsis-impasse-tecnico-teoria.html', telaCheia: true,
              progressKey: 'devsis_impasse_tecnico_teoria_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Dinâmica do Impasse Técnico',
              desc: 'Em equipe, com papéis (defensores, mediador, registrador): expor os lados, mediar com critérios, registrar a decisão e atualizar o quadro. Na última etapa, o professor confere a ficha de observação e dá o visto.',
              icon: '🤝', src: 'atividades/devsis-impasse-tecnico-pratica.html', telaCheia: true,
              progressKey: 'devsis_impasse_tecnico_pratica_progress_', progressMode: 'flag',
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          // Padrão novo. Plano de ensino: Aula 34 (19/10/2026), 2h — teoria
          // ~25 min + preparação e pitches ~95 min. Ferramentas opcionais só
          // online e gratuitas (Google Apresentações/Canva, JSFiddle sem conta + ViaCEP).
          // Avaliação: avaliação de pitch + visto.
          key: 'devsis-pitch-inovacao',
          label: 'Pitch de Inovação Profissional',
          aula: 34, dataAula: '2026-10-19',
          desc: 'Proponha uma funcionalidade original para o projeto da equipe e defenda num pitch, com integração entre plataformas, meta e plano de tarefas.',
          capacidade: 'Integrar sistemas multiplataformas por meio da linguagem de programação.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Pitch de Inovação Profissional',
              desc: 'Estrutura do pitch, funcionalidade original, integração por API e JSON, metas SMART, proatividade e resultado diferenciado.',
              icon: '📖', src: 'atividades/devsis-pitch-inovacao-teoria.html', telaCheia: true,
              progressKey: 'devsis_pitch_inovacao_teoria_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Pitch de Inovação',
              desc: 'Escolha a funcionalidade, desenhe a integração, defina meta, tarefas e riscos, e apresente um pitch de 2 minutos. Na última etapa, o professor confere a avaliação de pitch e dá o visto.',
              icon: '🎤', src: 'atividades/devsis-pitch-inovacao-pratica.html', telaCheia: true,
              progressKey: 'devsis_pitch_inovacao_pratica_progress_', progressMode: 'flag',
              requires: 'teoria', hasGabarito: true
            }
          ]
        }
      ]
    },
    {
      key: 'redes-computadores',
      label: 'Redes de Computadores',
      trilhas: [
        {
          key: 'redes-conexao',
          label: 'Conexão e Endereçamento IP',
          desc: 'Aprenda a teoria e depois resolva chamados sobre topologias, meios físicos e endereçamento IP.',
          capacidade: 'Identificar tipos e tecnologias de conexão a redes de computadores.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Conexão e Endereçamento IP',
              desc: 'Topologias físicas, meios de cabeamento, interfaces Ethernet/Wireless/Bluetooth, gateway, IPv4/IPv6, máscara de sub-rede, ping e tracert.',
              icon: '📡', src: 'atividades/redes-conexao-teoria.html',
              progressKey: 'redes_conexao_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Redes: Conexões',
              desc: 'Resolva chamados escolhendo o meio físico, dispositivo ou comando certo pra cada cenário.',
              icon: '🔌', src: 'atividades/redes-conexao-pratica.html',
              progressKey: 'redes_conexao_pratica_progress_', progressTotal: 5,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'redes-resolucao-problemas',
          label: 'Resolução de Problemas de Rede',
          desc: 'Aprenda o método de diagnóstico e depois pratique identificando a causa de falhas reais.',
          capacidade: 'Resolução de problemas complexos.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Diagnóstico de Problemas de Rede',
              desc: 'Metodologia de diagnóstico por camadas, falhas físicas, conflito de IP, máscara de sub-rede errada e isolamento de causa.',
              icon: '🩺', src: 'atividades/redes-resolucao-teoria.html',
              progressKey: 'redes_resolucao_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Redes: Diagnóstico',
              desc: 'Analise sintomas reais e aponte a causa mais provável de cada chamado.',
              icon: '🔍', src: 'atividades/redes-resolucao-pratica.html',
              progressKey: 'redes_resolucao_pratica_progress_', progressTotal: 5,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'redes-servicos-modelos',
          label: 'Serviços de Internet e Modelos',
          desc: 'Aprenda a teoria e depois pratique reconhecendo serviços, portas e camadas de rede.',
          capacidade: 'Reconhecer tipos e características (classificação, estrutura e modelos).',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Serviços de Internet e Modelos OSI/TCP-IP',
              desc: 'DHCP, Web, E-mail, FTP, acesso remoto, comunicação em tempo real, portas padrão e as camadas dos modelos OSI e TCP/IP.',
              icon: '🌐', src: 'atividades/redes-servicos-teoria.html',
              progressKey: 'redes_servicos_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Redes: Serviços',
              desc: 'Associe cada chamado ao serviço, porta ou camada de rede correta.',
              icon: '🛰️', src: 'atividades/redes-servicos-pratica.html',
              progressKey: 'redes_servicos_pratica_progress_', progressTotal: 5,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'redes-armazenamento',
          label: 'Armazenamento e Ativos de Rede',
          desc: 'Aprenda a teoria e depois pratique reconhecendo ativos de rede e unidades de medida.',
          capacidade: 'Reconhecer componentes e ativos de redes / Reconhecer unidades de medida empregadas na transmissão e armazenamento de dados.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Armazenamento e Ativos de Rede',
              desc: 'Local x rede x nuvem, switch/roteador/access point, bit x byte, Mbps x MB/s, redundância e políticas de backup.',
              icon: '💾', src: 'atividades/redes-armazenamento-teoria.html',
              progressKey: 'redes_armazenamento_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Redes: Armazenamento',
              desc: 'Resolva chamados sobre ativos de rede, unidades de medida, redundância e backup.',
              icon: '🗃️', src: 'atividades/redes-armazenamento-pratica.html',
              progressKey: 'redes_armazenamento_pratica_progress_', progressTotal: 5,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          // Padrão novo (docs/padrao-trilhas.md). Plano de ensino (Fundamentos
          // de Redes): Aula 33 (05/10/2026), 1h — teoria ~20 min + ficha de
          // correlação técnica ~35 min, com correção automática no portal.
          key: 'redes-modelos-referencia',
          label: 'Workshop Modelos de Referência',
          aula: 33, dataAula: '2026-10-05',
          desc: 'Associe ativos, unidades, interfaces e tipos de armazenamento às camadas dos modelos OSI e TCP/IP.',
          capacidade: 'Reconhecer tipos e características (classificação, estrutura e modelos) / Reconhecer componentes e ativos de redes / Identificar tipos e tecnologias de conexão a redes de computadores.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Modelos de Referência OSI e TCP/IP',
              desc: 'Camadas OSI × TCP/IP, unidade de cada camada, bits × bytes, ativos e interfaces por camada, armazenamento nos modelos e tendências futuras.',
              icon: '📖', src: 'atividades/redes-modelos-referencia-teoria.html', telaCheia: true,
              progressKey: 'redes_modelos_referencia_teoria_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Ficha de Correlação Técnica',
              desc: 'Quatro fichas (ativos, unidades, interfaces e armazenamento): escolha a camada OSI e TCP/IP de cada item, com correção automática e dicas.',
              icon: '🧭', src: 'atividades/redes-modelos-referencia-pratica.html', telaCheia: true,
              progressKey: 'redes_modelos_referencia_pratica_progress_', progressTotal: 4,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          // Padrão novo. Plano de ensino: Aula 34 (19/10/2026), 1h — revisão
          // ~15 min + relatório técnico ~40 min, escrito no próprio portal
          // (o texto fica no progresso do aluno, espelhado no Supabase) e
          // concluído com o visto do professor. As 3 tecnologias "estudadas"
          // são as da trilha redes-armazenamento: local, em rede (NAS), nuvem.
          key: 'redes-relatorio-armazenamento',
          label: 'Relatório Técnico: Local, Rede e Nuvem',
          aula: 34, dataAula: '2026-10-19',
          desc: 'Consolidação do bloco: compare armazenamento local, em rede e em nuvem e escreva um relatório técnico com recomendação.',
          capacidade: 'Reconhecer tipos e características (classificação, estrutura e modelos) / Reconhecer componentes e ativos de redes / Identificar tipos e tecnologias de conexão a redes de computadores.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Revisão e Relatório Técnico',
              desc: 'Local × NAS × nuvem, Mbps × MB/s, custo, RAID × backup 3-2-1, modelos de rede e como escrever um relatório técnico.',
              icon: '📖', src: 'atividades/redes-relatorio-armazenamento-teoria.html', telaCheia: true,
              progressKey: 'redes_relatorio_armazenamento_teoria_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Relatório Técnico Final',
              desc: 'Escreva o relatório no portal (tabela comparativa, síntese, recomendação para um cenário, tendências), gere o PDF e peça o visto do professor.',
              icon: '📝', src: 'atividades/redes-relatorio-armazenamento-pratica.html', telaCheia: true,
              progressKey: 'redes_relatorio_armazenamento_pratica_progress_', progressMode: 'flag',
              requires: 'teoria', hasGabarito: true
            }
          ]
        }
      ]
    },
    {
      key: 'internet-das-coisas',
      label: 'Internet das Coisas',
      trilhas: [
        {
          key: 'iot-conectividade-hardware',
          label: 'Conectividade de Hardware',
          desc: 'Ondas de rádio, WiFi, Bluetooth e satélite na conectividade de dispositivos IoT — com o DJI Mini 4 Pro como fio condutor pra aula prática de pilotagem.',
          capacidade: 'Integrar dispositivos de comunicação de dados; Integrar os princípios de qualidade às atividades sob sua responsabilidade.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Conectividade de Hardware',
              desc: 'Ondas de rádio, satélite, Bluetooth e WiFi — e como o drone DJI Mini 4 Pro usa cada uma delas em voo.',
              icon: '🚁', src: 'atividades/iot-conectividade-teoria.html',
              progressKey: 'iot_conectividade_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de IoT: Conectividade',
              desc: 'Resolva chamados escolhendo a tecnologia de conectividade certa pra cada cenário de campo, incluindo o dia de voo com o Mini 4 Pro.',
              icon: '📶', src: 'atividades/iot-conectividade-pratica.html',
              progressKey: 'iot_conectividade_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          // Padrão novo (docs/padrao-trilhas.md). Plano de ensino: Aula 34
          // (06/10/2026), 1h — teoria ~20 min + seminário ~40 min (papel/
          // quadro; slides opcionais em ferramenta gratuita no navegador).
          // Avaliação: ficha de avaliação + visto.
          key: 'iot-opc-integracao',
          label: 'Integração Industrial com OPC UA',
          aula: 34, dataAula: '2026-10-06',
          desc: 'Conectividade de software: planeje a coleta automática de dados de máquinas com OPC UA, com qualidade e segurança, e apresente o fluxo num seminário.',
          capacidade: 'Integrar dispositivos para coleta automática de dados em sistemas industriais; Integrar os princípios de qualidade às atividades sob sua responsabilidade.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Integração Industrial com OPC UA',
              desc: 'OPC Classic × OPC UA, cliente e servidor, tags e NodeId, coleta por assinatura, StatusCode e qualidade do dado, modos de segurança.',
              icon: '📖', src: 'atividades/iot-opc-integracao-teoria.html', telaCheia: true,
              progressKey: 'iot_opc_integracao_teoria_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Seminário de Integração OPC UA',
              desc: 'Em equipe: cenário industrial, servidor e clientes, tabela de tags, coleta automática, qualidade e segurança, e o fluxo apresentado em 3 minutos. Na última etapa, o professor confere a ficha de avaliação e dá o visto.',
              icon: '🏭', src: 'atividades/iot-opc-integracao-pratica.html', telaCheia: true,
              progressKey: 'iot_opc_integracao_pratica_progress_', progressMode: 'flag',
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          // Padrão novo. Plano de ensino: Aula 35 (13/10/2026), 1h — teoria
          // ~15 min + laboratório ~40 min. O broker é SIMULADO no portal
          // (sem instalar Mosquitto nem abrir as portas 1883/8883), e a
          // checklist de conformidade é calculada pela configuração.
          key: 'iot-mqtt',
          label: 'MQTT na Coleta Automática de Dados',
          aula: 35, dataAula: '2026-10-13',
          desc: 'Conectividade de software: configure broker, publicação e assinatura MQTT para a coleta automática de uma câmara fria, conforme a especificação.',
          capacidade: 'Integrar dispositivos para coleta automática de dados em sistemas industriais; Integrar os princípios de qualidade às atividades sob sua responsabilidade.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — MQTT',
              desc: 'Publicar/assinar e broker, tópicos, curingas + e #, QoS, retain, last will, configuração do broker (porta, usuários, ACL) e MQTT × OPC UA.',
              icon: '📖', src: 'atividades/iot-mqtt-teoria.html', telaCheia: true,
              progressKey: 'iot_mqtt_teoria_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'laboratorio', title: 'Prática — Laboratório MQTT',
              desc: 'Broker simulado no portal: configure porta, usuários, ACL, publicador (QoS, retain, last will, payload) e três assinantes, rode a coleta e feche a checklist de conformidade.',
              icon: '📡', src: 'atividades/iot-mqtt-laboratorio.html', telaCheia: true,
              progressKey: 'iot_mqtt_laboratorio_progress_', progressMode: 'flag',
              requires: 'teoria', hasGabarito: true
            }
          ]
        }
      ]
    },
    {
      key: 'intro-dev-projetos',
      label: 'Introdução de Desenvolvimento de Projetos',
      // A única trilha daqui era o Kickoff do FinancApp, que foi pra trilha
      // única do FinancApp no card "Projetos" (fim deste arquivo) — a
      // matéria fica vazia ("Em breve") até receber trilhas próprias. A
      // antiga "Oficina de Comunicação" (CodePen) foi removida do portal;
      // ver sql/remover-visto-oficina-comunicacao.sql.
      //
      // As duas trilhas abaixo são COMPARTILHADAS com a turma Jogos (mesmas
      // aulas 32 e 33 do plano de ensino): os arquivos ficam aqui em
      // turmas/sistemas/ e o config.js de Jogos aponta para eles com
      // src: '../sistemas/atividades/...'. Qualquer mudança vale para as duas.
      trilhas: [
        {
          // Padrão novo (docs/padrao-trilhas.md). Aula 32 (05/10/2026), 1h —
          // teoria ~15 min + prática ~40 min no SQL Fiddle (online, grátis,
          // SQLite), com o script validado no próprio portal (sql.js).
          key: 'projetos-estrutura-banco',
          label: 'Estrutura da Base de Dados do Projeto',
          aula: 32, dataAula: '2026-10-05',
          desc: 'Padrões de modelagem relacional e resolução de problemas de estrutura: monte e valide o script SQL do banco do projeto final no SQL Fiddle.',
          capacidade: 'Reconhecer os padrões de estrutura estabelecidos para a elaboração de projetos.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Estrutura da Base de Dados',
              desc: 'Tabela por entidade, PK e FK, snake_case, 1FN/2FN/3FN, relacionamentos 1:N e N:N, restrições e o método para resolver problemas de estrutura.',
              icon: '📖', src: 'atividades/projetos-estrutura-banco-teoria.html', telaCheia: true,
              progressKey: 'projetos_estrutura_banco_teoria_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Base de Dados no SQL Fiddle',
              desc: 'Clínica de estrutura com 3 casos, modelagem do projeto final, script no SQL Fiddle (SQLite) e validação automática do script no portal.',
              icon: '🗄️', src: 'atividades/projetos-estrutura-banco-pratica.html', telaCheia: true,
              progressKey: 'projetos_estrutura_banco_pratica_progress_', progressMode: 'flag',
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          // Padrão novo. Aula 33 (19/10/2026), 1h — teoria ~15 min + escrita
          // ~40 min escrevendo o draft no próprio portal (sem ferramenta de
          // fora nem conta), com a conferência automática e o visto do professor.
          key: 'projetos-pre-textuais',
          label: 'Elementos Pré-textuais do Projeto',
          aula: 33, dataAula: '2026-10-19',
          desc: 'Escrita técnica: folha de rosto, resumo, abstract, lista de ilustrações e sumário do documento do projeto, em Markdown.',
          capacidade: 'Reconhecer os padrões de estrutura estabelecidos para a elaboração de projetos.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Elementos Pré-textuais',
              desc: 'Ordem da NBR 14724, obrigatórios e opcionais, resumo e palavras-chave (NBR 6028), lista de ilustrações, sumário (NBR 6027) e Markdown.',
              icon: '📖', src: 'atividades/projetos-pre-textuais-teoria.html', telaCheia: true,
              progressKey: 'projetos_pre_textuais_teoria_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Draft dos Pré-textuais',
              desc: 'Escreva no portal, em Markdown, a folha de rosto, o resumo, o abstract, a lista de ilustrações e o sumário, confira a estrutura no portal e peça o visto do professor.',
              icon: '📝', src: 'atividades/projetos-pre-textuais-pratica.html', telaCheia: true,
              progressKey: 'projetos_pre_textuais_pratica_progress_', progressMode: 'flag',
              requires: 'teoria', hasGabarito: true
            }
          ]
        }
      ]
    },
    {
      key: 'modelagem-sistemas-1', label: 'Modelagem de Sistemas 1',
      trilhas: [
        {
          key: 'modelagem-dados-requisitos',
          label: 'Modelagem de Dados e Requisitos',
          desc: 'Pesquise e monte uma apresentação (Canva/Slides) sobre modelagem de dados e requisitos funcionais/não funcionais, entregue pro professor por e-mail e depois responda o questionário.',
          // TODO(professor): capacidade PROVISÓRIA — troque pelo texto real
          // da capacidade MSEP antes de liberar pra turma (ver README,
          // seção "Trilha por capacidade (MSEP)": "a capacidade não pode
          // ser inventada").
          capacidade: 'Elaborar modelo de dados e definir requisitos funcionais e não funcionais de um sistema.',
          modules: [
            {
              // Sem correção automática (o "produto" é um PDF exportado de
              // fora do portal — Canva/Slides/PowerPoint) — o aluno só
              // navega pelas etapas (contexto, os 2 blocos de conteúdo
              // obrigatórios, critérios de formatação e como entregar) e o
              // professor dá o visto na última etapa, depois de conferir
              // que o PDF chegou por e-mail (ver shared/professor-visto.js).
              key: 'trabalho', title: 'Trabalho — Apresentação: Modelagem de Dados e Requisitos',
              desc: 'Monte uma apresentação (Canva, Google Slides ou PowerPoint) sobre modelagem de dados e requisitos funcionais/não funcionais, seguindo critérios de fonte, cor e padrão de texto. Exporte em PDF e envie por e-mail pro professor.',
              icon: '🖼️', src: 'atividades/modelagem-dados-requisitos-trabalho.html',
              progressKey: 'modelagem_dados_requisitos_trabalho_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              // Quiz "história + quiz" padrão (shared/quiz-teoria-engine.js),
              // mas só libera depois do visto no trabalho (requires:
              // 'trabalho') e roda atrás de uma trava extra de integridade:
              // se o aluno sair da aba/janela durante o questionário, recebe
              // uma advertência; na 2ª, a atividade é bloqueada até o
              // professor liberar de novo com o token de visto (ver
              // shared/exam-proctor.js). As perguntas cobrem só os assuntos
              // que o módulo "trabalho" pediu pra pesquisar.
              key: 'questionario', title: 'Questionário — Modelagem de Dados e Requisitos',
              desc: 'Responda sobre o que você pesquisou no trabalho: entidade, atributo, relacionamento, cardinalidade, chaves, normalização, DER/MER e requisitos funcionais/não funcionais. Atenção: sair da aba durante o questionário gera advertência — na 2ª, a atividade é bloqueada.',
              icon: '📝', src: 'atividades/modelagem-dados-requisitos-questionario.html',
              progressKey: 'modelagem_dados_requisitos_questionario_progress_', progressMode: 'flag',
              requires: 'trabalho', hasSlides: true, hasGabarito: true
            }
          ]
        },
        {
          // Padrão novo (docs/padrao-trilhas.md). Plano de ensino: Aula 34
          // (06/10/2026), 1h — teoria ~20 min + prática ~40 min. Estudo de
          // caso fictício "VetAgenda" (atividades/modelagem-vetagenda.js),
          // compartilhado com a trilha seguinte. Avaliação: checklist de
          // roteiro, calculada na prática.
          key: 'modelagem-roteiro',
          label: 'Roteiro de Trabalho para Modelagem',
          aula: 34, dataAula: '2026-10-06',
          desc: 'Revise as regras de negócio já interpretadas do caso VetAgenda e monte o roteiro de trabalho para a modelagem, com artefatos, responsáveis, prazos e critérios de pronto.',
          capacidade: 'Interpretar requisitos levantados para desenvolvimento de sistemas.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Roteiro de Trabalho para Modelagem',
              desc: 'Regra de negócio × requisito, defeitos comuns nas regras, etapas e artefatos de um roteiro de modelagem e critério de pronto.',
              icon: '📖', src: 'atividades/modelagem-roteiro-teoria.html', telaCheia: true,
              progressKey: 'modelagem_roteiro_teoria_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Roteiro de Trabalho: VetAgenda',
              desc: 'Classifique as 9 regras de negócio do caso, ordene as etapas do roteiro, escolha os artefatos e defina responsável, prazo e critério de pronto. A checklist de roteiro fecha o módulo.',
              icon: '🗺️', src: 'atividades/modelagem-roteiro-pratica.html', telaCheia: true,
              progressKey: 'modelagem_roteiro_pratica_progress_', progressMode: 'flag',
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          // Padrão novo. Plano de ensino: Aula 35 (13/10/2026), 1h — teoria
          // ~15 min + laboratório ~40 min, sobre o mesmo caso VetAgenda e o
          // roteiro da aula anterior. Avaliação: ficha de revisão de roteiro
          // (calculada) + visto do professor.
          key: 'modelagem-revisao-rn',
          label: 'Revisão Técnica das Regras de Negócio',
          aula: 35, dataAula: '2026-10-13',
          desc: 'Laboratório de revisão: reescreva as regras de negócio da VetAgenda, ligue cada uma a um requisito e ao roteiro de trabalho, e registre a nova versão.',
          capacidade: 'Interpretar requisitos levantados para desenvolvimento de sistemas.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Revisão Técnica das Regras de Negócio',
              desc: 'Checklist de revisão, reescrita de regras ambíguas, compostas e conflitantes, RNF, rastreabilidade, integração ao roteiro e histórico de versões.',
              icon: '📖', src: 'atividades/modelagem-revisao-rn-teoria.html', telaCheia: true,
              progressKey: 'modelagem_revisao_rn_teoria_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Laboratório de Revisão das Regras',
              desc: 'Reescreva RN02, RN03, RN05 e RN07, mova o que não é regra de negócio, monte a rastreabilidade e atualize o roteiro. Na última etapa, o professor confere a ficha de revisão e dá o visto.',
              icon: '🔍', src: 'atividades/modelagem-revisao-rn-pratica.html', telaCheia: true,
              progressKey: 'modelagem_revisao_rn_pratica_progress_', progressMode: 'flag',
              requires: 'teoria', hasGabarito: true
            }
          ]
        }
        // A peça "FinancApp — Modelagem de Dados e Requisitos" ficava aqui;
        // agora está na trilha única do FinancApp, card "Projetos".
      ]
    },
    {
      // Mesmas atividades da turma Jogos Digitais (Projeto de Vida não é
      // conteúdo técnico específico de nenhuma das duas turmas) — só copiadas
      // pra turmas/sistemas/atividades/, com o rótulo de turma corrigido
      // dentro de cada arquivo (Turma Jogos Digitais → Turma Sistemas).
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
              icon: '📖', src: 'atividades/vida-foco-autocontrole-teoria.html', telaCheia: true,
              progressKey: 'vida_foco_autocontrole_teoria_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Sprint de Foco',
              desc: 'Dois desafios de lógica com testes automáticos num sprint cronometrado, com contagem de saídas da tela e autoavaliação. Checklist de entrega de código e visto do professor.',
              icon: '⏱️', src: 'atividades/vida-foco-autocontrole-pratica.html', telaCheia: true,
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
              icon: '📖', src: 'atividades/vida-cidadania-digital-teoria.html', telaCheia: true,
              progressKey: 'vida_cidadania_digital_teoria_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Fórum de Cidadania Digital',
              desc: 'Escreva uma postagem informativa (sem dados pessoais, com dicas e fonte) e modere comentários de forma ética num fórum simulado. Na última etapa, o professor dá o visto.',
              icon: '💬', src: 'atividades/vida-cidadania-digital-pratica.html', telaCheia: true,
              progressKey: 'vida_cidadania_digital_pratica_progress_', progressMode: 'flag',
              requires: 'teoria', hasGabarito: true
            }
          ]
        }
      ]
    },
    {
      // Idem: mesmo conteúdo da turma Jogos Digitais.
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
          // Mundo do Trabalho 4.0 — FO de 13/10. Trilha COMPARTILHADA entre
          // Sistemas e Jogos: os arquivos ficam em turmas/sistemas/ e o
          // config.js de Jogos aponta pra eles.
          // Estimativa: teoria ~45 min, prática ~30 min.
          key: 'mundo-profissoes',
          label: 'Características das Profissões',
          desc: 'Profissão, ocupação e cargo; CBO; atividades, formação, competências, ambiente, regulamentação, formas de contratação e carreira.',
          capacidade: 'Identificar as características das profissões',
          dataAula: '2026-10-13',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Características das Profissões',
              desc: 'Profissão × ocupação × cargo, a CBO, competências técnicas e socioemocionais, profissões regulamentadas, aprendiz/estágio/CLT/PJ e júnior/pleno/sênior.',
              icon: '📖', src: 'atividades/mundo-profissoes-teoria.html', telaCheia: true,
              progressKey: 'mundo_profissoes_teoria_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Feira de Profissões',
              desc: 'Oito estandes sem placa: identifique a profissão e a característica que a denuncia.',
              icon: '🎪', src: 'atividades/mundo-profissoes-pratica.html', telaCheia: true,
              progressKey: 'mundo_profissoes_pratica_progress_', progressTotal: 8,
              requires: 'teoria', hasGabarito: true
            }
          ]
        }
      ]
    },
    {
      key: 'prog-aplicativos', label: 'Programação de Aplicativos',
      trilhas: [
        {
          key: 'prog-depuracao',
          label: 'Compilação e Depuração de Código',
          desc: 'Aprenda a teoria e depois corrija bugs de verdade, depurando no PixelCode.',
          capacidade: 'Identificar erros de acordo com o requisito do programa e linguagem; Utilizar o ambiente de desenvolvimento (IDE) para rastreabilidade do código.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Compilação e Depuração',
              desc: 'Tipos de erro (sintaxe, execução, lógica), o que é depurar de verdade, revisão de sintaxe do mais básico (string sem aspas, nome de variável errado) ao intermediário (atribuição x comparação, switch/break, ordem de argumentos, ordem de if/else if, operadores de comparação) e como usar o PixelCode: escrever, executar e ler erros e valores no console.',
              icon: '🧑‍💻', src: 'atividades/prog-depuracao-teoria.html',
              progressKey: 'prog_depuracao_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Sistemas: Depuração',
              desc: 'Quatorze chamados com bugs de verdade, subindo aos poucos até funções e switch/case — leia o código, digite a correção e rode direto na atividade.',
              icon: '🐛', src: 'atividades/prog-depuracao-pratica.html',
              progressKey: 'prog_depuracao_pratica_progress_', progressTotal: 14,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          // Sem correção automática de propósito: o código do aluno vive
          // numa aba separada do PixelCode (pixelcode.html), fora do
          // alcance do portal — cada projeto só é marcado concluído com o
          // visto manual do professor (shared/professor-visto.js), igual
          // à prática de Conexão com Supabase.
          key: 'prog-projetos-pixelcode',
          label: 'Projetos com PixelCode',
          desc: 'Escreva pequenos programas do zero, sozinho, no PixelCode — cada um vira um projeto real, conferido e assinado pelo professor.',
          capacidade: 'Aplicar lógica de programação pra resolver problemas usando JavaScript.',
          modules: [
            {
              key: 'projetos', title: 'Projetos — Calculadora, Gorjetas, Contador e Conversor',
              desc: '4 pequenos programas escritos do zero no PixelCode (funções, laços e fórmulas) — sem correção automática: cada um é conferido e recebe o visto do professor.',
              icon: '🎨', src: 'atividades/prog-projetos-pixelcode.html',
              progressKey: 'prog_projetos_pixelcode_progress_', progressTotal: 4,
              hasGabarito: true
            }
          ]
        },
        {
          key: 'projeto-clipzone',
          label: 'Projeto: Construa seu App',
          desc: 'Saia do zero e construa, peça por peça, um app de vídeos curtos (ClipZone) de verdade — tela de login e tela inicial, direto aqui no portal.',
          capacidade: 'Aplicar, de forma integrada, lógica de programação, manipulação de objetos e validação de formulário na construção de um aplicativo completo em JavaScript.',
          modules: [
            {
              key: 'construcao', title: 'Construa seu App: ClipZone',
              desc: 'A PixelForge Studios te contratou! Cada desafio resolvido entra ao vivo no seu app — tela de login e feed. No final, apresente o app pronto pro professor.',
              icon: '📱', src: 'atividades/clipzone-construcao.html',
              progressKey: 'clipzone_construcao_progress_', progressMode: 'flag',
              hasGabarito: true
            }
          ]
        },
        // A peça "FinancApp — Construa o Aplicativo" ficava aqui; agora está
        // na trilha única do FinancApp, card "Projetos" (logo abaixo).
        {
          // Trilha STANDALONE (não é uma das 5 peças do projeto FinancApp)
          // — fundamento complementar sobre boas práticas de segurança
          // (tipos de chave do Supabase, .env, .gitignore) que valem pra
          // qualquer app conectado a um banco, não só o FinancApp. Sem
          // correção automática (produto é o .env/.gitignore reais do
          // repositório do aluno) — visto do professor no final.
          key: 'prog-conexao-segura',
          label: 'Conexão Segura com Banco de Dados',
          desc: 'Aprenda a diferença entre os tipos de chave do Supabase (anon/publishable x service_role), o que é uma variável de ambiente (.env) e por que ela precisa estar no .gitignore — aplicando isso no seu próprio projeto (FinancApp ou TikTak).',
          capacidade: 'Aplicar procedimentos de segurança e backup no SGBD.',
          modules: [
            {
              key: 'trabalho', title: 'Trabalho — Conexão Segura com Banco de Dados',
              desc: 'Entenda os tipos de chave do Supabase, crie um .env protegido por .gitignore no seu projeto e ajuste o código pra ler a chave de lá, em vez de escrita direto no arquivo. O portal não corrige essa atividade sozinho — na última etapa, chame o professor pra dar o visto.',
              icon: '🔐', src: 'atividades/prog-conexao-segura-trabalho.html',
              progressKey: 'prog_conexao_segura_trabalho_progress_', progressMode: 'flag',
              hasGabarito: true
            }
          ]
        },
        {
          // Programação de Aplicativos — FO de 13/10. Usa o FinancApp como
          // contexto. Estimativa: teoria ~45 min, prática ~30 min.
          key: 'prog-comentarios',
          label: 'Comentários e Documentação do Código',
          desc: 'Comentários de linha e de bloco, o porquê × o quê, comentário desatualizado, nomes e constantes, JSDoc e marcadores TODO/FIXME.',
          capacidade: 'Empregar comentários para documentação do código fonte',
          dataAula: '2026-10-13',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Comentários e Documentação do Código',
              desc: '// e /* */, comentário útil × redundante × desatualizado, constantes com nome, JSDoc (@param/@returns) e TODO/FIXME.',
              icon: '📖', src: 'atividades/prog-comentarios-teoria.html', telaCheia: true,
              progressKey: 'prog_comentarios_teoria_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Revisão de Comentários',
              desc: 'Revise os comentários de oito trechos do FinancApp: diga como está cada um e escolha a melhor correção.',
              icon: '🔎', src: 'atividades/prog-comentarios-pratica.html', telaCheia: true,
              progressKey: 'prog_comentarios_pratica_progress_', progressTotal: 8,
              requires: 'teoria', hasGabarito: true
            }
          ]
        }
      ]
    },
    {
      // Card "Projetos": projetos integradores que atravessam várias
      // matérias. Antes, cada peça do FinancApp ficava na matéria de onde
      // vinha a capacidade (Introdução de Dev. de Projetos, Modelagem de
      // Sistemas 1, Banco de Dados, Redes e Programação de Aplicativos) e
      // entrava na contagem de concluídos/nota DAQUELA matéria; agora o
      // projeto inteiro é uma trilha só, aqui, e conta só pra este card.
      // As chaves de progresso (progressKey) continuam as mesmas de antes,
      // então o que o aluno já fez no navegador não se perde; pro que já
      // estava no Supabase, ver sql/unificar-trilha-financapp.sql.
      // notaSoManual: sem nota calculada. Em Lançar Notas a coluna mostra
      // só se o aluno fez tudo, parte ou nada (módulos com visto) e um campo
      // sempre aberto pra o professor digitar a nota; não entra na % geral.
      key: 'projetos', label: 'Projetos', icon: '🚀', notaSoManual: true,
      trilhas: [
        {
          // App de controle financeiro pessoal, construído peça por peça no
          // MESMO repositório GitHub criado no Kickoff. Ver
          // Atividades/Desenvolvimento de Sistemas/Projeto FinancApp — *.md
          // pra especificação completa de cada peça. Nenhuma peça tem
          // correção automática: todas terminam com o visto do professor
          // (shared/professor-visto.js). Sem `requires` entre as peças de
          // propósito — antes elas eram independentes, e travar agora
          // bloquearia quem já fez uma peça fora de ordem.
          key: 'projeto-financapp',
          label: 'FinancApp: App de Controle Financeiro',
          desc: 'Projeto integrador: construa, peça por peça, um app de controle financeiro de verdade — do repositório no GitHub e do DER até o banco no Supabase com RLS, o tráfego HTTP no DevTools e o aplicativo em JavaScript funcionando com dados reais.',
          // As capacidades MSEP de cada peça, na ordem das peças.
          capacidade: 'Reconhecer as diferentes fases pertinentes à elaboração de um projeto / Elaborar modelo de dados e definir requisitos funcionais e não funcionais de um sistema / Aplicar procedimentos de segurança e backup no SGBD / Reconhecer tipos e características (classificação, estrutura e modelos) / Aplicar, de forma integrada, lógica de programação, manipulação de objetos e validação de formulário na construção de um aplicativo completo em JavaScript.',
          modules: [
            {
              key: 'kickoff', title: 'Kickoff do Projeto FinancApp (GitHub)',
              desc: 'Crie o repositório financapp-seuusuario, um README completo e as 5 issues do MVP. O portal não corrige essa atividade sozinho — na última etapa, chame o professor pra dar o visto.',
              icon: '🚀', src: 'atividades/projeto-financapp-kickoff-trabalho.html', telaCheia: true,
              progressKey: 'projeto_financapp_kickoff_trabalho_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'modelagem', title: 'FinancApp: Modelagem de Dados e Requisitos',
              desc: 'Levantem os requisitos funcionais/não funcionais do FinancApp, modelem as entidades/atributos/relacionamentos (incluindo a tabela de junção lançamento↔tag) e desenhem o DER, commitado em docs/der.png. O portal não corrige essa atividade sozinho — na última etapa, chame o professor pra dar o visto.',
              icon: '🧩', src: 'atividades/projeto-financapp-modelagem-trabalho.html', telaCheia: true,
              progressKey: 'projeto_financapp_modelagem_trabalho_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'banco-dados', title: 'FinancApp: Banco de Dados e RLS',
              desc: 'Criem o projeto Supabase financapp, as 4 tabelas do DER com FK, habilitem RLS e criem as policies de leitura/inserção/atualização. O portal não corrige essa atividade sozinho — na última etapa, chame o professor pra dar o visto.',
              icon: '🗄️', src: 'atividades/projeto-financapp-banco-dados-trabalho.html', telaCheia: true,
              progressKey: 'projeto_financapp_banco_dados_trabalho_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'redes', title: 'FinancApp: Como o FinancApp Conversa com a Internet',
              desc: 'Usem o projeto Supabase do FinancApp pra observar, no DevTools, uma requisição HTTP real: método, URL, headers, DNS, HTTPS, status code e a camada de aplicação. O portal não corrige essa atividade sozinho — na última etapa, chame o professor pra dar o visto.',
              icon: '🌐', src: 'atividades/redes-servicos-financapp-pratica.html', telaCheia: true,
              progressKey: 'redes_servicos_financapp_pratica_progress_', progressMode: 'flag',
              hasGabarito: true
            },
            {
              key: 'app', title: 'FinancApp: Construa o Aplicativo (JavaScript)',
              desc: 'Escrevam as 5 funções assíncronas do backend do FinancApp (supabase-js, tratamento de erro) e, em seguida, liguem o HTML/CSS fornecidos pelo professor a elas — cadastro, login, perfil, saldo/extrato, registrar lançamento, tags e Web App Manifest, funcionando de ponta a ponta com dados reais. O portal não corrige essa atividade sozinho — na última etapa, chame o professor pra dar o visto.',
              icon: '📱', src: 'atividades/projeto-financapp-app-trabalho.html', telaCheia: true,
              progressKey: 'projeto_financapp_app_trabalho_progress_', progressMode: 'flag',
              hasGabarito: true
            }
          ]
        },
        {
          // Culminância: o evento de fim de ano em que os projetos são
          // apresentados. Por enquanto só a aba, sem módulos (o portal mostra
          // "Nenhum módulo cadastrado ainda") — o conteúdo entra depois.
          // semEntrega: fica fora de toda conta (fez tudo/parte/nada, %,
          // ranking, Perfil). Sem capacidade de propósito: a capacidade MSEP
          // não pode ser inventada; entra junto com os módulos.
          key: 'culminancia',
          label: 'Culminância',
          desc: 'Evento de fim de ano em que a turma apresenta os projetos. Um card por proposta, com a ficha do projeto e o visto do professor.',
          semEntrega: true,
          // Cards de projeto: ficha em etapas (visão geral, funcionalidades,
          // equipamentos/tecnologias, Supabase, equipes e cronograma) e visto
          // no fim. Todos usam VS Code/Codespace + Supabase.
          modules: [
            {
              key: 'irrigacao', title: 'Projeto 1 — Irrigação Automatizada da Escola',
              desc: 'ESP32 + sensor de umidade + bomba regando sozinho, dados no Supabase e app instalável (PWA) com acionamentos, média de litros e de umidade. Com maquete.',
              icon: '💧', src: 'atividades/culminancia-irrigacao.html', telaCheia: true,
              progressKey: 'culminancia_irrigacao_progress_', progressMode: 'flag',
              semEntrega: true, hasGabarito: true
            },
            {
              key: 'atlas', title: 'Projeto 2 — Portal Atlas: Educação Especial e Simulador do ENEM',
              desc: 'Finalizar o portal Atlas, com jogos de alfabetização e quebra-cabeças acessíveis e um simulado do ENEM (~800 questões) com gráfico de onde estudar mais.',
              icon: '🧭', src: 'atividades/culminancia-atlas.html', telaCheia: true,
              progressKey: 'culminancia_atlas_progress_', progressMode: 'flag',
              semEntrega: true, hasGabarito: true
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
          desc: 'Diagnóstico do conhecimento dos alunos em todas as matérias trabalhadas na turma — 20 questões sorteadas de um banco de 60 (teoria e prática), com 5 alternativas embaralhadas e trava anti-saída durante a prova.',
          // TODO(professor): capacidade PROVISÓRIA — esta prova é diagnóstica
          // (cobre várias capacidades de várias matérias ao mesmo tempo, pra
          // identificar o que a turma já domina e onde ainda falta reforço),
          // não uma única capacidade MSEP específica. Ajuste esse texto se
          // a coordenação pedir um enquadramento formal diferente.
          capacidade: 'Diagnóstico do conjunto de capacidades trabalhadas nas matérias do curso, pra identificar o que os alunos já dominam e onde ainda precisam de reforço.',
          modules: [
            {
              // Sem correção "aprovado/reprovado" automática de propósito:
              // é uma prova de verdade, não um quiz de treino — uma única
              // tentativa oficial, sem botão de "tentar de novo" ao errar.
              // A pontuação final (correctCount/total) fica registrada no
              // progresso pra o professor conferir/lançar nota na Gestão.
              // Trava "sair da tela = advertência, saiu de novo = bloqueio"
              // via shared/exam-proctor.js — mesmo mecanismo de
              // modelagem-dados-requisitos-questionario.html. Desbloqueio:
              // token de 6 dígitos do professor (shared/professor-visto.js).
              key: 'prova', title: 'Prova Diagnóstica — Turma Sistemas',
              desc: '20 questões (sorteadas de um banco de 60) cobrindo Banco de Dados, Desenvolvimento de Sistemas 1, Redes, Internet das Coisas, Introdução de Dev. de Projetos, Modelagem de Sistemas 1, Projeto de Vida, Mundo do Trabalho e Programação de Aplicativos.',
              icon: '📋', src: 'atividades/prova-sistemas.html',
              progressKey: 'prova_sistemas_progress_', progressMode: 'flag',
              hasGabarito: true
            }
          ]
        },
        {
          // Atividade SEPARADA da Prova Diagnóstica acima — reaproveita boa
          // parte do banco de questões dela, mas tem banco e trava próprios
          // (não compartilha progresso nem seleção sorteada). Por ficar em
          // trilhas[1] (não trilhas[0]) da matéria 'prova', a nota dela NÃO
          // vira sozinha a coluna "Prova" do Relatório de Notas (ver
          // provaTrilhaKey() em shared/platform-core.js) — em vez disso
          // preenche automaticamente a coluna "Prova Final" (nota3Label/
          // nota3TrilhaKey/nota3ActivityLocation acima), travada pro
          // professor, igual a coluna "Prova" já faz pra Prova Diagnóstica.
          key: 'prova-final',
          label: 'Prova Final',
          desc: 'Prova final teórica e prática cobrindo todas as matérias trabalhadas na turma — 25 questões sorteadas de um banco de 80 (72 teóricas + 8 práticas, sempre pelo menos 5 práticas por aluno), com trava anti-saída.',
          capacidade: 'Avaliação final do conjunto de capacidades trabalhadas nas matérias do curso, incluindo a escrita de código de verdade (criar variável, somar valores, corrigir erros).',
          modules: [
            {
              // Mesmo mecanismo de bloqueio "sair da aba = advertência, saiu
              // de novo = bloqueio" (shared/exam-proctor.js) e mesmo token de
              // desbloqueio (shared/professor-visto.js) da Prova Diagnóstica.
              // A parte prática usa o mesmo motor de sandbox (`new Function`)
              // de atividades/prog-depuracao-pratica.html, mas embutido no
              // fluxo sequencial de perguntas (não numa sidebar de chamados).
              key: 'prova-final', title: 'Prova Final — Turma Sistemas',
              desc: '25 questões (sorteadas de um banco de 80) cobrindo teoria de todas as matérias já trabalhadas — e pelo menos 5 delas são práticas: criar variável, somar dois números e corrigir trechos de código com erro, direto no editor.',
              icon: '📝', src: 'atividades/prova-final-sistemas.html',
              progressKey: 'prova_final_sistemas_progress_', progressMode: 'flag',
              hasGabarito: true
            }
          ]
        },
        {
          // Trabalho em DUPLA, interdisciplinar: cada dupla cria a ideia de
          // um app "que dá dinheiro" e apresenta modelagem de sistemas,
          // modelagem de banco de dados, protótipo no Figma e estimativa de
          // custo/receita numa apresentação ao vivo pra turma. Sem correção
          // automática (produto é a apresentação + link do Figma) — visto
          // do professor aqui, igual aos demais trabalhos. A NOTA (até 10
          // pontos) não é lançada aqui: o professor lança em "Lançar Notas",
          // coluna Nota 4 (Nota 3 é reservada pra Prova Final nesta turma,
          // ver nota3Label no topo deste arquivo) — Nota 3 e Nota 4 já
          // contam pra TODAS as matérias do bimestre ao mesmo tempo (ver
          // loadNotas em shared/platform-core.js), então uma única nota por
          // aluno já "vale pra todas as matérias" sem precisar de mecanismo
          // novo.
          // Entra como trilhas[1] da matéria 'prova' (não trilhas[0]) de
          // propósito — provaTrilhaKey() em platform-core.js só olha pra
          // trilhas[0] pra achar a Prova Diagnóstica; manter essa ordem
          // evita quebrar a coluna "Prova" do relatório de notas.
          // TODO(professor): capacidade PROVISÓRIA — atividade
          // interdisciplinar (não mapeia numa única capacidade MSEP);
          // ajuste o texto se a coordenação pedir enquadramento diferente.
          key: 'projeto-app-empreendedor',
          label: 'Projeto Empreendedor: Crie seu App',
          desc: 'Trabalho em dupla: criem a ideia de um app que geraria dinheiro de verdade, modelem o sistema e o banco de dados, prototipem as telas no Figma, estimem custo e receita — e apresentem tudo pra turma em slides. Vale até 10 pontos, contando pra todas as matérias.',
          capacidade: 'Aplicar, de forma integrada, modelagem de sistemas, modelagem de dados, prototipação de interface e viabilidade financeira na concepção de um produto próprio, com viés empreendedor.',
          modules: [
            {
              key: 'trabalho', title: 'Trabalho — Projeto Empreendedor: Crie seu App (Dupla)',
              desc: 'Em dupla: idealizem um app, modelem o sistema e o banco de dados, prototipem no Figma, estimem custo/receita e apresentem pra turma em slides. O portal não corrige essa atividade sozinho — depois da apresentação, chamem o professor pra dar o visto.',
              icon: '💼', src: 'atividades/projeto-app-empreendedor-trabalho.html',
              progressKey: 'projeto_app_empreendedor_trabalho_progress_', progressMode: 'flag',
              hasGabarito: true
            }
          ]
        }
      ]
    }
  ],

  // Insígnias da trilha "Curso de Desenvolvimento de Sistemas" (ver aba
  // Perfil, só aluno). Progressivas por % geral de conclusão
  // (student_module_progress) — minPct:0 é tratada à parte em platform-
  // core.js (exige progresso real, não só "0% arredondado"). Sem tabela
  // nova no Supabase: é só uma leitura derivada do progresso já sincronizado.
  insignias: [
    { key: 'iniciante', label: 'Iniciante', desc: 'Começou sua jornada no universo da programação!', icon: '💻', minPct: 0 },
    { key: 'logico', label: 'Lógico', desc: 'Entendeu a lógica e escreveu seus primeiros códigos!', icon: '🧩', minPct: 20 },
    { key: 'desenvolvedor', label: 'Desenvolvedor', desc: 'Construiu soluções e deu vida às suas ideias!', icon: '🗄️', minPct: 40 },
    { key: 'arquiteto', label: 'Arquiteto', desc: 'Organizou ideias e criou sistemas estruturados!', icon: '🖥️', minPct: 60 },
    { key: 'inovador', label: 'Inovador', desc: 'Aplicou boas práticas e levou seu código para outro nível!', icon: '☁️', minPct: 80 },
    { key: 'guardiao-do-codigo', label: 'Guardião do Código', desc: 'Escreve com excelência, pensa no futuro e faz a diferença!', icon: '🛡️', minPct: 100 }
  ]
};
