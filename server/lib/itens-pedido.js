const { effectiveProduct } = require("./catalogo.js");

function fotosDaPersonalizacao(escolhas){
  const fotos = escolhas?.personalizacao?.fotos;
  const ids = Array.isArray(fotos) ? fotos.map(f => f.id).filter(Boolean) : [];
  const daEstampa = escolhas?.personalizacao?.estampaPropria?.foto?.id;
  if(daEstampa && !ids.includes(daEstampa)) ids.push(daEstampa);
  return ids;
}

function itemParaExibir(item, overridesMap){
  const produto = effectiveProduct(item.id, overridesMap);
  return {
    id: item.id,
    qty: item.qty,
    name: item.nome || produto?.name || `Produto #${item.id}`,
    unitPrice: item.price ?? produto?.price ?? null,
    photoUrl: produto?.photoUrl || null,
    resumo: Array.isArray(item.resumo) ? item.resumo : [],
    escolhas: item.escolhas || null,
    config: item.config || produto?.config || null,
    fotos: fotosDaPersonalizacao(item.escolhas),
  };
}

function textoDoResumo(resumo){
  return (Array.isArray(resumo) ? resumo : []).map(l => `${l.rotulo}: ${l.valor}`).join(" · ");
}

module.exports = { itemParaExibir, textoDoResumo, fotosDaPersonalizacao };
