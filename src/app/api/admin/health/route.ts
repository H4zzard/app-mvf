import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth/viewer";
import { adminRequestStatus } from "@/lib/auth/permissions";
import { loadIntegrationHealth } from "@/lib/admin/integration-health";

/** GET /api/admin/health — 401 sem login, 403 sem permissão, 200 para equipe autorizada. */
export async function GET() {
  const viewer = await getViewer();
  const status = adminRequestStatus(viewer, "integration:read");
  if (status !== 200) {
    return NextResponse.json({ ok: false, error: status === 401 ? "unauthenticated" : "forbidden" }, { status });
  }
  const health = await loadIntegrationHealth();
  if (!health) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  return NextResponse.json({ ok: true, health }, { headers: { "cache-control": "no-store" } });
}
