<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class PasswordResetTokenService
{
    public function issue(string $email): string
    {
        $token = Str::random(64);

        DB::table('password_resets')->where('email', $email)->delete();
        DB::table('password_resets')->insert([
            'email' => $email,
            'token' => Hash::make($token),
            'created_at' => now(),
        ]);

        return $token;
    }

    public function buildResetUrl(string $email, string $token): string
    {
        // A dedicated SPA origin is only needed in local dev, where the app
        // runs on a different port than the API. In production the SPA is
        // served from the same origin as the API, so APP_URL is correct.
        $frontendUrl = rtrim((string) (config('app.frontend_url') ?: config('app.url')), '/');

        return "{$frontendUrl}/reset-password?".http_build_query(['token' => $token, 'email' => $email]);
    }
}
