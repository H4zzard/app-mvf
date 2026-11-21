/**
 * Demo local acessível pelo celular NA MESMA REDE Wi-Fi (sem túnel, sem Internet).
 *
 *   npm run dev:lan                # descobre o IP local e sobe o modo demo nele
 *   npm run dev:lan -- 192.168.0.10  # força um IP específico
 *
 * - Liga MVF_DEMO_MODE=true SÓ neste processo de desenvolvimento (produção ignora a flag).
 * - Sobe o Next com `-H <IP>`: o dev server aceita o próprio host (o celular carrega
 *   JS e interações) sem abrir allowedDevOrigins para outras origens.
 * - Esconde o indicador de dev do Next para não aparecer na gravação.
 * - Aquece as rotas principais para a primeira abertura no celular não ficar lenta.
 * Não use em rede pública. Nenhum segredo é necessário nem enviado ao navegador.
 */
import { networkInterfaces } from "node:os";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

const ROUTES = [
  "/inicio", "/meu-plano", "/onboarding", "/aulas", "/aulas/l-escolher-produto", "/videos-virais", "/estudio-ia",
  "/comunidade", "/marketplace", "/conquistas", "/desafios", "/ranking", "/recompensas", "/materiais",
  "/regras-faq", "/lives", "/suporte", "/perfil", "/minhas-vendas",
];

/** Porta livre a partir da preferida (evita imprimir uma URL errada se a 3000 estiver ocupada). */
function portFree(port) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(port, "0.0.0.0");
  });
}
async function pickPort(start) {
  for (let p = start; p < start + 10; p++) if (await portFree(p)) return p;
  return null;
}

function privateIPv4() {
  const isPrivate = (ip) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
  const all = Object.entries(networkInterfaces()).flatMap(([name, list]) =>
    (list ?? []).filter((i) => i.family === "IPv4" && !i.internal && isPrivate(i.address)).map((i) => ({ name, ip: i.address })),
  );
  return (all.find((i) => i.name === "en0") ?? all[0])?.ip ?? null;
}

const host = process.argv[2] ?? privateIPv4();
if (!host) {
  console.error("✖ Não encontrei um IP de rede local (Wi-Fi). Conecte-se ao Wi-Fi ou informe o IP: npm run dev:lan -- 192.168.x.x");
  process.exit(1);
}

const wanted = Number(process.env.PORT ?? 3000);
const chosen = await pickPort(wanted);
if (!chosen) {
  console.error(`✖ Portas ${wanted}–${wanted + 9} ocupadas. Encerre outro servidor (ex.: npm run dev) e tente de novo.`);
  process.exit(1);
}
if (chosen !== wanted) console.log(`ℹ Porta ${wanted} ocupada (outro servidor rodando?). Usando ${chosen}.`);
const PORT = String(chosen);
const url = `http://${host}:${PORT}`;
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-H", host, "-p", PORT], {
  stdio: ["inherit", "pipe", "pipe"],
  env: { ...process.env, NODE_ENV: "development", MVF_DEMO_MODE: "true", MVF_HIDE_DEV_INDICATOR: "true" },
});

let warmed = false;
let blocked = false;
// O Next 16 recusa um segundo `next dev` na mesma pasta: explica em português e encerra.
const watchConflict = (chunk) => {
  if (blocked || !/Another next dev server is already running/i.test(String(chunk))) return;
  blocked = true;
  const pid = String(chunk).match(/PID:\s*(\d+)/)?.[1];
  console.error(
    `\n✖ Já existe um "npm run dev" rodando nesta pasta${pid ? ` (PID ${pid})` : ""}.` +
      `\n  Encerre-o (Ctrl+C na janela dele${pid ? ` ou: kill ${pid}` : ""}) e rode "npm run dev:lan" de novo.\n`,
  );
  child.kill("SIGINT");
};
child.stderr.on("data", (chunk) => {
  process.stderr.write(chunk);
  watchConflict(chunk);
});
child.stdout.on("data", async (chunk) => {
  process.stdout.write(chunk);
  watchConflict(chunk);
  if (warmed || blocked || !/Ready|ready/.test(String(chunk))) return;
  warmed = true;
  console.log(`\n▶ Aquecendo ${ROUTES.length} rotas (primeira compilação)…`);
  const failed = [];
  for (const r of ROUTES) {
    try {
      const res = await fetch(url + r, { signal: AbortSignal.timeout(120_000) });
      if (!res.ok) failed.push(`${r} (${res.status})`);
    } catch {
      failed.push(`${r} (sem resposta)`);
    }
  }
  if (blocked) return;
  if (failed.length === ROUTES.length) {
    console.error("✖ Nenhuma rota respondeu. Veja as mensagens acima antes de abrir no celular.");
    return;
  }
  if (failed.length) console.log(`⚠ Rotas com problema no aquecimento: ${failed.join(", ")}`);
  console.log(`\n✔ Pronto. No celular (mesma rede Wi-Fi), abra:\n\n   ${url}/inicio\n\n  Modo demo local: dados de exemplo, nada é salvo. Ctrl+C para encerrar.\n`);
});

const stop = () => child.kill("SIGINT");
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code) => process.exit(blocked ? 1 : (code ?? 0)));
