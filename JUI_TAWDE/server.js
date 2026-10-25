const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const { Server } = require("socket.io");
require("dotenv").config();

const { registerLobbyHandlers } = require("./sockets/lobbyHandler");
const { registerGameHandlers } = require("./sockets/gameEngine");
const { parseUploadedDocument } = require("./services/documentParser");
const { validateQuiz } = require("./utils/quizValidation");
const defaultQuestions = require("./data/questions.json");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_, res) => res.json({ status: "ok", service: "quiz-battle" }));
app.get("/", (_, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

// Return default questions bank
app.get("/api/quiz/default", (_, res) => {
  res.json({
    title: "Default Quiz",
    questionCount: defaultQuestions.length,
    questions: defaultQuestions
  });
});

// Server-side document extraction endpoint
app.post("/api/quiz/parse-file", upload.single("quizFile"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, error: "No file was uploaded." });
  }

  try {
    let customMapping = null;
    if (req.body.customMapping) {
      try {
        customMapping = typeof req.body.customMapping === 'string'
          ? JSON.parse(req.body.customMapping)
          : req.body.customMapping;
      } catch (e) {
        console.warn("Invalid customMapping JSON payload", e);
      }
    }

    const result = await parseUploadedDocument(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      {
        useAI: req.body.useAI === "true" || req.body.useAI === true,
        sheetName: req.body.sheetName,
        customMapping
      }
    );

    res.json(result);
  } catch (err) {
    console.error("Parse-file endpoint error:", err);
    res.status(500).json({ ok: false, error: err.message || "Failed to parse document." });
  }
});

// Quiz validation endpoint
app.post("/api/quiz/validate", (req, res) => {
  const result = validateQuiz(req.body, req.query.desiredCount);
  res.json(result);
});

const rooms = new Map();
registerLobbyHandlers(io, rooms);
registerGameHandlers(io, rooms);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Quiz Battle running at http://localhost:${PORT}`);
});