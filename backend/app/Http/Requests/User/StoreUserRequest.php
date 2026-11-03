<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use App\Rules\UniqueEmailLocalPart;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Validator;

class StoreUserRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:255', new UniqueEmailLocalPart('users')],
            'username' => 'required|string|max:100|regex:/^[a-zA-Z0-9_]+$/|unique:users,username',
            'password' => ['required', 'string', Password::min(8)->letters()->mixedCase()->numbers()->symbols()],
            'role' => 'required|in:school_admin,alumni',
            'account_status' => 'nullable|in:pending,approved,rejected',
            'alumni_id' => 'nullable|exists:alumni,id|unique:users,alumni_id',
            'school_id' => 'nullable|exists:schools,id',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($this->input('role') === 'school_admin' && ! $this->input('school_id')) {
                $validator->errors()->add('school_id', 'A School Admin must be assigned to one school.');
            }
        });
    }
}
