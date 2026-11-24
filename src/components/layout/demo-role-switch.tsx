"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, FlaskConical, RotateCcw } from "lucide-react";
import { useSession } from "@/components/layout/session-provider";
import { useDemo } from "@/components/demo/demo-provider";
import { SCENARIO_OPTIONS, type ScenarioId } from "@/demo/scenarios";
import { cn } from "@/lib/cn";
import type { UserRole } from "@/types";

const ROLE_OPTIONS: { role: UserRole; label: string }[] = [
  { role: "student", label: "Aluna" },
  { role: "admin", label: "Admin" },
];

/**
 * Controles de DEMONSTRAÇÃO (só renderizados no modo demo local):
 * - cenário pronto para gravação (Nova aluna / Aluna com plano / Em evolução);
 * - resetar a demonstração (confirmação em dois toques; só memória);
 * - “visualizar como” (só muda o menu — não é controle de acesso).
 */
export function DemoControls({ onAction }: { onAction?: () => void }) {
  const { user, setDemoRole } = useSession();
  const { scenario, applyScenario, resetAll, persist, setPersist } = useDemo();
  const router = useRouter();
  const [confirmReset, setConfirmReset] = useState(false);

  function pick(id: ScenarioId) {
    applyScenario(id);
    onAction?.();
    router.push("/inicio");
  }

  function reset() {
    if (!confirmReset) return setConfirmReset(true);
    setConfirmReset(false);
    resetAll();
    onAction?.();
    router.push("/inicio");
  }

  return (
    <fieldset className="mvf-light rounded-2xl border border-dashed border-line-strong bg-canvas p-3 text-fg">
      <legend className="flex items-center gap-1 px-1 text-[0.7rem] font-semibold uppercase tracking-wider text-subtle">
        <FlaskConical aria-hidden className="size-3" />
        Controles da demo · só neste dispositivo
      </legend>

      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">
        <Clapperboard aria-hidden className="size-3.5" />
        Cenário para gravação
      </p>
      <div className="grid gap-1.5">
        {SCENARIO_OPTIONS.map((s) => {
          const active = scenario === s.id;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={active}
              onClick={() => pick(s.id)}
              className={cn(
                "flex min-h-11 w-full flex-col items-start justify-center rounded-xl px-3 py-1.5 text-left transition-colors",
                active ? "bg-brand text-white" : "bg-paper text-fg ring-1 ring-line hover:bg-blush",
              )}
            >
              <span className="text-sm font-semibold">{s.label}</span>
              <span className={cn("text-[0.7rem]", active ? "text-white/80" : "text-muted")}>{s.description}</span>
            </button>
          );
        })}
      </div>

      <p className="mb-1.5 mt-3 text-xs font-medium text-muted">Visualizar menu como</p>
      <div className="flex gap-1 rounded-full bg-paper p-1 ring-1 ring-line">
        {ROLE_OPTIONS.map((opt) => {
          const active = user.role === opt.role;
          return (
            <button
              key={opt.role}
              type="button"
              aria-pressed={active}
              onClick={() => setDemoRole(opt.role)}
              className={cn(
                "min-h-9 flex-1 rounded-full text-xs font-semibold transition-colors",
                active ? "bg-ink text-white" : "text-muted hover:text-fg",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-[0.7rem] leading-snug text-muted">Só muda o menu. Não é controle de acesso.</p>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-paper px-3 py-1.5 ring-1 ring-line">
        <span className="text-xs leading-snug text-fg">
          <span className="block font-semibold">Manter ao recarregar</span>
          <span className="text-[0.7rem] text-muted">Só esta aba · dados de exemplo</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={persist}
          aria-label="Manter a demonstração ao recarregar esta aba"
          onClick={() => setPersist(!persist)}
          className="grid min-h-11 min-w-12 shrink-0 place-items-center"
        >
          <span className={cn("relative h-7 w-12 rounded-full transition-colors", persist ? "bg-brand" : "bg-line-strong")}>
            <span className={cn("absolute left-0 top-1 size-5 rounded-full bg-white shadow transition-transform", persist ? "translate-x-6" : "translate-x-1")} />
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={reset}
        onBlur={() => setConfirmReset(false)}
        className={cn(
          "mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold transition-colors",
          confirmReset ? "bg-brand text-white" : "text-fg ring-1 ring-line hover:bg-blush",
        )}
      >
        <RotateCcw aria-hidden className="size-3.5" />
        {confirmReset ? "Toque de novo para confirmar o reset" : "Resetar demonstração"}
      </button>
    </fieldset>
  );
}

/** Compatibilidade: nome antigo usado na sidebar. */
export const DemoRoleSwitch = DemoControls;
