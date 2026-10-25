const questions = require("../data/questions.json");

function calculateScore(isCorrect, timeTakenMs, totalTimeLimitMs = 15000) {
  if (!isCorrect) return 0;
  const safeTime = Math.min(Math.max(Number(timeTakenMs) || 0, 0), totalTimeLimitMs);
  const timeRemaining = Math.max(0, totalTimeLimitMs - safeTime);
  const speedBonus = Math.round((timeRemaining / totalTimeLimitMs) * 500);
  return 500 + speedBonus;
}

function leaderboard(room) {
  return [...room.players.values()]
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map((p, i) => ({ rank: i + 1, name: p.name, score: p.score }));
}

function startQuestion(io, room) {
  const roomQuestions = room.questions || questions;
  room.currentIndex++;
  room.answered = new Set();

  if (room.currentIndex >= roomQuestions.length) {
    const finalRanks = leaderboard(room);
    const winner = finalRanks[0] || null;
    io.to(room.roomId).emit("quiz:ended", { winner, finalRanks });
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

function timeUp(io, room) {
  if (!room.active) return;
  const roomQuestions = room.questions || questions;
  const q = roomQuestions[room.currentIndex];
  if (!q) return;

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

    socket.on("answer:submit", ({ pin, selectedOption, timeTakenMs } = {}, ack) => {
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

      ack?.({ ok: true, isCorrect, score, timeTakenMs: elapsed });
      socket.emit("answer:result", { isCorrect, score, timeTakenMs: elapsed });
      io.to(room.roomId).emit("leaderboard:update", { leaderboard: leaderboard(room) });

      if (room.answered.size === room.players.size) {
        clearTimeout(room.timer);
        timeUp(io, room);
      }
    });
  });
}

module.exports = { registerGameHandlers, calculateScore };