import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { BuyerStatus } from "@/lib/auth/login-messages";

/**
 * Verifica, NO SERVIDOR, se o e-mail tem direito de acesso antes de enviar o
 * link mágico (decisão do operador: a tela diz claramente se há compra — D63).
 *
 * - "active": conta Auth com pedido ativo OU papel de equipe.
 * - "inactive": conta existe, mas sem pedido ativo (ex.: reembolsado).
 * - "none": nenhuma conta/compra para este e-mail.
 * - "unavailable": não foi possível verificar (sem chave de serviço ou erro) → falha fechada.
 * Usa a service role (só servidor). Nunca loga o e-mail.
 */
export async function checkBuyerStatus(email: string): Promise<BuyerStatus> {
  const admin = createSupabaseAdminClient();
  if (!admin) return "unavailable";
  try {
    const { data: userId, error } = await admin.rpc("admin_find_user_id_by_email", { p_email: email });
    if (error) throw error;
    if (!userId) return "none";

    const [entitlement, roles] = await Promise.all([
      admin.from("purchase_entitlements").select("order_id").eq("user_id", userId).eq("access_state", "active").limit(1),
      admin.from("user_roles").select("role").eq("user_id", userId).in("role", ["admin", "expert", "support", "moderator"]).limit(1),
    ]);
    if (entitlement.error) throw entitlement.error;
    if (roles.error) throw roles.error;
    return (entitlement.data?.length ?? 0) > 0 || (roles.data?.length ?? 0) > 0 ? "active" : "inactive";
  } catch (e) {
    console.warn("[login] verificação de compra falhou", { code: (e as { code?: string })?.code ?? "sem_codigo" });
    return "unavailable";
  }
}
