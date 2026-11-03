<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Profile\RegisterPushTokenRequest;
use App\Models\PushToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushTokenController extends Controller
{
    public function store(RegisterPushTokenRequest $request): JsonResponse
    {
        PushToken::firstOrCreate([
            'user_id' => $request->user()->id,
            'expo_push_token' => $request->validated('expo_push_token'),
        ]);

        return response()->json(['message' => 'Push token registered.'], 201);
    }

    public function destroy(Request $request): JsonResponse
    {
        $token = $request->input('expo_push_token');

        $request->user()->pushTokens()
            ->when($token, fn ($q) => $q->where('expo_push_token', $token))
            ->delete();

        return response()->json(['message' => 'Push token removed.']);
    }
}
