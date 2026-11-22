/**
 * Marcadores de perfil derivados do onboarding (entrada das recomendações do
 * catálogo). Módulo PURO e determinístico. Preserva as regras de formato:
 * quem quer aparecer, avatar de IA, mãos e produto, narração e explorar.
 */
import type { OnboardingProfile } from "@/types";
import type { ProfileTag } from "@/types/catalog";

const BLOCKER_TAG: Record<OnboardingProfile["mainBlocker"], ProfileTag> = {
  entender_tiktok_shop: "bloqueio_tiktok_shop",
  escolher_produto: "bloqueio_produto",
  gravar: "bloqueio_gravar",
  editar: "bloqueio_editar",
  roteiros: "bloqueio_roteiro",
  organizacao: "bloqueio_organizacao",
};

export function profileTags(profile: OnboardingProfile): ProfileTag[] {
  const tags = new Set<ProfileTag>();
  tags.add(profile.experience === "ja_vendi" ? "experiente" : "iniciante");
  if (profile.wantsToAppear === "sim") tags.add("aparecer");
  if (profile.wantsToAppear === "nao") tags.add("sem_aparecer");
  for (const f of profile.formats) {
    if (f === "avatar_ia") tags.add("avatar_ia");
    if (f === "maos_produto") tags.add("maos_produto");
    if (f === "narracao_imagens") tags.add("narracao");
    if (f === "quero_explorar") tags.add("explorar");
  }
  tags.add(BLOCKER_TAG[profile.mainBlocker]);
  return [...tags];
}

/** Rótulos curtos para explicar a recomendação (“Para o seu perfil: …”). */
export const TAG_LABEL: Partial<Record<ProfileTag, string>> = {
  iniciante: "começando",
  experiente: "já vende",
  aparecer: "vai aparecer nos vídeos",
  sem_aparecer: "sem aparecer",
  avatar_ia: "avatar de IA",
  maos_produto: "mãos e produto",
  narracao: "narração",
  explorar: "explorando formatos",
  bloqueio_produto: "escolha de produto",
  bloqueio_roteiro: "roteiros",
  bloqueio_gravar: "gravação",
  bloqueio_editar: "edição",
  bloqueio_tiktok_shop: "TikTok Shop",
  bloqueio_organizacao: "organização",
};
