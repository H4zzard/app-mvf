/**
 * Ferramentas da Nina (Assistente MVF). Lê `.env.local` (via package.json). Nunca imprime valores de chaves.
 *
 *   npm run nina -- check              # confere a configuração (sem chamar a API)
 *   npm run nina -- ping --yes         # UMA chamada mínima real à DeepSeek (custo de centavos) — só com --yes
 *   npm run nina -- eval --yes         # perguntas de referência na DeepSeek real (várias chamadas) — só com --yes
 *   npm run nina -- docs-status        # guias do app desatualizados (arquivos mudaram desde a revisão)
 *   npm run nina -- docs-stamp         # depois de revisar os guias, grava o carimbo de verificação
 *   npm run nina -- report [pasta]     # cobertura da base (módulos/aulas oficiais, transcrições, aprovados)
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { APP_GUIDES, allRepoKnowledge, coverageReport, guideFingerprint, lessonHref, resolveLessonForSession } from "../src/lib/support-ai/base.ts";
import { providerStatus, readSupportConfig, remoteModelEnabled } from "../src/lib/support-ai/config.ts";
import { decideAutoClose } from "../src/lib/support-ai/decisions.ts";
import { createDeepSeekProvider } from "../src/lib/support-ai/deepseek.ts";
import { generateReply } from "../src/lib/support-ai/engine.ts";
import { parseKnowledgeFile, usableDocuments } from "../src/lib/support-ai/knowledge.ts";
import { GREETINGS } from "../src/lib/support-ai/persona.ts";
import { REFERENCE_CASES, styleProblems, type ReferenceCase } from "../src/lib/support-ai/reference-questions.ts";
import { createMemoryRetriever } from "../src/lib/support-ai/retrieval.ts";
import { createMemoryStore } from "../src/lib/support-ai/store.ts";
import { SUMMARY_PROMPT, SYSTEM_PROMPT, SYSTEM_PROMPT_VERSION } from "../src/lib/support-ai/system-prompt.ts";
import type { KnowledgeDocument } from "../src/lib/support-ai/types.ts";

const [cmd, ...args] = process.argv.slice(2);
const yes = args.includes("--yes");
const STAMP = "src/content/nina/aplicativo.stamp.json";
const config = readSupportConfig();

function fingerprints(): Record<string, string> {
  return Object.fromEntries(APP_GUIDES.map((g) => [g.id, guideFingerprint(g.watch.map((f) => (existsSync(f) ? readFileSync(f, "utf8") : `AUSENTE:${f}`)))]));
}

function deepseek() {
  if (!remoteModelEnabled(config) || !config.deepseek) {
    console.error("✗ DeepSeek não está selecionada ou sem chave. Configure MVF_SUPPORT_PROVIDER=deepseek e DEEPSEEK_API_KEY no .env.local.");
    process.exit(1);
  }
  return createDeepSeekProvider({ ...config.deepseek, maxOutputTokens: config.maxOutputTokens });
}

/** Lê uma pasta de base (mesmo formato do support-kb). Só leitura local. */
function loadFolder(dir: string): KnowledgeDocument[] {
  const walk = (d: string, acc: string[] = []): string[] => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p, acc);
      else if (/\.(md|txt|vtt|srt)$/i.test(f) && !/^LEIA-ME|^modelo/i.test(f)) acc.push(p);
    }
    return acc;
  };
  const docs: KnowledgeDocument[] = [];
  for (const f of walk(resolve(dir))) {
    const r = parseKnowledgeFile(relative(resolve(dir), f), readFileSync(f, "utf8"));
    if (r.ok) docs.push(r.doc);
  }
  return docs;
}

/** Perguntas sobre o conteúdo do curso (só rodam com --base). Esperam que a resposta use a aula certa. */
const COURSE_CASES: ReferenceCase[] = [
  { id: "curso-303030", category: "Curso · método 30-30-30", turns: ["o que é o método 30-30-30?"], expect: { mentionsAny: ["30"] } },
  { id: "curso-cpf", category: "Curso · CPF ou CNPJ", turns: ["é melhor começar com cpf ou cnpj?"], expect: { mentionsAny: ["CPF"] } },
  { id: "curso-punicao", category: "Curso · punição", turns: ["tomei uma punição no tiktok shop, o que eu faço?"], expect: { mentionsAny: ["puni", "recorr", "regra"] } },
  { id: "curso-2mil", category: "Curso · 2 mil seguidores", turns: ["como vendo antes de ter 2 mil seguidores?"], expect: { mentionsAny: ["2 mil", "2.000", "seguidor"] } },
  { id: "curso-naovendi", category: "Curso · não vendi", turns: ["já postei vários vídeos e ainda não vendi nada"], expect: { mentionsAny: ["gancho", "vídeo", "produto"] } },
];

switch (cmd) {
  case "check": {
    const p = providerStatus(config);
    console.log(`Provedor escolhido (MVF_SUPPORT_PROVIDER): ${config.provider}`);
    console.log(`Chave DEEPSEEK_API_KEY: ${config.deepseek ? "presente (valor não exibido)" : "ausente"}`);
    console.log(`Modelo (DEEPSEEK_MODEL): ${config.deepseek?.model ?? "deepseek-flash (padrão)"}`);
    console.log(`Armazenamento (MVF_SUPPORT_STORE): ${config.store}`);
    console.log(`Chat para alunas reais (MVF_SUPPORT_AI_ENABLED): ${config.enabled ? "ligado" : "desligado"}`);
    console.log(`Modo demo (MVF_DEMO_MODE): ${process.env.MVF_DEMO_MODE === "true" ? "ligado" : "desligado"}`);
    console.log(`System prompt: versão ${SYSTEM_PROMPT_VERSION}`);
    console.log(p.ready ? `✓ Pronto: as respostas virão de ${p.kind === "deepseek" ? "DeepSeek (API real)" : "modelo local (sem IA)"}.` : "✗ DeepSeek escolhida, mas falta a chave.");
    process.exit(p.ready ? 0 : 1);
  }
  case "ping": {
    if (!yes) {
      console.log("Isto faz UMA chamada real e paga (centavos) à DeepSeek. Rode de novo com --yes para autorizar.");
      process.exit(0);
    }
    const r = await deepseek().complete([{ role: "user", content: "Responda apenas: ok" }], { userKey: "nina-ping" });
    if (!r.ok) {
      console.error(`✗ DeepSeek respondeu com erro: ${r.error}`);
      process.exit(1);
    }
    console.log(`✓ DeepSeek respondeu. Modelo: ${r.model} · tokens ${r.usage?.input ?? "?"}/${r.usage?.output ?? "?"}`);
    break;
  }
  case "eval": {
    if (!yes) {
      console.log(`Isto roda ${REFERENCE_CASES.length} casos na DeepSeek real (várias chamadas pagas, poucos centavos). Rode com --yes para autorizar.`);
      process.exit(0);
    }
    const provider = deepseek();
    const baseIdx = args.indexOf("--base");
    const extra = baseIdx >= 0 ? loadFolder(args[baseIdx + 1]) : [];
    if (baseIdx >= 0) console.log(`Base extra: ${extra.length} documento(s) de ${args[baseIdx + 1]}\n`);
    const retriever = createMemoryRetriever(usableDocuments([...allRepoKnowledge(), ...extra], { includeDrafts: true, audience: "alunas" }));
    const cases = extra.length ? [...REFERENCE_CASES, ...COURSE_CASES] : REFERENCE_CASES;
    let problems = 0;
    for (const c of cases) {
      if (c.expect.autoClose !== undefined) {
        const ok = decideAutoClose(c.turns.at(-1)!, { handoffRequestedAt: null }, c.turns.slice(0, -1).map((t, i) => ({ id: `${i}`, conversationId: "x", sender: "student" as const, content: t, seq: i + 2, createdAt: new Date().toISOString() }))).close === c.expect.autoClose;
        console.log(`${ok ? "✓" : "✗"} [${c.category}] ${c.turns.at(-1)}`);
        if (!ok) problems++;
        continue;
      }
      const store = createMemoryStore();
      const deps = { store, provider, retriever, systemPrompt: SYSTEM_PROMPT, summaryPrompt: SUMMARY_PROMPT, recentWindow: 12, timeoutMs: config.timeoutMs, lessonHref, resolveLesson: (id: string) => resolveLessonForSession(id, { demo: true }), demo: true, humanChannel: Boolean(process.env.MVF_SUPPORT_CONTACT_URL) };
      const id = (await store.start("eval", "Aluna teste", GREETINGS[0])).conversation.id;
      let last: Awaited<ReturnType<typeof generateReply>> | null = null;
      for (const t of c.turns) {
        await store.appendStudent("eval", id, t, { maxMessagesPerConversation: 30, dailyMessagesPerUser: 999, pendingStaleMs: 60_000 });
        last = await generateReply(deps, "eval", id);
      }
      const issues: string[] = [];
      if (!last?.ok) issues.push(`erro ${last && !last.ok ? last.error : ""}`);
      else {
        const text = last.message.content;
        const ids = (last.message.actions ?? []).map((a) => a.lessonId);
        issues.push(...styleProblems(text));
        if (/[:]/.test(text.replace(/\b\d{1,2}:\d{2}\b/g, ""))) issues.push("dois-pontos (aviso)");
        if (c.expect.lessonAction === "none" && ids.length) issues.push(`botão indevido ${ids}`);
        if (Array.isArray(c.expect.lessonAction) && !ids.some((x) => c.expect.lessonAction!.includes(x))) issues.push(`sem o botão esperado (${c.expect.lessonAction.join("/")})`);
        if (c.expect.handoff && !(last.handoff || /equipe/i.test(text))) issues.push("não ofereceu a equipe");
        if (c.expect.mentionsAny && !c.expect.mentionsAny.some((m) => text.toLowerCase().includes(m.toLowerCase()))) issues.push(`não usou o conteúdo esperado (${c.expect.mentionsAny.join("/")})`);
        if (!process.env.MVF_SUPPORT_CONTACT_URL && /(fala direto com|falar com uma pessoa|canal oficial aparece|(eles|ela|a equipe) (te|vai te|vão te) (ajud|respond|retorn)|foi encaminhad)/i.test(text)) issues.push("prometeu contato/canal que não existe");
        if (text.split(/(?<=[.!?])\s+/).filter((s) => /em prepara[cç][aã]o|Em breve/i.test(s)).length > 1) issues.push("repetiu o aviso de preparação (aviso)");
        console.log(`\n[${c.category}] ${c.turns.at(-1)}\n  ${text.replace(/\n/g, "\n  ")}${ids.length ? `\n  [botões: ${ids.join(", ")}]` : ""}`);
      }
      console.log(issues.length ? `  ✗ ${issues.join(" · ")}` : "  ✓ ok");
      if (issues.some((i) => !i.includes("(aviso)"))) problems++;
    }
    console.log(`\n${cases.length - problems}/${cases.length} casos sem problema.`);
    process.exit(problems ? 1 : 0);
  }
  case "docs-status": {
    const stamp = existsSync(STAMP) ? (JSON.parse(readFileSync(STAMP, "utf8")) as Record<string, string>) : {};
    const now = fingerprints();
    const stale = APP_GUIDES.filter((g) => stamp[g.id] !== now[g.id]);
    for (const g of APP_GUIDES) console.log(`${stale.includes(g) ? "⚠ revisar" : "✓ em dia "}  ${g.id}  (${g.routes.join(", ")})`);
    console.log(stale.length ? `\n${stale.length} guia(s) com arquivos alterados desde a última revisão. Revise o texto em src/content/nina/aplicativo.json e rode docs-stamp.` : "\nTodos os guias estão em dia com o código.");
    process.exit(stale.length ? 1 : 0);
  }
  case "docs-stamp": {
    writeFileSync(STAMP, `${JSON.stringify(fingerprints(), null, 2)}\n`, "utf8");
    console.log(`✓ Carimbo gravado em ${STAMP} (${APP_GUIDES.length} guias).`);
    break;
  }
  case "report": {
    const dir = args.find((a) => !a.startsWith("--"));
    const imported = dir ? loadFolder(dir) : [];
    const r = coverageReport(imported);
    console.log("Cobertura da base da Nina (números reais)");
    console.log(`  Módulos oficiais no catálogo ........ ${r.officialModules}`);
    console.log(`  Aulas oficiais no catálogo .......... ${r.officialLessons}`);
    console.log(`  Aulas oficiais com transcrição ...... ${r.officialLessonsWithTranscript}`);
    console.log(`  Documentos indexáveis ............... ${r.indexedDocuments}${dir ? ` (inclui ${imported.length} da pasta)` : ""}`);
    console.log(`  Aprovados ........................... ${r.approvedDocuments}`);
    console.log(`  Pendentes (rascunho/em revisão) ..... ${r.pendingDocuments}`);
    console.log(`  Guias do app ........................ ${r.appGuides} (${r.appGuidesApproved} aprovados)`);
    if (r.lessonsWithoutTranscript.length) console.log(`  Aulas oficiais sem transcrição: ${r.lessonsWithoutTranscript.join(", ")}`);
    break;
  }
  default:
    console.log("Uso: npm run nina -- check | ping --yes | eval --yes | docs-status | docs-stamp | report [pasta]");
    process.exit(1);
}
