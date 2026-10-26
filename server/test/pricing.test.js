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

test("desconto Pix é 10% do valor", () => {
  assert.equal(pricing.pixDiscountFor(100), 10);
  assert.equal(pricing.pixPriceFor(100), 90);
  assert.equal(pricing.pixDiscountFor(34.9), 3.49);
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

