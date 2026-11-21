/**
 * DEMONSTRAÇÃO — catálogo de atividades usado pelo motor de personalização.
 *
 * Títulos e textos são ILUSTRATIVOS (não são o catálogo real do MVF). As regras
 * de inclusão, porém, são reais e determinísticas: o motor em
 * src/lib/personalization/engine.ts lê este catálogo.
 *
 * Regras de integridade (verificadas em testes):
 * - IDs estáveis; os 18 IDs da trilha original foram preservados.
 * - A ordem do array é a ordem global; pré-requisitos só apontam para trás.
 * - Textos não afirmam regras do TikTok Shop, comissões ou preços: remetem às
 *   aulas e às orientações oficiais.
 *
 * Módulo puro (somente `import type` de "@/...") para rodar com `node --test`.
 */
import type { PlanContext, StageTemplate, TaskTemplate } from "../lib/personalization/context.ts";
import { TRACK_LABEL } from "../lib/personalization/context.ts";

const ALL = () => true;

function formatsText(ctx: PlanContext): string {
  return ctx.tracks.map((t) => TRACK_LABEL[t]).join(" + ");
}

export const STAGE_TEMPLATES: StageTemplate[] = [
  {
    id: "s-preparacao",
    title: "Preparação",
    shortTitle: "Preparação",
    description: (ctx) =>
      ctx.beginner
        ? "Entender a jornada e deixar conta e acessos em ordem antes de produzir."
        : "Revisar o essencial de conta e elegibilidade e organizar seu ritmo.",
  },
  {
    id: "s-perfil-produto",
    title: "Perfil e produto",
    shortTitle: "Perfil e produto",
    description: "Escolher com intenção o que divulgar e como falar do produto com responsabilidade.",
  },
  {
    id: "s-formato",
    title: (ctx) =>
      ctx.has("explorar") ? "Explorar formatos" : `Meu formato: ${formatsText(ctx)}`,
    shortTitle: (ctx) => (ctx.has("explorar") ? "Explorar formatos" : "Meu formato"),
    description: (ctx) => {
      if (ctx.has("explorar")) return "Comparar formatos e escolher um primeiro experimento, sem decisão definitiva.";
      if (ctx.has("camera")) return "Ficar à vontade na câmera e mostrar o produto com naturalidade.";
      return `Preparar o formato ${formatsText(ctx)} — sem precisar mostrar o rosto.`;
    },
  },
  {
    id: "s-producao",
    title: "Produção",
    shortTitle: "Produção",
    description: "Roteirizar e produzir seu vídeo no formato escolhido.",
  },
  {
    id: "s-publicacao",
    title: "Publicação",
    shortTitle: "Publicação",
    description: "Revisar com calma e colocar o vídeo no ar.",
  },
  {
    id: "s-analise",
    title: (ctx) => (ctx.experienced ? "Análise e próximos passos" : "Primeiras análises e próximos passos"),
    shortTitle: "Análise",
    description: "Observar os sinais com calma e preparar a continuidade.",
  },
];

export const TASK_CATALOG: TaskTemplate[] = [
  /* ---------------------------- Preparação ---------------------------- */
  {
    id: "t-boas-vindas",
    stageId: "s-preparacao",
    type: "lesson",
    lessonId: "l-boas-vindas",
    title: "Boas-vindas: como funciona o seu plano",
    durationMinutes: 10,
    prerequisites: [],
    audience: "Todas",
    tags: ["base", "jornada"],
    include: ALL,
    optional: (ctx) => ctx.experienced,
    description: "Uma visão geral de como as etapas se conectam e de como usar o app no dia a dia.",
    objective: "Saber o que esperar de cada etapa e como acompanhar seu progresso.",
    completionCriteria: "Assistir à aula até o final.",
    why: (ctx) =>
      ctx.experienced
        ? "Opcional para você, que já vendeu: uma visão rápida de como o app organiza o seu plano."
        : "Todo plano começa aqui, para você saber onde está e o que vem depois.",
  },
  {
    id: "t-fundamentos",
    stageId: "s-preparacao",
    type: "lesson",
    lessonId: "l-fundamentos-shop",
    title: "Fundamentos do TikTok Shop para afiliadas",
    durationMinutes: 25,
    prerequisites: ["t-boas-vindas"],
    audience: "Todas (opcional para quem já vende)",
    tags: ["base", "tiktok-shop"],
    include: ALL,
    optional: (ctx) => ctx.experienced && ctx.profile.mainBlocker !== "entender_tiktok_shop",
    description: "Os conceitos essenciais de como funciona a venda como afiliada, explicados no método MVF.",
    objective: "Entender o caminho entre um vídeo publicado e uma possível comissão.",
    completionCriteria: "Assistir à aula e anotar as dúvidas que surgirem.",
    why: (ctx) => {
      if (ctx.profile.mainBlocker === "entender_tiktok_shop")
        return "Você contou que entender o TikTok Shop é sua maior dificuldade — por isso os fundamentos vêm primeiro.";
      if (ctx.experienced) return "Revisão opcional: você já vendeu, então pode pular se o conteúdo já for familiar.";
      return "Como você está começando, os fundamentos vêm antes de produzir.";
    },
  },
  {
    id: "t-elegibilidade",
    stageId: "s-preparacao",
    type: "lesson",
    lessonId: "l-conta-elegibilidade",
    title: "Conta, publicação e elegibilidade: entenda a diferença",
    durationMinutes: 15,
    prerequisites: ["t-fundamentos"],
    audience: "Todas — nunca opcional",
    tags: ["base", "conta", "elegibilidade", "conformidade"],
    include: ALL,
    description:
      "Publicar vídeos e vender pelo TikTok Shop dependem de requisitos diferentes. A aula explica como verificar a situação da sua conta nas fontes oficiais.",
    objective: "Saber onde conferir os requisitos atuais, sem depender de informação de terceiros.",
    completionCriteria: "Assistir à aula e saber onde consultar os requisitos oficiais.",
    why: () =>
      "Esta orientação está em todos os planos: os requisitos oficiais podem mudar, e conhecer a diferença entre publicar e vender evita surpresas.",
  },
  {
    id: "t-conta-pronta",
    stageId: "s-preparacao",
    type: "action",
    title: "Confirme se sua conta está pronta para publicar",
    durationMinutes: 15,
    prerequisites: ["t-elegibilidade"],
    audience: "Conta não preparada ou sem certeza",
    tags: ["conta", "iniciante"],
    include: (ctx) => ctx.accountNeedsWork,
    description:
      "Revise a situação da sua conta seguindo o passo a passo da aula. Se tiver dúvida sobre requisitos, consulte as orientações oficiais e o suporte.",
    objective: "Saber se você já pode publicar e o que falta ajustar.",
    completionCriteria: "Você revisou sua conta e anotou o que está pronto e o que falta.",
    why: (ctx) =>
      ctx.profile.accountReady === "nao"
        ? "Você respondeu que a conta ainda não está pronta. Resolver isso cedo evita travar na publicação."
        : "Você não tinha certeza sobre a conta. Esta checagem vem antes de tudo que depende dela.",
  },
  {
    id: "t-acesso-numi",
    stageId: "s-preparacao",
    type: "action",
    title: "Confirme seu acesso aos produtos e links da NUMI",
    durationMinutes: 15,
    prerequisites: ["t-elegibilidade"],
    audience: "Sem acesso NUMI confirmado",
    tags: ["numi", "afiliacao"],
    include: (ctx) => ctx.numiNeedsWork,
    description:
      "Siga as orientações oficiais da equipe para acessar o catálogo e os links de divulgação. Não é preciso ter estoque físico. Regras de comissão são informadas pela equipe — não presuma valores.",
    objective: "Ter acesso ao que você vai divulgar antes de produzir.",
    completionCriteria: "Você sabe como acessar os produtos e links, ou abriu um pedido de ajuda no suporte.",
    why: (ctx) =>
      ctx.profile.numiAccess === "nao"
        ? "Você ainda não tem acesso aos produtos/links da NUMI — isso precisa vir antes da divulgação."
        : "Você não sabia se tem acesso à NUMI. Confirmar agora evita produzir sem poder divulgar.",
  },
  {
    id: "t-organizar-rotina",
    stageId: "s-preparacao",
    type: "action",
    title: "Reserve seus horários da semana",
    durationMinutes: 15,
    prerequisites: [],
    audience: "Dificuldade de organização ou foco em consistência",
    tags: ["organizacao", "consistencia"],
    include: (ctx) => ctx.profile.mainBlocker === "organizacao" || ctx.profile.goal === "consistencia",
    description: (ctx) =>
      `Escolha os dias e horários em que vai cuidar do plano, considerando cerca de ${ctx.minutes} min por dia.`,
    objective: "Ter um ritmo realista que caiba na sua semana.",
    completionCriteria: "Horários anotados na agenda ou no celular.",
    why: (ctx) =>
      ctx.profile.mainBlocker === "organizacao"
        ? "Você contou que se organizar é o mais difícil — um ritmo combinado com você mesma ajuda a não travar."
        : "Seu objetivo é consistência, e ela começa com horários reservados.",
  },

  /* ------------------------- Perfil e produto ------------------------- */
  {
    id: "t-revisar-videos",
    stageId: "s-perfil-produto",
    type: "action",
    title: "Revise seus vídeos anteriores",
    durationMinutes: 30,
    prerequisites: [],
    audience: "Quem já vendeu ou quer melhorar resultados",
    tags: ["analise", "experiente"],
    include: (ctx) => ctx.experienced || ctx.profile.goal === "melhorar_resultados",
    description:
      "Separe seus vídeos recentes e anote o que eles têm em comum: gancho, produto, duração e formato.",
    objective: "Partir do que você já sabe sobre o seu público.",
    completionCriteria: "Anotações sobre pelo menos 3 vídeos anteriores.",
    why: (ctx) =>
      ctx.profile.goal === "melhorar_resultados"
        ? "Para melhorar resultados, o ponto de partida é o que já funcionou (ou não) para você."
        : "Você já vendeu: aproveitar a sua experiência economiza tempo.",
  },
  {
    id: "t-aula-produto",
    stageId: "s-perfil-produto",
    type: "lesson",
    lessonId: "l-escolher-produto",
    title: "Como escolher seu primeiro produto",
    durationMinutes: 20,
    prerequisites: ["t-fundamentos"],
    audience: "Todas (opcional para quem já vende)",
    tags: ["base", "produto"],
    include: ALL,
    optional: (ctx) => ctx.experienced && ctx.profile.mainBlocker !== "escolher_produto",
    description: "Critérios práticos para escolher um produto que combine com você e com o seu formato.",
    objective: "Ter critérios claros para decidir, sem depender de achismo.",
    completionCriteria: "Assistir à aula e listar de 2 a 3 produtos candidatos.",
    why: (ctx) =>
      ctx.profile.mainBlocker === "escolher_produto"
        ? "Escolher produto foi o ponto que você marcou como mais difícil. Esta aula vem antes de qualquer gravação."
        : ctx.experienced
          ? "Revisão opcional dos critérios de escolha, útil para reavaliar seu produto atual."
          : "A escolha do produto orienta roteiro, formato e divulgação.",
  },
  {
    id: "t-escolher-produto",
    stageId: "s-perfil-produto",
    type: "action",
    title: "Escolha 1 produto NUMI para os próximos vídeos",
    durationMinutes: 20,
    prerequisites: ["t-aula-produto", "t-acesso-numi"],
    audience: "Todas",
    tags: ["base", "produto", "numi"],
    include: ALL,
    description:
      "Entre os candidatos, escolha um único produto para concentrar seus próximos vídeos e anote 3 benefícios que você vai destacar.",
    objective: "Focar a energia em um produto e conhecê-lo bem.",
    completionCriteria: "Um produto escolhido e 3 benefícios anotados.",
    why: () => "Focar em um produto no começo deixa roteiros e vídeos mais consistentes.",
  },
  {
    id: "t-conformidade",
    stageId: "s-perfil-produto",
    type: "lesson",
    lessonId: "l-alegacoes",
    title: "Alegações de produto e diretrizes da plataforma",
    durationMinutes: 20,
    prerequisites: ["t-escolher-produto"],
    audience: "Todas — nunca opcional",
    tags: ["base", "conformidade"],
    include: ALL,
    description:
      "O que você pode e não pode afirmar sobre um cosmético, e onde consultar as diretrizes oficiais de conteúdo e de comércio.",
    objective: "Divulgar com segurança, sem promessas que o produto não sustenta.",
    completionCriteria: "Assistir à aula e revisar os 3 benefícios anotados com esse olhar.",
    why: () =>
      "Está em todos os planos: o que se afirma sobre um produto importa, e seguir as diretrizes oficiais protege você e a sua conta.",
  },
  {
    id: "t-perfil",
    stageId: "s-perfil-produto",
    type: "action",
    title: "Ajuste nome, foto e bio do perfil",
    durationMinutes: 15,
    prerequisites: ["t-escolher-produto"],
    audience: "Iniciantes ou foco em preparar a conta",
    tags: ["perfil", "iniciante"],
    include: (ctx) => ctx.beginner || ctx.profile.goal === "preparar_conta",
    description: "Deixe claro, em poucos segundos, sobre o que é o seu perfil — alinhado ao produto e ao formato.",
    objective: "Um perfil que explica o que a pessoa vai encontrar ali.",
    completionCriteria: "Nome, foto e bio revisados.",
    why: (ctx) =>
      ctx.profile.goal === "preparar_conta"
        ? "Seu objetivo agora é preparar a conta, e o perfil é a primeira coisa que as pessoas veem."
        : "Quem chega pelos seus vídeos olha o perfil antes de seguir ou comprar.",
  },

  /* ------------------------------ Formato ----------------------------- */
  // Explorar
  {
    id: "t-aula-formatos",
    stageId: "s-formato",
    type: "lesson",
    lessonId: "l-comparar-formatos",
    title: "Comparando formatos: câmera, avatar, mãos e narração",
    durationMinutes: 20,
    prerequisites: ["t-escolher-produto"],
    audience: "Indecisas / quero explorar",
    tags: ["formato", "explorar"],
    include: (ctx) => ctx.has("explorar"),
    description: "Exemplos de cada formato, o esforço envolvido e para quem cada um costuma funcionar melhor.",
    objective: "Conhecer as opções antes de escolher.",
    completionCriteria: "Assistir à aula e marcar os dois formatos que mais combinam com você.",
    why: () => "Você quer explorar antes de decidir — esta comparação ajuda sem obrigar uma escolha definitiva.",
  },
  {
    id: "t-escolher-experimento",
    stageId: "s-formato",
    type: "action",
    title: "Escolha o formato do seu primeiro experimento",
    durationMinutes: 15,
    prerequisites: ["t-aula-formatos"],
    audience: "Indecisas / quero explorar",
    tags: ["formato", "explorar"],
    include: (ctx) => ctx.has("explorar"),
    description:
      "Escolha um formato só para o primeiro vídeo. É um teste: depois você pode ajustar suas respostas e o plano muda junto.",
    objective: "Começar a produzir sem ficar presa à decisão.",
    completionCriteria: "Formato do primeiro experimento escolhido.",
    why: () => "Um experimento pequeno destrava a produção. Se não gostar, troque o formato em “Ajustar minhas respostas”.",
  },
  // Câmera
  {
    id: "t-aula-camera",
    stageId: "s-formato",
    type: "lesson",
    lessonId: "l-camera",
    title: "Preparação para câmera: luz, enquadramento e fala natural",
    durationMinutes: 25,
    prerequisites: ["t-escolher-produto"],
    audience: "Quem quer aparecer",
    tags: ["formato", "camera"],
    include: (ctx) => ctx.has("camera"),
    description: "Como se posicionar, usar a luz disponível e falar do produto com naturalidade.",
    objective: "Ficar à vontade gravando.",
    completionCriteria: "Assistir à aula e preparar seu cantinho de gravação.",
    why: (ctx) =>
      ctx.profile.mainBlocker === "gravar"
        ? "Você marcou gravar como sua maior dificuldade e quer aparecer — esta aula vem antes de ligar a câmera."
        : "Você quer aparecer nos vídeos, então o plano começa preparando você para a câmera.",
  },
  {
    id: "t-teste-camera",
    stageId: "s-formato",
    type: "action",
    title: "Grave um teste de 30 segundos falando do produto",
    durationMinutes: 20,
    prerequisites: ["t-aula-camera", "t-escolher-produto"],
    audience: "Quem quer aparecer",
    tags: ["formato", "camera", "pratica"],
    include: (ctx) => ctx.has("camera"),
    description: "Um teste só para você: grave, assista e anote o que ajustaria. Não precisa publicar.",
    objective: "Perder o receio da câmera antes do vídeo de verdade.",
    completionCriteria: "Um teste gravado e assistido.",
    why: () => "Praticar sem pressão deixa o primeiro vídeo publicado muito mais leve.",
  },
  // Avatar de IA
  {
    id: "t-aula-ia-basico",
    stageId: "s-formato",
    type: "lesson",
    lessonId: "l-ia-primeiros-passos",
    title: "Primeiros passos com ferramentas de IA",
    durationMinutes: 15,
    prerequisites: [],
    audience: "Avatar de IA + nunca usou IA",
    tags: ["formato", "avatar-ia", "iniciante"],
    include: (ctx) => ctx.has("avatar") && ctx.profile.aiExperience === "nunca_usei",
    description: "Conceitos básicos para escrever pedidos (prompts) e revisar resultados com olhar crítico.",
    objective: "Chegar à criação da personagem sabendo o básico.",
    completionCriteria: "Assistir à aula e testar um prompt simples.",
    why: () => "Você escolheu avatar de IA e ainda não usou essas ferramentas — este passo evita frustração depois.",
  },
  {
    id: "t-aula-personagem",
    stageId: "s-formato",
    type: "lesson",
    lessonId: "l-personagem-ia",
    title: "Criando sua personagem com IA",
    durationMinutes: 30,
    prerequisites: ["t-escolher-produto", "t-aula-ia-basico"],
    audience: "Avatar de IA",
    tags: ["formato", "avatar-ia", "personagem"],
    include: (ctx) => ctx.has("avatar"),
    description: "Como definir aparência, voz e estilo de uma personagem que represente a sua marca.",
    objective: "Entender o que torna uma personagem reconhecível.",
    completionCriteria: "Assistir à aula até o final.",
    why: () => "Você prefere não aparecer e escolheu avatar de IA. Esta é a base do seu formato.",
  },
  {
    id: "t-ficha-personagem",
    stageId: "s-formato",
    type: "action",
    title: "Monte a ficha da sua personagem",
    durationMinutes: 30,
    prerequisites: ["t-aula-personagem"],
    audience: "Avatar de IA",
    tags: ["formato", "avatar-ia", "personagem"],
    include: (ctx) => ctx.has("avatar"),
    description: "Preencha nome, idade aparente, estilo, cenário recorrente e tom de voz da personagem.",
    objective: "Ter uma referência única para todos os seus prompts.",
    completionCriteria: "Ficha preenchida com os campos sugeridos na aula.",
    why: () => "A ficha garante que a personagem continue a mesma de um vídeo para o outro.",
  },
  {
    id: "t-aula-consistencia",
    stageId: "s-formato",
    type: "lesson",
    lessonId: "l-consistencia",
    title: "Prompt visual e consistência de personagem",
    durationMinutes: 25,
    prerequisites: ["t-ficha-personagem"],
    audience: "Avatar de IA",
    tags: ["formato", "avatar-ia", "prompt", "consistencia"],
    include: (ctx) => ctx.has("avatar"),
    description: "Como transformar a ficha em prompts visuais e manter a personagem igual entre as cenas.",
    objective: "Escrever prompts que gerem sempre a mesma personagem.",
    completionCriteria: "Assistir à aula e adaptar o prompt-modelo à sua ficha.",
    why: (ctx) =>
      ctx.profile.aiExperience === "uso_com_frequencia"
        ? "Mesmo para quem usa IA com frequência, consistência de personagem é o que diferencia um avatar reconhecível."
        : "Consistência é o ponto em que mais gente trava com avatar — por isso ela vem antes das variações.",
  },
  {
    id: "t-variacoes",
    stageId: "s-formato",
    type: "action",
    title: "Gere 3 variações e escolha a principal",
    durationMinutes: 40,
    prerequisites: ["t-aula-consistencia"],
    audience: "Avatar de IA",
    tags: ["formato", "avatar-ia", "pratica"],
    include: (ctx) => ctx.has("avatar"),
    description: "Use seu prompt para gerar três versões da personagem e escolha a que mais combina.",
    objective: "Definir a imagem oficial da sua personagem.",
    completionCriteria: "Uma imagem principal escolhida e salva com o prompt usado.",
    why: () => "Ter a imagem principal definida acelera a produção dos vídeos.",
  },
  // Mãos e produto
  {
    id: "t-aula-enquadramento",
    stageId: "s-formato",
    type: "lesson",
    lessonId: "l-maos-enquadramento",
    title: "Enquadramento e iluminação para mãos e produto",
    durationMinutes: 20,
    prerequisites: ["t-escolher-produto"],
    audience: "Mãos e produto",
    tags: ["formato", "maos-produto", "iluminacao"],
    include: (ctx) => ctx.has("maos"),
    description: "Como posicionar o celular, aproveitar a luz e montar um fundo simples — sem mostrar o rosto.",
    objective: "Imagens limpas em que o produto é o protagonista.",
    completionCriteria: "Assistir à aula e montar seu espaço de gravação.",
    why: (ctx) =>
      ctx.profile.mainBlocker === "gravar"
        ? "Você marcou gravar como dificuldade: com mãos e produto, o segredo está em enquadramento e luz."
        : "Você escolheu gravar só com mãos e produto — enquadramento e luz fazem toda a diferença.",
  },
  {
    id: "t-aula-close",
    stageId: "s-formato",
    type: "lesson",
    lessonId: "l-close-produto",
    title: "Close de produto e gravação de mãos",
    durationMinutes: 20,
    prerequisites: ["t-aula-enquadramento"],
    audience: "Mãos e produto",
    tags: ["formato", "maos-produto"],
    include: (ctx) => ctx.has("maos"),
    description: "Movimentos de mão, textura, aplicação e detalhes do produto em close.",
    objective: "Mostrar o produto de um jeito que dá vontade de experimentar.",
    completionCriteria: "Assistir à aula até o final.",
    why: () => "No formato mãos e produto, os closes fazem o papel que o rosto faria.",
  },
  {
    id: "t-teste-maos",
    stageId: "s-formato",
    type: "action",
    title: "Grave 3 takes de teste com mãos e produto",
    durationMinutes: 30,
    prerequisites: ["t-aula-close", "t-escolher-produto"],
    audience: "Mãos e produto",
    tags: ["formato", "maos-produto", "pratica"],
    include: (ctx) => ctx.has("maos"),
    description: "Grave três takes curtos e compare luz, foco e movimento. Não precisa publicar.",
    objective: "Encontrar o enquadramento que funciona no seu espaço.",
    completionCriteria: "3 takes gravados e o melhor escolhido.",
    why: () => "Testar antes evita refazer o vídeo final.",
  },
  // Narração e imagens
  {
    id: "t-aula-narracao",
    stageId: "s-formato",
    type: "lesson",
    lessonId: "l-narracao",
    title: "Narração: voz, ritmo e clareza",
    durationMinutes: 20,
    prerequisites: ["t-escolher-produto"],
    audience: "Narração e imagens",
    tags: ["formato", "narracao"],
    include: (ctx) => ctx.has("narracao"),
    description: "Como gravar a voz com o que você tem em casa e manter um ritmo agradável.",
    objective: "Uma narração clara e confiante.",
    completionCriteria: "Assistir à aula e gravar um áudio de teste.",
    why: () => "Você escolheu narração e imagens: sua voz conduz o vídeo.",
  },
  {
    id: "t-sequencia-visual",
    stageId: "s-formato",
    type: "action",
    title: "Monte uma sequência visual de 5 a 7 cenas",
    durationMinutes: 30,
    prerequisites: ["t-aula-narracao", "t-escolher-produto"],
    audience: "Narração e imagens",
    tags: ["formato", "narracao", "pratica"],
    include: (ctx) => ctx.has("narracao"),
    description: "Liste as cenas (imagens ou trechos curtos) que vão acompanhar a sua narração.",
    objective: "Ter o esqueleto visual do vídeo antes de editar.",
    completionCriteria: "Sequência de 5 a 7 cenas definida.",
    why: () => "No formato narração, a sequência visual é o que prende a atenção.",
  },

  /* ----------------------------- Produção ----------------------------- */
  {
    id: "t-aula-roteiro",
    stageId: "s-producao",
    type: "lesson",
    lessonId: "l-roteiro",
    title: "Estrutura de roteiro para vídeos de produto",
    durationMinutes: 20,
    prerequisites: ["t-escolher-produto"],
    audience: "Todas",
    tags: ["base", "roteiro"],
    include: ALL,
    description: "Gancho, demonstração e chamada para ação: a estrutura usada no método.",
    objective: "Saber montar um roteiro curto e claro.",
    completionCriteria: "Assistir à aula até o final.",
    why: (ctx) =>
      ctx.profile.mainBlocker === "roteiros"
        ? "Você marcou roteiros como maior dificuldade — esta estrutura é o atalho para não travar."
        : "Roteiro é a ponte entre o produto escolhido e o seu formato.",
  },
  {
    id: "t-roteiros",
    stageId: "s-producao",
    type: "action",
    title: "Escreva 3 roteiros curtos",
    durationMinutes: 45,
    prerequisites: ["t-aula-roteiro", "t-conformidade"],
    audience: "Todas",
    tags: ["base", "roteiro", "pratica"],
    include: ALL,
    description: "Escreva três roteiros para o seu produto usando a estrutura da aula e as diretrizes de alegações.",
    objective: "Ter material pronto para os próximos vídeos.",
    completionCriteria: "Três roteiros escritos e revisados.",
    why: (ctx) =>
      ctx.profile.mainBlocker === "roteiros"
        ? "Praticar com a estrutura em mãos é o que destrava a escrita de roteiros."
        : "Ter roteiros prontos evita travar na hora de produzir.",
  },
  {
    id: "t-aula-demonstracao",
    stageId: "s-producao",
    type: "lesson",
    lessonId: "l-demonstracao",
    title: "Demonstração de produto em vídeo",
    durationMinutes: 20,
    prerequisites: ["t-teste-camera"],
    audience: "Quem quer aparecer",
    tags: ["producao", "camera"],
    include: (ctx) => ctx.has("camera"),
    description: "Como mostrar uso, textura e resultado do produto enquanto fala com quem assiste.",
    objective: "Unir fala e demonstração de forma natural.",
    completionCriteria: "Assistir à aula até o final.",
    why: () => "Aparecendo, a demonstração do produto é o coração do vídeo.",
  },
  {
    id: "t-aula-flow",
    stageId: "s-producao",
    type: "lesson",
    lessonId: "l-flow",
    title: "Gerando cenas no Google Flow",
    durationMinutes: 30,
    prerequisites: ["t-variacoes"],
    audience: "Avatar de IA",
    tags: ["producao", "avatar-ia", "flow"],
    include: (ctx) => ctx.has("avatar"),
    description: (ctx) =>
      `Como usar a ficha e o prompt da personagem para gerar cenas no Google Flow, uma ferramenta externa ao app.${
        ctx.profile.device === "celular"
          ? " Confira na aula os requisitos de acesso e uso da ferramenta antes de começar."
          : ""
      }`,
    objective: "Transformar roteiro e personagem em cenas de vídeo.",
    completionCriteria: "Assistir à aula e gerar uma cena de teste.",
    why: () => "É a ferramenta externa usada no método para produzir vídeos com avatar. O app não gera vídeos.",
  },
  {
    id: "t-aula-edicao",
    stageId: "s-producao",
    type: "lesson",
    lessonId: "l-edicao-simples",
    title: "Edição simples para vídeos curtos",
    durationMinutes: 20,
    prerequisites: ["t-escolher-produto"],
    audience: "Mãos e produto, narração, explorar, ou dificuldade com edição",
    tags: ["producao", "edicao"],
    include: (ctx) =>
      ctx.has("maos") || ctx.has("narracao") || ctx.has("explorar") || ctx.profile.mainBlocker === "editar",
    description: (ctx) =>
      `Cortes, texto na tela e ritmo, ${
        ctx.profile.device === "computador" ? "no computador" : ctx.profile.device === "celular" ? "pelo celular" : "no celular ou no computador"
      }, sem programas complicados.`,
    objective: "Finalizar vídeos sem depender de edição avançada.",
    completionCriteria: "Assistir à aula e editar um trecho de teste.",
    why: (ctx) =>
      ctx.profile.mainBlocker === "editar"
        ? "Você marcou edição como maior dificuldade — o plano inclui o básico que resolve a maioria dos vídeos."
        : "Seu formato depende de montar cenas, e uma edição simples é suficiente para começar.",
  },
  {
    id: "t-primeiro-video",
    stageId: "s-producao",
    type: "action",
    title: (ctx) => (ctx.experienced ? "Produza um vídeo aplicando o plano" : "Produza seu primeiro vídeo"),
    durationMinutes: 60,
    prerequisites: [
      "t-roteiros",
      "t-aula-demonstracao",
      "t-aula-flow",
      "t-teste-maos",
      "t-sequencia-visual",
      "t-escolher-experimento",
      "t-aula-edicao",
    ],
    audience: "Todas",
    tags: ["base", "producao", "marco"],
    include: ALL,
    description: (ctx) => {
      if (ctx.has("explorar")) return "Produza um vídeo no formato que você escolheu para o experimento.";
      const parts = ctx.tracks.map((t) => TRACK_LABEL[t]).join(" e ");
      return `Junte roteiro e produto para finalizar um vídeo no formato ${parts}.`;
    },
    objective: "Ter um vídeo completo pronto para revisão.",
    completionCriteria: "Um vídeo finalizado e salvo.",
    why: (ctx) =>
      ctx.tracks.length > 1
        ? "Você escolheu dois formatos: comece por um deles neste vídeo e use o outro no seguinte."
        : "Este é o marco principal da etapa de produção.",
  },

  /* ---------------------------- Publicação ---------------------------- */
  {
    id: "t-aula-checklist",
    stageId: "s-publicacao",
    type: "lesson",
    lessonId: "l-checklist",
    title: "Checklist antes de publicar",
    durationMinutes: 15,
    prerequisites: ["t-primeiro-video"],
    audience: "Todas",
    tags: ["base", "publicacao"],
    include: ALL,
    description: "Pontos para revisar antes de colocar o vídeo no ar, conforme o método e as diretrizes oficiais.",
    objective: "Publicar com segurança e sem esquecer etapas.",
    completionCriteria: "Assistir à aula e passar o checklist no seu vídeo.",
    why: () => "Uma revisão simples evita retrabalho depois de publicar.",
  },
  {
    id: "t-publicar",
    stageId: "s-publicacao",
    type: "action",
    title: (ctx) => (ctx.experienced ? "Publique o vídeo do plano" : "Publique seu primeiro vídeo"),
    durationMinutes: 20,
    prerequisites: ["t-aula-checklist", "t-conta-pronta", "t-acesso-numi", "t-conformidade"],
    audience: "Todas",
    tags: ["base", "publicacao", "marco"],
    include: ALL,
    description:
      "Publique o vídeo seguindo o checklist. Nesta versão, a conclusão é marcada por você (autorrelato).",
    objective: "Ter o vídeo no ar.",
    completionCriteria: "Vídeo publicado (autorrelato — ainda sem verificação automática).",
    why: (ctx) => {
      switch (ctx.profile.goal) {
        case "primeira_comissao":
          return "Comissão depende de vendas, que ninguém pode garantir. Publicar com o produto certo é o passo que torna isso possível.";
        case "primeiro_video":
          return "Seu objetivo é publicar o primeiro vídeo — tudo antes disto prepara este momento.";
        case "preparar_conta":
          return "Com a conta preparada, publicar um primeiro vídeo é a forma de testar que tudo está funcionando.";
        default:
          return "Publicar é o que transforma a preparação em aprendizado real.";
      }
    },
  },

  /* ------------------------------ Análise ----------------------------- */
  {
    id: "t-aula-metricas",
    stageId: "s-analise",
    type: "lesson",
    lessonId: "l-metricas",
    title: "Lendo as primeiras métricas com calma",
    durationMinutes: 20,
    startsNewDay: true,
    prerequisites: ["t-publicar"],
    audience: "Todas",
    tags: ["base", "analise"],
    include: ALL,
    description: "O que observar nos primeiros dias depois de publicar, sem tirar conclusões cedo demais.",
    objective: "Saber quais sinais acompanhar.",
    completionCriteria: "Assistir à aula até o final.",
    why: () => "Os números ajudam a ajustar — sem pressão por resultado imediato.",
  },
  {
    id: "t-proximos-videos",
    stageId: "s-analise",
    type: "action",
    title: "Registre aprendizados e planeje os próximos 3 vídeos",
    durationMinutes: 20,
    prerequisites: ["t-aula-metricas"],
    audience: "Todas",
    tags: ["base", "analise", "consistencia"],
    include: ALL,
    description: "Anote o que funcionou, o que mudaria e esboce os próximos três vídeos.",
    objective: "Transformar um vídeo em um processo repetível.",
    completionCriteria: "Aprendizados anotados e 3 ideias de vídeo definidas.",
    why: () => "Consistência é o que vem depois do primeiro vídeo — e é a próxima trilha.",
  },
  {
    id: "t-lote-semanal",
    stageId: "s-analise",
    type: "action",
    title: "Produza um lote de 3 vídeos na semana",
    durationMinutes: 90,
    prerequisites: ["t-proximos-videos", "t-organizar-rotina"],
    audience: "Foco em consistência",
    tags: ["consistencia", "producao"],
    include: (ctx) => ctx.profile.goal === "consistencia",
    description: (ctx) =>
      `Use seus horários reservados para produzir os 3 vídeos planejados. Com cerca de ${ctx.minutes} min por dia, distribua ao longo da semana.`,
    objective: "Sair do vídeo isolado para um ritmo de produção.",
    completionCriteria: "3 vídeos produzidos (autorrelato).",
    why: () => "Seu objetivo é consistência: produzir em lote é o hábito que sustenta um ritmo.",
  },
];
