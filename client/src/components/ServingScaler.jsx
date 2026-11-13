import { useState } from 'react';
import styles from './ServingScaler.module.css';

export default function ServingScaler({ original, current, onChange }) {
  const [inputVal, setInputVal] = useState(String(current));

  const ratio = current / original;

  const adjust = (delta) => {
    const next = Math.max(1, Math.min(100, current + delta));
    onChange(next);
    setInputVal(String(next));
  };

  const handleInput = (e) => {
    const v = e.target.value;
    setInputVal(v);
    const n = parseInt(v, 10);
    if (!isNaN(n) && n >= 1 && n <= 100) onChange(n);
  };

  return (
    <div className={styles.container}>
      <div className={styles.label}>
        <span>🍽️</span>
        <span>Servings</span>
        {ratio !== 1 && (
          <span className={styles.ratio}>
            {ratio > 1 ? `×${ratio.toFixed(1)}` : `÷${(1 / ratio).toFixed(1)}`}
          </span>
        )}
      </div>

      <div className={styles.controls}>
        <button
          className={`btn btn-secondary btn-icon btn-sm ${styles.stepBtn}`}
          onClick={() => adjust(-1)}
          disabled={current <= 1}
          aria-label="Decrease servings"
          id="servings-decrease"
        >
          −
        </button>

        <input
          type="number"
          min={1}
          max={100}
          value={inputVal}
          onChange={handleInput}
          className={styles.numInput}
          aria-label="Servings count"
          id="servings-input"
        />

        <button
          className={`btn btn-secondary btn-icon btn-sm ${styles.stepBtn}`}
          onClick={() => adjust(1)}
          disabled={current >= 100}
          aria-label="Increase servings"
          id="servings-increase"
        >
          +
        </button>
      </div>

      {/* Quick presets */}
      <div className={styles.presets}>
        {[1, 2, 4, 6, 8].map((n) => (
          <button
            key={n}
            type="button"
            className={`${styles.preset} ${current === n ? styles.active : ''}`}
            onClick={() => { onChange(n); setInputVal(String(n)); }}
            id={`serving-preset-${n}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
