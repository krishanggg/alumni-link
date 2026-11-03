<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use App\Rules\PhilippinePhoneNumber;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CompleteAlumniProfileRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (! in_array($this->input('employment_status'), ['employed', 'self_employed'], true)) {
            $this->merge(['company_name' => null, 'position_in_company' => null]);
        }
    }

    public function rules(): array
    {
        return [
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:255',
            'suffix' => 'nullable|string|max:20',
            'school_id' => ['required', Rule::exists('schools', 'id')->where('is_active', 1)],
            'graduation_year' => 'required|integer|min:1900|max:'.date('Y'),
            'section_strand' => 'required|string|max:100',
            'gender' => 'required|in:male,female',
            'birthdate' => 'required|date|before:today',
            'address' => 'nullable|string|max:500',
            'student_id' => 'nullable|string|max:50|unique:alumni,student_id',
            'contact_number' => ['nullable', new PhilippinePhoneNumber],
            'employment_status' => 'nullable|in:student,self_employed,unemployed,employed,retired',
            'company_name' => 'nullable|string|max:255|required_if:employment_status,employed,self_employed',
            'position_in_company' => 'nullable|string|max:255|required_if:employment_status,employed,self_employed',
        ];
    }
}
