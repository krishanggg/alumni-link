<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\FeedbackThread;
use App\Models\User;

class FeedbackThreadPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }

    public function view(User $user, FeedbackThread $thread): bool
    {
        return $this->canAccessThread($user, $thread);
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function recipients(User $user): bool
    {
        return $user->isSuperAdmin();
    }

    public function reply(User $user, FeedbackThread $thread): bool
    {
        return $this->canAccessThread($user, $thread);
    }

    public function resolve(User $user, FeedbackThread $thread): bool
    {
        return $this->canAccessThread($user, $thread);
    }

    public function reopen(User $user, FeedbackThread $thread): bool
    {
        return $this->canAccessThread($user, $thread);
    }

    public function markRead(User $user, FeedbackThread $thread): bool
    {
        return $this->canAccessThread($user, $thread);
    }

    private function canAccessThread(User $user, FeedbackThread $thread): bool
    {
        return $user->isSuperAdmin()
            || ($user->isSchoolAdmin()
                && ($thread->school_admin_id === $user->id
                    || ($thread->school_admin_id === null && $thread->created_by === $user->id))
                && $thread->school_id === $user->school_id);
    }
}
