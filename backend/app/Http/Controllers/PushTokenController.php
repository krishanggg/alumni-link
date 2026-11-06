<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Profile\RegisterPushTokenRequest;
use App\Models\PushToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PushTokenController extends Controller
{
    /**
     * Register a push token for the currently authenticated user.
     *
     * A physical app installation must not have its Expo push
     * token associated with multiple user accounts.
     */
    public function store(RegisterPushTokenRequest $request): JsonResponse
    {
        $userId = $request->user()->id;
        $token = $request->validated('expo_push_token');

        DB::transaction(function () use ($userId, $token): void {
            // Remove any previous account associations for this token.
            // Other devices' tokens are not affected.
            PushToken::where('expo_push_token', $token)->delete();

            // Associate this token with the current account only.
            PushToken::firstOrCreate([
                'user_id' => $userId,
                'expo_push_token' => $token,
            ]);
        });

        return response()->json([
            'message' => 'Push token registered.',
        ], 201);
    }

    /**
     * Remove only the current device's push token on logout.
     *
     * Other devices signed in to the same account must continue
     * receiving notifications.
     */
    public function destroy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'expo_push_token' => ['required', 'string'],
        ]);

        $request->user()
            ->pushTokens()
            ->where('expo_push_token', $validated['expo_push_token'])
            ->delete();

        return response()->json([
            'message' => 'Push token removed.',
        ]);
    }
}