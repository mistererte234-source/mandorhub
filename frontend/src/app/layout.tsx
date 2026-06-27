import type { Metadata } from "next";
import { Inter, Space_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MandorHub",
  description: "B2B SaaS application for construction management.",
  openGraph: {
    images: ["/og-image.png"],
  },
};

import SpyTracker from "@/components/SpyTracker";
import ThemeProvider from "@/components/ThemeProvider";
import SplashScreen from "@/components/SplashScreen";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${inter.variable} ${spaceMono.variable} antialiased bg-background text-on-background min-h-screen pb-[80px] md:pb-0 relative flex justify-center`}
      >
        <div className="w-full max-w-[1200px] min-h-screen relative shadow-2xl">
          <ThemeProvider>
            <SplashScreen />
            <SpyTracker />
            {children}
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
