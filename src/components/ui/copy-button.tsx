"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Copia texto para a área de transferência.
 * A Clipboard API só existe em contexto seguro (https/localhost). Ao abrir pelo
 * IP da rede local (http://192.168…), usa o fallback com <textarea> + execCommand.
 * Se nada funcionar, mostra um erro honesto (o texto continua selecionável).
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // cai no fallback
  }
  // Fallback síncrono (ainda dentro do toque da pessoa), necessário em http na rede local.
  const active = document.activeElement as HTMLElement | null;
  const area = document.createElement("textarea");
  try {
    area.value = text;
    area.setAttribute("readonly", "");
    area.setAttribute("aria-hidden", "true");
    // 16 px evita o zoom do iOS; fixo e invisível para não rolar a página.
    Object.assign(area.style, { position: "fixed", top: "0", left: "0", width: "1px", height: "1px", opacity: "0", fontSize: "16px", border: "0", padding: "0" });
    document.body.appendChild(area);
    // iOS Safari exige seleção por Range em elementos somente leitura.
    area.contentEditable = "true";
    const range = document.createRange();
    range.selectNodeContents(area);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    area.select();
    area.setSelectionRange(0, text.length);
    // `true` só quando o navegador confirma a cópia; senão o botão mostra o erro.
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
    window.getSelection()?.removeAllRanges();
    active?.focus?.({ preventScroll: true });
  }
}

export function CopyButton({
  text,
  label = "Copiar",
  onCopied,
  variant = "primary",
  className,
}: {
  text: string;
  label?: string;
  onCopied?: () => void;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "ok" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function handle() {
    const ok = await copyText(text);
    setState(ok ? "ok" : "error");
    if (ok) onCopied?.();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2200);
  }

  return (
    <>
      <Button variant={state === "ok" ? "secondary" : variant} onClick={handle} className={className}>
        {state === "ok" ? <Check aria-hidden className="size-4 text-success" /> : state === "error" ? <TriangleAlert aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
        {state === "ok" ? "Copiado!" : state === "error" ? "Não foi possível copiar" : label}
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {state === "ok" ? "Texto copiado para a área de transferência." : state === "error" ? "Não foi possível copiar. Selecione o texto e copie manualmente." : ""}
      </span>
    </>
  );
}
