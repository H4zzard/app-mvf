/**
 * Estado de reprodução de uma aula/arquivo a partir da referência de mídia.
 * Módulo PURO. Nunca recebe URL privada: provedores públicos (YouTube/Vimeo)
 * viram URL de incorporação a partir do ID; Kiwify e arquivos próprios exigem
 * integração no servidor (link assinado, só para quem tem acesso) — até lá,
 * o player mostra um estado profissional de “integração pendente”.
 */
import type { ContentAvailability, MediaRef } from "@/types/catalog";

export type PlaybackState =
  | { state: "sem_video" }
  | { state: "em_breve" }
  | { state: "integracao_pendente"; provider: string }
  | { state: "embed"; src: string; provider: "youtube" | "vimeo" };

const SAFE_ID = /^[A-Za-z0-9_-]{4,64}$/;

export function playbackState(media: MediaRef, availability: ContentAvailability): PlaybackState {
  if (availability !== "disponivel") return { state: "em_breve" };
  if (media.kind === "none") return { state: "sem_video" };
  if (media.kind === "proprio") return { state: "integracao_pendente", provider: "arquivo próprio" };
  if (media.provider === "youtube" && SAFE_ID.test(media.ref)) {
    return { state: "embed", provider: "youtube", src: `https://www.youtube-nocookie.com/embed/${media.ref}?rel=0&modestbranding=1` };
  }
  if (media.provider === "vimeo" && /^\d{4,15}$/.test(media.ref)) {
    return { state: "embed", provider: "vimeo", src: `https://player.vimeo.com/video/${media.ref}?dnt=1` };
  }
  return { state: "integracao_pendente", provider: media.provider };
}
