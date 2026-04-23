/**
 * Simple gamification logic for elementary students.
 * Pure functions — no state, no Firestore. Derived from exam history array.
 */

import { getPassScore } from "./examConfig";

/**
 * All possible badges. Each has an `unlocked(history, cfg)` predicate.
 * Order matters for display (earliest / easiest first).
 */
export const BADGES = [
  {
    id: "first_exam",
    icon: "fa-flag",
    color: "from-sky-400 to-blue-500",
    title: "Langkah Pertama",
    desc: "Menyelesaikan ujian pertamamu.",
    check: (h) => h.length >= 1,
  },
  {
    id: "five_exams",
    icon: "fa-fire",
    color: "from-orange-400 to-red-500",
    title: "Rajin Belajar",
    desc: "Menyelesaikan 5 ujian.",
    check: (h) => h.length >= 5,
  },
  {
    id: "ten_exams",
    icon: "fa-bolt",
    color: "from-amber-400 to-yellow-500",
    title: "Jagoan Ujian",
    desc: "Menyelesaikan 10 ujian.",
    check: (h) => h.length >= 10,
  },
  {
    id: "high_score",
    icon: "fa-star",
    color: "from-violet-400 to-purple-500",
    title: "Nilai Tinggi",
    desc: "Mendapat nilai ≥ 90.",
    check: (h) => h.some((r) => (r.score ?? 0) >= 90),
  },
  {
    id: "perfect_score",
    icon: "fa-crown",
    color: "from-yellow-400 to-amber-600",
    title: "Sempurna",
    desc: "Mendapat nilai 100.",
    check: (h) => h.some((r) => (r.score ?? 0) >= 100),
  },
  {
    id: "three_in_a_row",
    icon: "fa-medal",
    color: "from-emerald-400 to-teal-500",
    title: "Konsisten",
    desc: "3 kali berturut lulus KKM.",
    check: (h, cfg) => {
      if (h.length < 3) return false;
      // history is sorted desc by submittedAt; take 3 most recent
      const recent = h.slice(0, 3);
      return recent.every(
        (r) => (r.score ?? 0) >= (r.passScore ?? getPassScore(cfg)),
      );
    },
  },
  {
    id: "twenty_exams",
    icon: "fa-trophy",
    color: "from-rose-400 to-pink-500",
    title: "Veteran",
    desc: "Menyelesaikan 20 ujian.",
    check: (h) => h.length >= 20,
  },
];

/**
 * Returns an array of badges with { ...badge, earned: boolean }.
 */
export function computeBadges(history = [], examConfig = {}) {
  return BADGES.map((b) => ({
    ...b,
    earned: Boolean(b.check(history, examConfig)),
  }));
}

/**
 * Compute student-level stats for profile cards.
 */
export function computeStudentStats(history = [], examConfig = {}) {
  const totalExams = history.length;
  if (totalExams === 0) {
    return {
      totalExams: 0,
      avgScore: null,
      bestScore: null,
      passedCount: 0,
      passRate: 0,
    };
  }
  const scores = history.map((r) => r.score ?? 0);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / totalExams);
  const bestScore = Math.max(...scores);
  const passedCount = history.filter(
    (r) => (r.score ?? 0) >= (r.passScore ?? getPassScore(examConfig)),
  ).length;
  const passRate = Math.round((passedCount / totalExams) * 100);
  return { totalExams, avgScore, bestScore, passedCount, passRate };
}

/**
 * Daily tip — rotating based on day-of-year so every day feels fresh,
 * but deterministic (not "random per render").
 */
export const DAILY_TIPS = [
  {
    icon: "fa-lightbulb",
    title: "Tenangkan pikiranmu",
    body: "Tarik napas dalam 3 kali sebelum mulai. Pikiran tenang = jawaban lebih tepat.",
  },
  {
    icon: "fa-book-open-reader",
    title: "Baca soal dengan teliti",
    body: "Pahami dulu apa yang ditanyakan sebelum melihat pilihan jawaban.",
  },
  {
    icon: "fa-hourglass-half",
    title: "Kelola waktu dengan baik",
    body: "Kalau ada soal sulit, lewati dulu. Kembalilah setelah selesai yang mudah.",
  },
  {
    icon: "fa-clipboard-check",
    title: "Cek ulang jawabanmu",
    body: "Sisakan waktu 5 menit di akhir untuk memeriksa kembali jawaban yang ragu-ragu.",
  },
  {
    icon: "fa-mug-hot",
    title: "Sarapan dulu",
    body: "Otak butuh energi. Jangan ujian dengan perut kosong supaya fokus maksimal.",
  },
  {
    icon: "fa-hand-sparkles",
    title: "Percaya pada dirimu",
    body: "Kamu sudah belajar keras. Yakinlah bahwa kamu bisa melakukannya.",
  },
  {
    icon: "fa-brain",
    title: "Istirahat sebentar",
    body: "Kalau pusing, pejamkan mata 10 detik. Otak akan segar kembali.",
  },
];

export function getDailyTip(date = new Date()) {
  // Day-of-year so it rotates daily but stays stable within a day.
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return DAILY_TIPS[dayOfYear % DAILY_TIPS.length];
}
