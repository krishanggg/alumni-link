<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AccountStatus;
use App\Models\RememberedDevice;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Issues, verifies and rotates "Remember Me" tokens (spec 01, FR-02).
 *
 * The cookie carries `{device_id}|{plaintext_token}`; only a hash of the token
 * is persisted, so a database leak alone does not yield a usable cookie. Each
 * successful auto-login rotates the token, which bounds how long a copied
 * cookie stays useful to the interval between the owner's own visits rather
 * than the full 30-day lifetime.
 */
class RememberedDeviceService
{
    public const COOKIE_NAME = 'remember_token';

    /** Absolute lifetime, measured from issue and never extended by rotation. */
    public const LIFETIME_DAYS = 30;

    /**
     * A returning visit fires several API requests in parallel, none of which
     * holds a session yet, all carrying the same cookie. The first to arrive
     * rotates the token and the rest are left presenting what is now the
     * previous one. Honouring the previous hash for a short window keeps those
     * in-flight siblings working; it is deliberately short, since it is also
     * the window in which a copied cookie remains replayable.
     */
    public const ROTATION_GRACE_SECONDS = 60;

    public function issue(User $user, Request $request): void
    {
        $plainToken = Str::random(60);
        $userAgent = $request->userAgent() ?? 'Unknown';

        $device = RememberedDevice::create([
            'user_id' => $user->id,
            'token_hash' => Hash::make($plainToken),
            'device_name' => $this->deviceLabelFromUserAgent($userAgent),
            'ip_address' => $request->ip(),
            'user_agent' => $userAgent,
            'last_used_at' => now(),
            'created_at' => now(),
            'expires_at' => now()->addDays(self::LIFETIME_DAYS),
        ]);

        $this->queueCookie($device, $plainToken);
    }

    /**
     * Resolve a remember-me cookie to the user it authenticates, rotating the
     * token on success. Returns null when the cookie is absent, malformed,
     * expired, revoked, or belongs to an account that may no longer sign in.
     */
    public function authenticateFromCookie(?string $cookie): ?User
    {
        $parsed = $this->parseCookie($cookie);

        if ($parsed === null) {
            return null;
        }

        [$deviceId, $token] = $parsed;

        // Serialised so that a burst of parallel requests cannot each rotate the
        // token: the first wins, the rest fall through to the grace path below.
        return DB::transaction(function () use ($deviceId, $token): ?User {
            $device = RememberedDevice::whereKey($deviceId)->lockForUpdate()->first();

            if ($device === null) {
                return null;
            }

            if ($device->hasExpired()) {
                $device->delete();
                $this->forgetCookie();

                return null;
            }

            $user = $device->user;

            if ($user === null
                || ! $user->is_active
                || $user->account_status !== AccountStatus::Approved
            ) {
                return null;
            }

            if (Hash::check($token, $device->token_hash)) {
                $this->rotate($device);

                return $user;
            }

            if ($this->matchesRecentlyRotatedToken($device, $token)) {
                $device->update(['last_used_at' => now()]);

                return $user;
            }

            // The row exists and has not expired, but the token matches neither
            // the current nor the just-rotated hash. Holding a valid device id
            // means holding a cookie that was issued for it, so the likeliest
            // explanation is a copy being replayed after the real owner already
            // rotated. Drop the row: that invalidates the copy and the original
            // together and forces a fresh password login.
            Log::warning('Remember-me token rejected for a known device; revoking it.', [
                'device_id' => $device->id,
                'user_id' => $device->user_id,
            ]);

            $device->delete();
            $this->forgetCookie();

            return null;
        });
    }

    /**
     * Forget only the device logging out; other remembered devices survive.
     */
    public function revokeFromCookie(User $user, ?string $cookie): void
    {
        $parsed = $this->parseCookie($cookie);

        if ($parsed !== null) {
            $user->rememberedDevices()->whereKey($parsed[0])->delete();
        }

        $this->forgetCookie();
    }

    /**
     * Drop rows whose absolute lifetime has run out. Nothing can authenticate
     * with them once expired, so this is housekeeping: it stops the table
     * growing without bound and limits how long IP/User-Agent data is kept.
     */
    public function purgeExpired(): int
    {
        return RememberedDevice::where('expires_at', '<', now())->delete();
    }

    private function rotate(RememberedDevice $device): void
    {
        $plainToken = Str::random(60);

        $device->update([
            'previous_token_hash' => $device->token_hash,
            'token_hash' => Hash::make($plainToken),
            'rotated_at' => now(),
            'last_used_at' => now(),
        ]);

        $this->queueCookie($device, $plainToken);
    }

    private function matchesRecentlyRotatedToken(RememberedDevice $device, string $token): bool
    {
        if ($device->previous_token_hash === null || $device->rotated_at === null) {
            return false;
        }

        if ($device->rotated_at->lt(now()->subSeconds(self::ROTATION_GRACE_SECONDS))) {
            return false;
        }

        return Hash::check($token, $device->previous_token_hash);
    }

    /**
     * @return array{0: int, 1: string}|null
     */
    private function parseCookie(?string $cookie): ?array
    {
        if ($cookie === null || ! str_contains($cookie, '|')) {
            return null;
        }

        [$deviceId, $token] = explode('|', $cookie, 2);

        if (! ctype_digit($deviceId) || $token === '') {
            return null;
        }

        return [(int) $deviceId, $token];
    }

    private function queueCookie(RememberedDevice $device, string $plainToken): void
    {
        // Rotation must not extend the absolute lifetime, so the replacement
        // cookie only ever lasts as long as the row has left to live.
        $minutes = max(1, (int) ceil(now()->diffInMinutes($device->expires_at, false)));

        Cookie::queue(Cookie::make(
            self::COOKIE_NAME,
            $device->id.'|'.$plainToken,
            $minutes,
            null,
            null,
            true,
            true,
            true,
            'Strict'
        ));
    }

    private function forgetCookie(): void
    {
        Cookie::queue(Cookie::forget(self::COOKIE_NAME));
    }

    /**
     * Derive a short human-readable label from a User-Agent string. Display
     * only — it is client-supplied and must never be treated as identifying.
     */
    private function deviceLabelFromUserAgent(string $userAgent): string
    {
        $os = 'Unknown OS';
        $browser = 'Unknown Browser';

        if (str_contains($userAgent, 'Windows NT')) {
            $os = 'Windows';
        } elseif (str_contains($userAgent, 'Mac OS X') || str_contains($userAgent, 'Macintosh')) {
            $os = 'macOS';
        } elseif (str_contains($userAgent, 'Linux') || str_contains($userAgent, 'Android')) {
            $os = 'Linux';
        } elseif (str_contains($userAgent, 'iPhone') || str_contains($userAgent, 'iPad')) {
            $os = 'iOS';
        }

        if (str_contains($userAgent, 'Firefox')) {
            $browser = 'Firefox';
        } elseif (str_contains($userAgent, 'Edg')) {
            $browser = 'Edge';
        } elseif (str_contains($userAgent, 'Chrome')) {
            $browser = 'Chrome';
        } elseif (str_contains($userAgent, 'Safari')) {
            $browser = 'Safari';
        } elseif (str_contains($userAgent, 'Expo') || str_contains($userAgent, 'okhttp')) {
            $browser = 'Mobile App';
        }

        return "{$browser} on {$os}";
    }
}
