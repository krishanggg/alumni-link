export function mergeDescribedBy(...values: Array<string | null | undefined>): string | undefined {
  const ids = values
    .flatMap((value) => value?.split(/\s+/) ?? [])
    .filter(Boolean);
  const uniqueIds = [...new Set(ids)];

  return uniqueIds.length > 0 ? uniqueIds.join(' ') : undefined;
}
