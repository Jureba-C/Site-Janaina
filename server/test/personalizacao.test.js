const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const sharp = require("sharp");

const PORT = 39611;
const ORIGIN = `http://localhost:${PORT}`;
const ADMIN_EMAIL = "admin-arte@test.com";
const ADMIN_HASH = crypto.createHash("sha256").update(ADMIN_EMAIL).digest("hex");
const TMP_DB = path.join(os.tmpdir(), `arte-personalizacao-${process.pid}-${Date.now()}.db`);

process.env.DB_PATH = TMP_DB;
const db = require("../lib/db.js");
const catalogo = require("../lib/catalogo.js");

const idDe = (nome) => Number(Object.keys(catalogo.PRODUCTS).find(id => catalogo.PRODUCTS[id].name === nome));
const TORRE = idDe("Torre de xícaras Ipês");
const BOTTON = idDe("Botton broche pequeno");
const SILICONE = idDe("Caneca com tampa e base de silicone");

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
  const limite = Date.now() + 15000;
  for(;;){
    try { if((await fetch(ORIGIN + "/")).ok) break; } catch {}
    if(Date.now() > limite) throw new Error("servidor de teste não subiu");
    await new Promise(r => setTimeout(r, 200));
  }
  adminCookie = sessao(db.createUser({ name: "Admin", email: ADMIN_EMAIL, passwordHash: "x", cpf: null }).id);
  clienteCookie = sessao(db.createUser({ name: "Cliente", email: "cliente-arte@test.com", passwordHash: "x", cpf: "11144477735" }).id);
});

after(() => {
  if(child) child.kill();
  for(const s of ["", "-wal", "-shm"]) { try { fs.unlinkSync(TMP_DB + s); } catch {} }
});

async function fotoDeTeste(){
  return sharp({ create: { width: 1200, height: 800, channels: 3, background: { r: 200, g: 120, b: 80 } } }).jpeg().toBuffer();
}

async function enviarFoto(buffer, tipo = "image/jpeg", nome = "foto.jpg"){
  const form = new FormData();
  form.append("foto", new Blob([buffer], { type: tipo }), nome);
  return fetch(`${ORIGIN}/api/personalizacao/fotos`, { method: "POST", headers: { Origin: ORIGIN }, body: form });
}

async function postar(caminho, corpo, cookie){
  return fetch(ORIGIN + caminho, { method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN, ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(corpo) });
}

test("foto enviada: o tipo real é conferido e só quem tem a chave enxerga", async () => {
  const falsa = await enviarFoto(Buffer.from("<script>alert(1)</script>"), "image/jpeg", "foto.jpg");
  assert.equal(falsa.status, 415, "texto disfarçado de JPG é recusado pelo conteúdo, não pelo nome");

  const res = await enviarFoto(await fotoDeTeste());
  assert.equal(res.status, 201);
  const { id, chave } = await res.json();
  assert.match(id, /^[0-9a-f-]{36}$/);
  assert.match(chave, /^[0-9a-f]{32}$/);

  assert.equal((await fetch(`${ORIGIN}/api/personalizacao/fotos/${id}`)).status, 404, "sem a chave, não vê");
  assert.equal((await fetch(`${ORIGIN}/api/personalizacao/fotos/${id}?chave=${"0".repeat(32)}`)).status, 404, "chave errada, não vê");
  assert.equal((await fetch(`${ORIGIN}/api/personalizacao/fotos/${id}`, { headers: { Cookie: clienteCookie } })).status, 404, "outra cliente logada não vê");
  const comChave = await fetch(`${ORIGIN}/api/personalizacao/fotos/${id}?chave=${chave}`);
  assert.equal(comChave.status, 200);
  assert.equal(comChave.headers.get("content-type"), "image/webp");
  assert.match(comChave.headers.get("cache-control"), /no-store/);
  assert.equal((await fetch(`${ORIGIN}/api/personalizacao/fotos/${id}`, { headers: { Cookie: adminCookie } })).status, 200, "o painel vê");
});

test("o preço vem do servidor: variação, adicional e faixa de quantidade", async () => {
  const caneca = { id: 2, qty: 2, escolhas: { variacoes: { cor: "rosa" }, adicionais: ["tampa-bambu"], personalizacao: { nome: "Ana", letra: "cursiva", arte: "nome" } }, price: 1 };
  const torre = { id: TORRE, qty: 1, escolhas: { variacoes: { modelo: "com-4-xicaras" }, adicionais: [], personalizacao: { arte: "nome" } } };
  const botton = { id: BOTTON, qty: 12, escolhas: { variacoes: {}, adicionais: [], personalizacao: {} } };
  const res = await postar("/api/carrinho/conferir", { items: [caneca, torre, botton] });
  const { itens } = await res.json();
  assert.equal(itens[0].preco, 63, "45 + tampa de bambu 18; o preço mandado pelo navegador é ignorado");
  assert.equal(itens[1].preco, 160, "torre com 4 = 95 + 65");
  assert.equal(itens[2].preco, catalogo.PRODUCTS[BOTTON].config.faixas[0].preco, "acima de 10 bottons vale o preço de atacado");
});

test("personalização inválida é recusada pelo servidor", async () => {
  const longo = { id: 2, qty: 1, escolhas: { variacoes: { cor: "rosa" }, adicionais: [], personalizacao: { nome: "x".repeat(30) } } };
  const esgotada = { id: SILICONE, qty: 1, escolhas: { variacoes: { modelo: "coracao" }, adicionais: [], personalizacao: {} } };
  const corInventada = { id: 2, qty: 1, escolhas: { variacoes: { cor: "dourado-neon" }, adicionais: [], personalizacao: {} } };
  const fotoForjada = { id: 2, qty: 1, escolhas: { variacoes: { cor: "rosa" }, adicionais: [], personalizacao: { arte: "fotos", fotos: [{ id: crypto.randomUUID(), chave: "a".repeat(32), x: 0, y: 0, zoom: 1 }] } } };
  const quantidade = { id: BOTTON, qty: 1, escolhas: { variacoes: {}, adicionais: [], personalizacao: {} } };
  const { itens } = await (await postar("/api/carrinho/conferir", { items: [longo, esgotada, corInventada, fotoForjada, quantidade] })).json();
  assert.match(itens[0].erro, /até 20 caracteres/);
  assert.match(itens[1].erro, /esgotado/);
  assert.match(itens[2].erro, /Escolha/);
  assert.match(itens[3].erro, /expirou/);
  assert.match(itens[4].erro, /Quantidade entre 3/);
});

test("o painel gera o arquivo para Corel/Illustrator no tamanho real, com texto em curvas e a foto embutida", async () => {
  const { id, chave } = await (await enviarFoto(await fotoDeTeste())).json();
  const produto = catalogo.effectiveProduct(2, catalogo.getProductOverridesMap());
  const ref = crypto.randomUUID();
  db.createOrder({
    externalReference: ref, userId: null, status: "pago",
    items: [{
      id: 2, qty: 1, price: 45, nome: produto.name, config: produto.config, resumo: [],
      escolhas: { variacoes: { cor: "rosa" }, adicionais: [], personalizacao: { nome: "Madrinha Lara", frase: "obrigada por tanto amor", letra: "cursiva", arte: "fotos", fotos: [{ id, chave, x: 0.2, y: -0.1, zoom: 1.5 }], aprovarWhatsApp: true } },
    }],
    address: { nome: "Cliente" }, shipping: { service_id: "retirada", name: "Retirada", price: 0 },
    subtotal: 45, shippingPrice: 0, total: 40.5,
  });
  db.vincularFotosAoPedido([id], ref);

  const semLogin = await fetch(`${ORIGIN}/api/admin/pedidos/${ref}/itens/0/producao.svg`);
  assert.equal(semLogin.status, 401);
  const daCliente = await fetch(`${ORIGIN}/api/admin/pedidos/${ref}/itens/0/producao.svg`, { headers: { Cookie: clienteCookie } });
  assert.notEqual(daCliente.status, 200);

  const res = await fetch(`${ORIGIN}/api/admin/pedidos/${ref}/itens/0/producao.svg`, { headers: { Cookie: adminCookie } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-disposition"), /attachment; filename="arte-.*-item1-caneca-alca-e-dentro-colorida\.svg"/);
  const svg = await res.text();
  assert.match(svg, /width="200mm" height="95mm" viewBox="0 0 200 95"/, "gabarito de caneca 325 ml em milímetros");
  assert.doesNotMatch(svg, /<text\b/, "nenhum texto vivo: tudo em curvas, abre sem as fontes instaladas");
  assert.ok((svg.match(/<path /g) || []).length > 20, "as letras viraram caminhos");
  assert.match(svg, /<g id="Frente"/);
  assert.match(svg, /<g id="Verso"/);
  assert.match(svg, /<g id="Guias"/);
  assert.match(svg, /xlink:href="data:image\/jpeg;base64,/, "a foto da cliente vai embutida");

  const previa = await fetch(`${ORIGIN}/api/admin/pedidos/${ref}/itens/0/previa.svg?lado=frente`, { headers: { Cookie: adminCookie } });
  assert.equal(previa.status, 200);
  assert.match(await previa.text(), /@font-face/);
  const arte = await fetch(`${ORIGIN}/api/admin/pedidos/${ref}/itens/0/arte.svg?lado=verso`, { headers: { Cookie: adminCookie } });
  assert.equal(arte.status, 200);
  assert.match(await arte.text(), /obrigada por/);
});

test("fotos órfãs somem depois de 48 horas e as do pedido entregue depois do prazo", () => {
  const antes = db.apagarFotosPersonalizacaoVencidas(Date.now());
  assert.equal(typeof antes, "number");
  const apagadas = db.apagarFotosPersonalizacaoVencidas(Date.now() + 3 * 86400000);
  assert.ok(apagadas >= 1, "as fotos sem pedido somem depois de 2 dias");
});
