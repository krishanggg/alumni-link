<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class StoreLoginRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'login' => 'required|string|max:255',

            'password' => 'required|string',

            'remember' => 'boolean',

            // Unique identifier for an AlumniLink app installation.
            // Optional to preserve compatibility with web logins
            // and older mobile app versions.
            'device_id' => 'nullable|uuid',
        ];
    }

    public function attributes(): array
    {
        return [
            'login' => 'email or username',

            'password' => 'password',

            'device_id' => 'app installation ID',
        ];
    }
}