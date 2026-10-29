const TOKENINFO_PADRAO = "https://oauth2.googleapis.com/tokeninfo";
const ambiente = require("./ambiente");
const TOKENINFO_URL = !ambiente.permitirOverrideDeTeste()
  ? TOKENINFO_PADRAO
  : (process.env.GOOGLE_TOKENINFO_URL || TOKENINFO_PADRAO);

const FORMATO_JWT = /^[A-Za-z0-9_-]{10,4000}\.[A-Za-z0-9_-]{10,4000}\.[A-Za-z0-9_-]{10,4000}$/;

const EMISSORES = new Set(["accounts.google.com", "https://accounts.google.com"]);

function ehVerdadeiro(valor){
  return valor === true || valor === "true";
}

function estaConfigurado(){
  return Boolean(process.env.GOOGLE_CLIENT_ID);
}

async function verificarTokenDoGoogle(credential){
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if(!clientId) throw Object.assign(new Error("Entrar com o Google não está configurado."), { status: 503 });
  if(typeof credential !== "string" || !FORMATO_JWT.test(credential)){
    throw Object.assign(new Error("Token do Google inválido."), { status: 400 });
  }

  let resposta;
  try{
    resposta = await fetch(`${TOKENINFO_URL}?id_token=${encodeURIComponent(credential)}`, {
      signal: AbortSignal.timeout(5000),
    });
  }catch(err){
    throw Object.assign(new Error("Não consegui falar com o Google agora."), { status: 502, causa: err.message });
  }
  if(!resposta.ok){
    throw Object.assign(new Error("Token do Google recusado."), { status: 401 });
  }

  let dados;
  try{
    dados = await resposta.json();
  }catch{
    throw Object.assign(new Error("Resposta do Google ilegível."), { status: 502 });
  }

  const recusa = (motivo) => Object.assign(new Error("Token do Google recusado."), { status: 401, motivo });

  if(dados.aud !== clientId) throw recusa("aud diferente do GOOGLE_CLIENT_ID");
  if(!EMISSORES.has(String(dados.iss || ""))) throw recusa("iss inesperado");
  if(!(Number(dados.exp) * 1000 > Date.now())) throw recusa("token vencido");
  if(!ehVerdadeiro(dados.email_verified)) throw recusa("e-mail não verificado no Google");
  if(!dados.email) throw recusa("token sem e-mail");
  if(!dados.sub) throw recusa("token sem sub");

  return { sub: String(dados.sub), email: String(dados.email), nome: dados.name || dados.given_name || "" };
}

module.exports = { verificarTokenDoGoogle, estaConfigurado };
