import { useSyncExternalStore } from "react";

export interface Usuario {
  nome: string;
  primeiroNome: string;
  email: string;
  cpf: string | null;
  cep: string | null;
  admin: boolean;
}

interface Sessao {
  usuario: Usuario | null;
  conferida: boolean;
}

const INICIAL: Sessao = { usuario: null, conferida: false };
let sessao: Sessao = INICIAL;
let pedida = false;
const ouvintes = new Set<() => void>();

function avisar() {
  for (const ouvinte of ouvintes) ouvinte();
}

async function conferir() {
  if (pedida || typeof window === "undefined") return;
  pedida = true;
  try {
    const resposta = await fetch("/api/auth/sessao", { credentials: "same-origin" });
    const u = resposta.ok ? (await resposta.json()).user : null;
    sessao = {
      conferida: true,
      usuario: u ? {
        nome: String(u.name || ""),
        primeiroNome: String(u.name || "").trim().split(/\s+/)[0] || "cliente",
        email: String(u.email || ""),
        cpf: u.cpf || null,
        cep: u.cep || null,
        admin: Boolean(u.isAdmin),
      } : null,
    };
  } catch {
    sessao = { usuario: null, conferida: true };
  }
  avisar();
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  conferir();
  return () => ouvintes.delete(ouvinte);
}

export function useSessao(): Sessao {
  return useSyncExternalStore(assinar, () => sessao, () => INICIAL);
}
