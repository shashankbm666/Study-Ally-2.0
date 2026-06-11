import { createRequire } from "module";
import { createHash, createHmac, randomBytes } from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const require = createRequire(import.meta.url);
const express = require("express");
const cors = require('cors')
const Database = require("better-sqlite3");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_MS = 30 * 1000;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-pattern-login-secret";
const DB_PATH = process.env.DB_PATH || join(__dirname, "pattern_login.sqlite");

const db = new Database(DB_PATH);
const failedAttempts = new Map();

db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    roll_no TEXT PRIMARY KEY,
    hashed_pattern TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    roll_no TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    success INTEGER NOT NULL
  );
`);

app.use(cors({ origin: '*' }))
app.use(express.json())

function hashPattern(pattern) {
  return createHash("sha256").update(pattern).digest("hex");
}

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function createSessionToken(rollNo) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return signJwt({
    sub: rollNo,
    iat: nowSeconds,
    exp: nowSeconds + 60 * 60,
    jti: randomBytes(12).toString("hex"),
  });
}

function shuffleArrows() {
  const arrows = [
    { key: "U", label: "&uarr;", ariaLabel: "Up" },
    { key: "D", label: "&darr;", ariaLabel: "Down" },
    { key: "L", label: "&larr;", ariaLabel: "Left" },
    { key: "R", label: "&rarr;", ariaLabel: "Right" },
  ];

  for (let index = arrows.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [arrows[index], arrows[swapIndex]] = [arrows[swapIndex], arrows[index]];
  }

  return arrows;
}

function logLoginAttempt(rollNo, success) {
  db.prepare(`
    INSERT INTO login_attempts (roll_no, timestamp, success)
    VALUES (?, ?, ?)
  `).run(rollNo, new Date().toISOString(), success ? 1 : 0);
}

function normalizeRollNo(rollNo) {
  return String(rollNo || "").trim().toUpperCase();
}

function normalizePattern(pattern) {
  return String(pattern || "").trim().toUpperCase();
}

function validatePayload(req, res) {
  const rollNo = normalizeRollNo(req.body.roll_no);
  const pattern = normalizePattern(req.body.pattern);

  if (!rollNo) {
    res.status(400).json({ error: "roll_no is required" });
    return null;
  }

  if (!/^[UDLR]{5}$/.test(pattern)) {
    res.status(400).json({ error: "pattern must be exactly 5 arrows" });
    return null;
  }

  return { rollNo, pattern };
}

function getFailureState(rollNo) {
  const current = failedAttempts.get(rollNo);
  const now = Date.now();

  if (!current) return { count: 0, blockedUntil: 0 };

  if (current.blockedUntil && current.blockedUntil <= now) {
    failedAttempts.delete(rollNo);
    return { count: 0, blockedUntil: 0 };
  }

  return current;
}

function assertNotBlocked(rollNo, res) {
  const state = getFailureState(rollNo);

  if (state.blockedUntil && state.blockedUntil > Date.now()) {
    const retryAfter = Math.ceil((state.blockedUntil - Date.now()) / 1000);
    logLoginAttempt(rollNo, false);
    res.status(429).json({
      error: `Too many failed attempts. Try again in ${retryAfter} seconds.`,
      retry_after_seconds: retryAfter,
      remaining_attempts: 0,
    });
    return false;
  }

  return true;
}

function recordFailedAttempt(rollNo) {
  const state = getFailureState(rollNo);
  const nextCount = state.count + 1;
  const blockedUntil = nextCount >= MAX_FAILED_ATTEMPTS ? Date.now() + BLOCK_MS : 0;

  failedAttempts.set(rollNo, { count: nextCount, blockedUntil });

  return {
    blockedUntil,
    remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - nextCount),
  };
}

app.post("/api/register", (req, res) => {
  const payload = validatePayload(req, res);
  if (!payload) return;

  const { rollNo, pattern } = payload;
  const existing = db.prepare("SELECT roll_no FROM users WHERE roll_no = ?").get(rollNo);

  if (existing) {
    return res.status(409).json({ error: "roll_no already registered" });
  }

  db.prepare(`
    INSERT INTO users (roll_no, hashed_pattern, created_at)
    VALUES (?, ?, ?)
  `).run(rollNo, hashPattern(pattern), new Date().toISOString());

  failedAttempts.delete(rollNo);
  res.status(201).json({ success: true, message: "Registered successfully" });
});

app.post("/api/login", (req, res) => {
  const payload = validatePayload(req, res);
  if (!payload) return;

  const { rollNo, pattern } = payload;

  if (!assertNotBlocked(rollNo, res)) return;

  const user = db.prepare("SELECT hashed_pattern FROM users WHERE roll_no = ?").get(rollNo);

  if (!user || user.hashed_pattern !== hashPattern(pattern)) {
    const failure = recordFailedAttempt(rollNo);
    logLoginAttempt(rollNo, false);

    if (failure.blockedUntil) {
      const retryAfter = Math.ceil((failure.blockedUntil - Date.now()) / 1000);
      return res.status(429).json({
        error: `Too many failed attempts. Try again in ${retryAfter} seconds.`,
        retry_after_seconds: retryAfter,
        remaining_attempts: 0,
      });
    }

    return res.status(401).json({
      error: "invalid",
      remaining_attempts: failure.remainingAttempts,
    });
  }

  failedAttempts.delete(rollNo);
  logLoginAttempt(rollNo, true);
  const token = createSessionToken(rollNo);

  res.cookie("session_token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 1000,
    path: "/",
  });

  res.json({ success: true, message: "Login successful", token });
});

app.get('/api/test', (req,res) => res.json({status:'ok'}))

app.get("/api/config", (req, res) => {
  res.json({ arrows: shuffleArrows() });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("session_token", { path: "/" });
  res.json({ success: true, message: "Logged out" });
});

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'pattern-login.html'))
})

app.get('/app', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

app.use(express.static(join(__dirname, 'dist')))
app.use(express.static(__dirname))

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on ${PORT}`))
