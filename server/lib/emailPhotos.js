const sharp = require("sharp");

const LADO = 112;

const CID_NO_HTML =
  /cid:produto-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/g;

let blocoLisoCache = null;
async function blocoLiso() {
  if (!blocoLisoCache) {
    blocoLisoCache = await sharp({
      create: { width: LADO, height: LADO, channels: 3, background: "#FBDCE8" },
    })
      .jpeg({ quality: 70 })
      .toBuffer();
  }
  return blocoLisoCache;
}

async function anexosDeMiniaturas(html) {
  if (!html) return [];

  const db = require("./db.js");

  const ids = [...new Set(Array.from(String(html).matchAll(CID_NO_HTML), (m) => m[1]))];
  if (!ids.length) return [];

  const comecou = Date.now();
  const anexos = [];

  for (const id of ids) {
    let conteudo;
    try {
      const foto = db.getProductPhoto(id);
      conteudo = foto
        ? await sharp(Buffer.from(foto.data))
            .resize(LADO, LADO, { fit: "cover", position: "centre" })
            .jpeg({ quality: 72, mozjpeg: true })
            .toBuffer()
        : await blocoLiso();
    } catch (err) {
      console.error(`Miniatura ${id} falhou — usando bloco liso:`, err.message || err);
      conteudo = await blocoLiso();
    }
    anexos.push({
      filename: `produto-${id}.jpg`,
      content: conteudo,
      cid: `produto-${id}`,
      contentType: "image/jpeg",
    });
  }

  const levou = Date.now() - comecou;
  if (levou > 1000) {
    console.warn(`Miniaturas demoraram ${levou}ms para ${ids.length} foto(s).`);
  }
  return anexos;
}

async function enviarComMiniaturas(mensagem) {
  const email = require("./email.js");
  return email.sendEmail({
    ...mensagem,
    attachments: await anexosDeMiniaturas(mensagem.html),
  });
}

module.exports = { anexosDeMiniaturas, enviarComMiniaturas, LADO };
