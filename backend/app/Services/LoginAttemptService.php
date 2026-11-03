<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\DB;

class LoginAttemptService
{
    private const IDENTIFIER_MAX_ATTEMPTS = 5;

    private const IDENTIFIER_WINDOW_MINUTES = 15;

    private const IP_MAX_ATTEMPTS = 20;

    private const IP_WINDOW_MINUTES = 1;

    public function isRateLimited(string $identifier, string $ipAddress): bool
    {
        $normalizedIdentifier = $this->normalizeIdentifier($identifier);

        $identifierAttempts = DB::table('login_attempts')
            ->where('email', $normalizedIdentifier)
            ->where('ip_address', $ipAddress)
            ->where('attempted_at', '>', now()->subMinutes(self::IDENTIFIER_WINDOW_MINUTES))
            ->count();

        if ($identifierAttempts >= self::IDENTIFIER_MAX_ATTEMPTS) {
            return true;
        }

        return DB::table('login_attempts')
            ->where('ip_address', $ipAddress)
            ->where('attempted_at', '>', now()->subMinutes(self::IP_WINDOW_MINUTES))
            ->count() >= self::IP_MAX_ATTEMPTS;
    }

    public function recordFailure(string $identifier, string $ipAddress): void
    {
        DB::table('login_attempts')->insert([
            'email' => $this->normalizeIdentifier($identifier),
            'ip_address' => $ipAddress,
            'attempted_at' => now(),
        ]);
    }

    public function clearIdentifier(string $identifier): void
    {
        DB::table('login_attempts')
            ->where('email', $this->normalizeIdentifier($identifier))
            ->delete();
    }

    private function normalizeIdentifier(string $identifier): string
    {
        return strtolower(trim($identifier));
    }
}
