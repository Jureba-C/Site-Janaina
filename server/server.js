require("dotenv").config({ quiet: true });

process.removeAllListeners("warning");
process.on("warning", (warning) => {
  if (warning.name !== "ExperimentalWarning") console.warn(warning);
});

const fs = require("fs");
const path = require("path");
const zlib = require("node:zlib");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const multer = require("multer");
const sharp = require("sharp");
const crypto = require("crypto");
const { randomUUID } = crypto;
const rateLimit = require("express-rate-limit");
const qrcode = require("qrcode");
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");
const db = require("./lib/db");
const precompress = require("./lib/precompress");
const spreadsheetExport = require("./lib/export-spreadsheet");
const auth = require("./lib/auth");
const whatsapp = require("./lib/whatsapp");
const instagram = require("./lib/instagram");
const email = require("./lib/email");
const emailPhotos = require("./lib/emailPhotos.js");
const campanhas = require("./lib/campanhas.js");
const googleAuth = require("./lib/googleAuth.js");
const tarefasPeriodicas = require("./scripts/tarefas-periodicas.js");
const rastreio = require("./lib/rastreio.js");
const regras = require("./js/regras-produto.js");
const { itemParaExibir, textoDoResumo, fotosDaPersonalizacao } = require("./lib/itens-pedido.js");
const { prazoDaCotacao } = require("./lib/prazoFrete.js");
const { meFetch, rastreioDoPedido } = require("./lib/melhorEnvio.js");
const pricing = require("./js/pricing.js");
const produtoUrl = require("./js/produto-url.js");
const lojaDados = require("./lib/loja-dados.js");
const lojaSsr = require("./lib/loja-ssr.js");
const producao = require("./lib/producao.js");

const app = express();
const PORT = process.env.PORT || 3333;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3333";

const CANONICAL_HOST = new URL(CLIENT_ORIGIN).host;
const HOST_GEMEO = CANONICAL_HOST.startsWith("www.")
  ? CANONICAL_HOST.slice(4)
  : `www.${CANONICAL_HOST}`;
const ORIGENS_CONFIAVEIS = new Set([
  CLIENT_ORIGIN,
  CLIENT_ORIGIN.replace(CANONICAL_HOST, HOST_GEMEO),
]);

app.set("trust proxy", 1);

const EM_PRODUCAO = CLIENT_ORIGIN.startsWith("https://");
function avisoConfig(mensagem){
  console.warn(`${EM_PRODUCAO ? "🔴 [PRODUÇÃO] " : "⚠️  "}${mensagem}`);
}
if(!process.env.MP_ACCESS_TOKEN){
  avisoConfig("MP_ACCESS_TOKEN não definido. Copie server/.env.example para server/.env e preencha antes de aceitar pagamentos reais — sem ele, o checkout QUEBRA na hora de pagar.");
}
if(!process.env.MELHOR_ENVIO_TOKEN){
  avisoConfig("MELHOR_ENVIO_TOKEN não definido. O cálculo de frete não vai funcionar até preencher o .env.");
}
if(!process.env.INSTAGRAM_ACCESS_TOKEN){
  avisoConfig("INSTAGRAM_ACCESS_TOKEN não definido. A seção \"nossa história\" mostra o botão \"Seguir no Instagram\" em vez do feed ao vivo até preencher o .env (ver docs/instagram-setup.md).");
}
if(!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS){
  avisoConfig("SMTP incompleto (SMTP_HOST/PORT/USER/PASS). NENHUM e-mail sai do site: nem o recibo da cliente, nem o aviso de venda nova para a lojista, nem a redefinição de senha.");
}
if(EM_PRODUCAO && process.env.NODE_ENV !== "production"){
  avisoConfig("NODE_ENV não está como 'production'. O cookie de sessão continua seguro (o Secure também olha o CLIENT_ORIGIN), mas bibliotecas de terceiros podem assumir modo de desenvolvimento — ajuste no painel.");
}
if(!process.env.CRON_SECRET){
  avisoConfig("CRON_SECRET não definido. As tarefas periódicas (fila de e-mail, lembrete de carrinho, campanhas) NUNCA rodam sozinhas nesta hospedagem sem cron tradicional — configure e agende um serviço externo batendo em /api/interno/tarefas-periodicas.");
}
if(!process.env.OWNER_EMAIL){
  avisoConfig("OWNER_EMAIL não definido. Você NÃO é avisada quando alguém compra nem quando chega mensagem pelo formulário de contato — o pedido entra normalmente, mas ninguém te conta.");
}
if(!process.env.ADMIN_EMAIL_HASHES){
  avisoConfig("ADMIN_EMAIL_HASHES não definido. NINGUÉM consegue entrar no painel administrativo (todo login vira cliente comum) até preencher o .env.");
}
if(EM_PRODUCAO && !process.env.MP_WEBHOOK_SECRET){
  avisoConfig("MP_WEBHOOK_SECRET não definido. O webhook do Mercado Pago aceita chamadas SEM verificar a assinatura — configure o segredo no painel do MP e no .env para fechar essa porta.");
}

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || "COLOQUE_SEU_ACCESS_TOKEN_NO_.ENV",
});

const {
  buildPackage,
  PRODUCTS, BUILTIN_CATEGORIES, PRODUCT_CATEGORIES, PRODUCT_BADGES,
  CUSTOM_PRODUCT_ID_START, configPadrao,
  getAllCategories, isValidCategorySlug,
  getProductOverridesMap, getAllProductIds, photosFromRow, effectiveProduct,
} = require("./lib/catalogo.js");

function findCoupon(rawCode){
  const code = String(rawCode || "").trim().toUpperCase();
  if(!code) return null;
  const row = db.getCoupon(code);
  if(!row) return null;
  return {
    code: row.code,
    percentOff: row.percent_off,
    description: row.description,
    oncePerCustomer: Boolean(row.once_per_customer),
  };
}

const JANELA_ANIVERSARIO_DIAS = 30;
function inicioDoAniversario(birthDate, ano){
  const [, mes, dia] = String(birthDate).split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return Date.UTC(ano, mes - 1, Math.min(dia, ultimoDia), 3);
}
function regraDoCupomDeAniversario(coupon, userId, agora = Date.now()){
  if(coupon?.code !== db.CUPOM_ANIVERSARIO) return null;
  const recusa = "Esse cupom é de aniversário: vale só na conta da aniversariante, até 30 dias depois da data cadastrada em Minha conta.";
  const user = userId ? db.getUserById(userId) : null;
  if(!user?.birth_date) return recusa;
  const ano = new Date(agora).getUTCFullYear();
  const inicio = [ano, ano - 1]
    .map(a => inicioDoAniversario(user.birth_date, a))
    .find(t => agora >= t && agora < t + JANELA_ANIVERSARIO_DIAS * 86400000);
  if(!inicio) return recusa;
  if(db.hasUsedCouponSince({ code: coupon.code, userId: user.id, since: inicio })){
    return "Você já usou o cupom deste aniversário. 💗";
  }
  return null;
}

function phoneDigits(value){
  return String(value || "").replace(/\D/g, "") || null;
}

const COUPON_ALREADY_USED_MESSAGE =
  "Este cupom é de uso único e já foi usado nesta conta. Remova-o para continuar.";

const PAYMENT_METHODS = {
  pix: {
    label: "Pix",
    excludedPaymentTypes: ["credit_card", "debit_card", "prepaid_card", "ticket", "atm"],
  },
  card: {
    label: "Cartão ou boleto",
    excludedPaymentTypes: ["bank_transfer"],
  },
};

app.use((req, res, next) => {
  const semQuery = req.originalUrl.split("?")[0];
  if (semQuery.includes("//")) {
    const query = req.originalUrl.slice(semQuery.length);
    return res.redirect(301, semQuery.replace(/\/{2,}/g, "/") + query);
  }
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(semQuery);
  } catch {
    return sendNotFound(req, res);
  }
  if (decodedPath.split("/").some(seg => seg === "." || seg === "..")) {
    return sendNotFound(req, res);
  }
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      scriptSrc: ["'self'", "https://sdk.mercadopago.com", "https://accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
      fontSrc: ["'self'"],
      imgSrc: ["'self'", "https:", "data:", "blob:"],
      connectSrc: ["'self'", "https://api.mercadopago.com", "https://viacep.com.br", "https://accounts.google.com"],
      frameSrc: ["https://www.mercadopago.com", "https://www.mercadopago.com.br", "https://accounts.google.com"],
      objectSrc: ["'none'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      scriptSrcAttr: ["'none'"],
      ...(CLIENT_ORIGIN.startsWith("https://") ? {} : { upgradeInsecureRequests: null }),
    },
  },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
}));

const POLITICA_DE_PERMISSOES = "camera=(), microphone=(), geolocation=(), payment=(), usb=()";
app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", POLITICA_DE_PERMISSOES);
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  next();
});

app.use(cors({ origin: [...ORIGENS_CONFIAVEIS], credentials: true }));

app.use((req, res, next) => {
  if(req.method !== "GET" && req.method !== "HEAD") return next();
  if(req.path.startsWith("/api/")) return next();
  if(req.headers.host !== HOST_GEMEO) return next();
  res.set("Cache-Control", "no-store");
  return res.redirect(301, CLIENT_ORIGIN + req.originalUrl);
});
app.use(compression({
  brotli: { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 6 } },
}));

const MAINTENANCE_MODE = String(process.env.MAINTENANCE_MODE || "").toLowerCase() === "true";
if (MAINTENANCE_MODE) {
  let maintenancePage;
  try {
    maintenancePage = fs.readFileSync(path.join(__dirname, "manutencao.html"), "utf8");
  } catch (err) {
    console.error("Não foi possível ler manutencao.html:", err.message);
    maintenancePage = "<!doctype html><meta charset=\"utf-8\"><title>Em manutenção</title>"
      + "<p>A loja está em manutenção. Voltamos em alguns minutos.</p>";
  }
  console.warn("⚠️  MAINTENANCE_MODE ligado — o site está servindo manutencao.html para todo mundo.");
  app.use((req, res, next) => {
    if (req.path === "/api/webhook") return next();

    res.status(503);
    res.set("Retry-After", "900");
    res.set("Cache-Control", "no-store");
    if (req.path.startsWith("/api/")) {
      return res.json({ error: "A loja está em manutenção. Tente novamente em alguns minutos." });
    }
    if ((req.method === "GET" || req.method === "HEAD") && req.accepts("html")) {
      res.type("html");
      return res.send(maintenancePage);
    }
    return res.send("A loja está em manutenção. Tente novamente em alguns minutos.");
  });
}

app.use(express.json({ limit: "50kb" }));
app.use(auth.attachUser);

function verifyOrigin(req, res, next){
  if(["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if(req.path === "/webhook") return next();
  if(req.path === "/newsletter/unsubscribe") return next();
  const origin = req.headers.origin;
  if(!origin || !ORIGENS_CONFIAVEIS.has(origin)){
    return res.status(403).json({ error: "Requisição recusada (origem não confiável)." });
  }
  next();
}
app.use("/api", verifyOrigin);

app.use(rateLimit({
  windowMs: 60 * 1000, max: 1200, handler: sendTooManyRequests,
  skip: (req) => ["css", "js", "img"].includes(req.path.split("/").filter(Boolean)[0]),
}));

const ROTA_DE_FOTO = /^\/(products|avaliacoes|depoimentos|hero)\/(photos|fotos)\//;
app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000, max: 500, handler: sendTooManyRequests,
  skip: (req) => (req.path.startsWith("/orders/") && req.path.endsWith("/status"))
    || ROTA_DE_FOTO.test(req.path),
}));

const fotosLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 3000, handler: sendTooManyRequests });
app.use("/api", (req, res, next) => (ROTA_DE_FOTO.test(req.path) ? fotosLimiter(req, res, next) : next()));

const strictLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, handler: sendTooManyRequests });

const freteLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, handler: sendTooManyRequests });

const avaliacaoLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, handler: sendTooManyRequests });

const MAX_AUTH_POR_JANELA = EM_PRODUCAO ? 10 : (Number(process.env.AUTH_RATE_LIMIT_MAX) || 10);
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: MAX_AUTH_POR_JANELA, handler: sendTooManyRequests });

const statusPollLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, handler: sendTooManyRequests });

const cronLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, handler: sendTooManyRequests });

const SITE_ROOT = __dirname;
const PUBLIC_TOP_LEVEL = new Set([
  "index.html", "conta.html", "pedidos.html", "admin.html",
  "acompanhar-pedido.html", "avaliar.html",
  "pagamento-sucesso.html", "pagamento-erro.html", "pagamento-pendente.html",
  "pagamento-pix.html",
  "redefinir-senha.html", "politica.html", "404.html", "429.html", "css", "js", "img",
  "manutencao.html",
  "robots.txt", "sitemap.xml", "favicon.ico", "apple-touch-icon.png",
  "llms.txt",
  "laco", "produto", "categoria", "busca",
]);
function sendNotFound(req, res){
  if (req.originalUrl.startsWith("/api/")) {
    return res.status(404).json({ error: "Rota não encontrada." });
  }
  if ((req.method === "GET" || req.method === "HEAD") && req.accepts("html")) {
    return res.status(404).sendFile(path.join(SITE_ROOT, "404.html"), { dotfiles: "allow" });
  }
  return res.status(404).send("Não encontrado.");
}

function sendTooManyRequests(req, res){
  if (req.originalUrl.startsWith("/api/")) {
    return res.status(429).json({ error: "Muitas requisições. Aguarde um instante e tente novamente." });
  }
  if ((req.method === "GET" || req.method === "HEAD") && req.accepts("html")) {
    return res.status(429).sendFile(path.join(SITE_ROOT, "429.html"), { dotfiles: "allow" });
  }
  return res.status(429).send("Muitas requisições. Aguarde um instante e tente novamente.");
}
app.use((req, res, next) => {
  if (req.path === "/" || req.path.startsWith("/api/")) return next();
  const firstSegment = req.path.split("/").filter(Boolean)[0];
  if (firstSegment && PUBLIC_TOP_LEVEL.has(firstSegment)) return next();
  return sendNotFound(req, res);
});

app.get("/admin.html", (req, res, next) => {
  if (req.user?.isAdmin) return next();
  if (!req.user) {
    return res.redirect(302, "/conta.html?admin=1");
  }
  return sendNotFound(req, res);
});
const REVALIDATE_ALWAYS = /\.(html|css|js)$/i;
const ICONES_RAIZ = new Set(["favicon.ico", "apple-touch-icon.png"]);

const CACHE_ASSET = new Map();
function versaoDoAsset(relativo){
  const absoluto = path.join(SITE_ROOT, relativo);
  let assinatura;
  try {
    const st = fs.statSync(absoluto);
    assinatura = `${st.mtimeMs}:${st.size}`;
  } catch {
    return "";
  }
  const cacheado = CACHE_ASSET.get(relativo);
  if(cacheado && cacheado.assinatura === assinatura) return cacheado.versao;
  const versao = require("crypto")
    .createHash("sha256").update(fs.readFileSync(absoluto)).digest("hex").slice(0, 8);
  CACHE_ASSET.set(relativo, { assinatura, versao });
  return versao;
}

const SITE_URL = "https://nomedaloja.com.br";

const POLITICA_TROCA_ID = `${SITE_URL}/politica.html#arrependimento`;
const politicaTroca = {
  "@type": "MerchantReturnPolicy",
  "@id": POLITICA_TROCA_ID,
  applicableCountry: "BR",
  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: 7,
  returnMethod: "https://schema.org/ReturnByMail",
  returnFees: "https://schema.org/FreeReturn",
};

const REF_ASSET = /\b(href|src)="(\/?(?:css|js|img)\/[^"?#]+\.(?:css|js|jpg|jpeg|png|svg|webp|gif)|\/?favicon\.ico|\/?apple-touch-icon\.png)"/g;
const REF_SRCSET = /\bsrcset="([^"]+)"/g;
const CAMINHO_NO_SRCSET = /(\/?(?:css|js|img)\/[^\s,?#]+\.(?:jpg|jpeg|png|svg|webp|gif))/g;
const CACHE_HTML = new Map();

function assinaturaDosAssets(refs){
  let assinatura = "";
  for(const rel of refs) assinatura += rel + "=" + versaoDoAsset(rel) + ";";
  return assinatura;
}

function htmlVersionado(absoluto){
  const st = fs.statSync(absoluto);
  const assinatura = `${st.mtimeMs}:${st.size}`;
  const cacheado = CACHE_HTML.get(absoluto);

  const valido = cacheado
    && cacheado.assinatura === assinatura
    && cacheado.assets === assinaturaDosAssets(cacheado.refs);

  if(valido) return cacheado.html;

  const refs = [];
  const versionar = (rel) => {
    refs.push(rel);
    const v = versaoDoAsset(rel);
    return v ? `${rel}?v=${v}` : rel;
  };
  const html = fs.readFileSync(absoluto, "utf8")
    .replace(REF_ASSET, (inteiro, attr, rel) => {
      const versionado = versionar(rel);
      return versionado === rel ? inteiro : `${attr}="${versionado}"`;
    })
    .replace(REF_SRCSET, (inteiro, lista) =>
      `srcset="${lista.replace(CAMINHO_NO_SRCSET, versionar)}"`);

  CACHE_HTML.set(absoluto, {
    assinatura,
    refs,
    assets: assinaturaDosAssets(refs),
    html,
  });
  return html;
}

function escaparHtml(valor){
  return String(valor ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function comVersao(rel){
  const v = versaoDoAsset(rel);
  return v ? `${rel}?v=${v}` : rel;
}

const OG_IMAGEM_PADRAO = `${SITE_URL}/img/og-loja.jpg`;

let CACHE_SITEMAP = null;

function sitemapXml(){
  const versao = db.catalogVersion();
  if(CACHE_SITEMAP && CACHE_SITEMAP.versao === versao) return CACHE_SITEMAP.xml;

  const overridesMap = getProductOverridesMap();
  const linhas = [
    `  <url>\n    <loc>${SITE_URL}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>`,
    `  <url>\n    <loc>${SITE_URL}/politica.html</loc>\n    <changefreq>yearly</changefreq>\n    <priority>0.3</priority>\n  </url>`,
  ];
  const categoriasUsadas = new Set();
  for(const id of getAllProductIds()){
    const p = effectiveProduct(id, overridesMap);
    if(p && !p.hidden) p.config.categorias.forEach(slug => categoriasUsadas.add(slug));
  }
  for(const c of getAllCategories()){
    if(!categoriasUsadas.has(c.slug)) continue;
    linhas.push(`  <url>\n    <loc>${SITE_URL}/categoria/${c.slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
  }
  for(const id of getAllProductIds()){
    const p = effectiveProduct(id, overridesMap);
    if(!p || p.hidden) continue;
    const loc = escaparHtml(SITE_URL + produtoUrl.caminhoDoProduto(id, p.name));
    linhas.push(`  <url>\n    <loc>${loc}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`);
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${linhas.join("\n")}\n</urlset>\n`;
  CACHE_SITEMAP = { versao, xml };
  return xml;
}

app.get("/sitemap.xml", (req, res) => {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.send(sitemapXml());
});

function invalidarPaginasDaLoja(){
  CACHE_SITEMAP = null;
}

function enviarPaginaDaLoja(res, montar){
  let documento;
  try {
    documento = lojaSsr.montarDocumento(montar());
  } catch (err) {
    console.error("Erro ao montar a página da loja:", err);
    res.status(500).setHeader("Cache-Control", "no-store");
    return res.send("<!DOCTYPE html><meta charset=\"utf-8\"><title>Arte Canecas</title><p style=\"font-family:sans-serif;padding:24px\">A loja está atualizando. Recarregue a página em instantes.</p>");
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  return res.send(documento);
}

function imagemAbsoluta(foto){
  if(!foto) return OG_IMAGEM_PADRAO;
  if(foto.startsWith("http")) return foto;
  if(foto.startsWith("/api/products/photos/")) return `${SITE_URL}${foto}?w=900`;
  return `${SITE_URL}${foto.startsWith("/") ? "" : "/"}${foto}`;
}

function dadosDaLojaLd(){
  return {
    "@type": "Store",
    "@id": `${SITE_URL}/#loja`,
    name: "Arte Canecas",
    description: "Canecas, xícaras, garrafas e lembranças personalizadas em Brasília, com envio para todo o Brasil.",
    url: SITE_URL,
    logo: `${SITE_URL}/img/logo-loja.png`,
    image: `${SITE_URL}/img/og-loja.jpg`,
    telephone: "+5561996927401",
    email: "arte.canecasbsb@gmail.com",
    currenciesAccepted: "BRL",
    paymentAccepted: "Pix, Cartão de crédito, Boleto",
    address: { "@type": "PostalAddress", addressLocality: "Brasília", addressRegion: "DF", addressCountry: "BR" },
    areaServed: { "@type": "Country", name: "Brasil" },
    sameAs: ["https://www.instagram.com/arte.canecasbsb"],
  };
}

function trilhaLd(itens){
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: itens.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.nome, item: `${SITE_URL}${item.caminho}` })),
  };
}

function preloadDoDestaque(dados){
  const primeira = dados.pagina.destaques[0]?.src;
  if(!primeira) return null;
  return /\.jpe?g$/.test(primeira) ? { href: primeira.replace(/\.jpe?g$/, ".webp"), tipo: "image/webp" } : { href: primeira };
}

app.get("/", (req, res) => enviarPaginaDaLoja(res, () => {
  const dados = lojaDados.paginaInicio();
  return {
  dados,
  meta: {
    titulo: "Arte Canecas — Canecas e presentes personalizados em Brasília",
    descricao: "Canecas, xícaras, garrafas e lembranças personalizadas com nome, frase ou fotos. Veja a prévia antes de comprar. Pix com desconto e envio para todo o Brasil.",
    canonico: `${SITE_URL}/`,
    imagem: OG_IMAGEM_PADRAO,
    preloadImagem: preloadDoDestaque(dados),
    jsonLd: [{
      "@context": "https://schema.org",
      "@graph": [dadosDaLojaLd(), { "@type": "WebSite", "@id": `${SITE_URL}/#site`, url: SITE_URL, name: "Arte Canecas", inLanguage: "pt-BR", publisher: { "@id": `${SITE_URL}/#loja` }, potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/busca?q={busca}`, "query-input": "required name=busca" } }],
    }],
  },
  };
}));

app.get("/index.html", (req, res) => res.redirect(301, "/" + req.originalUrl.slice(req.path.length)));

app.get("/categoria/:slug", (req, res) => {
  const slug = String(req.params.slug || "").toLowerCase();
  const dados = /^[a-z0-9-]{1,40}$/.test(slug) ? lojaDados.paginaCategoria(slug, req.query || {}) : null;
  if(!dados) return sendNotFound(req, res);
  const { categoria, filtros, pagina, produtos } = dados.pagina;
  const filtrada = Boolean(filtros.outra || filtros.preco || filtros.ordem !== "destaque");
  const titulo = categoria.grupo === "ocasiao"
    ? `Presentes para ${categoria.nome} personalizados — Arte Canecas`
    : `${categoria.nome} personalizados — Arte Canecas`;
  return enviarPaginaDaLoja(res, () => ({
    dados,
    meta: {
      titulo: pagina > 1 ? `${titulo} · página ${pagina}` : titulo,
      descricao: `${categoria.nome}: ${dados.pagina.total} ${dados.pagina.total === 1 ? "peça personalizada" : "peças personalizadas"} com nome, frase ou fotos, feitas em Brasília pela Arte Canecas. Pix com desconto e envio para todo o Brasil.`,
      canonico: `${SITE_URL}/categoria/${categoria.slug}${pagina > 1 && !filtrada ? `?pagina=${pagina}` : ""}`,
      indexar: !filtrada,
      imagem: imagemAbsoluta(produtos.find(p => p.foto)?.foto),
      jsonLd: [
        trilhaLd([{ nome: "Início", caminho: "/" }, { nome: categoria.nome, caminho: `/categoria/${categoria.slug}` }]),
        { "@context": "https://schema.org", "@type": "ItemList", name: categoria.nome, itemListElement: produtos.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}${p.endereco}`, name: p.nome })) },
      ],
    },
  }));
});

app.get("/busca", (req, res) => {
  const termo = typeof req.query.q === "string" ? req.query.q : "";
  const favoritos = req.query.favoritos !== undefined;
  return enviarPaginaDaLoja(res, () => ({
    dados: lojaDados.paginaBusca(termo, favoritos),
    meta: {
      titulo: favoritos ? "Favoritos — Arte Canecas" : termo.trim() ? `Busca: ${termo.trim().slice(0, 60)} — Arte Canecas` : "Todos os produtos — Arte Canecas",
      descricao: "Canecas, xícaras, garrafas, vidros e lembranças personalizadas da Arte Canecas.",
      canonico: `${SITE_URL}/busca`,
      indexar: !termo.trim() && !favoritos,
      imagem: OG_IMAGEM_PADRAO,
    },
  }));
});

const buscaLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, handler: sendTooManyRequests });
app.get("/api/busca", buscaLimiter, (req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  if(typeof req.query.ids === "string"){
    const ids = req.query.ids.split(",").map(Number).filter(Number.isInteger).slice(0, 100);
    return res.json({ produtos: lojaDados.porIds(ids) });
  }
  const termo = typeof req.query.q === "string" ? req.query.q.slice(0, 80) : "";
  const limite = Math.min(24, Math.max(1, Number(req.query.limite) || 8));
  res.json({ produtos: termo.trim().length >= 2 ? lojaDados.sugestoes(termo, limite) : [] });
});

function enviarProduto(req, res, prefixo){
  const id = produtoUrl.idDoApelido(req.params.apelido);
  const produto = id == null ? null : effectiveProduct(id, getProductOverridesMap());
  if(!produto) return sendNotFound(req, res);
  if(produto.hidden) return res.redirect(302, "/busca");
  const canonico = produtoUrl.caminhoDoProduto(id, produto.name);
  if(`${prefixo}${req.params.apelido}` !== canonico){
    return res.redirect(301, canonico + req.originalUrl.slice(req.path.length));
  }
  const dados = lojaDados.paginaProduto(id);
  if(!dados) return sendNotFound(req, res);
  const p = dados.pagina.produto;
  const cats = p.categoriaPrincipal ? [{ nome: p.categoriaPrincipal.nome, caminho: `/categoria/${p.categoriaPrincipal.slug}` }] : [];
  const descricao = p.descricao || `${p.nome}${p.medida ? ` (${p.medida})` : ""} personalizada com nome, frase ou fotos pela Arte Canecas, em Brasília. Veja a prévia da arte antes de comprar.`;
  const ofertas = {
    "@type": "Offer",
    price: p.precoMinimo.toFixed(2),
    priceCurrency: "BRL",
    availability: p.esgotado ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    itemCondition: "https://schema.org/NewCondition",
    url: SITE_URL + canonico,
    seller: { "@type": "Organization", name: "Arte Canecas" },
    hasMerchantReturnPolicy: { "@id": POLITICA_TROCA_ID },
  };
  const produtoLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.nome,
    description: descricao,
    url: SITE_URL + canonico,
    image: (p.fotos.length ? p.fotos : [null]).map(imagemAbsoluta),
    brand: { "@type": "Brand", name: "Arte Canecas" },
    ...(p.config.codigo ? { sku: p.config.codigo } : {}),
    category: p.categoriaPrincipal?.nome,
    offers: ofertas,
    ...(dados.pagina.avaliacoes.total > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: dados.pagina.avaliacoes.media.toFixed(1), reviewCount: dados.pagina.avaliacoes.total } } : {}),
  };
  return enviarPaginaDaLoja(res, () => ({
    dados,
    meta: {
      titulo: `${p.nome}${p.medida && /\d/.test(p.medida) && !/\d/.test(p.nome) ? ` ${p.medida}` : ""} — Arte Canecas`,
      descricao,
      canonico: SITE_URL + canonico,
      ogTipo: "product",
      produto: { preco: p.precoMinimo.toFixed(2), esgotado: p.esgotado },
      imagem: imagemAbsoluta(p.fotos[0]),
      jsonLd: [produtoLd, { "@context": "https://schema.org", ...politicaTroca }, trilhaLd([{ nome: "Início", caminho: "/" }, ...cats, { nome: p.nome, caminho: canonico }])],
    },
  }));
}

app.get("/produto/:apelido", (req, res) => enviarProduto(req, res, "/produto/"));
app.get("/laco/:apelido", (req, res) => {
  const id = produtoUrl.idDoApelido(req.params.apelido);
  const produto = id == null ? null : effectiveProduct(id, getProductOverridesMap());
  if(!produto) return sendNotFound(req, res);
  return res.redirect(301, produtoUrl.caminhoDoProduto(id, produto.name) + req.originalUrl.slice(req.path.length));
});

app.use((req, res, next) => {
  if(req.method !== "GET" && req.method !== "HEAD") return next();
  let rota = decodeURIComponent(req.path);
  if(rota === "/") rota = "/index.html";
  if(!rota.endsWith(".html") || rota.includes("..")) return next();
  const arquivo = path.join(SITE_ROOT, rota);
  if(!arquivo.startsWith(SITE_ROOT + path.sep)) return next();
  if(!PUBLIC_TOP_LEVEL.has(rota.split("/")[1])) return next();
  let html;
  try { html = htmlVersionado(arquivo); } catch { return next(); }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  return res.send(html);
});

app.use(precompress.criarPrecompressor(SITE_ROOT, { revalidarSempre: REVALIDATE_ALWAYS }));

app.use(express.static(SITE_ROOT, {
  extensions: ["html"],
  dotfiles: "ignore",
  maxAge: "365d",
  setHeaders(res, filePath){
    if(ICONES_RAIZ.has(path.basename(filePath))){
      res.setHeader("Cache-Control", "no-cache");
      return;
    }
    if(!REVALIDATE_ALWAYS.test(filePath)) return;
    if(res.req && res.req.query && res.req.query.v){
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      res.setHeader("Cache-Control", "no-cache");
    }
  },
}));

const PRODUCT_PHOTO_MIME_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const productPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb){
    cb(null, Boolean(PRODUCT_PHOTO_MIME_EXT[file.mimetype]));
  },
});

function deleteOldLocalPhoto(oldPhotoUrl){
  if(!oldPhotoUrl) return;
  if(PHOTO_ROUTE_PATTERN.test(oldPhotoUrl)){
    db.deleteProductPhoto(oldPhotoUrl.slice(oldPhotoUrl.lastIndexOf("/") + 1));
    return;
  }
  if(!oldPhotoUrl.startsWith("/img/products/")) return;
  const filePath = path.join(SITE_ROOT, oldPhotoUrl);
  fs.unlink(filePath, (err) => {
    if(err && err.code !== "ENOENT"){
      console.error("Não foi possível apagar a foto antiga do produto:", err);
    }
  });
}

function hashDaChave(chave){
  return crypto.createHash("sha256").update(String(chave)).digest("hex");
}

function conferirFotosDaPersonalizacao(escolhas, nomeDoProduto, pedidoAtual){
  for(const foto of escolhas?.personalizacao?.fotos || []){
    const linha = db.lerFotoPersonalizacao(foto.id);
    const confere = linha && linha.chave_hash === hashDaChave(foto.chave)
      && (!linha.pedido || linha.pedido === pedidoAtual);
    if(!confere){
      throw { status:409, message:`Uma das fotos de "${nomeDoProduto}" expirou. Envie a foto de novo no produto.` };
    }
  }
}

function buildValidatedItems(items, opcoes = {}){
  if(!Array.isArray(items) || items.length === 0){
    throw { status:400, message:"Carrinho vazio ou inválido." };
  }
  if(items.length > 30){
    throw { status:400, message:"Carrinho excede o limite de itens." };
  }
  const overridesMap = getProductOverridesMap();
  return items.map(raw => {
    const id = Number(raw?.id);
    const qty = Number(raw?.qty);
    const product = Number.isInteger(id) ? effectiveProduct(id, overridesMap) : null;
    if(!product){
      throw { status:400, message:`Produto inválido: ${raw?.id}` };
    }
    if(product.hidden){
      throw { status:409, message:`"${product.name}" não está mais disponível.` };
    }
    if(product.soldOut){
      throw { status:409, message:`"${product.name}" está esgotado no momento.` };
    }
    const brutas = opcoes.paraFrete ? regras.escolhasPadrao(product) : (raw?.escolhas ?? regras.escolhasPadrao(product));
    const validado = regras.validarEscolhas(product, brutas, qty);
    const { escolhas } = validado;
    const ok = opcoes.paraFrete ? !validado.erros.some(e => e.startsWith("Quantidade")) : validado.ok;
    const erros = opcoes.paraFrete ? validado.erros.filter(e => e.startsWith("Quantidade")) : validado.erros;
    if(!ok){
      throw { status:400, message:`${product.name}: ${erros[0]}` };
    }
    if(opcoes.conferirFotos !== false && !opcoes.paraFrete) conferirFotosDaPersonalizacao(escolhas, product.name, opcoes.pedidoAtual);
    const unitPrice = regras.precoUnitario(product, escolhas, qty);
    const resumo = regras.resumoDasEscolhas(product, escolhas);
    return { id, qty, product, escolhas, unitPrice, resumo };
  });
}

function isOfferedCarrier(companyName, serviceName){
  const company = String(companyName || "").toLowerCase();
  const service = String(serviceName || "").toLowerCase().trim();
  if(company.includes("loggi") && service.includes("express")) return true;
  if(company.includes("correios") && (service === "pac" || service === "sedex")) return true;
  return false;
}

const servicosComDiasExtras = new Set();
function avisarDiasExtrasDoPainel(q, extra){
  if(!extra || servicosComDiasExtras.has(q.id)) return;
  servicosComDiasExtras.add(q.id);
  console.warn(`Prazo de frete: o painel do Melhor Envio está somando ${extra} dia(s) ao prazo de ${q.company?.name || ""} ${q.name}. Se a entrega parece demorada para a cliente, confira os dias adicionais nas configurações de frete da conta do Melhor Envio.`);
}

async function quoteShipping(cepDestino, validatedItems){
  const pkg = buildPackage(validatedItems);

  const quotes = await meFetch("/api/v2/me/shipment/calculate", {
    method: "POST",
    timeoutMs: 8000,
    retries: 1,
    body: {
      from: { postal_code: process.env.ORIGIN_CEP },
      to: { postal_code: cepDestino },
      package: {
        weight: pkg.weight,
        width: pkg.width,
        height: pkg.height,
        length: pkg.length,
      },
      options: {
        insurance_value: pkg.insurance_value,
        receipt: false,
        own_hand: false,
        collect: false,
      },
    },
  });

  if(!Array.isArray(quotes)){
    console.error("Melhor Envio devolveu um formato inesperado na cotação:", quotes);
    return [];
  }

  return quotes
    .filter(q => !q.error && (q.custom_price || q.price))
    .filter(q => isOfferedCarrier(q.company?.name, q.name))
    .map(q => {
      const prazo = prazoDaCotacao(q);
      avisarDiasExtrasDoPainel(q, prazo.extra);
      return {
        service_id: q.id,
        name: `${q.company?.name ? q.company.name + " · " : ""}${q.name}`,
        price: Number(q.custom_price ?? q.price),
        delivery_time: prazo.texto,
        delivery_days: prazo.dias,
      };
    })
    .sort((a, b) => a.price - b.price);
}

const RETIRADA_ATIVA = String(process.env.RETIRADA_ATIVA || "true").toLowerCase() !== "false";
const LOCAL_DE_RETIRADA = process.env.RETIRADA_LOCAL || "Asa Norte, Brasília";
const OPCAO_RETIRADA = {
  service_id: "retirada",
  name: `Retirar na ${LOCAL_DE_RETIRADA.split(",")[0]} (grátis)`,
  price: 0,
  delivery_time: "combinamos o dia pelo WhatsApp quando o pedido ficar pronto",
  delivery_days: null,
  retirada: true,
};

async function opcoesDeEntrega(cep, validatedItems){
  let doMelhorEnvio = [];
  let aviso = null;
  if(!process.env.ORIGIN_CEP || !process.env.MELHOR_ENVIO_TOKEN){
    console.warn("Frete: ORIGIN_CEP ou MELHOR_ENVIO_TOKEN faltando no .env; só a retirada aparece.");
    return { opcoes: [OPCAO_RETIRADA], aviso: "O envio pelos Correios ainda não está ligado nesta loja. Por enquanto, só a retirada." };
  }
  try {
    doMelhorEnvio = await quoteShipping(cep, validatedItems);
  } catch (err) {
    if(!RETIRADA_ATIVA) throw err;
    if(err.status === 422 && err.data?.errors?.postal_code) throw err;
    console.error("Melhor Envio fora do ar ou sem token; oferecendo só a retirada:", err.message || err);
    aviso = "O cálculo dos Correios não respondeu agora. Tente de novo em instantes ou escolha a retirada.";
  }
  return { opcoes: RETIRADA_ATIVA ? [...doMelhorEnvio, OPCAO_RETIRADA] : doMelhorEnvio, aviso };
}

app.post("/api/calculate-shipping", freteLimiter, async (req, res) => {
  try {
    const cep = String(req.body?.cep || "").replace(/\D/g, "");
    if(!/^\d{8}$/.test(cep)){
      return res.status(400).json({ error: "CEP inválido." });
    }
    if(!process.env.ORIGIN_CEP && !RETIRADA_ATIVA){
      return res.status(500).json({ error: "Servidor sem CEP de origem configurado (ORIGIN_CEP no .env)." });
    }

    const validatedItems = buildValidatedItems(req.body?.items, { paraFrete: true });
    const { opcoes: options, aviso } = await opcoesDeEntrega(cep, validatedItems);

    if(options.length === 0){
      return res.status(200).json({ options: [], warning: "Nenhuma transportadora disponível para esse CEP." });
    }
    res.json({ options, ...(aviso ? { warning: aviso } : {}) });
  } catch (err) {
    if(!(err instanceof Error) && err.status && err.message){
      console.error("Erro de validação/frete:", err.message);
      return res.status(err.status).json({ error: err.message });
    }
    if(err.status === 422 && err.data?.errors?.postal_code){
      console.error("CEP recusado pelo Melhor Envio:", String(req.body?.cep || "").replace(/\D/g, ""));
      return res.status(400).json({ error: "CEP inválido." });
    }
    console.error("Erro ao calcular frete:", err);
    res.status(502).json({ error: "Não foi possível calcular o frete agora. Tente novamente em instantes." });
  }
});

app.post("/api/carrinho/conferir", freteLimiter, (req, res) => {
  const brutos = Array.isArray(req.body?.items) ? req.body.items.slice(0, 30) : [];
  const itens = brutos.map(item => {
    try {
      const [validado] = buildValidatedItems([item]);
      return { preco: validado.unitPrice, resumo: validado.resumo };
    } catch (erro) {
      return { erro: erro?.message || "Este item precisa de ajuste." };
    }
  });
  res.setHeader("Cache-Control", "no-store");
  res.json({ itens });
});

app.post("/api/validate-coupon", strictLimiter, (req, res) => {
  try {
    const coupon = findCoupon(req.body?.code);
    if(!coupon){
      return res.status(404).json({ error: "Cupom inválido ou expirado." });
    }
    if(coupon.oncePerCustomer && req.user && db.hasUsedCoupon({ code: coupon.code, userId: req.user.id })){
      return res.status(409).json({ error: COUPON_ALREADY_USED_MESSAGE });
    }
    const recusaAniversario = regraDoCupomDeAniversario(coupon, req.user?.id);
    if(recusaAniversario) return res.status(409).json({ error: recusaAniversario });
    const validatedItems = buildValidatedItems(req.body?.items, { conferirFotos: false });
    const subtotal = validatedItems.reduce((sum, { qty, unitPrice }) => sum + unitPrice * qty, 0);
    const discount = Math.round(subtotal * (coupon.percentOff / 100) * 100) / 100;
    res.json({ code: coupon.code, percentOff: coupon.percentOff, discount });
  } catch (err) {
    if(!(err instanceof Error) && err.status && err.message){
      return res.status(err.status).json({ error: err.message });
    }
    console.error("Erro ao validar cupom:", err);
    res.status(500).json({ error: "Não foi possível validar o cupom agora." });
  }
});

async function buildCheckoutDraft(req){
  const { cep: rawCep, shipping_service_id } = req.body || {};
  const ehRetirada = String(shipping_service_id) === "retirada";
  const address = ehRetirada && req.body?.address
    ? {
        ...req.body.address,
        rua: "Retirada na loja", numero: "-", complemento: "",
        bairro: "Asa Norte", cidade: "Brasília", uf: "DF",
      }
    : req.body?.address;
  const cep = String(rawCep || "").replace(/\D/g, "");
  if(!/^\d{8}$/.test(cep)){
    throw { status: 400, message: "CEP inválido." };
  }
  if(!shipping_service_id){
    throw { status: 400, message: "Escolha uma opção de frete." };
  }
  const paymentMethod = String(req.body?.paymentMethod || "card").toLowerCase();
  if(!PAYMENT_METHODS[paymentMethod]){
    throw { status: 400, message: "Forma de pagamento inválida." };
  }
  if(!auth.isValidAddress(address)){
    throw { status: 400, message: "Endereço de entrega incompleto." };
  }

  if(req.body?.saveAddress !== false && !ehRetirada){
    try{
      db.saveAddress(req.user.id, { ...address, cep });
    }catch(err){
      console.error("Falha ao salvar endereço padrão da conta:", err.message);
    }
  }

  const validatedItems = buildValidatedItems(req.body?.items, { pedidoAtual: req.pedidoAtual });

  const coupon = req.body?.coupon ? findCoupon(req.body.coupon) : null;
  if(req.body?.coupon && !coupon){
    throw { status: 409, message: "Esse cupom não é mais válido. Remova-o e tente novamente." };
  }

  const customerPhone = phoneDigits(address.telefone);
  if(coupon?.oncePerCustomer){
    const alreadyUsed = db.hasUsedCoupon({
      code: coupon.code,
      userId: req.user ? req.user.id : null,
      phone: customerPhone,
    });
    if(alreadyUsed){
      throw { status: 409, message: COUPON_ALREADY_USED_MESSAGE };
    }
  }

  const recusaAniversario = regraDoCupomDeAniversario(coupon, req.user?.id);
  if(recusaAniversario) throw { status: 409, message: recusaAniversario };

  const couponFactor = coupon ? (1 - coupon.percentOff / 100) : 1;

  let subtotal = 0, couponDiscount = 0;
  const itensComCupom = validatedItems.map(({ id, qty, product, unitPrice, resumo }) => {
    const afterCoupon = pricing.round2(unitPrice * couponFactor);
    subtotal += unitPrice * qty;
    couponDiscount += (unitPrice - afterCoupon) * qty;
    return { id, qty, product, afterCoupon, resumo };
  });
  subtotal = pricing.round2(subtotal);
  const discount = pricing.round2(couponDiscount);

  let pixDiscount = 0;
  const preferenceItems = itensComCupom.map(({ id, qty, product, afterCoupon, resumo }) => {
    const unitPrice = paymentMethod === "pix" ? pricing.pixPriceFor(afterCoupon) : afterCoupon;
    pixDiscount += (afterCoupon - unitPrice) * qty;
    const descricao = textoDoResumo(resumo);
    return {
      id: String(id),
      title: product.name.slice(0, 120),
      ...(descricao ? { description: descricao.slice(0, 250) } : {}),
      quantity: qty,
      unit_price: unitPrice,
      currency_id: "BRL",
    };
  });
  pixDiscount = pricing.round2(pixDiscount);

  const shippingOptions = String(shipping_service_id) === OPCAO_RETIRADA.service_id && RETIRADA_ATIVA
    ? [OPCAO_RETIRADA]
    : await quoteShipping(cep, validatedItems);
  const chosenShipping = shippingOptions.find(o => String(o.service_id) === String(shipping_service_id));
  if(!chosenShipping){
    throw { status: 409, message: "Essa opção de frete expirou ou não está mais disponível. Recalcule o frete e tente de novo." };
  }
  if(chosenShipping.price > 0){
    preferenceItems.push({
      id: "frete",
      title: `Frete — ${chosenShipping.name}`,
      quantity: 1,
      unit_price: chosenShipping.price,
      currency_id: "BRL",
    });
  }

  return {
    cep, address, paymentMethod, validatedItems, preferenceItems,
    coupon, customerPhone, chosenShipping, subtotal, discount, pixDiscount,
    total: pricing.round2(subtotal - discount - pixDiscount + chosenShipping.price),
  };
}

function orderRowFrom(draft, orderRef, user){
  return {
    externalReference: orderRef,
    userId: user?.id ?? null,
    customerEmail: user?.email ?? null,
    status: "pendente",
    items: draft.validatedItems.map(({ id, qty, product, unitPrice, escolhas, resumo }) => ({
      id, qty, price: unitPrice, nome: product.name, escolhas, resumo, config: product.config,
    })),
    address: { ...draft.address, cep: draft.cep },
    shipping: draft.chosenShipping,
    couponCode: draft.coupon ? draft.coupon.code : null,
    customerPhone: draft.customerPhone,
    subtotal: draft.subtotal,
    discount: draft.discount,
    pixDiscount: draft.pixDiscount,
    paymentMethod: draft.paymentMethod,
    shippingPrice: draft.chosenShipping.price,
    total: draft.total,
  };
}

function vincularFotosDoRascunho(draft, orderRef){
  const ids = draft.validatedItems.flatMap(({ escolhas }) => fotosDaPersonalizacao(escolhas));
  if(ids.length) db.vincularFotosAoPedido(ids, orderRef);
}

app.post("/api/create-preference", strictLimiter, auth.requireAuth, async (req, res) => {
  try {
    const draft = await buildCheckoutDraft(req);
    const { address, paymentMethod, preferenceItems } = draft;

    const orderRef = randomUUID();

    const payer = {
      name: address.nome,
      ...(req.user?.email ? { email: req.user.email } : {}),
    };

    const preference = new Preference(mpClient);
    const result = await preference.create({
      body: {
        items: preferenceItems,
        payer,
        payment_methods: {
          excluded_payment_types: PAYMENT_METHODS[paymentMethod].excludedPaymentTypes.map(id => ({ id })),
          installments: paymentMethod === "pix" ? 1 : pricing.PAYMENT_RULES.maxInstallments,
        },
        external_reference: orderRef,
        back_urls: {
          success: `${CLIENT_ORIGIN}/pagamento-sucesso.html`,
          failure: `${CLIENT_ORIGIN}/pagamento-erro.html`,
          pending: `${CLIENT_ORIGIN}/pagamento-pendente.html`,
        },
        auto_return: "approved",
        notification_url: `${process.env.SERVER_PUBLIC_URL || "https://SEU-DOMINIO-DO-SERVIDOR.com"}/api/webhook`,
        statement_descriptor: "ARTECANECAS",
      },
    });

    db.createOrder(orderRowFrom(draft, orderRef, req.user));
    vincularFotosDoRascunho(draft, orderRef);

    res.json({ id: result.id, init_point: result.init_point });
  } catch (err) {
    if(!(err instanceof Error) && err.status && err.message){
      return res.status(err.status).json({ error: err.message });
    }
    console.error("Erro ao criar preferência:", err);
    res.status(500).json({ error: "Não foi possível iniciar o pagamento. Tente novamente em instantes." });
  }
});

app.post("/api/create-pix-payment", strictLimiter, auth.requireAuth, async (req, res) => {
  try {
    const draft = await buildCheckoutDraft(req);
    if(draft.paymentMethod !== "pix"){
      return res.status(400).json({ error: "Esta rota é só para pagamento via Pix." });
    }

    const orderRef = randomUUID();
    const payment = new Payment(mpClient);
    const result = await payment.create({
      body: {
        transaction_amount: draft.total,
        description: `Pedido ${orderRef.slice(0, 8)} — Arte Canecas`,
        payment_method_id: "pix",
        external_reference: orderRef,
        notification_url: `${process.env.SERVER_PUBLIC_URL || "https://SEU-DOMINIO-DO-SERVIDOR.com"}/api/webhook`,
        payer: {
          email: req.user.email,
          first_name: draft.address.nome,
        },
      },
      requestOptions: { idempotencyKey: orderRef },
    });

    const tx = result.point_of_interaction?.transaction_data;
    if(!tx?.qr_code){
      console.error("Pix criado sem QR Code:", result.id, result.status);
      return res.status(502).json({ error: "Não foi possível gerar o código Pix agora. Tente novamente em instantes." });
    }

    db.createOrder(orderRowFrom(draft, orderRef, req.user));
    vincularFotosDoRascunho(draft, orderRef);
    db.updateOrderStatus(orderRef, "pendente", String(result.id));

    res.json({
      reference: orderRef,
      total: draft.total,
      qrCode: tx.qr_code,
      qrCodeBase64: tx.qr_code_base64,
      expiresAt: result.date_of_expiration || null,
    });
  } catch (err) {
    if(!(err instanceof Error) && err.status && err.message){
      return res.status(err.status).json({ error: err.message });
    }
    console.error("Erro ao criar pagamento Pix:", err);
    res.status(500).json({ error: "Não foi possível gerar o Pix agora. Tente novamente em instantes." });
  }
});

app.post("/api/orders/:reference/resume-payment", strictLimiter, auth.requireAuth, async (req, res) => {
  try {
    const order = db.getOrderByExternalReference(req.params.reference);
    if(!order || order.user_id !== req.user.id){
      return res.status(404).json({ error: "Pedido não encontrado." });
    }
    if(order.status !== "pendente"){
      return res.status(409).json({ error: "Este pedido não está mais pendente." });
    }

    const items = JSON.parse(order.items_json);
    const address = JSON.parse(order.address_json);
    const shipping = JSON.parse(order.shipping_json);

    const draft = await buildCheckoutDraft({
      user: req.user,
      pedidoAtual: order.external_reference,
      body: {
        items: items.map(({ id, qty, escolhas }) => ({ id, qty, escolhas })),
        cep: address.cep,
        address,
        shipping_service_id: shipping.service_id,
        coupon: order.coupon_code,
        paymentMethod: order.payment_method,
        saveAddress: false,
      },
    });
    const orderRef = order.external_reference;

    if(draft.paymentMethod === "pix"){
      const payment = new Payment(mpClient);
      const result = await payment.create({
        body: {
          transaction_amount: draft.total,
          description: `Pedido ${orderRef.slice(0, 8)} — Arte Canecas`,
          payment_method_id: "pix",
          external_reference: orderRef,
          notification_url: `${process.env.SERVER_PUBLIC_URL || "https://SEU-DOMINIO-DO-SERVIDOR.com"}/api/webhook`,
          payer: {
            email: req.user.email,
            first_name: draft.address.nome,
          },
        },
        requestOptions: { idempotencyKey: `${orderRef}-resume-${randomUUID()}` },
      });

      const tx = result.point_of_interaction?.transaction_data;
      if(!tx?.qr_code){
        console.error("Pix (retomada) criado sem QR Code:", result.id, result.status);
        return res.status(502).json({ error: "Não foi possível gerar o código Pix agora. Tente novamente em instantes." });
      }

      db.updateOrderDraft(orderRef, orderRowFrom(draft, orderRef, req.user.id));
      db.updateOrderStatus(orderRef, "pendente", String(result.id));

      return res.json({
        reference: orderRef,
        total: draft.total,
        qrCode: tx.qr_code,
        qrCodeBase64: tx.qr_code_base64,
        expiresAt: result.date_of_expiration || null,
      });
    }

    const { preferenceItems } = draft;
    const payer = {
      name: draft.address.nome,
      ...(req.user?.email ? { email: req.user.email } : {}),
    };
    const preference = new Preference(mpClient);
    const result = await preference.create({
      body: {
        items: preferenceItems,
        payer,
        payment_methods: {
          excluded_payment_types: PAYMENT_METHODS[draft.paymentMethod].excludedPaymentTypes.map(id => ({ id })),
          installments: pricing.PAYMENT_RULES.maxInstallments,
        },
        external_reference: orderRef,
        back_urls: {
          success: `${CLIENT_ORIGIN}/pagamento-sucesso.html`,
          failure: `${CLIENT_ORIGIN}/pagamento-erro.html`,
          pending: `${CLIENT_ORIGIN}/pagamento-pendente.html`,
        },
        auto_return: "approved",
        notification_url: `${process.env.SERVER_PUBLIC_URL || "https://SEU-DOMINIO-DO-SERVIDOR.com"}/api/webhook`,
        statement_descriptor: "ARTECANECAS",
      },
    });

    db.updateOrderDraft(orderRef, orderRowFrom(draft, orderRef, req.user.id));

    res.json({ id: result.id, init_point: result.init_point });
  } catch (err) {
    if(!(err instanceof Error) && err.status && err.message){
      return res.status(err.status).json({ error: err.message });
    }
    console.error("Erro ao retomar pagamento:", err);
    res.status(500).json({ error: "Não foi possível retomar o pagamento agora. Tente novamente em instantes." });
  }
});

app.get("/api/orders/:reference/status", statusPollLimiter, auth.requireAuth, (req, res) => {
  const order = db.getOrderByExternalReference(req.params.reference);
  if(!order || order.user_id !== req.user.id){
    return res.status(404).json({ error: "Pedido não encontrado." });
  }
  res.json({ status: order.status });
});

app.post("/api/orders/:reference/recebi", auth.requireAuth, (req, res) => {
  try {
    const order = db.getOrderByExternalReference(req.params.reference);
    if(!order || order.user_id !== req.user.id){
      return res.status(404).json({ error: "Pedido não encontrado." });
    }
    if(order.fulfillment_status === "entregue"){
      return res.json({ ok: true, jaEstava: true });
    }
    if(order.fulfillment_status !== "postado"){
      return res.status(409).json({ error: "Este pedido ainda não foi postado." });
    }
    db.markOrderDelivered(order.external_reference);
    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao confirmar recebimento:", err);
    res.status(500).json({ error: "Não foi possível confirmar agora." });
  }
});

app.get("/api/orders/:reference", statusPollLimiter, auth.requireAuth, async (req, res) => {
  try {
    const order = db.getOrderByExternalReference(req.params.reference);
    if(!order || order.user_id !== req.user.id){
      return res.status(404).json({ error: "Pedido não encontrado." });
    }
    const overridesMap = getProductOverridesMap();
    const items = JSON.parse(order.items_json).map(item => {
      const { id, qty, name, resumo, fotos } = itemParaExibir(item, overridesMap);
      return { id, qty, name, resumo, fotos };
    });
    const shipping = JSON.parse(order.shipping_json);
    const trackingCode = order.tracking_code || "";
    const { live, shipmentId, descoberto } = await rastreioDoPedido({
      trackingCode,
      shipmentId: order.melhor_envio_shipment_id,
    });
    if(descoberto && shipmentId) db.setMelhorEnvioShipmentId(order.external_reference, shipmentId);
    const entregou = fecharEntregaPeloRastreio(order, live);
    res.json({
      reference: order.external_reference,
      status: order.status,
      fulfillmentStatus: entregou ? "entregue" : (order.fulfillment_status || null),
      shippedAt: order.shipped_at || null,
      deliveredAt: entregou ? rastreio.dataDoEvento(entregou) || Date.now() : (order.delivered_at || null),
      items,
      shipping: { name: shipping.name, deliveryTime: shipping.delivery_time },
      total: order.total,
      createdAt: order.created_at,
      trackingCode,
      carrierUrl: rastreio.linkDaTransportadora(trackingCode),
      tracking: live,
      avaliarUrl: ["postado", "entregue"].includes(entregou ? "entregue" : order.fulfillment_status)
        ? linkDeAvaliacao(order.external_reference) : null,
      avaliado: resumoDaAvaliacao(order).completa,
    });
  } catch (err) {
    console.error("Erro ao carregar detalhe do pedido:", err);
    res.status(500).json({ error: "Não foi possível carregar o pedido agora." });
  }
});

const MAX_COMENTARIO_AVALIACAO = 1000;

function pedidoDoToken(req){
  const reference = String(req.params.reference || "");
  const token = String(req.headers["x-avaliar-token"] || "");
  if(!reference || !token) return null;
  const order = db.getOrderByExternalReference(reference);
  if(!order || order.status !== "pago") return null;
  return db.tokenDeAvaliacaoConfere(reference, token) ? order : null;
}

function produtosDoPedido(order){
  const overridesMap = getProductOverridesMap();
  const vistos = new Set();
  const lista = [];
  for(const item of JSON.parse(order.items_json)){
    if(vistos.has(item.id)) continue;
    vistos.add(item.id);
    const produto = effectiveProduct(item.id, overridesMap);
    lista.push({ id: item.id, name: produto?.name || `Produto #${item.id}`, photoUrl: produto?.photoUrl || null });
  }
  return lista;
}

function resumoDaAvaliacao(order){
  const produtos = produtosDoPedido(order).length;
  const feitas = db.avaliacoesDoPedido(order.external_reference);
  return {
    produtos,
    feitas: feitas.length,
    pendentes: feitas.filter(r => r.status === "pendente").length,
    completa: produtos > 0 && feitas.length >= produtos,
  };
}

function linkDeAvaliacao(reference){
  const token = db.garantirTokenDeAvaliacao(reference);
  return token ? `avaliar.html?pedido=${encodeURIComponent(reference)}#t=${token}` : null;
}

app.get("/api/avaliar/:reference", strictLimiter, (req, res) => {
  const order = pedidoDoToken(req);
  if(!order) return res.status(404).json({ error: "Link inválido ou expirado." });
  res.json({
    reference: order.external_reference,
    fulfillmentStatus: order.fulfillment_status || null,
    produtos: produtosDoPedido(order),
    avaliacoes: db.avaliacoesDoPedido(order.external_reference).map(r => ({
      productId: r.product_id, rating: r.rating, comment: r.comment, status: r.status, temFoto: !!r.photo_id,
    })),
  });
});

app.post("/api/avaliar/:reference/recebi", strictLimiter, (req, res) => {
  const order = pedidoDoToken(req);
  if(!order) return res.status(404).json({ error: "Link inválido ou expirado." });
  if(order.fulfillment_status === "entregue") return res.json({ ok: true, jaEstava: true });
  if(order.fulfillment_status !== "postado"){
    return res.status(409).json({ error: "Este pedido ainda não foi postado." });
  }
  db.markOrderDelivered(order.external_reference);
  res.json({ ok: true });
});

app.get("/api/avaliar/:reference/foto/:productId", strictLimiter, (req, res) => {
  const order = pedidoDoToken(req);
  if(!order) return res.status(404).end();
  const productId = Number(req.params.productId);
  const avaliacao = db.avaliacoesDoPedido(order.external_reference).find(r => r.product_id === productId);
  const foto = avaliacao?.photo_id ? db.getReviewPhoto(avaliacao.photo_id) : null;
  if(!foto) return res.status(404).end();
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Type", foto.mime_type);
  res.end(Buffer.from(foto.data));
});

const reviewPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 10, fields: 20, fieldSize: 20000 },
  fileFilter(req, file, cb){ cb(null, Boolean(PRODUCT_PHOTO_MIME_EXT[file.mimetype])); },
});

async function processarFotoDeAvaliacao(buffer){
  return sharp(buffer)
    .rotate()
    .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}

app.post("/api/avaliar/:reference", avaliacaoLimiter, (req, res) => {
  const order = pedidoDoToken(req);
  if(!order) return res.status(404).json({ error: "Link inválido ou expirado." });
  if(order.fulfillment_status !== "entregue"){
    return res.status(409).json({ error: "Confirme que recebeu o pedido antes de avaliar." });
  }

  reviewPhotoUpload.any()(req, res, async (err) => {
    if(err instanceof multer.MulterError){
      const msg = err.code === "LIMIT_FILE_SIZE" ? "Uma das fotos passou de 4MB." : "Não foi possível receber as fotos.";
      return res.status(413).json({ error: msg });
    }
    if(err){
      console.error("Erro no upload da avaliação:", err);
      return res.status(500).json({ error: "Não foi possível enviar agora." });
    }

    let enviadas;
    try { enviadas = JSON.parse(req.body?.avaliacoes || "[]"); } catch { enviadas = null; }
    if(!Array.isArray(enviadas) || enviadas.length === 0){
      return res.status(400).json({ error: "Escolha as estrelas de pelo menos um produto." });
    }

    const doPedido = new Set(produtosDoPedido(order).map(p => p.id));
    const fotos = new Map((req.files || []).map(f => [f.fieldname, f]));
    let endereco = {};
    try { endereco = JSON.parse(order.address_json) || {}; } catch {}
    const firstName = String(endereco.nome || "").trim().split(" ")[0].slice(0, 40) || null;
    const city = endereco.cidade ? `${String(endereco.cidade).trim().slice(0, 60)}${endereco.uf ? "/" + String(endereco.uf).trim().slice(0, 2).toUpperCase() : ""}` : null;

    const validas = [];
    for(const item of enviadas.slice(0, 20)){
      const productId = Number(item?.productId);
      const rating = Number(item?.rating);
      if(!doPedido.has(productId) || !Number.isInteger(rating) || rating < 1 || rating > 5) continue;
      const arquivo = fotos.get(`foto-${productId}`) || null;
      if(arquivo && item?.autorizaFoto !== true){
        return res.status(400).json({ error: "Para enviar foto, marque a autorização de uso da imagem." });
      }
      validas.push({
        productId, rating, arquivo, removerFoto: item?.removerFoto === true,
        comment: String(item?.comment || "").trim().slice(0, MAX_COMENTARIO_AVALIACAO),
      });
    }
    if(validas.length === 0){
      return res.status(400).json({ error: "Escolha as estrelas de pelo menos um produto." });
    }

    const existentes = new Map(db.avaliacoesDoPedido(order.external_reference).map(r => [r.product_id, r]));
    let salvas = 0;
    try{
      for(const v of validas){
        const anterior = existentes.get(v.productId);
        let photoId = null;
        let consentimento = null;
        if(v.arquivo){
          photoId = randomUUID();
          consentimento = Date.now();
          db.insertReviewPhoto(photoId, "image/jpeg", await processarFotoDeAvaliacao(v.arquivo.buffer));
        } else if(!v.removerFoto && anterior?.photo_id){
          photoId = anterior.photo_id;
          consentimento = anterior.photo_consent_at;
        }
        const gravou = db.salvarAvaliacao({
          orderReference: order.external_reference, productId: v.productId, rating: v.rating,
          comment: v.comment, photoId, photoConsentAt: consentimento, firstName, city,
        });
        if(gravou){
          salvas++;
          if(anterior?.photo_id && anterior.photo_id !== photoId) db.apagarFotoOrfaDeAvaliacao(anterior.photo_id);
        }
        else if(v.arquivo) db.apagarFotoOrfaDeAvaliacao(photoId);
      }
    }catch(procErr){
      console.error("Erro ao gravar avaliação:", procErr);
      return res.status(500).json({ error: "Não foi possível processar a foto enviada." });
    }

    if(salvas === 0){
      return res.status(409).json({ error: "Essas avaliações já foram enviadas e estão com a loja." });
    }
    res.json({ ok: true, salvas });
  });
});

const ROTA_FOTO_AVALIACAO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const LARGURAS_FOTO_AVALIACAO = new Set([160, 640]);

app.get("/api/avaliacoes/fotos/:id", async (req, res) => {
  if(!ROTA_FOTO_AVALIACAO.test(req.params.id)) return res.status(404).end();
  const foto = db.getReviewPhotoPublicada(req.params.id);
  if(!foto) return res.status(404).end();
  res.setHeader("Cache-Control", "public, max-age=3600");

  const pedida = Number(req.query.w);
  const largura = LARGURAS_FOTO_AVALIACAO.has(pedida) ? pedida : null;
  if(!largura){
    res.setHeader("Content-Type", foto.mime_type);
    return res.end(Buffer.from(foto.data));
  }

  const formato = /\bimage\/webp\b/.test(req.headers.accept || "") ? "webp" : "jpeg";
  res.vary("Accept");
  const emCache = db.getReviewPhotoVariant(req.params.id, largura, formato);
  if(emCache){
    res.setHeader("Content-Type", emCache.mime_type);
    return res.end(Buffer.from(emCache.data));
  }
  try{
    const mime = formato === "webp" ? "image/webp" : "image/jpeg";
    let pipeline = sharp(Buffer.from(foto.data)).resize({ width: largura, withoutEnlargement: true });
    pipeline = formato === "webp" ? pipeline.webp({ quality: 74 }) : pipeline.jpeg({ quality: 80, mozjpeg: true });
    const reduzida = await pipeline.toBuffer();
    db.saveReviewPhotoVariant(req.params.id, largura, formato, mime, reduzida);
    res.setHeader("Content-Type", mime);
    res.end(reduzida);
  }catch(err){
    console.error("Não foi possível reduzir a foto da avaliação:", err.message || err);
    res.setHeader("Content-Type", foto.mime_type);
    res.end(Buffer.from(foto.data));
  }
});
app.get("/api/depoimentos/fotos/:id", async (req, res) => {
  if(!ROTA_FOTO_AVALIACAO.test(req.params.id)) return res.status(404).end();
  const foto = db.getFotoDeDepoimentoPublicado(req.params.id);
  if(!foto) return res.status(404).end();
  res.setHeader("Cache-Control", "public, max-age=3600");

  const pedida = Number(req.query.w);
  const largura = LARGURAS_FOTO_AVALIACAO.has(pedida) ? pedida : null;
  if(!largura){
    res.setHeader("Content-Type", foto.mime_type);
    return res.end(Buffer.from(foto.data));
  }

  const formato = /\bimage\/webp\b/.test(req.headers.accept || "") ? "webp" : "jpeg";
  res.vary("Accept");
  const emCache = db.getReviewPhotoVariant(req.params.id, largura, formato);
  if(emCache){
    res.setHeader("Content-Type", emCache.mime_type);
    return res.end(Buffer.from(emCache.data));
  }
  try{
    const mime = formato === "webp" ? "image/webp" : "image/jpeg";
    let pipeline = sharp(Buffer.from(foto.data)).resize({ width: largura, withoutEnlargement: true });
    pipeline = formato === "webp" ? pipeline.webp({ quality: 74 }) : pipeline.jpeg({ quality: 80, mozjpeg: true });
    const reduzida = await pipeline.toBuffer();
    db.saveReviewPhotoVariant(req.params.id, largura, formato, mime, reduzida);
    res.setHeader("Content-Type", mime);
    res.end(reduzida);
  }catch(err){
    console.error("Não foi possível reduzir a foto do depoimento:", err.message || err);
    res.setHeader("Content-Type", foto.mime_type);
    res.end(Buffer.from(foto.data));
  }
});


async function purchaseShippingLabel(order, externalReference){
  if(order.shipping?.service_id === OPCAO_RETIRADA.service_id){
    throw { status: 409, message: "Este pedido é para retirada na loja: não precisa de etiqueta." };
  }
  const seller = {
    name: process.env.SELLER_NAME,
    phone: process.env.SELLER_PHONE,
    email: process.env.SELLER_EMAIL,
    document: process.env.SELLER_DOCUMENT,
    address: process.env.SELLER_ADDRESS,
    complement: process.env.SELLER_COMPLEMENT || "",
    number: process.env.SELLER_NUMBER,
    district: process.env.SELLER_DISTRICT,
    city: process.env.SELLER_CITY,
    state_abbr: process.env.SELLER_STATE,
    postal_code: process.env.ORIGIN_CEP,
    country_id: "BR",
  };

  const labelOverridesMap = getProductOverridesMap();
  const labelItems = order.items
    .map(({ id, qty, price }) => ({ qty, product: effectiveProduct(id, labelOverridesMap), unitPrice: price }))
    .filter(({ product }) => product);
  if(labelItems.length === 0){
    throw new Error("Nenhum item válido no pedido para gerar a etiqueta.");
  }
  const items = labelItems.map(({ qty, product, unitPrice }) => ({
    name: product.name, quantity: qty, unitary_value: unitPrice ?? product.price,
  }));
  const pkg = buildPackage(labelItems);

  const cartItem = await meFetch("/api/v2/me/cart", {
    method: "POST",
    timeoutMs: 30000,
    body: {
      service: order.shipping.service_id,
      from: seller,
      to: {
        name: order.address.nome,
        phone: order.address.telefone,
        address: order.address.rua,
        complement: order.address.complemento || "",
        number: order.address.numero,
  district: order.address.bairro,
        city: order.address.cidade,
        state_abbr: order.address.uf,
        postal_code: order.address.cep,
        country_id: "BR",
      },
      products: items,
      volumes: [{ height: pkg.height, width: pkg.width, length: pkg.length, weight: pkg.weight }],
      options: {
        insurance_value: pkg.insurance_value,
        receipt: false,
        own_hand: false,
        non_commercial: false,
      },
    },
  });

  if(externalReference) db.setMelhorEnvioShipmentId(externalReference, String(cartItem.id));

  await meFetch("/api/v2/me/shipment/checkout", {
    method: "POST",
    timeoutMs: 30000,
    body: { orders: [cartItem.id] },
  });

  const generated = await meFetch("/api/v2/me/shipment/generate", {
    method: "POST",
    timeoutMs: 30000,
    body: { orders: [cartItem.id] },
  });

  return generated;
}

const PAYMENT_STATUS_MAP = {
  approved: "pago",
  pending: "pendente",
  in_process: "em análise",
  rejected: "recusado",
  cancelled: "cancelado",
  refunded: "reembolsado",
  charged_back: "estornado",
};

async function avisarLojista({ kind, orderReference, conteudo }){
  const destino = process.env.OWNER_EMAIL;
  if(!destino) return null;
  const id = db.enqueueEmail({
    kind,
    toEmail: destino,
    orderReference: orderReference || null,
    subject: conteudo.subject,
    textBody: conteudo.text,
    htmlBody: conteudo.html,
  });
  await entregarEmailDaFila(id);
  return id;
}

async function entregarEmailDaFila(id){
  if(!id) return;
  const linha = db.getOutboxEmail(id);
  if(!linha || linha.sent_at) return;
  try{
    await emailPhotos.enviarComMiniaturas({
      to: linha.to_email,
      subject: linha.subject,
      text: linha.text_body,
      html: linha.html_body,
    });
    db.markEmailSent(id);
    console.log(`E-mail "${linha.kind}" entregue a ${linha.to_email} (pedido ${linha.order_reference || "-"}).`);
  }catch(err){
    db.markEmailFailed(id, err.message || err);
    console.error(`Falha ao entregar e-mail "${linha.kind}" — segue na fila para nova tentativa:`, err.message || err);
  }
}

function fecharEntregaPeloRastreio(order, live){
  if(!order || order.fulfillment_status !== "postado") return null;
  const evento = rastreio.eventoDeEntrega(live);
  if(!evento) return null;
  db.markOrderDelivered(order.external_reference, rastreio.dataDoEvento(evento));
  return evento;
}

function estadoDoAvisoDePostagem(reference){
  const linha = db.getOutboxEntry("pedido_postado", reference);
  if(!linha) return null;
  return {
    enviadoEm: linha.sent_at || null,
    tentativas: linha.attempts || 0,
    ultimoErro: linha.last_error || null,
  };
}

function salvarRastreioEAvisar(reference, trackingCode){
  if(!reference || !trackingCode) return null;

  const anterior = db.getOrderByExternalReference(reference);
  const corrigiuOCodigo = !!anterior?.tracking_code && anterior.tracking_code !== trackingCode;
  db.updateOrderTracking(reference, trackingCode);

  if(corrigiuOCodigo) db.deleteOutboxEntry("pedido_postado", reference);

  const pedido = db.getOrderByExternalReference(reference);
  if(!pedido || !pedido.customer_email) return null;

  let endereco = null;
  try { endereco = JSON.parse(pedido.address_json); } catch { endereco = null; }

  const conteudo = email.formatTrackingEmail({
    externalReference: reference,
    trackingCode,
    address: endereco,
    trackUrl: `${CLIENT_ORIGIN}/acompanhar-pedido.html?pedido=${encodeURIComponent(reference)}`,
  });
  return db.enqueueEmail({
    kind: "pedido_postado",
    toEmail: pedido.customer_email,
    orderReference: reference,
    subject: conteudo.subject,
    textBody: conteudo.text,
    htmlBody: conteudo.html,
  });
}

async function runApprovedOrderSideEffects(orderRow, info){
  const order = {
    items: JSON.parse(orderRow.items_json),
    address: JSON.parse(orderRow.address_json),
    shipping: JSON.parse(orderRow.shipping_json),
  };

  let rastreioDaEtiqueta = null;

  if(process.env.AUTO_PURCHASE_SHIPPING_LABEL === "true"){
    try{
      const label = await purchaseShippingLabel(order, info.external_reference);
      console.log("Etiqueta de envio comprada:", label);
      rastreioDaEtiqueta = label?.[0]?.tracking || label?.tracking || null;
    }catch(labelErr){
      console.error("Falha ao comprar etiqueta automaticamente (pedido ficou pago, mas sem etiqueta — gere manualmente no painel do Melhor Envio):", labelErr);
    }
  } else {
    console.log("Pagamento aprovado. Gere a etiqueta manualmente no painel do Melhor Envio para o pedido:", info.external_reference);
  }

  const notifyOverridesMap = getProductOverridesMap();
  const notificationOrder = {
    externalReference: info.external_reference,
    items: order.items.map(item => {
      const { id, qty, name, photoUrl, resumo, fotos } = itemParaExibir(item, notifyOverridesMap);
      return { id, qty, name, photoUrl, resumo, fotos: fotos.length };
    }),
    address: order.address,
    total: orderRow.total,
    paidAt: info.date_approved || info.date_created || Date.now(),
  };

  if(whatsapp.estaConfigurado()){
    try{
      await whatsapp.notifyOwnerOfPaidOrder(notificationOrder);
      console.log(`Aviso de WhatsApp enviado à lojista para o pedido ${info.external_reference}.`);
    }catch(waErr){
      console.error(`Falha ao enviar aviso de WhatsApp (pedido ${info.external_reference} segue pago normalmente):`, waErr.message || waErr);
    }
  }

  try{
    const naFila = await avisarLojista({
      kind: "aviso_venda",
      orderReference: info.external_reference,
      conteudo: email.formatOrderEmail({
        ...notificationOrder,
        adminUrl: `${CLIENT_ORIGIN}/admin.html?pedido=${encodeURIComponent(info.external_reference)}`,
      }),
    });
    if(!naFila) console.warn(`OWNER_EMAIL não configurado — aviso do pedido ${info.external_reference} não foi enfileirado.`);
  }catch(mailErr){
    console.error(`Falha ao preparar o aviso da lojista (pedido ${info.external_reference} segue pago normalmente):`, mailErr.message || mailErr);
  }

  if(orderRow.customer_email){
    const conteudo = email.formatOrderConfirmationEmail({
      externalReference: info.external_reference,
      items: order.items.map(item => {
        const { qty, unitPrice, name, photoUrl, resumo } = itemParaExibir(item, notifyOverridesMap);
        return { qty, price: unitPrice, name, photoUrl, resumo };
      }),
      subtotal: orderRow.subtotal,
      discount: orderRow.discount,
      pixDiscount: orderRow.pix_discount,
      shippingPrice: orderRow.shipping_price,
      total: orderRow.total,
      couponCode: orderRow.coupon_code,
      address: order.address,
      paidAt: info.date_approved || info.date_created || Date.now(),
      trackUrl: `${CLIENT_ORIGIN}/acompanhar-pedido.html?pedido=${encodeURIComponent(info.external_reference)}`,
    });
    const id = db.enqueueEmail({
      kind: "pedido_confirmado",
      toEmail: orderRow.customer_email,
      orderReference: info.external_reference,
      subject: conteudo.subject,
      textBody: conteudo.text,
      htmlBody: conteudo.html,
    });
    await entregarEmailDaFila(id);
  } else {
    console.warn(`Pedido ${info.external_reference} sem e-mail da cliente gravado — recibo não enviado.`);
  }

  if(rastreioDaEtiqueta){
    await entregarEmailDaFila(salvarRastreioEAvisar(info.external_reference, rastreioDaEtiqueta));
  }
}

function verifyMpWebhookSignature(req, dataId) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true;
  const crypto = require("crypto");
  const parts = Object.fromEntries(
    String(req.get("x-signature") || "")
      .split(",")
      .map(kv => kv.split("=").map(s => s?.trim()))
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;
  const requestId = req.get("x-request-id") || "";
  const idForManifest = /[a-zA-Z]/.test(String(dataId)) ? String(dataId).toLowerCase() : String(dataId);
  const manifest = `id:${idForManifest};request-id:${requestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
  } catch {
    return false;
  }
}

app.post("/api/webhook", async (req, res) => {
  try {
    const paymentId = req.query?.["data.id"] || req.body?.data?.id;
    const topic = req.query?.type || req.body?.type;

    if (topic === "payment" && paymentId) {
      if (!verifyMpWebhookSignature(req, paymentId)) {
        console.warn(`Webhook: assinatura x-signature inválida para ${paymentId} — ignorado.`);
        return res.sendStatus(401);
      }
      const payment = new Payment(mpClient);
      const info = await payment.get({ id: paymentId });
      console.log(`Webhook recebido — pagamento ${paymentId}: ${info.status}`);

      const orderRow = info.external_reference
        ? db.getOrderByExternalReference(info.external_reference)
        : null;

      if(!orderRow){
        console.warn(`Webhook: pagamento ${paymentId} não corresponde a nenhum pedido conhecido (external_reference=${info.external_reference || "ausente"}).`);
        return res.sendStatus(200);
      }

      const wasAlreadyApproved = orderRow.status === "pago";
      const status = PAYMENT_STATUS_MAP[info.status] || info.status;
      db.updateOrderStatus(info.external_reference, status, String(paymentId));
      if(info.status === "approved" && !wasAlreadyApproved){
        db.markOrderInProduction(info.external_reference);
      }

      res.sendStatus(200);

      if(info.status === "approved" && !wasAlreadyApproved){
        runApprovedOrderSideEffects(orderRow, info).catch(err => {
          console.error(`Falha inesperada processando efeitos do pedido ${info.external_reference}:`, err);
        });
      }
      return;
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Erro no webhook:", err);
    if(!res.headersSent) res.sendStatus(500);
  }
});

const WELCOME_COUPON_CODE = "BEMVINDA10";

app.post("/api/newsletter", strictLimiter, async (req, res) => {
  const emailAddress = auth.normalizeEmail(req.body?.email);
  if(!auth.isValidEmail(emailAddress)){
    return res.status(400).json({ error: "E-mail inválido." });
  }

  db.addNewsletterSubscriber(emailAddress);

  const coupon = db.getCoupon(WELCOME_COUPON_CODE);
  if(!coupon){
    console.warn(`Cupom de boas-vindas ${WELCOME_COUPON_CODE} não existe — inscrição salva sem cupom.`);
    return res.json({ ok: true, coupon: null });
  }

  let emailed = false;
  try {
    const unsubscribeToken = db.getOrCreateUnsubscribeToken(emailAddress);
    const unsubscribeUrl = `${CLIENT_ORIGIN}/api/newsletter/unsubscribe?email=${encodeURIComponent(emailAddress)}&token=${unsubscribeToken}`;
    await email.sendWelcomeCouponEmail({
      to: emailAddress,
      couponCode: coupon.code,
      percentOff: coupon.percent_off,
      shopUrl: `${CLIENT_ORIGIN}/`,
      unsubscribeUrl,
    });
    emailed = true;
  } catch (err) {
    console.error("Falha ao enviar o cupom de boas-vindas por e-mail:", err.message);
  }

  res.json({ ok: true, coupon: coupon.code, percentOff: coupon.percent_off, emailed });
});

function handleNewsletterUnsubscribe(req, res) {
  const emailAddress = auth.normalizeEmail(req.query.email || req.body?.email || "");
  const token = req.query.token || req.body?.token || "";
  const ok = emailAddress && token && db.unsubscribeNewsletter(emailAddress, token);
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Descadastro — Arte Canecas</title></head>
<body style="margin:0; padding:0; background:#FBF8F3; font-family:'Segoe UI', Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF8F3;"><tr><td align="center" style="padding:64px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px; background:#FFFFFF; border-radius:24px; padding:36px 32px; text-align:center;">
      <tr><td style="font-size:26px; padding-bottom:10px; color:#CD7031;">${ok ? "✿" : "!"}</td></tr>
      <tr><td style="color:#323230; font-size:18px; font-weight:bold; padding-bottom:8px;">
        ${ok ? "Descadastro concluído" : "Não foi possível descadastrar"}
      </td></tr>
      <tr><td style="color:#6B6259; font-size:14px; line-height:1.6;">
        ${ok
          ? "Você não vai mais receber e-mails promocionais da Arte Canecas. Pedidos e redefinições de senha continuam chegando normalmente, se você tiver conta."
          : "O link parece inválido ou já foi usado. Se precisar de ajuda, fale pelo WhatsApp."}
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`);
}
app.get("/api/newsletter/unsubscribe", handleNewsletterUnsubscribe);
app.post("/api/newsletter/unsubscribe", handleNewsletterUnsubscribe);

app.post("/api/contact", strictLimiter, async (req, res) => {
  const nome = (req.body?.nome || "").trim().slice(0, 120);
  const telefone = (req.body?.telefone || "").trim().slice(0, 30);
  const ocasiao = (req.body?.ocasiao || "").trim().slice(0, 40);
  const mensagem = (req.body?.mensagem || "").trim().slice(0, 2000);

  if(!nome || !telefone || !mensagem){
    return res.status(400).json({ error: "Preencha nome, telefone e mensagem." });
  }
  db.createContactMessage({ nome, telefone, ocasiao, mensagem });

  try{
    await avisarLojista({
      kind: "aviso_contato",
      conteudo: email.formatContactEmail({ nome, telefone, ocasiao, mensagem }),
    });
  }catch(err){
    console.error("Falha ao preparar o aviso de mensagem de contato:", err.message || err);
  }

  res.json({ ok: true });
});

app.post("/api/auth/register", authLimiter, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = auth.normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const cpf = auth.normalizeCpf(req.body?.cpf);

    if(!auth.isValidName(name)){
      return res.status(400).json({ error: "Informe seu nome completo." });
    }
    if(!auth.isValidEmail(email)){
      return res.status(400).json({ error: "E-mail inválido." });
    }
    if(!auth.isValidPassword(password)){
      return res.status(400).json({ error: "A senha precisa ter entre 8 e 72 caracteres." });
    }
    if(!auth.isValidCpf(cpf)){
      return res.status(400).json({ error: "CPF inválido — confira os números digitados." });
    }
    if(db.getUserByEmail(email) || auth.isAdminEmail(email)){
      return res.status(409).json({ error: "Já existe uma conta com este e-mail." });
    }

    const passwordHash = await auth.hashPassword(password);
    const user = db.createUser({ name, email, passwordHash, cpf });
    auth.issueSession(res, user.id);
    res.status(201).json({ id: user.id, name: user.name, email: user.email, cpf: user.cpf, isAdmin: auth.isAdminEmail(user.email) });
  } catch (err) {
    console.error("Erro ao criar conta:", err);
    res.status(500).json({ error: "Não foi possível criar a conta agora. Tente novamente em instantes." });
  }
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const emailAddress = auth.normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const ip = auth.clientIp(req);
    const genericError = () => res.status(401).json({ error: "E-mail ou senha inválidos." });

    if(!auth.isValidEmail(emailAddress) || !password){
      return genericError();
    }

    const lockout = auth.checkLoginLockout(emailAddress, ip);
    if(lockout.locked){
      const minutos = Math.ceil(lockout.retryAfterMs / 60000);
      return res.status(429).json({
        error: `Muitas tentativas. Tente novamente em ${minutos} minuto${minutos === 1 ? "" : "s"}.`,
        lockedForMs: lockout.retryAfterMs,
      });
    }

    const user = db.getUserByEmail(emailAddress);
    const ok = await auth.verifyPassword(password, user?.password_hash);
    if(!user || !ok){
      db.recordLoginAttempt({ email: emailAddress, ip, ok: false });
      const depois = auth.checkLoginLockout(emailAddress, ip);
      if(depois.locked && depois.failures === auth.LOGIN_MAX_FAILURES && auth.isAdminEmail(emailAddress)){
        email.sendAdminLoginAlert({ email: emailAddress, ip, failures: depois.failures })
          .catch(err => console.error("Falha ao avisar sobre tentativas de login:", err.message));
      }
      return genericError();
    }

    if(user.totp_secret){
      const challengeToken = auth.issueTwoFactorChallenge(user.id);
      return res.json({ twoFactorRequired: true, challengeToken });
    }

    db.recordLoginAttempt({ email: emailAddress, ip, ok: true });
    auth.issueSession(res, user.id);
    res.json({ id: user.id, name: user.name, email: user.email, cep: user.cep || null, isAdmin: auth.isAdminEmail(user.email) });
  } catch (err) {
    console.error("Erro ao fazer login:", err);
    res.status(500).json({ error: "Não foi possível entrar agora. Tente novamente em instantes." });
  }
});

app.get("/api/auth/google/config", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(googleAuth.estaConfigurado()
    ? { enabled: true, clientId: process.env.GOOGLE_CLIENT_ID }
    : { enabled: false });
});

function nomeVindoDoGoogle(perfil){
  const bruto = String(perfil.nome || "").trim() || String(perfil.email).split("@")[0];
  return bruto.slice(0, 80);
}

function recusaGoogleParaContaProtegida(emailAddress, user){
  if(auth.isAdminEmail(emailAddress) || user?.totp_secret){
    return "Esta conta usa verificação em duas etapas. Entre com e-mail e senha.";
  }
  return null;
}

app.post("/api/auth/google", authLimiter, async (req, res) => {
  const ip = req.ip;
  try {
    const perfil = await googleAuth.verificarTokenDoGoogle(req.body?.credential);
    const emailAddress = auth.normalizeEmail(perfil.email);
    if(!auth.isValidEmail(emailAddress)){
      return res.status(401).json({ error: "Não consegui ler o e-mail da sua conta Google." });
    }

    const jaVinculada = db.getUserByGoogleId(perfil.sub);
    if(jaVinculada){
      const recusa = recusaGoogleParaContaProtegida(jaVinculada.email, jaVinculada);
      if(recusa) return res.status(409).json({ error: recusa });
      db.recordLoginAttempt({ email: jaVinculada.email, ip, ok: true });
      auth.issueSession(res, jaVinculada.id);
      return res.json({
        id: jaVinculada.id, name: jaVinculada.name, email: jaVinculada.email,
        cep: jaVinculada.cep || null, isAdmin: auth.isAdminEmail(jaVinculada.email),
      });
    }

    const recusa = recusaGoogleParaContaProtegida(emailAddress, db.getUserByEmail(emailAddress));
    if(recusa) return res.status(409).json({ error: recusa });

    if(db.getUserByEmail(emailAddress)){
      return res.status(409).json({
        error: "Já existe uma conta com este e-mail. Entre com sua senha e vincule o Google em Minha conta.",
        contaExistente: true,
      });
    }

    const senhaImpossivel = await auth.hashPassword(require("crypto").randomBytes(32).toString("hex"));
    const user = db.createUser({
      name: nomeVindoDoGoogle(perfil), email: emailAddress,
      passwordHash: senhaImpossivel, cpf: null,
      googleId: perfil.sub, semSenha: true,
    });
    db.recordLoginAttempt({ email: emailAddress, ip, ok: true });
    auth.issueSession(res, user.id);
    res.status(201).json({
      id: user.id, name: user.name, email: user.email, cep: null,
      isAdmin: auth.isAdminEmail(user.email),
    });
  } catch (err) {
    if(err.status){
      return res.status(err.status === 400 ? 400 : (err.status === 503 ? 503 : 401))
        .json({ error: err.status === 503 ? "Entrar com o Google não está disponível." : "Não consegui confirmar sua conta Google. Tente de novo." });
    }
    console.error("Erro no login com o Google:", err);
    res.status(500).json({ error: "Não foi possível entrar agora. Tente novamente em instantes." });
  }
});

app.post("/api/auth/google/vincular", authLimiter, auth.requireAuth, async (req, res) => {
  try {
    const perfil = await googleAuth.verificarTokenDoGoogle(req.body?.credential);
    const emailDoToken = auth.normalizeEmail(perfil.email);
    const user = db.getUserById(req.user.id);
    if(emailDoToken !== auth.normalizeEmail(user.email)){
      return res.status(403).json({ error: "Essa conta Google usa outro e-mail. Entre com a conta Google deste mesmo e-mail." });
    }
    if(auth.isAdminEmail(user.email) || user.totp_secret){
      return res.status(409).json({ error: "Contas com verificação em duas etapas entram só com e-mail e senha." });
    }
    const jaDeOutra = db.getUserByGoogleId(perfil.sub);
    if(jaDeOutra && jaDeOutra.id !== user.id){
      return res.status(409).json({ error: "Esta conta Google já está ligada a outro cadastro." });
    }
    const vinculou = db.setUserGoogleId(user.id, perfil.sub);
    res.json({ ok: true, jaEstava: !vinculou });
  } catch (err) {
    if(err.status) return res.status(err.status === 400 ? 400 : 401).json({ error: "Não consegui confirmar sua conta Google." });
    console.error("Erro ao vincular conta Google:", err);
    res.status(500).json({ error: "Não foi possível vincular agora. Tente novamente." });
  }
});

app.post("/api/auth/login/2fa", authLimiter, async (req, res) => {
  try {
    const challengeToken = String(req.body?.challengeToken || "");
    const code = String(req.body?.code || "").trim();
    const userId = auth.peekTwoFactorChallenge(challengeToken);
    if(!userId){
      return res.status(401).json({ error: "Sessão expirada. Faça login novamente.", restart: true });
    }
    const user = db.getUserById(userId);
    if(!user?.totp_secret){
      auth.consumeTwoFactorChallenge(challengeToken);
      return res.status(401).json({ error: "Sessão expirada. Faça login novamente.", restart: true });
    }

    const ip = auth.clientIp(req);
    const lockout = auth.checkLoginLockout(user.email, ip);
    if(lockout.locked){
      const minutos = Math.ceil(lockout.retryAfterMs / 60000);
      return res.status(429).json({ error: `Muitas tentativas. Tente novamente em ${minutos} minuto${minutos === 1 ? "" : "s"}.` });
    }

    let ok = auth.verifyTotp(user.totp_secret, code);
    if(!ok){
      const restantes = await auth.consumeRecoveryCode(code, JSON.parse(user.totp_recovery_json || "[]"));
      if(restantes){
        ok = true;
        db.setUserTotp(user.id, { secret: user.totp_secret, recoveryJson: JSON.stringify(restantes) });
      }
    }
    if(!ok){
      ok = await auth.verifyTwoFactorEmailCode(challengeToken, code);
    }

    if(!ok){
      db.recordLoginAttempt({ email: user.email, ip, ok: false });
      return res.status(401).json({ error: "Código inválido. Confira o app e tente de novo." });
    }

    auth.consumeTwoFactorChallenge(challengeToken);
    db.recordLoginAttempt({ email: user.email, ip, ok: true });
    auth.issueSession(res, user.id);
    res.json({ id: user.id, name: user.name, email: user.email, cep: user.cep || null, isAdmin: auth.isAdminEmail(user.email) });
  } catch (err) {
    console.error("Erro na verificação em duas etapas:", err);
    res.status(500).json({ error: "Não foi possível verificar o código agora." });
  }
});

app.post("/api/auth/login/2fa/email", authLimiter, async (req, res) => {
  try {
    const challengeToken = String(req.body?.challengeToken || "");
    const userId = auth.peekTwoFactorChallenge(challengeToken);
    if(!userId){
      return res.status(401).json({ error: "Sessão expirada. Faça login novamente.", restart: true });
    }
    const user = db.getUserById(userId);
    if(!user?.totp_secret){
      auth.consumeTwoFactorChallenge(challengeToken);
      return res.status(401).json({ error: "Sessão expirada. Faça login novamente.", restart: true });
    }

    const ip = auth.clientIp(req);
    const lockout = auth.checkLoginLockout(user.email, ip);
    if(lockout.locked){
      const minutos = Math.ceil(lockout.retryAfterMs / 60000);
      return res.status(429).json({ error: `Muitas tentativas. Tente novamente em ${minutos} minuto${minutos === 1 ? "" : "s"}.` });
    }

    const result = await auth.issueTwoFactorEmailCode(challengeToken);
    if(result.error === "expired"){
      return res.status(401).json({ error: "Sessão expirada. Faça login novamente.", restart: true });
    }
    if(result.error === "resend_limit"){
      return res.status(429).json({
        error: "Já enviamos códigos demais para este acesso. Faça login de novo para começar outro.",
        restart: true,
      });
    }
    if(result.error === "cooldown"){
      const segundos = Math.ceil(result.retryAfterMs / 1000);
      return res.status(429).json({ error: `Aguarde ${segundos} segundo${segundos === 1 ? "" : "s"} para pedir um novo código.` });
    }

    try{
      await email.sendTwoFactorEmailCode({
        to: result.user.email, name: result.user.name, code: result.code,
        expiresInMinutes: Math.round(auth.EMAIL_2FA_CODE_TTL_MS / 60000),
      });
    }catch(mailErr){
      console.error("Falha ao enviar código de verificação por e-mail:", mailErr.message);
      return res.status(502).json({ error: "Não foi possível enviar o e-mail agora. Tente novamente em instantes." });
    }

    res.json({ ok: true, message: "Enviamos um código para o e-mail da sua conta." });
  } catch (err) {
    console.error("Erro ao enviar código de verificação por e-mail:", err);
    res.status(500).json({ error: "Não foi possível enviar o e-mail agora." });
  }
});

app.post("/api/auth/logout", (req, res) => {
  auth.clearSession(req, res);
  res.json({ ok: true });
});

app.delete("/api/auth/account", authLimiter, auth.requireAuth, async (req, res) => {
  try {
    const user = db.getUserById(req.user.id);
    if(user && auth.isAdminEmail(user.email)){
      return res.status(409).json({
        error: "Conta de administradora não pode ser excluída por aqui. Remova o acesso no servidor antes.",
      });
    }
    const password = req.body?.password;
    const credential = req.body?.credential;
    let ok = false;
    if(credential){
      try{
        const perfil = await googleAuth.verificarTokenDoGoogle(credential);
        ok = user && auth.normalizeEmail(perfil.email) === auth.normalizeEmail(user.email);
      }catch{
        ok = false;
      }
      if(!ok) return res.status(401).json({ error: "Não consegui confirmar sua conta Google." });
    } else {
      if (!password || typeof password !== "string") {
        return res.status(400).json({ error: "Confirme sua senha para excluir a conta." });
      }
      ok = user && await auth.verifyPassword(password, user.password_hash);
      if (!ok) {
        return res.status(401).json({ error: "Senha incorreta." });
      }
    }
    db.deleteUserAccount(req.user.id);
    auth.clearSession(req, res);
    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao excluir conta:", err);
    res.status(500).json({ error: "Não foi possível excluir a conta agora. Tente novamente." });
  }
});

app.post("/api/auth/forgot-password", authLimiter, async (req, res) => {
  const genericOk = () => res.json({
    ok: true,
    message: "Se existir uma conta com esse e-mail, enviamos o link de redefinição.",
  });

  try {
    const emailAddress = auth.normalizeEmail(req.body?.email);
    if(!auth.isValidEmail(emailAddress)){
      return genericOk();
    }

    const user = db.getUserByEmail(emailAddress);
    if(!user){
      return genericOk();
    }

    const token = auth.issuePasswordReset(user.id);
    const resetUrl = `${CLIENT_ORIGIN}/redefinir-senha.html?token=${encodeURIComponent(token)}`;
    const expiresInMinutes = Math.round(auth.PASSWORD_RESET_TTL_MS / 60000);

    email.sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl, expiresInMinutes })
      .catch(mailErr => {
        console.error("Falha ao enviar e-mail de redefinição de senha:", mailErr.message);
        if(!process.env.SMTP_HOST){
          console.warn(`[redefinição de senha] Link para ${user.email}: ${resetUrl}`);
        }
      });

    return genericOk();
  } catch (err) {
    console.error("Erro ao processar pedido de redefinição de senha:", err);
    return genericOk();
  }
});

app.post("/api/auth/reset-password", authLimiter, async (req, res) => {
  try {
    const token = String(req.body?.token || "");
    const password = String(req.body?.password || "");

    if(!auth.isValidPassword(password)){
      return res.status(400).json({ error: "A senha precisa ter entre 8 e 72 caracteres." });
    }

    const userId = auth.consumePasswordReset(token);
    if(!userId){
      return res.status(400).json({ error: "Este link de redefinição é inválido ou já expirou. Peça um novo." });
    }

    const passwordHash = await auth.hashPassword(password);
    db.updateUserPassword(userId, passwordHash);
    db.deleteAllSessionsForUser(userId);
    auth.clearSession(req, res);

    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao redefinir senha:", err);
    res.status(500).json({ error: "Não foi possível redefinir a senha agora. Tente novamente em instantes." });
  }
});

app.get("/api/auth/sessao", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ user: req.user || null });
});

app.get("/api/auth/me", (req, res) => {
  if(!req.user) return res.status(401).json({ error: "Não autenticado." });
  res.json(req.user);
});

function mascararCpf(cpf){
  const d = String(cpf || "").replace(/\D/g, "");
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : null;
}

function perfilDaConta(userId){
  const user = db.getUserById(userId);
  if(!user) return null;
  const endereco = db.getSavedAddress(userId);
  return {
    name: user.name,
    email: user.email,
    telefone: user.phone || phoneDigits(endereco?.telefone) || "",
    nascimento: user.birth_date || "",
    cpfMascarado: mascararCpf(user.cpf),
    criadoEm: user.created_at,
    semSenha: Boolean(user.sem_senha),
    temGoogle: Boolean(user.google_id),
  };
}

function nascimentoValido(valor){
  if(!valor) return true;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [a, m, d] = valor.split("-").map(Number);
  const data = new Date(Date.UTC(a, m - 1, d));
  if(data.getUTCFullYear() !== a || data.getUTCMonth() !== m - 1 || data.getUTCDate() !== d) return false;
  const idade = (Date.now() - data.getTime()) / (365.25 * 86400000);
  return idade >= 13 && idade <= 110;
}

function avisarContaEmSegundoPlano(dados){
  email.sendAvisoDeSegurancaDaConta(dados).catch(err => {
    console.error("Não foi possível mandar o aviso de alteração da conta:", err.message || err);
  });
}

app.get("/api/auth/perfil", auth.requireAuth, (req, res) => {
  const perfil = perfilDaConta(req.user.id);
  if(!perfil) return res.status(404).json({ error: "Conta não encontrada." });
  res.json(perfil);
});

app.put("/api/auth/perfil", strictLimiter, auth.requireAuth, (req, res) => {
  const name = String(req.body?.name || "").trim().replace(/\s+/g, " ");
  const telefone = phoneDigits(req.body?.telefone);
  const nascimento = String(req.body?.nascimento || "").trim();
  if(!auth.isValidName(name) || name.length > 80){
    return res.status(400).json({ error: "Digite seu nome (de 2 a 80 letras)." });
  }
  if(telefone && (telefone.length < 10 || telefone.length > 11)){
    return res.status(400).json({ error: "Confira o WhatsApp: DDD + número, 10 ou 11 dígitos." });
  }
  if(!nascimentoValido(nascimento)){
    return res.status(400).json({ error: "Confira a data de nascimento." });
  }
  db.updatePerfil(req.user.id, { name, phone: telefone, birthDate: nascimento || null });
  res.json(perfilDaConta(req.user.id));
});

app.put("/api/auth/email", authLimiter, auth.requireAuth, async (req, res) => {
  try{
    const novo = auth.normalizeEmail(req.body?.email);
    const contaAtual = db.getUserById(req.user.id);
    if(contaAtual?.sem_senha){
      return res.status(409).json({
        error: 'Sua conta entra pelo Google, e o e-mail vem de lá. Para usar outro e-mail, crie uma senha em "Esqueci a senha" e volte aqui.',
      });
    }
    const senha = req.body?.senhaAtual;
    if(!auth.isValidEmail(novo)) return res.status(400).json({ error: "Digite um e-mail válido." });
    if(typeof senha !== "string" || !senha) return res.status(400).json({ error: "Confirme com sua senha atual." });
    const user = db.getUserById(req.user.id);
    if(!user || !(await auth.verifyPassword(senha, user.password_hash))){
      return res.status(401).json({ error: "Senha atual incorreta." });
    }
    if(novo === user.email) return res.json(perfilDaConta(user.id));
    if(auth.isAdminEmail(user.email) || auth.isAdminEmail(novo) || db.getUserByEmail(novo)){
      return res.status(409).json({ error: "Este e-mail não pode ser usado. Se ele já tem conta, entre por ela." });
    }
    const antigo = user.email;
    db.updateUserEmail(user.id, novo);
    const saiu = db.deleteOtherSessions(user.id, auth.sessionTokenHash(req));
    avisarContaEmSegundoPlano({ to: antigo, nome: String(user.name || "").split(" ")[0], oQue: "email", novoEmail: novo });
    res.json({ ...perfilDaConta(user.id), sessoesEncerradas: saiu });
  }catch(err){
    console.error("Erro ao trocar e-mail:", err);
    res.status(500).json({ error: "Não foi possível trocar o e-mail agora." });
  }
});

app.put("/api/auth/senha", authLimiter, auth.requireAuth, async (req, res) => {
  try{
    const atual = req.body?.senhaAtual;
    const nova = String(req.body?.novaSenha || "");
    const dono = db.getUserById(req.user.id);
    if(dono?.sem_senha){
      return res.status(409).json({
        error: 'Sua conta entra pelo Google e ainda não tem senha. Use "Esqueci a senha" para criar uma.',
      });
    }
    if(typeof atual !== "string" || !atual) return res.status(400).json({ error: "Digite sua senha atual." });
    if(!auth.isValidPassword(nova)) return res.status(400).json({ error: "A nova senha precisa ter entre 8 e 72 caracteres." });
    const user = db.getUserById(req.user.id);
    if(!user || !(await auth.verifyPassword(atual, user.password_hash))){
      return res.status(401).json({ error: "Senha atual incorreta." });
    }
    db.updateUserPassword(user.id, await auth.hashPassword(nova));
    const saiu = db.deleteOtherSessions(user.id, auth.sessionTokenHash(req));
    avisarContaEmSegundoPlano({ to: user.email, nome: String(user.name || "").split(" ")[0], oQue: "senha" });
    res.json({ ok: true, sessoesEncerradas: saiu });
  }catch(err){
    console.error("Erro ao trocar senha:", err);
    res.status(500).json({ error: "Não foi possível trocar a senha agora." });
  }
});

app.post("/api/auth/sair-outros", strictLimiter, auth.requireAuth, (req, res) => {
  const saiu = db.deleteOtherSessions(req.user.id, auth.sessionTokenHash(req));
  res.json({ ok: true, sessoesEncerradas: saiu });
});

app.get("/api/auth/address", strictLimiter, auth.requireAuth, (req, res) => {
  res.json({ address: db.getSavedAddress(req.user.id) });
});

app.put("/api/auth/address", strictLimiter, auth.requireAuth, (req, res) => {
  const address = req.body?.address;
  if(!auth.isValidAddress(address)){
    return res.status(400).json({ error: "Endereço incompleto." });
  }
  const cep = auth.normalizeCep(address.cep);
  if(!auth.isValidCep(cep)){
    return res.status(400).json({ error: "CEP inválido — informe os 8 dígitos." });
  }
  db.saveAddress(req.user.id, { ...address, cep });
  res.json({ ok: true });
});

app.get("/api/orders", auth.requireAuth, (req, res) => {
  try {
    const rows = db.listOrdersByUser(req.user.id);
    const overridesMap = getProductOverridesMap();
    const orders = rows.map(row => {
      const items = JSON.parse(row.items_json).map(item => {
        const { id, qty, name, unitPrice, resumo, fotos } = itemParaExibir(item, overridesMap);
        return { id, qty, name, unitPrice, resumo, fotos };
      });
      const shipping = JSON.parse(row.shipping_json);
      return {
        reference: row.external_reference,
        status: row.status,
        fulfillmentStatus: row.fulfillment_status || null,
        shippedAt: row.shipped_at || null,
        deliveredAt: row.delivered_at || null,
        trackingCode: row.tracking_code || "",
        items,
        shipping: { name: shipping.name, deliveryTime: shipping.delivery_time },
        couponCode: row.coupon_code,
        subtotal: row.subtotal,
        discount: row.discount,
        pixDiscount: row.pix_discount || 0,
        paymentMethod: row.payment_method || "card",
        shippingPrice: row.shipping_price,
        total: row.total,
        createdAt: row.created_at,
        avaliacao: row.status === "pago" ? resumoDaAvaliacao(row) : null,
        avaliarUrl: row.status === "pago" && ["postado", "entregue"].includes(row.fulfillment_status)
          ? linkDeAvaliacao(row.external_reference) : null,
      };
    });
    res.json({ orders });
  } catch (err) {
    console.error("Erro ao listar pedidos:", err);
    res.status(500).json({ error: "Não foi possível carregar seus pedidos agora." });
  }
});

function noStore(req, res, next){
  res.set("Cache-Control", "no-store, private");
  next();
}
app.use("/api/admin", noStore);

app.post("/api/admin/2fa/setup", auth.requireAdmin, async (req, res) => {
  try {
    const secret = auth.generateTotpSecret();
    const uri = auth.totpAuthUri({ secret, email: req.user.email, issuer: "Arte Canecas" });
    const qrDataUri = await qrcode.toDataURL(uri, { margin: 1, width: 240 });
    res.json({ secret, qrDataUri });
  } catch (err) {
    console.error("Erro ao preparar 2FA:", err);
    res.status(500).json({ error: "Não foi possível preparar a verificação em duas etapas." });
  }
});

app.post("/api/admin/2fa/activate", auth.requireAdmin, async (req, res) => {
  try {
    const secret = String(req.body?.secret || "").trim().toUpperCase();
    const code = String(req.body?.code || "").trim();
    if(!/^[A-Z2-7]{32}$/.test(secret)){
      return res.status(400).json({ error: "Segredo inválido. Recarregue a página e tente de novo." });
    }
    const usuarioAtual = db.getUserById(req.user.id);
    if(usuarioAtual?.totp_secret){
      const senha = req.body?.password;
      if(!senha || typeof senha !== "string" || !(await auth.verifyPassword(senha, usuarioAtual.password_hash))){
        return res.status(401).json({ error: "Confirme sua senha para trocar a verificação em duas etapas.", needsPassword: true });
      }
    }
    if(!auth.verifyTotp(secret, code)){
      return res.status(400).json({ error: "Código incorreto. Confira o app e tente de novo." });
    }
    const recoveryCodes = auth.generateRecoveryCodes();
    const hashes = await auth.hashRecoveryCodes(recoveryCodes);
    db.setUserTotp(req.user.id, { secret, recoveryJson: JSON.stringify(hashes) });
    db.deleteAllSessionsForUser(req.user.id);
    auth.issueSession(res, req.user.id);
    res.json({ ok: true, recoveryCodes });
  } catch (err) {
    console.error("Erro ao ativar 2FA:", err);
    res.status(500).json({ error: "Não foi possível ativar a verificação em duas etapas." });
  }
});

app.get("/api/admin/2fa/status", auth.requireAdmin, (req, res) => {
  const user = db.getUserById(req.user.id);
  res.json({
    enabled: Boolean(user?.totp_secret),
    required: auth.ADMIN_2FA_REQUIRED,
    recoveryCodesLeft: JSON.parse(user?.totp_recovery_json || "[]").length,
  });
});

app.get("/api/admin/login-attempts", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  try {
    db.pruneLoginAttempts(90 * 24 * 60 * 60 * 1000);
    const rows = db.listRecentLoginAttempts({ sinceMs: 7 * 24 * 60 * 60 * 1000, limit: 200 });
    res.json(rows.map(r => ({ email: r.email, ip: r.ip, ok: Boolean(r.ok), at: r.created_at })));
  } catch (err) {
    console.error("Erro ao listar tentativas de login:", err);
    res.status(500).json({ error: "Não foi possível carregar as tentativas de login." });
  }
});

app.get("/api/admin/aviso-de-venda", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  try {
    res.json({
      para: process.env.OWNER_EMAIL || null,
      smtpConfigurado: !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS),
      ...db.avisosDaLojista(),
      tarefasEm: db.lerEstado("tarefas_periodicas_em")?.updated_at || null,
    });
  } catch (err) {
    console.error("Erro ao ler a situação do aviso de venda:", err);
    res.status(500).json({ error: "Não foi possível conferir o aviso de venda agora." });
  }
});

app.post("/api/admin/aviso-de-venda/testar", auth.requireAdmin, auth.requireAdminTwoFactor, strictLimiter, async (req, res) => {
  const destino = process.env.OWNER_EMAIL;
  if(!destino){
    return res.status(409).json({ error: "O servidor não tem nenhum e-mail cadastrado para receber os avisos de venda (falta preencher OWNER_EMAIL no .env)." });
  }
  try {
    const quando = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    await email.sendEmail({
      to: destino,
      subject: "🎀 Teste: é assim que você vai saber de uma venda",
      text: `Se você está lendo isto, o aviso de venda do site está funcionando.\n\nTeste pedido pelo painel em ${quando}.`,
      html: `<p>Se você está lendo isto, o aviso de venda do site está funcionando. 🎀</p><p>Teste pedido pelo painel em ${quando}.</p>`,
    });
    res.json({ ok: true, para: destino });
  } catch (err) {
    console.error("Falha no teste de aviso de venda:", err);
    res.status(502).json({ error: err.message || "O servidor de e-mail recusou o envio." });
  }
});

app.get("/api/admin/avaliacoes", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  try {
    const overridesMap = getProductOverridesMap();
    res.json({
      pendentes: db.contarAvaliacoesPendentes(),
      avaliacoes: db.listarAvaliacoesPainel().map(r => ({
        id: r.id,
        reference: r.order_reference,
        productId: r.product_id,
        productName: effectiveProduct(r.product_id, overridesMap)?.name || `Produto #${r.product_id}`,
        rating: r.rating,
        comment: r.comment,
        photoUrl: r.photo_id ? `/api/admin/avaliacoes/fotos/${r.photo_id}` : null,
        photoConsentAt: r.photo_consent_at,
        status: r.status,
        firstName: r.customer_first_name,
        city: r.customer_city,
        createdAt: r.created_at,
        publishedAt: r.published_at,
      })),
    });
  } catch (err) {
    console.error("Erro ao listar avaliações:", err);
    res.status(500).json({ error: "Não foi possível carregar as avaliações." });
  }
});

app.get("/api/admin/avaliacoes/fotos/:id", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  if(!ROTA_FOTO_AVALIACAO.test(req.params.id)) return res.status(404).end();
  const foto = db.getReviewPhoto(req.params.id);
  if(!foto) return res.status(404).end();
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("Content-Type", foto.mime_type);
  res.end(Buffer.from(foto.data));
});

app.post("/api/admin/avaliacoes/:id/publicar", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  const id = Number(req.params.id);
  if(!Number.isInteger(id)) return res.status(404).json({ error: "Avaliação não encontrada." });
  if(req.body?.semFoto === true) db.tirarFotoDaAvaliacao(id);
  if(!db.mudarStatusAvaliacao(id, "publicada")) return res.status(404).json({ error: "Avaliação não encontrada." });
  res.json({ ok: true });
});

app.post("/api/admin/avaliacoes/:id/ocultar", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  const id = Number(req.params.id);
  if(!Number.isInteger(id) || !db.mudarStatusAvaliacao(id, "oculta")){
    return res.status(404).json({ error: "Avaliação não encontrada." });
  }
  res.json({ ok: true });
});

app.delete("/api/admin/avaliacoes/:id", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  const id = Number(req.params.id);
  if(!Number.isInteger(id) || !db.excluirAvaliacao(id)){
    return res.status(404).json({ error: "Avaliação não encontrada." });
  }
  res.json({ ok: true });
});

app.get("/api/admin/orders", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  try {
    const rows = db.listAllOrders();
    const overridesMap = getProductOverridesMap();
    const notas = db.notasPorPedido();
    const orders = rows.map(row => {
      const items = JSON.parse(row.items_json).map(item => {
        const { config, ...resto } = itemParaExibir(item, overridesMap);
        return { ...resto, temArte: Boolean(config?.personalizacao?.ativa && item.escolhas), temVerso: Boolean(config?.personalizacao?.verso && item.escolhas?.personalizacao?.frase) };
      });
      const address = JSON.parse(row.address_json);
      const shipping = JSON.parse(row.shipping_json);
      const account = row.user_id ? db.getUserById(row.user_id) : null;
      return {
        reference: row.external_reference,
        status: row.status,
        items,
        customer: {
          nome: address?.nome || null,
          telefone: address?.telefone || null,
          cpf: address?.cpf || null,
          email: account?.email || null,
        },
        address,
        shipping: { name: shipping.name, deliveryTime: shipping.delivery_time },
        trackingCode: row.tracking_code || "",
        fulfillmentStatus: row.fulfillment_status || null,
        shippedAt: row.shipped_at || null,
        deliveredAt: row.delivered_at || null,
        avisoDePostagem: estadoDoAvisoDePostagem(row.external_reference),
        avaliacao: notas.get(row.external_reference) || null,
        subtotal: row.subtotal,
        discount: row.discount,
        pixDiscount: row.pix_discount || 0,
        paymentMethod: row.payment_method || "card",
        shippingPrice: row.shipping_price,
        total: row.total,
        createdAt: row.created_at,
      };
    });
    const stats = db.getOrderStats();
    res.json({ orders, stats: { totalRevenue: stats.revenue, totalOrders: stats.count } });
  } catch (err) {
    console.error("Erro ao listar pedidos (admin):", err);
    res.status(500).json({ error: "Não foi possível carregar os pedidos agora." });
  }
});

app.get("/api/admin/customers", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  try {
    const byIdentity = new Map();

    for(const row of db.listAllOrders()){
      const address = JSON.parse(row.address_json);
      const account = row.user_id ? db.getUserById(row.user_id) : null;
      const identity = row.user_id ? `conta:${row.user_id}` : `tel:${row.customer_phone || row.external_reference}`;

      let entry = byIdentity.get(identity);
      if(!entry){
        entry = {
          identity,
          nome: address?.nome || account?.name || "—",
          email: account?.email || null,
          telefone: address?.telefone || account?.phone || null,
          aniversario: account?.birth_date ? account.birth_date.slice(8, 10) + "/" + account.birth_date.slice(5, 7) : null,
          hasAccount: Boolean(row.user_id),
          totalOrders: 0,
          paidOrders: 0,
          totalSpent: 0,
          lastOrderAt: 0,
          orders: [],
        };
        byIdentity.set(identity, entry);
      }

      entry.totalOrders += 1;
      if(row.status === "pago"){
        entry.paidOrders += 1;
        entry.totalSpent += row.total;
      }
      if(row.created_at > entry.lastOrderAt){
        entry.lastOrderAt = row.created_at;
        entry.nome = address?.nome || entry.nome;
        entry.telefone = address?.telefone || entry.telefone;
      }
      if(account?.email) entry.email = account.email;

      entry.orders.push({
        reference: row.external_reference,
        status: row.status,
        total: row.total,
        couponCode: row.coupon_code || null,
        createdAt: row.created_at,
      });
    }

    const customers = [...byIdentity.values()]
      .map(c => ({ ...c, totalSpent: Math.round(c.totalSpent * 100) / 100 }))
      .sort((a, b) => b.totalSpent - a.totalSpent);

    const emailsQueCompraram = new Set(
      customers.filter(c => c.email).map(c => String(c.email).toLowerCase())
    );
    const contas = db.listAccountsForAdmin().map(a => ({
      ...a,
      jaComprou: emailsQueCompraram.has(String(a.email || "").toLowerCase()),
    }));

    res.json({ customers, contas });
  } catch (err) {
    console.error("Erro ao listar clientes (admin):", err);
    res.status(500).json({ error: "Não foi possível carregar os clientes agora." });
  }
});

app.get("/api/admin/leads", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  try {
    res.json({
      subscribers: db.listNewsletterSubscribers().map(s => ({
        email: s.email,
        createdAt: s.created_at,
        unsubscribedAt: s.unsubscribed_at || null,
      })),
      messages: db.listContactMessages().map(m => ({
        id: m.id,
        nome: m.nome,
        telefone: m.telefone,
        ocasiao: m.ocasiao || null,
        mensagem: m.mensagem,
        createdAt: m.created_at,
      })),
    });
  } catch (err) {
    console.error("Erro ao listar contatos (admin):", err);
    res.status(500).json({ error: "Não foi possível carregar os contatos agora." });
  }
});

app.get("/api/admin/export.xlsx", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  try {
    const overridesMap = getProductOverridesMap();
    const buffer = spreadsheetExport.buildStoreWorkbook({
      resolveProductName: (id) => effectiveProduct(id, overridesMap)?.name || `Produto #${id}`,
    });
    const stamp = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="loja-${stamp}.xlsx"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(buffer);
  } catch (err) {
    console.error("Erro ao gerar planilha de exportação (admin):", err);
    res.status(500).json({ error: "Não foi possível gerar a planilha agora." });
  }
});

app.delete("/api/admin/contact-messages/:id", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  try {
    const id = Number(req.params.id);
    if(!Number.isInteger(id) || !db.getContactMessage(id)){
      return res.status(404).json({ error: "Mensagem não encontrada." });
    }
    db.deleteContactMessage(id);
    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao apagar mensagem de contato:", err);
    res.status(500).json({ error: "Não foi possível apagar a mensagem agora." });
  }
});

app.patch("/api/admin/orders/:reference/tracking", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  try {
    const reference = String(req.params.reference || "");
    const trackingCode = String(req.body?.trackingCode || "").trim().slice(0, 60);
    const order = db.getOrderByExternalReference(reference);
    if(!order){
      return res.status(404).json({ error: "Pedido não encontrado." });
    }
    const naFila = salvarRastreioEAvisar(reference, trackingCode);
    res.json({ ok: true, trackingCode });

    entregarEmailDaFila(naFila).catch(() => {});
  } catch (err) {
    console.error("Erro ao salvar código de rastreio:", err);
    res.status(500).json({ error: "Não foi possível salvar o código de rastreio agora." });
  }
});

app.post("/api/admin/orders/:reference/conferir-entrega", auth.requireAdmin, auth.requireAdminTwoFactor, async (req, res) => {
  try {
    const reference = String(req.params.reference || "");
    const order = db.getOrderByExternalReference(reference);
    if(!order){
      return res.status(404).json({ error: "Pedido não encontrado." });
    }
    if(!order.tracking_code){
      return res.status(409).json({ error: "Este pedido ainda não tem código de rastreio." });
    }
    const { live, shipmentId, descoberto } = await rastreioDoPedido({
      trackingCode: order.tracking_code,
      shipmentId: order.melhor_envio_shipment_id,
    });
    if(descoberto && shipmentId) db.setMelhorEnvioShipmentId(order.external_reference, shipmentId);
    if(!live){
      return res.json({ ok: true, entregue: false, semResposta: true });
    }
    const evento = fecharEntregaPeloRastreio(order, live);
    res.json({
      ok: true,
      entregue: !!evento,
      quando: evento ? rastreio.dataDoEvento(evento) : null,
      ultimoEvento: live.events?.[0]?.description || null,
    });
  } catch (err) {
    console.error("Erro ao conferir entrega no Melhor Envio:", err);
    res.status(500).json({ error: "Não foi possível consultar o Melhor Envio agora." });
  }
});

const CARENCIA_PEDIR_AVALIACAO_MS = 7 * 24 * 60 * 60 * 1000;

function linkDeAvaliacaoDoPedido(reference){
  const token = db.garantirTokenDeAvaliacao(reference);
  return `${CLIENT_ORIGIN}/avaliar.html?pedido=${encodeURIComponent(reference)}#t=${token}`;
}

app.post("/api/admin/orders/:reference/pedir-avaliacao", auth.requireAdmin, auth.requireAdminTwoFactor, async (req, res) => {
  try{
    const reference = String(req.params.reference || "");
    const order = db.getOrderByExternalReference(reference);
    if(!order) return res.status(404).json({ error: "Pedido não encontrado." });
    if(order.status !== "pago"){
      return res.status(409).json({ error: "Só dá para pedir avaliação de pedido pago." });
    }
    if(!order.customer_email){
      return res.status(409).json({ error: "Este pedido não tem e-mail para avisar." });
    }
    if(order.fulfillment_status !== "postado" && order.fulfillment_status !== "entregue"){
      return res.status(409).json({ error: "Poste o pedido antes de pedir a avaliação." });
    }
    if(db.avaliacoesDoPedido(reference).length){
      return res.status(409).json({ error: "Esta cliente já avaliou este pedido." });
    }

    const entregue = order.fulfillment_status === "entregue";
    const kind = entregue ? "pedir_avaliacao" : "confirmar_recebimento";
    const jaEnviado = db.getOutboxEntry(kind, reference);
    if(jaEnviado && Date.now() - (jaEnviado.sent_at || jaEnviado.created_at) < CARENCIA_PEDIR_AVALIACAO_MS){
      return res.status(429).json({ error: "O convite já foi enviado nos últimos 7 dias. Espere um pouco antes de pedir de novo." });
    }

    let endereco = null;
    try { endereco = JSON.parse(order.address_json); } catch {}
    const avaliarUrl = linkDeAvaliacaoDoPedido(reference);
    const conteudo = entregue
      ? email.formatPedirAvaliacaoEmail({ externalReference: reference, address: endereco, avaliarUrl })
      : email.formatConfirmarRecebimentoEmail({ externalReference: reference, address: endereco, avaliarUrl });

    db.deleteOutboxEntry(kind, reference);
    const id = db.enqueueEmail({
      kind,
      toEmail: order.customer_email,
      orderReference: reference,
      subject: conteudo.subject,
      textBody: conteudo.text,
      htmlBody: conteudo.html,
    });
    if(!id) return res.status(500).json({ error: "Não foi possível colocar o convite na fila." });
    await entregarEmailDaFila(id);
    res.json({ ok: true, entregue });
  }catch(err){
    console.error("Erro ao pedir avaliação:", err);
    res.status(500).json({ error: "Não foi possível pedir a avaliação agora." });
  }
});

app.post("/api/admin/orders/:reference/avisar-postagem", auth.requireAdmin, auth.requireAdminTwoFactor, async (req, res) => {
  try {
    const reference = String(req.params.reference || "");
    const order = db.getOrderByExternalReference(reference);
    if(!order){
      return res.status(404).json({ error: "Pedido não encontrado." });
    }
    if(!order.tracking_code){
      return res.status(409).json({ error: "Este pedido ainda não tem código de rastreio." });
    }
    if(!order.customer_email){
      return res.status(409).json({ error: "Este pedido não tem e-mail para avisar." });
    }
    db.deleteOutboxEntry("pedido_postado", reference);
    await entregarEmailDaFila(salvarRastreioEAvisar(reference, order.tracking_code));
    res.json({ ok: true, aviso: estadoDoAvisoDePostagem(reference) });
  } catch (err) {
    console.error("Erro ao reenviar aviso de postagem:", err);
    res.status(500).json({ error: "Não foi possível reenviar o aviso agora." });
  }
});

app.patch("/api/admin/orders/:reference/delivered", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  try {
    const reference = String(req.params.reference || "");
    const order = db.getOrderByExternalReference(reference);
    if(!order){
      return res.status(404).json({ error: "Pedido não encontrado." });
    }
    if(order.fulfillment_status !== "postado"){
      return res.status(409).json({ error: "Só é possível marcar como entregue um pedido já postado." });
    }
    db.markOrderDelivered(reference);
    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao marcar pedido como entregue:", err);
    res.status(500).json({ error: "Não foi possível marcar o pedido como entregue agora." });
  }
});

app.get("/api/instagram/feed", async (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=300");
  try {
    const feed = await instagram.getInstagramFeed();
    res.json(feed);
  } catch (err) {
    console.error("[instagram] erro inesperado na rota /api/instagram/feed:", err);
    res.json({ available: false });
  }
});

app.post("/api/admin/instagram/reconnect", auth.requireAdmin, auth.requireAdminTwoFactor, async (req, res) => {
  instagram.resetToken();
  const resultado = await instagram.testConnection();
  res.json(resultado);
});

function produtoParaApi(id, p){
  return {
    id, name: p.name, price: p.price, photoUrl: p.photoUrl, photos: p.photos,
    category: p.category, badges: p.badges, soldOut: p.soldOut, description: p.description,
    hidden: p.hidden, config: p.config, slug: produtoUrl.caminhoDoProduto(id, p.name),
  };
}

app.get("/api/products", (req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  const overridesMap = getProductOverridesMap();
  const products = getAllProductIds()
    .map(id => ({ id, p: effectiveProduct(id, overridesMap) }))
    .filter(({ p }) => !p.hidden)
    .map(({ id, p }) => produtoParaApi(id, p));
  res.json({ products, categories: getAllCategories(), paymentRules: pricing.PAYMENT_RULES, prazoProducao: db.prazoDeProducao() });
});

app.get("/api/admin/products", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  const overridesMap = getProductOverridesMap();
  const products = getAllProductIds().map(id => produtoParaApi(id, effectiveProduct(id, overridesMap)));
  res.json({
    products, categories: getAllCategories(), availableBadges: PRODUCT_BADGES,
    moldes: regras.MOLDES, letras: regras.LETRAS, artes: regras.ARTES, camposTexto: regras.CAMPOS_TEXTO,
    prazoProducao: db.prazoDeProducao(),
  });
});

app.put("/api/admin/prazo-producao", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  const bruto = req.body?.dias;
  const dias = bruto === null || bruto === "" ? null : Number(bruto);
  if(dias !== null && (!Number.isInteger(dias) || dias < 1 || dias > 90)){
    return res.status(400).json({ error: "Prazo de produção: use um número de 1 a 90 dias úteis, ou deixe em branco." });
  }
  db.definirPrazoDeProducao(dias);
  invalidarPaginasDaLoja();
  res.json({ prazoProducao: db.prazoDeProducao() });
});

function configDoPainel(bruta){
  if(!bruta || typeof bruta !== "object") throw { status: 400, message: "Configuração do produto inválida." };
  const config = regras.normalizarConfig(bruta);
  const invalidas = config.categorias.filter(slug => !isValidCategorySlug(slug));
  if(invalidas.length) throw { status: 400, message: `Categoria inválida: ${invalidas[0]}.` };
  if(config.moldeFoto?.foto && !isValidPhotoUrl(config.moldeFoto.foto)) throw { status: 400, message: "Foto do molde inválida." };
  return config;
}

app.put("/api/admin/products/order", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  try {
    const ids = req.body?.ids;
    if(!Array.isArray(ids) || ids.length === 0){
      return res.status(400).json({ error: "Envie a lista de produtos na ordem desejada." });
    }
    const numericIds = ids.map(Number);
    if(numericIds.some(id => !Number.isInteger(id))){
      return res.status(400).json({ error: "Lista de produtos inválida." });
    }
    if(new Set(numericIds).size !== numericIds.length){
      return res.status(400).json({ error: "Lista de produtos com itens repetidos." });
    }
    const atuais = getAllProductIds();
    const mesmoConjunto = numericIds.length === atuais.length
      && numericIds.every(id => atuais.includes(id));
    if(!mesmoConjunto){
      return res.status(409).json({ error: "A lista de produtos mudou. Recarregue a página e ordene de novo." });
    }

    const customIds = numericIds.filter(id => id >= CUSTOM_PRODUCT_ID_START);
    db.setProductsOrder(numericIds, customIds);
    res.json({ ok: true, ids: getAllProductIds() });
  } catch (err) {
    console.error("Erro ao salvar a ordem dos produtos:", err);
    res.status(500).json({ error: "Não foi possível salvar a ordem agora." });
  }
});

function isValidProductPrice(v){
  return typeof v === "number" && Number.isFinite(v) && v > 0 && v < 100000;
}
const LOCAL_UPLOAD_PATTERN = /^\/img\/products\/produto-\d+-\d+\.(jpe?g|png|webp|gif)$/;
const PHOTO_ROUTE_PATTERN = /^\/api\/products\/photos\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function isValidPhotoUrl(v){
  if(!v) return true;
  if(typeof v !== "string" || v.length > 2000) return false;
  if(LOCAL_UPLOAD_PATTERN.test(v) || PHOTO_ROUTE_PATTERN.test(v)) return true;
  try{
    const parsed = new URL(v);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  }catch{
    return false;
  }
}
function isValidBadges(v){
  if(!Array.isArray(v)) return false;
  if(v.length > PRODUCT_BADGES.length) return false;
  return v.every(b => PRODUCT_BADGES.includes(b)) && new Set(v).size === v.length;
}
const MAX_PRODUCT_PHOTOS = 8;
function isValidPhotos(v){
  if(!Array.isArray(v)) return false;
  if(v.length > MAX_PRODUCT_PHOTOS) return false;
  return v.every(url => typeof url === "string" && url && isValidPhotoUrl(url)) && new Set(v).size === v.length;
}
function productExists(id){
  if(!Number.isInteger(id)) return false;
  return id >= CUSTOM_PRODUCT_ID_START ? Boolean(db.getCustomProduct(id)) : Boolean(PRODUCTS[id]);
}

app.post("/api/admin/products", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  try {
    const body = req.body || {};

    const name = String(body.name || "").trim();
    if(name.length < 2 || name.length > 120){
      return res.status(400).json({ error: "Nome precisa ter entre 2 e 120 caracteres." });
    }
    const price = Number(body.price);
    if(!isValidProductPrice(price)){
      return res.status(400).json({ error: "Preço inválido. Use um valor entre R$ 0,01 e R$ 99.999,99." });
    }
    const category = body.category ? String(body.category).trim() : "";
    if(category && !isValidCategorySlug(category)){
      return res.status(400).json({ error: "Categoria inválida." });
    }
    let config;
    try {
      config = configDoPainel(body.config || configPadrao(category));
    } catch (erro) {
      return res.status(erro.status || 400).json({ error: erro.message });
    }
    const weight = config.peso;
    const width = config.caixa.largura, height = config.caixa.altura, length = config.caixa.comprimento;
    const badges = "badges" in body ? body.badges : [];
    if(!isValidBadges(badges)){
      return res.status(400).json({ error: "Selo de destaque inválido." });
    }
    const description = body.description ? String(body.description).trim() : "";
    if(description.length > 500){
      return res.status(400).json({ error: "Descrição muito longa (máximo 500 caracteres)." });
    }

    const created = db.insertCustomProduct({
      startAt: CUSTOM_PRODUCT_ID_START, name, price: Math.round(price * 100) / 100,
      weight, width, height, length, category: config.categorias[0] || null, badges, description: description || null, caixa: "padrao", config,
    });
    invalidarPaginasDaLoja();
    res.status(201).json(produtoParaApi(created.id, effectiveProduct(created.id, getProductOverridesMap())));
  } catch (err) {
    console.error("Erro ao criar produto:", err);
    res.status(500).json({ error: "Não foi possível criar o produto agora." });
  }
});

app.patch("/api/admin/products/:id", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  try {
    const id = Number(req.params.id);
    if(!productExists(id)){
      return res.status(404).json({ error: "Produto não encontrado." });
    }

    const body = req.body || {};
    const fields = {};

    if("name" in body){
      const name = String(body.name || "").trim();
      if(name.length < 2 || name.length > 120){
        return res.status(400).json({ error: "Nome precisa ter entre 2 e 120 caracteres." });
      }
      fields.name = name;
    }
    if("price" in body){
      const price = Number(body.price);
      if(!isValidProductPrice(price)){
        return res.status(400).json({ error: "Preço inválido. Use um valor entre R$ 0,01 e R$ 99.999,99." });
      }
      fields.price = Math.round(price * 100) / 100;
    }
    if("photoUrl" in body){
      const photoUrl = body.photoUrl ? String(body.photoUrl).trim() : "";
      if(!isValidPhotoUrl(photoUrl)){
        return res.status(400).json({ error: "URL da foto inválida. Use um link http(s) ou deixe em branco." });
      }
      const previousPhotoUrl = effectiveProduct(id, getProductOverridesMap())?.photoUrl;
      if(previousPhotoUrl && previousPhotoUrl !== (photoUrl || null)){
        deleteOldLocalPhoto(previousPhotoUrl);
      }
      fields.photoUrl = photoUrl || null;
    }
    if("category" in body){
      const category = body.category ? String(body.category).trim() : "";
      if(category && !isValidCategorySlug(category)){
        return res.status(400).json({ error: "Categoria inválida." });
      }
      fields.category = category || null;
      if(!("config" in body)){
        const atual = effectiveProduct(id, getProductOverridesMap()).config;
        fields.config = regras.normalizarConfig({ ...atual, categorias: category ? [category, ...atual.categorias.filter(c => c !== category)] : atual.categorias.slice(1) });
      }
    }
    if("badges" in body){
      if(!isValidBadges(body.badges)){
        return res.status(400).json({ error: "Selo de destaque inválido." });
      }
      fields.badges = body.badges;
    }
    if("photos" in body){
      if(!isValidPhotos(body.photos)){
        return res.status(400).json({ error: `Lista de fotos inválida. Envie até ${MAX_PRODUCT_PHOTOS} fotos, sem repetir.` });
      }
      const previousPhotos = effectiveProduct(id, getProductOverridesMap())?.photos || [];
      const nextPhotosSet = new Set(body.photos);
      for(const oldUrl of previousPhotos){
        if(!nextPhotosSet.has(oldUrl)) deleteOldLocalPhoto(oldUrl);
      }
      fields.photos = body.photos;
    }
    if("description" in body){
      const description = body.description ? String(body.description).trim() : "";
      if(description.length > 500){
        return res.status(400).json({ error: "Descrição muito longa (máximo 500 caracteres)." });
      }
      fields.description = description || null;
    }
    if("hidden" in body){
      fields.hidden = Boolean(body.hidden);
    }
    if("config" in body){
      try {
        fields.config = configDoPainel(body.config);
      } catch (erro) {
        return res.status(erro.status || 400).json({ error: erro.message });
      }
      fields.category = fields.config.categorias[0] || null;
    }
    if("soldOut" in body){
      fields.soldOut = Boolean(body.soldOut);
    }

    if(Object.keys(fields).length === 0){
      return res.status(400).json({ error: "Nada para salvar." });
    }

    if(id >= CUSTOM_PRODUCT_ID_START) db.updateCustomProduct(id, fields);
    else db.upsertProductOverride(id, fields);

    invalidarPaginasDaLoja();
    res.json(produtoParaApi(id, effectiveProduct(id, getProductOverridesMap())));
  } catch (err) {
    console.error("Erro ao atualizar produto:", err);
    res.status(500).json({ error: "Não foi possível salvar o produto agora." });
  }
});

app.delete("/api/admin/products/:id", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  try {
    const id = Number(req.params.id);
    if(!Number.isInteger(id) || id < CUSTOM_PRODUCT_ID_START){
      return res.status(400).json({
        error: "Este produto faz parte do catálogo fixo e não pode ser excluído — edite-o ou peça para removê-lo do código.",
      });
    }
    const product = db.getCustomProduct(id);
    if(!product){
      return res.status(404).json({ error: "Produto não encontrado." });
    }
    deleteOldLocalPhoto(product.photo_url);
    db.deleteCustomProduct(id);
    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao apagar produto:", err);
    res.status(500).json({ error: "Não foi possível apagar o produto agora." });
  }
});

app.post("/api/admin/products/:id/photo", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  const id = Number(req.params.id);
  if(!productExists(id)){
    return res.status(404).json({ error: "Produto não encontrado." });
  }
  productPhotoUpload.single("photo")(req, res, async (err) => {
    if(err instanceof multer.MulterError){
      if(err.code === "LIMIT_FILE_SIZE"){
        return res.status(413).json({ error: "Imagem muito grande. O limite é 4MB." });
      }
      return res.status(400).json({ error: "Não foi possível enviar a imagem." });
    }
    if(err){
      console.error("Erro no upload de foto:", err);
      return res.status(500).json({ error: "Não foi possível enviar a imagem agora." });
    }
    if(!req.file){
      return res.status(400).json({ error: "Envie um arquivo de imagem (JPEG, PNG, WEBP ou GIF)." });
    }
    try{
      const compressed = await sharp(req.file.buffer)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
      const photoId = randomUUID();
      db.insertProductPhoto(photoId, "image/jpeg", compressed);
      res.status(201).json({ photoUrl: `/api/products/photos/${photoId}` });
    }catch(procErr){
      console.error("Erro ao processar imagem de produto:", procErr);
      res.status(500).json({ error: "Não foi possível processar a imagem enviada." });
    }
  });
});

const FORMATOS_DE_FOTO_ACEITOS = new Set(["jpeg", "png", "webp", "gif", "avif", "tiff", "heif"]);
const LIMITE_FOTO_PERSONALIZACAO = 15 * 1024 * 1024;
const uploadPersonalizacao = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: LIMITE_FOTO_PERSONALIZACAO, files: 1 },
});
const uploadPersonalizacaoLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 80, handler: sendTooManyRequests });
const ID_FOTO_PERSONALIZACAO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

app.post("/api/personalizacao/fotos", uploadPersonalizacaoLimiter, (req, res) => {
  uploadPersonalizacao.single("foto")(req, res, async (err) => {
    if(err instanceof multer.MulterError){
      if(err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "Foto muito grande. O limite é 15 MB por foto." });
      return res.status(400).json({ error: "Não foi possível enviar a foto." });
    }
    if(err){
      console.error("Erro no envio de foto de personalização:", err);
      return res.status(500).json({ error: "Não foi possível enviar a foto agora." });
    }
    if(!req.file) return res.status(400).json({ error: "Escolha uma foto para enviar." });
    let meta;
    try {
      meta = await sharp(req.file.buffer, { failOn: "error" }).metadata();
    } catch {
      return res.status(415).json({ error: "Esse arquivo não é uma foto que a gente consiga abrir. Envie JPG ou PNG." });
    }
    if(!FORMATOS_DE_FOTO_ACEITOS.has(meta.format)){
      return res.status(415).json({ error: "Formato não aceito. Envie JPG, PNG ou WEBP." });
    }
    if(!meta.width || !meta.height || meta.width * meta.height > 60000000){
      return res.status(415).json({ error: "Foto com tamanho fora do comum. Envie outra." });
    }
    try {
      const original = await sharp(req.file.buffer, { failOn: "error" })
        .rotate()
        .resize({ width: 3000, height: 3000, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });
      const miniatura = await sharp(original.data)
        .resize({ width: 600, height: 600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      const id = randomUUID();
      const chave = crypto.randomBytes(16).toString("hex");
      db.inserirFotoPersonalizacao({
        id, chaveHash: hashDaChave(chave), mimeType: "image/jpeg",
        data: original.data, miniatura, largura: original.info.width, altura: original.info.height,
      });
      res.status(201).json({ id, chave, largura: original.info.width, altura: original.info.height });
    } catch (procErr) {
      console.error("Erro ao processar foto de personalização:", procErr);
      res.status(500).json({ error: "Não foi possível preparar a foto. Tente outra." });
    }
  });
});

function podeVerFotoDePersonalizacao(req, linha){
  if(req.user?.isAdmin) return true;
  const chave = String(req.query.chave || "");
  if(/^[0-9a-f]{32}$/.test(chave) && hashDaChave(chave) === linha.chave_hash) return true;
  if(req.user && linha.pedido){
    const pedido = db.getOrderByExternalReference(linha.pedido);
    if(pedido && pedido.user_id === req.user.id) return true;
  }
  return false;
}

app.get("/api/personalizacao/fotos/:id", (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  if(!ID_FOTO_PERSONALIZACAO.test(req.params.id)) return res.status(404).json({ error: "Foto não encontrada." });
  const linha = db.lerFotoPersonalizacao(req.params.id);
  if(!linha || !podeVerFotoDePersonalizacao(req, linha)) return res.status(404).json({ error: "Foto não encontrada." });
  const original = req.query.tamanho === "original";
  res.setHeader("Content-Type", original ? linha.mime_type : "image/webp");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if(original && req.query.baixar === "1"){
    res.setHeader("Content-Disposition", `attachment; filename="foto-${linha.id.slice(0, 8)}.jpg"`);
  }
  res.send(Buffer.from(original ? linha.data : linha.miniatura));
});

app.get("/api/admin/pedidos/:reference/itens/:indice/:tipo.svg", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res, next) => {
  const tipo = req.params.tipo === "arte" ? "arte" : req.params.tipo === "previa" ? "previa" : null;
  if(!tipo) return next();
  const pedido = db.getOrderByExternalReference(String(req.params.reference || ""));
  if(!pedido) return res.status(404).json({ error: "Pedido não encontrado." });
  const itens = JSON.parse(pedido.items_json);
  const bruto = itens[Number(req.params.indice)];
  if(!bruto) return res.status(404).json({ error: "Item não encontrado." });
  const item = itemParaExibir(bruto, getProductOverridesMap());
  if(!item.config || !item.escolhas) return res.status(404).json({ error: "Este item não tem personalização." });
  const fotos = {};
  for(const id of item.fotos){
    const linha = db.lerFotoPersonalizacao(id);
    if(!linha) continue;
    fotos[id] = tipo === "arte"
      ? `data:${linha.mime_type};base64,${Buffer.from(linha.data).toString("base64")}`
      : `data:image/webp;base64,${Buffer.from(linha.miniatura).toString("base64")}`;
  }
  try {
    const svg = lojaSsr.svgDoItem({ tipo, config: item.config, escolhas: item.escolhas, lado: req.query.lado, fotos });
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Security-Policy", "default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'");
    res.send(svg);
  } catch (err) {
    console.error("Erro ao montar a arte do pedido:", err);
    res.status(500).json({ error: "Não foi possível montar a arte agora." });
  }
});

app.get("/api/admin/pedidos/:reference/itens/:indice/producao.svg", auth.requireAdmin, auth.requireAdminTwoFactor, async (req, res) => {
  const pedido = db.getOrderByExternalReference(String(req.params.reference || ""));
  if(!pedido) return res.status(404).json({ error: "Pedido não encontrado." });
  const indice = Number(req.params.indice);
  const bruto = JSON.parse(pedido.items_json)[indice];
  if(!bruto) return res.status(404).json({ error: "Item não encontrado." });
  const item = itemParaExibir(bruto, getProductOverridesMap());
  if(!item.config || !item.escolhas || !item.config.personalizacao?.ativa) return res.status(404).json({ error: "Este item não tem personalização." });
  try {
    const svg = await producao.arquivoDeProducao({
      config: item.config,
      escolhas: item.escolhas,
      lerFoto: id => {
        const linha = db.lerFotoPersonalizacao(id);
        return linha && linha.pedido === pedido.external_reference ? Buffer.from(linha.data) : null;
      },
      svgDaArte: lojaSsr.svgDaArteSemFontes,
      titulo: `${item.name} — pedido ${pedido.external_reference.slice(0, 8)}`,
    });
    const apelido = produtoUrl.apelido(item.name);
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="arte-${pedido.external_reference.slice(0, 8)}-item${indice + 1}-${apelido}.svg"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Security-Policy", "default-src 'none'; img-src data:; style-src 'unsafe-inline'");
    res.send(svg);
  } catch (err) {
    console.error("Erro ao gerar o arquivo de produção:", err);
    res.status(500).json({ error: "Não foi possível gerar o arquivo agora." });
  }
});

app.get("/api/admin/pedidos/:reference/fotos", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ fotos: db.fotosPersonalizacaoDoPedido(String(req.params.reference || "")), diasAposEntrega: db.DIAS_FOTOS_APOS_ENTREGA });
});

const LARGURAS_DE_FOTO = new Set([160, 400, 600, 900]);

app.get("/api/products/photos/:id", async (req, res) => {
  if(!PHOTO_ROUTE_PATTERN.test(`/api/products/photos/${req.params.id}`)){
    return res.status(404).end();
  }

  const pedida = Number(req.query.w);
  const largura = LARGURAS_DE_FOTO.has(pedida) ? pedida : null;

  const querWebp = /\bimage\/webp\b/.test(req.headers.accept || "");
  const formato = querWebp ? "webp" : "jpeg";

  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

  if(!largura){
    const photo = db.getProductPhoto(req.params.id);
    if(!photo) return res.status(404).end();
    res.setHeader("Content-Type", photo.mime_type);
    return res.end(Buffer.from(photo.data));
  }

  res.vary("Accept");

  const emCache = db.getProductPhotoVariant(req.params.id, largura, formato);
  if(emCache){
    res.setHeader("Content-Type", emCache.mime_type);
    return res.end(Buffer.from(emCache.data));
  }

  const photo = db.getProductPhoto(req.params.id);
  if(!photo) return res.status(404).end();

  try{
    const mime = formato === "webp" ? "image/webp" : "image/jpeg";
    let pipeline = sharp(Buffer.from(photo.data))
      .resize({ width: largura, withoutEnlargement: true });
    pipeline = formato === "webp"
      ? pipeline.webp({ quality: 72 })
      : pipeline.jpeg({ quality: 78, mozjpeg: true });
    const reduzida = await pipeline.toBuffer();

    db.saveProductPhotoVariant(req.params.id, largura, formato, mime, reduzida);
    res.setHeader("Content-Type", mime);
    res.end(reduzida);
  }catch(err){
    console.error(`Falha ao reduzir a foto ${req.params.id} para ${largura}px:`, err.message || err);
    res.setHeader("Content-Type", photo.mime_type);
    res.end(Buffer.from(photo.data));
  }
});

const MAX_DEPOIMENTOS = 6;
const ORIGENS_DEPOIMENTO = new Set(["whatsapp", "instagram"]);
const MAX_TEXTO_DEPOIMENTO = 600;

const depoimentoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb){ cb(null, Boolean(PRODUCT_PHOTO_MIME_EXT[file.mimetype])); },
});

const MAX_PRODUTOS_NA_CAMPANHA = 3;
const MAX_CORPO_CAMPANHA = 2000;

function camposDaCampanha(body){
  const assunto = typeof body.assunto === "string" ? body.assunto.trim() : "";
  const chamada = typeof body.chamada === "string" ? body.chamada.trim() : "";
  const corpo = typeof body.corpo === "string" ? body.corpo.trim() : "";
  if(!assunto || assunto.length > 120) return { erro: "Escreva um assunto de até 120 caracteres." };
  if(!corpo || corpo.length > MAX_CORPO_CAMPANHA){
    return { erro: `Escreva a mensagem (até ${MAX_CORPO_CAMPANHA} caracteres).` };
  }
  if(chamada.length > 120) return { erro: "A prévia do assunto deve ter até 120 caracteres." };
  const produtos = Array.isArray(body.produtos)
    ? body.produtos.map(Number).filter(Number.isInteger).slice(0, MAX_PRODUTOS_NA_CAMPANHA)
    : [];
  return { assunto, chamada: chamada || null, corpo, produtos };
}

function produtosDaCampanha(campanha){
  let ids = [];
  try { ids = JSON.parse(campanha.produtos || "[]"); } catch {}
  const overridesMap = getProductOverridesMap();
  return ids.map(id => {
    const p = effectiveProduct(Number(id), overridesMap);
    if(!p || p.hidden) return null;
    return {
      nome: p.name,
      preco: pricing.formatMoney(p.price),
      photoUrl: p.photoUrl,
      url: `${CLIENT_ORIGIN}${produtoUrl.caminhoDoProduto(Number(id), p.name)}?utm_source=newsletter&utm_medium=email&utm_campaign=campanha-${campanha.id}`,
    };
  }).filter(Boolean);
}

function campanhaParaPainel(c){
  return {
    id: c.id, assunto: c.assunto, chamada: c.chamada, corpo: c.corpo,
    produtos: (() => { try { return JSON.parse(c.produtos || "[]"); } catch { return []; } })(),
    status: c.status,
    criadaEm: c.created_at,
    iniciadaEm: c.iniciada_em,
    concluidaEm: c.concluida_em,
    contagem: db.contagemDaCampanha(c.id),
  };
}

app.get("/api/admin/campanhas", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  res.json({
    campanhas: db.listarCampanhas().map(campanhaParaPainel),
    inscritas: db.assinantesAtivas().length,
    ultimaRodadaDoCron: db.lerEstado("tarefas_periodicas_em")?.valor || null,
  });
});

app.post("/api/admin/campanhas", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  const campos = camposDaCampanha(req.body || {});
  if(campos.erro) return res.status(400).json({ error: campos.erro });
  res.status(201).json({ campanha: campanhaParaPainel(db.criarCampanha(campos)) });
});

app.patch("/api/admin/campanhas/:id", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  const campanha = db.getCampanha(Number(req.params.id));
  if(!campanha) return res.status(404).json({ error: "Campanha não encontrada." });
  if(campanha.status !== "rascunho"){
    return res.status(409).json({ error: "Esta campanha já foi disparada e não pode mais ser editada." });
  }
  const campos = camposDaCampanha(req.body || {});
  if(campos.erro) return res.status(400).json({ error: campos.erro });
  res.json({ campanha: campanhaParaPainel(db.atualizarCampanha(campanha.id, campos)) });
});

app.delete("/api/admin/campanhas/:id", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  const apagou = db.removerCampanha(Number(req.params.id));
  if(!apagou) return res.status(409).json({ error: "Só dá para apagar rascunho ou campanha cancelada." });
  res.json({ ok: true });
});

app.get("/api/admin/campanhas/:id/previa", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  const campanha = db.getCampanha(Number(req.params.id));
  if(!campanha) return res.status(404).json({ error: "Campanha não encontrada." });
  const conteudo = email.formatCampanhaEmail({
    assunto: campanha.assunto, chamada: campanha.chamada, corpo: campanha.corpo,
    produtos: produtosDaCampanha(campanha),
    shopUrl: SITE_URL,
    unsubscribeUrl: `${CLIENT_ORIGIN}/api/newsletter/unsubscribe?email=exemplo%40email.com&token=previa`,
  });
  res.json({ assunto: conteudo.subject, texto: conteudo.text });
});

app.post("/api/admin/campanhas/:id/teste", auth.requireAdmin, auth.requireAdminTwoFactor, strictLimiter, async (req, res) => {
  const campanha = db.getCampanha(Number(req.params.id));
  if(!campanha) return res.status(404).json({ error: "Campanha não encontrada." });
  const destino = process.env.OWNER_EMAIL;
  if(!destino) return res.status(409).json({ error: "OWNER_EMAIL não está configurado no servidor." });
  try{
    const conteudo = email.formatCampanhaEmail({
      assunto: `[teste] ${campanha.assunto}`, chamada: campanha.chamada, corpo: campanha.corpo,
      produtos: produtosDaCampanha(campanha),
      shopUrl: SITE_URL,
      unsubscribeUrl: `${CLIENT_ORIGIN}/api/newsletter/unsubscribe?email=${encodeURIComponent(destino)}&token=${db.garantirTokenDeContato(destino)}`,
    });
    await emailPhotos.enviarComMiniaturas({
      to: destino, subject: conteudo.subject, text: conteudo.text, html: conteudo.html,
      headers: email.cabecalhosDeDescadastro("https://nomedaloja.com.br"),
    });
    res.json({ ok: true, destino });
  }catch(err){
    console.error("Falha ao enviar teste de campanha:", err);
    res.status(502).json({ error: `Não consegui enviar: ${err.message || err}` });
  }
});

app.post("/api/admin/campanhas/:id/enviar", auth.requireAdmin, auth.requireAdminTwoFactor, strictLimiter, (req, res) => {
  const campanha = db.getCampanha(Number(req.params.id));
  if(!campanha) return res.status(404).json({ error: "Campanha não encontrada." });
  if(campanha.status !== "rascunho"){
    return res.status(409).json({ error: "Esta campanha já foi disparada." });
  }
  const total = db.prepararEnvioDaCampanha(campanha.id);
  if(!total){
    db.mudarStatusCampanha(campanha.id, "concluida");
    return res.status(409).json({ error: "Ninguém na lista de e-mails ainda." });
  }
  res.json({ campanha: campanhaParaPainel(db.getCampanha(campanha.id)), total });
});

app.post("/api/admin/campanhas/:id/rodar", auth.requireAdmin, auth.requireAdminTwoFactor, strictLimiter, (req, res) => {
  const campanha = db.getCampanha(Number(req.params.id));
  if(!campanha) return res.status(404).json({ error: "Campanha não encontrada." });
  if(campanha.status !== "enviando"){
    return res.status(409).json({ error: "Esta campanha não está em envio." });
  }
  const { novos } = campanhas.enfileirarLote({
    campanha, produtos: produtosDaCampanha(campanha), origem: SITE_URL, limite: 15,
  });
  res.json({ novos, campanha: campanhaParaPainel(db.getCampanha(campanha.id)) });
});

app.post("/api/admin/campanhas/:id/cancelar", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  const campanha = db.getCampanha(Number(req.params.id));
  if(!campanha) return res.status(404).json({ error: "Campanha não encontrada." });
  if(campanha.status !== "enviando"){
    return res.status(409).json({ error: "Só dá para cancelar campanha em envio." });
  }
  const removidos = db.apagarFilaDaCampanha(campanha.id);
  db.mudarStatusCampanha(campanha.id, "cancelada");
  res.json({ removidos, campanha: campanhaParaPainel(db.getCampanha(campanha.id)) });
});

function textoDeDepoimento(valor, maximo){
  if(typeof valor !== "string") return null;
  const limpo = valor.trim().replace(/[ \t]+/g, " ");
  if(!limpo || limpo.length > maximo) return null;
  return limpo;
}

function camposDoDepoimento(body){
  const texto = textoDeDepoimento(body.texto, MAX_TEXTO_DEPOIMENTO);
  const nome = textoDeDepoimento(body.nome, 40);
  const cidade = body.cidade ? textoDeDepoimento(body.cidade, 60) : null;
  if(!texto) return { erro: `Cole a mensagem da cliente (até ${MAX_TEXTO_DEPOIMENTO} caracteres).` };
  if(!nome) return { erro: "Escreva o primeiro nome da cliente (até 40 caracteres)." };
  if(body.cidade && !cidade) return { erro: "Cidade muito longa (até 60 caracteres)." };
  if(!ORIGENS_DEPOIMENTO.has(body.origem)) return { erro: "Escolha se veio por WhatsApp ou Instagram." };
  return { texto, nome, cidade, origem: body.origem };
}

app.get("/api/admin/depoimentos", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  res.json({
    depoimentos: db.listarDepoimentos().map(d => ({
      id: d.id,
      texto: d.texto,
      nome: d.cliente_nome,
      cidade: d.cliente_cidade,
      origem: d.origem,
      status: d.status,
      fotoUrl: d.photo_id && d.status === "publicado" ? `/api/depoimentos/fotos/${d.photo_id}?w=160` : null,
      consentimentoEm: d.consentimento_em,
    })),
    max: MAX_DEPOIMENTOS,
  });
});

app.post("/api/admin/depoimentos", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  if(db.listarDepoimentos().length >= MAX_DEPOIMENTOS){
    return res.status(409).json({ error: `São no máximo ${MAX_DEPOIMENTOS} depoimentos. Apague um antes de cadastrar outro.` });
  }
  depoimentoUpload.single("foto")(req, res, async (err) => {
    if(err instanceof multer.MulterError){
      if(err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "Imagem muito grande. O limite é 4MB." });
      return res.status(400).json({ error: "Não foi possível enviar a imagem." });
    }
    if(err){
      console.error("Erro no upload de foto de depoimento:", err);
      return res.status(500).json({ error: "Não foi possível enviar a imagem agora." });
    }

    const campos = camposDoDepoimento(req.body);
    if(campos.erro) return res.status(400).json({ error: campos.erro });
    if(req.body.consentimento !== "true" && req.body.consentimento !== true){
      return res.status(400).json({ error: "Confirme que a cliente autorizou publicar a mensagem." });
    }

    try{
      let photoId = null;
      if(req.file){
        photoId = randomUUID();
        const tratada = await processarFotoDeAvaliacao(req.file.buffer);
        db.insertReviewPhoto(photoId, "image/jpeg", tratada);
      }
      const id = db.criarDepoimento({ ...campos, photoId, consentimentoEm: Date.now() });
      res.status(201).json({ id });
    }catch(procErr){
      console.error("Erro ao gravar depoimento:", procErr);
      res.status(500).json({ error: "Não foi possível salvar o depoimento agora." });
    }
  });
});

app.patch("/api/admin/depoimentos/:id", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  const id = Number(req.params.id);
  if(!Number.isInteger(id)) return res.status(404).json({ error: "Depoimento não encontrado." });
  const campos = camposDoDepoimento(req.body);
  if(campos.erro) return res.status(400).json({ error: campos.erro });
  const status = req.body.status === "oculto" ? "oculto" : "publicado";
  if(!db.atualizarDepoimento(id, { ...campos, status })){
    return res.status(404).json({ error: "Depoimento não encontrado." });
  }
  res.json({ ok: true });
});

app.delete("/api/admin/depoimentos/:id", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  const id = Number(req.params.id);
  if(!Number.isInteger(id)) return res.status(404).json({ error: "Depoimento não encontrado." });
  db.removerDepoimento(id);
  res.json({ ok: true });
});

app.put("/api/admin/depoimentos/ordem", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  const ids = req.body?.ids;
  if(!Array.isArray(ids) || ids.length > MAX_DEPOIMENTOS || !ids.every(Number.isInteger)){
    return res.status(400).json({ error: "Ordem inválida." });
  }
  const atuais = db.listarDepoimentos().map(d => d.id);
  if(ids.length !== atuais.length || new Set(ids).size !== ids.length || !ids.every(i => atuais.includes(i))){
    return res.status(409).json({ error: "A lista mudou. Recarregue a página e tente de novo." });
  }
  db.setOrdemDepoimentos(ids);
  res.json({ ok: true });
});

const MAX_FOTOS_HERO = 6;
const ENQUADRAMENTOS = new Set(["top", "center", "bottom"]);

const heroPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb){
    cb(null, Boolean(PRODUCT_PHOTO_MIME_EXT[file.mimetype]));
  },
});

function textoDeFoto(valor, maximo){
  if(typeof valor !== "string") return null;
  const limpo = valor.trim().replace(/\s+/g, " ");
  if(!limpo || limpo.length > maximo) return null;
  return limpo;
}

app.get("/api/admin/hero/fotos", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  res.json({
    fotos: db.listHeroPhotos().map(f => ({
      id: f.id,
      alt: f.alt,
      legenda: f.legenda,
      focus: f.focus,
      url: `/api/hero/fotos/${f.id}?w=480`,
    })),
    max: MAX_FOTOS_HERO,
    usandoPadrao: db.countHeroPhotos() === 0,
    padrao: lojaDados.DESTAQUES_PADRAO.map(f => ({
      legenda: f.legenda,
      alt: f.alt,
      url: comVersao(f.src.slice(1)),
    })),
  });
});

app.post("/api/admin/hero/fotos", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  if(db.countHeroPhotos() >= MAX_FOTOS_HERO){
    return res.status(409).json({ error: `O topo aceita no máximo ${MAX_FOTOS_HERO} fotos. Apague uma antes de enviar outra.` });
  }
  heroPhotoUpload.single("photo")(req, res, async (err) => {
    if(err instanceof multer.MulterError){
      if(err.code === "LIMIT_FILE_SIZE"){
        return res.status(413).json({ error: "Imagem muito grande. O limite é 8MB." });
      }
      return res.status(400).json({ error: "Não foi possível enviar a imagem." });
    }
    if(err){
      console.error("Erro no upload de foto do topo:", err);
      return res.status(500).json({ error: "Não foi possível enviar a imagem agora." });
    }
    if(!req.file){
      return res.status(400).json({ error: "Envie um arquivo de imagem (JPEG, PNG, WEBP ou GIF)." });
    }

    const alt = textoDeFoto(req.body.alt, 180);
    const legenda = textoDeFoto(req.body.legenda, 90);
    if(!alt) return res.status(400).json({ error: "Escreva a descrição da foto (até 180 caracteres)." });
    if(!legenda) return res.status(400).json({ error: "Escreva a legenda curta da foto (até 90 caracteres)." });
    const focus = ENQUADRAMENTOS.has(req.body.focus) ? req.body.focus : "center";

    try{
      const original = await sharp(req.file.buffer)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();
      const id = randomUUID();
      db.insertHeroPhoto(id, alt, legenda, focus, "image/jpeg", original);
      res.status(201).json({ id, url: `/api/hero/fotos/${id}?w=480` });
    }catch(procErr){
      console.error("Erro ao processar foto do topo:", procErr);
      res.status(500).json({ error: "Não foi possível processar a imagem enviada." });
    }
  });
});

app.patch("/api/admin/hero/fotos/:id", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  if(!UUID_PATTERN.test(req.params.id)) return res.status(404).json({ error: "Foto não encontrada." });
  const alt = textoDeFoto(req.body.alt, 180);
  const legenda = textoDeFoto(req.body.legenda, 90);
  if(!alt) return res.status(400).json({ error: "Escreva a descrição da foto (até 180 caracteres)." });
  if(!legenda) return res.status(400).json({ error: "Escreva a legenda curta da foto (até 90 caracteres)." });
  const focus = ENQUADRAMENTOS.has(req.body.focus) ? req.body.focus : "center";
  if(!db.updateHeroPhoto(req.params.id, alt, legenda, focus)){
    return res.status(404).json({ error: "Foto não encontrada." });
  }
  res.json({ ok: true });
});

app.delete("/api/admin/hero/fotos/:id", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  if(!UUID_PATTERN.test(req.params.id)) return res.status(404).json({ error: "Foto não encontrada." });
  db.deleteHeroPhoto(req.params.id);
  res.json({ ok: true, usandoPadrao: db.countHeroPhotos() === 0 });
});

app.put("/api/admin/hero/fotos/ordem", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  const ids = req.body?.ids;
  if(!Array.isArray(ids) || ids.length > MAX_FOTOS_HERO || !ids.every(i => UUID_PATTERN.test(i))){
    return res.status(400).json({ error: "Ordem inválida." });
  }
  const atuais = db.listHeroPhotos().map(f => f.id);
  if(ids.length !== atuais.length || new Set(ids).size !== ids.length || !ids.every(i => atuais.includes(i))){
    return res.status(409).json({ error: "A lista de fotos mudou. Recarregue a página e tente de novo." });
  }
  db.setHeroPhotoOrder(ids);
  res.json({ ok: true });
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LARGURAS_HERO = new Set([480, 960]);
const ENQUADRAMENTO_SHARP = { top: "top", center: "centre", bottom: "bottom" };

app.get("/api/carrinho-esquecido/:referencia", strictLimiter, (req, res) => {
  const itens = db.itensDoCarrinhoEsquecido(String(req.params.referencia || ""));
  if(!itens || !itens.length) return res.status(404).json({ error: "Carrinho não encontrado." });
  res.setHeader("Cache-Control", "no-store");
  res.json({ items: itens });
});

app.get("/api/hero/fotos/:id", async (req, res) => {
  if(!UUID_PATTERN.test(req.params.id)) return res.status(404).end();

  const pedida = Number(req.query.w);
  const largura = LARGURAS_HERO.has(pedida) ? pedida : 960;
  const querWebp = /\bimage\/webp\b/.test(req.headers.accept || "");
  const formato = querWebp ? "webp" : "jpeg";

  res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
  res.vary("Accept");

  const emCache = db.getHeroPhotoVariant(req.params.id, largura, formato);
  if(emCache){
    res.setHeader("Content-Type", emCache.mime_type);
    return res.end(Buffer.from(emCache.data));
  }

  const foto = db.getHeroPhoto(req.params.id);
  if(!foto) return res.status(404).end();

  try{
    const mime = formato === "webp" ? "image/webp" : "image/jpeg";
    let pipeline = sharp(Buffer.from(foto.data)).resize({
      width: largura,
      height: Math.round(largura * 1.25),
      fit: "cover",
      position: ENQUADRAMENTO_SHARP[foto.focus] || "centre",
    });
    pipeline = formato === "webp"
      ? pipeline.webp({ quality: 74 })
      : pipeline.jpeg({ quality: 80, mozjpeg: true });
    const recortada = await pipeline.toBuffer();

    db.saveHeroPhotoVariant(req.params.id, largura, formato, mime, recortada);
    res.setHeader("Content-Type", mime);
    res.end(recortada);
  }catch(err){
    console.error(`Falha ao recortar a foto do topo ${req.params.id}:`, err.message || err);
    res.status(500).end();
  }
});

function slugifyCategory(label){
  return label
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

app.post("/api/admin/categories", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  try {
    const label = String(req.body?.label || "").trim();
    if(label.length < 2 || label.length > 40){
      return res.status(400).json({ error: "Nome da categoria precisa ter entre 2 e 40 caracteres." });
    }
    const slug = slugifyCategory(label);
    if(!slug){
      return res.status(400).json({ error: "Nome da categoria inválido." });
    }
    if(isValidCategorySlug(slug)){
      return res.status(409).json({ error: "Já existe uma categoria parecida com essa." });
    }
    const created = db.insertCustomCategory({ slug, label, grupo: req.body?.grupo });
    invalidarPaginasDaLoja();
    res.status(201).json({ ...created, builtin: false });
  } catch (err) {
    console.error("Erro ao criar categoria:", err);
    res.status(500).json({ error: "Não foi possível criar a categoria agora." });
  }
});

app.patch("/api/admin/categories/:slug", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  try {
    const slug = String(req.params.slug || "");
    const isCustom = db.listCustomCategories().some(c => c.slug === slug);
    if(!isCustom){
      if(PRODUCT_CATEGORIES.includes(slug)){
        return res.status(400).json({ error: "Categorias fixas do catálogo não podem ser renomeadas por aqui." });
      }
      return res.status(404).json({ error: "Categoria não encontrada." });
    }
    const label = String(req.body?.label || "").trim();
    if(label.length < 2 || label.length > 40){
      return res.status(400).json({ error: "Nome da categoria precisa ter entre 2 e 40 caracteres." });
    }
    db.updateCustomCategoryLabel(slug, label);
    res.json({ slug, label });
  } catch (err) {
    console.error("Erro ao renomear categoria:", err);
    res.status(500).json({ error: "Não foi possível renomear a categoria agora." });
  }
});

app.delete("/api/admin/categories/:slug", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  try {
    const slug = String(req.params.slug || "");
    const isCustom = db.listCustomCategories().some(c => c.slug === slug);
    if(!isCustom){
      if(PRODUCT_CATEGORIES.includes(slug)){
        return res.status(400).json({ error: "Categorias fixas do catálogo não podem ser excluídas por aqui." });
      }
      return res.status(404).json({ error: "Categoria não encontrada." });
    }
    const overridesDaContagem = getProductOverridesMap();
    const emUso = getAllProductIds()
      .filter(id => effectiveProduct(id, overridesDaContagem)?.config?.categorias?.includes(slug)).length;
    if(emUso > 0){
      return res.status(409).json({
        error: `${emUso} produto${emUso === 1 ? "" : "s"} ainda usa${emUso === 1 ? "" : "m"} essa categoria — mude a categoria del${emUso === 1 ? "e" : "es"} antes de excluir.`,
      });
    }
    db.deleteCustomCategory(slug);
    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao excluir categoria:", err);
    res.status(500).json({ error: "Não foi possível excluir a categoria agora." });
  }
});


app.delete("/api/admin/orders/:reference", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  try {
    const reference = String(req.params.reference || "");
    const order = db.getOrderByExternalReference(reference);
    if(!order){
      return res.status(404).json({ error: "Pedido não encontrado." });
    }
    if(order.status === "pago"){
      return res.status(409).json({ error: "Pedidos pagos não podem ser apagados — é o histórico financeiro do pedido." });
    }
    db.deleteOrder(reference);
    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao apagar pedido:", err);
    res.status(500).json({ error: "Não foi possível apagar o pedido agora." });
  }
});

app.get("/api/admin/coupons", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  try {
    const coupons = db.listCoupons().map(c => ({
      code: c.code, percentOff: c.percent_off, description: c.description, createdAt: c.created_at,
    }));
    res.json({ coupons });
  } catch (err) {
    console.error("Erro ao listar cupons:", err);
    res.status(500).json({ error: "Não foi possível carregar os cupons agora." });
  }
});

app.post("/api/admin/coupons", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  try {
    const code = String(req.body?.code || "").trim().toUpperCase().replace(/\s+/g, "");
    const percentOff = Number(req.body?.percentOff);
    const description = String(req.body?.description || "").trim().slice(0, 200);

    if(!/^[A-Z0-9]{3,20}$/.test(code)){
      return res.status(400).json({ error: "Código precisa ter de 3 a 20 letras/números, sem espaço." });
    }
    if(!Number.isFinite(percentOff) || percentOff <= 0 || percentOff > 90){
      return res.status(400).json({ error: "Desconto precisa ser um número entre 1 e 90 (%)." });
    }
    if(db.getCoupon(code)){
      return res.status(409).json({ error: "Já existe um cupom com esse código." });
    }

    const created = db.createCoupon({ code, percentOff, description });
    res.status(201).json({
      code: created.code, percentOff: created.percent_off, description: created.description, createdAt: created.created_at,
    });
  } catch (err) {
    console.error("Erro ao criar cupom:", err);
    res.status(500).json({ error: "Não foi possível criar o cupom agora." });
  }
});

app.patch("/api/admin/coupons/:code", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  try {
    const code = String(req.params.code || "").trim().toUpperCase();
    if(!db.getCoupon(code)){
      return res.status(404).json({ error: "Cupom não encontrado." });
    }

    const fields = {};
    if("percentOff" in req.body){
      const percentOff = Number(req.body.percentOff);
      if(!Number.isFinite(percentOff) || percentOff <= 0 || percentOff > 90){
        return res.status(400).json({ error: "Desconto precisa ser um número entre 1 e 90 (%)." });
      }
      fields.percentOff = percentOff;
    }
    if("description" in req.body){
      fields.description = String(req.body.description || "").trim().slice(0, 200);
    }

    const updated = db.updateCoupon(code, fields);
    res.json({
      code: updated.code, percentOff: updated.percent_off, description: updated.description, createdAt: updated.created_at,
    });
  } catch (err) {
    console.error("Erro ao editar cupom:", err);
    res.status(500).json({ error: "Não foi possível editar o cupom agora." });
  }
});

app.delete("/api/admin/coupons/:code", auth.requireAdmin, auth.requireAdminTwoFactor, (req, res) => {
  try {
    const code = String(req.params.code || "").trim().toUpperCase();
    if(!db.getCoupon(code)){
      return res.status(404).json({ error: "Cupom não encontrado." });
    }
    db.deleteCoupon(code);
    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao apagar cupom:", err);
    res.status(500).json({ error: "Não foi possível apagar o cupom agora." });
  }
});

app.post("/api/admin/orders/:reference/generate-label", auth.requireAdmin, auth.requireAdminTwoFactor, async (req, res) => {
  const reference = String(req.params.reference || "");
  try {
    const orderRow = db.getOrderByExternalReference(reference);
    if(!orderRow){
      return res.status(404).json({ error: "Pedido não encontrado." });
    }
    if(orderRow.status !== "pago"){
      return res.status(409).json({ error: "Só é possível gerar etiqueta para pedidos pagos." });
    }

    const order = {
      items: JSON.parse(orderRow.items_json),
      address: JSON.parse(orderRow.address_json),
      shipping: JSON.parse(orderRow.shipping_json),
    };
    const generated = await purchaseShippingLabel(order, reference);
    const trackingCode = generated?.[0]?.tracking || generated?.tracking || null;
    if(trackingCode){
      entregarEmailDaFila(salvarRastreioEAvisar(reference, trackingCode)).catch(() => {});
    }
    res.json({ ok: true, trackingCode, raw: generated });
  } catch (err) {
    console.error(`Erro ao gerar etiqueta para o pedido ${reference}:`, err);
    const detail = err?.data?.errors
      ? Object.values(err.data.errors).flat().join(" ")
      : err?.message;
    res.status(502).json({
      error: detail
        ? `Não foi possível gerar a etiqueta: ${detail}`
        : "Não foi possível gerar a etiqueta agora. Confira as credenciais do Melhor Envio ou gere manualmente no painel deles.",
    });
  }
});

const TRAVA_TAREFAS = "tarefas_periodicas_rodando";

app.get("/api/interno/tarefas-periodicas", cronLimiter, async (req, res) => {
  const segredo = process.env.CRON_SECRET;
  if(!segredo){
    return res.status(503).json({ error: "CRON_SECRET não configurado no servidor." });
  }
  const recebido = Buffer.from(String(req.query.token || ""));
  const esperado = Buffer.from(segredo);
  const bateu = recebido.length === esperado.length
    && crypto.timingSafeEqual(recebido, esperado);
  if(!bateu){
    return res.status(401).json({ error: "Token inválido." });
  }
  if(!db.tentarTravarRodada(TRAVA_TAREFAS)){
    return res.status(409).json({ error: "Já tem uma rodada em andamento." });
  }

  res.json({ ok: true, iniciada: new Date().toISOString() });

  tarefasPeriodicas.main()
    .catch(err => console.error("Erro numa rodada de tarefas periódicas via HTTP:", err))
    .finally(() => db.destravarRodada(TRAVA_TAREFAS));
});

app.use(sendNotFound);

app.use((err, req, res, next) => {
  const isBadJson = err.type === "entity.parse.failed" || err instanceof SyntaxError;
  const status = isBadJson ? 400 : (err.status || err.statusCode || 500);

  if(!isBadJson){
    console.error("Erro não tratado:", err);
  }
  if(res.headersSent) return next(err);

  const message = isBadJson
    ? "Requisição malformada."
    : "Erro interno. Tente novamente em instantes.";

  if(req.path.startsWith("/api/")){
    return res.status(status).json({ error: message });
  }
  return res.status(status).type("text/plain").send(message);
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});