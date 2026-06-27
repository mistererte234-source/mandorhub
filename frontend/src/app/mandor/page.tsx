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
  const [reportDate, setReportDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
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
          report_date: reportDate,
          worker_attendance: attendance
        })
      });
      alert("Laporan berhasil dikirim ke server!");
      setWorkDone("");
      setReportDate(new Date().toISOString().split("T")[0]);
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
      <header className="bg-surface/50 backdrop-blur-2xl docked full-width top-0 shadow-sm sticky z-40 border-b border-primary/20">
        <div className="flex justify-between items-center px-6 py-4 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center p-1">
              <Image src="/logo.png" alt="Logo" width={40} height={40} className="object-contain logo-transparent" />
            </div>
            <div>
              <h1 className="font-headline-sm text-lg font-black text-on-surface tracking-tight leading-tight">
                MandorHub <span className="text-primary glow-text">Mandor</span>
              </h1>
              <p className="text-[10px] text-primary font-bold uppercase tracking-widest">{data?.summary?.total > 0 ? site?.project : "Tidak ada proyek"}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2.5 rounded-xl bg-error/10 hover:bg-error/20 text-error hover:shadow-[0_0_10px_rgba(255,42,95,0.3)] active:scale-95 transition-all"
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
              <div className="glass-panel border-primary/50 rounded-[24px] p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 blur-xl rounded-bl-full -z-10" />
                <h3 className="font-black text-primary mb-3 text-xs uppercase tracking-widest flex items-center gap-2 glow-text">
                  <CheckSquare className="w-4 h-4"/> Target Mingguan
                </h3>
                <div className="flex flex-col gap-2 relative z-10">
                  {targets.map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-surface-variant/30 border border-surface-variant/50 p-3 rounded-2xl">
                      <div>
                        <p className="font-bold text-sm text-on-surface"><span className="font-hacker text-primary">M{t.week_number}</span>: {t.title}</p>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
                        t.status === 'selesai' ? 'bg-[#00ff41]/20 text-[#00ff41] border border-[#00ff41]/30' : 
                        t.status === 'proses' ? 'bg-[#ffea00]/20 text-[#ffea00] border border-[#ffea00]/30' : 
                        'bg-surface-variant/50 text-on-surface-variant'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form Laporan */}
            <div className="glass-panel rounded-[32px] p-6">
              <h2 className="font-black text-xl mb-5 text-on-surface flex items-center gap-2">Buat Laporan Harian</h2>
              
              <div className="flex flex-col gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Tanggal Laporan</label>
                  <input 
                    type="date"
                    className="w-full bg-surface-variant/20 border border-surface-variant/50 rounded-2xl px-4 py-3 text-sm text-on-surface focus:border-primary focus:bg-primary/5 outline-none transition-all font-hacker mb-4"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Pekerjaan Selesai Hari Ini</label>
                  <textarea 
                    className="w-full bg-surface-variant/20 border border-surface-variant/50 rounded-2xl px-4 py-3 text-sm text-on-surface focus:border-primary focus:bg-primary/5 outline-none transition-all"
                    rows={4}
                    placeholder="Contoh: Pengecoran pondasi 50%..."
                    value={workDone}
                    onChange={(e) => setWorkDone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Kehadiran Pekerja</label>
                  <div className="flex flex-col gap-3">
                    {attendance.map((att, idx) => (
                      <div key={idx} className="flex flex-col gap-2 bg-surface-variant/10 p-3 rounded-2xl border border-surface-variant/30">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={att.role}
                            onChange={(e) => updateAttendance(idx, "role", e.target.value)}
                            placeholder="Peran"
                            className="flex-1 bg-surface-variant/30 border border-surface-variant/50 rounded-xl px-3 py-2 text-sm font-bold text-on-surface outline-none focus:border-primary transition-all"
                          />
                          <input
                            type="number"
                            min="0"
                            value={att.count || ""}
                            onChange={(e) => updateAttendance(idx, "count", parseInt(e.target.value) || 0)}
                            placeholder="Jml"
                            className="w-20 bg-surface-variant/30 border border-surface-variant/50 rounded-xl px-3 py-2 text-sm font-hacker text-center text-primary outline-none focus:border-primary transition-all glow-text"
                          />
                        </div>
                          <input
                            type="text"
                            value={att.names}
                            onChange={(e) => updateAttendance(idx, "names", e.target.value)}
                            placeholder="Daftar Nama Pekerja (Pisahkan dengan koma)"
                          className="w-full bg-surface-variant/20 border border-surface-variant/50 rounded-xl px-3 py-2 text-sm text-on-surface outline-none focus:border-primary transition-all"
                        />
                      </div>
                    ))}
                    <button 
                      onClick={() => setAttendance([...attendance, { role: "", count: 0, names: "" }])}
                      className="py-3 mt-1 border border-primary/30 bg-primary/5 rounded-2xl text-primary text-[10px] uppercase tracking-widest font-bold hover:bg-primary/20 hover:border-primary transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4"/> Tambah Baris
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 mt-2">
                  <button 
                    onClick={submitReport}
                    disabled={isSubmitting || !workDone}
                    className="flex-1 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest bg-primary/20 border border-primary/50 text-primary hover:bg-primary/40 hover:shadow-[0_0_15px_rgba(0,255,65,0.4)] transition-all disabled:opacity-30 flex items-center justify-center gap-2 active:scale-95"
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
