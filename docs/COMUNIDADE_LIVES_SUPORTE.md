# Comunidade, Lives e Suporte

> **Regra central:** na demonstração, nada sai do navegador. Publicações, denúncias, lembretes e
> solicitações ficam só na memória da sessão, e a interface **nunca** diz que a equipe recebeu algo.
> Perfis, publicações e encontros fictícios são sempre rotulados como exemplo.

## Comunidade (`/comunidade`)

O que a tela faz:
- **Feed:** espaços, busca (ignora acentos) e filtro por tipo.
- **Nova publicação:**
  - modelos Dúvida, Conquista, Aprendizado e Experiência, com texto-guia entre colchetes que precisa ser trocado;
  - vínculo opcional com uma **aula** do catálogo ou um **desafio**;
  - aviso quando o texto cita valores de venda.
- **Ações:** curtir, comentar, editar e excluir as próprias publicações (com confirmação).
- **Celular:** botão “Publicar” fixo acima da barra inferior.

### Salas exclusivas (Elite+ e Icon)

- Ficam **bloqueadas** por padrão.
- Em “Ferramentas da demonstração” é possível **simular o plano**, sempre rotulado como “não é autorização real”.
- Cada plano libera só a própria sala: não presumimos hierarquia entre Elite+ e Icon (regra em aberto).
- No app real, o plano vem do servidor (permissões da aluna) e da RLS.

### Denúncias

- Motivos: spam, ofensa, promessa de ganho ou informação falsa, dados pessoais e outro (este exige observação).
- Uma denúncia por item, e nunca do próprio conteúdo.
- O registro é **local**; a tela diz “Nada foi enviado à equipe”.

### Moderação

- “Visualizar como: Moderação (simulação)” mostra a **fila** com as opções Manter e Ocultar.
- A tela usa `can(roles, "community:moderate")` da matriz única (`src/lib/auth/permissions.ts`).
  Não há segunda estrutura de papéis nem rota administrativa nova.
- **Conteúdo oculto:**
  - some do feed de todas;
  - a autora continua vendo, com o aviso “Oculta pela moderação (simulação)”;
  - não aceita comentários novos.

### XP (sem duplicar)

`participationCounts` (`src/lib/community/rules.ts`) é a regra única de contagem:
- só vale publicação ou comentário **publicado**, com texto mínimo e **sem repetir texto**;
- o redutor também recusa publicar duas vezes o mesmo texto;
- `computeXp` aplica teto: até 4 publicações (5 XP cada) e 10 comentários (2 XP cada);
- curtir e denunciar não dão XP;
- as missões de comunidade continuam funcionando, com linha de base.

## Lives e encontros (`/lives`)

- **Abas:** Próximas, Anteriores e Minha agenda.
- **Próximas:** o primeiro encontro aparece em destaque. Os cards mostram um bloco de data (dia, mês
  e hora no fuso do evento) ou “A confirmar”, além de temas e público (ex.: Exclusivo Elite+).
- **Detalhe:** quando, com quem, descrição, temas, transmissão, gravação, aulas e materiais.
- **Transmissão:** o link só aparece com evento agendado ou ao vivo e link cadastrado. Antes disso:
  “O link será divulgado pela equipe”.
- **Gravação (replay):** só com encontro encerrado, mídia cadastrada **e** `replayAuthorized`.
  Reaproveita o `LessonPlayer` e o `playbackState` das aulas (YouTube e Vimeo incorporados; Kiwify e
  arquivo próprio ficam como “integração pendente”). Sem isso, aparece um estado vazio profissional,
  nunca vídeo fictício.
- **Lembrete:** “Quero ser lembrada” só põe o encontro em “Minha agenda (simulação)”. Nada é agendado
  nem enviado, porque não existe serviço de notificações.
- **Dados:**
  - `src/content/agenda-oficial.json` é a agenda oficial, hoje **vazia**;
  - `src/demo/agenda.ts` guarda os exemplos, que o schema impede de ter data, link ou gravação;
  - o acesso é único, por `eventCatalog` (`src/lib/events`).

### Campos de um evento oficial

| Campo | Regra |
|---|---|
| `id` | Estável, `minúsculas-e-hífens`. |
| `title`, `host`, `description`, `topics[]` | — |
| `kind` | `live`, `plantao` ou `encontro`. |
| `schedule` | `{ status: "a_confirmar" }` ou `{ status: "agendado", startsAt: "2026-12-04T20:00:00-03:00", timeZone: "America/Sao_Paulo", durationMin: 60 }`. |
| `streamUrl` | `https` ou `null`. |
| `ended` | Encontro passado sem data cadastrada. |
| `replay` | `MediaRef` das aulas: `{ kind: "externo", provider: "youtube" \| "vimeo" \| "kiwify", ref }`. Vai junto com `replayAuthorized`. |
| `materialIds[]`, `lessonIds[]` | Conferidos por teste contra o catálogo. |
| `audience` | `todas`, `Elite+` ou `Icon`. |
| `origin` | `oficial`. |

## Central de ajuda (`/suporte`)

- **Busca:** tolera acentos, maiúsculas, plural, variações simples (“vídeos/vídeo”,
  “comissões/comissão”, “gravação/gravar”) e sinônimos do domínio (login ≈ acesso ≈ entrar). Quando
  nenhum item tem todos os termos, mostra os mais próximos.
- **Atalhos:** Acesso e login, Aulas e plano, TikTok Shop, Criação de conteúdo e Estúdio IA. Cada
  atalho filtra o conteúdo, recomenda aulas e materiais **do catálogo atual** e sugere a categoria da
  solicitação.
- **Problemas comuns:** passos curtos, com links para as telas do app.
- **Perguntas frequentes:** as 6 primeiras, com “Ver todas”.
- **Conteúdo honesto:** só fatos sobre o uso do app. Regras do TikTok Shop e comissões remetem às
  aulas oficiais e ao suporte.
- **Solicitação (ticket):**
  - campos: assunto, categoria e descrição, com erros claros e foco no primeiro campo com erro;
  - **dados sensíveis bloqueados:** senha, código ou token, CPF e cartão. A tela avisa enquanto a aluna digita;
  - antes de enviar, sugere aulas relacionadas;
  - **Salvar rascunho** ou **Simular envio**, com o status “Simulação · não enviado”. Nunca “recebido”;
  - “Minhas solicitações” permite continuar um rascunho ou excluir.
- **Canais oficiais:** `SUPPORT_CHANNELS` está **vazio** até a equipe informar.
- **Assistente MVF (chat):** seção “Fale com a Nina” no topo da Central → `/suporte/chat`. Ver `docs/SUPORTE_IA.md`.

## Ajustes gerais (Prompt 12)

- **HTTP 404 real** para `/aulas/<id>` e `/marketplace/<id>` inexistentes.
  - O Proxy reescreve antes da renderização (`src/lib/routing/unknown-detail.ts`). Com Cache
    Components, o `notFound()` dentro da página chega depois do início do streaming (status 200).
  - Rotas válidas e aliases de aulas continuam iguais.
  - Sem sessão, a pré-filtragem manda para `/login` antes, para não revelar quais IDs existem.
- **Abas em uma linha:** novo `Segmented` (`src/components/ui/segmented.tsx`), usado no Marketplace e
  nas Lives. Abaixo de 380 px mostra um rótulo curto, mantendo o nome acessível completo.

## Armazenamento

A restauração opcional da demo (D59) não mudou. Denúncias (com observação livre), tickets (com
descrição livre) e a simulação de plano ou papel **nunca** vão para o armazenamento do navegador.

## O que a equipe precisa fornecer

1. **Comunidade:**
   - regras de convivência oficiais;
   - quem modera (papéis `moderator` e `admin` no banco);
   - prazos de análise de denúncia;
   - quais espaços existem no lançamento;
   - se Icon inclui Elite+;
   - o que acontece em cada sala exclusiva;
   - os comunicados iniciais de “Avisos NUMI”.
2. **Lives:**
   - agenda real: título, apresentadora, data, hora, fuso, duração e link;
   - política de gravação: onde fica hospedada, quem pode ver e por quanto tempo;
   - materiais e aulas de cada encontro;
   - canal de lembrete (e-mail, push ou WhatsApp) e consentimento.
3. **Suporte:**
   - canais oficiais (e-mail, WhatsApp, horário) e prazo de resposta;
   - categorias definitivas;
   - FAQ aprovado (incluindo TikTok Shop);
   - quem atende cada categoria (papel `support`);
   - política de dados (LGPD) para tickets.

## Integração real (próximas fases)

Todas as escritas seguem por Server Action → validação → função SQL com RLS, como o plano.

- **Banco:**
  - `posts`, `comments`, `reactions` e `reports`, com estado de moderação;
  - `events`, `event_rsvps`;
  - `support_tickets` e `ticket_messages`, com `assignee_id`, permissão `support:assign` e
    histórico de status.
- **Limites no servidor:** taxa de publicação e comentário por aluna, tamanho, texto repetido e
  denúncias por dia.
- **Notificações:** só com serviço real e consentimento. Até lá, o lembrete continua simulado.
