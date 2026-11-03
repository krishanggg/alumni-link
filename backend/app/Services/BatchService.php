<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AlumniPrivacy;
use App\Enums\Gender;
use App\Enums\UserRole;
use App\Models\Alumni;
use App\Models\User;
use App\Support\Pagination;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class BatchService
{
    /**
     * @return Collection<int, object>
     */
    public function list(User $user, ?int $schoolId, string $sort, ?int $minYear, ?int $maxYear): Collection
    {
        $isAdmin = $user->isAdmin();
        $query = Alumni::confirmed()->whereNull('deleted_at');
        $this->scopeToVisibleAlumni($query, $user, $isAdmin, $schoolId);

        $direction = $sort === 'year_asc' ? 'asc' : 'desc';

        return $query->selectRaw('graduation_year, COUNT(*) as total_graduates')
            ->groupBy('graduation_year')
            ->orderBy('graduation_year', $direction)
            ->when($minYear !== null, fn ($q) => $q->having('graduation_year', '>=', $minYear))
            ->when($maxYear !== null, fn ($q) => $q->having('graduation_year', '<=', $maxYear))
            ->get()
            ->map(function ($batch) use ($schoolId, $user, $isAdmin) {
                $registeredQuery = $this->registeredAlumniQuery($batch->graduation_year, $user, $isAdmin, $schoolId);
                $registered = (clone $registeredQuery)->count();
                $complete = (clone $registeredQuery)->whereHas('alumni', function ($alumniQuery) {
                    $alumniQuery->whereNotNull('first_name')->whereNotNull('last_name')
                        ->whereNotNull('graduation_year')->whereNotNull('section_strand');
                })->count();
                $batch->registration_progress = $batch->total_graduates > 0
                    ? round($registered * 100 / $batch->total_graduates, 1)
                    : 0;
                $batch->profile_completeness = $registered > 0
                    ? round($complete * 100 / $registered, 1)
                    : 0;

                return $batch;
            });
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, Alumni>|Collection<int, Alumni>
     */
    public function alumniForYear(int $year, User $user, ?int $schoolId, array $filters): LengthAwarePaginator|Collection
    {
        $isAdmin = $user->isAdmin();

        $query = Alumni::confirmed()
            ->whereNull('deleted_at')
            ->where('graduation_year', $year)
            ->with('school');

        $this->scopeToVisibleAlumni($query, $user, $isAdmin, $schoolId);

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%");
            });
        }

        if (! empty($filters['section'])) {
            $query->where('section_strand', $filters['section']);
        }

        if (! empty($filters['gender'])) {
            $query->where('gender', $filters['gender']);
        }

        $query->orderBy('last_name');

        if (! empty($filters['all'])) {
            return Pagination::boundedAll($query);
        }

        return $query->paginate(Pagination::clampPerPage((int) ($filters['per_page'] ?? 15), 15));
    }

    /**
     * @return array{total: int, registration_progress: float|int, profile_completeness: float|int, gender: Collection<string, int>, sections: Collection<string, int>}
     */
    public function statsForYear(int $year, User $user, ?int $schoolId): array
    {
        $isAdmin = $user->isAdmin();
        $baseQuery = Alumni::confirmed()->whereNull('deleted_at')->where('graduation_year', $year);
        $this->scopeToVisibleAlumni($baseQuery, $user, $isAdmin, $schoolId);

        $genderBreakdown = (clone $baseQuery)
            ->selectRaw('gender, COUNT(*) as count')
            ->whereIn('gender', ['male', 'female'])
            ->groupBy('gender')
            ->pluck('count', 'gender');

        $sectionBreakdown = (clone $baseQuery)
            ->selectRaw('section_strand, COUNT(*) as count')
            ->whereNotNull('section_strand')
            ->groupBy('section_strand')
            ->orderByDesc('count')
            ->pluck('count', 'section_strand');

        $total = (clone $baseQuery)->count();
        $registeredQuery = $this->registeredAlumniQuery($year, $user, $isAdmin, $schoolId);
        $registered = (clone $registeredQuery)->count();
        $complete = (clone $registeredQuery)->whereHas('alumni', function ($query) {
            $query->whereNotNull('first_name')->whereNotNull('last_name')->whereNotNull('section_strand');
        })->count();

        return [
            'total' => $total,
            'registration_progress' => $total > 0 ? round($registered * 100 / $total, 1) : 0,
            'profile_completeness' => $registered > 0 ? round($complete * 100 / $registered, 1) : 0,
            'gender' => $genderBreakdown,
            'sections' => $sectionBreakdown,
        ];
    }

    /**
     * @param  array<int, int>  $years
     */
    public function compare(array $years, ?int $schoolId): Collection
    {
        $comparison = Alumni::confirmed()
            ->whereNull('deleted_at')
            ->whereIn('graduation_year', $years)
            ->when($schoolId, fn ($query) => $query->where('school_id', $schoolId))
            ->selectRaw('
                graduation_year,
                COUNT(*) as total,
                SUM(CASE WHEN gender = ? THEN 1 ELSE 0 END) as male_count,
                SUM(CASE WHEN gender = ? THEN 1 ELSE 0 END) as female_count
            ', [Gender::Male, Gender::Female])
            ->groupBy('graduation_year')
            ->orderBy('graduation_year')
            ->get()
            ->keyBy('graduation_year');

        return $comparison->map(function ($batch) use ($schoolId) {
            $year = (int) $batch->graduation_year;
            $total = (int) $batch->total;
            $registeredQuery = User::where('role', UserRole::Alumni)
                ->where('account_status', 'approved')
                ->whereHas('alumni', function ($query) use ($year, $schoolId) {
                    $query->whereNull('deleted_at')->where('graduation_year', $year)
                        ->when($schoolId !== null, fn ($query) => $query->where('school_id', $schoolId));
                });
            $registered = (clone $registeredQuery)->count();
            $complete = (clone $registeredQuery)->whereHas('alumni', function ($query) {
                $query->whereNotNull('first_name')->whereNotNull('last_name')->whereNotNull('section_strand');
            })->count();

            $batch->registration_progress = $total > 0 ? round($registered * 100 / $total, 1) : 0;
            $batch->profile_completeness = $registered > 0 ? round($complete * 100 / $registered, 1) : 0;

            return $batch;
        });
    }

    public function setNote(int $year, int $schoolId, ?string $note, int $userId): void
    {
        $noteQuery = DB::table('batch_notes')->where('graduation_year', $year)->where('school_id', $schoolId);

        if ($noteQuery->exists()) {
            $noteQuery->update([
                'note' => $note,
                'updated_by' => $userId,
                'updated_at' => now(),
            ]);

            return;
        }

        DB::table('batch_notes')->insert([
            'graduation_year' => $year,
            'school_id' => $schoolId,
            'note' => $note,
            'created_by' => $userId,
            'updated_by' => $userId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function getNote(int $year, int $schoolId): ?string
    {
        $note = DB::table('batch_notes')->where('graduation_year', $year)->where('school_id', $schoolId)->first();

        return $note?->note;
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function exportRows(int $year, ?int $schoolId): Collection
    {
        $alumni = Alumni::confirmed()->with('school')->whereNull('deleted_at')
            ->where('graduation_year', $year)
            ->when($schoolId, fn ($query) => $query->where('school_id', $schoolId))
            ->orderBy('last_name')
            ->get();

        return $alumni->map(fn (Alumni $a) => [
            'ID' => $a->id,
            'School' => $a->school?->name ?? '',
            'First Name' => $a->first_name,
            'Middle Name' => $a->middle_name ?? '',
            'Last Name' => $a->last_name,
            'Suffix' => $a->suffix ?? '',
            'Gender' => $a->gender?->value ?? '',
            'Graduation Year' => $a->graduation_year,
            'Section' => $a->section_strand ?? '',
            'Contact' => $a->contact_number ?? '',
            'Email' => $a->contact_email ?? '',
        ]);
    }

    private function scopeToVisibleAlumni(Builder $query, User $user, bool $isAdmin, ?int $schoolId): void
    {
        if (! $isAdmin) {
            $query->where('school_id', $user->school_id);
            $query->where('privacy', AlumniPrivacy::Public);
        } elseif ($schoolId !== null) {
            $query->where('school_id', $schoolId);
        }
    }

    private function registeredAlumniQuery(int $graduationYear, User $user, bool $isAdmin, ?int $schoolId): Builder
    {
        return User::where('role', UserRole::Alumni)
            ->where('account_status', 'approved')
            ->whereHas('alumni', function ($alumniQuery) use ($graduationYear, $user, $isAdmin, $schoolId) {
                $alumniQuery->whereNull('deleted_at')->where('graduation_year', $graduationYear);
                $this->scopeToVisibleAlumni($alumniQuery, $user, $isAdmin, $schoolId);
            });
    }
}
