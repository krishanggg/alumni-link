<?php

declare(strict_types=1);

namespace App\Http\Middleware\Concerns;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\User;

trait ChecksApprovedAlumniEligibility
{
    private function approvedAlumniEligibilityFailure(?User $user): ?string
    {
        if ($user === null
            || $user->role !== UserRole::Alumni
            || $user->account_status !== AccountStatus::Approved
        ) {
            return 'not_approved_alumni';
        }

        if ($user->alumniRecordArchived()) {
            return 'archived';
        }

        if (! $user->is_active) {
            return 'inactive';
        }

        if ($user->alumni_id === null) {
            return 'profile_incomplete';
        }

        return null;
    }
}
