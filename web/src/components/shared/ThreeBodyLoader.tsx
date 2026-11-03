import type { CSSProperties } from 'react';

interface ThreeBodyLoaderProps {
  /** Rendered size in pixels (the loader is square). Defaults to 35. */
  size?: number;
  className?: string;
  /** Accessible label announced to assistive tech. Defaults to "Loading". */
  label?: string;
}

// Branded loading indicator: three accent-coloured dots that wobble as the
// group orbits. Keyframes and dot styling live in index.css (.three-body).
export function ThreeBodyLoader({ size = 35, className = '', label = 'Loading' }: ThreeBodyLoaderProps) {
  return (
    <div
      className={`three-body ${className}`}
      style={{ '--three-body-size': `${size}px` } as CSSProperties}
      role="status"
      aria-label={label}
    >
      <div className="three-body__dot" />
      <div className="three-body__dot" />
      <div className="three-body__dot" />
    </div>
  );
}
