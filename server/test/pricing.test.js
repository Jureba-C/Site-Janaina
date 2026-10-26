const { test } = require("node:test");
const assert = require("node:assert/strict");
const pricing = require("../js/pricing.js");

test("round2 arredonda para 2 casas", () => {
  assert.equal(pricing.round2(10.126), 10.13);
  assert.equal(pricing.round2(34.899), 34.9);
  assert.equal(pricing.round2("abc"), 0);
});

test("formatMoney formata em reais com vírgula", () => {
  assert.equal(pricing.formatMoney(34.9).replace(/\u00a0/g, " "), "R$ 34,90");
  assert.equal(pricing.formatMoney(0).replace(/\u00a0/g, " "), "R$ 0,00");
});

test("desconto Pix é 5% do valor", () => {
  assert.equal(pricing.pixDiscountFor(100), 5);
  assert.equal(pricing.pixPriceFor(100), 95);
  assert.equal(pricing.pixDiscountFor(34.9), 1.75);
});

test("parcelamento respeita máximo e valor mínimo por parcela", () => {
  assert.equal(pricing.installmentCountFor(300), 3);
  assert.equal(pricing.installmentCountFor(8), 1);
  const plan = pricing.installmentPlanFor(300);
  assert.ok(plan.value >= 5);
  assert.equal(plan.count, 3);
  assert.equal(plan.interestFree, true);
});

test("pixPriceFor e round2 lidam com entrada inválida sem quebrar", () => {
  assert.equal(pricing.pixPriceFor(null), 0);
  assert.equal(pricing.pixPriceFor(undefined), 0);
});

test("promoção Leve 4 Pague 3: nada grátis abaixo de 4 unidades", () => {
  assert.equal(pricing.promoLeve4Pague3For([]), 0);
  assert.equal(pricing.promoLeve4Pague3For([{ qty: 1, price: 50 }]), 0);
  assert.equal(pricing.promoLeve4Pague3For([{ qty: 3, price: 50 }]), 0);
});

test("promoção Leve 4 Pague 3: 1 grátis a cada 4 unidades, sempre a mais barata do grupo", () => {
  assert.equal(pricing.promoLeve4Pague3For([{ qty: 4, price: 50 }]), 50);
  assert.equal(pricing.promoLeve4Pague3For([{ qty: 5, price: 50 }]), 50);
  assert.equal(pricing.promoLeve4Pague3For([{ qty: 7, price: 50 }]), 50);
  assert.equal(pricing.promoLeve4Pague3For([{ qty: 8, price: 50 }]), 100);
  assert.equal(pricing.promoLeve4Pague3For([{ qty: 12, price: 50 }]), 150);
});

test("promoção Leve 4 Pague 3: mistura produtos, sempre libera a mais barata do grupo de 4", () => {
  assert.equal(pricing.promoLeve4Pague3For([
    { qty: 3, price: 100 },
    { qty: 1, price: 20 },
  ]), 20);
  assert.equal(pricing.promoLeve4Pague3For([
    { qty: 6, price: 100 },
    { qty: 2, price: 10 },
  ]), 110);
});

test("promoção Leve 4 Pague 3: não muda com a ordem dos itens no carrinho", () => {
  const a = pricing.promoLeve4Pague3For([{ qty: 1, price: 90 }, { qty: 3, price: 30 }]);
  const b = pricing.promoLeve4Pague3For([{ qty: 3, price: 30 }, { qty: 1, price: 90 }]);
  assert.equal(a, b);
  assert.equal(a, 30);
});
