import { test } from "node:test";
import assert from "node:assert/strict";
import { SEED_POSTS, SPACES, type CommunityPost } from "../../demo/community.ts";
import { demoReducer, initialDemoState, type DemoAction, type DemoState } from "../demo/store.ts";
import { computeXp, XP_RULES, type DemoStats } from "../demo/xp.ts";
import { parseSnapshot, serializeSnapshot } from "../demo/snapshot.ts";
import { can } from "../auth/permissions.ts";
import { catalog } from "../catalog/index.ts";
import {
  POST_TEMPLATES,
  canPostInSpace,
  checkPostDraft,
  hasPlaceholders,
  participationCounts,
  rolesForViewAs,
  spaceAccess,
  visibleFeed,
} from "./rules.ts";

const run = (s: DemoState, ...actions: DemoAction[]) => actions.reduce(demoReducer, s);
const space = (id: string) => SPACES.find((s) => s.id === id)!;
const stats = (s: DemoState): DemoStats => ({ planLessons: 0, planActions: 0, extraLessons: 0, lessonsTotal: 0, ...participationCounts(s.posts), promptsCopied: 0, favorites: 0, rsvps: 0, challengesClaimed: [] });
const ALL = { space: "todos" as const, kind: "todos" as const, query: "" };

/* --------------------------- Salas exclusivas (simulação) --------------------------- */

test("salas Elite+/Icon: bloqueadas por padrão; cada plano simulado libera só a própria sala", () => {
  assert.equal(spaceAccess(space("elite"), "padrao"), "bloqueado");
  assert.equal(spaceAccess(space("icon"), "padrao"), "bloqueado");
  assert.equal(spaceAccess(space("elite"), "Elite+"), "liberado");
  assert.equal(spaceAccess(space("icon"), "Elite+"), "bloqueado", "sem hierarquia presumida entre planos");
  assert.equal(spaceAccess(space("icon"), "Icon"), "liberado");
  assert.equal(spaceAccess(space("duvidas"), "padrao"), "aberto");
  assert.equal(canPostInSpace("avisos", "Icon"), false, "Avisos: só a equipe publica");
});

test("feed “Todos” nunca mistura salas exclusivas; sala bloqueada não mostra publicações", () => {
  const posts = initialDemoState().posts;
  assert.ok(visibleFeed(posts, ALL, "Elite+").every((p) => p.spaceId !== "elite" && p.spaceId !== "icon"));
  assert.deepEqual(visibleFeed(posts, { ...ALL, space: "elite" }, "padrao"), []);
  assert.ok(visibleFeed(posts, { ...ALL, space: "elite" }, "Elite+").length > 0);
});

test("publicar em sala exclusiva só com o plano simulado certo; a simulação nunca entra no snapshot", () => {
  const s0 = initialDemoState();
  const body = "Publicação de teste na sala exclusiva";
  assert.equal(run(s0, { type: "post/add", spaceId: "elite", body }), s0);
  const s1 = run(s0, { type: "community/sim", tier: "Elite+" }, { type: "post/add", spaceId: "elite", body });
  assert.equal(s1.posts[0].spaceId, "elite");
  assert.equal(run(s1, { type: "post/add", spaceId: "icon", body: `${body} 2` }).posts.length, s1.posts.length);
  const snap = parseSnapshot(serializeSnapshot({ scenario: "padrao", plan: { mode: "example", profile: null, statusMap: {} }, demo: { ...s1, communitySim: { tier: "Elite+", viewAs: "moderacao" } } }));
  assert.ok(snap);
  assert.deepEqual(snap.demo.communitySim, { tier: "padrao", viewAs: "aluna" });
});

/* -------------------------------- Publicações -------------------------------- */

test("publicação com modelo, vínculo e tipo; texto curto, repetido ou com colchetes é recusado", () => {
  const s0 = initialDemoState();
  const s1 = run(s0, { type: "post/add", spaceId: "duvidas", body: "Como mantenho a personagem igual?", kind: "duvida", link: { kind: "aula", id: "l-consistencia" } });
  assert.equal(s1.posts[0].kind, "duvida");
  assert.deepEqual(s1.posts[0].link, { kind: "aula", id: "l-consistencia" });
  assert.equal(run(s1, { type: "post/add", spaceId: "mural", body: "  como MANTENHO a personagem igual?  " }), s1, "mesmo texto não vira outra publicação");
  assert.equal(run(s0, { type: "post/add", spaceId: "duvidas", body: "oi" }), s0, "curta demais");
  assert.equal(run(s0, { type: "post/add", spaceId: "duvidas", body: "Vínculo inválido aqui", link: { kind: "aula", id: "../admin" } }).posts[0].link, undefined);
  const t = POST_TEMPLATES.find((x) => x.kind === "conquista")!;
  assert.ok(hasPlaceholders(t.scaffold));
  assert.ok(checkPostDraft({ spaceId: "mural", body: t.scaffold }).errors.body, "modelo sem preencher não publica");
});

test("editar a própria publicação (texto e vínculo); nunca a de outra pessoa", () => {
  let s = run(initialDemoState(), { type: "post/add", spaceId: "duvidas", body: "Primeira versão do texto" });
  const id = s.posts[0].id;
  s = run(s, { type: "post/edit", postId: id, body: "Segunda versão do texto", link: { kind: "desafio", id: "mi-sem-posts" } });
  assert.equal(s.posts[0].body, "Segunda versão do texto");
  assert.deepEqual(s.posts[0].link, { kind: "desafio", id: "mi-sem-posts" });
  s = run(s, { type: "post/edit", postId: id, body: "Segunda versão do texto", link: null });
  assert.equal(s.posts[0].link, undefined, "remove o vínculo");
  const seed = s.posts.find((p) => !p.author.isMe)!;
  assert.equal(run(s, { type: "post/edit", postId: seed.id, body: "texto invasor qualquer" }), s);
});

test("aviso sobre valores de venda (sem bloquear) e conteúdo de exemplo sem faturamento", () => {
  assert.ok(checkPostDraft({ spaceId: "mural", body: "Faturei R$ 5.000 essa semana!" }).warnings.length > 0);
  assert.equal(checkPostDraft({ spaceId: "mural", body: "Publiquei meu primeiro vídeo hoje!" }).warnings.length, 0);
  for (const p of SEED_POSTS) {
    assert.doesNotMatch(p.body, /R\$|fatur|lucr|vendi\s+\d|comiss/i, p.id);
    assert.ok(p.author.isTeam || /\(exemplo\)/.test(p.author.name), `${p.id}: perfil fictício identificado`);
  }
});

test("vínculos das publicações de exemplo apontam para aulas existentes", () => {
  for (const p of SEED_POSTS) if (p.link?.kind === "aula") assert.ok(catalog.getLesson(p.link.id), p.link.id);
});

/* ------------------------------- XP sem duplicar ------------------------------- */

test("XP: participação repetida, curta ou oculta não conta; há teto por publicações e comentários", () => {
  let s = initialDemoState();
  for (let i = 0; i < 8; i++) s = run(s, { type: "post/add", spaceId: "duvidas", body: `Minha dúvida número ${i} sobre luz` });
  assert.equal(participationCounts(s.posts).posts, 8);
  const x = computeXp(stats(s));
  assert.equal(x.breakdown.find((b) => b.label === "Comunidade")!.xp, XP_RULES.postCap * XP_RULES.post, "teto de publicações");

  const target = s.posts.find((p) => !p.author.isMe)!.id;
  for (let i = 0; i < 5; i++) s = run(s, { type: "comment/add", postId: target, body: "Boa dica!" });
  assert.equal(participationCounts(s.posts).comments, 1, "o mesmo comentário repetido vale uma vez");
  for (let i = 0; i < 15; i++) s = run(s, { type: "comment/add", postId: target, body: `Comentário diferente ${i}` });
  assert.equal(computeXp(stats(s)).breakdown.find((b) => b.label === "Comunidade")!.xp, XP_RULES.postCap * XP_RULES.post + XP_RULES.commentCap * XP_RULES.comment);

  const fake: CommunityPost = { id: "x", spaceId: "duvidas", author: { name: "Você", initials: "EU", isMe: true }, body: "Texto oculto pela moderação", baseLikes: 0, comments: [], status: "oculta" };
  assert.equal(participationCounts([fake]).posts, 0, "oculta não conta");
});

test("curtir não dá XP e excluir/publicar de novo o mesmo texto não acumula", () => {
  let s = run(initialDemoState(), { type: "post/like", postId: "post-duvida-luz" });
  assert.equal(computeXp(stats(s)).xp, 0);
  s = run(s, { type: "post/add", spaceId: "duvidas", body: "Texto que vou apagar depois" });
  const id = s.posts[0].id;
  s = run(s, { type: "post/delete", postId: id }, { type: "post/add", spaceId: "duvidas", body: "Texto que vou apagar depois" });
  assert.equal(participationCounts(s.posts).posts, 1);
});

/* ----------------------------- Denúncia e moderação ----------------------------- */

test("denúncia: motivo válido, uma vez por item, nunca do próprio conteúdo; “outro” exige observação", () => {
  let s = run(initialDemoState(), { type: "post/add", spaceId: "duvidas", body: "Minha própria publicação" });
  const mine = s.posts[0].id;
  const before = s;
  assert.equal(run(s, { type: "report/add", target: { postId: mine }, reason: "spam", note: "" }), before);
  assert.equal(run(s, { type: "report/add", target: { postId: "post-duvida-luz" }, reason: "inventado" as never, note: "" }), before);
  assert.equal(run(s, { type: "report/add", target: { postId: "post-duvida-luz" }, reason: "outro", note: "  " }), before);
  s = run(s, { type: "report/add", target: { postId: "post-duvida-luz" }, reason: "spam", note: "" });
  assert.equal(s.reports.length, 1);
  assert.equal(s.reports[0].status, "pendente");
  assert.equal(run(s, { type: "report/add", target: { postId: "post-duvida-luz" }, reason: "ofensivo", note: "" }).reports.length, 1);
  s = run(s, { type: "report/add", target: { postId: "post-duvida-luz", commentId: "c-2" }, reason: "promessa", note: "Diz que garante vendas" });
  assert.equal(s.reports.length, 2);
});

test("moderação: só no papel de moderação (simulado) e reaproveitando a matriz de permissões", () => {
  assert.equal(can([...rolesForViewAs("aluna")], "community:moderate"), false);
  assert.equal(can([...rolesForViewAs("moderacao")], "community:moderate"), true);
  assert.equal(can(["support"], "community:moderate"), false);
  assert.equal(can(["support"], "support:assign"), true);
  assert.equal(can(["student"], "support:assign"), false);

  let s = run(initialDemoState(), { type: "report/add", target: { postId: "post-duvida-luz" }, reason: "spam", note: "" });
  const id = s.reports[0].id;
  assert.equal(run(s, { type: "report/resolve", reportId: id, decision: "ocultar" }), s, "aluna não modera");
  s = run(s, { type: "community/sim", viewAs: "moderacao" }, { type: "report/resolve", reportId: id, decision: "ocultar" });
  assert.equal(s.reports[0].status, "ocultada");
  assert.equal(s.posts.find((p) => p.id === "post-duvida-luz")!.status, "oculta");
  assert.ok(!visibleFeed(s.posts, ALL, "padrao").some((p) => p.id === "post-duvida-luz"), "some do feed");
  assert.equal(run(s, { type: "comment/add", postId: "post-duvida-luz", body: "Comentário em post oculto" }), s);
});

test("moderação oculta comentário; “manter” não altera o conteúdo", () => {
  let s = run(
    initialDemoState(),
    { type: "report/add", target: { postId: "post-duvida-luz", commentId: "c-2" }, reason: "spam", note: "" },
    { type: "report/add", target: { postId: "post-apresentacao-carla" }, reason: "spam", note: "" },
    { type: "community/sim", viewAs: "moderacao" },
  );
  const [r2, r1] = s.reports;
  s = run(s, { type: "report/resolve", reportId: r1.id, decision: "ocultar" }, { type: "report/resolve", reportId: r2.id, decision: "manter" });
  assert.equal(s.posts.find((p) => p.id === "post-duvida-luz")!.comments.find((c) => c.id === "c-2")!.hidden, true);
  assert.equal(s.posts.find((p) => p.id === "post-apresentacao-carla")!.status, undefined);
});

test("snapshot: denúncias nunca são gravadas; publicações com tipo/vínculo/ocultas são restauradas", () => {
  let s = run(initialDemoState(), { type: "post/add", spaceId: "duvidas", body: "Publicação com vínculo de aula", kind: "duvida", link: { kind: "aula", id: "l-roteiro" } });
  s = run(s, { type: "report/add", target: { postId: "post-duvida-luz" }, reason: "outro", note: "Observação pessoal da aluna" });
  const raw = serializeSnapshot({ scenario: "padrao", plan: { mode: "example", profile: null, statusMap: {} }, demo: s });
  assert.ok(!raw.includes("Observação pessoal"));
  const back = parseSnapshot(raw);
  assert.ok(back);
  assert.deepEqual(back.demo.reports, []);
  assert.deepEqual(back.demo.posts[0].link, { kind: "aula", id: "l-roteiro" });
  assert.equal(back.demo.posts[0].kind, "duvida");
});
