<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DirectoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isAdmin = $request->user()?->isAdmin() ?? false;

        if ($isAdmin) {
            return [
                'id' => $this->id,
                'first_name' => $this->first_name,
                'middle_name' => $this->middle_name,
                'last_name' => $this->last_name,
                'suffix' => $this->suffix,
                'school' => $this->whenLoaded('school', fn () => $this->school->name),
                'graduation_year' => $this->graduation_year,
                'section_strand' => $this->section_strand,
                'privacy' => $this->privacy,
                'profile_photo_url' => $this->profile_photo ? '/storage/'.$this->profile_photo : null,
            ];
        }

        $base = [
            'id' => $this->id,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'last_name' => $this->last_name,
            'suffix' => $this->suffix,
            'school' => $this->whenLoaded('school', fn () => $this->school->name),
            'graduation_year' => $this->graduation_year,
            'section_strand' => $this->section_strand,
            'profile_photo_url' => $this->profile_photo ? '/storage/'.$this->profile_photo : null,
        ];

        return $base;
    }
}
