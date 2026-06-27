"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi, logout, getToken } from "@/lib/api";
import { Loader2, LogOut, Send, MessageCircle, Plus, CheckSquare } from "lucide-react";
import Image from "next/image";

export default function MandorDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [workDone, setWorkDone] = useState("");
  const [attendance, setAttendance] = useState<{ role: string; count: number; names: string }[]>([
    { role: "Tukang", count: 0, names: "" },
    { role: "Kuli", count: 0, names: "" }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targets, setTargets] = useState<any[]>([]);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    fetchDashboard();
  }, [router]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetchApi("/dashboard");
      setData(res);
      if (res.sites && res.sites.length > 0) {
        // Fetch targets for this project
        const site = res.sites[0];
        if (site.project_id) {
          const t = await fetchApi(`/targets/project/${site.project_id}`);
          setTargets(t);
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.message.includes("401")) logout();
    } finally {
      setLoading(false);
    }
  };

  const updateAttendance = (index: number, field: string, value: any) => {
    const newAtt = [...attendance];
    newAtt[index] = { ...newAtt[index], [field]: value };
    setAttendance(newAtt);
  };

  const submitReport = async () => {
    const site = data?.sites?.[0];
    if (!site) return;
    setIsSubmitting(true);
    try {
      await fetchApi("/reports", {
        method: "POST",
        body: JSON.stringify({
          site_id: site.site_id,
          work_done: workDone,
          worker_attendance: attendance
        })
      });
      alert("Laporan berhasil dikirim ke server!");
      setWorkDone("");
      setAttendance([
        { role: "Tukang", count: 0, names: "" },
        { role: "Kuli", count: 0, names: "" }
      ]);
      fetchDashboard();
    } catch (err: any) {
      alert("Gagal mengirim laporan: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const reportViaWa = () => {
    const site = data?.sites?.[0];
    if (!site) return;
    
    // Formatting text for WA
    let text = `*Laporan Harian Proyek: ${site.project}*\n`;
    text += `Titik: ${site.name}\n\n`;
    text += `*Pekerjaan Hari Ini:*\n${workDone || '-'}\n\n`;
    text += `*Kehadiran Pekerja:*\n`;
    attendance.forEach(a => {
      text += `- ${a.count} ${a.role} ${a.names ? '('+a.names+')' : ''}\n`;
    });
    
    // You can customize the destination number or leave it blank to select contacts
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  const site = data?.sites?.[0];

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="bg-surface/80 backdrop-blur-xl docked full-width top-0 shadow-sm sticky z-40 border-b border-surface-variant/30">
        <div className="flex justify-between items-center px-6 py-4 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl shadow-sm border border-surface-variant overflow-hidden bg-white flex items-center justify-center">
              <Image src="/logo.png" alt="Logo" width={40} height={40} className="object-cover" />
            </div>
            <div>
              <h1 className="font-headline-sm text-lg font-black text-on-surface tracking-tight leading-tight">
                MandorHub <span className="text-primary">Mandor</span>
              </h1>
              <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest">{data?.summary?.total > 0 ? site?.project : "Tidak ada proyek"}</p>
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

      <main className="px-6 py-6 flex-1 max-w-md mx-auto w-full flex flex-col gap-6">
        {!site ? (
          <div className="text-center p-8 bg-surface-container rounded-3xl border border-dashed border-surface-variant">
            <p className="font-bold text-on-surface-variant">Belum ada proyek yang ditugaskan kepada Anda.</p>
          </div>
        ) : (
          <>
            {/* Target Card */}
            {targets.length > 0 && (
              <div className="bg-primary-container/20 border border-primary-container rounded-3xl p-5 shadow-sm">
                <h3 className="font-black text-primary mb-3 text-sm uppercase tracking-wider flex items-center gap-2">
                  <CheckSquare className="w-4 h-4"/> Target Mingguan
                </h3>
                <div className="flex flex-col gap-2">
                  {targets.map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-surface-container-lowest p-3 rounded-2xl shadow-sm">
                      <div>
                        <p className="font-bold text-sm text-on-surface">M{t.week_number}: {t.title}</p>
                      </div>
                      <span className={`text-xs font-black px-2 py-1 rounded-lg ${
                        t.status === 'selesai' ? 'bg-[#c3f0c3] text-[#0e520e]' : 
                        t.status === 'proses' ? 'bg-[#ffdf99] text-[#5a4300]' : 
                        'bg-surface-variant text-on-surface-variant'
                      }`}>
                        {t.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form Laporan */}
            <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-surface-variant/60">
              <h2 className="font-black text-xl mb-5 text-on-surface">Buat Laporan Harian</h2>
              
              <div className="flex flex-col gap-5">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Pekerjaan Selesai Hari Ini</label>
                  <textarea 
                    className="w-full bg-surface-container-low border border-surface-variant rounded-2xl px-4 py-3 text-sm text-on-surface focus:border-primary outline-none transition-colors"
                    rows={4}
                    placeholder="Contoh: Pengecoran pondasi 50%..."
                    value={workDone}
                    onChange={(e) => setWorkDone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Kehadiran Pekerja</label>
                  <div className="flex flex-col gap-3">
                    {attendance.map((att, idx) => (
                      <div key={idx} className="flex flex-col gap-2 bg-surface-container-low p-3 rounded-2xl border border-surface-variant/50">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={att.role}
                            onChange={(e) => updateAttendance(idx, "role", e.target.value)}
                            placeholder="Peran"
                            className="flex-1 bg-surface border border-surface-variant rounded-xl px-3 py-2 text-sm font-bold text-on-surface outline-none focus:border-primary"
                          />
                          <input
                            type="number"
                            min="0"
                            value={att.count || ""}
                            onChange={(e) => updateAttendance(idx, "count", parseInt(e.target.value) || 0)}
                            placeholder="Jml"
                            className="w-20 bg-surface border border-surface-variant rounded-xl px-3 py-2 text-sm font-black text-center text-on-surface outline-none focus:border-primary"
                          />
                        </div>
                        <input
                          type="text"
                          value={att.names}
                          onChange={(e) => updateAttendance(idx, "names", e.target.value)}
                          placeholder="Nama (Opsional)"
                          className="w-full bg-surface border border-surface-variant rounded-xl px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                        />
                      </div>
                    ))}
                    <button 
                      onClick={() => setAttendance([...attendance, { role: "", count: 0, names: "" }])}
                      className="py-3 mt-1 border-2 border-dashed border-primary/40 rounded-2xl text-primary text-sm font-bold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4"/> Tambah Baris
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 mt-2">
                  <button 
                    onClick={submitReport}
                    disabled={isSubmitting || !workDone}
                    className="flex-1 py-4 rounded-2xl font-bold text-base bg-primary text-on-primary hover:bg-primary-container transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Send className="w-5 h-5"/> Kirim App
                  </button>
                  
                  <button 
                    onClick={reportViaWa}
                    className="flex-1 py-4 rounded-2xl font-bold text-base bg-[#25D366] text-white hover:bg-[#1ebd5c] transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5"/> Kirim WA
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
