import React from "react";
import { getAvatarGrad, getInitials } from "../../lib/avatarUtils";

const ProfileTab = ({ user }) => {
  const fields = [
    { icon: "fa-id-card",      label: "NISN",          value: user?.id },
    { icon: "fa-chalkboard",   label: "Kelas",         value: user?.kelas },
    { icon: "fa-map-marker-alt", label: "Tempat Lahir", value: user?.tempatLahir },
    { icon: "fa-birthday-cake", label: "Tanggal Lahir", value: user?.tanggalLahir },
    { icon: "fa-check-circle", label: "Status",        value: "Aktif", valueColor: "text-emerald-600" },
  ];

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-black text-slate-900">Profil Saya</h2>

      {/* Profile hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700">
        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.07) 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }} />
        <div className="relative z-10 flex flex-col items-center gap-4 px-6 py-10">
          {/* Avatar */}
          <div className={`flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br text-2xl font-black text-white shadow-xl ${getAvatarGrad(user?.name)}`}>
            {getInitials(user?.name)}
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-white">{user?.name || "–"}</div>
            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
              <i className="fas fa-graduation-cap text-[10px]" />
              Kelas {user?.kelas || "–"}
            </div>
          </div>
        </div>
      </div>

      {/* Details card */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Informasi Akun</div>
        </div>
        <div className="divide-y divide-slate-100">
          {fields.map((item) => (
            <div key={item.label} className="flex items-center gap-4 px-5 py-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                <i className={`fas ${item.icon} text-indigo-500 text-xs`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{item.label}</div>
                <div className={`text-sm font-semibold mt-0.5 ${item.valueColor || "text-slate-900"}`}>
                  {item.value || "–"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileTab;
