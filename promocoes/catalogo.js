import { chaveClimaVenda, lerClimaVenda } from '../tempo/clima-venda.js?v=1';
import { chaveEstoque, criarConsultaDeEstoque, importarPlanilha, lerEstoque } from './estoque.js?v=1';
import { pedidoParaIA, prepararVenda, reais } from './vendas.js?v=2';

const marcas = {
  boticario: { nome: 'O Boticário', revista: 'https://catalogo.boticario.com.br/' },
  eudora: { nome: 'Eudora', revista: 'https://catalogo.eudora.com.br/REVISTA' },
};

const obter = (id) => document.getElementById(id);
const campo = obter('busca');
const categoria = obter('categoria');
const melhores = obter('melhores');
const conteudo = obter('conteudo');
const mensagem = obter('mensagem');
const ficha = obter('ficha');
const molde = obter('molde-produto');
const resultados = obter('resultados');
const objetivoVenda = obter('objetivo-venda');
const climaVenda = obter('clima-venda');
const arquivoEstoque = obter('arquivo-estoque');
const botaoImportar = obter('importar-estoque');
const botaoRemover = obter('remover-estoque');
const soDisponiveis = obter('so-disponiveis');
const estadoEstoque = obter('estoque-estado');
const quantidade = new Intl.NumberFormat('pt-BR');
const dataImportacao = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const ordem = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
const tamanhoGrupo = 4;
const principais = ['Perfumaria', 'Cabelo', 'Maquiagem', 'Corpo e Banho', 'Cuidados com a pele'];
let produtos = [];
let soMelhores = false;
let produtoAtual;
let estoque = lerEstoque();
let consultarSaldo = criarConsultaDeEstoque(estoque);

function normalizar(texto) {
  return String(texto ?? '').normalize('NFD').replace(/\p{M}/gu, '')
    .toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function elemento(tag, texto, classe) {
  const node = document.createElement(tag);
  if (texto) node.textContent = texto;
  if (classe) node.className = classe;
  return node;
}

function preencherPreco(preco, anterior, produto) {
  preco.textContent = reais(produto.preco);
  anterior.hidden = !(produto.anterior > produto.preco);
  anterior.textContent = anterior.hidden ? '' : reais(produto.anterior);
}

function preencherSaldo(rotulo, sku) {
  rotulo.hidden = !estoque;
  if (!estoque) return;
  const saldo = consultarSaldo(sku);
  rotulo.dataset.saldo = saldo > 0 ? 'disponivel' : saldo === 0 ? 'zerado' : 'conferir';
  if (saldo === undefined) rotulo.textContent = 'Sem registro de estoque';
  else if (saldo === null) rotulo.textContent = 'Estoque a conferir';
  else rotulo.textContent = `Estoque ${quantidade.format(saldo)} un.`;
}

function abrirFicha(produto) {
  produtoAtual = produto;
  obter('ficha-tipo').textContent = `${produto.categoria} · ${produto.tipo}`;
  obter('ficha-nome').textContent = produto.nome;
  preencherPreco(obter('ficha-preco'), obter('ficha-anterior'), produto);
  preencherSaldo(obter('ficha-estoque'), produto.sku);

  const dados = [
    ['Código', produto.sku],
    ['Apresentação', produto.volume],
    ['Aromas e família olfativa', produto.aromas],
    ['Indicado para', produto.indicacao],
    ['Ocasião', produto.ocasiao],
    ['Revista', produto.paginas?.length ? `Página ${produto.paginas.join(', ')}` : ''],
  ];
  const detalhes = obter('ficha-detalhes');
  detalhes.replaceChildren();
  for (const [rotulo, valor] of dados) {
    if (!valor) continue;
    const linha = elemento('div');
    linha.append(elemento('dt', rotulo), elemento('dd', valor));
    detalhes.append(linha);
  }

  obter('ficha-fonte').href = produto.fonte;
  atualizarVenda();
  ficha.showModal();
  ficha.scrollTop = 0;
}

function contextoDeVenda() {
  const consultado = lerClimaVenda();
  const resumoClima = obter('clima-consultado');
  const opcaoPrevisao = climaVenda.querySelector('option[value="previsao"]');
  opcaoPrevisao.disabled = !consultado;
  resumoClima.hidden = !consultado;
  const tempoConsultado = consultado ? `${consultado.cidade} · ${consultado.temperatura} °C · ${consultado.descricao}` : '';
  resumoClima.textContent = tempoConsultado;
  if (!consultado && climaVenda.value === 'previsao') climaVenda.value = '';
  const usaPrevisao = climaVenda.value === 'previsao';
  return {
    objetivo: objetivoVenda.value,
    perfil: objetivoVenda.selectedOptions[0].textContent,
    clima: usaPrevisao ? consultado.clima : climaVenda.value,
    tempo: usaPrevisao ? tempoConsultado : climaVenda.value && climaVenda.selectedOptions[0].textContent,
    edicao: obter('edicao').textContent,
    saldo: consultarSaldo(produtoAtual.sku),
  };
}

function atualizarVenda() {
  const contexto = contextoDeVenda();
  const venda = prepararVenda(produtoAtual, contexto);
  obter('ficha-diferencial').textContent = venda.diferencial;
  obter('ficha-venda').textContent = venda.estrategia;
  const gancho = obter('ficha-gancho');
  gancho.hidden = !venda.gancho;
  gancho.textContent = venda.gancho;
  obter('mensagem-venda').value = venda.mensagem;
  obter('pedido-ia').value = pedidoParaIA(produtoAtual, contexto, venda);
  obter('estado-mensagem').textContent = '';
  obter('estado-pedido').textContent = '';
}

async function copiarTexto(campoId, estadoId) {
  const texto = obter(campoId);
  const estado = obter(estadoId);
  try {
    await navigator.clipboard.writeText(texto.value);
    estado.textContent = 'Copiado.';
  } catch {
    texto.focus();
    texto.select();
    estado.textContent = 'Texto selecionado. Use a opção de copiar do navegador.';
  }
}

function criarProduto(produto) {
  const cartao = molde.content.cloneNode(true);
  const imagem = cartao.querySelector('.produto-imagem');
  if (produto.imagem) {
    imagem.src = produto.imagem;
    imagem.addEventListener('error', () => { imagem.hidden = true; }, { once: true });
  } else {
    imagem.hidden = true;
  }
  cartao.querySelector('.produto-tipo').textContent = produto.tipo;
  cartao.querySelector('.produto-nome').textContent = produto.nome;
  preencherPreco(cartao.querySelector('.produto-preco'), cartao.querySelector('.produto-anterior'), produto);
  preencherSaldo(cartao.querySelector('.saldo-estoque'), produto.sku);
  const botao = cartao.querySelector('.ver-produto');
  botao.setAttribute('aria-label', `Ver ficha de ${produto.nome}`);
  botao.addEventListener('click', () => abrirFicha(produto));
  return cartao;
}

function filtrar() {
  const termos = normalizar(campo.value).split(' ').filter(Boolean);
  const filtrados = produtos.filter((produto) =>
    (!categoria.value || produto.categoria === categoria.value) &&
    (!soDisponiveis.checked || consultarSaldo(produto.sku) > 0) &&
    termos.every((termo) => produto.busca.includes(termo)));
  if (!soMelhores) return filtrados;

  const porTipo = new Set();
  return filtrados.filter((produto) => {
    const chave = produto.categoria + '/' + produto.tipo;
    if (porTipo.has(chave)) return false;
    porTipo.add(chave);
    return true;
  });
}

function exibir() {
  const itens = filtrar();
  const resumo = obter('resumo');
  const semResultados = soDisponiveis.checked
    ? 'Nenhum produto com saldo positivo corresponde à busca.'
    : 'Nenhum produto encontrado. Tente outro nome ou categoria.';
  resumo.textContent = itens.length
    ? `${quantidade.format(itens.length)} ${itens.length === 1 ? 'produto' : 'produtos'} · ${soMelhores ? 'menor preço por tipo' : 'ordem de menor preço em cada categoria'}`
    : semResultados;
  const grupos = new Map();
  for (const produto of itens) {
    if (!grupos.has(produto.categoria)) grupos.set(produto.categoria, []);
    grupos.get(produto.categoria).push(produto);
  }

  const secoes = document.createDocumentFragment();
  const categorias = [...new Set([...principais, ...[...grupos.keys()].sort(ordem.compare)])];
  for (const nome of categorias) {
    const lista = grupos.get(nome);
    if (!lista) continue;
    const secao = elemento('section', '', 'grupo');
    const titulo = elemento('h2', nome);
    const cards = elemento('ul', '', 'produtos');
    let limite = tamanhoGrupo;
    for (const produto of lista.slice(0, limite)) cards.append(criarProduto(produto));
    secao.append(titulo, cards);

    const mais = elemento('button', `Mostrar mais em ${nome}`, 'acao secundaria');
    mais.type = 'button';
    mais.hidden = limite >= lista.length;
    mais.addEventListener('click', () => {
      const novos = lista.slice(limite, limite + tamanhoGrupo * 2);
      for (const produto of novos) cards.append(criarProduto(produto));
      limite += novos.length;
      mais.hidden = limite >= lista.length;
    });
    secao.append(mais);
    secoes.append(secao);
  }
  resultados.replaceChildren(secoes);
}

function exibirEstoque() {
  const resumo = obter('estoque-resumo');
  if (estoque) {
    const comSaldo = produtos.filter(({ sku }) => Number.isFinite(consultarSaldo(sku))).length;
    resumo.textContent = `${quantidade.format(comSaldo)} de ${quantidade.format(produtos.length)} produtos deste catálogo com saldo informado. Importado em ${dataImportacao.format(estoque.importadoEm)}.`;
  } else {
    resumo.textContent = 'Importe sua posição de estoque para ver o Total Disponível ao lado dos preços. Os dados ficam neste navegador.';
    soDisponiveis.checked = false;
  }
  botaoImportar.textContent = estoque ? 'Atualizar planilha' : 'Importar planilha';
  botaoRemover.hidden = obter('estoque-filtro').hidden = !estoque;
  exibir();
  if (ficha.open) {
    preencherSaldo(obter('ficha-estoque'), produtoAtual.sku);
    atualizarVenda();
  }
}

function aplicarEstoque(novo) {
  estoque = novo;
  consultarSaldo = criarConsultaDeEstoque(novo);
  exibirEstoque();
}

async function carregarEstoque() {
  const arquivo = arquivoEstoque.files[0];
  arquivoEstoque.value = '';
  if (!arquivo) return;
  botaoImportar.disabled = botaoRemover.disabled = true;
  estadoEstoque.textContent = 'Lendo a planilha…';
  try {
    const novo = await importarPlanilha(arquivo);
    aplicarEstoque(novo);
    try {
      localStorage.setItem(chaveEstoque, JSON.stringify(novo));
      estadoEstoque.textContent = 'Estoque importado.';
    } catch {
      estadoEstoque.textContent = 'Estoque carregado nesta aba. O navegador impediu que fosse guardado.';
    }
  } catch (erro) {
    estadoEstoque.textContent = erro.message;
  } finally {
    botaoImportar.disabled = botaoRemover.disabled = false;
  }
}

async function iniciar() {
  const chave = new URLSearchParams(window.location.search).get('marca');
  if (!Object.hasOwn(marcas, chave)) {
    mensagem.textContent = 'Escolha uma das revistas disponíveis em Promoções.';
    return;
  }

  const marca = marcas[chave];
  document.body.dataset.marca = chave;
  obter('titulo').textContent = marca.nome;
  document.title = `${marca.nome} | Promoções`;
  const revista = obter('revista-oficial');
  revista.href = marca.revista;
  revista.hidden = false;
  try {
    const resposta = await fetch(`./dados/${chave}.json`);
    if (!resposta.ok) throw Error('Catálogo indisponível.');
    const catalogo = await resposta.json();
    obter('edicao').textContent = catalogo.edicao;
    const observacao = obter('observacao');
    observacao.textContent = catalogo.observacao;
    observacao.hidden = !catalogo.observacao;
    produtos = catalogo.produtos.map((produto) => ({
      ...produto,
      busca: normalizar([produto.nome, produto.sku, produto.categoria, produto.tipo, produto.aromas].join(' ')),
    })).sort((a, b) => a.preco - b.preco || ordem.compare(a.nome, b.nome));

    if (!produtos.length) {
      mensagem.textContent = 'A indexação desta edição está em preparação. Você já pode abrir a revista oficial acima.';
      return;
    }
    const categorias = [...new Set(produtos.map((produto) => produto.categoria))].sort(ordem.compare);
    for (const nome of categorias) categoria.add(new Option(nome, nome));
    conteudo.hidden = false;
    mensagem.hidden = true;
    exibirEstoque();
  } catch {
    mensagem.textContent = 'O catálogo pesquisável está indisponível. A revista oficial está disponível no link acima.';
  }
}

campo.addEventListener('input', exibir);
categoria.addEventListener('change', exibir);
soDisponiveis.addEventListener('change', exibir);
botaoImportar.addEventListener('click', () => arquivoEstoque.click());
arquivoEstoque.addEventListener('change', carregarEstoque);
botaoRemover.addEventListener('click', () => {
  try {
    localStorage.removeItem(chaveEstoque);
  } catch {
    // O estoque ainda pode ser removido da aba quando o armazenamento está desativado.
  }
  aplicarEstoque(null);
  estadoEstoque.textContent = 'Estoque removido.';
  botaoImportar.focus();
});
melhores.addEventListener('click', () => {
  soMelhores = !soMelhores;
  melhores.setAttribute('aria-pressed', String(soMelhores));
  exibir();
});
objetivoVenda.addEventListener('change', atualizarVenda);
climaVenda.addEventListener('change', atualizarVenda);
obter('copiar-mensagem').addEventListener('click', () => copiarTexto('mensagem-venda', 'estado-mensagem'));
obter('copiar-pedido').addEventListener('click', () => copiarTexto('pedido-ia', 'estado-pedido'));
window.addEventListener('storage', (evento) => {
  if (ficha.open && evento.key === chaveClimaVenda) atualizarVenda();
  if (evento.key === chaveEstoque || evento.key === null) aplicarEstoque(lerEstoque());
});
iniciar();
