<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\FeedbackThreadStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class FeedbackThread extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'subject',
        'school_id',
        'created_by',
        'school_admin_id',
        'status',
        'resolved_by',
        'resolved_at',
        'last_message_at',
        'school_admin_last_read_at',
        'super_admin_last_read_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => FeedbackThreadStatus::class,
            'resolved_at' => 'datetime',
            'last_message_at' => 'datetime',
            'school_admin_last_read_at' => 'datetime',
            'super_admin_last_read_at' => 'datetime',
        ];
    }

    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        if ($user->isSuperAdmin()) {
            return $query;
        }

        if (! $user->isSchoolAdmin()) {
            return $query->whereNull($query->getModel()->getQualifiedKeyName());
        }

        return $query
            ->where('school_id', $user->school_id)
            ->where(function (Builder $visible) use ($user): void {
                $visible
                    ->where('school_admin_id', $user->id)
                    ->orWhere(function (Builder $legacy) use ($user): void {
                        $legacy->whereNull('school_admin_id')->where('created_by', $user->id);
                    });
            });
    }

    public function messages(): HasMany
    {
        return $this->hasMany(FeedbackMessage::class)->orderBy('id');
    }

    public function latestMessage(): HasOne
    {
        return $this->hasOne(FeedbackMessage::class)->latestOfMany('id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function schoolAdmin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'school_admin_id');
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }
}
