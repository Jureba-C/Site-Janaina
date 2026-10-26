import precosJs from "../../js/pricing.js";
import regrasJs from "../../js/regras-produto.js";
import type { ConfigProduto, Escolhas, LinhaResumo, Produto, RegrasPagamento } from "./tipos";

interface ProdutoDasRegras {
  price: number;
  config: ConfigProduto;
}

interface PlanoParcelas {
  count: number;
  value: number;
  interestFree: boolean;
  totalWithInterest: number;
}

interface Precos {
  PAYMENT_RULES: RegrasPagamento;
  round2(n: number): number;
  formatMoney(n: number): string;
  pixDiscountFor(n: number): number;
  pixPriceFor(n: number): number;
  installmentPlanFor(n: number): PlanoParcelas;
  installmentLabelFor(n: number): string;
}

interface Regras {
  LETRAS: { id: string; nome: string }[];
  ARTES: { id: string; nome: string }[];
  MAX_FOTOS: number;
  QTD_MAXIMA: number;
  QTD_CONDICAO_ESPECIAL: number;
  precoUnitario(produto: ProdutoDasRegras, escolhas: Escolhas, qtd: number): number;
  escolhasPadrao(produto: ProdutoDasRegras): Escolhas;
  validarEscolhas(produto: ProdutoDasRegras, escolhas: Escolhas, qtd: number): { ok: boolean; erros: string[]; escolhas: Escolhas };
  resumoDasEscolhas(produto: ProdutoDasRegras, escolhas: Escolhas): LinhaResumo[];
  chaveDaLinha(id: number, escolhas: Escolhas): string;
  nomeDaLetra(id: string): string;
  nomeDaArte(id: string): string;
}

export const precos = precosJs as unknown as Precos;
export const regras = regrasJs as unknown as Regras;

function paraRegras(produto: Produto): ProdutoDasRegras {
  return { price: produto.preco, config: produto.config };
}

export function precoUnitario(produto: Produto, escolhas: Escolhas, qtd: number): number {
  return regras.precoUnitario(paraRegras(produto), escolhas, qtd);
}

export function escolhasPadrao(produto: Produto): Escolhas {
  return regras.escolhasPadrao(paraRegras(produto));
}

export function validarEscolhas(produto: Produto, escolhas: Escolhas, qtd: number) {
  return regras.validarEscolhas(paraRegras(produto), escolhas, qtd);
}

export function resumoDasEscolhas(produto: Produto, escolhas: Escolhas): LinhaResumo[] {
  return regras.resumoDasEscolhas(paraRegras(produto), escolhas);
}

export function dinheiro(valor: number): string {
  return precos.formatMoney(valor).replace(/\B(?=(\d{3})+(?!\d),)/g, ".");
}

export function precoNoPix(valor: number): number {
  return precos.pixPriceFor(valor);
}

export function parcelas(valor: number): string {
  const plano = precos.installmentPlanFor(valor);
  if (plano.count <= 1) return "à vista no cartão";
  return `${plano.count}x de ${dinheiro(plano.value)}${plano.interestFree ? " sem juros" : ""}`;
}

export function linkWhatsApp(numero: string, texto?: string): string {
  if (!texto) return `https://wa.me/${numero}`;
  return `https://api.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(texto)}`;
}
