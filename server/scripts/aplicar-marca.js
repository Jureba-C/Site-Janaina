const fs = require("node:fs");
const path = require("node:path");

const RAIZ_SERVIDOR = path.join(__dirname, "..");
const RAIZ_PROJETO = path.join(RAIZ_SERVIDOR, "..");
const ARQUIVO_MARCA = path.join(RAIZ_SERVIDOR, "marca.json");
const PASTAS_IGNORADAS = new Set(["node_modules", "vendor", ".git", "backups"]);
const EXTENSOES = new Set([".js", ".html", ".css", ".json", ".txt", ".md", ".svg", ".xml", ".example"]);
const ARQUIVOS_IGNORADOS = new Set(["package-lock.json", "marca.json", "CLAUDE.md"]);

const CAMPOS = [
  "nomeLoja", "responsavel", "dominio", "email", "instagram", "whatsappDigitos",
  "whatsappFormatado", "cnpj", "endereco", "nomeFatura", "nomeSemEspaco",
];

function validar(marca){
  const erros = [];
  for(const campo of CAMPOS){
    if(typeof marca[campo] !== "string" || !marca[campo].trim()) erros.push(`"${campo}" está vazio.`);
  }
  if(erros.length) return erros;
  if(!/^\d{12,13}$/.test(marca.whatsappDigitos)) erros.push("\"whatsappDigitos\" precisa ser só números, com 55 + DDD + número (ex.: 5561999990000).");
  if(!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(marca.dominio)) erros.push("\"dominio\" precisa ser só o domínio, sem https:// e sem barra (ex.: minhaloja.com.br).");
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(marca.email)) erros.push("\"email\" inválido.");
  if(!/^[A-Za-z0-9._]+$/.test(marca.instagram)) erros.push("\"instagram\" precisa ser só o usuário, sem @ e sem link.");
  if(!/^[A-Z0-9 ]{1,22}$/.test(marca.nomeFatura)) erros.push("\"nomeFatura\" aparece na fatura do cartão: até 22 letras maiúsculas ou números, sem acento.");
  if(!/^[A-Za-z0-9]+$/.test(marca.nomeSemEspaco)) erros.push("\"nomeSemEspaco\" precisa ser só letras e números, sem espaço nem acento.");
  return erros;
}

function escaparRegex(texto){
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function montarTrocas(atual, nova){
  const trocas = new Map();
  for(const campo of CAMPOS){
    if(atual[campo] === nova[campo]) continue;
    trocas.set(atual[campo], nova[campo]);
    if(campo === "dominio") trocas.set(escaparRegex(atual.dominio), escaparRegex(nova.dominio));
  }
  return trocas;
}

function substituir(texto, trocas){
  if(!trocas.size) return texto;
  const chaves = [...trocas.keys()].sort((a, b) => b.length - a.length);
  const padrao = new RegExp(chaves.map(escaparRegex).join("|"), "g");
  return texto.replace(padrao, (achado) => trocas.get(achado));
}

function listar(pasta){
  const saida = [];
  for(const item of fs.readdirSync(pasta, { withFileTypes: true })){
    if(PASTAS_IGNORADAS.has(item.name)) continue;
    const completo = path.join(pasta, item.name);
    if(item.isDirectory()) saida.push(...listar(completo));
    else if(!ARQUIVOS_IGNORADOS.has(item.name)){
      const ext = item.name.startsWith(".env") ? ".example" : path.extname(item.name).toLowerCase();
      if(EXTENSOES.has(ext)) saida.push(completo);
    }
  }
  return saida;
}

function aplicar(nova, { raiz = RAIZ_PROJETO, arquivoMarca = ARQUIVO_MARCA, simular = false } = {}){
  const atual = JSON.parse(fs.readFileSync(arquivoMarca, "utf8"));
  const erros = validar(nova);
  if(erros.length) return { erros, alterados: [] };
  const trocas = montarTrocas(atual, nova);
  const alterados = [];
  for(const arquivo of listar(raiz)){
    const antes = fs.readFileSync(arquivo, "utf8");
    const depois = substituir(antes, trocas);
    if(depois === antes) continue;
    alterados.push(path.relative(raiz, arquivo));
    if(!simular) fs.writeFileSync(arquivo, depois);
  }
  if(!simular){
    const salva = Object.fromEntries(CAMPOS.map((campo) => [campo, nova[campo]]));
    fs.writeFileSync(arquivoMarca, JSON.stringify(salva, null, 2) + "\n");
  }
  return { erros: [], alterados };
}

module.exports = { CAMPOS, validar, montarTrocas, substituir, aplicar };

if(require.main === module){
  const origem = process.argv[2];
  const simular = process.argv.includes("--simular");
  if(!origem || !fs.existsSync(origem)){
    console.error("Uso: node scripts/aplicar-marca.js caminho/para/marca-nova.json [--simular]");
    console.error(`Campos: ${CAMPOS.join(", ")}`);
    process.exit(1);
  }
  const { erros, alterados } = aplicar(JSON.parse(fs.readFileSync(origem, "utf8")), { simular });
  if(erros.length){
    console.error("Corrija antes de aplicar:");
    for(const erro of erros) console.error(`- ${erro}`);
    process.exit(1);
  }
  console.log(`${simular ? "Seriam alterados" : "Alterados"} ${alterados.length} arquivos:`);
  for(const arquivo of alterados) console.log(`- ${arquivo}`);
}
