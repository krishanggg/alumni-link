interface SchoolSealProps {
  size?: number;
  className?: string;
}

/**
 * Ported from `mobile/src/components/shared/icons/SchoolSeal.tsx` (CR-07) —
 * the shared app-wide brand mark until a real school crest is supplied.
 * Deliberately generic: the app serves many schools, and inventing a
 * specific institution's crest would be worse than a neutral academic mark.
 * Uses `currentColor` so it recolors via the usual `text-*` className, same
 * as the lucide icons it replaces.
 */
export function SchoolSeal({ size = 64, className }: SchoolSealProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="29" stroke="currentColor" strokeWidth={2.5} />
      <circle cx="32" cy="32" r="24.5" stroke="currentColor" strokeWidth={1.5} />

      <g stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 30.5v13" />
        <path d="M32 30.5c-2.6-2-5.8-3-9.5-3H18v13h4.5c3.7 0 6.9 1 9.5 3" />
        <path d="M32 30.5c2.6-2 5.8-3 9.5-3H46v13h-4.5c-3.7 0-6.9 1-9.5 3" />

        <path d="M32 15l12 5-12 5-12-5 12-5z" />
        <path d="M44 20v5.5" />
      </g>

      <g fill="currentColor">
        <circle cx="26" cy="50.5" r="1.4" />
        <circle cx="32" cy="51.5" r="1.4" />
        <circle cx="38" cy="50.5" r="1.4" />
      </g>
    </svg>
  );
}
