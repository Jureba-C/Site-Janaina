const ambiente = require("./ambiente");

const BASE_PADRAO = "https://api.mercadopago.com";

function base(){
  if(ambiente.permitirOverrideDeTeste() && process.env.MP_API_URL) return process.env.MP_API_URL.replace(/\/$/, "");
  return BASE_PADRAO;
}

async function chamar(metodo, caminho, corpo){
  const token = process.env.MP_ACCESS_TOKEN;
  if(!token) throw Object.assign(new Error("MP_ACCESS_TOKEN ausente"), { codigo: "sem_token" });
  const res = await fetch(base() + caminho, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(corpo ? { "Content-Type": "application/json" } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  const texto = await res.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch {}
  if(!res.ok){
    throw Object.assign(new Error(`Mercado Pago respondeu ${res.status}`), { status: res.status, codigo: dados?.error || dados?.code || null });
  }
  return dados;
}

function idValido(id){
  return /^[0-9]{1,24}$/.test(String(id));
}

async function buscarPagamento(id){
  if(!idValido(id)) throw new Error("id de pagamento inválido");
  return chamar("GET", `/v1/payments/${id}`);
}

async function cancelarPagamento(id){
  if(!idValido(id)) throw new Error("id de pagamento inválido");
  return chamar("PUT", `/v1/payments/${id}`, { status: "cancelled" });
}

module.exports = { buscarPagamento, cancelarPagamento, idValido };
