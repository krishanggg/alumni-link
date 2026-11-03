export interface PasswordRule {
  /** Short form, for requirement checklists. */
  label: string;
  /** Sentence form, for validation errors. */
  message: string;
  test: (password: string) => boolean;
}

export type PasswordStrengthTier = 'Weak' | 'Fair' | 'Strong';

export interface PasswordStrength {
  met: number;
  total: number;
  ratio: number;
  tier: PasswordStrengthTier;
}

// Mirrors the single backend rule shared by StoreRegistrationRequest, NewPasswordRequest,
// StoreUserRequest and ChangePasswordRequest:
//
//   Password::min(8)->letters()->mixedCase()->numbers()->symbols()
//
// mixedCase() requires both cases, so lowercase is listed as its own rule — an
// all-uppercase password would otherwise look valid on screen and still fail server-side.
//
// Laravel's symbols() accepts any Unicode punctuation or symbol, so this list is
// deliberately narrower than the server: naming a concrete set is more useful as a hint,
// and being stricter than the backend can only ever reject early, never surprise on submit.
export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    label: 'At least 8 characters',
    message: 'Password must be at least 8 characters.',
    test: (password) => password.length >= 8,
  },
  {
    label: 'At least 1 lowercase letter',
    message: 'Password must contain at least 1 lowercase letter.',
    test: (password) => /[a-z]/.test(password),
  },
  {
    label: 'At least 1 uppercase letter',
    message: 'Password must contain at least 1 uppercase letter.',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    label: 'At least 1 number',
    message: 'Password must contain at least 1 number.',
    test: (password) => /[0-9]/.test(password),
  },
  {
    label: 'At least 1 special character (!@#$%^&*)',
    message: 'Password must contain at least 1 special character (!@#$%^&*).',
    test: (password) => /[!@#$%^&*]/.test(password),
  },
];

export function unmetPasswordRules(password: string): PasswordRule[] {
  return PASSWORD_RULES.filter((rule) => !rule.test(password));
}

/**
 * A random password that always satisfies every PASSWORD_RULE — one of each
 * required class up front, the rest filled from the full pool, then shuffled.
 */
export function generatePassword(length = 16): string {
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const digits = '23456789';
  const symbols = '!@#$%^&*';
  const all = lower + upper + digits + symbols;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];

  const required = [pick(lower), pick(upper), pick(digits), pick(symbols)];
  const rest = Array.from({ length: Math.max(length, 8) - required.length }, () => pick(all));

  return [...required, ...rest]
    .map((char) => ({ char, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map((entry) => entry.char)
    .join('');
}

export function isPasswordValid(password: string): boolean {
  return unmetPasswordRules(password).length === 0;
}

export function passwordStrength(password: string): PasswordStrength {
  const total = PASSWORD_RULES.length;

  if (password.length === 0) {
    return { met: 0, total, ratio: 0, tier: 'Weak' };
  }

  const met = total - unmetPasswordRules(password).length;
  const ratio = met / total;

  if (ratio === 1) {
    return { met, total, ratio, tier: 'Strong' };
  }

  if (ratio >= 0.5) {
    return { met, total, ratio, tier: 'Fair' };
  }

  return { met, total, ratio, tier: 'Weak' };
}
