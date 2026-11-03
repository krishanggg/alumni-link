<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AccountStatus;
use App\Enums\AnnouncementStatus;
use App\Enums\AnnouncementType;
use App\Enums\UserRole;
use App\Exceptions\BusinessRuleException;
use App\Models\Alumni;
use App\Models\Announcement;
use App\Models\AnnouncementView;
use App\Models\User;
use App\Notifications\SystemAnnouncementNotification;
use App\Support\Pagination;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AnnouncementService
{
    public function __construct(
        private readonly NotificationDispatchService $notifications = new NotificationDispatchService(new ExpoPushService),
    ) {}

    /**
     * @return array{announcements: EloquentCollection<int, Announcement>, unviewed_count: int}
     */
    public function active(User $user): array
    {
        if (! $user->alumni_id) {
            return ['announcements' => new Collection, 'unviewed_count' => 0];
        }

        $announcements = Announcement::query()
            ->visibleToAlumni($user)
            ->with(['views', 'batches'])
            ->orderBy('published_at', 'desc')
            ->get();

        $unviewedCount = $announcements->filter(function ($a) use ($user) {
            return ! $a->views->contains('user_id', $user->id);
        })->count();

        return ['announcements' => $announcements, 'unviewed_count' => $unviewedCount];
    }

    public function mine(User $user, ?string $type, int $perPage, ?string $search = null): ?LengthAwarePaginator
    {
        if (! $user->alumni_id) {
            return null;
        }

        $alumni = Alumni::find($user->alumni_id);

        // Filtering by type (and search) happens here rather than in the client so the
        // paginator counts only matching rows — filtering an already-fetched
        // page client-side would leave the empty state and load-more control
        // reasoning about the unfiltered set, so a type with matches only on
        // page 2 would read as "none".
        return Announcement::whereIn('status', [AnnouncementStatus::Published, AnnouncementStatus::Expired])
            ->whereNull('deleted_at')
            ->when($type !== null, fn ($q) => $q->where('type', $type))
            ->when($search !== null && $search !== '', fn ($q) => $q->where(
                fn ($qq) => $qq->where('title', 'like', "%{$search}%")->orWhere('message', 'like', "%{$search}%")
            ))
            ->where(function ($q) use ($user) {
                $q->whereNull('school_id')
                    ->orWhere('school_id', $user->school_id);
            })
            ->where(function ($q) use ($alumni) {
                $q->where('target_all_batches', true)
                    ->orWhereHas('batches', function ($qb) use ($alumni) {
                        $qb->where('graduation_year', $alumni?->graduation_year);
                    });
            })
            ->with(['views', 'batches'])
            ->orderBy('published_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * @return Collection<int, int>
     */
    public function batchYears(?User $user, ?int $schoolId): Collection
    {
        return Alumni::confirmed()
            ->whereNull('deleted_at')
            ->when($user?->isSchoolAdmin(), fn ($query) => $query->where('school_id', $user->school_id))
            ->when($user?->isSuperAdmin() && $schoolId !== null, fn ($query) => $query->where('school_id', $schoolId))
            ->distinct('graduation_year')
            ->orderBy('graduation_year', 'desc')
            ->pluck('graduation_year');
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, Announcement>|Collection<int, Announcement>
     */
    public function list(array $filters, ?User $user): LengthAwarePaginator|Collection
    {
        $query = Announcement::with(['batches', 'school', 'creator']);

        if ($user?->isSchoolAdmin()) {
            $query->where('school_id', $user->school_id);
        } elseif (! empty($filters['school_id'])) {
            $query->where('school_id', $filters['school_id']);
        }

        $status = $filters['status'] ?? null;

        if (! empty($filters['status']) && $status !== 'all') {
            $query->where('status', $status);
        } elseif (empty($filters['include_archived'])) {
            // Archiving is admin-only retention. An omitted filter and an
            // explicit 'all' both mean "every status except archived"; reaching
            // archived takes either status=archived or an explicit opt-in.
            $query->where('status', '!=', AnnouncementStatus::Archived);
        }

        if (! empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        if (! empty($filters['q'])) {
            $query->where('title', 'like', '%'.$filters['q'].'%');
        }

        // Admin view: newest first regardless of status, so a just-created
        // draft (published_at is null) lands on page one rather than being
        // buried under every published announcement.
        $sortBy = $filters['sort_by'] ?? 'created_at';

        $query->orderBy(
            $sortBy === 'title' ? 'title' : $sortBy,
            $filters['sort_dir'] ?? 'desc'
        );

        if (! empty($filters['all'])) {
            return Pagination::boundedAll($query);
        }

        return $query->paginate(Pagination::clampPerPage((int) ($filters['per_page'] ?? 15), 15));
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @param  array<int, int>  $targetBatches
     */
    public function create(array $attributes, bool $targetAllBatches, array $targetBatches, ?User $user): Announcement
    {
        $isPublished = ($attributes['status'] ?? null) === AnnouncementStatus::Published->value;

        return DB::transaction(function () use ($attributes, $targetAllBatches, $targetBatches, $user, $isPublished) {
            if ($user?->isSchoolAdmin()) {
                $attributes['school_id'] = $user->school_id;
            }

            $announcement = Announcement::create([
                ...$attributes,
                'created_by' => $user?->id,
                'published_at' => $isPublished ? now() : null,
            ]);

            $this->syncBatches($announcement, $targetAllBatches, $targetBatches);

            return $announcement;
        });
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @param  array<int, int>  $targetBatches
     */
    public function update(Announcement $announcement, array $attributes, bool $targetAllBatches, array $targetBatches, ?User $user): Announcement
    {
        DB::transaction(function () use ($announcement, $attributes, $targetAllBatches, $targetBatches, $user) {
            if ($user?->isSchoolAdmin()) {
                $attributes['school_id'] = $user->school_id;
            }

            $announcement->update([
                ...$attributes,
                'updated_by' => $user?->id,
            ]);

            $this->syncBatches($announcement, $targetAllBatches, $targetBatches);
        });

        return $announcement;
    }

    /**
     * @throws BusinessRuleException
     */
    public function publish(Announcement $announcement): void
    {
        if ($announcement->status === AnnouncementStatus::Archived) {
            throw new BusinessRuleException('Archived announcements must be restored before they can be published.', 422);
        }

        if ($announcement->type === AnnouncementType::Event && $announcement->target_date && $announcement->target_date->isPast()) {
            throw new BusinessRuleException('Cannot publish an event with a past target date.', 422);
        }

        $announcement->update([
            'status' => AnnouncementStatus::Published,
            'published_at' => now(),
        ]);

        $this->notifyRecipients($announcement);
    }

    /**
     * Fans out to every approved alumnus the announcement targets — same
     * school/all-schools and batch-year rules `active()` uses to decide
     * whether a given user should see the announcement at all.
     */
    private function notifyRecipients(Announcement $announcement): void
    {
        $recipients = User::where('role', UserRole::Alumni)
            ->where('account_status', AccountStatus::Approved)
            ->whereNotNull('alumni_id')
            ->when($announcement->school_id !== null, fn ($q) => $q->where('school_id', $announcement->school_id))
            ->when(! $announcement->target_all_batches, function ($q) use ($announcement) {
                $years = $announcement->batches()->pluck('graduation_year');
                $q->whereHas('alumni', fn ($qa) => $qa->whereIn('graduation_year', $years));
            })
            ->get();

        foreach ($recipients as $recipient) {
            $this->notifications->notify(
                $recipient,
                'system_announcements',
                new SystemAnnouncementNotification($announcement),
                $announcement->title,
                $announcement->message,
            );
        }
    }

    /**
     * @throws BusinessRuleException
     */
    public function unpublish(Announcement $announcement): void
    {
        if ($announcement->status === AnnouncementStatus::Archived) {
            throw new BusinessRuleException('Archived announcements must be restored before they can be unpublished.', 422);
        }

        $announcement->update(['status' => AnnouncementStatus::Draft, 'published_at' => null]);
    }

    /**
     * @throws BusinessRuleException
     */
    public function expire(Announcement $announcement): void
    {
        if ($announcement->status === AnnouncementStatus::Archived) {
            throw new BusinessRuleException('Archived announcements must be restored before they can be expired.', 422);
        }

        $announcement->update(['status' => AnnouncementStatus::Expired]);
    }

    /**
     * @throws BusinessRuleException
     */
    public function archive(Announcement $announcement, ?int $actorId): bool
    {
        if ($announcement->status === AnnouncementStatus::Archived) {
            throw new BusinessRuleException('Announcement is already archived.', 422);
        }

        $wasPublished = $announcement->status === AnnouncementStatus::Published;

        $announcement->update([
            'status' => AnnouncementStatus::Archived,
            'archived_at' => now(),
            'updated_by' => $actorId,
        ]);

        return $wasPublished;
    }

    /**
     * @throws BusinessRuleException
     */
    public function restoreFromArchive(Announcement $announcement, ?int $actorId): void
    {
        if ($announcement->status !== AnnouncementStatus::Archived) {
            throw new BusinessRuleException('Announcement is not archived.', 422);
        }

        // Restoring returns the announcement to draft so an admin has to
        // deliberately publish it again rather than silently re-exposing it.
        $announcement->update([
            'status' => AnnouncementStatus::Draft,
            'archived_at' => null,
            'published_at' => null,
            'updated_by' => $actorId,
        ]);
    }

    public function markViewed(Announcement $announcement, ?int $userId): void
    {
        // Keep not-found handling here so every caller shares the visibility boundary.
        if ($userId === null) {
            abort(404);
        }

        $user = User::find($userId);
        $alumni = $user?->alumni_id !== null ? Alumni::find($user->alumni_id) : null;

        if ($user === null || $alumni === null) {
            abort(404);
        }

        $visibleAnnouncement = Announcement::query()
            ->visibleToAlumni($user)
            ->whereKey($announcement->id)
            ->firstOrFail();

        AnnouncementView::firstOrCreate([
            'announcement_id' => $visibleAnnouncement->id,
            'user_id' => $userId,
        ], [
            'viewed_at' => now(),
        ]);
    }

    /**
     * @param  array<int, int>  $targetBatches
     */
    private function syncBatches(Announcement $announcement, bool $targetAllBatches, array $targetBatches): void
    {
        $announcement->batches()->delete();

        if (! $targetAllBatches) {
            foreach ($targetBatches as $year) {
                $announcement->batches()->create(['graduation_year' => $year]);
            }
        }
    }
}
