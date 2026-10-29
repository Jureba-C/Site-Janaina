const UFS = new Set(["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]);

const LIMITES = {
  nome: 120,
  telefone: 20,
  cpf: 18,
  cep: 12,
  rua: 120,
  numero: 10,
  complemento: 60,
  bairro: 60,
  cidade: 60,
  uf: 2,
};

function limpo(valor, limite){
  if(valor == null) return "";
  if(typeof valor !== "string" && typeof valor !== "number") return "";
  return String(valor)
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limite);
}

function normalizarEndereco(bruto){
  if(!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return null;
  const endereco = {};
  for(const [campo, limite] of Object.entries(LIMITES)){
    endereco[campo] = limpo(bruto[campo], limite);
  }
  endereco.uf = endereco.uf.toUpperCase();
  endereco.telefone = endereco.telefone.replace(/\D/g, "");
  endereco.cpf = endereco.cpf.replace(/\D/g, "");
  endereco.cep = endereco.cep.replace(/\D/g, "");
  return endereco;
}

function problemaNoEndereco(endereco){
  if(!endereco) return "Endereço de entrega incompleto.";
  if(endereco.uf && !UFS.has(endereco.uf)) return "Confira o estado (UF) do endereço.";
  if(endereco.telefone && (endereco.telefone.length < 10 || endereco.telefone.length > 11)) return "Confira o telefone: DDD + número, 10 ou 11 dígitos.";
  if(endereco.cep && endereco.cep.length !== 8) return "CEP inválido.";
  return null;
}

module.exports = { normalizarEndereco, problemaNoEndereco, UFS, LIMITES };
