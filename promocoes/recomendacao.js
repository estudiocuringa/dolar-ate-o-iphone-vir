import { marcas, normalizar } from './produtos.js?v=3';
import { encontrarEncaixe, perguntaParaConfirmar } from './encaixes.js?v=1';
import { pesquisarDiferenciais } from './diferenciais.js?v=1';
import { prepararVenda, reais } from './vendas.js?v=3';

export const nomesIndicadores = { multimarca: 'Multimarca', cabelo: 'Cabelo', maquiagem: 'Maquiagem' };

const palavrasComuns = new Set(['a', 'o', 'as', 'os', 'da', 'de', 'do', 'das', 'dos', 'e', 'para', 'com']);

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

export function recomendarPedido({ produtos, pedido, indicadores, marcaInformada, limite, somenteComEstoque, somenteComEncaixe = true, consultarSaldo }) {
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
    const encaixe = encontrarEncaixe(produto, pedido.itens);
    if (somenteComEncaixe && !encaixe) continue;
    candidatas.push({ produto, cobre, saldo, encaixe, marcaBase });
  }

  const atendidos = new Set(candidatas.flatMap(candidata => candidata.cobre));
  const semOpcao = [...pendentes].filter(indicador => !atendidos.has(indicador));

  if (semOpcao.length) {
    const nomes = semOpcao.map(indicador => nomesIndicadores[indicador]).join(' e ');
    avisos.push(`Nenhuma opção para ${nomes} atende aos filtros selecionados.`);
    if (somenteComEncaixe) avisos.push('Confira os códigos do pedido ou desmarque Somente com encaixe no pedido para explorar opções que precisam de confirmação.');
  }
  const opcoes = candidatas.sort((a, b) => a.produto.preco - b.produto.preco
    || (b.encaixe?.forca ?? 0) - (a.encaixe?.forca ?? 0) || b.cobre.length - a.cobre.length
    || a.produto.sku.localeCompare(b.produto.sku));
  return { opcoes, avisos };
}

export function montarAbordagem({ produto, cobre, saldo, encaixe, marcaBase }) {
  const venda = prepararVenda(produto, { objetivo: 'revender', saldo });
  const diferencial = pesquisarDiferenciais(produto);
  const preco = reais(produto.preco);
  const nomeDaMarca = marcas[produto.marca].nome;
  const pergunta = perguntaParaConfirmar(produto);
  const motivos = [
    encaixe?.motivo ?? pergunta,
    encaixe && cobre.includes('multimarca') && `A combinação também acrescenta ${nomeDaMarca} ao pedido da revista ${marcas[marcaBase].nome}.`,
  ].filter(Boolean);
  const inicio = encaixe?.motivo ?? `${pergunta} Se fizer sentido para a sua carteira, uma opção é ${produto.nome}.`;
  const precoDaRevista = produto.anterior > produto.preco
    ? `Na revista, está de ${reais(produto.anterior)} por ${preco}.`
    : `O preço de referência na revista é ${preco}.`;
  const argumento = diferencial.fatos.slice(0, 2).join(' ') || venda.argumento;
  let fechamento = saldo > 0
    ? 'Quer testar o interesse das suas clientes e começar com uma unidade?'
    : 'Quer que eu confira a disponibilidade e as condições para você testar com uma unidade?';
  if (Number.isFinite(saldo) && saldo <= 0) fechamento = 'Quer que eu confira a previsão de reposição para você?';
  return {
    motivos,
    diferencial,
    venda,
    mensagem: [inicio, argumento, precoDaRevista, fechamento].filter(Boolean).join(' '),
    objecao: `“O valor de referência é ${preco}. Podemos começar por quem já procura esse tipo de cuidado e medir o interesse antes de aumentar o pedido.”`,
  };
}
