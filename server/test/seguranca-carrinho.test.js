const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const sharp = require("sharp");

const PORT = 39651;
const ORIGIN = `http://localhost:${PORT}`;
const TMP_DB = path.join(os.tmpdir(), `plc-carrinho-${process.pid}-${Date.now()}.db`);

process.env.DB_PATH = TMP_DB;
const db = require("../lib/db.js");
const { normalizarEndereco, problemaNoEndereco } = require("../lib/endereco.js");
const { criarFila } = require("../lib/fila-de-imagens.js");

let child;

before(async () => {
  child = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server.js"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, DB_PATH: TMP_DB, PORT: String(PORT), CLIENT_ORIGIN: ORIGIN, NODE_ENV: "test", MP_ACCESS_TOKEN: "TEST-fake" },
    stdio: "ignore",
  });
  const limite = Date.now() + 15000;
  for(;;){
    try { if((await fetch(ORIGIN + "/")).ok) break; } catch {}
    if(Date.now() > limite) throw new Error("servidor de teste não subiu");
    await new Promise(r => setTimeout(r, 200));
  }
});

after(() => {
  if(child) child.kill();
  for(const s of ["", "-wal", "-shm"]){ try { fs.unlinkSync(TMP_DB + s); } catch {} }
});

const usuarios = new Map();
function usuario(n){
  if(!usuarios.has(n)) usuarios.set(n, db.createUser({ name: `Cliente ${n}`, email: `c${n}-${Date.now()}@test.com`, passwordHash: "x", cpf: null }).id);
  return usuarios.get(n);
}

function pedido(ref, extra = {}){
  return db.createOrder({
    externalReference: ref, userId: null, status: "pendente",
    items: [{ id: 1, qty: 1 }], address: { nome: "Ana" }, shipping: { price: 0 },
    subtotal: 50, total: 45, shippingPrice: 0, couponCode: "BEMVINDA10", customerPhone: "61999990000", ...extra,
  });
}

test("cupom de uso único: duas compras ao mesmo tempo, só uma leva", () => {
  const a = crypto.randomUUID();
  const b = crypto.randomUUID();
  assert.equal(db.reservarCupom({ code: "BEMVINDA10", userId: 77, phone: "61999990000", pedido: a }), true);
  assert.equal(db.reservarCupom({ code: "BEMVINDA10", userId: 77, phone: "61999990000", pedido: b }), false);
  assert.equal(db.reservarCupom({ code: "BEMVINDA10", userId: 99, phone: "61999990000", pedido: b }), false, "o mesmo telefone em outra conta também não leva");
  assert.equal(db.reservarCupom({ code: "BEMVINDA10", userId: 77, phone: "61999990000", pedido: a }), true, "o mesmo pedido pode tentar pagar de novo");
  db.liberarCupomDoPedido(a);
  assert.equal(db.reservarCupom({ code: "BEMVINDA10", userId: 77, phone: "61999990000", pedido: b }), true, "liberado quando o pagamento cai");
  db.liberarCupomDoPedido(b);
});

test("reserva de pedido pago não se perde; de pedido cancelado, sim", () => {
  const pago = crypto.randomUUID();
  pedido(pago, { status: "pago", userId: usuario(78), customerPhone: null });
  assert.equal(db.reservarCupom({ code: "BEMVINDA10", userId: usuario(78), phone: null, pedido: pago }), true);
  assert.equal(db.reservarCupom({ code: "BEMVINDA10", userId: usuario(78), phone: null, pedido: crypto.randomUUID() }), false);
  const cancelado = crypto.randomUUID();
  pedido(cancelado, { status: "cancelado", userId: usuario(79), customerPhone: null });
  assert.equal(db.reservarCupom({ code: "BEMVINDA10", userId: usuario(79), phone: null, pedido: cancelado }), true);
  assert.equal(db.reservarCupom({ code: "BEMVINDA10", userId: usuario(79), phone: null, pedido: crypto.randomUUID() }), true, "pedido cancelado devolve o cupom");
});

test("pedido em análise conta como cupom usado", () => {
  pedido(crypto.randomUUID(), { status: "em análise", userId: usuario(80), customerPhone: "61988887777" });
  assert.equal(db.hasUsedCoupon({ code: "BEMVINDA10", userId: usuario(80), phone: null }), true);
});

test("endereço: só campos conhecidos, sem quebra de linha e com tamanho máximo", () => {
  const e = normalizarEndereco({
    nome: "Ana\nTotal: R$ 0,00\r\nEntrega: Retirada", rua: "x".repeat(5000), uf: "df",
    telefone: "(61) 99999-0000", cep: "70.000-000", extra: { malicioso: true }, numero: ["1"],
  });
  assert.equal(e.nome, "Ana Total: R$ 0,00 Entrega: Retirada");
  assert.equal(e.rua.length, 120);
  assert.equal(e.uf, "DF");
  assert.equal(e.telefone, "61999990000");
  assert.equal(e.cep, "70000000");
  assert.equal(e.numero, "");
  assert.equal("extra" in e, false);
  assert.equal(problemaNoEndereco({ ...e, uf: "XX" }), "Confira o estado (UF) do endereço.");
  assert.equal(normalizarEndereco("texto"), null);
  assert.equal(normalizarEndereco([1, 2]), null);
});

test("a fila de imagens não deixa processar mais que o limite ao mesmo tempo", async () => {
  const fila = criarFila({ simultaneas: 2, esperando: 1 });
  let maximo = 0;
  let agora = 0;
  const tarefa = () => fila.comVaga(async () => {
    agora++;
    maximo = Math.max(maximo, agora);
    await new Promise(r => setTimeout(r, 30));
    agora--;
  });
  const resultados = await Promise.allSettled([tarefa(), tarefa(), tarefa(), tarefa()]);
  assert.equal(maximo, 2);
  assert.equal(resultados.filter(r => r.status === "rejected").length, 1, "quando a fila enche, recusa em vez de travar o servidor");
});

async function enviarFoto(buffer, nome){
  const form = new FormData();
  form.append("foto", new Blob([buffer]), nome);
  return fetch(`${ORIGIN}/api/personalizacao/fotos`, { method: "POST", headers: { Origin: ORIGIN }, body: form });
}

test("foto TIFF ou gigante é recusada antes de ocupar memória", async () => {
  const tiff = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#f00" } }).tiff().toBuffer();
  assert.equal((await enviarFoto(tiff, "a.tiff")).status, 415);
  const gigante = await sharp({ create: { width: 9000, height: 9000, channels: 3, background: "#000" } }).png({ compressionLevel: 9 }).toBuffer();
  assert.equal((await enviarFoto(gigante, "b.png")).status, 415);
  const boa = await sharp({ create: { width: 40, height: 40, channels: 3, background: "#0f0" } }).jpeg().toBuffer();
  assert.equal((await enviarFoto(boa, "c.jpg")).status, 201);
});
