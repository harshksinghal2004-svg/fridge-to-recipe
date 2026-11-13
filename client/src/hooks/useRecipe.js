import { useState, useCallback, useRef } from 'react';

/**
 * useRecipe — handles fetching, parsing, race condition prevention,
 * and all error/loading/empty states for recipe generation.
 */
export function useRecipe() {
  const [recipe, setRecipe]     = useState(null);
  const [status, setStatus]     = useState('idle'); // idle | loading | success | error
  const [error, setError]       = useState(null);
  const [servings, setServings] = useState(null);   // current serving multiplier (null = original)

  // Abort controller ref — prevents stale responses overwriting newer ones
  const abortRef = useRef(null);
  // Request counter ref — secondary guard on top of AbortController
  const reqIdRef = useRef(0);

  const fetchRecipe = useCallback(async (ingredients) => {
    if (!ingredients.trim()) return;

    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    // Stamp this request
    const reqId = ++reqIdRef.current;

    setStatus('loading');
    setError(null);
    setRecipe(null);
    setServings(null);

    try {
      const resp = await fetch('/api/recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients }),
        signal: abortRef.current.signal,
      });

      // Guard: if a newer request has started, discard this response
      if (reqId !== reqIdRef.current) return;

      let data;
      try {
        data = await resp.json();
      } catch (_) {
        if (!resp.ok) {
          throw new Error(`Server returned error (${resp.status}). Make sure the backend server is running on http://localhost:3001.`);
        }
        throw new Error('Received an invalid or empty response. Make sure the backend server is running on http://localhost:3001.');
      }

      if (reqId !== reqIdRef.current) return;

      if (!resp.ok) {
        throw new Error(data?.error || `Server error ${resp.status}`);
      }

      if (!data.recipe) {
        throw new Error('No recipe data returned from server.');
      }

      setRecipe(data.recipe);
      setServings(data.recipe.servings);
      setStatus('success');

    } catch (err) {
      // AbortError means we intentionally cancelled — don't show error
      if (err.name === 'AbortError') return;

      // Guard stale
      if (reqId !== reqIdRef.current) return;

      setError(err.message || 'An unexpected error occurred.');
      setStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setRecipe(null);
    setStatus('idle');
    setError(null);
    setServings(null);
  }, []);

  return { recipe, status, error, servings, setServings, fetchRecipe, reset };
}
