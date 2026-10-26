const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");

require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "data.db");
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, "..", "backups");
const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS || 30);

function loadKey() {
  const raw = process.env.BACKUP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "BACKUP_ENCRYPTION_KEY não definida. Gere uma com:\n" +
      '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  let key;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) key = Buffer.from(raw, "hex");
  else key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(`BACKUP_ENCRYPTION_KEY precisa ter 32 bytes (tem ${key.length}). Use 64 chars hex ou base64 de 32 bytes.`);
  }
  return key;
}

function stamp() {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(new Date());
  return parts.replace(/[ :]/g, "-");
}

function makeConsistentSnapshot(tmpPath) {
  const safe = tmpPath.replace(/'/g, "''");
  const db = new DatabaseSync(DB_PATH);
  try {
    db.exec(`VACUUM INTO '${safe}'`);
  } finally {
    db.close();
  }
}

function encryptFile(srcPath, destPath, key) {
  const plaintext = fs.readFileSync(srcPath);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  fs.writeFileSync(destPath, Buffer.concat([iv, authTag, ciphertext]));
}

function pruneOldBackups() {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let removed = 0;
  for (const name of fs.readdirSync(BACKUP_DIR)) {
    if (!name.endsWith(".db.enc")) continue;
    const full = path.join(BACKUP_DIR, name);
    if (fs.statSync(full).mtimeMs < cutoff) {
      fs.unlinkSync(full);
      removed++;
    }
  }
  return removed;
}

function main() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Banco não encontrado em ${DB_PATH}.`);
  }
  const key = loadKey();
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const s = stamp();
  const tmpPath = path.join(BACKUP_DIR, `.tmp-snapshot-${s}.db`);
  const destPath = path.join(BACKUP_DIR, `data-${s}.db.enc`);

  try {
    makeConsistentSnapshot(tmpPath);
    encryptFile(tmpPath, destPath, key);
  } finally {
    try { fs.unlinkSync(tmpPath); } catch {}
  }

  const size = fs.statSync(destPath).size;
  const removed = pruneOldBackups();
  console.log(`✅ Backup criado: ${destPath} (${(size / 1024).toFixed(1)} KB)`);
  console.log(`   Retenção: mantidos os últimos ${RETENTION_DAYS} dias${removed ? `, ${removed} antigo(s) removido(s)` : ""}.`);
}

try {
  main();
} catch (err) {
  console.error("❌ Falha no backup:", err.message);
  process.exit(1);
}
