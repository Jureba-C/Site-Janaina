import { useEffect, useState } from "react";
import { linkWhatsApp } from "../compartilhado";
import { CartaoProduto } from "../componentes/CartaoProduto";
import { Foto } from "../componentes/Foto";
import { Icone } from "../componentes/Icone";
import { SeloPersonalizavel } from "../componentes/Marca";
import { PecaSvg } from "../componentes/Previa";
import type { ConfigProduto, Loja, PaginaInicio } from "../tipos";

const FITAS = ["fita-crepe", "fita-rosa", "fita-caramelo"];
const GIROS = [-2, 1.5, -1, 2, -1.5];

const TIPOS = [
  { nome: "Canecas", slug: "canecas", img: "/img/provisorias/canecas-alca-colorida.jpg", alt: "Canecas com alça e interior coloridos" },
  { nome: "Xícaras e kits", slug: "xicaras-e-kits", img: "/img/provisorias/xicaras-casamento.jpg", alt: "Xícaras de casamento empilhadas" },
  { nome: "Garrafas", slug: "garrafas-e-termicos", img: "/img/provisorias/garrafa-professores.jpg", alt: "Garrafa personalizada com fotos de alunos" },
  { nome: "Ipês Brasília", slug: "ipes-brasilia", img: "/img/provisorias/ipe-amarelo.jpg", alt: "Ipê amarelo feito à mão" },
  { nome: "Presentes", slug: "acessorios-e-embalagens", img: "/img/provisorias/caneca-caixa-presente.jpg", alt: "Caneca com caixa de presente e laço" },
];

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

const CANECA_EXEMPLO: ConfigProduto = {
  categorias: [], medida: "", codigo: "", cuidados: "", aviso: null, molde: "caneca", formato: "", corPeca: "#FFFFFF", corAlca: "#F2A7BE",
  magica: false, moldeFoto: null, variacoes: [], adicionais: [], faixas: [], qtdMinima: 1,
  personalizacao: { ativa: true, campos: { nome: { ativo: true, obrigatorio: false, limite: 20, rotulo: "Nome" } }, letras: ["cursiva"], artes: ["flor"], fotos: { min: 0, max: 0, formato: "circulo" }, verso: true },
};

function Destaque({ pagina }: { pagina: PaginaInicio }) {
  const slides = pagina.destaques;
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);
  useEffect(() => {
    if (slides.length < 2 || pausado) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const relogio = setInterval(() => setAtual(i => (i + 1) % slides.length), 6000);
    return () => clearInterval(relogio);
  }, [slides.length, pausado]);
  return (
    <section className="destaque envolve" aria-roledescription="carrossel" aria-label="Destaques" onMouseEnter={() => setPausado(true)} onMouseLeave={() => setPausado(false)} onFocus={() => setPausado(true)}>
      <div className="destaque-cartao">
        <div className="destaque-texto">
          <p className="sobretitulo">Canecas e xícaras personalizadas · Brasília</p>
          <h1>Presentes que marcam</h1>
          <p className="cursiva destaque-cursiva">transformando sentimentos em presentes</p>
          <p className="destaque-apoio">Escolha a peça, escreva o nome ou envie suas fotos e veja como a arte fica na caneca antes de comprar.</p>
          <div className="destaque-acoes">
            <a className="botao botao-cheio botao-grande" href="/categoria/canecas">Ver as canecas</a>
            <a className="botao botao-vazado botao-grande" href="/#previa">Criar a minha e ver a prévia</a>
          </div>
        </div>
        <div className="destaque-fotos">
          <div className="faixa-caramelo faixa-caramelo-direita" aria-hidden="true" />
          <div className="polaroid destaque-polaroid">
            <span className="fita fita-crepe" aria-hidden="true" />
            {slides.map((s, i) => (
              <div key={s.src} className={`destaque-slide${i === atual ? " ativo" : ""}`} aria-hidden={i !== atual} role="group" aria-roledescription="slide" aria-label={`${i + 1} de ${slides.length}`}>
                <Foto src={s.src} alt={s.alt} sizes="340px" prioridade={i === 0} largura={340} altura={340} className="polaroid-foto" />
                <p className="cursiva polaroid-legenda">{s.legenda}</p>
              </div>
            ))}
          </div>
          <div className="destaque-circulo">
            <Foto src="/img/provisorias/xicara-ipes.jpg" alt="Xícara da coleção Ipês Brasília" sizes="190px" largura={190} altura={190} />
          </div>
          <div className="destaque-selo"><SeloPersonalizavel /></div>
        </div>
        {slides.length > 1 ? (
          <div className="destaque-pontos">
            {slides.map((s, i) => (
              <button key={s.src} type="button" className={i === atual ? "ativo" : undefined} aria-label={`Destaque ${i + 1} de ${slides.length}`} aria-current={i === atual} onClick={() => setAtual(i)} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Vantagens({ loja }: { loja: Loja }) {
  const itens = [
    { t: "Personalização inclusa", s: "nome, frase ou fotos", icone: "lapis" as const },
    { t: "Enviamos para todo o Brasil", s: loja.retirada ? "ou retire na Asa Norte" : "pelo Melhor Envio", icone: "caminhao" as const },
    { t: "Parcelamos no cartão", s: `ou ${loja.regrasPagamento.pixDiscountPercent}% de desconto no Pix`, icone: "cartao" as const },
    { t: "Acima de 10 unidades", s: "condições especiais", icone: "caixas" as const },
  ];
  return (
    <section className="vantagens envolve" aria-label="Vantagens">
      <ul>
        {itens.map(v => (
          <li key={v.t}>
            <span className="vantagem-icone"><Icone nome={v.icone} tamanho={24} traco={1.6} /></span>
            <span><strong>{v.t}</strong><span>{v.s}</span></span>
          </li>
        ))}
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
          <p className="cursiva sobre-titulo">as queridinhas</p>
          <h2 id="mais-pedidas">{atual.nome}</h2>
        </div>
        <div role="tablist" aria-label="Vitrines" className="abas">
          {vitrines.map(v => (
            <button key={v.id} type="button" role="tab" id={`aba-${v.id}`} aria-selected={v.id === atual.id} aria-controls="vitrine-painel" className={v.id === atual.id ? "ativa" : undefined} onClick={() => setAba(v.id)}>{v.nome}</button>
          ))}
        </div>
      </div>
      <div className="grade-produtos" role="tabpanel" id="vitrine-painel" aria-labelledby={`aba-${atual.id}`}>
        {atual.produtos.map(p => <CartaoProduto key={p.id} produto={p} />)}
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
  return (
    <>
      <Destaque pagina={pagina} />
      <Vantagens loja={loja} />

      <section className="secao envolve" aria-labelledby="tipos">
        <div className="secao-topo">
          <p className="cursiva sobre-titulo">feito com carinho</p>
          <h2 id="tipos">Escolha pelo tipo</h2>
        </div>
        <div className="grade-polaroids">
          {TIPOS.map((t, i) => (
            <a key={t.slug} className="polaroid polaroid-tipo" href={`/categoria/${t.slug}`} style={{ rotate: `${GIROS[i % GIROS.length]}deg` }}>
              <span className={`fita ${FITAS[i % FITAS.length]}`} aria-hidden="true" />
              <Foto src={t.img} alt={t.alt} sizes="(max-width: 640px) 45vw, 230px" largura={230} altura={288} className="polaroid-foto" />
              <span className="polaroid-nome">{t.nome}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="secao envolve" aria-labelledby="momentos">
        <div className="secao-topo"><h2 id="momentos">Para cada momento</h2></div>
        <ul className="momentos">
          {MOMENTOS.map((m, i) => (
            <li key={m.slug}>
              <a href={`/categoria/${m.slug}`}>
                <span className={`momento-circulo${i % 2 ? " momento-creme" : ""}`}>
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={m.d} /></svg>
                </span>
                <span className="momento-nome">{m.nome}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <Vitrine pagina={pagina} />

      <Avaliacoes pagina={pagina} />

      <section className="secao envolve" id="previa" aria-labelledby="previa-titulo">
        <div className="chamada-previa">
          <div className="chamada-previa-peca">
            <div className="faixa-caramelo faixa-caramelo-esquerda" aria-hidden="true" />
            <svg viewBox="0 0 360 380" role="img" aria-label="Prévia de caneca rosa com florzinha e o nome Madrinha Lara">
              <PecaSvg config={CANECA_EXEMPLO} escolhas={{ variacoes: {}, adicionais: [], personalizacao: { nome: "Madrinha Lara", arte: "flor", letra: "cursiva" } }} lado="frente" aquecida={false} urlDaFoto={() => null} medir={false} />
            </svg>
          </div>
          <div className="chamada-previa-texto" id="como-personalizar">
            <p className="etiqueta">Novo no site</p>
            <h2 id="previa-titulo">Veja como fica antes de comprar</h2>
            <ol className="passos">
              <li><span className="passo-numero">1</span><span><strong>Escolha a peça e a cor</strong>: caneca, xícara, garrafa ou vidro.</span></li>
              <li><span className="passo-numero">2</span><span><strong>Escreva o nome, a frase ou envie fotos</strong>: a prévia muda na hora.</span></li>
              <li><span className="passo-numero">3</span><span><strong>A {loja.responsavel} finaliza a arte</strong> e, se você quiser, aprova com você pelo WhatsApp antes de produzir.</span></li>
            </ol>
            <a className="botao botao-cheio botao-grande" href={pagina.vitrines[0]?.produtos[0]?.endereco ?? "/categoria/canecas"}>Experimentar agora</a>
          </div>
        </div>
      </section>

      <section className="faixa-ipes" aria-labelledby="ipes">
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
          <p className="cursiva sobre-titulo">60,7 mil pessoas acompanham</p>
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
