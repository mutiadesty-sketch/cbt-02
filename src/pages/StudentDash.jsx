import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { playSound } from "../lib/soundUtils";
import { useAuthStore } from "../store/authStore";
import { db } from "../lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import Page from "../ui/Page";
import Container from "../ui/Container";
import MobileDock from "../ui/MobileDock";
import AppLauncher from "../ui/AppLauncher";
import NotificationCenter from "../ui/NotificationCenter";
import Swal from "sweetalert2";
import { DEFAULT_EXAM_CONFIG } from "../lib/examConfig";
import HomeTab from "./student/HomeTab";
import HistoryTab from "./student/HistoryTab";
import RankingTab from "./student/RankingTab";
import ProfileTab from "./student/ProfileTab";

/* ── avatar background ──────────────────────────────── */
const getAvatarBg = (name = "") => {
  const colors = [
    "from-emerald-500 to-teal-600",
    "from-blue-500 to-cyan-600",
    "from-purple-500 to-violet-600",
    "from-indigo-500 to-blue-600",
    "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-sky-500 to-blue-600",
  ];
  const code = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0);
  return colors[code % colors.length];
};

/* ── component ───────────────────────────────────────── */
const StudentDash = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuthStore();
  const [selectedMode, setSelectedMode] = useState("tryout");

  const active = useMemo(() => {
    const path = location.pathname.split("/").pop();
    return path === "dashboard" ? "home" : path;
  }, [location.pathname]);

  const [history,        setHistory]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [examConfig,     setExamConfig]     = useState({ ...DEFAULT_EXAM_CONFIG });
  const [configLoading,  setConfigLoading]  = useState(true);
  const [leaderboard,    setLeaderboard]    = useState([]);
  const [lbLoading,      setLbLoading]      = useState(false);
  const [notifications,  setNotifications]  = useState([]);
  const [announcements,  setAnnouncements]  = useState([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cbt_dismissed_ann") || "[]"); }
    catch { return []; }
  });

  const tabs = [
    { id: "home",    label: "Beranda",  icon: "fa-house",              path: "/dashboard" },
    { id: "history", label: "Riwayat",  icon: "fa-clock-rotate-left",  path: "/dashboard/history" },
    { id: "ranking", label: "Ranking",  icon: "fa-trophy",             path: "/dashboard/ranking" },
    { id: "profile", label: "Profil",   icon: "fa-user",               path: "/dashboard/profile" },
  ];

  const handleTabChange = (tabId) => {
    playSound("click");
    const item = tabs.find((m) => m.id === tabId);
    if (item) navigate(item.path);
  };

  /* ── Live config ─────────────────────────────────────── */
  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, "settings", "main"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setExamConfig((prev) => ({ ...prev, ...data }));
        setNotifications((prev) => {
          const filtered = prev.filter((n) => !n.id.startsWith("config:"));
          if (data.isActive) {
            return [
              {
                id: "config:active",
                type: "exam_open",
                title: "Ujian telah dibuka! 🎉",
                body: `${data.title || "Ujian"} · Durasi ${data.duration || 60} menit`,
                time: new Date(),
                read: false,
              },
              ...filtered,
            ];
          }
          return filtered;
        });
      }
      setConfigLoading(false);
    });
    return () => unsubConfig();
  }, []);

  /* ── Announcements ───────────────────────────────────── */
  useEffect(() => {
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setAnnouncements(
        snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((a) => a.isActive),
      );
    });
    return () => unsub();
  }, []);

  /* ── Own results ─────────────────────────────────────── */
  useEffect(() => {
    if (!user?.id) return;
    const q2 = query(
      collection(db, "results"),
      where("studentId", "==", user.id),
      orderBy("submittedAt", "desc"),
    );
    const unsubResults = onSnapshot(
      q2,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setHistory(data);
        setLoading(false);
        const now = Date.now();
        const cutoff = now - 24 * 60 * 60 * 1000;
        const resultNotifs = data
          .filter((r) => (r.submittedAt?.toMillis?.() || 0) > cutoff)
          .map((r) => ({
            id: `result:${r.id}`,
            type: "result_available",
            title: `Hasil ${r.examName || "ujian"} tersedia`,
            body: `Skor: ${r.score ?? 0}% · ${r.correct ?? 0}/${r.total ?? 0} benar`,
            time: r.submittedAt?.toDate?.() || new Date(),
            read: false,
          }));
        setNotifications((prev) => {
          const configNotifs = prev.filter((n) => n.id.startsWith("config:"));
          return [...configNotifs, ...resultNotifs];
        });
      },
      (err) => {
        console.error("[CBT] Error reading student results:", err);
        setLoading(false);
      },
    );
    return () => unsubResults();
  }, [user?.id]);

  const handleMarkRead    = useCallback((id) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n))), []);
  const handleMarkAllRead = useCallback(() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))), []);

  /* ── Leaderboard ─────────────────────────────────────── */
  const fetchLeaderboard = async () => {
    setLbLoading(true);
    try {
      const snap = await getDocs(collection(db, "results"));
      const byStudent = {};
      snap.forEach((d) => {
        const r = d.data();
        if (r.mode === "latihan") return;
        const sid = r.studentId;
        if (!byStudent[sid] || r.score > byStudent[sid].score) {
          byStudent[sid] = { studentId: sid, studentName: r.studentName, kelas: r.kelas, score: r.score };
        }
      });
      setLeaderboard(Object.values(byStudent).sort((a, b) => b.score - a.score).slice(0, 10));
    } catch (e) { console.error(e); }
    finally { setLbLoading(false); }
  };
  useEffect(() => { if (active === "ranking") fetchLeaderboard(); }, [active]);

  /* ── Start exam flow ─────────────────────────────────── */
  const startExamFlow = async (mapel = "IPAS", mode = "tryout") => {
    if (configLoading) return;
    if (!examConfig.isActive) {
      await Swal.fire({ icon: "info", title: "Ujian belum dibuka", text: "Silakan tunggu sampai ujian diaktifkan oleh admin.", confirmButtonText: "Mengerti" });
      return;
    }
    const now = Date.now();
    const startMs = examConfig.startAt ? Date.parse(examConfig.startAt) : NaN;
    const endMs   = examConfig.endAt   ? Date.parse(examConfig.endAt)   : NaN;
    if (!Number.isNaN(startMs) && now < startMs) {
      await Swal.fire({ icon: "info", title: "Belum waktunya ujian", text: `Ujian dibuka pada ${new Date(startMs).toLocaleString("id-ID")}.` });
      return;
    }
    if (!Number.isNaN(endMs) && now > endMs) {
      await Swal.fire({ icon: "info", title: "Ujian sudah ditutup", text: `Ujian ditutup pada ${new Date(endMs).toLocaleString("id-ID")}.` });
      return;
    }
    if (examConfig.token && examConfig.token.trim()) {
      const res = await Swal.fire({
        title: "Masukkan Token Ujian",
        input: "text",
        inputPlaceholder: "Contoh: UJI2024",
        inputAttributes: { autocapitalize: "characters", autocomplete: "off" },
        showCancelButton: true,
        confirmButtonText: "Mulai",
        cancelButtonText: "Batal",
        preConfirm: (val) => String(val || "").trim().toUpperCase(),
      });
      if (!res.isConfirmed) return;
      const tokenInput    = (res.value || "").toUpperCase();
      const tokenExpected = String(examConfig.token || "").trim().toUpperCase();
      if (tokenInput !== tokenExpected) {
        await Swal.fire({ icon: "error", title: "Token salah", text: "Periksa kembali token ujian." });
        return;
      }
    }
    playSound("success");
    navigate(`/exam?mapel=${encodeURIComponent(mapel)}&mode=${mode}`);
  };

  return (
    <Page>
      {/* ══════════════ TOP NAV BAR ══════════════ */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-[0_1px_12px_rgb(0,0,0,0.04)]">
        <Container>
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Smart CBT" className="h-9 w-9 object-contain drop-shadow-md" />
              <div className="hidden sm:block">
                <div className="text-sm font-bold text-slate-900">Smart CBT</div>
                <div className="text-[10px] text-slate-400 leading-none">SDN 02 Cibadak</div>
              </div>
            </div>

            {/* Desktop tab navigation */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100 rounded-2xl p-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTabChange(t.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                    active === t.id
                      ? "bg-white shadow-sm text-indigo-700 shadow-slate-200"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <i className={`fas ${t.icon} text-xs`} />
                  {t.label}
                </button>
              ))}
            </nav>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              <NotificationCenter
                notifications={notifications}
                onMarkRead={handleMarkRead}
                onMarkAllRead={handleMarkAllRead}
              />
              <AppLauncher />

              {/* Avatar + name */}
              <div className="flex items-center gap-2.5">
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-semibold text-slate-900 leading-tight">{user?.name || "Siswa"}</div>
                  <div className="text-xs text-slate-400">Kelas {user?.kelas || "-"}</div>
                </div>
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-md ${getAvatarBg(user?.name)}`}
                >
                  {user?.name?.charAt(0)?.toUpperCase() || "S"}
                </div>
              </div>

              <button
                onClick={logout}
                className="btn btn-ghost btn-icon hidden sm:flex text-slate-400 hover:text-red-500"
                title="Logout"
              >
                <i className="fas fa-sign-out-alt text-sm" />
              </button>
            </div>
          </div>
        </Container>
      </header>

      {/* ══════════════ PAGE CONTENT ══════════════ */}
      <Container className="py-5 pb-28 md:pb-8 md:py-8">
        {/* Announcement Banners */}
        {announcements.filter((a) => !dismissedAnnouncements.includes(a.id)).length > 0 && (
          <div className="mb-5 space-y-2">
            {announcements
              .filter((a) => !dismissedAnnouncements.includes(a.id))
              .map((ann) => {
                const typeStyles = {
                  info:    "border-blue-200 bg-blue-50 text-blue-800",
                  warning: "border-amber-200 bg-amber-50 text-amber-800",
                  success: "border-green-200 bg-green-50 text-green-800",
                };
                const typeIcons = {
                  info:    "fa-circle-info text-blue-500",
                  warning: "fa-triangle-exclamation text-amber-500",
                  success: "fa-circle-check text-green-500",
                };
                return (
                  <div
                    key={ann.id}
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 animate-fade-in ${typeStyles[ann.type] || typeStyles.info}`}
                  >
                    <i className={`fas ${typeIcons[ann.type] || typeIcons.info} mt-0.5 shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold">{ann.title}</div>
                      <div className="mt-0.5 text-xs leading-relaxed opacity-80">{ann.body}</div>
                    </div>
                    <button
                      onClick={() => {
                        playSound("click");
                        const next = [...dismissedAnnouncements, ann.id];
                        setDismissedAnnouncements(next);
                        try { localStorage.setItem("cbt_dismissed_ann", JSON.stringify(next)); } catch {}
                      }}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg opacity-50 transition hover:opacity-100"
                    >
                      <i className="fas fa-times text-xs" />
                    </button>
                  </div>
                );
              })}
          </div>
        )}

        <div className="animate-fade-in">
          <Routes>
            <Route index element={
              <HomeTab
                examConfig={examConfig}
                configLoading={configLoading}
                selectedMode={selectedMode}
                setSelectedMode={setSelectedMode}
                startExamFlow={startExamFlow}
                history={history}
                loading={loading}
                setActive={(id) => handleTabChange(id)}
              />
            } />
            <Route path="history" element={<HistoryTab history={history} loading={loading} examConfig={examConfig} />} />
            <Route path="ranking" element={<RankingTab leaderboard={leaderboard} lbLoading={lbLoading} fetchLeaderboard={fetchLeaderboard} userId={user?.id} />} />
            <Route path="profile" element={<ProfileTab user={user} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Container>

      {/* Mobile bottom dock */}
      <MobileDock
        items={tabs}
        activeId={active}
        onChange={async (id) => {
          playSound("click");
          if (id === "start")   return startExamFlow(examConfig.activeMapel || "umum");
          if (id === "logout")  return logout();
          if (id === "ranking" && leaderboard.length === 0) fetchLeaderboard();
          handleTabChange(id);
        }}
      />
    </Page>
  );
};

export default StudentDash;
