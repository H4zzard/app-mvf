/**
 * Fachada de COMPATIBILIDADE da área de membros sobre o catálogo central
 * (`src/lib/catalog`). Mantém os nomes usados pelas telas e testes anteriores;
 * os dados vêm de `src/content/catalogo-oficial.json` + aulas de exemplo.
 * Código novo deve usar `catalog` de `src/lib/catalog/index.ts` diretamente.
 */
import type { OnboardingProfile } from "@/types";
import { catalog } from "../lib/catalog/index.ts";

export const MEMBER_ASSETS = {
  banner: "/area-membros/banner-area-membros.jpg",
  logo: "/area-membros/logo-numi.jpg",
} as const;

export type RailId = string;

export interface MemberRail {
  id: RailId;
  title: string;
  subtitle: string;
}

export interface MemberModule {
  id: string;
  title: string;
  tagline: string;
  cover: string;
  railId: RailId;
  /** Aulas visíveis do módulo, na ordem do catálogo (oficiais ou de exemplo). */
  lessonIds: string[];
  href?: string;
}

const toMember = (m: ReturnType<typeof catalog.modules>[number]): MemberModule => ({
  id: m.id,
  title: m.title,
  tagline: m.tagline,
  cover: m.cover,
  railId: m.railId,
  lessonIds: catalog.lessonsOfModule(m.id).map((l) => l.id),
  ...(m.href ? { href: m.href } : {}),
});

export const MEMBER_RAILS: MemberRail[] = catalog.rails().map(({ id, title, subtitle }) => ({ id, title, subtitle }));
export const MEMBER_MODULES: MemberModule[] = catalog.modules().map(toMember);

export function getModule(id: string): MemberModule | undefined {
  return MEMBER_MODULES.find((m) => m.id === id);
}

export function moduleOfLesson(lessonId: string): MemberModule | undefined {
  const m = catalog.moduleOfLesson(lessonId);
  return m ? getModule(m.id) : undefined;
}

export function modulesOfRail(railId: RailId): MemberModule[] {
  return MEMBER_MODULES.filter((m) => m.railId === railId);
}

export function recommendModules(profile: OnboardingProfile | null | undefined, limit = 6): { modules: MemberModule[]; reason: string } {
  const r = catalog.recommendModules(profile, limit);
  return { modules: r.modules.map((m) => getModule(m.id)).filter((m): m is MemberModule => m !== undefined), reason: r.reason };
}
