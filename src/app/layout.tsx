import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kdy a kam vyrazíme?",
  description: "Každý vyznačí, kdy má čas — appka ukáže termíny, co se nejvíc překrývají.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  );
}
