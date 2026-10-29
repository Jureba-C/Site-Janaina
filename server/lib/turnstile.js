const URL_DE_CONFERENCIA = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function configurado(env = process.env){
  return Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET);
}

function chavePublica(env = process.env){
  return configurado(env) ? env.TURNSTILE_SITE_KEY : null;
}

async function conferir(token, ip, env = process.env){
  if(!configurado(env)) return { ok: true, motivo: "desligado" };
  if(typeof token !== "string" || !token || token.length > 2048) return { ok: false, motivo: "sem_token" };
  const corpo = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token });
  if(ip) corpo.set("remoteip", String(ip));
  try {
    const res = await fetch(URL_DE_CONFERENCIA, { method: "POST", body: corpo, signal: AbortSignal.timeout(8000) });
    const dados = await res.json().catch(() => ({}));
    return dados.success === true ? { ok: true, motivo: null } : { ok: false, motivo: (dados["error-codes"] || ["recusado"]).join(",") };
  } catch {
    return { ok: false, motivo: "sem_resposta" };
  }
}

function exigir(){
  return async (req, res, next) => {
    if(!configurado()) return next();
    const token = req.body?.["cf-turnstile-response"] || req.get("cf-turnstile-response");
    const resultado = await conferir(token, req.ip);
    if(resultado.ok) return next();
    return res.status(403).json({ error: "Não conseguimos confirmar que é uma pessoa. Atualize a página e tente de novo.", precisaTurnstile: true });
  };
}

module.exports = { configurado, chavePublica, conferir, exigir };
