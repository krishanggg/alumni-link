export interface PasswordRule {
  /** Short form, for requirement checklists. */
  label: string;
  /** Sentence form, for validation errors. */
  message: string;
  test: (password: string) => boolean;
}

// Must match the backend validation rule shared by StoreRegistrationRequest,
// NewPasswordRequest, StoreUserRequest and ChangePasswordRequest — keep in sync:
//
//   Password::min(8)->letters()->mixedCase()->numbers()->symbols()
//
// mixedCase() requires both cases; list lowercase separately or a password like
// "PASSWORD1!" passes every rule shown here and then fails server-side with a 422.
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
