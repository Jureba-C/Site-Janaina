const { test } = require("node:test");
const assert = require("node:assert/strict");
const regras = require("../js/regras-produto.js");
const { gabaritoDoItem } = require("../lib/producao.js");

const config = (extra) => regras.normalizarConfig({ molde: "garrafa", ...extra });

test("sem tamanho, a peça usa a medida padrão do molde", () => {
  const medida = regras.medidaDaPeca(config({}), {});
  assert.equal(medida.largura, 200);
  assert.equal(medida.altura, 150);
  assert.equal(medida.cilindro, 66);
});

test("o tamanho do produto vale para o arquivo de produção", () => {
  const c = config({ tamanho: { largura: 210, altura: 180 } });
  assert.deepEqual(c.tamanho, { largura: 210, altura: 180 });
  const gabarito = gabaritoDoItem(c, {});
  assert.equal(gabarito.largura, 210);
  assert.equal(gabarito.altura, 180);
});

test("tamanho fora da faixa ou incompleto é descartado", () => {
  assert.equal(config({ tamanho: { largura: 5, altura: 100 } }).tamanho, null);
  assert.equal(config({ tamanho: { largura: 900, altura: 100 } }).tamanho, null);
  assert.equal(config({ tamanho: { largura: 100 } }).tamanho, null);
  assert.equal(config({ tamanho: "grande" }).tamanho, null);
});

test("a variação com medida no nome vence o tamanho do produto nas peças planas", () => {
  const c = regras.normalizarConfig({
    molde: "azulejo",
    tamanho: { largura: 120, altura: 120 },
    variacoes: [{ id: "tamanho", nome: "Tamanho", opcoes: [{ id: "g", nome: "20×20 cm", preco: 0 }] }],
  });
  const escolhas = { variacoes: { tamanho: c.variacoes[0].opcoes[0].id } };
  assert.deepEqual([gabaritoDoItem(c, escolhas).largura, gabaritoDoItem(c, escolhas).altura], [200, 200]);
  assert.deepEqual([gabaritoDoItem(c, {}).largura, gabaritoDoItem(c, {}).altura], [120, 120]);
});

test("o boton usa o texto da medida quando não tem tamanho", () => {
  const c = regras.normalizarConfig({ molde: "botton", medida: "3,2 cm" });
  assert.equal(regras.medidaDaPeca(c, {}).largura, 32);
});
