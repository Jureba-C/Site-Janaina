import { useEffect, useId, useRef, useState } from "react";
import { linkWhatsApp } from "../compartilhado";
import { CartaoProduto } from "../componentes/CartaoProduto";
import { Foto } from "../componentes/Foto";
import { BordaRasgada, Folhas, RamoDeIpe, recorteCirculo } from "../componentes/Enfeites";
import { Florzinha } from "../componentes/Marca";
import { Icone } from "../componentes/Icone";
import { DemoEstudio } from "../componentes/DemoDaCaneca";
import type { Loja, PaginaInicio } from "../tipos";

const GIROS = [-2, 1.5, -1, 2, -1.5];

const MOMENTOS: { nome: string; slug: string; d: string }[] = [
  { nome: "Casamento", slug: "casamento", d: "M4 14a5 5 0 1 0 10 0a5 5 0 1 0 -10 0M10 14a5 5 0 1 0 10 0a5 5 0 1 0 -10 0M9 6l1.5-2.5h3L15 6" },
  { nome: "Padrinhos", slug: "padrinhos", d: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" },
  { nome: "Dia das Mães", slug: "dia-das-maes", d: "M12 21v-8M7 5c0 4 2 7 5 8 3-1 5-4 5-8l-2.5 2L12 4 9.5 7zM12 17c-2 0-4-1-5-3M12 18c2 0 4-1 5-3" },
  { nome: "Dia dos Pais", slug: "dia-dos-pais", d: "M5 9h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM16 11h1.5a2.5 2.5 0 0 1 0 5H16M8.5 3.5v3M12.5 3.5v3" },
  { nome: "Professores", slug: "professores", d: "M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z" },
  { nome: "Empresas", slug: "empresas", d: "M3 8h18v11H3zM9 8V5h6v3M3 13h18" },
  { nome: "Aniversário", slug: "aniversario", d: "M4 21h16M5 21v-8h14v8M5 16c2 1 3-1 4.7 0s3 1 4.6 0 3-1 4.7 0M12 13V9M12 6.5V6" },
  { nome: "Brasília", slug: "brasilia", d: "M3 20h18M7 20c1-6 3-11 5-15M17 20c-1-6-3-11-5-15M9.5 20c.7-5 1.5-9 2.5-15M14.5 20c-.7-5-1.5-9-2.5-15M12 5V2.5" },
];

const INSTAGRAM = [
  { img: "/img/provisorias/caneca-rostinhos.jpg", alt: "Caneca com rostinhos para o Dia dos Pais" },
  { img: "/img/provisorias/xicaras-casamento.jpg", alt: "Xícaras de casamento" },
  { img: "/img/provisorias/xicara-catedral.jpg", alt: "Xícara com a Catedral de Brasília" },
  { img: "/img/provisorias/caneca-caixa-presente.jpg", alt: "Caneca e caixa de presente" },
  { img: "/img/provisorias/garrafa-professores.jpg", alt: "Garrafa para professores" },
  { img: "/img/provisorias/ipe-amarelo.jpg", alt: "Ipê amarelo" },
];

const FUNDOS_DO_BANNER = ["#F4E9DD", "#F6E1DE", "#EFE2D3", "#F1E6DA", "#F6E1DE"];

const FLORES_DO_BANNER = ["#DFA1AC", "#CD7031", "#E9B824", "#DFA1AC"];

function SeloFeitoAMao() {
  const id = `selo-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg className="banner-selo" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <defs><path id={id} d="M60 60m-42 0a42 42 0 1 1 84 0a42 42 0 1 1 -84 0" /></defs>
      <circle cx="60" cy="60" r="58" fill="#FFFCF8" />
      <circle cx="60" cy="60" r="53" fill="none" stroke="#9E4A18" strokeWidth="1.2" strokeDasharray="3 3" />
      <text fontSize="11" fontWeight="600" letterSpacing="1.5" fill="#9E4A18"><textPath href={`#${id}`} textLength="258">FEITO À MÃO · EM BRASÍLIA ·</textPath></text>
      <g transform="translate(44 44)"><Florzinha tamanho={32} cor="#CD7031" traco={1.4} /></g>
    </svg>
  );
}

function BannerDoTopo({ pagina }: { pagina: PaginaInicio }) {
  const slides = pagina.destaques;
  const total = slides.length;
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const inicioDoToque = useRef<number | null>(null);
  useEffect(() => {
    if (pausado || total < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const relogio = setInterval(() => {
      if (!document.hidden) setAtual(i => (i + 1) % total);
    }, 5000);
    return () => clearInterval(relogio);
  }, [pausado, total, atual]);
  const ir = (i: number) => setAtual((i + total) % total);
  return (
    <section
      className="banner envolve"
      aria-roledescription="carrossel"
      aria-label="Destaques da loja"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onTouchStart={e => { inicioDoToque.current = e.touches[0].clientX; setPausado(true); }}
      onTouchEnd={e => {
        const dx = e.changedTouches[0].clientX - (inicioDoToque.current ?? e.changedTouches[0].clientX);
        if (Math.abs(dx) > 40) ir(atual + (dx < 0 ? 1 : -1));
        inicioDoToque.current = null;
        setPausado(false);
      }}
    >
      <h1 className="visualmente-oculto">Arte Canecas: presentes que marcam, feitos à mão em Brasília</h1>
      <div className="banner-vista">
        <div className="banner-trilho" style={{ transform: `translateX(-${atual * 100}%)` }}>
          {slides.map((s, i) => (
            <article
              key={s.src}
              className={`banner-slide${i === atual ? " ativo" : ""}`}
              style={{ ["--fundo" as string]: FUNDOS_DO_BANNER[i % FUNDOS_DO_BANNER.length] }}
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${total}`}
              aria-hidden={i !== atual}
            >
              <div className="banner-texto">
                <h2 className="banner-titulo">{s.titulo || s.legenda}</h2>
                {s.frase ? <p className="cursiva banner-frase">{s.frase}</p> : null}
                <a className="botao botao-cheio banner-botao" href={s.link || "/categoria/canecas"} tabIndex={i === atual ? 0 : -1}>
                  {s.botao || "Ver mais"}<Icone nome="setaDireita" tamanho={18} traco={2} />
                </a>
              </div>
              <div className="banner-colagem">
                <span className="banner-arco" aria-hidden="true" />
                <RamoDeIpe className="banner-ramo" />
                <Folhas className="banner-folhas" />
                <figure className="banner-polaroide" style={{ ["--giro" as string]: `${GIROS[i % GIROS.length] * 1.6}deg` }}>
                  <span className="banner-fita" aria-hidden="true" />
                  <Foto src={s.src} alt={s.alt} sizes="(max-width: 760px) 140px, 296px" prioridade={i === 0} largura={296} altura={300} className="banner-imagem" />
                  <figcaption className="cursiva">{s.legenda}</figcaption>
                </figure>
                <SeloFeitoAMao />
              </div>
              {FLORES_DO_BANNER.map((cor, k) => (
                <span key={k} className={`banner-flor banner-flor-${k + 1}`} aria-hidden="true"><Florzinha tamanho={28} cor={cor} traco={1.3} /></span>
              ))}
            </article>
          ))}
        </div>
        {total > 1 ? (
          <>
            <button type="button" className="banner-seta banner-seta-antes" onClick={() => ir(atual - 1)} aria-label="Destaque anterior"><Icone nome="setaEsquerda" tamanho={20} traco={2} /></button>
            <button type="button" className="banner-seta banner-seta-depois" onClick={() => ir(atual + 1)} aria-label="Próximo destaque"><Icone nome="setaDireita" tamanho={20} traco={2} /></button>
            <div className="banner-pontos">
              {slides.map((s, i) => (
                <button key={s.src} type="button" className={i === atual ? "ativo" : undefined} aria-label={`Destaque ${i + 1} de ${total}`} aria-current={i === atual} onClick={() => ir(i)} />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

function Vantagens({ loja }: { loja: Loja }) {
  const itens = [
    { t: "Valor especial", s: "acima de 10 unidades", tc: "Valor especial", sc: "acima de 10 unidades", icone: "caixas" as const, href: linkWhatsApp(loja.whatsapp, "Olá! Quero saber o valor para mais de 10 unidades.") },
    { t: "Enviamos para todo o Brasil", s: loja.retirada ? "ou retire na Asa Norte" : "pelo Melhor Envio", tc: "Todo o Brasil", sc: loja.retirada ? "ou retire na Asa Norte" : "pelo Melhor Envio", icone: "caminhao" as const },
    { t: "Parcelamos em até 3x", s: `ou ${loja.regrasPagamento.pixDiscountPercent}% de desconto no Pix`, tc: "Até 3x sem juros", sc: `ou ${loja.regrasPagamento.pixDiscountPercent}% a menos no Pix`, icone: "cartao" as const },
    { t: "Dúvida com o pedido?", s: "chame no WhatsApp", tc: "Dúvidas?", sc: "chame no WhatsApp", icone: "whatsapp" as const, href: linkWhatsApp(loja.whatsapp, "Olá! Tenho uma dúvida sobre o meu pedido.") },
  ];
  return (
    <section className="vantagens envolve" aria-label="Vantagens">
      <ul>
        {itens.map(v => {
          const miolo = (
            <>
              <span className="vantagem-icone"><Icone nome={v.icone} tamanho={34} traco={1.4} /></span>
              <span className="vantagem-texto">
                <strong><span className="vantagem-longa">{v.t}</span><span className="vantagem-curta">{v.tc}</span></strong>
                <small><span className="vantagem-longa">{v.s}</span><span className="vantagem-curta">{v.sc}</span></small>
              </span>
            </>
          );
          return (
            <li key={v.t}>
              {v.href ? <a className="vantagem-link" href={v.href} target="_blank" rel="noopener noreferrer">{miolo}</a> : <span className="vantagem-link">{miolo}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Vitrine({ pagina }: { pagina: PaginaInicio }) {
  const vitrines = pagina.vitrines.filter(v => v.produtos.length > 0);
  const [aba, setAba] = useState(vitrines[0]?.id ?? "");
  const atual = vitrines.find(v => v.id === aba) ?? vitrines[0];
  if (!atual) return null;
  return (
    <section className="secao envolve" aria-labelledby="mais-pedidas">
      <div className="secao-topo secao-topo-lado">
        <div>
          <p className="cursiva sobre-titulo">as queridinhas<RamoDeIpe className="floreio" /></p>
          <h2 id="mais-pedidas">{atual.nome}</h2>
        </div>
        <div role="tablist" aria-label="Vitrines" className="abas">
          {vitrines.map(v => (
            <button key={v.id} type="button" role="tab" id={`aba-${v.id}`} aria-selected={v.id === atual.id} aria-controls="vitrine-painel" className={v.id === atual.id ? "ativa" : undefined} onClick={() => setAba(v.id)}>{v.nome}</button>
          ))}
        </div>
      </div>
      <div className="grade-produtos vitrine-trilho" role="tabpanel" id="vitrine-painel" aria-labelledby={`aba-${atual.id}`}>
        {atual.produtos.map(p => <CartaoProduto key={p.id} produto={p} />)}
        <a className="cartao-ver-todos" href="/busca">
          <span>Ver todos os produtos</span>
          <Icone nome="setaDireita" tamanho={22} />
        </a>
      </div>
    </section>
  );
}

function Avaliacoes({ pagina }: { pagina: PaginaInicio }) {
  const { total, media, itens } = pagina.avaliacoes;
  if (!itens.length) return null;
  return (
    <section className="secao envolve" aria-labelledby="avaliacoes-titulo">
      <div className="secao-topo">
        <p className="cursiva sobre-titulo">quem já recebeu</p>
        <h2 id="avaliacoes-titulo">O que dizem as clientes</h2>
        {total > 0 ? <p className="nota-media">{`${media.toFixed(1).replace(".", ",")} de 5 · ${total === 1 ? "1 avaliação verificada" : `${total} avaliações verificadas`}`}</p> : null}
      </div>
      <ul className="avaliacoes avaliacoes-home">
        {itens.map((a, i) => (
          <li key={i} className="cartao-texto">
            {a.tipo === "avaliacao" ? (
              <p className="avaliacao-topo">
                <span className="estrelas" role="img" aria-label={`${a.nota} de 5 estrelas`}>{"★".repeat(a.nota)}<span aria-hidden="true" className="estrelas-apagadas">{"★".repeat(5 - a.nota)}</span></span>
                <span className="selo-verificada">Compra verificada</span>
              </p>
            ) : (
              <p className="avaliacao-topo"><span className="selo-origem">{`Enviado por ${a.origem}`}</span></p>
            )}
            {a.texto ? <p>“{a.texto}”</p> : null}
            <p className="avaliacao-rodape">
              {a.foto ? <a href={`${a.foto}?w=640`} target="_blank" rel="noopener" aria-label={`Ver a foto enviada por ${a.quem || "cliente"}`}><img src={`${a.foto}?w=160`} alt="" width={48} height={48} loading="lazy" decoding="async" /></a> : null}
              <span>{a.quem ? <span className="avaliacao-quem">{a.quem}</span> : null}{a.produto ? <span className="avaliacao-produto">{a.produto}</span> : null}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Inicio({ pagina, loja }: { pagina: PaginaInicio; loja: Loja }) {
  const [passo, setPasso] = useState(3);
  return (
    <>
      <BannerDoTopo pagina={pagina} />
      <Vantagens loja={loja} />
      <Vitrine pagina={pagina} />

      <section className="secao envolve" aria-labelledby="momentos">
        <div className="secao-topo"><h2 id="momentos">Para cada momento</h2></div>
        <ul className="momentos">
          {MOMENTOS.map((m, i) => (
            <li key={m.slug}>
              <a href={`/categoria/${m.slug}`} style={{ ["--giro" as string]: `${GIROS[i % GIROS.length]}deg`, ["--recorte-circulo" as string]: recorteCirculo(71 + i * 9, 4) }}>
                <span className="momento-adesivo">
                  <span className={`momento-circulo${i % 2 ? " momento-creme" : ""}`}>
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={m.d} /></svg>
                  </span>
                </span>
                <span className="momento-nome">{m.nome}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <Avaliacoes pagina={pagina} />

      <section className="secao envolve" id="previa" aria-labelledby="previa-titulo">
        <div className="chamada-previa">
          <div className="chamada-previa-peca">
            <div className="faixa-caramelo faixa-caramelo-esquerda" aria-hidden="true" />
            <DemoEstudio aoMudarPasso={setPasso} linkProduto={pagina.vitrines[0]?.produtos[0]?.endereco ?? "/categoria/canecas"} />
          </div>
          <div className="chamada-previa-texto" id="como-personalizar">
            <p className="etiqueta">Novo no site</p>
            <h2 id="previa-titulo">Veja como fica antes de comprar</h2>
            <ol className="passos">
              <li className={passo === 1 ? "ativo" : undefined}><span className="passo-numero">1</span><span><strong>Escolha a peça e a cor</strong>: caneca, xícara, garrafa ou vidro.</span></li>
              <li className={passo === 2 ? "ativo" : undefined}><span className="passo-numero">2</span><span><strong>Escreva o nome, a frase ou envie fotos</strong>: a prévia muda na hora.</span></li>
              <li className={passo === 3 ? "ativo" : undefined}><span className="passo-numero">3</span><span><strong>A {loja.responsavel} finaliza a arte</strong> e, se você quiser, aprova com você pelo WhatsApp antes de produzir.</span></li>
            </ol>
            <a className="botao botao-cheio botao-grande" href={pagina.vitrines[0]?.produtos[0]?.endereco ?? "/categoria/canecas"}>Experimentar agora</a>
          </div>
        </div>
      </section>

      <section className="faixa-ipes" aria-labelledby="ipes">
        <BordaRasgada className="faixa-borda" semente={17} />
        <div className="envolve faixa-ipes-grade">
          <div className="faixa-ipes-texto">
            <p className="sobretitulo">Coleção</p>
            <h2 id="ipes">Ipês Brasília</h2>
            <p className="cursiva">brasiliense de coração</p>
            <p className="faixa-ipes-apoio">A beleza dos ipês em uma peça que floresce o ano inteiro: xícaras com line art da cidade e ipês feitos à mão, em fio náutico e base de madeira.</p>
            <a className="botao botao-escuro botao-grande" href="/categoria/ipes-brasilia">Ver a coleção</a>
          </div>
          <div className="arcos">
            <Foto src="/img/provisorias/ipe-amarelo.jpg" alt="Ipê amarelo artesanal" sizes="(max-width: 640px) 30vw, 200px" largura={200} altura={290} className="arco arco-1" />
            <Foto src="/img/provisorias/xicara-catedral.jpg" alt="Xícara com line art da Catedral de Brasília" sizes="(max-width: 640px) 30vw, 200px" largura={200} altura={330} className="arco arco-2" />
            <Foto src="/img/provisorias/ipe-roxo.jpg" alt="Ipê roxo artesanal" sizes="(max-width: 640px) 30vw, 200px" largura={200} altura={266} className="arco arco-3" />
          </div>
        </div>
      </section>

      <section className="secao envolve grandes" aria-label="Pedidos em quantidade">
        {[
          { titulo: "Casamentos e padrinhos", texto: "Xícaras, torres e lembrancinhas com os nomes e a data. Acima de 10 unidades, condição especial.", img: "/img/provisorias/xicaras-casamento.jpg", alt: "Dezenas de xícaras de casamento", mensagem: "Olá! Quero um orçamento para casamento." },
          { titulo: "Brindes para empresas", texto: "Garrafas, canecas e kits com a sua marca, para equipe, clientes e eventos.", img: "/img/provisorias/garrafa-inox-brasilia.jpg", alt: "Garrafa de inox com line art de Brasília", mensagem: "Olá! Quero um orçamento de brindes para empresa." },
        ].map(g => (
          <a key={g.titulo} className="cartao-grande" href={linkWhatsApp(loja.whatsapp, g.mensagem)} target="_blank" rel="noopener noreferrer">
            <span className="fita fita-crepe cartao-fita" aria-hidden="true" />
            <Foto src={g.img} alt={g.alt} sizes="(max-width: 640px) 40vw, 260px" largura={260} altura={300} className="cartao-grande-foto" />
            <span className="cartao-grande-texto">
              <span className="cartao-grande-titulo">{g.titulo}</span>
              <span className="cartao-grande-apoio">{g.texto}</span>
              <span className="botao botao-whatsapp"><Icone nome="whatsapp" tamanho={20} />Pedir orçamento</span>
            </span>
          </a>
        ))}
      </section>

      <section className="secao envolve instagram" aria-labelledby="insta">
        <div className="secao-topo">
          <p className="cursiva sobre-titulo">bastidores e novidades</p>
          <h2 id="insta">@{loja.instagram}</h2>
        </div>
        <div className="grade-instagram">
          {INSTAGRAM.map(i => (
            <a key={i.img} href={`https://www.instagram.com/${loja.instagram}`} target="_blank" rel="noopener noreferrer">
              <Foto src={i.img} alt={i.alt} sizes="(max-width: 640px) 33vw, 200px" largura={200} altura={200} />
            </a>
          ))}
        </div>
        <a className="botao botao-vazado botao-grande" href={`https://www.instagram.com/${loja.instagram}`} target="_blank" rel="noopener noreferrer">
          <Icone nome="instagram" tamanho={20} />Seguir no Instagram
        </a>
      </section>
    </>
  );
}
