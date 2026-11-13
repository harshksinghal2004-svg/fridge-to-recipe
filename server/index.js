import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ─── Prompt ────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a helpful chef assistant. Given a list of ingredients, return ONLY a valid JSON object (no markdown, no code fences, no extra text) matching this exact schema:

{
  "title": "string – recipe name",
  "description": "string – 1-2 sentence description",
  "servings": number,
  "prepTime": "string e.g. '10 minutes'",
  "cookTime": "string e.g. '25 minutes'",
  "difficulty": "Easy | Medium | Hard",
  "ingredients": [
    {
      "id": "string – unique id like 'ing-1'",
      "name": "string",
      "quantity": number,
      "unit": "string e.g. 'cup', 'tbsp', 'g', 'piece'",
      "swaps": ["string – swap option 1", "string – swap option 2"]
    }
  ],
  "steps": [
    {
      "id": "string – unique id like 'step-1'",
      "order": number,
      "instruction": "string – clear cooking instruction",
      "duration": "string e.g. '5 minutes' or null if not applicable",
      "tip": "string – optional helpful tip or null"
    }
  ],
  "tags": ["string"],
  "nutrition": {
    "calories": number,
    "protein": "string e.g. '12g'",
    "carbs": "string e.g. '45g'",
    "fat": "string e.g. '8g'"
  }
}

Rules:
- ONLY return the JSON. No explanation, no markdown, no code blocks.
- Every ingredient must have at least 2 swap suggestions.
- Every step must have a clear, actionable instruction.
- Base the recipe on the provided ingredients but you can add common pantry staples (salt, pepper, oil, water).
- If the ingredients don't make sense together, return a creative fusion recipe anyway.`;

// ─── Schema validation ──────────────────────────────────────────────────────
function validateRecipe(data) {
  const errors = [];

  if (typeof data !== "object" || data === null) {
    errors.push("Response is not an object");
    return { valid: false, errors };
  }

  if (!data.title || typeof data.title !== "string") errors.push("Missing or invalid title");
  if (!data.description || typeof data.description !== "string") errors.push("Missing description");
  if (typeof data.servings !== "number" || data.servings < 1) errors.push("Invalid servings");
  if (!Array.isArray(data.ingredients) || data.ingredients.length === 0) errors.push("Missing ingredients array");
  if (!Array.isArray(data.steps) || data.steps.length === 0) errors.push("Missing steps array");

  if (Array.isArray(data.ingredients)) {
    data.ingredients.forEach((ing, i) => {
      if (!ing.name) errors.push(`Ingredient ${i} missing name`);
      if (typeof ing.quantity !== "number") errors.push(`Ingredient ${i} missing quantity`);
      if (!Array.isArray(ing.swaps)) errors.push(`Ingredient ${i} missing swaps`);
    });
  }

  if (Array.isArray(data.steps)) {
    data.steps.forEach((step, i) => {
      if (!step.instruction) errors.push(`Step ${i} missing instruction`);
    });
  }

  return { valid: errors.length === 0, errors };
}

// ─── Sanitize / normalize ───────────────────────────────────────────────────
function sanitizeRecipe(data) {
  // Ensure ids exist
  if (Array.isArray(data.ingredients)) {
    data.ingredients = data.ingredients.map((ing, i) => ({
      id: ing.id || `ing-${i + 1}`,
      name: ing.name || "Unknown ingredient",
      quantity: typeof ing.quantity === "number" ? ing.quantity : 1,
      unit: ing.unit || "piece",
      swaps: Array.isArray(ing.swaps) ? ing.swaps : [],
    }));
  }

  if (Array.isArray(data.steps)) {
    data.steps = data.steps.map((step, i) => ({
      id: step.id || `step-${i + 1}`,
      order: step.order || i + 1,
      instruction: step.instruction || "Continue cooking.",
      duration: step.duration || null,
      tip: step.tip || null,
    }));
  }

  data.nutrition = data.nutrition || { calories: 0, protein: "?", carbs: "?", fat: "?" };
  data.tags = Array.isArray(data.tags) ? data.tags : [];
  data.difficulty = ["Easy", "Medium", "Hard"].includes(data.difficulty) ? data.difficulty : "Medium";
  data.prepTime = data.prepTime || "N/A";
  data.cookTime = data.cookTime || "N/A";

  return data;
}

// ─── Parse AI text response ─────────────────────────────────────────────────
function parseAIResponse(text) {
  // 1) Try direct parse
  try {
    return JSON.parse(text.trim());
  } catch (_) {}

  // 2) Try extracting JSON from markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch (_) {}
  }

  // 3) Try extracting the first { ... } block
  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
    try {
      return JSON.parse(text.slice(braceStart, braceEnd + 1));
    } catch (_) {}
  }

  return null;
}

// ─── Route: POST /api/recipe ────────────────────────────────────────────────
app.post("/api/recipe", async (req, res) => {
  const { ingredients } = req.body;

  if (!ingredients || typeof ingredients !== "string" || ingredients.trim().length === 0) {
    return res.status(400).json({ error: "Please provide a list of ingredients." });
  }

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_api_key_here") {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured. Add it to server/.env" });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
    let model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    });

    const prompt = `${SYSTEM_PROMPT}\n\nIngredients the user has:\n${ingredients.trim()}`;

    let result;
    try {
      result = await model.generateContent(prompt);
    } catch (err) {
      if (err.message?.includes("404") || err.message?.includes("not found") || err.message?.includes("no longer available")) {
        console.log("Falling back to gemini-3.5-flash-lite...");
        model = genAI.getGenerativeModel({
          model: "gemini-3.5-flash-lite",
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
            maxOutputTokens: 8192,
          },
        });
        result = await model.generateContent(prompt);
      } else {
        throw err;
      }
    }
    const rawText = result.response.text();

    // Parse
    const parsed = parseAIResponse(rawText);
    if (!parsed) {
      return res.status(422).json({
        error: "The AI returned an unreadable response. Please try again.",
        raw: rawText.slice(0, 300),
      });
    }

    // Validate
    const { valid, errors } = validateRecipe(parsed);
    if (!valid) {
      // Attempt to salvage by sanitizing anyway
      console.warn("Recipe validation warnings:", errors);
    }

    // Sanitize & normalize
    const recipe = sanitizeRecipe(parsed);

    return res.json({ recipe });
  } catch (err) {
    console.error("Gemini error:", err);

    if (err.message?.includes("API_KEY_INVALID") || err.message?.includes("API key")) {
      return res.status(401).json({ error: "Invalid Gemini API key. Check server/.env" });
    }
    if (err.message?.includes("quota") || err.message?.includes("429")) {
      return res.status(429).json({ error: "Rate limit reached. Please wait a moment and try again." });
    }

    return res.status(500).json({ error: "Something went wrong generating the recipe. Please try again." });
  }
});

// ─── Health check ───────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  const keyConfigured = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_api_key_here");
  res.json({ status: "ok", keyConfigured });
});

// ─── Serve frontend static assets in production ────────────────────────────
const clientDistPath = path.join(__dirname, "../client/dist");
app.use(express.static(clientDistPath));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, "index.html"), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_api_key_here") {
    console.warn("⚠️  GEMINI_API_KEY not set — add it to server/.env");
  }
});
