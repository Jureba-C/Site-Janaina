function sorteio(semente: number) {
  let s = semente % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pct(n: number): string {
  return `${Math.round(n * 100) / 100}%`;
}

export function recorteRetangulo(semente: number, folga = 2.4): string {
  const r = sorteio(semente);
  const pontos: string[] = [];
  const passos = 12;
  for (let i = 0; i <= passos; i++) pontos.push(`${pct((i / passos) * 100)} ${pct(r() * folga)}`);
  for (let i = 1; i <= passos; i++) pontos.push(`${pct(100 - r() * folga)} ${pct((i / passos) * 100)}`);
  for (let i = passos - 1; i >= 0; i--) pontos.push(`${pct((i / passos) * 100)} ${pct(100 - r() * folga)}`);
  for (let i = passos - 1; i >= 1; i--) pontos.push(`${pct(r() * folga)} ${pct((i / passos) * 100)}`);
  return `polygon(${pontos.join(", ")})`;
}

export function recorteCirculo(semente: number, folga = 2.2): string {
  const r = sorteio(semente);
  const pontos: string[] = [];
  const total = 64;
  for (let i = 0; i < total; i++) {
    const a = (i / total) * Math.PI * 2;
    const raio = 50 - r() * folga;
    pontos.push(`${pct(50 + Math.cos(a) * raio)} ${pct(50 + Math.sin(a) * raio)}`);
  }
  return `polygon(${pontos.join(", ")})`;
}

export function recorteFlor(semente: number, petalas = 7): string {
  const r = sorteio(semente);
  const pontos: string[] = [];
  const total = 112;
  for (let i = 0; i < total; i++) {
    const a = (i / total) * Math.PI * 2 - Math.PI / 2;
    const base = 42 + 6.5 * Math.cos(a * petalas + Math.PI);
    const raio = base + r() * 0.8;
    pontos.push(`${pct(50 + Math.cos(a) * raio)} ${pct(50 + Math.sin(a) * raio)}`);
  }
  return `polygon(${pontos.join(", ")})`;
}

export function RamoDeIpe({ className }: { className?: string }) {
  const flores = [
    { x: 38, y: 12, g: 8 }, { x: 24, y: 30, g: 40 }, { x: 52, y: 38, g: 20 }, { x: 34, y: 56, g: 60 }, { x: 56, y: 72, g: 10 },
  ];
  return (
    <svg className={className} viewBox="0 0 80 130" aria-hidden="true" focusable="false">
      <path d="M44 128C40 96 50 74 42 44C38 30 40 20 38 12" fill="none" stroke="#7A5638" strokeWidth="2" strokeLinecap="round" />
      <path d="M43 104C30 98 24 88 24 78C36 82 42 92 43 104Z" fill="#9C8A52" opacity="0.85" />
      <path d="M44 88C58 84 64 74 62 64C50 68 44 78 44 88Z" fill="#B09A5E" opacity="0.85" />
      <path d="M41 62C30 58 24 50 26 42C36 44 41 52 41 62Z" fill="#9C8A52" opacity="0.8" />
      {flores.map((f, i) => (
        <g key={i} transform={`translate(${f.x} ${f.y}) rotate(${f.g})`}>
          {[0, 72, 144, 216, 288].map(a => <ellipse key={a} cx="0" cy="-6.5" rx="4.4" ry="6.6" fill={i % 2 ? "#F2C94C" : "#E9B824"} transform={`rotate(${a})`} />)}
          <circle r="2.4" fill="#9E4A18" />
        </g>
      ))}
    </svg>
  );
}

export function Folhas({ className }: { className?: string }) {
  const pares = [0, 1, 2, 3, 4, 5, 6];
  return (
    <svg className={className} viewBox="0 0 70 130" aria-hidden="true" focusable="false">
      <path d="M36 128C34 90 38 50 34 6" fill="none" stroke="#7A5638" strokeWidth="1.8" strokeLinecap="round" />
      {pares.map(i => {
        const y = 112 - i * 15;
        const tam = 22 - i * 1.8;
        return (
          <g key={i} fill="#8F7448" opacity="0.88">
            <path d={`M35 ${y}C${35 - tam * 0.3} ${y - 9} ${35 - tam} ${y - 8} ${35 - tam - 4} ${y - 2}C${35 - tam * 0.7} ${y + 3} ${35 - tam * 0.2} ${y + 4} 35 ${y}Z`} />
            <path d={`M35 ${y - 4}C${35 + tam * 0.3} ${y - 13} ${35 + tam} ${y - 12} ${35 + tam + 4} ${y - 6}C${35 + tam * 0.7} ${y - 1} ${35 + tam * 0.2} ${y} 35 ${y - 4}Z`} />
          </g>
        );
      })}
    </svg>
  );
}

export function Laco({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 72" aria-hidden="true" focusable="false">
      <path d="M31 34C18 12 2 18 6 34C9 46 24 44 31 34Z" fill="#D98A9C" />
      <path d="M33 34C46 12 62 18 58 34C55 46 40 44 33 34Z" fill="#D98A9C" />
      <path d="M30 40L14 66L26 61L30 70L35 44Z" fill="#C06C80" />
      <path d="M34 40L50 64L40 60L36 70Z" fill="#C06C80" />
      <ellipse cx="32" cy="36" rx="6" ry="7" fill="#B85C72" />
    </svg>
  );
}

export function Clipe({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 80" aria-hidden="true" focusable="false">
      <path d="M12 14V58a8 8 0 0 0 16 0V16a5 5 0 0 0-10 0V54" fill="none" stroke="#9AA0A6" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BordaRasgada({ cor = "var(--papel)", semente = 3, className }: { cor?: string; semente?: number; className?: string }) {
  const r = sorteio(semente);
  const total = 72;
  const pontos: string[] = ["0 0", "1000 0"];
  for (let i = total; i >= 0; i--) pontos.push(`${Math.round((i / total) * 1000)} ${Math.round(6 + r() * 16)}`);
  return (
    <svg className={className} viewBox="0 0 1000 26" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <polygon points={pontos.join(" ")} style={{ fill: cor }} />
    </svg>
  );
}

export type EnfeiteDoCartao = "fita-verde" | "laco" | "clipe" | "ramo" | "fita-rosa";

export function EnfeiteDoCartao({ tipo }: { tipo: EnfeiteDoCartao }) {
  if (tipo === "laco") return <Laco className="enfeite enfeite-laco" />;
  if (tipo === "clipe") return <Clipe className="enfeite enfeite-clipe" />;
  if (tipo === "ramo") return <RamoDeIpe className="enfeite enfeite-ramo" />;
  return <span className={`enfeite enfeite-fita ${tipo === "fita-rosa" ? "fita-rosa" : "fita-verde"}`} />;
}
