<?php

declare(strict_types=1);

namespace App\Http\Requests\Approval;

use App\Models\Alumni;
use App\Policies\UserPolicy;
use App\Rules\PhilippinePhoneNumber;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class ApproveAlumniRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->filled('alumni_id')) {
            return;
        }

        $hasEmploymentStatus = $this->exists('employment_status');
        $hasWorkplaceOverride = $this->exists('company_name') || $this->exists('position_in_company');
        $employmentStatus = $this->input('employment_status', $this->route('user')?->alumni?->employment_status);

        if (! in_array($employmentStatus, ['employed', 'self_employed'], true)) {
            $this->merge(['company_name' => null, 'position_in_company' => null]);

            return;
        }

        $this->mergeIfMissing([
            'company_name' => $this->route('user')?->alumni?->company_name,
            'position_in_company' => $this->route('user')?->alumni?->position_in_company,
        ]);

        if (! $hasEmploymentStatus && $hasWorkplaceOverride) {
            $this->merge(['employment_status' => $employmentStatus]);
        }
    }

    public function authorize(): bool
    {
        return app(UserPolicy::class)->approve($this->user(), $this->route('user'));
    }

    public function rules(): array
    {
        return [
            'alumni_id' => 'nullable|exists:alumni,id',
            'create_new' => 'nullable|boolean',
            'first_name' => 'nullable|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'suffix' => 'nullable|string|max:20',
            'graduation_year' => 'nullable|integer|min:1900|max:'.date('Y'),
            'section_strand' => 'nullable|string|max:100',
            'gender' => 'nullable|in:male,female',
            'birthdate' => 'nullable|date|before:today',
            'address' => 'nullable|string|max:500',
            'student_id' => 'nullable|string|max:50',
            'contact_number' => ['nullable', new PhilippinePhoneNumber],
            'employment_status' => 'nullable|in:student,self_employed,unemployed,employed,retired',
            'company_name' => 'nullable|string|max:255|required_if:employment_status,employed,self_employed',
            'position_in_company' => 'nullable|string|max:255|required_if:employment_status,employed,self_employed',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            // The pending user's own provisional alumni row is excluded: a
            // resubmitted student_id equal to its own current value (or a
            // fresh admin override) must not collide with itself.
            $ownAlumniId = $this->route('user')?->alumni_id;
            $studentId = $this->input('student_id') ?? $this->route('user')?->alumni?->student_id;

            if (! $studentId) {
                return;
            }

            $collision = Alumni::where('student_id', $studentId)
                ->when($ownAlumniId, fn ($query) => $query->where('id', '!=', $ownAlumniId))
                ->exists();

            if ($collision) {
                $validator->errors()->add('student_id', 'This student ID is already linked to an existing alumni record.');
            }
        });
    }
}
