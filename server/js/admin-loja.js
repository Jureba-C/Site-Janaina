(function(){
  "use strict";

  const MOLDES = [
    ["caneca", "Caneca (cilíndrica, com alça)"],
    ["xicara", "Xícara com pires"],
    ["garrafa", "Garrafa ou térmico"],
    ["copo", "Copo ou vidro"],
    ["azulejo", "Azulejo"],
    ["plano", "Peça plana (mousepad, quebra-cabeça, agenda)"],
    ["botton", "Botton, ímã ou chaveiro redondo"],
    ["caixa", "Caixa ou embalagem"],
    ["flor", "Ipê ou flor"],
    ["foto", "Molde por foto (qualquer outra peça)"],
    ["nenhum", "Sem prévia"],
  ];
  const FORMATOS_DO_COPO = [["", "Copo reto"], ["chopp", "Caneca de chopp"], ["cerveja", "Copo de cerveja"], ["whisky", "Copo baixo (whisky)"], ["mason", "Mason jar"], ["jateado", "Jateado"]];
  const PREVIAS = [["", "Não muda a prévia"], ["alca", "Muda a cor da alça e do interior"], ["peca", "Muda a cor da peça"], ["tamanho", "Tamanho"]];
  const CAMPOS = [["nome", "Nome", 20, 40], ["frase", "Frase", 60, 120], ["data", "Data", 20, 30], ["observacoes", "Observações", 300, 500]];
  const LETRAS = [["cursiva", "Cursiva"], ["classica", "Clássica"], ["delicada", "Delicada"]];
  const ARTES = [["nome", "Só o nome"], ["flor", "Florzinha"], ["brasilia", "Brasília"], ["fotos", "Com fotos"]];

  let raiz = null;
  let config = null;
  let fotosDoProduto = [];
  let categorias = [];
  const MOLDES_COM_ESTAMPA = ["caneca", "xicara", "garrafa", "copo"];

  function blocoDeEstampas(){
    const e = config.estampas || { ativa: false, ids: [], obrigatoria: false };
    const todas = window.ArteAdminEstampas ? window.ArteAdminEstampas.lista() : [];
    const marcadas = new Set(e.ids || []);
    const lista = todas.length
      ? `<div class="al-estampas">${todas.map(x => `
          <label class="al-estampa${x.ativa ? "" : " is-oculta"}">
            <input type="checkbox" data-estampa="${esc(x.id)}"${marcadas.has(x.id) ? " checked" : ""}>
            <img src="${esc(x.miniatura)}" alt="" width="90" height="60" loading="lazy">
            <span>${esc(x.nome)}<small>${esc(x.colecao)}${x.ativa ? "" : " · oculta"}</small></span>
          </label>`).join("")}</div>`
      : `<p class="form-text">Nenhuma estampa cadastrada. Suba em Loja e configurações → Estampas.</p>`;
    return `
        <label class="al-check"><input type="checkbox" data-campo="estampas-ativa"${e.ativa ? " checked" : ""}> a cliente escolhe uma estampa (só caneca, xícara, garrafa e copo)</label>
        <label class="al-check"><input type="checkbox" data-campo="estampas-obrigatoria"${e.obrigatoria ? " checked" : ""}> toda peça sai com estampa (sem a opção "sem estampa")</label>
        <p class="form-text">Marque quais estampas este produto oferece. Nenhuma marcada = todas as estampas que aparecem na loja.</p>
        ${lista}`;
  }

  function renderEstampas(){
    const alvo = raiz && raiz.querySelector("[data-bloco-estampas]");
    if(alvo) alvo.innerHTML = blocoDeEstampas();
  }

  function esc(valor){
    return String(valor == null ? "" : valor).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
  }

  function opcoesDe(lista, atual){
    return lista.map(([valor, rotulo]) => `<option value="${esc(valor)}"${valor === atual ? " selected" : ""}>${esc(rotulo)}</option>`).join("");
  }

  function idUnico(prefixo){
    return `${prefixo}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function linhaDeOpcao(opcao, comCor){
    return `
      <div class="al-opcao" data-opcao>
        <input class="form-control form-control-sm" data-campo="nome" value="${esc(opcao.nome)}" placeholder="Nome (ex.: Rosa)" aria-label="Nome da opção" maxlength="60">
        ${comCor ? `<input type="color" class="form-control form-control-color" data-campo="hex" value="${esc(opcao.hex || "#FFFFFF")}" aria-label="Cor da opção">` : ""}
        <input type="number" class="form-control form-control-sm al-preco" data-campo="preco" value="${esc(opcao.preco || 0)}" step="0.01" aria-label="Diferença de preço em reais">
        <label class="al-esgotado"><input type="checkbox" data-campo="esgotado"${opcao.esgotado ? " checked" : ""}> esgotado</label>
        <button type="button" class="btn btn-link btn-sm text-danger" data-acao="tirar-opcao" aria-label="Tirar esta opção">tirar</button>
      </div>`;
  }

  function blocoDeGrupo(grupo){
    const comCor = grupo.previa === "alca" || grupo.previa === "peca" || grupo.opcoes.some(o => o.hex);
    return `
      <fieldset class="al-grupo" data-grupo data-id="${esc(grupo.id)}">
        <legend class="visually-hidden">Variação</legend>
        <div class="al-linha">
          <input class="form-control form-control-sm" data-campo="nome-grupo" value="${esc(grupo.nome)}" placeholder="Nome da escolha (ex.: Cor da alça)" aria-label="Nome da variação" maxlength="60">
          <select class="form-select form-select-sm" data-campo="previa" aria-label="O que muda na prévia">${opcoesDe(PREVIAS, grupo.previa || "")}</select>
          <button type="button" class="btn btn-link btn-sm text-danger" data-acao="tirar-grupo">tirar variação</button>
        </div>
        <div class="al-opcoes">${grupo.opcoes.map(o => linhaDeOpcao(o, comCor)).join("")}</div>
        <button type="button" class="btn-outline-blush btn-sm-blush" data-acao="mais-opcao">+ opção</button>
      </fieldset>`;
  }

  function render(){
    const p = config.personalizacao || {};
    const campos = p.campos || {};
    const id = idUnico("al");
    const tipos = categorias.filter(c => c.grupo !== "ocasiao");
    const ocasioes = categorias.filter(c => c.grupo === "ocasiao");
    const marcada = (slug) => config.categorias.includes(slug) ? " checked" : "";
    raiz.innerHTML = `
      <details class="al-secao" open>
        <summary>Onde aparece na loja</summary>
        <p class="form-text mt-0">A categoria principal fica acima. Marque também os tipos e ocasiões em que este produto deve aparecer.</p>
        <div class="al-colunas">
          <div><p class="al-subtitulo">Tipo</p>${tipos.map(c => `<label class="al-check"><input type="checkbox" data-categoria="${esc(c.slug)}"${marcada(c.slug)}> ${esc(c.label)}</label>`).join("")}</div>
          <div><p class="al-subtitulo">Ocasião</p>${ocasioes.map(c => `<label class="al-check"><input type="checkbox" data-categoria="${esc(c.slug)}"${marcada(c.slug)}> ${esc(c.label)}</label>`).join("")}</div>
        </div>
        <div class="al-linha">
          <label class="al-campo">Medida <input class="form-control form-control-sm" data-campo="medida" value="${esc(config.medida)}" placeholder="325 ml" maxlength="40"></label>
          <label class="al-campo">Código <input class="form-control form-control-sm" data-campo="codigo" value="${esc(config.codigo)}" placeholder="CAN-BRA-325" maxlength="30"></label>
          <label class="al-campo">Aviso
            <select class="form-select form-select-sm" data-campo="aviso">${opcoesDe([["", "Nenhum"], ["ultimas", "Últimas unidades"], ["consultar", "Consultar disponibilidade"]], config.aviso || "")}</select>
          </label>
        </div>
        <label class="al-campo al-largo">Cuidados com a peça <textarea class="form-control form-control-sm" data-campo="cuidados" rows="2" maxlength="600">${esc(config.cuidados)}</textarea></label>
      </details>

      <details class="al-secao">
        <summary>Prévia da arte</summary>
        <div class="al-linha">
          <label class="al-campo">Tipo de peça <select class="form-select form-select-sm" data-campo="molde">${opcoesDe(MOLDES, config.molde)}</select></label>
          <label class="al-campo">Cor da peça <input type="color" class="form-control form-control-color" data-campo="corPeca" value="${esc(config.corPeca || "#FFFFFF")}"></label>
          <label class="al-campo">Cor da alça <input type="color" class="form-control form-control-color" data-campo="corAlca" value="${esc(config.corAlca || config.corPeca || "#FFFFFF")}"></label>
          <label class="al-check"><input type="checkbox" data-campo="magica"${config.magica ? " checked" : ""}> caneca mágica (arte aparece com o calor)</label>
        </div>
        <div class="al-linha" ${config.molde === "copo" ? "" : "hidden"} data-so-copo>
          <label class="al-campo">Formato <select class="form-select form-select-sm" data-campo="formato">${opcoesDe(FORMATOS_DO_COPO, config.formato || "")}</select></label>
        </div>
        <div data-so-foto ${config.molde === "foto" ? "" : "hidden"}>
          <p class="form-text">Escolha uma das fotos do produto e marque, em porcentagem, o retângulo onde a arte entra.</p>
          <div class="al-linha">
            <label class="al-campo">Foto base <select class="form-select form-select-sm" data-campo="moldeFoto">${fotosDoProduto.length ? fotosDoProduto.map((f, i) => `<option value="${esc(f)}"${config.moldeFoto && config.moldeFoto.foto === f ? " selected" : ""}>Foto ${i + 1}</option>`).join("") : `<option value="">Envie uma foto do produto primeiro</option>`}</select></label>
            ${["x", "y", "w", "h"].map(k => `<label class="al-campo al-numero">${({ x: "Esquerda %", y: "Topo %", w: "Largura %", h: "Altura %" })[k]} <input type="number" class="form-control form-control-sm" data-area="${k}" min="0" max="100" step="1" value="${Math.round(((config.moldeFoto && config.moldeFoto.area) || { x: 0.25, y: 0.25, w: 0.5, h: 0.4 })[k] * 100)}"></label>`).join("")}
            <label class="al-check"><input type="checkbox" data-area="curva"${config.moldeFoto && config.moldeFoto.area && config.moldeFoto.area.curva ? " checked" : ""}> peça curva</label>
          </div>
          <div class="al-molde-previa" data-molde-previa></div>
        </div>
      </details>

      <details class="al-secao">
        <summary>Variações (cor, tamanho, modelo) e preço</summary>
        <p class="form-text mt-0">O preço de cada opção é somado ao preço do produto (use negativo para descontar). Quem escolhe uma opção esgotada não consegue comprar.</p>
        <div data-grupos>${config.variacoes.map(blocoDeGrupo).join("")}</div>
        <button type="button" class="btn-outline-blush btn-sm-blush" data-acao="mais-grupo">+ variação</button>
        <p class="al-subtitulo mt-3">Adicionais (caixinhas de marcar)</p>
        <div data-adicionais>${config.adicionais.map(a => linhaDeOpcao(a, false)).join("")}</div>
        <button type="button" class="btn-outline-blush btn-sm-blush" data-acao="mais-adicional">+ adicional</button>
        <p class="al-subtitulo mt-3">Preço por quantidade</p>
        <div class="al-linha">
          <label class="al-campo al-numero">Pedido mínimo <input type="number" class="form-control form-control-sm" data-campo="qtdMinima" min="1" max="100" value="${esc(config.qtdMinima || 1)}"></label>
        </div>
        <div data-faixas>${config.faixas.map(f => `<div class="al-linha" data-faixa><label class="al-campo al-numero">A partir de <input type="number" class="form-control form-control-sm" data-faixa-min min="2" value="${esc(f.min)}"></label><label class="al-campo al-numero">R$ cada <input type="number" class="form-control form-control-sm" data-faixa-preco step="0.01" value="${esc(f.preco)}"></label><button type="button" class="btn btn-link btn-sm text-danger" data-acao="tirar-faixa">tirar</button></div>`).join("")}</div>
        <button type="button" class="btn-outline-blush btn-sm-blush" data-acao="mais-faixa">+ faixa de quantidade</button>
      </details>

      <details class="al-secao">
        <summary>Personalização</summary>
        <label class="al-check"><input type="checkbox" data-campo="pers-ativa"${p.ativa ? " checked" : ""}> A cliente personaliza esta peça</label>
        <div class="al-tabela">
          ${CAMPOS.map(([idCampo, rotulo, padrao, maximo]) => {
            const c = campos[idCampo] || {};
            return `<div class="al-linha" data-campo-pers="${idCampo}">
              <label class="al-check"><input type="checkbox" data-pers="ativo"${c.ativo ? " checked" : ""}> ${rotulo}</label>
              <label class="al-campo">Texto do campo <input class="form-control form-control-sm" data-pers="rotulo" value="${esc(c.rotulo || rotulo)}" maxlength="40"></label>
              <label class="al-campo al-numero">Limite <input type="number" class="form-control form-control-sm" data-pers="limite" min="1" max="${maximo}" value="${esc(c.limite || padrao)}"></label>
              <label class="al-check"><input type="checkbox" data-pers="obrigatorio"${c.obrigatorio ? " checked" : ""}> obrigatório</label>
            </div>`;
          }).join("")}
        </div>
        <p class="al-subtitulo">Estilos de letra</p>
        <div class="al-linha">${LETRAS.map(([v, r]) => `<label class="al-check"><input type="checkbox" data-letra="${v}"${(p.letras || []).includes(v) ? " checked" : ""}> ${r}</label>`).join("")}</div>
        <p class="al-subtitulo">Artes prontas</p>
        <div class="al-linha">${ARTES.map(([v, r]) => `<label class="al-check"><input type="checkbox" data-arte="${v}"${(p.artes || []).includes(v) ? " checked" : ""}> ${r}</label>`).join("")}</div>
        <div class="al-linha">
          <label class="al-campo al-numero">Fotos: mínimo <input type="number" class="form-control form-control-sm" data-campo="fotos-min" min="0" max="8" value="${esc((p.fotos && p.fotos.min) || 0)}"></label>
          <label class="al-campo al-numero">máximo <input type="number" class="form-control form-control-sm" data-campo="fotos-max" min="0" max="8" value="${esc((p.fotos && p.fotos.max) || 0)}"></label>
          <label class="al-campo">Formato da foto <select class="form-select form-select-sm" data-campo="fotos-formato">${opcoesDe([["circulo", "Círculo"], ["quadrado", "Quadrado"]], (p.fotos && p.fotos.formato) || "circulo")}</select></label>
          <label class="al-check"><input type="checkbox" data-campo="verso"${p.verso ? " checked" : ""}> tem verso (frase do outro lado)</label>
        </div>
      </details>

      <details class="al-secao"${config.estampas && config.estampas.ativa ? " open" : ""}>
        <summary>Estampas</summary>
        <div data-bloco-estampas>${blocoDeEstampas()}</div>
      </details>

      <details class="al-secao">
        <summary>Frete: peso e caixa</summary>
        <div class="al-linha">
          <label class="al-campo al-numero">Peso (kg) <input type="number" class="form-control form-control-sm" data-campo="peso" min="0.01" max="30" step="0.01" value="${esc(config.peso)}"></label>
          <label class="al-campo al-numero">Largura (cm) <input type="number" class="form-control form-control-sm" data-caixa="largura" min="1" max="100" step="0.5" value="${esc(config.caixa.largura)}"></label>
          <label class="al-campo al-numero">Altura (cm) <input type="number" class="form-control form-control-sm" data-caixa="altura" min="1" max="100" step="0.5" value="${esc(config.caixa.altura)}"></label>
          <label class="al-campo al-numero">Comprimento (cm) <input type="number" class="form-control form-control-sm" data-caixa="comprimento" min="1" max="100" step="0.5" value="${esc(config.caixa.comprimento)}"></label>
        </div>
        <p class="form-text">Peso e medidas de uma unidade já embalada. O site junta várias peças numa caixa só para cotar no Melhor Envio.</p>
      </details>`;
    renderMoldeFoto();
  }

  function renderMoldeFoto(){
    const alvo = raiz.querySelector("[data-molde-previa]");
    if(!alvo) return;
    const foto = raiz.querySelector("[data-campo=moldeFoto]")?.value;
    if(!foto){ alvo.innerHTML = ""; return; }
    const v = (k) => Number(raiz.querySelector(`[data-area=${k}]`).value) || 0;
    alvo.innerHTML = `<div class="al-molde-foto"><img src="${esc(foto)}" alt=""><span style="left:${v("x")}%;top:${v("y")}%;width:${v("w")}%;height:${v("h")}%"></span></div>`;
  }

  function ler(principal){
    const valor = (sel) => raiz.querySelector(sel);
    const num = (el, padrao) => { const n = Number(el && el.value); return Number.isFinite(n) ? n : padrao; };
    const categoriasMarcadas = [...raiz.querySelectorAll("[data-categoria]")].filter(c => c.checked).map(c => c.dataset.categoria);
    const lista = [principal, ...categoriasMarcadas].filter(Boolean);
    const grupoDe = (el) => ({
      id: el.dataset.id || "",
      nome: el.querySelector("[data-campo=nome-grupo]").value,
      previa: el.querySelector("[data-campo=previa]").value || null,
      opcoes: [...el.querySelectorAll("[data-opcao]")].map(opcaoDe),
    });
    function opcaoDe(el){
      const hex = el.querySelector("[data-campo=hex]");
      return {
        nome: el.querySelector("[data-campo=nome]").value,
        preco: num(el.querySelector("[data-campo=preco]"), 0),
        esgotado: el.querySelector("[data-campo=esgotado]").checked,
        ...(hex ? { hex: hex.value } : {}),
      };
    }
    const campos = {};
    raiz.querySelectorAll("[data-campo-pers]").forEach(linha => {
      if(!linha.querySelector("[data-pers=ativo]").checked) return;
      campos[linha.dataset.campoPers] = {
        ativo: true,
        obrigatorio: linha.querySelector("[data-pers=obrigatorio]").checked,
        limite: num(linha.querySelector("[data-pers=limite]"), 20),
        rotulo: linha.querySelector("[data-pers=rotulo]").value,
      };
    });
    const molde = valor("[data-campo=molde]").value;
    return {
      ...config,
      categorias: [...new Set(lista)],
      medida: valor("[data-campo=medida]").value,
      codigo: valor("[data-campo=codigo]").value,
      aviso: valor("[data-campo=aviso]").value || null,
      cuidados: valor("[data-campo=cuidados]").value,
      molde,
      formato: molde === "copo" ? valor("[data-campo=formato]").value : config.formato,
      corPeca: valor("[data-campo=corPeca]").value,
      corAlca: valor("[data-campo=corAlca]").value,
      magica: valor("[data-campo=magica]").checked,
      moldeFoto: molde === "foto" ? {
        foto: valor("[data-campo=moldeFoto]").value || null,
        area: { x: num(valor("[data-area=x]"), 25) / 100, y: num(valor("[data-area=y]"), 25) / 100, w: num(valor("[data-area=w]"), 50) / 100, h: num(valor("[data-area=h]"), 40) / 100, curva: valor("[data-area=curva]").checked },
      } : null,
      variacoes: [...raiz.querySelectorAll("[data-grupo]")].map(grupoDe),
      adicionais: [...raiz.querySelectorAll("[data-adicionais] [data-opcao]")].map(opcaoDe),
      qtdMinima: num(valor("[data-campo=qtdMinima]"), 1),
      faixas: [...raiz.querySelectorAll("[data-faixa]")].map(f => ({ min: num(f.querySelector("[data-faixa-min]"), 0), preco: num(f.querySelector("[data-faixa-preco]"), 0) })),
      personalizacao: {
        ativa: valor("[data-campo=pers-ativa]").checked,
        campos,
        letras: [...raiz.querySelectorAll("[data-letra]")].filter(c => c.checked).map(c => c.dataset.letra),
        artes: [...raiz.querySelectorAll("[data-arte]")].filter(c => c.checked).map(c => c.dataset.arte),
        fotos: { min: num(valor("[data-campo=fotos-min]"), 0), max: num(valor("[data-campo=fotos-max]"), 0), formato: valor("[data-campo=fotos-formato]").value },
        verso: valor("[data-campo=verso]").checked,
      },
      estampas: {
        ativa: valor("[data-campo=estampas-ativa]").checked && MOLDES_COM_ESTAMPA.includes(molde),
        obrigatoria: valor("[data-campo=estampas-obrigatoria]").checked,
        ids: [...raiz.querySelectorAll("[data-estampa]")].filter(c => c.checked).map(c => c.dataset.estampa),
      },
      peso: num(valor("[data-campo=peso]"), 0.45),
      caixa: {
        largura: num(valor("[data-caixa=largura]"), 12),
        altura: num(valor("[data-caixa=altura]"), 12),
        comprimento: num(valor("[data-caixa=comprimento]"), 12),
      },
    };
  }

  function ligar(){
    raiz.addEventListener("click", (e) => {
      const acao = e.target.closest("[data-acao]")?.dataset.acao;
      if(!acao) return;
      e.preventDefault();
      if(acao === "tirar-opcao") e.target.closest("[data-opcao]").remove();
      if(acao === "tirar-grupo") e.target.closest("[data-grupo]").remove();
      if(acao === "tirar-faixa") e.target.closest("[data-faixa]").remove();
      if(acao === "mais-opcao"){
        const grupo = e.target.closest("[data-grupo]");
        const comCor = ["alca", "peca"].includes(grupo.querySelector("[data-campo=previa]").value);
        grupo.querySelector(".al-opcoes").insertAdjacentHTML("beforeend", linhaDeOpcao({ nome: "", preco: 0 }, comCor));
      }
      if(acao === "mais-grupo") raiz.querySelector("[data-grupos]").insertAdjacentHTML("beforeend", blocoDeGrupo({ id: "", nome: "", previa: null, opcoes: [{ nome: "", preco: 0 }] }));
      if(acao === "mais-adicional") raiz.querySelector("[data-adicionais]").insertAdjacentHTML("beforeend", linhaDeOpcao({ nome: "", preco: 0 }, false));
      if(acao === "mais-faixa") raiz.querySelector("[data-faixas]").insertAdjacentHTML("beforeend", `<div class="al-linha" data-faixa><label class="al-campo al-numero">A partir de <input type="number" class="form-control form-control-sm" data-faixa-min min="2" value="11"></label><label class="al-campo al-numero">R$ cada <input type="number" class="form-control form-control-sm" data-faixa-preco step="0.01" value=""></label><button type="button" class="btn btn-link btn-sm text-danger" data-acao="tirar-faixa">tirar</button></div>`);
    });
    raiz.addEventListener("change", (e) => {
      if(e.target.matches("[data-campo=molde]")){
        raiz.querySelector("[data-so-copo]").hidden = e.target.value !== "copo";
        raiz.querySelector("[data-so-foto]").hidden = e.target.value !== "foto";
      }
      if(e.target.matches("[data-campo=previa]")){
        const grupo = e.target.closest("[data-grupo]");
        const atual = grupoDeElemento(grupo);
        grupo.outerHTML = blocoDeGrupo({ ...atual, previa: e.target.value || null });
      }
      renderMoldeFoto();
    });
    raiz.addEventListener("input", (e) => { if(e.target.matches("[data-area]")) renderMoldeFoto(); });
  }

  function grupoDeElemento(el){
    return {
      id: el.dataset.id || "",
      nome: el.querySelector("[data-campo=nome-grupo]").value,
      previa: el.querySelector("[data-campo=previa]").value || null,
      opcoes: [...el.querySelectorAll("[data-opcao]")].map(o => ({
        nome: o.querySelector("[data-campo=nome]").value,
        preco: Number(o.querySelector("[data-campo=preco]").value) || 0,
        esgotado: o.querySelector("[data-campo=esgotado]").checked,
        hex: o.querySelector("[data-campo=hex]")?.value,
      })),
    };
  }

  window.ArteAdminLoja = {
    abrir(produto, listaDeCategorias, elemento){
      raiz = elemento;
      config = JSON.parse(JSON.stringify(produto.config || {}));
      fotosDoProduto = Array.isArray(produto.photos) ? produto.photos : [];
      categorias = Array.isArray(listaDeCategorias) ? listaDeCategorias : [];
      if(!raiz.dataset.ligado){ ligar(); raiz.dataset.ligado = "1"; }
      render();
      if(window.ArteAdminEstampas && !window.ArteAdminEstampas.lista().length) window.ArteAdminEstampas.carregar().then(renderEstampas).catch(() => {});
    },
    ler,
  };
})();
