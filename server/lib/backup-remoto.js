const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const ATRASO_MAXIMO_MS = 26 * 60 * 60 * 1000;
const INTERVALO_MS = 24 * 60 * 60 * 1000;

function caminhoDoBanco(env = process.env){
  return env.DB_PATH || path.join(__dirname, "..", "data.db");
}

function chaveDoBackup(env = process.env){
  const bruto = env.BACKUP_ENCRYPTION_KEY;
  if(!bruto) return null;
  const chave = /^[0-9a-fA-F]{64}$/.test(bruto) ? Buffer.from(bruto, "hex") : Buffer.from(bruto, "base64");
  return chave.length === 32 ? chave : null;
}

function remotoConfigurado(env = process.env){
  return Boolean(env.BACKUP_S3_URL && env.BACKUP_S3_CHAVE_ID && env.BACKUP_S3_CHAVE_SECRETA && chaveDoBackup(env));
}

function cifrar(conteudo, chave){
  const iv = crypto.randomBytes(12);
  const cifra = crypto.createCipheriv("aes-256-gcm", chave, iv);
  const corpo = Buffer.concat([cifra.update(conteudo), cifra.final()]);
  return Buffer.concat([iv, cifra.getAuthTag(), corpo]);
}

function decifrar(pacote, chave){
  const iv = pacote.subarray(0, 12);
  const etiqueta = pacote.subarray(12, 28);
  const decifra = crypto.createDecipheriv("aes-256-gcm", chave, iv);
  decifra.setAuthTag(etiqueta);
  return Buffer.concat([decifra.update(pacote.subarray(28)), decifra.final()]);
}

function copiaCifradaDoBanco(env = process.env){
  const chave = chaveDoBackup(env);
  if(!chave) throw Object.assign(new Error("BACKUP_ENCRYPTION_KEY ausente ou com tamanho errado"), { codigo: "sem_chave" });
  const temporario = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "backup-")), "copia.db");
  try {
    const conexao = new DatabaseSync(caminhoDoBanco(env));
    try { conexao.exec(`VACUUM INTO '${temporario.replace(/'/g, "''")}'`); } finally { conexao.close(); }
    return cifrar(fs.readFileSync(temporario), chave);
  } finally {
    fs.rmSync(path.dirname(temporario), { recursive: true, force: true });
  }
}

function hmac(chave, texto){
  return crypto.createHmac("sha256", chave).update(texto).digest();
}

function sha256Hex(conteudo){
  return crypto.createHash("sha256").update(conteudo).digest("hex");
}

function codificarCaminho(caminho){
  return caminho.split("/").map(p => encodeURIComponent(decodeURIComponent(p))).join("/");
}

function assinarS3({ metodo, url, cabecalhos = {}, hashDoCorpo, data, regiao, chaveId, segredo }){
  const alvo = new URL(url);
  const amzData = data.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dia = amzData.slice(0, 8);
  const todos = { ...Object.fromEntries(Object.entries(cabecalhos).map(([k, v]) => [k.toLowerCase(), String(v).trim()])), host: alvo.host, "x-amz-content-sha256": hashDoCorpo, "x-amz-date": amzData };
  const nomes = Object.keys(todos).sort();
  const canonico = [
    metodo,
    codificarCaminho(alvo.pathname || "/"),
    [...alvo.searchParams].sort().map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&"),
    nomes.map(n => `${n}:${todos[n]}\n`).join(""),
    nomes.join(";"),
    hashDoCorpo,
  ].join("\n");
  const escopo = `${dia}/${regiao}/s3/aws4_request`;
  const paraAssinar = ["AWS4-HMAC-SHA256", amzData, escopo, sha256Hex(canonico)].join("\n");
  const chave = hmac(hmac(hmac(hmac(`AWS4${segredo}`, dia), regiao), "s3"), "aws4_request");
  const assinatura = crypto.createHmac("sha256", chave).update(paraAssinar).digest("hex");
  return {
    autorizacao: `AWS4-HMAC-SHA256 Credential=${chaveId}/${escopo}, SignedHeaders=${nomes.join(";")}, Signature=${assinatura}`,
    amzData,
    assinatura,
  };
}

async function enviarParaS3(conteudo, nome, env = process.env, agora = new Date()){
  const url = `${env.BACKUP_S3_URL.replace(/\/$/, "")}/${nome}`;
  const hashDoCorpo = sha256Hex(conteudo);
  const { autorizacao, amzData } = assinarS3({
    metodo: "PUT", url, hashDoCorpo, data: agora,
    regiao: env.BACKUP_S3_REGIAO || "auto",
    chaveId: env.BACKUP_S3_CHAVE_ID,
    segredo: env.BACKUP_S3_CHAVE_SECRETA,
  });
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: autorizacao,
      "x-amz-content-sha256": hashDoCorpo,
      "x-amz-date": amzData,
      "Content-Type": "application/octet-stream",
    },
    body: conteudo,
    signal: AbortSignal.timeout(60000),
  });
  if(!res.ok){
    const texto = await res.text().catch(() => "");
    throw Object.assign(new Error(`o armazenamento respondeu ${res.status}`), { status: res.status, codigo: (texto.match(/<Code>([^<]+)<\/Code>/) || [])[1] || null });
  }
}

function nomeDoArquivo(agora = new Date()){
  return `arte-canecas-${agora.toISOString().replace(/[:.]/g, "-")}.db.enc`;
}

async function fazerBackupRemoto({ db, eventos, env = process.env, agora = new Date(), forcar = false } = {}){
  if(!remotoConfigurado(env)) return { feito: false, motivo: "nao_configurado" };
  const ultimo = Number(db.lerEstado("backup_remoto_em")?.valor || 0);
  if(!forcar && ultimo && agora.getTime() - ultimo < INTERVALO_MS - 30 * 60 * 1000) return { feito: false, motivo: "ainda_cedo" };
  if(!db.tentarTravarRodada("backup_remoto", 30 * 60 * 1000)) return { feito: false, motivo: "em_andamento" };
  try {
    const conteudo = copiaCifradaDoBanco(env);
    const nome = nomeDoArquivo(agora);
    await enviarParaS3(conteudo, nome, env, agora);
    db.gravarEstado("backup_remoto_em", agora.getTime());
    eventos?.registrar("backup_ok", { detalhes: { bytes: conteudo.length } });
    return { feito: true, nome, bytes: conteudo.length };
  } catch (err) {
    eventos?.registrar("backup_falhou", { detalhes: { motivo: err.codigo || err.message } });
    return { feito: false, motivo: "falhou", erro: err.message };
  } finally {
    db.destravarRodada("backup_remoto");
  }
}

function conferirAtraso({ db, eventos, env = process.env, agora = Date.now() } = {}){
  if(!remotoConfigurado(env)) return false;
  const ultimo = Number(db.lerEstado("backup_remoto_em")?.valor || 0);
  const comecouEm = Number(db.lerEstado("backup_remoto_desde")?.valor || 0);
  if(!comecouEm){
    db.gravarEstado("backup_remoto_desde", agora);
    return false;
  }
  const referencia = ultimo || comecouEm;
  if(agora - referencia > ATRASO_MAXIMO_MS){
    eventos?.registrar("backup_atrasado", { detalhes: { horas: Math.round((agora - referencia) / 3600000) } });
    return true;
  }
  return false;
}

module.exports = {
  chaveDoBackup,
  remotoConfigurado,
  cifrar,
  decifrar,
  copiaCifradaDoBanco,
  assinarS3,
  enviarParaS3,
  nomeDoArquivo,
  fazerBackupRemoto,
  conferirAtraso,
  ATRASO_MAXIMO_MS,
};
