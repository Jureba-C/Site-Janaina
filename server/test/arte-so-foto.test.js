const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const regras = require("../js/regras-produto.js");

const config = regras.normalizarConfig({
  molde: "caneca",
  personalizacao: {
    ativa: true,
    campos: { nome: { ativo: true, obrigatorio: true, limite: 20, rotulo: "Nome" }, data: { ativo: true, limite: 20, rotulo: "Data" } },
    artes: ["nome", "fotos", "foto"],
    letras: ["cursiva"],
    fotos: { min: 0, max: 4, formato: "circulo" },
  },
});
const produto = { price: 40, config, estampasDisponiveis: [] };
const foto = () => ({ id: crypto.randomUUID(), chave: "a".repeat(32), x: 0, y: 0, zoom: 1 });

test("Só foto aparece na lista de artes e no resumo", () => {
  assert.ok(config.personalizacao.artes.includes("foto"));
  assert.equal(regras.nomeDaArte("foto"), "Só foto");
});

test("Só foto pede pelo menos uma foto", () => {
  const r = regras.validarEscolhas(produto, { personalizacao: { arte: "foto", fotos: [] } }, 1);
  assert.equal(r.ok, false);
  assert.match(r.erros.join(" "), /pelo menos 1 foto/);
});

test("Só foto não cobra o nome obrigatório e não guarda nome nem data", () => {
  const r = regras.validarEscolhas(produto, { personalizacao: { arte: "foto", nome: "Ana", data: "2026", fotos: [foto()] } }, 1);
  assert.equal(r.ok, true, r.erros.join(" "));
  assert.equal(r.escolhas.personalizacao.nome, undefined);
  assert.equal(r.escolhas.personalizacao.data, undefined);
  assert.equal(r.escolhas.personalizacao.fotos.length, 1);
});

test("as outras artes continuam cobrando o nome obrigatório", () => {
  const r = regras.validarEscolhas(produto, { personalizacao: { arte: "nome" } }, 1);
  assert.equal(r.ok, false);
  assert.match(r.erros.join(" "), /Preencha: Nome/);
});

const sharp = require("sharp");
const producao = require("../lib/producao.js");

async function fotoMetadeVermelha(){
  const vermelho = await sharp({ create: { width: 200, height: 400, channels: 3, background: "#ff0000" } }).png().toBuffer();
  return sharp({ create: { width: 400, height: 400, channels: 3, background: "#0000ff" } }).composite([{ input: vermelho, left: 0, top: 0 }]).png().toBuffer();
}

async function corNoArquivo(svg, x, y){
  const base64 = /data:image\/jpeg;base64,([^"]+)"/.exec(svg)[1];
  const { data, info } = await sharp(Buffer.from(base64, "base64")).raw().toBuffer({ resolveWithObject: true });
  const i = (Math.round(y * (info.height - 1)) * info.width + Math.round(x * (info.width - 1))) * info.channels;
  return data[i] > data[i + 2] ? "vermelho" : "azul";
}

test("o arquivo de produção gira e espelha a foto do jeito da prévia", async () => {
  const original = await fotoMetadeVermelha();
  const svgDaArte = ({ fotos }) => `<svg xmlns="http://www.w3.org/2000/svg"><image href="${Object.values(fotos)[0]}" width="10" height="10"/></svg>`;
  const gerar = (ajuste) => producao.arquivoDeProducao({
    config, titulo: "t", svgDaArte, lerFoto: () => original,
    escolhas: { personalizacao: { arte: "foto", fotos: [{ id: "f", chave: "c", x: 0, y: 0, zoom: 1, ...ajuste }] } },
  });
  const reta = await gerar({});
  assert.equal(await corNoArquivo(reta, 0.1, 0.5), "vermelho", "sem ajuste o vermelho fica à esquerda");
  const girada = await gerar({ giro: 90 });
  assert.equal(await corNoArquivo(girada, 0.5, 0.1), "vermelho", "girando 90° o vermelho vai para cima");
  const espelhada = await gerar({ espelho: true });
  assert.equal(await corNoArquivo(espelhada, 0.9, 0.5), "vermelho", "espelhando o vermelho vai para a direita");
  const ambos = await gerar({ espelho: true, giro: 90 });
  assert.equal(await corNoArquivo(ambos, 0.5, 0.9), "vermelho", "espelha e depois gira: vermelho embaixo");
});

test("giro fora de 0, 90, 180 ou 270 vira 0 e espelho só aceita sim ou não", () => {
  const r = regras.validarEscolhas(produto, { personalizacao: { arte: "foto", fotos: [{ ...foto(), giro: 45, espelho: "sim" }] } }, 1);
  assert.equal(r.escolhas.personalizacao.fotos[0].giro, 0);
  assert.equal(r.escolhas.personalizacao.fotos[0].espelho, false);
});
