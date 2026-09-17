const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");
require("dotenv").config();

const { registerLobbyHandlers } = require("./sockets/lobbyHandler");
const { registerGameHandlers } = require("./sockets/gameEngine");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_, res) => res.json({ status: "ok", service: "quiz-battle" }));
app.get("/", (_, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

const rooms = new Map();
registerLobbyHandlers(io, rooms);
registerGameHandlers(io, rooms);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Quiz Battle running at http://localhost:${PORT}`);
});