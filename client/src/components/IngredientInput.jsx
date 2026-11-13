import { useState, useRef, useEffect } from 'react';
import styles from './IngredientInput.module.css';

const EXAMPLES = [
  'chicken breast, garlic, lemon, olive oil, rosemary',
  'eggs, spinach, feta cheese, onion, tomatoes',
  'pasta, bacon, cream, parmesan, black pepper',
  'salmon, soy sauce, ginger, honey, sesame oil',
  'potatoes, butter, cheddar, sour cream, chives',
];

export default function IngredientInput({ onSubmit, isLoading, onReset, hasRecipe }) {
  const [text, setText] = useState('');
  const [placeholder, setPlaceholder] = useState(EXAMPLES[0]);
  const textareaRef = useRef(null);

  // Cycle placeholder examples
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % EXAMPLES.length;
      setPlaceholder(EXAMPLES[i]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() && !isLoading) onSubmit(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit(e);
    }
  };

  const charCount = text.length;
  const isOverLimit = charCount > 500;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.iconWrap}>
          <span className={styles.icon}>🧊</span>
        </div>
        <div>
          <h1 className={styles.title}>What's in your fridge?</h1>
          <p className={styles.subtitle}>
            List your ingredients and AI will craft a recipe just for you
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.textareaWrap}>
          <textarea
            ref={textareaRef}
            className={`input-field ${styles.textarea}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`e.g. ${placeholder}`}
            rows={4}
            maxLength={600}
            disabled={isLoading}
            aria-label="Ingredients input"
            id="ingredients-input"
          />
          <div className={styles.textareaFooter}>
            <span className={styles.hint}>
              <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to generate
            </span>
            <span
              className={`${styles.charCount} ${isOverLimit ? styles.overLimit : ''}`}
            >
              {charCount}/500
            </span>
          </div>
        </div>

        <div className={styles.actions}>
          {hasRecipe && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onReset}
              disabled={isLoading}
              id="reset-btn"
            >
              <span>↩</span> New recipe
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={!text.trim() || isLoading || isOverLimit}
            id="generate-btn"
            style={{ flex: 1 }}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner} aria-hidden="true" />
                Generating recipe…
              </>
            ) : (
              <>
                <span>✨</span>
                Generate Recipe
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick-fill examples */}
      {!hasRecipe && (
        <div className={styles.examples}>
          <span className={styles.examplesLabel}>Try:</span>
          {EXAMPLES.slice(0, 3).map((ex, i) => (
            <button
              key={i}
              type="button"
              className={styles.exampleChip}
              onClick={() => setText(ex)}
              disabled={isLoading}
              id={`example-${i}`}
            >
              {ex.split(',')[0]}…
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
