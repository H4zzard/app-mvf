# Gravação mobile — demonstração do App MVF

Guia para gravar anúncios com a plataforma **na tela de um celular**, usando o **modo demo local**:
dados de exemplo, nada enviado a serviços externos. Nada aqui toca Supabase, Kiwify, Google Flow,
e-mail ou checkout.

> **Status:** testado em navegador com emulação de celular e pelo IP da rede local a partir do Mac.
> **O teste em iPhone/Android físico está PENDENTE DE TESTE HUMANO** (checklist na seção 6).

## 1. Subir no Mac e abrir no celular (mesma rede Wi-Fi)

```bash
cd "/Users/lucaslopes/Documents/app mvf"
export PATH="$HOME/.local/node/bin:$PATH"
npm run dev:lan
```

O comando:
1. Descobre o IP do Mac na rede local (Wi-Fi, `en0`). Para forçar outro: `npm run dev:lan -- 192.168.x.x`.
2. Escolhe uma porta livre a partir da 3000 e avisa se precisou trocar.
3. Liga o modo demo **só neste processo de desenvolvimento**. Em produção a flag é ignorada.
4. Esconde o indicador de desenvolvimento do Next para ele não aparecer no vídeo.
5. Aquece as 19 telas e imprime a URL:
   ```
   ✔ Pronto. No celular (mesma rede Wi-Fi), abra:
      http://192.168.x.x:3000/inicio
   ```

No celular, conectado **ao mesmo Wi-Fi**, abra a URL no Safari (iPhone) ou no Chrome (Android).

**Se algo der errado:**
- **“Já existe um npm run dev rodando nesta pasta”:** o Next só permite um servidor de
  desenvolvimento por pasta. Feche o outro (Ctrl+C na janela dele ou o `kill <PID>` indicado) e rode
  `npm run dev:lan` de novo.
- **Não abre no celular:**
  - Os dois aparelhos precisam estar na mesma rede. Redes de visitante costumam isolar os aparelhos.
  - Libere o Node no firewall do macOS (Ajustes → Rede → Firewall).
- **Primeira abertura lenta:** o modo dev compila cada tela na primeira visita. O aquecimento já
  faz isso, mas percorra as telas uma vez antes de gravar.
- **Segurança:** sem túnel e sem Internet. A porta só fica acessível na rede local; não use em Wi-Fi
  público. Nenhum segredo chega ao navegador.

## 2. Preparar cada gravação

1. **Celular:** modo Não Perturbe, brilho alto, rotação travada na vertical, tema claro, zoom e
   tamanho de texto do sistema no padrão.
2. **Cenário:** toque em **Mais → Controles da demo → Cenário para gravação**:

   | Cenário | O que mostra | Melhor para |
   |---|---|---|
   | **Nova aluna** | Primeiro acesso, sem plano | Mostrar o onboarding |
   | **Aluna com plano** | Plano personalizado da persona fictícia “Marina”, primeiros passos feitos | Roteiro de 30 s |
   | **Aluna em evolução** | ~60% do plano, aulas, favoritos, live na agenda | Roteiros de 60 e 90 s |

3. **Manter ao recarregar:** desligado por padrão. Ligue nos Controles da demo antes de gravar.
   - Ligado, a demo sobrevive a um recarregamento acidental **nesta aba** (`sessionStorage`). Ao
     fechar a aba, tudo some.
   - Desligado, recarregar volta ao início. Nesse caso, grave cada sequência sem recarregar.
   - A regra permanente do projeto ainda diz que a demo vive em memória; ver D59 em `docs/DECISOES.md`.
4. **Resetar demonstração:** dois toques. Volta à trilha de exemplo com tudo zerado; repita
   antes de cada tomada.

## 3. Roteiros de gravação

A sequência conta a história **plano personalizado → aula recomendada → catálogo estilo streaming →
inspiração em vídeos virais → roteiro/prompt → comunidade → gamificação**.

### 30 segundos · cenário “Aluna com plano”

| Tempo | Tela | Toques | O que aparece | Benefício mostrado |
|---|---|---|---|---|
| 0–5 s | Início | — | “Olá, Marina”, **Seu próximo passo** | O app responde “o que faço agora?” |
| 5–10 s | Aula | **Abrir aula** | Capa do módulo, “Essa aula faz parte do seu plano” | Plano e aula conectados |
| 10–17 s | Aulas | Barra → **Aulas**, deslizar o trilho “Recomendado para você” | Hero Formação MVF, capas oficiais | Catálogo premium estilo streaming |
| 17–23 s | Virais | Barra → **Virais**, tocar um card → **Usar no Estúdio IA** | Abre a ferramenta certa com “Inspirado em” | Inspiração organizada |
| 23–30 s | Estúdio IA | Em **Roteiros para Gravar Aparecendo**: **Hidratante facial**, descrição e modo de uso já digitados → **Gerar 10 roteiros** | Dez roteiros diferentes, prontos para gravar | Roteiro pronto para gravar com o celular |

### 60 segundos · cenário “Aluna em evolução”

| Tempo | Tela | Toques | O que aparece |
|---|---|---|---|
| 0–6 s | Início | — | Próximo passo, 62% do plano, faixa Formação MVF |
| 6–14 s | Plano | Barra → **Plano**, marcar uma tarefa | Progresso subindo, etapas |
| 14–24 s | Aula | Barra → **Aulas** → tocar um módulo → abrir aula → **Marcar como concluída** | Sheet do módulo, aula concluída |
| 24–32 s | Aulas | Voltar e deslizar dois trilhos | Capas oficiais por trilho |
| 32–42 s | Estúdio | Estúdio IA → **Criar Personagem** → **Gerar prompt** → **Usar no Animador** → escolher roteiro → **Gerar prompts de animação** → **Copiar tudo** | Takes com a fala exata, “Copiado!” |
| 42–50 s | Comunidade | Mais → **Comunidade** → **Compartilhe algo** → publicar | Postagem marcada “Você” |
| 50–60 s | Conquistas | Mais → **Conquistas** | Nível, XP e selos atualizados |

### 90 segundos · cenário “Aluna em evolução”

Faça o roteiro de 60 s e acrescente:

| Tempo | Tela | Toques | O que aparece |
|---|---|---|---|
| 60–70 s | Desafios | Aba **Desafios** → **Participar** em “Uma aula hoje” → concluir uma aula → **Resgatar +10 XP** | Missão concluída, XP no histórico |
| 70–80 s | Ranking | Aba **Ranking** | Pódio com perfis **(exemplo)** e “Sua posição” |
| 80–90 s | Recompensas | Aba **Recompensas** → card “Disponível” → **Resgatar** → **Confirmar** | “Resgate simulado registrado”, saldo atualizado |

Para começar pelo onboarding, use **Nova aluna** e mostre 3–4 perguntas antes do Início.

## 4. Avisos honestos para a publicidade

- **Rótulos de demonstração:** toda tela de módulo mostra um, como “Referências de exemplo”,
  “Produtos demonstrativos”, “Comunidade de demonstração”, “Pontos de demonstração” e “Ranking de
  demonstração”. **Não recorte o vídeo para escondê-los** nem apresente o conteúdo como real.
- **Perfis fictícios:** os da Comunidade e do Ranking (ex.: “Júlia (exemplo)”, “Carla (exemplo)”,
  “Equipe MVF (exemplo)”) não são alunas reais. Não os use como depoimento nem como prova social.
- **Nada de números de venda:** não há vendas, GMV, comissões nem visualizações. O ranking é só de
  XP de engajamento. Não sobreponha números ao vídeo.
- **Pontos não são dinheiro:** XP e pontos medem engajamento. Recompensas e resgates são simulados,
  sem estoque nem envio.
- **Sem promessas:** fale em “possibilidade” da primeira comissão, nunca em resultado garantido ou
  renda.
- **Estúdio IA:** escreve **só texto**: prompts de imagem e de vídeo para colar no Google Flow e
  roteiros para gravar. O app não cria imagem, voz nem vídeo, e não se conecta ao Flow. Na demo os
  textos vêm de um **modelo local**: não diga que uma IA (DeepSeek ou outra) gerou o resultado.
- **Funcionalidades simuladas:** comunidade, lives, suporte, loja, materiais e virais são
  demonstração. Não anuncie como integrações reais.
- **Assets oficiais:** a logo da NUMI, o banner e as capas dos módulos são oficiais. As aulas
  dentro dos módulos são exemplos, e o nome “App MVF” ainda é provisório.

## 5. Copiar pelo IP da rede local

Em http na rede local, o navegador não libera a Clipboard API. O botão **Copiar** usa um método
alternativo e só mostra “Copiado!” quando o navegador confirma a cópia. Se a cópia falhar, aparece
“Não foi possível copiar” e o texto continua selecionável.
Testado no Chrome do Mac pelo IP local. **Safari/iOS e Chrome/Android: PENDENTE DE TESTE HUMANO.**

## 6. Checklist no celular físico (antes de aprovar a gravação)

Marque cada item no iPhone e/ou Android que será usado. Itens não testados ficam pendentes.

- [ ] A URL do `npm run dev:lan` abre no celular pelo Wi-Fi.
- [ ] Na primeira abertura de cada tela, a espera é curta (sem tela branca longa).
- [ ] Logo, banner e capas carregam nítidos. Rosto e textos das capas sem cortes.
- [ ] A barra inferior não cobre conteúdo nem botões. A área segura do iPhone (notch e barra de
      gestos) é respeitada.
- [ ] Toques respondem na primeira tentativa: barra inferior, Mais, cards, chips, “Concluir”.
- [ ] Trilhos de Aulas deslizam suaves com o dedo e param em cada capa.
- [ ] Sheets (módulo, viral, recompensa) abrem e fecham pelo X e tocando fora, sem travar a rolagem.
- [ ] Teclado: busca, Estúdio (produto), comentário e postagem não dão zoom e não escondem o botão de
      enviar.
- [ ] Botão **Copiar** no Estúdio mostra “Copiado!” e o texto cola no app de notas. Se mostrar “Não
      foi possível copiar”, registrar o navegador.
- [ ] Cenário e Reset funcionam. Com “Manter ao recarregar” ligado, puxar para recarregar mantém o
      estado; desligado, volta ao início.
- [ ] Leitura em tamanho real: títulos e rótulos de demonstração legíveis no vídeo.
- [ ] Celular em **modo claro** (o app não tem tema escuro). Gravações com modo escuro do sistema não
      mudam o app, mas confira se a barra de status fica legível.
- [ ] O indicador de desenvolvimento do Next não aparece.

## 7. Importar os roteiros validados (futuro)

Os modelos ficam em `src/demo/studio-templates.ts` (tipo `ScriptTemplate`). Os 100+ roteiros
validados entram no mesmo formato, com `source: "validado"`:

```ts
{
  id: "tpl-<slug-estável>",
  title: { pt: "…", en: "…" },
  summary: "…",
  source: "validado",
  beats: [{ label: { pt, en }, visual: { pt, en }, line: { pt, en } }], // use {produto} onde couber
}
```

O gerador (`src/lib/studio/prompt-builder.ts`) cria uma cena por parte, divide a duração e mantém o
checklist sem promessas. IDs de modelo são estáveis: não renomeie depois de publicados.

## 8. O que é mock e o que é real

| Tela | Na demo | Para alunas reais (produção) |
|---|---|---|
| Início, Meu Plano, Onboarding | Motor real de personalização; estado da demo | Persistido no Supabase (Prompt 03, ainda não homologado) |
| Aulas, Virais, Estúdio IA, Comunidade, Marketplace, Conquistas, Desafios, Ranking, Recompensas, Materiais, Regras & FAQ, Lives, Suporte, Perfil | Interativos com dados de exemplo | “Em breve” honesto (nenhum dado de exemplo é renderizado) |
| Minhas Vendas | Estado vazio honesto | Estado vazio honesto |
| Admin | Placeholder visual (papel demo) | Protegido por papel no servidor |

O modo demo só existe com `npm run dev` (ou `dev:lan`) + `MVF_DEMO_MODE=true`. O build de produção
ignora a flag e, sem configuração, mantém a área privada fechada (verificado).
