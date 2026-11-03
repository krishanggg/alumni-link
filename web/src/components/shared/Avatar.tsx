import { getInitials } from '../../utils/initials';

interface AvatarProps {
  name?: string | null;
  photoUrl?: string | null;
  sizeClassName?: string;
  toneClassName?: string;
  textClassName?: string;
  ringClassName?: string;
  alt?: string;
  ariaLabel?: string;
  className?: string;
}

/**
 * Photo-or-initials identity circle. Size and color are left to the caller
 * (sidebar avatars, directory rows, and search-picker results each carry a
 * different scale/tone) — this only unifies the img-vs-initials-fallback
 * structure and accessibility handling that every call site duplicated.
 */
export function Avatar({
  name,
  photoUrl,
  sizeClassName = 'h-10 w-10',
  toneClassName = 'bg-surface-container text-on-surface-variant',
  textClassName = 'text-label-md font-label-md',
  ringClassName = '',
  alt = '',
  ariaLabel,
  className = '',
}: AvatarProps) {
  const shared = `shrink-0 rounded-full ${sizeClassName} ${ringClassName} ${className}`.trim();

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={ariaLabel ? undefined : alt}
        aria-label={ariaLabel}
        role={ariaLabel ? 'img' : undefined}
        loading="lazy"
        className={`${shared} object-cover`}
      />
    );
  }

  return (
    <div
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      className={`flex items-center justify-center ${shared} ${toneClassName}`}
    >
      <span className={textClassName}>{getInitials(name)}</span>
    </div>
  );
}
