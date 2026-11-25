"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Rolagem ao trocar de página — regra ÚNICA do app (montada uma vez no App Shell).
 *
 * Quem rola é a JANELA (o shell não tem contêiner com overflow; só a lateral do
 * desktop rola por dentro). O padrão do Next mantém a posição quando a nova
 * página ainda “aparece” na viewport, e as telas visitadas ficam vivas no
 * <Activity> — por isso a aluna caía no meio/fim da página seguinte.
 *
 * Regra: mudou o pathname → topo (0), inclusive em voltar/avançar (restauração
 * automática desligada + reforço após o quadro, porque ela chega depois do commit).
 * Exceções:
 *  - primeira carga: o navegador decide (recarregar mantém o comportamento nativo);
 *  - URL com âncora (#…): quem rola é a própria âncora — ex.: “Mapa” na etapa
 *    abre `/meu-plano#no-<etapa>` e o mapa centraliza essa etapa.
 * Filtros, abas e formulários que não mudam o pathname não rolam nada.
 *
 * Roda em layout effect DEPOIS dos efeitos da página e do roteador (é irmão
 * posterior ao <main>), então a decisão final é sempre esta. `behavior: "instant"`
 * ignora o `scroll-behavior: smooth` global para não haver salto animado.
 */
export function ScrollReset() {
  const pathname = usePathname();
  const first = useRef(true);
  const traversal = useRef(false);

  // Voltar/avançar: o navegador (e o roteador) restauram a posição antiga DEPOIS do commit.
  // Desliga a restauração automática e marca a travessia para reforçar o topo após o quadro.
  useEffect(() => {
    const prev = history.scrollRestoration;
    history.scrollRestoration = "manual";
    const onPop = () => (traversal.current = true);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      history.scrollRestoration = prev;
    };
  }, []);

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const wasTraversal = traversal.current;
    traversal.current = false;
    if (window.location.hash) return;
    const top = () => window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    top();
    if (!wasTraversal) return;
    let raf = requestAnimationFrame(() => {
      top();
      raf = requestAnimationFrame(top);
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname]);
  return null;
}

/** Tocar no destino em que a aluna já está (mesmo caminho) volta ao topo — padrão de app. */
export function scrollTopIfSamePath(currentPath: string, href: string) {
  if (currentPath === href) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}
