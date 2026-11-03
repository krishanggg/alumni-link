<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SchoolResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'address' => $this->address,
            'contact_number' => $this->contact_number,
            'email' => $this->email,
            'website' => $this->website,
            'is_active' => $this->is_active,
            'logo_url' => $this->logo ? '/storage/'.$this->logo : null,
            'alumni_count' => $this->whenLoaded('alumni', fn () => $this->alumni->count()),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
