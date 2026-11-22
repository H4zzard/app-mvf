/**
 * Acesso ao painel administrativo DEMONSTRATIVO (/gestao). Módulo PURO.
 *
 * Decisão SEMPRE no servidor (Proxy + layout da rota), nunca por botão escondido,
 * chave na URL ou login fictício. Liberado apenas com `config.adminDemo`
 * (NODE_ENV=development + MVF_DEMO_MODE=true + MVF_ADMIN_DEMO=true).
 * Em qualquer outro caso — produção, homologação, Supabase — a rota responde 404.
 */
import type { AppConfig } from "../config/env.ts";

export const ADMIN_DEMO_PREFIX = "/gestao";

export const isAdminDemoPath = (pathname: string) => pathname === ADMIN_DEMO_PREFIX || pathname.startsWith(`${ADMIN_DEMO_PREFIX}/`);

export function adminDemoAllowed(config: Pick<AppConfig, "adminDemo" | "authMode">): boolean {
  return config.adminDemo === true && config.authMode === "demo";
}

/** O Proxy deve negar (404) esta requisição? */
export function denyAdminDemoRequest(pathname: string, config: Pick<AppConfig, "adminDemo" | "authMode">): boolean {
  return isAdminDemoPath(pathname) && !adminDemoAllowed(config);
}
