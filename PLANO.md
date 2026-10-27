# Plano — loja de canecas da Janaina (@arte.canecasbsb)

Objetivo: um site de vendas de canecas **pronto para mandar à cliente**, com a
estrutura e a experiência da Aqui Tem Caneca e a identidade visual da Arte
Canecas. Tudo o que já funciona no site da Adriana continua: carrinho, frete
real, Mercado Pago (Pix com QR Code, cartão, boleto), conta, acompanhar
pedido, avaliações, painel e e-mails.

Status de cada fase: ⬜ não começou · 🟨 em andamento · ✅ pronto.

## O que já se sabe

**Inspiração — Aqui Tem Caneca** (pela busca; o site não abre na nuvem):

- Loja de presentes personalizados, com caneca como carro-chefe.
- Menu por **ocasião** (aniversário, casamento, namorados, Dia das Mães, para
  o pai, professores, Páscoa, batizado) e por **coleção** (Arte rostinhos,
  Coleção Mundi, caneca cristã).
- Outras linhas: copos e garrafas térmicas (700–800 ml), quadros com foto
  (12×15 e 20×20), azulejos 15×15 com suporte de madeira, escritório e
  papelaria, kit caneca + caixa MDF.
- Cartão de produto: preço cheio, **até 3x sem juros** e **preço no Pix ~10%
  menor** (R$ 65,56 → R$ 59,00).
- Produto personalizado: a cliente **envia fotos** (ex.: 2, 4 ou 8 rostinhos),
  nome ou frase. A arte fixa não muda, e arte 100% personalizada é combinada
  pelo **WhatsApp**.
- Página do produto com especificações (cerâmica 325 ml), **prazo de produção**
  (10 dias úteis) e aviso de variação de cor de até 15%.

**Cliente — Arte Canecas (Brasília)**: Instagram, bio.site e dois catálogos no
Canva. ⚠️ Nada disso abre na nuvem (a rede da sessão bloqueia, e o Canva
pede login). Sem ver o material dela, não dá para definir cores, fontes,
logo, produtos e preços. Por isso a Fase 0 vem antes de tudo.

## Fase 0 — Coletar o material da cliente ✅

Feito em 2026-10-26: `server/docs/identidade.md` e capturas em
`server/docs/referencias/`. Design feito no Claude Design e resumido em
`server/docs/design.md`.

<details><summary>Como foi coletado</summary>


Uma das duas opções:

- **A) Sessão no computador do Caio** (recomendado): no app do Claude no Mac,
  com a extensão Claude in Chrome conectada, abrir o Instagram, o bio.site,
  os dois Canva (já logado) e a Aqui Tem Caneca. Tirar capturas e anotar:
  paleta, fontes, estilo das fotos, logo, produtos, preços, textos.
- **B) Caio manda os arquivos aqui**: os dois catálogos em PDF (Canva →
  Compartilhar → Baixar → PDF), 6 a 10 prints do Instagram (perfil + posts
  típicos), print do bio.site, o logo em PNG/SVG e prints da Aqui Tem Caneca
  (início, menu aberto, categoria e página de produto, no celular e no
  computador).

Saída: `docs/identidade.md` com paleta (hex), fontes, tom de voz, regras de
foto, lista de produtos e preços, e as capturas de referência em
`docs/referencias/` (fora do site publicado).

</details>

## Fase 1 — Marca e identidade ✅

- Dados reais em `marca.json` (nome, WhatsApp, Instagram, e-mail). CNPJ,
  endereço e domínio continuam marcados como `[a confirmar]`.
- Logo provisório em SVG com texto em curvas (`npm run gerar-logo` →
  `img/logo.svg`), favicon, ícone do celular, imagem de compartilhamento e
  logo dos e-mails gerados por `scripts/gerar-marca.js`. Troca pelo arquivo
  real da Janaina quando ela mandar.
- Paleta e fontes do design (Fraunces, Josefin Sans, Allura), servidas pelo
  próprio site. Terracota escurecida para `#9E4A18` para passar no contraste.
- Flor no lugar do laço em todas as páginas e e-mails.

## Fase 2 — Catálogo ✅

- 77 produtos reais dos catálogos em `lib/catalogo.js`, com tipo e ocasião,
  variações (cor da alça, tamanho…), adicionais e faixas de quantidade, tudo
  validado e cobrado pelo servidor.
- Endereço `/produto/<id>-<nome>`, com redirecionamento permanente de
  `/laco/…`. Páginas `/categoria/…` e `/busca`.
- Peso e caixa por produto no painel; prazo de produção editável no painel.
- Pix 10% e 3x sem juros (`PAYMENT_RULES`). "Leve 4, pague 3" removida.
- Retirada grátis na Asa Norte além do Melhor Envio.

## Fase 3 — Personalização ✅

- Campos por produto (nome, frase, data, letra, arte, 0 a 8 fotos,
  observações, aprovar pelo WhatsApp), validados no servidor.
- Prévia ao vivo em SVG para caneca, xícara, garrafa, copo, azulejo, plano e
  molde por foto; frente e verso; prévia em 3D ao tocar em "Ver em 3D"
  (carrega só nessa hora).
- Fotos privadas (só quem enviou, a dona do pedido e o painel), tipo real
  conferido; apagadas sozinhas (48 h sem pedido, 15 dias sem pagamento,
  60 dias depois da entrega).
- Painel: prévia, arte em PNG e **arquivo para Corel/Illustrator** (SVG em
  milímetros, texto em curvas, foto embutida, camadas Frente/Verso/Guias).

## Fase 4 — Layout do Claude Design ✅

- Loja (início, categoria, busca, produto, carrinho) em React 19 +
  TypeScript com renderização no servidor, seguindo o canvas.
- Celular 360/390, tablet 768 e computador 1440/1920 conferidos.

## Fase 5 — Conteúdo e SEO ✅

- Textos da home, política (fotos e LGPD, trocas de personalizado com
  `[a confirmar]`, retirada, Pix 10%), `llms.txt`, `robots.txt`, sitemap com
  categorias, dados estruturados e prévia de compartilhamento.
- Fotos provisórias tiradas do Instagram/catálogos da Janaina até ela mandar
  as originais.

## Fase 6 — Verificação final ✅

- `npm run verificar` (256 testes) e `npm run conferir` limpos.
- Lighthouse no celular (27/10/2026): início, produto, categoria e busca com
  desempenho 98–99, acessibilidade 100, boas práticas 100, SEO 100 (a busca
  dá 69 de SEO de propósito, porque não deve ser indexada). LCP 2,0–2,1 s,
  CLS ≤ 0,001.
- Compra de teste completa com o Mercado Pago simulado (conta, personalização
  com foto, retirada, Pix, confirmação pelo webhook, painel, arte, arquivo de
  produção, "retirado", acompanhamento). Falta repetir com as credenciais
  `TEST-` reais e o Melhor Envio (⚠️ dependem das contas da Janaina).
- Segurança do site inteiro até o pagamento: ver
  `server/docs/SECURITY-AUDIT.md` (rodada de 27/10/2026).

## Fase 7 — Entrega para a cliente ⬜

- ⚠️ Prévia online para a cliente aprovar (hospedagem temporária) — só com
  permissão do Caio.
- Contas dela: Mercado Pago, Melhor Envio, Gmail com senha de app, hospedagem
  com Node 22+, domínio. Chaves coladas pelo Caio direto na hospedagem.
- Publicação seguindo `DEPLOY-HOSTINGER.md`.

## Decisões tomadas

- 2026-10-26 — Fase 0 pela opção A: sessão no Mac do Caio, com o Claude in
  Chrome.
- 2026-10-26 — Personalização com prévia visual da arte na caneca.
- 2026-10-26 — Promoção "Leve 4, pague 3" sai do site.
- 2026-10-26 — Funcionamento e catálogo (Fases 2 e 3) começam já.
- 2026-10-26 — Frete pelo Melhor Envio, mais retirada grátis na Asa Norte.
- 2026-10-26 — Prévia em 3D entra, carregada só quando a cliente pede.
- 2026-10-27 — A loja só baixa o React depois de mostrar a página (a
  primeira pintura não espera o script); o aviso de privacidade aparece na
  primeira rolagem ou toque.

- 2026-10-26 — Design no Claude Design (canvas "Arte Canecas — Loja"),
  resumido em `server/docs/design.md`.
- 2026-10-26 — Tecnologia: continua Node 22 + Express 5 + SQLite
  (`node:sqlite`) + HTML/CSS/JS sem framework e sem etapa de build. É o
  mais rápido para uma loja desse tamanho, já está testado (254 testes) e é
  o mesmo funcionamento do site da Adriana.
- 2026-10-26 — Prévia da arte para qualquer produto (moldes + molde por foto).
- 2026-10-26 — O Caio pediu TypeScript + React. Escolhido: **só as páginas da
  loja** (início, categoria, busca, produto e carrinho) em React 19 +
  TypeScript, com Vite e renderização no servidor (o Google recebe o HTML
  pronto). O resto (servidor Express, painel, conta, pagamentos, e-mails)
  continua em JavaScript, sem risco no checkout. Substitui a decisão
  "sem framework" acima para essas páginas.

## Decisões pendentes (Caio/cliente)

1. Regra de troca para personalizados (a política está com `[a confirmar]`).
2. Onde hospedar a prévia para a cliente.
3. Confirmar Pix 10% e 3x sem juros.
4. Prazo de produção, peso e caixa de envio, moldes de impressão por peça,
   CNPJ/endereço, domínio, logo em arquivo e fotos em boa resolução (ver
   `server/docs/PEDIDO-DA-CLIENTE.md`).

## Ordem de trabalho

Fase 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7. As fases 2 e 3 (catálogo e
personalização) podem começar antes da Fase 0 terminar, porque são
funcionamento e não visual. Depois de cada fase: `npm run verificar`,
`npm run conferir`, capturas para o Caio e commit.
