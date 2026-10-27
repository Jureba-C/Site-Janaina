(function(){
  "use strict";

  let estampas = [];
  let carregando = null;

  function el(id){ return document.getElementById(id); }

  function esc(valor){
    return String(valor == null ? "" : valor).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
  }

  function dinheiro(valor){
    return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  async function pedir(url, opcoes){
    const res = await fetch(url, { credentials: "same-origin", ...opcoes });
    const dados = await res.json().catch(() => ({}));
    if(!res.ok) throw new Error(dados.error || "Não foi possível falar com o servidor agora.");
    return dados;
  }

  function avisoDeProporcao(e){
    if(!e.largura || !e.altura) return "";
    const proporcao = e.largura / e.altura;
    if(Math.abs(proporcao - 200 / 95) <= 0.12) return "";
    return `<p class="estampa-aviso"><i class="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>Proporção diferente da caneca (${e.largura} × ${e.altura} px). O site corta pelo centro.</p>`;
  }

  function cartao(e, i){
    return `
      <article class="estampa-cartao${e.ativa ? "" : " is-oculta"}" data-id="${esc(e.id)}">
        <img src="${esc(e.miniatura)}" alt="" width="180" height="120" loading="lazy">
        <div class="estampa-cartao-corpo">
          ${e.exemplo ? `<span class="estampa-selo">exemplo</span>` : ""}
          <label class="small">Nome <input class="form-control form-control-sm" data-campo="nome" value="${esc(e.nome)}" maxlength="60"></label>
          <label class="small">Coleção <input class="form-control form-control-sm" data-campo="colecao" value="${esc(e.colecao)}" maxlength="40" list="estampaColecoes"></label>
          <label class="small">Valor extra (R$) <input type="number" class="form-control form-control-sm" data-campo="preco" value="${esc(e.preco)}" min="0" max="500" step="0.01"></label>
          <label class="small estampa-ativa"><input type="checkbox" data-campo="ativa"${e.ativa ? " checked" : ""}> aparece na loja</label>
          ${avisoDeProporcao(e)}
          <div class="estampa-acoes">
            <button type="button" class="btn-blush btn-sm-blush" data-acao="salvar">Salvar</button>
            <a class="btn-outline-blush btn-sm-blush" href="/api/admin/estampas/${esc(e.id)}/original" download><i class="bi bi-download me-1" aria-hidden="true"></i>Original</a>
            <button type="button" class="btn-outline-blush btn-sm-blush" data-acao="subir"${i === 0 ? " disabled" : ""} aria-label="Mover para antes"><i class="bi bi-arrow-up" aria-hidden="true"></i></button>
            <button type="button" class="btn-outline-blush btn-sm-blush" data-acao="descer"${i === estampas.length - 1 ? " disabled" : ""} aria-label="Mover para depois"><i class="bi bi-arrow-down" aria-hidden="true"></i></button>
            <button type="button" class="btn btn-link btn-sm text-danger" data-acao="apagar">apagar</button>
          </div>
          <span class="small estampa-feedback" role="status" aria-live="polite"></span>
        </div>
      </article>`;
  }

  function render(){
    const lista = el("estampaLista");
    if(!lista) return;
    lista.innerHTML = estampas.length
      ? estampas.map(cartao).join("")
      : `<p class="admin-hint">Nenhuma estampa ainda. Suba a primeira acima.</p>`;
    const colecoes = [...new Set(estampas.map(e => e.colecao))];
    const datalist = el("estampaColecoes");
    if(datalist) datalist.innerHTML = colecoes.map(c => `<option value="${esc(c)}">`).join("");
  }

  async function carregar(){
    if(!el("estampaLista")) return [];
    if(!carregando){
      carregando = pedir("/api/admin/estampas")
        .then(dados => { estampas = dados.estampas || []; render(); return estampas; })
        .finally(() => { carregando = null; });
    }
    return carregando;
  }

  async function enviar(e){
    e.preventDefault();
    const form = e.currentTarget;
    const aviso = el("estampaMsg");
    const botao = form.querySelector("button[type=submit]");
    botao.disabled = true;
    aviso.textContent = "Enviando e preparando a estampa…";
    try{
      await pedir("/api/admin/estampas", { method: "POST", body: new FormData(form) });
      form.reset();
      aviso.textContent = "Estampa adicionada. Ligue nos produtos em Produtos → Estampas.";
      await carregar();
    }catch(err){
      aviso.textContent = err.message;
    }finally{
      botao.disabled = false;
    }
  }

  async function aoClicar(e){
    const botao = e.target.closest("[data-acao]");
    if(!botao) return;
    const cartaoEl = botao.closest("[data-id]");
    const id = cartaoEl.dataset.id;
    const feedback = cartaoEl.querySelector(".estampa-feedback");
    const acao = botao.dataset.acao;
    try{
      if(acao === "salvar"){
        const campo = (nome) => cartaoEl.querySelector(`[data-campo=${nome}]`);
        feedback.textContent = "Salvando…";
        await pedir(`/api/admin/estampas/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: campo("nome").value, colecao: campo("colecao").value, preco: Number(campo("preco").value) || 0, ativa: campo("ativa").checked }),
        });
        await carregar();
        return;
      }
      if(acao === "apagar"){
        if(!confirm("Apagar esta estampa de vez? Para só tirar da loja, desmarque \"aparece na loja\" e salve.")) return;
        await pedir(`/api/admin/estampas/${encodeURIComponent(id)}`, { method: "DELETE" });
        await carregar();
        return;
      }
      if(acao === "subir" || acao === "descer"){
        const ids = estampas.map(x => x.id);
        const i = ids.indexOf(id);
        const j = acao === "subir" ? i - 1 : i + 1;
        if(j < 0 || j >= ids.length) return;
        [ids[i], ids[j]] = [ids[j], ids[i]];
        await pedir("/api/admin/estampas/ordem", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
        await carregar();
      }
    }catch(err){
      feedback.textContent = err.message;
    }
  }

  function ligar(){
    el("estampaForm")?.addEventListener("submit", enviar);
    el("estampaLista")?.addEventListener("click", aoClicar);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", ligar);
  else ligar();

  window.ArteAdminEstampas = {
    carregar,
    lista: () => estampas.slice(),
  };
})();
