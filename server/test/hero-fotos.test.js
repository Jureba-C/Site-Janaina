const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const sharp = require("sharp");

const PORT = 39574;
const ORIGIN = `http://localhost:${PORT}`;
const ADMIN_EMAIL = "admin-hero@test.com";
const ADMIN_HASH = crypto.createHash("sha256").update(ADMIN_EMAIL).digest("hex");
const TMP_DB = path.join(os.tmpdir(), `plc-hero-${process.pid}-${Date.now()}.db`);

process.env.DB_PATH = TMP_DB;
const db = require("../lib/db.js");
const auth = require("../lib/auth.js");

let child;
let adminCookie;

function limpar(){
  for(const s of ["", "-wal", "-shm"]) { try { fs.unlinkSync(TMP_DB + s); } catch {} }
}

before(async () => {
  child = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server.js"], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      DB_PATH: TMP_DB, PORT: String(PORT), CLIENT_ORIGIN: ORIGIN,
      ADMIN_2FA_REQUIRED: "false", ADMIN_EMAIL_HASHES: ADMIN_HASH,
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
  const admin = db.createUser({ name: "Admin", email: ADMIN_EMAIL, passwordHash: await auth.hashPassword("x-123456"), cpf: null });
  const token = crypto.randomBytes(32).toString("hex");
  db.createSession({
    tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    userId: admin.id, expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });
  adminCookie = `plc_session=${token}`;
});

after(() => {
  if(child) child.kill();
  limpar();
});

async function fotoDeitada(){
  return sharp({ create: { width: 1600, height: 900, channels: 3, background: { r: 230, g: 120, b: 170 } } }).jpeg().toBuffer();
}

async function enviarFoto({ alt = "Descrição da foto de teste", legenda = "Legenda de teste", focus = "center", cookie } = {}){
  const form = new FormData();
  form.append("photo", new Blob([await fotoDeitada()], { type: "image/jpeg" }), "foto.jpg");
  form.append("alt", alt);
  form.append("legenda", legenda);
  form.append("focus", focus);
  return fetch(`${ORIGIN}/api/admin/hero/fotos`, {
    method: "POST",
    headers: { Origin: ORIGIN, Cookie: cookie === undefined ? adminCookie : cookie },
    body: form,
  });
}

async function apagarTodas(){
  const res = await fetch(`${ORIGIN}/api/admin/hero/fotos`, { headers: { Cookie: adminCookie } });
  const { fotos } = await res.json();
  for(const f of fotos){
    await fetch(`${ORIGIN}/api/admin/hero/fotos/${f.id}`, {
      method: "DELETE", headers: { Origin: ORIGIN, Cookie: adminCookie },
    });
  }
}

test("sem foto no painel, a home usa as fotos fixas da loja", async () => {
  await apagarTodas();
  const home = await (await fetch(ORIGIN + "/")).text();
  assert.match(home, /img\/provisorias\/canecas-alca-colorida\.jpg/);
  assert.ok(!home.includes("/api/hero/fotos/"), "não deve apontar para o banco sem foto cadastrada");
});

test("só a primeira foto do destaque tem prioridade; as outras esperam", async () => {
  await apagarTodas();
  const home = await (await fetch(ORIGIN + "/")).text();
  const destaque = home.slice(home.indexOf('class="destaque'), home.indexOf('class="secao'));
  assert.equal((destaque.match(/fetchPriority="high"|fetchpriority="high"/g) || []).length, 1);
  assert.equal((destaque.match(/class="prateleira-item"/g) || []).length, 3, "três fotos na prateleira");
  assert.ok((destaque.match(/loading="lazy"/g) || []).length >= 1);
});

test("foto enviada pelo painel entra na home no lugar das fixas", async () => {
  await apagarTodas();
  const res = await enviarFoto({ legenda: "Laço de teste", alt: "Um laço rosa de teste" });
  assert.equal(res.status, 201);
  const { id } = await res.json();

  const home = await (await fetch(ORIGIN + "/")).text();
  assert.ok(home.includes(`/api/hero/fotos/${id}?w=480`), "a home deve apontar para a foto do banco");
  const destaque = home.slice(home.indexOf('class="destaque'), home.indexOf('class="secao'));
  assert.ok(!destaque.includes("canecas-alca-colorida.jpg"), "as fixas devem sair do destaque");
  assert.match(home, /<span class="prateleira-bilhete cursiva">Laço de teste<\/span>/);
  assert.match(home, /alt="Um laço rosa de teste"/);
});

test("a rota pública devolve 4:5 em toda largura e formato", async () => {
  await apagarTodas();
  const { id } = await (await enviarFoto()).json();

  for(const largura of [480, 960]){
    for(const [accept, esperado] of [["image/webp,*/*", "webp"], ["image/jpeg", "jpeg"]]){
      const res = await fetch(`${ORIGIN}/api/hero/fotos/${id}?w=${largura}`, { headers: { Accept: accept } });
      assert.equal(res.status, 200);
      const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
      assert.equal(meta.format, esperado);
      assert.equal(meta.width, largura);
      assert.equal(meta.height, largura * 1.25, `${largura}px em ${esperado} devia sair 4:5`);
    }
  }
});

test("largura fora da lista cai no padrão em vez de virar variante nova", async () => {
  await apagarTodas();
  const { id } = await (await enviarFoto()).json();
  const res = await fetch(`${ORIGIN}/api/hero/fotos/${id}?w=5000`, { headers: { Accept: "image/jpeg" } });
  const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
  assert.equal(meta.width, 960);
});

test("mudar o enquadramento joga fora o recorte em cache", async () => {
  await apagarTodas();
  const { id } = await (await enviarFoto({ focus: "top" })).json();
  await fetch(`${ORIGIN}/api/hero/fotos/${id}?w=480`, { headers: { Accept: "image/webp,*/*" } });
  assert.ok(db.getHeroPhotoVariant(id, 480, "webp"), "o primeiro acesso devia ter gravado a variante");

  const res = await fetch(`${ORIGIN}/api/admin/hero/fotos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Origin: ORIGIN, Cookie: adminCookie },
    body: JSON.stringify({ alt: "Outra descrição de teste", legenda: "Outra legenda", focus: "bottom" }),
  });
  assert.equal(res.status, 200);
  assert.equal(db.getHeroPhotoVariant(id, 480, "webp"), null, "o corte antigo não pode sobreviver");
});

test("texto escrito no painel não vira HTML na home", async () => {
  await apagarTodas();
  await enviarFoto({ legenda: '"><script>alert(1)</script>', alt: 'foto " onload="alert(2)' });
  const home = await (await fetch(ORIGIN + "/")).text();
  assert.ok(!home.includes("<script>alert(1)</script>"));
  assert.ok(!home.includes('onload="alert(2)'));
  assert.match(home, /&lt;script&gt;/);
});

test("a ordem do painel é a ordem do carrossel", async () => {
  await apagarTodas();
  const a = (await (await enviarFoto({ legenda: "Primeira" })).json()).id;
  const b = (await (await enviarFoto({ legenda: "Segunda" })).json()).id;

  let home = await (await fetch(ORIGIN + "/")).text();
  assert.ok(home.indexOf("Primeira") < home.indexOf("Segunda"));

  const res = await fetch(`${ORIGIN}/api/admin/hero/fotos/ordem`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Origin: ORIGIN, Cookie: adminCookie },
    body: JSON.stringify({ ids: [b, a] }),
  });
  assert.equal(res.status, 200);

  home = await (await fetch(ORIGIN + "/")).text();
  assert.ok(home.indexOf("Segunda") < home.indexOf("Primeira"), "a nova ordem tem de aparecer na home");
});

test("ordem incompleta é recusada em vez de embaralhar o carrossel", async () => {
  await apagarTodas();
  const a = (await (await enviarFoto({ legenda: "Uma" })).json()).id;
  await enviarFoto({ legenda: "Outra" });

  const res = await fetch(`${ORIGIN}/api/admin/hero/fotos/ordem`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Origin: ORIGIN, Cookie: adminCookie },
    body: JSON.stringify({ ids: [a] }),
  });
  assert.equal(res.status, 409);
});

test("apagar a última foto devolve o topo para as fixas", async () => {
  await apagarTodas();
  const { id } = await (await enviarFoto({ legenda: "Só esta" })).json();
  await fetch(`${ORIGIN}/api/admin/hero/fotos/${id}`, {
    method: "DELETE", headers: { Origin: ORIGIN, Cookie: adminCookie },
  });
  const home = await (await fetch(ORIGIN + "/")).text();
  assert.match(home, /img\/provisorias\/canecas-alca-colorida\.jpg/);
});

test("passa do teto de fotos e o envio é recusado", async () => {
  await apagarTodas();
  for(let i = 0; i < 6; i++){
    assert.equal((await enviarFoto({ legenda: `Foto ${i}` })).status, 201);
  }
  assert.equal((await enviarFoto({ legenda: "Sétima" })).status, 409);
  await apagarTodas();
});

test("legenda ou descrição em branco não passa", async () => {
  await apagarTodas();
  assert.equal((await enviarFoto({ legenda: "   " })).status, 400);
  assert.equal((await enviarFoto({ alt: "" })).status, 400);
});

test("quem não é admin não mexe nas fotos do topo", async () => {
  await apagarTodas();
  const { id } = await (await enviarFoto()).json();

  assert.equal((await enviarFoto({ cookie: "" })).status, 401);
  for(const [metodo, url] of [
    ["PATCH", `/api/admin/hero/fotos/${id}`],
    ["DELETE", `/api/admin/hero/fotos/${id}`],
    ["PUT", "/api/admin/hero/fotos/ordem"],
    ["GET", "/api/admin/hero/fotos"],
  ]){
    const res = await fetch(ORIGIN + url, {
      method: metodo,
      headers: { "Content-Type": "application/json", Origin: ORIGIN },
      body: metodo === "GET" || metodo === "DELETE" ? undefined : JSON.stringify({ ids: [] }),
    });
    assert.equal(res.status, 401, `${metodo} ${url} devia exigir admin`);
  }

  assert.equal((await fetch(`${ORIGIN}/api/hero/fotos/${id}?w=480`)).status, 200);
});

test("id inventado responde 404, sem revelar se existe", async () => {
  const inexistente = await fetch(`${ORIGIN}/api/hero/fotos/00000000-0000-0000-0000-000000000000?w=480`);
  const invalido = await fetch(`${ORIGIN}/api/hero/fotos/nao-e-uuid?w=480`);
  assert.equal(inexistente.status, 404);
  assert.equal(invalido.status, 404);
});

test("o preload do topo aponta para exatamente a mesma imagem do <picture>", async () => {
  await apagarTodas();
  const home = await (await fetch(ORIGIN + "/")).text();
  const preload = home.match(/<link rel="preload" as="image"[^>]*>/);
  assert.ok(preload, "o preload da foto do topo sumiu");
  const destaque = home.slice(home.indexOf('class="prateleira-item'));
  const source = destaque.match(/<source type="image\/webp"[^>]*>/);
  assert.ok(source, "o <source> webp da primeira foto da prateleira sumiu");
  const pegar = (tag, attr) => (tag.match(new RegExp(`${attr}="([^"]*)"`, "i")) || [])[1];
  assert.equal(pegar(preload[0], "href"), pegar(source[0], "srcSet"), "preload e <source> discordam: o navegador baixaria duas imagens");
  assert.match(preload[0], /type="image\/webp"/);
});

test("com foto do painel, o preload acompanha e larga o type webp", async () => {
  await apagarTodas();
  const { id } = await (await enviarFoto({ legenda: "Capa do painel" })).json();
  const home = await (await fetch(ORIGIN + "/")).text();

  const preload = home.match(/<link rel="preload" as="image"[^>]*>/);
  assert.ok(preload, "o preload sumiu quando a foto veio do painel");
  assert.ok(preload[0].includes(`/api/hero/fotos/${id}?w=480`),
    "o preload continua apontando para a foto fixa em vez da do painel");
  assert.ok(!preload[0].includes("type="), "foto do painel não tem formato fixo para declarar");
  await apagarTodas();
});
