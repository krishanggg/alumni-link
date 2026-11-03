import type { LucideIcon } from 'lucide-react';
import { type Tone, TONE_CLASSES } from '../../lib/toneClasses';

interface SectionHeaderProps {
  icon: LucideIcon;
  label: string;
  tone: Tone;
}

export function SectionHeader({ icon: Icon, label, tone }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${TONE_CLASSES[tone]}`}>
        <Icon size={14} aria-hidden="true" strokeWidth={2.25} />
      </div>
      <p className="text-overline font-overline uppercase text-on-surface-variant">{label}</p>
    </div>
  );
}
