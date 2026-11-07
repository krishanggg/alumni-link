<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\UserRole;
use App\Models\School;
use App\Models\User;
use App\Notifications\AdministrativeChangeNotification;

class SchoolAdminChangeNotificationService
{
    public function __construct(private readonly NotificationDispatchService $notifications) {}

    public function notify(
        ?User $actor,
        ?int $schoolId,
        string $summary,
    ): void {
        if (! $actor?->isSuperAdmin() || $schoolId === null || $summary === '') {
            return;
        }

        $schoolName = School::whereKey($schoolId)->value('name')
            ?? "school #{$schoolId}";

        $admins = User::query()
            ->where('role', UserRole::SchoolAdmin)
            ->where('school_id', $schoolId)
            ->get();

        $this->notifyAdmins($actor, $admins, $schoolName, $summary);
    }

    /**
     * @param  iterable<User>  $admins
     */
    public function notifyAdmins(
        ?User $actor,
        iterable $admins,
        string $schoolName,
        string $summary,
    ): void {
        if (! $actor?->isSuperAdmin() || $summary === '') {
            return;
        }

        foreach ($admins as $admin) {
            $this->notifications->notify(
                $admin,
                'administrative_notices',
                new AdministrativeChangeNotification($schoolName, $summary, $actor->name),
            );
        }
    }

    public function schoolIdForUser(User $user): ?int
    {
        return $user->school_id ?? $user->alumni?->school_id;
    }
}
