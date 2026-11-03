<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use App\Notifications\AccountActivityNotification;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\TransientToken;

class UserPasswordService
{
    public function __construct(
        private readonly NotificationDispatchService $notifications = new NotificationDispatchService(new ExpoPushService),
    ) {}

    public function change(User $user, string $newPassword, ?string $currentPassword = null): void
    {
        $currentSessionId = $this->currentWebSessionIdFor($user);

        if ($currentPassword !== null && $currentSessionId !== null) {
            Auth::guard('web')->logoutOtherDevices($currentPassword);
        }

        $user->update([
            'password' => $newPassword,
        ]);

        // Keep both: guard invalidation covers non-database sessions, while the DB delete and hash refresh cover reset flows and preserve the current cookie session.
        $this->invalidateOtherWebSessions($user, $currentSessionId);
        $this->refreshCurrentSessionPasswordHash($user, $currentSessionId);

        $user->rememberedDevices()->delete();

        $currentToken = $user->currentAccessToken();
        $user->tokens()
            ->when($currentToken && ! $currentToken instanceof TransientToken, fn ($q) => $q->where('id', '!=', $currentToken->id))
            ->delete();

        $this->notifications->notify(
            $user,
            'account_activity',
            new AccountActivityNotification('Your password was changed', 'Your account password was just changed.'),
            'Password changed',
            'Your account password was just changed.',
        );
    }

    private function currentWebSessionIdFor(User $user): ?string
    {
        if (! request()->hasSession()) {
            return null;
        }

        $webUserId = Auth::guard('web')->id();

        if ((string) $webUserId !== (string) $user->getAuthIdentifier()) {
            return null;
        }

        $sessionId = request()->session()->getId();

        return is_string($sessionId) && $sessionId !== '' ? $sessionId : null;
    }

    private function invalidateOtherWebSessions(User $user, ?string $currentSessionId): void
    {
        if (config('session.driver') !== 'database') {
            return;
        }

        DB::table('sessions')
            ->where('user_id', $user->getAuthIdentifier())
            ->when($currentSessionId !== null, fn ($query) => $query->where('id', '!=', $currentSessionId))
            ->delete();
    }

    private function refreshCurrentSessionPasswordHash(User $user, ?string $currentSessionId): void
    {
        if ($currentSessionId === null || ! request()->hasSession()) {
            return;
        }

        $guard = Auth::guard('web');
        $guard->setUser($user);
        $passwordHash = $guard->hashPasswordForCookie($user->getAuthPassword());

        request()->session()->put('password_hash_web', $passwordHash);
    }
}
