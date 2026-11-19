import { chaveEstoque, criarConsultaDeEstoque, lerEstoque } from './estoque.js?v=1';
import { copiarTexto, dadosDaFicha, lerCatalogo, marcas } from './produtos.js?v=2';
import { interpretarPedido, montarAbordagem, nomesIndicadores, recomendarPedido } from './recomendacao.js?v=2';
import { reais } from './vendas.js?v=3';

const obter = id => document.getElementById(id);
const formulario = obter('pedido-form');
const botao = formulario.querySelector('button[type="submit"]');
const estado = obter('pedido-estado');
const introducao = obter('pedido-introducao');
const recados = obter('pedido-recados');
const resultados = obter('pedido-resultados');
const molde = obter('molde-recomendacao');
const numeros = new Intl.NumberFormat('pt-BR');
let carregamento;
let versaoDoPedido = 0;

function lerProdutos() {
  if (!carregamento) {
    carregamento = Promise.all(Object.keys(marcas).map(async marca => {
      const dados = await lerCatalogo(marca);
      return dados.produtos.map(produto => ({ ...produto, marca, edicao: dados.edicao }));
    })).then(lista => lista.flat()).catch(erro => {
      carregamento = undefined;
      throw erro;
    });
  }
  return carregamento;
}

function paragrafo(texto) {
  const elemento = document.createElement('p');
  elemento.textContent = texto;
  return elemento;
}

function atualizarEstoque() {
  obter('pedido-estoque').textContent = lerEstoque()
    ? 'Estoque importado. As sugestões usam saldos positivos.'
    : 'Estoque sem consulta neste navegador.';
}

function montarCartao(recomendacao, indice) {
  const { produto, saldo, cobre } = recomendacao;
  const abordagem = montarAbordagem(recomendacao);
  const cartao = molde.content.cloneNode(true);
  const selecionar = classe => cartao.querySelector(classe);
  for (const indicador of cobre) {
    const selo = document.createElement('span');
    selo.textContent = nomesIndicadores[indicador];
    selecionar('.rec-indicadores').append(selo);
  }

  if (produto.imagem) {
    const imagem = selecionar('.rec-imagem');
    imagem.hidden = false;
    imagem.src = produto.imagem;
    imagem.addEventListener('error', () => { imagem.hidden = true; }, { once: true });
  }
  selecionar('.rec-marca').textContent = `${marcas[produto.marca].nome} · ${produto.tipo}`;
  selecionar('.rec-nome').textContent = produto.nome;
  selecionar('.rec-preco').textContent = reais(produto.preco);
  if (produto.anterior > produto.preco) {
    const anterior = selecionar('.rec-anterior');
    anterior.hidden = false;
    anterior.textContent = reais(produto.anterior);
  }
  selecionar('.rec-saldo').textContent = [
    saldo > 0 ? `${numeros.format(saldo)} un. na planilha` : 'Estoque a confirmar',
    produto.edicao,
  ].join(' · ');
  selecionar('.rec-motivos').textContent = abordagem.motivos.join(' ');
  selecionar('.rec-diferencial').textContent = abordagem.venda.diferencial;
  selecionar('.rec-roteiro').textContent = abordagem.venda.estrategia;
  selecionar('.rec-objecao').textContent = abordagem.objecao;
  for (const [rotulo, valor] of dadosDaFicha(produto)) {
    const linha = document.createElement('div');
    const termo = document.createElement('dt');
    const detalhe = document.createElement('dd');
    termo.textContent = rotulo;
    detalhe.textContent = valor;
    linha.append(termo, detalhe);
    selecionar('.rec-especificacoes').append(linha);
  }

  const parametros = new URLSearchParams({ marca: produto.marca, produto: produto.sku });
  selecionar('.rec-ficha').href = `./catalogo.html?${parametros}`;
  const campoMensagem = selecionar('.rec-texto');
  campoMensagem.id = `mensagem-recomendada-${indice}`;
  selecionar('.rec-rotulo').htmlFor = campoMensagem.id;
  campoMensagem.value = abordagem.mensagem;
  const estadoCopia = selecionar('.rec-copia-estado');
  selecionar('.rec-copiar').addEventListener('click', () => copiarTexto(campoMensagem, estadoCopia));
  return cartao;
}

function mostrarResultado(pedido, recomendacoes) {
  introducao.hidden = true;
  if (pedido.itens.length) {
    const reconhecidos = pedido.itens.map(item => item.nome).join(', ');
    const detalhes = document.createElement('details');
    const titulo = document.createElement('summary');
    titulo.textContent = `Itens reconhecidos no pedido (${pedido.itens.length})`;
    detalhes.append(titulo, paragrafo(reconhecidos));
    recados.append(detalhes);
  }
  if (pedido.linhasPendentes.length) {
    const detalhes = document.createElement('details');
    const titulo = document.createElement('summary');
    titulo.textContent = `Confira os itens do pedido (${pedido.linhasPendentes.length})`;
    detalhes.open = true;
    detalhes.append(titulo);
    for (const [linha, aviso] of pedido.linhasPendentes) detalhes.append(paragrafo(`${linha} · ${aviso}`));
    recados.append(detalhes);
  }
  for (const aviso of recomendacoes.avisos) recados.append(paragrafo(aviso));
  recomendacoes.escolhidas.forEach((item, indice) => resultados.append(montarCartao(item, indice)));
  const total = recomendacoes.escolhidas.length;
  estado.textContent = total ? `${total} ${total === 1 ? 'sugestão encontrada' : 'sugestões encontradas'}.` : 'Confira o pedido e os filtros.';
  obter('pedido-resultado-titulo').focus();
}

formulario.addEventListener('submit', async evento => {
  evento.preventDefault();
  const texto = obter('pedido-itens').value.trim();
  const indicadores = [...formulario.querySelectorAll('input[name="indicador"]:checked')].map(input => input.value);
  if (!texto || !indicadores.length) {
    estado.textContent = texto ? 'Marque pelo menos um indicador pendente.' : 'Informe os itens do pedido.';
    return;
  }
  const versao = ++versaoDoPedido;
  recados.replaceChildren();
  resultados.replaceChildren();
  introducao.hidden = true;
  botao.disabled = true;
  estado.textContent = 'Conferindo os dois catálogos…';
  try {
    const produtos = await lerProdutos();
    if (versao !== versaoDoPedido) return;
    const pedido = interpretarPedido(texto, produtos);
    const limiteDigitado = obter('pedido-limite').value;
    const estoque = lerEstoque();
    const recomendacoes = recomendarPedido({
      produtos, pedido, indicadores, marcaInformada: obter('pedido-marca').value,
      limite: limiteDigitado ? Number(limiteDigitado) : null,
      temEstoque: Boolean(estoque), consultarSaldo: criarConsultaDeEstoque(estoque),
    });
    mostrarResultado(pedido, recomendacoes);
  } catch {
    if (versao === versaoDoPedido) {
      introducao.hidden = false;
      estado.textContent = 'Os catálogos estão indisponíveis. Tente novamente.';
    }
  } finally {
    botao.disabled = false;
  }
});

function limparResultado(aviso = '') {
  versaoDoPedido++;
  recados.replaceChildren();
  resultados.replaceChildren();
  introducao.hidden = false;
  estado.textContent = aviso;
}

formulario.addEventListener('input', () => limparResultado());
window.addEventListener('storage', evento => {
  if (evento.key === chaveEstoque || evento.key === null) {
    atualizarEstoque();
    if (!introducao.hidden) return;
    limparResultado('Estoque atualizado. Gere a sugestão novamente.');
  }
});
atualizarEstoque();
