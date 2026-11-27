/**
 * Nina — interface limpa, histórico privado e encerramento correto (correção de 27/11/2026).
 * Testes puros: arquivos da interface, regras de encerramento, repositório em memória e autorização.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { adminRequestStatus } from "../auth/permissions.ts";
import { buildLessonActions, decideAutoClose, titleMatches } from "./decisions.ts";
import { FAREWELLS } from "./persona.ts";
import { createMemoryStore, type Limits } from "./store.ts";
import { formatRecife } from "./transcript.ts";
import type { SupportMessage } from "./types.ts";

const VIEW = readFileSync("src/components/suporte/chat-view.tsx", "utf8");
const ACTIONS = readFileSync("src/app/(app)/suporte/chat/actions.ts", "utf8");
const PAGE = readFileSync("src/app/(app)/suporte/chat/page.tsx", "utf8");
const ENTRY = readFileSync("src/components/suporte/chat-entry.tsx", "utf8");
const LIMITS: Limits = { maxMessagesPerConversation: 30, dailyMessagesPerUser: 999, pendingStaleMs: 60_000 };
const msg = (seq: number, sender: SupportMessage["sender"], content: string): SupportMessage => ({ id: `m${seq}`, conversationId: "c", sender, content, seq, createdAt: new Date(Date.UTC(2026, 10, 27, 12, 0, seq)).toISOString() });
const hist = [msg(1, "assistant", "Oii!"), msg(2, "student", "Não acho a aula de bio"), msg(3, "assistant", "Conseguiu encontrar a aula por aí?")];
const conv = { handoffRequestedAt: null };

/** Texto visível da interface: literais de JSX e strings, sem comentários. */
const uiText = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("interface da aluna sem informação técnica", () => {
  test("1–4. nenhum modelo, provedor, token, custo ou depuração no chat", () => {
    for (const [name, src] of [["chat-view", VIEW], ["page", PAGE], ["chat-entry", ENTRY]] as const) {
      const t = uiText(src);
      assert.doesNotMatch(t, /deepseek|deepseek-flash|modelo local|tokens?\b|tokensIn|tokensOut|lat[eê]ncia|custo|consumo/i, `${name} cita dado técnico`);
      assert.doesNotMatch(t, /providerLabel|providerKind|\.meta\b|via \$\{/, `${name} usa metadado técnico`);
      assert.doesNotMatch(t, /Demonstração|demonstração \(/, `${name} mostra rótulo de ambiente`);
    }
  });

  test("Server Actions não enviam metadados, fontes, provedor nem arquivo ao navegador", () => {
    const toClient = ACTIONS.slice(ACTIONS.indexOf("const toClient"), ACTIONS.indexOf("});", ACTIONS.indexOf("const toClient")));
    assert.doesNotMatch(toClient, /meta|sources/);
    assert.doesNotMatch(ACTIONS, /providerLabel|providerKind|fileName|persistent:/);
    assert.match(ACTIONS, /export interface ClosedInfo \{\s*reason: CloseReason;\s*\}/);
  });

  test("cabeçalho mostra só Nina e Suporte MVF; natureza virtual informada uma vez", () => {
    const header = VIEW.slice(VIEW.indexOf("<header"), VIEW.indexOf("</header>"));
    assert.match(header, /\{ASSISTANT\.name\}/);
    assert.match(header, />Suporte MVF</);
    assert.doesNotMatch(header, /automatizad|virtual|ASSISTANT\.role/);
    assert.equal((uiText(VIEW).match(/assistente virtual/gi) ?? []).length, 1);
  });

  test("5–6. nenhum download de TXT para a aluna: sem botão, sem ação e sem exportação no repositório", () => {
    assert.doesNotMatch(uiText(VIEW), /Baixar|download|transcri|\.txt|Blob\(|createObjectURL/i);
    assert.doesNotMatch(ACTIONS, /export async function (exportTranscript|listMyConversations)/);
    assert.doesNotMatch(ACTIONS, /exportTranscript\(|transcriptFileName/);
    assert.equal("exportTranscript" in createMemoryStore(), false);
    const sb = readFileSync("src/lib/support-ai/supabase-store.ts", "utf8");
    assert.doesNotMatch(sb, /exportTranscript/);
    assert.doesNotMatch(sb, /user\.from\([^)]*\)\.select\("\*"\)/, "a sessão da aluna nunca usa select *");
  });

  test("tela de encerramento: título, mensagem e nova conversa, sem histórico técnico", () => {
    const closed = VIEW.slice(VIEW.indexOf("{closed ? ("), VIEW.indexOf(") : null}", VIEW.indexOf("{closed ? (")));
    assert.match(closed, /Atendimento encerrado/);
    assert.match(closed, /Quando precisar de ajuda novamente, estaremos por aqui\. 💗/);
    assert.match(closed, /Iniciar nova conversa/);
    assert.doesNotMatch(closed, /arquivad|transcri|closedAt|history|conversationId/i);
  });
});

describe("7. exportação administrativa (support:history)", () => {
  test("só equipe autorizada: anônimo 401; aluna, moderação e demo 403; admin e suporte 200", () => {
    assert.equal(adminRequestStatus({ kind: "anonymous" }, "support:history"), 401);
    assert.equal(adminRequestStatus({ kind: "demo" }, "support:history"), 403);
    assert.equal(adminRequestStatus({ kind: "member", roles: ["student"] }, "support:history"), 403);
    assert.equal(adminRequestStatus({ kind: "member", roles: ["moderator"] }, "support:history"), 403);
    assert.equal(adminRequestStatus({ kind: "member", roles: ["support"] }, "support:history"), 200);
    assert.equal(adminRequestStatus({ kind: "member", roles: ["admin"] }, "support:history"), 200);
  });
  test("rota de exportação passa pela autorização do servidor e responde sem cache", () => {
    const route = readFileSync("src/app/api/admin/suporte/[id]/transcricao/route.ts", "utf8");
    assert.match(route, /exportTranscriptForStaff\(id\)/);
    assert.match(route, /no-store/);
    const server = readFileSync("src/lib/support-ai/server.ts", "utf8");
    const fn = server.slice(server.indexOf("export async function exportTranscriptForStaff"));
    assert.match(fn, /adminRequestStatus\(viewer, "support:history"\)/);
    assert.match(fn, /support_admin_export/);
  });
});

describe("encerramento automático só com conclusão clara", () => {
  test("11–14. “não”, “ainda não consegui”, “ok” e respostas parciais não encerram", () => {
    for (const t of ["não", "Não", "ainda não consegui", "ainda não", "não achei", "não consegui", "não funcionou", "não entendi", "continua dando erro", "vou tentar", "ok", "Ok!", "obrigada", "ok obrigada",
      "não, é só isso que aparece", "é só isso que aparece pra mim", "consegui entrar mas não acho a aula", "nada resolveu", "deu certo o login mas a aula não aparece", "funcionou em parte", "achei o módulo, cadê a aula"]) {
      assert.equal(decideAutoClose(t, conv, hist).close, false, t);
    }
  });
  test("13. confirmações claras encerram (servidor decide o motivo)", () => {
    for (const t of ["Deu certo, obrigada!", "Consegui resolver.", "Agora achei.", "Era só isso.", "Funcionou!", "deu certo, obrigada"]) {
      assert.deepEqual(decideAutoClose(t, conv, hist), { close: true, reason: "resolvido" }, t);
    }
    assert.deepEqual(decideAutoClose("Pode encerrar.", conv, hist), { close: true, reason: "manual" });
  });
  test("a resposta do modelo nunca encerra: só a mensagem da aluna passa pela decisão", () => {
    const send = ACTIONS.slice(ACTIONS.indexOf("export async function sendMessageAction"), ACTIONS.indexOf("export async function retryReplyAction"));
    assert.match(send, /decideAutoClose\(content,/);
    assert.equal((ACTIONS.match(/closeWith\(/g) ?? []).length, 4, "fechamento só: definição, automático, abrir aula e manual");
    assert.doesNotMatch(readFileSync("src/lib/support-ai/engine.ts", "utf8"), /\.close\(/);
  });
});

describe("arquivamento automático do TXT", () => {
  async function conversation(store = createMemoryStore()) {
    const { conversation: c } = await store.start("ana", "Ana Teste", "Oii! Como posso ajudar?");
    await store.appendStudent("ana", c.id, "Não acho a aula de bio", LIMITS);
    await store.appendAssistant(c.id, "Fica em Aulas. Conseguiu encontrar a aula por aí?");
    return { store, id: c.id };
  }

  test("9. encerramento manual arquiva o histórico completo, com cabeçalho e motivo", async () => {
    const { store, id } = await conversation();
    const r = await store.close("ana", id, "manual");
    assert.ok(r.ok);
    const t = r.value.transcript!;
    for (const part of [`ID: ${id}`, "Aluna: Ana Teste", "Início: ", "Encerramento: ", "America/Recife (registros guardados em UTC)", "Encaminhamento humano: não solicitado", "Oii! Como posso ajudar?", "Não acho a aula de bio", "Conseguiu encontrar a aula por aí?", "Motivo: Encerrado pela aluna"]) {
      assert.ok(t.includes(part), part);
    }
  });

  test("10. encerramento automático arquiva tudo, inclusive a despedida", async () => {
    const { store, id } = await conversation();
    await store.appendStudent("ana", id, "Deu certo, obrigada!", LIMITS);
    const current = (await store.get("ana", id))!;
    const d = decideAutoClose("Deu certo, obrigada!", current.conversation, current.messages.slice(0, -1));
    assert.ok(d.close);
    await store.appendAssistant(id, FAREWELLS[0]);
    const r = await store.close("ana", id, d.reason);
    assert.ok(r.ok);
    assert.ok(r.value.transcript!.includes("Deu certo, obrigada!") && r.value.transcript!.includes(FAREWELLS[0]));
    assert.match(r.value.transcript!, /Motivo: Resolvido \(confirmado pela aluna\)\n$/);
  });

  test("“não” mantém a conversa aberta e recebendo mensagens", async () => {
    const { store, id } = await conversation();
    await store.appendStudent("ana", id, "não", LIMITS);
    const current = (await store.get("ana", id))!;
    assert.equal(decideAutoClose("não", current.conversation, current.messages.slice(0, -1)).close, false);
    assert.equal(current.conversation.status, "open");
  });

  test("15. falha de persistência não confirma nada e deixa o encerramento recuperável", async () => {
    let fail = true;
    const { store, id } = await conversation(createMemoryStore({ archive: async () => { if (fail) throw new Error("rede"); } }));
    const r = await store.close("ana", id, "manual");
    assert.ok(!r.ok && r.error === "archive_failed");
    const c = (await store.get("ana", id))!.conversation;
    assert.equal(c.status, "closing");
    assert.equal(c.transcript, null);
    assert.equal(c.closedAt, null);
    fail = false;
    const again = await store.close("ana", id, "manual");
    assert.ok(again.ok && !again.value.alreadyClosed);
  });

  test("16. arquivar de novo devolve o mesmo resultado, sem duplicar", async () => {
    const { store, id } = await conversation();
    const [a, b] = await Promise.all([store.close("ana", id), store.close("ana", id)]);
    const c = await store.close("ana", id);
    assert.ok(a.ok && b.ok && c.ok && c.value.alreadyClosed);
    assert.equal(a.value.transcript, c.value.transcript);
    assert.equal(store._dump().messages.filter((m) => m.conversationId === id).length, 3, "nenhuma mensagem duplicada");
  });

  test("17. mensagens na ordem, com horário de cada uma (UTC guardado, Recife exibido)", async () => {
    let t = Date.UTC(2026, 10, 27, 15, 0, 0);
    const store = createMemoryStore({ now: () => new Date((t += 61_000)) });
    const { id } = await conversation(store);
    const r = await store.close("ana", id);
    assert.ok(r.ok);
    const stamps = [...r.value.transcript!.matchAll(/^\[(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2})\] (ALUNA|NINA|SISTEMA|[^\n]+)$/gm)].map((x) => x[1]);
    const saved = store._dump().messages.filter((m) => m.conversationId === id).sort((a, b) => a.seq - b.seq);
    assert.deepEqual(stamps, saved.map((m) => formatRecife(m.createdAt)), "horário exato de cada mensagem");
    assert.deepEqual([...stamps].sort(), stamps, "em ordem cronológica");
    assert.equal(formatRecife("2026-11-27T15:00:00.000Z"), "27/11/2026 12:00:00", "UTC → Recife (−3 h)");
    const order = ["Oii! Como posso ajudar?", "Não acho a aula de bio", "Conseguiu encontrar"].map((p) => r.value.transcript!.indexOf(p));
    assert.deepEqual([...order].sort((x, y) => x - y), order);
    assert.ok(store._dump().messages.every((m) => m.createdAt.endsWith("Z")), "guardado em UTC");
  });

  test("18. memória não simula persistência permanente", async () => {
    const { store, id } = await conversation();
    assert.equal(store.persistent, false);
    const r = await store.close("ana", id);
    assert.ok(r.ok && r.value.persisted === false);
    assert.match(ACTIONS, /TXT só em memória \(NÃO persistido no Supabase\)/);
    assert.doesNotMatch(uiText(VIEW), /arquivad[oa] (com sucesso|às)|salv[oa] (com sucesso|às)/i);
  });

  test("19. abrir aula registra o evento e arquiva ANTES de navegar", async () => {
    const { store, id } = await conversation();
    await store.appendSystem("ana", id, "A aluna abriu a aula “Bio magnética”.");
    const r = await store.close("ana", id, "abriu_aula");
    assert.ok(r.ok && r.value.transcript!.includes("A aluna abriu a aula “Bio magnética”."));
    const open = VIEW.slice(VIEW.indexOf("async function openLesson"), VIEW.indexOf("const canType"));
    assert.ok(open.indexOf("await finishClosed") < open.indexOf("router.push"), "navega só depois de encerrar");
    const action = ACTIONS.slice(ACTIONS.indexOf("export async function openLessonAction"));
    assert.ok(action.indexOf('closeWith(runtime, conversationId, "abriu_aula")') < action.indexOf("href: lesson.href"));
  });
});

describe("20. sugestões de aula relevantes", () => {
  const resolve = (id: string) => ({ "l-bio": { title: "Bio magnética", moduleTitle: "Perfil", href: "/aulas/l-bio" }, "l-capcut": { title: "Como editar no CapCut", moduleTitle: "Edição", href: "/aulas/l-capcut" } })[id] ?? null;
  const chunk = (lessonId: string, score: number) => ({
    chunk: { id: `${lessonId}#0`, docId: lessonId, ord: 0, text: "t", hash: "" },
    doc: { id: lessonId, title: lessonId, origin: "x", type: "material" as const, lessonId, version: 1, updatedAt: "2026-11-27", status: "aprovado" as const, access: "alunas" as const, text: "t" },
    score,
  });
  test("título precisa combinar com a dúvida", () => {
    assert.ok(titleMatches("Bio magnética", "qual aula ensina a bio magnética?"));
    assert.ok(!titleMatches("Como editar no CapCut", "onde acho a aula de bio do perfil?"));
  });
  test("aula fraca ou sem relação não vira chip", () => {
    assert.deepEqual(buildLessonActions({ modelLessonIds: [], retrieved: [chunk("l-capcut", 5)], studentText: "onde acho a aula de bio?", resolve }), []);
    assert.deepEqual(buildLessonActions({ modelLessonIds: [], retrieved: [chunk("l-bio", 5)], studentText: "onde acho a aula de bio?", resolve }).map((a) => a.lessonId), ["l-bio"]);
    assert.deepEqual(buildLessonActions({ modelLessonIds: ["l-capcut"], retrieved: [chunk("l-bio", 5)], studentText: "qual aula?", resolve }), [], "modelo não sugere aula fora da busca");
  });
  test("a interface não mostra mais as fontes como chips", () => {
    assert.doesNotMatch(VIEW, /Fontes usadas|m\.sources/);
  });
});
