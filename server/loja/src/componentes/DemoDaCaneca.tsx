import { memo, useEffect, useRef, useState } from "react";
import { Icone } from "./Icone";
import { PecaSvg, useMedirTexto } from "./Previa";
import type { ConfigProduto, EstampaPublica } from "../tipos";

const NOME = "Madrinha Lara";
const ROSA = "#F2A7BE";
const FIM = 10.2;
const VOLTA = 13.5;

const ETAPAS = {
  cor: [0.2, 2.2],
  estampa: [2.4, 4.6],
  nome: [4.8, 7],
  arte: [7.3, 7.6],
  pronta: [8.2, 8.6],
} as const;

function caneca(corAlca: string): ConfigProduto {
  return {
    categorias: [], medida: "", codigo: "", cuidados: "", aviso: null, molde: "caneca", formato: "", corPeca: "#FFFFFF", corAlca,
    magica: false, moldeFoto: null, variacoes: [], adicionais: [], faixas: [], qtdMinima: 1,
    personalizacao: { ativa: true, campos: { nome: { ativo: true, obrigatorio: false, limite: 20, rotulo: "Nome" } }, letras: ["cursiva"], artes: ["nome", "flor"], fotos: { min: 0, max: 0, formato: "circulo" }, verso: false },
  };
}

const BRANCA = caneca("#FFFFFF");
const PINTADA = caneca(ROSA);

function progresso(t: number, [inicio, fim]: readonly [number, number]): number {
  return Math.min(1, Math.max(0, (t - inicio) / (fim - inicio)));
}

function suave(x: number): number {
  return x * x * (3 - 2 * x);
}

const Camada = memo(function Camada({ config, nome, arte, estampa, medir }: { config: ConfigProduto; nome: string; arte: string; estampa: EstampaPublica | null; medir: boolean }) {
  return (
    <PecaSvg
      config={config}
      escolhas={{ variacoes: {}, adicionais: [], personalizacao: { nome, arte, letra: "cursiva", estampa: estampa?.id } }}
      lado="frente"
      aquecida
      urlDaFoto={() => null}
      medir={medir}
      exemplos={false}
      comArte={Boolean(nome) || arte === "flor"}
      fatias={18}
      estampa={estampa}
    />
  );
});

function frenteDaTinta(p: number): string {
  if (p >= 1) return "M-50 -50H420V430H-50Z";
  const d = [0.7071, 0.7071];
  const n = [-0.7071, 0.7071];
  const s = 40 + p * 470;
  const pontos: string[] = [];
  for (let k = -16; k <= 16; k++) {
    const onda = Math.sin(k * 1.7 + p * 9) * 7 + Math.sin(k * 0.6) * 4;
    pontos.push(`${(d[0] * (s + onda) + n[0] * k * 22).toFixed(1)} ${(d[1] * (s + onda) + n[1] * k * 22).toFixed(1)}`);
  }
  const atras = (k: number) => `${(d[0] * (s - 900) + n[0] * k * 22).toFixed(1)} ${(d[1] * (s - 900) + n[1] * k * 22).toFixed(1)}`;
  return `M${pontos.join("L")}L${atras(16)}L${atras(-16)}Z`;
}

function subidaDaEstampa(p: number): string {
  if (p >= 1) return "M-50 -50H420V430H-50Z";
  const topo = 400 - p * 440;
  const pontos: string[] = [];
  for (let x = -40; x <= 400; x += 20) pontos.push(`${x} ${(topo + Math.sin(x / 26 + p * 8) * 6).toFixed(1)}`);
  return `M${pontos.join("L")}L400 430L-40 430Z`;
}

function Pincel({ p }: { p: number }) {
  if (p <= 0 || p >= 1) return null;
  const s = 40 + p * 470;
  const vai = Math.sin(p * Math.PI * 5) * 120;
  const x = 0.7071 * s - 0.7071 * vai;
  const y = 0.7071 * s + 0.7071 * vai;
  return (
    <g className="demo-pincel" transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(-35)`}>
      <path d="M-7 0C-9 14-6 30 0 38C6 30 9 14 7 0Z" fill={ROSA} />
      <rect x="-8" y="-14" width="16" height="16" rx="3" fill="#B7BCC2" />
      <rect x="-5" y="-92" width="10" height="80" rx="5" fill="#C99A6B" />
    </g>
  );
}

function Calor({ forca }: { forca: number }) {
  if (forca <= 0) return null;
  return (
    <g className="demo-calor" style={{ opacity: forca }} fill="none" stroke="#D4935E" strokeWidth="2.2" strokeLinecap="round">
      <path d="M118 46c-8-10 8-16 0-26s8-16 0-26" />
      <path d="M178 40c-8-10 8-16 0-26s8-16 0-26" />
      <path d="M238 46c-8-10 8-16 0-26s8-16 0-26" />
    </g>
  );
}

export function passoDaDemo(t: number): number {
  if (t < ETAPAS.nome[0]) return 1;
  if (t < ETAPAS.pronta[0]) return 2;
  return 3;
}

export function DemoDaCaneca({ aoMudarPasso }: { aoMudarPasso?: (passo: number) => void }) {
  const [t, setT] = useState(FIM);
  const [estampa, setEstampa] = useState<EstampaPublica | null>(null);
  const [animando, setAnimando] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const inicio = useRef(0);
  const visivel = useRef(false);
  const quadro = useRef(0);
  const tAgora = useRef(FIM);
  const comecou = useRef(false);
  const medir = useMedirTexto();

  useEffect(() => {
    let vivo = true;
    fetch("/api/estampas").then(r => (r.ok ? r.json() : null)).then(dados => {
      if (vivo && dados?.estampas?.length) setEstampa(dados.estampas[0]);
    }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !raiz.current || !("IntersectionObserver" in window)) return;
    const passo = (agora: number) => {
      let decorrido = (agora - inicio.current) / 1000;
      if (decorrido >= VOLTA) {
        inicio.current = agora;
        decorrido = 0;
      }
      tAgora.current = decorrido;
      setT(Math.min(FIM, decorrido));
      quadro.current = requestAnimationFrame(passo);
    };
    const ligar = () => {
      if (quadro.current || !visivel.current || document.hidden) return;
      inicio.current = performance.now() - (comecou.current ? tAgora.current * 1000 : 0);
      comecou.current = true;
      setAnimando(true);
      quadro.current = requestAnimationFrame(passo);
    };
    const desligar = () => {
      if (quadro.current) cancelAnimationFrame(quadro.current);
      quadro.current = 0;
    };
    const observador = new IntersectionObserver(([e]) => {
      visivel.current = e.isIntersecting;
      if (visivel.current) ligar(); else desligar();
    }, { threshold: 0.35 });
    observador.observe(raiz.current);
    const aoTrocarAba = () => (document.hidden ? desligar() : ligar());
    document.addEventListener("visibilitychange", aoTrocarAba);
    return () => { observador.disconnect(); document.removeEventListener("visibilitychange", aoTrocarAba); desligar(); };
  }, []);

  const passoAtual = passoDaDemo(t);
  useEffect(() => { aoMudarPasso?.(passoAtual); }, [passoAtual, aoMudarPasso]);

  const tinta = suave(progresso(t, ETAPAS.cor));
  const impressao = estampa ? suave(progresso(t, ETAPAS.estampa)) : tinta >= 1 ? 1 : 0;
  const letras = Math.round(progresso(t, ETAPAS.nome) * NOME.length);
  const nome = NOME.slice(0, letras);
  const comFlor = t >= ETAPAS.arte[0];
  const pronta = t >= ETAPAS.pronta[0];
  const calor = estampa ? Math.sin(Math.PI * progresso(t, ETAPAS.estampa)) : 0;
  const ativa = t < ETAPAS.estampa[0] ? "cor" : t < ETAPAS.nome[0] ? "estampa" : t < ETAPAS.arte[0] ? "nome" : t < ETAPAS.pronta[0] ? "arte" : "pronta";

  function reiniciar() {
    inicio.current = performance.now();
    tAgora.current = 0;
    setT(0);
  }

  return (
    <div ref={raiz} className={`demo-caneca${pronta ? " pronta" : ""}${animando ? " animando" : ""}`}>
      <div className="demo-palco">
        <svg viewBox="0 0 360 380" role="img" aria-label="Demonstração: a caneca branca ganha alça rosa, estampa de florzinhas, o nome Madrinha Lara e uma florzinha, como na prévia do site">
          <defs>
            <clipPath id="demo-tinta"><path d={frenteDaTinta(tinta)} /></clipPath>
            <clipPath id="demo-estampa"><path d={subidaDaEstampa(impressao)} /></clipPath>
          </defs>
          <g className="demo-balanco">
            {tinta < 1 ? <Camada config={BRANCA} nome="" arte="nome" estampa={null} medir={medir} /> : null}
            {impressao < 1 ? <g clipPath="url(#demo-tinta)"><Camada config={PINTADA} nome="" arte="nome" estampa={null} medir={medir} /></g> : null}
            <g clipPath="url(#demo-estampa)"><Camada config={PINTADA} nome={nome} arte={comFlor ? "flor" : "nome"} estampa={estampa} medir={medir} /></g>
          </g>
          <Calor forca={calor} />
          <Pincel p={tinta} />
        </svg>
        <span className="demo-selo" aria-hidden="true"><Icone nome="check" tamanho={16} traco={2.4} />Prévia pronta</span>
      </div>
      <div className="demo-painel" aria-hidden="true">
        <div className={`demo-linha${ativa === "cor" ? " ativa" : ""}`}>
          <span className="demo-rotulo">Cor da alça</span>
          <span className="demo-cores">
            <span style={{ background: "#FFFFFF" }} className={t < ETAPAS.cor[0] ? "escolhida" : undefined} />
            <span style={{ background: ROSA }} className={t >= ETAPAS.cor[0] ? "escolhida" : undefined} />
            <span style={{ background: "#9E4A18" }} />
            <span style={{ background: "#2E2A28" }} />
          </span>
        </div>
        <div className={`demo-linha${ativa === "estampa" ? " ativa" : ""}`}>
          <span className="demo-rotulo">Estampa</span>
          <span className="demo-valor">{estampa && t >= ETAPAS.estampa[0] ? <>{estampa.miniatura ? <img src={estampa.miniatura} alt="" width={28} height={20} /> : null}{estampa.nome.replace(/\s*\(exemplo\)/, "")}</> : <span className="demo-vazio">sem estampa</span>}</span>
        </div>
        <div className={`demo-linha${ativa === "nome" ? " ativa" : ""}`}>
          <span className="demo-rotulo">Nome na frente</span>
          <span className="demo-campo">{nome}<span className={`demo-cursor${ativa === "nome" ? " pisca" : ""}`} /></span>
        </div>
        <div className={`demo-linha${ativa === "arte" ? " ativa" : ""}`}>
          <span className="demo-rotulo">Arte</span>
          <span className="demo-chips">
            <span className={comFlor ? undefined : "escolhida"}>Só o nome</span>
            <span className={comFlor ? "escolhida" : undefined}>Florzinha</span>
          </span>
        </div>
      </div>
      {animando ? <button type="button" className="demo-de-novo" onClick={reiniciar}><Icone nome="girar" tamanho={16} />Ver de novo</button> : null}
    </div>
  );
}
