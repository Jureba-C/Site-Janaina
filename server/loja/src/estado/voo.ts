import { movimentoReduzido } from "./revelar";

export function voarParaSacola(origem: Element | null, partida: Element | null = null): Promise<void> {
  const destino = document.querySelector(".botao-carrinho");
  if (!origem || !destino || movimentoReduzido() || typeof Element.prototype.animate !== "function") return Promise.resolve();
  const caixaOrigem = origem.getBoundingClientRect();
  const origemVisivel = caixaOrigem.width > 0 && caixaOrigem.top > -caixaOrigem.height * 0.4 && caixaOrigem.bottom < window.innerHeight + caixaOrigem.height * 0.4;
  const caixaPartida = partida?.getBoundingClientRect();
  const de = origemVisivel || !caixaPartida
    ? caixaOrigem
    : new DOMRect(caixaPartida.left + caixaPartida.width / 2 - 48, caixaPartida.top - 72, 96, 96);
  const caixa = destino.getBoundingClientRect();
  if (!de.width) return Promise.resolve();
  const visivel = caixa.width > 0 && caixa.bottom > 0 && caixa.top < window.innerHeight;
  const alvoX = visivel ? caixa.left + caixa.width / 2 : window.innerWidth - 44;
  const alvoY = visivel ? caixa.top + caixa.height / 2 : 18;
  const lado = Math.min(de.width, de.height);
  const trilho = document.createElement("div");
  trilho.className = "voo-trilho";
  trilho.style.left = `${de.left + (de.width - lado) / 2}px`;
  trilho.style.top = `${de.top + (de.height - lado) / 2}px`;
  trilho.style.width = `${lado}px`;
  trilho.style.height = `${lado}px`;
  const peca = document.createElement("div");
  peca.className = "voo-peca";
  peca.appendChild(origem.cloneNode(true));
  trilho.appendChild(peca);
  document.body.appendChild(trilho);
  const dx = alvoX - (de.left + de.width / 2);
  const dy = alvoY - (de.top + de.height / 2);
  const escala = Math.max(0.08, 28 / lado);
  const duracao = 720;
  const horizontal = trilho.animate([{ transform: "translateX(0)" }, { transform: `translateX(${dx}px)` }], { duration: duracao, easing: "cubic-bezier(.3,.1,.3,1)", fill: "forwards" });
  peca.animate([
    { transform: "translateY(0) scale(1)", opacity: 1 },
    { transform: `translateY(${Math.min(-40, dy * 0.15)}px) scale(${Math.max(escala, 0.5)})`, opacity: 1, offset: 0.35 },
    { transform: `translateY(${dy}px) scale(${escala})`, opacity: visivel ? 0.6 : 0 },
  ], { duration: duracao, easing: "cubic-bezier(.5,0,.75,.6)", fill: "forwards" });
  return horizontal.finished.then(() => {
    trilho.remove();
    if (visivel) destino.animate([{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(.94)" }, { transform: "scale(1)" }], { duration: 420, easing: "ease-out" });
  }, () => { trilho.remove(); });
}
