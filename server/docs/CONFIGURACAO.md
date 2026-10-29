# Variáveis de ambiente (`server/.env`)

Copie `server/.env.example` para `server/.env` e preencha. O `.env` nunca vai
para o git. Em produção, cadastre as mesmas variáveis no painel da hospedagem.
**Nunca cole valores reais no `.env.example`** — se acontecer, revogue e gere
outro na hora.

## Servidor

| Variável | O que é |
|---|---|
| `PORT` | Porta local (padrão 3333). Em produção não cadastre: a hospedagem injeta a dela. |
| `NODE_ENV` | `production` deixa o cookie de sessão `Secure` (só HTTPS). Funciona em `http://localhost`. Em servidor sem HTTPS ninguém consegue entrar. |
| `MAINTENANCE_MODE` | `true` responde 503 com `manutencao.html` em tudo, menos o webhook do Mercado Pago. Precisa reiniciar para valer. |
| `CLIENT_ORIGIN` | Endereço do site liberado no CORS. Local: `http://localhost:3333`. Produção: `https://dominio`. |
| `SERVER_PUBLIC_URL` | URL pública do próprio servidor. É onde o Mercado Pago chama o webhook e para onde voltam os links de pagamento. **Errar isso deixa pedido pago como "pendente" para sempre.** Em desenvolvimento use ngrok. |
| `DB_PATH` | Caminho do banco SQLite (padrão `server/data.db`). Na Hostinger, aponte para uma pasta **fora** de `public_html` (ex.: `/home/USUARIO/dados/data.db`). |
| `TRUST_PROXY` | Quem está na frente do site. `cloudflare` (Cloudflare com proxy laranja ligado + proxy da própria hospedagem), `local` (só proxy da própria máquina, padrão), `false` (nenhum), ou um número (`1` no Render). Errar isso deixa um atacante inventar o IP e furar os limites de tentativa. Confira depois do deploy em `/api/admin/diagnostico-ip`. |

## Mercado Pago

| Variável | O que é |
|---|---|
| `MP_ACCESS_TOKEN` | **Secreta.** Painel do Mercado Pago → Suas integrações → Credenciais. `TEST-...` para testar, `APP_USR-...` em produção. |
| `MP_WEBHOOK_SECRET` | **Secreta, obrigatória em produção.** Painel → Webhooks → Assinatura secreta. Sem ela, em produção, todo aviso de pagamento é recusado (o Mercado Pago tenta de novo depois); com token `APP_USR-` o servidor nem sobe. |
| `MP_WEBHOOK_TOLERANCIA_MIN` | Opcional (padrão 15). Aviso com assinatura mais velha que isso é recusado. `0` desliga a conferência do horário. |

Cadastre o webhook em `https://dominio/api/webhook`, evento **pagamentos**.

## Melhor Envio (frete e etiqueta)

| Variável | O que é |
|---|---|
| `MELHOR_ENVIO_TOKEN` | **Secreta.** melhorenvio.com.br/painel/gerenciar/tokens. Só existe token de produção. Cotar frete não gasta saldo. |
| `MELHOR_ENVIO_BASE_URL` | Sempre `https://melhorenvio.com.br` (o sandbox foi descontinuado e responde 401). |
| `MELHOR_ENVIO_USER_AGENT` | Exigido pela API: `Nome da loja (email de contato)`. |
| `ORIGIN_CEP` | CEP de onde saem os envios, só números. |
| `AUTO_PURCHASE_SHIPPING_LABEL` | `true` compra a etiqueta sozinho quando o pagamento é aprovado (gasta saldo). Deixe `false` até validar. |
| `SELLER_NAME`, `SELLER_PHONE`, `SELLER_EMAIL`, `SELLER_DOCUMENT`, `SELLER_ADDRESS`, `SELLER_NUMBER`, `SELLER_COMPLEMENT`, `SELLER_DISTRICT`, `SELLER_CITY`, `SELLER_STATE` | Remetente da etiqueta. Obrigatórios para gerar etiqueta (manual no painel ou automática). `SELLER_DOCUMENT` é CPF ou CNPJ só com números. |

## WhatsApp (aviso de venda para a lojista)

| Variável | O que é |
|---|---|
| `WHATSAPP_CLOUD_API_TOKEN` | **Secreta.** business.facebook.com → Usuários do sistema → token permanente (o de 24h em developers.facebook.com serve para testar). |
| `WHATSAPP_CLOUD_PHONE_NUMBER_ID` | ID do número que **envia** (developers.facebook.com → app → WhatsApp → Introdução). |
| `WHATSAPP_CLOUD_API_VERSION` | Vazio usa o padrão. |
| `OWNER_WHATSAPP_NUMBER` | Quem **recebe**: DDI + DDD + número, só dígitos (ex.: `5561999990000`). |

A API oficial só entrega texto livre para quem falou com o número nas últimas 24h.

## Instagram (feed da seção "nossa história")

| Variável | O que é |
|---|---|
| `INSTAGRAM_ACCESS_TOKEN` | **Secreta.** Token de longa duração. Preenche uma vez; o servidor renova sozinho e guarda no banco. Sem ele aparece o botão "Seguir no Instagram". Passo a passo em `server/docs/instagram-setup.md`. |
| `INSTAGRAM_MOCK_FEED` | Só desenvolvimento: `true` mostra um feed de exemplo. |

## E-mail (SMTP)

| Variável | O que é |
|---|---|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | Gmail: `smtp.gmail.com`, `587`, `false`. |
| `SMTP_USER` | Conta que envia. |
| `SMTP_PASS` | **Secreta.** Senha de app de 16 letras (myaccount.google.com/apppasswords, exige verificação em duas etapas). Sem ela nenhum e-mail sai. |
| `SMTP_FROM` | Remetente exibido, ex.: `Arte Canecas <conta@gmail.com>`. |
| `OWNER_EMAIL` | Quem recebe o aviso de venda. Também vira o Reply-To dos e-mails para clientes. |

Teste com `node scripts/testar-email.js` e `node scripts/testar-email-cliente.js`.

## Painel administrativo

| Variável | O que é |
|---|---|
| `ADMIN_EMAIL_HASHES` | SHA-256 dos e-mails com acesso, separados por vírgula. Gere com `node -e "console.log(require('crypto').createHash('sha256').update('email@exemplo.com').digest('hex'))"`. |
| `ADMIN_2FA_REQUIRED` | Vazio ou `true` exige o app autenticador no painel. `false` desliga **só fora de produção** (em produção é sempre obrigatório). |
| `ADMIN_2FA_REDEFINIR` | **Só em emergência** (celular perdido e sem códigos de recuperação): o hash do e-mail do painel. Ao reiniciar, o app autenticador daquela conta é zerado, todas as sessões dela caem e chega um alerta. **Tire a variável logo em seguida.** |

⚠️ **Ordem:** crie a conta no site primeiro, depois coloque o hash. Com o hash
configurado, o cadastro recusa esse e-mail. Na primeira vez que a conta entra
no painel, o site manda um **código para o e-mail do painel** antes de mostrar
o QR Code do app autenticador: quem não tem acesso à caixa de entrada não
consegue ativar o painel, mesmo sabendo a senha.

O painel entra **só** com senha + código do app (ou um código de recuperação):
não existe código por e-mail para o painel. Exportar a planilha, baixar o
backup, mexer em cupons, apagar produtos e desconectar todo mundo pedem o
código do app de novo (vale 10 minutos). A sessão do painel cai com 30
minutos parada e dura no máximo 12 horas.

## Entrar com o Google

`GOOGLE_CLIENT_ID` — console.cloud.google.com: criar projeto → Tela de
permissão OAuth (Externo, só escopos email/profile/openid, publicar "Em
produção") → Credenciais → ID do cliente OAuth → Aplicativo da Web → em
"Origens JavaScript autorizadas" o endereço do site com https:// e sem barra.
"URIs de redirecionamento" fica vazio. Não é segredo. Sem ele o botão não aparece.

## Tarefas periódicas (sem cron)

`CRON_SECRET` — **secreta.** Gere com
`node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`.
Um serviço externo (ex.: cron-job.org) chama a cada 15 minutos
`POST https://dominio/api/interno/tarefas-periodicas` com o cabeçalho
`Authorization: Bearer CRON_SECRET`. O jeito antigo (`?token=` na URL) ainda
funciona, mas deixa a chave em registros de acesso: troque.
Sem isso não roda fila de e-mail, lembrete de carrinho esquecido, campanhas
nem confirmação de entrega.

## Backup criptografado

| Variável | O que é |
|---|---|
| `BACKUP_ENCRYPTION_KEY` | **Secreta.** 32 bytes (gere com `randomBytes(32).toString('hex')`). Guarde fora do servidor (gerenciador de senhas): sem ela o backup não restaura. |
| `BACKUP_DIR` | Opcional (padrão `server/backups`), só para o `scripts/backup-db.js` manual. |
| `BACKUP_RETENTION_DAYS` | Opcional (padrão 30). |
| `BACKUP_S3_URL` | Endereço do bucket para a cópia diária fora do servidor. No Cloudflare R2: `https://ID-DA-CONTA.r2.cloudflarestorage.com/NOME-DO-BUCKET`. |
| `BACKUP_S3_REGIAO` | `auto` no R2. |
| `BACKUP_S3_CHAVE_ID`, `BACKUP_S3_CHAVE_SECRETA` | **Secretas.** Token do R2 com permissão **só de escrita** naquele bucket. Assim, mesmo quem invadir o servidor não consegue apagar nem ler os backups antigos. |

Com as quatro preenchidas, a rotina de 15 em 15 minutos manda uma cópia
criptografada por dia. Se falhar ou passar de 26 horas sem backup, chega
alerta. O painel também tem o botão "Baixar backup criptografado".

## Dados pessoais criptografados no banco

`CHAVES_DADOS` — **secreta, obrigatória em produção.** CPF, endereços,
telefone dos pedidos, segredo do app autenticador e token do Instagram ficam
criptografados no banco com essa chave. Formato `id:64-hex`, ex.:
`k1:` seguido de `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
Guarde uma cópia fora do servidor: **sem ela os dados não abrem**.

Para trocar a chave (uma vez por ano, ou se vazar): coloque a nova na frente,
`k2:NOVA,k1:ANTIGA`, reinicie, rode `node scripts/girar-chave-dados.js`, confira
com `node scripts/girar-chave-dados.js --conferir` e só então tire a antiga.

## Proteção contra robôs (Cloudflare Turnstile)

| Variável | O que é |
|---|---|
| `TURNSTILE_SITE_KEY` | Chave pública do widget (painel da Cloudflare → Turnstile). Não é segredo. |
| `TURNSTILE_SECRET` | **Secreta.** Com as duas preenchidas, o cadastro e o "esqueci a senha" pedem a verificação (quase sempre invisível). |

## Fotos enviadas pelas clientes

`COTA_FOTOS_SOLTAS_MB` — opcional (padrão 300). Quanto espaço as fotos ainda
sem pedido podem ocupar. Passou disso, novos envios esperam alguns minutos e
chega um alerta.

## Só para testes

`AUTH_RATE_LIMIT_MAX`, `CAMPANHA_POR_RODADA`, `GOOGLE_TOKENINFO_URL`,
`MP_API_URL` — usados pela suíte de testes; em produção são ignorados.
`MOSTRAR_LINKS_NO_TERMINAL=true` mostra no terminal (só em desenvolvimento e
sem SMTP) os links de redefinição, de troca de e-mail e o código de ativação
do painel.
