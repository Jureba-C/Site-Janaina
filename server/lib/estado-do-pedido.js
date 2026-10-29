const MAPA_STATUS_MP = {
  approved: "pago",
  pending: "pendente",
  in_process: "em análise",
  rejected: "recusado",
  cancelled: "cancelado",
  refunded: "reembolsado",
  charged_back: "estornado",
};

const AINDA_ABERTO = new Set(["pendente", "em análise", "recusado", "cancelado"]);

function idNumerico(valor){
  try { return BigInt(String(valor)); } catch { return null; }
}

function eAtualOuMaisNovo(pedido, id){
  if(!pedido.payment_id) return true;
  if(String(pedido.payment_id) === String(id)) return true;
  const atual = idNumerico(pedido.payment_id);
  const novo = idNumerico(id);
  return atual !== null && novo !== null && novo > atual;
}

function ignorar(alerta = null){
  return { acao: "ignorar", novoStatus: null, virouPago: false, definirVencedor: false, alerta };
}

function aplicar(novoStatus, extra = {}){
  return { acao: "aplicar", novoStatus, virouPago: false, definirVencedor: false, alerta: null, ...extra };
}

function decidir({ pedido, pagamento }){
  const atual = pedido.status;
  const id = String(pagamento.id);
  const doVencedor = Boolean(pedido.pagamento_aprovado_id) && String(pedido.pagamento_aprovado_id) === id;
  const mp = pagamento.status;

  if(mp === "approved"){
    if(!pagamento.confere){
      if(atual === "pago") return ignorar("pagamento_divergente");
      if(atual === "em análise") return ignorar();
      if(atual === "pendente" || atual === "recusado" || atual === "cancelado"){
        return aplicar("em análise", { alerta: "pagamento_divergente" });
      }
      return ignorar("pagamento_divergente");
    }
    if(atual === "pago") return doVencedor ? ignorar() : ignorar("pagamento_duplicado");
    if(atual === "estornado") return doVencedor ? aplicar("pago", { alerta: "estorno_revertido" }) : ignorar("pagamento_duplicado");
    if(atual === "reembolsado") return ignorar("pagamento_apos_reembolso");
    if(AINDA_ABERTO.has(atual)){
      return aplicar("pago", {
        virouPago: true,
        definirVencedor: true,
        alerta: atual === "cancelado" ? "pago_atrasado" : null,
      });
    }
    return ignorar("status_desconhecido");
  }

  if(mp === "pending" || mp === "in_process"){
    if(!eAtualOuMaisNovo(pedido, id)) return ignorar();
    const novo = MAPA_STATUS_MP[mp];
    if(atual === "pendente") return novo === atual && String(pedido.payment_id || "") === id ? ignorar() : aplicar(novo);
    if(atual === "recusado") return aplicar(novo);
    return ignorar();
  }

  if(mp === "rejected"){
    if(!eAtualOuMaisNovo(pedido, id)) return ignorar();
    if(atual === "pendente" || atual === "em análise") return aplicar("recusado");
    return ignorar();
  }

  if(mp === "cancelled"){
    if(!eAtualOuMaisNovo(pedido, id)) return ignorar();
    if(atual === "pendente" || atual === "em análise" || atual === "recusado") return aplicar("cancelado");
    return ignorar();
  }

  if(mp === "refunded"){
    if(atual === "pago" && doVencedor) return aplicar("reembolsado", { alerta: "reembolso" });
    if(atual === "pendente" || atual === "em análise") return ignorar("reembolso_sem_pagamento");
    return ignorar();
  }

  if(mp === "charged_back"){
    if((atual === "pago" || atual === "reembolsado") && doVencedor) return aplicar("estornado", { alerta: "estorno" });
    if(atual === "pendente" || atual === "em análise") return ignorar("estorno_sem_pagamento");
    return ignorar();
  }

  if(mp === "in_mediation" && atual === "pago" && doVencedor) return ignorar("disputa_aberta");
  return ignorar();
}

module.exports = { MAPA_STATUS_MP, decidir, eAtualOuMaisNovo };
