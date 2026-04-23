import React, { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { ACTION_META } from "../../lib/activityLog";
import EmptyState from "../../ui/EmptyState";

const ActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("all");

  useEffect(() => {
    const q = query(
      collection(db, "activity_logs"),
      orderBy("timestamp", "desc"),
      limit(200)
    );
    const unsub = onSnapshot(q, (snap) => {
      setLogs(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          timestamp: d.data().timestamp?.toDate?.() || new Date(),
        }))
      );
      setLoading(false);
    }, (err) => {
      console.error("[ActivityLog] Error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const actionTypes = [...new Set(logs.map((l) => l.action))].sort();

  const filteredLogs =
    filterAction === "all"
      ? logs
      : logs.filter((l) => l.action === filterAction);

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return "Baru saja";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`;
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Activity Log</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Riwayat semua aksi admin di platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1">
            <i className="fas fa-list text-xs text-indigo-500" />
            <span className="text-xs font-bold text-indigo-700">
              {filteredLogs.length} Aktivitas
            </span>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
          Filter Aksi
        </label>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="input text-sm"
        >
          <option value="all">Semua Aksi</option>
          {actionTypes.map((a) => (
            <option key={a} value={a}>
              {ACTION_META[a]?.label || a}
            </option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <table className="w-full">
            <tbody>
              <EmptyState
                icon="fa-clock-rotate-left"
                title="Belum Ada Aktivitas"
                description="Riwayat aksi admin akan muncul di sini secara otomatis."
                colSpan={1}
              />
            </tbody>
          </table>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => {
              const meta = ACTION_META[log.action] || {
                label: log.action,
                icon: "fa-circle",
                color: "text-slate-500",
                bg: "bg-slate-50",
              };
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-4 px-6 py-4 transition hover:bg-slate-50"
                >
                  {/* Icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.bg}`}
                  >
                    <i
                      className={`fas ${meta.icon} text-sm ${meta.color}`}
                    />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {meta.label}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        {log.adminName}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                      {log.details}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <div className="shrink-0 text-right">
                    <div className="text-xs font-medium text-slate-400">
                      {formatTime(log.timestamp)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;
