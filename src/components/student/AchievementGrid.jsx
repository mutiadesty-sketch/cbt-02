import React from "react";
import { computeBadges } from "../../lib/achievements";

const AchievementGrid = ({ history, examConfig }) => {
  const badges = computeBadges(history, examConfig);
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
        <div>
          <div className="text-sm font-bold text-slate-900">Pencapaian</div>
          <div className="text-xs text-slate-400">
            {earnedCount} dari {badges.length} lencana terkumpul
          </div>
        </div>
        {/* Progress ring */}
        <div className="relative h-10 w-10 shrink-0">
          <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="#6366f1"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${(earnedCount / badges.length) * 94.25} 94.25`}
              className="transition-all duration-700"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-indigo-600">
            {Math.round((earnedCount / badges.length) * 100)}%
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-3 p-4 sm:grid-cols-4 md:grid-cols-7">
        {badges.map((b) => (
          <div
            key={b.id}
            className="group flex flex-col items-center gap-2 text-center"
            title={b.earned ? b.desc : `Terkunci: ${b.desc}`}
          >
            <div
              className={`relative flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 ${
                b.earned
                  ? `bg-gradient-to-br ${b.color} shadow-md`
                  : "bg-slate-100"
              }`}
            >
              <i
                className={`fas ${b.icon} text-xl ${
                  b.earned ? "text-white drop-shadow-sm" : "text-slate-300"
                }`}
              />
              {!b.earned && (
                <div className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-slate-200">
                  <i className="fas fa-lock text-[9px] text-slate-400" />
                </div>
              )}
              {b.earned && (
                <div className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                  <i className="fas fa-check text-[9px] text-white" />
                </div>
              )}
            </div>
            <div
              className={`text-[10px] font-bold leading-tight ${
                b.earned ? "text-slate-700" : "text-slate-400"
              }`}
            >
              {b.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AchievementGrid;
