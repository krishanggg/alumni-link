import type { MotionProps } from 'framer-motion';

import { TRANSITION_INSTANT } from '../lib/motion';
import { useAppReducedMotion } from './useAppReducedMotion';

export function usePressTap(): Pick<MotionProps, 'whileTap' | 'transition'> {
  const prefersReducedMotion = useAppReducedMotion();

  if (prefersReducedMotion) {
    return {};
  }

  return { whileTap: { scale: 0.97 }, transition: TRANSITION_INSTANT };
}
