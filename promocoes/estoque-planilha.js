/* global XLSX */
importScripts('./vendor/xlsx-0.20.3.mini.min.js');

function normalizarCabecalho(texto) {
  return String(texto ?? '').normalize('NFD').replace(/\p{M}/gu, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

function lerQuantidade(valor) {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  if (typeof valor !== 'string') return undefined;
  const texto = valor.trim();
  if (!/^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/.test(texto)) return undefined;
  const numero = Number(texto.replaceAll('.', '').replace(',', '.'));
  return Number.isFinite(numero) ? numero : undefined;
}

function lerPlanilha(buffer) {
  const assinatura = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
  if (assinatura[0] !== 80 || assinatura[1] !== 75) {
    throw new Error('Escolha a exportação de posição do estoque em formato .xlsx.');
  }

  let livro;
  try {
    livro = XLSX.read(buffer, { dense: true, cellHTML: false, cellText: false, cellFormula: false });
  } catch {
    throw new Error('O arquivo .xlsx não pôde ser lido. Exporte a planilha novamente.');
  }

  const abas = [...livro.SheetNames].sort((a, b) =>
    Number(normalizarCabecalho(b) === 'posicaoestoque') - Number(normalizarCabecalho(a) === 'posicaoestoque'));
  for (const nome of abas) {
    const linhas = XLSX.utils.sheet_to_json(livro.Sheets[nome], { header: 1, raw: true, blankrows: false });
    for (const [indice, cabecalhos] of linhas.slice(0, 25).entries()) {
      const colunas = cabecalhos.map(normalizarCabecalho);
      const codigo = colunas.indexOf('codigomaterial');
      const total = colunas.indexOf('totaldisponivel');
      if (codigo < 0 || total < 0) continue;

      const saldos = new Map();
      for (const linha of linhas.slice(indice + 1)) {
        const sku = String(linha[codigo] ?? '').trim();
        const unidades = lerQuantidade(linha[total]);
        if (!sku || unidades === undefined) continue;
        // O total já vem agregado. Repetições iguais valem uma vez.
        saldos.set(sku, saldos.has(sku) && saldos.get(sku) !== unidades ? null : unidades);
      }
      if (!saldos.size) throw new Error('A planilha tem as colunas esperadas, mas está sem saldos numéricos.');
      return Object.fromEntries(saldos);
    }
  }
  throw new Error('O arquivo precisa das colunas Código Material e Total Disponível.');
}

self.onmessage = ({ data }) => {
  try {
    self.postMessage({ saldos: lerPlanilha(data) });
  } catch (erro) {
    self.postMessage({ erro: erro.message });
  }
};
