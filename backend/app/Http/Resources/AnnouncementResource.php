<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AnnouncementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->title,
            'message' => $this->message,
            'target_date' => $this->target_date?->toIso8601String(),
            'school_id' => $this->school_id,
            'target_all_batches' => $this->target_all_batches,
            'show_as_modal' => $this->show_as_modal,
            'status' => $this->status,
            'published_at' => $this->published_at?->toIso8601String(),
            'archived_at' => $this->archived_at?->toIso8601String(),
            'created_by' => $this->whenLoaded('creator', fn () => $this->creator?->name),
            'updated_by' => $this->updated_by,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'school' => $this->whenLoaded('school', fn () => [
                'id' => $this->school->id,
                'name' => $this->school->name,
            ]),
            'batches' => $this->whenLoaded('batches', fn () => $this->batches->pluck('graduation_year')
            ),
            'viewed' => $this->whenLoaded('views', fn () => $this->views->contains('user_id', $request->user()?->id)
            ),
        ];
    }
}
