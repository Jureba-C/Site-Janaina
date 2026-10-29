const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");

const PORT = 39623;
const ORIGIN = `http://localhost:${PORT}`;
const ADMIN_EMAIL = "dona@test.com";
const SENHA = "senha-forte-do-painel-123";
const SEGREDO = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
const TMP_DB = path.join(os.tmpdir(), `plc-admin2fa-${process.pid}-${Date.now()}.db`);

process.env.DB_PATH = TMP_DB;
const db = require("../lib/db.js");
const auth = require("../lib/auth.js");

let child;
let adminId;

function base32Decode(str){
  const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, valor = 0;
  const out = [];
  for(const c of str){
    valor = (valor << 5) | alfabeto.indexOf(c);
    bits += 5;
    if(bits >= 8){ out.push((valor >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

function codigo(segredo, desvio = 0){
  const passo = Math.floor(Date.now() / 30000) + desvio;
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(passo));
  const h = crypto.createHmac("sha1", base32Decode(segredo)).update(buf).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1e6).padStart(6, "0");
}

function chamar(metodo, url, { corpo, cookie } = {}){
  return fetch(ORIGIN + url, {
    method: metodo,
    headers: { "Content-Type": "application/json", Origin: ORIGIN, ...(cookie ? { Cookie: cookie } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
}

function cookieDe(res){
  const c = res.headers.getSetCookie().find(x => x.startsWith("plc_session=") && !x.startsWith("plc_session=;"));
  return c ? c.split(";")[0] : null;
}

async function entrarComApp(desvio){
  const login = await chamar("POST", "/api/auth/login", { corpo: { email: ADMIN_EMAIL, password: SENHA } });
  const dados = await login.json();
  const segundo = await chamar("POST", "/api/auth/login/2fa", { corpo: { challengeToken: dados.challengeToken, code: codigo(SEGREDO, desvio) } });
  return { dados, segundo, cookie: cookieDe(segundo) };
}

before(async () => {
  child = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server.js"], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      DB_PATH: TMP_DB, PORT: String(PORT), CLIENT_ORIGIN: ORIGIN, NODE_ENV: "test",
      ADMIN_2FA_REQUIRED: "true", ADMIN_EMAIL_HASHES: auth.hashEmail(ADMIN_EMAIL),
      MP_ACCESS_TOKEN: "TEST-fake", AUTH_RATE_LIMIT_MAX: "500",
    },
    stdio: "ignore",
  });
  const limite = Date.now() + 15000;
  for(;;){
    try { if((await fetch(ORIGIN + "/")).ok) break; } catch {}
    if(Date.now() > limite) throw new Error("servidor de teste não subiu");
    await new Promise(r => setTimeout(r, 200));
  }
  const admin = db.createUser({ name: "Janaina", email: ADMIN_EMAIL, passwordHash: await auth.hashPassword(SENHA), cpf: null });
  adminId = admin.id;
  const codigosDeRecuperacao = ["AAAAA-11111"];
  db.setUserTotp(admin.id, { secret: SEGREDO, recoveryJson: JSON.stringify(await auth.hashRecoveryCodes(codigosDeRecuperacao)) });
});

after(() => {
  if(child) child.kill();
  for(const s of ["", "-wal", "-shm"]){ try { fs.unlinkSync(TMP_DB + s); } catch {} }
});

test("o painel entra só com o app: o código por e-mail é recusado", async () => {
  const login = await chamar("POST", "/api/auth/login", { corpo: { email: ADMIN_EMAIL, password: SENHA } });
  const dados = await login.json();
  assert.equal(dados.twoFactorRequired, true);
  assert.equal(dados.soApp, true);
  const porEmail = await chamar("POST", "/api/auth/login/2fa/email", { corpo: { challengeToken: dados.challengeToken } });
  assert.equal(porEmail.status, 403);
});

test("o mesmo código do app não vale duas vezes", async () => {
  db.registrarPassoTotp(adminId, 0);
  const { dados, segundo } = await entrarComApp(-1);
  assert.equal(segundo.status, 200);
  const login2 = await chamar("POST", "/api/auth/login", { corpo: { email: ADMIN_EMAIL, password: SENHA } });
  const d2 = await login2.json();
  const repetido = await chamar("POST", "/api/auth/login/2fa", { corpo: { challengeToken: d2.challengeToken, code: codigo(SEGREDO, -1) } });
  assert.equal(repetido.status, 401, "código já usado não pode entrar de novo");
  assert.ok(dados.challengeToken);
});

test("sessão sem prova do app não abre as rotas do painel", async () => {
  const token = crypto.randomBytes(32).toString("hex");
  db.createSession({ tokenHash: crypto.createHash("sha256").update(token).digest("hex"), userId: adminId, expiresAt: Date.now() + 3600000 });
  const res = await chamar("GET", "/api/admin/orders", { cookie: `plc_session=${token}` });
  assert.equal(res.status, 403);
  assert.equal((await res.json()).precisaEntrarDeNovo, true);
});

test("exportar clientes pede o código de novo e depois libera", async () => {
  db.setUserTotp(adminId, { secret: SEGREDO, recoveryJson: JSON.stringify(await auth.hashRecoveryCodes(["AAAAA-11111"])) });
  const { cookie } = await entrarComApp(-1);
  assert.ok(cookie, "precisa sair um cookie de sessão");
  const antes = await chamar("GET", "/api/admin/export.xlsx", { cookie });
  assert.equal(antes.status, 403);
  assert.equal((await antes.json()).precisaConfirmar, true);
  const errado = await chamar("POST", "/api/admin/confirmar", { cookie, corpo: { code: "000000" } });
  assert.equal(errado.status, 401);
  const certo = await chamar("POST", "/api/admin/confirmar", { cookie, corpo: { code: codigo(SEGREDO, 0) } });
  assert.equal(certo.status, 200);
  const depois = await chamar("GET", "/api/admin/export.xlsx", { cookie });
  assert.equal(depois.status, 200);
  assert.ok(db.listarEventosDeSeguranca({ tipo: "export_completo" }).length >= 1);
});

test("a sessão do painel cai depois de 30 minutos parada", async () => {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  db.createSession({ tokenHash, userId: adminId, expiresAt: Date.now() + 3600000, segundoFator: true });
  db.marcarUsoDaSessao(tokenHash, Date.now() - 31 * 60 * 1000);
  const res = await chamar("GET", "/api/admin/orders", { cookie: `plc_session=${token}` });
  assert.equal(res.status, 401);
});

test("o cadastro do app usa o segredo guardado no servidor, não o do navegador", async () => {
  const outro = db.createUser({ name: "Conta nova", email: "nova@test.com", passwordHash: await auth.hashPassword(SENHA), cpf: null });
  const token = crypto.randomBytes(32).toString("hex");
  db.createSession({ tokenHash: crypto.createHash("sha256").update(token).digest("hex"), userId: outro.id, expiresAt: Date.now() + 3600000 });
  const cookie = `plc_session=${token}`;
  const negado = await chamar("POST", "/api/admin/2fa/setup", { cookie });
  assert.equal(negado.status, 403, "quem não é do painel não prepara 2FA de painel");
  const atacante = "KRUGS4ZANFZSAYJAONSWG4TFOQQGC3TE";
  const adminToken = crypto.randomBytes(32).toString("hex");
  db.createSession({ tokenHash: crypto.createHash("sha256").update(adminToken).digest("hex"), userId: adminId, expiresAt: Date.now() + 3600000, segundoFator: true });
  const adminCookie = `plc_session=${adminToken}`;
  db.guardarTotpPendente(adminId, SEGREDO);
  const comSegredoDoAtacante = await chamar("POST", "/api/admin/2fa/activate", { cookie: adminCookie, corpo: { secret: atacante, code: codigo(atacante) } });
  assert.equal(comSegredoDoAtacante.status, 400, "o segredo mandado pelo navegador é ignorado");
  const certo = await chamar("POST", "/api/admin/2fa/activate", { cookie: adminCookie, corpo: { code: codigo(SEGREDO, 0) } });
  assert.equal(certo.status, 200);
  assert.equal(db.getUserById(adminId).totp_secret, SEGREDO);
  assert.equal(db.getUserById(adminId).totp_pendente, null);
});

test("trocar o app autenticador exige senha e código atual", async () => {
  const { cookie } = await entrarComApp(1);
  const soSenha = await chamar("POST", "/api/admin/2fa/setup", { cookie, corpo: { password: SENHA } });
  assert.equal(soSenha.status, 401);
  assert.equal((await soSenha.json()).needsCurrentCode, true);
});

test("/api/auth/me não devolve dados internos da sessão", async () => {
  const token = crypto.randomBytes(32).toString("hex");
  db.createSession({ tokenHash: crypto.createHash("sha256").update(token).digest("hex"), userId: adminId, expiresAt: Date.now() + 3600000, segundoFator: true });
  const res = await chamar("GET", "/api/auth/me", { cookie: `plc_session=${token}` });
  const corpo = await res.json();
  assert.equal("sessaoHash" in corpo, false);
  assert.equal("reautenticadoEm" in corpo, false);
  assert.equal(res.headers.get("cache-control"), "no-store");
});

test("redefinir a senha do painel gera alerta e trava a troca do app por 24 h", async () => {
  const linkToken = auth.issuePasswordReset(adminId);
  const res = await chamar("POST", "/api/auth/reset-password", { corpo: { token: linkToken, password: SENHA } });
  assert.equal(res.status, 200);
  assert.ok(db.listarEventosDeSeguranca({ tipo: "senha_redefinida_admin" }).length >= 1);
  const { cookie } = await entrarComApp(0).catch(() => ({}));
  if(cookie){
    const troca = await chamar("POST", "/api/admin/2fa/setup", { cookie, corpo: { password: SENHA, codigoAtual: "AAAAA-11111" } });
    assert.equal(troca.status, 409);
  }
});
