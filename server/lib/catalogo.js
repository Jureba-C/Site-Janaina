const db = require("./db.js");
const regras = require("../js/regras-produto.js");
const { buildPackage } = require("./empacotamento.js");

const CORES_ALCA = [
  { nome: "Azul claro", hex: "#6EC6EA" },
  { nome: "Azul", hex: "#1E78C8" },
  { nome: "Azul-marinho", hex: "#1F2E6B" },
  { nome: "Rosa", hex: "#F2A7BE" },
  { nome: "Vermelho", hex: "#D7262E" },
  { nome: "Laranja", hex: "#F07A22" },
  { nome: "Vinho", hex: "#6E1F2E" },
  { nome: "Preto", hex: "#1E1E1E" },
  { nome: "Amarelo", hex: "#F6CF2E" },
  { nome: "Verde", hex: "#1E7A3E" },
  { nome: "Verde-limão", hex: "#9ACD32" },
];

const CUIDADOS_PORCELANA = "Pode ir ao micro-ondas e à lava-louças com sabão neutro. Evite esponja abrasiva na arte. A cor pode variar um pouco da tela.";
const CUIDADOS_MAGICA = "Lave à mão, sem esponja abrasiva. Não use no micro-ondas nem na lava-louças, para a arte continuar aparecendo com o calor.";
const CUIDADOS_VIDRO = "Lave à mão, com esponja macia. Não vai ao micro-ondas.";
const CUIDADOS_GARRAFA = "Lave à mão, com esponja macia e sabão neutro. Não vai ao micro-ondas, ao freezer nem à lava-louças.";

const PERSONALIZACAO_PECA = {
  ativa: true,
  campos: {
    nome: { ativo: true, obrigatorio: false, limite: 20, rotulo: "Nome na frente" },
    frase: { ativo: true, obrigatorio: false, limite: 60, rotulo: "Frase no verso" },
    data: { ativo: true, obrigatorio: false, limite: 20, rotulo: "Data" },
    observacoes: { ativo: true, obrigatorio: false, limite: 300, rotulo: "Observações para a Janaina" },
  },
  letras: ["cursiva", "classica", "delicada"],
  artes: ["nome", "flor", "brasilia", "fotos"],
  fotos: { min: 0, max: 8, formato: "circulo" },
  verso: true,
};

const PERSONALIZACAO_PLANA = {
  ...PERSONALIZACAO_PECA,
  campos: {
    nome: { ativo: true, obrigatorio: false, limite: 30, rotulo: "Nome" },
    frase: { ativo: true, obrigatorio: false, limite: 80, rotulo: "Frase" },
    data: { ativo: true, obrigatorio: false, limite: 20, rotulo: "Data" },
    observacoes: { ativo: true, obrigatorio: false, limite: 300, rotulo: "Observações para a Janaina" },
  },
  fotos: { min: 0, max: 8, formato: "quadrado" },
  verso: false,
};

const PERSONALIZACAO_SO_NOME = {
  ativa: true,
  campos: {
    nome: { ativo: true, obrigatorio: false, limite: 30, rotulo: "Nome ou frase" },
    observacoes: { ativo: true, obrigatorio: false, limite: 300, rotulo: "Observações para a Janaina" },
  },
  letras: ["cursiva", "classica", "delicada"],
  artes: [],
  fotos: { min: 0, max: 1, formato: "circulo" },
  verso: false,
};

const SEM_PERSONALIZACAO = { ativa: false };

function opcoes(lista){
  return lista.map(o => (typeof o === "string" ? { nome: o } : o));
}

function cores(lista){
  return opcoes(lista).map(o => {
    const conhecida = CORES_ALCA.find(c => c.nome.toLowerCase() === String(o.nome).toLowerCase());
    return { ...o, hex: o.hex || (conhecida ? conhecida.hex : undefined) };
  });
}

function grupoCor(nome, lista, previa){
  return { id: "cor", nome, previa: previa || "alca", opcoes: cores(lista) };
}

function grupoModelo(nome, lista, previa){
  return { id: "modelo", nome: nome || "Modelo", previa: previa || null, opcoes: opcoes(lista) };
}

const CAIXA_CANECA = { largura: 12, altura: 12, comprimento: 12 };
const CAIXA_XICARA = { largura: 12, altura: 10, comprimento: 12 };
const CAIXA_GARRAFA = { largura: 10, altura: 28, comprimento: 10 };
const CAIXA_COPO = { largura: 12, altura: 16, comprimento: 12 };
const CAIXA_PEQUENA = { largura: 15, altura: 6, comprimento: 15 };

const TAMPA_BAMBU = { id: "tampa-bambu", nome: "Tampa de bambu", preco: 18 };

function caneca(nome, ml, preco, extra = {}){
  return {
    name: nome, price: preco,
    config: {
      categorias: ["canecas", "aniversario", "dia-das-maes", "dia-dos-pais", "namorados", "professores", "empresas"],
      medida: ml ? `${ml} ml` : "",
      molde: "caneca",
      cuidados: CUIDADOS_PORCELANA,
      adicionais: [TAMPA_BAMBU],
      personalizacao: PERSONALIZACAO_PECA,
      peso: 0.45, caixa: CAIXA_CANECA,
      ...extra,
    },
  };
}

function vidro(nome, ml, preco, extra = {}){
  return {
    name: nome, price: preco,
    config: {
      categorias: ["vidros-e-copos", "aniversario", "dia-dos-pais", "empresas", "namorados"],
      medida: ml ? `${ml} ml` : "",
      molde: "copo",
      cuidados: CUIDADOS_VIDRO,
      personalizacao: { ...PERSONALIZACAO_PECA, artes: ["nome", "flor", "brasilia"], fotos: { min: 0, max: 0 } },
      peso: 0.45, caixa: CAIXA_COPO,
      ...extra,
    },
  };
}

function xicara(nome, medida, preco, extra = {}){
  return {
    name: nome, price: preco,
    config: {
      categorias: ["xicaras-e-kits", "casamento", "padrinhos", "dia-das-maes", "aniversario"],
      medida,
      molde: "xicara",
      cuidados: CUIDADOS_PORCELANA,
      personalizacao: PERSONALIZACAO_PECA,
      peso: 0.3, caixa: CAIXA_XICARA,
      ...extra,
    },
  };
}

function garrafa(nome, ml, preco, extra = {}){
  return {
    name: nome, price: preco,
    config: {
      categorias: ["garrafas-e-termicos", "professores", "empresas", "dia-dos-pais", "aniversario"],
      medida: ml ? `${ml} ml` : "",
      molde: "garrafa",
      corPeca: "#D9DCDF",
      cuidados: CUIDADOS_GARRAFA,
      personalizacao: PERSONALIZACAO_PECA,
      peso: 0.4, caixa: CAIXA_GARRAFA,
      ...extra,
    },
  };
}

function lembranca(nome, preco, molde, extra = {}){
  return {
    name: nome, price: preco,
    config: {
      categorias: ["lembrancas", "aniversario", "dia-das-maes", "namorados"],
      molde,
      personalizacao: PERSONALIZACAO_PLANA,
      peso: 0.25, caixa: CAIXA_PEQUENA,
      ...extra,
    },
  };
}

function acessorio(nome, preco, molde, extra = {}){
  return {
    name: nome, price: preco,
    config: {
      categorias: ["acessorios-e-embalagens"],
      molde,
      personalizacao: SEM_PERSONALIZACAO,
      peso: 0.15, caixa: CAIXA_PEQUENA,
      ...extra,
    },
  };
}

function botton(nome, medida, preco, precoAtacado, extra = {}){
  return {
    name: nome, price: preco,
    config: {
      categorias: ["lembrancas", "empresas", "aniversario", "professores"],
      medida,
      molde: "botton",
      faixas: [{ min: 11, preco: precoAtacado }],
      qtdMinima: 3,
      personalizacao: { ...PERSONALIZACAO_PLANA, fotos: { min: 0, max: 1, formato: "circulo" }, campos: { nome: { ativo: true, limite: 30, rotulo: "Nome ou frase" }, observacoes: { ativo: true, limite: 300, rotulo: "Observações para a Janaina" } } },
      peso: 0.02, caixa: { largura: 10, altura: 3, comprimento: 10 },
      ...extra,
    },
  };
}

const LISTA = [
  caneca("Caneca porcelana branca", 325, 40, { codigo: "CAN-BRA-325", fotos: ["/img/provisorias/caneca-rostinhos.jpg", "/img/provisorias/caneca-caixa-presente.jpg"], badges: ["Mais pedida"], estampas: { ativa: true, ids: [], obrigatoria: false } }),
  caneca("Caneca alça e dentro colorida", 325, 45, { codigo: "CAN-COR-325", fotos: ["/img/provisorias/canecas-alca-colorida.jpg"], badges: ["11 cores"], variacoes: [grupoCor("Cor da alça e do interior", CORES_ALCA.map(c => c.nome))] }),
  caneca("Caneca 100% preta", 325, 50, { codigo: "CAN-PRE-325", corPeca: "#232120", corAlca: "#232120" }),
  caneca("Caneca mini branca", 180, 42, { codigo: "CAN-MIN-180" }),
  caneca("Caneca Imperial", 325, 50, { codigo: "CAN-IMP-325", formato: "imperial", variacoes: [grupoCor("Cor da alça e do interior", ["Verde", "Vermelho", "Azul", "Amarelo"])] }),
  caneca("Caneca Perla", 280, 60, { codigo: "CAN-PER-280", formato: "perla" }),
  caneca("Caneca alça e borda dourada", 440, 90, { codigo: "CAN-DOU-440", corAlca: "#C9A24B" }),
  caneca("Caneca Perla base quadrada roxa", 240, 50, { codigo: "CAN-PRQ-240", formato: "perla", corAlca: "#6B3F8F", aviso: "ultimas" }),
  caneca("Caneca borda dourada colorida", 280, 60, { codigo: "CAN-BDC-280", variacoes: [grupoCor("Cor", [{ nome: "Verde", hex: "#7FB59A" }, { nome: "Amarela", hex: "#EFD27A" }, { nome: "Rosé", hex: "#E8B4B0" }], "peca")] }),
  caneca("Caneca colorida com colher", 320, 55, { codigo: "CAN-COL-320", variacoes: [grupoModelo("Base", ["Cônica", "Reta"])], cuidados: CUIDADOS_PORCELANA + " Cores disponíveis: confirme com a Janaina." }),
  caneca("Caneca Candy Color areia fosco", 325, 55, { codigo: "CAN-CAN-325", variacoes: [grupoCor("Cor", [{ nome: "Azul", hex: "#A9CFE6" }, { nome: "Rosa", hex: "#F3C1CB" }, { nome: "Verde-água", hex: "#A8DCCB" }], "peca")] }),
  caneca("Caneca com tampa e base de silicone", 365, 60, { codigo: "CAN-SIL-365", adicionais: [], variacoes: [grupoModelo("Alça", ["Tradicional", { nome: "Coração", esgotado: true }])] }),
  caneca("Caneca alça coração", 325, 55, { codigo: "CAN-COR-ALC", formato: "coracao", corAlca: "#F2A7BE" }),
  caneca("Caneca de polímero", null, 30, { codigo: "CAN-POL", medida: "plástico resistente", categorias: ["canecas", "aniversario", "professores", "empresas"], variacoes: [grupoModelo("Cor", ["Branca", { nome: "Colorida", preco: 5 }])] }),
  caneca("Caneca mágica tradicional fosca", 325, 55, { codigo: "CAN-MAG-325", magica: true, corPeca: "#2A2827", corAlca: "#2A2827", cuidados: CUIDADOS_MAGICA, badges: ["Mágica"] }),
  caneca("Caneca mágica colorida com colher", 325, 65, { codigo: "CAN-MAC-325", magica: true, corPeca: "#2A2827", corAlca: "#2A2827", cuidados: CUIDADOS_MAGICA }),
  caneca("Caneca Glow com glitter", 325, 55, { codigo: "CAN-GLO-325", aviso: "ultimas" }),
  caneca("Caneca branca com faixa de glitter", 325, 55, { codigo: "CAN-FGL-325", aviso: "ultimas" }),
  caneca("Caneca perolada", 325, 50, { codigo: "CAN-PRL-325", corPeca: "#F4EFE6" }),
  caneca("Caneca neon", 325, 50, { codigo: "CAN-NEO-325", cuidados: CUIDADOS_PORCELANA + " Rosa e laranja estão esgotadas; confira as outras cores com a Janaina." }),
  caneca("Caneca espelhada", 325, 55, { codigo: "CAN-ESP-325", corPeca: "#C9CDD2", aviso: "ultimas" }),
  { ...caneca("Caneca tigela", 480, 60, { codigo: "CAN-TIG-480" }), soldOut: true },

  vidro("Caneca de vidro", 325, 47, { codigo: "VID-CAN-325", molde: "caneca", corPeca: "#EEF1F2", variacoes: [grupoModelo("Modelo", ["Jateada com alça coração", "Transparente"])] }),
  vidro("Mason Jar", 400, 55, { codigo: "VID-MAS-400", formato: "mason" }),
  vidro("Copo jateado com tampa de bambu e canudo", 400, 60, { codigo: "VID-JAT-400", formato: "jateado" }),
  vidro("Copo de vidro com tampa de bambu e canudo", 400, 70, { codigo: "VID-TRA-400" }),
  vidro("Caneca de chopp", 445, 60, { codigo: "VID-CHO-445", formato: "chopp", badges: ["Dia dos Pais"] }),
  vidro("Copo de cerveja", 370, 55, { codigo: "VID-CER-370", formato: "cerveja", variacoes: [grupoModelo("Modelo", ["Jateado", { nome: "Transparente", esgotado: true }])] }),
  vidro("Copo de whisky", 250, 40, { codigo: "VID-WHI-250", formato: "whisky" }),

  xicara("Xícara Ipês Brasília", "150 ml", 42, { codigo: "XIC-IPE-150", categorias: ["xicaras-e-kits", "ipes-brasilia", "brasilia", "casamento", "padrinhos"], fotos: ["/img/provisorias/xicara-ipes.jpg", "/img/provisorias/xicara-catedral.jpg"], badges: ["Coleção Brasília"] }),
  xicara("Torre de xícaras Ipês", "150 ml cada", 95, { codigo: "XIC-TOR", categorias: ["xicaras-e-kits", "ipes-brasilia", "brasilia", "padrinhos", "casamento"], badges: ["Preferida dos padrinhos"], variacoes: [grupoModelo("Quantidade", ["Com 2 xícaras", { nome: "Com 4 xícaras", preco: 65 }])], peso: 0.8, caixa: { largura: 14, altura: 30, comprimento: 14 } }),
  xicara("Xícara off white empilhável", "200 ml", 35, { codigo: "XIC-OFF-200", corPeca: "#F3EEE4", fotos: ["/img/provisorias/xicaras-casamento.jpg"] }),
  xicara("Kit xícara com pires", "75 a 180 ml", 55, { codigo: "XIC-KIT", variacoes: [grupoModelo("Kit", ["Mini 75 ml", "Expresso 88 ml", "Duplo 180 ml", { nome: "Completo 177 ml com colher", preco: 5 }])] }),
  xicara("Xícara mágica com pires", "90 ml", 55, { codigo: "XIC-MAG-90", magica: true, corPeca: "#2A2827", cuidados: CUIDADOS_MAGICA }),
  xicara("Xícara Petit fosca com pires", "90 ml", 60, { codigo: "XIC-PET-90", variacoes: [grupoCor("Cor", [{ nome: "Marrom", hex: "#8A6A55" }, { nome: "Verde claro", hex: "#B9D3B4" }, { nome: "Rosa claro", hex: "#F0CFCF" }], "peca")] }),

  garrafa("Garrafa de alumínio 2 bicos", 600, 50, { codigo: "GAR-AL2-600" }),
  garrafa("Garrafa de alumínio básica", 500, 55, { codigo: "GAR-ALB-500", fotos: ["/img/provisorias/garrafa-professores.jpg"], badges: ["Volta às aulas"] }),
  garrafa("Garrafa de alumínio esportiva", 600, 60, { codigo: "GAR-ALE-600" }),
  garrafa("Garrafa de alumínio com mosquetão", 500, 40, { codigo: "GAR-ALM-500" }),
  garrafa("Garrafa inox prata", 500, 60, { codigo: "GAR-INX-500", fotos: ["/img/provisorias/garrafa-inox-brasilia.jpg"] }),
  garrafa("Garrafa inox prata compacta", 400, 68, { codigo: "GAR-INX-400", aviso: "ultimas" }),
  garrafa("Garrafa térmica", 500, 120, { codigo: "GAR-TER-500", variacoes: [grupoCor("Cor", [{ nome: "Prata", hex: "#C9CDD2" }, { nome: "Branca", hex: "#F4F4F2" }], "peca")] }),
  garrafa("Garrafa térmica com glitter", 500, 130, { codigo: "GAR-GLI-500", variacoes: [grupoCor("Cor", [{ nome: "Dourada", hex: "#D8B868" }, { nome: "Rosa", hex: "#EDB3C3" }, { nome: "Prata", hex: "#C9CDD2" }], "peca")] }),
  garrafa("Garrafa infantil de alumínio com bico automático", 500, 60, { codigo: "GAR-INF-500", categorias: ["garrafas-e-termicos", "professores", "aniversario"] }),
  garrafa("Garrafa térmica com tampa de bambu", 600, 140, { codigo: "GAR-BAM-600" }),
  garrafa("Garrafa térmica com porta-celular", 600, 95, { codigo: "GAR-CEL-600" }),
  garrafa("Garrafa térmica rosa fosco", 500, 120, { codigo: "GAR-ROS-500", corPeca: "#E7B9C1" }),
  garrafa("Garrafa térmica 900 ml com porta-celular", 900, 139, { codigo: "GAR-900", variacoes: [grupoCor("Cor", [{ nome: "Rosa claro", hex: "#F0CFCF" }, { nome: "Branca", hex: "#F4F4F2" }], "peca")], peso: 0.55 }),
  garrafa("Garrafa de vidro com difusor para chá", 300, 110, { codigo: "GAR-CHA-300", medida: "300 ml · parede dupla", variacoes: [grupoCor("Cor", [{ nome: "Azul", hex: "#7FA9D6" }, { nome: "Dourado", hex: "#D8B868" }, { nome: "Verde", hex: "#8FBF9A" }], "peca")] }),
  garrafa("Copo térmico com encaixe para carro", 750, 110, { codigo: "GAR-CAR-750", formato: "copo-termico" }),
  garrafa("Caneca inox com tampa", 250, 60, { codigo: "GAR-CIN-250", molde: "caneca", corPeca: "#C9CDD2", caixa: CAIXA_CANECA, peso: 0.35 }),

  {
    name: "Ipê Brasília artesanal", price: 40,
    fotos: ["/img/provisorias/ipe-amarelo.jpg", "/img/provisorias/ipe-roxo.jpg"],
    badges: ["Feito à mão"],
    config: {
      categorias: ["ipes-brasilia", "brasilia", "lembrancas", "casamento", "empresas"],
      medida: "fio náutico e base de madeira", codigo: "IPE",
      molde: "flor",
      cuidados: "Peça feita à mão, em fio náutico e base de madeira. Mantenha longe da umidade.",
      variacoes: [grupoModelo("Tamanho", ["P · 15 cm", { nome: "M · 30 cm", preco: 50 }, { nome: "G · 37 cm", preco: 110 }], "tamanho")],
      personalizacao: SEM_PERSONALIZACAO,
      peso: 0.3, caixa: { largura: 20, altura: 40, comprimento: 20 },
    },
  },

  lembranca("Azulejo personalizado com suporte", 30, "azulejo", { codigo: "AZU", medida: "10×10, 15×15 ou 20×20 cm", variacoes: [grupoModelo("Tamanho", ["10×10 cm", { nome: "15×15 cm", preco: 8 }, { nome: "20×20 cm", preco: 12 }], "tamanho")], cuidados: "Limpe com pano úmido. O suporte acompanha.", peso: 0.4, caixa: { largura: 22, altura: 6, comprimento: 22 } }),
  lembranca("Base de madeira com mini buquê", 17, "flor", { codigo: "AZU-BAS", categorias: ["lembrancas", "acessorios-e-embalagens"], medida: "para azulejo 15×15", personalizacao: SEM_PERSONALIZACAO }),
  lembranca("Chaveiro de acrílico", 10, "botton", { codigo: "CHA-ACR", variacoes: [grupoModelo("Modelo", ["Quadrado", { nome: "Com tessel", preco: 5 }])], peso: 0.03 }),
  lembranca("Potinho do amor", 30, "caixa", { codigo: "POT-AMO", medida: "3 fotos, flores secas e sacola", categorias: ["lembrancas", "namorados", "dia-das-maes"], personalizacao: { ...PERSONALIZACAO_PLANA, artes: [], fotos: { min: 3, max: 3, formato: "quadrado" } } }),
  lembranca("Espelho de bolsa", 29, "botton", { codigo: "ESP-BOL", medida: "7×7 cm", peso: 0.05 }),
  lembranca("Quebra-cabeça personalizado", 20, "plano", { codigo: "QUE", variacoes: [grupoModelo("Peças", ["24 peças", { nome: "48 peças", preco: 10 }, { nome: "60 peças", preco: 20 }])] }),
  lembranca("Mousepad personalizado", 25, "plano", { codigo: "MOU", categorias: ["lembrancas", "empresas", "professores", "dia-dos-pais"], variacoes: [grupoModelo("Modelo", ["Retangular", { nome: "Com apoio", preco: 10 }, { nome: "Ergonômico", preco: 12 }])] }),
  lembranca("Toalhinha de lavabo", 18, "plano", { codigo: "TOA", medida: "bordado com nome", personalizacao: { ...PERSONALIZACAO_SO_NOME, fotos: { min: 0, max: 0 } } }),
  lembranca("Máscara de neoprene", 25, "plano", { codigo: "MAS" }),
  lembranca("Mini polaroid de mesa", 40, "plano", { codigo: "POL", medida: "8×10 cm", personalizacao: { ...PERSONALIZACAO_PLANA, artes: ["fotos"], fotos: { min: 1, max: 1, formato: "quadrado" } } }),

  botton("Botton broche pequeno", "3,2 cm", 4, 3.5, { codigo: "BOT-P" }),
  botton("Botton broche médio", "4,4 cm", 5, 4.5, { codigo: "BOT-M" }),
  botton("Botton broche grande", "5,5 cm", 6.5, 5.5, { codigo: "BOT-G" }),
  botton("Ímã de botton", "5,5 cm", 5.5, 4.5, { codigo: "BOT-IMA" }),
  botton("Chaveiro abridor de garrafa", "4,4 cm", 12, 10, { codigo: "BOT-ABR", categorias: ["lembrancas", "empresas", "dia-dos-pais"] }),

  acessorio("Tampa de bambu para caneca", 18, "caixa", { codigo: "ACE-TAM" }),
  acessorio("Pires de madeira", 17, "caixa", { codigo: "ACE-PIR" }),
  acessorio("Mini coador", 25, "caixa", { codigo: "ACE-COA" }),
  acessorio("Difusor de chá com saquinho de algodão", 15, "caixa", { codigo: "ACE-DIF" }),
  acessorio("Mini buquê de flores secas", 8, "flor", { codigo: "ACE-BUQ", categorias: ["acessorios-e-embalagens", "namorados", "dia-das-maes"] }),
  acessorio("Base para azulejo", 17, "caixa", { codigo: "ACE-BAZ" }),
  acessorio("Tessel para chaveiro", 5, "caixa", { codigo: "ACE-TES", peso: 0.01 }),
  acessorio("Caixa de MDF com tampa personalizada", 35, "caixa", { codigo: "ACE-MDF", personalizacao: PERSONALIZACAO_SO_NOME, variacoes: [grupoModelo("Tamanho", ["15×15 cm", { nome: "20×20 cm", preco: 5 }])], peso: 0.35, caixa: { largura: 22, altura: 12, comprimento: 22 } }),
  acessorio("Caixa de presente", 10, "caixa", { codigo: "ACE-CXP", fotos: ["/img/provisorias/caneca-caixa-presente.jpg"], variacoes: [grupoModelo("Tamanho", ["13×13 cm", { nome: "17×17 cm", preco: 2 }, { nome: "25×25 cm", preco: 7 }])], peso: 0.12, caixa: { largura: 26, altura: 8, comprimento: 26 } }),
  acessorio("Cesta de presente", 35, "caixa", { codigo: "ACE-CES", medida: "12×24×16 cm", peso: 0.3, caixa: { largura: 24, altura: 16, comprimento: 12 } }),
];

const MOLDE_DA_CATEGORIA = {
  "canecas": "caneca",
  "xicaras-e-kits": "xicara",
  "vidros-e-copos": "copo",
  "garrafas-e-termicos": "garrafa",
  "ipes-brasilia": "flor",
  "lembrancas": "plano",
  "acessorios-e-embalagens": "caixa",
};

function configPadrao(categoria){
  const molde = MOLDE_DA_CATEGORIA[categoria] || "caneca";
  const modelo = {
    caneca: caneca("", 325, 0).config,
    xicara: xicara("", "", 0).config,
    copo: vidro("", 0, 0).config,
    garrafa: garrafa("", 0, 0).config,
    plano: lembranca("", 0, "plano").config,
    flor: { ...acessorio("", 0, "flor").config },
    caixa: acessorio("", 0, "caixa").config,
  }[molde];
  const { fotos, badges, codigo, ...resto } = modelo;
  return regras.normalizarConfig({ ...resto, medida: "", adicionais: molde === "caneca" ? resto.adicionais : [], categorias: categoria ? [categoria] : [] });
}

const PRODUCTS = {};
LISTA.forEach((bruto, i) => {
  const { fotos, badges, ...restoConfig } = bruto.config;
  PRODUCTS[i + 1] = {
    name: bruto.name,
    price: bruto.price,
    photos: bruto.fotos || fotos || [],
    badges: bruto.badges || badges || [],
    soldOut: Boolean(bruto.soldOut),
    config: regras.normalizarConfig(restoConfig),
  };
});

const BUILTIN_CATEGORIES = [
  { slug: "canecas", label: "Canecas", grupo: "tipo" },
  { slug: "xicaras-e-kits", label: "Xícaras e kits", grupo: "tipo" },
  { slug: "vidros-e-copos", label: "Vidros e copos", grupo: "tipo" },
  { slug: "garrafas-e-termicos", label: "Garrafas e térmicos", grupo: "tipo" },
  { slug: "ipes-brasilia", label: "Ipês Brasília", grupo: "tipo" },
  { slug: "lembrancas", label: "Lembranças", grupo: "tipo" },
  { slug: "acessorios-e-embalagens", label: "Acessórios e embalagens", grupo: "tipo" },
  { slug: "casamento", label: "Casamento", grupo: "ocasiao" },
  { slug: "padrinhos", label: "Padrinhos", grupo: "ocasiao" },
  { slug: "dia-das-maes", label: "Dia das Mães", grupo: "ocasiao" },
  { slug: "dia-dos-pais", label: "Dia dos Pais", grupo: "ocasiao" },
  { slug: "professores", label: "Professores", grupo: "ocasiao" },
  { slug: "empresas", label: "Empresas", grupo: "ocasiao" },
  { slug: "aniversario", label: "Aniversário", grupo: "ocasiao" },
  { slug: "namorados", label: "Namorados", grupo: "ocasiao" },
  { slug: "brasilia", label: "Brasília", grupo: "ocasiao" },
];
const PRODUCT_CATEGORIES = BUILTIN_CATEGORIES.map(c => c.slug);
const PRODUCT_BADGES = ["Mais pedida", "Novidade", "Coleção Brasília", "Preferida dos padrinhos", "11 cores", "Mágica", "Feito à mão", "Volta às aulas", "Dia dos Pais", "Dia das Mães", "Com fotos"];

const CUSTOM_PRODUCT_ID_START = 1000;

const CATEGORIAS_APOSENTADAS = [];

function getAllCategories(){
  const lista = [
    ...BUILTIN_CATEGORIES.map(c => ({ ...c, builtin: true })),
    ...db.listCustomCategories().map(c => ({ slug: c.slug, label: c.label, grupo: c.grupo === "ocasiao" ? "ocasiao" : "tipo", builtin: false })),
  ];
  const vistos = new Set();
  return lista.filter(c => (vistos.has(c.slug) ? false : vistos.add(c.slug)));
}
function isValidCategorySlug(slug){
  return getAllCategories().some(c => c.slug === slug);
}

function categoriasEmUso(){
  const overridesMap = getProductOverridesMap();
  const usadas = new Set();
  for (const id of getAllProductIds()) {
    const p = effectiveProduct(id, overridesMap);
    for (const cat of p?.config?.categorias || []) usadas.add(cat);
  }
  return usadas;
}

function getProductOverridesMap(){
  const map = new Map();
  for(const row of db.listProductOverrides()) map.set(row.product_id, row);
  return map;
}
function getAllProductIds(){
  const baseOrder = [...Object.keys(PRODUCTS).map(Number), ...db.listCustomProducts().map(p => p.id)];
  const sortOrderById = new Map();
  for(const row of db.listProductOverrides()){
    if(row.sort_order != null) sortOrderById.set(row.product_id, row.sort_order);
  }
  for(const p of db.listCustomProducts()){
    if(p.sort_order != null) sortOrderById.set(p.id, p.sort_order);
  }
  if(sortOrderById.size === 0) return baseOrder;
  return baseOrder
    .map((id, baseIndex) => ({ id, baseIndex, pos: sortOrderById.get(id) }))
    .sort((a, b) => {
      if(a.pos == null && b.pos == null) return a.baseIndex - b.baseIndex;
      if(a.pos == null) return 1;
      if(b.pos == null) return -1;
      return a.pos - b.pos || a.baseIndex - b.baseIndex;
    })
    .map(item => item.id);
}
function photosFromRow(row){
  return row.photos != null ? JSON.parse(row.photos) : (row.photo_url ? [row.photo_url] : []);
}
function configDaLinha(row){
  if(!row?.config_json) return null;
  try { return JSON.parse(row.config_json); } catch { return null; }
}
function comCategoriaPrincipal(produto){
  return { ...produto, category: produto.config.categorias[0] || null };
}
function effectiveProduct(id, overridesMap){
  if(id >= CUSTOM_PRODUCT_ID_START){
    const custom = db.getCustomProduct(id);
    if(!custom) return null;
    const photos = photosFromRow(custom);
    const salva = configDaLinha(custom);
    const config = regras.normalizarConfig(salva || {
      categorias: custom.category ? [custom.category] : [],
      peso: custom.weight,
      caixa: { largura: custom.width, altura: custom.height, comprimento: custom.length },
    });
    return comCategoriaPrincipal({
      name: custom.name, price: custom.price,
      photos, photoUrl: photos[0] || null,
      badges: custom.badges ? JSON.parse(custom.badges) : [],
      description: custom.description || null,
      hidden: Boolean(custom.hidden),
      soldOut: Boolean(custom.sold_out),
      config,
    });
  }
  const base = PRODUCTS[id];
  if(!base) return null;
  const override = overridesMap.get(id);
  if(!override){
    return comCategoriaPrincipal({ ...base, photoUrl: base.photos[0] || null, description: null, hidden: false });
  }
  const photos = override.photos != null || override.photo_url ? photosFromRow(override) : base.photos;
  const salva = configDaLinha(override);
  return comCategoriaPrincipal({
    ...base,
    name: override.name || base.name,
    price: override.price != null ? override.price : base.price,
    photos, photoUrl: photos[0] || null,
    badges: override.badges ? JSON.parse(override.badges) : base.badges,
    description: override.description || null,
    hidden: Boolean(override.hidden),
    soldOut: override.sold_out != null ? Boolean(override.sold_out) : base.soldOut,
    config: salva ? regras.normalizarConfig(salva) : base.config,
  });
}

module.exports = {
  CORES_ALCA,
  MOLDE_DA_CATEGORIA,
  configPadrao,
  buildPackage,
  PRODUCTS,
  BUILTIN_CATEGORIES,
  PRODUCT_CATEGORIES,
  PRODUCT_BADGES,
  CUSTOM_PRODUCT_ID_START,
  CATEGORIAS_APOSENTADAS,
  categoriasEmUso,
  getAllCategories,
  isValidCategorySlug,
  getProductOverridesMap,
  getAllProductIds,
  photosFromRow,
  effectiveProduct,
};
