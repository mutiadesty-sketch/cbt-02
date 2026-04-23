import React from "react";
import { getAvatarGrad } from "../../lib/avatarUtils";

const MEDAL = ["fa-crown", "fa-medal", "fa-medal"];
const PODIUM_STYLES = [
  // 1st
  {
    bar: "h-20 bg-gradient-to-b from-amber-400 to-yellow-500",
    ring: "ring-4 ring-amber-300",
    scoreColor: "text-amber-600",
    iconColor: "text-amber-500",
  },
  // 2nd
  {
    bar: "h-14 bg-gradient-to-b from-slate-300 to-slate-400",
    ring: "ring-4 ring-slate-200",
    scoreColor: "text-slate-600",
    iconColor: "text-slate-400",
  },
  // 3rd
  {
    bar: "h-10 bg-gradient-to-b from-orange-400 to-amber-600",
    ring: "ring-4 ring-orange-200",
    scoreColor: "text-orange-600",
    iconColor: "text-orange-400",
  },
];

/* ── Podium column (used inside top-3 display) ─────────── */
const PodiumColumn = ({ rank, student, styles }) => {
  if (!student) return null;
  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      {/* Crown / medal above avatar (#1 only gets crown) */}
      <i
        className={`fas ${MEDAL[rank]} text-xl ${styles.iconColor} ${
          rank === 0 ? "drop-shadow-md" : ""
        }`}
      />
      {/* Avatar */}
      <div
        className={`flex ${
          rank === 0 ? "h-16 w-16" : "h-12 w-12"
        } items-center justify-center rounded-2xl bg-gradient-to-br ${styles.ring} ${getAvatarGrad(
          student.studentName,
        )} text-white font-black ${rank === 0 ? "text-2xl" : "text-lg"} shadow-lg`}
      >
        {student.studentName?.charAt(0)?.toUpperCase() || "?"}
      </div>
      {/* Name */}
      <div className="w-full max-w-[96px] text-center">
        <div className="text-[11px] font-bold text-slate-900 truncate">
          {student.studentName}
        </div>
        <div className="text-[10px] text-slate-400 truncate">
          Kelas {student.kelas || "–"}
        </div>
      </div>
      {/* Podium bar with rank number */}
      <div
        className={`flex w-full items-start justify-center rounded-t-xl pt-2 text-sm font-black text-white/90 shadow-md ${styles.bar}`}
      >
        #{rank + 1}
      </div>
      {/* Score chip */}
      <div
        className={`-mt-2.5 rounded-full bg-white px-2.5 py-0.5 text-sm font-black ring-1 ring-slate-200 shadow-sm ${styles.scoreColor}`}
      >
        {student.score}
      </div>
    </div>
  );
};

const RankingTab = ({ leaderboard, lbLoading, fetchLeaderboard, userId }) => {
  const myPosition = leaderboard.findIndex((r) => r.studentId === userId);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900">Leaderboard</h2>
          <p className="mt-1 text-sm text-slate-400">
            Top 10 nilai tertinggi dari seluruh ujian.
          </p>
        </div>
        <button
          onClick={fetchLeaderboard}
          className="btn btn-outline btn-sm shrink-0"
        >
          <i className="fas fa-rotate-right text-xs" /> Refresh
        </button>
      </div>

      {/* "My position" chip — friendly feedback */}
      {myPosition >= 0 && !lbLoading && (
        <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
            <i className="fas fa-location-dot text-indigo-500" />
          </div>
          <div className="flex-1 text-sm">
            <span className="text-slate-600">Posisi kamu: </span>
            <span className="font-black text-indigo-700">
              #{myPosition + 1}
            </span>
            <span className="text-slate-600">
              {" "}
              dari {leaderboard.length}
            </span>
          </div>
        </div>
      )}

      {lbLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="skeleton rounded-2xl"
              style={{ height: "72px" }}
            />
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-100 to-yellow-100">
            <i className="fas fa-trophy text-2xl text-amber-500" />
          </div>
          <div>
            <div className="font-bold text-slate-700">
              Belum ada data ranking
            </div>
            <div className="mt-1 text-sm text-slate-400">
              Selesaikan ujian untuk masuk leaderboard.
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {leaderboard.length >= 3 && (
            <div className="card p-5 pb-6">
              <div className="mb-4 text-center">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Juara
                </div>
              </div>
              <div className="flex items-end justify-center gap-3">
                <PodiumColumn
                  rank={1}
                  student={leaderboard[1]}
                  styles={PODIUM_STYLES[1]}
                />
                <PodiumColumn
                  rank={0}
                  student={leaderboard[0]}
                  styles={PODIUM_STYLES[0]}
                />
                <PodiumColumn
                  rank={2}
                  student={leaderboard[2]}
                  styles={PODIUM_STYLES[2]}
                />
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
                  <div className="w-9 shrink-0 text-center">
                    {idx < 3 ? (
                      <div
                        className={`mx-auto flex h-7 w-7 items-center justify-center rounded-xl ${
                          idx === 0
                            ? "bg-amber-100 text-amber-600"
                            : idx === 1
                            ? "bg-slate-100 text-slate-500"
                            : "bg-orange-100 text-orange-600"
                        }`}
                      >
                        <i className={`fas ${MEDAL[idx]} text-sm`} />
                      </div>
                    ) : (
                      <span className="text-sm font-black text-slate-400">
                        #{idx + 1}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white ${getAvatarGrad(
                      r.studentName,
                    )}`}
                  >
                    {r.studentName?.charAt(0) || "?"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-900 text-sm truncate">
                        {r.studentName}
                      </span>
                      {isMe && (
                        <span className="badge badge-indigo text-[10px]">
                          Kamu
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      Kelas {r.kelas || "–"}
                    </div>
                  </div>

                  {/* Score */}
                  <div
                    className={`text-xl font-black shrink-0 tabular-nums ${
                      idx === 0
                        ? "text-amber-500"
                        : isMe
                        ? "text-indigo-600"
                        : "text-slate-700"
                    }`}
                  >
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
