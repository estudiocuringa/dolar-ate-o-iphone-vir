import { marcas, normalizar, publicoEspecifico } from './produtos.js?v=2';
import { prepararVenda, reais } from './vendas.js?v=3';

export const nomesIndicadores = { multimarca: 'Multimarca', cabelo: 'Cabelo', maquiagem: 'Maquiagem' };

const palavrasComuns = new Set(['a', 'o', 'as', 'os', 'da', 'de', 'do', 'das', 'dos', 'e', 'para', 'com']);
const termosDaLinha = new Set(['shampoo', 'condicionador', 'mascara', 'capilar', 'cabelos', 'boticario', 'eudora', 'refil', 'batom', 'lapis', 'labial', 'cor']);
const pares = { Shampoo: 'Condicionador', Condicionador: 'Shampoo', Batom: 'Lápis labial', 'Lápis labial': 'Batom' };

function nomeNormalizado(nome) {
  return normalizar(nome).replace(/(\d)\s+(ml|g)\b/g, '$1$2');
}

function palavras(nome) {
  return nomeNormalizado(nome).split(' ').filter(palavra => palavra && !palavrasComuns.has(palavra));
}

function removerQuantidade(linha) {
  return linha.trim().replace(/^\d+\s*(?:[x×]\s*|un(?:idades?)?\b\s*)/i, '')
    .replace(/^\d{1,3}\s+/, '');
}

export function interpretarPedido(texto, produtos) {
  const indice = produtos.map(produto => ({
    produto,
    nome: nomeNormalizado(produto.nome),
    termos: new Set(palavras(produto.nome)),
  }));
  const porCodigo = new Map();
  for (const produto of produtos) {
    const prefixo = produto.marca === 'eudora' ? 'e' : 'b';
    const codigo = produto.sku.replace(/^0+(?=\d+$)/, '');
    for (const chave of [codigo, prefixo + codigo]) {
      if (!porCodigo.has(chave)) porCodigo.set(chave, []);
      porCodigo.get(chave).push(produto);
    }
  }

  const itens = new Set();
  const excluidos = new Set();
  const marcasDoPedido = new Set();
  const linhasPendentes = new Map();
  const linhas = texto.split(/\r?\n|;/).flatMap(linha => {
    const codigos = linha.split(/[,|]/).map(item => item.trim());
    return codigos.every(item => /^[be]?\d{4,8}$/i.test(item)) ? codigos : [linha.trim()];
  }).filter(Boolean);
  for (const linha of linhas) {
    const codigos = [...removerQuantidade(linha).matchAll(/(?<![\p{L}\d,.])([eb]?)0*(\d{4,8})(?![\p{L}\d]|[,.]\d)/gi)];
    const porCodigoNaLinha = codigos.map(([, prefixo, codigo]) => porCodigo.get(prefixo.toLowerCase() + codigo) ?? []);
    const achados = porCodigoNaLinha.flat();
    if (achados.length) {
      for (const candidatos of porCodigoNaLinha) {
        if (candidatos.length === 1) itens.add(candidatos[0]);
        else if (candidatos.length > 1) linhasPendentes.set(linha, 'Código encontrado nas duas revistas');
        for (const candidato of candidatos) {
          excluidos.add(candidato);
          if (candidatos.length === 1) marcasDoPedido.add(candidato.marca);
        }
      }
      continue;
    }

    const nome = nomeNormalizado(removerQuantidade(linha));
    const termos = [...new Set(palavras(nome))];
    const exatos = indice.filter(item => item.nome === nome);
    const candidatos = exatos.length && termos.length > 1 ? exatos : indice.filter(item =>
      termos.length && termos.every(termo => item.termos.has(termo)));
    if (candidatos.length === 1) itens.add(candidatos[0].produto);
    else linhasPendentes.set(linha, candidatos.length ? 'Há mais de uma versão. Informe o código.' : 'Item não localizado no catálogo.');
    for (const { produto } of candidatos) excluidos.add(produto);
    const marcasPossiveis = new Set(candidatos.map(({ produto }) => produto.marca));
    if (marcasPossiveis.size === 1) marcasDoPedido.add(candidatos[0].produto.marca);
  }
  return { itens: [...itens], excluidos, marcasDoPedido, linhasPendentes: [...linhasPendentes] };
}

function complementar(produto, itens) {
  const tipoDoPedido = pares[produto.tipo];
  if (!tipoDoPedido || !produto.linha) return undefined;
  const termosComunsDaLinha = new Set(palavras(produto.linha));
  const termos = palavras(produto.nome).filter(palavra => palavra.length >= 4 && !termosDaLinha.has(palavra) && !termosComunsDaLinha.has(palavra) && !/^\d/.test(palavra));
  return itens.find(item => {
    if (item.tipo !== tipoDoPedido || item.linha !== produto.linha) return false;
    const nomeDoPedido = new Set(palavras(item.nome));
    return termos.filter(termo => nomeDoPedido.has(termo)).length >= Math.min(2, Math.max(1, termos.length));
  });
}

function afinidade(produto, pedido, complemento, alvoMultimarca, marcaBase) {
  if (complemento) return 3;
  if (publicoEspecifico(produto.publico) && pedido.itens.some(item => item.categoria === produto.categoria && item.publico === produto.publico)) return 2;
  if (!alvoMultimarca && marcaBase && produto.marca === marcaBase) return 1;
  return 0;
}

export function recomendarPedido({ produtos, pedido, indicadores, marcaInformada, limite, somenteComEstoque, consultarSaldo }) {
  const pendentes = new Set(indicadores);
  const avisos = [];
  const marcasDoPedido = new Set(pedido.marcasDoPedido);
  if (marcaInformada) marcasDoPedido.add(marcaInformada);
  const marcaBase = marcasDoPedido.size === 1 ? [...marcasDoPedido][0] : undefined;
  const alvoMultimarca = pendentes.has('multimarca') && marcaBase
    ? Object.keys(marcas).find(marca => marca !== marcaBase) : undefined;

  if (pendentes.has('multimarca') && !alvoMultimarca) {
    avisos.push(marcasDoPedido.size === 2
      ? 'O pedido já mostra as duas revistas. Confira a regra do seu indicador Multimarca.'
      : 'Para sugerir Multimarca, indique a marca atual do pedido ou use um código que identifique a revista.');
    pendentes.delete('multimarca');
  }

  const candidatas = [];
  const nomesNoPedido = new Set(pedido.itens.map(item => nomeNormalizado(item.nome)));
  for (const produto of produtos) {
    if (pedido.excluidos.has(produto) || nomesNoPedido.has(nomeNormalizado(produto.nome)) || (limite !== null && produto.preco > limite)) continue;
    const saldo = consultarSaldo(produto.sku);
    if (somenteComEstoque && !(saldo > 0)) continue;
    if (/acess[oó]rios|sacola|embalagem/i.test(produto.tipo) || /^(sacola|embalagem|envelope|caixa de presente|amostra|demonstrador|cat[aá]logo|case para|estojo para)\b/i.test(produto.nome)) continue;

    const cobre = [
      produto.marca === alvoMultimarca && 'multimarca',
      produto.categoria === 'Cabelo' && pendentes.has('cabelo') && 'cabelo',
      produto.categoria === 'Maquiagem' && pendentes.has('maquiagem') && 'maquiagem',
    ].filter(Boolean);
    if (!cobre.length) continue;
    const complemento = complementar(produto, pedido.itens);
    const prioridade = afinidade(produto, pedido, complemento, alvoMultimarca, marcaBase);
    const temDescricao = Boolean(produto.diferencial || produto.aromas || produto.beneficio);
    candidatas.push({ produto, cobre, saldo, complemento, prioridade, temDescricao, marcaBase, itemDoPedido: pedido.itens[0] });
  }

  const atendidos = new Set(candidatas.flatMap(candidata => candidata.cobre));
  const semOpcao = [...pendentes].filter(indicador => !atendidos.has(indicador));

  if (semOpcao.length) {
    const nomes = semOpcao.map(indicador => nomesIndicadores[indicador]).join(' e ');
    const condicoes = [somenteComEstoque && 'com saldo positivo', limite !== null && 'dentro do limite'].filter(Boolean).join(' e ');
    avisos.push(condicoes ? `Nenhum item para ${nomes} ${condicoes} com este pedido.` : `Nenhum item adequado para ${nomes} com este pedido.`);
  }
  const opcoes = candidatas.sort((a, b) => a.produto.preco - b.produto.preco
    || b.cobre.length - a.cobre.length || b.prioridade - a.prioridade
    || Number(b.temDescricao) - Number(a.temDescricao) || a.produto.sku.localeCompare(b.produto.sku));
  return { opcoes, avisos };
}

export function montarAbordagem({ produto, cobre, saldo, complemento, marcaBase, itemDoPedido }) {
  const venda = prepararVenda(produto, { objetivo: 'revender', saldo });
  const preco = reais(produto.preco);
  const nomeDaMarca = marcas[produto.marca].nome;
  const categoria = cobre.filter(indicador => indicador !== 'multimarca').map(indicador => nomesIndicadores[indicador]).join(' e ');
  const motivos = [
    complemento && `Complementa ${complemento.nome}, que já está no pedido. Os dois produtos são da mesma linha.`,
    cobre.includes('multimarca') && `Acrescenta ${nomeDaMarca} a um pedido com ${marcas[marcaBase].nome}.`,
    categoria && !complemento && (itemDoPedido && itemDoPedido.categoria !== produto.categoria
      ? `Depois de ${itemDoPedido.nome}, a revendedora ganha uma oferta de ${categoria.toLowerCase()} para apresentar às clientes.`
      : `Dá uma opção de ${categoria.toLowerCase()} para a revendedora oferecer à carteira dela.`),
  ].filter(Boolean);
  const inicio = complemento
    ? `Vi que você colocou ${complemento.nome} no pedido. Com ${produto.nome}, você pode oferecer os dois juntos para quem já procura essa linha.`
    : `Para ampliar seu pedido com ${categoria ? `uma opção de ${categoria.toLowerCase()}` : nomeDaMarca}, eu sugiro ${produto.nome}.`;
  const precoDaRevista = produto.anterior > produto.preco
    ? `Na revista, está de ${reais(produto.anterior)} por ${preco}.`
    : `O preço de referência na revista é ${preco}.`;
  let fechamento = saldo > 0
    ? 'Quer testar o interesse das suas clientes e começar com uma unidade?'
    : 'Quer que eu confira a disponibilidade e as condições para você testar com uma unidade?';
  if (Number.isFinite(saldo) && saldo <= 0) fechamento = 'Quer que eu confira a previsão de reposição para você?';
  return {
    motivos,
    venda,
    mensagem: [inicio, venda.argumento, precoDaRevista, fechamento].filter(Boolean).join(' '),
    objecao: `“O valor de referência é ${preco}. Podemos começar por quem já procura ${complemento ? 'essa linha' : 'esse tipo de produto'} e medir o interesse antes de aumentar o pedido.”`,
  };
}
