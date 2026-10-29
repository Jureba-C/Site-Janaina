const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const http = require("node:http");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");

const PORT = 39611;
const ORIGIN = `http://localhost:${PORT}`;
const SEGREDO = "segredo-do-webhook-de-teste";
const TMP_DB = path.join(os.tmpdir(), `plc-webhook-${process.pid}-${Date.now()}.db`);

process.env.DB_PATH = TMP_DB;
const db = require("../lib/db.js");

const pagamentos = new Map();
let mp;
let child;

function assinar(id, requisicao){
  const ts = String(Math.floor(Date.now() / 1000));
  const v1 = crypto.createHmac("sha256", SEGREDO).update(`id:${id};request-id:${requisicao};ts:${ts};`).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

async function avisar(id, { assinatura } = {}){
  const requisicao = crypto.randomUUID();
  return fetch(`${ORIGIN}/api/webhook?type=payment&data.id=${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-request-id": requisicao,
      "x-signature": assinatura ?? assinar(id, requisicao),
    },
    body: JSON.stringify({ type: "payment", data: { id: String(id) } }),
  });
}

function pagamento(id, ref, status, extra = {}){
  pagamentos.set(String(id), {
    id: Number(id), external_reference: ref, status,
    transaction_amount: 50, currency_id: "BRL",
    payment_method_id: "pix", payment_type_id: "bank_transfer",
    ...extra,
  });
}

function pedido(ref, extra = {}){
  return db.createOrder({
    externalReference: ref, userId: null, status: "pendente",
    items: [{ id: 1, qty: 1 }], address: { nome: "Ana", cep: "70000000" }, shipping: { service_id: "retirada", price: 0 },
    subtotal: 50, total: 50, shippingPrice: 0, paymentMethod: "pix", customerEmail: "ana@test.com", ...extra,
  });
}

before(async () => {
  mp = http.createServer((req, res) => {
    const m = req.url.match(/^\/v1\/payments\/(\d+)$/);
    const p = m && pagamentos.get(m[1]);
    if(!p){ res.writeHead(404); return res.end("{}"); }
    if(req.method === "PUT"){ p.status = "cancelled"; }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(p));
  });
  await new Promise(r => mp.listen(0, "127.0.0.1", r));
  child = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server.js"], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      DB_PATH: TMP_DB, PORT: String(PORT), CLIENT_ORIGIN: ORIGIN, NODE_ENV: "test",
      MP_ACCESS_TOKEN: "TEST-fake", MP_WEBHOOK_SECRET: SEGREDO,
      MP_API_URL: `http://127.0.0.1:${mp.address().port}`,
      OWNER_EMAIL: "dona@test.com", ADMIN_2FA_REQUIRED: "false",
    },
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
  if(mp) mp.close();
  for(const s of ["", "-wal", "-shm"]){ try { fs.unlinkSync(TMP_DB + s); } catch {} }
});

function contarOutbox(ref, kind){
  const { DatabaseSync } = require("node:sqlite");
  const leitura = new DatabaseSync(TMP_DB);
  try {
    return leitura.prepare("SELECT COUNT(*) AS n FROM email_outbox WHERE order_reference = ? AND kind = ?").get(ref, kind).n;
  } finally {
    leitura.close();
  }
}

test("assinatura errada é recusada e nada muda", async () => {
  const ref = crypto.randomUUID();
  pedido(ref);
  pagamento(900, ref, "approved");
  const res = await avisar(900, { assinatura: "ts=1,v1=" + "0".repeat(64) });
  assert.equal(res.status, 401);
  assert.equal(db.getOrderByExternalReference(ref).status, "pendente");
});

test("Pix A pendente, Pix B pago, depois A vence: o pedido continua pago", async () => {
  const ref = crypto.randomUUID();
  pedido(ref);
  pagamento(1001, ref, "pending");
  assert.equal((await avisar(1001)).status, 200);
  pagamento(1002, ref, "approved");
  assert.equal((await avisar(1002)).status, 200);
  let p = db.getOrderByExternalReference(ref);
  assert.equal(p.status, "pago");
  assert.equal(p.pagamento_aprovado_id, "1002");
  assert.equal(p.fulfillment_status, "em_producao");
  pagamento(1001, ref, "cancelled");
  assert.equal((await avisar(1001)).status, 200);
  p = db.getOrderByExternalReference(ref);
  assert.equal(p.status, "pago", "o cancelamento do Pix velho não pode desfazer o pagamento");
  assert.equal(p.fulfillment_status, "em_producao");
});

test("aprovação repetida não repete e-mail nem volta a produção", async () => {
  const ref = crypto.randomUUID();
  pedido(ref);
  pagamento(1101, ref, "approved");
  await avisar(1101);
  db.marcarPronto(ref);
  await avisar(1101);
  await avisar(1101);
  await new Promise(r => setTimeout(r, 400));
  const p = db.getOrderByExternalReference(ref);
  assert.equal(p.status, "pago");
  assert.equal(p.fulfillment_status, "pronto", "a etapa de produção não pode voltar");
  assert.equal(contarOutbox(ref, "pedido_confirmado") <= 1, true);
  assert.equal(contarOutbox(ref, "aviso_venda") <= 1, true);
});

test("valor errado não marca como pago e gera alerta", async () => {
  const ref = crypto.randomUUID();
  pedido(ref);
  pagamento(1201, ref, "approved", { transaction_amount: 1 });
  await avisar(1201);
  assert.equal(db.getOrderByExternalReference(ref).status, "em análise");
  const eventos = db.listarEventosDeSeguranca({ tipo: "pagamento_divergente" });
  assert.ok(eventos.some(e => e.pedido === ref));
});

test("pedido do Pix pago com saldo da conta fica em análise", async () => {
  const ref = crypto.randomUUID();
  pedido(ref);
  pagamento(1301, ref, "approved", { payment_method_id: "account_money", payment_type_id: "account_money" });
  await avisar(1301);
  assert.equal(db.getOrderByExternalReference(ref).status, "em análise");
});

test("segundo pagamento aprovado num pedido pago avisa para devolver", async () => {
  const ref = crypto.randomUUID();
  pedido(ref);
  pagamento(1401, ref, "approved");
  await avisar(1401);
  pagamento(1402, ref, "approved");
  await avisar(1402);
  const p = db.getOrderByExternalReference(ref);
  assert.equal(p.pagamento_aprovado_id, "1401");
  assert.ok(db.listarEventosDeSeguranca({ tipo: "pagamento_duplicado" }).some(e => e.pedido === ref));
});

test("pedido que já recebeu pagamento não pode ser apagado", () => {
  const ref = crypto.randomUUID();
  pedido(ref);
  db.registrarPagamentoMp({ id: 1501, external_reference: ref, status: "approved", transaction_amount: 50 });
  assert.equal(db.pedidoJaFoiPago(db.getOrderByExternalReference(ref)), true);
  const livre = crypto.randomUUID();
  pedido(livre);
  assert.equal(db.pedidoJaFoiPago(db.getOrderByExternalReference(livre)), false);
  assert.equal(db.arquivarPedido(livre), true);
  assert.equal(db.listAllOrders().some(o => o.external_reference === livre), false, "arquivado some da lista do painel");
});

test("etiqueta só pode ser reservada uma vez", () => {
  const ref = crypto.randomUUID();
  pedido(ref);
  assert.equal(db.reservarEtiqueta(ref), true);
  assert.equal(db.reservarEtiqueta(ref), false);
  db.soltarEtiqueta(ref);
  assert.equal(db.reservarEtiqueta(ref), true);
});
