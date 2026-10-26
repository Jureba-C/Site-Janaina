# Site da Janaina — leia antes de qualquer pedido

@REGRAS.md

Antes de qualquer mudança no código: ler `REGRAS.md` (acima) e a fase atual
do `PLANO.md`. O site vende **canecas**.

Loja online feita pelo **Caio** para a cliente **Janaina**. A base é uma cópia
do site da **Adriana Melo Acessórios** (repositório de referência
`Jureba-C/Adriana-Melo-Acessorios`, branch `main`), com **o mesmo
funcionamento**: vitrine, carrinho, frete real, pagamento, acompanhar pedido,
conta da cliente e painel administrativo. A identidade da Adriana (nome,
contatos, CNPJ, endereço, logo, fotos) já foi trocada por marcadores
provisórios; os produtos e textos de "laços" continuam como exemplo até a
Janaina mandar os dela.

## Regras de trabalho (obrigatórias)

1. **Zero comentários no código** (JS, HTML, CSS, `.env.example`,
   `.gitignore`). O teste `test/sem-comentarios.test.js` falha se aparecer um.
   Explicação vai para os `.md`, nunca para o código.
2. **Zero erro**: antes de entregar, rodar `cd server && npm run verificar`
   (verificador de comentários + testes) e `npm run conferir` (navegador),
   e só dizer que está pronto se os dois passarem. Relatar com honestidade.
3. **Mostrar antes de publicar**: deixar `cd server && npm run ao-vivo`
   rodando (`http://localhost:3000`) para o Caio acompanhar. Conferir celular (390 e 360 px),
   tablet (768 px) e computador (1440 e 1920 px), e também com movimento
   reduzido (as animações de entrada escondem seções em capturas comuns).
4. **Nunca publicar sem permissão**: nada de push na `main`, deploy, mudar
   variável na hospedagem ou rodar coisa em produção sem o Caio dizer "pode
   subir/publicar".
5. **Nunca pedir nem colar segredos no chat** (tokens do Mercado Pago, Melhor
   Envio, SMTP, WhatsApp). O Caio cola direto na hospedagem/`.env`.
6. Respostas em **português (Brasil)**, curtas e diretas, sem jargão. Marcar
   com ⚠️ só o que depende do Caio ou da cliente.
7. Perguntar quando a decisão for de gosto/estética ou tiver custo; decidir
   sozinho o que é técnico.
8. Seguir o jeito do código ao redor: nomes em português nos arquivos novos,
   CommonJS no servidor, scripts sem módulo no navegador, sem framework.

## Comandos

```bash
cd server
npm install            # Node 22.5 ou mais novo (usa node:sqlite)
npm run ao-vivo        # site em http://localhost:3000, recarrega sozinho a cada mudança
npm run dev            # servidor + site em http://localhost:3333
npm run conferir       # navegador de verdade em 5 telas; capturas em .conferencia/
npm test               # testes (node:test)
npm run sem-comentarios
npm run verificar      # sem comentários + testes — rodar depois de toda mudança
npm run aplicar-marca -- marca-nova.json [--simular]
```

Para rodar local, copie `server/.env.example` para `server/.env` e troque
`NODE_ENV=production` por `development`. Sem tokens o site abre normalmente;
só frete, pagamento e e-mail ficam desligados (o servidor avisa no terminal).

## Trocar a marca (primeiro passo quando a Janaina mandar os dados)

Todos os dados de identidade estão em **`server/marca.json`** e aparecem no
site como marcadores únicos:

| Campo | Marcador atual | Onde aparece |
|---|---|---|
| `nomeLoja` | `Nome da Loja` | títulos, rodapés, e-mails, dados estruturados, avisos |
| `responsavel` | `Nome da Responsável` | topo da home, "nossa história", política |
| `dominio` | `nomedaloja.com.br` | `SITE_URL` no `server.js`, canonical, sitemap, robots, llms |
| `email` | `contato@nomedaloja.com.br` | contato, política, dados estruturados |
| `instagram` | `nomedaloja` | links, feed, dados estruturados |
| `whatsappDigitos` | `5500000000000` | todos os links `wa.me` |
| `whatsappFormatado` | `(00) 00000-0000` | textos com o número |
| `cnpj` | `00.000.000/0000-00` | rodapé, política, dados estruturados |
| `endereco` | `Endereço completo — CEP 00000-000 — Cidade/UF` | política |
| `nomeFatura` | `NOMEDALOJA` | nome na fatura do cartão (máx. 22, maiúsculas, sem acento) |
| `nomeSemEspaco` | `NomeDaLoja` | User-Agent do Melhor Envio |

Copie `marca.json` para um arquivo novo, preencha e rode
`npm run aplicar-marca -- marca-nova.json --simular` (mostra o que muda) e
depois sem `--simular`. O script valida os formatos, troca tudo em uma
passada e atualiza o `marca.json`. O teste `test/marca.test.js` garante que
cada marcador existe e que nenhum dado da Adriana voltou.

Depois da troca, revisar à mão: `Brasília/DF` (cidade aparece em textos da
home, rodapé, e-mails via `ASSINATURA_LOJA` em `lib/email.js` e
`addressLocality` no `server.js`) e as frases de história em `index.html`.

## Imagens provisórias (trocar pelas reais)

| Arquivo | Tamanho | Como trocar |
|---|---|---|
| `img/logo-loja.png` | 336×108 | arte da logo; depois `node scripts/logo-email.js` gera `img/logo-loja-email.png` |
| `img/og-loja.jpg` | 1200×630 | prévia no WhatsApp/redes |
| `favicon.ico`, `apple-touch-icon.png` | 16/32/48 e 180 | ícone da aba |
| `img/hero-foto-1..5-{480,960}.{jpg,webp}` | 4:5 | `node scripts/gerar-hero.js pasta-com-5-fotos` (corte automático). O painel também troca as fotos do topo sem mexer em código (aba "Fotos do topo"). |

Produtos novos e fotos de produto entram pelo **painel** (aba Produtos), não
pelo código.

## O que ainda é específico de "laços" (adaptar ao que a Janaina vende)

| Assunto | Onde |
|---|---|
| Produtos de exemplo, categorias fixas, selos | `lib/catalogo.js` (`PRODUCTS`, `BUILTIN_CATEGORIES`, `PRODUCT_BADGES`) |
| Cores da fita escolhidas no carrinho (validadas no servidor) | `js/colors.js` (`RIBBON_COLORS`) — usado por `main.js`, `server.js` e e-mails |
| Caixa, peso e medidas para o frete | `lib/empacotamento.js` (`CAIXA_PADRAO`, `PESO_LACO_KG`, caixa "maior" para cabide) |
| Endereço do produto `/laco/<id>-<nome>` | `js/produto-url.js`, rota `app.get("/laco/:apelido")` e `PUBLIC_TOP_LEVEL` no `server.js`, `robots.txt`, testes de `produto-link` |
| Promoção "Leve 4, pague 3" | `js/pricing.js` (`promoLeve4Pague3Breakdown`, cobrada no servidor) e faixa em `js/faixa-promo.js` |
| Pix com desconto e parcelas | `js/pricing.js` → `PAYMENT_RULES` (vale para site e cobrança ao mesmo tempo) |
| Cupom de boas-vindas | `WELCOME_COUPON_CODE = "BEMVINDA10"` no `server.js` (cupom em si é criado/apagado no painel) |
| Prazo de produção e textos de "feito à mão" | `index.html`, `pagamento-*.html`, `lib/email.js`, `lib/prazoFrete.js`, `llms.txt` |
| Ícone de laço (`#bow-shape`) e enfeites | `index.html` (símbolo SVG), `css/style.css`, `js/animacoes.js` |
| Paleta rosa e fontes (Fraunces, Poppins, Caveat) | `css/style.css` (variáveis no `:root`), `css/fonts.css`, `CORES` em `lib/email.js` |
| Textos das seções da home (história, como funciona, garantias, contato) | `index.html` |
| Política de trocas/privacidade | `politica.html` (revisar com os dados reais da cliente) |

## Mapa do sistema

Tudo fica em `server/` (é a pasta que a hospedagem usa como raiz). O
`express.static` só publica o que está em `PUBLIC_TOP_LEVEL` no `server.js`;
`lib/`, `scripts/`, `docs/`, `test/` e `marca.json` nunca saem na web.

- **Páginas**: `index.html` (loja, montada pelo servidor com os marcadores
  `<template data-marca=...>` e `%%CUPOM-BOAS-VINDAS%%`), `conta.html`,
  `pedidos.html` (minha conta), `acompanhar-pedido.html`, `avaliar.html`,
  `pagamento-pix.html` (QR Code próprio), `pagamento-sucesso/erro/pendente.html`,
  `redefinir-senha.html`, `politica.html`, `admin.html`, `404.html`,
  `429.html`, `manutencao.html`.
- **Navegador (`js/`)**: `main.js` (vitrine, carrinho, frete, cupom, checkout),
  `pricing.js` e `colors.js` (compartilhados com o servidor), `admin.js`
  (painel inteiro), `auth.js`, `conta.js`, `pedidos.js`, `minha-conta.js`,
  `acompanhar-pedido.js`, `pagamento-pix.js`, `avaliar.js`, `animacoes.js`
  (GSAP, respeita movimento reduzido).
- **Servidor**: `server.js` (rotas, checkout, webhook, painel), `lib/db.js`
  (SQLite: usuários, sessões, pedidos, cupons, produtos, avaliações,
  campanhas, fila de e-mail), `lib/auth.js` (senha bcrypt, cookie httpOnly,
  admin por hash de e-mail, 2FA), `lib/melhorEnvio.js`, `lib/rastreio.js`,
  `lib/email.js`, `lib/whatsapp.js`, `lib/instagram.js`, `lib/campanhas.js`,
  `lib/googleAuth.js`, `lib/xlsx.js`.
- **Fluxo de compra**: carrinho → CEP (`/api/calculate-shipping`) → escolha
  Pix ou cartão/boleto → `/api/create-pix-payment` ou
  `/api/create-preference` (Mercado Pago Checkout Pro) → webhook
  `/api/webhook` confirma o pagamento consultando o Mercado Pago → avisos por
  e-mail/WhatsApp → painel gera etiqueta no Melhor Envio e rastreio →
  cliente acompanha em `acompanhar-pedido.html` e avalia em `avaliar.html`.
- **Painel** (`admin.html`): Dashboard, Produtos (criar, editar, foto,
  ordem, esgotado, oculto), Cupons, Vendas e pedidos (etiqueta, rastreio,
  entrega, pedir avaliação), Clientes, Mensagens, Avaliações, Fotos do topo,
  Depoimentos, Novidades (campanhas de e-mail), exportar planilha.
- **Tarefas periódicas**: `GET /api/interno/tarefas-periodicas?token=CRON_SECRET`
  a cada 15 min (hospedagem sem cron).

## Documentos

- `REGRAS.md` — instruções do Caio (ler sempre antes de mudar).
- `PLANO.md` — plano da loja de canecas, fases e decisões.
- `README.md` — visão geral e como rodar.
- `server/docs/CONFIGURACAO.md` — cada variável do `.env`.
- `DEPLOY-HOSTINGER.md` — publicação na Hostinger.
- `server/docs/SECURITY-AUDIT.md` — decisões de segurança.
- `server/docs/instagram-setup.md` — token do Instagram.
- `server/docs/PEDIDO-DA-CLIENTE.md` — lista do que pedir para a Janaina.
