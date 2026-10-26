const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const db = require("../lib/db.js");
const emailPhotos = require("../lib/emailPhotos.js");
const rastreio = require("../lib/rastreio.js");
const melhorEnvio = require("../lib/melhorEnvio.js");
const email = require("../lib/email.js");
const campanhas = require("../lib/campanhas.js");
const catalogo = require("../lib/catalogo.js");
const produtoUrl = require("../js/produto-url.js");
const pricing = require("../js/pricing.js");

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3333";

const LOTE = 20;

async function reenviarFilaDeEmail(){
  const pendentes = db.pendingEmails(LOTE);
  if(!pendentes.length){
    console.log("Fila de e-mail vazia — nada a reenviar.");
    return { enviados: 0, falhas: 0 };
  }

  let enviados = 0;
  let falhas = 0;
  for(const linha of pendentes){
    try{
      await emailPhotos.enviarComMiniaturas({
        to: linha.to_email,
        subject: linha.subject,
        text: linha.text_body,
        html: linha.html_body,
        headers: KINDS_COM_DESCADASTRO.has(linha.kind)
          ? email.cabecalhosDeDescadastro(linkDeDescadastro(linha.to_email))
          : undefined,
      });
      db.markEmailSent(linha.id);
      enviados++;
      console.log(`  ✓ ${linha.kind} → ${linha.to_email} (pedido ${linha.order_reference || "-"})`);
    }catch(err){
      db.markEmailFailed(linha.id, err.message || err);
      falhas++;
      console.error(`  ✗ ${linha.kind} → ${linha.to_email}: ${err.message || err}`);
    }
  }
  console.log(`Fila de e-mail: ${enviados} enviado(s), ${falhas} falha(s), ${pendentes.length} tentado(s).`);
  return { enviados, falhas };
}

async function fecharEntregasConfirmadas(){
  const pedidos = db.listOrdersAwaitingDelivery();
  if(!pedidos.length){
    console.log("Entregas: nenhum pedido postado aguardando confirmação.");
    return { conferidos: 0, entregues: 0 };
  }
  let entregues = 0;
  for(const pedido of pedidos){
    const { live, shipmentId, descoberto } = await melhorEnvio.rastreioDoPedido({
      trackingCode: pedido.tracking_code,
      shipmentId: pedido.melhor_envio_shipment_id,
    });
    if(descoberto && shipmentId) db.setMelhorEnvioShipmentId(pedido.external_reference, shipmentId);
    const evento = rastreio.eventoDeEntrega(live);
    if(evento){
      db.markOrderDelivered(pedido.external_reference, rastreio.dataDoEvento(evento));
      entregues++;
      console.log(`  ✓ ${pedido.external_reference} entregue — ${evento.description}`);
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  console.log(`Entregas: ${pedidos.length} conferido(s), ${entregues} confirmado(s) como entregue(s).`);
  return { conferidos: pedidos.length, entregues };
}

function linkDeAvaliacao(reference){
  const token = db.garantirTokenDeAvaliacao(reference);
  return `${CLIENT_ORIGIN}/avaliar.html?pedido=${encodeURIComponent(reference)}#t=${token}`;
}

const WHATSAPP_DA_LOJA = "https://wa.me/5561996927401";

const KINDS_COM_DESCADASTRO = new Set(["carrinho_esquecido", "campanha"]);

function linkDeDescadastro(emailDestino){
  const token = db.garantirTokenDeContato(emailDestino);
  return `${CLIENT_ORIGIN}/api/newsletter/unsubscribe?email=${encodeURIComponent(emailDestino)}&token=${token}`;
}

function itensComNome(itemsJson){
  let brutos = [];
  try { brutos = JSON.parse(itemsJson); } catch { return []; }
  const overrides = catalogo.getProductOverridesMap();
  return brutos.map(item => {
    const p = catalogo.effectiveProduct(Number(item.id), overrides);
    return {
      id: item.id,
      qty: Number(item.qty) || 1,
      name: p?.name || `Produto #${item.id}`,
      photoUrl: p?.photoUrl || null,
    };
  });
}

function enderecoDe(pedido){
  try { return JSON.parse(pedido.address_json); } catch { return null; }
}

function enfileirarConfirmacoesDeRecebimento(agora = Date.now()){
  let novos = 0;
  for(const pedido of db.pedidosParaConfirmarRecebimento(agora)){
    const conteudo = email.formatConfirmarRecebimentoEmail({
      externalReference: pedido.external_reference,
      address: enderecoDe(pedido),
      avaliarUrl: linkDeAvaliacao(pedido.external_reference),
    });
    const id = db.enqueueEmail({
      kind: "confirmar_recebimento",
      toEmail: pedido.customer_email,
      orderReference: pedido.external_reference,
      subject: conteudo.subject,
      textBody: conteudo.text,
      htmlBody: conteudo.html,
    });
    if(id) novos++;
  }
  console.log(`"Seu pedido chegou?": ${novos} novo(s) na fila.`);
  return novos;
}

function enfileirarPedidosDeAvaliacao(agora = Date.now()){
  let novos = 0;
  for(const pedido of db.pedidosParaPedirAvaliacao(agora)){
    const conteudo = email.formatPedirAvaliacaoEmail({
      externalReference: pedido.external_reference,
      address: enderecoDe(pedido),
      avaliarUrl: linkDeAvaliacao(pedido.external_reference),
    });
    const id = db.enqueueEmail({
      kind: "pedir_avaliacao",
      toEmail: pedido.customer_email,
      orderReference: pedido.external_reference,
      subject: conteudo.subject,
      textBody: conteudo.text,
      htmlBody: conteudo.html,
    });
    if(id) novos++;
  }
  console.log(`"Como ficaram os laços?": ${novos} novo(s) na fila.`);
  return novos;
}

function enfileirarLembretesDeCarrinho(agora = Date.now()){
  let novos = 0;
  for(const pedido of db.pedidosParaLembrarCarrinho(agora)){
    const conteudo = email.formatCarrinhoEsquecidoEmail({
      address: enderecoDe(pedido),
      items: itensComNome(pedido.items_json),
      retomarUrl: `${CLIENT_ORIGIN}/?recuperar=${encodeURIComponent(pedido.external_reference)}`,
      whatsappUrl: WHATSAPP_DA_LOJA,
      unsubscribeUrl: linkDeDescadastro(pedido.customer_email),
    });
    const id = db.enqueueEmail({
      kind: "carrinho_esquecido",
      toEmail: pedido.customer_email,
      orderReference: pedido.external_reference,
      subject: conteudo.subject,
      textBody: conteudo.text,
      htmlBody: conteudo.html,
    });
    if(id) novos++;
  }
  console.log(`Carrinhos esquecidos: ${novos} lembrete(s) novo(s) na fila.`);
  return novos;
}

function produtosDaCampanha(campanha){
  let ids = [];
  try { ids = JSON.parse(campanha.produtos || "[]"); } catch {}
  if(!ids.length) return [];
  const overrides = catalogo.getProductOverridesMap();
  return ids.map(id => {
    const p = catalogo.effectiveProduct(Number(id), overrides);
    if(!p || p.hidden) return null;
    return {
      nome: p.name,
      preco: pricing.formatMoney(p.price),
      photoUrl: p.photoUrl,
      url: `${CLIENT_ORIGIN}${produtoUrl.caminhoDoProduto(Number(id), p.name)}?utm_source=newsletter&utm_medium=email&utm_campaign=campanha-${campanha.id}`,
    };
  }).filter(Boolean);
}

async function enfileirarLotesDeCampanha(){
  const emEnvio = db.campanhasEnviando();
  if(!emEnvio.length){
    console.log("Campanhas: nenhuma em envio.");
    return 0;
  }
  let novos = 0;
  for(const campanha of emEnvio){
    const produtos = produtosDaCampanha(campanha);
    const resultado = campanhas.enfileirarLote({ campanha, produtos, origem: CLIENT_ORIGIN });
    novos += resultado.novos;
    console.log(`  Campanha "${campanha.assunto}": ${resultado.contagem.enfileirados}/${resultado.contagem.total} na fila.`);
  }
  console.log(`Campanhas: ${novos} e-mail(s) novo(s) na fila.`);
  return novos;
}

function hojeEmBrasilia(agora){
  const partes = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(agora)).map(p => [p.type, p.value]));
  return { ano: partes.year, mesDia: `${partes.month}-${partes.day}`, hora: Number(partes.hour) };
}

function enfileirarCuponsDeAniversario(agora = Date.now()){
  const cupom = db.getCoupon(db.CUPOM_ANIVERSARIO);
  const { ano, mesDia, hora } = hojeEmBrasilia(agora);
  if(!cupom || hora < 9){
    console.log(`Aniversários: ${cupom ? "antes das 9h, fica para a próxima rodada" : "cupom de aniversário apagado no painel, nada a enviar"}.`);
    return 0;
  }
  let novos = 0;
  for(const cliente of db.aniversariantesDoDia(mesDia)){
    const conteudo = email.formatAniversarioEmail({
      nome: String(cliente.name || "").trim().split(" ")[0],
      couponCode: cupom.code,
      percentOff: cupom.percent_off,
      shopUrl: `${CLIENT_ORIGIN}/index.html#colecoes`,
      contaUrl: `${CLIENT_ORIGIN}/pedidos.html#dados`,
    });
    const id = db.enqueueEmail({
      kind: "aniversario",
      toEmail: cliente.email,
      orderReference: `aniversario:${cliente.id}:${ano}`,
      subject: conteudo.subject,
      textBody: conteudo.text,
      htmlBody: conteudo.html,
    });
    if(id) novos++;
  }
  console.log(`Aniversários: ${novos} cupom(ns) novo(s) na fila.`);
  return novos;
}

async function main(){
  await fecharEntregasConfirmadas();
  enfileirarConfirmacoesDeRecebimento();
  enfileirarPedidosDeAvaliacao();
  enfileirarLembretesDeCarrinho();
  enfileirarCuponsDeAniversario();
  await enfileirarLotesDeCampanha();
  await reenviarFilaDeEmail();
  db.gravarEstado("tarefas_periodicas_em", new Date().toISOString());
}

if(require.main === module){
  main().catch(err => {
    console.error("Erro nas tarefas periódicas:", err);
    process.exit(1);
  });
}

module.exports = { main, reenviarFilaDeEmail, fecharEntregasConfirmadas, enfileirarConfirmacoesDeRecebimento, enfileirarPedidosDeAvaliacao, enfileirarLembretesDeCarrinho, enfileirarCuponsDeAniversario, enfileirarLotesDeCampanha };
