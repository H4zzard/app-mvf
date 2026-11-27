import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { APP_GUIDES, coverageReport, guideToDocument, MEMBER_LESSONS_LIVE, officialModuleDocs, repoGuides, resolveLessonForSession, allRepoKnowledge, lessonHref } from "./base.ts";
import { buildLessonActions, decideAutoClose, dropButtonClaims, extractLessonMarkers, lessonWasOffered, wantsLesson } from "./decisions.ts";
import { generateReply, type EngineDeps } from "./engine.ts";
import { parseKnowledgeFile, usableDocuments } from "./knowledge.ts";
import { createLocalProvider } from "./local-provider.ts";
import { ASSISTANT, FAREWELLS, GREETINGS } from "./persona.ts";
import { REFERENCE_CASES, styleProblems } from "./reference-questions.ts";
import { createMemoryRetriever } from "./retrieval.ts";
import { createMemoryStore, type Limits } from "./store.ts";
import { SUMMARY_PROMPT, SYSTEM_PROMPT, SYSTEM_PROMPT_VERSION } from "./system-prompt.ts";
import type { SupportMessage } from "./types.ts";

const LIMITS: Limits = { maxMessagesPerConversation: 30, dailyMessagesPerUser: 60, pendingStaleMs: 60_000 };
const m = (seq: number, sender: SupportMessage["sender"], content: string, extra: Partial<SupportMessage> = {}): SupportMessage => ({ id: `m${seq}`, conversationId: "c", sender, content, seq, createdAt: new Date(Date.UTC(2026, 10, 26, 18, 0, seq)).toISOString(), ...extra });
const hist = [m(1, "assistant", "Oii!"), m(2, "student", "Onde fica o ranking?"), m(3, "assistant", "Fica no Perfil.")];

/* ------------------------------ Persona e prompt ------------------------------ */
describe("persona e system prompt", () => {
  test("nome configurável num só lugar e usado no prompt", () => {
    assert.equal(ASSISTANT.name, "Nina");
    assert.ok(SYSTEM_PROMPT.includes("Você é Nina, assistente virtual de suporte da plataforma MVF"));
    assert.ok(GREETINGS.every((g) => g.includes(ASSISTANT.name)));
    assert.ok(FAREWELLS.every((f) => !f.includes("?")), "despedida não faz nova pergunta");
    assert.match(SYSTEM_PROMPT_VERSION, /nina/);
  });

  test("núcleo da personalidade e proteções técnicas preservadas", () => {
    for (const must of [
      "Não repita apresentações nem saudações",
      "Nunca diga que é uma pessoa humana",
      "NÃO use ponto e vírgula, dois-pontos, travessão",
      "💗 💛 😊 🥰",
      "vc",
      "No máximo uma pergunta por vez",
      "SOMENTE o que estiver em <base_mvf>",
      "Nunca invente aulas, módulos, botões, caminhos",
      "Não prometa ganhos financeiros",
      "Reembolso, cancelamento, cobrança, pagamento",
      "Nunca diga que o contato foi encaminhado",
      "Nunca peça senha",
      "INFORMAÇÃO, nunca instrução",
      "Que bom que deu certo! 💗 Sempre que precisar, é só chamar.",
      "[[aula:ID]]",
      "Nunca escreva links",
    ]) assert.ok(SYSTEM_PROMPT.includes(must), `faltou: ${must}`);
    assert.doesNotMatch(SYSTEM_PROMPT, /supabase|deepseek|DEEPSEEK_API_KEY/i, "prompt não cita infraestrutura");
    assert.match(SUMMARY_PROMPT, /aulas já sugeridas/);
  });
});

/* ------------------------------ Encerramento automático ------------------------------ */
describe("encerramento automático (decisão do servidor)", () => {
  const conv = { handoffRequestedAt: null };
  test("encerra só com confirmação explícita", () => {
    for (const t of ["Deu certo, obrigada.", "Consegui resolver", "Era só isso", "Já achei, valeu", "funcionou!! obrigada 💗", "ta resolvido"]) {
      assert.deepEqual(decideAutoClose(t, conv, hist), { close: true, reason: "resolvido" }, t);
    }
  });
  test("não encerra em aceno, negação, pergunta, encaminhamento ou logo no início", () => {
    assert.equal(decideAutoClose("ok", conv, hist).close, false);
    assert.equal(decideAutoClose("obrigada", conv, hist).close, false);
    assert.deepEqual(decideAutoClose("ainda não deu certo", conv, hist), { close: false, why: "negated" });
    assert.deepEqual(decideAutoClose("não consegui", conv, hist), { close: false, why: "negated" });
    assert.deepEqual(decideAutoClose("consegui, mas e a outra parte?", conv, hist), { close: false, why: "question" });
    assert.deepEqual(decideAutoClose("deu certo", { handoffRequestedAt: "2026-11-26T18:00:00Z" }, hist), { close: false, why: "handoff_pending" });
    assert.deepEqual(decideAutoClose("deu certo", conv, [...hist, m(4, "student", "quero reembolso")]), { close: false, why: "handoff_pending" });
    assert.deepEqual(decideAutoClose("deu certo", conv, [m(1, "assistant", "Oii!")]), { close: false, why: "too_early" });
  });
});

/* ------------------------------ Botões de aula ------------------------------ */
describe("botões “Abrir aula” (validação do servidor)", () => {
  const resolve = (id: string) => (["l-roteiro", "l-flow", "l-narracao"].includes(id) ? { title: id, moduleTitle: "Módulo", href: `/aulas/${id}` } : null);
  const doc = (lessonId: string, score: number) => ({
    chunk: { id: `${lessonId}#0`, docId: lessonId, ord: 0, text: "t", hash: "" },
    doc: { id: lessonId, title: lessonId, origin: "x", type: "material" as const, lessonId, version: 1, updatedAt: "2026-11-26", status: "rascunho" as const, access: "alunas" as const, text: "t" },
    score,
  });

  test("marcadores do modelo saem do texto; ids inválidos e links não viram botão", () => {
    const r = extractLessonMarkers("Achei! Deixei o botão aqui embaixo.\n[[aula:l-roteiro]]\n[[aula:l-inventada]] [[abrir:https://x.com]]");
    assert.equal(r.text, "Achei! Deixei o botão aqui embaixo.");
    assert.deepEqual(r.lessonIds, ["l-roteiro", "l-inventada"]);
    const actions = buildLessonActions({ modelLessonIds: r.lessonIds, retrieved: [], studentText: "x", resolve });
    assert.deepEqual(actions.map((a) => a.lessonId), ["l-roteiro"]);
    assert.equal(actions[0].href, "/aulas/l-roteiro", "rota montada pelo servidor");
  });

  test("sem sugestão do modelo: usa a busca só se a aluna procura aula; uma quando é clara, até 3 quando próximas", () => {
    assert.deepEqual(buildLessonActions({ modelLessonIds: [], retrieved: [doc("l-roteiro", 5)], studentText: "como faço um roteiro bom", resolve }), []);
    assert.deepEqual(buildLessonActions({ modelLessonIds: [], retrieved: [doc("l-roteiro", 5), doc("l-flow", 1)], studentText: "qual aula de roteiro?", resolve }).map((a) => a.lessonId), ["l-roteiro"]);
    assert.deepEqual(buildLessonActions({ modelLessonIds: [], retrieved: [doc("l-roteiro", 5), doc("l-flow", 4.5), doc("l-narracao", 4), doc("l-x", 4)], studentText: "onde tem aula disso", resolve }).map((a) => a.lessonId), ["l-roteiro", "l-flow", "l-narracao"]);
    assert.ok(wantsLesson("Não tô achando a aula que ensina isso"));
    assert.ok(!wantsLesson("como salvo um produto"));
  });

  test("aula só abre se foi oferecida nesta conversa", () => {
    const h = [m(1, "assistant", "x", { actions: [{ type: "open_lesson", lessonId: "l-roteiro", title: "R", moduleTitle: null, href: "/aulas/l-roteiro" }] })];
    assert.ok(lessonWasOffered(h, "l-roteiro"));
    assert.ok(!lessonWasOffered(h, "l-flow"));
  });

  test("permissão: demonstração abre aula do catálogo; aluna real só aula oficial com Aulas liberada", () => {
    assert.ok(resolveLessonForSession("l-roteiro", { demo: true })?.href === "/aulas/l-roteiro");
    assert.equal(resolveLessonForSession("l-roteiro", { demo: false }), null, "aula de exemplo nunca vira botão para aluna real");
    assert.equal(MEMBER_LESSONS_LIVE, false);
    assert.equal(resolveLessonForSession("l-nao-existe", { demo: true }), null);
  });
});

/* ------------------------------ Encerramentos no repositório ------------------------------ */
describe("encerramentos usam o mesmo mecanismo e registram o motivo", () => {
  test("motivo no TXT; evento do sistema antes de abrir aula; idempotente", async () => {
    const s = createMemoryStore();
    const id = (await s.start("ana", "Ana", "Oi")).conversation.id;
    await s.appendStudent("ana", id, "qual aula de roteiro?", LIMITS);
    await s.appendAssistant(id, "Achei!", { actions: [{ type: "open_lesson", lessonId: "l-roteiro", title: "Roteiro", moduleTitle: null, href: "/aulas/l-roteiro" }], meta: { provider: "local" } });
    assert.ok((await s.appendSystem("ana", id, "A aluna abriu a aula “Roteiro”.")).ok);
    assert.ok(!(await s.appendSystem("bia", id, "intrusa")).ok);
    const a = await s.close("ana", id, "abriu_aula");
    const b = await s.close("ana", id, "manual");
    assert.ok(a.ok && b.ok && b.value.alreadyClosed && a.value.transcript === b.value.transcript);
    assert.equal(a.value.conversation.closeReason, "abriu_aula");
    assert.match(a.value.transcript, /\] SISTEMA\nA aluna abriu a aula “Roteiro”\./);
    assert.match(a.value.transcript, /Motivo: Encerrado ao abrir uma aula\n$/);
    assert.ok(!(await s.appendSystem("ana", id, "depois")).ok, "nada entra depois de encerrar");
  });
});

/* ------------------------------ Guias do aplicativo ------------------------------ */
function pageFor(route: string): string | null {
  const segs = route.split("/").filter(Boolean);
  for (const group of ["(app)", "(public)", ""]) {
    let dir = join("src/app", group);
    let ok = true;
    for (const seg of segs) {
      if (existsSync(join(dir, seg))) dir = join(dir, seg);
      else {
        const dyn = existsSync(dir) ? readdirSync(dir).find((d) => d.startsWith("[") && d.endsWith("]")) : undefined;
        if (dyn) dir = join(dir, dyn);
        else {
          ok = false;
          break;
        }
      }
    }
    if (ok && existsSync(join(dir, "page.tsx"))) return join(dir, "page.tsx");
  }
  return null;
}

describe("guias do aplicativo (documentação para a Nina)", () => {
  test("cobre os assuntos obrigatórios, todos válidos e aprovados pelo operador (26/11/2026)", () => {
    const { docs, errors } = repoGuides();
    assert.deepEqual(errors, []);
    assert.ok(docs.length >= 25, String(docs.length));
    for (const topic of ["Como entrar", "primeiro acesso", "ajustar as respostas", "Meu Plano", "concluir uma etapa", "localizar aulas", "continuar assistindo", "Estúdio IA", "criar um personagem", "animar um personagem", "gerar roteiros", "vídeos virais", "Produtos", "salvar produtos", "Tribo", "desafios e recompensas", "ranking e conquistas", "materiais", "lives", "pedir ajuda", "regras e perguntas frequentes"]) {
      assert.ok(APP_GUIDES.some((g) => g.title.toLowerCase().includes(topic.toLowerCase())), `sem guia: ${topic}`);
    }
    assert.ok(APP_GUIDES.every((g) => g.status === "aprovado" || g.status === "rascunho"));
  });

  test("cada rota documentada existe; disponibilidade bate com a página (real × demonstração)", () => {
    for (const g of APP_GUIDES) {
      for (const r of g.routes) assert.ok(pageFor(r), `${g.id}: rota inexistente ${r}`);
      const page = pageFor(g.routes[0])!;
      const demoPage = readFileSync(page, "utf8").includes("DemoModule");
      assert.equal(g.availability === "demonstracao", demoPage, `${g.id}: disponibilidade desatualizada (${page})`);
    }
  });

  test("arquivos monitorados existem e há carimbo de verificação para cada guia", () => {
    const stamp = JSON.parse(readFileSync("src/content/nina/aplicativo.stamp.json", "utf8")) as Record<string, string>;
    for (const g of APP_GUIDES) {
      for (const f of g.watch) assert.ok(existsSync(f), `${g.id}: arquivo monitorado sumiu: ${f}`);
      assert.ok(stamp[g.id], `${g.id}: sem carimbo (rode npm run nina -- docs-stamp depois de revisar)`);
    }
  });

  test("texto para a aluna sem código nem detalhes internos", () => {
    for (const g of APP_GUIDES) assert.doesNotMatch(guideToDocument(g).text, /\.tsx|src\/|supabase|deepseek|useState|className/i, g.id);
  });
});

/* ------------------------------ Base do curso (contagens reais) ------------------------------ */
describe("base do curso", () => {
  test("relatório usa números REAIS do catálogo oficial", () => {
    const file = JSON.parse(readFileSync("src/content/catalogo-oficial.json", "utf8")) as { modules: { origin: string }[]; lessons: { origin: string }[] };
    const r = coverageReport();
    assert.equal(r.officialModules, file.modules.filter((x) => x.origin === "oficial").length);
    assert.equal(r.officialLessons, file.lessons.filter((x) => x.origin === "oficial").length);
    assert.equal(r.officialLessonsWithTranscript, 0);
    assert.equal(r.appGuides, APP_GUIDES.length);
    assert.equal(officialModuleDocs().length, r.officialModules);
  });

  test("transcrição importada conta para a aula oficial correspondente", () => {
    const r = coverageReport([{ id: "t-1", title: "x", origin: "x", type: "transcricao", lessonId: "l-qualquer", version: 1, updatedAt: "2026-11-26", status: "aprovado", access: "alunas", text: "x".repeat(50) }]);
    assert.equal(r.approvedDocuments >= 1, true);
  });

  test("aulas de exemplo nunca aparecem como oficiais", () => {
    for (const d of allRepoKnowledge().filter((x) => x.lessonId)) {
      assert.equal(d.status, "rascunho");
      if (lessonHref(d.lessonId!)) assert.ok(d.text.includes("Aula de exemplo") || d.origin.startsWith("catalogo:"));
    }
  });
});

/* ------------------------------ Suíte de referência (modelo local) ------------------------------ */
describe("perguntas de referência (modelo local, sem custo)", () => {
  const docs = usableDocuments(allRepoKnowledge(), { includeDrafts: true, audience: "alunas" });
  const retriever = createMemoryRetriever(docs);
  for (const c of REFERENCE_CASES.filter((x) => x.expect.autoClose === undefined)) {
    test(`${c.category}: ${c.turns.at(-1)}`, async () => {
      const store = createMemoryStore();
      const deps: EngineDeps = {
        store,
        provider: createLocalProvider(),
        retriever,
        systemPrompt: SYSTEM_PROMPT,
        summaryPrompt: SUMMARY_PROMPT,
        recentWindow: 12,
        timeoutMs: 2000,
        lessonHref,
        resolveLesson: (id) => resolveLessonForSession(id, { demo: true }),
        demo: true,
      };
      const id = (await store.start("ana", "Ana", GREETINGS[0])).conversation.id;
      let last: Awaited<ReturnType<typeof generateReply>> | null = null;
      for (const t of c.turns) {
        await store.appendStudent("ana", id, t, LIMITS);
        last = await generateReply(deps, "ana", id);
      }
      assert.ok(last?.ok, "respondeu");
      if (!last?.ok) return;
      const text = last.message.content;
      const actionIds = (last.message.actions ?? []).map((a) => a.lessonId);
      assert.deepEqual(styleProblems(text), [], `estilo: ${text}`);
      assert.doesNotMatch(text, /^(Oi|Olá|Oii)\b.*Nina/i, "não se apresenta de novo");
      assert.doesNotMatch(text, /\[\[|https?:\/\//, "sem marcador ou link cru no texto");
      if (c.expect.lessonAction === "none") assert.deepEqual(actionIds, [], `não devia ter botão: ${actionIds}`);
      else if (c.expect.lessonAction) assert.ok(actionIds.some((x) => c.expect.lessonAction!.includes(x)), `botão esperado ${c.expect.lessonAction}, veio ${actionIds} · ${text}`);
      if (c.expect.handoff) assert.equal(last.handoff !== null || /equipe/.test(text), true, "oferece a equipe");
      if (c.expect.mentionsAny) {
        const all = `${text} ${(last.message.actions ?? []).map((a) => a.title).join(" ")}`.toLowerCase();
        assert.ok(c.expect.mentionsAny.some((w) => all.includes(w.toLowerCase())), `esperava ${c.expect.mentionsAny.join("/")} em: ${text}`);
      }
    });
  }

  test("casos de encerramento: confirmar fecha; “ok” não fecha", () => {
    for (const c of REFERENCE_CASES.filter((x) => x.expect.autoClose !== undefined)) {
      const h = [m(1, "assistant", "Oii!"), ...c.turns.slice(0, -1).map((t, i) => m(i + 2, "student", t))];
      assert.equal(decideAutoClose(c.turns.at(-1)!, { handoffRequestedAt: null }, h).close, c.expect.autoClose, c.id);
    }
  });
});

describe("importação do curso (pipeline)", () => {
  test("campos pedagógicos da aula entram no texto indexado", () => {
    const r = parseKnowledgeFile("aula.md", "---\nid: aula-perfil-transcricao\ntitle: Configurar perfil\ntype: transcricao\nmodule: m-primeiro-acesso\nlesson: l-perfil\nupdated: 2026-11-26\nobjective: Deixar o perfil pronto para vender\ntopics: foto, bio, nome\nkeywords: não sei mexer no perfil, mudar a bio\n---\nNesta aula você configura a foto, o nome e a bio do perfil passo a passo.");
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.match(r.doc.text, /^Objetivo\. Deixar o perfil pronto para vender/);
    assert.match(r.doc.text, /Palavras-chave e dúvidas relacionadas\. não sei mexer no perfil/);
    assert.equal(r.doc.status, "rascunho", "importado começa como rascunho");
  });

  test("modelo não preenchido é recusado (nunca vira conhecimento)", () => {
    const r = parseKnowledgeFile("_modulo.md", "---\nid: modulo-x-detalhes\ntitle: Módulo X\ntype: material\nupdated: 2026-11-26\n---\n(Descreva o módulo para a aluna: para quem é, o que ela vai aprender e em que momento.)");
    assert.ok(!r.ok && r.errors.some((e) => /modelo ainda não preenchido/.test(e)));
  });
});

describe("identidade no modelo local", () => {
  test("pergunta sobre a Nina recebe transparência; assunto com “IA” não", async () => {
    const p = createLocalProvider();
    const ask = async (q: string) => {
      const r = await p.complete([{ role: "system", content: "s" }, { role: "system", content: "<base_mvf>\nNenhum trecho\n</base_mvf>" }, { role: "user", content: q }], { userKey: "x" });
      return r.ok ? r.text : "";
    };
    assert.match(await ask("vc é um robô?"), /assistente virtual do MVF/);
    assert.match(await ask("to falando com uma pessoa?"), /assistente virtual do MVF/);
    assert.doesNotMatch(await ask("Qual aula ensina a criar personagem com IA?"), /Sou a Nina/);
  });
});

describe("Nina — sem botão, sem promessa de botão", () => {
  test("remove só as frases que dizem que há botão", () => {
    const t = "Pode começar com CPF.\n\nDeixei o botão da aula aqui embaixo pra você ver os detalhes.";
    assert.equal(dropButtonClaims(t), "Pode começar com CPF.");
    assert.equal(dropButtonClaims("É só tocar no botão abaixo. Qualquer coisa me chama!"), "Qualquer coisa me chama!");
    assert.equal(dropButtonClaims("A aula Bio magnética explica isso."), "A aula Bio magnética explica isso.");
  });
  test("aula do curso sem id chega à Nina marcada como sem botão", async () => {
    const { knowledgeBlock } = await import("./context.ts");
    const doc = { id: "curso-x", title: "Bio magnética", origin: "x", type: "transcricao" as const, version: 1, updatedAt: "2026-11-26", status: "aprovado" as const, access: "alunas" as const, text: "texto da aula sobre bio" };
    const block = knowledgeBlock([{ doc, chunk: { id: "curso-x#0", docId: "curso-x", ord: 0, text: doc.text, hash: "h" }, score: 1 }]);
    assert.match(block, /sem botão no app/);
    assert.doesNotMatch(block, /id da aula/);
  });
});

test("resposta sem negrito markdown nem travessão", async () => {
  const { cleanReply } = await import("./engine.ts");
  assert.equal(cleanReply("É o **Módulo 8 — Vendendo Sem Aparecer**."), "É o Módulo 8, Vendendo Sem Aparecer.");
});
