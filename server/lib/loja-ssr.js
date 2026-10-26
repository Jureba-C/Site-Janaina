const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..");
const MANIFESTO = path.join(RAIZ, "js", "loja", "manifesto.json");
const PACOTE_SSR = path.join(RAIZ, "loja-ssr", "entrada-servidor.cjs");
const ENTRADA = "src/entrada-cliente.tsx";

let cacheManifesto = null;
let cachePacote = null;

function assinatura(arquivo){
  const st = fs.statSync(arquivo);
  return `${st.mtimeMs}:${st.size}`;
}

function arquivosDoCliente(){
  const sig = assinatura(MANIFESTO);
  if(cacheManifesto?.sig === sig) return cacheManifesto.valor;
  const manifesto = JSON.parse(fs.readFileSync(MANIFESTO, "utf8"));
  const entrada = manifesto[ENTRADA];
  if(!entrada) throw new Error("manifesto da loja sem a entrada do cliente; rode npm run construir");
  const folhas = new Set([
    ...(entrada.css || []),
    ...Object.values(manifesto).map(item => item.file).filter(arquivo => arquivo.endsWith(".css")),
  ]);
  const valor = { js: `/js/loja/${entrada.file}`, css: [...folhas].map(c => `/js/loja/${c}`) };
  cacheManifesto = { sig, valor };
  return valor;
}

function renderizador(){
  const sig = assinatura(PACOTE_SSR);
  if(cachePacote?.sig === sig) return cachePacote.valor;
  delete require.cache[require.resolve(PACOTE_SSR)];
  const valor = require(PACOTE_SSR);
  cachePacote = { sig, valor };
  return valor;
}

function escapar(valor){
  return String(valor ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function jsonSeguro(valor){
  return JSON.stringify(valor).replace(/[<\u2028\u2029]/g, c => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
}

function montarDocumento({ dados, meta }){
  const { js, css } = arquivosDoCliente();
  const corpo = renderizador().renderizarPagina(dados);
  const jsonLd = (meta.jsonLd || []).map(bloco => `<script type="application/ld+json">${jsonSeguro(bloco)}</script>`).join("\n");
  const preloadImagem = meta.preloadImagem
    ? `<link rel="preload" as="image" href="${escapar(meta.preloadImagem.href)}"${meta.preloadImagem.tipo ? ` type="${meta.preloadImagem.tipo}"` : ""} fetchpriority="high">`
    : "";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(meta.titulo)}</title>
<meta name="description" content="${escapar(meta.descricao)}">
<meta name="theme-color" content="#A9521D">
<meta name="referrer" content="strict-origin-when-cross-origin">
${meta.indexar === false ? '<meta name="robots" content="noindex, follow">' : ""}
<link rel="canonical" href="${escapar(meta.canonico)}">
<meta property="og:type" content="${meta.ogTipo || "website"}">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="Arte Canecas">
<meta property="og:url" content="${escapar(meta.canonico)}">
<meta property="og:title" content="${escapar(meta.titulo)}">
<meta property="og:description" content="${escapar(meta.descricao)}">
<meta property="og:image" content="${escapar(meta.imagem)}">
${(meta.produto ? [
    `<meta property="product:price:amount" content="${escapar(meta.produto.preco)}">`,
    `<meta property="product:price:currency" content="BRL">`,
    `<meta property="product:availability" content="${meta.produto.esgotado ? "out of stock" : "in stock"}">`,
  ] : []).join("\n")}
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/img/icone.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/css/fonts/fraunces-500-800-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/css/fonts/josefin-300-700-latin.woff2" as="font" type="font/woff2" crossorigin>
${preloadImagem}
${css.map(href => `<link rel="stylesheet" href="${href}">`).join("\n")}
${jsonLd}
</head>
<body>
<div id="loja">${corpo}</div>
<script type="application/json" id="dados-da-pagina">${jsonSeguro(dados)}</script>
<script type="module" src="${js}"></script>
</body>
</html>`;
}

module.exports = { montarDocumento, escapar, arquivosDoCliente };
