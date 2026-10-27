const fs = require("node:fs");
const path = require("node:path");
const { textoEmCurvas, larguraDoTexto } = require("../lib/texto-em-curvas.js");

const DESTINO = path.join(__dirname, "..", "img", "logo.svg");
const LARGURA = 190;
const ALTURA = 112;

const ICONE = `
  <g fill="none" stroke="#CD7031" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 18v12a8 8 0 0 0 8 8h4a8 8 0 0 0 8-8V18"/>
    <path d="M28 22h2a4 4 0 0 1 0 8h-2"/>
    <path d="M18 30c0-6 1-13 3-20"/>
    ${[0, 72, 144, 216, 288].map(a => `<ellipse cx="21" cy="4.5" rx="1.7" ry="3.2" transform="rotate(${a} 21 8)"/>`).join("")}
  </g>`;

function montar(){
  const arte = { familia: "Fraunces", peso: 600, tamanho: 34 };
  const larguraArte = larguraDoTexto("arte", arte);
  const larguraIcone = 31;
  const inicio = (LARGURA - (larguraArte + 4 + larguraIcone)) / 2;
  const meio = LARGURA / 2;
  const textos = [
    `<text x="${inicio.toFixed(2)}" y="33" font-family="Fraunces" font-weight="600" font-size="34" fill="#CD7031">arte</text>`,
    `<text x="${meio}" y="77" text-anchor="middle" font-family="Fraunces" font-weight="800" font-size="50" letter-spacing="-0.5" fill="#DFA1AC">Canecas</text>`,
    `<text x="${meio}" y="104" text-anchor="middle" font-family="Allura" font-size="30" fill="#9E4A18">personalizados</text>`,
  ].join("");
  const icone = `<g transform="translate(${(inicio + larguraArte + 4).toFixed(2)} 0) scale(0.78)">${ICONE}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGURA} ${ALTURA}" width="${LARGURA}" height="${ALTURA}" role="img" aria-label="Arte Canecas personalizados"><title>Arte Canecas personalizados</title>${textoEmCurvas(textos)}${icone}</svg>\n`;
}

if(require.main === module){
  fs.writeFileSync(DESTINO, montar());
  console.log(`${path.relative(process.cwd(), DESTINO)} — ${(fs.statSync(DESTINO).size / 1024).toFixed(1)} KB`);
}

module.exports = { montar, LARGURA, ALTURA };
