const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const PASTA = path.join(__dirname, "../css/fonts");

const TRABALHOS = [
  { de: "caveat-500-latin-14ecf1.woff2", para: "caveat-400-latin.woff2", eixos: { wght: 400 } },
  { de: "caveat-500-latin-ext-60fd7f.woff2", para: "caveat-400-latin-ext.woff2", eixos: { wght: 400 } },
];

const PY = `
import io, json, sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
de, para, eixos = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
fonte = instancer.instantiateVariableFont(TTFont(de), eixos, inplace=False, updateFontNames=False)
fonte.flavor = "woff2"
fonte.save(para)
`;

function main() {
  let antes = 0;
  let depois = 0;
  for (const t of TRABALHOS) {
    const de = path.join(PASTA, t.de);
    const para = path.join(PASTA, t.para);
    try {
      execFileSync("python3", ["-c", PY, de, para, JSON.stringify(t.eixos)], {
        stdio: ["ignore", "ignore", "pipe"],
      });
    } catch (err) {
      console.error(
        "Não consegui instanciar a fonte. Confira se o fonttools está no PATH:\n" +
          '  python3 -m venv .venv && .venv/bin/pip install "fonttools[woff]"\n' +
          String(err.stderr || err.message)
      );
      process.exit(1);
    }
    const a = fs.statSync(de).size;
    const d = fs.statSync(para).size;
    antes += a;
    depois += d;
    console.log(`${t.para.padEnd(28)} ${(a / 1024).toFixed(1)} KB -> ${(d / 1024).toFixed(1)} KB`);
  }
  console.log(`total: ${(antes / 1024).toFixed(1)} KB -> ${(depois / 1024).toFixed(1)} KB`);
  console.log("Lembre de apontar css/fonts.css para os arquivos novos.");
}

if (require.main === module) main();
