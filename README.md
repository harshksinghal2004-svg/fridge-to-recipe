# 🍳 FridgeChef — AI-Powered Recipe Generator

[![React 19](https://img.shields.io/badge/React%2019-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini%202.5-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)

**FridgeChef** turns whatever ingredients you have in your fridge into an interactive, step-by-step culinary recipe powered by Google's Gemini 2.5 Flash AI model.

---

## ✨ Key Features

| Feature | Detail |
|---|---|
| **Free-Form Ingredient Input** | Type anything (e.g. *"chicken breast, garlic, olive oil"*). |
| **Structured AI Recipes** | Gemini 2.5 Flash produces structured recipes with prep time, cook time, and difficulty. |
| **Interactive Step Checklist** | Check off cooking steps sequentially with real-time cooking progress indicators. |
| **Dynamic Serving Scaler** | `+` and `−` controls instantly rescale all ingredient amounts accurately. |
| **Smart Ingredient Swaps** | Every ingredient includes 2+ smart substitution suggestions in an interactive popover. |
| **Nutritional Breakdown** | Estimates total calories, protein, carbohydrates, and fat per serving. |
| **Race Condition Guard** | `AbortController` + sequential request ID stamping cancels outdated requests and prevents stale responses. |
| **Resilient JSON Pipeline** | Multi-tier AI response parsing handles code fences, JSON extraction, and schema normalization. |
| **Modern Dark Mode Aesthetic** | Glassmorphism, smooth CSS gradients, custom micro-animations, and full mobile responsiveness. |

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework:** React 19 + Vite 8
- **Styling:** Vanilla CSS design system with custom CSS variables (tokens), dark mode palette, and glassmorphic elevations
- **State & Concurrency:** Custom `useRecipe` hook with `AbortController` cancellation and request-ID stamping
- **Typography:** Google Fonts (*Inter* for UI & *Playfair Display* for recipe headings)

### **Backend**
- **Runtime:** Node.js (ES Modules)
- **Server Framework:** Express 4
- **AI Integration:** `@google/generative-ai` SDK using `gemini-2.5-flash`
- **Security & Utilities:** `cors`, `dotenv`

### **Deployment & Cloud Infrastructure**
- **Platform:** Render Cloud
- **Architecture:** Unified Full-Stack Single Service (Express serves both backend `/api/*` endpoints and static frontend SPA bundle from `client/dist`)
- **Configuration:** Automated via `render.yaml` and root `package.json` build hooks

---

## 🗂️ Project Directory Structure

```text
fridge-to-recipe/
├── client/                          # Frontend React + Vite SPA
│   ├── public/                      # Static assets (favicons, SVG icons)
│   ├── src/
│   │   ├── assets/                  # Hero illustrations & vector graphics
│   │   ├── components/              # Modular UI Components
│   │   │   ├── IngredientInput.jsx  # Text input, quick suggestions & char counter
│   │   │   ├── RecipeCard.jsx       # Top-level recipe card container
│   │   │   ├── IngredientsList.jsx  # Scaled ingredient list & swap popovers
│   │   │   ├── StepsList.jsx        # Checkable step-by-step instructions
│   │   │   ├── ServingScaler.jsx    # Dynamic +/- serving adjuster
│   │   │   ├── LoadingState.jsx     # Modern animated skeleton loader
│   │   │   └── ErrorState.jsx       # User-friendly contextual error state
│   │   ├── hooks/
│   │   │   └── useRecipe.js         # Custom fetch hook with race-condition guard
│   │   ├── App.jsx                  # Main application container & state machine
│   │   ├── App.css                  # App container styles & animations
│   │   ├── index.css                # Global design system & design tokens
│   │   └── main.jsx                 # React root entry point
│   ├── index.html                   # HTML document template
│   ├── vite.config.js               # Vite config & dev proxy (/api -> :3001)
│   └── package.json                 # Client dependencies & scripts
│
├── server/                          # Backend Express API & Gemini Integration
│   ├── index.js                     # API routes, Gemini AI generation, schema validation & SPA serving
│   ├── package.json                 # Server dependencies & scripts
│   └── .env                         # Local environment variables (GEMINI_API_KEY)
│
├── package.json                     # Root monorepo orchestration & Render build scripts
├── package-lock.json                # Root dependency lockfile
├── render.yaml                      # Render Blueprint infrastructure configuration
├── .gitignore                       # Git ignore rules (node_modules, .env, dist)
└── README.md                        # Complete project documentation
```

---

## 🔌 Backend API Endpoints

The backend API runs on port `3001` locally or in production on your deployment host.

### 1. Health Check
Checks if the backend is running and verifies whether the Gemini API key is configured.

- **Method:** `GET`
- **Endpoint:** `/api/health`
- **Response (200 OK):**
```json
{
  "status": "ok",
  "keyConfigured": true
}
```

---

### 2. Generate Recipe
Receives a comma-separated list or description of ingredients, queries Google Gemini 2.5 Flash, validates and normalizes the schema, and returns a recipe.

- **Method:** `POST`
- **Endpoint:** `/api/recipe`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "ingredients": "chicken breast, garlic, olive oil, spinach"
}
```

- **Successful Response (200 OK):**
```json
{
  "recipe": {
    "title": "Garlic Herb Pan-Seared Chicken Breast",
    "description": "Juicy chicken breasts seared with aromatic garlic and sautéed spinach.",
    "servings": 2,
    "prepTime": "10 minutes",
    "cookTime": "15 minutes",
    "difficulty": "Easy",
    "ingredients": [
      {
        "id": "ing-1",
        "name": "chicken breast",
        "quantity": 2,
        "unit": "pieces",
        "swaps": ["turkey cutlets", "firm tofu fillets"]
      },
      {
        "id": "ing-2",
        "name": "garlic",
        "quantity": 3,
        "unit": "cloves",
        "swaps": ["garlic powder", "shallots"]
      }
    ],
    "steps": [
      {
        "id": "step-1",
        "order": 1,
        "instruction": "Pat chicken breasts dry with paper towels and season both sides.",
        "duration": "2 minutes",
        "tip": "Drying the meat ensures a golden, crispy sear."
      },
      {
        "id": "step-2",
        "order": 2,
        "instruction": "Heat olive oil in a skillet over medium-high heat and sear chicken for 6-7 minutes per side.",
        "duration": "14 minutes",
        "tip": "Do not move the chicken during the first 4 minutes to develop good color."
      }
    ],
    "tags": ["High-Protein", "Quick & Easy", "Low-Carb"],
    "nutrition": {
      "calories": 340,
      "protein": "42g",
      "carbs": "3g",
      "fat": "18g"
    }
  }
}
```

- **Error Responses:**

| Status Code | Reason | Example Response Body |
|---|---|---|
| `400 Bad Request` | Missing or empty ingredients string | `{"error": "Please provide a list of ingredients."}` |
| `401 Unauthorized` | Missing or invalid Gemini API key | `{"error": "Invalid Gemini API key. Check server/.env"}` |
| `422 Unprocessable Entity` | AI returned an invalid JSON structure | `{"error": "The AI returned an unreadable response. Please try again."}` |
| `429 Too Many Requests` | Gemini API rate limit exceeded | `{"error": "Rate limit reached. Please wait a moment and try again."}` |
| `500 Server Error` | Unexpected upstream or runtime exception | `{"error": "Something went wrong generating the recipe. Please try again."}` |

---

### 3. Frontend SPA Wildcard
- **Method:** `GET`
- **Endpoint:** `/*` (any route not matching `/api/*`)
- **Description:** In production, Express serves the built React single-page application (`client/dist/index.html`).

---

## 🚀 Running Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher)
- A free [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### 1. Clone the repository
```bash
git clone https://github.com/harshksinghal2004-svg/fridge-to-recipe.git
cd fridge-to-recipe
```

### 2. Configure Environment Variables
Create a `.env` file in the `server/` directory:
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
PORT=3001
```

### 3. Install Dependencies & Run

#### Option A: Running with two separate terminals (Best for development)

**Terminal 1 — Backend:**
```bash
cd server
npm install
npm run dev
# → Backend running at http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd client
npm install
npm run dev
# → Frontend running at http://localhost:5173
```
Open your browser at **http://localhost:5173**.

#### Option B: Running the production build locally from root
```bash
npm install
npm start
# → Full-stack app running at http://localhost:3001
```

---

## ☁️ Deployment (Render)

This repository is preconfigured for zero-friction deployment on [Render](https://render.com) using the included [render.yaml](render.yaml):

1. Link your GitHub repository to **Render**.
2. Create a new **Web Service**.
3. Configure the service settings:
   - **Build Command:** `npm install && cd client && npm install && npm run build`
   - **Start Command:** `node server/index.js`
   - **Root Directory:** *(leave blank)*
4. Under **Environment Variables**, add:
   - `GEMINI_API_KEY` = `your_gemini_api_key`
5. Deploy!

---

## 🛡️ AI Output Handling & Reliability

1. **Schema Enforcement:** Gemini is queried with `responseMimeType: "application/json"` to guarantee structured responses.
2. **Multi-Stage Sanitization:** If standard JSON parsing fails, the pipeline strips Markdown code fences and extracts raw `{...}` JSON blocks.
3. **Token Allocation:** Uses `maxOutputTokens: 8192` with `gemini-2.5-flash` to prevent reasoning and complex recipe outputs from being truncated.
4. **Resilient Normalization:** Auto-fills fallback unique IDs, normalizes ingredient measurements, and ensures all array structures are guaranteed.

---

## 👤 Author

**Harsh Kumar Singhal**
- GitHub: [@harshksinghal2004-svg](https://github.com/harshksinghal2004-svg)
- Email: harshksinghal2004@gmail.com

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
