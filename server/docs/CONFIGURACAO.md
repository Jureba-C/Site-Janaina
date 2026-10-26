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
| `DB_PATH` | Opcional. Caminho do banco SQLite (padrão `server/data.db`). |

## Mercado Pago

| Variável | O que é |
|---|---|
| `MP_ACCESS_TOKEN` | **Secreta.** Painel do Mercado Pago → Suas integrações → Credenciais. `TEST-...` para testar, `APP_USR-...` em produção. |
| `MP_WEBHOOK_SECRET` | **Secreta, recomendada.** Painel → Webhooks → Assinatura secreta. Preenchida, o servidor exige e confere o `x-signature` de cada webhook. |

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
| `ADMIN_2FA_REQUIRED` | Vazio ou `true` exige verificação em duas etapas no painel. `false` desliga. |

⚠️ **Ordem:** crie a conta no site primeiro, depois coloque o hash. Com o hash
configurado, o cadastro recusa esse e-mail (senão quem cadastrasse primeiro
viraria admin).

## Entrar com o Google

`GOOGLE_CLIENT_ID` — console.cloud.google.com: criar projeto → Tela de
permissão OAuth (Externo, só escopos email/profile/openid, publicar "Em
produção") → Credenciais → ID do cliente OAuth → Aplicativo da Web → em
"Origens JavaScript autorizadas" o endereço do site com https:// e sem barra.
"URIs de redirecionamento" fica vazio. Não é segredo. Sem ele o botão não aparece.

## Tarefas periódicas (sem cron)

`CRON_SECRET` — **secreta.** Gere com
`node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`.
Um serviço externo (ex.: cron-job.org) chama a cada 15 minutos:
`GET https://dominio/api/interno/tarefas-periodicas?token=CRON_SECRET`.
Sem isso não roda fila de e-mail, lembrete de carrinho esquecido, campanhas
nem confirmação de entrega.

## Backup criptografado

| Variável | O que é |
|---|---|
| `BACKUP_ENCRYPTION_KEY` | **Secreta.** 32 bytes (gere com `randomBytes(32).toString('hex')`). Guarde fora do servidor: sem ela o backup não restaura. |
| `BACKUP_DIR` | Opcional (padrão `server/backups`). |
| `BACKUP_RETENTION_DAYS` | Opcional (padrão 30). |

## Só para testes

`AUTH_RATE_LIMIT_MAX`, `CAMPANHA_POR_RODADA`, `GOOGLE_TOKENINFO_URL` — usados
pela suíte de testes; não cadastre em produção.
