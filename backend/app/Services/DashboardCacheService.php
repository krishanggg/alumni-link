<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Cache;

/**
 * Cross-cutting cache-invalidation policy for the admin dashboard, shared by
 * every Service whose mutations affect dashboard figures (alumni, approvals,
 * backups, profiles, ...). DashboardController caches under 'dashboard_admin'
 * (Super Admin, unscoped) and 'dashboard_admin_school_{id}' (School Admin /
 * Super Admin viewing one school). Both must be forgotten on any alumni/user
 * change belonging to that school, or the school-scoped dashboard keeps
 * serving stale data for its full TTL.
 */
class DashboardCacheService
{
    public function forget(?int $schoolId = null): void
    {
        Cache::forget('dashboard_admin');

        if ($schoolId) {
            Cache::forget("dashboard_admin_school_{$schoolId}");
        }
    }
}
