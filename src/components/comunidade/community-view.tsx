"use client";

import { useLayoutEffect, useState } from "react";
import { Heart, Lock, MessageCircle, Pencil, PenSquare, Send, Trash2 } from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { ChipGroup } from "@/components/ui/chips";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Sheet } from "@/components/ui/sheet";
import { COMMUNITY_LIMITS, SPACES, type CommunityPost, type SpaceId } from "@/demo/community";
import { canPostIn, cleanText, likeCount } from "@/lib/demo/store";
import { filterPosts } from "@/lib/demo/filters";
import { cn } from "@/lib/cn";

const spaceLabel = (id: SpaceId) => SPACES.find((s) => s.id === id)?.label ?? id;
const POSTABLE = SPACES.filter((s) => s.studentsCanPost);

/**
 * Comunidade (DEMONSTRAÇÃO): perfis e postagens fictícios, sempre marcados.
 * Curtir, comentar, publicar, editar e excluir as PRÓPRIAS postagens mudam
 * só o estado em memória. Salas Elite+/Icon aparecem bloqueadas (sem RBAC real).
 */
export function CommunityView() {
  const { state, dispatch } = useDemo();
  const [space, setSpace] = useState<SpaceId | "todos">("todos");
  const [composer, setComposer] = useState<null | { mode: "new" } | { mode: "edit"; postId: string }>(null);
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  useLayoutEffect(
    () => () => {
      setComposer(null);
      setOpenPostId(null);
    },
    [],
  );

  const current = space === "todos" ? null : SPACES.find((s) => s.id === space);
  const posts = filterPosts(state.posts, space);
  const openPost = state.posts.find((p) => p.id === openPostId);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<DemoBadge label="Comunidade de demonstração" />}
        title="Comunidade"
        description="Troque dúvidas, bastidores e marcos da sua jornada com outras alunas."
      />

      <button
        type="button"
        onClick={() => setComposer({ mode: "new" })}
        aria-haspopup="dialog"
        className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card p-3 text-left shadow-card transition-colors hover:border-brand/30"
      >
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-blush text-sm font-semibold text-brand">
          EU
        </span>
        <span className="flex-1 text-sm text-muted">Compartilhe algo com a comunidade…</span>
        <PenSquare aria-hidden className="size-5 text-brand" />
      </button>

      <ChipGroup
        label="Espaços"
        value={space}
        onChange={setSpace}
        options={[
          { value: "todos" as const, label: "Todos" },
          ...SPACES.map((s) => ({
            value: s.id,
            label: s.restricted ? (
              <>
                <Lock aria-hidden className="size-3.5" />
                {s.restricted}
              </>
            ) : (
              s.label
            ),
          })),
        ]}
      />

      {current?.restricted ? (
        <Card className="p-6 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-ink text-white">
            <Lock aria-hidden className="size-5" />
          </span>
          <h2 className="mt-3 font-serif text-xl font-semibold text-fg">{current.label}</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{current.description}</p>
          <p className="mx-auto mt-3 max-w-sm rounded-xl bg-canvas p-3 text-xs text-muted">
            Na demonstração, esta sala aparece bloqueada. O acesso real será definido pelo seu plano e verificado no servidor.
          </p>
        </Card>
      ) : (
        <>
          {current ? <p className="-mt-2 text-sm text-muted">{current.description}</p> : null}
          {posts.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="Nada por aqui ainda"
              description={current?.studentsCanPost ? "Seja a primeira a publicar neste espaço." : "Os comunicados aparecem aqui."}
              action={current?.studentsCanPost ? <Button onClick={() => setComposer({ mode: "new" })}>Publicar</Button> : undefined}
            />
          ) : (
            <ul className="space-y-3">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  liked={state.likes.includes(post.id)}
                  likes={likeCount(state, post)}
                  onLike={() => dispatch({ type: "post/like", postId: post.id })}
                  onOpen={() => setOpenPostId(post.id)}
                  onEdit={() => setComposer({ mode: "edit", postId: post.id })}
                  onDelete={() => dispatch({ type: "post/delete", postId: post.id })}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {composer ? (
        <Composer
          key={composer.mode === "edit" ? composer.postId : "new"}
          initialSpace={space !== "todos" && canPostIn(space) ? space : "duvidas"}
          post={composer.mode === "edit" ? state.posts.find((p) => p.id === composer.postId) : undefined}
          onClose={() => setComposer(null)}
          onSubmit={(spaceId, body) => {
            if (composer.mode === "edit") dispatch({ type: "post/edit", postId: composer.postId, body });
            else {
              dispatch({ type: "post/add", spaceId, body });
              setSpace((s) => (s === "todos" || s === spaceId ? s : spaceId));
            }
            setComposer(null);
          }}
        />
      ) : null}

      {openPost ? <PostSheet post={openPost} onClose={() => setOpenPostId(null)} /> : null}
    </div>
  );
}

function Avatar({ initials, me, team }: { initials: string; me?: boolean; team?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold",
        me ? "bg-brand text-white" : team ? "bg-ink text-white" : "bg-blush text-brand",
      )}
    >
      {initials}
    </span>
  );
}

function PostCard({
  post,
  liked,
  likes,
  onLike,
  onOpen,
  onEdit,
  onDelete,
}: {
  post: CommunityPost;
  liked: boolean;
  likes: number;
  onLike: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <li>
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <Avatar initials={post.author.initials} me={post.author.isMe} team={post.author.isTeam} />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-semibold text-fg">{post.author.name}</span>
              {post.author.isMe ? <Badge tone="brand">Você</Badge> : <DemoBadge label="Exemplo" />}
            </p>
            <p className="text-xs text-muted">
              {spaceLabel(post.spaceId)}
              {post.author.isMe ? " · agora" : ""}
              {post.edited ? " · editado" : ""}
            </p>
          </div>
        </div>
        <p className="mt-3 whitespace-pre-line text-[0.95rem] leading-relaxed text-fg">{post.body}</p>
        <div className="-mx-2 mt-2 flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={onLike}
            aria-pressed={liked}
            aria-label={`${liked ? "Descurtir" : "Curtir"} (${likes} curtidas)`}
            className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors", liked ? "text-brand" : "text-muted hover:bg-blush hover:text-fg")}
          >
            <Heart aria-hidden className={cn("size-[18px]", liked && "fill-brand")} />
            {likes}
          </button>
          <button
            type="button"
            onClick={onOpen}
            aria-haspopup="dialog"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted hover:bg-blush hover:text-fg"
          >
            <MessageCircle aria-hidden className="size-[18px]" />
            {post.comments.length}
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
                  <button type="button" onClick={onEdit} aria-label="Editar postagem" className="grid size-10 place-items-center rounded-full text-muted hover:bg-blush hover:text-fg">
                    <Pencil aria-hidden className="size-4" />
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(true)} aria-label="Excluir postagem" className="grid size-10 place-items-center rounded-full text-muted hover:bg-blush hover:text-brand">
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </>
              )}
            </span>
          ) : null}
        </div>
      </Card>
    </li>
  );
}

function Composer({
  initialSpace,
  post,
  onClose,
  onSubmit,
}: {
  initialSpace: SpaceId;
  post?: CommunityPost;
  onClose: () => void;
  onSubmit: (spaceId: SpaceId, body: string) => void;
}) {
  const [spaceId, setSpaceId] = useState<SpaceId>(post?.spaceId ?? initialSpace);
  const [body, setBody] = useState(post?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const max = COMMUNITY_LIMITS.maxPostLength;

  function submit() {
    const text = cleanText(body, max);
    if (!text) return setError(body.trim() ? `Use até ${max} caracteres.` : "Escreva alguma coisa antes de publicar.");
    onSubmit(spaceId, text);
  }

  return (
    <Sheet
      title={post ? "Editar postagem" : "Nova postagem"}
      onClose={onClose}
      footer={
        <Button className="flex-1" onClick={submit}>
          <Send aria-hidden className="size-4" />
          {post ? "Salvar alterações" : "Publicar (simulação)"}
        </Button>
      }
    >
      <div className="space-y-4">
        {!post ? (
          <div>
            <p className="mb-2 text-sm font-semibold text-fg">Espaço</p>
            <ChipGroup label="Espaço da postagem" wrap value={spaceId} onChange={setSpaceId} options={POSTABLE.map((s) => ({ value: s.id, label: s.label }))} />
          </div>
        ) : null}
        <div>
          <label htmlFor="composer-body" className="mb-2 flex items-baseline justify-between text-sm font-semibold text-fg">
            Mensagem
            <span className={cn("text-xs font-normal", body.length > max ? "text-brand" : "text-muted")}>
              {body.length}/{max}
            </span>
          </label>
          <textarea
            id="composer-body"
            rows={5}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setError(null);
            }}
            placeholder="Conte uma dúvida, um bastidor ou um marco da sua jornada."
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "composer-error" : undefined}
            className="w-full resize-none rounded-xl border border-line bg-card px-4 py-3 text-base text-fg placeholder:text-subtle focus:outline-none focus-visible:outline-2 focus-visible:outline-brand"
          />
          {error ? (
            <p id="composer-error" role="alert" className="mt-1.5 text-sm text-brand">
              {error}
            </p>
          ) : null}
        </div>
        <p className="text-xs text-muted">Demonstração: a postagem fica só nesta sessão e não é enviada a ninguém.</p>
      </div>
    </Sheet>
  );
}

function PostSheet({ post, onClose }: { post: CommunityPost; onClose: () => void }) {
  const { dispatch } = useDemo();
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const max = COMMUNITY_LIMITS.maxCommentLength;

  function send() {
    const text = cleanText(comment, max);
    if (!text) return setError(comment.trim() ? `Use até ${max} caracteres.` : "Escreva um comentário.");
    dispatch({ type: "comment/add", postId: post.id, body: text });
    setComment("");
  }

  return (
    <Sheet
      title={post.author.name}
      eyebrow={spaceLabel(post.spaceId)}
      onClose={onClose}
      footer={
        <div className="flex w-full items-end gap-2">
          <label htmlFor="comment-body" className="sr-only">
            Escreva um comentário
          </label>
          <textarea
            id="comment-body"
            rows={1}
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              setError(null);
            }}
            placeholder="Escreva um comentário…"
            aria-invalid={error ? true : undefined}
            className="min-h-11 flex-1 resize-none rounded-2xl border border-line bg-card px-4 py-2.5 text-base text-fg placeholder:text-subtle focus:outline-none focus-visible:outline-2 focus-visible:outline-brand"
          />
          <Button onClick={send} aria-label="Enviar comentário" className="size-11 shrink-0 px-0">
            <Send aria-hidden className="size-4" />
          </Button>
        </div>
      }
    >
      <p className="whitespace-pre-line text-[0.95rem] leading-relaxed text-fg">{post.body}</p>
      <h3 className="mt-5 text-sm font-semibold text-fg">Comentários ({post.comments.length})</h3>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-brand">
          {error}
        </p>
      ) : null}
      {post.comments.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Nenhum comentário ainda.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {post.comments.map((c) => (
            <li key={c.id} className="flex items-start gap-2.5">
              <Avatar initials={c.author.initials} me={c.author.isMe} team={c.author.isTeam} />
              <div className="min-w-0 flex-1 rounded-2xl bg-canvas px-3 py-2">
                <p className="text-xs font-semibold text-fg">{c.author.name}</p>
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
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
