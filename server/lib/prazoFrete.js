function numero(v){
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function faixa(r){
  const min = numero(r?.min);
  const max = numero(r?.max);
  if(!min && !max) return null;
  return { min: min || max, max: Math.max(min || 0, max || 0) };
}

function textoDoPrazo(min, max){
  if(!max) return "prazo a confirmar";
  if(min && min < max) return `${min} a ${max} dias úteis`;
  return max === 1 ? "1 dia útil" : `${max} dias úteis`;
}

function prazoDaCotacao(q){
  const custom = faixa(q?.custom_delivery_range);
  const original = faixa(q?.delivery_range);
  const customUnico = numero(q?.custom_delivery_time);
  const originalUnico = numero(q?.delivery_time);

  const escolhida = custom || (customUnico ? { min: customUnico, max: customUnico } : null)
    || original || (originalUnico ? { min: originalUnico, max: originalUnico } : null);

  const maxCustom = custom?.max || customUnico;
  const maxOriginal = original?.max || originalUnico;
  const extra = maxCustom && maxOriginal && maxCustom > maxOriginal ? maxCustom - maxOriginal : 0;

  return {
    texto: textoDoPrazo(escolhida?.min, escolhida?.max),
    dias: escolhida?.max || null,
    extra,
  };
}

function diasDoFrete(shipping){
  const direto = numero(shipping?.delivery_days);
  if(direto) return direto;
  if(typeof shipping?.delivery_time === "number") return numero(shipping.delivery_time);
  const nums = String(shipping?.delivery_time || "").match(/\d+/g);
  return nums ? Math.max(...nums.map(Number)) : null;
}

module.exports = { prazoDaCotacao, diasDoFrete, textoDoPrazo };
