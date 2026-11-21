/**
 * DEMONSTRAÇÃO — usuária e comunicados fictícios.
 * Nenhum nome ou dado de cliente real. Não há autenticação nesta fase.
 */
import type { Announcement, User } from "@/types";

export const DEMO_USER: User = {
  id: "demo-user",
  displayName: "Aluna Demo",
  initials: "AD",
  role: "student",
  isDemo: true,
};

export const DEMO_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "a-prototipo",
    title: "Você está vendo uma versão de demonstração",
    body:
      "Os dados desta tela são de exemplo e o progresso fica apenas na memória do navegador. Comunicados oficiais da equipe NUMI aparecerão aqui quando a plataforma for conectada.",
    kind: "sistema",
    isDemo: true,
  },
];
