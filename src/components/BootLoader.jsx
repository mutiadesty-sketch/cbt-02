import React, { useState, useEffect } from "react";

const BootLoader = ({ fallback = false }) => {
  const [loadingText, setLoadingText] = useState("Inisialisasi sistem...");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Sequence of loading texts
    const texts = [
      "Menghubungkan Server...",
      "Memeriksa Sesi Firebase...",
      "Keamanan Diverifikasi...",
      "Membuka Gerbang Akses..."
    ];
    
    let textIndex = 0;
    const textInterval = setInterval(() => {
      textIndex = (textIndex + 1) % texts.length;
      setLoadingText(texts[textIndex]);
    }, 800);

    // Fast fake progress filling
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 98) return prev; // stall near end until actual resolve
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 200);

    return () => {
      clearInterval(textInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-900 relative overflow-hidden">
      {/* Background Decorative */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-900 to-slate-900 pointer-events-none" />
      
      <div className="z-10 flex flex-col items-center w-full max-w-xs px-6">
        {/* Bouncing Logo Container */}
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl animate-pulse" />
          <img 
            src="/logo.png" 
            alt="School Logo" 
            className="w-20 h-20 relative z-10 animate-bounce shadow-2xl drop-shadow-[0_0_15px_rgba(79,70,229,0.5)] object-contain" 
            onError={(e) => {
              // fallback if logo is missing
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'flex';
            }}
          />
          {/* Fallback Icon if logo.png doesn't exist */}
          <div className="hidden w-20 h-20 relative z-10 animate-bounce items-center justify-center rounded-2xl bg-indigo-600 shadow-lg border-2 border-indigo-400/50">
            <i className="fas fa-graduation-cap text-4xl text-white" />
          </div>
        </div>

        {/* Brand Text */}
        <div className="text-white font-black tracking-widest text-xl mb-6 uppercase flex items-center gap-2">
          <span>Smart</span>
          <span className="text-indigo-400">CBT</span>
        </div>

        {/* Cyber Progress Bar */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
          <div 
            className="h-full bg-indigo-500 transition-all duration-300 ease-out relative"
            style={{ width: `${Math.min(progress, 100)}%` }}
          >
            <div className="absolute top-0 left-0 w-full h-full bg-white/20" />
          </div>
        </div>

        {/* Micro-copy Text */}
        <div className="flex w-full justify-between items-center text-[10px] font-mono text-slate-400 uppercase tracking-wider">
          <span className="flex items-center gap-1.5 truncate pr-2">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse shrink-0" />
            <span className="truncate">{loadingText}</span>
          </span>
          <span className="shrink-0">{Math.min(progress, 99)}%</span>
        </div>

        {fallback && (
          <div className="mt-8 w-full max-w-[200px] text-center">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-4" />
            <p className="text-xs text-slate-500">
              Menunggu respon server...{" "}
              <button
                onClick={() => window.location.reload()}
                className="text-indigo-400 hover:text-indigo-300 underline font-medium block mt-1 w-full"
              >
                Muat Ulang Paksa
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BootLoader;
