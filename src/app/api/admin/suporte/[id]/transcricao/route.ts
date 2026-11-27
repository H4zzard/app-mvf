import { NextResponse, type NextRequest } from "next/server";
import { exportTranscriptForStaff } from "@/lib/support-ai/server";

/**
 * GET /api/admin/suporte/<id>/transcricao — exportação do TXT de um atendimento ENCERRADO.
 * Só equipe com `support:history` (admin/support), conferida no app E no banco, com registro
 * do acesso. 401 sem login, 403 sem permissão (inclusive a própria aluna), 404/409 caso contrário.
 * Resposta privada: sem cache, sem URL pública e sem arquivo guardado fora do banco.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/admin/suporte/[id]/transcricao">) {
  const { id } = await ctx.params;
  const r = await exportTranscriptForStaff(id);
  if (!r.ok) {
    const status = { unauthenticated: 401, forbidden: 403, not_found: 404, not_closed: 409, unavailable: 503 }[r.error];
    return NextResponse.json({ ok: false, error: r.error }, { status, headers: { "cache-control": "no-store" } });
  }
  return new NextResponse(r.text, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="${r.fileName}"`,
      "cache-control": "no-store, private",
      "x-content-type-options": "nosniff",
    },
  });
}
