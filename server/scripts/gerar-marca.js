const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const RAIZ = path.join(__dirname, "..");
const FONTES = path.join(RAIZ, "css", "fonts");

const CANECA_COM_FLOR = (cor, traco) => `
  <g fill="none" stroke="${cor}" stroke-width="${traco}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 18v12a8 8 0 0 0 8 8h4a8 8 0 0 0 8-8V18"/>
    <path d="M28 22h2a4 4 0 0 1 0 8h-2"/>
    <path d="M18 30c0-6 1-13 3-20"/>
    ${[0, 72, 144, 216, 288].map(a => `<ellipse cx="21" cy="4.5" rx="1.7" ry="3.2" transform="rotate(${a} 21 8)"/>`).join("")}
  </g>`;

function svgDoIcone(tamanho){
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="${tamanho}" height="${tamanho}">
  <rect width="48" height="48" rx="12" fill="#FBF8F3"/>
  <g transform="translate(5 3) scale(0.95)">${CANECA_COM_FLOR("#CD7031", 3)}</g>
</svg>`;
}

function fontesComoCss(){
  const arquivo = (nome) => `data:font/woff2;base64,${fs.readFileSync(path.join(FONTES, nome)).toString("base64")}`;
  return `
    @font-face{font-family:"Fraunces";font-weight:500 800;src:url(${arquivo("fraunces-500-800-latin.woff2")}) format("woff2");}
    @font-face{font-family:"Josefin Sans";font-weight:300 700;src:url(${arquivo("josefin-300-700-latin.woff2")}) format("woff2");}
    @font-face{font-family:"Allura";src:url(${arquivo("allura-400-latin.woff2")}) format("woff2");}`;
}

function htmlDoLogo(){
  return `<div class="logo">
    <div class="linha"><span class="arte">arte</span><svg viewBox="0 0 40 44" width="34" height="37">${CANECA_COM_FLOR("#CD7031", 2.2)}</svg></div>
    <span class="canecas">Canecas</span>
    <span class="personalizados">personalizados</span>
  </div>`;
}

const CSS_DO_LOGO = `
  .logo{display:inline-flex;flex-direction:column;align-items:center;line-height:.82}
  .linha{display:flex;align-items:flex-end;gap:4px}
  .arte{font-family:Fraunces;font-variation-settings:"opsz" 72;font-weight:600;font-size:34px;color:#CD7031}
  .canecas{font-family:Fraunces;font-variation-settings:"opsz" 144;font-weight:800;font-size:50px;color:#DFA1AC;letter-spacing:-.01em}
  .personalizados{font-family:Allura;font-size:30px;color:#A9521D;margin-top:4px;line-height:1}`;

function icoComPngs(pngs){
  const cabecalho = Buffer.alloc(6);
  cabecalho.writeUInt16LE(0, 0);
  cabecalho.writeUInt16LE(1, 2);
  cabecalho.writeUInt16LE(pngs.length, 4);
  let deslocamento = 6 + 16 * pngs.length;
  const entradas = pngs.map(({ tamanho, dados }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(tamanho >= 256 ? 0 : tamanho, 0);
    e.writeUInt8(tamanho >= 256 ? 0 : tamanho, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(dados.length, 8);
    e.writeUInt32LE(deslocamento, 12);
    deslocamento += dados.length;
    return e;
  });
  return Buffer.concat([cabecalho, ...entradas, ...pngs.map(p => p.dados)]);
}

async function gerar(){
  let playwright;
  try {
    playwright = require("playwright");
  } catch {
    console.error("Playwright não encontrado. Rode: npm i -D playwright && npx playwright install chromium");
    process.exit(1);
  }

  fs.writeFileSync(path.join(RAIZ, "img", "icone.svg"), svgDoIcone(48));
  const pngs = await Promise.all([16, 32, 48].map(async tamanho => ({ tamanho, dados: await sharp(Buffer.from(svgDoIcone(tamanho * 4))).resize(tamanho, tamanho).png().toBuffer() })));
  fs.writeFileSync(path.join(RAIZ, "favicon.ico"), icoComPngs(pngs));
  await sharp(Buffer.from(svgDoIcone(720))).resize(180, 180).png({ compressionLevel: 9 }).toFile(path.join(RAIZ, "apple-touch-icon.png"));

  const navegador = await playwright.chromium.launch();
  try {
    const pagina = await navegador.newPage({ deviceScaleFactor: 2, viewport: { width: 168, height: 108 } });
    await pagina.setContent(`<!doctype html><meta charset="utf-8"><style>${fontesComoCss()}html,body{margin:0;background:transparent}body{display:grid;place-items:center;width:168px;height:108px}${CSS_DO_LOGO}</style>${htmlDoLogo()}`);
    await pagina.evaluate(() => document.fonts.ready);
    await pagina.screenshot({ path: path.join(RAIZ, "img", "logo-loja.png"), omitBackground: true });

    const foto = `data:image/jpeg;base64,${fs.readFileSync(path.join(RAIZ, "img", "provisorias", "canecas-alca-colorida.jpg")).toString("base64")}`;
    const og = await navegador.newPage({ viewport: { width: 1200, height: 630 } });
    await og.setContent(`<!doctype html><meta charset="utf-8"><style>${fontesComoCss()}
      html,body{margin:0}
      body{width:1200px;height:630px;background:#F6E1DE;font-family:"Josefin Sans";display:flex;align-items:center;overflow:hidden;position:relative}
      .texto{padding:0 0 0 80px;flex:1;z-index:1}
      ${CSS_DO_LOGO}
      .logo{transform:scale(1.5);transform-origin:left center;margin-bottom:36px}
      h1{font-family:Fraunces;font-weight:700;font-size:76px;line-height:.98;letter-spacing:-.02em;color:#323230;margin:0}
      p{font-family:Allura;font-size:46px;color:#A9521D;margin:10px 0 0}
      .faixa{position:absolute;right:-40px;left:620px;top:250px;height:200px;background:#D4935E;border-radius:999px 0 0 999px}
      .polaroid{position:absolute;right:120px;top:80px;width:330px;background:#fff;padding:14px 14px 50px;box-shadow:0 18px 40px rgba(110,60,30,.2);transform:rotate(-3deg)}
      .polaroid img{width:100%;aspect-ratio:1/1;object-fit:cover;display:block}
      .fita{position:absolute;top:-14px;left:50%;width:110px;height:28px;margin-left:-55px;background:rgba(226,205,168,.9);transform:rotate(4deg)}
    </style>
    <div class="faixa"></div>
    <div class="texto">${htmlDoLogo()}<h1>Presentes<br>que marcam</h1><p>transformando sentimentos em presentes</p></div>
    <div class="polaroid"><span class="fita"></span><img src="${foto}" alt=""></div>`);
    await og.evaluate(() => document.fonts.ready);
    const ogPng = await og.screenshot();
    await sharp(ogPng).jpeg({ quality: 84, mozjpeg: true, progressive: true }).toFile(path.join(RAIZ, "img", "og-loja.jpg"));
  } finally {
    await navegador.close();
  }
  await require("./logo-email.js").gerar();
  console.log("Marca gerada: img/logo-loja.png, img/og-loja.jpg, img/icone.svg, favicon.ico, apple-touch-icon.png e o logo dos e-mails.");
}

if(require.main === module){
  gerar().catch(err => { console.error(err); process.exit(1); });
}

module.exports = { gerar, icoComPngs };
