import React from "react";
import { getAvatarGrad, getInitials } from "../../lib/avatarUtils";
import { computeStudentStats } from "../../lib/achievements";
import AchievementGrid from "../../components/student/AchievementGrid";
import { AnimatedNumber } from "../../lib/useAnimatedCounter";

/* ── Mini stat card (used inside hero) ─────────────────── */
const HeroStat = ({ label, value, suffix = "" }) => (
  <div className="flex-1 rounded-2xl bg-white/15 backdrop-blur-sm p-3 text-center ring-1 ring-white/10">
    <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">
      {label}
    </div>
    <div className="mt-1 text-xl font-black text-white">
      {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
      {suffix && <span className="text-sm opacity-70">{suffix}</span>}
    </div>
  </div>
);

const ProfileTab = ({ user, history = [], examConfig = {} }) => {
  const stats = computeStudentStats(history, examConfig);

  const fields = [
    { icon: "fa-id-card", label: "NISN", value: user?.id },
    { icon: "fa-chalkboard", label: "Kelas", value: user?.kelas },
    { icon: "fa-map-marker-alt", label: "Tempat Lahir", value: user?.tempatLahir },
    { icon: "fa-birthday-cake", label: "Tanggal Lahir", value: user?.tanggalLahir },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-slate-900">Profil Saya</h2>
        <p className="mt-1 text-sm text-slate-400">
          Ringkasan aktivitas dan pencapaian kamu.
        </p>
      </div>

      {/* ══════ PROFILE HERO with embedded stats ══════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700">
        {/* Decorative pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)`,
            backgroundSize: "20px 20px",
          }}
        />
        {/* Floating orbs */}
        <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-6 h-32 w-32 rounded-full bg-violet-400/20 blur-2xl" />

        <div className="relative z-10 px-5 pt-7 pb-5 sm:px-7">
          {/* Top row: avatar + name */}
          <div className="flex items-center gap-4">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-xl font-black text-white shadow-xl ring-2 ring-white/30 ${getAvatarGrad(
                user?.name,
              )}`}
            >
              {getInitials(user?.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-lg font-black text-white truncate">
                {user?.name || "–"}
              </div>
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                <i className="fas fa-graduation-cap text-[9px]" />
                Kelas {user?.kelas || "–"}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-5 flex gap-2.5">
            <HeroStat
              label="Ujian"
              value={stats.totalExams}
            />
            <HeroStat
              label="Rata-rata"
              value={stats.avgScore ?? "–"}
            />
            <HeroStat
              label="Terbaik"
              value={stats.bestScore ?? "–"}
            />
            <HeroStat
              label="Lulus"
              value={stats.passRate}
              suffix="%"
            />
          </div>
        </div>
      </div>

      {/* ══════ ACHIEVEMENTS ══════ */}
      <AchievementGrid history={history} examConfig={examConfig} />

      {/* ══════ ACCOUNT INFO ══════ */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Informasi Akun
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {fields.map((item) => (
            <div key={item.label} className="flex items-center gap-4 px-5 py-3.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                <i className={`fas ${item.icon} text-indigo-500 text-xs`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {item.label}
                </div>
                <div className="text-sm font-semibold text-slate-900 mt-0.5 truncate">
                  {item.value || "–"}
                </div>
              </div>
            </div>
          ))}
          {/* Active status row */}
          <div className="flex items-center gap-4 px-5 py-3.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
              <i className="fas fa-circle-check text-emerald-500 text-xs" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Status
              </div>
              <div className="text-sm font-semibold text-emerald-600 mt-0.5">
                Aktif
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileTab;
