<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AnnouncementBatch extends Model
{
    public $timestamps = false;

    protected $fillable = ['announcement_id', 'graduation_year'];
}
