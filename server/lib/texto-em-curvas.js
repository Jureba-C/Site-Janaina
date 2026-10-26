const path = require("node:path");
const fontkit = require("fontkit");

const PASTA = path.join(__dirname, "fontes");
const cache = new Map();

function fonte(arquivo){
  if(!cache.has(arquivo)) cache.set(arquivo, fontkit.openSync(path.join(PASTA, arquivo)));
  return cache.get(arquivo);
}

function escolherFonte(familia, peso){
  const f = String(familia || "").toLowerCase();
  if(f.includes("allura")) return fonte("allura-400.ttf");
  if(f.includes("fraunces")) return fonte("fraunces-italico-500.ttf");
  return fonte(Number(peso) <= 300 ? "josefin-300.ttf" : "josefin-400.ttf");
}

function atributos(texto){
  const saida = {};
  for(const [, nome, valor] of texto.matchAll(/([a-zA-Z:-]+)="([^"]*)"/g)) saida[nome] = valor;
  return saida;
}

function desescapar(texto){
  return String(texto)
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"")
    .replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&");
}

function numero(valor, padrao = 0){
  const n = Number.parseFloat(valor);
  return Number.isFinite(n) ? n : padrao;
}

function arredondar(n){
  return Math.round(n * 1000) / 1000;
}

function linhaEmCurvas(conteudo, { x, y, ancora, tamanho, espaco, f }){
  const escala = tamanho / f.unitsPerEm;
  const corrida = f.layout(conteudo);
  let largura = 0;
  corrida.positions.forEach(p => { largura += p.xAdvance * escala + espaco; });
  if(corrida.positions.length) largura -= espaco;
  let caneta = ancora === "middle" ? x - largura / 2 : ancora === "end" ? x - largura : x;
  const partes = [];
  corrida.glyphs.forEach((glifo, i) => {
    const p = corrida.positions[i];
    const d = glifo.path.toSVG();
    if(d){
      const gx = arredondar(caneta + p.xOffset * escala);
      const gy = arredondar(y - p.yOffset * escala);
      partes.push(`<path transform="translate(${gx} ${gy}) scale(${arredondar(escala * 1000) / 1000} ${-arredondar(escala * 1000) / 1000})" d="${d}"/>`);
    }
    caneta += p.xAdvance * escala + espaco;
  });
  return partes.join("");
}

function textoEmCurvas(svg){
  return svg.replace(/<text\b([^>]*)>([\s\S]*?)<\/text>/g, (_, brutos, miolo) => {
    const a = atributos(brutos);
    const tamanho = numero(a["font-size"], 16);
    const espacoEm = String(a["letter-spacing"] || "0");
    const espaco = espacoEm.endsWith("em") ? numero(espacoEm) * tamanho : numero(espacoEm);
    const f = escolherFonte(a["font-family"], a["font-weight"]);
    const base = { x: numero(a.x), y: numero(a.y), ancora: a["text-anchor"] || "start", tamanho, espaco, f };
    const linhas = [];
    if(miolo.includes("<tspan")){
      let y = base.y;
      for(const [, brutosLinha, textoLinha] of miolo.matchAll(/<tspan\b([^>]*)>([\s\S]*?)<\/tspan>/g)){
        const al = atributos(brutosLinha);
        y += numero(al.dy);
        linhas.push(linhaEmCurvas(desescapar(textoLinha), { ...base, x: al.x !== undefined ? numero(al.x) : base.x, y }));
      }
    } else {
      linhas.push(linhaEmCurvas(desescapar(miolo), base));
    }
    return `<g fill="${a.fill || "#000"}">${linhas.join("")}</g>`;
  });
}

module.exports = { textoEmCurvas };
