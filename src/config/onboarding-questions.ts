/**
 * Configuração central do onboarding: perguntas, opções, condições e validação.
 *
 * - IDs de pergunta e valores de resposta são ESTÁVEIS (vão para o banco no futuro).
 * - Textos podem ser editados aqui sem tocar na UI.
 * - Módulo puro (sem React, só `import type`) para rodar nos testes com `node --test`.
 */
import type {
  ContentFormat,
  OnboardingAnswers,
  OnboardingProfile,
} from "@/types";

export const ONBOARDING_VERSION = 1;

/** Mensagem de abertura da assistente roteirizada. */
export const ONBOARDING_GREETING =
  "Oi, parceira! 💗 Eu vou te ajudar a montar um caminho de aprendizado que combine com você. São algumas perguntas rápidas e você poderá ajustar suas respostas depois.";

export type QuestionId =
  | "nome"
  | "experiencia"
  | "conta"
  | "aparecer"
  | "formatos"
  | "ia"
  | "tempo"
  | "equipamento"
  | "dificuldade"
  | "objetivo"
  | "numi";

export interface OptionDef {
  value: string;
  label: string;
  hint?: string;
}

interface BaseQuestion {
  id: QuestionId;
  field: keyof OnboardingProfile;
  /** Rótulo curto usado no resumo final. */
  summaryLabel: string;
  /** Pergunta exibida na “fala” da assistente. */
  prompt: string;
  /** Frase opcional antes da pergunta, ex.: cumprimentar pelo nome. */
  lead?: (answers: OnboardingAnswers) => string | undefined;
  /** Texto curto de apoio abaixo da pergunta. */
  helper?: string;
  /** Pode ser pulada. */
  optional?: boolean;
  /** Pergunta condicional. Ausente = sempre visível. */
  showIf?: (answers: OnboardingAnswers) => boolean;
}

export interface SingleQuestion extends BaseQuestion {
  kind: "single";
  options: OptionDef[];
}

export interface MultiQuestion extends BaseQuestion {
  kind: "multi";
  options: OptionDef[];
  max: number;
  /** Opções que não podem ser combinadas com outras. */
  exclusive: string[];
}

export interface TextQuestion extends BaseQuestion {
  kind: "text";
  maxLength: number;
  placeholder: string;
}

export type Question = SingleQuestion | MultiQuestion | TextQuestion;

export const NAME_MAX_LENGTH = 40;

export const QUESTIONS: Question[] = [
  {
    id: "nome",
    field: "preferredName",
    kind: "text",
    summaryLabel: "Como prefere ser chamada",
    prompt: "Para começar: como você prefere ser chamada?",
    helper: "Opcional. Usamos só para personalizar as mensagens — pode pular se quiser.",
    optional: true,
    maxLength: NAME_MAX_LENGTH,
    placeholder: "Seu primeiro nome ou apelido",
  },
  {
    id: "experiencia",
    field: "experience",
    kind: "single",
    summaryLabel: "Momento no TikTok Shop",
    lead: (a) => (a.preferredName ? `Prazer, ${a.preferredName}!` : undefined),
    prompt: "Em que etapa você está hoje?",
    options: [
      { value: "nunca_vendi", label: "Nunca vendi pelo TikTok Shop" },
      { value: "tentando_comecar", label: "Estou tentando começar" },
      { value: "ja_vendi", label: "Já fiz vendas" },
    ],
  },
  {
    id: "conta",
    field: "accountReady",
    kind: "single",
    summaryLabel: "Conta do TikTok",
    prompt: "Sua conta do TikTok já está preparada para começar?",
    helper:
      "Publicar vídeos e vender pelo TikTok Shop são coisas diferentes: uma conta pode publicar normalmente e ainda não ter acesso às ferramentas de venda. Se não tiver certeza, tudo bem — o plano inclui essa checagem.",
    options: [
      { value: "sim", label: "Sim, está pronta" },
      { value: "nao", label: "Ainda não" },
      { value: "nao_sei", label: "Não sei dizer" },
    ],
  },
  {
    id: "aparecer",
    field: "wantsToAppear",
    kind: "single",
    summaryLabel: "Aparecer nos vídeos",
    prompt: "Você se sente confortável aparecendo nos vídeos?",
    helper: "Não existe resposta certa: o método funciona com e sem aparecer.",
    options: [
      { value: "sim", label: "Sim, quero aparecer" },
      { value: "nao", label: "Prefiro não aparecer" },
      { value: "talvez", label: "Talvez, ainda não sei" },
    ],
  },
  {
    id: "formatos",
    field: "formats",
    kind: "multi",
    summaryLabel: "Formatos preferidos",
    prompt: "De quais formatos você gosta mais?",
    helper: "Escolha até dois. Se preferir testar antes de decidir, escolha “Quero explorar”.",
    showIf: (a) => a.wantsToAppear === "nao" || a.wantsToAppear === "talvez",
    max: 2,
    exclusive: ["quero_explorar"],
    options: [
      { value: "avatar_ia", label: "Avatar de IA", hint: "Uma personagem criada com IA fala pelo vídeo." },
      { value: "maos_produto", label: "Mãos e produto", hint: "Só mãos e produto em cena, sem rosto." },
      { value: "narracao_imagens", label: "Narração e imagens", hint: "Sua voz sobre uma sequência de imagens." },
      { value: "quero_explorar", label: "Quero explorar", hint: "Comparar formatos antes de escolher." },
    ],
  },
  {
    id: "ia",
    field: "aiExperience",
    kind: "single",
    summaryLabel: "Experiência com IA",
    prompt: "Você já usou ferramentas de IA para criar conteúdo?",
    options: [
      { value: "nunca_usei", label: "Nunca usei" },
      { value: "uso_um_pouco", label: "Uso um pouco" },
      { value: "uso_com_frequencia", label: "Uso com frequência" },
    ],
  },
  {
    id: "tempo",
    field: "dailyMinutes",
    kind: "single",
    summaryLabel: "Tempo por dia",
    prompt: "Quanto tempo por dia você consegue dedicar, em média?",
    helper: "É só uma estimativa para distribuir as atividades. Você segue no seu ritmo.",
    options: [
      { value: "15", label: "15 minutos" },
      { value: "30", label: "30 minutos" },
      { value: "60", label: "1 hora" },
      { value: "90_mais", label: "1h30 ou mais" },
    ],
  },
  {
    id: "equipamento",
    field: "device",
    kind: "single",
    summaryLabel: "Equipamento",
    prompt: "Qual equipamento você mais vai usar?",
    options: [
      { value: "celular", label: "Celular" },
      { value: "computador", label: "Computador" },
      { value: "ambos", label: "Os dois" },
    ],
  },
  {
    id: "dificuldade",
    field: "mainBlocker",
    kind: "single",
    summaryLabel: "Maior dificuldade",
    prompt: "O que mais dificulta seu começo hoje?",
    options: [
      { value: "entender_tiktok_shop", label: "Entender o TikTok Shop" },
      { value: "escolher_produto", label: "Escolher o produto" },
      { value: "gravar", label: "Gravar" },
      { value: "editar", label: "Editar" },
      { value: "roteiros", label: "Criar roteiros" },
      { value: "organizacao", label: "Me organizar" },
    ],
  },
  {
    id: "objetivo",
    field: "goal",
    kind: "single",
    summaryLabel: "Objetivo de agora",
    prompt: "Qual é o seu objetivo agora?",
    helper:
      "Nenhum plano garante vendas ou comissões. O objetivo ajuda a priorizar as ações certas para você.",
    options: [
      { value: "preparar_conta", label: "Preparar minha conta" },
      { value: "primeiro_video", label: "Publicar meu primeiro vídeo" },
      { value: "primeira_comissao", label: "Trabalhar rumo à primeira comissão" },
      { value: "consistencia", label: "Ganhar consistência" },
      { value: "melhorar_resultados", label: "Melhorar meus resultados" },
    ],
  },
  {
    id: "numi",
    field: "numiAccess",
    kind: "single",
    summaryLabel: "Acesso NUMI",
    prompt: "Você já tem acesso aos produtos/links de divulgação da NUMI?",
    helper:
      "Não é preciso ter estoque físico. Se não souber, o plano inclui um passo para confirmar com a equipe.",
    options: [
      { value: "sim", label: "Sim, já tenho" },
      { value: "nao", label: "Ainda não" },
      { value: "nao_sei", label: "Não sei" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Regras de fluxo e validação                                         */
/* ------------------------------------------------------------------ */

export function getQuestion(id: QuestionId): Question {
  const q = QUESTIONS.find((x) => x.id === id);
  if (!q) throw new Error(`Pergunta desconhecida: ${id}`);
  return q;
}

export function getVisibleQuestions(answers: OnboardingAnswers): Question[] {
  return QUESTIONS.filter((q) => !q.showIf || q.showIf(answers));
}

/**
 * Remove respostas incoerentes: formatos só existem para quem não quer (ou
 * talvez não queira) aparecer; nome é aparado e limitado.
 */
export function sanitizeAnswers(answers: OnboardingAnswers): OnboardingAnswers {
  const next: OnboardingAnswers = { ...answers };
  const formatsQ = getQuestion("formatos");
  if (formatsQ.showIf && !formatsQ.showIf(next)) delete next.formats;
  if (next.preferredName !== undefined) {
    const name = next.preferredName.trim().replace(/\s+/g, " ").slice(0, NAME_MAX_LENGTH);
    if (name) next.preferredName = name;
    else delete next.preferredName;
  }
  return next;
}

/** Aplica uma seleção múltipla respeitando máximo e opções exclusivas. */
export function toggleMultiValue(question: MultiQuestion, current: string[], value: string): string[] {
  if (current.includes(value)) return current.filter((v) => v !== value);
  if (question.exclusive.includes(value)) return [value];
  const withoutExclusive = current.filter((v) => !question.exclusive.includes(v));
  if (withoutExclusive.length >= question.max) return withoutExclusive;
  return [...withoutExclusive, value];
}

function isOption(question: SingleQuestion | MultiQuestion, value: unknown): boolean {
  return typeof value === "string" && question.options.some((o) => o.value === value);
}

/** Mensagem de erro da resposta atual, ou `null` se válida. */
export function validateQuestion(question: Question, answers: OnboardingAnswers): string | null {
  const value = answers[question.field];
  if (question.kind === "text") {
    if (value === undefined || value === "") return null; // opcional
    if (typeof value !== "string") return "Resposta inválida.";
    if (value.trim().length > question.maxLength) return `Use até ${question.maxLength} caracteres.`;
    return null;
  }
  if (question.kind === "single") {
    if (value === undefined) return question.optional ? null : "Escolha uma opção para continuar.";
    return isOption(question, value) ? null : "Opção inválida.";
  }
  // multi
  if (!Array.isArray(value) || value.length === 0) {
    return question.optional ? null : "Escolha pelo menos uma opção.";
  }
  if (new Set(value).size !== value.length) return "Opção repetida.";
  if (!value.every((v) => isOption(question, v))) return "Opção inválida.";
  if (value.length > question.max) return `Escolha no máximo ${question.max}.`;
  if (value.length > 1 && value.some((v) => question.exclusive.includes(v))) {
    return "“Quero explorar” não pode ser combinado com outros formatos.";
  }
  return null;
}

export type ProfileValidation =
  | { ok: true; profile: OnboardingProfile }
  | { ok: false; errors: { questionId: QuestionId; message: string }[] };

/** Valida o rascunho inteiro e devolve um perfil completo e coerente. */
export function validateProfile(raw: OnboardingAnswers): ProfileValidation {
  const answers = sanitizeAnswers(raw);
  const errors = getVisibleQuestions(answers)
    .map((q) => ({ questionId: q.id, message: validateQuestion(q, answers) }))
    .filter((e): e is { questionId: QuestionId; message: string } => e.message !== null);
  if (errors.length > 0) return { ok: false, errors };
  const profile = { ...answers, formats: (answers.formats ?? []) as ContentFormat[] } as OnboardingProfile;
  return { ok: true, profile };
}

/** Rótulo legível de uma resposta para o resumo. */
export function formatAnswer(question: Question, answers: OnboardingAnswers): string {
  const value = answers[question.field];
  if (question.kind === "text") return typeof value === "string" && value ? value : "Não informado";
  if (question.kind === "single") {
    return question.options.find((o) => o.value === value)?.label ?? "Sem resposta";
  }
  if (!Array.isArray(value) || value.length === 0) return "Sem resposta";
  return value.map((v) => question.options.find((o) => o.value === v)?.label ?? v).join(" + ");
}

/**
 * Rascunho vindo de fora (banco/cliente): mantém só campos conhecidos com
 * valores válidos. Nunca lança; dados desconhecidos são descartados.
 */
export function sanitizeDraft(raw: unknown): OnboardingAnswers {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const input = raw as Record<string, unknown>;
  const out: OnboardingAnswers = {};
  for (const q of QUESTIONS) {
    const value = input[q.field];
    if (value === undefined || value === null) continue;
    const candidate = { [q.field]: value } as OnboardingAnswers;
    if (validateQuestion(q, candidate) === null && !(Array.isArray(value) && value.length === 0)) {
      Object.assign(out, candidate);
    }
  }
  return sanitizeAnswers(out);
}

export function minutesPerDay(value: OnboardingProfile["dailyMinutes"]): number {
  return value === "90_mais" ? 90 : Number(value);
}
