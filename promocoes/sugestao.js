import { chaveEstoque, criarConsultaDeEstoque, lerEstoque } from './estoque.js?v=1';
import { copiarTexto, dadosDaFicha, lerCatalogo, marcas } from './produtos.js?v=2';
import { interpretarPedido, montarAbordagem, nomesIndicadores, recomendarPedido } from './recomendacao.js?v=3';
import { reais } from './vendas.js?v=3';

const obter = id => document.getElementById(id);
const formulario = obter('pedido-form');
const botao = formulario.querySelector('button[type="submit"]');
const estado = obter('pedido-estado');
const introducao = obter('pedido-introducao');
const recados = obter('pedido-recados');
const resultados = obter('pedido-resultados');
const resumo = obter('pedido-resumo');
const paginacao = obter('pedido-paginacao');
const seletorPagina = obter('pedido-pagina');
const anterior = obter('pedido-anterior');
const proxima = obter('pedido-proxima');
const soComEstoque = obter('pedido-somente-estoque');
const molde = obter('molde-recomendacao');
const numeros = new Intl.NumberFormat('pt-BR');
const porPagina = 8;
let carregamento;
let versaoDoPedido = 0;
let opcoes = [];
let pagina = 0;

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
  const importado = Boolean(lerEstoque());
  obter('pedido-estoque-filtro').hidden = !importado;
  obter('pedido-estoque').textContent = importado
    ? 'Estoque importado neste navegador.'
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
  const promocional = produto.anterior > produto.preco;
  const tipoPreco = selecionar('.rec-tipo-preco');
  tipoPreco.textContent = promocional ? 'Em promoção' : 'Preço de catálogo';
  tipoPreco.classList.toggle('preco-promocional', promocional);
  if (promocional) {
    const precoAnterior = selecionar('.rec-anterior');
    precoAnterior.hidden = false;
    precoAnterior.textContent = reais(produto.anterior);
  }
  selecionar('.rec-saldo').textContent = [
    Number.isFinite(saldo) ? `${numeros.format(saldo)} un. na planilha` : 'Estoque a confirmar',
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

function exibirPagina(indice) {
  pagina = indice;
  const inicio = pagina * porPagina;
  const lista = opcoes.slice(inicio, inicio + porPagina);
  resultados.replaceChildren(...lista.map((item, i) => montarCartao(item, inicio + i)));
  obter('pedido-progresso').textContent = opcoes.length === 1 ? '1 opção encontrada'
    : `Opções ${numeros.format(inicio + 1)} a ${numeros.format(inicio + lista.length)} de ${numeros.format(opcoes.length)}`;
  seletorPagina.value = pagina;
  anterior.disabled = pagina === 0;
  proxima.disabled = inicio + lista.length >= opcoes.length;
  obter('pedido-resultado-titulo').focus();
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
  opcoes = recomendacoes.opcoes;
  estado.textContent = opcoes.length ? '' : 'Confira o pedido e os filtros.';
  if (!opcoes.length) {
    obter('pedido-resultado-titulo').focus();
    return;
  }

  const minimo = opcoes[0].produto.preco;
  const maximo = opcoes.at(-1).produto.preco;
  obter('pedido-faixa').textContent = minimo === maximo ? reais(minimo)
    : `Do menor ao maior preço · ${reais(minimo)} a ${reais(maximo)}`;
  const totalPaginas = Math.ceil(opcoes.length / porPagina);
  seletorPagina.replaceChildren(...Array.from({ length: totalPaginas }, (_, i) => new Option(`Página ${i + 1} de ${totalPaginas}`, i)));
  resumo.hidden = false;
  paginacao.hidden = totalPaginas === 1;
  exibirPagina(0);
}

formulario.addEventListener('submit', async evento => {
  evento.preventDefault();
  const texto = obter('pedido-itens').value.trim();
  const indicadores = [...formulario.querySelectorAll('input[name="indicador"]:checked')].map(input => input.value);
  if (!texto || !indicadores.length) {
    estado.textContent = texto ? 'Marque pelo menos um indicador pendente.' : 'Informe os itens do pedido.';
    return;
  }
  limparResultado();
  const versao = versaoDoPedido;
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
      somenteComEstoque: Boolean(estoque) && soComEstoque.checked,
      consultarSaldo: criarConsultaDeEstoque(estoque),
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
  opcoes = [];
  recados.replaceChildren();
  resultados.replaceChildren();
  resumo.hidden = paginacao.hidden = true;
  introducao.hidden = false;
  estado.textContent = aviso;
}

anterior.addEventListener('click', () => exibirPagina(pagina - 1));
proxima.addEventListener('click', () => exibirPagina(pagina + 1));
seletorPagina.addEventListener('change', () => exibirPagina(Number(seletorPagina.value)));
formulario.addEventListener('input', () => limparResultado());
window.addEventListener('storage', evento => {
  if (evento.key === chaveEstoque || evento.key === null) {
    atualizarEstoque();
    if (!introducao.hidden) return;
    limparResultado('Estoque atualizado. Gere a sugestão novamente.');
  }
});
atualizarEstoque();
