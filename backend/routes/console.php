<?php

declare(strict_types=1);

use App\Models\ActivityLog;
use App\Models\Announcement;
use App\Models\Report;
use App\Services\RememberedDeviceService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;

Schedule::call(function () {
    DB::table('login_attempts')
        ->where('attempted_at', '<', now()->subHours(24))
        ->delete();
})->daily();

Schedule::call(function () {
    app(RememberedDeviceService::class)->purgeExpired();
})->daily();

Schedule::call(function () {
    Announcement::where('status', 'published')
        ->where('type', 'event')
        ->where('target_date', '<=', now())
        ->each(function (Announcement $announcement): void {
            $announcement->update(['status' => 'expired']);
            ActivityLog::log(
                userId: null,
                action: 'announcement.expired',
                subjectType: Announcement::class,
                subjectId: $announcement->id,
                description: "Announcement '{$announcement->title}' automatically expired",
            );
        });
})->everyMinute();

Schedule::call(function () {
    Report::where('visibility', 'admin_only')
        ->where('lifecycle_status', 'active')
        ->where('created_at', '<', now()->subDays(90))
        ->each(function (Report $report): void {
            $report->update(['lifecycle_status' => 'archived', 'archived_at' => now()]);
            ActivityLog::log(
                userId: null,
                action: 'report.archived',
                subjectType: Report::class,
                subjectId: $report->id,
                description: "Report '{$report->title}' automatically archived after 90 days",
            );
        });
})->daily();
