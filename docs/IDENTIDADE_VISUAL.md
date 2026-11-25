# Identidade visual — App MVF (definitiva, 25/11/2026)

Fonte única: `src/app/globals.css` (`:root` + `@theme inline`). Componentes usam só os tokens
semânticos (`bg-canvas`, `text-fg`, `bg-brand`…), nunca hex. Há teste: `src/lib/design/palette.test.ts`.

## Paleta

| Cor-base | Valor |
|---|---|
| Borgonha | `#800020` |
| Off-white | `#FAF9F6` |

Nada além delas. Tudo o mais é **transparência ou mistura** dessas duas (pré-calculada nos tokens
para não somar camadas de alpha). Proibido: branco puro, preto, cinza, rosa, cores do Tailwind
(`red-500`…), hex soltos e gradientes de outras cores. Fotos, capas, vídeos e logos oficiais não
são recoloridos (os degradês de leitura sobre fotos usam borgonha).

## Tokens semânticos

| Papel | Token (classe) | Valor |
|---|---|---|
| Background | `canvas` | `#FAF9F6` |
| Surface (cards, campos) | `card`, `paper` | `#FAF9F6` |
| Surface sutil | `surface` | borgonha 3% (`#F6F2F0`) |
| Interactive hover / seleção | `blush` | borgonha 6% (`#F3EAE9`) |
| Trilhos, realces | `blush-strong` | borgonha 12% (`#EBDBDC`) |
| Primary / interactive | `brand` | `#800020` |
| Primary hover | `brand-hover` | off-white 12% sobre borgonha (`#8F1E3A`) |
| Foreground | `fg` | `#800020` |
| Muted | `muted` | borgonha 80% (`#98324B`) |
| Subtle (rótulos) | `subtle` | borgonha 76% (`#9C3C53`) |
| Border | `line` / `line-strong` | borgonha 16% / 30% |
| Superfície destacada | `wine`, `wine-deep`, `ink` | `#800020` |
| Realce dentro do borgonha | `wine-soft` | `#8F1E3A` |
| Texto sobre borgonha | `on-wine` / `on-wine-muted` | `#FAF9F6` / off-white 82% |
| Accent / focus sobre borgonha | `accent` | `#FAF9F6` |
| Focus sobre claro | (global) | contorno `brand` |
| Disabled | opacidade 55% do próprio componente | — |
| Estados (sucesso, aviso) | `success`, `warning` | borgonha — o estado é dito por ícone e texto |

Contraste: todo texto ≥ 4,5:1 (auditado no navegador em 320–1440 px).

## Aplicação

- Fundo claro `#FAF9F6`, texto borgonha. Superfície escura borgonha, texto off-white.
- Botão primário: borgonha com texto off-white. Secundário: off-white, texto e borda borgonha.
- Campos: off-white com borda borgonha 30%. Blocos de prompt do Estúdio: borgonha com texto off-white.
- Card destacado (próxima ação, mapa, perfil): borgonha. Cards neutros: off-white com borda.
- Hierarquia por opacidade, borda e espaçamento — não por cores novas. No Início, um único bloco
  borgonha (a próxima ação).

## Exceção congelada: menu inferior

O menu inferior (`src/components/layout/bottom-nav.tsx` + `.mvf-glass`) foi aprovado e **não muda**
com a paleta global. Usa tokens próprios com os valores aprovados:

| Token | Valor |
|---|---|
| `--nav-glass` | `164 5 45` (vidro a 85%, blur 16 px, saturação 150%) |
| `--nav-fg` | `#FFFBF8` (rótulo ativo; bolha 15% + anel 30%) |
| `--nav-fg-muted` | `#F2D9DC` (rótulo inativo) |
| `--nav-accent` | `#F6EFE0` (foco) |

O teste de paleta só aceita esses valores dentro do menu. Para mudar o menu, é preciso decisão nova.

## Selos de demonstração

Sem selos decorativos em cabeçalhos, títulos e cards. `DemoBadge` virou uma **nota de texto discreta**,
usada só onde evita confusão entre simulação e realidade (resultado do Estúdio “modelo local (sem IA)”,
“Produto demonstrativo”, “Aula de exemplo”, solicitações “só nesta sessão, nada foi enviado”, salvamento
“só nesta aba”). Avisos contextuais (Lives, Marketplace, Regras, Avisos NUMI, publicação/denúncia
simuladas) continuam. Controles internos da demo: Perfil (celular), lateral (desktop), painel recolhido
no fim da Tribo e `/gestao`.
