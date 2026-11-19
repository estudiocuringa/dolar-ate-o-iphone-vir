const formatoDia = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC',
});

const HORIZONTE = 24;

export function organizarHoras(previsao, modelo) {
  const { current, hourly } = previsao;
  const aPartirDe = current.time.slice(0, 16);
  const temperaturasGoogle = new Map(modelo?.timezone === previsao.timezone
    ? modelo?.hourly?.time?.map((hora, i) => [hora, modelo.hourly.temperature_2m?.[i]])
    : undefined);
  return (hourly?.time ?? []).flatMap((instante, i) => {
    if (instante < aPartirDe) return [];
    return [{
      instante,
      temperatura: hourly.temperature_2m?.[i],
      temperaturaGoogle: temperaturasGoogle.get(instante),
      codigo: hourly.weather_code?.[i],
      noite: hourly.is_day?.[i] === 0,
      chuva: hourly.precipitation_probability?.[i],
    }];
  });
}

export function selecionarHoras(horas, dia) {
  return dia ? horas.filter(hora => hora.instante.startsWith(dia)) : horas.slice(0, HORIZONTE);
}

function desenharCurva(canvas, lista, temperaturas) {
  const { width: largura, height: altura } = canvas.getBoundingClientRect();
  if (!largura || !altura) return;
  const escala = Math.min(window.devicePixelRatio || 1, 2, 4096 / largura);
  canvas.width = Math.ceil(largura * escala);
  canvas.height = Math.ceil(altura * escala);
  const contexto = canvas.getContext('2d');
  const valores = temperaturas.filter(Number.isFinite);
  if (!contexto || !valores.length) return;

  contexto.scale(canvas.width / largura, canvas.height / altura);
  const minima = Math.min(...valores);
  const maxima = Math.max(...valores);
  const amplitude = Math.max(maxima - minima, 4);
  const topo = (maxima + minima + amplitude) / 2;
  const trechos = [[]];
  temperaturas.forEach((valor, i) => {
    if (!Number.isFinite(valor)) {
      if (trechos.at(-1).length) trechos.push([]);
      return;
    }
    const carta = lista.children[i];
    trechos.at(-1).push([
      carta.offsetLeft + carta.offsetWidth / 2,
      9 + (topo - valor) * (altura - 22) / amplitude,
    ]);
  });

  const gradiente = contexto.createLinearGradient(0, 0, 0, altura);
  gradiente.addColorStop(0, '#77b7eab0');
  gradiente.addColorStop(1, '#77b7ea0d');
  contexto.fillStyle = gradiente;
  contexto.strokeStyle = '#1671b5';
  contexto.lineWidth = 2.5;
  contexto.lineJoin = 'round';

  for (const pontos of trechos) {
    if (!pontos.length) continue;
    contexto.beginPath();
    for (const [x, y] of pontos) contexto.lineTo(x, y);
    contexto.stroke();
    contexto.lineTo(pontos.at(-1)[0], altura);
    contexto.lineTo(pontos[0][0], altura);
    contexto.closePath();
    contexto.fill();
    for (const [x, y] of pontos) {
      contexto.beginPath();
      contexto.arc(x, y, 3, 0, Math.PI * 2);
      contexto.stroke();
    }
  }
}

export function criarHorario(descreverTempo, medida) {
  const obter = id => document.getElementById(id);
  const secao = obter('horario');
  const periodo = obter('periodo-horario');
  const rolagem = obter('rolagem-horaria');
  const lista = obter('horas');
  const curva = obter('curva-horaria');
  const anterior = obter('horas-anteriores');
  const seguinte = obter('horas-seguintes');
  let horas = [];
  let temperaturas = [];

  function atualizarSetas() {
    anterior.disabled = rolagem.scrollLeft < 1;
    seguinte.disabled = rolagem.scrollLeft + rolagem.clientWidth >= rolagem.scrollWidth - 1;
  }

  function exibirHoras(reiniciarRolagem = false) {
    const recorte = selecionarHoras(horas, periodo.value);
    const disponivel = recorte.length > 0;
    const usarGoogle = disponivel && recorte.every(hora => Number.isFinite(hora.temperaturaGoogle));
    secao.hidden = false;
    rolagem.hidden = obter('controle-horario').hidden = !disponivel;
    obter('estado-horario').hidden = disponivel;
    obter('fonte-google-horaria').hidden = !usarGoogle;
    obter('fonte-open-meteo-horaria').hidden = !disponivel || usarGoogle;
    temperaturas = recorte.map(hora => usarGoogle ? hora.temperaturaGoogle : hora.temperatura);

    const itens = document.createDocumentFragment();
    for (const [i, hora] of recorte.entries()) {
      const item = obter('molde-hora').content.cloneNode(true);
      const [icone, descricao] = descreverTempo(hora.codigo, hora.noite);
      const instante = hora.instante;
      const selecionar = classe => item.querySelector(classe);
      selecionar('time').dateTime = instante;
      selecionar('.hora-data').textContent = `${instante.slice(8, 10)}/${instante.slice(5, 7)}`;
      selecionar('.hora-relogio').textContent = instante.slice(11, 16);
      selecionar('.hora-icone').textContent = icone;
      selecionar('.hora-temperatura').textContent = medida(temperaturas[i], '°C');
      selecionar('.hora-condicao').textContent = descricao;
      selecionar('.hora-chuva').textContent = `Chuva ${medida(hora.chuva, '%')}`;
      itens.append(item);
    }
    lista.replaceChildren(itens);
    if (reiniciarRolagem) rolagem.scrollTo({ left: 0, behavior: 'instant' });
    atualizarSetas();
    desenharCurva(curva, lista, temperaturas);
  }

  function deslocar(direcao) {
    const passo = Math.max(rolagem.clientWidth - 110, 110);
    rolagem.scrollBy({ left: passo * direcao, behavior: 'instant' });
    atualizarSetas();
  }

  anterior.addEventListener('click', () => deslocar(-1));
  seguinte.addEventListener('click', () => deslocar(1));
  rolagem.addEventListener('scroll', atualizarSetas, { passive: true });
  periodo.addEventListener('change', () => exibirHoras(true));
  new ResizeObserver(() => {
    atualizarSetas();
    desenharCurva(curva, lista, temperaturas);
  }).observe(rolagem);

  return {
    ocultar(cidade) {
      secao.hidden = true;
      periodo.value = '';
      horas = [];
      temperaturas = [];
      lista.replaceChildren();
      const google = new URL('https://www.google.com/search');
      google.searchParams.set('q', `previsão do tempo em ${cidade}`);
      google.searchParams.set('hl', 'pt-BR');
      obter('comparar-google').href = google.href;
    },
    atualizar(previsao, modelo) {
      const escolhido = periodo.value;
      horas = organizarHoras(previsao, modelo);
      const hoje = previsao.current.time.slice(0, 10);
      const dias = new Set(horas.map(hora => hora.instante.slice(0, 10)));
      const opcoes = [...dias].map(dia => new Option(
        dia === hoje ? 'Hoje' : formatoDia.format(new Date(`${dia}T12:00:00Z`)),
        dia,
      ));
      periodo.replaceChildren(new Option('Próximas 24 horas', ''), ...opcoes);
      periodo.value = dias.has(escolhido) ? escolhido : '';
      exibirHoras(!escolhido || !dias.has(escolhido));
    },
  };
}
