Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
// \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod, mod.exports), cb = null), mod.exports);
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
let react_dom_server = require("react-dom/server");
let react = require("react");
let react_jsx_runtime = require("react/jsx-runtime");
// loja/src/componentes/AvisoCookies.tsx
var CHAVE$1 = "plc_cookie_consent";
function AvisoCookies() {
	const [mostrar, setMostrar] = (0, react.useState)(false);
	(0, react.useEffect)(() => {
		try {
			setMostrar(!localStorage.getItem(CHAVE$1));
		} catch {
			setMostrar(false);
		}
	}, []);
	if (!mostrar) return null;
	function fechar() {
		try {
			localStorage.setItem(CHAVE$1, "seen");
		} catch {
			setMostrar(false);
		}
		setMostrar(false);
	}
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "aviso-cookies",
		role: "region",
		"aria-label": "Aviso de privacidade",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
			"Usamos só o cookie do login e guardamos o carrinho no seu navegador. Nada de rastreamento. ",
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
				href: "/politica.html#privacidade",
				children: "Privacidade"
			}),
			"."
		] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
			type: "button",
			className: "botao botao-escuro",
			onClick: fechar,
			children: "Entendi"
		})]
	});
}
// js/pricing.js
var require_pricing = /* @__PURE__ */ __commonJSMin(((exports, module, this$2) => {
	(function(root, factory) {
		if (typeof module === "object" && module.exports) module.exports = factory();
		else root.PLCPricing = factory();
	})(typeof globalThis !== "undefined" ? globalThis : this$2, function() {
		"use strict";
		const PAYMENT_RULES = {
			pixDiscountPercent: 10,
			maxInstallments: 3,
			interestFreeInstallments: 3,
			monthlyInterestRate: 0,
			minInstallmentValue: 5
		};
		function round2(n) {
			return Math.round((Number(n) || 0) * 100) / 100;
		}
		function formatMoney(n) {
			return "R$\xA0" + (Number(n) || 0).toFixed(2).replace(".", ",");
		}
		function pixDiscountFor(amount) {
			return round2((Number(amount) || 0) * PAYMENT_RULES.pixDiscountPercent / 100);
		}
		function pixPriceFor(amount) {
			return round2((Number(amount) || 0) - pixDiscountFor(amount));
		}
		function installmentValueFor(amount, count) {
			const total = Number(amount) || 0;
			const rate = PAYMENT_RULES.monthlyInterestRate;
			const raw = count <= PAYMENT_RULES.interestFreeInstallments || rate <= 0 ? total / count : total * (rate / (1 - Math.pow(1 + rate, -count)));
			return Math.ceil(raw * 100) / 100;
		}
		function installmentCountFor(amount) {
			const total = Number(amount) || 0;
			if (total <= 0) return 1;
			let count = Math.max(1, PAYMENT_RULES.maxInstallments);
			while (count > 1 && installmentValueFor(total, count) < PAYMENT_RULES.minInstallmentValue) count--;
			return count;
		}
		function installmentPlanFor(amount) {
			const total = Number(amount) || 0;
			const count = installmentCountFor(total);
			const value = installmentValueFor(total, count);
			return {
				count,
				value,
				interestFree: count <= PAYMENT_RULES.interestFreeInstallments || PAYMENT_RULES.monthlyInterestRate <= 0,
				totalWithInterest: round2(count <= PAYMENT_RULES.interestFreeInstallments ? total : value * count)
			};
		}
		function installmentLabelFor(amount) {
			const plan = installmentPlanFor(amount);
			if (plan.count <= 1) return `${formatMoney(amount)} à vista no cartão`;
			return `${plan.count}x de ${formatMoney(plan.value)} ${plan.interestFree ? "sem juros" : "com juros"}`;
		}
		function paymentSummaryFor(amount) {
			const total = round2(amount);
			return {
				price: total,
				pixPrice: pixPriceFor(total),
				pixSavings: pixDiscountFor(total),
				pixDiscountPercent: PAYMENT_RULES.pixDiscountPercent,
				installment: installmentPlanFor(total),
				installmentLabel: installmentLabelFor(total)
			};
		}
		return {
			PAYMENT_RULES,
			round2,
			formatMoney,
			pixDiscountFor,
			pixPriceFor,
			installmentValueFor,
			installmentCountFor,
			installmentPlanFor,
			installmentLabelFor,
			paymentSummaryFor
		};
	});
}));
// js/regras-produto.js
var require_regras_produto = /* @__PURE__ */ __commonJSMin(((exports, module, this$1) => {
	(function(root, factory) {
		if (typeof module === "object" && module.exports) module.exports = factory();
		else root.ArteRegrasProduto = factory();
	})(typeof globalThis !== "undefined" ? globalThis : this$1, function() {
		"use strict";
		const MOLDES = [
			"caneca",
			"xicara",
			"garrafa",
			"copo",
			"azulejo",
			"plano",
			"botton",
			"caixa",
			"flor",
			"foto",
			"nenhum"
		];
		const LETRAS = [
			{
				id: "cursiva",
				nome: "Cursiva"
			},
			{
				id: "classica",
				nome: "Clássica"
			},
			{
				id: "delicada",
				nome: "Delicada"
			}
		];
		const ARTES = [
			{
				id: "nome",
				nome: "Só o nome"
			},
			{
				id: "flor",
				nome: "Florzinha"
			},
			{
				id: "brasilia",
				nome: "Brasília"
			},
			{
				id: "fotos",
				nome: "Com fotos"
			}
		];
		const CAMPOS_TEXTO = [
			{
				id: "nome",
				rotulo: "Nome",
				limitePadrao: 20,
				limiteMaximo: 40
			},
			{
				id: "frase",
				rotulo: "Frase",
				limitePadrao: 60,
				limiteMaximo: 120
			},
			{
				id: "data",
				rotulo: "Data",
				limitePadrao: 20,
				limiteMaximo: 30
			},
			{
				id: "observacoes",
				rotulo: "Observações",
				limitePadrao: 300,
				limiteMaximo: 500
			}
		];
		const MAX_FOTOS = 8;
		const QTD_MAXIMA = 50;
		const QTD_CONDICAO_ESPECIAL = 10;
		const ID_VALIDO = /^[a-z0-9][a-z0-9-]{0,39}$/;
		const HEX_VALIDO = /^#[0-9a-fA-F]{6}$/;
		const ID_FOTO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
		const CHAVE_FOTO = /^[0-9a-f]{32}$/;
		function round2(n) {
			return Math.round((Number(n) || 0) * 100) / 100;
		}
		function texto(valor, limite) {
			return String(valor == null ? "" : valor).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "").replace(/\r\n?/g, "\n").trim().slice(0, limite);
		}
		function numero(valor, min, max, padrao) {
			const n = Number(valor);
			if (!Number.isFinite(n)) return padrao;
			return Math.min(max, Math.max(min, n));
		}
		function apelidoDe(valor) {
			return String(valor == null ? "" : valor).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
		}
		function normalizarOpcao(bruta, usados) {
			const nome = texto(bruta && bruta.nome, 60);
			if (!nome) return null;
			let id = ID_VALIDO.test(String(bruta.id || "")) ? String(bruta.id) : apelidoDe(nome);
			if (!id || usados.has(id)) return null;
			usados.add(id);
			const opcao = {
				id,
				nome,
				preco: round2(numero(bruta.preco, -1e4, 1e4, 0)),
				esgotado: Boolean(bruta.esgotado)
			};
			if (HEX_VALIDO.test(String(bruta.hex || ""))) opcao.hex = String(bruta.hex).toUpperCase();
			return opcao;
		}
		function normalizarVariacoes(lista) {
			if (!Array.isArray(lista)) return [];
			const grupos = [];
			const ids = /* @__PURE__ */ new Set();
			for (const bruto of lista.slice(0, 6)) {
				const nome = texto(bruto && bruto.nome, 60);
				if (!nome) continue;
				let id = ID_VALIDO.test(String(bruto.id || "")) ? String(bruto.id) : apelidoDe(nome);
				if (!id || ids.has(id)) continue;
				ids.add(id);
				const usados = /* @__PURE__ */ new Set();
				const opcoes = (Array.isArray(bruto.opcoes) ? bruto.opcoes : []).slice(0, 30).map((o) => normalizarOpcao(o, usados)).filter(Boolean);
				if (!opcoes.length) continue;
				const previa = [
					"alca",
					"peca",
					"tamanho"
				].includes(bruto.previa) ? bruto.previa : null;
				grupos.push({
					id,
					nome,
					previa,
					opcoes
				});
			}
			return grupos;
		}
		function normalizarAdicionais(lista) {
			if (!Array.isArray(lista)) return [];
			const usados = /* @__PURE__ */ new Set();
			return lista.slice(0, 8).map((o) => normalizarOpcao(o, usados)).filter(Boolean).map((o) => ({
				...o,
				preco: Math.max(0, o.preco)
			}));
		}
		function normalizarFaixas(lista) {
			if (!Array.isArray(lista)) return [];
			return lista.map((f) => ({
				min: Math.round(numero(f && f.min, 2, 1e3, 0)),
				preco: round2(numero(f && f.preco, .01, 1e5, 0))
			})).filter((f) => f.min >= 2 && f.preco > 0).sort((a, b) => a.min - b.min).filter((f, i, todas) => i === 0 || f.min !== todas[i - 1].min).slice(0, 5);
		}
		function normalizarPersonalizacao(bruta) {
			const p = bruta && typeof bruta === "object" ? bruta : {};
			const campos = {};
			for (const campo of CAMPOS_TEXTO) {
				const c = p.campos && p.campos[campo.id];
				if (!c || !c.ativo) continue;
				campos[campo.id] = {
					ativo: true,
					obrigatorio: Boolean(c.obrigatorio),
					limite: Math.round(numero(c.limite, 1, campo.limiteMaximo, campo.limitePadrao)),
					rotulo: texto(c.rotulo, 40) || campo.rotulo
				};
			}
			const letras = (Array.isArray(p.letras) ? p.letras : []).filter((l) => LETRAS.some((x) => x.id === l));
			const artes = (Array.isArray(p.artes) ? p.artes : []).filter((a) => ARTES.some((x) => x.id === a));
			const maxFotos = Math.round(numero(p.fotos && p.fotos.max, 0, MAX_FOTOS, 0));
			const minFotos = Math.round(numero(p.fotos && p.fotos.min, 0, maxFotos, 0));
			return {
				ativa: Boolean(p.ativa) && (Object.keys(campos).length > 0 || maxFotos > 0 || artes.length > 0),
				campos,
				letras: [...new Set(letras)],
				artes: [...new Set(artes)],
				fotos: {
					min: minFotos,
					max: maxFotos,
					formato: p.fotos && p.fotos.formato === "quadrado" ? "quadrado" : "circulo"
				},
				verso: Boolean(p.verso)
			};
		}
		function normalizarArea(bruta) {
			if (!bruta || typeof bruta !== "object") return null;
			const x = numero(bruta.x, 0, 1, NaN), y = numero(bruta.y, 0, 1, NaN);
			const w = numero(bruta.w, .05, 1, NaN), h = numero(bruta.h, .05, 1, NaN);
			if ([
				x,
				y,
				w,
				h
			].some((v) => !Number.isFinite(v))) return null;
			return {
				x: round2(x * 100) / 100,
				y: round2(y * 100) / 100,
				w: round2(Math.min(w, 1 - x) * 100) / 100,
				h: round2(Math.min(h, 1 - y) * 100) / 100,
				curva: Boolean(bruta.curva)
			};
		}
		function normalizarConfig(bruta) {
			const c = bruta && typeof bruta === "object" ? bruta : {};
			const molde = MOLDES.includes(c.molde) ? c.molde : "nenhum";
			return {
				categorias: [...new Set((Array.isArray(c.categorias) ? c.categorias : []).map((s) => String(s)).filter((s) => ID_VALIDO.test(s)))].slice(0, 20),
				medida: texto(c.medida, 40),
				codigo: texto(c.codigo, 30),
				cuidados: texto(c.cuidados, 600),
				aviso: ["ultimas", "consultar"].includes(c.aviso) ? c.aviso : null,
				molde,
				formato: texto(c.formato, 20),
				corPeca: HEX_VALIDO.test(String(c.corPeca || "")) ? String(c.corPeca).toUpperCase() : "#FFFFFF",
				corAlca: HEX_VALIDO.test(String(c.corAlca || "")) ? String(c.corAlca).toUpperCase() : null,
				magica: Boolean(c.magica),
				moldeFoto: molde === "foto" ? {
					foto: texto(c.moldeFoto && c.moldeFoto.foto, 300) || null,
					area: normalizarArea(c.moldeFoto && c.moldeFoto.area)
				} : null,
				variacoes: normalizarVariacoes(c.variacoes),
				adicionais: normalizarAdicionais(c.adicionais),
				faixas: normalizarFaixas(c.faixas),
				qtdMinima: Math.round(numero(c.qtdMinima, 1, 100, 1)),
				personalizacao: normalizarPersonalizacao(c.personalizacao),
				peso: round2(numero(c.peso, .01, 30, .45) * 1e3) / 1e3,
				caixa: {
					largura: round2(numero(c.caixa && c.caixa.largura, 1, 100, 12)),
					altura: round2(numero(c.caixa && c.caixa.altura, 1, 100, 12)),
					comprimento: round2(numero(c.caixa && c.caixa.comprimento, 1, 100, 12))
				}
			};
		}
		function precoBase(produto, qtd) {
			const faixas = produto.config && produto.config.faixas || [];
			let preco = produto.price;
			for (const f of faixas) if (qtd >= f.min) preco = f.preco;
			return preco;
		}
		function opcaoEscolhida(grupo, escolhas) {
			const id = escolhas && escolhas.variacoes ? escolhas.variacoes[grupo.id] : null;
			return grupo.opcoes.find((o) => o.id === id) || null;
		}
		function precoUnitario(produto, escolhas, qtd) {
			const config = produto.config || {};
			let preco = precoBase(produto, qtd || 1);
			for (const grupo of config.variacoes || []) {
				const opcao = opcaoEscolhida(grupo, escolhas) || grupo.opcoes.find((o) => !o.esgotado) || grupo.opcoes[0];
				if (opcao) preco += opcao.preco;
			}
			const marcados = new Set(escolhas && escolhas.adicionais || []);
			for (const adicional of config.adicionais || []) if (marcados.has(adicional.id)) preco += adicional.preco;
			return round2(Math.max(.01, preco));
		}
		function escolhasPadrao(produto) {
			const config = produto.config || {};
			const variacoes = {};
			for (const grupo of config.variacoes || []) {
				const opcao = grupo.opcoes.find((o) => !o.esgotado) || grupo.opcoes[0];
				if (opcao) variacoes[grupo.id] = opcao.id;
			}
			const pers = config.personalizacao || {};
			const personalizacao = {};
			if (pers.ativa) {
				if (pers.letras && pers.letras.length) personalizacao.letra = pers.letras[0];
				if (pers.artes && pers.artes.length) personalizacao.arte = pers.artes[0];
				personalizacao.fotos = [];
				personalizacao.aprovarWhatsApp = true;
			}
			return {
				variacoes,
				adicionais: [],
				personalizacao
			};
		}
		function validarEscolhas(produto, brutas, qtd) {
			const config = produto.config || {};
			const erros = [];
			const escolhas = {
				variacoes: {},
				adicionais: [],
				personalizacao: {}
			};
			const entrada = brutas && typeof brutas === "object" ? brutas : {};
			for (const grupo of config.variacoes || []) {
				const id = entrada.variacoes ? entrada.variacoes[grupo.id] : void 0;
				const opcao = grupo.opcoes.find((o) => o.id === id);
				if (!opcao) {
					erros.push(`Escolha: ${grupo.nome}.`);
					continue;
				}
				if (opcao.esgotado) {
					erros.push(`${grupo.nome} "${opcao.nome}" está esgotado.`);
					continue;
				}
				escolhas.variacoes[grupo.id] = opcao.id;
			}
			const adicionaisValidos = new Map((config.adicionais || []).map((a) => [a.id, a]));
			for (const id of Array.isArray(entrada.adicionais) ? entrada.adicionais : []) {
				const adicional = adicionaisValidos.get(id);
				if (!adicional) {
					erros.push("Adicional inválido.");
					continue;
				}
				if (adicional.esgotado) {
					erros.push(`"${adicional.nome}" está esgotado.`);
					continue;
				}
				if (!escolhas.adicionais.includes(id)) escolhas.adicionais.push(id);
			}
			const pers = config.personalizacao || {};
			const bruta = entrada.personalizacao && typeof entrada.personalizacao === "object" ? entrada.personalizacao : {};
			if (pers.ativa) {
				for (const [id, campo] of Object.entries(pers.campos || {})) {
					const valor = texto(String(bruta[id] == null ? "" : bruta[id]), 2e3);
					if (valor.length > campo.limite) erros.push(`${campo.rotulo}: até ${campo.limite} caracteres.`);
					else if (campo.obrigatorio && !valor) erros.push(`Preencha: ${campo.rotulo}.`);
					else if (valor) escolhas.personalizacao[id] = valor;
				}
				if (pers.letras && pers.letras.length) escolhas.personalizacao.letra = pers.letras.includes(bruta.letra) ? bruta.letra : pers.letras[0];
				if (pers.artes && pers.artes.length) escolhas.personalizacao.arte = pers.artes.includes(bruta.arte) ? bruta.arte : pers.artes[0];
				const usaFotos = pers.fotos && pers.fotos.max > 0 && (!pers.artes || !pers.artes.length || !pers.artes.includes("fotos") || escolhas.personalizacao.arte === "fotos");
				const fotos = Array.isArray(bruta.fotos) ? bruta.fotos : [];
				if (usaFotos) {
					const minimo = Math.max(pers.fotos.min, escolhas.personalizacao.arte === "fotos" ? 1 : 0);
					if (fotos.length > pers.fotos.max) erros.push(`Envie no máximo ${pers.fotos.max} ${pers.fotos.max === 1 ? "foto" : "fotos"}.`);
					else if (fotos.length < minimo) erros.push(`Envie pelo menos ${minimo} ${minimo === 1 ? "foto" : "fotos"}.`);
					const vistas = /* @__PURE__ */ new Set();
					const limpas = [];
					for (const f of fotos.slice(0, pers.fotos.max)) {
						if (!f || !ID_FOTO.test(String(f.id)) || !CHAVE_FOTO.test(String(f.chave)) || vistas.has(f.id)) {
							erros.push("Foto inválida. Envie de novo.");
							break;
						}
						vistas.add(f.id);
						limpas.push({
							id: f.id,
							chave: f.chave,
							x: round2(numero(f.x, -1, 1, 0)),
							y: round2(numero(f.y, -1, 1, 0)),
							zoom: round2(numero(f.zoom, 1, 3, 1))
						});
					}
					escolhas.personalizacao.fotos = limpas;
				}
				escolhas.personalizacao.aprovarWhatsApp = bruta.aprovarWhatsApp !== false;
			}
			const quantidade = Number(qtd);
			const minima = config.qtdMinima || 1;
			if (!Number.isInteger(quantidade) || quantidade < minima || quantidade > QTD_MAXIMA) erros.push(minima > 1 ? `Quantidade entre ${minima} e ${QTD_MAXIMA}.` : `Quantidade entre 1 e ${QTD_MAXIMA}.`);
			return {
				ok: erros.length === 0,
				erros,
				escolhas
			};
		}
		function nomeDaLetra(id) {
			const l = LETRAS.find((x) => x.id === id);
			return l ? l.nome : "";
		}
		function nomeDaArte(id) {
			const a = ARTES.find((x) => x.id === id);
			return a ? a.nome : "";
		}
		function resumoDasEscolhas(produto, escolhas) {
			const config = produto.config || {};
			const linhas = [];
			for (const grupo of config.variacoes || []) {
				const opcao = opcaoEscolhida(grupo, escolhas);
				if (opcao) linhas.push({
					rotulo: grupo.nome,
					valor: opcao.nome
				});
			}
			const marcados = new Set(escolhas && escolhas.adicionais || []);
			for (const adicional of config.adicionais || []) if (marcados.has(adicional.id)) linhas.push({
				rotulo: "Adicional",
				valor: adicional.nome
			});
			const pers = escolhas && escolhas.personalizacao || {};
			const campos = config.personalizacao && config.personalizacao.campos || {};
			for (const campo of CAMPOS_TEXTO) if (pers[campo.id]) linhas.push({
				rotulo: campos[campo.id] && campos[campo.id].rotulo || campo.rotulo,
				valor: pers[campo.id]
			});
			if (pers.arte) linhas.push({
				rotulo: "Arte",
				valor: nomeDaArte(pers.arte)
			});
			if (pers.letra) linhas.push({
				rotulo: "Letra",
				valor: nomeDaLetra(pers.letra)
			});
			if (pers.fotos && pers.fotos.length) linhas.push({
				rotulo: "Fotos",
				valor: String(pers.fotos.length)
			});
			if (config.personalizacao && config.personalizacao.ativa) linhas.push({
				rotulo: "Aprovar a arte pelo WhatsApp",
				valor: pers.aprovarWhatsApp === false ? "não" : "sim"
			});
			return linhas;
		}
		function chaveDaLinha(id, escolhas) {
			const e = escolhas || {};
			const variacoes = Object.keys(e.variacoes || {}).sort().map((k) => `${k}=${e.variacoes[k]}`).join(",");
			const adicionais = [...e.adicionais || []].sort().join(",");
			const pers = e.personalizacao || {};
			const fotos = (pers.fotos || []).map((f) => `${f.id}:${f.x}:${f.y}:${f.zoom}`).join(",");
			return `${id}#${variacoes}#${adicionais}#${[
				"nome",
				"frase",
				"data",
				"observacoes",
				"letra",
				"arte"
			].map((k) => `${k}=${pers[k] || ""}`).join("|")}#${fotos}#${pers.aprovarWhatsApp === false ? 0 : 1}`;
		}
		return {
			MOLDES,
			LETRAS,
			ARTES,
			CAMPOS_TEXTO,
			MAX_FOTOS,
			QTD_MAXIMA,
			QTD_CONDICAO_ESPECIAL,
			round2,
			normalizarConfig,
			normalizarVariacoes,
			normalizarPersonalizacao,
			precoBase,
			precoUnitario,
			escolhasPadrao,
			validarEscolhas,
			resumoDasEscolhas,
			chaveDaLinha,
			nomeDaLetra,
			nomeDaArte
		};
	});
}));
// loja/src/compartilhado.ts
var import_pricing = /* @__PURE__ */ __toESM(require_pricing());
var import_regras_produto = /* @__PURE__ */ __toESM(require_regras_produto());
var precos = import_pricing.default;
var regras = import_regras_produto.default;
function paraRegras(produto) {
	return {
		price: produto.preco,
		config: produto.config
	};
}
function precoUnitario(produto, escolhas, qtd) {
	return regras.precoUnitario(paraRegras(produto), escolhas, qtd);
}
function escolhasPadrao(produto) {
	return regras.escolhasPadrao(paraRegras(produto));
}
function validarEscolhas(produto, escolhas, qtd) {
	return regras.validarEscolhas(paraRegras(produto), escolhas, qtd);
}
function resumoDasEscolhas(produto, escolhas) {
	return regras.resumoDasEscolhas(paraRegras(produto), escolhas);
}
function dinheiro(valor) {
	return precos.formatMoney(valor).replace(/\B(?=(\d{3})+(?!\d),)/g, ".");
}
function precoNoPix(valor) {
	return precos.pixPriceFor(valor);
}
function parcelas(valor) {
	const plano = precos.installmentPlanFor(valor);
	if (plano.count <= 1) return "à vista no cartão";
	return `${plano.count}x de ${dinheiro(plano.value)}${plano.interestFree ? " sem juros" : ""}`;
}
function linkWhatsApp(numero, texto) {
	if (!texto) return `https://wa.me/${numero}`;
	return `https://api.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(texto)}`;
}
// loja/src/estado/carrinho.ts
var CHAVE_CARRINHO = "arte_carrinho_v1";
var VAZIO$1 = {
	linhas: [],
	aberto: false,
	aviso: null
};
var estado = VAZIO$1;
var carregado$1 = false;
var ouvintes$2 = /* @__PURE__ */ new Set();
function avisar$1() {
	for (const ouvinte of ouvintes$2) ouvinte();
}
function lerDoNavegador() {
	try {
		const bruto = JSON.parse(localStorage.getItem("arte_carrinho_v1") || "[]");
		if (!Array.isArray(bruto)) return [];
		return bruto.filter((l) => l && Number.isInteger(l.id) && Number.isInteger(l.qty) && typeof l.chave === "string");
	} catch {
		return [];
	}
}
function gravar() {
	try {
		localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(estado.linhas));
	} catch {
		estado = {
			...estado,
			aviso: "Seu navegador não deixou guardar o carrinho. Ele some se você fechar a página."
		};
	}
}
function garantirCarregado() {
	if (carregado$1 || typeof window === "undefined") return;
	carregado$1 = true;
	estado = {
		...estado,
		linhas: lerDoNavegador()
	};
	window.addEventListener("storage", (evento) => {
		if (evento.key !== "arte_carrinho_v1") return;
		estado = {
			...estado,
			linhas: lerDoNavegador()
		};
		avisar$1();
	});
}
function mudar(novo, salvar = true) {
	estado = {
		...estado,
		...novo
	};
	if (salvar && novo.linhas) gravar();
	avisar$1();
}
var carrinho = {
	ler() {
		garantirCarregado();
		return estado;
	},
	assinar(ouvinte) {
		garantirCarregado();
		ouvintes$2.add(ouvinte);
		return () => ouvintes$2.delete(ouvinte);
	},
	adicionar(linha) {
		garantirCarregado();
		const chave = regras.chaveDaLinha(linha.id, linha.escolhas);
		mudar({
			linhas: estado.linhas.find((l) => l.chave === chave) ? estado.linhas.map((l) => l.chave === chave ? {
				...l,
				qty: Math.min(regras.QTD_MAXIMA, l.qty + linha.qty),
				erro: void 0
			} : l) : [...estado.linhas, {
				...linha,
				chave
			}],
			aberto: true
		});
	},
	quantidade(chave, qty) {
		mudar({ linhas: estado.linhas.map((l) => l.chave === chave ? {
			...l,
			qty: Math.min(regras.QTD_MAXIMA, Math.max(l.qtdMinima || 1, qty))
		} : l) });
	},
	remover(chave) {
		mudar({ linhas: estado.linhas.filter((l) => l.chave !== chave) });
	},
	atualizar(atualizadas) {
		mudar({ linhas: atualizadas });
	},
	esvaziar() {
		mudar({ linhas: [] });
	},
	abrir() {
		mudar({ aberto: true }, false);
	},
	fechar() {
		mudar({ aberto: false }, false);
	}
};
function useCarrinho() {
	return (0, react.useSyncExternalStore)(carrinho.assinar, carrinho.ler, () => VAZIO$1);
}
function totalDeItens(linhas) {
	return linhas.reduce((soma, l) => soma + l.qty, 0);
}
function subtotal(linhas) {
	return Math.round(linhas.reduce((soma, l) => soma + l.preco * l.qty, 0) * 100) / 100;
}
// loja/src/estado/sessao.ts
var INICIAL = {
	usuario: null,
	conferida: false
};
var sessao = INICIAL;
var pedida = false;
var ouvintes$1 = /* @__PURE__ */ new Set();
function avisar() {
	for (const ouvinte of ouvintes$1) ouvinte();
}
async function conferir() {
	if (pedida || typeof window === "undefined") return;
	pedida = true;
	try {
		const resposta = await fetch("/api/auth/sessao", { credentials: "same-origin" });
		const u = resposta.ok ? (await resposta.json()).user : null;
		sessao = {
			conferida: true,
			usuario: u ? {
				nome: String(u.name || ""),
				primeiroNome: String(u.name || "").trim().split(/\s+/)[0] || "cliente",
				email: String(u.email || ""),
				cpf: u.cpf || null,
				cep: u.cep || null,
				admin: Boolean(u.isAdmin)
			} : null
		};
	} catch {
		sessao = {
			usuario: null,
			conferida: true
		};
	}
	avisar();
}
function assinar$1(ouvinte) {
	ouvintes$1.add(ouvinte);
	conferir();
	return () => ouvintes$1.delete(ouvinte);
}
function useSessao() {
	return (0, react.useSyncExternalStore)(assinar$1, () => sessao, () => INICIAL);
}
// loja/src/componentes/Foto.tsx
var DO_PAINEL = /^\/api\/products\/photos\/[0-9a-f-]{36}$/;
var LOCAL_JPG = /^\/img\/.+\.jpe?g$/;
function urlDaFoto(url, largura) {
	return DO_PAINEL.test(url) ? `${url}?w=${largura}` : url;
}
function Foto({ src, alt, larguras = [400, 600], sizes, className, prioridade = false, largura = 600, altura = 750 }) {
	const carregamento = prioridade ? { fetchPriority: "high" } : { loading: "lazy" };
	if (DO_PAINEL.test(src)) {
		const srcSet = larguras.map((w) => `${src}?w=${w} ${w}w`).join(", ");
		return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
			className,
			src: `${src}?w=${larguras[larguras.length - 1]}`,
			srcSet,
			sizes,
			alt,
			width: largura,
			height: altura,
			decoding: "async",
			...carregamento
		});
	}
	if (LOCAL_JPG.test(src)) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("picture", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("source", {
		type: "image/webp",
		srcSet: src.replace(/\.jpe?g$/, ".webp")
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
		className,
		src,
		alt,
		width: largura,
		height: altura,
		decoding: "async",
		...carregamento
	})] });
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
		className,
		src,
		alt,
		width: largura,
		height: altura,
		decoding: "async",
		...carregamento
	});
}
// loja/src/componentes/Icone.tsx
var CAMINHOS = {
	busca: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5",
	whatsapp: "M4 20l1.4-4A8 8 0 1 1 8.2 19zM9 9.5c.3 2.4 2.2 4.6 5 5.3l1-1.3-1.8-1-.8.7c-1-.4-1.8-1.2-2.2-2.2l.7-.8-1-1.8z",
	pessoa: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6",
	sacola: "M5 8h14l-1.2 12H6.2zM9 8V6.5a3 3 0 0 1 6 0V8",
	menu: "M4 7h16M4 12h16M4 17h16",
	menuCurto: "M4 7h16M4 12h16M4 17h10",
	seta: "M6 9l6 6 6-6",
	setaDireita: "M9 6l6 6-6 6",
	setaEsquerda: "M15 6l-6 6 6 6",
	fechar: "M6 6l12 12M18 6L6 18",
	coracao: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
	lapis: "M4 20l4-1 11-11-3-3L5 16zM14 6l3 3",
	caminhao: "M3 7h11v9H3zM14 10h4l3 3v3h-7M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4M17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
	cartao: "M3 6h18v12H3zM3 10h18M7 15h3",
	caixas: "M3 8l9-4 9 4-9 4zM3 8v8l9 4 9-4V8M12 12v8",
	relogio: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 8v4l3 2",
	instagram: "M8.5 3.5h7a5 5 0 0 1 5 5v7a5 5 0 0 1-5 5h-7a5 5 0 0 1-5-5v-7a5 5 0 0 1 5-5zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17.2 6.8h.01",
	envio: "M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3",
	foto: "M3 5h18v14H3zM9 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4M21 16l-5-5-8 8",
	lixeira: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
	check: "M5 12.5l4.5 4.5L19 7.5",
	alerta: "M12 4l9 16H3zM12 10v4M12 17h.01",
	cadeado: "M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3",
	mais: "M12 5v14M5 12h14",
	menos: "M5 12h14",
	local: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
	presente: "M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0",
	tampa: "M4 12h16M6 12a6 3 0 0 0 12 0M5 12a7 2 0 0 1 14 0",
	buque: "M12 21v-9M12 12l-4-5M12 12l4-5M8 7a2 2 0 1 0 0-.1M16 7a2 2 0 1 0 0-.1M12 6a2 2 0 1 0 0-.1M9 21h6",
	caixaMdf: "M4 9h16v11H4zM3 6h18v3H3zM9 13h6",
	zoomMais: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5M8 11h6M11 8v6",
	zoomMenos: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5M8 11h6",
	calor: "M12 3c2 3-2 4 0 7s-2 4 0 7M7 6c1.5 2.5-1.5 3.5 0 6M17 6c1.5 2.5-1.5 3.5 0 6M5 21h14",
	filtro: "M4 6h16M7 12h10M10 18h4",
	topo: "M6 15l6-6 6 6",
	girar: "M4 12a8 8 0 0 1 13.7-5.7L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.7L4 15.5M4 20v-4.5h4.5"
};
function Icone({ nome, tamanho = 22, traco = 1.7, className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
		className,
		width: tamanho,
		height: tamanho,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: traco,
		strokeLinecap: "round",
		strokeLinejoin: "round",
		"aria-hidden": "true",
		focusable: "false",
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: CAMINHOS[nome] })
	});
}
// loja/src/componentes/Marca.tsx
function Florzinha({ tamanho = 24, cor = "currentColor", traco = 1.2, miolo = true }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		width: tamanho,
		height: tamanho,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: cor,
		strokeWidth: traco,
		"aria-hidden": "true",
		focusable: "false",
		children: [[
			0,
			72,
			144,
			216,
			288
		].map((angulo) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ellipse", {
			cx: "12",
			cy: "6.5",
			rx: "3",
			ry: "5",
			transform: `rotate(${angulo} 12 12)`
		}, angulo)), miolo ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
			cx: "12",
			cy: "12",
			r: "1.6"
		}) : null]
	});
}
function CanecaComFlor({ tamanho = 34, cor = "#CD7031", traco = 2.2 }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		width: tamanho,
		height: tamanho * 1.1,
		viewBox: "0 0 40 44",
		fill: "none",
		stroke: cor,
		strokeWidth: traco,
		strokeLinecap: "round",
		strokeLinejoin: "round",
		"aria-hidden": "true",
		focusable: "false",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M8 18v12a8 8 0 0 0 8 8h4a8 8 0 0 0 8-8V18" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M28 22h2a4 4 0 0 1 0 8h-2" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M18 30c0-6 1-13 3-20" }),
			[
				0,
				72,
				144,
				216,
				288
			].map((angulo) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ellipse", {
				cx: "21",
				cy: "4.5",
				rx: "1.7",
				ry: "3.2",
				transform: `rotate(${angulo} 21 8)`
			}, angulo))
		]
	});
}
function Logo({ compacto = false }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
		className: `logo${compacto ? " logo-compacto" : ""}`,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: "logo-linha",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "logo-arte",
					children: "arte"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CanecaComFlor, { tamanho: compacto ? 24 : 34 })]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "logo-canecas",
				children: "Canecas"
			}),
			compacto ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "logo-personalizados",
				children: "personalizados"
			})
		]
	});
}
function SeloPersonalizavel({ tamanho = 132 }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		className: "selo-girando",
		width: tamanho,
		height: tamanho,
		viewBox: "0 0 132 132",
		role: "img",
		"aria-label": "A frase pode ser personalizada",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				id: "selo-circulo",
				d: "M66 66m-48 0a48 48 0 1 1 96 0a48 48 0 1 1 -96 0"
			}) }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx: "66",
				cy: "66",
				r: "64",
				fill: "var(--papel)"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
				className: "selo-texto",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
					fontFamily: "Josefin Sans, sans-serif",
					fontSize: "12",
					letterSpacing: "2.55",
					fill: "var(--tinta)",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textPath", {
						href: "#selo-circulo",
						children: "FRASE PODE SER PERSONALIZADA •"
					})
				})
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
				fill: "none",
				stroke: "var(--terracota)",
				strokeWidth: "2",
				strokeLinecap: "round",
				transform: "translate(48 46) scale(0.9)",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M8 18v12a8 8 0 0 0 8 8h4a8 8 0 0 0 8-8V18" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M28 22h2a4 4 0 0 1 0 8h-2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M18 30c0-6 1-13 3-20" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "21",
						cy: "6",
						r: "3.5"
					})
				]
			})
		]
	});
}
function Onda({ cor = "var(--terracota-rodape)" }) {
	const trechos = Array.from({ length: 23 }, (_, i) => `T ${(i + 2) * 60} 20`).join(" ");
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
		className: "onda",
		viewBox: "0 0 1440 40",
		preserveAspectRatio: "none",
		"aria-hidden": "true",
		focusable: "false",
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			d: `M0 40V20 Q 30 0 60 20 ${trechos} V40z`,
			fill: cor
		})
	});
}
// loja/src/componentes/Previa.tsx
var FONTES = {
	cursiva: {
		familia: "Allura, cursive",
		peso: 400,
		estilo: "normal",
		caixa: "none",
		espaco: 0,
		fator: .4,
		escala: 1
	},
	classica: {
		familia: "Fraunces, serif",
		peso: 500,
		estilo: "italic",
		caixa: "none",
		espaco: 0,
		fator: .52,
		escala: .72
	},
	delicada: {
		familia: "Josefin Sans, sans-serif",
		peso: 300,
		estilo: "normal",
		caixa: "uppercase",
		espaco: .22,
		fator: .62,
		escala: .46
	}
};
var contexto = null;
function medirTexto(texto, fonte, tamanho, medir) {
	const conteudo = fonte.caixa === "uppercase" ? texto.toUpperCase() : texto;
	if (medir && typeof document !== "undefined") {
		if (!contexto) contexto = document.createElement("canvas").getContext("2d");
		if (contexto) {
			contexto.font = `${fonte.estilo} ${fonte.peso} ${tamanho}px ${fonte.familia}`;
			return contexto.measureText(conteudo).width + conteudo.length * fonte.espaco * tamanho;
		}
	}
	return conteudo.length * tamanho * (fonte.fator + fonte.espaco);
}
function tamanhoQueCabe(texto, fonte, base, largura, medir) {
	const medido = medirTexto(texto, fonte, base, medir);
	if (medido <= largura) return base;
	return Math.max(base * .35, base * largura / medido);
}
function quebrarLinhas(texto, fonte, tamanho, largura, maxLinhas, medir) {
	const palavras = texto.split(/\s+/).filter(Boolean);
	const linhas = [];
	let atual = "";
	for (const palavra of palavras) {
		const tentativa = atual ? `${atual} ${palavra}` : palavra;
		if (atual && medirTexto(tentativa, fonte, tamanho, medir) > largura && linhas.length < maxLinhas - 1) {
			linhas.push(atual);
			atual = palavra;
		} else atual = tentativa;
	}
	if (atual) linhas.push(atual);
	return linhas;
}
function luminancia(hex) {
	const n = parseInt(hex.slice(1), 16);
	const canais = [
		n >> 16 & 255,
		n >> 8 & 255,
		n & 255
	].map((c) => {
		const v = c / 255;
		return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4);
	});
	return .2126 * canais[0] + .7152 * canais[1] + .0722 * canais[2];
}
function escurecer(hex, quanto) {
	const n = parseInt(hex.slice(1), 16);
	const ajusta = (c) => Math.max(0, Math.min(255, Math.round(c * (1 - quanto))));
	const r = ajusta(n >> 16 & 255), g = ajusta(n >> 8 & 255), b = ajusta(n & 255);
	return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
function coresDaPeca(config, escolhas, aquecida) {
	let peca = config.corPeca || "#FFFFFF";
	let alca = config.corAlca || peca;
	for (const grupo of config.variacoes) {
		const opcao = grupo.opcoes.find((o) => o.id === escolhas.variacoes[grupo.id]);
		if (!opcao?.hex) continue;
		if (grupo.previa === "alca") alca = opcao.hex;
		if (grupo.previa === "peca") {
			peca = opcao.hex;
			if (!config.corAlca) alca = opcao.hex;
		}
	}
	if (config.magica && aquecida) {
		peca = "#FFFFFF";
		alca = config.corAlca && config.corAlca !== config.corPeca ? config.corAlca : "#FFFFFF";
	}
	const tinta = luminancia(peca) < .25 ? "#F6F1EA" : "#2E2A28";
	return {
		peca,
		alca,
		interior: alca,
		tinta
	};
}
var BRASILIA = "M4 74h142M48 74c4-22 12-44 27-66M102 74c-4-22-12-44-27-66M58 74c3-20 8-42 17-66M92 74c-3-20-8-42-17-66M68 74c2-20 4-42 7-66M82 74c-2-20-4-42-7-66M75 8V2M72 5h6M14 74V54h10v20M118 74V44h4v30M126 74V44h4v30M116 44h16";
function Flor({ x, y, tamanho, cor }) {
	const escala = tamanho / 24;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
		transform: `translate(${x - tamanho / 2} ${y - tamanho / 2}) scale(${escala})`,
		fill: "none",
		stroke: cor,
		strokeWidth: 1.1,
		children: [[
			0,
			72,
			144,
			216,
			288
		].map((a) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ellipse", {
			cx: "12",
			cy: "6.5",
			rx: "3",
			ry: "5",
			transform: `rotate(${a} 12 12)`
		}, a)), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
			cx: "12",
			cy: "12",
			r: "1.6"
		})]
	});
}
function gradeDeFotos(quantidade) {
	if (quantidade <= 1) return {
		colunas: 1,
		linhas: 1
	};
	if (quantidade <= 2) return {
		colunas: 2,
		linhas: 1
	};
	if (quantidade <= 4) return {
		colunas: 2,
		linhas: 2
	};
	if (quantidade <= 6) return {
		colunas: 3,
		linhas: 2
	};
	return {
		colunas: 4,
		linhas: 2
	};
}
function Arte({ config, escolhas, lado, largura, altura, tinta, urlDaFoto, medir, idBase, fotoSelecionada, aoTocarFoto, exemplos = true }) {
	const pers = escolhas.personalizacao;
	const fonte = FONTES[pers.letra || "cursiva"] || FONTES.cursiva;
	const campos = config.personalizacao.campos;
	const partes = [];
	const espaco = altura * .05;
	if (lado === "verso") {
		const frase = (pers.frase || "").trim() || (campos.frase && exemplos ? "Sua frase aqui" : "");
		if (frase) {
			const base = altura * .17 * fonte.escala;
			let tamanho = base;
			let linhas = quebrarLinhas(frase, fonte, tamanho, largura * .92, 3, medir);
			const maisLarga = Math.max(...linhas.map((l) => medirTexto(l, fonte, tamanho, medir)));
			if (maisLarga > largura * .92) {
				tamanho = Math.max(base * .45, tamanho * largura * .92 / maisLarga);
				linhas = quebrarLinhas(frase, fonte, tamanho, largura * .92, 3, medir);
			}
			if (linhas.length * tamanho * 1.15 > altura * .8) tamanho = altura * .8 / (linhas.length * 1.15);
			const alturaTexto = linhas.length * tamanho * 1.15;
			partes.push({
				altura: alturaTexto,
				desenhar: (y) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
					x: 0,
					y: y + tamanho * .9,
					textAnchor: "middle",
					fill: tinta,
					fontFamily: fonte.familia,
					fontWeight: fonte.peso,
					fontStyle: fonte.estilo,
					fontSize: tamanho,
					letterSpacing: `${fonte.espaco}em`,
					children: linhas.map((linha, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tspan", {
						x: 0,
						dy: i === 0 ? 0 : tamanho * 1.15,
						children: fonte.caixa === "uppercase" ? linha.toUpperCase() : linha
					}, i))
				})
			});
			partes.push({
				altura: altura * .06,
				desenhar: (y) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
					stroke: tinta,
					strokeWidth: 1.2,
					strokeLinecap: "round",
					fill: "none",
					opacity: .75,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: `M${-largura * .18} ${y + altura * .03}h${largura * .13}M${largura * .05} ${y + altura * .03}h${largura * .13}` }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: 0,
						cy: y + altura * .03,
						r: altura * .012
					})]
				})
			});
		}
	} else {
		const arte = pers.arte || (config.personalizacao.artes[0] ?? "nome");
		const fotos = (pers.fotos || []).slice(0, 8);
		if (arte === "flor") {
			const t = altura * .2;
			partes.push({
				altura: t,
				desenhar: (y) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Flor, {
					x: 0,
					y: y + t / 2,
					tamanho: t,
					cor: tinta
				})
			});
		}
		if (arte === "brasilia") {
			const w = Math.min(largura * .7, altura * .62 * (150 / 78));
			const h = w * 78 / 150;
			partes.push({
				altura: h,
				desenhar: (y) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
					transform: `translate(${-w / 2} ${y}) scale(${w / 150})`,
					fill: "none",
					stroke: tinta,
					strokeWidth: 1.4,
					strokeLinecap: "round",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: BRASILIA })
				})
			});
		}
		if (config.personalizacao.fotos.max > 0 && (arte === "fotos" || !config.personalizacao.artes.includes("fotos")) && (arte === "fotos" || fotos.length > 0) && (exemplos || fotos.length > 0)) {
			const quantidade = Math.max(1, fotos.length || (arte === "fotos" ? Math.min(4, config.personalizacao.fotos.max) : 1));
			const { colunas, linhas } = gradeDeFotos(quantidade);
			const vao = largura * .03;
			const alturaMax = pers.nome || campos.nome ? altura * .62 : altura * .9;
			const lado2 = Math.min((largura * .92 - vao * (colunas - 1)) / colunas, (alturaMax - vao * (linhas - 1)) / linhas);
			const larguraGrade = colunas * lado2 + (colunas - 1) * vao;
			const alturaGrade = linhas * lado2 + (linhas - 1) * vao;
			const circulo = config.personalizacao.fotos.formato !== "quadrado";
			partes.push({
				altura: alturaGrade,
				desenhar: (y) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", { children: Array.from({ length: quantidade }, (_, i) => {
					const coluna = i % colunas;
					const linha = Math.floor(i / colunas);
					const naLinha = Math.min(colunas, quantidade - linha * colunas);
					const deslocamento = (colunas - naLinha) * (lado2 + vao) / 2;
					const cx = -larguraGrade / 2 + deslocamento + coluna * (lado2 + vao);
					const cy = y + linha * (lado2 + vao);
					const foto = fotos[i];
					const url = foto ? urlDaFoto(foto) : null;
					const idClip = `${idBase}-foto-${i}`;
					const caixa = lado2 * (foto?.zoom || 1);
					const sobra = caixa - lado2;
					const ix = cx - sobra / 2 + (foto ? foto.x * sobra / 2 : 0);
					const iy = cy - sobra / 2 + (foto ? foto.y * sobra / 2 : 0);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("clipPath", {
							id: idClip,
							children: circulo ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
								cx: cx + lado2 / 2,
								cy: cy + lado2 / 2,
								r: lado2 / 2
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
								x: cx,
								y: cy,
								width: lado2,
								height: lado2,
								rx: lado2 * .08
							})
						}),
						url ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("image", {
							href: url,
							x: ix,
							y: iy,
							width: caixa,
							height: caixa,
							preserveAspectRatio: "xMidYMid slice",
							clipPath: `url(#${idClip})`,
							onPointerDown: aoTocarFoto ? (e) => aoTocarFoto(i, e) : void 0,
							style: aoTocarFoto ? {
								cursor: "grab",
								touchAction: "none"
							} : void 0
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
							opacity: .7,
							children: [circulo ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
								cx: cx + lado2 / 2,
								cy: cy + lado2 / 2,
								r: lado2 / 2 - 1,
								fill: "rgba(255,255,255,.55)",
								stroke: tinta,
								strokeDasharray: "4 4"
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
								x: cx + 1,
								y: cy + 1,
								width: lado2 - 2,
								height: lado2 - 2,
								rx: lado2 * .08,
								fill: "rgba(255,255,255,.55)",
								stroke: tinta,
								strokeDasharray: "4 4"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
								transform: `translate(${cx + lado2 / 2 - lado2 * .18} ${cy + lado2 / 2 - lado2 * .18}) scale(${lado2 * .36 / 24})`,
								fill: "none",
								stroke: tinta,
								strokeWidth: 1.5,
								strokeLinecap: "round",
								strokeLinejoin: "round",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 5h18v14H3zM9 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4M21 16l-5-5-8 8" })
							})]
						}),
						fotoSelecionada === i && url ? circulo ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
							cx: cx + lado2 / 2,
							cy: cy + lado2 / 2,
							r: lado2 / 2,
							fill: "none",
							stroke: "#A9521D",
							strokeWidth: 2.5,
							strokeDasharray: "6 4"
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							x: cx,
							y: cy,
							width: lado2,
							height: lado2,
							rx: lado2 * .08,
							fill: "none",
							stroke: "#A9521D",
							strokeWidth: 2.5,
							strokeDasharray: "6 4"
						}) : null
					] }, i);
				}) })
			});
		}
		const nome = (pers.nome || "").trim() || (campos.nome && exemplos ? "Seu nome" : "");
		if (nome) {
			const base = altura * (partes.length > 0 ? .24 : .3) * fonte.escala;
			let tamanho = tamanhoQueCabe(nome, fonte, base, largura * .94, medir);
			let linhas = [nome];
			if (tamanho < base * .78 && /\s/.test(nome)) {
				const quebradas = quebrarLinhas(nome, fonte, base * .9, largura * .94, 2, medir);
				const maisLarga = Math.max(...quebradas.map((l) => medirTexto(l, fonte, base * .9, medir)));
				const emDuas = Math.min(base * .9, base * .9 * largura * .94 / maisLarga);
				if (emDuas > tamanho * 1.15) {
					tamanho = emDuas;
					linhas = quebradas;
				}
			}
			const entrelinha = fonte.caixa === "uppercase" ? 1.25 : .95;
			partes.push({
				altura: tamanho * (1.05 + (linhas.length - 1) * entrelinha),
				desenhar: (y) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
					x: 0,
					y: y + tamanho * .88,
					textAnchor: "middle",
					fill: tinta,
					fontFamily: fonte.familia,
					fontWeight: fonte.peso,
					fontStyle: fonte.estilo,
					fontSize: tamanho,
					letterSpacing: `${fonte.espaco}em`,
					children: linhas.map((linha, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tspan", {
						x: 0,
						dy: i === 0 ? 0 : tamanho * entrelinha,
						children: fonte.caixa === "uppercase" ? linha.toUpperCase() : linha
					}, i))
				})
			});
		}
		const data = (pers.data || "").trim();
		if (data) {
			const delicada = FONTES.delicada;
			const tamanho = tamanhoQueCabe(data, delicada, altura * .06, largura * .8, medir);
			partes.push({
				altura: tamanho * 1.2,
				desenhar: (y) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
					x: 0,
					y: y + tamanho,
					textAnchor: "middle",
					fill: tinta,
					fontFamily: delicada.familia,
					fontWeight: 400,
					fontSize: tamanho,
					letterSpacing: "0.22em",
					children: data.toUpperCase()
				})
			});
		}
	}
	let y = -(partes.reduce((s, p) => s + p.altura, 0) + espaco * Math.max(0, partes.length - 1)) / 2;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", { children: partes.map((parte, i) => {
		const elemento = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", { children: parte.desenhar(y) }, i);
		y += parte.altura + espaco;
		return elemento;
	}) });
}
function ArteCurva({ id, raio, largura, children }) {
	const fatias = 28;
	const passo = largura / fatias;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("defs", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
		id,
		children
	}), Array.from({ length: fatias }, (_, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("clipPath", {
		id: `${id}-f${i}`,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
			x: -largura / 2 + i * passo - .6,
			y: -2e3,
			width: passo + 1.2,
			height: 4e3
		})
	}, i))] }), Array.from({ length: fatias }, (_, i) => {
		const meio = -largura / 2 + (i + .5) * passo;
		const angulo = meio / raio;
		if (Math.abs(angulo) >= Math.PI / 2) return null;
		const escala = Math.cos(angulo);
		const tx = raio * Math.sin(angulo) - escala * meio;
		return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
			transform: `translate(${tx.toFixed(3)} 0) scale(${escala.toFixed(4)} 1)`,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
				clipPath: `url(#${id}-f${i})`,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("use", { href: `#${id}` })
			})
		}, i);
	})] });
}
function alcaCaneca(lado, x, y, h, cor, coracao) {
	const largura = h * .29;
	if (coracao) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		transform: `translate(${x} ${y}) scale(${lado === "frente" ? 1 : -1} 1)`,
		d: `M0 ${h * .12}c${largura * .9} ${-h * .12} ${largura * 1.25} ${h * .28} 0 ${h * .62}M0 ${h * .12}c${largura * .55} ${h * .02} ${largura * .5} ${h * .3} 0 ${h * .46}`,
		fill: "none",
		stroke: cor,
		strokeWidth: h * .07,
		strokeLinecap: "round"
	});
	const d = lado === "frente" ? `M${x} ${y + h * .18}h${largura * .35}a${largura * .65} ${h * .25} 0 0 1 0 ${h * .5}h${-largura * .35}` : `M${x} ${y + h * .18}h${-largura * .35}a${largura * .65} ${h * .25} 0 0 0 0 ${h * .5}h${largura * .35}`;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		d,
		fill: "none",
		stroke: cor,
		strokeWidth: h * .075,
		strokeLinejoin: "round"
	});
}
function corpoCilindrico(idBase, x, y, w, h, cor, raioBase) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("linearGradient", {
			id: `${idBase}-luz`,
			x1: "0",
			x2: "1",
			y1: "0",
			y2: "0",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
					offset: "0",
					stopColor: "#000",
					stopOpacity: "0.16"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
					offset: "0.16",
					stopColor: "#fff",
					stopOpacity: "0.14"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
					offset: "0.32",
					stopColor: "#fff",
					stopOpacity: "0"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
					offset: "0.7",
					stopColor: "#000",
					stopOpacity: "0"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
					offset: "1",
					stopColor: "#000",
					stopOpacity: "0.2"
				})
			]
		}) }),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			d: `M${x} ${y}h${w}v${h - raioBase}q0 ${raioBase} ${-raioBase} ${raioBase}h${-(w - 2 * raioBase)}q${-raioBase} 0 ${-raioBase} ${-raioBase}z`,
			fill: cor
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			d: `M${x} ${y}h${w}v${h - raioBase}q0 ${raioBase} ${-raioBase} ${raioBase}h${-(w - 2 * raioBase)}q${-raioBase} 0 ${-raioBase} ${-raioBase}z`,
			fill: `url(#${idBase}-luz)`
		})
	] });
}
function geometria(molde, config, cores, lado, idBase, urlDaFotoDoMolde) {
	const formato = config.formato;
	if (molde === "caneca") {
		const w = 220, h = 262, x = lado === "frente" ? 48 : 92, y = 74;
		const rim = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ellipse", {
			cx: x + w / 2,
			cy: y,
			rx: w / 2,
			ry: 18,
			fill: cores.peca
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ellipse", {
			cx: x + w / 2,
			cy: 75,
			rx: w / 2 - 7,
			ry: 13,
			fill: escurecer(cores.interior, .12)
		})] });
		return {
			sob: alcaCaneca(lado, lado === "frente" ? x + w - 4 : x + 4, y, h, cores.alca, formato === "coracao"),
			corpo: corpoCilindrico(idBase, x, y, w, h, cores.peca, 26),
			sobre: rim,
			frenteDaArte: {
				cx: x + w / 2,
				cy: 210.24,
				largura: w * .86,
				altura: h * .74,
				raio: w / 2
			}
		};
	}
	if (molde === "xicara") {
		const w = 236, h = 158, x = lado === "frente" ? 58 : 66, y = 102;
		return {
			sob: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ellipse", {
					cx: 180,
					cy: 274,
					rx: 150,
					ry: 26,
					fill: escurecer(cores.peca, .06)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ellipse", {
					cx: 180,
					cy: 268,
					rx: 132,
					ry: 18,
					fill: cores.peca
				}),
				alcaCaneca(lado, lado === "frente" ? x + w - 6 : x + 6, 98, h, cores.alca, false)
			] }),
			corpo: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: `M${x} ${y}h${w}c0 ${h * .7} -30 ${h} -70 ${h}h-96c-40 0 -70 -47.4 -70 -158z`,
					fill: cores.peca
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: `M${x} ${y}h${w}c0 ${h * .7} -30 ${h} -70 ${h}h-96c-40 0 -70 -47.4 -70 -158z`,
					fill: `url(#${idBase}-luzx)`
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("linearGradient", {
					id: `${idBase}-luzx`,
					x1: "0",
					x2: "1",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: "0",
							stopColor: "#000",
							stopOpacity: "0.14"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: "0.2",
							stopColor: "#fff",
							stopOpacity: "0.12"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: "0.5",
							stopColor: "#fff",
							stopOpacity: "0"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: "1",
							stopColor: "#000",
							stopOpacity: "0.18"
						})
					]
				}) })
			] }),
			sobre: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ellipse", {
				cx: x + w / 2,
				cy: y,
				rx: w / 2,
				ry: 16,
				fill: cores.peca
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ellipse", {
				cx: x + w / 2,
				cy: 103,
				rx: w / 2 - 7,
				ry: 11,
				fill: escurecer(cores.interior, .12)
			})] }),
			frenteDaArte: {
				cx: x + w / 2,
				cy: 168.36,
				largura: w * .78,
				altura: h * .62,
				raio: w / 2
			}
		};
	}
	if (molde === "garrafa") {
		const w = 132, x = 114;
		const termico = formato === "copo-termico";
		return {
			corpo: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [
				termico ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: 144,
					y: 24,
					width: 72,
					height: 30,
					rx: 8,
					fill: escurecer(cores.peca, .25)
				}),
				termico ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: 110,
					y: 40,
					width: 140,
					height: 26,
					rx: 10,
					fill: escurecer(cores.peca, .3)
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: `M136 54h88l20 30h-136z`,
					fill: cores.peca
				}),
				corpoCilindrico(idBase, x, 82, w, 280, cores.peca, 22)
			] }),
			frenteDaArte: {
				cx: 180,
				cy: 222,
				largura: w * .92,
				altura: 168,
				raio: w / 2
			}
		};
	}
	if (molde === "copo") {
		const vidro = formato === "jateado" || formato === "cerveja" ? "rgba(255,255,255,.82)" : "rgba(236,242,244,.62)";
		if (formato === "whisky") {
			const w = 210, h = 170;
			return {
				corpo: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: 75,
					y: 150,
					width: w,
					height: h,
					rx: 14,
					fill: vidro,
					stroke: "rgba(120,140,150,.45)",
					strokeWidth: 2
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: 81,
					y: 286,
					width: 198,
					height: 28,
					rx: 10,
					fill: "rgba(200,215,220,.6)"
				})] }),
				frenteDaArte: {
					cx: 180,
					cy: 226.5,
					largura: w * .82,
					altura: h * .6,
					raio: w / 2
				}
			};
		}
		if (formato === "mason") {
			const w = 170, h = 250;
			return {
				corpo: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: 105,
						y: 64,
						width: 150,
						height: 30,
						rx: 6,
						fill: "#C9A26B"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: 95,
						y: 100,
						width: w,
						height: h,
						rx: 26,
						fill: vidro,
						stroke: "rgba(120,140,150,.45)",
						strokeWidth: 2
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: `M200.4 30l-14 ${h * .55}`,
						stroke: "#B9C7C9",
						strokeWidth: 8,
						strokeLinecap: "round"
					})
				] }),
				frenteDaArte: {
					cx: 180,
					cy: 225,
					largura: w * .84,
					altura: h * .6,
					raio: w / 2
				}
			};
		}
		const w = formato === "chopp" ? 180 : 160, h = formato === "cerveja" ? 290 : 260, x = formato === "chopp" ? 80 : 100, y = 80;
		return {
			sob: formato === "chopp" ? alcaCaneca("frente", x + w - 4, 90, h * .8, "rgba(210,225,230,.9)", false) : null,
			corpo: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: `M${x} ${y}h${w}l-10 ${h}h${-(w - 20)}z`,
					fill: vidro,
					stroke: "rgba(120,140,150,.45)",
					strokeWidth: 2
				}),
				formato === "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: x - 4,
					y: 60,
					width: w + 8,
					height: 20,
					rx: 6,
					fill: "#C9A26B"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: `M${x + w * .6} 10l-10 ${h * .5}`,
					stroke: "#B9C7C9",
					strokeWidth: 8,
					strokeLinecap: "round"
				})] }) : null,
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: `M${x + 16} 100v${h - 60}`,
					stroke: "rgba(255,255,255,.7)",
					strokeWidth: 8,
					strokeLinecap: "round"
				})
			] }),
			frenteDaArte: {
				cx: x + w / 2,
				cy: y + h * .48,
				largura: w * .84,
				altura: h * .56,
				raio: w / 2
			}
		};
	}
	if (molde === "azulejo") return {
		sob: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			d: "M110 330h140l18 26H92z",
			fill: "#C9A26B"
		}),
		corpo: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
			x: 70,
			y: 70,
			width: 220,
			height: 250,
			rx: 6,
			fill: "#D9CBBB"
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
			x: 76,
			y: 76,
			width: 208,
			height: 238,
			rx: 3,
			fill: cores.peca
		})] }),
		frenteDaArte: {
			cx: 180,
			cy: 195,
			largura: 186,
			altura: 214,
			raio: null
		}
	};
	if (molde === "plano") return {
		corpo: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
			x: 40,
			y: 90,
			width: 280,
			height: 210,
			rx: 22,
			fill: escurecer(cores.peca, .08)
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
			x: 46,
			y: 96,
			width: 268,
			height: 198,
			rx: 18,
			fill: cores.peca
		})] }),
		frenteDaArte: {
			cx: 180,
			cy: 195,
			largura: 240,
			altura: 170,
			raio: null
		}
	};
	if (molde === "botton") return {
		corpo: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx: 180,
				cy: 190,
				r: 128,
				fill: escurecer(cores.peca, .12)
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx: 180,
				cy: 186,
				r: 124,
				fill: cores.peca
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M92 120a124 124 0 0 1 120 -55",
				stroke: "#fff",
				strokeOpacity: ".7",
				strokeWidth: 8,
				fill: "none",
				strokeLinecap: "round"
			})
		] }),
		frenteDaArte: {
			cx: 180,
			cy: 190,
			largura: 190,
			altura: 190,
			raio: null
		}
	};
	if (molde === "caixa") return {
		corpo: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
			stroke: "#B65E27",
			strokeWidth: 2,
			strokeLinejoin: "round",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M70 150h220v170H70z",
					fill: "#F2EBE2"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M58 120h244v34H58z",
					fill: cores.peca === "#FFFFFF" ? "#FBF8F3" : cores.peca
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M180 120v200",
					fill: "none",
					stroke: "#DFA1AC",
					strokeWidth: 10
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M180 118c-26-46-74-34-58 0M180 118c26-46 74-34 58 0",
					fill: "none",
					stroke: "#DFA1AC",
					strokeWidth: 8,
					strokeLinecap: "round"
				})
			]
		}),
		frenteDaArte: {
			cx: 180,
			cy: 240,
			largura: 150,
			altura: 120,
			raio: null
		}
	};
	if (molde === "flor") return {
		corpo: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M120 330h120l-10 24H130z",
				fill: "#B58A5E"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M180 330c0-60 -4-110 -20-150M180 300c10-40 30-80 50-100M168 240c-20-20-40-30-60-30",
				stroke: "#6E4B33",
				strokeWidth: 6,
				strokeLinecap: "round",
				fill: "none"
			}),
			[
				[150, 150],
				[190, 130],
				[230, 160],
				[120, 190],
				[205, 190],
				[160, 110],
				[245, 205],
				[100, 215]
			].map(([cx, cy], i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx,
				cy,
				r: 30,
				fill: i % 2 ? "#F2C94C" : "#E9B83A",
				opacity: .9
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx: cx + 12,
				cy: cy - 10,
				r: 18,
				fill: "#F6D97A",
				opacity: .8
			})] }, i))
		] }),
		frenteDaArte: {
			cx: 180,
			cy: 342,
			largura: 110,
			altura: 18,
			raio: null
		}
	};
	if (molde === "foto" && config.moldeFoto?.area) {
		const a = config.moldeFoto.area;
		return {
			corpo: urlDaFotoDoMolde ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("image", {
				href: urlDaFotoDoMolde,
				x: 0,
				y: 0,
				width: 360,
				height: 380,
				preserveAspectRatio: "xMidYMid slice"
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
				width: 360,
				height: 380,
				fill: "#F2EBE2"
			}),
			frenteDaArte: {
				cx: (a.x + a.w / 2) * 360,
				cy: (a.y + a.h / 2) * 380,
				largura: a.w * 360,
				altura: a.h * 380,
				raio: a.curva ? a.w * 360 / 2 : null
			}
		};
	}
	return {
		corpo: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
			x: 60,
			y: 80,
			width: 240,
			height: 240,
			rx: 28,
			fill: "#F2EBE2"
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Flor, {
			x: 180,
			y: 200,
			tamanho: 90,
			cor: "#CD7031"
		})] }),
		frenteDaArte: {
			cx: 180,
			cy: 200,
			largura: 0,
			altura: 0,
			raio: null
		}
	};
}
function Sombra({ molde }) {
	if (molde === "foto" || molde === "nenhum") return null;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ellipse", {
		cx: 180,
		cy: molde === "xicara" ? 290 : 362,
		rx: molde === "garrafa" ? 90 : 140,
		ry: 10,
		fill: "rgba(80, 40, 20, 0.12)"
	});
}
function PecaSvg({ config, escolhas, lado, aquecida, urlDaFoto, medir, fotoSelecionada, aoTocarFoto, urlDaFotoDoMolde = null, comArte = true, exemplos = true }) {
	const idBase = (0, react.useId)().replace(/[^a-zA-Z0-9]/g, "");
	const cores = coresDaPeca(config, escolhas, aquecida);
	const molde = config.molde;
	const g = geometria(molde, config, cores, lado, idBase, urlDaFotoDoMolde ?? config.moldeFoto?.foto ?? null);
	const area = g.frenteDaArte;
	const mostrarArte = comArte && config.personalizacao.ativa && area.largura > 0 && !(config.magica && !aquecida);
	const tinta = molde === "copo" ? "#2E2A28" : cores.tinta;
	const arte = mostrarArte ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Arte, {
		config,
		escolhas,
		lado,
		largura: area.largura,
		altura: area.altura,
		tinta,
		urlDaFoto,
		medir,
		idBase: `${idBase}-a`,
		fotoSelecionada,
		aoTocarFoto,
		exemplos
	}) : null;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Sombra, { molde }),
		g.sob,
		g.corpo,
		arte ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
			transform: `translate(${area.cx} ${area.cy})`,
			children: area.raio && !aoTocarFoto ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ArteCurva, {
				id: `${idBase}-curva`,
				raio: area.raio,
				largura: area.largura,
				children: arte
			}) : arte
		}) : null,
		g.sobre,
		config.magica && !aquecida && comArte ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
			x: molde === "xicara" ? 176 : 170,
			y: molde === "xicara" ? 190 : 216,
			textAnchor: "middle",
			fill: "#F6F1EA",
			opacity: .75,
			fontFamily: "Josefin Sans, sans-serif",
			fontSize: 13,
			letterSpacing: "0.18em",
			children: "A ARTE APARECE COM O CALOR"
		}) : null
	] });
}
function descricaoDaPrevia(nomeProduto, config, escolhas, lado, aquecida) {
	const pers = escolhas.personalizacao;
	const cor = config.variacoes.map((g) => g.opcoes.find((o) => o.id === escolhas.variacoes[g.id])?.nome).filter(Boolean).join(", ");
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
function useMedirTexto() {
	const [medir, setMedir] = (0, react.useState)(false);
	const [, setVersao] = (0, react.useState)(0);
	const montado = (0, react.useRef)(false);
	(0, react.useEffect)(() => {
		montado.current = true;
		setMedir(true);
		const fontes = typeof document !== "undefined" ? document.fonts : void 0;
		if (!fontes) return;
		const aoCarregar = () => {
			if (montado.current) setVersao((v) => v + 1);
		};
		fontes.ready.then(aoCarregar);
		fontes.addEventListener?.("loadingdone", aoCarregar);
		return () => {
			montado.current = false;
			fontes.removeEventListener?.("loadingdone", aoCarregar);
		};
	}, []);
	return medir;
}
// loja/src/estado/favoritos.ts
var CHAVE = "arte_favoritos_v1";
var VAZIO = [];
var lista = VAZIO;
var carregado = false;
var ouvintes = /* @__PURE__ */ new Set();
function carregar() {
	if (carregado || typeof window === "undefined") return;
	carregado = true;
	try {
		const bruto = JSON.parse(localStorage.getItem(CHAVE) || "[]");
		lista = Array.isArray(bruto) ? bruto.filter((n) => Number.isInteger(n)) : VAZIO;
	} catch {
		lista = VAZIO;
	}
}
function assinar(ouvinte) {
	carregar();
	ouvintes.add(ouvinte);
	return () => ouvintes.delete(ouvinte);
}
function ler() {
	carregar();
	return lista;
}
function alternar(id) {
	lista = lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id];
	try {
		localStorage.setItem(CHAVE, JSON.stringify(lista));
	} catch {
		lista = [...lista];
	}
	for (const ouvinte of ouvintes) ouvinte();
}
function useFavoritos() {
	return {
		favoritos: (0, react.useSyncExternalStore)(assinar, ler, () => VAZIO),
		alternar
	};
}
// loja/src/componentes/CartaoProduto.tsx
function configDeVitrine(p) {
	return {
		categorias: [],
		medida: "",
		codigo: "",
		cuidados: "",
		aviso: null,
		molde: p.molde,
		formato: p.formato,
		corPeca: p.corPeca,
		corAlca: p.corAlca,
		magica: p.magica,
		moldeFoto: null,
		variacoes: [],
		adicionais: [],
		faixas: [],
		qtdMinima: 1,
		personalizacao: {
			ativa: true,
			campos: {},
			letras: ["cursiva"],
			artes: ["flor"],
			fotos: {
				min: 0,
				max: 0,
				formato: "circulo"
			},
			verso: false
		}
	};
}
function IlustracaoDaPeca({ produto, rotulo }) {
	const config = configDeVitrine(produto);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
		className: "ilustracao-peca",
		viewBox: "0 0 360 380",
		role: "img",
		"aria-label": rotulo,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PecaSvg, {
			config,
			escolhas: {
				variacoes: {},
				adicionais: [],
				personalizacao: {
					arte: "flor",
					letra: "cursiva"
				}
			},
			lado: "frente",
			aquecida: false,
			urlDaFoto: () => null,
			medir: false,
			exemplos: false
		})
	});
}
function CartaoProduto({ produto, prioridade = false }) {
	const { favoritos, alternar } = useFavoritos();
	const favorito = favoritos.includes(produto.id);
	const pix = precoNoPix(produto.precoMinimo);
	const selo = produto.esgotado ? "Esgotado" : produto.aviso === "ultimas" ? "Últimas unidades" : produto.selos[0];
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
		className: `cartao-produto${produto.esgotado ? " esgotado" : ""}`,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
				className: "cartao-produto-foto",
				href: produto.endereco,
				tabIndex: -1,
				"aria-hidden": "true",
				children: produto.foto ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Foto, {
					src: produto.foto,
					alt: "",
					sizes: "(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 290px",
					prioridade
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IlustracaoDaPeca, {
					produto,
					rotulo: ""
				})
			}),
			selo ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: `selo${produto.esgotado ? " selo-esgotado" : ""}`,
				children: selo
			}) : null,
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: `botao-favorito${favorito ? " ativo" : ""}`,
				"aria-pressed": favorito,
				"aria-label": favorito ? `Tirar ${produto.nome} dos favoritos` : `Favoritar ${produto.nome}`,
				onClick: () => alternar(produto.id),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
					nome: "coracao",
					tamanho: 20
				})
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "cartao-produto-corpo",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						className: "cartao-produto-nome",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
							href: produto.endereco,
							children: produto.nome
						})
					}),
					produto.medida ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "cartao-produto-medida",
						children: produto.medida
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: "cartao-produto-pix",
						children: [
							produto.aPartirDe ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "a-partir",
								children: "a partir de"
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: dinheiro(pix) }),
							" ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "no Pix" })
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: "cartao-produto-cartao",
						children: [
							dinheiro(produto.precoMinimo),
							" ou ",
							parcelas(produto.precoMinimo)
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
						className: "botao botao-cheio botao-bloco cartao-produto-acao",
						href: produto.endereco,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
								nome: produto.personalizavel ? "lapis" : "sacola",
								tamanho: 18,
								traco: 1.8
							}),
							produto.esgotado ? "Ver detalhes" : produto.personalizavel ? "Personalizar" : "Ver produto",
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "visualmente-oculto",
								children: [" ", produto.nome]
							})
						]
					})
				]
			})
		]
	});
}
// loja/src/componentes/Cabecalho.tsx
function FaixaDoTopo({ loja }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "faixa-topo",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: `Desconto de ${loja.regrasPagamento.pixDiscountPercent}% no Pix` }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				"aria-hidden": "true",
				className: "faixa-flor",
				children: "✿"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "faixa-opcional",
				children: "Personalização inclusa em todos os produtos"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				"aria-hidden": "true",
				className: "faixa-flor faixa-opcional",
				children: "✿"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "Enviamos para todo o Brasil" })
		]
	});
}
function CampoDeBusca({ id, termoInicial = "" }) {
	const [termo, setTermo] = (0, react.useState)(termoInicial);
	const [sugestoes, setSugestoes] = (0, react.useState)([]);
	const [aberta, setAberta] = (0, react.useState)(false);
	const [ativa, setAtiva] = (0, react.useState)(-1);
	const idLista = (0, react.useId)();
	const pedido = (0, react.useRef)(0);
	(0, react.useEffect)(() => {
		const limpo = termo.trim();
		if (limpo.length < 2) {
			setSugestoes([]);
			return;
		}
		const numero = ++pedido.current;
		const espera = setTimeout(async () => {
			try {
				const resposta = await fetch(`/api/busca?q=${encodeURIComponent(limpo)}&limite=6`);
				if (!resposta.ok) return;
				const dados = await resposta.json();
				if (numero === pedido.current) {
					setSugestoes(dados.produtos || []);
					setAtiva(-1);
				}
			} catch {
				setSugestoes([]);
			}
		}, 160);
		return () => clearTimeout(espera);
	}, [termo]);
	const mostrar = aberta && sugestoes.length > 0;
	function aoTeclar(evento) {
		if (!mostrar) return;
		if (evento.key === "ArrowDown") {
			evento.preventDefault();
			setAtiva((i) => Math.min(sugestoes.length - 1, i + 1));
		} else if (evento.key === "ArrowUp") {
			evento.preventDefault();
			setAtiva((i) => Math.max(-1, i - 1));
		} else if (evento.key === "Escape") setAberta(false);
		else if (evento.key === "Enter" && ativa >= 0) {
			evento.preventDefault();
			window.location.href = sugestoes[ativa].endereco;
		}
	}
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
		className: "busca",
		role: "search",
		action: "/busca",
		method: "get",
		onSubmit: () => setAberta(false),
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
				htmlFor: id,
				className: "visualmente-oculto",
				children: "Buscar produtos"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
				id,
				name: "q",
				type: "search",
				placeholder: "O que você procura?",
				autoComplete: "off",
				value: termo,
				role: "combobox",
				"aria-expanded": mostrar,
				"aria-controls": idLista,
				"aria-autocomplete": "list",
				"aria-activedescendant": ativa >= 0 ? `${idLista}-${ativa}` : void 0,
				onChange: (e) => {
					setTermo(e.target.value);
					setAberta(true);
				},
				onFocus: () => setAberta(true),
				onBlur: () => setTimeout(() => setAberta(false), 150),
				onKeyDown: aoTeclar
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "submit",
				className: "busca-botao",
				"aria-label": "Buscar",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
					nome: "busca",
					tamanho: 20,
					traco: 1.8
				})
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
				id: idLista,
				role: "listbox",
				className: "busca-sugestoes",
				hidden: !mostrar,
				"aria-label": "Sugestões",
				children: [sugestoes.map((p, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
					id: `${idLista}-${i}`,
					role: "option",
					"aria-selected": i === ativa,
					className: i === ativa ? "ativa" : void 0,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
						href: p.endereco,
						tabIndex: -1,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "busca-miniatura",
								children: p.foto ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Foto, {
									src: p.foto,
									alt: "",
									sizes: "48px",
									larguras: [160],
									largura: 48,
									altura: 48
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IlustracaoDaPeca, {
									produto: p,
									rotulo: ""
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "busca-nome",
								children: [p.nome, p.medida ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: p.medida }) : null]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "busca-preco",
								children: [dinheiro(precoNoPix(p.precoMinimo)), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: "no Pix" })]
							})
						]
					})
				}, p.id)), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
					role: "option",
					"aria-selected": false,
					className: "busca-todos",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
						href: `/busca?q=${encodeURIComponent(termo.trim())}`,
						tabIndex: -1,
						children: [
							"Ver todos os resultados para “",
							termo.trim(),
							"”"
						]
					})
				})]
			})
		]
	});
}
function MenuDeCategorias({ categorias, caminho }) {
	const [aberto, setAberto] = (0, react.useState)(null);
	const raiz = (0, react.useRef)(null);
	const tipos = categorias.filter((c) => c.grupo === "tipo" && c.quantidade > 0);
	const ocasioes = categorias.filter((c) => c.grupo === "ocasiao" && c.quantidade > 0);
	(0, react.useEffect)(() => {
		if (!aberto) return;
		const fora = (e) => {
			if (raiz.current && !raiz.current.contains(e.target)) setAberto(null);
		};
		const esc = (e) => {
			if (e.key === "Escape") setAberto(null);
		};
		document.addEventListener("click", fora);
		document.addEventListener("keydown", esc);
		return () => {
			document.removeEventListener("click", fora);
			document.removeEventListener("keydown", esc);
		};
	}, [aberto]);
	const atual = (slug) => caminho === `/categoria/${slug}` ? "page" : void 0;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("nav", {
		className: "menu-categorias",
		"aria-label": "Categorias",
		ref: raiz,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
			className: "menu-lista",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
					className: "menu-item",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
						href: "/busca",
						className: "menu-link menu-todas",
						"aria-expanded": aberto === "todas",
						"aria-haspopup": "true",
						onClick: (e) => {
							e.preventDefault();
							setAberto(aberto === "todas" ? null : "todas");
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
							nome: "menu",
							tamanho: 18,
							traco: 1.8
						}), "Todas as categorias"]
					}), aberto === "todas" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "submenu submenu-largo",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "submenu-titulo",
								children: "Por tipo"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", { children: tipos.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								href: `/categoria/${c.slug}`,
								"aria-current": atual(c.slug),
								children: c.nome
							}) }, c.slug)) })] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "submenu-titulo",
								children: "Por momento"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", { children: ocasioes.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								href: `/categoria/${c.slug}`,
								"aria-current": atual(c.slug),
								children: c.nome
							}) }, c.slug)) })] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								className: "submenu-tudo",
								href: "/busca",
								children: "Ver todos os produtos"
							})
						]
					}) : null]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
					className: "menu-item",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "menu-link",
						"aria-expanded": aberto === "ocasiao",
						onClick: () => setAberto(aberto === "ocasiao" ? null : "ocasiao"),
						children: ["Por ocasião", /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
							nome: "seta",
							tamanho: 14,
							traco: 2
						})]
					}), aberto === "ocasiao" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "submenu",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", { children: ocasioes.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
							href: `/categoria/${c.slug}`,
							"aria-current": atual(c.slug),
							children: c.nome
						}) }, c.slug)) })
					}) : null]
				}),
				tipos.slice(0, 6).map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
					className: "menu-item",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
						className: "menu-link",
						href: `/categoria/${c.slug}`,
						"aria-current": atual(c.slug),
						children: c.nome
					})
				}, c.slug))
			]
		})
	});
}
function Gaveta({ loja, aberta, fechar }) {
	const ref = (0, react.useRef)(null);
	const { usuario } = useSessao();
	(0, react.useEffect)(() => {
		const dialogo = ref.current;
		if (!dialogo) return;
		if (aberta && !dialogo.open) dialogo.showModal();
		if (!aberta && dialogo.open) dialogo.close();
	}, [aberta]);
	const tipos = loja.categorias.filter((c) => c.grupo === "tipo" && c.quantidade > 0);
	const ocasioes = loja.categorias.filter((c) => c.grupo === "ocasiao" && c.quantidade > 0);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dialog", {
		className: "gaveta gaveta-esquerda",
		ref,
		"aria-label": "Menu",
		onClose: fechar,
		onClick: (e) => {
			if (e.target === ref.current) fechar();
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "gaveta-conteudo",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "gaveta-topo",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Logo, { compacto: true }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "botao-icone",
						onClick: fechar,
						"aria-label": "Fechar menu",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, { nome: "fechar" })
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
					className: "gaveta-conta",
					href: usuario ? "/pedidos.html" : "/conta.html",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, { nome: "pessoa" }), usuario ? `Olá, ${usuario.primeiroNome} · Minha conta` : "Entrar ou cadastrar"]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "gaveta-titulo",
					children: "Por tipo"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					className: "gaveta-lista",
					children: tipos.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
						href: `/categoria/${c.slug}`,
						children: [c.nome, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: c.quantidade })]
					}) }, c.slug))
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "gaveta-titulo",
					children: "Por ocasião"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					className: "gaveta-lista",
					children: ocasioes.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
						href: `/categoria/${c.slug}`,
						children: [c.nome, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: c.quantidade })]
					}) }, c.slug))
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
					className: "gaveta-lista gaveta-ajuda",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
						href: "/acompanhar-pedido.html",
						children: "Acompanhar pedido"
					}) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
						href: "/politica.html",
						children: "Trocas e privacidade"
					}) })]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
					className: "botao botao-whatsapp botao-bloco",
					href: linkWhatsApp(loja.whatsapp),
					target: "_blank",
					rel: "noopener noreferrer",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, { nome: "whatsapp" }),
						"Falar com a ",
						loja.responsavel
					]
				})
			]
		})
	});
}
function Cabecalho({ loja, caminho, termo }) {
	const { linhas } = useCarrinho();
	const { usuario } = useSessao();
	const [gaveta, setGaveta] = (0, react.useState)(false);
	const itens = totalDeItens(linhas);
	const tipos = loja.categorias.filter((c) => c.grupo === "tipo" && c.quantidade > 0);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
			className: "pular-para-conteudo",
			href: "#conteudo",
			children: "Pular para o conteúdo"
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FaixaDoTopo, { loja }),
		/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
			className: "cabecalho",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "cabecalho-grade",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "botao-icone so-celular",
							onClick: () => setGaveta(true),
							"aria-label": "Abrir menu",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, { nome: "menuCurto" })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "cabecalho-busca so-computador",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CampoDeBusca, {
								id: "busca-topo",
								termoInicial: termo
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
							className: "cabecalho-logo",
							href: "/",
							"aria-label": `${loja.nome}, página inicial`,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Logo, {})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "cabecalho-atalhos",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
									className: "atalho so-computador",
									href: linkWhatsApp(loja.whatsapp),
									target: "_blank",
									rel: "noopener noreferrer",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
										nome: "whatsapp",
										tamanho: 26,
										traco: 1.6
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["Atendimento", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: loja.whatsappFormatado })] })]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
									className: "atalho so-computador",
									href: usuario ? "/pedidos.html" : "/conta.html",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
										nome: "pessoa",
										tamanho: 26,
										traco: 1.6
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [usuario ? `Olá, ${usuario.primeiroNome}!` : "Olá!", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: usuario ? "Minha conta" : "Entrar ou cadastrar" })] })]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "botao-carrinho",
									onClick: () => carrinho.abrir(),
									"aria-label": `Carrinho, ${itens} ${itens === 1 ? "item" : "itens"}`,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
										nome: "sacola",
										tamanho: 24
									}), itens > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "contador",
										"aria-hidden": "true",
										children: itens
									}) : null]
								})
							]
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "so-celular cabecalho-busca-celular",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CampoDeBusca, {
						id: "busca-celular",
						termoInicial: termo
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "so-computador",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuDeCategorias, {
						categorias: loja.categorias,
						caminho
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("nav", {
					className: "chips-categorias so-celular",
					"aria-label": "Categorias",
					children: tipos.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
						href: `/categoria/${c.slug}`,
						"aria-current": caminho === `/categoria/${c.slug}` ? "page" : void 0,
						children: c.nome
					}, c.slug))
				})
			]
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Gaveta, {
			loja,
			aberta: gaveta,
			fechar: () => setGaveta(false)
		})
	] });
}
// loja/src/estado/fotos.ts
var locais = /* @__PURE__ */ new Map();
function lembrarFotoLocal(id, arquivo) {
	if (typeof URL === "undefined" || !URL.createObjectURL) return;
	locais.set(id, URL.createObjectURL(arquivo));
}
function urlDaFotoEnviada(foto) {
	return locais.get(foto.id) ?? `/api/personalizacao/fotos/${foto.id}?chave=${foto.chave}`;
}
async function enviarFoto(arquivo) {
	const dados = new FormData();
	dados.append("foto", arquivo);
	let resposta;
	try {
		resposta = await fetch("/api/personalizacao/fotos", {
			method: "POST",
			body: dados,
			credentials: "same-origin"
		});
	} catch {
		throw new Error("Sem conexão para enviar a foto. Confira a internet e tente de novo.");
	}
	const corpo = await resposta.json().catch(() => ({}));
	if (!resposta.ok) throw new Error(corpo.error || "Não deu para enviar a foto. Tente de novo.");
	return {
		id: corpo.id,
		chave: corpo.chave
	};
}
// loja/src/componentes/CalculoDeFrete.tsx
function mascararCep(valor) {
	const d = valor.replace(/\D/g, "").slice(0, 8);
	return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}
async function cotarFrete(cep, itens) {
	let resposta;
	try {
		resposta = await fetch("/api/calculate-shipping", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				cep: cep.replace(/\D/g, ""),
				items: itens.map((i) => ({
					id: i.id,
					qty: i.qty
				}))
			})
		});
	} catch {
		throw new Error("Sem conexão para calcular o frete agora.");
	}
	const dados = await resposta.json().catch(() => ({}));
	if (!resposta.ok) throw new Error(dados.error || "Não deu para calcular o frete agora.");
	return {
		opcoes: dados.options || [],
		aviso: dados.warning || null
	};
}
function CalculoDeFrete({ itens, retirada }) {
	const [cep, setCep] = (0, react.useState)("");
	const [estado, setEstado] = (0, react.useState)("parado");
	const [opcoes, setOpcoes] = (0, react.useState)([]);
	const [mensagem, setMensagem] = (0, react.useState)("");
	async function calcular(evento) {
		evento.preventDefault();
		if (cep.replace(/\D/g, "").length !== 8) {
			setEstado("erro");
			setMensagem("Digite o CEP com 8 números.");
			return;
		}
		setEstado("calculando");
		setMensagem("");
		try {
			const { opcoes: lista, aviso } = await cotarFrete(cep, itens);
			setOpcoes(lista);
			setMensagem(aviso || (lista.length ? "" : "Nenhuma opção de entrega para esse CEP."));
			setEstado("pronto");
		} catch (e) {
			setEstado("erro");
			setMensagem(e instanceof Error ? e.message : "Não deu para calcular o frete agora.");
		}
	}
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
		className: "frete",
		onSubmit: calcular,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
				htmlFor: "cep-produto",
				children: "Calcular frete e prazo"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "frete-linha",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					id: "cep-produto",
					inputMode: "numeric",
					autoComplete: "postal-code",
					placeholder: "00000-000",
					value: cep,
					onChange: (e) => setCep(mascararCep(e.target.value)),
					"aria-describedby": "frete-ajuda"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "submit",
					className: "botao botao-escuro",
					disabled: estado === "calculando",
					children: estado === "calculando" ? "Calculando…" : "Calcular"
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
				id: "frete-ajuda",
				className: "dica",
				children: ["Correios e transportadoras pelo Melhor Envio", retirada ? " · retirada grátis na Asa Norte" : ""]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"aria-live": "polite",
				children: [mensagem ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: estado === "erro" ? "mensagem-erro" : "dica",
					children: mensagem
				}) : null, estado === "pronto" && opcoes.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					className: "opcoes-frete",
					children: opcoes.map((o) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: o.name }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: o.delivery_time })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: o.price > 0 ? dinheiro(o.price) : "Grátis" })] }, String(o.service_id)))
				}) : null]
			})
		]
	});
}
// loja/src/componentes/Carrinho.tsx
var CHAVE_ENDERECO = "plc_endereco_digitado";
var UFS = [
	"AC",
	"AL",
	"AP",
	"AM",
	"BA",
	"CE",
	"DF",
	"ES",
	"GO",
	"MA",
	"MT",
	"MS",
	"MG",
	"PA",
	"PB",
	"PR",
	"PE",
	"PI",
	"RJ",
	"RN",
	"RS",
	"RO",
	"RR",
	"SC",
	"SP",
	"SE",
	"TO"
];
var ENDERECO_VAZIO = {
	nome: "",
	telefone: "",
	cpf: "",
	rua: "",
	numero: "",
	complemento: "",
	bairro: "",
	cidade: "",
	uf: ""
};
function mascararTelefone(v) {
	const d = v.replace(/\D/g, "").slice(0, 11);
	if (!d) return "";
	if (d.length <= 2) return `(${d}`;
	const resto = d.slice(2);
	const corte = d.length <= 10 ? 4 : 5;
	return `(${d.slice(0, 2)}) ${resto.length <= corte ? resto : `${resto.slice(0, corte)}-${resto.slice(corte)}`}`;
}
function mascararCpf(v) {
	const d = v.replace(/\D/g, "").slice(0, 11);
	if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
	if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
	if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
	return d;
}
function cpfValido(v) {
	const d = v.replace(/\D/g, "");
	if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
	const numeros = d.split("").map(Number);
	const digito = (base) => {
		const resto = base.reduce((s, n, i) => s + n * (base.length + 1 - i), 0) * 10 % 11;
		return resto === 10 ? 0 : resto;
	};
	return digito(numeros.slice(0, 9)) === numeros[9] && digito(numeros.slice(0, 10)) === numeros[10];
}
var REGRAS_ENDERECO = [
	{
		campo: "nome",
		rotulo: "Nome",
		validar: (v) => !v.trim() ? "Digite o nome completo" : v.trim().length < 3 ? "Nome muito curto" : null
	},
	{
		campo: "telefone",
		rotulo: "Telefone",
		validar: (v) => ![10, 11].includes(v.replace(/\D/g, "").length) ? "Telefone com DDD" : null
	},
	{
		campo: "cpf",
		rotulo: "CPF",
		validar: (v) => !cpfValido(v) ? "CPF inválido. Confira os números." : null
	},
	{
		campo: "rua",
		rotulo: "Rua",
		validar: (v) => v.trim() ? null : "Digite a rua"
	},
	{
		campo: "numero",
		rotulo: "Número",
		validar: (v) => v.trim() ? null : "Digite o número"
	},
	{
		campo: "bairro",
		rotulo: "Bairro",
		validar: (v) => v.trim() ? null : "Digite o bairro"
	},
	{
		campo: "cidade",
		rotulo: "Cidade",
		validar: (v) => v.trim() ? null : "Digite a cidade"
	},
	{
		campo: "uf",
		rotulo: "Estado",
		validar: (v) => v ? null : "Escolha o estado"
	}
];
function errosDoEndereco(e) {
	const saida = {};
	for (const r of REGRAS_ENDERECO) {
		const erro = r.validar(e[r.campo]);
		if (erro) saida[r.campo] = erro;
	}
	return saida;
}
function MiniaturaDaLinha({ linha }) {
	if (linha.config?.personalizacao?.ativa && linha.config.molde !== "nenhum") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
		viewBox: "0 0 360 380",
		className: "linha-miniatura",
		role: "img",
		"aria-label": `Prévia de ${linha.nome}`,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PecaSvg, {
			config: linha.config,
			escolhas: linha.escolhas,
			lado: "frente",
			aquecida: true,
			urlDaFoto: urlDaFotoEnviada,
			medir: false,
			exemplos: false
		})
	});
	return linha.foto ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Foto, {
		src: linha.foto,
		alt: "",
		larguras: [160],
		sizes: "72px",
		largura: 72,
		altura: 72,
		className: "linha-miniatura"
	}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "linha-miniatura" });
}
function LinhaDoCarrinho({ linha }) {
	const [aberto, setAberto] = (0, react.useState)(false);
	const detalhes = linha.resumo.filter((r) => r.rotulo !== "Aprovar a arte pelo WhatsApp");
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
		className: `linha${linha.erro ? " com-erro" : ""}`,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
			href: linha.endereco,
			className: "linha-foto",
			tabIndex: -1,
			"aria-hidden": "true",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MiniaturaDaLinha, { linha })
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "linha-corpo",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "linha-topo",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
						href: linha.endereco,
						className: "linha-nome",
						children: linha.nome
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
						className: "linha-preco",
						children: dinheiro(linha.preco * linha.qty)
					})]
				}),
				detalhes.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "linha-detalhes",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: aberto ? void 0 : "resumido",
						children: detalhes.map((d) => `${d.rotulo}: ${d.valor}`).join(" · ")
					}), detalhes.length > 2 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "link-botao",
						onClick: () => setAberto(!aberto),
						"aria-expanded": aberto,
						children: aberto ? "ver menos" : "ver tudo"
					}) : null]
				}) : null,
				linha.erro ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "linha-erro",
					role: "alert",
					children: linha.erro
				}) : null,
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "linha-controles",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "quantidade quantidade-pequena",
							role: "group",
							"aria-label": `Quantidade de ${linha.nome}`,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => linha.qty <= (linha.qtdMinima || 1) ? carrinho.remover(linha.chave) : carrinho.quantidade(linha.chave, linha.qty - 1),
									"aria-label": linha.qty <= (linha.qtdMinima || 1) ? `Tirar ${linha.nome}` : "Diminuir",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
										nome: "menos",
										tamanho: 18
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: linha.qty }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => carrinho.quantidade(linha.chave, linha.qty + 1),
									"aria-label": "Aumentar",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
										nome: "mais",
										tamanho: 18
									})
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
							href: linha.endereco,
							className: "link-botao",
							children: "Editar"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "link-botao",
							onClick: () => carrinho.remover(linha.chave),
							children: "Remover"
						})
					]
				})
			]
		})]
	});
}
function Carrinho({ loja }) {
	const { linhas, aberto } = useCarrinho();
	const { usuario, conferida } = useSessao();
	const dialogo = (0, react.useRef)(null);
	const [passo, setPasso] = (0, react.useState)(1);
	const [cep, setCep] = (0, react.useState)("");
	const [opcoes, setOpcoes] = (0, react.useState)([]);
	const [frete, setFrete] = (0, react.useState)(null);
	const [freteMsg, setFreteMsg] = (0, react.useState)("");
	const [calculando, setCalculando] = (0, react.useState)(false);
	const [cupomAberto, setCupomAberto] = (0, react.useState)(false);
	const [codigo, setCodigo] = (0, react.useState)("");
	const [cupom, setCupom] = (0, react.useState)(null);
	const [cupomMsg, setCupomMsg] = (0, react.useState)("");
	const [endereco, setEndereco] = (0, react.useState)(ENDERECO_VAZIO);
	const [guardar, setGuardar] = (0, react.useState)(true);
	const [tentou, setTentou] = (0, react.useState)(false);
	const [pagamento, setPagamento] = (0, react.useState)("pix");
	const [enviando, setEnviando] = (0, react.useState)(false);
	const [erroGeral, setErroGeral] = (0, react.useState)("");
	const assinaturaConferida = (0, react.useRef)("");
	(0, react.useEffect)(() => {
		const d = dialogo.current;
		if (!d) return;
		if (aberto && !d.open) d.showModal();
		if (!aberto && d.open) d.close();
	}, [aberto]);
	(0, react.useEffect)(() => {
		const params = new URLSearchParams(window.location.search);
		if (params.get("carrinho") === "1") {
			try {
				const salvo = JSON.parse(sessionStorage.getItem(CHAVE_ENDERECO) || "null");
				if (salvo) {
					setEndereco((e) => ({
						...e,
						...salvo
					}));
					if (salvo.cep) setCep(mascararCep(salvo.cep));
				}
				sessionStorage.removeItem(CHAVE_ENDERECO);
			} catch {
				setEndereco((e) => e);
			}
			params.delete("carrinho");
			history.replaceState(null, "", window.location.pathname + (params.toString() ? `?${params}` : ""));
			carrinho.abrir();
		}
		const recuperar = params.get("recuperar");
		if (recuperar) recuperarCarrinho(recuperar);
	}, []);
	(0, react.useEffect)(() => {
		if (!usuario) return;
		setEndereco((e) => ({
			...e,
			nome: e.nome || usuario.nome,
			cpf: e.cpf || (usuario.cpf ? mascararCpf(usuario.cpf) : "")
		}));
		if (usuario.cep) setCep((c) => c || mascararCep(usuario.cep || ""));
		fetch("/api/auth/address").then((r) => r.ok ? r.json() : null).then((dados) => {
			const a = dados?.address;
			if (!a) return;
			setEndereco((e) => ({
				nome: e.nome || a.nome || "",
				telefone: e.telefone || mascararTelefone(a.telefone || ""),
				cpf: e.cpf || mascararCpf(a.cpf || ""),
				rua: e.rua || a.rua || "",
				numero: e.numero || a.numero || "",
				complemento: e.complemento || a.complemento || "",
				bairro: e.bairro || a.bairro || "",
				cidade: e.cidade || a.cidade || "",
				uf: e.uf || a.uf || ""
			}));
			if (a.cep) setCep((c) => c || mascararCep(a.cep));
		}).catch(() => setEndereco((e) => e));
	}, [usuario]);
	const assinatura = linhas.map((l) => `${l.chave}x${l.qty}`).join("|");
	(0, react.useEffect)(() => {
		setFrete(null);
		setOpcoes([]);
		setPasso(1);
	}, [assinatura]);
	(0, react.useEffect)(() => {
		if (!aberto || !linhas.length || assinaturaConferida.current === assinatura) return;
		assinaturaConferida.current = assinatura;
		fetch("/api/carrinho/conferir", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ items: linhas.map((l) => ({
				id: l.id,
				qty: l.qty,
				escolhas: l.escolhas
			})) })
		}).then((r) => r.ok ? r.json() : null).then((dados) => {
			if (!dados?.itens) return;
			const atualizadas = carrinho.ler().linhas.map((l, i) => {
				const r = dados.itens[i];
				if (!r || l.chave !== linhas[i]?.chave) return l;
				return {
					...l,
					preco: r.preco ?? l.preco,
					resumo: r.resumo ?? l.resumo,
					erro: r.erro || void 0
				};
			});
			carrinho.atualizar(atualizadas);
		}).catch(() => {
			assinaturaConferida.current = "";
		});
	}, [assinatura, aberto]);
	async function recuperarCarrinho(referencia) {
		try {
			const [esquecido, catalogo] = await Promise.all([fetch(`/api/carrinho-esquecido/${encodeURIComponent(referencia)}`).then((r) => r.ok ? r.json() : null), fetch("/api/products").then((r) => r.ok ? r.json() : null)]);
			const produtos = new Map((catalogo?.products || []).map((p) => [p.id, p]));
			for (const item of esquecido?.items || []) {
				const p = produtos.get(Number(item.id));
				if (!p || p.soldOut) continue;
				const escolhas = item.escolhas || {
					variacoes: Object.fromEntries(p.config.variacoes.map((g) => [g.id, (g.opcoes.find((o) => !o.esgotado) || g.opcoes[0]).id])),
					adicionais: [],
					personalizacao: {}
				};
				carrinho.adicionar({
					id: p.id,
					qty: Number(item.qty) || 1,
					escolhas,
					nome: p.name,
					endereco: p.slug,
					preco: item.price || p.price,
					foto: p.photos[0] || null,
					molde: p.config.molde,
					corPeca: p.config.corPeca,
					corAlca: p.config.corAlca,
					resumo: item.resumo || [],
					qtdMinima: p.config.qtdMinima || 1,
					config: p.config
				});
			}
		} catch {
			setErroGeral("Não deu para recuperar o carrinho. Monte de novo pelo site.");
		}
	}
	const sub = subtotal(linhas);
	const desconto = cupom ? Math.round(sub * cupom.percentOff) / 100 : 0;
	const depoisDoCupom = precos.round2(sub - desconto);
	const descontoPix = passo === 2 && pagamento === "pix" ? precos.pixDiscountFor(depoisDoCupom) : 0;
	const valorFrete = frete ? frete.price : 0;
	const total = precos.round2(depoisDoCupom - descontoPix + valorFrete);
	const soDados = Boolean(frete?.retirada);
	const errosCompletos = errosDoEndereco(endereco);
	const erros = soDados ? Object.fromEntries(Object.entries(errosCompletos).filter(([campo]) => [
		"nome",
		"telefone",
		"cpf"
	].includes(campo))) : errosCompletos;
	const enderecoOk = Object.keys(erros).length === 0;
	const temErroNasLinhas = linhas.some((l) => l.erro);
	async function calcular() {
		if (cep.replace(/\D/g, "").length !== 8) {
			setFreteMsg("Digite o CEP com 8 números.");
			return;
		}
		setCalculando(true);
		setFreteMsg("Calculando…");
		setFrete(null);
		try {
			const { opcoes: lista, aviso } = await cotarFrete(cep, linhas.map((l) => ({
				id: l.id,
				qty: l.qty
			})));
			setOpcoes(lista);
			setFreteMsg(aviso || (lista.length ? "Escolha a entrega:" : "Nenhuma opção de entrega para esse CEP."));
			if (lista.length) preencherPeloCep(cep);
		} catch (e) {
			setOpcoes([]);
			setFreteMsg(e instanceof Error ? e.message : "Não deu para calcular agora.");
		} finally {
			setCalculando(false);
		}
	}
	async function preencherPeloCep(valor) {
		try {
			const dados = await fetch(`https://viacep.com.br/ws/${valor.replace(/\D/g, "")}/json/`).then((r) => r.json());
			if (dados.erro) return;
			setEndereco((e) => ({
				...e,
				rua: e.rua || dados.logradouro || "",
				bairro: e.bairro || dados.bairro || "",
				cidade: e.cidade || dados.localidade || "",
				uf: e.uf || dados.uf || ""
			}));
		} catch {
			setEndereco((e) => e);
		}
	}
	async function aplicarCupom() {
		const limpo = codigo.trim();
		if (!limpo) {
			setCupom(null);
			setCupomMsg("");
			return;
		}
		setCupomMsg("Conferindo…");
		try {
			const r = await fetch("/api/validate-coupon", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					code: limpo,
					items: linhas.map((l) => ({
						id: l.id,
						qty: l.qty,
						escolhas: l.escolhas
					}))
				})
			});
			const dados = await r.json().catch(() => ({}));
			if (!r.ok) throw new Error(dados.error || "Cupom inválido.");
			setCupom({
				code: dados.code,
				percentOff: dados.percentOff
			});
			setCupomMsg(`Cupom ${dados.code} aplicado: ${dados.percentOff}% de desconto.`);
		} catch (e) {
			setCupom(null);
			setCupomMsg(e instanceof Error ? e.message : "Cupom inválido.");
		}
	}
	async function finalizar() {
		setTentou(true);
		setErroGeral("");
		if (!frete) {
			setPasso(1);
			setFreteMsg("Calcule o frete para continuar.");
			return;
		}
		if (!enderecoOk) {
			const primeiro = REGRAS_ENDERECO.find((r) => erros[r.campo]);
			if (primeiro) document.getElementById(`end-${primeiro.campo}`)?.focus();
			return;
		}
		if (!usuario) {
			try {
				sessionStorage.setItem(CHAVE_ENDERECO, JSON.stringify({
					...endereco,
					cep
				}));
			} catch {
				setErroGeral("");
			}
			window.location.href = "/conta.html?retorno=carrinho";
			return;
		}
		setEnviando(true);
		try {
			const resposta = await fetch(pagamento === "pix" ? "/api/create-pix-payment" : "/api/create-preference", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					items: linhas.map((l) => ({
						id: l.id,
						qty: l.qty,
						escolhas: l.escolhas
					})),
					cep: cep.replace(/\D/g, ""),
					shipping_service_id: frete.service_id,
					address: {
						...endereco,
						cpf: endereco.cpf.replace(/\D/g, "")
					},
					saveAddress: guardar,
					coupon: cupom?.code,
					paymentMethod: pagamento
				})
			});
			const dados = await resposta.json().catch(() => ({}));
			if (!resposta.ok) throw new Error(dados.error || `Erro inesperado (${resposta.status}).`);
			if (pagamento === "pix") {
				if (!dados.qrCode) throw new Error("O Pix não foi gerado. Tente de novo.");
				sessionStorage.setItem("plc_pix_pendente", JSON.stringify(dados));
				window.location.href = "/pagamento-pix.html";
				return;
			}
			if (!dados.init_point) throw new Error("O link de pagamento não veio. Tente de novo.");
			window.location.href = dados.init_point;
		} catch (e) {
			setErroGeral(e instanceof Error ? e.message : "Não deu para abrir o pagamento agora.");
			setEnviando(false);
		}
	}
	function campoDeEndereco(campo, rotulo, extra = {}, mascara) {
		const erro = tentou ? erros[campo] : void 0;
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: `campo campo-endereco campo-${campo}`,
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
					htmlFor: `end-${campo}`,
					children: rotulo
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					id: `end-${campo}`,
					value: endereco[campo],
					"aria-invalid": Boolean(erro),
					"aria-describedby": erro ? `end-${campo}-erro` : void 0,
					onChange: (e) => setEndereco({
						...endereco,
						[campo]: mascara ? mascara(e.target.value) : e.target.value
					}),
					...extra
				}),
				erro ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					id: `end-${campo}-erro`,
					className: "erro-campo",
					children: erro
				}) : null
			]
		});
	}
	const itens = totalDeItens(linhas);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dialog", {
		ref: dialogo,
		className: "gaveta gaveta-direita carrinho",
		"aria-labelledby": "carrinho-titulo",
		onClose: () => carrinho.fechar(),
		onClick: (e) => {
			if (e.target === dialogo.current) carrinho.fechar();
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "carrinho-conteudo",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "carrinho-topo",
					children: [
						passo === 2 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "botao-icone",
							onClick: () => setPasso(1),
							"aria-label": "Voltar para os itens",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, { nome: "setaEsquerda" })
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							id: "carrinho-titulo",
							children: passo === 1 ? `Seu carrinho${itens ? ` (${itens})` : ""}` : "Entrega e pagamento"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "botao-icone",
							onClick: () => carrinho.fechar(),
							"aria-label": "Fechar o carrinho",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, { nome: "fechar" })
						})
					]
				}),
				!linhas.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "carrinho-vazio",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
							nome: "sacola",
							tamanho: 40,
							traco: 1.4
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "Seu carrinho está vazio." }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
							className: "botao botao-cheio",
							href: "/categoria/canecas",
							onClick: () => carrinho.fechar(),
							children: "Ver as canecas"
						})
					]
				}) : passo === 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "carrinho-rolagem",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: "linhas",
							children: linhas.map((l) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LinhaDoCarrinho, { linha: l }, l.chave))
						}),
						itens > 10 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: "aviso-quantidade",
							children: [
								"Mais de 10 unidades? ",
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
									href: linkWhatsApp(loja.whatsapp, "Olá! Quero fazer um pedido com mais de 10 unidades."),
									target: "_blank",
									rel: "noopener noreferrer",
									children: ["Fale com a ", loja.responsavel]
								}),
								" sobre condições especiais."
							]
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: "carrinho-secao",
							"aria-labelledby": "entrega-titulo",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
									id: "entrega-titulo",
									children: "Entrega"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "frete-linha",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
											htmlFor: "cep-carrinho",
											className: "visualmente-oculto",
											children: "CEP"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											id: "cep-carrinho",
											inputMode: "numeric",
											autoComplete: "postal-code",
											placeholder: "Seu CEP",
											value: cep,
											onChange: (e) => setCep(mascararCep(e.target.value)),
											onKeyDown: (e) => {
												if (e.key === "Enter") {
													e.preventDefault();
													calcular();
												}
											}
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "botao botao-escuro",
											onClick: calcular,
											disabled: calculando,
											children: calculando ? "…" : "Calcular"
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dica",
									"aria-live": "polite",
									children: freteMsg
								}),
								opcoes.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "opcoes-entrega",
									role: "radiogroup",
									"aria-label": "Opções de entrega",
									children: opcoes.map((o) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: `opcao-entrega${frete?.service_id === o.service_id ? " escolhida" : ""}`,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "radio",
												name: "frete",
												checked: frete?.service_id === o.service_id,
												onChange: () => setFrete(o)
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: o.name }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("small", { children: [o.delivery_time, loja.prazoProducao && !o.retirada ? ` · + ${loja.prazoProducao} dias úteis de produção` : ""] })] }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: o.price > 0 ? dinheiro(o.price) : "Grátis" })
										]
									}, String(o.service_id)))
								}) : null
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: "carrinho-secao",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "link-botao",
									"aria-expanded": cupomAberto,
									onClick: () => setCupomAberto(!cupomAberto),
									children: "Tenho um cupom de desconto"
								}),
								cupomAberto ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "frete-linha",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
											htmlFor: "cupom",
											className: "visualmente-oculto",
											children: "Código do cupom"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											id: "cupom",
											value: codigo,
											maxLength: 30,
											placeholder: "Código do cupom",
											autoComplete: "off",
											onChange: (e) => setCodigo(e.target.value.toUpperCase()),
											onKeyDown: (e) => {
												if (e.key === "Enter") {
													e.preventDefault();
													aplicarCupom();
												}
											}
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "botao botao-escuro",
											onClick: aplicarCupom,
											children: "Aplicar"
										})
									]
								}) : null,
								cupomMsg ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: cupom ? "dica dica-ok" : "dica",
									"aria-live": "polite",
									children: cupomMsg
								}) : null
							]
						})
					]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "carrinho-rolagem",
					children: [
						frete ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: "entrega-escolhida",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
									nome: frete.retirada ? "local" : "caminhao",
									tamanho: 20
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: frete.name }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: frete.delivery_time })] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: frete.price > 0 ? dinheiro(frete.price) : "Grátis" })
							]
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: "carrinho-secao",
							"aria-labelledby": "endereco-titulo",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
									id: "endereco-titulo",
									children: frete?.retirada ? "Seus dados" : "Endereço de entrega"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "grade-endereco",
									children: [
										campoDeEndereco("nome", "Nome completo", { autoComplete: "name" }),
										campoDeEndereco("telefone", "WhatsApp", {
											autoComplete: "tel",
											inputMode: "tel",
											placeholder: "(61) 90000-0000"
										}, mascararTelefone),
										campoDeEndereco("cpf", "CPF", {
											inputMode: "numeric",
											placeholder: "000.000.000-00"
										}, mascararCpf),
										soDados ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "campo campo-endereco campo-cep",
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
													htmlFor: "end-cep",
													children: "CEP"
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
													id: "end-cep",
													value: cep,
													readOnly: true,
													"aria-readonly": "true"
												})]
											}),
											campoDeEndereco("rua", "Rua", { autoComplete: "address-line1" }),
											campoDeEndereco("numero", "Número"),
											campoDeEndereco("complemento", "Complemento", {
												autoComplete: "address-line2",
												placeholder: "Apto, bloco, casa"
											}),
											campoDeEndereco("bairro", "Bairro"),
											campoDeEndereco("cidade", "Cidade", { autoComplete: "address-level2" }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "campo campo-endereco campo-uf",
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
														htmlFor: "end-uf",
														children: "Estado"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
														id: "end-uf",
														value: endereco.uf,
														"aria-invalid": Boolean(tentou && erros.uf),
														onChange: (e) => setEndereco({
															...endereco,
															uf: e.target.value
														}),
														autoComplete: "address-level1",
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
															value: "",
															children: "UF"
														}), UFS.map((uf) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
															value: uf,
															children: uf
														}, uf))]
													}),
													tentou && erros.uf ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: "erro-campo",
														children: erros.uf
													}) : null
												]
											})
										] })
									]
								}),
								usuario && !soDados ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: "marcar",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: guardar,
										onChange: (e) => setGuardar(e.target.checked)
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "Guardar este endereço na minha conta" })]
								}) : null
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: "carrinho-secao",
							"aria-labelledby": "pagamento-titulo",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								id: "pagamento-titulo",
								children: "Pagamento"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "formas-pagamento",
								role: "radiogroup",
								"aria-labelledby": "pagamento-titulo",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: `opcao-entrega${pagamento === "pix" ? " escolhida" : ""}`,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "radio",
										name: "pagamento",
										checked: pagamento === "pix",
										onChange: () => setPagamento("pix")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "Pix" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("small", { children: [loja.regrasPagamento.pixDiscountPercent, "% de desconto · QR Code aqui mesmo"] })] })]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: `opcao-entrega${pagamento === "card" ? " escolhida" : ""}`,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "radio",
										name: "pagamento",
										checked: pagamento === "card",
										onChange: () => setPagamento("card")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "Cartão ou boleto" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("small", { children: [
										"até ",
										loja.regrasPagamento.interestFreeInstallments,
										"x sem juros, pelo Mercado Pago"
									] })] })]
								})]
							})]
						}),
						!usuario && conferida ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: "aviso-quantidade",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
								nome: "pessoa",
								tamanho: 18
							}), " Para finalizar, entre na sua conta ou crie uma em 1 minuto. Seu carrinho e o endereço ficam guardados."]
						}) : null
					]
				}),
				linhas.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "carrinho-rodape",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dl", {
							className: "totais",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: "Subtotal" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: dinheiro(sub) })] }),
								desconto > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "desconto",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dt", { children: ["Cupom ", cupom?.code] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dd", { children: ["-", dinheiro(desconto)] })]
								}) : null,
								passo === 2 && descontoPix > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "desconto",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dt", { children: [
										"Desconto Pix (",
										loja.regrasPagamento.pixDiscountPercent,
										"%)"
									] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dd", { children: ["-", dinheiro(descontoPix)] })]
								}) : null,
								frete ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: "Entrega" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: frete.price > 0 ? dinheiro(frete.price) : "Grátis" })] }) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "total",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: "Total" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: dinheiro(total) })]
								})
							]
						}),
						passo === 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: "dica",
							children: [
								"ou ",
								dinheiro(precos.pixPriceFor(depoisDoCupom) + valorFrete),
								" no Pix · ",
								parcelas(depoisDoCupom + valorFrete)
							]
						}) : null,
						erroGeral ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: "mensagem-erro",
							role: "alert",
							children: [
								erroGeral,
								" ",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
									href: linkWhatsApp(loja.whatsapp),
									target: "_blank",
									rel: "noopener noreferrer",
									children: "Finalizar pelo WhatsApp"
								})
							]
						}) : null,
						temErroNasLinhas ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "mensagem-erro",
							role: "alert",
							children: "Ajuste o item marcado acima para continuar."
						}) : null,
						passo === 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "botao botao-cheio botao-bloco botao-grande",
							disabled: temErroNasLinhas,
							onClick: () => {
								if (!frete) {
									setFreteMsg("Calcule o frete e escolha a entrega para continuar.");
									document.getElementById("cep-carrinho")?.focus();
									return;
								}
								setPasso(2);
							},
							children: frete ? "Continuar" : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
								nome: "caminhao",
								tamanho: 20
							}), "Calcule o frete para continuar"] })
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "botao botao-cheio botao-bloco botao-grande",
							onClick: finalizar,
							disabled: enviando,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
								nome: usuario ? "cadeado" : "pessoa",
								tamanho: 20
							}), enviando ? "Abrindo o pagamento…" : usuario ? `Ir para o pagamento · ${dinheiro(total)}` : "Entrar para finalizar"]
						}),
						passo === 2 && tentou && !enderecoOk ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: "dica erro-campo",
							children: [
								"Falta preencher: ",
								REGRAS_ENDERECO.filter((r) => erros[r.campo]).map((r) => r.rotulo).join(", "),
								"."
							]
						}) : null
					]
				}) : null
			]
		})
	});
}
// loja/src/componentes/Rodape.tsx
function Rodape({ loja }) {
	const tipos = loja.categorias.filter((c) => c.grupo === "tipo" && c.quantidade > 0).slice(0, 6);
	const { pixDiscountPercent, interestFreeInstallments } = loja.regrasPagamento;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
		className: "rodape",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Onda, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "rodape-fundo",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "rodape-grade",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "rodape-marca",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: "rodape-logo",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "arte" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "Canecas" })]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
							"Transformando sentimentos em presentes.",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
							loja.cidade
						] })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
						"aria-label": "Loja",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: "Loja" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", { children: tipos.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
							href: `/categoria/${c.slug}`,
							children: c.nome
						}) }, c.slug)) })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
						"aria-label": "Ajuda",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: "Ajuda" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								href: "/acompanhar-pedido.html",
								children: "Acompanhar pedido"
							}) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								href: "/pedidos.html",
								children: "Minha conta"
							}) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								href: "/#como-personalizar",
								children: "Como personalizar"
							}) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								href: "/politica.html#trocas",
								children: "Trocas e devoluções"
							}) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								href: "/politica.html#privacidade",
								children: "Privacidade"
							}) })
						] })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: "Fale com a gente" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
							href: linkWhatsApp(loja.whatsapp),
							target: "_blank",
							rel: "noopener noreferrer",
							children: ["WhatsApp ", loja.whatsappFormatado]
						}) }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
							href: `mailto:${loja.email}`,
							children: loja.email
						}) }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
							href: `https://www.instagram.com/${loja.instagram}`,
							target: "_blank",
							rel: "noopener noreferrer",
							children: ["Instagram e TikTok @", loja.instagram]
						}) })
					] })] })
				]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "rodape-base",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "rodape-pagamentos",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
							"Pix com ",
							pixDiscountPercent,
							"% de desconto"
						] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
							"Cartão em até ",
							interestFreeInstallments,
							"x sem juros"
						] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "Boleto" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "rodape-seguro",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
								nome: "cadeado",
								tamanho: 16
							}), "Compra segura · Mercado Pago"]
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
					loja.nome,
					" · CNPJ ",
					loja.cnpj,
					" · © ",
					(/* @__PURE__ */ new Date()).getFullYear()
				] })]
			})]
		})]
	});
}
function WhatsAppFlutuante({ loja }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
		className: "whatsapp-flutuante",
		href: linkWhatsApp(loja.whatsapp),
		target: "_blank",
		rel: "noopener noreferrer",
		"aria-label": `Falar com a ${loja.responsavel} no WhatsApp`,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
			nome: "whatsapp",
			tamanho: 30,
			traco: 1.6
		})
	});
}
// loja/src/paginas/Busca.tsx
function Favoritos() {
	const { favoritos } = useFavoritos();
	const [produtos, setProdutos] = (0, react.useState)(null);
	(0, react.useEffect)(() => {
		if (!favoritos.length) {
			setProdutos([]);
			return;
		}
		fetch(`/api/busca?ids=${favoritos.join(",")}`).then((r) => r.ok ? r.json() : { produtos: [] }).then((d) => setProdutos(d.produtos || [])).catch(() => setProdutos([]));
	}, [favoritos]);
	if (produtos === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
		className: "lista-contagem",
		children: "Carregando seus favoritos…"
	});
	if (!produtos.length) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "vazio",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
			nome: "coracao",
			tamanho: 32
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "Você ainda não favoritou nada. Toque no coração de um produto para guardar aqui." })]
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		className: "grade-produtos",
		children: produtos.map((p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CartaoProduto, { produto: p }, p.id))
	});
}
function Busca({ pagina }) {
	const favoritos = pagina.favoritos;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "envolve pagina-lista",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
				className: "trilha",
				"aria-label": "Você está em",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
						href: "/",
						children: "Início"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						"aria-hidden": "true",
						children: "›"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						"aria-current": "page",
						children: pagina.termo ? "Busca" : "Todos os produtos"
					})
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "lista-topo",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "sobretitulo",
						children: favoritos ? "Guardados por você" : pagina.termo ? "Resultados para" : "Catálogo"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", { children: favoritos ? "Favoritos" : pagina.termo ? `“${pagina.termo}”` : "Todos os produtos" }),
					favoritos ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "lista-contagem",
						role: "status",
						children: pagina.produtos.length === 1 ? "1 produto" : `${pagina.produtos.length} produtos`
					})
				] })
			}),
			favoritos ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Favoritos, {}) : pagina.produtos.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "grade-produtos",
				children: pagina.produtos.map((p, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CartaoProduto, {
					produto: p,
					prioridade: i < 2
				}, p.id))
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "vazio",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
						nome: "busca",
						tamanho: 32
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
						"Não achamos nada com “",
						pagina.termo,
						"”. Tente outra palavra, como “caneca”, “xícara” ou “garrafa”."
					] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
						className: "botao botao-vazado",
						href: "/busca",
						children: "Ver todos os produtos"
					})
				]
			})
		]
	});
}
// loja/src/paginas/Categoria.tsx
var ORDENS = [
	{
		id: "destaque",
		nome: "Destaques"
	},
	{
		id: "menor-preco",
		nome: "Menor preço"
	},
	{
		id: "maior-preco",
		nome: "Maior preço"
	},
	{
		id: "nome",
		nome: "Nome (A–Z)"
	}
];
var FAIXAS = [
	{
		id: "",
		nome: "Qualquer preço"
	},
	{
		id: "0-40",
		nome: "Até R$ 40"
	},
	{
		id: "40-70",
		nome: "R$ 40 a R$ 70"
	},
	{
		id: "70-120",
		nome: "R$ 70 a R$ 120"
	},
	{
		id: "120-",
		nome: "Acima de R$ 120"
	}
];
function enderecoDaPagina(slug, filtros, pagina) {
	const params = new URLSearchParams();
	if (filtros.outra) params.set("outra", filtros.outra);
	if (filtros.preco) params.set("preco", filtros.preco);
	if (filtros.ordem && filtros.ordem !== "destaque") params.set("ordem", filtros.ordem);
	if (pagina > 1) params.set("pagina", String(pagina));
	const texto = params.toString();
	return `/categoria/${slug}${texto ? `?${texto}` : ""}`;
}
function Categoria({ pagina }) {
	const { categoria, filtros } = pagina;
	const outroGrupo = pagina.outras.filter((c) => c.grupo !== categoria.grupo);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "envolve pagina-lista",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
				className: "trilha",
				"aria-label": "Você está em",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
						href: "/",
						children: "Início"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						"aria-hidden": "true",
						children: "›"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						"aria-current": "page",
						children: categoria.nome
					})
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lista-topo",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "sobretitulo",
						children: categoria.grupo === "ocasiao" ? "Presentes para" : "Categoria"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", { children: categoria.nome }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "lista-contagem",
						role: "status",
						children: pagina.total === 1 ? "1 produto" : `${pagina.total} produtos`
					})
				] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
					className: "filtros",
					method: "get",
					action: `/categoria/${categoria.slug}`,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "campo",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								htmlFor: "filtro-outra",
								children: categoria.grupo === "ocasiao" ? "Tipo" : "Ocasião"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								id: "filtro-outra",
								name: "outra",
								defaultValue: filtros.outra,
								onChange: (e) => e.currentTarget.form?.requestSubmit(),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: "Todos"
								}), outroGrupo.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: c.slug,
									children: c.nome
								}, c.slug))]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "campo",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								htmlFor: "filtro-preco",
								children: "Preço"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
								id: "filtro-preco",
								name: "preco",
								defaultValue: filtros.preco,
								onChange: (e) => e.currentTarget.form?.requestSubmit(),
								children: FAIXAS.map((f) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: f.id,
									children: f.nome
								}, f.id))
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "campo",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								htmlFor: "filtro-ordem",
								children: "Ordenar"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
								id: "filtro-ordem",
								name: "ordem",
								defaultValue: filtros.ordem,
								onChange: (e) => e.currentTarget.form?.requestSubmit(),
								children: ORDENS.map((o) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: o.id,
									children: o.nome
								}, o.id))
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("noscript", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "submit",
							className: "botao botao-vazado",
							children: "Filtrar"
						}) })
					]
				})]
			}),
			pagina.produtos.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "grade-produtos",
				children: pagina.produtos.map((p, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CartaoProduto, {
					produto: p,
					prioridade: i < 2
				}, p.id))
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "vazio",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
						nome: "filtro",
						tamanho: 32
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "Nenhum produto com esses filtros." }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
						className: "botao botao-vazado",
						href: `/categoria/${categoria.slug}`,
						children: "Limpar filtros"
					})
				]
			}),
			pagina.paginas > 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
				className: "paginacao",
				"aria-label": "Páginas",
				children: [
					pagina.pagina > 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
						href: enderecoDaPagina(categoria.slug, filtros, pagina.pagina - 1),
						rel: "prev",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
							nome: "setaEsquerda",
							tamanho: 18
						}), "Anterior"]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
						"Página ",
						pagina.pagina,
						" de ",
						pagina.paginas
					] }),
					pagina.pagina < pagina.paginas ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
						href: enderecoDaPagina(categoria.slug, filtros, pagina.pagina + 1),
						rel: "next",
						children: ["Próxima", /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
							nome: "setaDireita",
							tamanho: 18
						})]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {})
				]
			}) : null
		]
	});
}
// loja/src/paginas/Inicio.tsx
var FITAS = [
	"fita-crepe",
	"fita-rosa",
	"fita-caramelo"
];
var GIROS = [
	-2,
	1.5,
	-1,
	2,
	-1.5
];
var TIPOS = [
	{
		nome: "Canecas",
		slug: "canecas",
		img: "/img/provisorias/canecas-alca-colorida.jpg",
		alt: "Canecas com alça e interior coloridos"
	},
	{
		nome: "Xícaras e kits",
		slug: "xicaras-e-kits",
		img: "/img/provisorias/xicaras-casamento.jpg",
		alt: "Xícaras de casamento empilhadas"
	},
	{
		nome: "Garrafas",
		slug: "garrafas-e-termicos",
		img: "/img/provisorias/garrafa-professores.jpg",
		alt: "Garrafa personalizada com fotos de alunos"
	},
	{
		nome: "Ipês Brasília",
		slug: "ipes-brasilia",
		img: "/img/provisorias/ipe-amarelo.jpg",
		alt: "Ipê amarelo feito à mão"
	},
	{
		nome: "Presentes",
		slug: "acessorios-e-embalagens",
		img: "/img/provisorias/caneca-caixa-presente.jpg",
		alt: "Caneca com caixa de presente e laço"
	}
];
var MOMENTOS = [
	{
		nome: "Casamento",
		slug: "casamento",
		d: "M4 14a5 5 0 1 0 10 0a5 5 0 1 0 -10 0M10 14a5 5 0 1 0 10 0a5 5 0 1 0 -10 0M9 6l1.5-2.5h3L15 6"
	},
	{
		nome: "Padrinhos",
		slug: "padrinhos",
		d: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"
	},
	{
		nome: "Dia das Mães",
		slug: "dia-das-maes",
		d: "M12 21v-8M7 5c0 4 2 7 5 8 3-1 5-4 5-8l-2.5 2L12 4 9.5 7zM12 17c-2 0-4-1-5-3M12 18c2 0 4-1 5-3"
	},
	{
		nome: "Dia dos Pais",
		slug: "dia-dos-pais",
		d: "M5 9h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM16 11h1.5a2.5 2.5 0 0 1 0 5H16M8.5 3.5v3M12.5 3.5v3"
	},
	{
		nome: "Professores",
		slug: "professores",
		d: "M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z"
	},
	{
		nome: "Empresas",
		slug: "empresas",
		d: "M3 8h18v11H3zM9 8V5h6v3M3 13h18"
	},
	{
		nome: "Aniversário",
		slug: "aniversario",
		d: "M4 21h16M5 21v-8h14v8M5 16c2 1 3-1 4.7 0s3 1 4.6 0 3-1 4.7 0M12 13V9M12 6.5V6"
	},
	{
		nome: "Brasília",
		slug: "brasilia",
		d: "M3 20h18M7 20c1-6 3-11 5-15M17 20c-1-6-3-11-5-15M9.5 20c.7-5 1.5-9 2.5-15M14.5 20c-.7-5-1.5-9-2.5-15M12 5V2.5"
	}
];
var INSTAGRAM = [
	{
		img: "/img/provisorias/caneca-rostinhos.jpg",
		alt: "Caneca com rostinhos para o Dia dos Pais"
	},
	{
		img: "/img/provisorias/xicaras-casamento.jpg",
		alt: "Xícaras de casamento"
	},
	{
		img: "/img/provisorias/xicara-catedral.jpg",
		alt: "Xícara com a Catedral de Brasília"
	},
	{
		img: "/img/provisorias/caneca-caixa-presente.jpg",
		alt: "Caneca e caixa de presente"
	},
	{
		img: "/img/provisorias/garrafa-professores.jpg",
		alt: "Garrafa para professores"
	},
	{
		img: "/img/provisorias/ipe-amarelo.jpg",
		alt: "Ipê amarelo"
	}
];
var CANECA_EXEMPLO = {
	categorias: [],
	medida: "",
	codigo: "",
	cuidados: "",
	aviso: null,
	molde: "caneca",
	formato: "",
	corPeca: "#FFFFFF",
	corAlca: "#F2A7BE",
	magica: false,
	moldeFoto: null,
	variacoes: [],
	adicionais: [],
	faixas: [],
	qtdMinima: 1,
	personalizacao: {
		ativa: true,
		campos: { nome: {
			ativo: true,
			obrigatorio: false,
			limite: 20,
			rotulo: "Nome"
		} },
		letras: ["cursiva"],
		artes: ["flor"],
		fotos: {
			min: 0,
			max: 0,
			formato: "circulo"
		},
		verso: true
	}
};
function Destaque({ pagina }) {
	const slides = pagina.destaques;
	const [atual, setAtual] = (0, react.useState)(0);
	const [pausado, setPausado] = (0, react.useState)(false);
	(0, react.useEffect)(() => {
		if (slides.length < 2 || pausado) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const relogio = setInterval(() => setAtual((i) => (i + 1) % slides.length), 6e3);
		return () => clearInterval(relogio);
	}, [slides.length, pausado]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
		className: "destaque envolve",
		"aria-roledescription": "carrossel",
		"aria-label": "Destaques",
		onMouseEnter: () => setPausado(true),
		onMouseLeave: () => setPausado(false),
		onFocus: () => setPausado(true),
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "destaque-cartao",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "destaque-texto",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "sobretitulo",
							children: "Canecas e xícaras personalizadas · Brasília"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", { children: "Presentes que marcam" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "cursiva destaque-cursiva",
							children: "transformando sentimentos em presentes"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "destaque-apoio",
							children: "Escolha a peça, escreva o nome ou envie suas fotos e veja como a arte fica na caneca antes de comprar."
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "destaque-acoes",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								className: "botao botao-cheio botao-grande",
								href: "/categoria/canecas",
								children: "Ver as canecas"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								className: "botao botao-vazado botao-grande",
								href: "/#previa",
								children: "Criar a minha e ver a prévia"
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "destaque-fotos",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "faixa-caramelo faixa-caramelo-direita",
							"aria-hidden": "true"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "polaroid destaque-polaroid",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "fita fita-crepe",
								"aria-hidden": "true"
							}), slides.map((s, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: `destaque-slide${i === atual ? " ativo" : ""}`,
								"aria-hidden": i !== atual,
								role: "group",
								"aria-roledescription": "slide",
								"aria-label": `${i + 1} de ${slides.length}`,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Foto, {
									src: s.src,
									alt: s.alt,
									sizes: "340px",
									prioridade: i === 0,
									largura: 340,
									altura: 340,
									className: "polaroid-foto"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "cursiva polaroid-legenda",
									children: s.legenda
								})]
							}, s.src))]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "destaque-circulo",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Foto, {
								src: "/img/provisorias/xicara-ipes.jpg",
								alt: "Xícara da coleção Ipês Brasília",
								sizes: "190px",
								largura: 190,
								altura: 190
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "destaque-selo",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SeloPersonalizavel, {})
						})
					]
				}),
				slides.length > 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "destaque-pontos",
					children: slides.map((s, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: i === atual ? "ativo" : void 0,
						"aria-label": `Destaque ${i + 1} de ${slides.length}`,
						"aria-current": i === atual,
						onClick: () => setAtual(i)
					}, s.src))
				}) : null
			]
		})
	});
}
function Vantagens({ loja }) {
	const itens = [
		{
			t: "Personalização inclusa",
			s: "nome, frase ou fotos",
			icone: "lapis"
		},
		{
			t: "Enviamos para todo o Brasil",
			s: loja.retirada ? "ou retire na Asa Norte" : "pelo Melhor Envio",
			icone: "caminhao"
		},
		{
			t: "Parcelamos no cartão",
			s: `ou ${loja.regrasPagamento.pixDiscountPercent}% de desconto no Pix`,
			icone: "cartao"
		},
		{
			t: "Acima de 10 unidades",
			s: "condições especiais",
			icone: "caixas"
		}
	];
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
		className: "vantagens envolve",
		"aria-label": "Vantagens",
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", { children: itens.map((v) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			className: "vantagem-icone",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
				nome: v.icone,
				tamanho: 24,
				traco: 1.6
			})
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: v.t }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: v.s })] })] }, v.t)) })
	});
}
function Vitrine({ pagina }) {
	const vitrines = pagina.vitrines.filter((v) => v.produtos.length > 0);
	const [aba, setAba] = (0, react.useState)(vitrines[0]?.id ?? "");
	const atual = vitrines.find((v) => v.id === aba) ?? vitrines[0];
	if (!atual) return null;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
		className: "secao envolve",
		"aria-labelledby": "mais-pedidas",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "secao-topo secao-topo-lado",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "cursiva sobre-titulo",
				children: "as queridinhas"
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
				id: "mais-pedidas",
				children: atual.nome
			})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				role: "tablist",
				"aria-label": "Vitrines",
				className: "abas",
				children: vitrines.map((v) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					role: "tab",
					id: `aba-${v.id}`,
					"aria-selected": v.id === atual.id,
					"aria-controls": "vitrine-painel",
					className: v.id === atual.id ? "ativa" : void 0,
					onClick: () => setAba(v.id),
					children: v.nome
				}, v.id))
			})]
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: "grade-produtos",
			role: "tabpanel",
			id: "vitrine-painel",
			"aria-labelledby": `aba-${atual.id}`,
			children: atual.produtos.map((p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CartaoProduto, { produto: p }, p.id))
		})]
	});
}
function Avaliacoes({ pagina }) {
	const { total, media, itens } = pagina.avaliacoes;
	if (!itens.length) return null;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
		className: "secao envolve",
		"aria-labelledby": "avaliacoes-titulo",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "secao-topo",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "cursiva sobre-titulo",
					children: "quem já recebeu"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
					id: "avaliacoes-titulo",
					children: "O que dizem as clientes"
				}),
				total > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "nota-media",
					children: `${media.toFixed(1).replace(".", ",")} de 5 · ${total === 1 ? "1 avaliação verificada" : `${total} avaliações verificadas`}`
				}) : null
			]
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
			className: "avaliacoes avaliacoes-home",
			children: itens.map((a, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: "cartao-texto",
				children: [
					a.tipo === "avaliacao" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: "avaliacao-topo",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "estrelas",
							role: "img",
							"aria-label": `${a.nota} de 5 estrelas`,
							children: ["★".repeat(a.nota), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								className: "estrelas-apagadas",
								children: "★".repeat(5 - a.nota)
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "selo-verificada",
							children: "Compra verificada"
						})]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "avaliacao-topo",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "selo-origem",
							children: `Enviado por ${a.origem}`
						})
					}),
					a.texto ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
						"“",
						a.texto,
						"”"
					] }) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: "avaliacao-rodape",
						children: [a.foto ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
							href: `${a.foto}?w=640`,
							target: "_blank",
							rel: "noopener",
							"aria-label": `Ver a foto enviada por ${a.quem || "cliente"}`,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
								src: `${a.foto}?w=160`,
								alt: "",
								width: 48,
								height: 48,
								loading: "lazy",
								decoding: "async"
							})
						}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [a.quem ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "avaliacao-quem",
							children: a.quem
						}) : null, a.produto ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "avaliacao-produto",
							children: a.produto
						}) : null] })]
					})
				]
			}, i))
		})]
	});
}
function Inicio({ pagina, loja }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Destaque, { pagina }),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Vantagens, { loja }),
		/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
			className: "secao envolve",
			"aria-labelledby": "tipos",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "secao-topo",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "cursiva sobre-titulo",
					children: "feito com carinho"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
					id: "tipos",
					children: "Escolha pelo tipo"
				})]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "grade-polaroids",
				children: TIPOS.map((t, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
					className: "polaroid polaroid-tipo",
					href: `/categoria/${t.slug}`,
					style: { rotate: `${GIROS[i % GIROS.length]}deg` },
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: `fita ${FITAS[i % FITAS.length]}`,
							"aria-hidden": "true"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Foto, {
							src: t.img,
							alt: t.alt,
							sizes: "(max-width: 640px) 45vw, 230px",
							largura: 230,
							altura: 288,
							className: "polaroid-foto"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "polaroid-nome",
							children: t.nome
						})
					]
				}, t.slug))
			})]
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
			className: "secao envolve",
			"aria-labelledby": "momentos",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "secao-topo",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
					id: "momentos",
					children: "Para cada momento"
				})
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
				className: "momentos",
				children: MOMENTOS.map((m, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
					href: `/categoria/${m.slug}`,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `momento-circulo${i % 2 ? " momento-creme" : ""}`,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
							width: "44",
							height: "44",
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: "currentColor",
							strokeWidth: "1.3",
							strokeLinecap: "round",
							strokeLinejoin: "round",
							"aria-hidden": "true",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: m.d })
						})
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "momento-nome",
						children: m.nome
					})]
				}) }, m.slug))
			})]
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Vitrine, { pagina }),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Avaliacoes, { pagina }),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
			className: "secao envolve",
			id: "previa",
			"aria-labelledby": "previa-titulo",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "chamada-previa",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "chamada-previa-peca",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "faixa-caramelo faixa-caramelo-esquerda",
						"aria-hidden": "true"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
						viewBox: "0 0 360 380",
						role: "img",
						"aria-label": "Prévia de caneca rosa com florzinha e o nome Madrinha Lara",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PecaSvg, {
							config: CANECA_EXEMPLO,
							escolhas: {
								variacoes: {},
								adicionais: [],
								personalizacao: {
									nome: "Madrinha Lara",
									arte: "flor",
									letra: "cursiva"
								}
							},
							lado: "frente",
							aquecida: false,
							urlDaFoto: () => null,
							medir: false
						})
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "chamada-previa-texto",
					id: "como-personalizar",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "etiqueta",
							children: "Novo no site"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							id: "previa-titulo",
							children: "Veja como fica antes de comprar"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ol", {
							className: "passos",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "passo-numero",
									children: "1"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "Escolha a peça e a cor" }), ": caneca, xícara, garrafa ou vidro."] })] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "passo-numero",
									children: "2"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "Escreva o nome, a frase ou envie fotos" }), ": a prévia muda na hora."] })] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "passo-numero",
									children: "3"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", { children: [
									"A ",
									loja.responsavel,
									" finaliza a arte"
								] }), " e, se você quiser, aprova com você pelo WhatsApp antes de produzir."] })] })
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
							className: "botao botao-cheio botao-grande",
							href: pagina.vitrines[0]?.produtos[0]?.endereco ?? "/categoria/canecas",
							children: "Experimentar agora"
						})
					]
				})]
			})
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
			className: "faixa-ipes",
			"aria-labelledby": "ipes",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "envolve faixa-ipes-grade",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "faixa-ipes-texto",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "sobretitulo",
							children: "Coleção"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							id: "ipes",
							children: "Ipês Brasília"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "cursiva",
							children: "brasiliense de coração"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "faixa-ipes-apoio",
							children: "A beleza dos ipês em uma peça que floresce o ano inteiro: xícaras com line art da cidade e ipês feitos à mão, em fio náutico e base de madeira."
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
							className: "botao botao-escuro botao-grande",
							href: "/categoria/ipes-brasilia",
							children: "Ver a coleção"
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "arcos",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Foto, {
							src: "/img/provisorias/ipe-amarelo.jpg",
							alt: "Ipê amarelo artesanal",
							sizes: "(max-width: 640px) 30vw, 200px",
							largura: 200,
							altura: 290,
							className: "arco arco-1"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Foto, {
							src: "/img/provisorias/xicara-catedral.jpg",
							alt: "Xícara com line art da Catedral de Brasília",
							sizes: "(max-width: 640px) 30vw, 200px",
							largura: 200,
							altura: 330,
							className: "arco arco-2"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Foto, {
							src: "/img/provisorias/ipe-roxo.jpg",
							alt: "Ipê roxo artesanal",
							sizes: "(max-width: 640px) 30vw, 200px",
							largura: 200,
							altura: 266,
							className: "arco arco-3"
						})
					]
				})]
			})
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
			className: "secao envolve grandes",
			"aria-label": "Pedidos em quantidade",
			children: [{
				titulo: "Casamentos e padrinhos",
				texto: "Xícaras, torres e lembrancinhas com os nomes e a data. Acima de 10 unidades, condição especial.",
				img: "/img/provisorias/xicaras-casamento.jpg",
				alt: "Dezenas de xícaras de casamento",
				mensagem: "Olá! Quero um orçamento para casamento."
			}, {
				titulo: "Brindes para empresas",
				texto: "Garrafas, canecas e kits com a sua marca, para equipe, clientes e eventos.",
				img: "/img/provisorias/garrafa-inox-brasilia.jpg",
				alt: "Garrafa de inox com line art de Brasília",
				mensagem: "Olá! Quero um orçamento de brindes para empresa."
			}].map((g) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
				className: "cartao-grande",
				href: linkWhatsApp(loja.whatsapp, g.mensagem),
				target: "_blank",
				rel: "noopener noreferrer",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Foto, {
					src: g.img,
					alt: g.alt,
					sizes: "(max-width: 640px) 40vw, 260px",
					largura: 260,
					altura: 300,
					className: "cartao-grande-foto"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "cartao-grande-texto",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "cartao-grande-titulo",
							children: g.titulo
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "cartao-grande-apoio",
							children: g.texto
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "botao botao-whatsapp",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
								nome: "whatsapp",
								tamanho: 20
							}), "Pedir orçamento"]
						})
					]
				})]
			}, g.titulo))
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
			className: "secao envolve instagram",
			"aria-labelledby": "insta",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "secao-topo",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "cursiva sobre-titulo",
						children: "60,7 mil pessoas acompanham"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h2", {
						id: "insta",
						children: ["@", loja.instagram]
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "grade-instagram",
					children: INSTAGRAM.map((i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
						href: `https://www.instagram.com/${loja.instagram}`,
						target: "_blank",
						rel: "noopener noreferrer",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Foto, {
							src: i.img,
							alt: i.alt,
							sizes: "(max-width: 640px) 33vw, 200px",
							largura: 200,
							altura: 200
						})
					}, i.img))
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
					className: "botao botao-vazado botao-grande",
					href: `https://www.instagram.com/${loja.instagram}`,
					target: "_blank",
					rel: "noopener noreferrer",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
						nome: "instagram",
						tamanho: 20
					}), "Seguir no Instagram"]
				})
			]
		})
	] });
}
// loja/src/paginas/Produto.tsx
var Previa3D = (0, react.lazy)(() => Promise.resolve().then(() => require("./assets/Previa3D-DtCcLhuy.js")));
var MOLDES_3D = [
	"caneca",
	"xicara",
	"garrafa",
	"copo"
];
var ICONES_DOS_EXTRAS = {
	"Tampa de bambu para caneca": "tampa",
	"Caixa de presente": "presente",
	"Mini buquê de flores secas": "buque",
	"Caixa de MDF com tampa personalizada": "caixaMdf"
};
function usaFotos(produto, escolhas) {
	const pers = produto.config.personalizacao;
	if (!pers.ativa || pers.fotos.max === 0) return false;
	if (!pers.artes.includes("fotos")) return true;
	return escolhas.personalizacao.arte === "fotos";
}
function Galeria({ produto, escolhas, lado, setLado, aquecida, setAquecida, fotoSelecionada, aoTocarFoto }) {
	const [vista, setVista] = (0, react.useState)(-1);
	const [modo3d, setModo3d] = (0, react.useState)(false);
	const medir = useMedirTexto();
	const config = produto.config;
	const temPrevia = config.molde !== "nenhum" && (config.personalizacao.ativa || produto.fotos.length === 0);
	const mostrandoFoto = vista >= 0 || !temPrevia;
	const indiceFoto = vista >= 0 ? vista : 0;
	const temVerso = config.personalizacao.ativa && config.personalizacao.verso;
	const descricao = descricaoDaPrevia(produto.nome, config, escolhas, lado, aquecida);
	const pode3d = MOLDES_3D.includes(config.molde) && config.personalizacao.ativa;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "galeria",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: `galeria-palco${mostrandoFoto ? " com-foto" : ""}`,
			children: modo3d && !mostrandoFoto ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react.Suspense, {
				fallback: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "previa-3d-aviso",
					children: "Preparando o 3D…"
				}),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Previa3D, {
					config,
					escolhas,
					aquecida,
					rotulo: `${descricao}, em 3D`,
					fechar: () => setModo3d(false)
				})
			}) : mostrandoFoto && produto.fotos[indiceFoto] ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Foto, {
				src: produto.fotos[indiceFoto],
				alt: `${produto.nome}, foto ${indiceFoto + 1}`,
				larguras: [600, 900],
				sizes: "(max-width: 900px) 100vw, 620px",
				largura: 620,
				altura: 620,
				className: "galeria-foto",
				prioridade: true
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "faixa-caramelo galeria-faixa",
					"aria-hidden": "true"
				}),
				temVerso ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					role: "tablist",
					"aria-label": "Lado da peça",
					className: "galeria-lados",
					children: ["frente", "verso"].map((l) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						role: "tab",
						"aria-selected": lado === l,
						className: lado === l ? "ativo" : void 0,
						onClick: () => setLado(l),
						children: l === "frente" ? "Frente" : "Verso"
					}, l))
				}) : null,
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "cursiva galeria-rotulo",
					"aria-hidden": "true",
					children: "prévia ao vivo"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
					className: "galeria-previa",
					viewBox: "0 0 360 380",
					role: "img",
					"aria-label": descricao,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PecaSvg, {
						config,
						escolhas,
						lado,
						aquecida,
						urlDaFoto: urlDaFotoEnviada,
						medir,
						fotoSelecionada: aoTocarFoto ? fotoSelecionada : void 0,
						aoTocarFoto,
						urlDaFotoDoMolde: config.moldeFoto?.foto ? urlDaFoto(config.moldeFoto.foto, 900) : null
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "visualmente-oculto",
					"aria-live": "polite",
					children: descricao
				}),
				pode3d ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "botao botao-escuro galeria-3d",
					onClick: () => setModo3d(true),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
						nome: "girar",
						tamanho: 18
					}), "Ver em 3D"]
				}) : null,
				config.magica ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "botao botao-escuro galeria-calor",
					"aria-pressed": aquecida,
					onClick: () => setAquecida(!aquecida),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
						nome: "calor",
						tamanho: 18
					}), aquecida ? "Ver a caneca fria" : "Ver depois de aquecer"]
				}) : null,
				config.personalizacao.ativa ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "galeria-nota",
					children: "Prévia ilustrativa. A arte final é ajustada à mão pela Janaina."
				}) : null
			] })
		}), (temPrevia ? 1 : 0) + produto.fotos.length > 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "galeria-miniaturas",
			role: "group",
			"aria-label": "Fotos do produto",
			children: [temPrevia ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: `galeria-miniatura miniatura-previa${!mostrandoFoto ? " ativa" : ""}`,
				"aria-pressed": !mostrandoFoto,
				onClick: () => setVista(-1),
				children: "Prévia"
			}) : null, produto.fotos.map((foto, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: `galeria-miniatura${mostrandoFoto && indiceFoto === i ? " ativa" : ""}`,
				"aria-pressed": mostrandoFoto && indiceFoto === i,
				"aria-label": `Ver foto ${i + 1}`,
				onClick: () => setVista(i),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Foto, {
					src: foto,
					alt: "",
					larguras: [160],
					sizes: "120px",
					largura: 120,
					altura: 120
				})
			}, foto))]
		}) : null]
	});
}
function CampoDeTexto({ id, campo, valor, aoMudar, multilinha = false }) {
	const passou = valor.length > campo.limite;
	const ajuda = `${id}-ajuda`;
	const exemplos = {
		nome: "Ex.: Madrinha Lara",
		frase: "Ex.: obrigada por tanto amor",
		data: "Ex.: 12.04.2027",
		observacoes: "Cores, ideias, detalhes da arte…"
	};
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: `campo campo-personalizacao${multilinha ? " campo-largo" : ""}`,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				htmlFor: `pers-${id}`,
				children: [campo.rotulo, campo.obrigatorio ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "obrigatorio",
					children: " (obrigatório)"
				}) : null]
			}),
			multilinha ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
				id: `pers-${id}`,
				value: valor,
				rows: 3,
				placeholder: exemplos[id],
				"aria-describedby": ajuda,
				"aria-invalid": passou,
				onChange: (e) => aoMudar(e.target.value)
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
				id: `pers-${id}`,
				type: "text",
				value: valor,
				placeholder: exemplos[id],
				"aria-describedby": ajuda,
				"aria-invalid": passou,
				onChange: (e) => aoMudar(e.target.value)
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				id: ajuda,
				className: `contador-letras${passou ? " passou" : ""}`,
				"aria-live": passou ? "polite" : "off",
				children: passou ? `Passou ${valor.length - campo.limite} ${valor.length - campo.limite === 1 ? "letra" : "letras"} do limite de ${campo.limite}. Encurte um pouquinho.` : `${valor.length} de ${campo.limite} letras`
			})
		]
	});
}
function EnvioDeFotos({ produto, fotos, setFotos, selecionada, setSelecionada }) {
	const { min, max } = produto.config.personalizacao.fotos;
	const [enviando, setEnviando] = (0, react.useState)(0);
	const [erro, setErro] = (0, react.useState)("");
	const atual = (0, react.useRef)(fotos);
	atual.current = fotos;
	async function aoEscolher(evento) {
		const arquivos = Array.from(evento.target.files || []);
		evento.target.value = "";
		setErro("");
		const vagas = max - atual.current.length;
		if (arquivos.length > vagas) setErro(vagas > 0 ? `Cabem só mais ${vagas} ${vagas === 1 ? "foto" : "fotos"} nesta peça.` : `Esta peça aceita até ${max} ${max === 1 ? "foto" : "fotos"}. Tire uma para trocar.`);
		for (const arquivo of arquivos.slice(0, Math.max(0, vagas))) {
			if (!arquivo.type.startsWith("image/")) {
				setErro(`"${arquivo.name}" não é uma foto.`);
				continue;
			}
			if (arquivo.size > 15728640) {
				setErro(`"${arquivo.name}" passa de 15 MB.`);
				continue;
			}
			setEnviando((n) => n + 1);
			try {
				const enviada = await enviarFoto(arquivo);
				lembrarFotoLocal(enviada.id, arquivo);
				const nova = {
					id: enviada.id,
					chave: enviada.chave,
					x: 0,
					y: 0,
					zoom: 1
				};
				setFotos([...atual.current, nova]);
				setSelecionada(atual.current.length);
			} catch (e) {
				setErro(e instanceof Error ? e.message : "Não deu para enviar a foto. Tente de novo.");
			} finally {
				setEnviando((n) => n - 1);
			}
		}
	}
	function ajustar(indice, mudanca) {
		setFotos(fotos.map((f, i) => i === indice ? {
			...f,
			...mudanca
		} : f));
	}
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "envio-fotos",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "envio-fotos-topo",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
						nome: "envio",
						tamanho: 32,
						traco: 1.5
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", { children: [
						"Envie ",
						min > 1 ? `de ${min} a ${max}` : max === 1 ? "1" : `de 1 a ${max}`,
						" ",
						max === 1 ? "foto" : "fotos"
					] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "JPG ou PNG, até 15 MB cada. Fotos de rosto bem iluminadas ficam melhores." })] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: `botao botao-cheio${fotos.length >= max ? " desativado" : ""}`,
						children: [enviando > 0 ? "Enviando…" : "Escolher", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "file",
							accept: "image/*",
							multiple: max > 1,
							className: "visualmente-oculto",
							onChange: aoEscolher,
							disabled: fotos.length >= max,
							"aria-label": "Escolher fotos para a arte"
						})]
					})
				]
			}),
			erro ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "mensagem-erro",
				role: "alert",
				children: erro
			}) : null,
			fotos.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
				className: "fotos-enviadas",
				children: fotos.map((f, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
					className: i === selecionada ? "selecionada" : void 0,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "foto-enviada",
						onClick: () => setSelecionada(i),
						"aria-pressed": i === selecionada,
						"aria-label": `Ajustar a foto ${i + 1}`,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
							src: urlDaFotoEnviada(f) ?? "",
							alt: "",
							width: 56,
							height: 56
						})
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "foto-controles",
						role: "group",
						"aria-label": `Foto ${i + 1}`,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "botao-icone",
								onClick: () => ajustar(i, { zoom: Math.max(1, Math.round((f.zoom - .25) * 100) / 100) }),
								"aria-label": `Afastar a foto ${i + 1}`,
								disabled: f.zoom <= 1,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
									nome: "zoomMenos",
									tamanho: 20
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "botao-icone",
								onClick: () => ajustar(i, { zoom: Math.min(3, Math.round((f.zoom + .25) * 100) / 100) }),
								"aria-label": `Aproximar a foto ${i + 1}`,
								disabled: f.zoom >= 3,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
									nome: "zoomMais",
									tamanho: 20
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "botao-icone",
								onClick: () => {
									setFotos(fotos.filter((_, j) => j !== i));
									setSelecionada(Math.max(0, i - 1));
								},
								"aria-label": `Tirar a foto ${i + 1}`,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
									nome: "lixeira",
									tamanho: 20
								})
							})
						]
					})]
				}, f.id))
			}) : null,
			fotos.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "dica",
				children: "Aproxime com a lupa e arraste a foto na prévia para escolher o enquadramento."
			}) : null
		]
	});
}
function Personalizar({ produto, escolhas, mudar, fotoSelecionada, setFotoSelecionada, setLado }) {
	const pers = produto.config.personalizacao;
	const p = escolhas.personalizacao;
	const campos = pers.campos;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "caixa-personalizar",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h2", { children: ["Personalize ", produto.config.molde === "caneca" ? "a sua" : "do seu jeito"] }),
			pers.artes.length > 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("fieldset", {
				className: "grupo-escolha",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("legend", { children: "Arte" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "chips",
					children: pers.artes.map((id) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-pressed": p.arte === id,
						className: `chip${p.arte === id ? " ativo" : ""}`,
						onClick: () => {
							mudar({ arte: id });
							setLado("frente");
						},
						children: regras.nomeDaArte(id)
					}, id))
				})]
			}) : null,
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "campos-duplos",
				children: [
					campos.nome ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CampoDeTexto, {
						id: "nome",
						campo: campos.nome,
						valor: p.nome || "",
						aoMudar: (v) => {
							mudar({ nome: v });
							setLado("frente");
						}
					}) : null,
					campos.frase ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CampoDeTexto, {
						id: "frase",
						campo: campos.frase,
						valor: p.frase || "",
						aoMudar: (v) => {
							mudar({ frase: v });
							if (pers.verso) setLado("verso");
						}
					}) : null,
					campos.data ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CampoDeTexto, {
						id: "data",
						campo: campos.data,
						valor: p.data || "",
						aoMudar: (v) => {
							mudar({ data: v });
							setLado("frente");
						}
					}) : null
				]
			}),
			pers.letras.length > 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("fieldset", {
				className: "grupo-escolha",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("legend", { children: "Estilo da letra" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "letras",
					children: pers.letras.map((id) => {
						const f = FONTES[id];
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							"aria-pressed": p.letra === id,
							className: `letra${p.letra === id ? " ativo" : ""}`,
							onClick: () => mudar({ letra: id }),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontFamily: f.familia,
									fontWeight: f.peso,
									fontStyle: f.estilo,
									textTransform: f.caixa,
									letterSpacing: `${f.espaco}em`,
									fontSize: id === "cursiva" ? 30 : id === "classica" ? 22 : 15
								},
								children: (p.nome || "").trim().split(/\s+/).pop() || "Lara"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "letra-nome",
								children: regras.nomeDaLetra(id)
							})]
						}, id);
					})
				})]
			}) : null,
			usaFotos(produto, escolhas) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EnvioDeFotos, {
				produto,
				fotos: p.fotos || [],
				setFotos: (fotos) => mudar({ fotos }),
				selecionada: fotoSelecionada,
				setSelecionada: setFotoSelecionada
			}) : null,
			campos.observacoes ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CampoDeTexto, {
				id: "observacoes",
				campo: campos.observacoes,
				valor: p.observacoes || "",
				aoMudar: (v) => mudar({ observacoes: v }),
				multilinha: true
			}) : null,
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: "marcar",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked: p.aprovarWhatsApp !== false,
					onChange: (e) => mudar({ aprovarWhatsApp: e.target.checked })
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
					"Quero ",
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "aprovar a arte pelo WhatsApp" }),
					" antes da produção"
				] })]
			})
		]
	});
}
function Avisos({ loja, produto }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
		className: "avisos-produto",
		children: [
			produto.config.personalizacao.ativa ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
				nome: "lapis",
				tamanho: 20
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "Personalização inclusa" }), " no valor: nome, frase, arte ou fotos."] })] }) : null,
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
				nome: "relogio",
				tamanho: 20
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "Prazo de produção:" }),
				" ",
				loja.prazoProducao ? `${loja.prazoProducao} ${loja.prazoProducao === 1 ? "dia útil" : "dias úteis"}` : "[a confirmar com a Janaina]",
				" + frete."
			] })] }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
				nome: "caixas",
				tamanho: 20
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
				"Acima de 10 unidades, ",
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
					href: linkWhatsApp(loja.whatsapp, `Olá! Quero mais de 10 unidades de ${produto.nome}.`),
					target: "_blank",
					rel: "noopener noreferrer",
					children: "condições especiais no WhatsApp"
				}),
				"."
			] })] }),
			produto.config.aviso === "ultimas" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: "aviso-ultimas",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
					nome: "alerta",
					tamanho: 20
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "Últimas unidades." }), " Confirme a disponibilidade com a Janaina se for para uma data especial."] })]
			}) : null
		]
	});
}
function Produto({ pagina, loja }) {
	const produto = pagina.produto;
	const config = produto.config;
	const [escolhas, setEscolhas] = (0, react.useState)(() => escolhasPadrao(produto));
	const [qtd, setQtd] = (0, react.useState)(config.qtdMinima || 1);
	const [lado, setLado] = (0, react.useState)("frente");
	const [aquecida, setAquecida] = (0, react.useState)(false);
	const [fotoSelecionada, setFotoSelecionada] = (0, react.useState)(0);
	const [erros, setErros] = (0, react.useState)([]);
	const [adicionado, setAdicionado] = (0, react.useState)(false);
	const arrasto = (0, react.useRef)(null);
	(0, react.useEffect)(() => {
		setErros([]);
	}, [escolhas, qtd]);
	const unitario = precoUnitario(produto, escolhas, qtd);
	const total = Math.round(unitario * qtd * 100) / 100;
	function mudarPers(p) {
		setEscolhas((e) => ({
			...e,
			personalizacao: {
				...e.personalizacao,
				...p
			}
		}));
	}
	function aoTocarFoto(indice, evento) {
		const svg = evento.currentTarget.ownerSVGElement;
		const foto = escolhas.personalizacao.fotos?.[indice];
		if (!svg || !foto) return;
		evento.preventDefault();
		setFotoSelecionada(indice);
		const caixa = evento.currentTarget.getBBox();
		const sobra = caixa.width - caixa.width / foto.zoom;
		arrasto.current = {
			indice,
			x: evento.clientX,
			y: evento.clientY,
			fx: foto.x,
			fy: foto.y,
			escala: 360 / svg.getBoundingClientRect().width,
			sobra
		};
		const mover = (e) => {
			const a = arrasto.current;
			if (!a || a.sobra <= 0) return;
			const dx = (e.clientX - a.x) * a.escala / (a.sobra / 2);
			const dy = (e.clientY - a.y) * a.escala / (a.sobra / 2);
			const limitar = (v) => Math.max(-1, Math.min(1, Math.round(v * 100) / 100));
			setEscolhas((es) => ({
				...es,
				personalizacao: {
					...es.personalizacao,
					fotos: (es.personalizacao.fotos || []).map((f, i) => i === a.indice ? {
						...f,
						x: limitar(a.fx + dx),
						y: limitar(a.fy + dy)
					} : f)
				}
			}));
		};
		const soltar = () => {
			arrasto.current = null;
			window.removeEventListener("pointermove", mover);
			window.removeEventListener("pointerup", soltar);
		};
		window.addEventListener("pointermove", mover);
		window.addEventListener("pointerup", soltar);
	}
	function adicionar() {
		const resultado = validarEscolhas(produto, escolhas, qtd);
		if (!resultado.ok) {
			setErros(resultado.erros);
			return;
		}
		const cores = coresDaPeca(config, resultado.escolhas, true);
		carrinho.adicionar({
			id: produto.id,
			qty: qtd,
			escolhas: resultado.escolhas,
			nome: produto.nome,
			endereco: produto.endereco,
			preco: precoUnitario(produto, resultado.escolhas, qtd),
			foto: produto.fotos[0] ?? null,
			molde: config.molde,
			corPeca: cores.peca,
			corAlca: cores.alca,
			resumo: resumoDasEscolhas(produto, resultado.escolhas),
			qtdMinima: config.qtdMinima || 1,
			config
		});
		setAdicionado(true);
		setTimeout(() => setAdicionado(false), 2500);
	}
	const podeArrastar = usaFotos(produto, escolhas) && (escolhas.personalizacao.fotos || []).some((f) => f.zoom > 1);
	const qtdMinima = config.qtdMinima || 1;
	const categoria = produto.categoriaPrincipal;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "envolve pagina-produto",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
				className: "trilha",
				"aria-label": "Você está em",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
						href: "/",
						children: "Início"
					}),
					categoria ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						"aria-hidden": "true",
						children: "›"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
						href: `/categoria/${categoria.slug}`,
						children: categoria.nome
					})] }) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						"aria-hidden": "true",
						children: "›"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						"aria-current": "page",
						children: produto.nome
					})
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "produto-grade",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Galeria, {
					produto,
					escolhas,
					lado,
					setLado,
					aquecida,
					setAquecida,
					fotoSelecionada,
					aoTocarFoto: podeArrastar ? aoTocarFoto : void 0
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "produto-info",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "sobretitulo",
							children: [categoria?.nome, produto.medida].filter(Boolean).join(" · ")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", {
							className: "produto-titulo",
							children: produto.nome
						}),
						config.codigo ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: "produto-codigo",
							children: ["Cód. ", config.codigo]
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Avisos, {
							loja,
							produto
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "produto-preco",
							"aria-live": "polite",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: dinheiro(precoNoPix(total)) }),
									" ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "no Pix" })
								] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
									className: "produto-preco-cartao",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: dinheiro(total) }),
										" no cartão em até ",
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: parcelas(total) })
									]
								}),
								qtd > 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
									className: "produto-preco-unidade",
									children: [
										dinheiro(unitario),
										" cada",
										config.faixas.length ? ` · a partir de ${config.faixas[0].min} unidades: ${dinheiro(config.faixas[0].preco)} cada` : ""
									]
								}) : config.faixas.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
									className: "produto-preco-unidade",
									children: [
										"A partir de ",
										config.faixas[0].min,
										" unidades: ",
										dinheiro(config.faixas[0].preco),
										" cada"
									]
								}) : null
							]
						}),
						config.variacoes.map((grupo) => {
							const escolhida = grupo.opcoes.find((o) => o.id === escolhas.variacoes[grupo.id]);
							const comCor = grupo.opcoes.every((o) => o.hex);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("fieldset", {
								className: "grupo-escolha",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("legend", { children: [
									grupo.nome,
									": ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: escolhida?.nome })
								] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: comCor ? "cores" : "chips",
									children: grupo.opcoes.map((o) => {
										const ativo = escolhas.variacoes[grupo.id] === o.id;
										const rotulo = `${o.nome}${o.preco ? ` (${o.preco > 0 ? "+" : ""}${dinheiro(o.preco)})` : ""}${o.esgotado ? " — esgotado" : ""}`;
										const aoEscolher = () => setEscolhas((e) => ({
											...e,
											variacoes: {
												...e.variacoes,
												[grupo.id]: o.id
											}
										}));
										return comCor ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: `cor${ativo ? " ativo" : ""}`,
											"aria-pressed": ativo,
											"aria-label": rotulo,
											title: rotulo,
											disabled: o.esgotado,
											onClick: aoEscolher,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { background: o.hex } })
										}, o.id) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: `chip${ativo ? " ativo" : ""}`,
											"aria-pressed": ativo,
											disabled: o.esgotado,
											onClick: aoEscolher,
											children: [
												o.nome,
												o.preco ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("small", { children: [
													" ",
													o.preco > 0 ? "+" : "",
													dinheiro(o.preco)
												] }) : null,
												o.esgotado ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: " esgotado" }) : null
											]
										}, o.id);
									})
								})]
							}, grupo.id);
						}),
						config.personalizacao.ativa ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Personalizar, {
							produto,
							escolhas,
							mudar: mudarPers,
							fotoSelecionada,
							setFotoSelecionada,
							setLado
						}) : null,
						config.adicionais.map((a) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: "marcar marcar-adicional",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								disabled: a.esgotado,
								checked: escolhas.adicionais.includes(a.id),
								onChange: (e) => setEscolhas((es) => ({
									...es,
									adicionais: e.target.checked ? [...es.adicionais, a.id] : es.adicionais.filter((x) => x !== a.id)
								}))
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
								"Adicionar ",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: a.nome.toLowerCase() }),
								" (+ ",
								dinheiro(a.preco),
								")"
							] })]
						}, a.id)),
						config.personalizacao.ativa ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
							className: "link-exclusiva",
							href: linkWhatsApp(loja.whatsapp, `Olá, ${loja.responsavel}! Quero uma arte 100% exclusiva para: ${produto.nome}.`),
							target: "_blank",
							rel: "noopener noreferrer",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Florzinha, { tamanho: 20 }),
								" Arte 100% exclusiva? Fale com a ",
								loja.responsavel
							]
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "comprar",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "quantidade",
								role: "group",
								"aria-label": "Quantidade",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => setQtd((q) => Math.max(qtdMinima, q - 1)),
										"aria-label": "Diminuir quantidade",
										disabled: qtd <= qtdMinima,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
											nome: "menos",
											tamanho: 20
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										"aria-live": "polite",
										children: qtd
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => setQtd((q) => Math.min(regras.QTD_MAXIMA, q + 1)),
										"aria-label": "Aumentar quantidade",
										disabled: qtd >= regras.QTD_MAXIMA,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
											nome: "mais",
											tamanho: 20
										})
									})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "botao botao-cheio botao-comprar",
								onClick: adicionar,
								disabled: produto.esgotado,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
									nome: adicionado ? "check" : "sacola",
									tamanho: 20,
									traco: 1.8
								}), produto.esgotado ? "Esgotado" : adicionado ? "Adicionado ao carrinho" : `Adicionar ao carrinho · ${dinheiro(total)}`]
							})]
						}),
						qtdMinima > 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: "dica",
							children: [
								"Pedido mínimo de ",
								qtdMinima,
								" unidades."
							]
						}) : null,
						qtd > regras.QTD_CONDICAO_ESPECIAL ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: "aviso-quantidade",
							children: [
								"Mais de 10 unidades? A ",
								loja.responsavel,
								" faz ",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
									href: linkWhatsApp(loja.whatsapp, `Olá! Quero ${qtd} unidades de ${produto.nome}.`),
									target: "_blank",
									rel: "noopener noreferrer",
									children: "condições especiais pelo WhatsApp"
								}),
								"."
							]
						}) : null,
						erros.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "mensagem-erro",
							role: "alert",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "Falta pouco:" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", { children: erros.map((e) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: e }, e)) })]
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CalculoDeFrete, {
							itens: [{
								id: produto.id,
								qty: qtd
							}],
							retirada: loja.retirada
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "secao-produto sobre-peca",
				"aria-labelledby": "sobre",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
					id: "sobre",
					children: "Sobre a peça"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "sobre-grade",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "cartao-texto",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: config.molde === "caneca" ? "A caneca" : "A peça" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: produto.descricao || `${produto.nome}${produto.medida ? `, ${produto.medida}` : ""}. Peça personalizada pela Janaina, em Brasília.` })]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "cartao-texto",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: "Como personalizar" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: config.personalizacao.ativa ? "Escreva o nome e a frase, escolha a arte e o estilo da letra. Arte 100% exclusiva? Combine com a Janaina pelo WhatsApp." : "Este item vai como está. Para combinar com uma peça personalizada, adicione os dois ao carrinho." })]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "cartao-texto",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: "Cuidados" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: config.cuidados || "[orientações de lavagem e uso da Janaina]" })]
						})
					]
				})]
			}),
			pagina.extras.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "secao-produto",
				"aria-labelledby": "combina",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
					id: "combina",
					children: "Deixe o presente ainda mais especial"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "extras",
					children: pagina.extras.map((e) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
						className: "extra",
						href: e.endereco,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "extra-icone",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
									nome: ICONES_DOS_EXTRAS[e.nome] ?? "presente",
									tamanho: 30,
									traco: 1.4
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "extra-texto",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: e.nome }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [e.aPartirDe ? "a partir de " : "", dinheiro(e.precoMinimo)] })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "extra-mais",
								"aria-hidden": "true",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icone, {
									nome: "mais",
									tamanho: 20
								})
							})
						]
					}, e.id))
				})]
			}) : null,
			pagina.avaliacoes.total > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "secao-produto",
				"aria-labelledby": "avaliacoes",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						id: "avaliacoes",
						children: "O que dizem as clientes"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "nota-media",
						children: `${pagina.avaliacoes.media.toFixed(1).replace(".", ",")} de 5 · ${pagina.avaliacoes.total} ${pagina.avaliacoes.total === 1 ? "avaliação" : "avaliações"} de compras verificadas`
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: "avaliacoes",
						children: pagina.avaliacoes.itens.map((a, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							className: "cartao-texto",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "estrelas",
									role: "img",
									"aria-label": `${a.nota} de 5 estrelas`,
									children: ["★".repeat(a.nota), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										"aria-hidden": "true",
										className: "estrelas-apagadas",
										children: "★".repeat(5 - a.nota)
									})]
								}),
								a.texto ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
									"“",
									a.texto,
									"”"
								] }) : null,
								a.quem ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "avaliacao-quem",
									children: a.quem
								}) : null
							]
						}, i))
					})
				]
			}) : null,
			pagina.relacionados.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "secao-produto",
				"aria-labelledby": "relacionados",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
					id: "relacionados",
					children: "Combina com você também"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "grade-produtos",
					children: pagina.relacionados.map((p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CartaoProduto, { produto: p }, p.id))
				})]
			}) : null
		]
	});
}
// loja/src/App.tsx
function App({ dados }) {
	const { loja, pagina, caminho } = dados;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Cabecalho, {
			loja,
			caminho,
			termo: pagina.tipo === "busca" ? pagina.termo : void 0
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("main", {
			id: "conteudo",
			tabIndex: -1,
			children: [
				pagina.tipo === "inicio" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Inicio, {
					pagina,
					loja
				}) : null,
				pagina.tipo === "categoria" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Categoria, { pagina }) : null,
				pagina.tipo === "busca" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Busca, { pagina }) : null,
				pagina.tipo === "produto" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Produto, {
					pagina,
					loja
				}) : null
			]
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Rodape, { loja }),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)(WhatsAppFlutuante, { loja }),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Carrinho, { loja }),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AvisoCookies, {})
	] });
}
// loja/src/entrada-servidor.tsx
function renderizarPagina(dados) {
	return (0, react_dom_server.renderToString)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(App, { dados }));
}
exports.Arte = Arte;
exports.__toESM = __toESM;
exports.coresDaPeca = coresDaPeca;
exports.renderizarPagina = renderizarPagina;
exports.urlDaFotoEnviada = urlDaFotoEnviada;
exports.useMedirTexto = useMedirTexto;
