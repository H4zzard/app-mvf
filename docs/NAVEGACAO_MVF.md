# Navegação MVF 2.0

Navegação enxuta, sem menu “Mais”. Sete destinos, os mesmos no celular (barra inferior) e no
desktop (lateral). Fonte única: `src/lib/navigation/destinations.ts` (puro, testado em
`destinations.test.ts`); ícones em `src/config/navigation.ts` (`PRIMARY_NAV`).

## Os sete destinos

| # | Rótulo na barra | < 360 px | Nome acessível | Página principal | Ícone (lucide) |
|---|---|---|---|---|---|
| 1 | Início | Início | Início | `/inicio` | house |
| 2 | Plano | Plano | Meu Plano | `/meu-plano` | route |
| 3 | Aulas | Aulas | Aulas | `/aulas` | graduation-cap |
| 4 | Estúdio | IA | Estúdio IA | `/estudio-ia` | wand-sparkles |
| 5 | Produtos | Loja | Loja de produtos | `/marketplace` | shopping-bag |
| 6 | Tribo | Tribo | Tribo, Comunidade MVF | `/comunidade` | users-round |
| 7 | Perfil | Perfil | Perfil | `/perfil` | user-round |

O nome acessível sempre **contém** a palavra visível (WCAG 2.5.3), para que o comando de voz funcione
com o que está escrito; por isso “Tribo, Comunidade MVF” e “Loja de produtos”.

## Rotas × destino dono (estado ativo nas subrotas)

| Destino | Rotas que o mantêm ativo |
|---|---|
| Início | `/inicio` |
| Plano | `/meu-plano`, `/meu-plano/etapa/*`, `/onboarding` |
| Aulas | `/aulas`, `/aulas/*`, `/materiais` |
| Estúdio | `/estudio-ia`, `/estudio-ia/personagem`, `/estudio-ia/animar`, `/estudio-ia/roteiros`, `/videos-virais` |
| Produtos | `/marketplace`, `/marketplace/*`, `/minhas-vendas` |
| Tribo | `/comunidade`, `/lives` |
| Perfil | `/perfil`, `/desafios`, `/ranking`, `/conquistas`, `/recompensas`, `/suporte`, `/regras-faq`, `/admin` |

`destinationForPath()` resolve o destino por prefixo (`/aulas/x` sim, `/aulas-extra` não). Um teste
garante que **toda** pasta de `src/app/(app)/` tem destino: rota nova sem dono quebra o `npm test`.
Para uma rota nova, acrescente o prefixo em `owns` do destino certo.

## O que saiu do “Mais” e onde está agora

| Antes (folha “Mais”) | Agora |
|---|---|
| Vídeos Virais (era aba) | Início › “Ferramentas para criar” e Estúdio › “Explorar vídeos virais” |
| Desafios, Ranking, Conquistas, Recompensas | Perfil › Minha evolução (com XP e nível) |
| Suporte, Regras & FAQ | Perfil › Ajuda e informações; rodapés do Início e das Aulas |
| Lives | Tribo (botão “Lives e encontros”) e Início › Avisos (“Agenda de lives”) |
| Materiais | Aulas (rodapé: “Ver materiais”) |
| Minhas Vendas | Produtos (botão “Minhas vendas”) |
| Personalizar plano | Plano (mapa) e Perfil › Conta › “Ajustar meu plano” |
| Admin (papéis da equipe) | Perfil › Conta › “Gestão da equipe” (filtro só visual; acesso verificado no servidor) |
| Controles da demo (celular) | Perfil, ao final (no desktop continuam na lateral) |
| Sair da conta (celular) | Perfil › Conta (no desktop continua no cabeçalho) |

Links antigos: `/mais` redireciona para `/perfil` (`next.config.ts`). `/virais` continua indo para
`/videos-virais`. Nenhuma rota foi removida.

Regras & FAQ aceita `?secao=regras | faq | <tema>` (ex.: `conta` = Orientações de acesso).

## Telas pequenas

- 320 px: 7 × 45,7 px por item, altura 64 px: alvo ≥ 44 × 44 px. Fonte de 11 px (nunca menor).
- Abaixo de 360 px, “Estúdio” → “IA” e “Produtos” → “Loja” (mesma fonte, menos letras). O nome
  acessível não muda. Não há fallback para “Mais”: se algum dia não couber, documentar e reduzir
  ícone/espaçamento, nunca esconder destino.
- Barra fixa com `env(safe-area-inset-bottom)`; o conteúdo reserva `6rem + safe area`.
- Barras de ação fixas (Plano, Estúdio, botão flutuante da Tribo) ficam em
  `bottom: calc(4.75rem + safe area)`, acima da barra de 4rem. Se a altura da barra mudar, ajuste
  as três (há teste).
- ≥ 1024 px: sem barra inferior; lateral com os mesmos sete destinos (recolhível).

## Quando a navegação some

- Fora do App Shell (layout próprio, a barra nem existe): login, confirmação de e-mail, acesso
  indisponível, `/gestao`.
- “Modo foco” (`isAppNavHidden`): onboarding ainda não concluído (sem perfil salvo). Ao ajustar um
  plano existente, a navegação continua visível.
- **Futuro primeiro acesso com vídeo:** acrescentar o prefixo da rota em `FOCUS_ROUTE_PREFIXES`
  (ex.: `"/primeiro-acesso"`). O App Shell esconde barra e lateral sem precisar ser reconstruído.

## Testes

- Unitários: `src/lib/navigation/destinations.test.ts` (ordem, ausência do Mais, ativo em subrotas,
  rota sem dono, links do Perfil/ajuda, Virais no Início e no Estúdio, `/mais`, modo foco, layouts
  sem barra, acessibilidade, barras fixas).
- Navegador (QA local): 320/375/390/414/768/1440 px — destinos, alvos, rótulos sem corte, teclado,
  cliques, subrotas, overflow, botões fixos e telas sem barra.
