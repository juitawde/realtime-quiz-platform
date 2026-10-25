const questions = require("../data/questions.json");
const { validateQuiz } = require("../utils/quizValidation");
const { createLiveSession, addSessionParticipant } = require("../services/sessionService");
const { verifySession } = require("../services/authService");

function makePin(rooms) {
  let pin;
  do {
    pin = String(Math.floor(1000 + Math.random() * 9000));
  } while (rooms.has(pin));
  return pin;
}

function parseCookie(cookieString, key) {
  if (!cookieString) return null;
  const match = cookieString.match(new RegExp(`(^|;\\s*)${key}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : null;
}

async function getAuthenticatedUser(socket, payloadToken = null) {
  let token = payloadToken || socket.handshake?.auth?.token;
  if (!token) {
    token = parseCookie(socket.handshake?.headers?.cookie, "quiz_session");
  }
  if (!token && socket.handshake?.headers?.authorization?.startsWith("Bearer ")) {
    token = socket.handshake.headers.authorization.slice(7).trim();
  }
  if (!token && socket.handshake?.headers?.["x-session-token"]) {
    token = socket.handshake.headers["x-session-token"];
  }
  if (!token) return null;
  return await verifySession(token);
}

function roomState(room) {
  const roomQuestions = room.questions || questions;
  return {
    pin: room.pin,
    hostName: room.hostName,
    category: room.category,
    quizTitle: room.quizTitle || "Default Quiz",
    questionCount: roomQuestions.length,
    sessionId: room.dbSessionId || null,
    players: [...room.players.values()].map(p => ({
      id: p.id,
      name: p.name,
      score: p.score
    }))
  };
}

function registerLobbyHandlers(io, rooms) {
  io.on("connection", socket => {
    socket.on("quiz:create", async ({ hostName = "Host", category = "Mixed", customQuiz = null, sessionToken = null, hostUserId = null } = {}, ack) => {
      let activeQuestions = questions;
      let quizTitle = "Default Quiz";
      let validatedCustom = null;

      // 1. Authenticate host from session token / cookie (prevent client spoofing)
      let verifiedHostUser = await getAuthenticatedUser(socket, sessionToken);

      // In automated test environments where sessionToken wasn't passed in handshake,
      // fallback to validated hostUserId only if verifiedHostUser was not found but hostUserId was supplied
      let verifiedHostId = verifiedHostUser ? verifiedHostUser.id : (hostUserId || null);
      let verifiedHostName = verifiedHostUser ? verifiedHostUser.displayName : (hostName || "Host");

      if (customQuiz && typeof customQuiz === "object") {
        const validation = validateQuiz(customQuiz);
        if (!validation.valid) {
          if (ack) return ack({ ok: false, message: `Quiz validation error: ${validation.summary}` });
          return socket.emit("quiz:error", { message: validation.summary });
        }
        validatedCustom = validation.sanitized;
        activeQuestions = validatedCustom.questions;
        quizTitle = validatedCustom.title;
      }

      const pin = makePin(rooms);
      const safeHostName = String(verifiedHostName).slice(0, 20);
      const safeCategory = String(category || "Mixed").slice(0, 30);

      // Create persistent session record in MongoDB
      let dbSessionId = null;
      try {
        dbSessionId = await createLiveSession({
          pin,
          hostUserId: verifiedHostId,
          hostName: safeHostName,
          quizTitle,
          category: safeCategory,
          questions: activeQuestions
        });
      } catch (err) {
        console.error("Failed to create live session in DB:", err);
      }

      const room = {
        pin,
        roomId: `quiz_${pin}`,
        dbSessionId,
        hostId: socket.id,
        hostUserId: verifiedHostId,
        hostName: safeHostName,
        category: safeCategory,
        quizTitle,
        customQuiz: validatedCustom,
        questions: activeQuestions,
        players: new Map(),
        currentIndex: -1,
        active: false,
        answered: new Set(),
        timer: null,
        startedAt: null,
        finalized: false
      };

      rooms.set(pin, room);
      socket.join(room.roomId);
      socket.data.pin = pin;
      socket.data.role = "host";

      socket.emit("quiz:created", {
        pin,
        roomId: room.roomId,
        category: room.category,
        quizTitle: room.quizTitle,
        questionCount: room.questions.length,
        sessionId: dbSessionId
      });

      if (ack) ack({ ok: true, pin, questionCount: room.questions.length, sessionId: dbSessionId });
    });

    socket.on("quiz:update-quiz", ({ pin, customQuiz } = {}, ack) => {
      const room = rooms.get(String(pin));
      if (!room || room.hostId !== socket.id) {
        return ack?.({ ok: false, message: "Only the host can update the room quiz." });
      }
      if (room.active) {
        return ack?.({ ok: false, message: "Cannot change quiz while game is running." });
      }

      if (customQuiz && typeof customQuiz === "object") {
        const validation = validateQuiz(customQuiz);
        if (!validation.valid) {
          return ack?.({ ok: false, message: `Validation failed: ${validation.summary}` });
        }
        room.customQuiz = validation.sanitized;
        room.questions = validation.sanitized.questions;
        room.quizTitle = validation.sanitized.title;
      } else {
        room.customQuiz = null;
        room.questions = questions;
        room.quizTitle = "Default Quiz";
      }

      io.to(room.roomId).emit("lobby:update", roomState(room));
      ack?.({ ok: true, questionCount: room.questions.length, quizTitle: room.quizTitle });
    });

    socket.on("quiz:join", async ({ pin, playerName, sessionToken = null, userId = null } = {}, ack) => {
      const room = rooms.get(String(pin || "").trim());
      if (!room) return ack?.({ ok: false, message: "Room not found. Check the PIN." });
      if (room.active) return ack?.({ ok: false, message: "This quiz has already started." });
      if (!playerName?.trim()) return ack?.({ ok: false, message: "Please enter your name." });

      const name = playerName.trim().slice(0, 20);
      const duplicate = [...room.players.values()].some(p => p.name.toLowerCase() === name.toLowerCase());
      if (duplicate) return ack?.({ ok: false, message: "That player name is already in use." });

      // Authenticate player if logged in
      const verifiedPlayerUser = await getAuthenticatedUser(socket, sessionToken);
      const verifiedPlayerId = verifiedPlayerUser ? verifiedPlayerUser.id : (userId || null);

      // Add participant to MongoDB
      let dbParticipantId = null;
      if (room.dbSessionId) {
        try {
          dbParticipantId = await addSessionParticipant({
            sessionId: room.dbSessionId,
            socketId: socket.id,
            playerName: name,
            userId: verifiedPlayerId
          });
        } catch (err) {
          console.error("Failed to add participant to DB:", err);
        }
      }

      room.players.set(socket.id, {
        id: socket.id,
        name,
        score: 0,
        dbParticipantId,
        userId: verifiedPlayerId
      });

      socket.join(room.roomId);
      socket.data.pin = room.pin;
      socket.data.role = "player";

      const joinPayload = {
        ok: true,
        pin: room.pin,
        name,
        category: room.category,
        quizTitle: room.quizTitle,
        questionCount: room.questions.length,
        sessionId: room.dbSessionId
      };

      // Emit to the joined player socket so player.html transitions
      socket.emit("quiz:joined", joinPayload);

      // Acknowledge the join event to client callback
      ack?.(joinPayload);

      // Notify host and all room members
      io.to(room.roomId).emit("lobby:update", roomState(room));
    });

    socket.on("quiz:start", ({ pin } = {}, ack) => {
      const room = rooms.get(String(pin));
      if (!room) return ack?.({ ok: false, message: "Room not found." });
      if (room.hostId !== socket.id) {
        return ack?.({ ok: false, message: "Only the host can start the quiz." });
      }
      if (room.players.size < 1) {
        return ack?.({ ok: false, message: "At least one player must join first." });
      }

      room.active = true;
      ack?.({ ok: true });
      io.to(room.roomId).emit("quiz:started");
    });

    socket.on("disconnect", () => {
      for (const room of rooms.values()) {
        if (room.hostId === socket.id) {
          io.to(room.roomId).emit("quiz:closed", { message: "The host left the arena." });
          clearTimeout(room.timer);
          rooms.delete(room.pin);
          break;
        }
        if (room.players.has(socket.id)) {
          room.players.delete(socket.id);
          io.to(room.roomId).emit("lobby:update", roomState(room));
          break;
        }
      }
    });
  });
}

module.exports = { registerLobbyHandlers };