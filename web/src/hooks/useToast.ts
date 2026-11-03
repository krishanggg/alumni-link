import { useContext } from 'react';
import { ToastContext, type ToastState } from '../contexts/toastContextInstance';

export function useToast(): ToastState {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}
