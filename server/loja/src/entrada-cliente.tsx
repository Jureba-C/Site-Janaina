import "./estilos/loja.css";

function depoisDaMaiorPintura(): Promise<void> {
  const carregou = document.readyState === "complete" ? Promise.resolve() : new Promise<void>(pronto => addEventListener("load", () => pronto(), { once: true }));
  const pintou = new Promise<void>(pronto => {
    if (!("PerformanceObserver" in window) || !PerformanceObserver.supportedEntryTypes?.includes("largest-contentful-paint")) return pronto();
    new PerformanceObserver((_, observador) => { observador.disconnect(); pronto(); }).observe({ type: "largest-contentful-paint", buffered: true });
    setTimeout(pronto, 2500);
  });
  return Promise.all([carregou, pintou]).then(() => new Promise<void>(pronto => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if ("requestIdleCallback" in window) requestIdleCallback(() => pronto(), { timeout: 800 });
      else setTimeout(pronto, 120);
    }));
  }));
}

depoisDaMaiorPintura().then(() => import("./iniciar")).then(m => m.iniciar());
