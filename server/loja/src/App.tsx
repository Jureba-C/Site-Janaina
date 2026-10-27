import { AvisoCookies } from "./componentes/AvisoCookies";
import { Cabecalho } from "./componentes/Cabecalho";
import { Carrinho } from "./componentes/Carrinho";
import { Rodape, WhatsAppFlutuante } from "./componentes/Rodape";
import { Busca } from "./paginas/Busca";
import { Categoria } from "./paginas/Categoria";
import { Inicio } from "./paginas/Inicio";
import { Produto } from "./paginas/Produto";
import { useRevelar } from "./estado/revelar";
import type { DadosDaPagina } from "./tipos";

export function App({ dados }: { dados: DadosDaPagina }) {
  const { loja, pagina, caminho } = dados;
  useRevelar(caminho);
  return (
    <>
      <Cabecalho loja={loja} caminho={caminho} termo={pagina.tipo === "busca" ? pagina.termo : undefined} />
      <main id="conteudo" tabIndex={-1}>
        {pagina.tipo === "inicio" ? <Inicio pagina={pagina} loja={loja} /> : null}
        {pagina.tipo === "categoria" ? <Categoria pagina={pagina} /> : null}
        {pagina.tipo === "busca" ? <Busca pagina={pagina} /> : null}
        {pagina.tipo === "produto" ? <Produto pagina={pagina} loja={loja} /> : null}
      </main>
      <Rodape loja={loja} />
      <WhatsAppFlutuante loja={loja} />
      <Carrinho loja={loja} />
      <AvisoCookies />
    </>
  );
}
