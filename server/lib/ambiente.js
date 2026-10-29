const faixasCloudflare = require("./faixas-cloudflare.json");

const REDES_LOCAIS = ["loopback", "uniquelocal"];

function emProducao(env = process.env){
  return env.NODE_ENV === "production"
    || String(env.CLIENT_ORIGIN || env.RENDER_EXTERNAL_URL || "").startsWith("https://");
}

function permitirOverrideDeTeste(env = process.env){
  return !emProducao(env);
}

function aceitaPagamentoDeVerdade(env = process.env){
  return String(env.MP_ACCESS_TOKEN || "").startsWith("APP_USR-");
}

function confiancaDoProxy(env = process.env){
  const bruto = String(env.TRUST_PROXY || "").trim().toLowerCase();
  if(bruto === "cloudflare") return [...REDES_LOCAIS, ...faixasCloudflare.ipv4, ...faixasCloudflare.ipv6];
  if(bruto === "false" || bruto === "0" || bruto === "nenhum") return false;
  if(bruto === "local") return [...REDES_LOCAIS];
  if(/^[1-5]$/.test(bruto)) return Number(bruto);
  if(env.RENDER === "true") return 1;
  return [...REDES_LOCAIS];
}

function descreverConfianca(valor){
  if(valor === false) return "nenhum proxy";
  if(typeof valor === "number") return `${valor} proxy(s) à frente`;
  if(valor.length > REDES_LOCAIS.length) return "Cloudflare + proxy local";
  return "só proxy local";
}

function problemasDeProducao(env = process.env){
  const faltando = [];
  if(!emProducao(env)) return faltando;
  if(aceitaPagamentoDeVerdade(env) && !env.MP_WEBHOOK_SECRET){
    faltando.push("MP_WEBHOOK_SECRET (o token do Mercado Pago é de produção e o webhook ficaria aberto)");
  }
  if(aceitaPagamentoDeVerdade(env) && !env.CHAVES_DADOS){
    faltando.push("CHAVES_DADOS (dados pessoais das clientes ficariam sem criptografia no banco)");
  }
  if(aceitaPagamentoDeVerdade(env) && !env.ADMIN_EMAIL_HASHES){
    faltando.push("ADMIN_EMAIL_HASHES (loja recebendo pagamento sem ninguém no painel)");
  }
  return faltando;
}

module.exports = {
  emProducao,
  permitirOverrideDeTeste,
  aceitaPagamentoDeVerdade,
  confiancaDoProxy,
  descreverConfianca,
  problemasDeProducao,
};
