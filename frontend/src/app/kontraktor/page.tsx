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
  Clock,
  ChevronRight
} from "lucide-react";

export default function ContractorDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");

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
            <div className="w-12 h-12 flex items-center justify-center p-1">
              <Image src="/logo.png" alt="Logo" width={48} height={48} className="object-contain logo-transparent" />
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
                    className="appearance-none font-body-md text-sm text-primary font-bold bg-primary/10 border border-primary/30 rounded-lg outline-none cursor-pointer pl-3 pr-8 py-1.5 focus:ring-2 focus:ring-primary/50 transition-all shadow-[0_0_10px_rgba(0,255,65,0.2)]"
                  >
                    <option value="" className="bg-surface text-on-surface">Semua Proyek</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id} className="bg-surface text-on-surface">{p.name}</option>
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
        
      </header>

      <main className="px-6 py-8 flex-1 max-w-4xl mx-auto w-full flex flex-col gap-8">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col gap-8">
            
            {/* Ringkasan */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="glass-panel p-5 rounded-[24px] flex flex-col relative overflow-hidden group">
                 <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary/20 blur-xl rounded-full group-hover:scale-150 group-hover:bg-primary/40 transition-all duration-700"/>
                 <Activity className="w-6 h-6 text-primary mb-3 relative z-10" />
                 <h3 className="text-4xl font-black text-on-surface relative z-10 font-hacker glow-text">{summary.total}</h3>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-primary relative z-10">Proyek Aktif</p>
               </div>
               
               <div className="glass-panel p-5 rounded-[24px] flex flex-col relative overflow-hidden group">
                 <div className="absolute -right-4 -top-4 w-16 h-16 bg-error/20 blur-xl rounded-full group-hover:scale-150 group-hover:bg-error/40 transition-all duration-700"/>
                 <AlertTriangle className="w-6 h-6 text-error mb-3 relative z-10" />
                 <h3 className="text-4xl font-black text-error relative z-10 font-hacker glow-text">{summary.open_issues}</h3>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-error relative z-10">Isu Terbuka</p>
               </div>

               <div className="col-span-2 glass-panel rounded-[24px] p-5 flex flex-col justify-between">
                 <h4 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Status Kesehatan</h4>
                 <div className="flex h-12 rounded-full overflow-hidden mb-2 bg-surface-variant/30 border border-surface-variant/50">
                    <div className="bg-[#00ff41] transition-all duration-500 flex items-center justify-center text-xs font-black text-black font-hacker" style={{width: `${(summary.green/Math.max(1, summary.total))*100}%`}}>
                      {summary.green > 0 && summary.green}
                    </div>
                    <div className="bg-[#ffea00] transition-all duration-500 flex items-center justify-center text-xs font-black text-black font-hacker" style={{width: `${(summary.yellow/Math.max(1, summary.total))*100}%`}}>
                      {summary.yellow > 0 && summary.yellow}
                    </div>
                    <div className="bg-[#ff2a5f] transition-all duration-500 flex items-center justify-center text-xs font-black text-white font-hacker" style={{width: `${(summary.red/Math.max(1, summary.total))*100}%`}}>
                      {summary.red > 0 && summary.red}
                    </div>
                 </div>
                 <div className="flex justify-between text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#00ff41] shadow-[0_0_8px_#00ff41]"/> Aman</span>
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#ffea00] shadow-[0_0_8px_#ffea00]"/> Perhatian</span>
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#ff2a5f] shadow-[0_0_8px_#ff2a5f]"/> Kritis</span>
                 </div>
               </div>
            </section>

            {/* Daftar Proyek Lengkap */}
            <section className="flex flex-col gap-4">
              <h2 className="text-xl font-black text-on-surface mb-2 tracking-tight flex items-center gap-2">
                <MapPin className="w-6 h-6 text-primary glow-text"/> Titik Lokasi Proyek
              </h2>
              
              {sites.map((site: any) => (
                 <Link key={site.site_id} href={`/kontraktor/${site.site_id}`} className="block group">
                   <div className="glass-panel hover:bg-surface-variant/20 transition-all duration-500 rounded-[32px] p-6 flex flex-col gap-4 cursor-pointer active:scale-[0.98] relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl group-hover:bg-primary/20 transition-colors duration-500 rounded-full" />
                     <div className="flex justify-between items-start z-10 relative">
                       <div className="flex-1">
                         <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 bg-primary/20 border border-primary/30 text-primary rounded-xl mb-3 tracking-widest uppercase">
                           <Briefcase className="w-3 h-3"/> {site.project}
                         </span>
                         <h3 className="text-xl font-black text-on-surface mb-1 group-hover:text-primary transition-colors">{site.name}</h3>
                         <p className="text-sm text-on-surface-variant font-medium flex items-center gap-2">
                           <span className="w-6 h-6 rounded-full bg-surface-variant/50 flex items-center justify-center text-[10px] font-black border border-surface-variant">M</span> 
                           {site.mandor || "Mandor Belum Ditugaskan"}
                         </p>
                       </div>
                       <span className={`text-[10px] font-black px-4 py-2 rounded-xl border uppercase tracking-widest
                        ${site.status === 'green' ? 'bg-[#00ff41]/10 text-[#00ff41] border-[#00ff41]/30 shadow-[0_0_10px_rgba(0,255,65,0.2)]' : 
                          site.status === 'red' ? 'bg-[#ff2a5f]/10 text-[#ff2a5f] border-[#ff2a5f]/30 shadow-[0_0_10px_rgba(255,42,95,0.2)]' : 
                          'bg-[#ffea00]/10 text-[#ffea00] border-[#ffea00]/30 shadow-[0_0_10px_rgba(255,234,0,0.2)]'}`}
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

                     <div className="mt-5 glass-panel border border-primary/30 bg-primary/10 rounded-xl px-4 py-3 flex justify-between items-center group-hover:shadow-[0_0_15px_rgba(0,255,65,0.25)] group-hover:bg-primary/20 transition-all">
                       <span className="text-[10px] sm:text-xs font-black text-primary font-hacker uppercase tracking-widest glow-text">Lihat Detail Proyek</span>
                       <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center transition-colors border border-primary/50">
                         <ChevronRight className="w-3 h-3 text-primary" />
                       </div>
                     </div>
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
      </main>
    </div>
  );
}
