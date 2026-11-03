<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
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
            'rejection_reason' => $this->rejection_reason,
            'alumni_id' => $this->alumni_id,
            'school_id' => $this->school_id,
            'is_active' => $this->is_active,
            'last_login_at' => $this->last_login_at,
            'last_login_ip' => $this->last_login_ip,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            // Present (nested) even while unconfirmed — the approval-review
            // screen needs to show what a pending applicant submitted.
            'alumni' => $this->whenLoaded('alumni', fn () => $this->alumni ? [
                'id' => $this->alumni->id,
                'first_name' => $this->alumni->first_name,
                'middle_name' => $this->alumni->middle_name,
                'last_name' => $this->alumni->last_name,
                'suffix' => $this->alumni->suffix,
                'graduation_year' => $this->alumni->graduation_year,
                'section_strand' => $this->alumni->section_strand,
                'gender' => $this->alumni->gender?->value,
                'birthdate' => $this->alumni->birthdate?->toDateString(),
                'address' => $this->alumni->address,
                'student_id' => $this->alumni->student_id,
                'contact_number' => $this->alumni->contact_number,
                'employment_status' => $this->alumni->employment_status,
                'company_name' => $this->alumni->company_name,
                'position_in_company' => $this->alumni->position_in_company,
                'confirmed_at' => $this->alumni->confirmed_at?->toIso8601String(),
                'school' => $this->alumni->relationLoaded('school') && $this->alumni->school
                    ? ['id' => $this->alumni->school->id, 'name' => $this->alumni->school->name]
                    : null,
            ] : null),
            'school' => $this->whenLoaded('school', fn () => [
                'id' => $this->school->id,
                'name' => $this->school->name,
            ]),
        ];
    }
}
