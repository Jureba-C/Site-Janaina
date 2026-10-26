const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const net = require("node:net");
const sharp = require("sharp");

const PORT = 39557;
const ORIGIN = `http://localhost:${PORT}`;
const ADMIN_EMAIL = "admin@test.com";
const ADMIN_HASH = crypto.createHash("sha256").update(ADMIN_EMAIL).digest("hex");
const TMP_DB = path.join(os.tmpdir(), `plc-api-test-${process.pid}-${Date.now()}.db`);

process.env.DB_PATH = TMP_DB;
const db = require("../lib/db.js");
const auth = require("../lib/auth.js");

let child;
let sharedAdminCookie = null;
let sharedClienteCookie = null;

function cleanupDb() {
  for (const s of ["", "-wal", "-shm"]) { try { fs.unlinkSync(TMP_DB + s); } catch {} }
}

before(async () => {
  child = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server.js"], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      DB_PATH: TMP_DB, PORT: String(PORT), CLIENT_ORIGIN: ORIGIN,
      ADMIN_2FA_REQUIRED: "false", ADMIN_EMAIL_HASHES: ADMIN_HASH,
      MP_ACCESS_TOKEN: "TEST-fake", NODE_ENV: "test",
    },
    stdio: "ignore",
  });
  const deadline = Date.now() + 10000;
  for (;;) {
    try { if ((await fetch(ORIGIN + "/")).ok) break; } catch {}
    if (Date.now() > deadline) throw new Error("servidor de teste não subiu");
    await new Promise(r => setTimeout(r, 200));
  }
});

after(() => {
  if (child) child.kill();
  cleanupDb();
});

function post(url, body, cookie) {
  return fetch(ORIGIN + url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
}
function put(url, body, cookie) {
  return fetch(ORIGIN + url, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Origin: ORIGIN, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
}
function patch(url, body, cookie) {
  return fetch(ORIGIN + url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Origin: ORIGIN, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
}
function get(url, cookie) {
  return fetch(ORIGIN + url, {
    headers: cookie ? { Cookie: cookie } : {},
  });
}
async function seedLoggedInUser({ name, email, password, cpf }) {
  const user = db.createUser({ name, email, passwordHash: await auth.hashPassword(password), cpf });
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  db.createSession({ tokenHash, userId: user.id, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  return { user, cookie: `plc_session=${token}` };
}
async function contaDeAdmin(email){
  const user = db.getUserByEmail(email)
    || db.createUser({ name: "Admin", email, passwordHash: await auth.hashPassword("SenhaADM12345!"), cpf: null });
  const token = crypto.randomBytes(32).toString("hex");
  db.createSession({
    tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    userId: user.id, expiresAt: Date.now() + 60 * 60 * 1000,
  });
  return `plc_session=${token}`;
}

function cookieFrom(res) {
  const raw = res.headers.get("set-cookie");
  return raw ? raw.split(";")[0] : null;
}

test("cadastro define sessão e /api/auth/me responde ao dono", async () => {
  const res = await post("/api/auth/register", { name: "Cliente A", email: "a@test.com", password: "SenhaA12345!", cpf: "11144477735" });
  assert.equal(res.status, 201);
  const cookie = cookieFrom(res);
  assert.ok(cookie, "deve vir cookie de sessão");
  const me = await fetch(ORIGIN + "/api/auth/me", { headers: { Cookie: cookie } });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).email, "a@test.com");
});

test("login com senha errada é rejeitado", async () => {
  const res = await post("/api/auth/login", { email: "a@test.com", password: "errada" });
  assert.equal(res.status, 401);
});

function rawGet(caminho){
  return new Promise((resolve, reject) => {
    const sock = net.createConnection(PORT, "127.0.0.1");
    let buf = "";
    sock.setTimeout(8000, () => { sock.destroy(); reject(new Error("timeout")); });
    sock.on("connect", () => sock.write(`GET ${caminho} HTTP/1.1\r\nHost: localhost:${PORT}\r\nConnection: close\r\n\r\n`));
    sock.on("data", (d) => { buf += d; if(buf.length > 300000) sock.destroy(); });
    sock.on("close", () => {
      const statusLine = buf.split("\r\n", 1)[0];
      const status = Number(statusLine.split(" ")[1]) || 0;
      resolve({ status, length: buf.length });
    });
    sock.on("error", reject);
  });
}

test("path traversal: '../' e formas escapadas nunca vazam arquivo de fora da pasta pública", async () => {
  const ataques = [
    "/js/../server.js",
    "/js/../data.db",
    "/js/../lib/auth.js",
    "/js/../admin.html",
    "/js/%2e%2e/server.js",
    "/img/..%2fadmin.html",
    "/js/../../server/data.db",
    "/js/./auth.js",
  ];
  for(const a of ataques){
    const r = await rawGet(a);
    assert.notEqual(r.status, 200, `PATH TRAVERSAL VAZOU em ${a} (status 200)`);
    assert.ok(r.status === 404 || r.status === 301, `${a} devia ser 404/301, veio ${r.status}`);
  }

  assert.equal((await rawGet("/js/auth.js")).status, 200);
  assert.equal((await rawGet("/css/style.css")).status, 200);
  assert.equal((await rawGet("/")).status, 200);
  assert.equal((await rawGet("/index.html")).status, 301);
});

test("rotas protegidas exigem sessão (401 sem cookie)", async () => {
  assert.equal((await fetch(ORIGIN + "/api/orders")).status, 401);
  assert.equal((await fetch(ORIGIN + "/api/admin/orders")).status, 401);
});

test("GET /api/instagram/feed sem token configurado devolve available:false (nunca 500)", async () => {
  const res = await fetch(ORIGIN + "/api/instagram/feed");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.available, false);
});

test("CSRF: POST sem Origin correto é bloqueado", async () => {
  const res = await fetch(ORIGIN + "/api/newsletter", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://site-malicioso.com" },
    body: JSON.stringify({ email: "x@test.com" }),
  });
  assert.equal(res.status, 403);
});

test("controle de acesso admin: cliente comum não entra, admin entra", async () => {
  const rc = await post("/api/auth/register", { name: "Comum", email: "comum@test.com", password: "SenhaC12345!", cpf: "11144477735" });
  const comumCookie = cookieFrom(rc);
  const asComum = await fetch(ORIGIN + "/api/admin/orders", { headers: { Cookie: comumCookie } });
  assert.equal(asComum.status, 403, "cliente comum -> 403");

  const recusado = await post("/api/auth/register", { name: "Invasora", email: ADMIN_EMAIL, password: "SenhaADM12345!", cpf: "11144477735" });
  assert.equal(recusado.status, 409, "e-mail de admin não pode ser cadastrado pelo site");

  const adminCookie = await contaDeAdmin(ADMIN_EMAIL);
  assert.equal((await (await fetch(ORIGIN + "/api/auth/me", { headers: { Cookie: adminCookie } })).json()).isAdmin, true);
  const asAdmin = await fetch(ORIGIN + "/api/admin/orders", { headers: { Cookie: adminCookie } });
  assert.equal(asAdmin.status, 200, "admin -> 200");
});

test("GET/PUT /api/auth/address — sem sessão, endereço em branco, salva/atualiza, isolado entre clientes", async () => {
  assert.equal((await fetch(ORIGIN + "/api/auth/address")).status, 401);

  const regA = await post("/api/auth/register", { name: "End A", email: "enda@test.com", password: "SenhaA12345!", cpf: "11144477735" });
  const cookieA = cookieFrom(regA);

  const initial = await fetch(ORIGIN + "/api/auth/address", { headers: { Cookie: cookieA } });
  assert.equal(initial.status, 200);
  assert.equal((await initial.json()).address, null);

  const endereco = { nome: "End A", telefone: "(61) 91111-2222", cpf: "11144477735", rua: "Rua das Flores", numero: "10", bairro: "Centro", cidade: "Brasília", uf: "DF", cep: "70040-020" };

  const incompleto = await put("/api/auth/address", { address: { ...endereco, numero: "" } }, cookieA);
  assert.equal(incompleto.status, 400);

  const saved = await put("/api/auth/address", { address: endereco }, cookieA);
  assert.equal(saved.status, 200);
  const fetched = await (await fetch(ORIGIN + "/api/auth/address", { headers: { Cookie: cookieA } })).json();
  assert.equal(fetched.address.rua, "Rua das Flores");
  assert.equal(fetched.address.cep, "70040020", "cep salvo só com dígitos");

  const atualizado = await put("/api/auth/address", { address: { ...endereco, rua: "Rua Nova", numero: "20" } }, cookieA);
  assert.equal(atualizado.status, 200);
  const refetched = await (await fetch(ORIGIN + "/api/auth/address", { headers: { Cookie: cookieA } })).json();
  assert.equal(refetched.address.rua, "Rua Nova");

  const regB = await post("/api/auth/register", { name: "End B", email: "endb@test.com", password: "SenhaB12345!", cpf: "11144477735" });
  const cookieB = cookieFrom(regB);
  const asB = await (await fetch(ORIGIN + "/api/auth/address", { headers: { Cookie: cookieB } })).json();
  assert.equal(asB.address, null, "endereço de outra conta não vaza");
});

test("esgotado: PATCH admin reflete no catálogo e bloqueia o checkout (incl. a corrida)", async () => {
  const endereco = {
    nome: "Cliente Esgotado", telefone: "61999990000", cpf: "11144477735", rua: "Rua das Flores",
    numero: "100", bairro: "Centro", cidade: "Brasília", uf: "DF",
  };
  const checkoutBody = () => ({
    items: [{ id: 1, qty: 1 }],
    cep: "70040020",
    shipping_service_id: "1",
    address: endereco,
    paymentMethod: "card",
  });

  const ra = await post("/api/auth/login", { email: ADMIN_EMAIL, password: "SenhaADM12345!" });
  const adminCookie = cookieFrom(ra);
  assert.ok(adminCookie, "login admin precisa devolver cookie de sessão");
  sharedAdminCookie = adminCookie;

  const rc = await post("/api/auth/register", { name: "Cliente Esgotado", email: "clientecor@test.com", password: "SenhaC12345!", cpf: "11144477735" });
  const clienteCookie = cookieFrom(rc);
  sharedClienteCookie = clienteCookie;

  const disponivel = await post("/api/create-preference", checkoutBody(), clienteCookie);
  assert.notEqual(disponivel.status, 400);
  assert.notEqual(disponivel.status, 409);

  const patched = await patch("/api/admin/products/1", { soldOut: true }, adminCookie);
  assert.equal(patched.status, 200);
  assert.equal((await patched.json()).soldOut, true);

  const pub = await (await fetch(ORIGIN + "/api/products")).json();
  assert.equal(pub.products.find(p => p.id === 1).soldOut, true);
  const adminList = await (await fetch(ORIGIN + "/api/admin/products", { headers: { Cookie: adminCookie } })).json();
  assert.equal(adminList.products.find(p => p.id === 1).soldOut, true);

  const corrida = await post("/api/create-preference", checkoutBody(), clienteCookie);
  assert.equal(corrida.status, 409, "produto esgotado entre a escolha e o checkout é rejeitado");
  assert.match((await corrida.json()).error, /Caneca porcelana branca/);

  const voltou = await patch("/api/admin/products/1", { soldOut: false }, adminCookie);
  assert.equal(voltou.status, 200);
  assert.equal((await voltou.json()).soldOut, false);
});

test("galeria de fotos: PATCH admin reflete no catálogo (a 1ª é a capa) e valida limites", async () => {
  const adminCookie = sharedAdminCookie;
  assert.ok(adminCookie, "precisa de um cookie de admin já autenticado");

  const fotoA = "https://exemplo.test/foto-a.jpg";
  const fotoB = "https://exemplo.test/foto-b.jpg";

  const salvo = await patch("/api/admin/products/2", { photos: [fotoA, fotoB] }, adminCookie);
  assert.equal(salvo.status, 200);
  const salvoBody = await salvo.json();
  assert.deepEqual(salvoBody.photos, [fotoA, fotoB]);
  assert.equal(salvoBody.photoUrl, fotoA, "a 1ª foto da lista é a capa (photoUrl derivado)");

  const pub = await (await fetch(ORIGIN + "/api/products")).json();
  const p2 = pub.products.find(p => p.id === 2);
  assert.deepEqual(p2.photos, [fotoA, fotoB]);
  assert.equal(p2.photoUrl, fotoA);

  const reordenado = await patch("/api/admin/products/2", { photos: [fotoB, fotoA] }, adminCookie);
  assert.equal(reordenado.status, 200);
  assert.equal((await reordenado.json()).photoUrl, fotoB);

  const demais = await patch(
    "/api/admin/products/2",
    { photos: Array.from({ length: 9 }, (_, i) => `https://exemplo.test/foto-${i}.jpg`) },
    adminCookie
  );
  assert.equal(demais.status, 400);
  const duplicada = await patch("/api/admin/products/2", { photos: [fotoA, fotoA] }, adminCookie);
  assert.equal(duplicada.status, 400);
  const invalida = await patch("/api/admin/products/2", { photos: ["nao-e-uma-url"] }, adminCookie);
  assert.equal(invalida.status, 400);

  const semFotos = await patch("/api/admin/products/2", { photos: [] }, adminCookie);
  assert.equal(semFotos.status, 200);
  assert.deepEqual((await semFotos.json()).photos, []);
});

test("galeria de fotos: upload real grava no banco (product_photos) e remover a foto do PATCH apaga a linha", async () => {
  const adminCookie = sharedAdminCookie;
  assert.ok(adminCookie, "precisa de um cookie de admin já autenticado");

  const jpegBuffer = await sharp({
    create: { width: 4, height: 4, channels: 3, background: { r: 200, g: 120, b: 160 } },
  }).jpeg().toBuffer();

  const form = new FormData();
  form.append("photo", new Blob([jpegBuffer], { type: "image/jpeg" }), "foto.jpg");
  const up = await fetch(`${ORIGIN}/api/admin/products/3/photo`, {
    method: "POST",
    headers: { Origin: ORIGIN, Cookie: adminCookie },
    body: form,
  });
  assert.equal(up.status, 201);
  const { photoUrl } = await up.json();
  assert.match(photoUrl, /^\/api\/products\/photos\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

  const served = await fetch(ORIGIN + photoUrl);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get("content-type"), "image/jpeg");
  const servedBuffer = Buffer.from(await served.arrayBuffer());
  const metadata = await sharp(servedBuffer).metadata();
  assert.equal(metadata.format, "jpeg", "bytes devolvidos precisam ser um JPEG decodificável");

  const salvo = await patch("/api/admin/products/3", { photos: [photoUrl] }, adminCookie);
  assert.equal(salvo.status, 200);
  assert.equal((await fetch(ORIGIN + photoUrl)).status, 200, "foto continua servida enquanto está na lista");

  const removido = await patch("/api/admin/products/3", { photos: [] }, adminCookie);
  assert.equal(removido.status, 200);
  assert.equal((await fetch(ORIGIN + photoUrl)).status, 404, "foto devia deixar de existir depois de sair da lista");
});


test("?w= na foto: reduz, negocia WebP pelo Accept, ignora largura fora da lista e some junto com a foto", async () => {
  const adminCookie = sharedAdminCookie;
  assert.ok(adminCookie, "precisa de um cookie de admin já autenticado");

  const grande = await sharp({
    create: { width: 1200, height: 1600, channels: 3, background: { r: 210, g: 140, b: 175 } },
  }).jpeg().toBuffer();

  const form = new FormData();
  form.append("photo", new Blob([grande], { type: "image/jpeg" }), "grande.jpg");
  const up = await fetch(`${ORIGIN}/api/admin/products/5/photo`, {
    method: "POST",
    headers: { Origin: ORIGIN, Cookie: adminCookie },
    body: form,
  });
  assert.equal(up.status, 201);
  const { photoUrl } = await up.json();
  await patch("/api/admin/products/5", { photos: [photoUrl] }, adminCookie);

  const bytesDe = async (url, accept) => {
    const r = await fetch(ORIGIN + url, accept ? { headers: { Accept: accept } } : undefined);
    assert.equal(r.status, 200, `${url} devia responder 200`);
    return { r, buf: Buffer.from(await r.arrayBuffer()) };
  };

  const original = await bytesDe(photoUrl);
  const metaOriginal = await sharp(original.buf).metadata();
  assert.equal(metaOriginal.width, 1200, "sem ?w= a foto sai no tamanho gravado");
  assert.equal(original.r.headers.get("content-type"), "image/jpeg");

  const jpeg400 = await bytesDe(photoUrl + "?w=400", "image/jpeg,*/*");
  const metaJpeg = await sharp(jpeg400.buf).metadata();
  assert.equal(metaJpeg.format, "jpeg");
  assert.equal(metaJpeg.width, 400);
  assert.ok(jpeg400.buf.length < original.buf.length, "reduzida precisa pesar menos que o original");

  const webp400 = await bytesDe(photoUrl + "?w=400", "image/webp,image/jpeg,*/*");
  const metaWebp = await sharp(webp400.buf).metadata();
  assert.equal(metaWebp.format, "webp", "com image/webp no Accept a resposta devia ser WebP");
  assert.equal(metaWebp.width, 400);
  assert.equal(webp400.r.headers.get("content-type"), "image/webp");
  assert.match(webp400.r.headers.get("vary") || "", /Accept/i, "resposta que varia por Accept precisa dizer isso");

  const webpDeNovo = await bytesDe(photoUrl + "?w=400", "image/webp,*/*");
  assert.ok(webp400.buf.equals(webpDeNovo.buf), "variante cacheada devia devolver exatamente os mesmos bytes");

  const forcada = await bytesDe(photoUrl + "?w=137", "image/webp,*/*");
  const metaForcada = await sharp(forcada.buf).metadata();
  assert.equal(metaForcada.width, 1200, "largura fora da lista devia cair no original");
  assert.equal(metaForcada.format, "jpeg", "sem largura válida não há negociação de formato");

  const removido = await patch("/api/admin/products/5", { photos: [] }, adminCookie);
  assert.equal(removido.status, 200);
  assert.equal((await fetch(ORIGIN + photoUrl + "?w=400")).status, 404,
    "variante não pode sobreviver à foto que a originou");
});


test("descrição do produto: PATCH edita, GET /api/products reflete, POST /api/admin/products aceita na criação", async () => {
  const adminCookie = sharedAdminCookie;
  assert.ok(adminCookie);

  const patched = await patch("/api/admin/products/4", { description: "Descrição escrita pela lojista." }, adminCookie);
  assert.equal(patched.status, 200);
  assert.equal((await patched.json()).description, "Descrição escrita pela lojista.");

  const pub = await (await fetch(ORIGIN + "/api/products")).json();
  assert.equal(pub.products.find(p => p.id === 4).description, "Descrição escrita pela lojista.");

  const longaDemais = await patch("/api/admin/products/4", { description: "x".repeat(501) }, adminCookie);
  assert.equal(longaDemais.status, 400);

  const limpa = await patch("/api/admin/products/4", { description: "" }, adminCookie);
  assert.equal(limpa.status, 200);
  assert.equal((await limpa.json()).description, null);

  const created = await post("/api/admin/products", {
    name: "Produto Teste Descrição", description: "Feito sob encomenda.",
    price: 39.9, weight: 0.05, width: 16, height: 3, length: 11, badges: [],
  }, adminCookie);
  assert.equal(created.status, 201);
  assert.equal((await created.json()).description, "Feito sob encomenda.");
});

test("produto novo grava peso, caixa e categorias da configuração; categoria inventada é recusada", async () => {
  const adminCookie = sharedAdminCookie;
  assert.ok(adminCookie);
  const res = await post("/api/admin/products", {
    name: "Caneca de Teste", price: 49, badges: [],
    config: { categorias: ["canecas", "casamento"], molde: "caneca", peso: 0.5, caixa: { largura: 13, altura: 12, comprimento: 14 }, personalizacao: { ativa: false } },
  }, adminCookie);
  assert.equal(res.status, 201);
  const criado = await res.json();
  assert.deepEqual(criado.config.categorias, ["canecas", "casamento"]);
  const linha = db.getCustomProduct(criado.id);
  assert.deepEqual({ weight: linha.weight, width: linha.width, height: linha.height, length: linha.length }, { weight: 0.5, width: 13, height: 12, length: 14 });

  const semConfig = await post("/api/admin/products", { name: "Sem Config", price: 30, category: "garrafas-e-termicos", badges: [] }, adminCookie);
  assert.equal(semConfig.status, 201);
  assert.deepEqual((await semConfig.json()).config.categorias, ["garrafas-e-termicos"]);

  const inventada = await post("/api/admin/products", { name: "Categoria Inventada", price: 10, badges: [], config: { categorias: ["nao-existe"] } }, adminCookie);
  assert.equal(inventada.status, 400);
});

test("continuar pagamento: 404 se não existe/não é da cliente, 409 se já não está pendente", async () => {
  function sessionCookieFor(userId){
    const token = crypto.randomBytes(32).toString("hex");
    db.createSession({
      tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
      userId,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    return `plc_session=${token}`;
  }

  const dona = db.createUser({ name: "Dona Pedido", email: "donapedido@test.com", passwordHash: "x", cpf: "11144477735" });
  const donaCookie = sessionCookieFor(dona.id);
  const donaId = dona.id;

  const outra = db.createUser({ name: "Outra Cliente", email: "outracliente@test.com", passwordHash: "x", cpf: "11144477735" });
  const outraCookie = sessionCookieFor(outra.id);

  const pedidoBase = {
    items: [{ id: 1, qty: 1, price: 34.9, color: "#F4B4CC" }],
    address: { nome: "Dona Pedido", telefone: "61999990000", rua: "Rua X", numero: "1", bairro: "B", cidade: "Brasília", uf: "DF", cep: "70040020" },
    shipping: { service_id: "1", name: "PAC", price: 10 },
    subtotal: 34.9, shippingPrice: 10, total: 44.9, customerPhone: "61999990000",
  };

  const pago = db.createOrder({ ...pedidoBase, externalReference: "TEST-PAGO-1", userId: donaId, status: "pago" });
  const pendenteDaDona = db.createOrder({ ...pedidoBase, externalReference: "TEST-PENDENTE-1", userId: donaId, status: "pendente" });

  const inexistente = await post("/api/orders/nao-existe-esta-referencia/resume-payment", {}, donaCookie);
  assert.equal(inexistente.status, 404);

  const deOutra = await post(`/api/orders/${pendenteDaDona.external_reference}/resume-payment`, {}, outraCookie);
  assert.equal(deOutra.status, 404);

  const jaPago = await post(`/api/orders/${pago.external_reference}/resume-payment`, {}, donaCookie);
  assert.equal(jaPago.status, 409);
});

test("GET /api/orders/:reference — detalhe só para a dona do pedido, com rastreio degradando para null sem Melhor Envio configurado", async () => {
  function sessionCookieFor(userId){
    const token = crypto.randomBytes(32).toString("hex");
    db.createSession({
      tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
      userId,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    return `plc_session=${token}`;
  }

  const dona = db.createUser({ name: "Dona Rastreio", email: "donarastreio@test.com", passwordHash: "x", cpf: "11144477735" });
  const donaCookie = sessionCookieFor(dona.id);
  const outra = db.createUser({ name: "Outra Rastreio", email: "outrarastreio@test.com", passwordHash: "x", cpf: "11144477735" });
  const outraCookie = sessionCookieFor(outra.id);

  const pedido = db.createOrder({
    externalReference: "TEST-DETALHE-1", userId: dona.id, status: "pago",
    items: [{ id: 1, qty: 1, price: 34.9, color: "#F4B4CC" }],
    address: { nome: "Dona Rastreio", telefone: "61999990000", rua: "Rua X", numero: "1", bairro: "B", cidade: "Brasília", uf: "DF", cep: "70040020" },
    shipping: { service_id: "1", name: "PAC", price: 10 },
    subtotal: 34.9, shippingPrice: 10, total: 44.9, customerPhone: "61999990000",
  });
  db.markOrderInProduction(pedido.external_reference);
  db.updateOrderTracking(pedido.external_reference, "AA123456789BR");

  const semLogin = await get(`/api/orders/${pedido.external_reference}`);
  assert.equal(semLogin.status, 401);

  const inexistente = await get("/api/orders/nao-existe-esta-referencia", donaCookie);
  assert.equal(inexistente.status, 404);

  const deOutra = await get(`/api/orders/${pedido.external_reference}`, outraCookie);
  assert.equal(deOutra.status, 404);

  const res = await get(`/api/orders/${pedido.external_reference}`, donaCookie);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.reference, pedido.external_reference);
  assert.equal(body.status, "pago");
  assert.equal(body.fulfillmentStatus, "postado");
  assert.equal(body.trackingCode, "AA123456789BR");
  assert.equal(body.carrierUrl, "https://melhorenvio.com.br/rastreio/AA123456789BR");
  assert.equal(body.tracking, null);
});

test("ordem dos produtos: PUT reordena a vitrine, e rejeita lista incompleta/repetida", async () => {
  const adminCookie = sharedAdminCookie;
  assert.ok(adminCookie);

  const idsOriginais = (await (await fetch(ORIGIN + "/api/products")).json()).products.map(p => p.id);
  assert.ok(idsOriginais.length >= 3, "precisa de pelo menos 3 produtos pra testar a troca");

  const invertida = [...idsOriginais].reverse();
  const ok = await put("/api/admin/products/order", { ids: invertida }, adminCookie);
  assert.equal(ok.status, 200);

  const depois = (await (await fetch(ORIGIN + "/api/products")).json()).products.map(p => p.id);
  assert.deepEqual(depois, invertida, "a vitrine passa a seguir a ordem salva");

  const noPainel = (await (await fetch(ORIGIN + "/api/admin/products", { headers: { Cookie: adminCookie } })).json()).products.map(p => p.id);
  assert.deepEqual(noPainel, invertida, "painel e vitrine na mesma ordem");

  const incompleta = await put("/api/admin/products/order", { ids: invertida.slice(1) }, adminCookie);
  assert.equal(incompleta.status, 409);

  const repetida = await put("/api/admin/products/order", { ids: [invertida[0], ...invertida] }, adminCookie);
  assert.equal(repetida.status, 400);

  assert.equal((await put("/api/admin/products/order", { ids: [] }, adminCookie)).status, 400);

  const comoCliente = await put("/api/admin/products/order", { ids: idsOriginais }, sharedClienteCookie);
  assert.equal(comoCliente.status, 403);

  await put("/api/admin/products/order", { ids: idsOriginais }, adminCookie);
});

test("ocultar produto: some de /api/products, continua em /api/admin/products, e volta ao desocultar", async () => {
  const adminCookie = sharedAdminCookie;
  assert.ok(adminCookie);

  const antes = await (await fetch(ORIGIN + "/api/products")).json();
  assert.ok(antes.products.some(p => p.id === 5), "produto 5 deve estar visível antes do teste");

  const ocultou = await patch("/api/admin/products/5", { hidden: true }, adminCookie);
  assert.equal(ocultou.status, 200);
  assert.equal((await ocultou.json()).hidden, true);

  const pubDepois = await (await fetch(ORIGIN + "/api/products")).json();
  assert.equal(pubDepois.products.some(p => p.id === 5), false, "produto oculto some da vitrine pública");

  const adminDepois = await (await fetch(ORIGIN + "/api/admin/products", { headers: { Cookie: adminCookie } })).json();
  const noPainel = adminDepois.products.find(p => p.id === 5);
  assert.ok(noPainel, "produto oculto continua aparecendo no painel");
  assert.equal(noPainel.hidden, true);

  const bloqueado = await post("/api/validate-coupon", { code: "BEMVINDA10", items: [{ id: 5, qty: 1 }] });
  assert.equal(bloqueado.status, 409);
  assert.match((await bloqueado.json()).error, /não está mais disponível/);

  const desocultou = await patch("/api/admin/products/5", { hidden: false }, adminCookie);
  assert.equal(desocultou.status, 200);
  assert.equal((await desocultou.json()).hidden, false);
  const pubFinal = await (await fetch(ORIGIN + "/api/products")).json();
  assert.ok(pubFinal.products.some(p => p.id === 5), "produto volta a aparecer ao desocultar");
});

test("categorias: cria, renomeia (slug não muda), bloqueia excluir em uso, exclui depois de liberar", async () => {
  const adminCookie = sharedAdminCookie;
  assert.ok(adminCookie);

  const criada = await post("/api/admin/categories", { label: "Aniversário Teste" }, adminCookie);
  assert.equal(criada.status, 201);
  const categoria = await criada.json();
  assert.equal(categoria.builtin, false);
  const slug = categoria.slug;

  assert.equal((await post("/api/admin/categories", { label: "Outra" }, sharedClienteCookie)).status, 403);

  assert.equal((await patch("/api/admin/categories/canecas", { label: "Canecas Novas" }, adminCookie)).status, 400);
  assert.equal((await fetch(ORIGIN + `/api/admin/categories/canecas`, {
    method: "DELETE", headers: { Origin: ORIGIN, Cookie: adminCookie },
  })).status, 400);

  const renomeada = await patch(`/api/admin/categories/${slug}`, { label: "Aniversário Renomeado" }, adminCookie);
  assert.equal(renomeada.status, 200);
  const dadosRenomeada = await renomeada.json();
  assert.equal(dadosRenomeada.slug, slug);
  assert.equal(dadosRenomeada.label, "Aniversário Renomeado");
  const listaApósRenomear = (await (await fetch(ORIGIN + "/api/products")).json()).categories;
  assert.ok(listaApósRenomear.some(c => c.slug === slug && c.label === "Aniversário Renomeado"));

  const atribuiu = await patch("/api/admin/products/5", { category: slug }, adminCookie);
  assert.equal(atribuiu.status, 200);

  const bloqueada = await fetch(ORIGIN + `/api/admin/categories/${slug}`, {
    method: "DELETE", headers: { Origin: ORIGIN, Cookie: adminCookie },
  });
  assert.equal(bloqueada.status, 409);
  assert.match((await bloqueada.json()).error, /produto/);

  await patch("/api/admin/products/5", { category: "canecas" }, adminCookie);
  await patch("/api/admin/products/5", { config: { ...(await (await fetch(ORIGIN + "/api/products")).json()).products.find(p => p.id === 5).config, categorias: ["canecas"] } }, adminCookie);
  const excluida = await fetch(ORIGIN + `/api/admin/categories/${slug}`, {
    method: "DELETE", headers: { Origin: ORIGIN, Cookie: adminCookie },
  });
  assert.equal(excluida.status, 200);

  const listaFinal = (await (await fetch(ORIGIN + "/api/products")).json()).categories;
  assert.ok(!listaFinal.some(c => c.slug === slug), "categoria excluída não aparece mais na lista");
});

test("exclusão de conta: senha errada barra; senha certa apaga e invalida login", async () => {
  const { cookie } = await seedLoggedInUser({ name: "Del", email: "del@test.com", password: "SenhaDEL12345!", cpf: "11144477735" });

  const bad = await fetch(ORIGIN + "/api/auth/account", {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Origin: ORIGIN, Cookie: cookie },
    body: JSON.stringify({ password: "errada" }),
  });
  assert.equal(bad.status, 401);
  assert.ok(db.getUserByEmail("del@test.com"), "conta continua existindo após senha errada");

  const ok = await fetch(ORIGIN + "/api/auth/account", {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Origin: ORIGIN, Cookie: cookie },
    body: JSON.stringify({ password: "SenhaDEL12345!" }),
  });
  assert.equal(ok.status, 200);

  assert.equal(db.getUserByEmail("del@test.com"), null, "conta apagada");
});
