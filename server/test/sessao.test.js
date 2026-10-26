const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..");
const PASTA_JS = path.join(RAIZ, "js");

function arquivosDeCliente() {
  return fs.readdirSync(PASTA_JS)
    .filter(nome => nome.endsWith(".js"))
    .map(nome => path.join(PASTA_JS, nome));
}

test("ninguém escuta plc:auth direto — todos entram por aoSaberDaSessao", () => {
  const culpados = [];
  for (const arquivo of arquivosDeCliente()) {
    if (path.basename(arquivo) === "auth.js") continue;
    const conteudo = fs.readFileSync(arquivo, "utf8");
    conteudo.split("\n").forEach((linha, i) => {
      if (/addEventListener\(\s*["']plc:auth["']/.test(linha)) {
        culpados.push(`${path.basename(arquivo)}:${i + 1}`);
      }
    });
  }
  assert.deepEqual(culpados, [],
    "use PLCAuth.aoSaberDaSessao(cb) — escutar plc:auth direto perde o aviso quando o script chega atrasado");
});

test("auth.js marca a sessão como resolvida antes de avisar", () => {
  const auth = fs.readFileSync(path.join(PASTA_JS, "auth.js"), "utf8");
  const ondeResolve = auth.indexOf("sessaoResolvida = true");
  const ondeAvisa = auth.indexOf("dispatchEvent(new CustomEvent(\"plc:auth\"");
  assert.ok(ondeResolve > 0, "sumiu o sessaoResolvida");
  assert.ok(ondeAvisa > 0, "sumiu o disparo de plc:auth");
  assert.ok(ondeResolve < ondeAvisa,
    "sessaoResolvida tem de virar true ANTES do disparo, senão quem chega no meio se perde");
});

test("auth.js expõe aoSaberDaSessao para as páginas", () => {
  const auth = fs.readFileSync(path.join(PASTA_JS, "auth.js"), "utf8");
  assert.match(auth, /window\.PLCAuth\s*=\s*\{[^}]*aoSaberDaSessao/,
    "aoSaberDaSessao saiu do window.PLCAuth — as páginas quebram sem ela");
});
