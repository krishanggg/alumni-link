<?php

declare(strict_types=1);

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Accepts Philippine mobile numbers in local format (09XXXXXXXXX, 11 digits)
 * or international format (+639XXXXXXXXX, 12 digits after the +).
 */
class PhilippinePhoneNumber implements ValidationRule
{
    private const PATTERN = '/^(09\d{9}|\+639\d{9})$/';

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! preg_match(self::PATTERN, $value)) {
            $fail('The :attribute must be a valid Philippine mobile number, e.g. 09171234567 or +639171234567.');
        }
    }
}
