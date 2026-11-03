import { z } from 'zod';

const PH_PHONE_REGEX = /^(09\d{9}|\+639\d{9})$/;

const PH_PHONE_MESSAGE = 'Must be a valid Philippine mobile number, e.g. 09171234567 or +639171234567.';

export const philippinePhoneNumber = z.string().regex(PH_PHONE_REGEX, PH_PHONE_MESSAGE);

// Allows the empty string so forms can validate the raw input value while the field is untouched.
export const optionalPhilippinePhoneNumber = z.union([z.literal(''), philippinePhoneNumber], PH_PHONE_MESSAGE);

// Date inputs produce local-calendar "YYYY-MM-DD" values, so "today" must be local too (not UTC).
export function localTodayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${now.getFullYear()}-${month}-${day}`;
}

export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  for (const [field, messages] of Object.entries(z.flattenError(error).fieldErrors)) {
    if (Array.isArray(messages) && messages.length > 0) {
      fieldErrors[field] = messages;
    }
  }

  return fieldErrors;
}
