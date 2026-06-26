"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function SplashScreen() {
  const [show, setShow] = useState(true);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    // Has the splash been shown this session? (optional: use sessionStorage to only show once per tab)
    const hasSeen = sessionStorage.getItem("splash_seen");
    if (hasSeen) {
      setShow(false);
      return;
    }

    // Show for 2 seconds, then start fade out
    const timer1 = setTimeout(() => {
      setFade(true);
    }, 2000);

    // After fade out transition (0.5s), remove from DOM
    const timer2 = setTimeout(() => {
      setShow(false);
      sessionStorage.setItem("splash_seen", "true");
    }, 2500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  if (!show) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-surface flex flex-col items-center justify-center transition-opacity duration-500 ease-in-out ${fade ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <div className="relative w-48 h-48 animate-pulse flex items-center justify-center mb-8">
        <Image 
          src="/logo.png" 
          alt="MandorHub Logo" 
          width={192} 
          height={192} 
          className="object-contain drop-shadow-2xl" 
          priority
        />
      </div>
      
      <div className="flex flex-col items-center animate-intro">
        <h1 className="font-headline-lg-mobile text-3xl font-bold text-primary tracking-tight mb-2">
          MandorHub
        </h1>
        <p className="font-body-md text-on-surface-variant text-sm font-medium">
          Sistem Kontrol Proyek Harian
        </p>
      </div>
      
      <div className="absolute bottom-12 flex items-center gap-2 text-on-surface-variant/50 text-xs font-semibold tracking-wider">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        MEMUAT...
      </div>
    </div>
  );
}
