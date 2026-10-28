import { useId } from "react";
import { Folhas, RamoDeIpe } from "./Enfeites";

export function ParedeDoEstudio({ className }: { className?: string }) {
  return (
    <div className={`estudio-parede${className ? ` ${className}` : ""}`} aria-hidden="true">
      <span className="estudio-janela" />
      <Folhas className="estudio-ramo estudio-ramo-esq" />
      <RamoDeIpe className="estudio-ramo estudio-ramo-dir" />
    </div>
  );
}

const PETALAS = [
  { x: 92, y: 66, t: 15, g: 10, cor: "#CD7031" },
  { x: 138, y: 102, t: 11, g: 40, cor: "#DFA1AC" },
  { x: 470, y: 60, t: 14, g: 25, cor: "#E9B824" },
  { x: 515, y: 92, t: 12, g: 60, cor: "#DFA1AC" },
  { x: 430, y: 112, t: 10, g: 5, cor: "#CD7031" },
  { x: 178, y: 42, t: 9, g: 70, cor: "#E9B824" },
  { x: 58, y: 92, t: 9, g: 30, cor: "#D4935E" },
];

function DesenhoDaBandeja({ id }: { id: string }) {
  const veios = Array.from({ length: 26 }, (_, i) => {
    const y = 10 + i * 5.2;
    const pontos = Array.from({ length: 21 }, (_, k) => {
      const x = k * 30;
      return `${x} ${(y + Math.sin(x * 0.011 + i * 0.9) * 3 + Math.sin(x * 0.05 + i) * 0.8).toFixed(1)}`;
    });
    return <path key={i} d={`M${pontos.join("L")}`} stroke={`rgba(${110 + (i % 5) * 6},${70 + (i % 7) * 4},40,${(0.1 + (i % 4) * 0.05).toFixed(2)})`} strokeWidth={0.8 + (i % 3) * 0.5} fill="none" />;
  });
  return (
    <g>
      <defs>
        <clipPath id={`${id}-tampo`}><ellipse cx="300" cy="66" rx="290" ry="58" /></clipPath>
      </defs>
      <ellipse cx="300" cy="80" rx="292" ry="60" fill="#8C5F3E" />
      <ellipse cx="300" cy="74" rx="291" ry="59" fill="#A87650" />
      <g clipPath={`url(#${id}-tampo)`}>
        <rect width="600" height="150" fill="#C99B6E" />
        {veios}
      </g>
      <ellipse cx="300" cy="66" rx="290" ry="58" fill="none" stroke="#B38259" strokeWidth="2" />
      {PETALAS.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.g}) scale(1 0.55)`} fill={p.cor}>
          {[0, 72, 144, 216, 288].map(a => <ellipse key={a} cx="0" cy={-p.t * 0.42} rx={p.t * 0.26} ry={p.t * 0.42} transform={`rotate(${a})`} />)}
          <circle r={p.t * 0.14} fill="#9E4A18" />
        </g>
      ))}
    </g>
  );
}

export function BandejaDeMadeira({ className }: { className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg className={`estudio-bandeja${className ? ` ${className}` : ""}`} viewBox="0 0 600 150" aria-hidden="true" focusable="false">
      <DesenhoDaBandeja id={id} />
    </svg>
  );
}

export function BandejaNoSvg({ cx, cy, rx }: { cx: number; cy: number; rx: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const escala = rx / 290;
  return (
    <g transform={`translate(${cx - 300 * escala} ${cy - 66 * escala}) scale(${escala})`} aria-hidden="true">
      <DesenhoDaBandeja id={id} />
    </g>
  );
}
