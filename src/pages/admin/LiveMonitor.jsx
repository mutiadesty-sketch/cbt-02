import React, { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import Swal from "sweetalert2";
import { toastSuccess, toastError } from "../../lib/notify";

const LiveMonitor = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Heartbeat local untuk update 'waktu diam' di UI setiap detik
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "sessions"), (snap) => {
      setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleForceFinish = async (session) => {
    const idleSec = getIdleSeconds(session);
    const isOffline = idleSec > 120; // 2 menit tidak ada heartbeat

    // Jika offline ATAU sudah pernah dipaksa tapi belum hilang (mungkin siswa offline/stuck)
    // Tawarkan opsi hapus permanen
    if (isOffline || session.forceSubmit) {
      const { isConfirmed } = await Swal.fire({
        title: isOffline ? "Hapus Sesi Offline?" : "Hapus Sesi Macet?",
        text: isOffline 
          ? `Siswa ${session.studentName} tampaknya sudah menutup browser atau tidak aktif lebih dari 2 menit. Hapus sesi ini secara permanen?`
          : `Sesi ${session.studentName} tampaknya macet. Hapus sesi ini secara permanen dari monitor?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        confirmButtonText: "Ya, Hapus Permanen",
        cancelButtonText: "Batal",
      });

      if (isConfirmed) {
        try {
          await deleteDoc(doc(db, "sessions", session.id));
          toastSuccess(`Sesi ${session.studentName} berhasil dihapus.`);
        } catch (err) {
          toastError("Gagal menghapus sesi: " + err.message);
        }
      }
      return;
    }

    const { isConfirmed } = await Swal.fire({
      title: "Paksa Selesai?",
      text: `Siswa ${session.studentName} akan dipaksa mengakhiri ujian dan nilainya akan langsung dihitung.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Ya, Akhiri",
      cancelButtonText: "Batal",
    });

    if (isConfirmed) {
      try {
        await updateDoc(doc(db, "sessions", session.id), {
          forceSubmit: true,
        });
        toastSuccess(`Perintah paksa selesai dikirim ke ${session.studentName}`);
      } catch (err) {
        toastError("Gagal mengirim perintah: " + err.message);
      }
    }
  };

  const handleSendMessage = async (session) => {
    const { value: message, isConfirmed } = await Swal.fire({
      title: "Kirim Pesan ke Siswa",
      input: "text",
      inputLabel: `Pesan untuk ${session.studentName}`,
      inputPlaceholder: "Contoh: Fokus ke soal nomor 5...",
      showCancelButton: true,
      confirmButtonText: "Kirim",
      cancelButtonText: "Batal",
    });

    if (isConfirmed && message) {
      try {
        await updateDoc(doc(db, "sessions", session.id), {
          adminMessage: {
            text: message,
            sentAt: Date.now(),
          },
        });
        toastSuccess("Pesan terkirim!");
      } catch (err) {
        toastError("Gagal mengirim pesan: " + err.message);
      }
    }
  };

  const handleAddTime = async (session) => {
    const { value: minutes, isConfirmed } = await Swal.fire({
      title: "Tambah Waktu Ujian",
      input: "number",
      inputLabel: "Jumlah menit yang ditambahkan",
      inputPlaceholder: "Contoh: 5",
      showCancelButton: true,
      confirmButtonText: "Tambah",
      cancelButtonText: "Batal",
      preConfirm: (val) => {
        if (!val || val <= 0) {
          Swal.showValidationMessage("Masukkan angka lebih dari 0");
        }
        return val;
      },
    });

    if (isConfirmed && minutes) {
      try {
        await updateDoc(doc(db, "sessions", session.id), {
          timeLeft: (session.timeLeft || 0) + parseInt(minutes) * 60,
        });
        toastSuccess(`Waktu ${session.studentName} berhasil ditambah ${minutes} menit`);
      } catch (err) {
        toastError("Gagal menambah waktu: " + err.message);
      }
    }
  };

  const handleBroadcastMessage = async () => {
    if (sessions.length === 0) return;
    
    const { value: message, isConfirmed } = await Swal.fire({
      title: "Pesan ke Semua Siswa",
      text: `Pesan ini akan dikirim ke ${sessions.length} siswa yang sedang aktif.`,
      input: "text",
      inputPlaceholder: "Contoh: Sisa waktu 10 menit lagi...",
      showCancelButton: true,
      confirmButtonText: "Kirim Semua",
      cancelButtonText: "Batal",
    });

    if (isConfirmed && message) {
      try {
        const promises = sessions.map(s => 
          updateDoc(doc(db, "sessions", s.id), {
            adminMessage: {
              text: message,
              sentAt: Date.now(),
            },
          })
        );
        await Promise.all(promises);
        toastSuccess("Pesan broadcast terkirim!");
      } catch (err) {
        toastError("Gagal mengirim broadcast: " + err.message);
      }
    }
  };

  const handleBulkCleanup = async () => {
    const offlineSessions = sessions.filter(s => getIdleSeconds(s) > 120);
    if (offlineSessions.length === 0) {
      toastSuccess("Tidak ada sesi offline yang perlu dibersihkan.");
      return;
    }

    const { isConfirmed } = await Swal.fire({
      title: "Bersihkan Sesi Offline?",
      text: `Hapus ${offlineSessions.length} sesi yang terdeteksi sudah tidak aktif?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Ya, Bersihkan",
      cancelButtonText: "Batal",
    });

    if (isConfirmed) {
      try {
        const promises = offlineSessions.map(s => deleteDoc(doc(db, "sessions", s.id)));
        await Promise.all(promises);
        toastSuccess(`${offlineSessions.length} sesi offline berhasil dibersihkan.`);
      } catch (err) {
        toastError("Gagal membersihkan sesi: " + err.message);
      }
    }
  };

  const fmtTime = (sec = 0) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const getIdleSeconds = (session) => {
    const lastActive = session.lastActive || session.startedAt;
    if (!lastActive) return 999999; // Sangat lama jika tidak ada data sama sekali
    const last = typeof lastActive.toMillis === "function" ? lastActive.toMillis() : lastActive;
    return Math.floor((now - last) / 1000);
  };

  const fmtIdleTime = (sec) => {
    if (sec > 86400) return "> 1 hari";
    if (sec > 3600) return `${Math.floor(sec / 3600)} jam`;
    if (sec < 10) return "Baru saja";
    if (sec < 60) return `${sec} dtk`;
    return `${Math.floor(sec / 60)} mnt`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Live Monitor</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Pantau dan kelola aktivitas ujian siswa secara real-time
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleBroadcastMessage}
            disabled={sessions.length === 0}
            className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-50"
          >
            <i className="fas fa-bullhorn" />
            Pesan ke Semua
          </button>
          <button
            onClick={handleBulkCleanup}
            className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
          >
            <i className="fas fa-broom" />
            Bersihkan Offline
          </button>
          <div className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            <span className="text-xs font-bold text-green-700">
              {sessions.length} Aktif
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl bg-slate-100"
            />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-200 bg-white py-24 text-center shadow-sm">
          <div className="flex h-20 w-20 items-center justify-center rounded-[22px] bg-slate-100 shadow-inner">
            <i className="fas fa-satellite-dish text-3xl text-slate-400" />
          </div>
          <div>
            <div className="font-semibold text-slate-700">
              Tidak ada siswa yang sedang ujian
            </div>
            <div className="mt-0.5 text-sm text-slate-400">
              Data akan muncul otomatis saat siswa memulai ujian
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sessions.map((s) => {
            const progress =
              s.totalQuestions > 0
                ? Math.round(((s.currentIndex + 1) / s.totalQuestions) * 100)
                : 0;
            const isLowTime = (s.timeLeft || 0) < 300;
            const idleSec = getIdleSeconds(s);
            const isOffline = idleSec > 120; // 2 menit tidak ada heartbeat
            const isIdle = idleSec > 45 && idleSec <= 120; // 45 detik diam

            return (
              <div
                key={s.id}
                className={`relative overflow-hidden rounded-[22px] border transition-all duration-300 ${
                  isOffline
                    ? "border-slate-200 bg-slate-50 opacity-70 grayscale-[0.5]"
                    : "border-slate-200 bg-white shadow-sm hover:border-indigo-300 hover:shadow-md"
                }`}
              >
                {/* Offline Overlay Overlay */}
                {isOffline && (
                  <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-center bg-slate-100 py-1 text-[10px] font-bold text-slate-500">
                    <i className="fas fa-plug-circle-xmark mr-1.5" />
                    KEMUNGKINAN OFFLINE / TAB DITUTUP
                  </div>
                )}

                  <div className={`p-5 ${isOffline ? "pt-8" : ""}`}>
                  {/* Top row */}
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div 
                          className="font-bold text-slate-900 leading-tight truncate text-sm sm:text-base"
                          title={s.studentName}
                        >
                          {s.studentName || "–"}
                        </div>
                        {isOffline ? (
                          <span className="flex h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                        ) : isIdle ? (
                          <span className="flex h-2 w-2 shrink-0 rounded-full bg-amber-400 animate-pulse" />
                        ) : (
                          <span className="flex h-2 w-2 shrink-0 rounded-full bg-green-500 animate-pulse" />
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
                        <span className="font-medium">Kelas {s.kelas || "–"}</span>
                        <span className="text-slate-300">•</span>
                        <span className={idleSec > 30 ? "text-amber-600 font-semibold" : ""}>
                          Diam: {fmtIdleTime(idleSec)}
                        </span>
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        {s.tabSwitches > 0 && (
                          <span className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${s.tabSwitches > 3 ? "bg-red-50 text-red-600 border border-red-100" : "bg-amber-50 text-amber-600 border border-amber-100"}`}>
                            <i className="fas fa-warning" />
                            {s.tabSwitches}x Pindah Tab
                          </span>
                        )}
                        <span className="flex items-center gap-1 rounded-md bg-slate-50 border border-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                          <i className={`fas ${s.device === "mobile" ? "fa-mobile-screen" : "fa-laptop"}`} />
                          {s.device === "mobile" ? "HP" : "PC"}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight ${
                          (s.subtes || "literasi") === "literasi"
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : "bg-orange-50 text-orange-700 border border-orange-100"
                        }`}
                      >
                        {(s.subtes || "literasi") === "literasi"
                          ? "Lit"
                          : "Num"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight ${
                          s.mode === "latihan"
                            ? "bg-green-50 text-green-700 border border-green-100"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                        }`}
                      >
                        {s.mode === "latihan" ? "Lat" : "TO"}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500">
                    <span>
                      Soal {(s.currentIndex || 0) + 1} / {s.totalQuestions || "?"}
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOffline ? "bg-slate-400" : "bg-indigo-50"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Timer */}
                  {s.mode !== "latihan" && (
                    <div
                      className={`mt-3 flex items-center gap-1.5 text-xs font-bold ${
                        isLowTime ? "text-red-600" : "text-slate-600"
                      }`}
                    >
                      <i
                        className={`fas fa-clock text-xs ${isLowTime ? "animate-pulse" : ""}`}
                      />
                      {fmtTime(s.timeLeft)} tersisa
                    </div>
                  )}

                  {/* Remote Actions */}
                  <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4">
                    {s.forceSubmit ? (
                      <div className="flex-1 flex items-center gap-2 text-[10px] sm:text-[11px] font-bold text-red-500 bg-red-50 px-3 py-2 rounded-xl border border-red-100">
                        <i className="fas fa-sync fa-spin text-[10px]" />
                        <span className="truncate">Menunggu Selesai...</span>
                        <button
                          onClick={() => handleForceFinish(s)}
                          className="ml-auto text-red-700 hover:text-red-900 underline shrink-0"
                        >
                          Hapus
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleSendMessage(s)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 transition hover:bg-blue-100 disabled:opacity-50"
                            title="Kirim Pesan"
                            disabled={isOffline}
                          >
                            <i className="fas fa-comment-dots text-sm" />
                          </button>
                          <button
                            onClick={() => handleAddTime(s)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100 transition hover:bg-amber-100 disabled:opacity-50"
                            title="Tambah Waktu"
                            disabled={isOffline}
                          >
                            <i className="fas fa-hourglass-half text-sm" />
                          </button>
                        </div>
                        <div className="flex-1" />
                        <button
                          onClick={() => handleForceFinish(s)}
                          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[11px] font-bold transition shadow-sm ${
                            isOffline
                              ? "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                              : "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 hover:shadow-red-100"
                          }`}
                        >
                          <i className={`fas ${isOffline ? "fa-trash-can" : "fa-power-off"} text-[10px]`} />
                          <span className="whitespace-nowrap">{isOffline ? "Hapus" : "Selesaikan"}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LiveMonitor;
