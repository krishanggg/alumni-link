<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PushToken extends Model
{
    protected $fillable = ['user_id', 'expo_push_token'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
