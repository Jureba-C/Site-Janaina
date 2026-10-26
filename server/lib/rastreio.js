"use strict";

const STATUS_DE_ENTREGA = new Set(["delivered", "entregue"]);

function eventoDeEntrega(live){
  const events = Array.isArray(live?.events) ? live.events : (Array.isArray(live) ? live : []);
  const evento = events.find(ev => {
    const texto = String(ev?.description || "").toLowerCase();
    return texto.includes("entregue") && !texto.includes("remetente");
  });
  if(evento) return evento;

  const status = String(live?.status || "").trim().toLowerCase();
  if(STATUS_DE_ENTREGA.has(status)) return { description: live.status, date: null, location: null };
  return null;
}

function dataDoEvento(evento){
  if(!evento?.date) return null;
  const d = new Date(evento.date);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function linkDaTransportadora(trackingCode){
  if(!trackingCode) return null;
  return `https://melhorenvio.com.br/rastreio/${encodeURIComponent(trackingCode)}`;
}

module.exports = {
  eventoDeEntrega,
  dataDoEvento,
  linkDaTransportadora,
};
