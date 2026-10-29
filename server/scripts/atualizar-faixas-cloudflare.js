const fs = require("node:fs");
const path = require("node:path");

const DESTINO = path.join(__dirname, "..", "lib", "faixas-cloudflare.json");

async function baixar(url){
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if(!res.ok) throw new Error(`${url} respondeu ${res.status}`);
  const linhas = (await res.text()).split(/\s+/).map(l => l.trim()).filter(Boolean);
  if(!linhas.length || !linhas.every(l => /^[0-9a-f:.]+\/\d+$/i.test(l))) throw new Error(`${url} veio em formato estranho`);
  return linhas;
}

(async () => {
  const ipv4 = await baixar("https://www.cloudflare.com/ips-v4");
  const ipv6 = await baixar("https://www.cloudflare.com/ips-v6");
  const dados = { atualizado_em: new Date().toISOString().slice(0, 10), ipv4, ipv6 };
  fs.writeFileSync(DESTINO, JSON.stringify(dados, null, 2) + "\n");
  console.log(`Faixas da Cloudflare atualizadas: ${ipv4.length} IPv4, ${ipv6.length} IPv6.`);
})().catch(err => {
  console.error("Não deu para atualizar as faixas:", err.message);
  process.exit(1);
});
