import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { carregarImagem, desenharEstampa } from "./Previa3D";
import { Icone } from "./Icone";
import type { EstampaPublica } from "../tipos";

const R = 0.41;
const H = 0.95;
const PAREDE = 0.03;
const ROSA = "#F2A7BE";
const NOME_INICIAL = "Madrinha Lara";
const PELE_BAIXO = H * 0.07;
const PELE_ALTURA = H * 0.84;

const TEMPO = {
  esmalte: [1.8, 3.9],
  estampa: [4.1, 7.7],
  nome: [7.9, 9.9],
  flor: [9.7, 10.5],
  cafe: [10.7, 12.6],
  fim: 13.2,
} as const;

const ETAPAS = [
  { ate: TEMPO.esmalte[0], texto: "Peça escolhida · caneca 325 ml" },
  { ate: TEMPO.estampa[0], texto: "Esmalte rosa na alça e por dentro" },
  { ate: TEMPO.nome[0], texto: "Estampa aplicada com calor" },
  { ate: TEMPO.cafe[0], texto: "Nome escrito à mão" },
  { ate: TEMPO.fim, texto: "Pronta para o primeiro café" },
];

type Pose = { t: number; az: number; el: number; dist: number; giro: number; alvo?: number };

const POSES: Pose[] = [
  { t: 0, az: 0.95, el: 0.34, dist: 5.6, giro: -1.1 },
  { t: 1.8, az: 0.55, el: 0.42, dist: 4.4, giro: -0.55 },
  { t: 3.9, az: 0.32, el: 0.5, dist: 4.15, giro: -0.15 },
  { t: TEMPO.estampa[0], az: 0.18, el: 0.2, dist: 4.1, giro: 0 },
  { t: TEMPO.estampa[1], az: 0.06, el: 0.12, dist: 3.95, giro: Math.PI * 2 },
  { t: 8.6, az: 0, el: 0.08, dist: 3.05, giro: Math.PI * 2 },
  { t: 10.5, az: 0, el: 0.08, dist: 3.1, giro: Math.PI * 2 },
  { t: 11.6, az: 0.2, el: 0.5, dist: 3.85, giro: Math.PI * 2 + 0.05 },
  { t: TEMPO.fim, az: 0.34, el: 0.4, dist: 5.0, giro: Math.PI * 2 + 0.2, alvo: H * 0.36 },
];

function entre(t: number, [a, b]: readonly [number, number]): number {
  return Math.min(1, Math.max(0, (t - a) / (b - a)));
}

function suave(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function salto(x: number): number {
  const c = 1.70158 + 1;
  return 1 + c * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
}

function poseEm(t: number): Pose {
  if (t <= POSES[0].t) return POSES[0];
  for (let i = 1; i < POSES.length; i++) {
    const a = POSES[i - 1];
    const b = POSES[i];
    if (t <= b.t) {
      const k = suave((t - a.t) / (b.t - a.t));
      const alvoA = a.alvo ?? H * 0.5;
      const alvoB = b.alvo ?? H * 0.5;
      return { t, az: a.az + (b.az - a.az) * k, el: a.el + (b.el - a.el) * k, dist: a.dist + (b.dist - a.dist) * k, giro: a.giro + (b.giro - a.giro) * k, alvo: alvoA + (alvoB - alvoA) * k };
    }
  }
  return POSES[POSES.length - 1];
}

function esmalte(material: THREE.MeshPhysicalMaterial, yMin: number, yMax: number) {
  const uniforms = { uCor: { value: new THREE.Color(ROSA) }, uNivel: { value: 0 } };
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vP;\nvarying float vA;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>\nvP = 1.0 - (position.y - ${yMin.toFixed(4)}) / ${(yMax - yMin).toFixed(4)};\nvA = atan(position.z, position.x);`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uCor;\nuniform float uNivel;\nvarying float vP;\nvarying float vA;")
      .replace("#include <color_fragment>", "#include <color_fragment>\nfloat bordaE = uNivel * 1.14 - 0.07 + 0.035 * sin(vA * 7.0) + 0.018 * sin(vA * 17.0 + 1.7);\nfloat tinta = smoothstep(bordaE + 0.012, bordaE - 0.012, vP);\ndiffuseColor.rgb = mix(diffuseColor.rgb, uCor, tinta);");
  };
  return uniforms;
}

function texturaMacia(cor: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  if (g) {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, cor);
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function desenharFlor(ctx: CanvasRenderingContext2D, x: number, y: number, tamanho: number, escala: number, comContorno: boolean) {
  if (escala <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(escala, escala);
  const desenhar = (largura: number, cor: string, encher: boolean) => {
    ctx.lineWidth = largura;
    ctx.strokeStyle = cor;
    ctx.fillStyle = cor;
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / 5);
      ctx.beginPath();
      ctx.ellipse(0, -tamanho * 0.23, tamanho * 0.12, tamanho * 0.2, 0, 0, Math.PI * 2);
      if (encher) ctx.fill(); else ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, tamanho * 0.07, 0, Math.PI * 2);
    if (encher) ctx.fill(); else ctx.stroke();
  };
  if (comContorno) desenhar(tamanho * 0.1, "#FFFCF8", true);
  desenhar(tamanho * 0.035, "#2E2A28", false);
  ctx.restore();
}

export default function Demo3D({ aoMudarPasso, aoPronto, aoFalhar, linkProduto }: {
  aoMudarPasso?: (passo: number) => void;
  aoPronto?: () => void;
  aoFalhar?: () => void;
  linkProduto: string;
}) {
  const palco = useRef<HTMLDivElement>(null);
  const [legenda, setLegenda] = useState(ETAPAS[0].texto);
  const [final, setFinal] = useState(false);
  const [nome, setNome] = useState(NOME_INICIAL);
  const controle = useRef<{ reiniciar: () => void; escrever: (nome: string) => void } | null>(null);

  useEffect(() => {
    const alvo = palco.current;
    if (!alvo) return;
    let renderizador: THREE.WebGLRenderer;
    try {
      renderizador = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      aoFalhar?.();
      return;
    }
    const celular = window.matchMedia("(max-width: 760px)").matches;
    renderizador.setPixelRatio(Math.min(window.devicePixelRatio || 1, celular ? 1.75 : 2));
    renderizador.outputColorSpace = THREE.SRGBColorSpace;
    renderizador.toneMapping = THREE.NeutralToneMapping;
    renderizador.toneMappingExposure = 1.02;
    renderizador.shadowMap.enabled = true;
    renderizador.shadowMap.type = THREE.PCFSoftShadowMap;
    alvo.appendChild(renderizador.domElement);
    renderizador.domElement.setAttribute("role", "img");
    renderizador.domElement.setAttribute("aria-label", "Animação: uma caneca branca ganha esmalte rosa, estampa de florzinhas, o nome Madrinha Lara escrito à mão e uma xícara de café");

    const mundo = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderizador);
    const ambiente = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    mundo.environment = ambiente;
    mundo.environmentIntensity = 0.75;

    const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 40);
    const alvoCamera = new THREE.Vector3(0, H * 0.5, 0);

    const chave = new THREE.DirectionalLight(0xfff1e3, 2.1);
    chave.position.set(2.6, 4.2, 3.2);
    chave.castShadow = true;
    chave.shadow.mapSize.set(celular ? 512 : 1024, celular ? 512 : 1024);
    chave.shadow.camera.left = -1.6;
    chave.shadow.camera.right = 1.6;
    chave.shadow.camera.top = 1.6;
    chave.shadow.camera.bottom = -1.6;
    chave.shadow.bias = -0.0004;
    chave.shadow.normalBias = 0.02;
    chave.shadow.radius = 6;
    mundo.add(chave);
    mundo.add(new THREE.HemisphereLight(0xfff8f0, 0xe2cdb6, 0.55));
    const recorte = new THREE.DirectionalLight(0xffe2cc, 0.7);
    recorte.position.set(-3, 2.4, -2.5);
    mundo.add(recorte);

    const chao = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.16 }));
    chao.rotation.x = -Math.PI / 2;
    chao.receiveShadow = true;
    mundo.add(chao);
    const contato = new THREE.Mesh(new THREE.PlaneGeometry(R * 3.2, R * 3.2), new THREE.MeshBasicMaterial({ map: texturaMacia("rgba(90,50,25,0.42)"), transparent: true, depthWrite: false }));
    contato.rotation.x = -Math.PI / 2;
    contato.position.y = 0.002;
    mundo.add(contato);

    const caneca = new THREE.Group();
    mundo.add(caneca);
    const segmentos = celular ? 72 : 112;

    const ceramica = () => new THREE.MeshPhysicalMaterial({ color: 0xfbfaf6, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1, side: THREE.DoubleSide });
    const materialFora = ceramica();
    const perfilFora = [
      [0.0001, 0.006], [R - 0.06, 0.0], [R - 0.016, 0.006], [R - 0.002, 0.03], [R, 0.07], [R, H - 0.016], [R - 0.004, H - 0.002], [R - PAREDE * 0.5, H + 0.006],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const fora = new THREE.Mesh(new THREE.LatheGeometry(perfilFora, segmentos), materialFora);
    fora.castShadow = true;
    caneca.add(fora);

    const materialDentro = ceramica();
    const nivelDentro = esmalte(materialDentro, 0.04, H + 0.006);
    const perfilDentro = [
      [R - PAREDE * 0.5, H + 0.006], [R - PAREDE + 0.004, H - 0.004], [R - PAREDE, H - 0.03], [R - PAREDE, 0.08], [R - PAREDE - 0.025, 0.05], [0.0001, 0.045],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    caneca.add(new THREE.Mesh(new THREE.LatheGeometry(perfilDentro, segmentos), materialDentro));

    const curvaAlca = new THREE.CatmullRomCurve3([
      new THREE.Vector3(R - 0.012, H * 0.8, 0),
      new THREE.Vector3(R + 0.11, H * 0.82, 0),
      new THREE.Vector3(R + 0.23, H * 0.68, 0),
      new THREE.Vector3(R + 0.245, H * 0.5, 0),
      new THREE.Vector3(R + 0.22, H * 0.33, 0),
      new THREE.Vector3(R + 0.1, H * 0.22, 0),
      new THREE.Vector3(R - 0.012, H * 0.22, 0),
    ]);
    const materialAlca = ceramica();
    const nivelAlca = esmalte(materialAlca, H * 0.2, H * 0.84);
    const alca = new THREE.Mesh(new THREE.TubeGeometry(curvaAlca, celular ? 64 : 96, 0.034, celular ? 14 : 20, false), materialAlca);
    alca.castShadow = true;
    alca.scale.z = 0.82;
    caneca.add(alca);

    const larguraTextura = celular ? 1536 : 2048;
    const telaPele = document.createElement("canvas");
    telaPele.width = larguraTextura;
    telaPele.height = Math.round(larguraTextura * PELE_ALTURA / (2 * Math.PI * R));
    const ctx = telaPele.getContext("2d");
    const texturaPele = new THREE.CanvasTexture(telaPele);
    texturaPele.colorSpace = THREE.SRGBColorSpace;
    texturaPele.anisotropy = renderizador.capabilities.getMaxAnisotropy();
    const pele = new THREE.Mesh(
      new THREE.CylinderGeometry(R * 1.0025, R * 1.0025, PELE_ALTURA, segmentos, 1, true, -Math.PI, Math.PI * 2),
      new THREE.MeshPhysicalMaterial({ map: texturaPele, transparent: true, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    );
    pele.position.y = PELE_BAIXO + PELE_ALTURA / 2;
    caneca.add(pele);

    const cafe = new THREE.Mesh(new THREE.CircleGeometry(R - PAREDE - 0.004, segmentos), new THREE.MeshPhysicalMaterial({ color: 0x3a2214, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }));
    cafe.rotation.x = -Math.PI / 2;
    cafe.visible = false;
    caneca.add(cafe);
    const creme = new THREE.Mesh(new THREE.RingGeometry(R - PAREDE - 0.05, R - PAREDE - 0.004, segmentos), new THREE.MeshPhysicalMaterial({ color: 0x8a5a36, roughness: 0.35, transparent: true, opacity: 0.85 }));
    creme.rotation.x = -Math.PI / 2;
    creme.visible = false;
    caneca.add(creme);

    const texturaVapor = texturaMacia("rgba(255,255,255,0.9)");
    const vapores = Array.from({ length: celular ? 10 : 16 }, (_, i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaVapor, transparent: true, depthWrite: false, opacity: 0 }));
      s.userData.fase = i / (celular ? 10 : 16);
      mundo.add(s);
      return s;
    });
    const caneta = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaMacia("rgba(255,214,160,1)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    caneta.scale.set(0.06, 0.06, 0.06);
    mundo.add(caneta);

    const controles = new OrbitControls(camera, renderizador.domElement);
    controles.enabled = false;
    controles.enablePan = false;
    controles.enableZoom = false;
    controles.enableDamping = true;
    controles.minPolarAngle = Math.PI * 0.28;
    controles.maxPolarAngle = Math.PI * 0.55;
    controles.target.copy(alvoCamera);

    let estampa: EstampaPublica | null = null;
    let imagemEstampa: HTMLImageElement | null = null;
    let nomeAtual = NOME_INICIAL;
    let escritaInicio = -1;
    let t = 0;
    let ultimo = 0;
    let visivel = false;
    let quadro = 0;
    let etapaAtual = -1;
    let passoAtual = 0;
    let terminou = false;

    const tamanhoDaFonte = (texto: string) => {
      if (!ctx) return 120;
      let tamanho = telaPele.height * 0.27;
      ctx.font = `${tamanho}px Allura`;
      const maximo = telaPele.width * 0.3;
      const largura = ctx.measureText(texto).width;
      if (largura > maximo) tamanho *= maximo / largura;
      return tamanho;
    };

    const desenharPele = (revela: number, escrita: number, flor: number, tempo: number) => {
      if (!ctx) return { x: 0, y: 0 };
      const W = telaPele.width;
      const A = telaPele.height;
      ctx.clearRect(0, 0, W, A);
      if (imagemEstampa && estampa && revela > 0) {
        ctx.save();
        if (revela < 1) {
          const borda = (0.5 - revela) * W;
          const x0 = borda < 0 ? borda + W : borda;
          const onda = (y: number) => Math.sin(y * 0.045 + tempo * 4) * 9 + Math.sin(y * 0.013 + 1.3) * 16;
          ctx.beginPath();
          if (revela <= 0.5) {
            ctx.moveTo(W / 2, 0);
            for (let y = 0; y <= A; y += 12) ctx.lineTo(x0 + onda(y), y);
            ctx.lineTo(W / 2, A);
          } else {
            ctx.rect(0, 0, W / 2, A);
            ctx.moveTo(W, 0);
            for (let y = 0; y <= A; y += 12) ctx.lineTo(x0 + onda(y), y);
            ctx.lineTo(W, A);
          }
          ctx.closePath();
          ctx.clip();
          desenharEstampa(ctx, imagemEstampa, W, A, estampa, "caneca");
          ctx.restore();
          ctx.save();
          ctx.globalCompositeOperation = "source-atop";
          for (let i = 0; i < 6; i++) {
            ctx.fillStyle = `rgba(236,${140 + i * 12},${70 + i * 10},${0.34 - i * 0.05})`;
            ctx.fillRect(x0 + i * 7, 0, 7, A);
          }
          ctx.restore();
        } else {
          desenharEstampa(ctx, imagemEstampa, W, A, estampa, "caneca");
          ctx.restore();
        }
      }
      let ponta = { x: 0, y: 0 };
      if (escrita > 0 && nomeAtual) {
        const tamanho = tamanhoDaFonte(nomeAtual);
        ctx.font = `${tamanho}px Allura`;
        ctx.textBaseline = "alphabetic";
        ctx.textAlign = "left";
        const largura = ctx.measureText(nomeAtual).width;
        const x = W / 2 - largura / 2;
        const y = A * 0.62;
        const corte = (largura + tamanho * 0.4) * escrita;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x - tamanho * 0.2, 0, corte, A);
        ctx.clip();
        if (estampa) {
          ctx.lineJoin = "round";
          ctx.lineWidth = tamanho * 0.2;
          ctx.strokeStyle = "#FFFCF8";
          ctx.strokeText(nomeAtual, x, y);
        }
        ctx.fillStyle = "#2E2A28";
        ctx.fillText(nomeAtual, x, y);
        ctx.restore();
        ponta = { x: x - tamanho * 0.2 + corte, y: y - tamanho * 0.25 };
        desenharFlor(ctx, W / 2, y - tamanho * 1.02, tamanho * 0.62, salto(flor), Boolean(estampa));
      }
      texturaPele.needsUpdate = true;
      return ponta;
    };

    const pontoNaCaneca = (u: number, yTela: number) => {
      const theta = -Math.PI + (u / telaPele.width) * Math.PI * 2;
      const local = new THREE.Vector3(Math.sin(theta) * R * 1.02, PELE_BAIXO + PELE_ALTURA * (1 - yTela / telaPele.height), Math.cos(theta) * R * 1.02);
      return caneca.localToWorld(local);
    };

    const ajustar = () => {
      const { width, height } = alvo.getBoundingClientRect();
      renderizador.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };
    ajustar();
    const observadorTamanho = new ResizeObserver(ajustar);
    observadorTamanho.observe(alvo);

    const posicionarCamera = (pose: Pose) => {
      const raio = pose.dist;
      alvoCamera.y = pose.alvo ?? H * 0.5;
      camera.position.set(alvoCamera.x + Math.sin(pose.az) * Math.cos(pose.el) * raio, alvoCamera.y + Math.sin(pose.el) * raio, alvoCamera.z + Math.cos(pose.az) * Math.cos(pose.el) * raio);
      camera.lookAt(alvoCamera);
      caneca.rotation.y = pose.giro;
    };

    const atualizarCena = (agora: number) => {
      const tempo = agora / 1000;
      if (!terminou) {
        posicionarCamera(poseEm(t));
        nivelDentro.uNivel.value = suave(entre(t, TEMPO.esmalte));
        nivelAlca.uNivel.value = suave(entre(t, [TEMPO.esmalte[0] + 0.5, TEMPO.esmalte[1] + 0.2]));
      }
      const revela = imagemEstampa ? suave(entre(t, TEMPO.estampa)) : 0;
      let escrita = suave(entre(t, TEMPO.nome));
      if (escritaInicio >= 0) escrita = Math.min(1, (tempo - escritaInicio) / 1.1);
      const flor = escritaInicio >= 0 ? 1 : entre(t, TEMPO.flor);
      const precisaPele = !terminou || escritaInicio >= 0;
      if (precisaPele) {
        const ponta = desenharPele(revela, escrita, flor, tempo);
        const escrevendo = escrita > 0 && escrita < 1;
        caneta.material.opacity = escrevendo ? 0.95 : 0;
        if (escrevendo) caneta.position.copy(pontoNaCaneca(ponta.x, ponta.y));
        if (escritaInicio >= 0 && escrita >= 1) escritaInicio = -1;
      }
      const cheio = suave(entre(t, TEMPO.cafe));
      cafe.visible = creme.visible = cheio > 0;
      cafe.position.y = creme.position.y = 0.06 + cheio * (H * 0.84 - 0.06);
      const vapor = entre(t, [TEMPO.cafe[0] + 0.8, TEMPO.cafe[1] + 0.4]);
      vapores.forEach((s, i) => {
        const vida = (tempo * 0.28 + s.userData.fase) % 1;
        const giro = vida * 5 + i;
        s.position.set(Math.sin(giro) * 0.07 * (0.4 + vida), H + 0.04 + vida * 0.75, Math.cos(giro) * 0.05 * vida);
        s.scale.setScalar(0.14 + vida * 0.38);
        s.material.opacity = vapor * Math.sin(Math.PI * vida) * 0.7;
      });
      const etapa = ETAPAS.findIndex(e => t < e.ate);
      const indice = etapa < 0 ? ETAPAS.length - 1 : etapa;
      if (indice !== etapaAtual) {
        etapaAtual = indice;
        setLegenda(ETAPAS[indice].texto);
      }
      const passo = t < TEMPO.nome[0] ? 1 : t < TEMPO.cafe[0] ? 2 : 3;
      if (passo !== passoAtual) {
        passoAtual = passo;
        aoMudarPasso?.(passo);
      }
      if (terminou) controles.update();
      renderizador.render(mundo, camera);
    };

    const laco = (agora: number) => {
      quadro = requestAnimationFrame(laco);
      const delta = ultimo ? Math.min(0.05, (agora - ultimo) / 1000) : 0;
      ultimo = agora;
      if (!terminou) {
        t += delta;
        if (t >= TEMPO.fim) {
          t = TEMPO.fim;
          terminou = true;
          posicionarCamera(poseEm(t));
          controles.target.copy(alvoCamera);
          controles.enabled = true;
          controles.update();
          setFinal(true);
        }
      }
      atualizarCena(agora);
    };

    const ligar = () => {
      if (quadro || !visivel || document.hidden) return;
      ultimo = 0;
      quadro = requestAnimationFrame(laco);
    };
    const desligar = () => {
      if (quadro) cancelAnimationFrame(quadro);
      quadro = 0;
    };

    controle.current = {
      reiniciar: () => {
        t = 0;
        terminou = false;
        escritaInicio = -1;
        controles.enabled = false;
        etapaAtual = -1;
        setFinal(false);
        ligar();
      },
      escrever: (novo: string) => {
        nomeAtual = novo;
        escritaInicio = performance.now() / 1000;
      },
    };

    let cancelado = false;
    const preparar = async () => {
      try {
        await document.fonts?.load(`120px Allura`);
      } catch {}
      try {
        const res = await fetch("/api/estampas");
        const dados = res.ok ? await res.json() : null;
        estampa = dados?.estampas?.[0] ?? null;
        if (estampa) imagemEstampa = await carregarImagem(estampa.textura).catch(() => null);
        if (!imagemEstampa) estampa = null;
      } catch {
        estampa = null;
      }
      if (cancelado) return;
      posicionarCamera(poseEm(0));
      atualizarCena(performance.now());
      aoPronto?.();
      const observador = new IntersectionObserver(([e]) => {
        visivel = e.isIntersecting;
        if (visivel) ligar(); else desligar();
      }, { threshold: 0.3 });
      observador.observe(alvo);
      limpezas.push(() => observador.disconnect());
    };
    const limpezas: (() => void)[] = [];
    preparar();
    const aoTrocarAba = () => (document.hidden ? desligar() : ligar());
    document.addEventListener("visibilitychange", aoTrocarAba);

    return () => {
      cancelado = true;
      desligar();
      limpezas.forEach(f => f());
      document.removeEventListener("visibilitychange", aoTrocarAba);
      observadorTamanho.disconnect();
      controles.dispose();
      mundo.traverse(objeto => {
        const malha = objeto as THREE.Mesh;
        if (malha.geometry) malha.geometry.dispose();
        const material = malha.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach(m => m.dispose());
        else if (material) material.dispose();
      });
      texturaPele.dispose();
      ambiente.dispose();
      pmrem.dispose();
      renderizador.dispose();
      renderizador.domElement.remove();
      controle.current = null;
    };
  }, []);

  return (
    <div className={`demo3d${final ? " final" : ""}`}>
      <div ref={palco} className="demo3d-palco" />
      <p className="demo3d-legenda" aria-live="polite"><span aria-hidden="true" />{legenda}</p>
      {final ? (
        <form className="demo3d-nome" onSubmit={e => e.preventDefault()}>
          <label htmlFor="demo3d-campo">Escreva um nome e veja na caneca</label>
          <div className="demo3d-linha">
            <input id="demo3d-campo" type="text" maxLength={20} value={nome} autoComplete="off" onChange={e => { setNome(e.target.value); controle.current?.escrever(e.target.value.trim()); }} />
            <a className="botao botao-cheio" href={linkProduto}>Criar a minha</a>
          </div>
          <button type="button" className="demo3d-de-novo" onClick={() => { setNome(NOME_INICIAL); controle.current?.escrever(NOME_INICIAL); controle.current?.reiniciar(); }}><Icone nome="girar" tamanho={16} />Ver de novo</button>
        </form>
      ) : null}
    </div>
  );
}
