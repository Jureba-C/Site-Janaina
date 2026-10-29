const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");

const PORT = 39667;
const ORIGIN = `http://localhost:${PORT}`;
const TMP_DB = path.join(os.tmpdir(), `plc-eventos-${process.pid}-${Date.now()}.db`);

process.env.DB_PATH = TMP_DB;
process.env.OWNER_EMAIL = "dona@test.com";
const db = require("../lib/db.js");
const eventos = require("../lib/eventos-seguranca.js");

let child;

before(async () => {
  child = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server.js"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, DB_PATH: TMP_DB, PORT: String(PORT), CLIENT_ORIGIN: ORIGIN, NODE_ENV: "test", MP_ACCESS_TOKEN: "TEST-fake", ADMIN_2FA_REQUIRED: "false" },
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

function contarAlertas(){
  const { DatabaseSync } = require("node:sqlite");
  const leitura = new DatabaseSync(TMP_DB);
  try { return leitura.prepare("SELECT COUNT(*) AS n FROM email_outbox WHERE kind = 'alerta_seguranca'").get().n; } finally { leitura.close(); }
}

test("todo evento que avisa tem título, resumo e orientação", () => {
  for(const [tipo, def] of Object.entries(eventos.TIPOS)){
    assert.ok(["info", "aviso", "critico"].includes(def.gravidade), tipo);
    if(def.alertar){
      assert.ok(def.titulo && def.resumo && def.orientacao, `${tipo} sem texto de alerta`);
    }
  }
});

test("detalhes do evento não guardam quebras de linha, chaves estranhas nem textos longos", () => {
  const limpo = JSON.parse(eventos.limparDetalhes({ motivo: "a\nb\r\tc", "chave estranha": 1, longo: "x".repeat(500), numero: 5, nulo: null }));
  assert.equal(limpo.motivo, "a b c");
  assert.equal("chave estranha" in limpo, false);
  assert.equal(limpo.longo.length, 200);
  assert.equal(limpo.numero, 5);
  assert.equal("nulo" in limpo, false);
});

test("alerta grave vai uma vez só por janela, mesmo repetindo o evento", () => {
  const antes = contarAlertas();
  eventos.registrar("pagamento_duplicado", { pedido: "pedido-teste-1", detalhes: { pagamento: "123" } });
  eventos.registrar("pagamento_duplicado", { pedido: "pedido-teste-1", detalhes: { pagamento: "123" } });
  assert.equal(contarAlertas() - antes, 1);
  assert.equal(db.listarEventosDeSeguranca({ tipo: "pagamento_duplicado" }).length, 2, "os dois ficam registrados");
});

test("alerta com limite só sai depois de vários eventos", () => {
  const antes = contarAlertas();
  for(let i = 0; i < 4; i++) eventos.registrar("webhook_assinatura_invalida", { detalhes: { motivo: "assinatura" } });
  assert.equal(contarAlertas(), antes, "4 tentativas ainda não avisam");
  eventos.registrar("webhook_assinatura_invalida", { detalhes: { motivo: "assinatura" } });
  assert.equal(contarAlertas(), antes + 1);
});

test("a rota de saúde responde sem cache e a lista de eventos é só do painel", async () => {
  const saude = await fetch(`${ORIGIN}/api/saude`);
  assert.equal(saude.status, 200);
  assert.deepEqual(await saude.json(), { ok: true });
  assert.equal(saude.headers.get("cache-control"), "no-store");
  assert.equal((await fetch(`${ORIGIN}/api/admin/eventos`)).status, 401);
  const user = db.createUser({ name: "Cliente", email: "cliente-eventos@test.com", passwordHash: "x", cpf: null });
  const token = crypto.randomBytes(32).toString("hex");
  db.createSession({ tokenHash: crypto.createHash("sha256").update(token).digest("hex"), userId: user.id, expiresAt: Date.now() + 60000 });
  assert.equal((await fetch(`${ORIGIN}/api/admin/eventos`, { headers: { Cookie: `plc_session=${token}` } })).status, 403);
});
