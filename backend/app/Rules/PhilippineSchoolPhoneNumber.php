<?php

declare(strict_types=1);

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/** Accepts Philippine mobile numbers and common area-code landline formats. */
class PhilippineSchoolPhoneNumber implements ValidationRule
{
    private const PATTERN = '/^(09\d{9}|\+639\d{9}|\(0\d{2,3}\) ?\d{3,4}-?\d{4}|0\d{2,3}[ -]?\d{3,4}[ -]?\d{4})$/';

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! preg_match(self::PATTERN, $value)) {
            $fail('The :attribute must be a valid Philippine mobile or landline number, e.g. 09171234567 or (086) 826-1234.');
        }
    }
}
