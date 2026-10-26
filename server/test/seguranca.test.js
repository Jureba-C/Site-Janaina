const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");

const RAIZ = path.join(__dirname, "..");
const PORT = 39576;
const ORIGIN = `http://localhost:${PORT}`;
const TMP_DB = path.join(os.tmpdir(), `plc-seg-${process.pid}-${Date.now()}.db`);

let child;

before(async () => {
  child = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server.js"], {
    cwd: RAIZ,
    env: {
      ...process.env,
      DB_PATH: TMP_DB, PORT: String(PORT), CLIENT_ORIGIN: ORIGIN,
      ADMIN_2FA_REQUIRED: "false",
      ADMIN_EMAIL_HASHES: crypto.createHash("sha256").update("seg@test.com").digest("hex"),
      MP_ACCESS_TOKEN: "TEST-fake", NODE_ENV: "test",
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
  for(const s of ["", "-wal", "-shm"]) { try { fs.unlinkSync(TMP_DB + s); } catch {} }
});

const SEM_2FA_DE_PROPOSITO = new Set([
  "POST /api/admin/2fa/setup",
  "POST /api/admin/2fa/activate",
  "GET /api/admin/2fa/status",
]);

test("entrar com o Google recusa admin e quem tem verificação em duas etapas", () => {
  const fonte = fs.readFileSync(path.join(RAIZ, "server.js"), "utf8");
  const inicio = fonte.indexOf('app.post("/api/auth/google"');
  assert.ok(inicio > 0, "rota de login com o Google sumiu");
  const trecho = fonte.slice(inicio, inicio + 3000);
  assert.ok(/recusaGoogleParaContaProtegida/.test(trecho), "a recusa saiu da rota");

  const guarda = fonte.slice(fonte.indexOf("function recusaGoogleParaContaProtegida"));
  assert.ok(/isAdminEmail/.test(guarda.slice(0, 400)), "deixou de recusar e-mail de admin");
  assert.ok(/totp_secret/.test(guarda.slice(0, 400)), "deixou de recusar conta com 2FA");
});

test("não dá para se cadastrar com o e-mail de admin", async () => {
  const res = await fetch(`${ORIGIN}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
    body: JSON.stringify({
      name: "Invasora", email: "seg@test.com",
      password: "senha-123456", cpf: "39053344705", consent: true,
    }),
  });
  assert.equal(res.status, 409);
  const corpo = await res.json();
  assert.match(corpo.error, /já existe/i, "mensagem genérica, igual à de e-mail tomado");
  assert.equal(res.headers.getSetCookie?.().some(c => c.startsWith("plc_session=")) ?? false, false,
    "não pode sair sessão nenhuma");
});

test("o cookie de sessão só é Secure quando o site é https", () => {
  const fonte = fs.readFileSync(path.join(RAIZ, "lib", "auth.js"), "utf8");
  const i = fonte.indexOf("function cookieOptions");
  const trecho = fonte.slice(i, i + 400);
  assert.match(trecho, /secure:\s*emHttps\(\)/, "cookieOptions deixou de consultar o https");
  assert.match(fonte, /CLIENT_ORIGIN[^\n]*startsWith\("https:\/\/"\)/,
    "emHttps precisa olhar o CLIENT_ORIGIN, não só NODE_ENV");
});

test("toda rota /api/interno exige um segredo", () => {
  const fonte = fs.readFileSync(path.join(RAIZ, "server.js"), "utf8");
  const rotas = [...fonte.matchAll(/app\.(get|post|put|patch|delete)\(\s*"(\/api\/interno[^"]*)"/g)];
  assert.ok(rotas.length >= 1, "sumiu a rota interna? confira este teste");
  for(const [, , rota] of rotas){
    const i = fonte.indexOf(`"${rota}"`);
    const corpo = fonte.slice(i, i + 1500);
    assert.match(corpo, /CRON_SECRET/, `${rota} precisa conferir um segredo`);
    assert.match(corpo, /timingSafeEqual/, `${rota} precisa comparar em tempo constante`);
  }
});

test("toda rota /api/admin exige admin + verificação em duas etapas", () => {
  const fonte = fs.readFileSync(path.join(RAIZ, "server.js"), "utf8");
  const re = /app\.(get|post|put|patch|delete)\(\s*"(\/api\/admin[^"]*)"\s*,([^\n]*)/g;
  const achadas = [];
  for(const m of fonte.matchAll(re)){
    const [, metodo, rota, resto] = m;
    achadas.push({ chave: `${metodo.toUpperCase()} ${rota}`, resto });
  }
  assert.ok(achadas.length >= 35, `esperava dezenas de rotas de admin, achei ${achadas.length}`);

  const semAdmin = achadas.filter(r => !r.resto.includes("auth.requireAdmin"));
  assert.deepEqual(semAdmin.map(r => r.chave), [], "rota de admin sem requireAdmin");

  const sem2fa = achadas
    .filter(r => !r.resto.includes("requireAdminTwoFactor"))
    .map(r => r.chave)
    .filter(c => !SEM_2FA_DE_PROPOSITO.has(c));
  assert.deepEqual(sem2fa, [], "rota de admin sem requireAdminTwoFactor");

  for(const esperada of SEM_2FA_DE_PROPOSITO){
    assert.ok(achadas.some(r => r.chave === esperada),
      `${esperada} sumiu — revise a lista de exceções em vez de deixá-la desatualizada`);
  }
});

test("estourar o limite numa rota de API responde JSON, não a página 429", async () => {
  let resposta = null;
  for(let lote = 0; lote < 12 && !resposta; lote++){
    const respostas = await Promise.all(
      Array.from({ length: 50 }, () => fetch(`${ORIGIN}/api/products`).catch(() => null))
    );
    resposta = respostas.find(r => r && r.status === 429) || null;
  }
  assert.ok(resposta, "o limitador de /api não disparou em 600 requisições");

  const tipo = resposta.headers.get("content-type") || "";
  assert.match(tipo, /application\/json/,
    `429 de rota de API veio como "${tipo}" — sinal de que voltou a testar req.path`);
  const corpo = await resposta.json();
  assert.match(corpo.error, /Muitas requisições/);
});

const CSP_ESPERADA = {
  "default-src": "'self'",
  "base-uri": "'self'",
  "font-src": "'self'",
  "form-action": "'self'",
  "frame-ancestors": "'self'",
  "img-src": "'self' https: data: blob:",
  "object-src": "'none'",
  "script-src": "'self' https://sdk.mercadopago.com https://accounts.google.com",
  "script-src-attr": "'none'",
  "style-src": "'self' 'unsafe-inline' https://accounts.google.com",
  "connect-src": "'self' https://api.mercadopago.com https://viacep.com.br https://accounts.google.com",
  "frame-src": "https://www.mercadopago.com https://www.mercadopago.com.br https://accounts.google.com",
};

function lerCsp(texto){
  const mapa = {};
  for(const parte of texto.split(";")){
    const limpo = parte.trim();
    if(!limpo) continue;
    const espaco = limpo.indexOf(" ");
    if(espaco === -1) mapa[limpo] = "";
    else mapa[limpo.slice(0, espaco)] = limpo.slice(espaco + 1).trim();
  }
  return mapa;
}

test("a CSP do cabeçalho é exatamente a esperada", async () => {
  const res = await fetch(ORIGIN + "/");
  const bruta = res.headers.get("content-security-policy");
  assert.ok(bruta, "nenhuma CSP no cabeçalho");
  const atual = lerCsp(bruta);
  delete atual["upgrade-insecure-requests"];
  assert.deepEqual(atual, CSP_ESPERADA);
});

test("a política de janelas deixa o popup do Google devolver o login", async () => {
  const res = await fetch(ORIGIN + "/");
  assert.equal(res.headers.get("cross-origin-opener-policy"), "same-origin-allow-popups");
});

function fontes(valor){
  return new Set(String(valor).split(/\s+/).filter(Boolean));
}

function metaDaPagina(pagina){
  const html = fs.readFileSync(path.join(RAIZ, pagina), "utf8");
  const m = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]*)"/);
  return m ? lerCsp(m[1]) : null;
}

function paginasHtml(){
  const paginas = fs.readdirSync(RAIZ).filter(f => f.endsWith(".html")).sort();
  assert.ok(paginas.length >= 13, `esperava as páginas do site, achei ${paginas.length}`);
  return paginas;
}

test("nenhuma página pede no <meta> mais do que o cabeçalho permite", async () => {
  const res = await fetch(ORIGIN + "/");
  const cabecalho = lerCsp(res.headers.get("content-security-policy"));
  const excesso = [];

  for(const pagina of paginasHtml()){
    const meta = metaDaPagina(pagina);
    if(!meta) continue;
    for(const [diretiva, valor] of Object.entries(meta)){
      const permitido = fontes(cabecalho[diretiva] ?? cabecalho["default-src"]);
      for(const fonte of fontes(valor)){
        if(!permitido.has(fonte)) excesso.push(`${pagina} ${diretiva}: ${fonte}`);
      }
    }
  }
  assert.deepEqual(excesso, [], "o <meta> concede o que o cabeçalho barra");
});

const AUSENTE = "(diretiva ausente)";
const DIVERGENCIAS_ACEITAS = {
  "admin.html": { "img-src": "'self' https: data: blob:" },
  "avaliar.html": { "script-src": "'self'", "connect-src": "'self'", "frame-src": AUSENTE },
  "conta.html": {
    "script-src": "'self' https://sdk.mercadopago.com https://accounts.google.com",
    "style-src": "'self' 'unsafe-inline' https://accounts.google.com",
    "connect-src": "'self' https://api.mercadopago.com https://viacep.com.br https://accounts.google.com",
    "frame-src": "https://www.mercadopago.com https://www.mercadopago.com.br https://accounts.google.com",
  },
};

const SEM_META_DE_PROPOSITO = ["manutencao.html"];

test("nenhuma página começou a divergir da CSP padrão sem registro", () => {
  const base = metaDaPagina("politica.html");
  assert.ok(base, "politica.html perdeu o <meta> de CSP");

  const semMeta = [];
  for(const pagina of paginasHtml()){
    const meta = metaDaPagina(pagina);
    if(!meta){ semMeta.push(pagina); continue; }

    const divergentes = {};
    for(const diretiva of new Set([...Object.keys(base), ...Object.keys(meta)])){
      if(base[diretiva] !== meta[diretiva]) divergentes[diretiva] = meta[diretiva] ?? AUSENTE;
    }
    assert.deepEqual(divergentes, DIVERGENCIAS_ACEITAS[pagina] || {},
      `${pagina}: CSP do <meta> diverge das demais de um jeito não registrado`);
  }

  assert.deepEqual(semMeta, SEM_META_DE_PROPOSITO,
    "página HTML sem <meta> de CSP — ou foi esquecida, ou precisa entrar na lista");
});
