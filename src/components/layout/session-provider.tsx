"use client";

/**
 * Sessão exibida na interface.
 *
 * - "member": dados vindos do servidor (getViewer). Papéis lidos do BANCO;
 *   não há como alterá-los pela interface.
 * - "demo": modo demo local (só development). O seletor de papel muda apenas
 *   o menu e NÃO dá acesso a nada — autorização real é no servidor.
 */
import { createContext, useContext, useMemo, useState } from "react";
import type { User, UserRole } from "@/types";
import { DEMO_USER } from "@/demo/session";

export type ClientViewer =
  | { mode: "demo" }
  | { mode: "member"; displayName: string; initials: string; role: UserRole; roles: UserRole[] };

interface SessionContextValue {
  user: User;
  roles: UserRole[];
  mode: ClientViewer["mode"];
  /** Somente modo demo; no modo real é um no-op. */
  setDemoRole: (role: UserRole) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  children,
  viewer = { mode: "demo" },
}: {
  children: React.ReactNode;
  viewer?: ClientViewer;
}) {
  const [demoRole, setDemoRoleState] = useState<UserRole>(DEMO_USER.role);
  const value = useMemo<SessionContextValue>(() => {
    if (viewer.mode === "member") {
      return {
        mode: "member",
        roles: viewer.roles,
        user: { id: "me", displayName: viewer.displayName, initials: viewer.initials, role: viewer.role, isDemo: false },
        setDemoRole: () => {},
      };
    }
    return {
      mode: "demo",
      roles: [demoRole],
      user: { ...DEMO_USER, role: demoRole },
      setDemoRole: setDemoRoleState,
    };
  }, [viewer, demoRole]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession deve ser usado dentro de <SessionProvider>.");
  return ctx;
}
