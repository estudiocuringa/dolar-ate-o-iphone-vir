export const chaveEstoque = 'promocoes-estoque-v1';

export function lerEstoque() {
  try {
    const estoque = JSON.parse(localStorage.getItem(chaveEstoque));
    if (estoque?.saldos && Number.isFinite(estoque.importadoEm)) return estoque;
  } catch {
    // Sem armazenamento local, o estoque ainda pode ser importado para a aba.
  }
  return null;
}

export function criarConsultaDeEstoque(estoque) {
  const saldos = estoque?.saldos ?? {};
  const numericos = new Map();
  for (const [sku, saldo] of Object.entries(saldos)) {
    if (!/^\d+$/.test(sku)) continue;
    const numero = semZerosIniciais(sku);
    numericos.set(numero, numericos.has(numero) && numericos.get(numero) !== saldo ? null : saldo);
  }
  return (sku) => Object.hasOwn(saldos, sku) ? saldos[sku] : numericos.get(semZerosIniciais(sku));
}

function semZerosIniciais(sku) {
  return sku.replace(/^0+(?=\d+$)/, '');
}

export async function importarPlanilha(arquivo) {
  if (!/\.xlsx$/i.test(arquivo.name)) throw new Error('Escolha uma planilha em formato .xlsx.');
  const buffer = await arquivo.arrayBuffer();
  const worker = new Worker(new URL('./estoque-planilha.js?v=1', import.meta.url));
  try {
    const saldos = await new Promise((resolve, reject) => {
      worker.onmessage = ({ data }) => data.erro ? reject(new Error(data.erro)) : resolve(data.saldos);
      worker.onerror = () => reject(new Error('O leitor de planilhas não está disponível. Tente novamente.'));
      worker.postMessage(buffer, [buffer]);
    });
    return { importadoEm: Date.now(), saldos };
  } finally {
    worker.terminate();
  }
}
