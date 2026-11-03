<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ProfileUpdateThrottledException;
use App\Models\Alumni;
use App\Models\AlumniAuditLog;
use App\Models\User;
use App\Notifications\AlumniRecordUpdatedNotification;
use App\Support\Pagination;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class AlumniService
{
    private const PROFILE_UPDATE_RATE_LIMIT = 10;

    private const PROFILE_UPDATE_RATE_WINDOW_SECONDS = 60;

    public function __construct(
        private readonly ImageService $imageService,
        private readonly NotificationDispatchService $notifications = new NotificationDispatchService(new ExpoPushService),
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, Alumni>|Collection<int, Alumni>
     */
    public function list(array $filters, ?User $user): LengthAwarePaginator|Collection
    {
        $query = Alumni::confirmed()->with(['school']);

        if ($user?->isSchoolAdmin()) {
            $query->where('school_id', $user->school_id);
        }

        if (($filters['status'] ?? null) === 'archived') {
            $query->onlyTrashed();
        } elseif (($filters['status'] ?? null) !== 'all') {
            $query->whereNull('deleted_at');
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('student_id', 'like', "%{$search}%");
            });
        }

        if (! empty($filters['batch'])) {
            $query->where('graduation_year', $filters['batch']);
        }

        if (! $user?->isSchoolAdmin() && ! empty($filters['school_id'])) {
            $query->where('school_id', $filters['school_id']);
        }

        $query->orderBy('last_name')->orderBy('first_name');

        if (! empty($filters['all'])) {
            return Pagination::boundedAll($query);
        }

        return $query->paginate(Pagination::clampPerPage((int) ($filters['per_page'] ?? 15), 15));
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(array $attributes, ?int $actorId): Alumni
    {
        $alumni = new Alumni;
        $alumni->fill(Arr::except($attributes, ['school_id', 'created_by', 'updated_by']));
        $alumni->school_id = $attributes['school_id'] ?? null;
        $alumni->created_by = $actorId;
        $alumni->updated_by = $actorId;
        $alumni->save();

        $this->logAudit($alumni->id, $actorId, 'created');

        return $alumni;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(Alumni $alumni, array $attributes, ?int $actorId): Alumni
    {
        $schoolId = array_key_exists('school_id', $attributes) ? $attributes['school_id'] : $alumni->school_id;

        $alumni->fill(Arr::except($attributes, ['school_id', 'created_by', 'updated_by']));
        $alumni->school_id = $schoolId;
        $alumni->updated_by = $actorId;
        $alumni->save();

        $changes = Arr::except($alumni->getChanges(), ['updated_at', 'updated_by']);
        $this->logAudit($alumni->id, $actorId, 'updated', $changes);

        $linkedUser = User::where('alumni_id', $alumni->id)->first();

        if ($linkedUser && $changes !== []) {
            $this->notifications->notify(
                $linkedUser,
                'alumni_record_updates',
                new AlumniRecordUpdatedNotification(array_keys($changes)),
                'Your alumni record was updated',
                'An administrator updated your alumni record.',
            );
        }

        return $alumni;
    }

    public function delete(Alumni $alumni, ?int $actorId): void
    {
        $alumni->delete();

        $this->logAudit($alumni->id, $actorId, 'deleted');
    }

    public function restore(Alumni $alumni, ?int $actorId): Alumni
    {
        $alumni->restore();

        $this->logAudit($alumni->id, $actorId, 'restored');

        return $alumni;
    }

    public function forceDelete(Alumni $alumni, ?int $actorId): void
    {
        $this->logAudit($alumni->id, $actorId, 'permanently_deleted');

        $alumni->forceDelete();
    }

    /**
     * Shared by AlumniController::updateProfile (the legacy endpoint) and
     * ProfileController::update (the web and mobile endpoint) —
     * both are alumni self-service updates and must apply the same rate
     * limit and audit trail so the two entry points can't drift apart.
     *
     * @param  array<string, mixed>  $attributes
     *
     * @throws ProfileUpdateThrottledException
     */
    public function updateSelfProfile(User $user, array $attributes): Alumni
    {
        $this->throttleProfileUpdate($user->id);

        $alumni = Alumni::find($user->alumni_id);
        $alumni->fill(Arr::except($attributes, ['school_id', 'created_by', 'updated_by']));
        $alumni->save();

        $this->logAudit($alumni->id, $user->id, 'updated', $attributes);

        return $alumni;
    }

    /**
     * Both self-service photo-upload entry points (ProfileController and
     * AlumniController) route through this method so their audit behavior
     * can't diverge — every alumni self-service mutation must be audited.
     */
    public function uploadSelfProfilePhoto(User $user, UploadedFile $file): Alumni
    {
        $alumni = Alumni::find($user->alumni_id);

        $this->replacePhoto($alumni, $file);

        $this->logAudit($alumni->id, $user->id, 'updated', ['profile_photo' => $alumni->profile_photo]);

        return $alumni;
    }

    public function uploadPhoto(Alumni $alumni, UploadedFile $file): Alumni
    {
        $this->replacePhoto($alumni, $file);

        return $alumni;
    }

    public function deletePhoto(Alumni $alumni, ?int $actorId): Alumni
    {
        if ($alumni->profile_photo) {
            Storage::disk('public')->delete($alumni->profile_photo);
            $alumni->update(['profile_photo' => null]);

            $this->logAudit($alumni->id, $actorId, 'updated', ['profile_photo' => 'removed']);
        }

        return $alumni;
    }

    /**
     * @param  array<string, mixed>  $criteria
     * @return Collection<int, Alumni>
     */
    public function findDuplicates(array $criteria, ?User $user): Collection
    {
        $query = Alumni::confirmed()
            ->whereNull('deleted_at')
            ->where('first_name', $criteria['first_name'])
            ->where('last_name', $criteria['last_name']);

        if (! empty($criteria['graduation_year'])) {
            $query->where('graduation_year', $criteria['graduation_year']);
        }

        if ($user?->isSchoolAdmin()) {
            $query->where('school_id', $user->school_id);
        } elseif (! empty($criteria['school_id'])) {
            $query->where('school_id', $criteria['school_id']);
        }

        if (! empty($criteria['exclude_id'])) {
            $query->where('id', '!=', $criteria['exclude_id']);
        }

        return $query->limit(10)->get(['id', 'first_name', 'middle_name', 'last_name', 'suffix', 'graduation_year', 'school_id', 'section_strand', 'student_id']);
    }

    private function replacePhoto(Alumni $alumni, UploadedFile $file): void
    {
        $path = $this->imageService->processUpload($file);

        if ($alumni->profile_photo) {
            Storage::disk('public')->delete($alumni->profile_photo);
        }

        $alumni->update(['profile_photo' => $path]);
    }

    private function throttleProfileUpdate(int $userId): void
    {
        $key = "profile_update:{$userId}";
        $attempts = Cache::get($key, 0);

        if ($attempts >= self::PROFILE_UPDATE_RATE_LIMIT) {
            throw new ProfileUpdateThrottledException;
        }

        Cache::put($key, $attempts + 1, self::PROFILE_UPDATE_RATE_WINDOW_SECONDS);
    }

    /**
     * @param  array<string, mixed>|null  $changes
     */
    private function logAudit(int $alumniId, ?int $userId, string $action, ?array $changes = null): void
    {
        AlumniAuditLog::create([
            'alumni_id' => $alumniId,
            'user_id' => $userId,
            'action' => $action,
            'changes' => $changes,
            'created_at' => now(),
        ]);
    }
}
