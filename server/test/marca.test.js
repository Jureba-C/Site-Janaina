const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { CAMPOS, validar, substituir, montarTrocas, aplicar } = require("../scripts/aplicar-marca.js");

const RAIZ = path.join(__dirname, "..", "..");
const MARCA = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "marca.json"), "utf8"));
const PASTAS_IGNORADAS = new Set(["node_modules", "vendor", ".git", "backups"]);
const EXTENSOES = new Set([".js", ".html", ".css", ".json", ".txt", ".md", ".svg", ".xml", ".example"]);

function arquivosDeTexto(pasta){
  const saida = [];
  for(const item of fs.readdirSync(pasta, { withFileTypes: true })){
    if(PASTAS_IGNORADAS.has(item.name)) continue;
    const completo = path.join(pasta, item.name);
    if(item.isDirectory()) saida.push(...arquivosDeTexto(completo));
    else if(item.name !== "package-lock.json"){
      const ext = item.name.startsWith(".env") ? ".example" : path.extname(item.name).toLowerCase();
      if(EXTENSOES.has(ext)) saida.push(completo);
    }
  }
  return saida;
}

const REFERENCIA_PERMITIDA = new Set(["CLAUDE.md", "README.md"]);

const TEXTOS = arquivosDeTexto(RAIZ).map(arquivo => ({ arquivo: path.relative(RAIZ, arquivo), conteudo: fs.readFileSync(arquivo, "utf8") }));

test("nenhum dado da loja de origem sobrou no projeto", () => {
  const proibidos = [/adriana/i, /petit\s*la[cç]o/i, /98274/, /54\.732\.065/, /72620-115/, /Quadra 300/];
  const achados = [];
  for(const { arquivo, conteudo } of TEXTOS){
    if(arquivo.endsWith("marca.test.js") || REFERENCIA_PERMITIDA.has(arquivo)) continue;
    for(const re of proibidos) if(re.test(conteudo)) achados.push(`${arquivo} -> ${re}`);
  }
  assert.deepEqual(achados, []);
});

test("marca.json tem todos os campos e cada valor aparece no site", () => {
  assert.deepEqual(Object.keys(MARCA), CAMPOS);
  for(const campo of CAMPOS){
    const usado = TEXTOS.some(({ arquivo, conteudo }) => !arquivo.endsWith("marca.json") && conteudo.includes(MARCA[campo]));
    assert.ok(usado, `"${campo}" (${MARCA[campo]}) não aparece em nenhum arquivo, então aplicar-marca não teria onde trocar`);
  }
});

test("a validação recusa dados no formato errado", () => {
  assert.deepEqual(validar(MARCA), []);
  const erros = validar({ ...MARCA, whatsappDigitos: "(61) 99999-0000", dominio: "https://loja.com.br/", instagram: "@loja", nomeFatura: "Loja da Ana Ç" });
  assert.equal(erros.length, 4);
  assert.ok(validar({ ...MARCA, email: "" }).some(e => e.includes("email")));
});

test("a troca é feita em uma passada só, sem trocar duas vezes o mesmo trecho", () => {
  const nova = { ...MARCA, instagram: "lojanova", dominio: "lojanova.com.br", email: "oi@lojanova.com.br" };
  const trocas = montarTrocas(MARCA, nova);
  const texto = `${MARCA.email} ${MARCA.dominio} @${MARCA.instagram} /${MARCA.dominio.replace(/\./g, "\\.")}/`;
  assert.equal(substituir(texto, trocas), "oi@lojanova.com.br lojanova.com.br @lojanova /lojanova\\.com\\.br/");
});

test("aplicar troca os arquivos e grava a marca nova", () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "marca-"));
  const arquivoMarca = path.join(pasta, "marca.json");
  fs.writeFileSync(arquivoMarca, JSON.stringify(MARCA));
  fs.writeFileSync(path.join(pasta, "pagina.html"), `<title>${MARCA.nomeLoja}</title><a href="https://wa.me/${MARCA.whatsappDigitos}">${MARCA.whatsappFormatado}</a>`);
  fs.writeFileSync(path.join(pasta, "foto.png"), MARCA.nomeLoja);
  const nova = { ...MARCA, nomeLoja: "Ateliê Exemplo", whatsappDigitos: "5561999990000", whatsappFormatado: "(61) 99999-0000" };
  const { erros, alterados } = aplicar(nova, { raiz: pasta, arquivoMarca });
  assert.deepEqual(erros, []);
  assert.deepEqual(alterados, ["pagina.html"]);
  assert.equal(fs.readFileSync(path.join(pasta, "pagina.html"), "utf8"), '<title>Ateliê Exemplo</title><a href="https://wa.me/5561999990000">(61) 99999-0000</a>');
  assert.equal(fs.readFileSync(path.join(pasta, "foto.png"), "utf8"), MARCA.nomeLoja);
  assert.equal(JSON.parse(fs.readFileSync(arquivoMarca, "utf8")).nomeLoja, "Ateliê Exemplo");
  fs.rmSync(pasta, { recursive: true, force: true });
});
