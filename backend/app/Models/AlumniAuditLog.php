<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AlumniAuditLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'alumni_id', 'user_id', 'action', 'changes', 'created_at',
    ];

    protected $casts = [
        'changes' => 'array',
        'created_at' => 'datetime',
    ];

    public function alumni(): BelongsTo
    {
        return $this->belongsTo(Alumni::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
