<?php

declare(strict_types=1);

use App\Models\ActivityLog;
use App\Models\Announcement;
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

