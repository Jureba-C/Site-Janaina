# Design aprovado para construir — Arte Canecas

Fonte: canvas no Claude Design "Arte Canecas — Loja"
(https://claude.ai/artifact/WffqjbpiTy843A5wjSuR6b), feito em 2026-10-26 com a
estrutura da Aqui Tem Caneca e a identidade da @arte.canecasbsb. Três telas:
**Início — computador**, **Produto com prévia da arte — computador** (interativa:
cor, nome, frase, estilo da letra, arte, frente/verso, tampa, quantidade) e
**Início — celular**. Abrir o link antes de construir e copiar medidas, ordem
das seções e textos de lá. Se o Caio mudar algo no canvas, o canvas vale mais
que este arquivo.

## Cores (variáveis no `:root` de `css/style.css` e `CORES` em `lib/email.js`)

| Variável | Hex | Uso |
|---|---|---|
| `--papel` | `#FBF8F3` | fundo do site |
| `--papel-2` | `#F2EBE2` | busca, fundo de foto |
| `--borda` | `#EADFD3` | linhas e bordas de cartão |
| `--borda-forte` | `#D9CBBB` | campos e botões vazados |
| `--terracota` | `#CD7031` | logo, ícones grandes (só texto ≥ 24 px) |
| `--terracota-forte` | `#9E4A18` | botões, preços, links, faixa do topo (escurecido de `#A9521D` para o branco por cima passar 4.5:1 em todos os tamanhos) |
| `--terracota-rodape` | `#9A4717` | rodapé em onda (escurecido de `#B65E27` pelo contraste do texto branco) |
| `--caramelo` | `#D4935E` | faixa arredondada atrás das fotos (marca do catálogo) |
| `--rosa` | `#DFA1AC` | palavra "Canecas" do logo (decorativo) |
| `--rosa-claro` | `#F6E1DE` | destaque do topo, faixa Ipês, fundo de ícones |
| `--tinta` | `#323230` | texto |
| `--tinta-suave` | `#6B6259` | texto secundário (passa 4.5:1 no papel) |
| `--whatsapp` | `#2F6B4F` | botão de WhatsApp |

## Letras (servidas pelo próprio site, woff2 com subconjunto latino)

- **Fraunces** variável com eixo `SOFT` 100 (títulos, preços, logo). Pesos 500–800.
- **Josefin Sans** 300–700 (menu, botões, rótulos, texto corrido 16 px).
- **Allura** (frases à mão: "personalizados", "feito com carinho", "brasiliense de coração").
- Sai: Poppins e Caveat (se nada mais usar).

## Elementos da marca

- Logo em texto + caneca em linha com florzinha (SVG próprio) até a Janaina mandar o arquivo.
- Florzinha de 5 pétalas em linha no lugar do laço `#bow-shape`.
- Faixa caramelo arredondada (pílula) atrás das fotos de destaque.
- Fotos em "polaroid" com pedaço de fita crepe (rotação leve, alternada).
- Selo circular girando o texto "FRASE PODE SER PERSONALIZADA •".
- Rodapé com borda de onda em terracota.
- Molduras em arco (`border-radius: 999px 999px 20px 20px`) na coleção Ipês.
- Cantos: cartões 24–32 px, botões em pílula, alvos de toque ≥ 44 px.

## Seções da home (nesta ordem)

1. Faixa do topo: desconto no Pix · personalização inclusa · envio para todo o Brasil.
2. Cabeçalho: busca (esq.), logo (centro), atendimento WhatsApp, entrar, carrinho.
3. Menu de categorias com submenu (computador) e gaveta + chips roláveis (celular).
4. Destaque em carrossel (trocado no painel em "Fotos do topo").
5. Faixa de vantagens (4 itens).
6. "Escolha pelo tipo": polaroids com fita.
7. "Para cada momento": círculos por ocasião.
8. Vitrine com abas (Mais pedidas, Novidades, Casamento, Coleção Brasília).
9. "Veja como fica antes de comprar" (chamada para a prévia).
10. Coleção Ipês Brasília (faixa rosa-claro).
11. Casamentos e padrinhos / Brindes para empresas (orçamento no WhatsApp).
12. Instagram @arte.canecasbsb.
13. Rodapé em onda + botão flutuante de WhatsApp.

## Fotos

As do canvas são recortes de baixa resolução dos catálogos e do Instagram, só
para o desenho. No site entram as fotos originais da Janaina (⚠️ pedir em
boa resolução, sem texto por cima).
