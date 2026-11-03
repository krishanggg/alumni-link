<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $this->resource;
        $isAdmin = $user->isAdmin();

        $data = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'username' => $user->username,
            'role' => $user->role,
            'account_status' => $user->account_status,
            'school_id' => $user->school_id,
            'alumni_id' => $user->alumni_id,
            'photo_url' => $user->profile_photo
                ? '/storage/'.$user->profile_photo
                : null,
            'is_active' => $user->is_active,
            'last_login_at' => $user->last_login_at,
            'created_at' => $user->created_at,
        ];

        if ($user->alumni_id && $user->alumni) {
            $alumni = $user->alumni;

            $data['alumni'] = [
                'id' => $alumni->id,
                'first_name' => $alumni->first_name,
                'middle_name' => $alumni->middle_name,
                'last_name' => $alumni->last_name,
                'suffix' => $alumni->suffix,
                'graduation_year' => $alumni->graduation_year,
                'section_strand' => $alumni->section_strand,
                'contact_number' => $alumni->contact_number,
                'address' => $alumni->address,
                'employment_status' => $alumni->employment_status,
                'company_name' => $alumni->company_name,
                'position_in_company' => $alumni->position_in_company,
                'privacy' => $alumni->privacy,
                'gender' => $alumni->gender,
                'contact_email' => $alumni->contact_email,
                'birthdate' => $alumni->birthdate instanceof Carbon ? $alumni->birthdate->format('Y-m-d') : $alumni->birthdate,
                'profile_photo_url' => $alumni->profile_photo
                    ? '/storage/'.$alumni->profile_photo
                    : null,
                'confirmed_at' => $alumni->confirmed_at?->toIso8601String(),
            ];

            if ($isAdmin) {
                $data['alumni']['student_id'] = $alumni->student_id;
                $data['alumni']['school_id'] = $alumni->school_id;
                $data['alumni']['school'] = $alumni->school?->name;
            }
        }

        return $data;
    }
}
