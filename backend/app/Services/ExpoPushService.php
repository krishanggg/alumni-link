<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\PushToken;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Sends push notifications through Expo's unified push API — no Firebase
 * Admin SDK or platform-specific client, just an HTTP POST. Android and iOS
 * credentials (FCM / APNs) are uploaded to EAS as a one-time build-config
 * step; this service never talks to either platform directly.
 */
class ExpoPushService
{
    private const ENDPOINT = 'https://exp.host/--/api/v2/push/send';

    public function sendToUser(User $user, string $title, string $body, array $data = []): void
    {
        // Ordered explicitly: Expo's response array lines up with the request
        // array positionally, so the pairing below depends on a stable order.
        $tokens = PushToken::where('user_id', $user->id)->orderBy('id')->pluck('expo_push_token', 'id');

        if ($tokens->isEmpty()) {
            return;
        }

        $this->send($tokens, $title, $body, $data);
    }

    /**
     * @param  Collection<int, string>  $tokens  expo_push_token keyed by push_tokens.id
     */
    private function send(Collection $tokens, string $title, string $body, array $data): void
    {
        $messages = $tokens->values()->map(fn (string $token) => [
            'to' => $token,
            'title' => $title,
            'body' => $body,
            'data' => $data,
            // Without this, Android delivers at "normal" FCM priority, which
            // gets deferred while the device is idle/Doze-restricted — the
            // message can sit for minutes to hours before the OS wakes the
            // app to show it. "high" bypasses that and delivers immediately
            // regardless of device idle state, matching what a push
            // notification is for.
            'priority' => 'high',
        ])->all();

        $response = Http::post(self::ENDPOINT, $messages);

        if (! $response->successful()) {
            Log::warning('Expo push send failed.', ['status' => $response->status()]);

            return;
        }

        $this->pruneInvalidTokens($tokens, $response->json('data', []));
    }

    /**
     * Expo returns one result per message, in the same order the messages
     * were sent, with a per-token error code (e.g. `DeviceNotRegistered`)
     * when delivery permanently fails — those tokens are dead and are
     * removed so future sends don't keep retrying them.
     *
     * @param  Collection<int, string>  $tokens
     * @param  array<int, array<string, mixed>>  $results
     */
    private function pruneInvalidTokens(Collection $tokens, array $results): void
    {
        $ids = $tokens->keys()->values();

        foreach ($results as $index => $result) {
            $errorCode = $result['details']['error'] ?? null;

            if (($result['status'] ?? null) !== 'error' || $errorCode !== 'DeviceNotRegistered') {
                continue;
            }

            if (isset($ids[$index])) {
                PushToken::whereKey($ids[$index])->delete();
            }
        }
    }
}
