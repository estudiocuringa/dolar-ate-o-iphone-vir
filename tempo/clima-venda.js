export const chaveClimaVenda = 'promocoes-clima-consultado';

export function salvarClimaVenda(cidade, { temperature_2m: temperatura, relative_humidity_2m: umidade }, cena, descricao) {
  if (!Number.isFinite(temperatura)) return;

  let clima = '';
  if (cena === 'chuva' || cena === 'tempestade' || umidade >= 85) clima = 'umido';
  else if (temperatura >= 27) clima = 'calor';
  else if (temperatura <= 18) clima = 'frio';

  try {
    localStorage.setItem(chaveClimaVenda, JSON.stringify({
      cidade, temperatura: Math.round(temperatura), descricao, clima, consultadoEm: Date.now(),
    }));
  } catch {
    // A previsão continua disponível quando o navegador desativa o armazenamento.
  }
}

export function lerClimaVenda() {
  try {
    const consulta = JSON.parse(localStorage.getItem(chaveClimaVenda));
    if (consulta?.cidade && Date.now() - consulta.consultadoEm < 60 * 60_000) return consulta;
  } catch {
    // A ficha também aceita a escolha manual do clima.
  }
  return null;
}
