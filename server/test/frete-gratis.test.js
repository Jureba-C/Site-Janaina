const test = require("node:test");
const assert = require("node:assert/strict");
const { aplicarFreteGratis, valorValido } = require("../lib/frete-gratis.js");

const OPCOES = [
  { service_id: 1, name: "PAC", price: 22.5 },
  { service_id: 2, name: "SEDEX", price: 38.9 },
  { service_id: "retirada", name: "Retirar", price: 0, retirada: true },
];

test("frete grátis desligado não mexe no frete", () => {
  assert.deepEqual(aplicarFreteGratis(OPCOES, 500, null), OPCOES);
});

test("abaixo do valor mínimo o frete continua cobrado", () => {
  assert.equal(aplicarFreteGratis(OPCOES, 149.99, 150)[0].price, 22.5);
});

test("acima do valor mínimo só a opção de envio mais barata fica grátis", () => {
  const resultado = aplicarFreteGratis(OPCOES, 150, 150);
  assert.equal(resultado[0].price, 0);
  assert.equal(resultado[0].freteGratis, true);
  assert.equal(resultado[0].precoOriginal, 22.5);
  assert.equal(resultado[1].price, 38.9);
  assert.equal(resultado[2].price, 0);
});

test("valor do painel: em branco desliga, número válido liga, lixo é recusado", () => {
  assert.equal(valorValido(""), null);
  assert.equal(valorValido(null), null);
  assert.equal(valorValido("150"), 150);
  assert.equal(valorValido(0), undefined);
  assert.equal(valorValido("abc"), undefined);
});
