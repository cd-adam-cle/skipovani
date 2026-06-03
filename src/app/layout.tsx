import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kam jedeme? – Skupinový plánovač výletů",
  description: "Rozhodněte se jako parta, kam a kdy jedete.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  );
}
