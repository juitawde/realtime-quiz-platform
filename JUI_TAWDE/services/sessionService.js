const crypto = require("crypto");
const { QuizSession, QuizParticipant, QuestionResult } = require("../models");

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
}

/**
 * Creates a persistent quiz session record in MongoDB
 */
async function createLiveSession({
  pin,
  hostUserId = null,
  hostName = "Host",
  quizTitle = "Default Quiz",
  category = "Mixed",
  questions = []
}) {
  const sessionId = generateId();
  const startTime = new Date();
  const questionsSnapshot = JSON.stringify(questions || []);

  await QuizSession.create({
    id: sessionId,
    pin: String(pin),
    hostUserId: hostUserId || null,
    hostName: String(hostName || "Host").slice(0, 30),
    quizTitle: String(quizTitle || "Default Quiz").slice(0, 60),
    category: String(category || "Mixed").slice(0, 30),
    totalQuestions: questions.length,
    questionsJson: questionsSnapshot,
    status: "active",
    startTime,
    createdAt: startTime
  });

  return sessionId;
}

/**
 * Adds or registers a participant in the persistent session
 */
async function addSessionParticipant({ sessionId, socketId, playerName, userId = null }) {
  if (!sessionId) return null;

  // Check if participant with this socket already exists in this session
  const existing = await QuizParticipant.findOne({
    quizSessionId: sessionId,
    socketId
  }).lean();

  if (existing) return existing.id;

  const participantId = generateId();
  const createdAt = new Date();

  await QuizParticipant.create({
    id: participantId,
    quizSessionId: sessionId,
    userId: userId || null,
    socketId,
    playerName: String(playerName || "Player").slice(0, 25),
    score: 0,
    correctCount: 0,
    incorrectCount: 0,
    unansweredCount: 0,
    totalResponseTimeMs: 0,
    avgResponseTimeMs: 0,
    createdAt
  });

  // Update participant count in session
  const count = await QuizParticipant.countDocuments({ quizSessionId: sessionId });
  await QuizSession.updateOne({ id: sessionId }, { $set: { participantsCount: count } });

  return participantId;
}

/**
 * Records a participant's answer to a question
 */
async function recordAnswerResult({
  sessionId,
  participantId,
  questionIndex,
  questionText,
  selectedOption,
  selectedText,
  correctOption,
  correctText,
  isCorrect,
  responseTimeMs,
  pointsEarned,
  explanation
}) {
  if (!sessionId || !participantId) return;

  const answeredAt = new Date();
  const isCorrectNum = isCorrect ? 1 : 0;
  const safeTimeMs = Math.max(0, Number(responseTimeMs) || 0);
  const safePoints = Math.max(0, Number(pointsEarned) || 0);

  // Idempotent upsert of question result
  await QuestionResult.findOneAndUpdate(
    {
      quizSessionId: sessionId,
      participantId,
      questionIndex
    },
    {
      $setOnInsert: { id: generateId() },
      $set: {
        questionText,
        selectedOption: selectedOption !== null ? Number(selectedOption) : null,
        selectedText: selectedText || null,
        correctOption: Number(correctOption),
        correctText: correctText || "",
        isCorrect: isCorrectNum,
        isUnanswered: 0,
        responseTimeMs: safeTimeMs,
        pointsEarned: safePoints,
        explanation: explanation || "",
        answeredAt
      }
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Update participant cumulative metrics
  if (isCorrectNum === 1) {
    await QuizParticipant.updateOne(
      { id: participantId },
      {
        $inc: {
          score: safePoints,
          correctCount: 1,
          totalResponseTimeMs: safeTimeMs
        }
      }
    );
  } else {
    await QuizParticipant.updateOne(
      { id: participantId },
      {
        $inc: {
          incorrectCount: 1,
          totalResponseTimeMs: safeTimeMs
        }
      }
    );
  }
}

/**
 * Marks any unanswered participants when a question timer expires
 */
async function recordUnansweredForQuestion({
  sessionId,
  questionIndex,
  questionText,
  correctOption,
  correctText,
  explanation,
  timeLimitMs,
  participantMap,
  answeredSocketIds
}) {
  if (!sessionId || !participantMap) return;

  // Find participants who already answered
  const answeredRows = await QuestionResult.find(
    { quizSessionId: sessionId, questionIndex },
    { participantId: 1 }
  ).lean();

  const answeredSet = new Set(answeredRows.map(r => r.participantId));
  const answeredAt = new Date();
  const safeLimitMs = Math.max(1000, Number(timeLimitMs) || 15000);

  for (const [socketId, participant] of participantMap.entries()) {
    const pId = participant.dbParticipantId;
    if (!pId) continue;
    if (answeredSocketIds && answeredSocketIds.has(socketId)) continue;
    if (answeredSet.has(pId)) continue;

    await QuestionResult.findOneAndUpdate(
      {
        quizSessionId: sessionId,
        participantId: pId,
        questionIndex
      },
      {
        $setOnInsert: { id: generateId() },
        $set: {
          questionText,
          selectedOption: -1,
          selectedText: "No answer",
          correctOption: Number(correctOption),
          correctText: correctText || "",
          isCorrect: 0,
          isUnanswered: 1,
          responseTimeMs: safeLimitMs,
          pointsEarned: 0,
          explanation: explanation || "",
          answeredAt
        }
      },
      { upsert: true }
    );

    await QuizParticipant.updateOne(
      { id: pId },
      {
        $inc: {
          unansweredCount: 1,
          totalResponseTimeMs: safeLimitMs
        }
      }
    );
  }
}

/**
 * Finalizes the quiz session idempotently, calculating ranks, winner, duration, and metrics
 */
async function finalizeSession(sessionId) {
  if (!sessionId) return null;

  const session = await QuizSession.findOne({ id: sessionId }).lean();
  if (!session) return null;

  if (session.status === "completed") {
    // Already finalized; return existing participants and winner
    const participants = await QuizParticipant.find({ quizSessionId: sessionId })
      .sort({ rank: 1, score: -1 })
      .lean();

    return {
      sessionId,
      alreadyCompleted: true,
      winner: session.winnerName ? { name: session.winnerName, score: session.winnerScore } : null,
      participants
    };
  }

  const endTime = new Date();
  const startTime = new Date(session.startTime);
  const durationSeconds = Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / 1000));

  // 1. Fetch all participants for this session sorted by score DESC, then playerName ASC
  const participants = await QuizParticipant.find({ quizSessionId: sessionId })
    .sort({ score: -1, playerName: 1 })
    .lean();

  const totalQuestions = session.totalQuestions || 1;
  let winner = null;

  // 2. Assign ranks and average response times
  for (let idx = 0; idx < participants.length; idx++) {
    const p = participants[idx];
    const rank = idx + 1;
    const totalAnswers = p.correctCount + p.incorrectCount + p.unansweredCount;
    const divisor = totalAnswers > 0 ? totalAnswers : totalQuestions;
    const avgResponseTimeMs = Math.round(p.totalResponseTimeMs / divisor);

    await QuizParticipant.updateOne(
      { id: p.id },
      { $set: { rank, avgResponseTimeMs } }
    );

    p.rank = rank;
    p.avgResponseTimeMs = avgResponseTimeMs;
  }

  // 3. Determine winner
  if (participants.length > 0) {
    winner = {
      name: participants[0].playerName,
      score: participants[0].score
    };
  }

  // 4. Update session status
  await QuizSession.updateOne(
    { id: sessionId },
    {
      $set: {
        status: "completed",
        endTime,
        durationSeconds,
        participantsCount: participants.length,
        winnerName: winner ? winner.name : null,
        winnerScore: winner ? winner.score : null
      }
    }
  );

  return {
    sessionId,
    durationSeconds,
    winner,
    participants
  };
}

module.exports = {
  createLiveSession,
  addSessionParticipant,
  recordAnswerResult,
  recordUnansweredForQuestion,
  finalizeSession
};
