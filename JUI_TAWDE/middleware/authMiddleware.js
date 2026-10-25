const { verifySession, checkRateLimit } = require("../services/authService");

function extractToken(req) {
  if (req.cookies && req.cookies.quiz_session) {
    return req.cookies.quiz_session;
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  if (req.headers["x-session-token"]) {
    return req.headers["x-session-token"];
  }
  return null;
}

async function authOptional(req, res, next) {
  try {
    const token = extractToken(req);
    if (token) {
      const user = await verifySession(token);
      if (user) {
        req.user = user;
        req.sessionToken = token;
      }
    }
  } catch (err) {
    console.warn("authOptional error:", err.message);
  }
  next();
}

async function authRequired(req, res, next) {
  await authOptional(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "Authentication required." });
    }
    next();
  });
}

function authRateLimiter(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ ok: false, error: "Too many attempts. Please try again in a minute." });
  }
  next();
}

module.exports = {
  extractToken,
  authOptional,
  authRequired,
  authRateLimiter
};
