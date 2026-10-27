const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const { spawn } = require("node:child_process");

const PORT = 39585;
const ORIGIN = `http://localhost:${PORT}`;
const TMP_DB = path.join(os.tmpdir(), `arte-produto-${process.pid}-${Date.now()}.db`);

process.env.DB_PATH = TMP_DB;
const db = require("../lib/db.js");

let child;

function limpar(){
  for(const s of ["", "-wal", "-shm"]) { try { fs.unlinkSync(TMP_DB + s); } catch {} }
}

before(async () => {
  child = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server.js"], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      DB_PATH: TMP_DB, PORT: String(PORT), CLIENT_ORIGIN: ORIGIN,
      ADMIN_2FA_REQUIRED: "false", MP_ACCESS_TOKEN: "TEST-fake", NODE_ENV: "test",
    },
    stdio: "ignore",
  });
  const limite = Date.now() + 10000;
  for(;;){
    try { if((await fetch(ORIGIN + "/")).ok) break; } catch {}
    if(Date.now() > limite) throw new Error("servidor de teste não subiu");
    await new Promise(r => setTimeout(r, 200));
  }
});

after(() => {
  if(child) child.kill();
  limpar();
});

test("o link canônico do produto responde 200 com a página daquele produto", async () => {
  const res = await fetch(`${ORIGIN}/produto/2-caneca-alca-e-dentro-colorida`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<meta property="og:title" content="Caneca alça e dentro colorida 325 ml — Arte Canecas">/);
  assert.match(html, /<meta property="og:url" content="[^"]*\/produto\/2-caneca-alca-e-dentro-colorida">/);
  assert.match(html, /<link rel="canonical" href="[^"]*\/produto\/2-caneca-alca-e-dentro-colorida">/);
  assert.match(html, /<meta property="product:price:amount" content="45\.00">/);
  assert.match(html, /<title>Caneca alça e dentro colorida 325 ml — Arte Canecas<\/title>/);
  assert.match(html, /<div id="loja">[\s\S]*Caneca alça e dentro colorida[\s\S]*<\/div>/, "o HTML já vem montado do servidor");
});

test("o endereço antigo /laco/ leva para /produto/ com 301 e a query intacta", async () => {
  const res = await fetch(`${ORIGIN}/laco/2-qualquer-coisa?utm_source=whatsapp`, { redirect: "manual" });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), "/produto/2-caneca-alca-e-dentro-colorida?utm_source=whatsapp");
});

test("a home continua com a prévia da loja, não a de um produto", async () => {
  const html = await (await fetch(`${ORIGIN}/`)).text();
  assert.match(html, /<meta property="og:type" content="website">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/nomedaloja\.com\.br\/">/);
  assert.doesNotMatch(html, /product:price/);
});

test("produto renomeado: o link velho leva ao produto, com a query intacta", async () => {
  db.upsertProductOverride(2, { name: "Caneca Colorida Luxo" });
  const res = await fetch(`${ORIGIN}/produto/2-caneca-alca-e-dentro-colorida?utm_source=whatsapp`, { redirect: "manual" });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), "/produto/2-caneca-colorida-luxo?utm_source=whatsapp");

  const seguido = await fetch(`${ORIGIN}/produto/2-caneca-alca-e-dentro-colorida?utm_source=whatsapp`);
  assert.equal(seguido.status, 200);
  assert.match(await seguido.text(), /og:title" content="Caneca Colorida Luxo/);
  db.upsertProductOverride(2, { name: "Caneca alça e dentro colorida" });
});

test("endereço que não existe é 404, não desvio para a vitrine", async () => {
  for(const caminho of ["/produto/999999-nao-existe", "/produto/sem-id", "/produto/0-zero", "/laco/999999-x", "/categoria/nao-existe"]){
    const res = await fetch(ORIGIN + caminho, { redirect: "manual", headers: { Accept: "text/html" } });
    assert.equal(res.status, 404, caminho);
    assert.match(await res.text(), /Página não encontrada/, `${caminho} devia mostrar a página 404, não um erro`);
  }
});

test("produto escondido pelo painel leva a todos os produtos, porque pode voltar", async () => {
  db.upsertProductOverride(3, { hidden: true });
  const res = await fetch(`${ORIGIN}/produto/3-caneca-100-preta`, { redirect: "manual" });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "/busca");
  db.upsertProductOverride(3, { hidden: false });
});

test("nome de produto com aspas ou HTML não escapa para dentro da tag", async () => {
  db.upsertProductOverride(4, { name: 'Caneca "Mini" <script>alert(1)</script>' });
  const html = await (await fetch(`${ORIGIN}/produto/4-caneca-mini-script-alert-1-script`)).text();
  assert.doesNotMatch(html, /<meta property="og:title" content="[^"]*<script>/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /&quot;Mini&quot;/);
  db.upsertProductOverride(4, { name: "Caneca mini branca" });
});

test("esgotado continua com página, só muda a disponibilidade anunciada", async () => {
  db.upsertProductOverride(5, { soldOut: true });
  const html = await (await fetch(`${ORIGIN}/produto/5-caneca-imperial`)).text();
  assert.match(html, /<meta property="product:availability" content="out of stock">/);
  db.upsertProductOverride(5, { soldOut: false });
});

test("o sitemap lista categorias e produtos visíveis e some com o escondido", async () => {
  const xml = await (await fetch(`${ORIGIN}/sitemap.xml`)).text();
  assert.match(xml, /<loc>https:\/\/nomedaloja\.com\.br\/<\/loc>/);
  assert.match(xml, /<loc>[^<]*\/produto\/2-caneca-alca-e-dentro-colorida<\/loc>/);
  assert.match(xml, /<loc>[^<]*\/categoria\/canecas<\/loc>/);

  db.upsertProductOverride(7, { hidden: true });
  const depois = await (await fetch(`${ORIGIN}/sitemap.xml`)).text();
  assert.doesNotMatch(depois, /\/produto\/7-/);
  db.upsertProductOverride(7, { hidden: false });
});

function blocosLd(html){
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1].replace(/\\u003c/g, "<")));
}

test("a página do produto tem dados estruturados de produto e trilha, sem nota inventada", async () => {
  const html = await (await fetch(`${ORIGIN}/produto/2-caneca-alca-e-dentro-colorida`)).text();
  const blocos = blocosLd(html);
  const produto = blocos.find(b => b["@type"] === "Product");
  assert.ok(produto, "faltou o bloco Product");
  assert.equal(produto.name, "Caneca alça e dentro colorida");
  assert.equal(produto.offers.price, "45.00");
  assert.equal(produto.offers.availability, "https://schema.org/InStock");
  assert.match(produto.url, /\/produto\/2-caneca-alca-e-dentro-colorida$/);
  assert.ok(blocos.some(b => b["@type"] === "BreadcrumbList"));
  assert.doesNotMatch(html, /aggregateRating/);
});

test("a home tem dados da loja e do site, sem produto solto", async () => {
  const html = await (await fetch(`${ORIGIN}/`)).text();
  const blocos = blocosLd(html);
  assert.equal(blocos.length, 1);
  const tipos = blocos[0]["@graph"].map(n => n["@type"]);
  assert.deepEqual(tipos, ["Store", "WebSite"]);
});

test("página de categoria vem montada do servidor, com filtros e lista estruturada", async () => {
  const res = await fetch(`${ORIGIN}/categoria/canecas?ordem=menor-preco`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<h1>Canecas<\/h1>/);
  assert.match(html, /<meta name="robots" content="noindex, follow">/, "página filtrada não disputa com a principal");
  const lista = blocosLd(html).find(b => b["@type"] === "ItemList");
  assert.ok(lista.itemListElement.length > 0);
  assert.match(lista.itemListElement[0].url, /\/produto\//);
});

test("a busca acha pelo nome sem acento e sugere pelo /api/busca", async () => {
  const html = await (await fetch(`${ORIGIN}/busca?q=xicara`)).text();
  assert.match(html, /Xícara Ipês Brasília/);
  const sugestoes = await (await fetch(`${ORIGIN}/api/busca?q=garrafa&limite=3`)).json();
  assert.equal(sugestoes.produtos.length, 3);
  assert.ok(sugestoes.produtos.every(p => /garrafa|copo|caneca inox/i.test(p.nome)));
});
