const path = require("node:path");
const fontkit = require("fontkit");

const PASTA = path.join(__dirname, "fontes");
const cache = new Map();

function fonte(arquivo){
  if(!cache.has(arquivo)) cache.set(arquivo, fontkit.openSync(path.join(PASTA, arquivo)));
  return cache.get(arquivo);
}

function escolherFonte(familia, peso, estilo){
  const f = String(familia || "").toLowerCase();
  if(f.includes("allura")) return fonte("allura-400.ttf");
  if(f.includes("fraunces")){
    if(estilo === "italic") return fonte("fraunces-italico-500.ttf");
    return fonte(Number(peso) >= 700 ? "fraunces-800.ttf" : "fraunces-600.ttf");
  }
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

function linhaEmCurvas(conteudo, { x, y, ancora, tamanho, espaco, f, traco }){
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
      const escalaDoGlifo = arredondar(escala * 1000) / 1000;
      const largura = traco ? ` stroke-width="${arredondar(traco / escalaDoGlifo)}"` : "";
      partes.push(`<path transform="translate(${gx} ${gy}) scale(${escalaDoGlifo} ${-escalaDoGlifo})"${largura} d="${d}"/>`);
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
    const f = escolherFonte(a["font-family"], a["font-weight"], a["font-style"]);
    const traco = a.stroke && a.stroke !== "none" ? numero(a["stroke-width"], 1) : 0;
    const base = { x: numero(a.x), y: numero(a.y), ancora: a["text-anchor"] || "start", tamanho, espaco, f, traco };
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
    const contorno = traco ? ` stroke="${a.stroke}" stroke-linejoin="${a["stroke-linejoin"] || "round"}"` : "";
    return `<g fill="${a.fill || "#000"}"${contorno}>${linhas.join("")}</g>`;
  });
}

function larguraDoTexto(conteudo, { familia, peso, estilo, tamanho, espaco = 0 }){
  const f = escolherFonte(familia, peso, estilo);
  const corrida = f.layout(conteudo);
  const escala = tamanho / f.unitsPerEm;
  return corrida.positions.reduce((s, p) => s + p.xAdvance * escala + espaco, 0) - (corrida.positions.length ? espaco : 0);
}

module.exports = { textoEmCurvas, larguraDoTexto };
