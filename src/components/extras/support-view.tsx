"use client";

import { useState } from "react";
import { ChevronDown, CircleCheck, LifeBuoy, SearchX, Send } from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { ChipGroup, SearchField } from "@/components/ui/chips";
import { DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { DEMO_FAQ, FAQ_TOPIC_LABEL, type FaqItem } from "@/demo/agenda";
import { matchesQuery } from "@/lib/demo/filters";
import { cleanText } from "@/lib/demo/store";
import { cn } from "@/lib/cn";

const TOPICS = ["plano", "aulas", "ferramentas", "conta"] as const;

/** Suporte (DEMONSTRAÇÃO): FAQ navegável e formulário que NÃO envia mensagem real. */
export function SupportView() {
  const { state, dispatch } = useDemo();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<FaqItem["topic"] | "todos">("todos");
  const [openId, setOpenId] = useState<string | null>(null);
  const [category, setCategory] = useState<FaqItem["topic"]>("plano");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const faq = DEMO_FAQ.filter((f) => (topic === "todos" || f.topic === topic) && matchesQuery(query, f.question, f.answer));

  function send() {
    const text = cleanText(message, 1000);
    if (!text || text.length < 10) return setError("Descreva sua dúvida com pelo menos 10 caracteres.");
    dispatch({ type: "support/send" });
    setSent(true);
    setMessage("");
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={<DemoBadge label="Central de ajuda de exemplo" />} title="Suporte" description="Encontre respostas rápidas ou fale com a equipe." />

      <SearchField value={query} onChange={setQuery} placeholder="Buscar na central de ajuda" label="Buscar perguntas frequentes" />
      <ChipGroup
        label="Temas"
        value={topic}
        onChange={setTopic}
        options={[{ value: "todos" as const, label: "Todos" }, ...TOPICS.map((t) => ({ value: t, label: FAQ_TOPIC_LABEL[t] }))]}
      />

      {faq.length === 0 ? (
        <EmptyState icon={SearchX} title="Nenhuma resposta encontrada" description="Tente outra palavra ou envie sua dúvida abaixo." />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card shadow-card">
          {faq.map((f) => {
            const open = openId === f.id;
            return (
              <li key={f.id}>
                <h2>
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
                </h2>
                <div id={`faq-${f.id}`} hidden={!open} className="px-4 pb-4 text-sm text-muted">
                  {f.answer}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Card className="p-5 sm:p-6" aria-labelledby="support-form-title">
        <CardHeader
          titleId="support-form-title"
          title="Fale com a equipe"
          description="Demonstração: o formulário não envia mensagens."
          action={<LifeBuoy aria-hidden className="size-5 text-brand" />}
        />
        {sent ? (
          <div role="status" className="mt-4 rounded-xl bg-success-soft p-4 text-sm text-success">
            <p className="flex items-center gap-2 font-semibold">
              <CircleCheck aria-hidden className="size-4" />
              Simulação concluída
            </p>
            <p className="mt-1">
              Nenhuma mensagem foi enviada. Na versão oficial, a equipe responde pelos canais de suporte informados no seu acesso.
              {state.supportRequests > 1 ? ` (${state.supportRequests} simulações nesta sessão)` : ""}
            </p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => setSent(false)}>
              Escrever outra
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-fg">Assunto</p>
              <ChipGroup label="Assunto" wrap value={category} onChange={setCategory} options={TOPICS.map((t) => ({ value: t, label: FAQ_TOPIC_LABEL[t] }))} />
            </div>
            <div>
              <label htmlFor="support-message" className="mb-2 block text-sm font-semibold text-fg">
                Sua dúvida
              </label>
              <textarea
                id="support-message"
                rows={4}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setError(null);
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "support-error" : undefined}
                placeholder="Conte o que aconteceu ou o que você precisa."
                className="w-full resize-none rounded-xl border border-line bg-card px-4 py-3 text-base text-fg placeholder:text-subtle focus:outline-none focus-visible:outline-2 focus-visible:outline-brand"
              />
              {error ? (
                <p id="support-error" role="alert" className="mt-1.5 text-sm text-brand">
                  {error}
                </p>
              ) : null}
            </div>
            <Button className="w-full sm:w-auto" onClick={send}>
              <Send aria-hidden className="size-4" />
              Enviar (simulação)
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
