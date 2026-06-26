"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi, getToken, logout } from "@/lib/api";
import { ArrowLeft, Loader2, Calendar, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }

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
  }, [id, router]);

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
                      <span className="text-xs font-semibold opacity-70 whitespace-nowrap bg-black/5 px-2 py-1 rounded-md">
                        {dateStr} {timeStr}
                      </span>
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
    </>
  );
}
