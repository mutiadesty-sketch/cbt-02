import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { useAuthStore } from "../store/authStore";
import { calculateScore } from "../lib/scoring";
import { shuffleArray } from "../lib/utils";
import Swal from "sweetalert2";
import confetti from "canvas-confetti";
import { playSound } from "../lib/soundUtils";
import Page from "../ui/Page";
import Container from "../ui/Container";
import { DEFAULT_EXAM_CONFIG, getPassScore } from "../lib/examConfig";
import ExamHeader from "./exam/ExamHeader";
import QuestionCard from "./exam/QuestionCard";
import ExamSidebar from "./exam/ExamSidebar";
import ScratchpadOverlay from "./exam/ScratchpadOverlay";
import ExamBottomSheet from "./exam/ExamBottomSheet";
import ShortcutModal from "../ui/ShortcutModal";
import ExamTour from "../components/ExamTour";

const ExamRoom = ({
  mapel: propMapel,
  mode: propMode,
  preview = false,
  onExitPreview,
  onFinish,
}) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mapel = propMapel || searchParams.get("mapel") || "IPAS";
  const mode = propMode || searchParams.get("mode") || "tryout";
  
  const { user } = useAuthStore();
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [doubtful, setDoubtful] = useState({});
  const [timeLeft, setTimeLeft] = useState(3600);
  const [examConfig, setExamConfig] = useState({ ...DEFAULT_EXAM_CONFIG });
  const [configLoaded, setConfigLoaded] = useState(false);
  const [fontSize, setFontSize] = useState("text-lg");
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [slideDir, setSlideDir] = useState("right"); // slide animation direction
  const [runTour, setRunTour] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const initialDurationSecRef = useRef(3600);
  const handleFinishExamRef = useRef(null);
  const timeLeftRef = useRef(timeLeft);
  const touchStartRef = useRef(null);
  const questionAreaRef = useRef(null);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  // Helper: bintang berdasarkan skor
  const getStars = (score) => {
    const passScore = getPassScore(examConfig);
    if (score >= passScore + 10) return "⭐⭐⭐";
    if (score >= passScore) return "⭐⭐";
    return "⭐";
  };

  // Helper: pesan semangat kontekstual
  const getPesan = (score, currentMapel) => {
    const passScore = getPassScore(examConfig);
    if ((currentMapel || "").toLowerCase().includes("matematika") || (currentMapel || "").toLowerCase().includes("numerasi")) {
      if (score >= passScore + 10) return "Jagoan angka! Hitungan kamu keren banget! 🟠🔢";
      if (score >= passScore)
        return "Hampir sempurna! Terus latihan ya! 🟠💪";
      return "Semangat! Coba lagi soal angkanya, pasti bisa! 🟠";
    }
    if (score >= passScore + 10) return "Luar biasa! Terus semangat belajar ya! 🔵📖";
    if (score >= passScore) return "Sudah bagus! Latihan lagi biar makin mantap! 🔵";
    return "Jangan menyerah! Coba baca pelan-pelan lagi ya! 🔵💪";
  };

  const resumeKey = user?.id ? `cbt:examState:${user.id}` : null;

  // --- BEEP WARNING ---
  const playBeep = useCallback((freq = 880, dur = 0.15, times = 1) => {
    let delay = 0;
    for (let i = 0; i < times; i++) {
      setTimeout(() => {
        try {
          const actx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = actx.createOscillator();
          const g = actx.createGain();
          osc.connect(g);
          g.connect(actx.destination);
          osc.frequency.value = freq;
          g.gain.setValueAtTime(0.35, actx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
          osc.start();
          osc.stop(actx.currentTime + dur);
        } catch {
          // AudioContext not available; silently ignore
        }
      }, delay);
      delay += 350;
    }
  }, []);

  // --- FETCH EXAM CONFIG ---
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "main"));
        if (snap.exists())
          setExamConfig((prev) => ({ ...prev, ...snap.data() }));
      } catch (e) {
        console.error("Error fetching exam config:", e);
      } finally {
        setConfigLoaded(true);
      }
    };
    fetchConfig();
  }, []);

  // --- INITIALIZE TOUR ---
  useEffect(() => {
    if (!preview && questions.length > 0 && configLoaded) {
      if (!localStorage.getItem("cbt_exam_tour_seen")) {
        // Wait a slight delay for UI to settle
        setTimeout(() => setRunTour(true), 1000);
      }
    }
  }, [preview, questions.length, configLoaded]);

  // --- SCHEDULE GATE ---
  useEffect(() => {
    if (!configLoaded) return;
    const now = Date.now();
    const startMs = examConfig.startAt ? Date.parse(examConfig.startAt) : NaN;
    const endMs = examConfig.endAt ? Date.parse(examConfig.endAt) : NaN;
    if (!Number.isNaN(startMs) && now < startMs) {
      Swal.fire(
        "Belum waktunya ujian",
        `Ujian dibuka pada ${new Date(startMs).toLocaleString("id-ID")}.`,
        "info",
      ).then(() => {
        navigate("/");
      });
      return;
    }
    if (!Number.isNaN(endMs) && now > endMs) {
      Swal.fire(
        "Ujian sudah ditutup",
        `Ujian ditutup pada ${new Date(endMs).toLocaleString("id-ID")}.`,
        "info",
      ).then(() => {
        navigate("/");
      });
    }
  }, [configLoaded, examConfig.startAt, examConfig.endAt]);

  // --- DURATION / RESUME ---
  useEffect(() => {
    if (!configLoaded) return;
    const seconds = Math.max(1, Number(examConfig.duration || 60)) * 60;
    initialDurationSecRef.current = seconds;

    if (resumeKey) {
      try {
        const raw = localStorage.getItem(resumeKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.v === 1) {
            if (typeof parsed.currentIndex === "number")
              setCurrentIndex(Math.max(0, parsed.currentIndex));
            if (parsed.answers && typeof parsed.answers === "object")
              setAnswers(parsed.answers);
            if (parsed.doubtful && typeof parsed.doubtful === "object")
              setDoubtful(parsed.doubtful);
            if (typeof parsed.timeLeft === "number")
              setTimeLeft(Math.max(0, parsed.timeLeft));
            if (typeof parsed.fontSize === "string")
              setFontSize(parsed.fontSize);
            return;
          }
        }
      } catch {
        // ignore corrupted state
      }
    }

    setTimeLeft(seconds);
  }, [configLoaded, resumeKey, examConfig.duration]);

  // --- PERSIST AUTOSAVE ---
  useEffect(() => {
    if (!resumeKey) return;
    if (!configLoaded) return;
    const payload = {
      v: 1,
      savedAt: Date.now(),
      currentIndex,
      answers,
      doubtful,
      timeLeft: timeLeftRef.current,
      fontSize,
    };
    try {
      localStorage.setItem(resumeKey, JSON.stringify(payload));
    } catch {
      // ignore quota errors
    }
  }, [resumeKey, configLoaded, currentIndex, answers, doubtful, fontSize]);

  // --- LOAD QUESTIONS ---
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "questions"));
        let data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Filter soal berdasarkan mapel
        data = data.filter((q) => {
          // Backward compatibility for old "literasi" and "numerasi" data
          const qMapel = q.subtes || "IPAS";
          return qMapel.toLowerCase() === mapel.toLowerCase();
        });

        if (examConfig.randomizeQuestions) data = shuffleArray(data);

        data = data.map((q) => {
          if ((q.type === "PG" || q.type === "PGK") && q.options) {
            // Create option objects with original indices to track them correctly after shuffle
            const optionsWithOriginalIndex = q.options.map((opt, idx) => ({
              text: opt,
              originalIdx: idx,
            }));
            
            const shuffledOptionsObjs = shuffleArray([...optionsWithOriginalIndex]);
            const shuffledOptionsTexts = shuffledOptionsObjs.map(o => o.text);
            
            const correctIndices = Array.isArray(q.answer)
              ? q.answer
              : [q.answer];

            // Map original correct indices to new indices
            const newCorrectIndices = correctIndices
              .map((origIdx) => shuffledOptionsObjs.findIndex(obj => obj.originalIdx === origIdx))
              .filter(idx => idx !== -1);

            return {
              ...q,
              options: shuffledOptionsTexts,
              answer: Array.isArray(q.answer) ? newCorrectIndices : newCorrectIndices[0],
            };
          }
          return q;
        });

        setQuestions(data);

        // Tulis sesi live monitor (skip jika preview)
        if (!preview && user?.id) {
          setDoc(doc(db, "sessions", user.id), {
            studentId: user.id,
            studentName: user.name || "",
            kelas: user.kelas || "",
            subtes: mapel,
            mode,
            currentIndex: 0,
            totalQuestions: data.length,
            timeLeft: initialDurationSecRef.current,
            startedAt: serverTimestamp(),
            lastActive: serverTimestamp(),
            tabSwitches: 0,
            device: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? "mobile" : "desktop",
          }).catch(() => {});
        }
      } catch (err) {
        console.error("Error fetching questions:", err);
        Swal.fire("Error", "Tidak bisa memuat soal", "error");
      }
    };
    fetchQuestions();
    return () => {
      if (!preview && user?.id) {
        deleteDoc(doc(db, "sessions", user.id)).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examConfig.randomizeQuestions, mapel]);

  // Update sesi saat ganti soal & Heartbeat berkala (30s)
  useEffect(() => {
    if (preview || !user?.id || questions.length === 0) return;

    const updateSession = async (isHeartbeat = false) => {
      if (!isHeartbeat) setIsSyncing(true);
      try {
        await updateDoc(doc(db, "sessions", user.id), {
          currentIndex,
          timeLeft: timeLeftRef.current,
          lastActive: serverTimestamp(),
        });
        if (!isHeartbeat) {
          setTimeout(() => setIsSyncing(false), 800);
        }
      } catch {
        setIsSyncing(false);
      }
    };

    // Update segera saat currentIndex berubah
    updateSession();

    // Setup interval heartbeat
    const intervalId = setInterval(() => updateSession(true), 30000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, questions.length]);

  // --- REMOTE CONTROL LISTENER ---
  useEffect(() => {
    if (preview || !user?.id) return;

    const unsub = onSnapshot(doc(db, "sessions", user.id), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();

      // 1. Force Submit
      if (data.forceSubmit) {
        Swal.fire({
          title: "Ujian Dihentikan",
          text: "Admin telah memaksa mengakhiri ujian Anda. Hasil akan segera diproses.",
          icon: "info",
          timer: 3000,
          showConfirmButton: false,
          allowOutsideClick: false,
        }).then(() => {
          handleFinishExamRef.current?.(true); // pass true for silent submit
        });
      }

      // 2. Admin Message
      if (data.adminMessage && data.adminMessage.sentAt > (window._lastMsgAt || 0)) {
        window._lastMsgAt = data.adminMessage.sentAt;
        Swal.fire({
          title: "Pesan dari Admin",
          text: data.adminMessage.text,
          icon: "info",
          confirmButtonColor: "#4f46e5",
        });
        playBeep(440, 0.3, 1);
      }

      // 3. Time Sync (only if change is significant, e.g. > 10s to avoid loop)
      if (data.timeLeft !== undefined && Math.abs(data.timeLeft - timeLeftRef.current) > 10) {
        setTimeLeft(data.timeLeft);
      }
    });

    return () => unsub();
  }, [preview, user?.id]);

  // --- TIMER: tick only ---
  useEffect(() => {
    if (mode === "latihan") return;
    const timer = setInterval(
      () => setTimeLeft((prev) => Math.max(0, prev - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [mode]);

  // --- TIMER: watch for zero ---
  useEffect(() => {
    if (mode === "latihan") return;
    if (timeLeft === 0 && configLoaded && questions.length > 0) {
      handleFinishExamRef.current?.();
    }
  }, [timeLeft, configLoaded, questions.length, mode]);

  // --- TIMER: beep warnings ---
  useEffect(() => {
    if (mode === "latihan") return;
    if (timeLeft === 300) playBeep(880, 0.15, 2);
    if (timeLeft === 60) playBeep(660, 0.2, 3);
  }, [timeLeft, playBeep, mode]);

  // --- FULLSCREEN SYNC ---
  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    onFs();
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // --- VISIBILITY WARNING ---
  useEffect(() => {
    const onVisibility = async () => {
      if (document.visibilityState !== "visible") {
        if (!preview && user?.id) {
          setTabSwitches(prev => {
            const newVal = prev + 1;
            updateDoc(doc(db, "sessions", user.id), {
              tabSwitches: newVal,
              lastActive: serverTimestamp(),
            }).catch(() => {});
            return newVal;
          });
        }
        
        try {
          await Swal.fire({
            icon: "warning",
            title: "Jangan keluar dari halaman ujian",
            text: "Tetap fokus agar ujian berjalan lancar.",
            confirmButtonText: "OK",
          });
        } catch {
          // ignore
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [preview, user?.id]);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      Swal.fire("Gagal", "Browser tidak mengizinkan fullscreen.", "error");
    }
  }

  // --- NAV HELPERS WITH DIRECTION ---
  const goToPrev = useCallback(() => {
    playSound("click");
    setSlideDir("left");
    setCurrentIndex((p) => Math.max(0, p - 1));
  }, []);

  const goToNext = useCallback(() => {
    playSound("click");
    setSlideDir("right");
    setCurrentIndex((p) => Math.min(questions.length - 1, p + 1));
  }, [questions.length]);

  const goToIndex = useCallback(
    (idx) => {
      playSound("click");
      setSlideDir(idx > currentIndex ? "right" : "left");
      setCurrentIndex(idx);
    },
    [currentIndex],
  );

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handler = (e) => {
      const q = questions[currentIndex];
      const tag = (e.target?.tagName || "").toLowerCase();
      const isTyping =
        tag === "input" || tag === "textarea" || e.target?.isContentEditable;
      if (isTyping) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrev();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
        return;
      }
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        if (!q?.id) return;
        setDoubtful((d) => ({ ...d, [q.id]: !d[q.id] }));
        return;
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
      if ((e.key === "Enter" && (e.ctrlKey || e.metaKey)) || e.key === "End") {
        e.preventDefault();
        handleFinishExamRef.current?.();
        return;
      }
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setShowShortcuts((s) => !s);
        return;
      }

      const num = Number(e.key);
      if (!Number.isNaN(num) && num >= 1 && num <= 5 && q?.id) {
        const idx = num - 1;
        if (
          q.type === "PG" &&
          Array.isArray(q.options) &&
          idx < q.options.length
        ) {
          playSound("pop");
          setAnswers((a) => ({ ...a, [q.id]: idx }));
        }
        if (
          q.type === "BS" &&
          Array.isArray(q.statements) &&
          idx < q.statements.length
        ) {
          playSound("pop");
          setAnswers((a) => {
            const cur = a[q.id] || {};
            const nextVal = cur[idx] === true ? false : true;
            return { ...a, [q.id]: { ...cur, [idx]: nextVal } };
          });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [questions, currentIndex, goToNext, goToPrev]);

  // Swipe gesture removed per user request

  // --- CONFETTI BURST ---
  const fireConfetti = useCallback(() => {
    const duration = 2500;
    const end = Date.now() + duration;
    const colors = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6"];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, []);

  // --- FINISH EXAM ---
  const handleFinishExam = async (silent = false) => {
    // Ensure silent is strictly true (avoid event object being truthy)
    const isSilent = silent === true;

    if (!isSilent) {
      const result = await Swal.fire({
        title: mode === "latihan" ? "Selesaikan Latihan?" : "Selesaikan Ujian?",
        html: `<div class="text-left">
          <p class="mb-3"><b>Status Jawaban:</b></p>
          <p>Sudah Dijawab: <b class="text-emerald-600">${Object.keys(answers).length}/${questions.length}</b></p>
          <p>Ragu-ragu: <b class="text-yellow-600">${Object.keys(doubtful).filter((k) => doubtful[k]).length}</b></p>
          <p class="mt-4 text-sm text-slate-600"><i>⚠️ Ujian tidak bisa dilanjutkan setelah klik Selesai</i></p>
        </div>`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#dc2626",
        cancelButtonColor: "#6b7280",
        confirmButtonText:
          mode === "latihan" ? "Ya, Selesaikan" : "Ya, Selesaikan Ujian",
        cancelButtonText: "Batal",
      });

      if (!result.isConfirmed) return;
    }

    try {
      if (resumeKey) localStorage.removeItem(resumeKey);

      // Hapus session live monitor
      if (!preview && user?.id) {
        deleteDoc(doc(db, "sessions", user.id)).catch(() => {});
      }

      const scoreData = calculateScore(answers, questions, examConfig);
      const passScore = getPassScore(examConfig);

      const examResultId = preview ? "preview" : `${user.id}_${Date.now()}`;

      if (!preview) {
        await setDoc(doc(db, "results", examResultId), {
          studentId: user.id,
          studentName: user.name,
          kelas: user.kelas,
          examName: examConfig.title || "Ujian",
          examType: examConfig.examType || "MAPEL",
          subtes: mapel,
          mode: mode,
          answers: answers,
          score: scoreData.score,
          correct: scoreData.correct,
          total: scoreData.total,
          passScore,
          duration: Math.floor(
            (Number(examConfig.duration || 60) * 60 - timeLeft) / 60,
          ),
          submittedAt: serverTimestamp(),
          doubtful: doubtful,
          questionIds: questions.map((q) => q.id),
        });
      }

      // Fire confetti for passing scores
      if (scoreData.score >= passScore) {
        playSound("success");
        fireConfetti();
      } else {
        playSound("notification");
      }

      if (isSilent) {
        if (preview && onExitPreview) {
          onExitPreview();
          return;
        }
        navigate("/");
        return;
      }

      Swal.fire({
        title:
          mode === "latihan"
            ? "Latihan Selesai! 🎉"
            : scoreData.score >= passScore
              ? "LULUS! 🎉"
              : "Coba Lagi Ya! 📚",
        html: `<div class="text-center py-2">
          <div class="text-4xl mb-3">${getStars(scoreData.score)}</div>
          <p class="text-5xl font-black ${scoreData.score >= passScore ? "text-emerald-600" : "text-orange-500"} mb-3">${scoreData.score}</p>
          <p class="text-base mb-1">Jawaban Benar: <b>${scoreData.correct}/${scoreData.total}</b></p>
          <p class="mt-4 text-sm font-semibold text-slate-700">${getPesan(scoreData.score, mapel)}</p>
          <p class="mt-3 text-xs text-slate-400">${examConfig.showResults ? "Halaman hasil akan dibuka..." : "Hasil disimpan. Silakan kembali ke dashboard."}</p>
        </div>`,
        icon: "success",
        allowOutsideClick: false,
        didClose: () => {
          if (preview && onExitPreview) {
            onExitPreview();
            return;
          }
          if (examConfig.showResults) {
            navigate(`/result/${examResultId}`);
          } else {
            navigate("/");
          }
        },
      });
    } catch (error) {
      console.error("Error submitting exam:", error);
      Swal.fire(
        "Gagal",
        "Tidak bisa menyimpan hasil ujian: " + error.message,
        "error",
      );
    }
  };

  // --- KEEP REF ALWAYS CURRENT ---
  useEffect(() => {
    handleFinishExamRef.current = handleFinishExam;
  });

  const currentQ = questions[currentIndex];

  // ── Loading state ──
  if (!currentQ) {
    return (
      <Page className="flex flex-col select-none bg-slate-50">
        <div className="h-14 border-b border-slate-200 bg-white"></div>
        <Container className="flex-1 py-5 md:py-6">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 md:flex-row">
            <div className="flex-1 space-y-4">
              <div className="skeleton skeleton-card h-40"></div>
              <div className="grid gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="skeleton h-14 w-full rounded-xl"></div>
                ))}
              </div>
            </div>
            <div className="hidden md:block w-72 shrink-0 space-y-4">
              <div className="skeleton h-32 w-full rounded-2xl"></div>
              <div className="skeleton h-64 w-full rounded-2xl"></div>
            </div>
          </div>
        </Container>
      </Page>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900">
      <ExamTour 
        run={runTour} 
        onFinish={() => {
          localStorage.setItem("cbt_exam_tour_seen", "true");
          setRunTour(false);
        }} 
      />
      <Page className="select-none bg-slate-50">
      {/* Preview banner */}
      {preview && (
        <div className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-bold text-white">
          <div className="flex items-center gap-2">
            <i className="fas fa-eye" />
            MODE PREVIEW — Data tidak akan disimpan
          </div>
          <button
            type="button"
            onClick={onExitPreview}
            className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1 text-xs font-bold hover:bg-amber-700 transition"
          >
            <i className="fas fa-times" /> Keluar Preview
          </button>
        </div>
      )}

      {/* ── Sticky Header ── */}
      <ExamHeader
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        fontSize={fontSize}
        setFontSize={setFontSize}
        isDrawingMode={isDrawingMode}
        setIsDrawingMode={setIsDrawingMode}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        mode={mode}
        timeLeft={timeLeft}
        initialDurationSec={initialDurationSecRef.current}
        onShowShortcuts={() => setShowShortcuts(true)}
      />

      {/* Mobile question progress bar */}
      <div className="md:hidden h-1 bg-slate-100">
        <div
          className="h-full bg-indigo-400 transition-all duration-300"
          style={{
            width: `${questions.length ? ((currentIndex + 1) / questions.length) * 100 : 0}%`,
          }}
        />
      </div>

      {/* ── Main Content ── */}
      <Container className="py-5 md:py-6">
        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-5 md:flex-row">
          {/* Canvas Scratchpad Overlay */}
          {isDrawingMode && <ScratchpadOverlay />}

          {/* Question Card with bottom navigation + swipe support */}
          <div
            className="tour-question flex-1"
            ref={questionAreaRef}
          >
            <div
              key={currentIndex}
              className={slideDir === "right" ? "animate-slide-right" : "animate-slide-left"}
            >
              <QuestionCard
                question={currentQ}
                fontSize={fontSize}
                doubtful={doubtful}
                answers={answers}
                setAnswers={setAnswers}
              />
            </div>

            {/* ── Bottom navigation ── */}
            <div className="tour-bottom-nav mt-4 mb-20 md:mb-0 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
              <button
                onClick={goToPrev}
                disabled={currentIndex === 0}
                className="btn btn-outline px-4 disabled:opacity-40"
              >
                <i className="fas fa-chevron-left text-xs" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </button>

              {/* Doubt toggle */}
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-4 py-2 transition ${
                  doubtful[currentQ.id]
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={!!doubtful[currentQ.id]}
                  onChange={() =>
                    setDoubtful({
                      ...doubtful,
                      [currentQ.id]: !doubtful[currentQ.id],
                    })
                  }
                />
                <i
                  className={`fas fa-flag text-xs ${
                    doubtful[currentQ.id]
                      ? "text-amber-500"
                      : "text-slate-300"
                  }`}
                />
                <span className="text-xs font-semibold">Ragu-ragu</span>
              </label>

              <button
                onClick={goToNext}
                disabled={currentIndex === questions.length - 1}
                className="btn btn-primary px-4 disabled:opacity-40"
              >
                <span className="hidden sm:inline">Berikutnya</span>
                <i className="fas fa-chevron-right text-xs" />
              </button>
            </div>
          </div>

          {/* ── Right Sidebar ── */}
          <div className="tour-sidebar hidden xl:block">
            <ExamSidebar
              questions={questions}
              currentIndex={currentIndex}
              setCurrentIndex={goToIndex}
              answers={answers}
              doubtful={doubtful}
              onFinish={handleFinishExam}
            />
          </div>
        </div>
      </Container>

      {/* ── Mobile Bottom Sheet Navigation ── */}
      <ExamBottomSheet
        questions={questions}
        currentIndex={currentIndex}
        setCurrentIndex={goToIndex}
        answers={answers}
        doubtful={doubtful}
        onFinish={handleFinishExam}
      />

      {/* Keyboard Shortcut Cheatsheet */}
      <ShortcutModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {/* Cloud Sync Indicator */}
      {!preview && (
        <div className={`fixed bottom-24 right-6 z-50 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 shadow-lg backdrop-blur-sm border transition-all duration-500 ${isSyncing ? "border-indigo-200 translate-y-0 opacity-100" : "border-transparent translate-y-4 opacity-0"}`}>
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Sinkronisasi...</span>
        </div>
      )}
    </Page>
    </div>
  );
};

export default ExamRoom;
