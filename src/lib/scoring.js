// ===== SCORING & PASSWORD FUNCTIONS =====

// Scoring function
export const calculateScore = (answers, questions, config = {}) => {
  let correct = 0;
  let total = questions.length;

  questions.forEach((q) => {
    const userAnswer = answers[q.id];
    if (!userAnswer && userAnswer !== 0) return; // Skip jika tidak dijawab

    if (q.type === "PG") {
      if (userAnswer === q.answer) correct++;
    } else if (q.type === "PGK") {
      const answerArray = Array.isArray(userAnswer) ? userAnswer : [];
      const correctArray = Array.isArray(q.answer) ? q.answer : [];

      if (config.partialScoringPGK === true) {
        // Partial credit: proporsi jawaban benar yang dipilih
        if (correctArray.length > 0) {
          const correctlySelected = answerArray.filter((opt) =>
            correctArray.includes(opt),
          ).length;
          const partialScore = correctlySelected / correctArray.length;
          correct += partialScore;
        }
      } else {
        // All-or-nothing: semua pilihan harus tepat
        if (
          JSON.stringify(answerArray.sort()) ===
          JSON.stringify([...correctArray].sort())
        ) {
          correct++;
        }
      }
    } else if (q.type === "ISIAN") {
      // Case insensitive & trim
      if (userAnswer?.toLowerCase().trim() === q.answer?.toLowerCase().trim()) {
        correct++;
      }
    } else if (q.type === "JODOH") {
      // Jodoh - semua pasangan harus dipilih dengan benar (idx: idx)
      const allCorrect = q.pairs?.every((_, idx) => userAnswer[idx] === idx);
      if (allCorrect) correct++;
    } else if (q.type === "BS") {
      // Benar/Salah - check setiap statement
      const allCorrect = q.statements?.every(
        (stmt, idx) => userAnswer[idx] === stmt.isTrue,
      );
      if (allCorrect) correct++;
    }
  });

  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  return { score, correct: Math.round(correct * 100) / 100, total };
};

// Simple password hashing menggunakan crypto (basic)
export const hashPassword = async (password) => {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
};

// Verify password
export const verifyPassword = async (password, hash) => {
  const newHash = await hashPassword(password);
  return newHash === hash;
};
