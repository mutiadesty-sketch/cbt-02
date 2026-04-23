import React from "react";
import { useNavigate } from "react-router-dom";
import { getPassScore, getSubtesLabel, isTKA } from "../../lib/examConfig";

const HistoryTab = ({ history, loading, examConfig }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-900">Riwayat Ujian</h2>
        <p className="mt-1 text-sm text-slate-400">Semua hasil ujian yang telah kamu selesaikan.</p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : history.length === 0 ? (
        /* Empty state */
        <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200">
            <i className="fas fa-inbox text-2xl text-slate-400" />
          </div>
          <div>
            <div className="font-bold text-slate-700">Belum ada riwayat</div>
            <div className="mt-1 text-sm text-slate-400">Riwayat akan muncul setelah kamu menyelesaikan ujian.</div>
          </div>
        </div>
      ) : (
        /* Card list — mobile-friendly instead of table */
        <div className="space-y-3">
          {history.map((h, idx) => {
            const pass = (h.score ?? 0) >= (h.passScore ?? getPassScore(examConfig));
            const subtes = h.subtes || "literasi";
            const isTka = isTKA(subtes);
            return (
              <div
                key={h.id}
                className="card-hover p-4 flex items-center gap-4 cursor-pointer animate-fade-in"
                style={{ animationDelay: `${idx * 40}ms` }}
                onClick={() => navigate(`/result/${h.id}`)}
              >
                {/* Subtes icon */}
                <div className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl text-white font-bold ${
                  isTka
                    ? subtes === "numerasi"
                      ? "bg-gradient-to-br from-orange-400 to-amber-500"
                      : "bg-gradient-to-br from-blue-400 to-cyan-500"
                    : "bg-gradient-to-br from-purple-400 to-violet-500"
                }`}>
                  <span className="text-base">
                    {isTka
                      ? subtes === "numerasi" ? "🟠" : "🔵"
                      : "📚"
                    }
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{h.examName || "Ujian"}</div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">
                      <i className="fas fa-calendar text-slate-300 mr-1" />
                      {h.submittedAt?.toDate?.().toLocaleDateString("id-ID", {
                        day: "2-digit", month: "short", year: "numeric",
                      }) || "–"}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                      isTka
                        ? subtes === "numerasi"
                          ? "bg-orange-50 text-orange-700 border-orange-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-purple-50 text-purple-700 border-purple-200"
                    }`}>
                      {getSubtesLabel(subtes)}
                    </span>
                    <span className={`badge text-[10px] ${pass ? "badge-green" : "badge-red"}`}>
                      {pass ? "✓ Lulus" : "✗ Coba Lagi"}
                    </span>
                    {h.mode === "latihan" && <span className="badge badge-slate text-[10px]">Latihan</span>}
                  </div>
                </div>

                {/* Score */}
                <div className="text-right shrink-0">
                  <div className={`text-2xl font-black ${pass ? "text-emerald-500" : "text-red-500"}`}>
                    {h.score ?? 0}<span className="text-sm font-bold opacity-70">%</span>
                  </div>
                  <div className="text-[10px] text-slate-400">{h.correct}/{h.total} benar</div>
                </div>

                <i className="fas fa-chevron-right text-slate-200 text-xs shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HistoryTab;
