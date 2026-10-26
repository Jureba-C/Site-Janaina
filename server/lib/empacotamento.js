const PESO_EMBALAGEM_KG = 0.15;
const FOLGA_DE_ENCHIMENTO = 1.25;
const LADO_MINIMO_CM = 11;
const LADO_MAXIMO_CM = 100;
const CAIXA_PADRAO = { largura: 12, altura: 12, comprimento: 12 };
const PESO_PADRAO_KG = 0.45;

function medidasDe(product){
  const config = product.config || {};
  const caixa = config.caixa || CAIXA_PADRAO;
  return {
    peso: Number(config.peso) > 0 ? Number(config.peso) : PESO_PADRAO_KG,
    largura: Number(caixa.largura) > 0 ? Number(caixa.largura) : CAIXA_PADRAO.largura,
    altura: Number(caixa.altura) > 0 ? Number(caixa.altura) : CAIXA_PADRAO.altura,
    comprimento: Number(caixa.comprimento) > 0 ? Number(caixa.comprimento) : CAIXA_PADRAO.comprimento,
  };
}

function arredondar(n, casas){
  const f = Math.pow(10, casas);
  return Math.round(n * f) / f;
}

function buildPackage(validatedItems){
  let peso = 0, volume = 0, seguro = 0;
  let maiorLado = 0, segundoLado = 0, menorLado = 0;

  for(const { qty, product, unitPrice } of validatedItems){
    const m = medidasDe(product);
    peso += m.peso * qty;
    volume += m.largura * m.altura * m.comprimento * qty;
    seguro += (unitPrice != null ? unitPrice : product.price) * qty;
    const lados = [m.largura, m.altura, m.comprimento].sort((a, b) => b - a);
    maiorLado = Math.max(maiorLado, lados[0]);
    segundoLado = Math.max(segundoLado, lados[1]);
    menorLado = Math.max(menorLado, lados[2]);
  }

  const volumeComFolga = volume * FOLGA_DE_ENCHIMENTO;
  const ladoDoCubo = Math.ceil(Math.cbrt(volumeComFolga));
  const comprimento = Math.min(LADO_MAXIMO_CM, Math.max(maiorLado, ladoDoCubo, LADO_MINIMO_CM));
  const largura = Math.min(LADO_MAXIMO_CM, Math.max(segundoLado, ladoDoCubo, LADO_MINIMO_CM));
  const altura = Math.max(menorLado, LADO_MINIMO_CM, Math.ceil(volumeComFolga / (comprimento * largura)));

  return {
    weight: arredondar(peso + PESO_EMBALAGEM_KG, 3),
    width: Math.ceil(largura),
    length: Math.ceil(comprimento),
    height: Math.min(LADO_MAXIMO_CM, Math.ceil(altura)),
    insurance_value: arredondar(seguro, 2),
  };
}

module.exports = {
  PESO_EMBALAGEM_KG,
  CAIXA_PADRAO,
  PESO_PADRAO_KG,
  medidasDe,
  buildPackage,
};
