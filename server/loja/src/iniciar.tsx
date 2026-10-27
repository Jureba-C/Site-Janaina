import { hydrateRoot } from "react-dom/client";
import { App } from "./App";
import type { DadosDaPagina } from "./tipos";

export function iniciar() {
  const elemento = document.getElementById("dados-da-pagina");
  const raiz = document.getElementById("loja");
  if (!elemento || !raiz) return;
  const dados = JSON.parse(elemento.textContent || "{}") as DadosDaPagina;
  hydrateRoot(raiz, <App dados={dados} />);
}
