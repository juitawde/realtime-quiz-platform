const { QuizSession, QuizParticipant, QuestionResult } = require("../models");

/**
 * Retrieves the comprehensive report for a completed quiz session from MongoDB
 */
async function getSessionReport(sessionId, requestingUserId = null) {
  if (!sessionId) {
    return { ok: false, error: "Session ID is required." };
  }

  const session = await QuizSession.findOne({ id: sessionId }).lean();
  if (!session) {
    return { ok: false, error: "Quiz session not found." };
  }

  let questions = [];
  try {
    questions = JSON.parse(session.questionsJson || "[]");
  } catch {
    questions = [];
  }

  const participants = await QuizParticipant.find({ quizSessionId: sessionId })
    .sort({ rank: 1, score: -1, playerName: 1 })
    .lean();

  const results = await QuestionResult.find({ quizSessionId: sessionId })
    .sort({ questionIndex: 1 })
    .lean();

  // Authorization check:
  // Is requester the host?
  const isHost = Boolean(requestingUserId && session.hostUserId && session.hostUserId === requestingUserId);
  // Is requester one of the participants?
  const matchingParticipant = requestingUserId
    ? participants.find(p => p.userId === requestingUserId)
    : null;

  // If session is owned by a host, and requester is neither host nor participant:
  if (session.hostUserId && !isHost && !matchingParticipant) {
    return { ok: false, error: "Access denied. You do not have permission to view this report." };
  }

  // --- 1. Compute Podium (Top 3) ---
  const podium = participants.slice(0, 3).map((p, idx) => ({
    rank: idx + 1,
    name: p.playerName,
    score: p.score,
    isWinner: idx === 0
  }));

  // --- 2. Compute Summary Statistics ---
  const totalParticipants = participants.length;
  let totalScore = 0;
  let totalCorrect = 0;
  let totalIncorrect = 0;
  let totalUnanswered = 0;
  let totalResponseTimeMs = 0;

  participants.forEach(p => {
    totalScore += p.score || 0;
    totalCorrect += p.correctCount || 0;
    totalIncorrect += p.incorrectCount || 0;
    totalUnanswered += p.unansweredCount || 0;
    totalResponseTimeMs += p.totalResponseTimeMs || 0;
  });

  const avgScore = totalParticipants > 0 ? Math.round(totalScore / totalParticipants) : 0;
  const totalAnswers = totalCorrect + totalIncorrect + totalUnanswered;
  const overallAccuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;
  const avgResponseTimeSec = totalAnswers > 0
    ? (totalResponseTimeMs / totalAnswers / 1000).toFixed(2)
    : "0.00";

  const summary = {
    sessionId: session.id,
    quizTitle: session.quizTitle,
    category: session.category,
    pin: session.pin,
    hostName: session.hostName,
    startTime: session.startTime,
    endTime: session.endTime,
    durationSeconds: session.durationSeconds || 0,
    status: session.status,
    totalQuestions: session.totalQuestions || questions.length,
    totalParticipants,
    highestScore: session.winnerScore !== null && session.winnerScore !== undefined
      ? session.winnerScore
      : (participants[0]?.score || 0),
    winnerName: session.winnerName || participants[0]?.playerName || "None",
    averageScore: avgScore,
    overallAccuracyPercentage: overallAccuracy,
    averageResponseTimeSeconds: avgResponseTimeSec
  };

  // --- 3. Compute Question-Level Analysis ---
  const questionAnalytics = questions.map((q, qIdx) => {
    const qResults = results.filter(r => r.questionIndex === qIdx);
    const qCorrect = qResults.filter(r => r.isCorrect === 1).length;
    const qUnanswered = qResults.filter(r => r.isUnanswered === 1).length;
    const qIncorrect = qResults.filter(r => r.isCorrect === 0 && r.isUnanswered === 0).length;
    const qTotal = qResults.length || totalParticipants || 1;

    let qTimeTotalMs = 0;
    const incorrectCounts = {};

    qResults.forEach(r => {
      qTimeTotalMs += r.responseTimeMs || 0;
      if (r.isCorrect === 0 && r.isUnanswered === 0 && r.selectedOption !== null && r.selectedOption >= 0) {
        incorrectCounts[r.selectedOption] = (incorrectCounts[r.selectedOption] || 0) + 1;
      }
    });

    let mostFrequentIncorrectIndex = null;
    let mostFrequentIncorrectCount = 0;
    for (const [optIdx, count] of Object.entries(incorrectCounts)) {
      if (count > mostFrequentIncorrectCount) {
        mostFrequentIncorrectCount = count;
        mostFrequentIncorrectIndex = Number(optIdx);
      }
    }

    const accuracyPct = Math.round((qCorrect / qTotal) * 100);
    const avgQTimeSec = qResults.length > 0
      ? (qTimeTotalMs / qResults.length / 1000).toFixed(2)
      : "0.00";

    const playerTimes = qResults.map(r => {
      const part = participants.find(p => p.id === r.participantId);
      return {
        participantId: r.participantId,
        playerName: part ? part.playerName : "Player",
        selectedOption: r.selectedOption,
        selectedText: r.selectedText,
        isCorrect: r.isCorrect === 1,
        isUnanswered: r.isUnanswered === 1,
        responseTimeMs: r.responseTimeMs || 0,
        responseTimeSeconds: ((r.responseTimeMs || 0) / 1000).toFixed(2),
        pointsEarned: r.pointsEarned || 0
      };
    });

    return {
      questionIndex: qIdx + 1,
      questionText: q.question,
      options: q.options || [],
      correctOption: q.correctOption,
      correctText: q.options?.[q.correctOption] || "Option " + (q.correctOption + 1),
      explanation: q.explanation || "No explanation provided.",
      correctCount: qCorrect,
      incorrectCount: qIncorrect,
      unansweredCount: qUnanswered,
      accuracyPercentage: accuracyPct,
      averageResponseTimeSeconds: avgQTimeSec,
      playerTimes,
      mostFrequentIncorrectOption: mostFrequentIncorrectIndex !== null
        ? {
            optionIndex: mostFrequentIncorrectIndex,
            text: q.options?.[mostFrequentIncorrectIndex] || "Option " + (mostFrequentIncorrectIndex + 1),
            count: mostFrequentIncorrectCount
          }
        : null
    };
  });

  // --- 4. Compute Participant Question-by-Question Breakdown ---
  // If requester is not the host, limit the question-level answer breakdown to the requester only
  const participantDetails = participants.map(p => {
    const isThisRequester = matchingParticipant && matchingParticipant.id === p.id;
    const includeQuestionDetails = isHost || isThisRequester;

    const pQuestions = includeQuestionDetails
      ? questions.map((q, qIdx) => {
          const res = results.find(r => r.participantId === p.id && r.questionIndex === qIdx);
          return {
            questionIndex: qIdx + 1,
            questionText: q.question,
            selectedOption: res ? res.selectedOption : -1,
            selectedText: res ? res.selectedText : "No answer",
            correctOption: q.correctOption,
            correctText: q.options?.[q.correctOption] || "Option " + (q.correctOption + 1),
            isCorrect: res ? res.isCorrect === 1 : false,
            isUnanswered: res ? res.isUnanswered === 1 : true,
            responseTimeMs: res ? (res.responseTimeMs || 0) : 0,
            responseTimeSeconds: res ? ((res.responseTimeMs || 0) / 1000).toFixed(2) : "0.00",
            pointsEarned: res ? res.pointsEarned : 0,
            explanation: q.explanation || "No explanation provided."
          };
        })
      : [];

    const totalQCount = session.totalQuestions || questions.length || 1;
    const accuracy = Math.round(((p.correctCount || 0) / totalQCount) * 100);

    return {
      id: p.id,
      name: p.playerName,
      score: p.score,
      rank: p.rank,
      correctCount: p.correctCount,
      incorrectCount: p.incorrectCount,
      unansweredCount: p.unansweredCount,
      accuracyPercentage: accuracy,
      averageResponseTimeSeconds: ((p.avgResponseTimeMs || 0) / 1000).toFixed(2),
      totalResponseTimeSeconds: ((p.totalResponseTimeMs || 0) / 1000).toFixed(2),
      isWinner: p.rank === 1,
      isPodium: p.rank <= 3,
      questions: pQuestions
    };
  });

  return {
    ok: true,
    summary,
    podium,
    questionAnalytics,
    participants: participantDetails,
    userRole: isHost ? "host" : (matchingParticipant ? "participant" : "guest")
  };
}

/**
 * Returns a list of quiz sessions hosted by the given user
 */
async function getHostedQuizHistory(userId) {
  if (!userId) return [];

  const rows = await QuizSession.find({ hostUserId: userId })
    .sort({ startTime: -1 })
    .lean();

  return rows.map(r => ({
    sessionId: r.id,
    pin: r.pin,
    quizTitle: r.quizTitle,
    category: r.category,
    totalQuestions: r.totalQuestions,
    status: r.status,
    startTime: r.startTime,
    endTime: r.endTime,
    durationSeconds: r.durationSeconds || 0,
    participantsCount: r.participantsCount || 0,
    winnerName: r.winnerName || "None",
    winnerScore: r.winnerScore !== null && r.winnerScore !== undefined ? r.winnerScore : 0
  }));
}

/**
 * Returns a list of quiz sessions played by the given user
 */
async function getPlayedQuizHistory(userId) {
  if (!userId) return [];

  const participants = await QuizParticipant.find({ userId })
    .sort({ createdAt: -1 })
    .lean();

  const history = [];

  for (const p of participants) {
    const session = await QuizSession.findOne({ id: p.quizSessionId }).lean();
    if (!session) continue;

    const totalQ = session.totalQuestions || (p.correctCount + p.incorrectCount + p.unansweredCount) || 1;
    const accuracy = Math.round(((p.correctCount || 0) / totalQ) * 100);

    history.push({
      participantId: p.id,
      sessionId: session.id,
      quizTitle: session.quizTitle,
      category: session.category,
      hostName: session.hostName,
      playerName: p.playerName,
      score: p.score,
      rank: p.rank || 0,
      correctCount: p.correctCount,
      incorrectCount: p.incorrectCount,
      unansweredCount: p.unansweredCount,
      accuracyPercentage: accuracy,
      avgResponseTimeSeconds: ((p.avgResponseTimeMs || 0) / 1000).toFixed(2),
      startTime: session.startTime,
      durationSeconds: session.durationSeconds || 0
    });
  }

  return history;
}

module.exports = {
  getSessionReport,
  getHostedQuizHistory,
  getPlayedQuizHistory
};
