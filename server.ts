import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

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

// Configure Vite or Serve static assets
async function startWebapp() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", async (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }


  app.listen(PORT, () => console.log(`Study Ally full-stack server running on port ${PORT}`))
}

startWebapp();
