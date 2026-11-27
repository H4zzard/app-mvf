# Retenção de atendimentos da Nina — PROPOSTA para aprovação

> **Status: proposta (27/11/2026).** Nada aqui está em vigor. O app **não apaga nada automaticamente**
> (`support_settings.retention_days` está vazio e nenhum job chama `support_purge_expired()`).
> Os prazos abaixo são **opções** para a empresa decidir com a assessoria jurídica. Não são recomendação
> jurídica nem prazos definitivos.

## 1. O que é guardado

| Dado | Onde | Quem lê |
|---|---|---|
| Mensagens do chat (texto, remetente, horário, botões de aula) | `support_messages` | a própria aluna (só essas colunas, RLS); equipe pelas funções auditadas |
| Transcrição TXT do atendimento encerrado | `support_conversations.transcript` | só servidor e equipe (`support:history`), com registro |
| Resumo interno da conversa, fontes e metadados técnicos (provedor, tokens) | `support_conversations.summary`, `support_messages.sources/meta` | só servidor e equipe |
| Nome exibido, status, motivo do encerramento, pedido de atendimento humano | `support_conversations` | aluna (próprios) e equipe |
| Registro de acesso da equipe (quem leu/exportou o quê) | `admin_audit_log` | só service role |

O que **não** é guardado:
- e-mail e CPF no TXT;
- senha, código e cartão (são bloqueados antes de enviar);
- prompt completo do modelo.

A DeepSeek recebe só um id anônimo e os trechos da conversa necessários à resposta. A política de
retenção do lado do fornecedor precisa ser conferida no contrato ou nos termos da DeepSeek. Isso está
**a confirmar** pela empresa.

## 2. Finalidades (a confirmar pela empresa)

1. **Prestar o atendimento:** continuidade da conversa e encaminhamento para a equipe humana.
2. **Qualidade e segurança:** revisar respostas erradas da Nina e corrigir a base de conhecimento.
3. **Defesa da empresa:** registro do que foi orientado, se houver reclamação ou disputa.

Conversas **não** são usadas para treinar modelos nem entram na base de conhecimento.

## 3. Necessidade: o que cada finalidade precisa

| Finalidade | Precisa de | Por quanto tempo (opções para decidir) |
|---|---|---|
| Atendimento | mensagens + status | enquanto o atendimento está aberto e por um período curto depois, para retomada pela equipe |
| Qualidade | TXT e resumo | período limitado de revisão (ex.: opção A 90 dias, opção B 180 dias, opção C 12 meses) |
| Defesa | TXT | só se a assessoria jurídica indicar prazo legal ou contratual aplicável. **Não presumir.** |
| Auditoria de acesso | `admin_audit_log` | definir junto com a política geral de logs da empresa |

Decisão necessária:
- **um prazo único** para `retention_days`; ou
- **prazos diferentes** para mensagens e para o TXT. Esta opção exige ajuste no código e uma nova migration.

## 4. Acesso

- Aluna: vê as próprias mensagens no chat enquanto tem acesso ativo ao curso. Não vê nem baixa o TXT.
- Equipe: só papéis `admin` e `support`, atribuídos por CLI auditado (`npm run admin:role`). Cada
  listagem, leitura e exportação fica em `admin_audit_log` com o autor, a ação e a aluna.
- Moderação, expert e alunas não têm acesso.
- Proposta: revisar trimestralmente quem tem papel `support`, a partir da lista `user_roles`.

## 5. Exclusão

### 5.1 Automática, depois de aprovada

1. Operador grava o prazo aprovado:
   ```sql
   update public.support_settings set retention_days = <N> where id;
   ```
   Vale para os atendimentos **encerrados a partir daí**. `retention_until` é calculado no
   encerramento.
2. Os encerrados antes disso continuam com `retention_until` vazio. Aplicar a eles só com decisão
   explícita (SQL revisado antes de rodar).
3. Um job agendado (ainda não existe) chama `select public.support_purge_expired();` com o service
   role. A função apaga as conversas vencidas e, em cascata, as mensagens.

### 5.2 Sob pedido da titular

Procedimento proposto, ainda não automatizado:
1. Confirmar a identidade pelo canal oficial.
2. Localizar os atendimentos com a ferramenta da equipe (`support_admin_list`, que fica registrada).
3. Apagar com o service role, no SQL Editor, depois de revisar:
   ```sql
   delete from public.support_conversations where user_id = '<uuid da aluna>';
   ```
4. Registrar o pedido e a data no controle da empresa.

Se a conta inteira for excluída do Auth, os atendimentos são apagados em cascata.

## 6. Solicitações de titulares (LGPD, art. 18)

| Pedido | Como atender hoje |
|---|---|
| Confirmação e acesso | a equipe exporta o TXT pela rota `/api/admin/suporte/<id>/transcricao` (registrada) e entrega por canal seguro, nunca por link público |
| Correção | atendimentos são registros históricos. Anotar a correção no atendimento humano, sem reescrever o TXT |
| Eliminação | §5.2 (respeitando eventual obrigação legal de guarda indicada pela assessoria) |
| Informação sobre compartilhamento | informar o uso de provedor de IA (DeepSeek) para gerar respostas |
| Portabilidade | TXT em UTF-8 |

Prazo de resposta e canal oficial: **a definir pela empresa**.

## 7. Obrigações legais

**A confirmar com a assessoria jurídica.** Não há prazo legal presumido neste documento. Pontos para
levar à assessoria:
- relação de consumo (curso);
- eventual guarda de registros de acesso a aplicação;
- transferência internacional de dados para o provedor de IA;
- base legal de cada finalidade.

## 8. Itens para aprovação

- [ ] Finalidades (§2)
- [ ] Prazo(s) de retenção (§3) e se mensagens e TXT têm prazos diferentes
- [ ] Prazo do `admin_audit_log`
- [ ] Procedimento de exclusão sob pedido e canal oficial (§5.2, §6)
- [ ] Revisão do texto de aviso no chat e da política de privacidade do app
- [ ] Conferência dos termos de retenção da DeepSeek
- [ ] Autorização para criar o job de expurgo (só depois dos itens acima)
