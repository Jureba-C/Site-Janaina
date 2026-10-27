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

export function SeloPersonalizavel({ tamanho = 132 }: { tamanho?: number }) {
  return (
    <svg className="selo-girando" width={tamanho} height={tamanho} viewBox="0 0 132 132" role="img" aria-label="A frase pode ser personalizada">
      <defs>
        <path id="selo-circulo" d="M66 66m-48 0a48 48 0 1 1 96 0a48 48 0 1 1 -96 0" />
      </defs>
      <circle cx="66" cy="66" r="64" fill="var(--papel)" />
      <g className="selo-texto">
        <text fontFamily="Josefin Sans, sans-serif" fontSize="12" letterSpacing="2.55" fill="var(--tinta)">
          <textPath href="#selo-circulo">FRASE PODE SER PERSONALIZADA •</textPath>
        </text>
      </g>
      <g fill="none" stroke="var(--terracota)" strokeWidth="2" strokeLinecap="round" transform="translate(48 46) scale(0.9)">
        <path d="M8 18v12a8 8 0 0 0 8 8h4a8 8 0 0 0 8-8V18" />
        <path d="M28 22h2a4 4 0 0 1 0 8h-2" />
        <path d="M18 30c0-6 1-13 3-20" />
        <circle cx="21" cy="6" r="3.5" />
      </g>
    </svg>
  );
}

export function Onda({ cor = "var(--terracota-rodape)" }: { cor?: string }) {
  const trechos = Array.from({ length: 23 }, (_, i) => `T ${(i + 2) * 60} 20`).join(" ");
  return (
    <svg className="onda" viewBox="0 0 1440 40" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d={`M0 40V20 Q 30 0 60 20 ${trechos} V40z`} fill={cor} />
    </svg>
  );
}
