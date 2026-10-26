const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const { spawn } = require("node:child_process");

const PORT = 39595;
const ORIGIN = `http://localhost:${PORT}`;
const SEGREDO = "segredo-de-teste-com-tamanho-razoavel";
const TMP_DB = path.join(os.tmpdir(), `plc-cron-${process.pid}-${Date.now()}.db`);

process.env.DB_PATH = TMP_DB;
const db = require("../lib/db.js");

let child;

function limpar(){
  for(const s of ["", "-wal", "-shm"]) { try { fs.unlinkSync(TMP_DB + s); } catch {} }
}

before(async () => {
  child = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server.js"], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      DB_PATH: TMP_DB, PORT: String(PORT), CLIENT_ORIGIN: ORIGIN,
      CRON_SECRET: SEGREDO,
      ADMIN_2FA_REQUIRED: "false", MP_ACCESS_TOKEN: "TEST-fake", NODE_ENV: "test",
    },
    stdio: "ignore",
  });
  const limite = Date.now() + 10000;
  for(;;){
    try { if((await fetch(ORIGIN + "/")).ok) break; } catch {}
    if(Date.now() > limite) throw new Error("servidor de teste não subiu");
    await new Promise(r => setTimeout(r, 200));
  }
});

after(() => {
  if(child) child.kill();
  limpar();
});

test("sem token não roda", async () => {
  const res = await fetch(`${ORIGIN}/api/interno/tarefas-periodicas`);
  assert.equal(res.status, 401);
  assert.equal(db.lerEstado("tarefas_periodicas_em"), null, "não pode ter rodado");
});

test("token errado não roda, inclusive com tamanho diferente", async () => {
  for(const token of ["chute", SEGREDO + "a", SEGREDO.slice(0, -1)]){
    const res = await fetch(`${ORIGIN}/api/interno/tarefas-periodicas?token=${encodeURIComponent(token)}`);
    assert.equal(res.status, 401, `token "${token}" não podia passar`);
  }
  assert.equal(db.lerEstado("tarefas_periodicas_em"), null);
});

test("token com acento do mesmo tamanho é 401, não 500", async () => {
  const comAcento = SEGREDO.slice(0, -1) + "é";
  assert.equal(comAcento.length, SEGREDO.length, "o teste só vale se o length bater");
  const res = await fetch(`${ORIGIN}/api/interno/tarefas-periodicas?token=${encodeURIComponent(comAcento)}`);
  assert.equal(res.status, 401);
});

test("com o token certo roda e registra a hora da rodada", async () => {
  const res = await fetch(`${ORIGIN}/api/interno/tarefas-periodicas?token=${encodeURIComponent(SEGREDO)}`);
  assert.equal(res.status, 200);
  const corpo = await res.json();
  assert.equal(corpo.ok, true);
  const limite = Date.now() + 5000;
  while(!db.lerEstado("tarefas_periodicas_em") && Date.now() < limite){
    await new Promise(r => setTimeout(r, 100));
  }

  const marca = db.lerEstado("tarefas_periodicas_em");
  assert.ok(marca?.valor, "o painel depende desta marca para avisar que o cron morreu");
  assert.ok(Date.now() - new Date(marca.valor).getTime() < 60_000, "a marca é desta rodada");
});

test("rodada em andamento recusa a próxima, em vez de rodar duas vezes", async () => {
  db.tentarTravarRodada("tarefas_periodicas_rodando");
  const res = await fetch(`${ORIGIN}/api/interno/tarefas-periodicas?token=${encodeURIComponent(SEGREDO)}`);
  assert.equal(res.status, 409);
  db.destravarRodada("tarefas_periodicas_rodando");
});
