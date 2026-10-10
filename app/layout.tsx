import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ather Africa | Market-entry strategy",
  description:
    "An evidence-led, gated market-entry strategy for Ather Energy in Africa."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
