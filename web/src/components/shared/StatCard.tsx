import { useEffect, useMemo } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Info, type LucideIcon } from 'lucide-react';

import { Tooltip } from './Tooltip';

import { type Tone, TONE_CLASSES } from '../../lib/toneClasses';
import { useAppReducedMotion } from '../../hooks/useAppReducedMotion';
import { DURATION_BASE, EASING_DECELERATE } from '../../lib/motion';

interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  /** Short explanation shown in a tooltip beside the label. */
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
  /** 'flat' squares the corners and drops the hover lift to match flat table surfaces. */
  appearance?: 'default' | 'flat' | 'dashboard';
  /**
   * The value isn't known yet. Renders a placeholder bar in its place instead
   * of counting up from a stand-in zero, which would otherwise read as a real
   * figure while the request is still in flight.
   */
  isLoading?: boolean;
}

function parseNumericValue(value: string | number): { numeric: number; suffix: string } | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { numeric: value, suffix: '' };
  }

  if (typeof value === 'string') {
    const match = value.match(/^([\d,]+(\.[\d]+)?)(.*)$/);
    if (match) {
      const num = parseFloat(match[1].replace(/,/g, ''));
      if (Number.isFinite(num)) {
        return { numeric: num, suffix: match[3] };
      }
    }
  }

  return null;
}

function countUpTransform(latest: number, suffix: string): string {
  const rounded = Math.round(latest);

  return `${rounded.toLocaleString()}${suffix}`;
}

export function StatCard({ label, value, description, hint, icon: Icon, tone = 'blue', appearance = 'default', isLoading = false }: StatCardProps) {
  const isFlat = appearance === 'flat';
  const isDashboard = appearance === 'dashboard';
  const prefersReducedMotion = useAppReducedMotion();
  const parsed = useMemo(() => parseNumericValue(value), [value]);

  const motionValue = useMotionValue(0);
  const displayValue = useTransform(motionValue, (latest) => countUpTransform(latest, parsed?.suffix ?? ''));

  useEffect(() => {
    if (parsed === null || isLoading) {
      return;
    }

    if (prefersReducedMotion) {
      motionValue.jump(parsed.numeric);
      return;
    }

    const controls = animate(motionValue, parsed.numeric, {
      duration: DURATION_BASE,
      ease: EASING_DECELERATE,
    });

    return () => controls.stop();
  }, [parsed, prefersReducedMotion, motionValue, isLoading]);

  function renderValue() {
    if (isLoading) {
      return (
        // Zero-width space keeps the line box at its natural height, so the
        // real value drops in without shifting the card.
        <>
          <span className="inline-block h-[0.7em] w-16 animate-pulse rounded-full bg-surface-container align-middle" />
          <span className="sr-only">Loading</span>
          &#8203;
        </>
      );
    }

    if (parsed === null) {
      return value;
    }

    if (prefersReducedMotion) {
      return countUpTransform(parsed.numeric, parsed.suffix);
    }

    return <motion.span>{displayValue}</motion.span>;
  }

  return (
    <div
      className={`group flex items-center gap-4 border border-outline-variant/70 bg-white p-4 shadow-card transition-all duration-200 ${
        isDashboard ? 'min-h-40 rounded-DEFAULT border-t-4 border-t-primary-fixed-dim bg-white p-6 shadow-card-hover motion-reduce:transition-none' : isFlat ? 'rounded-sm' : 'rounded-lg hover:-translate-y-0.5 hover:shadow-card-hover'
      }`}
    >
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center ${isFlat || isDashboard ? 'rounded-md' : 'rounded-xl'} ${TONE_CLASSES[tone]} transition-transform duration-200 ${isFlat ? '' : 'group-hover:scale-105'} ${isDashboard ? 'motion-reduce:transition-none motion-reduce:group-hover:scale-100' : ''}`}>
        <Icon size={22} aria-hidden="true" strokeWidth={2.25} />
      </div>
      <div className={`min-w-0 ${isDashboard ? 'space-y-2' : ''}`}>
        <p className="flex items-center gap-1 text-label-md text-on-surface-variant">
          {label}
          {hint && (
            <Tooltip label={`${label}: ${hint}`} content={hint}>
              <Info size={13} aria-hidden="true" className="text-outline" />
            </Tooltip>
          )}
        </p>
        <p className="text-display-md font-display-md tabular-nums text-on-surface">
          {renderValue()}
        </p>
        {description && <p className="text-label-sm text-on-surface-variant">{description}</p>}
      </div>
    </div>
  );
}
