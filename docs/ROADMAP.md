# Roadmap

Prazo meta (não garantia) do brief: versão utilizável em 2–3 dias.

## ✅ Dia 1 — Fundação front-end (Prompt 01)
- Projeto Next.js, design system (tokens, tipografia, componentes base).
- Shell: sidebar recolhível com grupos, drawer mobile, header.
- Telas **Início** e **Meu Plano** com dados de demonstração e estado local.
- Páginas “Em breve” para todos os módulos do menu.

## ✅ Onboarding e personalização (Prompt 02)
- `/onboarding` conversacional roteirizado: 11 perguntas (1 opcional, 1 condicional), resumo, edição.
- Motor determinístico perfil → plano (4–6 etapas, dias pelo tempo diário, justificativas).
- Ajuste de respostas com prévia e confirmação; concluídas preservadas por ID.
- “Simular primeiro acesso” para demo. Tudo em memória.

## ✅ Acesso, Kiwify e persistência (Prompt 03) — código pronto, falta configuração real
- Supabase Auth (link mágico, sem cadastro público), Proxy, autorização no servidor, RLS.
- Webhook Kiwify assinado + confirmação na API; importação/reconciliação por CLI (dry-run).
- Onboarding, plano e progresso persistidos por aluna; rascunho; concorrência entre dispositivos.
- Papéis por CLI auditada; `/admin` protegido com saúde da integração.
- **Pendente (operação):** projeto Supabase, SMTP, credenciais Kiwify, produtos, domínio, testes reais.

## 🟡 Ativação e homologação (Prompt 04) — preparado, BLOQUEADO POR CONFIGURAÇÃO
- Auditoria pré-conexão e contrato Kiwify reconferido (`docs/HOMOLOGACAO_04.md`).
- Guia de configuração com portões de autorização (`docs/SETUP_REAL_04.md`).
- Correções: link mágico à prova de pré-abertura, 429 neutro, paginação da Kiwify por `count`.
- Novas ferramentas: `npm run preflight [--remote]`, `kiwify probe`, `kiwify grant-order`.
- **Pendente (operador):** Supabase de homologação, SMTP + DNS, credenciais Kiwify, deploy, e a
  execução da Fase C com evidências em `docs/RELATORIO_PILOTO_04.md`.

## ✅ Front mobile-first para demonstração (Prompt 05)
- Barra inferior + “Mais”, Início curto no celular, Aulas (biblioteca + detalhe), Virais, Estúdio IA,
  Comunidade, Marketplace, Conquistas, Lives, Suporte, Minhas Vendas (vazio honesto), Perfil.
- Tudo mock fica no modo demo local; produção mostra “Em breve”. Roteiro em `docs/GRAVACAO_MOBILE.md`.
- **Pendente (ativos reais):** logo, fotos, catálogo NUMI, vídeos das aulas, roteiros validados,
  agenda de lives, links e canais de suporte.

## ✅ Finalização do front para demonstração (Prompt 07)
- Desafios (missões diárias, semanais e especiais), Ranking, Recompensas, Materiais e Regras & FAQ.
- Gamificação integrada: mesmo XP em Início, Conquistas, Desafios, Ranking e Recompensas.
- **Pendente (conteúdo real):** regras oficiais, FAQ aprovado, catálogo real de recompensas e
  regras da loja, arquivos dos materiais, critérios oficiais de pontos.

## ⏭ Próximo (aguardando definição do operador)
- Concluir a Fase C da homologação (Prompt 04) com evidências reais.
- Catálogo real de aulas/atividades substituindo `src/demo/task-catalog.ts`.
- Módulo de gestão com permissões finas.
- Antes do lançamento amplo: resolver o risco R3 (limite por IP do Supabase) e agendar `reconcile`.

## Dia 3 — Lançamento controlado
- Testes com contas autorizadas, deploy, domínio, provedor de e-mail transacional.
- Ajustes de usabilidade e experiência da primeira aluna.

## Depois do MVP
| Módulo | Notas do brief |
|---|---|
| Aulas | Biblioteca completa sempre disponível; depende da decisão sobre vídeos da Kiwify. |
| Comunidade | Recriar espaços (Boas-vindas, Avisos NUMI, Mural, Dúvidas & dicas, Bastidores, Elite+/Icon) sem importar posts; moderação e denúncias. |
| Estúdio IA | Prompts, roteiros, personagens, cenas e consistência para Google Flow (PT/EN); base de 100+ roteiros validados. Sem geração de vídeo na v1. |
| Vídeos Virais | Fonte licenciada (pesquisar TokConnect, FastMoss, Kalodata, Creative Center, Meta Ads Library); métricas estimadas sempre rotuladas. |
| Marketplace | Produtos NUMI, regras de comissão, materiais; parceiras só “em breve”. |
| Minhas Vendas | Somente de fonte verificável; separar verificado × autodeclarado. |
| Gamificação | Pontos por ações verificáveis, níveis, desafios, conquistas, ranking, loja com estoque. |
| Lives, Materiais, Perfil, Suporte, Regras & FAQ | Integrar ao novo fluxo. |
| Admin | Permissões por cargo, auditoria. |
| Assistente IA | Dúvidas das aulas e recomendações, sem inventar regras do TikTok Shop. |
| PWA | Estrutura pronta; sem service worker/offline no MVP. |
