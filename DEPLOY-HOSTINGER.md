# Publicando o site na Hostinger

Guia específico deste projeto. Ele **não** é um site estático: o mesmo
processo Node serve as páginas *e* a API (pagamento, contas, painel), então
não dá para simplesmente arrastar os arquivos para o `public_html`.

---

## 1. O plano precisa ter Node.js

O painel da Hostinger (hPanel) oferece **Node.js 18, 20, 22 e 24**.

⚠️ **Escolha 22 ou 24.** O projeto usa `node:sqlite`, o módulo de banco
nativo do Node, que só funciona sem opção extra a partir do **22.13**. Em 18 ou 20 o servidor
nem inicia.

---

## 2. Como o projeto está organizado (importante na hora de configurar)

```
Site-Janaina/
└── server/                  ← o site inteiro mora aqui (index.html, css/,
    ├── index.html              js/, img/) junto com o back-end
    ├── css/, js/, img/
    ├── package.json         ← as dependências estão AQUI, não na raiz
    ├── server.js            ← arquivo de entrada
    ├── lib/                 ← código de servidor (db, auth, e-mail, WhatsApp)
    ├── scripts/, docs/      ← utilitários e documentação
    └── data.db              ← banco (criado sozinho no primeiro boot)
```

`server.js` serve os arquivos do site a partir da própria pasta onde está
(`SITE_ROOT = __dirname`). Isso é proposital: builders de deploy como o da
Hostinger só deixam escolher uma pasta *existente* do repositório como raiz
da aplicação (não a raiz do repositório em si), então a pasta escolhida
precisa conter tudo — site e servidor juntos.

Configure a aplicação apontando o **diretório raiz** para **`server`**, com
arquivo de entrada **`server.js`** e comando de início **`npm start`**.

A loja (início, categoria, busca, produto e carrinho) é React + TypeScript,
mas **a hospedagem não precisa compilar nada**: o resultado do
`npm run construir` (`server/js/loja/` e `server/loja-ssr/`) vai no commit.
Antes de subir, rode `cd server && npm run construir && npm run verificar` e
confira que `git status` não mostra arquivos novos em `js/loja/` esquecidos.
Em produção basta `npm install --omit=dev` (React e React DOM estão nas
dependências normais porque o servidor monta o HTML da loja).

---

## 3. Variáveis de ambiente

**Não suba o arquivo `server/.env`** — ele é (e deve continuar) ignorado
pelo git. Cadastre cada variável no painel da Hostinger, na seção de
variáveis de ambiente da aplicação Node.

### As que MUDAM em relação ao seu `.env` local

| Variável | Valor local (hoje) | Valor em produção |
|---|---|---|
| `CLIENT_ORIGIN` | `http://localhost:3333` | `https://seudominio.com.br` |
| `SERVER_PUBLIC_URL` | `https://seu-servidor-em-producao.com` | `https://seudominio.com.br` |
| `PORT` | `3333` | **não cadastre** — a Hostinger injeta a dela |

⚠️ Errar `SERVER_PUBLIC_URL` é o erro mais caro: é nele que o Mercado Pago
chama o webhook para confirmar o pagamento. Se estiver errado, o pedido é
pago mas fica **"pendente" para sempre** no painel, e a cliente não recebe
confirmação.

### As que vão iguais ao local

Copie os valores do seu `server/.env`:

- `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY` — já são de produção (`APP_USR-...`)
- `NODE_ENV=production`
- `ADMIN_EMAIL_HASHES` — quem entra no painel
- `ORIGIN_CEP` — CEP de origem dos envios
- `OWNER_EMAIL`, `OWNER_WHATSAPP_NUMBER` — para onde vão os avisos de venda
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_FROM`

### As que ainda faltam preencher

| Variável | O que fazer |
|---|---|
| `SMTP_PASS` | Senha de app do Gmail (16 letras, sem espaços) em [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) — exige verificação em duas etapas. Sem ela **nenhum e-mail sai**: nem aviso de venda, nem redefinição de senha, nem cupom da newsletter. |
| `MELHOR_ENVIO_TOKEN` | Token de produção em [melhorenvio.com.br/painel/gerenciar/tokens](https://melhorenvio.com.br/painel/gerenciar/tokens). Sem ele **o cálculo de frete não funciona** e ninguém consegue fechar pedido. |
| `MELHOR_ENVIO_BASE_URL` | `https://melhorenvio.com.br` — único valor válido (o sandbox foi descontinuado; apontar para ele faz toda cotação voltar 401). |
| `MELHOR_ENVIO_USER_AGENT` | `Arte Canecas (arte.canecasbsb@gmail.com)` |

---

## 4. HTTPS é obrigatório

Ative o certificado SSL grátis da Hostinger e force HTTPS antes de divulgar
o site.

⚠️ Motivo: com `NODE_ENV=production`, o cookie de sessão sai marcado como
`Secure` e o navegador **só o envia por HTTPS**. Se o site abrir em `http://`
puro, ninguém consegue entrar na conta nem no painel — e não aparece erro
nenhum, o cookie é simplesmente descartado. É um problema que parece um bug
de login e não é.

### 4.1 Cloudflare na frente do site (grátis)

A Cloudflare segura ataques, robôs e picos de acesso antes de chegarem na
Hostinger.

1. Crie a conta em cloudflare.com, adicione o domínio (plano Free) e troque
   os servidores DNS no registro do domínio pelos que a Cloudflare indicar.
2. Deixe o registro do site com a **nuvem laranja (proxy) ligada**.
3. SSL/TLS → modo **Full (strict)**; ative "Always Use HTTPS".
4. Security → ligue o **Bot Fight Mode**.
5. Turnstile → crie um widget para o domínio e cole `TURNSTILE_SITE_KEY` e
   `TURNSTILE_SECRET` na hospedagem.
6. Na hospedagem, `TRUST_PROXY=cloudflare`. Sem isso, os limites de tentativa
   enxergam todo mundo com o mesmo IP (o da Cloudflare).
7. **Não** ligue o CDN da Hostinger junto: dois proxies na frente confundem o
   IP das clientes.

---

## 5. Depois do primeiro deploy

### 5.1 Cadastrar o webhook no Mercado Pago

Em [mercadopago.com.br/developers/panel](https://www.mercadopago.com.br/developers/panel)
→ sua aplicação → **Webhooks**, cadastre:

```
https://seudominio.com.br/api/webhook
```

Marque o evento de **pagamentos**. É essa chamada que confirma o pedido —
a tela de "pagamento aprovado" que a cliente vê é só visual, não confirma
nada sozinha.

### 5.2 Criar a conta de administradora

O painel não tem cadastro próprio. **Antes** de colocar o hash em
`ADMIN_EMAIL_HASHES`, acesse `https://seudominio.com.br/conta.html` e crie a
conta com o e-mail do painel (senha de pelo menos 12 caracteres). Depois
coloque o hash e reinicie.

No primeiro acesso ao painel:

1. O site manda um código de 6 números para o e-mail do painel. Digite-o.
2. Leia o QR Code com o app autenticador (Google Authenticator, Authy ou o
   gerenciador de senhas) e digite o código que aparecer.
3. Guarde os 8 códigos de recuperação **fora do celular** (papel ou
   gerenciador de senhas). São a única saída se o celular sumir.

Daqui em diante o painel só entra com senha + código do app.

### 5.3 Conferir que subiu inteiro

- [ ] Home abre e mostra os produtos
- [ ] Cadastro e login funcionam (se falhar, é o HTTPS do item 4)
- [ ] `/admin.html` abre o painel com a sua conta
- [ ] Frete calcula ao informar um CEP no carrinho
- [ ] `node server/scripts/testar-email.js` (ou um cadastro na newsletter) entrega e-mail

---

## 6. ⚠️ O que NÃO pode se perder entre deploys

Dois caminhos guardam dados que **não estão no git** e não voltam se forem
apagados:

| Caminho | O que é |
|---|---|
| `server/data.db` | Contas das clientes, pedidos, cupons, inscritos na newsletter, mensagens de contato |
| `img/products/` | As fotos dos produtos que você enviou pelo painel |

Antes de qualquer redeploy que reinstale a aplicação do zero, confirme com o
suporte da Hostinger que esses dois caminhos sobrevivem — ou baixe uma cópia
pelo gerenciador de arquivos. O plano tem backup diário, o que ajuda, mas
não substitui conferir antes de mexer.

### 6.1 Backup próprio, criptografado

O backup da Hostinger é do servidor inteiro e você não controla a chave. Para
ter uma cópia sua, criptografada, existe `server/scripts/backup-db.js`.

**Uma vez só**, gere a chave e guarde-a fora do servidor (num gerenciador de
senhas — sem ela o backup não é restaurável):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Cadastre o valor em `BACKUP_ENCRYPTION_KEY` nas variáveis de ambiente da
aplicação (mesmo lugar das outras, item 3).

**Rodar um backup:**

```bash
cd server && node scripts/backup-db.js
```

Ele tira um snapshot consistente (funciona com o site no ar), criptografa em
AES-256-GCM e guarda em `server/backups/data-AAAA-MM-DD-HH-MM-SS.db.enc`,
apagando sozinho o que passar de 30 dias.

⚠️ **Se a hospedagem não tiver cron job** (é o caso do painel novo da
Hostinger, que publica direto do GitHub): não existe onde agendar nada. Use
um serviço externo gratuito (cron-job.org e similares) batendo de 15 em 15
minutos em:

```
https://SEUDOMINIO/api/interno/tarefas-periodicas?token=SEU_CRON_SECRET
```

Ver `CRON_SECRET` em `server/docs/CONFIGURACAO.md`. Sem isso, a fila de e-mail, o lembrete
de carrinho esquecido e as campanhas nunca rodam sozinhos. O backup abaixo
não tem equivalente por HTTP — nessa hospedagem ele precisa ser rodado à
mão por SSH de vez em quando.

**Agendar (cron do hPanel, diário às 3h):**

```
0 3 * * * cd /caminho/para/server && node scripts/backup-db.js
```

O script sai com erro se algo falhar, então preencher o `MAILTO` do cron já
serve de alerta de falha.

**Testar a restauração** (faça isso de vez em quando — backup nunca testado
não é backup). Restaura para um arquivo separado, sem tocar no banco real:

```bash
cd server && node scripts/restore-db.js backups/data-2026-08-21-03-00-00.db.enc
```

Ele descriptografa, roda `PRAGMA integrity_check` e mostra quantas linhas
vieram em `users`/`orders`/`contact_messages`. Se a chave estiver errada ou o
arquivo tiver sido adulterado, ele aborta sem escrever nada.

⚠️ Os `.db.enc` são cópias dos dados das clientes: guarde uma cópia fora do
servidor também. Um backup que mora só na máquina que pode falhar não
protege contra a falha dessa máquina.

### 6.2 Cópia diária automática fora do servidor (Cloudflare R2, grátis até 10 GB)

1. No painel da Cloudflare → R2 → crie um bucket (ex.: `arte-canecas-backup`).
2. R2 → Manage API tokens → crie um token **Object Read & Write só para esse
   bucket** (o site só grava; para restaurar você baixa pelo painel da
   Cloudflare). Se quiser travar de vez, ative as regras de retenção do bucket.
3. Na hospedagem: `BACKUP_S3_URL=https://ID-DA-CONTA.r2.cloudflarestorage.com/arte-canecas-backup`,
   `BACKUP_S3_REGIAO=auto`, `BACKUP_S3_CHAVE_ID`, `BACKUP_S3_CHAVE_SECRETA`
   e a mesma `BACKUP_ENCRYPTION_KEY` do item 6.1.

A rotina de 15 em 15 minutos manda uma cópia por dia. A aba **Segurança** do
painel mostra "Backup diário enviado"; se falhar ou atrasar, chega alerta.
Teste a restauração uma vez antes de lançar (`node server/scripts/restore-db.js`).

### 6.3 Dados pessoais criptografados

Gere `CHAVES_DADOS` (ver `server/docs/CONFIGURACAO.md`) **antes** do primeiro
pedido de verdade e guarde uma cópia fora do servidor. Sem ela, os CPFs,
endereços e telefones guardados não abrem.

---

## 7. Opcional, para o site ficar mais rápido

Nada disso bloqueia a publicação:

- Minificar CSS/JS (`npx clean-css-cli`, `npx terser`)
- Cache da Cloudflare (item 4.1) para imagens, CSS e JS — não ligue também o CDN da Hostinger
