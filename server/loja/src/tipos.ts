export type IdCampo = "nome" | "frase" | "data" | "observacoes";
export type Molde = "caneca" | "xicara" | "garrafa" | "copo" | "azulejo" | "plano" | "botton" | "caixa" | "flor" | "foto" | "nenhum";

export interface Opcao {
  id: string;
  nome: string;
  preco: number;
  esgotado: boolean;
  hex?: string;
}

export interface GrupoVariacao {
  id: string;
  nome: string;
  previa: "alca" | "peca" | "tamanho" | null;
  opcoes: Opcao[];
}

export interface CampoTexto {
  ativo: boolean;
  obrigatorio: boolean;
  limite: number;
  rotulo: string;
}

export interface ConfigPersonalizacao {
  ativa: boolean;
  campos: Partial<Record<IdCampo, CampoTexto>>;
  letras: string[];
  artes: string[];
  fotos: { min: number; max: number; formato: "circulo" | "quadrado" };
  verso: boolean;
}

export interface AreaMolde {
  x: number;
  y: number;
  w: number;
  h: number;
  curva: boolean;
}

export interface ConfigProduto {
  categorias: string[];
  medida: string;
  codigo: string;
  cuidados: string;
  aviso: "ultimas" | "consultar" | null;
  molde: Molde;
  formato: string;
  corPeca: string;
  corAlca: string | null;
  magica: boolean;
  moldeFoto: { foto: string | null; area: AreaMolde | null } | null;
  variacoes: GrupoVariacao[];
  adicionais: Opcao[];
  faixas: { min: number; preco: number }[];
  qtdMinima: number;
  personalizacao: ConfigPersonalizacao;
  estampas?: { ativa: boolean; ids: string[]; obrigatoria: boolean };
}

export interface EstampaPublica {
  id: string;
  nome: string;
  colecao: string;
  preco: number;
  proporcao: number;
  miniatura: string;
  textura: string;
}

export interface ProdutoResumo {
  id: number;
  nome: string;
  preco: number;
  precoMinimo: number;
  aPartirDe: boolean;
  foto: string | null;
  selos: string[];
  esgotado: boolean;
  endereco: string;
  medida: string;
  molde: Molde;
  corPeca: string;
  corAlca: string | null;
  magica: boolean;
  formato: string;
  aviso: "ultimas" | "consultar" | null;
  personalizavel: boolean;
  qtdEstampas: number;
  estampaVitrine: EstampaPublica | null;
}

export interface Produto extends ProdutoResumo {
  fotos: string[];
  descricao: string | null;
  config: ConfigProduto;
  estampasDisponiveis: EstampaPublica[];
  categoriaPrincipal: { slug: string; nome: string } | null;
}

export interface Categoria {
  slug: string;
  nome: string;
  grupo: "tipo" | "ocasiao";
  quantidade: number;
}

export interface RegrasPagamento {
  pixDiscountPercent: number;
  maxInstallments: number;
  interestFreeInstallments: number;
  monthlyInterestRate: number;
  minInstallmentValue: number;
}

export interface Loja {
  nome: string;
  responsavel: string;
  whatsapp: string;
  whatsappFormatado: string;
  instagram: string;
  email: string;
  cnpj: string;
  cidade: string;
  prazoProducao: number | null;
  freteGratisAcima: number | null;
  regrasPagamento: RegrasPagamento;
  categorias: Categoria[];
  retirada: boolean;
}

export interface FotoDestaque {
  src: string;
  legenda: string;
  alt: string;
}

export interface Avaliacao {
  nota: number;
  texto: string;
  quem: string;
}

export interface CartaoDeAvaliacao {
  tipo: "avaliacao" | "depoimento";
  nota: number;
  texto: string;
  quem: string;
  produto?: string;
  origem?: string;
  foto: string | null;
}

export interface PaginaInicio {
  tipo: "inicio";
  destaques: FotoDestaque[];
  vitrines: { id: string; nome: string; produtos: ProdutoResumo[] }[];
  avaliacoes: { total: number; media: number; itens: CartaoDeAvaliacao[] };
}

export interface FiltrosCategoria {
  ordem: string;
  preco: string;
  outra: string;
}

export interface PaginaCategoria {
  tipo: "categoria";
  categoria: Categoria;
  produtos: ProdutoResumo[];
  total: number;
  pagina: number;
  paginas: number;
  filtros: FiltrosCategoria;
  outras: Categoria[];
}

export interface PaginaBusca {
  tipo: "busca";
  termo: string;
  favoritos: boolean;
  produtos: ProdutoResumo[];
}

export interface PaginaProduto {
  tipo: "produto";
  produto: Produto;
  extras: ProdutoResumo[];
  relacionados: ProdutoResumo[];
  avaliacoes: { total: number; media: number; itens: Avaliacao[] };
}

export type Pagina = PaginaInicio | PaginaCategoria | PaginaBusca | PaginaProduto;

export interface DadosDaPagina {
  loja: Loja;
  pagina: Pagina;
  caminho: string;
}

export interface FotoEnviada {
  id: string;
  chave: string;
  x: number;
  y: number;
  zoom: number;
}

export interface Personalizacao {
  nome?: string;
  frase?: string;
  data?: string;
  observacoes?: string;
  letra?: string;
  arte?: string;
  estampa?: string;
  fotos?: FotoEnviada[];
  aprovarWhatsApp?: boolean;
}

export interface Escolhas {
  variacoes: Record<string, string>;
  adicionais: string[];
  personalizacao: Personalizacao;
}

export interface LinhaResumo {
  rotulo: string;
  valor: string;
}
