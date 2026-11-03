<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\FeedbackThreadStatus;
use App\Enums\UserRole;
use App\Events\FeedbackThreadUpdated;
use App\Models\FeedbackThread;
use App\Models\User;
use App\Notifications\FeedbackThreadReplyNotification;
use App\Support\Pagination;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FeedbackThreadService
{
    public function __construct(
        private readonly NotificationDispatchService $notifications = new NotificationDispatchService(new ExpoPushService),
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     */
    public function list(array $filters, User $user): LengthAwarePaginator
    {
        $query = FeedbackThread::query()
            ->visibleTo($user)
            ->with(['latestMessage.sender', 'school', 'creator', 'schoolAdmin', 'resolver'])
            ->orderByDesc('last_message_at')
            ->orderByDesc('id');

        if (! empty($filters['status']) && $filters['status'] !== 'all') {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['q'])) {
            $query->where('subject', 'like', '%'.$filters['q'].'%');
        }

        if ($user->isSuperAdmin() && ! empty($filters['school_id'])) {
            $query->where('school_id', $filters['school_id']);
        }

        if (! empty($filters['from'])) {
            $query->where('last_message_at', '>=', CarbonImmutable::parse($filters['from'])->startOfDay());
        }

        if (! empty($filters['to'])) {
            $query->where('last_message_at', '<=', CarbonImmutable::parse($filters['to'])->endOfDay());
        }

        return $query->paginate(Pagination::clampPerPage($filters['per_page'] ?? null));
    }

    public function get(int $id, User $user): FeedbackThread
    {
        return FeedbackThread::query()
            ->visibleTo($user)
            ->with(['messages.sender', 'creator', 'schoolAdmin', 'school', 'resolver'])
            ->findOrFail($id);
    }

    /**
     * @param  array{subject: string, body: string, school_admin_id?: int|null}  $attributes
     */
    public function create(array $attributes, User $creator): FeedbackThread
    {
        $thread = DB::transaction(function () use ($attributes, $creator): FeedbackThread {
            $schoolAdmin = $creator->isSchoolAdmin()
                ? $creator
                : User::query()
                    ->with('school')
                    ->whereKey($attributes['school_admin_id'] ?? null)
                    ->where('role', UserRole::SchoolAdmin)
                    ->where('is_active', true)
                    ->first();

            if ($schoolAdmin === null) {
                throw ValidationException::withMessages([
                    'school_admin_id' => 'Select an active School Admin recipient.',
                ]);
            }

            $thread = FeedbackThread::create([
                'subject' => $attributes['subject'],
                'school_id' => $schoolAdmin->school_id,
                'created_by' => $creator->id,
                'school_admin_id' => $schoolAdmin->id,
                'status' => FeedbackThreadStatus::Open,
                'last_message_at' => now(),
            ]);

            $message = $thread->messages()->create([
                'sender_id' => $creator->id,
                'body' => $attributes['body'],
            ]);

            $thread->update([
                'last_message_at' => $message->created_at,
                $creator->isSuperAdmin() ? 'super_admin_last_read_at' : 'school_admin_last_read_at' => now(),
            ]);

            $recipient = $creator->isSuperAdmin()
                ? $schoolAdmin
                : User::query()->where('role', UserRole::SuperAdmin)->first();

            if ($recipient !== null) {
                $this->notifications->notify(
                    $recipient,
                    'feedback',
                    new FeedbackThreadReplyNotification($thread, true),
                    'New Feedback: '.$thread->subject,
                    'A new feedback thread is waiting for your reply.',
                );
            }

            FeedbackThreadUpdated::dispatch(
                $thread->id,
                'thread.created',
                $message->id,
                FeedbackThreadStatus::Open->value,
            );

            return $thread;
        });

        return $this->get($thread->id, $creator);
    }

    public function reply(FeedbackThread $thread, string $body, User $sender): FeedbackThread
    {
        DB::transaction(function () use ($thread, $body, $sender): void {
            $message = $thread->messages()->create([
                'sender_id' => $sender->id,
                'body' => $body,
            ]);

            $readColumn = $sender->isSuperAdmin()
                ? 'super_admin_last_read_at'
                : 'school_admin_last_read_at';
            $recipientReadColumn = $sender->isSuperAdmin()
                ? 'school_admin_last_read_at'
                : 'super_admin_last_read_at';

            $thread->update([
                'status' => FeedbackThreadStatus::Open,
                'resolved_by' => null,
                'resolved_at' => null,
                'last_message_at' => $message->created_at,
                $readColumn => now(),
                // A new incoming message invalidates the other party's prior read marker.
                $recipientReadColumn => null,
            ]);

            $recipient = $this->recipientFor($thread, $sender);

            if ($recipient !== null) {
                $this->notifications->notify(
                    $recipient,
                    'feedback',
                    new FeedbackThreadReplyNotification($thread),
                    'New Feedback reply: '.$thread->subject,
                    'There is a new reply in a feedback thread.',
                );
            }

            FeedbackThreadUpdated::dispatch(
                $thread->id,
                'message.created',
                $message->id,
                FeedbackThreadStatus::Open->value,
            );
        });

        return $this->get($thread->id, $sender);
    }

    public function markResolved(FeedbackThread $thread, User $actor): FeedbackThread
    {
        DB::transaction(function () use ($thread, $actor): void {
            $thread->update([
                'status' => FeedbackThreadStatus::Resolved,
                'resolved_by' => $actor->id,
                'resolved_at' => now(),
            ]);

            $this->notifyStatusChange($thread, $actor, 'resolved');
            FeedbackThreadUpdated::dispatch($thread->id, 'thread.status_changed', null, FeedbackThreadStatus::Resolved->value);
        });

        return $thread->fresh(['messages.sender', 'creator', 'schoolAdmin', 'school', 'resolver']);
    }

    public function reopen(FeedbackThread $thread, User $actor): FeedbackThread
    {
        DB::transaction(function () use ($thread, $actor): void {
            $thread->update([
                'status' => FeedbackThreadStatus::Open,
                'resolved_by' => null,
                'resolved_at' => null,
            ]);

            $this->notifyStatusChange($thread, $actor, 'reopened');
            FeedbackThreadUpdated::dispatch($thread->id, 'thread.status_changed', null, FeedbackThreadStatus::Open->value);
        });

        return $thread->fresh(['messages.sender', 'creator', 'schoolAdmin', 'school', 'resolver']);
    }

    public function markRead(FeedbackThread $thread, User $user): void
    {
        $readColumn = $user->isSuperAdmin()
            ? 'super_admin_last_read_at'
            : 'school_admin_last_read_at';

        $thread->update([$readColumn => now()]);
    }

    public function unreadCount(User $user): int
    {
        $readColumn = $user->isSuperAdmin()
            ? 'super_admin_last_read_at'
            : 'school_admin_last_read_at';

        return FeedbackThread::query()
            ->visibleTo($user)
            ->with('latestMessage')
            ->get()
            ->filter(function (FeedbackThread $thread) use ($readColumn, $user): bool {
                $latestMessage = $thread->latestMessage;

                if ($latestMessage === null) {
                    return false;
                }

                $readAt = $thread->{$readColumn};

                return ($readAt === null || $latestMessage->created_at?->gt($readAt))
                    && $latestMessage->sender_id !== $user->id;
            })
            ->count();
    }

    private function notifyStatusChange(FeedbackThread $thread, User $actor, string $statusChange): void
    {
        $recipient = $this->recipientFor($thread, $actor);

        if ($recipient === null) {
            return;
        }

        $statusLabel = $statusChange === 'resolved' ? 'resolved' : 'reopened';

        $this->notifications->notify(
            $recipient,
            'feedback',
            new FeedbackThreadReplyNotification($thread, false, $statusChange),
            'Feedback '.$statusLabel.': '.$thread->subject,
            'A feedback conversation was '.$statusLabel.'.',
        );
    }

    private function recipientFor(FeedbackThread $thread, User $actor): ?User
    {
        if ($actor->isSuperAdmin()) {
            return $thread->loadMissing('schoolAdmin')->schoolAdmin;
        }

        return User::query()->where('role', UserRole::SuperAdmin)->first();
    }
}
