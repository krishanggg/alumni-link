import type { Transition, Variants } from 'framer-motion';

const DURATION_INSTANT = 0.1;
export const DURATION_FAST = 0.15;
export const DURATION_BASE = 0.22;
const STAGGER_INCREMENT = 0.035;
export const STAGGER_CAP_MS = 200;

export const EASING_DECELERATE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const EASING_HOVER = 'easeOut';

export const TRANSITION_INSTANT: Transition = {
  duration: DURATION_INSTANT,
  ease: EASING_HOVER,
};

export const reducedVariants = {
  route: (prefersReducedMotion: boolean | null): Variants => {
    if (prefersReducedMotion) {
      return {
        hidden: { opacity: 1 },
        visible: { opacity: 1 },
        exit: { opacity: 1 },
      };
    }

    return {
      hidden: { opacity: 0, y: 8 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: DURATION_BASE, ease: EASING_DECELERATE },
      },
      exit: {
        opacity: 0,
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: -1,
        transition: { duration: DURATION_FAST, ease: EASING_DECELERATE },
      },
    };
  },
  listItem: (prefersReducedMotion: boolean | null): Variants => {
    if (prefersReducedMotion) {
      return {
        hidden: { opacity: 1 },
        visible: { opacity: 1 },
      };
    }

    return {
      hidden: { opacity: 0, y: 12 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: DURATION_FAST, ease: EASING_DECELERATE },
      },
    };
  },
  staggerContainer: (prefersReducedMotion: boolean | null, itemCount: number): Variants => {
    if (prefersReducedMotion) {
      return {
        hidden: {},
        visible: { transition: { staggerChildren: 0 } },
      };
    }

    const totalStagger = Math.min(itemCount * STAGGER_INCREMENT, STAGGER_CAP_MS / 1000);

    return {
      hidden: {},
      visible: {
        transition: {
          staggerChildren: Math.max(totalStagger / Math.max(itemCount, 1), 0),
          delayChildren: 0,
        },
      },
    };
  },
};

export function toastVariants(prefersReducedMotion: boolean | null) {
  if (prefersReducedMotion) {
    return {
      initial: { opacity: 1, x: 0 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 1, x: 0 },
    };
  }

  return {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 50 },
  };
}
