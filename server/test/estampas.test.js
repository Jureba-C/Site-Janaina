const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const sharp = require("sharp");

const PORT = 39613;
const ORIGIN = `http://localhost:${PORT}`;
const ADMIN_EMAIL = "admin-estampas@test.com";
const ADMIN_HASH = crypto.createHash("sha256").update(ADMIN_EMAIL).digest("hex");
const TMP_DB = path.join(os.tmpdir(), `arte-estampas-${process.pid}-${Date.now()}.db`);

process.env.DB_PATH = TMP_DB;
const db = require("../lib/db.js");
const regras = require("../js/regras-produto.js");
const catalogo = require("../lib/catalogo.js");

const CANECA_BRANCA = Number(Object.keys(catalogo.PRODUCTS).find(id => catalogo.PRODUCTS[id].name === "Caneca porcelana branca"));

let child;
let adminCookie;
let clienteCookie;

function sessao(userId){
  const token = crypto.randomBytes(32).toString("hex");
  db.createSession({ tokenHash: crypto.createHash("sha256").update(token).digest("hex"), userId, expiresAt: Date.now() + 86400000 });
  return `plc_session=${token}`;
}

before(async () => {
  child = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server.js"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, DB_PATH: TMP_DB, PORT: String(PORT), CLIENT_ORIGIN: ORIGIN, ADMIN_2FA_REQUIRED: "false", ADMIN_EMAIL_HASHES: ADMIN_HASH, MP_ACCESS_TOKEN: "TEST-fake", NODE_ENV: "test" },
    stdio: "ignore",
  });
  const limite = Date.now() + 20000;
  for(;;){
    try { if((await fetch(ORIGIN + "/")).ok) break; } catch {}
    if(Date.now() > limite) throw new Error("servidor de teste não subiu");
    await new Promise(r => setTimeout(r, 200));
  }
  for(let i = 0; i < 50 && !db.lerEstado("estampas_exemplo_semeadas"); i++) await new Promise(r => setTimeout(r, 200));
  adminCookie = sessao(db.createUser({ name: "Admin", email: ADMIN_EMAIL, passwordHash: "x", cpf: null }).id);
  clienteCookie = sessao(db.createUser({ name: "Cliente", email: "cliente-estampas@test.com", passwordHash: "x", cpf: "11144477735" }).id);
});

after(() => {
  if(child) child.kill();
  for(const s of ["", "-wal", "-shm"]) { try { fs.unlinkSync(TMP_DB + s); } catch {} }
});

async function estampaDeTeste(){
  return sharp({ create: { width: 2835, height: 1122, channels: 3, background: { r: 230, g: 180, b: 60 } } }).png().toBuffer();
}

async function subir(buffer, campos, cookie = adminCookie, tipo = "image/png"){
  const form = new FormData();
  form.append("arquivo", new Blob([buffer], { type: tipo }), "estampa.png");
  for(const [k, v] of Object.entries(campos)) form.append(k, String(v));
  return fetch(`${ORIGIN}/api/admin/estampas`, { method: "POST", headers: { Origin: ORIGIN, ...(cookie ? { Cookie: cookie } : {}) }, body: form });
}

test("regras: estampa inválida é recusada, obrigatória é cobrada e o valor extra entra no preço", () => {
  const config = regras.normalizarConfig({ molde: "caneca", estampas: { ativa: true, ids: [], obrigatoria: true } });
  const produto = { price: 40, config, estampasDisponiveis: [{ id: "flores-abc", nome: "Flores", preco: 7.5 }] };
  assert.equal(regras.validarEscolhas(produto, { personalizacao: { estampa: "outra-xyz" } }, 1).ok, false);
  assert.match(regras.validarEscolhas(produto, { personalizacao: {} }, 1).erros.join(" "), /Escolha a estampa/);
  assert.equal(regras.precoUnitario(produto, { personalizacao: { estampa: "flores-abc" } }, 1), 47.5);
  assert.deepEqual(regras.resumoDasEscolhas(produto, { personalizacao: { estampa: "flores-abc" } }), [{ rotulo: "Estampa", valor: "Flores" }]);
  const azulejo = regras.normalizarConfig({ molde: "azulejo", estampas: { ativa: true } });
  assert.equal(azulejo.estampas.ativa, false, "estampa só em peça cilíndrica");
});

test("a volta da caneca: emenda atrás da alça e frente no mesmo lugar da prévia e do arquivo", () => {
  const volta = regras.voltaDaPeca("caneca");
  assert.ok(Math.abs(volta.centroDaFrente + volta.centroDoVerso - 1) < 1e-9);
  assert.ok(volta.centroDaFrente > 0.5 && volta.centroDaFrente < 1);
  assert.ok(Math.abs(volta.inicioNaTextura - (volta.vao / 2 + 0.75)) < 1e-9);
});

test("estampas de exemplo aparecem sozinhas e só uma vez", async () => {
  const lista = await (await fetch(`${ORIGIN}/api/estampas`)).json();
  assert.equal(lista.estampas.length, 3);
  assert.ok(lista.estampas.every(e => e.nome.includes("exemplo")));
  const miniatura = await fetch(ORIGIN + lista.estampas[0].miniatura);
  assert.equal(miniatura.status, 200);
  assert.equal(miniatura.headers.get("content-type"), "image/webp");
});

test("painel de estampas: só admin, com origem do site, e o arquivo é conferido de verdade", async () => {
  assert.equal((await subir(await estampaDeTeste(), { nome: "Teste", colecao: "Flores" }, null)).status, 401);
  assert.equal((await subir(await estampaDeTeste(), { nome: "Teste", colecao: "Flores" }, clienteCookie)).status, 403);
  const semOrigem = new FormData();
  semOrigem.append("arquivo", new Blob([await estampaDeTeste()], { type: "image/png" }), "e.png");
  semOrigem.append("nome", "Teste"); semOrigem.append("colecao", "Flores");
  assert.equal((await fetch(`${ORIGIN}/api/admin/estampas`, { method: "POST", headers: { Cookie: adminCookie }, body: semOrigem })).status, 403);
  const falso = await subir(Buffer.from("<html>não é imagem</html>"), { nome: "Falsa", colecao: "Flores" }, adminCookie, "image/png");
  assert.equal(falso.status, 415);
  const pequena = await subir(await sharp({ create: { width: 200, height: 100, channels: 3, background: "#fff" } }).png().toBuffer(), { nome: "Pequena", colecao: "Flores" });
  assert.equal(pequena.status, 415);
});

test("estampa nova: entra na loja, valor extra cobrado no servidor e some quando ocultada", async () => {
  const res = await subir(await estampaDeTeste(), { nome: "Ipê dourado", colecao: "Brasília", preco: "7.5" });
  assert.equal(res.status, 201);
  const { estampa } = await res.json();
  assert.match(estampa.id, /^ipe-dourado-[0-9a-f]{6}$/);

  const conferir = await fetch(`${ORIGIN}/api/carrinho/conferir`, {
    method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN },
    body: JSON.stringify({ items: [{ id: CANECA_BRANCA, qty: 1, escolhas: { variacoes: {}, adicionais: [], personalizacao: { estampa: estampa.id, letra: "cursiva", arte: "nome", aprovarWhatsApp: true } } }] }),
  });
  const [item] = (await conferir.json()).itens;
  const base = catalogo.effectiveProduct(CANECA_BRANCA, catalogo.getProductOverridesMap()).price;
  assert.equal(item.preco, base + 7.5);
  assert.ok(item.resumo.some(l => l.rotulo === "Estampa" && l.valor === "Ipê dourado"));

  const ocultar = await fetch(`${ORIGIN}/api/admin/estampas/${estampa.id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json", Origin: ORIGIN, Cookie: adminCookie },
    body: JSON.stringify({ nome: "Ipê dourado", colecao: "Brasília", preco: 7.5, ativa: false }),
  });
  assert.equal(ocultar.status, 200);
  const publica = await (await fetch(`${ORIGIN}/api/estampas`)).json();
  assert.ok(!publica.estampas.some(e => e.id === estampa.id));
  assert.equal((await fetch(`${ORIGIN}/api/estampas/${estampa.id}/textura`)).status, 404);
  const original = await fetch(`${ORIGIN}/api/admin/estampas/${estampa.id}/original`, { headers: { Cookie: adminCookie } });
  assert.equal(original.status, 200);
  assert.equal(original.headers.get("content-type"), "image/png");
});

test("arquivo de produção: estampa original cobrindo o gabarito, texto em curvas por cima e frente no lado certo", async () => {
  const { estampas } = await (await fetch(`${ORIGIN}/api/estampas`)).json();
  const estampa = estampas[0];
  const produto = catalogo.effectiveProduct(CANECA_BRANCA, catalogo.getProductOverridesMap());
  const ref = crypto.randomUUID();
  db.createOrder({
    externalReference: ref, userId: null, status: "pago",
    items: [{
      id: CANECA_BRANCA, qty: 1, price: 40, nome: produto.name, config: produto.config,
      resumo: [{ rotulo: "Estampa", valor: estampa.nome }],
      escolhas: { variacoes: {}, adicionais: [], personalizacao: { nome: "Madrinha Lara", letra: "cursiva", arte: "nome", estampa: estampa.id, aprovarWhatsApp: true } },
    }],
    address: { nome: "Cliente" }, shipping: { service_id: "retirada", name: "Retirada", price: 0 },
    subtotal: 40, shippingPrice: 0, total: 36,
  });
  const res = await fetch(`${ORIGIN}/api/admin/pedidos/${ref}/itens/0/producao.svg`, { headers: { Cookie: adminCookie } });
  assert.equal(res.status, 200);
  const svg = await res.text();
  assert.match(svg, /<g id="Estampa"><image x="0" y="0" width="240" height="95" preserveAspectRatio="xMidYMid slice" xlink:href="data:image\/png;base64,/);
  assert.ok(svg.indexOf('id="Estampa"') < svg.indexOf('id="Frente"'), "estampa embaixo do texto");
  const frente = /<g id="Frente" transform="translate\(([\d.]+) /.exec(svg);
  assert.ok(Math.abs(Number(frente[1]) - 240 * regras.voltaDaPeca("caneca").centroDaFrente) < 0.01);
  assert.doesNotMatch(svg, /<text\b/);
  const frenteSvg = svg.slice(svg.indexOf('<g id="Frente"'), svg.indexOf('<g id="Verso"'));
  assert.match(frenteSvg, /<g fill="#FFFCF8" stroke="#FFFCF8" stroke-linejoin="round"><path [^>]*stroke-width="[\d.]+"/, "contorno claro em curvas atrás do nome para dar para ler sobre a estampa");
  assert.ok(frenteSvg.indexOf('stroke="#FFFCF8"') < frenteSvg.indexOf('<g fill="#2E2A28">'), "contorno embaixo das letras");

  const apagar = await fetch(`${ORIGIN}/api/admin/estampas/${estampa.id}`, { method: "DELETE", headers: { Origin: ORIGIN, Cookie: adminCookie } });
  assert.equal(apagar.status, 409, "estampa em pedido em produção não pode ser apagada");
});
