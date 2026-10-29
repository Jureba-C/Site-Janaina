const { formatCurrency, formatOrderDateTime, deliveryLineFor } = require("./orderFormatting");

function formatOrderMessage({ externalReference, items, address, total, paidAt }) {
  const itemLines = items
    .map(item => `• ${item.qty}x ${item.name}`)
    .join("\n");

  const deliveryLine = deliveryLineFor(address);

  return [
    "🎀 *Novo pedido pago!*",
    `Pedido: ${externalReference}`,
    `Data/hora: ${formatOrderDateTime(paidAt)}`,
    "",
    "Itens:",
    itemLines,
    "",
    `Total: ${formatCurrency(total)}`,
    "",
    `Cliente: ${address?.nome || "-"}`,
    `Telefone: ${address?.telefone || "-"}`,
    `Entrega: ${deliveryLine || "-"}`,
  ].join("\n");
}

async function sendWhatsAppMessage(toNumber, message) {
  const { WHATSAPP_CLOUD_API_TOKEN, WHATSAPP_CLOUD_PHONE_NUMBER_ID, WHATSAPP_CLOUD_API_VERSION } = process.env;
  if (!WHATSAPP_CLOUD_API_TOKEN || !WHATSAPP_CLOUD_PHONE_NUMBER_ID) {
    throw new Error("WhatsApp Cloud API não configurada (WHATSAPP_CLOUD_API_TOKEN/WHATSAPP_CLOUD_PHONE_NUMBER_ID ausentes no .env).");
  }
  const phone = String(toNumber || "").replace(/\D/g, "");
  if (!phone) {
    throw new Error("Número de WhatsApp de destino ausente/inválido (OWNER_WHATSAPP_NUMBER no .env).");
  }

  const apiVersion = WHATSAPP_CLOUD_API_VERSION || "v21.0";
  const url = `https://graph.facebook.com/${apiVersion}/${WHATSAPP_CLOUD_PHONE_NUMBER_ID}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${WHATSAPP_CLOUD_API_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body: message, preview_url: false },
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || data?.error) {
    throw new Error(data?.error?.message || `WhatsApp Cloud API respondeu ${res.status}`);
  }
  return data;
}

function estaConfigurado() {
  return !!(process.env.WHATSAPP_CLOUD_API_TOKEN
    && process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID
    && process.env.OWNER_WHATSAPP_NUMBER);
}

async function notifyOwnerOfPaidOrder(order) {
  const ownerNumber = process.env.OWNER_WHATSAPP_NUMBER;
  if (!ownerNumber) {
    throw new Error("OWNER_WHATSAPP_NUMBER não configurado no .env — aviso não enviado.");
  }
  const message = formatOrderMessage(order);
  await sendWhatsAppMessage(ownerNumber, message);
}

async function avisarDonaDaLoja(texto) {
  if (!estaConfigurado()) return null;
  return sendWhatsAppMessage(process.env.OWNER_WHATSAPP_NUMBER, `⚠️ Arte Canecas — ${String(texto).slice(0, 900)}`);
}

module.exports = { formatOrderMessage, sendWhatsAppMessage, notifyOwnerOfPaidOrder, avisarDonaDaLoja, estaConfigurado };
