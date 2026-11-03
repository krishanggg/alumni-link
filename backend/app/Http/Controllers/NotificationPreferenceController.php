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
            NotificationPreference::DEFAULTS
        );

        return response()->json([
            'preferences' => [
                'account_activity' => $prefs->account_activity,
                'alumni_record_updates' => $prefs->alumni_record_updates,
                'system_announcements' => $prefs->system_announcements,
                'report_completion' => $prefs->report_completion,
                'feedback' => $prefs->feedback,
            ],
        ]);
    }

    public function update(UpdateNotificationPreferenceRequest $request): JsonResponse
    {
        $this->authorize('viewAny', Alumni::class);

        $validated = $request->validated();

        $prefs = NotificationPreference::updateOrCreate(
            ['user_id' => $request->user()->id],
            $validated
        );

        return response()->json([
            'message' => 'Notification preferences updated.',
            'preferences' => [
                'account_activity' => $prefs->account_activity,
                'alumni_record_updates' => $prefs->alumni_record_updates,
                'system_announcements' => $prefs->system_announcements,
                'report_completion' => $prefs->report_completion,
                'feedback' => $prefs->feedback,
            ],
        ]);
    }
}
