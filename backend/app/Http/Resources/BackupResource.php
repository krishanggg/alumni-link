<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BackupResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'filename' => $this->filename,
            'file_size' => $this->file_size,
            'created_by' => $this->creator?->name,
            'created_at' => $this->created_at?->toIso8601String(),
            'download_url' => "/api/backups/{$this->id}/download",
        ];
    }
}
