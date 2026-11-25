import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Paleta definitiva (D127): borgonha #800020 e off-white #FAF9F6, ou
 * misturas/transparências delas. Exceção ÚNICA: o menu inferior congelado
 * (tokens --nav-*, bloco .mvf-glass e bottom-nav.tsx) mantém os valores aprovados.
 */
const BORGONHA = [128, 0, 32];
const OFFWHITE = [250, 249, 246];
/** Valores congelados do menu inferior (só permitidos nele). */
const NAV_FROZEN = new Set(["164,5,45", "255,251,248", "#fffbf8", "#f2d9dc", "#f6efe0"]);

function files(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.(tsx|ts)$/.test(f) && !f.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

const hexToRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** A cor é uma mistura (0–100%) de borgonha com off-white? */
function inPalette([r, g, b]: number[]): boolean {
  for (let t = 0; t <= 100; t++) {
    const m = BORGONHA.map((v, i) => Math.round((v * t + OFFWHITE[i] * (100 - t)) / 100));
    if (Math.abs(m[0] - r) <= 2 && Math.abs(m[1] - g) <= 2 && Math.abs(m[2] - b) <= 2) return true;
  }
  return false;
}

test("tokens de cor em globals.css só usam a paleta definitiva (exceto o menu congelado)", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const root = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
  const tokens = [...root.matchAll(/--mvf-[a-z-]+:\s*(#[0-9a-f]{6})/gi)].map((m) => m[1].toLowerCase());
  assert.ok(tokens.length > 20);
  for (const h of tokens) assert.ok(inPalette(hexToRgb(h)), `token fora da paleta: ${h}`);
  for (const old of ["#a4052d", "#b8002e", "#fffbf8", "#f6efe0"]) assert.ok(!tokens.includes(old), `cor antiga como token global: ${old}`);
  // rgb() literais fora do bloco congelado do menu (sombras, fundo do diálogo).
  const start = css.indexOf(".mvf-glass {");
  const glass = css.slice(start, css.indexOf("/* Menu inferior (congelado):", start));
  for (const m of css.replace(glass, "").matchAll(/rgb\((\d+) (\d+) (\d+)/g)) assert.ok(inPalette([+m[1], +m[2], +m[3]]), `rgb fora da paleta: ${m[0]}`);
});

test("menu inferior congelado: tokens próprios com os valores aprovados", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(css, /--nav-glass: 164 5 45;/);
  assert.match(css, /--nav-fg: #fffbf8;/);
  assert.match(css, /--nav-fg-muted: #f2d9dc;/);
  assert.match(css, /--nav-accent: #f6efe0;/);
  assert.match(css, /background-color: rgb\(var\(--nav-glass\) \/ 0\.85\);/);
  const nav = readFileSync("src/components/layout/bottom-nav.tsx", "utf8");
  assert.doesNotMatch(nav, /\b(text|bg|ring|outline)-(paper|on-wine|accent|brand|wine)/, "o menu não pode usar tokens globais");
  for (const v of ["bg-nav-fg/15", "ring-nav-fg/30", "text-nav-fg-muted", "rgb(255_251_248/0.28)", "rgb(164_5_45/0.9)"]) assert.ok(nav.includes(v), v);
});

test("componentes não usam branco, preto, cores do Tailwind nem hex soltos", () => {
  const offenders: string[] = [];
  for (const f of files("src")) {
    const s = readFileSync(f, "utf8");
    if (/\b(text|bg|ring|border|fill|stroke|from|to|via|outline|shadow|divide|decoration)-(white|black)\b/.test(s)) offenders.push(`${f}: white/black`);
    const tw = s.match(/\b(text|bg|ring|border|fill|stroke|from|to|via)-(red|green|emerald|amber|yellow|blue|zinc|slate|gray|neutral|stone|rose|pink|orange|lime|teal|cyan|sky|indigo|violet|purple|fuchsia)-\d{2,3}\b/);
    if (tw) offenders.push(`${f}: ${tw[0]}`);
    const frozen = f.endsWith("layout/bottom-nav.tsx");
    for (const m of s.matchAll(/\[#([0-9a-f]{6})\]/gi)) if (!inPalette(hexToRgb(`#${m[1]}`))) offenders.push(`${f}: #${m[1]}`);
    for (const m of s.matchAll(/rgb\((\d+)_(\d+)_(\d+)/g)) if (!inPalette([+m[1], +m[2], +m[3]]) && !(frozen && NAV_FROZEN.has(`${m[1]},${m[2]},${m[3]}`))) offenders.push(`${f}: ${m[0]}`);
  }
  assert.deepEqual(offenders, []);
});

test("topo sem marca: o cabeçalho não renderiza logo nem nome do app", () => {
  const header = readFileSync("src/components/layout/app-header.tsx", "utf8");
  assert.doesNotMatch(header, /BrandMark|BRAND\.|appName|tagline/);
  assert.match(header, /NotificationsButton/);
  assert.doesNotMatch(readFileSync("src/components/layout/app-shell.tsx", "utf8"), /<BrandMark/);
});

test("barra inferior flutuante, retangular e em vidro bordô", () => {
  const nav = readFileSync("src/components/layout/bottom-nav.tsx", "utf8");
  assert.match(nav, /mvf-glass/);
  assert.match(nav, /bottom-\[calc\(env\(safe-area-inset-bottom\)\+0\.5rem\)\]/);
  assert.match(nav, /\brounded-xl\b/);
  assert.doesNotMatch(nav, /rounded-full|rounded-t-/);
});
