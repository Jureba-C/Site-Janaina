const db = require("./db.js");
const catalogo = require("./catalogo.js");
const regras = require("../js/regras-produto.js");
const pricing = require("../js/pricing.js");
const produtoUrl = require("../js/produto-url.js");
const marca = require("../marca.json");

const POR_PAGINA = 24;
const NA_VITRINE = 8;

function normalizar(texto){
  return String(texto == null ? "" : texto)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim();
}

function precoMinimo(p){
  const config = p.config;
  let preco = regras.precoBase(p, config.qtdMinima || 1);
  let variavel = config.faixas.length > 0;
  for(const grupo of config.variacoes){
    const disponiveis = grupo.opcoes.filter(o => !o.esgotado);
    const precos = (disponiveis.length ? disponiveis : grupo.opcoes).map(o => o.preco);
    preco += Math.min(...precos);
    if(new Set(precos).size > 1) variavel = true;
  }
  return { valor: regras.round2(preco), aPartirDe: variavel };
}

function resumo(id, p){
  const minimo = precoMinimo(p);
  return {
    id,
    nome: p.name,
    preco: p.price,
    precoMinimo: minimo.valor,
    aPartirDe: minimo.aPartirDe,
    foto: p.photos[0] || null,
    selos: p.badges || [],
    esgotado: Boolean(p.soldOut),
    endereco: produtoUrl.caminhoDoProduto(id, p.name),
    medida: p.config.medida,
    molde: p.config.molde,
    corPeca: p.config.corPeca,
    corAlca: p.config.corAlca,
    magica: p.config.magica,
    formato: p.config.formato,
    aviso: p.config.aviso,
    personalizavel: p.config.personalizacao.ativa,
  };
}

function todosVisiveis(){
  const overrides = catalogo.getProductOverridesMap();
  return catalogo.getAllProductIds()
    .map(id => ({ id, p: catalogo.effectiveProduct(id, overrides) }))
    .filter(({ p }) => p && !p.hidden);
}

function categoriasComContagem(visiveis){
  const contagem = new Map();
  for(const { p } of visiveis) for(const slug of p.config.categorias) contagem.set(slug, (contagem.get(slug) || 0) + 1);
  return catalogo.getAllCategories().map(c => ({ slug: c.slug, nome: c.label, grupo: c.grupo === "ocasiao" ? "ocasiao" : "tipo", quantidade: contagem.get(c.slug) || 0 }));
}

function dadosDaLoja(visiveis){
  return {
    nome: marca.nomeLoja,
    responsavel: marca.responsavel,
    whatsapp: marca.whatsappDigitos,
    whatsappFormatado: marca.whatsappFormatado,
    instagram: marca.instagram,
    email: marca.email,
    cnpj: /^0{2}\.0{3}/.test(marca.cnpj) ? "[a confirmar]" : marca.cnpj,
    cidade: "Asa Norte · Brasília — DF",
    prazoProducao: db.prazoDeProducao(),
    regrasPagamento: pricing.PAYMENT_RULES,
    categorias: categoriasComContagem(visiveis),
    retirada: String(process.env.RETIRADA_ATIVA || "true").toLowerCase() !== "false",
  };
}

const DESTAQUES_PADRAO = [
  { src: "/img/provisorias/canecas-alca-colorida.jpg", legenda: "11 cores de alça", alt: "Canecas com alça e interior coloridos empilhadas" },
  { src: "/img/provisorias/xicaras-casamento.jpg", legenda: "casamentos e padrinhos", alt: "Xícaras de casamento empilhadas" },
  { src: "/img/provisorias/garrafa-professores.jpg", legenda: "para os professores", alt: "Garrafa personalizada com fotos de alunos" },
];

function destaques(){
  const doPainel = db.listHeroPhotos();
  if(!doPainel.length) return DESTAQUES_PADRAO;
  return doPainel.map(f => ({ src: `/api/hero/fotos/${f.id}?w=960`, legenda: f.legenda, alt: f.alt }));
}

function comCategoria(visiveis, slug){
  return visiveis.filter(({ p }) => p.config.categorias.includes(slug));
}

function vitrines(visiveis){
  const comSelo = (selo) => visiveis.filter(({ p }) => p.badges.includes(selo));
  const disponiveis = visiveis.filter(({ p }) => !p.soldOut);
  const maisPedidas = [...comSelo("Mais pedida"), ...disponiveis.filter(({ p }) => p.config.personalizacao.ativa)];
  const novidades = [
    ...comSelo("Novidade"),
    ...disponiveis.filter(({ id }) => id >= catalogo.CUSTOM_PRODUCT_ID_START).reverse(),
  ];
  const unicos = (lista) => {
    const vistos = new Set();
    return lista.filter(({ id }) => (vistos.has(id) ? false : vistos.add(id))).slice(0, NA_VITRINE).map(({ id, p }) => resumo(id, p));
  };
  return [
    { id: "mais-pedidas", nome: "Mais pedidas", produtos: unicos(maisPedidas) },
    { id: "novidades", nome: "Novidades", produtos: unicos(novidades) },
    { id: "casamento", nome: "Casamento", produtos: unicos(comCategoria(disponiveis, "casamento")) },
    { id: "brasilia", nome: "Coleção Brasília", produtos: unicos(comCategoria(disponiveis, "brasilia")) },
  ];
}

const CARTOES_DE_AVALIACAO = 6;

function avaliacoesDaHome(){
  const avaliacoes = db.avaliacoesPublicadas(CARTOES_DE_AVALIACAO);
  const sobra = CARTOES_DE_AVALIACAO - avaliacoes.length;
  const depoimentos = sobra > 0 ? db.depoimentosPublicados(sobra) : [];
  const overrides = catalogo.getProductOverridesMap();
  const { total, media } = db.notaMedia();
  return {
    total,
    media: total ? media : 0,
    itens: [
      ...avaliacoes.map(r => ({
        tipo: "avaliacao",
        nota: r.rating,
        texto: r.comment || "",
        quem: [r.customer_first_name, r.customer_city].filter(Boolean).join(" · "),
        produto: catalogo.effectiveProduct(r.product_id, overrides)?.name || "",
        foto: r.photo_id ? `/api/avaliacoes/fotos/${r.photo_id}` : null,
      })),
      ...depoimentos.map(d => ({
        tipo: "depoimento",
        nota: 0,
        texto: d.texto || "",
        quem: [d.cliente_nome, d.cliente_cidade].filter(Boolean).join(" · "),
        origem: d.origem === "instagram" ? "Instagram" : "WhatsApp",
        foto: d.photo_id ? `/api/depoimentos/fotos/${d.photo_id}` : null,
      })),
    ],
  };
}

function paginaInicio(){
  const visiveis = todosVisiveis();
  return {
    loja: dadosDaLoja(visiveis),
    pagina: { tipo: "inicio", destaques: destaques(), vitrines: vitrines(visiveis), avaliacoes: avaliacoesDaHome() },
    caminho: "/",
  };
}

function textoDeBusca(p, rotulos){
  return normalizar([p.name, p.config.medida, p.config.codigo, ...p.config.categorias.map(s => rotulos.get(s) || s)].join(" "));
}

function buscar(visiveis, termo){
  const palavras = normalizar(termo).split(/\s+/).filter(Boolean).map(p => p.replace(/s$/, ""));
  if(!palavras.length) return visiveis;
  const rotulos = new Map(catalogo.getAllCategories().map(c => [c.slug, c.label]));
  return visiveis
    .map(item => {
      const texto = textoDeBusca(item.p, rotulos);
      const nome = normalizar(item.p.name);
      if(!palavras.every(pal => texto.includes(pal))) return null;
      const pontos = palavras.reduce((s, pal) => s + (nome.includes(pal) ? 2 : 1), 0) + (item.p.soldOut ? -5 : 0);
      return { ...item, pontos };
    })
    .filter(Boolean)
    .sort((a, b) => b.pontos - a.pontos);
}

function paginaBusca(termo, favoritos){
  const visiveis = todosVisiveis();
  const limpo = String(termo || "").trim().slice(0, 80);
  const achados = favoritos ? [] : buscar(visiveis, limpo);
  return {
    loja: dadosDaLoja(visiveis),
    pagina: { tipo: "busca", termo: limpo, favoritos: Boolean(favoritos), produtos: achados.map(({ id, p }) => resumo(id, p)) },
    caminho: "/busca",
  };
}

function sugestoes(termo, limite){
  const visiveis = todosVisiveis();
  return buscar(visiveis, termo).slice(0, limite).map(({ id, p }) => resumo(id, p));
}

function porIds(ids){
  const pedidos = new Set(ids);
  return todosVisiveis().filter(({ id }) => pedidos.has(id)).map(({ id, p }) => resumo(id, p));
}

const ORDENS = new Set(["destaque", "menor-preco", "maior-preco", "nome"]);
const FAIXA = /^(\d{1,5})-(\d{1,5})?$/;

function paginaCategoria(slug, consulta){
  const visiveis = todosVisiveis();
  const categorias = categoriasComContagem(visiveis);
  const categoria = categorias.find(c => c.slug === slug);
  if(!categoria) return null;
  const filtros = {
    ordem: ORDENS.has(consulta.ordem) ? consulta.ordem : "destaque",
    preco: FAIXA.test(String(consulta.preco || "")) ? String(consulta.preco) : "",
    outra: categorias.some(c => c.slug === consulta.outra && c.grupo !== categoria.grupo) ? String(consulta.outra) : "",
  };
  let lista = comCategoria(visiveis, slug).map(({ id, p }) => resumo(id, p));
  if(filtros.outra){
    const comOutra = new Set(comCategoria(visiveis, filtros.outra).map(({ id }) => id));
    lista = lista.filter(r => comOutra.has(r.id));
  }
  if(filtros.preco){
    const [, min, max] = FAIXA.exec(filtros.preco);
    lista = lista.filter(r => r.precoMinimo >= Number(min) && (max === undefined || r.precoMinimo <= Number(max)));
  }
  if(filtros.ordem === "menor-preco") lista.sort((a, b) => a.precoMinimo - b.precoMinimo);
  if(filtros.ordem === "maior-preco") lista.sort((a, b) => b.precoMinimo - a.precoMinimo);
  if(filtros.ordem === "nome") lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  if(filtros.ordem === "destaque") lista.sort((a, b) => Number(a.esgotado) - Number(b.esgotado));
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const pagina = Math.min(paginas, Math.max(1, Number.parseInt(consulta.pagina, 10) || 1));
  return {
    loja: dadosDaLoja(visiveis),
    pagina: {
      tipo: "categoria", categoria, filtros, total: lista.length, pagina, paginas,
      produtos: lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
      outras: categorias.filter(c => c.quantidade > 0 && c.slug !== slug),
    },
    caminho: `/categoria/${slug}`,
  };
}

const NOMES_DOS_EXTRAS = ["Tampa de bambu para caneca", "Caixa de presente", "Mini buquê de flores secas", "Caixa de MDF com tampa personalizada"];

function paginaProduto(id){
  const visiveis = todosVisiveis();
  const achado = visiveis.find(item => item.id === id);
  if(!achado) return null;
  const { p } = achado;
  const categorias = catalogo.getAllCategories();
  const principal = categorias.find(c => c.slug === p.config.categorias[0]);
  const extras = NOMES_DOS_EXTRAS
    .map(nome => visiveis.find(item => item.p.name === nome))
    .filter(item => item && item.id !== id)
    .map(({ id: i, p: x }) => resumo(i, x));
  const relacionados = visiveis
    .filter(item => item.id !== id && !item.p.soldOut && item.p.config.categorias[0] === p.config.categorias[0])
    .slice(0, 4)
    .map(({ id: i, p: x }) => resumo(i, x));
  const avaliacoes = db.avaliacoesDoProduto(id, 6);
  return {
    loja: dadosDaLoja(visiveis),
    pagina: {
      tipo: "produto",
      produto: {
        ...resumo(id, p),
        fotos: p.photos,
        descricao: p.description || null,
        config: p.config,
        categoriaPrincipal: principal ? { slug: principal.slug, nome: principal.label } : null,
      },
      extras,
      relacionados,
      avaliacoes: {
        total: avaliacoes.total,
        media: avaliacoes.media,
        itens: avaliacoes.itens.map(r => ({ nota: r.rating, texto: r.comment || "", quem: [r.customer_first_name, r.customer_city].filter(Boolean).join(" · ") })),
      },
    },
    caminho: produtoUrl.caminhoDoProduto(id, p.name),
  };
}

module.exports = { paginaInicio, paginaBusca, paginaCategoria, paginaProduto, sugestoes, porIds, resumo, precoMinimo, normalizar };
