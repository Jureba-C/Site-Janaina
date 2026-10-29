const test = require("node:test");
const assert = require("node:assert");
const crypto = require("node:crypto");
const { assinaturaDoWebhookValida, conferirAssinatura, pagamentoBateComPedido, motivoDaDivergencia } = require("../lib/pagamento.js");

const TS = "1700000000";
const AGORA = 1700000000 * 1000 + 60 * 1000;
const DEV = { NODE_ENV: "test", CLIENT_ORIGIN: "http://localhost:1" };
const PROD = { NODE_ENV: "production" };

function assinar(segredo, id, requisicao, ts) {
  const v1 = crypto.createHmac("sha256", segredo).update(`id:${id};request-id:${requisicao};ts:${ts};`).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

test("assinatura do webhook confere com o segredo certo", () => {
  assert.equal(assinaturaDoWebhookValida("segredo", assinar("segredo", "123", "req-1", TS), "req-1", "123", { agora: AGORA, env: DEV }), true);
});

test("assinatura do webhook recusa segredo, id ou requisição trocados", () => {
  const cabecalho = assinar("segredo", "123", "req-1", TS);
  const o = { agora: AGORA, env: DEV };
  assert.equal(assinaturaDoWebhookValida("outro", cabecalho, "req-1", "123", o), false);
  assert.equal(assinaturaDoWebhookValida("segredo", cabecalho, "req-1", "124", o), false);
  assert.equal(assinaturaDoWebhookValida("segredo", cabecalho, "req-2", "123", o), false);
  assert.equal(assinaturaDoWebhookValida("segredo", "ts=1,v1=zz", "req-1", "123", o), false);
  assert.equal(assinaturaDoWebhookValida("segredo", "", "req-1", "123", o), false);
});

test("assinatura velha demais é recusada (repetição de aviso antigo)", () => {
  const cabecalho = assinar("segredo", "123", "req-1", TS);
  const velho = conferirAssinatura("segredo", cabecalho, "req-1", "123", { agora: AGORA + 60 * 60 * 1000, env: DEV });
  assert.deepEqual(velho, { ok: false, motivo: "ts_antigo" });
  const emMs = assinar("segredo", "123", "req-1", String(Number(TS) * 1000));
  assert.equal(assinaturaDoWebhookValida("segredo", emMs, "req-1", "123", { agora: AGORA, env: DEV }), true, "aceita ts em milissegundos");
  const semLimite = conferirAssinatura("segredo", cabecalho, "req-1", "123", { agora: AGORA + 86400000, env: { ...DEV, MP_WEBHOOK_TOLERANCIA_MIN: "0" } });
  assert.equal(semLimite.ok, true);
});

test("sem segredo: aceita só fora de produção", () => {
  assert.equal(conferirAssinatura("", "", "", "1", { env: DEV }).ok, true);
  assert.deepEqual(conferirAssinatura("", "", "", "1", { env: PROD }), { ok: false, motivo: "sem_segredo" });
});

test("pagamento aprovado só vale se o valor e a moeda batem com o pedido", () => {
  const pedido = { total: 81.9 };
  assert.equal(pagamentoBateComPedido({ transaction_amount: 81.9, currency_id: "BRL" }, pedido), true);
  assert.equal(pagamentoBateComPedido({ transaction_amount: 1, currency_id: "BRL" }, pedido), false);
  assert.equal(pagamentoBateComPedido({ transaction_amount: 81.9, currency_id: "USD" }, pedido), false);
  assert.equal(pagamentoBateComPedido({ currency_id: "BRL" }, pedido), false);
});

test("pedido com desconto do Pix só aprova se o pagamento foi mesmo Pix", () => {
  const pedido = { total: 50, payment_method: "pix" };
  assert.equal(motivoDaDivergencia({ transaction_amount: 50, currency_id: "BRL", payment_method_id: "pix", payment_type_id: "bank_transfer" }, pedido), null);
  assert.equal(motivoDaDivergencia({ transaction_amount: 50, currency_id: "BRL", payment_method_id: "account_money", payment_type_id: "account_money" }, pedido), "forma");
  assert.equal(motivoDaDivergencia({ transaction_amount: 50, currency_id: "BRL", payment_method_id: "visa", payment_type_id: "credit_card" }, { total: 50, payment_method: "card" }), null);
});
