import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Paleta restrita (D122): só bordô #a4052d/#b8002e e bege #fffbf8/#f6efe0,
 * ou misturas/transparências delas. Este teste impede cores soltas de voltar.
 */
const BORDO = [
  [164, 5, 45],
  [184, 0, 46],
];
const BEGE = [
  [255, 251, 248],
  [246, 239, 224],
];

function files(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.(tsx|ts)$/.test(f) && !f.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

const hexToRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

const ALL = [...BORDO, ...BEGE];

/** A cor é uma mistura (0–100%) entre duas cores da paleta (bordô×bege ou dentro da mesma família)? */
function inPalette([r, g, b]: number[]): boolean {
  for (const a of ALL)
    for (const c of ALL)
      for (let t = 0; t <= 100; t++) {
        const m = a.map((v, i) => Math.round((v * t + c[i] * (100 - t)) / 100));
        if (Math.abs(m[0] - r) <= 2 && Math.abs(m[1] - g) <= 2 && Math.abs(m[2] - b) <= 2) return true;
      }
  return false;
}

test("tokens de cor em globals.css só usam as duas famílias", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const root = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
  const hexes = [...root.matchAll(/--mvf-[a-z-]+:\s*(#[0-9a-f]{6})/gi)].map((m) => m[1]);
  assert.ok(hexes.length > 20);
  for (const h of hexes) assert.ok(inPalette(hexToRgb(h)), `token fora da paleta: ${h}`);
  // rgb() literais (sombras, vidro, fundo do diálogo) também.
  for (const m of css.matchAll(/rgb\((\d+) (\d+) (\d+)/g)) assert.ok(inPalette([+m[1], +m[2], +m[3]]), `rgb fora da paleta: ${m[0]}`);
});

test("componentes não usam branco, preto, cores do Tailwind nem hex soltos", () => {
  const offenders: string[] = [];
  for (const f of files("src")) {
    const s = readFileSync(f, "utf8");
    if (/\b(text|bg|ring|border|fill|stroke|from|to|via|outline|shadow|divide|decoration)-(white|black)\b/.test(s)) offenders.push(`${f}: white/black`);
    const tw = s.match(/\b(text|bg|ring|border|fill|stroke|from|to|via)-(red|green|emerald|amber|yellow|blue|zinc|slate|gray|neutral|stone|rose|pink|orange|lime|teal|cyan|sky|indigo|violet|purple|fuchsia)-\d{2,3}\b/);
    if (tw) offenders.push(`${f}: ${tw[0]}`);
    for (const m of s.matchAll(/\[#([0-9a-f]{6})\]/gi)) if (!inPalette(hexToRgb(`#${m[1]}`))) offenders.push(`${f}: #${m[1]}`);
    for (const m of s.matchAll(/rgb\((\d+)_(\d+)_(\d+)/g)) if (!inPalette([+m[1], +m[2], +m[3]])) offenders.push(`${f}: ${m[0]}`);
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
