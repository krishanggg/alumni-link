<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AlumniPrivacy;
use App\Enums\Gender;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Alumni extends Model
{
    use SoftDeletes;

    protected $table = 'alumni';

    protected $fillable = [
        'student_id', 'first_name', 'middle_name',
        'last_name', 'suffix', 'gender', 'birthdate', 'graduation_year',
        'section_strand', 'contact_number', 'contact_email', 'address',
        'employment_status', 'company_name', 'position_in_company',
        'privacy', 'profile_photo', 'confirmed_at',
    ];

    /**
     * Every non-registration creation path (admin-created records, seeders)
     * is confirmed by default so call sites don't each have to remember to
     * set it. Registration/resubmit explicitly override this back to null
     * immediately after creation; completeProfile leaves it confirmed.
     */
    protected static function booted(): void
    {
        static::creating(function (Alumni $alumni) {
            if (! array_key_exists('confirmed_at', $alumni->getAttributes())) {
                $alumni->confirmed_at = now();
            }
        });
    }

    /**
     * The single reusable filter for "visible everywhere" alumni records.
     * NULL confirmed_at means provisional/unconfirmed — invisible outside the
     * Pending-Approvals review endpoints.
     */
    public function scopeConfirmed(Builder $query): Builder
    {
        return $query->whereNotNull('confirmed_at');
    }

    public function casts(): array
    {
        return [
            'graduation_year' => 'integer',
            'birthdate' => 'date',
            'deleted_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'privacy' => AlumniPrivacy::class,
            'gender' => Gender::class,
        ];
    }

    /** Derived from first_name, middle_name, last_name and suffix; there is no `name` column. */
    public function getNameAttribute(): string
    {
        return trim(preg_replace('/\s+/', ' ', implode(' ', array_filter([
            $this->first_name,
            $this->middle_name,
            $this->last_name,
            $this->suffix,
        ]))));
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function user(): HasOne
    {
        return $this->hasOne(User::class);
    }
}
