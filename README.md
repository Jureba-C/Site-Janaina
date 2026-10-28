# Site da Janaina

Loja online da **Arte Canecas** (@arte.canecasbsb): canecas, xícaras,
garrafas, copos e lembranças personalizadas, com **prévia da arte ao vivo**
(2D e 3D), fotos da cliente, carrinho, frete pelo Melhor Envio ou retirada
grátis na Asa Norte, pagamento pelo Mercado Pago (Pix com 10% de desconto e
QR Code próprio, cartão em até 3x, boleto), conta da cliente, acompanhar
pedido, avaliações e painel administrativo — que gera a arte em PNG e o
arquivo pronto para CorelDRAW/Illustrator.

Guia de trabalho, mapa do código e o que falta adaptar: **`CLAUDE.md`**.

## Rodar no computador

Requer Node.js **22.13 ou mais novo**.

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Abra `http://localhost:3333` (ou `npm run ao-vivo` para
`http://localhost:3000`, que recompila e recarrega sozinho). Para rodar local, troque `NODE_ENV=production`
por `development` no `.env`. Sem as chaves, o site abre normalmente e só
frete, pagamento e e-mail ficam desligados.

## Verificar antes de entregar

```bash
cd server
npm run verificar
```

Confere que não há nenhum comentário no código e roda todos os testes.
Depois, `npm run conferir` abre o site num navegador de verdade em 5 telas
(celular 360/390, tablet 768, computador 1440/1920) e guarda capturas em
`server/.conferencia/`.

## Estrutura

```
server/                  ← site + servidor (raiz da aplicação na hospedagem)
├── loja/src/            ← loja em React + TypeScript (início, categoria, busca, produto, carrinho)
├── js/loja/  loja-ssr/  ← loja compilada por `npm run construir` (vai no commit)
├── *.html               ← demais páginas (conta, pedidos, acompanhar, pagamento, painel…)
├── css/  js/  img/      ← arquivos públicos
├── server.js            ← rotas, checkout, webhook, painel
├── lib/                 ← banco, login, frete, e-mail, WhatsApp, Instagram
├── scripts/             ← backup, tarefas, marca, verificador de comentários
├── test/                ← testes (node:test)
├── docs/                ← configuração, segurança, Instagram, pedido da cliente
├── marca.json           ← dados de identidade da loja
└── .env.example         ← variáveis (explicadas em docs/CONFIGURACAO.md)
```

## Documentos

- `server/docs/PEDIDO-DA-CLIENTE.md` — o que pedir para a cliente
- `server/docs/CONFIGURACAO.md` — cada variável de ambiente
- `DEPLOY-HOSTINGER.md` — como publicar
- `server/docs/SECURITY-AUDIT.md` — decisões de segurança
- `server/docs/instagram-setup.md` — feed do Instagram
