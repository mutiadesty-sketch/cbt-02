import React from "react";
import { getAvatarGrad } from "../../lib/avatarUtils";

const MEDAL = ["🥇", "🥈", "🥉"];
const MEDAL_BG = ["from-amber-400 to-yellow-500", "from-slate-400 to-slate-500", "from-orange-400 to-amber-500"];

const RankingTab = ({ leaderboard, lbLoading, fetchLeaderboard, userId }) => {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">🏆 Leaderboard</h2>
          <p className="mt-1 text-sm text-slate-400">Top 10 nilai tertinggi dari semua ujian.</p>
        </div>
        <button onClick={fetchLeaderboard} className="btn btn-outline btn-sm">
          <i className="fas fa-rotate-right text-xs" /> Refresh
        </button>
      </div>

      {lbLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-18 rounded-2xl" style={{ height: "72px" }} />
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
          <div className="text-5xl">🏆</div>
          <div>
            <div className="font-bold text-slate-700">Belum ada data ranking</div>
            <div className="mt-1 text-sm text-slate-400">Selesaikan ujian untuk masuk leaderboard.</div>
          </div>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {leaderboard.length >= 3 && (
            <div className="flex items-end justify-center gap-3 pt-2 pb-4">
              {/* 2nd */}
              <div className="flex flex-col items-center gap-2">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white text-xl font-black ${getAvatarGrad(leaderboard[1]?.studentName)}`}>
                  {leaderboard[1]?.studentName?.charAt(0) || "?"}
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-slate-700 max-w-[64px] truncate">{leaderboard[1]?.studentName}</div>
                  <div className="text-lg font-black text-slate-500">{leaderboard[1]?.score}</div>
                </div>
                <div className="flex h-12 w-16 items-center justify-center rounded-t-2xl bg-gradient-to-br from-slate-400 to-slate-500 text-2xl shadow-md">🥈</div>
              </div>
              {/* 1st */}
              <div className="flex flex-col items-center gap-2 -mt-4">
                <div className="relative">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br text-white text-2xl font-black shadow-xl ${getAvatarGrad(leaderboard[0]?.studentName)}`}>
                    {leaderboard[0]?.studentName?.charAt(0) || "?"}
                  </div>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg">👑</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-slate-900 max-w-[72px] truncate">{leaderboard[0]?.studentName}</div>
                  <div className="text-2xl font-black text-amber-500">{leaderboard[0]?.score}</div>
                </div>
                <div className="flex h-16 w-20 items-center justify-center rounded-t-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-2xl shadow-lg">🥇</div>
              </div>
              {/* 3rd */}
              <div className="flex flex-col items-center gap-2">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white text-xl font-black ${getAvatarGrad(leaderboard[2]?.studentName)}`}>
                  {leaderboard[2]?.studentName?.charAt(0) || "?"}
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-slate-700 max-w-[64px] truncate">{leaderboard[2]?.studentName}</div>
                  <div className="text-lg font-black text-orange-400">{leaderboard[2]?.score}</div>
                </div>
                <div className="flex h-10 w-16 items-center justify-center rounded-t-2xl bg-gradient-to-br from-orange-400 to-amber-500 text-2xl shadow-md">🥉</div>
              </div>
            </div>
          )}

          {/* Full list */}
          <div className="space-y-2">
            {leaderboard.map((r, idx) => {
              const isMe = r.studentId === userId;
              return (
                <div
                  key={r.studentId}
                  className={`flex items-center gap-3 rounded-2xl border p-3.5 transition animate-fade-in ${
                    isMe
                      ? "border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 shadow-sm"
                      : "border-slate-100 bg-white hover:border-indigo-100 hover:shadow-sm"
                  }`}
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  {/* Rank */}
                  <div className="w-8 flex-shrink-0 text-center">
                    {idx < 3 ? (
                      <span className="text-xl">{MEDAL[idx]}</span>
                    ) : (
                      <span className="text-sm font-black text-slate-400">#{idx + 1}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white ${getAvatarGrad(r.studentName)}`}>
                    {r.studentName?.charAt(0) || "?"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-900 text-sm truncate">{r.studentName}</span>
                      {isMe && <span className="badge badge-indigo text-[10px]">Kamu</span>}
                    </div>
                    <div className="text-xs text-slate-400">Kelas {r.kelas || "–"}</div>
                  </div>

                  {/* Score */}
                  <div className={`text-xl font-black shrink-0 ${idx === 0 ? "text-amber-500" : isMe ? "text-indigo-600" : "text-slate-700"}`}>
                    {r.score}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default RankingTab;
