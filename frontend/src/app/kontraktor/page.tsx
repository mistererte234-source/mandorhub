"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi, logout, getToken } from "@/lib/api";
import {
  LogOut,
  Loader2,
  Building2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Activity
} from "lucide-react";

export default function ContractorDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }

    fetchApi("/dashboard")
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error("Dashboard error:", err);
        if (err.message.includes("Not authenticated") || err.message.includes("401")) {
          logout();
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  const summary = data?.summary || { total: 0, green: 0, yellow: 0, red: 0, open_issues: 0 };
  const sites = data?.sites || [];

  return (
    <>
      <header className="bg-surface/80 backdrop-blur-md docked full-width top-0 shadow-sm sticky z-40">
        <div className="flex justify-between items-center px-5 py-4 w-full border-b border-surface-variant/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full shadow-sm border-2 border-surface-container-low overflow-hidden bg-surface-variant flex items-center justify-center">
              <span className="text-xl">👔</span>
            </div>
            <div>
              <h1 className="font-headline-lg-mobile text-[22px] leading-[28px] font-bold text-primary tracking-tight">
                Dashboard Bos
              </h1>
              <p className="font-body-md text-base text-on-surface-variant">
                Pantau semua proyek
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-full hover:bg-error-container text-error active:scale-95 transition-all"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="px-5 py-6 flex flex-col gap-6">
        {/* Ringkasan */}
        <section className="grid grid-cols-2 gap-4">
           <div className="bg-surface-container-lowest border border-surface-variant p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
             <Activity className="w-8 h-8 text-primary mb-2" />
             <h3 className="text-3xl font-bold text-on-surface">{summary.total}</h3>
             <p className="text-sm font-medium text-on-surface-variant">Total Proyek Aktif</p>
           </div>
           <div className="bg-error-container border border-error-container/50 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
             <AlertTriangle className="w-8 h-8 text-error mb-2" />
             <h3 className="text-3xl font-bold text-on-error-container">{summary.open_issues}</h3>
             <p className="text-sm font-medium text-on-error-container">Isu Terbuka</p>
           </div>
        </section>

        {/* Status Breakdown */}
        <section>
          <h2 className="text-xl font-bold text-on-surface mb-3 tracking-tight">Kesehatan Proyek</h2>
          <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-4 flex gap-4">
             <div className="flex-1 flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-error-container text-error flex items-center justify-center font-bold">{summary.red}</div>
                <span className="text-xs font-semibold text-on-surface-variant">Kritis</span>
             </div>
             <div className="flex-1 flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-tertiary-fixed text-tertiary flex items-center justify-center font-bold">{summary.yellow}</div>
                <span className="text-xs font-semibold text-on-surface-variant">Perhatian</span>
             </div>
             <div className="flex-1 flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-secondary-fixed text-secondary flex items-center justify-center font-bold">{summary.green}</div>
                <span className="text-xs font-semibold text-on-surface-variant">Aman</span>
             </div>
          </div>
        </section>

        {/* Daftar Proyek Lengkap */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold text-on-surface mb-1 tracking-tight">Daftar Titik Lokasi</h2>
          
          {sites.map((site: any) => (
             <Link key={site.site_id} href={`/kontraktor/${site.site_id}`} className="block">
               <div className="bg-surface-container-lowest hover:bg-surface-container-low transition-colors rounded-2xl p-4 shadow-sm border border-surface-variant flex flex-col gap-3 cursor-pointer active:scale-[0.98]">
                 <div className="flex justify-between items-start">
                   <div>
                     <span className="inline-block text-xs font-semibold px-2 py-1 bg-surface-container rounded text-on-surface-variant mb-2">
                       {site.project}
                     </span>
                     <h3 className="text-lg font-bold text-on-surface">{site.name}</h3>
                     <p className="text-sm text-on-surface-variant">Mandor: {site.mandor || "Belum ada"}</p>
                   </div>
                   <span className={`text-sm font-semibold px-3 py-1 rounded-full shadow-sm border
                    ${site.status === 'green' ? 'bg-secondary-fixed text-on-secondary-fixed border-secondary-fixed-dim' : 
                      site.status === 'red' ? 'bg-error-container text-on-error-container border-error-container/50' : 
                      'bg-tertiary-fixed text-on-tertiary-fixed border-tertiary-fixed-dim'}`}
                  >
                    {site.status_label}
                  </span>
                 </div>
                 
                 {site.reasons && site.reasons.length > 0 && (
                   <div className="mt-2 pt-2 border-t border-surface-variant">
                     <ul className="list-disc list-inside text-sm text-on-surface-variant space-y-1">
                       {site.reasons.map((reason: string, i: number) => (
                         <li key={i}>{reason}</li>
                       ))}
                     </ul>
                   </div>
                 )}
               </div>
             </Link>
          ))}

          {sites.length === 0 && (
            <div className="text-center p-6 text-on-surface-variant bg-surface-container rounded-2xl">
              Belum ada titik proyek.
            </div>
          )}
        </section>
      </main>
    </>
  );
}
