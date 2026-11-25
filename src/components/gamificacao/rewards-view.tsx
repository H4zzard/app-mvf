"use client";

import Image from "next/image";
import { useLayoutEffect, useState } from "react";
import { BadgeCheck, CircleCheck, Gift, History, Info, Lock, MessageSquareHeart, Sparkles, Star } from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { GameTabs, PointsStrip } from "@/components/gamificacao/game-shell";
import { Chip, ChipGroup } from "@/components/ui/chips";
import { DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Sheet } from "@/components/ui/sheet";
import { DEMO_REWARDS, REWARD_CATEGORY_LABEL, type Reward, type RewardCategory } from "@/demo/rewards";
import { rewardState } from "@/lib/demo/economy";
import { cn } from "@/lib/cn";

const CATEGORY_ICON: Record<RewardCategory, typeof Gift> = { mentoria: MessageSquareHeart, produto: Gift, beneficio: Star };

/**
 * Loja de Recompensas (DEMONSTRAÇÃO). Saldo = XP ganho − resgates. O resgate é
 * SIMULADO: sem estoque, envio, agenda ou qualquer operação externa.
 */
export function RewardsView() {
  const { state, dispatch, balance, xp } = useDemo();
  const [category, setCategory] = useState<RewardCategory | "todas">("todas");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  useLayoutEffect(() => () => setOpenId(null), []);

  const redeemed = state.rewardsRedeemed;
  const items = DEMO_REWARDS.filter(
    (r) => (category === "todas" || r.category === category) && (!onlyAvailable || rewardState(r, balance, redeemed).state === "disponivel"),
  ).sort((a, b) => a.cost - b.cost);
  const open = DEMO_REWARDS.find((r) => r.id === openId);
  const history = state.history.filter((h) => h.kind === "recompensa");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<DemoBadge label="Loja de demonstração" />}
        title="Recompensas"
        description="Troque seus pontos de engajamento por benefícios. Nesta demonstração, os resgates são simulados."
      />
      <GameTabs />
      <PointsStrip />

      <p className="flex items-start gap-2.5 rounded-xl border border-line bg-surface p-3 text-xs text-muted">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
        <span>
          <strong className="font-semibold text-fg">Recompensas de exemplo.</strong> Não há estoque, envio, agenda nem disponibilidade
          reais. Ganhou {xp.xp} XP; saldo atual {balance} pontos.
        </span>
      </p>

      <div className="space-y-3">
        <ChipGroup
          label="Categorias de recompensa"
          value={category}
          onChange={setCategory}
          options={[{ value: "todas" as const, label: "Todas" }, ...(Object.keys(REWARD_CATEGORY_LABEL) as RewardCategory[]).map((c) => ({ value: c, label: REWARD_CATEGORY_LABEL[c] }))]}
        />
        <Chip active={onlyAvailable} onClick={() => setOnlyAvailable((v) => !v)}>
          <BadgeCheck aria-hidden className="size-4" />
          Disponíveis para mim
        </Chip>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="Nenhuma recompensa disponível ainda"
          description="Complete aulas e desafios para juntar pontos."
          action={<Button variant="secondary" onClick={() => setOnlyAvailable(false)}>Ver todas</Button>}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {items.map((r) => (
            <RewardCard key={r.id} reward={r} info={rewardState(r, balance, redeemed)} onOpen={() => setOpenId(r.id)} />
          ))}
        </ul>
      )}

      <section aria-labelledby="rw-hist" className="space-y-3">
        <h2 id="rw-hist" className="flex items-center gap-2 font-serif text-[1.35rem] font-semibold text-fg">
          <History aria-hidden className="size-5 text-brand" />
          Histórico de resgates
        </h2>
        {history.length === 0 ? (
          <EmptyState icon={History} title="Nenhum resgate ainda" description="Seus resgates simulados aparecem aqui." />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {history.map((h) => (
              <li key={h.id} className="flex items-center gap-3 px-4 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blush text-brand">
                  <Gift aria-hidden className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-fg">{h.label}</span>
                  <span className="text-xs text-muted">Resgate simulado</span>
                </span>
                <span className="text-sm font-semibold text-fg">−{h.points}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {open ? (
        <RewardSheet
          reward={open}
          info={rewardState(open, balance, redeemed)}
          balance={balance}
          onClose={() => setOpenId(null)}
          onRedeem={() => dispatch({ type: "reward/redeem", rewardId: open.id, label: open.title, cost: open.cost, balance })}
        />
      ) : null}
    </div>
  );
}

function RewardVisual({ reward, className }: { reward: Reward; className?: string }) {
  const Icon = CATEGORY_ICON[reward.category];
  return (
    <span className={cn("relative grid place-items-center overflow-hidden bg-blush text-brand", className)}>
      {reward.image ? (
        <Image src={reward.image} alt="" fill sizes="(max-width: 640px) 45vw, 240px" className="object-cover object-top" />
      ) : (
        <span className="grid size-14 place-items-center rounded-2xl bg-paper shadow-card">
          <Icon aria-hidden className="size-7" strokeWidth={1.6} />
        </span>
      )}
    </span>
  );
}

function RewardCard({ reward, info, onOpen }: { reward: Reward; info: ReturnType<typeof rewardState>; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-line bg-card text-left shadow-card transition-colors hover:border-brand/30"
      >
        <span className="relative block">
          <RewardVisual reward={reward} className={cn("aspect-[4/3] w-full", info.state === "bloqueada" && "[&_img]:opacity-80")} />
          <span
            className={cn(
              "absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold shadow-sm",
              info.state === "resgatada" ? "bg-success text-paper" : info.state === "disponivel" ? "bg-paper text-brand" : "bg-ink/80 text-paper",
            )}
          >
            {info.state === "resgatada" ? <CircleCheck aria-hidden className="size-3" /> : info.state === "bloqueada" ? <Lock aria-hidden className="size-3" /> : <Sparkles aria-hidden className="size-3" />}
            {info.state === "resgatada" ? "Resgatada" : info.state === "disponivel" ? "Disponível" : "Bloqueada"}
          </span>
        </span>
        <span className="flex flex-1 flex-col p-3">
          <span className="line-clamp-2 text-sm font-semibold leading-snug text-fg">{reward.title}</span>
          <span className="mt-0.5 text-xs text-muted">{REWARD_CATEGORY_LABEL[reward.category]}</span>
          <span className="mt-auto pt-2.5">
            <span className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-serif text-base font-semibold text-fg">{reward.cost}</span>
              <span className="text-muted">{info.state === "bloqueada" ? `faltam ${info.missing}` : "pontos"}</span>
            </span>
            {info.state === "bloqueada" ? <ProgressBar value={info.percent} label={`Progresso até ${reward.title}`} size="sm" className="mt-1.5" /> : null}
          </span>
        </span>
      </button>
    </li>
  );
}

function RewardSheet({
  reward,
  info,
  balance,
  onClose,
  onRedeem,
}: {
  reward: Reward;
  info: ReturnType<typeof rewardState>;
  balance: number;
  onClose: () => void;
  onRedeem: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <Sheet
      title={reward.title}
      eyebrow={REWARD_CATEGORY_LABEL[reward.category]}
      onClose={onClose}
      footer={
        info.state === "resgatada" ? (
          <p role="status" className="flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold text-success">
            <CircleCheck aria-hidden className="size-4" />
            {done ? "Resgate simulado registrado" : "Você já resgatou esta recompensa"}
          </p>
        ) : info.state === "bloqueada" ? (
          <Button className="flex-1" size="lg" disabled>
            <Lock aria-hidden className="size-4" />
            Faltam {info.missing} pontos
          </Button>
        ) : confirming ? (
          <>
            <Button variant="secondary" size="lg" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1"
              size="lg"
              onClick={() => {
                onRedeem();
                setDone(true);
                setConfirming(false);
              }}
            >
              Confirmar resgate
            </Button>
          </>
        ) : (
          <Button className="flex-1" size="lg" onClick={() => setConfirming(true)}>
            <Gift aria-hidden className="size-4" />
            Resgatar por {reward.cost} pontos
          </Button>
        )
      }
    >
      <div className="space-y-5">
        <RewardVisual reward={reward} className="aspect-[16/10] w-full rounded-2xl" />
        <DemoBadge label="Recompensa de exemplo" />
        <p className="text-sm text-fg">{reward.description}</p>
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-line p-3">
            <dt className="text-muted">Custo</dt>
            <dd className="mt-0.5 font-serif text-lg font-semibold text-fg">{reward.cost} pts</dd>
          </div>
          <div className="rounded-xl border border-line p-3">
            <dt className="text-muted">Seu saldo</dt>
            <dd className="mt-0.5 font-serif text-lg font-semibold text-fg">{balance} pts</dd>
          </div>
        </dl>
        {info.state === "bloqueada" ? <ProgressBar value={info.percent} label={`Progresso até ${reward.title}`} /> : null}
        {confirming ? (
          <p role="alert" className="rounded-xl bg-blush p-3 text-sm text-fg">
            Confirma o resgate de <strong>{reward.title}</strong> por {reward.cost} pontos? É uma simulação: nada será enviado.
          </p>
        ) : null}
        <p className="rounded-xl bg-canvas p-3 text-xs text-muted">
          Simulação: sem estoque, envio, agenda ou disponibilidade reais. As regras oficiais da loja ainda serão definidas pela equipe.
        </p>
      </div>
    </Sheet>
  );
}
