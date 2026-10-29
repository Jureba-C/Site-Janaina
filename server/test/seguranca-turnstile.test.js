const { test } = require("node:test");
const assert = require("node:assert/strict");
const turnstile = require("../lib/turnstile.js");

const LIGADO = { TURNSTILE_SITE_KEY: "0x4AAA", TURNSTILE_SECRET: "segredo" };

test("sem chaves, a proteção fica desligada e não atrapalha", async () => {
  assert.equal(turnstile.configurado({}), false);
  assert.equal(turnstile.chavePublica({}), null);
  assert.deepEqual(await turnstile.conferir(undefined, "1.2.3.4", {}), { ok: true, motivo: "desligado" });
});

test("ligada: sem token recusa; com token confere na Cloudflare", async () => {
  assert.deepEqual(await turnstile.conferir("", "1.2.3.4", LIGADO), { ok: false, motivo: "sem_token" });
  const original = global.fetch;
  let enviado = null;
  global.fetch = async (url, opcoes) => {
    enviado = { url, corpo: String(opcoes.body) };
    return { json: async () => ({ success: opcoes.body.get("response") === "bom" }) };
  };
  try {
    assert.equal((await turnstile.conferir("bom", "1.2.3.4", LIGADO)).ok, true);
    assert.match(enviado.url, /challenges\.cloudflare\.com\/turnstile\/v0\/siteverify/);
    assert.match(enviado.corpo, /secret=segredo/);
    assert.match(enviado.corpo, /remoteip=1\.2\.3\.4/);
    assert.equal((await turnstile.conferir("ruim", "1.2.3.4", LIGADO)).ok, false);
    global.fetch = async () => { throw new Error("fora do ar"); };
    assert.deepEqual(await turnstile.conferir("bom", null, LIGADO), { ok: false, motivo: "sem_resposta" });
  } finally {
    global.fetch = original;
  }
});
