const sharp = require("sharp");
const db = require("./db");
const estampas = require("./estampas");

const LARGURA = 2362;
const ALTURA = 1122;
const BRASILIA = "M4 74h142M48 74c4-22 12-44 27-66M102 74c-4-22-12-44-27-66M58 74c3-20 8-42 17-66M92 74c-3-20-8-42-17-66M68 74c2-20 4-42 7-66M82 74c-2-20-4-42-7-66M75 8V2M72 5h6M14 74V54h10v20M118 74V44h4v30M126 74V44h4v30M116 44h16";

function flor(x, y, tamanho, cor, { cheia = false, giro = 0, miolo = null } = {}) {
  const escala = tamanho / 24;
  const petalas = [0, 72, 144, 216, 288]
    .map(a => `<ellipse cx="12" cy="6.5" rx="3" ry="5" transform="rotate(${a} 12 12)"/>`)
    .join("");
  const preenchimento = cheia ? `fill="${cor}" stroke="none"` : `fill="none" stroke="${cor}" stroke-width="1.1"`;
  const centro = miolo ? `<circle cx="12" cy="12" r="2.2" fill="${miolo}"/>` : `<circle cx="12" cy="12" r="1.6" fill="none" stroke="${cor}" stroke-width="1.1"/>`;
  return `<g transform="translate(${x} ${y}) rotate(${giro}) translate(${-tamanho / 2} ${-tamanho / 2}) scale(${escala})"><g ${preenchimento}>${petalas}</g>${centro}</g>`;
}

function aleatorio(semente) {
  let s = semente;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function florzinhas() {
  const sorte = aleatorio(7);
  const cores = ["#CD7031", "#DFA1AC", "#9E4A18", "#D4935E"];
  let desenho = "";
  for (let linha = 0; linha < 9; linha++) {
    for (let coluna = 0; coluna < 17; coluna++) {
      const x = coluna * 148 + (linha % 2 ? 74 : 0) + (sorte() - 0.5) * 30;
      const y = linha * 132 + 40 + (sorte() - 0.5) * 30;
      const tamanho = 58 + sorte() * 46;
      desenho += flor(x, y, tamanho, cores[(linha + coluna) % cores.length], { cheia: (linha + coluna) % 3 === 0, giro: sorte() * 72, miolo: (linha + coluna) % 3 === 0 ? "#FBF3EC" : null });
    }
  }
  return `<rect width="${LARGURA}" height="${ALTURA}" fill="#FBF3EC"/>${desenho}`;
}

function brasiliaEmTraco() {
  let desenho = "";
  for (let linha = 0; linha < 4; linha++) {
    for (let coluna = 0; coluna < 6; coluna++) {
      const x = coluna * 420 + (linha % 2 ? 210 : 0) - 60;
      const y = linha * 290 + 40;
      desenho += `<g transform="translate(${x} ${y}) scale(2.3)" fill="none" stroke="#9E4A18" stroke-width="1.3" stroke-linecap="round"><path d="${BRASILIA}"/></g>`;
      desenho += flor(x + 380, y + 120, 40, "#DFA1AC");
    }
  }
  return `<rect width="${LARGURA}" height="${ALTURA}" fill="#F6E1DE"/>${desenho}`;
}

function ipesAmarelos() {
  const sorte = aleatorio(29);
  const amarelos = ["#E9B824", "#F2C94C", "#DDA521"];
  let desenho = "";
  for (let i = 0; i < 26; i++) {
    const cx = (i % 13) * 190 + 60 + (sorte() - 0.5) * 60;
    const cy = i < 13 ? 300 + (sorte() - 0.5) * 120 : 820 + (sorte() - 0.5) * 120;
    desenho += `<path d="M${cx} ${cy + 140}C${cx - 10} ${cy + 80} ${cx + 8} ${cy + 40} ${cx} ${cy}" stroke="#7A5638" stroke-width="7" fill="none" stroke-linecap="round"/>`;
    for (let f = 0; f < 9; f++) {
      const angulo = sorte() * Math.PI * 2;
      const raio = sorte() * 80;
      desenho += flor(cx + Math.cos(angulo) * raio, cy - 20 + Math.sin(angulo) * raio * 0.8, 40 + sorte() * 26, amarelos[f % amarelos.length], { cheia: true, giro: sorte() * 72, miolo: "#9E4A18" });
    }
  }
  return `<rect width="${LARGURA}" height="${ALTURA}" fill="#FFFBF2"/>${desenho}`;
}

const EXEMPLOS = [
  { nome: "Florzinhas (exemplo)", colecao: "Flores", desenhar: florzinhas },
  { nome: "Brasília em traço (exemplo)", colecao: "Brasília", desenhar: brasiliaEmTraco },
  { nome: "Ipês amarelos (exemplo)", colecao: "Brasília", desenhar: ipesAmarelos },
];

async function gerarPng(desenhar) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGURA}" height="${ALTURA}" viewBox="0 0 ${LARGURA} ${ALTURA}">${desenhar()}</svg>`;
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

async function semearEstampasDeExemplo() {
  if (db.lerEstado("estampas_exemplo_semeadas")) return 0;
  if (db.listarEstampas().length) {
    db.gravarEstado("estampas_exemplo_semeadas", "1");
    return 0;
  }
  for (const exemplo of EXEMPLOS) {
    const imagens = await estampas.prepararImagens(await gerarPng(exemplo.desenhar));
    db.inserirEstampa({ id: estampas.novoId(exemplo.nome.replace(/\s*\(exemplo\)/, "")), nome: exemplo.nome, colecao: exemplo.colecao, exemplo: true, ...imagens });
  }
  db.gravarEstado("estampas_exemplo_semeadas", "1");
  return EXEMPLOS.length;
}

module.exports = { semearEstampasDeExemplo, gerarPng, EXEMPLOS };
