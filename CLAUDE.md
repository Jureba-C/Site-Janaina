# Site da Janaina — leia antes de qualquer pedido

@REGRAS.md

Antes de qualquer mudança no código: ler `REGRAS.md` (acima) e a fase atual
do `PLANO.md`. O site vende **canecas**.

Loja online feita pelo **Caio** para a cliente **Janaina**. A base é uma cópia
do site da **Adriana Melo Acessórios** (repositório de referência
`Jureba-C/Adriana-Melo-Acessorios`, branch `main`), com **o mesmo
funcionamento**: vitrine, carrinho, frete real, pagamento, acompanhar pedido,
conta da cliente e painel administrativo. A identidade já é a da Arte Canecas
(@arte.canecasbsb); só CNPJ, endereço, domínio, logo em arquivo e fotos em
alta resolução esperam a Janaina (ver `server/docs/PEDIDO-DA-CLIENTE.md`).

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
   CommonJS no servidor. As páginas da loja (início, categoria, busca,
   produto e carrinho) são React + TypeScript em `server/loja/` (Vite, com
   renderização no servidor); as demais páginas são scripts sem módulo, sem
   framework.

## Comandos

```bash
cd server
npm install            # Node 22.13 ou mais novo (usa node:sqlite)
npm run ao-vivo        # site em http://localhost:3000, recarrega sozinho a cada mudança
npm run dev            # servidor + site em http://localhost:3333
npm run conferir       # navegador de verdade em 5 telas; capturas em .conferencia/
npm test               # testes (node:test)
npm run sem-comentarios
npm run verificar      # sem comentários + testes — rodar depois de toda mudança
npm run aplicar-marca -- marca-nova.json [--simular]
npm run construir      # recompila a loja React (js/loja/ e loja-ssr/) — o ao-vivo faz sozinho
node scripts/gerar-logo.js   # img/logo.svg (texto em curvas)
node scripts/gerar-marca.js  # favicon, ícone do celular, logo PNG, og-loja.jpg e logo dos e-mails
```

`js/loja/` e `loja-ssr/` são gerados pelo `npm run construir` e **vão no
commit** (a hospedagem não roda o Vite).

Para rodar local, copie `server/.env.example` para `server/.env` e troque
`NODE_ENV=production` por `development`. Sem tokens o site abre normalmente;
só frete, pagamento e e-mail ficam desligados (o servidor avisa no terminal).

## Trocar a marca

Dados de identidade em **`server/marca.json`**. Já preenchidos: nome (Arte
Canecas), responsável, e-mail, Instagram, WhatsApp, nome na fatura. Ainda
com marcador: `dominio` (`nomedaloja.com.br`), `cnpj`
(`00.000.000/0000-00`) e `endereco`. Para trocar: copiar `marca.json`,
preencher e rodar `npm run aplicar-marca -- marca-nova.json --simular`, depois
sem `--simular`. O teste `test/marca.test.js` garante que cada marcador existe
e que nenhum dado da Adriana voltou.

## Imagens provisórias (trocar pelas reais)

| Arquivo | Como trocar |
|---|---|
| `img/logo.svg` | logo provisório montado por `scripts/gerar-logo.js`; com o arquivo real, salvar como `img/logo.svg` e rodar `node scripts/gerar-marca.js` (gera favicon, ícone do celular, `logo-loja.png`, `og-loja.jpg` e o logo dos e-mails) |
| `img/provisorias/*` | fotos tiradas do Instagram/catálogos; trocar pelas originais. Fotos de produto entram pelo **painel** (aba Produtos) |
| banner que troca sozinho no topo da home (5 slides: foto, título, frase e botão) | `TIPOS_DO_TOPO` em `server/lib/loja-dados.js`; visual em `BannerDoTopo` (`loja/src/paginas/Inicio.tsx`). A aba "Fotos do topo" do painel não muda mais o site |

## Onde mexer em cada assunto

| Assunto | Onde |
|---|---|
| Produtos, categorias (tipo e ocasião), selos | `lib/catalogo.js` e painel (Produtos) |
| Variações, adicionais, faixas de quantidade, personalização por produto | painel → editar produto (`js/admin-loja.js`); regras em `js/regras-produto.js` (servidor e loja) |
| Moldes da prévia e arte | `loja/src/componentes/Previa.tsx` (SVG) e `Previa3D.tsx` |
| Lugar de cada peça no estúdio (arco, bandeja, suporte do boton, cavalete do azulejo) | `CAIXAS_PLANAS` e `encaixeNoEstudio` em `Previa.tsx` (caneca, xícara, garrafa e copo usam a bandeja de sempre) |
| Formato 3D de garrafa, térmico, copos (reto, cerveja, chopp, whisky, mason, jateado) e xícara com pires | `formaDaPeca`, `FORMAS` e `COPOS` em `Previa3D.tsx`; a faixa de impressão continua um cilindro, o resto (ombro, tampa, fundo grosso, alça de vidro, pires) é montado em volta |
| Arquivo para Corel/Illustrator | `lib/producao.js` (gabaritos em mm) e `lib/texto-em-curvas.js` (fontes em `lib/fontes/`) |
| Peso e caixa para o frete | painel → produto; cálculo em `lib/empacotamento.js` |
| Retirada grátis | `OPCAO_RETIRADA` e `LOCAL_DE_RETIRADA` no `server.js` |
| Pix com desconto e parcelas | `js/pricing.js` → `PAYMENT_RULES` |
| Prazo de produção | painel → Produtos (campo "Prazo de produção") |
| Cupom de boas-vindas | `WELCOME_COUPON_CODE = "BEMVINDA10"` no `server.js` |
| Cores e fontes | `loja/src/estilos/loja.css` (loja), `css/style.css` (demais páginas), `CORES` em `lib/email.js` |
| Textos da home | `loja/src/paginas/Inicio.tsx` |
| "Escolha por tipo" da home (só tipos com produto) | `tiposDaHome()` e fotos em `FOTO_DO_TIPO` (`lib/loja-dados.js`); tipo sem foto usa a ilustração da peça |
| Abas da vitrine da home (Mais pedidas mistura os tipos) | `ABAS_POR_TIPO` e `vitrines()` em `lib/loja-dados.js` |
| Bolinhas de cor no cartão | `coresDoProduto()` em `lib/loja-dados.js` (grupo de variação `cor` com `hex`) |
| Política de trocas/privacidade | `politica.html` (itens `[a confirmar]`) |

## Mapa do sistema

Tudo fica em `server/` (é a pasta que a hospedagem usa como raiz). O
`express.static` só publica o que está em `PUBLIC_TOP_LEVEL` no `server.js`;
`lib/`, `scripts/`, `docs/`, `test/` e `marca.json` nunca saem na web.

- **Loja (React + TypeScript)**: `loja/src/` — `/`, `/categoria/:slug`,
  `/busca`, `/produto/:apelido` e o carrinho. O servidor monta o HTML
  (`lib/loja-ssr.js` + `loja-ssr/entrada-servidor.cjs`) com os dados de
  `lib/loja-dados.js`; o navegador baixa o React só depois da primeira
  pintura (`loja/src/entrada-cliente.tsx`).
- **Páginas**: `conta.html`,
  `pedidos.html` (minha conta), `acompanhar-pedido.html`, `avaliar.html`,
  `pagamento-pix.html` (QR Code próprio), `pagamento-sucesso/erro/pendente.html`,
  `redefinir-senha.html`, `politica.html`, `admin.html`, `404.html`,
  `429.html`, `manutencao.html`.
- **Navegador (`js/`)**: `pricing.js`, `regras-produto.js` e
  `produto-url.js` (compartilhados com o servidor e a loja), `admin.js` e
  `admin-loja.js` (painel), `auth.js`, `conta.js`, `pedidos.js`,
  `minha-conta.js`, `acompanhar-pedido.js`, `pagamento-pix.js`, `avaliar.js`.
- **Servidor**: `server.js` (rotas, checkout, webhook, painel), `lib/db.js`
  (SQLite: usuários, sessões, pedidos, cupons, produtos, avaliações,
  campanhas, fila de e-mail), `lib/auth.js` (senha bcrypt, cookie httpOnly,
  admin por hash de e-mail, 2FA), `lib/melhorEnvio.js`, `lib/rastreio.js`,
  `lib/email.js`, `lib/whatsapp.js`, `lib/instagram.js`, `lib/campanhas.js`,
  `lib/googleAuth.js`, `lib/xlsx.js`, `lib/pagamento.js` (assinatura do
  webhook e valor conferido), `lib/itens-pedido.js`, `lib/producao.js`.
- **Fluxo de compra**: carrinho → CEP (`/api/calculate-shipping`) → escolha
  Pix ou cartão/boleto → `/api/create-pix-payment` ou
  `/api/create-preference` (Mercado Pago Checkout Pro) → webhook
  `/api/webhook` confirma o pagamento consultando o Mercado Pago → avisos por
  e-mail/WhatsApp → painel gera etiqueta no Melhor Envio e rastreio (ou
  marca "retirado") →
  cliente acompanha em `acompanhar-pedido.html` e avalia em `avaliar.html`.
- **Painel** (`admin.html`): abre na **Produção** (`js/admin-producao.js`,
  `css/admin-producao.css`, etapas e prazo em `lib/etapas-pedido.js`, ver
  `server/docs/PAINEL-PRODUCAO.md`), depois Vendas e pedidos (etiqueta,
  rastreio, entrega, pedir avaliação), Produtos (criar, editar, foto, ordem,
  esgotado, oculto), Dashboard, Cupons, Clientes, Avaliações e "Loja e
  configurações" (Depoimentos, Novidades, Mensagens, backup
  completo, Instagram, aviso de venda).
- **Estampas** (padrão que dá a volta na peça: flores, Brasília…): biblioteca
  no banco (`estampas` em `lib/db.js`, imagens em `lib/estampas.js`, 3
  exemplos em `lib/estampas-exemplo.js`, painel em `js/admin-estampas.js`),
  ligadas no produto em Produtos → Estampas (`config.estampas`). Regras e
  geometria da volta em `js/regras-produto.js` (`COBERTURA_DA_VOLTA`,
  `voltaDaPeca`): caneca 240 × 95 mm até a alça, emenda atrás da alça. Prévia
  2D (`EstampaNaPeca` em `Previa.tsx`), 3D (`Previa3D.tsx`) e arquivo de
  produção (`lib/producao.js`, camada "Estampa" com a imagem original) usam
  a mesma conta. Nome e frase sobre estampa ganham uma etiqueta lisa atrás
  para dar para ler. O servidor mede as letras com as fontes reais
  (`larguraDoTexto`), então o texto do arquivo sai do tamanho da prévia.
  Valem em caneca, xícara, garrafa e copo (dão a volta) e em boton,
  azulejo, placa e caixa (cobrem a face; prévia plana via `superficiePlana`
  em `Previa.tsx`, boton recortado em círculo no arquivo). Cada estampa tem
  "Serve para" (coluna `moldes`, filtro em `estampasDisponiveis`). O painel
  tem a aba **Estampas** no menu.
- **Estampa criada pela cliente** (`config.estampas.propria {padrao, imagem,
  preco}`, escolha em `personalizacao.estampaPropria`): "Montar padrão"
  (desenho ou foto dela repetidos, cores da `PALETA_DA_ESTAMPA`, tamanho e
  espaço em mm, xadrez) ou "Enviar imagem". Regras e validação em
  `js/regras-produto.js` (`validarEstampaPropria`, `MOTIVOS_DA_ESTAMPA`);
  desenho do padrão em `js/estampa-propria.js` (`svgDoPadrao`,
  `conteudoDoPadrao`), usado pela loja (`loja/src/estado/estampa-propria.ts`)
  e pelo arquivo de produção (`estampaPropriaDoItem` no `server.js`). A foto
  usa o mesmo envio e prazo de guarda das fotos da personalização
  (`fotosDaPersonalizacao` em `lib/itens-pedido.js`).
- **Tamanho de cada produto**: `config.tamanho {largura, altura}` em mm
  (painel → produto → Prévia da arte → Área de impressão). Padrões por molde
  em `MEDIDAS_DO_MOLDE` e conta final em `medidaDaPeca`
  (`js/regras-produto.js`): variação com medida no nome > tamanho do produto >
  texto da medida > padrão do molde. Vale para o arquivo de produção e o
  tamanho real do padrão da estampa.
- **Efeitos** (inspirados no React Bits, sem biblioteca):
  `loja/src/componentes/efeitos/efeitos.ts` (`soltarFaiscas` no botão de
  comprar, `inclinacao` nos cartões de tipo e na foto do produto); o selo do
  banner gira (`.selo-giro`) e o cartão de Botons descola (`.adesivo`) só
  com CSS em `loja.css`. Tudo parado com movimento reduzido.
- **Tarefas periódicas**: `POST /api/interno/tarefas-periodicas` com
  `Authorization: Bearer CRON_SECRET` a cada 15 min (hospedagem sem cron).
  Inclui o backup diário fora do servidor e a limpeza de registros antigos.
- **Segurança** (detalhes em `server/docs/SECURITY-AUDIT.md`, rodada de
  29/10/2026; testes em `test/seguranca-*.test.js`, `npm run seguranca`):
  - pagamento: máquina de estados em `lib/estado-do-pedido.js` (pedido pago
    nunca volta, efeitos uma vez só), API do Mercado Pago em
    `lib/mercado-pago-api.js`, assinatura em `lib/pagamento.js`;
  - painel: só app autenticador, `exigirConfirmacaoRecente` nas
    `ROTAS_SENSIVEIS` do `server.js`, modal em `js/admin-seguranca.js`, aba
    Segurança em `js/admin-eventos.js`;
  - eventos e alertas: `lib/eventos-seguranca.js` (tabela
    `eventos_seguranca`); toda ação sensível nova deve chamar
    `eventos.registrar`;
  - dados: criptografia transparente em `lib/cofre.js` (todo `db.prepare`
    decifra na leitura; campo sensível novo precisa de `cofre.cifrar` na
    gravação e entrar em `CAMPOS_CIFRADOS` no `lib/db.js`);
  - IP e produção: `lib/ambiente.js` (`TRUST_PROXY`); senhas em
    `lib/senhas.js`; endereço em `lib/endereco.js`; fotos em
    `lib/fila-de-imagens.js`; backup em `lib/backup-remoto.js`; registro sem
    dado pessoal em `lib/registro.js` (usar `resumoDeErro`, nunca o erro cru).

## Documentos

- `REGRAS.md` — instruções do Caio (ler sempre antes de mudar).
- `PLANO.md` — plano da loja de canecas, fases e decisões.
- `README.md` — visão geral e como rodar.
- `server/docs/CONFIGURACAO.md` — cada variável do `.env`.
- `DEPLOY-HOSTINGER.md` — publicação na Hostinger.
- `server/docs/SECURITY-AUDIT.md` — decisões de segurança.
- `server/docs/instagram-setup.md` — token do Instagram.
- `server/docs/PEDIDO-DA-CLIENTE.md` — lista do que pedir para a Janaina.
- `server/docs/PAINEL-PRODUCAO.md` — etapas do pedido, prazo e planilhas da aba Produção.
- `server/docs/CHECKLIST-DEPLOY.md` — o que conferir antes e depois de publicar.
- `server/docs/RESPOSTA-A-INCIDENTE.md` — o que fazer se algo der errado.
