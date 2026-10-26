const DO_PAINEL = /^\/api\/products\/photos\/[0-9a-f-]{36}$/;
const LOCAL_JPG = /^\/img\/.+\.jpe?g$/;

export function urlDaFoto(url: string, largura: number): string {
  return DO_PAINEL.test(url) ? `${url}?w=${largura}` : url;
}

export function Foto({ src, alt, larguras = [400, 600], sizes, className, prioridade = false, largura = 600, altura = 750 }: {
  src: string;
  alt: string;
  larguras?: number[];
  sizes: string;
  className?: string;
  prioridade?: boolean;
  largura?: number;
  altura?: number;
}) {
  const carregamento = prioridade ? { fetchPriority: "high" as const } : { loading: "lazy" as const };
  if (DO_PAINEL.test(src)) {
    const srcSet = larguras.map(w => `${src}?w=${w} ${w}w`).join(", ");
    return <img className={className} src={`${src}?w=${larguras[larguras.length - 1]}`} srcSet={srcSet} sizes={sizes} alt={alt} width={largura} height={altura} decoding="async" {...carregamento} />;
  }
  if (LOCAL_JPG.test(src)) {
    return (
      <picture>
        <source type="image/webp" srcSet={src.replace(/\.jpe?g$/, ".webp")} />
        <img className={className} src={src} alt={alt} width={largura} height={altura} decoding="async" {...carregamento} />
      </picture>
    );
  }
  return <img className={className} src={src} alt={alt} width={largura} height={altura} decoding="async" {...carregamento} />;
}
