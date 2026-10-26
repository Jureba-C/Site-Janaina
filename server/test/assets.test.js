const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..");
const PAGINAS = fs.readdirSync(RAIZ).filter(n => n.endsWith(".html"));

function ler(nome){ return fs.readFileSync(path.join(RAIZ, nome), "utf8"); }

test("todo href/src local de css, js, img e fonte existe no disco", () => {
  const faltando = [];
  for(const pagina of PAGINAS){
    const html = ler(pagina);
    const re = /(?:href|src)="((?:css|js|img)\/[^"?#]+)"/g;
    for(const [, rel] of html.matchAll(re)){
      if(!fs.existsSync(path.join(RAIZ, rel))) faltando.push(`${pagina} -> ${rel}`);
    }
  }
  assert.deepEqual(faltando, [], `referências quebradas:\n${faltando.join("\n")}`);
});

test("toda fonte pré-carregada é usada pelo css/fonts.css", () => {
  const fontes = fs.readFileSync(path.join(RAIZ, "css/fonts.css"), "utf8");
  const orfas = [];
  for(const pagina of PAGINAS){
    const re = /<link[^>]+rel="preload"[^>]+href="([^"]+\.woff2)"/g;
    for(const [, rel] of ler(pagina).matchAll(re)){
      const arquivo = rel.split("/").pop();
      if(!fontes.includes(arquivo)) orfas.push(`${pagina} -> ${arquivo}`);
    }
  }
  assert.deepEqual(orfas, [], `preload de fonte que o CSS não usa:\n${orfas.join("\n")}`);
});

test("nenhum preload aponta para a faixa latin-ext, que o português não usa", () => {
  const erradas = [];
  for(const pagina of PAGINAS){
    const re = /<link[^>]+rel="preload"[^>]+href="([^"]+\.woff2)"/g;
    for(const [, rel] of ler(pagina).matchAll(re)){
      if(/-latin-ext-/.test(rel)) erradas.push(`${pagina} -> ${rel}`);
    }
  }
  assert.deepEqual(erradas, [], `preload inútil para português:\n${erradas.join("\n")}`);
});


test("os plugins de rolagem do GSAP entram sob demanda, não por <script> na página", () => {
  const animacoes = fs.readFileSync(path.join(RAIZ, "js/animacoes.js"), "utf8");

  for(const plugin of ["ScrollTrigger", "SplitText"]){
    const comoScript = PAGINAS.filter(p =>
      new RegExp(`<script[^>]*${plugin}\\.min\\.js`).test(fs.readFileSync(path.join(RAIZ, p), "utf8")));
    assert.deepEqual(comoScript, [],
      `${plugin}.min.js voltou a ser <script> — some com o ganho do carregamento sob demanda`);
  }

  const home = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");
  for(const id of ["assetScrollTrigger", "assetSplitText"]){
    assert.match(home, new RegExp(`<link[^>]*rel="preload"[^>]*id="${id}"`),
      `sem o <link rel=preload id=${id}>, o carregador cai no caminho de reserva`);
    assert.ok(animacoes.includes(`"${id}"`), `js/animacoes.js não procura mais por ${id}`);
  }

  assert.match(animacoes, /Promise\.all\(\[[\s\S]{0,200}carregarPlugin\("ScrollTrigger"[\s\S]{0,200}carregarPlugin\("SplitText"/,
    "os dois plugins precisam ser aguardados juntos antes de animar (ver o aviso acima)");
});
