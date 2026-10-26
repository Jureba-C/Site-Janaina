const { test } = require("node:test");
const assert = require("node:assert/strict");
const rastreio = require("../lib/rastreio.js");

test("link de rastreio aponta sempre para o Melhor Envio", () => {
  assert.equal(
    rastreio.linkDaTransportadora("ME220021P41BR"),
    "https://melhorenvio.com.br/rastreio/ME220021P41BR"
  );

  assert.equal(
    rastreio.linkDaTransportadora("AA123456789BR"),
    "https://melhorenvio.com.br/rastreio/AA123456789BR"
  );

  assert.ok(!rastreio.linkDaTransportadora("X1").includes("www."));

  assert.equal(rastreio.linkDaTransportadora(""), null);
  assert.equal(rastreio.linkDaTransportadora(null), null);
});

test("entrega é reconhecida pelo evento OU pelo status do envio", () => {
  const porEvento = rastreio.eventoDeEntrega({
    status: "in_transit",
    events: [{ description: "Objeto entregue ao destinatário", date: "2026-09-10 10:00" }],
  });
  assert.ok(porEvento);

  const porStatus = rastreio.eventoDeEntrega({ status: "delivered", events: [] });
  assert.ok(porStatus);
});

test("devolução ao remetente NUNCA conta como entrega", () => {
  assert.equal(
    rastreio.eventoDeEntrega({ events: [{ description: "Objeto entregue ao remetente" }] }),
    null
  );
});

test("pedido a caminho não vira entregue, e rastreio vazio não quebra", () => {
  assert.equal(
    rastreio.eventoDeEntrega({ status: "in_transit", events: [{ description: "Saiu para entrega" }] }),
    null
  );
  assert.equal(rastreio.eventoDeEntrega(null), null);
  assert.equal(rastreio.eventoDeEntrega(undefined), null);
  assert.equal(rastreio.eventoDeEntrega({}), null);
  assert.equal(rastreio.eventoDeEntrega({ events: null }), null);
});

test("data do evento: aceita o formato do rastreio e recusa lixo", () => {
  assert.equal(typeof rastreio.dataDoEvento({ date: "2026-09-10 10:00:00" }), "number");
  assert.equal(rastreio.dataDoEvento({ date: "não é data" }), null);
  assert.equal(rastreio.dataDoEvento({}), null);
  assert.equal(rastreio.dataDoEvento(null), null);
});
