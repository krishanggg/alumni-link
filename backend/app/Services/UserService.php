<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Exceptions\BusinessRuleException;
use App\Models\Alumni;
use App\Models\User;
use App\Support\Pagination;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;

class UserService
{
    private const ALLOWED_SORTS = ['username', 'email', 'role', 'last_login_at', 'created_at'];

    private const PROTECTED_ATTRIBUTES = [
        'role', 'account_status', 'is_active', 'alumni_id', 'school_id', 'rejection_reason',
    ];

    /**
     * @param  array<string, mixed>  $filters
     * @return array{results: LengthAwarePaginator|Collection<int, User>, stats: array{total: int, active: int, admins: int, alumni: int}}
     */
    public function list(array $filters): array
    {
        $query = User::query();
        $this->applyIndexFilters($query, $filters);

        // Aggregated before ordering/pagination so the summary cards describe the
        // whole filtered result set rather than whichever page is being viewed.
        $stats = $this->indexStats($query->clone());

        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortDir = $filters['sort_dir'] ?? 'desc';

        if (in_array($sortBy, self::ALLOWED_SORTS, true)) {
            $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');
        }

        $query->with(['alumni', 'school']);

        $results = ! empty($filters['all'])
            ? Pagination::boundedAll($query)
            : $query->paginate(Pagination::clampPerPage((int) ($filters['per_page'] ?? 15), 15));

        return ['results' => $results, 'stats' => $stats];
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(array $attributes): User
    {
        $accountStatus = $attributes['account_status'] ?? AccountStatus::Approved;

        // Admin roles are always approved (spec §2) — pending/rejected only apply
        // to alumni accounts, so a directly-created admin can't end up stuck
        // behind the pending/rejected gate regardless of what was submitted.
        if ($attributes['role'] !== 'alumni') {
            $accountStatus = AccountStatus::Approved;
        }

        $user = new User;
        $user->fill(Arr::except($attributes, self::PROTECTED_ATTRIBUTES));

        // These attributes are intentionally assigned one by one: this service
        // is the authoritative admin-account creation path.
        $user->role = $attributes['role'];
        $user->account_status = $accountStatus;

        if (array_key_exists('is_active', $attributes)) {
            $user->is_active = $attributes['is_active'];
        }

        if (array_key_exists('alumni_id', $attributes)) {
            $user->alumni_id = $attributes['alumni_id'];
        }

        if (array_key_exists('school_id', $attributes)) {
            $user->school_id = $attributes['school_id'];
        }

        if (array_key_exists('rejection_reason', $attributes)) {
            $user->rejection_reason = $attributes['rejection_reason'];
        }

        $user->save();

        return $user;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(User $user, array $attributes): User
    {
        if ($user->isSchoolAdmin() && $attributes['role'] !== 'school_admin') {
            $attributes['school_id'] = null;
        }

        // Admin roles are always approved (spec §2) — promoting a pending or
        // rejected alumni to School Admin must clear the stale account_status,
        // or they'd land on the pending/rejected screen instead of their
        // admin dashboard on next login.
        if ($attributes['role'] !== 'alumni') {
            $attributes['account_status'] = AccountStatus::Approved;
            $attributes['rejection_reason'] = null;
        }

        $user->fill(Arr::except($attributes, self::PROTECTED_ATTRIBUTES));

        // Keep role changes and their related account-state changes explicit;
        // they are privileged admin operations rather than mass assignment.
        $user->role = $attributes['role'];

        if (array_key_exists('account_status', $attributes)) {
            $user->account_status = $attributes['account_status'];
        }

        if (array_key_exists('is_active', $attributes)) {
            $user->is_active = $attributes['is_active'];
        }

        if (array_key_exists('alumni_id', $attributes)) {
            $user->alumni_id = $attributes['alumni_id'];
        }

        if (array_key_exists('school_id', $attributes)) {
            $user->school_id = $attributes['school_id'];
        }

        if (array_key_exists('rejection_reason', $attributes)) {
            $user->rejection_reason = $attributes['rejection_reason'];
        }

        $user->save();

        return $user;
    }

    public function toggleStatus(User $user): User
    {
        $user->is_active = ! $user->is_active;
        $user->save();

        return $user;
    }

    public function delete(User $user): void
    {
        $user->alumni_id = null;
        $user->save();
        $user->delete();
    }

    /**
     * @throws BusinessRuleException
     */
    public function linkAlumni(User $user, int $alumniId): User
    {
        $existingUser = User::where('alumni_id', $alumniId)->where('id', '!=', $user->id)->first();
        if ($existingUser) {
            throw new BusinessRuleException('This alumni record is already linked to another user.', 422);
        }

        $alumni = Alumni::confirmed()->findOrFail($alumniId);

        $user->alumni_id = $alumniId;
        $user->school_id = $alumni->school_id;
        $user->save();

        return $user;
    }

    public function unlinkAlumni(User $user): User
    {
        // school_id on an alumni-role user only ever reflects their linked
        // alumni record (set in linkAlumni); a school_admin's school_id is
        // independent and must survive an unlink.
        $user->alumni_id = null;
        if (! $user->isSchoolAdmin()) {
            $user->school_id = null;
        }

        $user->save();

        return $user;
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function applyIndexFilters(Builder $query, array $filters): void
    {
        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('email', 'like', "%{$search}%")
                    ->orWhere('username', 'like', "%{$search}%")
                    ->orWhereHas('alumni', function ($alumniQuery) use ($search) {
                        $alumniQuery->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                    });
            });
        }

        if (! empty($filters['role'])) {
            $query->where('role', $filters['role']);
        }

        if (! empty($filters['status'])) {
            $query->where('is_active', $filters['status'] === 'active');
        }

        if (! empty($filters['account_status'])) {
            $query->where('account_status', $filters['account_status']);
        }

        if (! empty($filters['school_id'])) {
            $query->where('school_id', $filters['school_id']);
        }

        if (! empty($filters['linked'])) {
            $query->when($filters['linked'] === 'linked', fn (Builder $q) => $q->whereNotNull('alumni_id'))
                ->when($filters['linked'] === 'unlinked', fn (Builder $q) => $q->whereNull('alumni_id'));
        }
    }

    /**
     * Counts across the full filtered set, in a single aggregate query.
     *
     * @return array{total: int, active: int, admins: int, alumni: int}
     */
    private function indexStats(Builder $query): array
    {
        $row = $query->selectRaw(
            'COUNT(*) as total_count,'
            .' SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_count,'
            .' SUM(CASE WHEN role IN (?, ?) THEN 1 ELSE 0 END) as admin_count,'
            .' SUM(CASE WHEN role = ? THEN 1 ELSE 0 END) as alumni_count',
            [UserRole::SuperAdmin->value, UserRole::SchoolAdmin->value, UserRole::Alumni->value],
        )->first();

        return [
            'total' => (int) ($row->total_count ?? 0),
            'active' => (int) ($row->active_count ?? 0),
            'admins' => (int) ($row->admin_count ?? 0),
            'alumni' => (int) ($row->alumni_count ?? 0),
        ];
    }
}
