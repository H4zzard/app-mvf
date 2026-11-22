import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import raw from "../../content/catalogo-oficial.json" with { type: "json" };
import { LESSON_CSV_COLUMNS, lessonsFromCsv, mergeLessons, parseCsv } from "./csv.ts";
import { parseCatalogFile } from "./schema.ts";

const header = LESSON_CSV_COLUMNS.join(",");

describe("importação de aulas por CSV", () => {
  test("parser lida com aspas, vírgulas e quebras de linha dentro do campo", () => {
    const rows = parseCsv('a,b\n"1, com vírgula","linha 1\nlinha 2"\n"aspas ""duplas""",x\n');
    assert.deepEqual(rows, [["a", "b"], ["1, com vírgula", "linha 1\nlinha 2"], ['aspas "duplas"', "x"]]);
  });

  test("converte linhas válidas e gera alias de compatibilidade (substitui_id)", () => {
    const csv = `${header}\nl-oficial-roteiro,m-roteirista-invisivel,1,Aula oficial de teste,12,fundamento,roteiro;gancho,,Resumo,Prática,youtube,dQw4w9WgXcQ,,disponivel,l-roteiro\n`;
    const r = lessonsFromCsv(csv);
    assert.deepEqual(r.errors, []);
    assert.equal(r.lessons.length, 1);
    assert.deepEqual(r.lessons[0].tags, ["roteiro", "gancho"]);
    assert.deepEqual(r.lessons[0].media, { kind: "externo", provider: "youtube", ref: "dQw4w9WgXcQ" });
    assert.deepEqual(r.aliases, { "l-roteiro": "l-oficial-roteiro" });
    // passa na validação oficial depois de mesclado
    const file = { ...(raw as object), lessons: mergeLessons([], r.lessons), lessonAliases: r.aliases };
    const parsed = parseCatalogFile(file);
    assert.ok(parsed.ok, parsed.ok ? "" : parsed.errors.join("\n"));
  });

  test("duração vazia vira null e disponibilidade vazia vira em_breve", () => {
    const r = lessonsFromCsv(`${header}\nl-sem-duracao,m-protocolo,1,Aula,,,,,,,,,,,\n`);
    assert.equal(r.lessons[0].durationMinutes, null);
    assert.equal(r.lessons[0].availability, "em_breve");
    assert.deepEqual(r.lessons[0].media, { kind: "none" });
  });

  test("recusa cabeçalho incompleto e linhas de exemplo do modelo", () => {
    assert.match(lessonsFromCsv("id,titulo\nl-a,Aula\n").errors[0], /Colunas ausentes/);
    const r = lessonsFromCsv(`${header}\nl-exemplo-1,m-protocolo,1,EXEMPLO,,,,,,,,,,,\n`);
    assert.match(r.errors[0], /EXEMPLO/);
  });

  test("o modelo de planilha da documentação tem o cabeçalho correto e só linha de exemplo", () => {
    const model = readFileSync("docs/catalogo/modelo-aulas.csv", "utf8");
    assert.deepEqual(parseCsv(model)[0], [...LESSON_CSV_COLUMNS]);
    assert.ok(lessonsFromCsv(model).errors.every((e) => /EXEMPLO/.test(e)));
  });
});
