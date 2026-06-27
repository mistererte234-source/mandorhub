"use client";

export default function GlassLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden">
      {/* Background subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(#00f5ff_0.5px,transparent_1px)] [background-size:30px_30px] opacity-5"></div>

      <div className="relative flex flex-col items-center">
        <div className="w-20 h-20 rounded-3xl border border-[#00f5ff]/30 backdrop-blur-xl bg-black/40 flex items-center justify-center mb-8 shadow-2xl">
          <div className="w-12 h-12 border-4 border-[#00f5ff] border-t-transparent rounded-full animate-spin"></div>
        </div>

        <div className="text-[#00f5ff] font-mono text-sm tracking-[3px] animate-pulse mb-1">
          MANDORHUB OS
        </div>
        <div className="text-white/60 text-xs font-light">
          LOADING DASHBOARD...
        </div>
      </div>
    </div>
  );
}