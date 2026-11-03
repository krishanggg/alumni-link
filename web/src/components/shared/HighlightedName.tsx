import type { ReactNode } from 'react';

interface HighlightedNameProps {
  children: ReactNode;
}

/** Gives entity names a quiet visual anchor in consequential copy. */
export function HighlightedName({ children }: HighlightedNameProps) {
  return <strong className="font-medium text-on-surface">{children}</strong>;
}
