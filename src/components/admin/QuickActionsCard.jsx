import React, { useState } from "react";
import { db } from "../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { toastSuccess, toastError } from "../../lib/notify";

/**
 * Quick actions for admin — one-click: generate token, toggle exam live,
 * copy token. Reduces trips to the Settings page for daily operations.
 */
const QuickActionsCard = ({ examConfig, activeCount = 0 }) => {
  const [busy, setBusy] = useState(null);

  const handleGenerateToken = async () => {
    setBusy("token");
    try {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let t = "";
      for (let i = 0; i < 6; i++) t += chars.charAt(Math.floor(Math.random() * chars.length));
      await updateDoc(doc(db, "settings", "main"), { token: t });
      toastSuccess(`Token baru: ${t}`);
    } catch (e) {
      toastError("Gagal generate token: " + e.message);
    } finally {
      setBusy(null);
    }
  };

  const handleToggleActive = async () => {
    setBusy("toggle");
    try {
      await updateDoc(doc(db, "settings", "main"), {
        isActive: !examConfig.isActive,
      });
      toastSuccess(examConfig.isActive ? "Ujian dinonaktifkan" : "Ujian diaktifkan");
    } catch (e) {
      toastError("Gagal: " + e.message);
    } finally {
      setBusy(null);
    }
  };

  const handleCopyToken = async () => {
    if (!examConfig.token) return;
    try {
      await navigator.clipboard.writeText(examConfig.token);
      toastSuccess("Token disalin ke clipboard");
    } catch {
      toastError("Clipboard tidak tersedia");
    }
  };

  const Btn = ({ onClick, disabled, icon, label, hint, accent = "indigo" }) => {
    const palette = {
      indigo: "border-indigo-100 bg-indigo-50 hover:bg-indigo-100 text-indigo-700",
      emerald: "border-emerald-100 bg-emerald-50 hover:bg-emerald-100 text-emerald-700",
      red: "border-red-100 bg-red-50 hover:bg-red-100 text-red-700",
      slate: "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700",
    }[accent];
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`group flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all disabled:cursor-wait disabled:opacity-50 ${palette}`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
          <i className={`fas ${icon} text-sm`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold leading-tight">{label}</div>
          {hint && <div className="mt-0.5 text-[11px] font-medium opacity-70">{hint}</div>}
        </div>
        <i className="fas fa-chevron-right text-[10px] opacity-40 transition-transform group-hover:translate-x-0.5" />
      </button>
    );
  };

  return (
    <div className="space-y-2.5">
      <Btn
        onClick={handleToggleActive}
        disabled={busy === "toggle"}
        icon={examConfig.isActive ? "fa-stop-circle" : "fa-play-circle"}
        label={examConfig.isActive ? "Nonaktifkan Ujian" : "Aktifkan Ujian"}
        hint={examConfig.isActive
          ? `${activeCount} siswa sedang mengerjakan`
          : "Siswa dapat mulai ujian setelah diaktifkan"}
        accent={examConfig.isActive ? "red" : "emerald"}
      />
      <Btn
        onClick={handleGenerateToken}
        disabled={busy === "token"}
        icon="fa-key"
        label="Generate Token Baru"
        hint={examConfig.token ? `Saat ini: ${examConfig.token}` : "Belum ada token"}
        accent="indigo"
      />
      <Btn
        onClick={handleCopyToken}
        disabled={!examConfig.token}
        icon="fa-copy"
        label="Salin Token"
        hint="Bagikan ke siswa yang hadir"
        accent="slate"
      />
    </div>
  );
};

export default QuickActionsCard;
