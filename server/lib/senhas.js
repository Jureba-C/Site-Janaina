const fs = require("node:fs");
const path = require("node:path");

const COMUNS = new Set(
  fs.readFileSync(path.join(__dirname, "senhas-comuns.txt"), "utf8").split("\n").map(s => s.trim()).filter(Boolean)
);

const MINIMO_CLIENTE = 10;
const MINIMO_PAINEL = 12;
const MAXIMO_BYTES = 72;
const SEQUENCIAS = ["0123456789", "9876543210", "abcdefghijklmnopqrstuvwxyz", "qwertyuiop", "asdfghjkl", "zxcvbnm", "1qaz2wsx3edc"];

function normalizar(texto){
  return String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function ehSequencia(limpa){
  if(limpa.length < 6) return false;
  return SEQUENCIAS.some(seq => seq.includes(limpa));
}

function senhaAceitavel(senha, { email = "", nome = "", admin = false } = {}){
  if(typeof senha !== "string") return "Digite uma senha.";
  const minimo = admin ? MINIMO_PAINEL : MINIMO_CLIENTE;
  if(senha.length < minimo) return `A senha precisa ter pelo menos ${minimo} caracteres.`;
  if(Buffer.byteLength(senha, "utf8") > MAXIMO_BYTES) return "A senha é longa demais (até 72 caracteres).";
  const baixa = normalizar(senha);
  const limpa = baixa.replace(/[^a-z0-9]/g, "");
  if(new Set(baixa).size < 4) return "A senha tem caracteres repetidos demais. Misture letras, números e símbolos.";
  if(COMUNS.has(limpa) || COMUNS.has(baixa) || COMUNS.has(limpa.replace(/\d+$/, ""))) return "Essa senha é muito comum e fácil de adivinhar. Escolha outra.";
  if(ehSequencia(limpa)) return "Sequências como 123456 ou qwerty são fáceis de adivinhar. Escolha outra.";
  const usuario = normalizar(String(email).split("@")[0]).replace(/[^a-z0-9]/g, "");
  if(usuario.length >= 4 && limpa.includes(usuario)) return "A senha não pode conter o seu e-mail.";
  const primeiroNome = normalizar(String(nome).trim().split(/\s+/)[0]).replace(/[^a-z]/g, "");
  if(primeiroNome.length >= 4 && limpa.replace(/\d/g, "") === primeiroNome) return "A senha não pode ser só o seu nome.";
  if(limpa.includes("artecanecas")) return "A senha não pode conter o nome da loja.";
  return null;
}

module.exports = { senhaAceitavel, MINIMO_CLIENTE, MINIMO_PAINEL };
