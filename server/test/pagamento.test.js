const test = require("node:test");
const assert = require("node:assert");
const crypto = require("node:crypto");
const { assinaturaDoWebhookValida, pagamentoBateComPedido } = require("../lib/pagamento.js");

function assinar(segredo, id, requisicao, ts) {
  const v1 = crypto.createHmac("sha256", segredo).update(`id:${id};request-id:${requisicao};ts:${ts};`).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

test("assinatura do webhook confere com o segredo certo", () => {
  assert.equal(assinaturaDoWebhookValida("segredo", assinar("segredo", "123", "req-1", "1700000000"), "req-1", "123"), true);
});

test("assinatura do webhook recusa segredo, id ou requisição trocados", () => {
  const cabecalho = assinar("segredo", "123", "req-1", "1700000000");
  assert.equal(assinaturaDoWebhookValida("outro", cabecalho, "req-1", "123"), false);
  assert.equal(assinaturaDoWebhookValida("segredo", cabecalho, "req-1", "124"), false);
  assert.equal(assinaturaDoWebhookValida("segredo", cabecalho, "req-2", "123"), false);
  assert.equal(assinaturaDoWebhookValida("segredo", "ts=1,v1=zz", "req-1", "123"), false);
  assert.equal(assinaturaDoWebhookValida("segredo", "", "req-1", "123"), false);
});

test("pagamento aprovado só vale se o valor e a moeda batem com o pedido", () => {
  const pedido = { total: 81.9 };
  assert.equal(pagamentoBateComPedido({ transaction_amount: 81.9, currency_id: "BRL" }, pedido), true);
  assert.equal(pagamentoBateComPedido({ transaction_amount: 1, currency_id: "BRL" }, pedido), false);
  assert.equal(pagamentoBateComPedido({ transaction_amount: 81.9, currency_id: "USD" }, pedido), false);
  assert.equal(pagamentoBateComPedido({ currency_id: "BRL" }, pedido), false);
});
