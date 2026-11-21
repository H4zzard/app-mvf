import { type NextRequest, NextResponse } from "next/server";
import { readConfig } from "@/lib/config/env";
import { handleKiwifyWebhook } from "@/lib/kiwify/webhook";
import { getAccessStore, getKiwifyApi } from "@/lib/kiwify/server";

/**
 * POST /api/webhooks/kiwify?signature=<hmac>
 * Chamado pela Kiwify (sem login). Autenticidade pela assinatura HMAC-SHA1
 * do corpo cru. Não loga payload nem dados pessoais.
 */
export async function POST(request: NextRequest) {
  const rawBody = new Uint8Array(await request.arrayBuffer());
  const config = readConfig();
  const store = getAccessStore();
  if (!store) {
    // Sem banco/service role: não aceitar nada (a Kiwify vai reenviar depois).
    return NextResponse.json({ ok: false, result: "storage_not_configured" }, { status: 503 });
  }
  try {
    const res = await handleKiwifyWebhook(rawBody, request.nextUrl.searchParams.get("signature"), {
      tokens: config.kiwify.webhookTokens,
      allowedProductIds: config.kiwify.allowedProductIds,
      store,
      api: getKiwifyApi(),
    });
    console.info("[kiwify-webhook]", { status: res.status, result: res.body.result });
    return NextResponse.json(res.body, { status: res.status });
  } catch {
    // Falha ao registrar: responder erro para a Kiwify tentar de novo.
    console.error("[kiwify-webhook] falha interna");
    return NextResponse.json({ ok: false, result: "internal_error" }, { status: 500 });
  }
}
