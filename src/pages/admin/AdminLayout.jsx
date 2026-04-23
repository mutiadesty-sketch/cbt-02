import React, { useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import NotificationCenter from "../../ui/NotificationCenter";

const AdminLayout = ({
  children,
  stats,
  newResultsCount,
  examConfig,
  notifications,
  activeAdmins,
  cmdOpen,
  setCmdOpen,
  onMarkRead,
  onMarkAllRead,
}) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { logout, user } = useAuthStore();

  // Persist sidebar state to localStorage so it survives navigation
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("adminSidebarOpen");
    return saved === null ? true : saved === "true";
  });

  const toggleSidebar = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    localStorage.setItem("adminSidebarOpen", String(next));
  };

  // By default expand everything on desktop for easy access
  const [expandedGroups, setExpandedGroups] = useState({
    dashboard: true,
    data:      true,
    monitor:   true,
    content:   true,
    system:    true,
  });

  const activeTab = useMemo(() => {
    const path = location.pathname.split("/").pop();
    return path === "admin" ? "dashboard" : path;
  }, [location.pathname]);

  const menuGroups = [
    {
      id: "dashboard", label: "Utama", icon: "fa-home",
      items: [
        { id: "dashboard", label: "Dashboard",        icon: "fa-chart-pie",         path: "/admin",                badge: null },
      ],
    },
    {
      id: "data", label: "Kelola Data", icon: "fa-database",
      items: [
        { id: "questions", label: "Bank Soal",        icon: "fa-book-open",         path: "/admin/questions",      badge: null },
        { id: "students",  label: "Data Siswa",       icon: "fa-users",             path: "/admin/students",       badge: null },
      ],
    },
    {
      id: "monitor", label: "Pemantauan", icon: "fa-chart-mixed",
      items: [
        { id: "monitor",   label: "Live Monitor",     icon: "fa-satellite-dish",    path: "/admin/monitor",        badge: null },
        { id: "results",   label: "Hasil Ujian",      icon: "fa-trophy",            path: "/admin/results",        badge: newResultsCount > 0 ? newResultsCount : null },
        { id: "analysis",  label: "Analisis Butir",   icon: "fa-microscope",        path: "/admin/analysis",       badge: null },
      ],
    },
    {
      id: "content", label: "Informasi", icon: "fa-file-alt",
      items: [
        { id: "announcements", label: "Pengumuman",  icon: "fa-bullhorn",           path: "/admin/announcements",  badge: null },
      ],
    },
    {
      id: "system", label: "Pengaturan", icon: "fa-cog",
      items: [
        { id: "settings",  label: "Pengaturan Ujian",icon: "fa-sliders",            path: "/admin/settings",       badge: null },
        { id: "admins",    label: "Hak Akses Admin", icon: "fa-user-shield",        path: "/admin/admins",         badge: null },
        { id: "activity",  label: "Log Sistem",      icon: "fa-clipboard-list",     path: "/admin/activity",       badge: null },
      ],
    },
  ];

  const toggleGroup = useCallback((id) => setExpandedGroups((p) => ({ ...p, [id]: !p[id] })), []);
  const unreadCount = notifications?.filter?.((n) => !n.read).length || 0;

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* ════════════════ SIDEBAR (LIGHT THEME) ════════════════ */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 md:static md:z-auto ${
          sidebarOpen ? "w-[260px]" : "w-0 md:w-[80px]"
        } overflow-hidden bg-white border-r border-slate-200 shadow-[1px_0_12px_rgb(0,0,0,0.02)]`}
      >
        {/* Brand Header */}
        <div
          className={`flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5 transition-all ${
            !sidebarOpen && "md:justify-center"
          }`}
        >
          {sidebarOpen ? (
            <button onClick={toggleSidebar} className="flex items-center gap-3 text-left hover:opacity-80 transition">
              <img src="/logo.png" alt="CBT" className="h-8 w-8 object-contain drop-shadow-sm" />
              <div className="min-w-0">
                <div className="text-[13px] font-black text-slate-900 tracking-tight leading-tight shrink-0">Smart CBT</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Admin Area</div>
              </div>
            </button>
          ) : (
            <button onClick={toggleSidebar} className="hover:opacity-80 transition">
              <img src="/logo.png" alt="CBT" className="h-10 w-10 object-contain drop-shadow-sm" />
            </button>
          )}
        </div>

        {/* Navigation Wrapper */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {menuGroups.map((group) => (
            <div key={group.id} className="mb-0">
              {/* Group Label */}
              {sidebarOpen && (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-3 mb-1 cursor-pointer group-btn"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{group.label}</span>
                  <i className={`fas fa-chevron-down text-[9px] text-slate-300 transition-transform duration-300 ${expandedGroups[group.id] ? "rotate-180" : ""}`} />
                </button>
              )}

              {/* Items */}
              <div className={`overflow-hidden transition-all duration-300 ${expandedGroups[group.id] ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          navigate(item.path);
                          // Auto-close sidebar on mobile after navigation
                          if (window.innerWidth < 768) {
                            setSidebarOpen(false);
                            localStorage.setItem("adminSidebarOpen", "false");
                          }
                        }}
                        title={!sidebarOpen ? item.label : ""}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                          isActive
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                        } ${!sidebarOpen ? "justify-center" : ""}`}
                      >
                        <div className={`flex items-center justify-center h-6 w-6 rounded transition-colors ${isActive ? "bg-white/20 text-white" : "text-slate-400 group-hover:text-slate-600"}`}>

                          <i className={`fas ${item.icon} text-sm`} />
                        </div>
                        {sidebarOpen && (
                          <span className="flex-1 text-left truncate tracking-tight">{item.label}</span>
                        )}
                        {item.badge && sidebarOpen && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-50 px-1.5 text-[10px] font-black text-red-600 shadow-sm border border-red-100">
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        )}
                        {/* Dot indicator for collapsed state */}
                         {item.badge && !sidebarOpen && (
                           <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-50 border-2 border-white"></span>
                         )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Profile Footer */}
        <div className="border-t border-slate-100 p-4 bg-slate-50">
          {sidebarOpen ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 w-full">
                <div className="relative">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-sm font-bold text-slate-600">
                    {user?.name?.charAt(0) || "A"}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm"></span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-black text-slate-900">{user?.name || "Admin"}</div>
                  <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Online</div>
                </div>
                <button
                  onClick={logout}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-200 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <i className="fas fa-sign-out-alt text-sm" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200 text-[13px] font-bold text-slate-600">
                  {user?.name?.charAt(0) || "A"}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm"></span>
              </div>
              <button onClick={logout} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 hover:text-red-500 transition-colors">
                <i className="fas fa-sign-out-alt text-sm" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={() => { setSidebarOpen(false); localStorage.setItem("adminSidebarOpen", "false"); }}
        />
      )}

      {/* ════════════════ MAIN CONTENT ════════════════ */}
      <div className="flex flex-1 flex-col min-w-0">
        
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-4 md:px-8 shadow-[0_1px_12px_rgb(0,0,0,0.03)]">
          <div className="flex items-center gap-4">
             {/* Mobile hamburger */}
            <button
              onClick={toggleSidebar}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <i className="fas fa-bars text-sm" />
            </button>
            
            <div className="hidden sm:flex items-center gap-3 pl-2">
              <div className="h-5 w-1 rounded-full bg-gradient-to-b from-indigo-500 to-violet-600"></div>
              <h1 className="text-[17px] font-black text-slate-900 tracking-tight">
                {menuGroups.flatMap((g) => g.items).find((i) => i.id === activeTab)?.label || "Dashboard"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
             {/* Active Admins indicators */}
             {activeAdmins?.length > 0 && (
                <div className="hidden lg:flex items-center -space-x-2 mr-3">
                   {activeAdmins.slice(0, 3).map((admin, idx) => (
                      <div key={admin.id} className="relative z-[10]">
                         <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-xs font-bold text-slate-600 shadow-sm">
                            {admin.name?.charAt(0) || "A"}
                         </div>
                      </div>
                   ))}
                </div>
             )}

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Global Search / Command */}
              <button
                onClick={() => setCmdOpen?.(!cmdOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-indigo-600 shadow-sm border border-slate-200"
                title="Pencarian Cepat (⌘K)"
              >
                <i className="fas fa-search text-sm w-4 h-4 text-center mt-0.5" />
              </button>


              {/* Notifikasi */}
              <NotificationCenter 
                 notifications={notifications} 
                 onMarkRead={onMarkRead} 
                 onMarkAllRead={onMarkAllRead} 
              />
            </div>
          </div>
        </header>

        {/* Page content wrapper */}
        <div className="flex-1 overflow-auto">
          <main className="min-h-screen p-5 md:p-8 w-full max-w-7xl mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
