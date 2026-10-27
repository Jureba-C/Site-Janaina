function aplicarFreteGratis(opcoes, subtotal, minimo) {
  if (!minimo || !(subtotal >= minimo)) return opcoes;
  const pagas = opcoes.filter(o => o.price > 0 && !o.retirada);
  if (!pagas.length) return opcoes;
  const maisBarata = pagas.reduce((a, b) => (b.price < a.price ? b : a));
  return opcoes.map(o => (o === maisBarata ? { ...o, price: 0, precoOriginal: o.price, freteGratis: true } : o));
}

function valorValido(bruto) {
  if (bruto === null || bruto === undefined || bruto === "") return null;
  const valor = Number(bruto);
  return Number.isFinite(valor) && valor >= 1 && valor <= 100000 ? Math.round(valor * 100) / 100 : undefined;
}

module.exports = { aplicarFreteGratis, valorValido };
