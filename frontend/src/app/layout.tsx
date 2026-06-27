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
  metadataBase: new URL("https://mandorhub.vercel.app"),
  title: "MandorHub",
  description: "B2B SaaS application for construction management.",
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
            
            {/* Zandev Watermark Footer */}
            <div className="w-full py-8 mt-4 flex justify-center z-0 relative opacity-80 hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-2 font-hacker text-[10px] tracking-widest text-primary/70 uppercase px-5 py-2.5 rounded-full glass-panel border border-primary/20 shadow-[0_0_10px_rgba(0,255,65,0.1)] bg-primary/5 backdrop-blur-sm cursor-default">
                <span>Design x Code by</span> 
                <span className="font-black text-primary glow-text">Zandev</span>
              </div>
            </div>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
