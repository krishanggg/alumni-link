<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Services\RememberedDeviceService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckRememberToken
{
    public function __construct(
        private readonly RememberedDeviceService $devices,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        // Named explicitly rather than relying on the default guard: Remember Me
        // is session auth for the web SPA, and `auth:sanctum` calls
        // Auth::shouldUse('sanctum'), which repoints the default at a token
        // guard that has no login() at all.
        $guard = Auth::guard('web');

        if (! $guard->check()) {
            $cookie = $request->cookie(RememberedDeviceService::COOKIE_NAME);

            $user = $this->devices->authenticateFromCookie(
                is_string($cookie) ? $cookie : null,
            );

            if ($user !== null) {
                $guard->login($user);
            }
        }

        return $next($request);
    }
}
