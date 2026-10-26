const fs = require("node:fs");
const path = require("node:path");
const acorn = require("acorn");

const RAIZ = path.join(__dirname, "..");
const PASTAS_IGNORADAS = new Set(["node_modules", "vendor", "backups", ".git"]);
const TAGS_TEXTO = new Set(["script", "style", "textarea", "title"]);
const SCRIPT_NAO_JS = /^(application\/(ld\+)?json|importmap|speculationrules|text\/template)$/i;
const ABRE_HTML = "<!" + "--";
const FECHA_HTML = "--" + ">";

const PARECE_SQL = /\b(CREATE|SELECT|INSERT|UPDATE|DELETE|ALTER|PRAGMA)\b/;
const COMENTARIO_SQL = /(^|\s)--\s|\/\*/;

function percorrer(no, visitar){
  if(!no || typeof no.type !== "string") return;
  visitar(no);
  for(const chave of Object.keys(no)){
    const valor = no[chave];
    if(Array.isArray(valor)) valor.forEach(filho => percorrer(filho, visitar));
    else if(valor && typeof valor.type === "string") percorrer(valor, visitar);
  }
}

function comentariosSql(codigo, arvore){
  const achados = [];
  percorrer(arvore, no => {
    if(no.type !== "TemplateLiteral" || !PARECE_SQL.test(codigo.slice(no.start, no.end))) return;
    for(const parte of no.quasis){
      const texto = codigo.slice(parte.start, parte.end);
      const casou = COMENTARIO_SQL.exec(texto);
      if(casou) achados.push({ tipo: "sql-em-js", indice: parte.start + casou.index, texto: trecho(codigo, parte.start + casou.index) });
    }
  });
  return achados;
}

function trecho(texto, i){
  return texto.slice(Math.max(0, i - 20), i + 60).replace(/\s+/g, " ");
}

function comentariosJs(codigo){
  for(const sourceType of ["script", "module"]){
    try{
      const achados = [];
      const arvore = acorn.parse(codigo, {
        ecmaVersion: "latest",
        sourceType,
        allowHashBang: true,
        allowReturnOutsideFunction: true,
        allowAwaitOutsideFunction: true,
        onComment: (bloco, texto, inicio) => achados.push({ tipo: "js", indice: inicio, texto: trecho(codigo, inicio) }),
      });
      achados.push(...comentariosSql(codigo, arvore));
      for(let i = codigo.indexOf(ABRE_HTML); i !== -1; i = codigo.indexOf(ABRE_HTML, i + 1)) achados.push({ tipo: "html-em-js", indice: i, texto: trecho(codigo, i) });
      return achados;
    }catch(erro){
      if(sourceType === "module") return [{ tipo: "js-invalido", indice: 0, texto: erro.message }];
    }
  }
  return [];
}

function comentariosCss(css){
  const achados = [];
  let i = 0;
  while(i < css.length){
    const c = css[i];
    if(c === '"' || c === "'"){
      i++;
      while(i < css.length && css[i] !== c) i += css[i] === "\\" ? 2 : 1;
      i++;
      continue;
    }
    if((c === "u" || c === "U") && /^url\(/i.test(css.slice(i, i + 4))){
      let j = i + 4;
      while(j < css.length && /\s/.test(css[j])) j++;
      if(css[j] !== '"' && css[j] !== "'"){
        const fim = css.indexOf(")", j);
        i = fim === -1 ? css.length : fim + 1;
        continue;
      }
      i = j;
      continue;
    }
    if(c === "/" && css[i + 1] === "*"){
      achados.push({ tipo: "css", indice: i, texto: trecho(css, i) });
      const fim = css.indexOf("*/", i + 2);
      i = fim === -1 ? css.length : fim + 2;
      continue;
    }
    i++;
  }
  return achados;
}

function comentariosHtml(html){
  const achados = [];
  let i = 0;
  while(i < html.length){
    if(html.startsWith(ABRE_HTML, i)){
      achados.push({ tipo: "html", indice: i, texto: trecho(html, i) });
      const fim = html.indexOf(FECHA_HTML, i + 4);
      i = fim === -1 ? html.length : fim + 3;
      continue;
    }
    if(html[i] === "<" && /[a-zA-Z]/.test(html[i + 1] || "")){
      let j = i + 1;
      while(j < html.length && /[^\s/>]/.test(html[j])) j++;
      const tag = html.slice(i + 1, j).toLowerCase();
      const atributos = {};
      while(j < html.length && html[j] !== ">"){
        if(/[\s/]/.test(html[j])){ j++; continue; }
        let k = j;
        while(k < html.length && /[^\s=>/]/.test(html[k])) k++;
        const nome = html.slice(j, k).toLowerCase();
        j = k;
        let valor = "";
        if(html[j] === "="){
          j++;
          const aspa = html[j];
          if(aspa === '"' || aspa === "'"){
            const fim = html.indexOf(aspa, j + 1);
            valor = html.slice(j + 1, fim === -1 ? html.length : fim);
            j = fim === -1 ? html.length : fim + 1;
          }else{
            let m = j;
            while(m < html.length && /[^\s>]/.test(html[m])) m++;
            valor = html.slice(j, m);
            j = m;
          }
        }
        if(nome) atributos[nome] = valor;
      }
      const fimTag = j + 1;
      if(atributos.style) for(const a of comentariosCss(atributos.style)) achados.push({ ...a, indice: i });
      if(TAGS_TEXTO.has(tag)){
        const fecha = html.toLowerCase().indexOf(`</${tag}`, fimTag);
        const conteudo = html.slice(fimTag, fecha === -1 ? html.length : fecha);
        if(tag === "style") for(const a of comentariosCss(conteudo)) achados.push({ ...a, indice: fimTag + a.indice });
        if(tag === "script" && !SCRIPT_NAO_JS.test(atributos.type || "") && conteudo.trim()){
          for(const a of comentariosJs(conteudo)) achados.push({ ...a, indice: fimTag + a.indice });
        }
        i = fecha === -1 ? html.length : fecha;
        continue;
      }
      i = fimTag;
      continue;
    }
    i++;
  }
  return achados;
}

function comentariosConfig(texto){
  const achados = [];
  texto.split("\n").forEach((linha, n) => {
    if(/^\s*#/.test(linha)) achados.push({ tipo: "config", indice: n, texto: linha.trim().slice(0, 60) });
  });
  return achados;
}

const POR_EXTENSAO = {
  ".js": comentariosJs,
  ".cjs": comentariosJs,
  ".mjs": comentariosJs,
  ".css": comentariosCss,
  ".html": comentariosHtml,
  ".svg": comentariosHtml,
};

const ARQUIVOS_CONFIG = new Set([".env.example", ".gitignore"]);

function listar(pasta){
  const saida = [];
  for(const item of fs.readdirSync(pasta, { withFileTypes: true })){
    if(PASTAS_IGNORADAS.has(item.name)) continue;
    const completo = path.join(pasta, item.name);
    if(item.isDirectory()) saida.push(...listar(completo));
    else saida.push(completo);
  }
  return saida;
}

function verificar(raiz = RAIZ, extras = []){
  const problemas = [];
  let arquivos = 0;
  for(const arquivo of [...listar(raiz), ...extras]){
    const nome = path.basename(arquivo);
    if(/\.min\.(js|css)$/.test(nome)) continue;
    const analisar = ARQUIVOS_CONFIG.has(nome) ? comentariosConfig : POR_EXTENSAO[path.extname(nome).toLowerCase()];
    if(!analisar || !fs.existsSync(arquivo)) continue;
    arquivos++;
    for(const p of analisar(fs.readFileSync(arquivo, "utf8"))) problemas.push({ arquivo: path.relative(raiz, arquivo), ...p });
  }
  return { arquivos, problemas };
}

module.exports = { verificar, comentariosJs, comentariosCss, comentariosHtml };

if(require.main === module){
  const { arquivos, problemas } = verificar(RAIZ, [path.join(RAIZ, "..", ".gitignore")]);
  if(problemas.length){
    console.error(`Comentários encontrados (${problemas.length}):`);
    for(const p of problemas) console.error(`- ${p.arquivo} [${p.tipo}] ${p.texto}`);
    process.exit(1);
  }
  console.log(`Sem comentários: ${arquivos} arquivos verificados.`);
}
