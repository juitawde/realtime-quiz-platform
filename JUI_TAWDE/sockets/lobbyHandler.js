const questions = require("../data/questions.json");

function makePin(rooms) {
  let pin;
  do {
    pin = String(Math.floor(1000 + Math.random() * 9000));
  } while (rooms.has(pin));
  return pin;
}

function roomState(room) {
  return {
    pin: room.pin,
    hostName: room.hostName,
    category: room.category,
    players: [...room.players.values()].map(p => ({
      id: p.id, name: p.name, score: p.score
    }))
  };
}

function registerLobbyHandlers(io, rooms) {
  io.on("connection", socket => {
    socket.on("quiz:create", ({ hostName = "Host", category = "Mixed" } = {}, ack) => {
      const pin = makePin(rooms);
      const room = {
        pin, roomId: `quiz_${pin}`, hostId: socket.id, hostName, category,
        players: new Map(), currentIndex: -1, active: false, answered: new Set(),
        timer: null, startedAt: null
      };
      rooms.set(pin, room);
      socket.join(room.roomId);
      socket.data.pin = pin;
      socket.data.role = "host";
      socket.emit("quiz:created", { pin, roomId: room.roomId, category, questionCount: questions.length });
      if (ack) ack({ ok: true, pin });
    });

    socket.on("quiz:join", ({ pin, playerName } = {}, ack) => {
      const room = rooms.get(String(pin || "").trim());
      if (!room) return ack?.({ ok: false, message: "Room not found. Check the PIN." });
      if (room.active) return ack?.({ ok: false, message: "This quiz has already started." });
      if (!playerName?.trim()) return ack?.({ ok: false, message: "Please enter your name." });

      const name = playerName.trim().slice(0, 20);
      const duplicate = [...room.players.values()].some(p => p.name.toLowerCase() === name.toLowerCase());
      if (duplicate) return ack?.({ ok: false, message: "That player name is already in use." });

      room.players.set(socket.id, { id: socket.id, name, score: 0 });
      socket.join(room.roomId);
      socket.data.pin = room.pin;
      socket.data.role = "player";
      socket.emit("quiz:joined", { pin: room.pin, roomId: room.roomId, name });
      io.to(room.roomId).emit("lobby:update", { ...roomState(room) });
      ack?.({ ok: true });
    });

    socket.on("quiz:start", ({ pin } = {}, ack) => {
      const room = rooms.get(String(pin));
      if (!room || room.hostId !== socket.id) return ack?.({ ok: false, message: "Only the host can start this quiz." });
      if (room.active) return ack?.({ ok: false, message: "Quiz is already running." });
      if (room.players.size < 1) return ack?.({ ok: false, message: "At least one player must join." });
      room.active = true;
      ack?.({ ok: true });
      io.to(room.roomId).emit("quiz:started");
      io.emit("quiz:room-started", { pin: room.pin });
    });

    socket.on("disconnect", () => {
      const pin = socket.data.pin;
      const room = rooms.get(pin);
      if (!room) return;
      if (room.hostId === socket.id) {
        clearTimeout(room.timer);
        io.to(room.roomId).emit("quiz:closed", { message: "The host left the quiz." });
        rooms.delete(pin);
      } else if (room.players.delete(socket.id)) {
        io.to(room.roomId).emit("lobby:update", roomState(room));
      }
    });
  });
}

module.exports = { registerLobbyHandlers, roomState };