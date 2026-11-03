<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\TransientToken;

/**
 * Session management is inherently user-scoped — every method in this controller
 * only operates on the authenticated user's own sessions and tokens. There is
 * no cross-user session access (admins cannot view or terminate other users'
 * sessions), so a Policy check adds no defense beyond the route middleware
 * (role.admin.or.alumni.approved) that already gates all three routes.
 *
 * Per PROJECT_MIGRATION_PLAN.md Phase 3, controllers scoped exclusively to
 * the authenticated user's own data may rely on middleware alone.
 */
class SessionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $sessions = [];

        if (config('session.driver') === 'database') {
            $dbSessions = DB::table('sessions')
                ->where('user_id', $user->id)
                ->orderBy('last_activity', 'desc')
                ->get();

            $currentSessionId = $request->session()->getId();

            foreach ($dbSessions as $session) {
                $sessions[] = [
                    'id' => $session->id,
                    'type' => 'web',
                    'ip_address' => $session->ip_address ?? 'Unknown',
                    'user_agent' => $session->user_agent ?? 'Unknown',
                    'last_activity' => Carbon::createFromTimestamp($session->last_activity)->toIso8601String(),
                    'is_current' => $session->id === $currentSessionId,
                ];
            }
        }

        $tokens = $user->tokens()->orderBy('last_used_at', 'desc')->get();
        $currentToken = $request->user()->currentAccessToken();
        $currentTokenId = $currentToken && ! $currentToken instanceof TransientToken
            ? $currentToken->id
            : null;

        foreach ($tokens as $token) {
            $sessions[] = [
                'id' => 'token_'.$token->id,
                'type' => 'mobile',
                'device_name' => $token->name ?? 'Unknown',
                'ip_address' => $token->ip_address ?? null,
                'user_agent' => $token->user_agent ?? null,
                'last_activity' => $token->last_used_at?->toIso8601String() ?? $token->created_at?->toIso8601String(),
                'is_current' => $token->id === $currentTokenId,
            ];
        }

        return response()->json(['sessions' => $sessions]);
    }

    public function destroyAll(Request $request): JsonResponse
    {
        $user = $request->user();

        if (config('session.driver') === 'database') {
            $currentSessionId = $request->session()->getId();

            DB::table('sessions')
                ->where('user_id', $user->id)
                ->where('id', '!=', $currentSessionId)
                ->delete();
        }

        $currentToken = $user->currentAccessToken();
        $user->tokens()
            ->when($currentToken && ! $currentToken instanceof TransientToken, fn ($q) => $q->where('id', '!=', $currentToken->id))
            ->delete();

        $user->rememberedDevices()->delete();

        return response()->json(['message' => 'All other sessions have been terminated.']);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (str_starts_with($id, 'token_')) {
            $tokenId = (int) substr($id, 6);
            $token = $user->tokens()->find($tokenId);

            if ($token) {
                $currentToken = $request->user()->currentAccessToken();
                $currentTokenId = $currentToken && ! $currentToken instanceof TransientToken
                    ? $currentToken->id
                    : null;

                if ($token->id === $currentTokenId) {
                    return response()->json(['message' => 'Cannot terminate your current session.'], 422);
                }

                $token->delete();
            }
        } elseif (config('session.driver') === 'database') {
            $currentSessionId = $request->session()->getId();

            if ($id === $currentSessionId) {
                return response()->json(['message' => 'Cannot terminate your current session.'], 422);
            }

            DB::table('sessions')
                ->where('user_id', $user->id)
                ->where('id', $id)
                ->delete();
        } else {
            return response()->json(['message' => 'Session not found.'], 404);
        }

        return response()->json(['message' => 'Session terminated.']);
    }
}
