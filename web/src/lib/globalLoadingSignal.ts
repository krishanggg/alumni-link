type Listener = () => void;

let count = 0;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function startGlobalLoading(): void {
  count += 1;
  emit();
}

export function stopGlobalLoading(): void {
  count = Math.max(0, count - 1);
  emit();
}

export async function trackGlobalLoading<T>(promise: Promise<T>): Promise<T> {
  startGlobalLoading();
  try {
    return await promise;
  } finally {
    stopGlobalLoading();
  }
}

export function subscribeGlobalLoading(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getGlobalLoadingCount(): number {
  return count;
}
