<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    private const AUTH_LOGIN_MAX_ATTEMPTS = 5;

    private const AUTH_REGISTER_MAX_ATTEMPTS = 20;

    private const AUTH_SENSITIVE_MAX_ATTEMPTS = 5;

    private const REPORTS_GENERATE_MAX_ATTEMPTS = 10;

    private const EXPORT_MAX_ATTEMPTS = 5;

    private const SEARCH_MAX_ATTEMPTS = 60;

    public function register(): void {}

    public function boot(): void
    {
        RateLimiter::for('auth-login', function (Request $request): Limit {
            return Limit::perMinute(self::AUTH_LOGIN_MAX_ATTEMPTS)
                ->by($this->loginKey($request));
        });

        RateLimiter::for('auth-register', function (Request $request): Limit {
            return Limit::perHour(self::AUTH_REGISTER_MAX_ATTEMPTS)
                ->by('ip:'.($request->ip() ?? 'unknown'));
        });

        RateLimiter::for('auth-sensitive', function (Request $request): array {
            $limits = [
                Limit::perHour(self::AUTH_SENSITIVE_MAX_ATTEMPTS)
                    ->by('ip:'.($request->ip() ?? 'unknown')),
            ];

            if ($request->is('api/auth/forgot')) {
                $limits[] = Limit::perHour(self::AUTH_SENSITIVE_MAX_ATTEMPTS)
                    ->by('email:'.strtolower(trim((string) $request->input('email'))));
            }

            return $limits;
        });

        RateLimiter::for('reports-generate', function (Request $request): Limit {
            return Limit::perMinute(self::REPORTS_GENERATE_MAX_ATTEMPTS)
                ->by($this->userOrIpKey($request));
        });

        RateLimiter::for('exports', function (Request $request): Limit {
            return Limit::perMinute(self::EXPORT_MAX_ATTEMPTS)
                ->by($this->userOrIpKey($request));
        });

        RateLimiter::for('search', function (Request $request): Limit {
            return Limit::perMinute(self::SEARCH_MAX_ATTEMPTS)
                ->by($this->userOrIpKey($request));
        });
    }

    private function loginKey(Request $request): string
    {
        $login = strtolower(trim((string) $request->input('login')));
        $ipAddress = $request->ip() ?? 'unknown';

        return "login:{$login}|ip:{$ipAddress}";
    }

    private function userOrIpKey(Request $request): string
    {
        $userId = $request->user()?->getAuthIdentifier();

        if ($userId !== null) {
            return 'user:'.$userId;
        }

        return 'ip:'.($request->ip() ?? 'unknown');
    }
}
