"use client";

import { useLayoutEffect, useState } from "react";
import { FlaskConical, Lock, LockOpen, MessageCircle, PenSquare, Plus, Radio, SearchX, SlidersHorizontal } from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { ChipGroup, SearchField } from "@/components/ui/chips";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SPACES, type PostKind, type SpaceId } from "@/demo/community";
import { can } from "@/lib/auth/permissions";
import { KIND_LABEL, POST_TEMPLATES, TIER_LABEL, canPostInSpace, rolesForViewAs, spaceAccess, visibleFeed, type MemberTier } from "@/lib/community/rules";
import { likeCount } from "@/lib/demo/store";
import { cn } from "@/lib/cn";
import { PostCard } from "./community-ui";
import { Composer } from "./composer";
import { ModerationPanel, PostSheet, ReportSheet, type ReportTarget } from "./community-sheets";

type ComposerState = null | { mode: "new"; kind?: PostKind } | { mode: "edit"; postId: string };

/**
 * Comunidade (DEMONSTRAÇÃO): perfis e publicações fictícios, sempre marcados.
 * Publicar, comentar, curtir, editar/excluir as PRÓPRIAS publicações, denunciar e
 * moderar (papel simulado) mudam só o estado em memória. Salas Elite+/Icon:
 * bloqueadas, ou liberadas só pela SIMULAÇÃO de plano — nunca autorização real.
 */
export function CommunityView() {
  const { state, dispatch } = useDemo();
  const { tier, viewAs } = state.communitySim;
  const [space, setSpace] = useState<SpaceId | "todos">("todos");
  const [kind, setKind] = useState<PostKind | "todos">("todos");
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [composer, setComposer] = useState<ComposerState>(null);
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  useLayoutEffect(
    () => () => {
      setComposer(null);
      setOpenPostId(null);
      setReportTarget(null);
    },
    [],
  );

  const current = space === "todos" ? null : SPACES.find((s) => s.id === space);
  const locked = current ? spaceAccess(current, tier) === "bloqueado" : false;
  const posts = visibleFeed(state.posts, { space, kind, query }, tier);
  const openPost = state.posts.find((p) => p.id === openPostId);
  const moderating = can([...rolesForViewAs(viewAs)], "community:moderate");
  const myBodies = state.posts.filter((p) => p.author.isMe).map((p) => p.body);
  const filtersOn = kind !== "todos";
  const canPostHere = current ? canPostInSpace(current.id, tier) : true;
  const reported = (postId: string) => state.reports.some((r) => r.target.postId === postId && !r.target.commentId);

  const openComposer = (k?: PostKind) => {
    setStatus(null);
    setComposer({ mode: "new", ...(k ? { kind: k } : {}) });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<DemoBadge label="Comunidade de demonstração" />}
        title="Comunidade MVF"
        description="Troque dúvidas, aprendizados e marcos da sua jornada com outras alunas."
        actions={
          <ButtonLink href="/lives" variant="secondary">
            <Radio aria-hidden className="size-4" />
            Lives e encontros
          </ButtonLink>
        }
      />

      {/* Nova publicação + modelos (atalhos) */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={() => openComposer()}
          aria-haspopup="dialog"
          className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card p-3 text-left shadow-card transition-colors hover:border-brand/30"
        >
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-white">
            EU
          </span>
          <span className="flex-1 text-sm text-muted">Compartilhe algo com a comunidade…</span>
          <PenSquare aria-hidden className="size-5 text-brand" />
        </button>
        <div role="group" aria-label="Começar com um modelo" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
          {POST_TEMPLATES.map((t) => (
            <button
              key={t.kind}
              type="button"
              onClick={() => openComposer(t.kind)}
              aria-haspopup="dialog"
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 text-sm font-medium text-fg hover:border-brand/30 hover:bg-blush"
            >
              <Plus aria-hidden className="size-3.5 text-brand" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {status ? (
        <p role="status" className="rounded-xl bg-success-soft px-3 py-2.5 text-sm text-success">
          {status}
        </p>
      ) : null}

      {/* Espaços */}
      <ChipGroup
        label="Espaços"
        value={space}
        onChange={(v) => {
          setSpace(v);
          setStatus(null);
        }}
        options={[
          { value: "todos" as const, label: "Todos" },
          ...SPACES.map((s) => ({
            value: s.id,
            // `relative`: o texto sr-only (absoluto) fica preso ao chip, sem escapar da rolagem horizontal.
            label: s.restricted ? (
              <span className="relative inline-flex items-center gap-1.5">
                {spaceAccess(s, tier) === "bloqueado" ? <Lock aria-hidden className="size-3.5" /> : <LockOpen aria-hidden className="size-3.5" />}
                {s.restricted}
                <span className="sr-only">{spaceAccess(s, tier) === "bloqueado" ? " (bloqueada)" : " (liberada na simulação)"}</span>
              </span>
            ) : (
              s.label
            ),
          })),
        ]}
      />

      {moderating ? <ModerationPanel posts={state.posts} reports={state.reports} /> : null}

      {locked && current ? (
        <Card className="p-6 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-ink text-white">
            <Lock aria-hidden className="size-5" />
          </span>
          <h2 className="mt-3 font-serif text-xl font-semibold text-fg">{current.label}</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{current.description}</p>
          <p className="mx-auto mt-3 max-w-sm rounded-xl bg-canvas p-3 text-xs text-muted">
            O acesso real será definido pelo seu plano e verificado no servidor. Na demonstração, você pode simular o plano em “Ferramentas da demonstração”, no fim da página.
          </p>
        </Card>
      ) : (
        <>
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <SearchField value={query} onChange={setQuery} placeholder="Buscar na comunidade" label="Buscar publicações" />
            </div>
            <Button
              variant="secondary"
              className="shrink-0 px-3.5"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              aria-controls="filtros-comunidade"
              aria-label={`Filtrar por tipo${filtersOn ? " (1 ativo)" : ""}`}
            >
              <SlidersHorizontal aria-hidden className="size-4" />
              <span className="hidden min-[380px]:inline">Tipo</span>
              {filtersOn ? <span className="grid size-5 place-items-center rounded-full bg-brand text-[0.7rem] text-white">1</span> : null}
            </Button>
          </div>
          {showFilters ? (
            <div id="filtros-comunidade" className="rounded-2xl border border-line bg-card p-3.5">
              <ChipGroup
                label="Tipo de publicação"
                wrap
                value={kind}
                onChange={setKind}
                options={[{ value: "todos" as const, label: "Todos" }, ...(Object.keys(KIND_LABEL) as PostKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))]}
              />
            </div>
          ) : null}

          {current ? (
            <p className="-mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              {current.description}
              {current.restricted ? <Badge tone="warning">Liberada só na simulação</Badge> : null}
              {!current.studentsCanPost ? <Badge tone="neutral">Só a equipe publica aqui</Badge> : null}
            </p>
          ) : null}

          {posts.length === 0 ? (
            <EmptyState
              icon={query || filtersOn ? SearchX : MessageCircle}
              title={query || filtersOn ? "Nenhuma publicação encontrada" : "Nada por aqui ainda"}
              description={query || filtersOn ? "Tente outra palavra ou outro tipo." : canPostHere ? "Seja a primeira a publicar neste espaço." : "Os comunicados aparecem aqui."}
              action={
                query || filtersOn ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery("");
                      setKind("todos");
                    }}
                  >
                    Limpar busca
                  </Button>
                ) : canPostHere ? (
                  <Button onClick={() => openComposer()}>Publicar</Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="space-y-3" aria-label="Publicações">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  liked={state.likes.includes(post.id)}
                  likes={likeCount(state, post)}
                  reported={reported(post.id)}
                  onLike={() => dispatch({ type: "post/like", postId: post.id })}
                  onOpen={() => setOpenPostId(post.id)}
                  onEdit={() => setComposer({ mode: "edit", postId: post.id })}
                  onDelete={() => dispatch({ type: "post/delete", postId: post.id })}
                  onReport={() => setReportTarget({ postId: post.id, label: `Publicação de ${post.author.name}` })}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {/* Simulações da demo: sempre rotuladas, nunca autorização real. */}
      <details className="group rounded-2xl border border-dashed border-line-strong bg-surface p-4">
        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-fg [&::-webkit-details-marker]:hidden">
          <FlaskConical aria-hidden className="size-4 text-brand" />
          Ferramentas da demonstração
          <span className="ml-auto text-xs font-normal text-muted">
            {TIER_LABEL[tier]} · {viewAs === "moderacao" ? "Moderação" : "Aluna"}
          </span>
        </summary>
        <div className="mt-3 space-y-4">
          <p className="text-xs text-muted">
            Simulações para apresentar o app. <strong className="font-semibold text-fg">Não são autorização real</strong>: no app oficial, plano e papel vêm do servidor.
          </p>
          <div>
            <p className="mb-2 text-xs font-semibold text-fg">Simular plano (salas exclusivas)</p>
            <ChipGroup
              label="Simular plano"
              wrap
              value={tier}
              onChange={(t: MemberTier) => dispatch({ type: "community/sim", tier: t })}
              options={(Object.keys(TIER_LABEL) as MemberTier[]).map((t) => ({ value: t, label: TIER_LABEL[t] }))}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-fg">Visualizar como</p>
            <ChipGroup
              label="Visualizar como"
              wrap
              value={viewAs}
              onChange={(v) => dispatch({ type: "community/sim", viewAs: v })}
              options={[
                { value: "aluna" as const, label: "Aluna" },
                { value: "moderacao" as const, label: "Moderação (simulação)" },
              ]}
            />
          </div>
        </div>
      </details>

      {/*
        Celular: publicar sempre à mão, acima da barra inferior. `sticky` (e não `fixed`):
        o shell cria um bloco de contenção que faria um `fixed` herdar a largura errada.
      */}
      <div className="pointer-events-none sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex justify-end lg:hidden">
        <Button onClick={() => openComposer()} aria-haspopup="dialog" className={cn("pointer-events-auto shadow-raised", composer && "invisible")}>
          <PenSquare aria-hidden className="size-4" />
          Publicar
        </Button>
      </div>

      {composer ? (
        <Composer
          key={composer.mode === "edit" ? composer.postId : `new-${composer.kind ?? "livre"}`}
          tier={tier}
          initialSpace={space !== "todos" && canPostInSpace(space, tier) ? space : "duvidas"}
          initialKind={composer.mode === "new" ? composer.kind : undefined}
          post={composer.mode === "edit" ? state.posts.find((p) => p.id === composer.postId) : undefined}
          myBodies={myBodies}
          onClose={() => setComposer(null)}
          onSubmit={(r) => {
            if (composer.mode === "edit") {
              dispatch({ type: "post/edit", postId: composer.postId, body: r.body, link: r.link });
              setStatus("Alterações salvas nesta sessão.");
            } else {
              dispatch({ type: "post/add", spaceId: r.spaceId, body: r.body, kind: r.kind, link: r.link });
              setSpace((s) => (s === "todos" || s === r.spaceId ? s : r.spaceId));
              setKind("todos");
              setQuery("");
              setStatus("Publicado nesta sessão de demonstração. Ninguém mais vê esta publicação.");
            }
            setComposer(null);
          }}
        />
      ) : null}

      {openPost ? <PostSheet post={openPost} reports={state.reports} onClose={() => setOpenPostId(null)} onReport={(t) => setReportTarget(t)} /> : null}
      {reportTarget ? <ReportSheet key={`${reportTarget.postId}-${reportTarget.commentId ?? ""}`} target={reportTarget} onClose={() => setReportTarget(null)} /> : null}
    </div>
  );
}
