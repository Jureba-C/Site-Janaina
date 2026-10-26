const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildPackage, vaiNaCaixaPadrao, CAIXA_PADRAO, PESO_EMBALAGEM_KG, PESO_LACO_KG,
} = require("../lib/empacotamento.js");

function laco(category, price = 28){
  return { price, weight: 0.2, width: 16, height: 7, length: 20, category };
}

test("laço cadastrado pelo painel divide a caixa, não empilha", () => {
  const pkg = buildPackage([{ qty: 4, product: laco("parzinho") }]);
  assert.equal(pkg.weight, PESO_EMBALAGEM_KG + 4 * PESO_LACO_KG);
  assert.equal(pkg.height, CAIXA_PADRAO.height);
});

test("o peso gravado no catálogo é ignorado para quem vai na caixinha", () => {
  const pkg = buildPackage([{ qty: 4, product: laco("parzinho") }]);
  assert.equal(pkg.weight, 0.12);
  assert.ok(pkg.weight < 0.2, "não pode chegar perto do peso da caixa cheia");
});

test("a caixa não cresce com a quantidade: 1 peça e 20 peças têm o mesmo tamanho", () => {
  const uma = buildPackage([{ qty: 1, product: laco("laco-unico") }]);
  const vinte = buildPackage([{ qty: 20, product: laco("laco-unico") }]);
  assert.deepEqual(
    { w: uma.width, h: uma.height, l: uma.length },
    { w: vinte.width, h: vinte.height, l: vinte.length },
  );
  assert.ok(vinte.weight > uma.weight, "o peso, esse sim, cresce");
});

test("kit, tiara e bolsa dividem a mesma caixa dos laços", () => {
  for(const cat of ["kit", "tiara", "bolsa", "laco-g", "laco-pompom", "parzinho", "laco-unico"]){
    assert.equal(vaiNaCaixaPadrao(laco(cat)), true, `${cat} deveria caber na caixinha`);
  }
  const misto = buildPackage([
    { qty: 2, product: laco("parzinho") },
    { qty: 1, product: laco("tiara") },
    { qty: 1, product: laco("bolsa", 55) },
  ]);
  assert.equal(misto.weight, PESO_EMBALAGEM_KG + 4 * PESO_LACO_KG);
  assert.equal(misto.height, CAIXA_PADRAO.height);
});

test("cabide fica fora da caixa e ocupa espaço próprio", () => {
  assert.equal(vaiNaCaixaPadrao(laco("cabide")), false);
  const pkg = buildPackage([{ qty: 3, product: laco("cabide") }]);
  assert.equal(pkg.weight, 3 * 0.2);
  assert.equal(pkg.height, 3 * 7);
});

test("cabide junto com laços: as duas embalagens se empilham", () => {
  const pkg = buildPackage([
    { qty: 4, product: laco("parzinho") },
    { qty: 1, product: laco("cabide") },
  ]);
  assert.equal(pkg.weight, PESO_EMBALAGEM_KG + 4 * PESO_LACO_KG + 0.2);
  assert.equal(pkg.height, CAIXA_PADRAO.height + 7);
});

test("categoria nova e desconhecida nasce dividindo a caixa", () => {
  assert.equal(vaiNaCaixaPadrao(laco("laco-de-natal")), true);
  assert.equal(vaiNaCaixaPadrao({ ...laco(null), category: null }), true);
});

test("o valor declarado do seguro é a soma real do carrinho", () => {
  const pkg = buildPackage([
    { qty: 2, product: laco("parzinho", 28) },
    { qty: 1, product: laco("bolsa", 55) },
  ]);
  assert.equal(pkg.insurance_value, 2 * 28 + 55);
});

test("a caixa nunca fica menor que a caixa padrão", () => {
  const minusculo = { price: 10, weight: 0.001, width: 1, height: 1, length: 1, category: "cabide" };
  const pkg = buildPackage([{ qty: 1, product: minusculo }]);
  assert.equal(pkg.width, CAIXA_PADRAO.width);
  assert.equal(pkg.length, CAIXA_PADRAO.length);
  assert.equal(pkg.height, CAIXA_PADRAO.height);
});

test("a embalagem escolhida no cadastro vale mais que a categoria", () => {
  assert.equal(vaiNaCaixaPadrao({ category: "parzinho", caixa: "maior" }), false);
  assert.equal(vaiNaCaixaPadrao({ category: "cabide", caixa: "padrao" }), true);
  assert.equal(vaiNaCaixaPadrao({ category: "cabide", caixa: null }), false, "produto antigo segue a categoria");
  assert.equal(vaiNaCaixaPadrao({ category: "parzinho" }), true);

  const grande = { price: 78, weight: 0.35, width: 30, height: 2, length: 40, category: "parzinho", caixa: "maior" };
  const pkg = buildPackage([{ qty: 2, product: grande }]);
  assert.equal(pkg.weight, 0.7);
  assert.equal(pkg.length, 40);
});
