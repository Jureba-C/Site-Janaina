import type { FotoEnviada } from "../tipos";

const locais = new Map<string, string>();

export function lembrarFotoLocal(id: string, arquivo: Blob) {
  if (typeof URL === "undefined" || !URL.createObjectURL) return;
  locais.set(id, URL.createObjectURL(arquivo));
}

export function urlDaFotoEnviada(foto: Pick<FotoEnviada, "id" | "chave">): string | null {
  return locais.get(foto.id) ?? `/api/personalizacao/fotos/${foto.id}?chave=${foto.chave}`;
}

export async function enviarFoto(arquivo: File): Promise<{ id: string; chave: string }> {
  const dados = new FormData();
  dados.append("foto", arquivo);
  let resposta: Response;
  try {
    resposta = await fetch("/api/personalizacao/fotos", { method: "POST", body: dados, credentials: "same-origin" });
  } catch {
    throw new Error("Sem conexão para enviar a foto. Confira a internet e tente de novo.");
  }
  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(corpo.error || "Não deu para enviar a foto. Tente de novo.");
  return { id: corpo.id, chave: corpo.chave };
}
