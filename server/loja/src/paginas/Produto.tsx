import { Suspense, lazy, useEffect, useRef, useState, type ChangeEvent, type PointerEvent as EventoPonteiro } from "react";
import { dinheiro, escolhasPadrao, linkWhatsApp, parcelas, precoNoPix, precoUnitario, regras, resumoDasEscolhas, validarEscolhas } from "../compartilhado";
import { CartaoProduto } from "../componentes/CartaoProduto";
import { Foto, urlDaFoto as urlDaFotoDoProduto } from "../componentes/Foto";
import { Icone, type NomeIcone } from "../componentes/Icone";
import { voarParaSacola } from "../estado/voo";
import { Florzinha } from "../componentes/Marca";
import { FONTES, PecaSvg, coresDaPeca, descricaoDaPrevia, useMedirTexto, type Lado } from "../componentes/Previa";
import { CalculoDeFrete } from "../componentes/CalculoDeFrete";
import { carrinho } from "../estado/carrinho";
import { enviarFoto, urlDaFotoEnviada, lembrarFotoLocal } from "../estado/fotos";
import type { Escolhas, EstampaPublica, FotoEnviada, IdCampo, Loja, PaginaProduto, Personalizacao, Produto as TipoProduto } from "../tipos";

const Previa3D = lazy(() => import("../componentes/Previa3D"));
const MOLDES_3D = ["caneca", "xicara", "garrafa", "copo"];

const ICONES_DOS_EXTRAS: Record<string, NomeIcone> = {
  "Tampa de bambu para caneca": "tampa",
  "Caixa de presente": "presente",
  "Mini buquê de flores secas": "buque",
  "Caixa de MDF com tampa personalizada": "caixaMdf",
};

function usaFotos(produto: TipoProduto, escolhas: Escolhas): boolean {
  const pers = produto.config.personalizacao;
  if (!pers.ativa || pers.fotos.max === 0) return false;
  if (!pers.artes.includes("fotos")) return true;
  return escolhas.personalizacao.arte === "fotos";
}

function estampaDe(produto: TipoProduto, escolhas: Escolhas): EstampaPublica | null {
  const id = escolhas.personalizacao.estampa;
  return id ? (produto.estampasDisponiveis || []).find(e => e.id === id) ?? null : null;
}

function SeletorDeEstampa({ produto, escolhas, aoEscolher }: { produto: TipoProduto; escolhas: Escolhas; aoEscolher: (id: string | undefined) => void }) {
  const [colecao, setColecao] = useState("");
  const lista = produto.estampasDisponiveis || [];
  if (!produto.config.estampas?.ativa || !lista.length) return null;
  const obrigatoria = Boolean(produto.config.estampas.obrigatoria);
  const colecoes = [...new Set(lista.map(e => e.colecao))];
  const visiveis = colecao ? lista.filter(e => e.colecao === colecao) : lista;
  const escolhida = estampaDe(produto, escolhas);
  return (
    <fieldset className="grupo-escolha seletor-estampa">
      <legend>Estampa: <span>{escolhida ? escolhida.nome : "sem estampa"}</span></legend>
      {colecoes.length > 1 ? (
        <div className="chips chips-colecao" role="group" aria-label="Coleções de estampa">
          <button type="button" className={`chip${colecao ? "" : " ativo"}`} aria-pressed={!colecao} onClick={() => setColecao("")}>Todas</button>
          {colecoes.map(c => <button key={c} type="button" className={`chip${colecao === c ? " ativo" : ""}`} aria-pressed={colecao === c} onClick={() => setColecao(c)}>{c}</button>)}
        </div>
      ) : null}
      <div className="estampas-grade">
        {obrigatoria ? null : (
          <button type="button" className={`estampa-opcao estampa-nenhuma${escolhida ? "" : " ativo"}`} aria-pressed={!escolhida} onClick={() => aoEscolher(undefined)}>
            <span className="estampa-amostra" aria-hidden="true" />
            <span className="estampa-nome">Sem estampa</span>
          </button>
        )}
        {visiveis.map(e => (
          <button key={e.id} type="button" className={`estampa-opcao${escolhida?.id === e.id ? " ativo" : ""}`} aria-pressed={escolhida?.id === e.id} onClick={() => aoEscolher(e.id)}>
            <img className="estampa-amostra" src={e.miniatura} alt="" width={120} height={80} loading="lazy" decoding="async" />
            <span className="estampa-nome">{e.nome}</span>
            {e.preco > 0 ? <small>+ {dinheiro(e.preco)}</small> : null}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function MiniPrevia({ produto, escolhas, lado, aquecida }: { produto: TipoProduto; escolhas: Escolhas; lado: Lado; aquecida: boolean }) {
  const [mostrar, setMostrar] = useState(false);
  const medir = useMedirTexto();
  useEffect(() => {
    const palco = document.querySelector(".galeria-palco");
    const caixa = document.querySelector(".caixa-personalizar");
    if (!palco || !caixa || !("IntersectionObserver" in window)) return;
    const estreita = window.matchMedia("(max-width: 1099px)");
    let palcoVisivel = true;
    let mexendo = false;
    const atualizar = () => setMostrar(estreita.matches && mexendo && !palcoVisivel);
    const observador = new IntersectionObserver(([e]) => { palcoVisivel = e.isIntersecting; atualizar(); }, { threshold: 0.2 });
    observador.observe(palco);
    const mexeu = () => { mexendo = true; atualizar(); };
    caixa.addEventListener("focusin", mexeu);
    caixa.addEventListener("input", mexeu);
    caixa.addEventListener("click", mexeu);
    estreita.addEventListener("change", atualizar);
    return () => {
      observador.disconnect();
      caixa.removeEventListener("focusin", mexeu);
      caixa.removeEventListener("input", mexeu);
      caixa.removeEventListener("click", mexeu);
      estreita.removeEventListener("change", atualizar);
    };
  }, []);
  if (!mostrar) return null;
  return (
    <button type="button" className="mini-previa" onClick={() => document.querySelector(".galeria-palco")?.scrollIntoView({ behavior: "smooth", block: "center" })} aria-label="Ver a prévia grande">
      <svg viewBox="0 0 360 380" aria-hidden="true">
        <PecaSvg config={produto.config} escolhas={escolhas} lado={lado} aquecida={aquecida} urlDaFoto={urlDaFotoEnviada} estampa={estampaDe(produto, escolhas)} medir={medir} fatias={16} />
      </svg>
      <span>prévia</span>
    </button>
  );
}

function Galeria({ produto, escolhas, lado, setLado, aquecida, setAquecida, fotoSelecionada, aoTocarFoto }: {
  produto: TipoProduto;
  escolhas: Escolhas;
  lado: Lado;
  setLado: (l: Lado) => void;
  aquecida: boolean;
  setAquecida: (a: boolean) => void;
  fotoSelecionada: number;
  aoTocarFoto?: (indice: number, evento: EventoPonteiro<SVGElement>) => void;
}) {
  const [vista, setVista] = useState(-1);
  const [modo3d, setModo3d] = useState(false);
  const anterior = useRef({ lado, aquecida });
  const efeito = useRef("");
  if (anterior.current.lado !== lado) efeito.current = " vira";
  else if (anterior.current.aquecida !== aquecida) efeito.current = aquecida ? " aquece" : " esfria";
  anterior.current = { lado, aquecida };
  const medir = useMedirTexto();
  const config = produto.config;
  const temPrevia = config.molde !== "nenhum" && (config.personalizacao.ativa || produto.fotos.length === 0);
  const mostrandoFoto = vista >= 0 || !temPrevia;
  const indiceFoto = vista >= 0 ? vista : 0;
  const temVerso = config.personalizacao.ativa && config.personalizacao.verso;
  const descricao = descricaoDaPrevia(produto.nome, config, escolhas, lado, aquecida);
  const pode3d = MOLDES_3D.includes(config.molde) && config.personalizacao.ativa;
  return (
    <div className="galeria">
      <div className={`galeria-palco${mostrandoFoto ? " com-foto" : ""}`}>
        {modo3d && !mostrandoFoto ? (
          <Suspense fallback={<p className="previa-3d-aviso">Preparando o 3D…</p>}>
            <Previa3D config={config} escolhas={escolhas} estampa={estampaDe(produto, escolhas)} aquecida={aquecida} rotulo={`${descricao}, em 3D`} fechar={() => setModo3d(false)} />
          </Suspense>
        ) : mostrandoFoto && produto.fotos[indiceFoto] ? (
          <Foto src={produto.fotos[indiceFoto]} alt={`${produto.nome}, foto ${indiceFoto + 1}`} larguras={[600, 900]} sizes="(max-width: 900px) 100vw, 620px" largura={620} altura={620} className="galeria-foto" prioridade />
        ) : (
          <>
            <div className="faixa-caramelo galeria-faixa" aria-hidden="true" />
            {temVerso ? (
              <div role="tablist" aria-label="Lado da peça" className="galeria-lados">
                {(["frente", "verso"] as Lado[]).map(l => (
                  <button key={l} type="button" role="tab" aria-selected={lado === l} className={lado === l ? "ativo" : undefined} onClick={() => setLado(l)}>{l === "frente" ? "Frente" : "Verso"}</button>
                ))}
              </div>
            ) : null}
            <span className="cursiva galeria-rotulo" aria-hidden="true">prévia ao vivo</span>
            <svg key={`${lado}-${aquecida}`} className={`galeria-previa${efeito.current}`} viewBox="0 0 360 380" role="img" aria-label={descricao}>
              <PecaSvg config={config} escolhas={escolhas} lado={lado} aquecida={aquecida} urlDaFoto={urlDaFotoEnviada} estampa={estampaDe(produto, escolhas)} medir={medir} fotoSelecionada={aoTocarFoto ? fotoSelecionada : undefined} aoTocarFoto={aoTocarFoto} urlDaFotoDoMolde={config.moldeFoto?.foto ? urlDaFotoDoProduto(config.moldeFoto.foto, 900) : null} />
            </svg>
            <p className="visualmente-oculto" aria-live="polite">{descricao}</p>
            {pode3d || config.magica ? (
              <div className="galeria-acoes">
                {config.magica ? (
                  <button type="button" className="botao botao-escuro galeria-calor" aria-pressed={aquecida} onClick={() => setAquecida(!aquecida)}>
                    <Icone nome="calor" tamanho={18} />{aquecida ? <><span className="so-largo">Ver a caneca fria</span><span className="so-curto">Ver fria</span></> : <><span className="so-largo">Ver com bebida quente</span><span className="so-curto">Bebida quente</span></>}
                  </button>
                ) : null}
                {pode3d ? (
                  <button type="button" className="botao botao-escuro galeria-3d" onClick={() => setModo3d(true)} aria-label="Ver em 3D">
                    <Icone nome="girar" tamanho={18} /><span className="so-largo">Ver em 3D</span><span className="so-curto">3D</span>
                  </button>
                ) : null}
              </div>
            ) : null}
            {config.personalizacao.ativa ? <p className="galeria-nota">Prévia ilustrativa. A arte final é ajustada à mão pela Janaina.</p> : null}
          </>
        )}
      </div>
      {(temPrevia ? 1 : 0) + produto.fotos.length > 1 ? (
        <div className="galeria-miniaturas" role="group" aria-label="Fotos do produto">
          {temPrevia ? (
            <button type="button" className={`galeria-miniatura miniatura-previa${!mostrandoFoto ? " ativa" : ""}`} aria-pressed={!mostrandoFoto} onClick={() => setVista(-1)}>Prévia</button>
          ) : null}
          {produto.fotos.map((foto, i) => (
            <button key={foto} type="button" className={`galeria-miniatura${mostrandoFoto && indiceFoto === i ? " ativa" : ""}`} aria-pressed={mostrandoFoto && indiceFoto === i} aria-label={`Ver foto ${i + 1}`} onClick={() => setVista(i)}>
              <Foto src={foto} alt="" larguras={[160]} sizes="120px" largura={120} altura={120} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CampoDeTexto({ id, campo, valor, aoMudar, multilinha = false }: { id: IdCampo; campo: { rotulo: string; limite: number; obrigatorio: boolean }; valor: string; aoMudar: (v: string) => void; multilinha?: boolean }) {
  const passou = valor.length > campo.limite;
  const ajuda = `${id}-ajuda`;
  const exemplos: Record<IdCampo, string> = { nome: "Ex.: Madrinha Lara", frase: "Ex.: obrigada por tanto amor", data: "Ex.: 12.04.2027", observacoes: "Cores, ideias, detalhes da arte…" };
  return (
    <div className={`campo campo-personalizacao${multilinha ? " campo-largo" : ""}`}>
      <label htmlFor={`pers-${id}`}>{campo.rotulo}{campo.obrigatorio ? <span className="obrigatorio"> (obrigatório)</span> : null}</label>
      {multilinha ? (
        <textarea id={`pers-${id}`} value={valor} rows={3} placeholder={exemplos[id]} aria-describedby={ajuda} aria-invalid={passou} onChange={e => aoMudar(e.target.value)} />
      ) : (
        <input id={`pers-${id}`} type="text" value={valor} placeholder={exemplos[id]} aria-describedby={ajuda} aria-invalid={passou} onChange={e => aoMudar(e.target.value)} />
      )}
      <span id={ajuda} className={`contador-letras${passou ? " passou" : ""}`} aria-live={passou ? "polite" : "off"}>
        {passou ? `Passou ${valor.length - campo.limite} ${valor.length - campo.limite === 1 ? "letra" : "letras"} do limite de ${campo.limite}. Encurte um pouquinho.` : `${valor.length} de ${campo.limite} letras`}
      </span>
    </div>
  );
}

function EnvioDeFotos({ produto, fotos, setFotos, selecionada, setSelecionada }: {
  produto: TipoProduto;
  fotos: FotoEnviada[];
  setFotos: (f: FotoEnviada[]) => void;
  selecionada: number;
  setSelecionada: (i: number) => void;
}) {
  const { min, max } = produto.config.personalizacao.fotos;
  const [enviando, setEnviando] = useState(0);
  const [erro, setErro] = useState("");
  const atual = useRef(fotos);
  atual.current = fotos;

  async function aoEscolher(evento: ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(evento.target.files || []);
    evento.target.value = "";
    setErro("");
    const vagas = max - atual.current.length;
    if (arquivos.length > vagas) setErro(vagas > 0 ? `Cabem só mais ${vagas} ${vagas === 1 ? "foto" : "fotos"} nesta peça.` : `Esta peça aceita até ${max} ${max === 1 ? "foto" : "fotos"}. Tire uma para trocar.`);
    for (const arquivo of arquivos.slice(0, Math.max(0, vagas))) {
      if (!arquivo.type.startsWith("image/")) { setErro(`"${arquivo.name}" não é uma foto.`); continue; }
      if (arquivo.size > 15 * 1024 * 1024) { setErro(`"${arquivo.name}" passa de 15 MB.`); continue; }
      setEnviando(n => n + 1);
      try {
        const enviada = await enviarFoto(arquivo);
        lembrarFotoLocal(enviada.id, arquivo);
        const nova: FotoEnviada = { id: enviada.id, chave: enviada.chave, x: 0, y: 0, zoom: 1 };
        setFotos([...atual.current, nova]);
        setSelecionada(atual.current.length);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não deu para enviar a foto. Tente de novo.");
      } finally {
        setEnviando(n => n - 1);
      }
    }
  }

  function ajustar(indice: number, mudanca: Partial<FotoEnviada>) {
    setFotos(fotos.map((f, i) => (i === indice ? { ...f, ...mudanca } : f)));
  }

  return (
    <div className="envio-fotos">
      <div className="envio-fotos-topo">
        <Icone nome="envio" tamanho={32} traco={1.5} />
        <div>
          <strong>Envie {min > 1 ? `de ${min} a ${max}` : max === 1 ? "1" : `de 1 a ${max}`} {max === 1 ? "foto" : "fotos"}</strong>
          <span>JPG ou PNG, até 15 MB cada. Fotos de rosto bem iluminadas ficam melhores.</span>
        </div>
        <label className={`botao botao-cheio${fotos.length >= max ? " desativado" : ""}`}>
          {enviando > 0 ? "Enviando…" : "Escolher"}
          <input type="file" accept="image/*" multiple={max > 1} className="visualmente-oculto" onChange={aoEscolher} disabled={fotos.length >= max} aria-label="Escolher fotos para a arte" />
        </label>
      </div>
      {erro ? <p className="mensagem-erro" role="alert">{erro}</p> : null}
      {fotos.length ? (
        <ul className="fotos-enviadas">
          {fotos.map((f, i) => (
            <li key={f.id} className={i === selecionada ? "selecionada" : undefined}>
              <button type="button" className="foto-enviada" onClick={() => setSelecionada(i)} aria-pressed={i === selecionada} aria-label={`Ajustar a foto ${i + 1}`}>
                <img src={urlDaFotoEnviada(f) ?? ""} alt="" width={56} height={56} />
              </button>
              <div className="foto-controles" role="group" aria-label={`Foto ${i + 1}`}>
                <button type="button" className="botao-icone" onClick={() => ajustar(i, { zoom: Math.max(1, Math.round((f.zoom - 0.25) * 100) / 100) })} aria-label={`Afastar a foto ${i + 1}`} disabled={f.zoom <= 1}><Icone nome="zoomMenos" tamanho={20} /></button>
                <button type="button" className="botao-icone" onClick={() => ajustar(i, { zoom: Math.min(3, Math.round((f.zoom + 0.25) * 100) / 100) })} aria-label={`Aproximar a foto ${i + 1}`} disabled={f.zoom >= 3}><Icone nome="zoomMais" tamanho={20} /></button>
                <button type="button" className="botao-icone" onClick={() => { setFotos(fotos.filter((_, j) => j !== i)); setSelecionada(Math.max(0, i - 1)); }} aria-label={`Tirar a foto ${i + 1}`}><Icone nome="lixeira" tamanho={20} /></button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {fotos.length ? <p className="dica">Aproxime com a lupa e arraste a foto na prévia para escolher o enquadramento.</p> : null}
    </div>
  );
}

function Personalizar({ produto, escolhas, mudar, fotoSelecionada, setFotoSelecionada, setLado }: {
  produto: TipoProduto;
  escolhas: Escolhas;
  mudar: (p: Partial<Personalizacao>) => void;
  fotoSelecionada: number;
  setFotoSelecionada: (i: number) => void;
  setLado: (l: Lado) => void;
}) {
  const pers = produto.config.personalizacao;
  const p = escolhas.personalizacao;
  const campos = pers.campos;
  return (
    <div className="caixa-personalizar">
      <h2>Personalize {produto.config.molde === "caneca" ? "a sua" : "do seu jeito"}</h2>
      {pers.artes.length > 1 ? (
        <fieldset className="grupo-escolha">
          <legend>Arte</legend>
          <div className="chips">
            {pers.artes.map(id => (
              <button key={id} type="button" aria-pressed={p.arte === id} className={`chip${p.arte === id ? " ativo" : ""}`} onClick={() => { mudar({ arte: id }); setLado("frente"); }}>{regras.nomeDaArte(id)}</button>
            ))}
          </div>
        </fieldset>
      ) : null}
      <div className="campos-duplos">
        {campos.nome ? <CampoDeTexto id="nome" campo={campos.nome} valor={p.nome || ""} aoMudar={v => { mudar({ nome: v }); setLado("frente"); }} /> : null}
        {campos.frase ? <CampoDeTexto id="frase" campo={campos.frase} valor={p.frase || ""} aoMudar={v => { mudar({ frase: v }); if (pers.verso) setLado("verso"); }} /> : null}
        {campos.data ? <CampoDeTexto id="data" campo={campos.data} valor={p.data || ""} aoMudar={v => { mudar({ data: v }); setLado("frente"); }} /> : null}
      </div>
      {pers.letras.length > 1 ? (
        <fieldset className="grupo-escolha">
          <legend>Estilo da letra</legend>
          <div className="letras">
            {pers.letras.map(id => {
              const f = FONTES[id];
              return (
                <button key={id} type="button" aria-pressed={p.letra === id} className={`letra${p.letra === id ? " ativo" : ""}`} onClick={() => mudar({ letra: id })}>
                  <span style={{ fontFamily: f.familia, fontWeight: f.peso, fontStyle: f.estilo, textTransform: f.caixa, letterSpacing: `${f.espaco}em`, fontSize: id === "cursiva" ? 30 : id === "classica" ? 22 : 15 }}>{(p.nome || "").trim().split(/\s+/).pop() || "Lara"}</span>
                  <span className="letra-nome">{regras.nomeDaLetra(id)}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}
      {usaFotos(produto, escolhas) ? (
        <EnvioDeFotos produto={produto} fotos={p.fotos || []} setFotos={fotos => mudar({ fotos })} selecionada={fotoSelecionada} setSelecionada={setFotoSelecionada} />
      ) : null}
      {campos.observacoes ? <CampoDeTexto id="observacoes" campo={campos.observacoes} valor={p.observacoes || ""} aoMudar={v => mudar({ observacoes: v })} multilinha /> : null}
      <label className="marcar">
        <input type="checkbox" checked={p.aprovarWhatsApp !== false} onChange={e => mudar({ aprovarWhatsApp: e.target.checked })} />
        <span>Quero <strong>aprovar a arte pelo WhatsApp</strong> antes da produção</span>
      </label>
    </div>
  );
}

function Avisos({ loja, produto }: { loja: Loja; produto: TipoProduto }) {
  return (
    <ul className="avisos-produto">
      {produto.config.personalizacao.ativa ? <li><Icone nome="lapis" tamanho={20} /><span><strong>Personalização inclusa</strong> no valor: nome, frase, arte ou fotos.</span></li> : null}
      <li><Icone nome="relogio" tamanho={20} /><span><strong>Prazo de produção:</strong> {loja.prazoProducao ? `${loja.prazoProducao} ${loja.prazoProducao === 1 ? "dia útil" : "dias úteis"}` : "[a confirmar com a Janaina]"} + frete.</span></li>
      <li><Icone nome="caixas" tamanho={20} /><span>Acima de 10 unidades, <a href={linkWhatsApp(loja.whatsapp, `Olá! Quero mais de 10 unidades de ${produto.nome}.`)} target="_blank" rel="noopener noreferrer">condições especiais no WhatsApp</a>.</span></li>
      {produto.config.aviso === "ultimas" ? <li className="aviso-ultimas"><Icone nome="alerta" tamanho={20} /><span><strong>Últimas unidades.</strong> Confirme a disponibilidade com a Janaina se for para uma data especial.</span></li> : null}
    </ul>
  );
}

export function Produto({ pagina, loja }: { pagina: PaginaProduto; loja: Loja }) {
  const produto = pagina.produto;
  const config = produto.config;
  const [escolhas, setEscolhas] = useState<Escolhas>(() => escolhasPadrao(produto));
  const [qtd, setQtd] = useState(config.qtdMinima || 1);
  const [lado, setLado] = useState<Lado>("frente");
  const adicionando = useRef(false);
  const [aquecida, setAquecida] = useState(false);
  const [fotoSelecionada, setFotoSelecionada] = useState(0);
  const [erros, setErros] = useState<string[]>([]);
  const [adicionado, setAdicionado] = useState(false);
  const arrasto = useRef<{ indice: number; x: number; y: number; fx: number; fy: number; escala: number; sobra: number } | null>(null);

  useEffect(() => { setErros([]); }, [escolhas, qtd]);

  const unitario = precoUnitario(produto, escolhas, qtd);
  const total = Math.round(unitario * qtd * 100) / 100;

  function mudarPers(p: Partial<Personalizacao>) {
    setEscolhas(e => ({ ...e, personalizacao: { ...e.personalizacao, ...p } }));
  }

  function aoTocarFoto(indice: number, evento: EventoPonteiro<SVGElement>) {
    const svg = (evento.currentTarget as SVGElement).ownerSVGElement;
    const foto = escolhas.personalizacao.fotos?.[indice];
    if (!svg || !foto) return;
    evento.preventDefault();
    setFotoSelecionada(indice);
    const caixa = (evento.currentTarget as SVGGraphicsElement).getBBox();
    const sobra = caixa.width - caixa.width / foto.zoom;
    arrasto.current = { indice, x: evento.clientX, y: evento.clientY, fx: foto.x, fy: foto.y, escala: 360 / svg.getBoundingClientRect().width, sobra };
    const mover = (e: PointerEvent) => {
      const a = arrasto.current;
      if (!a || a.sobra <= 0) return;
      const dx = ((e.clientX - a.x) * a.escala) / (a.sobra / 2);
      const dy = ((e.clientY - a.y) * a.escala) / (a.sobra / 2);
      const limitar = (v: number) => Math.max(-1, Math.min(1, Math.round(v * 100) / 100));
      setEscolhas(es => ({
        ...es,
        personalizacao: { ...es.personalizacao, fotos: (es.personalizacao.fotos || []).map((f, i) => (i === a.indice ? { ...f, x: limitar(a.fx + dx), y: limitar(a.fy + dy) } : f)) },
      }));
    };
    const soltar = () => { arrasto.current = null; window.removeEventListener("pointermove", mover); window.removeEventListener("pointerup", soltar); };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  }

  async function adicionar() {
    if (adicionando.current) return;
    const resultado = validarEscolhas(produto, escolhas, qtd);
    if (!resultado.ok) {
      setErros(resultado.erros);
      return;
    }
    adicionando.current = true;
    await voarParaSacola(document.querySelector(".galeria-palco .galeria-previa, .galeria-palco .galeria-foto"), document.querySelector(".botao-comprar"));
    adicionando.current = false;
    const cores = coresDaPeca(config, resultado.escolhas, true);
    carrinho.adicionar({
      id: produto.id, qty: qtd, escolhas: resultado.escolhas, nome: produto.nome, endereco: produto.endereco,
      preco: precoUnitario(produto, resultado.escolhas, qtd), foto: produto.fotos[0] ?? null, molde: config.molde,
      corPeca: cores.peca, corAlca: cores.alca, resumo: resumoDasEscolhas(produto, resultado.escolhas), qtdMinima: config.qtdMinima || 1,
      config,
      estampa: estampaDe(produto, resultado.escolhas),
    });
    setAdicionado(true);
    setTimeout(() => setAdicionado(false), 2500);
  }

  const [origem, setOrigem] = useState("");
  useEffect(() => setOrigem(window.location.origin), []);

  function mensagemDoPedido(): string {
    const linhas = resumoDasEscolhas(produto, escolhas).filter(l => l.valor).map(l => `${l.rotulo}: ${l.valor}`);
    return [
      `Olá, ${loja.responsavel}! Quero encomendar:`,
      `${qtd}× ${produto.nome}`,
      ...linhas,
      usaFotos(produto, escolhas) ? "Vou mandar as fotos por aqui." : "",
      `Valor no site: ${dinheiro(total)} (${dinheiro(precoNoPix(total))} no Pix)`,
      `${origem}${produto.endereco}`,
    ].filter(Boolean).join("\n");
  }

  const podeArrastar = usaFotos(produto, escolhas) && (escolhas.personalizacao.fotos || []).some(f => f.zoom > 1);
  const qtdMinima = config.qtdMinima || 1;
  const categoria = produto.categoriaPrincipal;

  return (
    <div className="envolve pagina-produto">
      <nav className="trilha" aria-label="Você está em">
        <a href="/">Início</a>
        {categoria ? <><span aria-hidden="true">›</span><a href={`/categoria/${categoria.slug}`}>{categoria.nome}</a></> : null}
        <span aria-hidden="true">›</span><span aria-current="page">{produto.nome}</span>
      </nav>

      <div className="produto-grade">
        <Galeria produto={produto} escolhas={escolhas} lado={lado} setLado={setLado} aquecida={aquecida} setAquecida={setAquecida} fotoSelecionada={fotoSelecionada} aoTocarFoto={podeArrastar ? aoTocarFoto : undefined} />
        {config.personalizacao.ativa && config.molde !== "nenhum" ? <MiniPrevia produto={produto} escolhas={escolhas} lado={lado} aquecida={aquecida} /> : null}

        <div className="produto-info">
          <p className="sobretitulo">{[categoria?.nome, produto.medida].filter(Boolean).join(" · ")}</p>
          <h1 className="produto-titulo">{produto.nome}</h1>
          {config.codigo ? <p className="produto-codigo">Cód. {config.codigo}</p> : null}

          <div className="produto-preco" aria-live="polite">
            <p><strong>{dinheiro(precoNoPix(total))}</strong> <span>no Pix</span></p>
            <p className="produto-preco-cartao"><strong>{dinheiro(total)}</strong> no cartão em até <strong>{parcelas(total)}</strong></p>
            {qtd > 1 ? <p className="produto-preco-unidade">{dinheiro(unitario)} cada{config.faixas.length ? ` · a partir de ${config.faixas[0].min} unidades: ${dinheiro(config.faixas[0].preco)} cada` : ""}</p> : config.faixas.length ? <p className="produto-preco-unidade">A partir de {config.faixas[0].min} unidades: {dinheiro(config.faixas[0].preco)} cada</p> : null}
          </div>

          <Avisos loja={loja} produto={produto} />

          {config.variacoes.map(grupo => {
            const escolhida = grupo.opcoes.find(o => o.id === escolhas.variacoes[grupo.id]);
            const comCor = grupo.opcoes.every(o => o.hex);
            return (
              <fieldset key={grupo.id} className="grupo-escolha">
                <legend>{grupo.nome}: <span>{escolhida?.nome}</span></legend>
                <div className={comCor ? "cores" : "chips"}>
                  {grupo.opcoes.map(o => {
                    const ativo = escolhas.variacoes[grupo.id] === o.id;
                    const rotulo = `${o.nome}${o.preco ? ` (${o.preco > 0 ? "+" : ""}${dinheiro(o.preco)})` : ""}${o.esgotado ? " — esgotado" : ""}`;
                    const aoEscolher = () => setEscolhas(e => ({ ...e, variacoes: { ...e.variacoes, [grupo.id]: o.id } }));
                    return comCor ? (
                      <button key={o.id} type="button" className={`cor${ativo ? " ativo" : ""}`} aria-pressed={ativo} aria-label={rotulo} title={rotulo} disabled={o.esgotado} onClick={aoEscolher}>
                        <span style={{ background: o.hex }} />
                      </button>
                    ) : (
                      <button key={o.id} type="button" className={`chip${ativo ? " ativo" : ""}`} aria-pressed={ativo} disabled={o.esgotado} onClick={aoEscolher}>
                        {o.nome}{o.preco ? <small> {o.preco > 0 ? "+" : ""}{dinheiro(o.preco)}</small> : null}{o.esgotado ? <small> esgotado</small> : null}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          <SeletorDeEstampa produto={produto} escolhas={escolhas} aoEscolher={id => { setEscolhas(es => ({ ...es, personalizacao: { ...es.personalizacao, estampa: id } })); setLado("frente"); }} />

          {config.personalizacao.ativa ? (
            <Personalizar produto={produto} escolhas={escolhas} mudar={mudarPers} fotoSelecionada={fotoSelecionada} setFotoSelecionada={setFotoSelecionada} setLado={setLado} />
          ) : null}

          {config.adicionais.map(a => (
            <label key={a.id} className="marcar marcar-adicional">
              <input type="checkbox" disabled={a.esgotado} checked={escolhas.adicionais.includes(a.id)} onChange={e => setEscolhas(es => ({ ...es, adicionais: e.target.checked ? [...es.adicionais, a.id] : es.adicionais.filter(x => x !== a.id) }))} />
              <span>Adicionar <strong>{a.nome.toLowerCase()}</strong> (+ {dinheiro(a.preco)})</span>
            </label>
          ))}

          {config.personalizacao.ativa ? (
            <a className="link-exclusiva" href={linkWhatsApp(loja.whatsapp, `Olá, ${loja.responsavel}! Quero uma arte 100% exclusiva para: ${produto.nome}.`)} target="_blank" rel="noopener noreferrer">
              <Florzinha tamanho={20} /> Arte 100% exclusiva? Fale com a {loja.responsavel}
            </a>
          ) : null}

          <div className="comprar">
            <div className="quantidade" role="group" aria-label="Quantidade">
              <button type="button" onClick={() => setQtd(q => Math.max(qtdMinima, q - 1))} aria-label="Diminuir quantidade" disabled={qtd <= qtdMinima}><Icone nome="menos" tamanho={20} /></button>
              <span aria-live="polite">{qtd}</span>
              <button type="button" onClick={() => setQtd(q => Math.min(regras.QTD_MAXIMA, q + 1))} aria-label="Aumentar quantidade" disabled={qtd >= regras.QTD_MAXIMA}><Icone nome="mais" tamanho={20} /></button>
            </div>
            <button type="button" className={`botao botao-cheio botao-comprar${adicionado ? " feito" : ""}`} onClick={adicionar} disabled={produto.esgotado}>
              <Icone nome={adicionado ? "check" : "sacola"} tamanho={20} traco={1.8} />
              {produto.esgotado ? "Esgotado" : adicionado ? "Adicionado ao carrinho" : `Adicionar ao carrinho · ${dinheiro(total)}`}
            </button>
          </div>
          {!produto.esgotado ? (
            <a className="pedir-whatsapp" href={linkWhatsApp(loja.whatsapp, mensagemDoPedido())} target="_blank" rel="noopener noreferrer">
              <Icone nome="whatsapp" tamanho={20} />
              <span>Prefere pelo WhatsApp? <strong>Pedir à {loja.responsavel}</strong></span>
            </a>
          ) : null}
          <ul className="confianca" aria-label="Por que comprar aqui">
            <li><Icone nome="cartao" tamanho={18} /><span><strong>10% off no Pix</strong> ou 3x sem juros</span></li>
            {config.personalizacao.ativa ? <li><Icone nome="whatsapp" tamanho={18} /><span>Você <strong>aprova a arte</strong> antes da produção</span></li> : null}
            {loja.retirada ? <li><Icone nome="local" tamanho={18} /><span><strong>Retirada grátis</strong> na Asa Norte</span></li> : null}
            <li><Icone nome="cadeado" tamanho={18} /><span>Pagamento seguro pelo <strong>Mercado Pago</strong></span></li>
          </ul>
          {qtdMinima > 1 ? <p className="dica">Pedido mínimo de {qtdMinima} unidades.</p> : null}
          {qtd > regras.QTD_CONDICAO_ESPECIAL ? (
            <p className="aviso-quantidade">
              Mais de 10 unidades? A {loja.responsavel} faz <a href={linkWhatsApp(loja.whatsapp, `Olá! Quero ${qtd} unidades de ${produto.nome}.`)} target="_blank" rel="noopener noreferrer">condições especiais pelo WhatsApp</a>.
            </p>
          ) : null}
          {erros.length ? (
            <div className="mensagem-erro" role="alert">
              <strong>Falta pouco:</strong>
              <ul>{erros.map(e => <li key={e}>{e}</li>)}</ul>
            </div>
          ) : null}

          <CalculoDeFrete itens={[{ id: produto.id, qty: qtd }]} retirada={loja.retirada} />
        </div>
      </div>

      <section className="secao-produto sobre-peca" aria-labelledby="sobre">
        <h2 id="sobre">Sobre a peça</h2>
        <div className="sobre-grade">
          <div className="cartao-texto">
            <h3>{config.molde === "caneca" ? "A caneca" : "A peça"}</h3>
            <p>{produto.descricao || `${produto.nome}${produto.medida ? `, ${produto.medida}` : ""}. Peça personalizada pela Janaina, em Brasília.`}</p>
          </div>
          <div className="cartao-texto">
            <h3>Como personalizar</h3>
            <p>{config.personalizacao.ativa ? "Escreva o nome e a frase, escolha a arte e o estilo da letra. Arte 100% exclusiva? Combine com a Janaina pelo WhatsApp." : "Este item vai como está. Para combinar com uma peça personalizada, adicione os dois ao carrinho."}</p>
          </div>
          <div className="cartao-texto">
            <h3>Cuidados</h3>
            <p>{config.cuidados || "[orientações de lavagem e uso da Janaina]"}</p>
          </div>
        </div>
      </section>

      {pagina.extras.length ? (
        <section className="secao-produto" aria-labelledby="combina">
          <h2 id="combina">Deixe o presente ainda mais especial</h2>
          <div className="extras">
            {pagina.extras.map(e => (
              <a key={e.id} className="extra" href={e.endereco}>
                <span className="extra-icone"><Icone nome={ICONES_DOS_EXTRAS[e.nome] ?? "presente"} tamanho={30} traco={1.4} /></span>
                <span className="extra-texto"><strong>{e.nome}</strong><span>{e.aPartirDe ? "a partir de " : ""}{dinheiro(e.precoMinimo)}</span></span>
                <span className="extra-mais" aria-hidden="true"><Icone nome="mais" tamanho={20} /></span>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {pagina.avaliacoes.total > 0 ? (
        <section className="secao-produto" aria-labelledby="avaliacoes">
          <h2 id="avaliacoes">O que dizem as clientes</h2>
          <p className="nota-media">{`${pagina.avaliacoes.media.toFixed(1).replace(".", ",")} de 5 · ${pagina.avaliacoes.total} ${pagina.avaliacoes.total === 1 ? "avaliação" : "avaliações"} de compras verificadas`}</p>
          <ul className="avaliacoes">
            {pagina.avaliacoes.itens.map((a, i) => (
              <li key={i} className="cartao-texto">
                <span className="estrelas" role="img" aria-label={`${a.nota} de 5 estrelas`}>{"★".repeat(a.nota)}<span aria-hidden="true" className="estrelas-apagadas">{"★".repeat(5 - a.nota)}</span></span>
                {a.texto ? <p>“{a.texto}”</p> : null}
                {a.quem ? <p className="avaliacao-quem">{a.quem}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pagina.relacionados.length ? (
        <section className="secao-produto" aria-labelledby="relacionados">
          <h2 id="relacionados">Combina com você também</h2>
          <div className="grade-produtos">{pagina.relacionados.map(p => <CartaoProduto key={p.id} produto={p} />)}</div>
        </section>
      ) : null}
    </div>
  );
}
