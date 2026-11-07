<?php

declare(strict_types=1);

namespace App\Http\Requests\Alumni;

use App\Rules\PhilippinePhoneNumber;
use App\Rules\UniqueEmailAddress;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAlumniProfileRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $user = $this->user();

        if (
            ! $user?->isAlumni()
            || ! $user->alumni_id
            || ! $this->hasAny(['employment_status', 'company_name', 'position_in_company'])
        ) {
            return;
        }

        $alumni = $user->alumni;
        if (! $alumni) {
            return;
        }

        $employmentStatus = $this->input('employment_status', $alumni->employment_status);

        if (! in_array($employmentStatus, ['employed', 'self_employed'], true)) {
            $this->merge([
                'employment_status' => $employmentStatus,
                'company_name' => null,
                'position_in_company' => null,
            ]);

            return;
        }

        $this->mergeIfMissing([
            'employment_status' => $employmentStatus,
            'company_name' => $alumni->company_name,
            'position_in_company' => $alumni->position_in_company,
        ]);
    }

    public function rules(): array
    {
        $alumniId = $this->user()?->alumni_id;

        return [
            'contact_number' => ['nullable', new PhilippinePhoneNumber],
            'address' => 'nullable|string|max:500',
            'gender' => 'nullable|in:male,female',
            'contact_email' => ['nullable', 'email', 'max:255', new UniqueEmailAddress('alumni', column: 'contact_email', ignoreId: $alumniId)],
            'birthdate' => 'nullable|date|before:today',
            'privacy' => 'nullable|in:public,private',
            'employment_status' => 'nullable|in:student,self_employed,unemployed,employed,retired',
            'company_name' => 'nullable|string|max:255|required_if:employment_status,employed,self_employed',
            'position_in_company' => 'nullable|string|max:255|required_if:employment_status,employed,self_employed',
        ];
    }
}
