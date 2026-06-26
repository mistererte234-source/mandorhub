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
      alert("Data berhasil disimpan!");
      fetchData();
    } catch (err: any) {
      alert("Gagal menyimpan: " + err.message);
    }
  };

  const handleSavePassword = async () => {
    if (!newAdminPassword) return;
    try {
      await fetchApi("/admin/password", {
        method: "PUT",
        body: JSON.stringify({ new_password: newAdminPassword })
      });
      alert("Password Admin berhasil diubah!");
      setNewAdminPassword("");
    } catch(err:any) {
      alert(err.message);
    }
  };

  const handleSeed = async () => {
    if(!confirm("Yakin ingin menanam data dummy?")) return;
    try {
      const res = await fetchApi("/admin/seed-dummy", { method: "POST" });
      alert(res.message);
    } catch(err:any) { alert(err.message); }
  };

  const handleClear = async () => {
    if(!confirm("BAHAYA: Yakin ingin menghapus seluruh proyek & laporan?")) return;
    try {
      const res = await fetchApi("/admin/clear-dummy", { method: "POST" });
      alert(res.message);
    } catch(err:any) { alert(err.message); }
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
