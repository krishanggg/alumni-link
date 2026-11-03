<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\AccountStatus;
use App\Enums\AlumniPrivacy;
use App\Enums\UserRole;
use App\Models\Alumni;
use App\Models\User;

class AlumniPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin() || ($user->role === UserRole::Alumni && $user->account_status === AccountStatus::Approved);
    }

    public function view(User $user, Alumni $alumni): bool
    {
        if ($user->isAdmin()) {
            return ! $user->isSchoolAdmin() || $alumni->school_id === $user->school_id;
        }

        return $alumni->privacy !== AlumniPrivacy::Private && $alumni->school_id === $user->school_id;
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, Alumni $alumni): bool
    {
        return $user->isAdmin() && (! $user->isSchoolAdmin() || $alumni->school_id === $user->school_id);
    }

    public function delete(User $user, Alumni $alumni): bool
    {
        return $user->isAdmin() && (! $user->isSchoolAdmin() || $alumni->school_id === $user->school_id);
    }

    public function restore(User $user, Alumni $alumni): bool
    {
        return $user->isAdmin() && (! $user->isSchoolAdmin() || $alumni->school_id === $user->school_id);
    }

    public function forceDelete(User $user, Alumni $alumni): bool
    {
        return $user->isAdmin() && (! $user->isSchoolAdmin() || $alumni->school_id === $user->school_id);
    }

    public function updateProfile(User $user): bool
    {
        return $user->role === UserRole::Alumni && $user->account_status === AccountStatus::Approved && $user->alumni_id !== null;
    }

    public function uploadPhoto(User $user, ?Alumni $alumni = null): bool
    {
        return $alumni !== null
            && $user->isAdmin()
            && (! $user->isSchoolAdmin() || $alumni->school_id === $user->school_id);
    }

    public function uploadOwnPhoto(User $user): bool
    {
        return $user->isAdmin() || $this->updateProfile($user);
    }

    public function viewBatchAny(User $user): bool
    {
        return $user->isAdmin()
            || ($user->role === UserRole::Alumni && $user->account_status === AccountStatus::Approved);
    }

    public function viewBatch(User $user): bool
    {
        return $this->viewBatchAny($user);
    }

    public function viewBatchStats(User $user): bool
    {
        return $this->viewBatchAny($user);
    }

    public function compareBatches(User $user): bool
    {
        return $user->isAdmin();
    }

    public function manageBatchNotes(User $user): bool
    {
        return $user->isAdmin();
    }

    public function exportBatch(User $user): bool
    {
        return $user->isAdmin();
    }

    public function viewDirectoryAny(User $user): bool
    {
        return $this->viewBatchAny($user);
    }

    public function viewDirectory(User $user, Alumni $alumni): bool
    {
        if ($user->isAdmin()) {
            return ! $user->isSchoolAdmin() || $alumni->school_id === $user->school_id;
        }

        return $alumni->privacy !== AlumniPrivacy::Private && $alumni->school_id === $user->school_id;
    }

    public function viewDirectoryStats(User $user): bool
    {
        return $this->viewBatchAny($user);
    }

    public function viewDirectorySections(User $user): bool
    {
        return $this->viewBatchAny($user);
    }

    public function searchDirectory(User $user): bool
    {
        return $this->viewBatchAny($user);
    }

    public function suggestDirectory(User $user): bool
    {
        return $this->viewBatchAny($user);
    }

    public function searchAdmin(User $user): bool
    {
        return $user->isAdmin();
    }

    public function suggestAdmin(User $user): bool
    {
        return $user->isAdmin();
    }

    public function viewFilters(User $user): bool
    {
        return $this->viewBatchAny($user);
    }
}
