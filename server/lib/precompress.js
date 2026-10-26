"use strict";

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const etag = require("etag");

const QUALIDADE = 11;
const TAMANHO_MAXIMO = 2 * 1024 * 1024;

const TIPOS = { ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" };

function criarPrecompressor(raiz, { revalidarSempre }){
  const cache = new Map();
  const emAndamento = new Set();

  function assinaturaDe(st){
    return `${st.mtimeMs}:${st.size}`;
  }

  function preencher(absoluto, assinatura){
    if(emAndamento.has(absoluto)) return;
    emAndamento.add(absoluto);
    fs.readFile(absoluto, (erroLeitura, bruto) => {
      if(erroLeitura){ emAndamento.delete(absoluto); return; }
      zlib.brotliCompress(bruto, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: QUALIDADE,
          [zlib.constants.BROTLI_PARAM_SIZE_HINT]: bruto.length,
        },
      }, (erro, comprimido) => {
        emAndamento.delete(absoluto);
        if(!erro && comprimido.length < bruto.length){
          cache.set(absoluto, { assinatura, br: comprimido });
        }
      });
    });
  }

  return function precompressor(req, res, next){
    if(req.method !== "GET" && req.method !== "HEAD") return next();
    if(req.headers.range) return next();

    const rota = req.path;
    if(!rota.startsWith("/css/") && !rota.startsWith("/js/")) return next();
    const tipo = TIPOS[path.extname(rota).toLowerCase()];
    if(!tipo) return next();
    if(!req.acceptsEncodings("br")) return next();

    const absoluto = path.join(raiz, rota);
    if(!absoluto.startsWith(raiz + path.sep)) return next();

    let st;
    try { st = fs.statSync(absoluto); } catch { return next(); }
    if(!st.isFile() || st.size > TAMANHO_MAXIMO) return next();

    const assinatura = assinaturaDe(st);
    const guardado = cache.get(absoluto);
    if(!guardado || guardado.assinatura !== assinatura){
      preencher(absoluto, assinatura);
      return next();
    }

    const marca = etag(st);
    res.setHeader("ETag", marca);
    res.setHeader("Last-Modified", st.mtime.toUTCString());
    res.setHeader("Content-Type", tipo);
    res.setHeader("Content-Encoding", "br");
    res.vary("Accept-Encoding");
    res.setHeader("Cache-Control", cacheControlPara(rota, req, revalidarSempre));

    const seNaoBater = req.headers["if-none-match"];
    const semPrefixo = (v) => v.trim().replace(/^W\//, "");
    if(seNaoBater && seNaoBater.split(",").some(v => semPrefixo(v) === semPrefixo(marca))){
      res.removeHeader("Content-Encoding");
      res.removeHeader("Content-Type");
      return res.status(304).end();
    }

    res.setHeader("Content-Length", guardado.br.length);
    if(req.method === "HEAD") return res.status(200).end();
    return res.status(200).end(guardado.br);
  };
}

function cacheControlPara(rota, req, revalidarSempre){
  if(!revalidarSempre.test(rota)) return "public, max-age=31536000";
  return req.query && req.query.v
    ? "public, max-age=31536000, immutable"
    : "no-cache";
}

module.exports = { criarPrecompressor };
