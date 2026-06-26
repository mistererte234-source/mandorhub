"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi, logout, getToken } from "@/lib/api";
import BottomSheet from "@/components/BottomSheet";
import Image from "next/image";
import {
  Bell,
  MapPin,
  Camera,
  AlertTriangle,
  CheckCircle2,
  Mic,
  Package,
  Building2,
  PencilRuler,
  LogOut,
  Loader2,
} from "lucide-react";

export default function ForemanDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [bossPhone, setBossPhone] = useState("628110000001");
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [isLaporOpen, setIsLaporOpen] = useState(false);
  const [workDone, setWorkDone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for Ada Masalah
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [issueType, setIssueType] = useState("material");
  const [issueDesc, setIssueDesc] = useState("");
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

  // State for attendance
  const [attendance, setAttendance] = useState<{ role: string; count: number; names: string }[]>([
    { role: "Tukang", count: 0, names: "" },
    { role: "Kuli", count: 0, names: "" },
  ]);

  const updateAttendance = (index: number, field: "role" | "count" | "names", value: string | number) => {
    const newAttendance = [...attendance];
    newAttendance[index] = { ...newAttendance[index], [field]: value };
    setAttendance(newAttendance);
  };

  const addAttendanceRow = () => {
    setAttendance([...attendance, { role: "", count: 0, names: "" }]);
  };

  const submitReport = async () => {
    if (!workDone) {
      alert("Harap isi Pekerjaan Selesai");
      return;
    }

    const mainSite = data?.sites?.[0];
    if (!mainSite) return;

    setIsSubmitting(true);
    try {
      const payload = {
        site_id: mainSite.site_id,
        work_done: workDone,
        target_status: "tercapai",
        worker_attendance: attendance.map(a => ({
          role: a.role,
          count: a.count,
          names: a.names
        }))
      };

      await fetchApi("/reports", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setIsLaporOpen(false);

      const text = `*Laporan Harian: ${mainSite.name}*
Lokasi: ${mainSite.project}
👷 Pekerjaan: ${workDone}

👥 *Absensi:*
${attendance.filter(a => a.count > 0).map(a => `- ${a.count} ${a.role}${a.names ? ` (${a.names})` : ''}`).join('\n')}

[Mohon lampirkan foto di bawah ini]`;
      
      const waUrl = `https://wa.me/${bossPhone}?text=${encodeURIComponent(text)}`;
      window.open(waUrl, "_blank");
      
      setWorkDone("");
      setAttendance([
        { role: "Tukang", count: 0, names: "" },
        { role: "Kuli", count: 0, names: "" },
      ]);
      
      const res = await fetchApi("/dashboard");
      setData(res);
    } catch (error: any) {
      alert("Gagal mengirim laporan: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitIssue = async () => {
    if (!issueDesc) {
      alert("Harap jelaskan masalahnya");
      return;
    }

    const mainSite = data?.sites?.[0];
    if (!mainSite) return;

    setIsSubmittingIssue(true);
    try {
      const payload = {
        site_id: mainSite.site_id,
        issue_type: issueType,
        urgency: "high",
        description: issueDesc
      };

      await fetchApi("/issues", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setIsIssueOpen(false);

      const typeLabels: any = {
        "material": "Material Kurang/Habis",
        "pekerja": "Kekurangan Pekerja",
        "cuaca": "Cuaca Buruk",
        "desain": "Masalah Desain/Gambar",
        "biaya": "Butuh Dana Tambahan",
        "lain-lain": "Masalah Lain"
      };

      const text = `🚨 *LAPORAN MASALAH: ${mainSite.name}*
Lokasi: ${mainSite.project}
⚠️ *Tipe:* ${typeLabels[issueType] || issueType}
📝 *Penjelasan:* ${issueDesc}

[Mohon lampirkan foto/video bukti di bawah ini]`;
      
      const waUrl = `https://wa.me/${bossPhone}?text=${encodeURIComponent(text)}`;
      window.open(waUrl, "_blank");
      
      setIssueDesc("");
      setIssueType("material");
      
      let url = "/dashboard";
      if (selectedProject) {
        url += `?project_id=${selectedProject}`;
      }
      const res = await fetchApi(url);
      setData(res);
    } catch (error: any) {
      alert("Gagal melaporkan masalah: " + error.message);
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  const resolveIssue = async (issueId: string) => {
    try {
      await fetchApi(`/issues/${issueId}/resolve`, { method: "PATCH" });
      let url = "/dashboard";
      if (selectedProject) {
        url += `?project_id=${selectedProject}`;
      }
      const res = await fetchApi(url);
      setData(res);
    } catch (error: any) {
      alert("Gagal menyelesaikan masalah: " + error.message);
    }
  };

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    fetchProjects();
  }, [router]);

  useEffect(() => {
    if (projects.length >= 0) {
      fetchDashboard();
    }
  }, [selectedProject, projects.length]);

  const fetchProjects = async () => {
    try {
      const res = await fetchApi("/projects/my");
      setProjects(res);
    } catch(err) {
      console.error(err);
    }
  };

  const fetchDashboard = () => {
    setLoading(true);
    let url = "/dashboard";
    if (selectedProject) {
      url += `?project_id=${selectedProject}`;
    }

    Promise.all([fetchApi(url), fetchApi("/users")])
      .then(([dashRes, usersRes]) => {
        setData(dashRes);
        const boss = usersRes.find((u: any) => u.role === "contractor");
        if (boss && boss.phone) {
          let p = boss.phone;
          if (p.startsWith("0")) p = "62" + p.substring(1);
          setBossPhone(p.replace(/[^0-9]/g, ""));
        }
      })
      .catch((err) => {
        console.error("Dashboard error:", err);
        if (err.message.includes("Not authenticated") || err.message.includes("401")) {
          logout();
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  // If no data or user isn't assigned to any site, just use fallback
  const sites = data?.sites || [];
  const mainSite = sites.length > 0 ? sites[0] : null;
  const otherSites = sites.slice(1);

  return (
    <>
      <header className="bg-surface/80 backdrop-blur-md docked full-width top-0 shadow-sm sticky z-40">
        <div className="flex justify-between items-center px-5 py-4 w-full border-b border-surface-variant/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full shadow-sm border border-surface-variant overflow-hidden bg-white flex items-center justify-center">
              <Image src="/logo.png" alt="Logo" width={40} height={40} className="object-cover" />
            </div>
            <div>
              <h1 className="font-headline-lg-mobile text-[22px] leading-[28px] font-bold text-primary tracking-tight">
                MandorHub
              </h1>
              {projects.length > 0 ? (
                <select 
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="font-body-md text-sm text-on-surface-variant bg-transparent outline-none cursor-pointer border-b border-surface-variant pb-1 mt-1"
                >
                  <option value="">Semua Proyek</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              ) : (
                <p className="font-body-md text-sm text-on-surface-variant">
                  {mainSite ? mainSite.project : "Tidak ada proyek aktif"}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={logout}
              className="p-2 rounded-full hover:bg-error-container text-error active:scale-95 transition-all"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <main className="px-5 py-6 flex flex-col gap-6">
        {mainSite ? (
          <section className="bg-surface-container-lowest rounded-2xl shadow-[0_4px_20px_rgba(27,67,50,0.08)] border border-surface-variant overflow-hidden">
            <div className="p-4 border-b border-surface-variant flex justify-between items-start bg-surface-bright">
              <div>
                <span className="inline-flex items-center gap-1 text-sm font-medium bg-secondary-fixed text-on-secondary-fixed px-2.5 py-1 rounded-md mb-3 shadow-sm">
                  <MapPin className="w-4 h-4" />
                  {mainSite.project}
                </span>
                <h2 className="text-xl font-bold text-on-surface mb-1 tracking-tight">
                  {mainSite.name}
                </h2>
                <p className="text-base text-on-surface-variant">
                  Status: <strong className="text-primary">{mainSite.status_label}</strong>
                </p>
              </div>
            </div>
            <div className="p-md bg-surface-container-lowest">
              <button 
                onClick={() => setIsLaporOpen(true)}
                className="w-full bg-primary hover:bg-on-primary-fixed-variant active:scale-[0.98] transition-all duration-200 text-on-primary rounded-xl flex flex-col items-center justify-center py-7 gap-3 shadow-lg group"
              >
                <Camera className="w-12 h-12 group-active:scale-90 transition-transform" />
                <span className="text-[20px] font-bold tracking-wide uppercase">
                  Lapor Hari Ini
                </span>
              </button>
            </div>
          </section>
        ) : (
          <div className="p-6 text-center text-on-surface-variant bg-surface-container rounded-2xl">
            Tidak ada proyek yang ditugaskan kepada Anda hari ini.
          </div>
        )}

        {/* Open Issues Alert */}
        {mainSite && mainSite.open_issue_list && mainSite.open_issue_list.length > 0 && (
          <section className="flex flex-col gap-3">
            {mainSite.open_issue_list.map((issue: any) => (
              <div key={issue.id} className="bg-[#ffd9d6] border border-[#ffb4ab] p-4 rounded-xl flex flex-col gap-3 shadow-sm">
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-[#ffb4ab] flex items-center justify-center shrink-0 text-[#93000a]">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#93000a] mb-1 capitalize">Masalah: {issue.issue_type}</h3>
                    <p className="text-sm text-[#410002] leading-snug">
                      {issue.description}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => resolveIssue(issue.id)}
                  className="w-full bg-[#93000a] text-white py-3 rounded-lg font-bold text-sm active:scale-95 transition-all shadow-sm"
                >
                  Tandai Sudah Beres
                </button>
              </div>
            ))}
          </section>
        )}

        {/* Action Buttons Grid */}
        <section className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setIsIssueOpen(true)}
            className="bg-error-container text-on-error-container active:scale-95 transition-transform duration-150 rounded-2xl p-md flex flex-col items-center justify-center gap-2 shadow-sm border border-error-container/50 min-h-[104px]"
          >
            <AlertTriangle className="w-8 h-8 text-error" />
            <span className="text-base font-semibold text-center leading-tight">
              Ada Masalah
            </span>
          </button>
          <button className="bg-secondary-fixed text-on-secondary-fixed active:scale-95 transition-transform duration-150 rounded-2xl p-md flex flex-col items-center justify-center gap-2 shadow-sm border border-secondary-fixed-dim min-h-[104px]">
            <CheckCircle2 className="w-8 h-8 text-primary" />
            <span className="text-base font-semibold text-center leading-tight">
              Lihat Target
            </span>
          </button>
          <button className="bg-surface-container text-on-surface active:scale-95 transition-transform duration-150 rounded-2xl p-md flex flex-col items-center justify-center gap-2 shadow-sm border border-surface-variant min-h-[104px]">
            <Mic className="w-8 h-8 text-surface-tint" />
            <span className="text-base font-semibold text-center leading-tight">
              Rekam Suara
            </span>
          </button>
          <button className="bg-tertiary-fixed text-on-tertiary-fixed active:scale-95 transition-transform duration-150 rounded-2xl p-md flex flex-col items-center justify-center gap-2 shadow-sm border border-tertiary-fixed-dim min-h-[104px]">
            <Package className="w-8 h-8 text-tertiary" />
            <span className="text-base font-semibold text-center leading-tight">
              Material Kurang
            </span>
          </button>
        </section>

        {/* Status Lokasi Lain */}
        {otherSites.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className="text-xl font-bold text-on-surface px-1 mb-1 tracking-tight">
              Status Lokasi Lain
            </h3>

            {otherSites.map((site: any, idx: number) => (
              <div key={idx} className="bg-surface-container-lowest rounded-2xl p-md shadow-sm border border-surface-variant flex items-center justify-between active:bg-surface-container-low transition-colors min-h-[80px]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-surface-container-high rounded-full flex items-center justify-center text-surface-tint shrink-0">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-on-surface line-clamp-1">
                      {site.name}
                    </h4>
                    <p className="text-sm text-on-surface-variant line-clamp-1">{site.project}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold px-3 py-1 rounded-full whitespace-nowrap shadow-sm border
                  ${site.status === 'green' ? 'bg-secondary-fixed text-on-secondary-fixed border-secondary-fixed-dim' : 
                    site.status === 'red' ? 'bg-error-container text-on-error-container border-error-container/50' : 
                    'bg-tertiary-fixed text-on-tertiary-fixed border-tertiary-fixed-dim'}`}
                >
                  {site.status_label}
                </span>
              </div>
            ))}
          </section>
        )}
      </main>

      <BottomSheet isOpen={isLaporOpen} onClose={() => setIsLaporOpen(false)} title="Lapor Hari Ini">
        <div className="flex flex-col gap-5">
          <div className="bg-[#e9f3ec] border border-[#d6e5da] rounded-xl p-4 flex gap-3 items-start">
             <div className="w-8 h-8 rounded-full bg-[#daf3d6] flex items-center justify-center shrink-0 text-xl shadow-sm">
               💡
             </div>
             <div>
               <h3 className="font-bold text-[#2d4138] mb-1">Kirim Foto via WA</h3>
               <p className="text-sm text-[#46564d] leading-snug">
                 Isi daftar hadir dan pekerjaan di bawah ini lalu klik Kirim. Anda akan otomatis dialihkan ke WhatsApp Bos untuk mengirim foto lapangan!
               </p>
             </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-on-surface">Pekerjaan Selesai</label>
            <input 
              type="text" 
              value={workDone}
              onChange={(e) => setWorkDone(e.target.value)}
              placeholder="Cth: Pasang bata merah" 
              className="w-full border border-surface-variant bg-surface-container-lowest p-4 rounded-xl focus:outline-primary" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2 text-on-surface">Detail Pekerja Hadir</label>
            <div className="flex flex-col gap-3">
              {attendance.map((att, idx) => (
                <div key={idx} className="flex flex-col gap-2 bg-surface-container-lowest p-3 rounded-xl border border-surface-variant">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={att.role}
                      onChange={(e) => updateAttendance(idx, 'role', e.target.value)}
                      placeholder="Peran (Cth: Tukang)"
                      className="flex-1 bg-transparent px-1 focus:outline-none text-sm font-bold text-on-surface"
                    />
                    <div className="flex items-center bg-surface-container-low border border-surface-variant rounded-lg overflow-hidden shrink-0">
                      <button 
                        onClick={() => updateAttendance(idx, 'count', Math.max(0, att.count - 1))}
                        className="w-9 h-9 flex items-center justify-center text-on-surface-variant active:bg-surface-variant transition-colors font-bold"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-bold text-primary">{att.count}</span>
                      <button 
                        onClick={() => updateAttendance(idx, 'count', att.count + 1)}
                        className="w-9 h-9 flex items-center justify-center text-on-surface-variant active:bg-surface-variant transition-colors font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {att.count > 0 && (
                    <input
                      type="text"
                      value={att.names}
                      onChange={(e) => updateAttendance(idx, 'names', e.target.value)}
                      placeholder={`Nama ${att.count} ${att.role || 'Pekerja'} (pisahkan koma)`}
                      className="w-full border border-surface-variant bg-surface-container px-3 py-2 rounded-lg focus:outline-primary text-xs text-on-surface"
                    />
                  )}
                </div>
              ))}
              <button
                onClick={addAttendanceRow}
                className="text-sm font-semibold text-primary py-2 px-4 border border-dashed border-primary/40 rounded-xl hover:bg-primary/5 active:scale-95 transition-all w-fit mx-auto mt-1"
              >
                + Tambah Peran Lain
              </button>
            </div>
          </div>

          <button 
            onClick={submitReport}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-4 rounded-xl font-bold mt-2 shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {isSubmitting ? "Mengirim..." : "Kirim Laporan"}
          </button>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={isIssueOpen} onClose={() => setIsIssueOpen(false)} title="Lapor Masalah">
        <div className="flex flex-col gap-5">
          <div className="bg-[#fff0c1] border border-[#f5df9a] rounded-xl p-4 flex gap-3 items-start">
             <div className="w-8 h-8 rounded-full bg-[#fce088] flex items-center justify-center shrink-0 text-xl shadow-sm">
               💡
             </div>
             <div>
               <h3 className="font-bold text-[#926a00] mb-1">Kirim Foto via WA</h3>
               <p className="text-sm text-[#7a5900] leading-snug">
                 Pilih jenis masalah dan tulis penjelasan singkat. Anda akan otomatis dialihkan ke WhatsApp Bos untuk mengirim foto buktinya!
               </p>
             </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-on-surface">Jenis Masalah</label>
            <select 
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="w-full border border-surface-variant bg-surface-container-lowest p-4 rounded-xl focus:outline-primary appearance-none"
            >
              <option value="material">Material Kurang / Habis</option>
              <option value="pekerja">Kekurangan Pekerja / Mogok</option>
              <option value="cuaca">Cuaca Buruk / Hujan Deras</option>
              <option value="desain">Kendala Desain / Gambar</option>
              <option value="biaya">Masalah Biaya / Uang Makan</option>
              <option value="lain-lain">Masalah Lainnya</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-on-surface">Penjelasan Masalah</label>
            <textarea 
              value={issueDesc}
              onChange={(e) => setIssueDesc(e.target.value)}
              placeholder="Cth: Semen Holcim habis dari kemarin, supplier belum kirim." 
              rows={4}
              className="w-full border border-surface-variant bg-surface-container-lowest p-4 rounded-xl focus:outline-primary resize-none" 
            />
          </div>

          <button 
            onClick={submitIssue}
            disabled={isSubmittingIssue}
            className="w-full flex items-center justify-center gap-2 bg-error text-on-error py-4 rounded-xl font-bold mt-2 shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
          >
            {isSubmittingIssue ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {isSubmittingIssue ? "Mengirim..." : "Kirim Masalah"}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
