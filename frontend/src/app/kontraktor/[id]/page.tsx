"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi, getToken, logout } from "@/lib/api";
import { ArrowLeft, Loader2, Calendar, AlertTriangle, CheckCircle2, Edit, X, Plus, Target, DollarSign, Settings, LineChart as ChartIcon, CheckSquare } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: siteId } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"laporan" | "target" | "keuangan" | "pengaturan">("laporan");

  // Editing Report
  const [editingReport, setEditingReport] = useState<any>(null);
  const [editWorkDone, setEditWorkDone] = useState("");
  const [editReportDate, setEditReportDate] = useState("");
  const [editAttendance, setEditAttendance] = useState<{ role: string; count: number; names: string }[]>([]);
  const [isSavingReport, setIsSavingReport] = useState(false);

  // Targets
  const [targets, setTargets] = useState<any[]>([]);
  const [newTargets, setNewTargets] = useState<{ title: string; week_number: number; weight: number }[]>([]);
  const [isSavingTargets, setIsSavingTargets] = useState(false);

  // Finance
  const [finances, setFinances] = useState<any[]>([]);
  const [weeklyWages, setWeeklyWages] = useState<any>(null);
  
  // Settings (Rates)
  const [projectRates, setProjectRates] = useState<{ tukang_daily_rate: number; kuli_daily_rate: number }>({
    tukang_daily_rate: 0,
    kuli_daily_rate: 0
  });
  const [isSavingRates, setIsSavingRates] = useState(false);

  const fetchTimeline = async () => {
    try {
      const res = await fetchApi(`/sites/${siteId}/timeline`);
      setData(res);
      return res;
    } catch (err: any) {
      console.error("Timeline error:", err);
      if (err.message.includes("Not authenticated") || err.message.includes("401")) logout();
    }
  };

  const fetchTargets = async (projectId: string) => {
    try {
      const res = await fetchApi(`/targets/project/${projectId}`);
      setTargets(res);
      if (res.length === 0) {
        setNewTargets([{ title: "Minggu 1", week_number: 1, weight: 10 }]);
      } else {
        setNewTargets(res.map((r: any) => ({ title: r.title, week_number: r.week_number, weight: r.weight })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFinance = async (projectId: string) => {
    try {
      const res = await fetchApi(`/finance?project_id=${projectId}`);
      setFinances(res);
      
      // Fetch weekly wages for current week
      const today = new Date();
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);
      
      const start = lastWeek.toISOString().split('T')[0];
      const end = today.toISOString().split('T')[0];
      
      const wages = await fetchApi(`/finance/weekly-wages?project_id=${projectId}&start_date=${start}&end_date=${end}`);
      setWeeklyWages(wages);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProjectDetails = async (projectId: string) => {
    try {
      const projects = await fetchApi("/projects/my");
      const p = projects.find((x: any) => x.id === projectId);
      if (p) {
        setProjectRates({
          tukang_daily_rate: p.tukang_daily_rate || 0,
          kuli_daily_rate: p.kuli_daily_rate || 0
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    setLoading(true);
    fetchTimeline().then((res) => {
      if (res && res.project_id) {
        fetchTargets(res.project_id);
        fetchFinance(res.project_id);
        fetchProjectDetails(res.project_id);
      }
      setLoading(false);
    });
  }, [siteId, router]);

  // Handle Edit Report
  const openEdit = (item: any) => {
    setEditingReport(item);
    setEditWorkDone(item.data?.work_done || item.description || "");
    try {
      setEditReportDate(new Date(item.timestamp).toISOString().split("T")[0]);
    } catch {
      setEditReportDate("");
    }
    const att = item.data?.attendance || [];
    if (att.length === 0) {
      setEditAttendance([{ role: "Tukang", count: 0, names: "" }, { role: "Kuli", count: 0, names: "" }]);
    } else {
      setEditAttendance(att.map((a:any) => ({role: a.role, count: a.count, names: a.names||""})));
    }
  };

  const updateAttendance = (index: number, field: "role" | "count" | "names", value: string | number) => {
    const newAtt = [...editAttendance];
    newAtt[index] = { ...newAtt[index], [field]: value };
    setEditAttendance(newAtt);
  };

  const saveEditReport = async () => {
    setIsSavingReport(true);
    try {
      await fetchApi(`/reports/${editingReport.id}`, {
        method: "PUT",
        body: JSON.stringify({ 
          work_done: editWorkDone, 
          worker_attendance: editAttendance,
          report_date: editReportDate || undefined
        })
      });
      setEditingReport(null);
      fetchTimeline();
    } catch (err: any) {
      alert("Gagal menyimpan laporan: " + err.message);
    } finally {
      setIsSavingReport(false);
    }
  };

  // Handle Targets
  const addTarget = () => {
    setNewTargets([...newTargets, { title: `Minggu ${newTargets.length + 1}`, week_number: newTargets.length + 1, weight: 10 }]);
  };

  const updateTarget = (index: number, field: string, value: any) => {
    const arr = [...newTargets];
    arr[index] = { ...arr[index], [field]: value };
    setNewTargets(arr);
  };

  const saveTargets = async () => {
    if (!data?.project_id) return;
    setIsSavingTargets(true);
    try {
      await fetchApi(`/targets/project/${data.project_id}`, {
        method: "POST",
        body: JSON.stringify(newTargets)
      });
      alert("Target mingguan berhasil disimpan!");
      fetchTargets(data.project_id);
    } catch (err: any) {
      alert("Gagal menyimpan target: " + err.message);
    } finally {
      setIsSavingTargets(false);
    }
  };

  // Handle Rates
  const saveRates = async () => {
    if (!data?.project_id) return;
    setIsSavingRates(true);
    try {
      await fetchApi(`/projects/${data.project_id}`, {
        method: "PATCH",
        body: JSON.stringify({
          tukang_daily_rate: projectRates.tukang_daily_rate,
          kuli_daily_rate: projectRates.kuli_daily_rate
        })
      });
      alert("Tarif upah berhasil diperbarui!");
    } catch (err: any) {
      alert("Gagal menyimpan tarif: " + err.message);
    } finally {
      setIsSavingRates(false);
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
        <p className="text-on-surface-variant mb-4">Gagal memuat detail proyek.</p>
        <Link href="/kontraktor" className="text-primary font-bold">Kembali ke Dashboard</Link>
      </div>
    );
  }

  // Chart Data preparation (Schedule vs Actual)
  let chartData: any[] = [];
  if (targets.length > 0) {
    let cumulativeSchedule = 0;
    chartData = targets.map((t) => {
      cumulativeSchedule += t.weight;
      // In a real app, actual would be derived from reports that completed targets.
      // Here we approximate actual based on status
      const actual = t.status === "selesai" ? cumulativeSchedule : (t.status === "proses" ? cumulativeSchedule - (t.weight/2) : null);
      return {
        name: `M${t.week_number}`,
        Rencana: cumulativeSchedule,
        Aktual: actual
      };
    });
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="bg-surface/80 backdrop-blur-xl docked full-width top-0 shadow-sm sticky z-40">
        <div className="flex items-center gap-4 px-5 py-4 w-full border-b border-surface-variant/50">
          <Link href="/kontraktor" className="p-2 -ml-2 rounded-full hover:bg-surface-variant active:scale-95 transition-all text-on-surface-variant">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="font-headline-sm text-lg font-bold text-on-surface tracking-tight leading-tight">
              {data.name}
            </h1>
            <p className="font-body-sm text-sm text-on-surface-variant">
              {data.project}
            </p>
          </div>
        </div>
        
        {/* Modern Tabs */}
        <div className="flex overflow-x-auto no-scrollbar border-b border-surface-variant px-2 mt-1">
          {[
            { id: "laporan", label: "Laporan", icon: <Calendar className="w-4 h-4"/> },
            { id: "target", label: "Target", icon: <ChartIcon className="w-4 h-4"/> },
            { id: "keuangan", label: "Keuangan", icon: <DollarSign className="w-4 h-4"/> },
            { id: "pengaturan", label: "Tarif", icon: <Settings className="w-4 h-4"/> }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                tab === t.id ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 px-5 py-6 max-w-3xl mx-auto w-full">
        
        {/* TAB: LAPORAN (TIMELINE) */}
        {tab === "laporan" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-bold mb-6 text-on-surface flex items-center gap-2">
              <Calendar className="w-6 h-6 text-primary" /> Riwayat Proyek
            </h2>
            {data.timeline.length === 0 ? (
              <div className="bg-surface-container rounded-3xl p-8 text-center text-on-surface-variant border border-surface-variant/50 shadow-sm">
                Belum ada catatan aktivitas untuk proyek ini.
              </div>
            ) : (
              <div className="relative border-l-2 border-surface-variant ml-4 pl-6 flex flex-col gap-8 pb-8">
                {data.timeline.map((item: any) => {
                  const dateObj = new Date(item.timestamp);
                  const dateStr = dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
                  const timeStr = dateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
                  
                  let icon = <CheckSquare className="w-4 h-4" />;
                  let dotClass = "bg-primary text-on-primary";
                  let cardClass = "bg-surface-container-lowest border-surface-variant/60";
                  
                  if (item.type === "issue_open") {
                    icon = <AlertTriangle className="w-4 h-4" />;
                    dotClass = "bg-error text-on-error";
                    cardClass = "bg-error-container/20 border-error-container/50 text-on-surface";
                  } else if (item.type === "issue_resolved") {
                    icon = <CheckCircle2 className="w-4 h-4" />;
                    dotClass = "bg-secondary text-on-secondary";
                    cardClass = "bg-secondary-container/20 border-secondary-container/50 text-on-surface";
                  }

                  return (
                    <div key={item.id + item.type} className="relative group">
                      <div className={`absolute -left-[35px] w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 border-surface ${dotClass} z-10 transition-transform group-hover:scale-110`}>
                        {icon}
                      </div>
                      <div className={`rounded-2xl p-5 shadow-sm border flex flex-col gap-3 backdrop-blur-sm ${cardClass}`}>
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-bold text-base leading-tight">{item.title}</h3>
                          <div className="flex items-center gap-2">
                            {item.type === "report" && (
                              <button onClick={() => openEdit(item)} className="text-primary bg-primary/10 hover:bg-primary/20 p-2 rounded-full transition-colors" title="Edit Laporan">
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            <span className="text-xs font-semibold opacity-70 whitespace-nowrap bg-black/5 px-2 py-1 rounded-lg">
                              {dateStr} {timeStr}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm opacity-90 leading-relaxed whitespace-pre-wrap">{item.description}</p>
                        {item.type === "report" && item.data?.attendance && item.data.attendance.length > 0 && (
                          <div className="mt-2 pt-3 border-t border-black/5">
                            <p className="text-[10px] font-bold mb-2 opacity-60 uppercase tracking-wider">Kehadiran</p>
                            <div className="flex flex-wrap gap-2">
                              {item.data.attendance.map((att: any, idx: number) => (
                                <span key={idx} className="inline-flex items-center gap-1 text-xs bg-surface shadow-sm px-2 py-1.5 rounded-lg border border-black/5 font-medium">
                                  <span className="bg-primary/10 text-primary w-5 h-5 rounded flex items-center justify-center font-bold">{att.count}</span> {att.role}
                                  {att.names && <span className="opacity-70 font-normal">({att.names})</span>}
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
          </div>
        )}

        {/* TAB: TARGET & PROGRESS */}
        {tab === "target" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col gap-8">
            {chartData.length > 0 ? (
              <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-sm border border-surface-variant/50">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-primary"/> Kurva S (Rencana vs Aktual)</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} domain={[0, 100]} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: '10px' }}/>
                      <Line type="monotone" dataKey="Rencana" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="Aktual" stroke="#16a34a" strokeWidth={3} dot={{ r: 4, fill: '#16a34a', strokeWidth: 2, stroke: '#fff' }} connectNulls={true} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="bg-surface-variant/30 rounded-3xl p-6 text-center text-sm border border-dashed border-surface-variant">Belum ada data target untuk grafik.</div>
            )}

            <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-sm border border-surface-variant/50">
              <h3 className="font-bold text-lg mb-4">Pengaturan Target Mingguan</h3>
              <div className="flex flex-col gap-3">
                {newTargets.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-surface-container-low p-3 rounded-2xl">
                    <div className="w-10 h-10 bg-primary/10 text-primary font-bold rounded-xl flex items-center justify-center shrink-0">
                      M{t.week_number}
                    </div>
                    <input 
                      type="text" 
                      value={t.title} 
                      onChange={(e) => updateTarget(idx, "title", e.target.value)}
                      placeholder="Deskripsi Pekerjaan"
                      className="flex-1 bg-transparent border-none outline-none text-sm font-medium"
                    />
                    <div className="flex items-center gap-1 bg-surface px-3 py-2 rounded-xl border border-surface-variant/50">
                      <input 
                        type="number" 
                        value={t.weight} 
                        onChange={(e) => updateTarget(idx, "weight", parseFloat(e.target.value)||0)}
                        className="w-12 text-center bg-transparent outline-none text-sm font-bold"
                      />
                      <span className="text-xs text-on-surface-variant">%</span>
                    </div>
                  </div>
                ))}
                
                <div className="flex gap-3 mt-2">
                  <button onClick={addTarget} className="flex-1 py-3 rounded-xl border-2 border-dashed border-primary text-primary font-bold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4"/> Tambah Minggu
                  </button>
                  <button onClick={saveTargets} disabled={isSavingTargets} className="flex-[2] py-3 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary-container transition-colors shadow-md disabled:opacity-50">
                    {isSavingTargets ? "Menyimpan..." : "Simpan Target"}
                  </button>
                </div>
                <p className="text-xs text-on-surface-variant mt-2 text-center">Pastikan total bobot target mencapai 100%.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB: KEUANGAN */}
        {tab === "keuangan" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col gap-5">
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#c3f0c3]/30 border border-[#c3f0c3] rounded-3xl p-5 shadow-sm flex flex-col justify-center">
                  <span className="text-xs font-bold uppercase text-[#0e520e] mb-1">Total Kas Masuk</span>
                  <span className="text-xl font-black text-[#0e520e]">Rp {finances.filter(l => l.type==='in').reduce((s,l)=>s+l.amount, 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="bg-[#ffd9d6]/30 border border-[#ffd9d6] rounded-3xl p-5 shadow-sm flex flex-col justify-center">
                  <span className="text-xs font-bold uppercase text-[#8c1d18] mb-1">Total Kas Keluar</span>
                  <span className="text-xl font-black text-[#8c1d18]">Rp {finances.filter(l => l.type==='out').reduce((s,l)=>s+l.amount, 0).toLocaleString('id-ID')}</span>
                </div>
              </div>
              
              {weeklyWages && (
                <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-sm border border-surface-variant/50">
                  <h3 className="font-bold text-lg mb-4">Estimasi Upah 7 Hari Terakhir</h3>
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">Tukang ({weeklyWages.total_tukang_count} HK x Rp {weeklyWages.tukang_rate?.toLocaleString('id-ID')})</span>
                      <span className="font-bold">Rp {(weeklyWages.total_tukang_count * weeklyWages.tukang_rate).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">Kuli ({weeklyWages.total_kuli_count} HK x Rp {weeklyWages.kuli_rate?.toLocaleString('id-ID')})</span>
                      <span className="font-bold">Rp {(weeklyWages.total_kuli_count * weeklyWages.kuli_rate).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="border-t border-surface-variant/50 pt-2 flex justify-between font-black text-primary">
                      <span>Total Estimasi Upah</span>
                      <span>Rp {weeklyWages.total_wage?.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>
              )}

              <h3 className="font-bold text-lg mt-2">Riwayat Transaksi</h3>
              {finances.length === 0 ? (
                <div className="bg-surface-variant/30 rounded-3xl p-8 text-center text-sm border border-dashed border-surface-variant">Belum ada riwayat keuangan.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {finances.map(log => (
                    <div key={log.id} className="flex justify-between items-center p-4 bg-surface-container-lowest border border-surface-variant/60 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col">
                        <h4 className="font-bold text-sm text-on-surface capitalize">{log.category}</h4>
                        <span className="text-xs text-on-surface-variant mt-0.5">{new Date(log.date).toLocaleDateString('id-ID')} {log.description ? `- ${log.description}` : ''}</span>
                      </div>
                      <div className={`font-black text-sm px-3 py-1.5 rounded-lg ${log.type === 'in' ? 'bg-[#c3f0c3]/50 text-[#0e520e]' : 'bg-[#ffd9d6]/50 text-[#8c1d18]'}`}>
                        {log.type === 'in' ? '+' : '-'} Rp {log.amount.toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}

        {/* TAB: PENGATURAN (TARIF) */}
        {tab === "pengaturan" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-surface-variant/50">
              <h3 className="font-bold text-lg mb-4 text-on-surface flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary"/> Tarif Upah Pekerja
              </h3>
              <p className="text-sm text-on-surface-variant mb-6">Atur upah harian standar untuk Tukang dan Kuli di proyek ini. Ini akan mempermudah kalkulasi keuangan.</p>
              
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Upah Harian Tukang</label>
                  <div className="flex items-center gap-3 bg-surface border border-surface-variant rounded-2xl p-2 px-4 focus-within:border-primary transition-colors">
                    <span className="text-on-surface-variant font-bold">Rp</span>
                    <input 
                      type="number" 
                      value={projectRates.tukang_daily_rate}
                      onChange={(e) => setProjectRates({...projectRates, tukang_daily_rate: parseFloat(e.target.value)||0})}
                      className="flex-1 bg-transparent border-none outline-none text-lg font-bold py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Upah Harian Kuli</label>
                  <div className="flex items-center gap-3 bg-surface border border-surface-variant rounded-2xl p-2 px-4 focus-within:border-primary transition-colors">
                    <span className="text-on-surface-variant font-bold">Rp</span>
                    <input 
                      type="number" 
                      value={projectRates.kuli_daily_rate}
                      onChange={(e) => setProjectRates({...projectRates, kuli_daily_rate: parseFloat(e.target.value)||0})}
                      className="flex-1 bg-transparent border-none outline-none text-lg font-bold py-2"
                    />
                  </div>
                </div>

                <button 
                  onClick={saveRates}
                  disabled={isSavingRates}
                  className="w-full mt-4 py-4 rounded-2xl font-bold text-base bg-primary text-on-primary hover:bg-primary-container transition-all shadow-md disabled:opacity-50"
                >
                  {isSavingRates ? "Menyimpan..." : "Simpan Tarif Upah"}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* EDIT MODAL LAPORAN */}
      {editingReport && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-lg mx-auto rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300 max-h-[90vh] overflow-y-auto border-t border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-on-surface">Edit Laporan</h2>
              <button onClick={() => setEditingReport(null)} className="p-2 bg-surface-variant/50 hover:bg-surface-variant rounded-full text-on-surface-variant transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col gap-6">
              <div>
                <label className="block text-sm font-bold text-on-surface mb-2">Tanggal Laporan</label>
                <input 
                  type="date"
                  className="w-full bg-surface-container-low border border-surface-variant rounded-2xl px-4 py-3 text-sm text-on-surface focus:border-primary outline-none transition-colors mb-4"
                  value={editReportDate}
                  onChange={(e) => setEditReportDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface mb-2">Pekerjaan Selesai</label>
                <textarea 
                  className="w-full bg-surface-container-low border border-surface-variant rounded-2xl px-4 py-3 text-sm text-on-surface focus:border-primary outline-none transition-colors"
                  rows={3}
                  value={editWorkDone}
                  onChange={(e) => setEditWorkDone(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface mb-2">Absensi Pekerja</label>
                <div className="flex flex-col gap-3">
                  {editAttendance.map((att, idx) => (
                    <div key={idx} className="flex flex-col gap-2 bg-surface-container-low p-3 rounded-2xl border border-surface-variant/50">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={att.role}
                          onChange={(e) => updateAttendance(idx, "role", e.target.value)}
                          placeholder="Peran (Tukang/Kuli)"
                          className="flex-1 bg-surface border border-surface-variant rounded-xl px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                        />
                        <input
                          type="number"
                          min="0"
                          value={att.count}
                          onChange={(e) => updateAttendance(idx, "count", parseInt(e.target.value) || 0)}
                          placeholder="Jumlah"
                          className="w-20 bg-surface border border-surface-variant rounded-xl px-3 py-2 text-sm text-center text-on-surface outline-none focus:border-primary"
                        />
                      </div>
                      <input
                        type="text"
                        value={att.names}
                        onChange={(e) => updateAttendance(idx, "names", e.target.value)}
                        placeholder="Nama-nama (Opsional, pisahkan koma)"
                        className="w-full bg-surface border border-surface-variant rounded-xl px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                      />
                    </div>
                  ))}
                  <button 
                    onClick={() => setEditAttendance([...editAttendance, { role: "", count: 0, names: "" }])}
                    className="flex items-center justify-center gap-2 py-3 mt-1 border-2 border-dashed border-primary/50 rounded-2xl text-primary text-sm font-bold hover:bg-primary/5 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Tambah Peran
                  </button>
                </div>
              </div>

              <button 
                onClick={saveEditReport}
                disabled={isSavingReport}
                className="w-full py-4 rounded-2xl font-bold text-base bg-primary text-on-primary hover:bg-primary-container transition-all shadow-md disabled:opacity-50 mt-2"
              >
                {isSavingReport ? "Menyimpan..." : "Simpan Perubahan Laporan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
