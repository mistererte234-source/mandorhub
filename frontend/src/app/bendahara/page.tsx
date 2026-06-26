"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi, getToken, logout } from "@/lib/api";
import { LogOut, Loader2, ArrowDownCircle, ArrowUpCircle, Wallet, Plus, X } from "lucide-react";

export default function BendaharaDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  
  const [showAdd, setShowAdd] = useState(false);
  const [newLog, setNewLog] = useState({
    type: "out",
    category: "material",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0]
  });
  const [isSaving, setIsSaving] = useState(false);

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
    } catch (err: any) {
      if (err.message.includes("401") || err.message.includes("403")) logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProject) fetchLogs();
  }, [selectedProject]);

  const fetchLogs = async () => {
    try {
      const res = await fetchApi(`/finance?project_id=${selectedProject}`);
      setLogs(res);
    } catch (err) {
      console.error(err);
    }
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
    <>
      <header className="bg-surface/80 backdrop-blur-md docked full-width top-0 shadow-sm sticky z-40">
        <div className="flex justify-between items-center px-5 py-4 w-full">
          <div>
            <h1 className="font-headline-sm text-lg font-bold text-on-surface tracking-tight flex items-center gap-2">
              <Wallet className="w-6 h-6 text-primary" /> BENDAHARA
            </h1>
          </div>
          <button onClick={logout} className="p-2 rounded-full hover:bg-error-container text-error transition-all">
            <LogOut className="w-6 h-6" />
          </button>
        </div>
        
        {projects.length > 0 && (
          <div className="px-5 pb-3">
            <select 
              className="w-full bg-surface-variant/30 border border-surface-variant rounded-xl px-4 py-3 text-sm font-bold text-on-surface outline-none focus:border-primary transition-colors appearance-none"
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </header>

      <main className="px-5 py-6 max-w-2xl mx-auto flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-bold uppercase text-on-surface-variant mb-1 block">Saldo Saat Ini</span>
            <span className={`text-xl font-black ${balance >= 0 ? 'text-primary' : 'text-error'}`}>
              Rp {balance.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-4 shadow-sm flex flex-col justify-center">
            <button 
              onClick={() => setShowAdd(true)}
              className="w-full bg-primary text-on-primary rounded-xl py-2 text-sm font-bold flex justify-center items-center gap-2 hover:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4"/> Catat Transaksi
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="font-bold text-lg text-on-surface mb-2">Riwayat Transaksi</h2>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant bg-surface-variant/20 rounded-2xl border border-surface-variant border-dashed">
              Belum ada transaksi.
            </div>
          ) : (
            logs.map(log => (
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
      </main>

      {/* Modal Add Transaksi */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-on-surface">Catat Transaksi</h2>
              <button onClick={() => setShowAdd(false)} className="p-2 bg-surface-variant rounded-full text-on-surface-variant">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveLog} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-2 bg-surface-variant/30 p-1 rounded-xl">
                <button type="button" onClick={()=>setNewLog({...newLog, type: 'in', category: 'modal'})} className={`py-2 rounded-lg text-sm font-bold transition-all ${newLog.type === 'in' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant'}`}>
                  Uang Masuk
                </button>
                <button type="button" onClick={()=>setNewLog({...newLog, type: 'out', category: 'material'})} className={`py-2 rounded-lg text-sm font-bold transition-all ${newLog.type === 'out' ? 'bg-surface text-error shadow-sm' : 'text-on-surface-variant'}`}>
                  Uang Keluar
                </button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2">Kategori</label>
                <select 
                  value={newLog.category} 
                  onChange={e => setNewLog({...newLog, category: e.target.value})} 
                  className="w-full bg-surface-container-low border border-surface-variant rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary"
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
                      <option value="operasional">Operasional (Makan/Bensin)</option>
                      <option value="lainnya">Lainnya</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2">Jumlah (Rp)</label>
                <input 
                  type="number" 
                  min="0"
                  required
                  value={newLog.amount}
                  onChange={e => setNewLog({...newLog, amount: e.target.value})}
                  className="w-full bg-surface-container-low border border-surface-variant rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary font-mono text-lg"
                  placeholder="500000"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2">Keterangan</label>
                <input 
                  type="text" 
                  value={newLog.description}
                  onChange={e => setNewLog({...newLog, description: e.target.value})}
                  className="w-full bg-surface-container-low border border-surface-variant rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary"
                  placeholder="Beli Semen 10 Sak"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2">Tanggal</label>
                <input 
                  type="date" 
                  required
                  value={newLog.date}
                  onChange={e => setNewLog({...newLog, date: e.target.value})}
                  className="w-full bg-surface-container-low border border-surface-variant rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary"
                />
              </div>

              <button 
                type="submit"
                disabled={isSaving}
                className="w-full py-4 rounded-xl font-bold text-lg bg-primary text-on-primary hover:bg-primary-container transition-all shadow-md mt-2 disabled:opacity-50"
              >
                {isSaving ? "Menyimpan..." : "Simpan Transaksi"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
