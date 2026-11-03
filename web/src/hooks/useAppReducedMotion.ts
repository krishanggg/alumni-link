import { useReducedMotion } from 'framer-motion';

export function useAppReducedMotion(): boolean | null {
  return useReducedMotion();
}
