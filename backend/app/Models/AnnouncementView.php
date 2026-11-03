<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AnnouncementView extends Model
{
    public $timestamps = false;

    protected $fillable = ['announcement_id', 'user_id', 'viewed_at'];

    protected function casts(): array
    {
        return [
            'viewed_at' => 'datetime',
        ];
    }
}
