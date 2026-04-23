import React, { useState } from "react";
import ManageStudents from "./ManageStudents";
import Announcements from "./Announcements";

const AcademicWrapper = () => {
  const [activeTab, setActiveTab] = useState("students");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-sm border border-slate-200 w-max max-w-full overflow-x-auto">
        <button
          onClick={() => setActiveTab("students")}
          className={`shrink-0 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
            activeTab === "students"
              ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200"
              : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
          }`}
        >
          <i className="fas fa-users" /> Data Siswa
        </button>
        <button
          onClick={() => setActiveTab("announcements")}
          className={`shrink-0 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
            activeTab === "announcements"
              ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200"
              : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
          }`}
        >
          <i className="fas fa-bullhorn" /> Pengumuman
        </button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {activeTab === "students" && <ManageStudents />}
        {activeTab === "announcements" && <Announcements />}
      </div>
    </div>
  );
};

export default AcademicWrapper;
