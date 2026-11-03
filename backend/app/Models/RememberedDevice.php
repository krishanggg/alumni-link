<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RememberedDevice extends Model
{
    public $timestamps = false;

    protected $table = 'remembered_devices';

    protected $fillable = [
        'user_id', 'token_hash', 'previous_token_hash', 'rotated_at',
        'device_name', 'ip_address', 'user_agent', 'last_used_at', 'expires_at',
    ];

    protected $hidden = [
        'token_hash', 'previous_token_hash',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'last_used_at' => 'datetime',
        'rotated_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function hasExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }
}
