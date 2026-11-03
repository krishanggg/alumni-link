import type { PasswordStrengthTier } from '../../utils/passwordRules';

import { passwordStrength } from '../../utils/passwordRules';

interface PasswordStrengthIndicatorProps {
  password: string;
}

const BAR_CLASSES: Record<PasswordStrengthTier, string> = {
  Weak: 'bg-error',
  Fair: 'bg-chart-amber',
  Strong: 'bg-chart-green',
};

const TEXT_CLASSES: Record<PasswordStrengthTier, string> = {
  Weak: 'text-error',
  Fair: 'text-on-warning-container',
  Strong: 'text-on-success-container',
};

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { met, total, tier } = passwordStrength(password);

  return (
    <div className="mt-2">
      <div className="flex gap-1.5">
        {Array.from({ length: total }, (_, index) => (
          <div
            key={index}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${index < met ? BAR_CLASSES[tier] : 'bg-surface-container-high'}`}
          />
        ))}
      </div>
      {password.length > 0 && (
        <p className={`mt-1.5 text-label-sm font-label-sm ${TEXT_CLASSES[tier]}`}>
          Password strength: {tier}
        </p>
      )}
    </div>
  );
}
