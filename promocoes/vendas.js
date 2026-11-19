import { destaques } from './vendas-destaques.js?v=2';

const dinheiro = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const reais = (valor) => dinheiro.format(valor);

const roteiros = {
  refil: {
    pergunta: 'Você ainda tem a embalagem original para repor?',
    estrategia: 'Confirme a versão e a embalagem por foto. Ofereça o refil como reposição para quem já usa o produto e compare com a versão completa do mesmo tamanho.',
    valor: 'A compra faz sentido como reposição para quem já tem a embalagem compatível.',
    fecho: 'Quer me mostrar a embalagem para eu confirmar o refil?',
  },
  kit: {
    pergunta: 'Você procura um presente que já venha com mais de um item?',
    estrategia: 'Pergunte de quem é o presente e quanto a pessoa pretende gastar. Envie a imagem da revista e mostre o que vem no kit e como os itens podem ser usados juntos.',
    valor: 'Indique para quem quer resolver a compra em um conjunto. Use os itens da revista para explicar por que a combinação vale para aquela pessoa.',
    fecho: 'Quer que eu te mostre o que vem no kit?',
  },
  fragrancia: {
    pergunta: 'Que tipo de perfume você gosta de usar e em qual ocasião?',
    estrategia: 'Pergunte qual perfume a pessoa já usa. Descreva uma nota da abertura e outra do fundo. Envie a foto da revista e use o gosto dela para explicar por que este aroma encaixa.',
    valor: 'Use as notas como referência para a pessoa imaginar o cheiro. Ofereça se combinarem com os perfumes que ela já costuma comprar.',
    fecho: 'Quer me dizer um perfume que você usa para eu te ajudar a comparar?',
  },
  splash: {
    pergunta: 'Você procura algo para se perfumar depois do banho?',
    estrategia: 'Convide a pessoa a imaginar o uso logo depois do banho. Descreva o aroma com duas referências da ficha e envie a imagem do frasco para mostrar o tamanho.',
    valor: 'É uma opção para encaixar a perfumação no pós-banho. Identifique se a pessoa prefere esse tipo de produto para a rotina.',
    fecho: 'Quer que eu te mande a foto do frasco?',
    calor: 'Se a pessoa procura uma rotina leve em um dia quente, mostre como ela pode usar o body splash depois do banho.',
  },
  cabelo: {
    pergunta: 'O que você mais quer cuidar no seu cabelo agora?',
    estrategia: 'Pergunte sobre a raiz, as pontas e a rotina de lavagem. Mostre em qual etapa entra este produto e indique um complemento só se resolver outra necessidade que a pessoa relatou.',
    valor: 'Mostre onde esse produto entra na rotina. Começar por uma etapa que atende à prioridade do cliente facilita a decisão.',
    fecho: 'Quer me contar como é sua rotina para eu te mostrar onde ele entra?',
  },
  cor: {
    pergunta: 'Qual tom e acabamento você costuma usar?',
    estrategia: 'Pergunte qual cor ou acabamento a pessoa já usa. Envie a foto do tom e, se tiver, uma amostra em luz natural. Para base ou corretivo, peça uma referência do tom que ela usa hoje.',
    valor: 'Em maquiagem, a razão para escolher essa versão é o tom ou acabamento. Faça a comparação com uma cor que a pessoa já conhece.',
    fecho: 'Quer que eu te mande a imagem do tom?',
  },
  maquiagem: {
    pergunta: 'Você está procurando algo para o dia a dia ou para uma ocasião?',
    estrategia: 'Descubra que efeito a pessoa quer na maquiagem. Use a imagem da revista para mostrar a cor ou o formato e explique como usar o item em uma etapa da rotina.',
    valor: 'Mostre o papel que esse item cumpre na maquiagem que a pessoa já faz.',
    fecho: 'Quer que eu te mostre como ele se encaixa na sua maquiagem?',
  },
  solar: {
    pergunta: 'Que acabamento você prefere no protetor solar?',
    estrategia: 'Pergunte onde a pessoa pretende usar o protetor. Use o FPS e o acabamento da ficha para explicar a indicação e envie a imagem para ela conferir a apresentação.',
    valor: 'Compare o FPS e o acabamento com o protetor que a pessoa já costuma aplicar. Uma textura que ela goste pode facilitar o uso na rotina.',
    fecho: 'Quer que eu te mande a foto com os dados da embalagem?',
    calor: 'Se a pessoa vai passar tempo ao ar livre, fale do FPS anunciado e do acabamento que ela prefere no rosto ou no corpo.',
  },
  hidratacao: {
    pergunta: 'Você prefere um hidratante para depois do banho ou para levar no dia a dia?',
    estrategia: 'Descubra em que momento a pessoa quer usar o hidratante e que tipo de textura ou aroma ela prefere. Mostre o tamanho e encaixe o produto nesse momento da rotina.',
    valor: 'O tamanho, a textura e a forma de aplicação ajudam a pessoa a imaginar o produto na rotina de hidratação que ela já faz.',
    fecho: 'Quer que eu te mande a foto da embalagem?',
    frio: 'Se a pessoa comenta que sente a pele mais seca no frio, use a hidratação logo após o banho como momento de uso.',
  },
  rotina: {
    pergunta: 'Você quer esse produto para alguma necessidade da sua rotina?',
    estrategia: 'Comece pela necessidade que a pessoa relata. Use uma característica que aparece na ficha e mostre a embalagem ou a página da revista para ela poder decidir à distância.',
    valor: 'Explique como o formato ou a proposta do produto atende à necessidade que a pessoa relatou.',
    fecho: 'Quer que eu te mande a página da revista?',
  },
};

const aberturasDeClima = {
  calor: {
    fragrancia: 'Para o calor, eu buscaria algo mais leve para usar durante o dia.',
    splash: 'Em dias quentes, uma perfumação leve depois do banho pode combinar com a sua rotina.',
    solar: 'Se você vai passar parte do dia ao ar livre, o acabamento também conta na hora de escolher o protetor.',
  },
  frio: {
    fragrancia: 'Para um jantar numa noite mais fria, eu escolheria um perfume com presença.',
    hidratacao: 'Se a sua pele costuma pedir mais hidratação no frio, dá para incluir esse cuidado logo depois do banho.',
  },
  umido: {
    cabelo: 'Se seus fios arrepiam em dias úmidos, tenho uma sugestão para a sua rotina.',
  },
};

const abordagensRevenda = {
  fragrancia: {
    pergunta: 'Tem clientes procurando um perfume ou querendo testar uma fragrância nova?',
    estrategia: 'Comece por clientes que já compraram fragrâncias parecidas. Mande uma foto com duas notas da ficha e uma ocasião de uso. Conte quantas pessoas pediram antes de definir o lote.',
  },
  splash: {
    pergunta: 'Suas clientes costumam pedir uma perfumação mais leve para o pós-banho?',
    estrategia: 'Mostre o tamanho do frasco e descreva o aroma nos Status. Sinalize o uso depois do banho e abra uma lista para medir quantas clientes querem o produto.',
  },
  refil: {
    pergunta: 'Você tem clientes que já usam o produto e podem estar precisando repor?',
    estrategia: 'Fale primeiro com quem já comprou a versão completa. Peça uma foto da embalagem para confirmar compatibilidade e junte os pedidos de reposição antes de comprar.',
  },
  kit: {
    pergunta: 'Tem clientes que costumam comprar kits para presentear?',
    estrategia: 'Mostre os itens e a apresentação do kit para as clientes que já buscam presente. Monte uma lista por faixa de preço e compre de acordo com as encomendas confirmadas.',
  },
  cabelo: {
    pergunta: 'Qual necessidade de cabelo aparece mais nos pedidos das suas clientes?',
    estrategia: 'Relacione a proposta da ficha às necessidades que suas clientes já comentaram. Ofereça o item na etapa certa da rotina e agrupe os pedidos por linha antes de comprar.',
  },
  cor: {
    pergunta: 'Que tons ou acabamentos as suas clientes pedem com mais frequência?',
    estrategia: 'Use referências dos tons que as clientes já compraram. Mande a imagem da cor e encomende cada variação com o tom confirmado para reduzir sobras.',
  },
  rotina: {
    pergunta: 'Alguma cliente sua já pede um produto desse tipo?',
    estrategia: 'Use o diferencial da ficha em uma oferta curta para as clientes certas. Teste a procura por encomenda ou com poucas unidades antes de aumentar o lote.',
  },
};

const sinalDeFrizz = /anti[ -]?frizz|controle d[eo] frizz|redu[zç][^.!?]{0,25} frizz/i;
const prioridades = {
  cabelo: [
    {
      sinal: sinalDeFrizz,
      pergunta: 'Você procura um jeito de controlar o frizz na sua rotina?',
      valor: 'Ofereça para quem aponta o frizz como prioridade. Mostre onde o produto entra na rotina e como a marca indica usar.',
      estrategia: 'Pergunte quando o frizz incomoda mais e se a pessoa já usa algum finalizador. Mostre a indicação deste produto na ficha e ofereça uma etapa que ela consiga manter.',
    },
    {
      sinal: /prote[cç][aã]o t[eé]rmica/i,
      pergunta: 'Você costuma usar secador ou chapinha?',
      valor: 'A proteção térmica indicada na ficha dá um motivo concreto para oferecer a quem usa ferramentas de calor.',
      estrategia: 'Pergunte que ferramenta a pessoa usa e com que frequência. Envie as orientações de aplicação da embalagem para ela visualizar como incluir o produto antes de modelar os fios.',
    },
    {
      sinal: /oleosidade|raiz oleosa|cabelos oleosos/i,
      pergunta: 'Sua raiz costuma ficar oleosa logo depois da lavagem?',
      valor: 'A proposta para oleosidade faz sentido para quem quer priorizar esse cuidado na rotina capilar.',
      estrategia: 'Pergunte quando a raiz começa a pesar e como estão as pontas. Apresente o cuidado com a oleosidade e explique em que etapa usar o produto.',
    },
    {
      sinal: /reconstru[cç][aã]o|cabelos danificados|fios danificados|repara[cç][aã]o/i,
      pergunta: 'Você está procurando um cuidado para fios danificados?',
      valor: 'Mostre a proposta de cuidado com os danos como um motivo para encaixar este item na etapa de tratamento.',
      estrategia: 'Pergunte se a pessoa sente os fios danificados após química ou uso frequente de calor. Apresente a indicação do catálogo e mostre o modo de uso da embalagem.',
    },
    {
      sinal: /hidrata[çc][aã]o|nutri[çc][aã]o|pontas ressecadas/i,
      pergunta: 'Você procura mais maciez ou sente as pontas ressecadas?',
      valor: 'Se a pessoa procura melhorar a sensação dos fios ao toque, relacione a proposta de cuidado da ficha com a etapa que ela quer ajustar.',
      estrategia: 'Pergunte como a pessoa cuida das pontas no banho e na finalização. A partir disso, mostre onde usar este produto e quanto vem na embalagem.',
    },
  ],
  cor: [
    {
      sinal: /subtom|^base\b|\bcorretivo\b/i,
      pergunta: 'Qual tom de base ou corretivo você usa hoje?',
      valor: 'Use o tom atual da pessoa como referência para mostrar onde esta versão encaixa.',
      estrategia: 'Peça o nome e o número do tom que a pessoa já usa. Envie a referência de cor da revista e confirme se ela quer igualar o tom ou atender outra finalidade.',
    },
    {
      sinal: /mate\b|matte\b|aveludado/i,
      pergunta: 'Você gosta de acabamento mate ou prefere mais brilho?',
      valor: 'O acabamento é o ponto de comparação com o que a pessoa já usa. Mostre a cor da revista antes de recomendar.',
      estrategia: 'Compare o acabamento da ficha com o que a pessoa prefere. Envie uma imagem da cor e, se tiver, mostre a aplicação em luz natural.',
    },
  ],
};

function escolherRoteiro(produto) {
  const tipo = produto.tipo.toLowerCase();
  if (tipo.startsWith('refil de ')) return 'refil';
  if (/^kits?\b/.test(tipo)) return 'kit';
  if (tipo === 'body splash') return 'splash';
  if (tipo === 'protetor solar') return 'solar';
  if (produto.categoria === 'Perfumaria') return 'fragrancia';
  if (produto.categoria === 'Cabelo') return 'cabelo';
  if (produto.categoria === 'Maquiagem') {
    return /batom|labial|gloss|boca|base|corretivo|blush|sombra|paleta/.test(tipo) ? 'cor' : 'maquiagem';
  }
  if (/^(hidratante|loção corporal|hidratação|creme para mãos)$/.test(tipo)) return 'hidratacao';
  return 'rotina';
}

function primeiraNota(aromas, nivel) {
  return aromas?.match(new RegExp(`\\b${nivel}\\s*:\\s*([^,;.]+?)(?=,|;|\\s+(?:Corpo|Fundo)\\s*:|$)`, 'i'))?.[1];
}

function frase(texto) {
  return texto.replace(/\s+/g, ' ').trim().replace(/(?<=[^.!?…])$/, '.');
}

function fatoDeVenda(produto) {
  const topo = primeiraNota(produto.aromas, 'Topo');
  const fundo = primeiraNota(produto.aromas, 'Fundo');
  if (topo && fundo) return `A fragrância traz ${topo.toLocaleLowerCase('pt-BR')} na saída e ${fundo.toLocaleLowerCase('pt-BR')} no fundo.`;
  const descricao = produto.diferencial?.trim().split(/(?<=[.!?])\s+/).find((parte) => parte.length >= 20 && parte.length <= 185);
  if (descricao) return frase(descricao);
  return produto.volume ? `A apresentação anunciada é de ${produto.volume}.` : '';
}

function economiaDoCatalogo(produto) {
  return produto.anterior > produto.preco ? reais(produto.anterior - produto.preco) : '';
}

function precoDeCatalogo(produto, economia) {
  const preco = reais(produto.preco);
  if (economia) return `Na revista, está de ${reais(produto.anterior)} por ${preco} (economia de ${economia}).`;
  return `Na revista, sai por ${preco}.`;
}

function ganchoDeClima(produto, contexto, destaque, roteiro) {
  if (!contexto.clima) return '';
  if (contexto.clima === 'umido' && produto.categoria === 'Cabelo' && sinalDeFrizz.test(`${produto.nome} ${produto.diferencial ?? ''}`)) {
    return 'Se a pessoa comenta que os fios arrepiam em dias úmidos, mostre o controle de frizz descrito na ficha e pergunte em qual etapa ela quer usar o produto.';
  }
  return destaque?.[contexto.clima] || roteiro[contexto.clima] || '';
}

export function prepararVenda(produto, contexto) {
  const tipo = escolherRoteiro(produto);
  const evidencia = `${produto.nome} ${produto.diferencial ?? ''}`;
  const prioridade = prioridades[tipo]?.find(({ sinal }) => sinal.test(evidencia));
  const roteiro = { ...roteiros[tipo], ...prioridade };
  const destaque = destaques[produto.sku];
  const fato = fatoDeVenda(produto);
  const diferencial = destaque?.diferencial || [produto.diferencial ? frase(produto.diferencial) : fato, roteiro.valor].filter(Boolean).join(' ');
  const argumento = destaque?.argumento || [`Uma opção é ${produto.nome}.`, fato].filter(Boolean).join(' ');
  const economia = economiaDoCatalogo(produto);
  const preco = precoDeCatalogo(produto, economia);
  const gancho = ganchoDeClima(produto, contexto, destaque, roteiro);

  let pergunta = destaque?.pergunta || roteiro.pergunta;
  let estrategia = destaque?.estrategia || roteiro.estrategia;
  let fecho = roteiro.fecho;
  if (contexto.objetivo === 'revender') {
    const abordagem = destaque?.revenda ?? abordagensRevenda[tipo] ?? abordagensRevenda.rotina;
    const semSaldo = Number.isFinite(contexto.saldo) && contexto.saldo <= 0;
    const orientacao = semSaldo
      ? 'A planilha indica saldo indisponível. Sinalize interesse e confirme reposição antes de aceitar pedidos.'
      : 'Confirme saldo e condições de compra. Antes de definir seu preço, some custo, frete e taxas para calcular a margem.';
    pergunta = abordagem.pergunta;
    estrategia = `${abordagem.estrategia} ${orientacao}`;
    fecho = semSaldo
      ? 'Quer que eu confira a reposição ou uma opção parecida para suas clientes?'
      : 'Quer que eu confira as condições de revenda para os pedidos que você tem em vista?';
  } else if (contexto.objetivo === 'presente') {
    pergunta = 'Você está procurando um presente para qual ocasião?';
    estrategia = `Pergunte para quem é o presente e qual é a faixa de preço. ${estrategia}`;
    fecho = tipo === 'kit' ? roteiro.fecho : 'Quer que eu te mande uma imagem para você ver a apresentação?';
  } else if (contexto.objetivo === 'economizar') {
    pergunta = 'Quer uma opção que caiba no seu orçamento?';
    estrategia = economia
      ? `Abra com a economia de ${economia} em relação ao preço anterior da revista. ${estrategia}`
      : `Comece pelo valor de ${reais(produto.preco)} e pergunte se está na faixa de preço. ${estrategia}`;
  }

  const aberturaDeClima = aberturasDeClima[contexto.clima];
  const climaNaMensagem = gancho && contexto.objetivo !== 'revender' && aberturaDeClima?.[tipo];
  const proposta = contexto.objetivo === 'economizar' ? [preco, argumento] : [argumento, preco];

  return {
    argumento: destaque?.argumento || fato,
    diferencial,
    estrategia,
    gancho,
    mensagem: [pergunta, climaNaMensagem, ...proposta, fecho].filter(Boolean).join(' '),
  };
}

export function pedidoParaIA(produto, contexto, venda) {
  const publico = contexto.objetivo === 'revender'
    ? 'Atendo revendedoras e revendedores pelo WhatsApp. Escreva para quem está avaliando comprar para revender. Considere o perfil das clientes, o teste de demanda e os custos efetivos na decisão de compra.'
    : 'Sou revendedor(a) e vendo pelo WhatsApp.';
  return [
    `${publico} Escreva um argumento de venda em até 65 palavras, com uma pergunta final natural. Depois, dê uma resposta curta à objeção mais provável da pessoa.`,
    'Use os dados abaixo como referência. Trate os preços como valores da revista e use o clima somente quando ajudar a explicar a escolha. Atenha-se aos fatos fornecidos para benefícios, condições de pagamento, estoque e entrega.',
    '',
    `Produto | ${produto.nome}`,
    `Categoria | ${produto.categoria} · ${produto.tipo}`,
    `Preço | ${precoDeCatalogo(produto, economiaDoCatalogo(produto))}`,
    `Edição | ${contexto.edicao}`,
    produto.volume && `Apresentação | ${produto.volume}`,
    produto.aromas && `Notas olfativas | ${produto.aromas}`,
    produto.ocasiao && `Ocasião sugerida pela marca | ${produto.ocasiao}`,
    `Diferencial | ${venda.diferencial}`,
    `Perfil da compra | ${contexto.perfil}`,
    contexto.tempo && `Clima informado | ${contexto.tempo}`,
    venda.gancho && `Gancho de clima | ${venda.gancho}`,
    `Como abordar | ${venda.estrategia}`,
    `Rascunho | ${venda.mensagem}`,
  ].filter((linha) => linha !== undefined && linha !== null && linha !== false).join('\n');
}
