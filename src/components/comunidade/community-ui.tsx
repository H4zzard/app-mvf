"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, EyeOff, Flag, Heart, MessageCircle, Pencil, Target, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SPACES, type CommunityPost, type PostLink, type SpaceId } from "@/demo/community";
import { catalog } from "@/lib/catalog";
import { KIND_LABEL } from "@/lib/community/rules";
import { CHALLENGES, MISSIONS } from "@/lib/demo/xp";
import { cn } from "@/lib/cn";

export const spaceLabel = (id: SpaceId) => SPACES.find((s) => s.id === id)?.label ?? id;

/** Rótulo e destino de um vínculo (aula do catálogo ou desafio). null se o alvo não existir mais. */
export function linkTarget(link: PostLink | undefined): { label: string; href: string; icon: typeof BookOpen } | null {
  if (!link) return null;
  if (link.kind === "aula") {
    const l = catalog.getLesson(link.id);
    return l ? { label: l.title, href: `/aulas/${l.id}`, icon: BookOpen } : null;
  }
  const d = [...MISSIONS, ...CHALLENGES].find((x) => x.id === link.id);
  return d ? { label: d.title, href: "/desafios", icon: Target } : null;
}

/** Opções de vínculo para o editor (só o que existe no catálogo e nos desafios). */
export const LINK_OPTIONS = {
  aula: () => catalog.lessons().map((l) => ({ id: l.id, label: l.title })),
  desafio: () => [...MISSIONS, ...CHALLENGES].map((d) => ({ id: d.id, label: d.title })),
};

export function Avatar({ initials, me, team, small }: { initials: string; me?: boolean; team?: boolean; small?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold",
        small ? "size-8 text-xs" : "size-10 text-sm",
        me ? "bg-brand text-paper" : team ? "bg-ink text-paper" : "bg-blush text-brand",
      )}
    >
      {initials}
    </span>
  );
}

export function AuthorLine({ post }: { post: CommunityPost }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm font-semibold text-fg">{post.author.name}</span>
        {post.author.isMe ? <Badge tone="brand">Você</Badge> : null}
      </p>
      <p className="text-xs text-muted">
        {spaceLabel(post.spaceId)}
        {post.author.isMe ? " · agora" : ""}
        {post.edited ? " · editado" : ""}
      </p>
    </div>
  );
}

export function PostCard({
  post,
  liked,
  likes,
  reported,
  onLike,
  onOpen,
  onEdit,
  onDelete,
  onReport,
}: {
  post: CommunityPost;
  liked: boolean;
  likes: number;
  reported: boolean;
  onLike: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const link = linkTarget(post.link);
  const visibleComments = post.comments.filter((c) => !c.hidden || c.author.isMe).length;
  const hidden = post.status === "oculta";
  return (
    <li>
      <Card className={cn("p-4", hidden && "border-dashed opacity-80")}>
        <div className="flex items-start gap-3">
          <Avatar initials={post.author.initials} me={post.author.isMe} team={post.author.isTeam} />
          <AuthorLine post={post} />
          {post.kind && post.kind !== "conversa" ? <Badge tone="brand">{KIND_LABEL[post.kind]}</Badge> : null}
        </div>
        {hidden ? (
          <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-canvas px-3 py-2 text-xs text-muted">
            <EyeOff aria-hidden className="size-3.5" />
            Oculta pela moderação (simulação): só você vê esta publicação.
          </p>
        ) : null}
        <p className="mt-3 whitespace-pre-line text-[0.95rem] leading-relaxed text-fg">{post.body}</p>
        {link ? (
          <Link
            href={link.href}
            className="mt-3 inline-flex min-h-10 max-w-full items-center gap-2 rounded-lg border border-line bg-canvas px-3 text-xs font-medium text-fg hover:border-brand/30 hover:text-brand"
          >
            <link.icon aria-hidden className="size-3.5 shrink-0 text-brand" />
            <span className="truncate">{link.label}</span>
          </Link>
        ) : null}
        <div className="-mx-2 mt-2 flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={onLike}
            aria-pressed={liked}
            aria-label={`${liked ? "Descurtir" : "Curtir"} (${likes} curtidas)`}
            className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors", liked ? "text-brand" : "text-muted hover:bg-blush hover:text-fg")}
          >
            <Heart aria-hidden className={cn("size-[18px]", liked && "fill-brand")} />
            {likes}
          </button>
          <button
            type="button"
            onClick={onOpen}
            aria-haspopup="dialog"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted hover:bg-blush hover:text-fg"
          >
            <MessageCircle aria-hidden className="size-[18px]" />
            {visibleComments}
            <span className="sr-only">comentários, abrir</span>
          </button>
          {post.author.isMe ? (
            <span className="ml-auto flex items-center gap-1">
              {confirmDelete ? (
                <>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={onDelete}>
                    Excluir
                  </Button>
                </>
              ) : (
                <>
                  <button type="button" onClick={onEdit} aria-label="Editar publicação" className="grid size-10 place-items-center rounded-full text-muted hover:bg-blush hover:text-fg">
                    <Pencil aria-hidden className="size-4" />
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(true)} aria-label="Excluir publicação" className="grid size-10 place-items-center rounded-full text-muted hover:bg-blush hover:text-brand">
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </>
              )}
            </span>
          ) : (
            <button
              type="button"
              onClick={onReport}
              disabled={reported}
              aria-haspopup="dialog"
              className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-muted hover:bg-blush hover:text-fg disabled:cursor-default disabled:hover:bg-transparent"
            >
              <Flag aria-hidden className="size-3.5" />
              {reported ? "Denunciada" : "Denunciar"}
            </button>
          )}
        </div>
      </Card>
    </li>
  );
}
