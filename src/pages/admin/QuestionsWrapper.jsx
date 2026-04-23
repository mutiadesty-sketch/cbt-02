import React, { useState } from "react";
import ManageQuestions from "./ManageQuestions";
import ItemAnalysis from "./ItemAnalysis";

const QuestionsWrapper = () => {
  const [activeTab, setActiveTab] = useState("bank");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-sm border border-slate-200 w-max max-w-full overflow-x-auto">
        <button
          onClick={() => setActiveTab("bank")}
          className={`shrink-0 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
            activeTab === "bank"
              ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200"
              : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
          }`}
        >
          <i className="fas fa-book" /> Bank Soal
        </button>
        <button
          onClick={() => setActiveTab("analysis")}
          className={`shrink-0 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
            activeTab === "analysis"
              ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200"
              : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
          }`}
        >
          <i className="fas fa-microscope" /> Analisis Soal
        </button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {activeTab === "bank" && <ManageQuestions />}
        {activeTab === "analysis" && <ItemAnalysis />}
      </div>
    </div>
  );
};

export default QuestionsWrapper;
