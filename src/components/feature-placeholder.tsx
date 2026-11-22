import { ArrowRight, Info } from "lucide-react";
import { getNavItem } from "@/config/navigation";
import { Card } from "@/components/ui/card";
import { SoonBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";

/**
 * Escopo planejado de cada módulo, extraído do brief mestre. Serve para
 * comunicar o que vem — não simula funcionalidade nem exibe dados.
 */
const PLANNED_SCOPE: Record<string, { points: string[]; note?: string }> = {
  aulas: {
    points: [
      "Biblioteca completa, sempre disponível, independentemente do seu plano.",
      "Busca e filtros por módulo, formato e nível.",
      "Progresso por aula conectado ao Meu Plano.",
    ],
    note: "As aulas atuais continuam na área de membros da Kiwify até a forma de migração ser definida.",
  },
  "videos-virais": {
    points: [
      "TikTok orgânico e Ads, Instagram orgânico e anúncios Meta — Brasil e EUA.",
      "Filtros por país, rede, nicho, formato e disponibilidade de métricas.",
      "Botão “Usar como inspiração no Estúdio IA” e coleção de salvos.",
    ],
    note: "Métricas estimadas serão sempre rotuladas como estimativas, com fonte e data.",
  },
  "estudio-ia": {
    points: [
      "Criar Personagem: prompt de texto para criar a imagem no Google Flow.",
      "Animar Personagem: prompts de vídeo por take, com a sua fala intacta, para o Google Flow.",
      "Roteiros para Gravar Aparecendo: dez roteiros escritos para gravar com o celular.",
    ],
    note: "O app escreve só texto. Imagens e vídeos são feitos fora do app, no Google Flow.",
  },
  marketplace: {
    points: [
      "Produtos NUMI com fotos, descrição, regras de comissão e materiais.",
      "Roteiros relacionados a cada produto.",
      "Espaço para marcas parceiras quando houver parcerias confirmadas.",
    ],
  },
  "minhas-vendas": {
    points: [
      "Registro de vendas e comissões a partir de fontes verificáveis.",
      "Separação clara entre valores verificados e autodeclarados.",
    ],
  },
  materiais: { points: ["Modelos, arquivos de apoio e materiais de divulgação organizados por tema."] },
  comunidade: {
    points: [
      "Espaços: Boas-vindas, Avisos NUMI, Mural de conquistas, Dúvidas & dicas e Bastidores.",
      "Salas com acesso restrito para Elite+ e Icon.",
      "Moderação e denúncias desde o lançamento.",
    ],
  },
  lives: { points: ["Agenda de lives, lembretes e gravações."] },
  desafios: { points: ["Desafios com critérios claros, baseados em ações verificáveis."] },
  ranking: {
    points: ["Ranking que distingue resultados verificados de autodeclarados, sem incentivar spam."],
  },
  conquistas: { points: ["Níveis, selos e marcos da jornada."] },
  recompensas: { points: ["Loja de recompensas com estoque, regras de resgate e histórico."] },
  perfil: { points: ["Dados da conta, preferências e edição das respostas do onboarding."] },
  suporte: { points: ["Atendimento individual com a equipe."] },
  "regras-faq": { points: ["Regras da comunidade e perguntas frequentes."] },
  admin: {
    points: [
      "Gestão de alunas, conteúdos, comunidade e recompensas.",
      "Permissões por cargo: owner, administradores, expert, suporte, moderação e parceiros.",
      "Log de auditoria para ações administrativas.",
    ],
    note: "Neste protótipo o menu Gestão é apenas visual. A autorização real será verificada no servidor em todas as rotas restritas.",
  },
};

export function FeaturePlaceholder({ featureId }: { featureId: string }) {
  const item = getNavItem(featureId);
  const scope = PLANNED_SCOPE[featureId];
  const Icon = item.icon;

  return (
    <div className="mx-auto max-w-3xl">
      <Card className="overflow-hidden">
        <div className="border-b border-line bg-blush/50 px-6 py-8 sm:px-10">
          <span className="grid size-14 place-items-center rounded-2xl bg-card text-brand shadow-card">
            <Icon aria-hidden className="size-6" />
          </span>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-fg">{item.label}</h1>
            <SoonBadge />
          </div>
          <p className="mt-2 max-w-xl text-base text-muted">{item.description}</p>
        </div>

        <div className="space-y-6 px-6 py-8 sm:px-10">
          {scope ? (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-subtle">
                O que está planejado
              </h2>
              <ul className="mt-3 space-y-2">
                {scope.points.map((p) => (
                  <li key={p} className="flex gap-3 text-sm text-fg">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {scope?.note ? (
            <p className="flex gap-3 rounded-xl bg-canvas p-4 text-sm text-muted">
              <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
              {scope.note}
            </p>
          ) : null}

          <p className="text-sm text-muted">
            Esta área ainda não está disponível. Nada aqui é funcional ou representa dados reais.
          </p>

          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/meu-plano">
              Continuar meu plano
              <ArrowRight aria-hidden className="size-4" />
            </ButtonLink>
            <ButtonLink href="/inicio" variant="secondary">
              Voltar ao Início
            </ButtonLink>
          </div>
        </div>
      </Card>
    </div>
  );
}
