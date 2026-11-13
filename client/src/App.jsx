import { useCallback } from 'react';
import { useRecipe } from './hooks/useRecipe';
import IngredientInput from './components/IngredientInput';
import RecipeCard from './components/RecipeCard';
import LoadingState from './components/LoadingState';
import ErrorState from './components/ErrorState';
import './App.css';

export default function App() {
  const { recipe, status, error, servings, setServings, fetchRecipe, reset } = useRecipe();

  const handleSubmit = useCallback(
    (ingredients) => {
      fetchRecipe(ingredients);
    },
    [fetchRecipe]
  );

  const handleRetry = useCallback(() => {
    // Reset to idle so user can re-submit
    reset();
  }, [reset]);

  const isLoading = status === 'loading';
  const hasRecipe = status === 'success' && recipe !== null;

  return (
    <div className="app-shell">
      {/* ── Ambient background blobs ── */}
      <div className="blob blob-1" aria-hidden="true" />
      <div className="blob blob-2" aria-hidden="true" />

      {/* ── Top nav ── */}
      <header className="nav">
        <div className="nav-inner">
          <div className="nav-brand">
            <span className="nav-logo">🍳</span>
            <span className="nav-name">FridgeChef</span>
            <span className="nav-tag">AI</span>
          </div>
          <nav className="nav-links">
            <a
              href="https://aistudio.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-link"
            >
              Powered by Gemini
            </a>
          </nav>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="main">
        <div className="content-wrap">

          {/* Input is always visible */}
          <IngredientInput
            onSubmit={handleSubmit}
            isLoading={isLoading}
            onReset={reset}
            hasRecipe={hasRecipe}
          />

          {/* State-driven output area */}
          <div className="output-area" aria-live="polite">
            {status === 'loading' && <LoadingState />}

            {status === 'error' && (
              <ErrorState message={error} onRetry={handleRetry} />
            )}

            {hasRecipe && (
              <RecipeCard
                recipe={recipe}
                servings={servings}
                onServingsChange={setServings}
              />
            )}

            {status === 'idle' && (
              <div className="empty-state">
                <div className="empty-cards">
                  {['🍅', '🥦', '🍋', '🧄', '🥚'].map((emoji, i) => (
                    <div
                      key={i}
                      className="empty-card"
                      style={{ animationDelay: `${i * 0.12}s` }}
                    >
                      {emoji}
                    </div>
                  ))}
                </div>
                <h2 className="empty-title">What's hiding in your fridge?</h2>
                <p className="empty-desc">
                  Type any ingredients above and AI will craft a full recipe —
                  with steps to check off, scalable servings, and smart swaps.
                </p>
                <div className="empty-features">
                  {[
                    { icon: '✅', text: 'Interactive step checklist' },
                    { icon: '⚖️', text: 'Scale servings instantly' },
                    { icon: '🔄', text: 'Ingredient swap suggestions' },
                    { icon: '⚡', text: 'Powered by Gemini AI' },
                  ].map((f) => (
                    <div key={f.text} className="feature-pill">
                      <span>{f.icon}</span>
                      <span>{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="footer">
        <span>Built with React + Gemini AI</span>
        <span className="footer-dot">·</span>
        <span>FridgeChef © 2025 · Harsh Kumar Singhal</span>
      </footer>
    </div>
  );
}
