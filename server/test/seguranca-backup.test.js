const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const http = require("node:http");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const TMP_DB = path.join(os.tmpdir(), `plc-backup-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = TMP_DB;
const db = require("../lib/db.js");
const backup = require("../lib/backup-remoto.js");

const CHAVE = crypto.randomBytes(32).toString("hex");

after(() => {
  for(const s of ["", "-wal", "-shm"]){ try { fs.unlinkSync(TMP_DB + s); } catch {} }
});

test("a assinatura S3 bate com o exemplo oficial da AWS", () => {
  const r = backup.assinarS3({
    metodo: "GET",
    url: "https://examplebucket.s3.amazonaws.com/test.txt",
    cabecalhos: { Range: "bytes=0-9" },
    hashDoCorpo: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    data: new Date("2013-05-24T00:00:00Z"),
    regiao: "us-east-1",
    chaveId: "AKIAIOSFODNN7EXAMPLE",
    segredo: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  });
  assert.equal(r.assinatura, "f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41");
});

test("a cópia cifrada volta a ser um banco íntegro com a chave certa", () => {
  db.gravarEstado("marca_do_teste", "presente");
  const env = { DB_PATH: TMP_DB, BACKUP_ENCRYPTION_KEY: CHAVE };
  const pacote = backup.copiaCifradaDoBanco(env);
  assert.equal(pacote.includes(Buffer.from("presente")), false, "o conteúdo não pode aparecer em texto puro");
  const aberto = backup.decifrar(pacote, Buffer.from(CHAVE, "hex"));
  const arquivo = path.join(os.tmpdir(), `plc-restaurado-${process.pid}.db`);
  fs.writeFileSync(arquivo, aberto);
  const conexao = new DatabaseSync(arquivo);
  try {
    assert.equal(conexao.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
    assert.equal(conexao.prepare("SELECT valor FROM app_state WHERE chave = 'marca_do_teste'").get().valor, "presente");
  } finally {
    conexao.close();
    fs.unlinkSync(arquivo);
  }
  assert.throws(() => backup.decifrar(pacote, crypto.randomBytes(32)), "com a chave errada não abre");
});

test("o backup diário vai para o armazenamento assinado e não repete no mesmo dia", async () => {
  const recebidos = [];
  const s3 = http.createServer((req, res) => {
    const partes = [];
    req.on("data", c => partes.push(c));
    req.on("end", () => {
      const corpo = Buffer.concat(partes);
      recebidos.push({ url: req.url, metodo: req.method, cabecalhos: req.headers, corpo });
      const hash = crypto.createHash("sha256").update(corpo).digest("hex");
      const ok = req.method === "PUT"
        && /^AWS4-HMAC-SHA256 Credential=CHAVEID\/\d{8}\/auto\/s3\/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/.test(req.headers.authorization)
        && req.headers["x-amz-content-sha256"] === hash;
      res.writeHead(ok ? 200 : 403);
      res.end();
    });
  });
  await new Promise(r => s3.listen(0, "127.0.0.1", r));
  const registrados = [];
  const eventos = { registrar: (tipo) => registrados.push(tipo) };
  const env = {
    DB_PATH: TMP_DB, BACKUP_ENCRYPTION_KEY: CHAVE,
    BACKUP_S3_URL: `http://127.0.0.1:${s3.address().port}/meu-bucket`,
    BACKUP_S3_CHAVE_ID: "CHAVEID", BACKUP_S3_CHAVE_SECRETA: "segredo",
  };
  try {
    const r1 = await backup.fazerBackupRemoto({ db, eventos, env });
    assert.equal(r1.feito, true, JSON.stringify(r1));
    assert.equal(recebidos.length, 1);
    assert.match(recebidos[0].url, /^\/meu-bucket\/arte-canecas-.*\.db\.enc$/);
    assert.deepEqual(registrados, ["backup_ok"]);
    const restaurado = backup.decifrar(recebidos[0].corpo, Buffer.from(CHAVE, "hex"));
    assert.equal(restaurado.subarray(0, 15).toString(), "SQLite format 3");
    const r2 = await backup.fazerBackupRemoto({ db, eventos, env });
    assert.deepEqual([r2.feito, r2.motivo], [false, "ainda_cedo"]);
  } finally {
    s3.close();
  }
});

test("falha no envio vira alerta; sem configuração não faz nada", async () => {
  const registrados = [];
  const eventos = { registrar: (tipo) => registrados.push(tipo) };
  const semConfig = await backup.fazerBackupRemoto({ db, eventos, env: { DB_PATH: TMP_DB } });
  assert.equal(semConfig.motivo, "nao_configurado");
  const env = {
    DB_PATH: TMP_DB, BACKUP_ENCRYPTION_KEY: CHAVE,
    BACKUP_S3_URL: "http://127.0.0.1:9/nada", BACKUP_S3_CHAVE_ID: "x", BACKUP_S3_CHAVE_SECRETA: "y",
  };
  const r = await backup.fazerBackupRemoto({ db, eventos, env, forcar: true });
  assert.equal(r.motivo, "falhou");
  assert.deepEqual(registrados, ["backup_falhou"]);
});

test("backup atrasado mais de 26 horas gera alerta", () => {
  const registrados = [];
  const eventos = { registrar: (tipo) => registrados.push(tipo) };
  const env = { BACKUP_ENCRYPTION_KEY: CHAVE, BACKUP_S3_URL: "http://x", BACKUP_S3_CHAVE_ID: "x", BACKUP_S3_CHAVE_SECRETA: "y" };
  const agora = Date.now();
  db.gravarEstado("backup_remoto_em", agora - 27 * 3600 * 1000);
  db.gravarEstado("backup_remoto_desde", agora - 40 * 3600 * 1000);
  assert.equal(backup.conferirAtraso({ db, eventos, env, agora }), true);
  assert.deepEqual(registrados, ["backup_atrasado"]);
});
