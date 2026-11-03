<?php

declare(strict_types=1);

namespace App\Http\Requests\Approval;

use App\Policies\UserPolicy;
use Illuminate\Foundation\Http\FormRequest;

class RejectAlumniRequest extends FormRequest
{
    public function authorize(): bool
    {
        return app(UserPolicy::class)->reject($this->user(), $this->route('user'));
    }

    public function rules(): array
    {
        return [
            'reason' => 'nullable|string|max:500',
        ];
    }
}
