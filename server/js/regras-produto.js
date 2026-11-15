(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ArteRegrasProduto = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MOLDES = ["caneca", "xicara", "garrafa", "copo", "azulejo", "plano", "botton", "caixa", "flor", "foto", "nenhum"];

  const LETRAS = [
    { id: "cursiva", nome: "Cursiva" },
    { id: "classica", nome: "Clássica" },
    { id: "delicada", nome: "Delicada" },
  ];

  const ARTES = [
    { id: "nome", nome: "Só o nome" },
    { id: "flor", nome: "Florzinha" },
    { id: "brasilia", nome: "Brasília" },
    { id: "fotos", nome: "Com fotos" },
  ];

  const CAMPOS_TEXTO = [
    { id: "nome", rotulo: "Nome", limitePadrao: 20, limiteMaximo: 40 },
    { id: "frase", rotulo: "Frase", limitePadrao: 60, limiteMaximo: 120 },
    { id: "data", rotulo: "Data", limitePadrao: 20, limiteMaximo: 30 },
    { id: "observacoes", rotulo: "Observações", limitePadrao: 300, limiteMaximo: 500 },
  ];

  const MAX_FOTOS = 8;
  const QTD_MAXIMA = 50;
  const QTD_CONDICAO_ESPECIAL = 10;
  const ID_VALIDO = /^[a-z0-9][a-z0-9-]{0,39}$/;
  const HEX_VALIDO = /^#[0-9a-fA-F]{6}$/;
  const ID_FOTO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const ID_ESTAMPA = /^[a-z0-9][a-z0-9-]{2,39}$/;
  const MOLDES_COM_ESTAMPA = ["caneca", "xicara", "garrafa", "copo", "botton", "azulejo", "plano", "caixa"];
  const COBERTURA_DA_VOLTA = { caneca: 0.93, xicara: 0.926, garrafa: 0.95, copo: 0.95 };

  function voltaDaPeca(molde) {
    const cobertura = COBERTURA_DA_VOLTA[molde] || COBERTURA_DA_VOLTA.caneca;
    const vao = 1 - cobertura;
    const centroDaFrente = 1 - (0.25 - vao / 2) / cobertura;
    return { cobertura, vao, centroDaFrente, centroDoVerso: 1 - centroDaFrente, inicioNaTextura: (vao / 2 - 0.25 + 1) % 1 };
  }
  const CHAVE_FOTO = /^[0-9a-f]{32}$/;

  const MEDIDAS_DO_MOLDE = {
    caneca: { largura: 240, altura: 95, cilindro: 110, alca: true },
    xicara: { largura: 210, altura: 60, cilindro: 118, alca: true },
    garrafa: { largura: 200, altura: 150, cilindro: 66 },
    copo: { largura: 230, altura: 110, cilindro: 80 },
    azulejo: { largura: 150, altura: 150 },
    plano: { largura: 220, altura: 180 },
    botton: { largura: 55, altura: 55 },
    caixa: { largura: 150, altura: 150 },
    flor: { largura: 110, altura: 18 },
    foto: { largura: 200, altura: 95 },
  };
  const MOTIVOS_DA_ESTAMPA = [
    { id: "flor", nome: "Flor", plural: "flores" },
    { id: "coracao", nome: "Coração", plural: "corações" },
    { id: "ipe", nome: "Ipê", plural: "ipês" },
    { id: "estrela", nome: "Estrela", plural: "estrelas" },
    { id: "folha", nome: "Folha", plural: "folhas" },
    { id: "bolinha", nome: "Bolinha", plural: "bolinhas" },
    { id: "foto", nome: "Sua foto", plural: "fotos" },
  ];
  const PALETA_DA_ESTAMPA = [
    { hex: "#FBF3EC", nome: "Creme" }, { hex: "#FFFFFF", nome: "Branco" }, { hex: "#F6E1DE", nome: "Rosa claro" },
    { hex: "#DFA1AC", nome: "Rosa" }, { hex: "#CD7031", nome: "Terracota" }, { hex: "#9E4A18", nome: "Caramelo" },
    { hex: "#F2C94C", nome: "Amarelo" }, { hex: "#E9B824", nome: "Mostarda" }, { hex: "#8DB48E", nome: "Verde sálvia" },
    { hex: "#3F6B4F", nome: "Verde mata" }, { hex: "#9CC3E4", nome: "Azul céu" }, { hex: "#2F4E7A", nome: "Azul marinho" },
    { hex: "#2E2A28", nome: "Preto" },
  ];
  const LIMITES_DA_ESTAMPA = { tamanho: [8, 40], espaco: [0, 30] };
  const ESTAMPA_PROPRIA_PADRAO = { tipo: "padrao", motivo: "flor", cor: "#CD7031", fundo: "#FBF3EC", tamanho: 16, espaco: 8, xadrez: true };
  const TAMANHO_MINIMO = 10;
  const TAMANHO_MAXIMO = 400;

  function medidaDoNome(valor) {
    const casou = /(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*cm/i.exec(String(valor || ""));
    if (casou) return { largura: Number(casou[1].replace(",", ".")) * 10, altura: Number(casou[2].replace(",", ".")) * 10 };
    const diametro = /(\d+(?:[.,]\d+)?)\s*cm/i.exec(String(valor || ""));
    if (diametro) return { largura: Number(diametro[1].replace(",", ".")) * 10, altura: Number(diametro[1].replace(",", ".")) * 10 };
    return null;
  }

  function normalizarTamanho(bruto) {
    if (!bruto || typeof bruto !== "object") return null;
    const largura = Number(bruto.largura), altura = Number(bruto.altura);
    const dentro = (n) => Number.isFinite(n) && n >= TAMANHO_MINIMO && n <= TAMANHO_MAXIMO;
    if (!dentro(largura) || !dentro(altura)) return null;
    return { largura: Math.round(largura * 10) / 10, altura: Math.round(altura * 10) / 10 };
  }

  function medidaDaPeca(config, escolhas) {
    const c = config || {};
    const base = { ...(MEDIDAS_DO_MOLDE[c.molde] || MEDIDAS_DO_MOLDE.caneca) };
    const nomes = base.cilindro ? [] : (c.variacoes || []).map(g => {
      const id = escolhas && escolhas.variacoes ? escolhas.variacoes[g.id] : null;
      const opcao = g.opcoes.find(o => o.id === id);
      return opcao ? opcao.nome : null;
    }).filter(Boolean);
    const medida = nomes.map(medidaDoNome).find(Boolean) || c.tamanho || (base.cilindro ? null : medidaDoNome(c.medida));
    if (medida) { base.largura = medida.largura; base.altura = medida.altura; }
    return base;
  }

  function round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function texto(valor, limite) {
    return String(valor == null ? "" : valor)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "")
      .replace(/\r\n?/g, "\n")
      .trim()
      .slice(0, limite);
  }

  function numero(valor, min, max, padrao) {
    const n = Number(valor);
    if (!Number.isFinite(n)) return padrao;
    return Math.min(max, Math.max(min, n));
  }

  function apelidoDe(valor) {
    return String(valor == null ? "" : valor)
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  }

  function normalizarOpcao(bruta, usados) {
    const nome = texto(bruta && bruta.nome, 60);
    if (!nome) return null;
    let id = ID_VALIDO.test(String(bruta.id || "")) ? String(bruta.id) : apelidoDe(nome);
    if (!id || usados.has(id)) return null;
    usados.add(id);
    const opcao = { id, nome, preco: round2(numero(bruta.preco, -10000, 10000, 0)), esgotado: Boolean(bruta.esgotado) };
    if (HEX_VALIDO.test(String(bruta.hex || ""))) opcao.hex = String(bruta.hex).toUpperCase();
    return opcao;
  }

  function normalizarVariacoes(lista) {
    if (!Array.isArray(lista)) return [];
    const grupos = [];
    const ids = new Set();
    for (const bruto of lista.slice(0, 6)) {
      const nome = texto(bruto && bruto.nome, 60);
      if (!nome) continue;
      let id = ID_VALIDO.test(String(bruto.id || "")) ? String(bruto.id) : apelidoDe(nome);
      if (!id || ids.has(id)) continue;
      ids.add(id);
      const usados = new Set();
      const opcoes = (Array.isArray(bruto.opcoes) ? bruto.opcoes : [])
        .slice(0, 30)
        .map(o => normalizarOpcao(o, usados))
        .filter(Boolean);
      if (!opcoes.length) continue;
      const previa = ["alca", "peca", "tamanho"].includes(bruto.previa) ? bruto.previa : null;
      grupos.push({ id, nome, previa, opcoes });
    }
    return grupos;
  }

  function normalizarAdicionais(lista) {
    if (!Array.isArray(lista)) return [];
    const usados = new Set();
    return lista.slice(0, 8).map(o => normalizarOpcao(o, usados)).filter(Boolean).map(o => ({ ...o, preco: Math.max(0, o.preco) }));
  }

  function normalizarFaixas(lista) {
    if (!Array.isArray(lista)) return [];
    return lista
      .map(f => ({ min: Math.round(numero(f && f.min, 2, 1000, 0)), preco: round2(numero(f && f.preco, 0.01, 100000, 0)) }))
      .filter(f => f.min >= 2 && f.preco > 0)
      .sort((a, b) => a.min - b.min)
      .filter((f, i, todas) => i === 0 || f.min !== todas[i - 1].min)
      .slice(0, 5);
  }

  function normalizarPersonalizacao(bruta) {
    const p = bruta && typeof bruta === "object" ? bruta : {};
    const campos = {};
    for (const campo of CAMPOS_TEXTO) {
      const c = p.campos && p.campos[campo.id];
      if (!c || !c.ativo) continue;
      campos[campo.id] = {
        ativo: true,
        obrigatorio: Boolean(c.obrigatorio),
        limite: Math.round(numero(c.limite, 1, campo.limiteMaximo, campo.limitePadrao)),
        rotulo: texto(c.rotulo, 40) || campo.rotulo,
      };
    }
    const letras = (Array.isArray(p.letras) ? p.letras : []).filter(l => LETRAS.some(x => x.id === l));
    const artes = (Array.isArray(p.artes) ? p.artes : []).filter(a => ARTES.some(x => x.id === a));
    const maxFotos = Math.round(numero(p.fotos && p.fotos.max, 0, MAX_FOTOS, 0));
    const minFotos = Math.round(numero(p.fotos && p.fotos.min, 0, maxFotos, 0));
    const ativa = Boolean(p.ativa) && (Object.keys(campos).length > 0 || maxFotos > 0 || artes.length > 0);
    return {
      ativa,
      campos,
      letras: [...new Set(letras)],
      artes: [...new Set(artes)],
      fotos: { min: minFotos, max: maxFotos, formato: p.fotos && p.fotos.formato === "quadrado" ? "quadrado" : "circulo" },
      verso: Boolean(p.verso),
    };
  }

  function normalizarArea(bruta) {
    if (!bruta || typeof bruta !== "object") return null;
    const x = numero(bruta.x, 0, 1, NaN), y = numero(bruta.y, 0, 1, NaN);
    const w = numero(bruta.w, 0.05, 1, NaN), h = numero(bruta.h, 0.05, 1, NaN);
    if ([x, y, w, h].some(v => !Number.isFinite(v))) return null;
    return { x: round2(x * 100) / 100, y: round2(y * 100) / 100, w: round2(Math.min(w, 1 - x) * 100) / 100, h: round2(Math.min(h, 1 - y) * 100) / 100, curva: Boolean(bruta.curva) };
  }

  function normalizarEstampas(bruta, molde) {
    const e = bruta && typeof bruta === "object" ? bruta : {};
    const ids = [...new Set((Array.isArray(e.ids) ? e.ids : []).map(String).filter(id => ID_ESTAMPA.test(id)))].slice(0, 200);
    const p = e.propria && typeof e.propria === "object" ? e.propria : {};
    return {
      ativa: Boolean(e.ativa) && MOLDES_COM_ESTAMPA.includes(molde),
      ids,
      obrigatoria: Boolean(e.obrigatoria),
      propria: { padrao: Boolean(p.padrao), imagem: Boolean(p.imagem), preco: round2(numero(p.preco, 0, 500, 0)) },
    };
  }

  function estampaPropriaPermitida(config) {
    const e = (config && config.estampas) || {};
    if (!e.ativa || !e.propria) return { padrao: false, imagem: false, preco: 0 };
    return e.propria;
  }

  function fotoDaEstampa(f) {
    return f && ID_FOTO.test(String(f.id)) && CHAVE_FOTO.test(String(f.chave)) ? { id: String(f.id), chave: String(f.chave) } : null;
  }

  function validarEstampaPropria(bruta, permitida) {
    const e = bruta && typeof bruta === "object" ? bruta : {};
    if (e.tipo === "imagem") {
      if (!permitida.imagem) return { erro: "Este produto não aceita imagem própria como estampa." };
      const foto = fotoDaEstampa(e.foto);
      if (!foto) return { erro: "Envie a imagem da estampa de novo." };
      return { valor: { tipo: "imagem", foto } };
    }
    if (e.tipo !== "padrao" || !permitida.padrao) return { erro: "Este produto não aceita estampa montada." };
    if (!MOTIVOS_DA_ESTAMPA.some(m => m.id === e.motivo)) return { erro: "Escolha o desenho da estampa." };
    if (!HEX_VALIDO.test(String(e.cor || "")) || !HEX_VALIDO.test(String(e.fundo || ""))) return { erro: "Escolha as cores da estampa." };
    const tamanho = Number(e.tamanho), espaco = Number(e.espaco);
    const [tMin, tMax] = LIMITES_DA_ESTAMPA.tamanho, [eMin, eMax] = LIMITES_DA_ESTAMPA.espaco;
    if (!Number.isFinite(tamanho) || tamanho < tMin || tamanho > tMax || !Number.isFinite(espaco) || espaco < eMin || espaco > eMax) return { erro: "Tamanho ou espaço da estampa fora do limite." };
    const valor = { tipo: "padrao", motivo: e.motivo, cor: String(e.cor).toUpperCase(), fundo: String(e.fundo).toUpperCase(), tamanho: round2(tamanho), espaco: round2(espaco), xadrez: Boolean(e.xadrez) };
    if (e.motivo === "foto") {
      const foto = fotoDaEstampa(e.foto);
      if (!foto) return { erro: "Envie a foto que vai virar estampa." };
      valor.foto = foto;
    }
    return { valor };
  }

  function descreverEstampaPropria(e) {
    if (!e) return "";
    if (e.tipo === "imagem") return "imagem enviada";
    const motivo = MOTIVOS_DA_ESTAMPA.find(m => m.id === e.motivo);
    return `padrão de ${motivo ? motivo.plural : "desenhos"}`;
  }

  function estampasDoProduto(produto) {
    const config = produto.config || {};
    if (!config.estampas || !config.estampas.ativa) return [];
    return Array.isArray(produto.estampasDisponiveis) ? produto.estampasDisponiveis : [];
  }

  function estampaEscolhida(produto, escolhas) {
    const id = escolhas && escolhas.personalizacao ? escolhas.personalizacao.estampa : null;
    if (!id) return null;
    return estampasDoProduto(produto).find(e => e.id === id) || null;
  }

  function normalizarConfig(bruta) {
    const c = bruta && typeof bruta === "object" ? bruta : {};
    const molde = MOLDES.includes(c.molde) ? c.molde : "nenhum";
    const config = {
      categorias: [...new Set((Array.isArray(c.categorias) ? c.categorias : []).map(s => String(s)).filter(s => ID_VALIDO.test(s)))].slice(0, 20),
      medida: texto(c.medida, 40),
      codigo: texto(c.codigo, 30),
      cuidados: texto(c.cuidados, 600),
      aviso: ["ultimas", "consultar"].includes(c.aviso) ? c.aviso : null,
      molde,
      formato: texto(c.formato, 20),
      corPeca: HEX_VALIDO.test(String(c.corPeca || "")) ? String(c.corPeca).toUpperCase() : "#FFFFFF",
      corAlca: HEX_VALIDO.test(String(c.corAlca || "")) ? String(c.corAlca).toUpperCase() : null,
      magica: Boolean(c.magica),
      tamanho: normalizarTamanho(c.tamanho),
      moldeFoto: molde === "foto" ? { foto: texto(c.moldeFoto && c.moldeFoto.foto, 300) || null, area: normalizarArea(c.moldeFoto && c.moldeFoto.area) } : null,
      variacoes: normalizarVariacoes(c.variacoes),
      adicionais: normalizarAdicionais(c.adicionais),
      faixas: normalizarFaixas(c.faixas),
      qtdMinima: Math.round(numero(c.qtdMinima, 1, 100, 1)),
      personalizacao: normalizarPersonalizacao(c.personalizacao),
      estampas: normalizarEstampas(c.estampas, molde),
      peso: round2(numero(c.peso, 0.01, 30, 0.45) * 1000) / 1000,
      caixa: {
        largura: round2(numero(c.caixa && c.caixa.largura, 1, 100, 12)),
        altura: round2(numero(c.caixa && c.caixa.altura, 1, 100, 12)),
        comprimento: round2(numero(c.caixa && c.caixa.comprimento, 1, 100, 12)),
      },
    };
    return config;
  }

  function precoBase(produto, qtd) {
    const faixas = (produto.config && produto.config.faixas) || [];
    let preco = produto.price;
    for (const f of faixas) if (qtd >= f.min) preco = f.preco;
    return preco;
  }

  function opcaoEscolhida(grupo, escolhas) {
    const id = escolhas && escolhas.variacoes ? escolhas.variacoes[grupo.id] : null;
    return grupo.opcoes.find(o => o.id === id) || null;
  }

  function precoUnitario(produto, escolhas, qtd) {
    const config = produto.config || {};
    let preco = precoBase(produto, qtd || 1);
    for (const grupo of config.variacoes || []) {
      const opcao = opcaoEscolhida(grupo, escolhas) || grupo.opcoes.find(o => !o.esgotado) || grupo.opcoes[0];
      if (opcao) preco += opcao.preco;
    }
    const marcados = new Set((escolhas && escolhas.adicionais) || []);
    for (const adicional of config.adicionais || []) if (marcados.has(adicional.id)) preco += adicional.preco;
    const estampa = estampaEscolhida(produto, escolhas);
    if (estampa && estampa.preco > 0) preco += estampa.preco;
    const propria = escolhas && escolhas.personalizacao ? escolhas.personalizacao.estampaPropria : null;
    const permitida = estampaPropriaPermitida(config);
    if (propria && !estampa && permitida[propria.tipo] && permitida.preco > 0) preco += permitida.preco;
    return round2(Math.max(0.01, preco));
  }

  function escolhasPadrao(produto) {
    const config = produto.config || {};
    const variacoes = {};
    for (const grupo of config.variacoes || []) {
      const opcao = grupo.opcoes.find(o => !o.esgotado) || grupo.opcoes[0];
      if (opcao) variacoes[grupo.id] = opcao.id;
    }
    const pers = config.personalizacao || {};
    const personalizacao = {};
    if (pers.ativa) {
      if (pers.letras && pers.letras.length) personalizacao.letra = pers.letras[0];
      if (pers.artes && pers.artes.length) personalizacao.arte = pers.artes[0];
      personalizacao.fotos = [];
      personalizacao.aprovarWhatsApp = true;
    }
    const estampas = estampasDoProduto(produto);
    if (estampas.length && config.estampas.obrigatoria) personalizacao.estampa = estampas[0].id;
    else if (config.estampas && config.estampas.ativa && config.estampas.obrigatoria && estampaPropriaPermitida(config).padrao) personalizacao.estampaPropria = { ...ESTAMPA_PROPRIA_PADRAO };
    return { variacoes, adicionais: [], personalizacao };
  }

  function validarEscolhas(produto, brutas, qtd) {
    const config = produto.config || {};
    const erros = [];
    const escolhas = { variacoes: {}, adicionais: [], personalizacao: {} };
    const entrada = brutas && typeof brutas === "object" ? brutas : {};

    for (const grupo of config.variacoes || []) {
      const id = entrada.variacoes ? entrada.variacoes[grupo.id] : undefined;
      const opcao = grupo.opcoes.find(o => o.id === id);
      if (!opcao) { erros.push(`Escolha: ${grupo.nome}.`); continue; }
      if (opcao.esgotado) { erros.push(`${grupo.nome} "${opcao.nome}" está esgotado.`); continue; }
      escolhas.variacoes[grupo.id] = opcao.id;
    }

    const adicionaisValidos = new Map((config.adicionais || []).map(a => [a.id, a]));
    for (const id of Array.isArray(entrada.adicionais) ? entrada.adicionais : []) {
      const adicional = adicionaisValidos.get(id);
      if (!adicional) { erros.push("Adicional inválido."); continue; }
      if (adicional.esgotado) { erros.push(`"${adicional.nome}" está esgotado.`); continue; }
      if (!escolhas.adicionais.includes(id)) escolhas.adicionais.push(id);
    }

    const pers = config.personalizacao || {};
    const bruta = entrada.personalizacao && typeof entrada.personalizacao === "object" ? entrada.personalizacao : {};
    if (pers.ativa) {
      for (const [id, campo] of Object.entries(pers.campos || {})) {
        const original = String(bruta[id] == null ? "" : bruta[id]);
        const valor = texto(original, 2000);
        if (valor.length > campo.limite) erros.push(`${campo.rotulo}: até ${campo.limite} caracteres.`);
        else if (campo.obrigatorio && !valor) erros.push(`Preencha: ${campo.rotulo}.`);
        else if (valor) escolhas.personalizacao[id] = valor;
      }
      if (pers.letras && pers.letras.length) {
        escolhas.personalizacao.letra = pers.letras.includes(bruta.letra) ? bruta.letra : pers.letras[0];
      }
      if (pers.artes && pers.artes.length) {
        escolhas.personalizacao.arte = pers.artes.includes(bruta.arte) ? bruta.arte : pers.artes[0];
      }
      const usaFotos = pers.fotos && pers.fotos.max > 0 && (!pers.artes || !pers.artes.length || !pers.artes.includes("fotos") || escolhas.personalizacao.arte === "fotos");
      const fotos = Array.isArray(bruta.fotos) ? bruta.fotos : [];
      if (usaFotos) {
        const minimo = Math.max(pers.fotos.min, escolhas.personalizacao.arte === "fotos" ? 1 : 0);
        if (fotos.length > pers.fotos.max) erros.push(`Envie no máximo ${pers.fotos.max} ${pers.fotos.max === 1 ? "foto" : "fotos"}.`);
        else if (fotos.length < minimo) erros.push(`Envie pelo menos ${minimo} ${minimo === 1 ? "foto" : "fotos"}.`);
        const vistas = new Set();
        const limpas = [];
        for (const f of fotos.slice(0, pers.fotos.max)) {
          if (!f || !ID_FOTO.test(String(f.id)) || !CHAVE_FOTO.test(String(f.chave)) || vistas.has(f.id)) { erros.push("Foto inválida. Envie de novo."); break; }
          vistas.add(f.id);
          limpas.push({ id: f.id, chave: f.chave, x: round2(numero(f.x, -1, 1, 0)), y: round2(numero(f.y, -1, 1, 0)), zoom: round2(numero(f.zoom, 1, 3, 1)) });
        }
        escolhas.personalizacao.fotos = limpas;
      }
      escolhas.personalizacao.aprovarWhatsApp = bruta.aprovarWhatsApp !== false;
    }

    const estampas = estampasDoProduto(produto);
    const permitida = estampaPropriaPermitida(config);
    let comPropria = false;
    if (bruta.estampaPropria) {
      const r = validarEstampaPropria(bruta.estampaPropria, permitida);
      if (r.erro) erros.push(r.erro);
      else { escolhas.personalizacao.estampaPropria = r.valor; comPropria = true; }
    }
    if (!comPropria && (estampas.length || permitida.padrao || permitida.imagem)) {
      const pedida = bruta.estampa ? String(bruta.estampa) : "";
      if (pedida && estampas.some(e => e.id === pedida)) escolhas.personalizacao.estampa = pedida;
      else if (pedida) erros.push("Essa estampa não está mais disponível. Escolha outra.");
      else if (config.estampas.obrigatoria && !bruta.estampaPropria) erros.push("Escolha a estampa.");
    }

    const quantidade = Number(qtd);
    const minima = config.qtdMinima || 1;
    if (!Number.isInteger(quantidade) || quantidade < minima || quantidade > QTD_MAXIMA) {
      erros.push(minima > 1 ? `Quantidade entre ${minima} e ${QTD_MAXIMA}.` : `Quantidade entre 1 e ${QTD_MAXIMA}.`);
    }

    return { ok: erros.length === 0, erros, escolhas };
  }

  function nomeDaLetra(id) {
    const l = LETRAS.find(x => x.id === id);
    return l ? l.nome : "";
  }

  function nomeDaArte(id) {
    const a = ARTES.find(x => x.id === id);
    return a ? a.nome : "";
  }

  function resumoDasEscolhas(produto, escolhas) {
    const config = produto.config || {};
    const linhas = [];
    for (const grupo of config.variacoes || []) {
      const opcao = opcaoEscolhida(grupo, escolhas);
      if (opcao) linhas.push({ rotulo: grupo.nome, valor: opcao.nome });
    }
    const marcados = new Set((escolhas && escolhas.adicionais) || []);
    for (const adicional of config.adicionais || []) if (marcados.has(adicional.id)) linhas.push({ rotulo: "Adicional", valor: adicional.nome });
    const pers = (escolhas && escolhas.personalizacao) || {};
    const campos = (config.personalizacao && config.personalizacao.campos) || {};
    for (const campo of CAMPOS_TEXTO) {
      if (pers[campo.id]) linhas.push({ rotulo: (campos[campo.id] && campos[campo.id].rotulo) || campo.rotulo, valor: pers[campo.id] });
    }
    const estampa = estampaEscolhida(produto, escolhas);
    if (estampa) linhas.push({ rotulo: "Estampa", valor: estampa.nome });
    else if (pers.estampaPropria) linhas.push({ rotulo: "Estampa", valor: descreverEstampaPropria(pers.estampaPropria) });
    if (pers.arte) linhas.push({ rotulo: "Arte", valor: nomeDaArte(pers.arte) });
    if (pers.letra) linhas.push({ rotulo: "Letra", valor: nomeDaLetra(pers.letra) });
    if (pers.fotos && pers.fotos.length) linhas.push({ rotulo: "Fotos", valor: String(pers.fotos.length) });
    if (config.personalizacao && config.personalizacao.ativa) {
      linhas.push({ rotulo: "Aprovar a arte pelo WhatsApp", valor: pers.aprovarWhatsApp === false ? "não" : "sim" });
    }
    return linhas;
  }

  function chaveDaLinha(id, escolhas) {
    const e = escolhas || {};
    const variacoes = Object.keys(e.variacoes || {}).sort().map(k => `${k}=${e.variacoes[k]}`).join(",");
    const adicionais = [...(e.adicionais || [])].sort().join(",");
    const pers = e.personalizacao || {};
    const fotos = (pers.fotos || []).map(f => `${f.id}:${f.x}:${f.y}:${f.zoom}`).join(",");
    const campos = ["nome", "frase", "data", "observacoes", "letra", "arte", "estampa"].map(k => `${k}=${pers[k] || ""}`).join("|");
    const propria = pers.estampaPropria ? JSON.stringify(pers.estampaPropria) : "";
    return `${id}#${variacoes}#${adicionais}#${campos}#${fotos}#${pers.aprovarWhatsApp === false ? 0 : 1}#${propria}`;
  }

  return {
    MOLDES, LETRAS, ARTES, CAMPOS_TEXTO, MAX_FOTOS, QTD_MAXIMA, QTD_CONDICAO_ESPECIAL, ID_ESTAMPA, MOLDES_COM_ESTAMPA,
    estampasDoProduto, estampaEscolhida, COBERTURA_DA_VOLTA, voltaDaPeca,
    MOTIVOS_DA_ESTAMPA, PALETA_DA_ESTAMPA, LIMITES_DA_ESTAMPA, ESTAMPA_PROPRIA_PADRAO,
    estampaPropriaPermitida, validarEstampaPropria, descreverEstampaPropria,
    MEDIDAS_DO_MOLDE, TAMANHO_MINIMO, TAMANHO_MAXIMO, medidaDoNome, normalizarTamanho, medidaDaPeca,
    round2, normalizarConfig, normalizarVariacoes, normalizarPersonalizacao,
    precoBase, precoUnitario, escolhasPadrao, validarEscolhas, resumoDasEscolhas, chaveDaLinha,
    nomeDaLetra, nomeDaArte,
  };
});
