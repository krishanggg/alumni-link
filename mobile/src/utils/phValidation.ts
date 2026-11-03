const PH_PHONE_REGEX = /^(09\d{9}|\+639\d{9})$/;

const PHONE_VALIDATION_MESSAGE = 'Must be a valid Philippine mobile number, e.g. 09171234567 or +639171234567.';

export function validatePhilippinePhoneNumber(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return PH_PHONE_REGEX.test(value) ? undefined : PHONE_VALIDATION_MESSAGE;
}
