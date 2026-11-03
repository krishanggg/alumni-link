<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use App\Policies\UserPolicy;
use Illuminate\Foundation\Http\FormRequest;

class LinkAlumniRequest extends FormRequest
{
    public function authorize(): bool
    {
        return app(UserPolicy::class)->update($this->user(), $this->route('user'));
    }

    public function rules(): array
    {
        return [
            'alumni_id' => 'required|exists:alumni,id',
        ];
    }
}
