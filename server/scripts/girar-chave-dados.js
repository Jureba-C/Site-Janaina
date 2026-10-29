const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const cofre = require("../lib/cofre.js");

if(!cofre.ativo()){
  console.error("CHAVES_DADOS não está definida. Nada a fazer.");
  process.exit(1);
}

const db = require("../lib/db.js");
const soConferir = process.argv.includes("--conferir");

if(!soConferir){
  const { regravados, indices } = db.regravarComChaveAtual();
  console.log(`Regravados com a chave "${cofre.idAtual()}": ${regravados} registro(s); índices refeitos: ${indices}.`);
}

const sobraram = db.dadosAbertosQueSobraram();
if(sobraram){
  console.error(`Ainda há ${sobraram} registro(s) fora da chave atual "${cofre.idAtual()}". Rode sem --conferir.`);
  process.exit(2);
}
console.log(`Tudo guardado com a chave atual "${cofre.idAtual()}". Pode tirar as chaves antigas de CHAVES_DADOS.`);
