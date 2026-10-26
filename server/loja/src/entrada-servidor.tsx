import { renderToString } from "react-dom/server";
import { App } from "./App";
import type { DadosDaPagina } from "./tipos";

export function renderizarPagina(dados: DadosDaPagina): string {
  return renderToString(<App dados={dados} />);
}
