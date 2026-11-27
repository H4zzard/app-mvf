/**
 * Perguntas de referência da Nina (controle de qualidade). Usadas:
 *  - no teste local (`nina.test.ts`), com o modelo local — sem custo;
 *  - na avaliação opcional com a DeepSeek real (`npm run nina -- eval --yes`).
 * As expectativas valem para os DOIS: regras de produto (botão de aula, equipe,
 * encerramento) e de estilo; conteúdo exato só onde a base garante. Módulo puro.
 */
export interface ReferenceCase {
  id: string;
  category: string;
  /** Mensagens da aluna, em ordem (a última é a avaliada). */
  turns: string[];
  expect: {
    /** Pelo menos um destes termos aparece na resposta (ou nos botões). */
    mentionsAny?: string[];
    /** Botão “Abrir aula” esperado para uma destas aulas; "none" = nenhum botão. */
    lessonAction?: string[] | "none";
    /** Deve oferecer a equipe humana. */
    handoff?: boolean;
    /** O servidor deve encerrar sozinho. */
    autoClose?: boolean;
  };
}

export const REFERENCE_CASES: ReferenceCase[] = [
  { id: "aula-maos", category: "Localização de aulas", turns: ["Não tô achando a aula que ensina a gravar só as mãos com o produto"], expect: { lessonAction: ["l-close-produto", "l-maos-enquadramento"] } },
  { id: "aula-personagem", category: "Localização de aulas", turns: ["Qual aula ensina a criar personagem com IA?"], expect: { lessonAction: ["l-personagem-ia", "l-ia-primeiros-passos", "l-consistencia"] } },
  { id: "aula-roteiro", category: "Localização de aulas", turns: ["onde tem aula de roteiro?"], expect: { lessonAction: ["l-roteiro"] } },
  { id: "aula-perfil-inexistente", category: "Ausência de informação oficial", turns: ["Não tô achando a aula que ensina a configurar meu perfil no TikTok."], expect: { lessonAction: "none", mentionsAny: ["Plano", "perfil", "etapa"] } },
  { id: "modulo-sem-aparecer", category: "Localização de módulos", turns: ["Em qual módulo fala de vender sem aparecer?"], expect: { mentionsAny: ["sem aparecer", "Venda no TikTok sem aparecer"] } },
  { id: "nav-ranking", category: "Navegação no aplicativo", turns: ["Onde fica o ranking?"], expect: { mentionsAny: ["Perfil"], lessonAction: "none" } },
  { id: "nav-lives-formal", category: "Navegação (escrita formal)", turns: ["Boa tarde. Gostaria de saber onde encontro a agenda das lives."], expect: { mentionsAny: ["Tribo", "Lives e encontros"] } },
  { id: "nav-lives-giria", category: "Navegação (gírias)", turns: ["mana cadê as lives kkk"], expect: { mentionsAny: ["Tribo", "Lives e encontros"] } },
  { id: "plano-etapa", category: "Plano de ação", turns: ["Como eu concluo uma etapa do plano?"], expect: { mentionsAny: ["Concluí esta etapa"] } },
  { id: "tiktok-shop", category: "TikTok Shop", turns: ["Colocar o produto em Meus produtos já me afilia no TikTok Shop?"], expect: { mentionsAny: ["TikTok Shop", "afiliação"] } },
  { id: "sem-aparecer", category: "Criação de conteúdo sem aparecer", turns: ["Como faço um vídeo sem aparecer?"], expect: { mentionsAny: ["Criar Personagem", "Animar Personagem", "sem aparecer", "mãos"] } },
  { id: "estudio", category: "Estúdio IA", turns: ["O Estúdio cria o vídeo pra mim?"], expect: { mentionsAny: ["Google Flow", "texto"] } },
  { id: "salvar-produto", category: "Marketplace", turns: ["Como salvo um produto?"], expect: { mentionsAny: ["coração", "Salvos"] } },
  { id: "comissao", category: "Produtos", turns: ["Qual é a comissão dos produtos NUMI?"], expect: { mentionsAny: ["confirm", "A confirmar", "20%"] } },
  { id: "tribo", category: "Comunidade", turns: ["Como eu publico na Tribo?"], expect: { mentionsAny: ["Publicar", "Compartilhe algo"] } },
  { id: "pontos", category: "Gamificação", turns: ["Os pontos dos desafios valem dinheiro?"], expect: { mentionsAny: ["não são dinheiro", "Não"] } },
  { id: "regras", category: "Regras", turns: ["Onde vejo as regras da plataforma?"], expect: { mentionsAny: ["Perfil", "Regras"] } },
  { id: "cotidiano", category: "Dúvidas cotidianas", turns: ["Qual o melhor horário pra eu tomar café antes de gravar?"], expect: { lessonAction: "none" } },
  { id: "reembolso", category: "Reembolso", turns: ["Quero cancelar e pedir reembolso"], expect: { handoff: true, lessonAction: "none" } },
  { id: "pagamento", category: "Problemas de pagamento", turns: ["meu pagamento foi recusado e agora?"], expect: { handoff: true, lessonAction: "none" } },
  { id: "humano", category: "Pedido de ajuda humana", turns: ["quero falar com uma pessoa de verdade, isso é um absurdo"], expect: { handoff: true } },
  { id: "auto-close", category: "Encerramento automático", turns: ["Onde fica o ranking?", "Deu certo, obrigada!"], expect: { autoClose: true } },
  { id: "nao-fecha-ok", category: "Encerramento automático (não fecha)", turns: ["Como eu concluo uma etapa do plano?", "ok"], expect: { autoClose: false } },
];

/** Regras de estilo da Nina nas mensagens conversacionais (marcadores técnicos à parte). */
export function styleProblems(text: string): string[] {
  const t = text.replace(/\[\[[^\]]*\]\]/g, "").replace(/\b\d{1,2}:\d{2}\b/g, "");
  const out: string[] = [];
  if (t.includes(";")) out.push("ponto e vírgula");
  if (/[—–]/.test(t)) out.push("travessão");
  if (/^\s*#/m.test(t)) out.push("título de relatório");
  if ((t.match(/[💗💛😊🥰]/gu) ?? []).length > 2) out.push("emojis demais");
  if (/\b(prompt|banco de dados|supabase|deepseek|api|json|servidor)\b/i.test(t)) out.push("termo técnico interno");
  return out;
}
