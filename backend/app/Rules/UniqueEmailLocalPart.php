<?php

declare(strict_types=1);

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\DB;

/**
 * Rejects an email whose local part (before the @) matches an existing row's
 * local part in the given table, regardless of domain — e.g. once
 * jdoe@example.com exists, jdoe@another-domain.org is also rejected, but
 * jdoe2@example.com is allowed. Compares in PHP rather than via SQL LIKE so
 * behavior stays identical across the SQLite test driver and MySQL production
 * driver, and so local parts containing literal % or _ aren't mismatched by
 * LIKE wildcards.
 */
class UniqueEmailLocalPart implements ValidationRule
{
    public function __construct(
        private readonly string $table,
        private readonly string $column = 'email',
        private readonly int|string|null $ignoreId = null,
        private readonly string $idColumn = 'id',
        private readonly int|string|null $schoolId = null,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! str_contains($value, '@')) {
            return;
        }

        $localPart = strtolower(strstr($value, '@', true));

        $query = DB::table($this->table)->whereNotNull($this->column);

        if ($this->ignoreId !== null) {
            $query->where($this->idColumn, '!=', $this->ignoreId);
        }

        if ($this->schoolId !== null) {
            $query->where('school_id', $this->schoolId);
        }

        $conflict = $query->pluck($this->column)->contains(
            fn (mixed $email): bool => is_string($email)
                && str_contains($email, '@')
                && strtolower(strstr($email, '@', true)) === $localPart
        );

        if ($conflict) {
            $fail('This email prefix is already registered. Try a different one, e.g. add a number before the @.');
        }
    }
}
