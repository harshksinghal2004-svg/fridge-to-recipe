import styles from './LoadingState.module.css';

export default function LoadingState() {
  return (
    <div className={styles.container} role="status" aria-live="polite" aria-label="Generating recipe">
      <div className={styles.header}>
        <div className={`${styles.avatarSkeleton} skeleton`} />
        <div className={styles.headerText}>
          <div className={`${styles.skLine} skeleton`} style={{ width: '60%', height: 28 }} />
          <div className={`${styles.skLine} skeleton`} style={{ width: '40%', height: 18 }} />
        </div>
      </div>

      <div className={styles.metaRow}>
        {[80, 100, 70, 90].map((w, i) => (
          <div key={i} className={`${styles.metaBadge} skeleton`} style={{ width: w }} />
        ))}
      </div>

      <div className={styles.section}>
        <div className={`${styles.sectionTitle} skeleton`} style={{ width: '30%' }} />
        {[100, 80, 90, 70, 85].map((w, i) => (
          <div key={i} className={styles.ingredientRow}>
            <div className={`skeleton`} style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0 }} />
            <div className={`skeleton`} style={{ width: `${w}%`, height: 18 }} />
          </div>
        ))}
      </div>

      <div className={styles.section}>
        <div className={`${styles.sectionTitle} skeleton`} style={{ width: '25%' }} />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={styles.stepRow}>
            <div className={`skeleton`} style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className={`skeleton`} style={{ height: 16, width: '90%' }} />
              <div className={`skeleton`} style={{ height: 14, width: '70%' }} />
            </div>
          </div>
        ))}
      </div>

      <div className={styles.loadingMessage}>
        <span className={styles.dots}>
          <span />
          <span />
          <span />
        </span>
        <span>AI is crafting your recipe</span>
      </div>
    </div>
  );
}
