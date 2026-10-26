const CAIXA_PADRAO = { weight: 0.2, width: 16, height: 7, length: 20 };
const PESO_EMBALAGEM_KG = 0.04;
const PESO_LACO_KG = 0.02;

const CATEGORIAS_FORA_DA_CAIXA = new Set(["cabide"]);

const CAIXAS = new Set(["padrao", "maior"]);

function vaiNaCaixaPadrao(product) {
  if (product.caixa === "maior") return false;
  if (product.caixa === "padrao") return true;
  return !CATEGORIAS_FORA_DA_CAIXA.has(String(product.category || "").trim());
}

function buildPackage(validatedItems) {
  let width = 0, length = 0, insurance = 0;
  let qtdNaCaixa = 0;
  let pesoForaDaCaixa = 0, alturaForaDaCaixa = 0;

  for (const { qty, product } of validatedItems) {
    insurance += product.price * qty;

    if (vaiNaCaixaPadrao(product)) {
      qtdNaCaixa += qty;
    } else {
      width = Math.max(width, product.width);
      length = Math.max(length, product.length);
      pesoForaDaCaixa += product.weight * qty;
      alturaForaDaCaixa += product.height * qty;
    }
  }

  const pesoDaCaixaPadrao = qtdNaCaixa > 0
    ? PESO_EMBALAGEM_KG + qtdNaCaixa * PESO_LACO_KG
    : 0;
  const alturaTotal = (qtdNaCaixa > 0 ? CAIXA_PADRAO.height : 0) + alturaForaDaCaixa;

  return {
    weight: pesoDaCaixaPadrao + pesoForaDaCaixa,
    width: Math.max(width, CAIXA_PADRAO.width),
    length: Math.max(length, CAIXA_PADRAO.length),
    height: Math.max(alturaTotal, CAIXA_PADRAO.height),
    insurance_value: Math.round(insurance * 100) / 100,
  };
}

module.exports = {
  CAIXA_PADRAO,
  PESO_EMBALAGEM_KG,
  PESO_LACO_KG,
  CATEGORIAS_FORA_DA_CAIXA,
  CAIXAS,
  vaiNaCaixaPadrao,
  buildPackage,
};
