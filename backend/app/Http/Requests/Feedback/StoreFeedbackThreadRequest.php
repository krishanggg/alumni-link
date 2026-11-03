<?php

declare(strict_types=1);

namespace App\Http\Requests\Feedback;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFeedbackThreadRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'subject' => ['required', 'string', 'max:150'],
            'body' => ['required', 'string', 'max:2000'],
            'school_admin_id' => [
                'nullable',
                'integer',
                Rule::requiredIf(fn (): bool => $this->user()?->isSuperAdmin() === true),
                Rule::exists('users', 'id')->where(fn ($query) => $query
                    ->where('role', UserRole::SchoolAdmin->value)
                    ->where('is_active', true)),
            ],
        ];
    }
}
