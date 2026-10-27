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

const TELAS_SEM_CAPTURA = [
  { nome: "celular-320", viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true },
  { nome: "notebook-1024", viewport: { width: 1024, height: 768 } },
  { nome: "notebook-1180", viewport: { width: 1180, height: 820 } },
];

const PAGINAS_SEM_CAPTURA = ["inicio", "produto", "categoria", "busca", "conta", "minha-conta", "acompanhar", "politica"];

const BARRAS_FIXAS = /\b(cabecalho|simple-header|comprar|aviso-cookies|whatsapp-flutuante)\b/;

const PAGINAS = [
  ["inicio", "/"],
  ["produto", null],
  ["categoria", "/categoria/canecas"],
  ["busca", "/busca?q=caneca"],
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

async function elementosCobertos(pagina){
  await pagina.mouse.move(1, 1);
  return pagina.evaluate(async (barras) => {
    const achados = new Set();
    const doc = document.documentElement;
    const naBarra = (el) => {
      for(let e = el; e && e !== document.body; e = e.parentElement){
        const pos = getComputedStyle(e).position;
        if(pos === "fixed") return true;
        if(pos === "sticky" && new RegExp(barras).test(String(e.className))) return true;
      }
      return false;
    };
    const descrever = (el) => {
      const classe = String(el.className?.baseVal ?? el.className ?? "").split(" ")[0];
      const texto = (el.textContent || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 30);
      return `${el.tagName.toLowerCase()}${classe ? "." + classe : ""}${texto ? " «" + texto + "»" : ""}`;
    };
    const passos = Math.min(16, Math.ceil(doc.scrollHeight / innerHeight) + 1);
    for(let i = 0; i < passos; i++){
      window.scrollTo(0, i * innerHeight * 0.8);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      for(const el of document.querySelectorAll("h1, h2, h3, p, a, button, label, input, select, textarea")){
        const caixa = el.getBoundingClientRect();
        const estilo = getComputedStyle(el);
        if(caixa.width < 8 || caixa.height < 8 || caixa.bottom < 0 || caixa.top > innerHeight) continue;
        if(estilo.visibility === "hidden" || Number(estilo.opacity) === 0) continue;
        if(naBarra(el) || el.closest("[aria-hidden=true], dialog:not([open]), .visualmente-oculto, svg, [hidden]")) continue;
        const x = caixa.left + caixa.width / 2;
        const y = caixa.top + caixa.height / 2;
        if(x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
        const topo = document.elementFromPoint(x, y);
        if(!topo || el.contains(topo) || topo.contains(el) || naBarra(topo)) continue;
        let cortado = false;
        for(let a = el.parentElement; a && a !== document.body; a = a.parentElement){
          const r = a.getBoundingClientRect();
          if(/(auto|scroll|hidden|clip)/.test(getComputedStyle(a).overflowX) && (x < r.left || x > r.right)){ cortado = true; break; }
        }
        if(cortado) continue;
        achados.add(`${descrever(el)} fica por baixo de ${descrever(topo)}`);
      }
    }
    window.scrollTo(0, 0);
    return [...achados].slice(0, 8);
  }, BARRAS_FIXAS.source);
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
  for(const texto of await elementosCobertos(pagina)) anotar(texto);
  if(!tela.semCaptura){
    fs.mkdirSync(path.join(SAIDA, tela.nome), { recursive: true });
    await pagina.screenshot({ path: path.join(SAIDA, tela.nome, `${nome}.png`), fullPage: true });
  }
  await pagina.close();
}

async function conferirCarrinho(contexto, tela, problemas){
  const pagina = await contexto.newPage();
  const anotar = (texto) => problemas.push(`[${tela.nome}] carrinho: ${texto}`);
  pagina.on("pageerror", erro => anotar(`erro de JavaScript — ${erro.message}`));
  await pagina.goto(ORIGEM + "/", { waitUntil: "networkidle" });
  const cartao = pagina.locator(".cartao-produto-acao").first();
  if(!(await cartao.count())){ anotar("nenhum produto com botão na vitrine"); await pagina.close(); return; }
  await cartao.scrollIntoViewIfNeeded();
  await cartao.click();
  await pagina.waitForLoadState("networkidle");
  const nome = pagina.locator("#pers-nome");
  if(await nome.count()) await nome.fill("Teste");
  const botao = pagina.locator(".botao-comprar");
  if(!(await botao.count())){ anotar("a página do produto não tem o botão de adicionar"); await pagina.close(); return; }
  await botao.click();
  await pagina.waitForTimeout(700);
  const itens = await pagina.evaluate(() => {
    try{ return JSON.parse(localStorage.getItem("arte_carrinho_v1") || "[]").length; }catch{ return -1; }
  });
  const visivel = await pagina.locator("dialog.carrinho[open]").isVisible().catch(() => false);
  if(!visivel) anotar("o carrinho não abriu");
  fs.mkdirSync(path.join(SAIDA, tela.nome), { recursive: true });
  await pagina.screenshot({ path: path.join(SAIDA, tela.nome, "carrinho.png") });
  if(itens === 0) anotar("o produto não entrou no carrinho");
  await pagina.close();
}

async function clicar(pagina, alvo, anotar, descricao){
  try{
    await alvo.scrollIntoViewIfNeeded({ timeout: 3000 });
    await alvo.click({ timeout: 3000 });
    return true;
  }catch(erro){
    anotar(`não deu para clicar em ${descricao} (${erro.message.split("\n")[0].slice(0, 90)})`);
    return false;
  }
}

async function conferirInteracoes(contexto, tela, rotaProduto, rotaMagica, problemas){
  const pagina = await contexto.newPage();
  const anotar = (texto) => problemas.push(`[${tela.nome}] interação: ${texto}`);
  pagina.on("pageerror", erro => anotar(`erro de JavaScript — ${erro.message}`));
  const celular = tela.viewport.width < 900;

  await pagina.goto(ORIGEM + "/", { waitUntil: "networkidle" });
  await pagina.waitForTimeout(500);
  const ponto = pagina.locator(".destaque-pontos button").nth(1);
  if(await ponto.count() && await clicar(pagina, ponto, anotar, "bolinha do banner")){
    if((await ponto.getAttribute("aria-current")) !== "true") anotar("a bolinha do banner não trocou o slide");
  }
  const coracao = pagina.locator(".botao-favorito").first();
  if(await coracao.count() && await clicar(pagina, coracao, anotar, "coração de favorito")){
    if((await coracao.getAttribute("aria-pressed")) !== "true") anotar("o coração não marcou o favorito");
  }
  await pagina.evaluate(() => window.scrollTo(0, 0));
  if(celular){
    if(await clicar(pagina, pagina.getByRole("button", { name: "Abrir menu" }), anotar, "abrir menu")){
      if(!(await pagina.locator("dialog.gaveta[open]").isVisible().catch(() => false))) anotar("o menu do celular não abriu");
      await pagina.keyboard.press("Escape");
    }
  }else{
    const ocasiao = pagina.locator(".menu-categorias button.menu-link").first();
    if(await ocasiao.count() && await clicar(pagina, ocasiao, anotar, "menu Por ocasião")){
      if((await ocasiao.getAttribute("aria-expanded")) !== "true") anotar("o menu Por ocasião não abriu");
      await pagina.keyboard.press("Escape");
    }
  }
  const busca = pagina.locator("input[role=combobox]:visible").first();
  if(await busca.count()){
    await busca.fill("can");
    try{ await pagina.locator(".busca-sugestoes:visible li").first().waitFor({ timeout: 3000 }); }
    catch{ anotar("a busca não mostrou sugestões"); }
    await busca.fill("");
  }

  if(rotaProduto){
    await pagina.goto(ORIGEM + rotaProduto, { waitUntil: "networkidle" });
    await pagina.waitForTimeout(500);
    const verso = pagina.locator(".galeria-lados [role=tab]").nth(1);
    if(await verso.count() && await clicar(pagina, verso, anotar, "Verso")){
      if((await verso.getAttribute("aria-selected")) !== "true") anotar("o botão Verso não virou a prévia");
    }
    const tresD = pagina.getByRole("button", { name: "Ver em 3D" });
    if(await tresD.count() && await clicar(pagina, tresD, anotar, "Ver em 3D")){
      try{ await pagina.locator(".galeria-palco canvas").waitFor({ timeout: 8000 }); }
      catch{ anotar("a prévia em 3D não abriu"); }
    }
  }
  if(rotaMagica){
    await pagina.goto(ORIGEM + rotaMagica, { waitUntil: "networkidle" });
    await pagina.waitForTimeout(500);
    const calor = pagina.locator(".galeria-calor");
    if(await calor.count() && await clicar(pagina, calor, anotar, "Ver aquecida")){
      if((await calor.getAttribute("aria-pressed")) !== "true") anotar("a caneca mágica não aqueceu");
    }
  }
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
  const magico = lista.find(p => p.config?.magica);
  const rotaMagica = magico ? caminhoDoProduto(magico.id, magico.name) : null;
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
      if(!somente.length || somente.includes("interacoes")) await conferirInteracoes(contexto, tela, produto?.[1], rotaMagica, problemas);
      await contexto.close();
    }
    if(!somente.length){
      for(const tela of TELAS_SEM_CAPTURA){
        const { nome, ...opcoes } = tela;
        const contexto = await navegador.newContext({ ...opcoes, reducedMotion: "reduce", locale: "pt-BR" });
        await contexto.addInitScript(() => {
          try{
            localStorage.setItem("plc_cookie_consent", "seen");
            localStorage.setItem("plc_cupom_toast_email_enviado", "1");
          }catch{}
        });
        const marcada = { ...tela, semCaptura: true };
        for(const pagina of paginas.filter(([n]) => PAGINAS_SEM_CAPTURA.includes(n))) await conferirPagina(contexto, marcada, pagina, problemas);
        await conferirInteracoes(contexto, marcada, produto?.[1], rotaMagica, problemas);
        await contexto.close();
      }
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
  console.log(`Capturas em ${path.relative(process.cwd(), SAIDA) || "."}/ (${TELAS.length} telas × ${paginas.length} páginas + carrinho; mais ${TELAS_SEM_CAPTURA.map(t => t.viewport.width).join(", ")} px só conferidas)`);
  if(unicos.length){
    console.error(`\nProblemas encontrados (${unicos.length}):`);
    for(const p of unicos) console.error(`- ${p}`);
    process.exit(1);
  }
  console.log("Nenhum problema encontrado no navegador.");
}

principal().catch(erro => { console.error(erro); process.exit(1); });
