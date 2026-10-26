const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

const RAIZ = path.join(__dirname, "..");
const CSS_COMPLETO = path.join(RAIZ, "css/vendor/bootstrap-icons.min.css");
const FONTE_COMPLETA = path.join(RAIZ, "css/vendor/fonts/bootstrap-icons.woff2");
const CSS_RECORTADO = path.join(RAIZ, "css/vendor/bootstrap-icons.subset.css");
const PASTA_FONTES = path.join(RAIZ, "css/vendor/fonts");
const PREFIXO_FONTE = "bootstrap-icons.subset-";
function nomeDaFonteRecortada(){
  const achados = fs.readdirSync(PASTA_FONTES)
    .filter((f) => f.startsWith(PREFIXO_FONTE) && f.endsWith(".woff2"));
  return achados.length === 1 ? achados[0] : null;
}
function caminhoDaFonteRecortada(){
  const nome = nomeDaFonteRecortada();
  return nome ? path.join(PASTA_FONTES, nome) : null;
}

const PASTAS = ["", "js"];
const IGNORAR = new Set(["node_modules", "vendor", "fonts", "test", "scripts"]);

function arquivosParaVarrer() {
  const achados = [];
  for (const pasta of PASTAS) {
    const dir = path.join(RAIZ, pasta);
    for (const nome of fs.readdirSync(dir)) {
      if (IGNORAR.has(nome)) continue;
      const cheio = path.join(dir, nome);
      if (!fs.statSync(cheio).isFile()) continue;
      if (/\.(html|js)$/.test(nome)) achados.push(cheio);
    }
  }
  return achados;
}

function iconesUsados() {
  const usados = new Set();
  for (const arquivo of arquivosParaVarrer()) {
    const texto = fs.readFileSync(arquivo, "utf8");
    for (const m of texto.matchAll(/\bbi-([a-z0-9]+(?:-[a-z0-9]+)*)\b/g)) {
      usados.add("bi-" + m[1]);
    }
  }
  return usados;
}

function mapaDeCodepoints() {
  const css = fs.readFileSync(CSS_COMPLETO, "utf8");
  const mapa = new Map();
  for (const m of css.matchAll(/\.(bi-[a-z0-9-]+)::before\s*\{\s*content:\s*"\\([0-9a-fA-F]+)"/g)) {
    mapa.set(m[1], m[2].toLowerCase());
  }
  return mapa;
}

function main() {
  const mapa = mapaDeCodepoints();
  const usados = [...iconesUsados()].filter((nome) => mapa.has(nome)).sort();

  if (!usados.length) {
    console.error("Nenhum ícone encontrado — algo está errado na varredura.");
    process.exit(1);
  }

  const unicodes = usados.map((nome) => "U+" + mapa.get(nome)).join(",");

  const provisoria = path.join(PASTA_FONTES, "bootstrap-icons.subset.tmp.woff2");

  try {
    execFileSync("pyftsubset", [
      FONTE_COMPLETA,
      `--unicodes=${unicodes}`,
      "--flavor=woff2",
      `--output-file=${provisoria}`,
      "--layout-features=",
      "--no-hinting",
      "--desubroutinize",
      "--name-IDs=",
      "--drop-tables+=DSIG",
    ], { stdio: ["ignore", "ignore", "pipe"] });
  } catch (err) {
    const faltando = err.code === "ENOENT";
    console.error(faltando
      ? "pyftsubset não encontrado. Instale com:\n" +
        '  python3 -m venv .venv && .venv/bin/pip install "fonttools[woff]"\n' +
        "e rode com o venv ativo (ou PATH apontando para ele)."
      : "pyftsubset falhou:\n" + String(err.stderr || err.message));
    try { fs.unlinkSync(provisoria); } catch {}
    process.exit(1);
  }

  const hash = crypto.createHash("sha256")
    .update(fs.readFileSync(provisoria)).digest("hex").slice(0, 8);
  const nomeFinal = `${PREFIXO_FONTE}${hash}.woff2`;
  for(const antigo of fs.readdirSync(PASTA_FONTES)){
    if(antigo.startsWith(PREFIXO_FONTE) && antigo !== nomeFinal){
      fs.unlinkSync(path.join(PASTA_FONTES, antigo));
    }
  }
  fs.renameSync(provisoria, path.join(PASTA_FONTES, nomeFinal));

  const regras = usados.map((nome) => `.${nome}::before{content:"\\${mapa.get(nome)}"}`).join("\n");
  const css = `/* GERADO por scripts/subset-icones.js — não editar à mão.
   ${usados.length} de ${mapa.size} ícones do Bootstrap Icons v1.11.3 (MIT).
   Para adicionar um ícone: use a classe no HTML/JS e rode o script de novo. */
@font-face{font-display:block;font-family:bootstrap-icons;src:url("fonts/${nomeFinal}") format("woff2")}
.bi::before,[class*=" bi-"]::before,[class^=bi-]::before{display:inline-block;font-family:bootstrap-icons!important;font-style:normal;font-weight:400!important;font-variant:normal;text-transform:none;line-height:1;vertical-align:-.125em;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
${regras}
`;
  fs.writeFileSync(CSS_RECORTADO, css);

  const kb = (p) => (fs.statSync(p).size / 1024).toFixed(1) + " KB";
  console.log(`${usados.length} ícones de ${mapa.size}`);
  console.log(`fonte  ${kb(FONTE_COMPLETA)} -> ${kb(path.join(PASTA_FONTES, nomeFinal))}  (${nomeFinal})`);
  console.log(`css    ${kb(CSS_COMPLETO)} -> ${kb(CSS_RECORTADO)}`);
}

module.exports = { iconesUsados, mapaDeCodepoints, CSS_RECORTADO, PASTA_FONTES, caminhoDaFonteRecortada };

if (require.main === module) main();
