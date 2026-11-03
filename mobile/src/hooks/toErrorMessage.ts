/**
 * The one place a thrown value becomes screen copy.
 *
 * Every hook surfaces `error` as `string | null` rather than the raw thrown
 * value, so screens never branch on error classes or render whatever message
 * the transport layer happened to produce. `ApiError` extends `Error`, so a
 * curated backend message comes through; anything else falls back to the
 * caller's copy.
 */
export function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
