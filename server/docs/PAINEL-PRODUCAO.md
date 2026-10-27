# Aba Produção do painel

É a primeira aba do painel: a "mesa de trabalho" da Janaina. Mostra só pedidos
**pagos** que ainda não foram entregues.

## Etapas

| Etapa | Quando | Botão que avança |
|---|---|---|
| Aprovar arte | alguma peça tem "quero aprovar a arte pelo WhatsApp" marcado e a arte ainda não foi aprovada | **Cliente aprovou** → `POST /api/admin/orders/:ref/arte-aprovada` (grava `arte_aprovada_em`) |
| Produzir | pago, sem aprovação pendente | **Ficou pronto** → `POST /api/admin/orders/:ref/pronto` (`fulfillment_status = 'pronto'`, grava `pronto_em`) |
| Prontos (envio) | `pronto` e frete pelos Correios/transportadora | **Comprar etiqueta** ou colar o rastreio (rotas que já existiam) → vira `postado` |
| Prontos (retirada) | `pronto` e `shipping.service_id === "retirada"` | **Avisar que está pronto** (WhatsApp com mensagem pronta) e **Cliente retirou** (`PATCH .../delivered`) |
| A caminho | `postado` | **Conferir entrega** / **Marcar entregue** (rotas que já existiam) |
| Entregue | `entregue` | some da aba; continua em "Vendas e pedidos" |

As rotas novas pedem login de admin, verificação em duas etapas e origem do
próprio site (como as outras do painel). Pedido não pago ou já postado
devolve 409.

A etapa é calculada em `lib/etapas-pedido.js` (`etapaDoPedido`), a partir de
`status`, `fulfillment_status` e `arte_aprovada_em`. Pedidos antigos sem as
colunas novas continuam funcionando.

## Prazo

Data limite = dia do pagamento (horário de Brasília) + dias úteis de
produção. O número é o mesmo "Prazo de produção (dias úteis)" da aba
Produtos, que a loja mostra para a cliente; se estiver em branco, o painel usa
**5**. Dias úteis pulam sábado, domingo, feriados nacionais e os móveis
(carnaval, Sexta-feira Santa, Corpus Christi). Feriados só do DF não entram.

A data do pagamento fica em `orders.pago_em` (gravada quando o Mercado Pago
confirma). Pedidos pagos antes desta mudança usam a data de criação.

Selo em cada cartão: **Atrasado X dias** (vermelho), **Vence hoje** /
**Vence amanhã** (amarelo) ou **Faltam X dias**.

## Planilhas e impressão

- **Planilha de produção** (`/api/admin/planilha-producao.xlsx`): uma linha
  por peça dos pedidos em Aprovar arte, Produzir e Prontos, ordenada pelo
  prazo.
- **Planilha de envios** (`/api/admin/planilha-envios.xlsx`): pedidos prontos
  para postar (sem retirada), com endereço completo, CPF e serviço.
- **Lista de postagem**: página para imprimir com os pacotes prontos para
  postar e um quadradinho para marcar na agência.
- **Backup completo** (a planilha antiga com todas as tabelas) foi para
  "Loja e configurações".

## Celular

Abaixo de 1200 px as etapas viram abas com o número de pedidos; a partir de
1200 px aparecem as 4 colunas lado a lado.
