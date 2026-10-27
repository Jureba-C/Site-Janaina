import "./estilos/loja.css";

const EVENTOS_DE_PRESSA = ["pointerdown", "keydown", "touchstart", "focusin"] as const;
let cliquePendente: HTMLElement | null = null;

function guardarClique(evento: MouseEvent) {
  const alvo = (evento.target as Element | null)?.closest("button, [role=tab], [role=button]");
  if (alvo instanceof HTMLElement && !(alvo instanceof HTMLButtonElement && alvo.type === "submit")) cliquePendente = alvo;
}

function quandoForPreciso(): Promise<void> {
  const carregou = document.readyState === "complete" ? Promise.resolve() : new Promise<void>(pronto => addEventListener("load", () => pronto(), { once: true }));
  const pintou = new Promise<void>(pronto => {
    if (!("PerformanceObserver" in window) || !PerformanceObserver.supportedEntryTypes?.includes("largest-contentful-paint")) return pronto();
    new PerformanceObserver((_, observador) => { observador.disconnect(); pronto(); }).observe({ type: "largest-contentful-paint", buffered: true });
    setTimeout(pronto, 2500);
  });
  const depoisDaPintura = Promise.all([carregou, pintou]).then(() => new Promise<void>(pronto => {
    requestAnimationFrame(() => setTimeout(pronto, 0));
  }));
  const comPressa = new Promise<void>(pronto => {
    for (const nome of EVENTOS_DE_PRESSA) addEventListener(nome, () => pronto(), { once: true, passive: true, capture: true });
  });
  return Promise.race([depoisDaPintura, comPressa]);
}

addEventListener("click", guardarClique, { capture: true });

quandoForPreciso()
  .then(() => import("./iniciar"))
  .then(m => {
    m.iniciar();
    removeEventListener("click", guardarClique, { capture: true });
    const alvo = cliquePendente;
    cliquePendente = null;
    if (alvo?.isConnected) setTimeout(() => alvo.click(), 0);
  });
