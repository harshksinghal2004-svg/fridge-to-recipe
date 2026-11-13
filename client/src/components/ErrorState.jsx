import styles from './ErrorState.module.css';

const ERROR_ICONS = {
  rate:    '⏱️',
  auth:    '🔑',
  network: '📡',
  parse:   '🤖',
  default: '⚠️',
};

function getErrorType(msg = '') {
  if (msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('429')) return 'rate';
  if (msg.toLowerCase().includes('key') || msg.toLowerCase().includes('auth')) return 'auth';
  if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) return 'network';
  if (msg.toLowerCase().includes('unreadable') || msg.toLowerCase().includes('parse')) return 'parse';
  return 'default';
}

export default function ErrorState({ message, onRetry }) {
  const type = getErrorType(message);
  const icon = ERROR_ICONS[type];

  return (
    <div className={styles.container} role="alert" aria-live="assertive">
      <div className={styles.iconWrap}>
        <span className={styles.icon}>{icon}</span>
        <div className={styles.ripple} />
      </div>

      <h2 className={styles.title}>Oops, something went wrong</h2>
      <p className={styles.message}>{message}</p>

      {type === 'auth' && (
        <div className={styles.hint}>
          <span>💡</span>
          <span>Add your Gemini API key to <code>server/.env</code> and restart the server.</span>
        </div>
      )}

      {type === 'rate' && (
        <div className={styles.hint}>
          <span>💡</span>
          <span>You've hit the rate limit. Wait a few seconds, then try again.</span>
        </div>
      )}

      <button
        className="btn btn-primary"
        onClick={onRetry}
        id="retry-btn"
        style={{ marginTop: 8 }}
      >
        <span>↺</span> Try again
      </button>
    </div>
  );
}
