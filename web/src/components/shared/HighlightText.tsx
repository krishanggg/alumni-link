interface HighlightTextProps {
  text: string;
  highlight: string | undefined;
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function HighlightText({ text, highlight }: HighlightTextProps) {
  if (!highlight || highlight.trim().length < 2) {
    return <>{text}</>;
  }

  const escaped = escapeRegex(highlight.trim());
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  if (parts.length === 1) {
    return <>{text}</>;
  }

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="rounded-sm bg-primary-fixed px-0.5 text-on-primary-fixed">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  );
}
