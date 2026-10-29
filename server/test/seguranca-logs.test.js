const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { mascararEmail, resumoDeErro } = require("../lib/registro.js");

const RAIZ = path.join(__dirname, "..");

function arquivosDoServidor(){
  const lista = [path.join(RAIZ, "server.js")];
  for(const pasta of ["lib", "scripts"]){
    for(const nome of fs.readdirSync(path.join(RAIZ, pasta))){
      if(nome.endsWith(".js")) lista.push(path.join(RAIZ, pasta, nome));
    }
  }
  return lista;
}

test("e-mail aparece mascarado no registro", () => {
  assert.equal(mascararEmail("janaina@gmail.com"), "j***@gmail.com");
  assert.equal(mascararEmail(""), "");
  assert.equal(mascararEmail("sem-arroba"), "***");
});

test("o resumo do erro não leva o corpo da requisição junto", () => {
  const err = Object.assign(new Error("Falhou"), { status: 400, cause: { code: "bad_request" }, body: { payer: { email: "cliente@x.com", cpf: "39053344705" } } });
  const resumo = resumoDeErro(err);
  assert.match(resumo, /Falhou/);
  assert.match(resumo, /status 400/);
  assert.doesNotMatch(resumo, /cliente@x\.com|39053344705/);
});

test("nenhum console.* imprime o objeto de erro inteiro nem dados pessoais", () => {
  const proibidos = [
    /console\.(log|warn|error)\([^\n]*,\s*(err|erro|procErr|mailErr|waErr|labelErr)\s*\)/,
    /console\.(log|warn|error)\([^\n]*\$\{[^}]*to_email\}/,
    /console\.(log|warn|error)\([^\n]*\$\{[^}]*\.cpf\}/,
    /console\.log\("Etiqueta de envio comprada:", label\)/,
  ];
  for(const arquivo of arquivosDoServidor()){
    const linhas = fs.readFileSync(arquivo, "utf8").split("\n");
    linhas.forEach((linha, i) => {
      for(const padrao of proibidos){
        assert.doesNotMatch(linha, padrao, `${path.relative(RAIZ, arquivo)}:${i + 1}`);
      }
    });
  }
});

test("o link de redefinição só vai para o terminal em desenvolvimento e quando pedido", () => {
  const fonte = fs.readFileSync(path.join(RAIZ, "server.js"), "utf8");
  const i = fonte.indexOf("[redefinição de senha] Link para");
  const antes = fonte.slice(i - 300, i);
  assert.match(antes, /!ambiente\.emProducao\(\)/);
  assert.match(antes, /MOSTRAR_LINKS_NO_TERMINAL === "true"/);
});
