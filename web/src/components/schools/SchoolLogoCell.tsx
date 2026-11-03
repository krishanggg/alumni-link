import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Pencil } from 'lucide-react';

import { DEFAULT_ICON_TONE } from '../../lib/toneClasses';

interface SchoolLogoCellProps {
  schoolName: string;
  logoUrl: string | null;
  onClick: () => void;
}

const PREVIEW_SIZE = 176;
const PREVIEW_GAP = 8;

interface PreviewPosition {
  top: number;
  left: number;
}

export function SchoolLogoCell({ schoolName, logoUrl, onClick }: SchoolLogoCellProps) {
  const [preview, setPreview] = useState<PreviewPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!preview) {
      return;
    }

    function closePreview() {
      setPreview(null);
    }

    window.addEventListener('scroll', closePreview, true);
    window.addEventListener('resize', closePreview);

    return () => {
      window.removeEventListener('scroll', closePreview, true);
      window.removeEventListener('resize', closePreview);
    };
  }, [preview]);

  function showPreview() {
    if (!logoUrl || !triggerRef.current) {
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const fitsRight = rect.right + PREVIEW_GAP + PREVIEW_SIZE < window.innerWidth;
    const left = fitsRight ? rect.right + PREVIEW_GAP : rect.left - PREVIEW_GAP - PREVIEW_SIZE;
    const rawTop = rect.top + rect.height / 2 - PREVIEW_SIZE / 2;
    const top = Math.max(8, Math.min(rawTop, window.innerHeight - PREVIEW_SIZE - 8));

    setPreview({ top, left });
  }

  function hidePreview() {
    setPreview(null);
  }

  const label = logoUrl ? `View or change logo for ${schoolName}` : `Upload logo for ${schoolName}`;

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={onClick}
        onMouseEnter={showPreview}
        onMouseLeave={hidePreview}
        onFocus={showPreview}
        onBlur={hidePreview}
        title={label}
        aria-label={label}
        className="relative block h-10 w-10 rounded-DEFAULT ring-1 ring-outline-variant/70 transition hover:ring-2 hover:ring-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`${schoolName} logo`}
            className="h-10 w-10 rounded-DEFAULT bg-white object-contain p-0.5"
          />
        ) : (
          <div className={`flex h-10 w-10 items-center justify-center rounded-DEFAULT ${DEFAULT_ICON_TONE}`}>
            <Building2 size={18} aria-hidden="true" strokeWidth={2} />
          </div>
        )}
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white ring-2 ring-white">
          <Pencil size={9} aria-hidden="true" strokeWidth={2.5} />
        </span>
      </button>

      {preview && logoUrl &&
        createPortal(
          <div
            className="pointer-events-none fixed z-50 rounded-DEFAULT border border-outline-variant bg-white p-2 shadow-lg"
            style={{ top: preview.top, left: preview.left, width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
          >
            <img
              src={logoUrl}
              alt={`${schoolName} logo enlarged`}
              className="h-full w-full object-contain"
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
