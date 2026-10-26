const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn, exec } = require("node:child_process");

const RAIZ = path.join(__dirname, "..");
const PORTA_SITE = Number(process.env.PORTA_SITE) || 3333;
const PORTA_AO_VIVO = Number(process.env.PORTA_AO_VIVO) || 3000;
const ALVO = `http://localhost:${PORTA_SITE}`;
const ROTA_EVENTOS = "/__ao-vivo/eventos";
const ROTA_SCRIPT = "/__ao-vivo/recarregar.js";
const IGNORAR = /(^|\/)(node_modules|backups|\.conferencia|\.git)(\/|$)|\.db(-wal|-shm|-journal)?$|(^|\/)img\/products\/|^loja\/|^js\/loja\/(?!manifesto\.json$)/;
const DO_SERVIDOR = /^(server\.js|lib\/|loja-ssr\/|js\/pricing\.js|js\/regras-produto\.js|js\/produto-url\.js|marca\.json|\.env)/;
const VITE = path.join(RAIZ, "node_modules", "vite", "bin", "vite.js");
const CONFIG_LOJA = path.join(RAIZ, "loja", "vite.config.mts");

const SCRIPT_CLIENTE = `(() => {
  const fonte = new EventSource("${ROTA_EVENTOS}");
  fonte.addEventListener("recarregar", () => location.reload());
  fonte.onerror = () => { fonte.close(); setTimeout(() => location.reload(), 1500); };
})();
`;

let site = null;
let reiniciando = false;
const clientes = new Set();

function iniciarSite(){
  site = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server.js"], {
    cwd: RAIZ,
    env: { ...process.env, PORT: String(PORTA_SITE), CLIENT_ORIGIN: ALVO },
    stdio: "inherit",
  });
  site.on("exit", () => { site = null; });
}

async function esperarSite(){
  const limite = Date.now() + 15000;
  while(Date.now() < limite){
    try{ if((await fetch(ALVO + "/")).ok) return true; }catch{}
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

function avisarNavegadores(){
  for(const resposta of clientes) resposta.write("event: recarregar\ndata: 1\n\n");
}

async function reiniciarSite(){
  if(reiniciando) return;
  reiniciando = true;
  if(site){
    const saiu = new Promise(r => site.once("exit", r));
    site.kill();
    await saiu;
  }
  iniciarSite();
  await esperarSite();
  reiniciando = false;
  avisarNavegadores();
}

let espera = null;
const alterados = new Set();
fs.watch(RAIZ, { recursive: true }, (evento, arquivo) => {
  if(!arquivo) return;
  const relativo = arquivo.split(path.sep).join("/");
  if(IGNORAR.test(relativo)) return;
  alterados.add(relativo);
  clearTimeout(espera);
  espera = setTimeout(() => {
    const lista = [...alterados];
    alterados.clear();
    console.log(`\n↻ ${lista.join(", ")}`);
    if(lista.some(a => DO_SERVIDOR.test(a))) reiniciarSite();
    else avisarNavegadores();
  }, 150);
});

function injetar(html){
  const tag = `<script src="${ROTA_SCRIPT}" defer></script>`;
  return html.includes("</body>") ? html.replace("</body>", `${tag}</body>`) : html + tag;
}

const ponte = http.createServer((pedido, resposta) => {
  if(pedido.url === ROTA_SCRIPT){
    resposta.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store" });
    return resposta.end(SCRIPT_CLIENTE);
  }
  if(pedido.url === ROTA_EVENTOS){
    resposta.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" });
    resposta.write(": conectado\n\n");
    clientes.add(resposta);
    pedido.on("close", () => clientes.delete(resposta));
    return;
  }
  const cabecalhos = { ...pedido.headers, host: `localhost:${PORTA_SITE}`, "accept-encoding": "identity" };
  if(cabecalhos.origin) cabecalhos.origin = ALVO;
  if(cabecalhos.referer) cabecalhos.referer = cabecalhos.referer.replace(`localhost:${PORTA_AO_VIVO}`, `localhost:${PORTA_SITE}`);
  const repasse = http.request(ALVO + pedido.url, { method: pedido.method, headers: cabecalhos }, (original) => {
    const tipo = String(original.headers["content-type"] || "");
    const saida = { ...original.headers, "cache-control": "no-store" };
    if(original.headers.location) saida.location = original.headers.location.replace(ALVO, `http://localhost:${PORTA_AO_VIVO}`);
    if(!tipo.includes("text/html")){
      resposta.writeHead(original.statusCode, saida);
      return original.pipe(resposta);
    }
    const partes = [];
    original.on("data", p => partes.push(p));
    original.on("end", () => {
      const corpo = injetar(Buffer.concat(partes).toString("utf8"));
      delete saida["content-length"];
      delete saida.etag;
      resposta.writeHead(original.statusCode, saida);
      resposta.end(corpo);
    });
  });
  repasse.on("error", () => {
    resposta.writeHead(503, { "Content-Type": "text/html; charset=utf-8" });
    resposta.end(injetar("<p style=\"font-family:sans-serif;padding:24px\">O site está reiniciando…</p><script>setTimeout(() => location.reload(), 1000)</script>"));
  });
  pedido.pipe(repasse);
});

function abrirNavegador(endereco){
  if(process.env.CLAUDE_CODE_REMOTE === "true" || process.argv.includes("--sem-navegador")) return;
  const comando = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start \"\"" : "xdg-open";
  exec(`${comando} ${endereco}`, () => {});
}

function vigiarLoja(){
  const comum = ["build", "--config", CONFIG_LOJA, "--watch", "--logLevel", "warn"];
  for(const extra of [[], ["--ssr", "src/entrada-servidor.tsx"]]){
    const filho = spawn(process.execPath, [VITE, ...comum, ...extra], { cwd: RAIZ, stdio: "inherit" });
    process.on("exit", () => filho.kill());
  }
}

(async () => {
  vigiarLoja();
  iniciarSite();
  if(!(await esperarSite())){
    console.error("O site não subiu. Veja as mensagens acima.");
    process.exit(1);
  }
  ponte.listen(PORTA_AO_VIVO, () => {
    const endereco = `http://localhost:${PORTA_AO_VIVO}`;
    console.log(`\nAo vivo em ${endereco} — a página recarrega sozinha a cada mudança salva.\n`);
    abrirNavegador(endereco);
  });
})();

for(const sinal of ["SIGINT", "SIGTERM"]){
  process.on(sinal, () => { if(site) site.kill(); process.exit(0); });
}
