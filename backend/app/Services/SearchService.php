<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AlumniPrivacy;
use App\Enums\Gender;
use App\Models\Alumni;
use App\Models\User;
use App\Support\Pagination;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class SearchService
{
    /**
     * @param  array<string, mixed>  $params
     * @return LengthAwarePaginator<int, Alumni>|Collection<int, Alumni>
     */
    public function admin(array $params, ?User $user): LengthAwarePaginator|Collection
    {
        $query = Alumni::confirmed()->with(['school']);

        if ($user?->isSchoolAdmin()) {
            $query->where('school_id', $user->school_id);
        }

        if (($params['status'] ?? null) === 'archived') {
            $query->onlyTrashed();
        } elseif (($params['status'] ?? null) !== 'all') {
            $query->whereNull('deleted_at');
        }

        if (! empty($params['q'])) {
            $search = $params['q'];
            $query->where(function (Builder $q) use ($search) {
                $this->applyNameSearch($q, $search);

                $q->orWhere('student_id', 'like', "%{$search}%")
                    ->orWhere('contact_email', 'like', "%{$search}%")
                    ->orWhereHas('school', function (Builder $schoolQuery) use ($search) {
                        $schoolQuery->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $this->applyFilters($query, $params, $user, true);
        $this->applySort($query, $params['sort_by'] ?? 'name_asc');

        if (! empty($params['all'])) {
            return Pagination::boundedAll($query);
        }

        return $query->paginate(Pagination::clampPerPage((int) ($params['per_page'] ?? 15), 15));
    }

    /**
     * @param  array<string, mixed>  $params
     */
    public function directory(array $params, ?User $user): LengthAwarePaginator
    {
        $query = Alumni::confirmed()
            ->with('school')
            ->whereNull('deleted_at')
            ->where('privacy', AlumniPrivacy::Public);

        if (! $user?->isAdmin()) {
            $query->where('school_id', $user?->school_id);
        } elseif ($user->isSchoolAdmin()) {
            $query->where('school_id', $user->school_id);
        }

        if (! empty($params['q'])) {
            $search = $params['q'];
            $query->where(function (Builder $q) use ($search) {
                $this->applyNameSearch($q, $search);

                $q->orWhereHas('school', function (Builder $schoolQuery) use ($search) {
                    $schoolQuery->where('name', 'like', "%{$search}%");
                });
            });
        }

        $this->applyFilters($query, $params, $user, false);
        $this->applySort($query, $params['sort_by'] ?? 'name_asc');

        return $query->paginate(Pagination::clampPerPage((int) ($params['per_page'] ?? 20), 20));
    }

    /**
     * @return Collection<int, Alumni>
     */
    public function adminSuggest(string $q, bool $unlinkedOnly, ?User $user): Collection
    {
        return Alumni::confirmed()
            ->whereNull('deleted_at')
            ->when($user?->isSchoolAdmin(), fn (Builder $query) => $query->where('school_id', $user->school_id))
            ->when($unlinkedOnly, fn (Builder $query) => $query->whereDoesntHave('user'))
            ->where(function (Builder $query) use ($q) {
                $query->where('first_name', 'like', "%{$q}%")
                    ->orWhere('last_name', 'like', "%{$q}%")
                    ->orWhere('student_id', 'like', "%{$q}%");
            })
            ->limit(10)
            ->orderBy('last_name')
            ->get(['id', 'first_name', 'middle_name', 'last_name', 'suffix', 'graduation_year', 'student_id', 'section_strand']);
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function directorySuggest(string $q, ?User $user): Collection
    {
        return Alumni::confirmed()
            ->whereNull('deleted_at')
            ->where('privacy', AlumniPrivacy::Public)
            ->when(! $user?->isAdmin(), fn (Builder $query) => $query->where('school_id', $user?->school_id))
            ->when($user?->isSchoolAdmin(), fn (Builder $query) => $query->where('school_id', $user->school_id))
            ->where(function (Builder $query) use ($q) {
                $query->where('first_name', 'like', "%{$q}%")
                    ->orWhere('last_name', 'like', "%{$q}%");
            })
            ->limit(10)
            ->orderBy('last_name')
            ->get(['id', 'first_name', 'middle_name', 'last_name', 'suffix', 'graduation_year', 'section_strand', 'profile_photo'])
            ->map(fn (Alumni $alumni) => [
                'id' => $alumni->id,
                'first_name' => $alumni->first_name,
                'middle_name' => $alumni->middle_name,
                'last_name' => $alumni->last_name,
                'suffix' => $alumni->suffix,
                'graduation_year' => $alumni->graduation_year,
                'section_strand' => $alumni->section_strand,
                'profile_photo_url' => $alumni->profile_photo ? '/storage/'.$alumni->profile_photo : null,
            ]);
    }

    /**
     * @param  array<string, mixed>  $params
     * @return array{graduation_years: Collection<int, int>, sections: Collection<int, string>, genders: array<int, string>}
     */
    public function filters(array $params, ?User $user): array
    {
        $baseQuery = Alumni::confirmed()->whereNull('deleted_at');

        if (! $user?->isAdmin()) {
            $baseQuery->where('privacy', AlumniPrivacy::Public);
            $baseQuery->where('school_id', $user?->school_id);
        } elseif ($user->isSchoolAdmin()) {
            $baseQuery->where('school_id', $user->school_id);
        } elseif (! empty($params['school_id'])) {
            $baseQuery->where('school_id', $params['school_id']);
        }

        $isAdmin = $user?->isAdmin() ?? false;

        return [
            'graduation_years' => (clone $baseQuery)->distinct('graduation_year')->orderBy('graduation_year', 'desc')->pluck('graduation_year')->values(),
            'sections' => (clone $baseQuery)->whereNotNull('section_strand')->distinct('section_strand')->orderBy('section_strand')->pluck('section_strand')->values(),
            'genders' => $isAdmin ? array_column(Gender::cases(), 'value') : [],
        ];
    }

    /**
     * @param  array<string, mixed>  $params
     */
    private function applyFilters(Builder $query, array $params, ?User $user, bool $includeAdminOnlyFilters): void
    {
        if (! empty($params['graduation_year'])) {
            $query->whereIn('graduation_year', (array) $params['graduation_year']);
        }

        if (! empty($params['section'])) {
            $query->whereIn('section_strand', (array) $params['section']);
        }

        if (! $user?->isSchoolAdmin() && ! empty($params['school_id'])) {
            $query->where('school_id', $params['school_id']);
        }

        if (! $includeAdminOnlyFilters) {
            return;
        }

        if (! empty($params['gender'])) {
            $query->where('gender', $params['gender']);
        }
    }

    private function applySort(Builder $query, string $sortBy): void
    {
        match ($sortBy) {
            'name_desc' => $query->orderBy('last_name', 'desc')->orderBy('first_name', 'desc'),
            'year_asc' => $query->orderBy('graduation_year', 'asc'),
            'year_desc' => $query->orderBy('graduation_year', 'desc'),
            'date_asc' => $query->orderBy('created_at', 'asc'),
            'date_desc' => $query->orderBy('created_at', 'desc'),
            default => $query->orderBy('last_name', 'asc')->orderBy('first_name', 'asc'),
        };
    }

    private function applyNameSearch(Builder $query, string $search): void
    {
        $driver = $query->getModel()->getConnection()->getDriverName();

        if ($driver === 'mysql' && preg_match('/^[\pL\pN\s-]+$/u', $search) === 1) {
            $terms = preg_split('/\s+/', trim($search)) ?: [];
            $booleanSearch = collect($terms)
                ->filter()
                ->map(fn (string $term): string => $term.'*')
                ->implode(' ');

            $query->whereRaw(
                'MATCH(first_name, middle_name, last_name) AGAINST(? IN BOOLEAN MODE)',
                [$booleanSearch]
            );

            return;
        }

        $query->where('first_name', 'like', "%{$search}%")
            ->orWhere('last_name', 'like', "%{$search}%")
            ->orWhere('middle_name', 'like', "%{$search}%");
    }
}
