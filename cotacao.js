const api = 'https://economia.awesomeapi.com.br/json';
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
  timeZone: fuso, dateStyle: 'short', timeStyle: 'short',
});
const formatarDia = new Intl.DateTimeFormat('pt-BR', {
  timeZone: fuso, day: '2-digit', month: '2-digit', year: 'numeric',
});
const formatarEixo = new Intl.DateTimeFormat('pt-BR', {
  timeZone: fuso, day: '2-digit', month: '2-digit',
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

function numero(valor) {
  if (typeof valor === 'number' || (typeof valor === 'string' && valor.trim())) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function lerPonto(dado) {
  const preco = numero(dado?.bid);
  const instante = numero(dado?.timestamp) * 1000;
  if (!(preco > 0) || instante <= 0 || instante > Date.now() + minuto * 5) return null;
  return { preco, instante };
}

function lerCotacao(dado) {
  const ponto = lerPonto(dado);
  if (!ponto) return null;
  return {
    ...ponto,
    minima: numero(dado.low),
    maxima: numero(dado.high),
    venda: numero(dado.ask),
    variacao: numero(dado.pctChange),
  };
}

function lerCache() {
  try {
    const salvo = JSON.parse(localStorage.getItem(chaveCache));
    if (!salvo || Date.now() - Number(salvo.instante) > 7 * dia) return null;
    return lerCotacao({
      bid: salvo.preco, timestamp: salvo.instante / 1000, low: salvo.minima,
      high: salvo.maxima, ask: salvo.venda, pctChange: salvo.variacao,
    });
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
  variacao.textContent = cotacao.variacao === null ? '—' : formatarVariacao.format(cotacao.variacao / 100);
  variacao.dataset.sinal = cotacao.variacao > 0 ? 'positivo' : cotacao.variacao < 0 ? 'negativo' : 'neutro';

  const horario = document.createElement('time');
  horario.dateTime = new Date(cotacao.instante).toISOString();
  horario.textContent = formatarHorario.format(cotacao.instante);
  obter('horario').replaceChildren('Cotação de ', horario, ' · horário de Brasília');
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
  const porDia = new Map();
  for (const ponto of cotacao ? [...historico, cotacao] : historico) {
    const data = chaveDia.format(ponto.instante);
    if (!porDia.has(data) || porDia.get(data).instante <= ponto.instante) {
      porDia.set(data, { ...ponto, dia: Date.parse(data + 'T00:00:00Z') / dia });
    }
  }
  const ordenados = [...porDia.values()].sort((a, b) => a.dia - b.dia);
  const ultimo = ordenados.at(-1)?.dia;
  return ordenados.filter((ponto) => ponto.dia >= ultimo - periodo + 1);
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
    linha.insertCell().textContent = formatarDia.format(ponto.instante);
    linha.insertCell().textContent = formatarMoeda.format(ponto.preco);
    tabela.append(linha);
  }
  obter('registros-lista').replaceChildren(tabela);
  if (pontosVisiveis.length) {
    const primeiro = pontosVisiveis[0];
    const ultimo = pontosVisiveis.at(-1);
    grafico.setAttribute('aria-label', `Histórico de ${formatarDia.format(primeiro.instante)} a ${formatarDia.format(ultimo.instante)}. Último valor: ${formatarMoeda.format(ultimo.preco)}. Consulte a tabela para ver os valores por data.`);
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
    contexto.fillText(formatarEixo.format(ponto.instante), ponto.x, base + 17);
  }
  for (let i = 0; i <= marcas && marcas > 0; i++) {
    const ponto = pontosDesenhados[Math.round(i * indiceUltimo / marcas)];
    contexto.fillText(formatarEixo.format(ponto.instante), ponto.x, base + 17);
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
  obter('detalhe-data').textContent = formatarDia.format(ponto.instante);
  obter('detalhe-valor').textContent = formatarMoeda.format(ponto.preco);
  detalhe.hidden = false;
  const espaco = area.clientWidth - detalhe.offsetWidth;
  detalhe.style.left = `${Math.max(0, Math.min(espaco, ponto.x - detalhe.offsetWidth / 2))}px`;
  desenharGrafico();
}

async function consultar(sufixo) {
  const resposta = await fetch(`${api}/${sufixo}`, {
    signal: AbortSignal.timeout(10_000), cache: 'no-cache',
  });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  return resposta.json();
}

async function atualizarCotacao() {
  try {
    const dados = await consultar('last/USD-BRL');
    const nova = lerCotacao(dados?.USDBRL);
    if (!nova) throw new Error('Cotação ausente ou inválida.');
    if (!cotacao || nova.instante >= cotacao.instante) {
      const precoMudou = cotacao && nova.preco !== cotacao.preco;
      const mudou = !cotacao || nova.preco !== cotacao.preco || nova.instante !== cotacao.instante;
      cotacao = nova;
      salvarCache();
      exibirCotacao();
      if (precoMudou) {
        const preco = obter('preco');
        preco.classList.remove('nova-cotacao');
        requestAnimationFrame(() => preco.classList.add('nova-cotacao'));
      }
      if (mudou && historico.length) exibirHistorico();
    }
    const recente = Date.now() - cotacao.instante < 15 * minuto;
    mostrarEstado(recente ? 'Cotação recente' : 'Última disponível', recente ? 'recente' : 'anterior');
  } catch {
    mostrarEstado(cotacao ? 'Falha ao atualizar' : 'Cotação indisponível', 'erro');
    if (!cotacao) obter('horario').textContent = 'Tente atualizar novamente em instantes.';
  }
}

async function atualizarHistorico() {
  ultimaConsultaHistorico = Date.now();
  try {
    const dados = await consultar('daily/USD-BRL/35');
    if (!Array.isArray(dados)) throw new Error('Histórico inválido.');
    const pontos = dados.map(lerPonto).filter(Boolean);
    if (!pontos.length) throw new Error('Histórico vazio.');
    historico = pontos;
    exibirHistorico();
  } catch {
    if (!historico.length) obter('grafico-estado').textContent = 'Histórico indisponível no momento.';
  }
}

async function atualizar(manual = false) {
  if (consultaEmAndamento) return;
  consultaEmAndamento = true;
  ultimaConsulta = Date.now();
  botaoAtualizar.setAttribute('aria-disabled', 'true');
  obter('atualizar-texto').textContent = 'Consultando…';
  if (!cotacao) mostrarEstado('Consultando', 'espera');

  try {
    const precisoConsultarHistorico = manual || Date.now() - ultimaConsultaHistorico >=
      (historico.length ? 15 * minuto : 2 * minuto);
    const operacoes = [atualizarCotacao()];
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
