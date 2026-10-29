function mascararEmail(email){
  const texto = String(email || "");
  const arroba = texto.indexOf("@");
  if(arroba < 1) return texto ? "***" : "";
  return `${texto[0]}***${texto.slice(arroba)}`;
}

function resumoDeErro(err){
  if(!err) return "erro vazio";
  if(typeof err !== "object") return String(err).slice(0, 300);
  const partes = [];
  if(err.name && err.name !== "Error") partes.push(err.name);
  if(err.message) partes.push(String(err.message).slice(0, 300));
  const status = err.status ?? err.statusCode ?? err.response?.status;
  if(status) partes.push(`status ${status}`);
  const codigo = err.codigo ?? err.code ?? err.cause?.code;
  if(codigo) partes.push(`código ${codigo}`);
  return partes.join(" · ") || "erro sem mensagem";
}

module.exports = { mascararEmail, resumoDeErro };
