import ServingScaler from './ServingScaler';
import IngredientsList from './IngredientsList';
import StepsList from './StepsList';
import styles from './RecipeCard.module.css';

const DIFFICULTY_BADGE = {
  Easy:   'badge-easy',
  Medium: 'badge-medium',
  Hard:   'badge-hard',
};

const DIFF_EMOJI = { Easy: '🟢', Medium: '🟡', Hard: '🔴' };

export default function RecipeCard({ recipe, servings, onServingsChange }) {
  const {
    title, description, difficulty, prepTime, cookTime,
    ingredients, steps, tags, nutrition,
    servings: originalServings,
  } = recipe;

  return (
    <article className={styles.card}>
      {/* ─── Header ───────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>{title}</h2>
          <span className={`badge ${DIFFICULTY_BADGE[difficulty] || 'badge-medium'}`}>
            {DIFF_EMOJI[difficulty]} {difficulty}
          </span>
        </div>
        <p className={styles.description}>{description}</p>

        {/* Meta chips */}
        <div className={styles.meta}>
          {prepTime && (
            <span className={styles.metaChip}>
              <span>🕐</span> Prep: {prepTime}
            </span>
          )}
          {cookTime && (
            <span className={styles.metaChip}>
              <span>🔥</span> Cook: {cookTime}
            </span>
          )}
          {tags.slice(0, 4).map((tag) => (
            <span key={tag} className={`${styles.metaChip} ${styles.tagChip}`}>
              #{tag}
            </span>
          ))}
        </div>
      </header>

      {/* ─── Nutrition strip ──────────────────── */}
      {nutrition && (
        <div className={styles.nutrition}>
          {[
            { label: 'Calories', value: nutrition.calories, unit: 'kcal' },
            { label: 'Protein',  value: nutrition.protein },
            { label: 'Carbs',    value: nutrition.carbs },
            { label: 'Fat',      value: nutrition.fat },
          ].map((n) => (
            <div key={n.label} className={styles.nutriItem}>
              <span className={styles.nutriValue}>{n.value}{n.unit || ''}</span>
              <span className={styles.nutriLabel}>{n.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ─── Serving scaler ───────────────────── */}
      <div className={styles.scalerWrap}>
        <ServingScaler
          original={originalServings}
          current={servings}
          onChange={onServingsChange}
        />
      </div>

      <div className={styles.divider} />

      {/* ─── Ingredients ──────────────────────── */}
      <IngredientsList
        ingredients={ingredients}
        originalServings={originalServings}
        currentServings={servings}
      />

      <div className={styles.divider} />

      {/* ─── Steps ────────────────────────────── */}
      <StepsList steps={steps} />
    </article>
  );
}
