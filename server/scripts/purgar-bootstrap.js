const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");

const RAIZ = path.join(__dirname, "..");
const CSS_ORIGINAL = path.join(RAIZ, "css/vendor/bootstrap.min.css");
const CSS_PURGADO = path.join(RAIZ, "css/vendor/bootstrap.purged.css");

const CONFIG = `
module.exports = {
  content: [${JSON.stringify(path.join(RAIZ, "*.html"))}, ${JSON.stringify(path.join(RAIZ, "js/*.js"))}],
  css: [${JSON.stringify(CSS_ORIGINAL)}],
  safelist: {
    standard: ["show", "fade", "collapsing"],
    deep: [/^modal/, /^offcanvas/, /^toast/, /^backdrop$/],
  },
};
`;

function main() {
  const antes = fs.statSync(CSS_ORIGINAL).size;
  const configPath = path.join(os.tmpdir(), "purgecss-bootstrap." + Date.now() + ".js");
  const dirSaida = fs.mkdtempSync(path.join(os.tmpdir(), "purgecss-saida-"));
  fs.writeFileSync(configPath, CONFIG);

  try {
    execFileSync("npx", ["--yes", "purgecss", "-c", configPath, "-o", dirSaida], {
      stdio: ["ignore", "ignore", "pipe"],
    });
  } catch (err) {
    console.error("purgecss falhou:\n" + String(err.stderr || err.message));
    process.exit(1);
  } finally {
    fs.unlinkSync(configPath);
  }

  fs.renameSync(path.join(dirSaida, path.basename(CSS_ORIGINAL)), CSS_PURGADO);
  fs.rmdirSync(dirSaida);

  const depois = fs.statSync(CSS_PURGADO).size;
  const kb = (n) => (n / 1024).toFixed(1) + " KB";
  console.log(`bootstrap.min.css  ${kb(antes)} -> bootstrap.purged.css ${kb(depois)}`);
}

if (require.main === module) main();
