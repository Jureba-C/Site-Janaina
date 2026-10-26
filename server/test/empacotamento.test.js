const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildPackage, PESO_EMBALAGEM_KG } = require("../lib/empacotamento.js");

function peca(peso, largura, altura, comprimento, price = 45){
  return { price, config: { peso, caixa: { largura, altura, comprimento } } };
}

const CANECA = peca(0.45, 12, 12, 12);
const GARRAFA = peca(0.4, 10, 28, 10, 55);

test("uma caneca vai numa caixa do tamanho dela, com o peso da embalagem", () => {
  const pkg = buildPackage([{ qty: 1, product: CANECA }]);
  assert.equal(pkg.weight, Math.round((0.45 + PESO_EMBALAGEM_KG) * 1000) / 1000);
  assert.ok(pkg.width >= 12 && pkg.length >= 12 && pkg.height >= 12);
  assert.equal(pkg.insurance_value, 45);
});

test("o peso cresce com a quantidade e a caixa cresce sem passar de 100 cm", () => {
  const uma = buildPackage([{ qty: 1, product: CANECA }]);
  const dez = buildPackage([{ qty: 10, product: CANECA }]);
  const cinquenta = buildPackage([{ qty: 50, product: CANECA }]);
  assert.ok(dez.weight > uma.weight);
  assert.ok(dez.width * dez.length * dez.height >= 10 * 12 * 12 * 12);
  for(const lado of [cinquenta.width, cinquenta.length, cinquenta.height]) assert.ok(lado <= 100);
});

test("a garrafa comprida cabe deitada: o maior lado da caixa é o da garrafa", () => {
  const pkg = buildPackage([{ qty: 2, product: GARRAFA }]);
  assert.ok(pkg.length >= 28);
  assert.equal(pkg.weight, Math.round((0.8 + PESO_EMBALAGEM_KG) * 1000) / 1000);
});

test("o seguro usa o preço da variação quando ele vem junto", () => {
  const pkg = buildPackage([{ qty: 2, product: CANECA, unitPrice: 63 }]);
  assert.equal(pkg.insurance_value, 126);
});

test("produto sem medidas usa a caixa e o peso padrão de uma caneca", () => {
  const pkg = buildPackage([{ qty: 1, product: { price: 10 } }]);
  assert.ok(pkg.weight > PESO_EMBALAGEM_KG);
  assert.ok(pkg.width >= 11);
});
