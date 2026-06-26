"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi, logout, getToken } from "@/lib/api";
import { LogOut, Loader2, Save, User as UserIcon, Phone, Database, Paintbrush, Activity, ShieldAlert, Trash2, Briefcase, Plus, X, Settings } from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"proyek" | "akun" | "db" | "spy">("proyek");
  
  const [users, setUsers] = useState<any[]>([]);
  const [editData, setEditData] = useState<{ [id: string]: { name: string; phone: string } }>({});
  
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [spyLogs, setSpyLogs] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProject, setNewProject] = useState({name: "", client_name: "", bos_id: "", mandor_id: ""});

  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);
  const showToast = (msg: string, type: 'success'|'error' = 'success') => {
    setToast({msg, type});
    setTimeout(() => setToast(null), 3000);
  };

  const [confirmDialog, setConfirmDialog] = useState<{msg: string, action: () => void} | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, sRes, pRes] = await Promise.all([
        fetchApi("/users"),
        fetchApi("/admin/spy-logs"),
        fetchApi("/admin/projects")
      ]);
      setUsers(uRes);
      const ed: any = {};
      uRes.forEach((u: any) => {
        ed[u.id] = { name: u.name, phone: u.phone || "" };
      });
      setEditData(ed);
      setSpyLogs(sRes);
      setProjects(pRes);
    } catch (err: any) {
      if (err.message.includes("403")) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async (userId: string) => {
    try {
      const data = editData[userId];
      await fetchApi(`/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      showToast("Data berhasil disimpan!");
      fetchData();
    } catch (err: any) {
      showToast("Gagal menyimpan: " + err.message, "error");
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi("/admin/projects", {
        method: "POST",
        body: JSON.stringify(newProject)
      });
      showToast("Proyek berhasil dibuat!");
      setShowAddProject(false);
      setNewProject({name: "", client_name: "", bos_id: "", mandor_id: ""});
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDeleteProject = (projectId: string) => {
    setConfirmDialog({
      msg: "Yakin ingin menghapus proyek ini? Semua site dan target di dalamnya juga akan terhapus.",
      action: async () => {
        setConfirmDialog(null);
        try {
          await fetchApi(`/admin/projects/${projectId}`, { method: "DELETE" });
          showToast("Proyek berhasil dihapus");
          fetchData();
        } catch(err:any) { showToast(err.message, "error"); }
      }
    });
  };

  const handleSavePassword = async () => {
    if (!newAdminPassword) return;
    try {
      await fetchApi("/admin/password", {
        method: "PUT",
        body: JSON.stringify({ new_password: newAdminPassword })
      });
      showToast("Password Admin berhasil diubah!");
      setNewAdminPassword("");
    } catch(err:any) {
      showToast(err.message, "error");
    }
  };

  const handleSeed = () => {
    setConfirmDialog({
      msg: "Yakin ingin menanam data dummy?",
      action: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetchApi("/admin/seed-dummy", { method: "POST" });
          showToast(res.message);
        } catch(err:any) { showToast(err.message, "error"); }
      }
    });
  };

  const handleClear = () => {
    setConfirmDialog({
      msg: "BAHAYA: Yakin ingin menghapus seluruh proyek & laporan?",
      action: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetchApi("/admin/clear-dummy", { method: "POST" });
          showToast(res.message);
        } catch(err:any) { showToast(err.message, "error"); }
      }
    });
  };

  const handleThemeChange = (t: string) => {
    document.documentElement.className = t;
    localStorage.setItem("mandorhub-theme", t);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  const bosUsers = users.filter((u) => u.role === "contractor");
  const mandorUsers = users.filter((u) => u.role === "mandor");

  return (
    <>
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-intro">
          <div className={`px-6 py-3 rounded-full text-sm font-bold shadow-2xl backdrop-blur-md ${toast.type === 'success' ? 'bg-primary/90 text-on-primary' : 'bg-error/90 text-on-error'}`}>
            {toast.msg}
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface p-6 rounded-3xl shadow-2xl max-w-sm w-full border border-surface-variant">
            <h3 className="font-bold text-lg text-on-surface mb-2">Konfirmasi</h3>
            <p className="text-on-surface-variant mb-6">{confirmDialog.msg}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDialog(null)} className="px-5 py-2 font-bold text-on-surface-variant rounded-xl hover:bg-surface-variant transition-colors">Batal</button>
              <button onClick={confirmDialog.action} className="px-5 py-2 font-bold bg-error text-on-error rounded-xl hover:bg-error-container hover:text-error transition-colors">Ya, Lanjutkan</button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-surface/80 backdrop-blur-md docked full-width top-0 shadow-sm sticky z-40">
        <div className="flex justify-between items-center px-5 py-4 w-full border-b border-surface-variant/50">
          <div>
            <h1 className="font-headline-sm text-xl font-bold text-error tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-6 h-6" /> SUPER ADMIN
            </h1>
          </div>
          <button onClick={logout} className="p-2 rounded-full hover:bg-error-container text-error transition-all">
            <LogOut className="w-6 h-6" />
          </button>
        </div>
        <div className="px-4 pb-4 w-full">
          <div className="flex w-full bg-surface-variant/30 p-1.5 rounded-2xl gap-1 shadow-inner">
            <button 
              onClick={() => setTab("proyek")}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-1 text-[10px] sm:text-xs font-bold rounded-xl transition-all duration-300 ${tab === 'proyek' ? 'bg-surface text-primary shadow-md transform scale-95' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50'}`}
            ><Briefcase className={`w-5 h-5 mb-1 transition-colors ${tab === 'proyek' ? 'text-primary' : 'text-on-surface-variant'}`}/>Proyek</button>
            
            <button 
              onClick={() => setTab("akun")}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-1 text-[10px] sm:text-xs font-bold rounded-xl transition-all duration-300 ${tab === 'akun' ? 'bg-surface text-primary shadow-md transform scale-95' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50'}`}
            ><UserIcon className={`w-5 h-5 mb-1 transition-colors ${tab === 'akun' ? 'text-primary' : 'text-on-surface-variant'}`}/>Akun</button>
            
            <button 
              onClick={() => setTab("db")}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-1 text-[10px] sm:text-xs font-bold rounded-xl transition-all duration-300 ${tab === 'db' ? 'bg-surface text-primary shadow-md transform scale-95' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50'}`}
            ><Settings className={`w-5 h-5 mb-1 transition-colors ${tab === 'db' ? 'text-primary' : 'text-on-surface-variant'}`}/>Pengaturan</button>
            
            <button 
              onClick={() => setTab("spy")}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-1 text-[10px] sm:text-xs font-bold rounded-xl transition-all duration-300 ${tab === 'spy' ? 'bg-surface text-primary shadow-md transform scale-95' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50'}`}
            ><Activity className={`w-5 h-5 mb-1 transition-colors ${tab === 'spy' ? 'text-primary' : 'text-on-surface-variant'}`}/>Mata-mata</button>
          </div>
        </div>
      </header>

      <main className="px-5 py-6 max-w-2xl mx-auto flex flex-col gap-8">
        
        {tab === "proyek" && (
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" /> Manajemen Proyek
              </h2>
              <button 
                onClick={() => setShowAddProject(true)}
                className="bg-primary text-on-primary px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> Tambah
              </button>
            </div>

            {showAddProject && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-surface p-6 rounded-3xl shadow-2xl w-full max-w-md border border-surface-variant max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl text-on-surface">Proyek Baru</h3>
                    <button onClick={() => setShowAddProject(false)} className="p-2 bg-surface-variant rounded-full text-on-surface-variant">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-on-surface mb-2">Nama Proyek</label>
                      <input type="text" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} required className="w-full bg-surface-container-low border border-surface-variant rounded-xl px-4 py-3 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Contoh: Pembangunan Ruko..." />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-on-surface mb-2">Klien (Opsional)</label>
                      <input type="text" value={newProject.client_name} onChange={e => setNewProject({...newProject, client_name: e.target.value})} className="w-full bg-surface-container-low border border-surface-variant rounded-xl px-4 py-3 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Contoh: PT. ABC" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-on-surface mb-2">Pilih Bos</label>
                      <select required value={newProject.bos_id} onChange={e => setNewProject({...newProject, bos_id: e.target.value})} className="w-full bg-surface-container-low border border-surface-variant rounded-xl px-4 py-3 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                        <option value="">-- Pilih Bos --</option>
                        {bosUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-on-surface mb-2">Pilih Mandor</label>
                      <select required value={newProject.mandor_id} onChange={e => setNewProject({...newProject, mandor_id: e.target.value})} className="w-full bg-surface-container-low border border-surface-variant rounded-xl px-4 py-3 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                        <option value="">-- Pilih Mandor --</option>
                        {mandorUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                    <button type="submit" className="w-full bg-primary text-on-primary font-bold py-3 rounded-xl mt-4 hover:bg-primary-container hover:text-on-primary-container transition-all">Simpan Proyek</button>
                  </form>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4">
              {projects.length === 0 ? (
                <div className="text-center py-10 text-on-surface-variant bg-surface-container-lowest rounded-3xl border border-surface-variant">
                  <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Belum ada proyek dibuat.</p>
                </div>
              ) : (
                projects.map(p => (
                  <div key={p.id} className="bg-surface-container-lowest border border-surface-variant p-5 rounded-2xl shadow-sm flex flex-col gap-3 group">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-on-surface">{p.name}</h3>
                        {p.client_name && <p className="text-sm text-on-surface-variant">Klien: {p.client_name}</p>}
                      </div>
                      <button onClick={() => handleDeleteProject(p.id)} className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2 bg-surface-variant/30 p-3 rounded-xl text-sm">
                      <div>
                        <span className="text-on-surface-variant block text-xs uppercase font-bold mb-1">Bos</span>
                        <span className="font-semibold text-on-surface">{p.bos_name || '-'}</span>
                      </div>
                      <div>
                        <span className="text-on-surface-variant block text-xs uppercase font-bold mb-1">Mandor</span>
                        <span className="font-semibold text-on-surface">{p.mandor_name || '-'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {tab === "akun" && (
          <section className="flex flex-col gap-6">
            <div className="bg-primary-container text-on-primary-container p-4 rounded-xl text-sm font-medium">
              Ubah Nama dan Nomor WA Bos / Mandor di sini.
            </div>
            {bosUsers.map(u => (
               <div key={u.id} className="bg-surface-container-lowest border border-surface-variant p-4 rounded-xl">
                 <h3 className="font-bold mb-3 text-on-surface">💼 Akun Bos</h3>
                 <input className="w-full mb-2 bg-surface-container-low p-3 rounded-lg" value={editData[u.id]?.name||""} onChange={e => setEditData({...editData, [u.id]:{...editData[u.id], name: e.target.value}})} />
                 <input className="w-full mb-3 bg-surface-container-low p-3 rounded-lg" value={editData[u.id]?.phone||""} onChange={e => setEditData({...editData, [u.id]:{...editData[u.id], phone: e.target.value}})} />
                 <button onClick={() => handleSaveUser(u.id)} className="w-full bg-primary text-on-primary p-3 rounded-lg font-bold">Simpan</button>
               </div>
            ))}
            {mandorUsers.map(u => (
               <div key={u.id} className="bg-surface-container-lowest border border-surface-variant p-4 rounded-xl">
                 <h3 className="font-bold mb-3 text-on-surface">👷 Akun Mandor</h3>
                 <input className="w-full mb-2 bg-surface-container-low p-3 rounded-lg" value={editData[u.id]?.name||""} onChange={e => setEditData({...editData, [u.id]:{...editData[u.id], name: e.target.value}})} />
                 <input className="w-full mb-3 bg-surface-container-low p-3 rounded-lg" value={editData[u.id]?.phone||""} onChange={e => setEditData({...editData, [u.id]:{...editData[u.id], phone: e.target.value}})} />
                 <button onClick={() => handleSaveUser(u.id)} className="w-full bg-primary text-on-primary p-3 rounded-lg font-bold">Simpan</button>
               </div>
            ))}
          </section>
        )}

        {tab === "db" && (
          <section className="flex flex-col gap-6">
            <div className="bg-surface-container-lowest border border-surface-variant p-5 rounded-2xl">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Paintbrush className="w-5 h-5"/> Tema Visual</h2>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={()=>handleThemeChange('theme-default')} className="bg-[#012d1d] text-white p-3 rounded-xl font-bold">Default (Dark Green)</button>
                <button onClick={()=>handleThemeChange('theme-hacker')} className="bg-[#000000] text-[#00ff41] border border-[#00ff41] p-3 rounded-xl font-mono font-bold">Hacker Mode</button>
                <button onClick={()=>handleThemeChange('theme-baby-green')} className="bg-[#ecf7f0] text-[#2b543b] p-3 rounded-xl font-bold">Baby Green</button>
                <button onClick={()=>handleThemeChange('theme-light')} className="bg-white text-[#2563eb] border border-gray-200 p-3 rounded-xl font-bold">Pure Light</button>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-surface-variant p-5 rounded-2xl">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Database className="w-5 h-5"/> Manajemen Database</h2>
              <button onClick={handleSeed} className="w-full bg-secondary-fixed text-on-secondary-fixed p-3 rounded-xl font-bold mb-3">🌱 Tanam Data Dummy</button>
              <button onClick={handleClear} className="w-full bg-error-container text-error flex justify-center items-center gap-2 p-3 rounded-xl font-bold"><Trash2 className="w-5 h-5"/> Hapus Semua Data Proyek</button>
            </div>

            <div className="bg-surface-container-lowest border border-surface-variant p-5 rounded-2xl">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><ShieldAlert className="w-5 h-5"/> Password Super Admin</h2>
              <input type="password" placeholder="Password Baru" value={newAdminPassword} onChange={e=>setNewAdminPassword(e.target.value)} className="w-full mb-3 bg-surface-container-low p-3 rounded-lg" />
              <button onClick={handleSavePassword} className="w-full bg-primary text-on-primary p-3 rounded-lg font-bold">Ubah Password</button>
            </div>
          </section>
        )}

        {tab === "spy" && (
          <section className="flex flex-col gap-4 font-mono animate-in fade-in duration-500">
             <div className="bg-[#050505] border border-[#222] text-[#00ff41] p-6 rounded-2xl shadow-2xl relative overflow-hidden">
                {/* Decorative scanning line */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#00ff41] to-transparent opacity-50 animate-pulse"></div>
                
                <div className="flex items-center gap-3 mb-2">
                  <div className="relative">
                    <Activity className="w-7 h-7 animate-pulse" />
                    <div className="absolute inset-0 bg-[#00ff41] blur-md opacity-30 animate-pulse"></div>
                  </div>
                  <h2 className="text-xl font-bold tracking-[0.2em] drop-shadow-[0_0_8px_rgba(0,255,65,0.5)]">CENTRAL INTELLIGENCE NODE</h2>
                </div>
                
                <div className="flex items-center justify-between border-b border-[#00ff41]/20 pb-4 mb-6">
                  <p className="text-xs opacity-70 tracking-widest uppercase">
                    Status: <span className="text-[#00ff41] font-bold animate-pulse">ACTIVE</span> <br/>
                    Clearance: <span className="text-error font-bold">LEVEL-9 (SUPER ADMIN)</span>
                  </p>
                  <div className="text-right text-[10px] opacity-50 uppercase">
                    Live Feed<br/>Last 100 Packets
                  </div>
                </div>
                
                {spyLogs.length === 0 && (
                  <div className="text-center py-20 border border-dashed border-[#00ff41]/30 rounded-xl">
                    <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="opacity-50 tracking-widest">NO SIGNALS DETECTED IN THE SECTOR.</p>
                  </div>
                )}
                
                <div className="flex flex-col gap-4">
                  {spyLogs.map((log, i) => (
                    <div key={log.id} className="border-l-4 border-[#00ff41] bg-gradient-to-r from-[#00ff41]/10 to-transparent p-4 rounded-r-xl text-sm relative hover:from-[#00ff41]/20 transition-all group backdrop-blur-sm">
                      <div className="absolute top-0 right-0 p-2 text-[10px] font-bold opacity-30 group-hover:opacity-100 transition-opacity">
                        ID: {log.id.split('-')[0]}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                        <div>
                          <span className="text-[#00ff41]/50 text-[10px] block tracking-widest uppercase mb-1">Timestamp (UTC)</span>
                          <span className="font-bold tracking-wider">{log.created_at}</span>
                        </div>
                        <div>
                          <span className="text-[#00ff41]/50 text-[10px] block tracking-widest uppercase mb-1">Source IP / Origin</span>
                          <span className="font-bold tracking-wider">{log.ip_address}</span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-[#00ff41]/50 text-[10px] block tracking-widest uppercase mb-1">Target Vector (Path)</span>
                          <span className="font-bold tracking-wider bg-[#00ff41]/20 px-2 py-1 rounded inline-block">{log.path}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-[#00ff41]/20">
                        <span className="text-[#00ff41]/50 text-[10px] block tracking-widest uppercase mb-1">Device Footprint (User Agent)</span>
                        <span className="text-[11px] bg-black/60 border border-[#00ff41]/30 p-2 rounded block break-all font-mono opacity-80 leading-relaxed shadow-inner">
                          {log.user_agent}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </section>
        )}
      </main>
    </>
  );
}
