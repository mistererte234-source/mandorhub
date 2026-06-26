"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi, logout, getToken } from "@/lib/api";
import { LogOut, Loader2, Save, User as UserIcon, Phone, Database, Paintbrush, Activity, ShieldAlert, Trash2 } from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"akun" | "db" | "spy">("akun");
  
  const [users, setUsers] = useState<any[]>([]);
  const [editData, setEditData] = useState<{ [id: string]: { name: string; phone: string } }>({});
  
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [spyLogs, setSpyLogs] = useState<any[]>([]);

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
      const [uRes, sRes] = await Promise.all([
        fetchApi("/users"),
        fetchApi("/admin/spy-logs")
      ]);
      setUsers(uRes);
      const ed: any = {};
      uRes.forEach((u: any) => {
        ed[u.id] = { name: u.name, phone: u.phone || "" };
      });
      setEditData(ed);
      setSpyLogs(sRes);
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
        <div className="flex w-full">
          <button 
            onClick={() => setTab("akun")}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${tab === 'akun' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'}`}
          >Akun</button>
          <button 
            onClick={() => setTab("db")}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${tab === 'db' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'}`}
          >Pengaturan</button>
          <button 
            onClick={() => setTab("spy")}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-1 ${tab === 'spy' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'}`}
          ><Activity className="w-4 h-4"/> Mata-mata</button>
        </div>
      </header>

      <main className="px-5 py-6 max-w-2xl mx-auto flex flex-col gap-8">
        
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
          <section className="flex flex-col gap-4">
             <div className="bg-error-container text-on-error-container p-4 rounded-xl text-sm font-medium">
              Log akses seluruh pengunjung web secara diam-diam. Menampilkan 100 log terakhir.
            </div>
            {spyLogs.length === 0 && <p className="text-center text-on-surface-variant mt-10">Belum ada pengunjung.</p>}
            {spyLogs.map(log => (
              <div key={log.id} className="bg-surface-container-lowest border border-surface-variant p-4 rounded-xl text-sm font-mono flex flex-col gap-1">
                <span className="text-primary font-bold">{log.created_at}</span>
                <span className="text-on-surface"><span className="text-on-surface-variant">IP:</span> {log.ip_address}</span>
                <span className="text-on-surface"><span className="text-on-surface-variant">Path:</span> {log.path}</span>
                <span className="text-xs text-on-surface-variant mt-2 bg-surface-container p-2 rounded truncate">{log.user_agent}</span>
              </div>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
