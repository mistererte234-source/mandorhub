"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi, getToken } from "@/lib/api";
import { ArrowLeft, Loader2, Save, User as UserIcon, Phone } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Form states
  const [editData, setEditData] = useState<{ [id: string]: { name: string; phone: string } }>({});

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }

    fetchUsers();
  }, [router]);

  const fetchUsers = () => {
    fetchApi("/users")
      .then((res) => {
        setUsers(res);
        const ed: any = {};
        res.forEach((u: any) => {
          ed[u.id] = { name: u.name, phone: u.phone || "" };
        });
        setEditData(ed);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleSave = async (userId: string) => {
    setSavingId(userId);
    try {
      const data = editData[userId];
      await fetchApi(`/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      alert("Data berhasil disimpan!");
      fetchUsers();
    } catch (err: any) {
      alert("Gagal menyimpan: " + err.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleInputChange = (userId: string, field: "name" | "phone", value: string) => {
    setEditData((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value },
    }));
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

  const UserCard = ({ u }: { u: any }) => (
    <div key={u.id} className="bg-surface-container-lowest border border-surface-variant p-5 rounded-2xl shadow-sm flex flex-col gap-4">
      <div className="flex justify-between items-center border-b border-surface-variant pb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm ${u.role === 'contractor' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-variant text-on-surface-variant'}`}>
            {u.role === 'contractor' ? '👔' : '👷'}
          </div>
          <div>
            <h3 className="font-bold text-on-surface text-lg">{u.role === "contractor" ? "Akun Bos" : "Akun Mandor"}</h3>
            <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Role: {u.role}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label className="text-sm font-semibold text-on-surface flex items-center gap-2 mb-1">
            <UserIcon className="w-4 h-4 text-primary" /> Nama Lengkap
          </label>
          <input
            type="text"
            value={editData[u.id]?.name || ""}
            onChange={(e) => handleInputChange(u.id, "name", e.target.value)}
            className="w-full bg-surface-container-low border border-surface-variant text-on-surface rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-on-surface flex items-center gap-2 mb-1">
            <Phone className="w-4 h-4 text-primary" /> Nomor WhatsApp
          </label>
          <input
            type="tel"
            value={editData[u.id]?.phone || ""}
            onChange={(e) => handleInputChange(u.id, "phone", e.target.value)}
            className="w-full bg-surface-container-low border border-surface-variant text-on-surface rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={() => handleSave(u.id)}
          disabled={savingId === u.id}
          className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full font-bold shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-50"
        >
          {savingId === u.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Simpan Data
        </button>
      </div>
    </div>
  );

  return (
    <>
      <header className="bg-surface/80 backdrop-blur-md docked full-width top-0 shadow-sm sticky z-40">
        <div className="flex items-center gap-4 px-5 py-4 w-full border-b border-surface-variant/50">
          <Link href="/kontraktor" className="p-2 -ml-2 rounded-full hover:bg-surface-variant active:scale-95 transition-all text-on-surface-variant">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="font-headline-sm text-lg font-bold text-on-surface tracking-tight">
              Pengaturan Akun
            </h1>
            <p className="font-body-sm text-sm text-on-surface-variant">
              Kelola nomor WA Bos & Mandor
            </p>
          </div>
        </div>
      </header>

      <main className="px-5 py-6 max-w-2xl mx-auto flex flex-col gap-8">
        <section>
          <h2 className="text-xl font-bold mb-4 text-on-surface">Data Bos (Admin)</h2>
          <div className="flex flex-col gap-4">
            {bosUsers.map(u => <UserCard key={u.id} u={u} />)}
          </div>
        </section>
        
        <section>
          <h2 className="text-xl font-bold mb-4 text-on-surface">Data Tim Mandor</h2>
          <div className="flex flex-col gap-4">
            {mandorUsers.map(u => <UserCard key={u.id} u={u} />)}
          </div>
        </section>
      </main>
    </>
  );
}
