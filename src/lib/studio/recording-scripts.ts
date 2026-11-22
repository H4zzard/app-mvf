/**
 * Menu 3 — Roteiros para Gravar Aparecendo: DEZ roteiros escritos.
 *
 * Modelo LOCAL e determinístico (sem IA): cada ângulo é um molde original MVF
 * preenchido SOMENTE com o que a aluna informou. Nada de fatos inventados,
 * depoimentos, números de venda, descontos, escassez ou alegações. Trechos de
 * experiência pessoal ficam entre colchetes para a aluna completar com o que
 * viveu. A aluna grava com o próprio celular; o app não gera vídeo. Módulo puro.
 */
import { STUDIO_SCHEMA_VERSION, type RecordingScript, type RecordingScriptBrief, type RecordingScriptsOutput } from "./contracts.ts";
import { findClaims } from "./claims.ts";
import { sentencesOf, wordCount } from "./animation.ts";
import { FREE, RECORDING_LOCATIONS, choiceEn, clean, isChoiceValid, pick } from "./presets.ts";

export const RECORDING_WPS = 2.6;
export const RECORDING_TARGET = { min: 30, max: 40 } as const;
export const RECORDING_LIMITS = {
  productMin: 2,
  productMax: 60,
  descriptionMin: 15,
  howToUseMin: 10,
  text: 600,
  short: 400,
  differential: 300,
  free: 120,
  audience: 80,
  offer: 120,
} as const;

export const STYLE_LABEL: Record<RecordingScriptBrief["style"], string> = {
  rotina: "Rotina diária",
  aplicacao: "Aplicação / uso prático",
  unboxing: "Unboxing",
  review: "Review honesto",
  demonstracao: "Demonstração",
  dicas: "Dicas",
  livre: "Livre",
};
export const DELIVERY_LABEL: Record<RecordingScriptBrief["delivery"], string> = {
  camera: "Falando para a câmera",
  voiceover: "Narração (voice-over)",
  cortes: "Misturando cortes",
  take_unico: "Um take só",
};
export const TONE_LABEL: Record<RecordingScriptBrief["tone"], string> = {
  espontaneo: "Espontâneo",
  divertido: "Divertido",
  didatico: "Didático",
  direto: "Direto",
  storytelling: "Storytelling",
};
export const CTA_LABEL: Record<RecordingScriptBrief["cta"], string> = {
  vitrine: "Ver no link do vídeo",
  salvar: "Salvar o vídeo",
  comentar: "Comentar dúvidas",
  sem_venda: "Sem chamada de venda",
};

export function defaultRecordingBrief(): RecordingScriptBrief {
  return {
    productName: "",
    category: "",
    description: "",
    howToUse: "",
    benefits: "",
    limitations: "",
    differential: "",
    style: "rotina",
    styleFree: "",
    delivery: "camera",
    location: pick("banheiro"),
    objects: "",
    tone: "espontaneo",
    audience: "",
    cta: "vitrine",
    offer: "",
    offerConfirmed: false,
  };
}

/* --------------------------------- Validação --------------------------------- */

export type RecordingErrors = Partial<Record<keyof RecordingScriptBrief, string>>;

export function validateRecordingBrief(b: RecordingScriptBrief): RecordingErrors {
  const e: RecordingErrors = {};
  const L = RECORDING_LIMITS;
  const name = clean(b.productName);
  if (name.length < L.productMin) e.productName = "Informe qual produto você vai mostrar.";
  else if (name.length > L.productMax) e.productName = `Use até ${L.productMax} caracteres.`;
  if (clean(b.description).length < L.descriptionMin) e.description = "Descreva o produto: o que é, para quem serve e as características reais (pelo menos uma frase).";
  else if (b.description.length > L.text) e.description = `Use até ${L.text} caracteres.`;
  if (clean(b.howToUse).length < L.howToUseMin) e.howToUse = "Conte como o produto é usado (o modo de uso).";
  else if (b.howToUse.length > L.text) e.howToUse = `Use até ${L.text} caracteres.`;
  if (b.benefits.length > L.short) e.benefits = `Use até ${L.short} caracteres.`;
  if (b.limitations.length > L.short) e.limitations = `Use até ${L.short} caracteres.`;
  if (b.differential.length > L.differential) e.differential = `Use até ${L.differential} caracteres.`;
  if (b.style === "livre" && !clean(b.styleFree)) e.styleFree = "Descreva como quer gravar.";
  if (b.styleFree.length > L.free) e.styleFree = `Use até ${L.free} caracteres.`;
  if (!isChoiceValid(RECORDING_LOCATIONS, b.location)) e.location = "Escolha onde vai gravar ou escreva o lugar.";
  if (b.objects.length > L.free) e.objects = `Use até ${L.free} caracteres.`;
  if (b.audience.length > L.audience) e.audience = `Use até ${L.audience} caracteres.`;
  if (b.offer.length > L.offer) e.offer = `Use até ${L.offer} caracteres.`;
  return e;
}

/* ---------------------------------- Texto ---------------------------------- */

const sentences = (s: string) => sentencesOf(clean(s)).map((t) => t.join(" "));
const dot = (s: string) => {
  const t = clean(s);
  return !t ? "" : /[.!?…]["”'’)\]]*$/.test(t) ? t : `${t}.`;
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Minúscula no início, preservando siglas (ex.: “FPS”). */
const low = (s: string) => (/^\p{Lu}{2}/u.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
const joinText = (parts: string[]) => parts.map(clean).filter(Boolean).join(" ");

export function composeSpeech(hook: string, body: string, cta: string): string {
  return joinText([hook, body, cta]);
}

export function estimateSeconds(text: string): number {
  return Math.round(wordCount(text) / RECORDING_WPS);
}

interface Facts {
  p: string;
  /** Onde grava, com preposição: “no banheiro”, “na cozinha”. */
  onde: string;
  desc: string[];
  use: string[];
  ben: string[];
  lim: string[];
  dif: string[];
}

function ondeOf(b: RecordingScriptBrief): string {
  if (b.location.preset !== FREE) return choiceEn(RECORDING_LOCATIONS, b.location) || "aqui";
  const free = clean(b.location.free ?? "");
  if (!free) return "aqui";
  return /^(no|na|nos|nas|em|ao|à|perto|ao lado)\b/i.test(free) ? low(free) : `em ${low(free)}`;
}

function factsOf(b: RecordingScriptBrief): Facts {
  return {
    p: clean(b.productName),
    onde: ondeOf(b),
    desc: sentences(b.description).map(dot),
    use: sentences(b.howToUse).map(dot),
    ben: sentences(b.benefits).map(dot),
    lim: sentences(b.limitations).map(dot),
    dif: sentences(b.differential).map(dot),
  };
}

/* --------------------------------- Ângulos --------------------------------- */

type ToneGroup = 0 | 1 | 2;
const TONE_GROUP: Record<RecordingScriptBrief["tone"], ToneGroup> = { espontaneo: 0, divertido: 0, didatico: 1, direto: 1, storytelling: 2 };

interface Angle {
  id: string;
  title: string;
  applies: (f: Facts) => boolean;
  hooks: (f: Facts) => [string, string, string];
  /** Frases essenciais + extras (entram enquanto couber no tempo). */
  body: (f: Facts) => { core: string[]; extra: string[] };
  filming: (f: Facts) => string[];
  /** Frases de ligação neutras, próprias do ângulo (sem fatos, sem promessas). */
  fillers: string[];
  firstPerson: boolean;
  warning?: string;
}

const always = () => true;
const allSteps = (f: Facts) => f.use.join(" ");
const intro = (lead: string, s: string | undefined) => (s ? `${lead} ${low(s)}` : "");

export const ANGLES: Angle[] = [
  {
    id: "rotina",
    title: "Na minha rotina",
    applies: always,
    hooks: (f) => [`Vem ver onde o ${f.p} entra na minha rotina.`, `Onde o ${f.p} entra na rotina, em poucos passos.`, `Todo dia tem um momento em que eu pego o ${f.p}.`],
    body: (f) => ({ core: [`Primeiro eu deixo tudo pronto aqui ${f.onde}.`, intro("Aí entra o produto:", f.use[0])], extra: [...f.use.slice(1), ...f.desc.slice(0, 1)] }),
    filming: (f) => [`Plano aberto mostrando o espaço ${f.onde}.`, "Close no produto na hora de usar.", "Volte para o rosto no convite final."],
    fillers: ["Repara que não tem segredo.", "Eu gosto de deixar tudo à mão antes de começar."],
    firstPerson: true,
  },
  {
    id: "passo-a-passo",
    title: "Passo a passo",
    applies: always,
    hooks: (f) => [`Te mostro como usar o ${f.p}, passo a passo.`, `Como usar o ${f.p}: passo a passo.`, `Na primeira vez eu fiquei na dúvida de como usar o ${f.p}. Então aqui vai o passo a passo.`],
    body: (f) => ({
      core: f.use.length > 1 ? f.use.slice(0, 4).map((u, i) => `Passo ${i + 1}: ${low(u)}`) : [intro("É assim:", f.use[0])],
      extra: f.lim.slice(0, 1).map((l) => intro("Um cuidado:", l)),
    }),
    filming: () => ["Um take por passo, em close nas mãos.", "Entre um passo e outro, fale olhando para a câmera."],
    fillers: ["Vou bem devagar para você acompanhar.", "Se precisar, pausa o vídeo em cada passo."],
    firstPerson: false,
  },
  {
    id: "primeiro-uso",
    title: "Primeiro uso",
    applies: always,
    hooks: (f) => [`Primeira vez usando o ${f.p}. Vem comigo.`, `Primeiro uso do ${f.p}: o que você precisa saber.`, `Chegou o ${f.p} e eu resolvi testar na hora.`],
    body: (f) => ({ core: [intro("Antes de começar:", f.desc[0]), intro("Eu vou usar assim:", f.use[0]), "[Conte aqui, com sinceridade, a sua primeira impressão real.]"], extra: f.desc.slice(1, 2) }),
    filming: () => ["Grave a reação verdadeira no primeiro contato, sem ensaiar demais.", "Close no detalhe do produto enquanto fala."],
    fillers: ["Vou ser sincera com você.", "Olha comigo o primeiro contato."],
    firstPerson: true,
  },
  {
    id: "erro-comum",
    title: "Erro fácil de evitar",
    applies: always,
    hooks: (f) => [`Antes de usar o ${f.p}, confere este detalhe.`, `Um erro fácil de evitar com o ${f.p}.`, `Eu quase usei o ${f.p} do jeito errado.`],
    body: (f) => ({ core: [intro("O detalhe é seguir o modo de uso:", f.use[0]), ...f.use.slice(1, 2)], extra: f.lim.slice(0, 1).map((l) => intro("E atenção:", l)) }),
    filming: () => ["Comece mostrando o produto na mão.", "Mostre o jeito certo em close.", "Termine olhando para a câmera."],
    fillers: ["Parece detalhe, mas vale prestar atenção.", "Agora, do jeito certo."],
    firstPerson: false,
  },
  {
    id: "dica-pratica",
    title: "Dica prática",
    applies: always,
    hooks: (f) => [`Uma dica rapidinha para usar o ${f.p}.`, `Dica prática: ${f.p}.`, `Descobri um jeito prático de encaixar o ${f.p} no dia a dia.`],
    body: (f) => ({ core: [intro("A dica é simples:", f.use[0]), `Deixe o produto à vista ${f.onde} para lembrar de usar.`], extra: f.ben.slice(0, 1) }),
    filming: () => ["Um take só, falando para a câmera.", "Segure o produto na mão enquanto fala."],
    fillers: ["É o tipo de detalhe que pouca gente comenta.", "Simples assim."],
    firstPerson: false,
  },
  {
    id: "unboxing",
    title: "Unboxing",
    applies: always,
    hooks: (f) => [`Abre comigo: chegou o ${f.p}.`, `Unboxing do ${f.p}: o que vem e como é.`, "Fazia dias que eu esperava esse pacote."],
    body: (f) => ({ core: [intro("Vamos ver:", f.desc[0]), intro("Para usar, é assim:", f.use[0])], extra: f.desc.slice(1, 3) }),
    filming: (f) => [`Comece com a embalagem fechada ${f.onde}.`, "Abra devagar, em close nas mãos.", "Mostre o produto inteiro e depois um detalhe."],
    fillers: ["Olha como chegou.", "Agora, o produto de perto."],
    firstPerson: false,
  },
  {
    id: "duvida-frequente",
    title: "Dúvida frequente",
    applies: always,
    hooks: (f) => [`Se você tem dúvida de como usar o ${f.p}, este vídeo é para você.`, `Como se usa o ${f.p}? Resposta rápida.`, `Uma dúvida que eu também tive sobre o ${f.p}: como usar?`],
    body: (f) => ({
      core: [intro("Resposta:", allSteps(f))],
      extra: f.lim.length ? [intro("E um cuidado importante:", f.lim[0])] : ["Se ficar alguma dúvida, confira as orientações da embalagem."],
    }),
    filming: () => ["Comece com a pergunta escrita na tela, se quiser.", "Responda olhando para a câmera e mostre o uso."],
    fillers: ["Vou responder de forma bem direta.", "Anota aí."],
    firstPerson: false,
  },
  {
    id: "comparacao-factual",
    title: "Comparação factual",
    applies: (f) => f.dif.length > 0 || f.ben.length > 0,
    hooks: (f) => [`O que o ${f.p} tem de diferente? Vou te mostrar.`, `${cap(f.p)}: o que muda na prática.`, `Quando eu comparei o ${f.p} com o que eu usava antes, reparei numa coisa.`],
    body: (f) => ({ core: [intro("Pelo que as informações do produto dizem,", (f.dif[0] ?? f.ben[0]) as string), intro("Na prática, o uso é assim:", f.use[0])], extra: ["Compare com o que você já usa e veja se faz sentido para você."] }),
    filming: () => ["Mostre os dois itens lado a lado, sem citar marcas.", "Close no detalhe que diferencia."],
    fillers: ["Sem exagero, só o que dá para ver.", "Repara na diferença."],
    firstPerson: false,
    warning: "Compare só com informações verificáveis e não cite marcas concorrentes.",
  },
  {
    id: "historia-cotidiana",
    title: "História do dia a dia",
    applies: always,
    hooks: (f) => [`Deixa eu te contar como o ${f.p} entrou no meu dia.`, `Um momento comum do dia, com o ${f.p}.`, `Sabe aquele dia corrido? Foi num desses que eu peguei o ${f.p}.`],
    body: (f) => ({ core: ["[Conte em uma frase um momento real em que você usa o produto.]", intro("Aí eu uso assim:", f.use[0])], extra: f.desc.slice(0, 1) }),
    filming: (f) => [`Grave uma cena curta do seu dia ${f.onde}.`, "Depois, fale para a câmera contando a história."],
    fillers: ["[Diga como você se sentiu nesse momento, se quiser.]"],
    firstPerson: true,
  },
  {
    id: "diferencial",
    title: "Diferencial verificável",
    applies: (f) => f.dif.length > 0,
    hooks: (f) => [`Um detalhe do ${f.p} que vale mostrar de perto.`, `O diferencial do ${f.p}, mostrado de perto.`, `O detalhe do ${f.p} que mais me chamou a atenção.`],
    body: (f) => ({ core: [...f.dif.slice(0, 2), "Olha aqui de perto.", intro("E o uso é assim:", f.use[0])], extra: [] }),
    filming: () => ["Close bem de perto no diferencial.", "Fale olhando para a câmera ao explicar."],
    fillers: ["Esse é o tipo de coisa que só dá para ver de perto."],
    firstPerson: false,
  },
  {
    id: "cuidados",
    title: "Cuidados antes de usar",
    applies: (f) => f.lim.length > 0,
    hooks: (f) => [`Antes de usar o ${f.p}, presta atenção nisso.`, `${cap(f.p)}: cuidados antes de usar.`, `Uma coisa que eu sempre confiro antes de usar o ${f.p}.`],
    body: (f) => ({ core: [...f.lim.slice(0, 2), intro("Seguindo isso, o uso é:", f.use[0])], extra: [] }),
    filming: () => ["Fale olhando para a câmera, com o produto na mão.", "Mostre o modo de uso em close."],
    fillers: ["Vale sempre conferir as orientações da embalagem.", "Com isso em mente, fica tranquilo usar."],
    firstPerson: false,
  },
  {
    id: "para-quem",
    title: "Para quem é",
    applies: always,
    hooks: (f) => [`Para quem é o ${f.p}? Vem que eu explico.`, `${cap(f.p)}: para quem faz sentido.`, `Quando eu conheci o ${f.p}, a primeira coisa que eu quis saber foi para quem ele serve.`],
    body: (f) => ({ core: [...f.desc.slice(0, 2), intro("O uso é simples:", f.use[0])], extra: [] }),
    filming: () => ["Fale olhando para a câmera.", "Corte para o produto quando explicar o uso."],
    fillers: ["Assim você decide se faz sentido para você.", "Vou direto ao ponto."],
    firstPerson: false,
  },
  {
    id: "detalhes",
    title: "Detalhes que valem mostrar",
    applies: always,
    hooks: (f) => [`Detalhes do ${f.p} que valem mostrar.`, `${cap(f.p)}: o que saber antes de usar.`, `Reparei em alguns detalhes do ${f.p}.`],
    body: (f) => {
      const items = [...f.desc, ...f.ben, ...f.use].slice(0, 3);
      const ord = ["Primeiro:", "Segundo:", "Terceiro:"];
      return { core: items.map((x, i) => `${ord[i]} ${low(x)}`), extra: [] };
    },
    filming: () => ["Um corte para cada detalhe, em close.", "Abra e feche falando para a câmera."],
    fillers: ["Olha de perto.", "Repara em cada um."],
    firstPerson: false,
  },
];

const STYLE_FIRST: Partial<Record<RecordingScriptBrief["style"], string>> = {
  rotina: "rotina",
  aplicacao: "passo-a-passo",
  demonstracao: "passo-a-passo",
  unboxing: "unboxing",
  review: "primeiro-uso",
  dicas: "dica-pratica",
};

/** Os 10 ângulos aplicáveis, com o do estilo escolhido primeiro. */
export function selectAngles(b: RecordingScriptBrief): Angle[] {
  const f = factsOf(b);
  const list = ANGLES.filter((a) => a.applies(f)).slice(0, 10);
  const first = STYLE_FIRST[b.style];
  const i = list.findIndex((a) => a.id === first);
  if (i > 0) list.unshift(...list.splice(i, 1));
  return list;
}

function ctaFor(b: RecordingScriptBrief, f: Facts, variant: number): string {
  const offer = b.offerConfirmed && clean(b.offer) ? ` ${dot(b.offer)}` : "";
  const options: Record<RecordingScriptBrief["cta"], string[]> = {
    vitrine: [
      `Se quiser conferir, o ${f.p} está no link deste vídeo.`,
      `Deixei o ${f.p} no link deste vídeo para você olhar com calma.`,
      `O link do ${f.p} está aqui no vídeo, se você quiser ver mais detalhes.`,
    ],
    salvar: ["Salva este vídeo para lembrar na hora de usar.", "Salva aqui para não esquecer o passo a passo.", "Guarda este vídeo para consultar depois."],
    comentar: [`Ficou alguma dúvida sobre o ${f.p}? Me conta nos comentários.`, "Me conta nos comentários se você quer outro vídeo assim.", "Comenta aqui como você usaria."],
    sem_venda: ["Me conta se você já conhecia.", "Era isso. Até o próximo vídeo.", "Gostou do formato? Me conta."],
  };
  const list = options[b.cta];
  return list[variant % list.length] + (b.cta === "vitrine" ? offer : "");
}

const DELIVERY_DIRECTION: Record<RecordingScriptBrief["delivery"], string> = {
  camera: "Fale olhando para a lente, com o celular na altura dos olhos.",
  voiceover: "Grave as imagens primeiro e a narração depois, por cima.",
  cortes: "Alterne falas para a câmera com cortes de detalhe do produto.",
  take_unico: "Grave tudo em um take só; ensaie duas vezes antes.",
};

const MAX_WORDS = Math.round(RECORDING_TARGET.max * RECORDING_WPS);

export function buildRecordingScript(b: RecordingScriptBrief, angleId: string, variant = 0): RecordingScript {
  const f = factsOf(b);
  const index = ANGLES.findIndex((a) => a.id === angleId);
  const angle = ANGLES[index];
  if (!angle) throw new Error(`Ângulo desconhecido: ${angleId}`);
  const group = TONE_GROUP[b.tone];
  const hook = angle.hooks(f)[(group + variant) % 3];
  const cta = ctaFor(b, f, index + variant);
  const { core, extra } = angle.body(f);
  const body: string[] = core.filter(Boolean);
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const has = (x: string) => norm(body.join(" ")).includes(norm(x));
  const fits = (x: string) => wordCount(composeSpeech(hook, joinText([...body, x]), cta)) <= MAX_WORDS;
  // 1) extras do ângulo; 2) frases de ligação do ângulo; 3) no máximo 2 outros fatos,
  // em rodízio por ângulo (para os dez não repetirem as mesmas frases). Até ~40 s.
  for (const x of [...(variant % 2 === 1 ? [...extra].reverse() : extra), ...angle.fillers].filter(Boolean)) if (!has(x) && fits(x)) body.push(x);
  const facts = [...f.desc, ...f.ben, ...f.use].filter((x) => !has(x));
  for (let k = 0, added = 0; k < facts.length && added < 2; k++) {
    const x = facts[(index + variant + k) % facts.length];
    if (!has(x) && fits(x)) {
      body.push(x);
      added++;
    }
  }
  const bodyText = joinText(body);
  const fullSpeech = composeSpeech(hook, bodyText, cta);
  const estimatedSeconds = estimateSeconds(fullSpeech);
  const firstPerson = angle.firstPerson || group === 2 || /\[/.test(fullSpeech);

  const filming = [...angle.filming(f), DELIVERY_DIRECTION[b.delivery]];
  if (clean(b.objects)) filming.push(`Deixe por perto: ${clean(b.objects)}.`);
  if (b.style === "livre" && clean(b.styleFree)) filming.push(`Do seu jeito: ${clean(b.styleFree)}.`);

  const warnings: string[] = [];
  if (angle.warning) warnings.push(angle.warning);
  if (/\[/.test(fullSpeech)) warnings.push("Complete o trecho entre colchetes com o que você viveu de verdade.");
  else if (firstPerson) warnings.push("Fala em primeira pessoa: adapte ao que você realmente viveu.");
  if (estimatedSeconds > RECORDING_TARGET.max + 5) warnings.push(`Passou de ${RECORDING_TARGET.max} s (≈ ${estimatedSeconds} s). Corte um trecho se quiser um vídeo mais curto.`);
  else if (estimatedSeconds < 20) warnings.push("Ficou curto. Você pode completar com a sua experiência real.");

  return {
    id: `r-${angle.id}`,
    angle: angle.id,
    title: angle.title,
    hook,
    body: bodyText,
    cta,
    fullSpeech,
    filmingDirections: filming,
    estimatedSeconds,
    firstPerson,
    variant,
    warnings,
  };
}

/** Avisos do briefing (alegações, oferta não confirmada). */
export function briefWarnings(b: RecordingScriptBrief): string[] {
  const w = findClaims([b.description, b.howToUse, b.benefits, b.limitations, b.differential, b.offerConfirmed ? b.offer : ""].join("\n")).map((c) => c.message);
  if (clean(b.offer) && !b.offerConfirmed) w.push("O preço/condição não foi usado porque você não confirmou que é verdadeiro e atual.");
  return w;
}

export function buildRecordingScripts(b: RecordingScriptBrief): RecordingScriptsOutput {
  const errors = validateRecordingBrief(b);
  if (Object.keys(errors).length > 0) throw new Error(`Briefing incompleto: ${Object.keys(errors).join(", ")}`);
  return { schemaVersion: STUDIO_SCHEMA_VERSION, scripts: selectAngles(b).map((a) => buildRecordingScript(b, a.id)), warnings: briefWarnings(b) };
}

/** “Criar variação” (modelo local): mesmo ângulo, outra combinação de gancho/CTA. */
export function varyRecordingScript(b: RecordingScriptBrief, s: RecordingScript): RecordingScript {
  return buildRecordingScript(b, s.angle, s.variant + 1);
}

/** Edição manual: recalcula a fala completa e o tempo. */
export function editRecordingScript(s: RecordingScript, patch: Partial<Pick<RecordingScript, "hook" | "body" | "cta" | "filmingDirections">>): RecordingScript {
  const next = { ...s, ...patch };
  const fullSpeech = composeSpeech(next.hook, next.body, next.cta);
  return { ...next, fullSpeech, estimatedSeconds: estimateSeconds(fullSpeech) };
}

export function scriptToText(s: RecordingScript, productName: string): string {
  return [
    `${s.title} · ${clean(productName)} (≈ ${s.estimatedSeconds} s)`,
    "",
    `GANCHO: ${s.hook}`,
    `DESENVOLVIMENTO: ${s.body}`,
    `CTA: ${s.cta}`,
    "",
    "FALA COMPLETA:",
    s.fullSpeech,
    "",
    "COMO GRAVAR:",
    ...s.filmingDirections.map((d) => `- ${d}`),
  ].join("\n");
}

/** Validação de saída (para o futuro provedor remoto devolver JSON confiável). */
export function validateRecordingScriptsOutput(out: unknown): string[] {
  const errs: string[] = [];
  const o = out as RecordingScriptsOutput;
  if (!o || !Array.isArray(o.scripts)) return ["Saída sem lista de roteiros."];
  if (o.scripts.length !== 10) errs.push(`Esperados 10 roteiros, vieram ${o.scripts.length}.`);
  const ids = new Set<string>();
  o.scripts.forEach((s, i) => {
    for (const k of ["angle", "hook", "body", "cta", "fullSpeech"] as const) if (typeof s?.[k] !== "string" || !s[k].trim()) errs.push(`Roteiro ${i + 1}: campo ${k} vazio.`);
    if (!Array.isArray(s?.filmingDirections) || s.filmingDirections.length === 0) errs.push(`Roteiro ${i + 1}: sem plano de captação.`);
    if (typeof s?.estimatedSeconds !== "number" || !Number.isFinite(s.estimatedSeconds)) errs.push(`Roteiro ${i + 1}: duração inválida.`);
    if (ids.has(s?.id)) errs.push(`Roteiro ${i + 1}: id repetido.`);
    ids.add(s?.id);
  });
  return errs;
}
