/**
 * Contratos do CATÁLOGO de conteúdo (cursos, trilhos, módulos, aulas, materiais).
 *
 * - Fonte oficial: `src/content/catalogo-oficial.json` (validado por `parseCatalogFile`).
 * - Conteúdo demonstrativo: `src/demo/catalog-demo.ts` (sempre `origin: "demonstrativo"`).
 * - Pensado para virar tabelas/painel admin depois: IDs estáveis, ordem explícita,
 *   disponibilidade (publicar/ocultar) e mídia por REFERÊNCIA (nunca URL privada).
 */

/** Origem do dado. “oficial” = fornecido/aprovado pela equipe; “demonstrativo” = exemplo do app. */
export type ContentOrigin = "oficial" | "demonstrativo";

/** Publicação: disponível, visível mas ainda não liberada, ou oculta (não aparece). */
export type ContentAvailability = "disponivel" | "em_breve" | "oculto";

export type LessonLevel = "fundamento" | "intermediario" | "avancado";

/**
 * Marcadores de perfil usados nas recomendações (derivados do onboarding em
 * `profileTags`). “todos” = recomendado para qualquer perfil (peso baixo).
 */
export type ProfileTag =
  | "todos"
  | "iniciante"
  | "experiente"
  | "aparecer"
  | "sem_aparecer"
  | "avatar_ia"
  | "maos_produto"
  | "narracao"
  | "explorar"
  | "bloqueio_produto"
  | "bloqueio_roteiro"
  | "bloqueio_gravar"
  | "bloqueio_editar"
  | "bloqueio_tiktok_shop"
  | "bloqueio_organizacao";

/**
 * Mídia por REFERÊNCIA. A URL de reprodução nunca fica no catálogo: será
 * resolvida no servidor, só para quem tem acesso (ex.: link assinado).
 * - none: ainda sem vídeo.
 * - externo: hospedado em outro serviço (ex.: Kiwify, YouTube não listado, Vimeo).
 * - proprio: arquivo próprio (ex.: Supabase Storage / provedor de vídeo).
 */
export type MediaRef =
  | { kind: "none" }
  | { kind: "externo"; provider: "kiwify" | "youtube" | "vimeo" | "outro"; ref: string }
  | { kind: "proprio"; assetId: string };

export interface CatalogCourse {
  id: string;
  title: string;
  subtitle?: string;
  origin: ContentOrigin;
}

export interface CatalogRail {
  id: string;
  title: string;
  subtitle: string;
  order: number;
}

export interface CatalogModule {
  id: string;
  courseId: string;
  railId: string;
  title: string;
  tagline: string;
  /** Caminho de imagem OFICIAL em /public (ex.: /area-membros/x.png). */
  cover: string;
  order: number;
  origin: ContentOrigin;
  availability: ContentAvailability;
  recommendedFor: ProfileTag[];
  /** Destino próprio quando o módulo é uma área do app (ex.: /lives). */
  href?: string;
}

export interface CatalogLesson {
  id: string;
  moduleId: string;
  title: string;
  order: number;
  /** `null` quando a duração ainda não é conhecida. */
  durationMinutes: number | null;
  level: LessonLevel;
  tags: string[];
  /** IDs de aulas que idealmente vêm antes (só recomendação, não bloqueia). */
  prerequisites: string[];
  summary: string;
  practice: string;
  media: MediaRef;
  materialIds: string[];
  origin: ContentOrigin;
  availability: ContentAvailability;
}

export type MaterialKind = "checklist" | "modelo" | "guia";
export type MaterialCategory = "tiktok-shop" | "roteiros" | "ia" | "produtos" | "numi";

export interface CatalogMaterial {
  id: string;
  title: string;
  kind: MaterialKind;
  category: MaterialCategory;
  description: string;
  lessonId: string | null;
  /** Arquivo por REFERÊNCIA (mesma regra da mídia). `none` = ainda sem arquivo. */
  file: MediaRef;
  origin: ContentOrigin;
}

/** Formato do arquivo oficial (o que a equipe preenche). */
export interface CatalogFile {
  version: number;
  /** Notas de revisão (o que é oficial e o que aguarda confirmação da equipe). */
  review?: string[];
  course: CatalogCourse;
  rails: CatalogRail[];
  modules: CatalogModule[];
  lessons: CatalogLesson[];
  materials: CatalogMaterial[];
  /**
   * Compatibilidade de IDs: ID antigo (usado pelo plano/progresso) → ID novo.
   * Ex.: quando a aula oficial substituir a de exemplo “l-roteiro”.
   */
  lessonAliases: Record<string, string>;
}
