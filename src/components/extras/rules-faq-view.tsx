"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, FileWarning, LifeBuoy, MessagesSquare, SearchX, ShieldCheck, ThumbsDown, ThumbsUp } from "lucide-react";
import { ChipGroup, SearchField } from "@/components/ui/chips";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { DEMO_FAQ_FULL, DEMO_RULES, FAQ_TOPICS, type FaqTopic } from "@/demo/rules";
import { matchesQuery } from "@/lib/demo/filters";
import { cn } from "@/lib/cn";

type Tab = "regras" | "faq" | FaqTopic | "todas";

/** `?secao=` vindo do Perfil, do Início e das Aulas (regras, faq ou um tema do FAQ). */
function tabFromParam(value: string | null): Tab {
  if (value === "regras" || value === "faq") return value;
  if (value && Object.hasOwn(FAQ_TOPICS, value)) return value as FaqTopic;
  return "todas";
}

/**
 * Regras e FAQ (DEMONSTRAÇÃO). Textos demonstrativos PENDENTES DE REVISÃO da
 * equipe: não são regras oficiais nem vinculantes.
 */
export function RulesFaqView() {
  const [query, setQuery] = useState("");
  const secao = useSearchParams().get("secao");
  const [tab, setTab] = useState<Tab>(() => tabFromParam(secao));
  // A tela fica montada (escondida) entre visitas: um novo `?secao=` reabre a seção pedida.
  const [lastSecao, setLastSecao] = useState(secao);
  if (secao !== lastSecao) {
    setLastSecao(secao);
    setTab(tabFromParam(secao));
  }
  const [open, setOpen] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, "sim" | "nao">>({});

  const rules = DEMO_RULES.filter((r) => (tab === "todas" || tab === "regras") && matchesQuery(query, r.title, r.body));
  const faq = DEMO_FAQ_FULL.filter((f) => (tab === "todas" || tab === "faq" || tab === f.topic) && matchesQuery(query, f.question, f.answer));
  const nothing = rules.length === 0 && faq.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Regras & FAQ"
        description="Combinados da comunidade e respostas para as dúvidas mais comuns."
      />

      <p className="flex items-start gap-2.5 rounded-xl border border-warning/25 bg-warning-soft p-3 text-xs text-warning">
        <FileWarning aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          <strong className="font-semibold">Textos em revisão.</strong> Estas orientações são um rascunho para demonstração e ainda não
          foram aprovadas pela equipe. Não são regras oficiais.
        </span>
      </p>

      <div className="space-y-3">
        <SearchField value={query} onChange={setQuery} placeholder="Buscar regra ou pergunta" label="Buscar em regras e FAQ" />
        <ChipGroup
          label="Seções"
          value={tab}
          onChange={setTab}
          options={[
            { value: "todas" as const, label: "Tudo" },
            { value: "regras" as const, label: "Regras" },
            { value: "faq" as const, label: "Perguntas" },
            ...(Object.keys(FAQ_TOPICS) as FaqTopic[]).map((t) => ({ value: t, label: FAQ_TOPICS[t] })),
          ]}
        />
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {rules.length + faq.length} resultados
      </p>

      {nothing ? (
        <EmptyState icon={SearchX} title="Nada encontrado" description="Tente outra palavra ou fale com o suporte." />
      ) : null}

      {rules.length > 0 ? (
        <section aria-labelledby="rules-title" className="space-y-3">
          <h2 id="rules-title" className="flex items-center gap-2 font-serif text-[1.35rem] font-semibold text-fg">
            <ShieldCheck aria-hidden className="size-5 text-brand" />
            Regras da comunidade
          </h2>
          <ol className="grid gap-3 md:grid-cols-2">
            {rules.map((r, i) => (
              <li key={r.id}>
                <Card className="flex h-full gap-3 p-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-blush font-serif text-sm font-semibold text-brand">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-fg">{r.title}</p>
                    <p className="mt-0.5 text-sm text-muted">{r.body}</p>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {faq.length > 0 ? (
        <section aria-labelledby="faq-title" className="space-y-3">
          <h2 id="faq-title" className="font-serif text-[1.35rem] font-semibold text-fg">
            Perguntas frequentes
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card shadow-card">
            {faq.map((f) => {
              const isOpen = open === f.id;
              return (
                <li key={f.id}>
                  <h3>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`faq-a-${f.id}`}
                      onClick={() => setOpen(isOpen ? null : f.id)}
                      className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left text-[0.95rem] font-medium text-fg hover:bg-blush/40"
                    >
                      <span className="flex-1">
                        {f.question}
                        <span className="mt-0.5 block text-xs font-normal text-subtle">{FAQ_TOPICS[f.topic]}</span>
                      </span>
                      <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-muted transition-transform", isOpen && "rotate-180")} />
                    </button>
                  </h3>
                  <div id={`faq-a-${f.id}`} hidden={!isOpen} className="space-y-3 px-4 pb-4">
                    <p className="text-sm text-muted">{f.answer}</p>
                    {feedback[f.id] ? (
                      <p role="status" className="text-xs font-medium text-success">
                        Obrigada pelo retorno!{feedback[f.id] === "nao" ? " Se precisar, fale com o suporte." : ""}
                      </p>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span>Isso ajudou?</span>
                        <button type="button" onClick={() => setFeedback((s) => ({ ...s, [f.id]: "sim" }))} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-line px-3 hover:border-brand/40">
                          <ThumbsUp aria-hidden className="size-3.5" /> Sim
                        </button>
                        <button type="button" onClick={() => setFeedback((s) => ({ ...s, [f.id]: "nao" }))} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-line px-3 hover:border-brand/40">
                          <ThumbsDown aria-hidden className="size-3.5" /> Não
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="help-title" className="space-y-3">
        <h2 id="help-title" className="font-serif text-[1.35rem] font-semibold text-fg">
          Ainda com dúvida?
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/suporte" className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4 shadow-card transition-colors hover:border-brand/30">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blush text-brand">
              <LifeBuoy aria-hidden className="size-5" />
            </span>
            <span>
              <span className="block font-semibold text-fg">Falar com o suporte</span>
              <span className="text-sm text-muted">Central de ajuda e formulário</span>
            </span>
          </Link>
          <Link href="/comunidade" className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4 shadow-card transition-colors hover:border-brand/30">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blush text-brand">
              <MessagesSquare aria-hidden className="size-5" />
            </span>
            <span>
              <span className="block font-semibold text-fg">Perguntar na comunidade</span>
              <span className="text-sm text-muted">Espaço Dúvidas &amp; dicas</span>
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
