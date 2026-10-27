export function Florzinha({ tamanho = 24, cor = "currentColor", traco = 1.2, miolo = true }: { tamanho?: number; cor?: string; traco?: number; miolo?: boolean }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth={traco} aria-hidden="true" focusable="false">
      {[0, 72, 144, 216, 288].map(angulo => (
        <ellipse key={angulo} cx="12" cy="6.5" rx="3" ry="5" transform={`rotate(${angulo} 12 12)`} />
      ))}
      {miolo ? <circle cx="12" cy="12" r="1.6" /> : null}
    </svg>
  );
}

export function Logo({ compacto = false }: { compacto?: boolean }) {
  return <img className={`logo${compacto ? " logo-compacto" : ""}`} src="/img/logo.svg" alt="Arte Canecas" width={compacto ? 112 : 190} height={compacto ? 66 : 112} />;
}

export function Onda({ cor = "var(--terracota-rodape)" }: { cor?: string }) {
  const trechos = Array.from({ length: 23 }, (_, i) => `T ${(i + 2) * 60} 20`).join(" ");
  return (
    <svg className="onda" viewBox="0 0 1440 40" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d={`M0 40V20 Q 30 0 60 20 ${trechos} V40z`} fill={cor} />
    </svg>
  );
}
