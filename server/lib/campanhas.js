const db = require("./db.js");
const email = require("./email.js");

const LOTE_PADRAO = Number(process.env.CAMPANHA_POR_RODADA) || 40;

function linkDeDescadastro(origem, emailDestino){
  const token = db.garantirTokenDeContato(emailDestino);
  return `${origem}/api/newsletter/unsubscribe?email=${encodeURIComponent(emailDestino)}&token=${token}`;
}

function enfileirarLote({ campanha, produtos, origem, limite = LOTE_PADRAO }){
  const destinatarios = db.destinatariosPendentes(campanha.id, limite);
  let novos = 0;

  for(const destino of destinatarios){
    if(db.pediuDescadastro(destino)){
      db.marcarDestinatarioEnfileirado(campanha.id, destino);
      continue;
    }

    const conteudo = email.formatCampanhaEmail({
      assunto: campanha.assunto,
      chamada: campanha.chamada,
      corpo: campanha.corpo,
      produtos,
      shopUrl: origem,
      unsubscribeUrl: linkDeDescadastro(origem, destino),
    });

    const id = db.enqueueEmail({
      kind: "campanha",
      toEmail: destino,
      orderReference: `campanha:${campanha.id}:${destino}`,
      subject: conteudo.subject,
      textBody: conteudo.text,
      htmlBody: conteudo.html,
    });
    db.marcarDestinatarioEnfileirado(campanha.id, destino);
    if(id) novos++;
  }

  const contagem = db.contagemDaCampanha(campanha.id);
  if(contagem.enfileirados >= contagem.total) db.mudarStatusCampanha(campanha.id, "concluida");
  return { novos, contagem };
}

module.exports = { enfileirarLote, LOTE_PADRAO };
