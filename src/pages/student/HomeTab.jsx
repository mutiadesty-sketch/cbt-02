import React, { useState, useEffect, useMemo } from "react";
import { getPassScore } from "../../lib/examConfig";
import { AnimatedNumber } from "../../lib/useAnimatedCounter";
import { getDailyTip } from "../../lib/achievements";

/* ── Skeleton ──────────────────────────────────────────── */
const SkeletonCard = () => (
  <div className="skeleton h-52 w-full rounded-3xl" />
);

/* ── Stat Card ─────────────────────────────────────────── */
const StatCard = ({ icon, iconBg, iconColor, label, value, prefix, className = "" }) => (
  <div className={`card p-5 ${className}`}>
    <div className="flex items-start gap-3">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconBg}`}>
        <i className={`fas ${icon} ${iconColor} text-base`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</div>
        <div className="mt-1 text-2xl font-black text-slate-900">
          {prefix || ""}
          {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
        </div>
      </div>
    </div>
  </div>
);

/* ── Component ──────────────────────────────────────────── */
const HomeTab = ({
  examConfig,
  configLoading,
  selectedMode,
  setSelectedMode,
  startExamFlow,
  history,
  loading,
  setActive,
}) => {
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    const tick = () => {
      const now    = Date.now();
      const startAt = examConfig.startAt ? new Date(examConfig.startAt).getTime() : 0;
      const endAt   = examConfig.endAt   ? new Date(examConfig.endAt).getTime()   : 0;
      if (startAt && now < startAt) {
        setCountdown({ type: "start", diff: startAt - now });
      } else if (endAt && now < endAt && examConfig.isActive) {
        setCountdown({ type: "end", diff: endAt - now });
      } else {
        setCountdown(null);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [examConfig.startAt, examConfig.endAt, examConfig.isActive]);

  const formatCountdown = (ms) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    return {
      days:  Math.floor(totalSec / 86400),
      hours: Math.floor((totalSec % 86400) / 3600),
      mins:  Math.floor((totalSec % 3600) / 60),
      secs:  totalSec % 60,
    };
  };

  /* stats */
  const avgScore = history.length
    ? Math.round(history.reduce((s, h) => s + (h.score || 0), 0) / history.length) : null;
  const passedCount = history.filter(
    (h) => (h.score ?? 0) >= (h.passScore ?? getPassScore(examConfig)),
  ).length;

  /* daily tip (rotates every day) */
  const dailyTip = useMemo(() => getDailyTip(), []);

  return (
    <div className="space-y-5">

      {/* ══════ COUNTDOWN TIMER ══════ */}
      {countdown && (() => {
        const t = formatCountdown(countdown.diff);
        const urgent = countdown.type === "end" && t.hours === 0 && t.mins < 10;
        const isStart = countdown.type === "start";
        const units = [
          ...(t.days > 0 ? [{ v: t.days, l: "Hari" }] : []),
          { v: t.hours, l: "Jam" },
          { v: t.mins, l: "Menit" },
          { v: t.secs, l: "Detik" },
        ];
        // Dynamic palette — urgent state turns red
        const palette = urgent
          ? {
              border: "border-red-200",
              bg: "bg-gradient-to-br from-red-50 to-rose-50",
              label: "text-red-600",
              icon: "fa-circle-exclamation text-red-500 animate-pulse",
              value: "text-red-600",
            }
          : isStart
          ? {
              border: "border-amber-200",
              bg: "bg-gradient-to-br from-amber-50 to-orange-50",
              label: "text-amber-600",
              icon: "fa-hourglass-half text-amber-500 animate-pulse",
              value: "text-slate-900",
            }
          : {
              border: "border-emerald-200",
              bg: "bg-gradient-to-br from-emerald-50 to-teal-50",
              label: "text-emerald-600",
              icon: "fa-clock text-emerald-500",
              value: "text-slate-900",
            };
        return (
          <div className={`rounded-3xl border p-4 sm:p-5 animate-fade-in-up ${palette.border} ${palette.bg}`}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <i className={`fas ${palette.icon} text-sm`} />
              <span className={`text-[11px] font-bold uppercase tracking-widest ${palette.label}`}>
                {urgent ? "Segera berakhir!" : isStart ? "Ujian dimulai dalam" : "Waktu tersisa"}
              </span>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              {units.map((u, i) => (
                <React.Fragment key={u.l}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-white shadow-sm text-lg sm:text-xl font-black tabular-nums ${palette.value} ${urgent ? "ring-1 ring-red-200" : ""}`}>
                      {String(u.v).padStart(2, "0")}
                    </div>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{u.l}</span>
                  </div>
                  {i < units.length - 1 && (
                    <span className="text-lg font-black text-slate-300 mb-4">:</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ══════ EXAM HERO CARD ══════ */}
      {configLoading ? (
        <SkeletonCard />
      ) : (
        <div className="relative overflow-hidden rounded-3xl animate-fade-in-up delay-100">
          {/* Background gradient */}
          <div className={`absolute inset-0 ${examConfig.isActive
            ? "bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700"
            : "bg-gradient-to-br from-slate-600 to-slate-700"}`}
          />
          {/* Grid overlay */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }} />


          <div className="relative z-10 p-6 md:p-7">
            {/* Status badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                examConfig.isActive ? "bg-white/20 text-white" : "bg-white/10 text-white/60"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${examConfig.isActive ? "bg-emerald-400 animate-pulse" : "bg-white/40"}`} />
                {examConfig.isActive ? "Ujian Aktif" : "Ujian Nonaktif"}
              </span>
            </div>

            <h2 className="text-xl font-black text-white">
              {examConfig.title || "Siap Ujian?"}
            </h2>
            <p className="mt-1.5 text-sm text-white/60">
              Siapkan diri & pastikan koneksi internet stabil.
            </p>

            {/* Meta info */}
            <div className="mt-4 flex flex-wrap gap-3">
              {[
                { icon: "fa-book", text: examConfig.examType === "TKA" ? "Latihan Nasional (AKM)" : (examConfig.activeMapel || "Ujian Umum") },
                { icon: "fa-clock",  text: `${examConfig.duration || 60} menit` },
                { icon: "fa-medal",  text: `KKM ${getPassScore(examConfig)}` },
                { icon: examConfig.randomizeQuestions ? "fa-shuffle" : "fa-list-ol", text: examConfig.randomizeQuestions ? "Soal diacak" : "Urutan tetap" },
                ...(examConfig.token ? [{ icon: "fa-key", text: "Token diperlukan" }] : []),
              ].map((m) => (
                <span key={m.text} className="flex items-center gap-1.5 text-xs font-medium text-white/70">
                  <i className={`fas ${m.icon} text-white/50`} />
                  {m.text}
                </span>
              ))}
            </div>

            {/* Mode switch + CTA */}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              {/* Mode toggle */}
              <div>
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/50">Pilih Mode</div>
                <div className="relative flex w-full sm:w-64 rounded-xl bg-black/20 p-1 overflow-hidden">
                  {/* Animated Background Slider */}
                  <div
                    className="absolute top-1 bottom-1 w-[calc(50%-6px)] rounded-lg bg-white shadow-md transition-all duration-300 ease-out"
                    style={{
                      transform: selectedMode === "tryout" ? "translateX(0)" : "translateX(calc(100% + 4px))",
                      left: "4px"
                    }}
                  />
                  
                  {[
                    { id: "tryout", label: "Tryout",  icon: "fa-stopwatch" },
                    { id: "latihan", label: "Latihan", icon: "fa-dumbbell"  },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMode(m.id)}
                      className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-bold transition-colors duration-300 ${
                        selectedMode === m.id
                          ? "text-indigo-700"
                          : "text-white/70 hover:text-white"
                      }`}
                    >
                      <i className={`fas ${m.icon} text-xs`} />
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-white/40">
                  {selectedMode === "latihan"
                    ? "Tanpa batas waktu. Cocok untuk belajar santai."
                    : "Dengan timer. Simulasi ujian sesungguhnya."}
                </p>
              </div>

              {/* Start buttons */}
              <div className="flex flex-wrap gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                {examConfig.examType === "TKA" ? (
                  <>
                    <button
                      onClick={() => startExamFlow("literasi", selectedMode)}
                      disabled={configLoading || !examConfig.isActive}
                      className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-2xl bg-indigo-500 hover:bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <i className="fas fa-book-open text-xs opacity-80" />
                      <span>{configLoading ? "Memuat..." : "Mulai Literasi"}</span>
                      {examConfig.isActive && !configLoading && <i className="fas fa-arrow-right text-xs ml-1" />}
                    </button>
                    <button
                      onClick={() => startExamFlow("numerasi", selectedMode)}
                      disabled={configLoading || !examConfig.isActive}
                      className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-2xl bg-orange-500 hover:bg-orange-600 px-6 py-3 text-sm font-bold text-white transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <i className="fas fa-calculator text-xs opacity-80" />
                      <span>{configLoading ? "Memuat..." : "Mulai Numerasi"}</span>
                      {examConfig.isActive && !configLoading && <i className="fas fa-arrow-right text-xs ml-1" />}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => startExamFlow(examConfig.activeMapel || "umum", selectedMode)}
                    disabled={configLoading || !examConfig.isActive}
                    className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed w-full"
                  >
                    <i className="fas fa-play text-xs opacity-80" />
                    <span>{configLoading ? "Memuat..." : `Mulai Ujian ${examConfig.activeMapel || ""}`}</span>
                    {examConfig.isActive && !configLoading && <i className="fas fa-arrow-right text-xs ml-1" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ QUICK STATS ══════ */}
      <div className="grid grid-cols-3 gap-3 animate-fade-in-up delay-200">
        <StatCard
          icon="fa-file-alt"
          iconBg="bg-indigo-100"
          iconColor="text-indigo-600"
          label="Total Ujian"
          value={loading ? "–" : history.length}
        />
        <StatCard
          icon="fa-star"
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          label="Rata-rata"
          value={loading ? "–" : (avgScore !== null ? avgScore : "–")}
        />
        <StatCard
          icon="fa-circle-check"
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
          label="Lulus"
          value={loading ? "–" : passedCount}
        />
      </div>

      {/* ══════ DAILY TIP ══════ */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-5 animate-fade-in-up delay-200">
        <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-amber-200/40 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md">
            <i className={`fas ${dailyTip.icon} text-base text-white`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
              Tips Hari Ini
            </div>
            <div className="mt-0.5 text-sm font-bold text-slate-900">
              {dailyTip.title}
            </div>
            <div className="mt-1 text-xs leading-relaxed text-slate-600">
              {dailyTip.body}
            </div>
          </div>
        </div>
      </div>

      {/* ══════ QUICK ACTIONS ══════ */}
      <div className="card p-5 animate-fade-in-up delay-300">
        <div className="mb-4 text-sm font-bold text-slate-900">Akses Cepat</div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {[
            {
              id: "history",
              icon: "fa-clock-rotate-left",
              iconBg: "bg-indigo-100",
              iconColor: "text-indigo-600",
              title: "Riwayat Ujian",
              sub: `${history.length} ujian selesai`,
            },
            {
              id: "ranking",
              icon: "fa-trophy",
              iconBg: "bg-amber-100",
              iconColor: "text-amber-600",
              title: "Leaderboard",
              sub: "Top 10 nilai tertinggi",
            },
          ].map((a) => (
            <button
              key={a.id}
              onClick={() => setActive(a.id)}
              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left transition-all hover:bg-white hover:border-indigo-100 hover:shadow-md group"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${a.iconBg} group-hover:scale-110 transition-transform`}>
                  <i className={`fas ${a.icon} ${a.iconColor}`} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">{a.title}</div>
                  <div className="text-xs text-slate-400">{a.sub}</div>
                </div>
              </div>
              <i className="fas fa-chevron-right text-slate-300 text-xs group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomeTab;
