# Área de membros (Aulas) — catálogo em trilhos

A tela `/aulas` (modo demo) é um catálogo no estilo streaming, com identidade NUMI:
- hero com o banner oficial;
- “Continue assistindo”;
- “Recomendado para você”;
- seis trilhos horizontais com as capas oficiais dos módulos.

A página da aula (`/aulas/[id]`) usa a capa do módulo no topo e mostra:
- vídeo de exemplo (placeholder honesto);
- concluir e próxima aula;
- vínculo com o plano;
- “Nesta trilha” e “Aulas relacionadas”.

## Origem dos assets

Os arquivos foram fornecidos pelo operador em `imagens-area-membros/`, na raiz do projeto, e
copiados para `public/area-membros/` com nomes sem espaços nem acentos. A pasta original não foi
alterada; para não versionar os arquivos em dobro, mantenha só `public/area-membros/`.

| Arquivo original | Arquivo em `public/area-membros/` | Uso |
|---|---|---|
| `banner-area-membros.jpg` (2000×590) | `banner-area-membros.jpg` | Hero de `/aulas` e faixa no Início |
| `logo-numi.jpg` (1080×1080) | `logo-numi.jpg` | Marca no header e na sidebar (`BRAND.logoSrc`) e no hero |
| 23 capas `.png` (400×600, 2:3) | ver tabela abaixo | Capas dos módulos |

## Mapeamento capa → módulo → trilho

O **nome do módulo** é o título impresso na própria capa. As **aulas** dentro dos módulos são as 19
aulas de exemplo, com IDs estáveis, distribuídas por tema. Essa distribuição é demonstrativa: o
conteúdo real continua na área de membros da Kiwify.

| Trilho | Módulo (capa) | Arquivo | Aulas de exemplo |
|---|---|---|---|
| Primeiros passos | Primeiro acesso | `primeiro-acesso.png` | l-boas-vindas |
| | Primeiros passos | `primeiros-passos.png` | l-fundamentos-shop, l-conta-elegibilidade, l-comparar-formatos |
| | Configurações essenciais | `configuracoes-essenciais.png` | l-escolher-produto |
| | Protocolo pré-postagem | `protocolo-pre-postagem.png` | l-checklist, l-alegacoes |
| Formação MVF | Virando creator do TikTok Shop | `virando-creator-do-tiktok-shop.png` | l-edicao-simples |
| | Venda no TikTok usando sua imagem | `venda-no-tiktok-usando-sua-imagem.png` | l-camera, l-demonstracao |
| | Venda no TikTok sem aparecer | `venda-no-tiktok-sem-aparecer.png` | l-maos-enquadramento, l-close-produto, l-narracao |
| | Sua vitrine viral do zero | `sua-vitrine-viral-do-zero.png` | (na área de membros atual) |
| | Live Shop | `live-shop.png` | (na área de membros atual) |
| | NUMI: o produto exclusivo | `numi-produto-exclusivo.png` | (na área de membros atual) |
| Avatar de IA · sem aparecer | Crie seu influenciador digital | `crie-seu-influenciador-digital.png` | l-ia-primeiros-passos, l-personagem-ia |
| | Laboratório de avatares | `laboratorio-de-avatares.png` | l-consistencia, l-flow |
| | Roteirista invisível | `roteirista-invisivel.png` | l-roteiro |
| Estratégia e escala | Ajuste de rota e escala | `ajuste-de-rota-e-escala.png` | l-metricas |
| | Estratégias secretas de escala | `estrategias-secretas-de-escala.png` | (na área de membros atual) |
| | Seja reconhecida | `seja-reconhecida.png` | (na área de membros atual) |
| Suporte e acompanhamento | Suporte individual | `suporte-individual.png` | abre `/suporte` |
| | Aulas ao vivo | `aulas-ao-vivo.png` | abre `/lives` |
| | Acompanhamento MVF Scale | `acompanhamento-mvf-scale.png` | (na área de membros atual) |
| Desafio High Wealth e bônus | Desafio 21 dias High Wealth | `desafio-21-dias-high-wealth.png` | (na área de membros atual) |
| | Frequências da prosperidade | `frequencias-da-prosperidade.png` | (na área de membros atual) |
| | Áudios de autoafirmação | `audios-de-autoafirmacao.png` | (na área de membros atual) |
| | Planilha de organização financeira | `planilha-de-organizacao-financeira.png` | (na área de membros atual) |

**Todas as 23 capas foram associadas** a um módulo, pelo título impresso nelas. Correções de nome
de arquivo feitas na cópia:
- `sua-vtirine-viral-do-zero.png` → `sua-vitrine-viral-do-zero.png`
- `roterista invisivel.png` → `roteirista-invisivel.png`

**Associações a confirmar com a equipe:**
- os trilhos de cada módulo;
- a distribuição das aulas de exemplo;
- se “Virando creator” e “Sua vitrine viral” pertencem à Formação ou a outro grupo;
- a ordem dos módulos.

Para mudar, edite `src/demo/member-area.ts`. Os testes em `src/lib/demo/member-area.test.ts`
garantem que toda capa existe e que cada aula pertence a um único módulo.

## Recomendado para você

A função `recommendModules(perfil)` é determinística e usa as respostas do onboarding:
- **Iniciante:** Primeiros passos e Configurações essenciais.
- **Quer aparecer:** Venda usando sua imagem.
- **Avatar de IA:** Crie seu influenciador e Laboratório de avatares.
- **Mãos, narração ou não aparecer:** Venda sem aparecer.
- **Bloqueio em roteiros:** Roteirista invisível vem primeiro.
- **Todos os perfis:** sempre inclui o Protocolo pré-postagem.

Sem perfil, a recomendação é o trilho “Primeiros passos”.

## Honestidade na tela
- Selos “Demonstração · aulas de exemplo” (hero), “Organização de exemplo” (módulo) e “Aula de exemplo”.
- Sem vídeo: “Vídeo de exemplo ainda não adicionado”. Nenhuma mídia fictícia.
- Módulos sem aulas de exemplo: “Na área de membros atual”, sem prometer data.
- Fora do modo demo, `/aulas` continua “Em breve” (`DemoModule`).

## Quando houver conteúdo real
- **Vídeos:** preencha `video` em `getLessonDetail` (`src/demo/library.ts`) com uma URL permitida.
- **Aulas reais:** substitua as aulas de exemplo pelos IDs reais. Nunca renomeie IDs já usados no progresso.
