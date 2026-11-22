import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { readConfig } from "@/lib/config/env";
import { isPrivatePath } from "@/lib/auth/return-to";
import { NOT_FOUND_REWRITE, isUnknownDetailPath } from "@/lib/routing/unknown-detail";
import { denyAdminDemoRequest } from "@/lib/admin/access";

/** Aula/produto inexistente → 404 real (reescrita para um caminho sem rota). */
function notFoundResponse(request: NextRequest, base?: NextResponse): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = NOT_FOUND_REWRITE;
  url.search = "";
  const res = NextResponse.rewrite(url, { status: 404 });
  if (base) for (const c of base.cookies.getAll()) res.cookies.set(c);
  return res;
}

/**
 * Proxy (Next 16): renova a sessão Supabase e faz a PRÉ-FILTRAGEM otimista
 * (sem sessão em rota privada → /login). NÃO é a autorização: o direito de
 * acesso é checado no servidor (layout, Server Actions, Route Handlers) e na RLS.
 */
export async function proxy(request: NextRequest) {
  const config = readConfig();
  // Painel demonstrativo (/gestao): fora do ambiente local permitido, não existe (404), em qualquer modo.
  if (denyAdminDemoRequest(request.nextUrl.pathname, config)) return notFoundResponse(request);
  if (config.authMode !== "supabase" || !config.supabase) {
    return isUnknownDetailPath(request.nextUrl.pathname) ? notFoundResponse(request) : NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.supabase.url, config.supabase.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  // Não colocar código entre a criação do cliente e getClaims (renovação da sessão).
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const { pathname } = request.nextUrl;
  if (!signedIn && isPrivatePath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/") url.searchParams.set("returnTo", pathname);
    const redirect = NextResponse.redirect(url);
    // Preserva cookies e cabeçalhos de cache definidos na renovação.
    for (const c of response.cookies.getAll()) redirect.cookies.set(c);
    for (const h of ["cache-control", "expires", "pragma"]) {
      const v = response.headers.get(h);
      if (v) redirect.headers.set(h, v);
    }
    return redirect;
  }
  // Só depois da pré-filtragem: quem não entrou continua indo para /login.
  if (isUnknownDetailPath(pathname)) return notFoundResponse(request, response);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
