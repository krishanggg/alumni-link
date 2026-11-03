const PH_PHONE_REGEX = /^(09\d{9}|\+639\d{9})$/;
const PH_SCHOOL_PHONE_REGEX = /^(09\d{9}|\+639\d{9}|\(0\d{2,3}\) ?\d{3,4}-?\d{4}|0\d{2,3}[ -]?\d{3,4}[ -]?\d{4})$/;

const PHONE_VALIDATION_MESSAGE = 'Must be a valid Philippine mobile number, e.g. 09171234567 or +639171234567.';
const SCHOOL_PHONE_VALIDATION_MESSAGE = 'Must be a valid Philippine mobile or landline number, e.g. 09171234567 or (086) 826-1234.';

export function validatePhilippinePhoneNumber(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return PH_PHONE_REGEX.test(value) ? undefined : PHONE_VALIDATION_MESSAGE;
}

export function validatePhilippineSchoolPhoneNumber(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return PH_SCHOOL_PHONE_REGEX.test(value) ? undefined : SCHOOL_PHONE_VALIDATION_MESSAGE;
}
