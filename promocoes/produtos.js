export const marcas = {
  boticario: { nome: 'O Boticário', revista: 'https://catalogo.boticario.com.br/' },
  eudora: { nome: 'Eudora', revista: 'https://catalogo.eudora.com.br/REVISTA' },
};

export const nomesPublicos = { feminino: 'Feminino', masculino: 'Masculino', geral: 'Uso geral', infantil: 'Infantil' };

export function publicoEspecifico(publico) {
  return publico === 'feminino' || publico === 'masculino';
}

export function correspondeAoPublico(publico, filtro, incluirUsoGeral) {
  return !filtro || publico === filtro || (incluirUsoGeral && publicoEspecifico(filtro) && publico === 'geral');
}

export function normalizar(texto) {
  return String(texto ?? '').normalize('NFD').replace(/\p{M}/gu, '')
    .toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function lerCatalogo(marca) {
  const resposta = await fetch(new URL(`./dados/${marca}.json?v=4`, import.meta.url));
  if (!resposta.ok) throw new Error('Catálogo indisponível.');
  return resposta.json();
}

export function dadosDaFicha(produto) {
  return [
    ['Código', produto.sku],
    ['Linha', produto.linha],
    ['Público', nomesPublicos[produto.publico]],
    ['Apresentação', produto.volume],
    ['Aromas e família olfativa', produto.aromas],
    ['Indicado para', produto.indicacao],
    ['Benefício descrito na ficha', produto.beneficio],
    ['Como aplicar', produto.uso],
    ['Ocasião', produto.ocasiao],
    ['Revista', produto.paginas?.length ? `Página ${produto.paginas.join(', ')}` : ''],
  ].filter(([, valor]) => Boolean(valor));
}

export async function copiarTexto(campo, estado) {
  try {
    await navigator.clipboard.writeText(campo.value);
    estado.textContent = 'Copiado.';
  } catch {
    campo.focus();
    campo.select();
    estado.textContent = 'Texto selecionado. Use a opção de copiar do navegador.';
  }
}
