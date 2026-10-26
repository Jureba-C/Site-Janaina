import { useSyncExternalStore } from "react";

const CHAVE = "arte_favoritos_v1";
const VAZIO: number[] = [];
let lista: number[] = VAZIO;
let carregado = false;
const ouvintes = new Set<() => void>();

function carregar() {
  if (carregado || typeof window === "undefined") return;
  carregado = true;
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE) || "[]");
    lista = Array.isArray(bruto) ? bruto.filter(n => Number.isInteger(n)) : VAZIO;
  } catch {
    lista = VAZIO;
  }
}

function assinar(ouvinte: () => void) {
  carregar();
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

function ler() {
  carregar();
  return lista;
}

function alternar(id: number) {
  lista = lista.includes(id) ? lista.filter(x => x !== id) : [...lista, id];
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    lista = [...lista];
  }
  for (const ouvinte of ouvintes) ouvinte();
}

export function useFavoritos() {
  const favoritos = useSyncExternalStore(assinar, ler, () => VAZIO);
  return { favoritos, alternar };
}
