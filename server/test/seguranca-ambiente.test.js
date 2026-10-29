const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const ambiente = require("../lib/ambiente.js");

async function ipVistoCom(confianca, cabecalhos){
  const app = express();
  app.set("trust proxy", confianca);
  app.get("/", (req, res) => res.json({ ip: req.ip }));
  const servidor = await new Promise(r => { const s = app.listen(0, "127.0.0.1", () => r(s)); });
  try {
    const res = await fetch(`http://127.0.0.1:${servidor.address().port}/`, { headers: cabecalhos });
    return (await res.json()).ip.replace(/^::ffff:/, "");
  } finally {
    servidor.close();
  }
}

test("produção é decidida por uma regra só", () => {
  assert.equal(ambiente.emProducao({ NODE_ENV: "production" }), true);
  assert.equal(ambiente.emProducao({ CLIENT_ORIGIN: "https://arte.com.br" }), true);
  assert.equal(ambiente.emProducao({ RENDER_EXTERNAL_URL: "https://x.onrender.com" }), true);
  assert.equal(ambiente.emProducao({ NODE_ENV: "test", CLIENT_ORIGIN: "http://localhost:1" }), false);
  assert.equal(ambiente.permitirOverrideDeTeste({ NODE_ENV: "production" }), false);
});

test("sem proxy confiável, um X-Forwarded-For falso não muda o IP", async () => {
  const ip = await ipVistoCom(ambiente.confiancaDoProxy({ TRUST_PROXY: "false" }), { "X-Forwarded-For": "1.2.3.4" });
  assert.equal(ip, "127.0.0.1");
});

test("com Cloudflare, só vale o IP que a Cloudflare entregou", async () => {
  const confianca = ambiente.confiancaDoProxy({ TRUST_PROXY: "cloudflare" });
  assert.equal(await ipVistoCom(confianca, { "X-Forwarded-For": "1.2.3.4, 104.16.0.10" }), "1.2.3.4");
  assert.equal(await ipVistoCom(confianca, { "X-Forwarded-For": "1.2.3.4, 9.9.9.9" }), "9.9.9.9",
    "quem não é da Cloudflare não pode inventar o IP de outra pessoa");
});

test("o padrão confia só em proxy da própria máquina", () => {
  const padrao = ambiente.confiancaDoProxy({});
  assert.deepEqual(padrao, ["loopback", "uniquelocal"]);
  assert.equal(ambiente.confiancaDoProxy({ RENDER: "true" }), 1);
  assert.equal(ambiente.confiancaDoProxy({ TRUST_PROXY: "2" }), 2);
});

test("token de produção do Mercado Pago sem segredo do webhook impede a subida", () => {
  const faltando = ambiente.problemasDeProducao({ NODE_ENV: "production", MP_ACCESS_TOKEN: "APP_USR-123", ADMIN_EMAIL_HASHES: "ab", CHAVES_DADOS: "k1:" + "a".repeat(64) });
  assert.equal(faltando.length, 1);
  assert.match(faltando[0], /MP_WEBHOOK_SECRET/);
  assert.deepEqual(ambiente.problemasDeProducao({ NODE_ENV: "production", MP_ACCESS_TOKEN: "TEST-1" }), []);
  assert.deepEqual(ambiente.problemasDeProducao({ NODE_ENV: "test", MP_ACCESS_TOKEN: "APP_USR-1" }), []);
});

test("as faixas da Cloudflare estão no arquivo", () => {
  const faixas = require("../lib/faixas-cloudflare.json");
  assert.ok(faixas.ipv4.length >= 10 && faixas.ipv6.length >= 5);
  for(const f of [...faixas.ipv4, ...faixas.ipv6]) assert.match(f, /\/\d+$/);
});
