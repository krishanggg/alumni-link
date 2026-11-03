<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['email', 'username', 'password', 'profile_photo', 'last_login_at', 'last_login_ip'])]
#[Hidden(['password'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    public function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'role' => UserRole::class,
            'account_status' => AccountStatus::class,
        ];
    }

    /** All personal/identity data — including name — lives on the linked alumni record. */
    public function getNameAttribute(): string
    {
        return $this->alumni?->name ?? $this->username;
    }

    public function alumni(): BelongsTo
    {
        return $this->belongsTo(Alumni::class);
    }

    /**
     * True when the linked alumni record exists but has been archived
     * (soft-deleted) by an admin. Archiving deliberately leaves `alumni_id`
     * populated so the link survives a restore, which is exactly why a plain
     * `alumni_id === null` check misses this state and lets an archived
     * alumnus keep active access — callers must ask here instead.
     */
    public function alumniRecordArchived(): bool
    {
        return $this->alumni_id !== null
            && Alumni::onlyTrashed()->whereKey($this->alumni_id)->exists();
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function isAdmin(): bool
    {
        return $this->isSuperAdmin() || $this->isSchoolAdmin();
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === UserRole::SuperAdmin;
    }

    public function isSchoolAdmin(): bool
    {
        return $this->role === UserRole::SchoolAdmin;
    }

    public function isAlumni(): bool
    {
        return $this->role === UserRole::Alumni;
    }

    public function isApproved(): bool
    {
        return $this->account_status === AccountStatus::Approved;
    }

    public function isPending(): bool
    {
        return $this->account_status === AccountStatus::Pending;
    }

    public function rememberedDevices(): HasMany
    {
        return $this->hasMany(RememberedDevice::class);
    }

    public function pushTokens(): HasMany
    {
        return $this->hasMany(PushToken::class);
    }
}
