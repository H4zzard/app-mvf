import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { buildRecordingScripts, defaultRecordingBrief, editRecordingScript, validateRecordingBrief, validateRecordingScriptsOutput, varyRecordingScript } from "./recording-scripts.ts";
import { findClaims } from "./claims.ts";
import { getTextProvider, localDemoTextGenerator } from "./provider.ts";
import type { RecordingScriptBrief } from "./contracts.ts";

const brief = (over: Partial<RecordingScriptBrief> = {}): RecordingScriptBrief => ({
  ...defaultRecordingBrief(),
  productName: "Sérum facial",
  category: "Skincare",
  description: "É um sérum de textura leve em frasco com conta-gotas. Serve para quem gosta de rotina simples.",
  howToUse: "Aplique duas gotas no rosto limpo. Espalhe com as pontas dos dedos. Espere secar antes do protetor.",
  ...over,
});

const words = (s: string) => new Set(s.toLowerCase().replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 3));
const jaccard = (a: Set<string>, b: Set<string>) => [...a].filter((x) => b.has(x)).length / new Set([...a, ...b]).size;

describe("Roteiros para Gravar Aparecendo: dez roteiros escritos", () => {
  test("briefing insuficiente é recusado com mensagens claras", () => {
    const e = validateRecordingBrief(defaultRecordingBrief());
    assert.ok(e.productName && e.description && e.howToUse);
    assert.throws(() => buildRecordingScripts(defaultRecordingBrief()));
    assert.ok(validateRecordingBrief(brief({ style: "livre" })).styleFree);
  });

  test("exatamente 10 roteiros completos, com ângulos e ganchos diferentes", () => {
    const out = buildRecordingScripts(brief());
    assert.equal(out.scripts.length, 10);
    assert.deepEqual(validateRecordingScriptsOutput(out), []);
    assert.equal(new Set(out.scripts.map((s) => s.angle)).size, 10);
    assert.equal(new Set(out.scripts.map((s) => s.hook)).size, 10);
    for (const s of out.scripts) {
      assert.ok(s.hook && s.body && s.cta && s.filmingDirections.length >= 2);
      assert.equal(s.fullSpeech, `${s.hook} ${s.body} ${s.cta}`);
      assert.ok(s.estimatedSeconds >= 10 && s.estimatedSeconds <= 50, `${s.angle}: ${s.estimatedSeconds}s`);
    }
  });

  test("os dez não são quase iguais (sobreposição de vocabulário limitada)", () => {
    const out = buildRecordingScripts(brief({ benefits: "Tem textura que absorve rápido.", limitations: "Evite contato com os olhos." }));
    const sets = out.scripts.map((s) => words(`${s.hook} ${s.body}`));
    for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) assert.ok(jaccard(sets[i], sets[j]) < 0.75, `${out.scripts[i].angle} × ${out.scripts[j].angle}`);
  });

  test("ângulos se adaptam aos fatos informados", () => {
    const sem = buildRecordingScripts(brief()).scripts.map((s) => s.angle);
    assert.ok(!sem.includes("comparacao-factual") && !sem.includes("diferencial"));
    const com = buildRecordingScripts(brief({ differential: "O frasco tem conta-gotas de vidro.", benefits: "Absorve rápido." })).scripts.map((s) => s.angle);
    assert.ok(com.includes("comparacao-factual") && com.includes("diferencial"));
    assert.equal(buildRecordingScripts(brief({ style: "unboxing" })).scripts[0].angle, "unboxing");
  });

  test("usa os fatos da aluna e não inventa alegações, números ou escassez", () => {
    const out = buildRecordingScripts(brief());
    const all = out.scripts.map((s) => s.fullSpeech).join("\n");
    assert.ok(all.includes("aplique duas gotas no rosto limpo."));
    assert.deepEqual(findClaims(all), []);
    assert.ok(!/R\$|desconto|%/.test(all));
  });

  test("alegações no briefing geram aviso; oferta só entra se confirmada", () => {
    const w = buildRecordingScripts(brief({ benefits: "Elimina rugas em 7 dias, resultado garantido." })).warnings;
    assert.ok(w.some((x) => /elimina/.test(x)) && w.some((x) => /garantido/.test(x)));
    const naoConf = buildRecordingScripts(brief({ offer: "Frete grátis hoje" }));
    assert.ok(!naoConf.scripts.some((s) => s.fullSpeech.includes("Frete grátis")));
    assert.ok(naoConf.warnings.some((x) => /não confirmou/.test(x)));
    const conf = buildRecordingScripts(brief({ offer: "Frete grátis hoje", offerConfirmed: true }));
    assert.ok(conf.scripts.every((s) => s.cta.includes("Frete grátis hoje.")));
  });

  test("primeira pessoa e colchetes pedem adaptação à experiência real", () => {
    const out = buildRecordingScripts(brief());
    const primeiro = out.scripts.find((s) => s.angle === "primeiro-uso")!;
    assert.ok(primeiro.firstPerson && primeiro.warnings.some((w) => /colchetes/.test(w)));
  });

  test("editar recalcula a fala; variação muda o gancho e é determinística", () => {
    const b = brief();
    const s = buildRecordingScripts(b).scripts[0];
    const e = editRecordingScript(s, { hook: "Novo gancho." });
    assert.ok(e.fullSpeech.startsWith("Novo gancho. "));
    const v = varyRecordingScript(b, s);
    assert.notEqual(v.hook, s.hook);
    assert.deepEqual(v, varyRecordingScript(b, s));
    assert.equal(v.variant, 1);
  });

  test("validação de saída recusa quantidade errada e campos vazios", () => {
    const out = buildRecordingScripts(brief());
    assert.ok(validateRecordingScriptsOutput({ ...out, scripts: out.scripts.slice(0, 9) }).length > 0);
    assert.ok(validateRecordingScriptsOutput({ scripts: [{ ...out.scripts[0], hook: "" }, ...out.scripts.slice(1)] }).length > 0);
  });
});

describe("Provedor de texto: só local nesta fase", () => {
  test("remoto bloqueado: sempre devolve o gerador local", async () => {
    assert.equal(getTextProvider("deepseek").kind, "demo_local");
    assert.match(localDemoTextGenerator.label, /modelo local/);
    const out = await localDemoTextGenerator.generateTenRecordingScripts(brief());
    assert.equal(out.scripts.length, 10);
  });

  test("nenhuma chamada de rede, chave ou SDK de mídia no Estúdio", () => {
    const dirs = ["src/lib/studio", "src/components/estudio"];
    for (const d of dirs) {
      for (const f of readdirSync(d)) {
        if (f.endsWith(".test.ts")) continue;
        const src = readFileSync(join(d, f), "utf8");
        assert.ok(!/fetch\(|XMLHttpRequest|NEXT_PUBLIC_|DEEPSEEK_API|api\.deepseek|process\.env/.test(src), `${d}/${f}`);
      }
    }
  });
});
