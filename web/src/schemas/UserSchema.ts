import { z } from 'zod';

import { unmetPasswordRules } from '../utils/passwordRules';

// Driven by PASSWORD_RULES so the checklists users read and the validation they hit
// can never describe different policies.
const userPasswordSchema = z.string().superRefine((value, ctx) => {
  for (const rule of unmetPasswordRules(value)) {
    ctx.addIssue({ code: 'custom', message: rule.message });
  }
});

const emailField = z.email('Must be a valid email address.').max(255, 'Email must be 255 characters or fewer.');
const usernameField = z
  .string()
  .trim()
  .min(1, 'Username is required.')
  .max(100, 'Username must be 100 characters or fewer.')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores.');
const schoolIdField = z.number().int().positive().optional();

function schoolAdminRefine(data: { role: string; school_id?: number }, ctx: z.RefinementCtx) {
  if (data.role === 'school_admin' && !data.school_id) {
    ctx.addIssue({ code: 'custom', path: ['school_id'], message: 'A School Admin must be assigned to one school.' });
  }

  if (data.role === 'super_admin' && data.school_id) {
    ctx.addIssue({ code: 'custom', path: ['school_id'], message: 'A Super Admin cannot be assigned to a school.' });
  }
}

// Creation only ever assigns school_admin or alumni; super_admin is granted via the dedicated transfer action.
export const UserCreateFormSchema = z
  .object({
    email: emailField,
    username: usernameField,
    role: z.enum(['alumni', 'school_admin']),
    school_id: schoolIdField,
    password: userPasswordSchema,
  })
  .superRefine(schoolAdminRefine);

// Editing allows the user's existing role to pass through unchanged (including super_admin),
// mirroring the backend's UpdateUserRequest, which only blocks *becoming* a super_admin here.
export const UserEditFormSchema = z
  .object({
    email: emailField,
    username: usernameField,
    role: z.enum(['alumni', 'school_admin', 'super_admin']),
    school_id: schoolIdField,
  })
  .superRefine(schoolAdminRefine);
