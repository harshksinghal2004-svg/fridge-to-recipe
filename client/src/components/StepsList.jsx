import { useState } from 'react';
import styles from './StepsList.module.css';

export default function StepsList({ steps }) {
  const [checked, setChecked] = useState(new Set());

  const toggle = (id) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetAll = () => setChecked(new Set());
  const checkAll = () => setChecked(new Set(steps.map((s) => s.id)));

  const doneCount = checked.size;
  const totalCount = steps.length;
  const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
  const allDone = doneCount === totalCount;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.heading}>
          <span>👨‍🍳</span> Instructions
        </h2>
        <div className={styles.headerActions}>
          <span className={styles.progress}>
            {doneCount}/{totalCount}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={allDone ? resetAll : checkAll}
            id="steps-toggle-all"
          >
            {allDone ? '↺ Reset' : '✓ All'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {allDone && (
        <div className={styles.completionBanner}>
          <span>🎉</span>
          <span>All steps done! Enjoy your meal!</span>
        </div>
      )}

      <ol className={styles.list}>
        {steps.map((step, idx) => {
          const done = checked.has(step.id);
          return (
            <li
              key={step.id}
              className={`${styles.step} ${done ? styles.done : ''}`}
              style={{ animationDelay: `${idx * 0.07}s` }}
            >
              <button
                className={styles.checkbox}
                onClick={() => toggle(step.id)}
                aria-pressed={done}
                aria-label={`Step ${step.order}: ${done ? 'mark incomplete' : 'mark complete'}`}
                id={`step-check-${step.id}`}
              >
                {done ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span className={styles.stepNum}>{step.order}</span>
                )}
              </button>

              <div className={styles.stepContent}>
                <p className={styles.instruction}>{step.instruction}</p>
                <div className={styles.meta}>
                  {step.duration && (
                    <span className={styles.metaChip}>
                      <span>⏱</span> {step.duration}
                    </span>
                  )}
                  {step.tip && (
                    <span className={`${styles.metaChip} ${styles.tipChip}`}>
                      <span>💡</span> {step.tip}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
