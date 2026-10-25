const questions = require("../data/questions.json");
const { recordAnswerResult, recordUnansweredForQuestion, finalizeSession } = require("../services/sessionService");

function calculateScore(isCorrect, elapsedMs, timeLimitMs) {
  if (!isCorrect) return 0;
  const speedRatio = Math.max(0, (timeLimitMs - elapsedMs) / timeLimitMs);
  return Math.round(500 + 500 * speedRatio);
}

function leaderboard(room) {
  return [...room.players.values()]
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map((p, idx) => ({
      rank: idx + 1,
      name: p.name,
      score: p.score
    }));
}

async function startQuestion(io, room) {
  const roomQuestions = room.questions || questions;

  room.currentIndex++;
  room.answered = new Set();

  if (room.currentIndex >= roomQuestions.length) {
    const finalRanks = leaderboard(room);
    const winner = finalRanks[0] || null;

    if (room.dbSessionId && !room.finalized) {
      room.finalized = true;
      try {
        await finalizeSession(room.dbSessionId);
      } catch (err) {
        console.error("Failed to finalize session in DB:", err);
      }
    }

    const podium = finalRanks.slice(0, 3).map((p, idx) => ({
      rank: idx + 1,
      name: p.name,
      score: p.score,
      isWinner: idx === 0
    }));

    io.to(room.roomId).emit("quiz:ended", {
      winner,
      finalRanks,
      podium,
      sessionId: room.dbSessionId
    });
    room.active = false;
    return;
  }

  const q = roomQuestions[room.currentIndex];
  room.startedAt = Date.now();
  const timeLimitSeconds = q.timeLimitSeconds || 15;

  const payload = {
    questionIndex: room.currentIndex + 1,
    totalQuestions: roomQuestions.length,
    question: q.question,
    options: q.options,
    timeLimitSeconds
  };
  io.to(room.roomId).emit("question:start", payload);

  clearTimeout(room.timer);
  room.timer = setTimeout(() => timeUp(io, room), timeLimitSeconds * 1000);
}

async function timeUp(io, room) {
  if (!room.active) return;
  const roomQuestions = room.questions || questions;
  const q = roomQuestions[room.currentIndex];
  if (!q) return;

  const timeLimitMs = (q.timeLimitSeconds || 15) * 1000;

  // Record unanswered questions for participants who did not answer
  if (room.dbSessionId) {
    try {
      await recordUnansweredForQuestion({
        sessionId: room.dbSessionId,
        questionIndex: room.currentIndex,
        questionText: q.question,
        correctOption: q.correctOption,
        correctText: q.options?.[q.correctOption] || "",
        explanation: q.explanation || "No explanation provided.",
        timeLimitMs,
        participantMap: room.players,
        answeredSocketIds: room.answered
      });
    } catch (err) {
      console.error("Failed to record unanswered question:", err);
    }
  }

  io.to(room.roomId).emit("question:time_up", {
    correctOption: q.correctOption,
    explanation: q.explanation || "No explanation provided."
  });
  io.to(room.roomId).emit("leaderboard:update", { leaderboard: leaderboard(room) });

  clearTimeout(room.timer);
  room.timer = setTimeout(() => startQuestion(io, room), 3000);
}

function registerGameHandlers(io, rooms) {
  io.on("connection", socket => {
    socket.on("quiz:ready", ({ pin } = {}) => {
      const room = rooms.get(String(pin));
      if (room?.hostId === socket.id && room.active && room.currentIndex === -1) {
        startQuestion(io, room);
      }
    });

    socket.on("answer:submit", async ({ pin, selectedOption, timeTakenMs } = {}, ack) => {
      const room = rooms.get(String(pin));
      if (!room || !room.active || socket.data.role !== "player") {
        return ack?.({ ok: false, message: "Answer rejected." });
      }
      if (socket.data.pin !== room.pin) return ack?.({ ok: false, message: "Invalid room." });

      const roomQuestions = room.questions || questions;
      if (room.currentIndex < 0 || room.currentIndex >= roomQuestions.length) {
        return ack?.({ ok: false, message: "No active question." });
      }
      if (room.answered.has(socket.id)) {
        return ack?.({ ok: false, message: "You already answered this question." });
      }

      const q = roomQuestions[room.currentIndex];
      const timeLimitMs = (q.timeLimitSeconds || 15) * 1000;
      const elapsed = Date.now() - room.startedAt;
      if (elapsed >= timeLimitMs) {
        return ack?.({ ok: false, message: "Time is up. Answer rejected." });
      }

      const isCorrect = Number(selectedOption) === q.correctOption;
      const score = calculateScore(isCorrect, elapsed, timeLimitMs);
      const player = room.players.get(socket.id);
      player.score += score;
      room.answered.add(socket.id);

      // Record to MongoDB
      if (room.dbSessionId && player?.dbParticipantId) {
        try {
          await recordAnswerResult({
            sessionId: room.dbSessionId,
            participantId: player.dbParticipantId,
            questionIndex: room.currentIndex,
            questionText: q.question,
            selectedOption: Number(selectedOption),
            selectedText: q.options?.[Number(selectedOption)] || "",
            correctOption: q.correctOption,
            correctText: q.options?.[q.correctOption] || "",
            isCorrect,
            responseTimeMs: elapsed,
            pointsEarned: score,
            explanation: q.explanation || ""
          });
        } catch (err) {
          console.error("Failed to record answer to DB:", err);
        }
      }

      ack?.({ ok: true, isCorrect, score, timeTakenMs: elapsed });
      socket.emit("answer:result", { isCorrect, score, timeTakenMs: elapsed });
      io.to(room.roomId).emit("leaderboard:update", { leaderboard: leaderboard(room) });

      if (room.answered.size === room.players.size) {
        clearTimeout(room.timer);
        timeUp(io, room);
      }
    });

    socket.on("quiz:next", ({ pin } = {}) => {
      const room = rooms.get(String(pin));
      if (room?.hostId === socket.id && room.active) {
        clearTimeout(room.timer);
        startQuestion(io, room);
      }
    });
  });
}

module.exports = { registerGameHandlers };