(function(){
  "use strict";

  const fetchOriginal = window.fetch.bind(window);
  let pedidoEmAndamento = null;

  function montarJanela(){
    const janela = document.createElement("dialog");
    janela.className = "confirmar-admin";
    janela.setAttribute("aria-labelledby", "confirmarAdminTitulo");
    janela.innerHTML = `
      <form method="dialog" class="confirmar-admin-caixa">
        <h2 id="confirmarAdminTitulo" class="confirmar-admin-titulo">Confirme que é você</h2>
        <p class="confirmar-admin-texto">Esta ação mexe com dados das clientes ou com dinheiro. Digite o código de 6 números do app autenticador.</p>
        <label class="confirmar-admin-rotulo" for="confirmarAdminCodigo">Código do app</label>
        <input id="confirmarAdminCodigo" class="confirmar-admin-campo" inputmode="numeric" autocomplete="one-time-code" maxlength="11" required>
        <p class="confirmar-admin-erro" role="alert" aria-live="polite"></p>
        <div class="confirmar-admin-botoes">
          <button type="button" class="btn-outline-blush confirmar-admin-cancelar">Cancelar</button>
          <button type="submit" class="btn-blush confirmar-admin-ok">Confirmar</button>
        </div>
      </form>`;
    document.body.appendChild(janela);
    return janela;
  }

  function pedirConfirmacao(){
    if(pedidoEmAndamento) return pedidoEmAndamento;
    pedidoEmAndamento = new Promise(resolver => {
      const janela = document.querySelector("dialog.confirmar-admin") || montarJanela();
      const campo = janela.querySelector(".confirmar-admin-campo");
      const erro = janela.querySelector(".confirmar-admin-erro");
      const ok = janela.querySelector(".confirmar-admin-ok");
      const cancelar = janela.querySelector(".confirmar-admin-cancelar");
      const form = janela.querySelector("form");
      campo.value = "";
      erro.textContent = "";

      function terminar(valor){
        form.removeEventListener("submit", enviar);
        cancelar.removeEventListener("click", desistir);
        janela.removeEventListener("cancel", desistir);
        if(janela.open) janela.close();
        pedidoEmAndamento = null;
        resolver(valor);
      }
      function desistir(e){
        e?.preventDefault?.();
        terminar(false);
      }
      async function enviar(e){
        e.preventDefault();
        ok.disabled = true;
        erro.textContent = "";
        try{
          const res = await fetchOriginal("/api/admin/confirmar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: campo.value.trim() }),
          });
          const dados = await res.json().catch(() => ({}));
          if(!res.ok){
            erro.textContent = dados.error || "Não deu para confirmar agora.";
            campo.select();
            return;
          }
          terminar(true);
        }catch{
          erro.textContent = "Sem conexão. Tente de novo.";
        }finally{
          ok.disabled = false;
        }
      }
      form.addEventListener("submit", enviar);
      cancelar.addEventListener("click", desistir);
      janela.addEventListener("cancel", desistir);
      janela.showModal();
      setTimeout(() => campo.focus(), 30);
    });
    return pedidoEmAndamento;
  }

  function enderecoDe(entrada){
    if(typeof entrada === "string") return entrada;
    if(entrada && typeof entrada.url === "string") return entrada.url;
    return String(entrada || "");
  }

  window.fetch = async function(entrada, opcoes){
    const res = await fetchOriginal(entrada, opcoes);
    const url = enderecoDe(entrada);
    if(res.status !== 403 || !/\/api\/admin\//.test(url) || /\/api\/admin\/confirmar/.test(url)) return res;
    const corpo = await res.clone().json().catch(() => ({}));
    if(corpo.precisaEntrarDeNovo){
      window.location.href = "/conta.html?admin=1";
      return res;
    }
    if(!corpo.precisaConfirmar) return res;
    const confirmou = await pedirConfirmacao();
    if(!confirmou) return res;
    const { signal, ...semSinal } = opcoes || {};
    return fetchOriginal(entrada, semSinal);
  };
})();
