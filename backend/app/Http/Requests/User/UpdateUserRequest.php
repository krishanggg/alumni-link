<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use App\Rules\UniqueEmailAddress;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateUserRequest extends FormRequest
{
    public function rules(): array
    {
        $userId = $this->route('user')->id;

        // `super_admin` can never be assigned through this generic update
        // endpoint. The current role is allowed through unchanged so a sole
        // Super Admin's other fields (name, email, ...) remain editable here.
        $currentRole = $this->route('user')->role?->value;

        return [
            'email' => ['required', 'email', 'max:255', new UniqueEmailAddress('users', ignoreId: $userId)],
            'username' => "required|string|max:100|regex:/^[a-zA-Z0-9_]+$/|unique:users,username,{$userId}",
            'role' => ['required', Rule::in(array_filter(['school_admin', 'alumni', $currentRole]))],
            'account_status' => 'nullable|in:pending,approved,rejected',
            'alumni_id' => "nullable|exists:alumni,id|unique:users,alumni_id,{$userId}",
            'school_id' => 'nullable|exists:schools,id',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($this->input('role') === 'school_admin' && ! $this->input('school_id')) {
                $validator->errors()->add('school_id', 'A School Admin must be assigned to one school.');
            }

            if ($this->input('role') === 'super_admin' && $this->input('school_id')) {
                $validator->errors()->add('school_id', 'A Super Admin cannot be assigned to a school.');
            }
        });
    }
}
