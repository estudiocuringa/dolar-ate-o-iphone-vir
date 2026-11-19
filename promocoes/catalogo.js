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
const dinheiro = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const quantidade = new Intl.NumberFormat('pt-BR');
const ordem = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
const tamanhoGrupo = 4;
const principais = ['Perfumaria', 'Cabelo', 'Maquiagem', 'Corpo e Banho', 'Cuidados com a pele'];
let produtos = [];
let soMelhores = false;

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
  preco.textContent = dinheiro.format(produto.preco);
  anterior.hidden = !(produto.anterior > produto.preco);
  anterior.textContent = anterior.hidden ? '' : dinheiro.format(produto.anterior);
}

function abrirFicha(produto) {
  obter('ficha-tipo').textContent = `${produto.categoria} · ${produto.tipo}`;
  obter('ficha-nome').textContent = produto.nome;
  preencherPreco(obter('ficha-preco'), obter('ficha-anterior'), produto);

  const dados = [
    ['Código', produto.sku],
    ['Apresentação', produto.volume],
    ['Aromas e família olfativa', produto.aromas],
    ['Diferencial', produto.diferencial || 'Consulte a ficha original para mais detalhes.'],
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

  obter('ficha-venda').textContent = produto.venda || sugerirVenda(produto);
  obter('ficha-fonte').href = produto.fonte;
  ficha.showModal();
}

function sugerirVenda(produto) {
  if (produto.tipo.startsWith('Refil de ')) return 'Confirme se a pessoa já tem a embalagem compatível. Compare o preço do refil com o da versão completa e explique como incluí-lo na rotina.';
  if (produto.tipo.startsWith('Kits de ')) return 'Pergunte para quem é o presente e qual é o orçamento. Mostre os itens do kit e explique como podem ser usados juntos.';
  switch (produto.categoria) {
    case 'Perfumaria':
      return 'Pergunte quais fragrâncias a pessoa já usa e em que ocasião pretende usar esta. Apresente as notas descritas pela marca e sugira experimentar na pele antes de escolher.';
    case 'Cabelo':
      return 'Pergunte como é a rotina capilar e qual resultado a pessoa procura. Mostre como este produto entra na rotina e ofereça um complemento apenas se ele atender a outra necessidade.';
    case 'Maquiagem':
      return 'Pergunte sobre acabamento, tom e ocasião. Mostre como o produto fica numa aplicação leve e, se possível, compare com outra opção de cor ou acabamento.';
    default:
      return 'Pergunte se a compra é para uso próprio ou presente. Mostre o diferencial e o tamanho do item e confirme se ele atende à rotina e ao orçamento da pessoa.';
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
  const botao = cartao.querySelector('.ver-produto');
  botao.setAttribute('aria-label', `Ver ficha de ${produto.nome}`);
  botao.addEventListener('click', () => abrirFicha(produto));
  return cartao;
}

function filtrar() {
  const termos = normalizar(campo.value).split(' ').filter(Boolean);
  const filtrados = produtos.filter((produto) =>
    (!categoria.value || produto.categoria === categoria.value) &&
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
  resumo.textContent = itens.length
    ? `${quantidade.format(itens.length)} ${itens.length === 1 ? 'produto' : 'produtos'} · ${soMelhores ? 'menor preço por tipo' : 'ordem de menor preço em cada categoria'}`
    : 'Nenhum produto encontrado. Tente outro nome ou categoria.';
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
    exibir();
  } catch {
    mensagem.textContent = 'O catálogo pesquisável está indisponível. A revista oficial está disponível no link acima.';
  }
}

campo.addEventListener('input', exibir);
categoria.addEventListener('change', exibir);
melhores.addEventListener('click', () => {
  soMelhores = !soMelhores;
  melhores.setAttribute('aria-pressed', String(soMelhores));
  exibir();
});
iniciar();
