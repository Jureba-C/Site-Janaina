const nodemailer = require("nodemailer");
const path = require("path");
const { formatCurrency, formatOrderDateTime, deliveryLineFor } = require("./orderFormatting");

const LOGO_CID = "logo-loja";
const ASSINATURA_LOJA = "Arte Canecas — presentes personalizados, Brasília/DF";
const LOGO_PATH = path.join(__dirname, "..", "img", "logo-loja-email.png");

const CORES = {
  fundo: "#FBF8F3",
  cartao: "#FFFFFF",
  faixa: "#F6E1DE",
  caixaSuave: "#FBF3EF",
  titulo: "#323230",
  texto: "#323230",
  apoio: "#6B6259",
  destaque: "#9E4A18",
  destaqueClaro: "#D4935E",
  tenue: "#9C9086",
  botaoFundo: "#9E4A18",
  botaoTexto: "#FFFFFF",
};

const ESCURO = {
  fundo: "#1F1A17",
  cartao: "#2A2320",
  faixa: "#2A2320",
  caixaSuave: "#352C27",
  titulo: "#FBF3EF",
  texto: "#EFE6DD",
  apoio: "#C9B8A8",
  destaque: "#E3A27A",
  tenue: "#C9B8A8",
  botaoFundo: "#E3A27A",
  botaoTexto: "#2A1A10",
};

function regrasEscuras(prefixo) {
  return `
    ${prefixo} .e-fundo{ background:${ESCURO.fundo} !important; }
    ${prefixo} .e-cartao{ background:${ESCURO.cartao} !important; }
    ${prefixo} .e-faixa{ background:${ESCURO.faixa} !important; }
    ${prefixo} .e-caixa{ background:${ESCURO.caixaSuave} !important; }
    ${prefixo} .e-titulo{ color:${ESCURO.titulo} !important; }
    ${prefixo} .e-texto{ color:${ESCURO.texto} !important; }
    ${prefixo} .e-texto strong{ color:${ESCURO.titulo} !important; }
    ${prefixo} .e-apoio{ color:${ESCURO.apoio} !important; }
    ${prefixo} .e-destaque{ color:${ESCURO.destaque} !important; }
    ${prefixo} .e-tenue{ color:${ESCURO.tenue} !important; }
    ${prefixo} .e-borda{ border-color:${ESCURO.apoio} !important; }
    ${prefixo} .e-destaqueBorda{ border-color:${ESCURO.destaque} !important; }
    ${prefixo} .e-botao{ background:${ESCURO.botaoFundo} !important; }
    ${prefixo} .e-botao-texto{ color:${ESCURO.botaoTexto} !important; }
    ${prefixo} a.e-destaque{ color:${ESCURO.destaque} !important; }`;
}

const ESTILO_DO_EMAIL = `
  :root{ color-scheme: light dark; supported-color-schemes: light dark; }
  @media (prefers-color-scheme: dark){
  ${regrasEscuras("")}
  }
  ${regrasEscuras("[data-ogsc]")}
`;

function escapeHTML(str) {
  return String(str ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

const FONT_TITULO = "Georgia, 'Times New Roman', serif";
const FONT_CORPO = "'Segoe UI', Helvetica, Arial, sans-serif";

function emailShell({ titulo, preheader, eyebrow, tituloCartao, corpoHtml }) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHTML(titulo)}</title>
<style>${ESTILO_DO_EMAIL}</style>
</head>
<body class="e-fundo" style="margin:0; padding:0; background:${CORES.fundo};">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
    ${escapeHTML(preheader)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="e-fundo" style="background:${CORES.fundo};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

          <tr>
            <td align="center" class="e-faixa" style="background:${CORES.faixa}; border-radius:24px 24px 0 0; padding:28px 24px 22px;">
              <img src="cid:${LOGO_CID}" alt="Arte Canecas" width="192" style="display:block; border:0;">
            </td>
          </tr>

          <tr>
            <td class="e-cartao" style="background:${CORES.cartao}; border-radius:0 0 24px 24px; padding:36px 32px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" class="e-destaque" style="font-family:${FONT_TITULO}; font-style:italic; color:${CORES.destaque}; font-size:15px; padding-bottom:6px;">
                    ${escapeHTML(eyebrow)}
                  </td>
                </tr>
                <tr>
                  <td align="center" class="e-titulo" style="font-family:${FONT_TITULO}; color:${CORES.titulo}; font-size:26px; line-height:1.3; font-weight:bold; padding-bottom:14px;">
                    ${escapeHTML(tituloCartao)}
                  </td>
                </tr>
                ${corpoHtml}
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" class="e-apoio" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:12px; line-height:1.7; padding:22px 24px 0;">
              Arte Canecas — presentes que marcam, personalizados com carinho em Brasília/DF.<br>
              Dúvidas? Responda este e-mail ou fale pelo
              <a href="https://wa.me/5561996927401" class="e-destaque" style="color:${CORES.destaque}; text-decoration:none;">WhatsApp</a>.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function botaoEmail(href, rotulo){
  return `
    <tr>
      <td align="center" style="padding-bottom:8px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" class="e-botao" style="background:${CORES.botaoFundo}; border-radius:999px;">
              <a href="${escapeHTML(href)}" class="e-botao-texto" style="display:inline-block; font-family:${FONT_CORPO}; font-size:15px; font-weight:600; color:${CORES.botaoTexto}; text-decoration:none; padding:13px 32px;">
                ${escapeHTML(rotulo)}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

const ROTA_FOTO_LOCAL =
  /^\/api\/products\/photos\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
const ESTILO_IMG =
  'width="56" height="56" style="display:block; width:56px; height:56px; border:0; border-radius:10px;"';

function celulaMiniatura(photoUrl, nome){
  const alt = escapeHTML(nome || "produto");
  const local = typeof photoUrl === "string" ? photoUrl.match(ROTA_FOTO_LOCAL) : null;

  let interior;
  if(local){
    interior = `<img src="cid:produto-${local[1]}" alt="${alt}" ${ESTILO_IMG}>`;
  } else if(/^https?:\/\//i.test(photoUrl || "")){
    interior = `<img src="${escapeHTML(photoUrl)}" alt="${alt}" ${ESTILO_IMG}>`;
  } else {
    interior = "&#127872;";
  }

  return `<td width="56" bgcolor="${CORES.faixa}" align="center" valign="middle" class="e-caixa e-borda" style="width:56px; height:56px; background:${CORES.faixa}; border-radius:10px; font-size:26px; line-height:56px; mso-line-height-rule:exactly; border-bottom:1px solid ${CORES.faixa};">${interior}</td>`;
}

const CELULA_ESPACO =
  `<td width="12" class="e-borda" style="width:12px; font-size:0; line-height:0; border-bottom:1px solid ${CORES.faixa};">&nbsp;</td>`;

const MAX_MINIATURAS = 8;

function linhaDado(rotulo, valor){
  return `<strong class="e-titulo" style="color:${CORES.titulo};">${escapeHTML(rotulo)}:</strong> ${escapeHTML(valor)}<br>`;
}

function formatOrderEmail({ externalReference, items, address, total, paidAt, adminUrl }) {
  const itemLinesText = items
    .map(item => `${item.qty}x ${item.name}`)
    .join("\n");
  const itemLinesHtml = items
    .map(item => `<li>${item.qty}x ${escapeHTML(item.name)}</li>`)
    .join("");

  const subject = `✿ Novo pedido pago — ${externalReference}`;
  const deliveryLine = deliveryLineFor(address);

  const text = [
    "Novo pedido pago!",
    `Pedido: ${externalReference}`,
    `Data/hora: ${formatOrderDateTime(paidAt)}`,
    "",
    "Itens:",
    itemLinesText,
    "",
    `Total: ${formatCurrency(total)}`,
    "",
    `Cliente: ${address?.nome || "-"}`,
    `Telefone: ${address?.telefone || "-"}`,
    `CPF: ${address?.cpf || "-"}`,
    `Entrega: ${deliveryLine || "-"}`,
    "",
    `Ver no painel administrativo: ${adminUrl}`,
  ].join("\n");

  const itemRowsHtml = items
    .map((item, i) => `
      <tr>
        ${celulaMiniatura(i < MAX_MINIATURAS ? item.photoUrl : null, item.name)}
        ${CELULA_ESPACO}
        <td class="e-texto e-borda" valign="middle" style="font-family:${FONT_CORPO}; color:${CORES.texto}; font-size:14px; padding:8px 0; border-bottom:1px solid ${CORES.faixa};">
          ${escapeHTML(item.qty)}x ${escapeHTML(item.name)}
        </td>
      </tr>
    `).join("");

  const html = emailShell({
    titulo: subject,
    preheader: `${formatCurrency(total)} — ${address?.nome || "novo pedido"}`,
    eyebrow: "pedido pago",
    tituloCartao: "Novo pedido! ✿",
    corpoHtml: `
      <tr>
        <td class="e-apoio" align="left" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:13px; line-height:1.6; padding-bottom:18px;">
          ${linhaDado("Pedido", externalReference)}
          ${linhaDado("Data/hora", formatOrderDateTime(paidAt))}
        </td>
      </tr>
      <tr>
        <td style="padding-bottom:18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${itemRowsHtml}
          </table>
        </td>
      </tr>
      <tr>
        <td class="e-destaque" align="left" style="font-family:${FONT_CORPO}; font-size:16px; font-weight:bold; color:${CORES.destaque}; padding-bottom:20px;">
          Total: ${escapeHTML(formatCurrency(total))}
        </td>
      </tr>
      <tr>
        <td class="e-apoio e-caixa" align="left" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:13px; line-height:1.6; background:${CORES.caixaSuave}; border-radius:14px; padding:14px 16px; margin-bottom:20px;">
          ${linhaDado("Cliente", address?.nome || "-")}
          ${linhaDado("Telefone", address?.telefone || "-")}
          ${linhaDado("CPF", address?.cpf || "-")}
          ${linhaDado("Entrega", deliveryLine || "-")}
        </td>
      </tr>
      <tr><td style="padding-bottom:20px;"></td></tr>
      ${botaoEmail(adminUrl, "Ver no painel administrativo")}
    `,
  });

  return { subject, text, html };
}

async function sendEmail({ to, subject, text, html, headers, attachments = [] }) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP não configurado (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS ausentes no .env).");
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || SMTP_USER,
    replyTo: process.env.OWNER_EMAIL || undefined,
    to,
    subject,
    text,
    html,
    headers,
    attachments: [
      { filename: "logo-loja.png", path: LOGO_PATH, cid: LOGO_CID },
      ...attachments,
    ],
  });
}

async function notifyOwnerOfPaidOrder(order) {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) {
    throw new Error("OWNER_EMAIL não configurado no .env — e-mail não enviado.");
  }
  const { subject, text, html } = formatOrderEmail(order);
  const { anexosDeMiniaturas } = require("./emailPhotos.js");
  await sendEmail({
    to: ownerEmail, subject, text, html,
    attachments: await anexosDeMiniaturas(html),
  });
}

async function sendPasswordResetEmail({ to, name, resetUrl, expiresInMinutes }) {
  const firstName = String(name || "").trim().split(" ")[0] || "cliente";
  const subject = "Redefinição de senha — Arte Canecas";

  const text = [
    `Olá, ${firstName}!`,
    "",
    "Recebemos um pedido para redefinir a senha da sua conta na Arte Canecas.",
    "",
    `Abra este link para escolher uma nova senha (vale por ${expiresInMinutes} minutos):`,
    resetUrl,
    "",
    "Se não foi você que pediu, pode ignorar esta mensagem — sua senha atual continua valendo.",
  ].join("\n");

  const html = emailShell({
    titulo: subject,
    preheader: `O link para escolher uma nova senha vale por ${expiresInMinutes} minutos.`,
    eyebrow: "redefinição de senha",
    tituloCartao: "Vamos criar sua nova senha",
    corpoHtml: `
      <tr>
        <td class="e-apoio" align="center" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:15px; line-height:1.6; padding-bottom:26px;">
          Olá, ${escapeHTML(firstName)}! Recebemos um pedido para redefinir a senha
          da sua conta. Clique no botão abaixo para escolher uma nova — o link
          vale por <strong class="e-texto" style="color:${CORES.texto};">${escapeHTML(String(expiresInMinutes))} minutos</strong>.
        </td>
      </tr>
      ${botaoEmail(resetUrl, "Criar nova senha")}
      <tr>
        <td class="e-apoio" align="center" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:13px; line-height:1.6; padding-top:22px;">
          Se não foi você que pediu, pode ignorar esta mensagem — sua senha atual continua valendo.
        </td>
      </tr>
    `,
  });

  await sendEmail({ to, subject, text, html });
}

async function sendConfirmarNovoEmail({ to, name, link, expiresInMinutes }) {
  const firstName = String(name || "").trim().split(" ")[0] || "cliente";
  const subject = "Confirme o seu novo e-mail — Arte Canecas";
  const text = [
    `Olá, ${firstName}!`,
    "",
    "Pediram para usar este e-mail para entrar na sua conta da Arte Canecas.",
    "",
    `Para confirmar a troca, abra este link (vale por ${expiresInMinutes} minutos):`,
    link,
    "",
    "Se não foi você, ignore esta mensagem — nada muda.",
  ].join("\n");
  const html = emailShell({
    titulo: subject,
    preheader: "Confirme a troca do e-mail de acesso da sua conta.",
    eyebrow: "troca de e-mail",
    tituloCartao: "Confirme o seu novo e-mail",
    corpoHtml: `
      <tr>
        <td class="e-apoio" align="center" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:15px; line-height:1.6; padding-bottom:26px;">
          Olá, ${escapeHTML(firstName)}! Pediram para usar este e-mail para entrar na sua conta.
          Clique no botão para confirmar — o link vale por <strong class="e-texto" style="color:${CORES.texto};">${escapeHTML(String(expiresInMinutes))} minutos</strong>.
        </td>
      </tr>
      ${botaoEmail(link, "Confirmar novo e-mail")}
      <tr>
        <td class="e-apoio" align="center" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:13px; line-height:1.6; padding-top:22px;">
          Se não foi você, ignore esta mensagem — nada muda.
        </td>
      </tr>
    `,
  });
  await sendEmail({ to, subject, text, html });
}

async function sendTwoFactorEmailCode({ to, name, code, expiresInMinutes }) {
  const firstName = String(name || "").trim().split(" ")[0] || "";
  const subject = "Seu código de verificação — Arte Canecas";

  const text = [
    firstName ? `Olá, ${firstName}!` : "Olá!",
    "",
    "Você pediu um código de verificação para entrar no painel administrativo.",
    "",
    `Código: ${code}`,
    `Vale por ${expiresInMinutes} minutos.`,
    "",
    "Se não foi você que tentou entrar, troque sua senha assim que possível.",
  ].join("\n");

  const html = emailShell({
    titulo: subject,
    preheader: `Seu código vale por ${expiresInMinutes} minutos.`,
    eyebrow: "verificação em duas etapas",
    tituloCartao: "Aqui está seu código 🔐",
    corpoHtml: `
      <tr>
        <td class="e-apoio" align="center" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:15px; line-height:1.6; padding-bottom:22px;">
          Use este código para entrar no painel administrativo — vale por
          <strong class="e-texto" style="color:${CORES.texto};">${escapeHTML(String(expiresInMinutes))} minutos</strong>.
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-bottom:22px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td class="e-caixa e-destaqueBorda" align="center" style="background:${CORES.caixaSuave}; border:2px dashed ${CORES.destaqueClaro}; border-radius:16px; padding:16px 36px;">
                <span class="e-destaque" style="font-family:${FONT_CORPO}; font-size:28px; font-weight:bold; letter-spacing:6px; color:${CORES.destaque};">
                  ${escapeHTML(code)}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td class="e-apoio" align="center" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:13px; line-height:1.6;">
          Se não foi você que tentou entrar, troque sua senha assim que possível.
        </td>
      </tr>
    `,
  });

  await sendEmail({ to, subject, text, html });
}

function linhasDeItens(items){
  return {
    texto: items.map(i => `${i.qty}x ${i.name}`).join("\n"),
    html: items.map((i, indice) => `
      <tr>
        ${celulaMiniatura(indice < MAX_MINIATURAS ? i.photoUrl : null, i.name)}
        ${CELULA_ESPACO}
        <td class="e-texto e-borda" valign="middle" style="font-family:${FONT_CORPO}; color:${CORES.texto}; font-size:14px; padding:8px 0; border-bottom:1px solid ${CORES.faixa};">
          ${escapeHTML(String(i.qty))}x ${escapeHTML(i.name)}
        </td>
        <td class="e-apoio e-borda" align="right" valign="middle" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:14px; padding:8px 0; border-bottom:1px solid ${CORES.faixa}; white-space:nowrap;">
          ${escapeHTML(formatCurrency((i.price || 0) * i.qty))}
        </td>
      </tr>
    `).join(""),
  };
}

function linhaResumo(rotulo, valor, forte){
  const cor = forte ? CORES.destaque : CORES.apoio;
  const gancho = forte ? "e-destaque" : "e-apoio";
  const peso = forte ? "bold" : "normal";
  const tamanho = forte ? "16px" : "14px";
  return `
    <tr>
      <td class="${gancho}" style="font-family:${FONT_CORPO}; color:${cor}; font-size:${tamanho}; font-weight:${peso}; padding:4px 0;">${escapeHTML(rotulo)}</td>
      <td align="right" class="${gancho}" style="font-family:${FONT_CORPO}; color:${cor}; font-size:${tamanho}; font-weight:${peso}; padding:4px 0; white-space:nowrap;">${escapeHTML(valor)}</td>
    </tr>
  `;
}

function formatOrderConfirmationEmail({
  externalReference, items, subtotal, discount, pixDiscount, shippingPrice,
  total, couponCode, address, paidAt, trackUrl,
}){
  const subject = `Pedido confirmado — ${externalReference}`;
  const itens = linhasDeItens(items);
  const entrega = deliveryLineFor(address);
  const nome = (address && address.nome) ? String(address.nome).split(" ")[0] : "";

  const text = [
    nome ? `Oi, ${nome}!` : "Oi!",
    "",
    "Recebemos o seu pagamento — seu pedido já entrou na fila de produção.",
    "",
    `Pedido: ${externalReference}`,
    `Data: ${formatOrderDateTime(paidAt)}`,
    "",
    "Itens:",
    itens.texto,
    "",
    `Subtotal: ${formatCurrency(subtotal)}`,
    ...(discount > 0 ? [`Desconto${couponCode ? ` (${couponCode})` : ""}: -${formatCurrency(discount)}`] : []),
    ...(pixDiscount > 0 ? [`Desconto Pix: -${formatCurrency(pixDiscount)}`] : []),
    `Frete: ${shippingPrice > 0 ? formatCurrency(shippingPrice) : "grátis"}`,
    `Total: ${formatCurrency(total)}`,
    "",
    `Entrega: ${entrega || "-"}`,
    "",
    "Cada peça é personalizada com carinho, uma de cada vez. Assim que despacharmos, você",
    "recebe outro e-mail com o código de rastreio.",
    "",
    `Acompanhar o pedido: ${trackUrl}`,
    "",
    ASSINATURA_LOJA,
    "arte.canecasbsb@gmail.com",
  ].join("\n");

  const html = emailShell({
    titulo: subject,
    preheader: `Pagamento confirmado — ${formatCurrency(total)}. Seu pedido entrou na fila de produção.`,
    eyebrow: "pagamento confirmado",
    tituloCartao: nome ? `Obrigada, ${nome}! ✿` : "Pedido confirmado ✿",
    corpoHtml: `
      <tr>
        <td class="e-apoio" align="center" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:15px; line-height:1.6; padding-bottom:24px;">
          Recebemos o seu pagamento. Seu pedido <strong class="e-texto" style="color:${CORES.texto};">${escapeHTML(externalReference)}</strong> já entrou na fila de produção.
        </td>
      </tr>
      <tr>
        <td style="padding-bottom:8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${itens.html}
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom:22px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${linhaResumo("Subtotal", formatCurrency(subtotal))}
            ${discount > 0 ? linhaResumo(`Desconto${couponCode ? ` (${couponCode})` : ""}`, `-${formatCurrency(discount)}`) : ""}
            ${pixDiscount > 0 ? linhaResumo("Desconto Pix", `-${formatCurrency(pixDiscount)}`) : ""}
            ${linhaResumo("Frete", shippingPrice > 0 ? formatCurrency(shippingPrice) : "grátis")}
            ${linhaResumo("Total", formatCurrency(total), true)}
          </table>
        </td>
      </tr>
      <tr>
        <td class="e-apoio e-caixa" align="left" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:13px; line-height:1.6; background:${CORES.caixaSuave}; border-radius:14px; padding:14px 16px;">
          ${linhaDado("Entrega", entrega || "-")}
        </td>
      </tr>
      <tr><td style="height:22px;"></td></tr>
      <tr>
        <td class="e-apoio" align="center" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:14px; line-height:1.6; padding-bottom:22px;">
          Cada peça é personalizada com carinho, uma de cada vez. Assim que despacharmos, você recebe outro e-mail com o código de rastreio.
        </td>
      </tr>
      ${botaoEmail(trackUrl, "Acompanhar meu pedido")}
    `,
  });

  return { subject, text, html };
}

function formatTrackingEmail({ externalReference, trackingCode, address, trackUrl }){
  const subject = `Seu pedido está a caminho — ${externalReference}`;
  const nome = (address && address.nome) ? String(address.nome).split(" ")[0] : "";

  const text = [
    nome ? `Oi, ${nome}!` : "Oi!",
    "",
    "Seu pedido foi postado e já está a caminho.",
    "",
    `Pedido: ${externalReference}`,
    `Código de rastreio: ${trackingCode}`,
    "",
    `Acompanhar a entrega: ${trackUrl}`,
    "",
    ASSINATURA_LOJA,
    "arte.canecasbsb@gmail.com",
  ].join("\n");

  const html = emailShell({
    titulo: subject,
    preheader: `Código de rastreio: ${trackingCode}`,
    eyebrow: "pedido postado",
    tituloCartao: "Seu presente está a caminho",
    corpoHtml: `
      <tr>
        <td class="e-apoio" align="center" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:15px; line-height:1.6; padding-bottom:26px;">
          ${nome ? `Oi, ${escapeHTML(nome)}! ` : ""}Seu pedido <strong class="e-texto" style="color:${CORES.texto};">${escapeHTML(externalReference)}</strong> foi postado e já está a caminho.
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-bottom:26px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td class="e-caixa e-destaqueBorda" align="center" style="background:${CORES.caixaSuave}; border:2px dashed ${CORES.destaqueClaro}; border-radius:16px; padding:16px 30px;">
                <div class="e-apoio" style="font-family:${FONT_CORPO}; font-size:12px; color:${CORES.apoio}; padding-bottom:6px;">código de rastreio</div>
                <span class="e-destaque" style="font-family:${FONT_CORPO}; font-size:20px; font-weight:bold; letter-spacing:2px; color:${CORES.destaque};">
                  ${escapeHTML(trackingCode)}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      ${botaoEmail(trackUrl, "Acompanhar a entrega")}
    `,
  });

  return { subject, text, html };
}

async function sendWelcomeCouponEmail({ to, couponCode, percentOff, shopUrl, unsubscribeUrl }) {
  const subject = `✿ Seu cupom de ${percentOff}% — Arte Canecas`;

  const text = [
    "Obrigada por se cadastrar!",
    "",
    `Seu cupom de ${percentOff}% de desconto na primeira compra:`,
    couponCode,
    "",
    "É só usar no carrinho, no campo de cupom, antes de finalizar o pedido.",
    "",
    `Ver a coleção: ${shopUrl}`,
    "",
    ASSINATURA_LOJA,
    "arte.canecasbsb@gmail.com",
    ...(unsubscribeUrl ? ["", `Não quer mais receber estes e-mails? ${unsubscribeUrl}`] : []),
  ].join("\n");

  const html = emailShell({
    titulo: subject,
    preheader: `Seu cupom de ${percentOff}% já está pronto para a primeira compra.`,
    eyebrow: "obrigada por se cadastrar",
    tituloCartao: "Seu cupom de boas-vindas chegou",
    corpoHtml: `
      <tr>
        <td class="e-apoio" align="center" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:15px; line-height:1.6; padding-bottom:26px;">
          Aqui está o seu cupom de <strong class="e-texto" style="color:${CORES.texto};">${escapeHTML(String(percentOff))}% de desconto</strong> na primeira compra — vale para qualquer peça da loja.
        </td>
      </tr>

      <tr>
        <td align="center" style="padding-bottom:26px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td class="e-caixa e-destaqueBorda" align="center" style="background:${CORES.caixaSuave}; border:2px dashed ${CORES.destaqueClaro}; border-radius:16px; padding:16px 36px;">
                <span class="e-destaque" style="font-family:${FONT_CORPO}; font-size:24px; font-weight:bold; letter-spacing:3px; color:${CORES.destaque};">
                  ${escapeHTML(couponCode)}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td class="e-apoio" align="center" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:14px; line-height:1.6; padding-bottom:26px;">
          É só colar esse código no campo de cupom, no carrinho, antes de finalizar o pedido.
        </td>
      </tr>

      ${botaoEmail(shopUrl, "Ver a coleção")}
      ${rodapeDeDescadastro(unsubscribeUrl)}
    `,
  });

  const headers = cabecalhosDeDescadastro(unsubscribeUrl);

  await sendEmail({ to, subject, text, html, headers });
}

function formatContactEmail({ nome, telefone, ocasiao, mensagem }) {
  const subject = `✿ Nova mensagem de contato — ${nome}`;

  const text = [
    "Nova mensagem pelo formulário de contato do site:",
    "",
    `Nome: ${nome}`,
    `WhatsApp: ${telefone}`,
    `Ocasião: ${ocasiao || "-"}`,
    "",
    "Mensagem:",
    mensagem,
  ].join("\n");

  const html = emailShell({
    titulo: subject,
    preheader: `${nome}: ${mensagem.slice(0, 100)}`,
    eyebrow: "novo contato",
    tituloCartao: "Nova mensagem pelo site ✿",
    corpoHtml: `
      <tr>
        <td class="e-apoio" align="left" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:13px; line-height:1.6; padding-bottom:18px;">
          ${linhaDado("Nome", nome)}
          ${linhaDado("WhatsApp", telefone)}
          ${linhaDado("Ocasião", ocasiao || "-")}
        </td>
      </tr>
      <tr>
        <td class="e-texto e-caixa" align="left" style="font-family:${FONT_CORPO}; color:${CORES.texto}; font-size:14px; line-height:1.6; background:${CORES.caixaSuave}; border-radius:14px; padding:16px 18px; white-space:pre-wrap;">
          ${escapeHTML(mensagem)}
        </td>
      </tr>
    `,
  });

  return { subject, text, html };
}

async function notifyOwnerOfContactMessage(dados) {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) {
    throw new Error("OWNER_EMAIL não configurado no .env — e-mail não enviado.");
  }
  const { subject, text, html } = formatContactEmail(dados);
  await sendEmail({ to: ownerEmail, subject, text, html });
}

async function sendAdminLoginAlert({ email: contaAlvo, ip, failures }) {
  const subject = "⚠️ Tentativas de login no painel da loja";
  const quando = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const text = [
    "Detectamos tentativas de login malsucedidas na sua conta de administradora.",
    "",
    `Conta: ${contaAlvo}`,
    `Tentativas seguidas: ${failures}`,
    `Endereço de origem (IP): ${ip}`,
    `Quando: ${quando}`,
    "",
    "O acesso desse endereço já foi bloqueado por 30 minutos.",
    "",
    "Se foi você que errou a senha, pode ignorar este aviso — é só esperar o prazo.",
    "Se NÃO foi você, troque sua senha assim que conseguir entrar.",
  ].join("\n");

  const html = emailShell({
    titulo: subject,
    preheader: `${failures} tentativas de login na conta ${contaAlvo}`,
    eyebrow: "alerta de segurança",
    tituloCartao: "Tentativas de login bloqueadas",
    corpoHtml: `
      <tr>
        <td class="e-apoio" align="left" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:13px; line-height:1.6; padding-bottom:18px;">
          ${linhaDado("Conta", contaAlvo)}
          ${linhaDado("Tentativas seguidas", String(failures))}
          ${linhaDado("Origem (IP)", ip)}
          ${linhaDado("Quando", quando)}
        </td>
      </tr>
      <tr>
        <td class="e-texto e-caixa" align="left" style="font-family:${FONT_CORPO}; color:${CORES.texto}; font-size:14px; line-height:1.6; background:${CORES.caixaSuave}; border-radius:14px; padding:16px 18px;">
          O acesso desse endereço já foi <strong>bloqueado por 30 minutos</strong>.<br><br>
          Se foi você que errou a senha, é só esperar o prazo.<br>
          Se <strong>não</strong> foi você, troque sua senha assim que conseguir entrar.
        </td>
      </tr>
    `,
  });

  await sendEmail({ to: contaAlvo, subject, text, html });
}

function primeiroNome(address){
  return (address && address.nome) ? String(address.nome).trim().split(" ")[0] : "";
}

function formatConfirmarRecebimentoEmail({ externalReference, address, avaliarUrl }){
  const nome = primeiroNome(address);
  const subject = "Seu pedido já chegou? ✿";

  const text = [
    nome ? `Oi, ${nome}!` : "Oi!",
    "",
    `Seu pedido ${externalReference} já deveria ter chegado. Chegou tudo certinho?`,
    "",
    `Se sim, é só confirmar aqui (leva um segundo): ${avaliarUrl}`,
    "",
    "Se ainda não chegou ou veio algum problema, responda este e-mail que a gente resolve.",
    "",
    ASSINATURA_LOJA,
  ].join("\n");

  const html = emailShell({
    titulo: subject,
    preheader: "Confirme em um clique que recebeu seu pedido.",
    eyebrow: "entrega",
    tituloCartao: "Chegou tudo certinho? ",
    corpoHtml: `
      <tr>
        <td class="e-apoio" align="center" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:15px; line-height:1.6; padding-bottom:26px;">
          ${nome ? `Oi, ${escapeHTML(nome)}! ` : ""}Seu pedido <strong class="e-texto" style="color:${CORES.texto};">${escapeHTML(externalReference)}</strong> já deveria ter chegado. Se recebeu, é só confirmar — leva um segundo.
        </td>
      </tr>
      ${botaoEmail(avaliarUrl, "Sim, recebi meu pedido")}
      <tr>
        <td class="e-apoio" align="center" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:13px; line-height:1.6; padding-top:22px;">
          Ainda não chegou ou veio algum problema? Responda este e-mail que a gente resolve.
        </td>
      </tr>
    `,
  });

  return { subject, text, html };
}

function formatPedirAvaliacaoEmail({ externalReference, address, items, avaliarUrl }){
  const nome = primeiroNome(address);
  const subject = "Como ficou o seu presente? ✿";
  const lista = (items || []).map(i => `• ${i.name}`).join("\n");

  const text = [
    nome ? `Oi, ${nome}!` : "Oi!",
    "",
    "Esperamos que tenha amado o que chegou:",
    lista,
    "",
    `Conta pra gente o que achou? Leva menos de um minuto: ${avaliarUrl}`,
    "",
    "Sua avaliação ajuda outras mamães a escolherem — e a gente lê cada uma com carinho.",
    "",
    ASSINATURA_LOJA,
  ].join("\n");

  const itensHtml = (items || []).map((i, indice) => `
      <tr>
        ${celulaMiniatura(indice < MAX_MINIATURAS ? i.photoUrl : null, i.name)}
        ${CELULA_ESPACO}
        <td class="e-texto e-borda" valign="middle" style="font-family:${FONT_CORPO}; color:${CORES.texto}; font-size:14px; padding:8px 0; border-bottom:1px solid ${CORES.faixa};">
          ${escapeHTML(i.name)}
        </td>
      </tr>`).join("");

  const html = emailShell({
    titulo: subject,
    preheader: "Conta pra gente o que achou — leva menos de um minuto.",
    eyebrow: "sua opinião",
    tituloCartao: "Como ficou o seu presente? ✿",
    corpoHtml: `
      <tr>
        <td class="e-apoio" align="center" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:15px; line-height:1.6; padding-bottom:20px;">
          ${nome ? `Oi, ${escapeHTML(nome)}! ` : ""}Esperamos que tenha amado. Conta pra gente o que achou de cada peça?
        </td>
      </tr>
      ${itensHtml ? `
      <tr>
        <td style="padding-bottom:26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itensHtml}</table>
        </td>
      </tr>` : ""}
      ${botaoEmail(avaliarUrl, "Avaliar meu pedido")}
      <tr>
        <td class="e-apoio" align="center" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:13px; line-height:1.6; padding-top:22px;">
          Sua avaliação ajuda outras mamães a escolherem — e a gente lê cada uma com carinho.
        </td>
      </tr>
    `,
  });

  return { subject, text, html };
}

function rodapeDeDescadastro(unsubscribeUrl){
  if(!unsubscribeUrl) return "";
  return `
      <tr>
        <td class="e-tenue" align="center" style="font-family:${FONT_CORPO}; color:${CORES.tenue}; font-size:11px; line-height:1.6; padding-top:18px;">
          <a class="e-tenue" href="${escapeHTML(unsubscribeUrl)}" style="color:${CORES.tenue}; text-decoration:underline;">Não quero mais receber estes e-mails</a>
        </td>
      </tr>`;
}

function cabecalhosDeDescadastro(unsubscribeUrl){
  if(!unsubscribeUrl) return undefined;
  return {
    "List-Unsubscribe": `<mailto:${process.env.SMTP_USER}?subject=descadastrar>, <${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

function formatCarrinhoEsquecidoEmail({ address, items, retomarUrl, whatsappUrl, unsubscribeUrl }){
  const nome = primeiroNome(address);
  const subject = "Seu pedido ficou esperando ✿";
  const lista = (items || []).map(i => `• ${i.name}${i.qty > 1 ? ` (${i.qty})` : ""}`).join("\n");

  const text = [
    nome ? `Oi, ${nome}!` : "Oi!",
    "",
    "Você começou um pedido aqui na loja e ele ficou pela metade:",
    lista,
    "",
    `Se quiser terminar, é só abrir este link — os itens já voltam para o carrinho: ${retomarUrl}`,
    "",
    ...(whatsappUrl ? [`Ficou com alguma dúvida? Fala comigo no WhatsApp: ${whatsappUrl}`, ""] : []),
    "Cada peça é feita à mão, sob encomenda, na cor que você escolher.",
    "",
    ASSINATURA_LOJA,
    ...(unsubscribeUrl ? ["", `Não quer mais receber estes e-mails? ${unsubscribeUrl}`] : []),
  ].join("\n");

  const itensHtml = (items || []).map((i, indice) => `
      <tr>
        ${celulaMiniatura(indice < MAX_MINIATURAS ? i.photoUrl : null, i.name)}
        ${CELULA_ESPACO}
        <td class="e-texto e-borda" valign="middle" style="font-family:${FONT_CORPO}; color:${CORES.texto}; font-size:14px; padding:8px 0; border-bottom:1px solid ${CORES.faixa};">
          ${escapeHTML(i.name)}${i.qty > 1 ? ` <span style="color:${CORES.apoio};">(${i.qty})</span>` : ""}
        </td>
      </tr>`).join("");

  const html = emailShell({
    titulo: subject,
    preheader: "Seu carrinho continua guardado — é só abrir e terminar.",
    eyebrow: "seu carrinho",
    tituloCartao: "Ficou faltando pouco ✿",
    corpoHtml: `
      <tr>
        <td class="e-apoio" align="center" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:15px; line-height:1.6; padding-bottom:20px;">
          ${nome ? `Oi, ${escapeHTML(nome)}! ` : ""}Você começou um pedido e ele ficou pela metade. Guardamos tudo para você.
        </td>
      </tr>
      ${itensHtml ? `
      <tr>
        <td style="padding-bottom:26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itensHtml}</table>
        </td>
      </tr>` : ""}
      ${botaoEmail(retomarUrl, "Terminar meu pedido")}
      <tr>
        <td class="e-apoio" align="center" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:13px; line-height:1.6; padding-top:22px;">
          Cada peça é feita à mão, sob encomenda${whatsappUrl ? `. Qualquer dúvida, <a href="${escapeHTML(whatsappUrl)}" style="color:${CORES.apoio};">fala comigo no WhatsApp</a>` : ""}.
        </td>
      </tr>
      ${rodapeDeDescadastro(unsubscribeUrl)}
    `,
  });

  return { subject, text, html };
}

function paragrafosDoTexto(texto){
  return String(texto || "")
    .split(/\n{2,}/)
    .map(bloco => bloco.trim())
    .filter(Boolean)
    .map(bloco => `
      <tr>
        <td class="e-apoio" align="center" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:15px; line-height:1.65; padding-bottom:16px;">
          ${escapeHTML(bloco).replace(/\n/g, "<br>")}
        </td>
      </tr>`)
    .join("");
}

function formatCampanhaEmail({ assunto, chamada, corpo, produtos, shopUrl, unsubscribeUrl }){
  const lista = Array.isArray(produtos) ? produtos.slice(0, 3) : [];

  const text = [
    corpo,
    ...(lista.length ? ["", ...lista.map(p => `• ${p.nome} — ${p.preco}${p.url ? ` (${p.url})` : ""}`)] : []),
    "",
    `Ver a coleção: ${shopUrl}`,
    "",
    ASSINATURA_LOJA,
    ...(unsubscribeUrl ? ["", `Não quer mais receber estes e-mails? ${unsubscribeUrl}`] : []),
  ].join("\n");

  const produtosHtml = lista.map(p => `
      <tr>
        ${celulaMiniatura(p.photoUrl, p.nome)}
        ${CELULA_ESPACO}
        <td class="e-texto e-borda" valign="middle" style="font-family:${FONT_CORPO}; color:${CORES.texto}; font-size:14px; padding:8px 0; border-bottom:1px solid ${CORES.faixa};">
          ${p.url ? `<a href="${escapeHTML(p.url)}" style="color:${CORES.texto}; text-decoration:none;">${escapeHTML(p.nome)}</a>` : escapeHTML(p.nome)}
          <br><span style="color:${CORES.apoio};">${escapeHTML(p.preco)}</span>
        </td>
      </tr>`).join("");

  const html = emailShell({
    titulo: assunto,
    preheader: chamada || assunto,
    eyebrow: "novidades da Arte Canecas",
    tituloCartao: assunto,
    corpoHtml: `
      ${paragrafosDoTexto(corpo)}
      ${produtosHtml ? `
      <tr>
        <td style="padding:10px 0 26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${produtosHtml}</table>
        </td>
      </tr>` : ""}
      ${botaoEmail(shopUrl, "Ver a coleção")}
      ${rodapeDeDescadastro(unsubscribeUrl)}
    `,
  });

  return { subject: assunto, text, html };
}

function formatAniversarioEmail({ nome, couponCode, percentOff, shopUrl, contaUrl }){
  const subject = `🎂 Feliz aniversário${nome ? `, ${nome}` : ""}! Um presente da Arte Canecas`;
  const text = [
    nome ? `Feliz aniversário, ${nome}! ✿` : "Feliz aniversário! ✿",
    "",
    `Para comemorar, um presente: ${percentOff}% de desconto em qualquer peça da loja.`,
    `Cupom: ${couponCode}`,
    "",
    "Vale na sua conta até 30 dias depois do seu aniversário, uma vez.",
    "",
    `Ver a coleção: ${shopUrl}`,
    "",
    `Não quer mais este e-mail? Tire a data de nascimento em Minha conta: ${contaUrl}`,
    "",
    ASSINATURA_LOJA,
  ].join("\n");

  const html = emailShell({
    titulo: subject,
    preheader: `Um presente de aniversário: ${percentOff}% de desconto, só para você.`,
    eyebrow: "feliz aniversário",
    tituloCartao: nome ? `Feliz aniversário, ${escapeHTML(nome)}! 🎂` : "Feliz aniversário! 🎂",
    corpoHtml: `
      <tr>
        <td class="e-apoio" align="center" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:15px; line-height:1.6; padding-bottom:26px;">
          Para comemorar, um presente: <strong class="e-texto" style="color:${CORES.texto};">${escapeHTML(String(percentOff))}% de desconto</strong> em qualquer peça da loja.
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-bottom:26px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td class="e-caixa e-destaqueBorda" align="center" style="background:${CORES.caixaSuave}; border:2px dashed ${CORES.destaqueClaro}; border-radius:16px; padding:16px 36px;">
                <span class="e-destaque" style="font-family:${FONT_CORPO}; font-size:24px; font-weight:bold; letter-spacing:3px; color:${CORES.destaque};">
                  ${escapeHTML(couponCode)}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td class="e-apoio" align="center" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:14px; line-height:1.6; padding-bottom:26px;">
          Vale na sua conta até 30 dias depois do seu aniversário, uma vez.
        </td>
      </tr>
      ${botaoEmail(shopUrl, "Escolher meu presente")}
      <tr>
        <td class="e-tenue" align="center" style="font-family:${FONT_CORPO}; color:${CORES.tenue}; font-size:11px; line-height:1.6; padding-top:18px;">
          Não quer mais este e-mail? <a class="e-tenue" href="${escapeHTML(contaUrl)}" style="color:${CORES.tenue}; text-decoration:underline;">Tire a data de nascimento em Minha conta</a>.
        </td>
      </tr>
    `,
  });
  return { subject, text, html };
}

async function sendAvisoDeSegurancaDaConta({ to, nome, oQue, novoEmail }){
  const quando = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const descricao = oQue === "email"
    ? `o e-mail de acesso da sua conta foi trocado para ${novoEmail}`
    : oQue === "redefinicao"
      ? "a senha da sua conta foi redefinida pelo link de \"esqueci a senha\""
      : "a senha da sua conta foi alterada";
  const subject = oQue === "email" ? "Seu e-mail de acesso foi alterado" : oQue === "redefinicao" ? "Sua senha foi redefinida" : "Sua senha foi alterada";
  const text = [
    nome ? `Oi, ${nome}!` : "Oi!",
    "",
    `Só avisando: ${descricao} (${quando}).`,
    "",
    "Se foi você, pode ignorar este e-mail.",
    "Se NÃO foi você, responda este e-mail ou fale com a gente pelo WhatsApp agora.",
    "",
    ASSINATURA_LOJA,
  ].join("\n");
  const html = emailShell({
    titulo: subject,
    preheader: `Aviso de segurança: ${descricao}.`,
    eyebrow: "aviso de segurança",
    tituloCartao: subject,
    corpoHtml: `
      <tr>
        <td class="e-apoio" align="center" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:15px; line-height:1.6; padding-bottom:18px;">
          ${nome ? `Oi, ${escapeHTML(nome)}! ` : ""}Só avisando: ${escapeHTML(descricao)} (${escapeHTML(quando)}).
        </td>
      </tr>
      <tr>
        <td class="e-apoio" align="center" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:14px; line-height:1.6;">
          Se foi você, pode ignorar este e-mail. Se <strong>não</strong> foi você, responda este e-mail ou fale com a gente pelo WhatsApp agora.
        </td>
      </tr>
    `,
  });
  return sendEmail({ to, subject, text, html });
}

function formatAlertaDeSegurancaEmail({ titulo, resumo, dados = [], orientacao }){
  const quando = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const linhas = [...dados, ["Quando", quando]].filter(([, v]) => v != null && v !== "");
  const subject = `⚠️ ${titulo}`;
  const text = [
    resumo,
    "",
    ...linhas.map(([r, v]) => `${r}: ${v}`),
    "",
    orientacao || "",
  ].join("\n").trim();
  const html = emailShell({
    titulo: subject,
    preheader: resumo,
    eyebrow: "alerta de segurança",
    tituloCartao: titulo,
    corpoHtml: `
      <tr>
        <td class="e-apoio" align="left" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:14px; line-height:1.6; padding-bottom:14px;">
          ${escapeHTML(resumo)}
        </td>
      </tr>
      <tr>
        <td class="e-apoio" align="left" style="font-family:${FONT_CORPO}; color:${CORES.apoio}; font-size:13px; line-height:1.6; padding-bottom:18px;">
          ${linhas.map(([r, v]) => linhaDado(r, String(v))).join("")}
        </td>
      </tr>
      ${orientacao ? `<tr>
        <td class="e-texto e-caixa" align="left" style="font-family:${FONT_CORPO}; color:${CORES.texto}; font-size:14px; line-height:1.6; background:${CORES.caixaSuave}; border-radius:14px; padding:16px 18px;">
          ${escapeHTML(orientacao)}
        </td>
      </tr>` : ""}
    `,
  });
  return { subject, text, html };
}

module.exports = {
  formatAlertaDeSegurancaEmail,
  formatAniversarioEmail,
  sendAvisoDeSegurancaDaConta,
  formatConfirmarRecebimentoEmail,
  formatPedirAvaliacaoEmail,
  formatCarrinhoEsquecidoEmail,
  formatCampanhaEmail,
  cabecalhosDeDescadastro,
  formatOrderEmail,
  formatContactEmail,
  formatOrderConfirmationEmail,
  formatTrackingEmail,
  sendEmail,
  notifyOwnerOfPaidOrder,
  notifyOwnerOfContactMessage,
  sendPasswordResetEmail,
  sendTwoFactorEmailCode,
  sendConfirmarNovoEmail,
  sendWelcomeCouponEmail,
  sendAdminLoginAlert,
};
