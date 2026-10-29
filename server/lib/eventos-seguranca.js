const crypto = require("node:crypto");
const db = require("./db");
const { formatAlertaDeSegurancaEmail } = require("./email");

const MIN = 60 * 1000;

const TIPOS = {
  login_ok: { gravidade: "info" },
  login_falhou: { gravidade: "aviso" },
  conta_lenta: { gravidade: "aviso", alertar: true, agruparMin: 60, titulo: "Muitas tentativas de senha numa conta", resumo: "Uma conta recebeu muitas senhas erradas, de vários endereços. Os próximos logins dela estão sendo atrasados.", orientacao: "Se for a conta do painel e não foi você, troque a senha e confira o app autenticador." },
  admin_novo_acesso: { gravidade: "critico", alertar: true, agruparMin: 1, titulo: "Alguém entrou no painel da loja", resumo: "Um acesso ao painel acabou de ser liberado (senha + app autenticador).", orientacao: "Se não foi você, troque a senha agora e peça ao Caio para derrubar todas as sessões." },
  admin_2fa_falhou: { gravidade: "aviso", alertar: true, agruparMin: 30, titulo: "Código do app autenticador errado no painel", resumo: "Alguém acertou a senha do painel mas errou o código do app autenticador.", orientacao: "Se não foi você, troque a senha do painel agora." },
  admin_2fa_redefinido: { gravidade: "critico", alertar: true, agruparMin: 1, titulo: "O app autenticador do painel foi zerado", resumo: "A verificação em duas etapas de uma conta do painel foi zerada pela hospedagem (ADMIN_2FA_REDEFINIR).", orientacao: "Cadastre o app de novo e tire a variável ADMIN_2FA_REDEFINIR da hospedagem." },
  dois_fatores_trocado: { gravidade: "critico", alertar: true, agruparMin: 1, titulo: "O app autenticador do painel foi trocado", resumo: "A verificação em duas etapas do painel foi ativada ou trocada.", orientacao: "Se não foi você, entre em contato com o Caio na hora." },
  senha_redefinida: { gravidade: "aviso" },
  senha_redefinida_admin: { gravidade: "critico", alertar: true, agruparMin: 1, titulo: "A senha do painel foi redefinida", resumo: "Alguém usou o \"esqueci a senha\" na conta do painel e trocou a senha.", orientacao: "Se não foi você, a sua caixa de e-mail pode ter sido invadida: troque a senha do e-mail e fale com o Caio." },
  email_trocado: { gravidade: "aviso" },
  export_completo: { gravidade: "aviso", alertar: true, agruparMin: 60, titulo: "A planilha completa de clientes foi baixada", resumo: "Alguém baixou a planilha com os dados das clientes pelo painel.", orientacao: "Se não foi você, troque a senha do painel agora." },
  backup_baixado: { gravidade: "aviso", alertar: true, agruparMin: 60, titulo: "O backup da loja foi baixado", resumo: "Alguém baixou o backup criptografado pelo painel.", orientacao: "Se não foi você, troque a senha do painel agora." },
  pedido_arquivado: { gravidade: "info" },
  cupom_alterado: { gravidade: "info" },
  confirmacao_admin: { gravidade: "info" },
  webhook_assinatura_invalida: { gravidade: "aviso", alertar: true, agruparMin: 60, limiarParaAlertar: 5, titulo: "Avisos de pagamento falsos", resumo: "O site recebeu várias notificações de pagamento com assinatura inválida e recusou todas.", orientacao: "Nada a fazer se continuar assim. Se o Mercado Pago parar de confirmar pagamentos, confira o MP_WEBHOOK_SECRET." },
  webhook_sem_segredo: { gravidade: "critico", alertar: true, agruparMin: 360, titulo: "Pagamentos esperando configuração", resumo: "O Mercado Pago avisou um pagamento, mas o site está sem MP_WEBHOOK_SECRET e recusou por segurança.", orientacao: "Configure o MP_WEBHOOK_SECRET na hospedagem. O Mercado Pago reenvia o aviso sozinho." },
  webhook_ts_antigo: { gravidade: "aviso" },
  pagamento_duplicado: { gravidade: "critico", alertar: true, agruparMin: 1, titulo: "Pedido pago duas vezes", resumo: "Chegou um segundo pagamento aprovado para um pedido que já estava pago.", orientacao: "Devolva o pagamento repetido pelo painel do Mercado Pago." },
  pagamento_divergente: { gravidade: "critico", alertar: true, agruparMin: 1, titulo: "Pagamento com valor ou forma diferente", resumo: "O Mercado Pago aprovou um pagamento que não bate com o pedido (valor, moeda ou forma de pagamento). O pedido ficou em análise.", orientacao: "Confira o pagamento no Mercado Pago antes de produzir." },
  pago_atrasado: { gravidade: "aviso", alertar: true, agruparMin: 1, titulo: "Pagamento chegou depois do pedido cancelado", resumo: "Um pedido que estava cancelado recebeu um pagamento aprovado e voltou para pago.", orientacao: "Confira o pedido e combine o prazo com a cliente." },
  pagamento_apos_reembolso: { gravidade: "critico", alertar: true, agruparMin: 1, titulo: "Pagamento em pedido já reembolsado", resumo: "Chegou um pagamento aprovado para um pedido que já tinha sido reembolsado.", orientacao: "Confira no Mercado Pago e devolva se for o caso." },
  reembolso: { gravidade: "aviso", alertar: true, agruparMin: 1, titulo: "Pedido reembolsado", resumo: "O pagamento de um pedido foi reembolsado no Mercado Pago.", orientacao: "Se o pedido ainda não foi produzido, pare a produção." },
  estorno: { gravidade: "critico", alertar: true, agruparMin: 1, titulo: "Estorno (chargeback) num pedido", resumo: "A cliente contestou o pagamento no cartão.", orientacao: "Responda a disputa no Mercado Pago com as provas de entrega." },
  estorno_revertido: { gravidade: "aviso", alertar: true, agruparMin: 1, titulo: "Estorno revertido", resumo: "Um estorno foi revertido e o pedido voltou a ficar pago.", orientacao: "Nada a fazer." },
  disputa_aberta: { gravidade: "critico", alertar: true, agruparMin: 1, titulo: "Disputa aberta num pedido", resumo: "A cliente abriu uma disputa sobre o pagamento.", orientacao: "Responda no Mercado Pago o quanto antes." },
  reembolso_sem_pagamento: { gravidade: "aviso" },
  estorno_sem_pagamento: { gravidade: "aviso" },
  status_desconhecido: { gravidade: "aviso" },
  etiqueta_repetida_bloqueada: { gravidade: "aviso" },
  upload_quota: { gravidade: "aviso", alertar: true, agruparMin: 60, titulo: "Muitas fotos enviadas", resumo: "O limite de fotos soltas (sem pedido) foi atingido e novos envios estão sendo recusados por um tempo.", orientacao: "Se for movimento normal de clientes, avise o Caio para aumentar o limite." },
  cron_token_invalido: { gravidade: "aviso", alertar: true, agruparMin: 360, limiarParaAlertar: 10, titulo: "Chamadas erradas na rotina automática", resumo: "Alguém tentou chamar a rotina automática da loja com a chave errada.", orientacao: "Nada a fazer se continuar assim." },
  backup_ok: { gravidade: "info" },
  backup_falhou: { gravidade: "critico", alertar: true, agruparMin: 360, titulo: "O backup da loja falhou", resumo: "A cópia de segurança diária não conseguiu ser enviada.", orientacao: "Peça ao Caio para conferir as chaves do backup na hospedagem." },
  backup_atrasado: { gravidade: "critico", alertar: true, agruparMin: 720, titulo: "Backup atrasado", resumo: "Faz mais de 26 horas que a loja não faz uma cópia de segurança.", orientacao: "Peça ao Caio para conferir o backup e a rotina automática." },
  erro_nao_tratado: { gravidade: "aviso", alertar: true, agruparMin: 60, limiarParaAlertar: 3, titulo: "Erros inesperados no site", resumo: "O servidor registrou erros inesperados.", orientacao: "Avise o Caio para olhar o registro." },
  csp_violacao: { gravidade: "info" },
  sessoes_derrubadas: { gravidade: "aviso" },
};

let entregar = null;
let avisarWhatsapp = null;

function configurar(opcoes = {}){
  if(typeof opcoes.entregar === "function") entregar = opcoes.entregar;
  if(typeof opcoes.avisarWhatsapp === "function") avisarWhatsapp = opcoes.avisarWhatsapp;
}

function hashDoEmail(email){
  if(!email) return null;
  return crypto.createHash("sha256").update(String(email).trim().toLowerCase()).digest("hex").slice(0, 32);
}

function limparDetalhes(detalhes){
  if(!detalhes || typeof detalhes !== "object") return null;
  const limpo = {};
  for(const [chave, valor] of Object.entries(detalhes).slice(0, 12)){
    if(!/^[a-zA-Z_]{1,40}$/.test(chave)) continue;
    if(valor == null) continue;
    if(typeof valor === "number" || typeof valor === "boolean") limpo[chave] = valor;
    else limpo[chave] = String(valor).replace(/[\r\n\t]+/g, " ").slice(0, 200);
  }
  return Object.keys(limpo).length ? JSON.stringify(limpo) : null;
}

function rotuloDoPedido(pedido){
  return pedido ? String(pedido).slice(0, 8) : null;
}

function registrar(tipo, { req = null, userId = null, email = null, pedido = null, detalhes = null } = {}){
  const def = TIPOS[tipo] || { gravidade: "info" };
  const agora = Date.now();
  try {
    db.inserirEventoDeSeguranca({
      tipo,
      gravidade: def.gravidade,
      userId: userId ?? req?.user?.id ?? null,
      emailHash: hashDoEmail(email),
      ip: req?.ip ? String(req.ip).slice(0, 64) : null,
      agente: req?.get ? String(req.get("user-agent") || "").slice(0, 160) || null : null,
      pedido: pedido ? String(pedido).slice(0, 64) : null,
      detalhes: limparDetalhes(detalhes),
      quando: agora,
    });
  } catch (err) {
    console.error(`Não deu para registrar o evento ${tipo}:`, err?.message || err);
    return;
  }
  if(!def.alertar) return;
  const janelaMs = (def.agruparMin || 60) * MIN;
  if(def.limiarParaAlertar && db.contarEventosDeSeguranca(tipo, agora - janelaMs) < def.limiarParaAlertar) return;
  alertar(tipo, def, { pedido, detalhes, janelaMs, agora });
}

function alertar(tipo, def, { pedido, detalhes, janelaMs, agora }){
  const destino = process.env.OWNER_EMAIL;
  const janela = Math.floor(agora / janelaMs);
  const dados = [];
  if(pedido) dados.push(["Pedido", rotuloDoPedido(pedido)]);
  if(detalhes?.pagamento) dados.push(["Pagamento", String(detalhes.pagamento)]);
  if(detalhes?.valor != null) dados.push(["Valor", String(detalhes.valor)]);
  const conteudo = formatAlertaDeSegurancaEmail({ titulo: def.titulo, resumo: def.resumo, dados, orientacao: def.orientacao });
  if(destino){
    try {
      const id = db.enqueueEmail({
        kind: "alerta_seguranca",
        toEmail: destino,
        orderReference: `alerta:${tipo}:${pedido || "geral"}:${janela}`,
        subject: conteudo.subject,
        textBody: conteudo.text,
        htmlBody: conteudo.html,
      });
      if(id && entregar) Promise.resolve(entregar(id)).catch(() => {});
    } catch (err) {
      console.error(`Não deu para enfileirar o alerta ${tipo}:`, err?.message || err);
    }
  }
  if(def.gravidade === "critico" && avisarWhatsapp){
    Promise.resolve(avisarWhatsapp(`${def.titulo}. ${def.resumo}${pedido ? ` Pedido ${rotuloDoPedido(pedido)}.` : ""}`)).catch(() => {});
  }
}

function listar(opcoes){
  return db.listarEventosDeSeguranca(opcoes).map(e => ({
    id: e.id,
    tipo: e.tipo,
    gravidade: e.gravidade,
    titulo: TIPOS[e.tipo]?.titulo || null,
    usuario: e.user_id,
    ip: e.ip,
    agente: e.agente,
    pedido: rotuloDoPedido(e.pedido),
    detalhes: e.detalhes ? JSON.parse(e.detalhes) : null,
    quando: e.created_at,
  }));
}

module.exports = { TIPOS, configurar, registrar, listar, hashDoEmail, limparDetalhes };
