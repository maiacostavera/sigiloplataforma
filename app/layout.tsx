import type { Metadata } from "next";
import { cookies } from "next/headers";
import { IBM_Plex_Mono, Instrument_Sans, Newsreader } from "next/font/google";
import "./globals.css";

const ui = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--fuente-ui", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--fuente-mono", display: "swap" });
const doc = Newsreader({ subsets: ["latin"], weight: ["400", "600"], variable: "--fuente-doc", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Sigilo", template: "%s · Sigilo" },
  description: "Cada evidencia, sellada y con fecha.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tema = (await cookies()).get("tema")?.value === "dark" ? "dark" : "light";
  return (
    <html lang="es-AR" data-theme={tema} className={`${ui.variable} ${mono.variable} ${doc.variable}`}>
      <body>{children}</body>
    </html>
  );
}
