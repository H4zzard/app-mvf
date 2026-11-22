"use client";

import { useId, useState } from "react";
import { AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chips";
import { Sheet } from "@/components/ui/sheet";
import { COMMUNITY_LIMITS, type CommunityPost, type PostKind, type PostLink, type SpaceId } from "@/demo/community";
import { POST_TEMPLATES, checkPostDraft, postableSpaces, type MemberTier } from "@/lib/community/rules";
import { cn } from "@/lib/cn";
import { LINK_OPTIONS } from "./community-ui";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export interface ComposerResult {
  spaceId: SpaceId;
  body: string;
  kind: PostKind;
  link: PostLink | null;
}

/** Nova publicação (com modelos) ou edição da própria. Tudo fica só nesta sessão. */
export function Composer({
  tier,
  initialSpace,
  initialKind,
  post,
  myBodies,
  onClose,
  onSubmit,
}: {
  tier: MemberTier;
  initialSpace: SpaceId;
  initialKind?: PostKind;
  post?: CommunityPost;
  /** Textos já publicados pela aluna (evita duplicar). */
  myBodies: string[];
  onClose: () => void;
  onSubmit: (r: ComposerResult) => void;
}) {
  const startTemplate = initialKind ? POST_TEMPLATES.find((t) => t.kind === initialKind) : undefined;
  const [kind, setKind] = useState<PostKind>(post?.kind ?? initialKind ?? "conversa");
  const [spaceId, setSpaceId] = useState<SpaceId>(post?.spaceId ?? startTemplate?.space ?? initialSpace);
  const [body, setBody] = useState(post?.body ?? startTemplate?.scaffold ?? "");
  const [linkKind, setLinkKind] = useState<PostLink["kind"] | "">(post ? (post.link?.kind ?? "") : (startTemplate?.suggestLink ?? ""));
  const [linkId, setLinkId] = useState(post?.link?.id ?? "");
  const [errors, setErrors] = useState<{ body?: string; space?: string; link?: string }>({});
  const max = COMMUNITY_LIMITS.maxPostLength;
  const spaces = postableSpaces(tier);
  const template = POST_TEMPLATES.find((t) => t.kind === kind);
  const link: PostLink | null = linkKind && linkId ? { kind: linkKind, id: linkId } : null;
  const check = checkPostDraft({ spaceId, body, kind, link }, tier);
  const ids = { body: useId(), link: useId(), linkItem: useId() };

  function pickTemplate(k: PostKind) {
    const t = POST_TEMPLATES.find((x) => x.kind === k);
    const previous = POST_TEMPLATES.find((x) => x.kind === kind);
    setKind(k);
    // Troca o texto-guia só se a aluna ainda não escreveu nada próprio.
    if (!body.trim() || body === previous?.scaffold) setBody(t?.scaffold ?? "");
    if (t && spaces.some((s) => s.id === t.space)) setSpaceId(t.space);
    if (t?.suggestLink && !linkKind) setLinkKind(t.suggestLink);
    setErrors({});
  }

  function submit() {
    const e: typeof errors = { ...check.errors };
    if (linkKind && !linkId) e.link = "Escolha o item ou remova o vínculo.";
    const n = norm(body);
    if (!e.body && myBodies.some((b) => norm(b) === n) && norm(post?.body ?? "") !== n) e.body = "Você já publicou esse mesmo texto.";
    setErrors(e);
    if (Object.keys(e).length) {
      document.getElementById(e.body ? ids.body : e.link ? ids.linkItem : ids.body)?.focus();
      return;
    }
    onSubmit({ spaceId, body, kind, link });
  }

  const options = linkKind ? LINK_OPTIONS[linkKind]() : [];

  return (
    <Sheet
      title={post ? "Editar publicação" : "Nova publicação"}
      onClose={onClose}
      footer={
        <Button className="flex-1" onClick={submit}>
          <Send aria-hidden className="size-4" />
          {post ? "Salvar alterações" : "Publicar nesta sessão"}
        </Button>
      }
    >
      <div className="space-y-5">
        {!post ? (
          <>
            <div>
              <p className="mb-2 text-sm font-semibold text-fg">Modelo</p>
              <ChipGroup
                label="Modelo de publicação"
                wrap
                value={kind}
                onChange={pickTemplate}
                options={[{ value: "conversa" as PostKind, label: "Livre" }, ...POST_TEMPLATES.map((t) => ({ value: t.kind, label: t.label }))]}
              />
              {template ? <p className="mt-2 text-xs text-muted">{template.hint}</p> : null}
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-fg">Espaço</p>
              <ChipGroup label="Espaço da publicação" wrap value={spaceId} onChange={(v) => (setSpaceId(v), setErrors((x) => ({ ...x, space: undefined })))} options={spaces.map((s) => ({ value: s.id, label: s.label }))} />
              {errors.space ? (
                <p role="alert" className="mt-1.5 text-sm text-brand">
                  {errors.space}
                </p>
              ) : null}
            </div>
          </>
        ) : null}

        <div>
          <label htmlFor={ids.body} className="mb-2 flex items-baseline justify-between text-sm font-semibold text-fg">
            Mensagem
            <span className={cn("text-xs font-normal", body.length > max ? "text-brand" : "text-muted")}>
              {body.length}/{max}
            </span>
          </label>
          <textarea
            id={ids.body}
            rows={5}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setErrors((x) => ({ ...x, body: undefined }));
            }}
            placeholder="Conte uma dúvida, um bastidor ou um marco da sua jornada."
            aria-invalid={errors.body ? true : undefined}
            aria-describedby={errors.body ? `${ids.body}-err` : undefined}
            className="w-full resize-none rounded-xl border border-line bg-card px-4 py-3 text-base text-fg placeholder:text-subtle focus:outline-none focus-visible:outline-2 focus-visible:outline-brand"
          />
          {errors.body ? (
            <p id={`${ids.body}-err`} role="alert" className="mt-1.5 text-sm text-brand">
              {errors.body}
            </p>
          ) : null}
          {check.warnings.map((w) => (
            <p key={w} className="mt-2 flex gap-2 rounded-xl bg-warning-soft p-2.5 text-xs text-warning">
              <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              {w}
            </p>
          ))}
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-fg">Vincular a uma aula ou desafio (opcional)</legend>
          <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-[9rem_minmax(0,1fr)]">
            <label htmlFor={ids.link} className="sr-only">
              Tipo de vínculo
            </label>
            <select
              id={ids.link}
              value={linkKind}
              onChange={(e) => {
                setLinkKind(e.target.value as PostLink["kind"] | "");
                setLinkId("");
                setErrors((x) => ({ ...x, link: undefined }));
              }}
              className="min-h-11 w-full rounded-xl border border-line bg-card px-3 text-base text-fg"
            >
              <option value="">Sem vínculo</option>
              <option value="aula">Aula</option>
              <option value="desafio">Desafio</option>
            </select>
            {linkKind ? (
              <>
                <label htmlFor={ids.linkItem} className="sr-only">
                  {linkKind === "aula" ? "Aula" : "Desafio"}
                </label>
                <select
                  id={ids.linkItem}
                  value={linkId}
                  onChange={(e) => {
                    setLinkId(e.target.value);
                    setErrors((x) => ({ ...x, link: undefined }));
                  }}
                  aria-invalid={errors.link ? true : undefined}
                  className="min-h-11 w-full min-w-0 rounded-xl border border-line bg-card px-3 text-base text-fg"
                >
                  <option value="">{linkKind === "aula" ? "Escolha a aula…" : "Escolha o desafio…"}</option>
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
          </div>
          {errors.link ? (
            <p role="alert" className="text-sm text-brand">
              {errors.link}
            </p>
          ) : null}
        </fieldset>

        <p className="text-xs text-muted">Demonstração: a publicação fica só nesta sessão e não é enviada a ninguém.</p>
      </div>
    </Sheet>
  );
}
