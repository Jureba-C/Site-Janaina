import { useState, type ReactNode } from "react";
import { linkWhatsApp } from "../compartilhado";
import type { Loja } from "../tipos";
import { Icone } from "./Icone";
import { Onda } from "./Marca";
import { Novidades } from "./Novidades";

function Grupo({ titulo, rotulo, children }: { titulo: string; rotulo?: string; children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const conteudo = <><h2><button type="button" className="rodape-grupo-botao" aria-expanded={aberto} onClick={() => setAberto(a => !a)}>{titulo}<Icone nome="mais" tamanho={18} /></button></h2>{children}</>;
  return rotulo
    ? <nav aria-label={rotulo} className={`rodape-grupo${aberto ? " aberto" : ""}`}>{conteudo}</nav>
    : <div className={`rodape-grupo${aberto ? " aberto" : ""}`}>{conteudo}</div>;
}

export function Rodape({ loja }: { loja: Loja }) {
  const tipos = loja.categorias.filter(c => c.grupo === "tipo" && c.quantidade > 0).slice(0, 6);
  const { pixDiscountPercent, interestFreeInstallments } = loja.regrasPagamento;
  return (
    <footer className="rodape">
      <Onda />
      <div className="rodape-fundo">
        <div className="rodape-novidades"><Novidades /></div>
        <div className="rodape-grade">
          <div className="rodape-marca">
            <p className="rodape-logo"><span>arte</span><span>Canecas</span></p>
            <p>Transformando sentimentos em presentes.<br />{loja.cidade}</p>
          </div>
          <Grupo titulo="Loja" rotulo="Loja">
            <ul>{tipos.map(c => <li key={c.slug}><a href={`/categoria/${c.slug}`}>{c.nome}</a></li>)}</ul>
          </Grupo>
          <Grupo titulo="Ajuda" rotulo="Ajuda">
            <ul>
              <li><a href="/acompanhar-pedido.html">Acompanhar pedido</a></li>
              <li><a href="/pedidos.html">Minha conta</a></li>
              <li><a href="/#como-personalizar">Como personalizar</a></li>
              <li><a href="/politica.html#trocas">Trocas e devoluções</a></li>
              <li><a href="/politica.html#privacidade">Privacidade</a></li>
            </ul>
          </Grupo>
          <Grupo titulo="Fale com a gente">
            <ul>
              <li><a href={linkWhatsApp(loja.whatsapp)} target="_blank" rel="noopener noreferrer">WhatsApp {loja.whatsappFormatado}</a></li>
              <li><a href={`mailto:${loja.email}`}>{loja.email}</a></li>
              <li><a href={`https://www.instagram.com/${loja.instagram}`} target="_blank" rel="noopener noreferrer">Instagram e TikTok @{loja.instagram}</a></li>
            </ul>
          </Grupo>
        </div>
        <div className="rodape-base">
          <div className="rodape-pagamentos">
            <span>Pix com {pixDiscountPercent}% de desconto</span>
            <span>Cartão em até {interestFreeInstallments}x sem juros</span>
            <span>Boleto</span>
            <span className="rodape-seguro"><Icone nome="cadeado" tamanho={16} />Compra segura · Mercado Pago</span>
          </div>
          <span>{loja.nome} · CNPJ {loja.cnpj} · © {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}

export function WhatsAppFlutuante({ loja }: { loja: Loja }) {
  return (
    <a className="whatsapp-flutuante" href={linkWhatsApp(loja.whatsapp)} target="_blank" rel="noopener noreferrer" aria-label={`Falar com a ${loja.responsavel} no WhatsApp`}>
      <Icone nome="whatsapp" tamanho={30} traco={1.6} />
    </a>
  );
}
