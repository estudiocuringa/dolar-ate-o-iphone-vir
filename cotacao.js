const apiPrincipal = 'https://biquote.io/api/USDBRL';
const apiReserva = 'https://economia.awesomeapi.com.br/json';
const fontes = {
  biquote: { nome: 'biquote', link: 'https://biquote.io/docs/' },
  awesome: { nome: 'AwesomeAPI', link: 'https://docs.awesomeapi.com.br/api-de-moedas' },
};
const minuto = 60_000;
const dia = 86_400_000;
const fuso = 'America/Sao_Paulo';
const chaveCache = 'dolar-agora.usd-brl.v1';
const obter = (id) => document.getElementById(id);
const formatarMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', minimumFractionDigits: 4, maximumFractionDigits: 4,
});
const formatarPreco = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 4, maximumFractionDigits: 4,
});
const formatarQuantia = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const formatarVariacao = new Intl.NumberFormat('pt-BR', {
  style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero',
});
const formatarHorario = new Intl.DateTimeFormat('pt-BR', {
  timeZone: fuso, dateStyle: 'short', timeStyle: 'medium',
});
const formatarDia = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric',
});
const formatarEixo = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC', day: '2-digit', month: '2-digit',
});
const chaveDia = new Intl.DateTimeFormat('en-CA', {
  timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit',
});

const botaoAtualizar = obter('atualizar');
const botoesPeriodo = [obter('periodo-7'), obter('periodo-30')];
const quantia = obter('quantia');
const grafico = obter('grafico');
const area = obter('grafico-area');
const detalhe = obter('grafico-detalhe');
const contexto = grafico.getContext('2d');
const signalR = globalThis.signalR;
const conexao = signalR && new signalR.HubConnectionBuilder()
  .withUrl('https://biquote.io/hubs/tick', { withCredentials: false })
  .withAutomaticReconnect()
  .build();

let cotacao = null;
let historico = [];
let periodo = 7;
let reaisParaDolares = false;
let consultaEmAndamento = false;
let ultimaConsulta = 0;
let ultimaConsultaHistorico = 0;
let pontosVisiveis = [];
let pontosDesenhados = [];
let indiceDetalhe = -1;
let ultimoTickRecebido = 0;

function numero(valor) {
  if (typeof valor === 'number' || (typeof valor === 'string' && valor.trim())) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function lerPonto(precoBruto, instante) {
  const preco = numero(precoBruto);
  if (!(preco > 0) || !(instante > 0 && instante <= Date.now() + minuto * 5)) return null;
  return { preco, instante };
}

function diaEmBrasilia(instante) {
  return Date.parse(chaveDia.format(instante) + 'T00:00:00Z');
}

function lerCotacaoReserva(dado) {
  const ponto = lerPonto(dado?.bid, numero(dado?.timestamp) * 1000);
  if (!ponto) return null;
  return {
    ...ponto,
    fonte: 'awesome',
    minima: numero(dado.low),
    maxima: numero(dado.high),
    venda: numero(dado.ask),
    variacao: numero(dado.pctChange),
  };
}

function lerCotacaoPrincipal(dado) {
  if (dado?.symbol !== 'USDBRL') return null;
  const ponto = lerPonto(dado.mid, Date.parse(dado.timestamp));
  if (!ponto) return null;
  return {
    ...ponto,
    fonte: 'biquote',
    minima: numero(dado.low),
    maxima: numero(dado.high),
    venda: numero(dado.ask),
    variacao: numero(dado.dayDiffPercent),
    mercadoFechado: dado.marketState === 'closed',
  };
}

function lerCache() {
  try {
    const salvo = JSON.parse(localStorage.getItem(chaveCache));
    const ponto = lerPonto(salvo?.preco, numero(salvo?.instante));
    if (!ponto || Date.now() - ponto.instante > 7 * dia) return null;
    return {
      ...ponto,
      fonte: salvo.fonte === 'biquote' ? 'biquote' : 'awesome',
      minima: numero(salvo.minima),
      maxima: numero(salvo.maxima),
      venda: numero(salvo.venda),
      variacao: numero(salvo.variacao),
      mercadoFechado: salvo.mercadoFechado === true,
    };
  } catch {
    return null;
  }
}

function salvarCache() {
  try {
    localStorage.setItem(chaveCache, JSON.stringify(cotacao));
  } catch {
    // A cotação permanece disponível na sessão mesmo se o armazenamento estiver bloqueado.
  }
}

function mostrarEstado(texto, tipo) {
  const estado = obter('estado');
  if (estado.textContent !== texto) estado.textContent = texto;
  estado.dataset.tipo = tipo;
}

function exibirCotacao() {
  obter('preco').textContent = formatarPreco.format(cotacao.preco);
  for (const campo of ['minima', 'maxima', 'venda']) {
    obter(campo).textContent = cotacao[campo] > 0 ? formatarMoeda.format(cotacao[campo]) : '—';
  }

  const variacao = obter('variacao');
  variacao.textContent = cotacao.mercadoFechado || cotacao.variacao === null
    ? '—' : formatarVariacao.format(cotacao.variacao / 100);
  variacao.dataset.sinal = cotacao.mercadoFechado ? 'neutro'
    : cotacao.variacao > 0 ? 'positivo' : cotacao.variacao < 0 ? 'negativo' : 'neutro';

  const horario = document.createElement('time');
  horario.dateTime = new Date(cotacao.instante).toISOString();
  horario.textContent = formatarHorario.format(cotacao.instante);
  obter('horario').replaceChildren('Cotação de ', horario, ' · horário de Brasília');
  const fonte = obter('fonte-cotacao');
  fonte.textContent = fontes[cotacao.fonte].nome;
  fonte.href = fontes[cotacao.fonte].link;
  obter('info-fonte-cotacao').hidden = false;
  obter('tipo-cotacao').textContent = cotacao.fonte === 'biquote'
    ? 'Dólar comercial · taxa de referência' : 'Dólar comercial · cotação de compra';
  calcular();
}

function lerQuantia(texto) {
  const valor = texto.trim();
  if (/^\d+(,\d*)?$|^\d{1,3}(\.\d{3})+(,\d*)?$|^,\d+$/.test(valor)) {
    return numero(valor.replaceAll('.', '').replace(',', '.'));
  }
  if (/^\d+\.\d{0,2}$|^\.\d{1,2}$/.test(valor)) return numero(valor);
  return null;
}

function calcular() {
  const n = lerQuantia(quantia.value);
  const invalida = n === null && quantia.value.trim() !== '';
  quantia.setAttribute('aria-invalid', String(invalida));
  obter('conversor-nota').textContent = invalida
    ? 'Digite um valor como 100 ou 100,50.'
    : 'Estimativa sem impostos ou tarifas.';
  const resultado = cotacao && n !== null
    ? (reaisParaDolares ? n / cotacao.preco : n * cotacao.preco)
    : null;
  obter('convertido').value = resultado === null ? '—' : formatarQuantia.format(resultado);
}

function agruparPontos() {
  const porDia = new Map(historico.map((ponto) => [ponto.dia, ponto]));
  const ordenados = [...porDia.values()].sort((a, b) => a.dia - b.dia);
  const ultimo = ordenados.at(-1)?.dia;
  return ordenados.filter((ponto) => ponto.dia >= ultimo - (periodo - 1) * dia);
}

function exibirHistorico() {
  pontosVisiveis = historico.length ? agruparPontos() : [];
  grafico.hidden = pontosVisiveis.length === 0 || !contexto;
  const linhaEstado = obter('grafico-estado');
  linhaEstado.hidden = pontosVisiveis.length > 0 && Boolean(contexto);
  if (pontosVisiveis.length > 0 && !contexto) {
    linhaEstado.textContent = 'Consulte os valores na tabela abaixo.';
  }
  obter('registros').hidden = pontosVisiveis.length === 0;

  const tabela = document.createDocumentFragment();
  for (const ponto of [...pontosVisiveis].reverse()) {
    const linha = document.createElement('tr');
    linha.insertCell().textContent = formatarDia.format(ponto.dia);
    linha.insertCell().textContent = formatarMoeda.format(ponto.preco);
    tabela.append(linha);
  }
  obter('registros-lista').replaceChildren(tabela);
  if (pontosVisiveis.length) {
    const primeiro = pontosVisiveis[0];
    const ultimo = pontosVisiveis.at(-1);
    grafico.setAttribute('aria-label', `Histórico de ${formatarDia.format(primeiro.dia)} a ${formatarDia.format(ultimo.dia)}. Último valor: ${formatarMoeda.format(ultimo.preco)}. Consulte a tabela para ver os valores por data.`);
  }
  esconderDetalhe();
}

function desenharGrafico() {
  if (grafico.hidden || !contexto) return;
  const { width, height } = area.getBoundingClientRect();
  if (!width || !height) return;

  const densidade = window.devicePixelRatio || 1;
  const larguraPixels = Math.round(width * densidade);
  const alturaPixels = Math.round(height * densidade);
  if (grafico.width !== larguraPixels || grafico.height !== alturaPixels) {
    grafico.width = larguraPixels;
    grafico.height = alturaPixels;
  }
  contexto.setTransform(densidade, 0, 0, densidade, 0, 0);
  contexto.clearRect(0, 0, width, height);

  const esquerda = 61;
  const direita = width - 18;
  const topo = 13;
  const base = height - 29;
  const precos = pontosVisiveis.map((ponto) => ponto.preco);
  const minimo = Math.min(...precos);
  const maximo = Math.max(...precos);
  const margem = Math.max((maximo - minimo) * .16, .001);
  const limiteInferior = Math.max(minimo - margem, 0);
  const limiteSuperior = maximo + margem;
  const amplitude = limiteSuperior - limiteInferior;
  const primeiroDia = pontosVisiveis[0].dia;
  const ultimoDia = pontosVisiveis.at(-1).dia;
  const posicaoX = (d) => ultimoDia === primeiroDia
    ? (esquerda + direita) / 2
    : esquerda + (d - primeiroDia) / (ultimoDia - primeiroDia) * (direita - esquerda);
  const posicaoY = (preco) => base - (preco - limiteInferior) / amplitude * (base - topo);
  pontosDesenhados = pontosVisiveis.map((ponto) => ({
    ...ponto, x: posicaoX(ponto.dia), y: posicaoY(ponto.preco),
  }));

  contexto.font = '12px system-ui, sans-serif';
  contexto.textBaseline = 'middle';
  contexto.textAlign = 'left';
  contexto.lineWidth = 1;
  contexto.strokeStyle = '#623440';
  contexto.fillStyle = '#e4b3bd';
  for (let i = 0; i <= 4; i++) {
    const valor = limiteInferior + amplitude * i / 4;
    const y = posicaoY(valor);
    contexto.beginPath();
    contexto.moveTo(esquerda, y);
    contexto.lineTo(direita, y);
    contexto.stroke();
    contexto.fillText(formatarMoeda.format(valor), 0, y);
  }

  const indiceUltimo = pontosDesenhados.length - 1;
  const marcas = Math.min(indiceUltimo, width > 550 ? 5 : 2);
  contexto.textAlign = 'center';
  if (marcas === 0) {
    const ponto = pontosDesenhados[0];
    contexto.fillText(formatarEixo.format(ponto.dia), ponto.x, base + 17);
  }
  for (let i = 0; i <= marcas && marcas > 0; i++) {
    const ponto = pontosDesenhados[Math.round(i * indiceUltimo / marcas)];
    contexto.fillText(formatarEixo.format(ponto.dia), ponto.x, base + 17);
  }

  const primeiro = pontosDesenhados[0];
  const ultimo = pontosDesenhados.at(-1);
  const linha = new Path2D();
  linha.moveTo(primeiro.x, primeiro.y);
  for (const ponto of pontosDesenhados.slice(1)) linha.lineTo(ponto.x, ponto.y);

  if (pontosDesenhados.length > 1) {
    const preenchimento = new Path2D(linha);
    preenchimento.lineTo(ultimo.x, base);
    preenchimento.lineTo(primeiro.x, base);
    preenchimento.closePath();
    const gradiente = contexto.createLinearGradient(0, topo, 0, base);
    gradiente.addColorStop(0, '#f8b54955');
    gradiente.addColorStop(1, '#f8b54909');
    contexto.fillStyle = gradiente;
    contexto.fill(preenchimento);
    contexto.strokeStyle = '#ffdf68';
    contexto.lineWidth = 2.5;
    contexto.lineJoin = 'round';
    contexto.stroke(linha);
  }

  const destaque = pontosDesenhados[indiceDetalhe] ?? ultimo;
  if (indiceDetalhe !== -1) {
    contexto.beginPath();
    contexto.moveTo(destaque.x, topo);
    contexto.lineTo(destaque.x, base);
    contexto.strokeStyle = '#bd8283';
    contexto.lineWidth = 1;
    contexto.stroke();
  }
  contexto.beginPath();
  contexto.arc(destaque.x, destaque.y, 4.6, 0, 2 * Math.PI);
  contexto.fillStyle = '#ffdf68';
  contexto.fill();
  contexto.strokeStyle = '#2d111b';
  contexto.lineWidth = 1.8;
  contexto.stroke();
}

function esconderDetalhe() {
  indiceDetalhe = -1;
  detalhe.hidden = true;
  desenharGrafico();
}

function mostrarDetalhe(evento) {
  if (!pontosDesenhados.length) return;
  const x = evento.clientX - area.getBoundingClientRect().left;
  indiceDetalhe = pontosDesenhados.reduce((melhor, ponto, i) =>
    Math.abs(ponto.x - x) < Math.abs(pontosDesenhados[melhor].x - x) ? i : melhor, 0);
  const ponto = pontosDesenhados[indiceDetalhe];
  obter('detalhe-data').textContent = formatarDia.format(ponto.dia);
  obter('detalhe-valor').textContent = formatarMoeda.format(ponto.preco);
  detalhe.hidden = false;
  const espaco = area.clientWidth - detalhe.offsetWidth;
  detalhe.style.left = `${Math.max(0, Math.min(espaco, ponto.x - detalhe.offsetWidth / 2))}px`;
  desenharGrafico();
}

async function consultar(url) {
  const resposta = await fetch(url, {
    signal: AbortSignal.timeout(6000), cache: 'no-cache', credentials: 'omit',
  });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  return resposta.json();
}

function fluxoRecente() {
  return conexao && conexao.state === signalR.HubConnectionState.Connected
    && Date.now() - ultimoTickRecebido < 2 * minuto;
}

function mostrarEstadoCotacao() {
  if (cotacao.mercadoFechado) {
    mostrarEstado('Mercado fechado', 'anterior');
  } else if (Date.now() - cotacao.instante >= 5 * minuto) {
    mostrarEstado('Última disponível', 'anterior');
  } else {
    mostrarEstado(fluxoRecente() && cotacao.fonte === 'biquote' ? 'Atualização ao vivo' : 'Cotação recente', 'recente');
  }
}

function exibirNovaCotacao(nova) {
  if (!cotacao || nova.instante >= cotacao.instante) {
    const precoMudou = cotacao && formatarPreco.format(nova.preco) !== formatarPreco.format(cotacao.preco);
    cotacao = nova;
    salvarCache();
    exibirCotacao();
    if (precoMudou) {
      const preco = obter('preco');
      preco.classList.remove('nova-cotacao');
      requestAnimationFrame(() => preco.classList.add('nova-cotacao'));
    }
  }
  mostrarEstadoCotacao();
}

async function assinarCotacao() {
  try {
    await conexao.invoke('Subscribe', ['USDBRL']);
  } catch {
    await conexao.stop();
  }
}

async function iniciarFluxo() {
  if (!conexao || conexao.state !== signalR.HubConnectionState.Disconnected) return;
  try {
    await conexao.start();
    await assinarCotacao();
  } catch {
    // A atualização por consulta continua disponível durante falhas na conexão.
  }
}

conexao?.on('ReceiveTick', (dado) => {
  const nova = lerCotacaoPrincipal(dado);
  if (!nova || document.hidden) return;
  ultimoTickRecebido = Date.now();
  exibirNovaCotacao(nova);
});
conexao?.onreconnected(assinarCotacao);
conexao?.onreconnecting(() => {
  ultimoTickRecebido = 0;
  if (cotacao) mostrarEstadoCotacao();
});

async function atualizarCotacao() {
  try {
    const nova = lerCotacaoPrincipal(await consultar(apiPrincipal));
    if (!nova) throw new Error('Cotação inválida.');
    exibirNovaCotacao(nova);
    return;
  } catch {
    if (fluxoRecente()) return;
  }

  try {
    const dados = await consultar(`${apiReserva}/last/USD-BRL`);
    const nova = lerCotacaoReserva(dados?.USDBRL);
    if (!nova) throw new Error('Cotação inválida.');
    if (!fluxoRecente()) exibirNovaCotacao(nova);
  } catch {
    if (fluxoRecente()) return;
    mostrarEstado(cotacao ? 'Falha ao atualizar' : 'Cotação indisponível', 'erro');
    if (!cotacao) obter('horario').textContent = 'Tente atualizar novamente em instantes.';
  }
}

function exibirDadosHistoricos(pontos, fonte) {
  if (!pontos.length) throw new Error('Histórico vazio.');
  historico = pontos.sort((a, b) => a.instante - b.instante);
  obter('historico-subtitulo').textContent = fonte === 'biquote'
    ? 'Taxa de referência em reais por dólar · biquote'
    : 'Cotação de compra em reais por dólar · AwesomeAPI';
  obter('historico-valor').textContent = fonte === 'biquote' ? 'Referência' : 'Compra';
  exibirHistorico();
}

async function atualizarHistorico() {
  ultimaConsultaHistorico = Date.now();
  try {
    const dados = await consultar(`${apiPrincipal}/ohlc?interval=1d&limit=35`);
    if (dados?.symbol !== 'USDBRL' || !Array.isArray(dados.bars)) throw new Error('Histórico inválido.');
    const pontos = dados.bars.map((barra) => lerPonto(barra?.close, Date.parse(barra?.openTime))).filter(Boolean);
    exibirDadosHistoricos(pontos.map((ponto) => ({ ...ponto, dia: Math.floor(ponto.instante / dia) * dia })), 'biquote');
    return;
  } catch {
    if (historico.length) return;
  }
  try {
    const dados = await consultar(`${apiReserva}/daily/USD-BRL/35`);
    if (!Array.isArray(dados)) throw new Error('Histórico inválido.');
    const pontos = dados.map((item) => lerPonto(item?.bid, numero(item?.timestamp) * 1000)).filter(Boolean);
    exibirDadosHistoricos(pontos.map((ponto) => ({ ...ponto, dia: diaEmBrasilia(ponto.instante) })), 'awesome');
  } catch {
    obter('grafico-estado').textContent = 'Histórico indisponível no momento.';
  }
}

async function atualizar(manual = false) {
  if (consultaEmAndamento) return;
  void iniciarFluxo();
  consultaEmAndamento = true;
  ultimaConsulta = Date.now();
  const consultarCotacao = manual || !fluxoRecente();
  if (consultarCotacao) {
    botaoAtualizar.setAttribute('aria-disabled', 'true');
    obter('atualizar-texto').textContent = 'Consultando…';
    if (!cotacao) mostrarEstado('Consultando', 'espera');
  }

  try {
    const precisoConsultarHistorico = manual || Date.now() - ultimaConsultaHistorico >=
      (historico.length ? 15 * minuto : 2 * minuto);
    const operacoes = consultarCotacao ? [atualizarCotacao()] : [];
    if (!consultarCotacao && cotacao) mostrarEstadoCotacao();
    if (precisoConsultarHistorico) operacoes.push(atualizarHistorico());
    await Promise.all(operacoes);
  } finally {
    consultaEmAndamento = false;
    botaoAtualizar.removeAttribute('aria-disabled');
    obter('atualizar-texto').textContent = 'Atualizar agora';
  }
}

quantia.addEventListener('input', calcular);
obter('inverter').addEventListener('click', () => {
  reaisParaDolares = !reaisParaDolares;
  obter('de-nome').textContent = reaisParaDolares ? 'reais' : 'dólares';
  obter('para-nome').textContent = reaisParaDolares ? 'dólares' : 'reais';
  obter('de-codigo').textContent = reaisParaDolares ? 'BRL' : 'USD';
  obter('para-codigo').textContent = reaisParaDolares ? 'USD' : 'BRL';
  calcular();
});

for (const [i, botao] of botoesPeriodo.entries()) {
  botao.addEventListener('click', () => {
    periodo = i === 0 ? 7 : 30;
    botoesPeriodo.forEach((item) => item.setAttribute('aria-pressed', String(item === botao)));
    exibirHistorico();
  });
}

grafico.addEventListener('pointermove', mostrarDetalhe);
grafico.addEventListener('pointerdown', mostrarDetalhe);
grafico.addEventListener('pointerleave', esconderDetalhe);
new ResizeObserver(esconderDetalhe).observe(area);

const botaoAnimacoes = obter('animacoes');
botaoAnimacoes.addEventListener('click', () => {
  const pausado = obter('inicio').toggleAttribute('data-pausado');
  botaoAnimacoes.textContent = pausado ? 'Retomar animações' : 'Pausar animações';
});
obter('preco').addEventListener('animationend', () => obter('preco').classList.remove('nova-cotacao'));

botaoAtualizar.addEventListener('click', () => atualizar(true));
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && Date.now() - ultimaConsulta >= minuto) atualizar();
});
setInterval(() => {
  if (!document.hidden) atualizar();
}, minuto);

cotacao = lerCache();
if (cotacao) {
  exibirCotacao();
  mostrarEstado('Cotação salva', 'anterior');
}
atualizar();
