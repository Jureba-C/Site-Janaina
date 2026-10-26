const require_entrada_servidor = require("../entrada-servidor.cjs");
let react = require("react");
let react_jsx_runtime = require("react/jsx-runtime");
let three = require("three");
three = require_entrada_servidor.__toESM(three);
let three_examples_jsm_controls_OrbitControls_js = require("three/examples/jsm/controls/OrbitControls.js");
// loja/src/estado/arteEmImagem.ts
var FONTES = [
	{
		familia: "Fraunces",
		estilo: "normal",
		peso: "500 800",
		arquivo: "/css/fonts/fraunces-500-800-latin.woff2"
	},
	{
		familia: "Fraunces",
		estilo: "italic",
		peso: "500",
		arquivo: "/css/fonts/fraunces-italico-500-latin.woff2"
	},
	{
		familia: "Josefin Sans",
		estilo: "normal",
		peso: "300 700",
		arquivo: "/css/fonts/josefin-300-700-latin.woff2"
	},
	{
		familia: "Allura",
		estilo: "normal",
		peso: "400",
		arquivo: "/css/fonts/allura-400-latin.woff2"
	}
];
var fontesEmbutidas = null;
var dataUris = /* @__PURE__ */ new Map();
function lerComoDataUri(blob) {
	return new Promise((resolver, rejeitar) => {
		const leitor = new FileReader();
		leitor.onload = () => resolver(String(leitor.result));
		leitor.onerror = () => rejeitar(leitor.error);
		leitor.readAsDataURL(blob);
	});
}
function dataUriDe(url) {
	if (url.startsWith("data:")) return Promise.resolve(url);
	let pedido = dataUris.get(url);
	if (!pedido) {
		pedido = fetch(url).then((r) => {
			if (!r.ok) throw new Error(`não carregou ${url}`);
			return r.blob();
		}).then(lerComoDataUri);
		dataUris.set(url, pedido);
	}
	return pedido;
}
function cssDasFontes() {
	if (!fontesEmbutidas) fontesEmbutidas = Promise.all(FONTES.map(async (f) => {
		const uri = await dataUriDe(f.arquivo);
		return `@font-face{font-family:"${f.familia}";font-style:${f.estilo};font-weight:${f.peso};src:url(${uri}) format("woff2");}`;
	})).then((regras) => regras.join(""));
	return fontesEmbutidas;
}
async function svgComoImagem(svg, largura, altura) {
	const copia = svg.cloneNode(true);
	copia.setAttribute("xmlns", "http://www.w3.org/2000/svg");
	copia.setAttribute("width", String(largura));
	copia.setAttribute("height", String(altura));
	copia.removeAttribute("class");
	copia.removeAttribute("aria-hidden");
	const imagens = Array.from(copia.querySelectorAll("image"));
	await Promise.all(imagens.map(async (imagem) => {
		const href = imagem.getAttribute("href");
		if (!href) return;
		try {
			imagem.setAttribute("href", await dataUriDe(href));
		} catch {
			imagem.remove();
		}
	}));
	const estilo = document.createElementNS("http://www.w3.org/2000/svg", "style");
	estilo.textContent = await cssDasFontes();
	copia.insertBefore(estilo, copia.firstChild);
	const texto = new XMLSerializer().serializeToString(copia);
	const url = URL.createObjectURL(new Blob([texto], { type: "image/svg+xml;charset=utf-8" }));
	try {
		const imagem = new Image();
		imagem.decoding = "sync";
		await new Promise((resolver, rejeitar) => {
			imagem.onload = () => resolver();
			imagem.onerror = () => rejeitar(/* @__PURE__ */ new Error("a arte não virou imagem"));
			imagem.src = url;
		});
		return imagem;
	} finally {
		setTimeout(() => URL.revokeObjectURL(url), 1e3);
	}
}
// loja/src/componentes/Previa3D.tsx
var FORMAS = {
	caneca: {
		raio: 110,
		base: 1,
		altura: 262,
		arte: {
			cy: .52,
			largura: 189,
			altura: 194
		},
		alca: true
	},
	xicara: {
		raio: 118,
		base: .72,
		altura: 158,
		arte: {
			cy: .42,
			largura: 184,
			altura: 98
		},
		alca: true,
		pires: true
	},
	garrafa: {
		raio: 66,
		base: 1,
		altura: 280,
		arte: {
			cy: .5,
			largura: 121,
			altura: 168
		},
		tampa: true
	},
	copo: {
		raio: 80,
		base: .88,
		altura: 260,
		arte: {
			cy: .48,
			largura: 134,
			altura: 146
		},
		vidro: true
	}
};
function temPrevia3D(config) {
	return [
		"caneca",
		"xicara",
		"garrafa",
		"copo"
	].includes(config.molde) && config.personalizacao.ativa;
}
var ESCALA = 100;
var LARGURA_TEXTURA = 2048;
function ArteEscondida({ config, escolhas, lado, forma, tinta, medir, aoMontar }) {
	const id = (0, react.useId)().replace(/[^a-zA-Z0-9]/g, "");
	const { largura, altura } = forma.arte;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
		ref: aoMontar,
		viewBox: `${-largura / 2} ${-altura / 2} ${largura} ${altura}`,
		width: largura,
		height: altura,
		"aria-hidden": "true",
		className: "arte-escondida",
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_entrada_servidor.Arte, {
			config,
			escolhas,
			lado,
			largura,
			altura,
			tinta,
			urlDaFoto: require_entrada_servidor.urlDaFotoEnviada,
			medir,
			idBase: `${id}-${lado}`,
			exemplos: false
		})
	});
}
function Previa3D({ config, escolhas, aquecida, rotulo, fechar }) {
	const palco = (0, react.useRef)(null);
	const svgFrente = (0, react.useRef)(null);
	const svgVerso = (0, react.useRef)(null);
	const cena = (0, react.useRef)(null);
	const [carregando, setCarregando] = (0, react.useState)(true);
	const [erro, setErro] = (0, react.useState)("");
	const medir = require_entrada_servidor.useMedirTexto();
	const forma = FORMAS[config.molde] || FORMAS.caneca;
	const cores = require_entrada_servidor.coresDaPeca(config, escolhas, aquecida);
	const tinta = forma.vidro ? "#2E2A28" : cores.tinta;
	const arteVisivel = !(config.magica && !aquecida);
	(0, react.useEffect)(() => {
		const alvo = palco.current;
		if (!alvo) return;
		const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		let renderizador;
		try {
			renderizador = new three.WebGLRenderer({
				antialias: true,
				alpha: true
			});
		} catch {
			setErro("Seu aparelho não conseguiu abrir o 3D. A prévia 2D mostra a mesma arte.");
			setCarregando(false);
			return;
		}
		renderizador.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
		renderizador.outputColorSpace = three.SRGBColorSpace;
		renderizador.toneMapping = three.NeutralToneMapping;
		renderizador.toneMappingExposure = 1.15;
		alvo.appendChild(renderizador.domElement);
		renderizador.domElement.setAttribute("role", "img");
		renderizador.domElement.setAttribute("aria-label", rotulo);
		const mundo = new three.Scene();
		const camera = new three.PerspectiveCamera(28, 1, .1, 100);
		const raio = forma.raio / ESCALA;
		const altura = forma.altura / ESCALA;
		camera.position.set(0, altura * 1.05, altura * 3.2);
		mundo.add(new three.HemisphereLight(16777215, 15260879, 2.4));
		const sol = new three.DirectionalLight(16777215, 1.9);
		sol.position.set(3, 5, 6);
		mundo.add(sol);
		const contraluz = new three.DirectionalLight(16773606, .6);
		contraluz.position.set(-4, 2, -3);
		mundo.add(contraluz);
		const grupo = new three.Group();
		mundo.add(grupo);
		const materialCorpo = forma.vidro ? new three.MeshStandardMaterial({
			color: 15660277,
			transparent: true,
			opacity: .38,
			roughness: .08,
			metalness: 0
		}) : new three.MeshStandardMaterial({
			color: new three.Color(cores.peca),
			roughness: config.molde === "garrafa" ? .25 : .32,
			metalness: config.molde === "garrafa" ? .35 : 0
		});
		const raioBase = raio * forma.base;
		const corpo = new three.Mesh(new three.CylinderGeometry(raio, raioBase, altura, 96, 1, true), materialCorpo);
		grupo.add(corpo);
		const fundo = new three.Mesh(new three.CircleGeometry(raioBase, 64), materialCorpo);
		fundo.rotation.x = Math.PI / 2;
		fundo.position.y = -altura / 2;
		grupo.add(fundo);
		const materialInterior = new three.MeshStandardMaterial({
			color: new three.Color(cores.interior),
			roughness: .4,
			side: three.BackSide
		});
		const interior = new three.Mesh(new three.CylinderGeometry(raio * .96, raioBase * .96, altura * .98, 96, 1, true), materialInterior);
		interior.position.y = altura * .01;
		if (!forma.tampa) grupo.add(interior);
		const borda = new three.Mesh(new three.TorusGeometry(raio * .98, raio * .025, 12, 96), materialCorpo);
		borda.rotation.x = Math.PI / 2;
		borda.position.y = altura / 2;
		if (!forma.tampa) grupo.add(borda);
		let materialAlca = null;
		if (forma.alca) {
			materialAlca = new three.MeshStandardMaterial({
				color: new three.Color(cores.alca),
				roughness: .32
			});
			const alca = new three.Mesh(new three.TorusGeometry(altura * .24, altura * .04, 20, 48, Math.PI), materialAlca);
			alca.rotation.z = -Math.PI / 2;
			alca.position.set(raio * .98, forma.pires ? altura * .05 : altura * .04, 0);
			grupo.add(alca);
		}
		if (forma.pires) {
			const pires = new three.Mesh(new three.CylinderGeometry(raio * 1.55, raio * 1.25, altura * .08, 64), new three.MeshStandardMaterial({
				color: new three.Color(cores.peca),
				roughness: .35
			}));
			pires.position.y = -altura / 2 - altura * .04;
			grupo.add(pires);
		}
		if (forma.tampa) {
			const ombro = new three.Mesh(new three.CylinderGeometry(raio * .55, raio, altura * .1, 64), materialCorpo);
			ombro.position.y = altura / 2 + altura * .05;
			grupo.add(ombro);
			const tampa = new three.Mesh(new three.CylinderGeometry(raio * .5, raio * .5, altura * .12, 48), new three.MeshStandardMaterial({
				color: new three.Color(cores.peca).multiplyScalar(.6),
				roughness: .5
			}));
			tampa.position.y = altura / 2 + altura * .16;
			grupo.add(tampa);
		}
		const canvas = document.createElement("canvas");
		const escalaTextura = LARGURA_TEXTURA / (2 * Math.PI * forma.raio);
		canvas.width = LARGURA_TEXTURA;
		canvas.height = Math.round(forma.altura * escalaTextura);
		const textura = new three.CanvasTexture(canvas);
		textura.colorSpace = three.SRGBColorSpace;
		textura.anisotropy = renderizador.capabilities.getMaxAnisotropy();
		const materialArte = new three.MeshStandardMaterial({
			map: textura,
			transparent: true,
			roughness: .4,
			depthWrite: false
		});
		const arte = new three.Mesh(new three.CylinderGeometry(raio * 1.004, raioBase * 1.004, altura, 128, 1, true, -Math.PI, Math.PI * 2), materialArte);
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
		const sombra = new three.Mesh(new three.PlaneGeometry(raio * 4, raio * 4), new three.MeshBasicMaterial({
			map: new three.CanvasTexture(sombraCanvas),
			transparent: true,
			depthWrite: false
		}));
		sombra.rotation.x = -Math.PI / 2;
		sombra.position.y = -altura / 2 - (forma.pires ? altura * .085 : .005);
		mundo.add(sombra);
		cena.current = {
			textura,
			canvas,
			materialCorpo,
			materialAlca,
			materialInterior,
			arte
		};
		const controles = new three_examples_jsm_controls_OrbitControls_js.OrbitControls(camera, renderizador.domElement);
		controles.enablePan = false;
		controles.enableDamping = true;
		controles.minDistance = altura * 2.2;
		controles.maxDistance = altura * 5;
		controles.minPolarAngle = Math.PI * .25;
		controles.maxPolarAngle = Math.PI * .62;
		controles.autoRotate = !reduzido;
		controles.autoRotateSpeed = 1.2;
		controles.listenToKeyEvents(renderizador.domElement);
		renderizador.domElement.tabIndex = 0;
		controles.addEventListener("start", () => {
			controles.autoRotate = false;
		});
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
			mundo.traverse((objeto) => {
				const malha = objeto;
				if (malha.geometry) malha.geometry.dispose();
				const material = malha.material;
				if (Array.isArray(material)) material.forEach((m) => m.dispose());
				else if (material) material.dispose();
			});
			textura.dispose();
			renderizador.dispose();
			renderizador.domElement.remove();
			cena.current = null;
		};
	}, [config.molde]);
	(0, react.useEffect)(() => {
		const atual = cena.current;
		if (!atual) return;
		atual.materialCorpo.color = forma.vidro ? new three.Color(15660277) : new three.Color(cores.peca);
		atual.materialInterior.color = new three.Color(cores.interior);
		if (atual.materialAlca) atual.materialAlca.color = new three.Color(cores.alca);
	}, [
		cores.peca,
		cores.alca,
		cores.interior
	]);
	(0, react.useEffect)(() => {
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
				const [frente, verso] = await Promise.all([svgFrente.current && arteVisivel ? svgComoImagem(svgFrente.current, Math.round(w), Math.round(h)) : null, svgVerso.current && arteVisivel && config.personalizacao.verso ? svgComoImagem(svgVerso.current, Math.round(w), Math.round(h)) : null]);
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
				if (!cancelado) {
					setErro("Não deu para desenhar a arte no 3D agora. A prévia 2D continua valendo.");
					setCarregando(false);
				}
			}
		}, 120);
		return () => {
			cancelado = true;
			clearTimeout(espera);
		};
	}, [
		escolhas,
		aquecida,
		medir,
		arteVisivel
	]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "previa-3d",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				ref: palco,
				className: "previa-3d-palco"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "arte-escondida-caixa",
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ArteEscondida, {
					config,
					escolhas,
					lado: "frente",
					forma,
					tinta,
					medir,
					aoMontar: (svg) => {
						svgFrente.current = svg;
					}
				}), config.personalizacao.verso ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ArteEscondida, {
					config,
					escolhas,
					lado: "verso",
					forma,
					tinta,
					medir,
					aoMontar: (svg) => {
						svgVerso.current = svg;
					}
				}) : null]
			}),
			carregando ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "previa-3d-aviso",
				children: "Preparando o 3D…"
			}) : null,
			erro ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "previa-3d-aviso",
				role: "alert",
				children: erro
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "previa-3d-dica",
				children: "Arraste para girar · use as setas do teclado"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: "botao botao-escuro previa-3d-fechar",
				onClick: fechar,
				children: "Voltar para a prévia 2D"
			})
		]
	});
}
exports.default = Previa3D;
exports.temPrevia3D = temPrevia3D;
