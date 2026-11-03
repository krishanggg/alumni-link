import { useEffect, useState } from 'react';

/**
 * Returns `false` until `active` has stayed `true` for `delayMs`, then `true`.
 * Resets immediately when `active` goes `false`.
 *
 * Used to gate loading skeletons: a fetch that resolves inside the delay
 * window (a warm cache, a fast connection) never mounts the skeleton, so the
 * screen swaps straight from its previous content to the new content instead
 * of flashing a skeleton frame. Mirrors `web/src/components/table/DataTable`'s
 * `useDelayedFlag`.
 */
export function useDelayedFlag(active: boolean, delayMs: number): boolean {
  const [elapsed, setElapsed] = useState(false);

  // Reset during render rather than in an effect, so a screen that leaves the
  // loading state never renders a stale `true` for a frame.
  if (!active && elapsed) {
    setElapsed(false);
  }

  useEffect(() => {
    if (!active) {
      return;
    }

    const id = setTimeout(() => setElapsed(true), delayMs);

    return () => clearTimeout(id);
  }, [active, delayMs]);

  return active && elapsed;
}

/** The shared skeleton-delay window, so every screen holds off for the same beat. */
export const SKELETON_DELAY_MS = 150;
