import { useState } from 'react';
import styles from './IngredientsList.module.css';

function scaleQuantity(qty, original, current) {
  const ratio = current / original;
  const scaled = qty * ratio;
  // Format nicely: avoid 1.0000004 etc.
  if (Number.isInteger(scaled)) return String(scaled);
  // Nice fractions for small values
  const nice = Math.round(scaled * 100) / 100;
  return String(nice);
}

function SwapPopover({ swaps, onClose }) {
  return (
    <div className={styles.popoverBackdrop} onClick={onClose}>
      <div className={styles.popover} onClick={(e) => e.stopPropagation()}>
        <div className={styles.popoverHeader}>
          <span>🔄 Ingredient Swaps</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close swaps">✕</button>
        </div>
        <ul className={styles.swapList}>
          {swaps.map((swap, i) => (
            <li key={i} className={styles.swapItem}>
              <span className={styles.swapIcon}>→</span>
              <span>{swap}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function IngredientsList({ ingredients, originalServings, currentServings }) {
  const [openSwapId, setOpenSwapId] = useState(null);

  const activeIngredient = ingredients.find((i) => i.id === openSwapId);

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>
        <span>🥕</span> Ingredients
        <span className={styles.headingNote}>
          for {currentServings} serving{currentServings !== 1 ? 's' : ''}
        </span>
      </h2>

      <ul className={styles.list}>
        {ingredients.map((ing) => {
          const scaled = scaleQuantity(ing.quantity, originalServings, currentServings);
          return (
            <li key={ing.id} className={styles.item}>
              <div className={styles.itemLeft}>
                <span className={styles.qty}>{scaled}</span>
                <span className={styles.unit}>{ing.unit}</span>
                <span className={styles.name}>{ing.name}</span>
              </div>
              {ing.swaps && ing.swaps.length > 0 && (
                <button
                  className={styles.swapBtn}
                  onClick={() => setOpenSwapId(openSwapId === ing.id ? null : ing.id)}
                  aria-label={`Swap options for ${ing.name}`}
                  id={`swap-${ing.id}`}
                  title="See swap options"
                >
                  <span>⇄</span>
                  <span className={styles.swapBtnText}>Swap</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {openSwapId && activeIngredient && (
        <SwapPopover
          swaps={activeIngredient.swaps}
          onClose={() => setOpenSwapId(null)}
        />
      )}
    </section>
  );
}
