const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { User, Session } = require("../models");

const SALT_ROUNDS = 10;
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory rate limiting map: ip -> [timestamps]
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS = 15;

function checkRateLimit(ip) {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return recent.length <= MAX_ATTEMPTS;
}

// Normalize email
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// Validate email format
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Register user
async function registerUser({ displayName, email, password }) {
  const cleanName = String(displayName || "").trim().slice(0, 30);
  const cleanEmail = normalizeEmail(email);

  if (!cleanName) {
    return { ok: false, error: "Display name is required." };
  }
  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    return { ok: false, error: "A valid email address is required." };
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters long." };
  }

  // Check duplicate email (case-insensitive)
  const existing = await User.findOne({ email: cleanEmail }).lean();
  if (existing) {
    return { ok: false, error: "An account with this email address already exists." };
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const userId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");

  const newUser = await User.create({
    id: userId,
    displayName: cleanName,
    email: cleanEmail,
    passwordHash
  });

  return {
    ok: true,
    user: {
      id: newUser.id,
      displayName: newUser.displayName,
      email: newUser.email
    }
  };
}

// Login user
async function loginUser({ email, password }) {
  const cleanEmail = normalizeEmail(email);

  if (!cleanEmail || !password) {
    return { ok: false, error: "Invalid email or password." };
  }

  const user = await User.findOne({ email: cleanEmail }).lean();
  if (!user) {
    return { ok: false, error: "Invalid email or password." };
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    return { ok: false, error: "Invalid email or password." };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      displayName: user.displayName,
      email: user.email
    }
  };
}

// Create session token
async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await Session.create({
    id: token,
    userId,
    expiresAt
  });

  return { token, expiresAt: expiresAt.toISOString() };
}

// Verify session token
async function verifySession(token) {
  if (!token || typeof token !== "string") return null;

  const session = await Session.findOne({ id: token }).lean();
  if (!session) return null;

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    // Session expired
    await Session.deleteOne({ id: token }).catch(() => {});
    return null;
  }

  const user = await User.findOne({ id: session.userId }).lean();
  if (!user) return null;

  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email
  };
}

// Destroy session
async function destroySession(token) {
  if (!token) return;
  await Session.deleteOne({ id: token }).catch(() => {});
}

module.exports = {
  SALT_ROUNDS,
  SESSION_DURATION_MS,
  checkRateLimit,
  normalizeEmail,
  isValidEmail,
  registerUser,
  loginUser,
  createSession,
  verifySession,
  destroySession
};
