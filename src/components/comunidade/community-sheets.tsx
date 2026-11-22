"use client";

import { useId, useState } from "react";
import { CircleCheck, EyeOff, Flag, Send, ShieldCheck, Trash2 } from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { COMMUNITY_LIMITS, type CommunityPost } from "@/demo/community";
import { cleanText } from "@/lib/demo/store";
import { REPORT_REASONS, type CommunityReport, type ReportReason } from "@/lib/community/rules";
import { cn } from "@/lib/cn";
import { Avatar, spaceLabel } from "./community-ui";

export type ReportTarget = { postId: string; commentId?: string; label: string };

/** Publicação aberta com comentários. */
export function PostSheet({ post, reports, onClose, onReport }: { post: CommunityPost; reports: CommunityReport[]; onClose: () => void; onReport: (t: ReportTarget) => void }) {
  const { dispatch } = useDemo();
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const max = COMMUNITY_LIMITS.maxCommentLength;
  const inputId = useId();
  const comments = post.comments.filter((c) => !c.hidden || c.author.isMe);
  const reported = (commentId: string) => reports.some((r) => r.target.postId === post.id && r.target.commentId === commentId);

  function send() {
    const text = cleanText(comment, max);
    if (!text) return setError(comment.trim() ? `Use até ${max} caracteres.` : "Escreva um comentário.");
    if (text.length < COMMUNITY_LIMITS.minCommentLength) return setError("Escreva um comentário um pouco maior.");
    dispatch({ type: "comment/add", postId: post.id, body: text });
    setComment("");
  }

  return (
    <Sheet
      title={post.author.name}
      eyebrow={spaceLabel(post.spaceId)}
      onClose={onClose}
      footer={
        <div className="w-full">
          {error ? (
            <p role="alert" id={`${inputId}-err`} className="mb-2 text-sm text-brand">
              {error}
            </p>
          ) : null}
          <div className="flex w-full items-end gap-2">
            <label htmlFor={inputId} className="sr-only">
              Escreva um comentário
            </label>
            <textarea
              id={inputId}
              rows={1}
              value={comment}
              maxLength={max + 50}
              onChange={(e) => {
                setComment(e.target.value);
                setError(null);
              }}
              placeholder="Escreva um comentário…"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${inputId}-err` : undefined}
              className="min-h-11 flex-1 resize-none rounded-2xl border border-line bg-card px-4 py-2.5 text-base text-fg placeholder:text-subtle focus:outline-none focus-visible:outline-2 focus-visible:outline-brand"
            />
            <Button onClick={send} aria-label="Enviar comentário" className="size-11 shrink-0 px-0">
              <Send aria-hidden className="size-4" />
            </Button>
          </div>
        </div>
      }
    >
      <p className="whitespace-pre-line text-[0.95rem] leading-relaxed text-fg">{post.body}</p>
      <h3 className="mt-5 text-sm font-semibold text-fg">Comentários ({comments.length})</h3>
      {comments.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Nenhum comentário ainda. Que tal começar a conversa?</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="flex items-start gap-2.5">
              <Avatar initials={c.author.initials} me={c.author.isMe} team={c.author.isTeam} small />
              <div className={cn("min-w-0 flex-1 rounded-2xl bg-canvas px-3 py-2", c.hidden && "border border-dashed border-line-strong")}>
                <p className="text-xs font-semibold text-fg">{c.author.name}</p>
                {c.hidden ? (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                    <EyeOff aria-hidden className="size-3" /> Oculto pela moderação (simulação): só você vê.
                  </p>
                ) : null}
                <p className="text-sm text-fg">{c.body}</p>
              </div>
              {c.author.isMe ? (
                <button
                  type="button"
                  onClick={() => dispatch({ type: "comment/delete", postId: post.id, commentId: c.id })}
                  aria-label="Excluir meu comentário"
                  className="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-blush hover:text-brand"
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onReport({ postId: post.id, commentId: c.id, label: `Comentário de ${c.author.name}` })}
                  disabled={reported(c.id)}
                  aria-label={reported(c.id) ? `Comentário de ${c.author.name} já denunciado` : `Denunciar comentário de ${c.author.name}`}
                  className="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-blush hover:text-fg disabled:opacity-50"
                >
                  <Flag aria-hidden className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

/** Denúncia: motivo + observação opcional. Registro LOCAL (nada é enviado). */
export function ReportSheet({ target, onClose }: { target: ReportTarget; onClose: () => void }) {
  const { dispatch } = useDemo();
  const [reason, setReason] = useState<ReportReason | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const noteId = useId();

  function submit() {
    if (!reason) return setError("Escolha um motivo.");
    if (reason === "outro" && !note.trim()) return setError("Explique o motivo na observação.");
    if (note.length > COMMUNITY_LIMITS.maxReportNote) return setError(`Use até ${COMMUNITY_LIMITS.maxReportNote} caracteres.`);
    dispatch({ type: "report/add", target: { postId: target.postId, ...(target.commentId ? { commentId: target.commentId } : {}) }, reason, note });
    setDone(true);
  }

  return (
    <Sheet
      title="Denunciar"
      eyebrow={target.label}
      onClose={onClose}
      footer={
        done ? (
          <Button className="flex-1" variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        ) : (
          <Button className="flex-1" onClick={submit}>
            <Flag aria-hidden className="size-4" />
            Registrar denúncia (simulação)
          </Button>
        )
      }
    >
      {done ? (
        <div role="status" className="rounded-xl bg-success-soft p-4 text-sm text-success">
          <p className="flex items-center gap-2 font-semibold">
            <CircleCheck aria-hidden className="size-4" />
            Denúncia registrada nesta demonstração
          </p>
          <p className="mt-1">Nada foi enviado à equipe. Na versão oficial, a moderação analisa cada denúncia.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-fg">Qual é o problema?</legend>
            <div className="space-y-2">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.id}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                    reason === r.id ? "border-brand bg-blush/50" : "border-line bg-card hover:border-brand/30",
                  )}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={r.id}
                    checked={reason === r.id}
                    onChange={() => {
                      setReason(r.id);
                      setError(null);
                    }}
                    className="mt-1 size-4 accent-brand"
                  />
                  <span>
                    <span className="block text-sm font-medium text-fg">{r.label}</span>
                    <span className="block text-xs text-muted">{r.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor={noteId} className="mb-2 block text-sm font-semibold text-fg">
              Observação {reason === "outro" ? "" : "(opcional)"}
            </label>
            <textarea
              id={noteId}
              rows={3}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setError(null);
              }}
              placeholder="Conte o que viu. Não inclua dados pessoais."
              className="w-full resize-none rounded-xl border border-line bg-card px-4 py-3 text-base text-fg placeholder:text-subtle focus:outline-none focus-visible:outline-2 focus-visible:outline-brand"
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-brand">
              {error}
            </p>
          ) : null}
          <p className="text-xs text-muted">Demonstração: a denúncia fica só neste navegador e some ao recarregar. Nada é enviado à equipe.</p>
        </div>
      )}
    </Sheet>
  );
}

const REPORT_STATUS: Record<CommunityReport["status"], { label: string; tone: "warning" | "neutral" | "success" }> = {
  pendente: { label: "Pendente", tone: "warning" },
  mantida: { label: "Mantida", tone: "neutral" },
  ocultada: { label: "Ocultada", tone: "success" },
};

/** Fila de moderação — visível só no papel de moderação (SIMULADO na demo). */
export function ModerationPanel({ posts, reports }: { posts: CommunityPost[]; reports: CommunityReport[] }) {
  const { dispatch } = useDemo();
  const excerpt = (r: CommunityReport) => {
    const p = posts.find((x) => x.id === r.target.postId);
    const text = r.target.commentId ? p?.comments.find((c) => c.id === r.target.commentId)?.body : p?.body;
    return text ? (text.length > 120 ? `${text.slice(0, 117)}…` : text) : "Conteúdo removido";
  };
  return (
    <Card className="border-ink/15 p-4 sm:p-5" aria-labelledby="mod-title">
      <h2 id="mod-title" className="flex items-center gap-2 font-semibold text-fg">
        <ShieldCheck aria-hidden className="size-5 text-brand" />
        Fila de moderação <Badge tone="warning">Simulação</Badge>
      </h2>
      <p className="mt-1 text-xs text-muted">
        Visão de moderação simulada: as decisões mudam só esta demonstração. No app real, só quem tem permissão de moderação (verificada no servidor) vê esta fila.
      </p>
      {reports.length === 0 ? (
        <p className="mt-3 rounded-xl bg-canvas p-3 text-sm text-muted">Nenhuma denúncia registrada nesta sessão.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {reports.map((r) => (
            <li key={r.id} className="rounded-xl border border-line p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge tone={REPORT_STATUS[r.status].tone}>{REPORT_STATUS[r.status].label}</Badge>
                <span className="font-medium text-fg">{REPORT_REASONS.find((x) => x.id === r.reason)?.label}</span>
                <span className="text-muted">· {r.target.commentId ? "comentário" : "publicação"}</span>
              </div>
              <p className="mt-1.5 text-sm text-fg">“{excerpt(r)}”</p>
              {r.note ? <p className="mt-1 text-xs text-muted">Observação: {r.note}</p> : null}
              {r.status === "pendente" ? (
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <Button size="sm" variant="secondary" onClick={() => dispatch({ type: "report/resolve", reportId: r.id, decision: "manter" })}>
                    Manter
                  </Button>
                  <Button size="sm" onClick={() => dispatch({ type: "report/resolve", reportId: r.id, decision: "ocultar" })}>
                    <EyeOff aria-hidden className="size-4" />
                    Ocultar
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
