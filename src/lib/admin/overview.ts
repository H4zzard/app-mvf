/**
 * Visão geral do painel: SÓ números que existem nos arquivos do projeto.
 * Nada de alunas, receita, vendas, acessos ou visualizações — esses dependem
 * do banco e aparecem como “Aguardando integração”. Módulo PURO.
 */
import { catalog } from "../catalog/index.ts";
import { productCatalog, officialProductsFile } from "../products/index.ts";
import { productGaps } from "../products/schema.ts";
import { eventCatalog } from "../events/index.ts";
import { DEMO_SCRIPTS, OFFICIAL_SCRIPTS } from "../../demo/studio-scripts.ts";
import { CHARACTER_PRESETS, ANIMATION_PRESETS } from "../studio/presets.ts";
import { SUPPORT_CHANNELS } from "../../demo/help-center.ts";

export interface Metric {
  label: string;
  value: number;
  hint?: string;
}

export function contentMetrics(): Metric[] {
  const g = catalog.gaps();
  const official = officialProductsFile.products;
  return [
    { label: "Módulos cadastrados", value: catalog.modules().length },
    { label: "Aulas oficiais", value: g.officialLessons },
    { label: "Aulas de exemplo", value: g.demoLessons, hint: "Saem quando a aula oficial do módulo entrar" },
    { label: "Produtos oficiais", value: official.length },
    { label: "Produtos em rascunho", value: official.filter((p) => p.approval !== "aprovado").length },
    { label: "Roteiros da equipe", value: OFFICIAL_SCRIPTS.filter((s) => s.status === "aprovado").length },
    { label: "Roteiros de exemplo", value: DEMO_SCRIPTS.length },
    { label: "Lives na agenda oficial", value: eventCatalog.official().length },
  ];
}

/** Indicadores que dependem do banco: nunca inventados. */
export const PENDING_INTEGRATION = ["Alunas ativas", "Acessos e progresso", "Vendas e comissões", "Publicações reais da comunidade"];

export interface Pending {
  area: "Cursos e aulas" | "Produtos NUMI" | "Roteiros" | "Lives" | "Suporte";
  text: string;
  href?: string;
}

/** Pendências de conteúdo, a partir dos validadores existentes. */
export function contentPendings(): Pending[] {
  const g = catalog.gaps();
  const out: Pending[] = [];
  if (g.modulesWithoutLessons.length) out.push({ area: "Cursos e aulas", text: `${g.modulesWithoutLessons.length} módulos sem nenhuma aula`, href: "/gestao/cursos" });
  if (g.modulesOnlyDemo.length) out.push({ area: "Cursos e aulas", text: `${g.modulesOnlyDemo.length} módulos só com aulas de exemplo`, href: "/gestao/cursos" });
  if (g.lessonsWithoutVideo.length) out.push({ area: "Cursos e aulas", text: `${g.lessonsWithoutVideo.length} aulas oficiais sem vídeo`, href: "/gestao/cursos" });
  if (g.lessonsWithoutDuration.length) out.push({ area: "Cursos e aulas", text: `${g.lessonsWithoutDuration.length} aulas oficiais sem duração`, href: "/gestao/cursos" });
  if (g.materialsWithoutFile) out.push({ area: "Cursos e aulas", text: `${g.materialsWithoutFile} materiais sem arquivo` });
  for (const p of officialProductsFile.products) {
    const gaps = productGaps(p);
    if (gaps.length) out.push({ area: "Produtos NUMI", text: `${p.name}: falta ${gaps.length} informações (${gaps.slice(0, 3).join(", ")}${gaps.length > 3 ? "…" : ""})`, href: "/gestao/produtos" });
  }
  if (productCatalog.numi().length <= 1) out.push({ area: "Produtos NUMI", text: "Demais produtos NUMI ainda não cadastrados", href: "/gestao/produtos" });
  if (!OFFICIAL_SCRIPTS.length) out.push({ area: "Roteiros", text: "Nenhum roteiro próprio ou autorizado da equipe", href: "/gestao/roteiros" });
  if (!eventCatalog.official().length) out.push({ area: "Lives", text: "Agenda oficial vazia (datas, links e gravações)" });
  if (!SUPPORT_CHANNELS.length) out.push({ area: "Suporte", text: "Canais oficiais de atendimento não informados" });
  return out;
}

/** Grupos de presets do Estúdio (somente leitura nesta etapa). */
import type { PresetOption } from "../studio/presets.ts";

export interface PresetGroup {
  id: string;
  label: string;
  lists: Record<string, readonly PresetOption[]>;
}

export function presetGroups(): PresetGroup[] {
  const C = CHARACTER_PRESETS;
  const A = ANIMATION_PRESETS;
  return [
    { id: "personagem", label: "Personagem", lists: { "Apresentação": C.presentation, "Tom de pele": C.skinTone, Expressão: C.expression, Roupa: C.outfit, Maquiagem: C.makeup, Pose: C.pose } },
    { id: "camera", label: "Câmera e enquadramento", lists: { "Câmera (foto)": C.camera, Lente: C.lens, Enquadramento: C.framing, Formato: C.aspect, "Câmera (vídeo)": A.camera } },
    { id: "iluminacao", label: "Iluminação e cenário", lists: { "Luz (foto)": C.lighting, Cenário: C.setting, "Luz (vídeo)": A.light, "Cenário (vídeo)": A.setting } },
    { id: "estilo", label: "Estilo e acabamento", lists: { Acabamento: C.finish, Cor: C.colorGrade, "Estilo (vídeo)": A.style, Atmosfera: A.atmosphere } },
    { id: "voz", label: "Voz", lists: { "Tom de voz": A.voiceTone, Sotaque: A.voiceAccent, Timbre: A.voiceTimbre } },
  ];
}
