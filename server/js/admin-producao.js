(function(){
  "use strict";

  const ETAPAS = [
    { id: "aprovar", titulo: "Aprovar arte", curto: "Aprovar", icone: "bi-palette", vazio: "Nenhuma arte esperando a cliente aprovar." },
    { id: "produzir", titulo: "Produzir", curto: "Produzir", icone: "bi-brush", vazio: "Nada para produzir agora." },
    { id: "pronto", titulo: "Prontos", curto: "Prontos", icone: "bi-box-seam", vazio: "Nenhum pedido pronto esperando postar ou retirar." },
    { id: "enviado", titulo: "A caminho", curto: "Enviados", icone: "bi-truck", vazio: "Nenhum pedido a caminho." },
  ];
  const ETAPAS_COM_PRAZO = new Set(["aprovar", "produzir", "pronto"]);
  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

  let aj = null;
  let pedidos = [];
  let diasDeProducao = 5;
  let busca = "";
  let soAtrasados = false;
  let etapaAberta = null;
  let ligado = false;

  const el = (id) => document.getElementById(id);

  function esc(valor){
    return aj.escapeHTML(valor == null ? "" : valor);
  }

  function normalizar(texto){
    return String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  }

  function numero(ref){
    return String(ref || "").slice(0, 8);
  }

  function primeiroNome(order){
    return String(order.customer?.nome || order.address?.nome || "").trim().split(" ")[0] || "";
  }

  function dataCurta(texto){
    const [, mes, dia] = String(texto || "").split("-");
    return dia ? `${Number(dia)} ${MESES[Number(mes) - 1]}` : "";
  }

  function diaCurto(ms){
    const d = new Date(ms);
    return `${d.getDate()} ${MESES[d.getMonth()]}`;
  }

  function textoDoPrazo(prazo){
    if(!prazo) return "";
    if(prazo.faltam < 0) return prazo.faltam === -1 ? "Atrasado 1 dia" : `Atrasado ${-prazo.faltam} dias`;
    if(prazo.faltam === 0) return "Vence hoje";
    if(prazo.faltam === 1) return "Vence amanhã";
    return `Faltam ${prazo.faltam} dias`;
  }

  function classeDoPrazo(prazo){
    if(!prazo) return "";
    if(prazo.faltam < 0) return "is-atrasado";
    if(prazo.faltam <= 1) return "is-hoje";
    return "";
  }

  function atrasado(order){
    return ETAPAS_COM_PRAZO.has(order.etapa) && Boolean(order.prazo?.atrasado);
  }

  function ordenar(lista){
    return [...lista].sort((a, b) =>
      String(a.prazo?.data || "").localeCompare(String(b.prazo?.data || "")) || (a.pagoEm || 0) - (b.pagoEm || 0));
  }

  function casaComBusca(order){
    if(!busca) return true;
    const termo = normalizar(busca).replace(/^#/, "");
    const nome = normalizar(order.customer?.nome || order.address?.nome);
    return nome.includes(termo) || normalizar(order.reference).startsWith(termo);
  }

  function pedidosDaEtapa(etapa){
    return ordenar(pedidos.filter(o => o.etapa === etapa && casaComBusca(o) && (!soAtrasados || atrasado(o))));
  }

  function linhaDeDetalhe(rotulo, valor){
    if(valor == null || String(valor).trim() === "") return "";
    return `<div><dt>${esc(rotulo)}</dt><dd>${esc(valor)}</dd></div>`;
  }

  function detalhesDaPeca(peca){
    if(!peca) return "";
    const linhas = [
      linhaDeDetalhe("Cor/variação", peca.variacao),
      linhaDeDetalhe("Adicional", peca.adicionais),
      linhaDeDetalhe("Nome", peca.nome),
      linhaDeDetalhe("Frase", peca.frase),
      linhaDeDetalhe("Data", peca.data),
      linhaDeDetalhe("Letra", peca.letra),
      linhaDeDetalhe("Arte", peca.arte),
      linhaDeDetalhe("Fotos", peca.fotos ? String(peca.fotos) : ""),
      linhaDeDetalhe("Obs.", peca.observacoes),
    ].join("");
    return linhas ? `<dl class="prod-peca-detalhes">${linhas}</dl>` : "";
  }

  function arquivosDoItem(order, item, indice, etapa){
    const ref = order.reference;
    const botoes = [];
    if(item.temArte){
      if(etapa === "produzir"){
        botoes.push(`<a class="btn-blush prod-btn-arquivo" href="/api/admin/pedidos/${encodeURIComponent(ref)}/itens/${indice}/producao.svg" download><i class="bi bi-vector-pen me-1" aria-hidden="true"></i>Corel / Illustrator</a>`);
      }
      botoes.push(`<button type="button" class="btn-outline-blush prod-btn-arquivo" data-acao="arte-png" data-ref="${esc(ref)}" data-indice="${indice}" data-lado="frente"><i class="bi bi-download me-1" aria-hidden="true"></i>Arte${item.temVerso ? " frente" : ""} (PNG)</button>`);
      if(item.temVerso) botoes.push(`<button type="button" class="btn-outline-blush prod-btn-arquivo" data-acao="arte-png" data-ref="${esc(ref)}" data-indice="${indice}" data-lado="verso"><i class="bi bi-download me-1" aria-hidden="true"></i>Arte verso (PNG)</button>`);
      botoes.push(`<button type="button" class="btn-outline-blush prod-btn-arquivo" data-acao="previa" data-ref="${esc(ref)}" data-indice="${indice}" data-verso="${item.temVerso ? "1" : ""}"><i class="bi bi-eye me-1" aria-hidden="true"></i>Ver prévia</button>`);
    }
    if(etapa === "produzir" && Array.isArray(item.fotos)){
      item.fotos.forEach((id, n) => botoes.push(`<a class="btn-outline-blush prod-btn-arquivo" href="/api/personalizacao/fotos/${encodeURIComponent(id)}?tamanho=original&amp;baixar=1"><i class="bi bi-image me-1" aria-hidden="true"></i>Foto ${n + 1} original</a>`));
    }
    return botoes.length ? `<div class="prod-arquivos">${botoes.join("")}</div>` : "";
  }

  function pecasDoPedido(order, etapa){
    const comArquivos = etapa === "aprovar" || etapa === "produzir";
    return `<ul class="prod-pecas">${order.items.map((item, indice) => `
      <li>
        <div class="prod-peca-nome"><span class="prod-qtd">${esc(item.qty)}×</span> ${esc(item.name)}</div>
        ${detalhesDaPeca(item.peca)}
        ${comArquivos ? arquivosDoItem(order, item, indice, etapa) : ""}
      </li>`).join("")}</ul>`;
  }

  function oQueFoiPedido(order){
    const itens = order.items || [];
    if(!itens.length) return "";
    if(itens.length === 1) return `*${itens[0].name}*`;
    return `*${itens[0].name}* e mais ${itens.length - 1} ${itens.length - 1 === 1 ? "peça" : "peças"}`;
  }

  function whatsappDaArte(order){
    const nome = primeiroNome(order);
    return aj.whatsappUrl(order.customer?.telefone || order.address?.telefone, [
      `Olá${nome ? ", " + nome : ""}! Aqui é a Janaina, da Arte Canecas 💛`,
      "",
      `A arte do seu pedido #${numero(order.reference)} (${oQueFoiPedido(order)}) está pronta. Vou te mandar a imagem aqui.`,
      "Confere com carinho o nome, a frase e a data e me diz se posso produzir?",
    ].join("\n"));
  }

  function whatsappDaRetirada(order){
    const nome = primeiroNome(order);
    return aj.whatsappUrl(order.customer?.telefone || order.address?.telefone, [
      `Olá${nome ? ", " + nome : ""}! Aqui é a Janaina, da Arte Canecas 💛`,
      "",
      `Seu pedido #${numero(order.reference)} (${oQueFoiPedido(order)}) ficou pronto! 🎉`,
      "Qual o melhor dia e horário para você retirar?",
    ].join("\n"));
  }

  function enderecoEmLinha(order){
    const a = order.address || {};
    const rua = [a.rua, a.numero].filter(Boolean).join(", ");
    return [rua, a.complemento, a.bairro, [a.cidade, a.uf].filter(Boolean).join("/"), a.cep ? `CEP ${aj.mascararCep(a.cep)}` : ""].filter(Boolean).join(" — ");
  }

  function linkDeWhatsApp(url, texto){
    return url
      ? `<a class="btn-outline-blush prod-btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><i class="bi bi-whatsapp me-1" aria-hidden="true"></i>${texto}</a>`
      : `<span class="prod-aviso">Sem WhatsApp no pedido.</span>`;
  }

  function acoesDoPedido(order){
    const ref = esc(order.reference);
    const retirada = Boolean(order.shipping?.retirada);
    if(order.etapa === "aprovar"){
      return `
        <p class="prod-dica">1. Baixe a arte acima · 2. Mande para a cliente · 3. Quando ela responder, toque em "Cliente aprovou".</p>
        ${linkDeWhatsApp(whatsappDaArte(order), "Mandar arte no WhatsApp")}
        <button type="button" class="btn-blush prod-btn" data-acao="arte-aprovada" data-ref="${ref}"><i class="bi bi-check2-circle me-1" aria-hidden="true"></i>Cliente aprovou</button>`;
    }
    if(order.etapa === "produzir"){
      return `<button type="button" class="btn-blush prod-btn" data-acao="pronto" data-ref="${ref}"><i class="bi bi-check2-circle me-1" aria-hidden="true"></i>Ficou pronto</button>`;
    }
    if(order.etapa === "pronto" && retirada){
      return `
        ${linkDeWhatsApp(whatsappDaRetirada(order), "Avisar que está pronto")}
        <button type="button" class="btn-blush prod-btn" data-acao="entregue" data-ref="${ref}" data-palavra="retirado"><i class="bi bi-check2-circle me-1" aria-hidden="true"></i>Cliente retirou</button>`;
    }
    if(order.etapa === "pronto"){
      const endereco = enderecoEmLinha(order);
      return `
        <div class="prod-endereco">
          <span><strong>${esc(order.address?.nome || "")}</strong><br>${esc(endereco)}</span>
          <button type="button" class="copy-field-btn" data-acao="copiar" data-texto="${esc([order.address?.nome, endereco].filter(Boolean).join("\n"))}" aria-label="Copiar endereço" title="Copiar endereço"><i class="bi bi-clipboard"></i></button>
        </div>
        <button type="button" class="btn-blush prod-btn" data-acao="etiqueta" data-ref="${ref}"><i class="bi bi-stars me-1" aria-hidden="true"></i>Comprar etiqueta</button>
        <div class="prod-rastreio">
          <label class="visually-hidden" for="prod-rastreio-${ref}">Código de rastreio</label>
          <input type="text" class="form-control" id="prod-rastreio-${ref}" placeholder="ou cole o rastreio" maxlength="60" autocomplete="off">
          <button type="button" class="btn-outline-blush" data-acao="salvar-rastreio" data-ref="${ref}">Salvar</button>
        </div>`;
    }
    if(order.etapa === "enviado"){
      return `
        <div class="prod-endereco">
          <span>Rastreio <strong>${esc(order.trackingCode)}</strong>${order.shippedAt ? ` · postado em ${esc(diaCurto(order.shippedAt))}` : ""}</span>
          <button type="button" class="copy-field-btn" data-acao="copiar" data-texto="${esc(order.trackingCode)}" aria-label="Copiar rastreio" title="Copiar rastreio"><i class="bi bi-clipboard"></i></button>
        </div>
        ${linkDeWhatsApp(aj.whatsappPostagemUrl(order), "Mandar rastreio no WhatsApp")}
        <button type="button" class="btn-outline-blush prod-btn" data-acao="conferir" data-ref="${ref}"><i class="bi bi-search me-1" aria-hidden="true"></i>Conferir entrega</button>
        <button type="button" class="btn-blush prod-btn" data-acao="entregue" data-ref="${ref}" data-palavra="entregue"><i class="bi bi-check2-circle me-1" aria-hidden="true"></i>Marcar entregue</button>`;
    }
    return "";
  }

  function cartao(order){
    const ref = order.reference;
    const retirada = Boolean(order.shipping?.retirada);
    const comPrazo = ETAPAS_COM_PRAZO.has(order.etapa) && order.prazo;
    const entrega = retirada ? `<i class="bi bi-shop me-1" aria-hidden="true"></i>Retirada` : `<i class="bi bi-truck me-1" aria-hidden="true"></i>Envio${order.shipping?.name ? " · " + esc(order.shipping.name) : ""}`;
    return `
      <article class="prod-card${atrasado(order) ? " is-atrasado" : ""}" data-ref="${esc(ref)}">
        <header class="prod-card-topo">
          <span class="prod-card-quem">
            <strong>${esc(order.customer?.nome || order.address?.nome || "Cliente")}</strong>
            <span>#${esc(numero(ref))}${order.pagoEm ? ` · pago ${esc(diaCurto(order.pagoEm))}` : ""}</span>
          </span>
          ${comPrazo ? `<span class="prod-prazo ${classeDoPrazo(order.prazo)}" title="Prazo: ${esc(dataCurta(order.prazo.data))}">${esc(textoDoPrazo(order.prazo))}</span>` : ""}
        </header>
        <div class="prod-card-entrega">${entrega}${comPrazo ? ` · prazo ${esc(dataCurta(order.prazo.data))}` : ""}</div>
        ${pecasDoPedido(order, order.etapa)}
        <div class="prod-acoes">${acoesDoPedido(order)}</div>
        <span class="prod-feedback tracking-feedback" data-feedback="${esc(ref)}" role="status" aria-live="polite"></span>
        <button type="button" class="prod-ver-pedido" data-acao="ver-pedido" data-ref="${esc(ref)}">Ver pedido completo <i class="bi bi-chevron-right" aria-hidden="true"></i></button>
      </article>`;
  }

  function vendasDoMes(){
    const agora = new Date();
    const doMes = pedidos.filter(o => {
      if(o.status !== "pago" || !o.pagoEm) return false;
      const d = new Date(o.pagoEm);
      return d.getFullYear() === agora.getFullYear() && d.getMonth() === agora.getMonth();
    });
    return { total: doMes.reduce((soma, o) => soma + Number(o.total || 0), 0), quantidade: doMes.length };
  }

  function contagem(etapa){
    return pedidos.filter(o => o.etapa === etapa).length;
  }

  function renderContadores(){
    const atrasados = pedidos.filter(atrasado).length;
    const prontos = pedidos.filter(o => o.etapa === "pronto");
    const retirar = prontos.filter(o => o.shipping?.retirada).length;
    const vendas = vendasDoMes();
    const blocos = [
      { etapa: "aprovar", valor: contagem("aprovar"), rotulo: "Aprovar arte" },
      { etapa: "produzir", valor: contagem("produzir"), rotulo: "Produzir" },
      { etapa: "pronto", valor: prontos.length, rotulo: "Postar ou retirar", sub: prontos.length ? `${prontos.length - retirar} postar · ${retirar} retirar` : "" },
      { etapa: "enviado", valor: contagem("enviado"), rotulo: "A caminho" },
      { etapa: "atrasados", valor: atrasados, rotulo: "Atrasados", cls: atrasados ? " is-alerta" : "" },
    ];
    el("prodContadores").innerHTML = blocos.map(b => `
      <button type="button" class="prod-contador${b.cls || ""}${(b.etapa === "atrasados" ? soAtrasados : false) ? " is-ativo" : ""}" data-contador="${b.etapa}" aria-pressed="${b.etapa === "atrasados" ? String(soAtrasados) : "false"}">
        <span class="prod-contador-valor">${b.valor}</span>
        <span class="prod-contador-rotulo">${esc(b.rotulo)}</span>
        ${b.sub ? `<span class="prod-contador-sub">${esc(b.sub)}</span>` : ""}
      </button>`).join("") + `
      <div class="prod-contador is-vendas">
        <span class="prod-contador-valor">${esc(aj.formatMoney(vendas.total))}</span>
        <span class="prod-contador-rotulo">Vendas do mês</span>
        <span class="prod-contador-sub">${vendas.quantidade} ${vendas.quantidade === 1 ? "pedido pago" : "pedidos pagos"}</span>
      </div>`;
    const naFila = contagem("aprovar") + contagem("produzir") + contagem("pronto");
    const contadorDaAba = el("producaoContador");
    if(contadorDaAba){
      contadorDaAba.textContent = String(naFila);
      contadorDaAba.classList.toggle("d-none", naFila === 0);
    }
  }

  function etapaPadrao(){
    const comPedido = ETAPAS.find(e => pedidosDaEtapa(e.id).length);
    return comPedido ? comPedido.id : "produzir";
  }

  function renderQuadro(){
    if(!etapaAberta) etapaAberta = etapaPadrao();
    el("prodAbas").innerHTML = ETAPAS.map(e => {
      const n = pedidosDaEtapa(e.id).length;
      const ativa = e.id === etapaAberta;
      return `<button type="button" class="prod-aba${ativa ? " is-ativa" : ""}" role="tab" aria-selected="${ativa}" aria-controls="prod-coluna-${e.id}" data-etapa="${e.id}">${esc(e.curto)} <span class="prod-aba-n">${n}</span></button>`;
    }).join("");
    el("prodQuadro").innerHTML = ETAPAS.map(e => {
      const lista = pedidosDaEtapa(e.id);
      const vazio = busca || soAtrasados ? "Nenhum pedido com esse filtro aqui." : e.vazio;
      return `
        <section class="prod-coluna${e.id === etapaAberta ? " is-ativa" : ""}" id="prod-coluna-${e.id}" role="tabpanel" aria-label="${esc(e.titulo)}">
          <h3 class="prod-coluna-titulo"><i class="bi ${e.icone}" aria-hidden="true"></i>${esc(e.titulo)} <span class="prod-aba-n">${lista.length}</span></h3>
          ${lista.length ? lista.map(cartao).join("") : `<p class="prod-vazio">${esc(vazio)}</p>`}
        </section>`;
    }).join("");
  }

  function renderLote(){
    const caixa = el("prodLote");
    if(caixa.hidden) return;
    const grupos = new Map();
    for(const order of pedidos.filter(o => o.etapa === "produzir")){
      for(const item of order.items){
        const peca = item.peca || { produto: item.name, variacao: "" };
        const nome = [peca.produto || item.name, peca.variacao].filter(Boolean).join(" · ");
        const grupo = grupos.get(nome) || { nome, qtd: 0, pedidos: new Set() };
        grupo.qtd += Number(item.qty) || 1;
        grupo.pedidos.add(numero(order.reference));
        grupos.set(nome, grupo);
      }
    }
    const lista = [...grupos.values()].sort((a, b) => b.qtd - a.qtd || a.nome.localeCompare(b.nome));
    const esperando = contagem("aprovar");
    caixa.innerHTML = `
      <h3 class="prod-lote-titulo">O que produzir agora</h3>
      ${lista.length ? `<ul class="prod-lote-lista">${lista.map(g => `
        <li><span class="prod-qtd">${g.qtd}×</span> <span>${esc(g.nome)}<small>${[...g.pedidos].map(n => "#" + esc(n)).join(" · ")}</small></span></li>`).join("")}</ul>`
        : `<p class="prod-vazio mb-0">Nada na etapa Produzir agora.</p>`}
      ${esperando ? `<p class="prod-dica mb-0">+ ${esperando} ${esperando === 1 ? "pedido esperando" : "pedidos esperando"} a cliente aprovar a arte.</p>` : ""}`;
  }

  function render(){
    if(!aj) return;
    const info = el("prodPrazoInfo");
    if(info) info.textContent = `Prazo: ${diasDeProducao} ${diasDeProducao === 1 ? "dia útil" : "dias úteis"} depois do pagamento (muda em Produtos)`;
    renderContadores();
    renderQuadro();
    renderLote();
  }

  function feedbackDe(ref){
    return el("prodQuadro").querySelector(`[data-feedback="${CSS.escape(ref)}"]`);
  }

  function mostrarFeedback(ref, texto, erro){
    const alvo = feedbackDe(ref);
    if(!alvo) return;
    alvo.textContent = texto;
    alvo.classList.toggle("is-error", Boolean(erro));
    alvo.classList.toggle("is-success", !erro && Boolean(texto));
  }

  async function avancar(ref, caminho, opcoes, btn){
    btn.disabled = true;
    mostrarFeedback(ref, "Salvando...");
    try{
      const res = await aj.fetchWithTimeout(`/api/admin/orders/${encodeURIComponent(ref)}/${caminho}`, { headers: { "Content-Type": "application/json" }, body: "{}", ...opcoes });
      const data = await res.json().catch(() => ({}));
      if(!res.ok) throw new Error(data.error || "Não foi possível salvar.");
      await aj.recarregar();
      const movido = pedidos.find(o => o.reference === ref);
      const destino = movido && ETAPAS.find(et => et.id === movido.etapa);
      if(destino && destino.id !== etapaAberta){
        etapaAberta = destino.id;
        renderQuadro();
        mostrarFeedback(ref, `Foi para ${destino.titulo}.`);
        document.querySelector(`.prod-card[data-ref="${CSS.escape(ref)}"]`)?.classList.add("prod-card-chegou");
      }
    }catch(err){
      mostrarFeedback(ref, err.message || "Não foi possível salvar.", true);
      btn.disabled = false;
    }
  }

  async function comBotaoOcupado(btn, texto, fn){
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = texto;
    try{ await fn(); }
    finally{ btn.disabled = false; btn.innerHTML = original; }
  }

  async function baixarPlanilha(btn){
    await comBotaoOcupado(btn, "Gerando...", async () => {
      try{
        const res = await aj.fetchWithTimeout(`/api/admin/${btn.dataset.planilha}.xlsx`, {}, 30000);
        if(!res.ok){
          let msg = "Não foi possível gerar a planilha agora.";
          try{ msg = (await res.json()).error || msg; }catch{}
          throw new Error(msg);
        }
        const blob = await res.blob();
        const nome = (res.headers.get("Content-Disposition") || "").match(/filename="([^"]+)"/)?.[1] || `${btn.dataset.planilha}.xlsx`;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = nome;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }catch(err){
        alert(err.message || "Não foi possível gerar a planilha agora.");
      }
    });
  }

  function imprimirListaDePostagem(){
    const lista = ordenar(pedidos.filter(o => o.etapa === "pronto" && !o.shipping?.retirada));
    if(!lista.length){
      alert("Nenhum pedido pronto para postar agora.");
      return;
    }
    const caixa = el("listaPostagem");
    const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    caixa.innerHTML = `
      <h1>Lista de postagem · Arte Canecas</h1>
      <p>${esc(hoje)} · ${lista.length} ${lista.length === 1 ? "pacote" : "pacotes"}</p>
      <ol>${lista.map(o => `
        <li>
          <span class="lista-postagem-caixa" aria-hidden="true"></span>
          <div>
            <strong>${esc(o.address?.nome || o.customer?.nome || "")}</strong> · #${esc(numero(o.reference))}
            <div>${esc(enderecoEmLinha(o))}</div>
            <div>${esc(o.shipping?.name || "")}${o.trackingCode ? " · rastreio " + esc(o.trackingCode) : ""}</div>
            <div class="lista-postagem-itens">${o.items.map(i => `${esc(i.qty)}× ${esc(i.name)}`).join(" · ")}</div>
          </div>
        </li>`).join("")}</ol>`;
    caixa.hidden = false;
    document.body.classList.add("imprimindo-postagem");
    const terminar = () => {
      document.body.classList.remove("imprimindo-postagem");
      caixa.hidden = true;
      window.removeEventListener("afterprint", terminar);
    };
    window.addEventListener("afterprint", terminar);
    window.print();
  }

  async function aoClicarNoQuadro(e){
    const btn = e.target.closest("[data-acao]");
    if(!btn) return;
    const ref = btn.dataset.ref;
    const acao = btn.dataset.acao;
    if(acao === "ver-pedido") return aj.verPedidoCompleto(ref);
    if(acao === "previa") return aj.abrirPreviaDoPedido(ref, btn.dataset.indice, Boolean(btn.dataset.verso));
    if(acao === "copiar"){
      const copiou = await aj.copiarTexto(btn.dataset.texto || "");
      const icone = btn.querySelector("i");
      if(icone){
        icone.className = copiou ? "bi bi-check2" : "bi bi-exclamation-triangle";
        setTimeout(() => { icone.className = "bi bi-clipboard"; }, 2000);
      }
      return;
    }
    if(acao === "arte-png"){
      return comBotaoOcupado(btn, "Gerando PNG…", async () => {
        try{ await aj.baixarArtePng(ref, btn.dataset.indice, btn.dataset.lado); }
        catch(err){ alert(err.message || "Não foi possível baixar a arte."); }
      });
    }
    if(acao === "arte-aprovada"){
      if(!confirm("A cliente aprovou a arte? O pedido vai para Produzir.")) return;
      return avancar(ref, "arte-aprovada", { method: "POST" }, btn);
    }
    if(acao === "pronto"){
      if(!confirm("O pedido ficou pronto?")) return;
      return avancar(ref, "pronto", { method: "POST" }, btn);
    }
    if(acao === "entregue"){
      if(!confirm(btn.dataset.palavra === "retirado" ? "A cliente já retirou o pedido?" : "Marcar este pedido como entregue?")) return;
      return avancar(ref, "delivered", { method: "PATCH" }, btn);
    }
    if(acao === "salvar-rastreio"){
      const campo = el(`prod-rastreio-${ref}`);
      const codigo = campo ? campo.value.trim() : "";
      if(!codigo){ mostrarFeedback(ref, "Cole o código de rastreio antes de salvar.", true); campo?.focus(); return; }
      return aj.saveTracking(ref, codigo, feedbackDe(ref));
    }
    if(acao === "etiqueta"){
      const alvo = feedbackDe(ref);
      await aj.generateLabel(ref, alvo, btn);
      if(alvo?.classList.contains("is-success")) setTimeout(aj.recarregar, 1200);
      return;
    }
    if(acao === "conferir") return aj.conferirEntrega(ref, feedbackDe(ref), btn);
  }

  function ligar(){
    ligado = true;
    el("prodQuadro").addEventListener("click", aoClicarNoQuadro);
    el("prodAbas").addEventListener("click", (e) => {
      const aba = e.target.closest("[data-etapa]");
      if(!aba) return;
      etapaAberta = aba.dataset.etapa;
      renderQuadro();
    });
    el("prodContadores").addEventListener("click", (e) => {
      const botao = e.target.closest("[data-contador]");
      if(!botao) return;
      if(botao.dataset.contador === "atrasados"){
        soAtrasados = !soAtrasados;
        if(soAtrasados) etapaAberta = ETAPAS.find(et => pedidosDaEtapa(et.id).length)?.id || etapaAberta;
        render();
        return;
      }
      etapaAberta = botao.dataset.contador;
      renderQuadro();
      el(`prod-coluna-${etapaAberta}`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      if(getComputedStyle(el("prodAbas")).display !== "none") el("prodAbas").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    let espera = null;
    el("prodBusca").addEventListener("input", (e) => {
      clearTimeout(espera);
      espera = setTimeout(() => { busca = e.target.value; renderQuadro(); }, 150);
    });
    el("prodLoteBtn").addEventListener("click", (e) => {
      const caixa = el("prodLote");
      caixa.hidden = !caixa.hidden;
      e.currentTarget.setAttribute("aria-expanded", String(!caixa.hidden));
      renderLote();
    });
    document.querySelectorAll("[data-planilha]").forEach(btn => btn.addEventListener("click", () => baixarPlanilha(btn)));
    el("prodImprimirBtn").addEventListener("click", imprimirListaDePostagem);
  }

  window.ArteAdminProducao = {
    render(lista, opcoes){
      aj = opcoes.ajudantes;
      pedidos = (Array.isArray(lista) ? lista : []).filter(o => o.status === "pago" && o.etapa);
      diasDeProducao = Number(opcoes.diasDeProducao) || 5;
      if(!ligado) ligar();
      render();
    },
  };
})();
