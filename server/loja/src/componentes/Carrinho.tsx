import { useEffect, useRef, useState } from "react";
import { dinheiro, linkWhatsApp, parcelas, precos } from "../compartilhado";
import { carrinho, subtotal, totalDeItens, useCarrinho, type LinhaCarrinho } from "../estado/carrinho";
import { useSessao } from "../estado/sessao";
import { urlDaFotoEnviada } from "../estado/fotos";
import type { Loja } from "../tipos";
import { cotarFrete, mascararCep, type OpcaoDeFrete } from "./CalculoDeFrete";
import { Foto } from "./Foto";
import { Icone } from "./Icone";
import { PecaSvg } from "./Previa";

const CHAVE_ENDERECO = "plc_endereco_digitado";
const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

interface Endereco {
  nome: string;
  telefone: string;
  cpf: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

const ENDERECO_VAZIO: Endereco = { nome: "", telefone: "", cpf: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" };

function mascararTelefone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  const resto = d.slice(2);
  const corte = d.length <= 10 ? 4 : 5;
  return `(${d.slice(0, 2)}) ${resto.length <= corte ? resto : `${resto.slice(0, corte)}-${resto.slice(corte)}`}`;
}

function mascararCpf(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
  return d;
}

function cpfValido(v: string): boolean {
  const d = v.replace(/\D/g, "");
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
  const numeros = d.split("").map(Number);
  const digito = (base: number[]) => {
    const soma = base.reduce((s, n, i) => s + n * (base.length + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(numeros.slice(0, 9)) === numeros[9] && digito(numeros.slice(0, 10)) === numeros[10];
}

const REGRAS_ENDERECO: { campo: keyof Endereco; rotulo: string; validar: (v: string) => string | null }[] = [
  { campo: "nome", rotulo: "Nome", validar: v => (!v.trim() ? "Digite o nome completo" : v.trim().length < 3 ? "Nome muito curto" : null) },
  { campo: "telefone", rotulo: "Telefone", validar: v => (![10, 11].includes(v.replace(/\D/g, "").length) ? "Telefone com DDD" : null) },
  { campo: "cpf", rotulo: "CPF", validar: v => (!cpfValido(v) ? "CPF inválido. Confira os números." : null) },
  { campo: "rua", rotulo: "Rua", validar: v => (v.trim() ? null : "Digite a rua") },
  { campo: "numero", rotulo: "Número", validar: v => (v.trim() ? null : "Digite o número") },
  { campo: "bairro", rotulo: "Bairro", validar: v => (v.trim() ? null : "Digite o bairro") },
  { campo: "cidade", rotulo: "Cidade", validar: v => (v.trim() ? null : "Digite a cidade") },
  { campo: "uf", rotulo: "Estado", validar: v => (v ? null : "Escolha o estado") },
];

function errosDoEndereco(e: Endereco): Partial<Record<keyof Endereco, string>> {
  const saida: Partial<Record<keyof Endereco, string>> = {};
  for (const r of REGRAS_ENDERECO) {
    const erro = r.validar(e[r.campo]);
    if (erro) saida[r.campo] = erro;
  }
  return saida;
}

function MiniaturaDaLinha({ linha }: { linha: LinhaCarrinho }) {
  if (linha.config?.personalizacao?.ativa && linha.config.molde !== "nenhum") {
    return (
      <svg viewBox="0 0 360 380" className="linha-miniatura" role="img" aria-label={`Prévia de ${linha.nome}`}>
        <PecaSvg config={linha.config} escolhas={linha.escolhas} lado="frente" aquecida urlDaFoto={urlDaFotoEnviada} medir={false} exemplos={false} />
      </svg>
    );
  }
  return linha.foto ? <Foto src={linha.foto} alt="" larguras={[160]} sizes="72px" largura={72} altura={72} className="linha-miniatura" /> : <span className="linha-miniatura" />;
}

function LinhaDoCarrinho({ linha }: { linha: LinhaCarrinho }) {
  const [aberto, setAberto] = useState(false);
  const detalhes = linha.resumo.filter(r => r.rotulo !== "Aprovar a arte pelo WhatsApp");
  return (
    <li className={`linha${linha.erro ? " com-erro" : ""}`}>
      <a href={linha.endereco} className="linha-foto" tabIndex={-1} aria-hidden="true"><MiniaturaDaLinha linha={linha} /></a>
      <div className="linha-corpo">
        <div className="linha-topo">
          <a href={linha.endereco} className="linha-nome">{linha.nome}</a>
          <strong className="linha-preco">{dinheiro(linha.preco * linha.qty)}</strong>
        </div>
        {detalhes.length ? (
          <div className="linha-detalhes">
            <p className={aberto ? undefined : "resumido"}>{detalhes.map(d => `${d.rotulo}: ${d.valor}`).join(" · ")}</p>
            {detalhes.length > 2 ? <button type="button" className="link-botao" onClick={() => setAberto(!aberto)} aria-expanded={aberto}>{aberto ? "ver menos" : "ver tudo"}</button> : null}
          </div>
        ) : null}
        {linha.erro ? <p className="linha-erro" role="alert">{linha.erro}</p> : null}
        <div className="linha-controles">
          <div className="quantidade quantidade-pequena" role="group" aria-label={`Quantidade de ${linha.nome}`}>
            <button type="button" onClick={() => (linha.qty <= (linha.qtdMinima || 1) ? carrinho.remover(linha.chave) : carrinho.quantidade(linha.chave, linha.qty - 1))} aria-label={linha.qty <= (linha.qtdMinima || 1) ? `Tirar ${linha.nome}` : "Diminuir"}><Icone nome="menos" tamanho={18} /></button>
            <span>{linha.qty}</span>
            <button type="button" onClick={() => carrinho.quantidade(linha.chave, linha.qty + 1)} aria-label="Aumentar"><Icone nome="mais" tamanho={18} /></button>
          </div>
          <a href={linha.endereco} className="link-botao">Editar</a>
          <button type="button" className="link-botao" onClick={() => carrinho.remover(linha.chave)}>Remover</button>
        </div>
      </div>
    </li>
  );
}

export function Carrinho({ loja }: { loja: Loja }) {
  const { linhas, aberto } = useCarrinho();
  const { usuario, conferida } = useSessao();
  const dialogo = useRef<HTMLDialogElement>(null);
  const [passo, setPasso] = useState<1 | 2>(1);
  const [cep, setCep] = useState("");
  const [opcoes, setOpcoes] = useState<OpcaoDeFrete[]>([]);
  const [frete, setFrete] = useState<OpcaoDeFrete | null>(null);
  const [freteMsg, setFreteMsg] = useState("");
  const [calculando, setCalculando] = useState(false);
  const [cupomAberto, setCupomAberto] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [cupom, setCupom] = useState<{ code: string; percentOff: number } | null>(null);
  const [cupomMsg, setCupomMsg] = useState("");
  const [endereco, setEndereco] = useState<Endereco>(ENDERECO_VAZIO);
  const [guardar, setGuardar] = useState(true);
  const [tentou, setTentou] = useState(false);
  const [pagamento, setPagamento] = useState<"pix" | "card">("pix");
  const [enviando, setEnviando] = useState(false);
  const [erroGeral, setErroGeral] = useState("");
  const assinaturaConferida = useRef("");

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("carrinho") === "1") {
      try {
        const salvo = JSON.parse(sessionStorage.getItem(CHAVE_ENDERECO) || "null");
        if (salvo) {
          setEndereco(e => ({ ...e, ...salvo }));
          if (salvo.cep) setCep(mascararCep(salvo.cep));
        }
        sessionStorage.removeItem(CHAVE_ENDERECO);
      } catch {
        setEndereco(e => e);
      }
      params.delete("carrinho");
      history.replaceState(null, "", window.location.pathname + (params.toString() ? `?${params}` : ""));
      carrinho.abrir();
    }
    const recuperar = params.get("recuperar");
    if (recuperar) recuperarCarrinho(recuperar);
  }, []);

  useEffect(() => {
    if (!usuario) return;
    setEndereco(e => ({ ...e, nome: e.nome || usuario.nome, cpf: e.cpf || (usuario.cpf ? mascararCpf(usuario.cpf) : "") }));
    if (usuario.cep) setCep(c => c || mascararCep(usuario.cep || ""));
    fetch("/api/auth/address").then(r => (r.ok ? r.json() : null)).then(dados => {
      const a = dados?.address;
      if (!a) return;
      setEndereco(e => ({
        nome: e.nome || a.nome || "", telefone: e.telefone || mascararTelefone(a.telefone || ""), cpf: e.cpf || mascararCpf(a.cpf || ""),
        rua: e.rua || a.rua || "", numero: e.numero || a.numero || "", complemento: e.complemento || a.complemento || "",
        bairro: e.bairro || a.bairro || "", cidade: e.cidade || a.cidade || "", uf: e.uf || a.uf || "",
      }));
      if (a.cep) setCep(c => c || mascararCep(a.cep));
    }).catch(() => setEndereco(e => e));
  }, [usuario]);

  const assinatura = linhas.map(l => `${l.chave}x${l.qty}`).join("|");
  useEffect(() => {
    setFrete(null);
    setOpcoes([]);
    setPasso(1);
  }, [assinatura]);

  useEffect(() => {
    if (!aberto || !linhas.length || assinaturaConferida.current === assinatura) return;
    assinaturaConferida.current = assinatura;
    fetch("/api/carrinho/conferir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: linhas.map(l => ({ id: l.id, qty: l.qty, escolhas: l.escolhas })) }),
    }).then(r => (r.ok ? r.json() : null)).then(dados => {
      if (!dados?.itens) return;
      const atualizadas = carrinho.ler().linhas.map((l, i) => {
        const r = dados.itens[i];
        if (!r || l.chave !== linhas[i]?.chave) return l;
        return { ...l, preco: r.preco ?? l.preco, resumo: r.resumo ?? l.resumo, erro: r.erro || undefined };
      });
      carrinho.atualizar(atualizadas);
    }).catch(() => { assinaturaConferida.current = ""; });
  }, [assinatura, aberto]);

  async function recuperarCarrinho(referencia: string) {
    try {
      const [esquecido, catalogo] = await Promise.all([
        fetch(`/api/carrinho-esquecido/${encodeURIComponent(referencia)}`).then(r => (r.ok ? r.json() : null)),
        fetch("/api/products").then(r => (r.ok ? r.json() : null)),
      ]);
      const produtos = new Map<number, { id: number; name: string; price: number; photos: string[]; slug: string; soldOut: boolean; config: LinhaCarrinho["config"] }>((catalogo?.products || []).map((p: { id: number }) => [p.id, p]));
      for (const item of esquecido?.items || []) {
        const p = produtos.get(Number(item.id));
        if (!p || p.soldOut) continue;
        const escolhas = item.escolhas || { variacoes: Object.fromEntries(p.config.variacoes.map(g => [g.id, (g.opcoes.find(o => !o.esgotado) || g.opcoes[0]).id])), adicionais: [], personalizacao: {} };
        carrinho.adicionar({ id: p.id, qty: Number(item.qty) || 1, escolhas, nome: p.name, endereco: p.slug, preco: item.price || p.price, foto: p.photos[0] || null, molde: p.config.molde, corPeca: p.config.corPeca, corAlca: p.config.corAlca, resumo: item.resumo || [], qtdMinima: p.config.qtdMinima || 1, config: p.config });
      }
    } catch {
      setErroGeral("Não deu para recuperar o carrinho. Monte de novo pelo site.");
    }
  }

  const sub = subtotal(linhas);
  const desconto = cupom ? Math.round(sub * cupom.percentOff) / 100 : 0;
  const depoisDoCupom = precos.round2(sub - desconto);
  const descontoPix = passo === 2 && pagamento === "pix" ? precos.pixDiscountFor(depoisDoCupom) : 0;
  const valorFrete = frete ? frete.price : 0;
  const total = precos.round2(depoisDoCupom - descontoPix + valorFrete);
  const soDados = Boolean(frete?.retirada);
  const errosCompletos = errosDoEndereco(endereco);
  const erros = soDados ? Object.fromEntries(Object.entries(errosCompletos).filter(([campo]) => ["nome", "telefone", "cpf"].includes(campo))) as typeof errosCompletos : errosCompletos;
  const enderecoOk = Object.keys(erros).length === 0;
  const temErroNasLinhas = linhas.some(l => l.erro);

  async function calcular() {
    if (cep.replace(/\D/g, "").length !== 8) { setFreteMsg("Digite o CEP com 8 números."); return; }
    setCalculando(true);
    setFreteMsg("Calculando…");
    setFrete(null);
    try {
      const { opcoes: lista, aviso } = await cotarFrete(cep, linhas.map(l => ({ id: l.id, qty: l.qty })));
      setOpcoes(lista);
      setFreteMsg(aviso || (lista.length ? "Escolha a entrega:" : "Nenhuma opção de entrega para esse CEP."));
      if (lista.length) preencherPeloCep(cep);
    } catch (e) {
      setOpcoes([]);
      setFreteMsg(e instanceof Error ? e.message : "Não deu para calcular agora.");
    } finally {
      setCalculando(false);
    }
  }

  async function preencherPeloCep(valor: string) {
    try {
      const dados = await fetch(`https://viacep.com.br/ws/${valor.replace(/\D/g, "")}/json/`).then(r => r.json());
      if (dados.erro) return;
      setEndereco(e => ({ ...e, rua: e.rua || dados.logradouro || "", bairro: e.bairro || dados.bairro || "", cidade: e.cidade || dados.localidade || "", uf: e.uf || dados.uf || "" }));
    } catch {
      setEndereco(e => e);
    }
  }

  async function aplicarCupom() {
    const limpo = codigo.trim();
    if (!limpo) { setCupom(null); setCupomMsg(""); return; }
    setCupomMsg("Conferindo…");
    try {
      const r = await fetch("/api/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: limpo, items: linhas.map(l => ({ id: l.id, qty: l.qty, escolhas: l.escolhas })) }),
      });
      const dados = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(dados.error || "Cupom inválido.");
      setCupom({ code: dados.code, percentOff: dados.percentOff });
      setCupomMsg(`Cupom ${dados.code} aplicado: ${dados.percentOff}% de desconto.`);
    } catch (e) {
      setCupom(null);
      setCupomMsg(e instanceof Error ? e.message : "Cupom inválido.");
    }
  }

  async function finalizar() {
    setTentou(true);
    setErroGeral("");
    if (!frete) { setPasso(1); setFreteMsg("Calcule o frete para continuar."); return; }
    if (!enderecoOk) {
      const primeiro = REGRAS_ENDERECO.find(r => erros[r.campo]);
      if (primeiro) document.getElementById(`end-${primeiro.campo}`)?.focus();
      return;
    }
    if (!usuario) {
      try { sessionStorage.setItem(CHAVE_ENDERECO, JSON.stringify({ ...endereco, cep })); } catch { setErroGeral(""); }
      window.location.href = "/conta.html?retorno=carrinho";
      return;
    }
    setEnviando(true);
    try {
      const resposta = await fetch(pagamento === "pix" ? "/api/create-pix-payment" : "/api/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: linhas.map(l => ({ id: l.id, qty: l.qty, escolhas: l.escolhas })),
          cep: cep.replace(/\D/g, ""),
          shipping_service_id: frete.service_id,
          address: { ...endereco, cpf: endereco.cpf.replace(/\D/g, "") },
          saveAddress: guardar,
          coupon: cupom?.code,
          paymentMethod: pagamento,
        }),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(dados.error || `Erro inesperado (${resposta.status}).`);
      if (pagamento === "pix") {
        if (!dados.qrCode) throw new Error("O Pix não foi gerado. Tente de novo.");
        sessionStorage.setItem("plc_pix_pendente", JSON.stringify(dados));
        window.location.href = "/pagamento-pix.html";
        return;
      }
      if (!dados.init_point) throw new Error("O link de pagamento não veio. Tente de novo.");
      window.location.href = dados.init_point;
    } catch (e) {
      setErroGeral(e instanceof Error ? e.message : "Não deu para abrir o pagamento agora.");
      setEnviando(false);
    }
  }

  function campoDeEndereco(campo: keyof Endereco, rotulo: string, extra: Record<string, string> = {}, mascara?: (v: string) => string) {
    const erro = tentou ? erros[campo] : undefined;
    return (
      <div className={`campo campo-endereco campo-${campo}`}>
        <label htmlFor={`end-${campo}`}>{rotulo}</label>
        <input id={`end-${campo}`} value={endereco[campo]} aria-invalid={Boolean(erro)} aria-describedby={erro ? `end-${campo}-erro` : undefined}
          onChange={e => setEndereco({ ...endereco, [campo]: mascara ? mascara(e.target.value) : e.target.value })} {...extra} />
        {erro ? <span id={`end-${campo}-erro`} className="erro-campo">{erro}</span> : null}
      </div>
    );
  }

  const itens = totalDeItens(linhas);

  return (
    <dialog ref={dialogo} className="gaveta gaveta-direita carrinho" aria-labelledby="carrinho-titulo" onClose={() => carrinho.fechar()} onClick={e => { if (e.target === dialogo.current) carrinho.fechar(); }}>
      <div className="carrinho-conteudo">
        <div className="carrinho-topo">
          {passo === 2 ? <button type="button" className="botao-icone" onClick={() => setPasso(1)} aria-label="Voltar para os itens"><Icone nome="setaEsquerda" /></button> : null}
          <h2 id="carrinho-titulo">{passo === 1 ? `Seu carrinho${itens ? ` (${itens})` : ""}` : "Entrega e pagamento"}</h2>
          <button type="button" className="botao-icone" onClick={() => carrinho.fechar()} aria-label="Fechar o carrinho"><Icone nome="fechar" /></button>
        </div>

        {!linhas.length ? (
          <div className="carrinho-vazio">
            <Icone nome="sacola" tamanho={40} traco={1.4} />
            <p>Seu carrinho está vazio.</p>
            <a className="botao botao-cheio" href="/categoria/canecas" onClick={() => carrinho.fechar()}>Ver as canecas</a>
          </div>
        ) : passo === 1 ? (
          <div className="carrinho-rolagem">
            <ul className="linhas">{linhas.map(l => <LinhaDoCarrinho key={l.chave} linha={l} />)}</ul>
            {itens > 10 ? <p className="aviso-quantidade">Mais de 10 unidades? <a href={linkWhatsApp(loja.whatsapp, "Olá! Quero fazer um pedido com mais de 10 unidades.")} target="_blank" rel="noopener noreferrer">Fale com a {loja.responsavel}</a> sobre condições especiais.</p> : null}

            <section className="carrinho-secao" aria-labelledby="entrega-titulo">
              <h3 id="entrega-titulo">Entrega</h3>
              <div className="frete-linha">
                <label htmlFor="cep-carrinho" className="visualmente-oculto">CEP</label>
                <input id="cep-carrinho" inputMode="numeric" autoComplete="postal-code" placeholder="Seu CEP" value={cep} onChange={e => setCep(mascararCep(e.target.value))} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); calcular(); } }} />
                <button type="button" className="botao botao-escuro" onClick={calcular} disabled={calculando}>{calculando ? "…" : "Calcular"}</button>
              </div>
              <p className="dica" aria-live="polite">{freteMsg}</p>
              {opcoes.length ? (
                <div className="opcoes-entrega" role="radiogroup" aria-label="Opções de entrega">
                  {opcoes.map(o => (
                    <label key={String(o.service_id)} className={`opcao-entrega${frete?.service_id === o.service_id ? " escolhida" : ""}`}>
                      <input type="radio" name="frete" checked={frete?.service_id === o.service_id} onChange={() => setFrete(o)} />
                      <span><strong>{o.name}</strong><small>{o.delivery_time}{loja.prazoProducao && !o.retirada ? ` · + ${loja.prazoProducao} dias úteis de produção` : ""}</small></span>
                      <strong>{o.price > 0 ? dinheiro(o.price) : "Grátis"}</strong>
                    </label>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="carrinho-secao">
              <button type="button" className="link-botao" aria-expanded={cupomAberto} onClick={() => setCupomAberto(!cupomAberto)}>Tenho um cupom de desconto</button>
              {cupomAberto ? (
                <div className="frete-linha">
                  <label htmlFor="cupom" className="visualmente-oculto">Código do cupom</label>
                  <input id="cupom" value={codigo} maxLength={30} placeholder="Código do cupom" autoComplete="off" onChange={e => setCodigo(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); aplicarCupom(); } }} />
                  <button type="button" className="botao botao-escuro" onClick={aplicarCupom}>Aplicar</button>
                </div>
              ) : null}
              {cupomMsg ? <p className={cupom ? "dica dica-ok" : "dica"} aria-live="polite">{cupomMsg}</p> : null}
            </section>
          </div>
        ) : (
          <div className="carrinho-rolagem">
            {frete ? (
              <p className="entrega-escolhida"><Icone nome={frete.retirada ? "local" : "caminhao"} tamanho={20} /><span><strong>{frete.name}</strong><small>{frete.delivery_time}</small></span><strong>{frete.price > 0 ? dinheiro(frete.price) : "Grátis"}</strong></p>
            ) : null}
            <section className="carrinho-secao" aria-labelledby="endereco-titulo">
              <h3 id="endereco-titulo">{frete?.retirada ? "Seus dados" : "Endereço de entrega"}</h3>
              <div className="grade-endereco">
                {campoDeEndereco("nome", "Nome completo", { autoComplete: "name" })}
                {campoDeEndereco("telefone", "WhatsApp", { autoComplete: "tel", inputMode: "tel", placeholder: "(61) 90000-0000" }, mascararTelefone)}
                {campoDeEndereco("cpf", "CPF", { inputMode: "numeric", placeholder: "000.000.000-00" }, mascararCpf)}
                {soDados ? null : <>
                <div className="campo campo-endereco campo-cep"><label htmlFor="end-cep">CEP</label><input id="end-cep" value={cep} readOnly aria-readonly="true" /></div>
                {campoDeEndereco("rua", "Rua", { autoComplete: "address-line1" })}
                {campoDeEndereco("numero", "Número")}
                {campoDeEndereco("complemento", "Complemento", { autoComplete: "address-line2", placeholder: "Apto, bloco, casa" })}
                {campoDeEndereco("bairro", "Bairro")}
                {campoDeEndereco("cidade", "Cidade", { autoComplete: "address-level2" })}
                <div className="campo campo-endereco campo-uf">
                  <label htmlFor="end-uf">Estado</label>
                  <select id="end-uf" value={endereco.uf} aria-invalid={Boolean(tentou && erros.uf)} onChange={e => setEndereco({ ...endereco, uf: e.target.value })} autoComplete="address-level1">
                    <option value="">UF</option>
                    {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                  {tentou && erros.uf ? <span className="erro-campo">{erros.uf}</span> : null}
                </div>
                </>}
              </div>
              {usuario && !soDados ? (
                <label className="marcar"><input type="checkbox" checked={guardar} onChange={e => setGuardar(e.target.checked)} /><span>Guardar este endereço na minha conta</span></label>
              ) : null}
            </section>
            <section className="carrinho-secao" aria-labelledby="pagamento-titulo">
              <h3 id="pagamento-titulo">Pagamento</h3>
              <div className="formas-pagamento" role="radiogroup" aria-labelledby="pagamento-titulo">
                <label className={`opcao-entrega${pagamento === "pix" ? " escolhida" : ""}`}>
                  <input type="radio" name="pagamento" checked={pagamento === "pix"} onChange={() => setPagamento("pix")} />
                  <span><strong>Pix</strong><small>{loja.regrasPagamento.pixDiscountPercent}% de desconto · QR Code aqui mesmo</small></span>
                </label>
                <label className={`opcao-entrega${pagamento === "card" ? " escolhida" : ""}`}>
                  <input type="radio" name="pagamento" checked={pagamento === "card"} onChange={() => setPagamento("card")} />
                  <span><strong>Cartão ou boleto</strong><small>até {loja.regrasPagamento.interestFreeInstallments}x sem juros, pelo Mercado Pago</small></span>
                </label>
              </div>
            </section>
            {!usuario && conferida ? <p className="aviso-quantidade"><Icone nome="pessoa" tamanho={18} /> Para finalizar, entre na sua conta ou crie uma em 1 minuto. Seu carrinho e o endereço ficam guardados.</p> : null}
          </div>
        )}

        {linhas.length ? (
          <div className="carrinho-rodape">
            <dl className="totais">
              <div><dt>Subtotal</dt><dd>{dinheiro(sub)}</dd></div>
              {desconto > 0 ? <div className="desconto"><dt>Cupom {cupom?.code}</dt><dd>-{dinheiro(desconto)}</dd></div> : null}
              {passo === 2 && descontoPix > 0 ? <div className="desconto"><dt>Desconto Pix ({loja.regrasPagamento.pixDiscountPercent}%)</dt><dd>-{dinheiro(descontoPix)}</dd></div> : null}
              {frete ? <div><dt>Entrega</dt><dd>{frete.price > 0 ? dinheiro(frete.price) : "Grátis"}</dd></div> : null}
              <div className="total"><dt>Total</dt><dd>{dinheiro(total)}</dd></div>
            </dl>
            {passo === 1 ? <p className="dica">ou {dinheiro(precos.pixPriceFor(depoisDoCupom) + valorFrete)} no Pix · {parcelas(depoisDoCupom + valorFrete)}</p> : null}
            {erroGeral ? <p className="mensagem-erro" role="alert">{erroGeral} <a href={linkWhatsApp(loja.whatsapp)} target="_blank" rel="noopener noreferrer">Finalizar pelo WhatsApp</a></p> : null}
            {temErroNasLinhas ? <p className="mensagem-erro" role="alert">Ajuste o item marcado acima para continuar.</p> : null}
            {passo === 1 ? (
              <button type="button" className="botao botao-cheio botao-bloco botao-grande" disabled={temErroNasLinhas} onClick={() => { if (!frete) { setFreteMsg("Calcule o frete e escolha a entrega para continuar."); document.getElementById("cep-carrinho")?.focus(); return; } setPasso(2); }}>
                {frete ? "Continuar" : <><Icone nome="caminhao" tamanho={20} />Calcule o frete para continuar</>}
              </button>
            ) : (
              <button type="button" className="botao botao-cheio botao-bloco botao-grande" onClick={finalizar} disabled={enviando}>
                <Icone nome={usuario ? "cadeado" : "pessoa"} tamanho={20} />{enviando ? "Abrindo o pagamento…" : usuario ? `Ir para o pagamento · ${dinheiro(total)}` : "Entrar para finalizar"}
              </button>
            )}
            {passo === 2 && tentou && !enderecoOk ? <p className="dica erro-campo">Falta preencher: {REGRAS_ENDERECO.filter(r => erros[r.campo]).map(r => r.rotulo).join(", ")}.</p> : null}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
