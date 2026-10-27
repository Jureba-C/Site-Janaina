import { useState } from "react";
import { dinheiro, parcelas, precoNoPix } from "../compartilhado";
import type { ConfigProduto, ProdutoResumo } from "../tipos";
import { Foto } from "./Foto";
import { Icone } from "./Icone";
import { PecaSvg } from "./Previa";
import { useFavoritos } from "../estado/favoritos";

export function configDeVitrine(p: Pick<ProdutoResumo, "molde" | "corPeca" | "corAlca" | "magica" | "formato">): ConfigProduto {
  return {
    categorias: [], medida: "", codigo: "", cuidados: "", aviso: null,
    molde: p.molde, formato: p.formato, corPeca: p.corPeca, corAlca: p.corAlca, magica: p.magica,
    moldeFoto: null, variacoes: [], adicionais: [], faixas: [], qtdMinima: 1,
    personalizacao: { ativa: true, campos: {}, letras: ["cursiva"], artes: ["flor"], fotos: { min: 0, max: 0, formato: "circulo" }, verso: false },
  };
}

export function IlustracaoDaPeca({ produto, rotulo }: { produto: ProdutoResumo; rotulo: string }) {
  const config = configDeVitrine(produto);
  return (
    <svg className="ilustracao-peca" viewBox="0 0 360 380" role="img" aria-label={rotulo}>
      <PecaSvg config={config} escolhas={{ variacoes: {}, adicionais: [], personalizacao: { arte: "flor", letra: "cursiva" } }} lado="frente" aquecida={false} urlDaFoto={() => null} medir={false} exemplos={false} fatias={12} />
    </svg>
  );
}

export function CartaoProduto({ produto, prioridade = false }: { produto: ProdutoResumo; prioridade?: boolean }) {
  const { favoritos, alternar } = useFavoritos();
  const [pulso, setPulso] = useState(0);
  const favorito = favoritos.includes(produto.id);
  const pix = precoNoPix(produto.precoMinimo);
  const selo = produto.esgotado ? "Esgotado" : produto.aviso === "ultimas" ? "Últimas unidades" : produto.selos[0];
  return (
    <article className={`cartao-produto${produto.esgotado ? " esgotado" : ""}`}>
      <a className="cartao-produto-foto" href={produto.endereco} tabIndex={-1} aria-hidden="true">
        {produto.foto ? (
          <Foto src={produto.foto} alt="" sizes="(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 290px" prioridade={prioridade} />
        ) : (
          <IlustracaoDaPeca produto={produto} rotulo="" />
        )}
      </a>
      {selo ? <span className={`selo${produto.esgotado ? " selo-esgotado" : ""}`}>{selo}</span> : null}
      <button type="button" className={`botao-favorito${favorito ? " ativo" : ""}`} aria-pressed={favorito} aria-label={favorito ? `Tirar ${produto.nome} dos favoritos` : `Favoritar ${produto.nome}`} onClick={() => { if (!favorito) setPulso(p => p + 1); alternar(produto.id); }}>
        <span key={pulso} className={pulso ? "coracao-pulsa" : undefined}><Icone nome="coracao" tamanho={20} /></span>
      </button>
      <div className="cartao-produto-corpo">
        <h3 className="cartao-produto-nome"><a href={produto.endereco}>{produto.nome}</a></h3>
        {produto.medida ? <p className="cartao-produto-medida">{produto.medida}</p> : null}
        <p className="cartao-produto-pix">
          {produto.aPartirDe ? <span className="a-partir">a partir de</span> : null}
          <strong>{dinheiro(pix)}</strong> <span>no Pix</span>
        </p>
        <p className="cartao-produto-cartao">{dinheiro(produto.precoMinimo)} ou {parcelas(produto.precoMinimo)}</p>
        <a className="botao botao-cheio botao-bloco cartao-produto-acao" href={produto.endereco}>
          <Icone nome={produto.personalizavel ? "lapis" : "sacola"} tamanho={18} traco={1.8} />
          {produto.esgotado ? "Ver detalhes" : produto.personalizavel ? "Personalizar" : "Ver produto"}
          <span className="visualmente-oculto"> {produto.nome}</span>
        </a>
      </div>
    </article>
  );
}
