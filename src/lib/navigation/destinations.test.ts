import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  DESTINATIONS,
  DESTINATION_IDS,
  EVOLUTION_LINKS,
  FOCUS_ROUTE_PREFIXES,
  HELP_LINKS,
  destinationForPath,
  getDestination,
  isAppNavHidden,
} from "./destinations.ts";

const APP = "src/app/(app)";
const read = (p: string) => readFileSync(p, "utf8");

/** Rotas de primeiro nível da área da aluna (uma pasta com page.tsx por rota). */
function appRoutes(): string[] {
  return readdirSync(APP)
    .filter((d) => statSync(join(APP, d)).isDirectory() && existsSync(join(APP, d, "page.tsx")))
    .map((d) => `/${d}`);
}

/** Converte um href (com query) no arquivo de página do App Router. */
function pageFileFor(href: string): string {
  const path = href.split(/[?#]/)[0];
  return join(APP, path, "page.tsx");
}

test("barra com exatamente sete destinos, na ordem pedida", () => {
  assert.deepEqual(DESTINATION_IDS, ["inicio", "plano", "aulas", "estudio", "produtos", "tribo", "perfil"]);
  assert.deepEqual(
    DESTINATIONS.map((d) => d.label),
    ["Início", "Plano", "Aulas", "Estúdio", "Produtos", "Tribo", "Perfil"],
  );
  assert.equal(getDestination("tribo").href, "/comunidade");
  assert.equal(getDestination("produtos").href, "/marketplace");
  assert.match(getDestination("tribo").a11yLabel, /Comunidade MVF/);
});

test("não existe menu Mais (nem destino, nem folha, nem botão)", () => {
  assert.ok(!DESTINATIONS.some((d) => /mais|more/i.test(d.id) || /^mais$/i.test(d.label)));
  const nav = read("src/components/layout/bottom-nav.tsx");
  const shell = read("src/components/layout/app-shell.tsx");
  assert.doesNotMatch(nav, /MoreSheet|onOpenMore|>\s*Mais\s*</);
  assert.doesNotMatch(shell, /MoreSheet|moreOpen/);
  assert.doesNotMatch(read("src/config/navigation.ts"), /MOBILE_PRIMARY_IDS/);
  assert.match(nav, /grid-cols-7/);
});

test("cada destino abre uma página real e fica ativo na própria página", () => {
  for (const d of DESTINATIONS) {
    assert.ok(existsSync(pageFileFor(d.href)), `${d.id}: página ${d.href} não existe`);
    assert.equal(destinationForPath(d.href)?.id, d.id);
  }
});

test("estado ativo nas subrotas", () => {
  const cases: Record<string, string> = {
    "/aulas/l-roteiro": "aulas",
    "/meu-plano/etapa/t-j-perfil-abrir": "plano",
    "/onboarding": "plano",
    "/estudio-ia/personagem": "estudio",
    "/estudio-ia/animar": "estudio",
    "/estudio-ia/roteiros": "estudio",
    "/videos-virais": "estudio",
    "/marketplace/p-serum": "produtos",
    "/minhas-vendas": "produtos",
    "/comunidade": "tribo",
    "/lives": "tribo",
    "/ranking": "perfil",
    "/recompensas": "perfil",
    "/desafios": "perfil",
    "/conquistas": "perfil",
    "/suporte": "perfil",
    "/regras-faq": "perfil",
    "/admin": "perfil",
    "/materiais": "aulas",
    "/inicio?x=1": "inicio",
  };
  for (const [path, id] of Object.entries(cases)) assert.equal(destinationForPath(path)?.id, id, path);
  // Prefixo parecido não conta como subrota.
  assert.equal(destinationForPath("/aulas-extra"), undefined);
  assert.equal(destinationForPath("/login"), undefined);
  assert.equal(destinationForPath("/gestao"), undefined);
});

test("nenhuma rota da aluna fica sem destino (nada escondido sem entrada)", () => {
  for (const route of appRoutes()) assert.ok(destinationForPath(route), `rota sem destino: ${route}`);
});

test("Perfil leva a Desafios, Ranking, Conquistas e Recompensas", () => {
  assert.deepEqual(EVOLUTION_LINKS.map((l) => l.href), ["/desafios", "/ranking", "/conquistas", "/recompensas"]);
  for (const l of EVOLUTION_LINKS) {
    assert.ok(existsSync(pageFileFor(l.href)), l.href);
    assert.equal(destinationForPath(l.href)?.id, "perfil");
  }
  const profile = read("src/components/extras/profile-view.tsx");
  assert.match(profile, /EVOLUTION_LINKS/);
  assert.match(profile, /HELP_LINKS/);
});

test("Suporte, FAQ e Regras: links para páginas existentes e seções válidas", () => {
  const labels = HELP_LINKS.map((l) => l.label);
  assert.deepEqual(labels, ["Central de ajuda", "Perguntas frequentes", "Regras da plataforma", "Orientações de acesso"]);
  for (const l of HELP_LINKS) assert.ok(existsSync(pageFileFor(l.href)), l.href);
  const rules = read("src/components/extras/rules-faq-view.tsx");
  for (const l of HELP_LINKS) {
    const secao = new URL(l.href, "http://x").searchParams.get("secao");
    if (secao && secao !== "regras" && secao !== "faq") assert.match(read("src/demo/rules.ts"), new RegExp(`\\b${secao}:`), secao);
  }
  assert.match(rules, /useSearchParams\(\)\.get\("secao"\)/);
});

test("Vídeos Virais: atalho direto no Início e no Estúdio (sem 4º gerador)", () => {
  assert.match(read("src/components/dashboard/quick-access.tsx"), /navId: "videos-virais"/);
  assert.match(read("src/components/dashboard/dashboard-view.tsx"), /<ToolShortcuts \/>/);
  const hub = read("src/components/estudio/studio-hub.tsx");
  assert.match(hub, /href="\/videos-virais"/);
  assert.match(hub, /Explorar vídeos virais/);
  assert.equal((hub.match(/href: "\/estudio-ia\//g) ?? []).length, 3, "o Estúdio continua com exatamente três ferramentas");
});

test("rodapés de ajuda no Início e nas Aulas", () => {
  assert.match(read("src/components/dashboard/dashboard-view.tsx"), /<HelpFooter \/>/);
  assert.match(read("src/components/aulas/catalog-view.tsx"), /<HelpFooter title="Dúvidas para começar\?" \/>/);
});

test("compatibilidade: /mais redireciona para o Perfil", () => {
  assert.match(read("next.config.ts"), /\{ source: "\/mais", destination: "\/perfil", permanent: false \}/);
  assert.equal(destinationForPath("/mais")?.id, "perfil");
});

test("barra oculta no onboarding não concluído e nas rotas de foco", () => {
  assert.equal(isAppNavHidden("/onboarding", { hasProfile: false }), true);
  assert.equal(isAppNavHidden("/onboarding", { hasProfile: true }), false, "ajustar plano mantém a navegação");
  assert.equal(isAppNavHidden("/inicio", { hasProfile: false }), false);
  assert.equal(isAppNavHidden("/meu-plano/etapa/t-j-x", { hasProfile: true }), false);
  assert.ok(Array.isArray(FOCUS_ROUTE_PREFIXES));
  assert.match(read("src/components/layout/app-shell.tsx"), /isAppNavHidden\(/);
});

test("login, confirmação e /gestao ficam fora do App Shell (sem barra da aluna)", () => {
  const files = [
    ...readdirSync("src/app/(public)", { recursive: true }).map((f) => join("src/app/(public)", String(f))),
    ...readdirSync("src/app/(gestao)", { recursive: true }).map((f) => join("src/app/(gestao)", String(f))),
    ...readdirSync("src/app/auth", { recursive: true }).map((f) => join("src/app/auth", String(f))),
  ].filter((f) => f.endsWith(".tsx") && statSync(f).isFile());
  assert.ok(files.length > 0);
  for (const f of files) assert.doesNotMatch(read(f), /AppShell|BottomNav|SidebarNav/, f);
});

test("acessibilidade da barra: nome contém o rótulo visível, alvo ≥ 44 px, foco e safe area", () => {
  const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  for (const d of DESTINATIONS) {
    assert.ok(norm(d.a11yLabel).includes(norm(d.label)), `${d.id}: “${d.a11yLabel}” não contém “${d.label}”`);
    if (d.compactLabel) assert.ok(norm(d.a11yLabel).includes(norm(d.compactLabel)), `${d.id}: falta “${d.compactLabel}”`);
    assert.ok(d.label.length <= 8, `${d.id}: rótulo longo demais para a barra`);
  }
  const nav = read("src/components/layout/bottom-nav.tsx");
  assert.match(nav, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(nav, /aria-label=\{item\.a11yLabel\}/);
  assert.match(nav, /min-w-11/);
  assert.match(nav, /h-16/);
  assert.match(nav, /focus-visible:outline/);
  assert.match(nav, /env\(safe-area-inset-bottom\)/);
  const sizes = [...nav.matchAll(/text-\[([\d.]+)rem\]/g)].map((m) => Number(m[1]));
  assert.ok(sizes.length > 0 && sizes.every((rem) => rem * 16 >= 11), `fonte da barra < 11 px: ${sizes}`);
});

test("botões fixos do Plano e do Estúdio ficam acima da barra (64 px + safe area)", () => {
  // A barra tem h-16 (4rem); as barras fixas ficam a 4.75rem + safe area.
  for (const f of ["src/components/plan/journey-step.tsx", "src/components/estudio/studio-ui.tsx", "src/components/comunidade/community-view.tsx"]) {
    assert.match(read(f), /bottom-\[calc\(4\.75rem\+env\(safe-area-inset-bottom\)\)\]/, f);
  }
});
