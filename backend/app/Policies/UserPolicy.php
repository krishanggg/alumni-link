<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isSuperAdmin();
    }

    public function view(User $user, User $target): bool
    {
        return $user->isSuperAdmin();
    }

    public function create(User $user): bool
    {
        return $user->isSuperAdmin();
    }

    public function update(User $user, User $target): bool
    {
        return $user->isSuperAdmin();
    }

    public function delete(User $user, User $target): bool
    {
        return $user->isSuperAdmin() && $user->id !== $target->id;
    }

    /**
     * Directly overwrite another account's password. Super Admin only, and
     * never their own account — that goes through the self-service change
     * flow, which verifies the current password.
     */
    public function setPassword(User $user, User $target): bool
    {
        return $user->isSuperAdmin() && $user->id !== $target->id;
    }

    public function toggleStatus(User $user, User $target): bool
    {
        return $user->isSuperAdmin() && $user->id !== $target->id;
    }

    public function viewPendingApprovals(User $user): bool
    {
        return $user->isAdmin();
    }

    public function approve(User $user, User $target): bool
    {
        return $user->isAdmin() && (! $user->isSchoolAdmin() || $target->school_id === $user->school_id);
    }

    public function reject(User $user, User $target): bool
    {
        return $user->isAdmin() && (! $user->isSchoolAdmin() || $target->school_id === $user->school_id);
    }
}
