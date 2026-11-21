import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Indicador de dev do Next fica à direita para não cobrir o botão da sidebar recolhida.
  // Na gravação pelo celular (`npm run dev:lan`) ele é escondido para não aparecer no vídeo.
  devIndicators: process.env.MVF_HIDE_DEV_INDICATOR === "true" ? false : { position: "bottom-right" },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // A raiz leva ao Início. Quando houver login, a raiz poderá apontar
  // para a tela de acesso (com verificação no servidor).
  async redirects() {
    return [
      { source: "/", destination: "/inicio", permanent: false },
      { source: "/virais", destination: "/videos-virais", permanent: false },
    ];
  },
};

export default nextConfig;
