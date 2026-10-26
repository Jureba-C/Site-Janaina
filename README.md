# Site da Janaina

Loja online completa, com o mesmo funcionamento do site da Adriana Melo
Acessórios: vitrine, carrinho, frete real (Melhor Envio), pagamento (Mercado
Pago: Pix com QR Code, cartão e boleto), conta da cliente, acompanhar pedido,
avaliações e painel administrativo.

Guia de trabalho, mapa do código e o que falta adaptar: **`CLAUDE.md`**.

## Rodar no computador

Requer Node.js **22.5 ou mais novo**.

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Abra `http://localhost:3333`. Para rodar local, troque `NODE_ENV=production`
por `development` no `.env`. Sem as chaves, o site abre normalmente e só
frete, pagamento e e-mail ficam desligados.

## Verificar antes de entregar

```bash
cd server
npm run verificar
```

Confere que não há nenhum comentário no código e roda todos os testes.

## Estrutura

```
server/                  ← site + servidor (raiz da aplicação na hospedagem)
├── *.html               ← páginas (loja, conta, pedidos, acompanhar, painel…)
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
