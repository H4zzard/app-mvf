import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { HELP_FAQ, HELP_PROBLEMS, HELP_SHORTCUTS, SUPPORT_CHANNELS } from "../../demo/help-center.ts";
import { demoReducer, initialDemoState, type DemoAction, type DemoState } from "../demo/store.ts";
import { parseSnapshot, serializeSnapshot } from "../demo/snapshot.ts";
import { MISSIONS } from "../demo/xp.ts";
import { NAV_ITEMS } from "../../config/navigation.ts";
import { isUnknownDetailPath, NOT_FOUND_REWRITE } from "../routing/unknown-detail.ts";
import { catalog } from "../catalog/index.ts";
import { rankHelp, stem } from "./search.ts";
import { relatedLearning } from "./related.ts";
import { DEMO_TICKET_STATUSES, TICKET_STATUS_LABEL, sensitiveFindings, validateTicket } from "./tickets.ts";

const run = (s: DemoState, ...a: DemoAction[]) => a.reduce(demoReducer, s);
const ids = (q: string) => rankHelp(q, HELP_FAQ, (f) => [f.question, f.answer]).map((f) => f.id);
const good = { subject: "Não recebi o link", category: "acesso" as const, description: "Pedi o link de acesso duas vezes e não chegou no meu e-mail." };

/* --------------------------------- Busca --------------------------------- */

test("busca: acentos, maiúsculas, plural e variações simples", () => {
  assert.equal(stem("vídeos"), stem("video"));
  assert.equal(stem("comissões"), stem("comissão"));
  assert.equal(stem("gravação"), stem("gravar"));
  assert.equal(stem("acessar"), stem("acesso"));
  const access = ids("NAO CONSIGO ACESSAR");
  assert.equal(HELP_FAQ.find((f) => f.id === access[0])?.topic, "acesso");
  assert.ok(access.slice(0, 3).includes("faq-acesso"));
  assert.ok(ids("login").includes("faq-link-nao-chegou"), "sinônimo login ≈ acesso/link");
  assert.equal(ids("comissoes")[0], "faq-comissao");
  assert.ok(ids("afiliação tiktok").includes("faq-regras-tiktok"));
  assert.deepEqual(ids("gravar sem aparecer"), ["faq-sem-aparecer"]);
  assert.deepEqual(ids("xyzzy inexistente"), []);
});

test("problemas comuns também são encontrados pela busca", () => {
  const r = rankHelp("não consigo entrar", HELP_PROBLEMS, (p) => [p.title, p.steps.join(" ")]);
  assert.equal(r[0].id, "pb-nao-consigo-entrar");
});

test("atalhos: os 5 temas pedidos, cada um com perguntas e problemas", () => {
  assert.deepEqual(HELP_SHORTCUTS.map((s) => s.topic), ["acesso", "aulas", "tiktok-shop", "conteudo", "estudio"]);
  for (const s of HELP_SHORTCUTS) {
    assert.ok(HELP_FAQ.some((f) => f.topic === s.topic), `faq ${s.topic}`);
    assert.ok(HELP_PROBLEMS.some((p) => p.topic === s.topic), `problema ${s.topic}`);
  }
});

test("conteúdo honesto: sem regra do TikTok Shop, valores ou canais inventados", () => {
  const all = [...HELP_FAQ.map((f) => f.answer), ...HELP_PROBLEMS.flatMap((p) => p.steps)].join(" ");
  assert.doesNotMatch(all, /R\$\s?\d|\d+\s?%|garant/i);
  assert.deepEqual(SUPPORT_CHANNELS, [], "canais oficiais ainda não informados");
});

test("recomendações usam só aulas e materiais existentes no catálogo", () => {
  const r = relatedLearning("minha personagem muda de rosto entre as cenas", "estudio");
  assert.ok(r.lessons.length > 0);
  for (const l of r.lessons) assert.ok(catalog.getLesson(l.id));
  assert.ok(r.lessons.some((l) => l.id === "l-consistencia"));
  assert.deepEqual(relatedLearning("", null), { lessons: [], materials: [] });
});

/* -------------------------------- Tickets -------------------------------- */

test("ticket: validação com mensagens compreensíveis", () => {
  assert.deepEqual(validateTicket(good), {});
  const e = validateTicket({ subject: "oi", category: "", description: "curto" });
  assert.match(e.subject!, /assunto/);
  assert.match(e.category!, /categoria/);
  assert.match(e.description!, /20 caracteres/);
});

test("ticket: dados sensíveis são recusados (senha, código, CPF, cartão)", () => {
  assert.deepEqual(sensitiveFindings("minha senha é abc123"), ["senha"]);
  assert.ok(sensitiveFindings("CPF 123.456.789-09").includes("CPF"));
  assert.ok(sensitiveFindings("cartão 4111 1111 1111 1111").includes("número de cartão"));
  assert.ok(sensitiveFindings("o código de verificação é 884512").includes("código ou token"));
  assert.deepEqual(sensitiveFindings("Esqueci a senha? Não, entro por link."), []);
  assert.match(validateTicket({ ...good, description: "Não entro. Minha senha é Teste123 e nada funciona." }).description!, /Remova dados sensíveis/);
});

test("ticket na demo: rascunho → simulação; nunca “aberto” ou “recebido”", () => {
  let s = run(initialDemoState(), { type: "ticket/save", draft: { subject: "Rascunho", category: "aulas", description: "" } });
  assert.equal(s.supportTickets[0].status, "rascunho");
  const draftId = s.supportTickets[0].id;
  assert.equal(run(s, { type: "ticket/simulate", id: draftId }), s, "rascunho incompleto não é enviado");
  s = run(s, { type: "ticket/save", id: draftId, draft: good }, { type: "ticket/simulate", id: draftId });
  assert.equal(s.supportTickets[0].status, "simulado");
  assert.equal(s.supportTickets[0].assignee, null);
  assert.equal(s.supportRequests, 1);
  assert.match(TICKET_STATUS_LABEL.simulado, /não enviado/);
  assert.deepEqual(DEMO_TICKET_STATUSES, ["rascunho", "simulado"]);
  assert.equal(run(s, { type: "ticket/save", id: draftId, draft: { ...good, subject: "Mudou" } }), s, "simulado não volta a ser editado");
  assert.deepEqual(run(s, { type: "ticket/delete", id: draftId }).supportTickets, []);
});

test("ticket com dado sensível nunca é gravado; tickets não vão para o armazenamento do navegador", () => {
  const s0 = initialDemoState();
  assert.equal(run(s0, { type: "ticket/save", draft: { ...good, description: "CPF 123.456.789-09 para conferir" } }), s0);
  const s = run(s0, { type: "ticket/save", draft: good });
  const raw = serializeSnapshot({ scenario: "padrao", plan: { mode: "example", profile: null, statusMap: {} }, demo: s });
  assert.ok(!raw.includes("Pedi o link"));
  assert.deepEqual(parseSnapshot(raw)?.demo.supportTickets, []);
});

/* ------------------------------- 404 e navegação ------------------------------- */

test("404: só IDs inexistentes de aulas e produtos; rotas válidas preservadas", () => {
  assert.equal(isUnknownDetailPath("/aulas/nao-existe"), true);
  assert.equal(isUnknownDetailPath("/marketplace/nao-existe"), true);
  assert.equal(isUnknownDetailPath("/marketplace/p-serum/extra"), false, "outra forma de rota: o Next decide");
  assert.equal(isUnknownDetailPath("/aulas/%E0%A4%A"), true);
  assert.equal(isUnknownDetailPath(`/aulas/${catalog.lessons()[0].id}`), false);
  assert.equal(isUnknownDetailPath("/marketplace/p-serum"), false);
  assert.equal(isUnknownDetailPath("/marketplace/numi-creme-multifuncional-3em1"), false);
  for (const p of ["/aulas", "/marketplace", "/comunidade", "/inicio"]) assert.equal(isUnknownDetailPath(p), false, p);
  assert.ok(!existsSync(join("src/app", NOT_FOUND_REWRITE)), "o destino da reescrita não pode existir");
});

/** Rotas reais do app (pastas com page.tsx em src/app). */
function appRoutes(): Set<string> {
  const out = new Set<string>();
  const walk = (dir: string, route: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const seg = e.name.startsWith("(") ? "" : `/${e.name}`;
      const path = join(dir, e.name);
      if (existsSync(join(path, "page.tsx"))) out.add(route + seg || "/");
      walk(path, route + seg);
    }
  };
  walk("src/app", "");
  return out;
}

test("navegação entre módulos: menu, missões e atalhos de ajuda apontam para rotas reais", () => {
  const routes = appRoutes();
  const hrefs = [
    ...NAV_ITEMS.map((i) => i.href),
    ...MISSIONS.map((m) => m.href),
    ...HELP_PROBLEMS.flatMap((p) => p.links.map((l) => l.href)),
    "/regras-faq",
    "/materiais",
    "/desafios",
  ];
  for (const h of hrefs) assert.ok(routes.has(h), `rota inexistente: ${h}`);
  for (const r of ["/comunidade", "/lives", "/suporte", "/conquistas", "/inicio", "/aulas", "/meu-plano"]) assert.ok(routes.has(r), r);
});
