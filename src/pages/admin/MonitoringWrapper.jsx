import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import LiveMonitor from "./LiveMonitor";
import ManageResults from "./ManageResults";

const MonitoringWrapper = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get("tab") || "live";
  
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
          onClick={() => setActiveTab("live")}
          className={`shrink-0 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
            activeTab === "live"
              ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200"
              : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
          }`}
        >
          <i className="fas fa-satellite-dish" /> Live Monitor
        </button>
        <button
          onClick={() => setActiveTab("results")}
          className={`shrink-0 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
            activeTab === "results"
              ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200"
              : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
          }`}
        >
          <i className="fas fa-chart-bar" /> Hasil Ujian
        </button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {activeTab === "live" && <LiveMonitor />}
        {activeTab === "results" && <ManageResults />}
      </div>
    </div>
  );
};

export default MonitoringWrapper;
