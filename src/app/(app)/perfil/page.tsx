import type { Metadata } from "next";
import { ProfileView } from "@/components/extras/profile-view";

/**
 * Perfil — central de conta, evolução e ajuda (destino fixo da navegação).
 * Disponível para todas as contas: só mostra dados confirmados pela sessão.
 * As partes demonstrativas (preferências simuladas, controles da demo) só
 * aparecem com a demo ou a prévia autorizada no servidor.
 */
export const metadata: Metadata = { title: "Perfil" };

export default function Page() {
  return <ProfileView />;
}
