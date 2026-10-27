import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { App } from "./App";
import { Arte, PecaSvg, coresDaPeca, usarMedidorDoServidor, type Lado, type MedidorDeTexto } from "./componentes/Previa";
import type { ConfigProduto, DadosDaPagina, Escolhas, EstampaPublica, FotoEnviada } from "./tipos";

export function renderizarPagina(dados: DadosDaPagina): string {
  return renderToString(<App dados={dados} />);
}

interface PedidoDeSvg {
  config: ConfigProduto;
  escolhas: Escolhas;
  lado: Lado;
  fotos: Record<string, string>;
  estilo: string;
  estampa?: EstampaPublica | null;
  medidor?: MedidorDeTexto | null;
}

function comMedidor<T>(medidor: MedidorDeTexto | null | undefined, desenhar: () => T): T {
  usarMedidorDoServidor(medidor ?? null);
  try {
    return desenhar();
  } finally {
    usarMedidorDoServidor(null);
  }
}

const ARTE_POR_MOLDE: Record<string, { largura: number; altura: number }> = {
  caneca: { largura: 189, altura: 194 },
  xicara: { largura: 184, altura: 98 },
  garrafa: { largura: 121, altura: 168 },
  copo: { largura: 134, altura: 146 },
  azulejo: { largura: 186, altura: 214 },
  plano: { largura: 240, altura: 170 },
  botton: { largura: 190, altura: 190 },
  caixa: { largura: 150, altura: 120 },
};

function urlDe(fotos: Record<string, string>) {
  return (foto: FotoEnviada) => fotos[foto.id] ?? null;
}

export function renderizarSvgDaPeca({ config, escolhas, lado, fotos, estilo, estampa, medidor }: PedidoDeSvg): string {
  const corpo = comMedidor(medidor, () => renderToStaticMarkup(
    <PecaSvg config={config} escolhas={escolhas} lado={lado} aquecida urlDaFoto={urlDe(fotos)} medir={false} exemplos={false} estampa={estampa ?? null} />,
  ));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 380" width="720" height="760"><style>${estilo}</style><rect width="360" height="380" fill="#F6E1DE"/>${corpo}</svg>`;
}

export function renderizarSvgDaArte({ config, escolhas, lado, fotos, estilo, medidor }: PedidoDeSvg): string {
  const area = config.molde === "foto" && config.moldeFoto?.area
    ? { largura: config.moldeFoto.area.w * 360, altura: config.moldeFoto.area.h * 380 }
    : ARTE_POR_MOLDE[config.molde] ?? ARTE_POR_MOLDE.caneca;
  const tinta = coresDaPeca(config, escolhas, true).tinta === "#F6F1EA" ? "#F6F1EA" : "#2E2A28";
  const corpo = comMedidor(medidor, () => renderToStaticMarkup(
    <Arte config={config} escolhas={escolhas} lado={lado} largura={area.largura} altura={area.altura} tinta={tinta} urlDaFoto={urlDe(fotos)} medir={false} idBase={`arte-${lado}`} exemplos={false} />,
  ));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-area.largura / 2} ${-area.altura / 2} ${area.largura} ${area.altura}" width="${area.largura}" height="${area.altura}"><style>${estilo}</style>${corpo}</svg>`;
}
