"use client";

import { useState } from "react";
import { fetchApi, setToken } from "@/lib/api";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { HardHat, ArrowRight, Loader2 } from "lucide-react";

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
          className="w-48 h-48 flex items-center justify-center mb-4 cursor-pointer select-none active:scale-95 transition-transform animate-intro"
        >
          <Image src="/logo.png" alt="MandorHub Logo" width={192} height={192} className="object-contain pointer-events-none drop-shadow-lg" />
        </div>
        <p className="text-on-surface-variant text-center mt-2 text-base max-w-[280px]">
          Sistem kontrol proyek harian untuk hasil tanpa kejutan.
        </p>
      </div>

      <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-[0_12px_40px_rgba(27,67,50,0.08)] border border-surface-variant w-full">
        {error && (
          <div className="bg-error-container text-on-error-container p-3 rounded-xl mb-6 text-sm font-medium">
            {error}
          </div>
        )}

        {step === "phone" ? (
          <form onSubmit={requestOtp} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-2">
                Nomor HP (WhatsApp)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+628..."
                className="w-full bg-surface-container-low border border-surface-variant text-on-surface text-lg rounded-xl px-4 py-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-fixed transition-all"
                required
              />
              <p className="text-xs text-on-surface-variant mt-2">
                Dev test: +628220000002 (Mandor), +628110000001 (Bos)
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary active:scale-[0.98] transition-all py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-md disabled:opacity-70"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Kirim Kode OTP"}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>
        ) : step === "otp" ? (
          <form onSubmit={verifyOtp} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-2">
                Masukkan Kode OTP
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="w-full bg-surface-container-low border border-surface-variant text-on-surface text-2xl tracking-[0.3em] font-mono text-center rounded-xl px-4 py-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-fixed transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary active:scale-[0.98] transition-all py-4 rounded-xl font-bold text-lg flex items-center justify-center shadow-md disabled:opacity-70"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Verifikasi & Masuk"}
            </button>
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="text-on-surface-variant text-sm font-medium mt-2 active:text-primary transition-colors"
            >
              Ganti nomor HP
            </button>
          </form>
        ) : (
          <form onSubmit={loginAdmin} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-2">
                Password Super Admin
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface-container-low border border-surface-variant text-on-surface text-lg rounded-xl px-4 py-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-fixed transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary active:scale-[0.98] transition-all py-4 rounded-xl font-bold text-lg flex items-center justify-center shadow-md disabled:opacity-70"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Login Admin"}
            </button>
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="text-on-surface-variant text-sm font-medium mt-2 active:text-primary transition-colors"
            >
              Batal
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
