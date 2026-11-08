<?php

declare(strict_types=1);

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\DB;

/**
 * Rejects an email address that is already used in the given table.
 * Compares complete addresses case-insensitively to match the database's
 * typical email uniqueness behavior while allowing the same local part at
 * different domains (for example, alex@gmail.com and alex@yahoo.com).
 */
class UniqueEmailAddress implements ValidationRule
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

        $email = strtolower(trim($value));

        $query = DB::table($this->table)->whereNotNull($this->column);

        if ($this->ignoreId !== null) {
            $query->where($this->idColumn, '!=', $this->ignoreId);
        }

        if ($this->schoolId !== null) {
            $query->where('school_id', $this->schoolId);
        }

        $conflict = $query->pluck($this->column)->contains(
            fn (mixed $existingEmail): bool => is_string($existingEmail)
                && strtolower(trim($existingEmail)) === $email
        );

        if ($conflict) {
            $fail('This email address is already registered.');
        }
    }
}
