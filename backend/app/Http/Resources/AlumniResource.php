<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AlumniResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_id' => $this->student_id,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'last_name' => $this->last_name,
            'suffix' => $this->suffix,
            'gender' => $this->gender,
            'birthdate' => $this->birthdate instanceof Carbon ? $this->birthdate->format('Y-m-d') : $this->birthdate,
            'graduation_year' => $this->graduation_year,
            'section_strand' => $this->section_strand,
            'contact_number' => $this->contact_number,
            'contact_email' => $this->contact_email,
            'address' => $this->address,
            'employment_status' => $this->employment_status,
            'company_name' => $this->company_name,
            'position_in_company' => $this->position_in_company,
            'privacy' => $this->privacy,
            'profile_photo_url' => $this->profile_photo ? '/storage/'.$this->profile_photo : null,
            'school' => $this->whenLoaded('school', fn () => [
                'id' => $this->school->id,
                'name' => $this->school->name,
            ]),
            'created_by' => $this->whenLoaded('creator', fn () => $this->creator?->name),
            'updated_by' => $this->whenLoaded('updater', fn () => $this->updater?->name),
            'deleted_at' => $this->deleted_at ? $this->deleted_at->format('Y-m-d H:i:s') : null,
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at?->format('Y-m-d H:i:s'),
        ];
    }
}
