import React from "react";

export default function MobileDock({ items, activeId, onChange }) {
  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-40 w-full md:hidden">
      {/* Frosted glass bar */}
      <div
        className="bg-white border-t border-slate-200 shadow-[0_-8px_32px_rgb(0,0,0,0.06)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div
          className="grid w-full"
          style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
        >
          {items.map((it) => {
            const isActive = it.id === activeId;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onChange?.(it.id)}
                className={`flex min-w-0 flex-col items-center gap-1.5 py-3 px-1 transition-all ${
                  isActive ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Active indicator pill */}
                <div className={`flex h-8 w-10 items-center justify-center rounded-xl transition-all ${
                  isActive ? "bg-indigo-100 scale-105" : "scale-100"
                }`}>
                  <i className={`fas ${it.icon} text-base`} />
                </div>
                <span className={`text-[10px] font-semibold leading-none truncate w-full text-center transition-all ${
                  isActive ? "text-indigo-600" : "text-slate-400"
                }`}>
                  {it.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
