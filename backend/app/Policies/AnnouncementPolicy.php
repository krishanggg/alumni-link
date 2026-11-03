<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\Announcement;
use App\Models\User;

class AnnouncementPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }

    public function view(User $user, Announcement $announcement): bool
    {
        return $user->isAdmin() && (! $user->isSchoolAdmin() || $announcement->school_id === $user->school_id);
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, Announcement $announcement): bool
    {
        return $user->isAdmin() && (! $user->isSchoolAdmin() || $announcement->school_id === $user->school_id);
    }

    public function delete(User $user, Announcement $announcement): bool
    {
        return $user->isAdmin() && (! $user->isSchoolAdmin() || $announcement->school_id === $user->school_id);
    }

    public function publish(User $user, Announcement $announcement): bool
    {
        return $user->isAdmin() && (! $user->isSchoolAdmin() || $announcement->school_id === $user->school_id);
    }

    public function unpublish(User $user, Announcement $announcement): bool
    {
        return $user->isAdmin() && (! $user->isSchoolAdmin() || $announcement->school_id === $user->school_id);
    }

    public function expire(User $user, Announcement $announcement): bool
    {
        return $user->isAdmin() && (! $user->isSchoolAdmin() || $announcement->school_id === $user->school_id);
    }

    public function archive(User $user, Announcement $announcement): bool
    {
        return $user->isAdmin() && (! $user->isSchoolAdmin() || $announcement->school_id === $user->school_id);
    }

    public function restoreFromArchive(User $user, Announcement $announcement): bool
    {
        return $user->isAdmin() && (! $user->isSchoolAdmin() || $announcement->school_id === $user->school_id);
    }

    public function viewActive(User $user): bool
    {
        return $user->role === UserRole::Alumni && $user->account_status === AccountStatus::Approved;
    }

    public function markViewed(User $user): bool
    {
        return $user->role === UserRole::Alumni && $user->account_status === AccountStatus::Approved;
    }

    public function batches(User $user): bool
    {
        return $user->isAdmin();
    }
}
