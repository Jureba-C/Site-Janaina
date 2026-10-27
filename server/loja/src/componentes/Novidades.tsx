import { useState, type FormEvent } from "react";

export function Novidades() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"parado" | "enviando" | "ok" | "erro">("parado");
  const [mensagem, setMensagem] = useState("");

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setEstado("enviando");
    try {
      const resposta = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(dados.error || "Não deu para cadastrar agora.");
      setEstado("ok");
      setMensagem(dados.coupon
        ? `Pronto! Use o cupom ${dados.coupon} (${dados.percentOff}% na primeira compra). ${dados.emailed ? "Mandamos para o seu e-mail também." : ""}`
        : "Pronto! Você vai receber as novidades por e-mail.");
    } catch (e) {
      setEstado("erro");
      setMensagem(e instanceof Error ? e.message : "Não deu para cadastrar agora.");
    }
  }

  return (
    <form className="novidades" onSubmit={enviar}>
      <label htmlFor="novidades-email"><strong>Novidades e um mimo na primeira compra</strong><span>Coleções novas e datas especiais, sem encher sua caixa de entrada.</span></label>
      <div className="novidades-linha">
        <input id="novidades-email" type="email" required autoComplete="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} disabled={estado === "ok"} />
        <button type="submit" className="botao botao-cheio" disabled={estado === "enviando" || estado === "ok"}>{estado === "enviando" ? "Enviando…" : "Quero receber"}</button>
      </div>
      <p className="novidades-msg" role="status" aria-live="polite">{mensagem}</p>
    </form>
  );
}
