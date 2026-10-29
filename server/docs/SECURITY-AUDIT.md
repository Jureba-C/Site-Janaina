# Auditoria de segurança e performance — Arte Canecas

Auditoria do código enviado (`index.html`, `css/style.css`, `js/main.js`) e
do que foi adicionado nesta rodada (carrinho + checkout).

## Achados e correções

### 🔴 Crítico — Access Token do Mercado Pago nunca pode ir ao front-end
O pedido original era "integrar o SDK oficial... indique onde inserir meu
Access Token". Colocar o Access Token em qualquer arquivo servido ao
navegador (HTML/CSS/JS) o expõe publicamente — qualquer visitante pode
copiá-lo pelo "Ver código-fonte" e usá-lo para criar cobranças na sua conta
ou consultar seus pagamentos.
**Correção aplicada:** criado `server/server.js`, um back-end mínimo que
guarda o Access Token em `server/.env` (fora do código versionado) e é o
único responsável por falar com a API do Mercado Pago. O front-end só chama
o seu próprio back-end (`/api/create-preference`) e nunca vê o token.

### 🔴 Crítico — manipulação de preço pelo cliente
Um carrinho que envia `{ id, preço, quantidade }` para o servidor confia no
preço que o próprio navegador informou — que pode ser editado no DevTools
antes de enviar.
**Correção aplicada:** o front-end envia só `{ id, qty }`. O backend
(`server/server.js`) busca o preço de verdade em `PRODUCTS` (um catálogo só
dele) antes de criar a preferência de pagamento. Mesma lógica se aplica ao
`localStorage` do carrinho: ele guarda apenas `id`/`qty`, nunca preço.

### 🟠 Médio — XSS potencial se o catálogo passar a vir de fora
Hoje os produtos são um array fixo no próprio `main.js` (risco baixo). Mas
o código montava HTML com template strings (`innerHTML = ...${p.name}...`)
sem escapar nada — se amanhã o nome/descrição do produto vier de um
formulário, banco de dados ou CMS, um valor como
`<img src=x onerror=alert(1)>` seria executado como código na página de
todo mundo que visse aquele produto.
**Correção aplicada:** toda inserção de texto dinâmico (nome, categoria,
badge, descrição, itens do carrinho) agora passa por `escapeHTML()` antes de
entrar no `innerHTML`.

### 🟠 Médio — confiar apenas em validação no navegador
Os formulários de contato e newsletter só validavam com `required`/regex no
JavaScript do navegador — o que é só conveniência de UX, não é proteção
real, porque dá para chamar a API diretamente (curl/Postman) ignorando o
HTML por completo.
**Correção aplicada:** `server/server.js` traz rotas de exemplo
(`/api/contact`, `/api/newsletter`) que validam e limitam o tamanho dos
campos de novo no servidor, além de *rate limiting* (`express-rate-limit`)
para dificultar spam/força bruta.

### 🟡 Baixo — falta de cabeçalhos de segurança HTTP
O site não define `Content-Security-Policy` nem cabeçalhos correlatos, o que
facilita a execução de scripts injetados caso surja alguma outra falha de
XSS no futuro, e não define proteções básicas como `X-Content-Type-Options`.
**Correção aplicada:** adicionada uma CSP via `<meta>` no `index.html`
(camada extra, restringe de onde scripts/imagens/estilos podem carregar) e
`helmet()` no back-end (define os cabeçalhos de segurança no servidor, que é
o lugar correto/mais forte para isso — uma `<meta>` no HTML não cobre tudo
que um cabeçalho HTTP cobre).

### 🟡 Baixo — CORS aberto por padrão em uma futura API
Como não havia back-end antes, não havia CORS configurado. Ao adicionar um,
o risco de deixá-lo aberto (`*`) é qualquer site na internet poder chamar
sua API de criação de pagamentos.
**Correção aplicada:** `cors({ origin: CLIENT_ORIGIN })` — só o domínio do
seu próprio site (configurado no `.env`) pode chamar a API.

### 🟡 Baixo — dados corrompidos no `localStorage`
O carrinho lê do `localStorage`, que pode ser editado manualmente pelo
usuário (ou corrompido). Um `JSON.parse` sem tratamento quebraria a página.
**Correção aplicada:** leitura do carrinho é validada item a item
(`Number.isInteger`, limites de quantidade 1–10) dentro de um `try/catch`,
descartando qualquer entrada inválida em vez de travar a página.

### ℹ️ Sobre "SQL Injection"
O projeto não usa banco de dados (o `console.log` nos formulários é só um
placeholder). Não há, portanto, superfície de SQL Injection hoje. Se/quando
um banco for adicionado, a recomendação é sempre usar consultas
parametrizadas (ex.: `db.query("... WHERE id = $1", [id])`) e nunca montar
SQL por concatenação de strings — isso já está anotado como `TODO` nos
pontos do `server.js` onde dados de formulário seriam persistidos.

## Performance — resumo
Ver `README.md`, seção 5, para a lista completa. Em resumo: imagens com
`lazy loading`/dimensões fixas, scripts com `defer`, `preconnect` de fontes,
scroll throttled com `requestAnimationFrame`, e recomendações de minificação
para o momento do deploy (não executadas aqui por dependerem do seu pipeline
de build).

## Rodada 2 — Auditoria de segurança, autenticação e performance (2026-08-09)

Escopo desta rodada: auditoria geral, implementação de login/cadastro com
histórico de pedidos, e otimização do carrinho/checkout.

### 🔴 Crítico — Access Token de produção do Mercado Pago exposto em texto puro
`server/.env.example` (arquivo pensado para ficar versionado no git, como
modelo) continha um Access Token real (`APP_USR-...`, de **produção**) e a
Public Key, em vez de placeholders.
**Correção aplicada:** valores trocados por placeholders. O arquivo ainda
não tinha sido commitado (só estava em *staging* local), mas, por
precaução, a orientação é tratar esse token como comprometido e
**gerar um novo no painel do Mercado Pago** antes de usar em produção —
qualquer texto que passou por um arquivo de exemplo, mesmo sem chegar a um
repositório remoto, deve ser considerado exposto.

### 🔴 Crítico — `.env` sem proteção real do `.gitignore`
A pasta `server/` não tinha nenhum `.gitignore` (apesar dos comentários no
código dizerem "`.env` já está no `.gitignore`") — ou seja, um `.env` real
criado ali *seria* commitado por engano no primeiro `git add`.
**Correção aplicada:** criado `server/.gitignore` cobrindo `.env`,
`node_modules/`, o banco de dados local (`*.db*`) e `.DS_Store` (que já
estava indo para o commit).

### 🟠 Alto — sessão de login teria que evitar token acessível por JavaScript
Ao implementar contas de cliente, a escolha de guardar o token de sessão em
`localStorage`/JWT no navegador foi descartada de propósito: qualquer XSS
(mesmo um futuro, ainda não descoberto) conseguiria ler esse token e
sequestrar a sessão.
**Decisão aplicada:** sessão por cookie `httpOnly` (`server/lib/auth.js`) — o
JavaScript da página nunca tem acesso a ele, só o navegador, que o envia
sozinho nas requisições. O token em si é aleatório
(`crypto.randomBytes(32)`) e só o **hash SHA-256** dele fica salvo no banco
— um vazamento do arquivo do banco não permite reconstruir sessões válidas.

### 🟠 Alto — mitigação de enumeração de contas e força bruta no login
**Corrigido/adicionado:** mensagens de erro genéricas ("e-mail ou senha
inválidos") tanto para e-mail inexistente quanto para senha errada, com uma
comparação de hash sempre executada (mesmo sem usuário encontrado) para não
vazar a diferença pelo tempo de resposta; limite de 10 tentativas/15min nas
rotas `/api/auth/login` e `/api/auth/register` (`authLimiter`, mais rígido
que o limite geral da API).

### 🟠 Médio — servir o site pelo mesmo servidor sem vazar o código do back-end
Ao passar a servir `index.html`/`css`/`js` pelo próprio `server.js` (ver
"Correção de bug" abaixo), servir a pasta raiz do projeto de forma ingênua
exporia também `server/server.js`, `server/package.json` etc. por HTTP.
**Correção aplicada:** allowlist explícita (`PUBLIC_TOP_LEVEL`) — só os
arquivos/pastas do site ficam acessíveis; qualquer outro caminho (inclusive
`/server/...`) devolve 404.

### 🟠 Médio — CSP do `helmet()` bloquearia o próprio site
`helmet()` sem configuração aplica uma CSP padrão restritiva
(`default-src 'self'` sem as exceções do site). Como o servidor passou a
servir o HTML também, essa CSP entraria em vigor de verdade (antes só
afetava respostas JSON da API) e bloquearia o Bootstrap/ícones/fontes via
CDN e as imagens do Picsum.
**Correção aplicada:** CSP do `helmet()` configurada explicitamente,
espelhando as mesmas origens já liberadas na `<meta>` de `index.html`.

### 🟢 Correção de bug — chamadas à API não alcançavam o servidor
O front-end sempre chamou `/api/...` com caminho relativo, mas o guia
original mandava abrir o site em `localhost:5500` (Live Server) com a API
em `localhost:3333` — origens diferentes, então essas chamadas nunca
chegariam ao back-end (nem o carrinho, nem o frete, nem o pagamento
funcionariam de fato fora de um proxy manual).
**Correção aplicada:** `server.js` agora também serve os arquivos do site
(seção 3 do README) — mesma origem para tudo, o que também é pré-requisito
para o cookie de sessão de login funcionar sem configuração extra de CORS.

### 🟡 Baixo — validação de entrada nas novas rotas
Nome, e-mail e senha das rotas de cadastro/login são validados no servidor
(tamanho, formato) independentemente do que o formulário HTML já valida —
mesma lógica já usada em `/api/contact`/`/api/newsletter`. Todo texto
dinâmico nas novas páginas (`conta.html`, `pedidos.html`) passa por
`escapeHTML()` antes de entrar em `innerHTML`, incluindo nome do cliente e
nomes de produtos no histórico de pedidos.

### ℹ️ Sobre SQL Injection (atualização)
A rodada anterior não usava banco de dados. Agora usa (`node:sqlite`, para
usuários/sessões/pedidos) — todas as consultas usam parâmetros (`?`) via
`db.prepare(...)`, nunca concatenação de string. Ver `server/lib/db.js`.

### Cupom de desconto — mesmo princípio do preço/frete
O desconto de um cupom (`COUPONS` em `server.js`) é sempre calculado no
servidor a partir do subtotal real; o front-end nunca envia (nem o servidor
aceita) um valor de desconto vindo do navegador.

### Vulnerabilidade de terceiro conhecida (não corrigida nesta rodada)
`npm audit` acusa uma vulnerabilidade moderada na dependência `uuid`,
puxada transitivamente pelo SDK `mercadopago` (versões 1.x–3.x). A correção
automática (`npm audit fix --force`) instalaria `mercadopago@3.3.0`, uma
mudança de versão maior — não aplicada aqui por não ser possível testar a
integração real com o Mercado Pago neste ambiente. Recomenda-se testar essa
atualização isoladamente (com credencial de teste) antes de subir para
produção.

## Rodada 3 — CSRF explícito (2026-08-09)

Reforço pedido especificamente para a proteção CSRF nas rotas de
autenticação/checkout. A rodada 2 já mitigava isso de forma implícita
(cookie `SameSite=Lax` + CORS restrito à origem do site); esta rodada
adiciona uma camada explícita e independente:

### 🟢 Reforço — checagem de `Origin` em toda escrita da API
**Adicionado:** `verifyOrigin` em `server/server.js`, aplicado a todo
`POST`/`PUT`/`DELETE` sob `/api` (exceto `/api/webhook`, chamado pelo
servidor do Mercado Pago, não por um navegador). Navegadores sempre enviam
o header `Origin` em requisições não seguras, mesmo same-origin; se vier
ausente ou de outro domínio, a requisição é recusada com 403 — bloqueia
tanto um formulário/fetch hospedado em outro site quanto chamadas diretas
que não passam por um navegador apontando para o próprio front-end.
Testado (curl sem `Origin` → 403; com `Origin` de outro domínio → 403; com
`Origin` correto → segue normalmente; fluxo real de cadastro/login pelo
navegador → funciona sem nenhuma mudança perceptível, confirmando que a
checagem não quebra o uso legítimo).

## O que **não** foi feito nesta rodada (e por quê)
- **Rodar `npm install` de fato / testar a chamada real ao Mercado Pago**:
  este ambiente não tem acesso à internet para instalar pacotes ou chamar
  APIs externas — o código foi escrito seguindo a documentação oficial do
  SDK, mas recomendo testar localmente com uma credencial de **teste**
  antes de usar a de produção.
- **Banco de dados / persistência de pedidos**: fora do escopo pedido;
  pontos de extensão marcados com `TODO` em `server.js`.
- **Cálculo automático de frete**: não solicitado explicitamente; hoje o
  carrinho informa que o frete é calculado na etapa de pagamento.

## Rodada de 27/10/2026 — loja de canecas (do site inteiro até o pagamento)

O que já estava certo e foi conferido: preço sempre calculado no servidor
(inclusive variações, adicionais e personalização), origem conferida em toda
chamada que muda dado (`verifyOrigin`), limites de tentativas por rota, senha
com bcrypt e bloqueio após 5 erros, cookie de sessão `httpOnly` + `SameSite`
+ `Secure`, painel só com verificação em duas etapas, fotos validadas pelo
`sharp` (não pelo nome do arquivo), CSP sem script em linha, `npm audit` sem
nenhuma vulnerabilidade.

O que mudou nesta rodada:

- **Pagamento confirmado só se o valor bate.** O webhook já consultava o
  pagamento direto no Mercado Pago; agora também confere moeda (BRL) e valor
  contra o total do pedido. Se não bater, o pedido fica "em análise" e nada é
  liberado (`lib/pagamento.js`, testes em `test/pagamento.test.js`). Isso
  também cobre um Pix antigo pago depois de a cliente retomar o pagamento com
  valor novo: a Janaina confere no painel.
- **Webhook aceita só id numérico** antes de consultar o Mercado Pago.
- **CSP mais fechada:** saíram `sdk.mercadopago.com` e `api.mercadopago.com`
  (o site não usa o SDK; o Checkout Pro é um redirecionamento) e o
  `frame-src` do Mercado Pago. `frame-ancestors 'none'`: nenhum site pode
  embutir a loja num iframe (proteção contra clique sequestrado).
- **Sessão do painel expira em 12 horas**, mesmo com o cookie valendo 7 dias
  para clientes.
- **Código do app autenticador vale só a janela atual ±30 s** (antes ±2 min).
- **Ativar/trocar a verificação em duas etapas** passou a ter limite de
  tentativas.
- **Fotos de personalização:** limite de 40 envios a cada 15 minutos por
  endereço; a prévia e a arte do painel só usam fotos ligadas àquele pedido.

Pendências que dependem da hospedagem (⚠️ Caio):

- Preencher `MP_WEBHOOK_SECRET` (sem ele o webhook não confere a assinatura;
  o valor ainda é conferido no Mercado Pago, mas a assinatura fecha a porta).
- Site só em HTTPS (o `Strict-Transport-Security` já vai no cabeçalho).
- `ADMIN_EMAIL_HASHES` só com o e-mail da Janaina (e o do Caio, se quiser).

## Rodada de 29/10/2026 — plano completo de segurança

Três auditorias (login e painel; pagamentos e entradas; servidor, dados e
LGPD) acharam furos reais. Tudo abaixo tem teste em `test/seguranca-*.test.js`
(`npm run seguranca`).

### Dinheiro

- **Máquina de estados do pedido** (`lib/estado-do-pedido.js`). Antes o
  webhook sobrescrevia o status: um Pix antigo que vencia cancelava um pedido
  já pago, e a aprovação seguinte repetia e-mails, WhatsApp e podia comprar
  etiqueta de novo. Agora: pedido pago nunca volta; pagamento mais antigo não
  muda o pedido; toda gravação é condicional ao status atual
  (`trocarStatusDoPedido`); efeitos, produção e etiqueta rodam uma vez só
  (`reservarEfeitosDoPagamento`, `reservarEtiqueta`); todo pagamento recebido
  fica em `pagamentos_mp`; pedido que já recebeu pagamento não pode ser
  apagado (os outros são arquivados).
- **Webhook autêntico:** sem `MP_WEBHOOK_SECRET`, em produção, todo aviso é
  recusado (503, o Mercado Pago tenta de novo); assinatura com mais de 15 min
  é recusada; o servidor nem sobe com token `APP_USR-` sem o segredo.
- **Pedido com desconto do Pix só aprova se o pagamento foi Pix.**
- **Pix vence em 60 min** e "continuar pagamento" cancela o Pix anterior.
- **Cupom de uso único reservado na hora** (`cupons_reservados`, sem `await`
  entre conferir e reservar): duas compras ao mesmo tempo não levam o
  desconto duas vezes. Liberado quando o pagamento cai; alerta se repetir.
- **Cupom de aniversário:** a data só é cadastrada uma vez e o cupom só vale
  30 dias depois de cadastrada (antes dava para trocar a data para hoje).

### Painel e contas

- **Painel só com o app autenticador.** O código por e-mail deixou de valer
  para o painel: antes, quem tivesse a caixa de e-mail fazia "esqueci a
  senha" e recebia o código no mesmo lugar.
- A sessão guarda a **prova do 2FA** (`sessions.segundo_fator_em`); o mesmo
  código do app não vale duas vezes; código de recuperação vale uma vez só,
  mesmo em duas abas ao mesmo tempo.
- O segredo do app é gerado e **guardado no servidor**; trocar o app pede
  senha + código atual e fica travado 24 h depois de redefinir a senha.
- Primeira ativação do painel pede **código enviado ao e-mail do painel**.
- **Confirmar de novo** (código do app, vale 10 min) para exportar, baixar
  backup, cupons, campanhas, apagar, reconectar Instagram, etiqueta repetida
  e desconectar todo mundo (`ROTAS_SENSIVEIS`, teste estático).
- Sessão do painel cai com **30 min parada**, dura 12 h; cookie
  `__Host-plc_session` em produção; no máximo 10 sessões por pessoa; lista de
  aparelhos em Minha conta.
- **Limite por conta** somando todos os IPs (fica lenta, não trava) e limites
  separados para login, cadastro, esqueci a senha e 2FA.
- **Senha:** mínimo 10 (12 no painel), sem senhas comuns, sequências, o
  e-mail ou o nome da loja (`lib/senhas.js`).
- Redefinir a senha avisa por e-mail (e alerta, se for o painel); trocar
  senha, e-mail ou 2FA cancela links pendentes; troca de e-mail só vale
  depois de confirmar pelo link no endereço novo.
- **Google:** nonce de uso único (token capturado não serve de novo).
- **IP verdadeiro** (`lib/ambiente.js`, `TRUST_PROXY`): com Cloudflare, só
  vale o IP que veio dela; sem proxy, `X-Forwarded-For` é ignorado.

### Dados

- **Criptografia no banco** (`lib/cofre.js`, AES-256-GCM, `CHAVES_DADOS`):
  CPF, endereços, telefone dos pedidos (com índice cego para o cupom),
  segredo do 2FA e token do Instagram. A leitura passa por uma camada única em
  `lib/db.js`, então o resto do site não mudou. Troca de chave com
  `scripts/girar-chave-dados.js`. Protege contra vazamento do arquivo do
  banco e de backups; não protege contra quem tomar o servidor inteiro.
- **Backup diário fora do servidor** (`lib/backup-remoto.js`, S3/R2,
  assinatura SigV4 própria conferida com o exemplo oficial da AWS), alerta se
  falhar ou atrasar.
- **Registro sem dado pessoal** (`lib/registro.js`): e-mail mascarado, erro
  resumido sem o corpo da requisição, link de redefinição nunca em produção.
- **Fotos:** só JPG/PNG/WEBP/HEIC, até 40 MP, 2 processando por vez, 10 a cada
  15 min e 40 por dia por IP, cota de fotos soltas, limpeza automática.
- **Endereço** com campos fixos, sem quebra de linha (antes dava para forjar
  linhas na mensagem de WhatsApp da lojista), UF e telefone conferidos.
- **LGPD:** excluir a conta tira o e-mail de todos os pedidos e apaga a fila
  de e-mails; texto de e-mails enviados some em 30 dias; planilha completa com
  CPF mascarado; registros guardados 180 dias (Marco Civil); política
  reescrita com bases legais, transferência internacional e direitos.

### Monitoramento

- `eventos_seguranca` + aba **Segurança** no painel; alertas por e-mail (um
  por janela, `idx_outbox_unico`) e WhatsApp nos graves.
- `/api/saude` para monitor externo; erros inesperados viram evento.
- CSP mais rígida em **modo de teste** (`Content-Security-Policy-Report-Only`)
  com relatórios em `/api/csp-relatorio`. Depois de uma semana sem relatórios
  estranhos na aba Segurança, trocar a CSP do helmet pela `CSP_EM_TESTE`.
- HSTS só em produção e sem `preload` até o domínio ser definitivo.
- Turnstile da Cloudflare no cadastro e no "esqueci a senha".

### Decisões que ficaram como estavam (e por quê)

- **Cadastro diz "já existe uma conta com este e-mail".** Esconder isso
  obrigaria toda cliente nova a confirmar o e-mail antes de comprar. O risco
  (saber se um e-mail tem conta) é baixo e o limite de cadastro por IP + o
  Turnstile seguram robôs.
- **Link do carrinho esquecido não pede login:** ele vem no e-mail da própria
  cliente, com referência impossível de adivinhar; pedir login atrapalharia
  justamente quem esqueceu o carrinho.
- **Chave da foto continua no pedido salvo:** tirar exigiria mudar a
  validação compartilhada com a loja; quem lê o banco já veria a foto.
- **Frete grátis antes do cupom e cupom da newsletter na hora:** regras de
  negócio, ⚠️ Janaina decide.
