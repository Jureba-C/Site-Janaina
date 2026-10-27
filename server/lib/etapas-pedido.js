const regras = require("../js/regras-produto.js");
const { itemParaExibir } = require("./itens-pedido.js");

const PRAZO_PADRAO_DIAS_UTEIS = 5;
const FUSO = "America/Sao_Paulo";
const DIA_MS = 86400000;

const FERIADOS_FIXOS = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"];

function domingoDePascoa(ano){
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(ano, mes - 1, dia);
}

const feriadosMoveis = new Map();
function feriadosMoveisDoAno(ano){
  if(!feriadosMoveis.has(ano)){
    const pascoa = domingoDePascoa(ano);
    feriadosMoveis.set(ano, new Set([-48, -47, -2, 60].map(d => paraTexto(pascoa + d * DIA_MS))));
  }
  return feriadosMoveis.get(ano);
}

function paraTexto(utcMs){
  return new Date(utcMs).toISOString().slice(0, 10);
}

function diaLocal(ms){
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
  return Date.parse(`${partes}T00:00:00Z`);
}

function ehDiaUtil(utcMs){
  const semana = new Date(utcMs).getUTCDay();
  if(semana === 0 || semana === 6) return false;
  const texto = paraTexto(utcMs);
  if(FERIADOS_FIXOS.includes(texto.slice(5))) return false;
  return !feriadosMoveisDoAno(Number(texto.slice(0, 4))).has(texto);
}

function somarDiasUteis(ms, dias){
  let dia = diaLocal(ms);
  let somados = 0;
  while(somados < dias){
    dia += DIA_MS;
    if(ehDiaUtil(dia)) somados++;
  }
  return paraTexto(dia);
}

function prazoDoPedido(pagoEm, diasUteis, agora = Date.now()){
  if(!pagoEm) return null;
  const dias = Number.isInteger(diasUteis) && diasUteis > 0 ? diasUteis : PRAZO_PADRAO_DIAS_UTEIS;
  const data = somarDiasUteis(pagoEm, dias);
  const faltam = Math.round((Date.parse(`${data}T00:00:00Z`) - diaLocal(agora)) / DIA_MS);
  return { data, faltam, atrasado: faltam < 0 };
}

function textoDoPrazo(prazo){
  if(!prazo) return "";
  if(prazo.faltam < 0) return prazo.faltam === -1 ? "Atrasado 1 dia" : `Atrasado ${-prazo.faltam} dias`;
  if(prazo.faltam === 0) return "Vence hoje";
  if(prazo.faltam === 1) return "Vence amanhã";
  return `Faltam ${prazo.faltam} dias`;
}

function itensDoPedido(row){
  try { const itens = JSON.parse(row.items_json || "[]"); return Array.isArray(itens) ? itens : []; } catch { return []; }
}

function precisaAprovarArte(itens){
  return itens.some(item => item?.escolhas?.personalizacao?.aprovarWhatsApp === true);
}

function ehRetiradaDoPedido(row){
  try { return JSON.parse(row.shipping_json || "{}").service_id === "retirada"; } catch { return false; }
}

function etapaDoPedido(row){
  if(!row || row.status !== "pago") return null;
  if(row.fulfillment_status === "entregue") return "entregue";
  if(row.fulfillment_status === "postado") return "enviado";
  if(row.fulfillment_status === "pronto") return "pronto";
  if(precisaAprovarArte(itensDoPedido(row)) && !row.arte_aprovada_em) return "aprovar";
  return "produzir";
}

const ROTULO_DA_ETAPA = {
  aprovar: "Aprovar arte",
  produzir: "Produzir",
  pronto: "Pronto",
  enviado: "Enviado",
  entregue: "Entregue",
};

function rotuloDaEtapa(etapa, retirada){
  if(etapa === "pronto" && retirada) return "Pronto para retirar";
  if(etapa === "pronto") return "Pronto para postar";
  if(etapa === "entregue" && retirada) return "Retirado";
  return ROTULO_DA_ETAPA[etapa] || "";
}

function pecaDoItem(item, overridesMap){
  const exibir = itemParaExibir(item, overridesMap);
  const config = exibir.config || {};
  const escolhas = item.escolhas || {};
  const pers = escolhas.personalizacao || {};
  const variacao = (config.variacoes || [])
    .map(g => (g.opcoes || []).find(o => o.id === escolhas.variacoes?.[g.id])?.nome)
    .filter(Boolean);
  const adicionais = (config.adicionais || []).filter(a => (escolhas.adicionais || []).includes(a.id)).map(a => a.nome);
  return {
    produto: exibir.name,
    qtd: Number(item.qty) || 1,
    variacao: variacao.join(" · "),
    adicionais: adicionais.join(" · "),
    nome: pers.nome || "",
    frase: pers.frase || "",
    data: pers.data || "",
    observacoes: pers.observacoes || "",
    letra: pers.letra ? regras.nomeDaLetra(pers.letra) : "",
    arte: pers.arte ? regras.nomeDaArte(pers.arte) : "",
    estampa: ((item.resumo || []).find(l => l && l.rotulo === "Estampa") || {}).valor || "",
    estampaId: pers.estampa || "",
    fotos: exibir.fotos.length,
    aprovarArte: pers.aprovarWhatsApp === true,
  };
}

function nomeDoLote(peca){
  return [peca.produto, peca.variacao, peca.estampa ? `estampa ${peca.estampa}` : ""].filter(Boolean).join(" · ");
}

module.exports = {
  pecaDoItem, nomeDoLote,
  PRAZO_PADRAO_DIAS_UTEIS, ehDiaUtil, somarDiasUteis, prazoDoPedido, textoDoPrazo,
  precisaAprovarArte, etapaDoPedido, rotuloDaEtapa, ehRetiradaDoPedido, itensDoPedido,
};
