<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use App\Rules\PhilippinePhoneNumber;
use App\Rules\UniqueEmailAddress;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ResubmitRegistrationRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $alumnus = $this->user()?->alumni;
        $employmentStatus = $this->input('employment_status', $alumnus?->employment_status);

        if (! in_array($employmentStatus, ['employed', 'self_employed'], true)) {
            $this->merge(['company_name' => null, 'position_in_company' => null]);

            return;
        }

        $this->mergeIfMissing([
            'employment_status' => $alumnus?->employment_status,
            'company_name' => $alumnus?->company_name,
            'position_in_company' => $alumnus?->position_in_company,
        ]);
    }

    /**
     * All fields are optional: resubmission is a correction to already-submitted
     * data, not a fresh registration, so a rejected alumni only needs to touch
     * whatever the admin's rejection reason called out.
     */
    public function rules(): array
    {
        $userId = $this->user()?->id;
        $alumniId = $this->user()?->alumni_id;

        return [
            'first_name' => 'nullable|string|max:255',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'nullable|string|max:255',
            'suffix' => 'nullable|string|max:20',
            'email' => ['nullable', 'email', 'max:255', new UniqueEmailAddress('users', ignoreId: $userId)],
            'username' => "nullable|string|max:100|regex:/^[a-zA-Z0-9_]+$/|unique:users,username,{$userId}",
            'school_id' => ['nullable', Rule::exists('schools', 'id')->where('is_active', 1)],
            'graduation_year' => 'nullable|integer|min:1900|max:'.date('Y'),
            'section_strand' => 'nullable|string|max:100',
            'gender' => 'nullable|in:male,female',
            'birthdate' => 'nullable|date|before:today',
            'address' => 'nullable|string|max:500',
            'student_id' => "nullable|string|max:50|unique:alumni,student_id,{$alumniId}",
            'contact_number' => ['nullable', new PhilippinePhoneNumber],
            'employment_status' => 'nullable|in:student,self_employed,unemployed,employed,retired',
            'company_name' => 'nullable|string|max:255|required_if:employment_status,employed,self_employed',
            'position_in_company' => 'nullable|string|max:255|required_if:employment_status,employed,self_employed',
        ];
    }
}
