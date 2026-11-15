(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ArteEstampaPropria = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PETALAS = [0, 72, 144, 216, 288].map(a => `<ellipse cx="12" cy="6.6" rx="3.3" ry="5.4" transform="rotate(${a} 12 12)"/>`).join("");

  function florzinha(x, y, escala, cor, miolo) {
    return `<g transform="translate(${x} ${y}) scale(${escala}) translate(-12 -12)"><g fill="${cor}">${PETALAS}</g><circle cx="12" cy="12" r="2.3" fill="${miolo}"/></g>`;
  }

  const DESENHOS = {
    flor: (cor, fundo) => florzinha(12, 12, 1, cor, fundo),
    coracao: (cor) => `<path fill="${cor}" d="M12 21.2s-8.3-5-9.9-10C1 7.6 3.4 4 7.1 4c2.1 0 3.7 1.1 4.9 2.9C13.2 5.1 14.8 4 16.9 4c3.7 0 6.1 3.6 5 7.2-1.6 5-9.9 10-9.9 10z"/>`,
    ipe: (cor, fundo) => `<path d="M12 23c-.4-4 .3-7 0-10" stroke="#7A5638" stroke-width="1.3" fill="none" stroke-linecap="round"/>${florzinha(7.2, 8.6, 0.48, cor, fundo)}${florzinha(16.6, 7.4, 0.5, cor, fundo)}${florzinha(12, 13.4, 0.46, cor, fundo)}${florzinha(11.6, 3.6, 0.36, cor, fundo)}`,
    estrela: (cor) => `<path fill="${cor}" d="M12 2.2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.1l-6.1 3.5 1.5-6.8-5.2-4.6 6.9-.7z" stroke="${cor}" stroke-width="1.2" stroke-linejoin="round"/>`,
    folha: (cor, fundo) => `<path fill="${cor}" d="M4.5 19.5C4 11 9.5 4.3 19.8 4.2c.4 10.2-6.2 15.9-15.3 15.3z"/><path d="M6 18L16 8" stroke="${fundo}" stroke-width="1.1" stroke-linecap="round"/>`,
    bolinha: (cor) => `<circle cx="12" cy="12" r="8.5" fill="${cor}"/>`,
  };

  function escapar(valor) {
    return String(valor).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
  }

  function numero(n) {
    return Math.round(n * 1000) / 1000;
  }

  function conteudoDoPadrao(p, largura, altura, hrefDaFoto, prefixo) {
    const id = prefixo || "ep";
    const passo = p.tamanho + p.espaco;
    const colunas = Math.max(1, Math.round(largura / passo));
    const w = largura / colunas;
    const h = p.xadrez ? passo * 2 : passo;
    const escala = p.tamanho / 24;
    const posicoes = [[w / 2, passo / 2]];
    if (p.xadrez) posicoes.push([0, passo * 1.5], [w, passo * 1.5]);
    const desenho = p.motivo === "foto"
      ? (hrefDaFoto ? `<image xlink:href="${escapar(hrefDaFoto)}" x="0" y="0" width="24" height="24" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id}-c)"/>` : `<circle cx="12" cy="12" r="11" fill="${p.cor}"/>`)
      : (DESENHOS[p.motivo] || DESENHOS.flor)(p.cor, p.fundo);
    const motivos = posicoes.map(([x, y]) => `<g transform="translate(${numero(x)} ${numero(y)}) scale(${numero(escala)}) translate(-12 -12)">${desenho}</g>`).join("");
    const inicio = numero((((altura / 2 - passo / 2) % h) + h) % h);
    return `<defs><clipPath id="${id}-c" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5"/></clipPath>`
      + `<pattern id="${id}-p" patternUnits="userSpaceOnUse" x="0" y="${inicio}" width="${numero(w)}" height="${numero(h)}">${motivos}</pattern></defs>`
      + `<rect width="${largura}" height="${altura}" fill="${p.fundo}"/><rect width="${largura}" height="${altura}" fill="url(#${id}-p)"/>`;
  }

  function svgDoPadrao(p, largura, altura, hrefDaFoto) {
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${numero(largura * 8)}" height="${numero(altura * 8)}" viewBox="0 0 ${largura} ${altura}">${conteudoDoPadrao(p, largura, altura, hrefDaFoto)}</svg>`;
  }

  function comoDataUrl(svg) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function desenhoDoMotivo(motivo, cor, fundo) {
    return (DESENHOS[motivo] || DESENHOS.flor)(cor, fundo);
  }

  return { DESENHOS, conteudoDoPadrao, svgDoPadrao, comoDataUrl, desenhoDoMotivo };
});
