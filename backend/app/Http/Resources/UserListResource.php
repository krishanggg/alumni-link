<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'username' => $this->username,
            'role' => $this->role,
            'account_status' => $this->account_status,
            'alumni_id' => $this->alumni_id,
            'school_id' => $this->school_id,
            'is_active' => $this->is_active,
            'last_login_at' => $this->last_login_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'alumni' => $this->whenLoaded('alumni', fn () => $this->alumni ? [
                'id' => $this->alumni->id,
                'first_name' => $this->alumni->first_name,
                'middle_name' => $this->alumni->middle_name,
                'last_name' => $this->alumni->last_name,
                'suffix' => $this->alumni->suffix,
                'graduation_year' => $this->alumni->graduation_year,
                'section_strand' => $this->alumni->section_strand,
                'student_id' => $this->alumni->student_id,
                'contact_number' => $this->alumni->contact_number,
                'confirmed_at' => $this->alumni->confirmed_at?->toIso8601String(),
            ] : null),
            'school' => $this->whenLoaded('school', fn () => [
                'id' => $this->school->id,
                'name' => $this->school->name,
            ]),
        ];
    }
}
