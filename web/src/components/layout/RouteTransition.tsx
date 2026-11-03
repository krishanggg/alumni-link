import { type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppReducedMotion } from '../../hooks/useAppReducedMotion';
import { reducedVariants } from '../../lib/motion';

interface RouteTransitionProps {
  children: ReactNode;
}

export function RouteTransition({ children }: RouteTransitionProps) {
  const location = useLocation();
  const prefersReducedMotion = useAppReducedMotion();
  const variants = reducedVariants.route(prefersReducedMotion);

  return (
    <div style={{ position: 'relative' }} className="flex min-h-0 flex-1 flex-col">
      <AnimatePresence>
        <motion.div
          key={location.pathname}
          variants={variants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="flex min-h-0 flex-1 flex-col"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
