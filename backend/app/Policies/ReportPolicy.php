<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\AccountStatus;
use App\Enums\ReportLifecycleStatus;
use App\Enums\ReportVisibility;
use App\Enums\UserRole;
use App\Models\Report;
use App\Models\User;

class ReportPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }

    public function view(User $user, Report $report): bool
    {
        return $user->isAdmin() && (! $user->isSchoolAdmin() || $report->school_id === $user->school_id);
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function generate(User $user): bool
    {
        return $user->isAdmin();
    }

    public function preview(User $user): bool
    {
        return $user->isAdmin();
    }

    public function history(User $user): bool
    {
        return $user->isAdmin();
    }

    public function publish(User $user, Report $report): bool
    {
        return $user->isAdmin() && (! $user->isSchoolAdmin() || $report->school_id === $user->school_id);
    }

    public function unpublish(User $user, Report $report): bool
    {
        return $user->isAdmin() && (! $user->isSchoolAdmin() || $report->school_id === $user->school_id);
    }

    public function archive(User $user, Report $report): bool
    {
        return $user->isAdmin() && (! $user->isSchoolAdmin() || $report->school_id === $user->school_id);
    }

    public function restore(User $user, Report $report): bool
    {
        return $user->isAdmin() && (! $user->isSchoolAdmin() || $report->school_id === $user->school_id);
    }

    public function delete(User $user, Report $report): bool
    {
        return $user->isAdmin() && (! $user->isSchoolAdmin() || $report->school_id === $user->school_id);
    }

    public function statsSummary(User $user): bool
    {
        return $user->isAdmin();
    }

    public function viewPublished(User $user): bool
    {
        return $user->role === UserRole::Alumni && $user->account_status === AccountStatus::Approved;
    }

    public function download(User $user, Report $report): bool
    {
        if ($user->isAdmin()) {
            return ! $user->isSchoolAdmin() || $report->school_id === $user->school_id;
        }

        if ($report->visibility !== ReportVisibility::Published || $report->lifecycle_status !== ReportLifecycleStatus::Active) {
            return false;
        }

        $alumniSchoolId = $user->school_id;

        if ($report->school_id !== null && $report->school_id !== $alumniSchoolId) {
            return false;
        }

        return true;
    }
}
