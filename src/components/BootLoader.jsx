import React, { useState, useEffect } from "react";

/**
 * Clean, modern boot loader matching the app's light aesthetic.
 * Shows brand mark, a subtle progress strip, and cycling status text.
 */
const BootLoader = ({ fallback = false }) => {
  const [statusIdx, setStatusIdx] = useState(0);
  const [progress, setProgress] = useState(8);

  const statuses = [
    "Menghubungkan ke server",
    "Memeriksa sesi",
    "Memverifikasi keamanan",
    "Memuat antarmuka",
  ];

  useEffect(() => {
    const textInterval = setInterval(() => {
      setStatusIdx((i) => (i + 1) % statuses.length);
    }, 900);

    const progressInterval = setInterval(() => {
      setProgress((p) => (p >= 95 ? p : p + Math.max(1, Math.floor((100 - p) / 10))));
    }, 180);

    return () => {
      clearInterval(textInterval);
      clearInterval(progressInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 px-6">
      {/* Subtle background orbs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-100 opacity-60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-100 opacity-60 blur-3xl" />

      <div className="relative z-10 flex w-full max-w-xs flex-col items-center">
        {/* Logo card */}
        <div className="relative mb-8">
          <div
            className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-400/30 to-violet-400/30 blur-xl"
            aria-hidden="true"
          />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-lg ring-1 ring-slate-200/80">
            <img
              src="/logo.png"
              alt="Smart CBT"
              className="h-12 w-12 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const sib = e.currentTarget.nextElementSibling;
                if (sib) sib.style.display = "flex";
              }}
            />
            <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
              <i className="fas fa-graduation-cap text-2xl" />
            </div>
          </div>
        </div>

        {/* Wordmark */}
        <div className="text-center">
          <div className="text-lg font-black tracking-tight text-slate-900">
            Smart <span className="text-indigo-600">CBT</span>
          </div>
          <div className="mt-0.5 text-[11px] font-medium text-slate-400">
            SDN 02 Cibadak
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-8 h-1 w-full overflow-hidden rounded-full bg-slate-200/70">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        {/* Status line */}
        <div className="mt-3 flex w-full items-center justify-between text-[11px] font-medium text-slate-500">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-500" />
            <span className="truncate">{statuses[statusIdx]}</span>
          </span>
          <span className="shrink-0 tabular-nums text-slate-400">
            {Math.min(progress, 99)}%
          </span>
        </div>

        {/* Fallback helper */}
        {fallback && (
          <div className="mt-8 w-full text-center">
            <div className="mx-auto mb-3 h-px w-24 bg-slate-200" />
            <p className="text-xs text-slate-400">
              Menunggu respons server...{" "}
              <button
                onClick={() => window.location.reload()}
                className="block w-full font-semibold text-indigo-600 underline-offset-2 hover:underline"
              >
                Muat Ulang Paksa
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BootLoader;
