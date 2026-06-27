"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchApi, logout, getToken } from "@/lib/api";
import {
  LogOut, Loader2, Save, User as UserIcon, Database, Paintbrush,
  Activity, ShieldAlert, Trash2, Briefcase, Plus, X, Settings,
  Edit2, Phone, UserPlus
} from "lucide-react";

type TabType = "proyek" | "akun" | "progress" | "pengaturan" | "spy";

interface Project {
  id: string;
  name: string;
  client_name?: string;
  status: string;
  bos_id: string;
  bos_name: string;
  mandor_id: string;
  mandor_name: string;
  bendahara_id?: string;
  bendahara_name?: string;
  progress_percent?: number;
}

interface User {
  id: string;
  name: string;
  role: string;
  phone?: string;
}

const ROLE_LABEL: Record<string, string> = {
  contractor: "💼 Bos",
  mandor: "👷 Mandor",
  bendahara: "💰 Bendahara",
  admin: "🛡️ Super Admin",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Aktif",
  paused: "Ditunda",
  done: "Selesai",
};

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>("proyek");

  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [spyLogs, setSpyLogs] = useState<any[]>([]);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const [confirmDialog, setConfirmDialog] = useState<{ msg: string; action: () => void } | null>(null);

  // ── Add Project Modal ──
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    client_name: "",
    bos:      { name: "", phone: "" },
    mandor:   { name: "", phone: "" },
    bendahara: { name: "", phone: "" },   // kosong = tidak ada bendahara
  });

  // ── Edit Project Modal ──
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editProjectForm, setEditProjectForm] = useState({
    name: "", client_name: "", bos_id: "", mandor_id: "", bendahara_id: "", status: ""
  });

  // ── Add User Modal ──
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", phone: "", role: "mandor" });

  // ── Edit User ──
  const [editData, setEditData] = useState<Record<string, { name: string; phone: string }>>({});

  // ── Settings ──
  const [newAdminPassword, setNewAdminPassword] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, uRes, sRes] = await Promise.all([
        fetchApi("/admin/projects"),
        fetchApi("/users"),
        fetchApi("/admin/spy-logs"),
      ]);
      setProjects(pRes);
      setUsers(uRes);
      const ed: Record<string, { name: string; phone: string }> = {};
      uRes.forEach((u: User) => { ed[u.id] = { name: u.name, phone: u.phone || "" }; });
      setEditData(ed);
      setSpyLogs(sRes);
      setLoading(false);
    } catch (err: any) {
      if (err.message?.includes("401") || err.message?.includes("403") || err.message?.includes("Sesi telah habis")) {
        logout();
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    fetchData();
  }, [router, fetchData]);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const bosUsers       = users.filter(u => u.role === "contractor");
  const mandorUsers    = users.filter(u => u.role === "mandor");
  const bendaharaUsers = users.filter(u => u.role === "bendahara");

  // ─── Project handlers ───────────────────────────────────────────────────────
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Kirim bendahara hanya jika nama/nomor diisi
      const hasBendaharaName = Boolean(newProject.bendahara.name.trim());
      const hasBendaharaPhone = Boolean(newProject.bendahara.phone.trim());
      if (hasBendaharaName !== hasBendaharaPhone) {
        showToast("Lengkapi nama dan nomor HP Bendahara, atau kosongkan keduanya.", "error");
        return;
      }
      const hasBendahara = hasBendaharaName && hasBendaharaPhone;
      await fetchApi("/admin/projects", {
        method: "POST",
        body: JSON.stringify({
          name: newProject.name.trim(),
          client_name: newProject.client_name.trim() || null,
          bos: {
            name: newProject.bos.name.trim(),
            phone: newProject.bos.phone.trim(),
          },
          mandor: {
            name: newProject.mandor.name.trim(),
            phone: newProject.mandor.phone.trim(),
          },
          bendahara: hasBendahara ? {
            name: newProject.bendahara.name.trim(),
            phone: newProject.bendahara.phone.trim(),
          } : null,
        }),
      });
      showToast("Proyek & akun berhasil dibuat!");
      setShowAddProject(false);
      setNewProject({
        name: "", client_name: "",
        bos:      { name: "", phone: "" },
        mandor:   { name: "", phone: "" },
        bendahara:{ name: "", phone: "" },
      });
      fetchData();
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const handleOpenEditProject = (p: Project) => {
    setEditProject(p);
    setEditProjectForm({
      name: p.name,
      client_name: p.client_name || "",
      bos_id: p.bos_id,
      mandor_id: p.mandor_id,
      bendahara_id: p.bendahara_id || "",
      status: p.status,
    });
  };

  const handleSaveEditProject = async () => {
    if (!editProject) return;
    try {
      await fetchApi(`/admin/projects/${editProject.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...editProjectForm,
          bendahara_id: editProjectForm.bendahara_id || null,
        }),
      });
      showToast("Proyek berhasil diperbarui!");
      setEditProject(null);
      fetchData();
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const handleDeleteProject = (id: string, name: string) => {
    setConfirmDialog({
      msg: `Yakin hapus proyek "${name}"? Semua data di dalamnya akan ikut terhapus.`,
      action: async () => {
        setConfirmDialog(null);
        try {
          await fetchApi(`/admin/projects/${id}`, { method: "DELETE" });
          showToast("Proyek berhasil dihapus");
          fetchData();
        } catch (err: any) { showToast(err.message, "error"); }
      },
    });
  };

  // ─── User handlers ──────────────────────────────────────────────────────────
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchApi("/users", { method: "POST", body: JSON.stringify(newUser) });
      setUsers([...users, res]);
      setEditData(prev => ({ ...prev, [res.id]: { name: res.name, phone: res.phone } }));
      setShowAddUser(false);
      setNewUser({ name: "", phone: "", role: "mandor" });
      showToast("Akun berhasil dibuat!");
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const handleSaveUser = async (userId: string) => {
    try {
      await fetchApi(`/users/${userId}`, { method: "PUT", body: JSON.stringify(editData[userId]) });
      showToast("Data berhasil disimpan!");
      fetchData();
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    setConfirmDialog({
      msg: `Yakin nonaktifkan akun "${userName}"?`,
      action: async () => {
        setConfirmDialog(null);
        try {
          await fetchApi(`/users/${userId}`, { method: "DELETE" });
          showToast("Akun berhasil dinonaktifkan!");
          fetchData();
        } catch (err: any) { showToast(err.message, "error"); }
      },
    });
  };

  // ─── Settings handlers ──────────────────────────────────────────────────────
  const handleSavePassword = async () => {
    if (!newAdminPassword) return;
    try {
      await fetchApi("/admin/password", { method: "PUT", body: JSON.stringify({ new_password: newAdminPassword }) });
      showToast("Password berhasil diubah!");
      setNewAdminPassword("");
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const handleMigrate = () => setConfirmDialog({
    msg: "Yakin melakukan migrasi database (update fitur)?",
    action: async () => {
      setConfirmDialog(null);
      try { const r = await fetchApi("/admin/migrate-db", { method: "POST" }); showToast(r.message); }
      catch (err: any) { showToast(err.message, "error"); }
    },
  });

  const handleSeed = () => setConfirmDialog({
    msg: "Yakin tanam data dummy?",
    action: async () => {
      setConfirmDialog(null);
      try { const r = await fetchApi("/admin/seed-dummy", { method: "POST" }); showToast(r.message); }
      catch (err: any) { showToast(err.message, "error"); }
    },
  });

  const handleClear = () => setConfirmDialog({
    msg: "BAHAYA: Hapus SEMUA proyek & laporan?",
    action: async () => {
      setConfirmDialog(null);
      try { const r = await fetchApi("/admin/clear-dummy", { method: "POST" }); showToast(r.message); }
      catch (err: any) { showToast(err.message, "error"); }
    },
  });

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] animate-intro pointer-events-none">
          <div className={`px-6 py-3 rounded-full text-sm font-bold shadow-2xl backdrop-blur-md
            ${toast.type === "success" ? "bg-primary/90 text-on-primary" : "bg-error/90 text-on-error"}`}>
            {toast.msg}
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface p-6 rounded-3xl shadow-2xl max-w-sm w-full border border-surface-variant">
            <h3 className="font-bold text-lg text-on-surface mb-2">Konfirmasi</h3>
            <p className="text-on-surface-variant mb-6 text-sm">{confirmDialog.msg}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDialog(null)} className="px-5 py-2 font-bold text-on-surface-variant rounded-xl hover:bg-surface-variant transition-colors">Batal</button>
              <button onClick={confirmDialog.action} className="px-5 py-2 font-bold bg-error text-on-error rounded-xl hover:opacity-90 transition-all">Ya, Lanjutkan</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface p-6 rounded-3xl shadow-2xl w-full max-w-md border border-surface-variant max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-on-surface">Edit Proyek</h3>
              <button onClick={() => setEditProject(null)} className="p-2 bg-surface-variant rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Nama Proyek</label>
                <input value={editProjectForm.name} onChange={e => setEditProjectForm({...editProjectForm, name: e.target.value})}
                  className="w-full bg-surface-variant/20 border border-surface-variant/50 font-hacker rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Klien</label>
                <input value={editProjectForm.client_name} onChange={e => setEditProjectForm({...editProjectForm, client_name: e.target.value})}
                  className="w-full bg-surface-variant/20 border border-surface-variant/50 font-hacker rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary" placeholder="Nama klien..." />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Bos</label>
                <select value={editProjectForm.bos_id} onChange={e => setEditProjectForm({...editProjectForm, bos_id: e.target.value})}
                  className="w-full bg-surface-variant/20 border border-surface-variant/50 font-hacker rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary">
                  {bosUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Mandor</label>
                <select value={editProjectForm.mandor_id} onChange={e => setEditProjectForm({...editProjectForm, mandor_id: e.target.value})}
                  className="w-full bg-surface-variant/20 border border-surface-variant/50 font-hacker rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary">
                  {mandorUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Bendahara <span className="font-normal text-on-surface-variant">(Opsional)</span></label>
                <select value={editProjectForm.bendahara_id} onChange={e => setEditProjectForm({...editProjectForm, bendahara_id: e.target.value})}
                  className="w-full bg-surface-variant/20 border border-surface-variant/50 font-hacker rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary">
                  <option value="">-- Tidak Ada --</option>
                  {bendaharaUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Status</label>
                <select value={editProjectForm.status} onChange={e => setEditProjectForm({...editProjectForm, status: e.target.value})}
                  className="w-full bg-surface-variant/20 border border-surface-variant/50 font-hacker rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary">
                  <option value="active">Aktif</option>
                  <option value="paused">Ditunda</option>
                  <option value="done">Selesai</option>
                </select>
              </div>
              <button onClick={handleSaveEditProject}
                className="w-full bg-primary text-on-primary font-bold py-3 rounded-xl mt-2 hover:opacity-90 transition-all">
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {showAddProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface p-6 rounded-3xl shadow-2xl w-full max-w-md border border-surface-variant max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-on-surface">Proyek Baru</h3>
              <button onClick={() => setShowAddProject(false)} className="p-2 bg-surface-variant rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Nama Proyek *</label>
                <input required value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})}
                  className="w-full bg-surface-variant/20 border border-surface-variant/50 font-hacker rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary"
                  placeholder="Contoh: Ruko Pak Budi..." />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Nama Klien</label>
                <input value={newProject.client_name} onChange={e => setNewProject({...newProject, client_name: e.target.value})}
                  className="w-full bg-surface-variant/20 border border-surface-variant/50 font-hacker rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary"
                  placeholder="Contoh: PT. ABC..." />
              </div>
              <div className="rounded-2xl border border-surface-variant glass-panel p-4">
                <div className="flex items-center gap-2 mb-3">
                  <UserPlus className="w-4 h-4 text-primary" />
                  <h4 className="font-bold text-on-surface">Buat Akun Bos</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1.5">Nama Bos *</label>
                    <input required value={newProject.bos.name} onChange={e => setNewProject({...newProject, bos: {...newProject.bos, name: e.target.value}})}
                      className="w-full bg-surface-variant/20 border border-surface-variant/50 font-hacker rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary"
                      placeholder="Contoh: Pak Hari Sulis" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1.5">Nomor HP *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                      <input required inputMode="tel" value={newProject.bos.phone} onChange={e => setNewProject({...newProject, bos: {...newProject.bos, phone: e.target.value}})}
                        className="w-full bg-surface-variant/20 border border-surface-variant/50 font-hacker rounded-xl pl-10 pr-4 py-3 text-on-surface outline-none focus:border-primary"
                        placeholder="08xxxxxxxxxx" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-surface-variant glass-panel p-4">
                <div className="flex items-center gap-2 mb-3">
                  <UserPlus className="w-4 h-4 text-primary" />
                  <h4 className="font-bold text-on-surface">Buat Akun Mandor</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1.5">Nama Mandor *</label>
                    <input required value={newProject.mandor.name} onChange={e => setNewProject({...newProject, mandor: {...newProject.mandor, name: e.target.value}})}
                      className="w-full bg-surface-variant/20 border border-surface-variant/50 font-hacker rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary"
                      placeholder="Contoh: Pak Agus" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1.5">Nomor HP *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                      <input required inputMode="tel" value={newProject.mandor.phone} onChange={e => setNewProject({...newProject, mandor: {...newProject.mandor, phone: e.target.value}})}
                        className="w-full bg-surface-variant/20 border border-surface-variant/50 font-hacker rounded-xl pl-10 pr-4 py-3 text-on-surface outline-none focus:border-primary"
                        placeholder="08xxxxxxxxxx" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-surface-variant glass-panel p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-primary" />
                    <h4 className="font-bold text-on-surface">Buat Akun Bendahara</h4>
                  </div>
                  <span className="text-xs font-semibold text-on-surface-variant">Opsional</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1.5">Nama Bendahara</label>
                    <input value={newProject.bendahara.name} onChange={e => setNewProject({...newProject, bendahara: {...newProject.bendahara, name: e.target.value}})}
                      className="w-full bg-surface-variant/20 border border-surface-variant/50 font-hacker rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary"
                      placeholder="Contoh: Bu Rina" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1.5">Nomor HP</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                      <input inputMode="tel" value={newProject.bendahara.phone} onChange={e => setNewProject({...newProject, bendahara: {...newProject.bendahara, phone: e.target.value}})}
                        className="w-full bg-surface-variant/20 border border-surface-variant/50 font-hacker rounded-xl pl-10 pr-4 py-3 text-on-surface outline-none focus:border-primary"
                        placeholder="08xxxxxxxxxx" />
                    </div>
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full bg-primary text-on-primary font-bold py-3 rounded-xl mt-2 hover:opacity-90 transition-all flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Simpan Proyek & Akun
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface p-6 rounded-3xl shadow-2xl w-full max-w-md border border-surface-variant">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-on-surface">Akun Baru</h3>
              <button onClick={() => setShowAddUser(false)} className="p-2 bg-surface-variant rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Nama</label>
                <input required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})}
                  className="w-full bg-surface-variant/20 border border-surface-variant/50 font-hacker rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary"
                  placeholder="Nama lengkap..." />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Nomor HP (WhatsApp)</label>
                <input required value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})}
                  className="w-full bg-surface-variant/20 border border-surface-variant/50 font-hacker rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary"
                  placeholder="08xxxxxxxxxx" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Role</label>
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
                  className="w-full bg-surface-variant/20 border border-surface-variant/50 font-hacker rounded-xl px-4 py-3 text-on-surface outline-none focus:border-primary">
                  <option value="mandor">Mandor</option>
                  <option value="contractor">Bos / Kontraktor</option>
                  <option value="bendahara">Bendahara</option>
                  <option value="admin">Super Admin</option>
                </select>
              </div>
              <button type="submit" className="w-full py-3 rounded-xl font-bold text-lg bg-primary text-on-primary hover:opacity-90 transition-all mt-2">
                Simpan Akun
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="bg-surface/80 backdrop-blur-md sticky top-0 z-40 border-b border-surface-variant/50 shadow-sm">
        <div className="flex justify-between items-center px-5 py-4">
          <h1 className="font-bold text-xl text-error tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6" /> SUPER ADMIN
          </h1>
          <button onClick={logout} className="p-2 rounded-full hover:bg-error-container text-error transition-all">
            <LogOut className="w-6 h-6" />
          </button>
        </div>
        <div className="px-4 pb-3">
          <div className="flex w-full glass-panel p-1 rounded-2xl gap-1 shadow-inner">
            {(["proyek", "akun", "progress", "pengaturan", "spy"] as TabType[]).map(t => {
              const icons: Record<TabType, React.ReactNode> = {
                proyek: <Briefcase className="w-4 h-4" />,
                akun: <UserIcon className="w-4 h-4" />,
                progress: <Activity className="w-4 h-4" />,
                pengaturan: <Settings className="w-4 h-4" />,
                spy: <ShieldAlert className="w-4 h-4" />,
              };
              const labels: Record<TabType, string> = { proyek: "Proyek", akun: "Akun", progress: "Progress", pengaturan: "Pengaturan", spy: "Mata-mata" };
              return (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 flex flex-col items-center py-2 px-1 text-[10px] sm:text-xs font-bold rounded-xl transition-all duration-200
                    ${tab === t ? "bg-surface text-primary shadow-md scale-95" : "text-on-surface-variant hover:bg-surface-variant/50"}`}>
                  {icons[t]}
                  <span className="mt-0.5">{labels[t]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-3xl mx-auto flex flex-col gap-6">

        {/* ══════════════ TAB: PROYEK ══════════════ */}
        {tab === "proyek" && (
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" /> Manajemen Proyek
              </h2>
              <button onClick={() => setShowAddProject(true)}
                className="bg-primary text-on-primary px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-sm">
                <Plus className="w-4 h-4" /> Tambah
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-16 text-on-surface-variant glass-panel rounded-3xl border border-surface-variant">
                <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Belum ada proyek.</p>
                <p className="text-sm mt-1 opacity-60">Klik &ldquo;Tambah&rdquo; untuk membuat proyek pertama.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-surface-variant shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-variant/40 text-on-surface-variant">
                      <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wide">Proyek</th>
                      <th className="text-left px-3 py-3 font-bold text-xs uppercase tracking-wide">Bos</th>
                      <th className="text-left px-3 py-3 font-bold text-xs uppercase tracking-wide">Mandor</th>
                      <th className="text-left px-3 py-3 font-bold text-xs uppercase tracking-wide">Bendahara</th>
                      <th className="text-left px-3 py-3 font-bold text-xs uppercase tracking-wide">Status</th>
                      <th className="px-3 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-variant/50">
                    {projects.map(p => (
                      <tr key={p.id} className="glass-panel hover:bg-surface-variant/20 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="font-bold text-on-surface">{p.name}</div>
                          {p.client_name && <div className="text-xs text-on-surface-variant mt-0.5">{p.client_name}</div>}
                        </td>
                        <td className="px-3 py-3 text-on-surface font-medium">{p.bos_name}</td>
                        <td className="px-3 py-3 text-on-surface font-medium">{p.mandor_name}</td>
                        <td className="px-3 py-3 text-on-surface-variant">{p.bendahara_name || <span className="italic opacity-50">—</span>}</td>
                        <td className="px-3 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            p.status === "active" ? "bg-primary/10 text-primary" :
                            p.status === "done" ? "bg-green-500/10 text-green-600" :
                            "bg-yellow-500/10 text-yellow-600"
                          }`}>
                            {STATUS_LABEL[p.status] || p.status}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenEditProject(p)}
                              className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteProject(p.id, p.name)}
                              className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container rounded-lg transition-colors" title="Hapus">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ══════════════ TAB: PROGRESS ══════════════ */}
        {tab === "progress" && (
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> Progress Proyek
              </h2>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-16 text-on-surface-variant glass-panel rounded-3xl border border-surface-variant">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Belum ada proyek.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map(p => (
                  <div key={p.id} className="glass-panel rounded-2xl p-5 hover:shadow-md transition-shadow">
                    <h3 className="font-bold text-lg text-on-surface">{p.name}</h3>
                    <p className="text-xs text-on-surface-variant mb-4">{p.client_name || "Tanpa Klien"}</p>
                    
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-sm font-medium text-on-surface">Progress Aktual</span>
                      <span className="text-xl font-bold text-primary">{p.progress_percent || 0}%</span>
                    </div>
                    
                    <div className="w-full bg-surface-variant/50 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-primary h-3 rounded-full transition-all duration-1000 ease-out relative"
                        style={{ width: `${Math.min(100, p.progress_percent || 0)}%` }}
                      >
                        <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/20 animate-pulse" />
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-surface-variant/20 p-2 rounded-xl border border-surface-variant">
                        <span className="opacity-70 block mb-1">Bos</span>
                        <span className="font-bold">{p.bos_name}</span>
                      </div>
                      <div className="bg-surface-variant/20 p-2 rounded-xl border border-surface-variant">
                        <span className="opacity-70 block mb-1">Mandor</span>
                        <span className="font-bold">{p.mandor_name}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ══════════════ TAB: AKUN ══════════════ */}
        {tab === "akun" && (
          <section className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center mb-1">
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-primary" /> Manajemen Akun
              </h2>
              <button onClick={() => setShowAddUser(true)}
                className="bg-primary text-on-primary px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 shadow-sm transition-all">
                <Plus className="w-4 h-4" /> Tambah Akun
              </button>
            </div>

            {(["contractor", "mandor", "bendahara", "admin"] as const).map(role => {
              const roleUsers = users.filter(u => u.role === role);
              if (roleUsers.length === 0) return null;
              return (
                <div key={role}>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 px-1">
                    {ROLE_LABEL[role]}
                  </h3>
                  <div className="flex flex-col gap-3">
                    {roleUsers.map(u => (
                      <div key={u.id} className="glass-panel p-4 rounded-2xl">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            className="flex-1 min-w-0 bg-surface-variant/20 border border-surface-variant/50 font-hacker px-3 py-2.5 rounded-xl text-on-surface font-hacker outline-none focus:border-primary"
                            placeholder="Nama"
                            value={editData[u.id]?.name || ""}
                            onChange={e => setEditData(prev => ({ ...prev, [u.id]: { ...prev[u.id], name: e.target.value } }))}
                          />
                          <input
                            className="flex-1 min-w-0 bg-surface-variant/20 border border-surface-variant/50 font-hacker px-3 py-2.5 rounded-xl text-on-surface font-hacker outline-none focus:border-primary"
                            placeholder="Nomor HP (WhatsApp)"
                            value={editData[u.id]?.phone || ""}
                            onChange={e => setEditData(prev => ({ ...prev, [u.id]: { ...prev[u.id], phone: e.target.value } }))}
                          />
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => handleSaveUser(u.id)}
                              className="flex items-center justify-center w-11 h-11 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm hover:shadow-md" title="Simpan Perubahan">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteUser(u.id, u.name)}
                              className="flex items-center justify-center w-11 h-11 rounded-full bg-error/10 text-error hover:bg-error hover:text-white transition-all shadow-sm hover:shadow-md" title="Nonaktifkan">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* ══════════════ TAB: PENGATURAN ══════════════ */}
        {tab === "pengaturan" && (
          <section className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="glass-panel p-5 rounded-2xl">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Paintbrush className="w-5 h-5" /> Tema Visual</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "theme-default", label: "Default (Dark Green)", cls: "bg-[#012d1d] text-white" },
                  { key: "theme-hacker", label: "Hacker Mode", cls: "bg-black text-[#00ff41] border border-[#00ff41] font-mono" },
                  { key: "theme-baby-green", label: "Baby Green", cls: "bg-[#ecf7f0] text-[#2b543b]" },
                  { key: "theme-light", label: "Pure Light", cls: "bg-white text-[#2563eb] border border-gray-200" },
                ].map(t => (
                  <button key={t.key}
                    onClick={() => { document.documentElement.className = t.key; localStorage.setItem("mandorhub-theme", t.key); }}
                    className={`${t.cls} p-3 rounded-xl font-bold text-sm transition-all hover:scale-95 active:scale-90`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Database className="w-5 h-5" /> Manajemen Database</h2>
              <div className="flex flex-col gap-3">
                <button onClick={handleMigrate} className="w-full bg-primary text-on-primary p-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-md">
                  🚀 Migrasi Database (Update Fitur Baru)
                </button>
                <button onClick={handleSeed} className="w-full bg-secondary-fixed text-on-secondary-fixed p-3 rounded-xl font-bold hover:opacity-90 transition-all">
                  🌱 Tanam Data Dummy
                </button>
                <button onClick={handleClear} className="w-full bg-error-container text-error flex justify-center items-center gap-2 p-3 rounded-xl font-bold hover:opacity-90 transition-all">
                  <Trash2 className="w-5 h-5" /> Hapus Semua Data Proyek
                </button>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><ShieldAlert className="w-5 h-5" /> Password Super Admin</h2>
              <input type="password" placeholder="Password baru..." value={newAdminPassword}
                onChange={e => setNewAdminPassword(e.target.value)}
                className="w-full mb-3 bg-surface-variant/20 border border-surface-variant/50 font-hacker px-4 py-3 rounded-xl outline-none focus:border-primary text-on-surface" />
              <button onClick={handleSavePassword} className="w-full bg-primary text-on-primary p-3 rounded-xl font-bold hover:opacity-90 transition-all">
                Ubah Password
              </button>
            </div>
          </section>
        )}

        {/* ══════════════ TAB: SPY ══════════════ */}
        {tab === "spy" && (
          <section className="flex flex-col gap-4 font-mono animate-in fade-in duration-500">
            <div className="bg-[#050505] border border-[#222] text-[#00ff41] p-6 rounded-2xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#00ff41] to-transparent opacity-50 animate-pulse" />
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-7 h-7 animate-pulse" />
                <h2 className="text-xl font-bold tracking-[0.2em] drop-shadow-[0_0_8px_rgba(0,255,65,0.5)]">CENTRAL INTELLIGENCE NODE</h2>
              </div>
              <div className="flex justify-between border-b border-[#00ff41]/20 pb-4 mb-6">
                <p className="text-xs opacity-70 tracking-widest uppercase">
                  Status: <span className="text-[#00ff41] font-bold animate-pulse">ACTIVE</span><br />
                  Clearance: <span className="text-red-400 font-bold">LEVEL-9 (SUPER ADMIN)</span>
                </p>
                <div className="text-right text-[10px] opacity-50 uppercase">Live Feed<br />Last 100 Packets</div>
              </div>

              {spyLogs.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-[#00ff41]/30 rounded-xl">
                  <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="opacity-50 tracking-widest">NO SIGNALS DETECTED.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {spyLogs.map(log => {
                    let identity = "ANONYMOUS";
                    let cleanUa = log.user_agent || "";
                    const identityMatch = cleanUa.match(/^\[(.*?)\] (.*)/);
                    if (identityMatch) {
                      identity = identityMatch[1].toUpperCase();
                      cleanUa = identityMatch[2];
                    }

                    return (
                    <div key={log.id} className="border-l-4 border-[#00ff41] bg-gradient-to-r from-[#00ff41]/10 to-transparent p-4 rounded-r-xl hover:from-[#00ff41]/20 transition-all group relative">
                      <div className="absolute top-0 right-0 p-2 text-[10px] font-bold opacity-30 group-hover:opacity-100 transition-opacity">ID: {log.id.split("-")[0]}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        {[
                          { label: "Identity (Role)", val: identity, badge: identity !== "ANONYMOUS" },
                          { label: "Timestamp (WIB)", val: log.created_at },
                          { label: "Source IP", val: log.ip_address },
                          { label: "Location / City", val: log.city || "Unknown", white: true },
                          { label: "ISP / Provider", val: log.isp || "Unknown", white: true },
                          { label: "Device Platform", val: log.browser && log.os ? `${log.browser} on ${log.os} (${log.device_type})` : "Analyzing...", white: true },
                          { label: "Target Vector (Path)", val: log.path, badge: true },
                        ].map(({ label, val, white, badge }, i) => (
                          <div key={i}>
                            <span className="text-[#00ff41]/50 text-[10px] block tracking-widest uppercase mb-1">{label}</span>
                            {badge ? (
                              <span className={`font-bold px-2 py-0.5 rounded inline-block text-sm ${identity !== 'ANONYMOUS' && label === 'Identity (Role)' ? 'bg-error/20 text-error border border-error/50' : 'bg-[#00ff41]/20 text-white'}`}>{val}</span>
                            ) : (
                              <span className={`font-bold tracking-wider text-sm ${white ? "text-white" : ""}`}>{val}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t border-[#00ff41]/20">
                        <span className="text-[#00ff41]/50 text-[10px] block tracking-widest uppercase mb-1">Device Footprint</span>
                        <span className="text-[10px] bg-black/60 border border-[#00ff41]/30 p-2 rounded block break-all opacity-70 leading-relaxed font-mono">{cleanUa}</span>
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </>
  );
}

