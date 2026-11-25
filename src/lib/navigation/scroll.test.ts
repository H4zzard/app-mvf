import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");

test("rolagem: regra única no App Shell, depois do conteúdo", () => {
  const shell = read("src/components/layout/app-shell.tsx");
  assert.equal((shell.match(/<ScrollReset \/>/g) ?? []).length, 1);
  assert.ok(shell.indexOf("<ScrollReset />") > shell.indexOf("</main>"), "precisa vir depois do <main> para decidir por último");
});

test("rolagem: topo ao mudar o pathname, com exceção de âncora e restauração manual", () => {
  const s = read("src/components/layout/scroll-reset.tsx");
  assert.match(s, /usePathname\(\)/);
  assert.match(s, /\[pathname\]/);
  assert.match(s, /if \(window\.location\.hash\) return;/);
  assert.match(s, /history\.scrollRestoration = "manual"/);
  assert.match(s, /behavior: "instant"/);
});

test("rolagem: nenhuma página tem efeito próprio de topo nem desliga o scroll do Link", () => {
  for (const f of ["src/components/plan/plan-view.tsx", "src/components/plan/journey-step.tsx", "src/components/dashboard/dashboard-view.tsx", "src/components/aulas/catalog-view.tsx"]) {
    const s = read(f);
    assert.doesNotMatch(s, /scrollTo\(\s*0\s*,\s*0\s*\)|scroll=\{false\}/, f);
  }
});

test("mapa: só centraliza a etapa quando vem pela âncora #no-<etapa> (botão “Mapa”)", () => {
  const map = read("src/components/plan/plan-view.tsx");
  assert.match(map, /hash\.startsWith\("#no-"\)/);
  assert.doesNotMatch(map, /takeRememberedStep|rememberStep/);
  assert.match(read("src/components/plan/journey-step.tsx"), /router\.push\(`\/meu-plano#no-\$\{stepId\}`\)/);
});
