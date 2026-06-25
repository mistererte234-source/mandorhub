import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MandorHub",
  description: "B2B SaaS application for construction management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${inter.variable} antialiased bg-background text-on-background min-h-screen pb-[80px] md:max-w-md md:mx-auto md:shadow-2xl md:border md:border-surface-variant relative`}
      >
        {children}
      </body>
    </html>
  );
}
