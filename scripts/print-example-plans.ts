/**
 * Imprime os planos gerados para os 5 perfis obrigatórios.
 * Uso: npm run plans:examples
 */
import { EXAMPLE_PROFILES } from "../src/demo/example-profiles.ts";
import { buildPlan } from "../src/lib/personalization/engine.ts";

for (const { label, profile } of EXAMPLE_PROFILES) {
  const plan = buildPlan(profile);
  console.log(`\n=== ${label}`);
  console.log(`${plan.title} · ${plan.profileLabel} · ${plan.tasks.length} atividades · ${plan.stages.length} etapas · ${plan.totalDaysSuggested} dias`);
  for (const stage of plan.stages) {
    console.log(`  [${stage.order}] ${stage.title} (dias ${stage.dayRange.start}–${stage.dayRange.end})`);
    for (const t of plan.tasks.filter((x) => x.stageId === stage.id)) {
      const day = t.dayEnd ? `${t.daySuggestion}-${t.dayEnd}` : `${t.daySuggestion}`;
      console.log(`      d${day.padEnd(5)} ${t.type === "lesson" ? "aula" : "ação"} ${String(t.durationMinutes).padStart(3)}min  ${t.id}${t.optional ? " (opcional)" : ""}`);
    }
  }
  for (const tip of plan.tips) console.log(`  dica: ${tip}`);
}
