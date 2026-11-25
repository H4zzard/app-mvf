"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronDown,
  CircleCheck,
  Clapperboard,
  FileText,
  GraduationCap,
  KeyRound,
  LifeBuoy,
  MessageSquareText,
  PenLine,
  SearchX,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { ChipGroup, SearchField } from "@/components/ui/chips";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { HELP_FAQ, HELP_PROBLEMS, HELP_SHORTCUTS, SUPPORT_CHANNELS, type HelpShortcut } from "@/demo/help-center";
import { relatedLearning } from "@/lib/support/related";
import { rankHelp } from "@/lib/support/search";
import {
  TICKET_CATEGORY_LABEL,
  TICKET_LIMITS,
  TICKET_STATUS_LABEL,
  sensitiveFindings,
  validateTicket,
  type SupportTicket,
  type TicketCategory,
  type TicketErrors,
} from "@/lib/support/tickets";
import { cn } from "@/lib/cn";

type Topic = HelpShortcut["topic"];
const ICONS: Record<Topic, typeof KeyRound> = { acesso: KeyRound, aulas: GraduationCap, "tiktok-shop": ShoppingBag, conteudo: Clapperboard, estudio: Sparkles };
const CATEGORIES = Object.keys(TICKET_CATEGORY_LABEL) as TicketCategory[];
const FAQ_PREVIEW = 6;

/**
 * Central de Ajuda (DEMONSTRAÇÃO). Perguntas e problemas comuns sobre o USO do
 * app, aulas relacionadas do catálogo atual e solicitações que ficam como
 * rascunho ou simulação — nunca “recebidas pela equipe”.
 */
export function SupportView() {
  const { state } = useDemo();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<Topic | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<SupportTicket | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [allFaq, setAllFaq] = useState(false);
  const [openProblem, setOpenProblem] = useState<string | null>(null);

  const searching = query.trim().length > 0;
  const faq = useMemo(() => {
    const base = topic ? HELP_FAQ.filter((f) => f.topic === topic) : HELP_FAQ;
    return searching ? rankHelp(query, base, (f) => [f.question, f.answer]) : base;
  }, [query, topic, searching]);
  const problems = useMemo(() => {
    const base = topic ? HELP_PROBLEMS.filter((p) => p.topic === topic) : HELP_PROBLEMS;
    return searching ? rankHelp(query, base, (p) => [p.title, p.steps.join(" ")]) : base;
  }, [query, topic, searching]);
  const related = useMemo(() => (topic || searching ? relatedLearning(query, topic) : { lessons: [], materials: [] }), [query, topic, searching]);
  const shortcut = HELP_SHORTCUTS.find((s) => s.topic === topic);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={<DemoBadge label="Central de ajuda de exemplo" />} title="Central de ajuda" description="Encontre a resposta rápido ou prepare uma solicitação para a equipe." />

      <SearchField value={query} onChange={setQuery} placeholder="Ex.: não consigo entrar, vídeo da aula, comissão" label="Buscar na central de ajuda" />

      <section aria-labelledby="sup-temas">
        <h2 id="sup-temas" className="sr-only">
          Temas
        </h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {HELP_SHORTCUTS.map((s) => {
            const Icon = ICONS[s.topic];
            const on = topic === s.topic;
            return (
              <li key={s.topic} className={cn(s.topic === "estudio" && "col-span-2 sm:col-span-1")}>
                <button
                  type="button"
                  onClick={() => setTopic(on ? null : s.topic)}
                  aria-pressed={on}
                  className={cn(
                    "flex h-full min-h-16 w-full items-center gap-2.5 rounded-2xl border p-3 text-left transition-colors",
                    on ? "border-brand bg-blush/60" : "border-line bg-card shadow-card hover:border-brand/30",
                  )}
                >
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", on ? "bg-brand text-paper" : "bg-blush text-brand")}>
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-tight text-fg">{s.label}</span>
                    <span className="mt-0.5 block text-[0.7rem] leading-tight text-muted">{s.description}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {topic ? (
          <button type="button" onClick={() => setTopic(null)} className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted hover:text-brand">
            <X aria-hidden className="size-4" />
            Ver todos os temas
          </button>
        ) : null}
      </section>

      {problems.length ? (
        <section aria-labelledby="sup-problemas" className="space-y-3">
          <h2 id="sup-problemas" className="font-serif text-xl font-semibold text-fg">
            Problemas comuns
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card shadow-card">
            {problems.map((p) => {
              const open = openProblem === p.id || (searching && problems.length === 1);
              return (
                <li key={p.id}>
                  <h3>
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={`pb-${p.id}`}
                      onClick={() => setOpenProblem(open ? null : p.id)}
                      className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left text-[0.95rem] font-semibold text-fg hover:bg-blush/40"
                    >
                      <LifeBuoy aria-hidden className="size-4 shrink-0 text-brand" />
                      <span className="flex-1">{p.title}</span>
                      <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-muted transition-transform", open && "rotate-180")} />
                    </button>
                  </h3>
                  <div id={`pb-${p.id}`} hidden={!open} className="px-4 pb-4">
                    <ol className="space-y-1.5 text-sm text-fg">
                      {p.steps.map((st, i) => (
                        <li key={st} className="flex gap-2">
                          <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-full bg-blush text-[0.7rem] font-semibold text-brand">
                            {i + 1}
                          </span>
                          {st}
                        </li>
                      ))}
                    </ol>
                    {p.links.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {p.links.map((l) => (
                          <Link key={l.href} href={l.href} className="inline-flex min-h-10 items-center rounded-lg border border-line-strong px-3.5 text-sm font-semibold text-fg hover:border-brand/40 hover:bg-blush">
                            {l.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="sup-faq" className="space-y-3">
        <h2 id="sup-faq" className="font-serif text-xl font-semibold text-fg">
          Perguntas frequentes {shortcut ? <span className="text-base font-normal text-muted">· {shortcut.label}</span> : null}
        </h2>
        {faq.length === 0 ? (
          <EmptyState icon={SearchX} title="Nenhuma resposta encontrada" description="Tente outras palavras ou prepare uma solicitação abaixo." />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card shadow-card">
            {(searching || topic || allFaq ? faq : faq.slice(0, FAQ_PREVIEW)).map((f) => {
              const open = openId === f.id;
              return (
                <li key={f.id}>
                  <h3>
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={`faq-${f.id}`}
                      onClick={() => setOpenId(open ? null : f.id)}
                      className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left text-[0.95rem] font-medium text-fg hover:bg-blush/40"
                    >
                      <span className="flex-1">{f.question}</span>
                      <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-muted transition-transform", open && "rotate-180")} />
                    </button>
                  </h3>
                  <div id={`faq-${f.id}`} hidden={!open} className="px-4 pb-4 text-sm text-muted">
                    {f.answer}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-x-4">
          {!searching && !topic && !allFaq && faq.length > FAQ_PREVIEW ? (
            <button type="button" onClick={() => setAllFaq(true)} className="inline-flex min-h-10 items-center text-sm font-semibold text-brand hover:underline">
              Ver todas as perguntas ({faq.length})
            </button>
          ) : null}
          <Link href="/regras-faq" className="inline-flex min-h-10 items-center text-sm font-semibold text-brand hover:underline">
            Regras & FAQ completas
          </Link>
        </div>
      </section>

      <RelatedBlock related={related} title="Aulas e materiais que podem ajudar" />

      <TicketForm
        key={`${formKey}-${editing?.id ?? "novo"}`}
        initial={editing}
        topic={topic}
        onDone={() => {
          setEditing(null);
          setFormKey((k) => k + 1);
        }}
      />

      <TicketList tickets={state.supportTickets} onEdit={(t) => setEditing(t)} />

      <Card className="p-5" aria-labelledby="sup-canais">
        <h2 id="sup-canais" className="flex items-center gap-2 font-semibold text-fg">
          <MessageSquareText aria-hidden className="size-5 text-brand" />
          Canais oficiais de atendimento
        </h2>
        {SUPPORT_CHANNELS.length ? (
          <ul className="mt-3 space-y-2 text-sm">
            {SUPPORT_CHANNELS.map((c) => (
              <li key={c.href}>
                <a href={c.href} className="font-semibold text-brand hover:underline">
                  {c.label}: {c.value}
                </a>
                {c.hours ? <span className="block text-xs text-muted">{c.hours}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">A equipe ainda vai informar os canais oficiais (e horários) de atendimento. Até lá, use as respostas desta central.</p>
        )}
      </Card>
    </div>
  );
}

function RelatedBlock({ related, title }: { related: ReturnType<typeof relatedLearning>; title: string }) {
  if (!related.lessons.length && !related.materials.length) return null;
  return (
    <section aria-label={title} className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="text-sm font-semibold text-fg">{title}</h2>
      <ul className="mt-2 space-y-1">
        {related.lessons.map((l) => (
          <li key={l.id}>
            <Link href={`/aulas/${l.id}`} className="flex min-h-10 items-center gap-2 text-sm font-medium text-fg hover:text-brand">
              <BookOpen aria-hidden className="size-4 shrink-0 text-brand" />
              {l.title}
              {l.origin === "demonstrativo" ? <span className="text-xs font-normal text-muted">(exemplo)</span> : null}
            </Link>
          </li>
        ))}
        {related.materials.map((m) => (
          <li key={m.id}>
            <Link href="/materiais" className="flex min-h-10 items-center gap-2 text-sm font-medium text-fg hover:text-brand">
              <FileText aria-hidden className="size-4 shrink-0 text-brand" />
              {m.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Formulário de solicitação: rascunho ou SIMULAÇÃO de envio (nada é enviado). */
function TicketForm({ initial, topic, onDone }: { initial: SupportTicket | null; topic: Topic | null; onDone: () => void }) {
  const { state, dispatch } = useDemo();
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [picked, setPicked] = useState<TicketCategory | "">(initial?.category ?? "");
  // O atalho de tema escolhido acima já sugere a categoria (até a aluna escolher outra).
  const category: TicketCategory | "" = picked || topic || "";
  const setCategory = setPicked;
  const [description, setDescription] = useState(initial?.description ?? "");
  const [errors, setErrors] = useState<TicketErrors>({});
  const [result, setResult] = useState<null | "rascunho" | "simulado">(null);
  const ids = { subject: useId(), description: useId() };
  const sensitive = sensitiveFindings(`${subject} ${description}`);
  const suggestions = useMemo(() => (description.trim().length >= 12 ? relatedLearning(`${subject} ${description}`, category || null, 2) : null), [subject, description, category]);

  const focusFirst = (e: TicketErrors) => {
    const id = e.subject ? ids.subject : e.category ? "ticket-category" : e.description ? ids.description : null;
    if (id) document.getElementById(id)?.focus();
  };

  /** Salva (ou atualiza) o rascunho e devolve o id. */
  function saveDraft(strict: boolean): string | null {
    const all = validateTicket({ subject, category, description });
    // Rascunho: aceita texto incompleto, mas nunca dados sensíveis, categoria vazia ou texto acima do limite.
    const e: TicketErrors = strict
      ? all
      : Object.fromEntries(Object.entries(all).filter(([k, m]) => k === "category" || m?.startsWith("Remova") || m?.startsWith("Use até")));
    if (!strict && !subject.trim() && !description.trim()) e.description = "Escreva algo antes de salvar o rascunho.";
    setErrors(e);
    if (Object.keys(e).length) {
      focusFirst(e);
      return null;
    }
    if (!initial && state.supportTickets.length >= TICKET_LIMITS.maxTickets) {
      setErrors({ description: "Limite de solicitações desta demonstração atingido. Exclua alguma da lista." });
      return null;
    }
    dispatch({ type: "ticket/save", ...(initial ? { id: initial.id } : {}), draft: { subject, category, description } });
    return initial?.id ?? `ticket-${state.seq + 1}`;
  }

  if (result) {
    return (
      <Card className="p-5 sm:p-6">
        <div role="status" className={cn("rounded-xl p-4 text-sm", result === "simulado" ? "bg-success-soft text-success" : "bg-canvas text-fg")}>
          <p className="flex items-center gap-2 font-semibold">
            <CircleCheck aria-hidden className="size-4" />
            {result === "simulado" ? "Envio simulado" : "Rascunho salvo nesta sessão"}
          </p>
          <p className="mt-1">
            {result === "simulado"
              ? "Nenhuma mensagem foi enviada e a equipe não recebeu esta solicitação. Na versão oficial, ela chega ao suporte e você acompanha o status aqui."
              : "O rascunho fica só neste navegador e some ao recarregar a página."}
          </p>
        </div>
        <Button variant="secondary" size="sm" className="mt-3" onClick={onDone}>
          Nova solicitação
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-6" aria-labelledby="support-form-title">
      <CardHeader
        titleId="support-form-title"
        title={initial ? "Editar rascunho" : "Fale com a equipe"}
        description="Demonstração: você pode salvar um rascunho ou simular o envio. Nada é enviado."
        action={<LifeBuoy aria-hidden className="size-5 text-brand" />}
      />
      <div className="mt-4 space-y-4">
        <p className="flex items-start gap-2 rounded-xl bg-warning-soft p-3 text-xs text-warning">
          <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          Nunca escreva senha, código de acesso, CPF ou dados de cartão. A equipe nunca pede essas informações.
        </p>
        <div>
          <p id="ticket-category-label" className="mb-2 text-sm font-semibold text-fg">
            Categoria
          </p>
          <div id="ticket-category" tabIndex={-1} className="rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-brand">
            <ChipGroup
              label="Categoria da solicitação"
              wrap
              value={category as TicketCategory}
              onChange={(v) => {
                setCategory(v);
                setErrors((x) => ({ ...x, category: undefined }));
              }}
              options={CATEGORIES.map((c) => ({ value: c, label: TICKET_CATEGORY_LABEL[c] }))}
            />
          </div>
          {errors.category ? (
            <p role="alert" className="mt-1.5 text-sm text-brand">
              {errors.category}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor={ids.subject} className="mb-2 block text-sm font-semibold text-fg">
            Assunto
          </label>
          <input
            id={ids.subject}
            value={subject}
            maxLength={TICKET_LIMITS.subjectMax + 20}
            onChange={(e) => {
              setSubject(e.target.value);
              setErrors((x) => ({ ...x, subject: undefined }));
            }}
            placeholder="Ex.: Não recebi o link de acesso"
            aria-invalid={errors.subject ? true : undefined}
            aria-describedby={errors.subject ? `${ids.subject}-err` : undefined}
            className="min-h-11 w-full rounded-xl border border-line bg-card px-4 text-base text-fg placeholder:text-subtle focus:outline-none focus-visible:outline-2 focus-visible:outline-brand"
          />
          {errors.subject ? (
            <p id={`${ids.subject}-err`} role="alert" className="mt-1.5 text-sm text-brand">
              {errors.subject}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor={ids.description} className="mb-2 flex items-baseline justify-between text-sm font-semibold text-fg">
            O que aconteceu?
            <span className={cn("text-xs font-normal", description.length > TICKET_LIMITS.descriptionMax ? "text-brand" : "text-muted")}>
              {description.length}/{TICKET_LIMITS.descriptionMax}
            </span>
          </label>
          <textarea
            id={ids.description}
            rows={4}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setErrors((x) => ({ ...x, description: undefined }));
            }}
            placeholder="Conte o que você tentou fazer, o que apareceu na tela e em qual página."
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? `${ids.description}-err` : undefined}
            className="w-full resize-none rounded-xl border border-line bg-card px-4 py-3 text-base text-fg placeholder:text-subtle focus:outline-none focus-visible:outline-2 focus-visible:outline-brand"
          />
          {errors.description ? (
            <p id={`${ids.description}-err`} role="alert" className="mt-1.5 text-sm text-brand">
              {errors.description}
            </p>
          ) : sensitive.length ? (
            <p className="mt-1.5 text-sm text-brand">Parece haver dado sensível ({sensitive.join(", ")}). Remova antes de continuar.</p>
          ) : null}
        </div>
        {suggestions && (suggestions.lessons.length || suggestions.materials.length) ? <RelatedBlock related={suggestions} title="Antes de enviar, isto pode ajudar" /> : null}
        <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:flex sm:flex-wrap">
          <Button
            variant="secondary"
            onClick={() => {
              if (saveDraft(false)) setResult("rascunho");
            }}
          >
            <PenLine aria-hidden className="size-4" />
            Salvar rascunho
          </Button>
          <Button
            onClick={() => {
              const id = saveDraft(true);
              if (!id) return;
              dispatch({ type: "ticket/simulate", id });
              setResult("simulado");
            }}
          >
            <MessageSquareText aria-hidden className="size-4" />
            Simular envio
          </Button>
        </div>
      </div>
    </Card>
  );
}

function TicketList({ tickets, onEdit }: { tickets: SupportTicket[]; onEdit: (t: SupportTicket) => void }) {
  const { dispatch } = useDemo();
  if (!tickets.length) return null;
  return (
    <section aria-labelledby="sup-minhas" className="space-y-3">
      <h2 id="sup-minhas" className="flex flex-wrap items-center gap-2 font-serif text-xl font-semibold text-fg">
        Minhas solicitações <DemoBadge label="Só nesta sessão" />
      </h2>
      <ul className="space-y-2.5">
        {tickets.map((t) => (
          <li key={t.id}>
            <Card className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={t.status === "rascunho" ? "neutral" : "warning"}>{TICKET_STATUS_LABEL[t.status]}</Badge>
                <span className="text-xs text-muted">{TICKET_CATEGORY_LABEL[t.category]}</span>
              </div>
              <p className="mt-1.5 font-medium text-fg">{t.subject || "(sem assunto)"}</p>
              <p className="mt-0.5 line-clamp-2 text-sm text-muted">{t.description}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {t.status === "rascunho" ? (
                  <Button size="sm" variant="secondary" onClick={() => onEdit(t)}>
                    <PenLine aria-hidden className="size-4" />
                    Continuar
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "ticket/delete", id: t.id })} aria-label={`Excluir solicitação ${t.subject || ""}`}>
                  <Trash2 aria-hidden className="size-4" />
                  Excluir
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
