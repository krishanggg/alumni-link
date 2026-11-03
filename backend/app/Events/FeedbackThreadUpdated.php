<?php

declare(strict_types=1);

namespace App\Events;

use App\Enums\UserRole;
use App\Models\FeedbackThread;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FeedbackThreadUpdated implements ShouldBroadcastNow, ShouldDispatchAfterCommit
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(
        public readonly int $threadId,
        public readonly string $eventType,
        public readonly ?int $messageId = null,
        public readonly ?string $status = null,
    ) {}

    public function broadcastOn(): array
    {
        $channels = [new PrivateChannel('feedback.thread.'.$this->threadId)];
        $thread = FeedbackThread::query()
            ->select(['id', 'school_admin_id', 'created_by'])
            ->find($this->threadId);

        if ($thread === null) {
            return $channels;
        }

        $schoolAdminId = $thread->school_admin_id ?? $thread->created_by;
        $superAdminId = User::query()->where('role', UserRole::SuperAdmin)->value('id');
        $participantIds = array_unique(array_filter([$schoolAdminId, $superAdminId]));

        foreach ($participantIds as $participantId) {
            $channels[] = new PrivateChannel('feedback.inbox.'.(int) $participantId);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'feedback.thread.updated';
    }

    public function broadcastWith(): array
    {
        return array_filter([
            'thread_id' => $this->threadId,
            'message_id' => $this->messageId,
            'event_type' => $this->eventType,
            'status' => $this->status,
        ], static fn (mixed $value): bool => $value !== null);
    }
}
