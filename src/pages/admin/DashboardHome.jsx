/* eslint-disable no-unused-vars */
import React from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { getPassScore } from "../../lib/examConfig";
import EmptyState from "../../ui/EmptyState";
import { AnimatedNumber } from "../../lib/useAnimatedCounter";
import { toastSuccess, toastError } from "../../lib/notify";
import { motion } from "framer-motion";

const DashboardHome = ({
  stats,
  recentResults,
  sessions = [],
  loading,
  examConfig,
  allResults = [],
  adminName = "Admin"
}) => {
  const navigate = useNavigate();
  const passScore = getPassScore(examConfig);

  const handleGenerateToken = async () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Tanpa I, O, 0, 1 agar tidak tertukar
    let newToken = "";
    for (let i = 0; i < 6; i++) {
      newToken += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    try {
      await updateDoc(doc(db, "settings", "main"), {
        token: newToken
      });
      toastSuccess(`Token baru berhasil di-generate: ${newToken}`);
    } catch (err) {
      toastError("Gagal generate token: " + err.message);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 19) return "Selamat Sore";
    return "Selamat Malam";
  };

  const activeCount = sessions.length;
  
  // Calculate average score without heavy charts
  const validScores = allResults.filter(r => r.score != null).map(r => r.score);
  const avgScore = validScores.length ? Math.round(validScores.reduce((a,b) => a+b, 0) / validScores.length) : 0;

  return (
    <div className="space-y-6">
      {/* ═══════════ TOP STATUS BAR (ENTERPRISE STYLE) ═══════════ */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-white px-4 py-2.5 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 border-r border-slate-100 pr-4">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sistem Online</span>
        </div>
        <div className="flex items-center gap-2 border-r border-slate-100 pr-4">
          <i className="fas fa-database text-[10px] text-indigo-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">DB Terkoneksi</span>
        </div>
        <div className="flex items-center gap-2">
          <i className="fas fa-users text-[10px] text-amber-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {activeCount} Siswa Aktif
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400">
            {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* ═══════════ HEADER & WELCOME ═══════════ */}
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {getGreeting()}, {adminName.split(' ')[0]}! 👋
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Berikut ringkasan operasional CBT hari ini.
          </p>
        </div>
      </div>

      {/* ═══════════ HERO: EXAM CONTROLLER ═══════════ */}
      <div className="relative overflow-hidden rounded-[24px] shadow-sm animate-fade-in-up">
        {/* Background gradient matching StudentDash but distinct for Admin */}
        <div className={`absolute inset-0 ${examConfig.isActive
          ? "bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950"
          : "bg-gradient-to-br from-slate-800 to-slate-900"}`}
        />
        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }} />

        


        <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1 text-white">
            <div className="flex items-center gap-3 mb-4">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                examConfig.isActive ? "bg-emerald-500 text-white" : "bg-white/20 text-white"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${examConfig.isActive ? "bg-white animate-pulse" : "bg-white/40"}`} />
                {examConfig.isActive ? "Ujian Aktif" : "Ujian Nonaktif"}
              </span>
              {examConfig.token && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-white/20 text-white">
                    <i className="fas fa-key text-[10px]"></i> Token: {examConfig.token}
                  </span>
                  <button 
                    onClick={handleGenerateToken}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/30 transition-colors"
                    title="Generate Token Baru"
                  >
                    <i className="fas fa-sync-alt text-[10px]" />
                  </button>
                </div>
              )}
            </div>

            <h2 className="text-3xl font-bold tracking-tight mb-2">
              {examConfig.title || "Ujian Terjadwal"}
            </h2>

            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-indigo-100/70">
              <div className="flex items-center gap-1.5">
               <i className="fas fa-clock" /> {examConfig.duration || 0} Menit
              </div>
              <div className="flex items-center gap-1.5">
               <i className="fas fa-medal" /> KKM {passScore}
              </div>
              <div className="flex items-center gap-1.5">
               <i className="fas fa-random" /> {examConfig.randomizeQuestions ? "Soal Acak" : "Urutan Tetap"}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col sm:flex-row gap-3">
            <button 
              onClick={() => navigate("/admin/monitoring?tab=live")} 
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-all shadow-md"
            >
              <i className="fas fa-satellite-dish text-xs"></i> Live Monitor
            </button>
            <button 
              onClick={() => navigate("/admin/system?tab=settings")} 
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-5 py-2.5 text-sm font-bold text-white transition-all border border-white/20"
            >
              <i className="fas fa-sliders text-xs"></i> Ubah Setelan
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════ QUICK STATS (BENTO) ═══════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Siswa Live", value: activeCount, bg: "bg-emerald-50", text: "text-emerald-600", icon: "fa-satellite-dish" },
          { label: "Telah Ujian", value: allResults.length, bg: "bg-blue-50", text: "text-blue-600", icon: "fa-check-circle" },
          { label: "Rata-Rata", value: `${avgScore}%`, bg: "bg-amber-50", text: "text-amber-600", icon: "fa-star" },
          { label: "Bank Soal", value: stats?.questions || 0, bg: "bg-violet-50", text: "text-violet-600", icon: "fa-layer-group" },
        ].map((s, idx) => (
          <motion.div 
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.1 }}
            className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm group hover:-translate-y-1 transition-all duration-300"
          >
            {/* Watermark Icon (Restored matching original) */}
            <i className={`fas ${s.icon} absolute -right-4 -bottom-6 text-[110px] ${s.text} opacity-5 transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6 group-hover:opacity-10 pointer-events-none`}></i>            
            <div className="relative flex items-start justify-between">
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${s.bg} ${s.text}`}>
                <i className={`fas ${s.icon} text-lg`} />
              </div>
            </div>
            <div className="relative mt-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{s.label}</div>
              <div className="text-2xl font-bold text-slate-800 tracking-tight">
                {loading ? "–" : typeof s.value === 'number' ? <AnimatedNumber value={s.value} /> : s.value}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ═══════════ BOTTOM: RECENT RESULTS ═══════════ */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Penyerahan Terbaru</h3>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Siswa yang baru saja selesai ujian</p>
          </div>
          <button onClick={() => navigate("/admin/monitoring?tab=results")} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors border border-indigo-100">
            Lihat Rekap Lengkap <i className="fas fa-arrow-right text-[10px]" />
          </button>
        </div>
        
        {loading ? (
           <div className="space-y-3">
             {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-50 rounded-xl animate-pulse"></div>)}
           </div>
        ) : recentResults.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <EmptyState icon="fa-inbox" title="Belum Ada Hasil Terbaru" description="Tampilan aktivitas penyerahan ujian akan muncul di sini" size="small" isTable={false} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentResults.slice(0, 6).map(r => (
              <div key={r.id} className="group flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-indigo-100 hover:shadow-md transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 shrink-0 outline outline-2 outline-white rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 flex items-center justify-center font-black text-xs uppercase shadow-sm">
                    {r.studentName?.charAt(0) || "S"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-700 transition-colors">{r.studentName}</div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Kelas {r.kelas || "-"}</div>
                  </div>
                </div>
                <div className={`shrink-0 px-2.5 py-1 rounded-xl text-[11px] font-black shadow-sm ${(r.score || 0) >= passScore ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                  {r.score}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default DashboardHome;
