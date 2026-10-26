const FONTES = [
  { familia: "Fraunces", estilo: "normal", peso: "500 800", arquivo: "/css/fonts/fraunces-500-800-latin.woff2" },
  { familia: "Fraunces", estilo: "italic", peso: "500", arquivo: "/css/fonts/fraunces-italico-500-latin.woff2" },
  { familia: "Josefin Sans", estilo: "normal", peso: "300 700", arquivo: "/css/fonts/josefin-300-700-latin.woff2" },
  { familia: "Allura", estilo: "normal", peso: "400", arquivo: "/css/fonts/allura-400-latin.woff2" },
];

let fontesEmbutidas: Promise<string> | null = null;
const dataUris = new Map<string, Promise<string>>();

function lerComoDataUri(blob: Blob): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(String(leitor.result));
    leitor.onerror = () => rejeitar(leitor.error);
    leitor.readAsDataURL(blob);
  });
}

function dataUriDe(url: string): Promise<string> {
  if (url.startsWith("data:")) return Promise.resolve(url);
  let pedido = dataUris.get(url);
  if (!pedido) {
    pedido = fetch(url).then(r => {
      if (!r.ok) throw new Error(`não carregou ${url}`);
      return r.blob();
    }).then(lerComoDataUri);
    dataUris.set(url, pedido);
  }
  return pedido;
}

function cssDasFontes(): Promise<string> {
  if (!fontesEmbutidas) {
    fontesEmbutidas = Promise.all(FONTES.map(async f => {
      const uri = await dataUriDe(f.arquivo);
      return `@font-face{font-family:"${f.familia}";font-style:${f.estilo};font-weight:${f.peso};src:url(${uri}) format("woff2");}`;
    })).then(regras => regras.join(""));
  }
  return fontesEmbutidas;
}

export async function svgComoImagem(svg: SVGSVGElement, largura: number, altura: number): Promise<HTMLImageElement> {
  const copia = svg.cloneNode(true) as SVGSVGElement;
  copia.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copia.setAttribute("width", String(largura));
  copia.setAttribute("height", String(altura));
  copia.removeAttribute("class");
  copia.removeAttribute("aria-hidden");
  const imagens = Array.from(copia.querySelectorAll("image"));
  await Promise.all(imagens.map(async imagem => {
    const href = imagem.getAttribute("href");
    if (!href) return;
    try {
      imagem.setAttribute("href", await dataUriDe(href));
    } catch {
      imagem.remove();
    }
  }));
  const estilo = document.createElementNS("http://www.w3.org/2000/svg", "style");
  estilo.textContent = await cssDasFontes();
  copia.insertBefore(estilo, copia.firstChild);
  const texto = new XMLSerializer().serializeToString(copia);
  const url = URL.createObjectURL(new Blob([texto], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const imagem = new Image();
    imagem.decoding = "sync";
    await new Promise<void>((resolver, rejeitar) => {
      imagem.onload = () => resolver();
      imagem.onerror = () => rejeitar(new Error("a arte não virou imagem"));
      imagem.src = url;
    });
    return imagem;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
