const db = require("./db");
const { buildXlsx } = require("./xlsx");
const etapas = require("./etapas-pedido");

function formatDateTime(ms) {
  if (!ms && ms !== 0) return "";
  const d = new Date(Number(ms));
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).formatToParts(d);
  const get = t => parts.find(p => p.type === t)?.value || "";
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;
}

function money(n) {
  const v = Number(n);
  return Number.isFinite(v) ? Number(v.toFixed(2)) : 0;
}

function safeParse(json, fallback) {
  try { return JSON.parse(json); } catch { return fallback; }
}

function paymentStatusFor(orderStatus) {
  switch (orderStatus) {
    case "pago":
    case "enviado":
    case "entregue":
      return "aprovado";
    case "cancelado":
      return "cancelado";
    default:
      return "pendente";
  }
}

const PAYMENT_METHOD_LABELS = { pix: "PIX", card: "Cartão", boleto: "Boleto" };

function cpfMascarado(cpf){
  const d = String(cpf || "").replace(/\D/g, "");
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : "";
}

function buildSheets({ resolveProductName, cpfCompleto = false } = {}) {
  const nameOf = typeof resolveProductName === "function"
    ? resolveProductName
    : (id) => `Produto #${id}`;
  const mostrarCpf = cpfCompleto ? (cpf) => cpf || "" : cpfMascarado;

  const users = db.listUsersForExport();
  const orders = db.listAllOrders();
  const messages = db.listContactMessages();

  const usuarios = {
    name: "Usuários",
    columns: [
      { header: "ID", key: "id", width: 8 },
      { header: "Nome", key: "nome", width: 28 },
      { header: "E-mail", key: "email", width: 32 },
      { header: "CPF", key: "cpf", width: 16 },
      { header: "2FA ativo", key: "twofa", width: 11 },
      { header: "Data de criação", key: "criado", width: 20 },
    ],
    rows: users.map(u => ({
      id: u.id,
      nome: u.name,
      email: u.email,
      cpf: mostrarCpf(u.cpf),
      twofa: u.has_2fa ? "Sim" : "Não",
      criado: formatDateTime(u.created_at),
    })),
  };

  const compras = {
    name: "Compras",
    columns: [
      { header: "ID", key: "id", width: 8 },
      { header: "Referência", key: "ref", width: 26 },
      { header: "Usuário ID", key: "usuario", width: 11 },
      { header: "Status", key: "status", width: 12 },
      { header: "Itens", key: "itens", width: 40 },
      { header: "Subtotal (R$)", key: "subtotal", width: 14 },
      { header: "Desconto (R$)", key: "desconto", width: 14 },
      { header: "Desconto Pix (R$)", key: "pix", width: 16 },
      { header: "Frete (R$)", key: "frete", width: 12 },
      { header: "Total (R$)", key: "total", width: 12 },
      { header: "Cupom", key: "cupom", width: 14 },
      { header: "Forma de pagamento", key: "forma", width: 18 },
      { header: "Cód. rastreio", key: "rastreio", width: 18 },
      { header: "Data da compra", key: "data", width: 20 },
    ],
    rows: orders.map(o => {
      const items = safeParse(o.items_json, []);
      const itensTxt = Array.isArray(items)
        ? items.map(it => `${nameOf(it.id)} x${it.qty}`).join("; ")
        : "";
      return {
        id: o.id,
        ref: o.external_reference,
        usuario: o.user_id ?? "",
        status: o.status,
        itens: itensTxt,
        subtotal: money(o.subtotal),
        desconto: money(o.discount),
        pix: money(o.pix_discount),
        frete: money(o.shipping_price),
        total: money(o.total),
        cupom: o.coupon_code || "",
        forma: PAYMENT_METHOD_LABELS[o.payment_method] || o.payment_method || "",
        rastreio: o.tracking_code || "",
        data: formatDateTime(o.created_at),
      };
    }),
  };

  const pagamentos = {
    name: "Pagamentos",
    columns: [
      { header: "Compra ID", key: "compra", width: 10 },
      { header: "Referência", key: "ref", width: 26 },
      { header: "Método", key: "metodo", width: 12 },
      { header: "Status pagamento", key: "status", width: 16 },
      { header: "Valor (R$)", key: "valor", width: 12 },
      { header: "ID transação (gateway)", key: "transacao", width: 26 },
      { header: "Data", key: "data", width: 20 },
    ],
    rows: orders.map(o => ({
      compra: o.id,
      ref: o.external_reference,
      metodo: PAYMENT_METHOD_LABELS[o.payment_method] || o.payment_method || "",
      status: paymentStatusFor(o.status),
      valor: money(o.total),
      transacao: o.payment_id || "",
      data: formatDateTime(o.updated_at || o.created_at),
    })),
  };

  const enderecos = {
    name: "Endereços",
    columns: [
      { header: "Compra ID", key: "compra", width: 10 },
      { header: "Referência", key: "ref", width: 26 },
      { header: "Usuário ID", key: "usuario", width: 11 },
      { header: "Destinatário", key: "nome", width: 26 },
      { header: "Telefone", key: "telefone", width: 18 },
      { header: "CPF", key: "cpf", width: 16 },
      { header: "Rua", key: "rua", width: 30 },
      { header: "Número", key: "numero", width: 10 },
      { header: "Complemento", key: "complemento", width: 18 },
      { header: "Bairro", key: "bairro", width: 20 },
      { header: "Cidade", key: "cidade", width: 20 },
      { header: "Estado", key: "estado", width: 8 },
      { header: "CEP", key: "cep", width: 12 },
    ],
    rows: orders.map(o => {
      const a = safeParse(o.address_json, {}) || {};
      return {
        compra: o.id,
        ref: o.external_reference,
        usuario: o.user_id ?? "",
        nome: a.nome || "",
        telefone: a.telefone || "",
        cpf: mostrarCpf(a.cpf),
        rua: a.rua || "",
        numero: a.numero || "",
        complemento: a.complemento || "",
        bairro: a.bairro || "",
        cidade: a.cidade || "",
        estado: a.uf || a.estado || "",
        cep: a.cep || "",
      };
    }),
  };

  const mensagens = {
    name: "Mensagens",
    columns: [
      { header: "ID", key: "id", width: 8 },
      { header: "Nome", key: "nome", width: 26 },
      { header: "Telefone", key: "telefone", width: 18 },
      { header: "Ocasião", key: "ocasiao", width: 20 },
      { header: "Mensagem", key: "mensagem", width: 50 },
      { header: "Data de envio", key: "data", width: 20 },
    ],
    rows: messages.map(m => ({
      id: m.id,
      nome: m.nome,
      telefone: m.telefone,
      ocasiao: m.ocasiao || "",
      mensagem: m.mensagem,
      data: formatDateTime(m.created_at),
    })),
  };

  return [usuarios, compras, pagamentos, enderecos, mensagens];
}

function dataCurta(texto) {
  const [ano, mes, dia] = String(texto || "").split("-");
  return dia ? `${dia}/${mes}/${ano}` : "";
}

function enderecoCompleto(a) {
  const rua = [a.rua, a.numero].filter(Boolean).join(", ");
  return [rua, a.complemento, a.bairro, [a.cidade, a.uf || a.estado].filter(Boolean).join("/")].filter(Boolean).join(" — ");
}

function pedidosNaProducao(diasDeProducao) {
  return db.listAllOrders()
    .map(o => ({ o, etapa: etapas.etapaDoPedido(o) }))
    .filter(({ etapa }) => ["aprovar", "produzir", "pronto"].includes(etapa))
    .map(({ o, etapa }) => ({ o, etapa, prazo: etapas.prazoDoPedido(o.pago_em || o.created_at, diasDeProducao) }))
    .sort((a, b) => a.prazo.data.localeCompare(b.prazo.data) || a.o.created_at - b.o.created_at);
}

const COLUNAS_DE_PRODUCAO = [
  { header: "Pedido", key: "pedido", width: 11 },
  { header: "Data", key: "data", width: 18 },
  { header: "Prazo", key: "prazo", width: 12 },
  { header: "Cliente", key: "cliente", width: 24 },
  { header: "WhatsApp", key: "whatsapp", width: 17 },
  { header: "Produto", key: "produto", width: 32 },
  { header: "Qtd", key: "qtd", width: 6 },
  { header: "Cor/variação", key: "variacao", width: 22 },
  { header: "Nome", key: "nome", width: 20 },
  { header: "Frase", key: "frase", width: 36 },
  { header: "Data na peça", key: "dataNaPeca", width: 14 },
  { header: "Letra", key: "letra", width: 12 },
  { header: "Arte", key: "arte", width: 14 },
  { header: "Estampa", key: "estampa", width: 22 },
  { header: "Nº de fotos", key: "fotos", width: 10 },
  { header: "Aprovar arte?", key: "aprovar", width: 13 },
  { header: "Entrega", key: "entrega", width: 12 },
  { header: "Etapa", key: "etapa", width: 18 },
  { header: "Observações", key: "observacoes", width: 36 },
];

function linhasDeProducao({ overridesMap, diasDeProducao } = {}) {
  const linhas = [];
  for (const { o, etapa, prazo } of pedidosNaProducao(diasDeProducao)) {
    const a = safeParse(o.address_json, {}) || {};
    const retirada = etapas.ehRetiradaDoPedido(o);
    for (const item of etapas.itensDoPedido(o)) {
      const peca = etapas.pecaDoItem(item, overridesMap);
      linhas.push({
        pedido: `#${String(o.external_reference).slice(0, 8)}`,
        data: formatDateTime(o.pago_em || o.created_at),
        prazo: dataCurta(prazo.data),
        cliente: a.nome || "",
        whatsapp: a.telefone || o.customer_phone || "",
        produto: peca.produto,
        qtd: peca.qtd,
        variacao: [peca.variacao, peca.adicionais].filter(Boolean).join(" · "),
        nome: peca.nome,
        frase: peca.frase,
        dataNaPeca: peca.data,
        letra: peca.letra,
        arte: peca.arte,
        estampa: peca.estampa,
        fotos: peca.fotos,
        aprovar: peca.aprovarArte ? (o.arte_aprovada_em ? "Aprovada" : "Sim") : "Não",
        entrega: retirada ? "Retirada" : "Envio",
        etapa: etapas.rotuloDaEtapa(etapa, retirada),
        observacoes: peca.observacoes,
      });
    }
  }
  return linhas;
}

function planilhaDeProducao(deps) {
  return buildXlsx([{ name: "Produção", columns: COLUNAS_DE_PRODUCAO, rows: linhasDeProducao(deps) }]);
}

const COLUNAS_DE_ENVIOS = [
  { header: "Pedido", key: "pedido", width: 11 },
  { header: "Destinatário", key: "nome", width: 26 },
  { header: "CPF", key: "cpf", width: 16 },
  { header: "Telefone", key: "telefone", width: 17 },
  { header: "Endereço completo", key: "endereco", width: 56 },
  { header: "CEP", key: "cep", width: 11 },
  { header: "Serviço", key: "servico", width: 24 },
  { header: "Itens", key: "itens", width: 40 },
  { header: "Valor dos produtos (R$)", key: "valor", width: 14 },
  { header: "Frete pago (R$)", key: "frete", width: 12 },
  { header: "Rastreio", key: "rastreio", width: 18 },
];

function pedidosParaPostar() {
  return db.listAllOrders()
    .filter(o => etapas.etapaDoPedido(o) === "pronto" && !etapas.ehRetiradaDoPedido(o))
    .sort((a, b) => (a.pronto_em || 0) - (b.pronto_em || 0));
}

function linhasDeEnvios() {
  return pedidosParaPostar().map(o => {
    const a = safeParse(o.address_json, {}) || {};
    const envio = safeParse(o.shipping_json, {}) || {};
    return {
      pedido: `#${String(o.external_reference).slice(0, 8)}`,
      nome: a.nome || "",
      cpf: a.cpf || "",
      telefone: a.telefone || o.customer_phone || "",
      endereco: enderecoCompleto(a),
      cep: a.cep || "",
      servico: envio.name || "",
      itens: etapas.itensDoPedido(o).map(it => `${it.qty}× ${it.nome || `Produto #${it.id}`}`).join("; "),
      valor: money(Number(o.subtotal) - Number(o.discount || 0)),
      frete: money(o.shipping_price),
      rastreio: o.tracking_code || "",
    };
  });
}

function planilhaDeEnvios() {
  return buildXlsx([{ name: "Envios", columns: COLUNAS_DE_ENVIOS, rows: linhasDeEnvios() }]);
}

function buildStoreWorkbook(deps) {
  return buildXlsx(buildSheets(deps));
}

module.exports = {
  buildStoreWorkbook, buildSheets,
  planilhaDeProducao, linhasDeProducao, COLUNAS_DE_PRODUCAO,
  planilhaDeEnvios, linhasDeEnvios, COLUNAS_DE_ENVIOS,
};
