import { salvarClimaVenda } from './clima-venda.js?v=1';
import { criarHorario } from './horario.js?v=2';

const obter = (id) => document.getElementById(id);
const formCidade = obter('form-cidade');
const consulta = obter('consulta');
const sugestoes = obter('sugestoes');
const buscaEstado = obter('busca-estado');
const cidades = obter('cidades');
const estado = obter('previsao-estado');
const botaoAtualizar = obter('atualizar');
const condicoes = obter('condicoes');
const semana = obter('semana');
const dataAtual = obter('data-atual');
const moldeDia = obter('molde-dia');
const buscaTempo = obter('busca-tempo');
const cenaLegenda = obter('cena-legenda');
const pausarCena = obter('pausar-cena');
const horario = criarHorario(dadosDoTempo, medida);

const INTERVALO = 15 * 60_000;
const MUNICIPIO_INICIAL = { id: 3169901, nome: 'Ubá', uf: 'MG', lat: -21.1201, lon: -42.9425 };
const CHAVE_MUNICIPIO = 'tempo-municipio-preferido';
const ESTADOS = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
  PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo',
  SE: 'Sergipe', TO: 'Tocantins',
};

const TEMPO = {
  0: ['☀️', 'Céu limpo', 'sol'],
  1: ['🌤️', 'Poucas nuvens', 'sol-nuvens'],
  2: ['⛅', 'Parcialmente nublado', 'sol-nuvens'],
  3: ['☁️', 'Encoberto', 'nublado'],
  45: ['🌫️', 'Nevoeiro', 'nevoeiro'],
  48: ['🌫️', 'Nevoeiro com geada', 'nevoeiro'],
  51: ['🌦️', 'Garoa fraca', 'chuva'],
  53: ['🌦️', 'Garoa moderada', 'chuva'],
  55: ['🌧️', 'Garoa intensa', 'chuva'],
  56: ['🌧️', 'Garoa congelante', 'chuva'],
  57: ['🌧️', 'Garoa congelante intensa', 'chuva'],
  61: ['🌦️', 'Chuva fraca', 'chuva'],
  63: ['🌧️', 'Chuva moderada', 'chuva'],
  65: ['🌧️', 'Chuva forte', 'chuva'],
  66: ['🌧️', 'Chuva congelante', 'chuva'],
  67: ['🌧️', 'Chuva congelante forte', 'chuva'],
  71: ['🌨️', 'Neve fraca', 'neve'],
  73: ['🌨️', 'Neve moderada', 'neve'],
  75: ['🌨️', 'Neve forte', 'neve'],
  77: ['🌨️', 'Grãos de neve', 'neve'],
  80: ['🌦️', 'Pancadas fracas', 'chuva'],
  81: ['🌧️', 'Pancadas moderadas', 'chuva'],
  82: ['🌧️', 'Pancadas fortes', 'chuva'],
  85: ['🌨️', 'Pancadas de neve fracas', 'neve'],
  86: ['🌨️', 'Pancadas de neve fortes', 'neve'],
  95: ['⛈️', 'Trovoadas', 'tempestade'],
  96: ['⛈️', 'Trovoadas com granizo', 'tempestade'],
  99: ['⛈️', 'Trovoadas com granizo forte', 'tempestade'],
};

const formatoDia = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short', timeZone: 'UTC',
});

let catalogo;
let numeroBusca = 0;
let municipioSelecionado;
let requisicao;
let ultimaConsulta = 0;

function normalizar(texto) {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

function nomeCompleto({ nome, uf }) {
  return `${nome}, ${uf}`;
}

function lerMunicipioPreferido() {
  try {
    return Number(localStorage.getItem(CHAVE_MUNICIPIO));
  } catch {
    return 0;
  }
}

async function lerJson(url, opcao) {
  const resposta = await fetch(url, opcao);
  if (!resposta.ok) throw new Error('Consulta indisponível.');
  return resposta.json();
}

function obterCatalogo() {
  if (!catalogo) {
    catalogo = lerJson('./municipios.json', { signal: AbortSignal.timeout(10_000) })
      .then((municipios) => municipios.map(([id, nome, uf, lat, lon]) => {
        const chave = normalizar(nome);
        return { id, nome, uf, lat, lon, chaves: [
          chave, `${chave} ${uf.toLowerCase()}`, `${chave} ${normalizar(ESTADOS[uf])}`,
        ] };
      }))
      .catch((erro) => {
        catalogo = undefined;
        throw erro;
      });
  }
  return catalogo;
}

function pontuar(municipio, termo) {
  if (municipio.chaves.includes(termo)) return 3;
  if (municipio.chaves.some((chave) => chave.startsWith(termo))) return 2;
  if (municipio.chaves[0].includes(termo)) return 1;
  return 0;
}

function fecharSugestoes() {
  numeroBusca++;
  sugestoes.hidden = true;
}

async function pesquisar(enviar = false) {
  const termo = normalizar(consulta.value);
  if (termo.length < 2) {
    fecharSugestoes();
    return;
  }
  const pedido = ++numeroBusca;
  sugestoes.hidden = false;
  buscaEstado.textContent = 'Buscando cidades…';
  cidades.replaceChildren();

  try {
    const municipios = await obterCatalogo();
    if (pedido !== numeroBusca) return;
    const resultados = municipios.map((municipio) => ({ municipio, pontos: pontuar(municipio, termo) }))
      .filter(({ pontos }) => pontos > 0)
      .sort((a, b) => b.pontos - a.pontos);
    const exatos = resultados.filter(({ pontos }) => pontos === 3);
    if (enviar && exatos.length === 1) {
      selecionar(exatos[0].municipio);
      return;
    }
    if (enviar && resultados.length === 1) {
      selecionar(resultados[0].municipio);
      return;
    }
    buscaEstado.textContent = resultados.length === 0
      ? 'Cidade não encontrada. Confira a grafia ou tente outro município.'
      : resultados.length > 8 ? 'Digite mais letras ou a sigla do estado para refinar.' : 'Escolha sua cidade.';
    for (const { municipio } of resultados.slice(0, 8)) {
      const item = document.createElement('li');
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.textContent = nomeCompleto(municipio);
      botao.addEventListener('click', () => selecionar(municipio));
      item.append(botao);
      cidades.append(item);
    }
  } catch {
    if (pedido !== numeroBusca) return;
    buscaEstado.textContent = 'A busca está indisponível. Clique em Buscar para tentar novamente.';
  }
}

function selecionar(municipio) {
  fecharSugestoes();
  try {
    localStorage.setItem(CHAVE_MUNICIPIO, String(municipio.id));
  } catch {
    // A cidade escolhida permanece disponível no endereço da página.
  }
  const url = new URL(window.location.href);
  url.searchParams.set('cidade', municipio.id);
  window.history.replaceState(null, '', url);
  abrirPrevisao(municipio);
  obter('municipio').focus({ preventScroll: true });
}

function abrirPrevisao(municipio) {
  municipioSelecionado = municipio;
  const nome = nomeCompleto(municipio);
  consulta.value = nome;
  obter('municipio').textContent = nome;
  horario.ocultar(nome);
  condicoes.hidden = semana.hidden = dataAtual.hidden = true;
  atualizarCena();
  cidades.replaceChildren();
  consultar();
}

function dadosDoTempo(codigo, noite = false) {
  const dados = TEMPO[codigo] ?? ['🌡️', 'Condição indisponível'];
  if (!noite) return dados;
  if (codigo === 0 || codigo === 1) return ['🌙', ...dados.slice(1)];
  if (codigo === 2) return ['☁️', ...dados.slice(1)];
  if (codigo === 51 || codigo === 61 || codigo === 80) return ['🌧️', ...dados.slice(1)];
  return dados;
}

function atualizarCena(codigo) {
  const [, descricao, cena = 'neutro'] = dadosDoTempo(codigo);
  buscaTempo.dataset.cena = cena;
  cenaLegenda.hidden = pausarCena.hidden = cena === 'neutro';
  if (cena !== 'neutro') cenaLegenda.textContent = `Hoje · ${descricao}`;
}

function medida(n, unidade) {
  return Number.isFinite(n) ? `${Math.round(n)}${unidade}` : '—';
}

function dataCurta(data) {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}`;
}

function exibirPrevisao({ current, daily }) {
  const [icone, descricao] = dadosDoTempo(current.weather_code, current.is_day === 0);
  const instante = document.createElement('time');
  instante.dateTime = current.time;
  instante.textContent = `${dataCurta(current.time)}, ${current.time.slice(11, 16)}`;
  dataAtual.replaceChildren('Dados de ', instante, ' (hora local)');
  obter('icone-atual').textContent = icone;
  obter('temperatura-atual').textContent = medida(current.temperature_2m, '°C');
  obter('descricao-atual').textContent = descricao;
  obter('sensacao').textContent = medida(current.apparent_temperature, '°C');
  obter('umidade').textContent = medida(current.relative_humidity_2m, '%');
  obter('vento').textContent = medida(current.wind_speed_10m, ' km/h');

  const dias = document.createDocumentFragment();
  daily.time.forEach((data, i) => {
    const dia = moldeDia.content.cloneNode(true);
    const [icone, descricao] = dadosDoTempo(daily.weather_code?.[i]);
    dia.querySelector('h3').textContent = data === current.time.slice(0, 10)
      ? 'Hoje' : formatoDia.format(new Date(`${data}T12:00:00Z`)).replace('.', '');
    const diaData = dia.querySelector('time');
    diaData.dateTime = data;
    diaData.textContent = dataCurta(data);
    dia.querySelector('.icone-dia').textContent = icone;
    dia.querySelector('.condicao-dia').textContent = descricao;
    dia.querySelector('.maxima-valor').textContent = medida(daily.temperature_2m_max?.[i], '°');
    dia.querySelector('.minima-valor').textContent = medida(daily.temperature_2m_min?.[i], '°');
    dia.querySelector('.chuva').textContent = `Chuva ${medida(daily.precipitation_probability_max?.[i], '%')}`;
    dias.append(dia);
  });
  obter('dias').replaceChildren(dias);
  const hoje = daily.time.indexOf(current.time.slice(0, 10));
  atualizarCena(daily.weather_code?.[hoje]);
  condicoes.hidden = semana.hidden = dataAtual.hidden = false;
}

async function consultar() {
  requisicao?.abort();
  const pedido = new AbortController();
  requisicao = pedido;
  const timeout = setTimeout(() => pedido.abort(), 10_000);
  ultimaConsulta = Date.now();
  botaoAtualizar.setAttribute('aria-disabled', 'true');
  estado.hidden = false;
  estado.textContent = condicoes.hidden ? 'Consultando a previsão…' : 'Atualizando a previsão…';

  const { lat, lon } = municipioSelecionado;
  const coordenadas = {
    latitude: lat,
    longitude: lon,
    timezone: 'auto',
    forecast_days: 7,
  };
  const parametros = new URLSearchParams({
    ...coordenadas,
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    hourly: 'temperature_2m,precipitation_probability,weather_code,is_day',
  });
  const parametrosGoogle = new URLSearchParams({
    ...coordenadas,
    hourly: 'temperature_2m',
    models: 'google_weathernext2_ensemble_mean',
  });
  const modeloGoogle = lerJson(`https://ensemble-api.open-meteo.com/v1/ensemble?${parametrosGoogle}`, {
    signal: AbortSignal.any([pedido.signal, AbortSignal.timeout(4_500)]),
  }).catch(() => null);
  try {
    const previsao = await lerJson(`https://api.open-meteo.com/v1/forecast?${parametros}`, {
      signal: pedido.signal, cache: 'no-cache',
    });
    if (requisicao !== pedido) return;
    if (!previsao.current?.time || previsao.daily?.time?.length !== 7) {
      throw new Error('Previsão incompleta.');
    }
    exibirPrevisao(previsao);
    const cidadeDaUrl = Number(new URLSearchParams(window.location.search).get('cidade'));
    if ([cidadeDaUrl, lerMunicipioPreferido()].includes(municipioSelecionado.id)) {
      const [, descricao, cena] = dadosDoTempo(previsao.current.weather_code);
      salvarClimaVenda(nomeCompleto(municipioSelecionado), previsao.current, cena, descricao);
    }
    estado.hidden = true;
    const temperaturasGoogle = await modeloGoogle;
    if (requisicao === pedido) horario.atualizar(previsao, temperaturasGoogle);
  } catch {
    if (requisicao !== pedido) return;
    estado.textContent = condicoes.hidden
      ? 'A previsão está indisponível no momento. Tente atualizar novamente.'
      : 'Falha ao atualizar. Os dados da última consulta continuam abaixo.';
  } finally {
    clearTimeout(timeout);
    pedido.abort();
    if (requisicao === pedido) {
      requisicao = undefined;
      botaoAtualizar.removeAttribute('aria-disabled');
    }
  }
}

async function iniciar() {
  let municipio = MUNICIPIO_INICIAL;
  const preferido = lerMunicipioPreferido();
  const id = Number(new URLSearchParams(window.location.search).get('cidade')) || preferido;
  if (id && id !== MUNICIPIO_INICIAL.id) {
    try {
      const municipios = await obterCatalogo();
      if (municipioSelecionado) return;
      municipio = municipios.find((opcao) => opcao.id === id)
        ?? municipios.find((opcao) => opcao.id === preferido)
        ?? municipio;
    } catch {
      if (municipioSelecionado) return;
    }
  }
  abrirPrevisao(municipio);
}

function atualizarSeNecessario() {
  if (municipioSelecionado && !document.hidden && !requisicao && Date.now() - ultimaConsulta >= INTERVALO) consultar();
}

consulta.addEventListener('input', () => pesquisar());
formCidade.addEventListener('submit', (evento) => {
  evento.preventDefault();
  pesquisar(true);
});
formCidade.addEventListener('keydown', (evento) => {
  if (evento.key === 'Escape' && !sugestoes.hidden) {
    evento.preventDefault();
    fecharSugestoes();
    consulta.focus();
  }
});
document.addEventListener('click', (evento) => {
  if (!formCidade.contains(evento.target) && !sugestoes.hidden) fecharSugestoes();
});
document.addEventListener('visibilitychange', atualizarSeNecessario);
botaoAtualizar.addEventListener('click', () => {
  if (municipioSelecionado && !requisicao) consultar();
});
pausarCena.addEventListener('click', () => {
  const pausado = buscaTempo.toggleAttribute('data-pausado');
  pausarCena.textContent = pausado ? 'Retomar animação' : 'Pausar animação';
});
setInterval(atualizarSeNecessario, 60_000);
iniciar();
