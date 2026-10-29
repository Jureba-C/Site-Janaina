const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const K1 = crypto.randomBytes(32).toString("hex");
const K2 = crypto.randomBytes(32).toString("hex");
const TMP_DB = path.join(os.tmpdir(), `plc-cofre-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = TMP_DB;
process.env.CHAVES_DADOS = `k1:${K1}`;

const cofre = require("../lib/cofre.js");
const db = require("../lib/db.js");

after(() => {
  for(const s of ["", "-wal", "-shm"]){ try { fs.unlinkSync(TMP_DB + s); } catch {} }
});

function lerCru(sql, ...args){
  const conexao = new DatabaseSync(TMP_DB);
  try { return conexao.prepare(sql).get(...args); } finally { conexao.close(); }
}

test("cifra e decifra; texto antigo passa direto; etiqueta adulterada é recusada", () => {
  const c = cofre.cifrar("390.533.447-05");
  assert.match(c, /^cf1\.k1\./);
  assert.notEqual(cofre.cifrar("390.533.447-05"), c, "cada gravação usa um IV novo");
  assert.equal(cofre.decifrar(c), "390.533.447-05");
  assert.equal(cofre.decifrar("texto-antigo"), "texto-antigo");
  const partes = c.split(".");
  partes[4] = Buffer.from("0".repeat(16)).toString("base64url");
  assert.throws(() => cofre.decifrar(partes.join(".")));
  assert.equal(cofre.cifrar(null), null);
  assert.equal(cofre.cifrar(""), "");
});

test("CPF, endereço, telefone e segredo do 2FA ficam ilegíveis no arquivo do banco", () => {
  const user = db.createUser({ name: "Ana", email: `ana-${Date.now()}@t.com`, passwordHash: "x", cpf: "39053344705" });
  db.saveAddress(user.id, { nome: "Ana", rua: "Rua das Flores", cpf: "39053344705", telefone: "61999990000" });
  db.setUserTotp(user.id, { secret: "JBSWY3DPEHPK3PXP", recoveryJson: "[]" });
  const ref = crypto.randomUUID();
  db.createOrder({
    externalReference: ref, userId: user.id, items: [], address: { nome: "Ana", rua: "Rua das Flores", cpf: "39053344705" },
    shipping: {}, subtotal: 1, total: 1, shippingPrice: 0, customerPhone: "61999990000", couponCode: "X",
  });
  const cruUsuario = lerCru("SELECT cpf, saved_address_json, totp_secret FROM users WHERE id = ?", user.id);
  const cruPedido = lerCru("SELECT address_json, customer_phone, customer_phone_indice FROM orders WHERE external_reference = ?", ref);
  for(const valor of [...Object.values(cruUsuario), cruPedido.address_json, cruPedido.customer_phone]){
    assert.match(String(valor), /^cf1\.k1\./);
    assert.doesNotMatch(String(valor), /39053344705|61999990000|Flores|JBSWY3DP/);
  }
  assert.match(cruPedido.customer_phone_indice, /^ix1\.[0-9a-f]{40}$/);
  const lido = db.getUserById(user.id);
  assert.equal(lido.cpf, "39053344705", "o site continua lendo normalmente");
  assert.equal(lido.totp_secret, "JBSWY3DPEHPK3PXP");
  assert.equal(db.getSavedAddress(user.id).rua, "Rua das Flores");
  assert.equal(JSON.parse(db.getOrderByExternalReference(ref).address_json).rua, "Rua das Flores");
  assert.equal(db.hasUsedCoupon({ code: "X", userId: null, phone: "61999990000" }), true, "a busca pelo telefone continua funcionando pelo índice");
});

test("dados antigos em texto puro são criptografados na migração", () => {
  const conexao = new DatabaseSync(TMP_DB);
  conexao.prepare("INSERT INTO users (name, email, password_hash, cpf, created_at) VALUES (?, ?, ?, ?, ?)").run("Velha", `velha-${Date.now()}@t.com`, "x", "11144477735", Date.now());
  conexao.close();
  assert.ok(db.dadosAbertosQueSobraram() >= 1);
  db.regravarComChaveAtual();
  assert.equal(db.dadosAbertosQueSobraram(), 0);
  const cru = lerCru("SELECT cpf FROM users WHERE cpf LIKE 'cf1.%' AND name = 'Velha'");
  assert.ok(cru);
});

test("girar a chave: com a nova na frente, tudo é regravado e a antiga pode sair", () => {
  process.env.CHAVES_DADOS = `k2:${K2},k1:${K1}`;
  cofre.recarregar();
  assert.ok(db.dadosAbertosQueSobraram() > 0, "ainda há registros na chave k1");
  db.regravarComChaveAtual();
  assert.equal(db.dadosAbertosQueSobraram(), 0);
  process.env.CHAVES_DADOS = `k2:${K2}`;
  cofre.recarregar();
  const qualquer = lerCru("SELECT id FROM users WHERE cpf IS NOT NULL LIMIT 1");
  assert.match(String(db.getUserById(qualquer.id).cpf), /^\d{11}$/, "lido só com a chave nova");
  assert.equal(db.hasUsedCoupon({ code: "X", userId: null, phone: "61999990000" }), true, "índice refeito com a chave nova");
});

test("chave mal formatada é recusada com mensagem clara", () => {
  assert.throws(() => cofre.lerChaves({ CHAVES_DADOS: "k1:curta" }), /CHAVES_DADOS mal formatada/);
});
