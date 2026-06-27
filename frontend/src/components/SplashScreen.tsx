"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function SplashScreen() {
  const [show, setShow] = useState(true);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const hasSeen = sessionStorage.getItem("splash_seen");
    if (hasSeen) {
      setShow(false);
      return;
    }

    // Tampilkan 1.8 detik, lalu fade out
    const timer1 = setTimeout(() => {
      setFade(true);
    }, 1800);

    // Setelah fade selesai, hilangkan dari layar
    const timer2 = setTimeout(() => {
      setShow(false);
      sessionStorage.setItem("splash_seen", "true");
    }, 2400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  if (!show) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center transition-all duration-700 ${fade ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      {/* Background grid subtle */}
      <div className="absolute inset-0 bg-[linear-gradient(#00f5ff_0.5px,transparent_1px)] [background-size:30px_30px] opacity-5"></div>

      <div className="relative flex flex-col items-center">
        {/* Logo dengan glow */}
        <div className="relative w-52 h-52 mb-8 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#00f5ff] rounded-full blur-3xl opacity-10 animate-pulse"></div>
          <Image 
            src="/logo.png" 
            alt="MandorHub Logo" 
            width={180} 
            height={180} 
            className="object-contain drop-shadow-[0_0_40px_#00f5ff] relative z-10" 
            priority
          />
        </div>

        <h1 className="font-bold text-4xl tracking-[-2px] text-white mb-1">MANDORHUB</h1>
        <p className="text-[#00f5ff] font-mono text-sm tracking-[4px] mb-10">OS v0.1 ELITE</p>

        <div className="flex items-center gap-3 text-[#00f5ff]/80 text-sm font-light tracking-widest">
          <div className="w-5 h-5 border-2 border-[#00f5ff] border-t-transparent rounded-full animate-spin"></div>
          INITIALIZING NEXUS...
        </div>
      </div>
    </div>
  );
}