"use strict";

const MELHOR_ENVIO_BASE_URL = process.env.MELHOR_ENVIO_BASE_URL || "https://melhorenvio.com.br";
const MELHOR_ENVIO_USER_AGENT = process.env.MELHOR_ENVIO_USER_AGENT || "ArteCanecas (defina MELHOR_ENVIO_USER_AGENT no .env com seu e-mail)";

async function meFetch(path, { method = "GET", body, timeoutMs = 12000, retries = 0 } = {}){
  let ultimoErro = null;

  for(let tentativa = 0; tentativa <= retries; tentativa++){
    if(tentativa > 0) await new Promise(r => setTimeout(r, 700 * tentativa));

    let res;
    try{
      res = await fetch(`${MELHOR_ENVIO_BASE_URL}${path}`, {
        method,
        headers: {
          "Authorization": `Bearer ${process.env.MELHOR_ENVIO_TOKEN}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": MELHOR_ENVIO_USER_AGENT,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
    }catch(erroDeRede){
      const estourouOTempo = erroDeRede?.name === "TimeoutError";
      ultimoErro = new Error(
        estourouOTempo
          ? `Melhor Envio não respondeu em ${timeoutMs / 1000}s.`
          : `Falha de rede ao falar com o Melhor Envio: ${erroDeRede?.message || erroDeRede}`
      );
      ultimoErro.cause = erroDeRede;
      if(estourouOTempo) throw ultimoErro;
      continue;
    }

    const data = await res.json().catch(() => null);

    if(res.ok) return data;

    const err = new Error(data?.message || `Melhor Envio respondeu ${res.status}`);
    err.status = res.status;
    err.data = data;

    if(res.status === 401 || res.status === 403){
      console.error(
        `⚠️  MELHOR ENVIO RECUSOU AS CREDENCIAIS (HTTP ${res.status}). ` +
        "Enquanto isso, NENHUMA cliente consegue calcular frete nem finalizar compra. " +
        "O MELHOR_ENVIO_TOKEN provavelmente venceu: gere um novo no painel do Melhor Envio " +
        "e atualize o .env de produção."
      );
      throw err;
    }

    if(res.status >= 500){ ultimoErro = err; continue; }
    throw err;
  }

  throw ultimoErro;
}

async function rastrearEnvio(shipmentId){
  if(!shipmentId || !process.env.MELHOR_ENVIO_TOKEN) return null;
  try{
    const data = await meFetch("/api/v2/me/shipment/tracking", {
      method: "POST",
      timeoutMs: 6000,
      body: { orders: [shipmentId] },
    });
    return normalizeTrackingResponse(data, shipmentId);
  }catch(err){
    console.error(`Não foi possível consultar rastreio ao vivo (envio ${shipmentId}):`, err.message || err);
    return null;
  }
}

function normalizeTrackingResponse(data, shipmentId){
  if(!data || typeof data !== "object") return null;
  const entry = data[shipmentId] && typeof data[shipmentId] === "object" ? data[shipmentId] : data;
  const rawEvents = entry.tracking_events || entry.events || entry.occurrences || entry.tracking || null;
  const events = Array.isArray(rawEvents)
    ? rawEvents.map(normalizeTrackingEvent).filter(Boolean)
    : [];
  const status = typeof entry.status === "string" ? entry.status : null;
  if(!status && events.length === 0) return null;
  return { status, events };
}

function normalizeTrackingEvent(raw){
  if(!raw || typeof raw !== "object") return null;
  const description = raw.description || raw.message || raw.status || raw.title || null;
  const date = raw.date || raw.created_at || raw.occurred_at || raw.time || null;
  const location = raw.location || raw.local || [raw.city, raw.state].filter(Boolean).join("/") || null;
  if(!description && !date) return null;
  return { description, date, location: location || null };
}

async function buscarEnvioPeloCodigo(codigo){
  if(!codigo || !process.env.MELHOR_ENVIO_TOKEN) return null;
  const alvo = String(codigo).trim().toUpperCase();
  try{
    const data = await meFetch(`/api/v2/me/orders/search?q=${encodeURIComponent(alvo)}`, { timeoutMs: 6000 });
    const lista = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
    const envio = lista.find(item => {
      const codigos = [item?.tracking, item?.self_tracking]
        .filter(Boolean).map(c => String(c).trim().toUpperCase());
      return codigos.includes(alvo);
    });
    return envio?.id ? { id: String(envio.id), status: envio.status || null } : null;
  }catch(err){
    console.error(`Não foi possível achar o envio ${alvo} no Melhor Envio:`, err.message || err);
    return null;
  }
}

async function rastreioDoPedido({ trackingCode, shipmentId }){
  if(shipmentId) return { live: await rastrearEnvio(shipmentId), shipmentId, descoberto: false };
  if(!trackingCode) return { live: null, shipmentId: null, descoberto: false };

  const envio = await buscarEnvioPeloCodigo(trackingCode);
  if(!envio) return { live: null, shipmentId: null, descoberto: false };

  const live = await rastrearEnvio(envio.id);
  return {
    live: live || (envio.status ? { status: envio.status, events: [] } : null),
    shipmentId: envio.id,
    descoberto: true,
  };
}

module.exports = {
  meFetch,
  buscarEnvioPeloCodigo,
  rastrearEnvio,
  rastreioDoPedido,
};
