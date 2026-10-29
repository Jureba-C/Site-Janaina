const crypto = require("node:crypto");

const PREFIXO = "cf1.";
const PREFIXO_INDICE = "ix1.";
const AAD = Buffer.from("arte-canecas:v1");

function lerChaves(env = process.env){
  const bruto = String(env.CHAVES_DADOS || "").trim();
  if(!bruto) return [];
  return bruto.split(",").map(parte => {
    const [kid, hex] = parte.trim().split(":");
    if(!/^[a-z0-9]{1,8}$/i.test(kid || "") || !/^[0-9a-f]{64}$/i.test(hex || "")){
      throw new Error("CHAVES_DADOS mal formatada. Use id:64-hex, separadas por vírgula (ex.: k1:abcd...).");
    }
    const mestra = Buffer.from(hex, "hex");
    return {
      kid,
      cifra: Buffer.from(crypto.hkdfSync("sha256", mestra, Buffer.alloc(0), "arte-canecas:cifra", 32)),
      indice: Buffer.from(crypto.hkdfSync("sha256", mestra, Buffer.alloc(0), "arte-canecas:indice", 32)),
    };
  });
}

let chaves = lerChaves();

function recarregar(env = process.env){
  chaves = lerChaves(env);
}

function ativo(){
  return chaves.length > 0;
}

function idAtual(){
  return chaves[0]?.kid || null;
}

function b64(buf){
  return buf.toString("base64url");
}

function cifrar(valor){
  if(valor == null || valor === "") return valor;
  const texto = String(valor);
  if(!ativo() || texto.startsWith(PREFIXO)) return texto;
  const chave = chaves[0];
  const iv = crypto.randomBytes(12);
  const cifra = crypto.createCipheriv("aes-256-gcm", chave.cifra, iv);
  cifra.setAAD(AAD);
  const corpo = Buffer.concat([cifra.update(texto, "utf8"), cifra.final()]);
  return `${PREFIXO}${chave.kid}.${b64(iv)}.${b64(corpo)}.${b64(cifra.getAuthTag())}`;
}

function cifrado(valor){
  return typeof valor === "string" && valor.startsWith(PREFIXO);
}

function decifrar(valor){
  if(!cifrado(valor)) return valor;
  const [, kid, iv, corpo, etiqueta] = valor.split(".");
  const chave = chaves.find(c => c.kid === kid);
  if(!chave) throw Object.assign(new Error(`Falta a chave "${kid}" em CHAVES_DADOS para abrir dados guardados.`), { codigo: "sem_chave_de_dados" });
  const decifra = crypto.createDecipheriv("aes-256-gcm", chave.cifra, Buffer.from(iv, "base64url"));
  decifra.setAAD(AAD);
  decifra.setAuthTag(Buffer.from(etiqueta, "base64url"));
  return Buffer.concat([decifra.update(Buffer.from(corpo, "base64url")), decifra.final()]).toString("utf8");
}

function kidDe(valor){
  return cifrado(valor) ? valor.split(".")[1] : null;
}

function indiceCego(valor){
  if(valor == null || valor === "") return null;
  if(!ativo()) return String(valor);
  return PREFIXO_INDICE + crypto.createHmac("sha256", chaves[0].indice).update(String(valor)).digest("hex").slice(0, 40);
}

function abrirLinha(linha){
  if(!linha || typeof linha !== "object") return linha;
  for(const campo of Object.keys(linha)){
    if(cifrado(linha[campo])) linha[campo] = decifrar(linha[campo]);
  }
  return linha;
}

function envolverDeclaracao(declaracao){
  return new Proxy(declaracao, {
    get(alvo, prop){
      if(prop === "get") return (...args) => abrirLinha(alvo.get(...args));
      if(prop === "all") return (...args) => alvo.all(...args).map(abrirLinha);
      const valor = Reflect.get(alvo, prop, alvo);
      return typeof valor === "function" ? valor.bind(alvo) : valor;
    },
  });
}

module.exports = {
  lerChaves,
  recarregar,
  ativo,
  idAtual,
  cifrar,
  decifrar,
  cifrado,
  kidDe,
  indiceCego,
  abrirLinha,
  envolverDeclaracao,
  PREFIXO,
};
