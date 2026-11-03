import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, X } from 'lucide-react';
import { ToastContext, type ToastVariant } from './toastContextInstance';
import { useAppReducedMotion } from '../hooks/useAppReducedMotion';
import { DURATION_FAST, EASING_DECELERATE, toastVariants } from '../lib/motion';

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const prefersReducedMotion = useAppReducedMotion();
  const variants = toastVariants(prefersReducedMotion);

  function dismiss(id: number) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  function showToast(message: string, variant: ToastVariant = 'success') {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message, variant }]);
    setTimeout(() => dismiss(id), 4000);
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-100 flex w-full max-w-sm flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: DURATION_FAST, ease: EASING_DECELERATE }}
              className={`flex items-center gap-2 rounded-DEFAULT border px-4 py-3 text-body-md shadow-lg ${
                toast.variant === 'success'
                  ? 'border-success-container bg-success-container text-on-success-container'
                  : 'border-error-container bg-error-container text-on-error-container'
              }`}
            >
              {toast.variant === 'success' ? (
                <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
              )}
              <span className="flex-1">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="shrink-0 rounded-DEFAULT p-1 hover:bg-black/5"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
