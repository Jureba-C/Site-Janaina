import { useEffect, useState } from "react";

const CHAVE = "plc_cookie_consent";

export function AvisoCookies() {
  const [mostrar, setMostrar] = useState(false);
  useEffect(() => {
    try {
      setMostrar(!localStorage.getItem(CHAVE));
    } catch {
      setMostrar(false);
    }
  }, []);
  if (!mostrar) return null;
  function fechar() {
    try { localStorage.setItem(CHAVE, "seen"); } catch { setMostrar(false); }
    setMostrar(false);
  }
  return (
    <div className="aviso-cookies" role="region" aria-label="Aviso de privacidade">
      <p>Usamos só o cookie do login e guardamos o carrinho no seu navegador. Nada de rastreamento. <a href="/politica.html#privacidade">Privacidade</a>.</p>
      <button type="button" className="botao botao-escuro" onClick={fechar}>Entendi</button>
    </div>
  );
}
