import { useEffect, useId, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { svgComoImagem } from "../estado/arteEmImagem";
import { urlDaFotoEnviada } from "../estado/fotos";
import type { ConfigProduto, Escolhas } from "../tipos";
import { Arte, coresDaPeca, useMedirTexto, type Lado } from "./Previa";

interface Forma {
  raio: number;
  base: number;
  altura: number;
  arte: { cy: number; largura: number; altura: number };
  alca?: boolean;
  pires?: boolean;
  tampa?: boolean;
  vidro?: boolean;
}

const FORMAS: Record<string, Forma> = {
  caneca: { raio: 110, base: 1, altura: 262, arte: { cy: 0.52, largura: 189, altura: 194 }, alca: true },
  xicara: { raio: 118, base: 0.72, altura: 158, arte: { cy: 0.42, largura: 184, altura: 98 }, alca: true, pires: true },
  garrafa: { raio: 66, base: 1, altura: 280, arte: { cy: 0.5, largura: 121, altura: 168 }, tampa: true },
  copo: { raio: 80, base: 0.88, altura: 260, arte: { cy: 0.48, largura: 134, altura: 146 }, vidro: true },
};

export function temPrevia3D(config: ConfigProduto): boolean {
  return ["caneca", "xicara", "garrafa", "copo"].includes(config.molde) && config.personalizacao.ativa;
}

const ESCALA = 100;
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
  return (
    <svg ref={aoMontar} viewBox={`${-largura / 2} ${-altura / 2} ${largura} ${altura}`} width={largura} height={altura} aria-hidden="true" className="arte-escondida">
      <Arte config={config} escolhas={escolhas} lado={lado} largura={largura} altura={altura} tinta={tinta} urlDaFoto={urlDaFotoEnviada} medir={medir} idBase={`${id}-${lado}`} exemplos={false} />
    </svg>
  );
}

export default function Previa3D({ config, escolhas, aquecida, rotulo, fechar }: {
  config: ConfigProduto;
  escolhas: Escolhas;
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
  const forma = FORMAS[config.molde] || FORMAS.caneca;
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
    camera.position.set(0, altura * 1.05, altura * 3.2);
    mundo.add(new THREE.HemisphereLight(0xffffff, 0xe8dccf, 2.4));
    const sol = new THREE.DirectionalLight(0xffffff, 1.9);
    sol.position.set(3, 5, 6);
    mundo.add(sol);
    const contraluz = new THREE.DirectionalLight(0xfff1e6, 0.6);
    contraluz.position.set(-4, 2, -3);
    mundo.add(contraluz);

    const grupo = new THREE.Group();
    mundo.add(grupo);

    const materialCorpo = forma.vidro
      ? new THREE.MeshStandardMaterial({ color: 0xeef4f5, transparent: true, opacity: 0.38, roughness: 0.08, metalness: 0 })
      : new THREE.MeshStandardMaterial({ color: new THREE.Color(cores.peca), roughness: config.molde === "garrafa" ? 0.25 : 0.32, metalness: config.molde === "garrafa" ? 0.35 : 0 });
    const raioBase = raio * forma.base;
    const corpo = new THREE.Mesh(new THREE.CylinderGeometry(raio, raioBase, altura, 96, 1, true), materialCorpo);
    grupo.add(corpo);
    const fundo = new THREE.Mesh(new THREE.CircleGeometry(raioBase, 64), materialCorpo);
    fundo.rotation.x = Math.PI / 2;
    fundo.position.y = -altura / 2;
    grupo.add(fundo);

    const materialInterior = new THREE.MeshStandardMaterial({ color: new THREE.Color(cores.interior), roughness: 0.4, side: THREE.BackSide });
    const interior = new THREE.Mesh(new THREE.CylinderGeometry(raio * 0.96, raioBase * 0.96, altura * 0.98, 96, 1, true), materialInterior);
    interior.position.y = altura * 0.01;
    if (!forma.tampa) grupo.add(interior);
    const borda = new THREE.Mesh(new THREE.TorusGeometry(raio * 0.98, raio * 0.025, 12, 96), materialCorpo);
    borda.rotation.x = Math.PI / 2;
    borda.position.y = altura / 2;
    if (!forma.tampa) grupo.add(borda);

    let materialAlca: THREE.MeshStandardMaterial | null = null;
    if (forma.alca) {
      materialAlca = new THREE.MeshStandardMaterial({ color: new THREE.Color(cores.alca), roughness: 0.32 });
      const alca = new THREE.Mesh(new THREE.TorusGeometry(altura * 0.24, altura * 0.04, 20, 48, Math.PI), materialAlca);
      alca.rotation.z = -Math.PI / 2;
      alca.position.set(raio * 0.98, forma.pires ? altura * 0.05 : altura * 0.04, 0);
      grupo.add(alca);
    }
    if (forma.pires) {
      const pires = new THREE.Mesh(new THREE.CylinderGeometry(raio * 1.55, raio * 1.25, altura * 0.08, 64), new THREE.MeshStandardMaterial({ color: new THREE.Color(cores.peca), roughness: 0.35 }));
      pires.position.y = -altura / 2 - altura * 0.04;
      grupo.add(pires);
    }
    if (forma.tampa) {
      const ombro = new THREE.Mesh(new THREE.CylinderGeometry(raio * 0.55, raio, altura * 0.1, 64), materialCorpo);
      ombro.position.y = altura / 2 + altura * 0.05;
      grupo.add(ombro);
      const tampa = new THREE.Mesh(new THREE.CylinderGeometry(raio * 0.5, raio * 0.5, altura * 0.12, 48), new THREE.MeshStandardMaterial({ color: new THREE.Color(cores.peca).multiplyScalar(0.6), roughness: 0.5 }));
      tampa.position.y = altura / 2 + altura * 0.16;
      grupo.add(tampa);
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
    sombra.position.y = -altura / 2 - (forma.pires ? altura * 0.085 : 0.005);
    mundo.add(sombra);

    cena.current = { textura, canvas, materialCorpo, materialAlca, materialInterior, arte };

    const controles = new OrbitControls(camera, renderizador.domElement);
    controles.enablePan = false;
    controles.enableDamping = true;
    controles.minDistance = altura * 2.2;
    controles.maxDistance = altura * 5;
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
      renderizador.dispose();
      renderizador.domElement.remove();
      cena.current = null;
    };
  }, [config.molde]);

  useEffect(() => {
    const atual = cena.current;
    if (!atual) return;
    atual.materialCorpo.color = forma.vidro ? new THREE.Color(0xeef4f5) : new THREE.Color(cores.peca);
    atual.materialInterior.color = new THREE.Color(cores.interior);
    if (atual.materialAlca) atual.materialAlca.color = new THREE.Color(cores.alca);
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
        const w = forma.arte.largura * escala;
        const h = forma.arte.altura * escala;
        const cy = forma.altura * forma.arte.cy * escala;
        const [frente, verso] = await Promise.all([
          svgFrente.current && arteVisivel ? svgComoImagem(svgFrente.current, Math.round(w), Math.round(h)) : null,
          svgVerso.current && arteVisivel && config.personalizacao.verso ? svgComoImagem(svgVerso.current, Math.round(w), Math.round(h)) : null,
        ]);
        if (cancelado) return;
        contexto.clearRect(0, 0, atual.canvas.width, atual.canvas.height);
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
  }, [escolhas, aquecida, medir, arteVisivel]);

  return (
    <div className="previa-3d">
      <div ref={palco} className="previa-3d-palco" />
      <div className="arte-escondida-caixa" aria-hidden="true">
        <ArteEscondida config={config} escolhas={escolhas} lado="frente" forma={forma} tinta={tinta} medir={medir} aoMontar={svg => { svgFrente.current = svg; }} />
        {config.personalizacao.verso ? <ArteEscondida config={config} escolhas={escolhas} lado="verso" forma={forma} tinta={tinta} medir={medir} aoMontar={svg => { svgVerso.current = svg; }} /> : null}
      </div>
      {carregando ? <p className="previa-3d-aviso">Preparando o 3D…</p> : null}
      {erro ? <p className="previa-3d-aviso" role="alert">{erro}</p> : <p className="previa-3d-dica">Arraste para girar · use as setas do teclado</p>}
      <button type="button" className="botao botao-escuro previa-3d-fechar" onClick={fechar}>Voltar para a prévia 2D</button>
    </div>
  );
}
