import { CartaoProduto } from "../componentes/CartaoProduto";
import { Icone } from "../componentes/Icone";
import type { PaginaCategoria } from "../tipos";

const ORDENS = [
  { id: "destaque", nome: "Destaques" },
  { id: "menor-preco", nome: "Menor preço" },
  { id: "maior-preco", nome: "Maior preço" },
  { id: "nome", nome: "Nome (A–Z)" },
];

const FAIXAS = [
  { id: "", nome: "Qualquer preço" },
  { id: "0-40", nome: "Até R$ 40" },
  { id: "40-70", nome: "R$ 40 a R$ 70" },
  { id: "70-120", nome: "R$ 70 a R$ 120" },
  { id: "120-", nome: "Acima de R$ 120" },
];

function enderecoDaPagina(slug: string, filtros: PaginaCategoria["filtros"], pagina: number): string {
  const params = new URLSearchParams();
  if (filtros.outra) params.set("outra", filtros.outra);
  if (filtros.preco) params.set("preco", filtros.preco);
  if (filtros.ordem && filtros.ordem !== "destaque") params.set("ordem", filtros.ordem);
  if (pagina > 1) params.set("pagina", String(pagina));
  const texto = params.toString();
  return `/categoria/${slug}${texto ? `?${texto}` : ""}`;
}

export function Categoria({ pagina }: { pagina: PaginaCategoria }) {
  const { categoria, filtros } = pagina;
  const outroGrupo = pagina.outras.filter(c => c.grupo !== categoria.grupo);
  return (
    <div className="envolve pagina-lista">
      <nav className="trilha" aria-label="Você está em">
        <a href="/">Início</a><span aria-hidden="true">›</span><span aria-current="page">{categoria.nome}</span>
      </nav>
      <div className="lista-topo">
        <div>
          <p className="sobretitulo">{categoria.grupo === "ocasiao" ? "Presentes para" : "Categoria"}</p>
          <h1>{categoria.nome}</h1>
          <p className="lista-contagem" role="status">{pagina.total === 1 ? "1 produto" : `${pagina.total} produtos`}</p>
        </div>
        <form className="filtros" method="get" action={`/categoria/${categoria.slug}`}>
          <div className="campo">
            <label htmlFor="filtro-outra">{categoria.grupo === "ocasiao" ? "Tipo" : "Ocasião"}</label>
            <select id="filtro-outra" name="outra" defaultValue={filtros.outra} onChange={e => e.currentTarget.form?.requestSubmit()}>
              <option value="">Todos</option>
              {outroGrupo.map(c => <option key={c.slug} value={c.slug}>{c.nome}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="filtro-preco">Preço</label>
            <select id="filtro-preco" name="preco" defaultValue={filtros.preco} onChange={e => e.currentTarget.form?.requestSubmit()}>
              {FAIXAS.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="filtro-ordem">Ordenar</label>
            <select id="filtro-ordem" name="ordem" defaultValue={filtros.ordem} onChange={e => e.currentTarget.form?.requestSubmit()}>
              {ORDENS.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
          <noscript><button type="submit" className="botao botao-vazado">Filtrar</button></noscript>
        </form>
      </div>
      <h2 className="visualmente-oculto">Produtos</h2>
      {pagina.produtos.length ? (
        <div className="grade-produtos">
          {pagina.produtos.map((p, i) => <CartaoProduto key={p.id} produto={p} prioridade={i < 2} />)}
        </div>
      ) : (
        <div className="vazio">
          <Icone nome="filtro" tamanho={32} />
          <p>Nenhum produto com esses filtros.</p>
          <a className="botao botao-vazado" href={`/categoria/${categoria.slug}`}>Limpar filtros</a>
        </div>
      )}
      {pagina.paginas > 1 ? (
        <nav className="paginacao" aria-label="Páginas">
          {pagina.pagina > 1 ? <a href={enderecoDaPagina(categoria.slug, filtros, pagina.pagina - 1)} rel="prev"><Icone nome="setaEsquerda" tamanho={18} />Anterior</a> : <span />}
          <span>Página {pagina.pagina} de {pagina.paginas}</span>
          {pagina.pagina < pagina.paginas ? <a href={enderecoDaPagina(categoria.slug, filtros, pagina.pagina + 1)} rel="next">Próxima<Icone nome="setaDireita" tamanho={18} /></a> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
