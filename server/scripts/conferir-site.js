const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

let playwright;
try{
  playwright = require("playwright");
}catch{
  console.error("Playwright não encontrado. Instale uma vez com: npm i -D playwright && npx playwright install chromium");
  process.exit(1);
}

const RAIZ = path.join(__dirname, "..");
const PORTA = Number(process.env.CONFERIR_PORTA) || 3399;
const ORIGEM = `http://localhost:${PORTA}`;
const SAIDA = path.join(RAIZ, ".conferencia");
const BANCO = path.join(os.tmpdir(), `conferir-${process.pid}-${Date.now()}.db`);
const { caminhoDoProduto } = require("../js/produto-url.js");

const TELAS = [
  { nome: "celular-360", viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { nome: "celular-390", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { nome: "tablet-768", viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { nome: "computador-1440", viewport: { width: 1440, height: 900 } },
  { nome: "computador-1920", viewport: { width: 1920, height: 1080 } },
];

const PAGINAS = [
  ["inicio", "/"],
  ["produto", null],
  ["conta", "/conta.html"],
  ["minha-conta", "/pedidos.html"],
  ["acompanhar", "/acompanhar-pedido.html"],
  ["avaliar", "/avaliar.html"],
  ["pix", "/pagamento-pix.html"],
  ["sucesso", "/pagamento-sucesso.html"],
  ["erro", "/pagamento-erro.html"],
  ["pendente", "/pagamento-pendente.html"],
  ["nova-senha", "/redefinir-senha.html"],
  ["politica", "/politica.html"],
  ["painel", "/admin.html"],
  ["nao-encontrada", "/pagina-que-nao-existe", 404],
];

function respostaEsperada(url, status, esperado){
  if(url.endsWith("/api/auth/me") && status === 401) return true;
  if(esperado && status === esperado) return true;
  return status < 400;
}

async function subirServidor(){
  const filho = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server.js"], {
    cwd: RAIZ,
    env: { ...process.env, DB_PATH: BANCO, PORT: String(PORTA), CLIENT_ORIGIN: ORIGEM, NODE_ENV: "development", MAINTENANCE_MODE: "false" },
    stdio: "ignore",
  });
  const limite = Date.now() + 15000;
  for(;;){
    try{ if((await fetch(ORIGEM + "/")).ok) return filho; }catch{}
    if(Date.now() > limite){ filho.kill(); throw new Error("o servidor não subiu em 15 s"); }
    await new Promise(r => setTimeout(r, 200));
  }
}

async function rolarAteOFim(pagina){
  await pagina.evaluate(async () => {
    for(let y = 0; y < document.body.scrollHeight; y += 500){
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
}

async function conferirPagina(contexto, tela, [nome, rota, esperado], problemas){
  const pagina = await contexto.newPage();
  const anotar = (texto) => problemas.push(`[${tela.nome}] ${nome}: ${texto}`);
  pagina.on("pageerror", erro => anotar(`erro de JavaScript — ${erro.message}`));
  pagina.on("console", msg => {
    if(msg.type() === "error" && !msg.text().startsWith("Failed to load resource")) anotar(`console — ${msg.text()}`);
  });
  pagina.on("response", r => {
    if(!respostaEsperada(r.url(), r.status(), r.url() === ORIGEM + rota ? esperado : null)) anotar(`${r.status()} em ${r.url().replace(ORIGEM, "")}`);
  });
  pagina.on("requestfailed", req => {
    if(req.url().startsWith(ORIGEM)) anotar(`falhou ${req.url().replace(ORIGEM, "")}`);
  });
  await pagina.goto(ORIGEM + rota, { waitUntil: "networkidle" });
  await rolarAteOFim(pagina);
  await pagina.waitForTimeout(400);
  const medidas = await pagina.evaluate(() => ({
    largura: document.documentElement.scrollWidth,
    janela: window.innerWidth,
    imagens: [...document.images].filter(i => i.complete && i.getAttribute("src") && i.naturalWidth === 0).map(i => i.getAttribute("src")),
  }));
  if(medidas.largura > medidas.janela + 1) anotar(`rolagem para o lado (${medidas.largura}px numa tela de ${medidas.janela}px)`);
  for(const src of medidas.imagens) anotar(`imagem quebrada ${src}`);
  fs.mkdirSync(path.join(SAIDA, tela.nome), { recursive: true });
  await pagina.screenshot({ path: path.join(SAIDA, tela.nome, `${nome}.png`), fullPage: true });
  await pagina.close();
}

async function conferirCarrinho(contexto, tela, problemas){
  const pagina = await contexto.newPage();
  const anotar = (texto) => problemas.push(`[${tela.nome}] carrinho: ${texto}`);
  pagina.on("pageerror", erro => anotar(`erro de JavaScript — ${erro.message}`));
  await pagina.goto(ORIGEM + "/", { waitUntil: "networkidle" });
  const botao = pagina.locator(".btn-add").first();
  if(!(await botao.count())){ anotar("nenhum botão de adicionar (.btn-add) na vitrine"); await pagina.close(); return; }
  await botao.scrollIntoViewIfNeeded();
  await botao.click();
  await pagina.waitForTimeout(800);
  const aberto = await pagina.locator("#cartOffcanvas.show, #cartOffcanvas.showing").count();
  if(!aberto){
    const abrir = pagina.locator(".cart-pill").first();
    if(await abrir.count()) await abrir.click();
    await pagina.waitForTimeout(600);
  }
  const itens = await pagina.evaluate(() => {
    try{ return JSON.parse(localStorage.getItem("plc_cart_v1") || "[]").length; }catch{ return -1; }
  });
  const visivel = await pagina.locator("#cartOffcanvas").isVisible().catch(() => false);
  if(!visivel) anotar("o carrinho não abriu");
  fs.mkdirSync(path.join(SAIDA, tela.nome), { recursive: true });
  await pagina.screenshot({ path: path.join(SAIDA, tela.nome, "carrinho.png") });
  if(itens === 0) anotar("o produto não entrou no carrinho");
  await pagina.close();
}

async function principal(){
  const somente = process.argv.slice(2).filter(a => !a.startsWith("--"));
  const paginas = somente.length ? PAGINAS.filter(([nome]) => somente.includes(nome)) : PAGINAS;
  fs.rmSync(SAIDA, { recursive: true, force: true });
  const servidor = await subirServidor();
  const resposta = await (await fetch(ORIGEM + "/api/products")).json();
  const lista = Array.isArray(resposta) ? resposta : resposta.products || [];
  const produto = paginas.find(([nome]) => nome === "produto");
  if(produto && lista[0]) produto[1] = caminhoDoProduto(lista[0].id, lista[0].name);
  else if(produto) paginas.splice(paginas.indexOf(produto), 1);
  const navegador = await playwright.chromium.launch();
  const problemas = [];
  try{
    for(const tela of TELAS){
      const { nome, ...opcoes } = tela;
      const contexto = await navegador.newContext({ ...opcoes, reducedMotion: "reduce", locale: "pt-BR" });
      await contexto.addInitScript(() => {
        try{
          localStorage.setItem("plc_cookie_consent", "seen");
          localStorage.setItem("plc_cupom_toast_email_enviado", "1");
        }catch{}
      });
      for(const pagina of paginas) await conferirPagina(contexto, tela, pagina, problemas);
      if(!somente.length || somente.includes("carrinho")) await conferirCarrinho(contexto, tela, problemas);
      await contexto.close();
    }
    const animado = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    await conferirPagina(animado, { nome: "computador-animado" }, PAGINAS[0], problemas);
    await animado.close();
  }finally{
    await navegador.close();
    servidor.kill();
    for(const s of ["", "-wal", "-shm"]) fs.rmSync(BANCO + s, { force: true });
  }
  const unicos = [...new Set(problemas)];
  console.log(`Capturas em ${path.relative(process.cwd(), SAIDA) || "."}/ (${TELAS.length} telas × ${paginas.length} páginas + carrinho)`);
  if(unicos.length){
    console.error(`\nProblemas encontrados (${unicos.length}):`);
    for(const p of unicos) console.error(`- ${p}`);
    process.exit(1);
  }
  console.log("Nenhum problema encontrado no navegador.");
}

principal().catch(erro => { console.error(erro); process.exit(1); });
