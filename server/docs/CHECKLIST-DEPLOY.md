# Checklist antes de publicar

Nada vai para o ar sem o Caio dizer "pode subir". Antes disso:

## Código

- [ ] `cd server && npm run verificar` passou (sem comentários + todos os testes).
- [ ] `npm run conferir` passou e as capturas em `server/.conferencia/` foram olhadas.
- [ ] `npm run auditar` sem vulnerabilidade moderada ou pior.
- [ ] `npm run seguranca` passou.

## Hospedagem (variáveis)

- [ ] `NODE_ENV=production`, `CLIENT_ORIGIN` e `SERVER_PUBLIC_URL` com `https://` e o domínio certo.
- [ ] `TRUST_PROXY=cloudflare` (Cloudflare com proxy ligado na frente da Hostinger).
- [ ] `MP_ACCESS_TOKEN` de produção **e** `MP_WEBHOOK_SECRET` (o servidor não sobe sem os dois juntos).
- [ ] `CHAVES_DADOS` definida e com cópia guardada fora do servidor.
- [ ] `ADMIN_EMAIL_HASHES` só com quem deve entrar no painel.
- [ ] `BACKUP_ENCRYPTION_KEY` e `BACKUP_S3_*` (chave do bucket só de escrita).
- [ ] `TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET`.
- [ ] `CRON_SECRET` e o cron-job.org chamando com `Authorization: Bearer`.
- [ ] `DB_PATH` fora de `public_html`.
- [ ] Nenhuma variável de teste (`MP_API_URL`, `GOOGLE_TOKENINFO_URL`, `AUTH_RATE_LIMIT_MAX`) e `ADMIN_2FA_REDEFINIR` vazia.

## Depois de subir

- [ ] `https://dominio/api/saude` responde `{"ok":true}` e o UptimeRobot (grátis) está olhando essa rota.
- [ ] No painel, **Loja → Segurança**: aparece "Acesso ao painel liberado" do seu login.
- [ ] `https://dominio/api/admin/diagnostico-ip` mostra o seu IP de verdade; com `curl -H "X-Forwarded-For: 1.2.3.4"` o IP **não** muda.
- [ ] Mercado Pago → Webhooks → "Simular notificação": o site responde 200 e não mexe em pedido nenhum.
- [ ] Um backup chegou no bucket (ou aparece "Backup diário enviado" na aba Segurança).
- [ ] Restaurar um backup de teste numa máquina separada (`node scripts/restore-db.js`) — uma vez antes do lançamento e depois a cada 3 meses.
- [ ] Janaina com o app autenticador ativo e os códigos de recuperação **guardados fora do celular**.
- [ ] Gmail da loja com verificação em duas etapas ou chave de acesso (passkey).

## Voltar atrás

As mudanças no banco só acrescentam colunas e tabelas, então voltar para o
deploy anterior é seguro. Na Hostinger: subir a versão anterior da branch.
