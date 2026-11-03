<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'report_type' => $this->report_type,
            'title' => $this->title,
            'filters' => $this->filters,
            'format' => $this->format,
            'visibility' => $this->visibility,
            'lifecycle_status' => $this->lifecycle_status,
            'school_id' => $this->school_id,
            'school' => $this->whenLoaded('school', fn () => [
                'id' => $this->school->id,
                'name' => $this->school->name,
            ]),
            'file_size' => $this->file_size,
            'published_at' => $this->published_at?->toIso8601String(),
            'archived_at' => $this->archived_at?->toIso8601String(),
            'generated_by' => $this->generated_by,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'download_url' => "/api/reports/{$this->id}/download",
            'generatedBy' => $this->whenLoaded('generatedBy', fn () => [
                'id' => $this->generatedBy->id,
                'name' => $this->generatedBy->name,
            ]),
        ];
    }
}
