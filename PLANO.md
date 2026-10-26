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

## Fase 0 — Coletar o material da cliente ⬜ (bloqueia a parte visual)

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

## Fase 1 — Marca e identidade ⬜

- Preencher `marca.json` e rodar `npm run aplicar-marca` (nome, WhatsApp,
  Instagram, e-mail, domínio, CNPJ/CPF, endereço, nome na fatura).
- Logo, favicon, ícone do celular e imagem de compartilhamento a partir do
  logo real.
- Novas variáveis de cor e fontes no `:root` do `css/style.css` e no
  `CORES` dos e-mails. Fontes servidas pelo próprio site, como hoje.
- Trocar o ícone de laço (`#bow-shape`) e os enfeites por um elemento da marca
  dela (ex.: caneca/coração estilizado, do jeito que ela usa no Instagram).

## Fase 2 — Catálogo de canecas ⬜

- `lib/catalogo.js`: trocar os 8 laços de exemplo pelos produtos reais dos
  catálogos (ou começar vazio e cadastrar pelo painel). Categorias por
  ocasião + coleções + tipo (caneca cerâmica 325 ml, mágica, chopp/jateada,
  xícara, copo/garrafa térmica, azulejo, quadro, kit), conforme o que ela
  vende de verdade.
- Endereço do produto de `/laco/…` para `/caneca/…` (rota, `produto-url.js`,
  `robots.txt`, sitemap, testes).
- `js/colors.js` (cor da fita): virar **variações de caneca** (cor da alça e
  do interior, tamanho/ml), com preço por variação se o catálogo pedir. Hoje a
  cor é validada no servidor; manter essa garantia.
- `lib/empacotamento.js`: peso e caixa reais de caneca (cerâmica ~350–450 g
  embalada; caixa individual; várias canecas por caixa; kits com caixa MDF).
  Pedir à cliente as medidas da caixa que ela usa.
- Prazo de produção (hoje "até 2 dias úteis") para o prazo real dela, em
  `lib/prazoFrete.js`, textos e e-mails.
- Promoção "Leve 4, pague 3" (`js/pricing.js`): manter, trocar ou desligar
  (decisão da cliente).
- `PAYMENT_RULES`: Pix 10% e 3x sem juros, como na inspiração (confirmar).

## Fase 3 — Personalização da caneca ⬜ (recurso novo, o mais importante)

O que a inspiração tem e o site da Adriana não tem:

- Na página do produto, campos definidos **por produto** no painel: nome,
  frase, data, **envio de 1 a 8 fotos**, observações. Obrigatório ou opcional.
- Fotos enviadas guardadas no banco (como as fotos de avaliação), com limite
  de tamanho, conversão para JPG/WebP e verificação do tipo real do arquivo.
  Só a dona do pedido e o painel enxergam.
- Personalização vai junto no carrinho, no pedido, no e-mail de venda, no aviso
  de WhatsApp e no painel (com botão para **baixar as fotos** da arte).
- Caixa "quero aprovar a arte pelo WhatsApp antes da produção" e botão
  "arte 100% personalizada? Fale no WhatsApp".
- Prévia simples da arte (foto sobre um molde de caneca), se a cliente quiser
  (custo extra; decidir).
- LGPD: dizer na política por quanto tempo as fotos ficam guardadas e apagar
  sozinho depois da entrega + X dias.
- Política de troca: produto personalizado pode ter regra diferente (defeito
  sempre troca). Texto final é decisão da cliente.

## Fase 4 — Layout no estilo da inspiração ⬜

Estrutura (com a identidade da cliente, sem copiar a arte da outra loja):

- Barra de aviso no topo (Pix com desconto, frete, prazo).
- Cabeçalho com logo, **busca em destaque**, conta, carrinho.
- **Menu de categorias** com submenu (ocasiões, coleções, tipos): menu grande
  no computador e gaveta no celular.
- Banner em carrossel (já existe e é trocado pelo painel em "Fotos do topo").
- **Vitrines por tema** na home ("Mais vendidas", ocasião do mês, coleções),
  configuráveis no painel.
- Cartão de produto: foto, nome, preço, preço no Pix, parcelas, selo
  ("Personalizável", "Novo", "Mais vendido"), botão.
- **Páginas de categoria** com endereço próprio (`/categoria/…`), filtro e
  ordenação. Hoje é tudo numa vitrine só; essa página é nova e conta pro
  Google.
- Página de produto completa: galeria com várias fotos (o banco já guarda
  `photos`), especificações, prazo, personalização, frete, avaliações,
  relacionados.
- Faixa de benefícios, avaliações/depoimentos, feed do Instagram (já existe),
  WhatsApp flutuante (já existe), rodapé completo com pagamentos e políticas.

## Fase 5 — Conteúdo ⬜

- Textos da home, "sobre", como funciona, garantias e política no tom do
  Instagram dela.
- Fotos reais dos produtos (as dos catálogos/Instagram, com autorização) e as
  5 fotos do topo (`node scripts/gerar-hero.js pasta-das-fotos`).
- `llms.txt`, dados estruturados e prévias de compartilhamento.

## Fase 6 — Verificação final ⬜

- `npm run verificar` e `npm run conferir` limpos.
- Compra completa de teste com credenciais `TEST-` do Mercado Pago (Pix e
  cartão), frete real, e-mails, painel (etiqueta, rastreio, avaliação).
- Desempenho e acessibilidade (Lighthouse) no celular.
- Revisão visual página por página com o Caio no servidor ao vivo.

## Fase 7 — Entrega para a cliente ⬜

- ⚠️ Prévia online para a cliente aprovar (hospedagem temporária) — só com
  permissão do Caio.
- Contas dela: Mercado Pago, Melhor Envio, Gmail com senha de app, hospedagem
  com Node 22+, domínio. Chaves coladas pelo Caio direto na hospedagem.
- Publicação seguindo `DEPLOY-HOSTINGER.md`.

## Decisões pendentes (Caio/cliente)

1. Fase 0: opção A (sessão no Mac) ou B (mandar arquivos)?
2. Personalização com prévia visual da arte ou só campos + fotos?
3. Manter "Leve 4, pague 3"?
4. Quais linhas além de caneca entram no lançamento (copo, azulejo, quadro,
   kit)?
5. Regra de troca para personalizados.
6. Onde hospedar a prévia para a cliente.

## Ordem de trabalho

Fase 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7. As fases 2 e 3 (catálogo e
personalização) podem começar antes da Fase 0 terminar, porque são
funcionamento e não visual. Depois de cada fase: `npm run verificar`,
`npm run conferir`, capturas para o Caio e commit.
