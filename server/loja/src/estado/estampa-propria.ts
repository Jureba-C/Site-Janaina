import { geradorDeEstampa, regras } from "../compartilhado";
import { urlDaFotoEnviada } from "./fotos";
import type { ConfigProduto, Escolhas, EstampaPublica } from "../tipos";

const LADO_DA_FOTO = 320;
const fotosEmDataUrl = new Map<string, string>();
const texturas = new Map<string, string>();

export async function lembrarFotoDaEstampa(id: string, arquivo: Blob): Promise<void> {
  const bitmap = await createImageBitmap(arquivo);
  const canvas = document.createElement("canvas");
  canvas.width = LADO_DA_FOTO;
  canvas.height = LADO_DA_FOTO;
  const contexto = canvas.getContext("2d");
  if (!contexto) return;
  const escala = Math.max(LADO_DA_FOTO / bitmap.width, LADO_DA_FOTO / bitmap.height);
  const w = bitmap.width * escala;
  const h = bitmap.height * escala;
  contexto.drawImage(bitmap, (LADO_DA_FOTO - w) / 2, (LADO_DA_FOTO - h) / 2, w, h);
  bitmap.close();
  fotosEmDataUrl.set(id, canvas.toDataURL("image/jpeg", 0.85));
}

function texturaDoPadrao(chave: string, gerar: () => string): string {
  const pronta = texturas.get(chave);
  if (pronta) return pronta;
  const nova = gerar();
  if (texturas.size > 40) texturas.clear();
  texturas.set(chave, nova);
  return nova;
}

export function estampaPropriaPublica(config: ConfigProduto, escolhas: Escolhas, paraGuardar = false): EstampaPublica | null {
  const e = escolhas.personalizacao.estampaPropria;
  if (!e) return null;
  const medida = regras.medidaDaPeca(config, escolhas);
  const base = { id: "propria", nome: regras.descreverEstampaPropria(e), colecao: "", preco: 0, proporcao: medida.largura / medida.altura, miniatura: "" };
  if (e.tipo === "imagem") {
    const textura = paraGuardar ? `/api/personalizacao/fotos/${e.foto.id}?chave=${e.foto.chave}` : urlDaFotoEnviada(e.foto) ?? "";
    return { ...base, textura };
  }
  const href = e.foto ? fotosEmDataUrl.get(e.foto.id) ?? null : null;
  const chave = `${JSON.stringify(e)}|${medida.largura}x${medida.altura}|${href ? 1 : 0}`;
  const textura = texturaDoPadrao(chave, () => geradorDeEstampa.comoDataUrl(geradorDeEstampa.svgDoPadrao(e, medida.largura, medida.altura, href)));
  return { ...base, textura };
}
