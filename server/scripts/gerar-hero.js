const path = require("node:path");
const fs = require("node:fs");
const sharp = require("sharp");

const PASTA = process.argv[2];
if (!PASTA || !fs.existsSync(PASTA)) {
  console.error("Informe a pasta com até 5 fotos (.jpg/.jpeg/.png/.webp), em ordem alfabética. Ex.: node scripts/gerar-hero.js \"/Users/.../Topo\"");
  process.exit(1);
}

const FOTOS = fs.readdirSync(PASTA)
  .filter((nome) => /\.(jpe?g|png|webp)$/i.test(nome))
  .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }))
  .slice(0, 5)
  .map((arquivo, i) => ({ arquivo, saida: `hero-foto-${i + 1}` }));

if (!FOTOS.length) {
  console.error("Nenhuma foto encontrada na pasta.");
  process.exit(1);
}

const LARGURAS = [480, 960];

(async () => {
  const destino = path.join(__dirname, "..", "img");
  for (const foto of FOTOS) {
    const buffer = await sharp(path.join(PASTA, foto.arquivo))
      .rotate()
      .resize({ width: 1600, height: 2000, fit: "cover", position: "attention" })
      .toBuffer();
    for (const largura of LARGURAS) {
      const redimensionada = sharp(buffer).resize({ width: largura });
      const webp = path.join(destino, `${foto.saida}-${largura}.webp`);
      const jpg = path.join(destino, `${foto.saida}-${largura}.jpg`);
      await redimensionada.clone().webp({ quality: 78 }).toFile(webp);
      await redimensionada.clone().jpeg({ quality: 80, mozjpeg: true }).toFile(jpg);
      console.log(`${foto.arquivo} → ${path.basename(webp)} ${Math.round(fs.statSync(webp).size / 1024)}KB · ${path.basename(jpg)} ${Math.round(fs.statSync(jpg).size / 1024)}KB`);
    }
  }
})().catch((err) => { console.error(err); process.exit(1); });
