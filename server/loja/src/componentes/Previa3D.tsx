import { useEffect, useId, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { svgComoImagem } from "../estado/arteEmImagem";
import { urlDaFotoEnviada } from "../estado/fotos";
import { regras } from "../compartilhado";
import type { ConfigProduto, Escolhas, EstampaPublica } from "../tipos";
import { Arte, coresDaPeca, useMedirTexto, type Lado } from "./Previa";
import { ParedeDoEstudio } from "./Estudio";
import { montarBandeja3D } from "./estudio3d";

interface Forma {
  raio: number;
  base: number;
  altura: number;
  arte: { cy: number; largura: number; altura: number };
  alca?: boolean;
  alcaDeVidro?: boolean;
  pires?: boolean;
  vidro?: "claro" | "fosco";
  fundoGrosso?: number;
  topo?: "garrafa" | "termico" | "mason" | "bambu";
}

const FORMAS: Record<string, Forma> = {
  caneca: { raio: 110, base: 1, altura: 262, arte: { cy: 0.52, largura: 189, altura: 194 }, alca: true },
  xicara: { raio: 118, base: 0.72, altura: 158, arte: { cy: 0.42, largura: 184, altura: 98 }, alca: true, pires: true },
  garrafa: { raio: 66, base: 1, altura: 240, arte: { cy: 0.5, largura: 121, altura: 168 }, topo: "garrafa" },
  copo: { raio: 80, base: 0.88, altura: 260, arte: { cy: 0.48, largura: 134, altura: 146 }, vidro: "claro", fundoGrosso: 22, topo: "bambu" },
};

const COPOS: Record<string, Forma> = {
  cerveja: { raio: 82, base: 0.7, altura: 290, arte: { cy: 0.48, largura: 134, altura: 162 }, vidro: "fosco", fundoGrosso: 26 },
  chopp: { raio: 90, base: 0.94, altura: 230, arte: { cy: 0.5, largura: 151, altura: 140 }, vidro: "claro", fundoGrosso: 30, alca: true, alcaDeVidro: true },
  whisky: { raio: 105, base: 0.98, altura: 170, arte: { cy: 0.45, largura: 172, altura: 102 }, vidro: "claro", fundoGrosso: 34 },
  mason: { raio: 85, base: 1, altura: 220, arte: { cy: 0.5, largura: 143, altura: 150 }, vidro: "claro", fundoGrosso: 16, topo: "mason" },
  jateado: { raio: 80, base: 0.88, altura: 260, arte: { cy: 0.48, largura: 134, altura: 146 }, vidro: "fosco", fundoGrosso: 22, topo: "bambu" },
};

function formaDaPeca(config: ConfigProduto): Forma {
  if (config.molde === "copo") return COPOS[config.formato] || FORMAS.copo;
  if (config.molde === "garrafa" && config.formato === "copo-termico") {
    return { raio: 80, base: 1, altura: 200, arte: { cy: 0.5, largura: 121, altura: 150 }, topo: "termico" };
  }
  return FORMAS[config.molde] || FORMAS.caneca;
}

function alturaAcima(forma: Forma): number {
  if (forma.topo === "garrafa") return forma.altura * 0.36;
  if (forma.topo === "termico") return forma.altura * 0.12;
  if (forma.topo === "mason") return forma.altura * 0.16;
  if (forma.topo === "bambu") return forma.altura * 0.1;
  return 0;
}

export function temPrevia3D(config: ConfigProduto): boolean {
  return ["caneca", "xicara", "garrafa", "copo"].includes(config.molde) && config.personalizacao.ativa;
}

const ESCALA = 100;
const FOLGA = 0.16;
const LARGURA_TEXTURA = 2048;

function ArteEscondida({ config, escolhas, lado, forma, tinta, medir, aoMontar }: {
  config: ConfigProduto;
  escolhas: Escolhas;
  lado: Lado;
  forma: Forma;
  tinta: string;
  medir: boolean;
  aoMontar: (svg: SVGSVGElement | null) => void;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { largura, altura } = forma.arte;
  const fx = largura * FOLGA;
  const fy = altura * FOLGA;
  return (
    <svg ref={aoMontar} viewBox={`${-largura / 2 - fx} ${-altura / 2 - fy} ${largura + 2 * fx} ${altura + 2 * fy}`} width={largura + 2 * fx} height={altura + 2 * fy} aria-hidden="true" className="arte-escondida">
      <Arte config={config} escolhas={escolhas} lado={lado} largura={largura} altura={altura} tinta={tinta} urlDaFoto={urlDaFotoEnviada} medir={medir} idBase={`${id}-${lado}`} exemplos={false} />
    </svg>
  );
}

const imagensCarregadas = new Map<string, Promise<HTMLImageElement>>();

export function carregarImagem(url: string): Promise<HTMLImageElement> {
  let pedido = imagensCarregadas.get(url);
  if (!pedido) {
    pedido = new Promise((resolver, rejeitar) => {
      const imagem = new Image();
      imagem.decoding = "async";
      imagem.onload = () => resolver(imagem);
      imagem.onerror = () => rejeitar(new Error("a estampa não carregou"));
      imagem.src = url;
    });
    imagensCarregadas.set(url, pedido);
  }
  return pedido;
}

export function desenharEstampa(contexto: CanvasRenderingContext2D, imagem: HTMLImageElement, largura: number, altura: number, estampa: EstampaPublica, molde: string) {
  const volta = regras.voltaDaPeca(molde as Parameters<typeof regras.voltaDaPeca>[0]);
  const w = volta.cobertura * largura;
  const hDesejada = w / (estampa.proporcao || 2.105);
  const h = Math.min(hDesejada, altura * 0.96);
  const alvo = w / h;
  const iw = imagem.naturalWidth, ih = imagem.naturalHeight;
  const sw = iw / ih > alvo ? ih * alvo : iw;
  const sh = iw / ih > alvo ? ih : iw / alvo;
  const x = volta.inicioNaTextura * largura;
  const y = (altura - h) / 2;
  for (const deslocamento of [0, -largura]) {
    contexto.drawImage(imagem, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x + deslocamento, y, w, h);
  }
}

export default function Previa3D({ config, escolhas, estampa = null, aquecida, rotulo, fechar }: {
  config: ConfigProduto;
  escolhas: Escolhas;
  estampa?: EstampaPublica | null;
  aquecida: boolean;
  rotulo: string;
  fechar: () => void;
}) {
  const palco = useRef<HTMLDivElement>(null);
  const svgFrente = useRef<SVGSVGElement | null>(null);
  const svgVerso = useRef<SVGSVGElement | null>(null);
  const cena = useRef<{ textura: THREE.CanvasTexture; canvas: HTMLCanvasElement; materialCorpo: THREE.MeshStandardMaterial; materialAlca: THREE.MeshStandardMaterial | null; materialInterior: THREE.MeshStandardMaterial; arte: THREE.Mesh } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const medir = useMedirTexto();
  const forma = formaDaPeca(config);
  const cores = coresDaPeca(config, escolhas, aquecida);
  const tinta = forma.vidro ? "#2E2A28" : cores.tinta;
  const arteVisivel = !(config.magica && !aquecida);

  useEffect(() => {
    const alvo = palco.current;
    if (!alvo) return;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderizador: THREE.WebGLRenderer;
    try {
      renderizador = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setErro("Seu aparelho não conseguiu abrir o 3D. A prévia 2D mostra a mesma arte.");
      setCarregando(false);
      return;
    }
    renderizador.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderizador.outputColorSpace = THREE.SRGBColorSpace;
    renderizador.toneMapping = THREE.NeutralToneMapping;
    renderizador.toneMappingExposure = 1.15;
    alvo.appendChild(renderizador.domElement);
    renderizador.domElement.setAttribute("role", "img");
    renderizador.domElement.setAttribute("aria-label", rotulo);

    const mundo = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    const raio = forma.raio / ESCALA;
    const altura = forma.altura / ESCALA;
    const tamanho = Math.max(altura + alturaAcima(forma) / ESCALA, raio * 2.4);
    camera.position.set(0, tamanho * 1.05, tamanho * 3.2);
    mundo.add(new THREE.HemisphereLight(0xffffff, 0xe8dccf, 2.4));
    const sol = new THREE.DirectionalLight(0xffffff, 1.9);
    sol.position.set(3, 5, 6);
    mundo.add(sol);
    const contraluz = new THREE.DirectionalLight(0xfff1e6, 0.6);
    contraluz.position.set(-4, 2, -3);
    mundo.add(contraluz);

    const grupo = new THREE.Group();
    mundo.add(grupo);

    const vidroFosco = forma.vidro === "fosco";
    const materialCorpo = forma.vidro
      ? new THREE.MeshStandardMaterial({ color: vidroFosco ? 0xf6f8f8 : 0xeef4f5, transparent: true, opacity: vidroFosco ? 0.74 : 0.32, roughness: vidroFosco ? 0.55 : 0.06, metalness: 0, side: THREE.DoubleSide, depthWrite: false })
      : new THREE.MeshStandardMaterial({ color: new THREE.Color(cores.peca), roughness: forma.topo ? 0.28 : 0.32, metalness: forma.topo === "garrafa" || forma.topo === "termico" ? 0.4 : 0 });
    const raioBase = raio * forma.base;
    const corpo = new THREE.Mesh(new THREE.CylinderGeometry(raio, raioBase, altura, 96, 1, true), materialCorpo);
    grupo.add(corpo);
    const fundo = new THREE.Mesh(new THREE.CircleGeometry(raioBase, 64), materialCorpo);
    fundo.rotation.x = Math.PI / 2;
    fundo.position.y = -altura / 2;
    grupo.add(fundo);
    if (forma.fundoGrosso) {
      const espessura = forma.fundoGrosso / ESCALA;
      const raioNoFundo = raioBase + (raio - raioBase) * (espessura / altura);
      const vidroDoFundo = new THREE.MeshStandardMaterial({ color: 0xe4eef0, transparent: true, opacity: vidroFosco ? 0.85 : 0.55, roughness: vidroFosco ? 0.5 : 0.1 });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(raioNoFundo * 0.97, raioBase * 0.97, espessura, 64), vidroDoFundo);
      base.position.y = -altura / 2 + espessura / 2;
      grupo.add(base);
    }

    const materialInterior = new THREE.MeshStandardMaterial({ color: new THREE.Color(cores.interior), roughness: 0.4, side: THREE.BackSide });
    const interior = new THREE.Mesh(new THREE.CylinderGeometry(raio * 0.96, raioBase * 0.96, altura * 0.98, 96, 1, true), materialInterior);
    interior.position.y = altura * 0.01;
    if (!forma.topo && !forma.vidro) grupo.add(interior);
    const borda = new THREE.Mesh(new THREE.TorusGeometry(raio * 0.98, raio * (forma.vidro ? 0.035 : 0.025), 12, 96), materialCorpo);
    borda.rotation.x = Math.PI / 2;
    borda.position.y = altura / 2;
    if (!forma.topo) grupo.add(borda);

    let materialAlca: THREE.MeshStandardMaterial | null = null;
    if (forma.alca) {
      materialAlca = forma.alcaDeVidro
        ? new THREE.MeshStandardMaterial({ color: 0xeef4f5, transparent: true, opacity: 0.5, roughness: 0.06 })
        : new THREE.MeshStandardMaterial({ color: new THREE.Color(cores.alca), roughness: 0.32 });
      const raioDaAlca = forma.pires ? altura * 0.2 : forma.alcaDeVidro ? altura * 0.28 : altura * 0.24;
      const grossura = forma.alcaDeVidro ? altura * 0.06 : forma.pires ? altura * 0.045 : altura * 0.04;
      const alca = new THREE.Mesh(new THREE.TorusGeometry(raioDaAlca, grossura, 20, 48, Math.PI), materialAlca);
      alca.rotation.z = -Math.PI / 2;
      alca.position.set(raio * 0.97, forma.pires ? altura * 0.12 : altura * 0.04, 0);
      grupo.add(alca);
    }
    let fundoDaCena = -altura / 2;
    if (forma.pires) {
      const materialPires = new THREE.MeshStandardMaterial({ color: new THREE.Color(cores.peca), roughness: 0.35, side: THREE.DoubleSide });
      const pe = new THREE.Mesh(new THREE.TorusGeometry(raioBase * 0.92, raio * 0.03, 10, 64), materialPires);
      pe.rotation.x = Math.PI / 2;
      pe.position.y = -altura / 2;
      grupo.add(pe);
      const r = raio;
      const u = 1 / ESCALA;
      const perfilDoPires = [
        [0, -6], [0.5 * r * ESCALA, -6], [0.56 * r * ESCALA, -9], [1.2 * r * ESCALA, -3], [1.46 * r * ESCALA, 5], [1.5 * r * ESCALA, 8],
        [1.46 * r * ESCALA, 9], [1.2 * r * ESCALA, 1], [0.6 * r * ESCALA, -2], [0.56 * r * ESCALA, 1], [0, 1],
      ].map(([x, y]) => new THREE.Vector2(x * u, y * u));
      const pires = new THREE.Mesh(new THREE.LatheGeometry(perfilDoPires, 96), materialPires);
      pires.position.y = -altura / 2 - 2 * u;
      grupo.add(pires);
      fundoDaCena = -altura / 2 - 11 * u;
    }
    if (forma.topo === "garrafa") {
      const pontos = [[1, 0], [0.98, 0.04], [0.9, 0.09], [0.7, 0.14], [0.5, 0.17], [0.44, 0.19], [0.44, 0.22]]
        .map(([x, y]) => new THREE.Vector2(raio * x, altura / 2 + altura * y));
      grupo.add(new THREE.Mesh(new THREE.LatheGeometry(pontos, 96), materialCorpo));
      const materialTampa = new THREE.MeshStandardMaterial({ color: new THREE.Color(cores.peca).multiplyScalar(0.45), roughness: 0.45, metalness: 0.3 });
      const tampa = new THREE.Mesh(new THREE.CylinderGeometry(raio * 0.5, raio * 0.52, altura * 0.14, 48), materialTampa);
      tampa.position.y = altura / 2 + altura * 0.29;
      grupo.add(tampa);
      for (const k of [0.25, 0.29, 0.33]) {
        const friso = new THREE.Mesh(new THREE.TorusGeometry(raio * 0.515, raio * 0.018, 8, 48), materialTampa);
        friso.rotation.x = Math.PI / 2;
        friso.position.y = altura / 2 + altura * k;
        grupo.add(friso);
      }
      const argola = new THREE.Mesh(new THREE.TorusGeometry(raio * 0.22, raio * 0.05, 10, 32), materialTampa);
      argola.position.y = altura / 2 + altura * 0.37;
      grupo.add(argola);
    }
    if (forma.topo === "termico") {
      const materialTampa = new THREE.MeshStandardMaterial({ color: new THREE.Color(cores.peca).multiplyScalar(0.35), roughness: 0.5 });
      const tampa = new THREE.Mesh(new THREE.CylinderGeometry(raio * 1.02, raio * 1.03, altura * 0.09, 64), materialTampa);
      tampa.position.y = altura / 2 + altura * 0.045;
      grupo.add(tampa);
      const bico = new THREE.Mesh(new THREE.BoxGeometry(raio * 0.5, altura * 0.03, raio * 0.3), materialTampa);
      bico.position.set(0, altura / 2 + altura * 0.1, raio * 0.6);
      grupo.add(bico);
    }
    if (forma.topo === "bambu") {
      const bambu = new THREE.MeshStandardMaterial({ color: 0xc9a26b, roughness: 0.7 });
      const tampa = new THREE.Mesh(new THREE.CylinderGeometry(raio * 1.03, raio * 1.03, altura * 0.07, 64), bambu);
      tampa.position.y = altura / 2 + altura * 0.03;
      grupo.add(tampa);
      const canudo = new THREE.Mesh(new THREE.CylinderGeometry(raio * 0.07, raio * 0.07, altura * 0.8, 16), new THREE.MeshStandardMaterial({ color: 0xb9c7c9, roughness: 0.4 }));
      canudo.position.set(raio * 0.25, altura / 2 - altura * 0.05, raio * 0.1);
      canudo.rotation.z = -0.14;
      grupo.add(canudo);
    }
    if (forma.topo === "mason") {
      const ombro = [[1, 0], [0.97, 0.05], [0.88, 0.09], [0.86, 0.12]].map(([x, y]) => new THREE.Vector2(raio * x, altura / 2 + altura * y));
      grupo.add(new THREE.Mesh(new THREE.LatheGeometry(ombro, 96), materialCorpo));
      const metal = new THREE.MeshStandardMaterial({ color: 0xc9a26b, roughness: 0.35, metalness: 0.6 });
      const tampa = new THREE.Mesh(new THREE.CylinderGeometry(raio * 0.9, raio * 0.9, altura * 0.07, 64), metal);
      tampa.position.y = altura / 2 + altura * 0.13;
      grupo.add(tampa);
      const canudo = new THREE.Mesh(new THREE.CylinderGeometry(raio * 0.06, raio * 0.06, altura * 0.75, 16), new THREE.MeshStandardMaterial({ color: 0xb9c7c9, roughness: 0.4 }));
      canudo.position.set(raio * 0.2, altura / 2 + altura * 0.05, raio * 0.1);
      canudo.rotation.z = -0.12;
      grupo.add(canudo);
    }

    const canvas = document.createElement("canvas");
    const escalaTextura = LARGURA_TEXTURA / (2 * Math.PI * forma.raio);
    canvas.width = LARGURA_TEXTURA;
    canvas.height = Math.round(forma.altura * escalaTextura);
    const textura = new THREE.CanvasTexture(canvas);
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.anisotropy = renderizador.capabilities.getMaxAnisotropy();
    const materialArte = new THREE.MeshStandardMaterial({ map: textura, transparent: true, roughness: 0.4, depthWrite: false });
    const arte = new THREE.Mesh(new THREE.CylinderGeometry(raio * 1.004, raioBase * 1.004, altura, 128, 1, true, -Math.PI, Math.PI * 2), materialArte);
    grupo.add(arte);

    const sombraCanvas = document.createElement("canvas");
    sombraCanvas.width = sombraCanvas.height = 128;
    const sc = sombraCanvas.getContext("2d");
    if (sc) {
      const g = sc.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, "rgba(80,40,20,0.35)");
      g.addColorStop(1, "rgba(80,40,20,0)");
      sc.fillStyle = g;
      sc.fillRect(0, 0, 128, 128);
    }
    const sombra = new THREE.Mesh(new THREE.PlaneGeometry(raio * 4, raio * 4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sombraCanvas), transparent: true, depthWrite: false }));
    sombra.rotation.x = -Math.PI / 2;
    const baseDaPeca = fundoDaCena;
    sombra.position.y = baseDaPeca + 0.006;
    mundo.add(sombra);
    const limparBandeja = montarBandeja3D(mundo, { y: baseDaPeca, raio: raio * 2.7, espessura: altura * 0.06, celular: window.matchMedia("(max-width: 760px)").matches, sombras: false });

    cena.current = { textura, canvas, materialCorpo, materialAlca, materialInterior, arte };

    const controles = new OrbitControls(camera, renderizador.domElement);
    controles.enablePan = false;
    controles.target.set(0, alturaAcima(forma) / ESCALA / 2, 0);
    controles.enableDamping = true;
    controles.minDistance = tamanho * 2.2;
    controles.maxDistance = tamanho * 5;
    controles.minPolarAngle = Math.PI * 0.25;
    controles.maxPolarAngle = Math.PI * 0.62;
    controles.autoRotate = !reduzido;
    controles.autoRotateSpeed = 1.2;
    controles.listenToKeyEvents(renderizador.domElement);
    renderizador.domElement.tabIndex = 0;
    controles.addEventListener("start", () => { controles.autoRotate = false; });

    const ajustar = () => {
      const { width, height } = alvo.getBoundingClientRect();
      renderizador.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };
    ajustar();
    const observador = new ResizeObserver(ajustar);
    observador.observe(alvo);

    let quadro = 0;
    const animar = () => {
      quadro = requestAnimationFrame(animar);
      controles.update();
      renderizador.render(mundo, camera);
    };
    animar();

    return () => {
      cancelAnimationFrame(quadro);
      observador.disconnect();
      controles.dispose();
      mundo.traverse(objeto => {
        const malha = objeto as THREE.Mesh;
        if (malha.geometry) malha.geometry.dispose();
        const material = malha.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach(m => m.dispose());
        else if (material) material.dispose();
      });
      textura.dispose();
      limparBandeja();
      renderizador.dispose();
      renderizador.domElement.remove();
      cena.current = null;
    };
  }, [config.molde, config.formato]);

  useEffect(() => {
    const atual = cena.current;
    if (!atual) return;
    if (!forma.vidro) atual.materialCorpo.color = new THREE.Color(cores.peca);
    atual.materialInterior.color = new THREE.Color(cores.interior);
    if (atual.materialAlca && !forma.alcaDeVidro) atual.materialAlca.color = new THREE.Color(cores.alca);
  }, [cores.peca, cores.alca, cores.interior]);

  useEffect(() => {
    let cancelado = false;
    const espera = setTimeout(async () => {
      const atual = cena.current;
      if (!atual) return;
      const contexto = atual.canvas.getContext("2d");
      if (!contexto) return;
      try {
        const escala = LARGURA_TEXTURA / (2 * Math.PI * forma.raio);
        const w = forma.arte.largura * (1 + 2 * FOLGA) * escala;
        const h = forma.arte.altura * (1 + 2 * FOLGA) * escala;
        const cy = forma.altura * forma.arte.cy * escala;
        const [imagemDaEstampa, frente, verso] = await Promise.all([
          estampa && arteVisivel ? carregarImagem(estampa.textura).catch(() => null) : null,
          svgFrente.current && arteVisivel ? svgComoImagem(svgFrente.current, Math.round(w), Math.round(h)) : null,
          svgVerso.current && arteVisivel && config.personalizacao.verso ? svgComoImagem(svgVerso.current, Math.round(w), Math.round(h)) : null,
        ]);
        if (cancelado) return;
        contexto.clearRect(0, 0, atual.canvas.width, atual.canvas.height);
        if (imagemDaEstampa && estampa) desenharEstampa(contexto, imagemDaEstampa, atual.canvas.width, atual.canvas.height, estampa, config.molde);
        if (frente) contexto.drawImage(frente, LARGURA_TEXTURA / 2 - w / 2, cy - h / 2, w, h);
        if (verso) {
          contexto.drawImage(verso, -w / 2, cy - h / 2, w, h);
          contexto.drawImage(verso, LARGURA_TEXTURA - w / 2, cy - h / 2, w, h);
        }
        atual.textura.needsUpdate = true;
        setCarregando(false);
      } catch {
        if (!cancelado) { setErro("Não deu para desenhar a arte no 3D agora. A prévia 2D continua valendo."); setCarregando(false); }
      }
    }, 120);
    return () => { cancelado = true; clearTimeout(espera); };
  }, [escolhas, aquecida, medir, arteVisivel, estampa]);

  return (
    <div className="previa-3d">
      <ParedeDoEstudio />
      <div ref={palco} className="previa-3d-palco" />
      <div className="arte-escondida-caixa" aria-hidden="true">
        <ArteEscondida config={config} escolhas={escolhas} lado="frente" forma={forma} tinta={tinta} medir={medir} aoMontar={svg => { svgFrente.current = svg; }} />
        {config.personalizacao.verso ? <ArteEscondida config={config} escolhas={escolhas} lado="verso" forma={forma} tinta={tinta} medir={medir} aoMontar={svg => { svgVerso.current = svg; }} /> : null}
      </div>
      {carregando ? <p className="previa-3d-aviso">Preparando o 3D…</p> : null}
      {erro ? <p className="previa-3d-aviso" role="alert">{erro}</p> : <p className="previa-3d-dica">Arraste para girar · use as setas do teclado</p>}
      <button type="button" className="botao botao-escuro previa-3d-fechar" onClick={fechar}><span className="so-largo">Voltar para a prévia 2D</span><span className="so-curto">Voltar ao 2D</span></button>
    </div>
  );
}
