"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUp, CircleAlert, LifeBuoy, LoaderCircle, MessageSquarePlus, PlayCircle, RotateCcw, ShieldCheck, X } from "lucide-react";
import {
  closeConversationAction,
  openLessonAction,
  requestHandoffAction,
  retryReplyAction,
  sendMessageAction,
  startConversationAction,
  type ChatError,
  type ClientMessage,
  type ClosedInfo,
} from "@/app/(app)/suporte/chat/actions";
import { Button } from "@/components/ui/button";
import { ASSISTANT } from "@/lib/support-ai/persona";
import type { ChatAction } from "@/lib/support-ai/types";
import { cn } from "@/lib/cn";

/**
 * Atendimento do Assistente MVF (tela cheia).
 * - Celular: ocupa a área útil; a altura acompanha o teclado (visualViewport),
 *   então o campo de texto nunca fica escondido. A rolagem é só da lista.
 * - Desktop: painel central com largura de leitura.
 * Nada de segredo aqui: o navegador só chama Server Actions.
 * Interface de atendimento: sem provedor, modelo, tokens, ambiente ou arquivos internos.
 * A transcrição é arquivada pelo servidor e NÃO é oferecida para download à aluna.
 */

/** Identidade da ABA no modo demo (some ao recarregar — sem persistência falsa). */
let tabIdMemo: string | null = null;
const tabId = () => (tabIdMemo ??= crypto.randomUUID());

const ERROR_TEXT: Record<ChatError, string> = {
  unauthenticated: "Sua sessão expirou. Entre de novo para continuar.",
  forbidden: "Seu acesso não está ativo no momento.",
  unavailable: "O atendimento não está disponível agora. Tente mais tarde.",
  invalid_tab: "Recarregue a página para iniciar um atendimento.",
  provider_not_configured: "O atendimento não está disponível agora. Tente mais tarde.",
  lesson_unavailable: "Essa aula não está disponível para abrir agora.",
  invalid: "Escreva sua mensagem antes de enviar.",
  too_long: "Sua mensagem ficou longa demais. Tente resumir um pouco.",
  sensitive: "Por segurança, não envie",
  rate_limited: "Calma, só um instantinho antes de mandar a próxima mensagem.",
  busy: "Ainda estou respondendo a sua última mensagem.",
  closed: "Este atendimento foi encerrado.",
  not_found: "Não encontrei este atendimento.",
  conversation_limit: "Este atendimento chegou ao limite de mensagens. Encerre e inicie um novo, se precisar.",
  daily_limit: "Você chegou ao limite de mensagens de hoje. Volte amanhã ou use a Central de ajuda.",
  reply_failed: "Não consegui responder agora.",
  reply_timeout: "A resposta demorou demais.",
  archive_failed: "Não foi possível encerrar o atendimento agora. Nada foi perdido. Tente de novo.",
};

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Recife" });

function useViewportBox() {
  const [box, setBox] = useState<{ height: number; top: number } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setBox({ height: vv.height, top: vv.offsetTop });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return box;
}

type Phase = "starting" | "ready" | "closing" | "closed" | "failed";

export function ChatView() {
  const router = useRouter();
  const [opening, setOpening] = useState<string | null>(null);
  const [pendingClose, setPendingClose] = useState(false);
  const [phase, setPhase] = useState<Phase>("starting");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [text, setText] = useState("");
  const [maxChars, setMaxChars] = useState(1000);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<{ code: ChatError; detail?: string; retry?: boolean } | null>(null);
  const [handoff, setHandoff] = useState<{ topic: string | null; label: string | null; state: "offer" | "sent"; contactUrl: string | null } | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closed, setClosed] = useState<ClosedInfo | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true);
  const box = useViewportBox();

  // A página de trás não rola enquanto o chat está aberto.
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, []);

  const start = useCallback(async () => {
    setPhase("starting");
    setError(null);
    setHandoff(null);
    setClosed(null);
    setConfirmClose(false);
    setPendingClose(false);
    const r = await startConversationAction(tabId());
    if (!r.ok) {
      setError({ code: r.error });
      setPhase("failed");
      return;
    }
    setConversationId(r.conversationId);
    setMessages(r.messages);
    setMaxChars(r.maxChars);
    setPhase("ready");
    stick.current = true;
    requestAnimationFrame(() => input.current?.focus({ preventScroll: true }));
  }, []);

  useEffect(() => {
    // Inicia o atendimento ao abrir a tela (chamada a Server Action; o estado vem da resposta).
    const t = setTimeout(() => void start(), 0);
    return () => clearTimeout(t);
  }, [start]);

  // Rolagem: acompanha novas mensagens se a aluna estiver no fim da lista.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages, waiting, error, handoff, closed, phase]);

  const onScroll = () => {
    const el = scroller.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  async function send() {
    const content = text.trim();
    if (!content || !conversationId || waiting || phase !== "ready") return;
    setError(null);
    const temp: ClientMessage = { id: `tmp-${Date.now()}`, sender: "student", content, createdAt: new Date().toISOString(), seq: Number.MAX_SAFE_INTEGER };
    setMessages((m) => [...m, temp]);
    setText("");
    setWaiting(true);
    stick.current = true;
    const r = await sendMessageAction(tabId(), conversationId, content);
    setWaiting(false);
    if (!r.ok) {
      setMessages((m) => m.filter((x) => x.id !== temp.id));
      setText(content); // nada se perde: o texto volta para o campo
      setError({ code: r.error, detail: r.found?.join(", ") });
      if (r.error === "closed") setPhase("closed");
      return;
    }
    setMessages((m) => [...m.filter((x) => x.id !== temp.id), r.student, ...(r.reply ? [r.reply] : [])]);
    // Encerramento automático decidido pelo servidor (resolução confirmada pela aluna).
    if (r.closed) {
      await finishClosed(r.closed);
      return;
    }
    if (r.closeError) {
      setPhase("closing");
      setPendingClose(true);
      setError({ code: r.closeError });
      return;
    }
    if (r.handoff) setHandoff((h) => h ?? { topic: r.handoff!.topic, label: r.handoff!.label, state: "offer", contactUrl: null });
    if (!r.reply) setError({ code: r.replyError ?? "reply_failed", retry: true });
    requestAnimationFrame(() => input.current?.focus({ preventScroll: true }));
  }

  async function retry() {
    if (!conversationId) return;
    setError(null);
    setWaiting(true);
    const r = await retryReplyAction(tabId(), conversationId);
    setWaiting(false);
    if (!r.ok) return setError({ code: r.error, retry: r.error === "reply_failed" || r.error === "reply_timeout" || r.error === "rate_limited" });
    setMessages((m) => [...m, r.reply]);
  }

  async function askTeam() {
    if (!conversationId) return;
    const r = await requestHandoffAction(tabId(), conversationId, handoff?.topic ?? null);
    if (!r.ok) return setError({ code: r.error });
    setHandoff((h) => ({ topic: h?.topic ?? null, label: h?.label ?? null, state: "sent", contactUrl: r.contactUrl }));
  }

  async function finishClosed(info: ClosedInfo) {
    setClosed(info);
    setPhase("closed");
    setPendingClose(false);
    setHandoff(null);
  }

  async function close() {
    if (!conversationId) return;
    setConfirmClose(false);
    setPhase("closing");
    setError(null);
    const r = await closeConversationAction(tabId(), conversationId);
    if (!r.ok) {
      // Se o encerramento já começou (ex.: automático), continua bloqueado até arquivar.
      setPhase(pendingClose ? "closing" : "ready");
      setError({ code: r.error });
      return;
    }
    await finishClosed(r);
  }

  /** “Abrir aula”: o servidor valida, arquiva o atendimento e só então devolve o destino. */
  async function openLesson(action: ChatAction) {
    if (!conversationId || opening) return;
    setOpening(action.lessonId);
    setError(null);
    const r = await openLessonAction(tabId(), conversationId, action.lessonId);
    setOpening(null);
    if (!r.ok) return setError({ code: r.error });
    await finishClosed(r.closed);
    router.push(r.href);
  }

  const canType = phase === "ready" && !waiting;
  const remaining = maxChars - text.length;

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex h-dvh flex-col bg-canvas"
      style={box ? { height: box.height, transform: `translateY(${box.top}px)` } : undefined}
    >
      {/* Cabeçalho compacto */}
      <header className="flex shrink-0 items-center gap-2 border-b border-line bg-card px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4">
        <Link href="/suporte" aria-label="Voltar para a Central de ajuda" className="grid size-11 shrink-0 place-items-center rounded-lg text-brand hover:bg-blush">
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-fg">{ASSISTANT.name}</h1>
          <p className="truncate text-xs text-muted">Suporte MVF</p>
        </div>
        {phase === "ready" || phase === "closing" ? (
          <Button variant="secondary" size="sm" className="shrink-0 px-3" onClick={() => setConfirmClose(true)} disabled={phase !== "ready" || waiting} aria-haspopup="dialog">
            <span className="max-[359px]:hidden">Encerrar atendimento</span>
            <span className="min-[360px]:hidden">Encerrar</span>
          </Button>
        ) : null}
      </header>

      {/* Painel: tela cheia no celular, coluna central no desktop */}
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col lg:my-6 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-line lg:bg-card lg:shadow-raised">
        <div ref={scroller} onScroll={onScroll} role="log" aria-live="polite" aria-label="Mensagens do atendimento" className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5">
          <p className="mx-auto flex max-w-md items-start gap-2 rounded-lg bg-surface px-3 py-2 text-xs text-muted">
            <ShieldCheck aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            <span>A {ASSISTANT.name} é a assistente virtual do MVF. As conversas podem ser guardadas para suporte e qualidade. Não envie senha, código, CPF ou cartão.</span>
          </p>

          {phase === "starting" ? (
            <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted">
              <LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" /> Abrindo o atendimento…
            </p>
          ) : null}

          {messages.map((m) => (
            <Bubble key={m.id} m={m} onOpenLesson={phase === "ready" ? openLesson : undefined} opening={opening} />
          ))}

          {waiting ? (
            <div className="flex">
              <p className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-line bg-card px-3.5 py-2.5 text-sm text-muted" role="status">
                <span className="flex gap-1" aria-hidden>
                  <span className="size-1.5 rounded-full bg-brand/60 motion-safe:animate-pulse" />
                  <span className="size-1.5 rounded-full bg-brand/60 motion-safe:animate-pulse [animation-delay:150ms]" />
                  <span className="size-1.5 rounded-full bg-brand/60 motion-safe:animate-pulse [animation-delay:300ms]" />
                </span>
                Escrevendo…
              </p>
            </div>
          ) : null}

          {handoff && phase !== "closed" ? (
            <section aria-label="Falar com a equipe" className="rounded-xl border border-brand/30 bg-card p-3.5 text-sm">
              {handoff.state === "offer" ? (
                <>
                  <p className="font-semibold text-fg">{handoff.label ? `${handoff.label}: isso precisa da equipe MVF.` : "Isso precisa da equipe MVF."}</p>
                  <p className="mt-1 text-muted">O assistente não altera conta, matrícula, cobrança ou reembolso.</p>
                  <Button size="sm" className="mt-3" onClick={askTeam}>
                    <LifeBuoy aria-hidden className="size-4" /> Falar com a equipe
                  </Button>
                </>
              ) : handoff.contactUrl ? (
                <p className="text-fg">
                  Pedido registrado neste atendimento. Para falar com a equipe, use o{" "}
                  <a href={handoff.contactUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand underline">
                    canal oficial de atendimento
                  </a>
                  .
                </p>
              ) : (
                <p className="text-fg">Pedido registrado neste atendimento. Os canais oficiais de atendimento humano ainda serão divulgados pela equipe, e nenhum atendente foi acionado agora.</p>
              )}
            </section>
          ) : null}

          {error ? (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-brand/30 bg-blush px-3 py-2.5 text-sm text-fg">
              <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
              <div className="min-w-0 flex-1">
                <p>
                  {ERROR_TEXT[error.code]}
                  {error.code === "sensitive" && error.detail ? `: ${error.detail}. Apague esse dado e envie de novo.` : ""}
                </p>
                {error.retry ? (
                  <button type="button" onClick={retry} className="mt-1.5 inline-flex min-h-10 items-center gap-1.5 font-semibold text-brand hover:underline">
                    <RotateCcw aria-hidden className="size-4" /> Tentar de novo
                  </button>
                ) : null}
                {pendingClose ? (
                  <button type="button" onClick={close} className="mt-1.5 inline-flex min-h-10 items-center gap-1.5 font-semibold text-brand hover:underline">
                    <RotateCcw aria-hidden className="size-4" /> Tentar encerrar de novo
                  </button>
                ) : null}
                {phase === "failed" ? (
                  <button type="button" onClick={start} className="mt-1.5 inline-flex min-h-10 items-center gap-1.5 font-semibold text-brand hover:underline">
                    <RotateCcw aria-hidden className="size-4" /> Tentar abrir de novo
                  </button>
                ) : null}
              </div>
              <button type="button" onClick={() => setError(null)} aria-label="Fechar aviso" className="grid size-9 shrink-0 place-items-center rounded-md text-muted hover:bg-card">
                <X aria-hidden className="size-4" />
              </button>
            </div>
          ) : null}

          {closed ? (
            <section aria-labelledby="closed-title" className="mx-auto max-w-md space-y-3 rounded-xl border border-line bg-card p-4 text-center text-sm">
              <h2 id="closed-title" className="font-semibold text-fg">
                Atendimento encerrado
              </h2>
              <p className="text-muted">Quando precisar de ajuda novamente, estaremos por aqui. 💗</p>
              <Button size="sm" onClick={start}>
                <MessageSquarePlus aria-hidden className="size-4" /> Iniciar nova conversa
              </Button>
            </section>
          ) : null}
        </div>

        {/* Campo de mensagem (fica acima do teclado) */}
        {phase !== "closed" ? (
          <form
            className="shrink-0 border-t border-line bg-card px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <div className="flex items-end gap-2">
              <label htmlFor="chat-input" className="sr-only">
                Sua mensagem
              </label>
              <textarea
                id="chat-input"
                ref={input}
                rows={1}
                value={text}
                maxLength={maxChars}
                disabled={!canType}
                enterKeyHint="send"
                placeholder={phase === "closing" ? "Encerrando…" : "Escreva sua dúvida"}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send();
                  }
                }}
                className="max-h-36 min-h-11 flex-1 resize-none rounded-lg border border-line-strong/80 bg-paper px-3.5 py-2.5 text-base leading-snug text-fg placeholder:text-subtle focus:border-brand/60 focus:outline-none focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-60 [field-sizing:content]"
              />
              <button
                type="submit"
                disabled={!canType || !text.trim()}
                aria-label="Enviar mensagem"
                className="grid size-11 shrink-0 place-items-center rounded-lg bg-brand text-on-wine transition-colors hover:bg-brand-hover disabled:opacity-45"
              >
                {waiting ? <LoaderCircle aria-hidden className="size-5 animate-spin motion-reduce:animate-none" /> : <ArrowUp aria-hidden className="size-5" />}
              </button>
            </div>
            {remaining < 120 ? <p className="mt-1 text-right text-xs text-muted">{remaining} caracteres restantes</p> : null}
          </form>
        ) : null}
      </div>

      {confirmClose ? <ConfirmClose onCancel={() => setConfirmClose(false)} onConfirm={close} /> : null}
    </div>
  );
}

function Bubble({ m, onOpenLesson, opening }: { m: ClientMessage; onOpenLesson?: (a: ChatAction) => void; opening: string | null }) {
  if (m.sender === "system") {
    return <p className="mx-auto max-w-md text-center text-xs text-muted">{m.content}</p>;
  }
  const mine = m.sender === "student";
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] sm:max-w-[75%]")}>
        <div
          className={cn(
            "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[0.95rem] leading-relaxed",
            mine ? "rounded-br-md bg-brand text-on-wine" : "rounded-bl-md border border-line bg-card text-fg",
          )}
        >
          <span className="sr-only">{mine ? "Você: " : `${ASSISTANT.name}: `}</span>
          {m.content}
        </div>
        {m.actions?.length ? (
          <ul className="mt-2 space-y-2" aria-label="Aulas sugeridas">
            {m.actions.map((a) => (
              <li key={a.lessonId} className="flex items-center gap-3 rounded-xl border border-line bg-card p-3 shadow-card">
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-lg bg-wine text-on-wine">
                  <PlayCircle className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-fg">{a.title}</span>
                  {a.moduleTitle ? <span className="block text-xs text-muted">Módulo {a.moduleTitle}</span> : null}
                </span>
                <Button size="sm" className="shrink-0 px-3" disabled={!onOpenLesson || opening !== null} onClick={() => onOpenLesson?.(a)} aria-label={`Abrir aula ${a.title}`}>
                  {opening === a.lessonId ? <LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" /> : null}
                  Abrir aula
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        <p className={cn("mt-1 text-[0.7rem] text-subtle", mine ? "text-right" : "text-left")}>
          <span className="sr-only">{mine ? "Enviada às " : "Recebida às "}</span>
          {timeOf(m.createdAt)}
        </p>
      </div>
    </div>
  );
}

function ConfirmClose({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="close-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl bg-card p-5 text-fg shadow-raised"
    >
      <h2 id="close-title" className="text-lg font-semibold">
        Encerrar atendimento?
      </h2>
      <p className="mt-2 text-sm text-muted">Depois de encerrar, não dá para enviar novas mensagens nesta conversa. Se precisar, é só iniciar uma nova.</p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Continuar conversando
        </Button>
        <Button onClick={onConfirm}>Encerrar</Button>
      </div>
    </dialog>
  );
}
