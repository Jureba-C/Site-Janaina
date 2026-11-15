const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");

const TMP_DB = path.join(os.tmpdir(), `plc-vitrine-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = TMP_DB;
const dados = require("../lib/loja-dados.js");

after(() => {
  for(const s of ["", "-wal", "-shm"]){ try { fs.unlinkSync(TMP_DB + s); } catch {} }
});

test("Mais pedidas mistura os tipos em vez de mostrar só canecas", () => {
  const { pagina } = dados.paginaInicio();
  const maisPedidas = pagina.vitrines.find(v => v.id === "mais-pedidas");
  const tipos = new Set(maisPedidas.produtos.map(p => p.tipo));
  assert.ok(tipos.size >= 4, `só ${tipos.size} tipo(s) na vitrine`);
  assert.equal(maisPedidas.produtos[0].nome, "Caneca porcelana branca", "o selo Mais pedida vem primeiro");
});

test("as abas da vitrine são por tipo e cada aba só tem aquele tipo", () => {
  const { pagina } = dados.paginaInicio();
  for(const aba of pagina.vitrines.filter(v => v.id !== "mais-pedidas")){
    assert.ok(aba.produtos.length > 0, `aba ${aba.id} vazia`);
    const daCategoria = new Set(dados.paginaCategoria(aba.id, {}).pagina.produtos.map(p => p.id));
    assert.ok(aba.produtos.every(p => daCategoria.has(p.id)), `aba ${aba.id} com produto de outro tipo`);
  }
  assert.deepEqual(pagina.vitrines.map(v => v.id), ["mais-pedidas", "canecas", "garrafas-e-termicos", "xicaras-e-kits", "vidros-e-copos", "botons"]);
});

test("Escolha por tipo lista só tipos com produto, com contagem e imagem", () => {
  const { pagina } = dados.paginaInicio();
  const slugs = pagina.tipos.map(t => t.slug);
  assert.ok(slugs.includes("botons"), "Botons aparece porque já tem produtos");
  for(const t of pagina.tipos){
    assert.ok(t.quantidade > 0);
    assert.ok(t.foto || t.exemplo, `${t.slug} sem foto nem ilustração`);
  }
  const vidros = pagina.tipos.find(t => t.slug === "vidros-e-copos");
  assert.notEqual(vidros.exemplo.molde, "caneca", "a ilustração dos vidros não pode ser uma caneca");
});

test("o cartão leva as cores do produto quando ele tem variação de cor", () => {
  const { pagina } = dados.paginaInicio();
  const todos = pagina.vitrines.flatMap(v => v.produtos);
  const colorida = todos.find(p => p.nome === "Caneca alça e dentro colorida");
  assert.ok(colorida.cores.length >= 2);
  for(const hex of colorida.cores) assert.match(hex, /^#[0-9A-F]{6}$/i);
  const branca = todos.find(p => p.nome === "Caneca porcelana branca");
  assert.deepEqual(branca.cores, []);
});

test("Combina com você também traz outros tipos além do mesmo tipo", () => {
  const { pagina } = dados.paginaProduto(1);
  assert.equal(pagina.relacionados.length, 4);
  assert.ok(new Set(pagina.relacionados.map(p => p.tipo)).size >= 2);
  assert.ok(pagina.relacionados.every(p => p.id !== 1));
});

test("a página de categoria traz a foto do tipo quando existe", () => {
  assert.ok(dados.paginaCategoria("garrafas-e-termicos", {}).pagina.categoria.foto);
  assert.equal(dados.paginaCategoria("botons", {}).pagina.categoria.foto, null);
  assert.equal(dados.paginaCategoria("botons", {}).pagina.total, 5);
});
