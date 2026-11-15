import type { PointerEvent as EventoPonteiro } from "react";

const SVG = "http://www.w3.org/2000/svg";
const RAIOS = 8;

function semMovimento(): boolean {
  return typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function soltarFaiscas(evento: { clientX: number; clientY: number; currentTarget: EventTarget | null }, cor = "#DFA1AC") {
  if (semMovimento()) return;
  let { clientX: x, clientY: y } = evento;
  if (!x && !y && evento.currentTarget instanceof Element) {
    const caixa = evento.currentTarget.getBoundingClientRect();
    x = caixa.left + caixa.width / 2;
    y = caixa.top + caixa.height / 2;
  }
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", "faiscas");
  svg.setAttribute("viewBox", "-40 -40 80 80");
  svg.setAttribute("aria-hidden", "true");
  svg.style.left = `${x}px`;
  svg.style.top = `${y}px`;
  for (let i = 0; i < RAIOS; i++) {
    const grupo = document.createElementNS(SVG, "g");
    grupo.setAttribute("transform", `rotate(${(360 / RAIOS) * i})`);
    const linha = document.createElementNS(SVG, "line");
    linha.setAttribute("x1", "0");
    linha.setAttribute("y1", "-12");
    linha.setAttribute("x2", "0");
    linha.setAttribute("y2", "-20");
    linha.setAttribute("stroke", cor);
    grupo.append(linha);
    svg.append(grupo);
  }
  document.body.append(svg);
  setTimeout(() => svg.remove(), 700);
}

export const inclinacao = {
  onPointerMove(evento: EventoPonteiro<HTMLElement>) {
    if (evento.pointerType !== "mouse" || semMovimento()) return;
    const alvo = evento.currentTarget;
    const caixa = alvo.getBoundingClientRect();
    const x = (evento.clientX - caixa.left) / caixa.width - 0.5;
    const y = (evento.clientY - caixa.top) / caixa.height - 0.5;
    alvo.style.setProperty("--incl-x", `${(-y * 12).toFixed(2)}deg`);
    alvo.style.setProperty("--incl-y", `${(x * 12).toFixed(2)}deg`);
  },
  onPointerLeave(evento: EventoPonteiro<HTMLElement>) {
    evento.currentTarget.style.removeProperty("--incl-x");
    evento.currentTarget.style.removeProperty("--incl-y");
  },
};
