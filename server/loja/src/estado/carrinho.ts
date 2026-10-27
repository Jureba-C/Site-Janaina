import { useSyncExternalStore } from "react";
import { regras } from "../compartilhado";
import type { ConfigProduto, Escolhas, EstampaPublica, LinhaResumo, Molde } from "../tipos";

export interface LinhaCarrinho {
  chave: string;
  id: number;
  qty: number;
  escolhas: Escolhas;
  nome: string;
  endereco: string;
  preco: number;
  foto: string | null;
  molde: Molde;
  corPeca: string;
  corAlca: string | null;
  resumo: LinhaResumo[];
  qtdMinima: number;
  config: ConfigProduto;
  estampa?: EstampaPublica | null;
  erro?: string;
}

interface Estado {
  linhas: LinhaCarrinho[];
  aberto: boolean;
  aviso: string | null;
}

export const CHAVE_CARRINHO = "arte_carrinho_v1";
const VAZIO: Estado = { linhas: [], aberto: false, aviso: null };

let estado: Estado = VAZIO;
let carregado = false;
const ouvintes = new Set<() => void>();

function avisar() {
  for (const ouvinte of ouvintes) ouvinte();
}

function lerDoNavegador(): LinhaCarrinho[] {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE_CARRINHO) || "[]");
    if (!Array.isArray(bruto)) return [];
    return bruto.filter((l): l is LinhaCarrinho => l && Number.isInteger(l.id) && Number.isInteger(l.qty) && typeof l.chave === "string");
  } catch {
    return [];
  }
}

function gravar() {
  try {
    localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(estado.linhas));
  } catch {
    estado = { ...estado, aviso: "Seu navegador não deixou guardar o carrinho. Ele some se você fechar a página." };
  }
}

function garantirCarregado() {
  if (carregado || typeof window === "undefined") return;
  carregado = true;
  estado = { ...estado, linhas: lerDoNavegador() };
  window.addEventListener("storage", evento => {
    if (evento.key !== CHAVE_CARRINHO) return;
    estado = { ...estado, linhas: lerDoNavegador() };
    avisar();
  });
}

function mudar(novo: Partial<Estado>, salvar = true) {
  estado = { ...estado, ...novo };
  if (salvar && novo.linhas) gravar();
  avisar();
}

export const carrinho = {
  ler(): Estado {
    garantirCarregado();
    return estado;
  },
  assinar(ouvinte: () => void) {
    garantirCarregado();
    ouvintes.add(ouvinte);
    return () => ouvintes.delete(ouvinte);
  },
  adicionar(linha: Omit<LinhaCarrinho, "chave">) {
    garantirCarregado();
    const chave = regras.chaveDaLinha(linha.id, linha.escolhas);
    const existente = estado.linhas.find(l => l.chave === chave);
    const linhas = existente
      ? estado.linhas.map(l => (l.chave === chave ? { ...l, qty: Math.min(regras.QTD_MAXIMA, l.qty + linha.qty), erro: undefined } : l))
      : [...estado.linhas, { ...linha, chave }];
    mudar({ linhas, aberto: true });
  },
  quantidade(chave: string, qty: number) {
    const linhas = estado.linhas.map(l => (l.chave === chave ? { ...l, qty: Math.min(regras.QTD_MAXIMA, Math.max(l.qtdMinima || 1, qty)) } : l));
    mudar({ linhas });
  },
  remover(chave: string) {
    mudar({ linhas: estado.linhas.filter(l => l.chave !== chave) });
  },
  atualizar(atualizadas: LinhaCarrinho[]) {
    mudar({ linhas: atualizadas });
  },
  esvaziar() {
    mudar({ linhas: [] });
  },
  abrir() {
    mudar({ aberto: true }, false);
  },
  fechar() {
    mudar({ aberto: false }, false);
  },
};

export function useCarrinho(): Estado {
  return useSyncExternalStore(carrinho.assinar, carrinho.ler, () => VAZIO);
}

export function totalDeItens(linhas: LinhaCarrinho[]): number {
  return linhas.reduce((soma, l) => soma + l.qty, 0);
}

export function subtotal(linhas: LinhaCarrinho[]): number {
  return Math.round(linhas.reduce((soma, l) => soma + l.preco * l.qty, 0) * 100) / 100;
}
