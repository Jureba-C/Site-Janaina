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
  const onde = String(err.stack || "").split("\n").slice(1)
    .map(l => l.trim())
    .filter(l => l.startsWith("at ") && !l.includes("node_modules") && !l.includes("node:internal"))
    .slice(0, 2)
    .map(l => l.replace(/\(?\/[^)]*\/(server|lib|scripts)\//, "($1/").replace(/^at /, ""));
  if(onde.length) partes.push(`em ${onde.join(" ← ")}`);
  return partes.join(" · ") || "erro sem mensagem";
}

module.exports = { mascararEmail, resumoDeErro };
