import DashboardHome from "./DashboardHome";
import { getSubtesLabel } from "../../lib/examConfig";
import ExamRoom from "../ExamRoom";
import { Joyride, STATUS } from "react-joyride";
import AcademicWrapper from "./AcademicWrapper";
import QuestionsWrapper from "./QuestionsWrapper";
import MonitoringWrapper from "./MonitoringWrapper";
import SystemWrapper from "./SystemWrapper";
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate, useParams } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { db } from "../../lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import MobileDock from "../../ui/MobileDock";
import AppLauncher from "../../ui/AppLauncher";
import NotificationCenter from "../../ui/NotificationCenter";
import CommandPalette from "../../ui/CommandPalette";
import { DEFAULT_EXAM_CONFIG } from "../../lib/examConfig";
import { motion, AnimatePresence } from "framer-motion";

/* ── Notification helpers ── */
const NOTIF_STORAGE_KEY = "cbt_admin_notif_seen";

const getSeenTimestamp = () => {
  try {
    return parseInt(localStorage.getItem(NOTIF_STORAGE_KEY) || "0", 10);
  } catch {
    return 0;
  }
};

const setSeenTimestamp = (ts) => {
  try {
    localStorage.setItem(NOTIF_STORAGE_KEY, String(ts));
  } catch {
    /* noop */
  }
};

const toMillisSafe = (value) => {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const AdminDash = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Current active tab based on URL
  const activeTab = useMemo(() => {
    const path = location.pathname.split("/").pop();
    return path === "admin" ? "dashboard" : path;
  }, [location.pathname]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("cbt_admin_sidebar_collapsed") === "true";
  });

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem("cbt_admin_sidebar_collapsed", String(next));
  };
  const { logout, user } = useAuthStore();
  const [stats, setStats] = useState({
    students: 0,
    questions: 0,
    results: 0,
    avgScore: 0,
  });
  const [recentResults, setRecentResults] = useState([]);
  const [recentActive, setRecentActive] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [allResults, setAllResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newResultsCount, setNewResultsCount] = useState(0);
  const [examConfig, setExamConfig] = useState({
    ...DEFAULT_EXAM_CONFIG,
  });

  // Notification state
  const [notifications, setNotifications] = useState([]);

  // Command Palette state
  const [cmdOpen, setCmdOpen] = useState(false);

  // Data for Command Palette search
  const [allStudents, setAllStudents] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);

  // Active Admins presence tracking
  const [activeAdmins, setActiveAdmins] = useState([]);



  // Tour State
  const [runTour, setRunTour] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem("cbt_admin_tour_seen")) {
      setRunTour(true); 
      // Mark as seen immediately to prevent loop on refresh
      localStorage.setItem("cbt_admin_tour_seen", "true");
    }
  }, []);

  const handleTourCallback = (data) => {
    const { status, type } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status) || type === "tour:end") {
      setRunTour(false);
      localStorage.setItem("cbt_admin_tour_seen", "true");
    }
  };

  const tourSteps = [
    {
      target: ".tour-dashboard",
      content: "👋 Selamat datang di Admin Console! Ini adalah Menu Utama untuk memantau data ujian.",
      disableBeacon: true,
      placement: "right"
    },
    {
      target: ".tour-academic",
      content: "Kelola bank soal di area ini. Buat, edit, atau duplikasi soal dengan mudah.",
      placement: "right"
    },
    {
      target: ".tour-monitoring",
      content: "Pantau hasil ujian siswa dan aktivitas peserta (Live Monitor) secara real-time.",
      placement: "right"
    },
    {
      target: ".tour-system",
      content: "Atur token ujian, tanggal, pengaturan durasi, dan hak akses admin di sini.",
      placement: "right"
    },
    {
      target: ".tour-cmd",
      content: "Pencarian super cepat (Command Palette). Tekan ⌘K di mana saja untuk mencari siswa atau soal.",
      placement: "bottom"
    }
  ];

  // Presence heartbeat mechanism
  useEffect(() => {
    if (!user) return;
    
    // Use an email-safe string for doc ID
    const presenceId = user.uid || user.email?.replace(/@|\./g, "_") || "unknown_admin";
    const presenceRef = doc(db, "admin_presence", presenceId);
    
    const updatePresence = async () => {
      try {
        await setDoc(presenceRef, {
          name: user.name || user.email || "Admin",
          photoURL: user.photoURL || null,
          lastSeen: serverTimestamp()
        }, { merge: true });
      } catch (e) {
        console.error("Presence update failed", e);
      }
    };
    
    updatePresence();
    const intervalId = setInterval(updatePresence, 60000); // 1 minute heartbeat
    
    const removePresence = () => {
      deleteDoc(presenceRef).catch(() => {});
    };
    
    window.addEventListener("beforeunload", removePresence);
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener("beforeunload", removePresence);
      removePresence();
    };
  }, [user]);

  // Listen to active admins
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "admin_presence"), (snap) => {
      const now = new Date().getTime();
      const admins = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => {
           // Filter out admins who haven't updated in 3 minutes (180000 ms)
           const lastSeenMs = d.lastSeen ? (typeof d.lastSeen.toMillis === 'function' ? d.lastSeen.toMillis() : d.lastSeen) : 0;
           return (now - lastSeenMs) < 180000;
        });
      setActiveAdmins(admins);
    });
    return () => unsub();
  }, []);

  // Real-time recap
  useEffect(() => {
    console.log("[CBT DEBUG] Setting up Firestore listeners...");
    const unsubStudents = onSnapshot(collection(db, "students"), (snap) => {
      console.log("[CBT DEBUG] Students loaded:", snap.size, "documents");
      setStats((s) => ({ ...s, students: snap.size }));
      setAllStudents(
        snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      );
    }, (err) => console.error("[CBT ERROR] Failed reading students:", err.code, err.message));
    const unsubQuestions = onSnapshot(collection(db, "questions"), (snap) => {
      console.log("[CBT DEBUG] Questions loaded:", snap.size, "documents");
      setStats((s) => ({ ...s, questions: snap.size }));
      setAllQuestions(
        snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      );
    }, (err) => console.error("[CBT ERROR] Failed reading questions:", err.code, err.message));
    const unsubResults = onSnapshot(collection(db, "results"), (snap) => {
      console.log("[CBT DEBUG] Results loaded:", snap.size, "documents");
      if (snap.size > 0) {
        console.log("[CBT DEBUG] Sample result:", JSON.stringify(snap.docs[0].data(), null, 2));
      }
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort(
          (a, b) =>
            toMillisSafe(b.submittedAt) - toMillisSafe(a.submittedAt),
        );
      setAllResults(data);
      const resultsCount = data.length;
      const avgScore =
        resultsCount > 0
          ? Math.round(
              data.reduce((a, r) => a + (r.score || 0), 0) / resultsCount,
            )
          : 0;
      console.log("[CBT DEBUG] Stats -> results:", resultsCount, "avgScore:", avgScore);
      setStats((s) => ({ ...s, results: resultsCount, avgScore }));
      setRecentResults(data.slice(0, 5));
      setLoading(false);

      // Notification badge
      const now = Date.now();
      const cutoff24h = now - 24 * 60 * 60 * 1000;
      const cutoff1h = now - 60 * 60 * 1000;
      const newCount = data.filter(
        (r) => (r.submittedAt?.toMillis?.() || 0) > cutoff24h,
      ).length;
      setNewResultsCount(newCount);

      setRecentActive(
        data.filter((r) => (r.submittedAt?.toMillis?.() || 0) > cutoff1h),
      );

      // Generate notifications from results
      const seenTs = getSeenTimestamp();
      const notifs = data
        .filter((r) => {
          const ts = r.submittedAt?.toMillis?.() || 0;
          return ts > cutoff24h;
        })
        .map((r) => ({
          id: `result:${r.id}`,
          type: "exam_submit",
          title: `${r.studentName} selesai ujian`,
          body: `Skor: ${r.score ?? 0}% · ${r.correct ?? 0}/${r.total ?? 0} benar · ${getSubtesLabel(r.subtes || "literasi")}`,
          time: r.submittedAt?.toDate?.() || new Date(),
          read: (r.submittedAt?.toMillis?.() || 0) <= seenTs,
        }));
      setNotifications(notifs);
    }, (err) => console.error("[CBT ERROR] Failed reading results:", err.code, err.message));

    return () => {
      unsubStudents();
      unsubQuestions();
      unsubResults();
    };
  }, []);

  // Sessions monitoring — generate start & tab-switch notifications
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "sessions"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSessions(data);

      const sessNotifs = data.map((s) => {
        return {
          id: `session:${s.id}`,
          type: "exam_start",
          title: `${s.studentName || "Siswa"} sedang ujian`,
          body: `Kelas ${s.kelas || "–"} · Soal ${(s.currentIndex || 0) + 1}/${s.totalQuestions || "?"} · ${getSubtesLabel(s.subtes || "literasi")}`,
          time: new Date(),
          read: true, // sessions are "always read" — just informational
        };
      });

      setNotifications((prev) => {
        // Merge: keep result notifs, prepend session notifs
        const resultNotifs = prev.filter((n) => n.id.startsWith("result:"));
        return [...sessNotifs, ...resultNotifs];
      });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "main"));
        if (snap.exists())
          setExamConfig((prev) => ({ ...prev, ...snap.data() }));
      } catch (e) {
        console.error("Error fetching exam config:", e);
      }
    };
    fetchConfig();
  }, []);

  // Command Palette keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleMarkRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const handleMarkAllRead = useCallback(() => {
    const now = Date.now();
    setSeenTimestamp(now);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "fa-chart-line",
      color: "emerald",
      path: "/admin",
    },
    { id: "academic", label: "Akademik", icon: "fa-graduation-cap", color: "purple", path: "/admin/academic" },
    { id: "questions", label: "Pusat Soal", icon: "fa-book-open", color: "blue", path: "/admin/questions" },
    {
      id: "monitoring",
      label: "Pantauan Ujian",
      icon: "fa-satellite-dish",
      color: "cyan",
      path: "/admin/monitoring",
    },
    {
      id: "system",
      label: "Sistem",
      icon: "fa-sliders-h",
      color: "orange",
      path: "/admin/system",
    },
  ];

  // Grouped for sidebar rendering
  const menuGroups = [
    { label: "Utama", items: menuItems.filter(m => m.id === "dashboard") },
    { label: "Akademik", items: menuItems.filter(m => ["questions", "academic"].includes(m.id)) },
    { label: "Operasional", items: menuItems.filter(m => m.id === "monitoring") },
    { label: "Sistem", items: menuItems.filter(m => m.id === "system") },
  ];

  const handleTabChange = (tabId) => {
    const item = menuItems.find(m => m.id === tabId);
    if (item) navigate(item.path);
    setMobileNavOpen(false);
  };

  const handlePreview = (subtes) => {
    navigate(`/admin/preview/${subtes}`);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ── Desktop Sidebar ── */}
      <aside
        className={`hidden md:flex md:flex-col md:sticky md:top-0 md:h-screen bg-white border-r border-slate-200 transition-all duration-300 z-40 shadow-[1px_0_12px_rgb(0,0,0,0.02)] ${
          sidebarCollapsed ? "w-[80px]" : "w-[260px]"
        }`}
      >
        {/* Brand header */}
        {sidebarCollapsed ? (
          <div className="flex h-16 shrink-0 items-center justify-center border-b border-slate-100">
            <button
              type="button"
              onClick={toggleSidebar}
              title="Expand sidebar"
              className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden transition hover:bg-slate-50"
            >
              <img
                src="/logo.png"
                alt="SDN 02 Cibadak"
                className="h-8 w-8 object-contain drop-shadow-sm"
              />
            </button>
          </div>
        ) : (
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5">
            <button type="button" onClick={toggleSidebar} className="flex items-center gap-3 text-left hover:opacity-80 transition">
              <img
                src="/logo.png"
                alt="SDN 02 Cibadak"
                className="h-8 w-8 shrink-0 object-contain drop-shadow-sm"
              />
              <div className="min-w-0 pr-1">
                <div className="text-[13px] font-black text-slate-900 tracking-tight leading-tight">Smart CBT</div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest leading-tight mt-0.5">Admin Console</div>
              </div>
            </button>
            <button
              type="button"
              onClick={toggleSidebar}
              title="Collapse sidebar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <i className="fas fa-angles-left text-xs" />
            </button>
          </div>
        )}

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-4 px-2">
          <nav className="space-y-3">
            {menuGroups.map((group) => (
              <div key={group.label}>
                {!sidebarCollapsed && (
                  <div className="mb-1 px-3 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                    {group.label}
                  </div>
                )}
                <div className="grid gap-0.5">
                  {group.items.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleTabChange(item.id)}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={`tour-${item.id} relative flex w-full items-center rounded-xl transition-all font-semibold text-[13px] overflow-hidden ${
                          sidebarCollapsed
                            ? "h-11 justify-center"
                            : "gap-3 px-3 py-2"
                        } ${
                          isActive
                            ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100/80"
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 group"
                        }`}
                      >
                        <div className={`flex items-center justify-center h-7 w-7 rounded-lg transition-colors flex-shrink-0 ${isActive ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-100"}`}>
                          <i className={`fas ${item.icon} text-[12px]`} />
                        </div>
                        {!sidebarCollapsed && (
                          <span className="flex-1 text-left truncate tracking-tight">
                            {item.label}
                          </span>
                        )}
                        {/* Badge */}
                        {item.id === "results" &&
                          newResultsCount > 0 &&
                          (sidebarCollapsed ? (
                            <span className="absolute right-1.5 top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-black leading-none text-white border border-white shadow-sm">
                              {newResultsCount > 9 ? "9+" : newResultsCount}
                            </span>
                          ) : (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-50 border border-red-100 px-1 text-[10px] font-black text-red-600">
                              {newResultsCount > 99 ? "99+" : newResultsCount}
                            </span>
                          ))}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer: profile + logout */}
        <div className="shrink-0 border-t border-slate-100 bg-slate-50 p-4">
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-3">
              <div className="relative group cursor-pointer w-10">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.name || "Admin"}
                    className="h-10 w-10 rounded-xl object-cover ring-2 ring-white shadow-sm bg-white"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 text-sm font-black text-slate-600 shadow-inner">
                    {user?.name?.charAt(0) || "A"}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
                
                {/* Tooltip */}
                <div className="absolute left-14 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap bg-slate-800 text-white text-xs px-3 py-2 rounded-xl shadow-xl font-bold z-50 translate-x-2 group-hover:translate-x-0">
                  {user?.name || "Admin"}
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                title="Keluar"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-slate-200 hover:text-red-500 group"
              >
                <i className="fas fa-power-off text-sm transition-transform group-hover:scale-110" />
              </button>
            </div>
          ) : (
            <div className="group relative flex items-center justify-between transition-all">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="relative shrink-0">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.name || "Admin"}
                      className="h-10 w-10 rounded-xl object-cover shadow-sm bg-white p-0.5"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 text-[15px] font-black text-slate-600 shadow-inner">
                      {user?.name?.charAt(0) || "A"}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-black text-slate-900 leading-tight">
                    {user?.name || "Admin"}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span className={`h-1.5 w-1.5 rounded-full ${examConfig.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                    {examConfig.isActive ? <span className="text-emerald-600">Ujian Aktif</span> : "Standby"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                title="Keluar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-slate-200 hover:text-red-500"
              >
                <i className="fas fa-power-off text-sm" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex h-14 shrink-0 items-center border-b border-slate-200/80 bg-white px-4 md:px-6 shadow-[0_1px_12px_rgb(0,0,0,0.03)]">
          <div className="flex flex-1 items-center gap-2">
            {/* Sidebar toggle — desktop only */}
            <button
              type="button"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden md:flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <i className={`fas ${sidebarCollapsed ? "fa-bars" : "fa-bars-staggered"} text-sm`} />
            </button>

            <nav className="flex items-center gap-1">
              <button
                onClick={() => handleTabChange('dashboard')}
                className="group flex items-center justify-center h-8 w-8 rounded-xl hover:bg-slate-100 transition-all text-slate-400 hover:text-slate-700"
                title="Dashboard"
              >
                <i className="fas fa-home text-sm" />
              </button>
              
              <i className="fas fa-chevron-right text-[9px] text-slate-300" />
              
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200">
                <i className={`fas ${menuItems.find((m) => m.id === activeTab)?.icon || 'fa-circle'} text-[11px] text-indigo-500`} />
                <span className="text-[13px] font-bold text-slate-800 tracking-tight">
                  {menuItems.find((m) => m.id === activeTab)?.label || "Dashboard"}
                </span>
              </div>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {/* Active Admins Avatars */}
            {activeAdmins.length > 0 && (
              <div className="hidden md:flex items-center -space-x-2 mr-2">
                {activeAdmins.map((admin, idx) => (
                  <div key={admin.id} className="relative group cursor-pointer" style={{ zIndex: 10 - idx }}>
                    {admin.photoURL ? (
                      <img
                        src={admin.photoURL}
                        alt={admin.name}
                        className="w-8 h-8 rounded-xl border-2 border-white object-cover shadow-sm bg-slate-100"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-xl border-2 border-white bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-black shadow-sm">
                        {admin.name.charAt(0)}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                    
                    {/* Tooltip */}
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap bg-slate-800 text-white text-[10px] px-2 py-1 rounded-md shadow-lg font-medium z-50">
                      {admin.name} {admin.id === (user?.uid || user?.email?.replace(/@|\./g, "_")) && "(Anda)"}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Command Palette trigger */}
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              title="Pencarian (Ctrl+K)"
              className="tour-cmd hidden md:flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition-all hover:bg-slate-100 hover:text-indigo-600 border border-slate-200"
            >
              <i className="fas fa-search text-xs" />
            </button>


            {/* Notification Center */}
            <NotificationCenter
              notifications={notifications}
              onMarkRead={handleMarkRead}
              onMarkAllRead={handleMarkAllRead}
            />

            <AppLauncher />
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="btn btn-ghost px-3 md:hidden"
              aria-label="Buka menu"
            >
              <i className="fas fa-bars" />
            </button>
          </div>
        </div>

        {/* Exam Live Status Banner */}
        {examConfig.isActive && (
          <div className="flex items-center gap-3 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-2 text-xs">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-400" />
            <span className="font-black text-emerald-700 uppercase tracking-wider">Live Ujian Aktif</span>
            {sessions.length > 0 && (
              <span className="text-emerald-600">· <strong>{sessions.length}</strong> siswa mengerjakan</span>
            )}
            {examConfig.token && (
              <span className="text-emerald-600">· Token: <strong className="font-black tracking-widest">{examConfig.token}</strong></span>
            )}
            <button
              onClick={() => handleTabChange('monitoring')}
              className="ml-auto flex items-center gap-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 px-3 py-1 font-bold text-emerald-700 transition"
            >
              Pantau <i className="fas fa-arrow-right text-[9px]" />
            </button>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 p-5 md:p-7 w-full max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Routes location={location} key={location.pathname}>
                <Route index element={
                  <DashboardHome
                    stats={stats}
                    recentResults={recentResults}
                    recentActive={recentActive}
                    sessions={sessions}
                    loading={loading}
                    examConfig={examConfig}
                    onGo={(tab) => handleTabChange(tab)}
                    allResults={allResults}
                    adminName={user?.name || "Admin"}
                  />
                } />
                <Route path="academic" element={<AcademicWrapper />} />
                <Route path="questions" element={<QuestionsWrapper />} />
                <Route path="monitoring" element={<MonitoringWrapper />} />
                <Route path="system" element={<SystemWrapper onPreview={handlePreview} />} />
                
                {/* Preview route */}
                <Route path="preview/:subtes" element={<PreviewWrapper />} />
                
                {/* Fallback */}
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileNavOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Tutup menu"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white border-r border-slate-200 shadow-xl">
            {/* Mobile brand */}
            <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-100 px-4">
              <img
                src="/logo.png"
                alt="SDN 02 Cibadak"
                className="h-8 w-8 shrink-0 object-contain drop-shadow-sm"
              />
              <div className="min-w-0">
                <div className="text-[13px] font-black text-slate-900 tracking-tight leading-tight">Smart CBT</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Admin Console</div>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <i className="fas fa-times text-xs" />
              </button>
            </div>

            {/* Mobile nav */}
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <div className="mb-2 px-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Menu</div>
              <nav className="grid gap-1">
                {menuItems.map((it) => {
                  const isActive = activeTab === it.id;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition ${
                        isActive
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                      onClick={() => handleTabChange(it.id)}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          isActive
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <i
                          className={`fas ${it.icon} text-sm`}
                        />
                      </div>
                      <span className="flex-1 text-left">{it.label}</span>
                      {it.id === "results" && newResultsCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-50 px-1 text-[10px] font-bold text-white">
                          {newResultsCount > 99 ? "99+" : newResultsCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

          {/* Mobile footer — light theme */}
          <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-3 py-3">
            <div className="flex items-center gap-3 rounded-xl px-2 py-2">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.name || "Admin"}
                  className="h-9 w-9 shrink-0 rounded-xl object-cover ring-2 ring-indigo-500"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 text-sm font-black text-slate-600">
                  {user?.name?.charAt(0) || "A"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-black text-slate-900">
                  {user?.name || "Admin"}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-0.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${examConfig.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                  {examConfig.isActive ? "Ujian Aktif" : "Nonaktif"}
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Logout"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-200 hover:text-red-500"
              >
                <i className="fas fa-sign-out-alt text-sm" />
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Mobile dock — only essential items, rest accessible via drawer */}
      <MobileDock
        items={menuItems
          .filter((m) => ["dashboard", "questions", "students", "results", "settings"].includes(m.id))
          .map((m) => ({
            id: m.id,
            label: m.label,
            icon: m.icon,
          }))}
        activeId={activeTab}
        onChange={handleTabChange}
      />

      {/* Floating Action Button (FAB) for Mobile - Quick Actions */}
      <div className="fixed bottom-24 right-6 z-40 md:hidden">
        <div className="relative group">
          <button
            className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200 transition-transform active:scale-90"
            onClick={() => setCmdOpen?.(true)}
          >
            <i className="fas fa-bolt text-xl" />
          </button>
        </div>
      </div>

      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        callback={handleTourCallback}
        styles={{
          options: {
            primaryColor: '#4f46e5',
            zIndex: 10000,
          },
        }}
        locale={{ last: "Selesai", next: "Lanjut", skip: "Lewati", back: "Kembali" }}
      />

      {/* Command Palette */}
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onNavigate={(tabId) => {
          handleTabChange(tabId);
          setCmdOpen(false);
        }}
        menuItems={menuItems}
        students={allStudents}
        questions={allQuestions}
        results={allResults}
        onPreview={handlePreview}
        onLogout={logout}
      />
    </div>
  );
};

// Wrapper for preview to handle params
const PreviewWrapper = () => {
  const { subtes } = useParams();
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
      <ExamRoom
        subtes={subtes}
        mode="tryout"
        preview={true}
        onExitPreview={() => navigate("/admin/settings")}
      />
    </div>
  );
};

export default AdminDash;
