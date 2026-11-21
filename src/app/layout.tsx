import type { Metadata, Viewport } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { BRAND } from "@/config/brand";
import "./globals.css";

// Fontes provisórias (Google Fonts, licença OFL). Substituir pelas fontes
// oficiais da marca quando forem fornecidas com licença.
const display = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = DM_Sans({
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
  themeColor: "#FAF6F5",
  // Permite usar env(safe-area-inset-*) no iPhone (notch e barra inferior).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
