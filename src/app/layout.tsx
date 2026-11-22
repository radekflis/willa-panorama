import { BiomimeticLiquidLayer } from "@/components/biomimetic-liquid-layer";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Willa Panorama — Platforma Nieruchomości 3D & AI",
  description:
    "Sprzedawaj nieruchomości bezpośrednio (0% prowizji) ze spacerem 3D, analizą AI i audytem umów.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body className="antialiased">
        <BiomimeticLiquidLayer />{children}</body>
    </html>
  );
}
