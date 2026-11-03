<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AccountStatus;
use App\Models\ActivityLog;
use App\Models\Alumni;
use App\Models\Report;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class DashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function admin(?int $schoolId): array
    {
        $cacheKey = $schoolId ? "dashboard_admin_school_{$schoolId}" : 'dashboard_admin';

        return Cache::remember($cacheKey, 300, function () use ($schoolId) {
            $alumniQuery = Alumni::confirmed()->whereNull('deleted_at')->when($schoolId, fn ($query) => $query->where('school_id', $schoolId));
            $totalAlumni = (clone $alumniQuery)->count();
            $totalBatches = (clone $alumniQuery)->distinct('graduation_year')->count('graduation_year');
            // Archived/legacy alumni are records with no linked users row — alumni
            // an admin entered who never registered for an account.
            $archivedAlumni = (clone $alumniQuery)->whereDoesntHave('user')->count();
            $activeAlumni = $totalAlumni - $archivedAlumni;

            $newRegistrations = User::where('role', 'alumni')
                ->when($schoolId, fn ($query) => $query->where('school_id', $schoolId))
                ->where('created_at', '>=', now()->subDay())
                ->count();

            $recentAlumni = (clone $alumniQuery)
                ->with('school')
                ->orderBy('updated_at', 'desc')
                ->limit(5)
                ->get()
                ->map(fn ($a) => [
                    'id' => $a->id,
                    'first_name' => $a->first_name,
                    'middle_name' => $a->middle_name,
                    'last_name' => $a->last_name,
                    'suffix' => $a->suffix,
                    'graduation_year' => $a->graduation_year,
                    'school' => $a->school?->name,
                    'updated_at' => $a->updated_at->format('Y-m-d H:i:s'),
                ])
                ->values()
                ->all();

            $batchChart = (clone $alumniQuery)
                ->selectRaw('graduation_year, COUNT(*) as count')
                ->groupBy('graduation_year')
                ->orderBy('graduation_year', 'desc')
                ->limit(5)
                ->get()
                ->reverse()
                ->values();

            $genderChart = (clone $alumniQuery)
                ->selectRaw('gender, COUNT(*) as count')
                ->whereIn('gender', ['male', 'female'])
                ->groupBy('gender')
                ->pluck('count', 'gender');

            $recentActivity = ActivityLog::with('user')
                ->when($schoolId, fn ($query) => $query->whereHas('user', fn ($userQuery) => $userQuery->where('school_id', $schoolId)))
                ->orderBy('created_at', 'desc')->limit(10)->get()
                ->map(fn ($log) => [
                    'action' => $log->action,
                    'description' => $log->description,
                    'user' => $log->user?->name,
                    'timestamp' => $log->created_at->format('Y-m-d H:i:s'),
                ])
                ->values()
                ->all();

            $recentReports = Report::when($schoolId, fn ($query) => $query->where('school_id', $schoolId))->orderBy('created_at', 'desc')
                ->limit(3)
                ->get(['id', 'title', 'report_type', 'created_at'])
                ->map(fn ($r) => [
                    'id' => $r->id,
                    'title' => $r->title,
                    'report_type' => $r->report_type,
                    'created_at' => $r->created_at->format('Y-m-d H:i:s'),
                ])
                ->values()
                ->all();

            return [
                'stats' => [
                    'total_alumni' => $totalAlumni,
                    'total_batches' => $totalBatches,
                    'new_registrations' => $newRegistrations,
                    'active_alumni' => $activeAlumni,
                    'archived_alumni' => $archivedAlumni,
                ],
                'recent_alumni' => $recentAlumni,
                'batch_chart' => [
                    'labels' => $batchChart->pluck('graduation_year')->values()->all(),
                    'data' => $batchChart->pluck('count')->values()->all(),
                ],
                'gender_chart' => [
                    'labels' => $genderChart->keys()->values()->all(),
                    'data' => $genderChart->values()->all(),
                ],
                'recent_activity' => $recentActivity,
                'recent_reports' => $recentReports,
            ];
        });
    }

    /**
     * @return array{profile: array<string, mixed>|null, batch_summary: array<string, mixed>|null}
     */
    public function alumni(User $user): array
    {
        if (! $user->alumni_id) {
            return [
                'profile' => null,
                'batch_summary' => null,
            ];
        }

        $alumni = Alumni::with('school')->find($user->alumni_id);

        $batchTotal = Alumni::confirmed()
            ->whereNull('deleted_at')
            ->where('graduation_year', $alumni?->graduation_year)
            ->where('school_id', $user->school_id)
            ->count();

        $batchUserQuery = User::where('role', 'alumni')
            ->where('account_status', AccountStatus::Approved)
            ->whereHas('alumni', function ($query) use ($alumni, $user) {
                $query->whereNull('deleted_at')
                    ->where('graduation_year', $alumni?->graduation_year)
                    ->where('school_id', $user->school_id);
            });
        $registeredCount = (clone $batchUserQuery)->count();
        $completeProfileCount = (clone $batchUserQuery)->whereHas('alumni', function ($query) {
            $query->whereNotNull('first_name')
                ->whereNotNull('last_name')
                ->whereNotNull('graduation_year')
                ->whereNotNull('section_strand');
        })->count();

        return [
            'profile' => $alumni ? [
                'id' => $alumni->id,
                'first_name' => $alumni->first_name,
                'middle_name' => $alumni->middle_name,
                'last_name' => $alumni->last_name,
                'suffix' => $alumni->suffix,
                'graduation_year' => $alumni->graduation_year,
                'section_strand' => $alumni->section_strand,
                'profile_photo_url' => $alumni->profile_photo ? '/storage/'.$alumni->profile_photo : null,
                'school' => $alumni->school?->name,
                'contact_number' => $alumni->contact_number,
                'contact_email' => $alumni->contact_email,
                'privacy' => $alumni->privacy?->value,
            ] : null,
            'batch_summary' => [
                'graduation_year' => $alumni?->graduation_year,
                'total_graduates' => $batchTotal,
                'registration_progress' => $batchTotal > 0 ? round($registeredCount * 100 / $batchTotal, 1) : 0,
                'profile_completeness' => $registeredCount > 0 ? round($completeProfileCount * 100 / $registeredCount, 1) : 0,
            ],
        ];
    }

    /**
     * @return array<string, int>
     */
    public function stats(?int $schoolId): array
    {
        $alumni = Alumni::confirmed()->whereNull('deleted_at')->when($schoolId, fn ($query) => $query->where('school_id', $schoolId));

        $totalAlumni = (clone $alumni)->count();
        $archivedAlumni = (clone $alumni)->whereDoesntHave('user')->count();

        return [
            'total_alumni' => $totalAlumni,
            'total_batches' => (clone $alumni)->distinct('graduation_year')->count('graduation_year'),
            'total_users' => $schoolId ? User::where('school_id', $schoolId)->count() : User::count(),
            'active_users' => User::where('is_active', true)->when($schoolId, fn ($query) => $query->where('school_id', $schoolId))->count(),
            'active_alumni' => $totalAlumni - $archivedAlumni,
            'archived_alumni' => $archivedAlumni,
        ];
    }
}
