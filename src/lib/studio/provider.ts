/**
 * Provedor de geração de TEXTO do Estúdio IA.
 *
 * MVP: só existe o `localDemoTextGenerator` — modelos determinísticos, sem rede,
 * sem chave e sem custo. O provedor DeepSeek (linguagem) está apenas PLANEJADO
 * e ficará exclusivamente no servidor (docs/ESTUDIO_IA.md). Não há endpoint de
 * IA, nem seletor que o habilite: qualquer pedido de provedor remoto cai no local.
 * Módulo puro.
 */
import type { TextGenerationProvider } from "./contracts.ts";
import { buildCharacterPrompt } from "./character.ts";
import { buildAnimationPrompts } from "./animation.ts";
import { buildRecordingScripts } from "./recording-scripts.ts";

export const localDemoTextGenerator: TextGenerationProvider = {
  kind: "demo_local",
  label: "Demonstração · modelo local (sem IA)",
  generateCharacterPrompt: async (brief) => buildCharacterPrompt(brief),
  generateAnimationPrompts: async (brief) => buildAnimationPrompts(brief),
  generateTenRecordingScripts: async (brief) => buildRecordingScripts(brief),
};

/**
 * Seletor de provedor. Na fase atual o remoto está BLOQUEADO: sempre devolve o
 * local, com ou sem pedido. A integração futura muda isto no servidor.
 */
export function getTextProvider(requested: "demo_local" | "deepseek" = "demo_local"): TextGenerationProvider {
  // "deepseek" ainda não existe: fica bloqueado e cai no local.
  void requested;
  return localDemoTextGenerator;
}
