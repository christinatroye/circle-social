import type { Metadata } from "next";
import { Cormorant_Garamond, Fraunces, Jost } from "next/font/google";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["300", "400"], variable: "--font-fraunces", display: "swap" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"], style: ["italic"], variable: "--font-cormorant", display: "swap" });
const jost = Jost({ subsets: ["latin"], weight: ["300", "400"], variable: "--font-jost", display: "swap" });

export const metadata: Metadata = { title: "Circle", robots: { index: false, follow: false } };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${cormorant.variable} ${jost.variable}`}>
      <body>{children}</body>
    </html>
  );
}
