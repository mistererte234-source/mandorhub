"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi, getToken, logout } from "@/lib/api";
import { ArrowLeft, Loader2, Calendar, AlertTriangle, CheckCircle2, Edit, X, Plus } from "lucide-react";

export default function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit Report State
  const [editingReport, setEditingReport] = useState<any>(null);
  const [editWorkDone, setEditWorkDone] = useState("");
  const [editAttendance, setEditAttendance] = useState<{ role: string; count: number; names: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const fetchTimeline = () => {
    setLoading(true);
    fetchApi(`/sites/${id}/timeline`)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error("Timeline error:", err);
        if (err.message.includes("Not authenticated") || err.message.includes("401")) {
          logout();
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    fetchTimeline();
  }, [id, router]);

  const openEdit = (item: any) => {
    setEditingReport(item);
    setEditWorkDone(item.data?.work_done || "");
    const att = item.data?.attendance || [];
    if (att.length === 0) {
      setEditAttendance([{ role: "Tukang", count: 0, names: "" }, { role: "Kuli", count: 0, names: "" }]);
    } else {
      setEditAttendance(att.map((a:any) => ({role: a.role, count: a.count, names: a.names||""})));
    }
  };

  const updateAttendance = (index: number, field: "role" | "count" | "names", value: string | number) => {
    const newAttendance = [...editAttendance];
    newAttendance[index] = { ...newAttendance[index], [field]: value };
    setEditAttendance(newAttendance);
  };

  const addAttendanceRow = () => {
    setEditAttendance([...editAttendance, { role: "", count: 0, names: "" }]);
  };

  const saveEdit = async () => {
    setIsSaving(true);
    try {
      const payload = {
        work_done: editWorkDone,
        worker_attendance: editAttendance
      };
      await fetchApi(`/reports/${editingReport.id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      setEditingReport(null);
      fetchTimeline();
    } catch (err: any) {
      alert("Gagal menyimpan: " + err.message);
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

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface p-6 text-center">
        <p className="text-on-surface-variant mb-4">Gagal memuat timeline proyek.</p>
        <Link href="/kontraktor" className="text-primary font-bold">Kembali ke Dashboard</Link>
      </div>
    );
  }

  return (
    <>
      <header className="bg-surface/80 backdrop-blur-md docked full-width top-0 shadow-sm sticky z-40">
        <div className="flex items-center gap-4 px-5 py-4 w-full border-b border-surface-variant/50">
          <Link href="/kontraktor" className="p-2 -ml-2 rounded-full hover:bg-surface-variant active:scale-95 transition-all text-on-surface-variant">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="font-headline-sm text-lg font-bold text-on-surface tracking-tight">
              {data.name}
            </h1>
            <p className="font-body-sm text-sm text-on-surface-variant">
              {data.project}
            </p>
          </div>
        </div>
      </header>

      <main className="px-5 py-6 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold mb-6 text-on-surface flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary" />
          Riwayat Proyek
        </h2>

        {data.timeline.length === 0 ? (
          <div className="bg-surface-container rounded-2xl p-6 text-center text-on-surface-variant border border-surface-variant">
            Belum ada catatan aktivitas untuk proyek ini.
          </div>
        ) : (
          <div className="relative border-l-2 border-surface-variant ml-4 pl-6 flex flex-col gap-8 pb-8">
            {data.timeline.map((item: any) => {
              const dateObj = new Date(item.timestamp);
              const dateStr = dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
              const timeStr = dateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
              
              let icon = <Calendar className="w-4 h-4" />;
              let dotClass = "bg-primary text-on-primary";
              let cardClass = "bg-surface-container-lowest border-surface-variant";
              
              if (item.type === "issue_open") {
                icon = <AlertTriangle className="w-4 h-4" />;
                dotClass = "bg-error text-on-error";
                cardClass = "bg-[#ffd9d6] border-[#ffb4ab] text-[#410002]";
              } else if (item.type === "issue_resolved") {
                icon = <CheckCircle2 className="w-4 h-4" />;
                dotClass = "bg-secondary text-on-secondary";
                cardClass = "bg-secondary-container border-secondary-container text-on-secondary-container";
              }

              return (
                <div key={item.id + item.type} className="relative">
                  <div className={`absolute -left-[35px] w-8 h-8 rounded-full flex items-center justify-center shadow-sm border-2 border-surface ${dotClass}`}>
                    {icon}
                  </div>
                  
                  <div className={`rounded-xl p-4 shadow-sm border flex flex-col gap-2 ${cardClass}`}>
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <h3 className="font-bold text-base leading-tight">{item.title}</h3>
                      <div className="flex items-center gap-2">
                        {item.type === "report" && (
                          <button onClick={() => openEdit(item)} className="text-primary hover:bg-primary-container p-1.5 rounded-full transition-colors" title="Edit Laporan">
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        <span className="text-xs font-semibold opacity-70 whitespace-nowrap bg-black/5 px-2 py-1 rounded-md">
                          {dateStr} {timeStr}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm opacity-90 leading-relaxed whitespace-pre-wrap">{item.description}</p>
                    
                    {item.type === "report" && item.data?.attendance && item.data.attendance.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-black/10">
                        <p className="text-xs font-semibold mb-1 opacity-70 uppercase tracking-wide">Absensi Kehadiran</p>
                        <div className="flex flex-wrap gap-2">
                          {item.data.attendance.map((att: any, idx: number) => (
                            <span key={idx} className="inline-block text-xs bg-black/5 px-2 py-1 rounded-md border border-black/5">
                              <span className="font-bold">{att.count}</span> {att.role}
                              {att.names && <span className="opacity-75"> ({att.names})</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {editingReport && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-on-surface">Edit Laporan</h2>
              <button onClick={() => setEditingReport(null)} className="p-2 bg-surface-variant rounded-full text-on-surface-variant">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2">Pekerjaan Selesai</label>
                <textarea 
                  className="w-full bg-surface-container-low border border-surface-variant rounded-xl px-4 py-3 text-on-surface focus:border-primary outline-none"
                  rows={3}
                  value={editWorkDone}
                  onChange={(e) => setEditWorkDone(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2">Absensi Pekerja</label>
                <div className="flex flex-col gap-3">
                  {editAttendance.map((att, idx) => (
                    <div key={idx} className="flex flex-col gap-2 bg-surface-variant/30 p-3 rounded-xl border border-surface-variant/50">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={att.role}
                          onChange={(e) => updateAttendance(idx, "role", e.target.value)}
                          placeholder="Peran (Tukang/Kuli)"
                          className="flex-1 bg-surface border border-surface-variant rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                        />
                        <input
                          type="number"
                          min="0"
                          value={att.count}
                          onChange={(e) => updateAttendance(idx, "count", parseInt(e.target.value) || 0)}
                          placeholder="Jumlah"
                          className="w-20 bg-surface border border-surface-variant rounded-lg px-3 py-2 text-sm text-center text-on-surface outline-none focus:border-primary"
                        />
                      </div>
                      <input
                        type="text"
                        value={att.names}
                        onChange={(e) => updateAttendance(idx, "names", e.target.value)}
                        placeholder="Nama-nama (Opsional, pisahkan koma)"
                        className="w-full bg-surface border border-surface-variant rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                      />
                    </div>
                  ))}
                  <button 
                    onClick={addAttendanceRow}
                    className="flex items-center justify-center gap-2 py-2 mt-1 border-2 border-dashed border-surface-variant rounded-xl text-on-surface-variant text-sm font-bold hover:bg-surface-variant transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Tambah Peran
                  </button>
                </div>
              </div>

              <button 
                onClick={saveEdit}
                disabled={isSaving}
                className="w-full py-4 rounded-xl font-bold text-lg bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-all shadow-md disabled:opacity-50 mt-4"
              >
                {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
