const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..");

function arquivosDoSite() {
  const saida = [];
  (function anda(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      if (item.name === "node_modules" || item.name === "vendor" || item.name === "test") continue;
      const caminho = path.join(dir, item.name);
      if (item.isDirectory()) anda(caminho);
      else if (/\.(js|html)$/.test(item.name)) saida.push(caminho);
    }
  })(RAIZ);
  return saida;
}

test("nenhum link do wa.me carrega texto pronto", () => {
  const culpados = [];
  for (const arquivo of arquivosDoSite()) {
    const conteudo = fs.readFileSync(arquivo, "utf8");
    conteudo.split("\n").forEach((linha, i) => {
      if (/wa\.me\/[^"'`\s]*\?text=|wa\.me\/\$\{[^}]*\}\?text=/.test(linha)) {
        culpados.push(`${path.relative(RAIZ, arquivo)}:${i + 1}`);
      }
    });
  }
  assert.deepEqual(culpados, [],
    "use https://api.whatsapp.com/send?phone=...&text=... — o wa.me estraga emoji");
});

test("as mensagens de WhatsApp do painel saem por api.whatsapp.com", () => {
  const admin = fs.readFileSync(path.join(RAIZ, "js/admin.js"), "utf8");
  assert.match(admin, /https:\/\/api\.whatsapp\.com\/send\?phone=/,
    "whatsappUrl() deixou de montar o link em api.whatsapp.com");
});
