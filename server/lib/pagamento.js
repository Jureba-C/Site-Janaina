const crypto = require("node:crypto");
const ambiente = require("./ambiente");

const TOLERANCIA_PADRAO_MIN = 15;

function toleranciaMs(env = process.env){
  const bruto = env.MP_WEBHOOK_TOLERANCIA_MIN;
  if(bruto === "0") return 0;
  const n = Number(bruto);
  return (Number.isFinite(n) && n > 0 ? n : TOLERANCIA_PADRAO_MIN) * 60 * 1000;
}

function lerAssinatura(cabecalhoAssinatura){
  return Object.fromEntries(
    String(cabecalhoAssinatura || "")
      .split(",")
      .map(kv => kv.split("=").map(s => s?.trim()))
  );
}

function conferirAssinatura(segredo, cabecalhoAssinatura, idDaRequisicao, idDoDado, { agora = Date.now(), env = process.env } = {}){
  if(!segredo) return ambiente.emProducao(env) ? { ok: false, motivo: "sem_segredo" } : { ok: true, motivo: "sem_segredo_dev" };
  const partes = lerAssinatura(cabecalhoAssinatura);
  const ts = partes.ts;
  const v1 = partes.v1;
  if(!ts || !/^[0-9]{9,16}$/.test(ts) || !v1 || !/^[0-9a-f]{64}$/i.test(v1)) return { ok: false, motivo: "formato" };
  const id = /[a-zA-Z]/.test(String(idDoDado)) ? String(idDoDado).toLowerCase() : String(idDoDado);
  const manifesto = `id:${id};request-id:${idDaRequisicao || ""};ts:${ts};`;
  const esperado = crypto.createHmac("sha256", segredo).update(manifesto).digest();
  if(!crypto.timingSafeEqual(esperado, Buffer.from(v1, "hex"))) return { ok: false, motivo: "assinatura" };
  const limite = toleranciaMs(env);
  if(limite){
    const tsMs = Number(ts) > 1e12 ? Number(ts) : Number(ts) * 1000;
    if(Math.abs(agora - tsMs) > limite) return { ok: false, motivo: "ts_antigo" };
  }
  return { ok: true, motivo: null };
}

function assinaturaDoWebhookValida(segredo, cabecalhoAssinatura, idDaRequisicao, idDoDado, opcoes){
  return conferirAssinatura(segredo, cabecalhoAssinatura, idDaRequisicao, idDoDado, opcoes).ok;
}

function motivoDaDivergencia(info, pedido){
  if(info.currency_id && info.currency_id !== "BRL") return "moeda";
  const pago = Number(info.transaction_amount);
  if(!Number.isFinite(pago)) return "valor";
  if(Math.abs(pago - Number(pedido.total)) >= 0.01) return "valor";
  if(pedido.payment_method === "pix"){
    if(info.payment_method_id !== "pix" || (info.payment_type_id && info.payment_type_id !== "bank_transfer")) return "forma";
  }
  return null;
}

function pagamentoBateComPedido(info, pedido){
  return motivoDaDivergencia(info, pedido) === null;
}

module.exports = { assinaturaDoWebhookValida, conferirAssinatura, pagamentoBateComPedido, motivoDaDivergencia, toleranciaMs };
