<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Single fan-out point for the four notification-preference categories: it
 * checks the recipient's preference once, then dispatches mail and (when a
 * push title/body is given) an Expo push in the same call, so no send site
 * duplicates the preference check.
 */
class NotificationDispatchService
{
    /**
     * Which mobile tab a tapped push notification for each category should
     * open — kept here, not per send site, since it's a pure function of
     * the category that's already being passed in for the preference check.
     */
    private const CATEGORY_TAB = [
        'account_activity' => 'account',
        'alumni_record_updates' => 'account',
        'system_announcements' => 'announcement',
        'report_completion' => 'report',
        'feedback' => 'feedback',
    ];

    public function __construct(private readonly ExpoPushService $pushService) {}

    public function notify(
        User $user,
        string $category,
        Notification $mailNotification,
        ?string $pushTitle = null,
        ?string $pushBody = null,
    ): void {
        if (! NotificationPreference::allows($user, $category)) {
            return;
        }

        $user->notify($mailNotification);

        if ($pushTitle !== null) {
            $pushData = isset(self::CATEGORY_TAB[$category]) ? ['type' => self::CATEGORY_TAB[$category]] : [];

            try {
                $this->pushService->sendToUser($user, $pushTitle, $pushBody ?? '', $pushData);
            } catch (Throwable $exception) {
                // Push delivery is best-effort and must not roll back the persisted business action.
                Log::warning('Push notification dispatch failed.', [
                    'category' => $category,
                    'user_id' => $user->id,
                    'exception' => $exception::class,
                ]);
            }
        }
    }
}
