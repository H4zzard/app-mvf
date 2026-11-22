"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus } from "lucide-react";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { CommercialRow, ProductCard, ProductVisual } from "@/components/marketplace/product-ui";
import { DEMO_MATERIALS } from "@/demo/materials";
import { catalog } from "@/lib/catalog";
import { AVAILABILITY_LABEL, CATEGORY_LABEL, FORMAT_LABEL, categoryLabel, commercialInfo } from "@/lib/products/display";
import { CONTENT_TAGS, FORMATS } from "@/lib/products/schema";
import type { AffiliationStatus, Availability, CommissionType, ContentTag, Product, ProductCategory, ProductFormat } from "@/lib/products/types";
import { approvalFor, blankProduct, newProductId, statusFromApproval } from "@/lib/admin/products-edit";
import { demoProducts } from "@/lib/admin/context";
import { profileCan } from "@/lib/admin/roles";
import type { EditorialStatus } from "@/lib/content/editorial";
import { useAdmin } from "./admin-provider";
import { AdminPageHeader, CheckboxInput, EditorSheet, FormSection, Issues, LinesInput, PreviewFrame, SelectInput, StatusActions, StatusBadge, TextArea, TextInput } from "./admin-ui";

type Tab = "oficiais" | "demonstrativos";

const num = (s: string) => {
  const n = Number(s.replace(/\s|R\$|%/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return s.trim() && Number.isFinite(n) ? n : NaN;
};
const fmt = (n: number | undefined) => (n === undefined ? "" : String(n).replace(".", ","));

export function ProductsAdminView() {
  const { state, ctx } = useAdmin();
  const [tab, setTab] = useState<Tab>("oficiais");
  const [editing, setEditing] = useState<null | { id: string | null }>(null);
  const [preview, setPreview] = useState<Product | null>(null);
  useLayoutEffect(
    () => () => {
      setEditing(null);
      setPreview(null);
    },
    [],
  );
  const canEdit = profileCan(state.profile, "content:edit");
  const official = useMemo(() => {
    const ids = new Set([...ctx.productsBase.map((p) => p.id), ...Object.keys(state.products)]);
    return [...ids].map((id) => {
      const d = state.products[id];
      const base = ctx.productsBase.find((p) => p.id === id);
      return { product: d?.data ?? base!, status: (d?.status ?? (base ? statusFromApproval(base.approval) : "rascunho")) as EditorialStatus, draft: Boolean(d) };
    });
  }, [ctx, state.products]);
  const demos = demoProducts();

  return (
    <div>
      <AdminPageHeader
        title="Produtos NUMI"
        description="Catálogo central do Marketplace e do Estúdio. Preço, comissão e links só aparecem para as alunas com produto aprovado e verificado."
        actions={
          <Button onClick={() => setEditing({ id: null })} disabled={!canEdit}>
            <Plus aria-hidden className="size-4" /> Novo produto
          </Button>
        }
      />
      <div className="mb-5 max-w-md">
        <Segmented
          label="Origem dos produtos"
          value={tab}
          onChange={setTab}
          options={[
            { value: "oficiais", label: "Oficiais", count: official.length },
            { value: "demonstrativos", label: "Demonstrativos", short: "Demo", count: demos.length },
          ]}
        />
      </div>

      {tab === "oficiais" ? (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-label="Produtos oficiais">
          {official.map(({ product: p, status, draft }) => (
            <li key={p.id}>
              <Card className="flex h-full gap-3 p-3">
                <ProductVisual product={p} className="size-20 shrink-0 rounded-xl" sizes="80px" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-fg">{p.name || "(sem nome)"}</p>
                  <p className="text-xs text-muted">
                    {p.brand} · {categoryLabel(p.category)} · <code>{p.id}</code>
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <StatusBadge status={status} />
                    {draft ? <Badge tone="brand">Editado na sessão</Badge> : null}
                    <Badge tone="neutral">{AVAILABILITY_LABEL[p.availability]}</Badge>
                  </div>
                  <Button size="sm" variant="secondary" className="mt-2" onClick={() => setEditing({ id: p.id })}>
                    <Pencil aria-hidden className="size-4" /> {canEdit ? "Editar" : "Ver"}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <p className="mb-3 rounded-xl bg-canvas p-3 text-sm text-muted">
            Produtos demonstrativos servem só para treino: não são editados no painel e nunca recebem preço, comissão, link ou benefício (o validador recusa).
          </p>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-label="Produtos demonstrativos">
            {demos.map((p) => (
              <li key={p.id}>
                <Card className="flex h-full items-center gap-3 p-3">
                  <ProductVisual product={p} className="size-16 shrink-0 rounded-xl" sizes="64px" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-fg">{p.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <DemoBadge label="Demonstrativo" />
                      <Badge tone="neutral">{AVAILABILITY_LABEL[p.availability]}</Badge>
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setPreview(p)} aria-haspopup="dialog" aria-label={`Prévia de ${p.name}`}>
                    <Eye aria-hidden className="size-4" /> Prévia
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      {editing ? <ProductEditor key={editing.id ?? "novo"} id={editing.id} onClose={() => setEditing(null)} /> : null}
      {preview ? (
        <EditorSheet title={preview.name} eyebrow="Produto demonstrativo · consulta" dirty={false} onClose={() => setPreview(null)} footer={null}>
          <ProductPreview product={preview} />
        </EditorSheet>
      ) : null}
    </div>
  );
}

function ProductPreview({ product }: { product: Product }) {
  const c = commercialInfo(product);
  return (
    <div className="space-y-4">
      <PreviewFrame label="Card no Marketplace">
        <div className="max-w-xs">
          <ProductCard product={product} saved={false} onToggleSave={() => undefined} onCreateScript={() => undefined} />
        </div>
      </PreviewFrame>
      <PreviewFrame label="Página de detalhes (resumo)">
        <div className="space-y-3 text-sm">
          <p className="font-serif text-xl font-semibold text-fg">{product.name || "Nome do produto"}</p>
          {product.description ? <p className="text-fg">{product.description}</p> : <p className="text-muted">Descrição não cadastrada (a seção não aparece para a aluna).</p>}
          {product.howToUse ? <p className="text-fg">Modo de uso: {product.howToUse}</p> : null}
          <CommercialRow product={product} />
          <p className="text-xs text-muted">{c.affiliateUrl || c.productUrl ? "Links oficiais visíveis." : "Link oficial ainda não cadastrado (ou produto não aprovado)."}</p>
        </div>
      </PreviewFrame>
    </div>
  );
}

function ProductEditor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { state, dispatch, ctx, validate } = useAdmin();
  const canEdit = profileCan(state.profile, "content:edit");
  const taken = useMemo(() => new Set([...ctx.productsBase.map((p) => p.id), ...demoProducts().map((p) => p.id), ...Object.keys(state.products)]), [ctx, state.products]);
  const initial = useMemo<Product>(() => (id ? (state.products[id]?.data ?? ctx.productsBase.find((p) => p.id === id)!) : blankProduct("")), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [form, setForm] = useState<Product>(initial);
  const [com, setCom] = useState({
    price: fmt(initial.price?.amount),
    priceDate: initial.price?.verifiedAt ?? "",
    value: fmt(initial.commission?.value),
    type: (initial.commission?.type ?? "percentual") as CommissionType,
    source: initial.commission?.source ?? "",
    date: initial.commission?.verifiedAt ?? "",
  });
  const [imagesText, setImagesText] = useState(initial.images.map((i) => `${i.src} | ${i.alt}`).join("\n"));
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const pid = form.id || newProductId(form.name, taken);
  const images = imagesText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [src, ...alt] = l.split("|").map((x) => x.trim());
      const prev = form.images.find((i) => i.src === src);
      return { src, alt: alt.join(" | "), kind: prev?.kind ?? ("foto" as const) };
    });
  const product: Product = {
    ...form,
    id: pid,
    images,
    price: com.price.trim() || com.priceDate ? ({ amount: num(com.price), currency: "BRL", verifiedAt: com.priceDate } as Product["price"]) : null,
    commission: com.value.trim() || com.source || com.date ? ({ value: num(com.value), type: com.type, source: com.source, verifiedAt: com.date } as Product["commission"]) : null,
  };
  const status = state.products[pid]?.status ?? (ctx.productsBase.some((p) => p.id === pid) ? statusFromApproval(ctx.productsBase.find((p) => p.id === pid)!.approval) : "rascunho");
  const v = validate("produto", product) as { errors: string[]; missing: string[]; warnings?: string[] };
  const current = state.products[pid]?.data ?? ctx.productsBase.find((p) => p.id === pid) ?? null;
  const dirty = JSON.stringify(current) !== JSON.stringify(product);
  const set = <K extends keyof Product>(k: K, val: Product[K]) => {
    setForm((f) => ({ ...f, [k]: val }));
    setSavedMsg(null);
  };
  const setC = (patch: Partial<typeof com>) => {
    setCom((c) => ({ ...c, ...patch }));
    setSavedMsg(null);
  };

  function save() {
    if (v.errors.length) return;
    dispatch({ type: "product/save", product });
    setForm(product);
    setSavedMsg("Salvo no rascunho desta sessão.");
  }

  return (
    <EditorSheet
      title={form.name || "Novo produto"}
      eyebrow={`ID ${pid}`}
      dirty={dirty && canEdit}
      onClose={onClose}
      footer={
        <Button onClick={save} disabled={!canEdit || !dirty || v.errors.length > 0}>
          Salvar rascunho
        </Button>
      }
    >
      <div className="space-y-4">
        {savedMsg ? (
          <p role="status" className="rounded-xl bg-success-soft p-3 text-sm font-medium text-success">
            {savedMsg}
          </p>
        ) : null}
        <Issues errors={v.errors} missing={v.missing} warnings={v.warnings} />

        <FormSection title="Identificação">
          <TextInput label="Nome" required value={form.name} onChange={(t) => set("name", t)} max={60} />
          <TextInput label="Marca" required value={form.brand} onChange={(t) => set("brand", t)} max={40} />
          <SelectInput
            label="Categoria"
            value={(form.category ?? "") as ProductCategory | ""}
            onChange={(c) => set("category", c ? (c as ProductCategory) : null)}
            options={[{ value: "" as ProductCategory | "", label: "A confirmar" }, ...(Object.keys(CATEGORY_LABEL) as ProductCategory[]).map((c) => ({ value: c as ProductCategory | "", label: CATEGORY_LABEL[c] }))]}
          />
          <SelectInput label="Disponibilidade" value={form.availability} onChange={(a) => set("availability", a as Availability)} options={(Object.keys(AVAILABILITY_LABEL) as Availability[]).map((a) => ({ value: a, label: AVAILABILITY_LABEL[a] }))} />
          <CheckboxInput label="Novidade" checked={form.isNew} onChange={(b) => set("isNew", b)} hint="Aparece em “Novidades” no Marketplace." />
        </FormSection>

        <FormSection title="Descrições e uso">
          <TextInput label="Descrição curta (card)" value={form.shortDescription} onChange={(t) => set("shortDescription", t)} max={160} className="sm:col-span-2" />
          <TextArea label="Descrição" value={form.description} onChange={(t) => set("description", t)} max={600} className="sm:col-span-2" />
          <TextArea label="Modo de uso" value={form.howToUse} onChange={(t) => set("howToUse", t)} max={600} className="sm:col-span-2" />
          <LinesInput label="Características" value={form.characteristics} onChange={(x) => set("characteristics", x)} />
          <LinesInput label="Benefícios APROVADOS pela marca" value={form.approvedBenefits} onChange={(x) => set("approvedBenefits", x)} hint="Só o que a marca aprovou. Um por linha." />
          <LinesInput label="Restrições e o que não pode ser dito" value={form.restrictions} onChange={(x) => set("restrictions", x)} className="sm:col-span-2" />
        </FormSection>

        <FormSection title="Imagens (referência)">
          <TextArea
            label="Imagens"
            value={imagesText}
            onChange={(t) => (setImagesText(t), setSavedMsg(null))}
            rows={3}
            hint="Uma por linha: caminho em /public | texto alternativo. Ex.: /produtos/numi-frente.jpg | Frasco visto de frente. Sem URL externa."
            className="sm:col-span-2"
          />
        </FormSection>

        <FormSection title="Comercial (só aparece com produto aprovado)">
          <TextInput label="Preço (R$)" value={com.price} onChange={(t) => setC({ price: t })} placeholder="89,90" />
          <TextInput label="Preço conferido em" type="date" value={com.priceDate} onChange={(t) => setC({ priceDate: t })} />
          <TextInput label="Comissão" value={com.value} onChange={(t) => setC({ value: t })} placeholder="15" />
          <SelectInput label="Tipo de comissão" value={com.type} onChange={(t) => setC({ type: t })} options={[{ value: "percentual", label: "Percentual (%)" }, { value: "valor_fixo", label: "Valor fixo (R$)" }]} />
          <TextInput label="Fonte da comissão" value={com.source} onChange={(t) => setC({ source: t })} hint="De onde veio o número (ex.: painel da marca)." />
          <TextInput label="Comissão conferida em" type="date" value={com.date} onChange={(t) => setC({ date: t })} />
          <SelectInput
            label="Afiliação"
            value={form.affiliation.status}
            onChange={(s) => set("affiliation", { ...form.affiliation, status: s as AffiliationStatus })}
            options={[
              { value: "a_confirmar", label: "A confirmar" },
              { value: "disponivel", label: "Aberta" },
              { value: "nao_disponivel", label: "Fechada no momento" },
            ]}
          />
          <TextArea label="Condições de afiliação (oficiais)" value={form.affiliation.conditions} onChange={(t) => set("affiliation", { ...form.affiliation, conditions: t })} rows={2} max={600} className="sm:col-span-2" />
          <TextInput label="Link de afiliação (https)" value={form.affiliation.affiliateUrl ?? ""} onChange={(t) => set("affiliation", { ...form.affiliation, affiliateUrl: t.trim() || null })} hint="Só quando autorizado pela equipe." />
          <TextInput label="Página oficial do produto (https)" value={form.productUrl ?? ""} onChange={(t) => set("productUrl", t.trim() || null)} />
        </FormSection>

        <FormSection title="Vínculos e conteúdo" defaultOpen={false}>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-sm font-semibold text-fg">Formatos de vídeo</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {FORMATS.map((f) => (
                <CheckboxInput key={f} label={FORMAT_LABEL[f as ProductFormat]} checked={form.formats.includes(f)} onChange={(on) => set("formats", on ? [...form.formats, f] : form.formats.filter((x) => x !== f))} />
              ))}
            </div>
          </fieldset>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-sm font-semibold text-fg">Tags de conteúdo</legend>
            <div className="grid grid-cols-2 gap-2">
              {CONTENT_TAGS.map((t) => (
                <CheckboxInput key={t} label={t} checked={form.contentTags.includes(t)} onChange={(on) => set("contentTags", on ? [...form.contentTags, t as ContentTag] : form.contentTags.filter((x) => x !== t))} />
              ))}
            </div>
          </fieldset>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-sm font-semibold text-fg">Materiais relacionados</legend>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {DEMO_MATERIALS.map((m) => (
                <CheckboxInput key={m.id} label={m.title} checked={form.materialIds.includes(m.id)} onChange={(on) => set("materialIds", on ? [...form.materialIds, m.id] : form.materialIds.filter((x) => x !== m.id))} />
              ))}
            </div>
          </fieldset>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-sm font-semibold text-fg">Aulas relacionadas</legend>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {catalog.lessons().map((l) => (
                <CheckboxInput key={l.id} label={`${l.title}${l.origin === "demonstrativo" ? " (exemplo)" : ""}`} checked={form.lessonIds.includes(l.id)} onChange={(on) => set("lessonIds", on ? [...form.lessonIds, l.id] : form.lessonIds.filter((x) => x !== l.id))} />
              ))}
            </div>
          </fieldset>
        </FormSection>

        <section aria-label="Fluxo editorial" className="rounded-2xl border border-line bg-card p-4">
          <StatusActions kind="produto" id={pid} />
        </section>

        <ProductPreview product={{ ...product, approval: approvalFor(status) }} />
        <p className="text-xs text-muted">A prévia usa o status atual: preço, comissão e links só aparecem quando o produto está aprovado.</p>
      </div>
    </EditorSheet>
  );
}
