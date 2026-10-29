const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");

const PORT = 39637;
const ORIGIN = `http://localhost:${PORT}`;
const CRON = "segredo-do-cron-de-teste";
const TMP_DB = path.join(os.tmpdir(), `plc-contas-${process.pid}-${Date.now()}.db`);

process.env.DB_PATH = TMP_DB;
const db = require("../lib/db.js");
const auth = require("../lib/auth.js");
const { senhaAceitavel } = require("../lib/senhas.js");

let child;

function chamar(metodo, url, { corpo, cookie, cabecalhos = {} } = {}){
  return fetch(ORIGIN + url, {
    method: metodo,
    headers: { "Content-Type": "application/json", Origin: ORIGIN, ...(cookie ? { Cookie: cookie } : {}), ...cabecalhos },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
}

function sessao(userId, agente){
  const token = crypto.randomBytes(32).toString("hex");
  db.createSession({ tokenHash: crypto.createHash("sha256").update(token).digest("hex"), userId, expiresAt: Date.now() + 3600000, agente });
  return `plc_session=${token}`;
}

before(async () => {
  child = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server.js"], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      DB_PATH: TMP_DB, PORT: String(PORT), CLIENT_ORIGIN: ORIGIN, NODE_ENV: "test",
      MP_ACCESS_TOKEN: "TEST-fake", CRON_SECRET: CRON, AUTH_RATE_LIMIT_MAX: "1000",
      TRUST_PROXY: "local",
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
  for(const s of ["", "-wal", "-shm"]){ try { fs.unlinkSync(TMP_DB + s); } catch {} }
});

test("senha comum, curta, sequência ou com o e-mail é recusada", () => {
  assert.match(senhaAceitavel("12345678"), /pelo menos 10/);
  assert.match(senhaAceitavel("1234567890"), /comum|Sequências/);
  assert.match(senhaAceitavel("Senha12345"), /comum/);
  assert.match(senhaAceitavel("qwertyuiop"), /comum|Sequências/);
  assert.match(senhaAceitavel("mariasilva2026", { email: "mariasilva@gmail.com" }), /e-mail/);
  assert.match(senhaAceitavel("Rosa#Cane77", { admin: true }), /pelo menos 12/);
  assert.equal(senhaAceitavel("Canecas#Rosa77"), null);
  assert.equal(senhaAceitavel("Canecas#Rosa-de-Ipe7", { admin: true }), null);
});

test("cadastro com senha fraca é recusado pelo servidor", async () => {
  const res = await chamar("POST", "/api/auth/register", { corpo: { name: "Ana Souza", email: "ana-fraca@test.com", password: "1234567890", cpf: "39053344705", consent: true } });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /comum|Sequências/);
});

test("muitas senhas erradas na mesma conta, de IPs diferentes, deixam a conta lenta", async () => {
  const email = "alvo@test.com";
  db.createUser({ name: "Alvo", email, passwordHash: await auth.hashPassword("Canecas#Rosa77"), cpf: null });
  let ultima;
  for(let i = 0; i < 22; i++){
    ultima = await chamar("POST", "/api/auth/login", {
      corpo: { email, password: `errada-${i}` },
      cabecalhos: { "X-Forwarded-For": `10.0.${i}.1` },
    });
  }
  assert.equal(ultima.status, 429, "a conta fica lenta mesmo trocando de IP");
  assert.ok(Number(ultima.headers.get("retry-after")) > 0);
  assert.ok(db.listarEventosDeSeguranca({ tipo: "conta_lenta" }).length >= 1);
});

test("Minha conta lista os aparelhos e desconecta um sem derrubar este", async () => {
  const user = db.createUser({ name: "Bia", email: "bia@test.com", passwordHash: "x", cpf: null });
  const daqui = sessao(user.id, "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15");
  sessao(user.id, "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36");
  const lista = await (await chamar("GET", "/api/auth/acessos", { cookie: daqui })).json();
  assert.equal(lista.acessos.length, 2);
  const atual = lista.acessos.find(a => a.atual);
  const outro = lista.acessos.find(a => !a.atual);
  assert.equal(atual.aparelho, "Safari no Mac");
  assert.equal(outro.aparelho, "Chrome no Android");
  assert.equal(outro.celular, true);
  assert.equal(JSON.stringify(lista).includes("token"), false, "não expõe o identificador da sessão");
  assert.equal((await chamar("DELETE", `/api/auth/acessos/${atual.id}`, { cookie: daqui })).status, 409);
  assert.equal((await chamar("DELETE", `/api/auth/acessos/${outro.id}`, { cookie: daqui })).status, 200);
  const depois = await (await chamar("GET", "/api/auth/acessos", { cookie: daqui })).json();
  assert.equal(depois.acessos.length, 1);
});

test("respostas com dados da conta não ficam em cache", async () => {
  const user = db.createUser({ name: "Cris", email: "cris@test.com", passwordHash: "x", cpf: null });
  const cookie = sessao(user.id);
  for(const url of ["/api/auth/me", "/api/auth/perfil", "/api/orders", "/api/auth/address"]){
    const res = await chamar("GET", url, { cookie });
    assert.match(res.headers.get("cache-control") || "", /no-store/, url);
  }
});

test("a rotina automática aceita a chave no cabeçalho e marca a da URL como antiga", async () => {
  const errada = await chamar("POST", "/api/interno/tarefas-periodicas", { cabecalhos: { Authorization: "Bearer errada" } });
  assert.equal(errada.status, 401);
  const certa = await chamar("POST", "/api/interno/tarefas-periodicas", { cabecalhos: { Authorization: `Bearer ${CRON}` } });
  assert.ok([200, 409].includes(certa.status));
  await new Promise(r => setTimeout(r, 300));
  const pelaUrl = await fetch(`${ORIGIN}/api/interno/tarefas-periodicas?token=${CRON}`);
  assert.ok([200, 409].includes(pelaUrl.status));
  if(pelaUrl.status === 200) assert.equal(pelaUrl.headers.get("deprecation"), "true");
});
