import { useEffect, useId, useRef, useState, type PointerEvent as EventoPonteiro, type ReactNode } from "react";
import { regras } from "../compartilhado";
import { BandejaNoSvg } from "./Estudio";
import type { ConfigProduto, Escolhas, EstampaPublica, FotoEnviada, Molde } from "../tipos";

export type Lado = "frente" | "verso";

export interface FonteDaLetra {
  familia: string;
  peso: number;
  estilo: "normal" | "italic";
  caixa: "none" | "uppercase";
  espaco: number;
  fator: number;
  escala: number;
}

export const FONTES: Record<string, FonteDaLetra> = {
  cursiva: { familia: "Allura, cursive", peso: 400, estilo: "normal", caixa: "none", espaco: 0, fator: 0.4, escala: 1 },
  classica: { familia: "Fraunces, serif", peso: 500, estilo: "italic", caixa: "none", espaco: 0, fator: 0.52, escala: 0.72 },
  delicada: { familia: "Josefin Sans, sans-serif", peso: 300, estilo: "normal", caixa: "uppercase", espaco: 0.22, fator: 0.62, escala: 0.46 },
};

let contexto: CanvasRenderingContext2D | null = null;

export type MedidorDeTexto = (texto: string, familia: string, peso: number, estilo: string, tamanho: number) => number;
let medidorDoServidor: MedidorDeTexto | null = null;

export function usarMedidorDoServidor(medidor: MedidorDeTexto | null) {
  medidorDoServidor = medidor;
}

function medirTexto(texto: string, fonte: FonteDaLetra, tamanho: number, medir: boolean): number {
  const conteudo = fonte.caixa === "uppercase" ? texto.toUpperCase() : texto;
  if (medir && typeof document !== "undefined") {
    if (!contexto) contexto = document.createElement("canvas").getContext("2d");
    if (contexto) {
      contexto.font = `${fonte.estilo} ${fonte.peso} ${tamanho}px ${fonte.familia}`;
      return contexto.measureText(conteudo).width + conteudo.length * fonte.espaco * tamanho;
    }
  }
  if (medidorDoServidor) return medidorDoServidor(conteudo, fonte.familia, fonte.peso, fonte.estilo, tamanho) + conteudo.length * fonte.espaco * tamanho;
  return conteudo.length * tamanho * (fonte.fator + fonte.espaco);
}

function tamanhoQueCabe(texto: string, fonte: FonteDaLetra, base: number, largura: number, medir: boolean): number {
  const medido = medirTexto(texto, fonte, base, medir);
  if (medido <= largura) return base;
  return Math.max(base * 0.35, (base * largura) / medido);
}

function quebrarLinhas(texto: string, fonte: FonteDaLetra, tamanho: number, largura: number, maxLinhas: number, medir: boolean): string[] {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of palavras) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (atual && medirTexto(tentativa, fonte, tamanho, medir) > largura && linhas.length < maxLinhas - 1) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = tentativa;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

function luminancia(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const canais = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
}

function escurecer(hex: string, quanto: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ajusta = (c: number) => Math.max(0, Math.min(255, Math.round(c * (1 - quanto))));
  const r = ajusta((n >> 16) & 255), g = ajusta((n >> 8) & 255), b = ajusta(n & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export interface Cores {
  peca: string;
  alca: string;
  interior: string;
  tinta: string;
}

export function coresDaPeca(config: ConfigProduto, escolhas: Escolhas, aquecida: boolean): Cores {
  let peca = config.corPeca || "#FFFFFF";
  let alca = config.corAlca || peca;
  for (const grupo of config.variacoes) {
    const opcao = grupo.opcoes.find(o => o.id === escolhas.variacoes[grupo.id]);
    if (!opcao?.hex) continue;
    if (grupo.previa === "alca") alca = opcao.hex;
    if (grupo.previa === "peca") { peca = opcao.hex; if (!config.corAlca) alca = opcao.hex; }
  }
  if (config.magica && aquecida) { peca = "#FFFFFF"; alca = config.corAlca && config.corAlca !== config.corPeca ? config.corAlca : "#FFFFFF"; }
  const tinta = luminancia(peca) < 0.25 ? "#F6F1EA" : "#2E2A28";
  return { peca, alca, interior: alca, tinta };
}

const BRASILIA = "M4 74h142M48 74c4-22 12-44 27-66M102 74c-4-22-12-44-27-66M58 74c3-20 8-42 17-66M92 74c-3-20-8-42-17-66M68 74c2-20 4-42 7-66M82 74c-2-20-4-42-7-66M75 8V2M72 5h6M14 74V54h10v20M118 74V44h4v30M126 74V44h4v30M116 44h16";

function Flor({ x, y, tamanho, cor, contorno = false }: { x: number; y: number; tamanho: number; cor: string; contorno?: boolean }) {
  const escala = tamanho / 24;
  return (
    <g transform={`translate(${x - tamanho / 2} ${y - tamanho / 2}) scale(${escala})`} fill={contorno ? cor : "none"} stroke={cor} strokeWidth={contorno ? 4.2 : 1.1} strokeLinejoin="round">
      {[0, 72, 144, 216, 288].map(a => <ellipse key={a} cx="12" cy="6.5" rx="3" ry="5" transform={`rotate(${a} 12 12)`} />)}
      <circle cx="12" cy="12" r="1.6" />
    </g>
  );
}

export interface PropsArte {
  config: ConfigProduto;
  escolhas: Escolhas;
  lado: Lado;
  largura: number;
  altura: number;
  tinta: string;
  urlDaFoto: (foto: FotoEnviada) => string | null;
  medir: boolean;
  idBase: string;
  fotoSelecionada?: number;
  aoTocarFoto?: (indice: number, evento: EventoPonteiro<SVGElement>) => void;
  exemplos?: boolean;
  comContorno?: boolean;
}

function gradeDeFotos(quantidade: number): { colunas: number; linhas: number } {
  if (quantidade <= 1) return { colunas: 1, linhas: 1 };
  if (quantidade <= 2) return { colunas: 2, linhas: 1 };
  if (quantidade <= 4) return { colunas: 2, linhas: 2 };
  if (quantidade <= 6) return { colunas: 3, linhas: 2 };
  return { colunas: 4, linhas: 2 };
}

export function Arte({ config, escolhas, lado, largura, altura, tinta, urlDaFoto, medir, idBase, fotoSelecionada, aoTocarFoto, exemplos = true, comContorno }: PropsArte) {
  const pers = escolhas.personalizacao;
  const fonte = FONTES[pers.letra || "cursiva"] || FONTES.cursiva;
  const campos = config.personalizacao.campos;
  const partes: { altura: number; desenhar: (y: number, halo: string | null) => ReactNode }[] = [];
  const contorno = comContorno ?? Boolean(pers.estampa);
  const traco = (tamanho: number, halo: string | null, fator = 0.22) => halo ? { fill: halo, stroke: halo, strokeWidth: Math.max(3, tamanho * fator), strokeLinejoin: "round" as const } : { fill: tinta };
  const espaco = altura * 0.05;

  if (lado === "verso") {
    const frase = (pers.frase || "").trim() || (campos.frase && exemplos ? "Sua frase aqui" : "");
    if (frase) {
      const base = altura * 0.17 * fonte.escala;
      let tamanho = base;
      let linhas = quebrarLinhas(frase, fonte, tamanho, largura * 0.92, 3, medir);
      const maisLarga = Math.max(...linhas.map(l => medirTexto(l, fonte, tamanho, medir)));
      if (maisLarga > largura * 0.92) {
        tamanho = Math.max(base * 0.45, (tamanho * largura * 0.92) / maisLarga);
        linhas = quebrarLinhas(frase, fonte, tamanho, largura * 0.92, 3, medir);
      }
      if (linhas.length * tamanho * 1.15 > altura * 0.8) tamanho = (altura * 0.8) / (linhas.length * 1.15);
      const alturaTexto = linhas.length * tamanho * 1.15;
      partes.push({
        altura: alturaTexto,
        desenhar: (y, halo) => (
          <text x={0} y={y + tamanho * 0.9} textAnchor="middle" {...traco(tamanho, halo)} fontFamily={fonte.familia} fontWeight={fonte.peso} fontStyle={fonte.estilo} fontSize={tamanho} letterSpacing={`${fonte.espaco}em`}>
            {linhas.map((linha, i) => (
              <tspan key={i} x={0} dy={i === 0 ? 0 : tamanho * 1.15}>{fonte.caixa === "uppercase" ? linha.toUpperCase() : linha}</tspan>
            ))}
          </text>
        ),
      });
      partes.push({ altura: altura * 0.06, desenhar: (y, halo) => (
        <g stroke={halo ?? tinta} strokeWidth={halo ? 5 : 1.2} strokeLinecap="round" strokeLinejoin="round" fill={halo ?? "none"} opacity={halo ? 1 : 0.75}>
          <path d={`M${-largura * 0.18} ${y + altura * 0.03}h${largura * 0.13}M${largura * 0.05} ${y + altura * 0.03}h${largura * 0.13}`} />
          <circle cx={0} cy={y + altura * 0.03} r={altura * 0.012} />
        </g>
      ) });
    }
  } else {
    const arte = pers.arte || (config.personalizacao.artes[0] ?? "nome");
    const fotos = (pers.fotos || []).slice(0, 8);
    if (arte === "flor") {
      const t = altura * 0.2;
      partes.push({ altura: t, desenhar: (y, halo) => <Flor x={0} y={y + t / 2} tamanho={t} cor={halo ?? tinta} contorno={Boolean(halo)} /> });
    }
    if (arte === "brasilia") {
      const w = Math.min(largura * 0.7, altura * 0.62 * (150 / 78));
      const h = (w * 78) / 150;
      partes.push({ altura: h, desenhar: (y, halo) => (
        <g transform={`translate(${-w / 2} ${y}) scale(${w / 150})`} fill="none" stroke={halo ?? tinta} strokeWidth={halo ? 6 : 1.4} strokeLinecap="round" strokeLinejoin="round"><path d={BRASILIA} /></g>
      ) });
    }
    const usaFotos = config.personalizacao.fotos.max > 0 && (arte === "fotos" || !config.personalizacao.artes.includes("fotos"));
    if (usaFotos && (arte === "fotos" || fotos.length > 0) && (exemplos || fotos.length > 0)) {
      const quantidade = Math.max(1, fotos.length || (arte === "fotos" ? Math.min(4, config.personalizacao.fotos.max) : 1));
      const { colunas, linhas } = gradeDeFotos(quantidade);
      const vao = largura * 0.03;
      const alturaMax = (pers.nome || campos.nome) ? altura * 0.62 : altura * 0.9;
      const lado2 = Math.min((largura * 0.92 - vao * (colunas - 1)) / colunas, (alturaMax - vao * (linhas - 1)) / linhas);
      const larguraGrade = colunas * lado2 + (colunas - 1) * vao;
      const alturaGrade = linhas * lado2 + (linhas - 1) * vao;
      const circulo = config.personalizacao.fotos.formato !== "quadrado";
      partes.push({
        altura: alturaGrade,
        desenhar: (y, halo) => halo ? (
          <g fill={halo}>
            {Array.from({ length: quantidade }, (_, i) => {
              const linha = Math.floor(i / colunas);
              const naLinha = Math.min(colunas, quantidade - linha * colunas);
              const cx = -larguraGrade / 2 + ((colunas - naLinha) * (lado2 + vao)) / 2 + (i % colunas) * (lado2 + vao);
              const cy = y + linha * (lado2 + vao);
              const borda = Math.max(3, lado2 * 0.06);
              return circulo
                ? <circle key={i} cx={cx + lado2 / 2} cy={cy + lado2 / 2} r={lado2 / 2 + borda} />
                : <rect key={i} x={cx - borda} y={cy - borda} width={lado2 + 2 * borda} height={lado2 + 2 * borda} rx={lado2 * 0.08 + borda} />;
            })}
          </g>
        ) : (
          <g>
            {Array.from({ length: quantidade }, (_, i) => {
              const coluna = i % colunas;
              const linha = Math.floor(i / colunas);
              const naLinha = Math.min(colunas, quantidade - linha * colunas);
              const deslocamento = ((colunas - naLinha) * (lado2 + vao)) / 2;
              const cx = -larguraGrade / 2 + deslocamento + coluna * (lado2 + vao);
              const cy = y + linha * (lado2 + vao);
              const foto = fotos[i];
              const url = foto ? urlDaFoto(foto) : null;
              const idClip = `${idBase}-foto-${i}`;
              const caixa = lado2 * (foto?.zoom || 1);
              const sobra = caixa - lado2;
              const ix = cx - sobra / 2 + (foto ? foto.x * sobra / 2 : 0);
              const iy = cy - sobra / 2 + (foto ? foto.y * sobra / 2 : 0);
              return (
                <g key={i}>
                  <clipPath id={idClip}>
                    {circulo ? <circle cx={cx + lado2 / 2} cy={cy + lado2 / 2} r={lado2 / 2} /> : <rect x={cx} y={cy} width={lado2} height={lado2} rx={lado2 * 0.08} />}
                  </clipPath>
                  {url ? (
                    <image href={url} x={ix} y={iy} width={caixa} height={caixa} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${idClip})`}
                      onPointerDown={aoTocarFoto ? e => aoTocarFoto(i, e) : undefined} style={aoTocarFoto ? { cursor: "grab", touchAction: "none" } : undefined} />
                  ) : (
                    <g opacity={0.7}>
                      {circulo ? <circle cx={cx + lado2 / 2} cy={cy + lado2 / 2} r={lado2 / 2 - 1} fill="rgba(255,255,255,.55)" stroke={tinta} strokeDasharray="4 4" /> : <rect x={cx + 1} y={cy + 1} width={lado2 - 2} height={lado2 - 2} rx={lado2 * 0.08} fill="rgba(255,255,255,.55)" stroke={tinta} strokeDasharray="4 4" />}
                      <g transform={`translate(${cx + lado2 / 2 - lado2 * 0.18} ${cy + lado2 / 2 - lado2 * 0.18}) scale(${(lado2 * 0.36) / 24})`} fill="none" stroke={tinta} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 5h18v14H3zM9 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4M21 16l-5-5-8 8" />
                      </g>
                    </g>
                  )}
                  {fotoSelecionada === i && url ? (circulo
                    ? <circle cx={cx + lado2 / 2} cy={cy + lado2 / 2} r={lado2 / 2} fill="none" stroke="#9E4A18" strokeWidth={2.5} strokeDasharray="6 4" />
                    : <rect x={cx} y={cy} width={lado2} height={lado2} rx={lado2 * 0.08} fill="none" stroke="#9E4A18" strokeWidth={2.5} strokeDasharray="6 4" />) : null}
                </g>
              );
            })}
          </g>
        ),
      });
    }
    const nome = (pers.nome || "").trim() || (campos.nome && exemplos ? "Seu nome" : "");
    if (nome) {
      const comOutros = partes.length > 0;
      const base = altura * (comOutros ? 0.24 : 0.3) * fonte.escala;
      let tamanho = tamanhoQueCabe(nome, fonte, base, largura * 0.94, medir);
      let linhas = [nome];
      if (tamanho < base * 0.78 && /\s/.test(nome)) {
        const quebradas = quebrarLinhas(nome, fonte, base * 0.9, largura * 0.94, 2, medir);
        const maisLarga = Math.max(...quebradas.map(l => medirTexto(l, fonte, base * 0.9, medir)));
        const emDuas = Math.min(base * 0.9, (base * 0.9 * largura * 0.94) / maisLarga);
        if (emDuas > tamanho * 1.15) { tamanho = emDuas; linhas = quebradas; }
      }
      const entrelinha = fonte.caixa === "uppercase" ? 1.25 : 0.95;
      partes.push({
        altura: tamanho * (1.05 + (linhas.length - 1) * entrelinha),
        desenhar: (y, halo) => (
          <text x={0} y={y + tamanho * 0.88} textAnchor="middle" {...traco(tamanho, halo)} fontFamily={fonte.familia} fontWeight={fonte.peso} fontStyle={fonte.estilo} fontSize={tamanho} letterSpacing={`${fonte.espaco}em`}>
            {linhas.map((linha, i) => (
              <tspan key={i} x={0} dy={i === 0 ? 0 : tamanho * entrelinha}>{fonte.caixa === "uppercase" ? linha.toUpperCase() : linha}</tspan>
            ))}
          </text>
        ),
      });
    }
    const data = (pers.data || "").trim();
    if (data) {
      const delicada = FONTES.delicada;
      const tamanho = tamanhoQueCabe(data, delicada, altura * 0.06, largura * 0.8, medir);
      partes.push({ altura: tamanho * 1.2, desenhar: (y, halo) => (
        <text x={0} y={y + tamanho} textAnchor="middle" {...traco(tamanho, halo, 0.5)} fontFamily={delicada.familia} fontWeight={400} fontSize={tamanho} letterSpacing="0.22em">{data.toUpperCase()}</text>
      ) });
    }
  }

  const total = partes.reduce((s, p) => s + p.altura, 0) + espaco * Math.max(0, partes.length - 1);
  const halo = contorno && partes.length ? (tinta === "#F6F1EA" ? "#2E2A28" : "#FFFCF8") : null;
  const posicoes = partes.reduce<number[]>((ys, _parte, i) => [...ys, i === 0 ? -total / 2 : ys[i - 1] + partes[i - 1].altura + espaco], []);
  return (
    <g>
      {halo ? <g>{partes.map((parte, i) => <g key={i}>{parte.desenhar(posicoes[i], halo)}</g>)}</g> : null}
      <g>
        {partes.map((parte, i) => <g key={i}>{parte.desenhar(posicoes[i], null)}</g>)}
      </g>
    </g>
  );
}

function ArteCurva({ id, raio, largura, fatias, children }: { id: string; raio: number; largura: number; fatias: number; children: ReactNode }) {
  const passo = largura / fatias;
  const sobra = (i: number) => {
    const escala = Math.max(0.2, Math.cos((-largura / 2 + (i + 0.5) * passo) / raio));
    return Math.min(passo * 1.5, Math.max(0.6, (passo * 0.5) / escala));
  };
  return (
    <g>
      <defs>
        <g id={id}>{children}</g>
        {Array.from({ length: fatias }, (_, i) => (
          <clipPath key={i} id={`${id}-f${i}`}>
            <rect x={-largura / 2 + i * passo - sobra(i)} y={-2000} width={passo + 2 * sobra(i)} height={4000} />
          </clipPath>
        ))}
      </defs>
      {Array.from({ length: fatias }, (_, i) => {
        const meio = -largura / 2 + (i + 0.5) * passo;
        const angulo = meio / raio;
        if (Math.abs(angulo) >= Math.PI / 2) return null;
        const escala = Math.cos(angulo);
        const tx = raio * Math.sin(angulo) - escala * meio;
        return (
          <g key={i} transform={`translate(${tx.toFixed(3)} 0) scale(${escala.toFixed(4)} 1)`}>
            <g clipPath={`url(#${id}-f${i})`}><use href={`#${id}`} /></g>
          </g>
        );
      })}
    </g>
  );
}

export interface PropsPeca {
  config: ConfigProduto;
  escolhas: Escolhas;
  lado: Lado;
  aquecida: boolean;
  urlDaFoto: (foto: FotoEnviada) => string | null;
  medir: boolean;
  fotoSelecionada?: number;
  aoTocarFoto?: (indice: number, evento: EventoPonteiro<SVGElement>) => void;
  urlDaFotoDoMolde?: string | null;
  comArte?: boolean;
  exemplos?: boolean;
  fatias?: number;
  estampa?: EstampaPublica | null;
  noEstudio?: boolean;
}

interface Superficie {
  forma: string;
  cx: number;
  cy: number;
  raio: number;
  altura: number;
  luz: string | null;
  plana?: { x: number; y: number; largura: number; altura: number };
}

interface Geometria {
  corpo: ReactNode;
  superficie?: Superficie;
  frenteDaArte: { cx: number; cy: number; largura: number; altura: number; raio: number | null };
  sobre?: ReactNode;
  sob?: ReactNode;
}

function alcaCaneca(lado: Lado, x: number, y: number, h: number, cor: string, coracao: boolean): ReactNode {
  const largura = h * 0.29;
  if (coracao) {
    const sx = lado === "frente" ? 1 : -1;
    return (
      <path transform={`translate(${x} ${y}) scale(${sx} 1)`} d={`M0 ${h * 0.12}c${largura * 0.9} ${-h * 0.12} ${largura * 1.25} ${h * 0.28} 0 ${h * 0.62}M0 ${h * 0.12}c${largura * 0.55} ${h * 0.02} ${largura * 0.5} ${h * 0.3} 0 ${h * 0.46}`} fill="none" stroke={cor} strokeWidth={h * 0.07} strokeLinecap="round" />
    );
  }
  const d = lado === "frente"
    ? `M${x} ${y + h * 0.18}h${largura * 0.35}a${largura * 0.65} ${h * 0.25} 0 0 1 0 ${h * 0.5}h${-largura * 0.35}`
    : `M${x} ${y + h * 0.18}h${-largura * 0.35}a${largura * 0.65} ${h * 0.25} 0 0 0 0 ${h * 0.5}h${largura * 0.35}`;
  const grossura = h * 0.075;
  const lado1 = lado === "frente" ? 1 : -1;
  return (
    <g fill="none" strokeLinejoin="round" strokeLinecap="round">
      <path d={d} stroke="rgba(60, 35, 20, 0.12)" strokeWidth={grossura * 1.05} transform={`translate(${2 * lado1} 3)`} />
      <path d={d} stroke={escurecer(cor, 0.1)} strokeWidth={grossura} />
      <path d={d} stroke={cor} strokeWidth={grossura * 0.72} transform={`translate(${-1.2 * lado1} -1.2)`} />
      <path d={d} stroke="rgba(255, 255, 255, 0.7)" strokeWidth={grossura * 0.2} transform={`translate(${-grossura * 0.2 * lado1} ${-grossura * 0.18})`} />
    </g>
  );
}

function caminhoCilindro(x: number, y: number, w: number, h: number, raioBase: number): string {
  return `M${x} ${y}h${w}v${h - raioBase}q0 ${raioBase} ${-raioBase} ${raioBase}h${-(w - 2 * raioBase)}q${-raioBase} 0 ${-raioBase} ${-raioBase}z`;
}

function corpoCilindrico(idBase: string, x: number, y: number, w: number, h: number, cor: string, raioBase: number): ReactNode {
  return (
    <g>
      <defs>
        <linearGradient id={`${idBase}-luz`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.16" />
          <stop offset="0.16" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="0.32" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.7" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <path d={`M${x} ${y}h${w}v${h - raioBase}q0 ${raioBase} ${-raioBase} ${raioBase}h${-(w - 2 * raioBase)}q${-raioBase} 0 ${-raioBase} ${-raioBase}z`} fill={cor} />
      <path d={`M${x} ${y}h${w}v${h - raioBase}q0 ${raioBase} ${-raioBase} ${raioBase}h${-(w - 2 * raioBase)}q${-raioBase} 0 ${-raioBase} ${-raioBase}z`} fill={`url(#${idBase}-luz)`} />
    </g>
  );
}

function TopoDaGarrafa({ x, topoDoCorpo, w, cor, idBase }: { x: number; topoDoCorpo: number; w: number; cor: string; idBase: string }) {
  const cx = x + w / 2;
  const gargalo = w * 0.22;
  const pescoco = topoDoCorpo - 32;
  const ombro = `M${x} ${topoDoCorpo + 6}V${topoDoCorpo}C${x} ${topoDoCorpo - 18} ${cx - gargalo - 2} ${pescoco + 8} ${cx - gargalo} ${pescoco}H${cx + gargalo}C${cx + gargalo + 2} ${pescoco + 8} ${x + w} ${topoDoCorpo - 18} ${x + w} ${topoDoCorpo}V${topoDoCorpo + 6}Z`;
  const tampa = escurecer(cor, 0.45);
  const larguraDaTampa = w * 0.5;
  const topoDaTampa = pescoco - 36;
  return (
    <g>
      <circle cx={cx} cy={topoDaTampa - 6} r={8} fill="none" stroke={tampa} strokeWidth={4} />
      <rect x={cx - gargalo + 2} y={pescoco - 8} width={2 * gargalo - 4} height={12} fill={escurecer(cor, 0.12)} />
      <rect x={cx - larguraDaTampa / 2} y={topoDaTampa} width={larguraDaTampa} height={30} rx={7} fill={tampa} />
      {[8, 15, 22].map(d => <path key={d} d={`M${cx - larguraDaTampa / 2 + 3} ${topoDaTampa + d}h${larguraDaTampa - 6}`} stroke="#fff" strokeOpacity={0.16} strokeWidth={1.5} />)}
      <path d={`M${cx - larguraDaTampa / 2 + 7} ${topoDaTampa + 5}v20`} stroke="#fff" strokeOpacity={0.22} strokeWidth={3} strokeLinecap="round" />
      <path d={ombro} fill={cor} />
      <path d={ombro} fill={`url(#${idBase}-luz)`} />
    </g>
  );
}

function superficiePlana(forma: string, x: number, y: number, largura: number, altura: number): Superficie {
  return { forma, cx: x + largura / 2, cy: y + altura / 2, raio: 0, altura, luz: null, plana: { x, y, largura, altura } };
}

function geometria(molde: Molde, config: ConfigProduto, cores: Cores, lado: Lado, idBase: string, urlDaFotoDoMolde: string | null): Geometria {
  const formato = config.formato;
  if (molde === "caneca") {
    const w = 220, h = 262, x = lado === "frente" ? 48 : 92, y = 74;
    const rim = <g><ellipse cx={x + w / 2} cy={y} rx={w / 2} ry={18} fill={cores.peca} /><ellipse cx={x + w / 2} cy={y + 1} rx={w / 2 - 7} ry={13} fill={escurecer(cores.interior, 0.12)} /></g>;
    return {
      sob: alcaCaneca(lado, lado === "frente" ? x + w - 4 : x + 4, y, h, cores.alca, formato === "coracao"),
      corpo: corpoCilindrico(idBase, x, y, w, h, cores.peca, 26),
      superficie: { forma: caminhoCilindro(x, y, w, h, 26), cx: x + w / 2, cy: y + h / 2 + 4, raio: w / 2, altura: h - 8, luz: `${idBase}-luz` },
      sobre: rim,
      frenteDaArte: { cx: x + w / 2, cy: y + h * 0.52, largura: w * 0.86, altura: h * 0.74, raio: w / 2 },
    };
  }
  if (molde === "xicara") {
    const w = 236, h = 158, x = lado === "frente" ? 58 : 66, y = 102;
    return {
      sob: (
        <g>
          <ellipse cx={180} cy={y + h + 14} rx={150} ry={26} fill={escurecer(cores.peca, 0.06)} />
          <ellipse cx={180} cy={y + h + 8} rx={132} ry={18} fill={cores.peca} />
          {alcaCaneca(lado, lado === "frente" ? x + w - 6 : x + 6, y - 4, h, cores.alca, false)}
        </g>
      ),
      corpo: (
        <g>
          <path d={`M${x} ${y}h${w}c0 ${h * 0.7} -30 ${h} -70 ${h}h${-(w - 140)}c-40 0 -70 ${-h * 0.3} -70 ${-h}z`} fill={cores.peca} />
          <path d={`M${x} ${y}h${w}c0 ${h * 0.7} -30 ${h} -70 ${h}h${-(w - 140)}c-40 0 -70 ${-h * 0.3} -70 ${-h}z`} fill={`url(#${idBase}-luzx)`} />
          <defs>
            <linearGradient id={`${idBase}-luzx`} x1="0" x2="1">
              <stop offset="0" stopColor="#000" stopOpacity="0.14" /><stop offset="0.2" stopColor="#fff" stopOpacity="0.12" /><stop offset="0.5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.18" />
            </linearGradient>
          </defs>
        </g>
      ),
      sobre: <g><ellipse cx={x + w / 2} cy={y} rx={w / 2} ry={16} fill={cores.peca} /><ellipse cx={x + w / 2} cy={y + 1} rx={w / 2 - 7} ry={11} fill={escurecer(cores.interior, 0.12)} /></g>,
      superficie: { forma: `M${x} ${y}h${w}c0 ${h * 0.7} -30 ${h} -70 ${h}h${-(w - 140)}c-40 0 -70 ${-h * 0.3} -70 ${-h}z`, cx: x + w / 2, cy: y + h * 0.42, raio: w / 2, altura: h * 0.8, luz: `${idBase}-luzx` },
      frenteDaArte: { cx: x + w / 2, cy: y + h * 0.42, largura: w * 0.78, altura: h * 0.62, raio: w / 2 },
    };
  }
  if (molde === "garrafa") {
    const w = 132, h = 300, x = 114, y = 62;
    const termico = formato === "copo-termico";
    return {
      corpo: (
        <g>
          {termico ? (
            <g>
              <rect x={x + 6} y={y - 30} width={w - 12} height={22} rx={10} fill={escurecer(cores.peca, 0.38)} />
              <rect x={x + w / 2 + 8} y={y - 26} width={30} height={5} rx={2.5} fill={escurecer(cores.peca, 0.7)} />
              <rect x={x - 4} y={y - 12} width={w + 8} height={32} rx={8} fill={escurecer(cores.peca, 0.3)} />
              <path d={`M${x + 2} ${y - 4}h${w - 4}`} stroke="#fff" strokeOpacity={0.18} strokeWidth={2} />
              <path d={`M${x + 2} ${y + 12}h${w - 4}`} stroke="#000" strokeOpacity={0.12} strokeWidth={2} />
            </g>
          ) : (
            <TopoDaGarrafa x={x} topoDoCorpo={y + 20} w={w} cor={cores.peca} idBase={idBase} />
          )}
          {corpoCilindrico(idBase, x, y + 20, w, h - 20, cores.peca, 22)}
        </g>
      ),
      superficie: { forma: caminhoCilindro(x, y + 20, w, h - 20, 22), cx: x + w / 2, cy: y + 20 + (h - 20) / 2, raio: w / 2, altura: (h - 20) * 0.92, luz: `${idBase}-luz` },
      frenteDaArte: { cx: x + w / 2, cy: y + 20 + (h - 20) * 0.5, largura: w * 0.92, altura: (h - 20) * 0.6, raio: w / 2 },
    };
  }
  if (molde === "copo") {
    const jateado = formato === "jateado" || formato === "cerveja";
    const vidro = jateado ? "rgba(255,255,255,.82)" : "rgba(236,242,244,.62)";
    if (formato === "whisky") {
      const w = 210, h = 170, x = 75, y = 150;
      return {
        corpo: <g><rect x={x} y={y} width={w} height={h} rx={14} fill={vidro} stroke="rgba(120,140,150,.45)" strokeWidth={2} /><rect x={x + 6} y={y + h - 34} width={w - 12} height={28} rx={10} fill="rgba(200,215,220,.6)" /></g>,
        superficie: { forma: `M${x + 14} ${y}h${w - 28}a14 14 0 0 1 14 14v${h - 62}h${-w}v${-(h - 62)}a14 14 0 0 1 14 -14z`, cx: x + w / 2, cy: y + (h - 34) / 2, raio: w / 2, altura: h - 40, luz: null },
        frenteDaArte: { cx: x + w / 2, cy: y + h * 0.45, largura: w * 0.82, altura: h * 0.6, raio: w / 2 },
      };
    }
    if (formato === "mason") {
      const w = 170, h = 250, x = 95, y = 100;
      return {
        corpo: <g><rect x={x + 10} y={y - 36} width={w - 20} height={30} rx={6} fill="#C9A26B" /><rect x={x} y={y} width={w} height={h} rx={26} fill={vidro} stroke="rgba(120,140,150,.45)" strokeWidth={2} /><path d={`M${x + w * 0.62} ${y - 70}l-14 ${h * 0.55}`} stroke="#B9C7C9" strokeWidth={8} strokeLinecap="round" /></g>,
        superficie: { forma: caminhoCilindro(x, y, w, h, 26), cx: x + w / 2, cy: y + h / 2, raio: w / 2, altura: h * 0.9, luz: null },
        frenteDaArte: { cx: x + w / 2, cy: y + h * 0.5, largura: w * 0.84, altura: h * 0.6, raio: w / 2 },
      };
    }
    const w = formato === "chopp" ? 180 : 160, h = formato === "cerveja" ? 290 : 260, x = formato === "chopp" ? 80 : 100, y = 80;
    const afina = formato === "cerveja" ? 24 : formato === "chopp" ? 6 : 12;
    const forma = `M${x} ${y}h${w}l${-afina} ${h}h${-(w - 2 * afina)}z`;
    const comTampa = formato === "" || formato === "jateado";
    const cx = x + w / 2;
    const fundo = 20;
    const recuoNoFundo = afina * (1 - fundo / h);
    return {
      sob: formato === "chopp" ? alcaCaneca("frente", x + w - 6, y + 14, h * 0.78, "rgba(226,236,240,.92)", false) : null,
      corpo: (
        <g>
          <defs>
            <linearGradient id={`${idBase}-vidro`} x1="0" x2="1">
              <stop offset="0" stopColor="#5E7480" stopOpacity={jateado ? 0.14 : 0.22} />
              <stop offset="0.12" stopColor="#fff" stopOpacity={jateado ? 0.35 : 0.55} />
              <stop offset="0.3" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.78" stopColor="#5E7480" stopOpacity="0.04" />
              <stop offset="1" stopColor="#5E7480" stopOpacity={jateado ? 0.18 : 0.26} />
            </linearGradient>
          </defs>
          <path d={forma} fill={vidro} />
          <path d={forma} fill={`url(#${idBase}-vidro)`} stroke="rgba(110,130,140,.5)" strokeWidth={2} strokeLinejoin="round" />
          <path d={`M${x + recuoNoFundo + 3} ${y + h - fundo}h${w - 2 * recuoNoFundo - 6}l${-(afina - recuoNoFundo)} ${fundo - 3}h${-(w - 2 * afina - 6)}z`} fill="rgba(190,208,214,.5)" />
          <path d={`M${x + recuoNoFundo + 6} ${y + h - fundo}h${w - 2 * recuoNoFundo - 12}`} stroke="rgba(255,255,255,.7)" strokeWidth={2} strokeLinecap="round" />
          {comTampa ? null : <ellipse cx={cx} cy={y} rx={w / 2 - 1} ry={9} fill="rgba(255,255,255,.35)" stroke="rgba(110,130,140,.5)" strokeWidth={2} />}
          <path d={`M${x + 16} ${y + 24}l${afina * 0.5} ${h - 70}`} stroke="rgba(255,255,255,.75)" strokeWidth={7} strokeLinecap="round" />
          <path d={`M${x + w - 18} ${y + 30}l${-afina * 0.4} ${h * 0.35}`} stroke="rgba(255,255,255,.45)" strokeWidth={3} strokeLinecap="round" />
          {comTampa ? (
            <g>
              <path d={`M${x + w * 0.62} ${y - 72}l-12 ${h * 0.55}`} stroke="#B9C7C9" strokeWidth={8} strokeLinecap="round" />
              <rect x={x - 5} y={y - 16} width={w + 10} height={18} rx={7} fill="#C9A26B" />
              <rect x={x - 5} y={y - 16} width={w + 10} height={5} rx={3} fill="#DDBB8A" />
              <path d={`M${x + 4} ${y - 4}h${w - 8}`} stroke="#A9814F" strokeOpacity={0.5} strokeWidth={1.5} />
            </g>
          ) : null}
        </g>
      ),
      superficie: { forma, cx, cy: y + h / 2, raio: w / 2, altura: h * 0.9, luz: null },
      frenteDaArte: { cx, cy: y + h * 0.48, largura: w * 0.84, altura: h * 0.56, raio: w / 2 },
    };
  }
  if (molde === "azulejo") {
    return {
      sob: <g><path d="M150 300l-34 56h12l30 -50zM210 300l34 56h-12l-30 -50z" fill={MADEIRA.escura} /><path d="M104 318h152a4 4 0 0 1 4 4v14h-160v-14a4 4 0 0 1 4 -4z" fill={MADEIRA.media} /><path d="M104 318h152a4 4 0 0 1 4 4v1h-160v-1a4 4 0 0 1 4 -4z" fill={MADEIRA.clara} /></g>,
      corpo: <g><rect x={70} y={70} width={220} height={250} rx={6} fill="#D9CBBB" /><rect x={76} y={76} width={208} height={238} rx={3} fill={cores.peca} /></g>,
      superficie: superficiePlana("M79 76h202a3 3 0 0 1 3 3v232a3 3 0 0 1 -3 3h-202a3 3 0 0 1 -3 -3v-232a3 3 0 0 1 3 -3z", 76, 76, 208, 238),
      frenteDaArte: { cx: 180, cy: 195, largura: 186, altura: 214, raio: null },
    };
  }
  if (molde === "plano") {
    return {
      corpo: <g><rect x={40} y={90} width={280} height={210} rx={22} fill={escurecer(cores.peca, 0.08)} /><rect x={46} y={96} width={268} height={198} rx={18} fill={cores.peca} /></g>,
      superficie: superficiePlana("M64 96h232a18 18 0 0 1 18 18v162a18 18 0 0 1 -18 18h-232a18 18 0 0 1 -18 -18v-162a18 18 0 0 1 18 -18z", 46, 96, 268, 198),
      frenteDaArte: { cx: 180, cy: 195, largura: 240, altura: 170, raio: null },
    };
  }
  if (molde === "botton" && formato === "quadrado") {
    return {
      corpo: (
        <g>
          <circle cx={180} cy={52} r={18} fill="none" stroke="#A7ADB2" strokeWidth={5} />
          <rect x={64} y={74} width={232} height={232} rx={30} fill="rgba(255,255,255,.55)" stroke="rgba(110,130,140,.45)" strokeWidth={2} />
          <rect x={74} y={84} width={212} height={212} rx={22} fill={cores.peca} />
          <circle cx={180} cy={92} r={9} fill="#EFE2D3" stroke="rgba(110,130,140,.45)" strokeWidth={2} />
        </g>
      ),
      sobre: <path d="M84 128c6-20 18-32 40-38" stroke="#fff" strokeOpacity=".75" strokeWidth={7} fill="none" strokeLinecap="round" />,
      superficie: superficiePlana("M96 106h168a12 12 0 0 1 12 12v156a12 12 0 0 1 -12 12h-168a12 12 0 0 1 -12 -12v-156a12 12 0 0 1 12 -12z", 84, 106, 192, 180),
      frenteDaArte: { cx: 180, cy: 200, largura: 176, altura: 160, raio: null },
    };
  }
  if (molde === "botton") {
    return {
      corpo: <g><circle cx={180} cy={190} r={128} fill={escurecer(cores.peca, 0.12)} /><circle cx={180} cy={186} r={124} fill={cores.peca} /></g>,
      sobre: <path d="M92 120a124 124 0 0 1 120 -55" stroke="#fff" strokeOpacity=".7" strokeWidth={8} fill="none" strokeLinecap="round" />,
      superficie: superficiePlana("M56 186a124 124 0 1 0 248 0a124 124 0 1 0 -248 0z", 56, 62, 248, 248),
      frenteDaArte: { cx: 180, cy: 190, largura: 190, altura: 190, raio: null },
    };
  }
  if (molde === "caixa") {
    return {
      corpo: (
        <g stroke="#B65E27" strokeWidth={2} strokeLinejoin="round">
          <path d="M70 150h220v170H70z" fill="#F2EBE2" />
          <path d="M180 154v166" fill="none" stroke="#DFA1AC" strokeWidth={10} />
        </g>
      ),
      sobre: (
        <g stroke="#B65E27" strokeWidth={2} strokeLinejoin="round">
          <path d="M58 120h244v34H58z" fill={cores.peca === "#FFFFFF" ? "#FBF8F3" : cores.peca} />
          <path d="M180 118c-26-46-74-34-58 0M180 118c26-46 74-34 58 0" fill="none" stroke="#DFA1AC" strokeWidth={8} strokeLinecap="round" />
        </g>
      ),
      superficie: superficiePlana("M71 151h218v168H71z", 71, 151, 218, 168),
      frenteDaArte: { cx: 180, cy: 240, largura: 150, altura: 120, raio: null },
    };
  }
  if (molde === "flor") {
    return {
      corpo: (
        <g>
          <path d="M120 330h120l-10 24H130z" fill="#B58A5E" />
          <path d="M180 330c0-60 -4-110 -20-150M180 300c10-40 30-80 50-100M168 240c-20-20-40-30-60-30" stroke="#6E4B33" strokeWidth={6} strokeLinecap="round" fill="none" />
          {[[150, 150], [190, 130], [230, 160], [120, 190], [205, 190], [160, 110], [245, 205], [100, 215]].map(([cx, cy], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r={30} fill={i % 2 ? "#F2C94C" : "#E9B83A"} opacity={0.9} />
              <circle cx={cx + 12} cy={cy - 10} r={18} fill="#F6D97A" opacity={0.8} />
            </g>
          ))}
        </g>
      ),
      frenteDaArte: { cx: 180, cy: 342, largura: 110, altura: 18, raio: null },
    };
  }
  if (molde === "foto" && config.moldeFoto?.area) {
    const a = config.moldeFoto.area;
    return {
      corpo: urlDaFotoDoMolde ? <image href={urlDaFotoDoMolde} x={0} y={0} width={360} height={380} preserveAspectRatio="xMidYMid slice" /> : <rect width={360} height={380} fill="#F2EBE2" />,
      frenteDaArte: { cx: (a.x + a.w / 2) * 360, cy: (a.y + a.h / 2) * 380, largura: a.w * 360, altura: a.h * 380, raio: a.curva ? (a.w * 360) / 2 : null },
    };
  }
  return {
    corpo: <g><rect x={60} y={80} width={240} height={240} rx={28} fill="#F2EBE2" /><Flor x={180} y={200} tamanho={90} cor="#CD7031" /></g>,
    frenteDaArte: { cx: 180, cy: 200, largura: 0, altura: 0, raio: null },
  };
}

interface CaixaDaPeca {
  topo: number;
  base: number;
  esquerda: number;
  direita: number;
}

const CAIXA_DO_CHAVEIRO: CaixaDaPeca = { topo: 32, base: 306, esquerda: 64, direita: 296 };

function caixaDaPeca(molde: Molde, formato: string): CaixaDaPeca | undefined {
  return molde === "botton" && formato === "quadrado" ? CAIXA_DO_CHAVEIRO : CAIXAS_PLANAS[molde];
}

const CAIXAS_PLANAS: Partial<Record<Molde, CaixaDaPeca>> = {
  azulejo: { topo: 70, base: 356, esquerda: 70, direita: 290 },
  plano: { topo: 90, base: 300, esquerda: 40, direita: 320 },
  botton: { topo: 62, base: 318, esquerda: 52, direita: 308 },
  caixa: { topo: 80, base: 320, esquerda: 58, direita: 302 },
  flor: { topo: 80, base: 354, esquerda: 70, direita: 275 },
};

function baseDaPeca(molde: Molde, formato: string): number {
  if (molde === "xicara") return 290;
  if (molde === "caneca") return 340;
  if (molde === "copo") return formato === "whisky" ? 320 : formato === "mason" ? 350 : formato === "cerveja" ? 370 : 340;
  return caixaDaPeca(molde, formato)?.base ?? 362;
}

function Sombra({ molde, formato, centro, raio }: { molde: Molde; formato: string; centro: number | null; raio: number | null }) {
  if (molde === "foto" || molde === "nenhum") return null;
  const caixa = caixaDaPeca(molde, formato);
  const rx = raio ? raio * 1.18 : molde === "garrafa" ? 90 : caixa ? (caixa.direita - caixa.esquerda) * 0.46 : 140;
  const cy = baseDaPeca(molde, formato);
  return <ellipse cx={centro ?? 180} cy={cy} rx={rx} ry={raio ? 9 : 10} fill="rgba(80, 40, 20, 0.16)" />;
}

const BASE_NO_ESTUDIO = 340;
const MADEIRA = { clara: "#D9B07C", media: "#C49461", escura: "#9C6B3E" };

interface EncaixeNoEstudio {
  transformacao: string;
  bandeja: { cx: number; cy: number; rx: number };
  semSombra?: boolean;
  atras?: ReactNode;
  frente?: ReactNode;
}

function encaixeNoEstudio(molde: Molde, formato: string): EncaixeNoEstudio | null {
  const caixa = caixaDaPeca(molde, formato);
  if (!caixa) return null;
  const largura = caixa.direita - caixa.esquerda;
  const centro = (caixa.esquerda + caixa.direita) / 2;
  if (molde === "botton" && formato !== "quadrado") {
    const escala = 0.76;
    const base = 303;
    const transformacao = `translate(${(180 - centro * escala).toFixed(2)} ${(base - caixa.base * escala).toFixed(2)}) scale(${escala})`;
    return {
      transformacao,
      semSombra: true,
      bandeja: { cx: 180, cy: BASE_NO_ESTUDIO + 4, rx: 150 },
      atras: (
        <g>
          <ellipse cx={180} cy={BASE_NO_ESTUDIO - 1} rx={86} ry={8} fill="rgba(80, 40, 20, 0.2)" />
          <path d="M196 312l26 26h-14l-24 -24z" fill={MADEIRA.escura} />
          <rect x={104} y={326} width={152} height={13} rx={4} fill={MADEIRA.media} />
          <rect x={104} y={326} width={152} height={4} rx={2} fill={MADEIRA.clara} />
        </g>
      ),
      frente: (
        <g>
          <rect x={120} y={300} width={120} height={28} rx={6} fill={MADEIRA.media} />
          <rect x={120} y={300} width={120} height={6} rx={3} fill={MADEIRA.clara} />
          <path d="M128 316h104" stroke={MADEIRA.escura} strokeOpacity={0.35} strokeWidth={1.2} strokeLinecap="round" />
        </g>
      ),
    };
  }
  const altura = caixa.base - caixa.topo;
  const escala = Math.min(1, 250 / altura, 240 / largura);
  const transformacao = `translate(${(180 - centro * escala).toFixed(2)} ${(BASE_NO_ESTUDIO - caixa.base * escala).toFixed(2)}) scale(${escala.toFixed(4)})`;
  return { transformacao, bandeja: { cx: 180, cy: BASE_NO_ESTUDIO + 4, rx: Math.min(200, Math.max(140, largura * escala * 0.82)) } };
}

const PIXELS_POR_UNIDADE = 3;
const curvasProntas = new Map<string, string | null>();
const imagensDasCurvas = new Map<string, Promise<HTMLImageElement>>();

function imagemDaCurva(url: string): Promise<HTMLImageElement> {
  let pedido = imagensDasCurvas.get(url);
  if (!pedido) {
    pedido = new Promise((resolver, rejeitar) => {
      const imagem = new Image();
      imagem.onload = () => resolver(imagem);
      imagem.onerror = () => rejeitar(new Error("estampa"));
      imagem.src = url;
    });
    if (imagensDasCurvas.size > 30) imagensDasCurvas.clear();
    imagensDasCurvas.set(url, pedido);
  }
  return pedido;
}

interface MedidasDaCurva {
  raio: number;
  larguraDaImagem: number;
  alturaDaImagem: number;
  inicio: number;
}

async function entortarEstampa(textura: string, m: MedidasDaCurva): Promise<string | null> {
  const imagem = await imagemDaCurva(textura);
  const largura = Math.round(2 * m.raio * PIXELS_POR_UNIDADE);
  const altura = Math.max(1, Math.round(m.alturaDaImagem * PIXELS_POR_UNIDADE));
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const contexto = canvas.getContext("2d");
  if (!contexto) return null;
  const iw = imagem.naturalWidth || imagem.width;
  const ih = imagem.naturalHeight || imagem.height;
  if (!iw || !ih) return null;
  const escala = Math.max(m.larguraDaImagem / iw, m.alturaDaImagem / ih);
  const visivelW = m.larguraDaImagem / escala;
  const visivelH = m.alturaDaImagem / escala;
  const origemX = (iw - visivelW) / 2;
  const origemY = (ih - visivelH) / 2;
  const volta = 2 * Math.PI * m.raio;
  const arco = (coluna: number) => {
    const u = Math.max(-1, Math.min(1, (coluna / PIXELS_POR_UNIDADE - m.raio) / m.raio));
    return Math.asin(u) * m.raio;
  };
  for (let coluna = 0; coluna < largura; coluna++) {
    const a = arco(coluna);
    const b = arco(coluna + 1);
    const x = (((a - m.inicio) % volta) + volta) % volta;
    if (x >= m.larguraDaImagem) continue;
    const passo = Math.max(b - a, 0.0001);
    const sx = origemX + (x / m.larguraDaImagem) * visivelW;
    const sw = Math.max(0.5, (passo / m.larguraDaImagem) * visivelW);
    contexto.drawImage(imagem, Math.min(sx, iw - sw), origemY, sw, visivelH, coluna, 0, 1, altura);
  }
  try {
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

function useEstampaCurva(textura: string, m: MedidasDaCurva): string | null {
  const chave = `${textura}|${m.raio}|${m.larguraDaImagem.toFixed(2)}|${m.alturaDaImagem.toFixed(2)}|${m.inicio.toFixed(2)}`;
  const [pronta, setPronta] = useState<string | null>(() => curvasProntas.get(chave) ?? null);
  useEffect(() => {
    const guardada = curvasProntas.get(chave);
    if (guardada !== undefined) { setPronta(guardada); return; }
    let viva = true;
    entortarEstampa(textura, m)
      .catch(() => null)
      .then(url => {
        if (curvasProntas.size > 40) curvasProntas.clear();
        curvasProntas.set(chave, url);
        if (viva) setPronta(url);
      });
    return () => { viva = false; };
  }, [chave]);
  return pronta;
}

function EstampaCurva({ superficie, estampa, medidas, idBase, fatias }: { superficie: Superficie; estampa: EstampaPublica; medidas: MedidasDaCurva; idBase: string; fatias: number }) {
  const curva = useEstampaCurva(estampa.textura, medidas);
  const { raio: r, larguraDaImagem, alturaDaImagem, inicio } = medidas;
  return (
    <g>
      <defs><clipPath id={`${idBase}-corpo`}><path d={superficie.forma} /></clipPath></defs>
      <g clipPath={`url(#${idBase}-corpo)`}>
        {curva ? (
          <image href={curva} x={superficie.cx - r} y={superficie.cy - alturaDaImagem / 2} width={2 * r} height={alturaDaImagem} preserveAspectRatio="none" />
        ) : (
          <g transform={`translate(${superficie.cx} ${superficie.cy})`}>
            <ArteCurva id={`${idBase}-estampa`} raio={r} largura={Math.PI * r} fatias={fatias}>
              <g>
                <image href={estampa.textura} x={inicio} y={-alturaDaImagem / 2} width={larguraDaImagem} height={alturaDaImagem} preserveAspectRatio="xMidYMid slice" />
                <image href={estampa.textura} x={inicio + 2 * Math.PI * r} y={-alturaDaImagem / 2} width={larguraDaImagem} height={alturaDaImagem} preserveAspectRatio="xMidYMid slice" />
              </g>
            </ArteCurva>
          </g>
        )}
        {superficie.luz ? <path d={superficie.forma} fill={`url(#${superficie.luz})`} /> : null}
      </g>
    </g>
  );
}

function EstampaNaPeca({ superficie, estampa, molde, lado, idBase, fatias }: { superficie: Superficie; estampa: EstampaPublica; molde: Molde; lado: Lado; idBase: string; fatias: number }) {
  if (superficie.plana) {
    const p = superficie.plana;
    return (
      <g>
        <defs><clipPath id={`${idBase}-corpo`}><path d={superficie.forma} /></clipPath></defs>
        <image href={estampa.textura} x={p.x} y={p.y} width={p.largura} height={p.altura} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${idBase}-corpo)`} />
      </g>
    );
  }
  const volta = regras.voltaDaPeca(molde);
  const r = superficie.raio;
  const larguraDaImagem = volta.cobertura * 2 * Math.PI * r;
  const alturaDaImagem = Math.min(larguraDaImagem / (estampa.proporcao || 2.105), superficie.altura);
  const anguloInicial = lado === "frente" ? Math.PI / 2 + (volta.vao * Math.PI) - 2 * Math.PI : -Math.PI / 2 + volta.vao * Math.PI;
  return <EstampaCurva superficie={superficie} estampa={estampa} medidas={{ raio: r, larguraDaImagem, alturaDaImagem, inicio: anguloInicial * r }} idBase={idBase} fatias={fatias} />;
}
export function PecaSvg({ config, escolhas, lado, aquecida, urlDaFoto, medir, fotoSelecionada, aoTocarFoto, urlDaFotoDoMolde = null, comArte = true, exemplos = true, fatias = 28, estampa = null, noEstudio = false }: PropsPeca) {
  const idBase = useId().replace(/[^a-zA-Z0-9]/g, "");
  const cores = coresDaPeca(config, escolhas, aquecida);
  const molde = config.molde;
  const g = geometria(molde, config, cores, lado, idBase, urlDaFotoDoMolde ?? config.moldeFoto?.foto ?? null);
  const area = g.frenteDaArte;
  const mostrarArte = comArte && config.personalizacao.ativa && area.largura > 0 && !(config.magica && !aquecida);
  const tinta = molde === "copo" ? "#2E2A28" : cores.tinta;
  const arte = mostrarArte ? (
    <Arte config={config} escolhas={escolhas} lado={lado} largura={area.largura} altura={area.altura} tinta={tinta} urlDaFoto={urlDaFoto} medir={medir} idBase={`${idBase}-a`} fotoSelecionada={fotoSelecionada} aoTocarFoto={aoTocarFoto} exemplos={exemplos} comContorno={Boolean(estampa && g.superficie)} />
  ) : null;
  const emPe = Boolean(area.raio) && ["caneca", "xicara", "garrafa", "copo"].includes(molde);
  const deslocamento = noEstudio && emPe ? 180 - area.cx : 0;
  const encaixe = noEstudio && !emPe ? encaixeNoEstudio(molde, config.formato) : null;
  return (
    <g transform={deslocamento ? `translate(${deslocamento} 0)` : undefined}>
      {noEstudio && emPe ? <BandejaNoSvg cx={area.cx} cy={baseDaPeca(molde, config.formato) + 4} rx={(area.raio ?? 110) * 1.75} /> : null}
      {encaixe ? <BandejaNoSvg cx={encaixe.bandeja.cx} cy={encaixe.bandeja.cy} rx={encaixe.bandeja.rx} /> : null}
      {encaixe?.atras}
      <g transform={encaixe?.transformacao}>
      {encaixe?.semSombra ? null : <Sombra molde={molde} formato={config.formato} centro={area.raio ? area.cx : null} raio={area.raio} />}
      {g.sob}
      {g.corpo}
      {estampa && g.superficie && !(config.magica && !aquecida) ? <EstampaNaPeca superficie={g.superficie} estampa={estampa} molde={molde} lado={lado} idBase={`${idBase}-e`} fatias={Math.max(fatias, 24)} /> : null}
      {arte ? (
        <g key={`${escolhas.personalizacao.arte}-${escolhas.personalizacao.letra}`} className="arte-entra" transform={`translate(${area.cx} ${area.cy})`}>
          {area.raio && !aoTocarFoto ? <ArteCurva id={`${idBase}-curva`} raio={area.raio} largura={area.largura} fatias={fatias}>{arte}</ArteCurva> : arte}
        </g>
      ) : null}
      {g.sobre}
      {config.magica && !aquecida && comArte ? (
        <text x={area.cx} y={area.cy - 6} textAnchor="middle" fill="#F6F1EA" opacity={0.8} fontFamily="Josefin Sans, sans-serif" fontSize={12} letterSpacing="0.16em">
          <tspan x={area.cx} dy={0}>A ARTE APARECE</tspan>
          <tspan x={area.cx} dy={18}>COM O CALOR</tspan>
        </text>
      ) : null}
      </g>
      {encaixe?.frente}
    </g>
  );
}

export function descricaoDaPrevia(nomeProduto: string, config: ConfigProduto, escolhas: Escolhas, lado: Lado, aquecida: boolean): string {
  const pers = escolhas.personalizacao;
  const cor = config.variacoes.map(g => g.opcoes.find(o => o.id === escolhas.variacoes[g.id])?.nome).filter(Boolean).join(", ");
  const partes = [`Prévia de ${nomeProduto.toLowerCase()}`];
  if (cor) partes.push(cor.toLowerCase());
  if (config.magica) partes.push(aquecida ? "depois de aquecer" : "fria, com a arte escondida");
  if (lado === "verso") partes.push(pers.frase ? `verso com a frase "${pers.frase}"` : "verso");
  else {
    if (pers.nome) partes.push(`frente com o nome "${pers.nome}"`);
    if (pers.arte === "flor") partes.push("com florzinha");
    if (pers.arte === "brasilia") partes.push("com line art de Brasília");
    if (pers.fotos?.length) partes.push(`${pers.fotos.length} ${pers.fotos.length === 1 ? "foto" : "fotos"}`);
  }
  return partes.join(", ");
}

export function useMedirTexto(): boolean {
  const [medir, setMedir] = useState(false);
  const [, setVersao] = useState(0);
  const montado = useRef(false);
  useEffect(() => {
    montado.current = true;
    setMedir(true);
    const fontes = typeof document !== "undefined" ? document.fonts : undefined;
    if (!fontes) return;
    const aoCarregar = () => { if (montado.current) setVersao(v => v + 1); };
    fontes.ready.then(aoCarregar);
    fontes.addEventListener?.("loadingdone", aoCarregar);
    return () => { montado.current = false; fontes.removeEventListener?.("loadingdone", aoCarregar); };
  }, []);
  return medir;
}
