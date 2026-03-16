import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Intranet Nolasco Srl",
  description: "Gestionale Aziendale Nolasco Srl",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="text-[16px] sm:text-[18px]" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased text-slate-800 bg-slate-50 selection:bg-primary/20 selection:text-primary min-h-screen`}
        suppressHydrationWarning
      >
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
