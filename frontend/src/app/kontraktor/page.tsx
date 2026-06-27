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
  ArrowUpCircle,
  TrendingUp,
  MapPin,
  CheckCircle2,
  Clock
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
    if (projects.length >= 0 && getToken()) {
      fetchDashboard();
    }
  }, [selectedProject, projects.length]);

  useEffect(() => {
    if (tab === "keuangan" && selectedProject && getToken()) {
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
    if (!getToken()) return;
    setLoading(true);
    let url = "/dashboard";
    if (selectedProject) {
      url += `?project_id=${selectedProject}`;
    }
    fetchApi(url)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard error:", err);
        if (err.message.includes("Not authenticated") || err.message.includes("401") || err.message.includes("Sesi telah habis")) {
          // Do NOT setLoading(false), let it redirect
          logout();
        } else {
          setLoading(false);
        }
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
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="bg-surface/70 backdrop-blur-2xl docked full-width top-0 shadow-sm sticky z-40 border-b border-surface-variant/30">
        <div className="flex justify-between items-center px-6 py-5 w-full">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl shadow-lg border border-surface-variant overflow-hidden bg-white flex items-center justify-center">
              <Image src="/logo.png" alt="Logo" width={48} height={48} className="object-cover" />
            </div>
            <div>
              <h1 className="font-headline-lg-mobile text-[24px] leading-tight font-black text-on-surface tracking-tight">
                MandorHub <span className="text-primary">Bos</span>
              </h1>
              {projects.length > 0 ? (
                <div className="relative mt-1">
                  <select 
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="appearance-none font-body-md text-sm text-primary font-bold bg-primary/10 rounded-lg outline-none cursor-pointer pl-3 pr-8 py-1 focus:ring-2 focus:ring-primary/50 transition-all"
                  >
                    <option value="">Semua Proyek</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ArrowDownCircle className="w-4 h-4 text-primary absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              ) : (
                <p className="font-body-md text-sm text-on-surface-variant mt-1">
                  Ikhtisar Seluruh Proyek
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/kontraktor/pengaturan"
              className="p-2.5 rounded-xl bg-surface-variant/30 hover:bg-surface-variant text-on-surface-variant active:scale-95 transition-all"
            >
              <Settings className="w-5 h-5" />
            </Link>
            <button
              onClick={logout}
              className="p-2.5 rounded-xl bg-error/10 hover:bg-error/20 text-error active:scale-95 transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex px-6 gap-6">
          <button 
            onClick={() => setTab("proyek")}
            className={`pb-4 text-sm font-black transition-all border-b-4 ${tab === "proyek" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"}`}
          >
            <div className="flex items-center justify-center gap-2"><Briefcase className="w-4 h-4"/> Ringkasan Proyek</div>
          </button>
          <button 
            onClick={() => setTab("keuangan")}
            className={`pb-4 text-sm font-black transition-all border-b-4 ${tab === "keuangan" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"}`}
          >
            <div className="flex items-center justify-center gap-2"><Wallet className="w-4 h-4"/> Laporan Keuangan</div>
          </button>
        </div>
      </header>

      <main className="px-6 py-8 flex-1 max-w-4xl mx-auto w-full flex flex-col gap-8">
        {tab === "proyek" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col gap-8">
            
            {/* Ringkasan */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="bg-surface-container-lowest border border-surface-variant/60 p-5 rounded-3xl flex flex-col shadow-sm relative overflow-hidden group">
                 <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-500"/>
                 <Activity className="w-6 h-6 text-primary mb-3 relative z-10" />
                 <h3 className="text-3xl font-black text-on-surface relative z-10">{summary.total}</h3>
                 <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant relative z-10">Proyek Aktif</p>
               </div>
               
               <div className="bg-[#ffd9d6]/30 border border-[#ffd9d6] p-5 rounded-3xl flex flex-col shadow-sm relative overflow-hidden group">
                 <div className="absolute -right-4 -top-4 w-16 h-16 bg-[#ba1a1a]/5 rounded-full group-hover:scale-150 transition-transform duration-500"/>
                 <AlertTriangle className="w-6 h-6 text-[#ba1a1a] mb-3 relative z-10" />
                 <h3 className="text-3xl font-black text-[#ba1a1a] relative z-10">{summary.open_issues}</h3>
                 <p className="text-xs font-bold uppercase tracking-wider text-[#93000a] relative z-10">Isu Terbuka</p>
               </div>

               <div className="col-span-2 bg-surface-container-lowest border border-surface-variant/60 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
                 <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Status Kesehatan</h4>
                 <div className="flex h-12 rounded-full overflow-hidden mb-2 shadow-inner">
                    <div className="bg-secondary-fixed transition-all duration-500 flex items-center justify-center text-xs font-bold text-on-secondary-fixed" style={{width: `${(summary.green/Math.max(1, summary.total))*100}%`}}>
                      {summary.green > 0 && summary.green}
                    </div>
                    <div className="bg-tertiary-fixed transition-all duration-500 flex items-center justify-center text-xs font-bold text-on-tertiary-fixed" style={{width: `${(summary.yellow/Math.max(1, summary.total))*100}%`}}>
                      {summary.yellow > 0 && summary.yellow}
                    </div>
                    <div className="bg-error transition-all duration-500 flex items-center justify-center text-xs font-bold text-on-error" style={{width: `${(summary.red/Math.max(1, summary.total))*100}%`}}>
                      {summary.red > 0 && summary.red}
                    </div>
                 </div>
                 <div className="flex justify-between text-[10px] font-bold text-on-surface-variant">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-secondary-fixed"/> Aman</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-tertiary-fixed"/> Perhatian</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-error"/> Kritis</span>
                 </div>
               </div>
            </section>

            {/* Daftar Proyek Lengkap */}
            <section className="flex flex-col gap-4">
              <h2 className="text-xl font-black text-on-surface mb-2 tracking-tight flex items-center gap-2">
                <MapPin className="w-6 h-6 text-primary"/> Titik Lokasi Proyek
              </h2>
              
              {sites.map((site: any) => (
                 <Link key={site.site_id} href={`/kontraktor/${site.site_id}`} className="block group">
                   <div className="bg-surface-container-lowest hover:bg-surface-container-low transition-all duration-300 rounded-3xl p-6 shadow-sm border border-surface-variant/60 flex flex-col gap-4 cursor-pointer active:scale-[0.98] group-hover:shadow-md relative overflow-hidden">
                     
                     <div className="flex justify-between items-start z-10 relative">
                       <div className="flex-1">
                         <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-primary/10 text-primary rounded-lg mb-3">
                           <Briefcase className="w-3 h-3"/> {site.project}
                         </span>
                         <h3 className="text-xl font-black text-on-surface mb-1 group-hover:text-primary transition-colors">{site.name}</h3>
                         <p className="text-sm text-on-surface-variant font-medium flex items-center gap-2">
                           <span className="w-6 h-6 rounded-full bg-surface-variant/50 flex items-center justify-center text-[10px] font-black">M</span> 
                           {site.mandor || "Mandor Belum Ditugaskan"}
                         </p>
                       </div>
                       <span className={`text-xs font-black px-4 py-2 rounded-xl shadow-sm border uppercase tracking-wider
                        ${site.status === 'green' ? 'bg-[#c3f0c3] text-[#0e520e] border-[#c3f0c3]' : 
                          site.status === 'red' ? 'bg-[#ffd9d6] text-[#8c1d18] border-[#ffd9d6]' : 
                          'bg-[#ffdf99] text-[#5a4300] border-[#ffdf99]'}`}
                      >
                        {site.status_label}
                      </span>
                     </div>
                     
                     {site.reasons && site.reasons.length > 0 && (
                       <div className="mt-2 p-3 bg-surface-variant/20 rounded-2xl border border-surface-variant/50 z-10 relative">
                         <ul className="text-sm text-on-surface-variant space-y-1.5 font-medium">
                           {site.reasons.map((reason: string, i: number) => (
                             <li key={i} className="flex items-start gap-2">
                               <div className="w-1.5 h-1.5 rounded-full bg-on-surface-variant mt-1.5 shrink-0"/>
                               {reason}
                             </li>
                           ))}
                         </ul>
                       </div>
                     )}
                   </div>
                 </Link>
              ))}

              {sites.length === 0 && (
                <div className="text-center p-12 text-on-surface-variant bg-surface-container rounded-3xl border border-dashed border-surface-variant">
                  <div className="w-16 h-16 bg-surface-variant/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-8 h-8 text-on-surface-variant/50" />
                  </div>
                  <h3 className="font-bold text-lg mb-1">Belum Ada Titik Proyek</h3>
                  <p className="text-sm">Silakan tambahkan proyek melalui panel admin.</p>
                </div>
              )}
            </section>
          </div>
        )}

        {tab === "keuangan" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {!selectedProject ? (
              <div className="text-center p-12 bg-surface-variant/20 rounded-3xl border border-surface-variant border-dashed">
                <Wallet className="w-16 h-16 text-primary/40 mx-auto mb-4" />
                <p className="text-on-surface font-black text-lg mb-2">Pilih Proyek Terlebih Dahulu</p>
                <p className="text-on-surface-variant text-sm max-w-sm mx-auto">Gunakan dropdown di header atas untuk memilih proyek dan melihat rincian laporan keuangan dari Bendahara.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#c3f0c3]/20 border border-[#c3f0c3] rounded-3xl p-6 shadow-sm flex flex-col justify-center transition-all hover:bg-[#c3f0c3]/30">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#0e520e] mb-2 flex items-center gap-2">
                      <ArrowDownCircle className="w-4 h-4"/> Total Masuk
                    </span>
                    <span className="text-2xl font-black text-[#0e520e]">Rp {finances.filter(l => l.type==='in').reduce((s,l)=>s+l.amount, 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="bg-[#ffd9d6]/20 border border-[#ffd9d6] rounded-3xl p-6 shadow-sm flex flex-col justify-center transition-all hover:bg-[#ffd9d6]/30">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#8c1d18] mb-2 flex items-center gap-2">
                      <ArrowUpCircle className="w-4 h-4"/> Total Keluar
                    </span>
                    <span className="text-2xl font-black text-[#8c1d18]">Rp {finances.filter(l => l.type==='out').reduce((s,l)=>s+l.amount, 0).toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest border border-surface-variant/60 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 w-32 h-32 bg-primary/5 rounded-tl-full"/>
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2 block relative z-10">Saldo Saat Ini</span>
                  <span className={`text-4xl font-black relative z-10 ${
                    finances.reduce((s,l)=>s+(l.type==='in'?l.amount:-l.amount), 0) >= 0 ? 'text-primary' : 'text-error'
                  }`}>
                    Rp {finances.reduce((s,l)=>s+(l.type==='in'?l.amount:-l.amount), 0).toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex flex-col gap-4 mt-4">
                  <h2 className="font-black text-xl text-on-surface mb-2 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary"/> Riwayat Transaksi
                  </h2>
                  {finances.length === 0 ? (
                    <div className="text-center py-12 text-on-surface-variant bg-surface-variant/20 rounded-3xl border border-surface-variant border-dashed">
                      Belum ada laporan dari Bendahara.
                    </div>
                  ) : (
                    finances.map(log => (
                      <div key={log.id} className="flex justify-between items-center p-5 bg-surface-container-lowest border border-surface-variant/60 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl shadow-inner ${log.type === 'in' ? 'bg-[#c3f0c3]/50 text-[#0e520e]' : 'bg-[#ffd9d6]/50 text-[#8c1d18]'}`}>
                            {log.type === 'in' ? <ArrowDownCircle className="w-6 h-6"/> : <ArrowUpCircle className="w-6 h-6"/>}
                          </div>
                          <div>
                            <h4 className="font-black text-base text-on-surface capitalize group-hover:text-primary transition-colors">{log.category}</h4>
                            <span className="text-sm font-medium text-on-surface-variant">{new Date(log.date).toLocaleDateString('id-ID')} {log.description ? `• ${log.description}` : ''}</span>
                          </div>
                        </div>
                        <div className={`font-black text-lg ${log.type === 'in' ? 'text-[#0e520e]' : 'text-[#8c1d18]'}`}>
                          {log.type === 'in' ? '+' : '-'} Rp {log.amount.toLocaleString('id-ID')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
