import { createContext } from 'react';

export type ToastVariant = 'success' | 'error';

export interface ToastState {
  showToast: (message: string, variant?: ToastVariant) => void;
}

export const ToastContext = createContext<ToastState | undefined>(undefined);
