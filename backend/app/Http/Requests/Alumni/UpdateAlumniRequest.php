<?php

declare(strict_types=1);

namespace App\Http\Requests\Alumni;

use App\Rules\PhilippinePhoneNumber;
use App\Rules\UniqueEmailAddress;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAlumniRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $alumnus = $this->route('alumnus');
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

    public function rules(): array
    {
        $alumniId = $this->route('alumnus')->id;

        return [
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'suffix' => 'nullable|string|max:20',
            'school_id' => 'nullable|exists:schools,id',
            'student_id' => "nullable|string|max:50|unique:alumni,student_id,{$alumniId}",
            'graduation_year' => 'required|integer|min:1900|max:'.(date('Y') + 1),
            'section_strand' => 'required|string|max:100',
            'gender' => 'nullable|in:male,female',
            'birthdate' => 'nullable|date|before:today',
            'contact_number' => ['nullable', new PhilippinePhoneNumber],
            'contact_email' => ['nullable', 'email', 'max:255', new UniqueEmailAddress('alumni', column: 'contact_email', ignoreId: $alumniId)],
            'address' => 'nullable|string|max:500',
            'employment_status' => 'nullable|in:student,self_employed,unemployed,employed,retired',
            'company_name' => 'nullable|string|max:255|required_if:employment_status,employed,self_employed',
            'position_in_company' => 'nullable|string|max:255|required_if:employment_status,employed,self_employed',
            'privacy' => 'nullable|in:public,private',
        ];
    }
}
