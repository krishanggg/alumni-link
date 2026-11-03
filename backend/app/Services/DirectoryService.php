<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AlumniPrivacy;
use App\Models\Alumni;
use App\Models\User;
use App\Support\Pagination;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class DirectoryService
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function list(array $filters, ?User $user): LengthAwarePaginator
    {
        $query = Alumni::confirmed()->with('school')->whereNull('deleted_at');

        if (! $user?->isAdmin()) {
            $query->where('privacy', AlumniPrivacy::Public);
            $query->where('school_id', $user?->school_id);
        } elseif ($user->isSchoolAdmin()) {
            $query->where('school_id', $user->school_id);
        } elseif (! empty($filters['school_id'])) {
            $query->where('school_id', $filters['school_id']);
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('middle_name', 'like', "%{$search}%");
            });
        }

        if (! empty($filters['graduation_year'])) {
            $query->where('graduation_year', $filters['graduation_year']);
        }

        if (! empty($filters['section'])) {
            $query->where('section_strand', $filters['section']);
        }

        $this->applySort($query, $filters['sort_by'] ?? 'name_asc');

        return $query->paginate(Pagination::clampPerPage((int) ($filters['per_page'] ?? 20), 20));
    }

    /**
     * @return Collection<int, string>
     */
    public function sections(?User $user): Collection
    {
        $query = Alumni::confirmed()->whereNull('deleted_at')->whereNotNull('section_strand');

        if (! $user?->isAdmin()) {
            $query->where('privacy', AlumniPrivacy::Public);
            $query->where('school_id', $user?->school_id);
        } elseif ($user->isSchoolAdmin()) {
            $query->where('school_id', $user->school_id);
        }

        return $query->distinct()->orderBy('section_strand')->pluck('section_strand');
    }

    /**
     * @return array{total_alumni: int, batch_count: int, most_recent_batch: int|null}
     */
    public function stats(?User $user, ?int $schoolId): array
    {
        $isAdmin = $user?->isAdmin() ?? false;

        $baseQuery = function () use ($isAdmin, $user, $schoolId) {
            $query = Alumni::confirmed()->whereNull('deleted_at');

            if (! $isAdmin) {
                $query->where('privacy', AlumniPrivacy::Public);
                $query->where('school_id', $user?->school_id);
            } elseif ($user?->isSchoolAdmin()) {
                $query->where('school_id', $user->school_id);
            } elseif ($schoolId) {
                $query->where('school_id', $schoolId);
            }

            return $query;
        };

        return [
            'total_alumni' => $baseQuery()->count(),
            'batch_count' => $baseQuery()->distinct('graduation_year')->count('graduation_year'),
            'most_recent_batch' => $baseQuery()->max('graduation_year'),
        ];
    }

    private function applySort(Builder $query, string $sortBy): void
    {
        match ($sortBy) {
            'name_desc' => $query->orderBy('last_name', 'desc')->orderBy('first_name', 'desc'),
            'year_asc' => $query->orderBy('graduation_year', 'asc'),
            'year_desc' => $query->orderBy('graduation_year', 'desc'),
            default => $query->orderBy('last_name', 'asc')->orderBy('first_name', 'asc'),
        };
    }
}
