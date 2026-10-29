const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { DatabaseSync } = require("node:sqlite");

const PORT = 39683;
const ORIGIN = `http://localhost:${PORT}`;
const TMP_DB = path.join(os.tmpdir(), `plc-privacidade-${process.pid}-${Date.now()}.db`);

process.env.DB_PATH = TMP_DB;
const db = require("../lib/db.js");
const { buildSheets } = require("../lib/export-spreadsheet.js");

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

function contar(sql, ...args){
  const leitura = new DatabaseSync(TMP_DB);
  try { return leitura.prepare(sql).get(...args).n; } finally { leitura.close(); }
}

test("excluir a conta tira o e-mail dos pedidos, a fila de e-mails e os lembretes", () => {
  const email = `sair-${Date.now()}@test.com`;
  const user = db.createUser({ name: "Saindo", email, passwordHash: "x", cpf: "39053344705" });
  const pago = crypto.randomUUID();
  const pendente = crypto.randomUUID();
  const base = { userId: user.id, items: [], address: { nome: "Saindo", telefone: "61999990000" }, shipping: {}, subtotal: 1, total: 1, shippingPrice: 0, customerEmail: email, customerPhone: "61999990000" };
  db.createOrder({ ...base, externalReference: pago, status: "pago" });
  db.createOrder({ ...base, externalReference: pendente, status: "pendente" });
  db.enqueueEmail({ kind: "carrinho_esquecido", toEmail: email, subject: "s", textBody: "t", htmlBody: "h", orderReference: `teste:${pendente}` });

  assert.equal(db.deleteUserAccount(user.id), true);

  assert.equal(contar("SELECT COUNT(*) AS n FROM orders WHERE customer_email = ?", email), 0);
  assert.equal(contar("SELECT COUNT(*) AS n FROM email_outbox WHERE to_email = ? AND sent_at IS NULL", email), 0);
  assert.equal(contar("SELECT COUNT(*) AS n FROM users WHERE email = ?", email), 0);
  assert.equal(db.pedidosParaLembrarCarrinho(Date.now() + 9 * 3600 * 1000).some(p => p.external_reference === pendente), false);
  const pedidoPago = db.getOrderByExternalReference(pago);
  assert.ok(pedidoPago, "o pedido pago fica pelo prazo fiscal");
  assert.equal(pedidoPago.customer_email, null);
  assert.equal(pedidoPago.customer_phone, null);
  assert.equal(JSON.parse(pedidoPago.address_json).anonimizado, true);
});

test("a planilha completa sai com CPF mascarado, a não ser que peçam o completo", () => {
  db.createUser({ name: "Com CPF", email: `cpf-${Date.now()}@test.com`, passwordHash: "x", cpf: "39053344705" });
  const usuarios = buildSheets().find(a => a.name === "Usuários");
  const linha = usuarios.rows.find(r => r.nome === "Com CPF");
  assert.equal(linha.cpf, "***.533.447-**");
  const completa = buildSheets({ cpfCompleto: true }).find(a => a.name === "Usuários").rows.find(r => r.nome === "Com CPF");
  assert.equal(completa.cpf, "39053344705");
});

test("o link de descadastro abre uma confirmação e só descadastra no clique", async () => {
  const email = `news-${Date.now()}@test.com`;
  db.addNewsletterSubscriber(email);
  const token = db.getOrCreateUnsubscribeToken(email);
  const abrir = await fetch(`${ORIGIN}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`);
  assert.equal(abrir.status, 200);
  assert.match(await abrir.text(), /Confirmar descadastro/);
  assert.equal(contar("SELECT COUNT(*) AS n FROM newsletter_subscribers WHERE email = ? AND unsubscribed_at IS NOT NULL", email), 0, "só abrir o link não descadastra");
  const clicar = await fetch(`${ORIGIN}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`, { method: "POST", headers: { Origin: ORIGIN } });
  assert.match(await clicar.text(), /Descadastro concluído/);
  assert.equal(contar("SELECT COUNT(*) AS n FROM newsletter_subscribers WHERE email = ? AND unsubscribed_at IS NOT NULL", email), 1);
});

test("o texto dos e-mails enviados é apagado depois de 30 dias", () => {
  const id = db.enqueueEmail({ kind: "teste_antigo", toEmail: "x@test.com", subject: "assunto", textBody: "endereço completo", htmlBody: "<p>endereço</p>", orderReference: `velho:${Date.now()}` });
  const escrita = new DatabaseSync(TMP_DB);
  escrita.prepare("UPDATE email_outbox SET sent_at = ? WHERE id = ?").run(Date.now() - 31 * 86400000, id);
  escrita.close();
  assert.ok(db.esvaziarEmailsEnviados(Date.now() - 30 * 86400000) >= 1);
  assert.equal(contar("SELECT COUNT(*) AS n FROM email_outbox WHERE id = ? AND text_body = '' AND html_body = ''", id), 1);
});

test("a política de privacidade traz bases legais, prazos de registro e direitos", () => {
  const politica = fs.readFileSync(path.join(__dirname, "..", "politica.html"), "utf8");
  for(const trecho of ["art. 7º", "art. 33", "art. 18", "Marco Civil", "Cloudflare", "ANPD", "portabilidade"]){
    assert.ok(politica.includes(trecho), `faltou "${trecho}" na política`);
  }
});
