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
- Barra inferior (hoje: 7 destinos, ver Navegação 2.0), Início curto no celular, Aulas (biblioteca + detalhe), Virais, Estúdio IA,
  Comunidade, Marketplace, Conquistas, Lives, Suporte, Minhas Vendas (vazio honesto), Perfil.
- Tudo mock fica no modo demo local; produção mostra “Em breve”. Roteiro em `docs/GRAVACAO_MOBILE.md`.
- **Pendente (ativos reais):** logo, fotos, catálogo NUMI, vídeos das aulas, roteiros validados,
  agenda de lives, links e canais de suporte.

## ✅ Estúdio IA em três ferramentas de texto (Prompt 09B)
- Criar Personagem (prompt de imagem + JSON + ficha), Animar Personagem (prompts por take com a fala
  intacta) e Roteiros para Gravar Aparecendo (10 roteiros), com modelo local e sem rede.
- **Pendente:** integração DeepSeek no servidor (texto) e roteiros próprios da equipe. Ver `docs/ESTUDIO_IA.md`.

## ✅ Meu Plano 2.0 — jornada interativa (prioritário, reunião 23/11/2026)
- Mapa de evolução com fases e microetapas, tela de execução (uma ação por vez, print, resultado
  esperado, aula de apoio, “Concluí esta etapa” → “Próxima etapa”), personalização pelo motor
  existente, progresso histórico e XP preservados, Início abrindo a microetapa atual.
  Ver `docs/PLANO_INTERATIVO.md`.
- **Pendente (equipe/expert):** aprovar fases e microetapas, confirmar procedimentos do TikTok,
  enviar prints reais, aulas oficiais de apoio (perfil, bio, avatar), modelos de bio e prompts.
- **Próximo:** onboarding em vídeo (mesmo contrato), depois o Prompt 13B (pausado).

## ✅ Navegação 2.0 + interface corporativa (prioritário, 24/11/2026)
- Barra inferior com sete destinos (sem “Mais”), lateral desktop com os mesmos destinos, Perfil como
  central de conta/evolução/ajuda, Início reorganizado por prioridade, atalhos de Virais no Início e
  no Estúdio, rodapés de ajuda no Início e nas Aulas, modo foco para o primeiro acesso.
  Ver `docs/NAVEGACAO_MVF.md`.
- **Pendente:** teste em celulares físicos (checklist no relatório), categoria de plano real no Perfil
  quando houver dado confirmado, onboarding com vídeo (usar `FOCUS_ROUTE_PREFIXES`).

## ✅ Identidade visual 2.0 — vinho + nude (24/11/2026)
- Tokens novos (vinho, nude, bordô de ação, quase preto), Inter como fonte única, raios e sombras
  sóbrios, moldura vinho (cabeçalho, lateral, barra inferior, login), destaques vinho no Início, mapa e
  Perfil, Estúdio com blocos de prompt escuros. Sem mudança de lógica.
- **Pendente:** paleta e fonte oficiais da marca (substituir só os tokens), revisão da expert em
  celular físico, capas das Aulas sobre o novo fundo.

## 🟡 Assistente MVF — suporte com IA (26/11/2026) — pronto localmente, AGUARDANDO AUTORIZAÇÃO
- Chat em tela cheia na Central de ajuda, memória do atendimento, base de conhecimento (RAG textual),
  encaminhamento humano honesto, encerramento com TXT arquivado, migration + RLS + testes (PGlite), pipeline
  `npm run support-kb`. Ver `docs/SUPORTE_IA.md`.
- **Pendente (operador):** portões A–E (migration, base, chave DeepSeek, homologação, produção), política de
  retenção, canal humano oficial, material do curso e aprovação dos guias, job de inatividade, tela da equipe.

## ✅ Painel administrativo — estrutura e conteúdo (Prompt 13A, demonstrativo local)
- `/gestao` só no desenvolvimento (três condições, 404 no servidor fora disso): visão geral com
  números reais, cursos e aulas, produtos NUMI, roteiros e presets, fluxo editorial, revisão e
  exportação JSON/CSV validada. Ver `docs/PAINEL_ADMIN.md`.
- **Próximo (13B):** Lives, Comunidade, Suporte, Gamificação e Configurações no painel.
- **Pendente:** validar o 404 autenticado em build de produção; papéis de editor/revisor no banco;
  persistência real do painel (fase de backend).

## ✅ Comunidade, Lives e Suporte (Prompt 12)
- Comunidade com modelos de publicação, vínculo com aula/desafio, busca, denúncia, fila de moderação
  simulada, salas Elite+/Icon com simulação rotulada e XP sem duplicação.
- Lives e encontros com agenda (próximas, anteriores, minha agenda), detalhes, replays autorizados e
  lembrete simulado. Central de ajuda com busca tolerante, atalhos, recomendações do catálogo e tickets
  em rascunho/simulação. 404 real para aulas e produtos inexistentes. Ver `docs/COMUNIDADE_LIVES_SUPORTE.md`.
- **Pendente (equipe):** regras de convivência, moderadoras, agenda real, política de gravações,
  canais de suporte e FAQ aprovado.

## ✅ Marketplace NUMI (Prompt 11)
- Catálogo tipado único (oficial + demonstrativo), vitrine com Produtos NUMI, categorias, recomendados,
  novidades, salvos, Meus produtos e Marcas parceiras em breve; página de detalhes por produto; envio
  ao Estúdio (Roteiros e Animador) com os dados cadastrados. Ver `docs/MARKETPLACE.md`.
- **Pendente (dados da equipe NUMI):** ficha completa do creme, fotos, preço, comissão (fonte e data),
  condições e link de afiliação, benefícios aprovados e restrições; demais produtos NUMI.

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
| Estúdio IA | Três geradores de TEXTO prontos no mock (Prompt 09B, `docs/ESTUDIO_IA.md`). Próximo: provedor DeepSeek (só linguagem) no servidor, com autenticação, limite e custo; biblioteca de roteiros próprios da NUMI. Imagem e vídeo continuam no Google Flow. |
| Vídeos Virais | Fonte licenciada (pesquisar TokConnect, FastMoss, Kalodata, Creative Center, Meta Ads Library); métricas estimadas sempre rotuladas. |
| Marketplace | Catálogo tipado e vitrine prontos no mock (Prompt 11, `docs/MARKETPLACE.md`). Próximo: dados oficiais NUMI, painel admin/banco para o catálogo, comissões verificadas, links do TikTok Shop e marcas parceiras. |
| Minhas Vendas | Somente de fonte verificável; separar verificado × autodeclarado. |
| Gamificação | Pontos por ações verificáveis, níveis, desafios, conquistas, ranking, loja com estoque. |
| Lives, Materiais, Perfil, Suporte, Regras & FAQ | Integrar ao novo fluxo. |
| Admin | Permissões por cargo, auditoria. |
| Assistente IA | Dúvidas das aulas e recomendações, sem inventar regras do TikTok Shop. |
| PWA | Estrutura pronta; sem service worker/offline no MVP. |
