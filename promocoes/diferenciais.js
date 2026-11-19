const lista = new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' });

const pesquisados = {
  '85308': {
    fatos: [
      'A base vegetal com glicerina e extratos naturais forma uma espuma cremosa que limpa sem ressecar, segundo a Eudora.',
      'O aroma combina a cremosidade do karité com um buquê floral suave. A caixa traz quatro barras de 80 g.',
    ],
    fonte: 'https://www.eudora.com.br/produto/sabonete-vegetal-em-barra-perfumado-instance-karite-4x80g-v2/',
  },
  '85313': {
    fatos: [
      'A base vegetal com glicerina faz espuma cremosa para limpar sem ressecar. A fórmula é vegana e sem parabenos.',
      'A fragrância combina maracujá com flores brancas. A embalagem traz quatro barras de 80 g.',
    ],
    fonte: 'https://www.eudora.com.br/produto/sabonete-vegetal-em-barra-perfumado-instance-maracuja-4x80g-v2/',
  },
  '85369': {
    fatos: [
      'A fórmula vegana, com glicerina e extratos naturais, faz uma espuma cremosa que limpa sem ressecar, segundo a Eudora.',
      'É uma opção frutal e adocicada, com frutas vermelhas e fundo cremoso de baunilha em quatro barras de 80 g.',
    ],
    fonte: 'https://www.eudora.com.br/produto/sabonete-vegetal-em-barra-perfumado-instance-frutas-vermelhas-4x80g-v2',
  },
  '85395': {
    fatos: [
      'A glicerina vegetal atua como umectante. A marca destaca a espuma cremosa e a preservação do pH da pele.',
      'O contraste de ameixa com praliné dá à perfumação um lado frutado e adocicado. A caixa traz quatro barras de 80 g.',
    ],
    fonte: 'https://www.eudora.com.br/produto/sabonete-vegetal-em-barra-perfumado-instance-ameixa-e-praline-4x80g-v2/',
  },
  '88065': {
    fatos: [
      'A base vegetal vegana faz uma espuma cremosa para limpar sem ressecar, segundo a marca.',
      'A caixa permite experimentar quatro fragrâncias de Instance em um único item. São Frutas Vermelhas, Karité, Maracujá e Ameixa e Praliné.',
    ],
    fonte: 'https://www.eudora.com.br/produto/sabonete-vegetal-em-barra-perfumado-sortidos-instance-eudora-4x80g/',
  },
  '53504': {
    fatos: [
      'A fórmula combina creatina, complexo Liss Effect e biotecnologia Affinité 4D.',
      'A marca indica a limpeza hidratante para fios lisos naturais ou alisados. O shampoo prepara os fios para a etapa de condicionamento da linha.',
    ],
    fonte: 'https://www.eudora.com.br/shampoo-siage-liso-intenso-250ml-v3/',
  },
  '53505': {
    fatos: [
      'O condicionador combina creatina, complexo Liss Effect e biotecnologia Affinité 4D.',
      'A marca destaca o desembaraço imediato para facilitar a escovação e o alinhamento em fios lisos ou alisados.',
    ],
    fonte: 'https://www.eudora.com.br/produto/condicionador-siage-liso-intenso-200ml-v3/',
  },
  '55104': {
    fatos: [
      'A fórmula micelar limpa a raiz e ajuda a equilibrar a oleosidade sem ressecar os fios, segundo a marca.',
      'É um shampoo vegano de 230 ml em embalagem com plástico vegetal.',
    ],
    fonte: 'https://www.boticario.com.br/shampoo-vinagre-de-framboesa-cuidese-bem-feira-230ml/',
  },
  '88555': {
    fatos: [
      'A tecnologia lamelar e os aminoácidos são voltados à reparação da fibra. A marca descreve ação de 15 segundos para equilibrar o pH dos fios.',
      'É um tratamento de enxágue para usar nos fios limpos, do comprimento às pontas.',
    ],
    fonte: 'https://www.boticario.com.br/acidificante-capilar-match-lab-tri-acao-100ml',
  },
  '89857': {
    fatos: [
      'A limpeza tem foco no couro cabeludo oleoso. O Boticário descreve sensação de cabelo recém-lavado por 24 horas sem ressecar o comprimento.',
    ],
    fonte: 'https://www.boticario.com.br/produto/shampoo-match-oleosidade-controlada-300ml/',
  },
  '94285': {
    fatos: [
      'A formulação tem 91,7% de ingredientes de origem natural, segundo O Boticário.',
      'O acorde de leite dá uma direção doce e suave ao body splash, pensado para o pós-banho.',
    ],
    fonte: 'https://www.boticario.com.br/produto/body-splash-cuidese-bem-deleite-200ml-v3',
  },
  '84387': {
    fatos: [
      'O álcool vínico é obtido da fermentação da uva e envelhecido em barris de carvalho francês.',
      'A bergamota e a pimenta contrastam com patchouli e musgo na assinatura amadeirada do Malbec original.',
    ],
    fonte: 'https://www.boticario.com.br/malbec-desodorante-colonia-100ml-v7/',
  },
  '87014': {
    fatos: [
      'A proposta chipre floral usa ameixa e maçã vermelha para dar uma abertura frutada à fragrância.',
      'O jasmim sambac dá corpo ao lado floral. O âmbar e as notas cremosas aparecem no fundo.',
    ],
    fonte: 'https://www.eudora.com.br/produto/eudora-rouge-eau-de-parfum-75ml-v2/',
  },
};

export function pesquisarDiferenciais(produto) {
  const pesquisa = pesquisados[produto.sku];
  const fatos = pesquisa?.fatos ?? [
    produto.ativosVenda?.length && `A ficha destaca ${lista.format(produto.ativosVenda)}.`,
    produto.atributosVenda?.length && `A marca destaca ${lista.format(produto.atributosVenda)}.`,
    produto.notasVenda?.length && `A composição traz notas de ${lista.format(produto.notasVenda.slice(0, 4))}.`,
  ].filter(Boolean);
  if (!fatos.length && produto.diferencial) fatos.push(produto.diferencial);
  if (!fatos.length && produto.beneficio) fatos.push(produto.beneficio);
  const medida = produto.volume ?? produto.nome.match(/\b(\d+(?:[.,]\d+)?)\s*(ml|g)\b/i)?.slice(1).join(' ').toLowerCase();
  if (!fatos.length && medida) fatos.push(`A apresentação identificada na revista é de ${medida}.`);
  return {
    fatos,
    fonte: pesquisa?.fonte ?? produto.fonte,
    rotuloFonte: pesquisa?.fonte ? 'Conferir ficha oficial da marca' : 'Conferir na revista oficial',
  };
}
