"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDemo } from "@/components/demo/demo-provider";
import type { RecordingStyle } from "@/lib/studio/contracts";
import { studioProductSeed } from "@/lib/products/studio-bridge";
import type { Product } from "@/lib/products/types";

/**
 * Ações de produto compartilhadas por cards, detalhe e “Meus produtos”.
 * Tudo vive no estado em memória da demo (DemoProvider); nada é gravado.
 */
export function useProductActions() {
  const { state, dispatch } = useDemo();
  const router = useRouter();
  const saved = state.favorites.products;
  const mine = state.productsPromoting;

  const toggleSave = useCallback((id: string) => dispatch({ type: "favorite/toggle", kind: "products", id }), [dispatch]);
  const setPromote = useCallback((id: string, on: boolean) => dispatch({ type: "product/promote", id, on }), [dispatch]);

  /** Abre “Roteiros para Gravar Aparecendo” com o briefing do produto preenchido. */
  const toRecording = useCallback(
    (p: Product, style?: RecordingStyle) => {
      dispatch({ type: "studio/seed", seed: { from: p.name, target: "roteiros", product: studioProductSeed(p), ...(style ? { style } : {}) } });
      router.push("/estudio-ia/roteiros");
    },
    [dispatch, router],
  );

  /** Abre o Animador com nome e características do produto (ficha e fala ficam como estão). */
  const toAnimator = useCallback(
    (p: Product) => {
      dispatch({ type: "studio/seed", seed: { from: p.name, target: "animar", product: studioProductSeed(p) } });
      router.push("/estudio-ia/animar");
    },
    [dispatch, router],
  );

  return { saved, mine, toggleSave, setPromote, toRecording, toAnimator };
}
