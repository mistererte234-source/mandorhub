"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi, getToken, logout } from "@/lib/api";
import { LogOut, Loader2, ArrowDownCircle, ArrowUpCircle, Wallet, Plus, X, Calendar, Activity } from "lucide-react";
import Image from "next/image";

export default function BendaharaDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [weeklyWages, setWeeklyWages] = useState<any>(null);
  
  const [showAdd, setShowAdd] = useState(false);
  const [newLog, setNewLog] = useState({
    type: "out",
    category: "material",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0]
  });
  const [isSaving, setIsSaving] = useState(false);
  const [filterDays, setFilterDays] = useState(7);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    fetchInitialData();
  }, [router]);

  const fetchInitialData = async () => {
    try {
      const pRes = await fetchApi("/projects/my");
      setProjects(pRes);
      if (pRes.length > 0) {
        setSelectedProject(pRes[0].id);
      }
      setLoading(false);
    } catch (err: any) {
      if (err.message?.includes("401") || err.message?.includes("403") || err.message?.includes("Sesi telah habis")) {
        logout();
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (selectedProject) {
      fetchLogs();
      fetchWages();
    }
  }, [selectedProject, filterDays]);

  const fetchLogs = async () => {
    try {
      const res = await fetchApi(`/finance?project_id=${selectedProject}`);
      setLogs(res);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWages = async () => {
    try {
      const today = new Date();
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - filterDays);
      
      const start = pastDate.toISOString().split('T')[0];
      const end = today.toISOString().split('T')[0];
      
      const res = await fetchApi(`/finance/weekly-wages?project_id=${selectedProject}&start_date=${start}&end_date=${end}`);
      setWeeklyWages(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePayWages = () => {
    if (!weeklyWages) return;
    const startStr = new Date(weeklyWages.start_date).toLocaleDateString('id-ID');
    const endStr = new Date(weeklyWages.end_date).toLocaleDateString('id-ID');
    setNewLog({
      ...newLog,
      type: "out",
      category: "tukang",
      amount: weeklyWages.total_wage.toString(),
      description: `Gaji Tukang & Kuli ${startStr} s/d ${endStr}`
    });
    setShowAdd(true);
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await fetchApi("/finance", {
        method: "POST",
        body: JSON.stringify({
          project_id: selectedProject,
          type: newLog.type,
          category: newLog.category,
          amount: parseFloat(newLog.amount),
          description: newLog.description,
          date: newLog.date
        })
      });
      setShowAdd(false);
      setNewLog({...newLog, amount: "", description: ""});
      fetchLogs();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  const totalIn = logs.filter(l => l.type === 'in').reduce((sum, l) => sum + l.amount, 0);
  const totalOut = logs.filter(l => l.type === 'out').reduce((sum, l) => sum + l.amount, 0);
  const balance = totalIn - totalOut;

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="bg-surface/70 backdrop-blur-2xl docked full-width top-0 shadow-sm sticky z-40 border-b border-surface-variant/30">
        <div className="flex justify-between items-center px-6 py-5 w-full">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center p-1">
              <Image src="/logo.png" alt="Logo" width={48} height={48} className="object-contain logo-transparent" />
            </div>
            <div>
              <h1 className="font-headline-lg-mobile text-[22px] leading-tight font-black text-on-surface tracking-tight">
                MandorHub <span className="text-primary">Bendahara</span>
              </h1>
              {projects.length > 0 ? (
                <div className="relative mt-1">
                  <select 
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="appearance-none font-body-md text-sm text-primary font-bold bg-primary/10 rounded-lg outline-none cursor-pointer pl-3 pr-8 py-1 focus:ring-2 focus:ring-primary/50 transition-all"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ArrowDownCircle className="w-4 h-4 text-primary absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              ) : (
                <p className="font-body-md text-sm text-on-surface-variant mt-1">
                  Belum Ada Proyek
                </p>
              )}
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2.5 rounded-xl bg-error/10 hover:bg-error/20 text-error active:scale-95 transition-all"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="px-6 py-8 flex-1 max-w-3xl mx-auto w-full flex flex-col gap-6">
        {!selectedProject ? (
          <div className="text-center p-12 bg-surface-variant/20 rounded-3xl border border-surface-variant border-dashed">
            <Wallet className="w-16 h-16 text-primary/40 mx-auto mb-4" />
            <p className="text-on-surface font-black text-lg mb-2">Pilih Proyek</p>
          </div>
        ) : (
          <>
            {/* Saldo Section */}
            <div className="glass-panel rounded-[24px] p-6 relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 w-32 h-32 bg-primary/20 blur-2xl rounded-tl-full transition-transform group-hover:scale-150 duration-700"/>
              <div className="flex justify-between items-end relative z-10">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Saldo Kas Saat Ini</span>
                  <span className={`text-4xl font-hacker glow-text ${balance >= 0 ? 'text-primary' : 'text-error'}`}>
                    Rp {balance.toLocaleString('id-ID')}
                  </span>
                </div>
                <button 
                  onClick={() => setShowAdd(true)}
                  className="bg-primary/20 border border-primary/50 text-primary rounded-2xl px-5 py-3 text-sm font-bold flex justify-center items-center gap-2 hover:bg-primary/40 hover:shadow-[0_0_15px_rgba(0,255,65,0.4)] transition-all active:scale-95"
                >
                  <Plus className="w-5 h-5"/> Catat
                </button>
              </div>
            </div>

            {/* Estimasi Upah Section */}
            {weeklyWages && (
              <div className="glass-panel border-warning/50 rounded-[24px] p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-warning/20 blur-xl rounded-bl-full -z-10" />
                <div className="flex justify-between items-center mb-5 relative z-10">
                  <h3 className="font-black text-lg text-warning flex items-center gap-2 glow-text" style={{'--tw-text-opacity': 1, color: '#ffea00'} as any}>
                    <Activity className="w-5 h-5" /> Estimasi Gaji Kuli & Tukang
                  </h3>
                  <select 
                    value={filterDays} 
                    onChange={e => setFilterDays(parseInt(e.target.value))}
                    className="bg-warning/10 text-warning border border-warning/30 outline-none text-[10px] font-bold px-3 py-2 rounded-xl cursor-pointer hover:bg-warning/20 transition-colors uppercase tracking-widest"
                    style={{color: '#ffea00'}}
                  >
                    <option value={7} className="bg-surface text-on-surface">7 Hari</option>
                    <option value={14} className="bg-surface text-on-surface">14 Hari</option>
                    <option value={30} className="bg-surface text-on-surface">30 Hari</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-3 relative z-10">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant font-medium">Tukang (<span className="font-hacker text-primary">{weeklyWages.total_tukang_count}</span> Hari Kerja)</span>
                    <span className="font-hacker text-primary">Rp {(weeklyWages.total_tukang_count * weeklyWages.tukang_rate).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant font-medium">Kuli (<span className="font-hacker text-primary">{weeklyWages.total_kuli_count}</span> Hari Kerja)</span>
                    <span className="font-hacker text-primary">Rp {(weeklyWages.total_kuli_count * weeklyWages.kuli_rate).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="border-t border-warning/30 pt-4 mt-2 flex justify-between font-black text-warning text-xl items-center" style={{color: '#ffea00'}}>
                    <span className="text-[12px] uppercase tracking-widest">Total Gaji</span>
                    <span className="font-hacker glow-text text-2xl">Rp {weeklyWages.total_wage?.toLocaleString('id-ID')}</span>
                  </div>
                </div>
                
                <div className="mt-6 flex flex-col gap-2 relative z-10">
                  <button
                    onClick={handlePayWages}
                    className="w-full bg-[#ffea00]/20 border border-[#ffea00]/50 text-[#ffea00] font-bold text-base py-3 rounded-2xl flex justify-center items-center gap-2 hover:bg-[#ffea00]/40 hover:shadow-[0_0_15px_rgba(255,234,0,0.3)] active:scale-95 transition-all"
                  >
                    <Wallet className="w-5 h-5" /> Bayar Gaji Ini
                  </button>
                  <p className="text-[10px] text-on-surface-variant text-center leading-relaxed font-medium uppercase tracking-widest mt-1">
                    *Gaji dihitung dari absensi laporan mandor <span className="font-hacker text-primary">{filterDays}</span> hari terakhir.
                  </p>
                </div>
              </div>
            )}

            {/* Riwayat Transaksi */}
            <div className="flex flex-col gap-4">
              <h2 className="font-black text-xl text-on-surface mb-2 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary"/> Riwayat Transaksi
              </h2>
              {logs.length === 0 ? (
                <div className="text-center py-12 text-on-surface-variant bg-surface-variant/20 rounded-3xl border border-surface-variant border-dashed">
                  Belum ada transaksi.
                </div>
              ) : (
                logs.map(log => (
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
          </>
        )}
      </main>

      {/* Modal Add Transaksi */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-lg mx-auto rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300 max-h-[90vh] overflow-y-auto border-t border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-on-surface">Catat Transaksi Baru</h2>
              <button onClick={() => setShowAdd(false)} className="p-2 bg-surface-variant/50 hover:bg-surface-variant rounded-full text-on-surface-variant transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveLog} className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-2 bg-surface-variant/30 p-1.5 rounded-2xl">
                <button type="button" onClick={()=>setNewLog({...newLog, type: 'in', category: 'modal'})} className={`py-3 rounded-xl text-sm font-bold transition-all ${newLog.type === 'in' ? 'bg-surface text-[#0e520e] shadow-md' : 'text-on-surface-variant'}`}>
                  Uang Masuk
                </button>
                <button type="button" onClick={()=>setNewLog({...newLog, type: 'out', category: 'material'})} className={`py-3 rounded-xl text-sm font-bold transition-all ${newLog.type === 'out' ? 'bg-surface text-[#8c1d18] shadow-md' : 'text-on-surface-variant'}`}>
                  Uang Keluar
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Kategori</label>
                <select 
                  value={newLog.category} 
                  onChange={e => setNewLog({...newLog, category: e.target.value})} 
                  className="w-full bg-surface-container-low border border-surface-variant rounded-2xl px-4 py-3 text-sm font-bold text-on-surface outline-none focus:border-primary transition-colors appearance-none"
                >
                  {newLog.type === 'in' ? (
                    <>
                      <option value="modal">Modal / Transfer Bos</option>
                      <option value="lainnya">Lainnya</option>
                    </>
                  ) : (
                    <>
                      <option value="material">Belanja Material</option>
                      <option value="tukang">Gaji / Kasbon Tukang</option>
                      <option value="operasional">Operasional (Makan/Bensin/dll)</option>
                      <option value="lainnya">Lainnya</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Jumlah (Rp)</label>
                <input 
                  type="number" 
                  min="0"
                  required
                  value={newLog.amount}
                  onChange={e => setNewLog({...newLog, amount: e.target.value})}
                  className="w-full bg-surface-container-low border border-surface-variant rounded-2xl px-4 py-3 text-on-surface outline-none focus:border-primary font-mono text-xl font-black transition-colors"
                  placeholder="500000"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Keterangan (Opsional)</label>
                <input 
                  type="text" 
                  value={newLog.description}
                  onChange={e => setNewLog({...newLog, description: e.target.value})}
                  className="w-full bg-surface-container-low border border-surface-variant rounded-2xl px-4 py-3 text-sm font-medium text-on-surface outline-none focus:border-primary transition-colors"
                  placeholder="Contoh: Beli Semen 10 Sak"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Tanggal</label>
                <input 
                  type="date" 
                  required
                  value={newLog.date}
                  onChange={e => setNewLog({...newLog, date: e.target.value})}
                  className="w-full bg-surface-container-low border border-surface-variant rounded-2xl px-4 py-3 text-sm font-medium text-on-surface outline-none focus:border-primary transition-colors"
                />
              </div>

              <button 
                type="submit"
                disabled={isSaving}
                className="w-full py-4 rounded-2xl font-bold text-base bg-primary text-on-primary hover:bg-primary-container transition-all shadow-md mt-2 disabled:opacity-50"
              >
                {isSaving ? "Menyimpan..." : "Simpan Transaksi"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
