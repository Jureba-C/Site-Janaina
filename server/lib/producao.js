const sharp = require("sharp");
const { textoEmCurvas } = require("./texto-em-curvas.js");

const GABARITOS = {
  caneca: { largura: 200, altura: 95, cilindro: 110, alca: true },
  xicara: { largura: 170, altura: 60, cilindro: 118, alca: true },
  garrafa: { largura: 200, altura: 150, cilindro: 66 },
  copo: { largura: 230, altura: 110, cilindro: 80 },
  azulejo: { largura: 150, altura: 150 },
  plano: { largura: 220, altura: 180 },
  botton: { largura: 55, altura: 55 },
  caixa: { largura: 150, altura: 150 },
  foto: { largura: 200, altura: 95 },
};

const ARTE_POR_MOLDE = {
  caneca: { largura: 189, altura: 194 },
  xicara: { largura: 184, altura: 98 },
  garrafa: { largura: 121, altura: 168 },
  copo: { largura: 134, altura: 146 },
  azulejo: { largura: 186, altura: 214 },
  plano: { largura: 240, altura: 170 },
  botton: { largura: 190, altura: 190 },
  caixa: { largura: 150, altura: 120 },
};

const LADO_MAXIMO_DA_FOTO = 2400;

function medidaDoNome(texto){
  const casou = /(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*cm/i.exec(String(texto || ""));
  if(casou) return { largura: Number(casou[1].replace(",", ".")) * 10, altura: Number(casou[2].replace(",", ".")) * 10 };
  const diametro = /(\d+(?:[.,]\d+)?)\s*cm/i.exec(String(texto || ""));
  if(diametro) return { largura: Number(diametro[1].replace(",", ".")) * 10, altura: Number(diametro[1].replace(",", ".")) * 10 };
  return null;
}

function gabaritoDoItem(config, escolhas){
  const base = { ...(GABARITOS[config.molde] || GABARITOS.caneca) };
  if(!base.cilindro){
    const nomes = config.variacoes.map(g => g.opcoes.find(o => o.id === escolhas?.variacoes?.[g.id])?.nome).filter(Boolean);
    const medida = [...nomes, config.medida].map(medidaDoNome).find(Boolean);
    if(medida){ base.largura = medida.largura; base.altura = medida.altura; }
  }
  return base;
}

async function recortarFoto(dados, foto){
  const meta = await sharp(dados).metadata();
  const w = meta.width, h = meta.height;
  const lado = Math.min(w, h);
  const zoom = Math.max(1, Number(foto.zoom) || 1);
  const visivel = lado / zoom;
  const deslocamento = (eixo) => lado * (zoom - 1) / (2 * zoom) * (1 - (Number(foto[eixo]) || 0));
  const left = Math.round((w - lado) / 2 + deslocamento("x"));
  const top = Math.round((h - lado) / 2 + deslocamento("y"));
  const tamanho = Math.max(1, Math.min(Math.round(visivel), w - left, h - top));
  const saida = await sharp(dados)
    .extract({ left: Math.max(0, left), top: Math.max(0, top), width: tamanho, height: tamanho })
    .resize({ width: Math.min(tamanho, LADO_MAXIMO_DA_FOTO), withoutEnlargement: true })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${saida.toString("base64")}`;
}

function semSvgExterno(svg){
  const inicio = svg.indexOf(">") + 1;
  const fim = svg.lastIndexOf("</svg>");
  return svg.slice(inicio, fim).replace(/<style>[\s\S]*?<\/style>/, "");
}

async function arquivoDeProducao({ config, escolhas, lerFoto, svgDaArte, titulo }){
  const gabarito = gabaritoDoItem(config, escolhas);
  const fotos = {};
  const escolhasDaProducao = JSON.parse(JSON.stringify(escolhas));
  for(const foto of escolhasDaProducao.personalizacao?.fotos || []){
    const dados = lerFoto(foto.id);
    if(!dados) continue;
    fotos[foto.id] = await recortarFoto(dados, foto);
    foto.zoom = 1;
    foto.x = 0;
    foto.y = 0;
  }
  const area = config.molde === "foto" && config.moldeFoto?.area
    ? { largura: config.moldeFoto.area.w * 360, altura: config.moldeFoto.area.h * 380 }
    : ARTE_POR_MOLDE[config.molde] || ARTE_POR_MOLDE.caneca;
  const lados = ["frente"];
  if(config.personalizacao?.verso && escolhasDaProducao.personalizacao?.frase) lados.push("verso");

  const grupos = lados.map(lado => {
    const interno = textoEmCurvas(semSvgExterno(svgDaArte({ config, escolhas: escolhasDaProducao, lado, fotos })))
      .replace(/<image\b([^>]*?)\shref="/g, '<image$1 xlink:href="');
    let escala, cx;
    if(gabarito.cilindro){
      escala = gabarito.largura / (2 * Math.PI * gabarito.cilindro);
      cx = lado === "frente" ? gabarito.largura * 0.25 : gabarito.largura * 0.75;
    } else {
      escala = Math.min(gabarito.largura / area.largura, gabarito.altura / area.altura) * 0.92;
      cx = gabarito.largura / 2;
    }
    const cy = gabarito.altura / 2;
    return `<g id="${lado === "frente" ? "Frente" : "Verso"}" transform="translate(${cx.toFixed(3)} ${cy.toFixed(3)}) scale(${escala.toFixed(5)})">${interno}</g>`;
  });

  const { largura, altura } = gabarito;
  const guias = [
    `<rect x="0.1" y="0.1" width="${largura - 0.2}" height="${altura - 0.2}" fill="none" stroke="#A9521D" stroke-width="0.2" stroke-dasharray="2 1.5"/>`,
  ];
  if(gabarito.cilindro){
    guias.push(`<line x1="${largura / 2}" y1="0" x2="${largura / 2}" y2="${altura}" stroke="#D4935E" stroke-width="0.15" stroke-dasharray="1 1"/>`);
    if(gabarito.alca){
      guias.push(`<rect x="0" y="${altura * 0.25}" width="4" height="${altura * 0.5}" fill="#DFA1AC" fill-opacity="0.35"/>`);
      guias.push(`<rect x="${largura - 4}" y="${altura * 0.25}" width="4" height="${altura * 0.5}" fill="#DFA1AC" fill-opacity="0.35"/>`);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${largura}mm" height="${altura}mm" viewBox="0 0 ${largura} ${altura}">
<title>${String(titulo).replace(/[<&>]/g, "")}</title>
<g id="Arte">${grupos.join("")}</g>
<g id="Guias" opacity="0.8">${guias.join("")}</g>
</svg>
`;
}

module.exports = { arquivoDeProducao, gabaritoDoItem, GABARITOS };
