import { normalizar, publicoEspecifico } from './produtos.js?v=3';

const objetivos = {
  liso: 'alinhamento de fios lisos ou alisados',
  cachos: 'cuidado de ondas, cachos ou crespos',
  oleosidade: 'controle da oleosidade dos fios',
  caspa: 'cuidado com a caspa',
  cor: 'cuidado com fios coloridos',
  reparacao: 'reparação de fios danificados',
  nutricao: 'nutrição de fios secos ou ressecados',
  frizz: 'controle do frizz',
};

const etapas = {
  shampoo: 'faz a limpeza dos fios',
  condicionador: 'ajuda no desembaraço depois da lavagem',
  mascara: 'entra como etapa de tratamento dentro da rotina de lavagem',
  finalizador: 'entra na finalização dos fios',
  banho: 'faz a limpeza corporal no banho',
  hidratante: 'entra na hidratação corporal depois do banho',
  maos: 'entra na hidratação das mãos',
  perfume: 'entra na perfumação depois do banho',
  batom: 'preenche os lábios de cor',
  lapis: 'desenha o contorno antes de preencher os lábios',
  base: 'uniformiza a aparência da pele',
  corretivo: 'entra como cobertura pontual',
  delineador: 'destaca o traço rente aos cílios',
  mascaraCilios: 'destaca os cílios',
  sombra: 'dá cor às pálpebras',
};

function etapa(produto) {
  const tipo = normalizar(produto.tipo);
  const nome = normalizar(produto.nome);
  if (tipo.startsWith('refil') || tipo.startsWith('kit')) return undefined;
  if (produto.categoria === 'Cabelo') {
    if (tipo === 'shampoo' && !nome.includes('shampoo e condicionador')) return 'shampoo';
    if (tipo === 'condicionador') return 'condicionador';
    if (tipo === 'mascara capilar') return 'mascara';
    if (/^(finalizador|leave in|creme para pentear|modelador|ativador de cachos)$/.test(tipo)) return 'finalizador';
  }
  if (produto.categoria === 'Corpo e Banho') {
    if (/^sabonetes?\b/.test(nome) && !/\b(?:intimo|para maos)\b/.test(nome)) return 'banho';
    if (tipo === 'hidratante' && /\bmaos\b/.test(nome)) return 'maos';
    if (/^(hidratante|locao corporal)$/.test(tipo)) return 'hidratante';
  }
  if (/^(perfume|eau de parfum|eau de toilette|desodorante colonia|body splash|body spray)$/.test(tipo)) return 'perfume';
  if (produto.categoria === 'Maquiagem') {
    if (tipo === 'lapis labial' || /\b(?:lapiseira|lapis)(?: (?:para )?contorno)? labial\b/.test(nome)) return 'lapis';
    if (tipo === 'mascara de cilios') return 'mascaraCilios';
    if (/^(batom|base|corretivo|delineador|sombra)$/.test(tipo)) return tipo;
  }
  return undefined;
}

function compativelPorPublico(a, b) {
  if (a === 'infantil' || b === 'infantil') return a === b;
  return a === b || !publicoEspecifico(a) || !publicoEspecifico(b);
}

function primeiroEmComum(a, b) {
  return (a ?? []).find(valor => b?.includes(valor));
}

const cores = new Set(['ameixa', 'bordo', 'coral', 'malva', 'marrom', 'nude', 'rosa', 'rose', 'terracota', 'vermelho', 'vinho']);
function corLabial(produto) {
  return normalizar(produto.nome).split(' ').find(palavra => cores.has(palavra));
}

function capilar(produto, referencia, propria, outra) {
  const a = produto.objetivosVenda ?? [];
  const b = referencia.objetivosVenda ?? [];
  const tipoDeFio = objetivos => {
    if (objetivos.includes('liso') === objetivos.includes('cachos')) return undefined;
    return objetivos.includes('liso') ? 'liso' : 'cachos';
  };
  const tipoA = tipoDeFio(a);
  const tipoB = tipoDeFio(b);
  if (tipoA && tipoB && tipoA !== tipoB) return undefined;

  const chaveObjetivo = primeiroEmComum(a, b);
  if (chaveObjetivo === 'frizz' && tipoA !== tipoB) return undefined;
  const objetivo = objetivos[chaveObjetivo];
  if (!objetivo) return undefined;
  if (propria === outra) {
    return { forca: 2, motivo: `${referencia.nome} já atende a quem procura ${objetivo}. ${produto.nome} oferece uma alternativa da mesma etapa para comparar fórmula, tamanho ou preço.` };
  }
  const tecnologia = primeiroEmComum(produto.ativosVenda, referencia.ativosVenda);
  return {
    forca: tecnologia ? 5 : 4,
    motivo: `${referencia.nome} ${etapas[outra]}. ${produto.nome} ${etapas[propria]}. São duas etapas para quem busca ${objetivo}.`,
  };
}

const paresMaquiagem = new Set(['batom/lapis', 'base/corretivo', 'delineador/mascaraCilios', 'mascaraCilios/sombra', 'delineador/sombra']);
const etapasCorpo = new Set(['banho','hidratante','maos','perfume']);

function ligar(produto, referencia, propria, outra) {
  if (!propria || !outra || !compativelPorPublico(produto.publico, referencia.publico)) return undefined;
  if (produto.categoria === 'Cabelo' && referencia.categoria === 'Cabelo') return capilar(produto, referencia, propria, outra);

  const notasEmComum = (produto.notasVenda ?? []).filter(nota => referencia.notasVenda?.includes(nota));
  const nota = notasEmComum.find(item => !['musk', 'âmbar'].includes(item)) ?? notasEmComum[0];
  if (etapasCorpo.has(propria) && etapasCorpo.has(outra)) {
    const perfil = primeiroEmComum(produto.perfisOlfativos, referencia.perfisOlfativos);
    if (propria === outra) {
      if (propria === 'perfume' && nota && perfil) {
        return { forca: 3, motivo: `${referencia.nome} e ${produto.nome} têm perfil ${perfil} e compartilham a nota de ${nota}. Vale apresentar como uma segunda opção para quem já procura esse tipo de fragrância.` };
      }
      return undefined;
    }
    const karite = produto.marca === referencia.marca && produto.linha === 'Instance' && referencia.linha === 'Instance'
      && [produto, referencia].every(item => /\bkarite\b/.test(normalizar(item.nome)));
    if (!nota && !karite) return undefined;
    if (['musk', 'âmbar'].includes(nota) && !perfil) return undefined;
    return {
      forca: karite ? 5 : 4,
      motivo: `${referencia.nome} ${etapas[outra]}, e ${produto.nome} ${etapas[propria]}.${nota
        ? ` A nota de ${nota} é o ponto em comum para oferecer as duas etapas a quem gosta desse aroma.`
        : ' São da mesma variante Instance Karité, com perfil floral suave nas duas etapas.'}`,
    };
  }

  const par = [propria, outra].sort().join('/');
  if (!paresMaquiagem.has(par)) return undefined;
  if (par === 'batom/lapis') {
    const cor = corLabial(produto);
    const outraCor = corLabial(referencia);
    if (cor && outraCor && cor !== outraCor) return undefined;
    const acabamento = cor && outraCor ? ` As duas opções passam pela família de tons ${cor}. Compare as amostras com a revendedora.`
      : ' Confirme o tom com a revendedora para combinar contorno e batom.';
    return { forca: cor && outraCor ? 4 : 3, motivo: `${referencia.nome} ${etapas[outra]}, e ${produto.nome} ${etapas[propria]}.${acabamento}` };
  }
  return {
    forca: 3,
    motivo: `${referencia.nome} ${etapas[outra]}, e ${produto.nome} ${etapas[propria]}.${par === 'base/corretivo'
      ? ' Confirme o tom para que os dois funcionem no mesmo preparo de pele.'
      : ' As duas etapas podem compor a mesma maquiagem dos olhos.'}`,
  };
}

export function encontrarEncaixe(produto, itens) {
  const propria = etapa(produto);
  let encaixe;
  for (const item of itens) {
    const candidato = ligar(produto, item, propria, etapa(item));
    if (candidato && (!encaixe || candidato.forca > encaixe.forca)) encaixe = candidato;
  }
  return encaixe;
}

export function perguntaParaConfirmar(produto) {
  const objetivo = objetivos[produto.objetivosVenda?.[0]];
  const nota = produto.notasVenda?.[0];
  if (objetivo) return `Suas clientes procuram ${objetivo}?`;
  if (nota) return `Suas clientes costumam pedir fragrâncias com nota de ${nota}?`;
  const propria = etapa(produto);
  if (propria === 'banho') return 'Alguma cliente sua procura uma opção de limpeza para o banho?';
  return `Alguma cliente sua está procurando ${produto.tipo.toLocaleLowerCase('pt-BR')}?`;
}
