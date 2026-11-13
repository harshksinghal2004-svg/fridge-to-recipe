import os
import re
import json
from pathlib import Path
from typing import Optional, Dict, Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn

# Load environment variables (.env from root or server/.env)
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR / "server" / ".env")

app = FastAPI(title="FridgeChef API", version="1.0.0")

# Enable CORS for local development (e.g. Vite dev server on port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── System Prompt ────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are a helpful chef assistant. Given a list of ingredients, return ONLY a valid JSON object (no markdown, no code fences, no extra text) matching this exact schema:

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
- If the ingredients don't make sense together, return a creative fusion recipe anyway."""


# ─── Parsing & Validation Helpers ─────────────────────────────────────────────
def parse_ai_response(text: str) -> Optional[Dict[str, Any]]:
    text = text.strip()
    # 1) Direct parse
    try:
        return json.loads(text)
    except Exception:
        pass

    # 2) Extract from code fences
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence_match:
        try:
            return json.loads(fence_match.group(1).strip())
        except Exception:
            pass

    # 3) Extract outer {...}
    brace_start = text.find("{")
    brace_end = text.rfind("}")
    if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
        try:
            return json.loads(text[brace_start : brace_end + 1])
        except Exception:
            pass

    return None


def sanitize_recipe(data: Dict[str, Any]) -> Dict[str, Any]:
    # Normalize ingredients
    ingredients = data.get("ingredients")
    if isinstance(ingredients, list):
        clean_ingredients = []
        for i, ing in enumerate(ingredients):
            if not isinstance(ing, dict):
                continue
            qty = ing.get("quantity")
            if not isinstance(qty, (int, float)):
                qty = 1
            clean_ingredients.append({
                "id": ing.get("id") or f"ing-{i + 1}",
                "name": ing.get("name") or "Unknown ingredient",
                "quantity": qty,
                "unit": ing.get("unit") or "piece",
                "swaps": ing.get("swaps") if isinstance(ing.get("swaps"), list) else [],
            })
        data["ingredients"] = clean_ingredients
    else:
        data["ingredients"] = []

    # Normalize steps
    steps = data.get("steps")
    if isinstance(steps, list):
        clean_steps = []
        for i, step in enumerate(steps):
            if not isinstance(step, dict):
                continue
            clean_steps.append({
                "id": step.get("id") or f"step-{i + 1}",
                "order": step.get("order") if isinstance(step.get("order"), int) else i + 1,
                "instruction": step.get("instruction") or "Continue cooking.",
                "duration": step.get("duration"),
                "tip": step.get("tip"),
            })
        data["steps"] = clean_steps
    else:
        data["steps"] = []

    # Normalize defaults
    if not isinstance(data.get("nutrition"), dict):
        data["nutrition"] = {"calories": 0, "protein": "?", "carbs": "?", "fat": "?"}
    if not isinstance(data.get("tags"), list):
        data["tags"] = []
    if data.get("difficulty") not in ["Easy", "Medium", "Hard"]:
        data["difficulty"] = "Medium"
    data["prepTime"] = data.get("prepTime") or "N/A"
    data["cookTime"] = data.get("cookTime") or "N/A"
    data["servings"] = data.get("servings") if isinstance(data.get("servings"), (int, float)) and data.get("servings") > 0 else 2
    data["title"] = data.get("title") or "Custom Recipe"
    data["description"] = data.get("description") or "Delicious recipe created for your ingredients."

    return data


# ─── Request Models ───────────────────────────────────────────────────────────
class RecipeRequest(BaseModel):
    ingredients: Optional[str] = None


# ─── API Routes ───────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    key_configured = bool(api_key and api_key not in ["your_google_gemini_api_key_here", "your_api_key_here"])
    return {"status": "ok", "keyConfigured": key_configured}


@app.post("/api/recipe")
def generate_recipe(body: RecipeRequest):
    ingredients = body.ingredients

    if not ingredients or not ingredients.strip():
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "Please provide a list of ingredients."},
        )

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or api_key in ["your_google_gemini_api_key_here", "your_api_key_here"]:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "GEMINI_API_KEY is not configured. Add it to .env"},
        )

    prompt = f"{SYSTEM_PROMPT}\n\nIngredients the user has:\n{ingredients.strip()}"
    raw_text = None

    try:
        # Determine preferred model candidates
        env_model = os.getenv("GEMINI_MODEL", "").strip()
        candidates = []
        if env_model:
            candidates.append(env_model)
        candidates.extend([
            "gemini-2.5-flash-lite",
            "gemini-3.5-flash-lite",
            "gemini-flash-lite-latest",
            "gemini-3.8-flash",
            "gemini-2.5-flash",
        ])

        # Remove duplicates while preserving order
        seen = set()
        model_candidates = [m for m in candidates if not (m in seen or seen.add(m))]

        # 1. Prefer modern google-genai SDK
        last_error = None
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            for model_name in model_candidates:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=0.7,
                            max_output_tokens=8192,
                        ),
                    )
                    raw_text = response.text
                    if raw_text:
                        print(f">> Successfully generated recipe using {model_name}")
                        break
                except Exception as model_err:
                    last_error = model_err
                    print(f"Candidate {model_name} failed: {model_err}")
                    continue
        except ImportError:
            pass

        # 2. Fallback to google-generativeai SDK if needed
        if not raw_text:
            import google.generativeai as legacy_genai
            legacy_genai.configure(api_key=api_key)
            for model_name in model_candidates:
                try:
                    model = legacy_genai.GenerativeModel(
                        model_name=model_name,
                        generation_config={
                            "response_mime_type": "application/json",
                            "temperature": 0.7,
                            "max_output_tokens": 8192,
                        },
                    )
                    resp = model.generate_content(prompt)
                    raw_text = resp.text
                    if raw_text:
                        break
                except Exception as legacy_err:
                    last_error = legacy_err
                    continue

        if not raw_text:
            err_msg = str(last_error) if last_error else "Received empty response from Gemini AI."
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"error": f"Failed to generate recipe: {err_msg}"},
            )

        parsed = parse_ai_response(raw_text)
        if not parsed:
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={
                    "error": "The AI returned an unreadable response. Please try again.",
                    "raw": raw_text[:300],
                },
            )

        recipe = sanitize_recipe(parsed)
        return {"recipe": recipe}

    except Exception as err:
        err_str = str(err)
        print(f"Gemini API Error: {err_str}")

        if "API_KEY_INVALID" in err_str or "API key not valid" in err_str:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"error": "Invalid Gemini API key. Check your .env file."},
            )
        if "quota" in err_str.lower() or "429" in err_str:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"error": "Rate limit reached. Please wait a moment and try again."},
            )

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": f"Something went wrong generating the recipe: {err_str}"},
        )


# ─── Serve Built Frontend SPA (client/dist) or Informational Dev Page ─────────
dist_dir = BASE_DIR / "client" / "dist"

if dist_dir.exists() and (dist_dir / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=dist_dir / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(request: Request, full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = dist_dir / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(dist_dir / "index.html")
else:
    @app.get("/")
    def index_fallback():
        return HTMLResponse("""
        <!DOCTYPE html>
        <html>
        <head>
            <title>FridgeChef Backend</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .card { background: #1e293b; padding: 2.5rem; border-radius: 12px; border: 1px solid #334155; max-width: 550px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
                h1 { margin-top: 0; color: #38bdf8; }
                code { background: #0f172a; color: #a5f3fc; padding: 0.2rem 0.4rem; border-radius: 4px; font-family: monospace; }
                .status { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; background: #065f46; color: #34d399; font-weight: 600; font-size: 0.875rem; margin-bottom: 1rem; }
            </style>
        </head>
        <body>
            <div class="card">
                <span class="status">● Python Backend Online</span>
                <h1>FridgeChef API</h1>
                <p>The FastAPI Python backend is running on <code>http://localhost:3001</code>.</p>
                <h3>Frontend Options:</h3>
                <ul>
                    <li><strong>Dev Mode:</strong> Run <code>cd client && npm install && npm run dev</code> and open <a href="http://localhost:5173" style="color: #38bdf8;">http://localhost:5173</a>.</li>
                    <li><strong>Production:</strong> Run <code>cd client && npm run build</code> to bundle and serve everything directly from this Python server!</li>
                </ul>
                <p>Health check: <a href="/api/health" style="color: #38bdf8;">/api/health</a> | Interactive API Docs: <a href="/docs" style="color: #38bdf8;">/docs</a></p>
            </div>
        </body>
        </html>
        """)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3001))
    host = os.environ.get("HOST", "127.0.0.1")
    print(f">> Starting Python FastAPI server on http://{host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)
