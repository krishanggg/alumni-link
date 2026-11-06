<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Throwable;

class NotificationDispatchService
{
    private const CATEGORY_TAB = [
        'account_activity' => 'account',
        'alumni_record_updates' => 'account',
        'system_announcements' => 'announcement',
        'report_completion' => 'report',
        'feedback' => 'feedback',
    ];

    public function __construct(
        private readonly ExpoPushService $pushService
    ) {}

    /**
     * Dispatches notifications according to the recipient's preferences.
     *
     * When a category is disabled, neither its Laravel notification
     * nor its push notification is sent.
     *
     * Push delivery is independent of Laravel notification delivery.
     */
    public function notify(
        User $user,
        string $category,
        Notification $mailNotification,
        ?string $pushTitle = null,
        ?string $pushBody = null,
    ): void {
        // Respect the recipient's saved notification preference.
        if (! NotificationPreference::allows($user, $category)) {
            return;
        }

        // Send push independently of mail/database notification delivery.
        if ($pushTitle !== null) {
            $pushData = isset(self::CATEGORY_TAB[$category])
                ? ['type' => self::CATEGORY_TAB[$category]]
                : [];

            try {
                $this->pushService->sendToUser(
                    $user,
                    $pushTitle,
                    $pushBody ?? '',
                    $pushData
                );
            } catch (Throwable $exception) {
                Log::warning('Push notification dispatch failed.', [
                    'category' => $category,
                    'user_id' => $user->id,
                    'exception' => $exception::class,
                ]);
            }
        }

        // A failure here must not prevent push delivery.
        try {
            $user->notify($mailNotification);
        } catch (Throwable $exception) {
            Log::warning('Laravel notification dispatch failed.', [
                'category' => $category,
                'user_id' => $user->id,
                'exception' => $exception::class,
            ]);
        }
    }
}