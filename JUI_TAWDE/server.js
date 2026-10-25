const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");
const dotenv = require("dotenv");

// Load .env from JUI_TAWDE or root
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const { connectDB, disconnectDB } = require("./config/database");
const { registerLobbyHandlers } = require("./sockets/lobbyHandler");
const { registerGameHandlers } = require("./sockets/gameEngine");
const { parseUploadedDocument } = require("./services/documentParser");
const { validateQuiz } = require("./utils/quizValidation");
const defaultQuestions = require("./data/questions.json");

const {
  registerUser,
  loginUser,
  createSession,
  destroySession,
  SESSION_DURATION_MS
} = require("./services/authService");

const {
  authOptional,
  authRequired,
  authRateLimiter,
  extractToken
} = require("./middleware/authMiddleware");

const {
  getSessionReport,
  getHostedQuizHistory,
  getPlayedQuizHistory
} = require("./services/quizReportService");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = new Map();
registerLobbyHandlers(io, rooms);
registerGameHandlers(io, rooms);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: SESSION_DURATION_MS
};

// --- AUTHENTICATION ROUTES ---

// Registration
app.post("/api/auth/register", authRateLimiter, async (req, res) => {
  try {
    const { displayName, email, password } = req.body || {};
    const result = await registerUser({ displayName, email, password });
    if (!result.ok) {
      return res.status(400).json(result);
    }

    const { token, expiresAt } = await createSession(result.user.id);
    res.cookie("quiz_session", token, cookieOptions);
    return res.status(201).json({
      ok: true,
      user: result.user,
      token,
      expiresAt
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ ok: false, error: "Registration failed. Please try again." });
  }
});

// Login
app.post("/api/auth/login", authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const result = await loginUser({ email, password });
    if (!result.ok) {
      return res.status(401).json(result);
    }

    const { token, expiresAt } = await createSession(result.user.id);
    res.cookie("quiz_session", token, cookieOptions);
    return res.json({
      ok: true,
      user: result.user,
      token,
      expiresAt
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ ok: false, error: "Login failed. Please try again." });
  }
});

// Logout
app.post("/api/auth/logout", async (req, res) => {
  try {
    const token = extractToken(req);
    if (token) {
      await destroySession(token);
    }
  } catch (e) {
    console.warn("Logout session destruction error:", e);
  }
  res.clearCookie("quiz_session");
  return res.json({ ok: true, message: "Logged out successfully." });
});

// Current User State
app.get("/api/auth/me", authOptional, (req, res) => {
  if (!req.user) {
    return res.json({ ok: true, user: null });
  }
  return res.json({ ok: true, user: req.user });
});

// --- QUIZ HISTORY & REPORT ROUTES ---

// Hosted quizzes history for authenticated host
app.get("/api/history/hosted", authRequired, async (req, res) => {
  try {
    const history = await getHostedQuizHistory(req.user.id);
    return res.json({ ok: true, history });
  } catch (err) {
    console.error("Fetch hosted history error:", err);
    return res.status(500).json({ ok: false, error: "Failed to fetch hosted quiz history." });
  }
});

// Played quizzes history for authenticated player
app.get("/api/history/played", authRequired, async (req, res) => {
  try {
    const history = await getPlayedQuizHistory(req.user.id);
    return res.json({ ok: true, history });
  } catch (err) {
    console.error("Fetch played history error:", err);
    return res.status(500).json({ ok: false, error: "Failed to fetch played quiz history." });
  }
});

// Comprehensive session report
app.get("/api/reports/:sessionId", authOptional, async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const requestingUserId = req.user ? req.user.id : null;
    const report = await getSessionReport(sessionId, requestingUserId);
    if (!report.ok) {
      const isForbidden = report.error && report.error.toLowerCase().includes("access denied");
      return res.status(isForbidden ? 403 : 404).json(report);
    }
    return res.json(report);
  } catch (err) {
    console.error("Fetch report error:", err);
    return res.status(500).json({ ok: false, error: "Failed to generate quiz report." });
  }
});

// --- DEDICATED AUTHENTICATION & NAVIGATION PAGES ---

app.get("/login", (_, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
app.get("/login.html", (_, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
app.get("/register", (_, res) => res.sendFile(path.join(__dirname, "public", "register.html")));
app.get("/register.html", (_, res) => res.sendFile(path.join(__dirname, "public", "register.html")));
app.get("/host", (_, res) => res.sendFile(path.join(__dirname, "public", "host.html")));
app.get("/player", (_, res) => res.sendFile(path.join(__dirname, "public", "player.html")));
app.get("/report", (_, res) => res.sendFile(path.join(__dirname, "public", "report.html")));
app.get("/report.html", (_, res) => res.sendFile(path.join(__dirname, "public", "report.html")));

// --- BASE & EXISTING ENDPOINTS ---

app.get("/health", (_, res) => res.json({ status: "ok", service: "quiz-battle", db: "mongodb" }));
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
    return res.status(400).json({ ok: false, error: "No file uploaded." });
  }

  const { originalname, mimetype, buffer } = req.file;
  const options = {
    useAI: req.body.useAI === "true" || req.body.useAI === true
  };

  try {
    const result = await parseUploadedDocument(buffer, originalname, mimetype, options);
    return res.json(result);
  } catch (err) {
    console.error("File processing error:", err);
    return res.status(500).json({
      ok: false,
      error: `Internal error processing document: ${err.message}`
    });
  }
});

// Server-side validation endpoint
app.post("/api/quiz/validate", (req, res) => {
  const desiredCount = req.query.desiredCount ? parseInt(req.query.desiredCount, 10) : undefined;
  const validation = validateQuiz(req.body, desiredCount);
  res.json(validation);
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`Quiz Arena running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to connect to MongoDB. Server not started:", err.message);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  await disconnectDB();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnectDB();
  process.exit(0);
});

if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };