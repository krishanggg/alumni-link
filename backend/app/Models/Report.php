<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ReportFormat;
use App\Enums\ReportLifecycleStatus;
use App\Enums\ReportVisibility;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Report extends Model
{
    protected $fillable = [
        'report_type', 'title', 'filters', 'format',
        'visibility', 'lifecycle_status', 'school_id',
        'file_path', 'file_size', 'generated_by',
        'published_at', 'archived_at',
    ];

    protected function casts(): array
    {
        return [
            'filters' => 'array',
            'published_at' => 'datetime',
            'archived_at' => 'datetime',
            'file_size' => 'integer',
            'format' => ReportFormat::class,
            'visibility' => ReportVisibility::class,
            'lifecycle_status' => ReportLifecycleStatus::class,
        ];
    }

    public function generatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }
}
