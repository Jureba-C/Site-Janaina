import { useEffect, useState } from "react";
import { CartaoProduto } from "../componentes/CartaoProduto";
import { Icone } from "../componentes/Icone";
import { useFavoritos } from "../estado/favoritos";
import type { PaginaBusca, ProdutoResumo } from "../tipos";

function Favoritos() {
  const { favoritos } = useFavoritos();
  const [produtos, setProdutos] = useState<ProdutoResumo[] | null>(null);
  useEffect(() => {
    if (!favoritos.length) { setProdutos([]); return; }
    fetch(`/api/busca?ids=${favoritos.join(",")}`)
      .then(r => (r.ok ? r.json() : { produtos: [] }))
      .then(d => setProdutos(d.produtos || []))
      .catch(() => setProdutos([]));
  }, [favoritos]);
  if (produtos === null) return <p className="lista-contagem">Carregando seus favoritos…</p>;
  if (!produtos.length) return <div className="vazio"><Icone nome="coracao" tamanho={32} /><p>Você ainda não favoritou nada. Toque no coração de um produto para guardar aqui.</p></div>;
  return <div className="grade-produtos">{produtos.map(p => <CartaoProduto key={p.id} produto={p} />)}</div>;
}

export function Busca({ pagina }: { pagina: PaginaBusca }) {
  const favoritos = pagina.favoritos;
  return (
    <div className="envolve pagina-lista">
      <nav className="trilha" aria-label="Você está em">
        <a href="/">Início</a><span aria-hidden="true">›</span><span aria-current="page">{pagina.termo ? "Busca" : "Todos os produtos"}</span>
      </nav>
      <div className="lista-topo">
        <div>
          <p className="sobretitulo">{favoritos ? "Guardados por você" : pagina.termo ? "Resultados para" : "Catálogo"}</p>
          <h1>{favoritos ? "Favoritos" : pagina.termo ? `“${pagina.termo}”` : "Todos os produtos"}</h1>
          {favoritos ? null : <p className="lista-contagem" role="status">{pagina.produtos.length === 1 ? "1 produto" : `${pagina.produtos.length} produtos`}</p>}
        </div>
      </div>
      <h2 className="visualmente-oculto">Produtos</h2>
      {favoritos ? <Favoritos /> : pagina.produtos.length ? (
        <div className="grade-produtos">
          {pagina.produtos.map((p, i) => <CartaoProduto key={p.id} produto={p} prioridade={i < 2} />)}
        </div>
      ) : (
        <div className="vazio">
          <Icone nome="busca" tamanho={32} />
          <p>Não achamos nada com “{pagina.termo}”. Tente outra palavra, como “caneca”, “xícara” ou “garrafa”.</p>
          <a className="botao botao-vazado" href="/busca">Ver todos os produtos</a>
        </div>
      )}
    </div>
  );
}
