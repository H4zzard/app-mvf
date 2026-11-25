import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { BRAND } from "@/config/brand";
import "./globals.css";

// Fonte de produto (Inter, licença OFL, servida pelo próprio app via next/font).
// Uma família para tudo: leitura limpa no celular, cara de produto digital.
// Substituir pela fonte oficial da marca quando for entregue com licença.
const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: BRAND.appName,
    template: `%s · ${BRAND.appName}`,
  },
  description: `${BRAND.tagline} — plataforma de ensino e operação para criadoras do TikTok Shop.`,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#F6EFE0",
  // Permite usar env(safe-area-inset-*) no iPhone (notch e barra inferior).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${body.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
