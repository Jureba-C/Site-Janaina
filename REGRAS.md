# Regras do Caio — ler antes de QUALQUER mudança no código

Este arquivo guarda as instruções que o Caio passou. Ele é carregado junto com
o `CLAUDE.md` em toda sessão. Sempre que o Caio der uma instrução nova que
valha para as próximas vezes, **acrescente aqui** (seção "Instruções
acumuladas"), com a data.

## Antes de mexer

1. Ler este arquivo, o `CLAUDE.md` e o `PLANO.md` (a fase atual e as decisões
   já tomadas).
2. Confirmar em qual fase do plano a mudança entra. Se for decisão de gosto ou
   tiver custo, perguntar antes.

## Durante

3. **Nenhum comentário no código** — JS, HTML, CSS, SQL dentro do JS,
   `.env.example`, `.gitignore`. Explicação vai para os `.md`.
4. Seguir o estilo do código ao redor (nomes em português, sem framework,
   CommonJS no servidor).
5. Deixar o **servidor ao vivo** rodando para o Caio acompanhar:
   `cd server && npm run ao-vivo` (abre `http://localhost:3000` e recarrega
   sozinho a cada arquivo salvo). Na nuvem, mandar as capturas de tela ao
   Caio depois de cada mudança visível.

## Depois de TODA mudança (sem exceção)

6. `cd server && npm run verificar` — sem comentários + todos os testes.
7. `cd server && npm run conferir` — abre o site num navegador de verdade em
   celular 360 e 390, tablet 768, computador 1440 e 1920, com e sem
   animação, e aponta erro de JavaScript, requisição falhando, imagem
   quebrada, rolagem para o lado e carrinho que não funciona. As capturas
   ficam em `server/.conferencia/`.
8. **Olhar as capturas de verdade** antes de dizer que ficou bom.
9. Relatar com honestidade: o que mudou, o que foi testado, o que falhou.
   Só dizer "pronto" quando 6 e 7 passarem.
10. Bug encontrado é corrigido na hora (e ganha teste quando der), mesmo que
    tenha vindo do site da Adriana.

## Sempre

11. Respostas em português (Brasil), curtas, diretas, sem jargão. ⚠️ só no que
    depende do Caio ou da cliente.
12. Nunca pedir nem colar senhas/tokens no chat.
13. Nunca publicar (push na `main`, deploy, variável na hospedagem) sem o
    Caio dizer "pode subir/publicar".
14. Só fotos e artes reais da cliente. Nada de imagem gerada por IA no site.
15. O objetivo é um site **perfeito para mandar à cliente**: parecido com a
    inspiração (aquitemcaneca.com.br) na estrutura e na experiência, com a
    identidade visual da cliente (Instagram @arte.canecasbsb, bio.site/arte.canecas
    e os catálogos dela no Canva). Não copiar logo, artes nem textos da loja de
    inspiração.

## Instruções acumuladas

- 2026-10-26 — O site vende **canecas** (cliente: Janaina, @arte.canecasbsb).
  Inspiração: https://www.aquitemcaneca.com.br/. Identidade: Instagram
  https://www.instagram.com/arte.canecasbsb/, bio https://bio.site/arte.canecas,
  catálogos https://www.canva.com/design/DAGf4OdpSmU/1XzBNdRORWm7AYfimj-8Tw/edit
  e https://www.canva.com/design/DAG8qj64N5I/_z6YjFoJKLnykiw4ps1xDg/edit.
- 2026-10-26 — Pode usar qualquer skill e baixar o que precisar.
- 2026-10-26 — Usar o Claude in Chrome para ver links (só funciona em sessão
  no computador do Caio, com a extensão conectada).
- 2026-10-26 — Sempre deixar um navegador/servidor para o Caio acompanhar as
  mudanças (`npm run ao-vivo`).
- 2026-10-26 — Sempre verificar se não tem nada errado nem bug depois de
  qualquer mudança (itens 6 a 10).
- 2026-10-26 — Trabalho continua numa sessão no Mac do Caio (opção A), com o
  Claude in Chrome para ver Instagram, bio.site, Canva e a inspiração.
- 2026-10-26 — Personalização **com prévia da arte** na caneca.
- 2026-10-26 — **Tirar** a promoção "Leve 4, pague 3" (site, cobrança no
  servidor e testes).
- 2026-10-26 — Pode começar a parte de funcionamento e o catálogo antes da
  identidade visual ser aprovada.
