const crypto = require("node:crypto");

function assinaturaDoWebhookValida(segredo, cabecalhoAssinatura, idDaRequisicao, idDoDado) {
  if (!segredo) return true;
  const partes = Object.fromEntries(
    String(cabecalhoAssinatura || "")
      .split(",")
      .map(kv => kv.split("=").map(s => s?.trim()))
  );
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1 || !/^[0-9a-f]{64}$/i.test(v1)) return false;
  const id = /[a-zA-Z]/.test(String(idDoDado)) ? String(idDoDado).toLowerCase() : String(idDoDado);
  const manifesto = `id:${id};request-id:${idDaRequisicao || ""};ts:${ts};`;
  const esperado = crypto.createHmac("sha256", segredo).update(manifesto).digest();
  return crypto.timingSafeEqual(esperado, Buffer.from(v1, "hex"));
}

function pagamentoBateComPedido(info, pedido) {
  if (info.currency_id && info.currency_id !== "BRL") return false;
  const pago = Number(info.transaction_amount);
  if (!Number.isFinite(pago)) return false;
  return Math.abs(pago - Number(pedido.total)) < 0.01;
}

module.exports = { assinaturaDoWebhookValida, pagamentoBateComPedido };
