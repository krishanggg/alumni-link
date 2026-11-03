<?php

declare(strict_types=1);

namespace App\Http\Requests\Profile;

use App\Rules\PhilippinePhoneNumber;
use App\Rules\UniqueEmailLocalPart;
use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
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

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['sometimes', 'required', 'email', 'max:255', new UniqueEmailLocalPart('users', ignoreId: $this->user()->id)],
            'username' => 'sometimes|required|string|max:100|unique:users,username,'.$this->user()->id,
            'contact_number' => ['sometimes', 'nullable', new PhilippinePhoneNumber],
            'address' => 'sometimes|nullable|string|max:500',
            'privacy' => 'sometimes|nullable|in:public,private',
            'gender' => 'sometimes|nullable|in:male,female',
            'contact_email' => ['sometimes', 'nullable', 'email', 'max:255', new UniqueEmailLocalPart('alumni', column: 'contact_email', ignoreId: $this->user()->alumni_id)],
            'birthdate' => 'sometimes|nullable|date|before:today',
            'employment_status' => 'sometimes|nullable|in:student,self_employed,unemployed,employed,retired',
            'company_name' => 'nullable|string|max:255|required_if:employment_status,employed,self_employed',
            'position_in_company' => 'nullable|string|max:255|required_if:employment_status,employed,self_employed',
        ];
    }
}
