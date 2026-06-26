"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi, logout, getToken } from "@/lib/api";
import Image from "next/image";
import {
  LogOut,
  Loader2,
  AlertTriangle,
  Activity,
  Settings,
  Briefcase,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle
} from "lucide-react";

export default function ContractorDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [tab, setTab] = useState<"proyek" | "keuangan">("proyek");
  const [finances, setFinances] = useState<any[]>([]);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    fetchProjects();
  }, [router]);

  useEffect(() => {
    if (projects.length >= 0) {
      fetchDashboard();
    }
  }, [selectedProject, projects.length]);

  useEffect(() => {
    if (tab === "keuangan" && selectedProject) {
      fetchApi(`/finance?project_id=${selectedProject}`).then(setFinances).catch(console.error);
    }
  }, [tab, selectedProject]);

  const fetchProjects = async () => {
    try {
      const res = await fetchApi("/projects/my");
      setProjects(res);
    } catch(err) {
      console.error(err);
    }
  };

  const fetchDashboard = () => {
    setLoading(true);
    let url = "/dashboard";
    if (selectedProject) {
      url += `?project_id=${selectedProject}`;
    }
    fetchApi(url)
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
  };

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
            <div className="w-10 h-10 rounded-full shadow-sm border border-surface-variant overflow-hidden bg-white flex items-center justify-center">
              <Image src="/logo.png" alt="Logo" width={40} height={40} className="object-cover" />
            </div>
            <div>
              <h1 className="font-headline-lg-mobile text-[22px] leading-[28px] font-bold text-primary tracking-tight">
                Dashboard Bos
              </h1>
              {projects.length > 0 ? (
                <select 
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="font-body-md text-sm text-on-surface-variant bg-transparent outline-none cursor-pointer border-b border-surface-variant pb-1"
                >
                  <option value="">Semua Proyek</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              ) : (
                <p className="font-body-md text-base text-on-surface-variant">
                  Ikhtisar seluruh proyek
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Link
              href="/kontraktor/pengaturan"
              className="p-2 rounded-full hover:bg-surface-variant text-on-surface-variant active:scale-95 transition-all"
            >
              <Settings className="w-6 h-6" />
            </Link>
            <button
              onClick={logout}
              className="p-2 rounded-full hover:bg-error-container text-error active:scale-95 transition-all"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-surface-variant mt-2 px-5">
          <button 
            onClick={() => setTab("proyek")}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${tab === "proyek" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"}`}
          >
            <div className="flex items-center justify-center gap-2"><Briefcase className="w-4 h-4"/> Proyek</div>
          </button>
          <button 
            onClick={() => setTab("keuangan")}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${tab === "keuangan" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"}`}
          >
            <div className="flex items-center justify-center gap-2"><Wallet className="w-4 h-4"/> Keuangan</div>
          </button>
        </div>
      </header>

      <main className="px-5 py-6 flex flex-col gap-6">
        {tab === "proyek" && (
          <>
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
          </>
        )}

        {tab === "keuangan" && (
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {!selectedProject ? (
              <div className="text-center p-8 bg-surface-variant/20 rounded-2xl border border-surface-variant border-dashed">
                <Wallet className="w-12 h-12 text-on-surface-variant/50 mx-auto mb-3" />
                <p className="text-on-surface font-semibold mb-1">Pilih Proyek Terlebih Dahulu</p>
                <p className="text-on-surface-variant text-sm">Gunakan dropdown di atas untuk memilih proyek dan melihat laporan keuangan.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#c3f0c3]/20 border border-[#c3f0c3] rounded-2xl p-4 shadow-sm flex flex-col justify-center">
                    <span className="text-xs font-bold uppercase text-[#0e520e] mb-1">Total Masuk</span>
                    <span className="text-lg font-black text-[#0e520e]">Rp {finances.filter(l => l.type==='in').reduce((s,l)=>s+l.amount, 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="bg-[#ffd9d6]/20 border border-[#ffd9d6] rounded-2xl p-4 shadow-sm flex flex-col justify-center">
                    <span className="text-xs font-bold uppercase text-[#8c1d18] mb-1">Total Keluar</span>
                    <span className="text-lg font-black text-[#8c1d18]">Rp {finances.filter(l => l.type==='out').reduce((s,l)=>s+l.amount, 0).toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-4 shadow-sm">
                  <span className="text-xs font-bold uppercase text-on-surface-variant mb-1 block">Saldo Saat Ini</span>
                  <span className={`text-2xl font-black ${
                    finances.reduce((s,l)=>s+(l.type==='in'?l.amount:-l.amount), 0) >= 0 ? 'text-primary' : 'text-error'
                  }`}>
                    Rp {finances.reduce((s,l)=>s+(l.type==='in'?l.amount:-l.amount), 0).toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  <h2 className="font-bold text-lg text-on-surface mb-1">Riwayat Transaksi</h2>
                  {finances.length === 0 ? (
                    <div className="text-center py-8 text-on-surface-variant bg-surface-variant/20 rounded-2xl border border-surface-variant border-dashed">
                      Belum ada laporan dari Bendahara.
                    </div>
                  ) : (
                    finances.map(log => (
                      <div key={log.id} className="flex justify-between items-center p-4 bg-surface-container-lowest border border-surface-variant rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${log.type === 'in' ? 'bg-[#c3f0c3] text-[#0e520e]' : 'bg-[#ffd9d6] text-[#8c1d18]'}`}>
                            {log.type === 'in' ? <ArrowDownCircle className="w-5 h-5"/> : <ArrowUpCircle className="w-5 h-5"/>}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-on-surface capitalize">{log.category}</h4>
                            <span className="text-xs text-on-surface-variant">{new Date(log.date).toLocaleDateString('id-ID')} - {log.description || '-'}</span>
                          </div>
                        </div>
                        <div className={`font-bold text-sm ${log.type === 'in' ? 'text-[#0e520e]' : 'text-error'}`}>
                          {log.type === 'in' ? '+' : '-'} Rp {log.amount.toLocaleString('id-ID')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </>
  );
}
