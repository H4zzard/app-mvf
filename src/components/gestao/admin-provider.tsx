"use client";

import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { catalogContext, productExists, productsBase, scriptsBase } from "@/lib/admin/context";
import { createAdminReducer, initialAdminState, pendingCount, validateDraft, type AdminAction, type AdminContext, type AdminState, type DraftKind } from "@/lib/admin/store";

const CTX: AdminContext = { catalog: catalogContext, productsBase: productsBase.products, scriptsBase, productExists };
const reducer = createAdminReducer(CTX);

interface AdminValue {
  state: AdminState;
  dispatch: (a: AdminAction) => void;
  ctx: AdminContext;
  pending: number;
  validate: (kind: DraftKind, data: unknown) => { errors: string[]; missing: string[]; warnings?: string[] };
}

const Ctx = createContext<AdminValue | null>(null);

/**
 * Estado do painel DEMONSTRATIVO: só memória (recarregar descarta tudo).
 * Nada é gravado em arquivo, banco ou armazenamento do navegador.
 */
export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialAdminState());
  const pending = pendingCount(state);

  // Aviso do navegador ao recarregar/fechar com alterações pendentes (elas se perderiam).
  useEffect(() => {
    if (!pending) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);

  const value = useMemo<AdminValue>(
    () => ({ state, dispatch, ctx: CTX, pending, validate: (kind, data) => validateDraft(kind, data, CTX, state) }),
    [state, pending],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdmin(): AdminValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdmin fora do AdminProvider");
  return v;
}
