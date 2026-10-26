import { useState, type FormEvent } from "react";
import { dinheiro } from "../compartilhado";
import type { Escolhas } from "../tipos";

export interface OpcaoDeFrete {
  service_id: string | number;
  name: string;
  price: number;
  delivery_time: string;
  retirada?: boolean;
}

export function mascararCep(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export async function cotarFrete(cep: string, itens: { id: number; qty: number; escolhas?: Escolhas }[]): Promise<{ opcoes: OpcaoDeFrete[]; aviso: string | null }> {
  let resposta: Response;
  try {
    resposta = await fetch("/api/calculate-shipping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cep: cep.replace(/\D/g, ""), items: itens.map(i => ({ id: i.id, qty: i.qty })) }),
    });
  } catch {
    throw new Error("Sem conexão para calcular o frete agora.");
  }
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.error || "Não deu para calcular o frete agora.");
  return { opcoes: dados.options || [], aviso: dados.warning || null };
}

export function CalculoDeFrete({ itens, retirada }: { itens: { id: number; qty: number }[]; retirada: boolean }) {
  const [cep, setCep] = useState("");
  const [estado, setEstado] = useState<"parado" | "calculando" | "pronto" | "erro">("parado");
  const [opcoes, setOpcoes] = useState<OpcaoDeFrete[]>([]);
  const [mensagem, setMensagem] = useState("");

  async function calcular(evento: FormEvent) {
    evento.preventDefault();
    if (cep.replace(/\D/g, "").length !== 8) { setEstado("erro"); setMensagem("Digite o CEP com 8 números."); return; }
    setEstado("calculando");
    setMensagem("");
    try {
      const { opcoes: lista, aviso } = await cotarFrete(cep, itens);
      setOpcoes(lista);
      setMensagem(aviso || (lista.length ? "" : "Nenhuma opção de entrega para esse CEP."));
      setEstado("pronto");
    } catch (e) {
      setEstado("erro");
      setMensagem(e instanceof Error ? e.message : "Não deu para calcular o frete agora.");
    }
  }

  return (
    <form className="frete" onSubmit={calcular}>
      <label htmlFor="cep-produto">Calcular frete e prazo</label>
      <div className="frete-linha">
        <input id="cep-produto" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={cep} onChange={e => setCep(mascararCep(e.target.value))} aria-describedby="frete-ajuda" />
        <button type="submit" className="botao botao-escuro" disabled={estado === "calculando"}>{estado === "calculando" ? "Calculando…" : "Calcular"}</button>
      </div>
      <p id="frete-ajuda" className="dica">Correios e transportadoras pelo Melhor Envio{retirada ? " · retirada grátis na Asa Norte" : ""}</p>
      <div aria-live="polite">
        {mensagem ? <p className={estado === "erro" ? "mensagem-erro" : "dica"}>{mensagem}</p> : null}
        {estado === "pronto" && opcoes.length ? (
          <ul className="opcoes-frete">
            {opcoes.map(o => (
              <li key={String(o.service_id)}>
                <span><strong>{o.name}</strong><small>{o.delivery_time}</small></span>
                <strong>{o.price > 0 ? dinheiro(o.price) : "Grátis"}</strong>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </form>
  );
}
