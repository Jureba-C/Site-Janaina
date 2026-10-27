const crypto = require("node:crypto");
const sharp = require("sharp");
const db = require("./db");

const FORMATOS_ACEITOS = new Set(["jpeg", "png", "webp", "tiff"]);
const LIMITE_BYTES = 30 * 1024 * 1024;
const LIMITE_PIXELS = 120000000;
const LARGURA_TEXTURA = 2048;

const TAMANHOS_IDEAIS = {
  caneca: { mm: [200, 95], px: [2362, 1122] },
  xicara: { mm: [170, 60], px: [2008, 709] },
  garrafa: { mm: [200, 150], px: [2362, 1772] },
  copo: { mm: [230, 110], px: [2717, 1299] },
};

async function prepararImagens(buffer) {
  let meta;
  try {
    meta = await sharp(buffer, { failOn: "error", limitInputPixels: LIMITE_PIXELS }).metadata();
  } catch {
    throw { status: 415, message: "Esse arquivo não é uma imagem que a gente consiga abrir. Envie PNG ou JPG." };
  }
  if (!FORMATOS_ACEITOS.has(meta.format)) throw { status: 415, message: "Formato não aceito. Envie PNG, JPG, WEBP ou TIFF." };
  if (!meta.width || !meta.height || meta.width < 600 || meta.height < 250) {
    throw { status: 415, message: "Imagem pequena demais para estampa. Use pelo menos 2362 × 1122 px na caneca." };
  }
  const girada = sharp(buffer, { limitInputPixels: LIMITE_PIXELS }).rotate();
  const original = meta.format === "jpeg" || meta.format === "png"
    ? { mime: `image/${meta.format}`, data: buffer }
    : { mime: "image/png", data: await girada.clone().png().toBuffer() };
  const textura = await girada.clone()
    .resize({ width: LARGURA_TEXTURA, withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
  const miniatura = await girada.clone()
    .resize({ width: 360, height: 240, fit: "cover" })
    .flatten({ background: "#ffffff" })
    .webp({ quality: 80 })
    .toBuffer();
  const vira = (meta.orientation || 1) >= 5;
  return {
    largura: vira ? meta.height : meta.width,
    altura: vira ? meta.width : meta.height,
    originalMime: original.mime,
    original: original.data,
    textura,
    miniatura,
  };
}

function novoId(nome) {
  const base = String(nome || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 30) || "estampa";
  return `${base}-${crypto.randomBytes(3).toString("hex")}`;
}

function estampaPublica(e) {
  const versao = e.updated_at || 0;
  return {
    id: e.id,
    nome: e.nome,
    colecao: e.colecao,
    preco: Number(e.preco) || 0,
    proporcao: e.largura && e.altura ? Math.round((e.largura / e.altura) * 1000) / 1000 : 2.105,
    miniatura: `/api/estampas/${e.id}/miniatura?v=${versao}`,
    textura: `/api/estampas/${e.id}/textura?v=${versao}`,
  };
}

function estampasDisponiveis(config) {
  if (!config || !config.estampas || !config.estampas.ativa) return [];
  const ativas = db.listarEstampas().filter(e => e.ativa);
  const ids = config.estampas.ids || [];
  const lista = ids.length ? ids.map(id => ativas.find(e => e.id === id)).filter(Boolean) : ativas;
  return lista.map(estampaPublica);
}

function comEstampas(produto) {
  if (!produto) return produto;
  return { ...produto, estampasDisponiveis: estampasDisponiveis(produto.config) };
}

module.exports = {
  LIMITE_BYTES, TAMANHOS_IDEAIS,
  prepararImagens, novoId, estampaPublica, estampasDisponiveis, comEstampas,
};
