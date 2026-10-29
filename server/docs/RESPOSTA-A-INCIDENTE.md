# O que fazer se algo der errado

Para qualquer alerta grave (e-mail "⚠️ ..." ou WhatsApp) ou suspeita de invasão.

## 1. Conter (primeiros 15 minutos)

1. No painel, **Loja → Segurança → Desconectar todo mundo**. Sem acesso ao painel: `npm run derrubar-sessoes` no servidor.
2. Se a suspeita for no painel: trocar a senha da Janaina e, se o celular sumiu, colocar `ADMIN_2FA_REDEFINIR` na hospedagem, reiniciar, cadastrar o app de novo e **tirar a variável**.
3. Se o site estiver sendo usado para algo errado: `MAINTENANCE_MODE=true` e reiniciar (o webhook do Mercado Pago continua funcionando).

## 2. Trocar os segredos que podem ter vazado

Na ordem: senha do e-mail da loja e `SMTP_PASS` → `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SECRET` (painel do Mercado Pago) → `MELHOR_ENVIO_TOKEN` → `CRON_SECRET` → token do WhatsApp e do Instagram → `TURNSTILE_SECRET` → chave do bucket de backup → `CHAVES_DADOS` (com `npm run girar-chave-dados`, ver `CONFIGURACAO.md`).

## 3. Guardar as provas

- Baixar o backup criptografado pelo painel (ou copiar o arquivo do banco) **antes** de mexer em mais nada.
- Anotar horários e copiar a aba Segurança (eventos ficam 180 dias).
- Guardar os registros da hospedagem e da Cloudflare do período.

## 4. Avisar

- Se dados de clientes podem ter sido vistos por outra pessoa, a LGPD pede aviso à ANPD e às clientes afetadas em **3 dias úteis** (Resolução CD/ANPD nº 15/2024). Formulário em gov.br/anpd.
- Pagamento estranho: falar com o Mercado Pago pelo painel.

## 5. Depois

- Descobrir por onde entrou e corrigir (com teste novo).
- Registrar o que aconteceu numa nova "Rodada" em `SECURITY-AUDIT.md`.
