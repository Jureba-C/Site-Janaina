const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("./db");
const ambiente = require("./ambiente");

const COOKIE_ANTIGO = "plc_session";
const COOKIE_PROTEGIDO = "__Host-plc_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const ADMIN_OCIOSO_MS = 30 * 60 * 1000;
const CONFIRMACAO_VALE_MS = 10 * 60 * 1000;
const BCRYPT_COST = 12;

const DUMMY_HASH = bcrypt.hashSync("senha-de-referencia-para-tempo-constante", BCRYPT_COST);

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_COST);
}
async function verifyPassword(password, hash) {
  const confere = await bcrypt.compare(password, hash || DUMMY_HASH);
  return Boolean(hash) && confere;
}

function isValidEmail(v) {
  return typeof v === "string" && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase();
}
function isValidPassword(v) {
  return typeof v === "string" && v.length >= 8 && Buffer.byteLength(v, "utf8") <= 72;
}
function isValidName(v) {
  return typeof v === "string" && v.trim().length >= 2 && v.trim().length <= 120;
}
function normalizeCep(v) {
  return String(v || "").replace(/\D/g, "");
}
function isValidCep(v) {
  return /^\d{8}$/.test(v);
}
function normalizeCpf(v) {
  return String(v || "").replace(/\D/g, "");
}
function isValidCpf(v) {
  if (!/^\d{11}$/.test(v)) return false;
  if (/^(\d)\1{10}$/.test(v)) return false;
  const digits = v.split("").map(Number);
  const checkDigit = (base) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) sum += base[i] * (base.length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  if (checkDigit(digits.slice(0, 9)) !== digits[9]) return false;
  if (checkDigit(digits.slice(0, 10)) !== digits[10]) return false;
  return true;
}

const ADDRESS_REQUIRED_FIELDS = ["nome", "telefone", "rua", "numero", "bairro", "cidade", "uf", "cpf"];
function isValidAddress(address) {
  if (!address) return false;
  if (!ADDRESS_REQUIRED_FIELDS.every(f => String(address[f] || "").trim())) return false;
  return isValidCpf(normalizeCpf(address.cpf));
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  header.split(";").forEach(pair => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(val);
      } catch {
        out[key] = val;
      }
    }
  });
  return out;
}

function emHttps() {
  return ambiente.emProducao();
}

function nomeDoCookie() {
  return emHttps() ? COOKIE_PROTEGIDO : COOKIE_ANTIGO;
}

function cookieOptions(maxAge = SESSION_TTL_MS) {
  return {
    httpOnly: true,
    secure: emHttps(),
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

function tokenDoCookie(req) {
  const cookies = parseCookies(req);
  return cookies[COOKIE_PROTEGIDO] || cookies[COOKIE_ANTIGO] || null;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function issueSession(res, userId, { segundoFator = false, req = null } = {}) {
  const token = crypto.randomBytes(32).toString("hex");
  const user = db.getUserById(userId);
  const ttl = user && isAdminEmail(user.email) ? ADMIN_SESSION_TTL_MS : SESSION_TTL_MS;
  const antigo = req ? tokenDoCookie(req) : null;
  if (antigo) db.deleteSession(hashToken(antigo));
  db.createSession({
    tokenHash: hashToken(token),
    userId,
    expiresAt: Date.now() + ttl,
    segundoFator,
    ip: req?.ip ? String(req.ip).slice(0, 64) : null,
    agente: req?.get ? String(req.get("user-agent") || "").slice(0, 160) || null : null,
  });
  if (emHttps()) res.clearCookie(COOKIE_ANTIGO, { ...cookieOptions(), maxAge: undefined });
  res.cookie(nomeDoCookie(), token, cookieOptions(ttl));
}

function sessionTokenHash(req) {
  const token = tokenDoCookie(req);
  return token ? hashToken(token) : null;
}

function clearSession(req, res) {
  const token = tokenDoCookie(req);
  if (token) db.deleteSession(hashToken(token));
  res.clearCookie(COOKIE_ANTIGO, { ...cookieOptions(), maxAge: undefined });
  if (emHttps()) res.clearCookie(COOKIE_PROTEGIDO, { ...cookieOptions(), maxAge: undefined });
}

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

function issuePasswordReset(userId) {
  db.deletePasswordResetsForUser(userId);
  const token = crypto.randomBytes(32).toString("hex");
  db.createPasswordReset({
    tokenHash: hashToken(token),
    userId,
    expiresAt: Date.now() + PASSWORD_RESET_TTL_MS,
  });
  return token;
}

function consumePasswordReset(token) {
  if (!token || typeof token !== "string") return null;
  const row = db.getPasswordReset(hashToken(token));
  if (!row) return null;
  db.deletePasswordReset(row.token_hash);
  if (row.expires_at < Date.now()) return null;
  return row.user_id;
}

const LOGIN_MAX_FAILURES = 5;
const LOGIN_LOCKOUT_MS = 30 * 60 * 1000;

function clientIp(req) {
  return String(req.ip || req.socket?.remoteAddress || "desconhecido");
}

function checkLoginLockout(email, ip) {
  return db.getLoginLockout({
    email,
    ip,
    maxFailures: LOGIN_MAX_FAILURES,
    windowMs: LOGIN_LOCKOUT_MS,
  });
}

const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer) {
  let bits = 0, value = 0, out = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str) {
  let bits = 0, value = 0;
  const out = [];
  for (const char of String(str).toUpperCase().replace(/=+$/, "")) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function generateTotpSecret() {
  return base32Encode(crypto.randomBytes(20));
}

function totpCodeAt(secret, counter) {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = ((hmac[offset] & 0x7f) << 24) |
                 ((hmac[offset + 1] & 0xff) << 16) |
                 ((hmac[offset + 2] & 0xff) << 8) |
                 (hmac[offset + 3] & 0xff);
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

function passoDoTotp(secret, code, agora = Date.now()) {
  const clean = String(code || "").replace(/\D/g, "");
  if (!secret || clean.length !== TOTP_DIGITS) return null;
  const counter = Math.floor(agora / 1000 / TOTP_STEP_SECONDS);
  const expected = Buffer.from(clean);
  for (let drift = -TOTP_WINDOW; drift <= TOTP_WINDOW; drift++) {
    const candidate = Buffer.from(totpCodeAt(secret, counter + drift));
    if (candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected)) {
      return counter + drift;
    }
  }
  return null;
}

function verifyTotp(secret, code) {
  return passoDoTotp(secret, code) !== null;
}

function confirmarTotpDaConta(user, code) {
  if (!user?.totp_secret) return false;
  const passo = passoDoTotp(user.totp_secret, code);
  if (passo === null) return false;
  return db.registrarPassoTotp(user.id, passo);
}

function totpAuthUri({ secret, email, issuer }) {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const params = new URLSearchParams({
    secret, issuer, algorithm: "SHA1", digits: String(TOTP_DIGITS), period: String(TOTP_STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

const RECOVERY_CODE_COUNT = 8;

function generateRecoveryCodes() {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () =>
    crypto.randomBytes(5).toString("hex").toUpperCase().replace(/^(.{5})(.{5})$/, "$1-$2")
  );
}
async function hashRecoveryCodes(codes) {
  return Promise.all(codes.map(c => bcrypt.hash(c, BCRYPT_COST)));
}
const FORMATO_DE_RECUPERACAO = /^[0-9A-F]{5}-[0-9A-F]{5}$/;

async function consumeRecoveryCode(code, hashes) {
  const clean = String(code || "").trim().toUpperCase();
  if (!FORMATO_DE_RECUPERACAO.test(clean)) return null;
  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(clean, hashes[i])) {
      return hashes.filter((_, idx) => idx !== i);
    }
  }
  return null;
}

async function usarCodigoDeRecuperacao(user, code) {
  const atualJson = user?.totp_recovery_json || "[]";
  const restantes = await consumeRecoveryCode(code, JSON.parse(atualJson));
  if (!restantes) return false;
  return db.trocarCodigosDeRecuperacao(user.id, atualJson, JSON.stringify(restantes));
}

const TWO_FACTOR_CHALLENGE_TTL_MS = 5 * 60 * 1000;

const EMAIL_2FA_MAX_RESENDS = 3;
const TWO_FACTOR_CHALLENGE_MAX_TTL_MS = 20 * 60 * 1000;

function issueTwoFactorChallenge(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  db.createTwoFactorChallenge({
    tokenHash: hashToken(token),
    userId,
    expiresAt: Date.now() + TWO_FACTOR_CHALLENGE_TTL_MS,
  });
  return token;
}
function peekTwoFactorChallenge(token) {
  if (!token || typeof token !== "string") return null;
  const row = db.getTwoFactorChallenge(hashToken(token));
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db.deleteTwoFactorChallenge(row.token_hash);
    return null;
  }
  return row.user_id;
}
function consumeTwoFactorChallenge(token) {
  if (!token || typeof token !== "string") return;
  db.deleteTwoFactorChallenge(hashToken(token));
}

const EMAIL_2FA_CODE_TTL_MS = 10 * 60 * 1000;
const EMAIL_2FA_RESEND_COOLDOWN_MS = 60 * 1000;
const EMAIL_2FA_MAX_ATTEMPTS = 5;

function generateEmailTwoFactorCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

async function issueTwoFactorEmailCode(challengeToken) {
  const userId = peekTwoFactorChallenge(challengeToken);
  if (!userId) return { error: "expired" };
  const user = db.getUserById(userId);
  if (!user?.totp_secret) {
    consumeTwoFactorChallenge(challengeToken);
    return { error: "expired" };
  }
  const tokenHash = hashToken(challengeToken);
  const row = db.getTwoFactorChallenge(tokenHash);
  const now = Date.now();
  if (row.email_code_sent_at && now - row.email_code_sent_at < EMAIL_2FA_RESEND_COOLDOWN_MS) {
    return { error: "cooldown", retryAfterMs: EMAIL_2FA_RESEND_COOLDOWN_MS - (now - row.email_code_sent_at) };
  }
  if ((row.email_code_resends || 0) >= EMAIL_2FA_MAX_RESENDS) {
    return { error: "resend_limit" };
  }
  const code = generateEmailTwoFactorCode();
  const codeHash = await bcrypt.hash(code, BCRYPT_COST);
  const codeExpiresAt = now + EMAIL_2FA_CODE_TTL_MS;
  const tetoAbsoluto = (row.created_at || now) + TWO_FACTOR_CHALLENGE_MAX_TTL_MS;
  db.setTwoFactorEmailCode({
    tokenHash, codeHash, codeExpiresAt, sentAt: now,
    challengeExpiresAt: Math.min(Math.max(row.expires_at, codeExpiresAt), tetoAbsoluto),
    resends: (row.email_code_resends || 0) + 1,
  });
  return { code, user };
}

async function verifyTwoFactorEmailCode(challengeToken, code) {
  if (!challengeToken || typeof challengeToken !== "string") return false;
  const tokenHash = hashToken(challengeToken);
  const row = db.getTwoFactorChallenge(tokenHash);
  if (!row || !row.email_code_hash) return false;
  if (row.email_code_expires_at && row.email_code_expires_at < Date.now()) return false;
  if (row.email_code_attempts >= EMAIL_2FA_MAX_ATTEMPTS) return false;
  const clean = String(code || "").replace(/\D/g, "");
  if (clean.length !== 6) return false;
  const match = await bcrypt.compare(clean, row.email_code_hash);
  if (!match) {
    db.incrementTwoFactorEmailCodeAttempts(tokenHash);
    return false;
  }
  return true;
}

function hashEmail(email) {
  return crypto.createHash("sha256").update(normalizeEmail(email)).digest("hex");
}
function isAdminEmail(email) {
  if (!email) return false;
  const candidate = Buffer.from(hashEmail(email), "hex");
  const adminHashes = String(process.env.ADMIN_EMAIL_HASHES || "")
    .split(",")
    .map(h => h.trim().toLowerCase())
    .filter(Boolean);
  return adminHashes.some(stored => {
    const storedBuf = Buffer.from(stored, "hex");
    return storedBuf.length === candidate.length && crypto.timingSafeEqual(storedBuf, candidate);
  });
}

function getUserFromRequest(req) {
  const token = tokenDoCookie(req);
  if (!token) return null;
  const session = db.getSessionByTokenHash(hashToken(token));
  if (!session) return null;
  const user = db.getUserById(session.user_id);
  if (!user) return null;
  const isAdmin = isAdminEmail(user.email);
  const agora = Date.now();
  if (isAdmin) {
    const ultimoUso = session.ultimo_uso_em || session.created_at;
    if (agora - session.created_at > ADMIN_SESSION_TTL_MS || agora - ultimoUso > ADMIN_OCIOSO_MS) {
      db.deleteSession(session.token_hash);
      return null;
    }
  }
  if (!session.ultimo_uso_em || agora - session.ultimo_uso_em > 60 * 1000) {
    db.marcarUsoDaSessao(session.token_hash, agora);
  }
  const segundoFator = Boolean(session.segundo_fator_em) && Boolean(user.totp_secret);
  return {
    id: user.id, name: user.name, email: user.email, cep: user.cep || null, cpf: user.cpf || null,
    isAdmin,
    segundoFator,
    adminVerificado: isAdmin && (!ADMIN_2FA_REQUIRED || segundoFator),
    sessaoHash: session.token_hash,
    reautenticadoEm: session.reautenticado_em || null,
  };
}

function attachUser(req, res, next) {
  req.user = getUserFromRequest(req);
  next();
}
function requireAuth(req, res, next) {
  req.user = getUserFromRequest(req);
  if (!req.user) {
    return res.status(401).json({ error: "Faça login para continuar." });
  }
  next();
}
function requireAdmin(req, res, next) {
  req.user = getUserFromRequest(req);
  if (!req.user) {
    return res.status(401).json({ error: "Faça login para continuar." });
  }
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Acesso restrito ao administrador da loja." });
  }
  next();
}

const ADMIN_2FA_REQUIRED = ambiente.emProducao()
  || String(process.env.ADMIN_2FA_REQUIRED || "true").toLowerCase() !== "false";

function requireAdminTwoFactor(req, res, next) {
  if (!ADMIN_2FA_REQUIRED) return next();
  const user = db.getUserById(req.user.id);
  if (!user?.totp_secret) {
    return res.status(403).json({
      error: "Ative a verificação em duas etapas para usar o painel.",
      needsTwoFactorSetup: true,
    });
  }
  if (!req.user.segundoFator) {
    return res.status(403).json({
      error: "Por segurança, saia e entre de novo com o código do app autenticador.",
      precisaEntrarDeNovo: true,
    });
  }
  next();
}

function exigirConfirmacaoRecente(validadeMs = CONFIRMACAO_VALE_MS) {
  return (req, res, next) => {
    if (!ADMIN_2FA_REQUIRED) return next();
    const quando = req.user?.reautenticadoEm;
    if (quando && Date.now() - quando <= validadeMs) return next();
    return res.status(403).json({
      error: "Confirme com o código do app autenticador para continuar.",
      precisaConfirmar: true,
    });
  };
}

module.exports = {
  ADMIN_SESSION_TTL_MS,
  ADMIN_OCIOSO_MS,
  CONFIRMACAO_VALE_MS,
  COOKIE_ANTIGO,
  COOKIE_PROTEGIDO,
  nomeDoCookie,
  exigirConfirmacaoRecente,
  passoDoTotp,
  confirmarTotpDaConta,
  usarCodigoDeRecuperacao,
  FORMATO_DE_RECUPERACAO,
  hashPassword,
  verifyPassword,
  isValidEmail,
  normalizeEmail,
  isValidPassword,
  isValidName,
  normalizeCep,
  isValidCep,
  normalizeCpf,
  isValidCpf,
  isValidAddress,
  issueSession,
  clearSession,
  sessionTokenHash,
  issuePasswordReset,
  consumePasswordReset,
  PASSWORD_RESET_TTL_MS,
  attachUser,
  requireAuth,
  requireAdmin,
  requireAdminTwoFactor,
  clientIp,
  checkLoginLockout,
  LOGIN_MAX_FAILURES,
  LOGIN_LOCKOUT_MS,
  generateTotpSecret,
  verifyTotp,
  totpAuthUri,
  generateRecoveryCodes,
  hashRecoveryCodes,
  consumeRecoveryCode,
  issueTwoFactorChallenge,
  peekTwoFactorChallenge,
  consumeTwoFactorChallenge,
  issueTwoFactorEmailCode,
  verifyTwoFactorEmailCode,
  EMAIL_2FA_CODE_TTL_MS,
  ADMIN_2FA_REQUIRED,
  isAdminEmail,
  hashEmail,
};
