import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL(".", import.meta.url));

function semMarcasNoCss(): Plugin {
  return {
    name: "sem-marcas-no-css",
    enforce: "post",
    generateBundle(_, pacote) {
      for (const arquivo of Object.values(pacote)) {
        if (arquivo.type === "asset" && arquivo.fileName.endsWith(".css") && typeof arquivo.source === "string") {
          arquivo.source = arquivo.source.replace(/\/\*\$vite\$:\d+\*\//g, "").trimEnd() + "\n";
        }
      }
    },
  };
}

export default defineConfig(({ isSsrBuild }) => ({
  root: raiz,
  publicDir: false,
  plugins: [react(), semMarcasNoCss()],
  base: "/js/loja/",
  build: isSsrBuild
    ? {
        ssr: "src/entrada-servidor.tsx",
        outDir: "../loja-ssr",
        emptyOutDir: true,
        minify: true,
        rollupOptions: { output: { format: "cjs", entryFileNames: "entrada-servidor.cjs" } },
      }
    : {
        outDir: "../js/loja",
        emptyOutDir: true,
        manifest: "manifesto.json",
        cssCodeSplit: false,
        assetsDir: "",
        sourcemap: false,
        rollupOptions: {
          input: "src/entrada-cliente.tsx",
          output: { entryFileNames: "loja-[hash].js", chunkFileNames: "parte-[hash].js", assetFileNames: "[name]-[hash][extname]" },
        },
      },
  ssr: { noExternal: [] },
}));
