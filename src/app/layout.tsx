import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Salvo — Offer Intelligence", description: "Fire the whole list." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
