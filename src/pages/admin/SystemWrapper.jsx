import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Settings from "./Settings";
import ManageAdmins from "./ManageAdmins";
import ActivityLog from "./ActivityLog";

const SystemWrapper = ({ onPreview }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get("tab") || "settings";
  
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (searchParams.get("tab")) {
      setActiveTab(searchParams.get("tab"));
    }
  }, [location.search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-sm border border-slate-200 w-max max-w-full overflow-x-auto">
        <button
          onClick={() => setActiveTab("settings")}
          className={`shrink-0 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
            activeTab === "settings"
              ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200"
              : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
          }`}
        >
          <i className="fas fa-sliders-h" /> Pengaturan Ujian
        </button>
        <button
          onClick={() => setActiveTab("admins")}
          className={`shrink-0 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
            activeTab === "admins"
              ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200"
              : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
          }`}
        >
          <i className="fas fa-user-shield" /> Manajemen Admin
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`shrink-0 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
            activeTab === "activity"
              ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200"
              : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
          }`}
        >
          <i className="fas fa-clock-rotate-left" /> Activity Log
        </button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {activeTab === "settings" && <Settings onPreview={onPreview} />}
        {activeTab === "admins" && <ManageAdmins />}
        {activeTab === "activity" && <ActivityLog />}
      </div>
    </div>
  );
};

export default SystemWrapper;
