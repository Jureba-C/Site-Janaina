const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { verificar, comentariosJs, comentariosTs, comentariosCss, comentariosHtml } = require("../scripts/sem-comentarios.js");

test("nenhum arquivo do projeto tem comentário", () => {
  const { arquivos, problemas } = verificar(path.join(__dirname, ".."), [path.join(__dirname, "..", "..", ".gitignore")]);
  assert.ok(arquivos > 50);
  assert.deepEqual(problemas.map(p => `${p.arquivo} [${p.tipo}] ${p.texto}`), []);
});

test("o verificador acha comentários de verdade e ignora os falsos", () => {
  assert.equal(comentariosJs("const a = 1; // nota").length, 1);
  assert.equal(comentariosJs("const a = 1; /* nota */").length, 1);
  assert.equal(comentariosJs('const url = "https://exemplo.com/*x*/";').length, 0);
  assert.equal(comentariosJs("const html = `<" + "!-- nota -->`;").length, 1);
  assert.equal(comentariosCss('a{ background:url(data:image/svg+xml;utf8,<svg/>) } b::after{ content:"/* x */" }').length, 0);
  assert.equal(comentariosCss("a{ color:red } /* nota */").length, 1);
  assert.equal(comentariosJs("db.exec(`CREATE TABLE a (\n  -- nota\n  id INTEGER\n)`);").length, 1);
  assert.equal(comentariosJs("db.exec(`SELECT 1 /* nota */`);").length, 1);
  assert.equal(comentariosJs("const texto = `Pedido -- confirmado`;").length, 0);
  assert.equal(comentariosHtml("<p>oi</p><" + "!-- nota -->").length, 1);
  assert.equal(comentariosHtml("<script>const a = 1; // nota\n</script>").length, 1);
  assert.equal(comentariosHtml('<script type="application/ld+json">{"a":"//b"}</script>').length, 0);
  assert.equal(comentariosTs("const a: number = 1; // nota").length, 1);
  assert.equal(comentariosTs("const b = <p>{/* nota */}</p>;").length, 1);
  assert.equal(comentariosTs('const c: string = "https://exemplo.com/*x*/";').length, 0);
});
