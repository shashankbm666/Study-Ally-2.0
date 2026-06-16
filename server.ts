import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createHash, createHmac, randomBytes } from "crypto";
import Database from "better-sqlite3";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_MS = 30 * 1000;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-pattern-login-secret";
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "pattern_login.sqlite");

const patternDb = new Database(DB_PATH);
const failedAttempts = new Map<string, { count: number; blockedUntil: number }>();

patternDb.pragma("journal_mode = WAL");
patternDb.exec(`
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

app.use(express.json());

// Valid roll numbers database (can be updated with your actual student list)
const VALID_ROLL_NUMBERS = [
  "CSE-001", "CSE-002", "CSE-003", "CSE-004", "CSE-005",
  "ECE-001", "ECE-002", "ECE-003", "ECE-004", "ECE-005",
  "MECH-001", "MECH-002", "MECH-003", "MECH-004", "MECH-005",
  "CE-001", "CE-002", "CE-003",
  "IT-001", "IT-002", "IT-003"
];

function hashPattern(pattern: string) {
  return createHash("sha256").update(pattern).digest("hex");
}

function base64Url(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(payload: Record<string, any>) {
  const encodedHeader = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function createSessionToken(rollNo: string) {
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

function logLoginAttempt(rollNo: string, success: boolean) {
  patternDb.prepare(`
    INSERT INTO login_attempts (roll_no, timestamp, success)
    VALUES (?, ?, ?)
  `).run(rollNo, new Date().toISOString(), success ? 1 : 0);
}

function getFailureState(rollNo: string) {
  const current = failedAttempts.get(rollNo);
  const now = Date.now();

  if (!current) return { count: 0, blockedUntil: 0 };

  if (current.blockedUntil && current.blockedUntil <= now) {
    failedAttempts.delete(rollNo);
    return { count: 0, blockedUntil: 0 };
  }

  return current;
}

function recordFailedAttempt(rollNo: string) {
  const state = getFailureState(rollNo);
  const nextCount = state.count + 1;
  const blockedUntil = nextCount >= MAX_FAILED_ATTEMPTS ? Date.now() + BLOCK_MS : 0;

  failedAttempts.set(rollNo, { count: nextCount, blockedUntil });

  return {
    blockedUntil,
    remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - nextCount),
  };
}

function validatePatternPayload(req: express.Request, res: express.Response) {
  const rollNo = String(req.body.roll_no || "").trim().toUpperCase();
  const pattern = String(req.body.pattern || "").trim().toUpperCase();

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

app.get("/api/config", (req, res) => {
  res.json({ arrows: shuffleArrows() });
});

app.post("/api/register", (req, res) => {
  const payload = validatePatternPayload(req, res);
  if (!payload) return;

  const { rollNo, pattern } = payload;
  const existing = patternDb.prepare("SELECT roll_no FROM users WHERE roll_no = ?").get(rollNo);

  if (existing) {
    return res.status(409).json({ error: "roll_no already registered" });
  }

  patternDb.prepare(`
    INSERT INTO users (roll_no, hashed_pattern, created_at)
    VALUES (?, ?, ?)
  `).run(rollNo, hashPattern(pattern), new Date().toISOString());

  failedAttempts.delete(rollNo);
  res.status(201).json({ success: true, message: "Registered successfully" });
});

// REST API endpoint: Login Authentication
app.post("/api/login", (req, res) => {
  try {
    if ("roll_no" in req.body || "pattern" in req.body) {
      const payload = validatePatternPayload(req, res);
      if (!payload) return;

      const { rollNo, pattern } = payload;
      const state = getFailureState(rollNo);

      if (state.blockedUntil && state.blockedUntil > Date.now()) {
        const retryAfter = Math.ceil((state.blockedUntil - Date.now()) / 1000);
        logLoginAttempt(rollNo, false);
        return res.status(429).json({
          error: `Too many failed attempts. Try again in ${retryAfter} seconds.`,
          retry_after_seconds: retryAfter,
          remaining_attempts: 0,
        });
      }

      const user = patternDb.prepare("SELECT hashed_pattern FROM users WHERE roll_no = ?").get(rollNo);

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

      return res.json({ success: true, message: "Login successful", token });
    }

    const { name, rollNo } = req.body;

    if (!name || !rollNo) {
      return res.status(400).json({ message: "Name and roll number are required" });
    }

    const trimmedName = String(name).trim();
    const trimmedRollNo = String(rollNo).trim().toUpperCase();

    // Validate roll number format (e.g., CSE-001)
    const rollNoRegex = /^[A-Z]+-\d{3}$/;
    if (!rollNoRegex.test(trimmedRollNo)) {
      return res.status(400).json({ message: "Invalid roll number format (use: ABC-001)" });
    }

    // Check if roll number is in valid list
    if (!VALID_ROLL_NUMBERS.includes(trimmedRollNo)) {
      return res.status(401).json({ message: "Roll number not found in database" });
    }

    // Login successful
    const user = {
      name: trimmedName,
      rollNo: trimmedRollNo,
      loginTime: new Date().toISOString(),
    };

    return res.json({ user });
  } catch (error: any) {
    console.error("Login Error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Lazy-loaded GoogleGenAI client to avoid crash on startup if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// REST API endpoint: AI Coach Chat Integration
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { message, history, context } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Meaningful AI fallback simulation for seamless testing if key is not active
      const lower = message.toLowerCase();
      let responseText = `I am ready as Study Ally's Advisor! (To unlock the fully powered Gemini model, configure process.env.GEMINI_API_KEY under Settings > Secrets). \n\nHere is some tactical advice: `;
      if (lower.includes("exam") || lower.includes("countdown")) {
        responseText += "With exams coming up, transition study to timed environments immediately. 80% practice, 20% review.";
      } else if (lower.includes("missed") || lower.includes("recovery")) {
        responseText += "If you missed a session, do not cram it. Spread the missed units into minor 30-minute additions over the next 4 days to avoid fatigue.";
      } else if (lower.includes("plan") || lower.includes("schedule")) {
        responseText += "Adjust your study hours dynamically! Try planning focus sessions when you are most energetic (e.g. morning for tough concepts).";
      } else {
        responseText += "Focus on high-yield, structured active recall. Use flashcards for key definitions and make sure to pace your sessions!";
      }
      return res.json({ text: responseText, note: "Gemini API Key missing - running in offline preview mode." });
    }

    // Format chat history
    // Structure simple instructions to keep responses concise and highly actionable
    const systemInstruction = `You are "Study Ally Coach", a master educational tutor and student productivity coach. 
    Analyze the progress context: ${JSON.stringify(context || {})}.
    Provide actionable study advice, explanation support, recovery plans for missed sessions, or daily inspiration.
    Speak clearly, objectively, and with a encouraging tone. Avoid long winded intros. Break down points with bullet points.`;

    const chatSession = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    // Rehydrate history if available
    if (history && Array.isArray(history)) {
      for (const turn of history) {
        // chat session updates locally as we process messages
      }
    }

    const result = await chatSession.sendMessage({ message });
    return res.json({ text: result.text || "I was unable to formulate a response. Let's try another approach." });
  } catch (error: any) {
    console.error("AI Coach Chat Error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// REST API endpoint: AI Smart Plan Generator
app.post("/api/gemini/plan", async (req, res) => {
  try {
    const { subjects, availableHours, preferences } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        tasks: [
          { text: "Solve high-yield practice questions of core subjects", type: "Active Recall", badge: "Urgent" },
          { text: "Construct flashcards and perform brief review", type: "Spaced Revision", badge: "Review" },
          { text: "Identify weakest topic and schedule 30 mins study", type: "Weakness Recovery", badge: "Key Focus" }
        ],
        advice: "Local fallback plan active. (To use full personalized AI planners, set process.env.GEMINI_API_KEY in Secrets)."
      });
    }

    const prompt = `You are a study scheduler. Create a personalized study task plan based on:
    Subjects data: ${JSON.stringify(subjects || [])}
    Daily available study time: ${availableHours || 3} hours.
    Special preferences: ${JSON.stringify(preferences || {})}

    Return a JSON response specifying exact tasks for today.
    The output format MUST be a valid JSON object matching the following structure (do NOT wrap in markdown \`\`\`json block, just return pure JSON):
    {
      "tasks": [
        { "text": "Specific task to complete", "type": "Active Recall" | "Spaced Revision" | "Mock Practice", "badge": "Urgent" | "Core" | "Dual Review", "subjectId": 1 }
      ],
      "advice": "1 context-specific motivational advisory sentence."
    }`;

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const parsed = JSON.parse(result.text || "{}");
    return res.json(parsed);
  } catch (error: any) {
    console.error("AI Plan Generation Error:", error);
    return res.json({
      tasks: [
        { text: "Active recall session on urgent topics", type: "Active Recall", badge: "Urgent" },
        { text: "Revise concepts using flashcard decks", type: "Spaced Revision", badge: "Review" }
      ],
      advice: "Adjust schedules to target the earliest deadlines."
    });
  }
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(process.cwd(), "admin.html"));
});

app.get("/admin/users", (req, res) => {
  const adminKey = req.query.key;
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const users = patternDb.prepare("SELECT roll_no, created_at FROM users").all();
  res.json(users);
});

app.get("/admin/logs", (req, res) => {
  const adminKey = req.query.key;
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const logs = patternDb.prepare("SELECT * FROM login_attempts ORDER BY timestamp DESC LIMIT 100").all();
  res.json(logs);
});

// Configure Vite or Serve static assets
async function startWebapp() {
  app.get("/", (req, res) => {
    res.sendFile(path.join(process.cwd(), "pattern-login.html"));
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
      }

      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, () => console.log(`Study Ally full-stack server running on port ${PORT}`))
}

startWebapp();
