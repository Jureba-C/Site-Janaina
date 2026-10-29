const { test } = require("node:test");
const assert = require("node:assert/strict");
const { decidir } = require("../lib/estado-do-pedido.js");

function d(status, mp, { id = "20", atual = "10", vencedor = null, confere = true } = {}){
  return decidir({
    pedido: { status, payment_id: atual, pagamento_aprovado_id: vencedor },
    pagamento: { id, status: mp, confere },
  });
}

test("aprovado e conferido vira pago a partir de qualquer estado aberto", () => {
  for(const status of ["pendente", "em análise", "recusado"]){
    const r = d(status, "approved");
    assert.equal(r.novoStatus, "pago", status);
    assert.equal(r.virouPago, true);
    assert.equal(r.definirVencedor, true);
    assert.equal(r.alerta, null);
  }
  const cancelado = d("cancelado", "approved");
  assert.equal(cancelado.novoStatus, "pago");
  assert.equal(cancelado.alerta, "pago_atrasado");
});

test("pedido pago nunca volta para trás", () => {
  for(const mp of ["pending", "in_process", "rejected", "cancelled"]){
    const r = d("pago", mp, { id: "30", atual: "20", vencedor: "20" });
    assert.equal(r.acao, "ignorar", mp);
  }
  const outroAprovado = d("pago", "approved", { id: "30", vencedor: "20" });
  assert.equal(outroAprovado.acao, "ignorar");
  assert.equal(outroAprovado.alerta, "pagamento_duplicado");
  const mesmo = d("pago", "approved", { id: "20", vencedor: "20" });
  assert.deepEqual([mesmo.acao, mesmo.alerta], ["ignorar", null]);
});

test("valor ou forma diferente nunca marca como pago", () => {
  const r = d("pendente", "approved", { confere: false });
  assert.equal(r.novoStatus, "em análise");
  assert.equal(r.virouPago, false);
  assert.equal(r.alerta, "pagamento_divergente");
  const jaPago = d("pago", "approved", { id: "30", vencedor: "20", confere: false });
  assert.deepEqual([jaPago.acao, jaPago.alerta], ["ignorar", "pagamento_divergente"]);
});

test("um Pix antigo que vence não cancela o pedido do Pix novo", () => {
  const velho = d("pendente", "cancelled", { id: "10", atual: "20" });
  assert.equal(velho.acao, "ignorar");
  const atual = d("pendente", "cancelled", { id: "20", atual: "20" });
  assert.equal(atual.novoStatus, "cancelado");
  const semId = d("pendente", "rejected", { id: "5", atual: null });
  assert.equal(semId.novoStatus, "recusado");
});

test("nova tentativa depois de recusado volta a pendente; tentativa velha não", () => {
  assert.equal(d("recusado", "pending", { id: "30", atual: "20" }).novoStatus, "pendente");
  assert.equal(d("recusado", "pending", { id: "10", atual: "20" }).acao, "ignorar");
  assert.equal(d("pendente", "in_process", { id: "20", atual: "20" }).novoStatus, "em análise");
  assert.equal(d("pendente", "pending", { id: "20", atual: "20" }).acao, "ignorar");
});

test("reembolso e estorno só valem do pagamento vencedor", () => {
  assert.equal(d("pago", "refunded", { id: "20", vencedor: "20" }).novoStatus, "reembolsado");
  assert.equal(d("pago", "refunded", { id: "30", vencedor: "20" }).acao, "ignorar");
  assert.equal(d("pago", "charged_back", { id: "20", vencedor: "20" }).novoStatus, "estornado");
  assert.equal(d("reembolsado", "charged_back", { id: "20", vencedor: "20" }).novoStatus, "estornado");
  assert.equal(d("pendente", "refunded").alerta, "reembolso_sem_pagamento");
  const revertido = d("estornado", "approved", { id: "20", vencedor: "20" });
  assert.deepEqual([revertido.novoStatus, revertido.virouPago, revertido.alerta], ["pago", false, "estorno_revertido"]);
  assert.equal(d("reembolsado", "approved", { id: "30", vencedor: "20" }).alerta, "pagamento_apos_reembolso");
});

test("disputa aberta avisa sem mudar o pedido", () => {
  const r = d("pago", "in_mediation", { id: "20", vencedor: "20" });
  assert.deepEqual([r.acao, r.alerta], ["ignorar", "disputa_aberta"]);
});
