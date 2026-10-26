const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");
const { iconesUsados, mapaDeCodepoints, CSS_RECORTADO, PASTA_FONTES, caminhoDaFonteRecortada } =
  require("../scripts/subset-icones.js");

function iconesNoRecorte() {
  const css = fs.readFileSync(CSS_RECORTADO, "utf8");
  return new Set(Array.from(css.matchAll(/\.(bi-[a-z0-9-]+)::before/g), (m) => m[1]));
}

test("todo ícone usado no site existe no recorte da fonte", () => {
  const mapa = mapaDeCodepoints();
  const recorte = iconesNoRecorte();
  const usados = [...iconesUsados()].filter((nome) => mapa.has(nome));

  const faltando = usados.filter((nome) => !recorte.has(nome)).sort();
  assert.deepEqual(faltando, [],
    "ícone usado no HTML/JS e ausente do recorte — rode: node scripts/subset-icones.js");
});

const NOMES_QUE_O_BOOTSTRAP_NAO_TEM = [];

test("nenhum ícone novo com nome que o Bootstrap Icons não define", () => {
  const mapa = mapaDeCodepoints();
  const inexistentes = [...iconesUsados()].filter((nome) => !mapa.has(nome)).sort();
  assert.deepEqual(inexistentes, [...NOMES_QUE_O_BOOTSTRAP_NAO_TEM].sort(),
    "classe bi-* que o Bootstrap Icons não define — vira vazio de largura zero no site");
});

test("o recorte não carrega ícone que ninguém usa", () => {
  const mapa = mapaDeCodepoints();
  const usados = new Set([...iconesUsados()].filter((nome) => mapa.has(nome)));

  const sobrando = [...iconesNoRecorte()].filter((nome) => !usados.has(nome)).sort();
  assert.deepEqual(sobrando, [],
    "ícone no recorte que saiu do site — rode: node scripts/subset-icones.js");
});

test("nenhuma página ainda aponta para o CSS completo do Bootstrap Icons", () => {
  const paginas = fs.readdirSync(__dirname + "/..").filter((f) => f.endsWith(".html"));
  const erradas = paginas.filter((f) =>
    fs.readFileSync(__dirname + "/../" + f, "utf8").includes("bootstrap-icons.min.css")
  );
  assert.deepEqual(erradas, [],
    "página carregando os 84 KB do CSS completo em vez do recorte de 4 KB");
});

test("a fonte recortada existe e é uma fração da original", () => {
  const caminho = caminhoDaFonteRecortada();
  assert.ok(caminho, "nenhuma (ou mais de uma) fonte recortada em css/vendor/fonts");
  const recortada = fs.statSync(caminho).size;
  const completa = fs.statSync(path.join(PASTA_FONTES, "bootstrap-icons.woff2")).size;
  assert.ok(recortada < completa / 5,
    `recorte com ${recortada} bytes contra ${completa} da fonte cheia — recorte não surtiu efeito`);
});

test("o url() da fonte aponta para um arquivo que existe e tem hash no nome", () => {
  const css = fs.readFileSync(CSS_RECORTADO, "utf8");
  const m = css.match(/url\("fonts\/([^"]+)"\)/);
  assert.ok(m, "o @font-face do recorte perdeu o url()");
  const nome = m[1];

  assert.match(nome, /^bootstrap-icons\.subset-[0-9a-f]{8}\.woff2$/,
    `"${nome}" sem hash de conteúdo no nome — trocar um ícone não chegaria a quem já visitou`);
  assert.ok(fs.existsSync(path.join(PASTA_FONTES, nome)),
    `o CSS aponta para fonts/${nome}, que não existe em disco`);

  const hashReal = crypto.createHash("sha256")
    .update(fs.readFileSync(path.join(PASTA_FONTES, nome))).digest("hex").slice(0, 8);
  assert.equal(nome, `bootstrap-icons.subset-${hashReal}.woff2`,
    "o hash no nome não bate com o conteúdo — rode: node scripts/subset-icones.js");
});

test("nenhuma página ou CSS ainda cita a fonte recortada sem hash", () => {
  const raiz = path.join(__dirname, "..");
  const suspeitos = ["css/vendor/bootstrap-icons.subset.css",
    ...fs.readdirSync(raiz).filter((f) => f.endsWith(".html"))];
  const erradas = suspeitos.filter((f) =>
    fs.readFileSync(path.join(raiz, f), "utf8").includes("bootstrap-icons.subset.woff2"));
  assert.deepEqual(erradas, [], "referência ao nome antigo, sem hash");
});
