const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");

const PORT = 39633;
const ORIGIN = `http://localhost:${PORT}`;
const ADMIN_EMAIL = "admin-producao@test.com";
const ADMIN_SEM_2FA = "admin-sem-2fa@test.com";
const hash = (email) => crypto.createHash("sha256").update(email).digest("hex");
const TMP_DB = path.join(os.tmpdir(), `arte-producao-${process.pid}-${Date.now()}.db`);

process.env.DB_PATH = TMP_DB;
const db = require("../lib/db.js");
const etapas = require("../lib/etapas-pedido.js");
const planilhas = require("../lib/export-spreadsheet.js");

let child;
let adminCookie;
let adminSem2faCookie;
let clienteCookie;

function sessao(userId){
  const token = crypto.randomBytes(32).toString("hex");
  db.createSession({ tokenHash: crypto.createHash("sha256").update(token).digest("hex"), userId, expiresAt: Date.now() + 86400000 });
  return `plc_session=${token}`;
}

const brasilia = (texto) => Date.parse(`${texto}-03:00`);

before(async () => {
  child = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server.js"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, DB_PATH: TMP_DB, PORT: String(PORT), CLIENT_ORIGIN: ORIGIN, ADMIN_2FA_REQUIRED: "true", ADMIN_EMAIL_HASHES: `${hash(ADMIN_EMAIL)},${hash(ADMIN_SEM_2FA)}`, MP_ACCESS_TOKEN: "TEST-fake", NODE_ENV: "test" },
    stdio: "ignore",
  });
  const limite = Date.now() + 15000;
  for(;;){
    try { if((await fetch(ORIGIN + "/")).ok) break; } catch {}
    if(Date.now() > limite) throw new Error("servidor de teste não subiu");
    await new Promise(r => setTimeout(r, 200));
  }
  const admin = db.createUser({ name: "Admin", email: ADMIN_EMAIL, passwordHash: "x", cpf: null });
  db.setUserTotp(admin.id, { secret: "JBSWY3DPEHPK3PXP", recoveryJson: "[]" });
  adminCookie = sessao(admin.id);
  adminSem2faCookie = sessao(db.createUser({ name: "Admin novo", email: ADMIN_SEM_2FA, passwordHash: "x", cpf: null }).id);
  clienteCookie = sessao(db.createUser({ name: "Cliente", email: "cliente-producao@test.com", passwordHash: "x", cpf: "11144477735" }).id);
});

after(() => {
  if(child) child.kill();
  for(const s of ["", "-wal", "-shm"]) { try { fs.unlinkSync(TMP_DB + s); } catch {} }
});

const COM_ARTE = {
  id: 2, qty: 2, price: 45, nome: "Caneca alça e dentro colorida",
  escolhas: { variacoes: { cor: "azul" }, adicionais: [], personalizacao: { nome: "Lara", frase: "com amor", data: "12/12/2026", letra: "cursiva", arte: "nome", fotos: [], aprovarWhatsApp: true } },
};
const SEM_APROVAR = { ...COM_ARTE, escolhas: { ...COM_ARTE.escolhas, personalizacao: { ...COM_ARTE.escolhas.personalizacao, aprovarWhatsApp: false } } };

function criarPedido({ itens = [COM_ARTE], retirada = false, status = "pago" } = {}){
  const ref = crypto.randomUUID();
  db.createOrder({
    externalReference: ref, userId: null, status,
    items: itens,
    address: { nome: "Maria Souza", telefone: "61999998888", cpf: "11144477735", rua: "SQN 210 Bloco A", numero: "101", bairro: "Asa Norte", cidade: "Brasília", uf: "DF", cep: "70862010" },
    shipping: retirada ? { service_id: "retirada", name: "Retirar na Asa Norte (grátis)", price: 0 } : { service_id: 1, name: "PAC", price: 22.5 },
    subtotal: 90, shippingPrice: retirada ? 0 : 22.5, total: retirada ? 90 : 112.5,
  });
  if(status === "pago") db.markOrderInProduction(ref);
  return ref;
}

const cabecalhos = (cookie, comOrigem = true) => ({ Cookie: cookie, "Content-Type": "application/json", ...(comOrigem ? { Origin: ORIGIN } : {}) });

async function postar(ref, acao, cookie = adminCookie, comOrigem = true){
  return fetch(`${ORIGIN}/api/admin/orders/${ref}/${acao}`, { method: "POST", headers: cabecalhos(cookie, comOrigem), body: "{}" });
}

async function pedidoNoPainel(ref){
  const dados = await (await fetch(`${ORIGIN}/api/admin/orders`, { headers: { Cookie: adminCookie } })).json();
  return dados.orders.find(o => o.reference === ref);
}

test("dias úteis: pula fim de semana, feriado nacional e carnaval", () => {
  assert.equal(etapas.somarDiasUteis(brasilia("2026-10-27T15:00:00"), 5), "2026-11-04", "terça + 5 dias úteis, com Finados (2/11) no meio");
  assert.equal(etapas.somarDiasUteis(brasilia("2026-10-30T23:30:00"), 1), "2026-11-03", "sexta à noite em Brasília conta como sexta, e segunda é feriado");
  assert.equal(etapas.somarDiasUteis(brasilia("2026-10-31T10:00:00"), 1), "2026-11-03", "pago no sábado começa a contar na segunda");
  assert.equal(etapas.somarDiasUteis(brasilia("2027-02-05T12:00:00"), 3), "2027-02-12", "segunda e terça de carnaval não contam");
  assert.equal(etapas.ehDiaUtil(Date.parse("2026-12-25T00:00:00Z")), false);
  assert.equal(etapas.ehDiaUtil(Date.parse("2026-12-24T00:00:00Z")), true);
});

test("prazo do pedido: data limite e selo de atrasado, hoje ou faltam", () => {
  const pago = brasilia("2026-10-27T15:00:00");
  const noDia = etapas.prazoDoPedido(pago, 5, brasilia("2026-11-04T08:00:00"));
  assert.deepEqual(noDia, { data: "2026-11-04", faltam: 0, atrasado: false });
  assert.equal(etapas.textoDoPrazo(noDia), "Vence hoje");
  const antes = etapas.prazoDoPedido(pago, 5, brasilia("2026-11-01T08:00:00"));
  assert.equal(etapas.textoDoPrazo(antes), "Faltam 3 dias");
  const depois = etapas.prazoDoPedido(pago, 5, brasilia("2026-11-06T20:00:00"));
  assert.equal(depois.atrasado, true);
  assert.equal(etapas.textoDoPrazo(depois), "Atrasado 2 dias");
  assert.equal(etapas.prazoDoPedido(pago, null, brasilia("2026-10-27T16:00:00")).data, "2026-11-04", "sem prazo salvo, usa 5 dias úteis");
  assert.equal(etapas.prazoDoPedido(null, 5), null);
});

test("etapas: aprovar arte só quando a cliente pediu, depois produzir, pronto, enviado e entregue", async () => {
  const ref = criarPedido();
  let pedido = await pedidoNoPainel(ref);
  assert.equal(pedido.etapa, "aprovar");
  assert.equal(pedido.aprovarArte, true);
  assert.ok(pedido.prazo?.data, "pedido pago tem data limite");
  assert.equal(pedido.items[0].peca.variacao, "Azul");
  assert.equal(pedido.items[0].peca.nome, "Lara");
  assert.equal(pedido.items[0].peca.letra, "Cursiva");

  assert.equal((await postar(ref, "arte-aprovada")).status, 200);
  assert.ok(db.getOrderByExternalReference(ref).arte_aprovada_em);
  assert.equal((await pedidoNoPainel(ref)).etapa, "produzir");

  const pronto = await postar(ref, "pronto");
  assert.equal(pronto.status, 200);
  assert.equal((await pronto.json()).etapa, "pronto");
  assert.equal(db.getOrderByExternalReference(ref).fulfillment_status, "pronto");
  assert.ok(db.getOrderByExternalReference(ref).pronto_em);

  const rastreio = await fetch(`${ORIGIN}/api/admin/orders/${ref}/tracking`, { method: "PATCH", headers: cabecalhos(adminCookie), body: JSON.stringify({ trackingCode: "AA123456789BR" }) });
  assert.equal(rastreio.status, 200);
  assert.equal((await pedidoNoPainel(ref)).etapa, "enviado");
  assert.equal((await postar(ref, "pronto")).status, 409, "pedido postado não volta para pronto");

  const entregue = await fetch(`${ORIGIN}/api/admin/orders/${ref}/delivered`, { method: "PATCH", headers: cabecalhos(adminCookie), body: "{}" });
  assert.equal(entregue.status, 200);
  assert.equal((await pedidoNoPainel(ref)).etapa, "entregue");
});

test("sem pedir aprovação a peça vai direto para produzir; retirada sai de pronto para entregue", async () => {
  const ref = criarPedido({ itens: [SEM_APROVAR], retirada: true });
  assert.equal((await pedidoNoPainel(ref)).etapa, "produzir");
  assert.equal((await postar(ref, "pronto")).status, 200);
  assert.equal((await pedidoNoPainel(ref)).etapa, "pronto");
  const retirou = await fetch(`${ORIGIN}/api/admin/orders/${ref}/delivered`, { method: "PATCH", headers: cabecalhos(adminCookie), body: "{}" });
  assert.equal(retirou.status, 200);
  assert.equal(db.getOrderByExternalReference(ref).fulfillment_status, "entregue");
});

test("pedido não pago não entra na produção", async () => {
  const ref = criarPedido({ status: "pendente" });
  assert.equal((await postar(ref, "pronto")).status, 409);
  assert.equal((await postar(ref, "arte-aprovada")).status, 409);
  assert.equal((await postar(crypto.randomUUID(), "pronto")).status, 404);
  assert.equal((await pedidoNoPainel(ref)).etapa, null);
});

test("rotas novas exigem admin, verificação em duas etapas e origem do próprio site", async () => {
  const ref = criarPedido();
  for(const acao of ["arte-aprovada", "pronto"]){
    assert.equal((await fetch(`${ORIGIN}/api/admin/orders/${ref}/${acao}`, { method: "POST", headers: { Origin: ORIGIN, "Content-Type": "application/json" }, body: "{}" })).status, 401, `${acao} sem login`);
    assert.equal((await postar(ref, acao, clienteCookie)).status, 403, `${acao} de cliente`);
    const sem2fa = await postar(ref, acao, adminSem2faCookie);
    assert.equal(sem2fa.status, 403, `${acao} de admin sem 2FA`);
    assert.equal((await sem2fa.json()).needsTwoFactorSetup, true);
    assert.equal((await postar(ref, acao, adminCookie, false)).status, 403, `${acao} sem origem`);
    const forasteira = await fetch(`${ORIGIN}/api/admin/orders/${ref}/${acao}`, { method: "POST", headers: { ...cabecalhos(adminCookie), Origin: "https://golpe.example" }, body: "{}" });
    assert.equal(forasteira.status, 403, `${acao} de outro site`);
  }
  assert.equal(db.getOrderByExternalReference(ref).arte_aprovada_em, null, "nada mudou");
  for(const planilha of ["planilha-producao", "planilha-envios"]){
    assert.equal((await fetch(`${ORIGIN}/api/admin/${planilha}.xlsx`)).status, 401);
    assert.equal((await fetch(`${ORIGIN}/api/admin/${planilha}.xlsx`, { headers: { Cookie: clienteCookie } })).status, 403);
    assert.equal((await fetch(`${ORIGIN}/api/admin/${planilha}.xlsx`, { headers: { Cookie: adminSem2faCookie } })).status, 403);
  }
});

test("planilha de produção: uma linha por peça com as colunas certas", async () => {
  const ref = criarPedido({ itens: [COM_ARTE, { ...SEM_APROVAR, qty: 1 }] });
  assert.deepEqual(planilhas.COLUNAS_DE_PRODUCAO.map(c => c.header), [
    "Pedido", "Data", "Prazo", "Cliente", "WhatsApp", "Produto", "Qtd", "Cor/variação", "Nome", "Frase",
    "Data na peça", "Letra", "Arte", "Nº de fotos", "Aprovar arte?", "Entrega", "Etapa", "Observações",
  ]);
  const linhas = planilhas.linhasDeProducao({ overridesMap: new Map(), diasDeProducao: 5 }).filter(l => l.pedido === `#${ref.slice(0, 8)}`);
  assert.equal(linhas.length, 2, "duas peças, duas linhas");
  assert.equal(linhas[0].cliente, "Maria Souza");
  assert.equal(linhas[0].whatsapp, "61999998888");
  assert.equal(linhas[0].qtd, 2);
  assert.equal(linhas[0].variacao, "Azul");
  assert.equal(linhas[0].frase, "com amor");
  assert.equal(linhas[0].dataNaPeca, "12/12/2026");
  assert.equal(linhas[0].aprovar, "Sim");
  assert.equal(linhas[1].aprovar, "Não");
  assert.equal(linhas[0].entrega, "Envio");
  assert.equal(linhas[0].etapa, "Aprovar arte");
  assert.match(linhas[0].prazo, /^\d{2}\/\d{2}\/\d{4}$/);

  const res = await fetch(`${ORIGIN}/api/admin/planilha-producao.xlsx`, { headers: { Cookie: adminCookie } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /spreadsheetml/);
  assert.match(res.headers.get("content-disposition"), /filename="producao-\d{4}-\d{2}-\d{2}\.xlsx"/);
  assert.equal(Buffer.from(await res.arrayBuffer()).subarray(0, 4).toString("hex"), "504b0304");
});

test("planilha de envios: só pedidos prontos para postar, com endereço completo", async () => {
  const paraPostar = criarPedido({ itens: [SEM_APROVAR] });
  const retirada = criarPedido({ itens: [SEM_APROVAR], retirada: true });
  const produzindo = criarPedido({ itens: [SEM_APROVAR] });
  db.marcarPronto(paraPostar);
  db.marcarPronto(retirada);
  assert.deepEqual(planilhas.COLUNAS_DE_ENVIOS.map(c => c.header), [
    "Pedido", "Destinatário", "CPF", "Telefone", "Endereço completo", "CEP", "Serviço", "Itens",
    "Valor dos produtos (R$)", "Frete pago (R$)", "Rastreio",
  ]);
  const linhas = planilhas.linhasDeEnvios();
  const pedidosNaLista = linhas.map(l => l.pedido);
  assert.ok(pedidosNaLista.includes(`#${paraPostar.slice(0, 8)}`));
  assert.ok(!pedidosNaLista.includes(`#${retirada.slice(0, 8)}`), "retirada não vai para os Correios");
  assert.ok(!pedidosNaLista.includes(`#${produzindo.slice(0, 8)}`), "o que ainda está em produção fica fora");
  const linha = linhas.find(l => l.pedido === `#${paraPostar.slice(0, 8)}`);
  assert.equal(linha.endereco, "SQN 210 Bloco A, 101 — Asa Norte — Brasília/DF");
  assert.equal(linha.cep, "70862010");
  assert.equal(linha.cpf, "11144477735");
  assert.equal(linha.servico, "PAC");
  assert.equal(linha.valor, 90);
  assert.equal(linha.frete, 22.5);

  const res = await fetch(`${ORIGIN}/api/admin/planilha-envios.xlsx`, { headers: { Cookie: adminCookie } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-disposition"), /filename="envios-/);
});

test("o backup completo continua com as mesmas abas", async () => {
  const res = await fetch(`${ORIGIN}/api/admin/export.xlsx`, { headers: { Cookie: adminCookie } });
  assert.equal(res.status, 200);
  assert.deepEqual(planilhas.buildSheets().map(s => s.name), ["Usuários", "Compras", "Pagamentos", "Endereços", "Mensagens"]);
});
