<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use App\Rules\PhilippinePhoneNumber;
use App\Rules\UniqueEmailAddress;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreRegistrationRequest extends FormRequest
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
            'email' => ['required', 'email', 'max:255', new UniqueEmailAddress('users')],
            'username' => 'required|string|max:100|regex:/^[a-zA-Z0-9_]+$/|unique:users,username',
            'password' => ['required', 'string', 'confirmed', Password::min(8)->letters()->mixedCase()->numbers()->symbols()],
            'school_id' => ['required', Rule::exists('schools', 'id')->where('is_active', 1)],
            'graduation_year' => 'required|integer|min:1900|max:'.date('Y'),
            'section_strand' => 'required|string|max:100',
            'gender' => 'required|in:male,female',
            'birthdate' => 'required|date|before:today',
            'address' => 'required|string|max:500',
            'student_id' => 'nullable|string|max:50|unique:alumni,student_id',
            'contact_number' => ['required', 'string', new PhilippinePhoneNumber],
            'employment_status' => 'required|string|in:student,self_employed,unemployed,employed,retired',
            'company_name' => 'nullable|string|max:255|required_if:employment_status,employed,self_employed',
            'position_in_company' => 'nullable|string|max:255|required_if:employment_status,employed,self_employed',
        ];
    }
}
