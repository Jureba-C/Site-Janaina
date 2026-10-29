(function(){
  "use strict";

  const lista = document.getElementById("segLista");
  if(!lista) return;
  const resumo = document.getElementById("segResumo");
  const msg = document.getElementById("segMsg");
  const derrubarBtn = document.getElementById("segDerrubarBtn");

  const ROTULOS = {
    login_ok: "Entrou na conta",
    login_falhou: "Senha errada",
    conta_lenta: "Conta com muitas senhas erradas",
    admin_novo_acesso: "Acesso ao painel liberado",
    admin_2fa_falhou: "Código do app errado no painel",
    admin_2fa_redefinido: "App autenticador zerado pela hospedagem",
    dois_fatores_trocado: "App autenticador ativado ou trocado",
    senha_redefinida: "Senha redefinida por uma cliente",
    senha_redefinida_admin: "Senha do painel redefinida",
    email_trocado: "E-mail de uma conta trocado",
    export_completo: "Planilha completa de clientes baixada",
    backup_baixado: "Backup criptografado baixado",
    pedido_arquivado: "Pedido não pago arquivado",
    cupom_alterado: "Cupom alterado",
    confirmacao_admin: "Ação confirmada com o código do app",
    webhook_assinatura_invalida: "Aviso de pagamento falso recusado",
    webhook_sem_segredo: "Aviso de pagamento recusado (falta configuração)",
    webhook_ts_antigo: "Aviso de pagamento antigo recusado",
    pagamento_duplicado: "Pedido pago duas vezes",
    pagamento_divergente: "Pagamento com valor ou forma diferente",
    pago_atrasado: "Pagamento depois do cancelamento",
    pagamento_apos_reembolso: "Pagamento em pedido reembolsado",
    reembolso: "Pedido reembolsado",
    estorno: "Estorno no cartão",
    estorno_revertido: "Estorno revertido",
    disputa_aberta: "Disputa aberta",
    cupom_repetido: "Cupom de uso único repetido",
    etiqueta_repetida_bloqueada: "Etiqueta repetida bloqueada",
    upload_quota: "Limite de fotos atingido",
    cron_token_invalido: "Chamada errada na rotina automática",
    backup_ok: "Backup diário enviado",
    backup_falhou: "Backup diário falhou",
    backup_atrasado: "Backup atrasado",
    erro_nao_tratado: "Erro inesperado no site",
    csp_violacao: "Bloqueio de conteúdo estranho na página",
    sessoes_derrubadas: "Aparelhos desconectados",
  };

  const GRUPOS = {
    acessos: /login|admin_|dois_fatores|senha|email_trocado|conta_lenta|sessoes|confirmacao/,
    pagamentos: /pagamento|pago_|reembolso|estorno|disputa|webhook|cupom|etiqueta/,
  };

  let eventos = [];
  let filtro = "tudo";
  let carregou = false;

  function quando(ms){
    return new Date(ms).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function aparelho(agente){
    const ua = String(agente || "");
    if(!ua) return "";
    const sistema = /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "";
    const navegador = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
    return [navegador, sistema].filter(Boolean).join(" no ");
  }

  function icone(e){
    if(e.gravidade === "critico") return "bi-exclamation-octagon";
    if(e.gravidade === "aviso") return "bi-exclamation-triangle";
    return "bi-info-circle";
  }

  function desenharResumo(){
    const semana = Date.now() - 7 * 86400000;
    const recentes = eventos.filter(e => e.quando >= semana);
    const conta = (tipos) => recentes.filter(e => tipos.includes(e.tipo)).length;
    const cards = [
      { n: conta(["admin_novo_acesso"]), t: "acessos ao painel (7 dias)" },
      { n: conta(["login_falhou", "admin_2fa_falhou"]), t: "senhas ou códigos errados (7 dias)" },
      { n: recentes.filter(e => e.gravidade === "critico" && e.tipo !== "admin_novo_acesso").length, t: "alertas graves (7 dias)", alerta: true },
      { n: conta(["backup_ok"]), t: "backups enviados (7 dias)" },
    ];
    resumo.replaceChildren(...cards.map(c => {
      const div = document.createElement("div");
      div.className = `seg-card${c.alerta && c.n ? " is-alerta" : ""}`;
      const forte = document.createElement("strong");
      forte.textContent = String(c.n);
      const texto = document.createElement("span");
      texto.textContent = c.t;
      div.append(forte, texto);
      return div;
    }));
  }

  function desenharLista(){
    const visiveis = eventos.filter(e => {
      if(filtro === "critico") return e.gravidade === "critico";
      if(GRUPOS[filtro]) return GRUPOS[filtro].test(e.tipo);
      return e.tipo !== "login_ok";
    }).slice(0, 150);
    if(!visiveis.length){
      const vazio = document.createElement("li");
      vazio.className = "seg-vazio";
      vazio.textContent = "Nada por aqui. Tudo tranquilo.";
      lista.replaceChildren(vazio);
      return;
    }
    lista.replaceChildren(...visiveis.map(e => {
      const li = document.createElement("li");
      li.className = `seg-item is-${e.gravidade}`;
      const i = document.createElement("i");
      i.className = `bi ${icone(e)}`;
      i.setAttribute("aria-hidden", "true");
      const corpo = document.createElement("div");
      const titulo = document.createElement("strong");
      titulo.textContent = ROTULOS[e.tipo] || e.titulo || e.tipo;
      const detalhe = document.createElement("small");
      const partes = [quando(e.quando)];
      if(e.pedido) partes.push(`pedido ${e.pedido}`);
      if(e.ip) partes.push(`IP ${e.ip}`);
      const ap = aparelho(e.agente);
      if(ap) partes.push(ap);
      if(e.detalhes?.pagamento) partes.push(`pagamento ${e.detalhes.pagamento}`);
      detalhe.textContent = partes.join(" · ");
      corpo.append(titulo, detalhe);
      li.append(i, corpo);
      return li;
    }));
  }

  async function carregar(){
    try{
      const res = await fetch("/api/admin/eventos?dias=30");
      if(!res.ok) throw new Error();
      eventos = (await res.json()).eventos || [];
      carregou = true;
      desenharResumo();
      desenharLista();
    }catch{
      msg.textContent = "Não deu para carregar os eventos agora.";
    }
  }

  document.addEventListener("click", (e) => {
    const atalho = e.target.closest("[data-tab-ir='seguranca']");
    if(atalho) carregar();
    const botao = e.target.closest("[data-seg-filtro]");
    if(botao){
      filtro = botao.dataset.segFiltro;
      document.querySelectorAll("[data-seg-filtro]").forEach(b => b.classList.toggle("is-ativo", b === botao));
      if(carregou) desenharLista();
    }
  });

  derrubarBtn?.addEventListener("click", async () => {
    if(!confirm("Desconectar todas as clientes e todos os aparelhos do painel? Só este aparelho continua conectado.")) return;
    derrubarBtn.disabled = true;
    msg.textContent = "";
    try{
      const res = await fetch("/api/admin/derrubar-sessoes", { method: "POST" });
      const dados = await res.json().catch(() => ({}));
      if(!res.ok) throw new Error(dados.error || "Não deu para desconectar agora.");
      msg.textContent = `Pronto: ${dados.derrubadas} acesso(s) encerrado(s).`;
      carregar();
    }catch(err){
      msg.textContent = err.message;
    }finally{
      derrubarBtn.disabled = false;
    }
  });
})();
