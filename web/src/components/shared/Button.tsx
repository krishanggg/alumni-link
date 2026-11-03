import { motion } from 'framer-motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { Spinner } from './Spinner';
import { usePressTap } from '../../hooks/usePressTap';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'danger-solid' | 'ghost';
type ButtonSize = 'sm' | 'md';

// framer-motion's HTMLMotionProps redefines these event handlers with
// animation-specific signatures that conflict with React's native DOM types.
type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration' | 'onDrag' | 'onDragEnd' | 'onDragStart' | 'onDragEnter' | 'onDragExit' | 'onDragLeave' | 'onDragOver' | 'onDrop'
>;

interface ButtonProps extends NativeButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
  loadingText?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-primary shadow-pop transition-all hover:-translate-y-px hover:bg-accent-hover hover:shadow-md disabled:translate-y-0 disabled:bg-outline-variant disabled:text-on-surface-variant disabled:shadow-none',
  secondary: 'border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-50',
  danger: 'border border-error text-error transition-colors hover:bg-error-container disabled:opacity-50',
  'danger-solid': 'bg-error text-on-error shadow-pop transition-all hover:-translate-y-px hover:bg-error/90 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none',
  ghost: 'text-accent transition-colors hover:bg-accent/10 hover:text-accent-hover disabled:opacity-50',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'gap-1.5 px-3 py-1.5 text-label-sm',
  md: 'gap-2 px-4 py-2 text-body-md',
};

const SPINNER_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
};

const ICON_SIZE: Record<ButtonSize, number> = { sm: 14, md: 16 };

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  isLoading = false,
  loadingText,
  disabled,
  type = 'button',
  className,
  children,
  ...buttonProps
}: ButtonProps) {
  const pressTap = usePressTap();
  const isDisabled = disabled || isLoading;

  return (
    <motion.button
      type={type}
      disabled={isDisabled}
      {...pressTap}
      className={`inline-flex items-center justify-center rounded-DEFAULT font-label-md disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className ?? ''}`}
      {...buttonProps}
    >
      {isLoading ? (
        <>
          <Spinner className={SPINNER_SIZE_CLASSES[size]} />
          {loadingText ?? children}
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon size={ICON_SIZE[size]} aria-hidden="true" />}
          {children}
          {Icon && iconPosition === 'right' && <Icon size={ICON_SIZE[size]} aria-hidden="true" />}
        </>
      )}
    </motion.button>
  );
}
