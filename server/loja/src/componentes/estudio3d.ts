import * as THREE from "three";

function texturaDeMadeira(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d");
  if (g) {
    g.fillStyle = "#C99B6E";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 120; i++) {
      const y = (i / 120) * 512 + Math.sin(i * 1.7) * 3;
      g.strokeStyle = `rgba(${110 + (i % 5) * 6},${70 + (i % 7) * 4},40,${0.08 + (i % 4) * 0.05})`;
      g.lineWidth = 1 + (i % 3);
      g.beginPath();
      for (let x = 0; x <= 512; x += 16) g.lineTo(x, y + Math.sin(x * 0.012 + i * 0.9) * 5 + Math.sin(x * 0.05 + i) * 1.5);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function texturaDePetala(cor: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  if (g) {
    g.translate(64, 64);
    g.fillStyle = cor;
    for (let i = 0; i < 5; i++) {
      g.save();
      g.rotate((i * Math.PI * 2) / 5);
      g.beginPath();
      g.ellipse(0, -26, 15, 26, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    g.fillStyle = "#9E4A18";
    g.beginPath();
    g.arc(0, 0, 8, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const CORES_DAS_PETALAS = ["#CD7031", "#DFA1AC", "#E9B824", "#D4935E", "#DFA1AC", "#CD7031", "#E9B824", "#9E4A18", "#DFA1AC"];

export function montarBandeja3D(mundo: THREE.Object3D, { y, raio, espessura, celular, sombras = true }: { y: number; raio: number; espessura: number; celular: boolean; sombras?: boolean }) {
  const texturas: THREE.Texture[] = [];
  const madeira = texturaDeMadeira();
  texturas.push(madeira);
  const bandeja = new THREE.Mesh(
    new THREE.CylinderGeometry(raio, raio * 1.02, espessura, celular ? 64 : 96),
    [new THREE.MeshStandardMaterial({ color: 0xa87650, roughness: 0.7 }), new THREE.MeshStandardMaterial({ map: madeira, roughness: 0.55 }), new THREE.MeshStandardMaterial({ color: 0x8c5f3e, roughness: 0.7 })],
  );
  bandeja.position.y = y - espessura / 2;
  bandeja.receiveShadow = sombras;
  bandeja.castShadow = sombras;
  mundo.add(bandeja);
  CORES_DAS_PETALAS.forEach((cor, i) => {
    const angulo = i * 2.39 + 0.6;
    const distancia = raio * (0.58 + ((i * 0.37) % 1) * 0.32);
    const tamanho = raio * (0.075 + ((i * 0.53) % 1) * 0.05);
    const textura = texturaDePetala(cor);
    texturas.push(textura);
    const petala = new THREE.Mesh(new THREE.PlaneGeometry(tamanho, tamanho), new THREE.MeshStandardMaterial({ map: textura, transparent: true, alphaTest: 0.4, roughness: 0.8 }));
    petala.rotation.x = -Math.PI / 2;
    petala.rotation.z = angulo * 1.7;
    petala.position.set(Math.cos(angulo) * distancia, y + 0.003 + i * 0.0004, Math.sin(angulo) * distancia);
    petala.receiveShadow = sombras;
    mundo.add(petala);
  });
  return () => texturas.forEach(t => t.dispose());
}
