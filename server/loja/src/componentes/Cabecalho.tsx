import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { dinheiro, linkWhatsApp, precoNoPix } from "../compartilhado";
import { carrinho, totalDeItens, useCarrinho } from "../estado/carrinho";
import { useSessao } from "../estado/sessao";
import type { Categoria, Loja, ProdutoResumo } from "../tipos";
import { Foto } from "./Foto";
import { Icone } from "./Icone";
import { Logo } from "./Marca";
import { IlustracaoDaPeca } from "./CartaoProduto";

function FaixaDoTopo({ loja }: { loja: Loja }) {
  return (
    <div className="faixa-topo">
      <span>{`Desconto de ${loja.regrasPagamento.pixDiscountPercent}% no Pix`}</span>
      <span aria-hidden="true" className="faixa-flor">✿</span>
      <span className="faixa-opcional">Personalização inclusa em todos os produtos</span>
      <span aria-hidden="true" className="faixa-flor faixa-opcional">✿</span>
      <span>Enviamos para todo o Brasil</span>
    </div>
  );
}

export function CampoDeBusca({ id, termoInicial = "" }: { id: string; termoInicial?: string }) {
  const [termo, setTermo] = useState(termoInicial);
  const [sugestoes, setSugestoes] = useState<ProdutoResumo[]>([]);
  const [aberta, setAberta] = useState(false);
  const [ativa, setAtiva] = useState(-1);
  const idLista = useId();
  const pedido = useRef(0);

  useEffect(() => {
    const limpo = termo.trim();
    if (limpo.length < 2) { setSugestoes([]); return; }
    const numero = ++pedido.current;
    const espera = setTimeout(async () => {
      try {
        const resposta = await fetch(`/api/busca?q=${encodeURIComponent(limpo)}&limite=6`);
        if (!resposta.ok) return;
        const dados = await resposta.json();
        if (numero === pedido.current) { setSugestoes(dados.produtos || []); setAtiva(-1); }
      } catch {
        setSugestoes([]);
      }
    }, 160);
    return () => clearTimeout(espera);
  }, [termo]);

  const mostrar = aberta && sugestoes.length > 0;

  function aoTeclar(evento: KeyboardEvent<HTMLInputElement>) {
    if (!mostrar) return;
    if (evento.key === "ArrowDown") { evento.preventDefault(); setAtiva(i => Math.min(sugestoes.length - 1, i + 1)); }
    else if (evento.key === "ArrowUp") { evento.preventDefault(); setAtiva(i => Math.max(-1, i - 1)); }
    else if (evento.key === "Escape") { setAberta(false); }
    else if (evento.key === "Enter" && ativa >= 0) { evento.preventDefault(); window.location.href = sugestoes[ativa].endereco; }
  }

  return (
    <form className="busca" role="search" action="/busca" method="get" onSubmit={() => setAberta(false)}>
      <label htmlFor={id} className="visualmente-oculto">Buscar produtos</label>
      <input
        id={id} name="q" type="search" placeholder="O que você procura?" autoComplete="off" value={termo}
        role="combobox" aria-expanded={mostrar} aria-controls={idLista} aria-autocomplete="list"
        aria-activedescendant={ativa >= 0 ? `${idLista}-${ativa}` : undefined}
        onChange={e => { setTermo(e.target.value); setAberta(true); }}
        onFocus={() => setAberta(true)}
        onBlur={() => setTimeout(() => setAberta(false), 150)}
        onKeyDown={aoTeclar}
      />
      <button type="submit" className="busca-botao" aria-label="Buscar"><Icone nome="busca" tamanho={20} traco={1.8} /></button>
      <ul id={idLista} role="listbox" className="busca-sugestoes" hidden={!mostrar} aria-label="Sugestões">
        {sugestoes.map((p, i) => (
          <li key={p.id} id={`${idLista}-${i}`} role="option" aria-selected={i === ativa} className={i === ativa ? "ativa" : undefined}>
            <a href={p.endereco} tabIndex={-1}>
              <span className="busca-miniatura">{p.foto ? <Foto src={p.foto} alt="" sizes="48px" larguras={[160]} largura={48} altura={48} /> : <IlustracaoDaPeca produto={p} rotulo="" />}</span>
              <span className="busca-nome">{p.nome}{p.medida ? <small>{p.medida}</small> : null}</span>
              <span className="busca-preco">{dinheiro(precoNoPix(p.precoMinimo))}<small>no Pix</small></span>
            </a>
          </li>
        ))}
        <li role="option" aria-selected={false} className="busca-todos"><a href={`/busca?q=${encodeURIComponent(termo.trim())}`} tabIndex={-1}>Ver todos os resultados para “{termo.trim()}”</a></li>
      </ul>
    </form>
  );
}

function MenuDeCategorias({ categorias, caminho }: { categorias: Categoria[]; caminho: string }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const raiz = useRef<HTMLElement>(null);
  const tipos = categorias.filter(c => c.grupo === "tipo" && c.quantidade > 0);
  const ocasioes = categorias.filter(c => c.grupo === "ocasiao" && c.quantidade > 0);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(null); };
    const esc = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") setAberto(null); };
    document.addEventListener("click", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("click", fora); document.removeEventListener("keydown", esc); };
  }, [aberto]);

  const atual = (slug: string) => (caminho === `/categoria/${slug}` ? "page" : undefined);

  return (
    <nav className="menu-categorias" aria-label="Categorias" ref={raiz}>
      <ul className="menu-lista">
        <li className="menu-item">
          <a href="/busca" className="menu-link menu-todas" aria-expanded={aberto === "todas"} aria-haspopup="true"
            onClick={e => { e.preventDefault(); setAberto(aberto === "todas" ? null : "todas"); }}>
            <Icone nome="menu" tamanho={18} traco={1.8} />Todas as categorias
          </a>
          {aberto === "todas" ? (
            <div className="submenu submenu-largo">
              <div>
                <p className="submenu-titulo">Por tipo</p>
                <ul>{tipos.map(c => <li key={c.slug}><a href={`/categoria/${c.slug}`} aria-current={atual(c.slug)}>{c.nome}</a></li>)}</ul>
              </div>
              <div>
                <p className="submenu-titulo">Por momento</p>
                <ul>{ocasioes.map(c => <li key={c.slug}><a href={`/categoria/${c.slug}`} aria-current={atual(c.slug)}>{c.nome}</a></li>)}</ul>
              </div>
              <a className="submenu-tudo" href="/busca">Ver todos os produtos</a>
            </div>
          ) : null}
        </li>
        <li className="menu-item">
          <button type="button" className="menu-link" aria-expanded={aberto === "ocasiao"} onClick={() => setAberto(aberto === "ocasiao" ? null : "ocasiao")}>
            Por ocasião<Icone nome="seta" tamanho={14} traco={2} />
          </button>
          {aberto === "ocasiao" ? (
            <div className="submenu">
              <ul>{ocasioes.map(c => <li key={c.slug}><a href={`/categoria/${c.slug}`} aria-current={atual(c.slug)}>{c.nome}</a></li>)}</ul>
            </div>
          ) : null}
        </li>
        {tipos.slice(0, 6).map(c => (
          <li key={c.slug} className="menu-item"><a className="menu-link" href={`/categoria/${c.slug}`} aria-current={atual(c.slug)}>{c.nome}</a></li>
        ))}
      </ul>
    </nav>
  );
}

function Gaveta({ loja, aberta, fechar }: { loja: Loja; aberta: boolean; fechar: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { usuario } = useSessao();
  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberta && !dialogo.open) dialogo.showModal();
    if (!aberta && dialogo.open) dialogo.close();
  }, [aberta]);
  const tipos = loja.categorias.filter(c => c.grupo === "tipo" && c.quantidade > 0);
  const ocasioes = loja.categorias.filter(c => c.grupo === "ocasiao" && c.quantidade > 0);
  return (
    <dialog className="gaveta gaveta-esquerda" ref={ref} aria-label="Menu" onClose={fechar} onClick={e => { if (e.target === ref.current) fechar(); }}>
      <div className="gaveta-conteudo">
        <div className="gaveta-topo">
          <Logo compacto />
          <button type="button" className="botao-icone" onClick={fechar} aria-label="Fechar menu"><Icone nome="fechar" /></button>
        </div>
        <a className="gaveta-conta" href={usuario ? "/pedidos.html" : "/conta.html"}>
          <Icone nome="pessoa" />{usuario ? `Olá, ${usuario.primeiroNome} · Minha conta` : "Entrar ou cadastrar"}
        </a>
        <p className="gaveta-titulo">Por tipo</p>
        <ul className="gaveta-lista">{tipos.map(c => <li key={c.slug}><a href={`/categoria/${c.slug}`}>{c.nome}<span>{c.quantidade}</span></a></li>)}</ul>
        <p className="gaveta-titulo">Por ocasião</p>
        <ul className="gaveta-lista">{ocasioes.map(c => <li key={c.slug}><a href={`/categoria/${c.slug}`}>{c.nome}<span>{c.quantidade}</span></a></li>)}</ul>
        <ul className="gaveta-lista gaveta-ajuda">
          <li><a href="/acompanhar-pedido.html">Acompanhar pedido</a></li>
          <li><a href="/politica.html">Trocas e privacidade</a></li>
        </ul>
        <a className="botao botao-whatsapp botao-bloco" href={linkWhatsApp(loja.whatsapp)} target="_blank" rel="noopener noreferrer"><Icone nome="whatsapp" />Falar com a {loja.responsavel}</a>
      </div>
    </dialog>
  );
}

export function Cabecalho({ loja, caminho, termo }: { loja: Loja; caminho: string; termo?: string }) {
  const { linhas, aberto: carrinhoAberto } = useCarrinho();
  const { usuario } = useSessao();
  const [gaveta, setGaveta] = useState(false);
  const itens = totalDeItens(linhas);
  const [pulou, setPulou] = useState(false);
  const anteriores = useRef<number | null>(null);
  useEffect(() => {
    const antes = anteriores.current;
    anteriores.current = itens;
    if (antes !== null && itens > antes && carrinhoAberto) setPulou(true);
  }, [itens, carrinhoAberto]);
  const tipos = loja.categorias.filter(c => c.grupo === "tipo" && c.quantidade > 0);
  return (
    <>
      <a className="pular-para-conteudo" href="#conteudo">Pular para o conteúdo</a>
      <FaixaDoTopo loja={loja} />
      <header className="cabecalho">
        <div className="cabecalho-grade">
          <button type="button" className="botao-icone so-celular" onClick={() => setGaveta(true)} aria-label="Abrir menu"><Icone nome="menuCurto" /></button>
          <div className="cabecalho-busca so-computador"><CampoDeBusca id="busca-topo" termoInicial={termo} /></div>
          <a className="cabecalho-logo" href="/" title={`${loja.nome}, página inicial`}><Logo /></a>
          <div className="cabecalho-atalhos">
            <a className="atalho so-computador" href={linkWhatsApp(loja.whatsapp)} target="_blank" rel="noopener noreferrer">
              <Icone nome="whatsapp" tamanho={26} traco={1.6} />
              <span>Atendimento<strong>{loja.whatsappFormatado}</strong></span>
            </a>
            <a className="atalho so-computador" href={usuario ? "/pedidos.html" : "/conta.html"}>
              <Icone nome="pessoa" tamanho={26} traco={1.6} />
              <span>{usuario ? `Olá, ${usuario.primeiroNome}!` : "Olá!"}<strong>{usuario ? "Minha conta" : "Entrar ou cadastrar"}</strong></span>
            </a>
            <button type="button" className="botao-carrinho" onClick={() => carrinho.abrir()} aria-label={`Carrinho, ${itens} ${itens === 1 ? "item" : "itens"}`}>
              <Icone nome="sacola" tamanho={24} />
              {itens > 0 ? <span key={itens} className={`contador${pulou ? " pula" : ""}`} aria-hidden="true">{itens}</span> : null}
            </button>
          </div>
        </div>
        <div className="so-celular cabecalho-busca-celular"><CampoDeBusca id="busca-celular" termoInicial={termo} /></div>
        <div className="so-computador"><MenuDeCategorias categorias={loja.categorias} caminho={caminho} /></div>
        <nav className="chips-categorias so-celular" aria-label="Categorias">
          {tipos.map(c => <a key={c.slug} href={`/categoria/${c.slug}`} aria-current={caminho === `/categoria/${c.slug}` ? "page" : undefined}>{c.nome}</a>)}
        </nav>
      </header>
      <Gaveta loja={loja} aberta={gaveta} fechar={() => setGaveta(false)} />
    </>
  );
}
