<?php

declare(strict_types=1);

namespace App\Events;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/** Announces a new pending registration to admins who can review that school. */
class PendingApprovalCreated implements ShouldBroadcastNow, ShouldDispatchAfterCommit
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(public readonly int $schoolId) {}

    /** @return array<int, PrivateChannel> */
    public function broadcastOn(): array
    {
        $adminIds = User::query()
            ->where('is_active', true)
            ->where(function ($query): void {
                $query->where('role', UserRole::SuperAdmin->value)
                    ->orWhere(function ($schoolAdmins): void {
                        $schoolAdmins->where('role', UserRole::SchoolAdmin->value)
                            ->where('school_id', $this->schoolId);
                    });
            })
            ->pluck('id');

        return $adminIds
            ->map(static fn ($id): PrivateChannel => new PrivateChannel('approvals.inbox.'.(int) $id))
            ->all();
    }

    public function broadcastAs(): string
    {
        return 'approval.pending.created';
    }

    /** Do not expose applicant data; clients refetch their authorized count. */
    public function broadcastWith(): array
    {
        return [];
    }
}
