const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const ORIGEM = path.join(__dirname, "..", "img", "logo-loja.png");
const DESTINO = path.join(__dirname, "..", "img", "logo-loja-email.png");

const FUNDO = "#FBF8F3";
const RESPIRO = 24;
const RAIO = 18;

async function gerar() {
  const logo = sharp(ORIGEM);
  const { width, height } = await logo.metadata();

  const larguraTotal = width + RESPIRO * 2;
  const alturaTotal = height + RESPIRO * 2;

  const fundo = Buffer.from(
    `<svg width="${larguraTotal}" height="${alturaTotal}">` +
      `<rect width="${larguraTotal}" height="${alturaTotal}" rx="${RAIO}" ry="${RAIO}" fill="${FUNDO}"/>` +
      `</svg>`
  );

  await sharp(fundo)
    .composite([{ input: await logo.png().toBuffer(), top: RESPIRO, left: RESPIRO }])
    .png({ compressionLevel: 9, palette: true })
    .toFile(DESTINO);

  const { size } = fs.statSync(DESTINO);
  console.log(`${path.basename(DESTINO)} — ${larguraTotal}x${alturaTotal}, ${(size / 1024).toFixed(1)} KB`);
}

if (require.main === module) {
  gerar().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { DESTINO, FUNDO, gerar };
