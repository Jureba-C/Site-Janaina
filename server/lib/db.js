const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const crypto = require("crypto");
const { diasDoFrete } = require("./prazoFrete.js");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "data.db");
const db = new DatabaseSync(DB_PATH);
const cofre = require("./cofre");
const prepararSemCofre = db.prepare.bind(db);
db.prepare = (sql) => cofre.envolverDeclaracao(prepararSemCofre(sql));

db.exec(`
  PRAGMA busy_timeout = 5000;
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    external_reference  TEXT NOT NULL UNIQUE,
    user_id             INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status              TEXT NOT NULL DEFAULT 'pendente',
    items_json          TEXT NOT NULL,
    address_json        TEXT NOT NULL,
    shipping_json       TEXT NOT NULL,
    coupon_code         TEXT,
    subtotal            REAL NOT NULL,
    discount            REAL NOT NULL DEFAULT 0,
    pix_discount        REAL NOT NULL DEFAULT 0,
    promo_discount      REAL NOT NULL DEFAULT 0,
    payment_method      TEXT NOT NULL DEFAULT 'card',
    shipping_price      REAL NOT NULL,
    total               REAL NOT NULL,
    payment_id          TEXT,
    tracking_code       TEXT,
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS product_photos (
    id          TEXT PRIMARY KEY,
    mime_type   TEXT NOT NULL,
    data        BLOB NOT NULL,
    created_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS product_photo_variants (
    photo_id    TEXT NOT NULL REFERENCES product_photos(id) ON DELETE CASCADE,
    width       INTEGER NOT NULL,
    format      TEXT NOT NULL,
    mime_type   TEXT NOT NULL,
    data        BLOB NOT NULL,
    created_at  INTEGER NOT NULL,
    PRIMARY KEY (photo_id, width, format)
  );

  CREATE TABLE IF NOT EXISTS product_overrides (
    product_id  INTEGER PRIMARY KEY,
    name        TEXT,
    price       REAL,
    photo_url   TEXT,
    category    TEXT,
    badges      TEXT,
    updated_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    email      TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nome       TEXT NOT NULL,
    telefone   TEXT NOT NULL,
    ocasiao    TEXT,
    mensagem   TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS email_outbox (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    kind            TEXT NOT NULL,
    to_email        TEXT NOT NULL,
    subject         TEXT NOT NULL,
    text_body       TEXT NOT NULL,
    html_body       TEXT NOT NULL,
    order_reference TEXT,
    attempts        INTEGER NOT NULL DEFAULT 0,
    next_attempt_at INTEGER NOT NULL,
    sent_at         INTEGER,
    last_error      TEXT,
    created_at      INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS coupons (
    code         TEXT PRIMARY KEY,
    percent_off  REAL NOT NULL,
    description  TEXT,
    created_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS custom_products (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    price       REAL NOT NULL,
    weight      REAL NOT NULL,
    width       REAL NOT NULL,
    height      REAL NOT NULL,
    length      REAL NOT NULL,
    category    TEXT,
    photo_url   TEXT,
    badges      TEXT,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS custom_categories (
    slug        TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    created_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS custom_colors (
    hex         TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    created_at  INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

  CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_outbox_unico
    ON email_outbox(kind, order_reference) WHERE order_reference IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_outbox_pendentes
    ON email_outbox(next_attempt_at) WHERE sent_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_resets_expires ON password_resets(expires_at);
`);

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
ensureColumn("orders", "tracking_code", "TEXT");
ensureColumn("orders", "pix_discount", "REAL NOT NULL DEFAULT 0");
ensureColumn("orders", "promo_discount", "REAL NOT NULL DEFAULT 0");
ensureColumn("orders", "payment_method", "TEXT NOT NULL DEFAULT 'card'");
ensureColumn("product_overrides", "category", "TEXT");
ensureColumn("product_overrides", "badges", "TEXT");
ensureColumn("product_overrides", "ncm", "TEXT");
ensureColumn("custom_products", "ncm", "TEXT");
ensureColumn("product_overrides", "available_colors", "TEXT");
ensureColumn("custom_products", "available_colors", "TEXT");
ensureColumn("product_overrides", "photos", "TEXT");
ensureColumn("custom_products", "photos", "TEXT");
ensureColumn("product_overrides", "allow_second_color", "INTEGER");
ensureColumn("custom_products", "allow_second_color", "INTEGER");
ensureColumn("product_overrides", "description", "TEXT");
ensureColumn("custom_products", "description", "TEXT");
ensureColumn("product_overrides", "sort_order", "INTEGER");
ensureColumn("custom_products", "sort_order", "INTEGER");
ensureColumn("product_overrides", "hidden", "INTEGER");
ensureColumn("custom_products", "hidden", "INTEGER");
ensureColumn("product_overrides", "sold_out", "INTEGER");
ensureColumn("custom_products", "sold_out", "INTEGER");
ensureColumn("custom_products", "caixa", "TEXT");
ensureColumn("orders", "customer_phone", "TEXT");
ensureColumn("orders", "customer_email", "TEXT");
db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);`);
ensureColumn("orders", "customer_phone_indice", "TEXT");
db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_phone_indice ON orders(customer_phone_indice);`);
ensureColumn("orders", "fulfillment_status", "TEXT");
ensureColumn("orders", "shipped_at", "INTEGER");
ensureColumn("orders", "delivered_at", "INTEGER");
ensureColumn("orders", "pago_em", "INTEGER");
ensureColumn("orders", "arte_aprovada_em", "INTEGER");
ensureColumn("orders", "pronto_em", "INTEGER");
ensureColumn("orders", "melhor_envio_shipment_id", "TEXT");
ensureColumn("orders", "nfe_status", "TEXT");
ensureColumn("orders", "nfe_number", "TEXT");
ensureColumn("orders", "nfe_url", "TEXT");
ensureColumn("orders", "nfe_error", "TEXT");
ensureColumn("orders", "pagamento_aprovado_id", "TEXT");
ensureColumn("orders", "efeitos_pagamento_em", "INTEGER");
ensureColumn("orders", "etiqueta_reservada_em", "INTEGER");
ensureColumn("orders", "arquivado_em", "INTEGER");
db.exec(`
  CREATE TABLE IF NOT EXISTS cupons_reservados (
    codigo    TEXT NOT NULL,
    user_id   INTEGER,
    telefone  TEXT,
    pedido    TEXT NOT NULL,
    criado_em INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_cupom_reservado_usuario ON cupons_reservados(codigo, user_id) WHERE user_id IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_cupom_reservado_telefone ON cupons_reservados(codigo, telefone) WHERE telefone IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_cupom_reservado_pedido ON cupons_reservados(pedido);
`);
ensureColumn("coupons", "once_per_customer", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("users", "cep", "TEXT");
ensureColumn("users", "cpf", "TEXT");
ensureColumn("users", "saved_address_json", "TEXT");
ensureColumn("newsletter_subscribers", "unsubscribe_token", "TEXT");
ensureColumn("newsletter_subscribers", "unsubscribed_at", "INTEGER");
ensureColumn("newsletter_subscribers", "opt_in_at", "INTEGER");
db.exec(`UPDATE newsletter_subscribers SET opt_in_at = created_at WHERE opt_in_at IS NULL`);

ensureColumn("users", "totp_secret", "TEXT");
ensureColumn("users", "totp_enabled_at", "INTEGER");
ensureColumn("users", "totp_recovery_json", "TEXT");
ensureColumn("users", "totp_pendente", "TEXT");
ensureColumn("users", "totp_pendente_em", "INTEGER");
ensureColumn("users", "totp_ultimo_passo", "INTEGER");
ensureColumn("users", "senha_redefinida_em", "INTEGER");
ensureColumn("users", "painel_codigo_hash", "TEXT");
ensureColumn("users", "painel_codigo_expira", "INTEGER");
ensureColumn("users", "painel_codigo_tentativas", "INTEGER");
ensureColumn("users", "painel_codigo_enviado", "INTEGER");
ensureColumn("sessions", "segundo_fator_em", "INTEGER");
ensureColumn("sessions", "reautenticado_em", "INTEGER");
ensureColumn("sessions", "ultimo_uso_em", "INTEGER");
ensureColumn("sessions", "ip", "TEXT");
ensureColumn("sessions", "agente", "TEXT");
ensureColumn("users", "phone", "TEXT");
ensureColumn("users", "birth_date", "TEXT");
ensureColumn("users", "nascimento_definido_em", "INTEGER");
db.exec(`UPDATE users SET nascimento_definido_em = created_at WHERE birth_date IS NOT NULL AND nascimento_definido_em IS NULL`);

ensureColumn("users", "google_id", "TEXT");
ensureColumn("users", "sem_senha", "INTEGER");
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google
           ON users(google_id) WHERE google_id IS NOT NULL`);

db.exec(`
  CREATE TABLE IF NOT EXISTS login_attempts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT    NOT NULL,
    ip         TEXT    NOT NULL,
    ok         INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup
    ON login_attempts(email, ip, created_at);
  CREATE INDEX IF NOT EXISTS idx_login_attempts_time
    ON login_attempts(created_at);

  CREATE TABLE IF NOT EXISTS two_factor_challenges (
    token_hash TEXT    PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS instagram_tokens (
    id           INTEGER PRIMARY KEY CHECK (id = 1),
    access_token TEXT    NOT NULL,
    refreshed_at INTEGER NOT NULL
  );
`);

ensureColumn("two_factor_challenges", "email_code_hash", "TEXT");
ensureColumn("two_factor_challenges", "email_code_expires_at", "INTEGER");
ensureColumn("two_factor_challenges", "email_code_attempts", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("two_factor_challenges", "email_code_sent_at", "INTEGER");
ensureColumn("two_factor_challenges", "email_code_resends", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("two_factor_challenges", "created_at", "INTEGER");

db.exec(`
  CREATE TABLE IF NOT EXISTS review_photos (
    id          TEXT PRIMARY KEY,
    mime_type   TEXT NOT NULL,
    data        BLOB NOT NULL,
    created_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS review_photo_variants (
    photo_id    TEXT NOT NULL REFERENCES review_photos(id) ON DELETE CASCADE,
    width       INTEGER NOT NULL,
    format      TEXT NOT NULL,
    mime_type   TEXT NOT NULL,
    data        BLOB NOT NULL,
    created_at  INTEGER NOT NULL,
    PRIMARY KEY (photo_id, width, format)
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    order_reference     TEXT NOT NULL,
    product_id          INTEGER NOT NULL,
    rating              INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment             TEXT,
    photo_id            TEXT REFERENCES review_photos(id) ON DELETE SET NULL,
    photo_consent_at    INTEGER,
    status              TEXT NOT NULL DEFAULT 'pendente'
                        CHECK (status IN ('pendente', 'publicada', 'oculta')),
    customer_first_name TEXT,
    customer_city       TEXT,
    created_at          INTEGER NOT NULL,
    published_at        INTEGER
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_pedido_produto
    ON reviews(order_reference, product_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_publicadas
    ON reviews(status, published_at DESC);

  CREATE TABLE IF NOT EXISTS hero_photos (
    id          TEXT PRIMARY KEY,
    position    INTEGER NOT NULL,
    alt         TEXT NOT NULL,
    legenda     TEXT NOT NULL,
    focus       TEXT NOT NULL DEFAULT 'center'
                CHECK (focus IN ('top', 'center', 'bottom')),
    mime_type   TEXT NOT NULL,
    data        BLOB NOT NULL,
    created_at  INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_hero_photos_ordem ON hero_photos(position);

  CREATE TABLE IF NOT EXISTS hero_photo_variants (
    photo_id    TEXT NOT NULL REFERENCES hero_photos(id) ON DELETE CASCADE,
    width       INTEGER NOT NULL,
    format      TEXT NOT NULL,
    mime_type   TEXT NOT NULL,
    data        BLOB NOT NULL,
    created_at  INTEGER NOT NULL,
    PRIMARY KEY (photo_id, width, format)
  );

  CREATE TABLE IF NOT EXISTS estampas (
    id             TEXT PRIMARY KEY,
    nome           TEXT NOT NULL,
    colecao        TEXT NOT NULL,
    preco          REAL NOT NULL DEFAULT 0,
    ativa          INTEGER NOT NULL DEFAULT 1,
    exemplo        INTEGER NOT NULL DEFAULT 0,
    position       INTEGER NOT NULL DEFAULT 0,
    largura        INTEGER NOT NULL,
    altura         INTEGER NOT NULL,
    original_mime  TEXT NOT NULL,
    original       BLOB NOT NULL,
    textura        BLOB NOT NULL,
    miniatura      BLOB NOT NULL,
    created_at     INTEGER NOT NULL,
    updated_at     INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS depoimentos (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    texto            TEXT NOT NULL,
    cliente_nome     TEXT NOT NULL,
    cliente_cidade   TEXT,
    origem           TEXT NOT NULL CHECK (origem IN ('whatsapp', 'instagram')),
    photo_id         TEXT REFERENCES review_photos(id) ON DELETE SET NULL,
    consentimento_em INTEGER NOT NULL,
    posicao          INTEGER NOT NULL,
    status           TEXT NOT NULL DEFAULT 'publicado'
                     CHECK (status IN ('publicado', 'oculto')),
    created_at       INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_depoimentos_ordem ON depoimentos(status, posicao);

  CREATE TABLE IF NOT EXISTS campanhas (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    assunto      TEXT NOT NULL,
    chamada      TEXT,
    corpo        TEXT NOT NULL,
    produtos     TEXT,
    status       TEXT NOT NULL DEFAULT 'rascunho'
                 CHECK (status IN ('rascunho', 'enviando', 'concluida', 'cancelada')),
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL,
    iniciada_em  INTEGER,
    concluida_em INTEGER
  );

  CREATE TABLE IF NOT EXISTS campanha_destinatarios (
    campanha_id  INTEGER NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
    email        TEXT NOT NULL,
    enfileirado_em INTEGER,
    PRIMARY KEY (campanha_id, email)
  );

  CREATE INDEX IF NOT EXISTS idx_campanha_fila
    ON campanha_destinatarios(campanha_id) WHERE enfileirado_em IS NULL;

  CREATE TABLE IF NOT EXISTS app_state (
    chave       TEXT PRIMARY KEY,
    valor       TEXT,
    updated_at  INTEGER NOT NULL
  );
`);
ensureColumn("orders", "review_token", "TEXT");
ensureColumn("product_overrides", "config_json", "TEXT");
ensureColumn("custom_products", "config_json", "TEXT");
ensureColumn("custom_categories", "grupo", "TEXT");

db.exec(`
  CREATE TABLE IF NOT EXISTS personalizacao_fotos (
    id           TEXT PRIMARY KEY,
    chave_hash   TEXT NOT NULL,
    mime_type    TEXT NOT NULL,
    data         BLOB NOT NULL,
    miniatura    BLOB NOT NULL,
    largura      INTEGER NOT NULL,
    altura       INTEGER NOT NULL,
    pedido       TEXT,
    apagar_em    INTEGER,
    created_at   INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_personalizacao_fotos_pedido ON personalizacao_fotos(pedido);
`);

function seedDefaultCoupon() {
  const { count } = db.prepare(`SELECT COUNT(*) AS count FROM coupons`).get();
  if (count === 0) {
    db.prepare(
      `INSERT INTO coupons (code, percent_off, description, created_at, once_per_customer)
       VALUES (?, ?, ?, ?, 1)`
    ).run("BEMVINDA10", 10, "10% de desconto — primeira compra", Date.now());
  }
  db.prepare(`UPDATE coupons SET once_per_customer = 1 WHERE code = 'BEMVINDA10'`).run();
}
seedDefaultCoupon();

const CUPOM_ANIVERSARIO = "ANIVERSARIO10";
function seedBirthdayCoupon() {
  const marca = db.prepare(`SELECT 1 FROM app_state WHERE chave = 'cupom_aniversario_semeado'`).get();
  if (marca) return;
  db.prepare(
    `INSERT OR IGNORE INTO coupons (code, percent_off, description, created_at, once_per_customer)
     VALUES (?, ?, ?, ?, 0)`
  ).run(CUPOM_ANIVERSARIO, 10, "Aniversário — só a aniversariante logada, até 30 dias após a data", Date.now());
  db.prepare(`INSERT OR REPLACE INTO app_state (chave, valor, updated_at) VALUES ('cupom_aniversario_semeado', '1', ?)`).run(Date.now());
}
seedBirthdayCoupon();

const stmtInsertUser = db.prepare(
  `INSERT INTO users (name, email, password_hash, cpf, google_id, sem_senha, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
const stmtGetUserByEmail = db.prepare(`SELECT * FROM users WHERE email = ?`);
const stmtGetUserById = db.prepare(`SELECT * FROM users WHERE id = ?`);

function createUser({ name, email, passwordHash, cpf, googleId, semSenha }) {
  const info = stmtInsertUser.run(
    name, email, passwordHash, cofre.cifrar(cpf || null),
    googleId || null, semSenha ? 1 : 0, Date.now()
  );
  return getUserById(Number(info.lastInsertRowid));
}

const stmtGetUserByGoogleId = db.prepare(`SELECT * FROM users WHERE google_id = ?`);
function getUserByGoogleId(googleId) {
  return googleId ? (stmtGetUserByGoogleId.get(googleId) || null) : null;
}

const stmtSetUserGoogleId = db.prepare(
  `UPDATE users SET google_id = ? WHERE id = ? AND google_id IS NULL`
);
function setUserGoogleId(userId, googleId) {
  return stmtSetUserGoogleId.run(googleId, userId).changes > 0;
}
function getUserByEmail(email) {
  return stmtGetUserByEmail.get(email) || null;
}
function getUserById(id) {
  return stmtGetUserById.get(id) || null;
}

const stmtSaveAddress = db.prepare(`UPDATE users SET saved_address_json = ? WHERE id = ?`);
function getSavedAddress(userId) {
  const user = getUserById(userId);
  if (!user || !user.saved_address_json) return null;
  try {
    return JSON.parse(user.saved_address_json);
  } catch {
    return null;
  }
}
function saveAddress(userId, address) {
  stmtSaveAddress.run(cofre.cifrar(JSON.stringify(address)), userId);
}

const stmtUpdatePerfil = db.prepare(`
  UPDATE users SET name = ?, phone = ?, birth_date = ?,
    nascimento_definido_em = CASE WHEN ? IS NOT NULL AND birth_date IS NULL THEN ? ELSE nascimento_definido_em END
  WHERE id = ?
`);
function updatePerfil(userId, { name, phone, birthDate }) {
  stmtUpdatePerfil.run(name, phone || null, birthDate || null, birthDate || null, Date.now(), userId);
}
const stmtUpdateUserEmail = db.prepare(`UPDATE users SET email = ? WHERE id = ?`);
function updateUserEmail(userId, email) {
  stmtUpdateUserEmail.run(email, userId);
}

const stmtAniversariantes = db.prepare(
  `SELECT id, name, email FROM users WHERE birth_date IS NOT NULL AND substr(birth_date, 6, 5) = ?`
);
function aniversariantesDoDia(mesDia) {
  return stmtAniversariantes.all(mesDia);
}

const stmtListUsersForExport = db.prepare(
  `SELECT id, name, email, cpf, created_at,
          CASE WHEN totp_enabled_at IS NOT NULL THEN 1 ELSE 0 END AS has_2fa
     FROM users ORDER BY id`
);
function listUsersForExport() {
  return stmtListUsersForExport.all();
}

const stmtListAccountsForAdmin = db.prepare(
  `SELECT id, name, email, created_at, saved_address_json, phone, birth_date
     FROM users ORDER BY created_at DESC`
);
function aniversarioCurto(birthDate) {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(String(birthDate || ""));
  return m ? `${m[2]}/${m[1]}` : null;
}
function listAccountsForAdmin() {
  return stmtListAccountsForAdmin.all().map((u) => {
    let telefone = null;
    try {
      telefone = u.saved_address_json ? JSON.parse(u.saved_address_json)?.telefone || null : null;
    } catch {
      telefone = null;
    }
    return {
      id: u.id, name: u.name, email: u.email, createdAt: u.created_at,
      telefone: u.phone || telefone,
      aniversario: aniversarioCurto(u.birth_date),
    };
  });
}

const stmtInsertSession = db.prepare(
  `INSERT INTO sessions (token_hash, user_id, created_at, expires_at, segundo_fator_em, ultimo_uso_em, ip, agente) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);
const stmtGetSession = db.prepare(`SELECT * FROM sessions WHERE token_hash = ?`);
const stmtDeleteSession = db.prepare(`DELETE FROM sessions WHERE token_hash = ?`);
const stmtDeleteExpiredSessions = db.prepare(`DELETE FROM sessions WHERE expires_at < ?`);
const stmtDeleteUserSessions = db.prepare(`DELETE FROM sessions WHERE user_id = ?`);

const MAX_SESSOES_POR_PESSOA = 10;
const stmtSessoesExcedentes = db.prepare(`
  DELETE FROM sessions WHERE user_id = ? AND token_hash NOT IN (
    SELECT token_hash FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
  )
`);
function createSession({ tokenHash, userId, expiresAt, segundoFator = false, ip = null, agente = null }) {
  const agora = Date.now();
  stmtInsertSession.run(tokenHash, userId, agora, expiresAt, segundoFator ? agora : null, agora, ip, agente);
  stmtSessoesExcedentes.run(userId, userId, MAX_SESSOES_POR_PESSOA);
}
const stmtUsoDaSessao = db.prepare(`UPDATE sessions SET ultimo_uso_em = ? WHERE token_hash = ?`);
function marcarUsoDaSessao(tokenHash, agora = Date.now()){
  stmtUsoDaSessao.run(agora, tokenHash);
}
const stmtReautenticaSessao = db.prepare(`UPDATE sessions SET reautenticado_em = ?, ultimo_uso_em = ? WHERE token_hash = ?`);
function marcarReautenticacao(tokenHash, agora = Date.now()){
  stmtReautenticaSessao.run(agora, agora, tokenHash);
}
const stmtSessoesDoUsuario = db.prepare(
  `SELECT token_hash, created_at, ultimo_uso_em, ip, agente, segundo_fator_em FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY COALESCE(ultimo_uso_em, created_at) DESC`
);
function listarSessoesDoUsuario(userId){
  return stmtSessoesDoUsuario.all(userId, Date.now());
}
const stmtApagaSessaoDoUsuario = db.prepare(`DELETE FROM sessions WHERE user_id = ? AND token_hash = ?`);
function apagarSessaoDoUsuario(userId, tokenHash){
  return stmtApagaSessaoDoUsuario.run(userId, tokenHash).changes > 0;
}
const stmtApagaTodasSessoes = db.prepare(`DELETE FROM sessions WHERE token_hash <> ?`);
function apagarTodasAsSessoes(exceto = ""){
  return stmtApagaTodasSessoes.run(exceto).changes;
}
function getSessionByTokenHash(tokenHash) {
  stmtDeleteExpiredSessions.run(Date.now());
  return stmtGetSession.get(tokenHash) || null;
}
function deleteSession(tokenHash) {
  stmtDeleteSession.run(tokenHash);
}
function deleteAllSessionsForUser(userId) {
  stmtDeleteUserSessions.run(userId);
}
const stmtDeleteOtherSessions = db.prepare(`DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?`);
function deleteOtherSessions(userId, tokenHashAtual) {
  return stmtDeleteOtherSessions.run(userId, tokenHashAtual).changes;
}

const stmtInsertPasswordReset = db.prepare(
  `INSERT INTO password_resets (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`
);
const stmtGetPasswordReset = db.prepare(`SELECT * FROM password_resets WHERE token_hash = ?`);
const stmtDeletePasswordReset = db.prepare(`DELETE FROM password_resets WHERE token_hash = ?`);
const stmtDeleteUserPasswordResets = db.prepare(`DELETE FROM password_resets WHERE user_id = ?`);
const stmtDeleteExpiredPasswordResets = db.prepare(`DELETE FROM password_resets WHERE expires_at < ?`);
const stmtUpdateUserPassword = db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`);

function createPasswordReset({ tokenHash, userId, expiresAt }) {
  stmtInsertPasswordReset.run(tokenHash, userId, Date.now(), expiresAt);
}
function getPasswordReset(tokenHash) {
  stmtDeleteExpiredPasswordResets.run(Date.now());
  return stmtGetPasswordReset.get(tokenHash) || null;
}
function deletePasswordReset(tokenHash) {
  stmtDeletePasswordReset.run(tokenHash);
}
function deletePasswordResetsForUser(userId) {
  stmtDeleteUserPasswordResets.run(userId);
}
function updateUserPassword(userId, passwordHash) {
  stmtUpdateUserPassword.run(passwordHash, userId);
  stmtLimpaSemSenha.run(userId);
}
const stmtLimpaSemSenha = db.prepare(`UPDATE users SET sem_senha = 0 WHERE id = ?`);

const stmtAnonymizeUserOrders = db.prepare(
  `UPDATE orders SET address_json = '{"anonimizado":true}', customer_phone = NULL, customer_phone_indice = NULL WHERE user_id = ?`
);
const stmtDeleteNewsletterByEmail = db.prepare(`DELETE FROM newsletter_subscribers WHERE email = ?`);
const stmtDeleteLoginAttemptsByEmail = db.prepare(`DELETE FROM login_attempts WHERE email = ?`);
const stmtDeleteUserById = db.prepare(`DELETE FROM users WHERE id = ?`);

const stmtDeleteAniversarioPendente = db.prepare(
  `DELETE FROM email_outbox WHERE kind = 'aniversario' AND sent_at IS NULL AND order_reference LIKE ?`
);
const stmtFotosDePedidosNaoPagos = db.prepare(`
  DELETE FROM personalizacao_fotos WHERE pedido IN (
    SELECT external_reference FROM orders WHERE user_id = ? AND status NOT IN ('pago', 'em análise', 'reembolsado', 'estornado')
  )
`);
const stmtTiraEmailDosPedidos = db.prepare(
  `UPDATE orders SET customer_email = NULL, review_token = NULL WHERE user_id = ? OR customer_email = ?`
);
const stmtApagaFilaDoEmail = db.prepare(`DELETE FROM email_outbox WHERE to_email = ? AND sent_at IS NULL`);
const stmtApagaReservasDoUsuario = db.prepare(`DELETE FROM cupons_reservados WHERE user_id = ?`);

function deleteUserAccount(userId) {
  const user = getUserById(userId);
  if (!user) return false;
  db.exec("BEGIN");
  try {
    stmtFotosDePedidosNaoPagos.run(userId);
    stmtTiraEmailDosPedidos.run(userId, user.email);
    stmtApagaFilaDoEmail.run(user.email);
    stmtApagaReservasDoUsuario.run(userId);
    stmtAnonymizeUserOrders.run(userId);
    deleteAllSessionsForUser(userId);
    deletePasswordResetsForUser(userId);
    stmtDeleteNewsletterByEmail.run(user.email);
    stmtDeleteLoginAttemptsByEmail.run(user.email);
    stmtDeleteAniversarioPendente.run(`aniversario:${userId}:%`);
    stmtDeleteUserById.run(userId);
    db.exec("COMMIT");
    return true;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

const stmtInsertLoginAttempt = db.prepare(
  `INSERT INTO login_attempts (email, ip, ok, created_at) VALUES (?, ?, ?, ?)`
);
const stmtLastSuccessAt = db.prepare(
  `SELECT MAX(created_at) AS at FROM login_attempts WHERE email = ? AND ip = ? AND ok = 1`
);
const stmtRecentFailures = db.prepare(
  `SELECT created_at FROM login_attempts
    WHERE email = ? AND ip = ? AND ok = 0 AND created_at > ?
    ORDER BY created_at ASC`
);
const stmtListLoginAttempts = db.prepare(
  `SELECT email, ip, ok, created_at FROM login_attempts
    WHERE created_at > ? ORDER BY created_at DESC LIMIT ?`
);
const stmtPruneLoginAttempts = db.prepare(`DELETE FROM login_attempts WHERE created_at < ?`);

function recordLoginAttempt({ email, ip, ok }) {
  stmtInsertLoginAttempt.run(String(email || ""), String(ip || ""), ok ? 1 : 0, Date.now());
}

function getLoginLockout({ email, ip, maxFailures, windowMs }) {
  const now = Date.now();
  const since = Math.max(
    now - windowMs,
    Number(stmtLastSuccessAt.get(String(email || ""), String(ip || ""))?.at) || 0
  );
  const failures = stmtRecentFailures.all(String(email || ""), String(ip || ""), since);
  if (failures.length < maxFailures) {
    return { locked: false, failures: failures.length, retryAfterMs: 0 };
  }
  const oldest = failures[failures.length - maxFailures].created_at;
  return {
    locked: true,
    failures: failures.length,
    retryAfterMs: Math.max(0, oldest + windowMs - now),
  };
}

const stmtFalhasDaConta = db.prepare(`
  SELECT COUNT(*) AS n, COUNT(DISTINCT ip) AS ips, MAX(created_at) AS ultima
    FROM login_attempts WHERE email = ? AND ok = 0 AND created_at >= ?
`);
const stmtUltimoSucessoDaConta = db.prepare(
  `SELECT MAX(created_at) AS at FROM login_attempts WHERE email = ? AND ok = 1`
);
function falhasDaConta(email, janelaMs){
  const agora = Date.now();
  const desde = Math.max(agora - janelaMs, Number(stmtUltimoSucessoDaConta.get(String(email || ""))?.at) || 0);
  const linha = stmtFalhasDaConta.get(String(email || ""), desde);
  return { falhas: linha.n, ips: linha.ips, ultima: linha.ultima || 0 };
}

function listRecentLoginAttempts({ sinceMs, limit = 200 }) {
  return stmtListLoginAttempts.all(Date.now() - sinceMs, limit);
}
const stmtEsvaziaEmailsAntigos = db.prepare(
  `UPDATE email_outbox SET text_body = '', html_body = '' WHERE sent_at IS NOT NULL AND sent_at < ? AND (text_body <> '' OR html_body <> '')`
);
function esvaziarEmailsEnviados(antesDe){
  return stmtEsvaziaEmailsAntigos.run(antesDe).changes;
}

function pruneLoginAttempts(olderThanMs) {
  stmtPruneLoginAttempts.run(Date.now() - olderThanMs);
}

const stmtSetTotp = db.prepare(
  `UPDATE users SET totp_secret = ?, totp_enabled_at = ?, totp_recovery_json = ? WHERE id = ?`
);
const stmtInsertChallenge = db.prepare(
  `INSERT INTO two_factor_challenges (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`
);
const stmtGetChallenge = db.prepare(`SELECT * FROM two_factor_challenges WHERE token_hash = ?`);
const stmtDeleteChallenge = db.prepare(`DELETE FROM two_factor_challenges WHERE token_hash = ?`);
const stmtDeleteExpiredChallenges = db.prepare(
  `DELETE FROM two_factor_challenges WHERE expires_at < ?`
);
const stmtSetTwoFactorEmailCode = db.prepare(`
  UPDATE two_factor_challenges
  SET email_code_hash = ?, email_code_expires_at = ?, email_code_attempts = 0,
      email_code_sent_at = ?, expires_at = ?, email_code_resends = ?
  WHERE token_hash = ?
`);
const stmtIncrementEmailCodeAttempts = db.prepare(
  `UPDATE two_factor_challenges SET email_code_attempts = email_code_attempts + 1 WHERE token_hash = ?`
);

function setUserTotp(userId, { secret, recoveryJson }) {
  stmtSetTotp.run(cofre.cifrar(secret || null), secret ? Date.now() : null, recoveryJson || null, userId);
  stmtLimpaTotpPendente.run(userId);
  stmtZeraPassoTotp.run(userId);
}
const stmtLimpaTotpPendente = db.prepare(`UPDATE users SET totp_pendente = NULL, totp_pendente_em = NULL WHERE id = ?`);
const stmtZeraPassoTotp = db.prepare(`UPDATE users SET totp_ultimo_passo = NULL WHERE id = ?`);
const stmtGuardaTotpPendente = db.prepare(`UPDATE users SET totp_pendente = ?, totp_pendente_em = ? WHERE id = ?`);
function guardarTotpPendente(userId, segredo){
  stmtGuardaTotpPendente.run(cofre.cifrar(segredo), Date.now(), userId);
}
function limparTotpPendente(userId){
  stmtLimpaTotpPendente.run(userId);
}
const stmtPassoTotp = db.prepare(
  `UPDATE users SET totp_ultimo_passo = ? WHERE id = ? AND (totp_ultimo_passo IS NULL OR totp_ultimo_passo < ?)`
);
function registrarPassoTotp(userId, passo){
  return stmtPassoTotp.run(passo, userId, passo).changes === 1;
}
const stmtTrocaRecuperacao = db.prepare(
  `UPDATE users SET totp_recovery_json = ? WHERE id = ? AND totp_recovery_json = ?`
);
function trocarCodigosDeRecuperacao(userId, antigoJson, novoJson){
  return stmtTrocaRecuperacao.run(novoJson, userId, antigoJson).changes === 1;
}
db.exec(`
  CREATE TABLE IF NOT EXISTS verificacoes_email (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email      TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
`);
const stmtApagaVerificacoesDoUsuario = db.prepare(`DELETE FROM verificacoes_email WHERE user_id = ?`);
const stmtCriaVerificacao = db.prepare(
  `INSERT INTO verificacoes_email (token_hash, user_id, email, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`
);
function criarVerificacaoDeEmail({ tokenHash, userId, email, expiresAt }){
  stmtApagaVerificacoesDoUsuario.run(userId);
  stmtCriaVerificacao.run(tokenHash, userId, email, expiresAt, Date.now());
}
const stmtPegaVerificacao = db.prepare(`SELECT * FROM verificacoes_email WHERE token_hash = ?`);
const stmtApagaVerificacao = db.prepare(`DELETE FROM verificacoes_email WHERE token_hash = ?`);
function consumirVerificacaoDeEmail(tokenHash){
  const linha = stmtPegaVerificacao.get(tokenHash);
  if(!linha) return null;
  stmtApagaVerificacao.run(tokenHash);
  return linha.expires_at < Date.now() ? null : linha;
}

const stmtGuardaCodigoDoPainel = db.prepare(
  `UPDATE users SET painel_codigo_hash = ?, painel_codigo_expira = ?, painel_codigo_tentativas = 0, painel_codigo_enviado = ? WHERE id = ?`
);
function guardarCodigoDoPainel(userId, { hash, expira }){
  stmtGuardaCodigoDoPainel.run(hash, expira, Date.now(), userId);
}
const stmtTentativaCodigoDoPainel = db.prepare(
  `UPDATE users SET painel_codigo_tentativas = COALESCE(painel_codigo_tentativas, 0) + 1 WHERE id = ?`
);
function contarTentativaDoCodigoDoPainel(userId){ stmtTentativaCodigoDoPainel.run(userId); }
const stmtLimpaCodigoDoPainel = db.prepare(
  `UPDATE users SET painel_codigo_hash = NULL, painel_codigo_expira = NULL, painel_codigo_tentativas = NULL WHERE id = ?`
);
function limparCodigoDoPainel(userId){ stmtLimpaCodigoDoPainel.run(userId); }

const stmtSenhaRedefinida = db.prepare(`UPDATE users SET senha_redefinida_em = ? WHERE id = ?`);
function marcarSenhaRedefinida(userId){
  stmtSenhaRedefinida.run(Date.now(), userId);
}
function createTwoFactorChallenge({ tokenHash, userId, expiresAt }) {
  stmtInsertChallenge.run(tokenHash, userId, expiresAt, Date.now());
}
function getTwoFactorChallenge(tokenHash) {
  stmtDeleteExpiredChallenges.run(Date.now());
  return stmtGetChallenge.get(tokenHash) || null;
}
function deleteTwoFactorChallenge(tokenHash) {
  stmtDeleteChallenge.run(tokenHash);
}
function setTwoFactorEmailCode({ tokenHash, codeHash, codeExpiresAt, sentAt, challengeExpiresAt, resends }) {
  stmtSetTwoFactorEmailCode.run(codeHash, codeExpiresAt, sentAt, challengeExpiresAt, resends ?? 0, tokenHash);
}
function incrementTwoFactorEmailCodeAttempts(tokenHash) {
  stmtIncrementEmailCodeAttempts.run(tokenHash);
}

const stmtInsertOrder = db.prepare(`
  INSERT INTO orders (
    external_reference, user_id, status, items_json, address_json, shipping_json,
    coupon_code, subtotal, discount, pix_discount, promo_discount, payment_method,
    shipping_price, total, customer_phone, customer_email, created_at, updated_at, customer_phone_indice
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const stmtGetOrderByRef = db.prepare(`SELECT * FROM orders WHERE external_reference = ?`);
const stmtUpdateOrderStatus = db.prepare(
  `UPDATE orders SET status = ?, payment_id = ?, updated_at = ? WHERE external_reference = ?`
);
const stmtListOrdersByUser = db.prepare(
  `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`
);
const stmtListAllOrders = db.prepare(`SELECT * FROM orders WHERE arquivado_em IS NULL ORDER BY created_at DESC`);
const stmtPedidosAguardandoEntrega = db.prepare(
  `SELECT * FROM orders WHERE fulfillment_status = 'postado' AND tracking_code IS NOT NULL AND tracking_code <> '' ORDER BY shipped_at ASC`
);
function listOrdersAwaitingDelivery(){
  return stmtPedidosAguardandoEntrega.all();
}
const stmtUpdateOrderTracking = db.prepare(`
  UPDATE orders SET
    tracking_code = ?,
    updated_at = ?,
    fulfillment_status = CASE WHEN ? IS NOT NULL THEN 'postado' ELSE fulfillment_status END,
    shipped_at = CASE WHEN ? IS NOT NULL AND shipped_at IS NULL THEN ? ELSE shipped_at END
  WHERE external_reference = ?
`);
const stmtMarkOrderInProduction = db.prepare(
  `UPDATE orders SET fulfillment_status = 'em_producao', pago_em = COALESCE(pago_em, ?), updated_at = ? WHERE external_reference = ? AND fulfillment_status IS NULL`
);
const stmtMarcarArteAprovada = db.prepare(
  `UPDATE orders SET arte_aprovada_em = COALESCE(arte_aprovada_em, ?), updated_at = ? WHERE external_reference = ?`
);
const stmtMarcarPronto = db.prepare(
  `UPDATE orders SET fulfillment_status = 'pronto', pronto_em = COALESCE(pronto_em, ?), updated_at = ? WHERE external_reference = ?`
);
const stmtMarkOrderDelivered = db.prepare(
  `UPDATE orders SET fulfillment_status = 'entregue', delivered_at = ?, updated_at = ? WHERE external_reference = ?`
);
const stmtSetMelhorEnvioShipmentId = db.prepare(
  `UPDATE orders SET melhor_envio_shipment_id = ?, updated_at = ? WHERE external_reference = ?`
);
const stmtOrderStats = db.prepare(
  `SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS revenue FROM orders WHERE status = 'pago'`
);
const stmtDeleteOrder = db.prepare(`DELETE FROM orders WHERE external_reference = ?`);

function createOrder(order) {
  const now = Date.now();
  stmtInsertOrder.run(
    order.externalReference,
    order.userId ?? null,
    order.status ?? "pendente",
    JSON.stringify(order.items),
    cofre.cifrar(JSON.stringify(order.address)),
    JSON.stringify(order.shipping),
    order.couponCode ?? null,
    order.subtotal,
    order.discount ?? 0,
    order.pixDiscount ?? 0,
    order.promoDiscount ?? 0,
    order.paymentMethod ?? "card",
    order.shippingPrice,
    order.total,
    cofre.cifrar(order.customerPhone ?? null),
    order.customerEmail ?? null,
    now,
    now,
    cofre.indiceCego(order.customerPhone ?? null)
  );
  return getOrderByExternalReference(order.externalReference);
}

const stmtCouponUsedByUser = db.prepare(
  `SELECT 1 FROM orders WHERE coupon_code = ? AND status = 'pago' AND user_id = ? LIMIT 1`
);
const stmtCouponUsedByPhone = db.prepare(
  `SELECT 1 FROM orders WHERE coupon_code = ? AND status = 'pago' AND customer_phone_indice = ? LIMIT 1`
);
const COUPON_PENDING_WINDOW_MS = 2 * 60 * 60 * 1000;
const stmtCouponPendingByUser = db.prepare(
  `SELECT 1 FROM orders WHERE coupon_code = ? AND status = 'pendente' AND user_id = ? AND created_at > ? LIMIT 1`
);
const stmtCouponPendingByPhone = db.prepare(
  `SELECT 1 FROM orders WHERE coupon_code = ? AND status = 'pendente' AND customer_phone_indice = ? AND created_at > ? LIMIT 1`
);

const stmtCouponUsedByUserSince = db.prepare(
  `SELECT 1 FROM orders WHERE coupon_code = ? AND user_id = ? AND created_at >= ?
     AND (status = 'pago' OR (status = 'pendente' AND created_at > ?)) LIMIT 1`
);
function hasUsedCouponSince({ code, userId, since }) {
  if (!code || !userId) return false;
  return Boolean(stmtCouponUsedByUserSince.get(code, userId, since, Date.now() - COUPON_PENDING_WINDOW_MS));
}

const stmtCouponEmAnaliseByUser = db.prepare(
  `SELECT 1 FROM orders WHERE coupon_code = ? AND status = 'em análise' AND user_id = ? LIMIT 1`
);
const stmtCouponEmAnaliseByPhone = db.prepare(
  `SELECT 1 FROM orders WHERE coupon_code = ? AND status = 'em análise' AND customer_phone_indice = ? LIMIT 1`
);

const stmtInsereReserva = db.prepare(
  `INSERT INTO cupons_reservados (codigo, user_id, telefone, pedido, criado_em) VALUES (?, ?, ?, ?, ?)`
);
const stmtReservasConflitantes = db.prepare(
  `SELECT * FROM cupons_reservados WHERE codigo = ? AND ((user_id IS NOT NULL AND user_id = ?) OR (telefone IS NOT NULL AND telefone = ?))`
);
const stmtApagaReservaDoPedido = db.prepare(`DELETE FROM cupons_reservados WHERE pedido = ?`);
const stmtApagaReservaExata = db.prepare(`DELETE FROM cupons_reservados WHERE codigo = ? AND pedido = ?`);
function reservaAindaVale(reserva, agora){
  const pedido = stmtGetOrderByRef.get(reserva.pedido);
  if(!pedido) return agora - reserva.criado_em < 5 * 60 * 1000;
  if(["pago", "em análise", "reembolsado", "estornado"].includes(pedido.status)) return true;
  if(pedido.status === "pendente") return agora - pedido.created_at < COUPON_PENDING_WINDOW_MS && !pedido.arquivado_em;
  return false;
}
function reservarCupom({ code, userId, phone: telefone, pedido }){
  const agora = Date.now();
  const phone = cofre.indiceCego(telefone);
  const conflitos = stmtReservasConflitantes.all(code, userId ?? null, phone ?? null);
  for(const r of conflitos){
    if(r.pedido === pedido) continue;
    if(reservaAindaVale(r, agora)) return false;
    stmtApagaReservaExata.run(r.codigo, r.pedido);
  }
  if(conflitos.some(r => r.pedido === pedido)) return true;
  try {
    stmtInsereReserva.run(code, userId ?? null, phone ?? null, pedido, agora);
    return true;
  } catch {
    return false;
  }
}
function liberarCupomDoPedido(pedido){
  stmtApagaReservaDoPedido.run(pedido);
}

function hasUsedCoupon({ code, userId, phone: telefone }) {
  if (!code) return false;
  const phone = cofre.indiceCego(telefone);
  if (userId && stmtCouponUsedByUser.get(code, userId)) return true;
  if (phone && stmtCouponUsedByPhone.get(code, phone)) return true;
  const cutoff = Date.now() - COUPON_PENDING_WINDOW_MS;
  if (userId && stmtCouponPendingByUser.get(code, userId, cutoff)) return true;
  if (phone && stmtCouponPendingByPhone.get(code, phone, cutoff)) return true;
  if (userId && stmtCouponEmAnaliseByUser.get(code, userId)) return true;
  if (phone && stmtCouponEmAnaliseByPhone.get(code, phone)) return true;
  return false;
}
const stmtOutrosPagosComCupom = db.prepare(`
  SELECT COUNT(*) AS n FROM orders
   WHERE coupon_code = ? AND status = 'pago' AND external_reference <> ?
     AND ((user_id IS NOT NULL AND user_id = ?) OR (customer_phone_indice IS NOT NULL AND customer_phone_indice = ?))
`);
function cupomJaUsadoEmOutroPedidoPago(pedido){
  if(!pedido?.coupon_code) return false;
  return stmtOutrosPagosComCupom.get(pedido.coupon_code, pedido.external_reference, pedido.user_id ?? null, cofre.indiceCego(pedido.customer_phone)).n > 0;
}
function getOrderByExternalReference(ref) {
  return stmtGetOrderByRef.get(ref) || null;
}
function updateOrderStatus(ref, status, paymentId) {
  stmtUpdateOrderStatus.run(status, paymentId ?? null, Date.now(), ref);
}
const stmtUpdateOrderDraft = db.prepare(`
  UPDATE orders SET
    items_json = ?, address_json = ?, shipping_json = ?, coupon_code = ?,
    subtotal = ?, discount = ?, pix_discount = ?, promo_discount = ?, shipping_price = ?, total = ?,
    customer_phone = ?, customer_phone_indice = ?, updated_at = ?
  WHERE external_reference = ?
`);
function updateOrderDraft(ref, order) {
  stmtUpdateOrderDraft.run(
    JSON.stringify(order.items),
    cofre.cifrar(JSON.stringify(order.address)),
    JSON.stringify(order.shipping),
    order.couponCode ?? null,
    order.subtotal,
    order.discount ?? 0,
    order.pixDiscount ?? 0,
    order.promoDiscount ?? 0,
    order.shippingPrice,
    order.total,
    cofre.cifrar(order.customerPhone ?? null),
    cofre.indiceCego(order.customerPhone ?? null),
    Date.now(),
    ref
  );
  return getOrderByExternalReference(ref);
}
function listOrdersByUser(userId) {
  return stmtListOrdersByUser.all(userId);
}
function listAllOrders() {
  return stmtListAllOrders.all();
}
function updateOrderTracking(ref, trackingCode) {
  const code = trackingCode || null;
  const now = Date.now();
  stmtUpdateOrderTracking.run(code, now, code, code, now, ref);
  return getOrderByExternalReference(ref);
}
function markOrderInProduction(ref) {
  const now = Date.now();
  stmtMarkOrderInProduction.run(now, now, ref);
}
function marcarArteAprovada(ref) {
  const now = Date.now();
  stmtMarcarArteAprovada.run(now, now, ref);
}
function marcarPronto(ref) {
  const now = Date.now();
  stmtMarcarPronto.run(now, now, ref);
}
function markOrderDelivered(ref, quando) {
  const now = Date.now();
  stmtMarkOrderDelivered.run(quando || now, now, ref);
  stmtAgendarApagarFotos.run((quando || now) + DIAS_FOTOS_APOS_ENTREGA * 86400000, ref);
}
function setMelhorEnvioShipmentId(ref, shipmentId) {
  stmtSetMelhorEnvioShipmentId.run(shipmentId, Date.now(), ref);
}
function getOrderStats() {
  return stmtOrderStats.get();
}
function deleteOrder(ref) {
  stmtDeleteOrder.run(ref);
}

db.exec(`
  UPDATE orders SET pagamento_aprovado_id = payment_id, efeitos_pagamento_em = COALESCE(pago_em, updated_at)
    WHERE status IN ('pago', 'reembolsado', 'estornado') AND pagamento_aprovado_id IS NULL;
  CREATE TABLE IF NOT EXISTS pagamentos_mp (
    payment_id    TEXT PRIMARY KEY,
    pedido        TEXT NOT NULL,
    status        TEXT,
    valor         REAL,
    moeda         TEXT,
    tipo          TEXT,
    metodo        TEXT,
    criado_em     INTEGER NOT NULL,
    atualizado_em INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_pagamentos_mp_pedido ON pagamentos_mp(pedido);
`);

const stmtRegistraPagamentoMp = db.prepare(`
  INSERT INTO pagamentos_mp (payment_id, pedido, status, valor, moeda, tipo, metodo, criado_em, atualizado_em)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(payment_id) DO UPDATE SET
    status = excluded.status, valor = excluded.valor, moeda = excluded.moeda,
    tipo = excluded.tipo, metodo = excluded.metodo, atualizado_em = excluded.atualizado_em
`);
function registrarPagamentoMp(info){
  const agora = Date.now();
  stmtRegistraPagamentoMp.run(
    String(info.id), String(info.external_reference || ""), info.status ?? null,
    Number.isFinite(Number(info.transaction_amount)) ? Number(info.transaction_amount) : null,
    info.currency_id ?? null, info.payment_type_id ?? null, info.payment_method_id ?? null, agora, agora
  );
}
const stmtPagamentosDoPedido = db.prepare(`SELECT * FROM pagamentos_mp WHERE pedido = ? ORDER BY criado_em`);
function listarPagamentosDoPedido(ref){ return stmtPagamentosDoPedido.all(ref); }

const stmtTrocaStatus = db.prepare(`
  UPDATE orders SET
    status = ?,
    payment_id = ?,
    pagamento_aprovado_id = CASE WHEN ? IS NOT NULL THEN ? ELSE pagamento_aprovado_id END,
    updated_at = ?
  WHERE external_reference = ? AND status = ?
`);
function trocarStatusDoPedido(ref, { de, para, paymentId, vencedor = null }){
  const r = stmtTrocaStatus.run(para, paymentId ?? null, vencedor, vencedor, Date.now(), ref, de);
  return r.changes === 1;
}
const stmtReservaEfeitos = db.prepare(
  `UPDATE orders SET efeitos_pagamento_em = ? WHERE external_reference = ? AND efeitos_pagamento_em IS NULL`
);
function reservarEfeitosDoPagamento(ref){
  return stmtReservaEfeitos.run(Date.now(), ref).changes === 1;
}
const stmtReservaEtiqueta = db.prepare(`
  UPDATE orders SET etiqueta_reservada_em = ?
  WHERE external_reference = ? AND etiqueta_reservada_em IS NULL
    AND (melhor_envio_shipment_id IS NULL OR melhor_envio_shipment_id = '')
`);
function reservarEtiqueta(ref){
  return stmtReservaEtiqueta.run(Date.now(), ref).changes === 1;
}
const stmtSoltaEtiqueta = db.prepare(
  `UPDATE orders SET etiqueta_reservada_em = NULL WHERE external_reference = ? AND (melhor_envio_shipment_id IS NULL OR melhor_envio_shipment_id = '')`
);
function soltarEtiqueta(ref){ stmtSoltaEtiqueta.run(ref); }
const stmtArquivaPedido = db.prepare(
  `UPDATE orders SET arquivado_em = ?, updated_at = ? WHERE external_reference = ? AND arquivado_em IS NULL`
);
function arquivarPedido(ref){
  const agora = Date.now();
  return stmtArquivaPedido.run(agora, agora, ref).changes === 1;
}
const stmtPagamentoAprovadoDoPedido = db.prepare(
  `SELECT 1 FROM pagamentos_mp WHERE pedido = ? AND status IN ('approved', 'refunded', 'charged_back') LIMIT 1`
);
db.exec(`
  CREATE TABLE IF NOT EXISTS eventos_seguranca (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo       TEXT NOT NULL,
    gravidade  TEXT NOT NULL,
    user_id    INTEGER,
    email_hash TEXT,
    ip         TEXT,
    agente     TEXT,
    pedido     TEXT,
    detalhes   TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_eventos_quando ON eventos_seguranca(created_at);
  CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos_seguranca(tipo, created_at);
`);
const stmtInsereEvento = db.prepare(`
  INSERT INTO eventos_seguranca (tipo, gravidade, user_id, email_hash, ip, agente, pedido, detalhes, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
function inserirEventoDeSeguranca(e){
  const r = stmtInsereEvento.run(
    e.tipo, e.gravidade, e.userId ?? null, e.emailHash ?? null, e.ip ?? null,
    e.agente ?? null, e.pedido ?? null, e.detalhes ?? null, e.quando ?? Date.now()
  );
  return Number(r.lastInsertRowid);
}
const stmtListaEventos = db.prepare(`
  SELECT * FROM eventos_seguranca WHERE created_at >= ? ORDER BY created_at DESC, id DESC LIMIT ?
`);
const stmtListaEventosDoTipo = db.prepare(`
  SELECT * FROM eventos_seguranca WHERE created_at >= ? AND tipo = ? ORDER BY created_at DESC, id DESC LIMIT ?
`);
function listarEventosDeSeguranca({ desde = 0, tipo = null, limite = 200 } = {}){
  return tipo ? stmtListaEventosDoTipo.all(desde, tipo, limite) : stmtListaEventos.all(desde, limite);
}
const stmtContaEventos = db.prepare(`SELECT COUNT(*) AS n FROM eventos_seguranca WHERE tipo = ? AND created_at >= ?`);
function contarEventosDeSeguranca(tipo, desde){
  return stmtContaEventos.get(tipo, desde).n;
}
const stmtPodaEventos = db.prepare(`DELETE FROM eventos_seguranca WHERE created_at < ?`);
function podarEventosDeSeguranca(antesDe){
  return stmtPodaEventos.run(antesDe).changes;
}

function pedidoJaFoiPago(pedido){
  if(!pedido) return false;
  if(pedido.pagamento_aprovado_id || pedido.pago_em) return true;
  if(["pago", "em análise", "reembolsado", "estornado"].includes(pedido.status)) return true;
  return Boolean(stmtPagamentoAprovadoDoPedido.get(pedido.external_reference));
}

const stmtInsertProductPhoto = db.prepare(
  `INSERT INTO product_photos (id, mime_type, data, created_at) VALUES (?, ?, ?, ?)`
);
const stmtGetProductPhoto = db.prepare(`SELECT mime_type, data FROM product_photos WHERE id = ?`);
const stmtDeleteProductPhoto = db.prepare(`DELETE FROM product_photos WHERE id = ?`);

function insertProductPhoto(id, mimeType, buffer) {
  stmtInsertProductPhoto.run(id, mimeType, buffer, Date.now());
}
function getProductPhoto(id) {
  return stmtGetProductPhoto.get(id) || null;
}
function deleteProductPhoto(id) {
  stmtDeleteProductPhoto.run(id);
}

const stmtGetProductPhotoVariant = db.prepare(
  `SELECT mime_type, data FROM product_photo_variants
    WHERE photo_id = ? AND width = ? AND format = ?`
);
const stmtInsertProductPhotoVariant = db.prepare(
  `INSERT OR REPLACE INTO product_photo_variants
     (photo_id, width, format, mime_type, data, created_at)
   VALUES (?, ?, ?, ?, ?, ?)`
);

function getProductPhotoVariant(photoId, width, format) {
  return stmtGetProductPhotoVariant.get(photoId, width, format) || null;
}
function saveProductPhotoVariant(photoId, width, format, mimeType, buffer) {
  stmtInsertProductPhotoVariant.run(photoId, width, format, mimeType, buffer, Date.now());
}

const stmtListHeroPhotos = db.prepare(
  `SELECT id, position, alt, legenda, focus, created_at
     FROM hero_photos ORDER BY position, created_at`
);
const stmtGetHeroPhoto = db.prepare(`SELECT mime_type, data, focus FROM hero_photos WHERE id = ?`);
const stmtInsertHeroPhoto = db.prepare(
  `INSERT INTO hero_photos (id, position, alt, legenda, focus, mime_type, data, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);
const stmtUpdateHeroPhoto = db.prepare(
  `UPDATE hero_photos SET alt = ?, legenda = ?, focus = ? WHERE id = ?`
);
const stmtDeleteHeroPhoto = db.prepare(`DELETE FROM hero_photos WHERE id = ?`);
const stmtPosicaoLivreHero = db.prepare(`SELECT IFNULL(MAX(position), -1) + 1 AS n FROM hero_photos`);
const stmtContarHeroPhotos = db.prepare(`SELECT COUNT(*) AS n FROM hero_photos`);
const stmtMoverHeroPhoto = db.prepare(`UPDATE hero_photos SET position = ? WHERE id = ?`);
const stmtApagarVariantesHero = db.prepare(`DELETE FROM hero_photo_variants WHERE photo_id = ?`);

function listHeroPhotos(){
  return stmtListHeroPhotos.all();
}
function countHeroPhotos(){
  return stmtContarHeroPhotos.get().n;
}
function getHeroPhoto(id){
  return stmtGetHeroPhoto.get(id) || null;
}
function insertHeroPhoto(id, alt, legenda, focus, mimeType, buffer){
  stmtInsertHeroPhoto.run(
    id, stmtPosicaoLivreHero.get().n, alt, legenda, focus, mimeType, buffer, Date.now()
  );
}
function updateHeroPhoto(id, alt, legenda, focus){
  const antes = stmtGetHeroPhoto.get(id);
  if(!antes) return false;
  stmtUpdateHeroPhoto.run(alt, legenda, focus, id);
  if(antes.focus !== focus) stmtApagarVariantesHero.run(id);
  return true;
}
function deleteHeroPhoto(id){
  stmtDeleteHeroPhoto.run(id);
}
function setHeroPhotoOrder(ids){
  db.exec("BEGIN");
  try{
    ids.forEach((id, i) => stmtMoverHeroPhoto.run(i, id));
    db.exec("COMMIT");
  }catch(err){
    db.exec("ROLLBACK");
    throw err;
  }
}

const stmtGetHeroVariant = db.prepare(
  `SELECT mime_type, data FROM hero_photo_variants
    WHERE photo_id = ? AND width = ? AND format = ?`
);
const stmtInsertHeroVariant = db.prepare(
  `INSERT OR REPLACE INTO hero_photo_variants
     (photo_id, width, format, mime_type, data, created_at)
   VALUES (?, ?, ?, ?, ?, ?)`
);
function getHeroPhotoVariant(photoId, width, format){
  return stmtGetHeroVariant.get(photoId, width, format) || null;
}
function saveHeroPhotoVariant(photoId, width, format, mimeType, buffer){
  stmtInsertHeroVariant.run(photoId, width, format, mimeType, buffer, Date.now());
}

function heroVersion(){
  const linhas = stmtListHeroPhotos.all();
  if(!linhas.length) return "0";
  return linhas.map(f => `${f.id}:${f.position}:${f.focus}:${f.alt.length}:${f.legenda.length}`).join("|");
}

const stmtListDepoimentos = db.prepare(
  `SELECT id, texto, cliente_nome, cliente_cidade, origem, photo_id,
          consentimento_em, posicao, status, created_at
     FROM depoimentos ORDER BY posicao, created_at`
);
const stmtDepoimentosPublicados = db.prepare(
  `SELECT id, texto, cliente_nome, cliente_cidade, origem, photo_id
     FROM depoimentos WHERE status = 'publicado' ORDER BY posicao, created_at LIMIT ?`
);
const stmtGetDepoimento = db.prepare(`SELECT * FROM depoimentos WHERE id = ?`);
const stmtInsertDepoimento = db.prepare(
  `INSERT INTO depoimentos
     (texto, cliente_nome, cliente_cidade, origem, photo_id, consentimento_em, posicao, status, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, 'publicado', ?)`
);
const stmtUpdateDepoimento = db.prepare(
  `UPDATE depoimentos SET texto = ?, cliente_nome = ?, cliente_cidade = ?, origem = ?, status = ?
    WHERE id = ?`
);
const stmtDeleteDepoimento = db.prepare(`DELETE FROM depoimentos WHERE id = ?`);
const stmtPosicaoLivreDepoimento = db.prepare(`SELECT IFNULL(MAX(posicao), -1) + 1 AS n FROM depoimentos`);
const stmtContarDepoimentos = db.prepare(`SELECT COUNT(*) AS n FROM depoimentos WHERE status = 'publicado'`);
const stmtMoverDepoimento = db.prepare(`UPDATE depoimentos SET posicao = ? WHERE id = ?`);
const stmtFotoDeDepoimentoPublicado = db.prepare(
  `SELECT p.mime_type, p.data FROM review_photos p
     JOIN depoimentos d ON d.photo_id = p.id AND d.status = 'publicado'
    WHERE p.id = ?`
);

function listarDepoimentos(){
  return stmtListDepoimentos.all();
}
function depoimentosPublicados(limite){
  return stmtDepoimentosPublicados.all(limite);
}
function contarDepoimentosPublicados(){
  return stmtContarDepoimentos.get().n;
}
function getDepoimento(id){
  return stmtGetDepoimento.get(id) || null;
}
function criarDepoimento({ texto, nome, cidade, origem, photoId, consentimentoEm }){
  const agora = Date.now();
  const r = stmtInsertDepoimento.run(
    texto, nome, cidade || null, origem, photoId || null,
    consentimentoEm, stmtPosicaoLivreDepoimento.get().n, agora
  );
  return Number(r.lastInsertRowid);
}
function atualizarDepoimento(id, { texto, nome, cidade, origem, status }){
  if(!stmtGetDepoimento.get(id)) return false;
  stmtUpdateDepoimento.run(texto, nome, cidade || null, origem, status, id);
  return true;
}
function removerDepoimento(id){
  const antes = stmtGetDepoimento.get(id);
  if(!antes) return false;
  stmtDeleteDepoimento.run(id);
  if(antes.photo_id) apagarFotoOrfaDeAvaliacao(antes.photo_id);
  return true;
}
function setOrdemDepoimentos(ids){
  db.exec("BEGIN");
  try{
    ids.forEach((id, i) => stmtMoverDepoimento.run(i, id));
    db.exec("COMMIT");
  }catch(err){
    db.exec("ROLLBACK");
    throw err;
  }
}
function getFotoDeDepoimentoPublicado(photoId){
  return stmtFotoDeDepoimentoPublicado.get(photoId) || null;
}

const stmtGetProductOverride = db.prepare(`SELECT * FROM product_overrides WHERE product_id = ?`);
const stmtListProductOverrides = db.prepare(`SELECT * FROM product_overrides`);
const stmtUpsertProductOverride = db.prepare(`
  INSERT INTO product_overrides (product_id, name, price, photo_url, category, badges, available_colors, photos, allow_second_color, description, ncm, hidden, sold_out, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(product_id) DO UPDATE SET
    name = excluded.name, price = excluded.price, photo_url = excluded.photo_url,
    category = excluded.category, badges = excluded.badges,
    available_colors = excluded.available_colors, photos = excluded.photos,
    allow_second_color = excluded.allow_second_color, description = excluded.description,
    ncm = excluded.ncm,
    hidden = excluded.hidden, sold_out = excluded.sold_out, updated_at = excluded.updated_at
`);

const stmtSetOverrideConfig = db.prepare(
  `UPDATE product_overrides SET config_json = ?, updated_at = ? WHERE product_id = ?`
);
const stmtSetCustomConfig = db.prepare(
  `UPDATE custom_products SET config_json = ?, updated_at = ? WHERE id = ?`
);

const stmtSetOverrideSortOrder = db.prepare(`
  INSERT INTO product_overrides (product_id, sort_order, updated_at) VALUES (?, ?, ?)
  ON CONFLICT(product_id) DO UPDATE SET sort_order = excluded.sort_order, updated_at = excluded.updated_at
`);
const stmtSetCustomProductSortOrder = db.prepare(
  `UPDATE custom_products SET sort_order = ? WHERE id = ?`
);
function setProductsOrder(orderedIds, customIds) {
  const now = Date.now();
  const custom = new Set(customIds);
  db.exec("BEGIN");
  try {
    orderedIds.forEach((id, index) => {
      if (custom.has(id)) stmtSetCustomProductSortOrder.run(index, id);
      else stmtSetOverrideSortOrder.run(id, index, now);
    });
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

function getProductOverride(productId) {
  return stmtGetProductOverride.get(productId) || null;
}
function listProductOverrides() {
  return stmtListProductOverrides.all();
}
function upsertProductOverride(productId, fields) {
  const current = getProductOverride(productId) || {};
  const name = "name" in fields ? (fields.name || null) : (current.name ?? null);
  const price = "price" in fields ? (fields.price ?? null) : (current.price ?? null);
  const photoUrl = "photoUrl" in fields ? (fields.photoUrl || null) : (current.photo_url ?? null);
  const category = "category" in fields ? (fields.category || null) : (current.category ?? null);
  const badges = "badges" in fields
    ? (fields.badges && fields.badges.length ? JSON.stringify(fields.badges) : null)
    : (current.badges ?? null);
  const availableColors = "availableColors" in fields
    ? JSON.stringify(Array.isArray(fields.availableColors) ? fields.availableColors : [])
    : (current.available_colors ?? null);
  const photos = "photos" in fields
    ? JSON.stringify(Array.isArray(fields.photos) ? fields.photos : [])
    : (current.photos ?? null);
  const allowSecondColor = "allowSecondColor" in fields
    ? (fields.allowSecondColor ? 1 : 0)
    : (current.allow_second_color ?? 0);
  const description = "description" in fields ? (fields.description || null) : (current.description ?? null);
  const ncm = "ncm" in fields ? (fields.ncm || null) : (current.ncm ?? null);
  const hidden = "hidden" in fields ? (fields.hidden ? 1 : 0) : (current.hidden ?? 0);
  const soldOut = "soldOut" in fields ? (fields.soldOut ? 1 : 0) : (current.sold_out ?? 0);
  stmtUpsertProductOverride.run(productId, name, price, photoUrl, category, badges, availableColors, photos, allowSecondColor, description, ncm, hidden, soldOut, Date.now());
  if ("config" in fields) stmtSetOverrideConfig.run(fields.config ? JSON.stringify(fields.config) : null, Date.now(), productId);
  return getProductOverride(productId);
}

const stmtListCustomProducts = db.prepare(`SELECT * FROM custom_products ORDER BY id`);
const stmtGetCustomProduct = db.prepare(`SELECT * FROM custom_products WHERE id = ?`);
const stmtMaxCustomProductId = db.prepare(`SELECT MAX(id) AS maxId FROM custom_products`);
const stmtInsertCustomProduct = db.prepare(`
  INSERT INTO custom_products
    (id, name, price, weight, width, height, length, category, photo_url, badges, available_colors, photos, allow_second_color, description, ncm, hidden, sold_out, caixa, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const stmtUpdateCustomProduct = db.prepare(`
  UPDATE custom_products SET
    name = ?, price = ?, category = ?, photo_url = ?, badges = ?, available_colors = ?, photos = ?, allow_second_color = ?, description = ?, ncm = ?, hidden = ?, sold_out = ?, updated_at = ?
  WHERE id = ?
`);
const stmtDeleteCustomProduct = db.prepare(`DELETE FROM custom_products WHERE id = ?`);

function listCustomProducts() {
  return stmtListCustomProducts.all();
}
function getCustomProduct(id) {
  return stmtGetCustomProduct.get(id) || null;
}
function nextCustomProductId(startAt) {
  const { maxId } = stmtMaxCustomProductId.get();
  return Math.max(startAt - 1, maxId || 0) + 1;
}
function insertCustomProduct({ startAt, name, price, weight, width, height, length, category, badges, description, caixa, config }) {
  const id = nextCustomProductId(startAt);
  const now = Date.now();
  stmtInsertCustomProduct.run(
    id, name, price, weight, width, height, length, category || null, null,
    badges && badges.length ? JSON.stringify(badges) : null,
    null,
    null,
    0,
    description || null,
    null,
    0,
    0,
    caixa || null,
    now, now
  );
  if (config) stmtSetCustomConfig.run(JSON.stringify(config), now, id);
  return getCustomProduct(id);
}
function updateCustomProduct(id, fields) {
  const current = getCustomProduct(id);
  if (!current) return null;
  const name = "name" in fields ? fields.name : current.name;
  const price = "price" in fields ? fields.price : current.price;
  const category = "category" in fields ? (fields.category || null) : current.category;
  const photoUrl = "photoUrl" in fields ? (fields.photoUrl || null) : current.photo_url;
  const badges = "badges" in fields
    ? (fields.badges && fields.badges.length ? JSON.stringify(fields.badges) : null)
    : current.badges;
  const availableColors = "availableColors" in fields
    ? JSON.stringify(Array.isArray(fields.availableColors) ? fields.availableColors : [])
    : (current.available_colors ?? null);
  const photos = "photos" in fields
    ? JSON.stringify(Array.isArray(fields.photos) ? fields.photos : [])
    : (current.photos ?? null);
  const allowSecondColor = "allowSecondColor" in fields
    ? (fields.allowSecondColor ? 1 : 0)
    : (current.allow_second_color ?? 0);
  const description = "description" in fields ? (fields.description || null) : (current.description ?? null);
  const ncm = "ncm" in fields ? (fields.ncm || null) : (current.ncm ?? null);
  const hidden = "hidden" in fields ? (fields.hidden ? 1 : 0) : (current.hidden ?? 0);
  const soldOut = "soldOut" in fields ? (fields.soldOut ? 1 : 0) : (current.sold_out ?? 0);
  stmtUpdateCustomProduct.run(name, price, category, photoUrl, badges, availableColors, photos, allowSecondColor, description, ncm, hidden, soldOut, Date.now(), id);
  if ("config" in fields) stmtSetCustomConfig.run(fields.config ? JSON.stringify(fields.config) : null, Date.now(), id);
  return getCustomProduct(id);
}
function deleteCustomProduct(id) {
  stmtDeleteCustomProduct.run(id);
}

const stmtListCustomCategories = db.prepare(`SELECT * FROM custom_categories ORDER BY created_at`);
const stmtInsertCustomCategory = db.prepare(
  `INSERT INTO custom_categories (slug, label, created_at, grupo) VALUES (?, ?, ?, ?)`
);
const stmtUpdateCustomCategoryLabel = db.prepare(
  `UPDATE custom_categories SET label = ? WHERE slug = ?`
);
const stmtDeleteCustomCategory = db.prepare(`DELETE FROM custom_categories WHERE slug = ?`);
const stmtCountProductsUsingCategory = db.prepare(`
  SELECT
    (SELECT COUNT(*) FROM product_overrides WHERE category = ?) +
    (SELECT COUNT(*) FROM custom_products WHERE category = ?) AS total
`);

function listCustomCategories() {
  return stmtListCustomCategories.all();
}
function insertCustomCategory({ slug, label, grupo }) {
  const g = grupo === "ocasiao" ? "ocasiao" : "tipo";
  stmtInsertCustomCategory.run(slug, label, Date.now(), g);
  return { slug, label, grupo: g };
}
function updateCustomCategoryLabel(slug, label) {
  stmtUpdateCustomCategoryLabel.run(label, slug);
}
function deleteCustomCategory(slug) {
  stmtDeleteCustomCategory.run(slug);
}
function countProductsUsingCategory(slug) {
  return stmtCountProductsUsingCategory.get(slug, slug).total;
}

const stmtListCustomColors = db.prepare(`SELECT * FROM custom_colors ORDER BY created_at`);
const stmtInsertCustomColor = db.prepare(
  `INSERT INTO custom_colors (hex, label, created_at) VALUES (?, ?, ?)`
);

const stmtDeleteCustomColor = db.prepare(`DELETE FROM custom_colors WHERE hex = ?`);

function listCustomColors() {
  return stmtListCustomColors.all();
}
function insertCustomColor({ hex, label }) {
  stmtInsertCustomColor.run(hex, label, Date.now());
  return { hex, label };
}
function deleteCustomColor(hex) {
  stmtDeleteCustomColor.run(hex);
}

const stmtInsertSubscriber = db.prepare(
  `INSERT OR IGNORE INTO newsletter_subscribers (email, created_at, opt_in_at) VALUES (?, ?, ?)`
);
const stmtMarcaOptIn = db.prepare(
  `UPDATE newsletter_subscribers SET opt_in_at = ? WHERE email = ? AND opt_in_at IS NULL`
);
const stmtInsertContato = db.prepare(
  `INSERT OR IGNORE INTO newsletter_subscribers (email, created_at) VALUES (?, ?)`
);
const stmtListSubscribers = db.prepare(
  `SELECT * FROM newsletter_subscribers ORDER BY created_at DESC`
);

function addNewsletterSubscriber(email) {
  const agora = Date.now();
  stmtInsertSubscriber.run(email, agora, agora);
  stmtMarcaOptIn.run(agora, email);
}

function garantirTokenDeContato(email) {
  stmtInsertContato.run(email, Date.now());
  return getOrCreateUnsubscribeToken(email);
}
function listNewsletterSubscribers() {
  return stmtListSubscribers.all();
}

const stmtGetSubscriberToken = db.prepare(
  `SELECT unsubscribe_token FROM newsletter_subscribers WHERE email = ?`
);
const stmtSetSubscriberToken = db.prepare(
  `UPDATE newsletter_subscribers SET unsubscribe_token = ? WHERE email = ?`
);
function getOrCreateUnsubscribeToken(email) {
  const existing = stmtGetSubscriberToken.get(email)?.unsubscribe_token;
  if (existing) return existing;
  const token = crypto.randomBytes(24).toString("hex");
  stmtSetSubscriberToken.run(token, email);
  return token;
}

const stmtMarkUnsubscribed = db.prepare(
  `UPDATE newsletter_subscribers SET unsubscribed_at = ? WHERE email = ?`
);
function unsubscribeNewsletter(email, token) {
  const stored = stmtGetSubscriberToken.get(email)?.unsubscribe_token;
  if (!stored || !token) return false;
  const a = Buffer.from(stored);
  const b = Buffer.from(String(token));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  stmtMarkUnsubscribed.run(Date.now(), email);
  return true;
}

const stmtInsertContactMessage = db.prepare(
  `INSERT INTO contact_messages (nome, telefone, ocasiao, mensagem, created_at)
   VALUES (?, ?, ?, ?, ?)`
);
const stmtListContactMessages = db.prepare(
  `SELECT * FROM contact_messages ORDER BY created_at DESC`
);
const stmtGetContactMessage = db.prepare(`SELECT * FROM contact_messages WHERE id = ?`);
const stmtDeleteContactMessage = db.prepare(`DELETE FROM contact_messages WHERE id = ?`);

function createContactMessage({ nome, telefone, ocasiao, mensagem }) {
  stmtInsertContactMessage.run(nome, telefone, ocasiao || null, mensagem, Date.now());
}
function listContactMessages() {
  return stmtListContactMessages.all();
}
function getContactMessage(id) {
  return stmtGetContactMessage.get(id) || null;
}
function deleteContactMessage(id) {
  stmtDeleteContactMessage.run(id);
}

const stmtGetCoupon = db.prepare(`SELECT * FROM coupons WHERE code = ?`);
const stmtListCoupons = db.prepare(`SELECT * FROM coupons ORDER BY created_at DESC`);
const stmtInsertCoupon = db.prepare(
  `INSERT INTO coupons (code, percent_off, description, created_at) VALUES (?, ?, ?, ?)`
);
const stmtDeleteCoupon = db.prepare(`DELETE FROM coupons WHERE code = ?`);
const stmtUpdateCoupon = db.prepare(
  `UPDATE coupons SET percent_off = ?, description = ? WHERE code = ?`
);

function getCoupon(code) {
  return stmtGetCoupon.get(code) || null;
}
function listCoupons() {
  return stmtListCoupons.all();
}
function createCoupon({ code, percentOff, description }) {
  stmtInsertCoupon.run(code, percentOff, description ?? null, Date.now());
  return getCoupon(code);
}
function updateCoupon(code, fields) {
  const current = getCoupon(code);
  if (!current) return null;
  const percentOff = "percentOff" in fields ? fields.percentOff : current.percent_off;
  const description = "description" in fields ? (fields.description || null) : current.description;
  stmtUpdateCoupon.run(percentOff, description, code);
  return getCoupon(code);
}
function deleteCoupon(code) {
  stmtDeleteCoupon.run(code);
}

const stmtGetInstagramToken = db.prepare(`SELECT access_token, refreshed_at FROM instagram_tokens WHERE id = 1`);
const stmtUpsertInstagramToken = db.prepare(`
  INSERT INTO instagram_tokens (id, access_token, refreshed_at) VALUES (1, ?, ?)
  ON CONFLICT(id) DO UPDATE SET access_token = excluded.access_token, refreshed_at = excluded.refreshed_at
`);
const stmtDeleteInstagramToken = db.prepare(`DELETE FROM instagram_tokens WHERE id = 1`);

function getInstagramToken() {
  const row = stmtGetInstagramToken.get();
  return row ? { accessToken: row.access_token, refreshedAt: row.refreshed_at } : null;
}
function saveInstagramToken({ accessToken, refreshedAt }) {
  stmtUpsertInstagramToken.run(cofre.cifrar(accessToken), refreshedAt);
}
function deleteInstagramToken() {
  stmtDeleteInstagramToken.run();
}

const stmtGetReviewToken = db.prepare(`SELECT review_token FROM orders WHERE external_reference = ?`);
const stmtSetReviewToken = db.prepare(
  `UPDATE orders SET review_token = ? WHERE external_reference = ? AND review_token IS NULL`
);
function garantirTokenDeAvaliacao(ref){
  const atual = stmtGetReviewToken.get(ref)?.review_token;
  if(atual) return atual;
  stmtSetReviewToken.run(crypto.randomBytes(32).toString("hex"), ref);
  return stmtGetReviewToken.get(ref)?.review_token || null;
}

const DIAS_DO_LINK_DE_AVALIACAO = 90;
const stmtDatasDoPedido = db.prepare(`SELECT delivered_at, shipped_at, pago_em, created_at FROM orders WHERE external_reference = ?`);
function linkDeAvaliacaoVenceu(ref, agora = Date.now()){
  const d = stmtDatasDoPedido.get(ref);
  if(!d) return true;
  const base = d.delivered_at || d.shipped_at || d.pago_em || d.created_at;
  const folga = d.delivered_at ? DIAS_DO_LINK_DE_AVALIACAO : DIAS_DO_LINK_DE_AVALIACAO + 60;
  return agora - base > folga * 86400000;
}

function tokenDeAvaliacaoConfere(ref, token){
  const certo = stmtGetReviewToken.get(ref)?.review_token;
  if(!certo || typeof token !== "string") return false;
  if(linkDeAvaliacaoVenceu(ref)) return false;
  const recebido = Buffer.from(token);
  const esperado = Buffer.from(certo);
  if(recebido.length !== esperado.length) return false;
  return crypto.timingSafeEqual(recebido, esperado);
}

const stmtUpsertReview = db.prepare(`
  INSERT INTO reviews
    (order_reference, product_id, rating, comment, photo_id, photo_consent_at,
     status, customer_first_name, customer_city, created_at)
  VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?, ?, ?)
  ON CONFLICT(order_reference, product_id) DO UPDATE SET
    rating = excluded.rating,
    comment = excluded.comment,
    photo_id = excluded.photo_id,
    photo_consent_at = excluded.photo_consent_at,
    created_at = excluded.created_at
  WHERE reviews.status = 'pendente'
`);
function salvarAvaliacao({ orderReference, productId, rating, comment, photoId, photoConsentAt, firstName, city }){
  const r = stmtUpsertReview.run(
    orderReference, productId, rating, comment || null, photoId || null,
    photoConsentAt || null, firstName || null, city || null, Date.now()
  );
  return r.changes > 0;
}

const stmtAvaliacoesDoPedido = db.prepare(
  `SELECT product_id, rating, comment, status, photo_id, photo_consent_at FROM reviews WHERE order_reference = ?`
);
function avaliacoesDoPedido(ref){ return stmtAvaliacoesDoPedido.all(ref); }

const stmtInsertReviewPhoto = db.prepare(
  `INSERT INTO review_photos (id, mime_type, data, created_at) VALUES (?, ?, ?, ?)`
);
function insertReviewPhoto(id, mimeType, buffer){ stmtInsertReviewPhoto.run(id, mimeType, buffer, Date.now()); }

const stmtFotoPublicada = db.prepare(`
  SELECT p.mime_type, p.data FROM review_photos p
    JOIN reviews r ON r.photo_id = p.id AND r.status = 'publicada'
   WHERE p.id = ? LIMIT 1
`);
function getReviewPhotoPublicada(id){ return stmtFotoPublicada.get(id) || null; }

const stmtGetReviewVariant = db.prepare(
  `SELECT mime_type, data FROM review_photo_variants WHERE photo_id = ? AND width = ? AND format = ?`
);
const stmtSaveReviewVariant = db.prepare(`
  INSERT OR REPLACE INTO review_photo_variants (photo_id, width, format, mime_type, data, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);
function getReviewPhotoVariant(photoId, width, format){ return stmtGetReviewVariant.get(photoId, width, format) || null; }
function saveReviewPhotoVariant(photoId, width, format, mimeType, buffer){
  stmtSaveReviewVariant.run(photoId, width, format, mimeType, buffer, Date.now());
}

const stmtFotoQualquer = db.prepare(`SELECT mime_type, data FROM review_photos WHERE id = ?`);
function getReviewPhoto(id){ return stmtFotoQualquer.get(id) || null; }

const stmtListaAvaliacoesPainel = db.prepare(`
  SELECT id, order_reference, product_id, rating, comment, photo_id, photo_consent_at,
         status, customer_first_name, customer_city, created_at, published_at
    FROM reviews
   ORDER BY CASE status WHEN 'pendente' THEN 0 ELSE 1 END, created_at DESC
   LIMIT 500
`);
function listarAvaliacoesPainel(){ return stmtListaAvaliacoesPainel.all(); }

const stmtStatusAvaliacao = db.prepare(`
  UPDATE reviews SET status = ?,
         published_at = CASE WHEN ? = 'publicada' THEN COALESCE(published_at, ?) ELSE published_at END
   WHERE id = ?
`);
function mudarStatusAvaliacao(id, status){
  return stmtStatusAvaliacao.run(status, status, Date.now(), id).changes > 0;
}

const stmtTiraFotoDaAvaliacao = db.prepare(`UPDATE reviews SET photo_id = NULL WHERE id = ?`);
const stmtFotoDaAvaliacao = db.prepare(`SELECT photo_id FROM reviews WHERE id = ?`);
const stmtApagaFotoOrfa = db.prepare(`
  DELETE FROM review_photos WHERE id = ?1
     AND NOT EXISTS (SELECT 1 FROM reviews WHERE photo_id = ?1)
     AND NOT EXISTS (SELECT 1 FROM depoimentos WHERE photo_id = ?1)
`);
function tirarFotoDaAvaliacao(id){
  const photoId = stmtFotoDaAvaliacao.get(id)?.photo_id;
  stmtTiraFotoDaAvaliacao.run(id);
  if(photoId) stmtApagaFotoOrfa.run(photoId);
}
function apagarFotoOrfaDeAvaliacao(photoId){ stmtApagaFotoOrfa.run(photoId); }
const stmtApagaAvaliacao = db.prepare(`DELETE FROM reviews WHERE id = ?`);
function excluirAvaliacao(id){
  const photoId = stmtFotoDaAvaliacao.get(id)?.photo_id;
  const apagou = stmtApagaAvaliacao.run(id).changes > 0;
  if(photoId) stmtApagaFotoOrfa.run(photoId);
  return apagou;
}

const stmtAvaliacoesPublicadas = db.prepare(`
  SELECT id, product_id, rating, comment, photo_id, customer_first_name, customer_city, published_at
    FROM reviews WHERE status = 'publicada'
   ORDER BY published_at DESC LIMIT ?
`);
function avaliacoesPublicadas(limite = 6){ return stmtAvaliacoesPublicadas.all(limite); }

const stmtAvaliacoesDoProduto = db.prepare(`
  SELECT rating, comment, customer_first_name, customer_city
    FROM reviews WHERE status = 'publicada' AND product_id = ?
   ORDER BY published_at DESC LIMIT ?
`);
const stmtNotaDoProduto = db.prepare(
  `SELECT COUNT(*) AS total, AVG(rating) AS media FROM reviews WHERE status = 'publicada' AND product_id = ?`
);
function avaliacoesDoProduto(productId, limite = 6){
  const r = stmtNotaDoProduto.get(productId);
  return { total: r?.total || 0, media: r?.total ? r.media : 0, itens: stmtAvaliacoesDoProduto.all(productId, limite) };
}

const stmtNotaMedia = db.prepare(
  `SELECT COUNT(*) AS total, AVG(rating) AS media FROM reviews WHERE status = 'publicada'`
);
function notaMedia(){
  const r = stmtNotaMedia.get();
  return { total: r?.total || 0, media: r?.total ? r.media : null };
}

const stmtNotaPorPedido = db.prepare(`
  SELECT order_reference, ROUND(AVG(rating), 1) AS media, COUNT(*) AS total
    FROM reviews GROUP BY order_reference
`);
function notasPorPedido(){
  const mapa = new Map();
  for(const r of stmtNotaPorPedido.all()) mapa.set(r.order_reference, { media: r.media, total: r.total });
  return mapa;
}

const stmtContaPendentes = db.prepare(`SELECT COUNT(*) AS n FROM reviews WHERE status = 'pendente'`);
function contarAvaliacoesPendentes(){ return stmtContaPendentes.get()?.n || 0; }

const DIA_MS = 24 * 60 * 60 * 1000;

const stmtPostadosAntigos = db.prepare(`
  SELECT external_reference, customer_email, shipping_json, shipped_at, address_json
    FROM orders
   WHERE status = 'pago' AND fulfillment_status = 'postado'
     AND customer_email IS NOT NULL AND customer_email <> ''
     AND shipped_at IS NOT NULL AND shipped_at >= ?
`);
function pedidosParaConfirmarRecebimento(agora = Date.now(), folgaDias = 3){
  return stmtPostadosAntigos.all(agora - 45 * DIA_MS).filter(p => {
    let prazo = 7;
    try{
      const dias = diasDoFrete(JSON.parse(p.shipping_json));
      if(dias) prazo = dias;
    }catch{}
    return p.shipped_at + (prazo + folgaDias) * DIA_MS <= agora;
  });
}

const stmtEntreguesSemAvaliacao = db.prepare(`
  SELECT o.external_reference, o.customer_email, o.items_json, o.address_json
    FROM orders o
   WHERE o.status = 'pago' AND o.fulfillment_status = 'entregue'
     AND o.customer_email IS NOT NULL AND o.customer_email <> ''
     AND COALESCE(o.delivered_at, o.updated_at) BETWEEN ? AND ?
     AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.order_reference = o.external_reference)
`);
function pedidosParaPedirAvaliacao(agora = Date.now(), esperaDias = 2){
  return stmtEntreguesSemAvaliacao.all(agora - 30 * DIA_MS, agora - esperaDias * DIA_MS);
}

const stmtCarrinhosEsquecidos = db.prepare(`
  SELECT o.external_reference, o.customer_email, o.items_json, o.address_json,
         o.total, o.created_at
    FROM orders o
   WHERE o.status = 'pendente'
     AND o.customer_email IS NOT NULL AND o.customer_email <> ''
     AND o.created_at BETWEEN ? AND ?
     AND NOT EXISTS (
       SELECT 1 FROM orders pago
        WHERE pago.status = 'pago' AND pago.created_at >= o.created_at
          AND (pago.customer_email = o.customer_email
               OR (o.user_id IS NOT NULL AND pago.user_id = o.user_id))
     )
     AND NOT EXISTS (
       SELECT 1 FROM email_outbox e
        WHERE e.kind = 'carrinho_esquecido'
          AND e.to_email = o.customer_email
          AND e.created_at >= ?
     )
     AND NOT EXISTS (
       SELECT 1 FROM newsletter_subscribers n
        WHERE n.email = o.customer_email AND n.unsubscribed_at IS NOT NULL
     )
   ORDER BY o.created_at
`);
function pedidosParaLembrarCarrinho(agora = Date.now(), esperaHoras = 8, janelaDias = 3, capDias = 30){
  return stmtCarrinhosEsquecidos.all(
    agora - janelaDias * DIA_MS,
    agora - esperaHoras * 60 * 60 * 1000,
    agora - capDias * DIA_MS
  );
}

const stmtCarrinhoPendente = db.prepare(`
  SELECT items_json FROM orders
   WHERE external_reference = ? AND status = 'pendente' AND created_at >= ?
`);
function itensDoCarrinhoEsquecido(referencia, agora = Date.now(), janelaDias = 14){
  const linha = stmtCarrinhoPendente.get(referencia, agora - janelaDias * DIA_MS);
  if(!linha) return null;
  try{
    return JSON.parse(linha.items_json)
      .map(i => ({
        id: Number(i.id),
        qty: Number(i.qty),
        ...(i.escolhas ? { escolhas: { ...i.escolhas, personalizacao: { ...(i.escolhas.personalizacao || {}), fotos: [] } } } : {}),
      }))
      .filter(i => Number.isInteger(i.id) && Number.isInteger(i.qty) && i.qty > 0);
  }catch{
    return null;
  }
}

const stmtCriaCampanha = db.prepare(`
  INSERT INTO campanhas (assunto, chamada, corpo, produtos, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const stmtListaCampanhas = db.prepare(`SELECT * FROM campanhas ORDER BY created_at DESC`);
const stmtGetCampanha = db.prepare(`SELECT * FROM campanhas WHERE id = ?`);
const stmtAtualizaCampanha = db.prepare(`
  UPDATE campanhas SET assunto = ?, chamada = ?, corpo = ?, produtos = ?, updated_at = ?
   WHERE id = ? AND status = 'rascunho'
`);
const stmtApagaCampanha = db.prepare(`DELETE FROM campanhas WHERE id = ? AND status IN ('rascunho', 'cancelada')`);
const stmtMudaStatusCampanha = db.prepare(`
  UPDATE campanhas SET status = ?, updated_at = ?,
         iniciada_em = COALESCE(iniciada_em, ?),
         concluida_em = CASE WHEN ? IN ('concluida', 'cancelada') THEN ? ELSE concluida_em END
   WHERE id = ?
`);

function criarCampanha({ assunto, chamada, corpo, produtos }){
  const agora = Date.now();
  const r = stmtCriaCampanha.run(assunto, chamada ?? null, corpo,
    JSON.stringify(Array.isArray(produtos) ? produtos : []), agora, agora);
  return getCampanha(Number(r.lastInsertRowid));
}
function listarCampanhas(){ return stmtListaCampanhas.all(); }
function getCampanha(id){ return stmtGetCampanha.get(id) || null; }
function atualizarCampanha(id, { assunto, chamada, corpo, produtos }){
  stmtAtualizaCampanha.run(assunto, chamada ?? null, corpo,
    JSON.stringify(Array.isArray(produtos) ? produtos : []), Date.now(), id);
  return getCampanha(id);
}
function removerCampanha(id){ return stmtApagaCampanha.run(id).changes > 0; }
function mudarStatusCampanha(id, status){
  const agora = Date.now();
  stmtMudaStatusCampanha.run(status, agora, agora, status, agora, id);
  return getCampanha(id);
}

const stmtAssinantesAtivas = db.prepare(`
  SELECT email FROM newsletter_subscribers
   WHERE unsubscribed_at IS NULL AND opt_in_at IS NOT NULL
   ORDER BY created_at
`);
function assinantesAtivas(){ return stmtAssinantesAtivas.all().map(r => r.email); }

const stmtEstaDescadastrada = db.prepare(
  `SELECT 1 FROM newsletter_subscribers WHERE email = ? AND unsubscribed_at IS NOT NULL`
);
function pediuDescadastro(email){ return Boolean(stmtEstaDescadastrada.get(email)); }

const stmtInsereDestinatario = db.prepare(
  `INSERT OR IGNORE INTO campanha_destinatarios (campanha_id, email) VALUES (?, ?)`
);
function prepararEnvioDaCampanha(id){
  const emails = assinantesAtivas();
  db.exec("BEGIN");
  try {
    for(const email of emails) stmtInsereDestinatario.run(id, email);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  mudarStatusCampanha(id, "enviando");
  return emails.length;
}

const stmtDestinatariosPendentes = db.prepare(`
  SELECT email FROM campanha_destinatarios
   WHERE campanha_id = ? AND enfileirado_em IS NULL
   ORDER BY email
   LIMIT ?
`);
function destinatariosPendentes(id, limite){
  return stmtDestinatariosPendentes.all(id, limite).map(r => r.email);
}

const stmtMarcaDestinatario = db.prepare(`
  UPDATE campanha_destinatarios SET enfileirado_em = ?
   WHERE campanha_id = ? AND email = ?
`);
function marcarDestinatarioEnfileirado(id, email){
  stmtMarcaDestinatario.run(Date.now(), id, email);
}

const stmtCampanhasEnviando = db.prepare(
  `SELECT * FROM campanhas WHERE status = 'enviando' ORDER BY iniciada_em`
);
function campanhasEnviando(){ return stmtCampanhasEnviando.all(); }

const stmtContagemCampanha = db.prepare(`
  SELECT
    (SELECT COUNT(*) FROM campanha_destinatarios WHERE campanha_id = :id) AS total,
    (SELECT COUNT(*) FROM campanha_destinatarios WHERE campanha_id = :id AND enfileirado_em IS NOT NULL) AS enfileirados,
    (SELECT COUNT(*) FROM email_outbox WHERE kind = 'campanha' AND order_reference LIKE :prefixo AND sent_at IS NOT NULL) AS enviados,
    (SELECT COUNT(*) FROM email_outbox WHERE kind = 'campanha' AND order_reference LIKE :prefixo AND sent_at IS NULL AND attempts >= :maxTentativas) AS falharam,
    (SELECT MAX(last_error) FROM email_outbox WHERE kind = 'campanha' AND order_reference LIKE :prefixo AND sent_at IS NULL) AS ultimo_erro
`);
function contagemDaCampanha(id){
  return stmtContagemCampanha.get({
    id, prefixo: `campanha:${id}:%`, maxTentativas: MAX_TENTATIVAS_EMAIL,
  });
}

const stmtApagaFilaDaCampanha = db.prepare(`
  DELETE FROM email_outbox
   WHERE kind = 'campanha' AND sent_at IS NULL AND order_reference LIKE ?
`);
function apagarFilaDaCampanha(id){
  return stmtApagaFilaDaCampanha.run(`campanha:${id}:%`).changes;
}

const stmtPegaTrava = db.prepare(`
  INSERT INTO app_state (chave, valor, updated_at) VALUES (?, ?, ?)
  ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, updated_at = excluded.updated_at
   WHERE CAST(app_state.valor AS INTEGER) <= ?
`);
function tentarTravarRodada(chave, duracaoMs = 10 * 60 * 1000){
  const agora = Date.now();
  return stmtPegaTrava.run(chave, String(agora + duracaoMs), agora, agora).changes > 0;
}
const stmtSoltaTrava = db.prepare(`DELETE FROM app_state WHERE chave = ?`);
function destravarRodada(chave){ stmtSoltaTrava.run(chave); }

const stmtGravaEstado = db.prepare(`
  INSERT INTO app_state (chave, valor, updated_at) VALUES (?, ?, ?)
  ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, updated_at = excluded.updated_at
`);
const stmtLeEstado = db.prepare(`SELECT valor, updated_at FROM app_state WHERE chave = ?`);
function gravarEstado(chave, valor){ stmtGravaEstado.run(chave, valor == null ? null : String(valor), Date.now()); }
function lerEstado(chave){ return stmtLeEstado.get(chave) || null; }

const MAX_TENTATIVAS_EMAIL = 5;

const stmtEnfileiraEmail = db.prepare(`
  INSERT OR IGNORE INTO email_outbox
    (kind, to_email, subject, text_body, html_body, order_reference, next_attempt_at, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
function enqueueEmail({ kind, toEmail, subject, textBody, htmlBody, orderReference }){
  const agora = Date.now();
  const r = stmtEnfileiraEmail.run(
    kind, toEmail, subject, textBody, htmlBody, orderReference ?? null, agora, agora
  );
  return r.changes > 0 ? Number(r.lastInsertRowid) : null;
}

const stmtEmailDoPedido = db.prepare(
  `SELECT * FROM email_outbox WHERE kind = ? AND order_reference = ?`
);
function getOutboxEntry(kind, orderReference){
  if(!orderReference) return null;
  return stmtEmailDoPedido.get(kind, orderReference) || null;
}

const stmtApagaEmailDoPedido = db.prepare(
  `DELETE FROM email_outbox WHERE kind = ? AND order_reference = ?`
);
function deleteOutboxEntry(kind, orderReference){
  if(!orderReference) return 0;
  return stmtApagaEmailDoPedido.run(kind, orderReference).changes;
}

const stmtEmailsPendentes = db.prepare(`
  SELECT * FROM email_outbox
   WHERE sent_at IS NULL AND attempts < ? AND next_attempt_at <= ?
   ORDER BY (kind = 'campanha') ASC, id ASC
   LIMIT ?
`);
const ALUGUEL_DE_ENVIO_MS = 10 * 60 * 1000;
const stmtReivindicaEmail = db.prepare(
  `UPDATE email_outbox SET next_attempt_at = ? WHERE id = ? AND sent_at IS NULL AND next_attempt_at <= ?`
);
function pendingEmails(limite = 20){
  const agora = Date.now();
  const candidatos = stmtEmailsPendentes.all(MAX_TENTATIVAS_EMAIL, agora, limite);
  const meus = [];
  db.exec("BEGIN IMMEDIATE");
  try {
    for(const linha of candidatos){
      if(stmtReivindicaEmail.run(agora + ALUGUEL_DE_ENVIO_MS, linha.id, agora).changes > 0){
        meus.push(linha);
      }
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return meus;
}

const stmtAvisosPresos = db.prepare(`
  SELECT COUNT(*) AS presos,
         MAX(last_error) AS ultimo_erro,
         MAX(created_at) AS mais_recente
    FROM email_outbox
   WHERE sent_at IS NULL AND kind IN ('aviso_venda', 'aviso_contato')
`);
const stmtUltimoAvisoEnviado = db.prepare(`
  SELECT sent_at FROM email_outbox
   WHERE sent_at IS NOT NULL AND kind IN ('aviso_venda', 'aviso_contato')
   ORDER BY sent_at DESC LIMIT 1
`);
function avisosDaLojista(){
  const fila = stmtAvisosPresos.get() || {};
  return {
    presos: fila.presos || 0,
    ultimoErro: fila.ultimo_erro || null,
    ultimoEnviadoEm: stmtUltimoAvisoEnviado.get()?.sent_at || null,
  };
}

const stmtEmailPorId = db.prepare(`SELECT * FROM email_outbox WHERE id = ?`);
function getOutboxEmail(id){ return stmtEmailPorId.get(id) || null; }

const stmtEmailEnviado = db.prepare(
  `UPDATE email_outbox SET sent_at = ?, last_error = NULL WHERE id = ?`
);
function markEmailSent(id){ stmtEmailEnviado.run(Date.now(), id); }

const stmtEmailFalhou = db.prepare(
  `UPDATE email_outbox
      SET attempts = attempts + 1, next_attempt_at = ?, last_error = ?
    WHERE id = ?`
);
const stmtAdiaEmail = db.prepare(`UPDATE email_outbox SET next_attempt_at = ? WHERE id = ?`);
function adiarEmail(id, quando){ stmtAdiaEmail.run(quando, id); }

function markEmailFailed(id, erro){
  const linha = getOutboxEmail(id);
  const tentativas = (linha ? linha.attempts : 0) + 1;
  const espera = 5 * 60 * 1000 * Math.pow(3, tentativas - 1);
  stmtEmailFalhou.run(Date.now() + espera, String(erro).slice(0, 500), id);
}

const DIAS_FOTOS_APOS_ENTREGA = 60;
const HORAS_FOTO_SEM_PEDIDO = 48;
const DIAS_FOTO_PEDIDO_NAO_PAGO = 15;
const stmtInsereFotoPersonalizacao = db.prepare(`
  INSERT INTO personalizacao_fotos (id, chave_hash, mime_type, data, miniatura, largura, altura, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const stmtLeFotoPersonalizacao = db.prepare(`SELECT * FROM personalizacao_fotos WHERE id = ?`);
const stmtFotosDoPedido = db.prepare(`SELECT id, mime_type, largura, altura, created_at FROM personalizacao_fotos WHERE pedido = ? ORDER BY created_at`);
const stmtVinculaFoto = db.prepare(`UPDATE personalizacao_fotos SET pedido = ? WHERE id = ? AND (pedido IS NULL OR pedido = ?)`);
const stmtAgendarApagarFotos = db.prepare(`UPDATE personalizacao_fotos SET apagar_em = ? WHERE pedido = ?`);
const stmtApagaFotosVencidas = db.prepare(`
  DELETE FROM personalizacao_fotos
   WHERE (pedido IS NULL AND created_at < ?)
      OR (apagar_em IS NOT NULL AND apagar_em < ?)
      OR (pedido IS NOT NULL AND apagar_em IS NULL AND created_at < ?
          AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.external_reference = personalizacao_fotos.pedido AND o.status = 'pago'))
`);
const stmtBytesDeFotosSoltas = db.prepare(
  `SELECT COALESCE(SUM(length(data) + COALESCE(length(miniatura), 0)), 0) AS bytes FROM personalizacao_fotos WHERE pedido IS NULL`
);
function bytesDeFotosSoltas(){
  return Number(stmtBytesDeFotosSoltas.get().bytes || 0);
}
function inserirFotoPersonalizacao({ id, chaveHash, mimeType, data, miniatura, largura, altura }){
  stmtInsereFotoPersonalizacao.run(id, chaveHash, mimeType, data, miniatura, largura, altura, Date.now());
}
function lerFotoPersonalizacao(id){
  return stmtLeFotoPersonalizacao.get(id) || null;
}
function fotosPersonalizacaoDoPedido(pedido){
  return stmtFotosDoPedido.all(pedido);
}
function vincularFotosAoPedido(ids, pedido){
  let vinculadas = 0;
  for(const id of ids) vinculadas += Number(stmtVinculaFoto.run(pedido, id, pedido).changes || 0);
  return vinculadas;
}
function apagarFotosPersonalizacaoVencidas(agora = Date.now()){
  return Number(stmtApagaFotosVencidas.run(
    agora - HORAS_FOTO_SEM_PEDIDO * 3600000,
    agora,
    agora - DIAS_FOTO_PEDIDO_NAO_PAGO * 86400000,
  ).changes || 0);
}

function prazoDeProducao(){
  const linha = lerEstado("prazo_producao");
  const dias = linha ? Number(linha.valor) : NaN;
  return Number.isInteger(dias) && dias > 0 ? dias : null;
}
function freteGratisAcima(){
  const linha = lerEstado("frete_gratis_acima");
  const valor = linha ? Number(linha.valor) : NaN;
  return Number.isFinite(valor) && valor > 0 ? valor : null;
}
function definirFreteGratisAcima(valor){
  gravarEstado("frete_gratis_acima", Number.isFinite(valor) && valor > 0 ? valor : null);
}
function definirPrazoDeProducao(dias){
  gravarEstado("prazo_producao", Number.isInteger(dias) && dias > 0 ? dias : null);
}

function catalogVersion(){
  const p = db.prepare("SELECT COUNT(*) AS n, IFNULL(MAX(updated_at), 0) AS t FROM product_overrides").get();
  const c = db.prepare("SELECT COUNT(*) AS n, IFNULL(MAX(updated_at), 0) AS t FROM custom_products").get();
  const k = db.prepare("SELECT IFNULL(GROUP_CONCAT(slug || ':' || label), '') AS s FROM custom_categories").get();
  return `${p.n}.${p.t}|${c.n}.${c.t}|${k.s.length}.${hashCurto(k.s)}`;
}

function hashCurto(texto){
  let h = 5381;
  for(let i = 0; i < texto.length; i++) h = ((h * 33) ^ texto.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

const COLUNAS_DA_ESTAMPA = `id, nome, colecao, preco, ativa, exemplo, position, largura, altura, original_mime, created_at, updated_at`;
const stmtListaEstampas = db.prepare(`SELECT ${COLUNAS_DA_ESTAMPA} FROM estampas ORDER BY position, created_at`);
const stmtLeEstampa = db.prepare(`SELECT ${COLUNAS_DA_ESTAMPA} FROM estampas WHERE id = ?`);
const stmtImagensDaEstampa = {
  original: db.prepare(`SELECT original_mime AS mime, original AS data FROM estampas WHERE id = ?`),
  textura: db.prepare(`SELECT 'image/jpeg' AS mime, textura AS data FROM estampas WHERE id = ?`),
  miniatura: db.prepare(`SELECT 'image/webp' AS mime, miniatura AS data FROM estampas WHERE id = ?`),
};
const stmtInsereEstampa = db.prepare(
  `INSERT INTO estampas (id, nome, colecao, preco, ativa, exemplo, position, largura, altura, original_mime, original, textura, miniatura, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, (SELECT IFNULL(MAX(position), -1) + 1 FROM estampas), ?, ?, ?, ?, ?, ?, ?, ?)`
);
const stmtAtualizaEstampa = db.prepare(`UPDATE estampas SET nome = ?, colecao = ?, preco = ?, ativa = ?, updated_at = ? WHERE id = ?`);
const stmtApagaEstampa = db.prepare(`DELETE FROM estampas WHERE id = ?`);
const stmtMoveEstampa = db.prepare(`UPDATE estampas SET position = ?, updated_at = ? WHERE id = ?`);
const stmtPedidosComEstampa = db.prepare(
  `SELECT COUNT(*) AS n FROM orders WHERE status = 'pago' AND IFNULL(fulfillment_status, '') <> 'entregue' AND items_json LIKE ?`
);
const stmtVersaoEstampas = db.prepare(`SELECT COUNT(*) AS n, IFNULL(MAX(updated_at), 0) AS t FROM estampas`);

function linhaDeEstampa(l){
  return l ? { ...l, ativa: Boolean(l.ativa), exemplo: Boolean(l.exemplo) } : null;
}
function listarEstampas(){ return stmtListaEstampas.all().map(linhaDeEstampa); }
function lerEstampa(id){ return linhaDeEstampa(stmtLeEstampa.get(id)); }
function imagemDaEstampa(id, tipo){
  const stmt = stmtImagensDaEstampa[tipo];
  return stmt ? stmt.get(id) || null : null;
}
function inserirEstampa(e){
  const agora = Date.now();
  stmtInsereEstampa.run(e.id, e.nome, e.colecao, e.preco || 0, e.ativa === false ? 0 : 1, e.exemplo ? 1 : 0, e.largura, e.altura, e.originalMime, e.original, e.textura, e.miniatura, agora, agora);
}
function atualizarEstampa(id, campos){
  return stmtAtualizaEstampa.run(campos.nome, campos.colecao, campos.preco || 0, campos.ativa ? 1 : 0, Date.now(), id).changes > 0;
}
function apagarEstampa(id){ return stmtApagaEstampa.run(id).changes > 0; }
function pedidosAbertosComEstampa(id){ return stmtPedidosComEstampa.get(`%"estampa":"${id}"%`).n; }
function ordenarEstampas(ids){
  const agora = Date.now();
  db.exec("BEGIN");
  try { ids.forEach((id, i) => stmtMoveEstampa.run(i, agora, id)); db.exec("COMMIT"); }
  catch (err) { db.exec("ROLLBACK"); throw err; }
}
function versaoDasEstampas(){
  const v = stmtVersaoEstampas.get();
  return `${v.n}.${v.t}`;
}

const CAMPOS_CIFRADOS = {
  users: ["cpf", "saved_address_json", "totp_secret", "totp_pendente"],
  orders: ["address_json", "customer_phone"],
  instagram_tokens: ["access_token"],
};
const CHAVE_PRIMARIA = { users: "id", orders: "external_reference", instagram_tokens: "id" };

function regravarComChaveAtual({ forcar = false, lote = 200 } = {}){
  if(!cofre.ativo()) return { regravados: 0, indices: 0 };
  const atual = cofre.idAtual();
  let regravados = 0;
  for(const [tabela, campos] of Object.entries(CAMPOS_CIFRADOS)){
    const pk = CHAVE_PRIMARIA[tabela];
    const condicao = campos.map(c => `(${c} IS NOT NULL AND ${c} <> '' AND (${c} NOT LIKE 'cf1.%' ${forcar ? "OR 1 = 1" : `OR ${c} NOT LIKE 'cf1.${atual}.%'`}))`).join(" OR ");
    const ler = prepararSemCofre(`SELECT ${pk} AS pk, ${campos.join(", ")} FROM ${tabela} WHERE ${condicao} LIMIT ?`);
    const gravar = prepararSemCofre(`UPDATE ${tabela} SET ${campos.map(c => `${c} = ?`).join(", ")} WHERE ${pk} = ?`);
    for(;;){
      const linhas = ler.all(lote);
      if(!linhas.length) break;
      db.exec("BEGIN");
      try {
        for(const linha of linhas){
          const valores = campos.map(c => {
            const v = linha[c];
            if(v == null || v === "") return v;
            const aberto = cofre.decifrar(v);
            return cofre.cifrar(aberto);
          });
          gravar.run(...valores, linha.pk);
          regravados++;
        }
        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
      if(linhas.length < lote) break;
    }
  }
  const telefones = prepararSemCofre(`SELECT external_reference, customer_phone FROM orders WHERE customer_phone IS NOT NULL`).all();
  const gravarIndice = prepararSemCofre(`UPDATE orders SET customer_phone_indice = ? WHERE external_reference = ?`);
  let indices = 0;
  for(const linha of telefones){
    gravarIndice.run(cofre.indiceCego(cofre.decifrar(linha.customer_phone)), linha.external_reference);
    indices++;
  }
  const reservas = prepararSemCofre(`SELECT rowid AS id, telefone FROM cupons_reservados WHERE telefone IS NOT NULL AND telefone NOT LIKE 'ix1.%'`).all();
  const gravarReserva = prepararSemCofre(`UPDATE cupons_reservados SET telefone = ? WHERE rowid = ?`);
  for(const r of reservas) gravarReserva.run(cofre.indiceCego(r.telefone), r.id);
  return { regravados, indices };
}

function dadosAbertosQueSobraram(){
  if(!cofre.ativo()) return null;
  const atual = cofre.idAtual();
  let total = 0;
  for(const [tabela, campos] of Object.entries(CAMPOS_CIFRADOS)){
    const condicao = campos.map(c => `(${c} IS NOT NULL AND ${c} <> '' AND ${c} NOT LIKE 'cf1.${atual}.%')`).join(" OR ");
    total += prepararSemCofre(`SELECT COUNT(*) AS n FROM ${tabela} WHERE ${condicao}`).get().n;
  }
  return total;
}

if(cofre.ativo()){
  const resultado = regravarComChaveAtual();
  if(resultado.regravados) console.log(`Cofre: ${resultado.regravados} registro(s) com dados pessoais agora guardados criptografados.`);
} else {
  db.exec(`UPDATE orders SET customer_phone_indice = customer_phone WHERE customer_phone IS NOT NULL AND customer_phone_indice IS NULL AND customer_phone NOT LIKE 'cf1.%'`);
  const trancados = Object.entries(CAMPOS_CIFRADOS).reduce((soma, [tabela, campos]) =>
    soma + prepararSemCofre(`SELECT COUNT(*) AS n FROM ${tabela} WHERE ${campos.map(c => `${c} LIKE 'cf1.%'`).join(" OR ")}`).get().n, 0);
  if(trancados) console.error(`🔴 Há ${trancados} registro(s) criptografados, mas CHAVES_DADOS não está definida. Coloque a chave de volta na hospedagem.`);
}

module.exports = {
  regravarComChaveAtual,
  dadosAbertosQueSobraram,
  listarEstampas,
  lerEstampa,
  imagemDaEstampa,
  inserirEstampa,
  atualizarEstampa,
  apagarEstampa,
  pedidosAbertosComEstampa,
  ordenarEstampas,
  versaoDasEstampas,
  avaliacoesDoProduto,
  DIAS_FOTOS_APOS_ENTREGA,
  inserirFotoPersonalizacao,
  lerFotoPersonalizacao,
  fotosPersonalizacaoDoPedido,
  vincularFotosAoPedido,
  apagarFotosPersonalizacaoVencidas,
  prazoDeProducao,
  definirPrazoDeProducao,
  freteGratisAcima,
  definirFreteGratisAcima,
  garantirTokenDeAvaliacao,
  tokenDeAvaliacaoConfere,
  salvarAvaliacao,
  avaliacoesDoPedido,
  insertReviewPhoto,
  getReviewPhotoPublicada,
  getReviewPhotoVariant,
  saveReviewPhotoVariant,
  getReviewPhoto,
  listarAvaliacoesPainel,
  mudarStatusAvaliacao,
  tirarFotoDaAvaliacao,
  excluirAvaliacao,
  apagarFotoOrfaDeAvaliacao,
  avaliacoesPublicadas,
  notaMedia,
  notasPorPedido,
  contarAvaliacoesPendentes,
  pedidosParaConfirmarRecebimento,
  pedidosParaPedirAvaliacao,
  pedidosParaLembrarCarrinho,
  criarCampanha,
  listarCampanhas,
  getCampanha,
  atualizarCampanha,
  removerCampanha,
  mudarStatusCampanha,
  assinantesAtivas,
  pediuDescadastro,
  prepararEnvioDaCampanha,
  destinatariosPendentes,
  marcarDestinatarioEnfileirado,
  campanhasEnviando,
  contagemDaCampanha,
  apagarFilaDaCampanha,
  itensDoCarrinhoEsquecido,
  tentarTravarRodada,
  destravarRodada,
  gravarEstado,
  lerEstado,
  catalogVersion,
  enqueueEmail,
  deleteOutboxEntry,
  getOutboxEntry,
  pendingEmails,
  avisosDaLojista,
  getOutboxEmail,
  markEmailSent,
  markEmailFailed,
  adiarEmail,
  createUser,
  getUserByEmail,
  getUserByGoogleId,
  setUserGoogleId,
  getUserById,
  getSavedAddress,
  saveAddress,
  listUsersForExport,
  listAccountsForAdmin,
  createSession,
  getSessionByTokenHash,
  deleteSession,
  deleteAllSessionsForUser,
  marcarUsoDaSessao,
  marcarReautenticacao,
  listarSessoesDoUsuario,
  apagarSessaoDoUsuario,
  apagarTodasAsSessoes,
  guardarTotpPendente,
  limparTotpPendente,
  registrarPassoTotp,
  falhasDaConta,
  trocarCodigosDeRecuperacao,
  marcarSenhaRedefinida,
  guardarCodigoDoPainel,
  criarVerificacaoDeEmail,
  consumirVerificacaoDeEmail,
  contarTentativaDoCodigoDoPainel,
  limparCodigoDoPainel,
  createPasswordReset,
  getPasswordReset,
  deletePasswordReset,
  deletePasswordResetsForUser,
  updateUserPassword,
  updatePerfil,
  hasUsedCouponSince,
  CUPOM_ANIVERSARIO,
  updateUserEmail,
  aniversariantesDoDia,
  deleteOtherSessions,
  deleteUserAccount,
  recordLoginAttempt,
  getLoginLockout,
  listRecentLoginAttempts,
  pruneLoginAttempts,
  setUserTotp,
  createTwoFactorChallenge,
  getTwoFactorChallenge,
  deleteTwoFactorChallenge,
  setTwoFactorEmailCode,
  incrementTwoFactorEmailCodeAttempts,
  createOrder,
  getOrderByExternalReference,
  updateOrderStatus,
  updateOrderDraft,
  listOrdersByUser,
  listAllOrders,
  updateOrderTracking,
  markOrderInProduction,
  marcarArteAprovada,
  marcarPronto,
  listOrdersAwaitingDelivery,
  markOrderDelivered,
  setMelhorEnvioShipmentId,
  getOrderStats,
  deleteOrder,
  registrarPagamentoMp,
  listarPagamentosDoPedido,
  trocarStatusDoPedido,
  reservarEfeitosDoPagamento,
  reservarEtiqueta,
  soltarEtiqueta,
  arquivarPedido,
  pedidoJaFoiPago,
  esvaziarEmailsEnviados,
  linkDeAvaliacaoVenceu,
  bytesDeFotosSoltas,
  reservarCupom,
  liberarCupomDoPedido,
  cupomJaUsadoEmOutroPedidoPago,
  inserirEventoDeSeguranca,
  listarEventosDeSeguranca,
  contarEventosDeSeguranca,
  podarEventosDeSeguranca,
  hasUsedCoupon,
  insertProductPhoto,
  getProductPhoto,
  deleteProductPhoto,
  getProductPhotoVariant,
  listHeroPhotos,
  countHeroPhotos,
  getHeroPhoto,
  insertHeroPhoto,
  updateHeroPhoto,
  deleteHeroPhoto,
  setHeroPhotoOrder,
  getHeroPhotoVariant,
  saveHeroPhotoVariant,
  heroVersion,
  listarDepoimentos,
  depoimentosPublicados,
  contarDepoimentosPublicados,
  getDepoimento,
  criarDepoimento,
  atualizarDepoimento,
  removerDepoimento,
  setOrdemDepoimentos,
  getFotoDeDepoimentoPublicado,
  saveProductPhotoVariant,
  listProductOverrides,
  upsertProductOverride,
  setProductsOrder,
  listCustomProducts,
  getCustomProduct,
  insertCustomProduct,
  updateCustomProduct,
  deleteCustomProduct,
  listCustomCategories,
  insertCustomCategory,
  updateCustomCategoryLabel,
  deleteCustomCategory,
  countProductsUsingCategory,
  listCustomColors,
  insertCustomColor,
  deleteCustomColor,
  addNewsletterSubscriber,
  listNewsletterSubscribers,
  getOrCreateUnsubscribeToken,
  garantirTokenDeContato,
  unsubscribeNewsletter,
  createContactMessage,
  listContactMessages,
  getContactMessage,
  deleteContactMessage,
  getCoupon,
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getInstagramToken,
  saveInstagramToken,
  deleteInstagramToken,
};
