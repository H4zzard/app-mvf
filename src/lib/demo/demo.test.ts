import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { demoReducer, initialDemoState, likeCount, type DemoState } from "./store.ts";
import { BADGES, CHALLENGES, challengeProgress, computeXp, type DemoStats } from "./xp.ts";
import { DEFAULT_VIRAL_FILTERS, activeViralFilterCount, filterLessons, filterPosts, filterProducts, filterVirals, matchesQuery } from "./filters.ts";
import { DEMO_VIRALS } from "../../demo/virals.ts";
import { DEMO_PRODUCTS } from "../../demo/products.ts";
import { LIBRARY_LESSONS } from "../../demo/library.ts";
import { DEMO_LESSONS } from "../../demo/lessons.ts";
import { buildScenario } from "../../demo/scenarios.ts";
import { buildPlan } from "../personalization/engine.ts";
import { EXAMPLE_PROFILE } from "../../demo/plan.ts";

const run = (state: DemoState, ...actions: Parameters<typeof demoReducer>[1][]) => actions.reduce(demoReducer, state);

describe("store da demo: comunidade", () => {
  test("publica, edita e exclui só a própria postagem", () => {
    let s = run(initialDemoState(), { type: "post/add", spaceId: "duvidas", body: "  Minha   dúvida de teste  " });
    const mine = s.posts[0];
    assert.equal(mine.author.isMe, true);
    assert.equal(mine.body, "Minha dúvida de teste");
    s = run(s, { type: "post/edit", postId: mine.id, body: "Texto editado" });
    assert.equal(s.posts[0].body, "Texto editado");
    assert.equal(s.posts[0].edited, true);
    const seed = s.posts.find((p) => !p.author.isMe)!;
    const before = s;
    s = run(s, { type: "post/edit", postId: seed.id, body: "invasão" }, { type: "post/delete", postId: seed.id });
    assert.equal(s, before, "postagens de outras pessoas não mudam");
    s = run(s, { type: "post/delete", postId: mine.id });
    assert.ok(!s.posts.some((p) => p.id === mine.id));
  });

  test("não publica vazio, longo demais ou em espaço restrito/da equipe", () => {
    const s0 = initialDemoState();
    assert.equal(run(s0, { type: "post/add", spaceId: "duvidas", body: "   " }), s0);
    assert.equal(run(s0, { type: "post/add", spaceId: "duvidas", body: "x".repeat(601) }), s0);
    assert.equal(run(s0, { type: "post/add", spaceId: "avisos", body: "oi" }), s0);
    assert.equal(run(s0, { type: "post/add", spaceId: "elite", body: "oi" }), s0);
  });

  test("curtir alterna e soma à contagem de exemplo; comentário próprio pode ser removido", () => {
    const s0 = initialDemoState();
    const post = s0.posts[1];
    let s = run(s0, { type: "post/like", postId: post.id });
    assert.equal(likeCount(s, post), post.baseLikes + 1);
    s = run(s, { type: "post/like", postId: post.id });
    assert.equal(likeCount(s, post), post.baseLikes);
    s = run(s, { type: "comment/add", postId: post.id, body: "Boa!" });
    const comment = s.posts[1].comments.at(-1)!;
    assert.equal(comment.author.isMe, true);
    s = run(s, { type: "comment/delete", postId: post.id, commentId: comment.id });
    assert.ok(!s.posts[1].comments.some((c) => c.id === comment.id));
    const seedComment = s0.posts.find((p) => p.comments.length > 0)!;
    const s2 = run(s0, { type: "comment/delete", postId: seedComment.id, commentId: seedComment.comments[0].id });
    assert.equal(s2.posts.find((p) => p.id === seedComment.id)!.comments.length, seedComment.comments.length);
  });

  test("filtro “todos” esconde salas restritas", () => {
    const posts = initialDemoState().posts;
    assert.ok(filterPosts(posts, "todos").every((p) => p.spaceId !== "elite" && p.spaceId !== "icon"));
    assert.ok(filterPosts(posts, "duvidas").every((p) => p.spaceId === "duvidas"));
  });
});

describe("store da demo: favoritos, aulas, estúdio, desafios", () => {
  test("favoritos alternam por tipo", () => {
    let s = run(initialDemoState(), { type: "favorite/toggle", kind: "virals", id: "v-1" }, { type: "favorite/toggle", kind: "products", id: "p-1" });
    assert.deepEqual(s.favorites, { virals: ["v-1"], products: ["p-1"], templates: [], materials: [] });
    s = run(s, { type: "favorite/toggle", kind: "virals", id: "v-1" });
    assert.deepEqual(s.favorites.virals, []);
  });

  test("aula concluída é idempotente", () => {
    const s = run(initialDemoState(), { type: "lesson/set", lessonId: "l-x", done: true }, { type: "lesson/set", lessonId: "l-x", done: true });
    assert.deepEqual(s.lessonsDone, ["l-x"]);
    assert.deepEqual(run(s, { type: "lesson/set", lessonId: "l-x", done: false }).lessonsDone, []);
  });

  test("prompt salvo não duplica; desafio só é resgatado se elegível e uma vez", () => {
    let s = run(initialDemoState(), { type: "prompt/save", title: "A", text: "T" }, { type: "prompt/save", title: "A", text: "T" });
    assert.equal(s.prompts.saved.length, 1);
    s = run(s, { type: "challenge/claim", challengeId: "ch-1", eligible: false });
    assert.deepEqual(s.challengesClaimed, []);
    s = run(s, { type: "challenge/claim", challengeId: "ch-1", eligible: true }, { type: "challenge/claim", challengeId: "ch-1", eligible: true });
    assert.deepEqual(s.challengesClaimed, ["ch-1"]);
  });

  test("reset volta ao estado informado", () => {
    const s = run(initialDemoState(), { type: "post/add", spaceId: "duvidas", body: "oi" });
    assert.deepEqual(run(s, { type: "reset", state: initialDemoState() }), initialDemoState());
  });
});

describe("XP da demo", () => {
  const zero: DemoStats = { planLessons: 0, planActions: 0, extraLessons: 0, lessonsTotal: 0, posts: 0, comments: 0, promptsCopied: 0, favorites: 0, rsvps: 0, challengesClaimed: [] };

  test("começa em zero, nível 1, sem selos", () => {
    const x = computeXp(zero);
    assert.equal(x.xp, 0);
    assert.equal(x.level.number, 1);
    assert.equal(x.badgesUnlocked, 0);
  });

  test("soma ações, limita cópias e só conta desafios concluídos e resgatados", () => {
    const s = { ...zero, planLessons: 2, planActions: 1, promptsCopied: 20, lessonsTotal: 3, challengesClaimed: ["ch-3-aulas", "ch-comunidade"] };
    const x = computeXp(s);
    // 20 + 15 + 5*4 (teto) + 20 (ch-3-aulas concluído) ; ch-comunidade não concluído não soma
    assert.equal(x.xp, 75);
    assert.equal(x.level.name, "Em movimento");
    assert.ok(x.levelPercent >= 0 && x.levelPercent <= 100);
  });

  test("progresso de desafio e selos", () => {
    const s = { ...zero, favorites: 5, posts: 1 };
    const c = CHALLENGES.find((c) => c.id === "ch-referencias")!;
    assert.deepEqual(challengeProgress(c, s), { value: 3, done: true, claimed: false });
    assert.ok(BADGES.find((b) => b.id === "b-curadora")!.unlocked(s));
    assert.ok(BADGES.find((b) => b.id === "b-voz-ativa")!.unlocked(s));
  });
});

describe("filtros", () => {
  test("busca ignora acentos e maiúsculas", () => {
    assert.ok(matchesQuery("rotina", "Rotina de skincare"));
    assert.ok(matchesQuery("MAOS produto", "Enquadramento", "Mãos e produto"));
    assert.ok(!matchesQuery("perfume", "Batom"));
  });

  test("virais: filtros combinados, favoritos e ordenação", () => {
    const br = filterVirals(DEMO_VIRALS, { ...DEFAULT_VIRAL_FILTERS, country: "BR", platform: "tiktok", kind: "organico" }, []);
    assert.ok(br.length > 0 && br.every((v) => v.country === "BR" && v.platform === "tiktok" && v.kind === "organico"));
    const favs = filterVirals(DEMO_VIRALS, { ...DEFAULT_VIRAL_FILTERS, onlyFavorites: true }, ["v-textura-close"]);
    assert.deepEqual(favs.map((v) => v.id), ["v-textura-close"]);
    const byDuration = filterVirals(DEMO_VIRALS, { ...DEFAULT_VIRAL_FILTERS, sort: "duracao" }, []);
    assert.ok(byDuration.every((v, i, a) => i === 0 || a[i - 1].durationSec <= v.durationSec));
    const curated = filterVirals(DEMO_VIRALS, DEFAULT_VIRAL_FILTERS, []);
    assert.equal(curated[0].curationOrder, Math.max(...DEMO_VIRALS.map((v) => v.curationOrder)));
    assert.equal(activeViralFilterCount({ ...DEFAULT_VIRAL_FILTERS, country: "US", onlyFavorites: true }), 2);
  });

  test("virais de exemplo não trazem link inventado", () => {
    assert.ok(DEMO_VIRALS.every((v) => v.sourceUrl === null));
  });

  test("aulas: categoria, status e busca", () => {
    const done = new Set(["l-roteiro"]);
    const r = filterLessons(LIBRARY_LESSONS, { query: "", category: "criacao", status: "concluidas", isDone: (id) => done.has(id) });
    assert.deepEqual(r.map((l) => l.id), ["l-roteiro"]);
    const q = filterLessons(LIBRARY_LESSONS, { query: "mãos", category: "todas", status: "todas", isDone: () => false });
    assert.ok(q.length >= 2);
  });

  test("marketplace: categoria e Meus produtos", () => {
    const mine = filterProducts(DEMO_PRODUCTS, { query: "", category: "todas", onlyMine: true, mine: ["p-batom"] });
    assert.deepEqual(mine.map((p) => p.id), ["p-batom"]);
    assert.ok(filterProducts(DEMO_PRODUCTS, { query: "", category: "skincare", onlyMine: false, mine: [] }).every((p) => p.category === "skincare"));
  });
});

describe("cenários e consistência de IDs", () => {
  test("toda aula do plano existe na biblioteca", () => {
    const ids = new Set(DEMO_LESSONS.map((l) => l.id));
    for (const t of buildPlan(EXAMPLE_PROFILE).tasks) if (t.lessonId) assert.ok(ids.has(t.lessonId), t.lessonId);
  });

  test("cenários são determinísticos e só usam IDs do plano", () => {
    assert.deepEqual(buildScenario("evolucao"), buildScenario("evolucao"));
    const nova = buildScenario("nova");
    assert.equal(nova.plan.profile, null);
    const evo = buildScenario("evolucao");
    const planIds = new Set(buildPlan(evo.plan.profile!).tasks.map((t) => t.id));
    assert.ok(Object.keys(evo.plan.statusMap).every((id) => planIds.has(id)));
    assert.equal(Object.values(evo.plan.statusMap).filter((s) => s === "in_progress").length, 1);
  });
});
