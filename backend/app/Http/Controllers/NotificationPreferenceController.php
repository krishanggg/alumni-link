<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Profile\UpdateNotificationPreferenceRequest;
use App\Models\Alumni;
use App\Models\NotificationPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationPreferenceController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Alumni::class);

        $prefs = NotificationPreference::firstOrCreate(
            ['user_id' => $request->user()->id],
            NotificationPreference::defaultsFor($request->user())
        );

        return response()->json([
            'preferences' => $this->formatPreferences($prefs),
        ]);
    }

    public function update(
        UpdateNotificationPreferenceRequest $request
    ): JsonResponse {
        $this->authorize('viewAny', Alumni::class);

        // Initialize all preferences with their defaults if needed.
        $prefs = NotificationPreference::firstOrCreate(
            ['user_id' => $request->user()->id],
            NotificationPreference::defaultsFor($request->user())
        );

        // Update only the preferences provided by the mobile app.
        $prefs->fill($request->validated());
        $prefs->save();

        return response()->json([
            'message' => 'Notification preferences updated.',
            'preferences' => $this->formatPreferences($prefs),
        ]);
    }

    private function formatPreferences(
        NotificationPreference $prefs
    ): array {
        return [
            'account_activity' => $prefs->account_activity,
            'alumni_record_updates' => $prefs->alumni_record_updates,
            'system_announcements' => $prefs->system_announcements,
            'report_completion' => $prefs->report_completion,
            'feedback' => $prefs->feedback,
        ];
    }
}
