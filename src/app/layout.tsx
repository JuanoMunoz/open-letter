import type { Metadata, Viewport } from "next";
import { Inter, Caveat, Fraunces, Kalam, Dancing_Script } from "next/font/google";
import "../styles/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", weight: ["500", "600", "700"], display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", weight: ["300", "400", "500"], style: ["normal", "italic"], display: "swap" });
const kalam = Kalam({ subsets: ["latin"], variable: "--font-kalam", weight: ["300", "400", "700"], display: "swap" });
const dancing = Dancing_Script({ subsets: ["latin"], variable: "--font-dancing", weight: ["500", "600", "700"], display: "swap" });

export const metadata: Metadata = {
  title: "openletter — cartas digitales que duran una semana",
  description:
    "Crea una carta digital romántica con formato story, fotos y canción. Disponible 7 días y luego se elimina para siempre.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F4F4F6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
      <html lang="es" className={`${inter.variable} ${caveat.variable} ${fraunces.variable} ${kalam.variable} ${dancing.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
