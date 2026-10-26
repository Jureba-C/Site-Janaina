import { hydrateRoot } from "react-dom/client";
import { App } from "./App";
import type { DadosDaPagina } from "./tipos";
import "./estilos/loja.css";

const elemento = document.getElementById("dados-da-pagina");
const raiz = document.getElementById("loja");

if (elemento && raiz) {
  const dados = JSON.parse(elemento.textContent || "{}") as DadosDaPagina;
  hydrateRoot(raiz, <App dados={dados} />);
}
