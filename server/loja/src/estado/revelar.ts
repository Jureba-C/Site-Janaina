import { useEffect } from "react";

const ALVOS = [
  ".vantagens ul",
  ".secao-topo",
  ".polaroid-tipo",
  ".momentos li",
  ".cartao-produto",
  ".chamada-previa-peca",
  ".chamada-previa-texto",
  ".faixa-ipes .envolve > *",
  ".grade-instagram a",
  ".avaliacao",
  ".secao-produto h2",
  ".sobre-peca > *",
  ".extras > *",
  ".rodape-novidades",
].join(", ");

export function movimentoReduzido(): boolean {
  return typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useRevelar(chave: unknown) {
  useEffect(() => {
    if (movimentoReduzido() || !("IntersectionObserver" in window)) return;
    const dobra = window.innerHeight;
    const alvos = [...document.querySelectorAll<HTMLElement>(ALVOS)].filter(el => { const caixa = el.getBoundingClientRect(); return !el.dataset.entrada && caixa.top > dobra && caixa.left < window.innerWidth && caixa.right > 0; });
    const terminar = (el: HTMLElement) => {
      delete el.dataset.entrada;
      el.style.removeProperty("transition-delay");
    };
    const observador = new IntersectionObserver(entradas => {
      const chegando = entradas.filter(e => e.isIntersecting).map(e => e.target as HTMLElement);
      chegando.forEach((el, i) => {
        observador.unobserve(el);
        el.style.transitionDelay = `${Math.min(i, 6) * 70}ms`;
        el.dataset.entrada = "visivel";
        el.addEventListener("transitionend", () => terminar(el), { once: true });
        window.setTimeout(() => terminar(el), 1400);
      });
    }, { rootMargin: "0px 0px -6% 0px" });
    for (const el of alvos) {
      el.dataset.entrada = "espera";
      observador.observe(el);
    }
    return () => {
      observador.disconnect();
      for (const el of alvos) terminar(el);
    };
  }, [chave]);
}
