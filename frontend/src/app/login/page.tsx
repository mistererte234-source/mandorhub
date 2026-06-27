"use client";

import { useState } from "react";
import { fetchApi, setToken } from "@/lib/api";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { HardHat, ArrowRight, Loader2, ShieldAlert } from "lucide-react";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp" | "admin">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tapCount, setTapCount] = useState(0);
  const [adminPassword, setAdminPassword] = useState("");
  const router = useRouter();

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // For dev env, backend returns dev_code directly so we can auto-fill it
      const res = await fetchApi("/auth/request-otp", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      setStep("otp");
      if (res.dev_code) {
        setCode(res.dev_code); // auto-fill for developer convenience
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetchApi("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone, code }),
      });
      setToken(res.access_token);
      if (res.user.role === "contractor") {
        router.push("/kontraktor");
      } else if (res.user.role === "bendahara") {
        router.push("/bendahara");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loginAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetchApi("/auth/login-admin", {
        method: "POST",
        body: JSON.stringify({ password: adminPassword }),
      });
      setToken(res.access_token);
      router.push("/admin");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoClick = () => {
    if (step === "admin") return;
    const newCount = tapCount + 1;
    if (newCount >= 7) {
      setStep("admin");
      setTapCount(0);
    } else {
      setTapCount(newCount);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center px-6 py-12 bg-surface">
      <div className="w-full flex flex-col items-center mb-10">
        <div 
          onClick={handleLogoClick}
          className="w-48 h-48 flex items-center justify-center mb-4 cursor-pointer select-none active:scale-95 transition-transform animate-intro relative"
        >
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
          <Image src="/logo.png" alt="MandorHub Logo" width={192} height={192} className="object-contain pointer-events-none drop-shadow-lg logo-transparent relative z-10" />
        </div>
        <p className="text-on-surface-variant text-center mt-2 text-[10px] font-bold uppercase tracking-widest max-w-[280px]">
          Sistem kontrol proyek harian untuk hasil tanpa kejutan.
        </p>
      </div>

      <div className="glass-panel p-6 rounded-[32px] w-full relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-primary/10 blur-3xl rounded-full" />
        <div className="relative z-10">
        {error && (
          <div className="bg-error/10 border border-error/50 text-error p-3 rounded-2xl mb-6 text-xs font-bold uppercase tracking-widest text-center">
            {error}
          </div>
        )}

        {step === "phone" ? (
          <form onSubmit={requestOtp} className="flex flex-col gap-5">
            <div>
              <label className="block text-[10px] font-bold text-primary uppercase tracking-widest mb-2">
                Nomor HP (WhatsApp)
              </label>
              <input
                type="tel"
                placeholder="08123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-surface-variant/20 border border-surface-variant/50 rounded-2xl px-4 py-3 text-sm text-on-surface focus:border-primary focus:bg-primary/5 outline-none transition-all font-hacker"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary/20 border border-primary/50 text-primary font-bold uppercase tracking-widest text-sm py-4 rounded-2xl hover:bg-primary/40 hover:shadow-[0_0_15px_rgba(0,255,65,0.4)] transition-all flex justify-center items-center gap-2 mt-2 disabled:opacity-50 active:scale-95"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Kirim Kode OTP"}
            </button>
          </form>
        ) : step === "otp" ? (
          <form onSubmit={verifyOtp} className="flex flex-col gap-5">
            <div>
              <label className="block text-[10px] font-bold text-primary uppercase tracking-widest mb-2 flex justify-between">
                <span>Kode OTP</span>
              </label>
              <input
                type="text"
                placeholder="6 Digit Kode"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-surface-variant/20 border border-surface-variant/50 rounded-2xl px-4 py-3 text-center tracking-[0.5em] text-xl font-black text-on-surface focus:border-primary focus:bg-primary/5 outline-none transition-all font-hacker glow-text"
                required
                maxLength={6}
              />
            </div>
            <div className="flex flex-col gap-3 mt-2">
              <button
                type="submit"
                disabled={loading || code.length < 6}
                className="w-full bg-primary/20 border border-primary/50 text-primary font-bold uppercase tracking-widest text-sm py-4 rounded-2xl hover:bg-primary/40 hover:shadow-[0_0_15px_rgba(0,255,65,0.4)] transition-all flex justify-center items-center gap-2 disabled:opacity-30 active:scale-95"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verifikasi & Masuk"}
              </button>
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="w-full bg-transparent text-on-surface-variant text-[10px] font-bold uppercase tracking-widest py-3 hover:text-primary transition-colors disabled:opacity-50"
              >
                Ganti nomor HP
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={loginAdmin} className="flex flex-col gap-5">
            <div>
              <label className="block text-[10px] font-bold text-primary uppercase tracking-widest mb-2 flex justify-between">
                <span>Password Super Admin</span>
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="********"
                className="w-full bg-surface-variant/20 border border-surface-variant/50 rounded-2xl px-4 py-3 text-center tracking-[0.5em] text-xl font-black text-on-surface focus:border-primary focus:bg-primary/5 outline-none transition-all font-hacker glow-text"
                required
              />
            </div>
            <div className="flex flex-col gap-3 mt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary/20 border border-primary/50 text-primary font-bold uppercase tracking-widest text-sm py-4 rounded-2xl hover:bg-primary/40 hover:shadow-[0_0_15px_rgba(0,255,65,0.4)] transition-all flex justify-center items-center gap-2 disabled:opacity-30 active:scale-95"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Masuk Admin"}
              </button>
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="w-full bg-transparent text-on-surface-variant text-[10px] font-bold uppercase tracking-widest py-3 hover:text-primary transition-colors disabled:opacity-50"
              >
                Batal
              </button>
            </div>
          </form>
        )}
        </div>
      </div>

      <div className="mt-8 text-center relative z-10">
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex items-center justify-center gap-1">
          <ShieldAlert className="w-4 h-4" /> Akses aman & terenkripsi
        </p>
      </div>
    </div>
  );
}
