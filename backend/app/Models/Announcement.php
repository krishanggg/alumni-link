<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AnnouncementStatus;
use App\Enums\AnnouncementType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Announcement extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'type', 'title', 'message', 'target_date',
        'school_id', 'target_all_batches', 'show_as_modal',
        'status', 'published_at', 'archived_at', 'created_by', 'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'target_date' => 'datetime',
            'published_at' => 'datetime',
            'archived_at' => 'datetime',
            'target_all_batches' => 'boolean',
            'show_as_modal' => 'boolean',
            'type' => AnnouncementType::class,
            'status' => AnnouncementStatus::class,
        ];
    }

    public function scopeVisibleToAlumni(Builder $query, User $user): Builder
    {
        $alumni = $user->alumni_id !== null ? Alumni::find($user->alumni_id) : null;

        return $query
            ->where('status', AnnouncementStatus::Published)
            ->whereNull('deleted_at')
            ->where(function ($query) use ($user) {
                $query->whereNull('school_id')
                    ->orWhere('school_id', $user->school_id);
            })
            ->where(function ($query) use ($alumni) {
                $query->where('target_all_batches', true)
                    ->orWhereHas('batches', function ($batchQuery) use ($alumni) {
                        $batchQuery->where('graduation_year', $alumni?->graduation_year);
                    });
            })
            ->where(function ($query) {
                $query->where('type', '!=', AnnouncementType::Event)
                    ->orWhere('target_date', '>', now());
            });
    }

    public function batches(): HasMany
    {
        return $this->hasMany(AnnouncementBatch::class);
    }

    public function views(): HasMany
    {
        return $this->hasMany(AnnouncementView::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }
}
