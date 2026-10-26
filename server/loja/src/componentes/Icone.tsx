const CAMINHOS = {
  busca: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5",
  whatsapp: "M4 20l1.4-4A8 8 0 1 1 8.2 19zM9 9.5c.3 2.4 2.2 4.6 5 5.3l1-1.3-1.8-1-.8.7c-1-.4-1.8-1.2-2.2-2.2l.7-.8-1-1.8z",
  pessoa: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6",
  sacola: "M5 8h14l-1.2 12H6.2zM9 8V6.5a3 3 0 0 1 6 0V8",
  menu: "M4 7h16M4 12h16M4 17h16",
  menuCurto: "M4 7h16M4 12h16M4 17h10",
  seta: "M6 9l6 6 6-6",
  setaDireita: "M9 6l6 6-6 6",
  setaEsquerda: "M15 6l-6 6 6 6",
  fechar: "M6 6l12 12M18 6L6 18",
  coracao: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  lapis: "M4 20l4-1 11-11-3-3L5 16zM14 6l3 3",
  caminhao: "M3 7h11v9H3zM14 10h4l3 3v3h-7M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4M17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
  cartao: "M3 6h18v12H3zM3 10h18M7 15h3",
  caixas: "M3 8l9-4 9 4-9 4zM3 8v8l9 4 9-4V8M12 12v8",
  relogio: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 8v4l3 2",
  instagram: "M8.5 3.5h7a5 5 0 0 1 5 5v7a5 5 0 0 1-5 5h-7a5 5 0 0 1-5-5v-7a5 5 0 0 1 5-5zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17.2 6.8h.01",
  envio: "M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3",
  foto: "M3 5h18v14H3zM9 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4M21 16l-5-5-8 8",
  lixeira: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  check: "M5 12.5l4.5 4.5L19 7.5",
  alerta: "M12 4l9 16H3zM12 10v4M12 17h.01",
  cadeado: "M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3",
  mais: "M12 5v14M5 12h14",
  menos: "M5 12h14",
  local: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
  presente: "M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0",
  tampa: "M4 12h16M6 12a6 3 0 0 0 12 0M5 12a7 2 0 0 1 14 0",
  buque: "M12 21v-9M12 12l-4-5M12 12l4-5M8 7a2 2 0 1 0 0-.1M16 7a2 2 0 1 0 0-.1M12 6a2 2 0 1 0 0-.1M9 21h6",
  caixaMdf: "M4 9h16v11H4zM3 6h18v3H3zM9 13h6",
  zoomMais: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5M8 11h6M11 8v6",
  zoomMenos: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5M8 11h6",
  calor: "M12 3c2 3-2 4 0 7s-2 4 0 7M7 6c1.5 2.5-1.5 3.5 0 6M17 6c1.5 2.5-1.5 3.5 0 6M5 21h14",
  filtro: "M4 6h16M7 12h10M10 18h4",
  topo: "M6 15l6-6 6 6",
} as const;

export type NomeIcone = keyof typeof CAMINHOS;

export function Icone({ nome, tamanho = 22, traco = 1.7, className }: { nome: NomeIcone; tamanho?: number; traco?: number; className?: string }) {
  return (
    <svg className={className} width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={traco} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={CAMINHOS[nome]} />
    </svg>
  );
}

export function caminhoDoIcone(nome: NomeIcone): string {
  return CAMINHOS[nome];
}
